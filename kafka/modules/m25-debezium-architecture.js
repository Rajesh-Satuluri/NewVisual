// M25 — Debezium Architecture & Lifecycle. What Debezium actually is (a set of
// Kafka Connect source connectors), how it rides the Connect framework, and the
// connector's life from create → snapshot → streaming → pause/restart → failure
// and recovery. Includes an interactive lifecycle machine on the CDC engine.
import { createModuleShell, createIQSection } from '../components/module-shell.js';
import CDCSim from '../sim/cdc-engine.js';

export const IQ = [
  {
    q: 'What is Debezium, and how does it relate to Kafka Connect?',
    a: 'Debezium is an open-source <strong>change data capture platform</strong> — a family of source connectors (PostgreSQL, MySQL, MongoDB, SQL Server, Oracle, …) that read a database\'s transaction log and emit row-level change events. It is not a standalone service: a Debezium connector <strong>runs inside Kafka Connect</strong>, the same worker framework you use for any source/sink (M12). Connect gives it the things you would otherwise build yourself: a distributed, fault-tolerant worker cluster, automatic <strong>offset storage</strong> (the connector\'s processed position, kept in a Connect internal topic), restart handling, a REST API for lifecycle management, and pluggable converters (JSON/Avro) and SMTs. For PostgreSQL the connector uses logical decoding via <code>pgoutput</code>, keeps a replication slot, and runs as a <strong>single task</strong> — one ordered stream per database, because the WAL is a single ordered log.',
    tip: 'Say "Debezium is a Kafka Connect source connector," not "a tool that writes to Kafka." The distinction shows you know Connect manages its offsets, restarts, and scaling — and that a Postgres connector is single-task by nature.',
  },
  {
    q: 'Where does a Debezium connector store its progress, and what happens on a restart?',
    a: 'Two different positions, in two different places. On the <strong>database side</strong>, the replication slot holds <code>confirmed_flush_lsn</code> — how far into the WAL the connector has acknowledged. On the <strong>Connect side</strong>, the connector\'s source offset (essentially the last LSN it processed) is written to Connect\'s internal <code>offsets</code> topic. On a normal restart, the connector reads its stored offset and <strong>resumes streaming from the slot at that position</strong> — no snapshot, no data loss, because the WAL after that point was retained by the slot. The dangerous case is when the WAL it needs is already gone (slot invalidated, or a very long outage): then it cannot resume and must take a <strong>fresh snapshot</strong> to rebuild its position. That is why slot health and WAL retention are the things you watch.',
    tip: 'Name both positions: the slot\'s confirmed_flush_lsn (database side) and the Connect offsets topic (connector side). Interviewers probing restart behaviour want to hear "resumes from the stored offset via the slot — unless the required WAL was lost, then it re-snapshots."',
  },
  {
    q: 'Why does a PostgreSQL Debezium connector run as a single task, and what does that mean for scaling?',
    a: 'The WAL is one totally-ordered log, and logical decoding reads it through one replication slot — so the connector consumes it with a <strong>single task</strong>; you cannot split reading one WAL across parallel tasks without breaking order and duplicating the slot. That means you scale the <em>capture</em> vertically (the one task must keep up with the DB\'s write rate) and you scale <em>downstream</em> consumption by Kafka\'s normal mechanism: the connector writes to topics with many partitions (keyed by primary key for per-row ordering), and any number of consumers/consumer groups read those partitions in parallel. So capture is single-threaded by design; fan-out and parallel processing happen after Kafka. If one connector can\'t keep up, you split by <em>table set</em> across multiple connectors (each with its own slot), not by parallelising one.',
    tip: 'The clean mental model: "one WAL → one slot → one task → many Kafka partitions → many consumers." Parallelism lives after Kafka, not in the capture.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M25 · Change Data Capture',
    title: 'Debezium Architecture & Lifecycle',
    subtitle: 'What Debezium is (a Kafka Connect source connector), how it rides the Connect framework, and a connector\'s life from snapshot to streaming to failure and recovery.',
    tabs: [
      { id: 'arch', label: '🏗️ What Debezium Is' },
      { id: 'life', label: '🔄 Connector Lifecycle' },
      { id: 'iq', label: '🎯 Interview Q&A' },
    ],
  });
  buildArch(container);
  const cleanup = buildLifecycle(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

function buildArch(container) {
  const tab = container.querySelector('#tab-arch');
  tab.innerHTML = `
    <div class="prose-block">
      <h3>Debezium is a Kafka Connect source connector</h3>
      <p>In M24 you watched the WAL and the replication slot. <strong>Debezium is the thing that reads them.</strong> It\'s an open-source CDC platform — a family of connectors for PostgreSQL, MySQL, MongoDB, SQL Server, Oracle and more — and crucially it is <em>not</em> a separate server you run. A Debezium connector runs <strong>inside Kafka Connect</strong> (M12), the same worker framework that hosts every other source and sink. That one fact gives you most of what matters: a distributed, restartable worker cluster, automatic offset storage, a REST API, and pluggable converters and transforms.</p>

      <div class="cdc-arch-flow">
        <div class="cdc-arch-node cdc-arch-db"><div class="cdc-arch-ic">🗄️</div><div class="cdc-arch-t">PostgreSQL</div><div class="cdc-arch-s">WAL · replication slot · publication</div></div>
        <div class="cdc-arch-arrow">→<span>logical decoding (pgoutput)</span></div>
        <div class="cdc-arch-node cdc-arch-worker"><div class="cdc-arch-ic">⚙️</div><div class="cdc-arch-t">Kafka Connect worker</div><div class="cdc-arch-s">Debezium task → converter → SMTs</div></div>
        <div class="cdc-arch-arrow">→<span>change events</span></div>
        <div class="cdc-arch-node cdc-arch-kafka"><div class="cdc-arch-ic">📨</div><div class="cdc-arch-t">Kafka topics</div><div class="cdc-arch-s">one per table · keyed by PK</div></div>
        <div class="cdc-arch-arrow">→</div>
        <div class="cdc-arch-node cdc-arch-cons"><div class="cdc-arch-ic">🎧</div><div class="cdc-arch-t">Consumers</div><div class="cdc-arch-s">warehouse · search · services</div></div>
      </div>

      <h3>What Connect manages for it</h3>
      <div class="cdc-kv-grid">
        <div class="cdc-kv"><div class="cdc-kv-k">Workers, tasks &amp; distribution</div><div class="cdc-kv-v">A connector config runs as one or more <strong>tasks</strong> on a cluster of Connect <strong>workers</strong>. A PostgreSQL connector is <strong>single-task</strong> — one WAL, one slot, one ordered stream. If a worker dies, Connect restarts the task elsewhere.</div></div>
        <div class="cdc-kv"><div class="cdc-kv-k">Offset storage</div><div class="cdc-kv-v">The connector\'s processed position (its LSN) is written to Connect\'s internal <code>offsets</code> topic. On restart it reads this and resumes — <em>separate</em> from the slot\'s <code>confirmed_flush_lsn</code> on the database side.</div></div>
        <div class="cdc-kv"><div class="cdc-kv-k">REST lifecycle</div><div class="cdc-kv-v">Create, pause, resume, restart and delete connectors over Connect\'s REST API — the operations you\'ll drive by hand in the next tab.</div></div>
        <div class="cdc-kv"><div class="cdc-kv-k">Converters &amp; SMTs</div><div class="cdc-kv-v">Converters serialize events (JSON, or Avro/Protobuf with <a href="#m14">Schema Registry</a>); Single Message Transforms reshape them inline (flatten, route, mask) — covered in M27.</div></div>
      </div>

      <div class="callout callout-note">
        <div class="callout-head">🔗 Built on things you already know</div>
        <p>This is <a href="#m12">Kafka Connect (M12)</a> with a CDC source. The topics it writes are ordinary Kafka topics — partitioned, keyed, replicated — so everything from <a href="#m06">partitions (M06)</a> to <a href="#m14">Schema Registry (M14)</a> applies unchanged. Debezium\'s job is narrow: turn the WAL into well-formed events and hand them to Kafka.</p>
      </div>
    </div>`;
}

function buildLifecycle(container) {
  const tab = container.querySelector('#tab-life');
  const STATES = [
    { id: 'none', label: 'Not created', ic: '○' },
    { id: 'snapshot', label: 'Initial snapshot', ic: '📸' },
    { id: 'streaming', label: 'Streaming', ic: '🌊' },
    { id: 'paused', label: 'Paused', ic: '⏸' },
    { id: 'failed', label: 'Failed — WAL gone', ic: '⛔' },
  ];
  tab.innerHTML = `
    <div class="cdc-scope-note">⚠️ Deterministic simulation of the connector state machine — no real Connect worker. It models offsets, the slot, and WAL-loss recovery faithfully.</div>
    <div class="cdc-life">
      <div class="cdc-life-states" id="life-states">
        ${STATES.map(s => `<div class="cdc-life-state" data-state="${s.id}"><span class="cdc-life-ic">${s.ic}</span><span>${s.label}</span></div>`).join('')}
      </div>
      <div class="cdc-life-narrate" id="life-narrate"></div>
      <div class="cdc-life-metrics" id="life-metrics"></div>
      <div class="cdc-life-controls">
        <button class="ctrl-btn" data-act="create">① Create + initial snapshot</button>
        <button class="ctrl-btn" data-act="change">② Produce a change</button>
        <button class="ctrl-btn" data-act="pause">⏸ Pause</button>
        <button class="ctrl-btn" data-act="resume">▶ Resume</button>
        <button class="ctrl-btn" data-act="restart">↻ Restart worker</button>
        <button class="ctrl-btn" data-act="walloss">⛔ Lose required WAL</button>
        <button class="ctrl-btn" data-act="recover">🛟 Recover (re-snapshot)</button>
        <button class="ctrl-btn cdc-reset" data-act="reset">↺ Reset</button>
      </div>
    </div>`;

  const sim = new CDCSim({ seed: 3 });
  sim.createTable('orders', { pk: 'id', columns: ['id', 'status', 'amount'] });
  let phase = 'none';
  let nextId = 1;
  const $ = s => container.querySelector(s);

  // Seed a few committed rows (present before capture starts) so the initial
  // snapshot has something to read. Loaded with the connector "not created".
  function seed() {
    sim.stopConnector();
    for (let i = 0; i < 3; i++) sim.applyInsert('orders', { id: nextId++, status: 'NEW', amount: 30 + i * 10 });
    sim.startConnector();
    // rewind connector so these look pre-existing (snapshot will read them)
    sim.connector.lastLsn = 0; sim.slot.confirmedFlushLsn = 0; sim.connector.snapshotDone = false;
  }
  seed();

  const NARR = {
    none: 'The connector config exists but nothing is running. The replication slot has not been created yet; no events flow.',
    snapshot: 'Initial snapshot: the connector takes a consistent read of every captured table and emits a READ (op:r) event per existing row, recording the WAL position where the snapshot began.',
    streaming: 'Streaming: the connector reads committed changes from the slot and emits INSERT/UPDATE/DELETE events, advancing its offset and confirming the slot as it goes.',
    paused: 'Paused: the task is stopped but the slot remains. The WAL after the confirmed position is retained — safe for a short pause, dangerous if it lasts.',
    failed: 'Failed: the WAL the connector still needed was removed (slot invalidated / recycled). Streaming cannot resume from a position whose log is gone — the only way forward is a fresh snapshot.',
  };

  function render() {
    $('#life-states').querySelectorAll('.cdc-life-state').forEach(el =>
      el.classList.toggle('active', el.dataset.state === phase));
    $('#life-narrate').innerHTML = `<span class="cdc-life-phase cdc-life-phase-${phase}">${STATES.find(s => s.id === phase).label}</span> ${NARR[phase]}`;
    const b = sim.walBacklog();
    $('#life-metrics').innerHTML = `
      <div class="cdc-metric"><span>Connector offset (LSN)</span><strong>${sim.connector.lastLsn}</strong></div>
      <div class="cdc-metric"><span>Slot confirmed_flush_lsn</span><strong>${sim.slot.confirmedFlushLsn}</strong></div>
      <div class="cdc-metric"><span>WAL head</span><strong>${Math.max(0, sim.nextLsn - 1)}</strong></div>
      <div class="cdc-metric"><span>Retained WAL</span><strong class="${b.records >= 6 ? 'cdc-warn-text' : ''}">${b.records} rec</strong></div>
      <div class="cdc-metric"><span>Events delivered</span><strong>${sim.bronze.length}</strong></div>
      <div class="cdc-metric"><span>Slot state</span><strong class="${sim.slot.invalid ? 'cdc-warn-text' : 'cdc-ok-text'}">${sim.slot.invalid ? 'invalid' : 'ok'}</strong></div>`;

    const dis = (sel, on) => { const b = tab.querySelector(`[data-act="${sel}"]`); if (b) b.disabled = on; };
    dis('create', phase !== 'none');
    dis('change', !(phase === 'streaming' || phase === 'paused'));
    dis('pause', phase !== 'streaming');
    dis('resume', phase !== 'paused');
    dis('restart', phase === 'none' || phase === 'failed');
    dis('walloss', !(phase === 'paused' || phase === 'streaming') || sim.walBacklog().records === 0);
    dis('recover', phase !== 'failed');
  }

  tab.querySelector('.cdc-life-controls').addEventListener('click', e => {
    const act = e.target.closest('button')?.dataset.act;
    if (!act) return;
    try {
      if (act === 'create' && phase === 'none') { sim.snapshot('orders'); phase = 'streaming'; }
      else if (act === 'change' && (phase === 'streaming' || phase === 'paused')) {
        const ids = sim.currentState('orders').map(r => r.id);
        if (ids.length && Math.random() < 0.5) sim.applyUpdate('orders', ids[ids.length - 1], { status: 'PAID' });
        else sim.applyInsert('orders', { id: nextId++, status: 'NEW', amount: 55 });
        if (phase === 'streaming') sim.poll(); // while paused, the change just piles up in the WAL
      }
      else if (act === 'pause' && phase === 'streaming') { sim.stopConnector(); phase = 'paused'; }
      else if (act === 'resume' && phase === 'paused') { sim.startConnector(); sim.poll(); phase = 'streaming'; }
      else if (act === 'restart') {
        // simulate a worker restart: resume from the stored offset via the slot
        const was = phase; sim.startConnector(); sim.poll(); phase = (was === 'failed') ? 'failed' : 'streaming';
      }
      else if (act === 'walloss') { if (sim.simulateWalLoss()) phase = 'failed'; }
      else if (act === 'recover' && phase === 'failed') { sim.snapshot('orders'); phase = 'streaming'; }
      else if (act === 'reset') { sim.reset(); sim.createTable('orders', { pk: 'id', columns: ['id', 'status', 'amount'] }); nextId = 1; phase = 'none'; seed(); }
    } catch (err) {}
    render();
  });

  render();
  return null;
}
