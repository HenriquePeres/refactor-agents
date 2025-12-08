// packages/agents/reviewer/index.ts
import { consume, enqueue } from "../shared/queue";
import { Msg, Proposal, ReviewerDecisionPayload } from "../shared/types";
import { countDiffChangedLines } from "../shared/util";
import { log } from "../shared/logger";
import { analyzeFile } from "../static-analyzer/analyzeFile";

type Severity = "low" | "medium" | "high" | "unknown";

function classifySeverity(metrics: {
  loc: number;
  cyclomaticAvg: number;
} | null): Severity {
  if (!metrics) return "unknown";

  const { loc, cyclomaticAvg } = metrics;

  // heurísticas simples – pode ajustar depois
  if (loc > 200 || cyclomaticAvg > 10) return "high";
  if (loc > 80 || cyclomaticAvg > 5) return "medium";
  return "low";
}

function decide(
  changedLines: number,
  risk: Proposal["risk"],
  severity: Severity
): { accept: boolean; reason: string; maxAllowed: number } {
  let maxAllowed = 60; // default conservador

  if (severity === "low") {
    maxAllowed = 40;
  } else if (severity === "medium") {
    maxAllowed = 100;
  } else if (severity === "high") {
    maxAllowed = 180;
  }

  // regra principal: linhas + risco
  if (changedLines > maxAllowed) {
    return {
      accept: false,
      reason: `Refatoração muito grande para um arquivo ${severity} (mudou ${changedLines} linhas, limite ${maxAllowed}).`,
      maxAllowed,
    };
  }

  if (risk === "high") {
    return {
      accept: false,
      reason: "Proposta marcada como risco alto pelo proposer.",
      maxAllowed,
    };
  }

  return {
    accept: true,
    reason: `Mudança dentro do limite para arquivo ${severity} e risco ${risk}.`,
    maxAllowed,
  };
}

async function handler(msg: Msg<Proposal>) {
  const proposal = msg.payload as Proposal | undefined;
  const diff = proposal?.diff || "";
  const changedLines = countDiffChangedLines(diff);
  const risk = proposal?.risk ?? "medium";

  const targetFile = msg.context.targets?.[0];

  log("reviewer", "received PROPOSE from proposer", {
    task_id: msg.task_id,
    targetFile,
    proposalSummary: {
      title: proposal?.title,
      risk,
      changedLines,
    },
  });

  // Métricas do arquivo original
  let metricsSnapshot: any = null;
  let severity: Severity = "unknown";

  if (targetFile) {
    try {
      const analysis = analyzeFile(targetFile);
      metricsSnapshot = analysis.metrics;
      severity = classifySeverity(analysis.metrics);

      log("reviewer", "original file metrics", {
        task_id: msg.task_id,
        targetFile,
        metrics: analysis.metrics,
        hotspots: analysis.hotspots,
        severity,
      });
    } catch (err) {
      log("reviewer", "failed to analyze original file, falling back to simple policy", {
        task_id: msg.task_id,
        targetFile,
        error: String(err),
      });
    }
  }

  const { accept, reason, maxAllowed } = decide(changedLines, risk, severity);

  const out: Msg<ReviewerDecisionPayload> = {
    intent: accept ? "ACCEPT" : "REJECT",
    task_id: msg.task_id,
    sender: "reviewer",
    context: msg.context,
    payload: {
      changedLines,
      reason,
      severity,
      maxAllowedChangedLines: maxAllowed,
      metricsSnapshot,
      proposal: proposal as Proposal,
    },
    created_at: new Date().toISOString(),
  };

  log("reviewer", "decision", {
    task_id: msg.task_id,
    decision: out.intent,
    changedLines,
    risk,
    severity,
    maxAllowed,
    reason,
  });

  await enqueue("executor", out);
}

consume<Proposal>("reviewer", handler);
