/* ============================================================
   deepdives/isolation-levels.js — "Isolation Levels" deep dive.
   Registers DBLab.deepDives['isolation-levels'] (concept m51).
   Authored against the contract documented in deepdives/mvcc.js.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  DL.deepDives = DL.deepDives || {};

  // The ANSI ladder. 0 = anomaly ALLOWED, 1 = PREVENTED.
  var ANOMALIES = [
    { key: "dirty", label: "Dirty read" },
    { key: "nonrep", label: "Non-repeatable read" },
    { key: "phantom", label: "Phantom" },
    { key: "skew", label: "Write skew" }
  ];
  var LEVELS = [
    { name: "Read Uncommitted", cells: { dirty: 0, nonrep: 0, phantom: 0, skew: 0 } },
    { name: "Read Committed", cells: { dirty: 1, nonrep: 0, phantom: 0, skew: 0 } },
    { name: "Repeatable Read", cells: { dirty: 1, nonrep: 1, phantom: 0, skew: 0 } },
    { name: "Serializable", cells: { dirty: 1, nonrep: 1, phantom: 1, skew: 1 } }
  ];

  var SC = {
    dirty: { title: "Dirty read — reading uncommitted data", seq: [
        { who: "a", act: "UPDATE stock = <b>90</b>   (not committed yet)" },
        { who: "b", act: "SELECT stock → reads <b>90</b>   ← uncommitted!" },
        { who: "a", act: "ROLLBACK   (stock was really 100)" }
      ], verdict: { cls: "dd-chip--bad", text: "B acted on a value (90) that never officially existed." } },
    nonrep: { title: "Non-repeatable read — a row changes mid-transaction", seq: [
        { who: "a", act: "SELECT stock → <b>100</b>" },
        { who: "b", act: "UPDATE stock = 90;  COMMIT" },
        { who: "a", act: "SELECT stock → <b>90</b>   ← changed under A" }
      ], verdict: { cls: "dd-chip--warn", text: "The same query gives A two different answers in one transaction." } },
    phantom: { title: "Phantom — new rows match a repeated range query", seq: [
        { who: "a", act: "SELECT count(*) WHERE price<500 → <b>3</b>" },
        { who: "b", act: "INSERT product price=499;  COMMIT" },
        { who: "a", act: "SELECT count(*) WHERE price<500 → <b>4</b>   ← phantom" }
      ], verdict: { cls: "dd-chip--warn", text: "A new matching row appears in A's repeated range scan. (Postgres RR uses snapshots and actually prevents this one.)" } },
    skew: { title: "Write skew — disjoint writes break a shared invariant", seq: [
        { who: "a", act: "read wallet1+wallet2 = ₹100  (ok, ≥ ₹80)" },
        { who: "b", act: "read wallet1+wallet2 = ₹100  (ok, ≥ ₹80)" },
        { who: "a", act: "withdraw ₹80 from wallet1;  COMMIT" },
        { who: "b", act: "withdraw ₹80 from wallet2;  COMMIT   ← combined = −₹60" }
      ], verdict: { cls: "dd-chip--bad", text: "Each read a valid snapshot and wrote a different row; together they broke 'combined ≥ 0'." } },
    skewFixed: { title: "Write skew under Serializable — one is aborted", seq: [
        { who: "a", act: "read wallet1+wallet2 = ₹100;  withdraw ₹80 from wallet1;  COMMIT ✔" },
        { who: "b", act: "withdraw ₹80 from wallet2 → <b>ERROR: could not serialize</b>" }
      ], verdict: { cls: "dd-chip--ok", text: "SSI detects the dangerous read/write dependency and aborts B. The invariant holds; B retries and re-reads the true balance." } }
  };

  var STEPS = [
    {
      label: "1 · The dial: isolation vs concurrency",
      what: "Isolation levels are a <b>dial</b>. Turn it up and concurrent transactions are better shielded from each other's anomalies; turn it down and you get more concurrency and throughput. The matrix shows which anomalies each level lets through.",
      why: "Perfect isolation (every transaction runs as if alone) is expensive. Most workloads don't need it everywhere, so the standard defines four levels — letting you buy exactly as much isolation as each transaction's correctness requires.",
      how: "Each level is <i>defined</i> by which anomalies it permits: dirty reads, non-repeatable reads, phantoms, and (beyond the ANSI list) write skew. Higher levels prevent strictly more.",
      when: "Every transaction runs at some level — the default (usually Read Committed) unless you set one explicitly.",
      mistake: "Cranking everything to Serializable 'to be safe'. That maximizes aborts and contention; the goal is the <b>weakest</b> level that still protects each transaction's invariant.",
      interview: "“Why not just always use Serializable?” Because isolation trades off against concurrency — Serializable causes serialization failures and reduces throughput; you match the level to the invariant.",
      example: "ShopKart runs most reads at Read Committed, but a few money-moving transactions need Serializable — different dials for different jobs.",
      viz: { level: -1, scenario: null, note: "Read the matrix as: ✓ = anomaly prevented, ✗ = allowed. Down the rows, protection strengthens." }
    },
    {
      label: "2 · Read Uncommitted → dirty reads",
      what: "The weakest level. A transaction can read another's <b>uncommitted</b> changes — a <b>dirty read</b>. If the writer rolls back, the reader acted on data that never really existed.",
      why: "It permits every anomaly in exchange for maximum concurrency and zero read-visibility rules. It's almost never what you want — you can make a decision on a value that gets erased a millisecond later.",
      how: "At this level a reader ignores commit status and sees in-flight writes. (Notably, <b>Postgres never actually does dirty reads</b> — its Read Uncommitted behaves like Read Committed.)",
      when: "Effectively never in practice; occasionally in other engines for approximate, throwaway counts where correctness doesn't matter.",
      mistake: "Assuming Read Uncommitted is 'a bit faster Read Committed'. It's a correctness cliff — you can read values that are rolled back.",
      interview: "“What's a dirty read?” Reading another transaction's uncommitted data, which may be rolled back — leaving you having acted on a phantom value.",
      example: "A ShopKart dashboard reading uncommitted stock could show 90 for a sale that then fails and rolls back to 100 — a number that was never true.",
      viz: { level: 0, scenario: SC.dirty, note: "Read Uncommitted allows all four anomalies. Postgres maps it to Read Committed anyway." }
    },
    {
      label: "3 · Read Committed → no dirty reads",
      what: "The common default. A transaction only ever sees <b>committed</b> data — dirty reads are gone. But it takes a <b>fresh snapshot per statement</b>, so a value can change between two reads in the same transaction: a <b>non-repeatable read</b>.",
      why: "This is the sweet spot for most OLTP: you never see garbage (uncommitted) data, and you always see the latest committed state on each statement. The cost is that a transaction isn't a stable view across statements.",
      how: "Each statement reads against a snapshot taken at statement start. A row updated-and-committed by another transaction between your two SELECTs will read differently the second time.",
      when: "The default level in PostgreSQL, Oracle, SQL Server (read-committed snapshot), and many others.",
      mistake: "Assuming a value you read at the start of a Read Committed transaction stays constant. It doesn't — re-reads can change. Cache it in a variable if you need stability.",
      interview: "“What does Read Committed guarantee and not guarantee?” Guarantees: no dirty reads. Doesn't guarantee: repeatable reads or phantom-freedom.",
      example: "A ShopKart checkout at Read Committed reads stock=100, and a moment later (after another sale commits) re-reads 90 — correct, current, but not repeatable.",
      viz: { level: 1, scenario: SC.nonrep, note: "Read Committed prevents dirty reads; a fresh snapshot per statement still allows non-repeatable reads." }
    },
    {
      label: "4 · Repeatable Read → stable rows",
      what: "The transaction takes <b>one snapshot at BEGIN</b> and holds it. Every row it reads stays the same all transaction long — non-repeatable reads are gone. In the ANSI model, new rows matching a range query (<b>phantoms</b>) can still appear.",
      why: "Now a transaction is a stable, consistent view of the rows it touches — ideal for reports and multi-step reads that must agree with themselves. This is exactly snapshot isolation (the MVCC story).",
      how: "One snapshot for the whole transaction means re-reading a row always returns the same version. The ANSI standard still permits phantoms; <b>Postgres's snapshot-based Repeatable Read actually prevents phantoms too</b>, but permits write skew (next step).",
      when: "Postgres/Oracle Repeatable Read = snapshot isolation; use it for consistent multi-statement reads and reports.",
      mistake: "Assuming Repeatable Read means the same thing everywhere. ANSI allows phantoms; Postgres RR doesn't; MySQL InnoDB RR prevents them with next-key locks. Check your engine.",
      interview: "“What does Repeatable Read add over Read Committed?” A single snapshot for the whole transaction, so every read is repeatable (and, in snapshot-based engines, phantom-free).",
      example: "ShopKart's nightly report runs at Repeatable Read so all its queries see one consistent point-in-time, even as sales pour in.",
      viz: { level: 2, scenario: SC.phantom, note: "Repeatable Read prevents non-repeatable reads. ANSI permits phantoms; Postgres RR (snapshot isolation) prevents them — but see the next step." }
    },
    {
      label: "5 · The trap: write skew survives",
      what: "Even at Repeatable Read / snapshot isolation, a subtle anomaly remains: <b>write skew</b>. Two transactions read an overlapping set, each writes a <i>different</i> row, and together they violate an invariant neither broke alone.",
      why: "Snapshot isolation guarantees each transaction reads a consistent snapshot — but it doesn't stop two transactions' <i>disjoint</i> writes from jointly breaking a rule that spans the rows they read. This is the anomaly that most often bites people who think 'Repeatable Read is safe enough'.",
      how: "Both transactions read wallet1 + wallet2 = ₹100 and each independently withdraws ₹80 from a different wallet. Each write is valid against its own snapshot; combined, they drive the total to −₹60. No dirty/non-repeatable/phantom read occurred — yet the invariant is broken.",
      when: "Whenever an invariant spans multiple rows that transactions read-then-write concurrently (bank balances, on-call schedules, inventory across SKUs, unique-slot booking).",
      mistake: "Trusting snapshot isolation to protect a cross-row invariant. It won't — this is the #1 correctness surprise with Postgres Repeatable Read.",
      interview: "“Does snapshot isolation give you serializability?” No — it permits write skew. You need Serializable (SSI) or explicit locks to close the gap.",
      example: "Two ShopKart withdrawals from a customer's two store-credit wallets, each checking the combined balance, both commit — and the combined balance goes negative.",
      viz: { level: 2, scenario: SC.skew, note: "Write skew is NOT in the ANSI list, but it's the anomaly snapshot isolation (Repeatable Read) leaves open." }
    },
    {
      label: "6 · Serializable → everything prevented",
      what: "The strongest level. The result is <b>guaranteed equivalent to running the transactions one at a time</b> in some order. All four anomalies — including write skew — are prevented.",
      why: "This is the level you reach for when correctness must be absolute and the invariant spans rows you read-then-write. It removes the reasoning burden: if it commits, it's as if it ran alone.",
      how: "Postgres implements it with <b>Serializable Snapshot Isolation (SSI)</b>: it runs at snapshot isolation but tracks read/write dependencies and <b>aborts</b> a transaction that would create a non-serializable cycle. Other engines use strict two-phase locking.",
      when: "Money movement, booking the last seat/unit, any multi-row invariant where write skew would corrupt data.",
      mistake: "Using Serializable without a retry loop. It prevents anomalies by <b>aborting</b> conflicting transactions (error 40001) — the app must catch that and retry.",
      interview: "“How does Postgres make Serializable work without heavy locking?” SSI: snapshot isolation plus dependency tracking that aborts transactions forming a dangerous read/write cycle.",
      example: "The two ShopKart wallet withdrawals now run at Serializable: SSI aborts the second, the combined balance stays ≥ 0, and the aborted one retries against the true balance.",
      viz: { level: 3, scenario: SC.skewFixed, note: "Serializable prevents every anomaly — at the cost of serialization failures you must retry." }
    },
    {
      label: "7 · Choosing a level",
      what: "Default to <b>Read Committed</b>. Step up to <b>Repeatable Read</b> when a transaction must see one consistent snapshot across statements. Step up to <b>Serializable</b> only when an invariant spans rows you read-then-write and write skew would corrupt data.",
      why: "Each step up trades throughput for safety. The engineering skill is picking the <b>weakest level that still protects the invariant</b> — and knowing the cheaper alternatives (explicit locks, constraints) for the isolated cases that need them.",
      how: "Set it per transaction: <code>BEGIN ISOLATION LEVEL SERIALIZABLE;</code>. For a single hotspot, an explicit <code>SELECT … FOR UPDATE</code> or a database constraint often fixes the invariant without raising the level for everything.",
      when: "At design time, per transaction — driven by the invariant that transaction protects, not by a global default.",
      mistake: "Setting one global level for the whole app. Isolation is a per-transaction decision; most transactions want the default and a few want more.",
      interview: "“How do you decide on an isolation level?” Start at the default (Read Committed); raise it only for transactions whose correctness the default can't guarantee, and prefer targeted locks/constraints over a blanket Serializable.",
      example: "ShopKart keeps browsing and cart reads at Read Committed, runs reports at Repeatable Read, and reserves Serializable (with retries) for wallet and last-unit purchases.",
      viz: { level: 1, scenario: null, note: "Read Committed is the sensible default (highlighted). Raise the dial only where an invariant demands it." }
    }
  ];

  function buildViz(host) {
    host.classList.add("dd-viz");
    function matrix(cur) {
      var head = "<tr><th>Isolation level</th>" + ANOMALIES.map(function (a) { return "<th>" + a.label + "</th>"; }).join("") + "</tr>";
      var body = LEVELS.map(function (lv, i) {
        var tr = '<tr class="' + (i === cur ? "is-current" : "") + '"><th>' + lv.name + "</th>";
        tr += ANOMALIES.map(function (a) {
          var prevented = lv.cells[a.key] === 1;
          return '<td class="' + (prevented ? "cell-prevented" : "cell-allowed") + '">' + (prevented ? "✓" : "✗") + "</td>";
        }).join("");
        return tr + "</tr>";
      }).join("");
      return '<div class="dd-matrix-wrap"><table class="dd-matrix"><thead>' + head + "</thead><tbody>" + body + "</tbody></table></div>" +
        '<div class="dd-note" style="margin-top:6px">✓ prevented · ✗ allowed &nbsp;·&nbsp; Write skew is a snapshot-isolation anomaly beyond the ANSI list.</div>';
    }
    function scenario(sc) {
      if (!sc) return "";
      var lines = sc.seq.map(function (l) {
        return '<div class="dd-seq-line"><span class="dd-seq-who ' + l.who + '">' + (l.who === "a" ? "T1" : "T2") + "</span>" +
          '<span class="dd-seq-act">' + l.act + "</span></div>";
      }).join("");
      return '<div class="dd-scenario"><div class="dd-scenario-title">' + sc.title + "</div>" +
        '<div class="dd-scenario-seq">' + lines + "</div>" +
        '<div class="dd-scenario-verdict"><span class="dd-chip ' + sc.verdict.cls + '">' +
          (sc.verdict.cls === "dd-chip--ok" ? "prevented" : "anomaly") + "</span> " + sc.verdict.text + "</div></div>";
    }
    function update(idx, step) {
      var s = step && step.viz;
      if (idx < 0 || !s) {
        host.innerHTML = '<div class="dd-empty">Press <b>Play</b> to climb the isolation ladder — Read Uncommitted → Serializable — ' +
          "and watch which anomaly each level lets through, with a live two-transaction example.</div>";
        return;
      }
      var html = '<div class="dd-section"><div class="dd-section-label">Anomaly matrix</div>' + matrix(s.level) + "</div>";
      if (s.scenario) html += '<div class="dd-section"><div class="dd-section-label">What can go wrong here</div>' + scenario(s.scenario) + "</div>";
      if (s.note) html += '<div class="dd-note">' + s.note + "</div>";
      host.innerHTML = html;
    }
    return { update: update, destroy: function () { host.innerHTML = ""; host.classList.remove("dd-viz"); } };
  }

  DL.deepDives["isolation-levels"] = {
    slug: "isolation-levels",
    overview: {
      what: "<b>Isolation levels</b> control how much concurrent transactions can affect what each other sees. From weakest to strongest — Read Uncommitted, Read Committed, Repeatable Read, Serializable — each prevents strictly more <b>anomalies</b>: dirty reads, non-repeatable reads, phantoms, and write skew.",
      why: "Full isolation (every transaction as if alone) is expensive, so databases let you choose. Pick too weak a level and concurrent transactions silently corrupt data; pick too strong and you pay in aborts and throughput. Choosing correctly is a core correctness-vs-performance decision.",
      how: "The standard defines each level by which anomalies it allows. Engines implement them by <i>when</i> a snapshot is taken (MVCC) or by locking. The practical skill is knowing what your specific engine actually does at each level, and picking the weakest one that protects each transaction's invariant."
    },
    steps: STEPS,
    buildViz: buildViz,
    code: {
      title: "Setting isolation per transaction (Postgres)",
      lang: "sql",
      code:
        "-- Default: Read Committed — fresh snapshot per statement, no dirty reads\n" +
        "BEGIN;  SELECT stock FROM products WHERE sku = 42;  ...  COMMIT;\n" +
        "\n" +
        "-- Consistent multi-statement view (snapshot isolation): a report\n" +
        "BEGIN ISOLATION LEVEL REPEATABLE READ;\n" +
        "  SELECT ...; SELECT ...;   -- both see one consistent snapshot\n" +
        "COMMIT;\n" +
        "\n" +
        "-- Absolute correctness for a cross-row invariant (prevents write skew)\n" +
        "BEGIN ISOLATION LEVEL SERIALIZABLE;\n" +
        "  SELECT sum(balance) FROM wallets WHERE usr = 77;   -- read the invariant\n" +
        "  UPDATE wallets SET balance = balance - 80 WHERE id = 1;\n" +
        "COMMIT;   -- may raise 40001 'could not serialize' -> retry the whole transaction",
      highlights: [4, 9, 13]
    },
    reference: [
      ["isolation level", "How shielded a transaction is from concurrent transactions' effects"],
      ["dirty read", "Reading another transaction's uncommitted data"],
      ["non-repeatable read", "A row's value changes between two reads in one transaction"],
      ["phantom", "New rows appear that match a repeated range query"],
      ["write skew", "Two transactions read overlapping data, write disjoint rows, and jointly break an invariant"],
      ["Read Committed", "No dirty reads; fresh snapshot per statement (common default)"],
      ["Repeatable Read", "One snapshot per transaction = snapshot isolation"],
      ["Serializable", "Equivalent to some serial order; prevents all anomalies"],
      ["SSI", "Serializable Snapshot Isolation — snapshot + dependency tracking, aborts dangerous cycles"],
      ["40001", "SQLSTATE for a serialization failure — retry the transaction"]
    ],
    internals:
      "<p>The ANSI SQL standard defines the four levels <i>by the anomalies they permit</i>, not by implementation. That's why real engines differ, and why 'Repeatable Read' can mean subtly different things:</p>" +
      "<p><b>PostgreSQL:</b> Read Uncommitted behaves as Read Committed (no dirty reads ever). Repeatable Read is <b>snapshot isolation</b> — one snapshot per transaction — which prevents phantoms too, but permits write skew. Serializable adds <b>SSI</b>: it monitors read/write dependencies and aborts a transaction that would complete a non-serializable cycle.</p>" +
      "<p><b>MySQL InnoDB:</b> default is Repeatable Read, using next-key (gap) locks that prevent phantoms; its Serializable turns plain reads into locking reads.</p>" +
      "<p>The through-line: levels are realized by <i>when the snapshot is taken</i> (Read Committed = per statement, Repeatable Read = per transaction) plus, for Serializable, either dependency tracking (SSI) or two-phase locking. Know your engine's actual guarantees — the label alone isn't enough.</p>",
    engineering:
      "<p>Treat isolation as a <b>per-transaction</b> decision, not a global setting. Default (Read Committed) is correct for the overwhelming majority of reads and simple writes. Raise it only where a transaction's correctness depends on more: Repeatable Read for a multi-statement read that must be self-consistent; Serializable for an invariant that spans rows you read-then-write.</p>" +
      "<p>When you do use Serializable, budget for <b>serialization failures</b>: wrap the transaction in a retry loop with backoff, and keep it short to reduce conflict windows. For a single hotspot, a targeted <code>SELECT … FOR UPDATE</code> or a <code>CHECK</code>/unique constraint is often cheaper and clearer than raising the level for everything around it.</p>",
    gotchas: [
      { kind: "warn", html: "<b>The same level name means different things across engines.</b> Postgres Read Uncommitted = Read Committed; Postgres Repeatable Read prevents phantoms (snapshot isolation) while ANSI permits them; MySQL InnoDB Repeatable Read blocks phantoms with gap locks. Never assume — verify your engine's actual behavior." },
      { kind: "tip", html: "<b>Snapshot isolation (Postgres Repeatable Read) does NOT prevent write skew.</b> If an invariant spans multiple rows you read and then write, you need Serializable (SSI) or an explicit lock on those rows." },
      { kind: "info", html: "<b>Serializable prevents anomalies by aborting transactions.</b> Expect SQLSTATE 40001 ('could not serialize') under contention — every Serializable transaction needs a retry-on-conflict loop, or users see errors." }
    ],
    failureModes:
      "<p><b>Silent write skew from too-weak a level:</b> a cross-row invariant (combined balance, at-least-one-on-call, last unit) corrupts under Repeatable Read because snapshot isolation allows write skew. <i>Fix:</i> Serializable, or SELECT … FOR UPDATE on the read set, or a constraint.</p>" +
      "<p><b>Serialization errors surfacing to users:</b> Serializable without retry logic turns conflicts into user-facing failures. <i>Fix:</i> retry 40001 with backoff; keep transactions short.</p>" +
      "<p><b>Portability bugs:</b> code correct on MySQL RR (gap locks prevent phantoms) breaks on ANSI RR that permits them, or vice versa. <i>Fix:</i> pin behavior to the engine you run; test the anomaly, don't trust the label.</p>" +
      "<p><b>Non-repeatable reads assumed away:</b> logic that reads a value at transaction start and reuses it under Read Committed can act on stale data. <i>Fix:</i> re-read under a lock, or use Repeatable Read for that transaction.</p>",
    quickCheck: [
      {
        q: "Under Read Committed, a transaction selects the same row twice and gets different values because another transaction committed an update in between. What anomaly is this?",
        options: ["Dirty read", "Non-repeatable read", "Phantom", "Write skew"],
        answer: 1,
        why: "Read Committed takes a fresh snapshot per statement, so a committed change between two reads makes the row's value non-repeatable within the transaction. (No dirty read occurred — the change was committed.)",
        diff: "easy"
      },
      {
        q: "PostgreSQL's Repeatable Read (snapshot isolation) prevents dirty reads, non-repeatable reads, and phantoms. Which anomaly does it still allow?",
        options: ["Dirty read", "Non-repeatable read", "Write skew", "None — it's fully serializable"],
        answer: 2,
        why: "Snapshot isolation gives each transaction a consistent snapshot but doesn't stop two transactions' disjoint writes from jointly breaking a cross-row invariant. That's write skew — only Serializable (SSI) or explicit locks prevent it.",
        diff: "medium"
      },
      {
        q: "You have an invariant across two rows that a transaction reads and then updates, and you must prevent write skew. What's the correct fix?",
        options: [
          "Lower the isolation level for more concurrency",
          "Use Serializable isolation (or take an explicit lock on the read rows)",
          "Add a retry loop at Read Committed",
          "Nothing — Repeatable Read already prevents it"
        ],
        answer: 1,
        why: "Write skew requires either true serializability (Postgres SERIALIZABLE / SSI) or an explicit lock (SELECT … FOR UPDATE) on the rows the invariant reads, so concurrent transactions can't both proceed on a stale shared read.",
        diff: "medium"
      }
    ],
    interviewQs: [
      {
        q: "Name the isolation levels from weakest to strongest and the anomaly each one additionally prevents.",
        a: "Read Uncommitted allows everything (including dirty reads). Read Committed prevents dirty reads — you only see committed data — but allows non-repeatable reads and phantoms because it snapshots per statement. Repeatable Read prevents non-repeatable reads by holding one snapshot for the whole transaction; the ANSI standard still allows phantoms, though snapshot-based engines like Postgres also prevent those. Serializable prevents all anomalies, including write skew, guaranteeing a result equivalent to running the transactions one at a time. The key nuance is that real engines differ from the standard, so you must know your engine's actual behavior at each level.",
        tip: "Volunteering the Postgres/MySQL deviations from ANSI is what turns a textbook answer into a practitioner's answer."
      },
      {
        q: "What is write skew, and why doesn't snapshot isolation prevent it?",
        a: "Write skew is when two concurrent transactions each read an overlapping data set, then each write a different (disjoint) row, and the combination violates an invariant that no single transaction broke. Classic example: two withdrawals from a customer's two wallets, each checking the combined balance, both seeing enough, both committing, driving the combined balance negative. Snapshot isolation doesn't prevent it because each transaction genuinely read a consistent snapshot and wrote a row nobody else wrote — there's no dirty, non-repeatable, or phantom read to catch. Preventing it requires true serializability (Postgres SSI detects the read/write dependency cycle and aborts one) or an explicit lock/constraint over the read set.",
        tip: "Have the two-wallet or doctors-on-call example ready — write skew is abstract until you show the disjoint-writes-shared-invariant shape."
      },
      {
        q: "Your service runs some transactions at Serializable and users occasionally get errors under load. What's happening and how do you handle it?",
        a: "Serializable enforces correctness by aborting transactions that would form a non-serializable schedule, raising a serialization failure (SQLSTATE 40001). Under higher concurrency, more conflicts means more aborts, which surface as errors if unhandled. The fix is to treat 40001 as expected: catch it and retry the whole transaction with exponential backoff and a cap. Also reduce conflicts — keep Serializable transactions short, touch fewer rows, and only use Serializable where the invariant truly needs it (use the default or a targeted lock elsewhere).",
        tip: "Emphasize that the retry must re-run the entire transaction (re-read then re-write) — retrying just the failed statement reuses stale reads and fails again."
      }
    ],
    businessLens: {
      task: "ShopKart store-credit: two wallets sharing a 'combined ≥ 0' rule",
      meaning: "A customer must never withdraw more store credit than they hold across wallets.",
      system: "OLTP wallets (Postgres)",
      point: "ShopKart lets a customer hold store credit in two wallets with a rule: the combined balance can't go negative. Two simultaneous withdrawals — one from each wallet — each check the combined balance, each see enough, and at Repeatable Read both commit, overdrawing the customer. That's write skew, and snapshot isolation won't catch it. Running these transactions at Serializable (with retries) makes SSI abort one, preserving the invariant. It's the concrete reason ShopKart doesn't use one blanket isolation level: browsing runs cheap at Read Committed, but money-moving transactions pay for Serializable."
    }
  };
})();
