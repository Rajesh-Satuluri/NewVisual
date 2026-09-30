/* ============================================================
   deepdives/consistent-hashing.js — "Consistent Hashing" deep dive.
   Registers DBLab.deepDives['consistent-hashing'] (concept m61).
   Authored against the contract documented in deepdives/mvcc.js.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  DL.deepDives = DL.deepDives || {};

  var CY = "var(--cyan)", AF = "var(--airflow)", PU = "var(--purple)", GR = "var(--green)", OR = "var(--orange)";
  // 8 ShopKart keys placed at fixed angles on the ring (degrees, clockwise).
  var KEYS = [
    { k: "A", ang: 60 }, { k: "B", ang: 100 }, { k: "C", ang: 175 }, { k: "D", ang: 210 },
    { k: "E", ang: 285 }, { k: "F", ang: 320 }, { k: "G", ang: 350 }, { k: "H", ang: 8 }
  ];

  var STEPS = [
    {
      label: "1 · Hash the nodes onto a ring",
      what: "Picture the hash space — <code>0 … 2³²−1</code> — bent into a <b>ring</b>. Each cache/DB node is hashed by its ID to a <b>point</b> on that ring. ShopKart places three nodes: <b>N1, N2, N3</b>.",
      why: "This is the trick that makes rebalancing cheap. By hashing <i>nodes</i> onto the same ring as keys, adding or removing a node only disturbs a small arc — instead of <code>hash mod N</code>, which reshuffles almost everything when N changes.",
      how: "Both node IDs and keys go through the same hash function. A node's hash fixes its position on the ring; the ring wraps around, so the space is continuous.",
      when: "Distributed caches (memcached clients, Ketama), DynamoDB/Cassandra partitioning, CDNs, and any sharding that must resize online.",
      mistake: "Confusing the ring with <code>hash mod N</code>. The ring exists precisely so the node count isn't baked into every key's location.",
      interview: "“What problem does consistent hashing solve?” Remapping cost on resize: plain hash mod N moves ~all keys when N changes; the ring moves only ≈K/N.",
      example: "ShopKart hashes its three cache nodes onto the ring; the whole 32-bit space is now covered by three positions.",
      viz: {
        nodes: [{ id: "N1", ang: 20, c: CY, lbl: 1 }, { id: "N2", ang: 140, c: AF, lbl: 1 }, { id: "N3", ang: 250, c: PU, lbl: 1 }],
        moved: [],
        note: "The hash space 0…2³²−1 is a ring. Nodes are hashed onto it, just like keys — that shared placement is the whole idea."
      }
    },
    {
      label: "2 · Keys map clockwise to the next node",
      what: "Each key is hashed to a point and owned by the <b>first node clockwise</b> from it. Walk clockwise from a key until you hit a node — that node stores it. Every key lands on exactly one node.",
      why: "This rule is what localizes disruption: a key only cares about the <i>next</i> node clockwise, so changes elsewhere on the ring don't touch it. Ownership is a purely local property of each arc.",
      how: "Node N owns the arc from the previous node up to N — every key hashing into that arc belongs to N. Lookups hash the key and binary-search the sorted node positions for the next one clockwise.",
      when: "Every read/write: hash the key, find the owning node, go there.",
      mistake: "Thinking a key is owned by the nearest node in either direction. It's strictly the next node <i>clockwise</i> — that directionality is what keeps rebalancing local.",
      interview: "“How is a key assigned to a node on the ring?” Hash the key to a point; its owner is the first node encountered going clockwise (the node whose arc it falls in).",
      example: "ShopKart key C hashes into N3's arc, so it's stored on N3; key E wraps past the top of the ring to N1.",
      viz: {
        nodes: [{ id: "N1", ang: 20, c: CY, lbl: 1 }, { id: "N2", ang: 140, c: AF, lbl: 1 }, { id: "N3", ang: 250, c: PU, lbl: 1 }],
        moved: [],
        note: "Each key is owned by the first node CLOCKWISE. Colours show ownership; each node owns the arc ending at its position."
      }
    },
    {
      label: "3 · Add a node — only one arc moves",
      what: "ShopKart adds <b>N4</b> onto the ring. It takes over just the arc between it and its predecessor (N3). Only the keys in that slice — <b>E and F</b> — move (from N1 to N4). Every other key stays exactly where it was.",
      why: "This is the payoff: adding a node relocates only ≈<b>K/N</b> keys, not the whole dataset. Scaling out is a small, background copy of one arc — not a cluster-wide reshuffle and outage.",
      how: "N4's hash falls between N3 and N1(wrap). The keys that used to walk clockwise past N4 to reach N1 now stop at N4. The system copies just those keys to N4, then flips ownership.",
      when: "Scaling out, replacing a node, or spreading load — the common online operations.",
      mistake: "Expecting the whole ring to rebalance. Only the new node's arc is affected; neighbors far away don't move a single key.",
      interview: "“How many keys move when you add a node with consistent hashing?” About K/N (one node's share), and only from the immediate predecessor's arc — versus ~all keys with hash mod N.",
      example: "ShopKart's holiday scale-out adds N4; keys E and F migrate to it in the background while the store keeps serving the rest untouched.",
      viz: {
        nodes: [{ id: "N1", ang: 20, c: CY, lbl: 1 }, { id: "N2", ang: 140, c: AF, lbl: 1 }, { id: "N3", ang: 250, c: PU, lbl: 1 }, { id: "N4", ang: 335, c: GR, lbl: 1 }],
        moved: ["E", "F"],
        note: "Adding N4 moves only the keys in its arc (E, F) from N1. ≈K/N keys move — a local copy, not a cluster-wide reshuffle."
      }
    },
    {
      label: "4 · Remove a node — its keys roll to the next",
      what: "A node fails: <b>N2</b> leaves the ring. Its keys (<b>A and B</b>) simply roll clockwise to the next node, <b>N3</b>. Again, only the departed node's arc is affected — no other key moves.",
      why: "Symmetric to adding: removing a node hands its arc to exactly one neighbor. Failure handling is therefore cheap and local, which is what lets clusters tolerate churn gracefully.",
      how: "With N2 gone, keys that used to stop at N2 continue clockwise to N3. If the data was replicated, N3 (or the next replicas) already have copies, so there's little or nothing to move.",
      when: "Node failures, decommissioning, autoscaling in — churn is constant at scale.",
      mistake: "Redistributing a failed node's keys across all survivors. On the ring they go only to the successor — which is why replication is placed on the next R nodes clockwise.",
      interview: "“What happens to a failed node's keys?” They roll to the next node clockwise; only that arc is affected. Replicas on the following nodes make it seamless.",
      example: "When ShopKart's N2 crashes, keys A and B are served by N3 immediately (N3 already held replicas), with no global rebalance.",
      viz: {
        nodes: [{ id: "N1", ang: 20, c: CY, lbl: 1 }, { id: "N3", ang: 250, c: PU, lbl: 1 }, { id: "N4", ang: 335, c: GR, lbl: 1 }],
        moved: ["A", "B"],
        note: "Removing N2 rolls only its keys (A, B) to the next node clockwise (N3). Every other assignment is untouched."
      }
    },
    {
      label: "5 · The skew problem with few nodes",
      what: "With only a handful of nodes, the ring's arcs are <b>uneven</b> — random hashing rarely spaces three points evenly. Here N1's arc is huge and it ends up owning <b>most</b> of the keys, while N2 and N3 sit nearly idle.",
      why: "Plain consistent hashing balances load only <i>on average</i>, over many nodes. With few nodes the variance is large, so one node becomes a hotspot — you get the ring's cheap rebalancing but not even load.",
      how: "Because each node is a single random point, arc sizes follow a wide distribution. The expected imbalance shrinks as nodes grow, but small clusters can be badly lopsided.",
      when: "Small clusters, or any time you notice one node hot while others idle despite consistent hashing.",
      mistake: "Assuming the ring guarantees even load. It guarantees cheap movement, not balance — balance needs many points per node (next step).",
      interview: "“Does consistent hashing balance load evenly?” Only asymptotically. With few nodes, arcs are uneven and a node can own a disproportionate share — fixed by virtual nodes.",
      example: "ShopKart notices one cache node at 80% CPU while two idle — a classic small-ring skew, not a traffic problem.",
      viz: {
        nodes: [{ id: "N1", ang: 20, c: CY, lbl: 1 }, { id: "N2", ang: 60, c: AF, lbl: 1 }, { id: "N3", ang: 110, c: PU, lbl: 1 }],
        moved: [],
        note: "Few nodes → uneven arcs. N1's arc is huge, so it owns most keys — the ring gives cheap movement, not even load."
      }
    },
    {
      label: "6 · Virtual nodes smooth the distribution",
      what: "The fix: give each physical node <b>many</b> points on the ring (<b>virtual nodes</b>). Each of N1/N2/N3 now appears at several positions, so their arcs <b>interleave</b> and every node ends up owning a fair, similar share.",
      why: "More points per node means the law of large numbers kicks in even for a small cluster — arc sizes even out. Vnodes also make rebalancing <i>finer-grained</i> (a new node steals a little from many nodes) and let you weight bigger machines with more vnodes.",
      how: "For each physical node, hash <code>node-id#1, node-id#2, …</code> to place, say, 100–200 vnodes. A key's owner is still the next vnode clockwise, mapped back to its physical node.",
      when: "Essentially always in production — Cassandra (num_tokens), Dynamo, Ketama all use vnodes/replicas per node.",
      mistake: "Running consistent hashing with one point per node in production. Without vnodes you inherit the skew from step 5; vnodes are what make it balanced.",
      interview: "“What are virtual nodes and why?” Multiple ring positions per physical node — they even out arc sizes (balanced load), make rebalancing granular, and allow heterogeneous weighting.",
      example: "ShopKart gives each cache node ~150 vnodes; load evens out across the fleet and the earlier hotspot disappears.",
      viz: {
        nodes: [
          { id: "N1", ang: 20, c: CY }, { id: "N1", ang: 160, c: CY }, { id: "N1", ang: 290, c: CY },
          { id: "N2", ang: 70, c: AF }, { id: "N2", ang: 200, c: AF }, { id: "N2", ang: 320, c: AF },
          { id: "N3", ang: 120, c: PU }, { id: "N3", ang: 240, c: PU }, { id: "N3", ang: 350, c: PU }
        ],
        vnode: true, moved: [],
        note: "Each physical node gets many ring points (virtual nodes). Arcs interleave → balanced load, granular rebalancing, weightable nodes."
      }
    },
    {
      label: "7 · Ring vs hash-mod-N, in one picture",
      what: "The whole point in contrast: <b>hash mod N</b> ties every key's location to the node count, so changing N remaps almost everything. The <b>ring</b> ties each key only to its next node clockwise, so a resize touches ≈K/N keys and nothing else.",
      why: "That difference is the line between a resize being a routine background copy and being a full-cluster reshuffle (read amplification, cache stampede, downtime). It's why every serious distributed cache/store uses the ring (with vnodes).",
      how: "Ring + vnodes: cheap online resize, balanced load, and — by placing replicas on the next R distinct physical nodes clockwise — a natural replica-placement scheme too.",
      when: "Choosing a sharding scheme for anything that will grow, shrink, or tolerate node failure online.",
      mistake: "Reaching for <code>hash mod N</code> because it's one line. It's fine only if N never changes; the moment you resize, it's an outage.",
      interview: "“One-line summary of consistent hashing?” Put nodes and keys on a ring; a key belongs to the next node clockwise; resizing moves only ≈K/N keys — with virtual nodes for even load.",
      example: "ShopKart's cache tier scales up and down for traffic peaks all day; the ring makes each change a quiet background copy instead of a stampede.",
      viz: {
        nodes: [
          { id: "N1", ang: 20, c: CY }, { id: "N1", ang: 160, c: CY }, { id: "N1", ang: 290, c: CY },
          { id: "N2", ang: 70, c: AF }, { id: "N2", ang: 200, c: AF }, { id: "N2", ang: 320, c: AF },
          { id: "N3", ang: 120, c: PU }, { id: "N3", ang: 240, c: PU }, { id: "N3", ang: 350, c: PU }
        ],
        vnode: true, moved: [],
        note: "Ring + virtual nodes: online resize moving ≈K/N keys, balanced load, and replica placement (next R nodes clockwise). hash mod N remaps ~all."
      }
    }
  ];

  function buildViz(host) {
    host.classList.add("dd-viz");
    var CX = 150, CY_ = 150, R = 112, KR = 94, LR = 132, D2R = Math.PI / 180;
    function pt(ang, r) { return [CX + r * Math.cos(ang * D2R), CY_ + r * Math.sin(ang * D2R)]; }
    function arcPath(a1, a2) {
      var p1 = pt(a1, R), p2 = pt(a2, R);
      var span = ((a2 - a1) % 360 + 360) % 360, large = span > 180 ? 1 : 0;
      return "M " + p1[0].toFixed(1) + " " + p1[1].toFixed(1) + " A " + R + " " + R + " 0 " + large + " 1 " + p2[0].toFixed(1) + " " + p2[1].toFixed(1);
    }
    function ownerOf(keyAng, nodes) {
      var best = null, bestD = 1e9;
      nodes.forEach(function (n) { var d = ((n.ang - keyAng) % 360 + 360) % 360; if (d < bestD) { bestD = d; best = n; } });
      return best;
    }

    function svg(s) {
      var nodes = s.nodes.slice().sort(function (a, b) { return a.ang - b.ang; });
      var parts = ['<circle class="ring-base" cx="' + CX + '" cy="' + CY_ + '" r="' + R + '"/>'];
      // ownership arcs
      nodes.forEach(function (n, i) {
        var prev = nodes[(i - 1 + nodes.length) % nodes.length];
        parts.push('<path class="arc" d="' + arcPath(prev.ang, n.ang) + '" style="stroke:' + n.c + '"/>');
      });
      // keys
      s.moved = s.moved || [];
      KEYS.forEach(function (key) {
        var own = ownerOf(key.ang, s.nodes), p = pt(key.ang, KR);
        var mv = s.moved.indexOf(key.k) >= 0;
        parts.push('<circle class="key-dot' + (mv ? " moved" : "") + '" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="5.5" style="fill:' + own.c + '"/>');
        var lp = pt(key.ang, KR - 15);
        parts.push('<text x="' + lp[0].toFixed(1) + '" y="' + (lp[1] + 3).toFixed(1) + '" style="fill:var(--text-muted);font-size:9px;font-weight:700;text-anchor:middle">' + key.k + "</text>");
      });
      // node dots + labels
      s.nodes.forEach(function (n) {
        var p = pt(n.ang, R);
        parts.push('<circle class="node-dot' + (s.vnode ? " vnode" : "") + '" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + (s.vnode ? 5 : 8) + '" style="fill:' + n.c + '"/>');
        if (n.lbl) { var lp = pt(n.ang, LR); parts.push('<text class="node-lbl" x="' + lp[0].toFixed(1) + '" y="' + (lp[1] + 4).toFixed(1) + '">' + n.id + "</text>"); }
      });
      return '<svg class="dd-ring" viewBox="0 0 300 300" width="300" height="300" role="img" aria-label="consistent hashing ring">' + parts.join("") + "</svg>";
    }

    function legend(s) {
      var seen = {}, rows = [];
      s.nodes.forEach(function (n) { if (!seen[n.id]) { seen[n.id] = 1; rows.push(n); } });
      var cnt = {}; KEYS.forEach(function (key) { var o = ownerOf(key.ang, s.nodes); cnt[o.id] = (cnt[o.id] || 0) + 1; });
      return '<div class="dd-ring-legend">' + rows.map(function (n) {
        return '<div class="dd-ring-leg"><span class="dd-ring-swatch" style="background:' + n.c + '"></span>' +
          "<b>" + n.id + "</b> · owns " + (cnt[n.id] || 0) + " key" + ((cnt[n.id] || 0) === 1 ? "" : "s") + (s.vnode ? " · many vnodes" : "") + "</div>";
      }).join("") + "</div>";
    }

    function update(idx, step) {
      var s = step && step.viz;
      if (idx < 0 || !s) {
        host.innerHTML = '<div class="dd-empty">Press <b>Play</b> to place ShopKart\'s nodes on a hash ring — map keys clockwise, ' +
          "add and remove a node moving only ≈K/N keys, see the skew problem, and fix it with virtual nodes.</div>";
        return;
      }
      var html = '<div class="dd-section"><div class="dd-section-label">Hash ring · ShopKart cache/shard keys</div>' +
        '<div class="dd-ring-wrap">' + svg(s) + legend(s) + "</div></div>";
      if (s.note) html += '<div class="dd-note">' + s.note + "</div>";
      host.innerHTML = html;
    }

    return { update: update, destroy: function () { host.innerHTML = ""; host.classList.remove("dd-viz"); } };
  }

  DL.deepDives["consistent-hashing"] = {
    slug: "consistent-hashing",
    overview: {
      what: "<b>Consistent hashing</b> maps both keys and nodes onto a ring (the hash space bent into a circle). A key is owned by the <b>first node clockwise</b> from it. Adding or removing a node disturbs only one arc.",
      why: "It solves the resize problem of <code>hash mod N</code>: changing the node count there remaps almost every key (a cluster-wide reshuffle). On the ring, a resize moves only ≈<b>K/N</b> keys — so scaling and failure handling are cheap, local, and online.",
      how: "Hash node IDs to positions on the ring; hash each key and walk clockwise to its owner. Add a node → it steals just its predecessor's arc; remove one → its arc rolls to the successor. <b>Virtual nodes</b> (many points per physical node) even out the load and make rebalancing fine-grained."
    },
    steps: STEPS,
    buildViz: buildViz,
    code: {
      title: "Ring lookup and the cost of resizing",
      lang: "text",
      code:
        "ring = sorted list of (hash(nodeId#i)) -> node   # many vnodes per node\n" +
        "\n" +
        "def owner(key):                 # first node CLOCKWISE from the key\n" +
        "    h = hash(key)\n" +
        "    i = bisect_right(ring.positions, h) % len(ring)   # wrap around\n" +
        "    return ring[i].node\n" +
        "\n" +
        "# Resize cost:\n" +
        "#   hash(key) mod N     : change N  -> ~ALL keys remap        (reshuffle/outage)\n" +
        "#   consistent hashing  : add/remove one node -> ~K/N keys    (local background copy)\n" +
        "#\n" +
        "# Virtual nodes: place ~100-200 points per physical node\n" +
        "#   -> even load (low variance), granular rebalance, weight by #vnodes\n" +
        "# Replicas: store on the next R DISTINCT physical nodes clockwise",
      highlights: [5, 11, 14]
    },
    reference: [
      ["hash ring", "The hash space 0…2³²−1 treated as a circle"],
      ["clockwise ownership", "A key belongs to the first node clockwise from its hash"],
      ["arc", "The span of the ring a node owns (from the previous node to it)"],
      ["≈K/N moved", "Keys relocated when one node is added/removed"],
      ["hash mod N", "Naive scheme; changing N remaps ~all keys"],
      ["virtual node (vnode)", "One of many ring points for a single physical node"],
      ["skew", "Uneven arc sizes → unbalanced load (bad with few nodes)"],
      ["replica placement", "Copies on the next R distinct nodes clockwise"],
      ["Ketama / num_tokens", "Real implementations of ring + vnodes"]
    ],
    internals:
      "<p>Consistent hashing bends the hash output space into a <b>ring</b> and hashes <i>both</i> keys and node IDs onto it. A key's owner is the first node reached going <b>clockwise</b> — equivalently, each node owns the arc from the previous node's position up to its own. Lookups hash the key and binary-search the sorted node positions for the next one (wrapping past the top of the ring).</p>" +
      "<p>The magic is what happens on a resize. Because a key only depends on the <i>next</i> node clockwise, <b>adding</b> a node steals only the slice between it and its predecessor (≈K/N keys), and <b>removing</b> a node hands its slice to exactly one successor. Nothing else moves. Contrast <code>hash(key) mod N</code>, where changing N changes the modulus for every key, remapping nearly the entire dataset — a cluster-wide reshuffle.</p>" +
      "<p>Plain consistent hashing balances load only asymptotically: with few nodes, random arc sizes vary widely and one node becomes a hotspot. <b>Virtual nodes</b> fix this by giving each physical node many ring positions (e.g. 100–200), so arcs interleave and even out, rebalancing becomes fine-grained (a new node takes a little from many nodes), and heterogeneous machines can be weighted with more vnodes. Replication rides on the same structure: store each key on the next <b>R distinct physical nodes</b> clockwise.</p>",
    engineering:
      "<p>Reach for consistent hashing whenever a sharded/​cached tier must resize or tolerate failure <b>online</b>: distributed caches (memcached via Ketama), Dynamo/Cassandra-style partitioning, CDNs, and shard routers. The concrete win is that scaling out, replacing hardware, or losing a node becomes a <b>local background copy of one arc</b> instead of a full reshuffle that blows the cache and spikes the backing store.</p>" +
      "<p>Two rules from production: always use <b>virtual nodes</b> (one point per node gives you the skew of step 5 — a guaranteed hotspot on small clusters), and place <b>replicas on the next R distinct physical nodes</b> clockwise (skip vnodes of a node you already picked) so copies don't land on the same machine. An alternative you'll meet is a <b>fixed large partition count</b> (e.g. 1024 partitions mapped to nodes), which gives similar cheap movement without a literal ring. Either way, the anti-pattern is <code>hash mod N</code> for anything that will ever change size.</p>",
    gotchas: [
      { kind: "tip", html: "<b>Always use virtual nodes.</b> One point per physical node gives wildly uneven arcs on small clusters — a guaranteed hotspot. Many vnodes per node even out load and make rebalancing granular." },
      { kind: "warn", html: "<b><code>hash mod N</code> is a resize trap.</b> It's one line and fine only if N never changes. The moment you add/remove a node it remaps ~every key — a reshuffle, cache stampede, and likely outage." },
      { kind: "info", html: "<b>Place replicas on the next R <i>distinct</i> physical nodes clockwise.</b> Naively taking the next R ring points can land multiple replicas on vnodes of the same machine — defeating the replication." }
    ],
    failureModes:
      "<p><b>Hotspot from no vnodes:</b> single-point-per-node skew makes one node own a huge arc. <i>Fix:</i> virtual nodes (or a fixed large partition count).</p>" +
      "<p><b>Replicas on one machine:</b> next-R ring points map to vnodes of the same physical node → a single failure loses all copies. <i>Fix:</i> pick the next R <i>distinct</i> physical nodes.</p>" +
      "<p><b>Resize storm from hash mod N:</b> changing N remaps almost everything, stampeding the backing store. <i>Fix:</i> use the ring / fixed partitions so only ≈K/N moves.</p>" +
      "<p><b>Hot key (not hot node):</b> a single popular key overwhelms its owner regardless of the ring. <i>Fix:</i> that's a partitioning-level problem — salt/split/cache the hot key.</p>",
    quickCheck: [
      {
        q: "On a consistent-hashing ring, which node owns a given key?",
        options: ["The node with the numerically closest hash", "The first node clockwise from the key's hash", "The least-loaded node", "The node whose hash is smallest"],
        answer: 1,
        why: "A key is owned by the first node encountered going clockwise from the key's position — equivalently, the node whose arc (from the previous node up to it) the key falls in.",
        diff: "easy"
      },
      {
        q: "You add one node to an N-node ring (with virtual nodes). Roughly how many keys move?",
        options: ["All of them", "About K/N (one node's share), taken from neighboring arcs", "Half of them", "None — existing keys never move"],
        answer: 1,
        why: "Adding a node only steals the arc(s) adjacent to its ring position, so about K/N keys relocate. That locality — versus hash mod N remapping ~everything — is the point of the ring.",
        diff: "medium"
      },
      {
        q: "Why are virtual nodes essential in practice?",
        options: [
          "They make hashing faster",
          "With one point per node, random arc sizes are uneven and cause hotspots; many points per node even out load and make rebalancing granular",
          "They remove the need for replication",
          "They let you use hash mod N safely"
        ],
        answer: 1,
        why: "Plain consistent hashing balances load only on average; with few nodes a single random point per node yields lopsided arcs and a hotspot. Virtual nodes (many points per physical node) even out ownership and allow fine-grained, weighted rebalancing.",
        diff: "medium"
      }
    ],
    interviewQs: [
      {
        q: "Explain consistent hashing and the problem it solves.",
        a: "It solves the resize cost of naive sharding. With hash(key) mod N, the node count is baked into every key's location, so changing N — adding or removing a node — remaps almost every key, a cluster-wide reshuffle that stampedes your caches and backing store. Consistent hashing instead maps both keys and nodes onto a ring: a key is owned by the first node clockwise from it. Because a key depends only on the next node clockwise, adding a node steals just the arc between it and its predecessor, and removing a node hands its arc to the successor — only about K/N keys move, as a local background copy. In production you give each physical node many virtual nodes so arcs interleave and load is even, and you place replicas on the next R distinct physical nodes clockwise.",
        tip: "Contrast hash-mod-N (remaps ~all) with the ring (≈K/N) in the first two sentences — that contrast is the whole answer, then add vnodes and replica placement."
      },
      {
        q: "What are virtual nodes and why does every real implementation use them?",
        a: "A virtual node is one of many ring positions assigned to a single physical node — you hash node-id#1, node-id#2, and so on, to scatter, say, 100–200 points per node around the ring. They matter because plain consistent hashing only balances load asymptotically: with a single point per node and few nodes, the random arc sizes vary a lot and one node ends up owning a disproportionate share — a hotspot. Many points per node invoke the law of large numbers so arcs even out; they also make rebalancing fine-grained, since a new node takes a little from many nodes rather than a lot from one; and they let you weight heterogeneous hardware by giving bigger machines more vnodes. Cassandra's num_tokens, Dynamo, and Ketama all do this.",
        tip: "Tie vnodes to the skew problem explicitly, then list the three benefits: even load, granular rebalance, weighting."
      },
      {
        q: "How does replication work on the ring, and what's the pitfall?",
        a: "You store each key on the next R nodes clockwise from its position — the primary plus R−1 followers — which gives a natural, deterministic replica set that everyone can compute without a directory. The pitfall appears with virtual nodes: the next R ring points might be vnodes belonging to the same physical machine, so all your 'replicas' sit on one server and a single failure loses every copy. The fix is to skip vnodes of physical nodes you've already chosen and place replicas on the next R distinct physical nodes clockwise. You often also make them rack/zone-aware so replicas span failure domains.",
        tip: "The distinct-physical-node subtlety is the senior signal — mention it unprompted."
      }
    ],
    businessLens: {
      task: "Resizing ShopKart's cache/shard tier online without a stampede",
      meaning: "Scaling or losing a node moves only a small arc of keys — the rest keep serving.",
      system: "Consistent-hashing ring with virtual nodes",
      point: "ShopKart's cache and shard routers place nodes on a hash ring, so each key is owned by the next node clockwise. When traffic peaks and the team adds a node — or a node dies — only about K/N keys move as a quiet background copy, instead of hash-mod-N's full reshuffle that would blow every cache and hammer the database. Each physical node gets ~150 virtual nodes so load stays even (no single hot cache), and replicas are placed on the next distinct physical nodes clockwise across zones. The result: ShopKart scales its cache tier up and down all day, and rides node failures, without the resize ever becoming an incident."
    }
  };
})();
