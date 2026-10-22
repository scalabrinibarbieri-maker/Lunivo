# Lunivo V15 — Emblemas premium, painéis elásticos e imagens realmente offline

## Atualização

O ZIP `pacote-lunivo-design-offline-v15.zip` deve ser enviado à raiz do repositório Lunivo (`main`). O workflow `Aplicar pacote Lunivo` valida npm, TypeScript e testes antes de registrar as alterações. A V15 inclui os arquivos necessários da V14, evitando importar a interface explicativa sem seus respectivos tipos e componentes caso o pacote anterior ainda esteja em processamento.

### Visual

- Emblemas próprios em PNG transparente para XP e streak; pulso leve usando a animação nativa do React Native.
- Toque em streak/XP na Home abre um painel inferior com fundo translúcido e movimento elástico. Não é um desfoque nativo idêntico ao do Doxa: reproduz o foco visual e a dinâmica, sem dependências extras.
- Cartão principal da Home recebe entrada suave; telas Cursos, Perfil e Resultado usam a identidade visual Lunivo.
- Mantidas a marca, navegação, progressão, streak, XP e todas as operações de conta e downloads.

### Imagens de aulas explicativas

- Etapas `type: "info"` podem incluir `image: { "url": "https://.../foto.webp", "alt": "...", "caption": "..." }` (formatos PNG, JPEG e WebP).
- Ao selecionar **Baixar unidade**, o aplicativo transfere previamente todas as imagens `info` para `Paths.document/lunivo-lesson-images-v1/<id>-r<revisão>/`, além dos áudios obrigatórios e do JSON da unidade.
- **Só após as transferências e a verificação de integridade** a unidade recebe o selo de conteúdo offline. Falhas deixam o estado offline falso.
- Nas lições baixadas, o leitor usa o arquivo local `file://` em vez da URL remota. Em acesso online sem download, continua utilizando HTTPS.
- Ao remover o módulo, as imagens específicas da unidade são apagadas; o progresso continua intacto.
- A atualização reavalia unidades antigas: se um módulo anteriormente salvo tiver novas imagens mas elas estiverem ausentes, será preciso baixá-lo novamente.
- Proteções: HTTPS validado pelo esquema do curso, limite de 3 MiB por imagem, 30 imagens por unidade, 30 MiB total, timeout, cancelamento de downloads excessivos e verificação de assinatura PNG/JPEG/WebP.
- As imagens **ainda precisam ser publicadas num endereço HTTPS acessível**. O pacote V15 não cria um publicador automático de imagens no Cloudflare R2; será uma etapa separada se quisermos enviá-las junto do ZIP de conteúdo.

### Observações

- Não há lições `info` em produção nesta versão: o comportamento offline está pronto para as futuras aulas.
- O APK não foi compilado no ambiente de geração; o workflow do GitHub fará o teste completo.
