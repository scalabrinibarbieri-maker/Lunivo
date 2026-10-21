import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';

const url = new URL('../', import.meta.url);
const app = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo;
const layout = readFileSync(new URL('../src/app/_layout.tsx', import.meta.url), 'utf8');
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const splashLogo = new URL('../assets/lunivo-logo-splash.png', import.meta.url);

// Se testes forem chamados isoladamente (fora de npm ci), preparar a logo.
if (!existsSync(splashLogo)) execFileSync(process.execPath, [new URL('../scripts/prepare-splash-logo.cjs', import.meta.url).pathname]);

test('splash usa somente logo original com margens novas', () => {
  const plugin = app.plugins.find(p => Array.isArray(p) && p[0] === 'expo-splash-screen');
  assert.ok(plugin);
  assert.equal(plugin[1].image, './assets/lunivo-logo-splash.png');
  assert.equal(plugin[1].dark.image, plugin[1].image);
  assert.equal(plugin[1].backgroundColor, '#071625');
  assert.equal(plugin[1].dark.backgroundColor, '#071625');
  assert.ok(plugin[1].imageWidth <= 270);
  const img = readFileSync(splashLogo);
  assert.equal(img.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.ok(img.readUInt32BE(16) > 0 && img.readUInt32BE(20) > 0);
  assert.equal(app.android.package, 'com.orangi.lunivo');
  assert.equal(app.ios.bundleIdentifier, 'com.orangi.lunivo');
});

test('geração preserva logo original sem redesenhar letras', () => {
  assert.match(pkg.scripts.postinstall, /prepare-splash-logo\.cjs/);
  assert.match(pkg.scripts.postinstall, /fix-expo-publications\.cjs/);
  const original = readFileSync(new URL('../assets/lunivo-logo.png', import.meta.url));
  const output = readFileSync(splashLogo);
  assert.notDeepEqual(original, output);
  assert.ok(output.length > 1000);
});

test('a splash é nativa e some assim que o aplicativo está preparado', () => {
  assert.match(layout, /SplashScreen\.preventAutoHideAsync\(\)/);
  assert.match(layout, /SplashScreen\.hideAsync\(\)/);
  assert.match(layout, /authReady && courseReady && progressReady/);
  assert.match(layout, /onLayout/);
  assert.doesNotMatch(layout, /LaunchSplash|Animated|navyVeil|splashFinished/);
  for (const provider of ['AuthProvider', 'CourseProvider', 'ProgressProvider']) {
    assert.match(layout, new RegExp(`<${provider}>`));
  }
});
