/* Shared fixtures for the modeling-core test suite. */

import {
  emptySchema,
  entity,
  relationship,
  type Entity,
  type SchemaIR,
} from '../src/ir/index.js';
import { type Scenario } from '../src/grader/index.js';

/** A clean OLTP model: customers 1:N orders, orders N:M products via order_items. */
export function ecommerceOltp(): SchemaIR {
  const customers = entity('customers', [
    { name: 'customer_id', type: 'int', keys: ['PK'], nullable: false },
    { name: 'name', type: 'varchar(255)' },
    { name: 'email', type: 'varchar(255)' },
  ]);
  const products = entity('products', [
    { name: 'product_id', type: 'int', keys: ['PK'], nullable: false },
    { name: 'name', type: 'varchar(255)' },
    { name: 'price', type: 'numeric(10,2)' },
  ]);
  const orders = entity('orders', [
    { name: 'order_id', type: 'int', keys: ['PK'], nullable: false },
    { name: 'order_date', type: 'timestamp' },
    {
      name: 'customer_id',
      type: 'int',
      keys: ['FK'],
      fkTo: { entity: customers.id, column: 'customer_id' },
    },
  ]);
  const orderItems = entity(
    'order_items',
    [
      {
        name: 'order_id',
        type: 'int',
        keys: ['PK', 'FK'],
        fkTo: { entity: orders.id, column: 'order_id' },
      },
      {
        name: 'product_id',
        type: 'int',
        keys: ['PK', 'FK'],
        fkTo: { entity: products.id, column: 'product_id' },
      },
      { name: 'quantity', type: 'int' },
    ],
    { role: 'bridge' },
  );

  const ir = emptySchema('ShopFlow OLTP');
  ir.entities = [customers, products, orders, orderItems];
  ir.relationships = [
    relationship(customers.id, orders.id, '1:N', { modality: 'mandatory' }),
    relationship(orders.id, products.id, 'N:M'),
  ];
  return ir;
}

/** An unnormalized flat orders table with declared FDs that break 2NF and 3NF. */
export function ordersFlat(): Entity {
  return entity(
    'orders_flat',
    [
      { name: 'order_id', type: 'int', keys: ['composite'], nullable: false },
      { name: 'product_id', type: 'int', keys: ['composite'], nullable: false },
      { name: 'product_name', type: 'varchar(255)' }, // depends on product_id only -> 2NF break
      { name: 'customer_id', type: 'int' },
      { name: 'customer_city', type: 'varchar(255)' }, // depends on customer_id -> 3NF break
      { name: 'quantity', type: 'int' },
    ],
    {
      dependencies: [
        { determinant: ['product_id'], dependent: ['product_name'] },
        { determinant: ['customer_id'], dependent: ['customer_city'] },
        { determinant: ['order_id', 'product_id'], dependent: ['quantity'] },
      ],
    },
  );
}

/** A star schema: fact_sales + dim_customer (SCD2) + dim_product. */
export function starSchema(): SchemaIR {
  const dimCustomer = entity(
    'dim_customer',
    [
      { name: 'customer_key', type: 'bigint', keys: ['surrogate'], nullable: false },
      { name: 'customer_id', type: 'int' },
      { name: 'name', type: 'varchar(255)' },
      { name: 'city', type: 'varchar(255)' },
      { name: 'valid_from', type: 'timestamp' },
      { name: 'valid_to', type: 'timestamp' },
      { name: 'is_current', type: 'boolean' },
    ],
    { role: 'dimension', scd: 2 },
  );
  const dimProduct = entity(
    'dim_product',
    [
      { name: 'product_key', type: 'bigint', keys: ['surrogate'], nullable: false },
      { name: 'product_id', type: 'int' },
      { name: 'name', type: 'varchar(255)' },
    ],
    { role: 'dimension', scd: 1 },
  );
  const factSales = entity(
    'fact_sales',
    [
      { name: 'sales_key', type: 'bigint', keys: ['surrogate'], nullable: false },
      {
        name: 'customer_key',
        type: 'bigint',
        keys: ['FK'],
        fkTo: { entity: dimCustomer.id, column: 'customer_key' },
      },
      {
        name: 'product_key',
        type: 'bigint',
        keys: ['FK'],
        fkTo: { entity: dimProduct.id, column: 'product_key' },
      },
      { name: 'quantity', type: 'int' },
      { name: 'amount', type: 'numeric(12,2)' },
    ],
    { role: 'fact', grain: 'one row per product per order line' },
  );

  const ir = emptySchema('ShopFlow Star');
  ir.entities = [factSales, dimCustomer, dimProduct];
  ir.relationships = [
    relationship(factSales.id, dimCustomer.id, '1:N'),
    relationship(factSales.id, dimProduct.id, '1:N'),
  ];
  return ir;
}

/** A scenario that grades a star-schema build. */
export function starScenario(): Scenario {
  return {
    id: 'sales-star',
    title: 'Model a sales fact for analytics',
    difficulty: 'medium',
    prompt:
      'The BI team needs to report sales by customer and product over time, including how a customer’s city changes.',
    hiddenRequirements: ['History of customer city must be preserved (SCD2).'],
    concepts: ['star-schema', 'grain', 'scd', 'surrogate-keys'],
    commonTrap: 'Forgetting SCD2 on the customer dimension, so historical city is lost.',
    curveballs: ['Now they also want returns modeled without double-counting revenue.'],
    rubric: [
      {
        id: 'fact-exists',
        description: 'A fact table for sales exists',
        weight: 2,
        check: { kind: 'entityRole', entity: 'fact_sales', role: 'fact' },
        hint: 'Create a fact_sales table with role = fact.',
      },
      {
        id: 'fact-grain',
        description: 'The fact declares its grain',
        weight: 2,
        check: { kind: 'grainDeclared', entity: 'fact_sales' },
        hint: 'State one row per what.',
      },
      {
        id: 'customer-scd2',
        description: 'Customer dimension tracks history with SCD Type 2',
        weight: 3,
        check: { kind: 'scdType', entity: 'dim_customer', scd: 2 },
        hint: 'City changes must be preserved — use SCD2.',
      },
      {
        id: 'no-errors',
        description: 'No structural errors',
        weight: 1,
        check: { kind: 'noFindings', severity: 'error' },
      },
    ],
  };
}
