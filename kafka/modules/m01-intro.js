import { createModuleShell, createIQSection } from '../components/module-shell.js';

const TIMELINE = [
  { year: '2010', company: 'LinkedIn', title: 'The Problem', color: '#0077B5',
    icon: '🔗',
    body: 'LinkedIn is drowning in data. Each service polls every other service for updates. 900+ servers, 3,000+ metrics each — impossible to track in real time. Engineers Jay Kreps, Neha Narkhede, and Jun Rao start designing a new system.' },
  { year: '2011', company: 'Open Source', title: 'Apache Kafka Born', color: '#FF6900',
    icon: '🐣',
    body: 'LinkedIn open-sources Kafka under Apache. Named after Franz Kafka — the system was designed for writing. Initial benchmarks show 2 million writes/sec on a single commodity machine, outperforming ActiveMQ by 100×.' },
  { year: '2012', company: 'Apache', title: 'Apache Top-Level Project', color: '#D22128',
    icon: '🦅',
    body: 'Kafka graduates to an Apache Top-Level Project. Companies like Twitter and Netflix begin adopting it at scale. Kafka proves the pub/sub model can handle internet-scale event streams with durable replay.' },
  { year: '2014', company: 'Confluent', title: 'Confluent Founded', color: '#172B4D',
    icon: '🏢',
    body: 'Kreps, Narkhede, and Rao leave LinkedIn to found Confluent — building a commercial platform on top of Kafka. They introduce the Schema Registry and REST Proxy, making Kafka accessible beyond JVM teams.' },
  { year: '2015', company: 'Industry', title: 'Kafka Streams & Connect', color: '#6366F1',
    icon: '🌊',
    body: 'Kafka 0.9 ships Kafka Connect (simple connectors for databases, S3, HDFS). Kafka Streams follows in 0.10 — enabling stateful stream processing directly in the broker without Spark or Flink.' },
  { year: '2017', company: 'Amazon', title: 'Amazon All-In', color: '#FF9900',
    icon: '🛒',
    body: 'Amazon begins deploying Kafka at massive scale across Prime, Alexa, and order fulfillment. By 2017, Amazon processes billions of events/day: order placement → inventory → payment → fulfillment, all flowing through Kafka.' },
  { year: '2019', company: 'Community', title: 'KIP-500: Remove ZooKeeper', color: '#10B981',
    icon: '🔑',
    body: 'Kafka Improvement Proposal 500 proposes removing ZooKeeper dependency. The Raft-based metadata quorum (KRaft) will let Kafka manage its own metadata — simpler operations, faster controller failover, and support for millions of partitions.' },
  { year: '2022', company: 'Apache', title: 'KRaft GA (Kafka 3.3)', color: '#8B5CF6',
    icon: '🚀',
    body: 'KRaft mode goes GA in Kafka 3.3. ZooKeeper is officially deprecated. The new architecture achieves sub-second leader elections and supports 10× more partitions per cluster — a landmark moment for operational simplicity.' },
  { year: '2024', company: 'Industry', title: 'Kafka Everywhere', color: '#EF4444',
    icon: '🌍',
    body: 'Over 80% of Fortune 100 companies run Kafka. 7+ million active users. Confluent Cloud spans all major clouds. Apache Flink + Kafka becomes the dominant real-time analytics stack, powering everything from fraud detection to LLM pipelines.' },
];

const IQ = [
  {
    q: 'Why did LinkedIn build Kafka instead of using existing message queues like ActiveMQ or RabbitMQ?',
    a: 'Existing queues delete messages after delivery, which prevents replay and auditing. LinkedIn needed durable, replayable, high-throughput event storage. Kafka treats the log as a first-class citizen — messages persist for days/weeks, consumers maintain their own offset, and throughput scales linearly with brokers. ActiveMQ at LinkedIn could handle ~10k msgs/sec; Kafka hit 2M+/sec on the same hardware.',
    tip: 'Frame Kafka as a distributed commit log, not a traditional queue. That framing explains why replay, retention, and ordering matter.'
  },
  {
    q: 'What is the difference between Kafka and a traditional message queue in terms of consumer semantics?',
    a: 'A traditional queue is destructive — once a message is consumed, it is gone. Kafka retains messages for a configurable period. Multiple independent consumer groups can each read the same topic from any offset, enabling fan-out without message loss. A queue scales consumer parallelism by adding consumers (which share messages); Kafka scales by adding partitions (each consumer in a group owns one or more partitions exclusively).',
    tip: 'Say "Kafka is a pull-based, log-structured commit log" — then explain why pull is better for backpressure than push.'
  },
  {
    q: 'What problem does KRaft solve and why does it matter at scale?',
    a: 'ZooKeeper was an external dependency for cluster metadata (broker registration, topic/partition state, leader election). It had a hard scaling limit of ~200k partitions per cluster and required separate operational expertise. KRaft moves metadata management into Kafka itself using a Raft-based quorum. Benefits: sub-second controller failover (vs 30–60s), support for millions of partitions, simpler deployment (no separate ZK cluster), and the ability to take metadata snapshots for fast recovery.',
    tip: 'Mention the KRaft controller quorum: 3-node quorum of controllers, each with a full copy of the metadata log — just like Raft in etcd.'
  },
  {
    q: 'How does Kafka achieve 2M+ writes per second on commodity hardware?',
    a: 'Four key techniques: (1) Sequential disk I/O — Kafka only appends to log segments, which is 6× faster than random writes. (2) Zero-copy transfer — sendfile() syscall skips user-space buffer, sending data from page cache directly to NIC. (3) Batching — producers batch messages before sending; brokers batch before writing; consumers batch before processing. (4) Compression — LZ4/Snappy reduces network bandwidth per message by 3–5×. Together these make the bottleneck network bandwidth, not CPU or disk.',
    tip: 'The "sequential I/O + zero-copy + batching" triple is a classic interview answer for Kafka throughput questions.'
  },
  {
    q: 'What is the role of the Schema Registry and why is it essential in a Kafka-based data platform?',
    a: 'Without a Schema Registry, consumers must negotiate data format out-of-band. As schemas evolve, broken consumers are a production incident. The Schema Registry stores Avro/Protobuf/JSON Schema definitions and enforces compatibility modes (BACKWARD, FORWARD, FULL). Producers register schemas before writing; consumers fetch the schema by ID embedded in each message header. This decouples schema evolution from deployment, enables data lineage, and powers CDC pipelines safely.',
    tip: 'Mention that the magic byte (0x00) + 4-byte schema ID prefix is the Confluent wire format — shows you understand the actual encoding.'
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M01 · Foundation',
    title: 'Why Kafka?',
    subtitle: 'From LinkedIn logs to the backbone of Amazon Prime — the distributed log that changed data engineering',
    tabs: [
      { id: 'timeline', label: '📜 Timeline' },
      { id: 'compare',  label: '⚡ Kafka vs Queue' },
      { id: 'impact',   label: '🏆 By the Numbers' },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ]
  });

  buildTimeline(container);
  buildCompare(container);
  buildImpact(container);

  const iqTab = container.querySelector('#tab-iq');
  if (iqTab) iqTab.innerHTML = `<div class="section-header" style="padding:32px 40px 0">${'<div class="section-title">Interview Questions</div><div class="section-desc">Senior Data Engineering level (4–8 years experience)</div>'}</div>` + createIQSection(IQ).replace('<div class="section-header">', '<div class="section-header" style="display:none">');

  return null;
}

// ── Timeline Tab ───────────────────────────────────────────────────────────
function buildTimeline(container) {
  const tab = container.querySelector('#tab-timeline');
  if (!tab) return;

  tab.innerHTML = `
    <div class="scroll-content">
      <div class="timeline-outer" id="kf-timeline"></div>
    </div>`;

  const wrap = tab.querySelector('#kf-timeline');
  if (!wrap) return;

  let html = `<div style="position:relative;padding:20px 0 40px;">`;

  // Central spine
  html += `<div style="position:absolute;left:96px;top:0;bottom:0;width:2px;background:linear-gradient(180deg,transparent,var(--border) 8%,var(--border) 92%,transparent);"></div>`;

  TIMELINE.forEach((ev, i) => {
    const right = i % 2 === 0;
    html += `
      <div style="display:flex;align-items:flex-start;gap:16px;margin-bottom:36px;position:relative;">
        <!-- Year badge -->
        <div style="width:80px;flex-shrink:0;text-align:right;">
          <span style="font-size:12px;font-weight:800;color:${ev.color};background:${ev.color}22;border-radius:6px;padding:3px 8px;">${ev.year}</span>
        </div>

        <!-- Node on spine -->
        <div style="position:relative;flex-shrink:0;display:flex;flex-direction:column;align-items:center;margin-top:2px;">
          <div style="width:28px;height:28px;border-radius:50%;background:${ev.color};display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 0 0 4px ${ev.color}33;z-index:1;">${ev.icon}</div>
        </div>

        <!-- Card -->
        <div class="info-card" style="flex:1;border-left:3px solid ${ev.color};max-width:560px;animation:fadeIn .4s ease ${i*0.07}s both;">
          <div style="font-size:10px;font-weight:700;color:${ev.color};letter-spacing:.5px;text-transform:uppercase;margin-bottom:4px;">${ev.company}</div>
          <div class="info-card-title" style="font-size:14px;margin-bottom:6px;">${ev.title}</div>
          <div class="info-card-body">${ev.body}</div>
        </div>
      </div>`;
  });

  html += `</div>`;
  wrap.innerHTML = html;
}

// ── Compare Tab ────────────────────────────────────────────────────────────
function buildCompare(container) {
  const tab = container.querySelector('#tab-compare');
  if (!tab) return;

  const rows = [
    ['Message retention', '❌ Deleted after ACK', '✅ Configurable (days–forever)'],
    ['Consumer replay', '❌ Not possible', '✅ Seek to any offset'],
    ['Fan-out', '⚠️ Requires queue copy per consumer', '✅ Multiple consumer groups, zero overhead'],
    ['Throughput', '~50k–100k msg/s (clustered)', '2M+ msg/s per broker'],
    ['Ordering', '⚠️ FIFO per queue, complex at scale', '✅ Strict ordering per partition'],
    ['Backpressure', '⚠️ Push-based, consumer overwhelm risk', '✅ Pull-based, consumer controls rate'],
    ['Disk I/O model', 'Random (per-message index)', 'Sequential append (6–10× faster)'],
    ['Consumer groups', '❌ Competing consumers only', '✅ Pub/sub + competing within group'],
    ['Schema evolution', '❌ Out-of-band', '✅ Schema Registry (Avro/Protobuf/JSON)'],
    ['Partitioning', '❌ Queue is single unit', '✅ N partitions = N-way parallelism'],
    ['Zero-copy I/O', '❌ User-space copy', '✅ sendfile() kernel bypass'],
    ['Operational model', 'Complex HA setup needed', 'Built-in replication, KRaft metadata'],
  ];

  tab.innerHTML = `
    <div class="compare-table-wrap">
      <div class="section-header"><div class="section-title">Kafka vs Traditional Message Queue</div><div class="section-desc">Why LinkedIn replaced JMS/ActiveMQ with a distributed log</div></div>
      <table class="compare-table">
        <thead>
          <tr>
            <th>Dimension</th>
            <th>Traditional Queue (RabbitMQ / ActiveMQ)</th>
            <th>Apache Kafka</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(([dim, q, k]) => `
            <tr>
              <td style="font-weight:600;color:var(--text)">${dim}</td>
              <td>${q}</td>
              <td style="color:var(--green)">${k}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>

    <div class="scroll-content">
      <div class="prose">
        <h3>The fundamental insight</h3>
        <p>Traditional queues are designed around the idea that messages are <strong>commands</strong> — consume it, delete it, done. Kafka treats messages as <strong>facts</strong> — events that happened in the world, which should be durable and replayable by anyone who needs them.</p>
        <p>This shift — from ephemeral command to durable fact — is what makes Kafka the backbone of event-driven architectures. A single stream of <code>order.placed</code> events can simultaneously feed fulfillment, fraud detection, analytics, notifications, and ML training pipelines — with zero coupling between them.</p>
        <h3>Amazon's use of this model</h3>
        <p>When a customer clicks "Buy Now" on Amazon, a single event flows into Kafka. From there: inventory service decrements stock, payment service charges the card, fulfillment assigns a warehouse, recommendations service updates the model, and fraud detection scores the transaction — all independently, in parallel, in real time. No service polls another. No queue needs cloning.</p>
      </div>
    </div>`;
}

// ── Impact Tab ─────────────────────────────────────────────────────────────
function buildImpact(container) {
  const tab = container.querySelector('#tab-impact');
  if (!tab) return;

  const stats = [
    { val: '80%', label: 'Fortune 100 use Kafka' },
    { val: '7M+', label: 'Active users worldwide' },
    { val: '2M+', label: 'Msgs/sec per broker' },
    { val: '1T+', label: 'Messages/day at LinkedIn' },
    { val: '<5ms', label: 'End-to-end latency (LAN)' },
    { val: '10K+', label: 'Production deployments' },
  ];

  const adopters = [
    { name: 'Amazon', role: 'Order pipeline, Prime Video, Alexa', color: '#FF9900' },
    { name: 'Netflix', role: 'Keystone pipeline — 700B events/day', color: '#E50914' },
    { name: 'Uber', role: 'Real-time pricing, trip lifecycle', color: '#000000' },
    { name: 'Airbnb', role: 'Search ranking, fraud, analytics', color: '#FF5A5F' },
    { name: 'Twitter/X', role: 'Timeline, ads, engagement metrics', color: '#1DA1F2' },
    { name: 'LinkedIn', role: 'Original creator — all core services', color: '#0077B5' },
    { name: 'Spotify', role: 'Playlist events, ML feature store', color: '#1DB954' },
    { name: 'Cloudflare', role: 'DNS query processing, threat intel', color: '#F38020' },
  ];

  tab.innerHTML = `
    <div class="stats-row" style="padding:32px 40px 0;">
      ${stats.map(s => `
        <div class="stat-box">
          <div class="stat-val">${s.val}</div>
          <div class="stat-label">${s.label}</div>
        </div>`).join('')}
    </div>
    <div class="info-grid">
      ${adopters.map(a => `
        <div class="info-card" style="border-left:3px solid ${a.color}">
          <div class="info-card-title">${a.name}</div>
          <div class="info-card-body">${a.role}</div>
        </div>`).join('')}
    </div>
    <div class="scroll-content">
      <div class="prose">
        <h3>Why Kafka won</h3>
        <p>Three properties made Kafka uniquely suited to internet-scale companies: <strong>durability</strong> (messages survive broker restarts), <strong>decoupling</strong> (producers and consumers never know about each other), and <strong>scalability</strong> (add partitions and brokers independently).</p>
        <p>The log abstraction is surprisingly universal — it models databases (CDC), microservices (event sourcing), ML pipelines (feature streams), operational monitoring (metrics), and user activity (clickstreams) all within the same system.</p>
      </div>
    </div>`;
}
