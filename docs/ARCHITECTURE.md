# Arquitetura atual do Lunivo

**Aplicativo:** Expo SDK 57 + React Native + TypeScript, navegação Expo Router e componentes nativos. Uma base de código Android/iOS. Build Android no GitHub Actions; pipeline de build iOS ainda não configurado.

## Domínios

- `src/app/`: telas e rotas protegidas por onboarding e autenticação.
- `src/features/learning/`: tipos de questões, correção e fonte do conteúdo embutido das três lições iniciais. O mapa `BUNDLED_VOCABULARY` fica no mesmo arquivo `data.ts` para evitar cópias de curadoria em módulos independentes.
- `src/features/vocabulary/`: revisão espaçada e estados forte/médio/fraco com persistência local. O mecanismo não define cópia própria das palavras das primeiras lições.
- `src/features/courses/`: validação de catálogo, download, cache de imagens e suplementos informativos online.
- `src/features/audio/`: áudio local + catálogo MP3 remoto R2, cache persistido e controles de reprodução.
- `src/features/progress/`: progresso local por UID Firebase, sincronização de conclusão, XP e streak com Worker/D1.
- `src/features/auth/`: Firebase Auth; `src/features/onboarding/`: preferências e lembretes.
- `backend/src/`: Worker com autenticação JWT, D1 e distribuição dos objetos R2.
- `backend/scripts/`: publicadores de ZIP com validações independentes do app.

## Contratos a preservar

Os IDs `it-a1-01` a `it-a1-03`, `q01` a `q18`, chaves de armazenamento e estrutura das migrations existentes não podem mudar sem migração e testes. O exercício local `q12` (Acqua) foi corrigido na V27; explicações informativas online não substituem a correção original da questão.

## Dívidas identificadas pela auditoria

- Cliente e publicador Python verificam regras correspondentes em linguagens diferentes. Unificar testes de paridade/fixtures antes de mudar contrato de conteúdo remoto.
- Limites de XP de lições locais ainda são registrados separadamente no backend; ajustar com sincronização explícita quando essas lições forem ampliadas.
- Reorganizar telas e providers grandes gradualmente, sem mudar a navegação ou os dados.
- Revisão de conteúdo pedagógico por falante competente e testes instrumentados em Android e iOS ainda necessários.

Arquivos `docs/*-Vxx.md` são registros de decisões de versões anteriores; podem não descrever o estado atual. Consulte `README.md` antes de seguir instruções operacionais.
