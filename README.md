# Lunivo — aplicativo nativo de aprendizado de idiomas

Lunivo é um aplicativo em desenvolvimento de italiano A1, feito em **React Native, Expo SDK 57 e TypeScript** para Android e iOS. A interface usa componentes nativos; não utiliza WebView como tela principal. O curso de inglês continua em construção.

## Estado real do projeto (outubro de 2026)

- **Android:** APK/AAB de testes gerados pelo GitHub Actions; existem compilações assinadas e verificadas. Versão de produção ainda não lançada.
- **iOS:** código compartilhado e identificador iOS configurado. Ainda não existe pipeline de build iOS nem testes concluídos em iPhone; compatibilidade final não está comprovada.
- **Conteúdo:** três lições iniciais incorporadas ao aplicativo (`src/features/learning/data.ts`) e unidades seguintes distribuídas por Cloudflare R2. Infos suplementares remotas são online-only.
- **Pronúncia:** gravações iniciais embutidas e MP3s publicados no R2. Cache de áudio e opção de baixar unidades remotas para uso offline; suplementos de infos online não são incorporados ao download.
- **Identidade e progresso:** Firebase Authentication; Cloudflare Workers e D1 para lições concluídas, XP e dias de estudo. Histórico de vocabulário forte/médio/fraco ainda fica **local no aparelho**, mas a revisão geral pode recuperar termos pelas lições concluídas sincronizadas.
- **Aprendizado:** correção ortográfica conservadora, exercícios com áudio, associação de palavras, banco de letras, XP, streak, revisões e infos culturais.
- **Pendências para lançamento:** validação pedagógica, avaliações funcionais Android/iOS, infraestrutura de produção, privacidade, exclusão de conta, pagamentos, testes e monitoramento.

## Estrutura

| Diretório | Responsabilidade |
|---|---|
| `src/app/` | Rotas e telas Expo Router |
| `src/components/` | Componentes de apresentação |
| `src/features/learning/` | Questões incorporadas e avaliação |
| `src/features/vocabulary/` | Retenção e revisão de palavras |
| `src/features/audio/` | Pronúncias, catálogo e cache |
| `src/features/courses/` | Catálogo e downloads remotos |
| `src/features/progress/` | Histórico local, XP, streak e sincronização |
| `backend/src/` | Worker e API Cloudflare |
| `backend/scripts/` | Publicação de conteúdos e áudios R2 |
| `backend/migrations/` | Migrations versionadas D1 — NÃO apagar ou editar as já aplicadas |
| `.github/workflows/` | Compilação Android e publicação por ZIP |

## Publicação pelo celular

- Atualizações de **código**: envie um `pacote-*.zip` à raiz da branch `main`. O workflow **Aplicar pacote Lunivo** aplica apenas arquivos aprovados, verifica os testes e gera um commit. O workflow Android cria APK/AAB quando necessário.
- Atualizações de **áudio**: envie `audio-lunivo-*.zip`; o workflow **Lunivo - Publicar audios R2** valida e publica a gravação, sem novo APK.
- Atualizações de **curso/info**: envie `curso-lunivo-*.zip`; o workflow **Lunivo - Publicar cursos R2** valida e publica o conteúdo no R2. Se alterações de API exigirem deploy do Worker, siga o workflow de backend.
- No workflow **Lunivo - Backend Cloudflare**, o deploy automático do Worker de desenvolvimento depende da variável Actions `LUNIVO_CF_AUTO_DEPLOY=true`. Migrações D1 são manuais.
- O modo manual dos workflows de publicação de áudio/cursos apenas testa as credenciais: para publicar um arquivo, faça upload do ZIP na branch `main`.

## Regras de manutenção

1. Não modificar IDs de lição/questão, nomes de chaves de progresso ou registros antigos sem migração explícita.
2. Corrigir informações incorretas **na fonte**, em vez de depender de uma sobreposição remota.
3. Para as três lições embutidas, o conteúdo e a curadoria do vocabulário ficam juntos em `src/features/learning/data.ts`; o motor de retenção consulta essa curadoria.
4. Testes de regressão protegem compatibilidade; não apagar apenas porque têm nomes de versões antigas.
5. O repositório contém documentação histórica por versão. Este README descreve o estado atual e substitui as afirmações de V1 como referência principal.

Para rodar em ambiente com Node e dependências instaladas: `npm ci`, `npm run typecheck` e `npm test`. Para o backend, execute `npm --prefix backend run typecheck` e `npm --prefix backend test` após instalar dependências do backend.
