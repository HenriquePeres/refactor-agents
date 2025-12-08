import { ESLint } from "eslint";

export interface EslintSummary {
  totalErrors: number;
  totalWarnings: number;
  mostCommonRules: string[];
}

export async function runEslint(targets: string[]): Promise<EslintSummary> {
  try {
    const eslint = new ESLint(); // agora ele vai achar eslint.config.mjs

    const results = await eslint.lintFiles(targets);

    const errorMap = new Map<string, number>();

    let totalErrors = 0;
    let totalWarnings = 0;

    for (const result of results) {
      for (const message of result.messages) {
        if (message.severity === 2) totalErrors++;
        if (message.severity === 1) totalWarnings++;

        const key = message.ruleId ?? "unknown";
        const count = errorMap.get(key) ?? 0;
        errorMap.set(key, count + 1);
      }
    }

    const mostCommonRules = [...errorMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([rule]) => rule);

    return {
      totalErrors,
      totalWarnings,
      mostCommonRules,
    };
  } catch (err: any) {
    console.warn(
      "[static-analyzer] ESLint error, returning empty summary:",
      err?.message ?? err
    );

    return {
      totalErrors: 0,
      totalWarnings: 0,
      mostCommonRules: [],
    };
  }
}
