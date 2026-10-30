// M28 — Debezium Configuration & Operations. The connector properties that
// matter, and running it in production: replication-slot WAL growth, outages,
// missing WAL, heartbeats, and what to monitor/alert on. Includes an
// interactive ops console that injects failures and diagnoses them live.
import { createModuleShell, createIQSection } from '../components/module-shell.js';
import CDCSim from '../sim/cdc-engine.js';

export const IQ = [
  {
    q: 'Walk through the key configuration properties of a PostgreSQL Debezium connector.',
    a: 'The essentials: <code>connector.class</code> = <code>io.debezium.connector.postgresql.PostgresConnector</code>; the <code>database.*</code> connection props; <strong><code>topic.prefix</code></strong> — a required, unique logical name that prefixes every topic and identifies the server in the <code>source</code> block; <strong><code>plugin.name</code></strong> = <code>pgoutput</code> (the built-in logical decoding plugin, Postgres 10+); <strong><code>slot.name</code></strong> and <strong><code>publication.name</code></strong> — the replication slot and publication to use; <strong><code>publication.autocreate.mode</code></strong> — <code>all_tables</code> (needs superuser), <code>filtered</code> (create/limit to the include list), or <code>disabled</code> (you pre-create it); <strong><code>table.include.list</code></strong> — which <code>schema.table</code>s to capture; <strong><code>snapshot.mode</code></strong> (M26); <strong><code>heartbeat.interval.ms</code></strong> — keep the slot advancing when captured tables are idle; <strong><code>signal.data.collection</code></strong> — the signaling table for incremental snapshots; <code>tombstones.on.delete</code>; and the <code>key.converter</code>/<code>value.converter</code> (JSON, or Avro/Protobuf + Schema Registry).',
    tip: 'Lead with topic.prefix (required + unique, and it names the server in every event\'s source block) and plugin.name=pgoutput (the modern built-in). Those two signal you\'ve actually configured a recent connector.',
  },
  {
    q: 'Your source database disk is filling and the alert points at replication-slot lag. Diagnose and fix.',
    a: 'The slot is retaining WAL that the connector hasn\'t confirmed, and Postgres can\'t recycle it. Diagnose: check <code>pg_replication_slots</code> — is the slot <strong>active</strong>? Compare <code>confirmed_flush_lsn</code> to the current WAL position (<code>pg_wal_lsn_diff</code>) to measure the lag in bytes. Then find why it isn\'t advancing: (a) the connector/task is <strong>down or failing</strong> (restart it, fix the error); (b) it\'s <strong>lagging</strong> under load (scale downstream, speed up the sink, or split tables across connectors); or (c) the <strong>"quiet tables" trap</strong> — all the write activity is on tables you\'re <em>not</em> capturing, so the slot never gets anything to confirm. Fixes: get the connector healthy, enable <strong><code>heartbeat.interval.ms</code></strong> (plus <code>heartbeat.action.query</code> so an idle DB still produces a WAL record to confirm), set <strong><code>max_slot_wal_keep_size</code></strong> as a safety cap (past it the slot is invalidated → you re-snapshot, but the primary survives), and <strong>drop slots you no longer use</strong> — an orphaned slot from a deleted connector will fill a disk silently.',
    tip: 'Structure it: confirm it\'s the slot (pg_replication_slots), find why it\'s not advancing (down / lagging / quiet tables), then fix + prevent (heartbeats, max_slot_wal_keep_size, drop orphans). Mentioning orphaned slots from deleted connectors is the detail that lands.',
  },
  {
    q: 'What do you monitor and alert on for a CDC pipeline?',
    a: 'Four layers. <strong>Source:</strong> replication-slot lag in bytes (distance from <code>confirmed_flush_lsn</code> to the WAL head) and whether the slot is active — the disk-fill early warning. <strong>Connector:</strong> connector/task <em>state</em> (alert the moment a task is not RUNNING), restart count, and snapshot progress. <strong>End-to-end latency:</strong> <code>now − source.ts_ms</code> on emitted events — real replication lag, not just queue depth. <strong>Downstream:</strong> consumer lag on the CDC topics, and the <strong>dead-letter queue rate</strong> (poison records). The single most important proactive alert is <em>slot lag bytes</em>, because that\'s the one that takes the <em>source database</em> down — everything else degrades the pipeline, but a full WAL disk degrades production.',
    tip: 'Rank them: slot-lag-bytes first (it threatens the primary), then task-not-RUNNING, then end-to-end lag via source.ts_ms, then DLQ rate. Showing you know which alert protects the database vs the pipeline is the senior signal.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M28 · Change Data Capture',
    title: 'Debezium Config & Operations',
    subtitle: 'The connector properties that matter, and running it for real — replication-slot WAL growth, outages, missing WAL, heartbeats, and what to monitor and alert on.',
    tabs: [
      { id: 'config', label: '⚙️ Configuration' },
      { id: 'ops', label: '🚨 Operations & Failure' },
      { id: 'iq', label: '🎯 Interview Q&A' },
    ],
  });
  buildConfig(container);
  const cleanup = buildOps(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

function buildConfig(container) {
  const tab = container.querySelector('#tab-config');
  const cfg = [
    ['name', '"orders-cdc"', 'The connector\'s name in Kafka Connect.'],
    ['connector.class', '"io.debezium.connector.postgresql.PostgresConnector"', 'The PostgreSQL Debezium connector.'],
    ['database.hostname / .port / .user / .password / .dbname', '…', 'Connection. The user needs REPLICATION + LOGIN and SELECT on captured tables.'],
    ['topic.prefix', '"shop"', 'REQUIRED, unique. Prefixes every topic and names the server in each event\'s source block.'],
    ['plugin.name', '"pgoutput"', 'Logical decoding plugin — built in since Postgres 10, nothing to install.'],
    ['slot.name', '"orders_cdc_slot"', 'The replication slot this connector owns. Unique per connector.'],
    ['publication.name', '"dbz_orders"', 'The publication (set of tables) streamed via pgoutput.'],
    ['publication.autocreate.mode', '"filtered"', 'all_tables (needs superuser) · filtered (limit to include list) · disabled (pre-create it yourself).'],
    ['table.include.list', '"public.orders,public.order_items"', 'Which schema.tables to capture (regex). Counterpart: table.exclude.list.'],
    ['snapshot.mode', '"initial"', 'How to handle pre-existing data (M26): initial / initial_only / no_data / never / always / recovery.'],
    ['heartbeat.interval.ms', '"10000"', 'Emit heartbeats so the slot advances even when captured tables are idle (the quiet-tables fix).'],
    ['signal.data.collection', '"public.dbz_signal"', 'Signaling table for incremental / ad-hoc snapshots.'],
    ['tombstones.on.delete', '"true"', 'Emit a tombstone (key + null) after each delete, so compacted topics can drop the key.'],
    ['key.converter / value.converter', 'JSON or Avro + Schema Registry', 'On-the-wire format. Avro/Protobuf + registry for compact, typed, compatibility-checked events.'],
  ];
  tab.innerHTML = `
    <div class="prose-block">
      <h3>A real connector config, annotated</h3>
      <p>A Debezium connector is just a JSON config posted to Kafka Connect\'s REST API. Here are the properties that actually matter for a PostgreSQL source — the rest have sensible defaults.</p>
    </div>
    <pre class="cdc-json cdc-config"><code>POST /connectors
{
  "name": "orders-cdc",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "pg", "database.port": "5432",
    "database.user": "debezium", "database.dbname": "shop",
    "topic.prefix": "shop",
    "plugin.name": "pgoutput",
    "slot.name": "orders_cdc_slot",
    "publication.name": "dbz_orders",
    "publication.autocreate.mode": "filtered",
    "table.include.list": "public.orders,public.order_items",
    "snapshot.mode": "initial",
    "heartbeat.interval.ms": "10000",
    "signal.data.collection": "public.dbz_signal",
    "tombstones.on.delete": "true",
    "key.converter": "io.confluent.connect.avro.AvroConverter",
    "value.converter": "io.confluent.connect.avro.AvroConverter"
  }
}</code></pre>
    <div class="cdc-cfg-table">
      <table class="cdc-tbl">
        <thead><tr><th>Property</th><th>Example</th><th>What it does</th></tr></thead>
        <tbody>${cfg.map(([k, v, d]) => `<tr><td><code>${k}</code></td><td class="cdc-cfg-val">${v}</td><td>${d}</td></tr>`).join('')}</tbody>
      </table>
    </div>
    <p class="cdc-note-line">Property names and defaults track the current Debezium release line; confirm them against your pinned version\'s docs before production (the forthcoming Docker lab pins an exact version).</p>`;
}

function buildOps(container) {
  const tab = container.querySelector('#tab-ops');
  tab.innerHTML = `
    <div class="cdc-scope-note">⚠️ Deterministic simulation of an ops console. Inject failures and read the live diagnosis; metrics model the real mechanics (slot lag, connector state, replication lag).</div>
    <div class="cdc-ops">
      <div class="cdc-ops-metrics" id="ops-metrics"></div>
      <div class="cdc-ops-diag" id="ops-diag"></div>
      <div class="cdc-lab-controls">
        <div class="cdc-ctrl-group">
          <span class="cdc-ctrl-label">Normal</span>
          <button class="ctrl-btn" data-act="traffic">📨 Traffic + poll</button>
        </div>
        <div class="cdc-ctrl-group">
          <span class="cdc-ctrl-label">Inject failure</span>
          <button class="ctrl-btn" data-act="outage">⏸ Connector outage</button>
          <button class="ctrl-btn" data-act="load">📈 Writes during outage</button>
          <button class="ctrl-btn" data-act="walloss">⛔ WAL recycled</button>
        </div>
        <div class="cdc-ctrl-group">
          <span class="cdc-ctrl-label">Remediate</span>
          <button class="ctrl-btn" data-act="heartbeat">💓 Heartbeat</button>
          <button class="ctrl-btn" data-act="resume">▶ Resume + catch up</button>
          <button class="ctrl-btn" data-act="recover">🛟 Re-snapshot</button>
        </div>
        <button class="ctrl-btn cdc-reset" data-act="reset">↺ Reset</button>
      </div>
      <div class="cdc-box">
        <div class="cdc-box-head">📟 What to monitor &amp; alert on</div>
        <div class="cdc-box-body">
          <div class="cdc-alert-grid">
            <div class="cdc-alert"><span class="cdc-alert-rank">1</span><div><strong>Replication-slot lag (bytes)</strong> — distance from <code>confirmed_flush_lsn</code> to the WAL head. The one alert that protects the <em>source database</em> from a full disk. Page on it.</div></div>
            <div class="cdc-alert"><span class="cdc-alert-rank">2</span><div><strong>Connector/task state</strong> — alert the instant a task is not RUNNING, plus restart count.</div></div>
            <div class="cdc-alert"><span class="cdc-alert-rank">3</span><div><strong>End-to-end lag</strong> — <code>now − source.ts_ms</code> on events; real replication latency, not just queue depth.</div></div>
            <div class="cdc-alert"><span class="cdc-alert-rank">4</span><div><strong>DLQ rate &amp; downstream consumer lag</strong> — poison records and whether sinks keep up.</div></div>
          </div>
        </div>
      </div>
    </div>`;

  let sim, nextId;
  const $ = s => container.querySelector(s);
  function fresh() {
    sim = new CDCSim({ seed: 13 });
    sim.createTable('orders', { pk: 'id', columns: ['id', 'status', 'amount'] });
    nextId = 1;
    // establish a healthy baseline
    for (let i = 0; i < 2; i++) sim.applyInsert('orders', { id: nextId++, status: 'NEW', amount: 30 });
    sim.poll();
  }

  function health() {
    const b = sim.walBacklog();
    if (sim.connector.needsSnapshot) return 'failed';
    if (b.records >= 6) return 'critical';
    if (!sim.connector.running) return 'warn';
    if (b.records > 0) return 'warn';
    return 'ok';
  }

  const DIAG = {
    ok: { t: '✅ Healthy', c: 'ok', m: 'Connector RUNNING, slot advancing, backlog near zero. This is steady state — the slot confirms as fast as writes arrive.' },
    warn: { t: '⚠️ Slot lag building', c: 'warn', m: '<strong>Symptom:</strong> retained WAL is growing. <strong>Cause:</strong> the slot isn\'t advancing — the connector is paused, lagging, or all writes are on uncaptured tables. <strong>Fix:</strong> resume/scale the connector, or enable a heartbeat so the slot advances.' },
    critical: { t: '🔴 WAL piling up — source disk at risk', c: 'crit', m: '<strong>Symptom:</strong> large retained WAL, slot not confirming. <strong>Cause:</strong> consumer well behind / down. <strong>Fix NOW:</strong> get the connector RUNNING and catching up; add a heartbeat; set <code>max_slot_wal_keep_size</code> as a cap. This is the path to a full primary disk.' },
    failed: { t: '⛔ Connector failed — required WAL gone', c: 'crit', m: '<strong>Symptom:</strong> streaming can\'t resume; slot invalid. <strong>Cause:</strong> the WAL the slot needed was recycled (outage too long / cap exceeded). <strong>Fix:</strong> there\'s no position to stream from — take a fresh snapshot (re-snapshot) to rebuild the connector\'s position, then prevent recurrence with heartbeats + a slot size cap.' },
  };

  function render() {
    const b = sim.walBacklog();
    const h = health();
    $('#ops-metrics').innerHTML = `
      <div class="cdc-ops-metric cdc-ops-${sim.connector.needsSnapshot ? 'crit' : (sim.connector.running ? 'ok' : 'warn')}"><div class="cdc-ops-k">Connector</div><div class="cdc-ops-v">${sim.connector.needsSnapshot ? 'FAILED' : (sim.connector.running ? 'RUNNING' : 'PAUSED')}</div></div>
      <div class="cdc-ops-metric cdc-ops-${b.records >= 6 ? 'crit' : (b.records ? 'warn' : 'ok')}"><div class="cdc-ops-k">Slot lag</div><div class="cdc-ops-v">${b.records} rec · ~${b.bytes} B</div></div>
      <div class="cdc-ops-metric"><div class="cdc-ops-k">confirmed_flush_lsn</div><div class="cdc-ops-v">${sim.slot.confirmedFlushLsn}</div></div>
      <div class="cdc-ops-metric"><div class="cdc-ops-k">WAL head</div><div class="cdc-ops-v">${Math.max(0, sim.nextLsn - 1)}</div></div>
      <div class="cdc-ops-metric cdc-ops-${sim.slot.invalid ? 'crit' : 'ok'}"><div class="cdc-ops-k">Slot state</div><div class="cdc-ops-v">${sim.slot.invalid ? 'INVALID' : 'ok'}</div></div>
      <div class="cdc-ops-metric"><div class="cdc-ops-k">Events delivered</div><div class="cdc-ops-v">${sim.bronze.length}</div></div>`;
    const d = DIAG[h];
    $('#ops-diag').innerHTML = `<div class="cdc-diag cdc-diag-${d.c}"><div class="cdc-diag-t">${d.t}</div><div class="cdc-diag-m">${d.m}</div></div>`;

    const dis = (a, on) => { const btn = tab.querySelector(`[data-act="${a}"]`); if (btn) btn.disabled = on; };
    dis('load', sim.connector.running);
    dis('resume', sim.connector.running || sim.connector.needsSnapshot);
    dis('recover', !sim.connector.needsSnapshot);
    dis('walloss', b.records === 0 || sim.connector.needsSnapshot);
    dis('traffic', sim.connector.needsSnapshot);
  }

  tab.querySelector('.cdc-lab-controls').addEventListener('click', e => {
    const act = e.target.closest('button')?.dataset.act;
    if (!act) return;
    try {
      if (act === 'traffic') { sim.applyInsert('orders', { id: nextId++, status: 'NEW', amount: 44 }); sim.poll(); }
      else if (act === 'outage') { sim.stopConnector(); }
      else if (act === 'load') { for (let i = 0; i < 3; i++) sim.applyInsert('orders', { id: nextId++, status: 'NEW', amount: 44 }); }
      else if (act === 'walloss') { sim.simulateWalLoss(); }
      else if (act === 'heartbeat') { sim.heartbeat(); }
      else if (act === 'resume') { sim.startConnector(); sim.poll(); }
      else if (act === 'recover') { sim.startConnector(); sim.snapshot('orders'); }
      else if (act === 'reset') { fresh(); }
    } catch (err) {}
    render();
  });

  fresh();
  render();
  return null;
}
