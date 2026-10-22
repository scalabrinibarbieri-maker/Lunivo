import { AuthenticationError, requireFirebaseUid } from './auth';
import { handleAudioRequest } from './audio';
import { handleCourseRequest, publishedCourseLessonIds } from './courses';
import { parseCompletionSync } from './validation';
import { getXpSummary, importLegacyXp, parseLegacyXp, parseXpAwards, saveXpAwards } from './xp';
import { getStudyDays, parseStudyDays, saveStudyDays } from './streak';

interface Env { DB: D1Database; AUDIO_BUCKET?: R2Bucket; FIREBASE_PROJECT_ID?: string; }
const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status, headers: {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
} });

async function readLimitedJson(request: Request, limit = 8192): Promise<unknown> {
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new Error('CONTENT_TYPE_INVALIDO');
  }
  if (!request.body) throw new Error('BODY_INVALIDO');
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Error('BODY_MUITO_GRANDE');
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
    if (size > limit) await request.body.cancel().catch(() => {});
  }
  const buffer = new Uint8Array(size); let cursor = 0;
  for (const chunk of chunks) { buffer.set(chunk, cursor); cursor += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(buffer)); }
  catch { throw new Error('JSON_INVALIDO'); }
}
async function currentProgress(db: D1Database, uid: string) {
  const result = await db.prepare('SELECT lesson_id FROM completed_lessons WHERE user_id = ? ORDER BY lesson_id')
    .bind(uid).all<{lesson_id: string}>();
  // Mantem XP funcionando se o Worker for publicado antes da migracao opcional 0003.
  let studyDays: string[] | undefined;
  try { studyDays = await getStudyDays(db, uid); }
  catch (error) {
    if (!(error instanceof Error) || !/no such table.*study_days/i.test(error.message)) throw error;
  }
  return { completedLessonIds: result.results.map(row => row.lesson_id), ...await getXpSummary(db, uid),
    ...(studyDays !== undefined ? { studyDays } : {}) };
}
/** Os JWTs Firebase determinam identidade; nao aceitar IDs de conta no body. */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);
      if (url.pathname === '/health' && request.method === 'GET')
        return json({ service: 'lunivo-api', version: 1, status: 'ok' });
      const audio = await handleAudioRequest(request, env.AUDIO_BUCKET);
      if (audio) return audio;
      const courses = await handleCourseRequest(request, env.AUDIO_BUCKET);
      if (courses) return courses;
      const routes = ['/v1/me', '/v1/progress', '/v1/progress/sync',
        '/v1/progress/awards', '/v1/progress/legacy-xp', '/v1/progress/study-days'];
      if (!routes.includes(url.pathname)) return json({ error: 'NAO_ENCONTRADO' }, 404);
      const readOnly = ['/v1/me', '/v1/progress'].includes(url.pathname);
      if (request.method !== (readOnly ? 'GET' : 'POST')) return json({ error: 'METODO_INVALIDO' }, 405);
      const uid = await requireFirebaseUid(request, env.FIREBASE_PROJECT_ID);
      if (!env.DB) return json({ error: 'BANCO_NAO_CONFIGURADO' }, 503);
      if (url.pathname === '/v1/me') {
        await env.DB.prepare('INSERT OR IGNORE INTO users (user_id) VALUES (?)').bind(uid).run();
        return json({ userId: uid });
      }
      if (url.pathname === '/v1/progress') return json(await currentProgress(env.DB, uid));
      const payload = await readLimitedJson(request);
      if (url.pathname === '/v1/progress/sync') {
        const known = await publishedCourseLessonIds(env.AUDIO_BUCKET);
        const ids = parseCompletionSync(payload, known);
        await env.DB.batch([
          env.DB.prepare('INSERT OR IGNORE INTO users (user_id) VALUES (?)').bind(uid),
          ...ids.map(id => env.DB.prepare(
            'INSERT OR IGNORE INTO completed_lessons(user_id, lesson_id) VALUES (?, ?)'
          ).bind(uid, id)),
        ]);
      } else if (url.pathname === '/v1/progress/awards') {
        const known = await publishedCourseLessonIds(env.AUDIO_BUCKET);
        const awards = parseXpAwards(payload, known);
        await saveXpAwards(env.DB, uid, awards);
      } else if (url.pathname === '/v1/progress/legacy-xp') {
        await importLegacyXp(env.DB, uid, parseLegacyXp(payload));
      } else if (url.pathname === '/v1/progress/study-days') {
        await saveStudyDays(env.DB, uid, parseStudyDays(payload));
      }
      return json(await currentProgress(env.DB, uid));
    } catch (error) {
      if (error instanceof AuthenticationError) return json({ error: 'NAO_AUTORIZADO' }, 401);
      if (error instanceof Error && error.message === 'FIREBASE_NOT_CONFIGURED')
        return json({ error: 'AUTH_NAO_CONFIGURADA' }, 503);
      if (error instanceof Error && /^(BODY_|CAMPOS_|LISTA_|LICAO_|CONTENT_TYPE_|JSON_|XP_|STREAK_)/.test(error.message)) {
        const code = error.message === 'CONTENT_TYPE_INVALIDO' ? 415 : error.message === 'BODY_MUITO_GRANDE' ? 413 : 400;
        return json({ error: error.message }, code);
      }
      console.error('Lunivo API internal error', error instanceof Error ? error.name : 'unknown');
      return json({ error: 'ERRO_INTERNO' }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
