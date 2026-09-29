import { describe, it, expect } from 'vitest';
import { emptySchema, entity } from '../src/ir/index.js';
import {
  classifyNormalForm,
  normalFormAtLeast,
  validateNormalization,
} from '../src/validators/index.js';
import { ordersFlat, starSchema } from './fixtures.js';

const rules = (fs: { rule: string }[]) => fs.map((f) => f.rule);

describe('normalization validator', () => {
  it('detects a 1NF violation from a multivalued column', () => {
    const e = entity('t', [
      { name: 'id', type: 'int', keys: ['PK'] },
      { name: 'phones', type: 'array', multivalued: true },
    ]);
    expect(classifyNormalForm(e)).toBe('0NF');
  });

  it('classifies a flat table with partial + transitive deps as 1NF', () => {
    // Worst offense is the partial dependency, so it fails 2NF => sits at 1NF.
    expect(classifyNormalForm(ordersFlat())).toBe('1NF');
  });

  it('reports both partial (2NF) and transitive (3NF) dependencies', () => {
    const ir = emptySchema();
    ir.entities = [ordersFlat()];
    const r = rules(validateNormalization(ir));
    expect(r).toContain('NF_2NF_PARTIAL_DEPENDENCY');
    expect(r).toContain('NF_3NF_TRANSITIVE_DEPENDENCY');
  });

  it('treats a table with only key-determined FDs as BCNF', () => {
    const e = entity(
      'clean',
      [
        { name: 'id', type: 'int', keys: ['PK'] },
        { name: 'label', type: 'varchar(50)' },
      ],
      { dependencies: [{ determinant: ['id'], dependent: ['label'] }] },
    );
    expect(classifyNormalForm(e)).toBe('BCNF');
    expect(normalFormAtLeast(e, '3NF')).toBe(true);
  });

  it('finds no normalization issues in the star schema dims/facts', () => {
    expect(validateNormalization(starSchema())).toEqual([]);
  });
});
