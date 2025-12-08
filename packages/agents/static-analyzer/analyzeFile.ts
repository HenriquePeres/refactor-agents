// packages/agents/static-analyzer/analyzeFile.ts
import { Project } from "ts-morph";
import * as fs from "node:fs";

export interface FileMetrics {
  loc: number;
  cyclomaticAvg: number;
  highestCyclomatic: {
    name: string;
    complexity: number;
    startLine: number;
  };
  totalFunctions: number;
}

export interface Hotspot {
  reason: string;
  detail: string;
}

export interface AnalyzerResult {
  metrics: FileMetrics;
  hotspots: Hotspot[];
}

export function analyzeFile(filePath: string): AnalyzerResult {
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
  });

  const source = project.addSourceFileAtPath(filePath);

  const text = fs.readFileSync(filePath, "utf8");
  const loc = text.split("\n").length;

  let cycloTotals = 0;
  let cycloCount = 0;

  let maxCyclo = {
    name: "<none>",
    complexity: 0,
    startLine: 0,
  };

  const functions = source.getFunctions();
  const methods = source.getClasses().flatMap(c => c.getMethods());

  const allFuncs = [...functions, ...methods];
  
  for (const fn of allFuncs) {
    const body = fn.getBody();

    if (!body) continue;

    const statements = body.getDescendantStatements();

    let cyclo = 1;
    for (const stmt of statements) {
      const kind = stmt.getKindName();
      if (
        kind.includes("If") ||
        kind.includes("For") ||
        kind.includes("While") ||
        kind.includes("Switch") ||
        kind.includes("Case") ||
        kind.includes("ConditionalExpression")
      ) {
        cyclo++;
      }
    }

    cycloTotals += cyclo;
    cycloCount++;

    if (cyclo > maxCyclo.complexity) {
      maxCyclo = {
        name: fn.getName() ?? "<anonymous>",
        complexity: cyclo,
        startLine: fn.getStartLineNumber(),
      };
    }
  }

  const cyclomaticAvg = cycloCount > 0 ? cycloTotals / cycloCount : 0;

  const hotspots: Hotspot[] = [];

  // Hotspot 1 — Arquivo muito grande
  if (loc > 200) {
    hotspots.push({
      reason: "high-loc",
      detail: `Arquivo possui ${loc} linhas (alto).`,
    });
  }

  // Hotspot 2 — Complexidade média alta
  if (cyclomaticAvg > 10) {
    hotspots.push({
      reason: "high-complexity-avg",
      detail: `Complexidade média ${cyclomaticAvg.toFixed(2)}.`,
    });
  }

  // Hotspot 3 — Função específica muito complexa
  if (maxCyclo.complexity >= 15) {
    hotspots.push({
      reason: "very-complex-function",
      detail: `Função ${maxCyclo.name} possui complexidade ${maxCyclo.complexity}.`,
    });
  }

  return {
    metrics: {
      loc,
      cyclomaticAvg,
      highestCyclomatic: maxCyclo,
      totalFunctions: allFuncs.length,
    },
    hotspots,
  };
}
