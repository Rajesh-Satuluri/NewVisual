/* Tests for the buffer-pool kernel (sims/kernels/buffer-pool.mjs). */
import { suite, test, assert, assertEqual, assertClose, assertThrows } from "./harness.mjs";
import { invariantsHold, replay } from "../sims/kernels/kernel-contract.mjs";
import { createBufferPool, bufferPoolSpec } from "../sims/kernels/buffer-pool.mjs";

const acc = (page, write) => ({ type: "access", page: page, write: write });
function residentPages(k) { return k.state.frames.map((f) => f.page).sort((a, b) => a - b); }

suite("buffer-pool: config", () => {
  test("rejects unknown policy and bad capacity", () => {
    assertThrows(() => createBufferPool({ policy: "ARC" }));
    assertThrows(() => createBufferPool({ capacity: 0 }));
  });
});

suite("buffer-pool: LRU vs FIFO differ on recency", () => {
  const seq = [1, 2, 3, 1, 4]; // after 1,2,3: access 1 (recency), then 4 forces an eviction
  test("LRU evicts the least-recently-used (page 2)", () => {
    const k = createBufferPool({ capacity: 3, policy: "LRU" });
    seq.forEach((p) => k.dispatch(acc(p)));
    assertEqual(residentPages(k), [1, 3, 4], "page 2 evicted; 1 survived via recency");
    const m = k.metrics();
    assertEqual([m.hits, m.misses, m.evictions], [1, 4, 1]);
  });
  test("FIFO evicts the oldest-loaded (page 1), ignoring the hit", () => {
    const k = createBufferPool({ capacity: 3, policy: "FIFO" });
    seq.forEach((p) => k.dispatch(acc(p)));
    assertEqual(residentPages(k), [2, 3, 4], "page 1 evicted despite the recent hit");
  });
});

suite("buffer-pool: CLOCK", () => {
  test("accounting + resident set after a sweep", () => {
    const k = createBufferPool({ capacity: 3, policy: "CLOCK" });
    [1, 2, 3, 1, 4].forEach((p) => k.dispatch(acc(p)));
    const m = k.metrics();
    assertEqual([m.hits, m.misses, m.accesses], [1, 4, 5]);
    assertEqual(residentPages(k), [2, 3, 4]);
    assert(invariantsHold(k), JSON.stringify(k.invariants()));
  });
});

suite("buffer-pool: dirty eviction = write-back", () => {
  test("evicting a dirty frame costs a write-back", () => {
    const k = createBufferPool({ capacity: 1, policy: "LRU" });
    k.dispatch(acc(1, true));   // load + dirty page 1
    k.dispatch(acc(2));         // evicts dirty page 1 -> write-back
    const m = k.metrics();
    assertEqual(m.writeBacks, 1);
    assertEqual(m.evictions, 1);
  });
  test("evicting a clean frame does not", () => {
    const k = createBufferPool({ capacity: 1, policy: "LRU" });
    k.dispatch(acc(1));
    k.dispatch(acc(2));
    assertEqual(k.metrics().writeBacks, 0);
  });
});

suite("buffer-pool: guarantees", () => {
  test("invariants hold across a random walk for every policy", () => {
    ["LRU", "FIFO", "CLOCK"].forEach((policy) => {
      const k = createBufferPool({ capacity: 4, policy: policy });
      let seed = 777;
      const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) % 9;
      for (let i = 0; i < 400; i++) {
        k.dispatch(acc(rnd(), rnd() % 3 === 0));
        assert(invariantsHold(k), policy + " broke at " + i + ": " +
          JSON.stringify(k.invariants().filter((c) => !c.ok)));
      }
      const m = k.metrics();
      assertClose(m.hitRate, m.hits / m.accesses);
    });
  });
  test("deterministic + reset + replay", () => {
    const cfg = { capacity: 3, policy: "CLOCK" };
    const seq = [1, 2, 3, 4, 2, 5, 1, 3, 6].map((p) => acc(p, p % 2 === 0));
    const a = createBufferPool(cfg); const b = createBufferPool(cfg);
    seq.forEach((o) => a.dispatch(o)); seq.forEach((o) => b.dispatch(o));
    assertEqual(a.snapshot(), b.snapshot());
    const fresh = createBufferPool(cfg).snapshot();
    a.reset(); assertEqual(a.snapshot(), fresh);
    seq.forEach((o) => a.dispatch(o));
    assert(replay(a, bufferPoolSpec(cfg)).ok);
  });
});
