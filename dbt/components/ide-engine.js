// ─────────────────────────────────────────────────────────────────────────────
// ide-engine — the pure brains of the Project Builder IDE.
//
// No DOM, no CDN, no DuckDB — just the deterministic logic that turns a set of
// editable model files into something runnable: resolve ref()/source(), build
// the dependency DAG, order it, and generate the SQL for schema.yml tests. The
// IDE module wires this to the real DuckDB-WASM engine (components/duckdb-engine)
// for execution; this file is import-safe in Node so tools/ide-engine.test.mjs
// can verify the logic offline.
//
// The ref/source resolution here is a FOCUSED resolver (the two Jinja calls that
// define a multi-model project), not the full teaching evaluator in jinja-eval.js
// — the IDE labels it "resolved ref()/source()". config() blocks are stripped as
// metadata. Anything else is left verbatim, so the warehouse (DuckDB) is the one
// that judges the SQL — exactly like dbt.
// ─────────────────────────────────────────────────────────────────────────────

import { parse as parseYaml } from './yaml-mini.js';

const RE_CONFIG = /\{\{-?\s*config\([\s\S]*?\)\s*-?\}\}/g;
const RE_REF    = /\{\{-?\s*ref\(\s*['"]([^'"]+)['"]\s*\)\s*-?\}\}/g;
const RE_SOURCE = /\{\{-?\s*source\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)\s*-?\}\}/g;
const RE_THIS   = /\{\{-?\s*this\s*-?\}\}/g;

// A source ref source('raw','orders') maps to the seed table raw_orders.
export const sourceRelation = (schema, name) => `${schema}_${name}`;

// Compile one model's SQL: strip config(), resolve ref()/source()/this.
export function compileSql(sql, modelName = 'this_model') {
  return sql
    .replace(RE_CONFIG, '')
    .replace(RE_SOURCE, (_m, s, n) => sourceRelation(s, n))
    .replace(RE_REF, (_m, n) => n)
    .replace(RE_THIS, modelName)
    .replace(/^\s*\n/, '')       // drop a leading blank line left by config()
    .trimEnd();
}

export function extractRefs(sql) {
  const out = [];
  let m;
  RE_REF.lastIndex = 0;
  while ((m = RE_REF.exec(sql))) out.push(m[1]);
  return out;
}

export function extractSources(sql) {
  const out = [];
  let m;
  RE_SOURCE.lastIndex = 0;
  while ((m = RE_SOURCE.exec(sql))) out.push([m[1], m[2]]);
  return out;
}

// models: [{ name, sql }]. Returns the dependency graph + any ref to a model
// that does not exist (dbt raises a compilation error for those).
export function buildGraph(models) {
  const names = new Set(models.map(m => m.name));
  const deps = new Map();          // name -> Set of upstream model names
  const unknownRefs = [];          // { model, ref }
  for (const m of models) {
    const set = new Set();
    for (const r of extractRefs(m.sql)) {
      if (names.has(r)) set.add(r);
      else unknownRefs.push({ model: m.name, ref: r });
    }
    deps.set(m.name, set);
  }
  return { deps, unknownRefs, names };
}

// Kahn topological sort. Returns { order, cycle } — order is build order
// (upstream first); cycle is the set of nodes that could not be ordered.
export function topoSort(models) {
  const { deps } = buildGraph(models);
  const indeg = new Map();
  const children = new Map();
  for (const m of models) { indeg.set(m.name, 0); children.set(m.name, []); }
  for (const [name, set] of deps) {
    for (const dep of set) {
      indeg.set(name, (indeg.get(name) || 0) + 1);
      children.get(dep).push(name);
    }
  }
  const queue = [...indeg.entries()].filter(([, d]) => d === 0).map(([n]) => n).sort();
  const order = [];
  while (queue.length) {
    const n = queue.shift();
    order.push(n);
    for (const c of (children.get(n) || []).sort()) {
      indeg.set(c, indeg.get(c) - 1);
      if (indeg.get(c) === 0) queue.push(c);
    }
  }
  const cycle = models.map(m => m.name).filter(n => !order.includes(n));
  return { order, cycle };
}

// Compute a layer index per model (0 = depends only on sources), for lineage.
export function layerOf(models) {
  const { deps } = buildGraph(models);
  const { order } = topoSort(models);
  const layer = new Map();
  for (const name of order) {
    let L = 0;
    for (const d of deps.get(name) || []) L = Math.max(L, (layer.get(d) ?? 0) + 1);
    layer.set(name, L);
  }
  // anything in a cycle gets a sentinel layer
  for (const m of models) if (!layer.has(m.name)) layer.set(m.name, 0);
  return layer;
}

const q = id => `"${String(id).replace(/"/g, '""')}"`;
const litList = vals => vals.map(v => (typeof v === 'number' ? v : `'${String(v).replace(/'/g, "''")}'`)).join(', ');

// Generate the failing-row SQL for one column test. Mirrors dbt's generic tests:
// a test passes when the query returns 0 rows of failures.
export function genTestSql(model, column, test) {
  const name = typeof test === 'string' ? test : Object.keys(test)[0];
  const cfg = typeof test === 'string' ? {} : (test[name] || {});
  switch (name) {
    case 'not_null':
      return { id: `not_null_${model}_${column}`, kind: 'not_null',
        sql: `select count(*) as failures from ${q(model)} where ${q(column)} is null` };
    case 'unique':
      return { id: `unique_${model}_${column}`, kind: 'unique',
        sql: `select count(*) as failures from (select ${q(column)} from ${q(model)} where ${q(column)} is not null group by ${q(column)} having count(*) > 1) t` };
    case 'accepted_values': {
      const vals = cfg.values || [];
      return { id: `accepted_values_${model}_${column}`, kind: 'accepted_values',
        sql: `select count(*) as failures from ${q(model)} where ${q(column)} not in (${litList(vals)})` };
    }
    case 'relationships': {
      // `to:` is written as ref('model') (with or without {{ }}) or a bare name.
      const toRaw = String(cfg.to || '');
      const mref = toRaw.match(/ref\(\s*['"]([^'"]+)['"]\s*\)/);
      const toModel = mref ? mref[1] : toRaw.replace(/[{}]/g, '').trim();
      const field = cfg.field;
      return { id: `relationships_${model}_${column}`, kind: 'relationships',
        sql: `select count(*) as failures from ${q(model)} c left join ${q(toModel)} p on c.${q(column)} = p.${q(field)} where c.${q(column)} is not null and p.${q(field)} is null` };
    }
    default:
      return { id: `${name}_${model}_${column}`, kind: name, unsupported: true,
        sql: null };
  }
}

// Parse a schema.yml into a flat list of column tests.
// Accepts both `tests:` and the newer `data_tests:` key; test entries may be
// plain strings ("unique") or single-key maps ({ accepted_values: { values } }).
export function parseSchemaTests(yamlText) {
  let doc;
  try { doc = parseYaml(yamlText); } catch (e) { return { tests: [], error: e.message }; }
  const out = [];
  const models = (doc && doc.models) || [];
  for (const m of models) {
    if (!m || !m.name) continue;
    for (const col of (m.columns || [])) {
      if (!col || !col.name) continue;
      const tests = col.tests || col.data_tests || [];
      for (const t of tests) out.push({ model: m.name, column: col.name, test: t });
    }
  }
  return { tests: out, error: null };
}
