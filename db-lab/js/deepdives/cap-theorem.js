/* ============================================================
   deepdives/cap-theorem.js — "CAP Theorem" deep dive.
   Registers DBLab.deepDives['cap-theorem'] (concept m59).
   Authored against the contract documented in deepdives/mvcc.js.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  DL.deepDives = DL.deepDives || {};

  // Scene: two ShopKart replicas N1 & N2 for one inventory value. A network
  // partition forces the C-vs-A choice; we walk CP, AP, healing, and PACELC.
  var STEPS = [
    {
      label: "1 · Two replicas, healthy network",
      what: "ShopKart keeps SKU&nbsp;#42's stock on two replicas, <b>N1</b> and <b>N2</b>, connected over the network. Both read <code>100</code>. While the link is up, the system is <b>both consistent and available</b>.",
      why: "CAP is often mis-stated as 'pick 2 of 3 always'. The truth: when there's <b>no partition</b>, you can have both C and A. The theorem only forces a choice <i>during a partition</i> — so understanding CAP starts with the healthy case.",
      how: "A write to either node replicates to the other; a read on either returns the current value. C (every read sees the latest write) and A (every request gets an answer) both hold.",
      when: "The normal operating state — partitions are the exception, not the rule.",
      mistake: "Believing you permanently sacrifice one of C/A. You only trade them <i>when the network splits</i>; the rest of the time you can have both.",
      interview: "“What does CAP actually say?” In the presence of a network <b>partition</b>, a distributed system must choose between <b>consistency</b> and <b>availability</b>. No partition → no forced choice.",
      example: "On a normal day, ShopKart's two replicas agree instantly; a shopper reads correct stock and every request succeeds.",
      viz: {
        link: "up", n1: { val: 100, foot: [{ t: "current", k: "ok" }], cls: "leader" }, n2: { val: 100, foot: [{ t: "current", k: "ok" }], cls: "follower" },
        cap: { edge: "CA", drop: null, active: null },
        verdict: { k: "ok", html: "<b>No partition → C and A both hold.</b> Reads are current and every request is answered." },
        note: "CAP forces a choice only during a partition. On a healthy network you get both consistency and availability."
      }
    },
    {
      label: "2 · A write replicates while connected",
      what: "A sale writes <code>stock = 90</code> on N1. Because the link is up, N1 <b>replicates</b> it to N2, and both nodes now read <code>90</code>. Consistent and available, simultaneously.",
      why: "This reinforces the point: replication gives you C and A together <i>as long as nodes can communicate</i>. The moment they can't, the guarantee that both nodes agree collides with the guarantee that both answer.",
      how: "N1 accepts the write, ships it to N2 synchronously (or fast-enough async), and both converge on 90 before serving the next read.",
      when: "Every write on a healthy cluster.",
      mistake: "Assuming this happy path always holds. Networks partition — cables, switches, GC pauses, cross-region links — and CAP is about what you do <i>then</i>.",
      interview: "“Why can't you just always have C and A?” Because a partition makes 'both nodes agree' and 'both nodes answer' mutually exclusive — you can't confirm agreement with a node you can't reach.",
      example: "The sale propagates to both ShopKart replicas in a millisecond; every reader sees 90.",
      viz: {
        link: "up", n1: { val: 90, foot: [{ t: "wrote 90", k: "accent" }], cls: "leader hot" }, n2: { val: 90, foot: [{ t: "replicated ✓", k: "ok" }], cls: "follower hot" },
        cap: { edge: "CA", drop: null, active: null },
        verdict: { k: "ok", html: "Write to N1 replicates to N2 over the live link. <b>Both nodes agree (C) and both answer (A).</b>" },
        note: "Replication delivers C and A together — but only while the nodes can reach each other."
      }
    },
    {
      label: "3 · The network partitions",
      what: "The link between N1 and N2 <b>fails</b> (a switch dies, a cross-region cable is cut). Each node is now alone. A new sale writes <code>stock = 80</code> on N1 — but N1 <b>cannot reach N2</b> to replicate it.",
      why: "This is the CAP moment. N2 now holds a value it can't confirm is current, and N1 has a write it can't propagate. Any request to N2 forces the design's hand: answer (and risk staleness) or refuse (and lose availability).",
      how: "Partition detected: replication stalls. The system must have decided <i>in advance</i> how each side behaves when isolated — there's no time to negotiate across a link that's down.",
      when: "Whenever nodes can't communicate: network faults, long GC/stop-the-world pauses, overloaded links, cross-datacenter outages.",
      mistake: "Thinking partitions are so rare you can ignore them. At scale they're routine; 'P' is not optional — you're always choosing how to behave when it happens.",
      interview: "“Is P optional?” No. In any real distributed system partitions <i>will</i> happen, so you don't choose P — you choose, for when P occurs, between C and A.",
      example: "A regional network fault isolates ShopKart's two replicas mid-sale; N1 has stock=80 that N2 has never heard of.",
      viz: {
        link: "cut", n1: { val: 80, foot: [{ t: "wrote 80 · stuck", k: "warn" }], cls: "leader stale" }, n2: { val: 90, foot: [{ t: "can't reach N1", k: "warn" }], cls: "follower stale" },
        cap: { edge: null, drop: null, active: "P" },
        verdict: { k: "warn", html: "<b>Partition!</b> N1 wrote 80 but can't replicate it. N2 is isolated with stale 90. Now the system must choose C or A." },
        note: "A partition makes 'both nodes agree' and 'both nodes answer' mutually exclusive. The choice below had to be decided in advance."
      }
    },
    {
      label: "4 · CP — choose Consistency (refuse to be wrong)",
      what: "A <b>CP</b> system keeps consistency by <b>sacrificing availability</b> on the minority side. A read hits N2, which knows it might be stale and can't reach the others — so it <b>refuses / errors</b> rather than return an unconfirmed value. Only the side that can prove it's current (a majority) keeps serving.",
      why: "For data where being wrong is worse than being down — inventory you can oversell, account balances, config — you'd rather return an error than a stale or conflicting answer. Correctness over uptime.",
      how: "Nodes require a <b>quorum/majority</b> to serve. The minority partition can't form one, so it rejects requests; the majority side continues consistently. This is how Raft/Paxos-backed stores (etcd, ZooKeeper, Spanner, HBase) behave.",
      when: "Systems of record, coordination/config stores, financial ledgers, anything where a wrong answer causes real damage.",
      mistake: "Calling CP 'always down'. Only the minority side loses availability; the majority keeps serving consistently — and it never serves a wrong value.",
      interview: "“Give a CP system and why.” etcd/ZooKeeper/Spanner — they back coordination and money, where a stale read is unacceptable, so the minority refuses rather than risk inconsistency.",
      example: "ShopKart's inventory-of-record chooses CP: during the partition the isolated replica returns errors, so the store never oversells the last unit from stale data.",
      viz: {
        link: "cut", n1: { val: 80, foot: [{ t: "majority · serving", k: "ok" }], cls: "leader" }, n2: { val: 90, foot: [{ t: "refuses reads", k: "bad" }], cls: "follower down" },
        cap: { edge: "CP", drop: "A", active: "P" },
        verdict: { k: "bad", html: "<b>CP:</b> keep <b>C</b>, drop <b>A</b> on the minority. N2 errors instead of returning stale 90. No wrong answers — but reduced availability." },
        note: "CP = the side that can't prove it's current refuses to answer. Correctness over uptime (etcd, ZooKeeper, Spanner)."
      }
    },
    {
      label: "5 · AP — choose Availability (answer, maybe stale)",
      what: "An <b>AP</b> system keeps availability by <b>sacrificing consistency</b>. The read on N2 succeeds and returns its best-known value — <b>stale 90</b> — even though N1 has moved to 80. Every request gets an answer; some are out of date.",
      why: "For data where being down is worse than being briefly wrong — a shopping cart, a social feed, a 'like' count, a session — you'd rather serve slightly stale data than fail. Uptime over strict correctness, with reconciliation later.",
      how: "Both sides keep accepting reads and writes independently; divergence is expected and <b>resolved after the partition heals</b> (last-write-wins, version vectors, CRDTs, read-repair). This is how Dynamo/Cassandra/Riak default.",
      when: "Carts, feeds, catalogs, counters, sessions — high-availability user experiences that tolerate bounded staleness.",
      mistake: "Using AP for data that must be exact (inventory-of-record, balances). Stale/divergent reads there cause overselling and lost money — AP is for tolerant data.",
      interview: "“Give an AP system and why.” Cassandra/DynamoDB/Riak — they keep serving on both sides of a partition and reconcile later, ideal for high-availability, staleness-tolerant workloads.",
      example: "ShopKart's 'recently viewed' and cart choose AP: during the partition they keep working with slightly stale data, and reconcile once the link returns — far better than showing an error.",
      viz: {
        link: "cut", n1: { val: 80, foot: [{ t: "serving 80", k: "ok" }], cls: "leader" }, n2: { val: 90, foot: [{ t: "serving stale 90", k: "warn" }], cls: "follower stale" },
        cap: { edge: "AP", drop: "C", active: "P" },
        verdict: { k: "warn", html: "<b>AP:</b> keep <b>A</b>, drop <b>C</b>. N2 answers with stale 90 rather than erroring. Always up — but reads can be out of date." },
        note: "AP = both sides keep answering and diverge; reconcile after the heal. Availability over strict consistency (Cassandra, DynamoDB, Riak)."
      }
    },
    {
      label: "6 · The partition heals — reconcile",
      what: "The link is restored. The two sides must <b>converge</b>. A CP system's minority simply catches up (it never diverged). An AP system must <b>resolve the divergence</b> it allowed — merging N1's 80 with whatever N2 accepted — via last-write-wins, version vectors, or CRDTs.",
      why: "The choice you made during the partition has a bill that comes due at healing. CP paid up front with unavailability; AP pays now with reconciliation logic and the possibility of lost/merged updates.",
      how: "CP: the reconnected minority replays the majority's log and resumes. AP: anti-entropy / read-repair compares versions and merges; conflicting writes are resolved by the chosen policy (and some updates may be dropped under LWW).",
      when: "Every time connectivity returns after a partition.",
      mistake: "Choosing AP without a real conflict-resolution strategy. 'Available' during the split is worthless if you can't sanely merge afterward — LWW silently drops concurrent updates.",
      interview: "“After an AP partition heals, how do you reconcile?” Anti-entropy/read-repair plus a conflict policy: last-write-wins (simple, lossy), version vectors (detect conflicts), or CRDTs (merge deterministically).",
      example: "When ShopKart's link returns, the inventory-of-record (CP) just catches up, while the cart (AP) merges both sides' additions so nobody loses an item.",
      viz: {
        link: "up", n1: { val: 80, foot: [{ t: "converged", k: "ok" }], cls: "leader hot" }, n2: { val: 80, foot: [{ t: "reconciled → 80", k: "ok" }], cls: "follower hot" },
        cap: { edge: "CA", drop: null, active: null },
        verdict: { k: "ok", html: "Heal → converge. CP just catches up; AP merges divergence (LWW / version vectors / CRDTs). Both read 80 again." },
        note: "The partition-time choice bills at healing: CP paid in unavailability, AP pays in reconciliation. Pick a real conflict policy for AP."
      }
    },
    {
      label: "7 · PACELC — the choice you make even without a partition",
      what: "CAP only covers the partition case. <b>PACELC</b> completes it: <b>if Partition, choose A or C — Else, choose Latency or Consistency</b>. Even on a healthy network, stronger consistency costs latency (extra round-trips / quorums), and lower latency means weaker consistency.",
      why: "This is the everyday version of the tradeoff. Partitions are rare, but the L-vs-C dial is turned on <i>every request</i>: waiting for a majority to agree is slower than answering from the nearest replica. Real systems expose this as tunable consistency (quorums).",
      how: "Per operation you pick where you sit: synchronous quorum reads/writes (strong, slower) vs local/eventual reads (fast, possibly stale). Dynamo-style stores expose R/W knobs; Spanner pays latency (TrueTime waits) for strong consistency globally.",
      when: "Always — it's the design dial behind read replicas, quorum tuning, and multi-region latency.",
      mistake: "Labeling a database 'AP' or 'CP' as if it's one fixed setting. Most are <b>tunable per operation</b>, so the real question is which consistency each specific read/write needs.",
      interview: "“What does PACELC add to CAP?” The Else clause: even without a partition you trade Latency vs Consistency. It reframes the DB choice as per-operation, not a permanent AP/CP label.",
      example: "ShopKart reads the catalog from the nearest replica (favor L) but confirms an order through a quorum (favor C) — the same cluster, two points on the PACELC dial.",
      viz: {
        link: "up", n1: { val: 80, foot: [{ t: "quorum: strong/slow", k: "info" }], cls: "leader" }, n2: { val: 80, foot: [{ t: "local: fast/stale-risk", k: "info" }], cls: "follower" },
        cap: { edge: "CA", drop: null, active: null },
        verdict: { k: "ok", html: "<b>PACELC:</b> if <b>P</b> → A vs C; <b>E</b>lse → <b>L</b>atency vs <b>C</b>onsistency. Tunable per operation, not a fixed label." },
        note: "Even with no partition you trade latency for consistency on every request. Choose per-operation via quorums, not a permanent AP/CP badge."
      }
    }
  ];

  function buildViz(host) {
    host.classList.add("dd-viz");

    function chip(c) { return '<span class="dd-chip dd-chip--' + (c.k || "info") + '">' + c.t + "</span>"; }
    function nodeHtml(id, n) {
      return '<div class="dd-dnode ' + (n.cls || "") + '" style="max-width:210px">' +
        '<div class="dd-dnode-hd"><span class="dd-dnode-id">' + id + '</span><span class="dd-dnode-role">replica</span></div>' +
        '<div class="dd-dnode-val">stock <b>' + n.val + "</b></div>" +
        '<div class="dd-dnode-foot">' + (n.foot || []).map(chip).join("") + "</div>" +
      "</div>";
    }

    // CAP triangle: C top, A bottom-left, P bottom-right. cfg = {edge:'CA'|'CP'|'AP'|null, drop:'A'|'C'|null, active:'P'|null}
    var V = { C: [110, 24], A: [30, 126], P: [190, 126] };
    function edgeCls(a, b, cfg) {
      var pair = a + b, rp = b + a;
      if (cfg.edge === pair || cfg.edge === rp) return "edge keep";
      if (cfg.drop && (a === cfg.drop || b === cfg.drop)) return "edge drop";
      return "edge";
    }
    function vtxCls(v, cfg) {
      if (cfg.drop === v) return "vtx drop";
      if (cfg.edge && cfg.edge.indexOf(v) >= 0) return "vtx keep";
      if (cfg.active === v) return "vtx keep";
      return "vtx";
    }
    function line(a, b, cfg) {
      return '<line class="' + edgeCls(a, b, cfg) + '" x1="' + V[a][0] + '" y1="' + V[a][1] + '" x2="' + V[b][0] + '" y2="' + V[b][1] + '"/>';
    }
    function vtx(v, letter, name, cfg) {
      var x = V[v][0], y = V[v][1];
      return '<circle class="' + vtxCls(v, cfg) + '" cx="' + x + '" cy="' + y + '" r="15"/>' +
        '<text class="vletter" x="' + x + '" y="' + (y + 5) + '">' + letter + "</text>" +
        '<text class="vname" x="' + x + '" y="' + (y > 60 ? y + 27 : y - 22) + '">' + name + "</text>";
    }
    function capTri(cfg) {
      return '<svg class="dd-cap-tri" viewBox="0 0 220 158" width="100%" height="150" role="img" aria-label="CAP triangle">' +
        line("C", "A", cfg) + line("C", "P", cfg) + line("A", "P", cfg) +
        vtx("C", "C", "Consistency", cfg) + vtx("A", "A", "Availability", cfg) + vtx("P", "P", "Partition tol.", cfg) +
        "</svg>";
    }

    function update(idx, step) {
      var s = step && step.viz;
      if (idx < 0 || !s) {
        host.innerHTML = '<div class="dd-empty">Press <b>Play</b> to partition two ShopKart replicas and watch the forced choice — ' +
          "CP (stay consistent, refuse) vs AP (stay available, go stale) — then heal, reconcile, and see PACELC.</div>";
        return;
      }
      var linkPill = s.link === "cut"
        ? '<div class="dd-link cut">✂ PARTITION</div>'
        : '<div class="dd-link">⟷ linked</div>';
      var scene = '<div class="dd-section"><div class="dd-section-label">Two replicas · ShopKart SKU #42</div>' +
        '<div class="dd-linkrow">' + nodeHtml("N1", s.n1) + linkPill + nodeHtml("N2", s.n2) + "</div></div>";
      var tri = '<div class="dd-section"><div class="dd-section-label">The choice (CAP)</div>' + capTri(s.cap) + "</div>";
      var verdict = s.verdict ? '<div class="dd-verdict ' + s.verdict.k + '">' + s.verdict.html + "</div>" : "";
      var html = scene + verdict + tri;
      if (s.note) html += '<div class="dd-note">' + s.note + "</div>";
      host.innerHTML = html;
    }

    return { update: update, destroy: function () { host.innerHTML = ""; host.classList.remove("dd-viz"); } };
  }

  DL.deepDives["cap-theorem"] = {
    slug: "cap-theorem",
    overview: {
      what: "The <b>CAP theorem</b>: when a network <b>partition</b> (P) splits a distributed system, it must choose between <b>consistency</b> (C — every read sees the latest write) and <b>availability</b> (A — every request gets a non-error answer). It cannot guarantee both while partitioned.",
      why: "It's the foundational tradeoff of distributed data. It tells you that during the inevitable network fault, your database will either return errors on part of the cluster (CP) or return possibly-stale answers (AP) — and you must decide which, per dataset, in advance.",
      how: "No partition → you can have both C and A. During a partition, a <b>CP</b> system keeps consistency by refusing on the side that can't prove it's current (needs a majority/quorum); an <b>AP</b> system keeps availability by answering with stale data and reconciling after the heal. <b>PACELC</b> extends it: even with no partition, you trade Latency vs Consistency."
    },
    steps: STEPS,
    buildViz: buildViz,
    code: {
      title: "What each node does when it can't reach its peers",
      lang: "text",
      code:
        "on read(key):\n" +
        "    if network_ok or can_reach_majority():\n" +
        "        return current_value(key)          # C and A both fine\n" +
        "\n" +
        "    # --- partitioned, in the minority ---\n" +
        "    if design == CP:\n" +
        "        raise Unavailable                  # refuse rather than risk stale  (etcd, Spanner)\n" +
        "    if design == AP:\n" +
        "        return local_value(key)            # answer, may be stale           (Cassandra, Dynamo)\n" +
        "\n" +
        "# PACELC: if Partition -> (A | C);  Else -> (Latency | Consistency)\n" +
        "#   strong read  = wait for a quorum      (consistent, slower)\n" +
        "#   local  read  = nearest replica        (fast, possibly stale)\n" +
        "#   => tunable PER OPERATION, not one fixed AP/CP label",
      highlights: [7, 9, 12]
    },
    reference: [
      ["Consistency (C)", "Every read returns the most recent committed write (linearizable)"],
      ["Availability (A)", "Every request to a non-failed node gets a non-error response"],
      ["Partition tolerance (P)", "The system keeps working despite dropped/​delayed messages"],
      ["CP system", "Keeps C, sacrifices A on the minority during a partition (etcd, Spanner)"],
      ["AP system", "Keeps A, sacrifices C (serves stale, reconciles later) (Cassandra, Dynamo)"],
      ["quorum / majority", "The set a CP node needs to reach to serve safely"],
      ["reconciliation", "Merging divergence after an AP partition heals (LWW, CRDT, read-repair)"],
      ["PACELC", "If Partition: A vs C; Else: Latency vs Consistency"],
      ["tunable consistency", "Choosing C vs A/L per operation via R/W quorum settings"]
    ],
    internals:
      "<p>The theorem is precise: <b>during a network partition</b>, a system cannot be both <b>consistent</b> (linearizable — every read reflects the latest write) and <b>available</b> (every request to a live node succeeds). The proof is intuitive: if two sides can't communicate and both must answer, either one returns a value it can't confirm is current (giving up C) or it refuses (giving up A). Crucially, <b>P is not a choice</b> — real networks drop and delay messages — so the real decision is C-vs-A <i>for when a partition occurs</i>.</p>" +
      "<p><b>CP</b> systems require a node to reach a <b>majority/quorum</b> before answering, so the minority side of a partition stops serving (returns errors) rather than risk a stale or conflicting result. This is what consensus-backed stores do — etcd, ZooKeeper, Spanner, HBase — and it's the right call for systems of record and coordination. <b>AP</b> systems let every side keep answering with its best-known value and <b>reconcile after the heal</b> (anti-entropy, read-repair, plus a conflict policy: last-write-wins, version vectors, or CRDTs) — Dynamo, Cassandra, Riak — the right call for carts, feeds, and counters that tolerate bounded staleness.</p>" +
      "<p><b>PACELC</b> is the honest, complete statement: <i>if Partition, choose A or C; Else, choose Latency or Consistency.</i> Partitions are rare, but the latency-vs-consistency dial is exercised on every request — waiting for a quorum to agree is slower than reading the nearest replica. That's why the modern framing isn't a fixed 'AP or CP' label but <b>tunable consistency per operation</b>: a strong quorum read when correctness matters, a fast local read when it doesn't.</p>",
    engineering:
      "<p>CAP is a design-time question you answer <b>per dataset, not per database</b>. Split your data by cost-of-being-wrong vs cost-of-being-down: inventory-of-record, balances, and config are CP (better to error than to oversell or double-spend); carts, sessions, feeds, view counts, and recommendations are AP (better to serve slightly stale than to fail). Most real stacks run both — a CP system of record beside AP caches and user-experience data.</p>" +
      "<p>Operationally: if you pick AP, you <b>must</b> build reconciliation — a conflict policy (LWW is simple but silently drops concurrent updates; version vectors detect conflicts; CRDTs merge deterministically) — because 'available during the split' is worthless if you can't sanely merge after. If you pick CP, plan for the minority's unavailability (client retries, failover, multi-region quorums) and remember it's the <i>minority</i> that stops, not the whole cluster. And treat consistency as a per-operation knob (quorum reads/writes) rather than a global mode — that's PACELC in practice.</p>",
    gotchas: [
      { kind: "info", html: "<b>CAP only bites during a partition.</b> With a healthy network you can have both C and A — the forced choice is specifically about what each side does when it can't reach the others." },
      { kind: "warn", html: "<b>P is not optional.</b> Real networks partition (faults, GC pauses, cross-region links), so you don't 'choose P' — you choose, for when it happens, between C and A. Designing as if partitions won't occur is the classic mistake." },
      { kind: "tip", html: "<b>AP needs a real conflict-resolution plan.</b> Last-write-wins silently drops concurrent updates; use version vectors to detect conflicts or CRDTs to merge them. Choose the policy before you choose AP." }
    ],
    failureModes:
      "<p><b>Split-brain writes (AP misused):</b> both sides accept conflicting writes to data that must be exact (inventory, balances) → overselling / lost money. <i>Fix:</i> use CP (quorum/consensus) for systems of record.</p>" +
      "<p><b>Full outage from a CP minority:</b> a partition or a lost quorum makes the minority — or the whole cluster if no majority exists — refuse writes. <i>Fix:</i> size/place replicas for majority survival (odd counts, multi-AZ), client retries, failover.</p>" +
      "<p><b>Lost updates on reconciliation:</b> AP heal with last-write-wins silently discards concurrent writes. <i>Fix:</i> version vectors / CRDTs, or move that data to CP.</p>" +
      "<p><b>Unbounded staleness:</b> an AP replica lags far behind and keeps serving very stale reads. <i>Fix:</i> bound staleness (read-repair, hinted handoff, quorum reads for sensitive paths).</p>",
    quickCheck: [
      {
        q: "The CAP theorem forces a choice between C and A under what condition?",
        options: ["Always, on every request", "Only when the network is partitioned (nodes can't communicate)", "Only when a node's disk fails", "Only for read-heavy workloads"],
        answer: 1,
        why: "CAP forces the C-vs-A tradeoff specifically during a network partition. When nodes can communicate normally, a system can provide both consistency and availability.",
        diff: "easy"
      },
      {
        q: "During a partition, a node in the minority returns an error instead of a possibly-stale value. Which choice is this, and what's a fitting use?",
        options: ["AP — a social media feed", "CP — an inventory-of-record or account balance", "Neither — it just crashed", "AP — a shopping cart"],
        answer: 1,
        why: "Refusing to answer rather than risk staleness is the CP choice (consistency over availability). It fits systems of record — inventory, balances, config — where a wrong answer is worse than an error.",
        diff: "medium"
      },
      {
        q: "What does PACELC add beyond CAP?",
        options: [
          "It proves you can have all three of C, A, P",
          "It says: if Partition, choose A vs C; Else (no partition), choose Latency vs Consistency",
          "It replaces availability with durability",
          "It only applies to single-node databases"
        ],
        answer: 1,
        why: "PACELC completes CAP with the 'Else' clause: even without a partition, you trade latency against consistency on every request. It reframes the choice as tunable per operation rather than a fixed AP/CP label.",
        diff: "hard"
      }
    ],
    interviewQs: [
      {
        q: "State the CAP theorem precisely and correct the common misconception.",
        a: "CAP says that when a network partition occurs, a distributed system must choose between consistency (every read returns the latest committed write) and availability (every request to a live node gets a non-error response) — it can't guarantee both while partitioned. The common misconception is 'pick 2 of 3 always.' That's wrong: partition tolerance isn't something you opt into or out of — real networks drop and delay messages, so partitions will happen. And when there's no partition, you can have both C and A. So the theorem really says: for the times a partition happens, decide in advance whether that side of the system stays consistent (and refuses) or stays available (and may serve stale data).",
        tip: "Say 'P isn't optional' and 'no partition → both C and A.' Those two corrections instantly separate you from a memorized answer."
      },
      {
        q: "How do you decide CP vs AP, with concrete examples?",
        a: "I decide per dataset by comparing the cost of being wrong against the cost of being down. If a stale or conflicting answer causes real damage — overselling inventory, double-spending a balance, handing out a bad config — I choose CP: require a quorum, and let the minority side of a partition return errors rather than risk inconsistency. That's etcd, ZooKeeper, Spanner, HBase — coordination and systems of record. If being unavailable is worse than being briefly stale — a shopping cart, a feed, a like count, a session — I choose AP: keep serving on both sides and reconcile after the heal, which is Cassandra, DynamoDB, Riak. Most real systems run both: a CP system of record alongside AP caches and UX data. And I treat it as tunable per operation via quorum settings, not a permanent label.",
        tip: "Give the decision rule (cost of wrong vs cost of down), then name real CP and AP systems and a workload for each. That specificity is what interviewers want."
      },
      {
        q: "If you pick AP, what happens when the partition heals, and what can go wrong?",
        a: "When connectivity returns, the two sides may have diverged, so you have to reconcile. Mechanisms are anti-entropy and read-repair to detect and propagate differences, plus a conflict-resolution policy for concurrent writes to the same key. Last-write-wins is simplest but silently drops one of two concurrent updates — a real data-loss risk. Version vectors (or vector clocks) let you detect true conflicts and surface them; CRDTs are data types designed to merge deterministically without losing updates (counters, sets, etc.). The thing that goes wrong is choosing AP without any real reconciliation strategy: staying available during the split is worthless if you can't sanely merge afterward. So the conflict policy is part of choosing AP, not an afterthought — and if the data can't tolerate lossy merges, it belongs in a CP store instead.",
        tip: "Name the three policies — LWW (lossy), version vectors (detect), CRDTs (merge) — and call out that LWW silently drops updates. That shows you've operated an AP system, not just read about one."
      }
    ],
    businessLens: {
      task: "Keeping ShopKart online during a network partition without overselling",
      meaning: "Inventory-of-record stays correct (CP); carts and browsing stay up (AP).",
      system: "Mixed: consensus-backed inventory + Dynamo-style user data",
      point: "ShopKart splits its data by CAP on purpose. The inventory-of-record and payment ledger are <b>CP</b>: during a partition the minority replicas return errors, so the store never sells the last unit twice from stale data — better a brief 'try again' than an oversell. Carts, 'recently viewed', and the catalog are <b>AP</b>: they keep working with slightly stale data on both sides of the split and reconcile (merging cart additions, never dropping an item) once the link heals. Day to day there's no partition, so the same clusters give both C and A — and ShopKart still turns the PACELC dial per request: catalog reads come from the nearest replica for speed, while placing an order goes through a quorum for correctness."
    }
  };
})();
