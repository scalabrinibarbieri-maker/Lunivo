import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AUDIO_CATALOG, EXERCISE_AUDIO, clipForExercise } from '../src/features/audio/catalog.ts';

test('catálogo contém apenas Ciao e Buongiorno nesta fase', () => {
  assert.deepEqual(Object.keys(AUDIO_CATALOG), ['it-a1-ciao-v1','it-a1-buongiorno-v1']);
  assert.equal(AUDIO_CATALOG['it-a1-ciao-v1'].text, 'Ciao!');
  assert.equal(AUDIO_CATALOG['it-a1-buongiorno-v1'].text, 'Buongiorno');
});
test('somente q01 e q02 recebem voz sem arquivos ausentes', () => {
  assert.equal(clipForExercise('q01'), 'it-a1-ciao-v1');
  assert.equal(clipForExercise('q02'), 'it-a1-buongiorno-v1');
  assert.equal(clipForExercise('q03'), null);
  for (const id of Object.values(EXERCISE_AUDIO)) assert.ok(AUDIO_CATALOG[id]);
});
test('IDs de gravação e caminhos R2 são estáveis e distintos', () => {
  const items = Object.values(AUDIO_CATALOG);
  assert.equal(new Set(items.map(x => x.id)).size, items.length);
  assert.equal(new Set(items.map(x => x.storageKey)).size, items.length);
  for (const item of items) {
    assert.equal(item.locale, 'it-IT');
    assert.match(item.storageKey, /^it-IT\/a1\/[a-z0-9-]+\.mp3$/);
    assert.equal(item.offlineSeed, true);
  }
});
