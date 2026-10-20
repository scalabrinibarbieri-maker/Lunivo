import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const app = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo;
const layout = readFileSync(new URL('../src/app/_layout.tsx', import.meta.url), 'utf8');
const splash = readFileSync(new URL('../src/components/LaunchSplash.tsx', import.meta.url), 'utf8');

test('splash nativa mantém a logo original do GitHub', () => {
  const plugin = app.plugins.find(p => Array.isArray(p) && p[0] === 'expo-splash-screen');
  assert.ok(plugin);
  assert.equal(plugin[1].image, './assets/lunivo-logo.png');
  assert.equal(plugin[1].backgroundColor, '#071625');
  assert.equal(plugin[1].dark.image, plugin[1].image);
  assert.equal(plugin[1].dark.backgroundColor, plugin[1].backgroundColor);
  assert.equal(plugin[1].resizeMode, 'contain');
});

test('estrutura de identidade e integração preservada', () => {
  assert.equal(app.android.package, 'com.orangi.lunivo');
  assert.equal(app.ios.bundleIdentifier, 'com.orangi.lunivo');
  assert.ok(app.plugins.some(p => Array.isArray(p) && p[0] === 'expo-audio'));
  for (const provider of ['AuthProvider', 'CourseProvider', 'ProgressProvider']) {
    assert.match(layout, new RegExp(`<${provider}>`));
  }
});

test('transição segura sem atraso artificial e sem dependência de rede', () => {
  assert.match(layout, /preventAutoHideAsync\(\)/);
  assert.match(splash, /SplashScreen\.hideAsync\(\)/);
  assert.match(splash, /Animated\.timing\(opacity/);
  assert.doesNotMatch(splash, /fetch\(|https?:\/\//);
  assert.match(splash, /authReady && progressReady && courseReady/);
});

// Expo SDK 57 e RN 0.86 nao aceitam as APIs usadas na V1 da splash.
test('evita propriedades incompatíveis que interromperam o GitHub Actions', () => {
  assert.doesNotMatch(layout, /<StatusBar[^>]*backgroundColor=/s);
  assert.doesNotMatch(splash, /StyleSheet\.absoluteFillObject/);
  assert.match(splash, /position: 'absolute'/);
  assert.match(splash, /top: 0, right: 0, bottom: 0, left: 0/);
});
