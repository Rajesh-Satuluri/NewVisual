import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { EventPacket } from '../components/canvas-primitives.js';

const IQ = [
  { q: 'What is Kafka Connect and how does it differ from writing a custom producer/consumer?', a: 'Kafka Connect is a framework for scalable, fault-tolerant data integration without writing Kafka client code. It provides: distributed execution (worker cluster), automatic offset management, schema inference, REST API for connector management, and 200+ pre-built connectors (JDBC, S3, Elasticsearch, Snowflake, Debezium). A custom producer/consumer gives more control but requires you to handle offset management, parallelism, restarts, and schema. Connect is preferred when a connector already exists for your system.', tip: 'Mention SMT (Single Message Transform) — lightweight record transformations applied inline (add field, mask PII, route by value) without a separate streaming job.' },
  { q: 'What is Debezium and how does it work?', a: 'Debezium is a Kafka Connect source connector for change data capture (CDC). It reads the database\'s replication log (MySQL binlog, PostgreSQL WAL, Oracle redo log) and publishes row-level changes (INSERT/UPDATE/DELETE) as Kafka events. Each record includes the before/after state of the row plus metadata (LSN, timestamp, tx ID). This enables event-driven architectures built on existing databases — no application code changes required. Amazon uses Debezium to stream RDS changes into Kafka for real-time sync to Elasticsearch and DynamoDB.', tip: 'Know: Debezium captures at the storage engine level — it\'s not polling. Changes appear in Kafka within milliseconds of commit. Deletes appear as tombstone records for compacted topics.' },
  { q: 'What is a dead-letter queue (DLQ) in Kafka Connect and when does a record land there?', a: 'When a connector fails to process a record (deserialization error, schema mismatch, transformation exception), it can route the bad record to a DLQ topic (configured via errors.deadletterqueue.topic.name). The record is written with headers containing the error details (exception class, message, original topic/partition/offset). Without a DLQ, any single bad record halts the entire connector. DLQs enable poison-pill tolerance: the pipeline continues, bad records are investigated separately.', tip: 'DLQ is not enabled by default — you must set errors.tolerance=all and configure the DLQ topic. Without it, the connector pauses on the first bad record.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M12 · Ecosystem',
    title: 'Kafka Connect',
    subtitle: 'Source & sink connectors, SMT, DLQ — streaming data in and out of Kafka',
    tabs: [
      { id: 'flow',  label: '🔌 Connect Flow' },
      { id: 'types', label: '📦 Connector Types' },
      { id: 'iq',    label: '🎯 Interview Q&A' },
    ]
  });

  let cleanup = buildFlow(container);
  buildTypes(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

function buildFlow(container) {
  const tab = container.querySelector('#tab-flow');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <canvas id="kc-canvas" width="820" height="360" style="width:100%;max-width:820px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="kc-cdc">▶ Run CDC Pipeline</button>
        <button class="ctrl-btn" id="kc-sink">▶ Run Sink Pipeline</button>
        <span class="ctrl-label">Amazon: RDS → Kafka → Elasticsearch + S3</span>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>The animation shows two Kafka Connect pipeline types. The <strong>CDC Source pipeline</strong> (Debezium) reads MySQL's binary replication log directly — every INSERT, UPDATE, and DELETE on the Amazon RDS orders table appears as a Kafka event within milliseconds, without any application code changes. Each event carries both the <strong>before</strong> and <strong>after</strong> row state, plus the transaction ID and log sequence number, making it a complete audit trail of every database change.</p>
      <p>Before each event reaches Kafka, it passes through the <strong>SMT (Single Message Transform) Pipeline</strong>. SMTs are lightweight stateless transforms applied inline inside the Connect worker: masking a credit card number, renaming a column to match a downstream schema, routing records to different topics based on a field value, or adding a processing timestamp. No external streaming job is needed for simple transformations — SMTs handle them for free at ingestion time.</p>
      <p>The <strong>Sink pipeline</strong> reads from Kafka and writes to Elasticsearch and S3 simultaneously — each is a separate connector consuming the same topic via its own consumer group. This fan-out is free: adding a new sink (Snowflake, DynamoDB, a third-party webhook) requires zero changes to the source system or existing sinks. The <strong>dead-letter queue (DLQ)</strong> catches any record that fails deserialization or transformation, so one malformed record never halts the entire pipeline.</p>
    </div>`;

  const canvas = tab.querySelector('#tab-flow canvas') || tab.querySelector('canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  const packets = [];
  let raf = null, lastT = 0;

  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05);
    lastT = ts;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Source
    const boxes = [
      { x: 20,  y: 140, w: 120, h: 80, label: 'Amazon RDS\n(MySQL)', color: '#F59E0B', sub: 'Debezium CDC' },
      { x: 210, y: 120, w: 120, h: 40, label: 'Source Worker', color: '#8B5CF6', sub: '' },
      { x: 210, y: 175, w: 120, h: 40, label: 'SMT Pipeline', color: '#8B5CF6', sub: '' },
      { x: 390, y: 120, w: 100, h: 120, label: 'Kafka\nBroker', color: '#FF6900', sub: 'orders-cdc topic' },
      { x: 560, y: 120, w: 120, h: 40, label: 'Sink Worker', color: '#3B82F6', sub: '' },
      { x: 560, y: 175, w: 120, h: 40, label: 'Sink Worker', color: '#3B82F6', sub: '' },
      { x: 740, y: 110, w: 60, h: 50, label: 'Elastic', color: '#10B981', sub: '' },
      { x: 740, y: 200, w: 60, h: 50, label: 'S3', color: '#FF9900', sub: '' },
    ];

    boxes.forEach(b => {
      ctx.fillStyle = '#1E293B';
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.w, b.h, 8);
      ctx.fill();
      ctx.stroke();
      ctx.font = 'bold 10px system-ui';
      ctx.fillStyle = b.color;
      ctx.textAlign = 'center';
      b.label.split('\n').forEach((line, i) => {
        ctx.fillText(line, b.x + b.w/2, b.y + b.h/2 - 4 + i * 14);
      });
      if (b.sub) {
        ctx.font = '8px system-ui';
        ctx.fillStyle = '#475569';
        ctx.fillText(b.sub, b.x + b.w/2, b.y + b.h - 6);
      }
    });

    packets.forEach(p => { p.update(dt); p.draw(ctx); });
    while (packets.length > 20) packets.shift();

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });

  tab.querySelector('#kc-cdc').addEventListener('click', () => {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        packets.push(new EventPacket({
          label: 'cdc', color: '#F59E0B',
          path: [
            { x: 140, y: 180 },
            { x: 270, y: 140 },
            { x: 270, y: 195 },
            { x: 390, y: 180 },
          ],
          speed: 1.0,
        }));
      }, i * 200);
    }
  });

  tab.querySelector('#kc-sink').addEventListener('click', () => {
    ['#10B981', '#FF9900'].forEach((color, si) => {
      setTimeout(() => {
        packets.push(new EventPacket({
          label: 'sink', color,
          path: [
            { x: 490, y: 180 },
            { x: 620, y: si === 0 ? 140 : 195 },
            { x: 760, y: si === 0 ? 135 : 225 },
          ],
          speed: 1.0,
        }));
      }, si * 150);
    });
  });

  return () => { if (raf) cancelAnimationFrame(raf); };
}

function buildTypes(container) {
  const tab = container.querySelector('#tab-types');
  const connectors = [
    { name: 'Debezium MySQL/PG', type: 'Source', icon: '🗄️', color: '#F59E0B', desc: 'CDC via binlog/WAL. Captures INSERT/UPDATE/DELETE in real time. Zero-latency database sync.' },
    { name: 'JDBC Source', type: 'Source', icon: '📊', color: '#3B82F6', desc: 'Poll-based table import. Incremental by timestamp or incrementing column. For batch-friendly sources.' },
    { name: 'S3 Source', type: 'Source', icon: '☁️', color: '#FF9900', desc: 'Read files from S3 into Kafka. Supports CSV, JSON, Avro. Used for cold-start historical replay.' },
    { name: 'S3 Sink', type: 'Sink', icon: '🪣', color: '#FF9900', desc: 'Write Kafka topic to S3 as Parquet/JSON. Enables Athena/Snowflake query on event history.' },
    { name: 'Elasticsearch Sink', type: 'Sink', icon: '🔍', color: '#10B981', desc: 'Index Kafka records for full-text search. Powers Amazon product search and fraud dashboards.' },
    { name: 'Snowflake Sink', type: 'Sink', icon: '❄️', color: '#29B5E8', desc: 'Stream Kafka events directly into Snowflake tables. Enables real-time analytics without ETL.' },
    { name: 'DynamoDB Sink', type: 'Sink', icon: '⚡', color: '#8B5CF6', desc: 'Write aggregated Kafka events to DynamoDB. Drives Prime recommendation materialized views.' },
    { name: 'HTTP Sink', type: 'Sink', icon: '🌐', color: '#6366F1', desc: 'Webhook delivery — POST each record to an HTTP endpoint. SNS/SQS-style fan-out via HTTP.' },
  ];
  tab.innerHTML = `
    <div class="info-grid">
      ${connectors.map(c => `
        <div class="info-card" style="border-left:3px solid ${c.color}">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="font-size:20px">${c.icon}</span>
            <div>
              <div class="info-card-title">${c.name}</div>
              <div class="info-card-tag" style="background:${c.color}22;color:${c.color}">${c.type}</div>
            </div>
          </div>
          <div class="info-card-body">${c.desc}</div>
        </div>`).join('')}
    </div>`;
}
