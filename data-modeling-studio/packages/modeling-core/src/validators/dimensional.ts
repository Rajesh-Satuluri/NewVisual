/* ============================================================
   Dimensional validator — checks specific to analytics / warehouse
   models (star & snowflake schemas, facts, dimensions, SCD).
   Only entities that declare a `role` are considered, so this stays
   silent for pure OLTP sketches.
   ============================================================ */

import {
  columnHasKey,
  foreignKeyColumns,
  type Column,
  type Entity,
  type SchemaIR,
} from '../ir/index.js';
import { type Finding } from './findings.js';

const NUMERIC = /^(int|integer|bigint|smallint|numeric|decimal|number|float|double|real|money)/i;

/** Heuristic: a measure is a numeric, non-key column on a fact table. */
function measureColumns(entity: Entity): Column[] {
  return entity.columns.filter(
    (c) => NUMERIC.test(c.type) && !columnHasKey(c, 'PK') && !columnHasKey(c, 'FK') && !c.fkTo,
  );
}

/** Columns that look like SCD2 effective-dating / current-flag bookkeeping. */
function hasScd2Bookkeeping(entity: Entity): boolean {
  const names = entity.columns.map((c) => c.name.toLowerCase());
  const hasFrom = names.some((n) => /(effective|valid|start).*(from|date|_ts|_at)|^valid_from$/.test(n));
  const hasTo = names.some((n) => /(effective|valid|end|expir).*(to|date|_ts|_at)|^valid_to$/.test(n));
  const hasCurrent = names.some((n) => /(is_current|current_flag|is_active)/.test(n));
  return (hasFrom && hasTo) || hasCurrent;
}

export function validateDimensional(ir: SchemaIR): Finding[] {
  const out: Finding[] = [];
  const hasAnyRole = ir.entities.some((e) => e.role);
  if (!hasAnyRole) return out;

  for (const e of ir.entities) {
    if (e.role === 'fact') {
      if (!e.grain || e.grain.trim() === '') {
        out.push({
          rule: 'DIM_FACT_NO_GRAIN',
          severity: 'error',
          entity: e.name,
          message: `Fact table "${e.name}" has no declared grain.`,
          hint: 'State exactly one row-per-what, e.g. "one row per order line item".',
        });
      }
      if (foreignKeyColumns(e).length === 0) {
        out.push({
          rule: 'DIM_FACT_NO_DIMENSIONS',
          severity: 'warning',
          entity: e.name,
          message: `Fact table "${e.name}" has no foreign keys to any dimension.`,
          hint: 'A fact connects to dimensions via FKs; add dimension references.',
        });
      }
      if (measureColumns(e).length === 0) {
        out.push({
          rule: 'DIM_FACT_NO_MEASURES',
          severity: 'warning',
          entity: e.name,
          message: `Fact table "${e.name}" has no numeric measures.`,
          hint: 'Facts usually carry additive measures (quantity, amount). Confirm this is a factless fact if intentional.',
        });
      }
    }

    if (e.role === 'dimension') {
      if (e.scd === undefined) {
        out.push({
          rule: 'DIM_SCD_UNDECLARED',
          severity: 'info',
          entity: e.name,
          message: `Dimension "${e.name}" does not declare an SCD strategy.`,
          hint: 'Decide how attribute changes are handled: Type 1 (overwrite), Type 2 (versioned history), etc.',
        });
      }
      if (e.scd === 2 && !hasScd2Bookkeeping(e)) {
        out.push({
          rule: 'DIM_SCD2_NO_VERSION_COLUMNS',
          severity: 'warning',
          entity: e.name,
          message: `Dimension "${e.name}" is SCD Type 2 but has no effective-dating / current-flag columns.`,
          hint: 'Add valid_from, valid_to, and is_current (plus a surrogate key) to version rows.',
        });
      }
      if (e.scd === 2 && !e.columns.some((c) => columnHasKey(c, 'surrogate'))) {
        out.push({
          rule: 'DIM_SCD2_NO_SURROGATE',
          severity: 'info',
          entity: e.name,
          message: `SCD Type 2 dimension "${e.name}" should use a surrogate key so each version is distinct.`,
          hint: 'Add a surrogate key; keep the natural/business key as a separate attribute.',
        });
      }
    }
  }

  return out;
}
