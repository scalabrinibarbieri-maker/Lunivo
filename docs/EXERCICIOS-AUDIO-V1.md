# Lunivo — Primeira evolução do motor de exercícios

## O que entra nesta atualização

- Mantém as lições `it-a1-01` a `it-a1-03`, o progresso Firebase/D1 e os exercícios já existentes.
- Adiciona **compreensão oral** (`listen_choice`), **ditado** (`listen_write`) e **associação de pares** (`match`) na primeira lição.
- Áudios reaproveitados por `audioExerciseId`: `q01` (Ciao), `q02` (Buongiorno) e `q03` (Grazie no R2). Nenhum novo MP3 e nenhuma alteração no publicador.
- Durante exercícios de escuta, não mostra o texto falado no enunciado nem no rótulo acessível do botão antes da correção.
- O botão Verificar só é habilitado depois de o áudio estar carregado em exercícios de escuta. Se a gravação remota não estiver acessível, existe **Pular atividade sem áudio**, sem ganhar pontos, para não bloquear a lição offline.
- Na associação, o aluno escolhe uma expressão da coluna italiana e a correspondente tradução; pode tocar no item italiano já associado para desfazer e corrigir antes de verificar.
- O resultado final segue utilizando `gradeExercise`, a pontuação já existente e `completeLesson` — sem mudanças no banco D1.

## Limitação conhecida

O exercício de escuta com `Grazie` (`q18`) necessita de conexão na primeira utilização do aparelho. Depois que o arquivo já foi baixado, pode ser reproduzido offline. `Ciao` e `Buongiorno` continuam embutidos.

O conteúdo das lições ainda é empacotado no aplicativo. Somente **a adição dos MP3s** é remota; a criação de novos exercícios ainda exige atualização do conteúdo do app. No futuro, esse conteúdo pode migrar para catálogo remoto versionado.

## Instalação

Subir `pacote-lunivo-exercicios-audio-v1.zip` na raiz do GitHub. `Aplicar pacote Lunivo` valida `npm run typecheck` e `npm test` antes de fazer commit. Depois o workflow Android gera APK/AAB automaticamente. Instalar o novo APK por cima do anterior, sem desinstalar.
