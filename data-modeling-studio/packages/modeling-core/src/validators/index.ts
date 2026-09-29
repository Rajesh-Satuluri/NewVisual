/* ============================================================
   Validators — aggregate entry point. Running all of them yields the
   full findings list the canvas panel and grader consume.
   ============================================================ */

import { type SchemaIR } from '../ir/index.js';
import { type Finding, type Severity } from './findings.js';
import { validateStructural } from './structural.js';
import { validateNormalization } from './normalization.js';
import { validateDimensional } from './dimensional.js';

export * from './findings.js';
export { validateStructural } from './structural.js';
export {
  validateNormalization,
  classifyNormalForm,
  normalFormAtLeast,
  analyzeDependencies,
  type NormalForm,
} from './normalization.js';
export { validateDimensional } from './dimensional.js';

/** Run every validator and return the combined, severity-sorted findings. */
export function validateAll(ir: SchemaIR): Finding[] {
  const findings = [
    ...validateStructural(ir),
    ...validateNormalization(ir),
    ...validateDimensional(ir),
  ];
  const order: Record<Severity, number> = { error: 0, warning: 1, info: 2 };
  return findings.sort((a, b) => order[a.severity] - order[b.severity]);
}

export function countBySeverity(findings: Finding[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { error: 0, warning: 0, info: 0 };
  for (const f of findings) counts[f.severity] += 1;
  return counts;
}
