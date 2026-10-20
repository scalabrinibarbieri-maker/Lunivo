import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRemoteProgress, planProgressSync } from '../src/features/progress/syncLogic.ts';
const known = ['it-a1-01', 'it-a1-02', 'it-a1-03'];

test('restaura licoes de outro celular sem modificar XP local', () => {
  assert.deepEqual(planProgressSync([], ['it-a1-01', 'it-a1-02'], known), {
    uploadIds: ['it-a1-01', 'it-a1-02'], mergedLocalIds: ['it-a1-01', 'it-a1-02'], needsUpload: false,
  });
});
test('envia somente novos IDs locais, sem apagar progresso remoto', () => {
  assert.deepEqual(planProgressSync(['it-a1-03'], ['it-a1-01'], known), {
    uploadIds: ['it-a1-01', 'it-a1-03'], mergedLocalIds: ['it-a1-01', 'it-a1-03'], needsUpload: true,
  });
});
test('nao envia IDs desconhecidos e preserva dados locais futuros', () => {
  assert.deepEqual(planProgressSync(['it-a1-01', 'future-01'], [], known), {
    uploadIds: ['it-a1-01'], mergedLocalIds: ['it-a1-01', 'future-01'], needsUpload: true,
  });
});
test('uniao ordenada, sem duplicatas', () => {
  assert.deepEqual(planProgressSync(['it-a1-03', 'it-a1-03', 'it-a1-01'], ['it-a1-02', 'it-a1-02'], known).uploadIds, known);
});
test('rejeita resposta invalida do servidor', () => {
  for (const body of [null, {}, [], { completedLessonIds: 'a' }, { completedLessonIds: [2] }]) {
    assert.throws(() => parseRemoteProgress(body));
  }
  assert.deepEqual(parseRemoteProgress({ completedLessonIds: ['it-a1-01'] }), ['it-a1-01']);
});
