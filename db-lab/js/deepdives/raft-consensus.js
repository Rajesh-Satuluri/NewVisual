/* ============================================================
   deepdives/raft-consensus.js — "Raft Consensus" deep dive.
   Registers DBLab.deepDives['raft-consensus'] (concept m63).
   Authored against the contract documented in deepdives/mvcc.js.
   ============================================================ */
(function () {
  "use strict";
  var DL = (window.DBLab = window.DBLab || {});
  DL.deepDives = DL.deepDives || {};

  // Scene: a 5-node Raft cluster backing ShopKart's order/config service.
  // Leader election, log replication, majority commit, failover to a
  // up-to-date node, and why a partitioned minority can't split-brain.
  // log cell: { v: "term:cmd", s: "committed"|"uncommitted"|"empty" }
  var E = { v: "", s: "empty" };
  function cell(v, s) { return { v: v, s: s }; }

  var STEPS = [
    {
      label: "1 · Five followers, no leader (term 0)",
      what: "ShopKart's order/config service runs on a <b>5-node</b> Raft cluster (S1–S5). All start as <b>followers</b> in <b>term&nbsp;0</b> with empty logs, each waiting a randomized <b>election timeout</b> to hear from a leader.",
      why: "Raft turns 'a set of replicas agreeing on a value' into 'a set of replicas agreeing on an <b>ordered log</b> of commands'. One elected leader imposes a single order, which is far simpler to reason about than leaderless conflict resolution — this is the algorithm behind etcd, Consul, and CockroachDB ranges.",
      how: "Every server is in exactly one role — follower, candidate, or leader — and time is divided into <b>terms</b> (a logical clock). A follower that hears nothing before its timeout starts an election.",
      when: "Cluster startup, and any time the current leader goes silent.",
      mistake: "Confusing consensus with replication. Replication copies a log; consensus is the harder job of <i>agreeing</i> on that log's contents and order despite failures — which is what Raft provides.",
      interview: "“What problem does Raft solve?” Getting a cluster to agree on a single, consistent, ordered replicated log — leader election + log replication + safety — even as nodes crash and restart.",
      example: "ShopKart's cluster boots: five equal followers, no leader yet, all logs empty.",
      viz: {
        term: 0, leader: null, commitIdx: 0,
        nodes: [
          { id: "S1", role: "follower", log: [E], foot: [], cls: "follower" },
          { id: "S2", role: "follower", log: [E], foot: [], cls: "follower" },
          { id: "S3", role: "follower", log: [E], foot: [], cls: "follower" },
          { id: "S4", role: "follower", log: [E], foot: [], cls: "follower" },
          { id: "S5", role: "follower", log: [E], foot: [], cls: "follower" }
        ],
        note: "Raft = agree on an ordered replicated log. Roles: follower / candidate / leader. Terms are a logical clock. A timeout starts an election."
      }
    },
    {
      label: "2 · Elect a leader (majority of votes)",
      what: "<b>S1</b>'s timer fires first: it becomes a <b>candidate</b>, bumps to <b>term&nbsp;1</b>, votes for itself, and asks the others for votes. S2 and S3 grant them — that's <b>3 of 5</b>, a <b>majority</b> — so S1 becomes <b>leader</b> for term&nbsp;1.",
      why: "Requiring a <b>majority</b> to win is the safety keystone: two different candidates can't both collect a majority in the same term, so there's at most one leader per term — no split-brain. It's the same majority idea as a quorum.",
      how: "A candidate wins with votes from ⌊N/2⌋+1 nodes. Each server grants at most one vote per term (first-come), and randomized timeouts make simultaneous candidacies rare. The new leader then sends periodic heartbeats to suppress further elections.",
      when: "At startup and after any leader failure or partition.",
      mistake: "Assuming the highest-ID or 'best' node leads. Any follower can win; what matters is being first to gather a majority in a new term (with an up-to-date log — see step 6).",
      interview: "“How does Raft guarantee one leader per term?” A candidate needs a majority, each node votes once per term, and two majorities in one term would have to share a voter — impossible. So ≤1 leader per term.",
      example: "ShopKart's S1 wins term 1 with 3 votes and starts sending heartbeats; the others accept it as leader.",
      viz: {
        term: 1, leader: "S1", commitIdx: 0,
        nodes: [
          { id: "S1", role: "leader", log: [E], foot: [{ t: "won 3/5 votes", k: "ok" }], cls: "leader hot" },
          { id: "S2", role: "follower", log: [E], foot: [{ t: "voted S1", k: "info" }], cls: "follower" },
          { id: "S3", role: "follower", log: [E], foot: [{ t: "voted S1", k: "info" }], cls: "follower" },
          { id: "S4", role: "follower", log: [E], foot: [], cls: "follower" },
          { id: "S5", role: "follower", log: [E], foot: [], cls: "follower" }
        ],
        note: "A candidate needs a majority (3/5). Each node votes once per term → at most one leader per term → no split-brain."
      }
    },
    {
      label: "3 · Client command → leader appends (uncommitted)",
      what: "A client sends <code>stock = 90</code> to the leader S1. S1 <b>appends</b> it to its own log at index&nbsp;1 as <b>term&nbsp;1</b> — but marks it <b>uncommitted</b>. It is not yet applied or acknowledged.",
      why: "All writes flow through the leader, which gives every command a single position in the log. But a leader can't commit unilaterally — an entry only becomes safe once a majority has durably stored it (next steps). Until then it could still be lost to a leader change.",
      how: "The leader appends <code>{term:1, cmd:'stock=90'}</code> to its log and prepares to replicate it via AppendEntries. Clients only ever talk to the leader; followers redirect them to it.",
      when: "Every state-changing request to the cluster.",
      mistake: "Thinking the leader can acknowledge as soon as it writes its own log. That would risk data loss on failover — Raft waits for a majority before committing.",
      interview: "“Where do writes go in Raft?” Always to the leader, which appends them to its log in order; they're uncommitted until replicated to a majority.",
      example: "S1 records ShopKart's stock change at log index 1, term 1 — pending replication.",
      viz: {
        term: 1, leader: "S1", commitIdx: 0,
        nodes: [
          { id: "S1", role: "leader", log: [cell("1:90", "uncommitted")], foot: [{ t: "appended idx 1", k: "warn" }], cls: "leader hot" },
          { id: "S2", role: "follower", log: [E], foot: [], cls: "follower" },
          { id: "S3", role: "follower", log: [E], foot: [], cls: "follower" },
          { id: "S4", role: "follower", log: [E], foot: [], cls: "follower" },
          { id: "S5", role: "follower", log: [E], foot: [], cls: "follower" }
        ],
        note: "Writes go to the leader, which appends them in order as UNCOMMITTED. A leader never commits alone — it needs a majority first."
      }
    },
    {
      label: "4 · Replicate the entry to a majority",
      what: "S1 sends <b>AppendEntries</b> to the followers. S2 and S3 append <code>{1:90}</code> to their logs and ack. Now <b>3 of 5</b> nodes hold the entry — a majority — even though S4 and S5 haven't yet.",
      why: "Replicating to a majority is what makes an entry <b>durable across failures</b>: any future leader must also have a majority of votes, and those sets overlap, so at least one voter will carry this entry. That overlap is why a committed entry can never be lost.",
      how: "AppendEntries carries the new entry plus the index/term of the entry before it; a follower accepts only if its log matches there (the <b>Log Matching</b> property), guaranteeing logs stay identical prefixes. Lagging followers are caught up by retrying with earlier entries.",
      when: "Continuously, as the leader streams new entries and heartbeats.",
      mistake: "Ignoring the consistency check. AppendEntries isn't a blind append — it verifies the previous entry matches, which is what keeps every log a consistent prefix of the leader's.",
      interview: "“What's the Log Matching property?” If two logs have an entry with the same index and term, they're identical up to that index — enforced by AppendEntries' prev-index/term check.",
      example: "S2 and S3 store ShopKart's stock entry and ack S1; three copies now exist.",
      viz: {
        term: 1, leader: "S1", commitIdx: 0,
        nodes: [
          { id: "S1", role: "leader", log: [cell("1:90", "uncommitted")], foot: [{ t: "3/5 stored", k: "info" }], cls: "leader hot" },
          { id: "S2", role: "follower", log: [cell("1:90", "uncommitted")], foot: [{ t: "ack", k: "info" }], cls: "follower hot" },
          { id: "S3", role: "follower", log: [cell("1:90", "uncommitted")], foot: [{ t: "ack", k: "info" }], cls: "follower hot" },
          { id: "S4", role: "follower", log: [E], foot: [{ t: "catching up", k: "warn" }], cls: "follower stale" },
          { id: "S5", role: "follower", log: [E], foot: [{ t: "catching up", k: "warn" }], cls: "follower stale" }
        ],
        note: "AppendEntries replicates the entry; a majority (3/5) now hold it. The prev-index/term check keeps every log a consistent prefix."
      }
    },
    {
      label: "5 · Commit on majority → apply",
      what: "Once a majority has stored index&nbsp;1, the leader <b>commits</b> it: it advances its commit index, <b>applies</b> <code>stock = 90</code> to its state machine, answers the client, and tells followers to commit too. The entry is now <b>committed</b> — permanent.",
      why: "Commit is the moment the write becomes real and irrevocable. Because it required a majority, no subsequent leader (which also needs a majority, with an up-to-date log) can be elected without this entry — so a committed entry is never lost or reordered.",
      how: "The leader sets <code>commitIndex = 1</code> and includes it in the next AppendEntries/heartbeat; each follower applies entries up to that index to its own state machine, so all replicas execute the same commands in the same order.",
      when: "As soon as an entry reaches a majority; earlier entries commit implicitly when a later one does.",
      mistake: "Assuming every replica must ack before commit. Only a <i>majority</i> is needed — that's what lets Raft commit while some followers (S4, S5 here) are still behind or down.",
      interview: "“When is a Raft entry committed?” When it's stored on a majority; the leader then applies it and notifies followers. Majority overlap guarantees it survives any future election.",
      example: "ShopKart's stock=90 is committed once 3 nodes have it; the client is told the write succeeded and it can never be undone.",
      viz: {
        term: 1, leader: "S1", commitIdx: 1,
        nodes: [
          { id: "S1", role: "leader", log: [cell("1:90", "committed")], foot: [{ t: "committed ✓", k: "ok" }], cls: "leader" },
          { id: "S2", role: "follower", log: [cell("1:90", "committed")], foot: [{ t: "applied", k: "ok" }], cls: "follower" },
          { id: "S3", role: "follower", log: [cell("1:90", "committed")], foot: [{ t: "applied", k: "ok" }], cls: "follower" },
          { id: "S4", role: "follower", log: [cell("1:90", "uncommitted")], foot: [{ t: "catching up", k: "warn" }], cls: "follower stale" },
          { id: "S5", role: "follower", log: [E], foot: [{ t: "behind", k: "warn" }], cls: "follower stale" }
        ],
        note: "Stored on a majority → leader commits, applies to its state machine, and tells followers. Committed = permanent, same order everywhere."
      }
    },
    {
      label: "6 · Leader fails → an up-to-date node takes over",
      what: "<b>S1 crashes.</b> Followers time out and a new election starts in <b>term&nbsp;2</b>. Only a candidate whose log is <b>at least as up-to-date</b> as a majority can win — so <b>S2</b> (which has the committed entry) becomes the new leader. The committed <code>stock=90</code> survives.",
      why: "This is Raft's <b>safety</b> guarantee. The <b>election restriction</b> — a voter rejects a candidate whose log is less up-to-date than its own — ensures the winner already holds every committed entry, so leadership can change without ever losing or reordering committed data.",
      how: "Candidates include their last log index/term in RequestVote; a voter grants only if the candidate's log is ≥ its own. Since committed entries are on a majority, any winning candidate (needing a majority) must have them. S2 wins term 2 and continues.",
      when: "Every leader failure, restart, or network partition of the leader.",
      mistake: "Fearing that failover loses committed writes (as async replication can). Raft's majority-commit + election-restriction make committed entries provably durable across leader changes.",
      interview: "“How does Raft keep committed entries through a leader change?” The election restriction: a candidate needs a majority, and only logs at least as up-to-date can win — so the new leader already has every committed entry.",
      example: "ShopKart's S1 dies; S2 is elected in term 2 with the committed stock entry intact — no order or config change is lost.",
      viz: {
        term: 2, leader: "S2", commitIdx: 1,
        nodes: [
          { id: "S1", role: "crashed", log: [cell("1:90", "committed")], foot: [{ t: "down", k: "bad" }], cls: "down" },
          { id: "S2", role: "new leader", log: [cell("1:90", "committed")], foot: [{ t: "term 2 · up-to-date", k: "ok" }], cls: "new-leader hot" },
          { id: "S3", role: "follower", log: [cell("1:90", "committed")], foot: [{ t: "voted S2", k: "info" }], cls: "follower" },
          { id: "S4", role: "follower", log: [cell("1:90", "committed")], foot: [{ t: "caught up", k: "ok" }], cls: "follower" },
          { id: "S5", role: "follower", log: [cell("1:90", "committed")], foot: [{ t: "voted S2", k: "info" }], cls: "follower" }
        ],
        note: "Election restriction: only a candidate whose log is as up-to-date as a majority can win. So the new leader already has every committed entry."
      }
    },
    {
      label: "7 · A partitioned minority can't split-brain",
      what: "A network partition isolates <b>S4 and S5</b> (a minority of 2). They time out and try to elect a leader — but they can only reach 2 votes, short of the majority 3. So they <b>cannot elect a leader and cannot commit anything</b>. The majority side (S2, S3, + one more) keeps making progress.",
      why: "The majority requirement is exactly what prevents two leaders and divergent logs during a partition. A minority is <i>fenced by arithmetic</i>: it can neither win an election nor commit, so it can't accept writes that would conflict with the majority — no split-brain, ever.",
      how: "Candidates in the minority can't gather ⌊N/2⌋+1 votes, so they spin in the candidate state (bumping terms fruitlessly) until the partition heals, then rejoin as followers and catch up their logs from the current leader.",
      when: "Any network partition, and the reason Raft clusters use odd sizes (3, 5) — a majority can always exist on one side.",
      mistake: "Worrying the minority will accept writes and fork the data. It can't: with no majority it can't commit, so it simply stops serving writes until it rejoins — availability lost on the minority, consistency preserved (CP).",
      interview: "“What happens to a partitioned minority in Raft?” It can't reach a majority, so it can neither elect a leader nor commit — it stalls (loses availability) while the majority side stays consistent. That's Raft being CP.",
      example: "A rack outage isolates two of ShopKart's five nodes; they stop accepting changes while the other three keep committing orders, and the two catch up when the network returns.",
      viz: {
        term: 3, leader: "S2", commitIdx: 2,
        nodes: [
          { id: "S2", role: "leader", log: [cell("1:90", "committed"), cell("3:80", "committed")], foot: [{ t: "majority · progressing", k: "ok" }], cls: "leader hot" },
          { id: "S3", role: "follower", log: [cell("1:90", "committed"), cell("3:80", "committed")], foot: [{ t: "in majority", k: "ok" }], cls: "follower" },
          { id: "S1", role: "follower", log: [cell("1:90", "committed"), cell("3:80", "committed")], foot: [{ t: "rejoined", k: "info" }], cls: "follower" },
          { id: "S4", role: "candidate", log: [cell("1:90", "committed"), E], foot: [{ t: "only 2 votes", k: "bad" }], cls: "candidate stale" },
          { id: "S5", role: "candidate", log: [cell("1:90", "committed"), E], foot: [{ t: "can't win", k: "bad" }], cls: "candidate stale" }
        ],
        note: "A minority (2/5) can't reach a majority → can't elect a leader or commit. No split-brain: it stalls until it rejoins. Raft is CP."
      }
    }
  ];

  function buildViz(host) {
    host.classList.add("dd-viz");

    function chip(c) { return '<span class="dd-chip dd-chip--' + (c.k || "info") + '">' + c.t + "</span>"; }
    function logHtml(log) {
      return '<div class="dd-rlog">' + log.map(function (c) {
        if (c.s === "empty") return '<span class="dd-rlog-cell">·</span>';
        return '<span class="dd-rlog-cell filled ' + c.s + '">' + c.v + "</span>";
      }).join("") + "</div>";
    }
    function nodeHtml(n) {
      return '<div class="dd-dnode ' + (n.cls || "") + '">' +
        '<div class="dd-dnode-hd"><span class="dd-dnode-id">' + n.id + '</span>' +
          '<span class="dd-dnode-role">' + n.role + "</span></div>" +
        logHtml(n.log) +
        '<div class="dd-dnode-foot">' + (n.foot || []).map(chip).join("") + "</div>" +
      "</div>";
    }

    function update(idx, step) {
      var s = step && step.viz;
      if (idx < 0 || !s) {
        host.innerHTML = '<div class="dd-empty">Press <b>Play</b> to run a 5-node Raft cluster — ' +
          "elect a leader by majority, replicate a command to a majority, commit it, survive a leader crash with no data loss, and watch a minority fail to split-brain.</div>";
        return;
      }
      var metrics =
        '<div class="dd-metrics">' +
          '<div class="dd-metric"><span class="dd-metric-val">' + s.term + '</span><span class="dd-metric-lbl">term</span></div>' +
          '<div class="dd-metric ' + (s.leader ? "good" : "bad") + '"><span class="dd-metric-val" style="font-size:13px">' + (s.leader || "none") + '</span><span class="dd-metric-lbl">leader</span></div>' +
          '<div class="dd-metric"><span class="dd-metric-val">' + s.commitIdx + '</span><span class="dd-metric-lbl">commit idx</span></div>' +
          '<div class="dd-metric"><span class="dd-metric-val">3</span><span class="dd-metric-lbl">majority</span></div>' +
        "</div>";
      var html = '<div class="dd-section"><div class="dd-section-label">Raft cluster · ShopKart order/config service (N=5)</div>' +
        metrics +
        '<div class="dd-cluster">' + s.nodes.map(nodeHtml).join("") + "</div></div>" +
        '<div class="dd-section"><div class="dd-section-label">Log entry state</div><div class="dd-kv-list">' +
          '<span class="dd-chip dd-chip--warn">uncommitted</span>' +
          '<span class="dd-chip dd-chip--ok">committed</span>' +
          '<span class="dd-chip">empty slot</span></div></div>';
      if (s.note) html += '<div class="dd-note">' + s.note + "</div>";
      host.innerHTML = html;
    }

    return { update: update, destroy: function () { host.innerHTML = ""; host.classList.remove("dd-viz"); } };
  }

  DL.deepDives["raft-consensus"] = {
    slug: "raft-consensus",
    overview: {
      what: "<b>Raft</b> is a consensus algorithm that gets a cluster to agree on a single, ordered <b>replicated log</b> of commands. One elected <b>leader</b> takes all writes, appends them to its log, and replicates them; an entry is <b>committed</b> once a <b>majority</b> stores it.",
      why: "Consensus is the principled fix for the hard parts of replication — split-brain and lossy failover. Because every step (electing a leader, committing an entry) needs a majority, and majorities overlap, Raft guarantees at most one leader per term and that committed entries are never lost or reordered. It's what backs etcd, Consul, ZooKeeper-style stores, and CockroachDB.",
      how: "<b>Leader election:</b> a follower that times out becomes a candidate, bumps the term, and wins with a majority of votes. <b>Log replication:</b> the leader appends commands and streams AppendEntries; the prev-index/term check keeps logs identical prefixes. <b>Commit:</b> once a majority has an entry, the leader applies it and tells followers. <b>Safety:</b> the election restriction ensures a new leader already holds every committed entry."
    },
    steps: STEPS,
    buildViz: buildViz,
    code: {
      title: "Raft in three rules (leader, replicate, commit)",
      lang: "text",
      code:
        "ELECTION (a follower's timer fires):\n" +
        "  term += 1; role = CANDIDATE; voteFor(self)\n" +
        "  send RequestVote(term, lastLogIndex, lastLogTerm) to all\n" +
        "  # voter grants iff: not voted this term AND candidate's log is >= its own\n" +
        "  if votes >= majority:  role = LEADER   # <= 1 leader per term (majorities overlap)\n" +
        "\n" +
        "REPLICATE (leader, per client command):\n" +
        "  log.append({term, cmd})                          # uncommitted\n" +
        "  send AppendEntries(prevIndex, prevTerm, entries) # follower accepts only if\n" +
        "                                                   #   its log matches at prevIndex\n" +
        "\n" +
        "COMMIT:\n" +
        "  when an entry is stored on a MAJORITY:\n" +
        "     commitIndex = entry.index; apply(entry) to state machine; ack client\n" +
        "  # committed entries survive any future election (election restriction)\n" +
        "  # minority partition: can't reach majority -> can't elect or commit (CP)",
      highlights: [6, 12, 16]
    },
    reference: [
      ["consensus", "Getting a cluster to agree on one ordered log despite failures"],
      ["term", "A logical clock; each election increments it; ≤1 leader per term"],
      ["leader / follower / candidate", "The three Raft roles a server can be in"],
      ["election", "A candidate wins by gathering a majority of votes"],
      ["AppendEntries", "Leader RPC that replicates log entries (and heartbeats)"],
      ["Log Matching", "Same index+term ⇒ identical logs up to that point"],
      ["commit", "An entry stored on a majority; then applied to the state machine"],
      ["election restriction", "Only a candidate as up-to-date as a majority can win → keeps committed entries"],
      ["majority / quorum", "⌊N/2⌋+1 nodes; overlapping majorities give safety"],
      ["state machine", "Deterministic app that applies committed log entries in order"]
    ],
    internals:
      "<p>Raft decomposes consensus into three understandable pieces. <b>Leader election:</b> time is divided into <b>terms</b> (a logical clock); a follower that hears no heartbeat before a randomized timeout becomes a <b>candidate</b>, increments the term, votes for itself, and requests votes. Winning needs a <b>majority</b>, and since each node votes once per term and two majorities must share a voter, there is <b>at most one leader per term</b> — the property that rules out split-brain.</p>" +
      "<p><b>Log replication:</b> all client commands go to the leader, which appends each as <code>{term, cmd}</code> and sends <b>AppendEntries</b> to followers. Each AppendEntries names the index and term of the preceding entry; a follower accepts only if its log matches there, which enforces <b>Log Matching</b> — any two logs sharing an index+term are identical up to it. An entry is <b>committed</b> once a majority has stored it; the leader then advances its commit index, applies the entry to its <b>state machine</b>, answers the client, and tells followers to apply it too, so every replica executes the same commands in the same order.</p>" +
      "<p><b>Safety</b> ties it together through the <b>election restriction</b>: a voter refuses a candidate whose log is less up-to-date than its own. Because a committed entry lives on a majority and any new leader also needs a majority, the winner is guaranteed to already hold every committed entry — leadership can change repeatedly without losing or reordering committed data. During a <b>partition</b>, only the side with a majority can elect a leader or commit; the minority stalls (no leader, no commits) until it rejoins, which makes Raft a <b>CP</b> system.</p>",
    engineering:
      "<p>You rarely implement Raft, but you run things built on it — etcd (and thus Kubernetes' control plane), Consul, CockroachDB ranges, TiKV, and other consistent config/coordination stores. Understanding it explains their operational rules: use <b>odd cluster sizes</b> (3 or 5) so a majority can always form; a 5-node cluster tolerates 2 failures, a 3-node tolerates 1. It also explains their availability profile — during a partition or too many failures, the cluster <b>refuses writes</b> rather than diverge (CP), so a lost quorum is a full write outage, not a silent fork.</p>" +
      "<p>Consensus is the right tool for the small, critical state that must be exactly-once ordered and never lost: leader election for your own services, cluster membership, configuration, distributed locks, and authoritative sequences. It is <b>not</b> a high-throughput data store — every commit costs a majority round-trip, so you don't put a firehose of application writes through Raft; you put the <i>decisions</i> through it (who's leader, what the config is, the order of a ledger) and keep bulk data in replicated/sharded stores. Watch leader stability (flapping elections from bad timeouts or overload hurt availability) and keep log/snapshot compaction healthy.</p>",
    gotchas: [
      { kind: "tip", html: "<b>Everything hinges on majorities.</b> A leader needs a majority of votes; an entry commits on a majority; and because any two majorities overlap, there's ≤1 leader per term and committed entries always survive elections. Use odd N so a majority can always exist." },
      { kind: "warn", html: "<b>Raft is CP, so a lost quorum is a write outage.</b> If a partition or failures leave no majority, the cluster stops accepting writes rather than fork. That's the point — but size and place nodes (odd counts, multi-AZ) so a majority survives common failures." },
      { kind: "info", html: "<b>Consensus is for decisions, not bulk data.</b> Every commit is a majority round-trip, so route the small critical state (leadership, config, membership, ordered ledgers) through Raft and keep high-volume application data in replicated/sharded stores." }
    ],
    failureModes:
      "<p><b>Lost quorum → write outage:</b> too many nodes down or a bad partition leaves no majority, so no leader can be elected and writes stop. <i>Fix (by design):</i> odd N, spread across failure domains; add nodes / restore before quorum is lost.</p>" +
      "<p><b>Leader flapping:</b> overload or mis-tuned election timeouts cause repeated elections, stalling progress. <i>Fix:</i> tune timeouts well above network RTT, reduce leader load, use pre-vote.</p>" +
      "<p><b>Slow/lagging followers:</b> a follower far behind forces the leader to ship many entries or a snapshot. <i>Fix:</i> log compaction/snapshots, healthy disks/network.</p>" +
      "<p><b>Misuse as a data store:</b> pushing high-throughput app writes through Raft bottlenecks on per-commit majority round-trips. <i>Fix:</i> keep only critical decisions/ordering in Raft; bulk data in replicated/sharded stores.</p>",
    quickCheck: [
      {
        q: "In a 5-node Raft cluster, how many nodes must store an entry before the leader can commit it?",
        options: ["1 (just the leader)", "3 (a majority)", "5 (all nodes)", "2 (any two)"],
        answer: 1,
        why: "An entry is committed once a majority — ⌊5/2⌋+1 = 3 — has stored it. Requiring only a majority (not all N) lets the cluster commit while some followers are slow or down, and majority overlap guarantees the entry survives future elections.",
        diff: "easy"
      },
      {
        q: "Why can a committed entry never be lost when the leader changes?",
        options: [
          "The old leader copies its log to the new one before dying",
          "A committed entry is on a majority, and a new leader also needs a majority whose votes require an up-to-date log — so the winner already has the entry",
          "Followers refuse all elections",
          "Raft writes committed entries to a separate database"
        ],
        answer: 1,
        why: "Committed = stored on a majority. Winning an election also needs a majority, and the election restriction makes voters reject less-up-to-date candidates. Since the two majorities overlap, any new leader already holds every committed entry.",
        diff: "medium"
      },
      {
        q: "A partition isolates 2 nodes of a 5-node Raft cluster. What do those 2 nodes do?",
        options: [
          "Elect their own leader and keep accepting writes (split-brain)",
          "They can't reach a majority, so they can neither elect a leader nor commit — they stall until they rejoin",
          "They automatically become read-only replicas of an external primary",
          "They shut down permanently"
        ],
        answer: 1,
        why: "Two nodes can't reach the majority of 3, so no candidate among them can win and nothing can be committed. The minority stalls (loses availability) while the majority side stays consistent — Raft is CP, and this is why there's no split-brain.",
        diff: "hard"
      }
    ],
    interviewQs: [
      {
        q: "Explain how Raft works at a high level.",
        a: "Raft gets a cluster to agree on a single ordered replicated log. It splits the problem into three parts. Leader election: time is divided into terms; a follower that stops hearing heartbeats becomes a candidate, increments the term, and requests votes — winning needs a majority, and since each node votes once per term, there's at most one leader per term. Log replication: all writes go to the leader, which appends each command to its log and sends AppendEntries to followers; a consistency check on the previous entry keeps every log an identical prefix of the leader's. Commit: once a majority has stored an entry, the leader commits it, applies it to its state machine, and tells followers — so all replicas apply the same commands in the same order. Safety comes from the election restriction: a voter won't grant a vote to a candidate whose log is less up-to-date, so any new leader already has every committed entry. During a partition only the majority side can make progress, which makes Raft CP.",
        tip: "Structure it as election / replication / commit / safety — that decomposition is literally why Raft was designed, and naming it signals real understanding."
      },
      {
        q: "How does Raft prevent split-brain and guarantee committed entries survive failover?",
        a: "Both come from majorities overlapping. To become leader you need votes from a majority, and each server votes at most once per term, so two candidates can't both win the same term — at most one leader per term, no split-brain. An entry is only committed once a majority has stored it. When a leader fails and a new election happens, the winner again needs a majority, and the election restriction makes voters reject candidates whose logs aren't at least as up-to-date as their own — so the new leader's supporting majority must include a node that has each committed entry, meaning the new leader already has them all. Put together: committed entries live on a majority, every leader is backed by a majority, and any two majorities intersect, so committed data is never lost or reordered across leader changes. A partitioned minority simply can't form a majority, so it can neither elect a leader nor commit — it stalls rather than forking.",
        tip: "The one idea to land is 'any two majorities overlap.' Everything — single leader per term, durable commits, no split-brain — falls out of that."
      },
      {
        q: "When should you use consensus like Raft, and when is it the wrong tool?",
        a: "Use it for the small amount of critical state that must be strictly ordered, atomic, and never lost: leader election for your services, cluster membership, configuration, distributed locks, and authoritative sequences or ledgers — which is exactly what etcd, Consul, and ZooKeeper-style systems provide, and why Kubernetes stores its control-plane state in etcd. It's the principled answer to the failover and split-brain problems that plain replication has. It's the wrong tool for high-throughput bulk data, because every commit costs a majority round-trip, so it doesn't scale writes — you'd bottleneck. So the pattern is: put the decisions and ordering through Raft, and keep the firehose of application data in replicated and sharded stores. Also remember it's CP: if you lose quorum you lose writes, so size clusters with odd counts across failure domains so a majority survives normal failures.",
        tip: "Give concrete uses (etcd/K8s, config, locks, leader election) and the explicit anti-pattern (bulk writes), plus the CP/quorum-sizing caveat. That range shows judgment, not just theory."
      }
    ],
    businessLens: {
      task: "Agreeing on ShopKart's order sequence and service leadership without split-brain",
      meaning: "One consistent, ordered log of critical decisions that survives any node or leader failure.",
      system: "Raft-backed coordination store (etcd-style), 5 nodes",
      point: "ShopKart runs a 5-node Raft cluster for the state that must be exactly right: which node owns each shard, the current configuration, distributed locks, and the authoritative order-sequence. Every such write goes through the leader and commits only once 3 of 5 nodes have it, so it's permanent and identically ordered everywhere. When the leader's rack fails, a node that already holds every committed entry is elected in a new term with zero loss, and if a partition isolates two nodes they simply stall instead of forking — no double-assigned shard, no duplicated order number. The team keeps the firehose of product and order <i>data</i> in sharded, replicated Postgres; only the critical <i>decisions</i> ride Raft, because each commit costs a majority round-trip."
    }
  };
})();
