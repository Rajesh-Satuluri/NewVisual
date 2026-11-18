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
      { id: 'smt',     label: '🧩 SMT Chain' },
      { id: 'dlq',     label: '💀 Errors & DLQ' },
      { id: 'types',   label: '📦 Connector Types' },
      { id: 'iq',      label: '🎯 Interview Q&A' },
    ]
  });

  const cleanups = [];
  cleanups.push(buildFlow(container));
  cleanups.push(buildWorkers(container));
  cleanups.push(buildSMT(container));
  cleanups.push(buildDLQ(container));
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

/* ─────────────────────────────────────────────────────────────────────────
   TAB — The SMT Chain (step a single record through the transform pipeline)
   ───────────────────────────────────────────────────────────────────────── */
function buildSMT(container) {
  const tab = container.querySelector('#tab-smt');

  // Each stage transforms an immutable record {topic, value}. Stages are pure
  // and operate on ONE record — the whole point of SMTs.
  const STAGES = [
    {
      name: 'Source Task', cfg: 'Debezium emits a change envelope',
      topic: 'dbserver1.sales.orders',
      value: { op: 'c', before: null,
        after: { id: 7701, email: 'rao@shop.in', cc_number: '4539115300000001', total: 2490, currency: 'INR' },
        source: { table: 'orders', lsn: 23897451, ts_ms: 1731951600000 } },
      note: 'The raw record a Debezium source task produces: an envelope with op, before/after row images, and source metadata. SMTs run next, in order, before the converter.',
    },
    {
      name: 'ExtractNewRecordState', cfg: 'io.debezium.transforms.ExtractNewRecordState',
      apply: r => ({ topic: r.topic, value: { ...r.value.after } }),
      note: 'Debezium\'s unwrap SMT: throw away the envelope and keep just the "after" row image, so downstream sinks see a plain flat row instead of a nested change event. Deletes become tombstones (null value).',
    },
    {
      name: 'MaskField', cfg: 'transforms.mask.type=…MaskField$Value · fields=cc_number',
      apply: r => ({ topic: r.topic, value: { ...r.value, cc_number: '****************' } }),
      note: 'Replace a sensitive field\'s value with a mask, inline, before the record ever reaches Kafka. Cheap PII redaction with zero extra infrastructure — no stream job, no second topic.',
      hot: 'cc_number',
    },
    {
      name: 'InsertField', cfg: 'static.field=pipeline · timestamp.field=ingest_ts',
      apply: r => ({ topic: r.topic, value: { ...r.value, ingest_ts: '2026-11-18T17:20:00Z', pipeline: 'connect-v2' } }),
      note: 'Add fields the source didn\'t provide: a processing timestamp, a static tag, the Kafka topic/partition/offset, or the record key. Useful for lineage and for downstream partitioning.',
      hot: 'ingest_ts',
    },
    {
      name: 'ReplaceField', cfg: 'renames=total:amount · exclude=currency',
      apply: r => { const v = { ...r.value }; v.amount = v.total; delete v.total; delete v.currency; return { topic: r.topic, value: v }; },
      note: 'Rename and drop fields to match a downstream schema (total → amount, drop currency). Pure column-shaping — still one record at a time, no lookups.',
      hot: 'amount',
    },
    {
      name: 'RegexRouter', cfg: 'regex=dbserver1\\.sales\\.(.*) · replacement=$1',
      apply: r => ({ topic: r.topic.replace(/^dbserver1\.sales\./, ''), value: r.value }),
      note: 'The one SMT that changes the TARGET TOPIC rather than the value — here collapsing the CDC topic name down to "orders". Routing by field value (TimestampRouter, RegexRouter) is how one connector fans into many topics.',
      routes: true,
    },
    {
      name: 'AvroConverter', cfg: 'value.converter=io.confluent.…AvroConverter',
      apply: r => ({ topic: r.topic, value: '«Avro bytes»  magic=0x00  schema-id=142  (12 fields → 38 bytes)', bytes: true }),
      note: 'NOT an SMT — the converter runs last and turns the in-memory record into the bytes Kafka stores. With Schema Registry it writes a magic byte + schema id, then the compact Avro body. This is where the record stops being a mutable object and becomes wire bytes.',
      converter: true,
    },
  ];

  let step = 0;
  let timer = null;

  function recordAt(i) {
    let r = { topic: STAGES[0].topic, value: STAGES[0].value };
    for (let s = 1; s <= i; s++) if (STAGES[s].apply) r = STAGES[s].apply(r);
    return r;
  }

  function jsonHTML(val, hot, routes) {
    if (typeof val === 'string') return `<span style="color:#F59E0B">${val}</span>`;
    const j = JSON.stringify(val, null, 2);
    // highlight the "hot" key line
    return j.split('\n').map(line => {
      const m = line.match(/^(\s*)"([^"]+)":/);
      let out = line
        .replace(/"([^"]+)":/g, '<span style="color:#7DD3FC">"$1"</span>:')
        .replace(/: (".*?"|\d+|null|true|false)(,?)$/,
          (mm, v, c) => `: <span style="color:#86EFAC">${v}</span>${c}`);
      if (hot && m && m[2] === hot) out = `<span style="background:#F59E0B22;display:inline-block;width:100%;border-radius:3px">${out}</span>`;
      return out;
    }).join('\n');
  }

  function render() {
    const s = STAGES[step];
    const r = recordAt(step);
    const prev = step > 0 ? recordAt(step - 1) : null;
    const topicChanged = prev && prev.topic !== r.topic;

    tab.querySelector('#smt-stages').innerHTML = STAGES.map((st, i) => {
      const active = i === step, done = i < step;
      const isConv = st.converter, isRoute = st.routes;
      const col = isConv ? '#F59E0B' : isRoute ? '#EC4899' : i === 0 ? '#8B5CF6' : '#06B6D4';
      return `
        <div style="display:flex;align-items:center;gap:0;flex-shrink:0">
          <div style="min-width:112px;max-width:112px;padding:8px 9px;border-radius:9px;text-align:center;
            background:${active ? col + '1f' : '#111A2B'};
            border:1px solid ${active ? col : done ? '#2A3A52' : '#1C2740'};
            opacity:${done ? 0.55 : 1};transition:all .25s ease">
            <div style="font-size:9px;font-weight:700;color:${active ? col : '#94A3B8'};line-height:1.25">${st.name}</div>
            <div style="font-size:8px;color:#5B6B82;margin-top:3px">${i === 0 ? 'source' : isConv ? 'converter' : 'SMT ' + i}</div>
          </div>
          ${i < STAGES.length - 1 ? `<div style="width:14px;height:2px;background:${i < step ? '#3B82F6' : '#2A3A52'};flex-shrink:0"></div>` : ''}
        </div>`;
    }).join('');

    tab.querySelector('#smt-topic').innerHTML =
      `topic → <span style="color:${topicChanged ? '#EC4899' : '#7DD3FC'};font-weight:700">${r.topic}</span>` +
      (topicChanged ? `  <span style="color:#EC4899;font-size:10px">◂ rewritten by RegexRouter</span>` : '');

    tab.querySelector('#smt-json').innerHTML = jsonHTML(r.value, s.hot, s.routes);
    tab.querySelector('#smt-stagename').innerHTML =
      `<span style="color:#E2E8F0;font-weight:700">${s.name}</span>` +
      `<span style="color:#5B6B82"> · ${step === 0 ? 'input' : step + ' of ' + (STAGES.length - 1)}</span>`;
    tab.querySelector('#smt-cfg').textContent = s.cfg;
    tab.querySelector('#smt-note').textContent = s.note;
    tab.querySelector('#smt-step').textContent = step >= STAGES.length - 1 ? '✓ Done' : '▶ Next transform';
  }

  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">Single Message Transforms run <b>in order, one record at a time</b>, between the source task and the converter. Step one record through a real chain and watch each SMT <b>mutate exactly the fields it owns</b> — then the converter turns it into bytes. Nothing here is stateful; no SMT can see another record.</div>
      <div id="smt-stages" style="display:flex;align-items:center;gap:0;overflow-x:auto;padding:10px 4px 14px"></div>
      <div style="display:grid;grid-template-columns:1fr;gap:12px">
        <div style="background:#0C1424;border:1px solid #1C2740;border-radius:10px;padding:12px 14px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px">
            <div id="smt-stagename" style="font-size:12px"></div>
            <div id="smt-topic" style="font-size:11px;font-family:ui-monospace,monospace;color:#7DD3FC"></div>
          </div>
          <div id="smt-cfg" style="font-size:10px;font-family:ui-monospace,monospace;color:#64748B;margin-bottom:8px;word-break:break-all"></div>
          <pre id="smt-json" style="margin:0;font-size:11px;line-height:1.55;font-family:ui-monospace,monospace;color:#CBD5E1;white-space:pre-wrap;word-break:break-word;max-height:260px;overflow:auto"></pre>
        </div>
        <div id="smt-note" style="font-size:12px;line-height:1.6;color:#94A3B8;min-height:38px"></div>
      </div>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="smt-step">▶ Next transform</button>
        <button class="ctrl-btn" id="smt-run">⏩ Run chain</button>
        <button class="ctrl-btn" id="smt-reset">↻ Reset</button>
        <span class="ctrl-label">Watch cc_number get masked, fields renamed, the topic rewritten, then Avro-serialized</span>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>A <strong>Single Message Transform</strong> is a tiny, stateless function with one signature: record in, record out. The Connect framework threads every record through the configured chain <strong>in declaration order</strong>, after the source task produces it and <em>before</em> the converter serializes it (on a sink, the order is reversed: converter first, then SMTs, then the sink task). Each SMT in this example touches only what it owns — <code>ExtractNewRecordState</code> unwraps the Debezium envelope to a flat row, <code>MaskField</code> redacts the card number, <code>InsertField</code> stamps lineage fields, <code>ReplaceField</code> renames <code>total→amount</code>, and <code>RegexRouter</code> rewrites the destination topic without touching the value at all.</p>
      <p>The last box is deliberately <em>not</em> an SMT: the <strong>converter</strong>. SMTs operate on the record as a structured object with a schema; the converter is what turns that object into the raw bytes Kafka actually stores. With the Avro (or Protobuf/JSON-Schema) converter plus Schema Registry, the value becomes a <code>magic byte + 4-byte schema id + compact binary body</code> — which is also exactly what a consumer reverses on the read side. Keeping transforms (shape the record) separate from converters (serialize the record) is a core Connect design line worth stating out loud.</p>
      <p><strong>Predicates &amp; the hard boundary.</strong> Any SMT can be gated with a <strong>predicate</strong> (e.g. <code>TopicNameMatches</code>, <code>HasHeaderKey</code>, <code>RecordIsTombstone</code>) and negated with <code>negate=true</code> — so you can mask a field only on certain topics, or skip a transform for tombstones. But every predicate and every transform still sees <strong>exactly one record with no memory of any other</strong>. The instant you need to join two streams, deduplicate, aggregate a count, enrich from a database, or window by time, you are out of SMT territory — that work belongs in <strong>Kafka Streams, ksqlDB, or Flink</strong>. "SMTs are stateless and single-record" is the sentence that draws the line between configuration-driven Connect and real stream processing.</p>
      <p><strong>Interview angle:</strong> a great tell is knowing SMTs run <em>per connector</em>, are ordered, and are cheap enough to run on every record — but that overusing them (long chains, regex-heavy routing) pushes CPU onto the Connect worker and makes pipelines hard to debug, because a bad transform throws inside the task and (without error handling) stops it. That last point is exactly what the next tab — <em>Error Handling &amp; DLQ</em> — is about.</p>
    </div>`;

  render();

  const stepFn = () => { if (step < STAGES.length - 1) { step++; render(); } };
  tab.querySelector('#smt-step').addEventListener('click', stepFn);
  tab.querySelector('#smt-reset').addEventListener('click', () => {
    if (timer) { clearInterval(timer); timer = null; } step = 0; render();
  });
  tab.querySelector('#smt-run').addEventListener('click', () => {
    if (timer) { clearInterval(timer); timer = null; }
    step = 0; render();
    timer = setInterval(() => {
      if (step >= STAGES.length - 1) { clearInterval(timer); timer = null; return; }
      step++; render();
    }, 900);
  });

  return () => { if (timer) clearInterval(timer); };
}

/* ─────────────────────────────────────────────────────────────────────────
   TAB — Error Handling & DLQ (poison pill: fail-fast vs tolerate-all)
   ───────────────────────────────────────────────────────────────────────── */
function buildDLQ(container) {
  const tab = container.querySelector('#tab-dlq');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">One malformed record — a <b>poison pill</b> — can take down an entire connector. Flip <code>errors.tolerance</code> and send a bad record to watch the two outcomes: <b>none</b> stops the task dead; <b>all</b> retries, then routes the record to a <b>dead-letter queue</b> with diagnostic headers and keeps the pipeline running.</div>
      <canvas id="kc-dlq-canvas" width="820" height="320" style="width:100%;max-width:820px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="dlq-tol">errors.tolerance = <b>none</b></button>
        <button class="ctrl-btn" id="dlq-good">▶ Good record</button>
        <button class="ctrl-btn" id="dlq-bad">☠️ Poison pill</button>
        <button class="ctrl-btn" id="dlq-reset">↻ Reset</button>
        <span class="ctrl-label" id="dlq-status">delivered 0 · failed 0 · DLQ 0</span>
      </div>
      <div id="dlq-headers" style="display:none;margin-top:12px;background:#0C1424;border:1px solid #7F1D1D;border-left:3px solid #EF4444;border-radius:10px;padding:12px 14px">
        <div style="font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#F87171;margin-bottom:8px">☠️ Dead-letter record → <span style="font-family:ui-monospace,monospace">orders.DLQ</span> · headers written by Connect</div>
        <pre style="margin:0;font-size:10.5px;line-height:1.6;font-family:ui-monospace,monospace;color:#CBD5E1;white-space:pre-wrap;word-break:break-word">__connect.errors.topic              = orders
__connect.errors.partition          = 3
__connect.errors.offset             = 104271
__connect.errors.stage              = VALUE_CONVERTER
__connect.errors.class.name         = io.confluent.connect.avro.AvroConverter
__connect.errors.exception.class    = org.apache.kafka.connect.errors.DataException
__connect.errors.exception.message  = Failed to deserialize data for topic orders to Avro: Unknown magic byte!
<span style="color:#64748B">payload</span>                             = &lt;original raw bytes, preserved verbatim&gt;</pre>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>By default, Kafka Connect is <strong>fail-fast</strong>: <code>errors.tolerance=none</code>. If a single record throws anywhere in the pipeline — a bad deserialization, a converter that hits a non-Avro byte on an Avro topic, an SMT that trips on a missing field — the task catches the exception, transitions to <strong>FAILED</strong>, and <em>stops consuming</em>. Because the offset of the bad record was never committed, nothing past it is processed. One corrupt message silently halts the whole flow until a human restarts the task — and on restart it hits the same record and fails again. That is the classic "poison pill" outage.</p>
      <p>Setting <code>errors.tolerance=all</code> changes the contract: <strong>tolerate per-record failures instead of killing the task.</strong> A failing record is first <strong>retried</strong> — <code>errors.retry.timeout</code> bounds how long, <code>errors.retry.delay.max.ms</code> caps the backoff — because many failures (a momentarily unreachable Schema Registry, a brief sink outage) are transient. If it still fails after retries, and a <strong>dead-letter queue</strong> is configured (<code>errors.deadletterqueue.topic.name=orders.DLQ</code>), Connect writes the original record <em>verbatim</em> to that topic and moves on. The good records keep flowing; the bad one is quarantined for later inspection, replay, or alerting — without ever blocking the pipeline.</p>
      <p>The DLQ's real power is in its <strong>headers</strong>. With <code>errors.deadletterqueue.context.headers.enable=true</code>, Connect stamps each dead-lettered record with exactly where and why it died: the source topic/partition/offset, the failing <strong>stage</strong> (<code>VALUE_CONVERTER</code>, <code>KEY_CONVERTER</code>, <code>TRANSFORMATION</code>, <code>PUT</code>), the exception class, and the error message — while the original bytes stay untouched as the payload. That turns debugging from "grep gigabytes of worker logs" into "consume one topic and read the headers," and makes automated replay possible once the root cause is fixed.</p>
      <p><strong>Interview angle:</strong> the sharp distinctions are (1) <code>errors.tolerance</code> governs <em>conversion and transformation</em> errors in the Connect runtime — it is <em>not</em> a retry for sink-system write failures, which each connector handles with its own retry config; (2) a DLQ is only meaningful for <strong>sink</strong> connectors (a source has no upstream Kafka topic to divert to — its errors are tolerated or they fail the task); and (3) <code>errors.tolerance=all</code> without a configured DLQ topic means failing records are <em>silently dropped</em> — data loss. Saying "tolerate-all plus a DLQ with context headers" is the answer that shows you'd run this safely in production.</p>
    </div>`;

  const canvas = tab.querySelector('#kc-dlq-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  let tolerateAll = false;
  let failed = false;
  let retryPulse = 0;
  const stats = { delivered: 0, failed: 0, dlq: 0 };
  const packets = [];
  let raf = null, lastT = 0;

  // layout anchors
  const SRC = { x: 30, y: 120, w: 110, h: 80 };
  const CONV = { x: 310, y: 120, w: 150, h: 80 };
  const SINK = { x: 650, y: 40, w: 140, h: 70 };
  const DLQ = { x: 650, y: 200, w: 140, h: 70 };

  function setStatus() {
    tab.querySelector('#dlq-status').textContent =
      `delivered ${stats.delivered} · failed ${stats.failed} · DLQ ${stats.dlq}`;
  }

  function box(b, color, title, sub, opts = {}) {
    drawRoundRect(ctx, b.x, b.y, b.w, b.h, 10, opts.fill || '#111A2B', opts.stroke || color);
    ctx.textAlign = 'center';
    ctx.font = 'bold 11px system-ui'; ctx.fillStyle = color;
    ctx.fillText(title, b.x + b.w / 2, b.y + b.h / 2 - 2);
    if (sub) { ctx.font = '8px system-ui'; ctx.fillStyle = '#8A98AE'; ctx.fillText(sub, b.x + b.w / 2, b.y + b.h / 2 + 14); }
  }

  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05); lastT = ts;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    // connectors
    drawArrow(ctx, SRC.x + SRC.w, SRC.y + SRC.h / 2, CONV.x, CONV.y + CONV.h / 2, '#334155', 1.5);
    drawArrow(ctx, CONV.x + CONV.w, CONV.y + 10, SINK.x, SINK.y + SINK.h / 2, failed ? '#3A2530' : '#334155', 1.5);
    if (tolerateAll) drawArrow(ctx, CONV.x + CONV.w, CONV.y + CONV.h - 10, DLQ.x, DLQ.y + DLQ.h / 2, '#7F1D1D', 1.5);

    box(SRC, '#FF6900', 'orders', 'Kafka topic');
    // converter box flashes red on retry/fail
    const convColor = failed ? '#EF4444' : retryPulse > 0 ? '#F59E0B' : '#8B5CF6';
    box(CONV, convColor, 'Sink Task', 'converter + SMTs',
      { stroke: convColor, fill: failed ? '#2A1620' : '#111A2B' });
    if (retryPulse > 0) {
      retryPulse = Math.max(0, retryPulse - dt);
      ctx.font = 'bold 9px system-ui'; ctx.fillStyle = '#F59E0B';
      ctx.fillText('⟳ retry…', CONV.x + CONV.w / 2, CONV.y - 6);
    }
    box(SINK, '#10B981', 'Elasticsearch', 'sink system', { stroke: failed ? '#273449' : '#10B981' });
    if (tolerateAll) box(DLQ, '#EF4444', 'orders.DLQ', 'dead-letter topic');

    // task state badge
    ctx.textAlign = 'left';
    ctx.font = 'bold 10px system-ui';
    ctx.fillStyle = failed ? '#EF4444' : '#10B981';
    ctx.fillText(failed ? '● TASK: FAILED (stopped consuming)' : '● TASK: RUNNING', CONV.x - 6, CONV.y + CONV.h + 24);
    ctx.font = '9px ui-monospace,monospace'; ctx.fillStyle = '#64748B';
    ctx.fillText(`errors.tolerance = ${tolerateAll ? 'all' : 'none'}` + (tolerateAll ? '  ·  DLQ = orders.DLQ' : ''), CONV.x - 6, CONV.y + CONV.h + 40);

    if (failed) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 12px system-ui'; ctx.fillStyle = '#F87171';
      ctx.fillText('✖ DataException: Unknown magic byte — task halted', canvas.width / 2, 24);
    }

    for (let i = packets.length - 1; i >= 0; i--) {
      const p = packets[i]; p.update(dt); p.draw(ctx);
      if (p.done && p.opacity <= 0) packets.splice(i, 1);
    }
    while (packets.length > 24) packets.shift();

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });

  function sendGood() {
    if (failed) return;
    packets.push(new EventPacket({
      label: 'ok', color: '#10B981', speed: 3.6,
      path: [
        { x: SRC.x + SRC.w, y: SRC.y + SRC.h / 2 },
        { x: CONV.x + CONV.w / 2, y: CONV.y + CONV.h / 2 },
        { x: SINK.x + 10, y: SINK.y + SINK.h / 2 },
      ],
      onArrive: () => { stats.delivered++; setStatus(); },
    }));
  }

  function sendPoison() {
    if (failed) return;
    if (!tolerateAll) {
      // fail-fast: travel to converter, then fail the task
      packets.push(new EventPacket({
        label: '☠', color: '#EF4444', speed: 3.4,
        path: [
          { x: SRC.x + SRC.w, y: SRC.y + SRC.h / 2 },
          { x: CONV.x + CONV.w / 2, y: CONV.y + CONV.h / 2 },
        ],
        onArrive: () => { failed = true; stats.failed++; setStatus(); },
      }));
    } else {
      // tolerate: retry pulse, then route to DLQ + show headers
      retryPulse = 1.1;
      packets.push(new EventPacket({
        label: '☠', color: '#EF4444', speed: 3.2,
        path: [
          { x: SRC.x + SRC.w, y: SRC.y + SRC.h / 2 },
          { x: CONV.x + CONV.w / 2, y: CONV.y + CONV.h / 2 },
          { x: CONV.x + CONV.w / 2, y: CONV.y + CONV.h - 6 },
          { x: DLQ.x + 10, y: DLQ.y + DLQ.h / 2 },
        ],
        onArrive: () => {
          stats.dlq++; setStatus();
          tab.querySelector('#dlq-headers').style.display = 'block';
        },
      }));
    }
  }

  const tolBtn = tab.querySelector('#dlq-tol');
  function syncTolBtn() {
    tolBtn.innerHTML = `errors.tolerance = <b>${tolerateAll ? 'all' : 'none'}</b>`;
    tolBtn.style.borderColor = tolerateAll ? '#10B981' : '';
  }
  tolBtn.addEventListener('click', () => { tolerateAll = !tolerateAll; failed = false; syncTolBtn(); });
  tab.querySelector('#dlq-good').addEventListener('click', sendGood);
  tab.querySelector('#dlq-bad').addEventListener('click', sendPoison);
  tab.querySelector('#dlq-reset').addEventListener('click', () => {
    failed = false; retryPulse = 0; packets.length = 0;
    stats.delivered = stats.failed = stats.dlq = 0; setStatus();
    tab.querySelector('#dlq-headers').style.display = 'none';
  });
  syncTolBtn();

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
