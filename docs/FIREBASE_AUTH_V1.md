# Lunivo - Firebase Authentication (fase 1)

## O que entrou
- SDK Firebase JavaScript >=12 para React Native/Expo (nao usa WebView ou Analytics Web).
- E-mail/senha, criacao de conta, sessao persistente, recuperacao de senha, reenvio de verificacao, logout.
- Persistencia via expo-sqlite/kv-store ja incluido no projeto.
- Progresso local legado preservado em `lunivo:progress:v1` para visitantes.
- Progresso separado por UID ao autenticar, sem mesclar automaticamente dados de pessoas diferentes.
- Backend Worker recebe somente o ID publico `FIREBASE_PROJECT_ID = lunivo-25675`.

## O que ainda NAO entrou
- Sincronizacao D1 e transferencia do progresso de visitante para uma conta: proxima fase, com consentimento explicito.
- Transferencia de XP: XP local nao deve ser considerado pontuacao confiavel para ranking.
- Vincular contas Apple/Google, exclusao de conta, tratamento avancado de tokens revogados e politicas de seguranca: antes do lancamento publico.

## Passos para testar
1. Enviar o ZIP `pacote-lunivo-firebase-auth-v1.zip` na raiz do GitHub, branch main, sem extrair.
2. A automacao `Aplicar pacote Lunivo` regenera o package-lock.json, instala, executa testes e salva o codigo.
3. A automacao Android builda um novo APK. Instalar sobre o anterior e verificar criar conta, login, reset e logout.
4. O backend valida a alteracao, mas nao faz deploy automatico, a menos que LUNIVO_CF_AUTO_DEPLOY esteja ativada.
5. Apos validacao, executar `Lunivo - Backend Cloudflare` -> `Run workflow` -> `operacao: deploy`, e testar /health.
6. Testar erro de senha incorreta e retomada da sessao apos fechar/reabrir o app.

## Seguranca
O `firebaseConfig` e publico, conforme o SDK do Firebase. Nao inserir conta de servico ou credenciais no repositorio.
`expo-sqlite/kv-store` guarda sessao persistente no armazenamento local do app; esse KV nao e cifrado em repouso. Revisar modelo de seguranca, exclusao de dados e protecao contra abuso antes de producao.
A verificacao de e-mail e enviada mas a interface ainda nao bloqueia o acesso de usuarios nao verificados.
