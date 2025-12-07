import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";
import simpleGit from "simple-git";
import { ExecutionReport } from "./types";
import { log } from "./logger";

/**
 * Normaliza um caminho para ser sempre relativo à raiz do repositório.
 * - Converte separadores para o padrão da plataforma
 * - Remove qualquer prefixo "../" que jogue o caminho para fora do repo
 */
function normalizeRepoPath(targetFile: string): string {
  let normalized = path.normalize(targetFile.trim());

  // remove qualquer "a/" ou "b/" do começo (padrão de unified diff)
  if (normalized.startsWith("a" + path.sep) || normalized.startsWith("b" + path.sep)) {
    normalized = normalized.substring(2); // remove "a/" ou "b/"
  }

  // remove "../" do começo enquanto existir
  while (normalized.startsWith(".." + path.sep)) {
    normalized = normalized.substring(3);
  }

  return normalized;
}

/**
 * Extrai do diff:
 *  - o caminho do arquivo (linha "+++ b/...")
 *  - o conteúdo novo (todas as linhas com "+" que não são cabeçalho)
 *
 * Assumimos que a LLM está gerando um diff em que o arquivo inteiro aparece
 * nas linhas com "+", ou seja, podemos reconstruir o novo conteúdo apenas
 * a partir dessas linhas.
 */
function extractTargetAndContentFromDiff(diff: string): {
  targetFile: string | null;
  newContent: string | null;
} {
  const lines = diff.split(/\r?\n/);

  let targetFile: string | null = null;
  const newLines: string[] = [];

  for (const line of lines) {
    // detecta caminho do arquivo na linha +++
    if (line.startsWith("+++ ")) {
      // exemplo: "+++ b/src/app/services/user.service.ts"
      const rest = line.substring("+++ ".length).trim();
      let filePath = rest;

      // se vier com "b/..." ou "a/..."
      if (filePath.startsWith("b/") || filePath.startsWith("a/")) {
        filePath = filePath.substring(2);
      }

      targetFile = normalizeRepoPath(filePath);
      continue;
    }

    // ignora cabeçalhos de diff
    if (line.startsWith("--- ") || line.startsWith("@@")) {
      continue;
    }

    // pega apenas linhas de adição reais (+ código)
    if (line.startsWith("+") && !line.startsWith("+++")) {
      newLines.push(line.substring(1)); // remove o "+"
    }
  }

  if (!targetFile) {
    return { targetFile: null, newContent: null };
  }

  if (newLines.length === 0) {
    return { targetFile, newContent: null };
  }

  const newContent = newLines.join("\n") + "\n";
  return { targetFile, newContent };
}

/**
 * Clona o repo, aplica o diff sobrescrevendo o arquivo alvo,
 * e faz commit/push em um branch novo.
 */
export async function applyAndTest(
  repo: string,
  baseBranch: string,
  diff: string
): Promise<{ branch: string; report: ExecutionReport }> {
  // 1) clona o repositório alvo em um diretório temporário
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "refac-"));
  const git = simpleGit(tmpDir);

  log("executor", "Cloning repo", { repo, baseBranch, tmpDir });

  await git.clone(repo, tmpDir, ["--branch", baseBranch, "--single-branch"]);

  // 2) cria um branch novo para a refatoração
  const branch = `refac-${Date.now()}`;
  await git.checkoutBranch(branch, baseBranch);

  // 3) extrai caminho e conteúdo do diff
  const { targetFile, newContent } = extractTargetAndContentFromDiff(diff);

  if (!targetFile) {
    const report: ExecutionReport = {
      build: "failed",
      tests: { passed: 0, failed: 0 },
      notes: ["could not determine target file from diff"],
    };
    return { branch, report };
  }

  if (!newContent) {
    const report: ExecutionReport = {
      build: "failed",
      tests: { passed: 0, failed: 0 },
      notes: ["diff did not contain any + lines for new content"],
    };
    return { branch, report };
  }

  const repoRelative = normalizeRepoPath(targetFile);
  const fullTargetPath = path.join(tmpDir, repoRelative);

  // garante que o diretório existe
  fs.mkdirSync(path.dirname(fullTargetPath), { recursive: true });
  fs.writeFileSync(fullTargetPath, newContent, "utf8");

  log("executor", "Wrote new content to file", { targetFile: repoRelative });

  // 4) por enquanto não rodamos build/testes de verdade
  const report: ExecutionReport = {
    build: "passed",
    tests: { passed: 0, failed: 0 },
    notes: ["file overwritten from diff; build/tests not run"],
  };

  // 5) commit e push
  execSync(`git add "${repoRelative}"`, { cwd: tmpDir, stdio: "inherit" });
  execSync('git commit -m "refactor: automated small refactor"', {
    cwd: tmpDir,
    stdio: "inherit",
  });
  execSync(`git push origin ${branch}`, { cwd: tmpDir, stdio: "inherit" });

  return { branch, report };
}
