import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
test('Expo 57 e expo-asset 57 sao compativeis no nivel principal', () => {
  assert.match(pkg.dependencies.expo, /^~57\./);
  assert.equal(pkg.dependencies['expo-asset'], '57.0.20');
  assert.equal(lock.packages['node_modules/expo-asset']?.version, '57.0.20');
  assert.equal(lock.packages['']?.dependencies?.['expo-asset'], '57.0.20');
});
