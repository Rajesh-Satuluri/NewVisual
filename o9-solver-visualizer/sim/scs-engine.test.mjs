// Unit tests for the SCS Mini-Engine. Run: node --test sim/scs-engine.test.mjs
// SCAFFOLD: covers the implemented pure helpers + the solver contract &
// determinism. Pipeline-behaviour tests (hand-worked expected plans) are added
// in Iteration 1 as solve() is implemented.
import { test } from "node:test";
import assert from "node:assert/strict";
import ScsSolver, {
  netRequirement, roundToLot, sortDemands, offsetByLeadTime, emptyPlan, mulberry32
} from "./scs-engine.js";

test("netRequirement: demand net of on-hand, plus safety stock, floored at 0", () => {
  assert.equal(netRequirement(100, 30, 0), 70);
  assert.equal(netRequirement(100, 30, 20), 90);
  assert.equal(netRequirement(100, 150, 0), 0); // covered by BOH
  assert.equal(netRequirement(0, 0, 0), 0);
});

test("roundToLot: min → ceil-to-multiple → cap at max", () => {
  assert.equal(roundToLot(7, { min: 10, mult: 1 }), 10);       // raised to min
  assert.equal(roundToLot(23, { mult: 10 }), 30);              // ceil to multiple
  assert.equal(roundToLot(23, { min: 10, mult: 10, max: 25 }), 25); // capped
  assert.equal(roundToLot(0, { min: 0, mult: 5 }), 0);         // nothing needed
});

test("sortDemands: Priority → FairShare → DueDate → Qty → key, stable", () => {
  const out = sortDemands([
    { key: "d1", priority: 2, dueDate: "2026-01-05", qty: 10 },
    { key: "d2", priority: 1, dueDate: "2026-01-10", qty: 5 },
    { key: "d3", priority: 1, dueDate: "2026-01-02", qty: 8 }
  ]);
  assert.deepEqual(out.map((d) => d.key), ["d3", "d2", "d1"]);
});

test("offsetByLeadTime: steps back N working days over the calendar", () => {
  const cal = [1, 2, 3, 6, 7, 8]; // skips a weekend 4,5
  assert.equal(offsetByLeadTime(8, cal, 2), 6);
  assert.equal(offsetByLeadTime(8, cal, 10), 1); // runs off the front → first day
});

test("mulberry32: same seed → identical sequence", () => {
  const a = mulberry32(42), b = mulberry32(42);
  assert.equal(a(), b());
  assert.equal(a(), b());
});

test("emptyPlan: has the real Out_Fact_* output shape", () => {
  const p = emptyPlan();
  for (const k of ["flow", "inventory", "delivery", "pegging", "rca"]) {
    assert.ok(Array.isArray(p[k]), k + " is an array");
  }
});

test("ScsSolver: determinism — same seed ⇒ byte-identical snapshot", () => {
  const net = {}, cfg = {};
  const s1 = new ScsSolver({ network: net, config: cfg, seed: 7 });
  const s2 = new ScsSolver({ network: net, config: cfg, seed: 7 });
  s1.solve(); s2.solve();
  assert.deepEqual(s1.snapshot(), s2.snapshot());
});
