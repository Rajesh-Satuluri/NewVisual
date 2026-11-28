/* content/two-phase-commit.js — the "Two-Phase Commit" lesson, as DATA.
   Same shape as content/dbms.js: each step is { chapter, short, title, body[],
   callout, changes?, metrics, scene }. `scene` is a view-snapshot consumed by
   db/two-phase-commit-scene.js. Rendered through the shared course shell. */

export const twoPhaseCommitLesson = {
  id: 'two-phase-commit',
  title: 'Two-Phase Commit',
  group: 'Distributed Systems',
  summary: 'How a single transaction commits atomically across several machines — a coordinator, a round of votes, then one global decision — and why a crash mid-way can leave everyone stuck.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['nodes2', 'votes', 'latency', 'availability'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why nodes deciding independently corrupt a cross-node transaction', step: 0 },
    { text: 'Phase 1 — the coordinator collects a vote from every participant', step: 1 },
    { text: 'Phase 2 — one global COMMIT applied everywhere', step: 2 },
    { text: 'A single NO (or timeout) forces a global ABORT', step: 3 },
    { text: 'The blocking problem: a crashed coordinator freezes participants', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'Torn commit',
      title: 'Each node deciding on its own',
      body: [
        `A transaction moves money and must write to three different databases at once. If each node simply commits whenever it finishes, there is no guarantee they all agree: <b>node 2</b> hits a constraint and rolls back while <b>nodes 1 and 3</b> happily commit.`,
        `Now the data is <span class="term">torn</span> — money left one account but never arrived. Across machines there is no shared transaction manager to make the change all-or-nothing. Something has to <em>coordinate</em> the decision.`,
      ],
      callout: { kind: 'warn', text: 'Independent local commits give you no atomicity across nodes. One node aborting while others commit leaves the system permanently inconsistent.' },
      metrics: { nodes2: 3, votes: 0, latency: 12, availability: 66 },
      scene: { view: 'problem', note: 'Three nodes, three independent decisions — one aborts, the rest commit, data is torn.' },
    },
    { // 1 — TECHNIQUE
      chapter: 'technique', short: 'Prepare',
      title: 'Phase 1 — everyone votes',
      body: [
        `Enter a <span class="term">coordinator</span>. In phase one it asks every participant to <b>PREPARE</b>: do all the work, take the locks, force a prepare record to the log — but do <em>not</em> commit yet. Each node then replies with a single vote, <b>YES</b> (I can commit) or <b>NO</b>.`,
        `A YES is a promise: the node has made itself ready and will honour a later commit even across a restart. Until the coordinator hears from everyone, nothing is final.`,
      ],
      callout: { kind: 'insight', text: 'PREPARE separates “am I able to commit?” from “commit now.” A YES vote is a durable promise the node cannot take back.' },
      changes: ['+ coordinator asks PREPARE', '~ participants lock & log', '+ each votes YES / NO'],
      metrics: { nodes2: 3, votes: 3, latency: 28, availability: 66 },
      scene: { view: 'prepare', note: 'Coordinator asks PREPARE; all three lock their work and vote YES.' },
    },
    { // 2 — SOLUTION
      chapter: 'solution', short: 'Commit',
      title: 'Phase 2 — one global commit',
      body: [
        `Every vote came back YES, so the coordinator records the decision and broadcasts <b>COMMIT</b>. Only now does each participant make its change durable and release its locks.`,
        `The outcome is decided in <em>one</em> place and applied in all of them. Either the whole transaction is visible everywhere, or — as the next step shows — nowhere.`,
      ],
      callout: { kind: 'tip', text: 'The coordinator’s decision record is the point of no return. Once COMMIT is logged, every participant will eventually apply it, even after a crash.' },
      changes: ['+ coordinator logs COMMIT', '+ all participants apply', '~ locks released'],
      metrics: { nodes2: 3, votes: 3, latency: 41, availability: 100 },
      scene: { view: 'commit', note: 'All YES → the coordinator broadcasts COMMIT; every node applies the change.' },
    },
    { // 3 — TRADE-OFF
      chapter: 'tradeoff', short: 'Abort',
      title: 'Any NO means everyone aborts',
      body: [
        `Suppose <b>node 2</b> cannot commit — a conflict, a full disk, or just a timeout with no reply. A single NO is enough: the coordinator decides <b>ABORT</b> and tells every participant to roll back.`,
        `This is the price of atomicity. The transaction only commits if <em>all</em> nodes agree; one dissenter discards everyone’s work. Safety wins over throughput, every time.`,
      ],
      callout: { kind: 'warn', text: 'There is no partial success. One NO vote — or one silent, timed-out node — aborts the entire distributed transaction.' },
      changes: ['- node 2 votes NO', '~ coordinator decides ABORT', '- all nodes roll back'],
      metrics: { nodes2: 3, votes: 2, latency: 38, availability: 0 },
      scene: { view: 'abort', note: 'One NO vote forces a global ABORT — every node rolls back.' },
    },
    { // 4 — PROBLEM
      chapter: 'problem', short: 'Blocking',
      title: 'The blocking problem',
      body: [
        `Now the coordinator crashes <em>after</em> collecting all the YES votes but <em>before</em> broadcasting the decision. The participants are stranded: they have voted YES, so they cannot unilaterally abort, but they have no COMMIT either.`,
        `They sit <span class="term">blocked</span> — holding their locks, refusing conflicting work — until the coordinator comes back. This single point of failure is 2PC’s defining weakness.`,
      ],
      callout: { kind: 'warn', text: 'A coordinator failure between the phases freezes every prepared participant. They hold locks indefinitely — the cluster stalls on one machine’s recovery.' },
      changes: ['- coordinator crashes mid-decision', '~ participants stuck prepared', '- locks held, no progress'],
      metrics: { nodes2: 3, votes: 3, latency: 999, availability: 0 },
      scene: { view: 'blocking', note: 'Coordinator dies after the votes — participants freeze, locked, waiting for a decision that never comes.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Atomic across nodes — at a cost',
      body: [
        `Two-phase commit buys genuine cross-node atomicity: <b>prepare</b> gathers a unanimous promise, then <b>commit</b> (or <b>abort</b>) applies one decision everywhere. Every node ends in the same state.`,
        `But the coordinator is a single point of failure that can block participants, and the whole thing stalls if any node is slow. That blocking flaw is exactly why fault-tolerant <span class="term">consensus</span> protocols like Raft and Paxos exist — the subject of later lessons.`,
      ],
      callout: { kind: 'insight', text: 'Prepare → Commit gives all-or-nothing across machines, but a crashed coordinator can block. Consensus protocols replace the single coordinator with a fault-tolerant majority.' },
      metrics: { nodes2: 3, votes: 3, latency: 41, availability: 100 },
      scene: { view: 'recap', note: 'Prepare then commit = cross-node atomicity; the coordinator remains the weak point.' },
    },
  ],
};
