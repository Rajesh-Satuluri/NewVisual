/* ============================================================
   Structural validator — the checks that make a schema well-formed
   regardless of whether it is OLTP or analytics.
   ============================================================ */

import {
  findColumn,
  findEntity,
  foreignKeyColumns,
  nameEq,
  primaryKeyColumns,
  type SchemaIR,
} from '../ir/index.js';
import { type Finding } from './findings.js';

export function validateStructural(ir: SchemaIR): Finding[] {
  const out: Finding[] = [];

  for (const e of ir.entities) {
    // Every entity needs at least one column.
    if (e.columns.length === 0) {
      out.push({
        rule: 'EMPTY_ENTITY',
        severity: 'error',
        entity: e.name,
        message: `Entity "${e.name}" has no columns.`,
        hint: 'Add attributes, starting with a primary key.',
      });
    }

    // Every entity needs a primary key.
    if (primaryKeyColumns(e).length === 0) {
      out.push({
        rule: 'PK_MISSING',
        severity: 'error',
        entity: e.name,
        message: `Entity "${e.name}" has no primary key.`,
        hint: 'Mark a column as PK (or a surrogate key) so rows are uniquely identifiable.',
      });
    }

    // Duplicate column names within an entity.
    const seen = new Set<string>();
    for (const c of e.columns) {
      const key = c.name.trim().toLowerCase();
      if (seen.has(key)) {
        out.push({
          rule: 'DUP_COLUMN',
          severity: 'error',
          entity: e.name,
          column: c.name,
          message: `Duplicate column "${c.name}" in "${e.name}".`,
          hint: 'Column names must be unique within a table.',
        });
      }
      seen.add(key);
    }

    // Foreign keys must resolve to a real entity + column.
    for (const c of foreignKeyColumns(e)) {
      if (!c.fkTo) {
        out.push({
          rule: 'FK_NO_TARGET',
          severity: 'warning',
          entity: e.name,
          column: c.name,
          message: `Column "${c.name}" is marked FK but points at nothing.`,
          hint: 'Set the target entity and column for this foreign key.',
        });
        continue;
      }
      const target = findEntity(ir, c.fkTo.entity);
      if (!target) {
        out.push({
          rule: 'FK_UNRESOLVED',
          severity: 'error',
          entity: e.name,
          column: c.name,
          message: `FK "${e.name}.${c.name}" references missing entity "${c.fkTo.entity}".`,
          hint: 'Create the referenced table or fix the reference.',
        });
      } else if (!findColumn(target, c.fkTo.column)) {
        out.push({
          rule: 'FK_UNRESOLVED',
          severity: 'error',
          entity: e.name,
          column: c.name,
          message: `FK "${e.name}.${c.name}" references missing column "${target.name}.${c.fkTo.column}".`,
          hint: 'Point the foreign key at an existing column (usually the target PK).',
        });
      }
    }
  }

  // Many-to-many relationships should be resolved through a junction/bridge table.
  for (const r of ir.relationships) {
    if (r.cardinality !== 'N:M') continue;
    const from = findEntity(ir, r.from);
    const to = findEntity(ir, r.to);
    const label = `${from?.name ?? r.from} <-> ${to?.name ?? r.to}`;
    const hasBridge = ir.entities.some((e) => {
      if (e.role === 'bridge') return true;
      const fks = foreignKeyColumns(e);
      const refs = new Set(fks.map((c) => c.fkTo?.entity).filter(Boolean) as string[]);
      const pointsToFrom = [...refs].some((id) => id === r.from || (from && nameEq(id, from.name)));
      const pointsToTo = [...refs].some((id) => id === r.to || (to && nameEq(id, to.name)));
      return pointsToFrom && pointsToTo;
    });
    if (!hasBridge) {
      out.push({
        rule: 'MN_WITHOUT_JUNCTION',
        severity: 'warning',
        relationship: r.id,
        message: `Many-to-many "${label}" is not resolved by a junction table.`,
        hint: 'Introduce a bridge table holding an FK to each side (composite PK).',
      });
    }
  }

  return out;
}
