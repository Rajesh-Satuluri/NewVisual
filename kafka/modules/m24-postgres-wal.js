// M24 — PostgreSQL WAL & Logical Decoding. The log that log-based CDC reads:
// the WAL, physical vs logical replication, LSNs, logical decoding, replication
// slots, publications and REPLICA IDENTITY. Includes an interactive WAL +
// replication-slot simulator (deterministic; built on the CDC engine) where you
// drive writes, watch the WAL and slot, stop the connector to grow a backlog,
// and reconcile the downstream copy against the source.
import { createModuleShell, createIQSection } from '../components/module-shell.js';
import CDCSim from '../sim/cdc-engine.js';

export const IQ = [
  {
    q: 'What is the PostgreSQL WAL, and what is the difference between physical and logical replication?',
    a: 'The <strong>WAL (write-ahead log)</strong> is an ordered, durable record of every change, written <em>before</em> the change is applied to the data files. It exists for crash recovery (replay the WAL to get back to a consistent state) and for replication. Two ways to consume it: <strong>physical (streaming) replication</strong> ships the raw, byte-level block changes to a standby that is a <em>bit-for-bit identical</em> copy of the primary — great for high availability, useless for feeding a different system because it\'s physical bytes, not "row X changed." <strong>Logical replication / logical decoding</strong> runs the WAL through an output plugin (<code>pgoutput</code>) that reconstructs it into <em>logical row changes</em> — "row with id=1 in table orders went from status NEW to PAID" — which any consumer can understand. CDC uses logical decoding; that\'s what lets Debezium turn WAL into Kafka events for a warehouse, a search index, or a cache.',
    tip: 'The crisp distinction: physical replication copies <em>bytes to an identical replica</em>; logical decoding emits <em>row-level change events for arbitrary consumers</em>. CDC needs the second, which is why you set wal_level=logical.',
  },
  {
    q: 'Explain LSN, replication slot, and publication — and why a slot can be dangerous.',
    a: 'An <strong>LSN (log sequence number)</strong> is a monotonically increasing position in the WAL — effectively "how far into the log" a record sits; it gives every change a total order. A <strong>replication slot</strong> is a server-side bookmark the database keeps for a logical consumer: it records the consumer\'s confirmed position (<code>confirmed_flush_lsn</code>) and — critically — <strong>guarantees the WAL after that position is retained until the consumer confirms it</strong>. A <strong>publication</strong> is the named set of tables that stream through <code>pgoutput</code> (Debezium can create one or use an existing one). The danger lives in the slot\'s guarantee: if the consumer stops or falls behind — or if all the write activity is on tables <em>outside</em> the captured set, so the slot never advances — PostgreSQL cannot recycle that WAL, and it grows without bound until the <strong>source disk fills and the primary goes down</strong>. That is the number-one CDC production incident.',
    tip: 'Say the failure out loud: "a stalled slot pins the WAL and can fill the primary\'s disk." Then give the fixes: monitor slot lag, enable heartbeats (so the slot advances even when captured tables are idle), set max_slot_wal_keep_size as a safety cap, and drop slots you no longer use.',
  },
  {
    q: 'What does REPLICA IDENTITY control, and why does it matter for UPDATE and DELETE events?',
    a: '<code>REPLICA IDENTITY</code> on a table decides what the WAL records as the <em>old</em> row for updates and deletes — i.e. what ends up in a change event\'s <code>before</code> image and in a delete\'s key. <strong>DEFAULT</strong> records only the <em>primary-key</em> columns of the old row — enough to identify which row changed, but the event\'s <code>before</code> won\'t carry the old non-key values. <strong>FULL</strong> records <em>every</em> column\'s old value, so updates/deletes carry a complete before-image — needed if a downstream consumer wants to see what a field changed <em>from</em>, or to build audit diffs — at the cost of more WAL volume. <strong>NOTHING</strong> records no identity, which means a table with no PK and REPLICA IDENTITY NOTHING cannot even be updated/deleted while in a publication. For CDC you typically leave DEFAULT on PK tables and switch specific tables to FULL only when you genuinely need full before-images.',
    tip: 'Tie it to a real need: "we set REPLICA IDENTITY FULL on the accounts table because the fraud consumer needed the previous balance, not just the new one." That shows you know FULL is a deliberate, costed choice, not a default.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M24 · Change Data Capture',
    title: 'Postgres WAL & Logical Decoding',
    subtitle: 'The log that log-based CDC reads: the write-ahead log, physical vs logical replication, LSNs, replication slots, publications, and REPLICA IDENTITY — then drive it yourself.',
    tabs: [
      { id: 'wal', label: '🪵 WAL & Logical Decoding' },
      { id: 'lab', label: '🧪 WAL & Slot Simulator' },
      { id: 'iq', label: '🎯 Interview Q&A' },
    ],
  });

  buildWalTheory(container);
  const cleanup = buildLab(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

function buildWalTheory(container) {
  const tab = container.querySelector('#tab-wal');
  tab.innerHTML = `
    <div class="prose-block">
      <h3>The write-ahead log, in one paragraph</h3>
      <p>Before PostgreSQL changes a row in its data files, it first appends a record describing that change to the <strong>write-ahead log (WAL)</strong>. "Write-ahead" is the whole trick: the durable, ordered log is written <em>first</em>, so if the server crashes mid-write it can replay the WAL and recover to a consistent state. That same log is how replicas stay in sync. CDC is, at heart, a third reader of a log the database was already keeping for itself.</p>

      <h3>Two ways to read it: physical vs logical</h3>
      <p><strong>Physical replication</strong> streams the raw block-level bytes to a standby that becomes a bit-for-bit identical copy — perfect for failover, but meaningless to anything that isn't another PostgreSQL. <strong>Logical decoding</strong> feeds the WAL through an output plugin — <code>pgoutput</code>, built in since Postgres 10 — that reconstructs it into <em>row-level logical changes</em>: "in table <code>orders</code>, the row with id=1 went from <code>NEW</code> to <code>PAID</code>." Those logical changes are what any consumer can use. To enable it you set <code>wal_level = logical</code> (a server restart), which makes Postgres record enough extra information in the WAL to reconstruct row changes.</p>

      <div class="cdc-kv-grid">
        <div class="cdc-kv"><div class="cdc-kv-k">LSN <span class="cdc-kv-tag">log sequence number</span></div><div class="cdc-kv-v">A monotonically increasing position in the WAL. Every change gets one, giving all changes a single total order. Debezium records the LSN it has processed as its offset — this is the <em>source-side</em> progress marker (and it is <em>not</em> the Kafka offset).</div></div>
        <div class="cdc-kv"><div class="cdc-kv-k">Replication slot</div><div class="cdc-kv-v">A server-side bookmark for one logical consumer. It stores the <code>confirmed_flush_lsn</code> and <strong>guarantees the WAL past that point is kept until the consumer confirms it</strong>. This is what makes CDC resumable after a restart — and what fills your disk if the consumer stalls.</div></div>
        <div class="cdc-kv"><div class="cdc-kv-k">Publication</div><div class="cdc-kv-v">The named set of tables that stream through <code>pgoutput</code>. Debezium can auto-create one or use an existing one. Only changes to published tables are decoded.</div></div>
        <div class="cdc-kv"><div class="cdc-kv-k">REPLICA IDENTITY</div><div class="cdc-kv-v">Per table, controls the old-row image for UPDATE/DELETE: <strong>DEFAULT</strong> = primary key only; <strong>FULL</strong> = every column (richer <code>before</code> image, more WAL); <strong>NOTHING</strong> = none (blocks update/delete on a PK-less published table).</div></div>
      </div>

      <div class="callout callout-key">
        <div class="callout-head">🔑 Why the slot is the thing to watch</div>
        <p>The slot's retention guarantee is a double-edged sword. It's exactly why CDC can survive a connector restart without losing changes — the WAL is still there. It's also why a stopped connector, a slow consumer, or a <em>quiet captured table</em> (all the writes happening on tables you're <em>not</em> capturing, so the slot never advances) can silently grow the WAL until the primary's disk fills. The simulator in the next tab lets you cause exactly this, on purpose.</p>
      </div>
    </div>`;
}

function buildLab(container) {
  const tab = container.querySelector('#tab-lab');
  tab.innerHTML = `
    <div class="cdc-scope-note">⚠️ Deterministic simulation — no real PostgreSQL, no real Kafka. LSNs and retained-WAL "bytes" are modelled to teach the mechanics faithfully; they are not a real server's exact numbers.</div>

    <div class="cdc-lab">
      <div class="cdc-lab-controls">
        <div class="cdc-ctrl-group">
          <span class="cdc-ctrl-label">Writes (autocommit)</span>
          <button class="ctrl-btn" data-act="insert">➕ Insert</button>
          <button class="ctrl-btn" data-act="update">✏️ Update</button>
          <button class="ctrl-btn" data-act="delete">🗑️ Delete</button>
        </div>
        <div class="cdc-ctrl-group">
          <span class="cdc-ctrl-label">Transaction</span>
          <button class="ctrl-btn" data-act="begin">▶ Begin + 2 inserts</button>
          <button class="ctrl-btn" data-act="commit" disabled>✓ Commit</button>
          <button class="ctrl-btn" data-act="rollback" disabled>✗ Rollback</button>
        </div>
        <div class="cdc-ctrl-group">
          <span class="cdc-ctrl-label">Connector</span>
          <button class="ctrl-btn" data-act="poll">🔌 Poll (stream + ack)</button>
          <button class="ctrl-btn" data-act="toggle">⏸ Pause connector</button>
          <button class="ctrl-btn" data-act="heartbeat">💓 Heartbeat</button>
        </div>
        <button class="ctrl-btn cdc-reset" data-act="reset">↺ Reset</button>
      </div>

      <div class="cdc-lab-grid">
        <div class="cdc-box">
          <div class="cdc-box-head">🗄️ Source table <code>orders</code></div>
          <div class="cdc-box-body" id="lab-table"></div>
        </div>
        <div class="cdc-box">
          <div class="cdc-box-head">🔖 Replication slot <span id="lab-conn-pill"></span></div>
          <div class="cdc-box-body" id="lab-slot"></div>
        </div>
      </div>

      <div class="cdc-box cdc-box-wide">
        <div class="cdc-box-head">🪵 Write-Ahead Log <span class="cdc-box-sub">records past the slot's confirmed position are <span class="cdc-retained-key">retained</span> — the source can't free them yet</span></div>
        <div class="cdc-box-body cdc-wal-scroll" id="lab-wal"></div>
      </div>

      <div class="cdc-lab-grid">
        <div class="cdc-box">
          <div class="cdc-box-head">📤 Change events → Kafka <span class="cdc-box-sub">note LSN ≠ offset</span></div>
          <div class="cdc-box-body" id="lab-events"></div>
        </div>
        <div class="cdc-box">
          <div class="cdc-box-head">🥈 Silver (materialized copy) <span id="lab-recon"></span></div>
          <div class="cdc-box-body" id="lab-silver"></div>
        </div>
      </div>
    </div>`;

  const sim = new CDCSim({ seed: 5 });
  sim.createTable('orders', { pk: 'id', columns: ['id', 'status', 'amount'] });
  const FLOW = ['NEW', 'PAID', 'PACKED', 'SHIPPED'];
  let nextId = 1;
  let openTx = null;

  const $ = sel => container.querySelector(sel);
  const ids = () => sim.currentState('orders').map(r => r.id);
  const opLabel = { c: 'INSERT', u: 'UPDATE', d: 'DELETE', r: 'READ' };
  const kindLabel = { change: '', commit: 'COMMIT', heartbeat: 'HEARTBEAT', begin: 'BEGIN' };

  function setBtns() {
    tab.querySelector('[data-act="commit"]').disabled = openTx == null;
    tab.querySelector('[data-act="rollback"]').disabled = openTx == null;
    const toggle = tab.querySelector('[data-act="toggle"]');
    toggle.textContent = sim.connector.running ? '⏸ Pause connector' : '▶ Resume connector';
  }

  function render() {
    // Source table
    const rows = sim.currentState('orders');
    $('#lab-table').innerHTML = rows.length
      ? `<table class="cdc-tbl"><thead><tr><th>id</th><th>status</th><th>amount</th></tr></thead><tbody>${
          rows.map(r => `<tr><td>${r.id}</td><td>${r.status}</td><td>$${r.amount}</td></tr>`).join('')}</tbody></table>`
      : `<div class="cdc-empty">— empty —</div>`;

    // Slot + connector
    const slot = sim.slotView();
    const b = slot.backlog;
    const warn = b.records >= 6;
    $('#lab-conn-pill').innerHTML = sim.connector.running
      ? `<span class="cdc-pill cdc-pill-ok">connector running</span>`
      : `<span class="cdc-pill cdc-pill-stop">connector stopped</span>`;
    const barPct = Math.min(100, b.records * 8);
    $('#lab-slot').innerHTML = `
      <div class="cdc-slot-row"><span>confirmed_flush_lsn</span><strong>${slot.confirmedFlushLsn}</strong></div>
      <div class="cdc-slot-row"><span>WAL head (next LSN)</span><strong>${sim.nextLsn - 1}</strong></div>
      <div class="cdc-slot-row"><span>retained WAL</span><strong class="${warn ? 'cdc-warn-text' : ''}">${b.records} record${b.records === 1 ? '' : 's'} · ~${b.bytes} B</strong></div>
      <div class="cdc-backlog-bar"><div class="cdc-backlog-fill ${warn ? 'cdc-backlog-hot' : ''}" style="width:${barPct}%"></div></div>
      ${warn ? `<div class="cdc-warn">⚠ WAL is piling up. On a real server the slot pins this log and it keeps growing until the consumer catches up — a classic path to a full source disk. Poll the connector (or set a heartbeat) to let the slot advance.</div>` : ''}`;

    // WAL list
    const wal = sim.walView();
    $('#lab-wal').innerHTML = wal.length
      ? wal.map(r => {
          const retained = r.lsn > slot.confirmedFlushLsn;
          const label = r.kind === 'change'
            ? `<span class="cdc-ev-op cdc-ev-${r.change.op}">${opLabel[r.change.op]}</span> orders id=${r.change.key}`
            : `<span class="cdc-wal-marker">${kindLabel[r.kind] || r.kind.toUpperCase()}</span>`;
          return `<div class="cdc-wal-rec ${retained ? 'cdc-wal-retained' : 'cdc-wal-confirmed'}"><span class="cdc-wal-lsn">LSN ${r.lsn}</span>${label}</div>`;
        }).join('')
      : `<div class="cdc-empty">— no WAL records yet —</div>`;

    // Change events → Kafka
    const evs = sim.bronze.filter(e => e.table === 'orders');
    $('#lab-events').innerHTML = evs.length
      ? `<table class="cdc-tbl cdc-tbl-ev"><thead><tr><th>op</th><th>key</th><th>change</th><th>LSN</th><th>kafka</th></tr></thead><tbody>${
          evs.slice(-10).map(e => {
            const change = e.op === 'c' ? `→ ${e.after.status}`
              : e.op === 'u' ? `${e.before.status}→${e.after.status}`
              : e.op === 'd' ? `→ ∅` : `${e.after.status}`;
            return `<tr><td><span class="cdc-ev-op cdc-ev-${e.op}">${opLabel[e.op]}</span></td><td>${e.key}</td><td>${change}</td><td>${e.source.lsn}</td><td class="cdc-kafka-cell">p${e.kafka.partition}@${e.kafka.offset}</td></tr>`;
          }).join('')}</tbody></table>
          <div class="cdc-box-foot">Same event, two different progress numbers: source <strong>LSN ${evs[evs.length-1].source.lsn}</strong> vs Kafka <strong>offset ${evs[evs.length-1].kafka.offset}</strong> on partition ${evs[evs.length-1].kafka.partition}.</div>`
      : `<div class="cdc-empty">— nothing streamed yet — press Poll —</div>`;

    // Silver + reconcile
    const silver = sim.silver('orders');
    const recon = sim.reconcile('orders');
    $('#lab-recon').innerHTML = recon.match
      ? `<span class="cdc-pill cdc-pill-ok">✓ in sync</span>`
      : `<span class="cdc-pill cdc-pill-warn">✗ ${recon.sourceRows - recon.silverRows >= 0 ? 'behind' : 'drift'}</span>`;
    $('#lab-silver').innerHTML = (silver.length
      ? `<table class="cdc-tbl"><thead><tr><th>id</th><th>status</th><th>amount</th></tr></thead><tbody>${
          silver.map(r => `<tr><td>${r.id}</td><td>${r.status}</td><td>$${r.amount}</td></tr>`).join('')}</tbody></table>`
      : `<div class="cdc-empty">— empty —</div>`)
      + (recon.match
        ? `<div class="cdc-box-foot cdc-ok-text">Materialized copy matches the source — reconciled.</div>`
        : `<div class="cdc-box-foot cdc-warn-text">Out of sync: source has ${recon.sourceRows} row(s), Silver has ${recon.silverRows}. The downstream copy is only as fresh as the last poll — stream the pending changes to reconcile.</div>`);

    setBtns();
  }

  tab.querySelector('.cdc-lab-controls').addEventListener('click', e => {
    const act = e.target.closest('button')?.dataset.act;
    if (!act) return;
    try {
      if (act === 'insert') {
        const id = nextId++;
        sim.applyInsert('orders', { id, status: FLOW[0], amount: 25 + (id % 9) * 5 });
      } else if (act === 'update') {
        const list = ids();
        if (list.length) {
          const id = list[list.length - 1];
          const cur = sim.currentState('orders').find(r => r.id === id);
          const i = FLOW.indexOf(cur.status);
          sim.applyUpdate('orders', id, { status: FLOW[Math.min(i + 1, FLOW.length - 1)] });
        }
      } else if (act === 'delete') {
        const list = ids();
        if (list.length) sim.applyDelete('orders', list[list.length - 1]);
      } else if (act === 'begin') {
        if (openTx == null) {
          openTx = sim.begin();
          sim.insert(openTx, 'orders', { id: nextId++, status: FLOW[0], amount: 99 });
          sim.insert(openTx, 'orders', { id: nextId++, status: FLOW[0], amount: 99 });
        }
      } else if (act === 'commit') {
        if (openTx != null) { sim.commit(openTx); openTx = null; }
      } else if (act === 'rollback') {
        if (openTx != null) { sim.rollback(openTx); openTx = null; }
      } else if (act === 'poll') {
        sim.poll();
      } else if (act === 'toggle') {
        sim.connector.running ? sim.stopConnector() : sim.startConnector();
      } else if (act === 'heartbeat') {
        sim.heartbeat();
      } else if (act === 'reset') {
        sim.reset(); sim.createTable('orders', { pk: 'id', columns: ['id', 'status', 'amount'] });
        nextId = 1; openTx = null;
      }
    } catch (err) { /* guard out-of-order clicks */ }
    render();
  });

  render();
  return null;
}
