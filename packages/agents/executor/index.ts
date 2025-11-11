import { consume } from "../shared/queue";
import { Msg, ReviewerDecisionPayload } from "../shared/types";
import { log } from "../shared/logger";
const execa = require('execa');
import { applyAndTest } from "../shared/git";     // << importante!
import { renderReportMd } from "./report";
import * as fs from "node:fs";
import * as path from "node:path";

async function handler(msg: Msg<ReviewerDecisionPayload>) {
  log("executor", "received", { intent: msg.intent, task: msg.task_id });

  if (msg.intent !== "ACCEPT") {
    log("executor", "proposal not accepted, skipping");
    return;
  }

  const diffContent = msg.payload?.proposal?.diff; // <- diff vindo do agente
  if (!diffContent || !diffContent.trim()) {
    log("executor", "empty diff in payload, aborting");
    return;
  }

  // repo alvo
  const repoDir = process.env.TARGET_REPO_DIR || "C:\\workspace\\PFP\\refactor-agents-sandbox";

  // salva o diff em arquivo temporário
  fs.mkdirSync(".tmp", { recursive: true });
  const patchPath = path.resolve(".tmp", `patch-${msg.task_id}.diff`);
  fs.writeFileSync(patchPath, diffContent, "utf8");

  console.log("[executor] Applying patch:", patchPath);
  console.log("[executor] Target repo:", repoDir);

  // aplica o patch
  await execa('git', ['apply', '--3way', patchPath], { cwd: repoDir });;

  const { branch, report } = await applyAndTest(msg.context.repo, msg.context.branch, diffContent);
  const md = renderReportMd(report);

  fs.mkdirSync(".tmp", { recursive: true });
  fs.writeFileSync(path.join(".tmp", `${msg.task_id}-report.md`), md, "utf8");

  log("executor", `finished on ${branch}`, report);
}

consume<ReviewerDecisionPayload>("executor", handler);




