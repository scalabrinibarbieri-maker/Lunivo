import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAnswer, gradeExercise, correctAnswerLabel } from '../src/features/learning/engine.ts';
import { LESSONS } from '../src/features/learning/data.ts';
test('normaliza acentos, pontuação e espaços', () => {
  assert.equal(normalizeAnswer('  SÌ!!  '), 'si');
  assert.equal(normalizeAnswer('  Eu   estou BEM.  '), 'eu estou bem');
});
test('corrige múltipla escolha', () => {
  const q = LESSONS[0].exercises[0];
  assert.equal(gradeExercise(q, 'a'), true);
  assert.equal(gradeExercise(q, 'b'), false);
  assert.equal(correctAnswerLabel(q), 'Olá!');
});
test('aceita respostas alternativas e rejeita texto vazio', () => {
  const q = LESSONS[0].exercises[2];
  assert.equal(gradeExercise(q, 'Obrigada!'), true);
  assert.equal(gradeExercise(q, 'OBRIGADO'), true);
  assert.equal(gradeExercise(q, ' '), false);
});
test('IDs das lições e exercícios são únicos', () => {
  const ids = LESSONS.map(l => l.id);
  const questions = LESSONS.flatMap(l => l.exercises.map(q => q.id));
  assert.equal(ids.length, new Set(ids).size);
  assert.equal(questions.length, new Set(questions).size);
});

test('todos os exercícios possuem respostas válidas', () => {
  for (const lesson of LESSONS) {
    assert.ok(lesson.exercises.length >= 3);
    for (const q of lesson.exercises) {
      if (q.type === 'choice') {
        assert.ok(q.options.some(o => o.id === q.correctOptionId));
        assert.equal(new Set(q.options.map(o => o.id)).size, q.options.length);
      } else {
        assert.ok(q.acceptedAnswers.length > 0);
        assert.equal(gradeExercise(q, q.sampleAnswer), true);
      }
    }
  }
});
