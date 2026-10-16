import { createModuleShell, createIQSection } from '../components/module-shell.js';

const IQ = [
  {
    q: 'Walk me through how you would implement an incremental model for a 2-billion-row Flipkart clickstream table.',
    a: `<strong>The implementation:</strong>
    <div style="margin:6px 0;padding:10px;background:var(--bg);border:1px solid var(--border);border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-2)">
    {{ config(<br>
    &nbsp;&nbsp;materialized = 'incremental',<br>
    &nbsp;&nbsp;unique_key   = 'event_id',<br>
    &nbsp;&nbsp;on_schema_change = 'sync_all_columns'<br>
    ) }}<br><br>
    SELECT event_id, user_id, event_type, page_url, session_id, occurred_at<br>
    FROM {{ source('clickstream', 'raw_events') }}<br>
    {% if is_incremental() %}<br>
    WHERE occurred_at > (SELECT MAX(occurred_at) FROM {{ this }})<br>
    {% endif %}
    </div>
    <strong>Key decisions explained:</strong>
    <ul>
      <li><strong>unique_key:</strong> Enables MERGE (upsert) instead of append-only INSERT. If Flipkart's event system can replay events, a MERGE prevents duplicates.</li>
      <li><strong>Watermark via MAX(occurred_at):</strong> Simple and reliable for append-only event streams. The <code>{{ this }}</code> macro refers to the current model's table.</li>
      <li><strong>Late-arriving data handling:</strong> Add a lookback window: <code>WHERE occurred_at > (SELECT MAX(occurred_at) - INTERVAL '3 hours' FROM {{ this }})</code>. Prevents missing events that arrive late due to mobile clients being offline.</li>
      <li><strong>on_schema_change:</strong> If Flipkart's engineering team adds new columns to raw_events, sync_all_columns automatically adds them to the incremental table.</li>
    </ul>`,
    tip: 'The late-arriving data lookback window is the sign of someone who\'s run a real clickstream pipeline in production. Events from mobile apps arrive hours or days late — a strict MAX() watermark silently drops them.',
  },
  {
    q: 'An incremental model is producing duplicate rows. How do you diagnose the root cause?',
    a: `<strong>Diagnosis steps:</strong>
    <ol>
      <li><strong>Check the unique_key config:</strong> Is <code>unique_key</code> set? Without it, the model appends rows on every run — if a row's watermark column is updated (backfill, correction), it gets inserted again.</li>
      <li><strong>Check the watermark logic:</strong> Is the <code>WHERE occurred_at > MAX(occurred_at)</code> using strict <code>></code> or <code>>=</code>? With <code>>=</code>, the row at the exact watermark boundary gets inserted on every run.</li>
      <li><strong>Check for source duplicates:</strong> <code>SELECT unique_key_col, COUNT(*) FROM source GROUP BY 1 HAVING COUNT(*) > 1</code>. If the source has duplicates, the incremental model inherits them.</li>
      <li><strong>Check if a full-refresh was interrupted:</strong> A partial full-refresh can leave the table in an inconsistent state with both old and new rows.</li>
    </ol>
    <strong>Fixes:</strong>
    <ul>
      <li>Add or correct the <code>unique_key</code> config to force MERGE behavior.</li>
      <li>Fix the watermark to use strict <code>></code>.</li>
      <li>Run <code>dbt run --full-refresh</code> to rebuild from scratch (use as a last resort on very large tables).</li>
      <li>Deduplicate in a downstream model: <code>SELECT DISTINCT ON (event_id) * FROM {{ ref(...) }} ORDER BY event_id, loaded_at DESC</code>.</li>
    </ul>`,
    tip: 'The <code>>=</code> vs <code>></code> boundary bug is subtle and extremely common in production incremental models. Mentioning it shows you\'ve been burned by it.',
  },
  {
    q: 'When does an incremental model become worse than a full-refresh table? What are the hidden costs?',
    a: `<strong>Incremental becomes worse when:</strong>
    <ul>
      <li><strong>Backfills are common:</strong> Any historical data correction requires <code>--full-refresh</code>, which defeats the purpose. If the source system frequently corrects historical records (late payment updates, order cancellations), you're doing full refreshes constantly anyway.</li>
      <li><strong>Business logic changes:</strong> If the model's SQL changes (new column, different calculation), you need a full refresh. Each logic change = full cost of a full refresh.</li>
      <li><strong>The MERGE cost on large tables:</strong> On tables with 10B+ rows, the MERGE operation (comparing new rows against all existing rows) can be very expensive. Sometimes a full refresh of a partitioned table is cheaper.</li>
      <li><strong>Debugging difficulty:</strong> Incremental state can accumulate subtle errors over months. A full-refresh table always has provably correct data; an incremental table's correctness depends on every run having been correct.</li>
    </ul>
    <strong>Rule of thumb:</strong> A 1B-row Redshift table with 100K new rows/day is the sweet spot. A 10M-row table that's fully requeried in 90 seconds doesn't need incremental — the complexity cost exceeds the savings.`,
    tip: '"The complexity cost of incremental must exceed the compute savings to justify it" is a mature engineering take. Interviewers will probe whether you use it by default or by judgement.',
  },
  {
    q: 'Explain the `>` vs `>=` watermark bug and the exact failure each one causes.',
    a: `The incremental filter is <code>where updated_at [op] (select max(updated_at) from {{ this }})</code>. The operator choice is a trade-off between <strong>missing</strong> and <strong>duplicating</strong>:
    <ul>
      <li><strong><code>&gt;</code> (strict):</strong> on each run you reprocess nothing at the boundary. But any row whose <code>updated_at</code> <em>equals</em> the current max — a tie at the exact watermark second — is excluded next run and <strong>silently lost</strong>. Common when many rows share a batch-load timestamp.</li>
      <li><strong><code>&gt;=</code>:</strong> you never miss boundary ties, but the row(s) at exactly the watermark get <strong>reprocessed every run</strong> — harmless with <code>merge</code> (idempotent upsert), but with <code>append</code> it produces growing duplicates.</li>
    </ul>
    <strong>The robust pattern:</strong> use <code>&gt;=</code> with a <code>unique_key</code> + <code>merge</code> (reprocessing the boundary is then idempotent), or <code>&gt;</code> plus a lookback window. Never <code>&gt;=</code> with <code>append</code>. Try both operators in the Lab tab with a tie at the boundary.`,
    tip: 'Frame it as "strict > risks missing boundary ties; >= risks reprocessing them. merge makes >= safe; append makes >= dangerous." That shows you reason about it as a correctness trade-off, not a style choice.',
  },
  {
    q: 'What do `append`, `merge`, and `delete+insert` incremental strategies actually do differently?',
    a: `All three decide how passing rows are written; they differ in how they treat keys that already exist:
    <ul>
      <li><strong>append</strong> — blind <code>INSERT</code> of every new row. No <code>unique_key</code> needed, fastest, but it <em>never</em> updates: a changed existing row becomes a second physical row. Only safe for immutable, append-only events.</li>
      <li><strong>merge</strong> — <code>MERGE</code> on <code>unique_key</code>: existing keys are updated in place, new keys inserted. Idempotent. Requires unique keys in the <em>incoming batch</em> — duplicate source keys raise an error on Snowflake/BigQuery.</li>
      <li><strong>delete+insert</strong> — delete target rows whose key is in the batch, then insert the batch. Achieves an upsert without a native MERGE (handy on engines where MERGE is costly, e.g. some Redshift/Spark cases), but within-batch duplicate keys still land as duplicate rows.</li>
    </ul>
    Adapter note: the <em>default</em> strategy differs by warehouse (Snowflake/BigQuery/Databricks default to <code>merge</code>; older Redshift/Spark often <code>append</code> or <code>delete+insert</code>).`,
    tip: 'Name the adapter defaults — "merge on Snowflake/BigQuery, delete+insert or append elsewhere." It signals you have shipped on more than one warehouse.',
  },
  {
    q: 'What does `on_schema_change` do, and why can\'t it handle every schema change?',
    a: `<code>on_schema_change</code> controls what happens when your model's column set no longer matches the existing incremental table:
    <ul>
      <li><code>ignore</code> (older default) — new columns are not added; they're silently dropped from the insert.</li>
      <li><code>append_new_columns</code> — new columns are added to the table (existing rows get NULL for them).</li>
      <li><code>sync_all_columns</code> — adds new <em>and</em> removes deleted columns.</li>
      <li><code>fail</code> — abort so a human decides.</li>
    </ul>
    <strong>What it cannot do:</strong> it only reconciles the <em>column set</em>. It does <strong>not</strong> backfill the new column's values for historical rows, change a column's data <em>type</em>, or recompute changed business logic. Any of those needs a <code>--full-refresh</code>. So <code>on_schema_change</code> smooths additive column changes; it is not a substitute for rebuilding when semantics change.`,
    tip: 'The line "it reconciles columns, not history or logic — those need --full-refresh" is the senior distinction. Juniors think it handles all schema evolution.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M13 · Core Features',
    title: 'Incremental Models',
    subtitle: 'Don\'t reprocess 10 billion rows every night. Process only what\'s new.',
    tabs: [
      { id: 'visual', label: '🎬 Full vs Incremental' },
      { id: 'lab',    label: '🔬 Lab · Incremental run' },
      { id: 'detail', label: '📋 How It Works' },
      { id: 'iq',     label: '🎯 Interview Q&A' },
    ]
  });

  const cleanup = buildVisual(container);
  buildLab(container);
  buildDetail(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

// ── Lab D · Incremental data processing ───────────────────────────────────────
// Deterministic simulation of one incremental run. You compose an incoming batch
// (new / updated / late-arriving / duplicate-key rows), choose the watermark
// operator + lookback and the incremental_strategy, and see exactly which rows
// are processed, which are silently missed, and which create duplicates — and
// why. No SQL is executed; this models dbt's documented merge/append behaviour.
const WM = 240;                           // watermark = D10 00:00 (hours since epoch)
const EXISTS_MAX = 100;                   // target already holds order_id 1..100
const isExisting = id => id <= EXISTS_MAX;
const fmtTs = (h) => `D${Math.floor(h / 24)} ${String(h % 24).padStart(2, '0')}:00`;

function buildBatch(c) {
  const rows = [];
  for (let i = 1; i <= c.neu; i++)    rows.push({ id: EXISTS_MAX + i, ts: WM + 2 + i, role: 'new' });
  for (let i = 1; i <= c.upd; i++)    rows.push({ id: i, ts: WM + 1 + i, role: 'updated' });
  for (let i = 1; i <= c.late; i++)   rows.push({ id: 200 + i, ts: WM - i, role: 'late' });
  for (let i = 1; i <= c.dup; i++)    rows.push({ id: EXISTS_MAX + 1, ts: WM + 4 + i, role: 'dup' }); // repeats first new key
  return rows;
}

function buildLab(container) {
  const tab = container.querySelector('#tab-lab');
  const st = { neu: 3, upd: 2, late: 2, dup: 0, op: '>', lookback: 0, strategy: 'merge' };

  const num = (id, label, val, max) => `
    <div class="cf-field"><label for="${id}">${label}</label>
      <input type="number" id="${id}" min="0" max="${max}" value="${val}"></div>`;

  tab.innerHTML = `
    <div class="cf-lab">
      <div class="cf-lab-intro">
        <strong>Run one incremental batch.</strong> Compose what arrives tonight, pick the watermark rule and
        the <code>incremental_strategy</code>, then read which rows dbt would process, miss, or duplicate — and
        why. The target already holds <code>order_id 1–100</code>; the watermark is <code>${fmtTs(WM)}</code>.
        <span class="cf-sim">🧪 Deterministic model of dbt's documented merge/append behaviour — no SQL runs.</span>
      </div>
      <div class="cf-controls">
        ${num('m13-new', 'New rows', st.neu, 5)}
        ${num('m13-upd', 'Updated (existing keys)', st.upd, 4)}
        ${num('m13-late', 'Late-arriving', st.late, 4)}
        ${num('m13-dup', 'Duplicate keys', st.dup, 3)}
        <div class="cf-field"><label for="m13-op">Watermark operator</label>
          <select id="m13-op"><option value="&gt;">&gt; (strict)</option><option value="&gt;=">&gt;= </option></select></div>
        <div class="cf-field"><label for="m13-lb">Lookback window</label>
          <select id="m13-lb"><option value="0">none (strict)</option><option value="3">3 hours</option><option value="6">6 hours</option><option value="24">24 hours</option></select></div>
        <div class="cf-field"><label for="m13-strat">incremental_strategy</label>
          <select id="m13-strat"><option value="merge">merge (unique_key)</option><option value="append">append</option><option value="delete+insert">delete+insert</option></select></div>
      </div>
      <div class="cf-pane"><div class="cf-pane-h">Compiled filter · what dbt sends on an incremental run</div>
        <pre id="m13-filter"></pre></div>
      <div class="cf-pane"><div class="cf-pane-h">Incoming batch · fate of each row</div>
        <div style="overflow-x:auto;padding:10px"><table class="cf-simtable" id="m13-table"></table></div></div>
      <div class="cf-readout" id="m13-verdict"></div>
    </div>`;

  const readInputs = () => {
    st.neu = +tab.querySelector('#m13-new').value || 0;
    st.upd = +tab.querySelector('#m13-upd').value || 0;
    st.late = +tab.querySelector('#m13-late').value || 0;
    st.dup = +tab.querySelector('#m13-dup').value || 0;
    st.op = tab.querySelector('#m13-op').value.includes('=') ? '>=' : '>';
    st.lookback = +tab.querySelector('#m13-lb').value || 0;
    st.strategy = tab.querySelector('#m13-strat').value;
  };

  function simulate() {
    const batch = buildBatch(st);
    const threshold = WM - st.lookback;
    const passes = r => st.op === '>=' ? r.ts >= threshold : r.ts > threshold;

    // within-batch key multiplicity (for duplicate detection)
    const keyCount = {};
    batch.forEach(r => { if (passes(r)) keyCount[r.id] = (keyCount[r.id] || 0) + 1; });
    const seen = {};

    const out = batch.map(r => {
      if (!passes(r)) return { ...r, fate: 'miss', why: `${fmtTs(r.ts)} is below the watermark — filtered out` };
      seen[r.id] = (seen[r.id] || 0) + 1;
      const dupInBatch = keyCount[r.id] > 1;
      if (st.strategy === 'append') {
        if (isExisting(r.id)) return { ...r, fate: 'dup', why: 'append INSERTs — existing key becomes a 2nd row (no upsert)' };
        if (dupInBatch && seen[r.id] > 1) return { ...r, fate: 'dup', why: 'append INSERTs every row — repeated key duplicated' };
        return { ...r, fate: 'new', why: 'inserted as a new row' };
      }
      if (st.strategy === 'merge') {
        if (dupInBatch) return { ...r, fate: seen[r.id] > 1 ? 'dup' : 'upd', why: 'duplicate unique_key in source — merge is ambiguous' };
        return isExisting(r.id)
          ? { ...r, fate: 'upd', why: 'merged on unique_key — existing row updated' }
          : { ...r, fate: 'new', why: 'merged on unique_key — inserted' };
      }
      // delete+insert
      if (dupInBatch && seen[r.id] > 1) return { ...r, fate: 'dup', why: 'delete+insert inserts every batch row — repeated key duplicated' };
      return isExisting(r.id)
        ? { ...r, fate: 'upd', why: 'matching key deleted then re-inserted (net update)' }
        : { ...r, fate: 'new', why: 'inserted as a new row' };
    });

    const n = f => out.filter(r => r.fate === f).length;
    const mergeDupConflict = st.strategy === 'merge' && Object.values(keyCount).some(c => c > 1);
    return { out, missed: n('miss'), dups: n('dup'), news: n('new'), upds: n('upd'), mergeDupConflict, threshold };
  }

  const ROLE = { new: 'new', updated: 'upd', late: 'skip', dup: 'dup' };
  const FATE = { new: ['new', 'INSERT'], upd: ['upd', 'UPDATE'], dup: ['dup', 'DUPLICATE'], miss: ['miss', 'MISSED'] };

  function render() {
    readInputs();
    const { out, missed, dups, news, upds, mergeDupConflict, threshold } = simulate();

    const lbTxt = st.lookback > 0 ? ` - interval '${st.lookback} hours'` : '';
    container.querySelector('#m13-filter').innerHTML =
      esc(`{{ config(materialized='incremental', unique_key='order_id',
          incremental_strategy='${st.strategy}') }}

{% if is_incremental() %}
where updated_at ${st.op} (
    select max(updated_at)${lbTxt} from {{ this }}
)   -- threshold = ${fmtTs(threshold)}
{% endif %}`);

    container.querySelector('#m13-table').innerHTML = `
      <thead><tr><th>order_id</th><th>updated_at</th><th>in batch as</th><th>passes filter?</th><th>result</th><th>why</th></tr></thead>
      <tbody>${out.map(r => {
        const [cls, tag] = FATE[r.fate];
        const pass = r.fate !== 'miss';
        return `<tr class="cf-row-${cls}">
          <td>${r.id}${isExisting(r.id) ? '' : ' <span style="opacity:.5">(new key)</span>'}</td>
          <td>${fmtTs(r.ts)}</td>
          <td><span class="cf-tag ${ROLE[r.role]}">${r.role}</span></td>
          <td>${pass ? '✓' : '✕'}</td>
          <td><span class="cf-tag ${cls}">${tag}</span></td>
          <td style="font-family:inherit">${r.why}</td></tr>`;
      }).join('')}</tbody>`;

    const ro = container.querySelector('#m13-verdict');
    const msgs = [];
    if (mergeDupConflict) msgs.push(`<div class="cf-ro-row err">⛔ <strong>merge aborts:</strong> the source batch has a duplicate <code>unique_key</code>. Snowflake &amp; BigQuery raise <em>"duplicate rows in source"</em>. Deduplicate the source (e.g. <code>qualify row_number() over (partition by order_id order by updated_at desc) = 1</code>) before loading.</div>`);
    if (missed > 0) msgs.push(`<div class="cf-ro-row err">⚠ <strong>${missed} late-arriving row(s) silently dropped.</strong> They sit below the watermark, so the filter excludes them forever. Raise the <em>lookback window</em> above the lateness, or track a reliable <code>loaded_at</code> instead of event time.</div>`);
    if (dups > 0) msgs.push(`<div class="cf-ro-row warn">⚠ <strong>${dups} duplicate row(s) created.</strong> ${st.strategy === 'append' ? 'append never upserts — switch to <code>merge</code> with a <code>unique_key</code> to update existing rows in place.' : 'the batch contains repeated keys — dedupe the source before insert.'}</div>`);
    const clean = !mergeDupConflict && missed === 0 && dups === 0;
    ro.className = `cf-readout ${clean ? 'ok' : 'bad'}`;
    ro.innerHTML = `
      <div class="cf-ro-head">${clean ? '✅' : '⚠️'} ${news} inserted · ${upds} updated · ${dups} duplicated · ${missed} missed</div>
      ${clean
        ? `<div class="cf-ro-row ok">Every new and updated row was processed exactly once, nothing was missed, and no duplicates were created. This is the behaviour you want: <code>merge</code> on a <code>unique_key</code>, with a lookback window wide enough to catch late data.</div>`
        : msgs.join('')}`;
  }

  tab.addEventListener('input', e => { if (e.target.closest('.cf-controls')) render(); });
  tab.addEventListener('change', e => { if (e.target.closest('.cf-controls')) render(); });
  tab.querySelector('#m13-strat').value = st.strategy;
  render();
}
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function buildVisual(container) {
  const tab = container.querySelector('#tab-visual');
  const wrap = document.createElement('div');
  wrap.className = 'canvas-wrap';

  const cv = document.createElement('canvas');
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = 820 * DPR; cv.height = 420 * DPR;
  cv.style.cssText = 'width:100%;max-width:820px';
  wrap.appendChild(cv);

  const ctrl = document.createElement('div');
  ctrl.className = 'canvas-controls';
  ctrl.innerHTML = `
    <button class="ctrl-btn" id="m13-run">▶ Simulate nightly run</button>
    <button class="ctrl-btn" id="m13-reset">↺ Reset</button>
    <span class="ctrl-label">Flipkart clickstream: 2 billion rows · 50K new rows tonight</span>`;
  wrap.appendChild(ctrl);
  tab.appendChild(wrap);

  const ctx = cv.getContext('2d');
  ctx.scale(DPR, DPR);
  const W = 820, H = 420;

  let state;
  function init() {
    state = {
      running: false,
      fullProgress: 0,   // 0→1, slow (takes ~8s)
      incrProgress: 0,   // 0→1, fast (takes ~1.2s)
      fullDone: false,
      incrDone: false,
      timer: 0,
    };
  }
  init();

  ctrl.querySelector('#m13-run').addEventListener('click', () => {
    if (!state.running && !state.fullDone) state.running = true;
  });
  ctrl.querySelector('#m13-reset').addEventListener('click', init);

  function rr(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
    ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
    ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
  }

  const FULL_DURATION = 7.0;
  const INCR_DURATION = 1.1;

  let raf = null, lastT = 0;

  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05);
    lastT = ts;

    if (state.running) {
      state.timer += dt;
      state.fullProgress = Math.min(1, state.timer / FULL_DURATION);
      state.incrProgress = Math.min(1, state.timer / INCR_DURATION);
      if (state.fullProgress >= 1) { state.running = false; state.fullDone = true; state.incrDone = true; }
    }

    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, W, H);

    // ── LEFT PANEL: table (full refresh) ────────────────────────────
    const lx = 20, pw = 375, ph = 370, py = 25;
    const fullRunning = state.running && state.fullProgress < 1;
    rr(ctx, lx, py, pw, ph, 8, '#100A0A', state.fullDone ? '#EF4444' : fullRunning ? '#F59E0B' : '#1E2D43');

    ctx.fillStyle = '#F59E0B'; ctx.font = 'bold 12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('materialized = "table"', lx + pw/2, py + 24);
    ctx.fillStyle = '#4B5E78'; ctx.font = '10px Inter, sans-serif';
    ctx.fillText('Full refresh every run', lx + pw/2, py + 42);

    // Big data pool bar
    const barX = lx + 20, barY = py + 60, barW = pw - 40, barH = 30;
    rr(ctx, barX, barY, barW, barH, 4, '#1A1A2A', null);

    // Fill
    const fullW = barW * state.fullProgress;
    if (fullW > 4) {
      rr(ctx, barX, barY, fullW, barH, 4, fullRunning ? '#F59E0B44' : state.fullDone ? '#EF444422' : '#1E2D43', null);
    }
    // All rows indicator
    rr(ctx, barX, barY, barW, barH, 4, null, '#2A3550');

    // Row count labels
    ctx.fillStyle = '#4B5E78'; ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('0', barX, barY + barH + 14);
    ctx.textAlign = 'right';
    ctx.fillText('2,000,000,000 rows', barX + barW, barY + barH + 14);

    ctx.fillStyle = '#F59E0B'; ctx.font = 'bold 10px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('SCANS ALL 2B ROWS', barX + barW/2, barY + barH/2 + 4);

    // Metrics
    const metrics = [
      ['Rows scanned:', `${Math.floor(state.fullProgress * 2e9).toLocaleString()}`],
      ['Elapsed time:', state.fullDone ? '3h 42m' : fullRunning ? `${(state.timer * (222/7)).toFixed(0)}m elapsed…` : '—'],
      ['Compute cost:', state.fullDone ? '$18.40' : '—'],
    ];
    metrics.forEach(([label, val], i) => {
      ctx.fillStyle = '#4B5E78'; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(label, lx + 24, py + 130 + i * 34);
      ctx.fillStyle = i === 1 && state.fullDone ? '#EF4444'
                    : i === 2 && state.fullDone ? '#EF4444' : '#8895AA';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.fillText(val, lx + 160, py + 130 + i * 34);
    });

    if (state.fullDone) {
      rr(ctx, lx + 20, py + 230, pw - 40, 70, 6, '#2A0A0A', '#EF4444');
      ctx.fillStyle = '#EF4444'; ctx.font = 'bold 11px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Runs at 2 AM every night.', lx + pw/2, py + 258);
      ctx.fillText('Finishes at 5:42 AM.', lx + pw/2, py + 276);
      ctx.fillStyle = '#8895AA'; ctx.font = '10px Inter, sans-serif';
      ctx.fillText('98% of work is re-processing data', lx + pw/2, py + 295);
      ctx.fillText('that hasn\'t changed since yesterday.', lx + pw/2, py + 309);
    }

    // ── RIGHT PANEL: incremental ─────────────────────────────────────
    const rx = 425;
    const incrRunning = state.running && state.incrProgress < 1;
    rr(ctx, rx, py, pw, ph, 8, '#0A100A', state.incrDone ? '#10B981' : incrRunning ? '#10B981' : '#1E2D43');

    ctx.fillStyle = '#10B981'; ctx.font = 'bold 12px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('materialized = "incremental"', rx + pw/2, py + 24);
    ctx.fillStyle = '#4B5E78'; ctx.font = '10px Inter, sans-serif';
    ctx.fillText('Appends/merges new rows only', rx + pw/2, py + 42);

    // Timeline bar with watermark
    const ibX = rx + 20, ibY = py + 60, ibW = pw - 40, ibH = 30;
    rr(ctx, ibX, ibY, ibW, ibH, 4, '#1A1A2A', null);

    // Historical data (grey)
    const histW = ibW * 0.975;
    rr(ctx, ibX, ibY, histW, ibH, 4, '#1E2D43', null);

    // New rows (blue)
    const newW = ibW * 0.025;
    const newFill = state.incrProgress > 0 ? state.incrDone ? '#10B98144' : '#10B98188' : '#3B82F644';
    rr(ctx, ibX + histW, ibY, newFill === '#10B98144' ? newW : newW * state.incrProgress, ibH, 4, newFill, null);

    rr(ctx, ibX, ibY, ibW, ibH, 4, null, '#2A3550');

    // Watermark marker
    const wmX = ibX + histW;
    ctx.strokeStyle = '#10B981'; ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(wmX, ibY - 8); ctx.lineTo(wmX, ibY + ibH + 8); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#10B981'; ctx.font = 'bold 8px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('WATERMARK', wmX, ibY - 12);
    ctx.fillText('MAX(occurred_at)', wmX, ibY + ibH + 22);

    ctx.fillStyle = '#4B5E78'; ctx.font = '8px Inter, sans-serif';
    ctx.fillText('1.95B rows', ibX + histW/2, ibY + ibH/2 + 3);
    ctx.fillText('(skip)', ibX + histW/2, ibY + ibH/2 + 14);
    ctx.fillStyle = '#10B981'; ctx.font = 'bold 8px Inter, sans-serif';
    ctx.fillText('50K new', ibX + histW + newW/2, ibY + ibH/2 + 4);

    // Metrics
    const iMetrics = [
      ['Rows scanned:', `${Math.floor(state.incrProgress * 50000).toLocaleString()}`],
      ['Elapsed time:', state.incrDone ? '4m 12s ✓' : incrRunning ? `${(state.timer * (252/1.1)).toFixed(0)}s elapsed…` : '—'],
      ['Compute cost:', state.incrDone ? '$0.92' : '—'],
    ];
    iMetrics.forEach(([label, val], i) => {
      ctx.fillStyle = '#4B5E78'; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(label, rx + 24, py + 130 + i * 34);
      ctx.fillStyle = i === 1 && state.incrDone ? '#10B981'
                    : i === 2 && state.incrDone ? '#10B981' : '#8895AA';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.fillText(val, rx + 160, py + 130 + i * 34);
    });

    if (state.incrDone) {
      rr(ctx, rx + 20, py + 230, pw - 40, 70, 6, '#0A200A', '#10B981');
      ctx.fillStyle = '#10B981'; ctx.font = 'bold 11px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Runs at 2 AM every night.', rx + pw/2, py + 258);
      ctx.fillText('Finishes at 2:04 AM.', rx + pw/2, py + 276);
      ctx.fillStyle = '#8895AA'; ctx.font = '10px Inter, sans-serif';
      ctx.fillText('Processes only 50K new rows.', rx + pw/2, py + 295);
      ctx.fillText('20× faster · 95% cheaper.', rx + pw/2, py + 309);
    }

    // Savings summary
    if (state.incrDone) {
      ctx.fillStyle = '#10B981'; ctx.font = 'bold 13px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Savings: 3h 38m · $17.48 per run · $6,380/year', W/2, H - 14);
    } else {
      ctx.fillStyle = '#4B5E78'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Both strategies produce identical output — only the compute cost differs', W/2, H - 14);
    }

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });
  return () => { if (raf) cancelAnimationFrame(raf); };
}

function buildDetail(container) {
  container.querySelector('#tab-detail').innerHTML = `
    <div class="detail-section">
      <h3>The problem: event tables grow forever</h3>
      <p>Clickstream, transaction, and log tables grow by millions of rows every day. A <code>table</code> materialization drops and rebuilds the entire table on every dbt run — reprocessing 2 billion rows to incorporate 50,000 new ones. Incremental models solve this by only processing rows added since the last run.</p>
      <div class="code-block">{{ config(
    materialized = 'incremental',
    unique_key   = 'event_id',         -- enables MERGE (upsert) instead of INSERT
) }}

SELECT event_id, user_id, event_type, occurred_at
FROM {{ source('clickstream', 'raw_events') }}
{% if is_incremental() %}
  -- Only on incremental runs: skip already-processed rows
  WHERE occurred_at > (SELECT MAX(occurred_at) FROM {{ this }})
{% endif %}</div>
    </div>
    <div class="detail-section">
      <h3>How is_incremental() works</h3>
      <p>On the <strong>first run</strong>, <code>is_incremental()</code> is <code>false</code> — the model creates the full table. On every <strong>subsequent run</strong>, it's <code>true</code> — the WHERE clause filters to only new rows. The <code>{{ this }}</code> macro resolves to the current table so you can query its current max timestamp as a watermark.</p>
    </div>
    <div class="detail-section">
      <h3>Late-arriving data: the gotcha</h3>
      <p>Mobile app events can arrive hours or days late (the user was offline). A strict <code>MAX(occurred_at)</code> watermark silently drops them. The production fix: add a lookback buffer.</p>
      <div class="code-block">WHERE occurred_at > (
    SELECT MAX(occurred_at) - INTERVAL '3 hours'   -- 3-hour lookback buffer
    FROM {{ this }}
)</div>
    </div>
    <div class="detail-section">
      <h3>When NOT to use incremental</h3>
      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead><tr><th>Scenario</th><th>Recommendation</th><th>Reason</th></tr></thead>
          <tbody>
            <tr><td>Table &lt; 100M rows, full refresh &lt; 2 min</td><td>Use <code>table</code></td><td>Complexity not worth the savings</td></tr>
            <tr><td>Historical corrections are frequent</td><td>Use <code>table</code></td><td>You'd need <code>--full-refresh</code> constantly anyway</td></tr>
            <tr><td>Complex aggregations across all rows</td><td>Use <code>table</code></td><td>Incremental aggregations require complex merge logic</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="detail-section">
      <h3>Going deeper — the four failure modes</h3>
      <p>Incremental models trade compute for correctness risk. Every production incident traces to one of these four — work them live in the <strong>Lab</strong> tab.</p>
      <details class="cf-det"><summary>1 · Late-arriving data silently dropped</summary>
        <p>A strict <code>updated_at &gt; max(updated_at)</code> excludes any row that arrives after the run but carries an earlier event time (offline mobile client, delayed webhook). It is never reprocessed — the data is simply gone from the model. Fixes: a <strong>lookback window</strong> (<code>max(updated_at) - interval '3 hours'</code>) wide enough to cover realistic lateness, or filter on a reliable <code>loaded_at</code> (ingestion time) instead of event time.</p>
      </details>
      <details class="cf-det"><summary>2 · Boundary ties (&gt; vs &gt;=)</summary>
        <p>When many rows share the exact max timestamp, <code>&gt;</code> drops the ties and <code>&gt;=</code> reprocesses them. Safe combination: <code>&gt;=</code> with <code>merge</code> on a <code>unique_key</code> (reprocessing is idempotent). Dangerous: <code>&gt;=</code> with <code>append</code> (duplicates grow every run).</p>
      </details>
      <details class="cf-det"><summary>3 · Duplicates from the wrong strategy</summary>
        <p><code>append</code> never upserts — a corrected existing row becomes a second physical row. Use <code>merge</code> with <code>unique_key</code> for anything mutable. And <code>merge</code> needs unique keys <em>within the incoming batch</em>: duplicate source keys error on Snowflake/BigQuery, so dedupe the source (<code>qualify row_number() … = 1</code>) first.</p>
      </details>
      <details class="cf-det"><summary>4 · Stale schema / logic (why --full-refresh exists)</summary>
        <p><code>on_schema_change</code> reconciles the column set but never backfills values, changes types, or recomputes changed logic. When the model's SQL semantics change, the only correct rebuild is <code>dbt run --full-refresh</code>, which drops and recreates the table from scratch (is_incremental() is false that run).</p>
      </details>
    </div>
    <div class="detail-section">
      <h3>What problem did incremental models solve?</h3>
      <p style="font-size:15px;font-weight:600;color:var(--accent)">Reprocessing 2 billion rows every night to incorporate 50,000 new ones is not just expensive — it's a scaling cliff. Incremental models let event pipelines grow indefinitely without a corresponding growth in compute cost.</p>
    </div>
  `;
}
