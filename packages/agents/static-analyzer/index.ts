// packages/agents/static-analyzer/index.ts
import { consume, enqueue } from "../shared/queue";
import { Msg } from "../shared/types";
import { log } from "../shared/logger";
import { runEslint } from "./eslintRunner";
import { analyzeFile } from "./analyzeFile";

async function handler(msg: Msg) {
  log("static-analyzer", "received", {
    task_id: msg.task_id,
    targets: msg.context.targets,
  });

  const targetFile = msg.context.targets[0];

  // 1. Rodar ESLint real
  const eslintSummary = await runEslint([targetFile]);

  // 2. Rodar métricas reais
  const { metrics, hotspots } = analyzeFile(targetFile);

  // 3. Construir perfil de problemas
  const problemProfile = {
    eslintErrors: eslintSummary.totalErrors,
    eslintWarnings: eslintSummary.totalWarnings,
    mostCommonRules: eslintSummary.mostCommonRules,
    hotspotReasons: hotspots.map(h => h.reason),
  };

  log("static-analyzer", "computed metrics & hotspots", {
    metrics,
    hotspots,
    problemProfile,
  });

  const out: Msg = {
    intent: "INFORM",
    task_id: msg.task_id,
    sender: "static-analyzer",
    context: msg.context,
    evidence: {
      eslint: eslintSummary,
      metrics,
      hotspots,
      problemProfile,
    },
    created_at: new Date().toISOString(),
  };

  await enqueue("proposer", out);

  log("static-analyzer", "sent INFORM to proposer", {
    task_id: msg.task_id,
  });
}

consume("static-analyzer", handler);
