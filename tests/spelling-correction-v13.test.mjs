import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateExercise, gradeExercise, normalizeAnswer, encodeMatches } from '../src/features/learning/engine.ts';

const write = (sampleAnswer, acceptedAnswers = [sampleAnswer]) => ({
  type: 'write', id: 'test', instruction: 'Escreva', prompt: '...', explanation: 'Explique',
  sampleAnswer, acceptedAnswers,
});
const listen = (sampleAnswer, acceptedAnswers = [sampleAnswer]) => ({
  ...write(sampleAnswer, acceptedAnswers), type: 'listen_write', audioExerciseId: 'q02',
});

test('Obigado é aceito, mas apresenta Obrigado na correção', () => {
  const q = write('Obrigado', ['obrigado', 'obrigada']);
  assert.deepEqual(evaluateExercise(q, 'Obigado'), { correct: true, spellingCorrection: 'Obrigado' });
  assert.equal(gradeExercise(q, 'Obigado'), true);
});

test('respostas exatas, variantes aceitas, maiúsculas e pontuação não recebem falso aviso', () => {
  const q = write('Obrigado', ['obrigado', 'obrigada']);
  for (const input of ['Obrigado', 'OBRIGADO!', 'Obrigada.', 'OBRIGADA']) {
    assert.deepEqual(evaluateExercise(q, input), { correct: true, spellingCorrection: null });
  }
  assert.equal(normalizeAnswer('  SÌ!!  '), 'si');
});

test('acentos ausentes recebem indicação da grafia correta sem perder o acerto', () => {
  assert.deepEqual(evaluateExercise(write('Sì'), 'si'), { correct: true, spellingCorrection: 'Sì' });
  assert.deepEqual(evaluateExercise(write('Grazie'), 'grázie'), { correct: true, spellingCorrection: 'Grazie' });
});

test('palavras curtas e contrastes casa/cosa, anno/ano são estritos', () => {
  assert.equal(gradeExercise(write('casa'), 'cosa'), false);
  assert.equal(gradeExercise(write('anno'), 'ano'), false);
  assert.equal(gradeExercise(write('no'), 'nu'), false);
  assert.equal(gradeExercise(write('sì'), 'no'), false);
  assert.equal(gradeExercise(write('acqua'), 'aqua'), false);
});

test('erros simples no italiano são aceitos com correção, sem internet', () => {
  const q = listen('Buongiorno', ['buongiorno']);
  assert.deepEqual(evaluateExercise(q, 'Buongorno'), { correct: true, spellingCorrection: 'Buongiorno' });
  assert.deepEqual(evaluateExercise(q, 'Buongirono'), { correct: true, spellingCorrection: 'Buongiorno' });
  assert.deepEqual(evaluateExercise(write('Grazie'), 'Graze'), { correct: true, spellingCorrection: 'Grazie' });
});

test('mudanças de desinência e de significado frequentes são rejeitadas', () => {
  assert.equal(gradeExercise(write('gelato'), 'gelata'), false);
  assert.equal(gradeExercise(write('buongiorno'), 'buongiorna'), false);
  assert.equal(gradeExercise(write('obrigado'), 'obrigados'), false);
  assert.equal(gradeExercise(write('cantare'), 'cantari'), false);
  assert.equal(gradeExercise(write('Grazie'), 'Grassi'), false);
});

test('não aceita respostas com vários erros ou palavras extras/omitidas', () => {
  const q = write('mi chiamo Luca');
  assert.equal(gradeExercise(q, 'mi chiamo'), false);
  assert.equal(gradeExercise(q, 'mi chiamo Luca oggi'), false);
  assert.equal(gradeExercise(q, 'mi ciao Luca'), false);
  assert.equal(gradeExercise(write('Obrigado'), 'Oigad'), false);
  assert.equal(gradeExercise(write('Obrigado'), ''), false);
});

test('um erro em frase longa pode ser aceito, mas não dois', () => {
  const q = write('mi chiamo Luca');
  assert.deepEqual(evaluateExercise(q, 'mi ciamo Luca'), { correct: true, spellingCorrection: 'mi chiamo Luca' });
  assert.equal(gradeExercise(q, 'mi ciamo Lucca'), false);
});

test('múltipla escolha e associações preservam sua correção exata', () => {
  const q = { type: 'choice', id: '1', prompt: '', instruction: '', explanation: '', options: [{ id: 'a', label: 'Olá' }, { id: 'b', label: 'Tchau' }], correctOptionId: 'a' };
  assert.equal(gradeExercise(q, 'a'), true);
  assert.equal(gradeExercise(q, 'b'), false);
  const match = { type: 'match', id: '2', prompt: '', instruction: '', explanation: '', pairs: [{ id: 'ciao', left: 'Ciao', right: 'Olá' }, { id: 'grazie', left: 'Grazie', right: 'Obrigado' }] };
  assert.equal(gradeExercise(match, encodeMatches({ ciao: 'ciao', grazie: 'grazie' })), true);
  assert.equal(gradeExercise(match, encodeMatches({ ciao: 'grazie', grazie: 'ciao' })), false);
});

test('a tela mostra a grafia correta só após a verificação', () => {
  const source = readFileSync(new URL('../src/app/lesson/[lessonId].tsx', import.meta.url), 'utf8');
  assert.match(source, /const right = gradeExercise\(question, answer\)/);
  assert.match(source, /setSpellingCorrection\(right \? evaluateExercise\(question, answer\)\.spellingCorrection : null\)/);
  assert.match(source, /!skipped && correct && spellingCorrection/);
  assert.match(source, /GRAFIA CORRETA/);
  assert.match(source, /setSpellingCorrection\(null\)/);
  assert.match(source, /completeLesson\(lesson\.id, count, lesson\.exercises\.length\)/);
});
