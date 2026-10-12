// ─────────────────────────────────────────────────────────────────────────────
// Real SQL execution in the browser via DuckDB-WASM. This is genuine execution
// (labeled "Actual execution" in the UI), not a simulation — the same engine and
// SQL dialect the offline validator (tools/validate-sql.mjs) checks solutions on.
//
// Loaded lazily from a CDN only when the learner first runs a query, so it never
// costs the rest of the app anything. If the CDN is unreachable, run() rejects
// with a clear message and the Studio degrades gracefully (problem text, editor,
// hints and the reference solution all still work).
//
// No eval, no shell, no network access for user SQL — DuckDB-WASM runs sandboxed
// in a Web Worker against an in-memory database seeded from studio-seed.js.
// ─────────────────────────────────────────────────────────────────────────────

import { SEED_SQL } from '../data/studio-seed.js';

// Primary pin first; fallbacks cover CDN version drift without breaking the lab.
const CDN_VERSIONS = ['1.29.0', '1.28.0', '1.30.0'];
const cdn = (v) => `https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@${v}/+esm`;

let _initPromise = null;   // singleton
let _conn = null;
let _status = 'idle';      // idle | loading | ready | error
let _error = null;

export function engineStatus() { return { status: _status, error: _error }; }

async function loadDuckDB() {
  let duckdb = null, lastErr = null;
  for (const v of CDN_VERSIONS) {
    try { duckdb = await import(/* @vite-ignore */ cdn(v)); break; }
    catch (e) { lastErr = e; }
  }
  if (!duckdb) throw new Error('Could not load DuckDB-WASM from CDN. ' + (lastErr?.message || ''));

  const bundles = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(bundles);
  // Cross-origin worker: wrap the CDN worker in a same-origin blob.
  const workerUrl = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' })
  );
  const worker = new Worker(workerUrl);
  const logger = new duckdb.ConsoleLogger(duckdb.LogLevel?.WARNING ?? 2);
  const db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  URL.revokeObjectURL(workerUrl);
  const conn = await db.connect();
  await conn.query(SEED_SQL);     // load the e-commerce seed once
  return conn;
}

// Ensure the engine is ready (idempotent). Returns the connection.
export function initEngine() {
  if (_initPromise) return _initPromise;
  _status = 'loading';
  _initPromise = loadDuckDB()
    .then(conn => { _conn = conn; _status = 'ready'; return conn; })
    .catch(err => { _status = 'error'; _error = err.message; _initPromise = null; throw err; });
  return _initPromise;
}

// Run a read-only query. Resolves { columns:[], rows:[[...]] }.
export async function run(sql) {
  const conn = await initEngine();
  const result = await conn.query(sql);
  const columns = result.schema.fields.map(f => f.name);
  const rows = result.toArray().map(r => columns.map(c => normalize(r[c])));
  return { columns, rows };
}

function normalize(v) {
  if (v == null) return null;
  if (typeof v === 'bigint') return Number(v);
  // DuckDB dates/timestamps arrive as JS Date or epoch-ish values.
  if (v instanceof Date) return v.toISOString().slice(0, 19).replace('T', ' ');
  return v;
}

// Order-insensitive (unless ordered=true) result-set equality for the "Check".
export function resultsEqual(a, b, ordered) {
  if (!a || !b) return false;
  if (a.columns.length !== b.columns.length) return false;
  if (a.rows.length !== b.rows.length) return false;
  const key = (row) => row.map(c => (c == null ? '∅' : String(c))).join('\u0001');
  if (ordered) return a.rows.every((r, i) => key(r) === key(b.rows[i]));
  const sa = a.rows.map(key).sort();
  const sb = b.rows.map(key).sort();
  return sa.every((k, i) => k === sb[i]);
}
