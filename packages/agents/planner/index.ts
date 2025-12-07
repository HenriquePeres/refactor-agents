// packages/agents/planner/index.ts
import { enqueue } from "../shared/queue";
import { Msg } from "../shared/types";
import { nowISO } from "../shared/util";
import { log } from "../shared/logger";

const TASK_ID = `refac-${Date.now()}`;

async function main() {
  const msg: Msg = {
    intent: "REQUEST",
    task_id: TASK_ID,
    sender: "planner",
    context: {
      repo: "https://github.com/HenriquePeres/refactor-agents-sandbox",
      branch: "main",
      language: "TypeScript",
      // ATENÇÃO: aqui entra o(s) arquivo(s) que o usuário quer refatorar
      targets: ["../refactor-agents-sandbox/src/app/services/user.service.ts"],
    },
    created_at: nowISO(),
  };

  log("planner", "creating new task", {
    task_id: msg.task_id,
    context: msg.context,
  });

  await enqueue("static-analyzer", msg);

  log("planner", "enqueued REQUEST to static-analyzer", {
    task_id: msg.task_id,
  });
}

main().catch((err) => {
  log("planner", "fatal error", { error: String(err) });
});
