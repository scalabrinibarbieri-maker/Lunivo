# Lunivo: áudios remotos no Cloudflare R2

## Modelo

- `Ciao!` (q01) e `Buongiorno` (q02) são assets embutidos e mantêm a reprodução offline.
- Para q03 em diante, as correspondências entre exercício/arquivo são lidas do R2: `manifest-v1.json` na raiz do bucket privado `lunivo-audios`.
- A API pública do Worker fornece `GET /v1/audio/manifest` e `GET /v1/audio/file/<storageKey>` via binding privado `AUDIO_BUCKET`.
- O app baixa cada MP3 na primeira necessidade e grava no diretório persistente do aparelho (`Paths.document`). Depois, funciona offline para aquele áudio. O manifesto também fica salvo localmente.
- Nada de cartão de crédito para síntese: as gravações podem ser enviadas pelo autor.

## Como publicar novos MP3s (sem gerar APK)

Para a frase `Grazie` da pergunta `q03`, por exemplo:

1. Produza o MP3 e envie como objeto R2 `it-IT/a1/it-a1-grazie-v1.mp3` (a chave precisa terminar com o ID).
2. Verifique o tamanho exato do MP3 em bytes.
3. Atualize e envie `manifest-v1.json` na RAIZ do bucket, mantendo todas as entradas anteriores. Exemplo:

```json
{
  "version": 1,
  "clips": [
    {
      "id": "it-a1-grazie-v1",
      "exerciseId": "q03",
      "text": "Grazie",
      "locale": "it-IT",
      "storageKey": "it-IT/a1/it-a1-grazie-v1.mp3",
      "sizeBytes": 11377
    }
  ]
}
```

`11377` é só exemplo, NÃO é o tamanho real. Use o tamanho exato do arquivo recebido.

4. Publique sempre o MP3 antes do manifesto: assim nenhum cliente recebe referência para arquivo ausente.
5. Não reutilize um ID para um MP3 diferente. Substituições devem usar ID `-v2`, mantendo o conteúdo já baixado corretamente versionado.

## Teste de integração

- `GET https://lunivo-api-dev.scalabrinibarbieri.workers.dev/v1/audio/manifest` deve responder `{"version":1,"clips":[]}` enquanto o catálogo ainda não foi enviado, ou o JSON publicado.
- Após upload, `GET .../v1/audio/file/it-IT/a1/it-a1-grazie-v1.mp3` deve responder `audio/mpeg` (público via Worker, bucket privado).
- Em lição q03, o player prepara a gravação. Abra novamente offline: deve ler do armazenamento persistente.
- Controles de voz normal e 0,8× continuam.

## Limites e observações

- Limite de 2 MiB por MP3, 64 KiB para o manifesto e até 300 entradas por versão do catálogo.
- O Worker entrega áudios sem autenticação Firebase, apropriado para recursos públicos educacionais. No futuro, conteúdo Premium deve exigir autorização diferente.
- O catálogo só associa áudios a exercícios **já presentes** no aplicativo. A criação de novas lições ainda necessita distribuição de conteúdo próprio, separada do sistema de áudio.
- O cache é persistente e cresce conforme os arquivos são baixados. Implementar futuramente uma tela de gestão de downloads e limite de armazenamento.
- Não enviar tokens R2 para o APK nem habilitar acesso público direto ao bucket.
