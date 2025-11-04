import { consume, enqueue } from "../shared/queue";
import { Msg, Proposal } from "../shared/types";
import { countDiffChangedLines } from "../shared/util";

async function handler(msg: Msg<Proposal>) {
  const diff = msg.payload?.diff || "";
  const changed = countDiffChangedLines(diff);
  const accept =
    changed <= 60 &&
    (msg.payload?.risk === "low" || msg.payload?.risk === "medium");

  const out: Msg = {
    intent: accept ? "ACCEPT" : "REJECT",
    task_id: msg.task_id,
    sender: "reviewer",
    context: msg.context,
    payload: { changedLines: changed, reason: accept ? "OK" : "Too big/High risk" },
    created_at: new Date().toISOString()
  };

  await enqueue("executor", out);
}

// note o tipo <Proposal> aqui:
consume<Proposal>("reviewer", handler);

