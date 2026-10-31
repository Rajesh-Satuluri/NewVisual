// M31 — End-to-End CDC Capstone. Ties the whole track together on ONE CDCSim:
// Postgres → WAL/slot → Debezium → Kafka → materialize (Silver) → Gold, with an
// interactive that drives a single order through the pipeline and lets you inject
// the failure modes taught across m23–m30 (duplicate, out-of-order, outage,
// restart, WAL loss + snapshot recovery, schema evolution) and watch
// reconciliation prove whether the materialized state still matches the source.
import { createModuleShell, createIQSection } from '../components/module-shell.js';
import CDCSim from '../sim/cdc-engine.js';

export const IQ = [
  {
    q: 'Walk through exactly what happens to a single "order status" UPDATE, from the application commit all the way to a queryable Gold metric.',
    a: 'Follow the one change: (1) the app runs <code>UPDATE orders SET status=... WHERE id=...</code> and <strong>commits</strong> — only now is it visible to CDC. (2) Postgres writes the change to the <strong>WAL</strong> and assigns it an <strong>LSN</strong>; the row is updated in the table. (3) Debezium\'s logical-decoding stream reads the committed change from the <strong>replication slot</strong>, builds a <strong>change event</strong> (<code>op:"u"</code>, <code>before</code>/<code>after</code>, <code>source.lsn</code>), and advances/confirms the slot so the WAL can be recycled. (4) It <strong>produces</strong> the event to the table\'s Kafka topic, where it lands at a specific <strong>partition + offset</strong> (keyed by PK so all changes to that order keep per-key order). (5) A sink consumer reads it and <strong>MERGEs by primary key</strong> into the Silver table (upsert the latest-by-LSN, apply deletes) — this is the Bronze→Silver step. (6) Gold is recomputed as an <strong>aggregate over Silver</strong> (e.g. revenue by status). The same record carried four different positions along the way — LSN, Kafka offset, sink checkpoint, table version — and each system advanced on its own clock.',
    tip: 'The commit is the starting gun (uncommitted changes are invisible to CDC), and the Bronze→Silver MERGE is where "a stream of changes" becomes "one row per key." If you can narrate those two beats you own the pipeline.',
  },
  {
    q: 'During a Debezium outage, what grows and what stalls — and how do you recover without losing data or double-counting?',
    a: 'While the connector is down, the <strong>source keeps committing</strong>: the table advances and the WAL keeps growing, but the <strong>replication slot can\'t advance</strong>, so <strong>retained WAL grows without bound</strong> — the real operational danger (source disk fills). Meanwhile <strong>Kafka/Bronze and therefore Silver stall</strong>, so reconciliation shows Silver <em>behind</em> the source. Recovery depends on whether the needed WAL still exists: (a) if it does, you just <strong>restart</strong> — the connector resumes from its confirmed LSN and drains the backlog; at-least-once redelivery is harmless because the Silver MERGE is idempotent (upsert by key). (b) If the WAL the slot needed was already <strong>recycled</strong> (slot invalidated past <code>max_slot_wal_keep_size</code>, or a very long outage), streaming is stuck and a restart alone won\'t help — you must run a <strong>new snapshot</strong> to rebuild the position, after which streaming continues. Heartbeats prevent the quiet-table variant of the slot-growth trap.',
    tip: 'Two outcomes, one question: "is the WAL the slot needs still there?" Yes → restart and drain (idempotent MERGE makes redelivery safe). No → snapshot to recover. The thing that grows dangerously is retained WAL on the source, not Kafka.',
  },
  {
    q: 'A duplicate event and an out-of-order (stale) event both arrive at the sink. Why does the current-state table stay correct?',
    a: 'Because the materialization is <strong>idempotent and ordered by a sequence, not by arrival</strong>. <strong>Duplicate</strong> (at-least-once redelivery): the MERGE upserts by primary key, so applying the identical change again lands on the exact same row — Bronze grows by one, Silver is unchanged. <strong>Stale / out-of-order</strong>: you keep the <strong>latest by LSN</strong> (Debezium exposes <code>source.lsn</code> / ordering fields), so an older event that arrives late is <strong>ignored</strong> rather than overwriting newer data; a naive "last write by arrival time" is exactly the bug this avoids. Per-key ordering in Kafka (PK as the message key) plus LSN-based conflict resolution in the MERGE is what makes the end state independent of delivery accidents.',
    tip: 'Say "idempotent upsert + order by LSN, not arrival." Duplicate → no-op; stale → dropped. The giveaway detail is that you dedupe/resolve within a micro-batch using the sequence number before the MERGE.',
  },
  {
    q: 'How would you prove this whole pipeline is actually correct in production — and what breaks if you conflate the progress markers?',
    a: '<strong>Reconciliation:</strong> periodically compare the materialized table against the source — counts and checksums per key range (or a full compare for small tables) — and alert on drift. Transient drift during streaming lag is expected; <em>persistent</em> drift means a real bug (a dropped delete, a bad MERGE key, a stuck connector). You also watch the operational signals: replication-slot lag bytes (#1), connector state, consumer lag, and sink commit latency. <strong>Conflating the four markers causes real bugs:</strong> treating a Kafka offset as an LSN breaks lag math; assuming "the connector committed" means "queryable in the lakehouse" ignores the sink\'s own commit interval; and reusing a sink checkpoint/txn id after wiping it makes the table silently ignore re-read batches. Each of LSN, Kafka offset, sink checkpoint and table version advances independently — correctness monitoring has to respect that.',
    tip: 'Reconciliation (count/checksum source vs sink + alert on persistent drift) is the correctness proof; slot-lag-bytes is the #1 health metric. The trap to name: "committed by the connector" ≠ "committed in the table."',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M31 · CDC Integrations',
    title: 'End-to-End CDC Capstone',
    subtitle: 'The whole chain on one engine — Postgres → WAL → Debezium → Kafka → Silver → Gold — and every failure mode from the track, with live reconciliation proving the result.',
    tabs: [
      { id: 'pipeline', label: '🔭 The Whole Pipeline' },
      { id: 'capstone', label: '🎛️ End-to-End Capstone' },
      { id: 'iq', label: '🎯 Interview Q&A' },
    ],
  });
  buildPipeline(container);
  buildCapstone(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return null;
}

function buildPipeline(container) {
  container.querySelector('#tab-pipeline').innerHTML = `
    <div class="prose-block">
      <h3>One order, all the way through</h3>
      <p>Every module in this track covered one hop. The capstone puts them in a single line and lets you watch one record travel it — and, more importantly, watch what happens when things go wrong. Here is the whole chain in plain terms:</p>
    </div>
    <div class="cap-chain">
      <div class="cap-chain-step"><span class="cap-chain-ico">🐘</span><b>Postgres</b><span>App commits a change. Until commit, CDC sees nothing.</span></div>
      <div class="cap-chain-arrow">→</div>
      <div class="cap-chain-step"><span class="cap-chain-ico">🪵</span><b>WAL + slot</b><span>Change is logged with an <b>LSN</b>; the replication slot marks how far Debezium has read.</span></div>
      <div class="cap-chain-arrow">→</div>
      <div class="cap-chain-step"><span class="cap-chain-ico">🔌</span><b>Debezium</b><span>Decodes committed changes into <b>change events</b>, confirms the slot.</span></div>
      <div class="cap-chain-arrow">→</div>
      <div class="cap-chain-step"><span class="cap-chain-ico">📨</span><b>Kafka</b><span>Event lands at a <b>partition + offset</b>, keyed by PK for per-key order.</span></div>
      <div class="cap-chain-arrow">→</div>
      <div class="cap-chain-step"><span class="cap-chain-ico">🥈</span><b>Silver</b><span><b>MERGE by key</b>: latest-by-LSN upsert, deletes applied — the current-state table.</span></div>
      <div class="cap-chain-arrow">→</div>
      <div class="cap-chain-step"><span class="cap-chain-ico">🥇</span><b>Gold</b><span>Business aggregate computed over Silver.</span></div>
    </div>
    <div class="callout callout-note">
      <div class="callout-head">🔗 Four progress markers, four clocks</div>
      <p>The same order carries a different position in each system — the Postgres <strong>LSN</strong>, the <strong>Kafka offset</strong>, the <strong>sink checkpoint</strong>, and the committed <strong>table version</strong>. They advance independently. "Debezium committed" is not the same as "it's in the Gold table."</p>
    </div>
    <div class="callout callout-warn">
      <div class="callout-head">🧯 The failure modes you'll drive in the lab</div>
      <p><strong>Duplicate</strong> (at-least-once) → idempotent MERGE absorbs it. <strong>Out-of-order</strong> → latest-by-LSN ignores the stale one. <strong>Outage</strong> → source races ahead, retained WAL grows, Silver stalls, reconciliation flags drift. <strong>Restart</strong> → drain the backlog. <strong>WAL loss</strong> → streaming is stuck until a fresh <strong>snapshot</strong> rebuilds the position. <strong>Schema evolution</strong> → additive, backward-compatible columns flow through.</p>
    </div>
    <div class="cdc-scope-note">⚠️ The lab is a deterministic in-browser simulation (<code>sim/cdc-engine.js</code>), not a live database. The real, runnable pipeline is the forthcoming Docker lab. The engine models the LSN, the Kafka offset and the materialized version as three separate markers and never conflates them.</div>`;
}

function buildCapstone(container) {
  const tab = container.querySelector('#tab-capstone');
  tab.innerHTML = `
    <div class="cdc-scope-note">⚠️ Deterministic simulation. Drive the source, then inject failures. Watch the slot backlog, Bronze/Silver/Gold, and the reconciliation badge that compares Silver to the live source.</div>

    <div class="cap-rail" id="cap-rail"></div>

    <div class="cdc-lab-controls">
      <div class="cdc-ctrl-group">
        <span class="cdc-ctrl-label">Source (Postgres)</span>
        <button class="ctrl-btn" data-act="insert">➕ New order</button>
        <button class="ctrl-btn" data-act="advance">✏️ Advance status</button>
        <button class="ctrl-btn" data-act="cancel">🗑️ Cancel order</button>
      </div>
      <div class="cdc-ctrl-group">
        <span class="cdc-ctrl-label">Delivery edge cases</span>
        <button class="ctrl-btn" data-act="dup">🔁 Duplicate</button>
        <button class="ctrl-btn" data-act="stale">⏪ Out-of-order</button>
      </div>
      <div class="cdc-ctrl-group">
        <span class="cdc-ctrl-label">Failure &amp; recovery</span>
        <button class="ctrl-btn" data-act="outage">🚫 Outage</button>
        <button class="ctrl-btn" data-act="restart">▶️ Restart</button>
        <button class="ctrl-btn" data-act="walloss">💥 Lose WAL</button>
        <button class="ctrl-btn" data-act="snapshot">📸 Snapshot &amp; recover</button>
      </div>
      <div class="cdc-ctrl-group">
        <span class="cdc-ctrl-label">Schema</span>
        <button class="ctrl-btn" data-act="evolve">🧬 Evolve (+channel)</button>
      </div>
      <button class="ctrl-btn cdc-reset" data-act="reset">↺ Reset</button>
    </div>

    <div class="cap-caption" id="cap-caption"></div>

    <div class="cap-grid">
      <div class="cdc-box">
        <div class="cdc-box-head">🐘 Source table <span class="cdc-box-sub">orders (ground truth)</span></div>
        <div class="cdc-box-body" id="cap-source"></div>
      </div>
      <div class="cdc-box">
        <div class="cdc-box-head">🪵 WAL / slot <span class="cdc-box-sub">retained = not yet confirmed</span></div>
        <div class="cdc-box-body" id="cap-slot"></div>
      </div>
      <div class="cdc-box">
        <div class="cdc-box-head">📨 Kafka · Bronze <span class="cdc-box-sub">cdc.orders · append-only</span></div>
        <div class="cdc-box-body cdc-wal-scroll" id="cap-bronze"></div>
      </div>
      <div class="cdc-box">
        <div class="cdc-box-head">🥈 Silver <span class="cdc-box-sub">upsert by key (latest LSN), deletes applied</span></div>
        <div class="cdc-box-body" id="cap-silver"></div>
      </div>
      <div class="cdc-box">
        <div class="cdc-box-head">🥇 Gold <span class="cdc-box-sub">aggregate over Silver</span></div>
        <div class="cdc-box-body" id="cap-gold"></div>
      </div>
      <div class="cdc-box">
        <div class="cdc-box-head">🔎 Reconciliation <span class="cdc-box-sub">Silver vs source</span></div>
        <div class="cdc-box-body" id="cap-recon"></div>
      </div>
    </div>`;

  const $ = s => container.querySelector(s);
  let sim, nextId, extra, note, evolved;

  function fresh() {
    sim = new CDCSim({ seed: 31 });
    sim.createTable('orders', { pk: 'id', columns: ['id', 'status', 'amount'] });
    nextId = 1; extra = []; note = null; evolved = false;
  }
  fresh();

  const FLOW = ['NEW', 'PAID', 'PACKED', 'SHIPPED'];
  const running = () => sim.connector.running && !sim.connector.needsSnapshot;

  // Bronze events (real) + injected edge-case events, as a flat stream.
  function allEvents() {
    return sim.bronze.filter(e => e.table === 'orders')
      .map(e => ({ op: e.op, key: e.key, after: e.after, lsn: e.source.lsn, tag: null }))
      .concat(extra);
  }
  // Silver = latest change per key by LSN; deletes remove the key (teaching-correct
  // materialization — ordered by sequence, not arrival, and idempotent).
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
  function reconcile() {
    const src = new Map(sim.currentState('orders').map(r => [r.id, r]));
    const slv = new Map(silver().map(r => [r.id, r]));
    const missing = [...src.keys()].filter(k => !slv.has(k));          // in source, not yet in Silver
    const ghost = [...slv.keys()].filter(k => !src.has(k));            // in Silver, gone from source
    const diff = [...src.keys()].filter(k => slv.has(k) &&
      String(slv.get(k).status) !== String(src.get(k).status));
    return { match: !missing.length && !ghost.length && !diff.length, missing, ghost, diff, srcN: src.size, slvN: slv.size };
  }

  // Pull pending changes into Bronze/Kafka if the connector can stream.
  function maybePoll() { if (running()) sim.poll(); }

  function renderRail() {
    const bl = sim.walBacklog();
    const connState = !sim.connector.running ? { cls: 'cap-st-warn', txt: 'outage' }
      : sim.connector.needsSnapshot ? { cls: 'cap-st-bad', txt: 'stuck — WAL lost' }
      : { cls: 'cap-st-ok', txt: 'streaming' };
    const slotCls = bl.records > 0 ? (bl.records >= 6 ? 'cap-st-bad' : 'cap-st-warn') : 'cap-st-ok';
    const rec = reconcile();
    const stage = (ico, label, stCls, metric) =>
      `<div class="cap-stage"><span class="cap-dot ${stCls}"></span><span class="cap-stage-ico">${ico}</span><span class="cap-stage-lab">${label}</span><span class="cap-stage-met">${metric}</span></div>`;
    $('#cap-rail').innerHTML =
      stage('🐘', 'Postgres', 'cap-st-ok', `${sim.currentState('orders').length} rows`) +
      `<span class="cap-rail-arrow">→</span>` +
      stage('🪵', 'WAL / slot', slotCls, `${bl.records} retained`) +
      `<span class="cap-rail-arrow">→</span>` +
      stage('🔌', 'Debezium', connState.cls, connState.txt) +
      `<span class="cap-rail-arrow">→</span>` +
      stage('📨', 'Kafka', 'cap-st-ok', `${sim.bronze.filter(e => e.table === 'orders').length} events`) +
      `<span class="cap-rail-arrow">→</span>` +
      stage('🥈', 'Silver', rec.match ? 'cap-st-ok' : 'cap-st-warn', `${rec.slvN} rows`) +
      `<span class="cap-rail-arrow">→</span>` +
      stage('🥇', 'Gold', 'cap-st-ok', 'live');
  }

  function render() {
    renderRail();
    const opL = { c: 'INSERT', u: 'UPDATE', d: 'DELETE', r: 'READ' };

    // Source
    const src = sim.currentState('orders').sort((a, b) => a.id - b.id);
    $('#cap-source').innerHTML = src.length
      ? `<table class="cdc-tbl"><thead><tr><th>id</th><th>status</th><th>amount</th>${evolved ? '<th>channel</th>' : ''}</tr></thead><tbody>${src.map(r => `<tr><td>${r.id}</td><td>${r.status}</td><td>$${r.amount}</td>${evolved ? `<td>${r.channel || '—'}</td>` : ''}</tr>`).join('')}</tbody></table>`
      : `<div class="cdc-empty">— no rows —</div>`;

    // Slot / WAL
    const bl = sim.walBacklog();
    $('#cap-slot').innerHTML = `
      <div class="cdc-gold-metric"><span>Connector</span><strong>${!sim.connector.running ? '⏸ stopped' : sim.connector.needsSnapshot ? '⛔ needs snapshot' : '▶ running'}</strong></div>
      <div class="cdc-gold-metric"><span>Confirmed LSN</span><strong>${sim.slot.confirmedFlushLsn}</strong></div>
      <div class="cdc-gold-metric"><span>Retained WAL</span><strong>${bl.records} rec · ${bl.bytes} B</strong></div>
      <div class="cap-bar"><div class="cap-bar-fill ${bl.records >= 6 ? 'cap-bar-bad' : bl.records > 0 ? 'cap-bar-warn' : ''}" style="width:${Math.min(100, bl.records * 14)}%"></div></div>
      ${bl.records > 0 ? `<div class="cap-slot-note">Slot can't advance — retained WAL is growing on the source.</div>` : `<div class="cap-slot-note cap-ok">Slot is caught up.</div>`}`;

    // Bronze
    const events = allEvents();
    $('#cap-bronze').innerHTML = events.length
      ? events.map(e => `<div class="cdc-wal-rec ${e.tag ? 'cdc-med-inject' : ''}"><span class="cdc-ev-op cdc-ev-${e.op}">${opL[e.op]}</span><span class="cdc-ev-key">id=${e.key}</span><span class="cdc-ev-change">${e.op === 'd' ? '→ ∅' : '→ ' + e.after.status}</span><span class="cdc-ev-lsn">LSN ${e.lsn}</span>${e.tag ? `<span class="cdc-src-tag cdc-src-incr">${e.tag}</span>` : ''}</div>`).join('')
      : `<div class="cdc-empty">— no events delivered —</div>`;

    // Silver
    const slv = silver();
    $('#cap-silver').innerHTML = slv.length
      ? `<table class="cdc-tbl"><thead><tr><th>id</th><th>status</th><th>amount</th></tr></thead><tbody>${slv.map(r => `<tr><td>${r.id}</td><td>${r.status}</td><td>$${r.amount}</td></tr>`).join('')}</tbody></table>`
      : `<div class="cdc-empty">— no current rows —</div>`;

    // Gold
    const byStatus = {}; let revenue = 0;
    slv.forEach(r => { byStatus[r.status] = (byStatus[r.status] || 0) + 1; revenue += Number(r.amount) || 0; });
    const statuses = Object.keys(byStatus);
    $('#cap-gold').innerHTML = `
      <div class="cdc-gold-metric"><span>Active orders</span><strong>${slv.length}</strong></div>
      <div class="cdc-gold-metric"><span>Total revenue</span><strong>$${revenue}</strong></div>
      ${statuses.length ? `<div class="cdc-gold-sub">Orders by status</div>${statuses.map(s => `<div class="cdc-gold-row"><span>${s}</span><strong>${byStatus[s]}</strong></div>`).join('')}` : ''}`;

    // Reconciliation
    const rec = reconcile();
    $('#cap-recon').innerHTML = rec.match
      ? `<div class="cap-recon-badge cap-recon-ok">✅ Reconciled</div><div class="cap-recon-sub">Silver matches the source exactly — ${rec.srcN} row${rec.srcN === 1 ? '' : 's'}.</div>`
      : `<div class="cap-recon-badge cap-recon-bad">⚠️ Drift detected</div><div class="cap-recon-sub">Source has <strong>${rec.srcN}</strong> rows, Silver has <strong>${rec.slvN}</strong>.${rec.missing.length ? ` Behind on id ${rec.missing.join(', ')}.` : ''}${rec.diff.length ? ` Stale status on id ${rec.diff.join(', ')}.` : ''}${rec.ghost.length ? ` Ghost rows id ${rec.ghost.join(', ')}.` : ''}</div>`;

    $('#cap-caption').innerHTML = `<div class="cdc-med-note">${note || 'Drive the source and inject failures. The reconciliation badge turns amber whenever Silver drifts from the source — and green again once the pipeline catches up.'}</div>`;
  }

  tab.querySelector('.cdc-lab-controls').addEventListener('click', e => {
    const act = e.target.closest('button')?.dataset.act;
    if (!act) return;
    note = null;
    try {
      const ids = sim.currentState('orders').map(r => r.id);
      if (act === 'insert') {
        const id = nextId++;
        const row = { id, status: 'NEW', amount: 40 + (id % 5) * 10 };
        if (evolved) row.channel = ['web', 'mobile', 'store'][id % 3];
        sim.applyInsert('orders', row); maybePoll();
        note = `➕ A new order committed on the source. ${running() ? 'The connector decoded it, produced it to <code>cdc.orders</code>, and Silver MERGE\'d it in.' : 'But the connector is <strong>down</strong>, so it sits in retained WAL — Silver is now behind.'}`;
      } else if (act === 'advance' && ids.length) {
        const id = ids[ids.length - 1];
        const cur = sim.currentState('orders').find(r => r.id === id);
        const i = FLOW.indexOf(cur.status);
        sim.applyUpdate('orders', id, { status: FLOW[Math.min(i + 1, FLOW.length - 1)] }); maybePoll();
        note = `✏️ Order ${id} advanced to <strong>${FLOW[Math.min(i + 1, FLOW.length - 1)]}</strong>. ${running() ? 'An <code>op:"u"</code> event flowed through to Silver.' : 'The connector is down — the source moved but Silver did not. Watch reconciliation flag the drift.'}`;
      } else if (act === 'cancel' && ids.length) {
        const id = ids[ids.length - 1];
        sim.applyDelete('orders', id); maybePoll();
        note = `🗑️ Order ${id} was deleted on the source. ${running() ? 'A delete event removed it from Silver.' : 'With the connector down, Silver still shows the cancelled order — a classic drift.'}`;
      } else if (act === 'dup') {
        const evs = allEvents().filter(x => !x.tag);
        if (evs.length) {
          const last = evs[evs.length - 1];
          extra.push({ ...last, tag: 'duplicate' });
          note = `🔁 The last event was <strong>delivered twice</strong> (at-least-once). Bronze grew by one, but <strong>Silver is unchanged</strong> — the upsert-by-key MERGE is idempotent, so reconciliation stays green.`;
        } else note = 'Nothing delivered yet to duplicate.';
      } else if (act === 'stale' && ids.length) {
        const id = ids[0];
        const amt = sim.currentState('orders').find(r => r.id === id).amount;
        extra.push({ op: 'u', key: id, after: { id, status: 'NEW', amount: amt }, lsn: 0, tag: 'stale (LSN 0)' });
        note = `⏪ A <strong>stale, out-of-order</strong> update (LSN 0) arrived for order ${id}. Latest-by-LSN <strong>ignores</strong> it, so Silver keeps the newer status and reconciliation stays green. Ordering by sequence, not arrival, is what saves you.`;
      } else if (act === 'outage') {
        sim.stopConnector();
        note = `🚫 <strong>Connector outage.</strong> The source can still commit, but nothing streams. Add/advance orders now and watch retained WAL climb while Silver stalls — exactly the slot-growth risk.`;
      } else if (act === 'restart') {
        if (sim.connector.needsSnapshot) { sim.startConnector(); note = `▶️ Restarted, but the WAL it needed is gone — streaming is still <strong>stuck</strong>. A restart alone can't recover lost WAL; run <strong>Snapshot &amp; recover</strong>.`; }
        else { sim.startConnector(); const drained = sim.poll(); note = `▶️ <strong>Restarted.</strong> The connector resumed from its confirmed LSN and drained ${drained.length} backlogged change${drained.length === 1 ? '' : 's'}. Redelivery would be harmless anyway — the MERGE is idempotent. Reconciliation is green again.`; }
      } else if (act === 'walloss') {
        const lost = sim.simulateWalLoss();
        note = lost
          ? `💥 <strong>Required WAL was recycled</strong> (slot invalidated). Even after a restart the connector can't resume — <code>poll()</code> returns nothing until a fresh snapshot rebuilds the position. This is the one failure a restart can't fix.`
          : `No unconfirmed WAL to lose — cause an outage and commit some changes first, then lose the WAL.`;
      } else if (act === 'snapshot') {
        sim.startConnector();
        const rows = sim.snapshot('orders');
        note = `📸 <strong>Snapshot recovery.</strong> Debezium re-read every current row as <code>READ (op:"r")</code> events (${rows.length}), rebuilt its position, and resumed streaming. Silver is reconstructed from the snapshot, so reconciliation is green — no data lost.`;
      } else if (act === 'evolve') {
        if (!evolved) {
          evolved = true;
          const t = sim.getTable('orders');
          if (!t.columns.includes('channel')) t.columns.push('channel');
          note = `🧬 <strong>Additive schema evolution.</strong> A nullable <code>channel</code> column was added. Existing rows read as <code>—</code> (null); new orders carry it. Additive, backward-compatible changes flow through CDC without breaking consumers — the same discipline as the schema contract in M27.`;
        } else note = 'Schema already evolved (channel column present).';
      } else if (act === 'reset') { fresh(); note = 'Reset to an empty pipeline.'; }
    } catch (err) { note = 'That action is not available in the current state.'; }
    render();
  });

  render();
  return null;
}
