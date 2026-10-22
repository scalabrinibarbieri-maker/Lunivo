import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/app/result.tsx', import.meta.url), 'utf8');

test('mensagem de conclusão parabeniza sem sugerir encerrar o aprendizado', () => {
  assert.match(source, /Parabéns! Mais uma conquista na sua jornada\. Continue evoluindo!/);
  assert.doesNotMatch(source, /Volte amanhã para continuar!/);
  assert.match(source, /Continuar aprendendo/);
  assert.match(source, /PremiumEmblem kind="streak"/);
});
