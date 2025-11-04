import { consume } from "../shared/queue";
import { Msg, Proposal } from "../shared/types";
import { log } from "../shared/logger";
import { applyAndTest } from "../shared/git";
import { renderReportMd } from "./report";
import * as fs from "node:fs";
import * as path from "node:path";

async function handler(msg: Msg) {
  log("executor", "received", msg);

  if (msg.intent !== "ACCEPT") {
    log("executor", "proposal not accepted, skipping");
    return;
  }

  // Recupera a última proposta no blackboard? Para MVP, reaproveita do contexto:
  // Em cenário real, o reviewer deveria repassar o diff. Aqui fazemos leitura de cache simples:
  const cacheFile = path.join(".tmp", `${msg.task_id}.diff`);
  let diff = "";
  try {
    diff = fs.readFileSync(cacheFile, "utf8");
  } catch {
    log("executor", "no cached diff found; cannot execute safely");
    return;
  }

  const repo = msg.context.repo;
  const base = msg.context.branch;

  const { branch, report } = await applyAndTest(repo, base, diff);
  const md = renderReportMd(report);
  fs.writeFileSync(path.join(".tmp", `${msg.task_id}-report.md`), md, "utf8");

  log("executor", `finished on ${branch}`, report);
}

consume("executor", handler);
