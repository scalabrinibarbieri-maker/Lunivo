/** Entrega publica de audios de estudo; bucket R2 continua privado. */
const MANIFEST_KEY = 'manifest-v1.json';
const MAX_MANIFEST_BYTES = 64 * 1024;
const MAX_AUDIO_BYTES = 2 * 1024 * 1024;
const AUDIO_PATH = /^\/v1\/audio\/file\/([a-z]{2}-[A-Z]{2}\/[a-z0-9-]{1,32}\/[a-z0-9-]{3,100}\.mp3)$/;

function audioJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

/** null indica rota que nao pertence ao subsistema de audio. */
export async function handleAudioRequest(request: Request, bucket: R2Bucket | undefined): Promise<Response | null> {
  const url = new URL(request.url);
  const isManifest = url.pathname === '/v1/audio/manifest';
  const match = AUDIO_PATH.exec(url.pathname);
  if (!isManifest && !url.pathname.startsWith('/v1/audio/')) return null;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return audioJson({ error: 'METODO_INVALIDO' }, 405);
  }
  if (!bucket) return audioJson({ error: 'AUDIO_NAO_CONFIGURADO' }, 503);

  if (isManifest) {
    const obj = await bucket.get(MANIFEST_KEY);
    if (!obj) return audioJson({ version: 1, clips: [] });
    if (obj.size > MAX_MANIFEST_BYTES) return audioJson({ error: 'MANIFESTO_INVALIDO' }, 502);
    const body = await obj.text();
    try {
      const parsed: unknown = JSON.parse(body);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
          (parsed as { version?: unknown }).version !== 1 ||
          !Array.isArray((parsed as { clips?: unknown }).clips)) throw new Error('INVALID');
    } catch {
      return audioJson({ error: 'MANIFESTO_INVALIDO' }, 502);
    }
    return new Response(request.method === 'HEAD' ? null : body, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        'Access-Control-Allow-Origin': '*',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }
  if (!match) return audioJson({ error: 'AUDIO_NAO_ENCONTRADO' }, 404);
  const obj = await bucket.get(match[1]!);
  if (!obj) return audioJson({ error: 'AUDIO_NAO_ENCONTRADO' }, 404);
  if (obj.size < 1 || obj.size > MAX_AUDIO_BYTES) return audioJson({ error: 'AUDIO_INVALIDO' }, 502);
  return new Response(request.method === 'HEAD' ? null : obj.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': String(obj.size),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
