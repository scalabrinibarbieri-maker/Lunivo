import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const lesson = readFileSync(new URL('../src/app/lesson/[lessonId].tsx', import.meta.url), 'utf8');
const match = readFileSync(new URL('../src/components/MatchBoard.tsx', import.meta.url), 'utf8');
const audio = readFileSync(new URL('../src/features/audio/useFeedbackSounds.ts', import.meta.url), 'utf8');

test('a correção rola até o conteúdo e volta ao topo na pergunta seguinte', () => {
  assert.match(lesson, /ref=\{scrollRef\}/);
  assert.match(lesson, /onContentSizeChange=.*scrollToEnd/);
  assert.match(lesson, /scrollToEnd\(\{ animated: true \}\)/);
  assert.match(lesson, /scrollTo\(\{ y: 0, animated: false \}\)/);
  assert.match(lesson, /Keyboard\.dismiss\(\)/);
});

test('efeitos sonoros são tocados somente depois da correção, nunca ao pular', () => {
  assert.match(lesson, /if \(!checked \|\| skipped\) return/);
  assert.match(lesson, /playFeedback\(correct\)/);
  assert.match(audio, /useAudioPlayer\(require\('\.\.\/\.\.\/\.\.\/assets\/sfx\/correct\.wav'\)\)/);
  assert.match(audio, /useAudioPlayer\(require\('\.\.\/\.\.\/\.\.\/assets\/sfx\/incorrect\.wav'\)\)/);
  assert.match(audio, /seekTo\(0\)/);
});

test('gravações curtas são WAV mono PCM, distintas e válidas', () => {
  const b = ['correct', 'incorrect'].map(name => readFileSync(new URL(`../assets/sfx/${name}.wav`, import.meta.url)));
  for (const buffer of b) {
    assert.equal(buffer.subarray(0, 4).toString('ascii'), 'RIFF');
    assert.equal(buffer.subarray(8, 12).toString('ascii'), 'WAVE');
    assert.equal(buffer.readUInt16LE(20), 1, 'PCM sem codecs externos');
    assert.equal(buffer.readUInt16LE(22), 1, 'mono');
    assert.ok(buffer.length > 4000 && buffer.length < 40000);
  }
  assert.notDeepEqual(b[0], b[1]);
});

test('associações são azuis antes da confirmação; só ficam verdes/vermelhas após verificar', () => {
  assert.match(match, /checked\s*\? matches\[leftId\] === leftId \? styles\.correct : styles\.incorrect\s*:\s*styles\.paired/);
  assert.match(match, /markerPaired:\s*\{ backgroundColor:/);
  assert.match(match, /checked\) return matches\[leftId\] === leftId \? '✓' : '×'/);
  assert.match(match, /Azul significa apenas selecionado/);
  assert.doesNotMatch(match, /assigned && <Text style=\{styles\.marker\}>✓/);
});

test('XP e os identificadores dos exercícios permanecem no fluxo existente', () => {
  assert.match(lesson, /gradeExercise\(question, answer\)/);
  assert.match(lesson, /if \(right\) setCount/);
  assert.match(lesson, /completeLesson\(lesson\.id, count, lesson\.exercises\.length\)/);
  assert.match(lesson, /findLesson/);
  assert.match(lesson, /loadLesson\(lessonId\)/);
  assert.match(lesson, /ExercisePronunciation/);
  assert.match(match, /encodeMatches\(next\)/);
});

test('não permite corrigir associação incompleta', () => {
  assert.match(lesson, /answer\.split\('\|'\)\.filter\(Boolean\)\.length === question\.pairs\.length/);
});
