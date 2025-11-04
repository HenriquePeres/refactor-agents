export const nowISO = () => new Date().toISOString();

export function countDiffChangedLines(unifiedDiff: string): number {
  return unifiedDiff
    .split("\n")
    .filter(l => l.startsWith("+") || l.startsWith("-"))
    .filter(l => !l.startsWith("+++") && !l.startsWith("---"))
    .length;
}
