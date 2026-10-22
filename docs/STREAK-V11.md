# Lunivo V11 — Sequencia diaria (streak)

## Regras

- Uma licao concluida (inclusive revisao) registra o dia **local** do aparelho, independentemente da pontuacao.
- Varios exercicios/licoes no mesmo dia contam como **um dia**; a mesma licao revisada nao adiciona XP.
- Dias civis consecutivos aumentam a sequencia. Ontem ainda conta ate o fim de hoje; dois dias perdidos zeram a sequencia corrente, mas nao o recorde.
- Registros ficam na chave de progresso da conta/visitante que ja existia, preservando XP e lições.
- De um progresso antigo so se recupera `lastStudiedAt`, um unico dia comprovavel; historico antigo nao pode ser reconstruido integralmente.

## Cloudflare D1 (contas conectadas)

1. Envie `pacote-lunivo-streak-v11.zip` a raiz da branch `main`; o workflow `Aplicar pacote Lunivo` valida npm/TypeScript/testes e altera o codigo.
2. Em GitHub Actions, execute **Lunivo - Backend Cloudflare**, opcao **migrate**, para aplicar `backend/migrations/0003_streak.sql` ao banco `lunivo-dev`. Depende de `CLOUDFLARE_D1_API_TOKEN` configurado no GitHub.
3. Em seguida execute o MESMO workflow com opcao **deploy** para publicar o Worker de testes. Depende de `CLOUDFLARE_API_TOKEN`.
4. Antes desses passos, a streak ja funciona LOCALMENTE no app, e o cliente nao tenta enviar dias ao backend legado. O backend novo tolera a ausencia temporaria da tabela sem interromper o XP.
5. Nao e necessario reconfigurar as chaves de progresso existentes, nem reinstalar o APK.

## Limitacoes honestas

- Data local depende do relogio/fuso horario do celular; D1 valida formato e intervalo de datas mas nao pode comprovar dias estudados offline contra alteracao manual de relogio. Endurecimento anti-fraude seria uma etapa distinta para rankings/premios.
- A meta diaria em minutos ainda nao mede tempo real; por enquanto o streak exige a conclusao de uma licao, nao o tempo da meta.
- A historico local do visitante nao e unido automaticamente ao da conta logada, para evitar misturar pessoas.
