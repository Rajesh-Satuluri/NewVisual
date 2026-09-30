/* ============================================================
   deepdives/replication.js — "Replication" deep dive.
   Registers DBLab.deepDives['replication'] (concept m55).
   Authored against the contract documented in deepdives/mvcc.js.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  DL.deepDives = DL.deepDives || {};

  // Scene: ShopKart products.stock for SKU #42. One primary streams its
  // WAL to followers. We watch a write propagate, lag open and close,
  // sync vs async, a failover, and read scaling.
  var STEPS = [
    {
      label: "1 · One node holds everything",
      what: "ShopKart starts with a single database node, <b>N1</b>. Every read and every write for <code>products</code> hits it. Stock for SKU&nbsp;#42 is <code>100</code> at <code>LSN&nbsp;100</code>.",
      why: "One node is simple but fragile: it's a single point of failure (if N1 dies, the store is down) and a single point of capacity (every query competes for the same CPU, RAM and disk). Replication is how you escape both.",
      how: "Nothing is replicated yet — there is exactly one copy of the data. Durability rests entirely on N1's disk and its WAL.",
      when: "Small apps, dev environments, and the starting point of almost every system before it needs availability or read scale.",
      mistake: "Staying single-node until an outage forces the issue. Availability and read-scaling needs arrive suddenly; the time to add replicas is before you need them.",
      interview: "“Why replicate at all?” Two independent reasons: <b>availability</b> (survive a node failure) and <b>read scalability</b> (serve reads from many copies). Keep them distinct.",
      example: "ShopKart's whole catalog and order history live on N1. A single reboot takes the storefront offline.",
      viz: {
        mode: "single", lag: 0, flow: null,
        nodes: [{ id: "N1", role: "primary", val: 100, lsn: 100, foot: [{ t: "reads + writes", k: "accent" }], cls: "leader hot" }],
        note: "One node = single point of failure and a single capacity ceiling. Replication addresses both."
      }
    },
    {
      label: "2 · Add followers, stream the WAL",
      what: "ShopKart adds two <b>replicas</b> (R1, R2). N1 becomes the <b>primary</b> (leader); it streams its <b>write-ahead log</b> to the followers, which replay it to build identical copies. All three now hold <code>stock = 100</code>.",
      why: "The WAL is already the authoritative record of every change (see the WAL deep dive). Shipping it to followers is the cheapest, most faithful way to keep copies in step — they replay exactly what the primary did, in the same order.",
      how: "Each follower opens a replication connection, receives WAL records as they're generated, and applies them. It tracks how far it has applied as an LSN, so the primary knows each follower's position.",
      when: "Postgres streaming replication, MySQL binlog replication, MongoDB oplog — the same leader-follower shape under different names.",
      mistake: "Thinking replicas re-run your SQL. They don't — they replay the physical/logical <i>change records</i> the primary already produced, which is why they can't diverge on non-deterministic functions.",
      interview: "“How does a follower stay in sync?” It streams and replays the leader's WAL/oplog in order, tracking its applied LSN — not by re-executing client statements.",
      example: "ShopKart's two replicas connect to N1 and replay its WAL; within milliseconds all three agree that SKU #42 has 100 units.",
      viz: {
        mode: "async", lag: 0, flow: { label: "streams WAL", lag: false },
        nodes: [
          { id: "N1", role: "primary", val: 100, lsn: 100, foot: [{ t: "writes", k: "accent" }], cls: "leader" },
          { id: "R1", role: "replica", val: 100, lsn: 100, foot: [{ t: "in sync", k: "ok" }], cls: "follower" },
          { id: "R2", role: "replica", val: 100, lsn: 100, foot: [{ t: "in sync", k: "ok" }], cls: "follower" }
        ],
        note: "The primary ships its WAL to followers, which replay it in order. Three identical copies — one authoritative writer."
      }
    },
    {
      label: "3 · A write opens replication lag",
      what: "A checkout writes <code>stock = 90</code> on the primary (<code>LSN&nbsp;101</code>). With <b>asynchronous</b> replication the primary commits and answers the client <i>immediately</i>, before the followers have the change. For a moment R1 and R2 still show <code>100</code>.",
      why: "Async replication is fast — writers never wait for the network round-trip to a replica. The price is a <b>lag window</b>: a read routed to a follower during it sees a stale value. This is the single most important fact about replicas.",
      how: "The commit is durable on the primary's WAL and acknowledged to the client. The WAL records for LSN 101 are still in flight to the followers, whose applied position is still LSN 100.",
      when: "The default in most read-scaling setups (async streaming replicas / read replicas in RDS, etc.).",
      mistake: "Assuming a replica is always current. Between a primary commit and the follower's replay, the follower is behind — reads there are eventually, not immediately, consistent.",
      interview: "“What is replication lag and when does it bite?” The delay between a primary commit and a follower applying it; a read on the follower in that window returns stale data (breaks read-your-writes).",
      example: "A shopper buys the last-but-ten charger; the primary shows 90, but the 'similar items' widget — reading a replica — still advertises 100 for a beat.",
      viz: {
        mode: "async", lag: 1, flow: { label: "lag: 1 behind", lag: true },
        nodes: [
          { id: "N1", role: "primary", val: 90, lsn: 101, foot: [{ t: "committed", k: "ok" }], cls: "leader hot" },
          { id: "R1", role: "replica", val: 100, lsn: 100, foot: [{ t: "stale · lag 1", k: "warn" }], cls: "follower stale" },
          { id: "R2", role: "replica", val: 100, lsn: 100, foot: [{ t: "stale · lag 1", k: "warn" }], cls: "follower stale" }
        ],
        note: "Async: the primary answers before followers apply. Reads on a lagging follower see the OLD value — the lag window."
      }
    },
    {
      label: "4 · Followers converge (eventual consistency)",
      what: "The WAL for LSN 101 reaches the followers; they replay it and now also read <code>stock = 90</code> at <code>LSN&nbsp;101</code>. The lag window has closed — every copy agrees again.",
      why: "This is <b>eventual consistency</b> in miniature: given no new writes, all replicas converge to the same state. The system is always heading toward agreement; it just isn't instantaneous.",
      how: "Each follower advances its applied LSN to 101 as it replays. Lag returns to zero. Monitoring watches exactly this: <code>bytes</code>/<code>seconds</code> a follower is behind the primary.",
      when: "Continuously — under steady write load, followers hover a small lag behind and catch up in the gaps.",
      mistake: "Treating 'eventual' as 'never' or 'seconds'. Healthy lag is sub-millisecond to milliseconds; multi-second lag is an incident (slow replica, network, or long-running query blocking replay).",
      interview: "“When is a read replica safe to read from?” When your app tolerates bounded staleness, or you route reads that must be current to the primary (or wait for the replica to reach the write's LSN).",
      example: "Within a few milliseconds ShopKart's replicas also show 90; the catalog widget is correct again — the shopper never noticed.",
      viz: {
        mode: "async", lag: 0, flow: { label: "caught up", lag: false },
        nodes: [
          { id: "N1", role: "primary", val: 90, lsn: 101, foot: [{ t: "writes", k: "accent" }], cls: "leader" },
          { id: "R1", role: "replica", val: 90, lsn: 101, foot: [{ t: "in sync", k: "ok" }], cls: "follower hot" },
          { id: "R2", role: "replica", val: 90, lsn: 101, foot: [{ t: "in sync", k: "ok" }], cls: "follower hot" }
        ],
        note: "Followers replay LSN 101 and converge to 90. Lag → 0. 'Eventual' = they always catch up; not that they're always current."
      }
    },
    {
      label: "5 · Synchronous replication trades latency for safety",
      what: "For a critical write (<code>stock = 80</code>, <code>LSN&nbsp;102</code>) ShopKart makes <b>R1 a synchronous standby</b>. Now the primary will <i>not</i> acknowledge the commit until R1 confirms it has the WAL durably. R2 stays asynchronous.",
      why: "Synchronous replication guarantees <b>no acknowledged write is lost</b> if the primary dies — at least one other node already has it. The cost is write latency (a network round-trip on the commit path) and reduced write availability if the sync standby is unreachable.",
      how: "On COMMIT the primary flushes its WAL, sends it to R1, and blocks the client until R1 replies 'flushed'. Only then does the client see success. R2 receives the same WAL asynchronously.",
      when: "Money, orders, and anything where losing a committed write is unacceptable; often 'sync to one of N' to bound the latency cost.",
      mistake: "Making <i>all</i> replicas synchronous. Every sync standby adds latency and a failure mode — if a required sync standby is down, writes stall. Usually one sync replica (quorum of 1) is the sweet spot.",
      interview: "“Sync vs async replication?” Sync waits for a replica's ack before commit → zero data loss, higher latency, lower write availability. Async commits first → fast, but a failover can lose the un-shipped tail.",
      example: "ShopKart makes order writes synchronous to one standby: a confirmed order can never vanish in a failover, even though each commit costs one extra round-trip.",
      viz: {
        mode: "sync", lag: 0, flow: { label: "waits for ack", lag: false },
        nodes: [
          { id: "N1", role: "primary", val: 80, lsn: 102, foot: [{ t: "commit blocked on ack", k: "warn" }], cls: "leader hot" },
          { id: "R1", role: "sync standby", val: 80, lsn: 102, foot: [{ t: "ack ✓ durable", k: "ok" }], cls: "follower hot" },
          { id: "R2", role: "async replica", val: 90, lsn: 101, foot: [{ t: "async · lag 1", k: "warn" }], cls: "follower stale" }
        ],
        note: "Sync standby R1 must confirm the WAL before the client sees COMMIT — no acknowledged write can be lost. R2 stays async."
      }
    },
    {
      label: "6 · Failover promotes a follower",
      what: "The primary <b>N1 crashes</b>. ShopKart promotes the caught-up synchronous standby <b>R1</b> to be the new primary. Because R1 had LSN 102 durably (it was the sync standby), <b>no acknowledged write is lost</b>. R2 re-points at R1 and catches up.",
      why: "Failover is the availability payoff. But it's only lossless if the promoted node had the latest acknowledged writes — which is exactly what the synchronous standby guarantees. With pure async, whatever hadn't shipped from N1 is gone.",
      how: "A failover controller (Patroni, RDS, Orchestrator) detects N1 is down, picks the most up-to-date replica, promotes it to accept writes, and redirects clients. Clients reconnect to the new primary's endpoint.",
      when: "Any node failure, zone outage, or planned maintenance (a controlled 'switchover').",
      mistake: "Two nodes both believing they're primary — <b>split-brain</b> — after a partition. Preventing it needs fencing/STONITH or a consensus-based promotion (see Raft), not just 'promote the replica'.",
      interview: "“What can go wrong in a failover?” Data loss (async tail not shipped) and split-brain (two primaries). Fixes: synchronous replication for the former, fencing/consensus for the latter.",
      example: "A zone outage kills ShopKart's N1; R1 is promoted in seconds with every confirmed order intact, and the storefront keeps taking sales.",
      viz: {
        mode: "failover", lag: 0, flow: { label: "promoted", lag: false },
        nodes: [
          { id: "N1", role: "crashed", val: 80, lsn: 102, foot: [{ t: "down", k: "bad" }], cls: "down" },
          { id: "R1", role: "new primary", val: 80, lsn: 102, foot: [{ t: "promoted · no loss", k: "ok" }], cls: "new-leader hot" },
          { id: "R2", role: "replica", val: 80, lsn: 102, foot: [{ t: "follows R1", k: "info" }], cls: "follower" }
        ],
        note: "Promote the most-current replica. The sync standby had LSN 102 → lossless failover. Guard against split-brain (two primaries)."
      }
    },
    {
      label: "7 · Read scaling — one writer, many readers",
      what: "Steady state: <b>R1 is the primary</b> (all writes) and <b>R2 is a read replica</b>. ShopKart routes heavy read traffic — product pages, search, dashboards — to replicas, keeping the primary for writes and reads that must be current.",
      why: "This is the throughput payoff: reads scale horizontally by adding replicas, while a single primary keeps writes simple and ordered. Most web workloads are read-heavy, so this buys a lot.",
      how: "The app (or a proxy like PgBouncer/ProxySQL) sends writes and read-your-writes queries to the primary, and everything else to replicas. A replica that falls too far behind is pulled from the read pool.",
      when: "Read-heavy apps: catalogs, feeds, analytics, reporting — anywhere stale-by-milliseconds reads are fine.",
      mistake: "Routing a read that must reflect the user's own just-made write to a lagging replica — the classic 'I updated my profile and it reverted' bug. Pin such reads to the primary or wait for the replica's LSN.",
      interview: "“How do you scale reads with replication, and what breaks?” Route reads to followers; the failure mode is stale reads / broken read-your-writes during lag. Fix with primary-routing for sensitive reads or LSN waits.",
      example: "ShopKart serves millions of product-page views from replicas while the primary handles checkouts; a user's own cart, though, always reads the primary so it never appears to 'lose' an item.",
      viz: {
        mode: "readscale", lag: 0, flow: { label: "reads", lag: false },
        nodes: [
          { id: "R1", role: "primary", val: 80, lsn: 102, foot: [{ t: "writes + fresh reads", k: "accent" }], cls: "leader" },
          { id: "R2", role: "read replica", val: 80, lsn: 102, foot: [{ t: "serves reads", k: "info" }], cls: "follower hot" }
        ],
        note: "Writes → one primary; heavy reads → replicas. Scales read throughput. Pin read-your-writes queries to the primary."
      }
    }
  ];

  function buildViz(host) {
    host.classList.add("dd-viz");

    function chip(c) { return '<span class="dd-chip dd-chip--' + (c.k || "info") + '">' + c.t + "</span>"; }
    function nodeHtml(n) {
      return '<div class="dd-dnode ' + (n.cls || "") + '">' +
        '<div class="dd-dnode-hd"><span class="dd-dnode-id">' + n.id + '</span>' +
          '<span class="dd-dnode-role">' + n.role + "</span></div>" +
        '<div class="dd-dnode-val">stock <b>' + n.val + "</b></div>" +
        '<div class="dd-dnode-val" style="font-size:11px;color:var(--text-muted)">applied <code>LSN ' + n.lsn + "</code></div>" +
        '<div class="dd-dnode-foot">' + (n.foot || []).map(chip).join("") + "</div>" +
      "</div>";
    }

    function update(idx, step) {
      var s = step && step.viz;
      if (idx < 0 || !s) {
        host.innerHTML = '<div class="dd-empty">Press <b>Play</b> to watch one primary stream its WAL to followers — ' +
          "a write opens replication lag, followers catch up, a synchronous standby makes failover lossless, and reads scale out.</div>";
        return;
      }
      var modeLabel = { single: "single node", async: "async", sync: "sync + async", failover: "failover", readscale: "read scaling" }[s.mode] || s.mode;
      var nodesCount = s.nodes.filter(function (n) { return n.cls.indexOf("down") < 0; }).length;
      var metrics =
        '<div class="dd-metrics">' +
          '<div class="dd-metric"><span class="dd-metric-val">' + nodesCount + '</span><span class="dd-metric-lbl">live nodes</span></div>' +
          '<div class="dd-metric ' + (s.lag > 0 ? "bad" : "good") + '"><span class="dd-metric-val">' + s.lag + '</span><span class="dd-metric-lbl">repl. lag</span></div>' +
          '<div class="dd-metric"><span class="dd-metric-val" style="font-size:12px">' + modeLabel + '</span><span class="dd-metric-lbl">mode</span></div>' +
        "</div>";

      // primary first, flow connector, then the rest
      var primary = s.nodes[0];
      var rest = s.nodes.slice(1);
      var linkrow = '<div class="dd-linkrow">' + nodeHtml(primary);
      if (s.flow && rest.length) {
        linkrow += '<div class="dd-flow' + (s.flow.lag ? " lag" : "") + '"><span class="dd-flow-arrow">⇉</span><span>' + s.flow.label + "</span></div>";
      }
      linkrow += rest.map(nodeHtml).join("") + "</div>";

      var html =
        '<div class="dd-section"><div class="dd-section-label">Cluster · ShopKart products (SKU #42)</div>' + metrics + "</div>" +
        '<div class="dd-section">' + linkrow + "</div>";
      if (s.note) html += '<div class="dd-note">' + s.note + "</div>";
      host.innerHTML = html;
    }

    return { update: update, destroy: function () { host.innerHTML = ""; host.classList.remove("dd-viz"); } };
  }

  DL.deepDives["replication"] = {
    slug: "replication",
    overview: {
      what: "<b>Replication</b> keeps multiple copies of the data on separate nodes. One <b>primary</b> (leader) takes writes and streams its change log to <b>followers</b> (replicas), which replay it to stay in step.",
      why: "It buys the two things a single node can't give you: <b>availability</b> (promote a follower when the primary dies) and <b>read scalability</b> (serve reads from many copies). The catch is <b>replication lag</b> — followers are eventually, not instantly, current.",
      how: "The primary ships its WAL/oplog to followers in order. <b>Async</b> replication commits before followers apply (fast, but a lag window and possible failover data loss); <b>synchronous</b> replication waits for a follower's ack (no loss, higher latency). Failover promotes the most up-to-date follower."
    },
    steps: STEPS,
    buildViz: buildViz,
    code: {
      title: "Leader–follower streaming replication (Postgres-style)",
      lang: "sql",
      code:
        "-- ── On the PRIMARY (postgresql.conf) ─────────────────────────\n" +
        "wal_level = replica\n" +
        "max_wal_senders = 10                 -- connections that stream WAL\n" +
        "synchronous_standby_names = 'r1'     -- wait for r1's ack on COMMIT\n" +
        "                                     --  (zero data loss to r1; r2 stays async)\n" +
        "\n" +
        "-- ── On a FOLLOWER: stream and replay the primary's WAL ───────\n" +
        "primary_conninfo = 'host=primary application_name=r1'\n" +
        "-- follower is read-only; it applies WAL, tracking its applied LSN\n" +
        "\n" +
        "-- ── Observe lag from the primary ────────────────────────────\n" +
        "SELECT application_name,\n" +
        "       sent_lsn, replay_lsn,\n" +
        "       sent_lsn - replay_lsn AS bytes_behind,\n" +
        "       sync_state                     -- 'sync' | 'async'\n" +
        "FROM pg_stat_replication;\n" +
        "\n" +
        "-- ── App-side read/write split ───────────────────────────────\n" +
        "-- writes + read-your-writes  -> primary\n" +
        "-- everything else            -> a replica (tolerates ms of lag)",
      highlights: [4, 12, 18]
    },
    reference: [
      ["primary / leader", "The one node that accepts writes and orders them"],
      ["replica / follower", "A read-only copy that replays the primary's log"],
      ["WAL / oplog shipping", "Streaming the primary's change records to followers"],
      ["replication lag", "How far (bytes/seconds) a follower trails the primary"],
      ["asynchronous", "Primary commits before followers apply — fast, lag window"],
      ["synchronous", "Primary waits for a follower's ack before commit — no loss"],
      ["failover", "Promoting a follower to primary after the primary fails"],
      ["split-brain", "Two nodes both acting as primary — must be prevented"],
      ["read-your-writes", "A user must see their own just-made write (breaks under lag)"]
    ],
    internals:
      "<p>Replication reuses the log the database already keeps for durability. The primary's <b>WAL</b> (or MySQL binlog, MongoDB oplog) is the ordered record of every change; a follower opens a replication stream, receives those records, and <b>replays them in the same order</b>. Because it replays change records rather than re-running SQL, a follower can't diverge on <code>now()</code>, random values, or trigger side effects.</p>" +
      "<p>The whole game is <b>when the primary considers a commit done</b>. Asynchronous: as soon as the primary's own WAL is flushed — the client gets a fast answer, and the records reach followers slightly later, opening a <b>lag window</b>. Synchronous: the primary additionally waits for a designated standby to confirm the WAL is durable before answering — no acknowledged write can be lost, at the cost of a round-trip on the commit path. Most systems make a <i>subset</i> synchronous ('sync to any 1 of N') to bound that cost.</p>" +
      "<p><b>Failover</b> turns replicas into availability: a controller detects the primary is gone, promotes the most up-to-date follower, and redirects clients. Correctness hinges on two things — promoting a node that actually has the latest acknowledged writes (guaranteed by a sync standby), and ensuring the old primary can't keep accepting writes (<b>fencing</b>), or two primaries emerge and the data forks.</p>",
    engineering:
      "<p>Replication is the backbone of production databases, but it pushes one hard decision onto the application: <b>how much staleness can each read tolerate?</b> Route latency-tolerant reads (catalog, search, analytics) to replicas to scale throughput; route writes and read-your-writes queries to the primary. A proxy (PgBouncer, ProxySQL, RDS Proxy) or an app-level router does the splitting, and a replica that lags too far is pulled from the read pool.</p>" +
      "<p>Operationally, watch replication lag like a hawk — it's the leading indicator of trouble. Lag spikes from a slow/overloaded replica, a saturated network, or a long-running query on the replica blocking WAL replay. For durability decisions, pick sync vs async per workload: synchronous for orders and payments (never lose a confirmed write), async for everything where speed matters more than the last few milliseconds. And always have a tested, automated failover path with fencing — an untested failover is a future outage.</p>",
    gotchas: [
      { kind: "warn", html: "<b>Replicas are eventually consistent.</b> A read on a follower during the lag window returns stale data. If a user must see their own write, route that read to the primary or wait for the replica to reach the write's LSN." },
      { kind: "tip", html: "<b>Make a subset synchronous, not all of it.</b> One synchronous standby gives zero data loss on failover; making <i>every</i> replica synchronous multiplies latency and means any one replica being down stalls all writes." },
      { kind: "info", html: "<b>Failover ≠ just promote a replica.</b> Without fencing you can get split-brain (two primaries) after a partition, and with pure async you can lose the un-shipped WAL tail. Sync replication + fencing (or consensus) close both gaps." }
    ],
    failureModes:
      "<p><b>Stale reads / broken read-your-writes:</b> reads on a lagging replica miss a just-committed write. <i>Fix:</i> route sensitive reads to the primary, or use LSN-wait / 'read from replica caught up to X'.</p>" +
      "<p><b>Failover data loss:</b> with async replication, WAL not yet shipped when the primary dies is lost. <i>Fix:</i> a synchronous standby so at least one node has every acknowledged write.</p>" +
      "<p><b>Split-brain:</b> a network partition leaves the old primary and a promoted replica both taking writes; the data forks. <i>Fix:</i> fencing/STONITH, or consensus-based promotion (Raft) that needs a majority.</p>" +
      "<p><b>Replication stall:</b> a long query or lock on a replica blocks WAL replay, lag climbs unbounded, and the replica can't be read safely or promoted cleanly. <i>Fix:</i> monitor lag, cap replica query time, tune conflict handling.</p>",
    quickCheck: [
      {
        q: "With asynchronous replication, a client's write COMMITs on the primary. A read hits a replica 1 ms later. What can it see?",
        options: ["Always the new value — commit means all copies updated", "Possibly the old value — the replica may not have applied the change yet", "An error — replicas reject reads during replication", "The write is rolled back until all replicas confirm"],
        answer: 1,
        why: "Async replication acknowledges the commit before followers apply it. During the lag window a follower can still return the pre-write value — that's a stale read.",
        diff: "easy"
      },
      {
        q: "Why does a synchronous standby make failover lossless?",
        options: ["It makes writes faster", "The primary waits for the standby's durable ack before acknowledging COMMIT, so the standby always has every acknowledged write", "It prevents all network partitions", "It disables asynchronous replicas"],
        answer: 1,
        why: "Synchronous replication blocks the commit until the standby confirms the WAL is durable. So if the primary dies, the promoted standby already holds every write the client was told succeeded — nothing acknowledged is lost.",
        diff: "medium"
      },
      {
        q: "What is split-brain and what actually prevents it?",
        options: ["Two replicas with different lag; fixed by monitoring", "Two nodes both acting as primary after a partition; prevented by fencing or consensus-based (majority) promotion", "A replica running a slow query; fixed by killing the query", "The primary running out of WAL; fixed by more disk"],
        answer: 1,
        why: "Split-brain is two primaries accepting writes after a partition, forking the data. Just 'promote a replica' can cause it; you need fencing (stop the old primary) or a consensus protocol that only lets a majority-backed node be primary.",
        diff: "hard"
      }
    ],
    interviewQs: [
      {
        q: "Walk me through leader–follower replication and why we use it.",
        a: "One node is the primary and accepts all writes; it streams its change log — WAL in Postgres, binlog in MySQL, oplog in Mongo — to follower replicas that replay it in order to keep identical copies. We do it for two independent reasons: availability, because if the primary dies we promote a follower and keep serving; and read scalability, because read-heavy workloads can fan out across replicas while a single primary keeps writes ordered and simple. The fundamental tradeoff is replication lag: followers are eventually consistent, so a read on a follower can be stale. You manage that by routing reads that must be current — including read-your-writes — to the primary, and everything else to replicas.",
        tip: "Lead with the two reasons (availability, read scaling) and immediately name the cost (lag). That structure signals you actually operate these systems."
      },
      {
        q: "Synchronous vs asynchronous replication — how do you choose?",
        a: "Async replication lets the primary commit and answer the client as soon as its own WAL is durable, shipping to followers afterward. It's fast and the default, but it opens a lag window (stale replica reads) and risks losing the un-shipped tail if the primary dies before it ships. Synchronous replication makes the primary wait for a standby to confirm the WAL is durable before acknowledging the commit — so no acknowledged write can be lost in a failover — at the cost of a network round-trip per commit and lower write availability if the sync standby is down. The usual answer is per-workload: synchronous to one standby for orders/payments where losing a confirmed write is unacceptable, async for everything where a few milliseconds of staleness is fine. And you make a subset synchronous, not all, to bound the latency.",
        tip: "Say 'sync to one of N' — it shows you know how to get zero-loss without paying full synchronous latency."
      },
      {
        q: "What are the dangers in a failover and how do you make it safe?",
        a: "Two big ones. First, data loss: with async replication, whatever the primary hadn't shipped is gone when you promote a follower — you close this with a synchronous standby, so the promoted node already has every acknowledged write. Second, split-brain: after a network partition the old primary might keep taking writes while a new one is promoted, and the data forks. You prevent that with fencing (forcibly stopping or isolating the old primary) or, better, a consensus protocol where only a node backed by a majority can be primary — which is exactly what Raft gives you. Practically, you also want automated, tested failover (Patroni, Orchestrator, managed RDS), because an untested failover path is just a future outage, and you promote the most up-to-date replica by LSN.",
        tip: "Name both failure modes explicitly — data loss and split-brain — and pair each with its fix (sync standby; fencing/consensus). Then reference Raft as the principled solution."
      }
    ],
    businessLens: {
      task: "Serving ShopKart's catalog reads at scale while never losing a confirmed order",
      meaning: "Reads scale across replicas; order writes survive any single node failure.",
      system: "Postgres primary + streaming replicas",
      point: "ShopKart runs one primary and several replicas. Millions of product-page and search reads fan out to the replicas, so the storefront scales without overloading the primary — accepting that a replica may be milliseconds stale, which is invisible on a catalog page. Order and payment writes go to the primary and are replicated <b>synchronously</b> to one standby, so a confirmed order can never vanish in a failover. The one place ShopKart pins reads to the primary is a shopper's own cart and just-placed order, so nobody ever sees their action 'undone' by replica lag. When a zone fails, the caught-up standby is promoted with every confirmed order intact."
    }
  };
})();
