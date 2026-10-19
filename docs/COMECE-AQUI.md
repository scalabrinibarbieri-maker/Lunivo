# Lunivo — primeira instalação pelo celular

Repositório: https://github.com/scalabrinibarbieri-maker/Lunivo

## Passo 1 — Instalar o automatizador (uma vez)

1. Abra o repositório no Chrome do Android, logado no GitHub.
2. Na branch **main**, selecione **Add file → Create new file** (se necessário, use **Site para computador** no navegador).
3. No nome do novo arquivo, digite exatamente `.github/workflows/aplicar-pacote.yml`.
4. Copie e cole todo o conteúdo do arquivo `aplicar-pacote-lunivo.yml` que acompanha esta entrega.
5. Confirme em **Commit changes**, diretamente na branch `main`.

## Passo 2 — Instalar o aplicativo-base

1. Na raiz do repositório `Lunivo`, escolha **Add file → Upload files**.
2. Selecione `pacote-lunivo-v1.zip` e confirme o commit na branch `main`.
3. Abra **Actions → Aplicar pacote Lunivo** e acompanhe o resultado.
4. Quando a execução terminar com sucesso, os arquivos estarão na raiz do projeto, o ZIP será apagado automaticamente, e o commit do bot ficará registrado.
5. Se aparecer erro em vermelho, o pacote *não* foi aplicado; envie o link da execução para revisão. Não apague o ZIP antes de analisarmos.

## A partir da segunda atualização

Basta enviar `pacote-*.zip` à raiz. A automação cria backup do código, valida a segurança do pacote, instala dependências, executa TypeScript e testes, e só então faz o commit.

**Limitações:** Isso ainda não compila APK/iOS; builds Expo EAS serão configuradas em etapa posterior. O backup é do código, não do futuro banco de dados. Arquivos `.github/workflows/` não podem ser modificados por ZIP; serão atualizados manualmente quando necessário.
