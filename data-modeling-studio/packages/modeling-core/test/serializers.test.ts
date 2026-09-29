import { describe, it, expect } from 'vitest';
import { toDDL, toDBML, toMermaid, toJSON, fromJSON } from '../src/serializers/index.js';
import { ecommerceOltp, starSchema } from './fixtures.js';

describe('serializers', () => {
  it('emits Postgres DDL with PK and FK constraints', () => {
    const ddl = toDDL(ecommerceOltp(), 'postgres');
    expect(ddl).toContain('CREATE TABLE "orders"');
    expect(ddl).toContain('PRIMARY KEY ("order_id")');
    expect(ddl).toContain('FOREIGN KEY ("customer_id") REFERENCES "customers" ("customer_id")');
  });

  it('emits a composite primary key for the junction table', () => {
    const ddl = toDDL(ecommerceOltp(), 'postgres');
    expect(ddl).toContain('PRIMARY KEY ("order_id", "product_id")');
  });

  it('uses MySQL identifier quoting and auto_increment for surrogate keys', () => {
    const ddl = toDDL(starSchema(), 'mysql');
    expect(ddl).toContain('`fact_sales`');
    expect(ddl).toContain('AUTO_INCREMENT');
  });

  it('emits DBML with tables and refs', () => {
    const dbml = toDBML(ecommerceOltp());
    expect(dbml).toContain('Table orders {');
    expect(dbml).toContain('Ref: orders.customer_id > customers.customer_id');
  });

  it('emits a Mermaid erDiagram', () => {
    const mmd = toMermaid(ecommerceOltp());
    expect(mmd.startsWith('erDiagram')).toBe(true);
    expect(mmd).toContain('customers');
  });

  it('round-trips through JSON', () => {
    const ir = starSchema();
    const back = fromJSON(toJSON(ir));
    expect(back.entities.map((e) => e.name)).toEqual(ir.entities.map((e) => e.name));
    expect(back.version).toBe(1);
  });

  it('rejects malformed JSON', () => {
    expect(() => fromJSON('{ not json')).toThrow(/Invalid JSON/);
    expect(() => fromJSON('{"entities": "nope"}')).toThrow(/entities/);
  });
});
