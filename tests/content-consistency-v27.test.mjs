import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LESSONS, BUNDLED_VOCABULARY } from '../src/features/learning/data.ts';
import { wordsForExercise } from '../src/features/vocabulary/logic.ts';
import { gradeExercise } from '../src/features/learning/engine.ts';

const byId = new Map(LESSONS.flatMap(lesson => lesson.exercises.map(ex => [ex.id, { lesson, ex }])));

test('a regra CQ de acqua está correta no exercício original; resposta e XP não mudam', () => {
  const { lesson, ex } = byId.get('q12');
  assert.equal(lesson.id, 'it-a1-03');
  assert.equal(ex.type, 'write');
  assert.equal(ex.prompt, 'Água');
  assert.deepEqual(ex.acceptedAnswers, ['acqua']);
  assert.equal(ex.sampleAnswer, 'Acqua');
  assert.match(ex.explanation, /C seguido de Q \(CQ\)/);
  assert.doesNotMatch(ex.explanation, /duas? letras? c|dois c|cc/iu);
  assert.equal(gradeExercise(ex, 'acqua'), true);
  assert.equal(gradeExercise(ex, 'acca'), false);
});

test('nenhuma questão embutida ficou sem metadados ou foi removida', () => {
  assert.deepEqual(LESSONS.map(lesson => lesson.id), ['it-a1-01', 'it-a1-02', 'it-a1-03']);
  assert.deepEqual(LESSONS.map(lesson => lesson.exercises.length), [10, 4, 4]);
  const ids = new Set([...byId.keys(), 'q00']); // tela informativa local do Ciao
  assert.deepEqual(new Set(Object.keys(BUNDLED_VOCABULARY)), ids);
  for (const [id, entry] of byId) {
    const words = wordsForExercise(entry.lesson.id, entry.ex);
    assert.ok(words.length, `Exercício ${id} sem vocabulário`);
    assert.deepEqual(words.map(x => [x.term, x.meaning]), BUNDLED_VOCABULARY[id]);
  }
});

test('vocabulário embutido não duplica histórico nem muda IDs existentes', () => {
  const a = byId.get('q03'); const b = byId.get('q05');
  assert.deepEqual(wordsForExercise(a.lesson.id, a.ex)[0].id, wordsForExercise(b.lesson.id, b.ex)[0].id);
  assert.equal(wordsForExercise('it-a1-03', byId.get('q12').ex)[0].id, 'it-IT:acqua');
  const words = wordsForExercise('it-a1-01', { type:'info', id:'q00', prompt:'Ciao', instruction:'', explanation:'' });
  assert.deepEqual(words.map(x=>x.id), ['it-IT:ciao']);
});
