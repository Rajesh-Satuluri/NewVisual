/* ============================================================
   deepdives/mvcc.js — the flagship "airflow-grade" concept.
   Registers DBLab.deepDives['mvcc'] following the deep-dive
   contract that concept.js renders. This is the TEMPLATE every
   other concept deep-dive is authored against.

   Contract (all fields optional except steps + buildViz):
     overview   : { what, why, how }              → Overview tab lead
     steps[]    : { label, what,why,how,when,mistake,interview,example, viz }
                    (7-facet narration; `viz` is opaque state for buildViz)
     buildViz(host) → { update(stepIndex, step), destroy() }   (crisp HTML/SVG)
     code       : { title, lang, code, highlights }  → Internals tab
     reference  : [ [term, meaning], ... ]           → Internals tab
     internals  : html                               → Internals tab prose
     engineering: html                               → Engineering tab
     gotchas    : [ { kind:'tip'|'warn'|'info', html } ]
     failureModes: html                              → Failure tab
     quickCheck : [ { q, options[], answer, why, diff } ]  → Overview tab
     interviewQs: [ { q, a, tip } ]                  → Interview tab
     businessLens: { task, meaning, system, point }  → all tabs footer
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  DL.deepDives = DL.deepDives || {};

  // ── The animated story. Each step is a full snapshot of the scene. ──
  // Scene: ShopKart product #42 stock. T1 reader (xid 103), T2 writer (xid 105),
  // T3 later reader (xid 110). Versions carry {v, val, xmin, xmax}.
  var STEPS = [
    {
      label: "1 · One row, one version",
      what: "ShopKart's <code>products</code> row for SKU&nbsp;#42 currently has <code>stock = 100</code>. Internally it's a single <b>tuple version</b> stamped <code>xmin = 100</code> (the transaction that inserted it) and <code>xmax = ∅</code> (nobody has superseded it yet).",
      why: "MVCC's whole model rests on this: a row isn't a cell you overwrite — it's an append-only chain of versions, each tagged with the transaction IDs that make it visible or dead. That tagging is what lets many transactions see different <i>consistent</i> states of the same row at once.",
      how: "Every tuple stores two system columns: <code>xmin</code> = inserting XID, <code>xmax</code> = deleting/updating XID. A visibility check compares those against a transaction's <b>snapshot</b> to decide 'can I see this version?'",
      when: "Always — this is the on-disk shape of every row in Postgres, Oracle, and MySQL-InnoDB.",
      mistake: "Picturing an UPDATE as editing bytes in place. It never does under MVCC — it writes a <i>new</i> version and leaves the old one behind.",
      interview: "“What physically is a row in an MVCC database?” A chain of immutable tuple versions, each with <code>xmin</code>/<code>xmax</code> — not a mutable record.",
      example: "SKU #42 (a popular ShopKart charger) sits at 100 units, version v1, inserted by XID 100.",
      viz: {
        txns: [],
        vers: [{ v: "v1", val: 100, xmin: 100, xmax: null, state: "live" }],
        hot: ["v1"]
      }
    },
    {
      label: "2 · A reader takes a snapshot",
      what: "Transaction <b>T1</b> begins at <code>XID 103</code> and runs <code>SELECT stock … WHERE sku = 42</code>. It captures a <b>snapshot</b> — the set of transactions committed as of this instant — and reads <code>stock = 100</code> from v1.",
      why: "The snapshot is the heart of snapshot isolation: T1 will see the database exactly as it was at this moment for its whole life, no matter who commits later. Consistent reads with zero read locks.",
      how: "v1 is visible to T1 because <code>xmin(100)</code> is committed and ≤ the snapshot, and <code>xmax</code> is empty. No lock is taken — the read is satisfied purely by visibility rules.",
      when: "Every <code>SELECT</code>. Under <code>REPEATABLE READ</code> the snapshot is taken once at BEGIN; under <code>READ COMMITTED</code> a fresh snapshot is taken per statement.",
      mistake: "Assuming a plain <code>SELECT</code> locks rows. It doesn't — readers never block, and are never blocked, in MVCC.",
      interview: "“How does a SELECT get a consistent view without locks?” It reads against a snapshot and applies per-tuple visibility — <code>xmin</code>/<code>xmax</code> vs the snapshot.",
      example: "A ShopKart analytics query (T1) opens to count sellable stock; it snapshots at XID 103 and sees 100.",
      viz: {
        txns: [{ id: "T1", role: "reader", xid: 103, status: "active", sees: "v1", seesVal: 100 }],
        vers: [{ v: "v1", val: 100, xmin: 100, xmax: null, state: "live" }],
        hot: ["v1"]
      }
    },
    {
      label: "3 · A writer creates a new version",
      what: "Concurrently, <b>T2</b> (<code>XID 105</code>) runs <code>UPDATE products SET stock = 90 …</code>. MVCC does <b>not</b> overwrite v1. It writes a new tuple <b>v2</b> (<code>stock=90, xmin=105</code>) and stamps the old version <code>v1.xmax = 105</code>.",
      why: "Keeping the old version alive is exactly what lets T1's in-flight read stay valid. The writer moves forward by <i>appending</i>, so it never has to wait for readers of the old value.",
      how: "UPDATE = INSERT the new tuple + set <code>xmax</code> on the old one to the writer's XID. v1 is now 'superseded by 105' but not yet dead — a snapshot older than 105 must still see it.",
      when: "Every <code>UPDATE</code> and <code>DELETE</code> (a DELETE just sets <code>xmax</code> with no new tuple).",
      mistake: "Thinking the UPDATE frees the old row immediately. It can't — other snapshots may still need v1, so cleanup is deferred to VACUUM.",
      interview: "“What does UPDATE do to the tuple chain?” Inserts a new version and sets the previous version's <code>xmax</code> to the updating XID — copy-on-write, not in-place.",
      example: "A ShopKart checkout (T2) decrements stock to 90; v2 is born, v1 is marked superseded by XID 105.",
      viz: {
        txns: [
          { id: "T1", role: "reader", xid: 103, status: "active", sees: "v1", seesVal: 100 },
          { id: "T2", role: "writer", xid: 105, status: "active", sees: "v2", seesVal: 90 }
        ],
        vers: [
          { v: "v1", val: 100, xmin: 100, xmax: 105, state: "superseded" },
          { v: "v2", val: 90, xmin: 105, xmax: null, state: "uncommitted" }
        ],
        hot: ["v1", "v2"]
      }
    },
    {
      label: "4 · Readers don't block writers",
      what: "T1 reads the row again — and still sees <code>stock = 100</code> (v1). T2's write did not make T1 wait, and T1's open read did not make T2 wait. Both ran to this point with <b>no lock contention</b>.",
      why: "This is MVCC's headline property. In a lock-based system T1's read lock would have blocked T2's write (or vice-versa). With versions, each side operates on its own visible tuple, so read/write concurrency is essentially free.",
      how: "Visibility for T1 (snapshot 103): v2 has <code>xmin=105 &gt; 103</code> and is uncommitted → invisible. v1 has <code>xmax=105</code>, but 105 is <b>not</b> in T1's snapshot → v1 is still visible. T1 keeps seeing 100.",
      when: "Whenever reads and writes on the same rows overlap in time — the common case in any busy OLTP system.",
      mistake: "Expecting 'lost updates' or dirty reads here. T1 never sees T2's uncommitted 90 — no dirty read — and T2 never blocks on T1.",
      interview: "The classic line: <b>“readers don't block writers and writers don't block readers.”</b> Be ready to explain <i>why</i> — separate versions + snapshot visibility.",
      example: "The ShopKart analytics query and the live checkout run at the same millisecond and neither slows the other; the report reads 100 while the sale writes 90.",
      viz: {
        txns: [
          { id: "T1", role: "reader", xid: 103, status: "active", sees: "v1", seesVal: 100, badge: "no wait" },
          { id: "T2", role: "writer", xid: 105, status: "active", sees: "v2", seesVal: 90, badge: "no wait" }
        ],
        vers: [
          { v: "v1", val: 100, xmin: 100, xmax: 105, state: "superseded" },
          { v: "v2", val: 90, xmin: 105, xmax: null, state: "uncommitted" }
        ],
        hot: ["v1"]
      }
    },
    {
      label: "5 · The writer commits",
      what: "T2 runs <code>COMMIT</code>. XID 105 is now recorded as committed. v2 (<code>stock=90</code>) becomes the current version for anyone whose snapshot includes 105.",
      why: "Commit is a metadata flip, not a data rewrite — MVCC makes commit cheap because the new version is already written. Durability comes from the WAL record; visibility comes from marking 105 committed.",
      how: "The commit status of 105 lands in the commit log (pg_xact / clog). Future snapshots that include 105 will now treat v2 as visible and v1 as dead.",
      when: "At every successful <code>COMMIT</code>.",
      mistake: "Assuming already-open transactions instantly 'see' the commit. They don't — a snapshot taken before the commit is frozen (next step).",
      interview: "“Why is COMMIT fast in MVCC even for a big UPDATE?” The versions are already written; commit just flips XID 105's status — the work happened during the UPDATE.",
      example: "The ShopKart sale is finalized; XID 105 is committed and 90 is now the official stock for new readers.",
      viz: {
        txns: [
          { id: "T1", role: "reader", xid: 103, status: "active", sees: "v1", seesVal: 100 },
          { id: "T2", role: "writer", xid: 105, status: "committed", sees: "v2", seesVal: 90 }
        ],
        vers: [
          { v: "v1", val: 100, xmin: 100, xmax: 105, state: "dead-pending" },
          { v: "v2", val: 90, xmin: 105, xmax: null, state: "live" }
        ],
        hot: ["v2"]
      }
    },
    {
      label: "6 · Snapshots stay isolated",
      what: "A brand-new reader <b>T3</b> (<code>XID 110</code>) sees <code>stock = 90</code> (v2). But T1 — still open on its snapshot 103 — reads the row again and <b>still sees 100</b> (v1). Two transactions, same row, two consistent answers.",
      why: "This is repeatable, non-phantom reads for free: T1's world is frozen at BEGIN, so its results never shift under it, even as the row visibly changes for everyone who started later.",
      how: "T3's snapshot (110) includes committed XID 105 → v2 visible, v1 dead. T1's snapshot (103) excludes 105 → v1 still visible. The version chain serves both truths simultaneously.",
      when: "Under <code>REPEATABLE READ</code>/<code>SERIALIZABLE</code>, T1 holds one snapshot for its lifetime. Under <code>READ COMMITTED</code>, T1's <i>next statement</i> would take a fresh snapshot and then see 90.",
      mistake: "Confusing isolation levels: READ COMMITTED would let T1 see 90 on its next statement; only REPEATABLE READ keeps it pinned at 100.",
      interview: "“Two transactions read the same row and get different values — bug or feature?” Feature: snapshot isolation. Then name the isolation level that produces each behavior.",
      example: "ShopKart's long analytics run (T1) keeps reporting the day's opening figure while the storefront (T3) already shows the updated stock.",
      viz: {
        txns: [
          { id: "T1", role: "reader", xid: 103, status: "active", sees: "v1", seesVal: 100, badge: "snapshot 103" },
          { id: "T3", role: "reader", xid: 110, status: "active", sees: "v2", seesVal: 90, badge: "snapshot 110" }
        ],
        vers: [
          { v: "v1", val: 100, xmin: 100, xmax: 105, state: "dead-pending" },
          { v: "v2", val: 90, xmin: 105, xmax: null, state: "live" }
        ],
        hot: ["v1", "v2"]
      }
    },
    {
      label: "7 · VACUUM reclaims dead versions",
      what: "Once no active snapshot is older than XID 105 (T1 has finally ended), v1 is <b>dead to everyone</b>. <code>VACUUM</code> reclaims its space so the page can be reused. Until then it was <b>bloat</b>.",
      why: "Append-on-write has a cost: superseded versions pile up. VACUUM is the janitor that keeps tables from growing without bound — and its timing is gated by the oldest open snapshot.",
      how: "VACUUM (usually autovacuum) computes the <b>xmin horizon</b> — the oldest XID any live snapshot still needs — and removes tuples whose <code>xmax</code> is committed and below it. v1 (<code>xmax=105</code>) qualifies once nothing needs snapshot &lt; 105.",
      when: "Continuously via autovacuum; manually before/after big batch churn.",
      mistake: "Leaving a transaction open for hours. It <b>pins the xmin horizon</b>, so VACUUM can't reclaim anything newer — dead tuples accumulate and tables bloat.",
      interview: "“Why does one idle-in-transaction connection bloat the whole database?” It holds back the xmin horizon, blocking VACUUM from reclaiming dead tuples across every table.",
      example: "After ShopKart's analytics run ends, autovacuum reclaims v1 for SKU #42; if that run had hung open all day, dead versions would have piled up and slowed the storefront.",
      viz: {
        txns: [],
        vers: [
          { v: "v1", val: 100, xmin: 100, xmax: 105, state: "reclaimed" },
          { v: "v2", val: 90, xmin: 105, xmax: null, state: "live" }
        ],
        hot: ["v2"]
      }
    }
  ];

  // ── The crisp HTML visualization (DPR-independent, reflows, theme-aware). ──
  function buildViz(host) {
    host.classList.add("mvcc-viz");

    function verCard(ver, hot) {
      var cls = "mvcc-ver mvcc-ver--" + ver.state + (hot ? " hot" : "");
      var xmax = ver.xmax == null ? "∅" : ver.xmax;
      var stateLabel = {
        "live": "current", "uncommitted": "uncommitted", "superseded": "superseded",
        "dead-pending": "dead (pending)", "reclaimed": "reclaimed"
      }[ver.state] || ver.state;
      return (
        '<div class="' + cls + '">' +
          '<div class="mvcc-ver-top"><span class="mvcc-ver-name">' + ver.v + "</span>" +
            '<span class="mvcc-ver-state">' + stateLabel + "</span></div>" +
          '<div class="mvcc-ver-val">stock = <b>' + ver.val + "</b></div>" +
          '<div class="mvcc-ver-meta"><span>xmin <code>' + ver.xmin + "</code></span>" +
            '<span>xmax <code>' + xmax + "</code></span></div>" +
        "</div>"
      );
    }

    function txnCard(t) {
      var cls = "mvcc-txn mvcc-txn--" + t.role + " " + (t.status === "committed" ? "committed" : "active");
      return (
        '<div class="' + cls + '">' +
          '<div class="mvcc-txn-top"><span class="mvcc-txn-id">' + t.id + "</span>" +
            '<span class="mvcc-txn-role">' + t.role + "</span></div>" +
          '<div class="mvcc-txn-xid">XID <code>' + t.xid + "</code> · " + t.status + "</div>" +
          '<div class="mvcc-txn-sees">sees <b>' + t.sees + "</b> → stock " + t.seesVal + "</div>" +
          (t.badge ? '<div class="mvcc-txn-badge">' + t.badge + "</div>" : "") +
        "</div>"
      );
    }

    function update(idx, step) {
      var s = step && step.viz;
      if (idx < 0 || !s) {
        host.innerHTML =
          '<div class="mvcc-empty">Press <b>Play</b> to watch a reader and a writer hit the same ShopKart row ' +
          "concurrently — and see why neither one waits.</div>";
        return;
      }
      var hotset = {}; (s.hot || []).forEach(function (h) { hotset[h] = 1; });
      var txnsHtml = s.txns.length
        ? '<div class="mvcc-txns">' + s.txns.map(txnCard).join("") + "</div>"
        : '<div class="mvcc-txns mvcc-txns--empty">No open transactions on this row.</div>';
      var versHtml = '<div class="mvcc-chain-label">Version chain — SKU&nbsp;#42</div>' +
        '<div class="mvcc-chain">' + s.vers.map(function (v) { return verCard(v, hotset[v.v]); }).join(
          '<span class="mvcc-chain-arrow">→</span>'
        ) + "</div>";
      host.innerHTML = txnsHtml + versHtml;
    }

    return { update: update, destroy: function () { host.innerHTML = ""; host.classList.remove("mvcc-viz"); } };
  }

  DL.deepDives["mvcc"] = {
    slug: "mvcc",
    overview: {
      what: "MVCC (Multi-Version Concurrency Control) lets many transactions read and write the same rows at the same time without blocking each other, by keeping <b>multiple versions</b> of every row instead of overwriting it in place.",
      why: "Without it, a busy database serializes readers and writers with locks — an analytics query would freeze the checkout that touches the same product. MVCC is why Postgres, Oracle, and MySQL-InnoDB stay fast under mixed read/write load.",
      how: "Each row version carries the transaction IDs that created (<code>xmin</code>) and superseded (<code>xmax</code>) it. A transaction reads against a <b>snapshot</b> and applies visibility rules to pick the right version — so everyone sees a consistent point-in-time without read locks."
    },
    steps: STEPS,
    buildViz: buildViz,
    code: {
      title: "Two concurrent transactions on the same row",
      lang: "sql",
      code:
        "-- Session A (reader, REPEATABLE READ)        -- Session B (writer)\n" +
        "BEGIN ISOLATION LEVEL REPEATABLE READ;\n" +
        "SELECT stock FROM products WHERE sku = 42;   -- 100 (snapshot pinned here)\n" +
        "                                             BEGIN;\n" +
        "                                             UPDATE products SET stock = 90\n" +
        "                                               WHERE sku = 42;   -- writes v2\n" +
        "                                             COMMIT;             -- v2 committed\n" +
        "SELECT stock FROM products WHERE sku = 42;   -- STILL 100 (frozen snapshot)\n" +
        "COMMIT;\n" +
        "-- A new transaction now sees 90. VACUUM later reclaims the old version.",
      highlights: [3, 6, 8]
    },
    reference: [
      ["xmin", "XID of the transaction that inserted this tuple version"],
      ["xmax", "XID that deleted/updated it (∅ if still current)"],
      ["snapshot", "The set of committed XIDs a transaction can 'see' — its consistent point in time"],
      ["visibility", "A version is visible if xmin is committed & in-snapshot and xmax is not"],
      ["dead tuple", "A version no snapshot needs any more — awaiting VACUUM"],
      ["xmin horizon", "Oldest XID any live snapshot still needs; VACUUM can't reclaim past it"],
      ["VACUUM", "Reclaims dead tuples; autovacuum runs it continuously"],
      ["bloat", "Space held by dead tuples not yet reclaimed"]
    ],
    internals:
      "<p>Under MVCC an <code>UPDATE</code> is physically an <b>INSERT of a new tuple plus a stamp on the old one</b> — never an in-place edit. That single design choice cascades into everything else: cheap commits (the version is already written), lock-free reads (visibility, not locks), and the need for VACUUM (someone must eventually reclaim superseded versions).</p>" +
      "<p>Visibility is the core routine. For a tuple to be visible to a snapshot: its <code>xmin</code> must be committed and included in the snapshot, and its <code>xmax</code> must be empty, aborted, or <i>not</i> in the snapshot. Every row a query returns has passed this check tuple-by-tuple.</p>" +
      "<p>Isolation levels are just <i>when you take the snapshot</i>: <code>READ COMMITTED</code> takes a fresh one per statement; <code>REPEATABLE READ</code> takes one at BEGIN and holds it; <code>SERIALIZABLE</code> adds predicate tracking (SSI) on top to catch write-skew.</p>",
    engineering:
      "<p>MVCC shapes real operational decisions. Because superseded versions linger until VACUUM, <b>write-heavy tables bloat</b> and need healthy autovacuum tuning. Because the <b>xmin horizon</b> is pinned by the oldest open snapshot, a single <code>idle in transaction</code> connection can stop VACUUM across the entire database.</p>" +
      "<p>Design implications: keep transactions short; never leave one open while waiting on app logic or user input; watch <code>n_dead_tup</code> and autovacuum lag; and remember that <code>SELECT</code> is free of locks but <code>UPDATE</code>/<code>DELETE</code>/<code>SELECT … FOR UPDATE</code> still take row locks that serialize <i>writers</i> on the same row (first-updater-wins).</p>",
    gotchas: [
      { kind: "tip", html: "<b>Readers never block and are never blocked.</b> If a <code>SELECT</code> is waiting, it's on a lock from an explicit <code>FOR UPDATE</code>/<code>FOR SHARE</code> or DDL — not from ordinary MVCC reads." },
      { kind: "warn", html: "<b>Long-running transactions are the #1 MVCC footgun.</b> They pin the xmin horizon so VACUUM can't reclaim dead tuples anywhere — tables bloat and queries slow across the whole cluster." },
      { kind: "info", html: "<b>MVCC does not prevent write-write conflicts.</b> Two transactions updating the same row still serialize (the second waits, then re-checks). Snapshot isolation also permits <i>write skew</i> — only <code>SERIALIZABLE</code> (SSI) rules it out." }
    ],
    failureModes:
      "<p><b>Table bloat &amp; vacuum starvation:</b> heavy churn plus a long-open transaction lets dead tuples accumulate; the table grows, cache hit-rate drops, and scans slow. Fix: short transactions, autovacuum tuning, occasionally <code>VACUUM (FULL)</code> in a window.</p>" +
      "<p><b>Transaction ID wraparound:</b> XIDs are 32-bit; if VACUUM can't freeze old tuples fast enough the database will refuse writes to protect itself. Fix: never disable autovacuum; monitor <code>age(datfrozenxid)</code>.</p>" +
      "<p><b>Write skew under REPEATABLE READ:</b> two transactions each read a consistent snapshot and make decisions that are individually valid but jointly break an invariant (e.g. both approve the last two on-call swaps). Fix: <code>SERIALIZABLE</code>, or an explicit lock / constraint.</p>",
    quickCheck: [
      {
        q: "T1 (snapshot XID 103, REPEATABLE READ) is open. T2 updates the row from 100→90 and commits at XID 105. What does T1 read next?",
        options: ["90 — it sees the latest committed value", "100 — its snapshot excludes XID 105", "It blocks until T1 commits", "An error: the row changed under it"],
        answer: 1,
        why: "Under REPEATABLE READ, T1's snapshot is frozen at BEGIN. XID 105 is not in it, so v1 (100) is still the visible version. No block, no error.",
        diff: "medium"
      },
      {
        q: "Physically, what does an UPDATE do to a row's tuple chain under MVCC?",
        options: ["Overwrites the tuple in place", "Locks the page and edits the bytes", "Inserts a new version and sets the old version's xmax", "Deletes the row and re-inserts it in a new page"],
        answer: 2,
        why: "UPDATE = INSERT a new tuple (new xmin) + stamp the old tuple's xmax with the updating XID. The old version survives for snapshots that still need it.",
        diff: "easy"
      },
      {
        q: "Why can one connection left 'idle in transaction' bloat every table in the database?",
        options: ["It holds a global write lock", "It pins the xmin horizon so VACUUM can't reclaim dead tuples", "It fills the WAL", "It disables autovacuum"],
        answer: 1,
        why: "VACUUM can only reclaim tuples older than the oldest snapshot any live transaction needs. An open transaction pins that horizon, blocking reclamation across all tables.",
        diff: "hard"
      }
    ],
    interviewQs: [
      {
        q: "Explain how MVCC lets readers and writers not block each other.",
        a: "Instead of overwriting rows, the database keeps multiple versions, each tagged with xmin (creating XID) and xmax (superseding XID). A reader takes a snapshot and, per tuple, checks visibility against it — so it reads the version that was current as of its snapshot without taking any lock. A concurrent writer appends a new version and stamps the old one's xmax; it never has to wait for the reader, and the reader keeps seeing the old version. The two operate on different tuple versions of the same logical row, so read/write concurrency doesn't require mutual exclusion.",
        tip: "Say the sentence — 'readers don't block writers and writers don't block readers' — then immediately justify it with versions + snapshot visibility, or it sounds memorized."
      },
      {
        q: "What is the cost of MVCC, and how is it managed?",
        a: "Because updates append new versions rather than overwriting, superseded ('dead') versions accumulate — table and index bloat. They're reclaimed by VACUUM (typically autovacuum), which can only remove tuples older than the xmin horizon: the oldest XID any live snapshot still needs. So the cost is (1) storage/bloat, (2) vacuum overhead, and (3) sensitivity to long-running transactions, which pin the horizon and stall reclamation. It's managed by keeping transactions short, tuning autovacuum, monitoring dead-tuple counts and XID age, and guarding against transaction-ID wraparound.",
        tip: "Interviewers love the follow-up 'why does a long transaction hurt an unrelated table?' — answer: the shared xmin horizon."
      },
      {
        q: "Does MVCC give you serializability? Where does it fall short?",
        a: "Plain snapshot isolation (Postgres REPEATABLE READ) prevents dirty reads, non-repeatable reads, and phantoms, but it is NOT serializable — it permits write skew, where two transactions each read a consistent snapshot and commit changes that are individually valid but jointly violate an invariant. Postgres SERIALIZABLE adds Serializable Snapshot Isolation (SSI): it tracks read/write dependencies and aborts one transaction of a dangerous cycle. Alternatively you enforce the invariant with an explicit lock (SELECT … FOR UPDATE) or a constraint.",
        tip: "Have a concrete write-skew example ready (on-call scheduling, doctor-on-shift, bank overdraft across two accounts)."
      }
    ],
    businessLens: {
      task: "storefront checkout vs. nightly analytics on products.stock",
      meaning: "Sell in real time while reports read a consistent snapshot.",
      system: "OLTP products table (Postgres)",
      point: "ShopKart's storefront updates <code>stock</code> on every sale while an analytics job scans the same table for the morning report. Under MVCC the report reads a consistent snapshot (no half-applied sales, no dirty reads) and never locks out a single checkout — the two workloads share one table without fighting. The price ShopKart pays is bloat: the analytics job must stay short, or dead versions pile up and slow the storefront."
    }
  };
})();
