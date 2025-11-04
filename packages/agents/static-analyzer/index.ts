import { consume, enqueue } from "../shared/queue";
import { Msg } from "../shared/types";
import { log } from "../shared/logger";
import { runEslint } from "./eslintRunner";

async function handler(msg: Msg) {
  log("static-analyzer", "received", msg);
  const evidence = {
    eslint: await runEslint(msg.context.targets),
    metrics: { cyclomatic: 18, loc: 420 } // stub; integrar métrica real depois
  };

  const out: Msg = {
    intent: "INFORM",
    task_id: msg.task_id,
    sender: "static-analyzer",
    context: msg.context,
    evidence,
    created_at: new Date().toISOString()
  };
  await enqueue("proposer", out);
}

consume("static-analyzer", handler);
