# Backend do Lunivo — Cloudflare Workers, D1 e R2

Ambiente de desenvolvimento (`lunivo-api-dev`); não é ainda uma infraestrutura de produção pronta para receber alunos pagantes.

## Responsabilidades implementadas

- **Firebase Authentication:** valida tokens de usuário no Worker (`src/auth.ts`).
- **Progresso:** lições concluídas, XP por lição e dias de estudo em Cloudflare D1 (`src/index.ts`, `src/xp.ts`, `src/streak.ts`). A sincronização de conclusões ainda usa alegações do cliente: não serve como base para rankings/benefícios de valor.
- **Cursos:** catálogo, unidades remotas e infos complementares (incluindo lições embutidas) servidos por Worker a partir de objetos privados no R2 (`src/courses.ts`).
- **Pronúncia:** manifesto e MP3 no bucket R2 privado, acessados pelos endpoints do Worker (`src/audio.ts`).
- **Publicadores:** scripts Python que validam ZIPs de áudio e cursos, verificam revisões e protegem IDs.

## Operação via GitHub Actions

- `Lunivo - Backend Cloudflare`: executa testes e typecheck. O deploy automático do **Worker de desenvolvimento** depende de `LUNIVO_CF_AUTO_DEPLOY=true`; também é possível operação `deploy` manual.
- Operação `migrate`: aplica migrations D1 manualmente. Não aplicar alterações retrospectivas aos arquivos SQL já executados; sempre criar uma nova migração para mudar o schema.
- `Lunivo - Publicar audios R2` e `Lunivo - Publicar cursos R2`: publicam os arquivos em push de ZIPs específicos na branch `main`. Execuções manuais fazem teste de conexão, não publicam o conteúdo.

## Limites e segurança

- O histórico de vocabulário forte/médio/fraco **ainda é local no aparelho**; a nuvem armazena lições, XP e streak, não os registros individuais de revisão.
- Não existem verificações antifraude de respostas em produção, contratos de pagamentos nem políticas de retenção/exclusão prontas para lançamento público.
- IDs de usuários vêm de tokens Firebase verificados; não enviar senhas, service accounts ou tokens privados ao repositório.
- O Worker em `wrangler.jsonc` usa o banco de testes `lunivo-dev` e binding R2 `AUDIO_BUCKET` (o mesmo bucket guarda outros conteúdos separados por prefixo).

O README da raiz é a referência principal de arquitetura e estado do produto.
