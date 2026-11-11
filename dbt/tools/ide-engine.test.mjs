// Offline unit tests for the Project Builder IDE's pure engine (no DOM/DuckDB).
// Run: /opt/node22/bin/node dbt/tools/ide-engine.test.mjs
import assert from 'node:assert/strict';
import {
  compileSql, extractRefs, extractSources, buildGraph, topoSort, layerOf,
  genTestSql, parseSchemaTests, sourceRelation,
} from '../components/ide-engine.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ✓', name); };

console.log('ide-engine tests');

t('sourceRelation maps source(schema,name) -> schema_name', () => {
  assert.equal(sourceRelation('raw', 'orders'), 'raw_orders');
  assert.equal(sourceRelation('raw', 'order_items'), 'raw_order_items');
});

t('compileSql strips config and resolves source()', () => {
  const sql = `{{ config(materialized='view') }}\nselect * from {{ source('raw','orders') }}`;
  const out = compileSql(sql, 'stg_orders');
  assert.equal(out, 'select * from raw_orders');
});

t('compileSql resolves ref() and this', () => {
  const sql = `select o.*, c.name from {{ ref('stg_orders') }} o join {{ ref("stg_customers") }} c on o.customer_id = c.customer_id -- {{ this }}`;
  const out = compileSql(sql, 'fct_orders');
  assert.ok(out.includes('from stg_orders o'));
  assert.ok(out.includes('join stg_customers c'));
  assert.ok(out.includes('-- fct_orders'));
  assert.ok(!out.includes('{{'));
});

t('extractRefs / extractSources find all calls', () => {
  const sql = `from {{ ref('a') }} join {{ ref("b") }} , {{ source('raw','x') }}`;
  assert.deepEqual(extractRefs(sql), ['a', 'b']);
  assert.deepEqual(extractSources(sql), [['raw', 'x']]);
});

t('buildGraph flags a ref to a non-existent model', () => {
  const models = [
    { name: 'stg_orders', sql: `from {{ source('raw','orders') }}` },
    { name: 'fct_orders', sql: `from {{ ref('stg_orders') }} join {{ ref('ghost') }}` },
  ];
  const g = buildGraph(models);
  assert.deepEqual([...g.deps.get('fct_orders')], ['stg_orders']);
  assert.deepEqual(g.unknownRefs, [{ model: 'fct_orders', ref: 'ghost' }]);
});

t('topoSort orders upstream before downstream', () => {
  const models = [
    { name: 'fct_orders', sql: `from {{ ref('stg_orders') }} join {{ ref('stg_customers') }}` },
    { name: 'stg_orders', sql: `from {{ source('raw','orders') }}` },
    { name: 'stg_customers', sql: `from {{ source('raw','customers') }}` },
  ];
  const { order, cycle } = topoSort(models);
  assert.equal(cycle.length, 0);
  assert.ok(order.indexOf('stg_orders') < order.indexOf('fct_orders'));
  assert.ok(order.indexOf('stg_customers') < order.indexOf('fct_orders'));
});

t('topoSort detects a cycle', () => {
  const models = [
    { name: 'a', sql: `from {{ ref('b') }}` },
    { name: 'b', sql: `from {{ ref('a') }}` },
  ];
  const { order, cycle } = topoSort(models);
  assert.equal(order.length, 0);
  assert.deepEqual(cycle.sort(), ['a', 'b']);
});

t('layerOf assigns depth from sources', () => {
  const models = [
    { name: 'stg_orders', sql: `from {{ source('raw','orders') }}` },
    { name: 'fct_orders', sql: `from {{ ref('stg_orders') }}` },
    { name: 'mart_kpi', sql: `from {{ ref('fct_orders') }}` },
  ];
  const layer = layerOf(models);
  assert.equal(layer.get('stg_orders'), 0);
  assert.equal(layer.get('fct_orders'), 1);
  assert.equal(layer.get('mart_kpi'), 2);
});

t('genTestSql: not_null', () => {
  const r = genTestSql('fct_orders', 'order_id', 'not_null');
  assert.equal(r.kind, 'not_null');
  assert.ok(/where "order_id" is null/.test(r.sql));
});

t('genTestSql: unique excludes nulls and finds dupes', () => {
  const r = genTestSql('fct_orders', 'order_id', 'unique');
  assert.ok(/group by "order_id" having count\(\*\) > 1/.test(r.sql));
  assert.ok(/is not null/.test(r.sql));
});

t('genTestSql: accepted_values quotes string values', () => {
  const r = genTestSql('stg_orders', 'status', { accepted_values: { values: ['completed', 'pending'] } });
  assert.ok(/not in \('completed', 'pending'\)/.test(r.sql));
});

t('genTestSql: relationships builds the orphan join', () => {
  const r = genTestSql('fct_orders', 'customer_id', { relationships: { to: "ref('stg_customers')", field: 'customer_id' } });
  assert.ok(/left join "stg_customers" p/.test(r.sql));
  assert.ok(/p\."customer_id" is null/.test(r.sql));
});

t('parseSchemaTests: strings and single-key maps', () => {
  const yaml = `
models:
  - name: fct_orders
    columns:
      - name: order_id
        tests:
          - unique
          - not_null
      - name: status
        tests:
          - accepted_values:
              values: ['completed', 'pending', 'cancelled']
`;
  const { tests, error } = parseSchemaTests(yaml);
  assert.equal(error, null);
  assert.equal(tests.length, 3);
  assert.deepEqual(tests[0], { model: 'fct_orders', column: 'order_id', test: 'unique' });
  assert.equal(tests[1].test, 'not_null');
  assert.ok(tests[2].test.accepted_values);
});

t('parseSchemaTests: accepts data_tests key', () => {
  const yaml = `
models:
  - name: m
    columns:
      - name: id
        data_tests: [not_null]
`;
  const { tests } = parseSchemaTests(yaml);
  assert.equal(tests.length, 1);
  assert.equal(tests[0].test, 'not_null');
});

console.log(`\n${passed} passed`);
