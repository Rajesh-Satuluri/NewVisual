/* ============================================================
   DBML serializer — IR -> DBML (dbdiagram.io / dbml.dbdiagram.io).
   Lets learners round-trip a model into a shareable diagram.
   ============================================================ */

import {
  columnHasKey,
  findEntity,
  type Column,
  type SchemaIR,
} from '../ir/index.js';

function settings(col: Column): string {
  const s: string[] = [];
  if (columnHasKey(col, 'PK') || columnHasKey(col, 'composite') || columnHasKey(col, 'surrogate')) {
    s.push('pk');
  }
  if (columnHasKey(col, 'surrogate')) s.push('increment');
  if (col.nullable === false) s.push('not null');
  if (col.note) s.push(`note: '${col.note.replace(/'/g, "\\'")}'`);
  return s.length ? ` [${s.join(', ')}]` : '';
}

export function toDBML(ir: SchemaIR): string {
  const tables = ir.entities.map((e) => {
    const cols = e.columns
      .map((c) => `  ${c.name} ${c.type}${settings(c)}`)
      .join('\n');
    return `Table ${e.name} {\n${cols}\n}`;
  });

  const refs: string[] = [];
  for (const e of ir.entities) {
    for (const c of e.columns) {
      if (!c.fkTo) continue;
      const target = findEntity(ir, c.fkTo.entity);
      const targetName = target ? target.name : c.fkTo.entity;
      refs.push(`Ref: ${e.name}.${c.name} > ${targetName}.${c.fkTo.column}`);
    }
  }

  return [...tables, ...(refs.length ? ['', ...refs] : [])].join('\n\n');
}
