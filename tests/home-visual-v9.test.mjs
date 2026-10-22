import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const home = readFileSync(new URL('../src/app/index.tsx', import.meta.url), 'utf8');

test('Home V9 mantém lições, identidade e lógica de desbloqueio', () => {
  for (const name of ['LESSONS', 'canStartLesson', 'progress.completedLessonIds', 'progress.totalXp',
    'italianUnits.flatMap', 'orderedIds', 'nextLocal', 'nextRemote']) {
    assert.ok(home.includes(name), `Não pode perder ${name}`);
  }
  assert.match(home, /router\.push\(\{ pathname: '\/lesson\/\[lessonId\]'/);
  assert.match(home, /router\.push\(\{ pathname: '\/lesson\/\[lessonId\]'/);
  assert.match(home, /await loadUnit\(unit\)/);
  assert.match(home, /disabled=\{!available\}/);
});

test('Home V9 mantém as operações offline e a atualização do catálogo', () => {
  assert.match(home, /download\(unit\)/);
  assert.match(home, /remove\(unit\)/);
  assert.match(home, /downloaded\(unit\)/);
  assert.match(home, /onRefresh=\{\(\) => \{ void refresh\(\); \}\}/);
  assert.match(home, /removeDownloadedUnit/);
});

test('Home V9 preserva as rotas e dá acesso a todas as seções', () => {
  assert.match(home, /router\.replace\('\/'\)/);
  assert.match(home, /router\.push\('\/courses'\)/);
  assert.match(home, /router\.push\('\/profile'\)/);
  assert.match(home, /Explorar outras unidades/);
});

test('Home V9 usa apenas elementos nativos e exibe a meta existente sem inventar tempo de estudo', () => {
  assert.match(home, /from 'react-native'/);
  assert.match(home, /useOnboarding/);
  assert.match(home, /settings\?\.dailyGoalMinutes/);
  assert.doesNotMatch(home, /WebView|Math\.random|localStorage|window\./);
  assert.match(home, /backgroundColor: NAVY/);
  assert.match(home, /backgroundColor: PAPER/);
  assert.match(home, /styles\.lessonCardActive/);
  assert.match(home, /DockIcon/);
});
