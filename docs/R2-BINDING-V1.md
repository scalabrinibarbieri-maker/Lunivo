# Lunivo — conexão inicial Cloudflare R2

Este pacote acrescenta o binding R2 `AUDIO_BUCKET` ao Worker `lunivo-api-dev`, apontando ao bucket privado `lunivo-audios`, preservando D1 e Firebase. Testes de configuração incluídos.

**Não publique o bucket na internet:** deixe `Public Development URL` desativado. O Worker poderá ler os objetos por um binding privado, após a implantação.

Instalação: enviar o ZIP `pacote-lunivo-conectar-r2-v1.zip` na raiz do GitHub Lunivo (sem descompactar). O workflow valida e aplica. Depois executar manualmente `Lunivo - Backend Cloudflare`, ação `deploy`, branch `main`.

Este é apenas o binding inicial. O Worker ainda não serve MP3s até implementar os endpoints e catálogo, e o aplicativo ainda não consome MP3s na nuvem. A próxima etapa será implementar esse sistema com cache offline e a publicação de arquivos sem novo APK.
