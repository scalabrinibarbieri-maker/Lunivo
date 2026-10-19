# Lunivo — Fundação nativa V1

**Projeto real em React Native + Expo + TypeScript** para Android e iOS. Interface composta por `View`, `Text`, `Pressable`, `TextInput` e outras primitivas nativas. **Não é HTML nem WebView.** O nome e os ícones são provisórios.

## O que já foi implementado no código (ainda sem build nativa validada)

- Tela inicial, 3 lições de italiano A1, 14 exercícios (alternativas e resposta escrita).
- Correção, explicações, placar e tela de conclusão.
- Pontuação sem duplicar XP quando o aluno repete uma lição.
- Progresso armazenado no aparelho via SQLite e desbloqueio sequencial.
- Navegação compatível com Android e iOS.
- Testes de lógica com Node.js.

## Como executar em um ambiente Node.js (22.13+)

```bash
npm install
npm run typecheck
npm test
npx expo start
```

Para compilar com a nuvem Expo, conecte sua conta Expo/EAS e execute:

```bash
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --platform android --profile preview
```

O perfil `preview` gera **APK Android** para teste; `production` produz pacote Android para publicação. Para iOS, EAS também fornece build na nuvem, mas publicação e testes em aparelhos físicos exigem a configuração/certificados da Apple.

### Sem computador

O projeto pode ser guardado no GitHub usando o navegador do Android. Para disparar builds sem terminal local, será necessário configurar um ambiente de execução na nuvem (GitHub Actions ou outro ambiente) ligado a uma conta Expo. O ZIP **não é um APK** e não roda sozinho ao ser tocado no Android.

## Importante

Esta versão é uma **fundação de desenvolvimento**, não um produto pronto para lojas. Ainda não há login, nuvem, pagamentos, anúncios, backup, análises, consentimento nem conteúdo pedagógico completo. Não afirmar que esses recursos estão implementados.

Como o ambiente desta entrega não teve acesso ao registro npm, a compilação Expo/React Native ainda não foi executada. Os testes de lógica foram executados separadamente. Ao instalar as dependências em um ambiente com internet, gere e comite `package-lock.json` usando `npm install`, rode `npm run typecheck`, `npm test` e `npx expo-doctor`; só depois faça a build EAS.

Documentação: `docs/ARCHITECTURE.md` e `docs/ROADMAP.md`.
