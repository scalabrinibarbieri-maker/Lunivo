import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GUEST_PROGRESS_KEY, progressKeyForUid } from '../src/features/progress/keys.ts';

test('mantem exatamente a chave do visitante da V1', () => {
  assert.equal(GUEST_PROGRESS_KEY, 'lunivo:progress:v1');
  assert.equal(progressKeyForUid(null), GUEST_PROGRESS_KEY);
});
test('isola a gravacao por usuario e nao confunde com visitante', () => {
  assert.notEqual(progressKeyForUid('aluno-A'), progressKeyForUid('aluno-B'));
  assert.notEqual(progressKeyForUid('aluno-A'), GUEST_PROGRESS_KEY);
});
test('escapa UIDs sem colisao em caracteres especiais', () => {
  assert.notEqual(progressKeyForUid('a/b'), progressKeyForUid('a%2Fb'));
});
