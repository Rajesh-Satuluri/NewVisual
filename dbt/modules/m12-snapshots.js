import { createModuleShell, createIQSection } from '../components/module-shell.js';

const IQ = [
  {
    q: 'What is an SCD Type 2, and in what scenarios is it actually necessary?',
    a: `<strong>SCD Type 2 (Slowly Changing Dimension Type 2)</strong> is a pattern where instead of overwriting a changed record, you keep the old row and add a new one — preserving full history via <code>valid_from</code>/<code>valid_to</code> dates.
    <br><br>
    <strong>When it's necessary:</strong>
    <ul>
      <li><strong>Attribution analysis:</strong> A customer's region changes. You need to know what region they were in when they made each purchase — not just their current region. Without SCD2, you can't correctly attribute past revenue.</li>
      <li><strong>Subscription tracking:</strong> Amazon Prime tier changes. You need to know: how long was a customer on Basic before upgrading? What's the average time-to-upgrade? Current state only can't answer this.</li>
      <li><strong>Pricing history:</strong> Product price changes. You need to calculate what revenue would have been at old prices vs new prices. SCD2 lets you join orders to the price that was active at order time.</li>
      <li><strong>Compliance:</strong> GDPR "right to be forgotten" audit — you need to show what data existed about a user at each point in time.</li>
    </ul>
    <strong>When it's NOT necessary:</strong> If you only ever need the current state, <code>table</code> or <code>incremental</code> models are simpler. Don't use SCD2 unless you have a concrete query that requires historical state.`,
    tip: 'The attribution analysis example is the killer use case. "A customer moved from CA to NY — every sale before the move should count as CA revenue, not NY" is immediately understood by any interviewer who\'s worked with regional data.',
  },
  {
    q: 'What is the difference between snapshot strategy: "timestamp" and strategy: "check"?',
    a: `<strong>strategy: "timestamp"</strong>
    <ul>
      <li>dbt compares the <code>updated_at</code> timestamp of the current row to the snapshot. If <code>updated_at</code> is newer, it creates a new snapshot row.</li>
      <li>Requires: a reliable <code>updated_at</code> column on the source table that's always updated when any field changes.</li>
      <li>Fast and cheap: only reads one column to detect changes.</li>
      <li>Risk: if <code>updated_at</code> is not reliably updated (a bug in the source system), changes are silently missed.</li>
    </ul>
    <strong>strategy: "check"</strong>
    <ul>
      <li>dbt computes a hash of the specified columns. If the hash changes, a new snapshot row is created.</li>
      <li>Use when: source doesn't have a reliable <code>updated_at</code> column, or you want to track changes to specific columns only.</li>
      <li>Slower: must hash and compare column values on every run.</li>
      <li>More reliable: can't miss a change because a timestamp wasn't updated.</li>
    </ul>
    <strong>Rule of thumb:</strong> Use <code>timestamp</code> when the source is well-engineered. Use <code>check</code> when you're working with a legacy system you don't control.`,
    tip: '"Timestamp is fast but trusts the source; check is slower but doesn\'t" is the one-liner. In practice, many legacy source systems have unreliable timestamps, so check strategy sees heavy use in enterprise dbt projects.',
  },
  {
    q: 'A snapshot model that has been running for a year suddenly shows duplicate current rows. How do you diagnose and fix it?',
    a: `<strong>Root cause diagnosis:</strong>
    <ol>
      <li>Check the unique key column: <code>SELECT unique_key_col, COUNT(*) FROM snapshot_table WHERE dbt_is_current = TRUE GROUP BY 1 HAVING COUNT(*) > 1</code>. This confirms the scope.</li>
      <li>Check if the source table's definition of the unique key changed — new rows added with the same key but a new business context (e.g., an order can now have multiple fulfillment legs with the same order_id).</li>
      <li>Check if a backfill ran in the source system and regenerated rows with different <code>updated_at</code> values, tricking the timestamp strategy into thinking something changed.</li>
    </ol>
    <strong>Fix options:</strong>
    <ul>
      <li><strong>Compound unique key:</strong> If the business key now requires two columns, update the snapshot config: <code>unique_key: ["order_id", "fulfillment_leg"]</code>. Then <code>dbt snapshot --full-refresh</code> to rebuild.</li>
      <li><strong>Invalidate duplicates:</strong> Write a migration that sets <code>dbt_valid_to</code> on all but the latest row for each duplicated key, then sets <code>dbt_is_current = FALSE</code> on the closed rows.</li>
      <li><strong>Rebuild from scratch:</strong> If the data is inconsistent beyond repair, <code>dbt snapshot --full-refresh</code>. You lose history but get a clean foundation. Only acceptable if stakeholders agree.</li>
    </ul>`,
    tip: 'The compound unique key answer shows you\'ve hit this in production. "The key changed because the business model changed" is the real reason most snapshot breakages happen — not dbt bugs.',
  },
  {
    q: 'Why must snapshots be run on their own schedule, and why is `--full-refresh` on a snapshot dangerous?',
    a: `A snapshot captures source state <em>at the moment it runs</em>. The source system overwrites rows in place, so any change that happens <strong>between two snapshot runs and is then overwritten again</strong> is lost forever — snapshots can only see what's present when they execute.
    <br><br>
    That drives two practices:
    <ul>
      <li><strong>Run early and often</strong> — <code>dbt snapshot</code> typically runs on its own frequent schedule, <em>before</em> the models that consume it, so it captures changes close to when they happen.</li>
      <li><strong>Never casually <code>--full-refresh</code></strong> — the snapshot table is the <em>only</em> place history lives; the source no longer has the old values. A full refresh rebuilds from current source state and <strong>permanently destroys every past version</strong>. It's a last resort requiring stakeholder sign-off.</li>
    </ul>`,
    tip: 'The core insight: "a snapshot is the sole copy of history — the source has moved on." That\'s why it is append-only and why --full-refresh is destructive in a way it never is for a model.',
  },
  {
    q: 'How do you query "what was the customer\'s tier at the time of each order"? Write the join.',
    a: `This is the point-in-time join snapshots exist for — join each order to the <em>version that was valid when the order was placed</em>:
    <div style="margin:8px 0;padding:10px;background:var(--surface-2);border:1px solid var(--border);border-radius:6px;font-family:var(--font-mono);font-size:11.5px;color:var(--text-2)">
    select o.order_id, o.ordered_at, s.tier<br>
    from {{ ref('fct_orders') }} o<br>
    join {{ ref('customers_snapshot') }} s<br>
    &nbsp;&nbsp;on s.customer_id = o.customer_id<br>
    &nbsp;&nbsp;and o.ordered_at &gt;= s.dbt_valid_from<br>
    &nbsp;&nbsp;and (o.ordered_at &lt; s.dbt_valid_to or s.dbt_valid_to is null)
    </div>
    The two date predicates are the whole trick: an order falls inside exactly one version's <code>[valid_from, valid_to)</code> window. Joining to the current dimension instead would wrongly attribute every past order to the customer's <em>present</em> tier.`,
    tip: 'The half-open interval [valid_from, valid_to) with the `or valid_to is null` for the current row is what interviewers look for — it avoids both gaps and double-counting at the boundaries.',
  },
  {
    q: 'What\'s the difference between a snapshot and an incremental model — both "add rows over time"?',
    a: `They answer different questions:
    <ul>
      <li>A <strong>snapshot</strong> captures <em>how a row changed</em>. It watches a mutable dimension (customer, product, subscription) and writes a new <em>version</em> each time tracked attributes change, with validity windows. Purpose: historical/point-in-time truth.</li>
      <li>An <strong>incremental model</strong> captures <em>new facts efficiently</em>. It's a performance strategy for appending/merging new event rows into a large table instead of rebuilding it. Purpose: scale, not history.</li>
    </ul>
    Key tells: a snapshot is run with <code>dbt snapshot</code>, is append-only, and its history is irreplaceable; an incremental model is run with <code>dbt run</code>, can be <code>--full-refresh</code>ed any time because the source still has the data, and adds no SCD columns. You often use both: snapshot the dimension, then build incremental facts that join to it.`,
    tip: 'One line: "snapshots preserve history of changing rows; incremental models efficiently add new rows." Mentioning that a snapshot\'s history can\'t be rebuilt but an incremental\'s can is the clincher.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M12 · Core Features',
    title: 'Snapshots',
    subtitle: 'Track how your data changes over time. The SCD Type 2 pattern — automated.',
    tabs: [
      { id: 'visual', label: '🎬 History Builder' },
      { id: 'lab',    label: '🔬 Lab · Snapshot over time' },
      { id: 'detail', label: '📋 How Snapshots Work' },
      { id: 'iq',     label: '🎯 Interview Q&A' },
    ]
  });

  const cleanup = buildVisual(container);
  buildLab(container);
  buildDetail(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

// ── Lab · Snapshot over time (SCD Type 2) ─────────────────────────────────────
// Step through successive source loads of one customer and watch the snapshot
// table accumulate history (dbt_valid_from / dbt_valid_to / dbt_is_current).
// Switch between timestamp and check strategies to see the key trade-off —
// including the classic miss where the source changes data but forgets to bump
// updated_at. Deterministic model of dbt's snapshot behaviour; nothing executed.
const esc12 = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const SNAP_EVENTS = [
  { day: '2024-01-01', upd: 1,  tier: 'Basic', region: 'CA', email: 'ada@x.io',   note: 'Initial load' },
  { day: '2024-01-05', upd: 5,  tier: 'Prime', region: 'CA', email: 'ada@x.io',   note: 'Upgraded to Prime' },
  { day: '2024-01-09', upd: 9,  tier: 'Prime', region: 'NY', email: 'ada@x.io',   note: 'Moved CA → NY' },
  { day: '2024-01-12', upd: 12, tier: 'Prime', region: 'NY', email: 'ada@new.io', note: 'Changed email only' },
  { day: '2024-01-15', upd: 12, tier: 'Prime', region: 'NY', email: 'ada@new.io', note: 'Re-run — nothing changed' },
  { day: '2024-01-18', upd: 12, tier: 'Basic', region: 'NY', email: 'ada@new.io', note: 'Downgraded — but source forgot to bump updated_at ⚠' },
];

function buildLab(container) {
  const tab = container.querySelector('#tab-lab');
  const st = { strategy: 'timestamp', cols: { tier: true, region: true, email: false }, step: 0, rows: [], log: [] };

  tab.innerHTML = `
    <div class="cf-lab">
      <div class="cf-lab-intro">
        <strong>Build history one run at a time.</strong> Each <code>dbt snapshot</code> reads the current
        source row for customer <code>42</code> and decides whether to open a new version. Choose the
        strategy, then step through the loads and watch <code>dbt_valid_from/to</code> and
        <code>dbt_is_current</code> evolve.
        <span class="cf-sim">🧪 Deterministic model of dbt's snapshot behaviour — no SQL runs.</span>
      </div>
      <div class="cf-controls">
        <div class="cf-field"><label for="m12-strat">strategy</label>
          <select id="m12-strat"><option value="timestamp">timestamp (updated_at)</option><option value="check">check (hash of columns)</option></select></div>
        <div class="cf-field" id="m12-colwrap" hidden><label>check_cols</label>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            ${['tier', 'region', 'email'].map(c => `<label style="display:flex;gap:5px;align-items:center;font-family:var(--font-mono);font-size:12px;cursor:pointer"><input type="checkbox" data-col="${c}" ${st.cols[c] ? 'checked' : ''} style="accent-color:var(--accent)">${c}</label>`).join('')}
          </div></div>
        <div class="cf-field" style="flex-direction:row;align-items:flex-end;gap:8px">
          <button class="ctrl-btn" id="m12-step">▶ Run next dbt snapshot</button>
          <button class="ctrl-btn" id="m12-reset">↺ Reset</button>
        </div>
      </div>
      <div class="cf-two">
        <div class="cf-pane"><div class="cf-pane-h" id="m12-srch">Source · raw.customers (customer_id = 42)</div>
          <div id="m12-source" style="padding:11px 13px"></div></div>
        <div class="cf-pane"><div class="cf-pane-h">Run log</div>
          <div id="m12-log" style="padding:11px 13px;font-size:12.5px;line-height:1.5"></div></div>
      </div>
      <div class="cf-pane"><div class="cf-pane-h">snapshots.customers_snapshot · accumulated history</div>
        <div style="overflow-x:auto;padding:10px"><table class="cf-simtable" id="m12-snap"></table></div></div>
      <div class="cf-readout" id="m12-note"></div>
    </div>`;

  const tracked = () => ['tier', 'region', 'email'].filter(c => st.cols[c]);
  const hashOf = (r) => tracked().map(c => r[c]).join('|');

  function runStep() {
    if (st.step >= SNAP_EVENTS.length) return;
    const e = SNAP_EVENTS[st.step];
    const cur = st.rows.find(r => r.is_current);
    let decision;
    if (!cur) {
      st.rows.push({ scd: st.rows.length + 1, tier: e.tier, region: e.region, email: e.email, upd: e.upd, from: e.day, to: '—', is_current: true });
      decision = { kind: 'new', msg: `First load → opened version #1, <code>dbt_is_current = true</code>.` };
    } else {
      const trackedChanged = hashOf(e) !== hashOf(cur);
      const tsAdvanced = e.upd > cur.upd;
      const changed = st.strategy === 'timestamp' ? tsAdvanced : trackedChanged;
      if (changed) {
        cur.is_current = false; cur.to = e.day;
        st.rows.push({ scd: st.rows.length + 1, tier: e.tier, region: e.region, email: e.email, upd: e.upd, from: e.day, to: '—', is_current: true });
        decision = { kind: 'new', msg: st.strategy === 'timestamp'
          ? `updated_at advanced (${cur.upd} → ${e.upd}) → closed old version (valid_to = ${e.day}) and opened a new one.`
          : `hash of [${tracked().join(', ')}] changed → closed old version and opened a new one.` };
      } else if (st.strategy === 'timestamp' && trackedChanged && !tsAdvanced) {
        decision = { kind: 'miss', msg: `⚠ <strong>Change MISSED.</strong> ${tracked().filter(c => e[c] !== cur[c]).map(c => `${c}: ${cur[c]}→${e[c]}`).join(', ')} changed, but <code>updated_at</code> stayed at ${cur.upd} — the timestamp strategy can't see it. Switch to <code>check</code> to catch this.` };
      } else {
        decision = { kind: 'same', msg: st.strategy === 'timestamp'
          ? `updated_at unchanged (${cur.upd}) → no new version.`
          : `hash of [${tracked().join(', ')}] unchanged → no new version${(e.email !== cur.email && !st.cols.email) ? ` (email changed but isn't tracked).` : '.'}` };
      }
    }
    st.log.unshift({ n: st.step + 1, day: e.day, note: e.note, decision });
    st.step++;
    render();
  }

  function reset() { st.step = 0; st.rows = []; st.log = []; render(); }

  function render() {
    tab.querySelector('#m12-colwrap').hidden = st.strategy !== 'check';
    const done = st.step >= SNAP_EVENTS.length;
    const nextBtn = tab.querySelector('#m12-step');
    nextBtn.disabled = done;
    nextBtn.textContent = done ? '✓ All loads applied' : `▶ Run snapshot (load ${st.step + 1} of ${SNAP_EVENTS.length})`;
    nextBtn.style.opacity = done ? '0.55' : '1';

    // source preview (the next event, or last applied)
    const e = SNAP_EVENTS[Math.min(st.step, SNAP_EVENTS.length - 1)];
    tab.querySelector('#m12-srch').textContent = done
      ? 'Source · raw.customers (customer_id = 42) — all loads applied'
      : `Source · next load ${e.day} (customer_id = 42)`;
    tab.querySelector('#m12-source').innerHTML = `
      <table class="cf-simtable"><thead><tr><th>tier</th><th>region</th><th>email</th><th>updated_at</th></tr></thead>
      <tbody><tr><td>${e.tier}</td><td>${e.region}</td><td>${esc12(e.email)}</td><td>day ${e.upd}</td></tr></tbody></table>
      <p style="color:var(--text-3);font-size:12px;margin:9px 0 0">${done ? 'Press Reset to replay.' : `Next change: <em>${esc12(e.note)}</em>`}</p>`;

    // run log
    tab.querySelector('#m12-log').innerHTML = st.log.length
      ? st.log.map(l => `<div style="padding:5px 0;border-top:1px solid var(--border)">
          <strong>Run ${l.n}</strong> · ${l.day} — ${esc12(l.note)}<br>
          <span style="color:${l.decision.kind === 'new' ? 'var(--success)' : l.decision.kind === 'miss' ? 'var(--error)' : 'var(--text-3)'}">${l.decision.msg}</span></div>`).join('')
      : `<span style="color:var(--text-3)">No runs yet — press <strong>Run next dbt snapshot</strong>.</span>`;

    // snapshot table
    tab.querySelector('#m12-snap').innerHTML = `
      <thead><tr><th>dbt_scd_id</th><th>tier</th><th>region</th><th>email</th><th>updated_at</th><th>dbt_valid_from</th><th>dbt_valid_to</th><th>dbt_is_current</th></tr></thead>
      <tbody>${st.rows.length ? st.rows.map(r => `<tr class="${r.is_current ? 'cf-row-new' : ''}">
        <td>scd_${String(r.scd).padStart(2, '0')}</td><td>${r.tier}</td><td>${r.region}</td><td>${esc12(r.email)}</td>
        <td>day ${r.upd}</td><td>${r.from}</td><td>${r.to}</td><td>${r.is_current ? '<strong style="color:var(--success)">true</strong>' : 'false'}</td></tr>`).join('')
        : `<tr><td colspan="8" style="color:var(--text-3);text-align:center">empty — no snapshot runs yet</td></tr>`}</tbody>`;

    // note
    const ro = tab.querySelector('#m12-note');
    const versions = st.rows.length;
    const missed = st.log.some(l => l.decision.kind === 'miss');
    ro.className = `cf-readout ${missed ? 'bad' : 'ok'}`;
    ro.innerHTML = `
      <div class="cf-ro-head">${missed ? '⚠️' : 'ℹ️'} ${versions} version row(s) · strategy = <code>${st.strategy}</code>${st.strategy === 'check' ? ` · tracking [${tracked().join(', ') || 'nothing'}]` : ''}</div>
      <div class="cf-ro-row ${missed ? 'err' : 'ok'}">
        ${missed
          ? `A real change slipped past the <code>timestamp</code> strategy because the source didn't advance <code>updated_at</code>. In production this silently corrupts history. The <code>check</code> strategy hashes the tracked columns, so it catches changes no matter what the timestamp does — at the cost of reading those columns every run.`
          : st.strategy === 'check'
            ? `The <code>check</code> strategy opens a new version whenever the hash of [${tracked().join(', ') || '—'}] differs. Columns you don't track (like email here) never trigger a version — scope the hash to the attributes whose history you actually need.`
            : `The <code>timestamp</code> strategy trusts <code>updated_at</code>: cheap (one column) and correct <em>when the source reliably bumps it</em>. Replay with a downgrade that forgets to bump the timestamp to see where it fails.`}
      </div>`;
  }

  tab.querySelector('#m12-strat').addEventListener('change', e => { st.strategy = e.target.value; reset(); });
  tab.querySelector('#m12-colwrap').addEventListener('change', e => {
    const cb = e.target.closest('input[data-col]'); if (!cb) return;
    st.cols[cb.dataset.col] = cb.checked; reset();
  });
  tab.querySelector('#m12-step').addEventListener('click', runStep);
  tab.querySelector('#m12-reset').addEventListener('click', reset);
  render();
}

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
    <button class="ctrl-btn" id="m12-change">⬆ Change Tier</button>
    <button class="ctrl-btn" id="m12-mode">Mode: WITH Snapshots</button>
    <button class="ctrl-btn" id="m12-reset">↺ Reset</button>
    <span class="ctrl-label" id="m12-lbl">Each tier change adds a row — history is never lost</span>`;
  wrap.appendChild(ctrl);
  tab.appendChild(wrap);

  const ctx = cv.getContext('2d');
  ctx.scale(DPR, DPR);
  const W = 820, H = 420;

  const TIERS = ['Basic', 'Prime', 'Prime Monthly', 'Prime Annual', 'Cancelled'];
  const TIER_COLORS = ['#4B5E78', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];
  const DATES = ['2024-01-05', '2024-03-12', '2024-05-28', '2024-08-14', '2024-11-30'];

  let state;

  function init() {
    state = {
      withSnapshots: true,
      tierIdx: 0,
      history: [{ tier: 'Basic', color: TIER_COLORS[0], from: DATES[0], to: null, current: true }],
      newRowAnim: 0,
      lostAnim: 0,
      lostTier: '',
      lostColor: '#4B5E78',
      changeCount: 0,
    };
  }
  init();

  const modeBtn = ctrl.querySelector('#m12-mode');

  ctrl.querySelector('#m12-change').addEventListener('click', () => {
    if (state.tierIdx >= TIERS.length - 1) return;

    const oldTier = TIERS[state.tierIdx];
    const oldColor = TIER_COLORS[state.tierIdx];
    state.tierIdx++;
    const newTier = TIERS[state.tierIdx];
    const newColor = TIER_COLORS[state.tierIdx];
    const fromDate = DATES[state.tierIdx];
    const toDate   = DATES[state.tierIdx - 1]; // previous tier's end

    if (state.withSnapshots) {
      // Close old row, add new row
      state.history = state.history.map(h => h.current ? { ...h, to: toDate, current: false } : h);
      state.history.push({ tier: newTier, color: newColor, from: fromDate, to: null, current: true });
      state.newRowAnim = 1.0;
    } else {
      // Just replace current row (history lost)
      state.history = [{ tier: newTier, color: newColor, from: fromDate, to: null, current: true }];
      state.lostAnim = 1.0;
      state.lostTier = oldTier;
      state.lostColor = oldColor;
    }
    state.changeCount++;
  });

  modeBtn.addEventListener('click', () => {
    state.withSnapshots = !state.withSnapshots;
    modeBtn.textContent = state.withSnapshots ? 'Mode: WITH Snapshots' : 'Mode: WITHOUT Snapshots';
    modeBtn.style.borderColor = state.withSnapshots ? '#10B981' : '#EF4444';
    modeBtn.style.color = state.withSnapshots ? '#10B981' : '#EF4444';
    container.querySelector('#m12-lbl').textContent = state.withSnapshots
      ? 'Each tier change adds a row — history is never lost'
      : 'Each tier change OVERWRITES — previous values gone forever';
    init();
    state.withSnapshots = !state.withSnapshots; // init resets it, flip back
  });

  ctrl.querySelector('#m12-reset').addEventListener('click', () => {
    init();
    modeBtn.textContent = 'Mode: WITH Snapshots';
    modeBtn.style.borderColor = '';
    modeBtn.style.color = '';
    container.querySelector('#m12-lbl').textContent = 'Each tier change adds a row — history is never lost';
  });

  function rr(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
    ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
    ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
  }

  let raf = null, lastT = 0;

  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05);
    lastT = ts;
    state.newRowAnim = Math.max(0, state.newRowAnim - dt * 2.5);
    state.lostAnim   = Math.max(0, state.lostAnim   - dt * 1.5);

    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, W, H);

    const current = state.history.find(h => h.current) || state.history[state.history.length - 1];

    // ── CURRENT STATE BOX ───────────────────────────────────────────
    const headerBg = state.withSnapshots ? '#0A1F2E' : '#1A0A0A';
    const headerBorder = state.withSnapshots ? '#3B82F6' : '#EF4444';
    rr(ctx, 20, 18, 780, 80, 8, headerBg, headerBorder);

    ctx.fillStyle = headerBorder; ctx.font = 'bold 13px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('raw_customers · customer_id: 42 · name: Priya Sharma', 36, 40);
    ctx.fillStyle = '#8A99B3'; ctx.font = '12px Inter, sans-serif';
    ctx.fillText('LIVE RECORD (always shows current state)', 36, 56);

    // Current tier chip
    rr(ctx, 36, 62, 160, 26, 5, current.color + '30', current.color);
    ctx.fillStyle = current.color; ctx.font = 'bold 13px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(current.tier, 116, 79);

    ctx.fillStyle = '#8A99B3'; ctx.font = '12px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`updated_at: ${current.from}`, 210, 79);

    // WITHOUT mode: "LOST" flash
    if (!state.withSnapshots && state.lostAnim > 0) {
      ctx.save(); ctx.globalAlpha = state.lostAnim;
      ctx.fillStyle = state.lostColor + '44';
      ctx.fillRect(36, 62, 160, 26);
      ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(36, 75); ctx.lineTo(196, 75); ctx.stroke();
      ctx.fillStyle = '#EF4444'; ctx.font = 'bold 13px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`${state.lostTier} — LOST`, 116, 59);
      ctx.restore();
    }

    // ── SNAPSHOT TABLE ───────────────────────────────────────────────
    const tableY = 118;
    const colX = [20, 190, 360, 530, 700];
    const headers = ['membership_tier', 'dbt_valid_from', 'dbt_valid_to', 'dbt_is_current'];

    // Table mode label
    ctx.fillStyle = state.withSnapshots ? '#10B981' : '#EF4444';
    ctx.font = 'bold 12px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(
      state.withSnapshots
        ? 'dbt_snapshot: customer_tier_history  ✓  Full history preserved'
        : 'raw_customers (no snapshot)  ⚠  Current state only — all history overwritten',
      20, tableY + 14
    );

    // Headers
    headers.forEach((h, i) => {
      ctx.fillStyle = '#8A99B3'; ctx.font = 'bold 12px "JetBrains Mono", monospace'; ctx.textAlign = 'left';
      ctx.fillText(h, colX[i] + 4, tableY + 34);
    });
    ctx.strokeStyle = '#1E2D43'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(20, tableY + 38); ctx.lineTo(780, tableY + 38); ctx.stroke();

    // Rows
    const ROW_H = 30;
    state.history.forEach((row, ri) => {
      const ry = tableY + 42 + ri * ROW_H;
      if (ry + ROW_H > H - 10) return;

      const isNew = (ri === state.history.length - 1) && state.newRowAnim > 0 && state.withSnapshots;
      ctx.save();
      if (isNew) {
        ctx.globalAlpha = 1 - state.newRowAnim * 0.5;
        ctx.fillStyle = row.color + '18'; ctx.fillRect(20, ry - 2, 760, ROW_H - 2);
      }

      // Tier chip
      rr(ctx, colX[0] + 4, ry + 2, 154, 20, 4, row.color + '28', row.color, 1);
      ctx.fillStyle = row.color; ctx.font = 'bold 12px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(row.tier, colX[0] + 81, ry + 16);

      ctx.fillStyle = '#8895AA'; ctx.font = '12px "JetBrains Mono", monospace'; ctx.textAlign = 'left';
      ctx.fillText(row.from, colX[1] + 4, ry + 16);
      ctx.fillStyle = row.to ? '#EF4444' : '#10B981';
      ctx.fillText(row.to || 'NULL (open)', colX[2] + 4, ry + 16);
      ctx.fillStyle = row.current ? '#10B981' : '#8A99B3';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.fillText(row.current ? 'TRUE' : 'FALSE', colX[3] + 4, ry + 16);

      // Divider
      ctx.strokeStyle = '#1E2D4344'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(20, ry + ROW_H - 2); ctx.lineTo(780, ry + ROW_H - 2); ctx.stroke();

      ctx.restore();
    });

    // WITHOUT mode: show grayed-out "lost history" placeholder
    if (!state.withSnapshots && state.changeCount > 0) {
      const ry = tableY + 42 + ROW_H;
      if (ry < H - 10) {
        ctx.save(); ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#EF4444'; ctx.font = '13px Inter, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(`⚠  ${state.changeCount} previous tier(s) permanently lost — history cannot be reconstructed`, W/2, ry + 14);
        ctx.restore();
      }
    }

    // History count
    if (state.withSnapshots && state.history.length > 1) {
      ctx.fillStyle = '#10B981'; ctx.font = '13px Inter, sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(`${state.history.length} rows  ·  full membership history preserved`, 780, H - 14);
    }

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });
  return () => { if (raf) cancelAnimationFrame(raf); };
}

function buildDetail(container) {
  container.querySelector('#tab-detail').innerHTML = `
    <div class="detail-section">
      <h3>The problem snapshots solve</h3>
      <p>Source tables store <em>current state</em>. When a customer upgrades from Basic to Prime, the source system updates the row — the old value is gone. If you want to know "how long was this customer on Basic before upgrading?", you can't answer it from current state alone. You need history.</p>
      <p>dbt snapshots add three columns to any source table to track changes over time: <code>dbt_valid_from</code>, <code>dbt_valid_to</code>, and <code>dbt_is_current</code>. This is called SCD Type 2 — Slowly Changing Dimension, Type 2.</p>
    </div>
    <div class="detail-section">
      <h3>The snapshot configuration</h3>
      <div class="code-block" data-lang="sql">-- snapshots/customer_tier_snapshot.sql
{% snapshot customer_tier_snapshot %}
  {{ config(
    target_schema   = 'snapshots',
    unique_key      = 'customer_id',
    strategy        = 'timestamp',
    updated_at      = 'updated_at',
    invalidate_hard_deletes = True
  ) }}

  SELECT customer_id, membership_tier, updated_at
  FROM {{ source('raw', 'customers') }}

{% endsnapshot %}

-- After running, the snapshot table has:
-- customer_id | membership_tier | updated_at | dbt_valid_from | dbt_valid_to | dbt_is_current</div>
    </div>
    <div class="detail-section">
      <h3>Querying snapshot history</h3>
      <div class="code-block" data-lang="sql">-- "How long was each customer on Basic before upgrading?"
-- dbt_valid_from / dbt_valid_to are the SCD-2 columns the snapshot maintains.
SELECT
    customer_id,
    membership_tier,
    DATEDIFF('day', dbt_valid_from, COALESCE(dbt_valid_to, CURRENT_DATE)) AS days_at_tier
FROM {{ ref('customer_tier_snapshot') }}
ORDER BY customer_id, dbt_valid_from</div>
      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead><tr><th>Strategy</th><th>How it detects changes</th><th>Use when</th></tr></thead>
          <tbody>
            <tr><td><code>timestamp</code></td><td>Compares <code>updated_at</code> column</td><td>Source has reliable <code>updated_at</code></td></tr>
            <tr><td><code>check</code></td><td>Hashes specified columns</td><td>No reliable <code>updated_at</code>, legacy source</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="detail-section">
      <h3>Going deeper — the mechanism</h3>
      <details class="cf-det"><summary>The four meta-columns dbt adds</summary>
        <ul>
          <li><code>dbt_scd_id</code> — a surrogate key unique to each <em>version</em> (not each entity). A customer with 3 versions has 3 scd_ids.</li>
          <li><code>dbt_valid_from</code> — when this version became effective.</li>
          <li><code>dbt_valid_to</code> — when it was superseded; <code>NULL</code> for the current version.</li>
          <li><code>dbt_updated_at</code> — the source timestamp dbt recorded at capture.</li>
        </ul>
        <p>"Current state" is <code>where dbt_valid_to is null</code>; "state on date D" is <code>where D &gt;= dbt_valid_from and (D &lt; dbt_valid_to or dbt_valid_to is null)</code> — a point-in-time join. Step through the Lab tab to watch these columns fill in.</p>
      </details>
      <details class="cf-det"><summary>timestamp vs check — the real trade-off</summary>
        <p><code>timestamp</code> compares one <code>updated_at</code> column: cheap and correct <em>only if the source reliably bumps it on every change</em>. <code>check</code> hashes a chosen set of columns and opens a version whenever the hash moves — immune to a stale timestamp, but it must read and hash those columns each run. Rule: <code>timestamp</code> for well-engineered sources you trust; <code>check</code> for legacy systems you don't. The Lab's final load shows exactly where <code>timestamp</code> silently misses a change.</p>
      </details>
      <details class="cf-det"><summary>Why snapshots are append-only (and must never be rebuilt casually)</summary>
        <p>Snapshots are the one dbt resource that holds state a rebuild would destroy. A normal model can be dropped and recreated; a snapshot's history exists <em>only</em> in the snapshot table — the source has already overwritten the old values. <code>dbt snapshot --full-refresh</code> throws away every past version permanently. That's why snapshots live in their own command, run early and often, and are treated as precious. <strong>Note:</strong> in current dbt, snapshots are configured in YAML (a <code>snapshots/*.yml</code> with <code>config:</code>), replacing the older <code>{% snapshot %}</code> block.</p>
      </details>
    </div>
    <div class="detail-section">
      <h3>What problem did snapshots solve?</h3>
      <p style="font-size:15px;font-weight:600;color:var(--accent)">Source systems only show current state. Without snapshots, every change to a customer record permanently erases its history. dbt snapshots automate SCD Type 2 — the standard solution for tracking dimension changes — without requiring a single line of custom ETL code.</p>
    </div>
  `;
}
