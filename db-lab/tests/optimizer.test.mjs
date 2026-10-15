/* Tests for the query-optimizer kernel (sims/kernels/optimizer.mjs).
   The teaching model's VALUE is that its decisions cross over in the
   right direction as parameters change — not that its numbers match a
   real engine. These pin those crossovers and the chosen = cheapest rule. */
import { suite, test, assert, assertEqual, assertThrows } from "./harness.mjs";
import { invariantsHold, replay } from "../sims/kernels/kernel-contract.mjs";
import { createOptimizer, optimizerSpec } from "../sims/kernels/optimizer.mjs";

const set = (key, value) => ({ type: "set", key: key, value: value });
const chosenAccess = (k) => k.state.plan.chosenAccess.name;
const chosenJoin = (k) => k.state.plan.chosenJoin.name;

suite("optimizer: access-path crossover", () => {
  test("very selective filter with an index → Index Scan", () => {
    const k = createOptimizer({ innerRows: 100000, selectivity: 0.0005, hasIndexInner: true });
    assertEqual(chosenAccess(k), "Index Scan");
  });
  test("unselective filter → Seq Scan even with an index", () => {
    const k = createOptimizer({ innerRows: 100000, selectivity: 0.5, hasIndexInner: true });
    assertEqual(chosenAccess(k), "Seq Scan");
  });
  test("no index → always Seq Scan", () => {
    const k = createOptimizer({ selectivity: 0.0001, hasIndexInner: false });
    assertEqual(chosenAccess(k), "Seq Scan");
    assertEqual(k.state.plan.access.length, 1);
  });
});

suite("optimizer: join-algorithm crossover", () => {
  test("small inner that fits memory → Hash Join beats naive Nested Loop", () => {
    const k = createOptimizer({ outerRows: 1000000, innerRows: 5000, rowsPerPage: 100, memoryPages: 200, hasIndexInner: false });
    assertEqual(chosenJoin(k), "Hash Join");
    const nlj = k.state.plan.join.find((j) => j.name === "Nested Loop");
    assert(nlj.cost > k.state.plan.chosenJoin.cost, "naive NLJ is far more expensive");
  });
  test("index on inner + small outer → Index Nested Loop", () => {
    const k = createOptimizer({ outerRows: 50, innerRows: 1000000, rowsPerPage: 100, memoryPages: 100, hasIndexInner: true });
    assertEqual(chosenJoin(k), "Index Nested Loop");
  });
  test("naive Nested Loop is never chosen when a hash join is available on big tables", () => {
    const k = createOptimizer({ outerRows: 200000, innerRows: 200000, rowsPerPage: 100, memoryPages: 50, hasIndexInner: false });
    assert(chosenJoin(k) !== "Nested Loop");
  });
});

suite("optimizer: cardinality & bounds", () => {
  test("estimated rows = selectivity × outer rows (FK join)", () => {
    const k = createOptimizer({ outerRows: 100000, selectivity: 0.02 });
    assertEqual(k.metrics().estRows, 2000);
  });
  test("set validates ranges", () => {
    const k = createOptimizer({});
    assertThrows(() => k.dispatch(set("selectivity", 2)), "selectivity > 1");
    assertThrows(() => k.dispatch(set("bogus", 1)), "unknown param");
  });
});

suite("optimizer: guarantees", () => {
  test("chosen plan is always the cheapest (invariant) across a sweep", () => {
    const k = createOptimizer({});
    [0.001, 0.01, 0.05, 0.2, 0.5, 0.9].forEach((sel) => {
      k.dispatch(set("selectivity", sel));
      assert(invariantsHold(k), "sel " + sel + ": " + JSON.stringify(k.invariants().filter((c) => !c.ok)));
    });
    [true, false].forEach((idx) => {
      k.dispatch(set("hasIndexInner", idx));
      assert(invariantsHold(k));
    });
  });
  test("deterministic + reset + replay", () => {
    const ops = [set("selectivity", 0.3), set("outerRows", 50000), set("hasIndexInner", false), set("memoryPages", 10)];
    const a = createOptimizer({}); const b = createOptimizer({});
    ops.forEach((o) => a.dispatch(o)); ops.forEach((o) => b.dispatch(o));
    assertEqual(a.snapshot(), b.snapshot());
    assert(replay(a, optimizerSpec(a.config)).ok);
    const fresh = createOptimizer({}).snapshot(); a.reset(); assertEqual(a.snapshot(), fresh);
  });
});
