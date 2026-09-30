/* ============================================================
   Architecture Module — animated 3-layer diagram
   ============================================================ */

(function () {
  'use strict';

  const AE = () => window.SnowflakeViz.AnimationEngine;

  const WAREHOUSES = [
    { id: 'ingest',    name: 'INGEST_WH',     size: 'X-L',    team: 'Data Eng',  color: '#29b5e8' },
    { id: 'analytics', name: 'ANALYTICS_WH',  size: 'L',      team: 'Analytics', color: '#3fb950' },
    { id: 'ml',        name: 'ML_TRAINING_WH',size: 'X-L',    team: 'Data Sci',  color: '#a371f7' },
    { id: 'marketing', name: 'MARKETING_WH',  size: 'M',      team: 'Marketing', color: '#f97316' },
    { id: 'exec',      name: 'EXEC_WH',       size: 'S',      team: 'Leadership',color: '#e3b341' },
  ];

  const CLOUD_COMPONENTS = [
    { id: 'comp-optimizer', label: 'Query Optimizer' },
    { id: 'comp-metadata',  label: 'Metadata Store'  },
    { id: 'comp-auth',      label: 'Authentication'  },
    { id: 'comp-acl',       label: 'Access Control'  },
    { id: 'comp-txn',       label: 'Transactions'    },
    { id: 'comp-cache',     label: 'Result Cache'    },
  ];

  const PARTITION_COUNT = 20;

  const ArchitectureModule = {
    render(canvas, { data }) {
      canvas.innerHTML = '';

      const wrap = _el('div', 'arch-page');

      /* header */
      const header = _el('div', 'mod-header');
      header.innerHTML = `
        <div class="mod-eyebrow">Architecture</div>
        <h1 class="mod-title">Three-Layer Architecture</h1>
        <p class="mod-subtitle">Snowflake uniquely separates Cloud Services, Virtual Warehouses, and Storage — each scales independently. Press <strong>Play</strong> for a guided walkthrough.</p>`;
      wrap.appendChild(header);

      /* layout: diagram + panel */
      const layout = _el('div', 'arch-layout');

      /* ── Diagram ── */
      const diagram = _buildDiagram(data);
      layout.appendChild(diagram);

      /* ── Info panel ── */
      const panel = _buildPanel();
      layout.appendChild(panel);

      wrap.appendChild(layout);
      canvas.appendChild(wrap);

      /* ── Animation ── */
      const ctx = { container: diagram, panel };
      const engine = new (AE())({
        steps: _buildSteps(ctx),
        speed: 1,
      });
      engine.setContext(ctx);
      window.SnowflakeViz.AnimationControls.register(engine);

      return { destroy: () => engine.destroy() };
    },
  };

  /* ── DOM builders ────────────────────────────────────────── */

  function _buildDiagram(data) {
    const d = _el('div', 'arch-diagram');
    d.id = 'arch-diagram';

    /* LAYER 1 — Cloud Services */
    const cloud = _el('div', 'arch-layer arch-layer-cloud');
    cloud.id = 'arch-cloud';
    cloud.innerHTML = `
      <div class="arch-layer-header">
        <div class="arch-layer-num">1</div>
        <span class="arch-layer-title">Cloud Services Layer</span>
        <span class="arch-layer-status">Always-on · No warehouse needed</span>
      </div>
      <div class="arch-comp-row" id="arch-comp-row">
        ${CLOUD_COMPONENTS.map(c =>
          `<div class="arch-component" id="${c.id}">${c.label}</div>`).join('')}
      </div>`;
    d.appendChild(cloud);

    /* Connector 1 */
    d.appendChild(_connector([
      { label: '↓ SQL',      dir: 'down' },
      { label: '↑ Results',  dir: 'up'   },
    ], 'arch-conn-1'));

    /* LAYER 2 — Virtual Warehouses */
    const compute = _el('div', 'arch-layer arch-layer-compute');
    compute.id = 'arch-compute';
    const whs = data && data.warehouses ? data.warehouses : WAREHOUSES;
    compute.innerHTML = `
      <div class="arch-layer-header">
        <div class="arch-layer-num">2</div>
        <span class="arch-layer-title">Virtual Warehouses (Compute)</span>
        <span class="arch-layer-status">Independent · Auto-scale · Multi-cluster</span>
      </div>
      <div class="arch-wh-row" id="arch-wh-row">
        ${whs.map(wh => `
          <div class="arch-wh-card" id="arch-wh-${wh.name.toLowerCase().replace(/_/g,'-')}"
               style="--wh-color:${wh.color}">
            <div>
              <span class="arch-wh-dot" style="background:${wh.color}"></span>
              <span class="arch-wh-name">${wh.name}</span>
            </div>
            <div class="arch-wh-meta">${wh.size} · ${wh.clusterMin || wh.clusterMin}–${wh.clusterMax}×</div>
          </div>`).join('')}
      </div>`;
    d.appendChild(compute);

    /* Connector 2 */
    d.appendChild(_connector([
      { label: '↓ Read',   dir: 'down' },
      { label: '↑ Write',  dir: 'up'   },
    ], 'arch-conn-2'));

    /* LAYER 3 — Storage */
    const storage = _el('div', 'arch-layer arch-layer-storage');
    storage.id = 'arch-storage';
    const partitions = Array.from({ length: PARTITION_COUNT }, (_, i) =>
      `<div class="arch-partition-mini" id="arch-mp-${i + 1}"></div>`
    ).join('');
    storage.innerHTML = `
      <div class="arch-layer-header">
        <div class="arch-layer-num">3</div>
        <span class="arch-layer-title">Centralized Storage</span>
        <span class="arch-layer-status">S3/Azure/GCS · Columnar micro-partitions · Immutable</span>
      </div>
      <div class="arch-partition-row" id="arch-partition-row">
        ${partitions}
      </div>`;
    d.appendChild(storage);

    return d;
  }

  function _connector(pills, id) {
    const c = _el('div', 'arch-connector');
    c.id = id;
    pills.forEach(p => {
      const pill = _el('div', 'arch-conn-pill');
      pill.id = `${id}-${p.dir}`;
      pill.textContent = p.label;
      c.appendChild(pill);
    });
    return c;
  }

  function _buildPanel() {
    const p = _el('div', 'anim-panel');
    p.id = 'arch-panel';
    p.innerHTML = `
      <div class="anim-panel-step-num" id="panel-step">Overview</div>
      <div class="anim-panel-title"   id="panel-title">Three-Layer Architecture</div>
      <div class="anim-panel-body"    id="panel-body">Press Play to walk through Snowflake's architecture layer by layer, with Netflix context at every step.</div>
      <div class="anim-panel-facts"   id="panel-facts"></div>`;
    return p;
  }

  /* ── Animation steps ─────────────────────────────────────── */

  function _setPanel(ctx, step, title, body, facts = []) {
    const p = ctx.panel;
    if (!p) return;
    const stepEl = p.querySelector('#panel-step');
    const titleEl = p.querySelector('#panel-title');
    const bodyEl  = p.querySelector('#panel-body');
    const factsEl = p.querySelector('#panel-facts');
    if (stepEl) stepEl.textContent = step;
    if (titleEl) titleEl.textContent = title;
    if (bodyEl)  bodyEl.innerHTML = body;
    if (factsEl) factsEl.innerHTML = facts.map(f => `<div class="anim-panel-fact">${f}</div>`).join('');
    p.classList.add('highlighted');
  }

  function _resetLayers(ctx) {
    const c = ctx.container;
    if (!c) return;
    c.querySelectorAll('.arch-layer').forEach(l => {
      l.classList.remove('highlighted', 'dimmed');
    });
    c.querySelectorAll('.arch-component').forEach(el => {
      el.classList.remove('spotlight', 'dimmed', 'data-flow');
    });
    c.querySelectorAll('.arch-wh-card').forEach(el => {
      el.classList.remove('spotlight', 'dimmed', 'running');
    });
    c.querySelectorAll('.arch-partition-mini').forEach(el => {
      el.classList.remove('scanning', 'pruned');
    });
    c.querySelectorAll('.arch-conn-pill').forEach(el => {
      el.classList.remove('active');
    });
  }

  function _highlight(ctx, layerId) {
    const el = ctx.container.querySelector('#' + layerId);
    if (el) el.classList.add('highlighted');
  }

  function _dim(ctx, ...layerIds) {
    layerIds.forEach(id => {
      const el = ctx.container.querySelector('#' + id);
      if (el) el.classList.add('dimmed');
    });
  }

  function _spotlightComps(ctx, ...ids) {
    const c = ctx.container;
    ids.forEach(id => {
      const el = c.querySelector('#' + id);
      if (el) el.classList.add('spotlight');
    });
  }

  function _dimComps(ctx, ...ids) {
    const c = ctx.container;
    ids.forEach(id => {
      const el = c.querySelector('#' + id);
      if (el) el.classList.add('dimmed');
    });
  }

  function _spotlightWH(ctx, whId) {
    ctx.container.querySelectorAll('.arch-wh-card').forEach(el => {
      el.classList.add('dimmed');
    });
    const el = ctx.container.querySelector('#' + whId);
    if (el) { el.classList.remove('dimmed'); el.classList.add('spotlight'); }
  }

  function _runAllWH(ctx) {
    ctx.container.querySelectorAll('.arch-wh-card').forEach(el => {
      el.classList.add('running');
    });
  }

  function _scanPartitions(ctx, indices) {
    indices.forEach(i => {
      const el = ctx.container.querySelector(`#arch-mp-${i}`);
      if (el) el.classList.add('scanning');
    });
  }

  function _prunePartitions(ctx, indices) {
    indices.forEach(i => {
      const el = ctx.container.querySelector(`#arch-mp-${i}`);
      if (el) el.classList.add('pruned');
    });
  }

  function _activateConn(ctx, connId) {
    const c = ctx.container;
    c.querySelectorAll(`#${connId} .arch-conn-pill`).forEach(el => el.classList.add('active'));
  }

  function _buildSteps(ctx) {
    const F = AE().fnStep;
    return [
      F('Overview', 'The three layers of Snowflake',
        (c) => {
          _resetLayers(c);
          _setPanel(c,
            'Step 1 of 8',
            'Three Completely Independent Layers',
            'Snowflake\'s core innovation: Storage, Compute, and Cloud Services are decoupled. Each scales and bills independently — storage never goes offline waiting for compute.',
            [
              'Netflix stores 500B+ rows without keeping a single warehouse running 24/7',
              'Compute scales from 0 to 10 clusters in seconds',
              'Cloud Services are always available — metadata queries are free',
            ]
          );
        },
        (c) => { _resetLayers(c); },
        3000
      ),

      F('Cloud Services', 'The brain of Snowflake — always on',
        (c) => {
          _resetLayers(c);
          _highlight(c, 'arch-cloud');
          _dim(c, 'arch-compute');
          _dim(c, 'arch-storage');
          _setPanel(c,
            'Step 2 of 8',
            'Cloud Services Layer',
            'The orchestration brain. Always running — no warehouse needed. Handles query parsing, optimization, metadata, auth, and ACID transactions.',
            [
              'Query optimizer rewrites SQL before it hits any warehouse',
              'Metadata tracks min/max per column for every micro-partition',
              'Result Cache lives here — zero compute cost on cache hits',
              'Netflix SHOW TABLES → Cloud Services only, no WH charged',
            ]
          );
        },
        (c) => { _resetLayers(c); },
        3500
      ),

      F('Query Optimizer', 'Spotlight: how Cloud Services optimizes queries',
        (c) => {
          _resetLayers(c);
          _highlight(c, 'arch-cloud');
          _dim(c, 'arch-compute');
          _dim(c, 'arch-storage');
          _spotlightComps(c, 'comp-optimizer', 'comp-metadata');
          _dimComps(c, 'comp-auth', 'comp-acl', 'comp-txn', 'comp-cache');
          _setPanel(c,
            'Step 3 of 8',
            'Query Optimizer + Metadata',
            'Before a single cluster wakes up, the optimizer rewrites the query and consults partition metadata to determine which micro-partitions can be pruned.',
            [
              'Metadata stores min/max year, genre for every partition in MOVIES',
              'WHERE RELEASE_YEAR = 2020 → 80%+ of partitions pruned before warehouse sees the query',
              'Zero cost to Netflix for this metadata lookup — Cloud Services tier',
            ]
          );
        },
        (c) => { _resetLayers(c); },
        3500
      ),

      F('Virtual Warehouses', 'Compute that\'s fully isolated per team',
        (c) => {
          _resetLayers(c);
          _dim(c, 'arch-cloud');
          _dim(c, 'arch-storage');
          _highlight(c, 'arch-compute');
          _setPanel(c,
            'Step 4 of 8',
            'Virtual Warehouses — Isolated Compute',
            'Each Virtual Warehouse is an independent cluster of EC2/VMs. They share storage but never share compute. Netflix runs five, one per team.',
            [
              'INGEST_WH: X-Large, 2–10 clusters — absorbs 1.4B daily events',
              'ANALYTICS_WH: Large, 1–6 clusters — Tableau & Looker dashboards',
              'ML_TRAINING_WH: X-Large Snowpark — TensorFlow feature engineering',
              'EXEC_WH: Small, 1 cluster — CEO KPI dashboard, always responsive',
            ]
          );
        },
        (c) => { _resetLayers(c); },
        3500
      ),

      F('Multi-Cluster Scale-Out', 'All five Netflix warehouses running simultaneously',
        (c) => {
          _resetLayers(c);
          _dim(c, 'arch-cloud');
          _dim(c, 'arch-storage');
          _highlight(c, 'arch-compute');
          _runAllWH(c);
          _activateConn(c, 'arch-conn-1');
          _activateConn(c, 'arch-conn-2');
          _setPanel(c,
            'Step 5 of 8',
            'All Warehouses — Simultaneous, No Contention',
            'All five Netflix warehouses can run at full capacity at the same time — reading the same data with zero lock contention. This is impossible with traditional shared-disk systems.',
            [
              'Data Science trains a 12B-row model while Marketing queries campaign results',
              'Same WATCH_EVENTS table, different warehouses, zero interference',
              'ANALYTICS_WH scales from 1 → 6 clusters during peak dashboard hours',
            ]
          );
        },
        (c) => { _resetLayers(c); },
        3500
      ),

      F('Storage Layer', 'Micro-partitions: the foundation of performance',
        (c) => {
          _resetLayers(c);
          _dim(c, 'arch-cloud');
          _dim(c, 'arch-compute');
          _highlight(c, 'arch-storage');
          _setPanel(c,
            'Step 6 of 8',
            'Centralized Storage — Micro-Partitions',
            'All data is stored in cloud object storage as compressed columnar micro-partitions (~16MB each). Immutable — updates create new partitions. Managed entirely by Snowflake.',
            [
              'Columnar layout: SELECT TITLE, GENRE reads only those column files',
              'ZSTD compression — Netflix WATCH_EVENTS compresses ~5:1',
              'Automatic clustering by WATCH_START and COUNTRY_CODE',
              'Time Travel reads older partition snapshots — no backup needed',
            ]
          );
        },
        (c) => { _resetLayers(c); },
        3500
      ),

      F('Partition Pruning', 'Metadata-driven scan elimination',
        (c) => {
          _resetLayers(c);
          _dim(c, 'arch-cloud');
          _dim(c, 'arch-compute');
          _highlight(c, 'arch-storage');
          _scanPartitions(c, [11, 12, 13, 14, 15]);
          _prunePartitions(c, [1, 2, 3, 4, 5, 6, 7, 8]);
          _activateConn(c, 'arch-conn-2');
          _setPanel(c,
            'Step 7 of 8',
            'Partition Pruning in Action',
            'Query: WHERE WATCH_START >= 2024-01-01. Cloud Services checks metadata and eliminates every partition whose max date is before Jan 2024. The warehouse only reads the highlighted partitions.',
            [
              '20 partitions total → 5 scanned (75% data skipped)',
              'Warehouse wakes up and receives pre-pruned work list',
              'Each surviving partition is read column-by-column (only requested cols)',
              'Netflix runs this against 182,500 real partitions on WATCH_EVENTS',
            ]
          );
        },
        (c) => { _resetLayers(c); },
        4000
      ),

      F('Result Cache', 'Identical queries — zero compute cost',
        (c) => {
          _resetLayers(c);
          _highlight(c, 'arch-cloud');
          _dim(c, 'arch-compute');
          _dim(c, 'arch-storage');
          _spotlightComps(c, 'comp-cache', 'comp-optimizer');
          _dimComps(c, 'comp-metadata', 'comp-auth', 'comp-acl', 'comp-txn');
          _activateConn(c, 'arch-conn-1');
          _setPanel(c,
            'Step 8 of 8',
            'Result Cache — 24-Hour Zero-Cost Replay',
            'When a query result is already cached, Cloud Services returns it instantly. No warehouse starts, no storage is read. The cache is per-account, shared across all users.',
            [
              'Daily executive dashboard re-runs every morning → first run costs compute, next 50 hits are free',
              'Cache lifetime: 24 hours, invalidated only if underlying data changes',
              'Netflix daily recommends 80M users — pre-computed results served from cache',
              'Reduces ANALYTICS_WH credit consumption by 30–40% on typical BI workloads',
            ]
          );
        },
        (c) => { _resetLayers(c); },
        4000
      ),
    ];
  }

  /* ── Helpers ─────────────────────────────────────────────── */
  function _el(tag, cls) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    return el;
  }

  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Modules = window.SnowflakeViz.Modules || {};
  window.SnowflakeViz.Modules.architecture = ArchitectureModule;
})();
