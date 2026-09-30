/* ============================================================
   deepdives/crash-recovery.js — "Crash Recovery" deep dive.
   Registers DBLab.deepDives['crash-recovery'] (concept m53).
   Authored against the contract documented in deepdives/mvcc.js.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  DL.deepDives = DL.deepDives || {};

  // Base WAL: a checkpoint, then T1 (commits), T2 & T3 (in-flight at crash).
  function log(marks) {
    marks = marks || {};
    var recs = [
      { lsn: 10, body: "◆ CHECKPOINT", type: "checkpoint" },
      { lsn: 11, body: "T1 upd /42" },
      { lsn: 12, body: "T2 upd /77" },
      { lsn: 13, body: "T1 COMMIT" },
      { lsn: 14, body: "T2 upd /88" },
      { lsn: 15, body: "T3 upd /99" }
    ];
    recs.forEach(function (r) { if (marks[r.lsn]) r.mark = marks[r.lsn]; });
    if (marks.crash) recs.push({ lsn: "—", body: "✖ CRASH", type: "crash" });
    return recs;
  }
  function tx(t1, t2, t3) {
    return [
      { id: "T1", cls: t1[0], label: t1[1] },
      { id: "T2", cls: t2[0], label: t2[1] },
      { id: "T3", cls: t3[0], label: t3[1] }
    ];
  }

  var STEPS = [
    {
      label: "1 · Before the crash",
      what: "Normal operation. The WAL holds a checkpoint at <code>LSN 10</code> and a stream of changes. <b>T1</b> updated a row and committed; <b>T2</b> and <b>T3</b> are still in-flight. Meanwhile some changed pages are dirty in memory, not yet written to the data files.",
      why: "This is the setup every database lives in: the durable WAL is ahead of the data files, and at any instant some transactions are committed and some aren't. Recovery's job is to make sense of exactly this picture after a sudden stop.",
      how: "Each change appended a WAL record before touching a page (write-ahead). T1's commit record (LSN 13) was fsync'd, so T1 is durable. T2/T3 have no commit record yet.",
      when: "Continuously — this is steady-state operation between checkpoints.",
      mistake: "Assuming the data files are up to date. They lag the WAL by design; the WAL, not the data files, is the source of truth.",
      interview: "“At any moment before a crash, what's the relationship between the WAL and the data files?” The WAL is ahead; committed changes may exist only in the log until a checkpoint flushes their pages.",
      example: "At peak traffic, ShopKart's node has confirmed order #9001 (T1), while two more checkouts (T2, T3) are mid-flight and a dozen pages sit dirty in the buffer pool.",
      viz: { phase: "normal", timeline: log({}), txns: tx(["winner", "committed (LSN 13)"], ["active", "in-flight"], ["active", "in-flight"]),
        note: "WAL ahead of the data files. T1 committed; T2 & T3 not yet. Some pages dirty in memory." }
    },
    {
      label: "2 · The crash",
      what: "Power is lost. The entire buffer pool <b>vanishes</b> — every dirty page in memory is gone, and T2 and T3 are abandoned mid-flight. All that survives is the durable <b>WAL</b> and the (stale) <b>data files</b> on disk.",
      why: "This is why recovery exists. Memory is volatile; only what reached stable storage remains. The database must reconstruct a correct, consistent state using solely the WAL and the data files it can still read.",
      how: "On restart the engine sees it did not shut down cleanly (no clean-shutdown marker) and enters recovery. The data files reflect an arbitrary mix of flushed and unflushed changes; the WAL is complete up to the last fsync.",
      when: "Any unclean stop: power loss, OS panic, OOM kill, hardware fault, <code>kill -9</code>.",
      mistake: "Thinking a crash loses committed data. It doesn't — T1 committed, so recovery will restore it. Only the <i>uncommitted</i> transactions are forfeit.",
      interview: "“What survives a crash?” Only what's on stable storage: the durable WAL and the data files. The buffer pool — dirty pages and in-flight transaction state — is gone.",
      example: "ShopKart's node reboots after a power event with confirmed orders safe in the WAL but two half-finished checkouts (T2, T3) gone from memory.",
      viz: { phase: "crash", timeline: log({ crash: true }), txns: tx(["winner", "committed — durable in WAL"], ["loser", "in-flight — lost from memory"], ["loser", "in-flight — lost from memory"]),
        note: "Buffer pool gone. Only the WAL + data files remain. Recovery must rebuild a correct state from them." }
    },
    {
      label: "3 · Analysis — who won, who lost",
      what: "The <b>Analysis</b> pass scans the WAL forward from the last checkpoint (<code>LSN 10</code>), rebuilding the <b>transaction table</b> and <b>dirty-page table</b>. It classifies every transaction: <b>T1 is a winner</b> (has a commit record); <b>T2 and T3 are losers</b> (in-flight at crash).",
      why: "Recovery needs two things before it can act: where to <i>start</i> replaying (the redo point) and <i>who</i> must be rolled back (the losers). Analysis reconstructs both from the log — the in-memory tables that were lost in the crash.",
      how: "Starting at the checkpoint's saved state, Analysis reads each record: updates add/track transactions; a COMMIT marks a winner; the earliest dirty page sets where redo begins (the RedoLSN).",
      when: "The first of recovery's three passes, always run from the last checkpoint.",
      mistake: "Skipping straight to undo. Without Analysis you don't know the redo start point or the loser set — the other passes have nothing to work from.",
      interview: "“What does the Analysis pass produce?” The redo start point (RedoLSN) and the set of loser transactions to undo, by reconstructing the transaction and dirty-page tables from the last checkpoint.",
      example: "ShopKart's recovery reads from LSN 10 and concludes: order #9001 (T1) committed and must be kept; the two mid-flight checkouts (T2, T3) must be rolled back.",
      viz: { phase: "analysis", timeline: log({ 10: "scan", 11: "scan", 12: "scan", 13: "scan", 14: "scan", 15: "scan" }),
        txns: tx(["winner", "WINNER (committed)"], ["loser", "LOSER (in-flight)"], ["loser", "LOSER (in-flight)"]),
        note: "Scan from the last checkpoint → rebuild txn/dirty-page tables → winners {T1}, losers {T2, T3}." }
    },
    {
      label: "4 · Redo — repeat history",
      what: "The <b>Redo</b> pass replays <b>every</b> logged change from the redo point forward — <code>LSN 11</code> through <code>15</code> — reapplying each to its page. Crucially, it replays winners <i>and</i> losers, bringing the database to its <b>exact state at the moment of the crash</b>.",
      why: "Reconstructing the precise pre-crash state first (\"repeat history\") makes the whole algorithm simple and robust: undo then has a well-defined state to roll back from, and compensation records fit cleanly into the same log.",
      how: "For each change record, recovery compares the record's LSN to the target page's stored <b>page LSN</b>. If the page already reflects the change (page LSN ≥ record LSN, because it had been flushed), it's skipped — making redo <b>idempotent</b>. Otherwise the after-image is applied.",
      when: "The second pass, after Analysis, from the RedoLSN to the end of the log.",
      mistake: "Expecting redo to skip uncommitted transactions. It doesn't — it replays them too. Undo (next) is what removes them.",
      interview: "“Why does redo replay uncommitted changes?” To repeat history to the exact crash state; page-LSN checks keep it idempotent, and undo afterward removes the losers.",
      example: "ShopKart's recovery reapplies all five changes, so the data pages match precisely what was in memory the instant the power failed — including T2/T3's not-yet-undone writes.",
      viz: { phase: "redo", timeline: log({ 11: "redo", 12: "redo", 13: "redo", 14: "redo", 15: "redo" }),
        txns: tx(["winner", "changes reapplied"], ["loser", "changes reapplied (undo next)"], ["loser", "changes reapplied (undo next)"]),
        note: "Replay LSN 11→15 for ALL transactions. Page-LSN checks skip already-flushed pages → idempotent." }
    },
    {
      label: "5 · Undo — roll back the losers",
      what: "The <b>Undo</b> pass rolls back the losers — <b>T2 and T3</b> — reversing their changes using the <b>before-images</b> in the log, newest change first. As it undoes each, it writes a <b>compensation log record (CLR)</b>.",
      why: "Losers never committed, so atomicity demands their partial work disappear. Logging the undo itself (via CLRs) means that if the server crashes <i>again</i> mid-undo, recovery can pick up where it left off without redoing work — undo is crash-safe.",
      how: "Walking backward through the losers' records, each change is reverted to its before-image and a CLR records the reversal. CLRs point to the next record still needing undo, so a re-crash resumes correctly.",
      when: "The final pass, after redo has restored the full crash state.",
      mistake: "Undoing without logging (no CLRs). Then a crash during recovery could double-undo or lose track — CLRs are what make recovery restartable.",
      interview: "“What's a CLR and why does it matter?” A compensation log record logs an undo action so recovery is idempotent and restartable — a crash during undo resumes instead of corrupting.",
      example: "ShopKart's two abandoned checkouts (T2, T3) are rolled back — reserved stock released, no phantom orders — and each reversal is itself logged.",
      viz: { phase: "undo", timeline: log({ 12: "undo", 14: "undo", 15: "undo" }),
        txns: tx(["winner", "untouched (committed)"], ["loser", "rolling back via before-images"], ["loser", "rolling back via before-images"]),
        note: "Undo losers newest-first, writing CLRs so a re-crash during undo resumes safely." }
    },
    {
      label: "6 · Consistent — open for business",
      what: "Recovery completes. The database contains <b>exactly the committed transactions</b>: T1's work is intact, T2 and T3 have vanished as if they never ran. The node opens for connections.",
      why: "This is the ACID promise kept across a crash: <b>Durability</b> (T1 survived) and <b>Atomicity</b> (T2/T3 left no trace) delivered together by redo + undo over the WAL.",
      how: "With winners redone and losers undone, the data files are now consistent with the committed history. A fresh checkpoint records the clean state and normal operation resumes.",
      when: "At the end of the Undo pass — the database transitions from recovery to serving.",
      mistake: "Believing recovery restores 'everything in progress'. It restores only what committed; in-flight work is intentionally discarded to preserve atomicity.",
      interview: "“After recovery, what's in the database?” Precisely the set of committed transactions — no more (losers erased), no less (winners restored).",
      example: "ShopKart comes back online: order #9001 confirmed and shippable; the two interrupted carts simply need to be re-attempted by their shoppers.",
      viz: { phase: "done", timeline: log({}), txns: tx(["winner", "✔ kept (committed)"], ["loser", "✖ undone (never happened)"], ["loser", "✖ undone (never happened)"]),
        note: "Only committed work remains. Durability + Atomicity upheld across the crash. DB open." }
    },
    {
      label: "7 · Checkpoints, idempotency & recovery time",
      what: "Two properties make this practical. <b>Checkpoints</b> advance the redo start point, so recovery only replays WAL <i>since the last checkpoint</i> — not all history. And recovery is <b>idempotent</b>: page LSNs and CLRs mean a crash <i>during</i> recovery just restarts it, safely.",
      why: "Recovery time (your restart RTO) is essentially 'how much WAL since the last checkpoint'. Checkpoint frequency is therefore a direct dial between steady-state write I/O and how fast the database comes back after a crash.",
      how: "More frequent checkpoints flush dirty pages sooner, shrinking the redo window (faster recovery) but adding steady-state I/O. Fewer checkpoints do the opposite. Page-LSN comparisons and logged undo (CLRs) guarantee replaying twice is harmless.",
      when: "Tuned continuously via knobs like <code>checkpoint_timeout</code> and <code>max_wal_size</code>; validated by actually testing recovery.",
      mistake: "Stretching checkpoints far apart to cut I/O, then discovering a multi-minute restart during an outage. Or 'helping' recovery by deleting WAL/data files — that destroys the only source of truth.",
      interview: "“What bounds crash-recovery time and how do you tune it?” The volume of WAL since the last checkpoint. Checkpoint more often for faster recovery at the cost of steady-state I/O; balance against your RTO.",
      example: "ShopKart tunes checkpoints so a node restarts within its RTO at peak WAL rate — fast enough that a crash during a sale is a blip, not an outage.",
      viz: { phase: "done", timeline: log({ 10: "scan" }), txns: tx(["winner", "✔ kept"], ["loser", "✖ undone"], ["loser", "✖ undone"]),
        note: "Checkpoint (LSN 10) = the redo start. Move it forward → less to replay → faster restart. Recovery is idempotent & restartable." }
    }
  ];

  function buildViz(host) {
    host.classList.add("dd-viz");
    function phaseBar(phase) {
      var order = { normal: 0, crash: 0, analysis: 1, redo: 2, undo: 3, done: 4 }[phase] || 0;
      var defs = [{ k: "analysis", n: "① Analysis" }, { k: "redo", n: "② Redo" }, { k: "undo", n: "③ Undo" }];
      var pos = { analysis: 1, redo: 2, undo: 3 };
      return '<div class="dd-phasebar">' + defs.map(function (d) {
        var cls = "dd-phase";
        if (order > pos[d.k]) cls += " done";
        else if (order === pos[d.k]) cls += " on";
        return '<div class="' + cls + '">' + d.n + "</div>";
      }).join("") + "</div>";
    }
    function tlRec(r) {
      var cls = "dd-tl-rec" + (r.type ? " is-" + r.type : "") + (r.mark ? " " + r.mark : "");
      return '<div class="' + cls + '"><div class="dd-tl-lsn">' + (r.lsn === "—" ? "&nbsp;" : "LSN " + r.lsn) + "</div>" +
        '<div class="dd-tl-body">' + r.body + "</div></div>";
    }
    function txnRow(t) {
      var cls = "dd-txnrow" + (t.cls === "winner" ? " is-winner" : (t.cls === "loser" ? " is-loser" : ""));
      return '<div class="' + cls + '"><span class="dd-txnrow-id">' + t.id + "</span>" +
        '<span class="dd-txnrow-fate">' + t.label + "</span></div>";
    }
    function update(idx, step) {
      var s = step && step.viz;
      if (idx < 0 || !s) {
        host.innerHTML = '<div class="dd-empty">Press <b>Play</b> to crash a ShopKart database mid-traffic and watch ARIES recovery — ' +
          "Analysis → Redo → Undo — restore exactly the committed transactions.</div>";
        return;
      }
      var html = '<div class="dd-section"><div class="dd-section-label">Recovery phase</div>' + phaseBar(s.phase) + "</div>";
      html += '<div class="dd-section"><div class="dd-section-label">Write-ahead log (from last checkpoint)</div>' +
        '<div class="dd-timeline">' + s.timeline.map(tlRec).join("") + "</div></div>";
      html += '<div class="dd-section"><div class="dd-section-label">Transactions at crash</div>' +
        '<div class="dd-txntable">' + s.txns.map(txnRow).join("") + "</div></div>";
      if (s.note) html += '<div class="dd-note">' + s.note + "</div>";
      host.innerHTML = html;
    }
    return { update: update, destroy: function () { host.innerHTML = ""; host.classList.remove("dd-viz"); } };
  }

  DL.deepDives["crash-recovery"] = {
    slug: "crash-recovery",
    overview: {
      what: "<b>Crash recovery</b> is how a database returns to a correct, consistent state after an unclean stop, using only the durable WAL and the data files. The standard algorithm is <b>ARIES</b>: three passes — <b>Analysis</b>, <b>Redo</b>, <b>Undo</b>.",
      why: "A crash wipes the buffer pool: dirty pages and in-flight transactions are gone, and the data files hold an arbitrary mix of flushed and unflushed changes. Recovery is what makes 'committed means durable' and 'aborted leaves no trace' true across power loss — the payoff of writing a WAL at all.",
      how: "Analysis rebuilds the transaction and dirty-page tables from the last checkpoint and identifies winners (committed) vs losers (in-flight). Redo 'repeats history', replaying all changes to the exact crash state. Undo rolls back the losers via before-images, logging compensation records so recovery itself is crash-safe."
    },
    steps: STEPS,
    buildViz: buildViz,
    code: {
      title: "The WAL after a crash, and the three recovery passes",
      lang: "sql",
      code:
        "-- WAL on disk (data files are behind; the buffer pool is gone)\n" +
        "LSN 10  CHECKPOINT                 <- redo starts here\n" +
        "LSN 11  T1  update products/42\n" +
        "LSN 12  T2  update products/77\n" +
        "LSN 13  T1  COMMIT                 <- T1 is a WINNER (durable)\n" +
        "LSN 14  T2  update products/88\n" +
        "LSN 15  T3  update products/99\n" +
        "=====   CRASH   =====              (T2, T3 never committed -> LOSERS)\n" +
        "\n" +
        "-- Analysis : from LSN 10, rebuild tables -> winners {T1}, losers {T2, T3}\n" +
        "-- Redo     : replay LSN 11..15 for ALL (skip pages whose page-LSN >= record) \n" +
        "-- Undo     : roll back T2 & T3 via before-images, writing CLRs",
      highlights: [5, 8, 12]
    },
    reference: [
      ["ARIES", "The standard recovery algorithm: Analysis → Redo → Undo"],
      ["Analysis", "Rebuild transaction & dirty-page tables from the last checkpoint"],
      ["Redo", "Repeat history: replay all changes forward to the crash state"],
      ["Undo", "Roll back loser (uncommitted) transactions via before-images"],
      ["winner / loser", "A transaction that committed / was in-flight at crash time"],
      ["RedoLSN", "Log position where the redo pass begins (from the last checkpoint)"],
      ["page LSN", "The LSN stamped on a page; enables idempotent redo"],
      ["CLR", "Compensation Log Record — logs an undo so recovery is restartable"],
      ["checkpoint", "Flushes dirty pages and advances the RedoLSN, bounding recovery"],
      ["RTO", "Recovery Time Objective — how fast the system must come back"]
    ],
    internals:
      "<p>ARIES rests on three ideas. <b>Write-ahead logging</b> guarantees the log needed to recover a change is durable before the change's page can be written. <b>Repeating history during redo</b> — replaying <i>every</i> change since the RedoLSN, committed or not — reconstructs the exact pre-crash state, which makes undo straightforward and makes the whole process composable with re-crashes. <b>Logging undo with CLRs</b> makes recovery idempotent and restartable: a crash during recovery simply resumes.</p>" +
      "<p>The passes: <b>Analysis</b> starts at the last (possibly fuzzy) checkpoint and scans forward, reconstructing the transaction table (loser set) and dirty-page table (RedoLSN). <b>Redo</b> replays from the RedoLSN, using each page's stored LSN to skip changes already reflected on disk — so applying twice is harmless. <b>Undo</b> walks the losers backward, reverting to before-images and writing CLRs that chain to the next record needing undo.</p>" +
      "<p>Because the WAL is a complete linear history, the very same machinery powers <b>physical replication</b> (ship and replay the log on a standby) and <b>point-in-time recovery</b> (restore a base backup, replay archived WAL to any moment).</p>",
    engineering:
      "<p>Recovery time is a first-class operational number: it's roughly the volume of WAL generated since the last checkpoint, replayed at restart. That makes <b>checkpoint frequency</b> a direct lever on your <b>RTO</b> — checkpoint more often for a faster restart (at the cost of more steady-state page-flush I/O), less often for cheaper steady state (at the cost of a slower, scarier recovery). Tune it against your peak WAL rate and your downtime budget, and actually <b>test recovery</b> rather than assuming it.</p>" +
      "<p>Respect the invariants: recovery is idempotent, so never 'help' by deleting WAL segments or data files — you'd destroy the only source of truth. Understand your durability boundary: async replicas can lose the last un-shipped WAL on failover (RPO &gt; 0); full-page writes exist to survive torn pages on crash. The WAL you rely on for recovery is the same asset you back up and stream for replication.</p>",
    gotchas: [
      { kind: "tip", html: "<b>Redo repeats <i>all</i> history — then undo cleans up.</b> Recovery replays uncommitted transactions too, to rebuild the exact crash state, and only afterward rolls back the losers. \"Repeat history, then undo\" is the ARIES mantra." },
      { kind: "warn", html: "<b>Recovery time is bounded by WAL since the last checkpoint.</b> Stretching checkpoints far apart cuts steady-state I/O but can turn a restart into minutes of replay during an outage. Tune checkpoint frequency against your RTO." },
      { kind: "info", html: "<b>Recovery is idempotent and restartable</b> thanks to page LSNs and CLRs — a crash <i>during</i> recovery just resumes. Never delete WAL or data files to 'speed it up'; that's the one thing that actually causes data loss." }
    ],
    failureModes:
      "<p><b>RTO blowout:</b> sparse checkpoints + a high WAL rate mean a huge log to replay, so a crash at peak causes a long restart. <i>Fix:</i> checkpoint frequently enough for your downtime budget; test recovery at realistic WAL volumes.</p>" +
      "<p><b>Missing or corrupt WAL:</b> if the log needed for recovery is lost (bad storage, deleted segments, lying fsync), the database can't recover cleanly. <i>Fix:</i> honest durable storage, WAL archiving, and tested backups.</p>" +
      "<p><b>Data loss on failover (RPO &gt; 0):</b> asynchronous replicas may not have received the last committed WAL when the primary dies. <i>Fix:</i> synchronous replication where zero loss is required, accepting the latency cost.</p>" +
      "<p><b>Torn pages:</b> a crash mid-page-write can leave a partially written page redo can't fix from a delta alone. <i>Fix:</i> full-page writes (log the whole page on first change after a checkpoint) — enabled by default in Postgres.</p>",
    quickCheck: [
      {
        q: "During the Redo pass, does recovery replay changes from transactions that never committed?",
        options: [
          "No — redo skips uncommitted transactions",
          "Yes — it repeats all history, then the Undo pass rolls the uncommitted ones back",
          "Only if they were more than half done",
          "Only their committed sub-statements"
        ],
        answer: 1,
        why: "ARIES 'repeats history': redo replays every logged change since the RedoLSN — committed or not — to rebuild the exact crash state. Undo then rolls back the losers. Page-LSN checks keep redo idempotent.",
        diff: "medium"
      },
      {
        q: "What primarily bounds how long crash recovery takes?",
        options: [
          "The total size of the database",
          "The number of tables",
          "The volume of WAL generated since the last checkpoint",
          "The isolation level in use"
        ],
        answer: 2,
        why: "Redo replays from the last checkpoint's RedoLSN to the end of the log, so recovery time tracks the WAL accumulated since the last checkpoint — which is why checkpoint frequency is the main tuning lever for restart time.",
        diff: "medium"
      },
      {
        q: "The server crashes AGAIN, in the middle of recovery. What happens?",
        options: [
          "The database is corrupted and needs a restore",
          "Recovery simply restarts and completes safely — it's idempotent (page LSNs + CLRs)",
          "Only the redo done so far is kept; undo is skipped",
          "Manual intervention is required to delete partial WAL"
        ],
        answer: 1,
        why: "Page-LSN checks make redo idempotent and CLRs make undo restartable, so recovery can be re-run from the start with no corruption or double-application. Deleting WAL/data files to 'help' is the actual danger.",
        diff: "hard"
      }
    ],
    interviewQs: [
      {
        q: "Walk me through how a database recovers from a crash using ARIES.",
        a: "On an unclean restart the engine runs three passes over the WAL. Analysis starts at the last checkpoint and scans forward to rebuild the transaction table and dirty-page table — identifying the redo start point (RedoLSN) and the set of loser transactions (in-flight at crash). Redo 'repeats history': it replays every logged change from the RedoLSN forward, committed and uncommitted alike, using each page's stored LSN to skip changes already on disk, so the database reaches its exact state at crash time. Undo then rolls back the losers in reverse order using before-images, writing compensation log records (CLRs) so the undo work is itself logged. When it finishes, the database contains exactly the committed transactions — durability for winners, atomicity for losers.",
        tip: "State the three passes and what each produces, then land the mantra: 'repeat history, then undo.'"
      },
      {
        q: "Why does redo replay uncommitted transactions instead of just skipping them?",
        a: "To reconstruct the precise pre-crash state before doing anything else. Repeating all history — including uncommitted changes — means undo starts from a fully known state and can be expressed as ordinary logged operations (CLRs), which is what makes recovery idempotent and restartable. It also handles the case where a loser's change had already been flushed to disk before the crash: redo brings the page to the crash state, and undo cleanly reverses it. Trying to selectively skip uncommitted changes during redo would complicate the page-LSN idempotency logic and the handling of partially flushed losers.",
        tip: "The key insight: 'repeat history' trades a little extra redo work for a dramatically simpler, provably-correct, restartable algorithm."
      },
      {
        q: "How do checkpoints affect recovery and steady-state performance, and how would you tune them?",
        a: "A checkpoint flushes dirty pages and advances the RedoLSN, so recovery only has to replay WAL generated since the last one. More frequent checkpoints shrink the redo window — faster restart (lower RTO) — but add steady-state I/O because pages are flushed more eagerly. Less frequent checkpoints reduce that I/O but lengthen recovery. You tune the balance (in Postgres, checkpoint_timeout and max_wal_size, smoothed by checkpoint_completion_target) against two constraints: your downtime budget (RTO) at your peak WAL rate, and the write-I/O headroom of your storage. And you validate it by actually measuring recovery time, not assuming it.",
        tip: "Frame it explicitly as an RTO ↔ steady-state-I/O tradeoff — that's the mental model interviewers want to hear."
      }
    ],
    businessLens: {
      task: "A ShopKart database node crashes at peak traffic",
      meaning: "Confirmed orders must survive; half-finished checkouts must vanish; the store must come back fast.",
      system: "OLTP node recovery (Postgres WAL + ARIES)",
      point: "When a ShopKart node loses power mid-sale, recovery replays the WAL: every confirmed order (winner) is restored, every in-flight checkout (loser) is rolled back so no customer is charged for an order that never completed. How fast the store reopens is set by checkpoint tuning — the WAL since the last checkpoint is what recovery must replay. That single knob turns a peak-hour crash from a multi-minute outage into a blip, which is why crash recovery is as much an operational SLO decision as a correctness mechanism."
    }
  };
})();
