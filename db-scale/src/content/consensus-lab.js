/* content/consensus-lab.js — the "Consensus Lab" interactive lesson, as DATA.
   Same shape as every other db-scale lesson: each step is
   { chapter, short, title, body[], callout, changes?, metrics, scene }.
   `scene` is a view-snapshot consumed by db/consensus-lab-scene.js.

   A hands-on lab: five nodes agree on one value with Raft — elect a leader by
   majority vote, replicate a log entry committed once a majority acks, survive
   a minority crash, and watch a split vote resolve in a new term. */

export const consensusLabLesson = {
  id: 'consensus-lab',
  title: 'Consensus Lab',
  group: 'Interactive Labs',
  summary: 'Make five nodes agree on one value with Raft: win an election by majority vote, replicate a log entry committed once a majority acks, survive a crashed follower, and resolve a split vote in a new term.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['nodes2', 'votes', 'term', 'messages'],
  goals: [
    { text: 'Why a cluster needs one agreed leader, not many writers', step: 0 },
    { text: 'Win an election by collecting a majority of votes', step: 1 },
    { text: 'Replicate a log entry, committed once a majority persists it', step: 2 },
    { text: 'Keep committing while a minority of nodes is down', step: 3 },
    { text: 'Resolve a split vote with a timeout and a new term', step: 4 },
  ],

  steps: [
    { // 0 — SETUP
      chapter: 'setup', short: 'Setup',
      title: 'Five nodes, no leader',
      body: [
        `Welcome to the lab. We run a cluster of <b>five</b> nodes that must agree on a single sequence of values — the <span class="term">replicated log</span>. Right now every node is a <span class="term">follower</span>, nobody is in charge, and the <span class="term">term</span> (an election epoch counter) is <code>1</code>.`,
        `Letting any node accept writes would let them diverge. <span class="term">Raft</span> avoids that by funnelling every write through one elected <span class="term">leader</span>. First the cluster must choose one — and it does so by <b>majority vote</b>, where a majority of five is <code>3</code>.`,
      ],
      callout: { kind: 'tip', text: 'A majority (quorum) of 5 is 3. Any two majorities of the same cluster must overlap in at least one node — that overlap is what keeps consensus consistent.' },
      metrics: { nodes2: 5, votes: 0, term: 1, messages: 0 },
      scene: { view: 'setup', note: 'Five followers, term 1, no leader yet.' },
    },
    { // 1 — PROBLEM / election
      chapter: 'problem', short: 'Elect',
      title: 'Win a majority of votes',
      body: [
        `A follower's election timer fires first. It bumps the term to <code>2</code>, becomes a <span class="term">candidate</span>, votes for itself, and sends <span class="term">RequestVote</span> to the other four.`,
        `Each node grants at most <b>one</b> vote per term. Three nodes (the candidate plus two more) say yes — that's <code>3/5</code>, a majority. The candidate becomes <b>leader</b> for term 2 and starts sending heartbeats. The two votes it didn't need don't matter: a majority is enough.`,
      ],
      callout: { kind: 'insight', text: 'One vote per node per term + a majority requirement means at most one leader can be elected in a given term. That is the core safety guarantee of Raft elections.' },
      changes: ['term 1 → 2', 'candidate votes for itself', '✓ 3/5 votes → leader elected'],
      metrics: { nodes2: 5, votes: 3, term: 2, messages: 8 },
      scene: { view: 'election', note: 'Candidate collects 3/5 votes → becomes leader for term 2.' },
    },
    { // 2 — SOLUTION / replicate
      chapter: 'solution', short: 'Replicate',
      title: 'Commit once a majority acks',
      body: [
        `A client sends <code>set x = 7</code> to the leader. The leader <b>appends</b> it to its own log, then ships <span class="term">AppendEntries</span> to the four followers in parallel.`,
        `As each follower persists the entry it <b>acks</b>. The moment the leader counts a majority — itself plus two, <code>3/5</code> — the entry is <span class="term">committed</span>: durable even if the leader dies. The leader applies it, replies to the client, and tells followers the new commit index. One value, agreed.`,
      ],
      callout: { kind: 'insight', text: 'An entry commits when a majority has persisted it — not all nodes. Lagging followers catch up later, but the value is already safe because any future leader must come from a majority that includes a node holding it.' },
      changes: ['+ leader appends set x = 7', '~ AppendEntries → followers persist', '✓ 3/5 acks → committed'],
      metrics: { nodes2: 5, votes: 3, term: 2, messages: 16 },
      scene: { view: 'replicate', note: 'Leader appends, 3/5 followers ack → entry committed.' },
    },
    { // 3 — TECHNIQUE / crash
      chapter: 'technique', short: 'Crash',
      title: 'Survive a minority crash',
      body: [
        `Now crash one follower mid-run. The cluster is down to <b>four</b> reachable nodes, but a majority is still <code>3</code>.`,
        `The leader keeps replicating: it only ever needed a majority to ack, and the three remaining followers plus the leader easily clear that bar. Writes keep committing with <b>no interruption</b>. Raft tolerates up to a <em>minority</em> of failures — for five nodes, that's two down and the cluster still works.`,
      ],
      callout: { kind: 'tip', text: 'A 5-node cluster tolerates 2 failures; a 3-node cluster tolerates 1. Availability needs a majority alive, so odd cluster sizes give the best failure tolerance per node.' },
      changes: ['✗ 1 follower crashes', '4 nodes reachable, majority still 3', '✓ commits continue uninterrupted'],
      metrics: { nodes2: 5, votes: 3, term: 2, messages: 12 },
      scene: { view: 'crash', note: 'One follower down; 3/5 still a majority, so commits continue.' },
    },
    { // 4 — TRADEOFF / split vote
      chapter: 'tradeoff', short: 'Split vote',
      title: 'A split vote, resolved',
      body: [
        `Leaders aren't free. Suppose the leader dies and <b>two</b> followers time out at nearly the same instant. Both become candidates for term <code>3</code> and both request votes. The cluster splits <code>2–2</code> with one node already spent — <b>neither reaches 3</b>. No leader.`,
        `This is a <span class="term">split vote</span>. Each candidate's election simply <b>times out</b>, the term ticks to <code>4</code>, and they retry. Raft uses <em>randomized</em> timeouts, so this time one candidate fires well before the other, grabs a clean majority, and wins. Progress resumes.`,
      ],
      callout: { kind: 'warn', text: 'Split votes cost a round of latency but never corrupt anything — the majority rule guarantees at most one winner per term. Randomized timeouts make repeated splits vanishingly unlikely.' },
      changes: ['term 3: 2 candidates split 2–2', '✗ no majority → election times out', '↺ term 4, randomized retry → leader'],
      metrics: { nodes2: 5, votes: 2, term: 4, messages: 20 },
      scene: { view: 'splitvote', note: 'Two candidates split the vote; timeout, term++, retry succeeds.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'What the lab proved',
      body: [
        `Consensus means a cluster agrees on <em>one</em> value despite failures. Raft gets there with two majority rules: elect a single leader per term by majority vote, and commit each log entry once a majority has persisted it.`,
        `Because any two majorities overlap, a committed value survives leader changes and a minority of crashes. The cost is a short election delay after a failure, and the occasional split vote that a randomized timeout clears. Odd cluster sizes maximize how many failures you can absorb.`,
      ],
      callout: { kind: 'insight', text: 'Elect by majority → replicate → commit at majority → survive a minority down → re-elect on failure. One leader per term plus overlapping majorities is the whole safety argument.' },
      metrics: { nodes2: 5, votes: 3, term: 4, messages: 0 },
      scene: { view: 'recap', note: 'Majority vote + majority commit = one agreed value, fault-tolerant.' },
    },
  ],
};
