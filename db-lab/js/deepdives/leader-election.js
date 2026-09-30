/* ============================================================
   deepdives/leader-election.js — "Leader Election" deep dive.
   Registers DBLab.deepDives['leader-election'] (concept m75).
   Authored against the contract documented in deepdives/mvcc.js.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  DL.deepDives = DL.deepDives || {};

  // Scene: a 5-node cluster behind ShopKart's shard coordinator. One node
  // must be the single leader. We watch heartbeats, a failure, an election,
  // a split vote, and fencing/leases that stop two leaders.
  var STEPS = [
    {
      label: "1 · A healthy cluster has one leader",
      what: "ShopKart's coordination cluster has five nodes; <b>S1</b> is the current <b>leader</b> in <b>term&nbsp;3</b>. It sends periodic <b>heartbeats</b>; each follower resets its <b>election timer</b> every time it hears one, so nobody starts an election.",
      why: "Many systems need exactly one node 'in charge' at a time — the shard coordinator, the writer, the lock holder. Leader election is how a group of equal peers agrees on that single node <i>and</i> notices when it's gone.",
      how: "The leader emits heartbeats faster than the election timeout. A follower that keeps hearing them stays a follower; its timer never reaches zero.",
      when: "Kubernetes controllers, Kafka controller, HDFS NameNode HA, database failover controllers, distributed locks — anywhere a singleton role exists.",
      mistake: "Assuming 'leader' means 'most powerful node'. Any node can lead; leadership is a role granted by the group for a term, not a property of the hardware.",
      interview: "“Why elect a leader at all?” To have a single, agreed decision-maker (writer/coordinator) and a defined way to replace it on failure — avoiding conflicting decisions from peers.",
      example: "ShopKart's S1 coordinates shard assignments and heartbeats the other four; the cluster is calm and settled.",
      viz: {
        term: 3, leader: "S1",
        nodes: [
          { id: "S1", role: "leader", foot: [{ t: "heartbeating", k: "accent" }], cls: "leader hot" },
          { id: "S2", role: "follower", timer: 90, foot: [], cls: "follower" },
          { id: "S3", role: "follower", timer: 85, foot: [], cls: "follower" },
          { id: "S4", role: "follower", timer: 92, foot: [], cls: "follower" },
          { id: "S5", role: "follower", timer: 88, foot: [], cls: "follower" }
        ],
        note: "One leader per term sends heartbeats; each follower resets its (randomized) election timer on every heartbeat, so no election starts."
      }
    },
    {
      label: "2 · The leader fails — timers start draining",
      what: "<b>S1 crashes</b> (or is partitioned away). The heartbeats stop. Each follower's <b>election timer</b> — a <i>randomized</i> countdown — is no longer being reset, so they all start draining toward zero.",
      why: "Detecting failure is the first half of election. Because there's no perfect failure detector, the cluster infers 'leader gone' from missed heartbeats over a timeout. Randomizing the timeout is what avoids everyone reacting at the same instant.",
      how: "Each follower picks a random timeout (e.g. 150–300 ms). With the leader silent, whichever timer expires first will act; the randomization makes ties rare.",
      when: "Any leader crash, GC pause, network partition, or overload that stops heartbeats.",
      mistake: "Using a fixed election timeout for all nodes. Then all followers time out together and all become candidates at once — a guaranteed split vote (step 5).",
      interview: "“How does a cluster detect the leader is down?” Missed heartbeats past a randomized election timeout — an inference, not certainty, which is why elections must be safe under false positives.",
      example: "ShopKart's S1 goes dark; S2–S5 stop getting heartbeats and their election timers begin counting down at slightly different rates.",
      viz: {
        term: 3, leader: null,
        nodes: [
          { id: "S1", role: "crashed", foot: [{ t: "down", k: "bad" }], cls: "down" },
          { id: "S2", role: "follower", timer: 40, foot: [{ t: "timer draining", k: "warn" }], cls: "follower" },
          { id: "S3", role: "follower", timer: 55, foot: [{ t: "timer draining", k: "warn" }], cls: "follower" },
          { id: "S4", role: "follower", timer: 22, foot: [{ t: "timer draining", k: "warn" }], cls: "follower stale" },
          { id: "S5", role: "follower", timer: 60, foot: [{ t: "timer draining", k: "warn" }], cls: "follower" }
        ],
        note: "No heartbeats → timers drain. Randomized timeouts (not a fixed value) make one node likely to fire first, avoiding a simultaneous scramble."
      }
    },
    {
      label: "3 · First to time out becomes a candidate",
      what: "<b>S4</b>'s timer hits zero first. It becomes a <b>candidate</b>, increments the term to <b>4</b>, votes for itself, and sends <b>RequestVote</b> to everyone. The others, still followers, will grant their vote if they haven't already voted this term.",
      why: "Turning a timeout into a candidacy — plus a fresh term — is how the cluster proposes a new leader. The term acts as a logical clock so stale messages from older terms are ignored.",
      how: "Candidate S4: term←4, voteFor←self, broadcast RequestVote(term=4, …). A follower grants a vote at most once per term, first-come (and, in log-based systems, only to a sufficiently up-to-date candidate).",
      when: "As soon as any follower's election timeout elapses with no leader.",
      mistake: "Forgetting the one-vote-per-term rule. It's what guarantees two candidates can't both collect a majority in the same term.",
      interview: "“What does a node do when its election timer fires?” Become a candidate, bump the term, vote for itself, and request votes from the rest.",
      example: "ShopKart's S4 declares its candidacy for term 4 and asks S2, S3, S5 for their votes.",
      viz: {
        term: 4, leader: null,
        nodes: [
          { id: "S1", role: "crashed", foot: [{ t: "down", k: "bad" }], cls: "down" },
          { id: "S2", role: "follower", foot: [{ t: "vote → S4", k: "info" }], cls: "follower" },
          { id: "S3", role: "follower", foot: [{ t: "vote → S4", k: "info" }], cls: "follower" },
          { id: "S4", role: "candidate", timer: 0, foot: [{ t: "term 4 · self-vote", k: "warn" }], cls: "candidate hot" },
          { id: "S5", role: "follower", foot: [{ t: "vote → S4", k: "info" }], cls: "follower" }
        ],
        note: "First timeout → candidate: bump the term, vote for self, request votes. Each node votes at most once per term (first-come)."
      }
    },
    {
      label: "4 · A majority elects the new leader",
      what: "S4 collects its own vote plus S2, S3, S5 — <b>4 of 5</b>, well past the majority of 3 — so <b>S4 becomes leader</b> for term 4 and immediately starts heartbeating. The cluster is settled again with one leader.",
      why: "Requiring a <b>majority</b> is the safety keystone: two candidates can't both win the same term because their vote sets would have to overlap. One leader per term, guaranteed — no split-brain from the election itself.",
      how: "On reaching ⌊N/2⌋+1 votes, the candidate transitions to leader and sends heartbeats, which reset everyone's timers and suppress further elections.",
      when: "Every successful election.",
      mistake: "Electing on a plurality instead of a majority. Without a strict majority, two 'leaders' can coexist and issue conflicting decisions.",
      interview: "“Why a majority rather than just the most votes?” Because any two majorities of the same set intersect, so only one candidate can gather one per term — that's what prevents two leaders.",
      example: "ShopKart's S4 wins term 4 with four votes and resumes coordinating shards; S2, S3, S5 fall back to follower and reset their timers.",
      viz: {
        term: 4, leader: "S4",
        nodes: [
          { id: "S1", role: "crashed", foot: [{ t: "down", k: "bad" }], cls: "down" },
          { id: "S2", role: "follower", timer: 95, foot: [{ t: "follows S4", k: "info" }], cls: "follower" },
          { id: "S3", role: "follower", timer: 90, foot: [{ t: "follows S4", k: "info" }], cls: "follower" },
          { id: "S4", role: "new leader", foot: [{ t: "won 4/5 · heartbeating", k: "ok" }], cls: "new-leader hot" },
          { id: "S5", role: "follower", timer: 93, foot: [{ t: "follows S4", k: "info" }], cls: "follower" }
        ],
        note: "Majority (≥3/5) → leader. Two majorities of one set must overlap, so at most one candidate wins a term: no split-brain from elections."
      }
    },
    {
      label: "5 · Split vote — nobody wins, so retry",
      what: "Suppose two nodes time out together: <b>S2</b> and <b>S3</b> both become candidates in the same term and split the votes 2–2 (with one node unreachable). <b>Neither reaches a majority</b>, so no leader is elected — the term simply fails.",
      why: "Split votes are the cost of a decentralized election. They don't break safety (still no two leaders), only liveness — the cluster wastes a term. The remedy is randomized timeouts so a repeat split is unlikely.",
      how: "With no majority, candidates time out again, <b>increment the term</b>, and retry after a fresh random backoff. Different random timeouts make one candidate likely to get ahead and win the next round. <b>Pre-vote</b> avoids needless term inflation.",
      when: "Rarely, when timeouts are poorly randomized or many nodes restart together.",
      mistake: "Panicking about split votes as if data is lost. Nothing commits without a leader; it's a liveness hiccup resolved by another round.",
      interview: "“What happens on a split vote?” No majority → no leader that term; candidates back off randomly and retry a higher term. Randomization (and pre-vote) make it self-correcting.",
      example: "Two ShopKart nodes race for term 5 and tie; both back off by different random amounts, and S3 cleanly wins term 6.",
      viz: {
        term: 5, leader: null,
        nodes: [
          { id: "S1", role: "crashed", foot: [{ t: "down", k: "bad" }], cls: "down" },
          { id: "S2", role: "candidate", foot: [{ t: "2 votes · short", k: "warn" }], cls: "candidate stale" },
          { id: "S3", role: "candidate", foot: [{ t: "2 votes · short", k: "warn" }], cls: "candidate stale" },
          { id: "S4", role: "follower", foot: [{ t: "voted S2", k: "info" }], cls: "follower" },
          { id: "S5", role: "unreachable", foot: [{ t: "no vote", k: "bad" }], cls: "down" }
        ],
        note: "Two candidates split the votes → no majority → no leader this term. Safe (never two leaders); resolved by random backoff + a higher term."
      }
    },
    {
      label: "6 · Fencing / leases stop two leaders",
      what: "The real danger isn't the election — it's a <b>stale leader</b>. S1 was only paused (long GC); it wakes up still believing it's leader. To stop it issuing commands, leadership carries a <b>fencing token</b> / <b>lease</b>: the store rejects any request stamped with an <b>old term</b>.",
      why: "Elections can produce a new leader while the old one is merely slow, not dead. Without fencing, the zombie old leader and the new leader both act → split-brain and corruption. The monotonic token makes stale leadership <i>harmless</i>.",
      how: "Each leadership grant has a strictly increasing epoch/term (or a time-bounded lease). Downstream resources record the highest token seen and reject anything lower. S1's term-3 write is refused because the store has already seen term 4.",
      when: "Always, in any correct leader-based system — especially with locks and external side effects.",
      mistake: "Relying on the old leader to 'notice' it lost and stop. It may be partitioned or paused; safety must not depend on its cooperation. Fence at the resource.",
      interview: "“How do you prevent a paused old leader from causing split-brain?” Fencing tokens / leases: a monotonically increasing epoch on every leadership grant, and resources reject any request with a stale token.",
      example: "ShopKart's paused S1 revives and tries a term-3 shard write; the metadata store, already at term 4, rejects it — the zombie leader can do no harm.",
      viz: {
        term: 4, leader: "S4",
        nodes: [
          { id: "S1", role: "stale leader?", foot: [{ t: "term 3 · REJECTED", k: "bad" }], cls: "down" },
          { id: "S4", role: "leader", foot: [{ t: "term 4 · fencing token", k: "ok" }], cls: "leader hot" },
          { id: "S2", role: "follower", foot: [{ t: "follows S4", k: "info" }], cls: "follower" },
          { id: "S3", role: "follower", foot: [{ t: "follows S4", k: "info" }], cls: "follower" },
          { id: "S5", role: "follower", foot: [{ t: "follows S4", k: "info" }], cls: "follower" }
        ],
        note: "A paused old leader is the real hazard. A monotonic fencing token/lease per term lets resources reject stale-term requests → no split-brain."
      }
    },
    {
      label: "7 · How systems actually elect",
      what: "Three families in the wild: <b>quorum-based</b> (Raft/Paxos — a candidate wins a majority, as here); <b>lease-based</b> (a coordination service like ZooKeeper/etcd/Chubby grants a time-bounded lease, e.g. via an ephemeral node); and the classic <b>bully</b> algorithm (highest ID wins). All must be paired with <b>fencing</b>.",
      why: "Most apps don't implement election themselves — they lean on a consensus service (etcd/ZooKeeper) that provides a correct, fenced primitive. Knowing the families tells you what guarantees you're getting and where the timeouts/leases need tuning.",
      how: "Quorum: majority vote + terms (built into Raft). Lease: acquire a lock/ephemeral node with a TTL; renew via heartbeats; losing the session drops leadership. Bully: nodes defer to the highest-ID live node. Tune election timeout well above network RTT; use pre-vote to avoid term churn.",
      when: "Choosing/operating any leader-based component — from your own service's HA to Kafka's controller.",
      mistake: "Hand-rolling election from scratch. It's easy to get split-brain wrong; use etcd/ZooKeeper leases (with fencing tokens) unless you're building the consensus layer itself.",
      interview: "“How would you make your service pick a single leader?” Use etcd/ZooKeeper: contend for a lease/lock, renew via heartbeat, and fence downstream with the lease's monotonic revision — rather than writing an election protocol.",
      example: "ShopKart's services elect a leader by holding an etcd lease and stamp shard operations with its revision as a fencing token — no custom protocol needed.",
      viz: {
        term: 4, leader: "S4",
        nodes: [
          { id: "S4", role: "leader (lease)", foot: [{ t: "etcd lease · renewing", k: "ok" }], cls: "leader hot" },
          { id: "S2", role: "follower", foot: [{ t: "watching lease", k: "info" }], cls: "follower" },
          { id: "S3", role: "follower", foot: [{ t: "watching lease", k: "info" }], cls: "follower" },
          { id: "S5", role: "follower", foot: [{ t: "watching lease", k: "info" }], cls: "follower" }
        ],
        note: "Families: quorum (Raft), lease (ZooKeeper/etcd ephemeral), bully (highest ID). Prefer a consensus service + fencing over a hand-rolled protocol."
      }
    }
  ];

  function buildViz(host) {
    host.classList.add("dd-viz");
    function chip(c) { return '<span class="dd-chip dd-chip--' + (c.k || "info") + '">' + c.t + "</span>"; }
    function nodeHtml(n) {
      var timer = "";
      if (typeof n.timer === "number") {
        var fired = n.timer <= 0;
        timer = '<div class="dd-timer"><div class="dd-timer-fill' + (fired ? " fired" : "") + '" style="width:' + Math.max(n.timer, 0) + '%"></div></div>';
      }
      return '<div class="dd-dnode ' + (n.cls || "") + '">' +
        '<div class="dd-dnode-hd"><span class="dd-dnode-id">' + n.id + '</span><span class="dd-dnode-role">' + n.role + "</span></div>" +
        '<div class="dd-dnode-foot">' + (n.foot || []).map(chip).join("") + "</div>" +
        timer +
      "</div>";
    }
    function update(idx, step) {
      var s = step && step.viz;
      if (idx < 0 || !s) {
        host.innerHTML = '<div class="dd-empty">Press <b>Play</b> to watch a 5-node cluster elect a leader — ' +
          "heartbeats and timers, a failure, a majority vote, a split vote, and the fencing/leases that stop two leaders.</div>";
        return;
      }
      var metrics =
        '<div class="dd-metrics">' +
          '<div class="dd-metric"><span class="dd-metric-val">' + s.term + '</span><span class="dd-metric-lbl">term</span></div>' +
          '<div class="dd-metric ' + (s.leader ? "good" : "bad") + '"><span class="dd-metric-val" style="font-size:13px">' + (s.leader || "none") + '</span><span class="dd-metric-lbl">leader</span></div>' +
          '<div class="dd-metric"><span class="dd-metric-val">3</span><span class="dd-metric-lbl">majority</span></div>' +
        "</div>";
      var html = '<div class="dd-section"><div class="dd-section-label">Cluster · ShopKart shard coordinator (N=5)</div>' +
        metrics + '<div class="dd-cluster">' + s.nodes.map(nodeHtml).join("") + "</div></div>";
      if (s.note) html += '<div class="dd-note">' + s.note + "</div>";
      host.innerHTML = html;
    }
    return { update: update, destroy: function () { host.innerHTML = ""; host.classList.remove("dd-viz"); } };
  }

  DL.deepDives["leader-election"] = {
    slug: "leader-election",
    overview: {
      what: "<b>Leader election</b> lets a group of equal nodes agree on a single node to play a special role (writer, coordinator, lock holder) for a bounded <b>term</b> — and replace it safely when it fails.",
      why: "Many systems need exactly one node in charge to avoid conflicting decisions. Election gives that singleton plus a defined, automatic failover. The subtle danger isn't picking a leader — it's a <b>stale leader</b> (paused, then revived) acting alongside the new one, which fencing/leases must prevent.",
      how: "A leader sends heartbeats; followers run <b>randomized</b> election timers. If heartbeats stop, the first to time out becomes a <b>candidate</b>, bumps the term, and needs a <b>majority</b> of votes to win (so only one leader per term). Every leadership grant carries a monotonically increasing <b>fencing token</b>/lease so resources reject stale-term requests."
    },
    steps: STEPS,
    buildViz: buildViz,
    code: {
      title: "Election + the fencing token that actually keeps you safe",
      lang: "text",
      code:
        "FOLLOWER:\n" +
        "  on heartbeat(leaderTerm >= myTerm): reset randomized election timer\n" +
        "  on election-timer expiry with no leader: become CANDIDATE\n" +
        "\n" +
        "CANDIDATE:\n" +
        "  term += 1; voteFor(self); broadcast RequestVote(term)\n" +
        "  # each node grants <= 1 vote per term (first-come)\n" +
        "  if votes >= majority: become LEADER   # <=1 leader per term (majorities overlap)\n" +
        "  else (split vote): random backoff, retry higher term   # + pre-vote\n" +
        "\n" +
        "FENCING (the part that prevents split-brain):\n" +
        "  every leadership grant has a monotonically increasing epoch/lease\n" +
        "  resource.apply(req):\n" +
        "     if req.epoch < highest_epoch_seen: REJECT   # zombie old leader can't act\n" +
        "     else: highest_epoch_seen = req.epoch; do(req)",
      highlights: [8, 13, 16]
    },
    reference: [
      ["leader / term", "The elected singleton and the numbered period it leads for"],
      ["heartbeat", "Periodic message from leader that resets followers' timers"],
      ["election timeout", "Randomized wait after which a follower starts an election"],
      ["candidate", "A node campaigning for votes in a new term"],
      ["majority", "⌊N/2⌋+1 votes needed to win → at most one leader per term"],
      ["split vote", "No candidate reaches a majority; term fails, retry"],
      ["pre-vote", "Probe for votes before bumping the term (avoids term churn)"],
      ["fencing token", "Monotonic epoch on leadership; resources reject stale tokens"],
      ["lease", "Time-bounded leadership grant (ZooKeeper/etcd), renewed by heartbeat"]
    ],
    internals:
      "<p>Election has two halves: <b>failure detection</b> and <b>agreement</b>. Detection is inferred from missed <b>heartbeats</b> past a <b>randomized election timeout</b> — there's no perfect failure detector, so a slow or partitioned leader looks the same as a dead one, which means the protocol must stay safe even when detection is wrong. Randomizing the timeout is what keeps followers from all reacting at once.</p>" +
      "<p>Agreement is a <b>majority vote</b> in a new <b>term</b>. The first follower to time out becomes a candidate, increments the term (a logical clock that lets everyone ignore stale messages), votes for itself, and requests votes; each node grants at most one vote per term. Because any two majorities of the same set intersect, at most one candidate can win a term — so the election itself can never produce two leaders. A <b>split vote</b> (two candidates, no majority) costs only a term: candidates back off randomly and retry, and <b>pre-vote</b> avoids inflating terms while doing so.</p>" +
      "<p>The safety subtlety is the <b>stale leader</b>: a node paused by a long GC or partition can revive still believing it leads, while a new leader already exists. Nothing in the election stops the zombie from issuing commands — so correctness must not depend on it noticing. The fix is <b>fencing</b>: every leadership grant carries a monotonically increasing epoch (or a time-bounded <b>lease</b>), and every downstream resource records the highest epoch it has seen and rejects any request stamped with a lower one. That makes stale leadership harmless rather than merely unlikely.</p>",
    engineering:
      "<p>Don't hand-roll election — it's easy to get split-brain wrong. Lean on a consensus service: contend for an <b>etcd/ZooKeeper lease or lock</b>, renew it via heartbeats, and treat losing the session as losing leadership. That gives you a correct, tested primitive; your job is mostly tuning (election timeout comfortably above network RTT and GC pauses) and, crucially, <b>fencing downstream</b>.</p>" +
      "<p>Fencing is the part teams forget and then get burned by: the lease alone doesn't stop a paused old leader from writing when it wakes. Stamp every side-effecting operation with the lease's monotonic revision as a <b>fencing token</b>, and have the resource (DB, object store, lock target) reject stale tokens. Also make failover observable — leadership flapping usually means timeouts are too tight or the leader is overloaded — and remember every leader-based component you run (Kafka controller, K8s controllers, your own HA services) has an election and a fencing story worth understanding.</p>",
    gotchas: [
      { kind: "warn", html: "<b>The stale leader, not the election, is the danger.</b> A paused/partitioned old leader can revive and act alongside the new one. Only a monotonic fencing token/lease — checked at the resource — makes that harmless." },
      { kind: "tip", html: "<b>Randomize election timeouts.</b> Fixed timeouts make all followers campaign at once → guaranteed split votes. Randomization (plus pre-vote) lets one candidate get ahead and win cleanly." },
      { kind: "info", html: "<b>Use a consensus service, don't invent one.</b> etcd/ZooKeeper leases give a correct election primitive; hand-rolled protocols usually get split-brain or fencing wrong. Your job is tuning timeouts and fencing downstream." }
    ],
    failureModes:
      "<p><b>Split-brain from a stale leader:</b> a paused old leader revives and issues commands next to the new one. <i>Fix:</i> fencing tokens / leases rejected by the resource on stale epoch.</p>" +
      "<p><b>Election storm / leader flapping:</b> timeouts too tight or an overloaded leader cause repeated elections, stalling progress. <i>Fix:</i> raise election timeout above RTT+GC, reduce leader load, pre-vote.</p>" +
      "<p><b>Perpetual split votes:</b> fixed (un-randomized) timeouts make everyone campaign together. <i>Fix:</i> randomized timeouts and backoff.</p>" +
      "<p><b>No quorum → no leader:</b> too many nodes down/partitioned means no majority can elect. <i>Fix (by design):</i> odd cluster sizes across failure domains; this is CP behavior, accept the write pause.</p>",
    quickCheck: [
      {
        q: "Why must a candidate win a MAJORITY (not just the most votes) to become leader?",
        options: ["Majorities are faster to count", "Any two majorities of the same set overlap, so at most one candidate can win a term — preventing two leaders", "It reduces network traffic", "So the highest-ID node always wins"],
        answer: 1,
        why: "A strict majority guarantees that two candidates in the same term can't both win, because their vote sets would have to share a voter — and each node votes once per term. That overlap is what rules out split-brain from the election.",
        diff: "easy"
      },
      {
        q: "A leader is paused by a long GC; the cluster elects a new one; then the old leader wakes up. What prevents it from corrupting data?",
        options: [
          "The old leader always detects it lost and stops on its own",
          "A monotonically increasing fencing token/lease: resources reject requests stamped with the old (lower) epoch",
          "The new leader kills the old process",
          "Nothing — this is an unavoidable risk"
        ],
        answer: 1,
        why: "Safety can't depend on the zombie leader cooperating. Each leadership grant carries a monotonic epoch/lease; downstream resources record the highest epoch seen and reject anything lower, so the stale leader's writes are refused.",
        diff: "medium"
      },
      {
        q: "Why are election timeouts randomized?",
        options: [
          "To make leaders change frequently for fairness",
          "So followers don't all time out and campaign simultaneously, which would split the vote every round",
          "To slow down failure detection",
          "Randomization has no functional purpose"
        ],
        answer: 1,
        why: "With a fixed timeout every follower becomes a candidate at the same instant, splitting votes with no majority. Randomized timeouts let one node fire first and gather a majority, making clean elections likely.",
        diff: "medium"
      }
    ],
    interviewQs: [
      {
        q: "Walk through how leader election works and how it stays safe.",
        a: "A leader sends heartbeats; each follower runs a randomized election timer that resets on every heartbeat. If the leader dies or is partitioned, heartbeats stop, timers drain, and the first follower to time out becomes a candidate: it increments the term (a logical clock), votes for itself, and requests votes from the rest. Each node grants at most one vote per term, and a candidate needs a majority to win — which guarantees at most one leader per term, because two majorities of the same set must overlap. A split vote just fails that term; candidates back off by different random amounts and retry a higher term, and pre-vote avoids inflating terms. The critical safety piece is fencing: because a paused old leader can revive believing it still leads, every leadership grant carries a monotonically increasing epoch or lease, and downstream resources reject any request with a stale epoch — so a zombie leader is harmless.",
        tip: "End on fencing. Many candidates describe the vote correctly but miss that the real hazard is a stale leader, and fencing — not the election — is what prevents split-brain."
      },
      {
        q: "How would you give your own service a single leader in production?",
        a: "I wouldn't hand-roll an election protocol — it's easy to get split-brain or fencing wrong. I'd use a consensus service: contend for a lease or lock in etcd or ZooKeeper (for example an ephemeral node / a lease with a TTL), renew it with heartbeats, and treat losing the session as immediately losing leadership. Then — and this is the part people skip — I'd fence downstream: stamp every side-effecting operation with the lease's monotonically increasing revision as a fencing token, and have the resource reject stale tokens, so a node that was paused during a GC can't act after a new leader is chosen. Operationally I'd set the lease/heartbeat and election timeouts comfortably above network RTT and worst-case GC pauses to avoid flapping, and make leadership changes observable.",
        tip: "Name etcd/ZooKeeper leases AND the fencing token. 'Use a lease' without fencing is the incomplete answer interviewers probe for."
      },
      {
        q: "What's a split vote, and is it a correctness or a liveness problem?",
        a: "A split vote is when two or more candidates campaign in the same term and none reaches a majority — for example two nodes time out together and each gets half the votes. It's purely a liveness problem, not a correctness one: nothing commits without a leader, and the majority rule still guarantees no two leaders, so no data is lost or corrupted — the cluster just wastes a term. It resolves itself: candidates time out again, increment the term, and retry after a fresh random backoff, so different randomized timeouts let one candidate get ahead and win the next round. Pre-vote is a refinement that checks whether a node could win before it bumps the term, avoiding needless term inflation and disruption during partitions.",
        tip: "Explicitly say 'liveness, not safety' — that framing shows you understand elections stay safe under bad detection, which is the deeper point."
      }
    ],
    businessLens: {
      task: "Keeping exactly one ShopKart shard coordinator, with clean failover",
      meaning: "One node coordinates at a time; a crash triggers an automatic, fenced handover.",
      system: "5-node cluster using an etcd lease + fencing tokens",
      point: "ShopKart needs a single coordinator to assign shards and drive failovers — two at once would issue conflicting assignments. The nodes elect a leader by holding an etcd lease renewed with heartbeats; if the leader crashes or is partitioned, its lease expires and a follower wins a majority-backed grant for the next term in well under a second. Crucially, every shard operation is stamped with the lease's monotonic revision as a fencing token, so when a leader that was merely paused by a GC wakes up, the metadata store rejects its stale-term writes — no split-brain, no double-assigned shard. ShopKart tunes the lease/heartbeat timeouts above its worst GC pauses so leadership doesn't flap under load."
    }
  };
})();
