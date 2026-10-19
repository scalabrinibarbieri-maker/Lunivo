# Lunivo API — Workers + D1 (fundação v1)

> **Ainda não está em produção.** Este pacote não muda as telas do aplicativo nem cria contas nos serviços externos. É a fundação do servidor para autenticação e sincronização futura.

## Arquitetura

- O React Native/Expo continua nativo. Lições, áudios baixados e exercícios rodam offline usando SQLite no aparelho.
- O Cloudflare Worker expõe uma API mínima. O D1 guarda apenas UID do Firebase e lista de lições concluídas.
- Firebase Authentication cuidará do login. O Worker valida assinatura RS256, emissor, público e tempo do ID token; nunca confia em `userId` enviado pelo cliente.
- **Não aceita XP, ranking, Premium, pagamentos ou vidas enviados pelo aparelho.** A sincronização de lições v1 é autodeclarada e portanto NÃO serve como prova contra fraude; o sistema de rankings precisará de validação específica no servidor.
- Sem chaves no aplicativo nem no GitHub. Futuramente as configurações de produção ficarão em segredos/variáveis controladas.

## Endpoints planejados e implementados

| Método | Caminho | Requer login | Comportamento |
| --- | --- | --- | --- |
| GET | `/health` | Não | Resposta básica sem verificar o banco |
| GET | `/v1/me` | Sim | Cria o registro mínimo do UID (se necessário) e devolve o UID |
| GET | `/v1/progress` | Sim | Lista IDs de lições concluídas vinculadas ao UID do token |
| POST | `/v1/progress/sync` | Sim | Aceita somente `{ "completedLessonIds": ["it-a1-01"] }`, valida IDs e grava idempotentemente |

Não há endpoint para alterar o XP ou o status Premium.

## Próximos passos, sem terminal no celular

1. Criar uma conta Cloudflare e um banco D1 **de testes**, não produção. Confirmar o `database_id` no painel.
2. Criar um projeto Firebase e ativar apenas os provedores de login que serão utilizados.
3. Ajustar `wrangler.example.jsonc` com os dados reais, salvando-o como `wrangler.jsonc`. Nunca publicar senhas/chaves. `FIREBASE_PROJECT_ID` é apenas um identificador público do projeto, não um segredo.
4. Configurar GitHub Actions para testar e implantar **somente mediante aprovação**, com variáveis de Cloudflare protegidas. A implantação real será separada do instalador de ZIPs. Sem conta Cloudflare/Firebase o servidor não funcionará, mas o aplicativo existente continua intacto.
5. Executar a migration D1 em testes e fazer testes ponta-a-ponta da autenticação e da sincronização; criar backup e política de exclusão de conta antes do lançamento.

## Desenvolvimento em ambiente próprio (não necessário neste momento)

Dentro de `backend/`: `npm install`, `npm test`, `npm run typecheck` e, com `wrangler.jsonc` válido, `npm run db:local` e `npm run dev`.

**Atenção:** a migration em produção só deve ser aplicada depois do teste de recuperação e revisão do schema. Cloudflare D1 não substitui uma estratégia de backup e exportação.

## Proteção de dados

A sincronização de progresso é intencionalmente aditiva. Para permitir apagar/resetar progresso ou apagar a conta integralmente, será necessário implementar endpoints autenticados e um fluxo de exclusão que abrange Firebase e D1. Não lançar com contas reais sem concluir isso, as políticas de privacidade e testes de segurança.
