/* content/distributed-overview.js — "Distributed DB", the section-05 overview,
   as DATA. Same shape as content/dbms.js. Rendered through the shared course
   shell; the scene snapshots are consumed by db/distributed-overview-scene.js. */

export const distributedOverviewLesson = {
  id: 'distributed-overview',
  title: 'Distributed DB',
  group: 'Distributed Systems',
  summary: 'The big picture of this section: one logical database spread across many machines — partitioned for scale, replicated for survival, and paid for in coordination.',
  minutes: 7,
  level: 'intermediate',
  metrics: ['nodes2', 'replicas', 'partitions', 'availability'],
  legend: ['read', 'write'],
  goals: [
    { text: 'Why one machine eventually becomes the ceiling', step: 0 },
    { text: 'A cluster as one logical DB: partitioned + replicated', step: 1 },
    { text: 'Scaling out horizontally instead of up', step: 2 },
    { text: 'Surviving node failure with replicas', step: 3 },
    { text: 'The bargain: scale & availability vs coordination', step: 4 },
  ],

  steps: [
    { // 0 — PROBLEM
      chapter: 'problem', short: 'One node',
      title: 'One machine is a ceiling',
      body: [
        `Everything so far — storage, indexes, transactions — has lived on a <span class="term">single node</span>. That is wonderfully simple: one clock, one memory, one source of truth. But it has a hard edge.`,
        `A single machine has a fixed amount of CPU, RAM and disk. When your data or traffic outgrows it, there is nothing left to turn up — and if that one box dies, the <em>entire</em> database goes with it. Simplicity bought with a single point of failure.`,
      ],
      callout: { kind: 'warn', text: 'Scale-up has a wall and a single point of failure: one machine can only get so big, and when it falls, everything stops.' },
      metrics: { nodes2: 1, replicas: 1, partitions: 1, availability: 99.0 },
      scene: { view: 'single', note: 'One node holds the whole database — bounded by one machine, and fragile.' },
    },
    { // 1 — SOLUTION
      chapter: 'solution', short: 'A cluster',
      title: 'Many machines, one database',
      body: [
        `A <span class="term">distributed database</span> spreads the data across a <b>cluster</b> of nodes, yet still presents <em>one</em> logical database to the client. Two moves make that work.`,
        `<b>Partitioning</b> splits the dataset into slices so no single node holds it all — that buys capacity. <b>Replication</b> keeps copies of each slice on more than one node — that buys durability and availability. Every later lesson in this section is a zoom-in on one of these two ideas, or on keeping the copies in agreement.`,
      ],
      callout: { kind: 'insight', text: 'Partition for capacity, replicate for survival. A distributed DB is those two ideas, plus the coordination that keeps them honest.' },
      changes: ['+ data partitioned across nodes', '+ each slice replicated', '~ clients still see one DB'],
      metrics: { nodes2: 5, replicas: 3, partitions: 5, availability: 99.9 },
      scene: { view: 'cluster', note: 'Five nodes present one logical DB — partitioned for capacity, replicated for durability.' },
    },
    { // 2 — HOW IT WORKS
      chapter: 'technique', short: 'Scale out',
      title: 'Scale out, not up',
      body: [
        `Because the work is already split across nodes, growth is a matter of <span class="term">adding machines</span> rather than buying a bigger one. Need more capacity or throughput? Add nodes, rebalance the partitions onto them, and the ceiling moves.`,
        `This <b>horizontal scaling</b> grows roughly in step with the node count — commodity machines instead of one ever-more-expensive giant, and no hard wall to slam into.`,
      ],
      callout: { kind: 'tip', text: 'Horizontal scale: capacity and throughput track the number of nodes. You grow by adding cheap machines, not by replacing one with a bigger box.' },
      changes: ['+ 2 nodes added', '~ partitions rebalanced', '+ throughput rises'],
      metrics: { nodes2: 7, replicas: 3, partitions: 7, availability: 99.95 },
      scene: { view: 'scale', note: 'Add nodes → more capacity and throughput; the cluster grows sideways.' },
    },
    { // 3 — HOW IT WORKS
      chapter: 'technique', short: 'Fault tolerance',
      title: 'A node dies; the DB does not',
      body: [
        `Replication is what turns many fragile machines into one resilient service. When a node fails, the partitions it held are still alive on their <span class="term">replicas</span>, so the cluster simply routes around the gap and keeps answering.`,
        `There is no longer a single point of failure: any one machine can crash, reboot, or be replaced while the database as a whole stays up. Availability becomes a property of the <em>cluster</em>, not of any one box.`,
      ],
      callout: { kind: 'insight', text: 'Replicas remove the single point of failure. A node can die mid-request and the cluster serves the same data from a copy.' },
      changes: ['~ one node down', '+ replica serves its partitions', '+ cluster stays available'],
      metrics: { nodes2: 6, replicas: 3, partitions: 7, availability: 99.95 },
      scene: { view: 'fault', note: 'A node fails; its partitions are served from replicas — the cluster keeps answering.' },
    },
    { // 4 — TRADE-OFF
      chapter: 'tradeoff', short: 'The bargain',
      title: 'Nothing is free',
      body: [
        `Distribution buys real things: scale beyond one machine, availability through failures, and the option to put data near users. But it is a bargain, not a gift.`,
        `Nodes now talk over an unreliable <b>network</b>; keeping replicas in agreement makes <span class="term">consistency</span> something you must actively choose; <b>partial failure</b> — some nodes up, some down, some merely slow — becomes the normal case; and the whole thing is far harder to reason about and operate. The rest of this section is really about managing that bill.`,
      ],
      callout: { kind: 'warn', text: 'You trade a simple, consistent single box for a scalable, available cluster — and inherit the network, consistency choices, and partial failure that come with it.' },
      metrics: { nodes2: 6, replicas: 3, partitions: 7, availability: 99.95 },
      scene: { view: 'tradeoff', note: 'What a distributed DB gives you, and what it charges in return.' },
    },
    { // 5 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'The map for this section',
      body: [
        `A distributed database is one logical system running on many machines: <b>partition</b> the data for scale, <b>replicate</b> it for availability, and <b>coordinate</b> the copies for as much consistency as you need — paying in complexity for all of it.`,
        `From here the section drills into each piece: replication and quorums, partitioning and sharding, consistent hashing, the CAP trade-off, and the consensus protocols (two-phase commit, Raft) that keep distributed nodes agreeing on one truth.`,
      ],
      callout: { kind: 'insight', text: 'Partition · Replicate · Coordinate. Hold these three in mind — every lesson ahead is a deep dive into one of them.' },
      metrics: { nodes2: 6, replicas: 3, partitions: 7, availability: 99.99 },
      scene: { view: 'recap', note: 'One logical DB across many machines — partition, replicate, coordinate.' },
    },
  ],
};
