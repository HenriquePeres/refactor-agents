// packages/agents/reviewer/index.ts
import { consume, enqueue } from "../shared/queue";
import { Msg, Proposal, ReviewerDecisionPayload } from "../shared/types";
import { countDiffChangedLines } from "../shared/util";
import { log } from "../shared/logger";

async function handler(msg: Msg<Proposal>) {
  const proposal = msg.payload as Proposal | undefined;
  const diff = proposal?.diff || "";
  const changed = countDiffChangedLines(diff);

  log("reviewer", "received PROPOSE from proposer", {
    task_id: msg.task_id,
    context: msg.context,
    proposalSummary: {
      title: proposal?.title,
      risk: proposal?.risk,
      changedLines: changed,
    },
  });

  const risk = proposal?.risk ?? "medium";
  const accept = changed <= 60 && (risk === "low" || risk === "medium");

  const out: Msg<ReviewerDecisionPayload> = {
    intent: accept ? "ACCEPT" : "REJECT",
    task_id: msg.task_id,
    sender: "reviewer",
    context: msg.context,
    payload: {
      changedLines: changed,
      reason: accept ? "OK" : "Too big/High risk",
      proposal: proposal as Proposal,
    },
    created_at: new Date().toISOString(),
  };

  log("reviewer", "decision", {
    task_id: msg.task_id,
    decision: out.intent,
    changedLines: changed,
    risk,
    reason: out.payload?.reason,
  });

  await enqueue("executor", out);
}

consume<Proposal>("reviewer", handler);
