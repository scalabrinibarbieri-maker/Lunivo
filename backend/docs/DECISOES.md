# Decisões técnicas (Lunivo)

- **Frontend:** React Native + Expo SDK, não WebView. Expo EAS é opcional para builds Android.
- **Dados no aparelho:** lições e progresso temporário via SQLite. O backend recebe sincronizações compactas, em vez de uma requisição por resposta.
- **Backend:** Workers expõe uma API estreita em TypeScript; D1 usa migrations versionadas. Ambiente de testes separado do futuro ambiente de produção.
- **Identidade:** Firebase Auth; o Worker verifica Firebase ID tokens criptograficamente, não aceita identidade enviada pelo aplicativo.
- **Pontuação e assinatura:** não confiar em alegações do cliente; verificar compras na plataforma / RevenueCat e correção competitiva no servidor.
- **Custo:** acompanhar leituras, escritas, requisições e tamanho por usuário ativo. Arquitetura econômica não garante custo zero em escala nem disponibilidade após ultrapassar cotas.
- **Privacidade:** minimizar coleta, implementar exclusão, retenção, backup e restauração, não publicar credenciais.
- **Próxima decisão:** escolher conta Cloudflare + criar D1 dev e ativar projeto Firebase, sem integrar contas reais antes de validação.
