/* ============================================================
   harness.mjs — a tiny zero-dependency test harness that runs the
   SAME test files in Node (via tests/run.mjs) and in the browser
   (via tests/index.html). It deliberately avoids node:test so the
   test modules stay environment-agnostic.
   ============================================================ */

const suites = [];
let current = null;

export function suite(name, fn) {
  current = { name, tests: [] };
  suites.push(current);
  fn();
  current = null;
}

export function test(name, fn) {
  if (!current) throw new Error("test() must be called inside suite()");
  current.tests.push({ name, fn });
}

export function assert(cond, msg) {
  if (!cond) throw new Error(msg || "assertion failed");
}

export function assertEqual(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error((msg || "not equal") + "\n  expected: " + e + "\n  actual:   " + a);
  }
}

export function assertClose(actual, expected, eps, msg) {
  eps = eps == null ? 1e-9 : eps;
  if (Math.abs(actual - expected) > eps) {
    throw new Error((msg || "not close") + " (expected ~" + expected + ", got " + actual + ")");
  }
}

export function assertThrows(fn, msg) {
  let threw = false;
  try { fn(); } catch (e) { threw = true; }
  if (!threw) throw new Error(msg || "expected function to throw");
}

/** Run every registered suite. Returns { passed, failed, total, failures:[] }. */
export function run() {
  const failures = [];
  let passed = 0, total = 0;
  for (const s of suites) {
    for (const t of s.tests) {
      total++;
      try {
        t.fn();
        passed++;
      } catch (e) {
        failures.push({ suite: s.name, test: t.name, error: (e && e.message) || String(e) });
      }
    }
  }
  return { passed, failed: failures.length, total, failures, suites };
}

/** Clear all registered suites (lets the browser page re-import cleanly). */
export function reset() {
  suites.length = 0;
  current = null;
}
