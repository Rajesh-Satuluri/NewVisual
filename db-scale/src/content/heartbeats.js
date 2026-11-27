/* content/heartbeats.js — "Heartbeats", as DATA. Same shape as content/dbms.js:
   each step is { chapter, short, title, body[], callout, changes?, metrics,
   scene }. `scene` is a view-snapshot consumed by db/heartbeats-scene.js. */

export const heartbeatsLesson = {
  id: 'heartbeats',
  title: 'Heartbeats',
  group: 'Distributed Systems',
  summary: 'The simplest thing a node can say is “I’m still here.” Periodic heartbeats turn liveness into a signal a failure detector can watch — and the way you send them decides whether your cluster scales or drowns in pings.',
  minutes: 8,
  level: 'intermediate',
  metrics: ['nodes2', 'rtt', 'suspected', 'messages'],
  legend: ['read', 'write'],
  goals: [
    { text: 'A heartbeat + a timeout is the basic liveness signal', step: 0 },
    { text: 'The interval knob trades detection speed against traffic', step: 1 },
    { text: 'All-to-all heartbeating is O(N²) and will not scale', step: 2 },
    { text: 'Gossip / SWIM spreads liveness in O(N) messages', step: 3 },
    { text: 'Indirect probes kill false positives from lost packets', step: 4 },
  ],

  steps: [
    { // 0 — SOLUTION
      chapter: 'solution', short: 'I’m alive',
      title: 'A beat, and a timer that watches it',
      body: [
        `A node can’t announce its own death — a dead node sends nothing. So we flip it around: every healthy node sends a small <span class="term">heartbeat</span> (“I’m alive”) on a fixed interval, and a monitor keeps a timer that it <b>resets</b> on every beat.`,
        `As long as beats keep arriving, the timer never fires. Go <em>silent</em> for longer than the timeout and the monitor stops trusting you — you’re marked <span class="term">suspect</span>. Liveness has become something you can measure.`,
      ],
      callout: { kind: 'insight', text: 'A heartbeat proves life only by its presence. Absence is the signal: no beat within the timeout → suspicion.' },
      metrics: { nodes2: 2, rtt: 5, suspected: 0, messages: 1 },
      scene: { view: 'ping', note: 'One beat per interval resets the monitor’s timer; silence past the timeout raises suspicion.' },
    },
    { // 1 — TRADEOFF
      chapter: 'tradeoff', short: 'Interval',
      title: 'How often should it beat?',
      body: [
        `The interval (and the timeout built on it) is a dial. <b>Frequent</b> beats with a short timeout notice a death almost immediately — but every node, every interval, forever, is extra traffic.`,
        `<b>Sparse</b> beats with a long timeout barely cost anything, but a crashed node can sit undetected for seconds. Worse, a short timeout risks calling a merely-slow node dead. There is no free setting — only the one that fits your latency budget.`,
      ],
      callout: { kind: 'tip', text: 'Timeout ≈ how long you’ll tolerate a dead node going unnoticed. Shorter detects faster but flaps more; longer is calm but slow.' },
      changes: ['~ shorter timeout → faster detection', '~ longer interval → less traffic', '− too short → false alarms'],
      metrics: { nodes2: 2, rtt: 5, suspected: 0, messages: 10 },
      scene: { view: 'interval', note: 'Frequent beats detect failure fast but flood the network; sparse beats are cheap but slow.' },
    },
    { // 2 — PROBLEM
      chapter: 'problem', short: 'All-to-all',
      title: 'Everyone pinging everyone',
      body: [
        `The obvious design — have every node heartbeat every other node — quietly explodes. With N nodes that’s <b>N × (N−1)</b> messages per round: 5 nodes send 20, 100 nodes send 9,900, and it grows with the <span class="term">square</span> of the cluster.`,
        `Double the cluster and you quadruple the chatter. A big enough cluster spends its network budget just telling itself it’s alive.`,
      ],
      callout: { kind: 'warn', text: 'All-to-all heartbeating is O(N²). It’s fine for a handful of nodes and a disaster for a hundred.' },
      metrics: { nodes2: 5, rtt: 8, suspected: 0, messages: 20 },
      scene: { view: 'alltoall', note: 'Every node pings every other: N×(N−1) messages — O(N²), it does not scale.' },
    },
    { // 3 — SOLUTION
      chapter: 'solution', short: 'Gossip',
      title: 'Gossip: ping a few, tell a few',
      body: [
        `Scalable detectors (SWIM, gossip protocols) drop the mesh. Each node pings only a <b>few random peers</b> per round and piggybacks what it has heard about everyone else. Membership and liveness spread <span class="term">epidemically</span> — like rumour — reaching the whole cluster in a logarithmic number of rounds.`,
        `The cost per node is now <b>constant</b>, so total traffic is O(N), not O(N²). The same information propagates; nobody has to talk to everybody.`,
      ],
      callout: { kind: 'insight', text: 'Gossip trades instant, direct knowledge for cheap, eventually-complete knowledge — and that trade is what lets membership scale.' },
      changes: ['+ ping a few random peers', '+ piggyback membership updates', '~ O(N²) → O(N) messages'],
      metrics: { nodes2: 5, rtt: 8, suspected: 0, messages: 5 },
      scene: { view: 'gossip', note: 'Each node pings a few random peers and gossips what it knows — O(N) and scalable.' },
    },
    { // 4 — TECHNIQUE
      chapter: 'technique', short: 'Indirect',
      title: 'Ask a friend before you bury it',
      body: [
        `A single missed beat is weak evidence — packets drop, GC pauses happen. Before declaring a silent node dead, SWIM uses an <span class="term">indirect probe</span>: node A asks a few other peers to ping the silent node C on its behalf.`,
        `If <em>any</em> of them reaches C, then C is alive and A simply lost a packet — no eviction, no flapping. Only when the direct ping <b>and</b> the indirect probes all fail does C get marked as failed.`,
      ],
      callout: { kind: 'tip', text: 'One lost heartbeat is a maybe, not a death. Indirect probes turn a shaky single data point into a cluster-wide second opinion.' },
      changes: ['+ A can’t reach C → ask B to probe C', '+ any success → C is alive', '− fewer false positives'],
      metrics: { nodes2: 5, rtt: 12, suspected: 0, messages: 7 },
      scene: { view: 'indirect', note: 'A can’t reach C, so it asks B to probe C — a reply means a lost packet, not a death.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'Liveness, cheaply and honestly',
      body: [
        `Heartbeats turn “is it alive?” into a signal a <span class="term">failure detector</span> can act on: beat on an interval, suspect on silence past a timeout.`,
        `Tune the interval to your tolerance for undetected death; use <b>gossip</b> so the traffic stays O(N) as the cluster grows; and use <b>indirect probes</b> so a lost packet never gets a healthy node evicted. Detection that is fast, scalable, and not trigger-happy.`,
      ],
      callout: { kind: 'insight', text: 'Beat · time out · gossip · probe indirectly. The four moves that make liveness both scalable and trustworthy.' },
      metrics: { nodes2: 5, rtt: 10, suspected: 0, messages: 5 },
      scene: { view: 'recap', note: 'Interval + gossip + indirect probes = fast, scalable, false-alarm-resistant detection.' },
    },
  ],
};
