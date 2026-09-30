import { createModuleShell, createIQSection } from '../components/module-shell.js';

const IQ = [
  {
    q: 'What is the difference between ref(), source(), and a seed? When do you use each?',
    a: `<strong>ref('model_name')</strong>
    <ul>
      <li>References another dbt model. Creates a DAG edge so dbt knows the dependency order.</li>
      <li>Use when: referencing any model in your dbt project — staging, intermediate, or mart.</li>
      <li>In production: resolves to <code>analytics.model_name</code>. In dev: resolves to <code>analytics_dev_alice.model_name</code>. Environment awareness is automatic.</li>
    </ul>
    <strong>source('source_name', 'table_name')</strong>
    <ul>
      <li>References a raw table from an external system (Fivetran, Airbyte, Kafka) — something dbt doesn't own.</li>
      <li>Use when: referencing raw source tables only in staging models.</li>
      <li>Enables source freshness checks: dbt can warn if <code>raw_orders</code> hasn't been updated in 2 hours.</li>
    </ul>
    <strong>Seeds (dbt seed)</strong>
    <ul>
      <li>CSV files in the <code>seeds/</code> directory that dbt loads as tables. For small, static reference data.</li>
      <li>Use when: country codes, product categories, cost center mappings — data that changes rarely and has no source system.</li>
      <li>Anti-pattern: don't use seeds for large datasets or frequently-changing data. That's what source tables are for.</li>
    </ul>`,
    tip: 'The "only use source() in staging models, never in marts" rule is a sign of an experienced dbt developer. It keeps the contract between sources and business logic explicit.',
  },
  {
    q: 'When would you choose incremental materialization vs table? What are the trade-offs?',
    a: `<strong>table ({{ config(materialized="table") }})</strong>
    <ul>
      <li>Drops and recreates the table from scratch on every run.</li>
      <li>Use when: dataset is small enough to full-refresh cheaply, or when the model logic is complex enough that incremental logic would be hard to maintain.</li>
      <li>Safe default: simple, predictable, always correct.</li>
    </ul>
    <strong>incremental ({{ config(materialized="incremental") }})</strong>
    <ul>
      <li>On first run: creates the full table. On subsequent runs: inserts/merges only new or changed rows.</li>
      <li>Use when: event tables (clickstream, order events) where you have a reliable timestamp and billions of rows. Full refresh would take hours.</li>
      <li>The trade-off: complexity. You must define <code>is_incremental()</code> logic correctly. Late-arriving data can be missed. Schema changes require a full refresh (<code>--full-refresh</code> flag).</li>
    </ul>
    <strong>Decision rule:</strong> Start with <code>table</code>. Migrate to <code>incremental</code> only when the full refresh time is a production problem. Don't optimize prematurely.`,
    tip: '"Start with table, migrate to incremental when you have evidence it\'s needed" shows production pragmatism. Premature optimization of SQL materialization is a common anti-pattern in dbt projects.',
  },
  {
    q: 'How do ephemeral models work, and when should you NOT use them?',
    a: `<strong>Ephemeral models</strong> are never materialized in the warehouse. dbt compiles them as CTEs and inlines them into the model that references them.
    <br><br>
    <strong>When to use:</strong>
    <ul>
      <li>Intermediate logic that's only used by one downstream model and has no value as a standalone table.</li>
      <li>Very simple transformations that would be wasteful to store as tables.</li>
    </ul>
    <strong>When NOT to use (the important part):</strong>
    <ul>
      <li><strong>Referenced by multiple models:</strong> dbt inlines the CTE into EVERY model that refs it. The query runs N times instead of once. Use <code>view</code> or <code>table</code> instead.</li>
      <li><strong>Needs testing:</strong> You can't run <code>dbt test</code> on an ephemeral model — it has no materialized table to query against.</li>
      <li><strong>Debugging:</strong> Ephemeral models are invisible in the warehouse. You can't SELECT from them to inspect intermediate results.</li>
      <li><strong>Documentation:</strong> They don't appear in dbt docs as queryable tables, making lineage harder to reason about.</li>
    </ul>
    <strong>Rule of thumb:</strong> If you're unsure, use <code>view</code>. Ephemeral is an optimization for very specific situations.`,
    tip: 'Most candidates know what ephemeral models are. Knowing when NOT to use them (multiple consumers, need for testing, debugging difficulty) is what separates a practitioner from someone who just read the docs.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M10 · Core Features',
    title: 'dbt Models',
    subtitle: 'SQL files that know about each other. ref() creates the dependency graph; dbt handles the rest.',
    tabs: [
      { id: 'visual', label: '🎬 DAG Build' },
      { id: 'detail', label: '📋 How Models Work' },
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
    <button class="ctrl-btn" id="m10-run">▶ Run dbt run</button>
    <button class="ctrl-btn" id="m10-reset">↺ Reset</button>
    <span class="ctrl-label" id="m10-lbl">Watch models execute in topological order — dependencies first</span>`;
  wrap.appendChild(ctrl);
  tab.appendChild(wrap);

  const ctx = cv.getContext('2d');
  const W = 820, H = 420;

  // Layers: staging, intermediate, mart
  const LAYERS = [
    [
      { id: 'stg_orders',    x: 240, y: 100, label: 'stg_orders' },
      { id: 'stg_customers', x: 240, y: 210, label: 'stg_customers' },
      { id: 'stg_products',  x: 240, y: 320, label: 'stg_products' },
    ],
    [
      { id: 'int_order_items', x: 460, y: 155, label: 'int_order_items' },
      { id: 'int_cust_orders', x: 460, y: 290, label: 'int_cust_orders' },
    ],
    [
      { id: 'fct_revenue',   x: 670, y: 130, label: 'fct_revenue' },
      { id: 'dim_customers', x: 670, y: 290, label: 'dim_customers' },
    ],
  ];

  const LAYER_COLORS = ['#3B82F6', '#8B5CF6', '#10B981'];
  const LAYER_LABELS = ['STAGING', 'INTERMEDIATE', 'MARTS'];

  const EDGES = [
    [0, 0, 1, 0], [0, 1, 1, 0], [0, 0, 1, 1], [0, 1, 1, 1], [0, 2, 1, 1],
    [1, 0, 2, 0], [1, 0, 2, 1], [1, 1, 2, 1],
  ];

  let state = { running: false, timer: 0, nodeStatus: {}, done: false };

  function resetState() {
    state.running = false; state.timer = 0; state.done = false;
    state.nodeStatus = {};
    LAYERS.forEach(layer => layer.forEach(n => { state.nodeStatus[n.id] = 'idle'; }));
  }
  resetState();

  ctrl.querySelector('#m10-run').addEventListener('click', () => {
    if (!state.running && !state.done) {
      state.running = true;
    }
  });
  ctrl.querySelector('#m10-reset').addEventListener('click', () => {
    resetState();
    container.querySelector('#m10-lbl').textContent = 'Watch models execute in topological order — dependencies first';
  });

  function rr(ctx, x, y, w, h, r, fill, stroke, sw) {
    ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
    ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
    ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = sw || 1.5; ctx.stroke(); }
  }

  function arw(ctx, x1, y1, x2, y2, col) {
    const dx = x2-x1, dy = y2-y1, len = Math.hypot(dx,dy);
    if (len < 2) return;
    const ux = dx/len, uy = dy/len;
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2-ux*8, y2-uy*8);
    ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2-ux*9-uy*4, y2-uy*9+ux*4);
    ctx.lineTo(x2-ux*9+uy*4, y2-uy*9-ux*4);
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  }

  // LAYER_DURATION per layer in seconds
  const LAYER_DUR = 1.1;

  let raf = null, lastT = 0;

  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05);
    lastT = ts;

    if (state.running) {
      state.timer += dt;
      const layerIdx = Math.floor(state.timer / LAYER_DUR);
      const layerT   = (state.timer % LAYER_DUR) / LAYER_DUR;

      LAYERS.forEach((layer, li) => {
        layer.forEach(n => {
          if (li < layerIdx) state.nodeStatus[n.id] = 'done';
          else if (li === layerIdx) state.nodeStatus[n.id] = 'running';
          else state.nodeStatus[n.id] = 'idle';
        });
      });

      if (layerIdx >= LAYERS.length) {
        state.running = false; state.done = true;
        LAYERS.forEach(layer => layer.forEach(n => { state.nodeStatus[n.id] = 'done'; }));
        container.querySelector('#m10-lbl').textContent = 'All models built — 8 nodes, 0 failures';
      }
    }

    ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, W, H);

    // Source nodes (leftmost)
    ctx.fillStyle = '#4B5E78'; ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('SOURCES', 80, 24);
    ['raw_orders', 'raw_customers', 'raw_products'].forEach((name, i) => {
      const y = 100 + i * 110;
      rr(ctx, 28, y-13, 104, 26, 5, '#131D2E', '#4B5E7855');
      ctx.fillStyle = '#4B5E78'; ctx.font = '8px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
      ctx.fillText(name, 80, y + 3);

      // Edge to staging
      const sn = LAYERS[0][i];
      arw(ctx, 132, y, sn.x - 68, sn.y, '#4B5E7844');
    });

    // Edges between layers
    EDGES.forEach(([l1, n1, l2, n2]) => {
      const from = LAYERS[l1][n1], to = LAYERS[l2][n2];
      const status = state.nodeStatus[to.id];
      const col = status === 'done' ? LAYER_COLORS[l2] + '88'
                : status === 'running' ? LAYER_COLORS[l2] + 'aa'
                : '#1E2D4366';
      arw(ctx, from.x + 68, from.y, to.x - 80, to.y, col);

      // ref() label on edge midpoint
      if (status === 'running' || status === 'done') {
        const mx = (from.x + 68 + to.x - 80) / 2;
        const my = (from.y + to.y) / 2 - 8;
        ctx.fillStyle = LAYER_COLORS[l2] + '99';
        ctx.font = '7px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
        ctx.fillText(`ref('${from.label}')`, mx, my);
      }
    });

    // Layer labels & nodes
    LAYERS.forEach((layer, li) => {
      ctx.fillStyle = LAYER_COLORS[li]; ctx.font = '9px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(LAYER_LABELS[li], layer[0].x, 24);

      layer.forEach(n => {
        const st = state.nodeStatus[n.id];
        const col = st === 'done' ? LAYER_COLORS[li]
                  : st === 'running' ? LAYER_COLORS[li] + 'cc'
                  : '#2A3550';
        const bg  = st === 'done' ? LAYER_COLORS[li] + '22'
                  : st === 'running' ? LAYER_COLORS[li] + '18'
                  : '#131D2E';

        // Pulsing glow border for running state
        if (st === 'running') {
          const glow = (Math.sin(state.timer * 8) * 0.5 + 0.5) * 0.6 + 0.3;
          ctx.save(); ctx.globalAlpha = glow;
          rr(ctx, n.x-74, n.y-20, 148, 40, 8, null, LAYER_COLORS[li], 3);
          ctx.restore();
        }

        rr(ctx, n.x-68, n.y-16, 136, 32, 6, bg, col, 1.5);
        ctx.fillStyle = st === 'idle' ? '#4B5E78' : col;
        ctx.font = 'bold 9px "JetBrains Mono", monospace'; ctx.textAlign = 'center';

        const prefix = st === 'done' ? '✓ ' : st === 'running' ? '⟳ ' : '';
        ctx.fillText(prefix + n.label, n.x, n.y + 4);
      });
    });

    // Status bar
    const built = Object.values(state.nodeStatus).filter(s => s === 'done').length;
    const total = Object.keys(state.nodeStatus).length;
    if (state.done) {
      ctx.fillStyle = '#10B981'; ctx.font = 'bold 12px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`✓  All ${total} models built successfully — ready for dbt test`, W/2, H - 14);
    } else if (state.running) {
      ctx.fillStyle = '#3B82F6'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`Building... ${built}/${total} models complete`, W/2, H - 14);
    } else {
      ctx.fillStyle = '#4B5E78'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`${total} models across 3 layers · press Run to watch the DAG execute in order`, W/2, H - 14);
    }

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });
  return () => { if (raf) cancelAnimationFrame(raf); };
}

function buildDetail(container) {
  container.querySelector('#tab-detail').innerHTML = `
    <div class="detail-section">
      <h3>What a dbt model is</h3>
      <p>A dbt model is a single SQL <code>SELECT</code> statement in a <code>.sql</code> file. That's it. dbt takes your SELECT and wraps it in a CREATE TABLE or CREATE VIEW statement based on your materialization config. One file = one table or view in the warehouse.</p>
      <div class="code-block">-- models/staging/stg_orders.sql
SELECT
    order_id,
    customer_id,
    order_total::DECIMAL(10,2)  AS order_total,
    created_at::TIMESTAMP       AS created_at,
    status
FROM {{ source('raw', 'orders') }}
WHERE order_id IS NOT NULL</div>
    </div>
    <div class="detail-section">
      <h3>The ref() function: the magic that builds the DAG</h3>
      <p>Every time you write <code>{{ ref('stg_orders') }}</code>, dbt records a dependency edge. When you run <code>dbt run</code>, dbt compiles the full DAG from all ref() calls and executes models in topological order. No model runs before its dependencies finish.</p>
      <div class="code-block">-- models/intermediate/int_order_items.sql
SELECT
    o.order_id,
    o.customer_id,
    p.product_name,
    o.order_total,
    o.created_at
FROM {{ ref('stg_orders') }} o          -- dependency declared here
JOIN {{ ref('stg_products') }} p        -- and here
    ON o.product_id = p.product_id</div>
    </div>
    <div class="detail-section">
      <h3>The four materializations</h3>
      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead><tr><th>Type</th><th>What it creates</th><th>When to use</th><th>Trade-off</th></tr></thead>
          <tbody>
            <tr><td><code>view</code></td><td>Database view (no storage)</td><td>Staging, lightweight transforms</td><td>Recomputes every query</td></tr>
            <tr><td><code>table</code></td><td>Full table, rebuilt each run</td><td>Default for most models</td><td>Full refresh cost</td></tr>
            <tr><td><code>incremental</code></td><td>Appends/merges new rows only</td><td>Large event tables</td><td>Complex logic, late data risk</td></tr>
            <tr><td><code>ephemeral</code></td><td>CTE, inlined, no storage</td><td>Single-consumer intermediate logic</td><td>Not testable, not queryable</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="detail-section">
      <h3>What problem did dbt models solve?</h3>
      <p style="font-size:15px;font-weight:600;color:var(--accent)">Without ref(), SQL dependencies were invisible — you only found them when things broke. With ref(), every dependency is declared, every execution order is automatic, and the entire transformation graph is visible and queryable.</p>
    </div>
  `;
}
