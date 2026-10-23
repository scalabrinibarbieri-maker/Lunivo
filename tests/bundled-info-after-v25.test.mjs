import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBundledInfo, attachBundledInfo } from '../src/features/courses/bundledInfo.ts';

const lesson = {
  id: 'it-a1-02', title: 'Como você está?', subtitle: 'Perguntas e respostas', unit: 1,
  exercises: [
    { id: 'q07', type: 'choice', prompt: 'Come stai?' },
    { id: 'q08', type: 'write', prompt: 'Sto bene' },
    { id: 'q09', type: 'choice', prompt: 'E tu?' },
    { id: 'q10', type: 'choice', prompt: 'Mi chiamo Luca' },
  ],
};
const entry = (id, field, anchor) => ({
  [field]: anchor,
  exercise: { type: 'info', id, instruction: 'Gramática', prompt: id, explanation: 'Explicação da lição.' },
});
const doc = {
  version: 1, revision: 2, lessonId: 'it-a1-02',
  entries: [entry('q7201', 'beforeExerciseId', 'q07'), entry('q7202', 'afterExerciseId', 'q10')],
};

test('mantém info inicial e insere essere exatamente após último exercício', () => {
  const result = attachBundledInfo(lesson, parseBundledInfo(doc, lesson.id));
  assert.deepEqual(result.exercises.map(x => x.id), ['q7201', 'q07', 'q08', 'q09', 'q10', 'q7202']);
  assert.deepEqual(result.exercises.filter(x => x.type !== 'info'), lesson.exercises);
  assert.equal(lesson.exercises.length, 4);
});

test('preserva compatibilidade de documentos anteriores apenas com beforeExerciseId', () => {
  const docOld = { ...doc, entries: doc.entries.slice(0,1) };
  assert.deepEqual(attachBundledInfo(lesson, parseBundledInfo(docOld, lesson.id)).exercises.map(x => x.id),
    ['q7201','q07','q08','q09','q10']);
});

test('rejeita âncoras malformadas e posições duplas', () => {
  for (const changes of [
    {beforeExerciseId:'q07',afterExerciseId:'q10'},
    {beforeExerciseId:'q07',afterExerciseId:'q10',other:'bad'},
    {},
    {afterExerciseId:'../q10'},
  ]) {
    assert.throws(() => parseBundledInfo({...doc,entries:[{exercise:entry('q7203','beforeExerciseId','q07').exercise, ...changes}]},lesson.id), /BUNDLED_INFO_INVALID/);
  }
});

test('se a âncora não existir, não modifica os exercícios da lição', () => {
  const broken = {...doc,entries:[entry('q7202','afterExerciseId','q9999')]};
  assert.equal(attachBundledInfo(lesson,parseBundledInfo(broken,lesson.id)),lesson);
});
