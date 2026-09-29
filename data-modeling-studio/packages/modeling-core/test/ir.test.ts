import { describe, it, expect } from 'vitest';
import {
  emptySchema,
  findEntity,
  hasCompositeKey,
  primaryKeyColumns,
  primeAttributes,
} from '../src/ir/index.js';
import { ecommerceOltp, ordersFlat } from './fixtures.js';

describe('IR helpers', () => {
  it('creates an empty, valid schema', () => {
    const ir = emptySchema('x');
    expect(ir.version).toBe(1);
    expect(ir.entities).toEqual([]);
    expect(ir.name).toBe('x');
  });

  it('finds entities by id and by name (case-insensitive)', () => {
    const ir = ecommerceOltp();
    expect(findEntity(ir, 'ORDERS')?.name).toBe('orders');
    const byId = ir.entities[0]!;
    expect(findEntity(ir, byId.id)).toBe(byId);
  });

  it('identifies primary key and composite keys', () => {
    const flat = ordersFlat();
    expect(primaryKeyColumns(flat).map((c) => c.name)).toEqual(['order_id', 'product_id']);
    expect(hasCompositeKey(flat)).toBe(true);
    expect([...primeAttributes(flat)]).toEqual(['order_id', 'product_id']);
  });
});
