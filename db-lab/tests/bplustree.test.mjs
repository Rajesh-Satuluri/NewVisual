/* Tests for the B+Tree kernel (sims/kernels/bplustree.mjs).
   The oracle is a plain sorted JS array: after any insert/delete mix,
   an in-order leaf scan must equal the sorted key set, and every
   structural invariant (balance, occupancy, separators) must hold. */
import { suite, test, assert, assertEqual, assertThrows } from "./harness.mjs";
import { invariantsHold, replay } from "../sims/kernels/kernel-contract.mjs";
import { createBPlusTree, bplustreeSpec, sortedKeys } from "../sims/kernels/bplustree.mjs";

const ins = (key) => ({ type: "insert", key: key });
const del = (key) => ({ type: "delete", key: key });

function checkAll(k, expectedSet, label) {
  assert(invariantsHold(k), label + " invariant broke: " +
    JSON.stringify(k.invariants().filter((c) => !c.ok)));
  assertEqual(sortedKeys(k), expectedSet.slice().sort((a, b) => a - b), label + " leaf scan ≠ sorted set");
}

suite("bplustree: insert + split", () => {
  test("ascending inserts stay balanced and sorted (order 3)", () => {
    const k = createBPlusTree({ order: 3 });
    const set = [];
    for (let key = 1; key <= 25; key++) { k.dispatch(ins(key)); set.push(key); checkAll(k, set, "asc"); }
    assert(k.metrics().height >= 3, "tree should have grown past height 2");
  });

  test("duplicate inserts are ignored", () => {
    const k = createBPlusTree({ order: 4 });
    [5, 2, 9].forEach((key) => k.dispatch(ins(key)));
    k.dispatch(ins(5)); // the duplicate
    assert(k.state.lastOp.dup === true, "re-inserting 5 flags a duplicate");
    assertEqual(sortedKeys(k), [2, 5, 9]);
  });
});

suite("bplustree: delete + rebalance", () => {
  test("delete every key in insert order down to empty (order 3)", () => {
    const k = createBPlusTree({ order: 3 });
    const keys = [50, 20, 70, 10, 30, 60, 80, 15, 25, 35, 65, 75, 85, 5, 90];
    const set = [];
    keys.forEach((key) => { k.dispatch(ins(key)); set.push(key); });
    checkAll(k, set, "built");
    // delete in a different order, forcing borrows and merges
    const order = [10, 70, 50, 85, 5, 35, 20, 65, 90, 15, 25, 30, 60, 75, 80];
    order.forEach((key) => {
      k.dispatch(del(key));
      set.splice(set.indexOf(key), 1);
      checkAll(k, set, "after del " + key);
    });
    assertEqual(k.state.root, null, "tree empty at the end");
  });

  test("deleting an absent key is a no-op", () => {
    const k = createBPlusTree({ order: 3 });
    [1, 2, 3].forEach((key) => k.dispatch(ins(key)));
    k.dispatch(del(99));
    assert(k.state.lastOp.absent === true);
    assertEqual(sortedKeys(k), [1, 2, 3]);
  });
});

suite("bplustree: search + range", () => {
  test("search reports found/not-found and a leaf-deep path", () => {
    const k = createBPlusTree({ order: 3 });
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].forEach((key) => k.dispatch(ins(key)));
    k.dispatch({ type: "search", key: 7 });
    assert(k.state.lastOp.found === true);
    assertEqual(k.state.lastOp.comparisons, k.metrics().height);
    k.dispatch({ type: "search", key: 99 });
    assert(k.state.lastOp.found === false);
  });

  test("range scan returns exactly the keys in [lo,hi]", () => {
    const k = createBPlusTree({ order: 4 });
    for (let key = 1; key <= 30; key++) k.dispatch(ins(key));
    k.dispatch({ type: "range", lo: 8, hi: 17 });
    assertEqual(k.state.lastOp.keys, [8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
  });

  test("range requires numeric bounds", () => {
    const k = createBPlusTree({ order: 3 });
    k.dispatch(ins(1));
    assertThrows(() => k.dispatch({ type: "range", lo: "a", hi: 5 }));
  });
});

suite("bplustree: guarantees", () => {
  const seed0 = 20240101;
  function build(order, n) {
    const k = createBPlusTree({ order: order });
    let seed = seed0; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff);
    const set = [];
    for (let i = 0; i < n; i++) {
      const key = rnd() % 200;
      if (set.indexOf(key) === -1) set.push(key);
      k.dispatch(ins(key));
    }
    return { k: k, set: set };
  }

  test("random insert/delete keeps invariants for orders 3,4,5", () => {
    [3, 4, 5].forEach((order) => {
      const { k, set } = build(order, 120);
      checkAll(k, set, "order " + order + " built");
      // delete a deterministic half
      let seed = 42; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff);
      const toDelete = set.slice().sort((a, b) => (rnd() % 2) - 0.5);
      toDelete.slice(0, Math.floor(set.length / 2)).forEach((key) => {
        k.dispatch(del(key));
        set.splice(set.indexOf(key), 1);
        checkAll(k, set, "order " + order + " del " + key);
      });
    });
  });

  test("deterministic + reset + replay", () => {
    const { k } = build(4, 60);
    const fresh = createBPlusTree({ order: 4 }).snapshot();
    const snap = k.snapshot();
    const a = createBPlusTree({ order: 4 });
    k.trace.forEach((o) => a.dispatch(o));
    assertEqual(a.snapshot(), snap, "re-dispatch reproduces the tree");
    k.reset(); assertEqual(k.snapshot(), fresh);
  });
});
