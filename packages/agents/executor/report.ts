import { ExecutionReport } from "../shared/types";

export function renderReportMd(report: ExecutionReport): string {
  return `# Automated Refactor Report

**Build:** ${report.build}
**Tests:** passed=${report.tests.passed} failed=${report.tests.failed}

${report.notes && report.notes.length ? `\n## Notes\n- ${report.notes.join("\n- ")}\n` : ""}
`;
}
