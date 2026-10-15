/* ============================================================
   mvcc.mjs — Multi-Version Concurrency Control kernel.

   A pure, deterministic model of PostgreSQL-style MVCC under snapshot
   isolation. Each row is a chain of tuple versions stamped with
   xmin (creating xid) and xmax (deleting/superseding xid). A
   transaction reads through a snapshot captured at BEGIN, so it sees a
   stable view; writers never block readers. First-updater-wins
   detects write-write conflicts.

   Visibility (tuple v visible to txn T with snapshot snap):
     creator ok : v.xmin == T   OR  (xmin committed before T began)
     deleter ok : v.xmax is null OR v.xmax not-yet-visibly-committed
   "committed before T began" = status committed AND xid < snap.xmax AND
     xid not in snap.active (the in-progress list captured at BEGIN).

   SIMPLIFICATION: snapshot is taken once at BEGIN (repeatable-read /
   snapshot isolation). READ COMMITTED would retake it per statement.
   ============================================================ */

import { createKernel } from "./kernel-contract.mjs";

export function mvccSpec(config) {
  const cfg = Object.assign({ seed: {} }, config || {}); // seed: { key: value } pre-committed rows

  return {
    config: cfg,
    init(c) {
      const s = {
        tuples: [],      // { id, key, value, xmin, xmax }
        txns: {},        // xid -> { xid, status:'active'|'committed'|'aborted', snapshot }
        nextXid: 1,
        nextTid: 1,
        lastRead: null,  // { xid, key, value, found } for the renderer
        note: "Fresh MVCC table.",
      };
      // seed rows as if committed by a bootstrap txn xid 0
      s.txns[0] = { xid: 0, status: "committed", snapshot: { active: [], xmax: 0 } };
      Object.keys(c.seed).forEach((k) => {
        s.tuples.push({ id: "v" + s.nextTid++, key: k, value: c.seed[k], xmin: 0, xmax: null });
      });
      return s;
    },
    apply(s, op) { applyOp(s, op); },
    legal(s) { return legalOps(s); },
    invariants(s) { return mvccInvariants(s); },
    metrics(s) { return mvccMetrics(s); },
  };
}

export function createMvcc(config) { return createKernel(mvccSpec(config)); }

/* ── visibility ─────────────────────────────────────────────────────────── */
function committedBefore(xid, snap, txns) {
  const t = txns[xid];
  return !!t && t.status === "committed" && xid < snap.xmax && snap.active.indexOf(xid) === -1;
}
function visible(v, T, txns) {
  const snap = T.snapshot;
  const creatorOk = v.xmin === T.xid || committedBefore(v.xmin, snap, txns);
  if (!creatorOk) return false;
  if (v.xmax == null) return true;
  if (v.xmax === T.xid) return false;                 // deleted by self
  if (committedBefore(v.xmax, snap, txns)) return false; // deleted by a visibly-committed txn
  return true;                                         // deleter not visible yet
}
function visibleVersion(s, T, key) {
  for (const v of s.tuples) if (v.key === key && visible(v, T, s.txns)) return v;
  return null;
}

/** Oracle for tests/renderer: the value txn `who` (xid number or label)
 *  currently sees for `key`. */
export function visibleValue(kernelOrState, who, key) {
  const s = kernelOrState.state || kernelOrState;
  let xid = who;
  if (typeof who === "string") {
    const ids = Object.keys(s.txns).map(Number);
    xid = undefined;
    for (let i = ids.length - 1; i >= 0; i--) if (s.txns[ids[i]].label === who) { xid = ids[i]; break; }
  }
  const T = s.txns[xid];
  if (!T) return undefined;
  const v = visibleVersion(s, T, key);
  return v ? v.value : undefined;
}

/** Ids of the tuple versions visible to `who` (xid or label) — for the renderer. */
export function visibleSet(kernelOrState, who) {
  const s = kernelOrState.state || kernelOrState;
  let xid = who;
  if (typeof who === "string") {
    const ids = Object.keys(s.txns).map(Number); xid = undefined;
    for (let i = ids.length - 1; i >= 0; i--) if (s.txns[ids[i]].label === who) { xid = ids[i]; break; }
  }
  const T = s.txns[xid];
  if (!T) return [];
  return s.tuples.filter((v) => visible(v, T, s.txns)).map((v) => v.id);
}

/* ── ops ────────────────────────────────────────────────────────────────── */
function applyOp(s, op) {
  switch (op.type) {
    case "begin":  return opBegin(s, op);
    case "read":   return opRead(s, op);
    case "insert": return opWrite(s, op, "insert");
    case "update": return opWrite(s, op, "update");
    case "delete": return opWrite(s, op, "delete");
    case "commit": return opEnd(s, op, "committed");
    case "abort":  return opEnd(s, op, "aborted");
    default: throw new Error("mvcc: unknown op `" + op.type + "`");
  }
}
function requireActive(s, xid, what) {
  const T = s.txns[xid];
  if (!T || T.status !== "active") throw new Error(what + ": " + xid + " is not an active transaction");
  return T;
}
function activeXids(s) { return Object.keys(s.txns).map(Number).filter((x) => s.txns[x].status === "active"); }

function opBegin(s, op) {
  if (!op.txn) throw new Error("begin: needs a txn label");
  const xid = s.nextXid++;
  const active = activeXids(s);
  s.txns[xid] = { xid: xid, label: op.txn, status: "active", snapshot: { active: active.slice(), xmax: xid } };
  s.note = op.txn + " began as xid " + xid + " — snapshot: active=[" + active.join(",") + "], xmax=" + xid + ".";
  return xid;
}

function resolveXid(s, op) {
  // accept either a raw xid or a label
  if (typeof op.xid === "number") return op.xid;
  const ids = Object.keys(s.txns).map(Number);
  for (let i = ids.length - 1; i >= 0; i--) if (s.txns[ids[i]].label === op.txn) return ids[i];
  throw new Error("unknown transaction " + (op.txn || op.xid));
}

function opRead(s, op) {
  const xid = resolveXid(s, op);
  const T = requireActive(s, xid, "read");
  const v = visibleVersion(s, T, op.key);
  s.lastRead = { xid: xid, label: T.label, key: op.key, value: v ? v.value : null, found: !!v };
  s.note = T.label + " reads " + op.key + " → " + (v ? v.value : "∅ (not visible)") + ".";
}

function opWrite(s, op, kind) {
  const xid = resolveXid(s, op);
  const T = requireActive(s, xid, kind);
  const vis = visibleVersion(s, T, op.key);

  if (kind === "insert") {
    if (vis) throw new Error("insert: key " + op.key + " already visible to " + T.label);
    s.tuples.push({ id: "v" + s.nextTid++, key: op.key, value: op.value, xmin: xid, xmax: null });
    s.note = T.label + " inserted " + op.key + "=" + op.value + " (new version, xmin=" + xid + ").";
    return;
  }
  if (!vis) throw new Error(kind + ": no version of " + op.key + " is visible to " + T.label);

  // first-updater-wins: if the version T sees is already being superseded by
  // another (non-aborted) transaction, that's a write-write conflict.
  if (vis.xmax != null && vis.xmax !== xid && s.txns[vis.xmax] && s.txns[vis.xmax].status !== "aborted") {
    const other = s.txns[vis.xmax];
    const why = other.status === "active"
      ? "write-write conflict: " + op.key + " is locked by " + other.label + " (would block, then abort)"
      : "serialization failure: " + other.label + " concurrently updated " + op.key + " (first-updater-wins)";
    throw new Error(why);
  }

  vis.xmax = xid; // mark the old version superseded by T
  if (kind === "update") {
    s.tuples.push({ id: "v" + s.nextTid++, key: op.key, value: op.value, xmin: xid, xmax: null });
    s.note = T.label + " updated " + op.key + "=" + op.value + " — old version stamped xmax=" + xid + ", new version created.";
  } else {
    s.note = T.label + " deleted " + op.key + " — version stamped xmax=" + xid + ".";
  }
}

function opEnd(s, op, status) {
  const xid = resolveXid(s, op);
  requireActive(s, xid, status === "committed" ? "commit" : "abort");
  s.txns[xid].status = status;
  s.note = s.txns[xid].label + (status === "committed" ? " committed." : " aborted — its versions become invisible (no physical rollback needed).");
}

/* ── introspection ──────────────────────────────────────────────────────── */
function legalOps(s) {
  const ops = [{ type: "begin", txn: "T" + s.nextXid }];
  activeXids(s).forEach((x) => {
    const label = s.txns[x].label;
    ops.push({ type: "commit", txn: label }, { type: "abort", txn: label });
  });
  return ops;
}

function globallyDead(v, txns) {
  return v.xmax != null && txns[v.xmax] && txns[v.xmax].status === "committed";
}

function mvccInvariants(s) {
  const checks = [];
  // every xmin/xmax references a known txn
  let refsOk = true;
  s.tuples.forEach((v) => {
    if (s.txns[v.xmin] === undefined) refsOk = false;
    if (v.xmax != null && s.txns[v.xmax] === undefined) refsOk = false;
  });
  checks.push({ name: "refs-valid", ok: refsOk, detail: "every xmin/xmax names a real transaction" });

  // snapshots sane
  const snapOk = Object.keys(s.txns).every((x) => s.txns[x].snapshot.xmax <= s.nextXid);
  checks.push({ name: "snapshot-sane", ok: snapOk, detail: "snapshot xmax ≤ nextXid" });

  // at most one visible version per (active txn, key) — the core SI guarantee
  let oneVisible = true, worstKey = "";
  activeXids(s).forEach((x) => {
    const T = s.txns[x];
    const keys = {};
    s.tuples.forEach((v) => { if (visible(v, T, s.txns)) keys[v.key] = (keys[v.key] || 0) + 1; });
    Object.keys(keys).forEach((k) => { if (keys[k] > 1) { oneVisible = false; worstKey = k + " for " + T.label; } });
  });
  checks.push({ name: "single-version-visible", ok: oneVisible,
    detail: oneVisible ? "each txn sees ≤ 1 version per key" : "multiple visible versions: " + worstKey });
  return checks;
}

function mvccMetrics(s) {
  const dead = s.tuples.filter((v) => globallyDead(v, s.txns)).length;
  const byStatus = (st) => Object.keys(s.txns).filter((x) => Number(x) !== 0 && s.txns[x].status === st).length;
  return {
    versions: s.tuples.length,
    liveVersions: s.tuples.length - dead,
    deadVersions: dead,                 // reclaimable by VACUUM
    activeTxns: byStatus("active"),
    committedTxns: byStatus("committed"),
    abortedTxns: byStatus("aborted"),
  };
}
