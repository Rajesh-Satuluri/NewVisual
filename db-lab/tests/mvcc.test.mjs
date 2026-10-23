/* Tests for the MVCC kernel (sims/kernels/mvcc.mjs).
   The teaching points are snapshot stability (repeatable reads), the
   invisibility of concurrent commits to an already-open snapshot, and
   first-updater-wins conflict detection. */
import { suite, test, assert, assertEqual, assertThrows } from "./harness.mjs";
import { invariantsHold, replay } from "../sims/kernels/kernel-contract.mjs";
import { createMvcc, mvccSpec, visibleValue } from "../sims/kernels/mvcc.mjs";

const begin = (t) => ({ type: "begin", txn: t });
const read = (t, k) => ({ type: "read", txn: t, key: k });
const update = (t, k, v) => ({ type: "update", txn: t, key: k, value: v });
const del = (t, k) => ({ type: "delete", txn: t, key: k });
const commit = (t) => ({ type: "commit", txn: t });
const abort = (t) => ({ type: "abort", txn: t });

function seeded() { return createMvcc({ seed: { A: 1, B: 2 } }); }

suite("mvcc: snapshot isolation", () => {
  test("a reader sees a stable snapshot across a concurrent commit", () => {
    const k = seeded();
    k.dispatch(begin("T1"));                 // T1 snapshots {A:1, B:2}
    k.dispatch(begin("T2"));
    k.dispatch(update("T2", "A", 99));
    k.dispatch(commit("T2"));                // T2 commits AFTER T1's snapshot
    assertEqual(visibleValue(k, "T1", "A"), 1, "T1 still sees the old value (repeatable read)");
    assert(invariantsHold(k), JSON.stringify(k.invariants()));
  });

  test("a new transaction sees the committed value", () => {
    const k = seeded();
    k.dispatch(begin("T2")); k.dispatch(update("T2", "A", 99)); k.dispatch(commit("T2"));
    k.dispatch(begin("T3"));
    assertEqual(visibleValue(k, "T3", "A"), 99, "T3 began after T2 committed → sees 99");
  });

  test("an aborted writer's version is invisible with no physical rollback", () => {
    const k = seeded();
    k.dispatch(begin("T2")); k.dispatch(update("T2", "A", 77)); k.dispatch(abort("T2"));
    k.dispatch(begin("T3"));
    assertEqual(visibleValue(k, "T3", "A"), 1, "aborted update doesn't show");
    assert(k.state.tuples.some((v) => v.value === 77), "the dead version physically remains until VACUUM");
  });
});

suite("mvcc: conflicts", () => {
  test("first-updater-wins: the second concurrent writer conflicts", () => {
    const k = seeded();
    k.dispatch(begin("T1")); k.dispatch(begin("T2"));
    k.dispatch(update("T1", "A", 10));
    assertThrows(() => k.dispatch(update("T2", "A", 20)), "T2 should hit a write-write conflict");
    // state unchanged by the thrown op
    assert(invariantsHold(k));
  });

  test("serialization failure when the concurrent writer already committed", () => {
    const k = seeded();
    k.dispatch(begin("T1")); k.dispatch(begin("T2"));
    k.dispatch(update("T2", "A", 20)); k.dispatch(commit("T2"));
    assertThrows(() => k.dispatch(update("T1", "A", 10)), "T1 sees a serialization failure");
  });
});

suite("mvcc: dead tuples & VACUUM accounting", () => {
  test("a committed update leaves a dead version", () => {
    const k = seeded();
    k.dispatch(begin("T1")); k.dispatch(update("T1", "A", 5)); k.dispatch(commit("T1"));
    const m = k.metrics();
    assertEqual(m.deadVersions, 1, "the superseded A=1 version is now dead (reclaimable)");
    assertEqual(m.liveVersions, 2, "A=5 and B=2 are live");
  });
});

suite("mvcc: guarantees", () => {
  const scenario = [
    begin("T1"), begin("T2"),
    update("T1", "A", 10), read("T2", "A"), commit("T1"),
    begin("T3"), update("T3", "B", 30), read("T2", "B"), commit("T3"),
    read("T2", "A"), commit("T2"),
    begin("T4"), del("T4", "A"), commit("T4"),
  ];
  test("invariants hold after every op", () => {
    const k = seeded();
    scenario.forEach((o) => { k.dispatch(o); assert(invariantsHold(k), "broke after " + JSON.stringify(o) + ": " + JSON.stringify(k.invariants().filter((c) => !c.ok))); });
  });
  test("deterministic + reset + replay", () => {
    const a = seeded(); const b = seeded();
    scenario.forEach((o) => a.dispatch(o)); scenario.forEach((o) => b.dispatch(o));
    assertEqual(a.snapshot(), b.snapshot());
    assert(replay(a, mvccSpec(a.config)).ok);
    const fresh = seeded().snapshot(); a.reset(); assertEqual(a.snapshot(), fresh);
  });
  test("invalid ops throw without corrupting state", () => {
    const k = seeded(); k.dispatch(begin("T1"));
    const before = k.snapshot();
    assertThrows(() => k.dispatch(read("TX", "A")), "unknown txn");
    assertThrows(() => k.dispatch({ type: "nope" }), "unknown op");
    assertThrows(() => k.dispatch(update("T1", "Z", 1) && 0), "no visible row Z");
    assertEqual(k.snapshot(), before);
  });
});
