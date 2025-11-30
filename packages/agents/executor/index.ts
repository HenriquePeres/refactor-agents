import { consume } from "../shared/queue";
import { Msg, ReviewerDecisionPayload } from "../shared/types";
import { log } from "../shared/logger";
import { applyAndTest } from "../shared/git";
import { renderReportMd } from "./report";
import * as fs from "node:fs";
import * as path from "node:path";

async function handler(msg: Msg<ReviewerDecisionPayload>) {
  log("executor", "received", { intent: msg.intent, task: msg.task_id });

  if (msg.intent !== "ACCEPT") {
    log("executor", "proposal not accepted, skipping");
    return;
  }

  const diff = msg.payload?.proposal?.diff;
  if (!diff || !diff.trim()) {
    log("executor", "empty diff in payload, aborting");
    return;
  }

  const { branch, report } = await applyAndTest(
    msg.context.repo,
    msg.context.branch,
    diff
  );


  const md = renderReportMd(report);

  fs.mkdirSync(".tmp", { recursive: true });
  fs.writeFileSync(path.join(".tmp", `${msg.task_id}-report.md`), md, "utf8");

  log("executor", "finished", { branch, report });
}

consume<ReviewerDecisionPayload>("executor", handler);
