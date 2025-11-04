import { enqueue } from "../shared/queue";
import { Msg } from "../shared/types";
import { nowISO } from "../shared/util";

const TASK_ID = `refac-${Date.now()}`;

async function main() {
  const msg: Msg = {
    intent: "REQUEST",
    task_id: TASK_ID,
    sender: "planner",
    context: {
      repo: process.env.TARGET_REPO_SSH || "git@github.com:org/projeto.git",
      branch: process.env.TARGET_BASE_BRANCH || "main",
      language: "TypeScript",
      targets: ["src/app/services/user.service.ts"] // ajuste para o projeto real
    },
    created_at: nowISO()
  };
  await enqueue("static-analyzer", msg);
}

main();
