/* ============================================================
   replication.mjs — leader-based replicated log (Raft-style) kernel.

   A pure, deterministic teaching model of consensus: a cluster of nodes,
   leader election with the Raft "up-to-date log" voting restriction,
   log replication to followers, and quorum-based commit. Nodes can crash
   and recover; a leader needs a majority of the WHOLE cluster, so losing
   quorum stalls progress (liveness) without ever losing a committed entry
   (safety).

   SIMPLIFICATIONS (disclosed in the lab):
     • Replication copies the leader's log wholesale to reachable followers
       (real Raft reconciles incrementally via AppendEntries + nextIndex).
     • Elections are an explicit op, not randomized timeouts.
     • No log compaction / snapshots / membership changes.
   ============================================================ */

import { createKernel } from "./kernel-contract.mjs";

export function replicationSpec(config) {
  const cfg = Object.assign({ nodes: 5 }, config || {});
  if (!(cfg.nodes >= 1)) throw new Error("replication: need ≥ 1 node");

  return {
    config: cfg,
    init(c) {
      const nodes = {};
      for (let i = 0; i < c.nodes; i++) {
        nodes["N" + i] = { id: "N" + i, role: "follower", term: 0, votedFor: null,
          log: [], commitIndex: 0, alive: true };
      }
      return { n: c.nodes, nodes: nodes, leader: null, note: "Cluster of " + c.nodes + " followers at term 0. Elect a leader." };
    },
    apply(s, op) { applyOp(s, op); },
    legal(s) { return legalOps(s); },
    invariants(s) { return repInvariants(s); },
    metrics(s) { return repMetrics(s); },
  };
}
export function createReplication(config) { return createKernel(replicationSpec(config)); }

/* ── helpers ────────────────────────────────────────────────────────────── */
const ids = (s) => Object.keys(s.nodes);
const quorum = (s) => Math.floor(s.n / 2) + 1;
const lastTerm = (node) => (node.log.length ? node.log[node.log.length - 1].term : 0);
const lastIndex = (node) => node.log.length;

/* Raft up-to-date rule: candidate's log ≥ voter's log */
function atLeastAsUpToDate(cand, voter) {
  const ct = lastTerm(cand), vt = lastTerm(voter);
  if (ct !== vt) return ct > vt;
  return lastIndex(cand) >= lastIndex(voter);
}

function applyOp(s, op) {
  switch (op.type) {
    case "elect":     return opElect(s, op);
    case "write":     return opWrite(s, op);
    case "replicate": return opReplicate(s);
    case "crash":     return opCrash(s, op);
    case "recover":   return opRecover(s, op);
    default: throw new Error("replication: unknown op `" + op.type + "`");
  }
}

function node(s, id) { const n = s.nodes[id]; if (!n) throw new Error("unknown node " + id); return n; }

function opElect(s, op) {
  const cand = node(s, op.node);
  if (!cand.alive) throw new Error("elect: " + op.node + " is crashed");
  const newTerm = Math.max.apply(null, ids(s).map((i) => s.nodes[i].term)) + 1;
  cand.role = "candidate"; cand.term = newTerm; cand.votedFor = cand.id;
  let votes = 1; // votes for itself
  ids(s).forEach((i) => {
    if (i === cand.id) return;
    const v = s.nodes[i];
    if (!v.alive) return;                       // crashed nodes can't vote
    if (v.term <= newTerm && atLeastAsUpToDate(cand, v)) {
      v.term = newTerm; v.votedFor = cand.id; v.role = "follower"; votes++;
    }
  });
  if (votes >= quorum(s)) {
    cand.role = "leader"; s.leader = cand.id;
    ids(s).forEach((i) => { if (i !== cand.id && s.nodes[i].alive) s.nodes[i].role = "follower"; });
    s.note = cand.id + " won term " + newTerm + " with " + votes + "/" + s.n + " votes (quorum " + quorum(s) + ").";
  } else {
    s.leader = (s.leader && s.nodes[s.leader].term >= newTerm && s.nodes[s.leader].alive) ? s.leader : null;
    s.note = cand.id + " failed to win term " + newTerm + " — only " + votes + "/" + s.n + " votes (needs " + quorum(s) + ").";
  }
}

function opWrite(s, op) {
  const L = s.leader ? s.nodes[s.leader] : null;
  if (!L || !L.alive || L.role !== "leader") throw new Error("write: no live leader — elect one first");
  L.log.push({ term: L.term, cmd: op.cmd != null ? op.cmd : "x" + (L.log.length + 1) });
  s.note = "Leader " + L.id + " appended '" + L.log[L.log.length - 1].cmd + "' at index " + L.log.length + " (uncommitted).";
}

function opReplicate(s) {
  const L = s.leader ? s.nodes[s.leader] : null;
  if (!L || !L.alive || L.role !== "leader") throw new Error("replicate: no live leader");
  // push the leader's log to every reachable follower
  ids(s).forEach((i) => {
    const f = s.nodes[i];
    if (i === L.id || !f.alive) return;
    f.log = L.log.map((e) => ({ term: e.term, cmd: e.cmd }));
    f.term = L.term; f.role = "follower";
  });
  // advance commit: highest index replicated on a majority AND from the current term
  let commit = L.commitIndex;
  for (let idx = L.log.length; idx >= 1; idx--) {
    if (L.log[idx - 1].term !== L.term) continue;       // Raft: only commit current-term entries directly
    let count = 0;
    ids(s).forEach((i) => { const nd = s.nodes[i]; if (nd.alive && nd.log.length >= idx && nd.log[idx - 1] && nd.log[idx - 1].term === L.log[idx - 1].term) count++; });
    if (count >= quorum(s)) { commit = idx; break; }
  }
  L.commitIndex = commit;
  ids(s).forEach((i) => { const f = s.nodes[i]; if (f.alive) f.commitIndex = Math.min(commit, f.log.length); });
  s.note = "Replicated to " + (ids(s).filter((i) => s.nodes[i].alive && i !== L.id).length) + " follower(s); commitIndex = " + commit + ".";
}

function opCrash(s, op) {
  const nd = node(s, op.node);
  nd.alive = false; nd.role = "follower";
  if (s.leader === op.node) s.leader = null;
  s.note = op.node + " crashed." + (s.leader === null ? " No leader — re-elect (needs a quorum alive)." : "");
}

function opRecover(s, op) {
  const nd = node(s, op.node);
  nd.alive = true; nd.role = "follower";
  s.note = op.node + " recovered as a follower (log may be stale until the next replicate).";
}

/* ── introspection ──────────────────────────────────────────────────────── */
function legalOps(s) {
  const ops = [];
  ids(s).forEach((i) => { if (s.nodes[i].alive) ops.push({ type: "elect", node: i }); });
  if (s.leader) ops.push({ type: "write", cmd: "set x" }, { type: "replicate" });
  return ops;
}

function committedEntries(s) {
  const L = s.leader ? s.nodes[s.leader] : null;
  const c = L ? L.commitIndex : 0;
  return L ? L.log.slice(0, c) : [];
}

function repInvariants(s) {
  const checks = [];
  // election safety: at most one leader per term
  const leadersByTerm = {};
  let oneLeader = true;
  ids(s).forEach((i) => { const nd = s.nodes[i]; if (nd.role === "leader") { if (leadersByTerm[nd.term]) oneLeader = false; leadersByTerm[nd.term] = i; } });
  checks.push({ name: "election-safety", ok: oneLeader, detail: "≤ 1 leader per term" });

  // committed entries live on a majority
  const L = s.leader ? s.nodes[s.leader] : null;
  let commitOk = true;
  if (L) {
    for (let idx = 1; idx <= L.commitIndex; idx++) {
      let count = 0;
      ids(s).forEach((i) => { const nd = s.nodes[i]; if (nd.log.length >= idx && nd.log[idx - 1] && nd.log[idx - 1].term === L.log[idx - 1].term) count++; });
      if (count < quorum(s)) commitOk = false;
    }
  }
  checks.push({ name: "commit-on-majority", ok: commitOk, detail: "every committed entry is on ≥ quorum nodes" });

  // log matching on committed prefix: all nodes holding a committed index agree
  let match = true;
  if (L) {
    for (let idx = 1; idx <= L.commitIndex; idx++) {
      const want = L.log[idx - 1];
      ids(s).forEach((i) => { const e = s.nodes[i].log[idx - 1]; if (e && (e.term !== want.term || e.cmd !== want.cmd)) match = false; });
    }
  }
  checks.push({ name: "log-matching", ok: match, detail: "committed prefix identical wherever present" });
  return checks;
}

function repMetrics(s) {
  const alive = ids(s).filter((i) => s.nodes[i].alive).length;
  const L = s.leader ? s.nodes[s.leader] : null;
  return {
    nodes: s.n, alive: alive, quorum: quorum(s),
    hasQuorum: alive >= quorum(s),
    term: Math.max.apply(null, ids(s).map((i) => s.nodes[i].term)),
    leader: s.leader || "—",
    logLen: L ? L.log.length : 0,
    committed: L ? L.commitIndex : 0,
  };
}

/** Oracle for tests: the committed command list according to the leader. */
export function committedLog(kernelOrState) {
  const s = kernelOrState.state || kernelOrState;
  return committedEntries(s).map((e) => e.cmd);
}
