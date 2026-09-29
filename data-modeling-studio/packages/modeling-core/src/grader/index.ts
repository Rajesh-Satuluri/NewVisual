/* ============================================================
   Grader — evaluates a learner's SchemaIR against a Scenario's
   declarative rubric. Pure and deterministic: the same engine backs
   auto-graded challenges and the scripted mock interview, so feedback
   never contradicts itself.
   ============================================================ */

import {
  columnHasKey,
  findColumn,
  findEntity,
  nameEq,
  type SchemaIR,
} from '../ir/index.js';
import { normalFormAtLeast } from '../validators/normalization.js';
import { validateAll } from '../validators/index.js';
import {
  type GradeResult,
  type RubricCheck,
  type RubricRule,
  type RuleResult,
  type Scenario,
} from './types.js';

export * from './types.js';

function evalCheck(ir: SchemaIR, check: RubricCheck): boolean {
  switch (check.kind) {
    case 'hasEntity':
      return findEntity(ir, check.entity) !== undefined;

    case 'hasColumn': {
      const e = findEntity(ir, check.entity);
      return !!e && findColumn(e, check.column) !== undefined;
    }

    case 'entityRole': {
      const e = findEntity(ir, check.entity);
      return !!e && e.role === check.role;
    }

    case 'columnIsKey': {
      const e = findEntity(ir, check.entity);
      const c = e && findColumn(e, check.column);
      return !!c && columnHasKey(c, check.key);
    }

    case 'hasRelationship': {
      const from = findEntity(ir, check.from);
      const to = findEntity(ir, check.to);
      if (!from || !to) return false;
      return ir.relationships.some((r) => {
        const rf = findEntity(ir, r.from);
        const rt = findEntity(ir, r.to);
        if (!rf || !rt) return false;
        const matchDir =
          (nameEq(rf.name, from.name) && nameEq(rt.name, to.name)) ||
          (nameEq(rf.name, to.name) && nameEq(rt.name, from.name));
        if (!matchDir) return false;
        return check.cardinality === undefined || r.cardinality === check.cardinality;
      });
    }

    case 'grainDeclared': {
      const e = findEntity(ir, check.entity);
      return !!e && !!e.grain && e.grain.trim() !== '';
    }

    case 'scdType': {
      const e = findEntity(ir, check.entity);
      return !!e && e.scd === check.scd;
    }

    case 'minNormalForm': {
      const e = findEntity(ir, check.entity);
      return !!e && normalFormAtLeast(e, check.nf);
    }

    case 'noFindings': {
      let findings = validateAll(ir);
      if (check.severity) findings = findings.filter((f) => f.severity === check.severity);
      if (check.rule) findings = findings.filter((f) => f.rule === check.rule);
      return findings.length === 0;
    }
  }
}

function evalRule(ir: SchemaIR, rule: RubricRule): RuleResult {
  return {
    ruleId: rule.id,
    description: rule.description,
    weight: rule.weight,
    passed: evalCheck(ir, rule.check),
    ...(rule.hint !== undefined ? { hint: rule.hint } : {}),
  };
}

export function grade(ir: SchemaIR, scenario: Scenario): GradeResult {
  const results = scenario.rubric.map((r) => evalRule(ir, r));
  const totalWeight = results.reduce((s, r) => s + r.weight, 0) || 1;
  const earned = results.filter((r) => r.passed).reduce((s, r) => s + r.weight, 0);
  const score = earned / totalWeight;

  return {
    score,
    percent: Math.round(score * 100),
    passed: results.filter((r) => r.passed),
    failed: results.filter((r) => !r.passed),
    results,
  };
}
