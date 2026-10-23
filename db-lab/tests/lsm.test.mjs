/* Tests for the LSM-tree kernel (sims/kernels/lsm.mjs).
   Oracle: a plain JS Map. Through any mix of puts/deletes/flush/compaction,
   a point lookup must equal the Map (last-writer-wins, tombstones honoured). */
import { suite, test, assert, assertEqual, assertThrows } from "./harness.mjs";
import { invariantsHold, replay } from "../sims/kernels/kernel-contract.mjs";
import { createLsm, lsmSpec, getValue } from "../sims/kernels/lsm.mjs";

const put = (k, v) => ({ type: "put", key: k, value: v });
const del = (k) => ({ type: "delete", key: k });

function checkOracle(k, ref, label) {
  assert(invariantsHold(k), label + " invariant broke: " + JSON.stringify(k.invariants().filter((c) => !c.ok)));
  for (const [key, val] of ref) assertEqual(getValue(k, key), val, label + " key " + key);
}

suite("lsm: flush & read path", () => {
  test("a put flushes to L0 once the MemTable fills", () => {
    const k = createLsm({ memtableLimit: 3, l0Limit: 99 });
    [put(1, 10), put(2, 20), put(3, 30)].forEach((o) => k.dispatch(o)); // 3rd fills → flush
    assertEqual(k.metrics().memtable, 0, "memtable drained by flush");
    assert(k.metrics().sstables >= 1, "an SSTable exists");
    assertEqual(getValue(k, 2), 20);
  });

  test("Bloom filter skips SSTables that can't hold the key", () => {
    const k = createLsm({ memtableLimit: 2, l0Limit: 99 });
    [put(1, 1), put(2, 2), put(10, 10), put(11, 11)].forEach((o) => k.dispatch(o)); // two L0 runs: {1,2},{10,11}
    k.dispatch({ type: "get", key: 99 });
    assertEqual(k.state.lastGet.found, false);
    assert(k.state.lastGet.skipped >= 1, "at least one SSTable skipped by Bloom");
    k.dispatch({ type: "get", key: 10 });
    assertEqual(k.state.lastGet.found, true);
  });
});

suite("lsm: last-writer-wins & tombstones", () => {
  test("a newer value shadows an older one across levels", () => {
    const k = createLsm({ memtableLimit: 2, l0Limit: 99 });
    [put(5, 100), put(6, 1)].forEach((o) => k.dispatch(o));    // flush {5:100,6:1}
    k.dispatch(put(5, 999));                                   // newer 5 in memtable
    assertEqual(getValue(k, 5), 999, "newest value wins");
  });
  test("a delete hides a key even with older SSTable versions", () => {
    const k = createLsm({ memtableLimit: 2, l0Limit: 99 });
    [put(7, 70), put(8, 80)].forEach((o) => k.dispatch(o));    // flush
    k.dispatch(del(7));
    assertEqual(getValue(k, 7), undefined, "tombstone hides the key");
  });
});

suite("lsm: compaction preserves correctness", () => {
  test("heavy workload with auto-compaction matches the oracle", () => {
    const k = createLsm({ memtableLimit: 4, fanout: 3, l0Limit: 3 });
    const ref = new Map();
    let seed = 5;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff);
    for (let i = 0; i < 300; i++) {
      const key = rnd() % 40;
      if (rnd() % 5 === 0) { k.dispatch(del(key)); ref.delete(key); }
      else { const v = rnd() % 1000; k.dispatch(put(key, v)); ref.set(key, v); }
      if (i % 25 === 0) checkOracle(k, ref, "step " + i);
    }
    assert(k.metrics().compactions > 0, "compaction actually ran");
    checkOracle(k, ref, "final");
  });

  test("full compaction purges tombstones and keeps live data", () => {
    const k = createLsm({ memtableLimit: 3, l0Limit: 2 });
    const ref = new Map();
    [put(1, 1), put(2, 2), put(3, 3), put(4, 4), del(2), put(5, 5)].forEach((o) => {
      k.dispatch(o); if (o.type === "delete") ref.delete(o.key); else ref.set(o.key, o.value);
    });
    k.dispatch({ type: "compact" });
    checkOracle(k, ref, "after full compaction");
    assertEqual(getValue(k, 2), undefined);
  });
});

suite("lsm: amplification & guarantees", () => {
  test("write amplification exceeds 1 once compaction rewrites data", () => {
    const k = createLsm({ memtableLimit: 2, fanout: 2, l0Limit: 2 });
    for (let i = 0; i < 40; i++) k.dispatch(put(i % 10, i));
    assert(k.metrics().writeAmp > 1, "rewrites inflate write amp");
    assert(k.metrics().spaceAmp >= 1, "space amp ≥ 1");
  });
  test("deterministic + reset + replay", () => {
    const cfg = { memtableLimit: 3, fanout: 3, l0Limit: 3 };
    const ops = [put(1, 1), put(5, 5), put(2, 2), del(5), put(9, 9), put(3, 3), put(1, 100), { type: "compact" }];
    const a = createLsm(cfg); const b = createLsm(cfg);
    ops.forEach((o) => a.dispatch(o)); ops.forEach((o) => b.dispatch(o));
    assertEqual(a.snapshot(), b.snapshot());
    assert(replay(a, lsmSpec(cfg)).ok);
    const fresh = createLsm(cfg).snapshot(); a.reset(); assertEqual(a.snapshot(), fresh);
  });
  test("invalid ops throw", () => {
    const k = createLsm({});
    assertThrows(() => k.dispatch(put("x", 1)), "non-number key");
    assertThrows(() => k.dispatch({ type: "nope" }));
  });
});
