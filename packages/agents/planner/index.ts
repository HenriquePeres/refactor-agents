import { enqueue } from "../shared/queue";
import { Msg } from "../shared/types";
import { nowISO } from "../shared/util";

const TASK_ID = `refac-${Date.now()}`;

async function main() {
  const msg: Msg = {
    intent: "REQUEST",
    task_id: TASK_ID,
    sender: "planner",
    // packages/agents/planner/index.ts
    context: {
      repo: "https://github.com/HenriquePeres/refactor-agents-sandbox",
      branch: "main",
      language: "TypeScript",
      // escolha um arquivo real do repo:
      targets: ["../refactor-agents-sandbox/src/app/services/user.service.ts"] 
      // ou: ["packages/agents/shared/llm.ts"]
    },

    created_at: nowISO()
  };
  await enqueue("static-analyzer", msg);
}

main();
