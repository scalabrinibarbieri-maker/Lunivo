import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const layout = readFileSync(new URL('../src/app/_layout.tsx', import.meta.url), 'utf8');
const home = readFileSync(new URL('../src/app/index.tsx', import.meta.url), 'utf8');

test('entrada premium não duplica a splash nem sobrepõe a home', () => {
  assert.doesNotMatch(layout, /LaunchSplash|Animated\.|setTimeout\([^)]*1150/);
  assert.match(layout, /SplashScreen\.hideAsync/);
});

test('home preserva o motor de cursos e progressos sem alterações', () => {
  assert.match(home, /LESSONS/);
  assert.match(home, /canStartLesson/);
  assert.match(home, /progress\.completedLessonIds/);
  assert.match(home, /progress\.totalXp/);
  assert.match(home, /loadUnit\(unit\)/);
  assert.match(home, /download\(unit\)/);
  assert.match(home, /remove\(unit\)/);
  assert.match(home, /italianUnits\.flatMap/);
});
