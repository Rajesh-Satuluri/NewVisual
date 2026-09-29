import { describe, it, expect } from 'vitest';
import { emptySchema, entity } from '../src/ir/index.js';
import { validateStructural } from '../src/validators/index.js';
import { ecommerceOltp } from './fixtures.js';

const rules = (fs: { rule: string }[]) => fs.map((f) => f.rule);

describe('structural validator', () => {
  it('passes a clean OLTP model (no errors)', () => {
    const findings = validateStructural(ecommerceOltp());
    expect(findings.filter((f) => f.severity === 'error')).toEqual([]);
  });

  it('flags a missing primary key', () => {
    const ir = emptySchema();
    ir.entities = [entity('t', [{ name: 'a', type: 'int' }])];
    expect(rules(validateStructural(ir))).toContain('PK_MISSING');
  });

  it('flags an empty entity', () => {
    const ir = emptySchema();
    ir.entities = [entity('t', [])];
    expect(rules(validateStructural(ir))).toContain('EMPTY_ENTITY');
  });

  it('flags duplicate columns', () => {
    const ir = emptySchema();
    ir.entities = [
      entity('t', [
        { name: 'id', type: 'int', keys: ['PK'] },
        { name: 'id', type: 'int' },
      ]),
    ];
    expect(rules(validateStructural(ir))).toContain('DUP_COLUMN');
  });

  it('flags an unresolved foreign key', () => {
    const ir = emptySchema();
    ir.entities = [
      entity('t', [
        { name: 'id', type: 'int', keys: ['PK'] },
        { name: 'ghost_id', type: 'int', keys: ['FK'], fkTo: { entity: 'missing', column: 'x' } },
      ]),
    ];
    expect(rules(validateStructural(ir))).toContain('FK_UNRESOLVED');
  });

  it('flags a many-to-many without a junction table', () => {
    const ir = emptySchema();
    const a = entity('a', [{ name: 'a_id', type: 'int', keys: ['PK'] }]);
    const b = entity('b', [{ name: 'b_id', type: 'int', keys: ['PK'] }]);
    ir.entities = [a, b];
    ir.relationships = [{ id: 'r1', from: a.id, to: b.id, cardinality: 'N:M' }];
    expect(rules(validateStructural(ir))).toContain('MN_WITHOUT_JUNCTION');
  });
});
