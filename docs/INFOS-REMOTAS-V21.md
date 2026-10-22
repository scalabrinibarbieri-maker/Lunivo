# Lunivo V21 — Infos online em lições embutidas

Esta é uma atualização estrutural única. Preserva as lições locais e suas perguntas; somente novos cartões `info` podem ser inseridos mediante conteúdo remoto validado. Não altera XP, respostas, desbloqueios ou streak.

## Fluxo de publicação

1. Enviar `pacote-lunivo-infos-remotas-ciao-v21-unificado.zip` para a raiz da branch `main`. O workflow **Aplicar pacote Lunivo** executará npm/typecheck/testes, e o build Android será acionado como de costume.
2. No GitHub Actions, abrir **Lunivo - Backend Cloudflare**, clicar **Run workflow**, selecionar `main` e operação **deploy**. Isto é necessário se a variável `LUNIVO_CF_AUTO_DEPLOY` não estiver definida como `true`. Não é necessária nenhuma migração D1.
3. Enviar `curso-lunivo-info-acqua-v1.zip` para a raiz da `main` (não misturar dentro do pacote de código). O workflow existente **Lunivo - Publicar cursos R2** valida e publica `bundled-info.json` e o PNG em R2. **Esta etapa não recompila o APK.**
4. Ao abrir a lição 1 com internet, o app baixa o documento de infos diretamente do Worker e exibe a tela antes de `q01`. Offline, a solicitação falha e o app exibe a lição embutida normalmente, sem a nova info.

## Formato para futuros conteúdos sem recompilar

Use outro `curso-lunivo-*.zip` com:

- `bundled-info.json`, um documento `version: 1`, `revision: N`, `lessonId` entre `it-a1-01` / `it-a1-02` / `it-a1-03` e `entries`: no máximo 12 entradas com `beforeExerciseId` e `exercise` do tipo `info`.
- Opcionalmente, arquivos `assets/<nome-unico>.png`. A URL da imagem deve ser exatamente `https://lunivo-api-dev.scalabrinibarbieri.workers.dev/v1/courses/bundled/assets/<nome-unico>.png`.

**Publicações posteriores substituem o documento completo de infos da lição.** Para adicionar outra info, mantenha todas as entradas desejadas, adicione a nova entrada e incremente `revision`. Nunca substitua os IDs das questões embutidas. Nomes de imagens já publicados são imutáveis; imagens atualizadas exigem novo nome. O app não salva esses suplementos em cache local, por serem estritamente online.

### Verificação

Abrir com internet e checar o cartão “Bevi acqua?”. Desligar Wi-Fi/dados e reabrir a lição (nova entrada) para verificar que ele não aparece. Os exercícios originais devem continuar disponíveis.

## Correção incorporada — ilustração do Ciao

O cartão inicial de Ciao não usa mais um URI data/base64 (que causava a mensagem "Imagem não disponível"). A imagem real `assets/lessons/ciao-greeting.png` é incluída no APK e acessada por `require()` nativo através de `localInfoImageSource`. Isso funciona inclusive sem conexão e não afeta a política dos novos cartões extras, que continuam **online-only**.

A imagem de Acqua permanece como um arquivo PNG individual publicado no R2 pelo pacote `curso-lunivo-info-acqua-v1.zip`. Não é necessário mudar esse pacote de conteúdo. Não envie o ZIP antigo da V21: ele falhou no typecheck. Este pacote inclui a mesma correção de tipagem e as imagens nativas.
