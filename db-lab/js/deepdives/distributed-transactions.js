/* ============================================================
   deepdives/distributed-transactions.js — "Distributed Transactions"
   deep dive. Registers DBLab.deepDives['distributed-transactions']
   (concept m91). Authored against the contract in deepdives/mvcc.js.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  DL.deepDives = DL.deepDives || {};

  // Scene: ShopKart "place order" spans three services — Inventory, Payment,
  // Shipping — with no shared database transaction. We contrast 2PC with the
  // Saga pattern (forward steps + compensations) and the outbox pattern.
  var STEPS = [
    {
      label: "1 · A business transaction across services",
      what: "Placing a ShopKart order is one logical transaction that spans three <b>independent services</b>, each with its own database: <b>reserve stock</b> (Inventory), <b>charge payment</b> (Payment), <b>create shipment</b> (Shipping). No single database transaction can cover all three.",
      why: "Once state is split across services/shards, the neat ACID transaction you'd use in one database is gone. You still need the business invariant — 'either the whole order happens or none of it' — but you have to build it from local transactions plus a coordination pattern.",
      how: "Each service can commit locally in its own DB. The problem is making the <i>combination</i> atomic (or at least consistent) without a shared log.",
      when: "Microservices, sharded data, or any workflow touching multiple databases/queues.",
      mistake: "Doing the three calls with no coordination and hoping. A failure partway leaves money charged with no shipment — a broken invariant and an angry customer.",
      interview: "“Why are distributed transactions hard?” State is split across independent databases with no shared commit, so you can't get ACID atomicity for free — you need 2PC or a saga.",
      example: "Order #900: reserve 1 unit, charge $40, create a shipment. Three services, one outcome the customer expects to be all-or-nothing.",
      viz: {
        forward: [
          { n: "T1 · Reserve stock", s: "Inventory svc", cls: "pending" },
          { n: "T2 · Charge payment", s: "Payment svc", cls: "pending" },
          { n: "T3 · Create shipment", s: "Shipping svc", cls: "pending" }
        ],
        verdict: { k: "warn", html: "<b>One business transaction, three services.</b> No single DB transaction spans them — you must build atomicity from local commits + coordination." },
        note: "Split state means no free ACID atomicity. Two options: a distributed commit (2PC) or a saga of local transactions with compensations."
      }
    },
    {
      label: "2 · Option A — 2PC (strong, but heavy)",
      what: "One option is <b>two-phase commit</b>: a coordinator makes all three services prepare, lock, and vote, then commit together. It gives true atomicity — but it <b>holds locks across services</b> for the whole protocol and <b>blocks</b> if the coordinator fails.",
      why: "2PC's costs — distributed locks, coordinator coupling, poor availability and latency — are tolerable for a couple of tightly-coupled databases but painful across many services on the request path. That pain is what motivates the saga alternative.",
      how: "Coordinator: PREPARE → collect YES votes → log COMMIT → COMMIT. Correct, but every participant holds locks the entire time, and an in-doubt participant blocks until recovery.",
      when: "A small, stable set of resources needing strict, immediate atomicity (XA across two databases).",
      mistake: "Wrapping a long, multi-service workflow in 2PC. Held locks and the blocking failure mode wreck throughput and availability at scale.",
      interview: "“When is 2PC the wrong tool?” Across many services / long-lived workflows — the locks and coordinator coupling kill availability and latency; use a saga.",
      example: "ShopKart could 2PC these three, but the payment call alone can take seconds — holding stock and shipping locks that whole time would throttle checkout.",
      viz: {
        forward: [
          { n: "T1 · Reserve stock", s: "🔒 locked (2PC)", cls: "active" },
          { n: "T2 · Charge payment", s: "🔒 locked · slow", cls: "active" },
          { n: "T3 · Create shipment", s: "🔒 locked (2PC)", cls: "active" }
        ],
        verdict: { k: "warn", html: "<b>2PC:</b> true atomicity, but all three hold locks for the whole protocol and block on coordinator failure. Heavy for cross-service flows." },
        note: "2PC gives strict atomicity for a few tightly-coupled resources. Across many services its locks + coordinator coupling cripple availability."
      }
    },
    {
      label: "3 · Option B — a Saga of local transactions",
      what: "A <b>saga</b> runs the workflow as a sequence of <b>local</b> transactions — each service commits in its own DB immediately — and defines a <b>compensating action</b> for each step to undo it. On the happy path: T1 reserve → T2 charge → T3 ship, each committing locally, no distributed locks.",
      why: "Sagas trade strict atomicity for <b>availability and scale</b>: no held cross-service locks, no coordinator blocking, and each service stays autonomous. The system is <b>eventually consistent</b> — briefly, some steps are done and others aren't — which most business workflows tolerate.",
      how: "Each step Tᵢ commits locally and triggers the next. Each has a compensation Cᵢ that semantically undoes it (release the reservation, refund the charge). There is no rollback of an already-committed local transaction — you <i>compensate</i> it.",
      when: "Cross-service business transactions: orders, bookings, onboarding — anywhere eventual consistency is acceptable.",
      mistake: "Assuming a compensation perfectly reverses a step. It's a <i>new</i> transaction with business meaning (a refund, not an un-charge) and must be designed — some effects (an email sent) can't be undone.",
      interview: "“What is a saga?” A sequence of local transactions, each with a compensating action; on failure you run the compensations to undo completed steps — eventual consistency instead of distributed locks.",
      example: "ShopKart's order saga: reserve stock, charge card, create shipment — each a fast local commit, no service waiting on another's lock.",
      viz: {
        forward: [
          { n: "T1 · Reserve stock", s: "local commit ✓", cls: "done" },
          { n: "T2 · Charge payment", s: "local commit ✓", cls: "done" },
          { n: "T3 · Create shipment", s: "local commit ✓", cls: "done" }
        ],
        comps: [
          { n: "C1 · Release stock", s: "undo T1", cls: "pending" },
          { n: "C2 · Refund payment", s: "undo T2", cls: "pending" }
        ],
        verdict: { k: "ok", html: "<b>Saga (happy path):</b> each step commits locally and triggers the next. No distributed locks. Compensations wait, unused." },
        note: "A saga = local transactions + a compensating action per step. Eventual consistency, service autonomy, no cross-service locks."
      }
    },
    {
      label: "4 · Orchestration vs choreography",
      what: "Two ways to drive a saga. <b>Orchestration</b>: a central orchestrator explicitly calls each step and decides what's next (and what to compensate). <b>Choreography</b>: services react to each other's <b>events</b> — 'stock reserved' triggers 'charge payment', and so on — with no central brain.",
      why: "It's a coupling/visibility tradeoff. Orchestration centralizes the workflow logic (easy to see and change, but a component to own); choreography is loosely coupled and scalable but the flow is emergent and harder to trace end-to-end.",
      how: "Orchestrator: a state machine (e.g. Temporal, a saga service) invokes T1..Tn and triggers Cn..C1 on failure. Choreography: each service publishes domain events and subscribes to the ones that should trigger its step; compensations are event-driven too.",
      when: "Orchestration for complex flows needing visibility/control; choreography for simple, highly decoupled event chains.",
      mistake: "Deep choreography for a complex workflow — the logic smears across many services' event handlers and becomes impossible to follow or change safely.",
      interview: "“Orchestration vs choreography for sagas?” Orchestration = central controller (visible, coupled to it); choreography = event-driven, decoupled (emergent, harder to trace). Pick by complexity and observability needs.",
      example: "ShopKart uses an orchestrator for the order saga so the whole flow — and its compensations — lives in one auditable state machine.",
      viz: {
        forward: [
          { n: "T1 · Reserve stock", s: "orchestrator → step 1", cls: "done" },
          { n: "T2 · Charge payment", s: "orchestrator → step 2", cls: "done" },
          { n: "T3 · Create shipment", s: "orchestrator → step 3", cls: "done" }
        ],
        verdict: { k: "info", html: "<b>Orchestration</b> = a central controller drives each step (visible, controllable). <b>Choreography</b> = services react to events (decoupled, emergent)." },
        note: "Drive a saga centrally (orchestrator: one auditable state machine) or via events (choreography: loosely coupled but harder to trace)."
      }
    },
    {
      label: "5 · A step fails → compensate in reverse",
      what: "<b>T3 (create shipment) fails</b> — the address can't be served. The already-committed steps can't be rolled back (they're durable in other services), so the saga runs <b>compensations in reverse</b>: <b>C2 refund the payment</b>, then <b>C1 release the stock</b>. The invariant is restored, eventually.",
      why: "This is the heart of sagas: recovery is <i>forward-written compensation</i>, not rollback. Because each Tᵢ already committed, you can only issue a new transaction that semantically undoes it — and you must do so in the correct (reverse) order.",
      how: "On failure at step k, invoke C(k−1), C(k−2), … C1. Compensations must be <b>idempotent</b> and should be designed to (eventually) succeed with retries, since there's no higher authority to fall back on.",
      when: "Any step failure, timeout, or business rejection after earlier steps committed.",
      mistake: "Forgetting a step is irreversible (a shipped package, a sent email). Order steps so irreversible actions come <b>last</b>, after everything reversible has succeeded.",
      interview: "“How does a saga handle a mid-way failure?” It executes compensating transactions for the completed steps in reverse order to semantically undo them — there's no rollback of committed local transactions.",
      example: "ShopKart's shipment step fails; the saga refunds the card (C2) and releases the reserved unit (C1), leaving the customer whole with no phantom charge.",
      viz: {
        forward: [
          { n: "T1 · Reserve stock", s: "committed", cls: "undone" },
          { n: "T2 · Charge payment", s: "committed", cls: "undone" },
          { n: "T3 · Create shipment", s: "FAILED", cls: "failed" }
        ],
        comps: [
          { n: "C2 · Refund payment", s: "compensating…", cls: "comp" },
          { n: "C1 · Release stock", s: "compensating…", cls: "comp" }
        ],
        verdict: { k: "bad", html: "<b>T3 failed</b> → run compensations in reverse: C2 refund, then C1 release. Committed steps are undone semantically, not rolled back." },
        note: "Recovery = compensating transactions in reverse order. They must be idempotent; put irreversible steps last so there's nothing you can't undo."
      }
    },
    {
      label: "6 · The outbox pattern — no dual-write",
      what: "Sagas rely on 'commit locally <b>and</b> publish an event', but that's a <b>dual write</b> to two systems (DB + broker) that can't be atomic — a crash between them loses the event or the state. The <b>transactional outbox</b> fixes it: write the event into an <b>outbox table in the same local transaction</b>, then a relay publishes it.",
      why: "Without the outbox, a saga step can commit its DB change but fail to publish the 'next step' event (or vice-versa), silently stalling or duplicating the workflow. The outbox makes 'state changed' and 'event recorded' atomic, so the event is never lost.",
      how: "In one local transaction: update the business tables <b>and</b> insert a row into <code>outbox</code>. A separate relay (polling the table, or tailing the DB's change log via CDC) publishes those rows to the broker <b>at-least-once</b>, marking them sent. Consumers dedupe by event ID.",
      when: "Any event-driven saga / integration where a DB write must reliably produce a message.",
      mistake: "Publishing to the broker directly inside the request after the DB commit. If the process dies in between, you get a committed change with no event — the classic dual-write inconsistency.",
      interview: "“How do you reliably publish an event when you commit state?” The transactional outbox: write the event to an outbox table in the same transaction, then relay it (poller or CDC) at-least-once, with idempotent consumers.",
      example: "ShopKart's Payment service writes the charge and an <code>order.paid</code> outbox row in one transaction; a relay publishes it, so the shipment step is triggered exactly the intended number of times.",
      viz: {
        forward: [
          { n: "Local txn", s: "update DB + insert OUTBOX row", cls: "done" },
          { n: "Relay", s: "poll/CDC → publish event", cls: "active" },
          { n: "Consumer", s: "dedupe by id · next step", cls: "pending" }
        ],
        verdict: { k: "info", html: "<b>Outbox:</b> write state + event in ONE local transaction, then relay the event at-least-once. Kills the dual-write gap; consumers dedupe by id." },
        note: "Avoid dual-writes: the event goes into an outbox table atomically with the state change; a relay (poller/CDC) publishes it reliably."
      }
    },
    {
      label: "7 · Choosing: 2PC vs Saga + Outbox",
      what: "The decision. <b>2PC</b> for a <b>small, stable</b> set of tightly-coupled resources needing <b>strict, immediate</b> atomicity (an XA write across two databases). <b>Saga + outbox</b> for <b>cross-service, longer-lived</b> workflows that can accept <b>eventual</b> consistency — the default at microservice scale.",
      why: "There's no free lunch: 2PC buys atomicity with locks and blocking; sagas buy availability and autonomy with eventual consistency, compensation logic, and idempotency work. Matching the pattern to the shape of the work is the skill.",
      how: "Ask: how many services, how long-lived, and can it tolerate a brief inconsistent window? Few + short + must-be-atomic → 2PC. Many + long + eventually-consistent-ok → saga with an orchestrator and outbox-backed events, idempotent steps, and designed compensations.",
      when: "Every time you have a transaction that won't fit in one database.",
      mistake: "Defaulting to 2PC everywhere (throughput/availability collapse) or sagas everywhere (needless complexity for a simple two-DB atomic write). Choose per workflow.",
      interview: "“2PC or saga — how do you choose?” By coupling, duration, and consistency tolerance: 2PC for a few tightly-coupled resources needing strict atomicity; saga+outbox for scalable, eventually-consistent, multi-service flows.",
      example: "ShopKart keeps 2PC for a tight wallet+ledger debit, and runs the order → payment → shipment journey as an orchestrated saga with outbox events and idempotent, compensatable steps.",
      viz: {
        forward: [
          { n: "T1 · Reserve stock", s: "saga · idempotent", cls: "done" },
          { n: "T2 · Charge payment", s: "saga · outbox event", cls: "done" },
          { n: "T3 · Create shipment", s: "saga · compensatable", cls: "done" }
        ],
        verdict: { k: "ok", html: "<b>Choose by shape:</b> 2PC = few tightly-coupled resources, strict atomicity. Saga + outbox = many services, longer-lived, eventual consistency." },
        note: "Match the pattern to the work. Most cross-service flows are sagas (orchestrated, outbox-backed, idempotent, compensatable); 2PC stays niche."
      }
    }
  ];

  function buildViz(host) {
    host.classList.add("dd-viz");
    function stepHtml(st) {
      return '<div class="dd-saga-step ' + (st.cls || "") + '">' +
        '<div class="dd-saga-name">' + st.n + "</div>" +
        '<div class="dd-saga-sub">' + st.s + "</div></div>";
    }
    function row(steps, back) {
      var arrow = '<span class="dd-saga-arrow' + (back ? " back" : "") + '">' + (back ? "↩" : "→") + "</span>";
      return '<div class="dd-saga">' + steps.map(stepHtml).join(arrow) + "</div>";
    }
    function update(idx, step) {
      var s = step && step.viz;
      if (idx < 0 || !s) {
        host.innerHTML = '<div class="dd-empty">Press <b>Play</b> to run ShopKart\'s order across three services — ' +
          "why one DB transaction can't span them, 2PC vs the Saga pattern, compensations on failure, and the outbox pattern.</div>";
        return;
      }
      var html = '<div class="dd-section"><div class="dd-section-label">Workflow · ShopKart place-order (3 services)</div>';
      if (s.verdict) html += '<div class="dd-verdict ' + s.verdict.k + '">' + s.verdict.html + "</div>";
      html += '<div class="dd-sub-label" style="margin-top:6px">Forward path</div>' + row(s.forward, false);
      if (s.comps) html += '<div class="dd-sub-label" style="margin-top:10px">Compensations (reverse order)</div>' + row(s.comps, true);
      html += "</div>";
      if (s.note) html += '<div class="dd-note">' + s.note + "</div>";
      host.innerHTML = html;
    }
    return { update: update, destroy: function () { host.innerHTML = ""; host.classList.remove("dd-viz"); } };
  }

  DL.deepDives["distributed-transactions"] = {
    slug: "distributed-transactions",
    overview: {
      what: "A <b>distributed transaction</b> spans multiple independent databases/services, so no single ACID transaction can make it atomic. Two patterns bridge the gap: <b>2PC</b> (a coordinated atomic commit) and the <b>Saga</b> (a sequence of local transactions with compensating actions).",
      why: "Once data is split across services/shards, you lose free atomicity but still owe the business invariant ('all of the order, or none'). The choice of pattern is a fundamental tradeoff: 2PC gives strict atomicity with locks and blocking; sagas give availability and autonomy with <b>eventual</b> consistency.",
      how: "2PC: prepare/vote then commit/abort — atomic but locking and blocking, fit for a few tightly-coupled resources. Saga: each step commits locally and defines a <b>compensation</b>; on failure, run compensations in reverse to undo. Reliable event delivery between saga steps uses the <b>transactional outbox</b> (write state + event in one local transaction, relay at-least-once)."
    },
    steps: STEPS,
    buildViz: buildViz,
    code: {
      title: "A saga (orchestrated) with compensations + outbox events",
      lang: "text",
      code:
        "# Each step is a LOCAL transaction; each has a compensation. No global lock.\n" +
        "saga PlaceOrder:\n" +
        "  T1 reserveStock   compensate C1 releaseStock\n" +
        "  T2 chargePayment  compensate C2 refundPayment\n" +
        "  T3 createShipment compensate (none needed if last)\n" +
        "\n" +
        "run():\n" +
        "  done = []\n" +
        "  for (Ti, Ci) in steps:\n" +
        "     ok = Ti()                      # local commit in that service's DB\n" +
        "     if not ok:\n" +
        "        for Cj in reverse(done): Cj()   # compensate completed steps, in reverse\n" +
        "        return ABORTED\n" +
        "     done.append(Ci)\n" +
        "  return COMMITTED\n" +
        "\n" +
        "# OUTBOX (reliable 'commit + publish', no dual write):\n" +
        "#   BEGIN; update business_tables; INSERT INTO outbox(event); COMMIT;\n" +
        "#   relay: poll/CDC the outbox -> publish at-least-once -> consumer dedupes by id\n" +
        "# Compensations & steps must be IDEMPOTENT; put irreversible steps LAST.",
      highlights: [10, 11, 18]
    },
    reference: [
      ["distributed transaction", "One logical transaction across ≥2 independent databases/services"],
      ["2PC", "Coordinated atomic commit: prepare/vote then commit/abort (locking, blocking)"],
      ["saga", "Sequence of local transactions, each with a compensating action"],
      ["compensation (Cᵢ)", "A new transaction that semantically undoes a committed step"],
      ["orchestration", "A central controller drives the saga steps/compensations"],
      ["choreography", "Services react to each other's events; no central controller"],
      ["eventual consistency", "The invariant holds after steps/compensations settle, not instantly"],
      ["dual write", "Writing to DB and broker separately — not atomic (the bug outbox fixes)"],
      ["transactional outbox", "Write state + event in one local txn; relay publishes at-least-once"],
      ["idempotency", "Steps/compensations safe to retry; consumers dedupe by event id"]
    ],
    internals:
      "<p>When a transaction spans independent databases there's no shared log, so ACID atomicity isn't free. <b>2PC</b> recreates it with a coordinator (prepare/vote, then commit/abort) — strictly atomic, but it holds locks across all participants for the whole protocol and blocks if the coordinator fails, which is why it suits only a small, stable set of tightly-coupled resources.</p>" +
      "<p>The <b>saga</b> pattern takes the opposite trade. It runs the workflow as a chain of <b>local</b> transactions — each service commits immediately in its own DB — and pairs each step Tᵢ with a <b>compensation</b> Cᵢ that semantically undoes it. On a mid-way failure there's nothing to roll back (earlier steps are durably committed elsewhere), so the saga executes the compensations <b>in reverse order</b>: a refund for a charge, a release for a reservation. This yields <b>eventual consistency</b> and full service autonomy with no distributed locks. Two design rules matter: compensations (and steps) must be <b>idempotent</b> because everything is retried, and <b>irreversible steps go last</b> so there's always a valid compensation for whatever came before. Sagas are driven by an <b>orchestrator</b> (a central state machine — visible, controllable) or by <b>choreography</b> (event reactions — decoupled but emergent and harder to trace).</p>" +
      "<p>Event-driven sagas hit the <b>dual-write</b> problem: 'commit the DB change and publish the next-step event' touches two systems and can't be atomic, so a crash between them loses the event or the state. The <b>transactional outbox</b> solves it by writing the event into an <code>outbox</code> table <i>in the same local transaction</i> as the state change; a separate relay (polling or CDC) publishes those rows <b>at-least-once</b>, and consumers dedupe by event id. That makes 'state changed' and 'event emitted' atomic without a distributed transaction.</p>",
    engineering:
      "<p>Choose per workflow by three questions: how many resources, how long-lived, and can it tolerate a brief inconsistent window? A <b>few</b> tightly-coupled resources needing <b>strict, immediate</b> atomicity → 2PC. <b>Many</b> services, <b>longer-lived</b>, eventual-consistency-acceptable → a <b>saga</b>, which is the default at microservice scale. Don't default to either everywhere: 2PC everywhere collapses availability; sagas for a simple two-DB atomic write is needless complexity.</p>" +
      "<p>Build sagas with an <b>orchestrator</b> (Temporal, a saga/state-machine service) for anything non-trivial, so the flow and its compensations are auditable in one place. Make every step and compensation <b>idempotent</b> (retries are inevitable), order steps so <b>irreversible</b> actions (shipping, emails) come last, and design compensations as real business operations (a refund, not a magic un-charge) — accepting that some effects can only be mitigated, not truly undone. Wire inter-step events through the <b>transactional outbox</b> (poller or CDC like Debezium) so you never lose or silently duplicate a step, and always dedupe on the consumer by event id.</p>",
    gotchas: [
      { kind: "tip", html: "<b>Sagas compensate, they don't roll back.</b> Completed local transactions are durable; recovery runs new compensating transactions in reverse order. Design them as real business operations (refund, release) and make them idempotent." },
      { kind: "warn", html: "<b>Beware the dual write.</b> 'Commit the DB then publish an event' isn't atomic — a crash between them loses the event or the state. Use the transactional outbox (write event in the same transaction, relay separately)." },
      { kind: "info", html: "<b>Put irreversible steps last.</b> Once you've shipped the package or sent the email there's no compensation — order the saga so everything reversible succeeds before any irreversible action runs." }
    ],
    failureModes:
      "<p><b>Dual-write inconsistency:</b> a step commits its DB change but fails to publish the event (or vice-versa), stalling or duplicating the workflow. <i>Fix:</i> transactional outbox + at-least-once relay + idempotent consumers.</p>" +
      "<p><b>Irreversible step with no compensation:</b> an email sent or package shipped can't be undone. <i>Fix:</i> order irreversible steps last; mitigate rather than 'undo'.</p>" +
      "<p><b>Non-idempotent retries:</b> a retried step/compensation double-charges or double-refunds. <i>Fix:</i> idempotency keys and dedupe by event id.</p>" +
      "<p><b>2PC misuse across services:</b> held locks + coordinator blocking cripple availability/latency. <i>Fix:</i> use a saga for cross-service, longer-lived flows.</p>",
    quickCheck: [
      {
        q: "In a saga, how is a mid-way failure handled after earlier steps already committed?",
        options: [
          "The database rolls back all the committed local transactions",
          "Compensating transactions run in reverse order to semantically undo the completed steps",
          "The whole workflow is retried from the start automatically",
          "Nothing — sagas can't recover from partial failure"
        ],
        answer: 1,
        why: "Committed local transactions can't be rolled back, so a saga issues compensating transactions (a refund for a charge, a release for a reservation) in reverse order to restore the invariant. Recovery is forward-written compensation, not rollback.",
        diff: "easy"
      },
      {
        q: "Why does an event-driven saga need the transactional outbox?",
        options: [
          "To make events smaller",
          "Because 'commit the DB change and publish the event' is a dual write that isn't atomic; writing the event to an outbox table in the same transaction (relayed later) makes it reliable",
          "To avoid using a message broker at all",
          "Because sagas require two-phase commit"
        ],
        answer: 1,
        why: "Committing state and publishing an event touch two systems and can't be atomic — a crash between them loses one. The outbox writes the event into a table in the same local transaction, and a relay (poller/CDC) publishes it at-least-once, so the event is never lost; consumers dedupe by id.",
        diff: "medium"
      },
      {
        q: "You have a cross-service order → payment → shipment flow that can tolerate a brief inconsistent window. Which pattern fits and why?",
        options: [
          "2PC — it's the only correct option for multiple services",
          "A saga with compensations (and outbox events) — it avoids distributed locks and coordinator blocking, accepting eventual consistency",
          "A single database transaction across all three services",
          "No pattern — just call the services in order and ignore failures"
        ],
        answer: 1,
        why: "For many services and a longer-lived flow that tolerates eventual consistency, a saga avoids the locks and blocking of 2PC: each step commits locally, compensations undo on failure, and outbox-backed events drive the chain reliably. 2PC's held locks would throttle checkout.",
        diff: "medium"
      }
    ],
    interviewQs: [
      {
        q: "How do you keep a business transaction consistent across microservices?",
        a: "Since the state is split across services with no shared transaction, I pick between two patterns. Two-phase commit gives strict atomicity via a coordinator, but it holds locks across services for the whole protocol and blocks on coordinator failure, so I reserve it for a small set of tightly-coupled resources. For most cross-service flows I use a saga: each step is a local transaction that commits in its own service, and each has a compensating action; if a later step fails, I run the compensations in reverse to semantically undo the completed steps — a refund for a charge, a release for a reservation. That gives eventual consistency and service autonomy without distributed locks. I drive it with an orchestrator for visibility, make every step and compensation idempotent, put irreversible actions last, and deliver the inter-step events reliably with the transactional outbox so I never hit the dual-write problem.",
        tip: "Lead with the 2PC-vs-saga choice and its basis, then show the saga mechanics (compensate in reverse, idempotent, irreversible-last, outbox). That full checklist reads as production experience."
      },
      {
        q: "What is the dual-write problem and how does the outbox pattern solve it?",
        a: "The dual-write problem is that a service often needs to both change its database and publish an event (to trigger the next saga step or notify others), but those are two separate systems — the DB and the message broker — and you can't commit them atomically. If you write the DB then publish and the process dies in between, you get a committed change with no event (the workflow stalls); if you publish then write and it dies, you get an event with no state (a phantom). The transactional outbox fixes it by writing the event as a row in an outbox table in the same local transaction as the state change, so they're atomic. A separate relay then reads the outbox — by polling or by tailing the DB change log with CDC like Debezium — and publishes to the broker at-least-once, marking rows sent. Because delivery is at-least-once, consumers must dedupe by event id (idempotent consumers).",
        tip: "Spell out both crash orderings (DB-then-publish and publish-then-DB) — showing why neither is safe is what demonstrates you understand the atomicity gap."
      },
      {
        q: "When would you still choose 2PC over a saga?",
        a: "When the transaction touches a small, stable set of tightly-coupled resources and needs strict, immediate atomicity with no visible intermediate state — for example an XA write across two databases, or a debit-and-ledger update that must be instantaneously all-or-nothing. There, 2PC's guarantees are worth its cost, and the participant set is small enough that the held locks and coordinator coupling are manageable, especially if you replicate the coordinator with Raft to avoid the blocking SPOF. I move to a saga when the flow spans many services, is longer-lived (a payment call taking seconds), or can tolerate a brief inconsistent window — because there 2PC's locks and blocking would wreck availability and latency, and eventual consistency with compensations is perfectly acceptable to the business. So it's really about coupling, duration, and whether an intermediate inconsistent state is tolerable.",
        tip: "Give a concrete 2PC-appropriate case (two-DB XA / debit+ledger) and the axes for the decision (coupling, duration, tolerance of an inconsistent window). Concreteness beats 'it depends'."
      }
    ],
    businessLens: {
      task: "Placing a ShopKart order across Inventory, Payment, and Shipping services",
      meaning: "The order is all-or-nothing to the customer, without locking three services together.",
      system: "Orchestrated saga with compensations + transactional outbox",
      point: "ShopKart's checkout spans three services with separate databases, so there's no single transaction to lean on. Rather than 2PC — which would hold stock and shipping locks for the seconds a payment takes and block if its coordinator failed — ShopKart runs an orchestrated saga: reserve stock, charge payment, create shipment, each a fast local commit. If shipment can't be fulfilled, the saga refunds the payment and releases the stock in reverse, leaving the customer whole. Steps are idempotent, the irreversible shipment step comes last, and each service emits its next-step event via a transactional outbox so a crash never loses or duplicates a step. ShopKart keeps 2PC only for a tight wallet-plus-ledger debit where strict, instant atomicity is worth the cost."
    }
  };
})();
