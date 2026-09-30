/* ============================================================
   deepdives/transactions.js — "ACID Transactions" deep dive.
   Registers DBLab.deepDives['transactions'] (concept m46).
   Authored against the contract documented in deepdives/mvcc.js.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  DL.deepDives = DL.deepDives || {};

  // Scene: one ShopKart "Place Order" = reserve stock + record order + take
  // payment, as ONE atomic unit. Ops carry a state; ACID flags light up as
  // each guarantee is demonstrated.
  var OPS = [
    { icon: "📦", sql: "UPDATE products SET stock = stock - 1 WHERE sku = 42" },
    { icon: "🧾", sql: "INSERT INTO orders (id, sku, qty, usr) VALUES (9001, 42, 1, 77)" },
    { icon: "💳", sql: "UPDATE wallets SET balance = balance - 499 WHERE usr = 77" }
  ];
  function ops(states) { return OPS.map(function (o, i) { return { icon: o.icon, sql: o.sql, state: states[i] }; }); }

  var STEPS = [
    {
      label: "1 · BEGIN — the atomic unit opens",
      what: "A ShopKart customer taps <b>Place Order</b>. The server issues <code>BEGIN</code>, opening a transaction that will bundle three writes — reserve stock, record the order, take payment — into <b>one all-or-nothing unit</b>.",
      why: "An order is only meaningful if all three happen together. Charging the wallet without recording the order (or reserving stock that's never paid for) is a broken business state. The transaction is the boundary that makes 'all three or none' possible.",
      how: "<code>BEGIN</code> allocates a transaction context (an XID in Postgres) and a snapshot. From here until <code>COMMIT</code>, every write is provisional and invisible to other sessions.",
      when: "Any time two or more writes must succeed or fail together — orders, transfers, multi-row updates that share an invariant.",
      mistake: "Running the three statements without an explicit <code>BEGIN</code>. In autocommit mode each becomes its <i>own</i> transaction, so a crash between them leaves you half-done.",
      interview: "“What is a transaction?” The unit of atomic work: a group of operations the database guarantees to apply completely or not at all, while keeping them isolated and durable.",
      example: "ShopKart's checkout service opens one transaction for order #9001 before touching a single table.",
      viz: { txnState: "open", ops: ops(["pending", "pending", "pending"]), flags: { A: false, C: false, I: true, D: false }, hotOp: null,
        note: "Isolation is in effect from the first statement: other sessions can't see anything inside this open transaction." }
    },
    {
      label: "2 · Reserve stock (Isolation)",
      what: "First write: <code>UPDATE products SET stock = stock - 1</code> drops SKU #42 from 100 → 99. It's <b>applied inside the transaction</b> but not yet permanent.",
      why: "This shows the <b>I</b> in ACID at work: the storefront and every other shopper still see 100 units. Your uncommitted 99 is private to this transaction until it commits.",
      how: "The row is modified in the buffer and a WAL record is written, but no other snapshot includes your XID yet, so concurrent readers keep seeing the old value. A row lock now guards SKU #42 against a competing writer.",
      when: "Every write inside an open transaction — its effect is visible only to itself until commit.",
      mistake: "Assuming other users instantly see your decrement. They don't — until you COMMIT, your changes are yours alone (that's isolation, not a caching bug).",
      interview: "“If two checkouts read stock=100 and both decrement, what stops overselling?” The row lock on the first writer serializes them; the second re-reads 99. Isolation + locking, not luck.",
      example: "A second shopper browsing SKU #42 at this exact moment still sees 100 in stock — order #9001's reservation is invisible until it commits.",
      viz: { txnState: "open", ops: ops(["applied", "pending", "pending"]), flags: { A: false, C: false, I: true, D: false }, hotOp: 0,
        note: "stock 100 → 99 (private). Other sessions still read 100." }
    },
    {
      label: "3 · Record the order",
      what: "Second write: <code>INSERT INTO orders</code> creates row #9001. Now two changes are staged inside the same transaction.",
      why: "The order row and the stock decrement belong together — an order that exists without reserved stock, or reserved stock with no order, is corruption. Bundling them is the whole point.",
      how: "Another WAL record is appended for the insert. Both changes share one XID, so they'll become visible — or vanish — at the same instant.",
      when: "Whenever a logical action spans multiple tables that must stay mutually consistent.",
      mistake: "Splitting related writes across separate transactions 'to keep them simple'. That trades simplicity for the risk of half-applied business state.",
      interview: "“Why put multi-table writes in one transaction instead of committing each?” So a failure can't leave the tables disagreeing with each other — atomicity is per-transaction, not per-statement.",
      example: "orders row #9001 (sku 42, qty 1, user 77) now exists — but only this transaction can see it.",
      viz: { txnState: "open", ops: ops(["applied", "applied", "pending"]), flags: { A: false, C: false, I: true, D: false }, hotOp: 1,
        note: "Two writes staged under one XID — they'll commit or roll back together." }
    },
    {
      label: "4 · Take payment (Consistency)",
      what: "Third write: <code>UPDATE wallets SET balance = balance - 499</code>. Before this can commit, every declared rule is checked: <code>stock ≥ 0</code>, <code>balance ≥ 0</code>, the order's <code>sku</code> references a real product.",
      why: "This is the <b>C</b> in ACID: a transaction must move the database from one <i>valid</i> state to another. If any constraint would break — say the wallet lacks ₹499 — the whole transaction is rejected, not just this statement.",
      how: "Constraints (<code>CHECK</code>, <code>FOREIGN KEY</code>, <code>NOT NULL</code>, unique indexes) are validated as part of the transaction. A violation raises an error that forces a rollback.",
      when: "At every write that touches constrained columns; deferred constraints are checked at COMMIT.",
      mistake: "Thinking the database guarantees <i>all</i> your business rules. It only enforces the ones you <b>declare</b>. Undeclared invariants are your code's job (and concurrency can still break them).",
      interview: "“Who guarantees Consistency?” Declared constraints + the other three properties + correct application logic. The DB can't enforce a rule you never told it about.",
      example: "User 77's wallet has ₹1,200, so balance → ₹701 passes the <code>balance ≥ 0</code> check. All invariants hold; the transaction is eligible to commit.",
      viz: { txnState: "open", ops: ops(["applied", "applied", "applied"]), flags: { A: false, C: true, I: true, D: false }, hotOp: 2,
        note: "All constraints satisfied → the transaction is in a valid, commit-ready state." }
    },
    {
      label: "5 · If it crashes now → Atomicity",
      what: "Suppose the server <b>crashes right here</b>, before <code>COMMIT</code>. On restart, recovery finds transaction #9001 was never committed and <b>undoes all three writes</b>. Stock is back to 100, no order row, no charge.",
      why: "This is the <b>A</b> in ACID made visible: partial work is impossible. The customer is <i>never</i> charged without an order, because an interrupted transaction leaves <b>zero</b> trace.",
      how: "Because no commit record was durably written, ARIES-style recovery treats #9001 as a 'loser' and rolls it back using the undo information in the WAL. All-or-nothing, enforced at restart.",
      when: "Any crash, error, deadlock victim, or explicit <code>ROLLBACK</code> before commit triggers exactly this.",
      mistake: "Writing 'compensating' cleanup code by hand to undo half-done work. The transaction already gives you that for free — use it instead of reinventing rollback.",
      interview: "“A checkout fails halfway — what's in the database?” Nothing from that transaction. Atomicity means an aborted transaction is as if it never ran.",
      example: "A power blip mid-checkout: the customer sees an error, retries, and finds stock still 100 and no phantom charge — the failed attempt vanished completely.",
      viz: { txnState: "aborted", ops: ops(["undone", "undone", "undone"]), flags: { A: true, C: true, I: true, D: false }, hotOp: null,
        note: "No COMMIT record → recovery rolls back every write. The order simply never happened." }
    },
    {
      label: "6 · COMMIT — all three, together",
      what: "The real path: the server issues <code>COMMIT</code>. In one indivisible instant, all three writes become permanent and visible to everyone. Stock is 99, order #9001 exists, the wallet is charged.",
      why: "Commit is the single moment the transaction 'counts'. Before it, nothing is real; after it, everything is — there is no in-between visible to other sessions.",
      how: "The database writes a <b>commit record</b> to the WAL and <code>fsync</code>s it. Only once that write is durable does <code>COMMIT</code> return success. The XID is now marked committed, so every new snapshot sees all three changes at once.",
      when: "At the end of every successful transaction.",
      mistake: "Treating <code>COMMIT</code> as a formality that always succeeds instantly. It can fail (disk full, serialization conflict) — and it's the one statement whose failure means the transaction did <i>not</i> happen.",
      interview: "“What makes COMMIT atomic across three tables?” A single durable commit record flips the whole transaction from invisible to visible — readers never see a subset.",
      example: "COMMIT returns; ShopKart shows 'Order placed'. From this instant, every shopper sees 99 in stock and the customer's wallet reflects the charge.",
      viz: { txnState: "committed", ops: ops(["committed", "committed", "committed"]), flags: { A: true, C: true, I: true, D: false }, hotOp: null,
        note: "One durable commit record makes all three writes visible in the same instant." }
    },
    {
      label: "7 · Durability — it survives the crash",
      what: "One millisecond after <code>COMMIT</code> returns, the power fails. On restart the order is <b>still there</b>. A committed transaction cannot be lost.",
      why: "This is the <b>D</b> in ACID. 'Committed' is a promise: the data will survive crashes, restarts, and power loss. That promise is what lets ShopKart tell the customer 'Order confirmed' and mean it.",
      how: "COMMIT didn't return until the WAL commit record was <code>fsync</code>'d to stable storage. Even if the modified data pages were still in memory (not yet written to the data files), recovery <b>redoes</b> them from the WAL. The log is the source of truth.",
      when: "Always, for every committed transaction — durability is unconditional once COMMIT returns.",
      mistake: "Assuming the data pages themselves must be flushed at commit. They needn't be — durability rides on the sequential WAL fsync, and dirty pages are flushed lazily later (see Write-Ahead Log &amp; Checkpoints).",
      interview: "“How is a committed transaction durable if its data pages are still in RAM at crash time?” The WAL record was fsync'd before COMMIT returned; recovery replays it to reconstruct the pages.",
      example: "ShopKart's database node reboots after a power event; order #9001 and the wallet charge are intact because their WAL records were durable before the customer ever saw 'Order placed'.",
      viz: { txnState: "committed", ops: ops(["committed", "committed", "committed"]), flags: { A: true, C: true, I: true, D: true }, hotOp: null,
        note: "All four ACID guarantees delivered. The WAL made 'committed' mean 'permanent'." }
    }
  ];

  function buildViz(host) {
    host.classList.add("dd-viz");
    var FLAGS = [
      { k: "A", name: "Atomicity", note: "all-or-nothing" },
      { k: "C", name: "Consistency", note: "invariants hold" },
      { k: "I", name: "Isolation", note: "no partial reads" },
      { k: "D", name: "Durability", note: "survives crashes" }
    ];
    function opRow(o, hot) {
      var cls = "dd-op is-" + o.state + (hot ? " hot" : "");
      var chip = { pending: '<span class="dd-chip">pending</span>',
        applied: '<span class="dd-chip dd-chip--info">applied</span>',
        committed: '<span class="dd-chip dd-chip--ok">committed</span>',
        undone: '<span class="dd-chip dd-chip--bad">rolled back</span>' }[o.state] || "";
      return '<div class="' + cls + '"><span class="dd-op-icon">' + o.icon + "</span>" +
        '<span class="dd-op-sql">' + o.sql + "</span>" +
        '<span class="dd-op-status">' + chip + "</span></div>";
    }
    function update(idx, step) {
      var s = step && step.viz;
      if (idx < 0 || !s) {
        host.innerHTML = '<div class="dd-empty">Press <b>Play</b> to place one ShopKart order as a single transaction — ' +
          "and watch each ACID guarantee (Atomicity, Consistency, Isolation, Durability) prove itself.</div>";
        return;
      }
      var stateChip = { open: '<span class="dd-txn-state is-open">● transaction OPEN</span>',
        committed: '<span class="dd-txn-state is-committed">✔ COMMITTED</span>',
        aborted: '<span class="dd-txn-state is-aborted">✖ ROLLED BACK</span>' }[s.txnState];
      var html = '<div class="dd-section"><div class="dd-txn-head">' +
        '<div class="dd-section-label">Order #9001 · one atomic unit</div>' + stateChip + "</div>" +
        '<div class="dd-oplist">' + s.ops.map(function (o, i) { return opRow(o, s.hotOp === i); }).join("") + "</div></div>";
      html += '<div class="dd-section"><div class="dd-section-label">ACID guarantees</div><div class="dd-flags">' +
        FLAGS.map(function (f) {
          var on = s.flags[f.k];
          return '<div class="dd-flag' + (on ? " on" : "") + '"><span class="dd-flag-letter">' + f.k + "</span>" +
            '<span class="dd-flag-name">' + f.name + "</span><span class=\"dd-flag-note\">" + f.note + "</span></div>";
        }).join("") + "</div>";
      if (s.note) html += '<div class="dd-note">' + s.note + "</div>";
      html += "</div>";
      host.innerHTML = html;
    }
    return { update: update, destroy: function () { host.innerHTML = ""; host.classList.remove("dd-viz"); } };
  }

  DL.deepDives["transactions"] = {
    slug: "transactions",
    overview: {
      what: "A <b>transaction</b> is a group of database operations treated as one indivisible unit — it either happens completely or not at all. Its guarantees are summarized as <b>ACID</b>: Atomicity, Consistency, Isolation, Durability.",
      why: "Real actions span multiple writes: an order reserves stock, records the order, and takes payment. Without transactions, a crash or error between those writes leaves the database in a nonsensical half-state — money taken with no order, stock sold twice. ACID is the contract that makes multi-step changes safe.",
      how: "You wrap the writes in <code>BEGIN … COMMIT</code>. The database keeps them isolated and provisional until COMMIT, validates constraints (Consistency), makes the flip atomic, and uses the write-ahead log to guarantee the result is durable and any failure rolls back cleanly."
    },
    steps: STEPS,
    buildViz: buildViz,
    code: {
      title: "One order as one atomic transaction",
      lang: "sql",
      code:
        "BEGIN;                                    -- open the atomic unit\n" +
        "UPDATE products SET stock = stock - 1     -- reserve the unit\n" +
        "  WHERE sku = 42;\n" +
        "INSERT INTO orders (id, sku, qty, usr)    -- record the order\n" +
        "  VALUES (9001, 42, 1, 77);\n" +
        "UPDATE wallets SET balance = balance - 499 -- take payment\n" +
        "  WHERE usr = 77;\n" +
        "COMMIT;                                    -- all three become permanent, together\n" +
        "-- Crash or error before COMMIT? None of it happened. That is Atomicity.",
      highlights: [1, 8, 9]
    },
    reference: [
      ["ACID", "Atomicity · Consistency · Isolation · Durability — the transaction guarantees"],
      ["Atomicity", "All operations commit, or none do — no partial application"],
      ["Consistency", "A committed transaction leaves the DB in a valid state (constraints/invariants hold)"],
      ["Isolation", "Concurrent transactions don't see each other's uncommitted work"],
      ["Durability", "Once COMMIT returns, the change survives crashes and power loss"],
      ["BEGIN", "Opens a transaction; writes are provisional until COMMIT"],
      ["COMMIT", "Makes all the transaction's writes permanent and visible, atomically"],
      ["ROLLBACK", "Discards all the transaction's writes as if it never ran"],
      ["autocommit", "Driver mode where each lone statement is its own transaction"]
    ],
    internals:
      "<p>ACID isn't one mechanism — it's four guarantees delivered by different parts of the engine, working together:</p>" +
      "<p><b>Atomicity &amp; Durability</b> come from the <b>write-ahead log (WAL)</b>. Undo information lets recovery roll back a crashed transaction (atomicity); a durable, fsync'd commit record lets recovery redo committed changes that hadn't reached the data files (durability). COMMIT does not return until that record is on stable storage.</p>" +
      "<p><b>Isolation</b> comes from the concurrency-control mechanism — <b>MVCC</b>, locking, or both — tuned by the <b>isolation level</b>. It decides what one transaction can see of another's in-flight work.</p>" +
      "<p><b>Consistency</b> is the emergent property: declared constraints are enforced at write/commit time, and the other three guarantees ensure no transaction ever observes or leaves an invalid state. The invariants you <i>don't</i> declare are still your application's responsibility.</p>",
    engineering:
      "<p>Transactions are the most-used correctness tool in your kit, and misusing them is a top source of production incidents. The discipline: <b>make the transaction exactly as wide as the invariant it protects</b> — no wider, no narrower.</p>" +
      "<p>Keep them <b>short</b>. A transaction held open across a network call, a queue publish, or user 'are you sure?' input keeps locks and pins the MVCC horizon, throttling everyone else. Do slow work <i>before</i> BEGIN or <i>after</i> COMMIT. And because a COMMIT can fail (serialization conflict, disk full), treat ret/idempotency as part of the design: an idempotency key means a client retry after an ambiguous COMMIT can't double-charge.</p>",
    gotchas: [
      { kind: "tip", html: "<b>The transaction is the unit of atomicity — not the statement.</b> Everything that must be all-or-nothing goes inside <i>one</i> <code>BEGIN … COMMIT</code>. Two separate transactions can absolutely leave you half-done." },
      { kind: "warn", html: "<b>Consistency (the C) is mostly your job.</b> The database enforces constraints you <i>declare</i>. Business invariants you don't declare are only as safe as your application code — and concurrency (write skew) can still break them under weaker isolation." },
      { kind: "info", html: "<b>Autocommit is on by default in most drivers.</b> Each lone statement silently becomes its own transaction. Multi-statement atomicity requires an explicit <code>BEGIN</code> (or a transactional block/ORM unit-of-work)." }
    ],
    failureModes:
      "<p><b>Half-applied business state (no transaction):</b> charging the wallet in one autocommit statement, then failing to insert the order — money gone, no order. <i>Fix:</i> wrap both in a single transaction so they commit or roll back together.</p>" +
      "<p><b>Long-open transactions:</b> a BEGIN left open across app logic holds row locks and pins the MVCC xmin horizon, blocking other writers and starving VACUUM. <i>Fix:</i> keep transactions short; never wait on I/O or user input inside one.</p>" +
      "<p><b>Assuming C is automatic:</b> undeclared invariants (loyalty points = order total × rate) drift under concurrency. <i>Fix:</i> declare constraints where possible, and pick an isolation level strong enough for the invariant.</p>" +
      "<p><b>Ignoring COMMIT failures / retries:</b> a client that resends a request after an ambiguous COMMIT can double-apply it. <i>Fix:</i> idempotency keys and safe retry logic.</p>",
    quickCheck: [
      {
        q: "Your app charges the wallet in one statement, then inserts the order in a separate statement (autocommit on), and the server crashes between them. What state is the database in?",
        options: [
          "Neither applied — the crash rolled everything back",
          "Both applied — the database finished them for you",
          "Only the charge applied — money taken, no order",
          "The database blocks until you retry"
        ],
        answer: 2,
        why: "Two separate autocommit statements are two transactions. The first committed durably; the second never ran. Atomicity only spans ONE transaction — wrap both in a single BEGIN/COMMIT to make them all-or-nothing.",
        diff: "medium"
      },
      {
        q: "Which ACID property guarantees a concurrent SELECT never sees your half-finished order?",
        options: ["Atomicity", "Consistency", "Isolation", "Durability"],
        answer: 2,
        why: "Isolation governs what one transaction can see of another's uncommitted work. Your writes stay private until COMMIT.",
        diff: "easy"
      },
      {
        q: "COMMIT returns success, then the power fails one millisecond later — before the changed data pages were written to the data files. Where is your committed data?",
        options: [
          "Safe — COMMIT fsync'd the WAL record before returning; recovery redoes the pages",
          "Lost — it was still only in memory",
          "Safe only if a checkpoint had run",
          "Undefined — depends on autocommit"
        ],
        answer: 0,
        why: "Durability rides on the WAL, not on flushing data pages. COMMIT doesn't return until the commit record is fsync'd; on restart, recovery replays it to reconstruct the pages.",
        diff: "medium"
      }
    ],
    interviewQs: [
      {
        q: "What does ACID stand for, and which part of the database delivers each letter?",
        a: "Atomicity, Consistency, Isolation, Durability. Atomicity and Durability come from the write-ahead log: undo data lets recovery roll back an aborted transaction, and a durable fsync'd commit record lets it redo committed work that hadn't reached the data files. Isolation comes from the concurrency-control mechanism (MVCC and/or locking), governed by the isolation level. Consistency is the emergent guarantee that a committed transaction moves the database from one valid state to another — delivered by declared constraints plus the other three properties plus correct application logic.",
        tip: "Naming the mechanism behind each letter (WAL, MVCC/locks, constraints) is what separates a memorized answer from an understood one."
      },
      {
        q: "Is the 'C' in ACID the same as the 'C' in CAP?",
        a: "No — they're different concepts that share a letter. ACID Consistency means each transaction preserves the database's declared invariants and constraints (a local, single-node correctness property). CAP Consistency means linearizability across replicas: every read observes the most recent committed write, system-wide. You can have an ACID-consistent database that is CAP-inconsistent (a stale read replica), and vice versa.",
        tip: "This is a classic 'gotcha' question — leading with 'different C, different scope' immediately shows you understand both."
      },
      {
        q: "How would you safely transfer money between two accounts?",
        a: "One transaction containing the debit, the credit, and the invariant check (e.g. balance ≥ 0), so they're atomic. Choose isolation strong enough for the invariant — SERIALIZABLE or an explicit SELECT … FOR UPDATE on both rows to prevent lost updates and write skew. Add an idempotency key so a client retry after an ambiguous COMMIT doesn't double-apply. Durability from the WAL guarantees a confirmed transfer survives a crash. Optionally reconcile with a ledger table rather than mutating balances in place.",
        tip: "Interviewers probe two follow-ups: 'what if two transfers touch the same account at once?' (locking/isolation) and 'what if the client times out on COMMIT?' (idempotency)."
      }
    ],
    businessLens: {
      task: "ShopKart 'Place Order' — stock, orders, and wallet in one transaction",
      meaning: "A customer is either fully charged-with-order, or not at all — never charged without an order.",
      system: "OLTP checkout pipeline (Postgres)",
      point: "When a shopper taps Place Order, ShopKart reserves stock, writes the order row, and debits the wallet inside a single transaction. If anything fails — out of stock, insufficient balance, a crash — the whole thing rolls back and the customer sees a clean error with no phantom charge. When COMMIT returns, all three are permanent and survive a node reboot. That single boundary is the difference between a trustworthy checkout and a support queue full of 'charged but no order' tickets."
    }
  };
})();
