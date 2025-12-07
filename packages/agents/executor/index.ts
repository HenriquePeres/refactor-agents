// packages/agents/executor/index.ts
import { consume } from "../shared/queue";
import { Msg, ReviewerDecisionPayload } from "../shared/types";
import { log } from "../shared/logger";
import { applyAndTest } from "../shared/git";
import { renderReportMd } from "./report";
import * as fs from "node:fs";
import * as path from "node:path";

async function handler(msg: Msg<ReviewerDecisionPayload>) {
  log("executor", "received message from reviewer", {
    task_id: msg.task_id,
    intent: msg.intent,
    context: msg.context,
    payloadSummary: {
      changedLines: msg.payload?.changedLines,
      reason: msg.payload?.reason,
      hasProposal: !!msg.payload?.proposal,
    },
  });

  if (msg.intent !== "ACCEPT") {
    log("executor", "proposal not accepted, skipping");
    return;
  }

  const proposal = msg.payload?.proposal;
  if (!proposal) {
    log("executor", "no proposal found in payload, aborting", {
      task_id: msg.task_id,
    });
    return;
  }

  const diff = proposal.diff;

  log("executor", "applying diff via git helper", {
    task_id: msg.task_id,
    repo: msg.context.repo,
    branch: msg.context.branch,
  });

  const { branch, report } = await applyAndTest(
    msg.context.repo,
    msg.context.branch,
    diff
  );

  const md = renderReportMd(report);
  fs.mkdirSync(".tmp", { recursive: true });
  const reportPath = path.join(".tmp", `${msg.task_id}-report.md`);
  fs.writeFileSync(reportPath, md, "utf8");

  log("executor", "finished execution", {
    task_id: msg.task_id,
    createdBranch: branch,
    reportPath,
    report,
  });
}

consume<ReviewerDecisionPayload>("executor", handler);
