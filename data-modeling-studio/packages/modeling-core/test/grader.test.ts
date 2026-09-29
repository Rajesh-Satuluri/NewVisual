import { describe, it, expect } from 'vitest';
import { emptySchema, entity } from '../src/ir/index.js';
import { grade, type Scenario } from '../src/grader/index.js';
import { starSchema, starScenario } from './fixtures.js';

describe('grader', () => {
  it('gives a perfect score to a correct star-schema solution', () => {
    const result = grade(starSchema(), starScenario());
    expect(result.percent).toBe(100);
    expect(result.failed).toEqual([]);
  });

  it('fails every substantive rule on an empty schema and returns actionable hints', () => {
    const result = grade(emptySchema(), starScenario());
    // The only thing an empty schema gets "right" is having no structural errors.
    expect(result.failed.map((r) => r.ruleId)).toEqual(
      expect.arrayContaining(['fact-exists', 'fact-grain', 'customer-scd2']),
    );
    expect(result.percent).toBeLessThan(20);
    expect(result.failed.some((r) => r.hint)).toBe(true);
  });

  it('docks the SCD2 rule when history is not tracked', () => {
    const ir = starSchema();
    const dim = ir.entities.find((e) => e.name === 'dim_customer')!;
    dim.scd = 1; // learner overwrote instead of versioning
    const result = grade(ir, starScenario());
    expect(result.percent).toBeLessThan(100);
    expect(result.failed.map((r) => r.ruleId)).toContain('customer-scd2');
  });

  it('weights rules by their configured weight', () => {
    // Two independent rules of different weight; failing the heavier one costs more.
    const ir = emptySchema();
    ir.entities = [entity('present', [{ name: 'id', type: 'int', keys: ['PK'] }])];

    const scenario: Scenario = {
      id: 'w',
      title: 'weighting',
      difficulty: 'easy',
      prompt: '',
      rubric: [
        { id: 'light', description: 'l', weight: 1, check: { kind: 'hasEntity', entity: 'present' } },
        { id: 'heavy', description: 'h', weight: 3, check: { kind: 'hasEntity', entity: 'missing' } },
      ],
    };

    // Only the light (w=1) rule passes => 1 / 4.
    expect(grade(ir, scenario).score).toBeCloseTo(0.25, 5);
  });
});
