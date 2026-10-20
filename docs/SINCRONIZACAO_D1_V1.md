# Lunivo — Sincronizacao de licoes V1

## Como funciona

- Estudo offline continua funcionando para visitante e conta cadastrada.
- Somente a conta Firebase autenticada envia/baixa licoes concluidas; token obtido por `user.getIdToken()` e validado no Cloudflare Worker.
- A API D1 faz sincronizacao **aditiva e idempotente**. Ao entrar em outro aparelho, a conta recebe a uniao das licoes existentes na nuvem e no aparelho.
- Progresso local sempre e gravado primeiro. Falhas de internet nao interrompem as licoes; opcao `Sincronizar agora` e tentativa automatica ao abrir/retomar o aplicativo.
- O progresso de visitante **NAO** e enviado para uma conta automaticamente. O progresso das contas esta separado por UID Firebase.
- Somente os IDs de licoes publicados na versao atual sao sincronizados.
- **XP, ranking, premium e resultados por questao NAO sao sincronizados nem aceitos como provas pelo servidor.** XP continua local e pode diferir entre aparelhos.
- Ainda faltam exclusao de conta/dados, recuperacao/importacao de visitante consentida, escalabilidade para turmas com mais de 25 licoes, estados de erro offline robustos e testes instrumentados. Nao lancar publicamente como produto final.

## Antes de testar

1. No GitHub, executar workflow `Lunivo - Backend Cloudflare` com `operacao=deploy` para publicar `FIREBASE_PROJECT_ID=lunivo-25675`. Sem o redeploy, o Worker responde `503 AUTH_NAO_CONFIGURADA` na sincronizacao autenticada.
2. Enviar o ZIP na raiz do repo e aguardar Aplicar pacote, testes e compilacao Android.
3. Instalar APK por cima do anterior (mesmo pacote e assinatura), entrar com conta de teste e abrir `Meu progresso`.
4. Concluir uma licao e verificar `Progresso salvo na nuvem`. Em outro aparelho, entrar com a mesma conta e conferir a licao concluida. Testar modo aviao e `Sincronizar agora` apos reconectar.

## Seguranca

- Credenciais Cloudflare nao ficam no aplicativo.
- Banco D1 separa linhas por UID verificado no servidor, nunca enviado pelo cliente.
- Credenciais Firebase do aplicativo sao identificadores publicos; nao adicionar tokens secretos, Service Accounts, JWT ou senhas ao GitHub.
- O endpoint de progresso e autodeclarado: nao serve para classificacao/XP competitivo.
