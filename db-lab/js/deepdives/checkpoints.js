/* ============================================================
   deepdives/checkpoints.js — "Checkpoints" deep dive.
   Registers DBLab.deepDives['checkpoints'] (concept m54).
   Authored against the contract documented in deepdives/mvcc.js.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  DL.deepDives = DL.deepDives || {};

  // Scene: ShopKart's WAL grows as checkouts commit; dirty pages pile up in the
  // buffer pool. A checkpoint flushes them, advances the redo point, and bounds
  // how much WAL a crash must replay.
  function rec(lsn, body, opts) { opts = opts || {}; return { lsn: lsn, body: body, type: opts.type, mark: opts.mark }; }
  function pg(id, state) { return { id: id, state: state }; }

  var STEPS = [
    {
      label: "1 · Steady state: WAL grows, pages go dirty",
      what: "As ShopKart processes checkouts, each commit appends to the <b>WAL</b> and dirties a data page in the <b>buffer pool</b>. The last checkpoint sits at <code>LSN 100</code> — the current <b>redo point</b>.",
      why: "Between checkpoints, durable committed changes live only in the WAL; their data pages are still dirty in memory. The gap between 'the redo point' and 'now' is exactly what a crash would have to replay.",
      how: "Committing fsyncs the WAL, not the data pages (write-ahead logging). Dirty pages accumulate in the buffer pool; the checkpointer will flush them later, in bulk.",
      when: "Continuous, normal operation — the WAL always runs ahead of the data files by design.",
      mistake: "Assuming committed data is already in the data files. It's in the WAL; the pages are flushed lazily at the next checkpoint.",
      interview: "“Between checkpoints, where do committed changes live?” Durably in the WAL; their data pages may still be dirty in memory until a checkpoint flushes them.",
      example: "During a ShopKart sale, 40 pages are dirty and the WAL has grown 60&nbsp;MB since the last checkpoint at LSN 100.",
      viz: {
        wal: [rec(100, "◆ CHECKPOINT", { type: "checkpoint", mark: "redopoint" }), rec(101, "order upd"), rec(102, "order upd"), rec(103, "COMMIT"), rec(104, "order upd")],
        pages: [pg("p1", "dirty"), pg("p2", "dirty"), pg("p3", "dirty"), pg("p4", "clean"), pg("p5", "dirty"), pg("p6", "dirty")],
        metrics: [{ label: "WAL since ckpt", val: "60 MB", tone: "" }, { label: "dirty pages", val: "40" }, { label: "redo point", val: "LSN 100" }],
        note: "Redo point = last checkpoint (LSN 100). Everything after it is what a crash must replay."
      }
    },
    {
      label: "2 · Without checkpoints, recovery replays everything",
      what: "Imagine no checkpoints ever ran. After a crash, recovery would have to start at the <b>very beginning</b> of the WAL and replay every change since the database was created — potentially hours of log.",
      why: "The WAL is a complete history, so it <i>could</i> rebuild any state — but replaying all of it makes restart time unbounded. Checkpoints exist to cap that work.",
      how: "Recovery's redo pass starts at the redo point and replays forward. With no checkpoint, the redo point never advances past LSN 0, so the whole log is in scope.",
      when: "This is the pathological case checkpoints prevent; it's also why a database with checkpoints disabled or starved recovers agonizingly slowly.",
      mistake: "Treating recovery time as fixed. It scales with WAL-since-redo-point — which is precisely what checkpoint frequency controls.",
      interview: "“Why not just skip checkpoints and rely on the WAL?” The WAL could rebuild state, but recovery would replay the entire log — unbounded downtime. Checkpoints bound the redo work.",
      example: "Without checkpoints, a ShopKart node that crashes after a week of traffic would replay a week of WAL before reopening — an unacceptable outage.",
      viz: {
        wal: [rec("0", "…genesis", { mark: "redopoint" }), rec("…", "hours of"), rec("…", "committed"), rec("…", "changes"), rec(104, "order upd")],
        pages: [pg("p1", "dirty"), pg("p2", "dirty"), pg("p3", "dirty"), pg("p4", "dirty"), pg("p5", "dirty"), pg("p6", "dirty")],
        metrics: [{ label: "replay window", val: "ALL WAL", tone: "bad" }, { label: "est. recovery", val: "hours", tone: "bad" }],
        note: "No checkpoint → redo starts at genesis → recovery replays the entire history. Unbounded restart time."
      }
    },
    {
      label: "3 · What triggers a checkpoint",
      what: "A checkpoint fires on whichever comes first: a <b>time</b> limit (<code>checkpoint_timeout</code>, e.g. 5&nbsp;min) or a <b>WAL volume</b> limit (<code>max_wal_size</code>). Clean shutdowns and some commands force one too.",
      why: "Bounding by both time and volume caps recovery whether the system is idle (time) or slammed with writes (volume) — so restart time stays predictable under any load.",
      how: "The checkpointer wakes on the timer or when WAL since the last checkpoint approaches <code>max_wal_size</code>. A volume-triggered checkpoint under heavy load is a signal your WAL settings may be too tight.",
      when: "Automatically and continuously; also at shutdown, <code>CHECKPOINT;</code>, base backups, and <code>CREATE DATABASE</code>.",
      mistake: "Only tuning the timer and ignoring <code>max_wal_size</code> — under load, volume-triggered checkpoints can fire far more often than you expect.",
      interview: "“What triggers a checkpoint?” Time (<code>checkpoint_timeout</code>) or WAL volume (<code>max_wal_size</code>), whichever first — plus shutdown and certain commands.",
      example: "At peak, ShopKart hits <code>max_wal_size</code> before the 5-minute timer, so checkpoints fire on volume — a hint to raise <code>max_wal_size</code>.",
      viz: {
        wal: [rec(100, "◆ CHECKPOINT", { type: "checkpoint", mark: "redopoint" }), rec(101, "upd"), rec(102, "upd"), rec(103, "COMMIT"), rec(104, "upd"), rec(105, "upd", { mark: "scan" })],
        pages: [pg("p1", "dirty"), pg("p2", "dirty"), pg("p3", "dirty"), pg("p4", "dirty"), pg("p5", "dirty"), pg("p6", "dirty")],
        metrics: [{ label: "WAL since ckpt", val: "~max", tone: "bad" }, { label: "timeout", val: "5 min" }, { label: "trigger", val: "volume ▶", tone: "bad" }],
        note: "WAL neared max_wal_size before the timer → a volume-triggered checkpoint is about to run."
      }
    },
    {
      label: "4 · The checkpoint flushes dirty pages",
      what: "The checkpoint writes <b>all currently-dirty pages</b> to the data files, then appends a <b>checkpoint record</b> (<code>LSN 106</code>) and fsyncs. The data files now reflect everything up to that point.",
      why: "Flushing the dirty pages is what lets recovery skip everything before the checkpoint: once those changes are safely in the data files, they never need replaying again.",
      how: "The checkpointer collects the dirty buffers as of the checkpoint start, writes them out, fsyncs the data files, then records the checkpoint (with its redo LSN) in the WAL and fsyncs the WAL.",
      when: "Each checkpoint cycle; the flush is the I/O-heavy part and is deliberately paced (next steps).",
      mistake: "Picturing a checkpoint as instant. It's a bulk flush of potentially thousands of pages — an I/O event that must be smoothed, not a metadata flip.",
      interview: "“What does a checkpoint physically do?” Flush dirty pages to the data files, fsync, then write a checkpoint record marking the new safe redo start.",
      example: "ShopKart's checkpoint flushes its 40 dirty pages to disk and records the checkpoint at LSN 106; SKU pages are now durable in the data files, not just the WAL.",
      viz: {
        wal: [rec(100, "◆ old ckpt", { type: "checkpoint" }), rec(101, "upd"), rec(103, "COMMIT"), rec(105, "upd"), rec(106, "◆ CHECKPOINT", { type: "checkpoint", mark: "scan" })],
        pages: [pg("p1", "clean"), pg("p2", "clean"), pg("p3", "clean"), pg("p4", "clean"), pg("p5", "clean"), pg("p6", "clean")],
        metrics: [{ label: "flushed", val: "40 pages", tone: "good" }, { label: "ckpt record", val: "LSN 106", tone: "good" }, { label: "data files", val: "in sync", tone: "good" }],
        note: "All dirty pages flushed & fsynced, checkpoint recorded at LSN 106. Data files caught up to the WAL."
      }
    },
    {
      label: "5 · The redo point advances — old WAL recycles",
      what: "The redo point moves forward to <code>LSN 106</code>. WAL segments <b>entirely before</b> it are no longer needed for crash recovery and can be <b>recycled or archived</b>. The replay window shrinks to almost nothing.",
      why: "This is the double payoff: recovery now only replays WAL after LSN 106 (fast restart), and the WAL disk stops growing because old segments are freed for reuse.",
      how: "Postgres renames old segment files ahead for reuse (recycling) rather than deleting them. If archiving or a replication slot still needs a segment, it's retained until they release it.",
      when: "After every checkpoint; the amount freed depends on how much WAL the checkpoint made obsolete.",
      mistake: "Assuming a checkpoint always frees WAL. If archiving stalls or a replication slot is behind, those segments are pinned and the WAL disk can still fill.",
      interview: "“What happens to WAL after a checkpoint?” Segments before the new redo point are recyclable/archivable — unless an archiver or replication slot still needs them.",
      example: "After the checkpoint, ShopKart recycles 55&nbsp;MB of pre-LSN-106 WAL; a crash now replays only the few MB written since — a sub-second redo.",
      viz: {
        wal: [rec(100, "recycled", { mark: "recycle" }), rec(103, "recycled", { mark: "recycle" }), rec(106, "◆ CHECKPOINT", { type: "checkpoint", mark: "redopoint" }), rec(107, "upd"), rec(108, "COMMIT")],
        pages: [pg("p1", "clean"), pg("p2", "clean"), pg("p3", "clean"), pg("p7", "dirty"), pg("p8", "dirty")],
        metrics: [{ label: "redo point", val: "LSN 106", tone: "good" }, { label: "replay window", val: "few MB", tone: "good" }, { label: "WAL recycled", val: "55 MB", tone: "good" }],
        note: "Redo point advanced to LSN 106. Pre-checkpoint WAL recycled; recovery now replays only what came after."
      }
    },
    {
      label: "6 · Spread the flush to avoid an I/O spike",
      what: "Flushing thousands of dirty pages all at once would spike disk I/O and stall queries. <b><code>checkpoint_completion_target</code></b> spreads the writes across most of the interval so the flush is gentle and steady.",
      why: "A checkpoint's job is background housekeeping; if it hammers the disk it competes with live checkouts. Smoothing the writes keeps latency flat while still finishing before the next checkpoint.",
      how: "With <code>checkpoint_completion_target = 0.9</code>, the checkpointer paces its page writes to finish at ~90% of the way to the next checkpoint — trickling I/O instead of dumping it.",
      when: "Always relevant on write-heavy systems; 0.9 is the modern default and rarely wants lowering.",
      mistake: "Leaving completion target low (bursty flush) and then blaming random latency spikes on the storage — it's the checkpoint dumping I/O.",
      interview: "“What does checkpoint_completion_target do?” It spreads the dirty-page flush across the checkpoint interval to avoid an I/O spike that would stall foreground queries.",
      example: "ShopKart sets completion target 0.9 so checkpoint flushing is a steady trickle; p99 checkout latency stops spiking every 5 minutes.",
      viz: {
        wal: [rec(106, "◆ CHECKPOINT", { type: "checkpoint", mark: "redopoint" }), rec(107, "upd"), rec(108, "COMMIT"), rec(109, "upd"), rec(110, "upd")],
        pages: [pg("p7", "clean"), pg("p8", "dirty"), pg("p9", "clean"), pg("p10", "dirty"), pg("p11", "clean"), pg("p12", "dirty")],
        metrics: [{ label: "completion", val: "0.9" }, { label: "flush", val: "spread", tone: "good" }, { label: "p99 latency", val: "flat", tone: "good" }],
        note: "Pages flushed gradually across the interval (target 0.9) — I/O trickles instead of spiking. Latency stays flat."
      }
    },
    {
      label: "7 · The tuning tradeoff: recovery vs steady-state I/O",
      what: "Checkpoint frequency is a single dial with two ends. <b>Frequent</b> checkpoints → a small replay window → fast recovery, but more page flushing and more full-page-write WAL. <b>Infrequent</b> → less steady I/O, but a longer, scarier recovery.",
      why: "Your restart time objective (RTO) and your storage's write headroom pull in opposite directions. There's no universally right setting — only the right balance for your workload and downtime budget.",
      how: "Raise <code>checkpoint_timeout</code> and <code>max_wal_size</code> to checkpoint less often (cheaper steady state, slower recovery); lower them for faster recovery. Remember the first change to each page after a checkpoint logs a <b>full-page image</b>, so very frequent checkpoints inflate WAL volume.",
      when: "Tuned per system and validated by actually measuring recovery time at your peak WAL rate.",
      mistake: "Stretching checkpoints far apart purely to cut I/O, then discovering a multi-minute restart during a real outage. Balance against RTO, and test it.",
      interview: "“How do checkpoints trade off against recovery?” More frequent = faster recovery but more flush + full-page-write I/O; less frequent = cheaper steady state but longer recovery. Tune to your RTO.",
      example: "ShopKart sizes <code>max_wal_size</code> so a node restarts within its 30-second RTO at peak WAL rate — accepting a bit more steady-state flush I/O to guarantee a fast reopen.",
      viz: {
        wal: [rec(106, "◆ CHECKPOINT", { type: "checkpoint", mark: "redopoint" }), rec(107, "upd"), rec(108, "COMMIT"), rec(109, "upd")],
        pages: [pg("p7", "clean"), pg("p8", "clean"), pg("p9", "dirty"), pg("p10", "clean")],
        metrics: [{ label: "frequent", val: "fast recovery", tone: "good" }, { label: "frequent", val: "more I/O", tone: "bad" }, { label: "your dial", val: "RTO ↔ I/O" }],
        note: "One dial: checkpoint often for a fast restart (more flush + full-page-write WAL), or rarely for cheaper steady state (slower recovery). Balance to your RTO."
      }
    }
  ];

  function buildViz(host) {
    host.classList.add("dd-viz");
    function walRec(r) {
      var cls = "dd-tl-rec" + (r.type ? " is-" + r.type : "") + (r.mark ? " " + r.mark : "");
      var lsn = (r.lsn === "0" || r.lsn === "…") ? r.lsn : "LSN " + r.lsn;
      var tag = r.mark === "redopoint" ? '<div class="dd-tl-tag">redo starts here</div>' :
        (r.mark === "recycle" ? '<div class="dd-tl-tag muted">recyclable</div>' : "");
      return '<div class="' + cls + '"><div class="dd-tl-lsn">' + lsn + "</div>" +
        '<div class="dd-tl-body">' + r.body + "</div>" + tag + "</div>";
    }
    function pageSq(p) { return '<div class="dd-pg ' + p.state + '">' + p.id + "</div>"; }
    function metricChip(m) {
      var cls = "dd-metric" + (m.tone ? " " + m.tone : "");
      return '<div class="' + cls + '"><span class="dd-metric-val">' + m.val + "</span><span class=\"dd-metric-lbl\">" + m.label + "</span></div>";
    }
    function update(idx, step) {
      var s = step && step.viz;
      if (idx < 0 || !s) {
        host.innerHTML = '<div class="dd-empty">Press <b>Play</b> to watch ShopKart\'s WAL grow and dirty pages pile up — ' +
          "then see a checkpoint flush them, advance the redo point, and shrink what a crash must replay.</div>";
        return;
      }
      var html = '<div class="dd-section"><div class="dd-section-label">Write-ahead log</div>' +
        '<div class="dd-timeline">' + s.wal.map(walRec).join("") + "</div></div>";
      html += '<div class="dd-section"><div class="dd-section-label">Buffer pool pages</div>' +
        '<div class="dd-scanpages">' + s.pages.map(pageSq).join("") + "</div></div>";
      html += '<div class="dd-section"><div class="dd-section-label">Checkpoint state</div>' +
        '<div class="dd-metrics">' + s.metrics.map(metricChip).join("") + "</div></div>";
      if (s.note) html += '<div class="dd-note">' + s.note + "</div>";
      host.innerHTML = html;
    }
    return { update: update, destroy: function () { host.innerHTML = ""; host.classList.remove("dd-viz"); } };
  }

  DL.deepDives["checkpoints"] = {
    slug: "checkpoints",
    overview: {
      what: "A <b>checkpoint</b> flushes all dirty buffer-pool pages to the data files and records a safe <b>redo point</b> in the WAL. It's the mechanism that <b>bounds crash-recovery time</b> and lets old WAL be recycled.",
      why: "Between checkpoints, committed changes are durable only in the WAL while their data pages sit dirty in memory. A crash must replay every change since the last checkpoint — so how often you checkpoint directly sets your restart time and how much WAL disk you burn.",
      how: "Triggered by time (<code>checkpoint_timeout</code>) or WAL volume (<code>max_wal_size</code>), the checkpointer writes out dirty pages, fsyncs, and appends a checkpoint record with the new redo LSN. Recovery then only replays WAL after that point; older segments become recyclable. The flush is paced by <code>checkpoint_completion_target</code> to avoid an I/O spike."
    },
    steps: STEPS,
    buildViz: buildViz,
    code: {
      title: "Checkpoint knobs and what recovery will replay",
      lang: "sql",
      code:
        "-- The core tuning knobs (postgresql.conf)\n" +
        "checkpoint_timeout = 15min          -- max time between checkpoints\n" +
        "max_wal_size = 8GB                  -- WAL volume that forces a checkpoint\n" +
        "checkpoint_completion_target = 0.9  -- spread the flush across the interval\n" +
        "\n" +
        "-- Are checkpoints firing on the timer, or too often on volume?\n" +
        "SELECT num_timed, num_requested, write_time, sync_time\n" +
        "FROM pg_stat_checkpointer;   -- (pg_stat_bgwriter on PG < 17)\n" +
        "--   num_requested >> num_timed  =>  raise max_wal_size\n" +
        "\n" +
        "-- Force one now (e.g. before a backup)\n" +
        "CHECKPOINT;\n" +
        "\n" +
        "-- How much WAL would a crash replay right now? (distance past the redo point)\n" +
        "SELECT pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(),\n" +
        "       (SELECT redo_lsn FROM pg_control_checkpoint()))) AS replay_window;",
      highlights: [2, 3, 4, 7]
    },
    reference: [
      ["checkpoint", "Flush of all dirty pages + a WAL record marking a safe redo start"],
      ["redo point", "The LSN where crash recovery begins replaying (set by the last checkpoint)"],
      ["checkpoint_timeout", "Max wall-clock time between checkpoints"],
      ["max_wal_size", "WAL volume that triggers a checkpoint before the timer"],
      ["checkpoint_completion_target", "Fraction of the interval over which the dirty-page flush is spread"],
      ["dirty page", "A buffer page changed in memory but not yet written to the data file"],
      ["full-page write", "Logging a whole page on its first change after a checkpoint (torn-page safety)"],
      ["WAL recycling", "Reusing WAL segment files older than the redo point"],
      ["RTO", "Recovery Time Objective — the restart-time budget checkpoints must meet"],
      ["checkpointer", "The background process that performs checkpoints"]
    ],
    internals:
      "<p>A checkpoint is a <b>consistency barrier</b>, not a metadata flip. The checkpointer records a redo LSN (where replay must start), writes out every buffer that was dirty as of that moment, fsyncs the data files, then writes the checkpoint record to the WAL and fsyncs it. Once that record is durable, all WAL before the redo LSN is provably unnecessary for crash recovery.</p>" +
      "<p>Recovery time is therefore, to first order, <b>the volume of WAL between the redo point and the crash</b>, replayed at restart. Checkpoint frequency is the knob that sets that window: frequent checkpoints keep the window (and RTO) small but flush pages more eagerly and, via <b>full-page writes</b>, inflate WAL — the first change to a page after each checkpoint logs the entire page to survive torn writes. Infrequent checkpoints do the reverse.</p>" +
      "<p>The flush itself is smoothed by <code>checkpoint_completion_target</code> so it doesn't spike I/O against foreground queries, and old segments are <b>recycled</b> (renamed for reuse) rather than deleted. Crucially, recycling is blocked by anything still needing those segments — pending archive commands or lagging replication slots — which is how a healthy checkpoint cadence can still coexist with a filling WAL disk.</p>",
    engineering:
      "<p>Treat checkpoint tuning as an explicit <b>RTO ↔ steady-state-I/O</b> decision. Size <code>max_wal_size</code> and <code>checkpoint_timeout</code> so that, at your peak WAL rate, the replay window fits your restart budget — then confirm by actually timing a recovery. Watch <code>pg_stat_checkpointer</code>: if <code>num_requested</code> dominates <code>num_timed</code>, checkpoints are firing on volume and <code>max_wal_size</code> is too small, causing extra full-page-write churn.</p>" +
      "<p>Keep <code>checkpoint_completion_target</code> near 0.9 so the flush is a trickle, not a spike — bursty checkpoints show up as periodic p99 latency humps. And remember checkpoints don't stand alone: WAL recycling depends on archiving keeping up and replication slots not lagging, so monitor WAL disk usage and slot state alongside checkpoint stats.</p>",
    gotchas: [
      { kind: "warn", html: "<b>Recovery time ≈ WAL since the last checkpoint.</b> Stretching <code>checkpoint_timeout</code>/<code>max_wal_size</code> to cut I/O can quietly turn a crash into minutes of replay. Tune the window to your RTO and test it." },
      { kind: "tip", html: "<b>Frequent checkpoints inflate WAL via full-page writes.</b> The first change to each page after a checkpoint logs the whole page. Very short checkpoint intervals mean more full-page images — more WAL volume and I/O, not less." },
      { kind: "info", html: "<b>A checkpoint isn't instant.</b> It's a bulk flush of every dirty page. Keep <code>checkpoint_completion_target</code> high (≈0.9) to spread that I/O, or foreground latency spikes each cycle." }
    ],
    failureModes:
      "<p><b>RTO blowout:</b> sparse checkpoints + a high WAL rate mean a huge replay window, so a peak-hour crash causes a long restart. <i>Fix:</i> size <code>max_wal_size</code>/<code>checkpoint_timeout</code> to your downtime budget; measure recovery at realistic WAL volume.</p>" +
      "<p><b>Checkpoint I/O spikes:</b> a low completion target dumps thousands of page writes at once, stalling foreground queries every cycle. <i>Fix:</i> <code>checkpoint_completion_target ≈ 0.9</code>; ensure storage has write headroom.</p>" +
      "<p><b>Volume-triggered thrash:</b> an undersized <code>max_wal_size</code> forces frequent requested checkpoints and extra full-page writes, amplifying WAL and I/O. <i>Fix:</i> raise <code>max_wal_size</code>; watch <code>num_requested</code> vs <code>num_timed</code>.</p>" +
      "<p><b>WAL disk fills despite checkpoints:</b> old segments can't recycle because archiving stalled or a replication slot lags, so the disk fills and writes stop. <i>Fix:</i> monitor archiver and slot lag; drop dead slots.</p>",
    quickCheck: [
      {
        q: "What primarily determines how long crash recovery takes?",
        options: [
          "The total database size",
          "The volume of WAL written since the last checkpoint",
          "The number of indexes",
          "The isolation level"
        ],
        answer: 1,
        why: "Recovery replays from the last checkpoint's redo point to the end of the WAL, so restart time tracks the WAL accumulated since the last checkpoint — which is exactly what checkpoint frequency controls.",
        diff: "easy"
      },
      {
        q: "You make checkpoints much more frequent to speed up recovery. What's the main cost?",
        options: [
          "Commits stop being durable",
          "More steady-state I/O — eager page flushing plus more full-page-write WAL",
          "Indexes must be rebuilt each checkpoint",
          "The buffer pool shrinks"
        ],
        answer: 1,
        why: "Frequent checkpoints flush dirty pages more eagerly and, because the first change to each page after a checkpoint logs a full-page image, they inflate WAL volume. It's an RTO-vs-steady-state-I/O tradeoff, not a free win.",
        diff: "medium"
      },
      {
        q: "Checkpoints are running on schedule, but the WAL disk is filling up. Why?",
        options: [
          "Checkpoints never free WAL",
          "Old segments can't recycle because archiving stalled or a replication slot is lagging",
          "checkpoint_completion_target is too high",
          "The redo point moved backward"
        ],
        answer: 1,
        why: "A checkpoint makes pre-redo-point WAL recyclable, but the server still can't reuse a segment an archiver hasn't archived or a replication slot hasn't consumed. Those pin WAL and the disk fills even with healthy checkpoints.",
        diff: "hard"
      }
    ],
    interviewQs: [
      {
        q: "What is a checkpoint and why does a WAL-based database need them?",
        a: "A checkpoint flushes all currently-dirty buffer-pool pages to the data files, fsyncs, and writes a checkpoint record in the WAL marking a new redo point. It's needed because write-ahead logging deliberately defers data-page writes: between checkpoints, committed changes are durable only in the WAL while their pages are dirty in memory. Crash recovery must replay all WAL from the last redo point forward, so without checkpoints that window — and restart time — would grow without bound. Checkpoints cap recovery time and let WAL segments before the redo point be recycled or archived.",
        tip: "Anchor it: 'a checkpoint is what lets recovery start in the middle of the log instead of the beginning.'"
      },
      {
        q: "How do checkpoint frequency and checkpoint_completion_target trade off, and how would you tune them?",
        a: "Frequency (checkpoint_timeout and max_wal_size, whichever hits first) sets the recovery window: more frequent checkpoints mean a smaller replay window and faster restart, but more eager page flushing and more full-page-write WAL — higher steady-state I/O. Less frequent means cheaper steady state but a longer, riskier recovery. completion_target (≈0.9) is orthogonal: it spreads the dirty-page flush across the interval so the checkpoint doesn't spike I/O and stall foreground queries. To tune: pick max_wal_size/timeout so the replay window fits your RTO at peak WAL rate, keep completion_target high, then validate by measuring actual recovery time and watching pg_stat_checkpointer for volume-triggered (num_requested) checkpoints.",
        tip: "Say the phrase 'RTO versus steady-state I/O' — that framing is what interviewers are listening for."
      },
      {
        q: "Why can very frequent checkpoints actually increase WAL volume?",
        a: "Because of full-page writes. To survive torn pages (a crash mid 8 KB page write), Postgres logs the entire page image the first time it's modified after each checkpoint, instead of just the row delta. The more often checkpoints run, the more often each page's 'first change after a checkpoint' happens, so more full-page images are written to the WAL. That's the counter-intuitive part of checkpoint tuning: cranking frequency up to shrink recovery can bloat WAL and I/O rather than reduce it, so there's a genuine optimum rather than 'more is better'.",
        tip: "Full-page writes are the detail that separates a memorized answer from real understanding — mention torn-page protection explicitly."
      }
    ],
    businessLens: {
      task: "Guarantee a ShopKart node reopens within its RTO after a crash",
      meaning: "A power event mid-sale must become a brief blip, not a multi-minute outage.",
      system: "OLTP node durability (Postgres WAL + checkpoints)",
      point: "Checkpoints are the dial between how fast ShopKart's store comes back after a crash and how much I/O it spends in normal operation. Size the WAL window small and a node replays only seconds of log on restart — but the disk works harder every minute, flushing pages and writing full-page images. Size it large and steady-state is cheap, but a peak-hour crash could take minutes of replay to reopen. Setting that balance to the store's RTO — and actually testing recovery — turns crash recovery from a gamble into an SLO."
    }
  };
})();
