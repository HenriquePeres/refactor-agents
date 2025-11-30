// Diff sintético mínimo e válido para o git apply.
// Supõe que o arquivo alvo tem o conteúdo exato do sandbox.
export function generateSyntheticDiff(filePath: string): string {
  return [
    `--- a/${filePath}`,
    `+++ b/${filePath}`,
    `@@ -1,4 +1,8 @@`,
    `-export function example(a: number, b: number) {`,
    `-  const sum = a + b;`,
    `-  return sum;`,
    `-}`,
    `+export function example(a: number, b: number) {`,
    `+  const sum = computeSum(a, b);`,
    `+  return sum;`,
    `+}`,
    `+`,
    `+function computeSum(a: number, b: number) {`,
    `+  return a + b;`,
    `+}`,
    ``,
  ].join("\n");
}
