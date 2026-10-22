import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const component = readFileSync(new URL('../src/features/audio/ExercisePronunciation.tsx', import.meta.url), 'utf8');
const lesson = readFileSync(new URL('../src/app/lesson/[lessonId].tsx', import.meta.url), 'utf8');

test('reprodução não revoga prontidão quando status.isLoaded oscila', () => {
  assert.match(component, /const \[loadedOnce, setLoadedOnce\] = useState\(false\)/);
  assert.match(component, /if \(status\.isLoaded\) setLoadedOnce\(true\)/);
  assert.match(component, /onReadyChange\?\.\(loadedOnce && !failed\)/);
  assert.doesNotMatch(component, /onReadyChange\?\.\(status\.isLoaded\)/);
});

test('aviso de indisponibilidade é separado do loading temporário', () => {
  assert.match(lesson, /const \[audioUnavailable, setAudioUnavailable\] = useState\(false\)/);
  assert.match(lesson, /onUnavailableChange=\{listening \? setAudioUnavailable : undefined\}/);
  assert.match(lesson, /audioUnavailable \|\| audioTakingLong/);
  assert.doesNotMatch(lesson, /Para conteúdo da nuvem, conecte-se à internet na primeira vez/);
});

test('pular continua possível em erro comprovado e não durante carregamento instantâneo', () => {
  assert.match(lesson, /setTimeout\(\(\) => setAudioTakingLong\(true\), 12000\)/);
  assert.match(lesson, /listening && !audioReady && \(audioUnavailable \|\| audioTakingLong\) && !checked && <Pressable/);
  assert.match(lesson, /setSkipped\(true\)/);
});

test('não modifica a pontuação e o motor de correção', () => {
  assert.match(lesson, /gradeExercise\(question, answer\)/);
  assert.match(lesson, /evaluateExercise\(question, answer\)/);
  assert.match(lesson, /completeLesson\(lesson\.id, count, lesson\.exercises\.length\)/);
});
