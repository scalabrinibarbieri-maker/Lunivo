import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  DAILY_GOALS, ONBOARDING_STORAGE_KEY, formatClock, makeOnboardingSettings,
  parseOnboardingSettings, validClock,
} from '../src/features/onboarding/model.ts';

const layout = readFileSync(new URL('../src/app/_layout.tsx', import.meta.url), 'utf8');
const screen = readFileSync(new URL('../src/app/onboarding.tsx', import.meta.url), 'utf8');
const notificationCode = readFileSync(new URL('../src/features/onboarding/reminders.ts', import.meta.url), 'utf8');
const provider = readFileSync(new URL('../src/features/onboarding/OnboardingProvider.tsx', import.meta.url), 'utf8');
const app = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo;
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('metas diárias e relógio validados', () => {
  assert.deepEqual([...DAILY_GOALS], [5, 10, 15, 20, 30]);
  assert.equal(formatClock(9, 5), '09:05');
  assert.equal(validClock(23, 59), true);
  assert.equal(validClock(24, 0), false);
  assert.equal(validClock(10, 60), false);
  assert.equal(validClock(-1, 0), false);
});

test('não conclui antes de escolher idioma, meta e lembrete', () => {
  const empty = { language: null, dailyGoalMinutes: null, remindersWanted: null, hour: 19, minute: 0 };
  assert.throws(() => makeOnboardingSettings(empty, null));
  assert.throws(() => makeOnboardingSettings({ ...empty, language: 'it' }, null));
  assert.throws(() => makeOnboardingSettings({ ...empty, language: 'it', dailyGoalMinutes: 10 }, null));
  assert.throws(() => makeOnboardingSettings({ ...empty, language: 'it', dailyGoalMinutes: 10, remindersWanted: true, hour: 24 }, null));
});

test('persiste opções, sem misturar com chave de XP, e restaura sem repetir', () => {
  const complete = makeOnboardingSettings({ language: 'it', dailyGoalMinutes: 15, remindersWanted: true, hour: 21, minute: 37 }, 'lunivo-daily');
  assert.deepEqual(parseOnboardingSettings(JSON.parse(JSON.stringify(complete))), complete);
  assert.equal(complete.reminders.enabled, true);
  assert.equal(complete.completed, true);
  assert.match(ONBOARDING_STORAGE_KEY, /^lunivo:onboarding:/);
  assert.equal(parseOnboardingSettings({ ...complete, completed: false }), null);
  assert.equal(parseOnboardingSettings({ ...complete, dailyGoalMinutes: 7 }), null);
  assert.equal(parseOnboardingSettings(null), null);
});

test('recusa de notificações não impede a conclusão', () => {
  const refused = makeOnboardingSettings({ language: 'it', dailyGoalMinutes: 5, remindersWanted: true, hour: 7, minute: 4 }, null);
  assert.equal(refused.completed, true);
  assert.equal(refused.reminders.requested, true);
  assert.equal(refused.reminders.enabled, false);
  assert.deepEqual(parseOnboardingSettings(refused), refused);
  const off = makeOnboardingSettings({ language: 'it', dailyGoalMinutes: 30, remindersWanted: false, hour: 19, minute: 0 }, null);
  assert.equal(off.reminders.hour, null);
  assert.equal(off.reminders.enabled, false);
});

test('rotas protegidas até onboarding completo e gravação antes da liberação', () => {
  assert.match(layout, /Stack\.Protected guard=\{!completed\}/);
  assert.match(layout, /Stack\.Protected guard=\{completed\}/);
  assert.match(layout, /name="lesson\/\[lessonId\]"/);
  assert.match(layout, /name="onboarding"/);
  assert.match(provider, /await Storage\.setItem\(ONBOARDING_STORAGE_KEY/);
  assert.match(provider, /setSettings\(next\)/);
  assert.match(screen, /Começar meu curso/);
  assert.match(screen, /Evolua todos os dias, e em breve, estará mais próximo do objetivo\./);
  assert.match(screen, /Em construção/);
});

test('lembretes locais diários e configurações nativas', () => {
  assert.match(pkg.dependencies['expo-notifications'], /^~57\./);
  assert.ok(app.plugins.includes('expo-notifications'));
  assert.match(notificationCode, /SchedulableTriggerInputTypes\.DAILY/);
  assert.match(notificationCode, /getPermissionsAsync/);
  assert.match(notificationCode, /requestPermissionsAsync/);
  assert.match(notificationCode, /scheduleNotificationAsync/);
  assert.match(notificationCode, /setNotificationChannelAsync/);
  assert.match(notificationCode, /cancelScheduledNotificationAsync/);
  assert.equal(app.icon, './assets/icon.png');
  assert.equal(app.android.adaptiveIcon.foregroundImage, './assets/adaptive-icon.png');
  const splash = app.plugins.find(p => Array.isArray(p) && p[0] === 'expo-splash-screen')[1];
  assert.equal(splash.image, './assets/lunivo-logo-splash.png');
  assert.ok(splash.imageWidth <= 205);
});
