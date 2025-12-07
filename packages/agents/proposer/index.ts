// packages/agents/proposer/index.ts
import "../shared/config"; // mantém o carregamento de env no boot
import fs from "node:fs";
import path from "node:path";
import { consume, enqueue } from "../shared/queue";
import { Msg, Proposal } from "../shared/types";
import { log } from "../shared/logger";
import { generateRefactorDiff } from "../shared/llm";
import { countDiffChangedLines } from "../shared/util";

async function handler(msg: Msg) {
  const evidence = msg.evidence ?? {};
  const eslint = evidence["eslint"];
  const metrics = evidence["metrics"];

  log("proposer", "received message from static-analyzer", {
    task_id: msg.task_id,
    context: msg.context,
    evidenceSummary: {
      hasEslint: !!eslint,
      hasMetrics: !!metrics,
    },
  });

  const targetFile = msg.context.targets[0];

  // Caminho local para leitura do código (mantém o que já estava funcionando)
  const localPath = path.resolve(targetFile);
  const code = fs.readFileSync(localPath, "utf8");

  log("proposer", "loaded target file", {
    task_id: msg.task_id,
    targetFile,
    localPath,
    codePreview: code.split("\n").slice(0, 10).join("\n"),
  });

  // Instruções "high level" que o planner/analyzer podem enriquecer no futuro
  const instructionsLines: string[] = [];

  instructionsLines.push(
    "Refatore o arquivo respeitando as evidências de análise estática e as boas práticas de engenharia de software."
  );
  instructionsLines.push(
    "Foque em clareza, legibilidade, redução de complexidade e pequena modularização."
  );
  instructionsLines.push(
    "Preserve o comportamento observável e a API pública (nomes e assinaturas exportadas)."
  );

  const instructions = instructionsLines.join("\n");

  let diff: string;
  let risk: Proposal["risk"] = "medium";
  let rationale =
    "Refatoração sugerida automaticamente pelo agente de proposta com base na análise estática.";

  try {
    diff = await generateRefactorDiff({
      filePath: targetFile,
      code,
      instructions,
      eslint,
      metrics,
    });
  } catch (err) {
    log("proposer", "LLM error, aborting proposal", {
      task_id: msg.task_id,
      error: String(err),
    });
    return;
  }

  const changed = countDiffChangedLines(diff);

  // heurística simples de risco baseada em linhas alteradas
  if (changed <= 40) {
    risk = "low";
    rationale += " Refatoração pequena e localizada (baixo número de linhas alteradas).";
  } else if (changed > 150) {
    risk = "high";
    rationale +=
      " Refatoração extensa (alto número de linhas alteradas), podendo impactar diversas partes do sistema.";
  } else {
    risk = "medium";
    rationale += " Refatoração de tamanho moderado.";
  }

  log("proposer", "generated diff from LLM", {
    task_id: msg.task_id,
    targetFile,
    changedLines: changed,
  });

  console.log("===== DIFF GERADO PELA LLM =====");
  console.log(diff);
  console.log("===== FIM DO DIFF =====");

  const proposal: Proposal = {
    title: `Refatoração automática em ${path.basename(targetFile)}`,
    diff,
    rationale,
    risk,
    estimated_time: "15-30min",
  };

  const out: Msg<Proposal> = {
    intent: "PROPOSE",
    task_id: msg.task_id,
    sender: "proposer",
    context: msg.context,
    payload: proposal,
    created_at: new Date().toISOString(),
  };

  log("proposer", "sending PROPOSE to reviewer", {
    task_id: msg.task_id,
    proposalSummary: {
      title: proposal.title,
      risk: proposal.risk,
      changedLines: changed,
    },
  });

  await enqueue("reviewer", out);
}

consume("proposer", handler);
