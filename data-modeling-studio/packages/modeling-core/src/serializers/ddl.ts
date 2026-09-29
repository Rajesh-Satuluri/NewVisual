/* ============================================================
   DDL serializer — IR -> CREATE TABLE statements.
   Supports a few dialect quirks; the shape is deliberately simple
   and readable (this feeds a live side-panel, not a migration tool).
   ============================================================ */

import {
  columnHasKey,
  findEntity,
  primaryKeyColumns,
  type Column,
  type Entity,
  type SchemaIR,
} from '../ir/index.js';

export type SqlDialect = 'postgres' | 'mysql' | 'snowflake';

function quoteIdent(name: string, dialect: SqlDialect): string {
  const clean = name.trim();
  if (dialect === 'mysql') return `\`${clean}\``;
  return `"${clean}"`;
}

function columnLine(col: Column, dialect: SqlDialect): string {
  const parts = [quoteIdent(col.name, dialect), col.type];
  // Surrogate keys read best as auto-increment identities.
  if (columnHasKey(col, 'surrogate')) {
    if (dialect === 'postgres') parts.push('GENERATED ALWAYS AS IDENTITY');
    else if (dialect === 'mysql') parts.push('AUTO_INCREMENT');
    else parts.push('IDENTITY');
  }
  if (col.nullable === false) parts.push('NOT NULL');
  return '  ' + parts.join(' ');
}

function tableDDL(e: Entity, ir: SchemaIR, dialect: SqlDialect): string {
  const q = (n: string) => quoteIdent(n, dialect);
  const lines: string[] = e.columns.map((c) => columnLine(c, dialect));

  const pk = primaryKeyColumns(e);
  if (pk.length > 0) {
    lines.push(`  PRIMARY KEY (${pk.map((c) => q(c.name)).join(', ')})`);
  }

  for (const c of e.columns) {
    if (!c.fkTo) continue;
    const target = findEntity(ir, c.fkTo.entity);
    const targetName = target ? target.name : c.fkTo.entity;
    lines.push(
      `  FOREIGN KEY (${q(c.name)}) REFERENCES ${q(targetName)} (${q(c.fkTo.column)})`,
    );
  }

  return `CREATE TABLE ${q(e.name)} (\n${lines.join(',\n')}\n);`;
}

export function toDDL(ir: SchemaIR, dialect: SqlDialect = 'postgres'): string {
  return ir.entities.map((e) => tableDDL(e, ir, dialect)).join('\n\n');
}
