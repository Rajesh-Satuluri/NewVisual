/* content/failure-modes.js — the "Nodes" lesson (how nodes fail), as DATA.
   Same shape as content/dbms.js. Rendered through the shared course shell;
   scene snapshots are consumed by db/failure-modes-scene.js. */

export const failureModesLesson = {
  id: 'failure-modes',
  title: 'Nodes',
  group: 'Distributed Systems',
  summary: 'A distributed database is a set of nodes — and the whole discipline is designing for the ways a node can fail. Crash, slow, unreachable, or outright wrong: each failure mode asks for a different defense.',
  minutes: 9,
  level: 'intermediate',
  metrics: ['nodes2', 'availability', 'latency', 'lag'],
  legend: ['read', 'write'],
  goals: [
    { text: 'A node is a whole machine running a DB process', step: 0 },
    { text: 'Crash (fail-stop): the clean, easy failure to handle', step: 1 },
    { text: 'Gray failure: a slow node is worse than a dead one', step: 2 },
    { text: 'Partition: up but unreachable — looks like a crash', step: 3 },
    { text: 'Byzantine: a node that lies, and why it costs so much', step: 4 },
  ],

  steps: [
    { // 0 — the unit
      chapter: 'solution', short: 'A node',
      title: 'One node, the unit of a cluster',
      body: [
        `Before we scale out, pin down the atom. A <span class="term">node</span> is a single machine — its own CPU, RAM, disk and network link — running one copy of the database process. It accepts connections, answers reads and applies writes, all on its own.`,
        `A distributed database is just many of these cooperating. So every property we care about — durability, availability, consistency — is really a statement about what happens when some of these nodes <em>misbehave</em>. Everything that follows is a catalogue of how.`,
      ],
      callout: { kind: 'insight', text: 'A node is a full machine, not a disk. When it fails it can fail in its CPU, its memory, its disk, or its network — and each of those is a different problem.' },
      metrics: { nodes2: 5, availability: 100, latency: 12, lag: 4 },
      scene: { view: 'healthy', note: 'Five nodes, every one serving reads and writes.' },
    },
    { // 1 — crash
      chapter: 'technique', short: 'Crash',
      title: 'Crash: the clean failure',
      body: [
        `The kindest failure is a <span class="term">fail-stop</span> crash: the node simply halts — power loss, kernel panic, process killed. It does nothing further and, crucially, it does nothing <em>wrong</em>.`,
        `Peers notice the gap in its <b>heartbeats</b>, declare it dead, and reroute traffic to replicas that hold the same data. Clients barely notice. This is the failure every distributed system is built to shrug off first.`,
      ],
      callout: { kind: 'tip', text: 'Fail-stop is easy precisely because it is detectable and honest: the node is either answering correctly or not answering at all.' },
      changes: ['- 1 node down', '+ heartbeat timeout fires', '~ traffic → replicas'],
      metrics: { nodes2: 5, availability: 99, latency: 14, lag: 6 },
      scene: { view: 'crash', note: 'One node stops; its work shifts to a replica and service continues.' },
    },
    { // 2 — gray failure
      chapter: 'problem', short: 'Slow',
      title: 'Gray failure: slow is worse than dead',
      body: [
        `Now the nasty one. A node stays <em>up</em> — it answers heartbeats — but it is <span class="term">degraded</span>: a dying disk, long GC pauses, or quiet packet loss. It still accepts requests, then takes seconds to answer, or times them out.`,
        `Because it looks alive, failure detection leaves it in rotation, and it poisons tail latency for everyone routed to it. A cleanly dead node is removed in a heartbeat; a <b>gray-failing</b> node lingers and hurts far more.`,
      ],
      callout: { kind: 'warn', text: 'A slow node is worse than a crashed one: it passes liveness checks, keeps taking traffic, and drags p99 latency up until clients give up.' },
      changes: ['~ node UP but degraded', '+ tail latency spikes', '+ timeouts, retries pile on'],
      metrics: { nodes2: 5, availability: 92, latency: 240, lag: 180 },
      scene: { view: 'slow', note: 'The node answers heartbeats but stalls on real work — tail latency explodes.' },
    },
    { // 3 — partition
      chapter: 'problem', short: 'Partition',
      title: 'Partition: up, but unreachable',
      body: [
        `Sometimes the node is perfectly healthy — but the <span class="term">network</span> between it and its peers breaks. Packets stop crossing. The node keeps running, serving whoever can still reach it, while the rest of the cluster sees only silence.`,
        `From the outside, an unreachable node is <em>indistinguishable</em> from a crashed one: same missed heartbeats, same timeouts. That ambiguity — is it dead, or just cut off? — is the root of the hardest problems in distributed databases.`,
      ],
      callout: { kind: 'warn', text: 'You cannot tell a crashed node from a partitioned one by observation alone. This is why the CAP theorem exists — and why split-brain is dangerous.' },
      changes: ['~ node healthy', '- link severed', '? crash or partition — unknowable'],
      metrics: { nodes2: 5, availability: 80, latency: 60, lag: 800 },
      scene: { view: 'partition', note: 'The node is up — the link is down. To its peers it looks exactly like a crash.' },
    },
    { // 4 — byzantine
      chapter: 'tradeoff', short: 'Byzantine',
      title: 'Byzantine: a node that lies',
      body: [
        `The worst case: a node that does not stop, but returns <em>wrong</em> answers — corrupt RAM flipping bits, a bad disk sector, a buggy build, or a compromised host. It confidently replies with data that is simply false.`,
        `Crash tolerance assumes nodes are honest; <span class="term">Byzantine</span> tolerance does not. Catching a liar needs redundancy and <b>voting</b> — compare several nodes' answers and take the majority — plus checksums end to end. That costs far more hardware and messages, which is why most databases defend against crashes, not lies.`,
      ],
      callout: { kind: 'insight', text: 'Tolerating f Byzantine (lying) nodes classically needs 3f+1 replicas and a voting protocol — several times the cost of tolerating f crashes.' },
      changes: ['~ node UP and answering', '+ but answers are WRONG', '+ needs voting + checksums'],
      metrics: { nodes2: 5, availability: 100, latency: 20, lag: 10 },
      scene: { view: 'byzantine', note: 'Four nodes agree; one lies. Only a vote across replicas catches it.' },
    },
    { // 5 — recap
      chapter: 'recap', short: 'Recap',
      title: 'The failure spectrum',
      body: [
        `Node failure is not one thing but a spectrum: <b>crash</b> (easy — detectable and honest), <b>gray/slow</b> (sneaky — alive but degraded), <b>partition</b> (ambiguous — up but unreachable), and <b>Byzantine</b> (expensive — up and lying).`,
        `The tools are the same throughout: <span class="term">detection</span> (heartbeats, timeouts, health checks), <span class="term">replication</span> (so a lost node loses no data), and <span class="term">quorums</span> (so a minority can't do harm). Together they turn most node failures into non-events — and the rest of this section is how.`,
      ],
      callout: { kind: 'insight', text: 'Detection + replication + quorums are the three levers that convert node failures from outages into background noise.' },
      metrics: { nodes2: 5, availability: 100, latency: 12, lag: 4 },
      scene: { view: 'recap', note: 'Crash · slow · partition · Byzantine — four modes, three defenses.' },
    },
  ],
};
