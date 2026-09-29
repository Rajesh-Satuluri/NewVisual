/* ============================================================
   Scenario + rubric types. A Scenario is 100% JSON-serializable so
   the whole content library lives in /packages/content and needs no
   code changes to grow. Rubric checks are a small declarative DSL
   (no functions) evaluated by the grader against a learner's IR.
   ============================================================ */

import { type Cardinality, type EntityRole, type ScdType } from '../ir/types.js';
import { type NormalForm } from '../validators/normalization.js';
import { type Severity } from '../validators/findings.js';

/** A single declarative assertion about the learner's model. */
export type RubricCheck =
  | { kind: 'hasEntity'; entity: string }
  | { kind: 'hasColumn'; entity: string; column: string }
  | { kind: 'entityRole'; entity: string; role: EntityRole }
  | { kind: 'columnIsKey'; entity: string; column: string; key: 'PK' | 'FK' | 'surrogate' | 'composite' }
  | { kind: 'hasRelationship'; from: string; to: string; cardinality?: Cardinality }
  | { kind: 'grainDeclared'; entity: string }
  | { kind: 'scdType'; entity: string; scd: ScdType }
  | { kind: 'minNormalForm'; entity: string; nf: NormalForm }
  | { kind: 'noFindings'; severity?: Severity; rule?: string };

export interface RubricRule {
  id: string;
  /** Learner-facing description of what good looks like. */
  description: string;
  /** Relative weight toward the total score. */
  weight: number;
  check: RubricCheck;
  /** Shown when the rule is NOT satisfied. */
  hint?: string;
}

export interface Scenario {
  id: string;
  title: string;
  /** Difficulty label, mirroring how interview banks tag problems. */
  difficulty: 'easy' | 'medium' | 'hard';
  /** Deliberately vague, interview-style prompt. */
  prompt: string;
  /** Requirements revealed only when the learner asks the right question. */
  hiddenRequirements?: string[];
  /** Concept ids this scenario exercises (for the mastery graph). */
  concepts?: string[];
  /** The thing most people get wrong — surfaced after grading. */
  commonTrap?: string;
  /** Mid-interview requirement changes for the scripted interviewer. */
  curveballs?: string[];
  rubric: RubricRule[];
}

export interface RuleResult {
  ruleId: string;
  description: string;
  weight: number;
  passed: boolean;
  hint?: string;
}

export interface GradeResult {
  /** 0..1 weighted score. */
  score: number;
  /** Convenience percentage, rounded. */
  percent: number;
  passed: RuleResult[];
  failed: RuleResult[];
  results: RuleResult[];
}
