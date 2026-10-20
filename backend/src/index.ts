import { AuthenticationError, requireFirebaseUid } from './auth';
import { handleAudioRequest } from './audio';
import { parseCompletionSync } from './validation';

interface Env {
  DB: D1Database;
  AUDIO_BUCKET?: R2Bucket;
  FIREBASE_PROJECT_ID?: string;
}
const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  },
});

async function readLimitedJson(request: Request, limit = 8192): Promise<unknown> {
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    throw new Error('CONTENT_TYPE_INVALIDO');
  }
  if (!request.body) throw new Error('BODY_INVALIDO');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Error('BODY_MUITO_GRANDE');
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
    if (size > limit) await request.body.cancel().catch(() => {});
  }
  const buffer = new Uint8Array(size);
  let cursor = 0;
  for (const chunk of chunks) { buffer.set(chunk, cursor); cursor += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(buffer)); }
  catch { throw new Error('JSON_INVALIDO'); }
}

async function currentProgress(db: D1Database, uid: string): Promise<string[]> {
  const result = await db.prepare('SELECT lesson_id FROM completed_lessons WHERE user_id = ? ORDER BY lesson_id')
    .bind(uid).all<{ lesson_id: string }>();
  return result.results.map(row => row.lesson_id);
}

/** API v1: sem premiações, rankings ou status premium controlados pelo cliente. */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);
      if (url.pathname === '/health' && request.method === 'GET') {
        return json({ service: 'lunivo-api', version: 1, status: 'ok' });
      }
      // Pronuncias sao arquivos publicos de aprendizado: sem autenticacao Firebase.
      // O bucket continua privado e so e acessado pelo binding do Worker.
      const audioResponse = await handleAudioRequest(request, env.AUDIO_BUCKET);
      if (audioResponse) return audioResponse;
      if (!['/v1/me', '/v1/progress', '/v1/progress/sync'].includes(url.pathname)) {
        return json({ error: 'NAO_ENCONTRADO' }, 404);
      }
      if ((url.pathname === '/v1/me' || url.pathname === '/v1/progress') && request.method !== 'GET') {
        return json({ error: 'METODO_INVALIDO' }, 405);
      }
      if (url.pathname === '/v1/progress/sync' && request.method !== 'POST') {
        return json({ error: 'METODO_INVALIDO' }, 405);
      }
      const uid = await requireFirebaseUid(request, env.FIREBASE_PROJECT_ID);
      if (!env.DB) return json({ error: 'BANCO_NAO_CONFIGURADO' }, 503);
      if (url.pathname === '/v1/me') {
        // Não coleta e-mail ou nome pessoal, só o UID emitido pelo Firebase.
        await env.DB.prepare('INSERT OR IGNORE INTO users (user_id) VALUES (?)').bind(uid).run();
        return json({ userId: uid });
      }
      if (url.pathname === '/v1/progress') {
        return json({ completedLessonIds: await currentProgress(env.DB, uid) });
      }
      const data = parseCompletionSync(await readLimitedJson(request));
      // Todas as gravações usam o UID extraído de um JWT verificado, jamais do body.
      // A primeira query cria o usuário para satisfazer a foreign key.
      await env.DB.batch([
        env.DB.prepare('INSERT OR IGNORE INTO users (user_id) VALUES (?)').bind(uid),
        ...data.map(id => env.DB.prepare('INSERT OR IGNORE INTO completed_lessons (user_id, lesson_id) VALUES (?, ?)').bind(uid, id)),
      ]);
      return json({ completedLessonIds: await currentProgress(env.DB, uid) });
    } catch (error) {
      if (error instanceof AuthenticationError) return json({ error: 'NAO_AUTORIZADO' }, 401);
      if (error instanceof Error && error.message === 'FIREBASE_NOT_CONFIGURED') return json({ error: 'AUTH_NAO_CONFIGURADA' }, 503);
      if (error instanceof Error && /^(BODY_|CAMPOS_|LISTA_|LICAO_|CONTENT_TYPE_|JSON_)/.test(error.message)) {
        return json({ error: error.message }, error.message === 'CONTENT_TYPE_INVALIDO' ? 415 : error.message === 'BODY_MUITO_GRANDE' ? 413 : 400);
      }
      // Não vazar detalhes internos ou credenciais nos erros HTTP.
      console.error('Lunivo API internal error', error instanceof Error ? error.name : 'unknown');
      return json({ error: 'ERRO_INTERNO' }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
