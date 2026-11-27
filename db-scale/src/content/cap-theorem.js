/* content/cap-theorem.js — the "CAP Theorem" lesson, as DATA. Same shape as
   content/dbms.js: each step is { chapter, short, title, body[], callout,
   changes?, metrics, scene }. Rendered through the shared course shell;
   `scene` is consumed by db/cap-theorem-scene.js. */

export const capTheoremLesson = {
  id: 'cap-theorem',
  title: 'CAP Theorem',
  group: 'Distributed Systems',
  summary: 'The rule every distributed database bumps into: when the network splits, you can keep answering or you can stay consistent — not both. Everything else is how gracefully you make that choice.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['nodes2', 'availability', 'latency', 'partitions'],
  legend: ['read', 'write'],
  goals: [
    { text: 'What Consistency, Availability and Partition-tolerance each mean', step: 0 },
    { text: 'Why a partition is a when, not an if', step: 1 },
    { text: 'The CP choice: stay correct, give up the minority', step: 2 },
    { text: 'The AP choice: stay up, let values diverge', step: 3 },
    { text: 'Picking CP or AP per workload', step: 4 },
  ],

  steps: [
    { // 0 — the three properties
      chapter: 'technique', short: 'C · A · P',
      title: 'Three properties, one tension',
      body: [
        `Spread a database across machines and three desirable properties start to compete. <span class="term">Consistency</span> (C): every read returns the most recent write — all clients see one agreed value. <span class="term">Availability</span> (A): every request reaches a working node and gets a non-error answer. <span class="term">Partition-tolerance</span> (P): the system keeps running even when the network drops or delays messages between nodes.`,
        `The CAP theorem says a distributed store cannot guarantee all three at the same moment. The catch is subtle — the conflict is invisible until the network misbehaves.`,
      ],
      callout: { kind: 'insight', text: 'C = one truth everyone sees · A = always an answer · P = survives a broken network. CAP is about what happens when these collide.' },
      metrics: { nodes2: 3, availability: 100, latency: 5, partitions: 0 },
      scene: { view: 'three', note: 'Consistency, Availability, Partition-tolerance — you can’t pin all three at once.' },
    },
    { // 1 — the partition
      chapter: 'problem', short: 'Partition',
      title: 'The network splits in two',
      body: [
        `Networks are not reliable. A switch fails, a cable is cut, a data-centre link saturates — and suddenly your cluster is sliced into two groups that each keep running but can no longer hear each other. That is a <span class="term">partition</span>.`,
        `Both halves are alive. Clients can still reach nodes on either side. The only thing lost is the ability of the two halves to agree. In a system spanning machines, P is not a feature you can switch off — it is a condition the world imposes on you.`,
      ],
      callout: { kind: 'warn', text: 'A partition isn’t an exotic failure — it’s a normal Tuesday at scale. You don’t choose whether to tolerate it; you only choose how.' },
      changes: ['+ network split into two halves', '~ each half still serving clients', '− halves can’t reach each other'],
      metrics: { nodes2: 5, availability: 100, latency: 20, partitions: 1 },
      scene: { view: 'partition', note: 'Two halves, both up, newly blind to each other — the moment CAP is about.' },
    },
    { // 2 — CP
      chapter: 'tradeoff', short: 'Choose C',
      title: 'CP: stay correct, lose the minority',
      body: [
        `One answer: refuse to be wrong. The side that can still form a majority keeps serving; the <span class="term">minority</span> side, unable to confirm its writes with the rest, rejects them and returns errors.`,
        `No node ever hands back stale or conflicting data, so <b>Consistency</b> holds — but clients stuck on the minority side are turned away, so <b>Availability</b> is sacrificed for them. This is the <span class="term">CP</span> stance: a correct answer or no answer.`,
      ],
      callout: { kind: 'tip', text: 'CP systems (consensus stores like ZooKeeper, etcd, Spanner) would rather fail a request than return the wrong value.' },
      changes: ['+ majority stays consistent', '− minority rejects writes', '~ availability drops on the cut-off side'],
      metrics: { nodes2: 5, availability: 60, latency: 40, partitions: 1 },
      scene: { view: 'cp', note: 'Minority refuses writes it can’t confirm — consistent, but unavailable there.' },
    },
    { // 3 — AP
      chapter: 'tradeoff', short: 'Choose A',
      title: 'AP: stay up, let values diverge',
      body: [
        `The other answer: never stop answering. Both halves accept reads and writes independently, so every client gets served — <b>Availability</b> is preserved everywhere.`,
        `The price is that the two sides now hold different values for the same key (<code>x = 1</code> here, <code>x = 2</code> there). <b>Consistency</b> is temporarily given up; once the partition heals, the system must <span class="term">reconcile</span> the conflict (last-write-wins, version vectors, merge). This is the <span class="term">AP</span> stance.`,
      ],
      callout: { kind: 'insight', text: 'AP systems (Dynamo, Cassandra, Riak) keep serving through a split and repair divergence afterward — eventual consistency.' },
      changes: ['+ every node keeps serving', '~ the two halves diverge', '+ reconcile once the split heals'],
      metrics: { nodes2: 5, availability: 100, latency: 12, partitions: 1 },
      scene: { view: 'ap', note: 'Both sides answer and drift apart — available now, reconciled later.' },
    },
    { // 4 — the choice
      chapter: 'tradeoff', short: 'CP vs AP',
      title: 'Which side of the line?',
      body: [
        `The choice isn’t global or permanent — it’s per system, sometimes per operation. A bank ledger or a lock service leans <span class="term">CP</span>: better to stall than to double-spend. A shopping cart, feed, or metrics pipeline leans <span class="term">AP</span>: better to keep serving and tidy up later.`,
        `Note what’s <em>not</em> on the menu: giving up P. When there’s no partition, a good system delivers both C and A; CAP only forces the trade during the split itself.`,
      ],
      callout: { kind: 'tip', text: 'Ask per use case: is a wrong-but-fast answer worse than no answer? Yes → CP. No → AP.' },
      metrics: { nodes2: 5, availability: 80, latency: 25, partitions: 1 },
      scene: { view: 'cptable', note: 'CP refuses rather than be wrong; AP answers rather than go dark.' },
    },
    { // 5 — recap
      chapter: 'recap', short: 'Recap',
      title: 'P is a given; C or A is the dial',
      body: [
        `On a real network, partitions will happen, so <b>P</b> is not negotiable. That turns CAP from “pick two of three” into a sharper statement: <em>when a partition strikes, choose Consistency or Availability.</em>`,
        `Everything downstream — quorums, consensus, eventual consistency, read-repair — is machinery for making that choice safely and healing afterward. The next lessons build exactly that machinery.`,
      ],
      callout: { kind: 'insight', text: 'Partition-tolerance is mandatory; the real design decision is where you sit on the Consistency ⟷ Availability dial during a split.' },
      metrics: { nodes2: 5, availability: 100, latency: 8, partitions: 0 },
      scene: { view: 'recap', note: 'P is fixed by the network; you tune between C and A when it breaks.' },
    },
  ],
};
