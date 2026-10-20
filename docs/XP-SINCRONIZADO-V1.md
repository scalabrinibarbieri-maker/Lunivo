# Lunivo — sincronizacao de XP (v1)

## Ordem obrigatoria no GitHub Actions

1. Envie o pacote-lunivo-xp-conta-v1.zip pela raiz do repositorio. Acompanhe **Aplicar pacote Lunivo** e os testes **Lunivo - Backend Cloudflare**.
2. Antes de publicar o Worker, em **Lunivo - Backend Cloudflare** use `Run workflow` com **operacao = migrate**. Isso aplica `backend/migrations/0002_xp_sync.sql` ao D1 de testes.
3. Depois execute **operacao = deploy** para publicar os novos endpoints.
4. So entao instale por cima o APK da nova compilacao, SEM desinstalar o aplicativo antigo, para conservar os dados historicos locais.
5. Abra o app com a conta correta e pressione Sincronizar agora; verifique XP no perfil e teste entrar em outro aparelho.

## Protecoes

- UID exclusivamente do token Firebase verificado; sem campos de usuario enviados pelo cliente.
- Premio por licao idempotente (`PRIMARY KEY(user_id, lesson_id)`), XP limitado por licao e historico importado uma unica vez.
- Recompensas pendentes sao salvas no celular e sincronizadas quando ha internet. Somente apos confirmacao sao removidas da fila local.
- XP antigo e resgatado do aparelho que o possui; nao desinstale nem limpe os dados antes da primeira sincronizacao.
- ***Nao usar o XP como base de competicoes ou recompensas monetarias ainda.*** A declaracao de licoes e pontuacoes vem de um cliente modificavel; a regra de pontos precisa de validacao de respostas no servidor para ser antifraude.
- A migracao antiga nao consegue reconstruir XP de dispositivos que ja foram apagados quando esses pontos nunca foram enviados para a nuvem.

## Endpoints

GET `/v1/progress`: `{ completedLessonIds, totalXp, legacyXpImported }`.
POST `/v1/progress/sync`: compativel com clientes antigos; registra licoes concluidas.
POST `/v1/progress/legacy-xp`: `{totalXp}` — resgate inicial uma unica vez, max. 300 XP por licao concluida no D1.
POST `/v1/progress/awards`: `{awards:[{lessonId,xp}]}` — pontos por licao ja concluida; idempotente.

## Limitacoes da v1

O total XP e associado a conta. O campo `lastStudiedAt` permanece local. Os limites e verificacoes de respostas devem evoluir antes de rankings competitivos.
