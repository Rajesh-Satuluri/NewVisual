/* ============================================================
   Advanced Features Module — Time Travel, Zero-Copy Clone,
   Data Sharing, Snowpark, Dynamic Tables, Iceberg, Cortex AI
   ============================================================ */

(function () {
  'use strict';

  const AE = () => window.SnowflakeViz.AnimationEngine;

  const FEATURES = [
    {
      id: 'timetravel',
      icon: '⏪',
      name: 'Time Travel',
      color: '#29b5e8',
      tagline: 'Query historical data up to 90 days back',
      desc: 'Snowflake stores a historical version of every row changed by DML. You can query any point in time using AT(TIMESTAMP), AT(OFFSET), or AT(STATEMENT). Netflix uses Time Travel to replay failed Snowpipe loads and investigate data quality issues without impacting production.',
      sql: `-- Query data exactly 1 hour ago
SELECT COUNT(*) AS events_1hr_ago
FROM EVENTS_DB.RAW.WATCH_EVENTS
AT(OFFSET => -3600);

-- Recover rows deleted by accident
INSERT INTO WATCH_EVENTS
SELECT * FROM WATCH_EVENTS
BEFORE(STATEMENT => '<query_id>');

-- Undrop a dropped table (up to retention window)
UNDROP TABLE EVENTS_DB.RAW.WATCH_EVENTS;`,
      facts: [
        'Retention: 0–90 days (Enterprise+), 0–1 day (Standard)',
        'Uses metadata pointers — no data duplication cost',
        'UNDROP TABLE / SCHEMA / DATABASE for recovery',
        'Netflix: Time Travel for Snowpipe replay & data lineage',
      ],
    },
    {
      id: 'clone',
      icon: '🔬',
      name: 'Zero-Copy Clone',
      color: '#3fb950',
      tagline: 'Clone tables/schemas/databases without copying data',
      desc: 'Zero-Copy Cloning creates an exact clone by copying only metadata pointers — no data is duplicated. The clone and original share the same micro-partitions until either is modified (copy-on-write). Netflix uses clones to create dev/staging environments from production in seconds.',
      sql: `-- Clone production DB for staging (instant, ~0 cost)
CREATE DATABASE EVENTS_DB_STAGING
CLONE EVENTS_DB;

-- Clone a table at a specific point in time
CREATE TABLE WATCH_EVENTS_EXPERIMENT
CLONE EVENTS_DB.RAW.WATCH_EVENTS
AT(OFFSET => -86400);

-- Clones inherit: masking policies, row access policies, grants
-- Storage cost: only modifications to clone (copy-on-write)`,
      facts: [
        'Instant: cloning 500B-row table takes < 1 second',
        'Storage: only modifications to clone incur storage cost',
        'Dev/staging: Netflix creates 5+ environment clones daily',
        'Clone inherits: masking policies, row access policies, grants',
      ],
    },
    {
      id: 'sharing',
      icon: '🔗',
      name: 'Secure Data Sharing',
      color: '#a371f7',
      tagline: 'Share live data across accounts with zero data movement',
      desc: 'Data Sharing lets you share databases, schemas, tables, or views to other Snowflake accounts with zero data movement. The consumer reads directly from the provider\'s storage. Netflix uses sharing to give content partners real-time performance metrics on their titles.',
      sql: `-- Provider: create a share
CREATE SHARE CONTENT_PARTNER_SHARE;
GRANT USAGE ON DATABASE ANALYTICS_DB
  TO SHARE CONTENT_PARTNER_SHARE;
GRANT SELECT ON ANALYTICS_DB.REPORTING.CONTENT_PERF
  TO SHARE CONTENT_PARTNER_SHARE;

-- Add consumer account
ALTER SHARE CONTENT_PARTNER_SHARE
  ADD ACCOUNTS = partner_account;

-- Consumer: mount the share (read-only, zero data copy)
CREATE DATABASE NETFLIX_PARTNER_DATA
FROM SHARE netflix_account.CONTENT_PARTNER_SHARE;`,
      facts: [
        'Zero data movement: consumer reads provider S3 directly',
        'Real-time: consumer always sees the latest data',
        'Billing: consumer pays their own query compute costs',
        'Netflix: shares content performance with 50+ studio partners',
      ],
    },
    {
      id: 'snowpark',
      icon: '🐍',
      name: 'Snowpark',
      color: '#f97316',
      tagline: 'Push-down Python/Scala/Java to Snowflake compute',
      desc: 'Snowpark lets data engineers and data scientists write Python, Scala, or Java code that runs directly inside Snowflake\'s warehouse — no data movement to external clusters. Netflix\'s ML team uses Snowpark for feature engineering on WATCH_EVENTS before training recommendation models.',
      sql: `-- Python UDF running inside Snowflake warehouse
CREATE OR REPLACE FUNCTION compute_engagement_score(
  duration_s FLOAT, completed BOOLEAN
)
RETURNS FLOAT
LANGUAGE PYTHON RUNTIME_VERSION = '3.11'
AS $$
  completion_bonus = 1.5 if completed else 1.0
  return min(duration_s / 5400.0, 1.0) * completion_bonus
$$;

-- Snowpark DataFrame API — runs in warehouse, no data egress
from snowflake.snowpark import Session
df = session.table("EVENTS_DB.RAW.WATCH_EVENTS")
df.filter(col("WATCH_DATE") >= dateadd("day",-7, current_date())) \\
  .with_column("SCORE",
    call_udf("compute_engagement_score",
             col("DURATION_S"), col("COMPLETED"))) \\
  .write.save_as_table("ANALYTICS_DB.ML.ENGAGEMENT_FEATURES")`,
      facts: [
        'Eliminates data movement to Spark/Databricks for ML features',
        'Vectorized UDFs: batch processing vs row-by-row for speed',
        'Snowpark ML: train sklearn/XGBoost models inside Snowflake',
        'Netflix: feature engineering for 238M users runs in warehouse',
      ],
    },
    {
      id: 'dynamictables',
      icon: '🔄',
      name: 'Dynamic Tables',
      color: '#e3b341',
      tagline: 'Declarative incremental refresh — no pipeline code',
      desc: 'Dynamic Tables are materialized query results that Snowflake automatically keeps fresh. Instead of writing dbt/Airflow pipelines, you declare the transformation SQL and a target lag. Snowflake handles incremental refresh. Netflix replaced 200 lines of Airflow DAGs with 12 Dynamic Tables.',
      sql: `-- Declare a Dynamic Table (no Airflow DAG needed)
CREATE OR REPLACE DYNAMIC TABLE CONTENT_DAILY_PERF
  TARGET_LAG = '1 hour'
  WAREHOUSE  = ANALYTICS_WH
AS
  SELECT
    c.TITLE,
    c.GENRE,
    COUNT(*)              AS total_views,
    AVG(w.DURATION_S)     AS avg_watch_sec,
    SUM(w.COMPLETED::INT) AS completions,
    SUM(w.COMPLETED::INT)::FLOAT / NULLIF(COUNT(*), 0)
                          AS completion_rate
  FROM EVENTS_DB.RAW.WATCH_EVENTS w
  JOIN CONTENT_DB.PROCESSED.MOVIES c USING (CONTENT_ID)
  WHERE w.WATCH_DATE >= CURRENT_DATE - 30
  GROUP BY 1, 2;`,
      facts: [
        'Replace complex Airflow DAGs with a single SQL definition',
        'Lag guarantee: Snowflake refreshes within the specified window',
        'Incremental: only processes new/changed rows when possible',
        'Netflix: 12 Dynamic Tables replacing 200 lines of Airflow DAGs',
      ],
    },
    {
      id: 'iceberg',
      icon: '🧊',
      name: 'Iceberg Tables',
      color: '#2dd4bf',
      tagline: 'Open table format — your data on your cloud storage',
      desc: 'Snowflake supports Apache Iceberg tables backed by your own S3/GCS/Azure storage. You get Snowflake\'s full SQL engine on open-format data without vendor lock-in. Netflix stores raw event data in Iceberg on their own S3, then queries it through Snowflake for analytics.',
      sql: `-- Create an Iceberg table on your own S3 bucket
CREATE OR REPLACE ICEBERG TABLE RAW_EVENTS_ICEBERG (
  EVENT_ID     VARCHAR,
  USER_ID      NUMBER,
  WATCH_DATE   DATE,
  DURATION_S   NUMBER,
  COUNTRY      VARCHAR
)
EXTERNAL_VOLUME = NETFLIX_S3_VOL
CATALOG         = 'SNOWFLAKE'
BASE_LOCATION   = 's3://netflix-data-lake/raw-events/';

-- Full Snowflake SQL on open Parquet data — no copy needed
SELECT DATE_TRUNC('hour', WATCH_DATE) AS hr,
       COUNT(*) AS events
FROM RAW_EVENTS_ICEBERG
WHERE WATCH_DATE >= CURRENT_DATE - 7
GROUP BY 1 ORDER BY 1;`,
      facts: [
        'Open format: data stays in your S3 as Parquet + Iceberg metadata',
        'No lock-in: Spark, Trino, and Flink can read the same files',
        'Full Snowflake SQL: JOINs, window functions, Time Travel on Iceberg',
        'Netflix: petabytes of raw events in Iceberg, queried via Snowflake',
      ],
    },
    {
      id: 'cortex',
      icon: '🤖',
      name: 'Cortex AI',
      color: '#f56565',
      tagline: 'Built-in LLMs and ML — no infrastructure required',
      desc: 'Snowflake Cortex provides serverless LLM and ML functions that run inside Snowflake. COMPLETE() calls hosted LLMs (Llama 3, Mistral), SENTIMENT() classifies text, and Cortex Analyst lets business users query data in plain English. Netflix uses Cortex for content tagging and review sentiment.',
      sql: `-- Classify viewer review sentiment (built-in, no MLOps)
SELECT
  REVIEW_ID,
  SNOWFLAKE.CORTEX.SENTIMENT(REVIEW_TEXT)    AS sentiment_score,
  SNOWFLAKE.CORTEX.CLASSIFY_TEXT(
    REVIEW_TEXT, ['Positive','Negative','Neutral']
  ):label::VARCHAR                           AS sentiment_label
FROM ANALYTICS_DB.FEEDBACK.VIEWER_REVIEWS
WHERE REVIEW_DATE = CURRENT_DATE;

-- Auto-tag content genres using hosted LLM
SELECT CONTENT_ID,
  SNOWFLAKE.CORTEX.COMPLETE(
    'mistral-large',
    'Extract genres (comma-separated) from: ' || SYNOPSIS
  ) AS auto_genres
FROM CONTENT_DB.PROCESSED.MOVIES
WHERE AUTO_TAGGED = FALSE LIMIT 100;`,
      facts: [
        'COMPLETE(): hosted LLMs — Llama 3, Mistral, Snowflake Arctic',
        'SENTIMENT(), SUMMARIZE(), TRANSLATE() — built-in NLP functions',
        'Cortex Analyst: natural language to SQL over your data',
        'Netflix: auto-tags new content and classifies 50K reviews/day',
      ],
    },
  ];

  const AdvancedModule = {
    render(canvas) {
      canvas.innerHTML = '';

      const wrap = _el('div', 'adv-page');
      canvas.appendChild(wrap);

      const hdr = _el('div', 'mod-header');
      hdr.innerHTML = `
        <div class="mod-eyebrow">Platform</div>
        <h1 class="mod-title">Advanced Features</h1>
        <p class="mod-subtitle">Beyond the three-layer architecture: Snowflake's differentiating capabilities that let Netflix build a world-class data platform without managing additional infrastructure.</p>`;
      wrap.appendChild(hdr);

      const layout = _el('div', 'adv-layout');
      wrap.appendChild(layout);

      const left  = _el('div', 'adv-left');
      const right = _el('div', 'adv-right');
      layout.appendChild(left);
      layout.appendChild(right);

      /* Feature grid */
      const gridTitle = _el('div', 'partition-section-title');
      gridTitle.textContent = 'Advanced Capabilities — Click to Explore';
      left.appendChild(gridTitle);

      const grid = _el('div', 'adv-feature-grid');
      FEATURES.forEach(f => {
        const card = _el('div', 'adv-feature-card');
        card.id = `adv-feat-${f.id}`;
        card.style.setProperty('--adv-color', f.color);
        card.innerHTML = `
          <div class="adv-feat-header">
            <span class="adv-feat-icon">${f.icon}</span>
            <span class="adv-feat-name">${f.name}</span>
          </div>
          <div class="adv-feat-tagline">${f.tagline}</div>`;
        card.addEventListener('click', () => _showFeature(ctx, f.id));
        grid.appendChild(card);
      });
      left.appendChild(grid);

      /* Right: anim panel */
      const panel = _el('div', 'anim-panel');
      panel.id = 'adv-panel';
      panel.innerHTML = `
        <div class="anim-panel-step-num" id="advpanel-step">Overview</div>
        <div class="anim-panel-title"    id="advpanel-title">Advanced Features</div>
        <div class="anim-panel-body"     id="advpanel-body">Click any feature card to explore it, or press Play for a guided tour of all 7 advanced capabilities.</div>
        <div class="anim-panel-facts"    id="advpanel-facts"></div>`;
      right.appendChild(panel);

      /* SQL code box */
      const sqlTitle = _el('div', 'partition-section-title');
      sqlTitle.style.marginTop = '1.25rem';
      sqlTitle.textContent = 'Example SQL';
      right.appendChild(sqlTitle);

      const codeBox = _el('pre', 'adv-code-box');
      codeBox.id = 'adv-code';
      codeBox.innerHTML = '<code>-- Select a feature card to see example SQL…</code>';
      right.appendChild(codeBox);

      const ctx = { container: canvas, panel, codeBox };
      const engine = new (AE())({ steps: _buildSteps(ctx), speed: 1 });
      engine.setContext(ctx);
      window.SnowflakeViz.AnimationControls.register(engine);

      return { destroy: () => engine.destroy() };
    },
  };

  function _showFeature(ctx, id) {
    const feat = FEATURES.find(f => f.id === id);
    if (!feat) return;
    ctx.container.querySelectorAll('.adv-feature-card').forEach(el => el.classList.remove('adv-active'));
    const card = ctx.container.querySelector(`#adv-feat-${id}`);
    if (card) card.classList.add('adv-active');
    _setPanel(ctx, feat.name, feat.name, feat.desc, feat.facts);
    if (ctx.codeBox) ctx.codeBox.innerHTML = `<code>${_esc(feat.sql)}</code>`;
  }

  function _setPanel(ctx, step, title, body, facts = []) {
    const p = ctx.panel;
    if (!p) return;
    p.querySelector('#advpanel-step').textContent  = step;
    p.querySelector('#advpanel-title').textContent = title;
    p.querySelector('#advpanel-body').innerHTML    = body;
    p.querySelector('#advpanel-facts').innerHTML   = facts.map(f => `<div class="anim-panel-fact">${f}</div>`).join('');
    p.classList.add('highlighted');
  }

  function _resetAll(ctx) {
    ctx.container.querySelectorAll('.adv-feature-card').forEach(el => el.classList.remove('adv-active'));
    ctx.panel?.classList.remove('highlighted');
    if (ctx.codeBox) ctx.codeBox.innerHTML = '<code>-- Select a feature card to see example SQL…</code>';
  }

  function _buildSteps(ctx) {
    const F = AE().fnStep;
    const steps = [
      F('Overview', 'Advanced platform capabilities',
        c => {
          _resetAll(c);
          _setPanel(c, 'Step 1 of 8', 'Advanced Features Overview',
            'Beyond the three-layer architecture, Snowflake provides platform capabilities that eliminate entire categories of infrastructure. Netflix uses all 7 of these features to run a world-class data platform with a small engineering team.',
            [
              'Time Travel + Clone: replace backup infrastructure and staging pipelines',
              'Data Sharing: replace ETL pipelines to partners with zero-copy sharing',
              'Snowpark + Cortex: eliminate separate ML cluster infrastructure',
              'Dynamic Tables + Iceberg: replace Airflow pipelines and data lake overhead',
            ]);
        }, _resetAll, 3000),
    ];
    FEATURES.forEach((feat, i) => {
      steps.push(F(feat.name, feat.tagline,
        c => {
          _resetAll(c);
          _showFeature(c, feat.id);
          _setPanel(c, `Step ${i + 2} of 8`, feat.name, feat.desc, feat.facts);
        }, _resetAll, 4000));
    });
    return steps;
  }

  function _esc(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function _el(tag, cls) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    return el;
  }

  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Modules = window.SnowflakeViz.Modules || {};
  window.SnowflakeViz.Modules.advanced = AdvancedModule;
})();
