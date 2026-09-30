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
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M13 · Core Features',
    title: 'Incremental Models',
    subtitle: 'Don\'t reprocess 10 billion rows every night. Process only what\'s new.',
    tabs: [
      { id: 'visual', label: '🎬 Full vs Incremental' },
      { id: 'detail', label: '📋 How It Works' },
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
    <button class="ctrl-btn" id="m13-run">▶ Simulate nightly run</button>
    <button class="ctrl-btn" id="m13-reset">↺ Reset</button>
    <span class="ctrl-label">Flipkart clickstream: 2 billion rows · 50K new rows tonight</span>`;
  wrap.appendChild(ctrl);
  tab.appendChild(wrap);

  const ctx = cv.getContext('2d');
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
      <h3>What problem did incremental models solve?</h3>
      <p style="font-size:15px;font-weight:600;color:var(--accent)">Reprocessing 2 billion rows every night to incorporate 50,000 new ones is not just expensive — it's a scaling cliff. Incremental models let event pipelines grow indefinitely without a corresponding growth in compute cost.</p>
    </div>
  `;
}
