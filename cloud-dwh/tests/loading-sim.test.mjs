/* Tests for the loading-simulator pure core (P0-A..D).
   Run:  node --test cloud-dwh/tests/
   No dependencies — uses Node's built-in test runner + assert, and
   loads sim-core.js via its module.exports (browser-safe UMD shim). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const S = require('../js/platforms/snowflake/loading/sim-core.js');

/* ---- deriveMetrics (P0-A) ---- */
const filePattern = {
  id: 'batch_copy', fileBased: true, totals: { files: 100, rows: 1000, rejected: 10 },
  detail: { parse: { role: 'snowflake', title: 'Parse' }, execute: { role: 'snowflake', title: 'Exec' }, raw: { role: 'table', title: 'RAW' } },
};
const rowPattern = { ...filePattern, id: 'streaming', fileBased: false };
const ACTIVE = ['source', 'parse', 'execute', 'raw', 'validate', 'reconcile'];

test('deriveMetrics: idle shows zeros and idle flag', () => {
  const m = S.deriveMetrics(filePattern, ACTIVE, -1);
  assert.equal(m.raw.idle, true);
  assert.equal(m.rowsInserted, '0');
});

test('deriveMetrics: rows reach full at RAW', () => {
  const atRaw = S.deriveMetrics(filePattern, ACTIVE, ACTIVE.indexOf('raw'));
  assert.equal(atRaw.raw.rowsInserted, 1000);
  assert.equal(atRaw.raw.rowsParsed, 1000);
});

test('deriveMetrics: row-based pattern reports no files', () => {
  const m = S.deriveMetrics(rowPattern, ACTIVE, ACTIVE.indexOf('raw'));
  assert.equal(m.filesLoaded, '—');
  assert.equal(m.backlog, '—');
});

test('deriveMetrics: done at last stage', () => {
  const m = S.deriveMetrics(filePattern, ACTIVE, ACTIVE.length - 1);
  assert.equal(m.raw.done, true);
});

/* ---- copySim (P0-B) ---- */
const FILE = [
  { id: 1, issue: 'ok' }, { id: 2, issue: 'quoted_comma' }, { id: 3, issue: 'empty_number' },
  { id: 4, issue: 'bad_date' }, { id: 5, issue: 'overflow' }, { id: 6, issue: 'ok' },
];
test('copySim: ABORT_STATEMENT fails the whole load on any error', () => {
  const r = S.copySim(FILE, { onError: 'ABORT_STATEMENT' });
  assert.equal(r.status, 'aborted');
  assert.equal(r.loaded, 0);
});
test('copySim: CONTINUE with no fixes loads only clean rows', () => {
  const r = S.copySim(FILE, { onError: 'CONTINUE' });
  assert.equal(r.loaded, 2);
  assert.equal(r.rejected, 4);
});
test('copySim: CONTINUE with all format fixes still rejects the real overflow', () => {
  const r = S.copySim(FILE, { onError: 'CONTINUE', enclosed: true, nullIf: true, dateDMY: true });
  assert.equal(r.loaded, 5);
  assert.equal(r.rejected, 1);
});
test('copySim: SKIP_FILE discards the whole file on any error', () => {
  const r = S.copySim(FILE, { onError: 'SKIP_FILE', enclosed: true, nullIf: true, dateDMY: true });
  assert.equal(r.status, 'skipped');
  assert.equal(r.loaded, 0);
});

/* ---- applyBatch / idempotency / CDC (P0-C) ---- */
const snap = [
  { event_id: 'e1', order_id: 1, status: 'NEW', amount: 100, updated_at: '2024-02-01 09:00', op: 'c', lsn: 1 },
  { event_id: 'e2', order_id: 2, status: 'NEW', amount: 50, updated_at: '2024-02-01 09:05', op: 'c', lsn: 2 },
  { event_id: 'e3', order_id: 3, status: 'NEW', amount: 75, updated_at: '2024-02-01 09:10', op: 'c', lsn: 3 },
];
const b1 = { id: 'b1', label: 'b1', events: [
  { event_id: 'e4', order_id: 4, status: 'NEW', amount: 200, updated_at: '09:20', op: 'c', lsn: 4 },
  { event_id: 'e5', order_id: 1, status: 'SHIPPED', amount: 100, updated_at: '09:25', op: 'u', lsn: 5 },
] };
const b2 = { id: 'b2', label: 'b2', events: [
  { event_id: 'e9', order_id: 3, status: 'PROCESSING', amount: 75, updated_at: '09:50', op: 'u', lsn: 9 },
  { event_id: 'e8', order_id: 3, status: 'SHIPPED', amount: 75, updated_at: '09:45', op: 'u', lsn: 8 },
  { event_id: 'e8', order_id: 3, status: 'SHIPPED', amount: 75, updated_at: '09:45', op: 'u', lsn: 8 },
] };
const b3 = { id: 'b3', label: 'b3', events: [
  { event_id: 'e10', order_id: 4, status: null, amount: null, updated_at: '10:00', op: 'd', lsn: 10 },
] };

test('seedTarget loads the snapshot', () => {
  assert.equal(S.seedTarget(snap).rows.length, 3);
});
test('applyBatch merge_cdc: insert + update', () => {
  const r = S.applyBatch(S.seedTarget(snap), b1, 'merge_cdc');
  assert.equal(r.count, 4);
  assert.equal(r.state.rows.find(x => x.order_id === 1).status, 'SHIPPED');
});
test('out-of-order resolves to highest lsn', () => {
  const r = S.applyBatch(S.seedTarget(snap), b2, 'merge_cdc');
  assert.equal(r.state.rows.find(x => x.order_id === 3).status, 'PROCESSING');
});
test('CDC delete removes the row; plain merge ignores deletes', () => {
  const seeded = S.applyBatch(S.seedTarget(snap), b1, 'merge_cdc').state;
  assert.equal(S.applyBatch(seeded, b3, 'merge_cdc').state.rows.some(x => x.order_id === 4), false);
  assert.equal(S.applyBatch(seeded, b3, 'merge').state.rows.some(x => x.order_id === 4), true);
});
test('idempotency matrix: append/force grow, keyed/dedup stay stable', () => {
  const twice = strat => { const a = S.applyBatch(S.seedTarget(snap), b2, strat); const b = S.applyBatch(a.state, b2, strat); return [a.count, b.count]; };
  assert.deepEqual(twice('append'), [6, 9]);
  assert.deepEqual(twice('force_reload'), [6, 9]);
  assert.deepEqual(twice('merge_cdc'), [3, 3]);
  assert.deepEqual(twice('cdc_replay'), [3, 3]);
  assert.deepEqual(twice('copy_tracking'), [6, 6]);
});

/* ---- watermark (P0-C) ---- */
test('watermark: timestamp misses late rows, lsn catches them', () => {
  const late = [{ order_id: 2, updated_at: '2024-02-01 08:00', lsn: 11, op: 'u' }];
  assert.equal(S.watermarkPick(late, 'updated_at', '2024-02-01 10:00').length, 0);
  assert.equal(S.watermarkPick(late, 'lsn', 10).length, 1);
});
