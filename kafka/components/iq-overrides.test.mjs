// Tests for the shared interview-Q&A override store — the single record that
// the module tab and the Study Hub both read/write so an edit in one place
// shows up in the other.
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Minimal localStorage shim so the browser module runs under Node.
class MemStorage {
  constructor() { this.m = new Map(); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}
globalThis.localStorage = new MemStorage();

const { keyFor, loadOverride, saveOverride, applyOverrideTo, PREFIX } =
  await import('./iq-overrides.js');

test('keyFor is stable and namespaced per (module, index)', () => {
  assert.equal(keyFor('m01', 0), 'kafka_iqedit_m01_0');
  assert.equal(keyFor('m23', 4), 'kafka_iqedit_m23_4');
  assert.ok(keyFor('m01', 0).startsWith(PREFIX));
  assert.notEqual(keyFor('m01', 0), keyFor('m01', 1));
});

test('save then load round-trips a partial override', () => {
  saveOverride('m01', 0, { q: 'Edited question?' });
  assert.deepEqual(loadOverride('m01', 0), { q: 'Edited question?' });
  saveOverride('m01', 0, { q: 'Q2', a: '<p>A2</p>' });
  assert.deepEqual(loadOverride('m01', 0), { q: 'Q2', a: '<p>A2</p>' });
});

test('empty or null override removes the key (reset)', () => {
  saveOverride('m06', 2, { a: 'x' });
  assert.ok(loadOverride('m06', 2));
  saveOverride('m06', 2, null);
  assert.equal(loadOverride('m06', 2), null);
  saveOverride('m06', 2, {});           // no q/a → treated as reset
  assert.equal(loadOverride('m06', 2), null);
});

test('applyOverrideTo merges edited fields and flags edited', () => {
  const orig = { moduleId: 'm08', idx: 1, q: 'orig q', a: 'orig a', tip: 'keep' };
  saveOverride('m08', 1, { a: '<p>new answer</p>' });
  const v = applyOverrideTo(orig, 'm08', 1);
  assert.equal(v.a, '<p>new answer</p>');  // answer overridden
  assert.equal(v.q, 'orig q');             // question untouched
  assert.equal(v.tip, 'keep');             // other fields preserved
  assert.equal(v.edited, true);
  assert.notEqual(v, orig);                // does not mutate original
});

test('applyOverrideTo returns the original object when no override exists', () => {
  const orig = { moduleId: 'm30', idx: 0, q: 'q', a: 'a' };
  const v = applyOverrideTo(orig, 'm30', 0);
  assert.equal(v, orig);
  assert.equal(v.edited, undefined);
});

test('overrides for the same (module,index) are shared across call sites', () => {
  // Simulate: edit written from the module tab, read from the Study Hub.
  saveOverride('m23', 3, { q: 'CDC from module tab' });
  const studyView = applyOverrideTo(
    { moduleId: 'm23', idx: 3, q: 'original', a: 'a' }, 'm23', 3);
  assert.equal(studyView.q, 'CDC from module tab');
});
