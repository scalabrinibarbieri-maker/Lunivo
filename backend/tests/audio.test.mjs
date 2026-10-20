import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleAudioRequest } from '../src/audio.ts';

function fakeBucket(objects = {}) {
  return { async get(key) {
    if (!(key in objects)) return null;
    const bytes = typeof objects[key] === 'string' ? new TextEncoder().encode(objects[key]) : objects[key];
    return { size: bytes.length, text: async () => new TextDecoder().decode(bytes), body: new Blob([bytes]).stream() };
  }};
}
const get = (p, b) => handleAudioRequest(new Request('https://example.test' + p), b);

test('sem manifesto R2 retorna catalogo vazio', async () => {
  const r = await get('/v1/audio/manifest', fakeBucket());
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { version: 1, clips: [] });
});
test('distribui manifesto e arquivos MP3 sem tornar bucket publico', async () => {
  const objects = {
    'manifest-v1.json': '{"version":1,"clips":[]}',
    'it-IT/a1/it-a1-grazie-v1.mp3': new Uint8Array([73,68,51,1]),
  };
  const manifest = await get('/v1/audio/manifest', fakeBucket(objects));
  assert.equal(manifest.status, 200);
  const audio = await get('/v1/audio/file/it-IT/a1/it-a1-grazie-v1.mp3', fakeBucket(objects));
  assert.equal(audio.status, 200);
  assert.equal(audio.headers.get('Content-Type'), 'audio/mpeg');
  assert.equal(audio.headers.get('Content-Length'), '4');
});
test('impede caminho inseguro e MP3 ausente', async () => {
  const b = fakeBucket();
  for (const path of ['/v1/audio/file/../secret.mp3', '/v1/audio/file/it-IT/a1/no.txt', '/v1/audio/file/it-IT/a1/it-a1-grazie-v1.mp3']) {
    assert.equal((await get(path,b)).status,404);
  }
});
test('nao permite method POST nem manifesto enorme', async () => {
  const r = await handleAudioRequest(new Request('https://example.test/v1/audio/manifest', {method:'POST'}),fakeBucket());
  assert.equal(r?.status,405);
  const bad = fakeBucket({ 'manifest-v1.json': 'x'.repeat(70_000) });
  assert.equal((await get('/v1/audio/manifest', bad)).status,502);
});
