/* ============================================================
   Normalization validator — reasons about normal forms from the
   learner's declared functional dependencies (FDs) and primary key.

   This is intentionally FD-driven rather than magic: the learner
   states the dependencies they believe hold, and we tell them what
   normal form that implies and which dependency is the problem. That
   mirrors how normalization is actually taught and argued in an
   interview.
   ============================================================ */

import {
  primeAttributes,
  type Column,
  type Entity,
  type FunctionalDependency,
  type SchemaIR,
} from '../ir/index.js';
import { type Finding } from './findings.js';

export type NormalForm = '0NF' | '1NF' | '2NF' | '3NF' | 'BCNF';

const lc = (s: string) => s.trim().toLowerCase();
const asSet = (xs: string[]) => new Set(xs.map(lc));
const isSubset = (a: Set<string>, b: Set<string>) => [...a].every((x) => b.has(x));

function violates1NF(entity: Entity): Column[] {
  return entity.columns.filter((c) => c.multivalued === true || lc(c.type) === 'array');
}

/** PK columns as a lowercase set. A determinant is a superkey iff it contains the whole PK. */
function pkSet(entity: Entity): Set<string> {
  return new Set([...primeAttributes(entity)].map(lc));
}

function isSuperkey(det: Set<string>, pk: Set<string>): boolean {
  return pk.size > 0 && isSubset(pk, det);
}

function nonTrivial(fd: FunctionalDependency): boolean {
  const det = asSet(fd.determinant);
  const dep = asSet(fd.dependent);
  return ![...dep].every((x) => det.has(x));
}

interface FdIssue {
  fd: FunctionalDependency;
  kind: 'partial' | 'transitive' | 'bcnf';
}

/** Classify each problematic FD for an entity. */
export function analyzeDependencies(entity: Entity): FdIssue[] {
  const fds = entity.dependencies ?? [];
  const pk = pkSet(entity);
  const prime = primeAttributes(entity);
  const issues: FdIssue[] = [];

  for (const fd of fds) {
    if (!nonTrivial(fd)) continue;
    const det = asSet(fd.determinant);
    const superkey = isSuperkey(det, pk);
    const dependentHasNonPrime = fd.dependent.some((d) => !prime.has(lc(d)));

    if (superkey) continue; // fine for every normal form

    // Partial dependency: determinant is a proper, non-empty subset of a composite PK.
    const properSubsetOfPk =
      pk.size > 1 && det.size > 0 && det.size < pk.size && isSubset(det, pk);

    if (properSubsetOfPk && dependentHasNonPrime) {
      issues.push({ fd, kind: 'partial' });
    } else if (dependentHasNonPrime) {
      issues.push({ fd, kind: 'transitive' });
    } else {
      // determinant is not a superkey but dependent is prime -> fine for 3NF, breaks BCNF.
      issues.push({ fd, kind: 'bcnf' });
    }
  }
  return issues;
}

/** The highest normal form the entity satisfies, given its declared FDs. */
export function classifyNormalForm(entity: Entity): NormalForm {
  if (violates1NF(entity).length > 0) return '0NF';
  const issues = analyzeDependencies(entity);
  if (issues.some((i) => i.kind === 'partial')) return '1NF';
  if (issues.some((i) => i.kind === 'transitive')) return '2NF';
  if (issues.some((i) => i.kind === 'bcnf')) return '3NF';
  return 'BCNF';
}

const NF_RANK: Record<NormalForm, number> = {
  '0NF': 0,
  '1NF': 1,
  '2NF': 2,
  '3NF': 3,
  BCNF: 4,
};

export function normalFormAtLeast(entity: Entity, target: NormalForm): boolean {
  return NF_RANK[classifyNormalForm(entity)] >= NF_RANK[target];
}

const fmt = (fd: FunctionalDependency) =>
  `{${fd.determinant.join(', ')}} -> {${fd.dependent.join(', ')}}`;

export function validateNormalization(ir: SchemaIR): Finding[] {
  const out: Finding[] = [];

  for (const e of ir.entities) {
    for (const c of violates1NF(e)) {
      out.push({
        rule: 'NF_1NF_REPEATING_GROUP',
        severity: 'warning',
        entity: e.name,
        column: c.name,
        message: `Column "${e.name}.${c.name}" holds a repeating/multivalued group (violates 1NF).`,
        hint: 'Split the repeating group into its own related table with one value per row.',
      });
    }

    for (const issue of analyzeDependencies(e)) {
      if (issue.kind === 'partial') {
        out.push({
          rule: 'NF_2NF_PARTIAL_DEPENDENCY',
          severity: 'warning',
          entity: e.name,
          message: `Partial dependency ${fmt(issue.fd)} on part of the composite key (violates 2NF).`,
          hint: 'Move the partially-dependent attributes to a table keyed by that part of the key.',
        });
      } else if (issue.kind === 'transitive') {
        out.push({
          rule: 'NF_3NF_TRANSITIVE_DEPENDENCY',
          severity: 'warning',
          entity: e.name,
          message: `Transitive dependency ${fmt(issue.fd)} through a non-key attribute (violates 3NF).`,
          hint: 'Extract the determinant and its dependents into their own table.',
        });
      } else {
        out.push({
          rule: 'NF_BCNF_DETERMINANT_NOT_SUPERKEY',
          severity: 'info',
          entity: e.name,
          message: `Determinant of ${fmt(issue.fd)} is not a superkey (violates BCNF).`,
          hint: 'Decompose so every determinant is a candidate key.',
        });
      }
    }
  }

  return out;
}
