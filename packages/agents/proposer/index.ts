import "../shared/config";   // tem que ser a PRIMEIRA importação
import fs from "node:fs";
import { consume, enqueue } from "../shared/queue";
import { Msg, Proposal } from "../shared/types";
import { log } from "../shared/logger";
import { generateRefactorDiff } from "../shared/llm";

async function handler(msg: Msg) {
  log("proposer", "received", msg.evidence);
  //console.log("LLM_API_KEY length:", process.env.LLM_API_KEY?.length);

  const targetFile = msg.context.targets[0];
  
  // Lê o código atual do arquivo alvo (relativo ao repo local onde o agente está rodando)
  const code = fs.readFileSync(targetFile, "utf8");

  // Monta instruções para o LLM a partir de contexto e evidências estáticas
  const eslint = (msg.evidence?.eslint ?? {}) as any;
  const metrics = (msg.evidence?.metrics ?? {}) as any;

  const instructionsLines: string[] = [];

  instructionsLines.push(
    `Refatore o código para melhorar legibilidade e organização, preservando o comportamento.`
  );

  if (typeof eslint.errors === "number" || typeof eslint.warnings === "number") {
    instructionsLines.push(
      `Considere que a análise estática encontrou aproximadamente ${eslint.errors ?? "?"} erros e ${eslint.warnings ?? "?"} avisos.`
    );
  }

  if (metrics.cyclomatic) {
    instructionsLines.push(
      `Reduza complexidade ciclomática (valor atual aproximado: ${metrics.cyclomatic}).`
    );
  }

  instructionsLines.push(
    `Evite mudanças de API pública e mantenha nomes de métodos expostos o máximo possível.`
  );

  const instructions = instructionsLines.join("\n");

  let diff: string;
  let risk: Proposal["risk"] = "medium";
  let rationale = "Refatoração sugerida automaticamente pelo agente de proposta.";

  try {
    diff = await generateRefactorDiff({
      filePath: targetFile,
      code,
      instructions,
    });

    // Heurística simples: se o diff parece pequeno, considera risco baixo
    const changedLines = diff
      .split("\n")
      .filter((l) => l.startsWith("+") && !l.startsWith("+++")).length;

    if (changedLines < 40) {
      risk = "low";
      rationale = "Mudanças relativamente pequenas com foco em limpeza de código.";
    } else if (changedLines > 150) {
      risk = "high";
      rationale = "Muitas linhas alteradas; pode introduzir regressões.";
    }
  } catch (err: any) {
    // Em caso de erro no LLM, o proposer simplesmente não envia proposta
    log("proposer", "LLM error, aborting proposal", { error: String(err) });
    return;
  }

  const proposal: Proposal = {
    title: "Refatoração automática com GPT-5.1",
    diff,
    rationale,
    risk,
    estimated_time: "15min",
  };

  const out: Msg<Proposal> = {
    intent: "PROPOSE",
    task_id: msg.task_id,
    sender: "proposer",
    context: msg.context,
    payload: proposal,
    created_at: new Date().toISOString(),
  };


  console.log("===== DIFF GERADO PELA LLM =====");
  console.log(diff);
  console.log("===== FIM DO DIFF =====");
  await enqueue("reviewer", out);
}

consume("proposer", handler);


