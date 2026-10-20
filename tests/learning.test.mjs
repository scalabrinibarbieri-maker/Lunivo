import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAnswer, gradeExercise, correctAnswerLabel, encodeMatches } from '../src/features/learning/engine.ts';
import { LESSONS } from '../src/features/learning/data.ts';
import { isListeningExercise, isChoiceExercise, isWriteExercise } from '../src/features/learning/types.ts';

test('normaliza acentos, pontuação e espaços', () => {
  assert.equal(normalizeAnswer('  SÌ!!  '), 'si');
  assert.equal(normalizeAnswer('  Eu   estou BEM.  '), 'eu estou bem');
});
test('corrige múltipla escolha original', () => {
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
      if (isChoiceExercise(q)) {
        assert.ok(q.options.some(o => o.id === q.correctOptionId));
        assert.equal(new Set(q.options.map(o => o.id)).size, q.options.length);
      } else if (isWriteExercise(q)) {
        assert.ok(q.acceptedAnswers.length > 0);
        assert.equal(gradeExercise(q, q.sampleAnswer), true);
      } else if (q.type === 'match') {
        assert.ok(q.pairs.length >= 2);
        const ids = q.pairs.map(p => p.id);
        assert.equal(new Set(ids).size, ids.length);
        assert.equal(gradeExercise(q, encodeMatches(Object.fromEntries(ids.map(id => [id, id])))), true);
      } else {
        assert.fail(`Tipo desconhecido: ${q.type}`);
      }
    }
  }
});

test('escuta tem as respostas corretas mas não exibe a transcrição no prompt', () => {
  const questions = LESSONS.flatMap(l => l.exercises).filter(isListeningExercise);
  assert.equal(questions.length, 3);
  const audioSources = new Map([['q01', 'Ciao'], ['q02', 'Buongiorno'], ['q03', 'Grazie']]);
  for (const q of questions) {
    assert.ok(audioSources.has(q.audioExerciseId), 'referência a áudio existente');
    assert.ok(!q.prompt.toLowerCase().includes(audioSources.get(q.audioExerciseId).toLowerCase()), 'não revelar fala no enunciado');
  }
  const dictation = questions.find(q => q.id === 'q16');
  assert.equal(gradeExercise(dictation, 'BUONGIORNO!'), true);
  assert.equal(gradeExercise(dictation, 'grazie'), false);
});

test('associação só aceita bijeção completa e pares corretos', () => {
  const q = LESSONS[0].exercises.find(q => q.type === 'match');
  assert.ok(q);
  assert.equal(gradeExercise(q, encodeMatches({ ciao: 'ciao', grazie: 'grazie', buongiorno: 'buongiorno' })), true);
  assert.equal(gradeExercise(q, encodeMatches({ ciao: 'grazie', grazie: 'ciao', buongiorno: 'buongiorno' })), false);
  assert.equal(gradeExercise(q, encodeMatches({ ciao: 'ciao' })), false);
  assert.equal(gradeExercise(q, 'ciao:ciao|grazie:ciao|buongiorno:buongiorno'), false);
  assert.equal(gradeExercise(q, 'ciao:ciao|grazie:grazie|unknown:unknown'), false);
  assert.match(correctAnswerLabel(q), /Ciao — Olá/);
});

test('mantém lições sincronizadas e IDs de áudio existentes', () => {
  assert.deepEqual(LESSONS.map(l => l.id), ['it-a1-01', 'it-a1-02', 'it-a1-03']);
  assert.deepEqual(LESSONS[0].exercises.slice(0, 3).map(q => q.id), ['q01', 'q02', 'q03']);
  assert.equal(LESSONS[0].exercises.length, 10);
});
