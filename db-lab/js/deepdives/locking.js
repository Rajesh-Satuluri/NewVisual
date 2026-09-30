/* ============================================================
   deepdives/locking.js — "Locking & Deadlocks" deep dive.
   Registers DBLab.deepDives['locking'] (concept m49).
   Authored against the contract documented in deepdives/mvcc.js.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  DL.deepDives = DL.deepDives || {};

  var A = "products/42", B = "products/99";

  // Scene: two ShopKart stock transfers that lock the same two rows in
  // OPPOSITE order → a textbook deadlock → detector aborts a victim.
  var STEPS = [
    {
      label: "1 · Why write locks exist",
      what: "Two rows: <code>products/42</code> and <code>products/99</code>. When a transaction updates a row, it takes an <b>exclusive (X) lock</b> on it. A second writer of the same row must <b>wait</b> until the first releases.",
      why: "Without locks, two concurrent <code>UPDATE stock = stock - 1</code> could both read 100, both write 99, and one decrement is lost. The X lock <b>serializes writers</b> on a row so updates compose correctly.",
      how: "The lock manager keeps a table keyed by resource. Acquiring an X lock on a free row succeeds instantly; acquiring it on a held row enqueues the requester as a waiter.",
      when: "Every <code>UPDATE</code>, <code>DELETE</code>, and <code>SELECT … FOR UPDATE</code> takes a row lock. Plain <code>SELECT</code> under MVCC does not.",
      mistake: "Thinking MVCC removes all locks. It removes <i>read</i> locks — writers still lock rows, and that's exactly where deadlocks come from.",
      interview: "“What does a write lock protect against?” Lost updates and torn interleavings — it serializes concurrent writers on the same row.",
      example: "A ShopKart admin adjusting SKU #42's stock briefly holds an X lock on that row; a second adjustment to #42 waits its turn.",
      viz: { actors: [
          { id: "T1", tag: "transfer 42→99", holds: [], wants: null, state: "active" },
          { id: "T2", tag: "transfer 99→42", holds: [], wants: null, state: "active" }
        ], locks: [{ res: A, holder: null, waiters: [] }, { res: B, holder: null, waiters: [] }], wfg: null,
        note: "Both rows are free. Two transfers are about to lock them — watch the order each uses." }
    },
    {
      label: "2 · T1 locks row 42",
      what: "Transaction <b>T1</b> begins a transfer of 1 unit from SKU #42 to #99. Its first write locks <code>products/42</code> with an X lock.",
      why: "Under <b>two-phase locking (2PL)</b>, a transaction only <i>acquires</i> locks in its first ('growing') phase and holds them until commit — never releasing early. That's what makes its schedule equivalent to running alone (serializable).",
      how: "T1's <code>UPDATE products SET stock = stock - 1 WHERE sku = 42</code> takes and holds the X lock on row 42. It will grab its next lock before releasing this one.",
      when: "As soon as a transaction issues its first write to a row.",
      mistake: "Releasing a lock as soon as you're 'done' with a row. Strict 2PL holds all locks to commit; early release can expose uncommitted data and break serializability.",
      interview: "“What are the two phases in 2PL?” Growing (acquire locks, release none) then shrinking (release locks, acquire none) — strict 2PL puts the entire shrink at commit.",
      example: "T1 (admin bulk transfer) locks SKU #42 to debit a unit from it.",
      viz: { actors: [
          { id: "T1", tag: "transfer 42→99", holds: [A], wants: null, state: "active" },
          { id: "T2", tag: "transfer 99→42", holds: [], wants: null, state: "active" }
        ], locks: [{ res: A, holder: "T1", waiters: [] }, { res: B, holder: null, waiters: [] }], wfg: null,
        note: "T1 holds products/42 (growing phase). It will need products/99 next." }
    },
    {
      label: "3 · T2 locks row 99 — opposite order",
      what: "Concurrently, <b>T2</b> transfers 1 unit the other way — #99 to #42 — and its first write locks <code>products/99</code>. No conflict yet: the two transactions hold <i>different</i> rows.",
      why: "This is the setup for disaster. Each transaction is individually fine, but they're acquiring the same two rows in <b>opposite orders</b>. Nothing has gone wrong — yet the seeds of a cycle are planted.",
      how: "T2's <code>UPDATE products SET stock = stock - 1 WHERE sku = 99</code> takes the X lock on row 99. Both transactions are still 'active', each holding one lock.",
      when: "Whenever two code paths touch an overlapping set of rows without agreeing on an order.",
      mistake: "Assuming 'they lock different rows, so we're safe'. Safety depends on the <i>order</i> they'll acquire the <i>next</i> lock, not the current state.",
      interview: "“When is a deadlock guaranteed to be possible?” When two transactions can acquire the same resources in different orders.",
      example: "A second ShopKart admin action (T2) locks SKU #99 to debit a unit from it — unaware T1 already holds #42.",
      viz: { actors: [
          { id: "T1", tag: "transfer 42→99", holds: [A], wants: null, state: "active" },
          { id: "T2", tag: "transfer 99→42", holds: [B], wants: null, state: "active" }
        ], locks: [{ res: A, holder: "T1", waiters: [] }, { res: B, holder: "T2", waiters: [] }], wfg: null,
        note: "T1 holds 42, T2 holds 99 — opposite order. Still no contention… for one more step." }
    },
    {
      label: "4 · T1 waits for row 99",
      what: "T1's second write needs <code>products/99</code> — but T2 holds it. T1 <b>blocks</b>, joining the wait queue for row 99. In the wait-for graph, an edge appears: <b>T1 → T2</b>.",
      why: "T1 can't release row 42 (2PL forbids early release) and can't proceed without row 99. It's stuck holding one lock and waiting on another — the first half of a cycle.",
      how: "The lock manager sees row 99 is held by T2, enqueues T1 as a waiter, and suspends T1. A wait-for edge T1→T2 records 'T1 is blocked on a lock T2 holds'.",
      when: "Any time a transaction requests a lock currently held by another.",
      mistake: "Expecting T1 to 'time out and move on'. It won't move on — it waits (until a timeout or the deadlock detector acts), holding its own lock the whole time.",
      interview: "“What is a wait-for graph?” Nodes are transactions; an edge X→Y means X is waiting for a lock Y holds. A cycle in it means deadlock.",
      example: "T1 (holding SKU #42) now needs SKU #99 to credit it — but T2 has #99. T1 freezes.",
      viz: { actors: [
          { id: "T1", tag: "transfer 42→99", holds: [A], wants: B, state: "waiting" },
          { id: "T2", tag: "transfer 99→42", holds: [B], wants: null, state: "active" }
        ], locks: [{ res: A, holder: "T1", waiters: [] }, { res: B, holder: "T2", waiters: ["T1"], contended: true }],
        wfg: { edges: [["T1", "T2"]], deadlock: false }, note: "T1 → T2: T1 is blocked on row 99, which T2 holds." }
    },
    {
      label: "5 · T2 waits for row 42 — cycle!",
      what: "T2's second write needs <code>products/42</code> — held by T1. T2 blocks too. Now the wait-for graph has <b>T1 → T2</b> <i>and</i> <b>T2 → T1</b>: a cycle. This is a <b>deadlock</b> — neither can ever proceed.",
      why: "Each transaction holds exactly what the other needs and will never voluntarily release it. Left alone, both would wait forever, and every new transaction needing either row would pile up behind them.",
      how: "The lock manager enqueues T2 on row 42 and adds edge T2→T1. A cycle now exists in the wait-for graph — the formal definition of deadlock.",
      when: "The instant the last edge closes a cycle among blocked transactions.",
      mistake: "Believing the database will silently sort it out with no cost. It resolves it — by <b>aborting</b> one of them, which your application must be ready to retry.",
      interview: "“Define deadlock precisely.” A set of transactions each holding a lock the next one in the set is waiting for — a cycle in the wait-for graph.",
      example: "Both ShopKart admin transfers are now frozen against each other; the storefront's own writes to these SKUs would queue behind them.",
      viz: { actors: [
          { id: "T1", tag: "transfer 42→99", holds: [A], wants: B, state: "waiting" },
          { id: "T2", tag: "transfer 99→42", holds: [B], wants: A, state: "waiting" }
        ], locks: [{ res: A, holder: "T1", waiters: ["T2"], contended: true }, { res: B, holder: "T2", waiters: ["T1"], contended: true }],
        wfg: { edges: [["T1", "T2"], ["T2", "T1"]], deadlock: true }, note: "T1 ⇄ T2 — a cycle. Deadlock: neither will ever make progress." }
    },
    {
      label: "6 · Detection picks a victim",
      what: "The database's <b>deadlock detector</b> runs, finds the cycle, and chooses a <b>victim</b> — usually the transaction that's cheaper to roll back (say <b>T2</b>). T2 is aborted with a 'deadlock detected' error and all its locks are released.",
      why: "Breaking the cycle requires sacrificing one transaction. Aborting T2 frees row 99, which unblocks T1. One transaction pays with a rollback so the system as a whole makes progress.",
      how: "Postgres periodically searches the wait-for graph for cycles (after <code>deadlock_timeout</code>); on finding one it cancels a victim. Some engines use lock timeouts as a coarser substitute. T2's locks vanish and it receives an error.",
      when: "Shortly after a cycle forms — detection is periodic, not instantaneous, so a brief hang precedes the abort.",
      mistake: "Not handling the victim's error. A 'deadlock detected' is a normal, expected outcome under contention — the losing transaction must be retried, not crashed.",
      interview: "“How is a deadlock resolved?” The engine detects the cycle (or times out) and aborts a victim to break it; the application retries the aborted transaction.",
      example: "ShopKart's DB aborts T2 (the later/cheaper transfer); the admin who issued it sees a retryable error, while T1 is freed to continue.",
      viz: { actors: [
          { id: "T1", tag: "transfer 42→99", holds: [A], wants: B, state: "waiting" },
          { id: "T2", tag: "transfer 99→42", holds: [], wants: null, state: "aborted" }
        ], locks: [{ res: A, holder: "T1", waiters: [] }, { res: B, holder: null, waiters: ["T1"], contended: false }],
        wfg: { edges: [], deadlock: false, victim: "T2" }, note: "Victim T2 aborted → its locks released → the cycle is broken." }
    },
    {
      label: "7 · Survivor commits; retry & the fix",
      what: "T1 acquires <code>products/99</code>, finishes its transfer, and <code>COMMIT</code>s — releasing all its locks (2PL's shrinking phase). T2 is retried and, with T1 gone, sails through. Throughput restored.",
      why: "The real lesson is prevention: this deadlock existed only because the two transactions acquired the rows in <b>different orders</b>. Impose a <b>consistent lock order</b> (e.g. always lock the lower SKU first) and the cycle can never form.",
      how: "Strict 2PL releases T1's locks atomically at commit. On retry, T2 locks row 42 then row 99 — if both transactions always ascend by SKU, one simply waits briefly for the other and no cycle is possible.",
      when: "Deadlock-prone code should both (a) enforce a global lock ordering and (b) wrap transactions in a retry-on-deadlock loop with backoff.",
      mistake: "Fixing a deadlock by adding retries alone. Retries handle the symptom; consistent ordering removes the cause. Do both.",
      interview: "“How do you eliminate a recurring deadlock?” Make every transaction acquire the shared resources in the same order; keep transactions short; retry victims with backoff.",
      example: "ShopKart changes both admin flows to always update SKUs in ascending order; the transfers now queue politely instead of deadlocking.",
      viz: { actors: [
          { id: "T1", tag: "transfer 42→99", holds: [], wants: null, state: "committed" },
          { id: "T2", tag: "retried", holds: [], wants: null, state: "active" }
        ], locks: [{ res: A, holder: null, waiters: [] }, { res: B, holder: null, waiters: [] }],
        wfg: { edges: [], deadlock: false, victim: "T2", survivor: "T1" },
        note: "T1 committed & released all locks. T2 retries successfully. Consistent lock ordering prevents the whole class." }
    }
  ];

  function buildViz(host) {
    host.classList.add("dd-viz");
    function actorCard(a) {
      var cls = "dd-actor dd-actor--" + (a.id === "T1" ? "a" : "b");
      if (a.state === "committed") cls += " is-committed";
      else if (a.state === "aborted") cls += " is-aborted";
      else if (a.state === "waiting") cls += " is-waiting hot";
      var holds = a.holds && a.holds.length ? a.holds.map(function (h) { return "<code>" + h + "</code>"; }).join(" ") : "—";
      var body = "holds " + holds;
      if (a.wants) body += "<br>waiting on <code>" + a.wants + "</code>";
      var stChip = { active: '<span class="dd-chip dd-chip--info">active</span>',
        waiting: '<span class="dd-chip dd-chip--warn">blocked</span>',
        committed: '<span class="dd-chip dd-chip--ok">committed</span>',
        aborted: '<span class="dd-chip dd-chip--bad">aborted (retry)</span>' }[a.state] || "";
      return '<div class="' + cls + '"><div class="dd-actor-top"><span class="dd-actor-id">' + a.id + "</span>" +
        '<span class="dd-actor-tag">' + a.tag + "</span></div>" +
        '<div class="dd-actor-body">' + body + "</div>" +
        '<div class="dd-actor-sub">' + stChip + "</div></div>";
    }
    function lockRow(l) {
      var cls = "dd-lockrow" + (l.contended ? " is-contended hot" : "");
      var holder = l.holder ? "held by <b>" + l.holder + "</b>" : "<span style='color:var(--green)'>free</span>";
      var wait = l.waiters && l.waiters.length ? '<div class="dd-lock-wait">⏳ waiting: ' + l.waiters.join(", ") + "</div>" : "";
      var chip = l.holder ? '<span class="dd-chip dd-chip--accent">X-lock</span>' : '<span class="dd-chip dd-chip--ok">open</span>';
      return '<div class="' + cls + '"><span class="dd-lock-res">' + l.res + "</span>" +
        '<span class="dd-lock-holder">' + holder + wait + "</span>" + chip + "</div>";
    }
    function wfgBlock(w) {
      if (!w) return "";
      var n1cls = "dd-wfg-node", n2cls = "dd-wfg-node";
      if (w.victim === "T1") n1cls += " is-victim"; if (w.victim === "T2") n2cls += " is-victim";
      if (w.survivor === "T1") n1cls += " is-survivor"; if (w.survivor === "T2") n2cls += " is-survivor";
      var e = w.edges || [], edge, label;
      if (e.length >= 2) { edge = "⇄"; label = "Cycle detected — deadlock"; }
      else if (e.length === 1) { edge = "→"; label = e[0][0] + " is waiting for " + e[0][1]; }
      else { edge = "&nbsp;&nbsp;"; label = w.victim ? "Cycle broken — " + w.victim + " was aborted" : "No wait cycle"; }
      return '<div class="dd-wfg' + (w.deadlock ? " is-deadlock" : "") + '">' +
        '<span class="' + n1cls + '">T1</span><span class="dd-wfg-edge">' + edge + "</span>" +
        '<span class="' + n2cls + '">T2</span>' +
        '<div class="dd-wfg-label">' + label + "</div></div>";
    }
    function update(idx, step) {
      var s = step && step.viz;
      if (idx < 0 || !s) {
        host.innerHTML = '<div class="dd-empty">Press <b>Play</b> to watch two ShopKart stock transfers lock the same rows ' +
          "in opposite order — form a deadlock — and get resolved by the detector.</div>";
        return;
      }
      var html = '<div class="dd-section"><div class="dd-section-label">Transactions</div><div class="dd-row">' +
        s.actors.map(actorCard).join("") + "</div></div>";
      html += '<div class="dd-section"><div class="dd-section-label">Lock table</div><div class="dd-locktable">' +
        s.locks.map(lockRow).join("") + "</div></div>";
      if (s.wfg) html += '<div class="dd-section"><div class="dd-section-label">Wait-for graph</div>' + wfgBlock(s.wfg) + "</div>";
      if (s.note) html += '<div class="dd-note">' + s.note + "</div>";
      host.innerHTML = html;
    }
    return { update: update, destroy: function () { host.innerHTML = ""; host.classList.remove("dd-viz"); } };
  }

  DL.deepDives["locking"] = {
    slug: "locking",
    overview: {
      what: "<b>Locking</b> is pessimistic concurrency control: a transaction claims a resource (usually a row) so others can't conflict with it. A <b>deadlock</b> is when two or more transactions each hold a lock the other needs — a cycle where nobody can proceed.",
      why: "Locks are how a database serializes <b>writers</b> so concurrent updates don't lose each other. But locks that are acquired in inconsistent orders can form cycles, freezing transactions — so understanding lock ordering, detection, and retry is essential to correct, high-throughput write paths.",
      how: "Writers take exclusive locks and, under two-phase locking, hold them until commit. If a wait-for cycle forms, the database detects it and aborts a victim to break it. The application retries the victim — and prevents recurrence by always acquiring resources in the same order."
    },
    steps: STEPS,
    buildViz: buildViz,
    code: {
      title: "Two transfers, opposite lock order → deadlock",
      lang: "sql",
      code:
        "-- Session A: move 1 unit  42 -> 99         -- Session B: move 1 unit  99 -> 42\n" +
        "BEGIN;                                      BEGIN;\n" +
        "UPDATE products SET stock=stock-1           UPDATE products SET stock=stock-1\n" +
        "  WHERE sku=42;   -- A locks row 42           WHERE sku=99;   -- B locks row 99\n" +
        "UPDATE products SET stock=stock+1           UPDATE products SET stock=stock+1\n" +
        "  WHERE sku=99;   -- A WAITS on B             WHERE sku=42;   -- B WAITS on A  => DEADLOCK\n" +
        "                          -- ERROR:  deadlock detected  (one session is aborted & must retry)\n" +
        "-- FIX: lock rows in a consistent order in BOTH transactions (e.g. always ascending sku).",
      highlights: [5, 6, 7]
    },
    reference: [
      ["lock", "A claim on a resource that controls concurrent access to it"],
      ["shared (S) lock", "Read lock — many can hold it together"],
      ["exclusive (X) lock", "Write lock — only one holder; blocks all others"],
      ["two-phase locking (2PL)", "Acquire locks in a growing phase, release in a shrinking phase → serializability"],
      ["strict 2PL", "Hold all locks until commit/abort — the common, recoverable variant"],
      ["deadlock", "A cycle of transactions each waiting on a lock another holds"],
      ["wait-for graph", "Nodes = transactions, edge X→Y = X waits on Y; a cycle = deadlock"],
      ["victim", "The transaction the engine aborts to break a deadlock"],
      ["lock granularity", "The size of the locked unit: row, page, or table"],
      ["lock escalation", "Promoting many fine-grained locks into one coarse lock"]
    ],
    internals:
      "<p>Locking is <b>pessimistic</b> concurrency control: assume conflicts will happen and prevent them up front by claiming resources. The <b>lock manager</b> is a hash table keyed by resource; each entry records the current holders, their modes, and a queue of waiters. Lock <b>modes</b> follow a compatibility matrix — shared locks coexist, an exclusive lock excludes everything.</p>" +
      "<p><b>Two-phase locking</b> is the classic protocol that guarantees serializability: in the growing phase a transaction only acquires locks; once it releases any, it enters the shrinking phase and may acquire no more. <b>Strict 2PL</b> — used by most engines — holds every lock until commit or abort, which also guarantees recoverability (no one reads data that might be rolled back).</p>" +
      "<p>Deadlocks are handled by <b>detection</b> (periodically search the wait-for graph for a cycle and abort a victim) or, more coarsely, by <b>lock timeouts</b>. This is orthogonal to MVCC: MVCC removes read locks (readers never block), but writers still take row locks under strict 2PL, so <code>UPDATE</code>/<code>DELETE</code>/<code>SELECT … FOR UPDATE</code> are exactly where deadlocks live.</p>",
    engineering:
      "<p>The number-one deadlock cure is boringly effective: <b>acquire shared resources in a consistent global order</b> across all code paths (sort the keys before you lock them). A close second is keeping transactions <b>short</b> — the longer you hold locks, the wider the window for cycles and blocking chains.</p>" +
      "<p>Design for contention: a single hot row (a global counter, a popular product's stock) serializes every writer and becomes a latency wall — shard it, use an atomic increment, or a queue. Choose granularity deliberately (row locks maximize concurrency; table locks are simple but block everyone). And always wrap write transactions in a <b>retry-on-deadlock</b> loop with backoff, because under real concurrency, victims happen.</p>",
    gotchas: [
      { kind: "tip", html: "<b>Deadlocks are almost always a lock-ordering bug, not bad luck.</b> If every transaction acquires the same rows in the same order (e.g. ascending primary key), a wait-for cycle is impossible." },
      { kind: "warn", html: "<b>The deadlock victim gets an error — you must retry it.</b> 'deadlock detected' is expected under contention. Write paths that update multiple rows need a retry loop with backoff, or you'll surface deadlocks to users." },
      { kind: "info", html: "<b>MVCC doesn't remove write locks.</b> Plain <code>SELECT</code> is lock-free, but <code>UPDATE</code>, <code>DELETE</code>, and <code>SELECT … FOR UPDATE</code> take row locks that serialize writers — that's where every deadlock originates." }
    ],
    failureModes:
      "<p><b>Deadlock storms:</b> inconsistent lock ordering under high concurrency produces cycles faster than victims can retry; throughput collapses into an abort/retry churn. <i>Fix:</i> impose a global lock order; shorten transactions.</p>" +
      "<p><b>Hot-row contention (lock convoy):</b> everyone updates the same row (a shared counter, a trending product's stock) and serializes behind one X lock; latency climbs even without deadlocks. <i>Fix:</i> shard the counter, use atomic ops, or a write-combining queue.</p>" +
      "<p><b>Long transactions holding locks:</b> a transaction that pauses on app logic or user input blocks a growing chain of waiters. <i>Fix:</i> keep transactions short; never wait on I/O inside one.</p>" +
      "<p><b>Lock escalation surprises:</b> some engines promote many row locks to a table lock past a threshold, suddenly blocking unrelated transactions. <i>Fix:</i> batch sizing; know your engine's escalation behavior.</p>",
    quickCheck: [
      {
        q: "Two transactions lock rows 42 and 99 in opposite orders, then each requests the row the other holds. What happens?",
        options: [
          "Both eventually proceed — the database interleaves them",
          "A deadlock forms; the engine aborts one as a victim, which must be retried",
          "The second transaction silently overwrites the first",
          "Both roll back automatically with no error"
        ],
        answer: 1,
        why: "Each holds a lock the other needs — a wait-for cycle, i.e. a deadlock. The engine detects it and aborts a victim to break the cycle; the application must retry the aborted transaction.",
        diff: "easy"
      },
      {
        q: "Under MVCC (e.g. Postgres), does a plain SELECT take a row lock that can participate in a deadlock?",
        options: [
          "Yes — every statement locks the rows it touches",
          "No — plain SELECT is lock-free; only writes and SELECT … FOR UPDATE take row locks",
          "Only under READ COMMITTED",
          "Only if the row was recently updated"
        ],
        answer: 1,
        why: "MVCC readers use snapshots, not locks, so plain SELECT never blocks or deadlocks. Deadlocks come from write locks: UPDATE, DELETE, and explicit SELECT … FOR UPDATE.",
        diff: "medium"
      },
      {
        q: "What is the most reliable way to PREVENT this class of deadlock (rather than just recover from it)?",
        options: [
          "Add more retries",
          "Use a higher isolation level",
          "Make every transaction acquire the shared rows in the same consistent order",
          "Increase the deadlock timeout"
        ],
        answer: 2,
        why: "A wait-for cycle can only form when transactions acquire resources in different orders. A consistent global lock order (e.g. ascending key) makes the cycle impossible. Retries handle the symptom; ordering removes the cause.",
        diff: "medium"
      }
    ],
    interviewQs: [
      {
        q: "What is two-phase locking, and what does it guarantee?",
        a: "Two-phase locking (2PL) splits a transaction's locking into two phases: a growing phase where it only acquires locks, and a shrinking phase where it only releases them — once it releases any lock it may never acquire another. This discipline guarantees serializability: the resulting schedule is equivalent to some serial order of the transactions. Strict 2PL, the common variant, holds all locks until commit or abort, which additionally guarantees recoverability and prevents cascading aborts, because no transaction reads data written by another that hasn't committed.",
        tip: "Distinguish plain 2PL (serializable) from strict 2PL (serializable + recoverable, holds to commit) — that nuance signals depth."
      },
      {
        q: "How does a database detect and resolve a deadlock?",
        a: "It maintains (or can reconstruct) a wait-for graph where an edge X→Y means transaction X is blocked on a lock Y holds. A cycle in that graph is a deadlock. Engines either search for cycles periodically (Postgres does this after deadlock_timeout) or approximate detection with per-lock timeouts. On finding a cycle, the engine picks a victim — typically the transaction cheapest to roll back — aborts it with a deadlock error, and releases its locks, unblocking the rest. The application is responsible for retrying the aborted transaction.",
        tip: "Mention victim selection (cheapest to roll back) and that resolution isn't instant — detection is periodic, so a brief hang precedes the abort."
      },
      {
        q: "You're seeing frequent deadlocks on one table in production. Walk me through diagnosing and fixing it.",
        a: "First, read the deadlock log — Postgres logs both statements and the rows/locks involved, which reveals the two orderings that conflict. Then: (1) impose a consistent lock order across all code paths that touch those rows (e.g. sort keys ascending before updating); (2) shorten the transactions so locks are held briefly; (3) check for missing indexes causing broad range/gap locks instead of single-row locks; (4) reduce hot-row contention (shard counters, atomic increments); and (5) ensure the write path retries deadlock victims with backoff. Ordering removes the cause; the rest reduce frequency and blast radius.",
        tip: "Lead with 'read the deadlock log to find the two orderings' — it shows you debug from evidence, not guesses."
      }
    ],
    businessLens: {
      task: "Two ShopKart admin stock-transfers touching the same two SKUs",
      meaning: "Inventory moves between products must not freeze each other or lose updates.",
      system: "OLTP inventory writes (Postgres, strict 2PL)",
      point: "When two ShopKart admins move stock between SKU #42 and #99 at the same time, in opposite directions, their transactions lock the same rows in opposite orders and deadlock — one gets a 'deadlock detected' error mid-operation. The robust fix is a one-line rule enforced everywhere: always update SKUs in ascending order, and retry victims. It turns a mysterious, load-dependent freeze into a brief, orderly wait — the difference between an inventory tool that scales and one that jams every time two people use it at once."
    }
  };
})();
