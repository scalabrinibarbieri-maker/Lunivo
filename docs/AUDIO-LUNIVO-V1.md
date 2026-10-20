# Lunivo — Pronúncia, primeira entrega

## Instalado agora

- `it-a1-ciao-v1`: gravação **Ciao!** fornecida pelo autor.
- `it-a1-buongiorno-v1`: **Buongiorno** extraído da primeira fala do arquivo enviado (o arquivo original dizia "Buongiorno. Come stai?"). O áudio original não foi alterado.
- Reprodução **expo-audio** com botões **Ouvir** (1×) e **Devagar** (0,8×), repetíveis.
- Funciona **sem internet**: os dois MP3s estão embutidos no instalador, com poucos KB cada.
- Não solicitamos acesso ao microfone nem executamos síntese dentro do telefone.

## Contrato estável para os próximos áudios

1. Registrar uma nova entrada em `src/features/audio/catalog.ts` com ID estável, texto, idioma, perfil de voz e `storageKey` (ex. `it-IT/a1/it-a1-grazie-v1.mp3`). Nunca reutilizar o ID para outra pronúncia; para substituir a gravação usar `-v2`.
2. Associar o ID ao exercício com `EXERCISE_AUDIO` no mesmo arquivo (ou, futuramente, pelo ID direto no conteúdo versionado).
3. Antes do serviço R2 estar ativado, adicionar o arquivo ao `assets/audio/it-IT` e uma referência estática `require(...)` em `sources.ts`. Os exemplos embutidos funcionam offline.
4. Na fase R2, o mesmo ID/storageKey será usado pelo manifesto remoto: o cliente consulta um arquivo baixado de forma persistente, baixa na primeira utilização e oferece download de unidades inteiras. A troca de origem não muda as telas, nem os IDs das gravações.
5. Manter cada voz/pessoa consistente dentro de diálogos. Arquivos devem ser de voz clara, sem música, preferencialmente MP3 mono e com silêncio inicial/final curto. Conferir termos de uso comercial da origem.

**R2 ainda não foi configurado** e não há URL remota falsa. Os dois primeiros áudios são o *seed* offline oficial. Para os próximos, configurar o R2 e o resolvedor de cache persistente sem empacotar cada nova gravação no APK. Não colocar chaves R2 no app.

## Escopo

As lições q01 e q02 da unidade 1 têm reprodução. Outras atividades aguardam arquivos de áudio. Não alteramos progresso, login, sync D1 ou backend.

## Validação

- ZIP é instalado pelo fluxo `pacote-*.zip` no GitHub.
- Installer remove `package-lock.json`, regenera lockfile, instala `expo-audio` compatível com SDK 57 e executa testes e `tsc`.
- A compilação Android assinada será iniciada somente se o instalador validar.
- Testar os dois botões, as velocidades e a reprodução offline no celular.
