/* Sample schemas + a scenario, mirroring the modeling-core test fixtures.
   Each sample ships a default canvas layout so nodes don't overlap on load. */

import type { SchemaIR, Scenario } from '@dms/modeling-core';

export type SampleId = 'star' | 'oltp' | 'flat';

export interface Sample {
  id: SampleId;
  label: string;
  ir: SchemaIR;
  layout: Record<string, { x: number; y: number }>;
  scenario?: Scenario;
}

function starSchema(): SchemaIR {
  return {
    version: 1,
    name: 'ShopFlow Star',
    entities: [
      {
        id: 'f',
        name: 'fact_sales',
        role: 'fact',
        grain: 'one row per product per order line',
        columns: [
          { name: 'sales_key', type: 'bigint', keys: ['surrogate'], nullable: false },
          { name: 'customer_key', type: 'bigint', keys: ['FK'], fkTo: { entity: 'dc', column: 'customer_key' } },
          { name: 'product_key', type: 'bigint', keys: ['FK'], fkTo: { entity: 'dp', column: 'product_key' } },
          { name: 'quantity', type: 'int' },
          { name: 'amount', type: 'numeric(12,2)' },
        ],
      },
      {
        id: 'dc',
        name: 'dim_customer',
        role: 'dimension',
        scd: 2,
        columns: [
          { name: 'customer_key', type: 'bigint', keys: ['surrogate'], nullable: false },
          { name: 'customer_id', type: 'int' },
          { name: 'name', type: 'varchar(255)' },
          { name: 'city', type: 'varchar(255)' },
          { name: 'valid_from', type: 'timestamp' },
          { name: 'valid_to', type: 'timestamp' },
          { name: 'is_current', type: 'boolean' },
        ],
      },
      {
        id: 'dp',
        name: 'dim_product',
        role: 'dimension',
        scd: 1,
        columns: [
          { name: 'product_key', type: 'bigint', keys: ['surrogate'], nullable: false },
          { name: 'product_id', type: 'int' },
          { name: 'name', type: 'varchar(255)' },
        ],
      },
    ],
    relationships: [
      { id: 'r1', from: 'f', to: 'dc', cardinality: '1:N' },
      { id: 'r2', from: 'f', to: 'dp', cardinality: '1:N' },
    ],
  };
}

function oltpSchema(): SchemaIR {
  return {
    version: 1,
    name: 'ShopFlow OLTP',
    entities: [
      {
        id: 'c',
        name: 'customers',
        columns: [
          { name: 'customer_id', type: 'int', keys: ['PK'], nullable: false },
          { name: 'name', type: 'varchar(255)' },
          { name: 'email', type: 'varchar(255)' },
        ],
      },
      {
        id: 'p',
        name: 'products',
        columns: [
          { name: 'product_id', type: 'int', keys: ['PK'], nullable: false },
          { name: 'name', type: 'varchar(255)' },
          { name: 'price', type: 'numeric(10,2)' },
        ],
      },
      {
        id: 'o',
        name: 'orders',
        columns: [
          { name: 'order_id', type: 'int', keys: ['PK'], nullable: false },
          { name: 'order_date', type: 'timestamp' },
          { name: 'customer_id', type: 'int', keys: ['FK'], fkTo: { entity: 'c', column: 'customer_id' } },
        ],
      },
      {
        id: 'oi',
        name: 'order_items',
        role: 'bridge',
        columns: [
          { name: 'order_id', type: 'int', keys: ['PK', 'FK'], fkTo: { entity: 'o', column: 'order_id' } },
          { name: 'product_id', type: 'int', keys: ['PK', 'FK'], fkTo: { entity: 'p', column: 'product_id' } },
          { name: 'quantity', type: 'int' },
        ],
      },
    ],
    relationships: [
      { id: 'r1', from: 'c', to: 'o', cardinality: '1:N' },
      { id: 'r2', from: 'o', to: 'p', cardinality: 'N:M' },
    ],
  };
}

function flatSchema(): SchemaIR {
  return {
    version: 1,
    name: 'Denormalized',
    entities: [
      {
        id: 'of',
        name: 'orders_flat',
        columns: [
          { name: 'order_id', type: 'int', keys: ['composite'], nullable: false },
          { name: 'product_id', type: 'int', keys: ['composite'], nullable: false },
          { name: 'product_name', type: 'varchar(255)' },
          { name: 'customer_id', type: 'int' },
          { name: 'customer_city', type: 'varchar(255)' },
          { name: 'quantity', type: 'int' },
        ],
        dependencies: [
          { determinant: ['product_id'], dependent: ['product_name'] },
          { determinant: ['customer_id'], dependent: ['customer_city'] },
          { determinant: ['order_id', 'product_id'], dependent: ['quantity'] },
        ],
      },
    ],
    relationships: [],
  };
}

const starScenario: Scenario = {
  id: 'sales-star',
  title: 'Model a sales fact for analytics',
  difficulty: 'medium',
  prompt:
    'The BI team needs to report sales by customer and product over time, including how a customer’s city changes.',
  hiddenRequirements: ['History of customer city must be preserved (SCD2).'],
  concepts: ['star-schema', 'grain', 'scd', 'surrogate-keys'],
  commonTrap: 'Forgetting SCD2 on the customer dimension, so historical city is lost.',
  rubric: [
    { id: 'fact-exists', description: 'A fact table for sales exists', weight: 2, check: { kind: 'entityRole', entity: 'fact_sales', role: 'fact' }, hint: 'Create fact_sales with role = fact.' },
    { id: 'fact-grain', description: 'The fact declares its grain', weight: 2, check: { kind: 'grainDeclared', entity: 'fact_sales' }, hint: 'State one row per what.' },
    { id: 'customer-scd2', description: 'Customer dimension tracks history with SCD Type 2', weight: 3, check: { kind: 'scdType', entity: 'dim_customer', scd: 2 }, hint: 'City changes must be preserved — use SCD2.' },
    { id: 'no-errors', description: 'No structural errors', weight: 1, check: { kind: 'noFindings', severity: 'error' } },
  ],
};

export const SAMPLES: Record<SampleId, Sample> = {
  star: {
    id: 'star',
    label: '★ Sales star schema',
    ir: starSchema(),
    layout: { f: { x: 380, y: 220 }, dc: { x: 40, y: 60 }, dp: { x: 740, y: 60 } },
    scenario: starScenario,
  },
  oltp: {
    id: 'oltp',
    label: '▤ E-commerce OLTP',
    ir: oltpSchema(),
    layout: { c: { x: 40, y: 60 }, o: { x: 360, y: 60 }, p: { x: 700, y: 60 }, oi: { x: 360, y: 340 } },
  },
  flat: {
    id: 'flat',
    label: '▦ Unnormalized flat table',
    ir: flatSchema(),
    layout: { of: { x: 300, y: 120 } },
  },
};

export function loadSample(id: SampleId): { ir: SchemaIR; layout: Record<string, { x: number; y: number }>; scenario?: Scenario } {
  const s = SAMPLES[id];
  return {
    ir: structuredClone(s.ir),
    layout: structuredClone(s.layout),
    ...(s.scenario ? { scenario: structuredClone(s.scenario) } : {}),
  };
}
