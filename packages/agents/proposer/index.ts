import { consume, enqueue } from "../shared/queue";
import { Msg, Proposal } from "../shared/types";
import { log } from "../shared/logger";
import { generateSyntheticDiff } from "./refactors/extractFunction";

async function handler(msg: Msg) {
  log("proposer", "received", msg.evidence);
  const targetFile = msg.context.targets[0];

  const proposal: Proposal = {
    title: "Extrair função (sintético)",
    diff: generateSyntheticDiff(targetFile),
    rationale: "Reduz complexidade local ao isolar soma em função dedicada.",
    risk: "low",
    estimated_time: "10min"
  };

  const out: Msg<Proposal> = {
    intent: "PROPOSE",
    task_id: msg.task_id,
    sender: "proposer",
    context: msg.context,
    payload: proposal,
    created_at: new Date().toISOString()
  };

  await enqueue("reviewer", out);
}

consume("proposer", handler);
