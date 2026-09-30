/* ============================================================
   deepdives/two-phase-commit.js — "Two-Phase Commit" deep dive.
   Registers DBLab.deepDives['two-phase-commit'] (concept m60).
   Authored against the contract documented in deepdives/mvcc.js.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  DL.deepDives = DL.deepDives || {};

  var PHASES = ["1 · Prepare (vote)", "2 · Decide", "3 · Commit / Abort"];
  // Scene: ShopKart "place order" spans three resource managers coordinated
  // by a transaction manager. We watch prepare/vote, commit, an abort, and
  // the coordinator-crash blocking problem.
  var STEPS = [
    {
      label: "1 · One transaction across three databases",
      what: "Placing a ShopKart order must atomically touch three separate resource managers: <b>debit the Wallet DB</b>, <b>decrement the Inventory DB</b>, and <b>insert into the Orders DB</b>. A <b>coordinator</b> (transaction manager) must make all three commit — or none.",
      why: "A single-node transaction gets atomicity for free from one WAL. Across independent databases there's no shared log, so you need a protocol to reach one agreed outcome. 2PC is the classic answer: get everyone to <i>promise</i>, then tell everyone to <i>commit</i>.",
      how: "The coordinator drives a two-round protocol with the participants (resource managers). It also keeps its own durable log of the decision — that log is what makes the outcome recoverable.",
      when: "XA/JTA distributed transactions, a transaction spanning shards, or a write across two databases that must be all-or-nothing.",
      mistake: "Doing the three writes sequentially with no protocol ('best effort'). A crash between them leaves money debited with no order — the exact inconsistency 2PC exists to prevent.",
      interview: "“Why can't you just use a normal transaction across two databases?” Each database has its own independent log/commit; there's no shared atomic commit, so you need a cross-node protocol like 2PC.",
      example: "A shopper checks out: wallet −$40, stock −1, order row created. All three, atomically, or the checkout fails cleanly.",
      viz: {
        phase: -1,
        coord: { state: "idle", foot: [{ t: "transaction manager", k: "accent" }], cls: "leader" },
        parts: [
          { id: "Wallet DB", state: "ready", foot: [{ t: "debit $40", k: "info" }], cls: "follower" },
          { id: "Inventory DB", state: "ready", foot: [{ t: "stock −1", k: "info" }], cls: "follower" },
          { id: "Orders DB", state: "ready", foot: [{ t: "insert order", k: "info" }], cls: "follower" }
        ],
        note: "Three independent databases, one business transaction. No shared log → need a protocol for an all-or-nothing outcome. That's 2PC."
      }
    },
    {
      label: "2 · Phase 1 — prepare and vote",
      what: "The coordinator sends <b>PREPARE</b> to all three. Each does its work <b>tentatively</b>, writes a durable <b>prepare record</b> to its own log, takes the necessary <b>locks</b>, and replies <b>YES</b> — a binding promise that it <i>can</i> commit if asked.",
      why: "A YES vote is a promise the participant must be able to honor even across a crash — which is why it forces the change durable and holds locks now. This is what lets the coordinator later decide commit and know everyone will comply.",
      how: "Participant on PREPARE: do the update in a pending state, <code>fsync</code> a prepare log record, keep locks held, vote YES (or vote NO and roll back if it can't). After voting YES it is <b>prepared</b> — it may neither commit nor abort on its own.",
      when: "The first round of every 2PC.",
      mistake: "Thinking a YES vote is advisory. It's a durable commitment: the participant has given up its autonomy and must wait for the coordinator's decision, holding locks meanwhile.",
      interview: "“What does a participant do on PREPARE?” Make the change durable in a prepared state, hold locks, and vote YES/NO — after YES it can only wait for the coordinator's verdict.",
      example: "All three ShopKart databases stage their change, log 'prepared', lock the rows, and vote YES.",
      viz: {
        phase: 0,
        coord: { state: "PREPARE →", foot: [{ t: "awaiting votes", k: "warn" }], cls: "leader hot" },
        parts: [
          { id: "Wallet DB", state: "prepared", foot: [{ t: "vote YES · 🔒", k: "ok" }], cls: "follower hot" },
          { id: "Inventory DB", state: "prepared", foot: [{ t: "vote YES · 🔒", k: "ok" }], cls: "follower hot" },
          { id: "Orders DB", state: "prepared", foot: [{ t: "vote YES · 🔒", k: "ok" }], cls: "follower hot" }
        ],
        note: "PREPARE: each participant makes its change durable in a 'prepared' state, holds locks, and votes YES — a binding promise it can commit."
      }
    },
    {
      label: "3 · The commit point — coordinator decides",
      what: "All votes are YES, so the coordinator writes <b>COMMIT</b> to its <i>own</i> durable log. This log write is the <b>commit point</b>: the instant the transaction's global outcome becomes final and recoverable, before any participant is told.",
      why: "The coordinator's logged decision is the single source of truth. If anything crashes after this point, recovery reads the log and drives everyone to commit — the outcome can't be lost or contradicted.",
      how: "Coordinator: having collected all YES votes, <code>fsync</code> a COMMIT record. Only then move to phase 2. (Had any vote been NO, it would log ABORT instead.)",
      when: "Between the two phases, once all votes are in.",
      mistake: "Ignoring the coordinator's log. Without a durable decision record, a coordinator crash leaves no authority to resolve prepared participants — the protocol's recoverability depends on it.",
      interview: "“What is the commit point in 2PC?” When the coordinator durably logs the COMMIT decision — after that the outcome is fixed and recovery can complete it regardless of crashes.",
      example: "ShopKart's coordinator sees three YES votes and logs COMMIT — the order is now destined to succeed.",
      viz: {
        phase: 1,
        coord: { state: "log COMMIT", foot: [{ t: "commit point ✓", k: "ok" }], cls: "leader hot" },
        parts: [
          { id: "Wallet DB", state: "prepared", foot: [{ t: "waiting · 🔒", k: "warn" }], cls: "follower" },
          { id: "Inventory DB", state: "prepared", foot: [{ t: "waiting · 🔒", k: "warn" }], cls: "follower" },
          { id: "Orders DB", state: "prepared", foot: [{ t: "waiting · 🔒", k: "warn" }], cls: "follower" }
        ],
        note: "All YES → coordinator durably logs COMMIT. This log record is the commit point: the outcome is now final and recoverable."
      }
    },
    {
      label: "4 · Phase 2 — commit and release",
      what: "The coordinator sends <b>COMMIT</b> to all participants. Each makes its prepared change permanent, <b>releases its locks</b>, and acknowledges. The distributed transaction is done — atomically committed across all three databases.",
      why: "Phase 2 turns the promises into reality. Because every participant already made its change durable in phase 1, committing is just flipping state and releasing locks — fast and guaranteed to succeed.",
      how: "Participant on COMMIT: mark the prepared change committed, drop locks, ack. Once the coordinator has all acks (or on recovery, presumed-commit), it can forget the transaction.",
      when: "The second round, after the coordinator logged COMMIT.",
      mistake: "Assuming a participant can refuse in phase 2. It can't — it promised in phase 1. If it's temporarily down, the coordinator retries until it acks.",
      interview: "“Can a participant say no in phase 2?” No — after voting YES it's committed to the coordinator's decision; phase 2 just applies it (with retries if a participant is unreachable).",
      example: "All three ShopKart databases commit: wallet debited, stock decremented, order row live — locks released, checkout succeeds.",
      viz: {
        phase: 2,
        coord: { state: "COMMIT →", foot: [{ t: "done ✓", k: "ok" }], cls: "leader" },
        parts: [
          { id: "Wallet DB", state: "committed", foot: [{ t: "committed · unlocked", k: "ok" }], cls: "follower" },
          { id: "Inventory DB", state: "committed", foot: [{ t: "committed · unlocked", k: "ok" }], cls: "follower" },
          { id: "Orders DB", state: "committed", foot: [{ t: "committed · unlocked", k: "ok" }], cls: "follower" }
        ],
        note: "COMMIT round: participants make the prepared change permanent, release locks, ack. Atomic across all three databases."
      }
    },
    {
      label: "5 · The abort path",
      what: "Suppose <b>Inventory DB votes NO</b> in phase 1 — the item just sold out. Any single NO forces the coordinator to log <b>ABORT</b> and tell everyone to roll back. The wallet debit and order insert are undone; nothing is left half-applied.",
      why: "Atomicity cuts both ways: one participant that can't commit must veto the whole transaction. 2PC guarantees the all-or-<b>nothing</b> half just as strictly as all-or-nothing.",
      how: "Coordinator on any NO (or a vote timeout): <code>fsync</code> ABORT, send ABORT to all prepared participants, which roll back their tentative changes and release locks.",
      when: "Any participant that can't satisfy the operation (constraint violation, out of stock, deadlock, timeout).",
      mistake: "Committing the participants that voted YES anyway. Partial commit breaks atomicity — a NO from anyone must abort everyone.",
      interview: "“What happens if one participant votes NO?” The coordinator logs ABORT and instructs all participants to roll back — a single veto aborts the whole transaction.",
      example: "The last unit sells between add-to-cart and checkout; Inventory votes NO, the order aborts, and the shopper's wallet is never charged.",
      viz: {
        phase: 2,
        coord: { state: "log ABORT →", foot: [{ t: "one NO → abort all", k: "bad" }], cls: "leader" },
        parts: [
          { id: "Wallet DB", state: "aborted", foot: [{ t: "rolled back", k: "warn" }], cls: "follower stale" },
          { id: "Inventory DB", state: "aborted", foot: [{ t: "vote NO · out of stock", k: "bad" }], cls: "down" },
          { id: "Orders DB", state: "aborted", foot: [{ t: "rolled back", k: "warn" }], cls: "follower stale" }
        ],
        note: "Any single NO → coordinator logs ABORT → everyone rolls back and releases locks. All-or-nothing works both ways."
      }
    },
    {
      label: "6 · The blocking problem — coordinator crashes",
      what: "The fatal flaw: the coordinator crashes <b>after</b> participants voted YES but <b>before</b> it broadcasts the decision. The participants are <b>in-doubt</b> — prepared, holding locks, unable to commit or abort on their own. They <b>block</b> until the coordinator recovers.",
      why: "This is why 2PC is called a <b>blocking</b> protocol. A prepared participant gave up its autonomy, so it can't unilaterally decide without risking disagreement with the others. A single coordinator is a single point of failure that can freeze the whole transaction — and its locks.",
      how: "In-doubt participants keep the prepare records and locks, and wait. On restart, the coordinator reads its log: if it had logged COMMIT/ABORT, it re-drives that; if it hadn't reached the commit point, it aborts (presumed abort). Until then, those rows are locked and unavailable.",
      when: "Any coordinator crash, or a partition between coordinator and participants, mid-protocol.",
      mistake: "Letting a participant time out and guess. If one guesses commit and another guesses abort, atomicity is violated — so they must block, which is the cost.",
      interview: "“Why is 2PC called blocking?” If the coordinator fails after votes but before the decision, prepared participants can't safely decide alone — they hold locks and block until it recovers.",
      example: "ShopKart's coordinator dies right after the three YES votes; the wallet, inventory, and order rows stay locked and unreadable until it comes back and reads its log.",
      viz: {
        phase: 1,
        coord: { state: "CRASHED", foot: [{ t: "down mid-protocol", k: "bad" }], cls: "down" },
        parts: [
          { id: "Wallet DB", state: "in-doubt", foot: [{ t: "🔒 in-doubt · blocked", k: "bad" }], cls: "follower stale hot" },
          { id: "Inventory DB", state: "in-doubt", foot: [{ t: "🔒 in-doubt · blocked", k: "bad" }], cls: "follower stale hot" },
          { id: "Orders DB", state: "in-doubt", foot: [{ t: "🔒 in-doubt · blocked", k: "bad" }], cls: "follower stale hot" }
        ],
        note: "Coordinator crash after votes = participants in-doubt: prepared, holding locks, unable to decide alone. They BLOCK until it recovers."
      }
    },
    {
      label: "7 · Living with 2PC — and moving beyond it",
      what: "Mitigations exist but each has a catch. <b>Recovery via the coordinator log</b> (presumed-abort) resolves in-doubt participants on restart. <b>3PC</b> adds a round to be non-blocking — but only under synchrony assumptions that real networks violate. <b>Consensus-based commit</b> (Paxos/Raft-replicated coordinator) removes the single-coordinator SPOF. At scale, systems often <b>avoid 2PC</b> for long-lived work and use <b>Sagas</b> instead.",
      why: "2PC gives true atomicity but pays with blocking, held locks, coordinator coupling, and poor availability/throughput. For microservices and high scale those costs dominate, which is why the industry leans toward sagas (compensations) — the subject of the next deep dive.",
      how: "Make the coordinator highly available (replicate it via Raft) and use presumed-abort to bound recovery. Reserve 2PC for a few tightly-coupled resources needing strict atomicity; use sagas/outbox where eventual consistency is acceptable.",
      when: "2PC: XA across a couple of databases, strict atomic writes. Sagas: cross-service business transactions at scale.",
      mistake: "Using 2PC across many services on the request path. The held locks and coordinator coupling wreck availability and latency; sagas fit that shape far better.",
      interview: "“How do you mitigate 2PC's blocking, and when do you avoid it?” Replicate the coordinator (Raft) + presumed-abort recovery; avoid 2PC for cross-service/long transactions in favor of sagas with compensations.",
      example: "ShopKart keeps 2PC only for a tight wallet+ledger write, and uses a saga for the broader order → payment → shipment flow.",
      viz: {
        phase: 2,
        coord: { state: "Raft-replicated", foot: [{ t: "no single-coordinator SPOF", k: "ok" }], cls: "leader hot" },
        parts: [
          { id: "Wallet DB", state: "committed", foot: [{ t: "presumed-abort recovery", k: "info" }], cls: "follower" },
          { id: "Inventory DB", state: "committed", foot: [{ t: "or → use a Saga", k: "info" }], cls: "follower" },
          { id: "Orders DB", state: "committed", foot: [{ t: "eventual, no locks", k: "info" }], cls: "follower" }
        ],
        note: "Mitigate: replicate the coordinator (Raft) + presumed-abort. Beyond a few tight resources, prefer Sagas — no distributed locks, no blocking."
      }
    }
  ];

  function buildViz(host) {
    host.classList.add("dd-viz");
    function chip(c) { return '<span class="dd-chip dd-chip--' + (c.k || "info") + '">' + c.t + "</span>"; }
    function phasebar(active) {
      return '<div class="dd-phasebar">' + PHASES.map(function (p, i) {
        var cls = i < active ? "done" : (i === active ? "on" : "");
        return '<div class="dd-phase ' + cls + '">' + p + "</div>";
      }).join("") + "</div>";
    }
    function nodeHtml(n, role) {
      return '<div class="dd-dnode ' + (n.cls || "") + '">' +
        '<div class="dd-dnode-hd"><span class="dd-dnode-id">' + n.id + '</span><span class="dd-dnode-role">' + role + "</span></div>" +
        '<div class="dd-dnode-val" style="font-size:12px">' + n.state + "</div>" +
        '<div class="dd-dnode-foot">' + (n.foot || []).map(chip).join("") + "</div>" +
      "</div>";
    }
    function update(idx, step) {
      var s = step && step.viz;
      if (idx < 0 || !s) {
        host.innerHTML = '<div class="dd-empty">Press <b>Play</b> to run a distributed commit across three ShopKart databases — ' +
          "prepare & vote, the commit point, commit/abort, and the coordinator-crash blocking problem 2PC is infamous for.</div>";
        return;
      }
      var coord = '<div class="dd-cluster" style="margin-bottom:12px">' +
        nodeHtml({ id: "Coordinator", state: s.coord.state, foot: s.coord.foot, cls: s.coord.cls }, "coordinator") + "</div>";
      var parts = '<div class="dd-cluster">' + s.parts.map(function (p) { return nodeHtml(p, "participant"); }).join("") + "</div>";
      var html = '<div class="dd-section"><div class="dd-section-label">2PC protocol · ShopKart place-order</div>' +
        phasebar(s.phase) + "</div>" +
        '<div class="dd-section">' + coord + parts + "</div>";
      if (s.note) html += '<div class="dd-note">' + s.note + "</div>";
      host.innerHTML = html;
    }
    return { update: update, destroy: function () { host.innerHTML = ""; host.classList.remove("dd-viz"); } };
  }

  DL.deepDives["two-phase-commit"] = {
    slug: "two-phase-commit",
    overview: {
      what: "<b>Two-Phase Commit (2PC)</b> is a protocol for an atomic commit across multiple independent resource managers. A <b>coordinator</b> runs two rounds: <b>prepare</b> (everyone votes YES/NO and promises), then <b>commit</b> or <b>abort</b> (everyone applies the agreed outcome).",
      why: "A single database gets atomicity from one WAL; across separate databases there's no shared log, so you need a protocol to guarantee all-or-nothing. 2PC provides it — but it's a <b>blocking</b> protocol: if the coordinator fails after the votes, prepared participants hold locks and can't decide alone.",
      how: "Phase 1: coordinator sends PREPARE; each participant makes its change durable in a prepared state, holds locks, and votes. If all vote YES, the coordinator durably logs COMMIT (the commit point) and, in phase 2, tells everyone to commit and release locks; any NO makes it log and broadcast ABORT. Its log makes the outcome recoverable."
    },
    steps: STEPS,
    buildViz: buildViz,
    code: {
      title: "The protocol, and the crash that blocks it",
      lang: "text",
      code:
        "COORDINATOR                         PARTICIPANT (each resource manager)\n" +
        "-- Phase 1 --------------------------------------------------------------\n" +
        "send PREPARE to all         ->      do work tentatively; fsync 'prepared'\n" +
        "                                    hold locks; reply YES (or NO + rollback)\n" +
        "collect votes\n" +
        "-- decision -------------------------------------------------------------\n" +
        "if all YES: fsync COMMIT   <-- COMMIT POINT (outcome now final/recoverable)\n" +
        "else:       fsync ABORT\n" +
        "-- Phase 2 --------------------------------------------------------------\n" +
        "send decision to all        ->      apply it; release locks; ack\n" +
        "\n" +
        "BLOCKING FLAW: coordinator crashes after votes, before sending decision\n" +
        "  -> participants are 'prepared' (in-doubt): holding locks, cannot decide\n" +
        "     alone, must BLOCK until the coordinator recovers and reads its log.\n" +
        "  Mitigate: replicate coordinator (Raft) + presumed-abort; or use a Saga.",
      highlights: [7, 15, 18]
    },
    reference: [
      ["coordinator", "The transaction manager driving the protocol"],
      ["participant", "A resource manager that votes and applies the outcome"],
      ["prepare / vote", "Phase 1: make change durable, hold locks, vote YES/NO"],
      ["prepared / in-doubt", "Voted YES; can't decide alone — must await the coordinator"],
      ["commit point", "Coordinator durably logs COMMIT; outcome becomes final"],
      ["commit / abort", "Phase 2: apply the agreed outcome and release locks"],
      ["blocking", "In-doubt participants stall (holding locks) if the coordinator fails"],
      ["presumed abort", "Recovery default: no logged decision → abort"],
      ["3PC", "Adds a round to be non-blocking — but unsafe under async/partition"]
    ],
    internals:
      "<p>2PC provides atomic commit across resource managers that each have their own log. <b>Phase 1 (prepare):</b> the coordinator asks every participant to PREPARE; each performs its update in a <i>pending</i> state, forces a durable <b>prepare record</b>, holds locks, and votes YES or NO. A YES is a binding promise — the participant is now <b>prepared</b> and has surrendered its autonomy: it may neither commit nor abort on its own.</p>" +
      "<p>Between the phases the coordinator makes the decision and — crucially — <b>durably logs it</b>. That COMMIT (or ABORT) log record is the <b>commit point</b>: the moment the global outcome is fixed and recoverable. <b>Phase 2</b> then broadcasts the decision; participants apply it (make the prepared change permanent, or roll it back) and release locks. Because every YES participant already made its change durable, phase 2 can't fail on their side — the coordinator just retries until each acks.</p>" +
      "<p>The infamous weakness is <b>blocking</b>. If the coordinator crashes (or is partitioned) after collecting votes but before delivering the decision, the prepared participants are <b>in-doubt</b>: they can't safely decide alone (guessing risks disagreeing with peers), so they hold their locks and <b>wait</b>. The single coordinator is a SPOF that can freeze the transaction and its locked rows. Mitigations: recover from the coordinator's log (<b>presumed abort</b> when no decision was logged); <b>3PC</b>, which adds a round to be non-blocking but is unsafe once you drop synchrony assumptions (real networks); or a <b>consensus-replicated coordinator</b> (Paxos/Raft) to remove the SPOF. At scale, many systems avoid 2PC entirely in favor of <b>sagas</b>.</p>",
    engineering:
      "<p>2PC buys real atomicity across databases, but at a steep operational price: participants hold <b>locks for the whole protocol</b> (two network round-trips plus fsyncs), the coordinator is a coupling point and SPOF, and any coordinator hiccup turns into blocked, locked rows. That throughput and availability cost is why 2PC is fine for a <b>few tightly-coupled resources</b> (an XA write across two databases) but a poor fit on the request path across many microservices.</p>" +
      "<p>If you must run 2PC, make the coordinator <b>highly available</b> (replicate it via Raft) and rely on <b>presumed-abort</b> so recovery is bounded, and keep the participant set and lock duration small. For cross-service business transactions, prefer a <b>saga</b>: a sequence of local transactions with compensating actions — no distributed locks, no blocking, at the cost of eventual consistency and idempotency work. Recognize 3PC as mostly theoretical (its non-blocking guarantee assumes a synchronous network you don't have). In short: 2PC for strict atomicity over a small, stable set; sagas for scale.</p>",
    gotchas: [
      { kind: "warn", html: "<b>2PC blocks on coordinator failure.</b> If the coordinator dies after the votes, prepared participants hold locks and can't decide alone — locked, unavailable rows until it recovers. The single coordinator is a SPOF." },
      { kind: "tip", html: "<b>The coordinator's COMMIT log is the commit point.</b> Everything recoverable hinges on that durable record; replicate the coordinator (Raft) and use presumed-abort so in-doubt participants can be resolved after a crash." },
      { kind: "info", html: "<b>Don't spread 2PC across many services on the request path.</b> Held locks + coordinator coupling wreck latency and availability. Use a saga (local transactions + compensations) for cross-service flows." }
    ],
    failureModes:
      "<p><b>Coordinator crash → blocked in-doubt participants:</b> prepared nodes hold locks, can't decide, and stall. <i>Fix:</i> Raft-replicated coordinator + presumed-abort recovery; bound lock duration.</p>" +
      "<p><b>Lock contention / throughput collapse:</b> locks held across two round-trips serialize hot rows. <i>Fix:</i> keep transactions short and participant sets small; avoid 2PC on hot paths.</p>" +
      "<p><b>Availability drag:</b> the whole transaction is only as available as the least-available participant plus the coordinator. <i>Fix:</i> sagas for cross-service work; reserve 2PC for a couple of tightly-coupled resources.</p>" +
      "<p><b>3PC false comfort:</b> assuming 3PC is safely non-blocking. <i>Fix:</i> it isn't under asynchronous networks/partitions — use consensus-based commit instead.</p>",
    quickCheck: [
      {
        q: "In 2PC, what has a participant committed to after it votes YES in phase 1?",
        options: [
          "Nothing — the vote is advisory and it can still abort freely",
          "It has made its change durable in a 'prepared' state and holds locks; it must now await and obey the coordinator's decision",
          "It has already fully committed the transaction",
          "It can commit or abort on its own after a short timeout"
        ],
        answer: 1,
        why: "A YES vote is a binding promise: the participant forces its change durable in a prepared state, holds its locks, and gives up autonomy — it can neither commit nor abort by itself and must wait for the coordinator.",
        diff: "easy"
      },
      {
        q: "Why is 2PC called a 'blocking' protocol?",
        options: [
          "Because it uses blocking I/O",
          "If the coordinator fails after the votes but before delivering the decision, prepared participants can't decide alone and block (holding locks) until it recovers",
          "Because participants block each other's reads permanently",
          "Because it can only run one transaction at a time"
        ],
        answer: 1,
        why: "The failure window is the coordinator crashing after collecting YES votes but before broadcasting COMMIT/ABORT. In-doubt participants can't safely guess, so they hold locks and block until the coordinator recovers and its log resolves the outcome.",
        diff: "medium"
      },
      {
        q: "For a cross-service order → payment → shipment flow at scale, why prefer a saga over 2PC?",
        options: [
          "Sagas give stronger atomicity than 2PC",
          "Sagas avoid distributed locks and coordinator blocking (using local transactions + compensations), trading strict atomicity for eventual consistency",
          "2PC can't span more than two nodes",
          "Sagas are simpler because they need no error handling"
        ],
        answer: 1,
        why: "2PC across many services holds locks and couples everyone to a coordinator, hurting availability and latency. A saga runs each step as a local transaction with a compensating action to undo on failure — no distributed locks, no blocking — at the cost of eventual consistency and idempotency handling.",
        diff: "medium"
      }
    ],
    interviewQs: [
      {
        q: "Explain two-phase commit end to end.",
        a: "2PC gives atomic commit across resource managers that each have their own log. A coordinator runs two rounds. Phase one, prepare: it sends PREPARE to every participant, and each does its update tentatively, forces a durable prepare record, holds its locks, and votes YES or NO — a YES being a binding promise that it can commit. Between phases the coordinator collects votes and durably logs the decision: if all voted YES it logs COMMIT, otherwise ABORT — and that log write is the commit point where the outcome becomes final and recoverable. Phase two: it sends the decision, participants apply it and release locks, and ack. Its own log is what makes crashes recoverable. The catch is that it's a blocking protocol: if the coordinator dies after the votes but before delivering the decision, the prepared participants are in-doubt — holding locks, unable to decide alone — and block until it recovers.",
        tip: "Name the commit point (coordinator's durable COMMIT log) and the in-doubt/blocking window explicitly — those two are what separate a real understanding from a textbook recital."
      },
      {
        q: "What are 2PC's weaknesses and how do you mitigate them?",
        a: "Three big ones. Blocking: a coordinator failure after the votes leaves prepared participants in-doubt, holding locks until recovery — mitigated by making the coordinator highly available (replicate it with Raft/Paxos) and using presumed-abort so restart resolves in-doubt transactions. Locking and throughput: locks are held across two round-trips and fsyncs, serializing hot rows — mitigated by keeping the participant set and lock duration small. Availability: the transaction is only as available as the coordinator plus the least-available participant. Because of these, at scale you often avoid 2PC on the request path across many services and use a saga instead — local transactions with compensating actions, which removes distributed locks and blocking at the cost of eventual consistency. 3PC exists to be non-blocking but assumes a synchronous network real systems don't have, so consensus-based commit is the better principled fix.",
        tip: "Group the weaknesses (blocking, locking, availability) each with a concrete mitigation, and land the 'sagas at scale, consensus-replicated coordinator, 3PC is theoretical' summary."
      },
      {
        q: "What is the 'in-doubt' state and why can't a participant resolve it alone?",
        a: "A participant is in-doubt when it has voted YES and is prepared — its change is durable, its locks are held — but it hasn't yet received the coordinator's decision. It can't resolve it alone because it doesn't know what the others decided: if it guessed commit while a peer guessed abort (or the coordinator had logged abort), atomicity would break. So it must block, keeping its prepare record and locks, and wait for the authoritative decision — either the coordinator recovering and re-driving the outcome from its log, or, in some implementations, querying peers/coordinator on timeout to learn the decision (presumed-abort if none was reached). This is exactly the price 2PC pays for guaranteeing atomicity, and the reason people reach for consensus-replicated coordinators or sagas.",
        tip: "The key line: it can't guess because guessing risks disagreeing with peers and violating atomicity — so blocking is a correctness requirement, not an implementation limitation."
      }
    ],
    businessLens: {
      task: "Committing a ShopKart order across wallet, inventory, and orders atomically",
      meaning: "All three databases commit together, or none does — no money debited without an order.",
      system: "XA-style 2PC coordinator over three resource managers",
      point: "Placing an order debits the wallet, decrements inventory, and inserts an order row — in three separate databases with no shared log. ShopKart uses 2PC so the checkout is truly all-or-nothing: each database prepares, locks, and votes; the coordinator logs COMMIT as the commit point, then everyone commits. If the item just sold out, inventory votes NO and the whole thing aborts with the wallet untouched. But the team knows 2PC's price — a coordinator crash mid-protocol leaves those rows locked and in-doubt — so they replicate the coordinator with Raft and use presumed-abort, keep the participant set tiny, and for the broader order → payment → shipment journey they switch to a saga instead, avoiding distributed locks on the hot path."
    }
  };
})();
