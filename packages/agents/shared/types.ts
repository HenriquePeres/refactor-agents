export type Intent = "REQUEST" | "INFORM" | "PROPOSE" | "CRITIQUE" | "ACCEPT" | "REJECT";

export interface AgentContext {
  repo: string;
  branch: string;
  language: "TypeScript" | "JavaScript" | "Python" | "Java";
  targets: string[];          // arquivos-alvo
}

export interface Proposal {
  title: string;
  diff: string;               // unified diff
  rationale: string;
  risk: "low" | "medium" | "high";
  estimated_time?: string;
}

export interface ExecutionReport {
  build: "passed" | "failed" | "skipped"; 
  tests: { passed: number; failed: number };
  lint?: { errors_before?: number; errors_after?: number };
  metrics_delta?: Record<string, number>;
  notes?: string[];
}

export interface Msg<T = unknown> {
  intent: Intent;
  task_id: string;
  sender: string;
  target?: string;
  context: AgentContext;
  evidence?: Record<string, unknown>;
  payload?: T;
  created_at: string;
}


// >>> NOVO: payload do Reviewer → Executor
export interface ReviewerDecisionPayload {
  changedLines: number;
  reason: string;
  proposal: Proposal;
}
