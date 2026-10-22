import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('home premium troca círculos estáticos por aura animada', () => {
  const source = read('src/app/index.tsx');
  assert.match(source, /PremiumLoopAura/);
  assert.doesNotMatch(source, /heroCircleBig/);
  assert.doesNotMatch(source, /heroCircleSmall/);
  assert.doesNotMatch(source, /ambientTop/);
  assert.doesNotMatch(source, /ambientSmall/);
});

test('tela da lição destaca o objetivo com animação e prepara celebração da streak', () => {
  const source = read('src/app/lesson/[lessonId].tsx');
  assert.match(source, /AnimatedInstructionCue/);
  assert.match(source, /PremiumLoopAura variant="lesson"/);
  assert.match(source, /streakCelebration: studiedTodayBefore \? '0' : '1'/);
});

test('resultado usa celebração visual para a streak do dia', () => {
  const source = read('src/app/result.tsx');
  assert.match(source, /streakCelebration/);
  assert.match(source, /Sequência garantida hoje/);
  assert.match(source, /PremiumLoopAura variant="streak"/);
});
