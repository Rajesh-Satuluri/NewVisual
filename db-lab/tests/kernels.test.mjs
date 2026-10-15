/* Tests for the kernel contract + the reference FIFO cache kernel.
   These pin the five guarantees from sims/kernels/CONTRACT.md. */

import { suite, test, assert, assertEqual, assertClose, assertThrows } from "./harness.mjs";
import { createKernel, replay, invariantsHold } from "../sims/kernels/kernel-contract.mjs";
import { createFifoCache, fifoCacheSpec } from "../sims/kernels/_example-fifo-cache.mjs";

const access = (page) => ({ type: "access", page });

suite("kernel-contract", () => {
  test("rejects a malformed spec", () => {
    assertThrows(() => createKernel({}), "spec with no init/apply should throw");
  });

  test("dispatch requires an op with a string type", () => {
    const k = createFifoCache({ capacity: 2 });
    assertThrows(() => k.dispatch(null), "null op should throw");
    assertThrows(() => k.dispatch({ page: 1 }), "op without type should throw");
  });

  test("config is frozen and exposed", () => {
    const k = createFifoCache({ capacity: 4 });
    assertEqual(k.config.capacity, 4);
    assertThrows(() => { "use strict"; k.config.capacity = 9; });
  });
});

suite("fifo-cache: behaviour", () => {
  test("hit / miss accounting on a known sequence", () => {
    const k = createFifoCache({ capacity: 3 });
    [1, 2, 3, 1, 4, 2].forEach((p) => k.dispatch(access(p)));
    // resident after 1,2,3 -> [1,2,3]; access 1 = HIT (FIFO keeps order);
    // access 4 = miss, evict 1 -> [2,3,4]; access 2 = HIT.
    const m = k.metrics();
    assertEqual(m.accesses, 6);
    assertEqual(m.hits, 2);
    assertEqual(m.misses, 4);
    assertEqual(m.size, 3);
    assertClose(m.hitRate, 2 / 6);
  });

  test("FIFO evicts the oldest, not the least-recently-used", () => {
    const k = createFifoCache({ capacity: 2 });
    [1, 2, 1, 3].forEach((p) => k.dispatch(access(p)));
    // [1,2]; access 1 = HIT but FIFO does NOT reorder; access 3 evicts 1.
    assertEqual(k.state.slots, [2, 3]);
    assertEqual(k.state.lastEvicted, 1);
  });

  test("an invalid op throws and leaves state untouched", () => {
    const k = createFifoCache({ capacity: 2 });
    k.dispatch(access(1));
    const before = k.snapshot();
    assertThrows(() => k.dispatch({ type: "bogus" }));
    assertThrows(() => k.dispatch({ type: "access" })); // no page
    assertEqual(k.snapshot(), before, "state must be unchanged after a throw");
  });
});

suite("fifo-cache: guarantees", () => {
  test("invariants hold after every op in a random walk", () => {
    const k = createFifoCache({ capacity: 4 });
    let seed = 12345;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) % 9;
    for (let i = 0; i < 300; i++) {
      k.dispatch(access(rnd()));
      assert(invariantsHold(k), "invariant broke at step " + i + ": " +
        JSON.stringify(k.invariants().filter((c) => !c.ok)));
    }
  });

  test("deterministic: same ops => same metrics", () => {
    const ops = [5, 1, 5, 2, 3, 1, 4, 5, 2, 6].map(access);
    const a = createFifoCache({ capacity: 3 });
    const b = createFifoCache({ capacity: 3 });
    ops.forEach((o) => a.dispatch(o));
    ops.forEach((o) => b.dispatch(o));
    assertEqual(a.metrics(), b.metrics());
    assertEqual(a.snapshot(), b.snapshot());
  });

  test("reset returns to the initial state", () => {
    const k = createFifoCache({ capacity: 3 });
    const fresh = k.snapshot();
    [1, 2, 3, 4].forEach((p) => k.dispatch(access(p)));
    k.reset();
    assertEqual(k.snapshot(), fresh);
    assertEqual(k.trace, []);
  });

  test("replay reproduces state exactly", () => {
    const cfg = { capacity: 3 };
    const k = createFifoCache(cfg);
    [9, 8, 7, 9, 6, 8].forEach((p) => k.dispatch(access(p)));
    const r = replay(k, fifoCacheSpec(cfg));
    assert(r.ok, r.reason);
  });
});
