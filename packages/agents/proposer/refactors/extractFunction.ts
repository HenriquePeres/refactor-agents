// Stub da refatoração: por enquanto retorna um diff sintético (exemplo).
// Na Sprint 2, trocar por ts-morph para gerar mudanças AST-seguras.

export function generateSyntheticDiff(filePath: string): string {
  // unified diff mínimo de exemplo (não quebra nada)
  return `diff --git a/${filePath} b/${filePath}
index 0000001..0000002 100644
--- a/${filePath}
+++ b/${filePath}
@@ -1,5 +1,9 @@
 export function example(a: number, b: number) {
-  const sum = a + b;
-  return sum;
+  // refactor: extracted inner logic (synthetic)
+  const sum = computeSum(a, b);
+  return sum;
 }
+
+function computeSum(a: number, b: number) {
+  return a + b;
+}
`;
}
