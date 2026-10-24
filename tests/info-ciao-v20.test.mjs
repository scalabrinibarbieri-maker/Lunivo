import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/features/courses/CourseProvider.tsx', import.meta.url), 'utf8');

test('injeta etapa informativa sobre ciao antes da primeira lição local', () => {
  assert.match(source, /function withLessonInfo\(lesson: Lesson\)/);
  assert.match(source, /lesson\.id !== 'it-a1-01'/);
  assert.match(source, /id: 'q00'/);
  assert.match(source, /type: 'info'/);
  assert.match(source, /Ciao: uma saudação pequena, mas cheia de estilo/);
  assert.match(source, /category: 'culture'/);
});

test('a ilustração do Ciao é um PNG nativo empacotado, sem base64', () => {
  const helper = readFileSync(new URL('../src/features/courses/localInfoImage.ts', import.meta.url), 'utf8');
  assert.match(source, /url: LOCAL_CIAO_IMAGE_URI/);
  assert.doesNotMatch(source, /data:image\/png;base64,/);
  assert.match(source, /Arte ilustrativa da palavra Ciao em italiano/);
  assert.match(helper, /require\('\.\.\/\.\.\/\.\.\/assets\/lessons\/ciao-greeting\.png'\)/);
});
