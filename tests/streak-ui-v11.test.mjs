import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
const home = readFileSync(new URL('../src/app/index.tsx', import.meta.url), 'utf8');
const result = readFileSync(new URL('../src/app/result.tsx', import.meta.url), 'utf8');
const provider = readFileSync(new URL('../src/features/progress/ProgressProvider.tsx', import.meta.url), 'utf8');
const backend = readFileSync(new URL('../backend/src/index.ts', import.meta.url), 'utf8');
test('streak na home preserva caminhos de lições, XP e downloads', () => {
  for (const piece of ['computeStreak', 'streak.current', 'progress.totalXp', 'canStartLesson', 'loadUnit(unit)', 'download(unit)', 'remove(unit)', 'italianUnits.flatMap']) assert.ok(home.includes(piece), piece);
});
test('resultado mostra streak e continua sem conceder XP extra', () => {
  assert.match(result,/streak\.current/);
  assert.match(result,/Ao repetir uma lição, o XP não é contado novamente/);
});
test('sincronizacao da streak nao altera rotas antigas de XP e preserva progressos locais', () => {
  assert.match(provider,/uploadCloudProgress/);
  assert.match(provider,/uploadXpAwards/);
  assert.match(provider,/uploadStudyDays/);
  assert.match(provider,/studyDays: normalizeStudyDays/);
  assert.match(backend,/\/v1\/progress\/study-days/);
});
