// M32 — Debezium Internals: Trace One Change. The deep-dive that ties the CDC
// curriculum together end to end: one change walked through every hop (SQL → WAL
// → pgoutput → SourceRecord → converter → Kafka → sink), the pgoutput logical-
// replication protocol, Debezium's internal state/topics, and snapshot +
// delivery-semantics internals (snapshot.mode, DBLog incremental snapshots,
// at-least-once redelivery). Built on the deterministic CDC engine + pure
// internals helpers (both unit-tested in Node).
import { createModuleShell, createIQSection } from '../components/module-shell.js';
import CDCSim from '../sim/cdc-engine.js';
import {
  pgoutputFrames, traceStages, atLeastOnceReplay,
  incrementalSnapshotPlan, SNAPSHOT_MODES, INTERNAL_STORES,
} from '../sim/debezium-internals.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const IQ = [
  {
    q: 'Trace a single UPDATE from the application\'s SQL all the way to a downstream consumer. What happens at each hop?',
    a: 'Seven hops. <strong>(1) SQL</strong>: the app commits <code>UPDATE … SET status=\'PAID\'</code> inside a transaction — it has no idea CDC exists. <strong>(2) WAL</strong>: Postgres writes the change to the write-ahead log and assigns it an <strong>LSN</strong>; on commit it\'s durable. <strong>(3) Logical decoding</strong>: the <code>pgoutput</code> plugin turns the physical WAL into logical row messages — <code>BEGIN</code>, (cached) <code>RELATION</code>, <code>UPDATE</code>, <code>COMMIT</code> — read through the replication slot. <strong>(4) SourceRecord</strong>: the Debezium task inside Kafka Connect maps that to a Connect record — a key Struct (the PK), a value Struct (the before/after/source/op <strong>envelope</strong>), the target topic, and the source offset. <strong>(5) Converter</strong>: serializes the Struct to bytes (JSON, or Avro/Protobuf + Schema Registry); SMTs may reshape it first. <strong>(6) Kafka</strong>: an ordinary append — the key is hashed to a partition (murmur2), so same-row changes stay ordered. <strong>(7) Sink</strong>: a consumer folds the envelope into current state — UPSERT by key, DELETE on <code>op:"d"</code>.',
    tip: 'Being able to name all seven hops — and which position lives where (LSN in the WAL/slot, source offset in the Connect offsets topic, Kafka offset in the partition) — is what separates "I\'ve used Debezium" from "I understand Debezium."',
  },
  {
    q: 'What is pgoutput, and what messages does it emit for one transaction?',
    a: '<code>pgoutput</code> is PostgreSQL\'s built-in <strong>logical-decoding output plugin</strong> (since PG10) — it converts the physical WAL into a stream of logical replication messages that a client reads through a replication slot. For a one-statement transaction you get: <code>BEGIN</code> (final LSN + xid) → <code>RELATION</code> (the table\'s OID, columns, and replica identity — sent once then cached) → the row message <code>INSERT</code>/<code>UPDATE</code>/<code>DELETE</code> → <code>COMMIT</code>. The row message carries a <strong>new tuple</strong> (<code>N</code>) for inserts/updates and, for updates/deletes, an <strong>old tuple</strong> whose contents depend on <code>REPLICA IDENTITY</code>: submessage <code>K</code> (key only, DEFAULT) or <code>O</code> (full old row, FULL). Other message types exist — <code>TRUNCATE</code>, <code>TYPE</code>, <code>ORIGIN</code>, and logical <code>MESSAGE</code>.',
    tip: 'The RELATION-is-cached detail and the K-vs-O old-tuple submessage are deep cuts that show you\'ve actually looked at the protocol, not just the Debezium docs.',
  },
  {
    q: 'Where does Debezium keep its durable state, and which store must you never lose?',
    a: 'State lives in <strong>two homes</strong>. On the <strong>database side</strong>: the <strong>replication slot</strong>, holding <code>confirmed_flush_lsn</code> — how far the consumer has acknowledged, which pins WAL until confirmed. On the <strong>Kafka/Connect side</strong>, several internal topics: the <strong>offsets topic</strong> (the connector\'s processed LSN), the <strong>schema history topic</strong> (every DDL, so the connector can reconstruct the table structure at any historical LSN), optionally a <strong>transaction-metadata topic</strong> and a <strong>heartbeat topic</strong>. The one you must never lose is the <strong>schema history topic</strong>: without it the connector cannot interpret historical change events and will refuse to start, forcing a fresh snapshot. (The offsets topic and the slot are the pair that govern <em>resume-vs-re-snapshot</em>.)',
    tip: 'Say "two homes: the slot in Postgres, the internal topics in Kafka." Then single out the schema history topic as the never-delete one. That structure is the senior answer.',
  },
  {
    q: 'Debezium guarantees at-least-once delivery. Where do the duplicates come from, and how do consumers cope?',
    a: 'The source offset is committed <strong>periodically</strong> (e.g. every <code>offset.flush.interval.ms</code>), not per event. So there\'s a window where events have already been produced to Kafka but their offset has <em>not</em> been checkpointed. If the worker crashes in that window, the restart resumes from the last <strong>committed</strong> offset and <strong>re-emits</strong> every change after it — those reappear in the topic as duplicates. Consumers cope by being <strong>idempotent</strong>: dedupe on a monotonic marker (<code>source.lsn</code>, or the primary key + version), or make the sink an UPSERT so replaying a change is a no-op. Exactly-once end to end needs more (idempotent/transactional producers plus idempotent sinks); plain CDC is at-least-once by design.',
    tip: 'Pin the duplicate to the gap between "produced to Kafka" and "offset committed." Then give the cure in one breath: idempotent sink / dedupe on source.lsn. That cause-and-cure pairing is exactly what interviewers probe.',
  },
  {
    q: 'How can Debezium snapshot a large table without stopping streaming or taking a lock?',
    a: 'With an <strong>incremental snapshot</strong> (the Netflix <strong>DBLog</strong> algorithm, triggered by a signal). It reads the table in key-ordered <strong>chunks</strong>, and brackets each chunk between a <strong>low watermark</strong> and a <strong>high watermark</strong> written into the change stream. Streaming never pauses; any streamed change that lands <em>inside</em> a chunk\'s watermark window for a key in that chunk <strong>wins</strong> over the buffered snapshot read, so a row modified mid-snapshot is never overwritten with a stale value. This avoids the classic initial-snapshot problems — no long lock, no giant single transaction, resumable chunk by chunk, and you can trigger it on demand to backfill a newly added table. Contrast with <code>snapshot.mode</code> (<code>initial</code>, <code>initial_only</code>, <code>no_data</code>, <code>when_needed</code>, <code>never</code>), which governs the <em>startup</em> snapshot.',
    tip: 'Name it ("incremental snapshot / DBLog") and give the one load-bearing idea: low/high watermarks let a concurrent stream value win over the snapshot read, so no stop-the-world and no stale overwrite.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M32 · Change Data Capture',
    title: 'Debezium Internals: Trace One Change',
    subtitle: 'The end-to-end thread: one change walked through every hop, the pgoutput protocol, Debezium\'s internal state and topics, and snapshot + delivery-semantics internals.',
    tabs: [
      { id: 'trace', label: '🔬 Trace One Change' },
      { id: 'pgoutput', label: '📡 pgoutput Protocol' },
      { id: 'state', label: '🧩 Internal State & Topics' },
      { id: 'snapshot', label: '🔁 Snapshots & Delivery' },
      { id: 'iq', label: '🎯 Interview Q&A' },
    ],
  });
  buildTrace(container);
  buildPgoutput(container);
  buildState(container);
  buildSnapshot(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return null;
}

// Render one stage's artifact (sql | kv | frames | json) to HTML.
function renderArtifact(stage) {
  const a = stage.artifact;
  if (a === 'sql') return `<pre class="cdc-json dbi-sql">${esc(stage.body)}</pre>`;
  if (a === 'json') return `<pre class="cdc-json">${esc(JSON.stringify(stage.body, null, 2))}</pre>`;
  if (a === 'kv') {
    return `<div class="dbi-kv">${Object.entries(stage.body).map(([k, v]) =>
      `<div class="dbi-kv-row"><span class="dbi-kv-k">${esc(k)}</span><span class="dbi-kv-v">${esc(v)}</span></div>`).join('')}</div>`;
  }
  if (a === 'frames') return renderFrames(stage.body);
  return '';
}

function renderFrames(po) {
  if (!po.viaWal) return `<div class="callout callout-note"><div class="callout-head">Not via the WAL</div><p>${esc(po.note)}</p></div>`;
  return `<div class="dbi-frames">${po.frames.map(f => `
    <div class="dbi-frame dbi-frame-${f.type.toLowerCase()}">
      <div class="dbi-frame-type">${esc(f.type)}</div>
      <div class="dbi-frame-fields">${Object.entries(f.fields).map(([k, v]) =>
        `<div class="dbi-frame-field"><span>${esc(k)}</span><code>${esc(v)}</code></div>`).join('')}</div>
      <div class="dbi-frame-note">${esc(f.note)}</div>
    </div>`).join('')}</div>`;
}

// ── Tab 1: Trace One Change ─────────────────────────────────────────────────
function buildTrace(container) {
  const tab = container.querySelector('#tab-trace');
  tab.innerHTML = `
    <div class="cdc-scope-note">⚠️ Deterministic simulation. The change is driven through the real CDC engine — the Kafka hop uses real murmur2 partitioning and real per-partition offsets. The pgoutput frames and the SourceRecord are faithful teaching representations of the real artifacts.</div>
    <div class="prose-block" style="margin-bottom:14px">
      <h3>Follow one change through the whole machine</h3>
      <p>Pick an operation. The tool runs it against a tiny <code>orders</code> table and walks the single resulting change through all <strong>seven hops</strong> — from the SQL the app ran to the row a sink materializes. <strong>Click any stage</strong> to see the actual artifact at that point. This is the end-to-end thread that <a href="#m24">M24</a>–<a href="#m31">M31</a> teach one piece at a time.</p>
    </div>
    <div class="cdc-lab-controls">
      <div class="cdc-ctrl-group">
        <span class="cdc-ctrl-label">Trace a change</span>
        <button class="ctrl-btn" data-op="c">➕ INSERT</button>
        <button class="ctrl-btn" data-op="u">✏️ UPDATE</button>
        <button class="ctrl-btn" data-op="d">🗑️ DELETE</button>
      </div>
      <div class="cdc-ctrl-group">
        <span class="cdc-ctrl-label">REPLICA IDENTITY</span>
        <select class="study-select" id="trace-ri">
          <option value="full">FULL (all columns)</option>
          <option value="default">DEFAULT (PK only)</option>
        </select>
      </div>
    </div>
    <div class="dbi-trace-head" id="trace-head"></div>
    <div class="dbi-rail" id="trace-rail"></div>
    <div class="dbi-detail" id="trace-detail"></div>`;

  const $ = s => container.querySelector(s);
  let op = 'u', selected = 2, stages = [], sqlText = '';

  function makeEvent(whichOp, ri) {
    const sim = new CDCSim({ seed: 11 });
    sim.createTable('orders', { pk: 'id', columns: ['id', 'customer', 'status', 'amount'], replicaIdentity: ri });
    // A baseline row that already exists and has already streamed.
    sim.applyInsert('orders', { id: 1001, customer: 'alice', status: 'NEW', amount: 50 });
    sim.poll();
    let sql, ev;
    if (whichOp === 'c') {
      sim.applyInsert('orders', { id: 1002, customer: 'bob', status: 'NEW', amount: 60 });
      sql = "INSERT INTO orders (id, customer, status, amount)\n  VALUES (1002, 'bob', 'NEW', 60);";
      ev = sim.poll().pop();
    } else if (whichOp === 'u') {
      sim.applyUpdate('orders', 1001, { status: 'PAID' });
      sql = "UPDATE orders SET status = 'PAID'\n  WHERE id = 1001;";
      ev = sim.poll().pop();
    } else {
      sim.applyDelete('orders', 1001);
      sql = "DELETE FROM orders\n  WHERE id = 1001;";
      ev = sim.poll().pop();
    }
    return { stages: traceStages(ev, sim.getTable('orders'), sql), sql };
  }

  function regen() {
    const ri = $('#trace-ri').value;
    const res = makeEvent(op, ri);
    stages = res.stages; sqlText = res.sql;
    if (selected >= stages.length) selected = 0;
    render();
  }

  function render() {
    const opName = { c: 'INSERT', u: 'UPDATE', d: 'DELETE' }[op];
    $('#trace-head').innerHTML = `<span class="dbi-tracing">Tracing</span> <span class="cdc-ev-op cdc-ev-${op}">${opName}</span> <code>${esc(sqlText.replace(/\n\s*/g, ' '))}</code>`;
    $('#trace-rail').innerHTML = stages.map((s, i) => `
      <button class="dbi-step ${i === selected ? 'active' : ''} ${i < selected ? 'done' : ''}" data-i="${i}">
        <span class="dbi-step-n">${i + 1}</span>
        <span class="dbi-step-ic">${s.icon}</span>
        <span class="dbi-step-t">${esc(s.title)}</span>
      </button>${i < stages.length - 1 ? '<span class="dbi-arrow">→</span>' : ''}`).join('');
    const st = stages[selected];
    $('#trace-detail').innerHTML = `
      <div class="dbi-detail-head"><span class="dbi-step-ic">${st.icon}</span> <strong>Stage ${selected + 1} of ${stages.length} — ${esc(st.title)}</strong></div>
      <div class="dbi-explain">${esc(st.explain)}</div>
      ${renderArtifact(st)}
      <div class="dbi-stepnav">
        <button class="ctrl-btn" data-nav="prev" ${selected === 0 ? 'disabled' : ''}>← Prev</button>
        <button class="ctrl-btn" data-nav="next" ${selected === stages.length - 1 ? 'disabled' : ''}>Next →</button>
      </div>`;
  }

  tab.querySelector('.cdc-lab-controls').addEventListener('click', e => {
    const b = e.target.closest('button[data-op]'); if (!b) return;
    op = b.dataset.op; selected = 0; regen();
  });
  $('#trace-ri').addEventListener('change', regen);
  $('#trace-rail').addEventListener('click', e => {
    const b = e.target.closest('.dbi-step'); if (!b) return;
    selected = +b.dataset.i; render();
  });
  $('#trace-detail').addEventListener('click', e => {
    const nav = e.target.closest('button[data-nav]'); if (!nav) return;
    if (nav.dataset.nav === 'prev' && selected > 0) selected--;
    if (nav.dataset.nav === 'next' && selected < stages.length - 1) selected++;
    render();
  });

  regen();
}

// ── Tab 2: pgoutput Protocol ────────────────────────────────────────────────
const PGO_TYPES = [
  ['BEGIN', 'Start of a transaction — final LSN, commit timestamp, xid.'],
  ['RELATION', 'Table shape: OID, namespace, name, replica identity, columns. Sent once per relation, then cached.'],
  ['INSERT', 'A new row — carries the new tuple (N) only.'],
  ['UPDATE', 'A changed row — new tuple (N), plus an old tuple as K (key, DEFAULT) or O (full row, FULL).'],
  ['DELETE', 'A removed row — old tuple as K (key) or O (full), per replica identity.'],
  ['TRUNCATE', 'A TRUNCATE of one or more relations (no per-row events).'],
  ['COMMIT', 'End of the transaction — commit LSN and end LSN; now decodable downstream.'],
  ['TYPE', 'Describes a non-built-in data type referenced by a RELATION.'],
  ['ORIGIN', 'Marks the replication origin — used to avoid loops in bidirectional setups.'],
  ['MESSAGE', 'A logical decoding message (pg_logical_emit_message) — e.g. the outbox "message" op.'],
];

function buildPgoutput(container) {
  const tab = container.querySelector('#tab-pgoutput');
  tab.innerHTML = `
    <div class="prose-block">
      <h3>pgoutput: how the WAL becomes row events</h3>
      <p>In <a href="#m24">M24</a> you saw the WAL and the replication slot. <strong>pgoutput</strong> is the piece that reads them: it\'s PostgreSQL\'s built-in <strong>logical-decoding output plugin</strong> (since PG&nbsp;10). Physical WAL records describe <em>block-level</em> byte changes; logical decoding reconstructs them into <em>row-level</em> messages a client can understand, delivered in commit order through the slot. Debezium\'s Postgres connector speaks this protocol directly — no triggers, no polling.</p>
      <div class="callout callout-note"><div class="callout-head">🔑 One slot, one ordered stream</div><p>The slot hands out messages in a single total order. That\'s why a Postgres Debezium connector is <strong>single-task</strong> — you can\'t split one WAL across parallel readers without breaking order. Parallelism lives <em>after</em> Kafka.</p></div>
    </div>
    <h3 class="dbi-h">The message types</h3>
    <div class="dbi-types">
      ${PGO_TYPES.map(([t, d]) => `<div class="dbi-type"><code class="dbi-type-t">${t}</code><span>${esc(d)}</span></div>`).join('')}
    </div>
    <h3 class="dbi-h">Decode a change into frames</h3>
    <div class="cdc-scope-note">⚠️ Deterministic simulation. Frames model the shape and order of real pgoutput messages; toggle the operation and REPLICA IDENTITY and watch the old-tuple submessage change.</div>
    <div class="cdc-lab-controls">
      <div class="cdc-ctrl-group">
        <span class="cdc-ctrl-label">Operation</span>
        <button class="ctrl-btn" data-pop="c">INSERT</button>
        <button class="ctrl-btn" data-pop="u">UPDATE</button>
        <button class="ctrl-btn" data-pop="d">DELETE</button>
      </div>
      <div class="cdc-ctrl-group">
        <span class="cdc-ctrl-label">REPLICA IDENTITY</span>
        <select class="study-select" id="pgo-ri">
          <option value="default">DEFAULT (PK only)</option>
          <option value="full">FULL (all columns)</option>
        </select>
      </div>
      <label class="cdc-check"><input type="checkbox" id="pgo-rel" checked> include RELATION (first time seen)</label>
    </div>
    <div id="pgo-out"></div>`;

  const $ = s => container.querySelector(s);
  let pop = 'u';
  const table = { name: 'orders', pk: 'id', columns: ['id', 'customer', 'status', 'amount'] };

  function change(whichOp) {
    const before = { id: 1001, customer: 'alice', status: 'NEW', amount: 50 };
    const after = { id: 1001, customer: 'alice', status: 'PAID', amount: 50 };
    if (whichOp === 'c') return { op: 'c', table: 'orders', key: 1002, before: null, after: { id: 1002, customer: 'bob', status: 'NEW', amount: 60 }, lsn: 44, txId: 910 };
    if (whichOp === 'd') return { op: 'd', table: 'orders', key: 1001, before, after: null, lsn: 44, txId: 910 };
    return { op: 'u', table: 'orders', key: 1001, before, after, lsn: 44, txId: 910 };
  }

  function render() {
    const ri = $('#pgo-ri').value;
    const po = pgoutputFrames(change(pop), { ...table, replicaIdentity: ri }, { includeRelation: $('#pgo-rel').checked });
    $('#pgo-out').innerHTML = renderFrames(po);
    tab.querySelectorAll('button[data-pop]').forEach(b => b.classList.toggle('active', b.dataset.pop === pop));
  }

  tab.querySelector('.cdc-lab-controls').addEventListener('click', e => {
    const b = e.target.closest('button[data-pop]'); if (!b) return;
    pop = b.dataset.pop; render();
  });
  $('#pgo-ri').addEventListener('change', render);
  $('#pgo-rel').addEventListener('change', render);
  render();
}

// ── Tab 3: Internal State & Topics ──────────────────────────────────────────
function buildState(container) {
  const tab = container.querySelector('#tab-state');
  const card = (s) => `
    <div class="dbi-store dbi-store-${s.kind}">
      <div class="dbi-store-head">
        <span class="dbi-store-badge dbi-badge-${s.kind}">${s.kind === 'database' ? '🗄️ Postgres' : '📨 Kafka'}</span>
        ${s.single ? '<span class="dbi-store-badge dbi-badge-single">single</span>' : ''}
        <span class="dbi-store-name">${esc(s.name)}</span>
      </div>
      <div class="dbi-store-holds"><strong>Holds:</strong> ${esc(s.holds)}</div>
      <div class="dbi-store-breaks"><strong>Lose it:</strong> ${esc(s.breaks)}</div>
    </div>`;
  tab.innerHTML = `
    <div class="prose-block">
      <h3>Debezium's state lives in two homes</h3>
      <p>A connector is more than a stream — it carries <strong>durable state</strong>, and it\'s split across two places. On the <strong>database side</strong> sits the replication slot. On the <strong>Kafka/Connect side</strong> sit a handful of internal topics. Knowing what each holds — and what breaks when you lose it — is most of Debezium operations.</p>
      <div class="callout callout-key"><div class="callout-head">🔑 The resume-vs-re-snapshot pair</div><p>Two positions decide whether a restart <em>resumes</em> or has to <em>re-snapshot</em>: the slot\'s <code>confirmed_flush_lsn</code> (database side) and the connector\'s source offset in the <strong>offsets topic</strong> (Connect side). If the offset is valid <em>and</em> the slot still has the WAL after it, the connector resumes with zero data loss. Lose either and it falls back to a snapshot.</p></div>
    </div>
    <h3 class="dbi-h">🗄️ Database side</h3>
    <div class="dbi-stores">${INTERNAL_STORES.filter(s => s.kind === 'database').map(card).join('')}</div>
    <h3 class="dbi-h">📨 Kafka / Connect side</h3>
    <div class="dbi-stores">${INTERNAL_STORES.filter(s => s.kind === 'kafka').map(card).join('')}</div>
    <div class="callout callout-note"><div class="callout-head">⚠️ The never-delete topic</div><p>The <strong>schema history topic</strong> is the one to guard with your life. It records every DDL so the connector can rebuild the exact table structure at any historical LSN. Delete or truncate it and the connector can no longer interpret older events — it refuses to start and needs a fresh snapshot. It should be a dedicated, <em>non-compacted</em> topic that only this connector writes.</p></div>`;
}

// ── Tab 4: Snapshots & Delivery ─────────────────────────────────────────────
function buildSnapshot(container) {
  const tab = container.querySelector('#tab-snapshot');
  tab.innerHTML = `
    <div class="prose-block">
      <h3>Snapshot internals &amp; delivery semantics</h3>
      <p>Two deep questions this tab answers: <strong>how</strong> a connector loads the baseline (and backfills without stopping), and <strong>why</strong> plain CDC is at-least-once — plus what to do about it.</p>
    </div>

    <h3 class="dbi-h">① <code>snapshot.mode</code> — what happens on startup</h3>
    <div class="dbi-modes-wrap">
      <table class="dbi-modes">
        <thead><tr><th>mode</th><th>On first start</th><th>On restart</th><th>When to use</th></tr></thead>
        <tbody>
          ${SNAPSHOT_MODES.map(m => `<tr><td><code>${esc(m.mode)}</code></td><td>${esc(m.onFirstStart)}</td><td>${esc(m.onRestart)}</td><td>${esc(m.use)}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>

    <h3 class="dbi-h">② Incremental snapshot (DBLog) — backfill without stopping the stream</h3>
    <div class="cdc-scope-note">⚠️ Deterministic simulation of the watermark algorithm. Toggle a concurrent change and watch the streamed value win over the snapshot read.</div>
    <div class="cdc-lab-controls">
      <div class="cdc-ctrl-group"><span class="cdc-ctrl-label">Keys to snapshot</span><span class="dbi-keys">1, 2, 3, 4, 5, 6</span></div>
      <div class="cdc-ctrl-group"><span class="cdc-ctrl-label">Chunk size</span>
        <select class="study-select" id="inc-chunk"><option value="2">2</option><option value="3">3</option></select>
      </div>
      <label class="cdc-check"><input type="checkbox" id="inc-concurrent"> a streamed UPDATE hits key 3 mid-snapshot</label>
      <button class="ctrl-btn" id="inc-run">▶ Run incremental snapshot</button>
    </div>
    <div id="inc-out"></div>

    <h3 class="dbi-h">③ At-least-once delivery — where duplicates come from</h3>
    <div class="cdc-scope-note">⚠️ Deterministic simulation. The offset is committed periodically, not per event — crash in the gap and the restart re-emits.</div>
    <div class="cdc-lab-controls">
      <div class="cdc-ctrl-group"><span class="cdc-ctrl-label">Produce</span><button class="ctrl-btn" id="dl-emit">＋ Emit a change to Kafka</button></div>
      <div class="cdc-ctrl-group"><span class="cdc-ctrl-label">Checkpoint</span><button class="ctrl-btn" id="dl-commit">💾 Commit source offset</button></div>
      <div class="cdc-ctrl-group"><span class="cdc-ctrl-label">Failure</span><button class="ctrl-btn" id="dl-crash">💥 Crash &amp; restart</button></div>
      <button class="ctrl-btn cdc-reset" id="dl-reset">↺ Reset</button>
    </div>
    <div id="dl-out"></div>`;

  const $ = s => container.querySelector(s);

  // ② incremental snapshot
  function renderInc() {
    const chunk = +$('#inc-chunk').value;
    const concurrent = $('#inc-concurrent').checked ? 3 : null;
    const plan = incrementalSnapshotPlan([1, 2, 3, 4, 5, 6], chunk, concurrent);
    const label = { 'low-watermark': 'LOW watermark', 'read': 'Read chunk', 'high-watermark': 'HIGH watermark', 'done': 'Done' };
    $('#inc-out').innerHTML = `<div class="dbi-inc">${plan.steps.map(st => {
      const dedupe = (st.phase === 'read' && st.deduped && st.deduped.length)
        ? `<span class="dbi-dedupe">key ${st.deduped.join(', ')} → snapshot read dropped (stream wins)</span>` : '';
      return `<div class="dbi-inc-step dbi-inc-${st.phase}"><span class="dbi-inc-tag">${label[st.phase]}${st.chunk ? ' · chunk ' + st.chunk : ''}</span><span class="dbi-inc-detail">${esc(st.detail)} ${dedupe}</span></div>`;
    }).join('')}</div>
    <div class="callout callout-note"><div class="callout-head">Why the watermarks matter</div><p>Streaming never pauses. The low/high watermark pair defines a window; if a streamed change for a key arrives inside that key\'s window, the buffered snapshot read for that key is <strong>discarded</strong> so it can\'t overwrite the newer value. No lock, no stop-the-world, resumable chunk by chunk.</p></div>`;
  }

  // ③ delivery semantics
  let emitted = [], committed = 0, nextLsn = 101, log = [];
  function renderDl() {
    const head = emitted.length ? Math.max(...emitted) : committed;
    const uncommitted = emitted.filter(l => l > committed);
    $('#dl-out').innerHTML = `
      <div class="dbi-dl-state">
        <div class="cdc-metric"><span>Produced to Kafka (LSNs)</span><strong>${emitted.join(', ') || '—'}</strong></div>
        <div class="cdc-metric"><span>Committed source offset</span><strong>${committed || '—'}</strong></div>
        <div class="cdc-metric"><span>In the danger window (produced, not committed)</span><strong class="${uncommitted.length ? 'cdc-warn-text' : 'cdc-ok-text'}">${uncommitted.join(', ') || 'none'}</strong></div>
      </div>
      <div class="dbi-dl-log">${log.map(l => `<div class="dbi-dl-line ${l.kind}">${esc(l.text)}</div>`).join('') || '<div class="cdc-empty">Emit a few changes, commit the offset once, then crash — watch what re-appears.</div>'}</div>`;
  }

  $('#inc-run').addEventListener('click', renderInc);
  $('#inc-chunk').addEventListener('change', renderInc);
  $('#inc-concurrent').addEventListener('change', renderInc);

  $('#dl-emit').addEventListener('click', () => {
    const lsn = nextLsn++; emitted.push(lsn);
    log.push({ kind: 'emit', text: `→ produced change LSN ${lsn} to Kafka (offset not yet committed)` });
    renderDl();
  });
  $('#dl-commit').addEventListener('click', () => {
    if (!emitted.length) return;
    committed = Math.max(...emitted);
    log.push({ kind: 'commit', text: `💾 committed source offset up to LSN ${committed}` });
    renderDl();
  });
  $('#dl-crash').addEventListener('click', () => {
    const r = atLeastOnceReplay(emitted, committed);
    if (!r.duplicateCount) {
      log.push({ kind: 'ok', text: `💥 crash + restart — resume from committed LSN ${committed}. Nothing was in the danger window, so no duplicates.` });
    } else {
      log.push({ kind: 'dup', text: `💥 crash + restart — resume from committed LSN ${committed}. Re-emitting ${r.redelivered.join(', ')} → ${r.duplicateCount} DUPLICATE${r.duplicateCount > 1 ? 'S' : ''} in Kafka.` });
      log.push({ kind: 'cure', text: `🛟 cure: an idempotent sink (UPSERT by key) or dedupe on source.lsn makes each redelivered event a ${r.idempotentOutcome}.` });
      // the redelivered events reappear on the topic
      r.redelivered.forEach(l => emitted.push(l));
    }
    renderDl();
  });
  $('#dl-reset').addEventListener('click', () => {
    emitted = []; committed = 0; nextLsn = 101; log = []; renderDl();
  });

  renderInc();
  renderDl();
}
