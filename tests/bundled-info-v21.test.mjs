import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseBundledInfo, attachBundledInfo } from '../src/features/courses/bundledInfo.ts';

const valid = {
  version: 1, revision: 1, lessonId: 'it-a1-01',
  entries: [{ beforeExerciseId: 'q01', exercise: {
    type: 'info', id: 'q7001', category: 'vocabulary',
    instruction: 'Aprenda a palavra', prompt: 'Bevi acqua?',
    explanation: 'Acqua significa água.',
    image: { url: 'https://lunivo-api-dev.scalabrinibarbieri.workers.dev/v1/courses/bundled/assets/garrafa-acqua-v1.png', alt: 'Garrafa de água' },
  } }],
};
const original = {
  id: 'it-a1-01', title: 'Primeiras palavras', subtitle: 'Saudações e cortesia', unit: 1,
  exercises: [
    { id: 'q00', type: 'info', prompt: 'Ciao', instruction: 'Cultura', explanation: 'Saudação' },
    { id: 'q01', type: 'choice', prompt: 'Ciao!', instruction: 'Traduza', explanation: 'Olá!', options: [], correctOptionId: 'a' },
    { id: 'q02', type: 'choice', prompt: 'Buongiorno', instruction: 'Traduza', explanation: 'Bom dia', options: [], correctOptionId: 'b' },
  ],
};

test('um bloco online entra no lugar planejado sem alterar as questões', () => {
  const parsed = parseBundledInfo(valid, 'it-a1-01');
  const result = attachBundledInfo(original, parsed);
  assert.deepEqual(result.exercises.map(item => item.id), ['q00', 'q7001', 'q01', 'q02']);
  assert.equal(original.exercises.length, 3);
  assert.deepEqual(result.exercises.filter(x => x.type !== 'info'), original.exercises.filter(x => x.type !== 'info'));
});

test('inserção inválida não modifica uma lição', () => {
  const doc = parseBundledInfo({ ...valid, entries: [{ ...valid.entries[0], beforeExerciseId: 'q9999' }] }, 'it-a1-01');
  assert.equal(attachBundledInfo(original, doc), original);
  const collided = parseBundledInfo({ ...valid, entries: [{ ...valid.entries[0], exercise: { ...valid.entries[0].exercise, id: 'q01' } }] }, 'it-a1-01');
  assert.equal(attachBundledInfo(original, collided), original);
});

test('documentos não confiáveis são recusados', () => {
  assert.throws(() => parseBundledInfo({ ...valid, lessonId: 'it-a1-02' }, 'it-a1-01'));
  assert.throws(() => parseBundledInfo({ ...valid, entries: [{ ...valid.entries[0], exercise: { ...valid.entries[0].exercise, type: 'write' } }] }, 'it-a1-01'));
  assert.throws(() => parseBundledInfo({ ...valid, entries: [{ ...valid.entries[0], exercise: { ...valid.entries[0].exercise, image: { url: 'file:///secret', alt: 'a' } } }] }, 'it-a1-01'));
});

test('o modo offline não carrega nem guarda infos remotas', () => {
  const provider = readFileSync(new URL('../src/features/courses/CourseProvider.tsx', import.meta.url), 'utf8');
  assert.match(provider, /catch\{\s*\/\/ Offline or unavailable server: preserve the original bundled lesson\./);
  assert.match(provider, /return base;/);
  assert.match(provider, /Cache-Control':'no-store/);
  assert.doesNotMatch(provider, /Storage\.setItem\(['"]lunivo:bundled/);
  const lesson = readFileSync(new URL('../src/app/lesson/[lessonId].tsx', import.meta.url), 'utf8');
  assert.match(lesson, /loaderRef\.current\(lessonId\)/);
  assert.match(lesson, /if \(!lessonId\) return;/);
  assert.doesNotMatch(lesson, /useRef<string \| undefined>\(\)/);
  assert.doesNotMatch(lesson, /requested\.current === lessonId/);
  assert.match(lesson, /setResolved\(l\)/);
});
