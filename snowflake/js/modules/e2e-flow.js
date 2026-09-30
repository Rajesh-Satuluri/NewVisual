/* ============================================================
   E2E Flow Module — Full Netflix watch-event pipeline capstone
   User device → Kafka → Snowpipe → WATCH_EVENTS → CS →
   ANALYTICS_WH → Snowpark ML → Tableau Dashboard
   ============================================================ */

(function () {
  'use strict';

  const AE = () => window.SnowflakeViz.AnimationEngine;

  const STAGES = [
    {
      id: 'user', icon: '📱', name: 'Netflix User', color: '#e50914',
      desc: 'A Netflix subscriber presses Play on "Stranger Things S5 E1". The client SDK immediately fires a WATCH_START event containing USER_ID, CONTENT_ID, DEVICE_TYPE, REGION, QUALITY, and an epoch timestamp.',
      facts: [
        'Event payload: 12 fields (USER_ID, CONTENT_ID, WATCH_DATE, START_TS, DEVICE_TYPE, REGION, QUALITY, COUNTRY, APP_VERSION …)',
        'Triggered: every Play, Pause, Seek, Stop, and Quality change',
        'Volume: 238M subscribers × multiple events per session',
        'SDK: client-side event buffer, flushed every 5 seconds over HTTPS',
      ],
    },
    {
      id: 'kafka', icon: '📨', name: 'Kafka Broker', color: '#f97316',
      desc: 'The event is published to the Kafka topic watch-events-v3 within 50ms. Netflix runs a 200-partition Kafka cluster on AWS MSK. At peak (8pm PST Friday), the cluster handles 16,000 events per second.',
      facts: [
        'Topic: watch-events-v3, 200 partitions, 3× replication',
        'Peak throughput: 16,000 events/second',
        'Retention: 7 days on Kafka before consumed',
        'Consumer: Kafka Snowflake Connector reading all 200 partitions',
      ],
    },
    {
      id: 's3', icon: '🗂️', name: 'S3 Stage File', color: '#e3b341',
      desc: 'The Kafka-Snowflake Connector micro-batches events into Parquet files and writes to s3://netflix-snowpipe-events/ every 60 seconds. Each file contains ~50,000 events, gzip-compressed to ~4MB.',
      facts: [
        'Format: Parquet, gzip-compressed, ~4MB per file',
        'Batch interval: 60 seconds (configurable, min 1 second)',
        'File size: ~50,000 events per file',
        'Path: s3://netflix-snowpipe-events/year=2024/month=08/day=06/',
      ],
    },
    {
      id: 'snowpipe', icon: '🔔', name: 'Snowpipe', color: '#29b5e8',
      desc: 'AWS SQS sends a notification the instant the S3 file lands. Snowpipe picks it up within seconds and queues it for ingestion. Snowpipe uses Snowflake-managed compute — no warehouse credits consumed for the trigger or queue.',
      facts: [
        'Trigger: AWS SQS event notification (< 5s from S3 write)',
        'Zero warehouse cost: Snowpipe uses internal Snowflake micro-WH',
        'Auto-scaling: Snowpipe queues concurrent files without manual tuning',
        'COPY history: every file load recorded in INFORMATION_SCHEMA',
      ],
    },
    {
      id: 'table', icon: '📊', name: 'WATCH_EVENTS', color: '#3fb950',
      desc: 'Snowpipe\'s internal micro-warehouse ingests the Parquet file, creates a new micro-partition with ~50K rows, updates table metadata, and invalidates the Result Cache for this table. Average ingest lag: 2–3 minutes end-to-end.',
      facts: [
        'Table: EVENTS_DB.RAW.WATCH_EVENTS — 500 billion rows total',
        'New partition: ~50K rows added in ~1 minute by Snowpipe',
        'Cache invalidation: Result Cache entries for this table are cleared',
        'Cluster key: WATCH_DATE — new partition sorted automatically',
      ],
    },
    {
      id: 'cs', icon: '☁️', name: 'Cloud Services', color: '#a371f7',
      desc: 'An analytics query arrives from Tableau (ANALYST_ROLE). Cloud Services authenticates the session, checks the Result Cache (MISS — new data), fetches partition metadata, applies cost-based optimization (pruning 99.3% of partitions), and compiles the physical plan.',
      facts: [
        'Auth: ANALYST_ROLE, Okta SSO session validated in < 1ms',
        'Cache: MISS — WATCH_EVENTS was just updated by Snowpipe',
        'Partition pruning: 182,500 → 1,270 partitions (99.3% eliminated)',
        'Total CS overhead: ~21ms before warehouse is contacted',
      ],
    },
    {
      id: 'wh', icon: '⚡', name: 'ANALYTICS_WH', color: '#f56565',
      desc: 'The compiled execution plan arrives at the XL ANALYTICS_WH. 16 compute nodes each receive ~79 pruned partition file paths from S3. They scan in parallel, apply WHERE filters, execute a broadcast JOIN with MOVIES (17K rows), aggregate, and return results.',
      facts: [
        'Warehouse size: XL (16 nodes), dedicated to analytics queries',
        'Parallelism: 16 nodes × 79 partitions each = 1,264 parallel file reads',
        'JOIN strategy: MOVIES (17K rows) broadcast — no shuffle network traffic',
        'Result: aggregated rows returned to Cloud Services in ~45 seconds',
      ],
    },
    {
      id: 'ml', icon: '🤖', name: 'Snowpark ML', color: '#2dd4bf',
      desc: 'A scheduled Snowpark Python job reads the last 7 days of WATCH_EVENTS, computes engagement features per (USER_ID, CONTENT_ID) pair, scores them through a pre-trained XGBoost model stored in Snowflake, and writes top-10 recommendations per user to RECO_DB.',
      facts: [
        'Framework: Snowpark Python DataFrame API — no data egress',
        'Features: 14 engagement signals (completion rate, avg watch time, device…)',
        'Model: XGBoost stored in Snowflake Model Registry, v23.8',
        'Output: 238M users × 10 recs = 2.38B rows written to RECO_DB.SCORES',
      ],
    },
    {
      id: 'dash', icon: '📈', name: 'Tableau Dashboard', color: '#60a5fa',
      desc: 'Tableau auto-refreshes the "What\'s Hot in US Today" dashboard via JDBC. The Netflix content team sees real viewership trends within ~13 minutes of events being watched. Same-day editorial decisions — bumping trending titles to the homepage row — are driven by this pipeline.',
      facts: [
        'Connection: Tableau → Snowflake JDBC driver → ANALYTICS_WH',
        'Refresh: every 60 seconds, full query re-execution',
        'Latency from play to dashboard: ~13 minutes end-to-end',
        'Business impact: homepage editorial decisions updated hourly',
      ],
    },
  ];

  const TIMINGS = [
    { stage: 'user',     label: 'User presses Play',            t: '0 ms'      },
    { stage: 'kafka',    label: 'Kafka event published',        t: '~50 ms'    },
    { stage: 's3',       label: 'S3 micro-batch file written',  t: '~60 s'     },
    { stage: 'snowpipe', label: 'Snowpipe SQS trigger fires',   t: '~65 s'     },
    { stage: 'table',    label: 'WATCH_EVENTS row available',   t: '~3 min'    },
    { stage: 'cs',       label: 'Cloud Services processes',     t: '~3 min 21 ms' },
    { stage: 'wh',       label: 'Warehouse returns results',    t: '~3 min 45 s'  },
    { stage: 'ml',       label: 'Reco scores computed',         t: '~13 min'   },
    { stage: 'dash',     label: 'Dashboard refreshed',          t: '~13 min'   },
  ];

  const E2eFlowModule = {
    render(canvas) {
      canvas.innerHTML = '';

      const wrap = _el('div', 'e2e-page');
      canvas.appendChild(wrap);

      const hdr = _el('div', 'mod-header');
      hdr.innerHTML = `
        <div class="mod-eyebrow">Capstone</div>
        <h1 class="mod-title">End-to-End Flow</h1>
        <p class="mod-subtitle">From a Netflix subscriber pressing Play to a Tableau dashboard updating — trace one watch event through the complete data pipeline, from Kafka ingest to recommendation scoring and real-time analytics.</p>`;
      wrap.appendChild(hdr);

      /* ── Pipeline diagram ── */
      const pipeTitle = _el('div', 'partition-section-title');
      pipeTitle.textContent = 'Netflix Watch Event Pipeline — Press Play';
      wrap.appendChild(pipeTitle);

      const pipeline = _el('div', 'e2e-pipeline');
      pipeline.id = 'e2e-pipeline';
      STAGES.forEach((s, i) => {
        const stage = _el('div', 'e2e-stage');
        stage.id = `e2e-stage-${s.id}`;
        stage.style.setProperty('--e2e-color', s.color);
        stage.innerHTML = `
          <div class="e2e-stage-num">${i + 1}</div>
          <div class="e2e-stage-icon">${s.icon}</div>
          <div class="e2e-stage-name">${s.name}</div>`;
        pipeline.appendChild(stage);
        if (i < STAGES.length - 1) {
          const arrow = _el('div', 'e2e-arrow');
          arrow.id = `e2e-arrow-${i}`;
          arrow.innerHTML = '→';
          pipeline.appendChild(arrow);
        }
      });
      wrap.appendChild(pipeline);

      /* ── Bottom 2-column layout ── */
      const layout = _el('div', 'e2e-layout');
      wrap.appendChild(layout);

      const left  = _el('div', 'e2e-left');
      const right = _el('div', 'e2e-right');
      layout.appendChild(left);
      layout.appendChild(right);

      /* Detail panel */
      const panel = _el('div', 'anim-panel');
      panel.id = 'e2e-panel';
      panel.innerHTML = `
        <div class="anim-panel-step-num" id="e2epanel-step">Ready</div>
        <div class="anim-panel-title"    id="e2epanel-title">End-to-End Pipeline</div>
        <div class="anim-panel-body"     id="e2epanel-body">Press Play to trace a Netflix watch event through all 9 stages — from the user's device to the analytics dashboard.</div>
        <div class="anim-panel-facts"    id="e2epanel-facts"></div>`;
      left.appendChild(panel);

      /* Timing timeline */
      const timeTitle = _el('div', 'partition-section-title');
      timeTitle.style.marginTop = '1.25rem';
      timeTitle.textContent = 'Pipeline Timing';
      left.appendChild(timeTitle);

      const timeline = _el('div', 'e2e-timeline');
      timeline.id = 'e2e-timeline';
      TIMINGS.forEach(t => {
        const s = STAGES.find(s => s.id === t.stage);
        const row = _el('div', 'e2e-tl-row');
        row.id = `e2e-tl-${t.stage}`;
        row.style.setProperty('--e2e-tl-color', s?.color || '#29b5e8');
        row.innerHTML = `
          <span class="e2e-tl-dot"></span>
          <span class="e2e-tl-label">${t.label}</span>
          <span class="e2e-tl-time">${t.t}</span>`;
        timeline.appendChild(row);
      });
      left.appendChild(timeline);

      /* Right: metrics */
      const metricsTitle = _el('div', 'partition-section-title');
      metricsTitle.textContent = 'Pipeline Metrics';
      right.appendChild(metricsTitle);

      const metrics = _el('div', 'e2e-metrics');
      metrics.innerHTML = `
        <div class="e2e-metric"><div class="e2e-metric-val">1.4B</div><div class="e2e-metric-lbl">Events / Day</div></div>
        <div class="e2e-metric"><div class="e2e-metric-val">16K</div><div class="e2e-metric-lbl">Events / Sec</div></div>
        <div class="e2e-metric"><div class="e2e-metric-val">~3 min</div><div class="e2e-metric-lbl">Ingest Lag</div></div>
        <div class="e2e-metric"><div class="e2e-metric-val">~45 s</div><div class="e2e-metric-lbl">Query Return</div></div>
        <div class="e2e-metric"><div class="e2e-metric-val">238M</div><div class="e2e-metric-lbl">Subscribers</div></div>
        <div class="e2e-metric"><div class="e2e-metric-val">500B</div><div class="e2e-metric-lbl">Table Rows</div></div>`;
      right.appendChild(metrics);

      /* Architecture summary */
      const archTitle = _el('div', 'partition-section-title');
      archTitle.style.marginTop = '1.25rem';
      archTitle.textContent = 'Architecture Summary';
      right.appendChild(archTitle);

      const arch = _el('div', 'e2e-arch');
      [
        ['🔌', 'Kafka Snowflake Connector — continuous streaming ingest'],
        ['🔔', 'Snowpipe + SQS — near-real-time S3 file detection'],
        ['☁️', 'Cloud Services — always-on query orchestration layer'],
        ['⚡', 'XL Multi-cluster Warehouse — 16-node parallel scan'],
        ['🐍', 'Snowpark Python — ML feature engineering in-warehouse'],
        ['📊', 'Tableau JDBC — live dashboard at 60-second refresh'],
      ].forEach(([icon, text]) => {
        const row = _el('div', 'e2e-arch-row');
        row.innerHTML = `<span class="e2e-arch-icon">${icon}</span><span>${text}</span>`;
        arch.appendChild(row);
      });
      right.appendChild(arch);

      const ctx = { container: canvas, panel };
      const engine = new (AE())({ steps: _buildSteps(ctx), speed: 1 });
      engine.setContext(ctx);
      window.SnowflakeViz.AnimationControls.register(engine);

      return { destroy: () => engine.destroy() };
    },
  };

  function _activateStage(ctx, id) {
    ctx.container.querySelectorAll('.e2e-stage').forEach(el => el.classList.remove('e2e-active'));
    ctx.container.querySelectorAll('.e2e-arrow').forEach(el => el.classList.remove('e2e-arrow-active'));

    const idx = STAGES.findIndex(s => s.id === id);
    const el  = ctx.container.querySelector(`#e2e-stage-${id}`);
    if (el) el.classList.add('e2e-active');

    /* light up arrows leading up to and including this stage */
    for (let i = 0; i < idx; i++) {
      const arrow = ctx.container.querySelector(`#e2e-arrow-${i}`);
      if (arrow) arrow.classList.add('e2e-arrow-active');
    }

    /* timeline */
    ctx.container.querySelectorAll('.e2e-tl-row').forEach(el => el.classList.remove('e2e-tl-active', 'e2e-tl-done'));
    STAGES.forEach((s, i) => {
      const row = ctx.container.querySelector(`#e2e-tl-${s.id}`);
      if (!row) return;
      if (i < idx)       row.classList.add('e2e-tl-done');
      else if (i === idx) row.classList.add('e2e-tl-active');
    });
  }

  function _setPanel(ctx, step, title, body, facts = []) {
    const p = ctx.panel;
    if (!p) return;
    p.querySelector('#e2epanel-step').textContent  = step;
    p.querySelector('#e2epanel-title').textContent = title;
    p.querySelector('#e2epanel-body').innerHTML    = body;
    p.querySelector('#e2epanel-facts').innerHTML   = facts.map(f => `<div class="anim-panel-fact">${f}</div>`).join('');
    p.classList.add('highlighted');
  }

  function _resetAll(ctx) {
    ctx.container.querySelectorAll('.e2e-stage').forEach(el => el.classList.remove('e2e-active'));
    ctx.container.querySelectorAll('.e2e-arrow').forEach(el => el.classList.remove('e2e-arrow-active'));
    ctx.container.querySelectorAll('.e2e-tl-row').forEach(el => el.classList.remove('e2e-tl-active', 'e2e-tl-done'));
    ctx.panel?.classList.remove('highlighted');
  }

  function _buildSteps(ctx) {
    const F = AE().fnStep;
    const steps = [
      F('Overview', 'Full Netflix watch-event pipeline',
        c => {
          _resetAll(c);
          _setPanel(c, 'Step 1 of 10', 'End-to-End Pipeline Overview',
            'One Netflix watch event travels through 9 stages: from a subscriber\'s device, through Kafka and Snowpipe, into Cloud Services and a virtual warehouse, through Snowpark ML scoring, to a live Tableau dashboard — all within ~13 minutes.',
            [
              'Total pipeline latency: user event → dashboard update ~13 minutes',
              'Ingest bottleneck: Kafka micro-batch + Snowpipe lag ~2–3 minutes',
              'Query + ML: adds ~10 minutes for recommendation scoring pass',
              'Throughput: 1.4 billion events per day at up to 16K events/second',
            ]);
        }, _resetAll, 3000),
    ];

    STAGES.forEach((s, i) => {
      steps.push(F(s.name, s.desc,
        c => {
          _resetAll(c);
          _activateStage(c, s.id);
          _setPanel(c, `Step ${i + 2} of 10`, s.name, s.desc, s.facts);
        }, _resetAll, 3500));
    });

    return steps;
  }

  function _el(tag, cls) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    return el;
  }

  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Modules = window.SnowflakeViz.Modules || {};
  window.SnowflakeViz.Modules.e2eFlow = E2eFlowModule;
})();
