# Lunivo — Atualizações pelo celular (GitHub Actions)

## Primeira instalação (uma única vez)

1. Abra o repositório `scalabrinibarbieri-maker/Lunivo`, na branch `main`. Recomenda-se torná-lo privado antes de armazenar qualquer informação interna.
2. Adicione `.github/workflows/aplicar-pacote.yml` ao repositório. **Esse arquivo deve ser enviado separadamente, e não dentro de um pacote-*.zip.**
3. Depois de salvar o workflow na branch `main`, envie o ZIP `pacote-lunivo-v1.zip` para a raiz da branch. Ele aplicará o projeto e rodará os testes.
4. Se existir só README + workflow, o primeiro `pacote-lunivo-v1.zip` instala os arquivos restantes.

## Atualizações posteriores (celular)

1. Receba o ZIP com nome `pacote-<versao>.zip` (ex.: `pacote-v2.zip`).
2. Em `github.com` no navegador: abra o repositório, clique em **Add file → Upload files**.
3. Faça upload do ZIP na **raiz**, escolhendo a branch `main`, e confirme o commit.
4. Abra **Actions → Aplicar pacote Lunivo** para ver o resultado. Ao concluir com sucesso, o ZIP desaparece e os arquivos estão atualizados.

## Como o ZIP deve ser montado

- Coloque os arquivos dentro do ZIP com **caminhos da raiz** (ex.: `src/features/learning/data.ts`, não dentro de uma pasta externa).
- Arquivo existente → substituído. Arquivo novo → criado. Ausente no ZIP → mantido.
- Para excluir, inclua `_remover.txt` com os caminhos relativos, um por linha.
- Nomes de ZIP devem corresponder a `pacote-*.zip`.
- Não inclua `.github/`, `.git/`, `node_modules/`, `.expo/`, segredos, arquivos de assinatura ou pacotes ZIP dentro de outro pacote.
- Os arquivos `package.json`, `app.json` e `eas.json` não podem ser excluídos.
- Limites por arquivo ZIP: até 4.000 arquivos e 60 MB descompactados.

Exemplo de `_remover.txt`:

```
# Arquivos antigos que devem sair do projeto
src/components/BotaoAntigo.tsx
assets/imagem-antiga.png
```

## Backup e reversão

Antes de aplicar o pacote, a Action cria `lunivo-codigo-anterior.tar.gz`, arquiva como artefato do GitHub com retenção de 30 dias e **só depois** aplica os arquivos.
O GitHub também conserva o histórico de commits, permitindo reverter mudanças. Backups do código **não** incluem os dados online de alunos.

## Verificação antes da publicação

O GitHub instala dependências e executa TypeScript (`npm run typecheck`) e os testes (`npm test`) **antes** de registrar a mudança na branch `main`.
Se falhar, o código novo não é commitado e o ZIP permanece para inspeção/correção. O build Android/iOS é um passo separado, a implementar no Expo EAS.

## Limitações e cuidados

- A automação só funciona se as GitHub Actions estiverem habilitadas e `GITHUB_TOKEN` puder gravar no repositório.
- Para alterar arquivos em `.github/workflows/`, é necessário um procedimento separado.
- Nunca publique arquivos `.env`, credenciais do Supabase, certificados Apple ou chaves Android.
- Testes automatizados **não** substituem builds e testes físicos antes da publicação.
- Ao criar o backend Supabase, configuraremos backup independente do banco e armazenamento. **Ainda não há banco do Lunivo sendo salvo.**

## GitHub conectado ao ChatGPT

Se a integração GitHub estiver em modo somente leitura (erro 403), ela não permite criar o workflow diretamente. Faça o cadastro inicial pelo navegador: **Add file → Create new file**, informe o caminho `.github/workflows/aplicar-pacote.yml`, cole o conteúdo do arquivo fornecido, e confirme em `main`. Esta ação só precisa ocorrer uma vez.
