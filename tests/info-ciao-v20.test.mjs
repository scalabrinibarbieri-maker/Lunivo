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

test('explicação usa imagem embutida para testar o modo info sem depender da internet', () => {
  assert.match(source, /data:image\/png;base64,/);
  assert.match(source, /Ilustração de duas pessoas se cumprimentando/);
});
