# Lunivo V5 - somente splash nativa

A abertura cinematográfica foi removida. Não existe sobreposição React Native sobre a tela inicial.

A logo original em `assets/lunivo-logo.png` permanece intocada. Durante `npm ci`, o script local `scripts/prepare-splash-logo.cjs` lê os pixels originais, detecta a área visível e gera `assets/lunivo-logo-splash.png` com 16% de margem transparente em ambos os lados e 20% acima/abaixo. Sem ampliação artificial, filtros ou redesenho das letras. A saída é salva no repositório pelo workflow de aplicação dos ZIPs.

O `app.json` utiliza a logo com margens e splash nativa Expo com fundo `#071625` no modo claro e escuro. O `src/app/_layout.tsx` aguarda a primeira renderização e o preparo dos dados locais; não exibe segunda splash.

Importante: a margem corrige problemas de enquadramento no arquivo e na interface, mas não restaura pixels que eventualmente já estejam ausentes dentro da arte original. Se o próprio PNG original tiver o último "o" truncado, será necessário substituir/reparar a arte original; não é seguro inventar a parte ausente automaticamente.

## Testes

O workflow de aplicação de pacote executa `npm ci` (gera a logo automaticamente), `npm run typecheck` e `npm test` antes do commit. Depois, um novo APK será compilado. Para ver a nova splash nativa, instale o APK novo; apenas recarregar o aplicativo não troca recursos nativos.
