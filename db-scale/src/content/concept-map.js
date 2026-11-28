/* content/concept-map.js — the "Concept Map" Mastery & Review lesson, as DATA.
   A map of how the eight areas of the course connect: which topics build on
   which. Each step highlights one cluster and the dependencies that feed into
   it. Same step shape as every other db-scale lesson, but with no per-step
   metrics (this is a review, not a simulation). `scene` is a view-snapshot
   consumed by db/concept-map-scene.js. */

export const conceptMapLesson = {
  id: 'concept-map',
  title: 'Concept Map',
  group: 'Mastery & Review',
  summary: 'See the whole course as one connected map: Foundations under Storage and Query Processing, Transactions over both, and Distribution and Consensus on top — with the arrows that say what depends on what.',
  minutes: 8,
  level: 'intermediate',
  metrics: [],
  goals: [
    { text: 'The eight areas of the course as one connected map', step: 0 },
    { text: 'Foundations: the data model everything else assumes', step: 1 },
    { text: 'Storage engines build on pages, B+trees and the WAL', step: 2 },
    { text: 'Query processing sits on top of storage', step: 3 },
    { text: 'Transactions tie storage, logging and concurrency together', step: 4 },
    { text: 'Distribution and consensus layer over a single node', step: 5 },
  ],

  steps: [
    { // 0 — SETUP / overview
      chapter: 'setup', short: 'The map',
      title: 'The whole course, connected',
      body: [
        `The course is eight areas, and they are not a flat list — they <b>stack</b>. <span class="term">Foundations</span> (the relational model, SQL) sit at the base. <span class="term">Storage Engines</span> and <span class="term">Query Processing</span> build on them. <span class="term">Transactions &amp; Concurrency</span> sit over storage; <span class="term">Replication</span>, <span class="term">Consistency &amp; Consensus</span> and <span class="term">Data-Intensive Systems</span> layer on top. The <span class="term">Labs</span> cut across them all.`,
        `Every arrow in this map means “depends on”. Reading them tells you why the topics came in the order they did — and what you must understand before a given idea makes sense.`,
      ],
      callout: { kind: 'insight', text: 'The areas form a dependency graph, not a checklist: higher topics assume the lower ones. Indexes need pages; distributed transactions need both transactions and consensus.' },
      scene: { view: 'overview', note: 'Eight areas as a connected map — each arrow means “builds on”.' },
    },
    { // 1 — FOUNDATIONS
      chapter: 'technique', short: 'Foundations',
      title: 'Foundations: the model underneath',
      body: [
        `At the base is the <span class="term">relational model</span> — tables, rows, keys — and <b>SQL</b>, the declarative language over it. You say <em>what</em> you want; the system decides <em>how</em>.`,
        `Everything above depends on this. A query optimizer only has freedom <em>because</em> SQL is declarative; constraints and keys are what transactions protect. Get the model wrong and no amount of clever storage saves you.`,
      ],
      callout: { kind: 'tip', text: 'Declarative SQL over the relational model is the contract. It is what lets the storage and query layers choose their own strategies without the application knowing.' },
      scene: { view: 'foundations', note: 'Relational model + SQL — the declarative base every other area assumes.' },
    },
    { // 2 — STORAGE
      chapter: 'technique', short: 'Storage',
      title: 'Storage engines: pages up to indexes',
      body: [
        `The <span class="term">storage engine</span> is a tower of its own. <b>Pages</b> on disk hold rows; the <b>buffer pool</b> caches hot pages in RAM; <b>B+trees</b> and <b>LSM-trees</b> organize them into indexes; the <b>WAL</b> makes changes durable.`,
        `Each layer leans on the one below: an index is just a disciplined arrangement of pages, and the buffer pool is what makes random page access affordable. This is the floor the query engine runs on.`,
      ],
      callout: { kind: 'insight', text: 'Indexes build on pages and the buffer pool; the WAL turns in-memory changes into durable ones. The storage engine is where abstract rows meet real disks.' },
      scene: { view: 'storage', note: 'Pages → buffer pool → B+tree / LSM indexes → WAL. The storage tower.' },
    },
    { // 3 — QUERY
      chapter: 'technique', short: 'Query',
      title: 'Query processing: compile, then run',
      body: [
        `<span class="term">Query Processing</span> turns SQL into work the storage engine can do: <b>parse</b> → <b>logical plan</b> → <b>cost-based optimizer</b> → <b>physical plan</b> → <b>execution operators</b>.`,
        `It sits directly on storage: the optimizer prices plans using statistics about the <em>pages and indexes</em> below, and the executor’s scans and joins read through the <em>buffer pool</em>. Change the storage layout and the best plan changes with it.`,
      ],
      callout: { kind: 'tip', text: 'The optimizer and executor only make sense on top of storage: costs come from page and index statistics, and every operator reads through the buffer pool.' },
      scene: { view: 'query', note: 'Parse → plan → optimize → execute — query processing riding on storage.' },
    },
    { // 4 — TRANSACTIONS
      chapter: 'technique', short: 'Transactions',
      title: 'Transactions tie it together',
      body: [
        `<span class="term">Transactions &amp; Concurrency</span> is where several strands meet. <b>ACID</b> leans on the <b>WAL</b> for durability and recovery; <b>isolation</b> is enforced by <b>locking</b> or <b>MVCC</b> over the same pages the executor reads; <b>deadlock detection</b> keeps concurrent locks honest.`,
        `So this area depends on <em>both</em> storage (the log, the pages) and query processing (the operations being isolated). It is the knot that binds a single node into a correct whole.`,
      ],
      callout: { kind: 'insight', text: 'Transactions need storage (WAL, pages) and query processing (the operations to isolate) at once. ACID is not a separate feature — it is a property woven through both.' },
      scene: { view: 'transactions', note: 'ACID over WAL + isolation over pages — transactions binding storage and queries.' },
    },
    { // 5 — DISTRIBUTED
      chapter: 'tradeoff', short: 'Distributed',
      title: 'Distribution layers on top',
      body: [
        `Scale out and three more areas appear. <span class="term">Replication</span> copies the <b>WAL</b> to other nodes; <span class="term">Partitioning</span> splits the data; <span class="term">Consistency &amp; Consensus</span> (quorums, Raft) decides what all those copies agree on under the <b>CAP</b> trade-off.`,
        `These sit on <em>everything</em> below: a distributed transaction needs single-node transactions <b>and</b> consensus; eventual consistency is a choice about replication. The hardest topics are hard precisely because they combine the earlier ones.`,
      ],
      callout: { kind: 'tip', text: 'Distribution reuses the single-node machine: replication ships the WAL, distributed transactions compose local transactions with consensus. Nothing here replaces the lower layers — it coordinates copies of them.' },
      scene: { view: 'distributed', note: 'Replication, partitioning and consensus — coordinating many copies of the node.' },
    },
    { // 6 — RECAP
      chapter: 'recap', short: 'Recap',
      title: 'One map, many lessons',
      body: [
        `Read bottom to top: <b>model → storage → queries → transactions → distribution → consensus</b>, with the Labs stitching them into running systems. Each layer assumes the ones beneath it, which is exactly the order you learned them.`,
        `When a new system or paper lands on your desk, place it on this map. Knowing <em>which layer</em> an idea lives in — and what it depends on — is most of understanding it.`,
      ],
      callout: { kind: 'insight', text: 'The whole field is this dependency graph. New ideas are rarely new layers; they are new choices within a layer you already know. Locate them on the map and they stop being mysterious.' },
      scene: { view: 'recap', note: 'Model → storage → queries → transactions → distribution — the course as one stack.' },
    },
  ],
};
