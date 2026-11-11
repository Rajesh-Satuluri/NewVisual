// ─────────────────────────────────────────────────────────────────────────────
// manifest-gen — derive dbt artifacts from the actual sample project.
//
// Instead of hand-writing a manifest, this reads data/sample-project.js (the same
// jaffle_commerce files the Sample Project Explorer shows and ships) and builds
// the real graph: nodes, depends_on, parent_map/child_map, and compiled SQL, by
// parsing each model's ref()/source() calls. So the Manifest Explorer's lineage
// and compiled SQL genuinely come from the project source — change a model's
// ref() and the derived manifest changes with it.
//
// manifest.json here is fully derived. run_results.json and catalog.json are
// inherently products of an execution (which we do not run in the browser), so
// they are synthesized for the real node ids and labeled "illustrative sample
// run" in the UI. Import-safe in Node (no DOM) so tools can test it.
// ─────────────────────────────────────────────────────────────────────────────

import { FILES, PROJECT_NAME } from './sample-project.js';
import { extractRefs, extractSources, parseSchemaTests } from '../components/ide-engine.js';

const P = PROJECT_NAME; // 'jaffle_commerce'
const DBT_VERSION = '1.9.0';
const GEN_AT = '2026-02-01T02:14:11Z';

const modelId  = n => `model.${P}.${n}`;
const sourceId = (s, n) => `source.${P}.${s}.${n}`;
const folderOf = path => (path.includes('/marts/') ? 'marts' : 'staging');
const schemaFor = folder => (folder === 'marts' ? 'main_marts' : 'main_staging');

// small deterministic checksum (NOT a real sha256 — the concept, for teaching)
function miniHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, '0');
}

// Resolve ref()/source()/config()/the project's one macro into warehouse SQL,
// exactly as dbt would compile it for this DuckDB project.
function compileForManifest(sql, modelsByName) {
  const schemaOfModel = name => {
    const m = modelsByName.get(name);
    return m ? schemaFor(m.folder) : 'main';
  };
  return sql
    .replace(/\{\{-?\s*config\([\s\S]*?\)\s*-?\}\}/g, '')
    .replace(/\{\{-?\s*source\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)\s*-?\}\}/g, (_m, _s, n) => `main.${n}`)
    .replace(/\{\{-?\s*ref\(\s*['"]([^'"]+)['"]\s*\)\s*-?\}\}/g, (_m, n) => `${schemaOfModel(n)}.${n}`)
    .replace(/\{\{-?\s*cents_to_dollars\(\s*'([^']+)'\s*(?:,\s*([0-9]+)\s*)?\)\s*-?\}\}/g, (_m, col, scale) => `round(${col} / 100.0, ${scale || 2})`)
    .replace(/^\s*\n/, '')
    .trim();
}

export function buildArtifacts() {
  // ── models ────────────────────────────────────────────────────────────────
  const modelPaths = Object.keys(FILES).filter(p => /^models\/.*\.sql$/.test(p));
  const models = modelPaths.map(p => {
    const name = p.split('/').pop().replace(/\.sql$/, '');
    const folder = folderOf(p);
    const sql = FILES[p].body;
    return { name, folder, path: p, sql,
      materialized: folder === 'marts' ? 'table' : 'view',
      refs: extractRefs(sql), sources: extractSources(sql) };
  });
  const modelsByName = new Map(models.map(m => [m.name, m]));

  // ── sources (from the source() calls that actually appear) ──────────────────
  const srcMap = new Map();
  models.forEach(m => m.sources.forEach(([s, n]) => srcMap.set(`${s}.${n}`, { schema: s, name: n })));
  const sources = [...srcMap.values()];

  // ── lineage nodes (models + sources) for the inspector ──────────────────────
  const NODES = {};
  sources.forEach(s => {
    NODES[sourceId(s.schema, s.name)] = { label: `${s.schema}.${s.name} (source)`, kind: 'source', parents: [], children: [] };
  });
  models.forEach(m => {
    const parents = [
      ...m.sources.map(([s, n]) => sourceId(s, n)),
      ...m.refs.filter(r => modelsByName.has(r)).map(modelId),
    ];
    NODES[modelId(m.name)] = { label: m.name, kind: 'model', materialized: m.materialized, parents, children: [] };
  });
  // fill children as the inverse of parents
  Object.entries(NODES).forEach(([id, n]) => n.parents.forEach(pid => { if (NODES[pid]) NODES[pid].children.push(id); }));

  // ── compiled SQL + synthesized results, per model ───────────────────────────
  const COMPILED = {}, RESULTS = {};
  const timing = { stg_customers: 0.21, stg_orders: 0.24, stg_payments: 0.33, fct_orders: 0.58, dim_customers: 0.71 };
  const rows = { stg_customers: 4, stg_orders: 5, stg_payments: 5, fct_orders: 5, dim_customers: 4 };
  models.forEach(m => {
    COMPILED[modelId(m.name)] = compileForManifest(m.sql, modelsByName);
    RESULTS[modelId(m.name)] = { status: 'success', execution_time: timing[m.name] ?? 0.3, rows_affected: rows[m.name] ?? null };
  });

  // ── schema tests (from the *_staging.yml / *_marts.yml files) ───────────────
  const testNodes = [];
  Object.keys(FILES).filter(p => /\.ya?ml$/.test(p) && /models:/.test(FILES[p].body)).forEach(p => {
    const { tests } = parseSchemaTests(FILES[p].body);
    tests.forEach(({ model, column, test }) => {
      const kind = typeof test === 'string' ? test : Object.keys(test)[0];
      const safe = kind.replace(/[^\w]/g, '_');
      const id = `test.${P}.${safe}_${model}_${column}`;
      const dep = [modelId(model)];
      if (typeof test === 'object' && test.relationships && /ref\(\s*['"]([^'"]+)['"]/.test(test.relationships.to || '')) {
        dep.push(modelId(RegExp.$1));
      }
      testNodes.push({ id, kind, model, column, depends_on: dep });
    });
  });

  // ── snapshot + singular test (parsed from their files) ──────────────────────
  const extraNodes = [];
  if (FILES['snapshots/customers_snapshot.sql']) {
    const refs = extractRefs(FILES['snapshots/customers_snapshot.sql'].body).filter(r => modelsByName.has(r));
    extraNodes.push({ id: `snapshot.${P}.customers_snapshot`, resource_type: 'snapshot', depends_on: refs.map(modelId) });
  }
  if (FILES['tests/assert_positive_order_amount.sql']) {
    const refs = extractRefs(FILES['tests/assert_positive_order_amount.sql'].body).filter(r => modelsByName.has(r));
    extraNodes.push({ id: `test.${P}.assert_positive_order_amount`, resource_type: 'test', depends_on: refs.map(modelId) });
  }

  // ── manifest.json (fully derived) ───────────────────────────────────────────
  const manifestNodes = {};
  models.forEach(m => {
    manifestNodes[modelId(m.name)] = {
      resource_type: 'model',
      config: { materialized: m.materialized },
      checksum: { name: 'sha256', checksum: miniHash(m.sql) },
      depends_on: { nodes: NODES[modelId(m.name)].parents },
      compiled: true,
    };
  });
  testNodes.forEach(t => {
    manifestNodes[t.id] = { resource_type: 'test', test_metadata: { name: t.kind }, column_name: t.column, depends_on: { nodes: t.depends_on } };
  });
  extraNodes.forEach(n => { manifestNodes[n.id] = { resource_type: n.resource_type, depends_on: { nodes: n.depends_on } }; });

  const manifestSources = {};
  sources.forEach(s => {
    manifestSources[sourceId(s.schema, s.name)] = { resource_type: 'source', source_name: s.schema, name: s.name, loaded_at_field: '_loaded_at' };
  });

  const parent_map = {}, child_map = {};
  Object.keys(manifestNodes).forEach(id => { parent_map[id] = manifestNodes[id].depends_on.nodes.slice(); });
  Object.keys(manifestSources).forEach(id => { parent_map[id] = []; });
  Object.keys(parent_map).forEach(id => { child_map[id] = child_map[id] || []; });
  Object.entries(parent_map).forEach(([id, parents]) => parents.forEach(pid => { (child_map[pid] = child_map[pid] || []).push(id); }));

  const MANIFEST = {
    metadata: { dbt_version: DBT_VERSION, project_name: P, generated_at: GEN_AT, adapter_type: 'duckdb' },
    nodes: manifestNodes,
    sources: manifestSources,
    parent_map,
    child_map,
  };

  // ── run_results.json (synthesized for the real node ids) ────────────────────
  const RUN_RESULTS = {
    metadata: { dbt_version: DBT_VERSION, generated_at: GEN_AT, invocation_command: 'dbt build' },
    elapsed_time: models.reduce((s, m) => s + (timing[m.name] ?? 0.3), 0) + testNodes.length * 0.05,
    results: [
      ...models.map(m => ({ unique_id: modelId(m.name), status: 'success', execution_time: timing[m.name] ?? 0.3, adapter_response: { rows_affected: rows[m.name] ?? null } })),
      ...testNodes.slice(0, 6).map(t => ({ unique_id: t.id, status: 'pass', execution_time: 0.05, failures: 0 })),
    ],
  };

  // ── catalog.json (illustrative column types for the two marts) ──────────────
  const CATALOG = {
    metadata: { dbt_version: DBT_VERSION, generated_at: GEN_AT },
    nodes: {
      [modelId('fct_orders')]: {
        columns: { order_id: { type: 'BIGINT', index: 1 }, customer_id: { type: 'BIGINT', index: 2 }, order_date: { type: 'DATE', index: 3 }, status: { type: 'VARCHAR', index: 4 }, amount: { type: 'DOUBLE', index: 5 } },
        stats: { row_count: { value: 5 }, bytes: { value: 4096 } },
      },
      [modelId('dim_customers')]: {
        columns: { customer_id: { type: 'BIGINT', index: 1 }, first_name: { type: 'VARCHAR', index: 2 }, last_name: { type: 'VARCHAR', index: 3 }, number_of_orders: { type: 'BIGINT', index: 4 }, lifetime_value: { type: 'DOUBLE', index: 5 } },
        stats: { row_count: { value: 4 }, bytes: { value: 4096 } },
      },
    },
  };

  return { NODES, COMPILED, RESULTS, MANIFEST, RUN_RESULTS, CATALOG };
}
