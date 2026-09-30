/* ============================================================
   deepdives/vacuum.js — "VACUUM" deep dive.
   Registers DBLab.deepDives['vacuum'] (concept m50).
   Authored against the contract documented in deepdives/mvcc.js.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  DL.deepDives = DL.deepDives || {};

  // Scene: one heap page of ShopKart's `products` table. Updates to SKU #42's
  // stock churn the page into dead tuples (MVCC leftovers); VACUUM reclaims
  // them once no snapshot needs them, and freezes old XIDs.
  function t(id, state, note) { return { id: id, state: state, note: note || "" }; }

  var STEPS = [
    {
      label: "1 · A heap page of live rows",
      what: "ShopKart's <code>products</code> table is stored as <b>heap pages</b> (8&nbsp;KB each). This page holds a handful of live tuples — one current version per product row. Nothing is dead yet.",
      why: "VACUUM only makes sense once you picture the heap as slots of <i>tuple versions</i>, not rows. Under MVCC every row is a chain of versions; a page is where those versions physically live and eventually pile up.",
      how: "Each tuple carries <code>xmin</code>/<code>xmax</code> system columns. Here every tuple has <code>xmax = ∅</code> (nobody superseded it) — all live, all visible, zero bloat.",
      when: "A freshly loaded or freshly vacuumed table looks like this: dense, all-live tuples with free space at the tail of each page.",
      mistake: "Thinking a table is a neat list of rows. Physically it's pages of tuple versions — and an UPDATE doesn't touch a row in place, it adds a version.",
      interview: "“What is a table physically?” A set of heap pages, each packed with tuple versions tagged by the transactions that created and superseded them.",
      example: "SKU&nbsp;#42 (a popular ShopKart charger) sits as one live tuple on this page, alongside a few neighbours — all current.",
      viz: {
        tuples: [t("#41", "live"), t("#42", "live"), t("#43", "live"), t("#44", "live"), t("#45", "live")],
        metrics: [{ label: "live", val: "5" }, { label: "dead", val: "0", tone: "good" }, { label: "bloat", val: "0%", tone: "good" }],
        note: "A dense page of live tuples. Free space sits at the tail, ready for new rows."
      }
    },
    {
      label: "2 · Updates leave dead tuples behind",
      what: "Every checkout updates SKU&nbsp;#42's stock. Under MVCC each <code>UPDATE</code> writes a <b>new version</b> and stamps the old one's <code>xmax</code> — the old version becomes a <b>dead tuple</b>, still occupying its slot.",
      why: "This is the price of lock-free reads: writers append instead of overwriting, so superseded versions accumulate. They can't be removed immediately because older snapshots might still need them.",
      how: "Three updates to #42 create v2, v3, v4; v1, v2, v3 are now dead (their <code>xmax</code> is a committed XID). The live version is v4. Dead tuples still cost space and are still scanned by reads.",
      when: "Any <code>UPDATE</code> or <code>DELETE</code> generates dead tuples — the churn rate is set by your write workload.",
      mistake: "Assuming an UPDATE reuses the old tuple's space. It doesn't — the old version lingers as dead until VACUUM reclaims it.",
      interview: "“Where do dead tuples come from?” Every UPDATE/DELETE under MVCC: the superseded version stays on the page as dead until it's vacuumed.",
      example: "A flash sale hammers SKU&nbsp;#42; after three quick stock updates the page holds one live version and three dead ones — for a single product.",
      viz: {
        tuples: [t("#41", "live"), t("#42 v1", "dead"), t("#42 v2", "dead"), t("#42 v3", "dead"), t("#42 v4", "recent"), t("#43", "live"), t("#44", "live"), t("#45", "live")],
        metrics: [{ label: "live", val: "5" }, { label: "dead", val: "3", tone: "bad" }, { label: "bloat", val: "27%", tone: "bad" }],
        note: "Three updates to #42 → three dead tuples. The live value is v4; the rest are MVCC leftovers."
      }
    },
    {
      label: "3 · Dead tuples become bloat",
      what: "Left unchecked, dead tuples fill pages so new rows spill onto <b>new pages</b> — the table (and its indexes) grow far beyond the live data. This wasted, dead-occupied space is <b>bloat</b>.",
      why: "Bloat isn't just disk: every sequential scan reads dead tuples too, the buffer pool caches them, and indexes point at them. A 4× bloated table is roughly a 4× slower scan and a colder cache.",
      how: "With no free slot on the page, the next insert/update allocates a new page. Reads must still visit dead tuples to check visibility (unless the visibility map lets them skip an all-visible page).",
      when: "Steadily, on write-heavy tables when autovacuum can't keep up — or is being held back (next step).",
      mistake: "Blaming slow queries on missing indexes when the real cause is a bloated heap: the index is fine, the table is 5× its live size.",
      interview: "“Why does bloat slow reads, not just waste disk?” Scans and index lookups still traverse dead tuples, and they evict live data from cache — so throughput drops with bloat.",
      example: "ShopKart's <code>products</code> heap balloons to 5× its live size during a sale weekend; the catalog page scan that took 20&nbsp;ms now takes 90&nbsp;ms.",
      viz: {
        tuples: [t("#42 v1", "dead"), t("#42 v2", "dead"), t("#42 v3", "dead"), t("#42 v5", "dead"), t("#42 v6", "dead"), t("#42 v8", "recent"), t("#46", "live"), t("#47", "live")],
        metrics: [{ label: "live tuples", val: "3" }, { label: "dead", val: "5", tone: "bad" }, { label: "bloat", val: "62%", tone: "bad" }, { label: "heap size", val: "5×", tone: "bad" }],
        note: "Dead tuples crowd out live rows; the heap grows to 5× its live data. Scans now read mostly corpses."
      }
    },
    {
      label: "4 · The xmin horizon gates reclamation",
      what: "VACUUM can't just delete any dead tuple — it may only remove versions that <b>no live snapshot can still see</b>. That boundary is the <b>xmin horizon</b>: the oldest XID any open transaction still needs.",
      why: "Reclaiming a version an open transaction might read would break snapshot isolation. So a single long-running transaction <b>pins the horizon</b> and blocks reclamation across the whole database — the #1 cause of runaway bloat.",
      how: "A dead tuple is removable only if its <code>xmax</code> is committed and below the horizon. Here a nightly analytics transaction (XID&nbsp;5000) is still open, so tuples superseded at XID&nbsp;≥&nbsp;5000 are <b>not yet dead to everyone</b> — VACUUM must leave them.",
      when: "Whenever any transaction stays open: <code>idle in transaction</code> sessions, long analytics queries, abandoned connections, or a stuck replication slot with <code>hot_standby_feedback</code>.",
      mistake: "Leaving a transaction open 'just in case' while waiting on app logic or user input — it silently stops VACUUM everywhere.",
      interview: "“Why can one idle transaction bloat every table?” It pins the xmin horizon, so VACUUM can't reclaim any tuple newer than that transaction's snapshot — across all tables.",
      example: "ShopKart's 2-hour BI export (XID&nbsp;5000) holds the horizon; even aggressive autovacuum can't reclaim SKU&nbsp;#42's dead versions until it finishes.",
      viz: {
        tuples: [t("#42 v5", "dead"), t("#42 v6", "dead"), t("#42 v8", "recent"), t("#46", "live"), t("#47", "live")],
        metrics: [{ label: "horizon", val: "xid 5000", tone: "bad" }, { label: "dead", val: "2", tone: "bad" }, { label: "reclaimable", val: "0", tone: "bad" }],
        horizon: "Long-running BI transaction XID 5000 is still open — it pins the xmin horizon. Dead tuples superseded at xid ≥ 5000 cannot be reclaimed yet.",
        note: "VACUUM is blocked not by cost but by visibility: nothing newer than the oldest snapshot can go."
      }
    },
    {
      label: "5 · Autovacuum wakes up",
      what: "Postgres doesn't wait for you. <b>Autovacuum</b> continuously watches each table's dead-tuple count and launches a worker when it crosses a threshold — roughly <code>threshold + scale_factor × live_rows</code>.",
      why: "Manual VACUUM doesn't scale to thousands of tables. Autovacuum makes reclamation a background process tuned per-table, so bloat is controlled without a human in the loop.",
      how: "The stats collector tracks <code>n_dead_tup</code>. With defaults (<code>scale_factor 0.2</code>, <code>threshold 50</code>), a 1000-row table vacuums at ~250 dead tuples. Once the analytics txn ends, the horizon advances and a worker starts.",
      when: "Always on by default; it also triggers <code>ANALYZE</code> to refresh planner statistics on churn.",
      mistake: "Disabling autovacuum to 'save I/O'. Bloat and — worse — XID wraparound then creep up until the database degrades or refuses writes.",
      interview: "“When does autovacuum run?” When a table's dead tuples exceed <code>autovacuum_vacuum_threshold + scale_factor × reltuples</code> — tunable per table for hot tables.",
      example: "ShopKart lowers <code>autovacuum_vacuum_scale_factor</code> to 0.02 on the hot <code>products</code> table so it's vacuumed often, not once it's already 20% dead.",
      viz: {
        tuples: [t("#42 v5", "dead"), t("#42 v6", "dead"), t("#42 v8", "recent"), t("#46", "live"), t("#47", "live")],
        metrics: [{ label: "dead", val: "260", tone: "bad" }, { label: "threshold", val: "250" }, { label: "autovacuum", val: "▶ run", tone: "good" }],
        note: "n_dead_tup (260) crossed the threshold (250) and the horizon advanced → an autovacuum worker launches."
      }
    },
    {
      label: "6 · VACUUM reclaims the space",
      what: "The worker scans the page, finds dead tuples below the horizon, and marks their space <b>reusable</b>. It updates the <b>free space map</b> and <b>visibility map</b>, and removes the matching index entries.",
      why: "This is the payoff: reclaimed space is available for new tuples <i>in place</i>, scans shrink, and all-visible pages can be skipped by index-only scans. Bloat stops growing without rewriting the table.",
      how: "Plain <code>VACUUM</code> does <b>not</b> return space to the OS — the file stays the same size, but the holes are now free for reuse. Only <code>VACUUM FULL</code> (or <code>pg_repack</code>) compacts the file and shrinks it on disk.",
      when: "Continuously via autovacuum; manually after a big bulk delete/update when you want the space freed for reuse quickly.",
      mistake: "Expecting plain VACUUM to shrink the file on disk. It reclaims space for <i>reuse</i>; it doesn't give it back to the filesystem.",
      interview: "“Does VACUUM return disk to the OS?” No — plain VACUUM frees space for reuse within the table. VACUUM FULL rewrites and shrinks the file but takes an exclusive lock.",
      example: "After autovacuum runs, SKU&nbsp;#42's dead versions become free slots the next stock update reuses; the catalog scan is fast again — no file shrink needed.",
      viz: {
        tuples: [t("#42 v8", "live"), t("free", "reclaimed"), t("free", "reclaimed"), t("#46", "live"), t("#47", "live")],
        metrics: [{ label: "live", val: "3", tone: "good" }, { label: "dead", val: "0", tone: "good" }, { label: "bloat", val: "0%", tone: "good" }, { label: "file size", val: "same" }],
        note: "Dead tuples → reusable free space (FSM + visibility map updated, index entries removed). File size unchanged; space is reusable in place."
      }
    },
    {
      label: "7 · Freezing prevents XID wraparound",
      what: "VACUUM has a second job: <b>freezing</b>. XIDs are 32-bit and wrap around after ~4&nbsp;billion transactions. VACUUM stamps very old tuples as <b>frozen</b> (permanently visible) so they survive the counter wrapping.",
      why: "Without freezing, wraparound would make ancient committed rows suddenly look 'in the future' and vanish. To prevent that, Postgres will force an <b>anti-wraparound</b> vacuum — and, if it still can't keep up, <b>refuse new writes</b> to protect your data.",
      how: "Once a tuple's age exceeds <code>autovacuum_freeze_max_age</code>, an aggressive anti-wraparound VACUUM freezes it. This vacuum is <b>non-cancelable</b> — it must complete, even during peak load.",
      when: "On the oldest tables and rarely-updated rows; monitored via <code>age(datfrozenxid)</code>.",
      mistake: "Ignoring wraparound warnings or cancelling anti-wraparound vacuums repeatedly — the database can hit the wraparound limit and stop accepting writes entirely.",
      interview: "“What is XID wraparound and how is it prevented?” 32-bit XIDs wrap after ~2^31 usable; VACUUM freezes old tuples so they stay visible past the wrap. Falling behind triggers forced anti-wraparound vacuum, then a write-refusing safety stop.",
      example: "A rarely-touched ShopKart <code>archive_orders</code> table nears wraparound; an anti-wraparound autovacuum freezes its old tuples before it can ever refuse writes to the store.",
      viz: {
        tuples: [t("#42 v8", "live"), t("free", "reclaimed"), t("#46", "frozen"), t("#47", "frozen"), t("#48", "live")],
        metrics: [{ label: "table age", val: "180M" }, { label: "freeze max", val: "200M", tone: "bad" }, { label: "frozen", val: "▶", tone: "good" }],
        note: "Old tuples frozen (permanently visible) before the 32-bit XID counter wraps. Anti-wraparound VACUUM is non-cancelable — it always wins."
      }
    }
  ];

  function buildViz(host) {
    host.classList.add("dd-viz");
    var STATE_LABEL = { live: "live", dead: "dead", recent: "live (new)", reclaimed: "free", frozen: "frozen" };
    function tupleCell(tp) {
      var cls = "dd-tuple dd-tuple--" + tp.state + (tp.state === "recent" ? " hot" : "");
      return '<div class="' + cls + '"><b>' + tp.id + "</b> <small>" + (STATE_LABEL[tp.state] || tp.state) + "</small></div>";
    }
    function metricChip(m) {
      var cls = "dd-metric" + (m.tone ? " " + m.tone : "");
      return '<div class="' + cls + '"><span class="dd-metric-val">' + m.val + "</span><span class=\"dd-metric-lbl\">" + m.label + "</span></div>";
    }
    function update(idx, step) {
      var s = step && step.viz;
      if (idx < 0 || !s) {
        host.innerHTML = '<div class="dd-empty">Press <b>Play</b> to watch ShopKart\'s <code>products</code> page fill with dead tuples ' +
          "as sales churn it — then see why VACUUM can (and can’t) reclaim them, and how freezing dodges XID wraparound.</div>";
        return;
      }
      var html = '<div class="dd-section"><div class="dd-section-label">Heap page · products</div>' +
        '<div class="dd-page"><div class="dd-page-hd"><span>page 0</span><span>8 KB</span></div>' +
        '<div class="dd-page-body"><div class="dd-tuples">' + s.tuples.map(tupleCell).join("") + "</div></div></div></div>";
      html += '<div class="dd-section"><div class="dd-section-label">Table health</div>' +
        '<div class="dd-metrics">' + s.metrics.map(metricChip).join("") + "</div></div>";
      if (s.horizon) html += '<div class="dd-verdict warn"><b>xmin horizon pinned.</b> ' + s.horizon + "</div>";
      if (s.note) html += '<div class="dd-note">' + s.note + "</div>";
      host.innerHTML = html;
    }
    return { update: update, destroy: function () { host.innerHTML = ""; host.classList.remove("dd-viz"); } };
  }

  DL.deepDives["vacuum"] = {
    slug: "vacuum",
    overview: {
      what: "<b>VACUUM</b> is the background process that reclaims space held by <b>dead tuples</b> — the old row versions MVCC leaves behind on every UPDATE and DELETE — and <b>freezes</b> old transaction IDs to prevent 32-bit XID wraparound.",
      why: "MVCC never overwrites a row; it appends a new version and marks the old one dead. Without VACUUM those dead versions accumulate forever: tables and indexes bloat, scans slow, the cache fills with corpses, and eventually XID wraparound would threaten the whole database.",
      how: "VACUUM finds dead tuples whose deleting XID is committed and below the <b>xmin horizon</b> (the oldest XID any live snapshot needs), frees their space for reuse, updates the free-space and visibility maps, cleans index entries, and freezes aged tuples. Autovacuum runs it continuously per table."
    },
    steps: STEPS,
    buildViz: buildViz,
    code: {
      title: "Watching bloat, the horizon, and reclamation",
      lang: "sql",
      code:
        "-- How many dead tuples is a table carrying, and when did autovacuum last run?\n" +
        "SELECT relname, n_live_tup, n_dead_tup, last_autovacuum\n" +
        "FROM pg_stat_user_tables ORDER BY n_dead_tup DESC;\n" +
        "\n" +
        "-- What is pinning the xmin horizon (why VACUUM can't reclaim)?\n" +
        "SELECT pid, state, age(backend_xmin), query\n" +
        "FROM pg_stat_activity WHERE backend_xmin IS NOT NULL\n" +
        "ORDER BY age(backend_xmin) DESC;      -- long-open txns at the top\n" +
        "\n" +
        "-- Reclaim space for REUSE (no exclusive lock, file stays same size)\n" +
        "VACUUM (VERBOSE, ANALYZE) products;\n" +
        "\n" +
        "-- Rewrite & SHRINK the file on disk (AccessExclusiveLock — needs a window)\n" +
        "VACUUM FULL products;\n" +
        "\n" +
        "-- Wraparound safety: how close is each database to the limit?\n" +
        "SELECT datname, age(datfrozenxid) FROM pg_database ORDER BY 2 DESC;",
      highlights: [2, 7, 12, 15]
    },
    reference: [
      ["dead tuple", "An old row version superseded by UPDATE/DELETE, not yet reclaimed"],
      ["bloat", "Space held by dead tuples (and empty slots) beyond the live data size"],
      ["xmin horizon", "Oldest XID any live snapshot still needs; VACUUM can't reclaim past it"],
      ["autovacuum", "Background daemon that VACUUMs & ANALYZEs tables when dead tuples cross a threshold"],
      ["FSM", "Free Space Map — tracks reusable space per page for new tuples"],
      ["visibility map", "Marks all-visible pages so scans (and index-only scans) can skip them"],
      ["freezing", "Marking a tuple permanently visible so it survives XID wraparound"],
      ["XID wraparound", "The 32-bit transaction counter cycling; freezing prevents data from 'disappearing'"],
      ["VACUUM FULL", "Rewrites the table to compact it and return space to the OS (exclusive lock)"],
      ["n_dead_tup", "Per-table dead-tuple count that drives the autovacuum threshold"]
    ],
    internals:
      "<p>Plain <code>VACUUM</code> is a lazy, in-place cleaner. It scans the heap (skipping all-visible pages via the <b>visibility map</b>), collects dead-tuple line pointers, removes matching <b>index</b> entries, then reclaims the heap space into the <b>free space map</b> for reuse. It never moves live tuples and rarely returns space to the OS, so it can run concurrently with reads and writes — only a low-priority <code>SHARE UPDATE EXCLUSIVE</code> lock is taken.</p>" +
      "<p>The gate on everything is the <b>xmin horizon</b>. A dead tuple is removable only if the transaction that deleted it is committed and older than the oldest snapshot any session still holds. That horizon is global to reclamation: one <code>idle in transaction</code> backend, one long analytics query, or one stale replication slot (with <code>hot_standby_feedback</code>) freezes it and stalls VACUUM everywhere.</p>" +
      "<p><b>Freezing</b> is the other half. Because XIDs are 32-bit, tuples older than <code>autovacuum_freeze_max_age</code> are stamped frozen (a special always-visible marker) so a wrapped counter can't make them look like future, invisible rows. If freezing falls behind, Postgres escalates to a non-cancelable <b>anti-wraparound</b> vacuum and, at the limit, stops accepting writes — a hard safety stop that has taken down real systems.</p>",
    engineering:
      "<p>VACUUM is where MVCC's convenience turns into an operational discipline. On write-heavy tables, tune autovacuum to run <b>more often on the hot tables</b> — lower <code>autovacuum_vacuum_scale_factor</code> (e.g. 0.02) per table so it fires at 2% dead, not the 20% default — and raise <code>autovacuum_max_workers</code>/<code>autovacuum_vacuum_cost_limit</code> so it can keep pace under load rather than falling permanently behind.</p>" +
      "<p>Guard the horizon: kill or time-out <code>idle in transaction</code> sessions (<code>idle_in_transaction_session_timeout</code>), keep analytics off the OLTP primary or use a replica, and monitor abandoned replication slots. Watch <code>n_dead_tup</code>, table/index bloat, and <code>age(datfrozenxid)</code> as first-class metrics. For a table already badly bloated, reclaim the file with <code>VACUUM FULL</code> in a maintenance window or <code>pg_repack</code> online — plain VACUUM won't shrink it.</p>",
    gotchas: [
      { kind: "warn", html: "<b>A long-open transaction is the #1 bloat cause.</b> It pins the xmin horizon, so VACUUM can't reclaim <i>any</i> dead tuple newer than its snapshot — across every table. Time out <code>idle in transaction</code> sessions." },
      { kind: "tip", html: "<b>Plain VACUUM frees space for reuse; it does not shrink the file.</b> The heap stays the same size on disk but the holes are refilled by new rows. Use <code>VACUUM FULL</code> or <code>pg_repack</code> only when you must return space to the OS." },
      { kind: "info", html: "<b>Never disable autovacuum.</b> Beyond bloat, it's your only defense against XID wraparound — falling behind forces a non-cancelable anti-wraparound vacuum and, at the limit, a write-refusing shutdown." }
    ],
    failureModes:
      "<p><b>Runaway bloat from a pinned horizon:</b> a forgotten <code>idle in transaction</code> session or stale replication slot stops reclamation; tables and indexes balloon and every query slows. <i>Fix:</i> <code>idle_in_transaction_session_timeout</code>, monitor <code>pg_stat_activity.backend_xmin</code> and slot lag.</p>" +
      "<p><b>Autovacuum falling behind:</b> on a hot table the default 20% scale factor lets huge amounts of dead tuples accumulate between runs, and cost limits throttle the worker. <i>Fix:</i> per-table lower scale factor, higher cost limit / more workers.</p>" +
      "<p><b>XID wraparound emergency:</b> freezing falls behind, an anti-wraparound vacuum locks in, and at the limit the database refuses writes. <i>Fix:</i> monitor <code>age(datfrozenxid)</code>; never cancel anti-wraparound vacuums; provision I/O for freezing.</p>" +
      "<p><b>VACUUM FULL outage:</b> reaching for <code>VACUUM FULL</code> on a live table takes an <code>AccessExclusiveLock</code> and blocks all access for the rewrite. <i>Fix:</i> schedule a window, or use <code>pg_repack</code> for an online rebuild.</p>",
    quickCheck: [
      {
        q: "A table's disk file didn't shrink after a plain VACUUM, even though it removed millions of dead tuples. Bug?",
        options: [
          "Yes — VACUUM failed",
          "No — plain VACUUM frees space for reuse in place; only VACUUM FULL shrinks the file",
          "Only VACUUM ANALYZE shrinks files",
          "The dead tuples weren't really dead"
        ],
        answer: 1,
        why: "Plain VACUUM reclaims dead-tuple space into the free space map for reuse by future rows; it doesn't return the space to the OS. VACUUM FULL (or pg_repack) rewrites and shrinks the file, at the cost of an exclusive lock.",
        diff: "easy"
      },
      {
        q: "Autovacuum is running but n_dead_tup keeps climbing on every table. What's the most likely cause?",
        options: [
          "The disk is full",
          "A long-running / idle-in-transaction session is pinning the xmin horizon",
          "Indexes are missing",
          "The tables need REINDEX"
        ],
        answer: 1,
        why: "VACUUM can only remove tuples older than the xmin horizon — the oldest snapshot any live transaction needs. One long-open transaction pins that horizon globally, so dead tuples can't be reclaimed anywhere until it ends.",
        diff: "medium"
      },
      {
        q: "Why does Postgres eventually refuse new writes if freezing falls too far behind?",
        options: [
          "To force a backup",
          "To prevent 32-bit XID wraparound from making old committed rows appear invisible (data loss)",
          "Because the WAL is full",
          "To rebuild the visibility map"
        ],
        answer: 1,
        why: "XIDs are 32-bit and wrap around. If VACUUM hasn't frozen old tuples before the counter laps them, those committed rows would look like they're from the future and vanish. To avoid silent data loss, Postgres stops accepting writes at the wraparound limit.",
        diff: "hard"
      }
    ],
    interviewQs: [
      {
        q: "What is VACUUM, and why does an MVCC database need it?",
        a: "Under MVCC an UPDATE or DELETE never overwrites a row — it writes a new version and marks the old one dead. Those dead tuples keep occupying heap and index space, are still scanned by reads, and fill the buffer cache. VACUUM reclaims that space for reuse: it finds dead tuples whose deleting transaction is committed and older than the xmin horizon, frees their slots into the free space map, removes their index entries, and updates the visibility map. It also freezes old XIDs to prevent wraparound. Autovacuum does this continuously. Without it, tables bloat without bound and eventually wraparound threatens correctness.",
        tip: "Tie it straight back to MVCC: 'VACUUM is the janitor for the versions MVCC leaves behind.'"
      },
      {
        q: "Explain how one idle transaction can bloat an entire database, and how you'd detect it.",
        a: "VACUUM may only remove tuples older than the oldest snapshot any live session still needs — the xmin horizon. A transaction that stays open (even idle-in-transaction, or a long analytics query, or a replication slot with hot_standby_feedback) pins that horizon. Every table's dead tuples that are newer than that snapshot become unreclaimable, so bloat grows everywhere regardless of how hard autovacuum works. To detect it: query pg_stat_activity for the oldest backend_xmin / longest-running or idle-in-transaction sessions, and check replication slot xmin. The fixes are idle_in_transaction_session_timeout, moving analytics to a replica, and cleaning up abandoned slots.",
        tip: "Naming pg_stat_activity.backend_xmin and idle_in_transaction_session_timeout shows real operational experience."
      },
      {
        q: "How would you tune autovacuum for a high-churn table, and what's the difference between VACUUM and VACUUM FULL?",
        a: "For a hot table, make autovacuum fire earlier and work harder: lower autovacuum_vacuum_scale_factor per table (e.g. 0.01–0.05 so it triggers at a few percent dead instead of 20%), possibly a small threshold, and raise the cost limit / worker count so it isn't throttled. Keep transactions short so the horizon advances. VACUUM (plain) is lazy and online — it frees dead-tuple space for reuse within the table under a light lock, but doesn't shrink the file. VACUUM FULL rewrites the whole table into a new file, compacting it and returning space to the OS, but takes an AccessExclusiveLock that blocks all reads and writes — so it needs a maintenance window; pg_repack achieves a similar compaction online.",
        tip: "Lead with 'lower the per-table scale factor' — it's the single most effective knob and the one people forget exists."
      }
    ],
    businessLens: {
      task: "Keep ShopKart's hot products table fast during a flash sale",
      meaning: "Thousands of stock updates per minute must not silently degrade the catalog.",
      system: "OLTP products table (Postgres MVCC)",
      point: "Every stock decrement on a hot SKU leaves a dead tuple, so during a ShopKart flash sale the products heap bloats fast — and catalog scans slow for every shopper at once. Well-tuned autovacuum (a low per-table scale factor) keeps reclaiming that space in the background, but it only works if no long analytics job or idle connection pins the xmin horizon. VACUUM is therefore both a performance lever and a correctness guard: neglect it and the store slows, then — via XID wraparound — eventually stops accepting orders altogether."
    }
  };
})();
