/* Tests for the WAL + crash-recovery kernel (sims/kernels/wal.mjs).
   The oracle `committedState` encodes durability + atomicity: after a crash
   and recovery, disk must hold exactly the committed transactions' effects. */

import { suite, test, assert, assertEqual, assertThrows } from "./harness.mjs";
import { invariantsHold, replay } from "../sims/kernels/kernel-contract.mjs";
import { createWal, walSpec, committedState } from "../sims/kernels/wal.mjs";

const begin = (t) => ({ type: "begin", txn: t });
const write = (t, p, v) => ({ type: "write", txn: t, page: p, value: v });
const commit = (t) => ({ type: "commit", txn: t });
const abort = (t) => ({ type: "abort", txn: t });

function runAll(ops, cfg) {
  const k = createWal(cfg);
  ops.forEach((o) => {
    k.dispatch(o);
    assert(invariantsHold(k), "invariant broke after " + JSON.stringify(o) + ": " +
      JSON.stringify(k.invariants().filter((c) => !c.ok)));
  });
  return k;
}

suite("wal: durability (REDO)", () => {
  test("a committed txn survives a crash even if its page never reached disk", () => {
    const k = runAll([begin("T1"), write("T1", "A", 5), commit("T1"), { type: "crash" }]);
    // no-force: A=5 is only in the (lost) buffer, but the log is durable
    assertEqual(k.state.disk.A, 0, "disk still holds old value right after crash");
    k.dispatch({ type: "recover" });
    assertEqual(k.state.disk.A, 5, "REDO restored the committed value");
    assertEqual(k.state.disk, committedState(k));
  });
});

suite("wal: atomicity (UNDO)", () => {
  test("an uncommitted txn is rolled back", () => {
    const k = runAll([begin("T2"), write("T2", "B", 7), { type: "crash" }, { type: "recover" }]);
    assertEqual(k.state.disk.B, 0, "loser's write was undone");
    assertEqual(k.state.disk, committedState(k));
  });

  test("a stolen (flushed) dirty page from a loser is still undone", () => {
    const k = runAll([
      begin("T3"), write("T3", "C", 9),
      { type: "flushPage", page: "C" },   // steal: C=9 hits disk before commit
    ]);
    assertEqual(k.state.disk.C, 9, "steal wrote the dirty value to disk");
    k.dispatch({ type: "crash" });
    k.dispatch({ type: "recover" });
    assertEqual(k.state.disk.C, 0, "UNDO reverted the stolen page");
    assertEqual(k.state.disk, committedState(k));
  });
});

suite("wal: concurrency correctness", () => {
  test("strict 2PL blocks a second writer on a locked page", () => {
    const k = createWal();
    k.dispatch(begin("T1")); k.dispatch(write("T1", "A", 5));
    k.dispatch(begin("T2"));
    assertThrows(() => k.dispatch(write("T2", "A", 9)), "page A is X-locked by T1");
  });

  test("winner-after-loser on the same page recovers to the winner's value", () => {
    // T1 writes A then commits (releases lock); T2 writes A but never commits; crash.
    const k = runAll([
      begin("T1"), write("T1", "A", 5), commit("T1"),
      begin("T2"), write("T2", "A", 9),
      { type: "crash" }, { type: "recover" },
    ]);
    assertEqual(k.state.disk.A, 5, "loser T2 undone back to committed T1 value");
    assertEqual(k.state.disk, committedState(k));
  });
});

suite("wal: abort & checkpoint", () => {
  test("running abort rolls back via CLRs", () => {
    const k = runAll([begin("T1"), write("T1", "A", 3), write("T1", "B", 4), abort("T1")]);
    assertEqual(k.state.buffer.A, 0);
    assertEqual(k.state.buffer.B, 0);
    assert(k.state.log.some((r) => r.type === "clr"), "CLRs were written");
  });

  test("checkpoint then mixed winners/losers recovers correctly", () => {
    const k = runAll([
      begin("T1"), write("T1", "A", 1), commit("T1"),
      { type: "checkpoint" },
      begin("T2"), write("T2", "B", 2),              // loser
      begin("T3"), write("T3", "C", 3), commit("T3"), // winner
      { type: "crash" }, { type: "recover" },
    ]);
    assertEqual(k.state.disk, committedState(k));
    assertEqual(k.state.disk.A, 1);
    assertEqual(k.state.disk.B, 0);  // undone
    assertEqual(k.state.disk.C, 3);  // redone
    assert(k.state.recovery.winners.indexOf("T3") !== -1);
    assert(k.state.recovery.losers.indexOf("T2") !== -1);
  });
});

suite("wal: kernel guarantees", () => {
  const scenario = [
    begin("T1"), write("T1", "A", 5), { type: "flushPage", page: "A" }, commit("T1"),
    begin("T2"), write("T2", "B", 8), { type: "checkpoint" },
    begin("T3"), write("T3", "C", 2), commit("T3"),
    write("T2", "A", 99),             // T2 still holds nothing on A? A lock freed at T1 commit → ok
    { type: "crash" }, { type: "recover" },
  ];

  test("deterministic: same ops => same disk, buffer, metrics", () => {
    const a = createWal(); const b = createWal();
    scenario.forEach((o) => a.dispatch(o));
    scenario.forEach((o) => b.dispatch(o));
    assertEqual(a.state.disk, b.state.disk);
    assertEqual(a.state.buffer, b.state.buffer);
    assertEqual(a.metrics(), b.metrics());
  });

  test("final disk equals the committed-state oracle", () => {
    const k = createWal();
    scenario.forEach((o) => k.dispatch(o));
    assertEqual(k.state.disk, committedState(k));
  });

  test("reset clears everything", () => {
    const k = createWal();
    const fresh = k.snapshot();
    scenario.forEach((o) => k.dispatch(o));
    k.reset();
    assertEqual(k.snapshot(), fresh);
  });

  test("replay reproduces state exactly", () => {
    const k = createWal();
    scenario.forEach((o) => k.dispatch(o));
    const r = replay(k, walSpec(k.config));
    assert(r.ok, r.reason);
  });

  test("invalid ops throw without corrupting state", () => {
    const k = createWal();
    k.dispatch(begin("T1"));
    const before = k.snapshot();
    assertThrows(() => k.dispatch(commit("TX")), "unknown txn");
    assertThrows(() => k.dispatch(write("T1", "Z", 1)), "unknown page");
    assertThrows(() => k.dispatch({ type: "recover" }), "recover while running");
    assertEqual(k.snapshot(), before);
  });
});
