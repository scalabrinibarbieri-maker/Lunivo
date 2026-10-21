import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('../src/app/onboarding.tsx', import.meta.url), 'utf8');
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('boas-vindas V8 usa exatamente os novos textos', () => {
  assert.match(source, /O melhor aplicativo para o seu aprendizado\./);
  assert.match(source, /Temos cursos disponíveis para você/);
  assert.doesNotMatch(source, /O mundo se abre a quem aprende/);
  assert.doesNotMatch(source, /Um idioma de cada vez\. Uma conquista todos os dias/);
  assert.match(source, /Evolua todos os dias, e em breve, estará mais próximo do objetivo\./);
});

test('o cartão usa emblema vetorial nativo, não o símbolo preenchido antigo', () => {
  assert.match(source, /quoteEmblemDiamond/);
  assert.match(source, /quoteEmblemCore/);
  assert.match(source, /quoteRayTop/);
  assert.doesNotMatch(source, /quoteMark/);
  assert.match(source, /welcomeHeadline/);
});

test('mantém os cinco passos e não adiciona dependências', () => {
  for (const step of ['Boas-vindas', 'Idioma', 'Meta diária', 'Lembretes', 'Confirmação']) {
    assert.ok(source.includes(step), `Etapa ${step} não encontrada`);
  }
  assert.match(source, /useOnboarding/);
  assert.match(source, /Começar meu curso/);
  assert.ok(packageJson.dependencies['expo-notifications']);
});
