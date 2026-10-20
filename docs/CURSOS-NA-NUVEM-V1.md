# Lunivo: unidades remotas e offline opcional (fundacao V1)

## Estado desta entrega

- `it-a1-01`, `it-a1-02`, `it-a1-03` continuam no APK. O comportamento dos audios `Ciao`, `Buongiorno`, `Grazie` nao muda.
- A tela `/courses` mostra apenas unidades que existam no catalogo R2. Catalogo ainda vazio = mensagem de futuras unidades.
- O usuario pode abrir uma unidade online, baixar o pacote de conteudo e os audios disponiveis, ou remover o download. O progresso permanece mesmo depois da exclusao.
- Novas unidades utilizam os tipos de exercicio ja implementados. Nao se permite Javascript executavel no pacote.
- O servidor reconhece IDs remotos publicados em `courses/v1/catalog.json` durante a sincronizacao de conclusoes com o D1. XP continua local, ate a etapa separada de pontuacao segura no servidor.
- Ainda NAO e uma plataforma de monetizacao: unidades servidas pelo Worker sao publicas e a interface ainda nao tem filtros de idioma/nivel completos. Esses recursos devem ser adicionados antes do lancamento.

## Contrato do catalogo

`R2: courses/v1/catalog.json`

```json
{"version":1,"units":[{"id":"it-a1-u02","language":"it","level":"A1","order":2,"revision":1,"title":"Apresentações","subtitle":"Conheça alguém e diga seu nome","lessons":[{"id":"it-a1-04","title":"Meu nome","subtitle":"Se apresentando","exerciseCount":3}]}]}
```

`R2: courses/v1/units/it-a1-u02-r1.json`

```json
{"version":1,"unitId":"it-a1-u02","revision":1,"lessons":[{"id":"it-a1-04","title":"Meu nome","subtitle":"Se apresentando","unit":2,"exercises":[{"type":"choice","id":"q19","instruction":"Escolha a tradução","prompt":"Mi chiamo Luca","options":[{"id":"a","label":"Meu nome é Luca"},{"id":"b","label":"Obrigado, Luca"}],"correctOptionId":"a","explanation":"Mi chiamo é uma apresentação informal."},{"type":"write","id":"q20","instruction":"Escreva em italiano","prompt":"Meu nome é Luca","acceptedAnswers":["Mi chiamo Luca"],"sampleAnswer":"Mi chiamo Luca","explanation":"Mi chiamo significa me chamo."},{"type":"choice","id":"q21","instruction":"Escolha a tradução","prompt":"Piacere","options":[{"id":"a","label":"Prazer"},{"id":"b","label":"Até amanhã"}],"correctOptionId":"a","explanation":"Piacere é usado em apresentações."}]}]}
```

O catalogo e os pacotes sao validados em runtime. Limites V1: ate 100 unidades, 20 licoes por unidade, 30 exercicios por licao, arquivo de unidade ate 512 KiB.

## Distribuicao

Worker GET `/v1/courses/catalog` e GET `/v1/courses/unit/{unitId}/{revision}`; ambos leem do bucket privado `lunivo-audios` existente, sem outro token ou bucket. Arquivos publicados em `courses/` sao imutaveis por revisao. Primeiro envie o arquivo da unidade, depois o catalogo.

O primeiro ZIP desta entrega nao contem novos cursos: ele instala a infraestrutura. Publicacao automatica do conteudo remoto e o primeiro lote revisado serao a etapa seguinte, apos a compilacao e a verificacao do endpoint.

## Controle offline

Os pacotes baixados ficam em `Paths.document` (nao so em memoria). Audios necessarios a exercicios de escuta sao baixados antes de se indicar que a unidade esta pronta offline. Remover um pacote nao apaga o progresso nem necessariamente os audios compartilhados que estao no cache de audio.
