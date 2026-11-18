import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { EventPacket, drawRoundRect, drawArrow } from '../components/canvas-primitives.js';

export const IQ = [
  { q: 'What is Kafka Connect and how does it differ from writing a custom producer/consumer?', a: 'Kafka Connect is a framework for scalable, fault-tolerant data integration without writing Kafka client code. It provides: distributed execution (worker cluster), automatic offset management, schema inference, REST API for connector management, and 200+ pre-built connectors (JDBC, S3, Elasticsearch, Snowflake, Debezium). A custom producer/consumer gives more control but requires you to handle offset management, parallelism, restarts, and schema. Connect is preferred when a connector already exists for your system.', tip: 'Mention SMT (Single Message Transform) — lightweight record transformations applied inline (add field, mask PII, route by value) without a separate streaming job.' },
  { q: 'What is Debezium and how does it work?', a: 'Debezium is a Kafka Connect source connector for change data capture (CDC). It reads the database\'s replication log (MySQL binlog, PostgreSQL WAL, Oracle redo log) and publishes row-level changes (INSERT/UPDATE/DELETE) as Kafka events. Each record includes the before/after state of the row plus metadata (LSN, timestamp, tx ID). This enables event-driven architectures built on existing databases — no application code changes required. Amazon uses Debezium to stream RDS changes into Kafka for real-time sync to Elasticsearch and DynamoDB.', tip: 'Know: Debezium captures at the storage engine level — it\'s not polling. Changes appear in Kafka within milliseconds of commit. Deletes appear as tombstone records for compacted topics.' },
  { q: 'What is a dead-letter queue (DLQ) in Kafka Connect and when does a record land there?', a: 'When a connector fails to process a record (deserialization error, schema mismatch, transformation exception), it can route the bad record to a DLQ topic (configured via errors.deadletterqueue.topic.name). The record is written with headers containing the error details (exception class, message, original topic/partition/offset). Without a DLQ, any single bad record halts the entire connector. DLQs enable poison-pill tolerance: the pipeline continues, bad records are investigated separately.', tip: 'DLQ is not enabled by default — you must set errors.tolerance=all and configure the DLQ topic. Without it, the connector pauses on the first bad record.' },
  { q: 'What is the difference between standalone and distributed Kafka Connect, and how do tasks rebalance?', a: 'Standalone Connect runs one worker with config on local disk — simple, but no fault tolerance and no scaling. Distributed Connect runs a cluster of workers that coordinate through internal Kafka topics. (1) Connector/task configs, offsets, and status live in compacted topics, so any worker can pick up any task. (2) The workers form a group like consumers; when one dies or you add a worker, Connect rebalances tasks across the survivors. (3) A connector is split into tasks (tasks.max), and tasks are the unit of parallelism and rebalancing. Use standalone only for dev; production is always distributed.', tip: 'Key line: "distributed Connect stores state in Kafka topics, so workers are stateless and tasks rebalance on failure." tasks.max is your parallelism knob.', difficulty: 'medium' },
  { q: 'What are Single Message Transforms (SMTs) in Kafka Connect, and what are their limits?', a: 'SMTs are lightweight, per-record transformations applied inline in the Connect pipeline — no separate stream-processing job. (1) Common ones: ExtractField, InsertField, MaskField, Cast, RegexRouter for retargeting the topic, TimestampConverter. (2) They run synchronously on each record between connector and converter, so they are cheap and stateless. (3) The limit: an SMT sees one record at a time, so it cannot join, aggregate, or window — anything stateful belongs in Kafka Streams or Flink. They also cannot call external services efficiently. Use SMTs to shape and route single records; use a stream processor when you need context across records.', tip: 'Say "SMTs are stateless and single-record." The instant a transform needs another record or a window, it is no longer an SMT job — it is Streams/Flink.', difficulty: 'medium' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M12 · Ecosystem',
    title: 'Kafka Connect',
    subtitle: 'Source & sink connectors, SMT, DLQ — streaming data in and out of Kafka',
    definition: {
      formal: "Kafka Connect is a framework for streaming data between Kafka and external systems using reusable connectors — source connectors pull data in, sink connectors push data out — with transformations (SMTs) and dead-letter queues, all configuration-driven and scalable without custom code.",
      easy: "Connect is ready-made plumbing to move data in and out of Kafka without writing code. Source connectors pull data in from databases and APIs; sink connectors push it out to warehouses and stores — you just fill in config.",
    },
    tabs: [
      { id: 'flow',    label: '🔌 Connect Flow' },
      { id: 'workers', label: '⚙️ Workers & Tasks' },
      { id: 'types',   label: '📦 Connector Types' },
      { id: 'iq',      label: '🎯 Interview Q&A' },
    ]
  });

  const cleanups = [];
  cleanups.push(buildFlow(container));
  cleanups.push(buildWorkers(container));
  buildTypes(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return () => cleanups.forEach(fn => { if (typeof fn === 'function') fn(); });
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
        ctx.fillStyle = '#8A98AE';
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

/* ─────────────────────────────────────────────────────────────────────────
   TAB — Workers, Tasks & Rebalancing (distributed Connect cluster)
   ───────────────────────────────────────────────────────────────────────── */
function buildWorkers(container) {
  const tab = container.querySelector('#tab-workers');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">A connector is just <b>config</b>; the real work runs as <b>tasks</b>. A distributed Connect <b>worker cluster</b> splits each connector into up to <code>tasks.max</code> tasks and spreads them across workers. All cluster state — configs, offsets, status — lives in <b>three internal compacted Kafka topics</b>, so workers are stateless. Press <b>Kill a worker</b> to watch its tasks <b>rebalance</b> onto the survivors; <b>Add a worker</b> to scale out and rebalance the other way.</div>
      <canvas id="kc-workers-canvas" width="820" height="380" style="width:100%;max-width:820px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="kcw-kill">💀 Kill a worker</button>
        <button class="ctrl-btn" id="kcw-add">➕ Add a worker</button>
        <button class="ctrl-btn" id="kcw-reset">↻ Reset</button>
        <span class="ctrl-label" id="kcw-status">3 workers · 6 tasks · 2 tasks/worker</span>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>The thing that trips people up is that <strong>a connector does not "run" anywhere</strong> — it is just a configuration document. When you POST a connector config to the Connect REST API, the connector's <code>Connector</code> class is asked one question: "given <code>tasks.max</code>, how do you want to divide this work?" It returns a list of <strong>task configs</strong>, and <em>those</em> are the units that actually move data. A Debezium source connector typically returns a single task (one task reads one database's log); a sink connector returns up to <code>tasks.max</code> tasks, and the topic's partitions are divided among them exactly like a consumer group.</p>
      <p>In <strong>distributed mode</strong>, a set of <strong>worker</strong> processes (JVMs) form a group that shares the same <code>group.id</code>. They elect a leader, and the leader assigns tasks to workers. Crucially, <strong>workers hold no durable state of their own</strong> — everything lives in three internal <strong>compacted</strong> Kafka topics: <code>connect-configs</code> (connector + task configs), <code>connect-offsets</code> (source-connector progress), and <code>connect-status</code> (running/failed/paused state). Because all state is in Kafka, any worker can pick up any task at any time. That is the whole trick.</p>
      <p>When a worker <strong>dies</strong> (press the button), the group coordinator notices the missing member and triggers a <strong>rebalance</strong>: the leader recomputes the task-to-worker assignment and the dead worker's tasks are restarted on the survivors — resuming from the offsets already committed in <code>connect-offsets</code>, so no data is lost and nothing is reprocessed beyond the last commit. Add a worker and the same machinery spreads tasks back out. Modern Connect uses <strong>incremental cooperative rebalancing</strong> (KIP-415), so only the tasks that must move are stopped — the rest keep running through the rebalance instead of the old stop-the-world "everyone drops everything" behaviour.</p>
      <p><strong>Interview angle:</strong> <code>tasks.max</code> is your parallelism knob, but it is a ceiling, not a guarantee — a source connector that can only produce one task (single DB log reader) ignores a higher value, and a sink connector can never usefully run more tasks than the topic has partitions. "Workers are stateless because all state is in compacted internal topics" and "tasks are the unit of parallelism and of rebalancing" are the two sentences that signal you actually understand Connect's architecture.</p>
    </div>`;

  const canvas = tab.querySelector('#kc-workers-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;

  const TASK_N = 6;
  const WCOLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'];
  // Internal topics (top row)
  const topics = [
    { key: 'cfg',  label: 'connect-configs',  color: '#06B6D4', flash: 0 },
    { key: 'off',  label: 'connect-offsets',  color: '#10B981', flash: 0 },
    { key: 'stat', label: 'connect-status',   color: '#F59E0B', flash: 0 },
  ];

  let workerCount = 3;
  // tasks: each has animated x,y and target tx,ty, plus assigned worker index
  const tasks = Array.from({ length: TASK_N }, (_, i) => ({
    id: i, w: 0, x: W / 2, y: 300, tx: W / 2, ty: 300, born: 0,
  }));

  function workerLayout(n) {
    const pad = 28, gap = 16;
    const area = W - pad * 2;
    const wW = Math.min(180, (area - gap * (n - 1)) / n);
    const totW = wW * n + gap * (n - 1);
    const startX = (W - totW) / 2;
    const boxes = [];
    for (let i = 0; i < n; i++) {
      boxes.push({ x: startX + i * (wW + gap), y: 170, w: wW, h: 170 });
    }
    return boxes;
  }

  function reassign() {
    const boxes = workerLayout(workerCount);
    // round-robin tasks across workers → even, deterministic rebalance
    tasks.forEach((t, i) => {
      t.w = i % workerCount;
      const b = boxes[t.w];
      const slot = Math.floor(i / workerCount);            // vertical slot within worker
      t.tx = b.x + b.w / 2;
      t.ty = b.y + 50 + slot * 34;
    });
    topics.forEach(tp => { tp.flash = tp.key === 'stat' ? 1 : 0.55; });
    const per = (TASK_N / workerCount);
    const perTxt = Number.isInteger(per) ? `${per} tasks/worker`
      : `${Math.floor(per)}–${Math.ceil(per)} tasks/worker`;
    tab.querySelector('#kcw-status').textContent =
      `${workerCount} worker${workerCount > 1 ? 's' : ''} · ${TASK_N} tasks · ${perTxt}`;
  }
  reassign();
  // snap into place on first render
  tasks.forEach(t => { t.x = t.tx; t.y = t.ty; });

  let raf = null, lastT = 0;
  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05); lastT = ts;
    ctx.clearRect(0, 0, W, canvas.height);
    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, W, canvas.height);

    // ── Internal topics row ──
    const tW = 210, tGap = 18, tTot = tW * 3 + tGap * 2, tStart = (W - tTot) / 2;
    ctx.font = '600 10px system-ui'; ctx.textAlign = 'center';
    ctx.fillStyle = '#64748B';
    ctx.fillText('INTERNAL STATE — compacted Kafka topics (workers are stateless)', W / 2, 20);
    topics.forEach((tp, i) => {
      const x = tStart + i * (tW + tGap), y = 32, h = 40;
      tp.flash = Math.max(0, tp.flash - dt * 1.6);
      const glow = tp.flash;
      drawRoundRect(ctx, x, y, tW, h, 8,
        `rgba(${glow > 0 ? '30,41,59' : '20,28,44'},1)`,
        glow > 0 ? tp.color : '#263247');
      if (glow > 0) {
        ctx.save(); ctx.globalAlpha = glow * 0.6;
        drawRoundRect(ctx, x, y, tW, h, 8, tp.color + '33', tp.color); ctx.restore();
      }
      ctx.font = 'bold 11px ui-monospace,monospace'; ctx.fillStyle = tp.color;
      ctx.fillText(tp.label, x + tW / 2, y + 18);
      ctx.font = '8px system-ui'; ctx.fillStyle = '#8A98AE';
      const sub = tp.key === 'cfg' ? 'connector + task configs'
        : tp.key === 'off' ? 'source-task progress' : 'running / failed / paused';
      ctx.fillText(sub, x + tW / 2, y + 32);
    });

    // ── Connector banner ──
    ctx.font = '600 10px system-ui'; ctx.fillStyle = '#64748B';
    ctx.fillText('CONNECTOR  "s3-sink"  ·  tasks.max = 6  →  6 tasks spread across the worker group', W / 2, 108);

    // ── Workers ──
    const boxes = workerLayout(workerCount);
    boxes.forEach((b, i) => {
      const color = WCOLORS[i % WCOLORS.length];
      drawRoundRect(ctx, b.x, b.y, b.w, b.h, 10, '#111A2B', color);
      ctx.font = 'bold 11px system-ui'; ctx.fillStyle = color; ctx.textAlign = 'center';
      ctx.fillText(`Worker ${i + 1}`, b.x + b.w / 2, b.y + 20);
      ctx.font = '8px system-ui'; ctx.fillStyle = '#64748B';
      ctx.fillText('same group.id', b.x + b.w / 2, b.y + 33);
      if (i === 0) {
        ctx.fillStyle = '#F59E0B'; ctx.font = 'bold 8px system-ui';
        ctx.fillText('★ leader (assigns tasks)', b.x + b.w / 2, b.y + b.h - 8);
      }
    });

    // ── Tasks (glide to targets) ──
    tasks.forEach(t => {
      t.x += (t.tx - t.x) * Math.min(1, dt * 7);
      t.y += (t.ty - t.y) * Math.min(1, dt * 7);
      const color = WCOLORS[t.w % WCOLORS.length];
      const moving = Math.abs(t.x - t.tx) + Math.abs(t.y - t.ty) > 1.5;
      const bw = Math.min(150, (boxes[t.w].w - 20));
      drawRoundRect(ctx, t.x - bw / 2, t.y - 13, bw, 26, 7,
        moving ? color + 'cc' : '#1E293B', color);
      ctx.font = 'bold 10px ui-monospace,monospace'; ctx.fillStyle = moving ? '#fff' : color;
      ctx.textAlign = 'center';
      ctx.fillText(`task-${t.id}`, t.x, t.y + 3.5);
    });

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });

  tab.querySelector('#kcw-kill').addEventListener('click', () => {
    if (workerCount > 1) { workerCount--; reassign(); }
  });
  tab.querySelector('#kcw-add').addEventListener('click', () => {
    if (workerCount < 4) { workerCount++; reassign(); }
  });
  tab.querySelector('#kcw-reset').addEventListener('click', () => {
    workerCount = 3; reassign();
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
