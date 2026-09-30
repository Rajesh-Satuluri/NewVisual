/* ============================================================
   deepdives/wal.js — "Write-Ahead Log (WAL)" deep dive.
   Registers DBLab.deepDives['wal'] (concept m47).
   Authored against the contract documented in deepdives/mvcc.js.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  DL.deepDives = DL.deepDives || {};

  // Scene: a single change to SKU #42 stock (100 → 99). We follow the WAL
  // record, the dirty buffer page, and the data file — and see why "committed"
  // means durable even before the page is written to disk.
  var STEPS = [
    {
      label: "1 · A page in memory, matching disk",
      what: "SKU #42's row lives on a <b>data page</b>. To read or change it, the database loads that page into the <b>buffer pool</b> (memory). Right now the buffer copy and the on-disk copy both say <code>stock = 100</code>.",
      why: "Changing a page in memory is fast; writing it back to disk is slow and random. If we changed the page and crashed mid-write, the on-disk page could be torn or lost. WAL exists to make that safe without paying random-write latency on every change.",
      how: "The page sits in a buffer frame. A change will modify the memory copy first (making it 'dirty'), and the write-back to the data file is deferred — which is exactly what creates the durability problem WAL solves.",
      when: "Every read and write goes through the buffer pool; pages are flushed to the data files lazily, not on every change.",
      mistake: "Picturing an <code>UPDATE</code> as writing straight to the data file. It doesn't — it changes a memory page and logs the change; the data file is updated later.",
      interview: "“Where does a row change first land?” In the buffer pool (memory) as a dirty page, plus a WAL record — not directly in the data file.",
      example: "ShopKart's product page for SKU #42 is cached in the buffer pool, in sync with disk, ready for the next sale.",
      viz: { log: [], mem: { val: 100, dirty: false }, disk: { val: 100 }, note: "Buffer copy matches disk. To change it safely, the rule is simple: log first." }
    },
    {
      label: "2 · Write-ahead: log the change first",
      what: "A checkout decrements stock. Before (or as) the buffer page changes to <code>99</code>, the database appends a <b>WAL record</b> at <code>LSN 11</code> describing the change: page, before-image <code>100</code>, after-image <code>99</code>.",
      why: "This is the write-ahead rule and the whole idea: the <i>intent</i> is recorded in a sequential log before the change can ever reach the data file. If we crash, the log tells recovery exactly what to redo or undo.",
      how: "The record goes into the WAL buffer (still in memory at this point). The page is now <b>dirty</b>: buffer says 99, disk still says 100. The <b>WAL invariant</b> guarantees this record will hit stable storage before the dirty page is ever flushed.",
      when: "Every data modification generates one or more WAL records before the change is considered done.",
      mistake: "Assuming the log record and the data write are the same I/O. They're separate: a small sequential log append now, a larger random page write much later.",
      interview: "“What is the write-ahead rule?” A data page may not be written to disk before the log records describing its changes are durable. Log first, data later.",
      example: "Order #9001's stock decrement is captured as WAL record LSN 11 (100→99) the instant the sale is processed.",
      viz: { log: [{ lsn: 11, type: "update", detail: "sku42 100→99" }], mem: { val: 99, dirty: true }, disk: { val: 100 },
        hot: 11, note: "Page dirty (mem 99, disk 100). The log holds the before/after images." }
    },
    {
      label: "3 · COMMIT = make the log durable",
      what: "The transaction commits. The database appends a <b>commit record</b> at <code>LSN 12</code> and calls <code>fsync</code> to force the WAL up to LSN 12 onto stable storage. Only then does <code>COMMIT</code> return success.",
      why: "This is the moment durability is won — and the surprising part: the <b>data page is still dirty</b> (disk says 100). The change is permanent because the <i>log</i> is durable, not because the data file was updated.",
      how: "One sequential <code>fsync</code> of the WAL is all COMMIT waits on. The dirty page will be flushed later. Commit latency ≈ WAL fsync latency — which is why the WAL disk's speed sets your commit throughput.",
      when: "At every COMMIT (often batched across many transactions into one fsync — 'group commit').",
      mistake: "Believing COMMIT must flush the changed data pages. It doesn't — flushing pages on every commit would turn fast sequential logging back into slow random writes.",
      interview: "“What does COMMIT actually wait for?” The WAL fsync of the commit record — not the data-page write. That's why WAL makes commits both fast and durable.",
      example: "ShopKart's checkout confirms 'Order placed' only after order #9001's commit record is fsync'd — even though the product page hasn't been written back yet.",
      viz: { log: [{ lsn: 11, type: "update", detail: "sku42 100→99" }, { lsn: 12, type: "commit", detail: "xid 7 COMMIT", fsynced: true }],
        mem: { val: 99, dirty: true }, disk: { val: 100 }, hot: 12,
        note: "Committed & durable via the WAL — yet the data page on disk still says 100. That gap is safe." }
    },
    {
      label: "4 · The data file lags — and that's fine",
      what: "Right now three things disagree on paper: the buffer says <code>99</code>, the data file says <code>100</code>, and the WAL says 'committed 100→99'. Every reader correctly sees <code>99</code> (from the buffer), and the truth of record is the <b>WAL</b>.",
      why: "Decoupling 'durable' from 'written to the data file' is the performance win of WAL. Random data-page writes are deferred and batched; the only thing on the commit critical path is a sequential log append.",
      how: "Reads are served from the buffer page (99). If the buffer is evicted, the WAL invariant ensures the log is already durable, so the page can be safely written or rebuilt. The data file is allowed to be stale as long as the WAL can reconstruct the current state.",
      when: "Continuously in any write-heavy system — dirty pages accumulate in the buffer pool between checkpoints.",
      mistake: "Panicking that the data file is 'behind'. Lagging data files are normal and expected; the WAL closes the gap on recovery.",
      interview: "“If the data file says 100 but the row is really 99, is the database corrupt?” No — the WAL holds the committed change; recovery (or a checkpoint) reconciles the data file.",
      example: "A ShopKart replica or reader reads 99 from the buffer while the data file on that node still physically holds 100 — no one notices, because the buffer + WAL are authoritative.",
      viz: { log: [{ lsn: 11, type: "update", detail: "sku42 100→99" }, { lsn: 12, type: "commit", detail: "xid 7 COMMIT", fsynced: true }],
        mem: { val: 99, dirty: true }, disk: { val: 100 }, note: "Buffer 99 · disk 100 · WAL authoritative. The write-back is just deferred work." }
    },
    {
      label: "5 · Checkpoint flushes the dirty page",
      what: "A <b>checkpoint</b> runs. It flushes dirty buffer pages to the data files and writes a checkpoint record (<code>LSN 13</code>). The data file now says <code>99</code> — finally in sync with the buffer and the log.",
      why: "Checkpoints bound recovery time: after one, the database knows everything before it is safely in the data files, so a crash only needs to replay WAL <i>after</i> the last checkpoint — not the entire log since the beginning of time.",
      how: "The checkpointer writes dirty pages, then records a checkpoint in the WAL marking a safe replay start (the 'redo point'). WAL segments entirely before the checkpoint can now be recycled or archived.",
      when: "Periodically by time or WAL volume (e.g. Postgres <code>checkpoint_timeout</code>, <code>max_wal_size</code>).",
      mistake: "Setting checkpoints too far apart to reduce I/O — that shrinks steady-state writes but makes crash recovery replay a huge log and take much longer.",
      interview: "“What's the point of a checkpoint?” It flushes dirty pages and marks a safe redo start, bounding how much WAL recovery must replay after a crash.",
      example: "ShopKart's node checkpoints every few minutes; after one, SKU #42's data page physically holds 99 and older WAL can be archived off the hot disk.",
      viz: { log: [{ lsn: 11, type: "update", detail: "sku42 100→99" }, { lsn: 12, type: "commit", detail: "xid 7 COMMIT", fsynced: true }, { lsn: 13, type: "checkpoint", detail: "flush dirty pages" }],
        mem: { val: 99, dirty: false }, disk: { val: 99 }, hot: 13, note: "Dirty page flushed → data file = 99. Recovery now only replays WAL after LSN 13." }
    },
    {
      label: "6 · Crash before flush → REDO",
      what: "Rewind to just after the commit (LSN 12) but <b>before</b> the checkpoint — then the server crashes. On restart, the data file still says <code>100</code>, but the WAL has committed record LSN 11. Recovery <b>redoes</b> it, restoring <code>99</code>.",
      why: "This is durability delivered. The change survived a crash even though its data page was never written, because the committed WAL record was durable. Redo re-applies committed work the data files hadn't caught up on.",
      how: "Recovery starts at the last checkpoint's redo point and scans forward, re-applying every change whose transaction committed. LSN 11 belongs to committed XID 7, so its after-image (99) is written to the page.",
      when: "On every restart after a crash — the redo pass replays committed-but-unflushed changes.",
      mistake: "Thinking a crash between commit and checkpoint loses the transaction. It doesn't — that's precisely the case WAL redo exists for.",
      interview: "“A committed transaction's data page was never flushed before a crash — is it lost?” No. Recovery redoes it from the durable WAL commit record.",
      example: "ShopKart's node loses power right after confirming order #9001; on reboot, redo replays LSN 11 and the stock is correctly 99 — the customer's order stands.",
      viz: { log: [{ lsn: 11, type: "update", detail: "sku42 100→99" }, { lsn: 12, type: "commit", detail: "xid 7 COMMIT", fsynced: true }],
        mem: { val: 99, dirty: false }, disk: { val: 99 }, recovering: "REDO", note: "Disk was 100 after crash; REDO replays committed LSN 11 → 99. Durability upheld." }
    },
    {
      label: "7 · Uncommitted at crash → UNDO (atomicity)",
      what: "The mirror case: a transaction changed a page but <b>hadn't committed</b> when the crash hit (no commit record in the WAL). Recovery <b>undoes</b> it using the before-image, so its partial work vanishes.",
      why: "This is atomicity delivered by the same log. Redo saves committed work; undo erases uncommitted work. Together they guarantee the database comes back containing exactly the committed transactions — no more, no less.",
      how: "ARIES-style recovery runs three passes: <b>Analysis</b> (find where to start and who was in-flight), <b>Redo</b> (replay everything to the crash state), then <b>Undo</b> (roll back transactions with no commit record, using before-images).",
      when: "Every crash recovery; the undo pass handles all transactions that were live at crash time.",
      mistake: "Assuming redo alone is enough. Without undo, a crash could leave a half-applied uncommitted transaction on disk — violating atomicity.",
      interview: "“What's the order of recovery passes and what does each do?” Analysis → Redo (repeat history, committed and not) → Undo (roll back the losers). Redo for durability, undo for atomicity.",
      example: "A ShopKart bulk price update that was mid-flight at crash time is fully rolled back on restart — no half-updated catalog — because it had no commit record.",
      viz: { log: [{ lsn: 21, type: "update", detail: "price 499→449" }], mem: { val: 499, dirty: false }, disk: { val: 499 }, recovering: "UNDO",
        note: "No commit record for LSN 21 → UNDO restores the before-image (499). Atomicity upheld.", storeLabel: "SKU #42 price" }
    }
  ];

  function buildViz(host) {
    host.classList.add("dd-viz");
    function recCard(r, hot) {
      var cls = "dd-logrec is-" + r.type + (r.fsynced ? " is-fsynced" : "") + (hot ? " hot" : "");
      return '<div class="' + cls + '"><div class="dd-logrec-lsn">LSN ' + r.lsn + (r.fsynced ? " · fsync" : "") + "</div>" +
        '<div class="dd-logrec-type">' + r.type.toUpperCase() + "</div>" +
        '<div class="dd-logrec-detail">' + r.detail + "</div></div>";
    }
    function update(idx, step) {
      var s = step && step.viz;
      if (idx < 0 || !s) {
        host.innerHTML = '<div class="dd-empty">Press <b>Play</b> to follow one stock change through the write-ahead log — ' +
          "and see why a committed transaction survives a crash even before its data page is written to disk.</div>";
        return;
      }
      var label = s.storeLabel || "SKU #42 stock";
      var logHtml = s.log.length
        ? '<div class="dd-wal-log">' + s.log.map(function (r) { return recCard(r, s.hot === r.lsn); }).join("") + "</div>"
        : '<div class="dd-note">The write-ahead log is empty — no changes yet.</div>';
      var memCls = "dd-store" + (s.mem.dirty ? " is-dirty" : "");
      var diskDurable = !s.mem.dirty && s.disk.val === s.mem.val;
      var diskCls = "dd-store" + (diskDurable ? " is-durable" : "");
      var recChip = s.recovering
        ? '<span class="dd-chip ' + (s.recovering === "UNDO" ? "dd-chip--warn" : "dd-chip--info") + '">recovery · ' + s.recovering + "</span> "
        : "";
      var html = '<div class="dd-section"><div class="dd-section-label">Write-ahead log (append-only) ' + recChip + "</div>" + logHtml + "</div>";
      html += '<div class="dd-section"><div class="dd-section-label">' + label + "</div><div class=\"dd-storage\">" +
        '<div class="' + memCls + '"><div class="dd-store-label">Buffer pool (memory)</div>' +
          '<div class="dd-store-val">' + s.mem.val + " <small>units</small></div>" +
          '<div class="dd-store-flag">' + (s.mem.dirty ? '<span class="dd-chip dd-chip--warn">dirty</span>' : '<span class="dd-chip dd-chip--ok">clean</span>') + "</div></div>" +
        '<div class="' + diskCls + '"><div class="dd-store-label">Data file (disk)</div>' +
          '<div class="dd-store-val">' + s.disk.val + " <small>units</small></div>" +
          '<div class="dd-store-flag">' + (diskDurable ? '<span class="dd-chip dd-chip--ok">in sync</span>' : '<span class="dd-chip">lagging</span>') + "</div></div>" +
        "</div>";
      if (s.note) html += '<div class="dd-note">' + s.note + "</div>";
      html += "</div>";
      host.innerHTML = html;
    }
    return { update: update, destroy: function () { host.innerHTML = ""; host.classList.remove("dd-viz"); } };
  }

  DL.deepDives["wal"] = {
    slug: "wal",
    overview: {
      what: "The <b>Write-Ahead Log (WAL)</b> is an append-only record of every change, written <b>before</b> the change reaches the data files. It is the mechanism behind two ACID guarantees: <b>Durability</b> (committed work survives crashes) and <b>Atomicity</b> (interrupted work rolls back cleanly).",
      why: "Writing changed data pages straight to disk on every commit would be slow (random I/O) and unsafe (a crash mid-write corrupts the page). WAL replaces that with one cheap sequential log append per change and a single fsync per commit — fast <i>and</i> crash-safe.",
      how: "Before a data page is modified on disk, a log record (with a before- and after-image and a monotonic LSN) is appended. COMMIT fsyncs the log — not the data pages. Dirty pages are flushed lazily at checkpoints. After a crash, recovery <b>redoes</b> committed changes and <b>undoes</b> uncommitted ones from the log."
    },
    steps: STEPS,
    buildViz: buildViz,
    code: {
      title: "The write-ahead protocol (conceptual)",
      lang: "sql",
      code:
        "-- 1. Log the intent BEFORE the data page can reach disk\n" +
        "append  LSN=11  { xid:7, page: products/42, before: 100, after: 99 }\n" +
        "modify  buffer page products/42  ->  stock = 99      -- page now DIRTY (disk still 100)\n" +
        "\n" +
        "-- 2. COMMIT waits only on the WAL fsync (not the data page)\n" +
        "append  LSN=12  { xid:7, COMMIT }\n" +
        "fsync   WAL up to LSN=12                              -- COMMIT returns only after this\n" +
        "\n" +
        "-- 3. Later: a checkpoint flushes the dirty page to the data file\n" +
        "-- WAL INVARIANT: a data page may not be written to disk before the\n" +
        "-- log records describing its changes are durable.  Log first, data later.",
      highlights: [2, 6, 7]
    },
    reference: [
      ["WAL", "Write-Ahead Log — append-only record of changes, written before data pages"],
      ["LSN", "Log Sequence Number — monotonic position/identity of a log record"],
      ["redo", "Re-apply committed changes that hadn't reached the data files"],
      ["undo", "Roll back uncommitted changes that did reach the data files"],
      ["commit record", "Durable WAL entry marking a transaction committed"],
      ["fsync", "Force buffered writes onto stable storage"],
      ["checkpoint", "Flush dirty pages + mark a safe redo start point"],
      ["dirty page", "A buffer page changed in memory but not yet written to disk"],
      ["WAL invariant", "A page's log records must be durable before the page is flushed"],
      ["group commit", "Batching many transactions' commits into a single fsync"]
    ],
    internals:
      "<p>WAL works because <b>sequential writes are dramatically cheaper than random writes</b>, and a single sequential <code>fsync</code> can be shared by many transactions (group commit). Each change becomes a compact log record; the expensive, scattered data-page writes are deferred and batched at checkpoints.</p>" +
      "<p>Records carry an <b>LSN</b> and typically both a before-image (for undo) and an after-image (for redo) — 'physiological' logging (logical within a page, physical across pages). Recovery is the <b>ARIES</b> algorithm: <i>Analysis</i> rebuilds the in-flight transaction and dirty-page tables from the last checkpoint; <i>Redo</i> repeats history forward from the redo point (replaying committed and uncommitted alike to reach the crash state); <i>Undo</i> then rolls back the transactions that never committed.</p>" +
      "<p>Because the WAL is a linear stream of every change, it doubles as the substrate for <b>replication</b> (ship the log to a replica and replay it) and <b>point-in-time recovery</b> (archive the log, replay to any moment).</p>",
    engineering:
      "<p>WAL sits on the commit critical path, so its storage <b>is</b> your write latency. Put it on fast, low-latency disk; ideally separate it from the data files so random data I/O doesn't contend with sequential log I/O. Commit throughput is bounded by fsync rate, which group commit amortizes under concurrency.</p>" +
      "<p>Watch WAL <b>growth</b>: if archiving stalls or a replication slot is abandoned, the server retains WAL it can't recycle and the disk fills — a classic outage. Know your durability knobs: <code>synchronous_commit=off</code> trades a small window of committed-but-lost transactions for lower latency; turning <code>fsync</code> off (or storage that lies about fsync) silently breaks durability entirely.</p>",
    gotchas: [
      { kind: "tip", html: "<b>Commit latency ≈ WAL fsync latency.</b> WAL turns many random data-page writes into one sequential append + fsync per commit — and group commit lets concurrent transactions share a single fsync. That's the whole reason commits are fast." },
      { kind: "warn", html: "<b>WAL can fill the disk and take the database down.</b> Stalled archiving or an abandoned replication slot forces the server to retain WAL it can't recycle. Monitor WAL volume and slot lag — a full WAL disk halts all writes." },
      { kind: "info", html: "<b>Durability knobs are real tradeoffs.</b> <code>synchronous_commit=off</code> risks losing the last few milliseconds of commits on a crash; <code>fsync=off</code> or storage that lies about fsync risks corruption. Never change these without understanding exactly what you're giving up." }
    ],
    failureModes:
      "<p><b>Slow WAL storage:</b> because COMMIT waits on the WAL fsync, slow or contended log disk makes every commit — every checkout — slow. <i>Fix:</i> fast dedicated WAL storage; verify group commit is helping under load.</p>" +
      "<p><b>WAL growth / disk full:</b> checkpoints falling behind, failed archive commands, or an orphaned replication slot cause WAL to accumulate until the disk fills and writes stop. <i>Fix:</i> monitor WAL size and slot lag; drop dead slots; fix archiving.</p>" +
      "<p><b>Long recovery after a crash:</b> infrequent checkpoints mean a huge log to replay on restart, extending downtime. <i>Fix:</i> tune checkpoint frequency to balance steady-state I/O against recovery time.</p>" +
      "<p><b>Silent durability loss ('fsync lies'):</b> misconfigured storage, virtualization, or disabled fsync acknowledge writes that never hit stable media, so a crash loses 'committed' data. <i>Fix:</i> use storage with honest, battery-backed durability; never disable fsync in production.</p>",
    quickCheck: [
      {
        q: "COMMIT returned success, but the changed data page was never written to the data file before a crash. Is the change lost?",
        options: [
          "Yes — the data file never got it",
          "No — recovery redoes it from the durable WAL commit record",
          "Only if a checkpoint hadn't run",
          "Only the last change in the transaction survives"
        ],
        answer: 1,
        why: "Durability rides on the WAL, not the data file. COMMIT fsync'd the commit record, so recovery's redo pass replays the change and reconstructs the page.",
        diff: "easy"
      },
      {
        q: "Why is one sequential WAL fsync per commit faster than flushing the changed data pages on commit?",
        options: [
          "Data pages are larger than the whole log",
          "fsync is free for sequential files",
          "It replaces scattered random page writes with one sequential append that many commits can share",
          "The WAL is kept only in memory"
        ],
        answer: 2,
        why: "Sequential appends are far cheaper than random page writes, and group commit lets concurrent transactions share a single fsync. Data pages are flushed later, in batches, at checkpoints.",
        diff: "medium"
      },
      {
        q: "A replication slot for a downstream consumer is abandoned and never advances. What happens to the WAL?",
        options: [
          "It's recycled normally — slots don't affect WAL",
          "It grows without bound as the server retains WAL for the slot, risking a full disk",
          "It's automatically archived and deleted",
          "New commits start overwriting old WAL"
        ],
        answer: 1,
        why: "The server must retain WAL a slot hasn't consumed. An abandoned slot pins WAL indefinitely; it accumulates until the disk fills and writes stop — a common production outage.",
        diff: "hard"
      }
    ],
    interviewQs: [
      {
        q: "Explain write-ahead logging and why it makes commits both fast and durable.",
        a: "Before a data page's change can reach disk, the database appends a log record (LSN, before/after image) describing it. COMMIT then fsyncs the WAL up to the commit record and returns — it does NOT flush the changed data pages, which are written lazily at checkpoints. It's fast because a commit costs one sequential append + fsync (shared across concurrent commits via group commit) instead of many random data-page writes. It's durable because the committed change is on stable storage in the log even if the data file is stale; recovery redoes it. The governing rule is the WAL invariant: a page's log records must be durable before the page itself is written.",
        tip: "The one-liner that lands: 'COMMIT waits on the log fsync, not the data write.' Then explain the WAL invariant."
      },
      {
        q: "What do the redo and undo phases of recovery each accomplish, and in what order?",
        a: "ARIES recovery runs Analysis, then Redo, then Undo. Analysis scans forward from the last checkpoint to rebuild the transaction table and dirty-page table — determining where redo must start and which transactions were in-flight. Redo 'repeats history': it replays every logged change from the redo point to bring the database to its exact state at crash time (committed and uncommitted alike). Undo then rolls back the transactions that had no commit record, using before-images. Redo delivers durability (committed work is restored); undo delivers atomicity (uncommitted work is erased).",
        tip: "The counter-intuitive detail interviewers look for: redo replays uncommitted changes too — undo cleans them up afterward."
      },
      {
        q: "Commit latency spikes under load. How does WAL explain it, and what do you check?",
        a: "Commits block on the WAL fsync, so commit latency tracks log-write latency. Under load, check: (1) is the WAL on slow or contended storage, or sharing a disk with random data I/O? (2) is group commit amortizing fsyncs, or is each commit fsyncing alone? (3) is synchronous_commit set as intended? (4) are checkpoints or an fsync storm stalling the log disk? (5) replication in synchronous mode adds the replica's ack to the commit path. The fix is usually faster/dedicated WAL storage, tuning checkpoints, or reconsidering synchronous replication settings.",
        tip: "Framing commit latency as 'fsync latency + (optional) replica ack' shows you know exactly what's on the critical path."
      }
    ],
    businessLens: {
      task: "Every ShopKart checkout commit = one durable WAL fsync",
      meaning: "'Order placed' is a promise the order survives a crash — backed by the log, not by flushing data files.",
      system: "OLTP write path (Postgres WAL)",
      point: "When ShopKart confirms an order, the only thing on the critical path is fsyncing the WAL commit record — the product and order pages are written back later at a checkpoint. That's why checkouts are fast and still crash-safe. It also means the WAL disk's speed is ShopKart's checkout latency for everyone at once, and a stalled archive or dead replication slot that fills the WAL disk halts every write in the store. WAL is simultaneously the durability guarantee, the performance lever, and a capacity risk to monitor."
    }
  };
})();
