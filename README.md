# Refactor Agents
Sistema multiagentes para análise, proposta, revisão e aplicação automática de refatorações usando modelos de linguagem (LLMs).  
O pipeline completo do arquivo original ao Pull Request é executado por cinco agentes independentes que se comunicam via Redis.

## Pré-requisitos

Certifique-se de ter os seguintes componentes instalados:

### Ferramentas
- Redis (`docker compose up -d`)
- GitHub CLI autenticado (`gh auth status`)
- Variáveis no `.env`
- Docker instalado
- Node.js 20+
- PNPM 9+
- Git  
- GitHub CLI autenticado:
  ```bash
  gh auth status


## Acessos necessários

- Chave de API da OpenAI
- Configuração de SSH para o GitHub
- Token do GitHub com permissão repo
- Permissão de escrita no repositório sandbox (veja abaixo)

### Caso o usuário queira testar o sistema em um projeto teste (refactor-agents-sandbox), é necessário que 

1. O dono do projeto pegue  o nome de usuário GitHub da pessoa

2. Adicione essa pessoa em GitHub → refactor-agents-sandbox → Settings → Collaborators → Add people

3. Conceda a permissão Write

src/app/services/
   ├── math-utils-simple.ts
   ├── user-score.service.ts
   ├── legacy-export.service.ts
   ├── feature-flags.service.ts
   ├── report.service.ts

## Variáveis de ambiente

Crie um arquivo .env na raiz do projeto.
Você pode copiar o .env.sample e editar conforme necessário.

# Redis
REDIS_URL=redis://localhost:6379

# OpenAI
LLM_API_URL=https://api.openai.com/v1/chat/completions
LLM_API_KEY=sua_chave_aqui
LLM_MODEL=gpt-5.1

# Repositório sandbox para aplicar as refatorações
TARGET_REPO_SSH=git@github.com:SEU_USUARIO/refactor-agents-sandbox.git
TARGET_BASE_BRANCH=main


## Rodando local
1. Instale as dependências: `pnpm i`

2. Suba o Redis: `docker compose up -d`

3. Em 5 terminais separados (ou use `npm-run-all`):
   - `pnpm dev:analyzer`
   - `pnpm dev:proposer`
   - `pnpm dev:reviewer`
   - `pnpm dev:executor`
   - `pnpm dev:planner` (dispara a tarefa)



## Como o sistema funciona

O sistema possui 5 agentes independentes que se comunicam via Redis:

1. **Planner**  
Dispara novas tarefas indicando:  
- repo  
- arquivo alvo  
- branch  
- linguagem  

2. **Static Analyzer**  
Coleta métricas do arquivo, como:
- LOC  
- Complexidade ciclomática  
- Funções com maior complexidade  
- Hotspots  

3. **Proposer**  
Usa o modelo LLM definido no `.env` para gerar um *diff unificado* seguindo regras rígidas:
- Não alterar comportamento  
- Não introduzir novos conceitos  
- Não criar entidades novas  
- Refatorar sem mudar a semântica  

4. **Reviewer**  
Decide se aceita ou rejeita a proposta com base em:
- Limite de linhas alteradas permitidas por tipo de arquivo  
- Severidade  
- Risco da alteração  

5. **Executor**  
Caso aprovado:
- Clona repo  
- Aplica patch  
- Cria branch  
- Realiza commit  
- Faz push  
- Gera relatório final  

O **proposer** cria um diff sintético e o **executor** tenta aplicar num clone do repo indicado.

---

## Exemplo de execução

Para alterar o arquivo-alvo, edite:

`packages/agents/planner/index.ts`

E escolha o arquivo para refatorar, por exemplo:

```ts
targets: [
"../refactor-agents-sandbox/src/app/services/user-score.service.ts" // Colocar o final o arquivo que deseja refatorar
]


