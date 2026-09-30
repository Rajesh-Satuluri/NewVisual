/* ============================================================
   Data Loading Module — Snowpipe, COPY INTO, Kafka Connector
   Netflix: 1.4B watch events/day ingestion animation
   ============================================================ */

(function () {
  'use strict';

  const AE = () => window.SnowflakeViz.AnimationEngine;

  const SNOWPIPE_SQL = `-- Snowpipe: auto-ingest from S3 event notifications
CREATE OR REPLACE PIPE EVENTS_DB.PUBLIC.watch_events_pipe
  AUTO_INGEST = TRUE
AS
COPY INTO EVENTS_DB.RAW.WATCH_EVENTS
FROM @EVENTS_DB.PUBLIC.s3_stage/watch_events/
FILE_FORMAT = (TYPE = 'PARQUET')
MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE;

-- Check pipe lag
SELECT SYSTEM$PIPE_STATUS('watch_events_pipe');`;

  const COPY_SQL = `-- COPY INTO: bulk historical backfill (3 years)
COPY INTO EVENTS_DB.RAW.WATCH_EVENTS
FROM @EVENTS_DB.PUBLIC.s3_stage/historical/
FILE_FORMAT = (
  TYPE = 'PARQUET'
  SNAPPY_COMPRESSION = TRUE
)
PATTERN = '.*watch_events_202[0-3].*\\.parquet'
ON_ERROR = 'CONTINUE'
PURGE = FALSE;

-- Audit load history
SELECT * FROM TABLE(INFORMATION_SCHEMA.COPY_HISTORY(
  TABLE_NAME => 'WATCH_EVENTS',
  START_TIME => DATEADD('hours', -2, CURRENT_TIMESTAMP)
));`;

  const KAFKA_SQL = `// Kafka Connector config (kafka-connect-snowflake)
{
  "name": "snowflake-watch-events",
  "connector.class":
    "com.snowflake.kafka.connector.SnowflakeSinkConnector",
  "tasks.max": "16",
  "topics": "watch-events-prod",
  "snowflake.database.name": "EVENTS_DB",
  "snowflake.schema.name": "STREAMING",
  "snowflake.table.name": "WATCH_EVENTS_STREAM",
  "snowflake.ingestion.method": "SNOWPIPE_STREAMING",
  "buffer.flush.time": "5",
  "buffer.count.records": "10000"
}`;

  const DataLoadingModule = {
    render(canvas) {
      canvas.innerHTML = '';

      const wrap = _el('div', 'dl-page');
      canvas.appendChild(wrap);

      const hdr = _el('div', 'mod-header');
      hdr.innerHTML = `
        <div class="mod-eyebrow">Query &amp; Data</div>
        <h1 class="mod-title">Data Loading</h1>
        <p class="mod-subtitle">Netflix ingests 1.4 billion watch events daily into Snowflake using three complementary loading strategies for different latency and throughput requirements.</p>`;
      wrap.appendChild(hdr);

      const layout = _el('div', 'dl-layout');
      wrap.appendChild(layout);

      const left  = _el('div', 'dl-left');
      const right = _el('div', 'dl-right');
      layout.appendChild(left);
      layout.appendChild(right);

      /* ── Method selector tabs ── */
      const tabsTitle = _el('div', 'partition-section-title');
      tabsTitle.textContent = 'Ingestion Method';
      left.appendChild(tabsTitle);

      const tabs = _el('div', 'dl-method-tabs');
      tabs.id = 'dl-tabs';
      [
        { id: 'snowpipe', label: '⚡ Snowpipe',       color: '#29b5e8', sub: 'Micro-batch · ~45s latency' },
        { id: 'copy',     label: '📦 COPY INTO',      color: '#a371f7', sub: 'Bulk load · minutes' },
        { id: 'kafka',    label: '🌊 Kafka Connector', color: '#3fb950', sub: 'Streaming · < 5s' },
      ].forEach(m => {
        const btn = _el('div', 'dl-method-tab');
        btn.dataset.method = m.id;
        btn.style.setProperty('--tab-color', m.color);
        btn.innerHTML = `<span class="dl-tab-label">${m.label}</span><span class="dl-tab-sub">${m.sub}</span>`;
        tabs.appendChild(btn);
      });
      left.appendChild(tabs);

      /* ── Pipeline diagram ── */
      const pipeTitle = _el('div', 'partition-section-title');
      pipeTitle.style.marginTop = '1.5rem';
      pipeTitle.textContent = 'Ingestion Pipeline';
      left.appendChild(pipeTitle);

      const pipeRow = _el('div', 'dl-pipe-row');
      pipeRow.id = 'dl-pipe-row';
      const NODES = [
        { id: 'source',  label: 'Source',         sub: 'S3 / Kafka', icon: '☁️' },
        { id: 'stage',   label: 'Stage',           sub: 'External / Int.', icon: '🗂️' },
        { id: 'ingest',  label: 'Ingest Engine',   sub: 'Snowpipe / WH', icon: '⚙️' },
        { id: 'table',   label: 'Target Table',    sub: 'WATCH_EVENTS', icon: '🗄️' },
      ];
      NODES.forEach((n, idx) => {
        const node = _el('div', 'dl-pipe-node');
        node.id = `dl-node-${n.id}`;
        node.innerHTML = `
          <div class="dl-node-icon">${n.icon}</div>
          <div class="dl-node-label">${n.label}</div>
          <div class="dl-node-sub">${n.sub}</div>`;
        pipeRow.appendChild(node);
        if (idx < NODES.length - 1) {
          const arr = _el('div', 'dl-pipe-arrow');
          arr.id = `dl-arr-${n.id}`;
          arr.innerHTML = `<div class="dl-arrow-inner"><div class="dl-arrow-line"></div><span class="dl-arrow-tip">▶</span></div>`;
          pipeRow.appendChild(arr);
        }
      });
      left.appendChild(pipeRow);

      /* ── Status + metrics ── */
      const statusBar = _el('div', 'dl-status-bar');
      statusBar.id = 'dl-status';
      statusBar.innerHTML = `<span class="dl-status-dot" id="dl-sdot"></span><span id="dl-stext">Idle — select a method and press Play</span>`;
      left.appendChild(statusBar);

      const metricsTitle = _el('div', 'partition-section-title');
      metricsTitle.style.marginTop = '1.5rem';
      metricsTitle.textContent = 'Ingestion Metrics';
      left.appendChild(metricsTitle);

      const metrics = _el('div', 'dl-metrics');
      metrics.id = 'dl-metrics';
      metrics.innerHTML = `
        <div class="dl-metric"><div class="dl-metric-val" id="dlm-files">—</div><div class="dl-metric-lbl">Files / Batches</div></div>
        <div class="dl-metric"><div class="dl-metric-val" id="dlm-rows">—</div><div class="dl-metric-lbl">Rows Ingested</div></div>
        <div class="dl-metric"><div class="dl-metric-val" id="dlm-latency">—</div><div class="dl-metric-lbl">Avg Latency</div></div>
        <div class="dl-metric"><div class="dl-metric-val" id="dlm-credits">—</div><div class="dl-metric-lbl">Credits</div></div>`;
      left.appendChild(metrics);

      /* ── Right: anim panel + SQL ── */
      const panel = _el('div', 'anim-panel');
      panel.id = 'dl-panel';
      panel.innerHTML = `
        <div class="anim-panel-step-num" id="dlpanel-step">Overview</div>
        <div class="anim-panel-title"    id="dlpanel-title">Data Loading Methods</div>
        <div class="anim-panel-body"     id="dlpanel-body">Press Play to explore how Netflix loads 1.4B daily watch events using Snowpipe, COPY INTO, and the Kafka Connector.</div>
        <div class="anim-panel-facts"    id="dlpanel-facts"></div>`;
      right.appendChild(panel);

      const sqlTitle = _el('div', 'partition-section-title');
      sqlTitle.style.marginTop = '1.5rem';
      sqlTitle.textContent = 'Example SQL / Config';
      right.appendChild(sqlTitle);

      const sqlBox = _el('div', 'storage-query-box');
      sqlBox.id = 'dl-sql';
      sqlBox.style.minHeight = '150px';
      sqlBox.style.whiteSpace = 'pre';
      sqlBox.textContent = '-- Select a method to see its SQL';
      right.appendChild(sqlBox);

      /* ── Engine ── */
      const ctx = { container: canvas, panel };
      const engine = new (AE())({ steps: _buildSteps(ctx), speed: 1 });
      engine.setContext(ctx);
      window.SnowflakeViz.AnimationControls.register(engine);

      return { destroy: () => engine.destroy() };
    },
  };

  /* ── Helpers ── */
  function _setPanel(ctx, step, title, body, facts = []) {
    const p = ctx.panel;
    if (!p) return;
    p.querySelector('#dlpanel-step').textContent  = step;
    p.querySelector('#dlpanel-title').textContent = title;
    p.querySelector('#dlpanel-body').innerHTML    = body;
    p.querySelector('#dlpanel-facts').innerHTML   = facts.map(f => `<div class="anim-panel-fact">${f}</div>`).join('');
    p.classList.add('highlighted');
  }

  function _resetState(ctx) {
    ctx.container.querySelectorAll('.dl-pipe-node').forEach(el => el.classList.remove('dl-active', 'dl-complete', 'dl-streaming'));
    ctx.container.querySelectorAll('.dl-pipe-arrow').forEach(el => el.classList.remove('dl-active', 'dl-flowing'));
    ctx.container.querySelectorAll('.dl-method-tab').forEach(el => el.classList.remove('active'));
    ctx.panel?.classList.remove('highlighted');
    _status(ctx, '', 'Idle');
  }

  function _tab(ctx, id) {
    ctx.container.querySelectorAll('.dl-method-tab').forEach(el => el.classList.toggle('active', el.dataset.method === id));
  }

  function _node(ctx, id, state) {
    const el = ctx.container.querySelector(`#dl-node-${id}`);
    if (el) { el.classList.remove('dl-active', 'dl-complete', 'dl-streaming'); el.classList.add(`dl-${state}`); }
  }

  function _arrow(ctx, fromId, state) {
    const el = ctx.container.querySelector(`#dl-arr-${fromId}`);
    if (el) { el.classList.remove('dl-active', 'dl-flowing'); el.classList.add(`dl-${state}`); }
  }

  function _status(ctx, state, text) {
    const dot  = ctx.container.querySelector('#dl-sdot');
    const txt  = ctx.container.querySelector('#dl-stext');
    if (dot) dot.className = `dl-status-dot${state ? ' ' + state : ''}`;
    if (txt) txt.textContent = text;
  }

  function _metrics(ctx, files, rows, latency, credits) {
    const s = (id, v) => { const e = ctx.container.querySelector('#' + id); if (e) e.textContent = v; };
    s('dlm-files', files);
    s('dlm-rows', rows);
    s('dlm-latency', latency);
    s('dlm-credits', credits);
  }

  function _sql(ctx, code) {
    const el = ctx.container.querySelector('#dl-sql');
    if (el) { el.textContent = code; el.classList.add('active'); }
  }

  function _buildSteps(ctx) {
    const F = AE().fnStep;
    return [
      F('Loading Methods', 'Three strategies for different latency profiles',
        c => {
          _resetState(c);
          _setPanel(c, 'Step 1 of 9', 'Three Data Loading Strategies',
            'Snowflake supports three primary ingestion patterns. <strong>Snowpipe</strong> (micro-batch, ~45s latency), <strong>COPY INTO</strong> (bulk batch, minutes to hours), and <strong>Kafka Connector</strong> with Snowpipe Streaming (< 5s). Netflix uses all three.',
            [
              'Snowpipe: S3/GCS event notifications trigger micro-batch loads',
              'COPY INTO: warehouse-based bulk loading for large historical datasets',
              'Kafka Connector: Snowpipe Streaming API for near-realtime ingestion',
              'Netflix uses Kafka for live events, Snowpipe for regional files, COPY for backfills',
            ]);
        }, _resetState, 3000),

      F('Snowpipe — File in S3', 'Watch event Parquet files land in S3',
        c => {
          _resetState(c);
          _tab(c, 'snowpipe');
          _node(c, 'source', 'active');
          _sql(c, SNOWPIPE_SQL);
          _status(c, 'loading', 'Snowpipe — S3 event detected, SQS notification fired');
          _metrics(c, '0 / ~1,440', '0', '~45s avg', '0.06/1K files');
          _setPanel(c, 'Step 2 of 9', 'S3 Event → SQS → Snowpipe',
            'Every 60 seconds Netflix streaming services write ~1M rows as Parquet to S3 (one file per region per minute). S3 fires an SQS event notification that Snowpipe listens to automatically.',
            [
              '~1,440 Parquet files per region per day (~1M rows each)',
              'File size: ~128 MB compressed Parquet (Snappy codec)',
              'S3 PUT event → SQS queue → Snowpipe listener (no polling needed)',
              'AUTO_INGEST = TRUE: Snowpipe subscribes to the SQS queue automatically',
            ]);
        }, _resetState, 3500),

      F('Snowpipe — Stage Read', 'Files referenced from external S3 stage',
        c => {
          _resetState(c);
          _tab(c, 'snowpipe');
          _node(c, 'source', 'complete');
          _arrow(c, 'source', 'flowing');
          _node(c, 'stage', 'active');
          _sql(c, SNOWPIPE_SQL);
          _status(c, 'loading', 'Snowpipe — reading batch from external stage…');
          _metrics(c, '12', '12M', '—', '0.02');
          _setPanel(c, 'Step 3 of 9', 'External Stage — No Data Movement',
            'Snowpipe reads the Parquet file directly from the external S3 stage. There is no copy into Snowflake storage first — Snowpipe reads the S3 bytes in place via the stage definition.',
            [
              'External stage: @EVENTS_DB.PUBLIC.s3_stage (points to S3 bucket + prefix)',
              'No data copied into Snowflake-managed storage — reads S3 in place',
              'MATCH_BY_COLUMN_NAME: Parquet column names auto-mapped to table columns',
              '12 files queued in this batch = ~12M rows, ~1.5 GB compressed',
            ]);
        }, _resetState, 3500),

      F('Snowpipe — Ingest', 'Serverless engine transforms and writes rows',
        c => {
          _resetState(c);
          _tab(c, 'snowpipe');
          _node(c, 'source', 'complete');
          _node(c, 'stage',  'complete');
          _arrow(c, 'source', 'flowing');
          _arrow(c, 'stage',  'flowing');
          _node(c, 'ingest', 'streaming');
          _sql(c, SNOWPIPE_SQL);
          _status(c, 'streaming', 'Snowpipe — ingesting rows into micro-partitions…');
          _metrics(c, '12', '12M', '~40s so far', '0.06');
          _setPanel(c, 'Step 4 of 9', 'Serverless Ingest Engine — No Warehouse Needed',
            'Snowpipe\'s serverless compute converts Parquet columns into Snowflake\'s internal columnar format and writes new micro-partitions. No virtual warehouse credit is used — billed per file.',
            [
              'Serverless: Snowflake manages compute automatically — no WH credits',
              'Billing: ~0.06 credits per 1,000 files (much cheaper than warehouse)',
              '12 files → ~96 new micro-partitions in WATCH_EVENTS (8 per file)',
              'Load completes 30–90 seconds after SQS notification received',
            ]);
        }, _resetState, 4000),

      F('Snowpipe — Committed', 'ACID commit to WATCH_EVENTS',
        c => {
          _resetState(c);
          _tab(c, 'snowpipe');
          _node(c, 'source', 'complete');
          _node(c, 'stage',  'complete');
          _node(c, 'ingest', 'complete');
          _arrow(c, 'source', 'active');
          _arrow(c, 'stage',  'active');
          _arrow(c, 'ingest', 'flowing');
          _node(c, 'table', 'active');
          _sql(c, SNOWPIPE_SQL);
          _status(c, 'done', 'Snowpipe — batch committed ✓');
          _metrics(c, '12', '12M', '45s', '0.08');
          _setPanel(c, 'Step 5 of 9', 'ACID Commit — 12M Rows Visible to Queries',
            '12M rows committed to EVENTS_DB.RAW.WATCH_EVENTS in a single ACID transaction. Queries see a consistent snapshot — no partial file reads. Result Cache for WATCH_EVENTS is automatically invalidated.',
            [
              '12,000,000 rows added → 96 new micro-partitions created',
              'ACID guarantee: all-or-nothing commit, no partial loads visible',
              'Result Cache invalidated for all queries on WATCH_EVENTS',
              'COPY_HISTORY updated — tracks file ETag, rows, errors, duration',
            ]);
        }, _resetState, 4000),

      F('COPY INTO — Start', 'Historical backfill: 3 years of data',
        c => {
          _resetState(c);
          _tab(c, 'copy');
          _node(c, 'source', 'active');
          _sql(c, COPY_SQL);
          _status(c, 'loading', 'COPY INTO — warehouse-based bulk load starting…');
          _metrics(c, '0 / 1,440', '0', '~8min total', '32 (4XL WH)');
          _setPanel(c, 'Step 6 of 9', 'COPY INTO — Bulk Historical Backfill',
            'Netflix migrated 3 years of watch history into Snowflake using COPY INTO. Unlike Snowpipe, COPY INTO requires an active virtual warehouse. Pattern matching selects only 2020–2023 Parquet files.',
            [
              'COPY INTO requires an active virtual warehouse (billed per second)',
              'PATTERN: regex filters which S3 files to load — watch_events_202[0-3]',
              'ON_ERROR = CONTINUE: skips corrupted files and logs errors in COPY_HISTORY',
              'Total load: ~2 TB compressed Parquet → ~180 TB logical in Snowflake',
            ]);
        }, _resetState, 3500),

      F('COPY INTO — Parallel', '16-node warehouse distributes files',
        c => {
          _resetState(c);
          _tab(c, 'copy');
          _node(c, 'source', 'complete');
          _arrow(c, 'source', 'flowing');
          _node(c, 'stage', 'active');
          _arrow(c, 'stage', 'flowing');
          _node(c, 'ingest', 'active');
          _arrow(c, 'ingest', 'flowing');
          _node(c, 'table', 'active');
          _sql(c, COPY_SQL);
          _status(c, 'streaming', 'COPY INTO — 16 nodes processing ~90 files each in parallel…');
          _metrics(c, '1,440', '1.44B', '~8min', '32');
          _setPanel(c, 'Step 7 of 9', '16 Nodes × 90 Files — Maximum Parallelism',
            'COPY INTO distributes files across all 16 warehouse nodes in the 4XL warehouse. Each node processes ~90 files in parallel. Safe to retry — Snowflake tracks loaded files by S3 ETag and skips duplicates.',
            [
              '4XL warehouse: 16 nodes, each handles ~90 Parquet files',
              '1,440 files × ~1M rows = 1.44B rows loaded in ~8 minutes',
              'File deduplication: Snowflake tracks loaded ETags — retry is always safe',
              'PURGE = FALSE: files stay in S3 after load (enables replay if needed)',
            ]);
        }, _resetState, 4000),

      F('Kafka Connector — Streaming', 'Sub-5-second latency via Snowpipe Streaming',
        c => {
          _resetState(c);
          _tab(c, 'kafka');
          _node(c, 'source', 'streaming');
          _arrow(c, 'source', 'flowing');
          _node(c, 'stage', 'streaming');
          _arrow(c, 'stage', 'flowing');
          _node(c, 'ingest', 'streaming');
          _arrow(c, 'ingest', 'flowing');
          _node(c, 'table', 'streaming');
          _sql(c, KAFKA_SQL);
          _status(c, 'streaming', 'Kafka Connector — live streaming at ~16K rows/sec…');
          _metrics(c, '∞ (streaming)', '~16K rows/sec', '< 5s end-to-end', 'serverless');
          _setPanel(c, 'Step 8 of 9', 'Kafka Connector — Snowpipe Streaming API',
            'The Kafka Connector v2.0 uses the Snowpipe Streaming API for row-level rather than file-level ingestion. 16 consumer tasks flush to Snowflake every 5 seconds or 10,000 records — whichever comes first.',
            [
              '16 Kafka consumer tasks → 16 parallel Snowpipe Streaming channels',
              'Buffer flush: 5s OR 10K records — rows committed at sub-second granularity',
              'Snowpipe Streaming: row-level ingestion, no file staging needed',
              'Netflix real-time recommendation engine reads from WATCH_EVENTS_STREAM',
            ]);
        }, _resetState, 4000),

      F('Load Monitoring', 'COPY_HISTORY, pipe status, and alerting',
        c => {
          _resetState(c);
          _status(c, 'done', 'All ingestion pipelines healthy ✓');
          _metrics(c, '1,440 files/day', '1.4B rows/day', '< 60s avg', '~120 credits/day');
          _setPanel(c, 'Step 9 of 9', 'Monitoring All Three Ingestion Paths',
            'Netflix monitors ingestion health using COPY_HISTORY, SYSTEM$PIPE_STATUS, and Kafka consumer lag metrics. Automated alerts fire if any pipeline falls > 5 minutes behind the expected ingestion rate.',
            [
              'COPY_HISTORY: file-level audit — status, rows loaded, errors, duration',
              'SYSTEM$PIPE_STATUS: returns JSON with lag seconds, credits, pending files',
              'Kafka: consumer group lag < 60s target for real-time recommendations',
              'Step Functions + Lambda: retry logic for failed Snowpipe or COPY files',
            ]);
        }, _resetState, 4000),
    ];
  }

  function _el(tag, cls) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    return el;
  }

  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Modules = window.SnowflakeViz.Modules || {};
  window.SnowflakeViz.Modules.dataLoading = DataLoadingModule;
})();
