// M26 — Snapshots & Streaming. How a connector gets the data that already
// existed before it started (the snapshot) and then keeps up with new changes
// (streaming): snapshot modes, the consistent-read handoff, incremental
// snapshots, and recovery. Includes an interactive snapshot-vs-streaming lab.
import { createModuleShell, createIQSection } from '../components/module-shell.js';
import CDCSim from '../sim/cdc-engine.js';

export const IQ = [
  {
    q: 'Walk through an initial snapshot and the handoff to streaming. Why is there no gap and no duplicate at the boundary?',
    a: 'When a connector first starts with <code>snapshot.mode=initial</code> and has no stored offset, it must capture the data that already existed <em>before</em> CDC was turned on — the WAL only has changes from here forward. So it: (1) opens a consistent read of the database, (2) reads the schema, (3) scans every captured table emitting a <strong>READ event</strong> (<code>op:"r"</code>) per existing row — the current state, not a history, and (4) records the <strong>WAL position (LSN) at the point the snapshot is consistent as of</strong>. When the scan finishes it switches to <strong>streaming</strong>, reading the WAL via the slot <em>from exactly that recorded LSN</em>. That shared watermark is what makes the boundary clean: everything up to the LSN came from the snapshot, everything after comes from the stream, so nothing is missed and nothing is double-counted.',
    tip: 'The key phrase is "the snapshot records the LSN it is consistent as of, and streaming starts from that same LSN." That shared watermark is the whole answer to "how do you avoid a gap or an overlap?"',
  },
  {
    q: 'What are the main snapshot modes and when would you pick each?',
    a: '<strong>initial</strong> (default): snapshot existing rows once, then stream — the normal choice. <strong>initial_only</strong>: snapshot then <em>stop</em> — a one-time bulk load or migration where you don\'t want ongoing capture. <strong>no_data</strong> (formerly <em>schema_only</em>): capture the schema but <em>not</em> existing rows, then stream — use when you only care about changes from now on and the historical backfill would be huge or unnecessary. <strong>never</strong>: never snapshot, stream only — valid only when all the data you need is still in the WAL. <strong>always</strong>: snapshot on every start — expensive, for special re-sync cases. <strong>recovery</strong>: rebuild the connector\'s schema history (replacing the old <em>schema_only_recovery</em>). The decision hinges on one question: do you need the data that existed before CDC started? Yes → initial; only from now on → no_data/never; one-off load → initial_only.',
    tip: 'Flag the renames so you sound current: schema_only → no_data, schema_only_recovery → recovery, and the old exported mode is removed. Getting the modern names right signals you\'ve used a recent Debezium.',
  },
  {
    q: 'What is an incremental snapshot and what problem does it solve?',
    a: 'A normal initial snapshot is all-at-once and happens before streaming — if you later add a new table to the capture list, or need to re-sync a table, re-running a full snapshot would mean a disruptive stop. An <strong>incremental snapshot</strong> fixes that: you trigger it by writing an <code>execute-snapshot</code> signal (to a signaling table, named by <code>signal.data.collection</code>), and the connector snapshots the requested tables <strong>in chunks, concurrently with ongoing streaming</strong>, and it is <strong>resumable</strong> if interrupted. So you can backfill a newly-captured table, or re-sync one that drifted, without stopping the connector or pausing the live change stream. The READ events it emits are interleaved with the normal stream and de-duplicated against it by key.',
    tip: 'The three words that matter: signal-triggered, chunked/concurrent, resumable. Give the real use case — "backfill a newly added table without stopping the connector" — to show you know why it exists.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M26 · Change Data Capture',
    title: 'Snapshots & Streaming',
    subtitle: 'How a connector captures the data that existed before it started, then keeps up with new changes — snapshot modes, the consistent-read handoff, and incremental snapshots.',
    tabs: [
      { id: 'theory', label: '📸 Snapshot → Stream' },
      { id: 'lab', label: '🧪 Snapshot vs Streaming' },
      { id: 'iq', label: '🎯 Interview Q&A' },
    ],
  });
  buildTheory(container);
  const cleanup = buildLab(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

function buildTheory(container) {
  const tab = container.querySelector('#tab-theory');
  tab.innerHTML = `
    <div class="prose-block">
      <h3>The problem: the WAL only goes forward</h3>
      <p>Turn CDC on today and the WAL can only tell you about changes from <em>now</em>. But the <code>orders</code> table already has a million rows. How does a downstream copy get those? That\'s what the <strong>snapshot</strong> is for: a one-time read of the data that already existed, before streaming takes over for everything new.</p>

      <h3>Initial snapshot, then streaming — one clean watermark</h3>
      <p>A first-time connector with <code>snapshot.mode=initial</code> takes a <strong>consistent read</strong> and scans each captured table, emitting a <strong>READ event</strong> (<code>op:"r"</code>) for every existing row — the current value, not its history. It records the <strong>LSN the snapshot is consistent as of</strong>, and when the scan finishes it begins <strong>streaming the WAL from exactly that LSN</strong>. Everything up to the watermark came from the snapshot; everything after comes from the stream. One shared position, so no gap and no overlap.</p>

      <div class="cdc-modes">
        <div class="cdc-mode"><code>initial</code><span>Snapshot existing rows once, then stream. The default.</span></div>
        <div class="cdc-mode"><code>initial_only</code><span>Snapshot, then stop. One-off bulk load / migration.</span></div>
        <div class="cdc-mode"><code>no_data</code><span>Schema only, no existing rows — stream from now on. (was <em>schema_only</em>)</span></div>
        <div class="cdc-mode"><code>never</code><span>Never snapshot; stream only. Valid only if needed data is still in the WAL.</span></div>
        <div class="cdc-mode"><code>always</code><span>Snapshot on every start. Expensive; special re-sync cases.</span></div>
        <div class="cdc-mode"><code>recovery</code><span>Rebuild schema history. (was <em>schema_only_recovery</em>)</span></div>
      </div>

      <div class="callout callout-key">
        <div class="callout-head">🔑 Incremental snapshots: backfill without stopping</div>
        <p>Need to add a table to capture, or re-sync one, after you\'re already streaming? An <strong>incremental snapshot</strong> is triggered by a signal (<code>execute-snapshot</code> written to the signaling table), runs <strong>in chunks concurrently with streaming</strong>, and is <strong>resumable</strong>. No stop-the-world, no pausing the live stream — its READ events interleave with the stream and are de-duplicated by key.</p>
      </div>
      <p class="cdc-note-line">If the WAL a connector needs is gone (long outage, slot invalidated), there is no position to stream from — it must take a <strong>fresh snapshot</strong> to recover. You saw that failure and recovery in <a href="#m25">M25</a>.</p>
    </div>`;
}

function buildLab(container) {
  const tab = container.querySelector('#tab-lab');
  tab.innerHTML = `
    <div class="cdc-scope-note">⚠️ Deterministic simulation. Preloaded rows represent data that existed <em>before</em> capture started; watch which snapshot mode does (or doesn\'t) backfill them.</div>
    <div class="cdc-lab">
      <div class="cdc-lab-controls">
        <div class="cdc-ctrl-group">
          <span class="cdc-ctrl-label">snapshot.mode</span>
          <select class="study-select cdc-mode-select" id="snap-mode">
            <option value="initial">initial</option>
            <option value="initial_only">initial_only</option>
            <option value="no_data">no_data</option>
            <option value="never">never</option>
          </select>
        </div>
        <div class="cdc-ctrl-group">
          <span class="cdc-ctrl-label">Run</span>
          <button class="ctrl-btn" data-act="start">▶ Start connector</button>
          <button class="ctrl-btn" data-act="change" disabled>✏️ Live change</button>
          <button class="ctrl-btn" data-act="incr" disabled>➕ Incremental snapshot</button>
        </div>
        <button class="ctrl-btn cdc-reset" data-act="reset">↺ Reset</button>
      </div>

      <div class="cdc-phase-bar" id="snap-phase"></div>

      <div class="cdc-lab-grid">
        <div class="cdc-box">
          <div class="cdc-box-head">🗄️ Source <code>orders</code> <span class="cdc-box-sub">3 rows existed before capture</span></div>
          <div class="cdc-box-body" id="snap-table"></div>
        </div>
        <div class="cdc-box">
          <div class="cdc-box-head">📥 Events captured <span class="cdc-box-sub">READ = snapshot · c/u/d = stream</span></div>
          <div class="cdc-box-body cdc-wal-scroll" id="snap-events"></div>
        </div>
      </div>
      <div class="cdc-box-foot" id="snap-explain"></div>
    </div>`;

  let sim, nextId, started, streamingActive, mode;
  const $ = s => container.querySelector(s);

  function fresh() {
    sim = new CDCSim({ seed: 9 });
    sim.createTable('orders', { pk: 'id', columns: ['id', 'status', 'amount'] });
    nextId = 1; started = false; streamingActive = false;
    mode = $('#snap-mode').value;
    // Preload 3 rows as pre-existing data (committed, not yet streamed).
    sim.stopConnector();
    for (let i = 0; i < 3; i++) sim.applyInsert('orders', { id: nextId++, status: 'NEW', amount: 20 + i * 10 });
    sim.startConnector();
    sim.connector.lastLsn = 0; sim.slot.confirmedFlushLsn = 0; sim.connector.snapshotDone = false;
  }

  const EXPLAIN = {
    initial: 'initial: the 3 pre-existing rows are backfilled as READ (op:r) events, then new changes stream. The common case — downstream ends up with everything.',
    initial_only: 'initial_only: the 3 rows are snapshotted, then the connector stops. Press "Live change" — notice it is NOT captured, because streaming never starts.',
    no_data: 'no_data (schema only): the pre-existing rows are skipped; only changes from now on stream. Downstream will be missing the historical rows until you run an incremental snapshot.',
    never: 'never: no snapshot at all; streaming starts from the current WAL head. The pre-existing rows are never captured — only valid when you truly don\'t need them.',
  };

  function phaseLabel() {
    if (!started) return `<span class="cdc-phase cdc-phase-idle">idle</span> connector not started`;
    if (!streamingActive) return `<span class="cdc-phase cdc-phase-snap">snapshot done · stopped</span> initial_only: streaming never begins`;
    return `<span class="cdc-phase cdc-phase-stream">streaming</span> capturing new committed changes`;
  }

  function render() {
    const rows = sim.currentState('orders');
    $('#snap-table').innerHTML = rows.length
      ? `<table class="cdc-tbl"><thead><tr><th>id</th><th>status</th><th>amount</th></tr></thead><tbody>${
          rows.map(r => `<tr><td>${r.id}</td><td>${r.status}</td><td>$${r.amount}</td></tr>`).join('')}</tbody></table>`
      : `<div class="cdc-empty">— empty —</div>`;

    const evs = sim.bronze.filter(e => e.table === 'orders');
    const tag = e => e.op === 'r'
      ? (e.source.snapshot === 'incremental' ? '<span class="cdc-src-tag cdc-src-incr">incremental</span>' : '<span class="cdc-src-tag cdc-src-snap">snapshot</span>')
      : '<span class="cdc-src-tag cdc-src-stream">stream</span>';
    const opL = { c: 'INSERT', u: 'UPDATE', d: 'DELETE', r: 'READ' };
    $('#snap-events').innerHTML = evs.length
      ? evs.map(e => `<div class="cdc-wal-rec"><span class="cdc-ev-op cdc-ev-${e.op}">${opL[e.op]}</span><span class="cdc-ev-key">id=${e.key}</span>${tag(e)}</div>`).join('')
      : `<div class="cdc-empty">— nothing captured yet —</div>`;

    $('#snap-phase').innerHTML = phaseLabel();
    $('#snap-explain').innerHTML = started ? EXPLAIN[mode] : 'Pick a snapshot.mode and press Start. The 3 rows below existed before capture — see which modes backfill them.';

    tab.querySelector('[data-act="start"]').disabled = started;
    tab.querySelector('[data-act="change"]').disabled = !started;
    tab.querySelector('[data-act="incr"]').disabled = !(started && streamingActive);
    $('#snap-mode').disabled = started;
  }

  tab.querySelector('.cdc-lab-controls').addEventListener('click', e => {
    const act = e.target.closest('button')?.dataset.act;
    if (!act) return;
    try {
      if (act === 'start' && !started) {
        started = true;
        if (mode === 'initial' || mode === 'initial_only') {
          sim.snapshot('orders');                 // READ events for existing rows
          streamingActive = (mode === 'initial');
          if (!streamingActive) sim.stopConnector();
        } else {                                   // no_data / never: skip existing rows
          sim.connector.lastLsn = sim.nextLsn - 1;
          sim.slot.confirmedFlushLsn = sim.connector.lastLsn;
          sim.connector.snapshotDone = true;
          streamingActive = true;
        }
      } else if (act === 'change') {
        const ids = sim.currentState('orders').map(r => r.id);
        if (ids.length && Math.random() < 0.5) sim.applyUpdate('orders', ids[ids.length - 1], { status: 'SHIPPED' });
        else sim.applyInsert('orders', { id: nextId++, status: 'NEW', amount: 77 });
        sim.poll(); // delivers only if streaming is active
      } else if (act === 'incr') {
        sim.incrementalSnapshot('orders');
      } else if (act === 'reset') {
        fresh();
      }
    } catch (err) {}
    render();
  });

  $('#snap-mode').addEventListener('change', () => { mode = $('#snap-mode').value; });

  fresh();
  render();
  return null;
}
