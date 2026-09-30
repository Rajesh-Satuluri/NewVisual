/* ============================================================
   Query Execution Module — full query lifecycle animation
   Traces Netflix's "top 10 titles this week" query from client
   submission through Cloud Services, ANALYTICS_WH, and cache.
   ============================================================ */

(function () {
  'use strict';

  const AE = () => window.SnowflakeViz.AnimationEngine;

  /* Pipeline stage definitions */
  const STAGES = [
    { id: 'client-send',  name: 'Client Submits Query',     layer: 'client',         detail: 'Tableau → ANALYTICS_WH via JDBC',          dur: '< 1 ms',  barPct: 2  },
    { id: 'parse',        name: 'Parse & Tokenize',         layer: 'cloud-services', detail: 'SQL → AST; syntax validation',               dur: '~2 ms',   barPct: 4  },
    { id: 'cache-check',  name: 'Result Cache Lookup',      layer: 'cloud-services', detail: 'Query hash → cache store check',             dur: '~1 ms',   barPct: 2  },
    { id: 'optimize',     name: 'Query Optimization',       layer: 'cloud-services', detail: 'Predicate push-down, join reorder, pruning',  dur: '~15 ms',  barPct: 20 },
    { id: 'dispatch',     name: 'Dispatch to Warehouse',    layer: 'cloud-services', detail: 'Execution plan → ANALYTICS_WH',              dur: '~3 ms',   barPct: 5  },
    { id: 'prune',        name: 'Partition Pruning',        layer: 'warehouse',      detail: 'Metadata scan: 182,500 → ~1,270 partitions',  dur: '~50 ms',  barPct: 40 },
    { id: 'scan',         name: 'Parallel Column Scan',     layer: 'warehouse',      detail: 'Nodes read columnar data from S3 in parallel', dur: '~1.8 s',  barPct: 90 },
    { id: 'aggregate',    name: 'Aggregate & Sort',         layer: 'warehouse',      detail: 'COUNT(*), AVG, GROUP BY, ORDER BY, LIMIT 10', dur: '~420 ms', barPct: 70 },
    { id: 'cache-store',  name: 'Store in Result Cache',    layer: 'cloud-services', detail: 'Result hash → 24-hr cache entry',            dur: '~5 ms',   barPct: 6  },
    { id: 'client-recv',  name: 'Client Receives Result',   layer: 'client',         detail: '10 rows returned to Tableau',                dur: '~2 ms',   barPct: 2  },
  ];

  const DEMO_QUERY = `-- Top 10 most-watched titles this week (ANALYTICS_WH)
SELECT
    m.TITLE,
    m.GENRE[0]::STRING          AS PRIMARY_GENRE,
    COUNT(*)                     AS WATCH_COUNT,
    ROUND(AVG(w.COMPLETION_PCT) * 100, 1) AS AVG_COMPLETION_PCT
FROM ENGAGEMENT_DB.EVENTS.WATCH_EVENTS  w
JOIN CONTENT_DB.PROCESSED.MOVIES        m ON w.MOVIE_ID = m.MOVIE_ID
WHERE w.WATCH_START >= DATEADD(\'day\', -7, CURRENT_DATE)
  AND w.DURATION_WATCHED >= 120   -- at least 2 minutes watched
GROUP BY 1, 2
ORDER BY WATCH_COUNT DESC
LIMIT 10;`;

  const QueryExecutionModule = {
    render(canvas, { data }) {
      canvas.innerHTML = '';

      const nd = data;
      const querySQL = (nd && nd.queries && nd.queries.topTitles) ? nd.queries.topTitles : DEMO_QUERY;

      const page = _el('div', 'qe-page');

      /* header */
      page.innerHTML = `
        <div class="mod-header">
          <div class="mod-eyebrow">Query & Data</div>
          <h1 class="mod-title">Query Execution Lifecycle</h1>
          <p class="mod-subtitle">Follow a single SQL query — Netflix\'s top-10 titles report — from Tableau submission through Cloud Services optimization, warehouse execution, and result caching. Press <strong>Play</strong> to trace it step by step.</p>
        </div>`;

      const layout = _el('div', 'qe-layout');
      const left  = _el('div', '');
      const right = _el('div', '');
      layout.appendChild(left);
      layout.appendChild(right);
      page.appendChild(layout);

      /* ── LEFT: query box + pipeline ── */
      const queryBox = _el('div', 'qe-query-box');
      queryBox.id = 'qe-query-box';
      queryBox.textContent = querySQL;
      left.appendChild(queryBox);

      const pipeline = _el('div', 'qe-pipeline');
      pipeline.id = 'qe-pipeline';
      STAGES.forEach((s, i) => {
        const stage = _el('div', 'qe-stage pending');
        stage.id = `qe-stage-${s.id}`;
        stage.style.setProperty('--stage-color', s.layer === 'warehouse' ? '#29b5e8' : s.layer === 'cloud-services' ? '#a371f7' : 'var(--text-muted)');
        stage.innerHTML = `
          <div class="qe-stage-num">${i + 1}</div>
          <div class="qe-stage-info">
            <div class="qe-stage-name">${s.name}</div>
            <div class="qe-stage-detail">${s.detail}</div>
          </div>
          <div class="qe-stage-layer ${s.layer}">${_layerLabel(s.layer)}</div>`;
        pipeline.appendChild(stage);
        if (i < STAGES.length - 1) {
          const conn = _el('div', 'qe-conn');
          conn.id = `qe-conn-${i}`;
          pipeline.appendChild(conn);
        }
      });
      left.appendChild(pipeline);

      /* ── RIGHT: info panel + timing ── */
      const panel = _el('div', 'anim-panel');
      panel.id = 'qe-panel';
      panel.innerHTML = `
        <div class="anim-panel-step-num" id="qpanel-step">Overview</div>
        <div class="anim-panel-title"    id="qpanel-title">Query Lifecycle</div>
        <div class="anim-panel-body"     id="qpanel-body">Press Play to trace the "top 10 titles" query through every layer of Snowflake — from Tableau to Cloud Services to ANALYTICS_WH and back.</div>
        <div class="anim-panel-facts"    id="qpanel-facts"></div>`;
      right.appendChild(panel);

      /* timing breakdown */
      const timing = _el('div', 'qe-timing');
      timing.id = 'qe-timing';
      timing.innerHTML = `<div class="qe-timing-title">Stage Timing</div>` +
        STAGES.map(s => `
          <div class="qe-timing-row pending" id="qtime-${s.id}">
            <span class="qe-timing-stage">${s.name}</span>
            <div class="qe-timing-bar-wrap"><div class="qe-timing-bar" style="width:0" data-pct="${s.barPct}"></div></div>
            <span class="qe-timing-dur">${s.dur}</span>
          </div>`).join('');
      right.appendChild(timing);

      canvas.appendChild(page);

      /* ── Engine ── */
      const ctx = { container: canvas, panel, pipeline };
      const engine = new (AE())({ steps: _buildSteps(ctx, STAGES), speed: 1 });
      engine.setContext(ctx);
      window.SnowflakeViz.AnimationControls.register(engine);

      return { destroy: () => engine.destroy() };
    },
  };

  /* ── Step helpers ────────────────────────────────────────── */

  function _setPanel(ctx, step, title, body, facts = []) {
    const p = ctx.panel;
    if (!p) return;
    p.querySelector('#qpanel-step').textContent = step;
    p.querySelector('#qpanel-title').textContent = title;
    p.querySelector('#qpanel-body').innerHTML = body;
    p.querySelector('#qpanel-facts').innerHTML = facts.map(f => `<div class="anim-panel-fact">${f}</div>`).join('');
    p.classList.add('highlighted');
  }

  function _activateStage(ctx, stageId, prevIds = []) {
    const c = ctx.container;

    /* mark previous complete */
    prevIds.forEach(id => {
      const el = c.querySelector(`#qe-stage-${id}`);
      if (el) { el.classList.remove('active', 'pending'); el.classList.add('complete'); }
      const timeRow = c.querySelector(`#qtime-${id}`);
      if (timeRow) {
        timeRow.classList.remove('active', 'pending');
        timeRow.classList.add('complete');
        const bar = timeRow.querySelector('.qe-timing-bar');
        if (bar) bar.style.width = bar.dataset.pct + '%';
      }
      /* activate connector after prev stage */
      const idx = STAGES.findIndex(s => s.id === id);
      const conn = c.querySelector(`#qe-conn-${idx}`);
      if (conn) conn.classList.add('active');
    });

    /* mark current active */
    const el = c.querySelector(`#qe-stage-${stageId}`);
    if (el) { el.classList.remove('pending', 'complete'); el.classList.add('active'); }
    const timeRow = c.querySelector(`#qtime-${stageId}`);
    if (timeRow) { timeRow.classList.remove('pending', 'complete'); timeRow.classList.add('active'); }

    /* scroll stage into view if needed */
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function _resetAll(ctx) {
    ctx.container.querySelectorAll('.qe-stage').forEach(el => {
      el.classList.remove('active', 'complete'); el.classList.add('pending');
    });
    ctx.container.querySelectorAll('.qe-conn').forEach(el => el.classList.remove('active'));
    ctx.container.querySelectorAll('.qe-timing-row').forEach(el => {
      el.classList.remove('active', 'complete'); el.classList.add('pending');
    });
    ctx.container.querySelectorAll('.qe-timing-bar').forEach(el => el.style.width = '0');
    ctx.container.querySelector('#qe-query-box')?.classList.remove('active');
    ctx.panel?.classList.remove('highlighted');
  }

  /* ── Build all animation steps ───────────────────────────── */
  function _buildSteps(ctx) {
    const F = AE().fnStep;

    const prev = (upTo) => STAGES.slice(0, upTo).map(s => s.id);

    return [
      F('Client Submits', 'Tableau sends SQL to Snowflake',
        (c) => {
          _resetAll(c);
          c.container.querySelector('#qe-query-box')?.classList.add('active');
          _activateStage(c, 'client-send', []);
          _setPanel(c,
            'Step 1 of 10',
            'Client Submits Query',
            'The Finance team\'s Tableau dashboard fires a JDBC connection to ANALYTICS_WH and submits the top-10 titles SQL. The query travels to Snowflake\'s Cloud Services layer.',
            [
              'Connection pool maintains persistent JDBC sessions — no handshake overhead',
              'Query is sent as a text string; compilation happens server-side',
              'Client specifies: ANALYTICS_WH, ENGAGEMENT_DB, role=ANALYTICS_ROLE',
              'Snowflake generates a query ID for tracking and Time Travel reference',
            ]
          );
        },
        _resetAll,
        3000
      ),

      F('Parse & Tokenize', 'Cloud Services builds the AST',
        (c) => {
          _resetAll(c);
          c.container.querySelector('#qe-query-box')?.classList.add('active');
          _activateStage(c, 'parse', prev(1));
          _setPanel(c,
            'Step 2 of 10',
            'Parse & Tokenize — Cloud Services',
            'Cloud Services parses the SQL into tokens and builds an Abstract Syntax Tree. Syntax errors are caught here — before any warehouse resources are used.',
            [
              'Full Snowflake SQL dialect support: QUALIFY, FLATTEN, VARIANT ops, semi-structured functions',
              'Syntax error on a 500B-row query costs zero compute credits',
              'AST is the input to the query optimizer',
              'Parsing is extremely fast (~2ms) — bottleneck is never here',
            ]
          );
        },
        _resetAll,
        3000
      ),

      F('Result Cache Check', 'Has this exact query run in the last 24 hours?',
        (c) => {
          _resetAll(c);
          c.container.querySelector('#qe-query-box')?.classList.add('active');
          _activateStage(c, 'cache-check', prev(2));
          _setPanel(c,
            'Step 3 of 10',
            'Result Cache Lookup — Cache Miss',
            'Cloud Services hashes the query text and checks the account-wide Result Cache. This is a first run today → cache miss. The query proceeds to optimization.',
            [
              'Cache key: hash of normalized query text + database/schema context',
              'Cache hit: result returned instantly, zero warehouse credits consumed',
              'Cache miss (this case): proceed to optimizer → dispatch → warehouse',
              'Netflix daily standup query runs 50× per morning — only first run costs credits',
            ]
          );
        },
        _resetAll,
        3000
      ),

      F('Query Optimization', 'Cloud Services rewrites and plans the query',
        (c) => {
          _resetAll(c);
          c.container.querySelector('#qe-query-box')?.classList.add('active');
          _activateStage(c, 'optimize', prev(3));
          _setPanel(c,
            'Step 4 of 10',
            'Query Optimization',
            'Snowflake\'s cost-based optimizer rewrites the query for maximum efficiency — pushing filters down, choosing the join strategy, and generating a physical execution plan.',
            [
              'Predicate push-down: WATCH_START >= DATEADD(-7d) applied before the JOIN',
              'Join order selection: smaller filtered set drives the JOIN probe side',
              'Partition pruning plan: metadata says only ~1,270 of 182,500 partitions needed',
              'Column pruning: optimizer identifies exactly which columns leave storage',
            ]
          );
        },
        _resetAll,
        3000
      ),

      F('Dispatch to Warehouse', 'Execution plan sent to ANALYTICS_WH',
        (c) => {
          _resetAll(c);
          _activateStage(c, 'dispatch', prev(4));
          _setPanel(c,
            'Step 5 of 10',
            'Dispatch to ANALYTICS_WH',
            'Cloud Services sends the optimized execution plan to ANALYTICS_WH. If the warehouse is suspended, auto-resume fires here. Credits begin accruing once the cluster is running.',
            [
              'Execution plan includes: partition list, column projections, node assignments',
              'Each cluster node receives its subset of work (partitions to scan)',
              'ANALYTICS_WH: Large, up to 6 clusters — today running 1 cluster',
              'Credits clock starts now: 8 credits/hr for a Large single-cluster warehouse',
            ]
          );
        },
        _resetAll,
        3000
      ),

      F('Partition Pruning', '182,500 partitions → ~1,270 partitions',
        (c) => {
          _resetAll(c);
          _activateStage(c, 'prune', prev(5));
          _setPanel(c,
            'Step 6 of 10',
            'Partition Pruning — 99.3% of WATCH_EVENTS Skipped',
            'Each cluster node consults Cloud Services\' metadata: which WATCH_EVENTS partitions have maxDate ≥ 7 days ago? 181,230 partitions are eliminated before a single byte is read.',
            [
              'WATCH_EVENTS clustered by WATCH_START::DATE → time-range queries are extremely effective',
              '182,500 total partitions → ~1,270 contain last-7-days data',
              '99.3% of the 180 TB table is never touched by this query',
              'Metadata lookup happens inside Cloud Services — warehouse nodes don\'t pay for it',
            ]
          );
        },
        _resetAll,
        3500
      ),

      F('Parallel Column Scan', 'Warehouse nodes read S3 in parallel',
        (c) => {
          _resetAll(c);
          _activateStage(c, 'scan', prev(6));
          _setPanel(c,
            'Step 7 of 10',
            'Parallel Column Scan Across Nodes',
            'ANALYTICS_WH nodes each read their assigned partitions from S3 — columnar format means only MOVIE_ID, WATCH_START, DURATION_WATCHED, COMPLETION_PCT are fetched. Seven other columns are never read.',
            [
              'Node parallelism: Large warehouse = 8 nodes reading ~159 partitions each',
              'Columnar projection: 4 of 12 columns in WATCH_EVENTS loaded (67% column I/O saved)',
              'ZSTD-compressed blocks decoded on-node — no decryption needed (transparent)',
              'Remote disk cache: recently-read partition blocks may be in warm node-local SSD',
            ]
          );
        },
        _resetAll,
        4000
      ),

      F('Aggregate & Sort', 'COUNT, AVG, GROUP BY, ORDER BY, LIMIT',
        (c) => {
          _resetAll(c);
          _activateStage(c, 'aggregate', prev(7));
          _setPanel(c,
            'Step 8 of 10',
            'Aggregation, Sorting, JOIN',
            'Each node performs local aggregation (partial COUNT, partial SUM for AVG). Then a single node shuffles and merges partial results, sorts by WATCH_COUNT DESC, and cuts to LIMIT 10.',
            [
              'JOIN: WATCH_EVENTS.MOVIE_ID → MOVIES (17K rows) — small table broadcast to all nodes',
              'Two-phase aggregation: local partial aggregates → global merge (far less data shuffled)',
              'ORDER BY WATCH_COUNT DESC LIMIT 10 → top-N heap, O(n) not full sort',
              'Result: 10 rows, ~320 bytes — remarkably small given 500B rows scanned',
            ]
          );
        },
        _resetAll,
        3500
      ),

      F('Result Cache Store', 'Cloud Services caches the result for 24 hours',
        (c) => {
          _resetAll(c);
          _activateStage(c, 'cache-store', prev(8));
          _setPanel(c,
            'Step 9 of 10',
            'Result Stored in Cache',
            'The 10-row result is returned to Cloud Services, which stores it under the query hash. For the next 24 hours, any user running the identical query gets the result for free — zero warehouse credits.',
            [
              'Cache entry: 24-hour TTL, invalidated if underlying tables change',
              'Cache is account-wide and user-agnostic — 50 analysts share the same cache hit',
              'Netflix daily top-titles dashboard: after first run, subsequent 49 refreshes cost $0',
              'Estimated daily savings on ANALYTICS_WH: 30–40% credit reduction from cache alone',
            ]
          );
        },
        _resetAll,
        3500
      ),

      F('Result Returned', 'Tableau receives 10 rows in ~2.3 seconds total',
        (c) => {
          _resetAll(c);
          _activateStage(c, 'client-recv', prev(9));
          _setPanel(c,
            'Step 10 of 10',
            'Query Complete — 10 Rows Returned',
            'The 10 results travel back through Cloud Services to Tableau\'s JDBC connection. End-to-end elapsed time: ~2.3 seconds for a query touching 500 billion rows.',
            [
              'Total query time: ~2.3s (dominated by parallel S3 scan: ~1.8s)',
              'Netflix at scale: 80M daily recommendations run against tables of this size',
              'Repeat run (cache hit): < 50ms, 0 credits consumed',
              'If ANALYTICS_WH was auto-suspended: add ~3s resume time to first run',
            ]
          );
        },
        _resetAll,
        4000
      ),
    ];
  }

  /* ── Helpers ─────────────────────────────────────────────── */
  function _layerLabel(layer) {
    return { 'cloud-services': 'Cloud Services', 'warehouse': 'Virtual Warehouse', 'client': 'Client' }[layer] || layer;
  }

  function _el(tag, cls) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    return el;
  }

  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Modules = window.SnowflakeViz.Modules || {};
  window.SnowflakeViz.Modules.queryExecution = QueryExecutionModule;
})();
