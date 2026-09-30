/* ============================================================
   deepdives/quorum.js — "Quorum" (R + W > N) deep dive.
   Registers DBLab.deepDives['quorum'] (concept m79).
   Authored against the contract documented in deepdives/mvcc.js.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  DL.deepDives = DL.deepDives || {};

  // Scene: ShopKart stores SKU #42 stock on N=3 replicas. We tune write
  // quorum W and read quorum R, watch the R+W>N overlap guarantee, a stale
  // read when it's violated, the tuning dial, and failure tolerance.
  var STEPS = [
    {
      label: "1 · N replicas hold the value",
      what: "ShopKart replicates SKU&nbsp;#42's stock across <b>N&nbsp;=&nbsp;3</b> nodes. Right now all three agree: <code>stock&nbsp;=&nbsp;100</code>. There's no single primary here — any replica can take reads and writes.",
      why: "Quorums are how leaderless / Dynamo-style systems get tunable consistency without a primary: instead of 'ask the leader', you require a <b>minimum number of replicas</b> to participate in each operation, and pick those numbers to trade consistency against availability.",
      how: "The parameters are <b>N</b> (replicas per key), <b>W</b> (replicas that must ack a write), and <b>R</b> (replicas that must answer a read). A client talks to all N and waits for W (or R) responses.",
      when: "Leaderless replication: DynamoDB, Cassandra, Riak, and quorum-based reads/writes generally.",
      mistake: "Thinking you need a leader for consistency. Quorums give strong-enough reads without one — the guarantee comes from set overlap, not from a single authoritative node.",
      interview: "“What are N, W, R?” N = replicas per key; W = acks needed to commit a write; R = replicas read from. Consistency comes from choosing them so read and write sets overlap.",
      example: "ShopKart keeps each product's stock on 3 replicas so any single node can fail without losing the data.",
      viz: {
        n: 3, w: null, r: null,
        replicas: [
          { id: "R1", val: 100, sets: [], cls: "follower" },
          { id: "R2", val: 100, sets: [], cls: "follower" },
          { id: "R3", val: 100, sets: [], cls: "follower" }
        ],
        note: "N=3 replicas, no leader. Consistency is tuned by how many must ack a write (W) and answer a read (R)."
      }
    },
    {
      label: "2 · A write needs W acks",
      what: "A sale writes <code>stock = 90</code> with <b>W&nbsp;=&nbsp;2</b>. The client sends the write to all 3 replicas and waits for <b>2</b> to acknowledge. Two replicas now hold <code>90</code>; the third hasn't applied it yet. The write <b>succeeds</b> as soon as W acks arrive.",
      why: "Requiring W acks (not all N) means a write survives even if some replicas are slow or down — you get durability on multiple nodes without waiting for the slowest. W is your write-side consistency/availability dial.",
      how: "Coordinator fans the write to R1, R2, R3; the first 2 to reply satisfy W=2, so the client sees success. The lagging replica catches up later via read-repair or hinted handoff.",
      when: "Every write in a quorum system; W is chosen per keyspace (or per request in some stores).",
      mistake: "Setting W=1 for data that must not be lost. A single-ack write can vanish if that one node fails before replicating — W≥2 keeps at least two durable copies.",
      interview: "“What does W control?” How many replicas must durably hold a write before it's acknowledged — higher W = more durable/consistent writes but lower write availability.",
      example: "ShopKart's stock write commits once 2 of 3 replicas confirm — fast, and durable on two nodes even if the third is momentarily slow.",
      viz: {
        n: 3, w: 2, r: null,
        replicas: [
          { id: "R1", val: 90, sets: ["W"], cls: "follower hot" },
          { id: "R2", val: 90, sets: ["W"], cls: "follower hot" },
          { id: "R3", val: 100, sets: [], cls: "follower stale" }
        ],
        note: "W=2: write to all N, wait for 2 acks. Two replicas hold 90; the third lags (it'll be repaired). Write succeeds without the slowest."
      }
    },
    {
      label: "3 · A read needs R acks — and the sets overlap",
      what: "A read uses <b>R&nbsp;=&nbsp;2</b>. Since <b>R&nbsp;+&nbsp;W&nbsp;=&nbsp;4&nbsp;&gt;&nbsp;N&nbsp;=&nbsp;3</b>, any 2 replicas the read touches <b>must include at least one</b> of the 2 that took the write. That overlapping replica returns <code>90</code>, so the read sees the latest value.",
      why: "This is the whole point of quorums. <b>R + W &gt; N</b> guarantees the read set and write set intersect (pigeonhole), so a read always sees the most recent acknowledged write — strong consistency (read-your-writes) without a leader.",
      how: "The coordinator reads from 2 replicas, compares their versions, and returns the newest. Because the sets overlap, at least one of them carries version v2 (90); the read then also repairs the stale one.",
      when: "Whenever you need a quorum read to reflect the latest write — set R and W so R+W>N.",
      mistake: "Reading the newest of R replicas but forgetting version metadata. Quorum reads rely on per-value versions (timestamps/vector clocks) to know which of the R answers is latest.",
      interview: "“Why does R+W>N give consistency?” Pigeonhole: two sets of size R and W drawn from N with R+W>N must share ≥1 element, so the read always sees at least one replica that has the latest write.",
      example: "A shopper who just bought reloads the page; the R=2 read overlaps the write set and correctly shows 90 — no 'my order didn't happen' moment.",
      viz: {
        n: 3, w: 2, r: 2, overlapId: "R2",
        replicas: [
          { id: "R1", val: 90, sets: ["W"], cls: "follower" },
          { id: "R2", val: 90, sets: ["W", "R"], cls: "follower overlap hot" },
          { id: "R3", val: 100, sets: ["R"], cls: "follower stale" }
        ],
        note: "R+W>N (2+2>3) forces the read set to overlap the write set. R2 is in both → the read sees 90, the latest. Strong, leaderless."
      }
    },
    {
      label: "4 · Violate R + W > N → stale reads",
      what: "Now set <b>W&nbsp;=&nbsp;1</b> and <b>R&nbsp;=&nbsp;1</b> for speed. <b>R&nbsp;+&nbsp;W&nbsp;=&nbsp;2&nbsp;≤&nbsp;N&nbsp;=&nbsp;3</b>. A write of <code>80</code> lands on R1 only; a read that happens to hit R3 returns the <b>stale</b> <code>100</code> — the sets didn't overlap.",
      why: "When R+W ≤ N, there's no guarantee the read touches a written replica, so reads can be stale. It's faster and more available (fewer nodes to wait for) but gives up read-your-writes — the classic 'sloppy quorum' consistency gap.",
      how: "Write set {R1}, read set {R3}; their intersection is empty, so the read never sees v3 (80). Only later does anti-entropy/read-repair converge the replicas.",
      when: "Latency/availability-first configs (W=1, R=1) where bounded staleness is acceptable.",
      mistake: "Assuming any quorum is consistent. Only R+W>N guarantees overlap; W=1,R=1 is fast but eventually consistent — fine for a view counter, wrong for inventory.",
      interview: "“Is W=1, R=1 consistent?” No — R+W=2 ≤ N=3, sets may not overlap, so reads can be stale. It's the fast/available end of the dial, not the consistent end.",
      example: "With W=1,R=1 a ShopKart shopper could momentarily see old stock right after a change — acceptable for 'popularity' counters, not for the checkout's inventory check.",
      viz: {
        n: 3, w: 1, r: 1,
        replicas: [
          { id: "R1", val: 80, sets: ["W"], cls: "follower hot" },
          { id: "R2", val: 100, sets: [], cls: "follower stale" },
          { id: "R3", val: 100, sets: ["R"], cls: "follower stale hot" }
        ],
        note: "R+W ≤ N (1+1 ≤ 3): write set {R1} and read set {R3} don't overlap → the read returns stale 100. Fast, but eventually consistent."
      }
    },
    {
      label: "5 · Tuning the dial: R-heavy, W-heavy, or balanced",
      what: "N is fixed; you move R and W to shape the system. <b>W=N, R=1</b>: consistent + fast reads, but writes fail if <i>any</i> replica is down. <b>W=1, R=N</b>: fast, always-available writes, slow reads. <b>W=R=majority</b> (here 2): balanced — consistent and tolerant of one failure.",
      why: "Quorums are a continuous tradeoff, not a binary. You bias toward whichever side (reads or writes) is hotter and can least afford latency, while keeping R+W>N if you need consistency.",
      how: "Read-heavy workloads pick low R (W high) so reads are cheap; write-heavy pick low W (R high). The safe default is <b>majority</b> quorums (W=R=⌈(N+1)/2⌉), which satisfy R+W>N and survive a minority failure.",
      when: "Per keyspace/table tuning in Cassandra (ONE/QUORUM/ALL), DynamoDB (eventual vs strong reads), etc.",
      mistake: "Using W=N in production. It maximizes read consistency but means a single slow/down replica blocks <i>all</i> writes — brittle. Majority quorums are almost always the better default.",
      interview: "“How do you tune R/W?” Bias toward the hotter path (low R for read-heavy, low W for write-heavy) while keeping R+W>N for consistency; default to majority quorums for balance and fault tolerance.",
      example: "ShopKart uses majority (W=R=2) for inventory so reads are correct and one replica can fail; a write-heavy telemetry keyspace uses low W for throughput.",
      viz: {
        n: 3, w: 2, r: 2,
        replicas: [
          { id: "R1", val: 80, sets: ["W", "R"], cls: "follower overlap" },
          { id: "R2", val: 80, sets: ["W", "R"], cls: "follower overlap" },
          { id: "R3", val: 80, sets: [], cls: "follower" }
        ],
        note: "Majority W=R=2 (⌈(N+1)/2⌉) satisfies R+W>N and tolerates one failure — the safe default. W=N is consistent but brittle."
      }
    },
    {
      label: "6 · Failure tolerance from the quorum",
      what: "With N=3 and W=2, a replica can <b>fail and writes still succeed</b> — the other 2 can form the write quorum. A majority quorum tolerates <b>⌊(N−1)/2⌋</b> failures. (W=3 would block: one node down and no write can gather 3 acks.)",
      why: "This is the availability payoff of not requiring all N. Choosing W and R below N buys fault tolerance: the system keeps serving through the failures a quorum can still outvote.",
      how: "R3 is down; the coordinator still gets acks from R1 and R2 (=W), so the write of stock commits. The downed replica is repaired (hinted handoff replays the missed write when it returns).",
      when: "Any single-node failure, restart, or slow node — the common case a resilient cluster must ride through.",
      mistake: "Sizing N even, or setting W=N. Even N wastes a node for the same failure tolerance as N−1; W=N removes all write fault tolerance. Use odd N and majority quorums.",
      interview: "“How many failures does a majority quorum tolerate?” ⌊(N−1)/2⌋ — e.g. N=3 tolerates 1, N=5 tolerates 2 — which is why replica counts are odd.",
      example: "A ShopKart replica reboots for patching; stock writes keep committing on the other two, and the rebooted node catches up via hinted handoff.",
      viz: {
        n: 3, w: 2, r: null,
        replicas: [
          { id: "R1", val: 70, sets: ["W"], cls: "follower hot" },
          { id: "R2", val: 70, sets: ["W"], cls: "follower hot" },
          { id: "R3", val: 80, sets: [], cls: "down" }
        ],
        note: "N=3, W=2 tolerates ⌊(N−1)/2⌋=1 failure: R3 is down, yet R1+R2 still form the write quorum. Use odd N; avoid W=N."
      }
    },
    {
      label: "7 · What quorums don't give you",
      what: "R+W>N bounds staleness for a <b>single key</b>, but quorums alone aren't full <b>linearizability</b> and aren't <b>transactions</b>. Concurrent writes still need conflict resolution (version vectors / LWW), and multi-key atomicity needs consensus or 2PC on top. <b>Sloppy quorums</b> + hinted handoff trade the overlap guarantee for extra availability.",
      why: "Knowing the edges keeps you from over-trusting quorums: they're a per-key consistency dial, not a transaction engine. For a single committed order-total that must be exactly right and atomic across keys, you reach for consensus (Raft) instead.",
      how: "Quorum reads return the newest of R versions and repair the rest, but two writes that neither saw the other still conflict → resolved by version vectors or last-write-wins. 'Sloppy' quorums accept acks from any N healthy nodes (not the key's home replicas), so R+W>N no longer guarantees overlap during a partition.",
      when: "Whenever you need cross-key atomicity, strict linearizability, or must reason about a partition — go beyond plain quorums.",
      mistake: "Treating a quorum store as a transactional, linearizable database. It bounds single-key staleness; it doesn't serialize multi-key operations or fully order all writes by itself.",
      interview: "“Do quorums give linearizability?” Not by themselves — they bound single-key staleness (R+W>N) but need version reconciliation for concurrent writes and consensus/2PC for multi-key atomicity. Sloppy quorums relax the guarantee for availability.",
      example: "ShopKart uses quorums for stock reads, but the authoritative order ledger — which must be atomic and strictly ordered — runs on a Raft-backed store, not plain quorums.",
      viz: {
        n: 3, w: 2, r: 2, overlapId: "R2",
        replicas: [
          { id: "R1", val: 70, sets: ["W"], cls: "follower" },
          { id: "R2", val: 70, sets: ["W", "R"], cls: "follower overlap" },
          { id: "R3", val: 65, sets: ["R"], cls: "follower stale" }
        ],
        note: "Quorums bound single-key staleness — not linearizability or multi-key atomicity. Concurrent writes still need version vectors; cross-key needs consensus/2PC."
      }
    }
  ];

  function buildViz(host) {
    host.classList.add("dd-viz");

    function setChips(sets) {
      return sets.map(function (s) {
        if (s === "W") return '<span class="dd-chip dd-chip--accent">write set</span>';
        if (s === "R") return '<span class="dd-chip dd-chip--info">read set</span>';
        return "";
      }).join("");
    }
    function replicaHtml(rp) {
      var overlap = rp.sets.indexOf("W") >= 0 && rp.sets.indexOf("R") >= 0;
      return '<div class="dd-dnode ' + (rp.cls || "") + '">' +
        '<div class="dd-dnode-hd"><span class="dd-dnode-id">' + rp.id + '</span>' +
          '<span class="dd-dnode-role">' + (rp.cls.indexOf("down") >= 0 ? "down" : "replica") + "</span></div>" +
        '<div class="dd-dnode-val">stock <b>' + rp.val + "</b></div>" +
        '<div class="dd-dnode-foot">' + setChips(rp.sets) + (overlap ? '<span class="dd-chip dd-chip--ok">overlap ✓</span>' : "") + "</div>" +
      "</div>";
    }

    function update(idx, step) {
      var s = step && step.viz;
      if (idx < 0 || !s) {
        host.innerHTML = '<div class="dd-empty">Press <b>Play</b> to tune N, W and R on ShopKart\'s replicas — ' +
          "see how R+W>N forces read/write overlap (strong reads), how violating it goes stale, and how quorums tolerate failures.</div>";
        return;
      }
      var rw = (s.r != null && s.w != null) ? (s.r + s.w) : null;
      var strong = rw != null && rw > s.n;
      var metrics =
        '<div class="dd-metrics">' +
          '<div class="dd-metric"><span class="dd-metric-val">' + s.n + '</span><span class="dd-metric-lbl">N replicas</span></div>' +
          '<div class="dd-metric"><span class="dd-metric-val">' + (s.w == null ? "—" : s.w) + '</span><span class="dd-metric-lbl">W write</span></div>' +
          '<div class="dd-metric"><span class="dd-metric-val">' + (s.r == null ? "—" : s.r) + '</span><span class="dd-metric-lbl">R read</span></div>' +
          (rw != null
            ? '<div class="dd-metric ' + (strong ? "good" : "bad") + '"><span class="dd-metric-val" style="font-size:12px">R+W ' + (strong ? ">" : "≤") + " N</span><span class=\"dd-metric-lbl\">" + (strong ? "strong" : "stale-risk") + "</span></div>"
            : "") +
        "</div>";
      var html = '<div class="dd-section"><div class="dd-section-label">Replica set · ShopKart SKU #42 (N=' + s.n + ")</div>" +
        metrics +
        '<div class="dd-cluster">' + s.replicas.map(replicaHtml).join("") + "</div></div>";
      if (s.note) html += '<div class="dd-note">' + s.note + "</div>";
      host.innerHTML = html;
    }

    return { update: update, destroy: function () { host.innerHTML = ""; host.classList.remove("dd-viz"); } };
  }

  DL.deepDives["quorum"] = {
    slug: "quorum",
    overview: {
      what: "A <b>quorum</b> requires a minimum number of replicas to take part in each operation: of <b>N</b> replicas per key, a write must be acknowledged by <b>W</b> and a read must be answered by <b>R</b>. It's how leaderless (Dynamo-style) systems get tunable consistency with no primary.",
      why: "It turns consistency into a dial. Set <b>R + W &gt; N</b> and every read is guaranteed to overlap the latest write (strong, read-your-writes); set it lower for speed and availability at the cost of possibly-stale reads. And by not requiring all N, quorums keep serving through node failures.",
      how: "A coordinator fans each operation to all N replicas and waits for W (or R) responses. The <b>R + W &gt; N</b> overlap (pigeonhole) means the read set shares ≥1 replica with the write set, so the read sees the newest version. Majority quorums (W=R=⌈(N+1)/2⌉) satisfy this and tolerate ⌊(N−1)/2⌋ failures."
    },
    steps: STEPS,
    buildViz: buildViz,
    code: {
      title: "Tuning N / W / R for consistency vs availability",
      lang: "text",
      code:
        "N = replicas per key      W = acks to commit a write      R = replicas read from\n" +
        "\n" +
        "STRONG (read-your-writes)   requires   R + W > N\n" +
        "   read set and write set must share >= 1 replica  (pigeonhole)\n" +
        "\n" +
        "Examples for N = 3:\n" +
        "   W=2, R=2   -> R+W=4 > 3   strong,  tolerates 1 failure   (majority — good default)\n" +
        "   W=3, R=1   -> R+W=4 > 3   strong reads, but ANY node down blocks writes (brittle)\n" +
        "   W=1, R=3   -> R+W=4 > 3   fast writes, slow reads\n" +
        "   W=1, R=1   -> R+W=2 <= 3  fast + available, but reads may be STALE (eventual)\n" +
        "\n" +
        "Majority quorum:  W = R = ceil((N+1)/2)   tolerates floor((N-1)/2) failures\n" +
        "   (use odd N: N=3 -> tolerate 1, N=5 -> tolerate 2)\n" +
        "# Cassandra: ONE / QUORUM / ALL     DynamoDB: eventual vs strongly-consistent read",
      highlights: [3, 8, 11]
    },
    reference: [
      ["N", "Number of replicas that store each key"],
      ["W (write quorum)", "Replicas that must ack before a write is committed"],
      ["R (read quorum)", "Replicas that must respond to a read"],
      ["R + W > N", "Guarantees read/write sets overlap → read sees latest write"],
      ["majority quorum", "W = R = ⌈(N+1)/2⌉ — satisfies R+W>N, tolerates ⌊(N−1)/2⌋ failures"],
      ["read-repair", "A quorum read updates the stale replicas it finds"],
      ["hinted handoff", "A neighbor holds a write for a down replica and replays it later"],
      ["sloppy quorum", "Accept acks from any healthy N nodes → more available, weaker guarantee"],
      ["version vector", "Per-value versions used to pick the newest / detect conflicts"]
    ],
    internals:
      "<p>A quorum system stores each key on <b>N</b> replicas and never designates a primary. Every operation is a coordinated fan-out: the coordinator sends a write to all N and returns success once <b>W</b> replicas ack; it sends a read to all N (or enough) and returns once <b>R</b> reply, choosing the newest version among them by timestamp or version vector. The lagging replicas are fixed opportunistically by <b>read-repair</b> (on the read path) and <b>hinted handoff</b> (a neighbor stores a write for a temporarily-down replica and replays it later).</p>" +
      "<p>The consistency guarantee is pure set overlap: if <b>R + W &gt; N</b>, then any read set of size R and any write set of size W drawn from N must intersect (pigeonhole), so a read always contacts at least one replica that holds the latest acknowledged write. That's strong, read-your-writes consistency for a single key <i>without a leader</i>. Drop below the threshold (e.g. W=1, R=1 with N=3) and the sets can miss each other — reads may be stale until anti-entropy converges them.</p>" +
      "<p>Because W and R are below N, quorums also deliver <b>fault tolerance</b>: a majority quorum (W=R=⌈(N+1)/2⌉) keeps serving through ⌊(N−1)/2⌋ failures, which is why replica counts are odd. But quorums have limits: they bound staleness for one key, not full <b>linearizability</b>; concurrent writes still need version-vector or last-write-wins resolution; multi-key atomicity needs consensus or two-phase commit on top; and <b>sloppy quorums</b> (accepting acks from any healthy nodes during a partition) buy availability by giving up the overlap guarantee.</p>",
    engineering:
      "<p>Quorums are the practical knob behind 'tunable consistency'. The default worth reaching for is a <b>majority quorum</b> (W=R=2 for N=3, W=R=3 for N=5): it satisfies R+W>N for strong single-key reads and tolerates a minority of failures. From there, bias toward the hotter path — low R (with W high) for read-heavy data so reads are cheap, low W (with R high) for write-heavy ingest — but keep R+W>N whenever the data must be read-your-writes. Reserve W=1/R=1 for data where bounded staleness is genuinely fine (counters, popularity, telemetry).</p>" +
      "<p>Use <b>odd N</b> (even N wastes a replica for the same tolerance) and remember what quorums <i>don't</i> do: they aren't transactions and aren't full linearizability, so put anything requiring cross-key atomicity or a single authoritative order — an order ledger, a balance — on a consensus-backed (Raft/Paxos) store instead. Watch for sloppy-quorum surprises during partitions (a write may be accepted by nodes that aren't the key's home replicas, so a later strict-quorum read can still miss it), and lean on read-repair/hinted handoff plus anti-entropy to keep replicas converging.</p>",
    gotchas: [
      { kind: "tip", html: "<b>R + W > N is the whole consistency rule.</b> It forces the read set to overlap the write set, so a read always sees the latest write. Majority quorums (W=R=⌈(N+1)/2⌉) satisfy it and tolerate a minority failure — a great default." },
      { kind: "warn", html: "<b>W=1, R=1 is fast but eventually consistent.</b> With R+W ≤ N the read and write sets can miss each other, so reads can be stale. Fine for counters; wrong for inventory or balances." },
      { kind: "info", html: "<b>Quorums aren't transactions or linearizability.</b> They bound single-key staleness only. Concurrent writes still need version vectors/LWW, and multi-key atomicity needs consensus or 2PC. Sloppy quorums relax even the overlap guarantee for availability." }
    ],
    failureModes:
      "<p><b>Stale reads from a weak quorum:</b> R+W ≤ N (e.g. W=1,R=1) lets reads miss recent writes. <i>Fix:</i> raise R and/or W so R+W>N for read-your-writes paths.</p>" +
      "<p><b>Write unavailability from W=N:</b> requiring all replicas means one slow/down node blocks every write. <i>Fix:</i> use a majority quorum (W<N) so a minority failure is tolerated.</p>" +
      "<p><b>Lost updates on concurrent writes:</b> two writes that didn't see each other collide; last-write-wins silently drops one. <i>Fix:</i> version vectors to detect conflicts, or CRDTs / app-level merge.</p>" +
      "<p><b>Sloppy-quorum inconsistency:</b> during a partition, acks come from non-home replicas, so a strict-quorum read can still miss the write. <i>Fix:</i> understand the tradeoff; use strict quorums (or consensus) where correctness is required.</p>",
    quickCheck: [
      {
        q: "With N=3, which (W, R) guarantees a read always sees the latest acknowledged write?",
        options: ["W=1, R=1", "W=2, R=2", "W=1, R=2", "Any setting — quorums are always consistent"],
        answer: 1,
        why: "Strong reads require R + W > N. For N=3, W=2 and R=2 give R+W=4 > 3, so the read set must overlap the write set. W=1,R=1 (=2) and W=1,R=2 (=3) do not exceed N, so reads can be stale.",
        diff: "easy"
      },
      {
        q: "Why does R + W > N guarantee the read sees the latest write?",
        options: [
          "It makes writes synchronous to all replicas",
          "Two sets of size R and W drawn from N must share at least one replica (pigeonhole), so the read touches a replica that has the write",
          "It elects a leader to serialize operations",
          "It disables replicas that are behind"
        ],
        answer: 1,
        why: "By the pigeonhole principle, if R + W > N then a read set (size R) and a write set (size W) drawn from N replicas cannot be disjoint — they overlap in at least one replica, which holds the latest write, so the read finds it.",
        diff: "medium"
      },
      {
        q: "You need cross-key atomicity and a strictly-ordered authoritative ledger. Are quorums enough?",
        options: [
          "Yes — R+W>N gives full ACID transactions",
          "No — quorums bound single-key staleness but aren't linearizability or transactions; use consensus (Raft) or 2PC on top",
          "Yes — just set W=R=N",
          "No — you must abandon replication entirely"
        ],
        answer: 1,
        why: "Quorums give tunable per-key consistency, not multi-key atomicity or full linearizability. For a strictly-ordered, atomic ledger you need a consensus protocol (Raft/Paxos) or two-phase commit layered on top.",
        diff: "hard"
      }
    ],
    interviewQs: [
      {
        q: "Explain N, W, R and the R + W > N rule.",
        a: "In a leaderless (Dynamo-style) system each key is stored on N replicas. A write is sent to all N and considered committed once W of them acknowledge; a read is sent to replicas and returns once R respond, taking the newest version among them. The consistency guarantee comes from set overlap: if R + W > N, then by the pigeonhole principle any read set of size R and any write set of size W must share at least one replica — so a read always contacts a replica that holds the latest acknowledged write, giving strong read-your-writes consistency without a leader. If R + W ≤ N, the sets can be disjoint and reads may be stale. So N, W, R are a dial: raise them for consistency, lower them for latency and availability.",
        tip: "Say the pigeonhole argument out loud — it's the one insight that proves you understand quorums rather than memorizing R+W>N."
      },
      {
        q: "How do you tune W and R for a read-heavy vs a write-heavy workload, and what's a safe default?",
        a: "The safe default is a majority quorum — W = R = ⌈(N+1)/2⌉ (so W=R=2 for N=3) — because it satisfies R+W>N for strong reads and tolerates a minority of failures, ⌊(N−1)/2⌋. From there I bias toward the hotter path: for read-heavy data I lower R (and raise W) so reads are cheap while still keeping R+W>N; for write-heavy ingest I lower W (and raise R) so writes are cheap. I avoid W=N because a single slow or down replica then blocks all writes. And I only use W=1,R=1 for data where bounded staleness is genuinely acceptable — counters, popularity, telemetry — never for inventory or balances. I also use odd N, since even N costs a replica without improving fault tolerance.",
        tip: "Anchor on 'majority quorum as default,' then give the read-heavy/write-heavy adjustments and the W=N and even-N anti-patterns."
      },
      {
        q: "What do quorums NOT give you, and what do you reach for instead?",
        a: "Quorums bound staleness for a single key; they are not full linearizability and not transactions. Two concurrent writes that didn't observe each other still conflict, so you need version vectors to detect conflicts or a resolution policy like last-write-wins (which silently drops an update) or CRDTs. Multi-key atomicity — updating several keys all-or-nothing, or maintaining a strictly ordered authoritative log — needs a consensus protocol like Raft or Paxos, or two-phase commit layered on top. There's also the sloppy-quorum caveat: during a partition, acks can come from replicas that aren't the key's home nodes, so a later strict-quorum read can still miss the write — you've traded the overlap guarantee for availability. So I use quorums for tunable per-key consistency, and consensus-backed stores for anything that must be atomic across keys or strictly ordered.",
        tip: "List the three gaps — concurrent-write conflicts, multi-key atomicity, sloppy quorums — and name the fix for each (version vectors/CRDTs, consensus/2PC, awareness). That precision reads as real operational experience."
      }
    ],
    businessLens: {
      task: "Reading ShopKart's stock correctly right after a sale, without a primary",
      meaning: "Quorum reads see the latest write (R+W>N) while the cluster rides through a node failure.",
      system: "Leaderless quorum store (Cassandra/Dynamo-style), N=3",
      point: "ShopKart keeps each product's stock on 3 replicas with a majority quorum (W=R=2). Because R+W=4 > 3, a shopper who just bought always reads their new stock value — the read set is guaranteed to overlap the write set — so nobody sees 'my purchase didn't happen.' The same majority lets a replica reboot for patching while writes keep committing on the other two. For the few high-write, staleness-tolerant signals (view counts, 'trending'), ShopKart drops to W=1/R=1 for throughput. And because quorums aren't transactions, the authoritative order ledger — which must be atomic and strictly ordered — lives on a Raft-backed store instead, not on plain quorums."
    }
  };
})();
