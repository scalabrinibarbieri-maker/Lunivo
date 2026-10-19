# Arquitetura — Lunivo (fundação)

- **Aplicativo:** React Native 0.86 + Expo SDK 57, TypeScript, Expo Router. Não utiliza WebView nem HTML de interface.
- **Conteúdo:** `src/features/learning/data.ts` contém lições de demonstração tipadas, independentes das telas.
- **Motor:** `src/features/learning/engine.ts` corrige respostas; não depende de React Native e possui testes automatizados.
- **Progresso:** lógica pura em `src/features/progress/logic.ts`; persistência SQLite local em `ProgressProvider.tsx`.
- **Navegação:** `src/app/` contém apenas rotas e sua interface nativa.
- **Construção:** `eas.json` contém APK interno para Android e perfil de produção para lojas.

## Evolução planejada (não implementada nesta V1)

1. Supabase: autenticação, políticas RLS, migrações versionadas e sincronização offline-first.
2. RevenueCat: assinaturas com validação do estado de direitos no servidor.
3. AdMob: anúncios consentidos e limites de frequência; nunca misturar lógica comercial com o motor de estudo.
4. Backoffice/CMS: criar, revisar e publicar módulos do curso, com versionamento pedagógico.
5. Analítica, privacidade, acessibilidade, observabilidade, testes nativos automatizados.

## Decisões de engenharia

- Nunca usar `service_role` no aplicativo.
- Nunca confiar em XP ou assinatura enviados pelo cliente quando houver backend.
- Não publicar IDs de pacote provisórios sem validação da marca.
- Somente adicionar credenciais por variáveis de ambiente ou provedores secretos.
- Uma lição completada conta XP uma só vez; repetição permanece disponível.
