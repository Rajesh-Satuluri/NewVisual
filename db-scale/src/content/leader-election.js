/* content/leader-election.js — the "Leader Election" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/leader-election-scene.js. */

export const leaderElectionLesson = {
  id: 'leader-election',
  title: 'Leader Election',
  group: 'Distributed Systems',
  summary: 'How a cluster agrees on exactly one coordinator — by majority vote, using terms to retire stale leaders, and majority rule to rule out two leaders at once.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['nodes2', 'term', 'votes', 'availability'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why so many jobs need exactly one coordinator', step: 0 },
    { text: 'An election: candidates campaign for votes', step: 1 },
    { text: 'A majority crowns one leader — and only one', step: 2 },
    { text: 'Majority rule blocks split-brain under a partition', step: 3 },
    { text: 'Re-election with a higher term when a leader dies', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Why one',
      title: 'Two leaders is chaos',
      body: [
        `All sorts of jobs need a <b>single</b> decision-maker: who assigns the next write order, who owns a lock, who drives replication. The moment <em>two</em> nodes each believe they are in charge, they hand out conflicting orders.`,
        `Here both leaders write to the same key at the same instant — one says <code>x = 1</code>, the other <code>x = 2</code>. There is no tie-breaker, so the shared state is simply corrupted. The whole point of a leader is to be the <span class="term">one</span> that decides.`,
      ],
      callout: { kind: 'warn', text: 'Two active leaders = two sources of truth = divergence. A cluster must guarantee at most one leader at a time.' },
      metrics: { nodes2: 2, term: 0, votes: 0, availability: 40 },
      scene: { view: 'why', note: 'Two self-appointed leaders, one shared state, conflicting writes.' },
    },
    { // 1 — SOLUTION / TECHNIQUE
      chapter: 'technique', short: 'Election',
      title: 'Call an election',
      body: [
        `When nodes notice there is no leader — usually because they have stopped hearing from one — any of them can become a <span class="term">candidate</span> and start an <b>election</b>. It bumps the <b>term</b> (a monotonic election counter) and asks every peer to vote for it.`,
        `This is a <code>RequestVote</code> round: the candidate broadcasts, and each peer replies with a yes or no. Several nodes can run for office at once, which is why a plain “first to ask” rule is not enough — the winner needs a real test.`,
      ],
      callout: { kind: 'insight', text: 'A term is a logical clock for elections. Every vote and every message is stamped with it, so stale leaders are easy to spot later.' },
      changes: ['+ candidate declared', '+ term incremented', '~ RequestVote broadcast'],
      metrics: { nodes2: 5, term: 1, votes: 0, availability: 55 },
      scene: { view: 'election', note: 'One candidate, four peers, a round of vote requests.' },
    },
    { // 2 — SOLUTION
      chapter: 'solution', short: 'Majority',
      title: 'Win by a majority',
      body: [
        `The test is a <span class="term">majority</span>: a candidate becomes leader only once it collects votes from more than half the nodes — here 3 of 5 (its own vote plus two backers).`,
        `Majority is the magic ingredient. Each node votes for at most one candidate per term, and any two majorities of the same set must overlap in at least one node — so <b>two</b> candidates can never both reach a majority in the same term. One election, one leader.`,
      ],
      callout: { kind: 'insight', text: 'Any two majorities of N nodes share a member. That single overlapping voter can’t back two candidates — which is exactly why a term yields a unique leader.' },
      changes: ['+ 3 of 5 votes collected', '+ leader for term 1', '~ others become followers'],
      metrics: { nodes2: 5, term: 1, votes: 3, availability: 100 },
      scene: { view: 'majority', note: 'Three votes out of five — a majority crowns exactly one leader.' },
    },
    { // 3 — PROBLEM (split-brain)
      chapter: 'problem', short: 'Split-brain',
      title: 'Majority rule stops split-brain',
      body: [
        `Now the network splits the cluster in two. If a leader could be elected by <em>any</em> group, each side would crown its own — two leaders, divergent data: <span class="term">split-brain</span>.`,
        `Majority rule quietly prevents it. The three-node side still has a majority and keeps (or elects) a leader; the two-node side can never reach 3 votes, so it refuses to elect and simply stalls until the partition heals. Safety wins over availability on the minority side.`,
      ],
      callout: { kind: 'warn', text: 'Only one side of any partition can hold a majority. The minority must block rather than elect — losing availability to protect against two leaders.' },
      changes: ['~ cluster partitioned 3 / 2', '+ majority side keeps a leader', '− minority side can’t elect'],
      metrics: { nodes2: 5, term: 1, votes: 3, availability: 60 },
      scene: { view: 'split', note: 'A partition: the 3-node side has quorum; the 2-node side is stuck.' },
    },
    { // 4 — TECHNIQUE (re-election)
      chapter: 'technique', short: 'Re-elect',
      title: 'When the leader dies, re-elect',
      body: [
        `Leaders are not forever. Followers expect a periodic heartbeat; when it stops arriving, a follower’s election timeout fires and it starts a <b>new</b> election at a <em>higher</em> term.`,
        `The survivors elect a successor — here N3 wins term 2 — and because the new term is higher, any message from the old leader (even if it comes back to life) is recognised as stale and ignored. The term number is how the cluster agrees on <span class="term">whose</span> turn it is now.`,
      ],
      callout: { kind: 'tip', text: 'Heartbeat timeout → new election → higher term. A revived old leader sees a newer term and steps down automatically.' },
      changes: ['− leader N1 lost', '+ election at term 2', '+ N3 elected leader'],
      metrics: { nodes2: 5, term: 2, votes: 3, availability: 95 },
      scene: { view: 'reelect', note: 'Dead leader, heartbeat timeout, a new leader at a higher term.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'One coordinator, agreed and renewable',
      body: [
        `Leader election gives a distributed system a single coordinator without anyone appointing it: nodes <b>vote</b>, a <b>majority</b> decides, a <b>term</b> labels each reign, and a timeout triggers a fresh election when the leader falls.`,
        `Those four pieces — vote, majority, term, timeout — are the backbone of Raft and similar protocols, and the reason a healthy cluster always has exactly one leader and never two.`,
      ],
      callout: { kind: 'insight', text: 'Majority vote (uniqueness) + terms (recency) + heartbeat timeouts (liveness) = exactly one leader at a time, re-elected on failure.' },
      metrics: { nodes2: 5, term: 2, votes: 3, availability: 100 },
      scene: { view: 'recap', note: 'One leader, followers in line — pick one, agree, re-elect when it dies.' },
    },
  ],
};
