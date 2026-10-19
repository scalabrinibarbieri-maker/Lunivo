# Correção da primeira instalação

Em 19/10/2026, a execução do GitHub Actions falhou com `ERESOLVE` ao instalar as dependências.

## Causa

O projeto declarava React 19.2.3, mas não declarava `react-dom`. Como dependência peer opcional, o npm selecionou automaticamente `react-dom@19.3.1`, que exige React ^19.3.1, gerando incompatibilidade.

## Alterações

- Adiciona `react-dom@19.2.3` explícito em package.json. A dependência DOM não converte o aplicativo em WebView; o código continua React Native para Android/iOS.
- Atualiza React Native de 0.86.2 para 0.86.3, versão de manutenção compatível com Expo SDK 57.
- Ajusta importação de tipo em `ActionButton.tsx` e tipagem de largura em `ProgressBar.tsx` para evitar erros de TypeScript.
- Entrega novamente o projeto completo, pois o fluxo anterior não chegou ao commit.

## Como retentar

1. No GitHub, na raiz da branch main, exclua o arquivo antigo `pacote-lunivo-v1.zip` cujo workflow falhou.
2. Faça upload de `pacote-lunivo-v1-corrigido.zip` na raiz e confirme o commit.
3. Abra Actions > Aplicar pacote Lunivo e confira a execução.
4. O workflow deve instalar as dependências, executar `npm run typecheck`, rodar `npm test`, fazer commit e excluir o novo ZIP.

**Atenção**: a instalação do npm e a compilação Android/iOS ainda precisam ser confirmadas pelo GitHub/EAS.
