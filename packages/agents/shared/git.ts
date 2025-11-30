import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";
import simpleGit from "simple-git";
import { ExecutionReport } from "./types";
import { log } from "./logger";

export async function applyAndTest(
  repo: string,
  baseBranch: string,
  diff: string
): Promise<{ branch: string; report: ExecutionReport }> {
  // 1) clona o repositório alvo em um diretório temporário
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "refac-"));
  const git = simpleGit(tmpDir);

  log("executor", "Cloning repo", { repo, baseBranch });

  await git.clone(repo, tmpDir, ["--branch", baseBranch, "--single-branch"]);

  const branch = `refactor/${Date.now()}`;
  await git.checkoutLocalBranch(branch);

  // 2) interpreta o diff para extrair o arquivo e o novo conteúdo
  const filePathMatch = diff.match(/^\+\+\+ b\/(.+)$/m);
  if (!filePathMatch) {
    const report: ExecutionReport = {
      build: "failed",
      tests: { passed: 0, failed: 0 },
      notes: ["could not find +++ b/<file> line in diff"]
    };
    return { branch, report };
  }

  const targetFile = filePathMatch[1]; // ex: "src/app/services/user.service.ts"

  const lines = diff.split("\n");
  const newLines: string[] = [];
  let inHunk = false;

  for (const line of lines) {
    if (line.startsWith("@@")) {
      inHunk = true;
      continue;
    }
    if (!inHunk) continue;

    if (line.startsWith("+") && !line.startsWith("+++")) {
      newLines.push(line.slice(1)); // remove o "+" do começo
    }
    // linhas que começam com "-" ou " " são ignoradas no MVP
  }

  if (newLines.length === 0) {
    const report: ExecutionReport = {
      build: "failed",
      tests: { passed: 0, failed: 0 },
      notes: ["diff did not contain any + lines for new content"]
    };
    return { branch, report };
  }

  const newContent = newLines.join("\n") + "\n";

  // 3) sobrescreve o arquivo alvo com o novo conteúdo
  const fullTargetPath = path.join(tmpDir, targetFile);
  fs.mkdirSync(path.dirname(fullTargetPath), { recursive: true });
  fs.writeFileSync(fullTargetPath, newContent, "utf8");

  log("executor", "Wrote new content to file", { targetFile });

  // 4) marca como "passed" (por enquanto sem build/test)
  const report: ExecutionReport = {
    build: "passed",
    tests: { passed: 0, failed: 0 },
    notes: ["file overwritten from diff; build/tests not run"]
  };

  // 5) commit e push
  execSync(`git add "${targetFile}"`, { cwd: tmpDir, stdio: "inherit" });
  execSync('git commit -m "refactor: automated small refactor"', {
    cwd: tmpDir,
    stdio: "inherit"
  });
  execSync(`git push origin ${branch}`, { cwd: tmpDir, stdio: "inherit" });

  return { branch, report };
}
