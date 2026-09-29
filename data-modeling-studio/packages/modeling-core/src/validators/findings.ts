/* ============================================================
   Findings — the single result shape every validator emits and
   the UI, grader, and (future) scripted interviewer all consume.
   ============================================================ */

export type Severity = 'error' | 'warning' | 'info';

export interface Finding {
  /** Stable machine code, e.g. 'PK_MISSING'. Group/filter on this. */
  rule: string;
  severity: Severity;
  message: string;
  /** Optional anchors so the canvas can highlight the offending element. */
  entity?: string;
  column?: string;
  relationship?: string;
  /** Actionable, learner-facing next step. */
  hint?: string;
}

export function finding(f: Finding): Finding {
  return f;
}
