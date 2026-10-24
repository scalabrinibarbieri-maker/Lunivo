# Roteiro atual do Lunivo — outubro de 2026

## Implementado e testado em CI

- [x] Código nativo multiplataforma React Native + Expo + TypeScript.
- [x] APK/AAB Android por GitHub Actions; build Android de testes verificado.
- [x] Onboarding, login Firebase, lições locais e remotas, infos culturais, correção escrita, escuta, associações e banco de letras.
- [x] Áudios R2 com cache e download de unidades remotas para estudo offline (infos suplementares remotas seguem online-only).
- [x] Progresso de lições, XP, streak e sincronização com Worker/D1.
- [x] Memória de vocabulário e revisão geral local, com recuperação parcial via lições sincronizadas.
- [x] Auditoria inicial de conteúdo e redução da duplicação de curadoria em V27.

## Próximas prioridades

- [ ] Consolidar completamente metadados editoriais e contratos de conteúdo com testes de paridade entre app e publicador.
- [ ] Corrigir limites de XP ao ampliar exercícios das primeiras lições.
- [ ] Expansão curricular consistente, revisão de traduções e testes com estudantes.
- [ ] Sincronizar memória de vocabulário entre aparelhos, com resolução de conflitos.
- [ ] Refatorar telas e providers extensos com testes comportamentais.
- [ ] Configurar build iOS, certificados e testes em iPhone real.
- [ ] Preparar Worker/D1/R2 de produção, logs, segurança e proteção de dados.
- [ ] Implementar pagamentos, privacidade, exclusão de conta e submissão às lojas.

## Regras

- Não remover migrations ou compatibilidade de dados sem migração.
- Não corrigir texto local apenas sobrepondo um suplemento no R2.
- Não confiar em XP enviado pelo cliente para pagamentos, rankings ou benefícios competitivos.
