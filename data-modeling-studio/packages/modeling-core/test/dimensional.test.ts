import { describe, it, expect } from 'vitest';
import { emptySchema, entity } from '../src/ir/index.js';
import { validateDimensional } from '../src/validators/index.js';
import { ecommerceOltp, starSchema } from './fixtures.js';

const rules = (fs: { rule: string }[]) => fs.map((f) => f.rule);

describe('dimensional validator', () => {
  it('stays silent for a pure OLTP model (no roles declared)', () => {
    expect(validateDimensional(ecommerceOltp())).toEqual([]);
  });

  it('accepts a well-formed star schema', () => {
    expect(validateDimensional(starSchema()).filter((f) => f.severity === 'error')).toEqual([]);
  });

  it('flags a fact table with no declared grain', () => {
    const ir = emptySchema();
    ir.entities = [
      entity(
        'fact_x',
        [
          { name: 'k', type: 'bigint', keys: ['surrogate'] },
          { name: 'dim_id', type: 'int', keys: ['FK'], fkTo: { entity: 'd', column: 'id' } },
          { name: 'amount', type: 'numeric' },
        ],
        { role: 'fact' },
      ),
    ];
    expect(rules(validateDimensional(ir))).toContain('DIM_FACT_NO_GRAIN');
  });

  it('flags an SCD2 dimension missing version-tracking columns', () => {
    const ir = emptySchema();
    ir.entities = [
      entity(
        'dim_y',
        [
          { name: 'k', type: 'bigint', keys: ['surrogate'] },
          { name: 'name', type: 'varchar(50)' },
        ],
        { role: 'dimension', scd: 2 },
      ),
    ];
    expect(rules(validateDimensional(ir))).toContain('DIM_SCD2_NO_VERSION_COLUMNS');
  });

  it('nudges a dimension with no SCD strategy declared', () => {
    const ir = emptySchema();
    ir.entities = [
      entity('dim_z', [{ name: 'k', type: 'bigint', keys: ['surrogate'] }], { role: 'dimension' }),
    ];
    expect(rules(validateDimensional(ir))).toContain('DIM_SCD_UNDECLARED');
  });
});
