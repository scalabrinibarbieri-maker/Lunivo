import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KNOWN_LESSON_IDS, parseCompletionSync } from '../src/validation.ts';

test('permite uma lista vazia sem inventar conquistas', () => {
  assert.deepEqual(parseCompletionSync({ completedLessonIds: [] }), []);
});
test('aceita lições reais do curso inicial', () => {
  assert.deepEqual(parseCompletionSync({ completedLessonIds: ['it-a1-01', 'it-a1-03'] }), ['it-a1-01', 'it-a1-03']);
});
test('proíbe campos extras de XP ou Premium', () => {
  assert.throws(() => parseCompletionSync({ completedLessonIds: ['it-a1-01'], xp: 99999 }));
  assert.throws(() => parseCompletionSync({ completedLessonIds: [], premium: true }));
  assert.throws(() => parseCompletionSync({ completedLessonIds: [], userId: 'outra-conta' }));
});
test('recusa lições inventadas e SQL injection', () => {
  assert.throws(() => parseCompletionSync({ completedLessonIds: ['it-a1-999'] }));
  assert.throws(() => parseCompletionSync({ completedLessonIds: ["it-a1-01'; DROP TABLE users; --"] }));
});
test('recusa duplicatas', () => {
  assert.throws(() => parseCompletionSync({ completedLessonIds: ['it-a1-01', 'it-a1-01'] }));
});
test('recusa strings, null e estruturas inválidas', () => {
  for (const input of [null, [], 'teste', 0, {}, { completedLessonIds: null }, { completedLessonIds: 'it-a1-01' }]) {
    assert.throws(() => parseCompletionSync(input));
  }
});
test('limita quantidade de itens e tipo', () => {
  assert.throws(() => parseCompletionSync({ completedLessonIds: Array(26).fill('it-a1-01') }));
  assert.throws(() => parseCompletionSync({ completedLessonIds: [1] }));
});
test('manifesta três IDs conhecidos', () => {
  assert.deepEqual([...KNOWN_LESSON_IDS], ['it-a1-01', 'it-a1-02', 'it-a1-03']);
});
