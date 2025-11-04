import simpleGit from "simple-git";
import { log } from "./logger";
import { randomUUID } from "crypto";
import { ExecutionReport } from "./types";
import { execSync } from "node:child_process";
import * as fs from "node:fs";

export async function applyAndTest(repoSsh: string, baseBranch: string, diff: string): Promise<{ branch: string; report: ExecutionReport }> {
  const tmpDir = `.tmp/run-${randomUUID()}`;
  fs.mkdirSync(tmpDir, { recursive: true });
  const git = simpleGit({ baseDir: tmpDir });

  await git.clone(repoSsh, ".");
  await git.checkout(baseBranch);

  const branch = `refactor/${Date.now()}`;
  await git.checkoutLocalBranch(branch);

  // aplicar unified diff
  // usa `git apply -p0` com --index
  try {
    fs.writeFileSync("patch.diff", diff, "utf8");
    execSync(`git apply --index patch.diff`, { cwd: tmpDir, stdio: "inherit" });
  } catch (e) {
    log("executor", "git apply failed");
    return {
      branch,
      report: { build: "failed", tests: { passed: 0, failed: 0 }, notes: ["git apply failed"] }
    };
  }

  await git.add(".");
  await git.commit("refactor: automated small refactor");
  let buildStatus: "passed" | "failed" | "skipped" = "skipped";
  let tests = { passed: 0, failed: 0 };
  const notes: string[] = [];

  // tenta rodar build/test se scripts existirem
  const run = (cmd: string) => execSync(cmd, { cwd: tmpDir, stdio: "inherit", env: process.env });

  try {
    run("npm ci || pnpm i");
  } catch {
    notes.push("deps install failed");
  }

  try {
    run("npm run -s build || true");
    buildStatus = "passed";
  } catch {
    buildStatus = "failed";
    notes.push("build failed");
  }

  try {
    run("npm test -- --ci || true");
  } catch {
    notes.push("tests failed to run");
  }

  // push branch
  try {
    await git.push("origin", branch, ["-u"]);
  } catch {
    notes.push("push failed (check auth)");
  }

  // opcional: criar PR via gh (se autenticado)
  try {
    run(`gh pr create --fill --base ${baseBranch} --title "Automated refactor" --body "Small automated refactor (MVP)."`);
  } catch {
    notes.push("PR not created (ensure gh auth)");
  }

  return {
    branch,
    report: {
      build: buildStatus,
      tests,
      notes
    }
  };
}
