/* ============================================================
   deepdives/eventual-consistency.js — "Eventual Consistency" deep dive.
   Registers DBLab.deepDives['eventual-consistency'] (concept m81).
   Authored against the contract documented in deepdives/mvcc.js.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  DL.deepDives = DL.deepDives || {};

  // Scene: ShopKart's AP-style cart/likes across replicas. We watch divergence
  // then the convergence machinery: anti-entropy, read-repair, hinted handoff,
  // and conflict resolution (LWW, version vectors, CRDTs).
  var STEPS = [
    {
      label: "1 · Replicas diverge (concurrent writes)",
      what: "During a partition, two replicas of a shopper's <b>cart</b> both accept writes. <b>RA</b> adds a <i>hat</i> → <code>{socks, hat}</code>; <b>RB</b> adds <i>shoes</i> → <code>{socks, shoes}</code>. Neither is 'wrong' — they simply <b>diverged</b>.",
      why: "This is the AP world (from CAP): to stay available, replicas accept writes without coordinating, so they temporarily disagree. Eventual consistency is the promise that, given no new writes, they will <b>converge</b> to the same state — plus the machinery that makes that happen.",
      how: "Each replica applied a local write and tagged it with a version (a timestamp or version vector). The two versions are <b>concurrent</b> — neither happened-before the other.",
      when: "Leaderless/multi-leader stores (Dynamo, Cassandra, Riak), offline-first apps, and multi-region writes.",
      mistake: "Reading 'eventual' as 'never' or 'seconds'. Convergence is usually milliseconds; the point is it's not <i>instant</i> and the window is real.",
      interview: "“What does eventual consistency guarantee?” That, absent new writes, all replicas eventually converge to the same value — with no guarantee about <i>when</i>, so reads can be stale/divergent meanwhile.",
      example: "A shopper edits their cart from two devices during a hiccup; two replicas hold different carts for a moment.",
      viz: {
        replicas: [
          { id: "RA", val: "{ socks, hat }", foot: [{ t: "ver A:2", k: "info" }, { t: "diverged", k: "warn" }], cls: "follower stale" },
          { id: "RB", val: "{ socks, shoes }", foot: [{ t: "ver B:2", k: "info" }, { t: "diverged", k: "warn" }], cls: "follower stale" }
        ],
        verdict: { k: "warn", html: "<b>Divergence:</b> both replicas accepted concurrent writes (AP). Neither is wrong — eventual consistency must now converge them." },
        note: "To stay available, replicas write without coordinating → they diverge. 'Eventual' = they will converge, just not instantly."
      }
    },
    {
      label: "2 · Anti-entropy converges replicas in the background",
      what: "A background <b>anti-entropy</b> process compares replicas and exchanges what's missing. To do that cheaply it uses <b>Merkle trees</b>: hash trees over the data so two replicas can find <i>exactly</i> the differing ranges without shipping everything. The carts merge to <code>{socks, hat, shoes}</code>.",
      why: "Convergence can't rely only on reads touching the data — cold keys would drift forever. Anti-entropy is the always-on repair that guarantees replicas heal even without traffic, and Merkle trees make the comparison efficient at scale.",
      how: "Replicas periodically exchange Merkle-tree roots; matching hashes prune whole subtrees, mismatches drill down to the differing keys, and only those are synced. (Gossip spreads the updates replica-to-replica.)",
      when: "Continuously in Dynamo/Cassandra-style systems (nodetool repair, Merkle-based anti-entropy).",
      mistake: "Assuming reads alone keep replicas in sync. Rarely-read keys need anti-entropy or they diverge indefinitely after a missed write.",
      interview: "“How do replicas converge without reads?” Background anti-entropy using Merkle trees to efficiently find and sync only the differing ranges (plus gossip to propagate).",
      example: "ShopKart's nodes run periodic repair; the two cart replicas exchange only the differing items and both end up with the full cart.",
      viz: {
        replicas: [
          { id: "RA", val: "{ socks, hat, shoes }", foot: [{ t: "Merkle sync", k: "accent" }, { t: "converged", k: "ok" }], cls: "follower hot" },
          { id: "RB", val: "{ socks, hat, shoes }", foot: [{ t: "Merkle sync", k: "accent" }, { t: "converged", k: "ok" }], cls: "follower hot" }
        ],
        verdict: { k: "ok", html: "<b>Anti-entropy:</b> background repair compares replicas via Merkle trees and syncs only the differing ranges → both converge." },
        note: "Anti-entropy is the always-on convergence guarantee (even for cold keys). Merkle trees find the diffs cheaply; gossip spreads them."
      }
    },
    {
      label: "3 · Read-repair fixes divergence on the read path",
      what: "A quorum read touches both replicas and notices they disagree. It returns the correct (merged/newest) value to the client <b>and</b> writes the fix back to the stale replica <b>inline</b> — repairing it as a side-effect of the read.",
      why: "Read-repair heals <b>hot</b> keys immediately, exactly the ones users are looking at, complementing anti-entropy's background sweep of cold keys. Together they bound how long any replica stays stale.",
      how: "On a read from R replicas, the coordinator compares versions; if they differ it resolves them (newest / merge) and asynchronously pushes the resolved value to the lagging replica(s).",
      when: "Every quorum read in Dynamo-style systems; often paired with a tunable read-repair chance.",
      mistake: "Relying on read-repair alone. It only fixes keys that get read — cold keys still need anti-entropy — so you need both.",
      interview: "“What's read-repair?” On a read that sees divergent replicas, return the resolved value and write it back to the stale ones inline — repairing hot keys as they're accessed.",
      example: "A shopper opens their cart; the read sees one replica behind, returns the full cart, and quietly fixes the lagging replica.",
      viz: {
        replicas: [
          { id: "RA", val: "{ socks, hat, shoes }", foot: [{ t: "read: newest", k: "ok" }], cls: "follower" },
          { id: "RB", val: "{ socks, hat, shoes }", foot: [{ t: "repaired inline ✓", k: "ok" }], cls: "follower hot" }
        ],
        verdict: { k: "ok", html: "<b>Read-repair:</b> a read that sees divergence returns the resolved value and writes it back to the stale replica inline — hot keys heal instantly." },
        note: "Read-repair fixes the keys users actually touch; anti-entropy sweeps the rest. Two mechanisms, full coverage."
      }
    },
    {
      label: "4 · Hinted handoff covers a down replica",
      what: "A write arrives while replica <b>RB is down</b>. Instead of failing, a neighbor <b>RC</b> accepts the write and stores a <b>hint</b> — 'this belongs to RB' — then <b>replays</b> it to RB once it recovers. Availability is preserved and RB catches up.",
      why: "Hinted handoff keeps writes available during transient node failures (a core Dynamo idea) and guarantees the missed write reaches its home replica later, so a temporary outage doesn't cause permanent divergence.",
      how: "The coordinator, unable to reach RB, writes to the next healthy node RC with a hint tagged for RB. When RB comes back, RC hands off the buffered writes; RB applies them and RC drops the hints.",
      when: "Transient replica failures/restarts in leaderless stores; complements quorum writes (sloppy quorum).",
      mistake: "Treating hinted handoff as durable replication. Hints are best-effort buffers on a neighbor; if that neighbor also fails before handoff, you still rely on anti-entropy to converge.",
      interview: "“What is hinted handoff?” When a target replica is down, a neighbor temporarily stores the write (a hint) and replays it when the target returns — keeping writes available and eventually converging.",
      example: "ShopKart's RB reboots for patching; RC absorbs its writes as hints and replays them when RB is back — no write was rejected.",
      viz: {
        replicas: [
          { id: "RA", val: "{ … , boots }", foot: [{ t: "wrote", k: "ok" }], cls: "follower" },
          { id: "RB", val: "(recovering)", foot: [{ t: "was down", k: "warn" }], cls: "follower stale" },
          { id: "RC", val: "hint → RB", foot: [{ t: "holding hint", k: "accent" }, { t: "will replay", k: "info" }], cls: "follower hot" }
        ],
        verdict: { k: "info", html: "<b>Hinted handoff:</b> RB is down, so neighbor RC accepts the write as a hint and replays it to RB on recovery — writes stay available." },
        note: "Hinted handoff keeps writes available during transient failures and delivers the missed write later. Best-effort; anti-entropy is the backstop."
      }
    },
    {
      label: "5 · Conflict resolution — last-write-wins (lossy)",
      what: "For a <b>single-value</b> field (a profile display name), two concurrent writes can't merge by union. <b>Last-write-wins</b> picks the one with the higher timestamp — here <code>name=\"Alex\"</code> (ts 5) beats <code>name=\"Alexandra\"</code> (ts 4). Simple, deterministic — but it <b>silently drops</b> the loser.",
      why: "LWW is the easy default (Cassandra uses it) because it needs only a timestamp and always converges. The danger is <b>data loss</b>: a genuinely concurrent update just vanishes, and clock skew can make an <i>older</i> wall-clock write win.",
      how: "Each write carries a timestamp; on conflict, keep the max. Convergence is guaranteed (all replicas pick the same max), but the discarded value is gone with no trace.",
      when: "Fields where losing a concurrent update is acceptable, or writes are naturally last-writer (single owner).",
      mistake: "Using LWW for data where concurrent updates matter (a shopping cart, a counter, collaborative edits). You'll silently lose writes — and wall-clock skew makes 'last' unreliable.",
      interview: "“What's the risk of last-write-wins?” It silently discards concurrent updates, and depends on synchronized clocks — an older write can win under skew. Fine for last-writer fields, dangerous for merge-worthy data.",
      example: "Two ShopKart admins rename a product at once; LWW keeps one name and quietly drops the other — acceptable here, disastrous for a cart.",
      viz: {
        replicas: [
          { id: "RA", val: "name = \"Alex\"", foot: [{ t: "ts 5 · WINS", k: "ok" }], cls: "follower hot" },
          { id: "RB", val: "name = \"Alexandra\"", foot: [{ t: "ts 4 · dropped", k: "bad" }], cls: "follower stale" }
        ],
        verdict: { k: "warn", html: "<b>LWW:</b> keep the higher timestamp (\"Alex\"), drop the other. Converges and is simple — but silently loses a concurrent write, and trusts clocks." },
        note: "Last-write-wins: one timestamp, guaranteed convergence, but lossy. Wrong for carts/counters/collab edits; ok for single-owner fields."
      }
    },
    {
      label: "6 · Version vectors detect true conflicts",
      what: "<b>Version vectors</b> (a vector clock per key) track each replica's updates so you can tell <b>concurrent</b> from <b>causal</b>. RA's <code>{A:2, B:1}</code> and RB's <code>{A:1, B:2}</code> are <b>incomparable</b> → a real conflict. Instead of silently dropping one, the system keeps <b>both siblings</b> for the app (or user) to resolve.",
      why: "Version vectors turn silent loss into an explicit, detectable conflict. That's the difference between 'we picked one and hoped' and 'we know these truly conflicted, so resolve them deliberately' — the basis of Dynamo's sibling model.",
      how: "Each replica increments its own counter on write. On read/merge, compare vectors: if one <b>dominates</b> (≥ in every position) it's the newer causal version; if neither dominates, they're concurrent → surface both as siblings and reconcile (app logic, user prompt, or a CRDT merge).",
      when: "Dynamo/Riak-style stores where correctness needs conflict <i>detection</i>, not blind LWW.",
      mistake: "Confusing version vectors with wall-clock timestamps. Vectors capture causality (happened-before); timestamps don't, which is exactly why LWW can lose data.",
      interview: "“How do you detect concurrent writes?” Version vectors: compare per-replica counters — one dominating means causal (newer); neither dominating means concurrent (a conflict to reconcile, not silently drop).",
      example: "Two ShopKart cart edits produce incomparable vectors; the store returns both carts as siblings, and the app merges them (union) instead of losing an item.",
      viz: {
        replicas: [
          { id: "RA", val: "cart v{A:2, B:1}", foot: [{ t: "concurrent", k: "warn" }, { t: "sibling kept", k: "info" }], cls: "follower hot" },
          { id: "RB", val: "cart v{A:1, B:2}", foot: [{ t: "concurrent", k: "warn" }, { t: "sibling kept", k: "info" }], cls: "follower hot" }
        ],
        verdict: { k: "info", html: "<b>Version vectors:</b> {A:2,B:1} vs {A:1,B:2} are incomparable → a real conflict. Keep both siblings and reconcile deliberately (no silent loss)." },
        note: "Vectors capture causality: one dominates = causal (newer); neither = concurrent (conflict). Detection beats LWW's blind, lossy pick."
      }
    },
    {
      label: "7 · CRDTs merge without losing updates",
      what: "<b>CRDTs</b> (Conflict-free Replicated Data Types) are structured so any two replicas <b>merge deterministically</b> with no lost updates and no coordination. A <b>G-Counter</b> for 'likes' keeps a per-replica count and merges by taking the max per replica, then summing: RA <code>{A:3}</code> + RB <code>{B:2}</code> → <b>5</b>. An <b>OR-Set</b> merges carts by union with add/remove tags.",
      why: "CRDTs give <b>strong eventual consistency</b>: replicas that have seen the same updates are identical, and merges are automatic, commutative, associative, and idempotent — so no conflicts to resolve and no data lost. They're the principled endpoint of AP conflict handling.",
      how: "Each CRDT defines a merge that is order-independent and idempotent. Counters merge per-replica maxima; sets track adds/removes so union is well-defined; sequences (RGA) power collaborative text. Replicas gossip their states and merge freely.",
      when: "Collaborative editing, distributed counters, shopping carts, presence — anywhere you want automatic, lossless convergence (Riak, Redis, Automerge/Yjs, Figma-style tools).",
      mistake: "Assuming CRDTs are free. They add metadata (tombstones, per-replica state) and only fit operations expressible as a commutative merge — not every workload maps to a CRDT.",
      interview: "“What do CRDTs give you over LWW/version vectors?” Automatic, deterministic, lossless merge (strong eventual consistency) with no coordination — at the cost of extra metadata and only for mergeable data types.",
      example: "ShopKart's cart is an OR-Set and its like-counts are G-Counters, so multi-device edits and concurrent likes always converge correctly with nothing dropped.",
      viz: {
        replicas: [
          { id: "RA", val: "likes {A:3}", foot: [{ t: "G-Counter", k: "info" }], cls: "follower" },
          { id: "RB", val: "likes {B:2}", foot: [{ t: "G-Counter", k: "info" }], cls: "follower" },
          { id: "merge", val: "likes = 5", foot: [{ t: "deterministic ✓", k: "ok" }, { t: "no loss", k: "ok" }], cls: "new-leader hot" }
        ],
        verdict: { k: "ok", html: "<b>CRDT:</b> merge is commutative/associative/idempotent → replicas converge automatically with NO lost updates. G-Counter {A:3}+{B:2}=5." },
        note: "CRDTs = strong eventual consistency: deterministic, lossless, coordination-free merge — for data expressible as a commutative type (counters, sets, text)."
      }
    }
  ];

  function buildViz(host) {
    host.classList.add("dd-viz");
    function chip(c) { return '<span class="dd-chip dd-chip--' + (c.k || "info") + '">' + c.t + "</span>"; }
    function nodeHtml(n) {
      return '<div class="dd-dnode ' + (n.cls || "") + '">' +
        '<div class="dd-dnode-hd"><span class="dd-dnode-id">' + n.id + '</span><span class="dd-dnode-role">replica</span></div>' +
        '<div class="dd-dnode-val" style="font-family:var(--font-mono);font-size:12px">' + n.val + "</div>" +
        '<div class="dd-dnode-foot">' + (n.foot || []).map(chip).join("") + "</div>" +
      "</div>";
    }
    function update(idx, step) {
      var s = step && step.viz;
      if (idx < 0 || !s) {
        host.innerHTML = '<div class="dd-empty">Press <b>Play</b> to watch AP replicas diverge and then converge — ' +
          "anti-entropy, read-repair, hinted handoff, and conflict resolution from last-write-wins to version vectors to CRDTs.</div>";
        return;
      }
      var html = '<div class="dd-section"><div class="dd-section-label">Replicas · ShopKart cart / likes (AP)</div>';
      if (s.verdict) html += '<div class="dd-verdict ' + s.verdict.k + '">' + s.verdict.html + "</div>";
      html += '<div class="dd-cluster">' + s.replicas.map(nodeHtml).join("") + "</div></div>";
      if (s.note) html += '<div class="dd-note">' + s.note + "</div>";
      host.innerHTML = html;
    }
    return { update: update, destroy: function () { host.innerHTML = ""; host.classList.remove("dd-viz"); } };
  }

  DL.deepDives["eventual-consistency"] = {
    slug: "eventual-consistency",
    overview: {
      what: "<b>Eventual consistency</b> is the guarantee that, absent new writes, all replicas of a value <b>converge</b> to the same state — with no promise about <i>when</i>. It's the consistency model of AP systems that accept writes on any replica without coordinating.",
      why: "It's the price and the payoff of high availability (CAP's AP side): replicas can serve and accept writes during partitions, so they temporarily diverge. Eventual consistency is the promise they'll reconcile — plus the concrete machinery (anti-entropy, read-repair, conflict resolution) that delivers it.",
      how: "<b>Convergence transport:</b> anti-entropy (Merkle-tree background sync) + read-repair (fix on the read path) + hinted handoff (cover down replicas) + gossip. <b>Conflict resolution:</b> last-write-wins (simple, lossy), version vectors (detect concurrent vs causal, keep siblings), or CRDTs (deterministic, lossless merge = strong eventual consistency)."
    },
    steps: STEPS,
    buildViz: buildViz,
    code: {
      title: "Detecting conflicts and merging (LWW → vectors → CRDT)",
      lang: "text",
      code:
        "# Convergence transport (always running):\n" +
        "#   anti-entropy : Merkle-tree diff -> sync only differing ranges (cold keys)\n" +
        "#   read-repair  : a read that sees divergence writes the fix back (hot keys)\n" +
        "#   hinted handoff: neighbor buffers a write for a down replica, replays later\n" +
        "\n" +
        "# Conflict resolution when two writes meet:\n" +
        "LWW:            keep max(timestamp)         # converges, but SILENTLY DROPS a write\n" +
        "                                            # (and trusts clocks -> skew can pick older)\n" +
        "version vectors: A{A:2,B:1} vs B{A:1,B:2}\n" +
        "   if one >= other in every slot -> causal (keep newer)\n" +
        "   else                          -> CONCURRENT -> keep both siblings, reconcile\n" +
        "\n" +
        "CRDT (strong eventual consistency): merge is commutative+associative+idempotent\n" +
        "   G-Counter: per-replica max, then sum  -> {A:3} merge {B:2} = 5   (no loss)\n" +
        "   OR-Set   : union with add/remove tags -> carts merge, nothing dropped",
      highlights: [8, 13, 16]
    },
    reference: [
      ["eventual consistency", "Replicas converge given no new writes; no timing guarantee"],
      ["strong eventual consistency", "Replicas that saw the same updates are identical (CRDTs)"],
      ["anti-entropy", "Background replica sync, typically via Merkle trees"],
      ["Merkle tree", "Hash tree that locates differing ranges cheaply"],
      ["read-repair", "Fix stale replicas inline on the read path"],
      ["hinted handoff", "A neighbor buffers a write for a down replica, replays it later"],
      ["last-write-wins (LWW)", "Keep the highest-timestamp write; simple but lossy"],
      ["version vector", "Per-replica counters; detect concurrent vs causal writes"],
      ["sibling", "A concurrent value kept for explicit reconciliation"],
      ["CRDT", "Data type with a deterministic, lossless, coordination-free merge"]
    ],
    internals:
      "<p>Eventual consistency is what you get when replicas accept writes without coordinating (the AP side of CAP): they diverge, then <b>converge</b>. Convergence has two parts — getting updates <i>to</i> every replica, and resolving <i>conflicts</i> when writes disagree.</p>" +
      "<p><b>Propagation/repair</b> uses three complementary mechanisms. <b>Anti-entropy</b> is an always-on background sync — replicas compare <b>Merkle trees</b> (hash trees over their data) so matching subtrees are skipped and only differing ranges are shipped — which guarantees even cold, never-read keys converge. <b>Read-repair</b> heals on the read path: a quorum read that sees divergent replicas returns the resolved value and writes it back to the stale ones, fixing hot keys immediately. <b>Hinted handoff</b> preserves availability during transient failures: if a target replica is down, a neighbor accepts the write as a 'hint' and replays it when the target recovers. Gossip spreads updates replica-to-replica.</p>" +
      "<p><b>Conflict resolution</b> decides what happens when two writes meet. <b>Last-write-wins</b> keeps the higher timestamp: trivial and always-converging, but it <i>silently drops</i> a concurrent write and trusts wall clocks (skew can pick the older one). <b>Version vectors</b> (per-replica counters) capture causality: if one vector dominates another it's the newer causal version; if neither dominates the writes are <b>concurrent</b> — a true conflict, kept as <b>siblings</b> for deliberate reconciliation instead of blind loss. <b>CRDTs</b> go further: data types whose merge is commutative, associative, and idempotent, so replicas converge automatically with <b>no lost updates and no coordination</b> — a G-Counter sums per-replica maxima, an OR-Set unions with add/remove tags. That property is called <b>strong eventual consistency</b>.</p>",
    engineering:
      "<p>Reach for eventual consistency where availability and low latency beat immediate agreement, and staleness is tolerable: carts, feeds, counters, presence, catalogs, multi-region writes, offline-first apps. Design it deliberately — pick the conflict-resolution strategy to match the data. Single-owner fields can use <b>LWW</b> (accepting its lossiness and clock dependence). Data where concurrent updates matter needs <b>version vectors</b> to detect conflicts (and app/user reconciliation), or, best of all, a <b>CRDT</b> so merges are automatic and lossless.</p>" +
      "<p>Operationally, run both repair paths — <b>read-repair</b> for hot keys and scheduled <b>anti-entropy</b> for cold ones — because reads alone leave rarely-touched keys diverged. Expect and bound staleness (monitor replica lag; offer read-your-writes via quorum or sticky routing where needed). Know the costs: LWW loses data and depends on clocks (prefer logical timestamps/HLCs), version vectors and CRDTs carry metadata (vectors grow with replicas; CRDTs keep tombstones/per-replica state) and only fit operations expressible as a commutative merge. When exact, immediately-agreed values are required (inventory-of-record, balances), that data belongs in a CP/consensus store instead.</p>",
    gotchas: [
      { kind: "warn", html: "<b>Last-write-wins silently drops concurrent updates</b> and depends on synchronized clocks — skew can let an older write win. Use it only for single-owner fields; use version vectors or CRDTs where concurrent updates must survive." },
      { kind: "tip", html: "<b>You need read-repair AND anti-entropy.</b> Read-repair heals hot keys on access; anti-entropy (Merkle-tree background sync) heals cold keys that are never read. Reads alone leave rarely-touched keys diverged forever." },
      { kind: "info", html: "<b>CRDTs give strong eventual consistency</b> — deterministic, lossless, coordination-free merge — but only for data expressible as a commutative type (counters, sets, sequences), and at the cost of extra metadata (tombstones/per-replica state)." }
    ],
    failureModes:
      "<p><b>Silent lost update (LWW):</b> two concurrent writes, one is discarded with no trace; clock skew can drop the newer one. <i>Fix:</i> version vectors (detect + siblings) or CRDTs (merge); use logical clocks/HLC.</p>" +
      "<p><b>Permanent divergence of cold keys:</b> relying on read-repair only, a never-read key stays stale forever after a missed write. <i>Fix:</i> scheduled anti-entropy repair.</p>" +
      "<p><b>Unbounded staleness / broken read-your-writes:</b> a user doesn't see their own write. <i>Fix:</i> quorum (R+W>N) or sticky routing for sensitive reads.</p>" +
      "<p><b>Metadata blowup:</b> version vectors grow with replica count; CRDT tombstones accumulate. <i>Fix:</i> vector pruning, tombstone GC, bounded replica sets.</p>",
    quickCheck: [
      {
        q: "What exactly does eventual consistency promise?",
        options: [
          "Every read always returns the latest write",
          "Given no new writes, all replicas eventually converge to the same value — with no guarantee of when",
          "Writes are applied in the same order everywhere immediately",
          "Replicas never diverge"
        ],
        answer: 1,
        why: "Eventual consistency guarantees convergence in the absence of new writes, but says nothing about timing — so during the convergence window reads can be stale or replicas divergent.",
        diff: "easy"
      },
      {
        q: "Why is last-write-wins risky for a shopping cart?",
        options: [
          "It's too slow to compute",
          "It silently discards one of two concurrent writes (and trusts clocks), so a concurrently-added item can just vanish",
          "It requires a coordinator",
          "It can't converge"
        ],
        answer: 1,
        why: "LWW keeps only the highest-timestamp write and drops the other with no trace, so a concurrent 'add item' can be lost — and clock skew can even make an older write win. A cart needs a merging strategy (version-vector siblings or a CRDT/OR-Set), not LWW.",
        diff: "medium"
      },
      {
        q: "What makes CRDTs give 'strong eventual consistency' without coordination?",
        options: [
          "They elect a leader to order writes",
          "Their merge operation is commutative, associative, and idempotent, so any replicas that have seen the same updates are identical — with no lost updates",
          "They use two-phase commit under the hood",
          "They only allow one writer at a time"
        ],
        answer: 1,
        why: "A CRDT defines merges that are order-independent (commutative/associative) and idempotent, so replicas converge to the same value automatically regardless of message order or duplication — no coordination and no lost updates. That property is strong eventual consistency.",
        diff: "medium"
      }
    ],
    interviewQs: [
      {
        q: "What is eventual consistency and how do replicas actually converge?",
        a: "Eventual consistency is the guarantee that, if writes stop, all replicas converge to the same value — with no promise about when. It's the model AP systems use: replicas accept writes without coordinating so they stay available during partitions, at the cost of temporary divergence. Convergence has two parts. Propagation and repair: anti-entropy runs in the background, comparing replicas with Merkle trees so only differing ranges are synced (this covers cold keys); read-repair fixes divergence on the read path by writing the resolved value back to stale replicas (this covers hot keys); and hinted handoff keeps writes available when a replica is down by having a neighbor buffer and later replay them. Conflict resolution handles writes that disagree: last-write-wins by timestamp (simple but lossy), version vectors to detect concurrent-vs-causal and keep siblings, or CRDTs that merge deterministically with no loss. You need both a propagation story and a conflict story.",
        tip: "Split your answer into 'propagation/repair' (anti-entropy, read-repair, hinted handoff) and 'conflict resolution' (LWW, vectors, CRDTs). That structure shows you know convergence is two problems, not one."
      },
      {
        q: "Compare last-write-wins, version vectors, and CRDTs for conflict resolution.",
        a: "Last-write-wins keeps the write with the highest timestamp. It's trivial and always converges, but it silently drops the other concurrent write and depends on synchronized clocks — with skew, an older write can win — so it's only safe for single-owner fields where losing a concurrent update is acceptable. Version vectors attach per-replica counters to each value so you can compare causality: if one vector dominates another it's strictly newer (causal), and if neither dominates the writes are concurrent — a genuine conflict, which you keep as siblings and reconcile deliberately rather than dropping. That turns silent loss into explicit, detectable conflicts. CRDTs go furthest: they're data types whose merge is commutative, associative, and idempotent, so replicas converge automatically with no lost updates and no coordination — a G-Counter sums per-replica maxima, an OR-Set unions with add/remove tags. The trade is metadata (vectors grow with replicas, CRDTs keep tombstones) and that only mergeable operations fit a CRDT.",
        tip: "Rank them by what they preserve: LWW loses data, version vectors detect conflicts, CRDTs merge losslessly. Name a concrete CRDT (G-Counter/OR-Set) to prove it's not abstract."
      },
      {
        q: "How do you make sure replicas converge even for keys nobody reads?",
        a: "Read-repair only fixes keys that get read, so a value that's rarely accessed could stay diverged indefinitely after a missed write. The backstop is anti-entropy: a background process where replicas periodically compare their data and sync the differences regardless of traffic. To make that comparison cheap at scale, replicas exchange Merkle trees — hash trees over their key ranges — so matching subtrees are pruned instantly and only the ranges that actually differ are drilled into and shipped. Gossip spreads updates node-to-node between rounds. In practice you run both: read-repair for the hot keys users are touching, and scheduled anti-entropy repair for everything else, which together bound how long any replica can stay stale. Hinted handoff complements this by ensuring writes aimed at a temporarily-down replica are buffered by a neighbor and replayed, so a transient outage doesn't create divergence that repair then has to clean up.",
        tip: "The key insight is 'read-repair covers hot keys, anti-entropy covers cold ones — you need both.' Mentioning Merkle trees for efficient diffing is the detail that lands it."
      }
    ],
    businessLens: {
      task: "Keeping ShopKart's cart and 'likes' available and correct across replicas",
      meaning: "Multi-device and multi-region writes stay available and converge without losing items.",
      system: "AP store with anti-entropy, read-repair, and CRDTs",
      point: "ShopKart's cart and like-counts favor availability, so any replica accepts writes and they briefly diverge. The system converges them with anti-entropy (Merkle-tree background repair for cold keys), read-repair (fixing the replicas a shopper actually loads), and hinted handoff (so a rebooting node never rejects a write). For conflict resolution ShopKart refuses last-write-wins on carts — it would silently drop an item — and instead models the cart as an OR-Set CRDT and likes as G-Counters, so concurrent edits from two devices merge deterministically with nothing lost. Data that must be exact and immediately agreed — inventory-of-record and the payment ledger — lives in a CP/consensus store instead, not under eventual consistency."
    }
  };
})();
