// packages/agents/static-analyzer/index.ts
import { consume, enqueue } from "../shared/queue";
import { Msg } from "../shared/types";
import { log } from "../shared/logger";
import { runEslint } from "./eslintRunner";

async function handler(msg: Msg) {
  log("static-analyzer", "received message from queue", {
    task_id: msg.task_id,
    from: msg.sender,
    intent: msg.intent,
    context: msg.context,
  });

  const eslint = await runEslint(msg.context.targets);
  const metrics = { cyclomatic: 18, loc: 420 }; // stub; integrar métrica real depois

  const evidence = { eslint, metrics };

  log("static-analyzer", "computed evidence", {
    task_id: msg.task_id,
    evidence,
  });

  const out: Msg = {
    intent: "INFORM",
    task_id: msg.task_id,
    sender: "static-analyzer",
    context: msg.context,
    evidence,
    created_at: new Date().toISOString(),
  };

  log("static-analyzer", "sending INFORM to proposer", {
    task_id: out.task_id,
    evidenceSummary: {
      targets: msg.context.targets,
      eslintTargets: msg.context.targets.length,
    },
  });

  await enqueue("proposer", out);
}

consume("static-analyzer", handler);
