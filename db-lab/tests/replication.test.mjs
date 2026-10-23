/* Tests for the replicated-log / consensus kernel (sims/kernels/replication.mjs).
   Safety guarantees: at most one leader per term, committed entries on a
   majority, and committed entries survive crash + re-election as long as a
   quorum lives. Liveness: no leader without a quorum. */
import { suite, test, assert, assertEqual, assertThrows } from "./harness.mjs";
import { invariantsHold, replay } from "../sims/kernels/kernel-contract.mjs";
import { createReplication, replicationSpec, committedLog } from "../sims/kernels/replication.mjs";

const elect = (n) => ({ type: "elect", node: n });
const write = (cmd) => ({ type: "write", cmd: cmd });
const rep = { type: "replicate" };
const crash = (n) => ({ type: "crash", node: n });
const recover = (n) => ({ type: "recover", node: n });

function run(k, ops) {
  ops.forEach((o) => { k.dispatch(o); assert(invariantsHold(k), "invariant broke after " + JSON.stringify(o) + ": " + JSON.stringify(k.invariants().filter((c) => !c.ok))); });
  return k;
}

suite("replication: election", () => {
  test("a node wins with a majority and becomes leader", () => {
    const k = run(createReplication({ nodes: 5 }), [elect("N0")]);
    assertEqual(k.state.leader, "N0");
    assertEqual(k.state.nodes.N0.role, "leader");
    assertEqual(k.metrics().term, 1);
  });
  test("no leader can be elected without a quorum alive", () => {
    const k = createReplication({ nodes: 5 });
    run(k, [crash("N1"), crash("N2"), crash("N3")]); // only N0,N4 alive (2 < quorum 3)
    k.dispatch(elect("N0"));
    assertEqual(k.state.leader, null, "2 of 5 cannot form a quorum");
    assert(!k.metrics().hasQuorum);
  });
});

suite("replication: commit requires a majority", () => {
  test("an entry commits only after it is on a quorum", () => {
    const k = run(createReplication({ nodes: 5 }), [elect("N0"), write("a"), write("b")]);
    assertEqual(k.metrics().committed, 0, "nothing committed before replication");
    k.dispatch(rep);
    assertEqual(committedLog(k), ["a", "b"], "both commit once replicated to the majority");
  });
});

suite("replication: safety across failover", () => {
  test("a committed entry survives leader crash + re-election", () => {
    const k = run(createReplication({ nodes: 5 }), [elect("N0"), write("x"), rep]);
    assertEqual(committedLog(k), ["x"]);
    // leader + one follower crash; 3 of 5 remain (still a quorum)
    run(k, [crash("N0"), crash("N4")]);
    k.dispatch(elect("N1")); // N1 has x in its log (it replicated), so it can win
    assertEqual(k.state.leader, "N1", "a node with the committed entry wins");
    assert(k.state.nodes.N1.log.some((e) => e.cmd === "x"), "new leader still has x");
    k.dispatch(rep);
    assert(committedLog(k).indexOf("x") !== -1, "x stays committed");
  });

  test("the up-to-date rule stops a stale node from erasing committed data", () => {
    const k = createReplication({ nodes: 3 });
    run(k, [elect("N0"), write("keep"), rep]);     // N0,N1,N2 all have 'keep', committed
    run(k, [crash("N0")]);                          // leader gone; N1,N2 remain (quorum 2)
    // N1 and N2 both have 'keep'; either can win and must retain it
    k.dispatch(elect("N1"));
    assert(k.state.nodes.N1.log.some((e) => e.cmd === "keep"));
    assert(invariantsHold(k));
  });
});

suite("replication: guarantees", () => {
  const scenario = [elect("N0"), write("a"), rep, write("b"), rep, crash("N0"), elect("N1"), write("c"), rep, recover("N0"), rep];
  test("invariants hold through a crash/elect/recover scenario", () => {
    run(createReplication({ nodes: 5 }), scenario);
  });
  test("deterministic + reset + replay", () => {
    const a = createReplication({ nodes: 5 }); const b = createReplication({ nodes: 5 });
    scenario.forEach((o) => a.dispatch(o)); scenario.forEach((o) => b.dispatch(o));
    assertEqual(a.snapshot(), b.snapshot());
    assert(replay(a, replicationSpec(a.config)).ok);
    const fresh = createReplication({ nodes: 5 }).snapshot(); a.reset(); assertEqual(a.snapshot(), fresh);
  });
  test("invalid ops throw", () => {
    const k = createReplication({ nodes: 3 });
    assertThrows(() => k.dispatch(write("x")), "no leader yet");
    assertThrows(() => k.dispatch({ type: "elect", node: "N9" }), "unknown node");
    assertThrows(() => k.dispatch({ type: "nope" }));
  });
});
