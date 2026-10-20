import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { repairConfig, isMalformed } = require('../scripts/fix-expo-publications.cjs');

test('publication íntegra permanece inalterada', () => {
  const pub = { groupId: 'g', artifactId: 'a', version: '57.0.5', repository: 'local-maven-repo' };
  const cfg = { android: { publication: pub } };
  assert.deepEqual(repairConfig(cfg), []);
  assert.deepEqual(cfg.android.publication, pub);
});
test('publication sem version é removida para buildFromSource', () => {
  const cfg = { android: { modules: ['ExpoAudio'], publication: { groupId: 'g', artifactId: 'a', repository: 'local-maven-repo' } } };
  assert.deepEqual(repairConfig(cfg), ['android.publication']);
  assert.equal('publication' in cfg.android, false);
  assert.deepEqual(cfg.android.modules, ['ExpoAudio']);
});
test('publication em projects aninhados também é corrigida', () => {
  const cfg = { android: { projects: [{ name: 'a', publication: { groupId: 'g', artifactId: 'a' } }, { name: 'b' }] } };
  assert.deepEqual(repairConfig(cfg), ['android.projects[0].publication']);
  assert.equal('publication' in cfg.android.projects[0], false);
  assert.equal(cfg.android.projects[1].name, 'b');
});
test('configs sem publication não são alterados', () => {
  assert.deepEqual(repairConfig({ android: { modules: ['M'] } }), []);
  assert.equal(isMalformed(undefined), false);
});
