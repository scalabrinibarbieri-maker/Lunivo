import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));

test('R2 privativo de audio estara ligado ao Worker correto', () => {
  assert.equal(config.name, 'lunivo-api-dev');
  assert.deepEqual(config.r2_buckets, [{ binding: 'AUDIO_BUCKET', bucket_name: 'lunivo-audios' }]);
});

test('Conexao do D1 e Firebase continua intacta', () => {
  assert.equal(config.d1_databases[0].binding, 'DB');
  assert.equal(config.d1_databases[0].database_name, 'lunivo-dev');
  assert.equal(config.vars.FIREBASE_PROJECT_ID, 'lunivo-25675');
});
