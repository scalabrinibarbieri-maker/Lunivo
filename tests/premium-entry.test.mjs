import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const splash = readFileSync(new URL('../src/components/LaunchSplash.tsx', import.meta.url), 'utf8');
const home = readFileSync(new URL('../src/app/index.tsx', import.meta.url), 'utf8');

test('transição da splash mantém os reflexos fora da home', () => {
  assert.match(splash, /Animated\.sequence\(/);
  assert.match(splash, /Animated\.timing\(navyVeil/);
  assert.match(splash, /Animated\.timing\(opacity/);
  assert.ok(splash.indexOf('Animated.timing(navyVeil') < splash.indexOf('Animated.timing(opacity'));
  assert.match(splash, /!holdComplete/);
  assert.match(splash, /authReady && progressReady && courseReady/);
  assert.match(splash, /onFinished\(\)/);
});

test('home gamificada mantém aprendizado, downloads e progresso reais', () => {
  assert.match(home, /LESSONS/); // exercício integrado
  assert.match(home, /canStartLesson/);
  assert.match(home, /progress\.completedLessonIds/);
  assert.match(home, /progress\.totalXp/);
  assert.match(home, /loadUnit\(unit\)/);
  assert.match(home, /download\(unit\)/);
  assert.match(home, /remove\(unit\)/);
  assert.match(home, /\.\.\.italianUnits\.flatMap/);
  assert.match(home, /router\.push\('\/courses'\)/);
  assert.match(home, /router\.push\('\/profile'\)/);
});
