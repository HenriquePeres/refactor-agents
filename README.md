# Refactor Agents (MVP)

## Pré-requisitos
- Redis (`docker compose up -d`)
- GitHub CLI autenticado (`gh auth status`)
- Variáveis no `.env`

## Rodando local
1. `pnpm i`
2. `docker compose up -d`
3. Em 5 terminais separados (ou use `npm-run-all`):
   - `pnpm dev:analyzer`
   - `pnpm dev:proposer`
   - `pnpm dev:reviewer`
   - `pnpm dev:executor`
   - `pnpm dev:planner` (dispara a tarefa)

O **proposer** cria um diff sintético e o **executor** tenta aplicar num clone do repo indicado.
