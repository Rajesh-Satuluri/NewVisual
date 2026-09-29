/* ============================================================
   Mermaid serializer — IR -> Mermaid erDiagram, for inline docs and
   lesson embeds that render without any diagramming dependency.
   ============================================================ */

import {
  columnHasKey,
  findEntity,
  type Cardinality,
  type Relationship,
  type SchemaIR,
} from '../ir/index.js';

/** Mermaid crow's-foot notation for a relationship. Modality sets the inner symbol. */
function mermaidRel(r: Relationship): { left: string; right: string } {
  const mandatory = r.modality !== 'optional';
  const one = mandatory ? '||' : '|o';
  const many = mandatory ? '}|' : '}o';
  const map: Record<Cardinality, { left: string; right: string }> = {
    '1:1': { left: one, right: mandatory ? '||' : 'o|' },
    '1:N': { left: one, right: many },
    'N:M': { left: mandatory ? '}|' : '}o', right: many },
  };
  return map[r.cardinality];
}

function sanitize(name: string): string {
  return name.trim().replace(/[^A-Za-z0-9_]/g, '_');
}

export function toMermaid(ir: SchemaIR): string {
  const lines: string[] = ['erDiagram'];

  for (const e of ir.entities) {
    lines.push(`  ${sanitize(e.name)} {`);
    for (const c of e.columns) {
      const key = columnHasKey(c, 'PK') || columnHasKey(c, 'composite') || columnHasKey(c, 'surrogate')
        ? 'PK'
        : c.fkTo || columnHasKey(c, 'FK')
          ? 'FK'
          : '';
      const type = c.type.replace(/[^A-Za-z0-9_]/g, '_') || 'text';
      lines.push(`    ${type} ${sanitize(c.name)}${key ? ' ' + key : ''}`);
    }
    lines.push('  }');
  }

  for (const r of ir.relationships) {
    const from = findEntity(ir, r.from);
    const to = findEntity(ir, r.to);
    if (!from || !to) continue;
    const { left, right } = mermaidRel(r);
    lines.push(`  ${sanitize(from.name)} ${left}--${right} ${sanitize(to.name)} : "${r.cardinality}"`);
  }

  return lines.join('\n');
}
