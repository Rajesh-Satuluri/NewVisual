// M30 — Kafka → Lakehouse (Iceberg & Delta). The two distinct sink paths
// (Kafka Connect → Apache Iceberg, and Kafka → Spark Structured Streaming →
// Delta Lake), the medallion architecture, and why appending events is not a
// current-state table. Includes an interactive Bronze/Silver/Gold explorer.
import { createModuleShell, createIQSection } from '../components/module-shell.js';
import CDCSim from '../sim/cdc-engine.js';

export const IQ = [
  {
    q: 'Compare the two main ways to land Kafka data in a lakehouse: the Iceberg Kafka Connect sink vs Spark Structured Streaming to Delta.',
    a: 'Both read Kafka and write table-format files to object storage, but the mechanics differ. <strong>Iceberg Kafka Connect sink</strong>: a Connect connector where workers write data files and a <strong>central coordinator commits an Iceberg snapshot via a control topic</strong> on an interval (so data appears in batches, not per-record); exactly-once relies on Kafka transactions (KIP-447, Kafka ≥ 2.5); it needs an Iceberg <strong>catalog</strong> (REST, Glue, Hive, …) and does CDC upserts via <strong>equality deletes</strong> keyed on id-columns. <strong>Spark Structured Streaming → Delta</strong>: a Spark job does <code>writeStream.format("delta")</code> with a <strong>checkpointLocation</strong>; current-state upserts are done with <code>foreachBatch</code> + <code>MERGE INTO</code>; exactly-once comes from the checkpoint plus idempotent Delta commits (and, in foreachBatch, <code>txnAppId</code>/<code>txnVersion</code>). Rule of thumb: the Iceberg sink is the lighter, Connect-native path; Spark/Delta is the heavier, more flexible path when you already run Spark and need rich transforms.',
    tip: 'The one-liner per side: Iceberg = Connect sink + coordinator commits via a control topic; Delta = Spark writeStream + checkpoint + foreachBatch/MERGE. Both commit in batches, and both need a catalog or table log — neither writes per-record.',
  },
  {
    q: 'Why does simply appending CDC events to a table NOT give you a correct current-state table?',
    a: 'Because the event stream is a <em>history</em>, not a snapshot. An append-only landing (Bronze) accumulates <strong>every version of every row plus the deletes as separate records</strong> — three updates to one order become four rows, and a deleted order is still sitting there. "Current state" means exactly one row per key, reflecting the latest change and honoring deletes. Getting there requires an <strong>upsert by primary key</strong> (<code>MERGE</code> in Delta, equality deletes in Iceberg), applying deletes as removals, and <strong>de-duplicating within each micro-batch</strong> (a batch can hold several events for the same key — MERGE needs ≤1 source row per key, so you keep the latest by sequence/LSN first). That\'s the Bronze→Silver step. Append gives you an audit log; a correct current-state table is a materialization you compute from it.',
    tip: 'Say it plainly: "append = history with duplicates and ghosts; current state = upsert-by-key + apply deletes + dedupe-per-batch." The dedup-within-a-micro-batch detail (MERGE needs one source row per key) is the senior giveaway.',
  },
  {
    q: 'Name the distinct progress markers in a Postgres → Debezium → Kafka → lakehouse pipeline. Why does conflating them cause bugs?',
    a: 'There are <strong>four, and they are different numbers for the same record</strong>: (1) the PostgreSQL <strong>LSN</strong> — the source WAL position, tracked in the replication slot + connector offset; (2) the <strong>Kafka offset</strong> — the per-partition position, tracked independently by each consumer; (3) the <strong>sink checkpoint</strong> — e.g. Spark\'s <code>checkpointLocation</code> storing which Kafka offsets it has processed, or the Iceberg sink\'s committed offsets in its control topic; and (4) the committed <strong>table version</strong> — an Iceberg snapshot or a Delta <code>_delta_log</code> version. Conflating them causes real bugs: assuming a Kafka offset equals an LSN breaks lag math; assuming "the connector committed" means "the data is queryable in Iceberg" ignores the coordinator\'s commit interval; deleting a Spark checkpoint and reusing the same <code>txnAppId</code> makes Delta silently ignore the re-read batches. Each system advances on its own clock.',
    tip: 'Four markers: LSN, Kafka offset, sink checkpoint, table version (Iceberg snapshot / Delta _delta_log). The practical trap to mention: "connector committed" ≠ "queryable in the table" because the sink commits on its own interval.',
  },
  {
    q: 'What are the small-files / compaction and schema concerns when streaming into a lakehouse?',
    a: '<strong>Small files:</strong> streaming commits every few minutes (or per micro-batch) produce many small files, and CDC upserts add delete files on top — both wreck read performance. Iceberg fixes this with the <code>rewrite_data_files</code> action (bin-pack/sort) plus <code>expire_snapshots</code>; Delta uses <code>OPTIMIZE</code> (optionally <code>ZORDER</code>) and auto-compaction. (Note a naming trap: Delta writes a <code>_delta_log</code> <em>checkpoint</em> every ~10 commits to speed log reads — that\'s table-log compaction, <em>not</em> the Spark streaming checkpoint.) <strong>Schema:</strong> the Iceberg sink has schema evolution <em>off by default</em> (<code>iceberg.tables.evolve-schema-enabled</code>) and only adds fields when enabled — safe because Iceberg tracks columns by field-id. Delta has <strong>schema enforcement on by default</strong> (mismatched writes rejected) and opt-in evolution via <code>mergeSchema</code>. Both favor additive, backward-compatible changes — the same discipline as the Kafka schema contract (M27).',
    tip: 'Two different "checkpoints" in Delta is a classic gotcha — call it out. And know the defaults: Iceberg evolve-schema OFF, Delta schema-enforcement ON. Compaction: Iceberg rewrite_data_files, Delta OPTIMIZE.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M30 · CDC Integrations',
    title: 'Kafka → Lakehouse (Iceberg & Delta)',
    subtitle: 'Two distinct sink paths — Kafka Connect → Apache Iceberg and Spark Structured Streaming → Delta — the medallion architecture, and why appending events is not a current-state table.',
    tabs: [
      { id: 'paths', label: '🧭 Two Paths' },
      { id: 'medallion', label: '🥉🥈🥇 Bronze → Silver → Gold' },
      { id: 'iq', label: '🎯 Interview Q&A' },
    ],
  });
  buildPaths(container);
  const cleanup = buildMedallion(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

function buildPaths(container) {
  const tab = container.querySelector('#tab-paths');
  tab.innerHTML = `
    <div class="prose-block">
      <h3>Two genuinely different ways to land Kafka in a lakehouse</h3>
      <p>Your CDC events are flowing through Kafka. Now they need to become queryable tables in a lakehouse (Iceberg or Delta on object storage). There are two mainstream paths, and they are not variations of one thing — they commit differently, track progress differently, and fail differently.</p>
    </div>
    <div class="cdc-paths">
      <div class="cdc-path cdc-path-ice">
        <div class="cdc-path-head">🧊 Kafka Connect → Apache Iceberg</div>
        <ul>
          <li>A <strong>Connect sink connector</strong> (<code>IcebergSinkConnector</code>). Workers write data files; a <strong>central coordinator commits an Iceberg snapshot via a control topic</strong> on an interval (default ~5 min) — data appears in <em>batches</em>, not per record.</li>
          <li>Exactly-once via Kafka transactions (<strong>KIP-447</strong>, Kafka ≥ 2.5).</li>
          <li>Needs an Iceberg <strong>catalog</strong> (REST, Glue, Hive, JDBC…) + object storage.</li>
          <li>CDC upserts via <strong>equality deletes</strong> on <code>id-columns</code>; auto-create &amp; schema-evolve are <strong>off by default</strong>.</li>
          <li>Lighter, Connect-native — no Spark to run.</li>
        </ul>
      </div>
      <div class="cdc-path cdc-path-delta">
        <div class="cdc-path-head">🔼 Spark Structured Streaming → Delta</div>
        <ul>
          <li>A <strong>Spark job</strong>: <code>writeStream.format("delta")</code> with a <strong>checkpointLocation</strong> that stores processed Kafka offsets.</li>
          <li>Current-state upserts with <code>foreachBatch</code> + <strong><code>MERGE INTO</code></strong>; exactly-once from the checkpoint + idempotent Delta commits (<code>txnAppId</code>/<code>txnVersion</code> in foreachBatch).</li>
          <li>Commits a new <code>_delta_log</code> version per micro-batch.</li>
          <li>Trigger modes: <code>processingTime</code>, <code>availableNow</code>, (experimental) <code>continuous</code>.</li>
          <li>Heavier but flexible — when you already run Spark and need rich transforms.</li>
        </ul>
      </div>
    </div>
    <div class="callout callout-note">
      <div class="callout-head">🔗 Four progress markers — never conflate them</div>
      <p>The same record has a different position in each system: the Postgres <strong>LSN</strong> (source WAL), the <strong>Kafka offset</strong> (per partition), the <strong>sink checkpoint</strong> (Spark\'s checkpointLocation / the Iceberg sink\'s control-topic offsets), and the committed <strong>table version</strong> (an Iceberg snapshot or a Delta <code>_delta_log</code> version). "The connector committed" ≠ "it\'s queryable in the table," because the sink commits on its own interval.</p>
    </div>
    <div class="prose-block">
      <h3>Honest about infrastructure</h3>
      <p>Neither path is fully self-contained: the Iceberg sink needs a catalog service (e.g. the Iceberg REST catalog) and S3-compatible storage (MinIO locally); the Delta path needs a Spark runtime. The forthcoming <strong>Docker lab</strong> pins compatible versions and wires both up with working smoke tests — this module is the deterministic, in-browser model of how they behave.</p>
    </div>`;
}

function buildMedallion(container) {
  const tab = container.querySelector('#tab-medallion');
  tab.innerHTML = `
    <div class="cdc-scope-note">⚠️ Deterministic simulation. Bronze is the raw append-only event log; Silver is the MERGE'd current state (latest by LSN, deletes applied); Gold is an aggregate over Silver.</div>
    <div class="cdc-med">
      <div class="cdc-lab-controls">
        <div class="cdc-ctrl-group">
          <span class="cdc-ctrl-label">Source changes</span>
          <button class="ctrl-btn" data-act="insert">➕ Insert</button>
          <button class="ctrl-btn" data-act="update">✏️ Update status</button>
          <button class="ctrl-btn" data-act="delete">🗑️ Delete</button>
        </div>
        <div class="cdc-ctrl-group">
          <span class="cdc-ctrl-label">Edge cases</span>
          <button class="ctrl-btn" data-act="dup">🔁 Duplicate event</button>
          <button class="ctrl-btn" data-act="stale">⏪ Stale (out-of-order) update</button>
        </div>
        <button class="ctrl-btn cdc-reset" data-act="reset">↺ Reset</button>
      </div>

      <div class="cdc-med-caption" id="med-caption"></div>

      <div class="cdc-med-grid">
        <div class="cdc-box cdc-med-bronze">
          <div class="cdc-box-head">🥉 Bronze <span class="cdc-box-sub">raw events · append-only · full history</span></div>
          <div class="cdc-box-body cdc-wal-scroll" id="med-bronze"></div>
        </div>
        <div class="cdc-box cdc-med-silver">
          <div class="cdc-box-head">🥈 Silver <span class="cdc-box-sub">current state · upsert by key (latest LSN), deletes applied</span></div>
          <div class="cdc-box-body" id="med-silver"></div>
        </div>
        <div class="cdc-box cdc-med-gold">
          <div class="cdc-box-head">🥇 Gold <span class="cdc-box-sub">business aggregate over Silver</span></div>
          <div class="cdc-box-body" id="med-gold"></div>
        </div>
      </div>
    </div>`;

  let sim, nextId, extra, note;
  const $ = s => container.querySelector(s);
  function fresh() {
    sim = new CDCSim({ seed: 23 });
    sim.createTable('orders', { pk: 'id', columns: ['id', 'status', 'amount'] });
    nextId = 1; extra = []; note = null;
  }
  fresh();

  const FLOW = ['NEW', 'PAID', 'PACKED', 'SHIPPED'];

  // Combined event stream: real CDC events + injected edge-case events.
  function allEvents() {
    return sim.bronze.filter(e => e.table === 'orders')
      .map(e => ({ op: e.op, key: e.key, after: e.after, lsn: e.source.lsn, tag: null }))
      .concat(extra);
  }
  // Silver = fold keeping the latest change per key by LSN; deletes remove the key.
  function silver() {
    const latest = new Map();
    for (const e of allEvents()) {
      const cur = latest.get(e.key);
      if (!cur || e.lsn >= cur.lsn) latest.set(e.key, e);
    }
    const rows = [];
    for (const e of latest.values()) if (e.op !== 'd') rows.push(e.after);
    return rows.sort((a, b) => a.id - b.id);
  }

  function render() {
    const events = allEvents();
    const opL = { c: 'INSERT', u: 'UPDATE', d: 'DELETE', r: 'READ' };
    $('#med-bronze').innerHTML = events.length
      ? events.map(e => `<div class="cdc-wal-rec ${e.tag ? 'cdc-med-inject' : ''}"><span class="cdc-ev-op cdc-ev-${e.op}">${opL[e.op]}</span><span class="cdc-ev-key">id=${e.key}</span><span class="cdc-ev-change">${e.op === 'd' ? '→ ∅' : '→ ' + (e.after.status)}</span><span class="cdc-ev-lsn">LSN ${e.lsn}</span>${e.tag ? `<span class="cdc-src-tag cdc-src-incr">${e.tag}</span>` : ''}</div>`).join('')
      : `<div class="cdc-empty">— no events —</div>`;

    const slv = silver();
    $('#med-silver').innerHTML = slv.length
      ? `<table class="cdc-tbl"><thead><tr><th>id</th><th>status</th><th>amount</th></tr></thead><tbody>${slv.map(r => `<tr><td>${r.id}</td><td>${r.status}</td><td>$${r.amount}</td></tr>`).join('')}</tbody></table>`
      : `<div class="cdc-empty">— no current rows —</div>`;

    // Gold: count by status + total revenue over current (Silver) state.
    const byStatus = {};
    let revenue = 0;
    slv.forEach(r => { byStatus[r.status] = (byStatus[r.status] || 0) + 1; revenue += Number(r.amount) || 0; });
    const statuses = Object.keys(byStatus);
    $('#med-gold').innerHTML = `
      <div class="cdc-gold-metric"><span>Active orders</span><strong>${slv.length}</strong></div>
      <div class="cdc-gold-metric"><span>Total revenue</span><strong>$${revenue}</strong></div>
      ${statuses.length ? `<div class="cdc-gold-sub">Orders by status</div>${statuses.map(s => `<div class="cdc-gold-row"><span>${s}</span><strong>${byStatus[s]}</strong></div>`).join('')}` : ''}`;

    const bronzeN = events.length, silverN = slv.length;
    $('#med-caption').innerHTML = note
      ? `<div class="cdc-med-note">${note}</div>`
      : `<div class="cdc-med-note">Bronze has <strong>${bronzeN}</strong> event${bronzeN === 1 ? '' : 's'} (the full history); Silver has <strong>${silverN}</strong> current row${silverN === 1 ? '' : 's'}. Appending Bronze straight into a table would give you ${bronzeN} rows with duplicates and deleted ghosts — Silver is the MERGE'd upsert-by-key.</div>`;
  }

  tab.querySelector('.cdc-lab-controls').addEventListener('click', e => {
    const act = e.target.closest('button')?.dataset.act;
    if (!act) return;
    note = null;
    try {
      const ids = sim.currentState('orders').map(r => r.id);
      if (act === 'insert') { const id = nextId++; sim.applyInsert('orders', { id, status: 'NEW', amount: 40 + (id % 5) * 10 }); sim.poll(); }
      else if (act === 'update' && ids.length) { const id = ids[ids.length - 1]; const cur = sim.currentState('orders').find(r => r.id === id); const i = FLOW.indexOf(cur.status); sim.applyUpdate('orders', id, { status: FLOW[Math.min(i + 1, FLOW.length - 1)] }); sim.poll(); }
      else if (act === 'delete' && ids.length) { sim.applyDelete('orders', ids[ids.length - 1]); sim.poll(); }
      else if (act === 'dup') {
        const evs = allEvents().filter(e => !e.tag);
        if (evs.length) { const last = evs[evs.length - 1]; extra.push({ ...last, tag: 'duplicate' }); note = `🔁 A <strong>duplicate</strong> of the last event was delivered (at-least-once). Bronze grew by one, but <strong>Silver is unchanged</strong> — the upsert folds by key, so re-applying the same change is idempotent. This is why the Silver MERGE must be idempotent.`; }
      }
      else if (act === 'stale' && ids.length) {
        // inject an older-LSN update that would revert status if naively applied
        const id = ids[0];
        extra.push({ op: 'u', key: id, after: { id, status: 'NEW', amount: sim.currentState('orders').find(r => r.id === id).amount }, lsn: 0, tag: 'stale (LSN 0)' });
        note = `⏪ A <strong>stale, out-of-order</strong> update (LSN 0) arrived for id=${id}. A naive "last-write-wins by arrival" would revert it to NEW — but Silver keeps the <strong>latest by LSN</strong>, so the stale event is <strong>ignored</strong>. Ordering by a sequence/LSN, not arrival time, is what keeps the current state correct.`;
      }
      else if (act === 'reset') { fresh(); }
    } catch (err) {}
    render();
  });

  render();
  return null;
}
