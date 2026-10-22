import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateExercise } from '../src/features/learning/engine.ts';

const home = readFileSync(new URL('../src/app/index.tsx', import.meta.url), 'utf8');

test('A Home usa somente a logo oficial, ampliada e alinhada', () => {
  assert.match(home, /require\('\.\.\/\.\.\/assets\/lunivo-logo\.png'\)/);
  assert.match(home, /brandLogo:\s*\{ width: 218, height: 74, marginLeft: -54 \}/);
  assert.doesNotMatch(home, /seu idioma novo\./);
  assert.match(home, /Abrir meu perfil/);
  assert.match(home, /PremiumInsightSheet/);
  assert.match(home, /computeStreak/);
  assert.match(home, /progress\.totalXp/);
});

test('Erro de grafia de obrigado em resposta portuguesa é aceito com orientação', () => {
  const q = { type: 'write', id: 'q03', instruction: 'Escreva em português',
    prompt: 'Grazie', explanation: 'Grazie significa obrigado.',
    acceptedAnswers: ['obrigado', 'obrigada'], sampleAnswer: 'Obrigado' };
  assert.deepEqual(evaluateExercise(q, 'Obigado'), { correct: true, spellingCorrection: 'Obrigado' });
});

test('Traduzir obrigado exige italiano; grafia próxima de grazie é aceita', () => {
  const q = { type: 'write', id: 'q05', instruction: 'Escreva em italiano',
    prompt: 'Obrigado', explanation: 'Grazie é a forma italiana.',
    acceptedAnswers: ['grazie'], sampleAnswer: 'Grazie' };
  assert.deepEqual(evaluateExercise(q, 'Obigado'), { correct: false, spellingCorrection: null });
  assert.deepEqual(evaluateExercise(q, 'Graze'), { correct: true, spellingCorrection: 'Grazie' });
  assert.deepEqual(evaluateExercise(q, 'Grazie'), { correct: true, spellingCorrection: null });
});
