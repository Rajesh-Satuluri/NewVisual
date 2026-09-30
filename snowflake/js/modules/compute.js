/* ============================================================
   Compute Module — Virtual Warehouse auto-scaling animation
   Scenario: ANALYTICS_WH morning dashboard load surge.
   ============================================================ */

(function () {
  'use strict';

  const AE = () => window.SnowflakeViz.AnimationEngine;

  /* Node count per warehouse size (visible dots in the card) */
  const SIZE_NODES = { 'X-Small':1, 'Small':2, 'Medium':4, 'Large':8, 'X-Large':12, 'X-Large (Snowpark)':12, '2X-Large':16 };

  /* Credit consumption per cluster per hour by size */
  const SIZE_CREDITS = { 'X-Small':1, 'Small':2, 'Medium':4, 'Large':8, 'X-Large':16, 'X-Large (Snowpark)':16, '2X-Large':32 };

  const ComputeModule = {
    render(canvas, { data }) {
      canvas.innerHTML = '';

      const nd = data;
      const warehouses = (nd && nd.warehouses) ? nd.warehouses : _fallbackWH();

      const page = _el('div', 'compute-page');

      /* header */
      page.innerHTML = `
        <div class="mod-header">
          <div class="mod-eyebrow">Compute Layer</div>
          <h1 class="mod-title">Virtual Warehouses</h1>
          <p class="mod-subtitle">Each Netflix team owns a dedicated warehouse. Press <strong>Play</strong> to watch ANALYTICS_WH handle a Monday-morning dashboard surge — auto-resume, scale-out, then auto-suspend.</p>
        </div>`;

      /* WH selector tabs */
      const tabs = _el('div', 'compute-wh-tabs');
      tabs.id = 'compute-wh-tabs';
      warehouses.forEach((wh, i) => {
        const btn = _el('button', 'compute-wh-tab' + (i === 1 ? ' active' : ''));
        btn.style.setProperty('--tab-color', wh.color);
        btn.dataset.whIndex = i;
        btn.textContent = wh.name;
        btn.addEventListener('click', () => _switchWH(wh, warehouses, btn));
        tabs.appendChild(btn);
      });
      page.appendChild(tabs);

      /* layout */
      const layout = _el('div', 'compute-layout');
      const left  = _el('div', '');
      const right = _el('div', '');
      layout.appendChild(left);
      layout.appendChild(right);
      page.appendChild(layout);

      /* ── LEFT: status bar + cluster grid + query queue ── */
      const statusBar = _el('div', 'compute-status-bar');
      statusBar.id = 'compute-status-bar';
      statusBar.innerHTML = `
        <div class="compute-status-dot suspended" id="compute-status-dot"></div>
        <span class="compute-status-label" id="compute-status-label">Auto-Suspended</span>
        <span class="compute-credits-rate" id="compute-credits">0 credits/hr</span>`;
      left.appendChild(statusBar);

      const clusterArea = _el('div', 'compute-cluster-area');
      const clusterTitle = _el('div', 'compute-cluster-area-title');
      clusterTitle.textContent = 'Cluster Map — ANALYTICS_WH (Large)';
      clusterArea.appendChild(clusterTitle);
      const clusterGrid = _el('div', 'compute-cluster-grid');
      clusterGrid.id = 'compute-cluster-grid';
      clusterArea.appendChild(clusterGrid);
      left.appendChild(clusterArea);

      const queueStrip = _el('div', 'compute-queue-strip');
      queueStrip.id = 'compute-queue';
      queueStrip.innerHTML = `<span class="compute-queue-label">Query Queue</span>`;
      left.appendChild(queueStrip);

      /* ── RIGHT: info panel + specs ── */
      const panel = _el('div', 'anim-panel');
      panel.id = 'compute-panel';
      panel.innerHTML = `
        <div class="anim-panel-step-num" id="cpanel-step">Overview</div>
        <div class="anim-panel-title"    id="cpanel-title">Virtual Warehouse Lifecycle</div>
        <div class="anim-panel-body"     id="cpanel-body">Press Play to walk through how ANALYTICS_WH handles a surge of Tableau dashboard queries — auto-resume, multi-cluster scale-out, and eventual auto-suspend.</div>
        <div class="anim-panel-facts"    id="cpanel-facts"></div>`;
      right.appendChild(panel);

      /* specs card — populated by _switchWH */
      const specs = _el('div', 'compute-specs');
      specs.id = 'compute-specs';
      right.appendChild(specs);

      canvas.appendChild(page);

      /* init to ANALYTICS_WH (index 1) */
      const analyticsWH = warehouses.find(w => w.name === 'ANALYTICS_WH') || warehouses[1] || warehouses[0];
      _renderSpecs(analyticsWH, specs);
      _renderClusters(clusterGrid, analyticsWH, 0, 'suspended');

      /* tabs: activate the analytics WH tab */
      tabs.querySelectorAll('.compute-wh-tab').forEach(t => {
        t.classList.toggle('active', warehouses[t.dataset.whIndex]?.name === analyticsWH.name);
      });

      /* ── AnimationEngine ── */
      const ctx = {
        container: left,
        panel,
        statusBar,
        clusterGrid,
        queueStrip,
        wh: analyticsWH,
      };

      const engine = new (AE())({ steps: _buildSteps(ctx), speed: 1 });
      engine.setContext(ctx);
      window.SnowflakeViz.AnimationControls.register(engine);

      return { destroy: () => engine.destroy() };
    },
  };

  /* ── Warehouse selector ──────────────────────────────────── */
  function _switchWH(wh, warehouses, clickedBtn) {
    clickedBtn.closest('#compute-wh-tabs').querySelectorAll('.compute-wh-tab').forEach(b => b.classList.remove('active'));
    clickedBtn.classList.add('active');
    const specs = document.getElementById('compute-specs');
    if (specs) _renderSpecs(wh, specs);
  }

  function _renderSpecs(wh, container) {
    const credits = SIZE_CREDITS[wh.size] || 8;
    container.innerHTML = `
      <div class="compute-specs-title">${wh.name}</div>
      ${[
        ['Team',          wh.team],
        ['Size',          wh.size],
        ['Min clusters',  wh.clusterMin],
        ['Max clusters',  wh.clusterMax],
        ['Auto-suspend',  wh.autoSuspend + 's idle'],
        ['Credits/hr',    `${credits * wh.clusterMin}–${credits * wh.clusterMax} (${credits}/cluster)`],
        ['Purpose',       wh.purpose],
      ].map(([k,v]) => `<div class="compute-spec-row"><span class="compute-spec-key">${k}</span><span class="compute-spec-val">${v}</span></div>`).join('')}`;
  }

  /* ── Cluster rendering ────────────────────────────────────── */
  function _renderClusters(grid, wh, count, state) {
    grid.innerHTML = '';
    const nodeCount = Math.min(SIZE_NODES[wh.size] || 8, 16);
    const label = { suspended:'suspended', resuming:'resuming', running:'running', 'scaling-up':'scaling-up', suspending:'suspending' }[state] || state;
    for (let i = 0; i < Math.max(count, 1); i++) {
      const s = (count === 0) ? 'suspended' : (i === count - 1 && state === 'scaling-up') ? 'scaling-up' : state;
      grid.appendChild(_clusterCard(i + 1, s, nodeCount, `Cluster ${i + 1} of ${Math.max(count, wh.clusterMin)}`));
    }
  }

  function _clusterCard(num, state, nodeCount, subtitle) {
    const card = _el('div', `compute-cluster-card ${state}`);
    const stateLabel = { suspended:'Suspended', resuming:'Resuming…', running:'Running', 'scaling-up':'Starting…', suspending:'Suspending…' }[state] || state;
    card.innerHTML = `
      <div class="compute-cluster-header">
        <span class="compute-cluster-id">Cluster-${num}</span>
        <span class="compute-cluster-state-badge">${stateLabel}</span>
      </div>
      <div class="compute-node-row">
        ${Array.from({ length: nodeCount }, () => '<div class="compute-node"></div>').join('')}
      </div>
      <div class="compute-cluster-queries">${subtitle}</div>`;
    return card;
  }

  /* ── Status bar helpers ───────────────────────────────────── */
  function _setStatus(ctx, dotState, label, credits) {
    const dot = ctx.container.querySelector('#compute-status-dot');
    const lbl = ctx.container.querySelector('#compute-status-label');
    const crd = ctx.container.querySelector('#compute-credits');
    const bar = ctx.statusBar;
    if (dot) dot.className = `compute-status-dot ${dotState}`;
    if (lbl) lbl.textContent = label;
    if (crd) { crd.textContent = credits; crd.className = 'compute-credits-rate' + (credits !== '0 credits/hr' ? ' active' : ''); }
    if (bar) {
      bar.classList.remove('running', 'resuming', 'scaling');
      if (dotState === 'running')  bar.classList.add('running');
      if (dotState === 'resuming') bar.classList.add('resuming');
      if (dotState === 'scaling')  bar.classList.add('scaling');
    }
  }

  /* ── Query queue helpers ──────────────────────────────────── */
  function _addQueries(ctx, queries) {
    const strip = ctx.container.querySelector('#compute-queue');
    if (!strip) return;
    queries.forEach((q, i) => {
      setTimeout(() => {
        const pill = _el('div', 'compute-query-pill' + (q.queued ? ' queued' : ''));
        pill.textContent = q.label;
        strip.appendChild(pill);
      }, i * 180);
    });
  }

  function _clearQueue(ctx) {
    const strip = ctx.container.querySelector('#compute-queue');
    if (!strip) return;
    strip.querySelectorAll('.compute-query-pill').forEach(el => el.remove());
  }

  /* ── Info panel helpers ───────────────────────────────────── */
  function _setPanel(ctx, step, title, body, facts = []) {
    const p = ctx.panel;
    if (!p) return;
    p.querySelector('#cpanel-step').textContent = step;
    p.querySelector('#cpanel-title').textContent = title;
    p.querySelector('#cpanel-body').innerHTML = body;
    p.querySelector('#cpanel-facts').innerHTML = facts.map(f => `<div class="anim-panel-fact">${f}</div>`).join('');
    p.classList.add('highlighted');
  }

  /* ── Animation steps ──────────────────────────────────────── */
  function _buildSteps(ctx) {
    const F = AE().fnStep;
    const wh = ctx.wh;
    const credits = SIZE_CREDITS[wh.size] || 8;

    function reset(c) {
      _setStatus(c, 'suspended', 'Auto-Suspended', '0 credits/hr');
      _renderClusters(c.container.querySelector('#compute-cluster-grid'), wh, 0, 'suspended');
      _clearQueue(c);
    }

    return [
      F('Auto-Suspended', 'Warehouse sleeping — zero cost',
        (c) => {
          reset(c);
          _setPanel(c,
            'Step 1 of 9',
            'Auto-Suspended — Zero Cost',
            'ANALYTICS_WH has been idle for 300 seconds (its auto-suspend threshold). Snowflake shut it down automatically. Zero credits are consumed.',
            [
              'Auto-suspend: no queries for 300s → warehouse enters suspended state',
              'Storage data persists — only compute is released',
              'Netflix saves credits during off-peak hours and weekends',
              `Cost right now: 0 credits/hr (vs ${credits * wh.clusterMax} credits/hr at full scale)`,
            ]
          );
        },
        reset,
        3000
      ),

      F('Query Arrives', 'Tableau submits a dashboard refresh at 9:00 AM',
        (c) => {
          reset(c);
          _addQueries(c, [{ label: 'dashboard_refresh_1' }, { label: 'dashboard_refresh_2' }]);
          _setPanel(c,
            'Step 2 of 9',
            'Monday Morning — Queries Arrive',
            'Netflix\'s Finance team opens Tableau at 9:00 AM, triggering a dashboard refresh. ANALYTICS_WH receives its first queries of the day.',
            [
              'Queries queue in Cloud Services while warehouse resumes',
              'Queueing is transparent to the user — Tableau just waits',
              'Auto-resume is triggered the moment a query targets this warehouse',
              'Other warehouses (EXEC_WH, ML_TRAINING_WH) are unaffected',
            ]
          );
        },
        (c) => { reset(c); },
        3000
      ),

      F('Auto-Resuming', 'Warehouse wakes up in ~5 seconds',
        (c) => {
          _clearQueue(c);
          _addQueries(c, [{ label: 'dashboard_refresh_1' }, { label: 'dashboard_refresh_2' }]);
          _setStatus(c, 'resuming', 'Auto-Resuming (2–5 sec)…', '0 credits/hr');
          _renderClusters(c.container.querySelector('#compute-cluster-grid'), wh, 1, 'resuming');
          _setPanel(c,
            'Step 3 of 9',
            'Auto-Resume — Cluster Provisioning',
            'Cloud Services sends a resume signal. Snowflake provisions EC2/VMs in the target region. Typical resume time: 2–5 seconds for a Large warehouse.',
            [
              'Resuming: VMs allocated, Snowflake metadata loaded into cluster memory',
              'Credits start accruing once the warehouse reaches "running" state',
              'Queries remain queued — user sees normal query latency, no error',
              `${wh.size} resume time ≈ 3s — much faster than resizing a traditional DW`,
            ]
          );
        },
        (c) => { _clearQueue(c); reset(c); },
        3000
      ),

      F('Cluster 1 Running', 'First cluster up — queries dispatched',
        (c) => {
          _clearQueue(c);
          _addQueries(c, [{ label: 'dashboard_refresh_1' }, { label: 'dashboard_refresh_2' }, { label: 'daily_kpi_board' }]);
          _setStatus(c, 'running', 'Running — 1 Cluster', `${credits} credits/hr`);
          _renderClusters(c.container.querySelector('#compute-cluster-grid'), wh, 1, 'running');
          _setPanel(c,
            'Step 4 of 9',
            'Single Cluster — Queries Executing',
            `Cluster-1 is running. All ${wh.size} nodes are active. Queries are dispatched and begin executing against the partitions Cloud Services already pruned.`,
            [
              `Consuming ${credits} credits/hr — only while running`,
              'Each node reads its assigned micro-partitions in parallel',
              'Columnar reads: only the requested columns loaded from S3',
              'Result Cache checked first — repeated queries return instantly',
            ]
          );
        },
        (c) => { _clearQueue(c); reset(c); },
        3000
      ),

      F('Load Surge', '9:15 AM — entire Finance team opens dashboards',
        (c) => {
          _clearQueue(c);
          _addQueries(c, [
            { label: 'finance_dashboard' },
            { label: 'content_kpi' },
            { label: 'engagement_weekly' },
            { label: 'subscriber_growth' },
            { label: 'ad_revenue_2024', queued: true },
            { label: 'churn_analysis', queued: true },
          ]);
          _setStatus(c, 'running', 'Running — concurrency limit reached', `${credits} credits/hr`);
          _renderClusters(c.container.querySelector('#compute-cluster-grid'), wh, 1, 'running');
          _setPanel(c,
            'Step 5 of 9',
            'Concurrency Limit — Scale-Out Triggered',
            'Cluster-1 hits the concurrency limit (typically 8 concurrent queries per cluster). New queries queue. ANALYTICS_WH is configured for multi-cluster scale-out.',
            [
              'Multi-cluster mode: ECONOMY or AUTO scaling policy',
              'Snowflake detects queued queries > threshold → spin up Cluster-2',
              `wh.clusterMax = ${wh.clusterMax}: up to ${wh.clusterMax} clusters can run simultaneously`,
              'Credit cost will increase proportionally — still cheaper than idle over-provisioning',
            ]
          );
        },
        (c) => { _clearQueue(c); reset(c); },
        3500
      ),

      F('Scale-Out', 'Cluster 2 spins up to absorb queued queries',
        (c) => {
          _clearQueue(c);
          _addQueries(c, [
            { label: 'finance_dashboard' },
            { label: 'content_kpi' },
            { label: 'engagement_weekly' },
            { label: 'subscriber_growth' },
            { label: 'ad_revenue_2024' },
            { label: 'churn_analysis' },
          ]);
          _setStatus(c, 'scaling', `Scaling Out → 2 Clusters`, `${credits * 2} credits/hr`);
          _renderClusters(c.container.querySelector('#compute-cluster-grid'), wh, 2, 'scaling-up');
          _setPanel(c,
            'Step 6 of 9',
            'Scale-Out — Cluster 2 Starting',
            'A second cluster is provisioned. Queued queries are immediately dispatched to it. Users who were waiting see their queries start within seconds.',
            [
              'Both clusters read the same Storage layer — no data movement or copying',
              `Credit cost: ${credits * 2} credits/hr during dual-cluster operation`,
              'Scale-out is transparent — SQL clients see no connection changes',
              'Netflix can scale to 6 clusters if needed (wh.clusterMax)',
            ]
          );
        },
        (c) => { _clearQueue(c); reset(c); },
        3500
      ),

      F('Two Clusters Running', 'Peak load — all queries executing',
        (c) => {
          _clearQueue(c);
          _addQueries(c, [
            { label: 'finance_dashboard' },
            { label: 'content_kpi' },
            { label: 'ad_revenue_2024' },
            { label: 'subscriber_growth' },
          ]);
          _setStatus(c, 'running', 'Running — 2 Clusters (peak)', `${credits * 2} credits/hr`);
          _renderClusters(c.container.querySelector('#compute-cluster-grid'), wh, 2, 'running');
          _setPanel(c,
            'Step 7 of 9',
            'Peak Operation — Two Clusters',
            'Both clusters are running at full capacity. The Finance team\'s 6 concurrent dashboards execute without any user waiting for a concurrency slot.',
            [
              `${wh.size} × 2 clusters: ${credits * 2} credits/hr consumed`,
              'Cluster-1 and Cluster-2 share the same Storage — zero data duplication',
              'Result Cache in Cloud Services deduplicates identical queries across clusters',
              'Auto-scale ECONOMY policy: new clusters start only when queues form',
            ]
          );
        },
        (c) => { _clearQueue(c); reset(c); },
        3500
      ),

      F('Scale-In', 'Load drops — Cluster 2 suspends automatically',
        (c) => {
          _clearQueue(c);
          _addQueries(c, [{ label: 'daily_kpi_board' }]);
          _setStatus(c, 'running', 'Scaling In — Cluster 2 suspending', `${credits} credits/hr`);
          _renderClusters(c.container.querySelector('#compute-cluster-grid'), wh, 2, 'suspending');
          setTimeout(() => {
            _renderClusters(c.container.querySelector('#compute-cluster-grid'), wh, 1, 'running');
          }, 1200);
          _setPanel(c,
            'Step 8 of 9',
            'Scale-In — Cluster 2 Auto-Suspends',
            'The query queue drains. Snowflake detects Cluster-2 is idle and begins suspending it. Credits immediately drop back to 1-cluster rate.',
            [
              'Scale-in policy: cluster suspends after its own auto-suspend threshold (configurable)',
              `Credit cost drops from ${credits * 2} → ${credits} credits/hr instantly`,
              'In-flight queries on Cluster-2 complete before it suspends',
              'Netflix only paid for the exact duration of the surge',
            ]
          );
        },
        (c) => { _clearQueue(c); reset(c); },
        3500
      ),

      F('Auto-Suspend', 'No queries for 300s → warehouse sleeps',
        (c) => {
          _clearQueue(c);
          _setStatus(c, 'suspended', 'Auto-Suspending…', '0 credits/hr');
          _renderClusters(c.container.querySelector('#compute-cluster-grid'), wh, 1, 'suspending');
          setTimeout(() => {
            _setStatus(c, 'suspended', 'Auto-Suspended — 0 credits/hr', '0 credits/hr');
            _renderClusters(c.container.querySelector('#compute-cluster-grid'), wh, 0, 'suspended');
          }, 1500);
          _setPanel(c,
            'Step 9 of 9',
            'Auto-Suspend — Zero Cost Until Next Query',
            'ANALYTICS_WH has been idle for 300 seconds. Snowflake suspends it automatically. Zero credits from now until the next query triggers auto-resume.',
            [
              'Full lifecycle demonstrated: suspend → resume → scale-out → scale-in → suspend',
              'Netflix ANALYTICS_WH pattern: active ~6 hrs/day, suspended ~18 hrs/day',
              'Estimated savings vs always-on: ~70% credit reduction',
              'EXEC_WH: auto-suspend 60s — critical for the CEO\'s rarely-run dashboard',
            ]
          );
        },
        (c) => { reset(c); },
        4000
      ),
    ];
  }

  /* ── Helpers ─────────────────────────────────────────────── */
  function _fallbackWH() {
    return [
      { name:'INGEST_WH',     size:'X-Large',  clusterMin:2, clusterMax:10, autoSuspend:60,  team:'Data Engineering',  color:'#29b5e8', purpose:'Snowpipe & COPY INTO for watch events' },
      { name:'ANALYTICS_WH',  size:'Large',    clusterMin:1, clusterMax:6,  autoSuspend:300, team:'Analytics / Finance',color:'#3fb950', purpose:'Business intelligence dashboards' },
      { name:'ML_TRAINING_WH',size:'X-Large (Snowpark)', clusterMin:1, clusterMax:4, autoSuspend:120, team:'Data Science', color:'#a371f7', purpose:'Feature engineering & model training' },
      { name:'MARKETING_WH',  size:'Medium',   clusterMin:1, clusterMax:3,  autoSuspend:600, team:'Marketing',          color:'#f97316', purpose:'Campaign analysis, A/B test results' },
      { name:'EXEC_WH',       size:'Small',    clusterMin:1, clusterMax:1,  autoSuspend:60,  team:'Leadership',         color:'#e3b341', purpose:'Executive KPI dashboards' },
    ];
  }

  function _el(tag, cls) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    return el;
  }

  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Modules = window.SnowflakeViz.Modules || {};
  window.SnowflakeViz.Modules.compute = ComputeModule;
})();
