import { createModuleShell, createIQSection } from '../components/module-shell.js';

const IQ = [
  {
    q: 'When would you choose Amazon Kinesis over Kafka?',
    a: 'Kinesis is the right call when: (1) You are 100% AWS and want zero operational overhead — Kinesis is fully managed, no clusters to run. (2) You need deep native AWS integration (Lambda triggers, Firehose to S3/Redshift, native CloudWatch metrics). (3) Your retention needs are short (max 7 days on Kinesis, vs configurable-forever on Kafka). (4) Message size is under 1MB per record. Choose Kafka when: throughput exceeds 1GB/s per shard limit, you need replay beyond 7 days, cross-cloud portability, or Kafka Streams / Schema Registry are required.',
    tip: 'Kinesis shards = 1MB/s write, 2MB/s read each. Partition = 1MB/s write (typically). For the same throughput, Kafka usually requires fewer "units" and has no per-shard cost — but you pay for cluster EC2/EBS.'
  },
  {
    q: 'What are the key architectural differences between Kafka and Apache Pulsar?',
    a: 'Pulsar separates storage from compute: brokers are stateless (just routing) and Bookkeeper nodes (BookKeeper cluster) store data. This enables instant broker scaling without data rebalancing — add a broker, it immediately serves traffic. Kafka brokers are stateful — they own partition data, so adding a broker requires partition reassignment. Pulsar has native multi-tenancy (namespaces, tenant quotas) built in. Kafka achieves multi-tenancy via ACLs and quotas but not as first-class. Pulsar supports both pub/sub (topics) and queue semantics (shared subscriptions) natively. Pulsar geo-replication is built-in; Kafka needs MirrorMaker 2.',
    tip: 'Pulsar is architecturally more cloud-native (stateless brokers). Kafka is operationally simpler and has a much larger ecosystem. Neither is universally better — Kafka wins on ecosystem; Pulsar wins on elastic scaling.'
  },
  {
    q: 'How does Google Pub/Sub differ from Kafka in terms of consumer model?',
    a: 'Pub/Sub is a push-based managed service: Google pushes messages to subscribers (HTTP endpoint or Cloud Function). No offset concept — messages are ACKed individually within the ack deadline (default 10s, max 600s). Multiple subscriptions = fan-out (each subscription gets every message). Pub/Sub does not guarantee ordering without "ordering keys" enabled (and even then, only per-key). Kafka is pull-based: consumers control rate, seek to any offset, replay freely. Pub/Sub has no replay (once ACKed, gone). Pub/Sub scales automatically; Kafka requires partition planning. Pub/Sub message retention: 7 days max.',
    tip: 'Key interview contrast: "Kafka is a durable distributed log; Pub/Sub is a managed notification bus." Pull vs push is the most important operational difference.'
  },
  {
    q: 'Why might you keep RabbitMQ alongside Kafka rather than replacing it?',
    a: 'RabbitMQ excels at: (1) Complex routing — exchanges (direct, topic, fanout, headers) with flexible binding rules that Kafka cannot express natively. (2) Per-message TTL and priority queues — Kafka has no priority semantics. (3) Task queues where you want competing consumers and exactly-one processing (the queue model). (4) Very low latency for short-lived RPC-style messages (sub-millisecond). Kafka is not suited for: routing based on message content, task-queue patterns where messages should be deleted on ACK, or scenarios where you never need replay. Many production systems use both: Kafka for event streams, RabbitMQ for inter-service RPC and task queues.',
    tip: 'Say: "RabbitMQ is a message broker; Kafka is a distributed log. They solve different problems." This framing prevents the interviewer from thinking it is a direct replacement.'
  },
];

const COMPARISON = [
  { dim: 'Model',           kafka: 'Distributed log (pull)',          kinesis: 'Managed log (pull)',           pubsub: 'Push-based bus',               pulsar: 'Log (stateless brokers)',      rabbit: 'Message broker (push/pull)' },
  { dim: 'Retention',       kafka: 'Configurable (forever)',          kinesis: 'Max 7 days',                  pubsub: 'Max 7 days',                   pulsar: 'Configurable (forever)',       rabbit: 'Until consumed' },
  { dim: 'Throughput',      kafka: '2M+ msg/s per broker',           kinesis: '1MB/s per shard',             pubsub: 'Auto-scale',                   pulsar: '2M+ msg/s (similar)',         rabbit: '~50k msg/s (cluster)' },
  { dim: 'Replay',          kafka: '✅ Native (seek to offset)',      kinesis: '✅ Within 7 days',            pubsub: '❌ ACKed = gone',              pulsar: '✅ Native',                    rabbit: '❌ No' },
  { dim: 'Ordering',        kafka: 'Per partition (strict)',          kinesis: 'Per shard (strict)',           pubsub: 'Per key (opt-in)',             pulsar: 'Per partition (strict)',       rabbit: 'Per queue (FIFO)' },
  { dim: 'Broker scaling',  kafka: 'Requires partition reassign',     kinesis: 'Add shard (slow, costly)',    pubsub: 'Automatic',                    pulsar: 'Instant (stateless)',          rabbit: 'Complex HA setup' },
  { dim: 'Ops overhead',    kafka: 'Medium (KRaft helps)',           kinesis: 'None (fully managed)',        pubsub: 'None (fully managed)',         pulsar: 'High (Kafka + BookKeeper)',    rabbit: 'Medium' },
  { dim: 'Geo-replication', kafka: 'MirrorMaker 2 (manual)',         kinesis: 'Cross-region (limited)',      pubsub: 'Built-in global',              pulsar: 'Built-in native',             rabbit: 'Shovel plugin' },
  { dim: 'Schema support',  kafka: 'Schema Registry (Avro/Protobuf)',kinesis: 'AWS Glue Schema Registry',   pubsub: 'Basic (JSON validation)',      pulsar: 'Built-in schema registry',    rabbit: 'None native' },
  { dim: 'Stream DSL',      kafka: 'Kafka Streams, Flink, Spark',    kinesis: 'KDA (Flink managed)',        pubsub: 'Dataflow (Apache Beam)',       pulsar: 'Pulsar Functions',            rabbit: 'None' },
  { dim: 'Best for',        kafka: 'Event streaming platform',       kinesis: 'AWS-native pipelines',       pubsub: 'Serverless event bus',         pulsar: 'Multi-tenant cloud-native',   rabbit: 'Task queues, RPC' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M20 · Ecosystem',
    title: 'Kafka vs Competitors',
    subtitle: 'Kinesis, Google Pub/Sub, Apache Pulsar, RabbitMQ — when to use which',
    tabs: [
      { id: 'matrix',  label: '📊 Comparison Matrix' },
      { id: 'when',    label: '🗺️ When to Use What' },
      { id: 'iq',      label: '🎯 Interview Q&A' },
    ]
  });

  buildMatrix(container);
  buildWhen(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return null;
}

function buildMatrix(container) {
  const tab = container.querySelector('#tab-matrix');
  const COLS = [
    { key: 'kafka',  label: '🟠 Kafka',         color: '#FF6900' },
    { key: 'kinesis',label: '🟡 Kinesis',        color: '#FF9900' },
    { key: 'pubsub', label: '🔵 Google Pub/Sub', color: '#4285F4' },
    { key: 'pulsar', label: '🟣 Pulsar',         color: '#8B5CF6' },
    { key: 'rabbit', label: '🔴 RabbitMQ',       color: '#EF4444' },
  ];

  tab.innerHTML = `
    <div class="compare-table-wrap">
      <div class="section-header">
        <div class="section-title">Head-to-Head Feature Matrix</div>
        <div class="section-desc">Green = strength · Red = weakness · Compare across the dimensions interviewers test</div>
      </div>
      <table class="compare-table" style="font-size:11px">
        <thead>
          <tr>
            <th>Dimension</th>
            ${COLS.map(c => `<th style="color:${c.color}">${c.label}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${COMPARISON.map(row => `
            <tr>
              <td style="font-weight:700;color:var(--text);white-space:nowrap">${row.dim}</td>
              ${COLS.map(c => {
                const val = row[c.key];
                const isGood = val.startsWith('✅') || val.includes('Native') || val.includes('Configurable') || val.includes('2M+') || val.includes('Built-in');
                const isBad  = val.startsWith('❌') || val.includes('Max 7') || val.includes('Until consumed') || val.includes('None') || val.includes('complex');
                return `<td style="${isGood ? 'color:var(--green)' : isBad ? 'color:var(--red)' : 'color:var(--text2)'}">${val}</td>`;
              }).join('')}
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function buildWhen(container) {
  const tab = container.querySelector('#tab-when');
  const cards = [
    {
      name: 'Apache Kafka', icon: '🟠', color: '#FF6900',
      use: ['High-throughput event streaming (>100k msg/s)', 'Long-term replay and audit trail required', 'Multi-consumer groups on same data', 'Kafka Streams or Flink processing', 'Cross-cloud or hybrid cloud portability', 'Schema Registry + Avro for strict contracts'],
      avoid: ['Fully serverless AWS stack with no ops team', 'Message routing by content (use RabbitMQ)','Per-message TTL or priority queues', 'Sub-millisecond RPC-style messaging']
    },
    {
      name: 'Amazon Kinesis', icon: '🟡', color: '#FF9900',
      use: ['100% AWS, zero-ops requirement', 'Native Lambda triggers on each record', 'Firehose to S3/Redshift without code', 'CloudWatch metrics out of the box', 'Retention under 7 days is acceptable'],
      avoid: ['Cross-cloud or on-premise deployments', 'Throughput requiring > hundreds of shards (cost)', 'Replay beyond 7 days', 'Complex stream processing (limited KDA)']
    },
    {
      name: 'Google Pub/Sub', icon: '🔵', color: '#4285F4',
      use: ['Serverless event fan-out on GCP', 'Push delivery to Cloud Functions / HTTP', 'Global topics with automatic geo-distribution', 'No ordering requirement (or simple per-key)'],
      avoid: ['Replay of historical events', 'Strict per-partition ordering at scale', 'Consumer-controlled rate (pull is possible but push-native)', 'Complex stream joins or aggregations']
    },
    {
      name: 'Apache Pulsar', icon: '🟣', color: '#8B5CF6',
      use: ['Multi-tenant SaaS platform needing hard isolation', 'Elastic broker scaling without data movement', 'Built-in geo-replication across data centers', 'Mixed queue + stream semantics in one system'],
      avoid: ['Teams already on Kafka (migration cost high)', 'Small teams — BookKeeper adds ops complexity', 'Ecosystem maturity (Kafka Connect has 200+ connectors; Pulsar has fewer)']
    },
    {
      name: 'RabbitMQ', icon: '🔴', color: '#EF4444',
      use: ['Task queues: work distributed across competing consumers', 'Complex routing: route by header, pattern, priority', 'Per-message TTL (expire unprocessed messages)', 'Low-latency RPC-style request-reply patterns'],
      avoid: ['Event sourcing or replay — RabbitMQ deletes on ACK', 'High-throughput streams (>50k msg/s per queue)', 'Fan-out to many independent consumer groups', 'Stream processing (no DSL, no stateful aggregations)']
    },
  ];

  tab.innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">Decision Guide — Use When / Avoid When</div>
        <div class="section-desc">Based on real Amazon, Netflix, LinkedIn, and Uber architecture decisions</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:16px">
        ${cards.map(c => `
          <div style="background:var(--bg2);border:1px solid ${c.color};border-radius:12px;overflow:hidden">
            <div style="padding:12px 20px;background:${c.color}22;font-size:13px;font-weight:700;color:${c.color}">${c.icon} ${c.name}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
              <div style="padding:14px 20px;border-right:1px solid var(--border)">
                <div style="font-size:11px;font-weight:700;color:var(--green);margin-bottom:8px">✅ Use when</div>
                ${c.use.map(u => `<div style="font-size:11px;color:var(--text2);margin-bottom:5px;padding-left:12px;position:relative"><span style="position:absolute;left:0;color:var(--green)">•</span>${u}</div>`).join('')}
              </div>
              <div style="padding:14px 20px">
                <div style="font-size:11px;font-weight:700;color:var(--red);margin-bottom:8px">❌ Avoid when</div>
                ${c.avoid.map(a => `<div style="font-size:11px;color:var(--text2);margin-bottom:5px;padding-left:12px;position:relative"><span style="position:absolute;left:0;color:var(--red)">•</span>${a}</div>`).join('')}
              </div>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}
