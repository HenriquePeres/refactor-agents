export type EslintEvidence = {
  errors: number;
  warnings: number;
  notes: string[];
  hotspots: string[]; // caminhos de arquivos relevantes
};

export async function runEslint(_targets: string[]): Promise<EslintEvidence> {
  // MVP inicial: stub. Depois integrar eslint via Node API ou spawn.
  return {
    errors: 12,
    warnings: 5,
    notes: ["stubbed ESLint results (integrate real runner next sprint)"],
    hotspots: _targets
  };
}
