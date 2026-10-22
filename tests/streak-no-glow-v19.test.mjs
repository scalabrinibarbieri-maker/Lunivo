import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/components/PremiumEmblem.tsx', import.meta.url), 'utf8');

test('streak mantém a chama animada e remove o halo circular amarelo', () => {
  assert.match(source, /kind === 'xp' && <Animated\.View/);
  assert.doesNotMatch(source, /#F7A65E|#FFAB5D/);
  assert.match(source, /transform: \[\{ scale: animated \? scale : 1 \}\]/);
  assert.match(source, /assets\/ui\/streak-flame\.png/);
});

test('o emblema de XP conserva seu próprio brilho', () => {
  assert.match(source, /backgroundColor: '#66C6FF'/);
  assert.match(source, /shadowColor: '#83CBFF'/);
});
