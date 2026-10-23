/* ============================================================
   wal.mjs — Write-Ahead Logging + crash recovery kernel.

   A pure, deterministic teaching model of WAL durability and
   ARIES-style recovery. It is faithful to the mechanics that matter
   and honest about its simplifications (see SIMPLIFICATIONS below).

   Buffer policy: STEAL + NO-FORCE
     • steal    → a dirty page may be written to disk before commit
                  ⇒ recovery needs UNDO (roll back losers).
     • no-force → a committed page may still be only in the buffer
                  ⇒ recovery needs REDO (replay winners).
   Concurrency: strict two-phase locking at page granularity. A page
     written by a transaction is X-locked until that transaction ends.
     This is what makes blind physiological UNDO correct: no committed
     transaction can have overwritten a loser's page after it.

   SIMPLIFICATIONS (disclosed in the lab UI):
     • Physical full-page values, not byte-level diffs.
     • REDO scans the whole durable log (always correct; a real engine
       starts at the checkpoint's recLSN — the checkpoint here trims
       ANALYSIS only).
     • One in-flight checkpoint model (fuzzy); no nested/parallel ckpts.
     • No log-record compression, no page LSNs on disk pages.
   ============================================================ */

import { createKernel } from "./kernel-contract.mjs";

export function walSpec(config) {
  const cfg = Object.assign({ pages: { A: 0, B: 0, C: 0 } }, config || {});

  return {
    config: cfg,

    init(c) {
      const disk = Object.assign({}, c.pages);
      return {
        pageIds: Object.keys(c.pages),
        initial: Object.assign({}, c.pages),
        disk: Object.assign({}, disk),       // durable (survives crash)
        buffer: Object.assign({}, disk),      // volatile (lost on crash)
        log: [],            // { lsn, type, txn, page, before, after, undoOf?, active?, dirty? }
        nextLsn: 1,
        durableLSN: 0,       // highest LSN flushed to the durable log
        txns: {},            // id -> { id, status, updates:[lsn] }
        locks: {},           // page -> txn id holding the X-lock
        dirtyOnDisk: {},      // page -> true once a dirty value reached disk (steal)
        lastCheckpointLSN: 0,
        phase: "running",    // running | crashed | recovered
        recovery: null,       // populated by recover() for the renderer
        note: "Fresh database. Begin a transaction to start.",
      };
    },

    apply(s, op) { applyOp(s, op); },
    legal(s) { return legalOps(s); },
    invariants(s) { return walInvariants(s); },
    metrics(s) { return walMetrics(s); },
  };
}

export function createWal(config) {
  return createKernel(walSpec(config));
}

/* ── internals ──────────────────────────────────────────────────────────── */

function appendLog(s, rec) {
  rec.lsn = s.nextLsn++;
  s.log.push(rec);
  return rec;
}
function flushLog(s) {                       // force the whole log durable
  if (s.log.length) s.durableLSN = s.log[s.log.length - 1].lsn;
}
function forceLogTo(s, lsn) {                 // WAL rule: log ≥ lsn before data page out
  if (lsn > s.durableLSN) s.durableLSN = lsn;
}
function lastUpdateLsn(s, page) {
  for (let i = s.log.length - 1; i >= 0; i--) {
    const r = s.log[i];
    if ((r.type === "update" || r.type === "clr") && r.page === page) return r.lsn;
  }
  return 0;
}
function releaseLocks(s, txn) {
  Object.keys(s.locks).forEach((p) => { if (s.locks[p] === txn) delete s.locks[p]; });
}
function activeIds(s) {
  return Object.keys(s.txns).filter((t) => s.txns[t].status === "active");
}

function applyOp(s, op) {
  switch (op.type) {
    case "begin":      return opBegin(s, op);
    case "write":      return opWrite(s, op);
    case "commit":     return opCommit(s, op);
    case "abort":      return opAbort(s, op);
    case "flush":      return opFlush(s);
    case "flushPage":  return opFlushPage(s, op);
    case "checkpoint": return opCheckpoint(s);
    case "crash":      return opCrash(s);
    case "recover":    return opRecover(s);
    default: throw new Error("wal: unknown op `" + op.type + "`");
  }
}

function requireRunning(s) {
  if (s.phase !== "running") throw new Error("wal: database is " + s.phase + "; only `recover` is allowed after a crash");
}

function opBegin(s, op) {
  requireRunning(s);
  if (!op.txn) throw new Error("begin: needs txn id");
  if (s.txns[op.txn]) throw new Error("begin: " + op.txn + " already exists");
  appendLog(s, { type: "begin", txn: op.txn });
  s.txns[op.txn] = { id: op.txn, status: "active", updates: [] };
  s.note = op.txn + " began.";
}

function opWrite(s, op) {
  requireRunning(s);
  const t = s.txns[op.txn];
  if (!t || t.status !== "active") throw new Error("write: " + op.txn + " is not an active transaction");
  if (s.disk[op.page] === undefined) throw new Error("write: unknown page " + op.page);
  if (op.value === undefined) throw new Error("write: needs a value");
  if (s.locks[op.page] && s.locks[op.page] !== op.txn)
    throw new Error("write: page " + op.page + " is X-locked by " + s.locks[op.page] + " (strict 2PL)");
  const before = s.buffer[op.page];
  const rec = appendLog(s, { type: "update", txn: op.txn, page: op.page, before: before, after: op.value });
  s.buffer[op.page] = op.value;              // no-force: buffer only, not disk yet
  s.locks[op.page] = op.txn;                  // hold X-lock until end of txn
  t.updates.push(rec.lsn);
  s.note = op.txn + " wrote " + op.page + "=" + op.value + " (LSN " + rec.lsn + ", buffer only).";
}

function opCommit(s, op) {
  requireRunning(s);
  const t = s.txns[op.txn];
  if (!t || t.status !== "active") throw new Error("commit: " + op.txn + " is not active");
  const rec = appendLog(s, { type: "commit", txn: op.txn });
  flushLog(s);                                // WAL: commit forces the log durable
  t.status = "committed";
  releaseLocks(s, op.txn);
  s.note = op.txn + " committed — log forced to durable storage at LSN " + rec.lsn + " (dirty pages may still be in buffer).";
}

function opAbort(s, op) {
  requireRunning(s);
  const t = s.txns[op.txn];
  if (!t || t.status !== "active") throw new Error("abort: " + op.txn + " is not active");
  // physiological undo in reverse order, writing a CLR per undone update
  const ups = t.updates.map((l) => s.log.find((r) => r.lsn === l)).reverse();
  ups.forEach((u) => {
    appendLog(s, { type: "clr", txn: op.txn, page: u.page, after: u.before, undoOf: u.lsn });
    s.buffer[u.page] = u.before;
    if (s.dirtyOnDisk[u.page]) s.disk[u.page] = u.before; // undo also on disk if stolen
  });
  appendLog(s, { type: "abort", txn: op.txn });
  flushLog(s);
  t.status = "aborted";
  releaseLocks(s, op.txn);
  s.note = op.txn + " aborted — " + ups.length + " update(s) rolled back via CLRs.";
}

function opFlush(s) {
  requireRunning(s);
  flushLog(s);
  s.note = "Log forced to durable storage up to LSN " + s.durableLSN + ".";
}

function opFlushPage(s, op) {
  requireRunning(s);
  if (s.disk[op.page] === undefined) throw new Error("flushPage: unknown page " + op.page);
  const lu = lastUpdateLsn(s, op.page);
  if (lu) forceLogTo(s, lu);                  // WAL: log ≥ page's last update before writing it
  s.disk[op.page] = s.buffer[op.page];        // steal: evict dirty page to disk
  if (s.buffer[op.page] !== s.initial[op.page]) s.dirtyOnDisk[op.page] = true;
  s.note = "Buffer pool stole page " + op.page + " → disk (log forced to LSN " + s.durableLSN + " first).";
}

function opCheckpoint(s) {
  requireRunning(s);
  flushLog(s);
  const active = activeIds(s);
  const dirty = s.pageIds.filter((p) => s.buffer[p] !== s.disk[p]);
  const rec = appendLog(s, { type: "checkpoint", active: active.slice(), dirty: dirty.slice() });
  flushLog(s);
  s.lastCheckpointLSN = rec.lsn;
  s.note = "Fuzzy checkpoint at LSN " + rec.lsn + " — active=[" + active.join(",") + "], dirty=[" + dirty.join(",") + "].";
}

function opCrash(s) {
  requireRunning(s);
  s.phase = "crashed";
  s.buffer = Object.assign({}, s.disk);       // volatile memory gone
  s.log = s.log.filter((r) => r.lsn <= s.durableLSN); // non-durable tail lost
  s.locks = {};
  s.note = "💥 CRASH. Buffer pool lost; durable log kept up to LSN " + s.durableLSN + ". Run recovery.";
}

function opRecover(s) {
  if (s.phase !== "crashed") throw new Error("recover: only valid after a crash");

  /* ANALYSIS — rebuild the transaction & dirty-page tables from the checkpoint on. */
  const startLSN = s.lastCheckpointLSN;
  const txnTable = {};
  const dirty = new Set();
  const cp = s.log.find((r) => r.lsn === startLSN && r.type === "checkpoint");
  if (cp) {
    cp.active.forEach((t) => (txnTable[t] = "active"));
    cp.dirty.forEach((p) => dirty.add(p));
  }
  s.log.forEach((r) => {
    if (r.lsn < startLSN) return;
    if (r.type === "begin") txnTable[r.txn] = "active";
    else if (r.type === "commit") txnTable[r.txn] = "committed";
    else if (r.type === "abort") txnTable[r.txn] = "aborted";
    else if (r.type === "update" || r.type === "clr") {
      if (!txnTable[r.txn]) txnTable[r.txn] = "active";
      dirty.add(r.page);
    }
  });
  const winners = Object.keys(txnTable).filter((t) => txnTable[t] === "committed");
  const losers = Object.keys(txnTable).filter((t) => txnTable[t] !== "committed");

  /* REDO — repeat history: replay every durable update & CLR in LSN order. */
  const redo = [];
  s.log.slice().sort((a, b) => a.lsn - b.lsn).forEach((r) => {
    if (r.type === "update" || r.type === "clr") {
      s.disk[r.page] = r.after;
      s.buffer[r.page] = r.after;
      redo.push({ lsn: r.lsn, page: r.page, value: r.after, txn: r.txn, clr: r.type === "clr" });
    }
  });

  /* UNDO — roll back losers, newest update first (global LSN order), writing CLRs. */
  const undo = [];
  const loserUpdates = s.log
    .filter((r) => r.type === "update" && losers.indexOf(r.txn) !== -1)
    .sort((a, b) => b.lsn - a.lsn);
  loserUpdates.forEach((u) => {
    const clr = appendLog(s, { type: "clr", txn: u.txn, page: u.page, after: u.before, undoOf: u.lsn });
    s.disk[u.page] = u.before;
    s.buffer[u.page] = u.before;
    undo.push({ lsn: clr.lsn, undoOf: u.lsn, page: u.page, value: u.before, txn: u.txn });
  });
  flushLog(s);

  // reflect final statuses in the main txn table for display
  Object.keys(txnTable).forEach((t) => {
    s.txns[t] = s.txns[t] || { id: t, updates: [] };
    s.txns[t].status = txnTable[t] === "committed" ? "committed" : "rolled-back";
  });

  s.phase = "recovered";
  s.recovery = {
    startLSN: startLSN, winners: winners, losers: losers,
    dirtyPages: Array.from(dirty), redo: redo, undo: undo,
  };
  s.note = "Recovery complete. Winners " + (winners.length ? winners.join(",") : "—") +
    " redone; losers " + (losers.length ? losers.join(",") : "—") + " undone. Disk now holds exactly the committed state.";
}

/* ── introspection for the renderer / tests ─────────────────────────────── */

function legalOps(s) {
  if (s.phase === "crashed") return [{ type: "recover" }];
  if (s.phase === "recovered") return [];
  const ops = [];
  activeIds(s).forEach((t) => {
    ops.push({ type: "commit", txn: t });
    ops.push({ type: "abort", txn: t });
  });
  ops.push({ type: "checkpoint" }, { type: "flush" }, { type: "crash" });
  return ops;
}

function walInvariants(s) {
  const lastLsn = s.log.length ? s.log[s.log.length - 1].lsn : 0;
  const commitsDurable = Object.keys(s.txns).every((t) => {
    if (s.txns[t].status !== "committed") return true;
    const rec = s.log.find((r) => r.type === "commit" && r.txn === t);
    return rec ? rec.lsn <= s.durableLSN : true;
  });
  const checks = [
    { name: "durable-tail", ok: s.durableLSN <= lastLsn,
      detail: "durableLSN " + s.durableLSN + " ≤ last LSN " + lastLsn },
    { name: "commit-durability", ok: commitsDurable,
      detail: "every committed txn's commit record is durable (WAL)" },
    { name: "phase", ok: ["running", "crashed", "recovered"].indexOf(s.phase) !== -1,
      detail: "phase = " + s.phase },
  ];
  if (s.phase === "recovered") {
    const match = s.pageIds.every((p) => s.disk[p] === s.buffer[p]);
    checks.push({ name: "post-recovery-consistency", ok: match,
      detail: match ? "buffer == disk after recovery" : "buffer/disk diverge after recovery" });
  }
  return checks;
}

function walMetrics(s) {
  const by = (st) => Object.keys(s.txns).filter((t) => s.txns[t].status === st).length;
  return {
    logRecords: s.log.length,
    durableLSN: s.durableLSN,
    activeTxns: activeIds(s).length,
    committedTxns: by("committed"),
    abortedTxns: by("aborted"),
    dirtyPages: s.pageIds.filter((p) => s.buffer[p] !== s.disk[p]).length,
    redone: s.recovery ? s.recovery.redo.length : 0,
    undone: s.recovery ? s.recovery.undo.length : 0,
  };
}

/**
 * Correctness oracle (used by tests): the page state implied by durability +
 * atomicity = apply, in LSN order, the after-image of every `update` whose
 * transaction has a durable commit record. Everything else must vanish.
 */
export function committedState(kernelOrState) {
  const s = kernelOrState.state || kernelOrState;
  const durableLog = s.log.filter((r) => r.lsn <= Math.max(s.durableLSN, 0) || s.phase === "recovered");
  // winners = txns with a commit record present in the (durable) log
  const winners = new Set(
    durableLog.filter((r) => r.type === "commit").map((r) => r.txn)
  );
  const out = Object.assign({}, s.initial);
  durableLog
    .slice().sort((a, b) => a.lsn - b.lsn)
    .forEach((r) => { if (r.type === "update" && winners.has(r.txn)) out[r.page] = r.after; });
  return out;
}
