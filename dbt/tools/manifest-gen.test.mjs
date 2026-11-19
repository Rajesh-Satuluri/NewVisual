// Offline tests for the derived manifest generator (no DOM).
// Run: /opt/node22/bin/node dbt/tools/manifest-gen.test.mjs
import assert from 'node:assert/strict';
import { buildArtifacts } from '../data/manifest-gen.js';

let passed = 0;
const t = (name, fn) => { fn(); passed++; console.log('  ✓', name); };
const { NODES, COMPILED, RESULTS, MANIFEST, RUN_RESULTS, CATALOG } = buildArtifacts();
const M = n => `model.jaffle_commerce.${n}`;
const S = (s, n) => `source.jaffle_commerce.${s}.${n}`;

console.log('manifest-gen tests');

t('derives all five sample models', () => {
  ['stg_customers', 'stg_orders', 'stg_payments', 'fct_orders', 'dim_customers'].forEach(n =>
    assert.ok(NODES[M(n)], `missing ${n}`));
});

t('fct_orders depends on stg_orders + stg_payments (from its refs)', () => {
  const p = NODES[M('fct_orders')].parents.sort();
  assert.deepEqual(p, [M('stg_orders'), M('stg_payments')].sort());
});

t('dim_customers depends on stg_customers + fct_orders', () => {
  const p = NODES[M('dim_customers')].parents.sort();
  assert.deepEqual(p, [M('stg_customers'), M('fct_orders')].sort());
});

t('staging models depend on their raw sources', () => {
  assert.deepEqual(NODES[M('stg_orders')].parents, [S('raw', 'raw_orders')]);
  assert.deepEqual(NODES[M('stg_payments')].parents, [S('raw', 'raw_payments')]);
});

t('children are the exact inverse of parents', () => {
  assert.ok(NODES[M('stg_orders')].children.includes(M('fct_orders')));
  assert.ok(NODES[M('fct_orders')].children.includes(M('dim_customers')));
  assert.ok(NODES[S('raw', 'raw_orders')].children.includes(M('stg_orders')));
});

t('compiled SQL resolves source(), ref() and the cents_to_dollars macro', () => {
  const stgPay = COMPILED[M('stg_payments')];
  assert.ok(/from main\.raw_payments/.test(stgPay), 'source not resolved');
  assert.ok(/round\(amount \/ 100\.0, 2\)/.test(stgPay), 'macro not expanded');
  const fct = COMPILED[M('fct_orders')];
  assert.ok(/from main_staging\.stg_orders/.test(fct), 'ref not schema-qualified');
  assert.ok(/main_staging\.stg_payments/.test(fct));
});

t('no model has unresolved Jinja in compiled SQL', () => {
  Object.values(COMPILED).forEach(sql => assert.ok(!/\{\{|\}\}/.test(sql), 'leftover Jinja'));
});

t('manifest parent_map and child_map are mutually consistent', () => {
  for (const [id, parents] of Object.entries(MANIFEST.parent_map)) {
    for (const p of parents) assert.ok((MANIFEST.child_map[p] || []).includes(id), `${p}->${id} missing in child_map`);
  }
});

t('manifest includes derived test nodes for schema tests', () => {
  const testIds = Object.keys(MANIFEST.nodes).filter(id => id.startsWith('test.'));
  assert.ok(testIds.length >= 5, `expected test nodes, got ${testIds.length}`);
  // a unique test on fct_orders.order_id should depend on fct_orders
  const uniq = testIds.find(id => /unique_fct_orders_order_id/.test(id));
  assert.ok(uniq, 'unique test on fct_orders.order_id not found');
  assert.ok(MANIFEST.nodes[uniq].depends_on.nodes.includes(M('fct_orders')));
});

t('manifest sources carry the raw tables', () => {
  assert.ok(MANIFEST.sources[S('raw', 'raw_orders')]);
  assert.equal(MANIFEST.sources[S('raw', 'raw_orders')].resource_type, 'source');
});

t('run_results references real node ids and every model succeeded', () => {
  const modelResults = RUN_RESULTS.results.filter(r => r.unique_id.startsWith('model.'));
  assert.equal(modelResults.length, 5);
  modelResults.forEach(r => assert.equal(r.status, 'success'));
});

t('catalog documents the two marts with columns', () => {
  assert.ok(CATALOG.nodes[M('fct_orders')].columns.order_id);
  assert.ok(CATALOG.nodes[M('dim_customers')].columns.lifetime_value);
});

console.log(`\n${passed} passed`);
