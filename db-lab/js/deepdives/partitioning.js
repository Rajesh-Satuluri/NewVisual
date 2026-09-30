/* ============================================================
   deepdives/partitioning.js — "Partitioning" (sharding) deep dive.
   Registers DBLab.deepDives['partitioning'] (concept m57).
   Authored against the contract documented in deepdives/mvcc.js.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  DL.deepDives = DL.deepDives || {};

  // Scene: ShopKart's orders table, keyed by customer bucket A..H, split
  // across shards. We watch range vs hash partitioning, single-shard vs
  // scatter/gather routing, a hot partition, and rebalancing on growth.
  var STEPS = [
    {
      label: "1 · One node, one capacity ceiling",
      what: "ShopKart's <code>orders</code> table lives on a single node holding every customer bucket, <b>A–H</b>. As the business grows, this one node hits a wall — its CPU, RAM, and disk are a hard ceiling no index can raise.",
      why: "Replication scales <i>reads</i>, but every write still lands on one primary, and the whole dataset must fit one machine. <b>Partitioning</b> (a.k.a. sharding) is how you scale <i>writes</i> and <i>storage</i> horizontally: split the data across nodes so each holds only a slice.",
      how: "Nothing is split yet. One node owns all keys, so it absorbs 100% of the write throughput and stores 100% of the rows.",
      when: "The point where a table (or its write rate) outgrows the biggest single machine you can buy or afford.",
      mistake: "Reaching for sharding too early. It adds real complexity (routing, cross-shard queries, rebalancing); scale up and add replicas first, shard when you genuinely must.",
      interview: "“Replication vs partitioning?” Replication = copies of the <i>same</i> data (availability + read scale). Partitioning = <i>different</i> data on each node (write + storage scale). Real systems use both.",
      example: "ShopKart's orders table is 4 TB and taking 40k writes/sec — one node can't hold it or keep up. Time to shard.",
      viz: {
        shards: [{ id: "N1", role: "single node", keys: ["A", "B", "C", "D", "E", "F", "G", "H"], foot: [{ t: "100% of writes", k: "warn" }], cls: "leader hot" }],
        note: "One node owns all keys → it caps both write throughput and total storage. Partitioning splits the data across nodes."
      }
    },
    {
      label: "2 · Range partitioning — split by ordered ranges",
      what: "Split the key space into <b>contiguous ranges</b>: shard&nbsp;1 gets <b>A–C</b>, shard&nbsp;2 gets <b>D–F</b>, shard&nbsp;3 gets <b>G–H</b>. Each shard owns a slice; a router knows which range lives where.",
      why: "Range partitioning keeps ordered keys together, so <b>range scans stay local</b> — 'all orders from customers D–F' hits one shard. It's the natural choice when you query by ranges of the key (time, ID prefix, region).",
      how: "A routing table maps ranges → shards. A lookup binary-searches the ranges to find the owning shard. Ranges can be split/merged as data grows (this is how Bigtable/HBase tablets and CockroachDB ranges work).",
      when: "Time-series (partition by day/month), ID ranges, geographic regions — anywhere range queries dominate.",
      mistake: "Picking a range key with a moving hot edge — e.g. partition orders by <code>created_at</code> and every new write lands on the newest shard, so one shard takes all the load.",
      interview: "“When is range partitioning the right call?” When your reads are range scans on the partition key; the risk is skew/hot ranges, especially monotonic keys like timestamps.",
      example: "ShopKart archives orders by month; 'give me March's orders' reads one shard, not all of them.",
      viz: {
        shards: [
          { id: "shard 1", role: "range A–C", keys: ["A", "B", "C"], foot: [{ t: "range-local scans", k: "ok" }], cls: "follower" },
          { id: "shard 2", role: "range D–F", keys: ["D", "E", "F"], foot: [{ t: "range-local scans", k: "ok" }], cls: "follower" },
          { id: "shard 3", role: "range G–H", keys: ["G", "H"], foot: [{ t: "range-local scans", k: "ok" }], cls: "follower" }
        ],
        note: "Contiguous ranges keep ordered keys together → range scans hit one shard. Watch for skew and monotonic hot edges."
      }
    },
    {
      label: "3 · Hash partitioning — spread by hash(key)",
      what: "Instead of ranges, route each key by <code>hash(key)&nbsp;mod&nbsp;N</code>. The buckets scatter evenly across shards — S1 gets <b>A, D, G</b>; S2 gets <b>B, E, H</b>; S3 gets <b>C, F</b>. No shard is an obvious hot range.",
      why: "Hashing <b>spreads load evenly</b> and defuses the monotonic-key problem — sequential IDs and timestamps no longer pile onto one shard. It's the default for even write distribution.",
      how: "The router computes <code>hash(partition_key)</code> and maps it to a shard (directly mod N, or via a hash ring — see Consistent Hashing). Point lookups are still one shard: hash the key, go there.",
      when: "Key-value and OLTP workloads dominated by point lookups on the key, where even distribution matters more than range locality.",
      mistake: "Expecting range scans to be cheap under hashing. Adjacent keys land on different shards, so 'customers A–C' becomes a scatter/gather across all shards.",
      interview: "“Hash vs range partitioning?” Hash → even load, but range scans scatter to every shard. Range → local range scans, but skew/hot-range risk. Choose by your dominant query and load shape.",
      example: "ShopKart hashes on <code>customer_id</code> so no single shard is hammered by a burst of new sign-ups with sequential IDs.",
      viz: {
        shards: [
          { id: "shard 1", role: "hash → 0", keys: ["A", "D", "G"], foot: [{ t: "even load", k: "ok" }], cls: "follower" },
          { id: "shard 2", role: "hash → 1", keys: ["B", "E", "H"], foot: [{ t: "even load", k: "ok" }], cls: "follower" },
          { id: "shard 3", role: "hash → 2", keys: ["C", "F"], foot: [{ t: "even load", k: "ok" }], cls: "follower" }
        ],
        note: "hash(key) mod N spreads keys evenly and kills monotonic hotspots — but adjacent keys scatter, so range scans hit every shard."
      }
    },
    {
      label: "4 · A point lookup routes to one shard",
      what: "A query for customer <b>E</b>'s orders. The router hashes <code>E</code>, gets shard&nbsp;2, and sends the query <b>only there</b>. The other shards do no work.",
      why: "This is partitioning's best case: when the query includes the partition key, it touches exactly one shard, so total capacity scales linearly with shard count. Aim to make your hottest queries look like this.",
      how: "Router: <code>shard = hash('E') mod 3 = 1</code> → shard 2. One network hop, one shard's index, one result set. No coordination.",
      when: "Any query filtered by the partition key: <code>WHERE customer_id = ?</code>, <code>GET key</code>, a user loading their own data.",
      mistake: "Choosing a partition key your queries don't filter by. If you shard by <code>customer_id</code> but mostly query by <code>product_id</code>, every query scatters — the key must match the access pattern.",
      interview: "“What makes a good partition key?” High cardinality, even distribution, and — crucially — it appears in your dominant queries so they hit a single shard.",
      example: "A shopper opens 'my orders'; the request routes to the one shard holding their customer bucket and returns fast.",
      viz: {
        route: "E",
        shards: [
          { id: "shard 1", role: "hash → 0", keys: ["A", "D", "G"], foot: [{ t: "idle", k: "info" }], cls: "follower" },
          { id: "shard 2", role: "hash → 1", keys: ["B", "E", "H"], foot: [{ t: "routed here ✓", k: "ok" }], cls: "follower hot" },
          { id: "shard 3", role: "hash → 2", keys: ["C", "F"], foot: [{ t: "idle", k: "info" }], cls: "follower" }
        ],
        note: "Query includes the partition key → hash it, hit one shard. This is the case that scales linearly. Pick the key your hot queries filter by."
      }
    },
    {
      label: "5 · A cross-shard query scatters and gathers",
      what: "A query that <i>isn't</i> filtered by the partition key — say 'total revenue across all customers' — must <b>fan out to every shard</b> (scatter), then merge the partial results (gather). All three shards work in parallel.",
      why: "Cross-shard queries lose the single-shard win: latency is bounded by the <i>slowest</i> shard, a coordinator must merge results, and JOINs across shards get expensive. Their cost is why partition-key choice matters so much.",
      how: "A coordinator sends the query to all shards, each computes its partial aggregate, and the coordinator combines them (sum of sums, merge of sorted runs). Cross-shard transactions additionally need two-phase commit.",
      when: "Analytics, global aggregates, and any query whose filter doesn't include the partition key.",
      mistake: "Building an app whose common queries are all cross-shard. If most queries scatter, sharding added cost without the scaling benefit — revisit the key or denormalize.",
      interview: "“What's the cost of a cross-shard query?” Fan-out to N shards, tail-latency bound by the slowest, a merge step, and expensive cross-shard JOINs/transactions (2PC). Minimize them by co-locating related data.",
      example: "ShopKart's finance dashboard sums revenue across all shards nightly — a scatter/gather — while the customer-facing 'my orders' stays single-shard and fast.",
      viz: {
        scatter: true,
        shards: [
          { id: "shard 1", role: "partial sum", keys: ["A", "D", "G"], foot: [{ t: "scanned", k: "accent" }], cls: "follower hot" },
          { id: "shard 2", role: "partial sum", keys: ["B", "E", "H"], foot: [{ t: "scanned", k: "accent" }], cls: "follower hot" },
          { id: "shard 3", role: "partial sum", keys: ["C", "F"], foot: [{ t: "scanned", k: "accent" }], cls: "follower hot" }
        ],
        note: "No partition key in the filter → scatter to all shards, gather + merge. Latency = slowest shard. Keep hot queries single-shard."
      }
    },
    {
      label: "6 · Hot partition — skew breaks the balance",
      what: "One bucket goes viral — a flash sale funnels a huge share of traffic to customer bucket <b>B</b> on shard&nbsp;2. That shard saturates while the others idle. The cluster's <i>average</i> load looks fine; shard&nbsp;2 is on fire.",
      why: "Partitioning only helps if load is <b>even</b>. A single hot key (a celebrity, a viral product, a bot) can overwhelm one shard no matter how many shards you have — you can't out-scale a hotspot by adding shards, because the hot key still maps to one place.",
      how: "The hot key concentrates on its owning shard. Mitigations: <b>split</b> the hot key across shards by salting (append a random suffix so <code>B#0..B#3</code> spread out), add a cache in front, or give the hot entity its own dedicated shard.",
      when: "Flash sales, celebrity accounts, trending items, and any Zipfian workload where a few keys dominate.",
      mistake: "Assuming a good hash guarantees even load. Hashing spreads <i>keys</i> evenly, not <i>traffic</i> — if one key is hot, it's still one shard's problem.",
      interview: "“How do you handle a hot partition?” Detect skew, then split/salt the hot key across shards, cache it, or isolate it — because adding shards alone won't help a single hot key.",
      example: "A limited-edition ShopKart drop makes one product bucket 20× hotter than the rest; the team salts that key across four sub-partitions and fronts it with a cache.",
      viz: {
        shards: [
          { id: "shard 1", role: "hash → 0", keys: ["A", "D", "G"], foot: [{ t: "cool", k: "info" }], cls: "follower" },
          { id: "shard 2", role: "hash → 1", keys: ["B", "E", "H"], foot: [{ t: "🔥 saturated", k: "bad" }], cls: "follower stale hot" },
          { id: "shard 3", role: "hash → 2", keys: ["C", "F"], foot: [{ t: "cool", k: "info" }], cls: "follower" }
        ],
        note: "A single hot key overwhelms its shard — extra shards don't help. Mitigate by salting/splitting the hot key, caching, or isolating it."
      }
    },
    {
      label: "7 · Rebalancing — add a shard without reshuffling everything",
      what: "Growth demands a 4th shard. Done naively (<code>hash mod N</code> with N: 3→4), <i>almost every</i> key remaps and the cluster copies itself around. With <b>consistent hashing</b>, only a slice moves — here <b>D</b> and <b>H</b> migrate to the new shard&nbsp;4; the rest stay put.",
      why: "Rebalancing is the hardest operational part of sharding. The goal is to change the shard count while moving the <b>minimum</b> data (≈ K/N keys) and without downtime — otherwise every resize is a self-inflicted outage.",
      how: "Consistent hashing (and virtual nodes) place keys on a ring so adding a node only steals the arc between it and its neighbor. Systems copy the affected key ranges to the new shard in the background, then cut over.",
      when: "Any time you add/remove shards: scaling out, replacing hardware, or spreading a hot range.",
      mistake: "Using plain <code>hash mod N</code> in a system that will ever resize. Changing N remaps nearly all keys — a massive, disruptive data movement. Use consistent hashing or a fixed large partition count mapped to nodes.",
      interview: "“Why not just hash mod N?” Because changing N remaps ~all keys. Consistent hashing (or a fixed partition count) moves only ≈K/N keys when the cluster resizes.",
      example: "ShopKart adds a shard for the holiday peak; consistent hashing migrates roughly a quarter of the buckets in the background while the store keeps serving.",
      viz: {
        shards: [
          { id: "shard 1", role: "ring arc", keys: ["A", "G"], foot: [{ t: "unchanged", k: "info" }], cls: "follower" },
          { id: "shard 2", role: "ring arc", keys: ["B", "E"], foot: [{ t: "unchanged", k: "info" }], cls: "follower" },
          { id: "shard 3", role: "ring arc", keys: ["C", "F"], foot: [{ t: "unchanged", k: "info" }], cls: "follower" },
          { id: "shard 4", role: "NEW", keys: ["D*", "H*"], foot: [{ t: "migrated in", k: "ok" }], cls: "new-leader hot" }
        ],
        note: "Consistent hashing moves only ≈K/N keys when you add a shard (here D, H). Plain hash mod N would remap almost everything."
      }
    }
  ];

  function buildViz(host) {
    host.classList.add("dd-viz");

    function chip(c) { return '<span class="dd-chip dd-chip--' + (c.k || "info") + '">' + c.t + "</span>"; }
    function keyHtml(k) {
      var migrated = k.indexOf("*") >= 0;
      var style = migrated ? ' style="border:1px solid var(--green);color:var(--green)"' : "";
      return '<span class="dd-kv-item"' + style + ">" + k.replace("*", "") + "</span>";
    }
    function shardHtml(sh) {
      return '<div class="dd-dnode ' + (sh.cls || "") + '">' +
        '<div class="dd-dnode-hd"><span class="dd-dnode-id">' + sh.id + '</span>' +
          '<span class="dd-dnode-role">' + sh.role + "</span></div>" +
        '<div class="dd-dnode-keys">' + sh.keys.map(keyHtml).join("") + "</div>" +
        '<div class="dd-dnode-foot">' + (sh.foot || []).map(chip).join("") + "</div>" +
      "</div>";
    }

    function update(idx, step) {
      var s = step && step.viz;
      if (idx < 0 || !s) {
        host.innerHTML = '<div class="dd-empty">Press <b>Play</b> to split ShopKart\'s orders across shards — ' +
          "range vs hash partitioning, single-shard vs scatter/gather routing, a hot partition, and rebalancing onto a new shard.</div>";
        return;
      }
      var head = "";
      if (s.route) head = '<div class="dd-verdict ok"><b>Route:</b> query for customer <code>' + s.route + "</code> → hash → one shard.</div>";
      else if (s.scatter) head = '<div class="dd-verdict warn"><b>Scatter / gather:</b> no partition key in filter → fan out to every shard, then merge.</div>';

      var html = '<div class="dd-section"><div class="dd-section-label">Shards · ShopKart orders (keyed by customer bucket)</div>' +
        (head ? head : "") +
        '<div class="dd-cluster dd-cluster--left">' + s.shards.map(shardHtml).join("") + "</div></div>";
      if (s.note) html += '<div class="dd-note">' + s.note + "</div>";
      host.innerHTML = html;
    }

    return { update: update, destroy: function () { host.innerHTML = ""; host.classList.remove("dd-viz"); } };
  }

  DL.deepDives["partitioning"] = {
    slug: "partitioning",
    overview: {
      what: "<b>Partitioning</b> (sharding) splits one logical table across many nodes, each owning a disjoint <b>slice</b> of the rows, chosen by a <b>partition key</b>. Unlike replication (copies of the same data), each shard holds <i>different</i> data.",
      why: "It's how you scale <b>writes</b> and <b>storage</b> beyond a single machine: each shard absorbs a fraction of the write rate and stores a fraction of the rows. The art is picking a key that keeps hot queries on one shard and load spread evenly.",
      how: "A router maps each key to a shard — by <b>range</b> (contiguous slices; range scans stay local) or by <b>hash</b> (even spread; range scans scatter). Queries with the partition key hit one shard; queries without it scatter/gather. Hot keys and rebalancing (via consistent hashing) are the hard parts."
    },
    steps: STEPS,
    buildViz: buildViz,
    code: {
      title: "Choosing and routing on a partition key",
      lang: "sql",
      code:
        "-- Hash partitioning (declarative, Postgres): even spread by customer_id\n" +
        "CREATE TABLE orders (customer_id bigint, id bigint, total numeric, ...)\n" +
        "  PARTITION BY HASH (customer_id);\n" +
        "CREATE TABLE orders_s0 PARTITION OF orders FOR VALUES WITH (MODULUS 4, REMAINDER 0);\n" +
        "-- ... s1, s2, s3 on separate nodes / tablespaces\n" +
        "\n" +
        "-- SINGLE-SHARD (fast): filter includes the partition key\n" +
        "SELECT * FROM orders WHERE customer_id = 4711;      -- routes to one shard\n" +
        "\n" +
        "-- SCATTER/GATHER (costly): no partition key in the filter\n" +
        "SELECT sum(total) FROM orders WHERE created_at >= now() - '1 day';\n" +
        "--   -> fans out to every shard, coordinator merges partial sums\n" +
        "\n" +
        "-- Range partitioning instead, when range scans dominate:\n" +
        "--   PARTITION BY RANGE (created_at)  -> 'March orders' hits one partition\n" +
        "--   (but a monotonic key like created_at risks a hot newest partition)",
      highlights: [9, 12, 13]
    },
    reference: [
      ["partition / shard", "One node's disjoint slice of the rows"],
      ["partition key", "The column that decides which shard a row lives on"],
      ["range partitioning", "Split by contiguous key ranges (range scans stay local)"],
      ["hash partitioning", "Route by hash(key) mod N (even spread, range scans scatter)"],
      ["router / coordinator", "Maps keys to shards; merges cross-shard results"],
      ["single-shard query", "Filter includes the partition key → one shard"],
      ["scatter / gather", "Fan a query to all shards, then merge partial results"],
      ["hot partition", "One key/shard taking a disproportionate share of load"],
      ["rebalancing", "Moving key ranges when shards are added/removed"],
      ["consistent hashing", "Ring placement that moves ≈K/N keys on resize"]
    ],
    internals:
      "<p>Partitioning maps a <b>partition key</b> to an owning shard. <b>Range</b> partitioning assigns contiguous slices (A–C, D–F, …); a routing table (or a range tree) resolves a key to its shard, and ranges split/merge as they grow — this is how HBase tablets and CockroachDB ranges work, and it keeps range scans on the key local to one shard. <b>Hash</b> partitioning routes by <code>hash(key)</code>, spreading keys evenly and defusing monotonic hotspots, at the cost of scattering range scans across all shards.</p>" +
      "<p>The query's relationship to the key decides everything. If the filter <b>includes the partition key</b>, the router sends it to exactly one shard — capacity then scales linearly with shard count. If it doesn't, the query becomes a <b>scatter/gather</b>: a coordinator fans it to every shard, each returns a partial result, and the coordinator merges them; its latency is bound by the slowest shard, and cross-shard JOINs and transactions need extra machinery (two-phase commit). So partition-key choice is really query-pattern design: high cardinality, even distribution, and present in the hot queries.</p>" +
      "<p>Two operational hazards define real sharding. <b>Hot partitions</b>: hashing spreads keys evenly but not <i>traffic</i> — one hot key still lands on one shard, so you mitigate by salting/splitting the key, caching, or isolating it, not by adding shards. <b>Rebalancing</b>: naive <code>hash mod N</code> remaps almost every key when N changes, so production systems use <b>consistent hashing</b> (with virtual nodes) or a fixed large partition count mapped onto nodes, so adding a shard moves only ≈K/N keys.</p>",
    engineering:
      "<p>Shard only when you must — after scaling up and adding read replicas — because partitioning pushes real complexity into the app: a routing layer, cross-shard query and transaction handling, and a rebalancing story. When you do, choose the partition key by your <b>dominant access pattern</b> so the hottest queries are single-shard; a key your queries don't filter by turns every request into a scatter/gather and you paid for sharding with none of the win.</p>" +
      "<p>Design to keep related data co-located (e.g. shard orders and order-items by the same <code>customer_id</code>) so common JOINs stay on one shard and you avoid distributed transactions. Plan for skew from day one — detect hot keys and have a salting/caching plan — and pick a scheme that rebalances cheaply (consistent hashing or a fixed partition count), because you <i>will</i> add shards. And combine with replication: each shard is itself a replicated primary+followers, so you get write scale <i>and</i> availability together.</p>",
    gotchas: [
      { kind: "warn", html: "<b>The partition key must match your queries.</b> If your hot queries don't filter by the key, every one becomes a scatter/gather across all shards — you added complexity and lost the scaling benefit." },
      { kind: "tip", html: "<b>You can't out-scale a hot key by adding shards.</b> A single hot key still maps to one shard. Split/salt it across shards, cache it, or isolate it — detect skew before it takes a shard down." },
      { kind: "info", html: "<b>Avoid plain <code>hash mod N</code> if you'll ever resize.</b> Changing N remaps nearly every key. Consistent hashing (or a fixed large partition count mapped to nodes) moves only ≈K/N keys when the cluster grows." }
    ],
    failureModes:
      "<p><b>Hot partition:</b> a viral key concentrates load on one shard while others idle; average load looks fine, that shard melts. <i>Fix:</i> salt/split the hot key, cache it, or give it a dedicated shard.</p>" +
      "<p><b>Scatter-heavy workload:</b> the common queries don't include the partition key, so most requests fan out to all shards. <i>Fix:</i> re-choose the key to match access patterns, add a secondary index/lookup table, or denormalize.</p>" +
      "<p><b>Rebalancing storm:</b> plain <code>hash mod N</code> remaps almost all keys on resize, causing a massive copy and downtime. <i>Fix:</i> consistent hashing / fixed partition count so only ≈K/N keys move.</p>" +
      "<p><b>Cross-shard transaction cost:</b> a write spanning shards needs two-phase commit, which is slow and blocks on a coordinator. <i>Fix:</i> co-locate related data on one shard so the transaction stays local.</p>",
    quickCheck: [
      {
        q: "You shard orders by hash(customer_id). Which query hits a single shard?",
        options: ["SELECT sum(total) FROM orders", "SELECT * FROM orders WHERE customer_id = 4711", "SELECT * FROM orders WHERE created_at > '2024-01-01'", "SELECT * FROM orders ORDER BY total DESC LIMIT 10"],
        answer: 1,
        why: "Only the query that filters by the partition key (customer_id) can be routed to one shard. The others don't include the key, so they scatter/gather across all shards.",
        diff: "easy"
      },
      {
        q: "A flash sale makes one product bucket 20× hotter than the rest, saturating its shard. What actually helps?",
        options: ["Add more shards — the load will spread out", "Split/salt the hot key across shards (or cache/isolate it)", "Switch from hash to range partitioning", "Add read replicas of that shard only"],
        answer: 1,
        why: "A single hot key maps to one shard no matter how many shards exist, so adding shards doesn't help. You must break up the hot key itself — salting/splitting it across shards, caching it, or isolating it. (Replicas help hot reads but not hot writes.)",
        diff: "medium"
      },
      {
        q: "Why do production systems avoid plain hash(key) mod N for shard assignment?",
        options: ["It's slower to compute than range lookups", "Changing N (adding/removing a shard) remaps nearly every key, forcing a huge data move", "It can't distribute keys evenly", "It doesn't support point lookups"],
        answer: 1,
        why: "With hash mod N, changing N changes almost every key's target, so a resize copies most of the dataset around. Consistent hashing (or a fixed large partition count mapped to nodes) moves only ≈K/N keys when the cluster grows.",
        diff: "hard"
      }
    ],
    interviewQs: [
      {
        q: "How does partitioning differ from replication, and when do you reach for it?",
        a: "Replication keeps copies of the same data on multiple nodes — it buys availability and read scaling, but every write still hits one primary and the whole dataset must fit one machine. Partitioning (sharding) splits the data so each node owns a different slice keyed by a partition key — that's what scales writes and total storage horizontally. I reach for partitioning only after scaling up and adding replicas, because it forces real complexity: a routing layer, cross-shard queries and transactions, and rebalancing. In practice you use both together: each shard is itself a replicated primary with followers, so you get write scale and availability at once.",
        tip: "State the one-liner: replication = same data copied (read scale/HA); partitioning = different data per node (write/storage scale). Then say 'and real systems combine them.'"
      },
      {
        q: "How do you choose a partition key, and what goes wrong with a bad one?",
        a: "A good partition key has high cardinality, distributes load evenly, and — most importantly — appears in your dominant queries so those queries route to a single shard. If the key doesn't match your access pattern, most queries become scatter/gather across every shard: you get the complexity of sharding with none of the scaling benefit, and cross-shard JOINs and transactions get expensive. The other failure is skew: even a well-distributed key can have a single hot value (a celebrity customer, a viral product) that concentrates traffic on one shard, and you can't fix that by adding shards — you salt/split the hot key, cache it, or isolate it. I also try to co-locate related entities under the same key so common transactions stay on one shard.",
        tip: "Three properties — cardinality, even distribution, matches hot queries — then name the two failure modes (scatter, hot key) with their fixes."
      },
      {
        q: "How do you add a shard without moving all the data, and why is that hard?",
        a: "The naive scheme, hash(key) mod N, breaks on resize: changing N changes almost every key's destination, so adding one shard copies most of the cluster around — effectively an outage. The fix is to decouple key placement from the node count. Consistent hashing places keys and nodes on a ring, so adding a node only takes over the arc between it and its neighbor — about K/N keys move, not all of them; virtual nodes smooth out the distribution. An alternative is to fix a large number of partitions up front (say 1024) and map partitions to nodes, so scaling just reassigns whole partitions without rehashing keys. Either way you copy the affected ranges in the background and cut over, so the resize is incremental and online.",
        tip: "Contrast hash-mod-N (remaps everything) with consistent hashing / fixed partition count (moves ≈K/N). Mention virtual nodes and background copy + cutover."
      }
    ],
    businessLens: {
      task: "Scaling ShopKart's orders table past a single machine",
      meaning: "Writes and storage spread across shards; the hottest queries still hit one shard.",
      system: "Sharded Postgres (orders keyed by customer_id)",
      point: "ShopKart's orders table outgrew one node, so it shards by <code>customer_id</code> — the key its hottest query ('my orders') filters by, so those requests route to a single shard and scale linearly. Nightly finance aggregates deliberately scatter/gather across all shards, which is fine for a background job. The team salts and caches the handful of viral product buckets so a flash sale can't melt one shard, co-locates order-items under the same <code>customer_id</code> so checkout stays a single-shard transaction, and uses consistent hashing so adding a shard for the holiday peak moves only a quarter of the data — online, with no downtime."
    }
  };
})();
