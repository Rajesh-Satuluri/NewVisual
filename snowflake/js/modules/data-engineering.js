/* ============================================================
   Modern Data Engineering Module
   Stages & COPY, Streams & Tasks (CDC), Dynamic Tables,
   Snowpipe Streaming, and open Iceberg / external tables.
   ============================================================ */

(function () {
  'use strict';

  const INGEST = [
    { n: 'COPY INTO', d: 'Batch load from a stage. Synchronous, transactional. Run manually or on a schedule.' },
    { n: 'Snowpipe', d: 'Serverless, event-driven micro-batch loading. Files auto-load within seconds of landing.' },
    { n: 'Snowpipe Streaming', d: 'Row-level API with sub-second latency via channels — no files. Netflix streams ~16k events/sec.' },
    { n: 'External / Iceberg tables', d: 'Query data in your own bucket without loading it. Iceberg gives open-format, no lock-in storage.' },
  ];

  const STREAM_TASK_SQL = `-- CDC pipeline: a Stream tracks row changes; a Task processes them.
CREATE STREAM watch_events_stream ON TABLE raw_events;   -- change capture

CREATE TASK process_events
  WAREHOUSE = ingest_wh
  SCHEDULE  = '1 MINUTE'
  WHEN SYSTEM$STREAM_HAS_DATA('watch_events_stream')      -- only run if changes
AS
  INSERT INTO fact_watch (user_id, title_id, watched_at)
  SELECT v:user_id, v:title_id, v:ts
  FROM watch_events_stream
  WHERE METADATA$ACTION = 'INSERT';

ALTER TASK process_events RESUME;`;

  const DYNAMIC_SQL = `-- Dynamic Table: declarative, incrementally refreshed pipeline.
CREATE DYNAMIC TABLE daily_top_reco
  TARGET_LAG = '15 minutes'          -- Snowflake keeps it this fresh
  WAREHOUSE  = ml_wh
AS
  SELECT title_id, COUNT(*) AS plays, AVG(completion_pct) AS avg_pct
  FROM fact_watch
  WHERE watched_at > DATEADD(day, -1, CURRENT_TIMESTAMP)
  GROUP BY title_id;`;

  const DEModule = {
    render(canvas) {
      canvas.innerHTML = '';
      const page = _el('div', 'mod-page');
      const cv = window.SnowflakeViz.CodeViewer;

      page.appendChild(_header(
        'Query & Data',
        'Modern Data Engineering',
        'Beyond COPY INTO: how Netflix moves 1.4B events/day into query-ready tables — event-driven ingestion, change-data-capture with Streams & Tasks, and declarative pipelines with Dynamic Tables.'
      ));

      /* Ingestion options (7a) */
      const iSec = _section('Ingestion Options — batch to streaming');
      const grid = _el('div', 'ss-grid');
      INGEST.forEach(x => {
        const c = _el('div', 'ss-card');
        c.innerHTML = `<div class="ss-card-type">${x.n}</div><div class="ss-card-desc">${x.d}</div>`;
        grid.appendChild(c);
      });
      iSec.appendChild(grid);
      const info = _el('div', 'info-box');
      info.innerHTML = `<strong>Stages & file formats</strong> underpin all batch loading: a <em>stage</em> points at files (internal or your S3/Blob/GCS bucket), and a <em>file format</em> tells Snowflake how to parse them (JSON, CSV, Parquet, Avro). <code>COPY INTO tbl FROM @stage FILE_FORMAT=(TYPE=PARQUET)</code>.`;
      iSec.appendChild(info);
      page.appendChild(iSec);

      /* Streams & Tasks (7b) */
      const stSec = _section('Streams & Tasks — change data capture');
      const stInfo = _el('div', 'info-box');
      stInfo.innerHTML = `A <strong>Stream</strong> is a change-tracking cursor over a table (inserts/updates/deletes since last read). A <strong>Task</strong> runs SQL on a schedule or in a DAG. Together they build incremental CDC pipelines that only process new rows.`;
      stSec.appendChild(stInfo);
      if (cv) stSec.appendChild(cv.create(STREAM_TASK_SQL, 'sql', 'Stream + Task pipeline'));
      page.appendChild(stSec);

      /* Dynamic Tables (7c) */
      const dSec = _section('Dynamic Tables — declarative pipelines');
      const dInfo = _el('div', 'info-box');
      dInfo.innerHTML = `Instead of orchestrating Streams + Tasks by hand, declare the <em>result</em> and a freshness target (<code>TARGET_LAG</code>). Snowflake figures out the incremental refresh. This replaces most bespoke ETL DAGs.`;
      dSec.appendChild(dInfo);
      if (cv) dSec.appendChild(cv.create(DYNAMIC_SQL, 'sql', 'Dynamic Table'));
      page.appendChild(dSec);

      canvas.appendChild(page);
      return {};
    },
  };

  function _section(title) {
    const s = _el('div', 'mod-section');
    const t = _el('div', 'mod-section-title'); t.textContent = title; s.appendChild(t);
    return s;
  }
  function _header(eyebrow, title, subtitle) {
    const h = _el('div', 'mod-header');
    h.innerHTML = `<div class="mod-eyebrow">${eyebrow}</div><h1 class="mod-title">${title}</h1><p class="mod-subtitle">${subtitle}</p>`;
    return h;
  }
  function _el(tag, cls) { const el = document.createElement(tag); if (cls) el.className = cls; return el; }

  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Modules = window.SnowflakeViz.Modules || {};
  window.SnowflakeViz.Modules.dataEngineering = DEModule;
})();
