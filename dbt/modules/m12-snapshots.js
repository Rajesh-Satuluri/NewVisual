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
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M12 · Core Features',
    title: 'Snapshots',
    subtitle: 'Track how your data changes over time. The SCD Type 2 pattern — automated.',
    tabs: [
      { id: 'visual', label: '🎬 History Builder' },
      { id: 'detail', label: '📋 How Snapshots Work' },
      { id: 'iq',     label: '🎯 Interview Q&A' },
    ]
  });

  const cleanup = buildVisual(container);
  buildDetail(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

function buildVisual(container) {
  const tab = container.querySelector('#tab-visual');
  const wrap = document.createElement('div');
  wrap.className = 'canvas-wrap';

  const cv = document.createElement('canvas');
  cv.width = 820; cv.height = 420;
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

    ctx.fillStyle = headerBorder; ctx.font = 'bold 10px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('raw_customers · customer_id: 42 · name: Priya Sharma', 36, 40);
    ctx.fillStyle = '#4B5E78'; ctx.font = '9px Inter, sans-serif';
    ctx.fillText('LIVE RECORD (always shows current state)', 36, 56);

    // Current tier chip
    rr(ctx, 36, 62, 160, 26, 5, current.color + '30', current.color);
    ctx.fillStyle = current.color; ctx.font = 'bold 11px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(current.tier, 116, 79);

    ctx.fillStyle = '#4B5E78'; ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`updated_at: ${current.from}`, 210, 79);

    // WITHOUT mode: "LOST" flash
    if (!state.withSnapshots && state.lostAnim > 0) {
      ctx.save(); ctx.globalAlpha = state.lostAnim;
      ctx.fillStyle = state.lostColor + '44';
      ctx.fillRect(36, 62, 160, 26);
      ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(36, 75); ctx.lineTo(196, 75); ctx.stroke();
      ctx.fillStyle = '#EF4444'; ctx.font = 'bold 10px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`${state.lostTier} — LOST`, 116, 59);
      ctx.restore();
    }

    // ── SNAPSHOT TABLE ───────────────────────────────────────────────
    const tableY = 118;
    const colX = [20, 190, 360, 530, 700];
    const headers = ['membership_tier', 'dbt_valid_from', 'dbt_valid_to', 'dbt_is_current'];

    // Table mode label
    ctx.fillStyle = state.withSnapshots ? '#10B981' : '#EF4444';
    ctx.font = 'bold 9px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(
      state.withSnapshots
        ? 'dbt_snapshot: customer_tier_history  ✓  Full history preserved'
        : 'raw_customers (no snapshot)  ⚠  Current state only — all history overwritten',
      20, tableY + 14
    );

    // Headers
    headers.forEach((h, i) => {
      ctx.fillStyle = '#4B5E78'; ctx.font = 'bold 8px "JetBrains Mono", monospace'; ctx.textAlign = 'left';
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
      ctx.fillStyle = row.color; ctx.font = 'bold 9px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(row.tier, colX[0] + 81, ry + 16);

      ctx.fillStyle = '#8895AA'; ctx.font = '9px "JetBrains Mono", monospace'; ctx.textAlign = 'left';
      ctx.fillText(row.from, colX[1] + 4, ry + 16);
      ctx.fillStyle = row.to ? '#EF4444' : '#10B981';
      ctx.fillText(row.to || 'NULL (open)', colX[2] + 4, ry + 16);
      ctx.fillStyle = row.current ? '#10B981' : '#4B5E78';
      ctx.font = 'bold 9px Inter, sans-serif';
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
        ctx.fillStyle = '#EF4444'; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(`⚠  ${state.changeCount} previous tier(s) permanently lost — history cannot be reconstructed`, W/2, ry + 14);
        ctx.restore();
      }
    }

    // History count
    if (state.withSnapshots && state.history.length > 1) {
      ctx.fillStyle = '#10B981'; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'right';
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
      <div class="code-block">-- snapshots/customer_tier_snapshot.sql
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
      <div class="code-block">-- "How long was each customer on Basic before upgrading?"
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
      <h3>What problem did snapshots solve?</h3>
      <p style="font-size:15px;font-weight:600;color:var(--accent)">Source systems only show current state. Without snapshots, every change to a customer record permanently erases its history. dbt snapshots automate SCD Type 2 — the standard solution for tracking dimension changes — without requiring a single line of custom ETL code.</p>
    </div>
  `;
}
