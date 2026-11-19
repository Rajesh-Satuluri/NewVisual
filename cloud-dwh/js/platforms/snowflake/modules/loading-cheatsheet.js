/* ============================================================
   Loading Cheat-Sheet & Reference — one-page revision aid for
   Snowflake data ingestion.

   Three study sections on a single printable page:
     1. Pattern comparison table  — COPY / Snowpipe / Streaming /
        Kafka / CDC side-by-side on the axes that actually decide
        an architecture (latency, trigger, billing, dedup, drift…).
     2. SQL cheat sheet           — the commands you reach for,
        grouped by task, rendered through CodeViewer.
     3. Cost & performance lens   — the credit/throughput intuition
        a loading answer is incomplete without.

   Pure content module. No live execution. Terms carry data-tooltip
   so the global Tooltip system explains them on hover, and the
   prose opts in to the loading glossary auto-decorator.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 1. Pattern comparison ---------- */
  // Columns describe the decision axes; each pattern answers all of them.
  const CMP_COLS = ['Pattern', 'Typical latency', 'What triggers it', 'Compute & billing', 'Files / stage?', 'Ordering', 'Dedup / idempotency', 'Schema drift', 'Reach for it when…'];
  const CMP_ROWS = [
    {
      name: 'Batch — COPY INTO', accent: '#a371f7',
      cells: [
        'Minutes–hours (scheduled)',
        'You run it (manual or a Task) — pull-based',
        'Your virtual warehouse — warehouse credits',
        'Yes — files in an internal/external stage',
        'Per-COPY; no cross-file guarantee',
        'File-level dedup via load metadata (~64d); FORCE re-loads',
        'Manual — adjust FILE FORMAT / columns',
        'Back-filling history or periodic bulk loads where minutes of latency are fine',
      ],
    },
    {
      name: 'Continuous — Snowpipe', accent: '#29b5e8',
      cells: [
        'Seconds–minutes',
        'Cloud storage event (or REST call) — event-driven',
        'Serverless, per-second Snowflake-managed credits',
        'Yes — files auto-loaded from a stage',
        'Per-file as they arrive',
        'File-level dedup (same metadata); idempotent per file',
        'Manual on the COPY; pair with a Stream+Task to transform',
        'Files land continuously and you want hands-off, near-real-time loading',
      ],
    },
    {
      name: 'Snowpipe Streaming', accent: '#3fb950',
      cells: [
        'Sub-second–seconds',
        'SDK/connector writes rows through a channel',
        'Serverless streaming credits (per-client)',
        'No — no files, no stage at all',
        'Ordered within a channel (offset token)',
        'Offset token per channel → exactly-once per channel',
        'Rows are typed on write; pair with a Dynamic Table',
        'Lowest-latency row ingestion (events, IoT) without a file hop',
      ],
    },
    {
      name: 'Kafka connector', accent: '#f0883e',
      cells: [
        'Seconds',
        'Connector polls topic partitions',
        'Streaming (newer) or Snowpipe file mode under the hood',
        'No stage to manage (file mode stages internally)',
        'Per-partition offset order',
        'Offset-based; connector tracks committed offsets',
        'Lands as VARIANT; flatten/typing downstream',
        'Data already flows through Kafka and you want it in Snowflake',
      ],
    },
    {
      name: 'CDC — Postgres · Debezium', accent: '#db61a2',
      cells: [
        'Seconds (after commit)',
        'DB transaction-log change events (I/U/D)',
        'Connector + warehouse for the MERGE',
        'No files — change events on a topic',
        'Commit/LSN order per table',
        'Dedup by key (latest LSN) then MERGE → idempotent',
        'Handle add/drop columns in the MERGE mapping',
        'You must mirror a source database’s inserts, updates AND deletes',
      ],
    },
  ];

  /* ---------- 2. SQL cheat sheet ---------- */
  const CHEATS = [
    { title: 'Storage integration + stage', lang: 'sql', code: `-- Credentials live in the integration, never inline on the stage.
CREATE OR REPLACE STORAGE INTEGRATION s3_int
  TYPE = EXTERNAL_STAGE  STORAGE_PROVIDER = 'S3'  ENABLED = TRUE
  STORAGE_AWS_ROLE_ARN = 'arn:aws:iam::<acct>:role/<role>'
  STORAGE_ALLOWED_LOCATIONS = ('s3://events-raw/orders/');

CREATE OR REPLACE STAGE landing.orders_stage
  STORAGE_INTEGRATION = s3_int
  URL = 's3://events-raw/orders/';` },
    { title: 'File format', lang: 'sql', code: `CREATE OR REPLACE FILE FORMAT ff_csv
  TYPE = CSV  FIELD_DELIMITER = ','  SKIP_HEADER = 1
  FIELD_OPTIONALLY_ENCLOSED_BY = '"'  NULL_IF = ('', 'NULL')
  DATE_FORMAT = 'YYYY-MM-DD';

CREATE OR REPLACE FILE FORMAT ff_json
  TYPE = JSON  STRIP_OUTER_ARRAY = TRUE;   -- one row per array element` },
    { title: 'COPY INTO (bulk load)', lang: 'sql', code: `COPY INTO raw.orders
  FROM @landing.orders_stage
  FILE_FORMAT = (FORMAT_NAME = ff_csv)
  ON_ERROR = 'SKIP_FILE'          -- or CONTINUE / ABORT_STATEMENT
  PURGE = FALSE;                  -- keep source files

-- Re-load files already loaded (bypasses dedup):
COPY INTO raw.orders FROM @landing.orders_stage FORCE = TRUE;` },
    { title: 'Dry-run & inspect errors', lang: 'sql', code: `-- Validate WITHOUT loading anything:
COPY INTO raw.orders FROM @landing.orders_stage
  FILE_FORMAT = (FORMAT_NAME = ff_csv)
  VALIDATION_MODE = 'RETURN_ERRORS';

-- Per-file audit after a load:
SELECT file_name, status, row_count, row_parsed, error_count, first_error
FROM TABLE(INFORMATION_SCHEMA.COPY_HISTORY(
  TABLE_NAME => 'RAW.ORDERS', START_TIME => DATEADD('hour', -24, CURRENT_TIMESTAMP())));` },
    { title: 'Snowpipe (auto-ingest)', lang: 'sql', code: `CREATE OR REPLACE PIPE public.orders_pipe
  AUTO_INGEST = TRUE
AS
  COPY INTO raw.orders FROM @landing.orders_stage
  FILE_FORMAT = (FORMAT_NAME = ff_csv);

-- Health check:
SELECT SYSTEM$PIPE_STATUS('public.orders_pipe');` },
    { title: 'Stream + Task + MERGE (incremental)', lang: 'sql', code: `CREATE OR REPLACE STREAM raw.orders_stream ON TABLE raw.orders;

CREATE OR REPLACE TASK curated.load_orders
  WAREHOUSE = load_wh  SCHEDULE = '1 minute'
  WHEN SYSTEM$STREAM_HAS_DATA('raw.orders_stream')
AS
MERGE INTO curated.orders t
USING (
  SELECT * FROM raw.orders_stream
  QUALIFY ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY lsn DESC) = 1
) s
ON t.order_id = s.order_id
WHEN MATCHED AND s.op = 'D' THEN DELETE
WHEN MATCHED THEN UPDATE SET t.status = s.status, t.amount = s.amount
WHEN NOT MATCHED AND s.op <> 'D'
  THEN INSERT (order_id, status, amount) VALUES (s.order_id, s.status, s.amount);` },
    { title: 'Reconcile source vs target', lang: 'sql', code: `-- Control totals: counts + a checksum on a numeric column.
SELECT 'target' AS side, COUNT(*) rows, SUM(amount) total FROM curated.orders
UNION ALL
SELECT 'source', COUNT(*),        SUM(amount)       FROM staging.orders_src;

-- Find duplicates introduced by a non-idempotent reload:
SELECT order_id, COUNT(*) FROM curated.orders
GROUP BY order_id HAVING COUNT(*) > 1;` },
  ];

  /* ---------- 3. Cost & performance lens ---------- */
  const COST = [
    { icon: '📦', title: 'Right-size your files', body: 'Aim for ~100–250 MB compressed per file and load many in parallel so every warehouse thread stays busy. Thousands of tiny files waste per-file overhead; a single multi-GB file can’t parallelize.' },
    { icon: '⚡', title: 'COPY vs Snowpipe billing', body: 'COPY runs on YOUR warehouse — you pay warehouse credits while it runs and auto-suspend reclaims idle time. Snowpipe is serverless, billed per-second on Snowflake-managed compute plus a small per-file overhead, so very tiny frequent files can cost more than a batched COPY.' },
    { icon: '🧱', title: 'Micro-partitions form on load', body: 'Ingest writes immutable ~50–500 MB columnar micro-partitions and auto-collects min/max metadata. Loading roughly in natural order (e.g. by event time) keeps that metadata tight, so later queries prune well for free.' },
    { icon: '🚿', title: 'Streaming ≠ free', body: 'Snowpipe Streaming gets you sub-second latency but bills streaming credits per client. Use it when latency genuinely matters; for minute-level freshness a Snowpipe + Dynamic Table combo is usually cheaper.' },
    { icon: '🔁', title: 'Idempotency saves money', body: 'A pipeline that can safely re-run (file dedup, or dedup-by-key + MERGE) means a failed load is just a re-run — no manual cleanup, no duplicate-driven re-processing downstream.' },
    { icon: '🎯', title: 'Warehouse size for loads', body: 'Loading scales with file count, not file size. More files → a bigger/multi-cluster warehouse loads more in parallel. One huge file sees no benefit from a larger warehouse — split it first.' },
  ];

  /* ---------- inline term definitions for hover tooltips ---------- */
  const TIP = {
    'storage integration': 'A Snowflake object holding the cloud IAM role used to reach a bucket — keeps credentials out of SQL.',
    'stage': 'A named pointer to files for load/unload: internal (Snowflake-managed) or external (your bucket).',
    'micro-partition': 'Immutable ~50–500 MB columnar file with per-column min/max metadata; the unit of pruning.',
    'watermark': 'The high-water value already processed (e.g. MAX(updated_at)/LSN) so the next run pulls only newer rows.',
    'idempotent': 'Safe to re-run: the same batch applied again yields the same result, with no duplicates.',
    'MERGE': 'Upsert statement: insert new keys, update changed ones, optionally delete — the core of incremental loads.',
  };

  function _tip(label, key) {
    return '<span class="gl-term" data-tooltip="' + _esc(TIP[key]) + '" tabindex="0">' + _esc(label) + '</span>';
  }

  const Module = {
    render(canvas) {
      canvas.innerHTML = '';
      const cv = window.CDWH.CodeViewer;
      const page = _el('div', 'mod-page');

      const header = _el('div', 'mod-header');
      header.innerHTML =
        '<div class="mod-eyebrow">Loading Reference</div>' +
        '<h1 class="mod-title">Data Loading — Cheat-Sheet &amp; Reference</h1>' +
        '<p class="mod-subtitle">One page to revise before an interview or exam: how the five ingestion patterns compare, the SQL you reach for, and the cost &amp; performance intuition behind it all.</p>';
      const printBtn = _el('button', 'btn btn-ghost ref-print');
      printBtn.type = 'button';
      printBtn.textContent = '🖨️ Print / Save PDF';
      printBtn.addEventListener('click', () => window.print());
      header.appendChild(printBtn);
      page.appendChild(header);

      /* 1. Comparison table */
      const cmp = _section('Pattern comparison — pick the right ingestion path');
      const scroll = _el('div', 'lcs-table-scroll');
      scroll.setAttribute('data-noswipe', '');
      const tbl = _el('table', 'lcs-cmp');
      const thead = _el('thead');
      thead.innerHTML = '<tr>' + CMP_COLS.map((c, i) =>
        '<th' + (i === 0 ? ' class="lcs-cmp-rowhead"' : '') + '>' + _esc(c) + '</th>').join('') + '</tr>';
      tbl.appendChild(thead);
      const tbody = _el('tbody');
      CMP_ROWS.forEach(r => {
        const tr = _el('tr');
        let html = '<th scope="row" class="lcs-cmp-rowhead" style="--p-accent:' + r.accent + '">' +
          '<span class="lcs-swatch" style="background:' + r.accent + '"></span>' + _esc(r.name) + '</th>';
        html += r.cells.map(c => '<td>' + _esc(c) + '</td>').join('');
        tr.innerHTML = html;
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      scroll.appendChild(tbl);
      cmp.appendChild(scroll);
      const hint = _el('p', 'lcs-hint');
      hint.textContent = '↔ Scroll the table sideways on narrow screens. The first column pins each pattern; every other column is a decision axis.';
      cmp.appendChild(hint);
      page.appendChild(cmp);

      /* 2. Cheat sheet */
      const cs = _section('SQL cheat sheet');
      const grid = _el('div', 'lcs-cheat-grid');
      CHEATS.forEach(c => {
        const cell = _el('div', 'lcs-cheat');
        const h = _el('div', 'lcs-cheat-title'); h.textContent = c.title; cell.appendChild(h);
        if (cv) cell.appendChild(cv.create(c.code, c.lang, c.title));
        else { const pre = _el('pre'); pre.textContent = c.code; cell.appendChild(pre); }
        grid.appendChild(cell);
      });
      cs.appendChild(grid);
      page.appendChild(cs);

      /* 3. Cost & performance lens */
      const cost = _section('Cost &amp; performance lens');
      const intro = _el('p', 'lcs-prose');
      intro.setAttribute('data-glossary', 'on');
      intro.innerHTML = 'A loading answer is incomplete without cost intuition. Every ' + _tip('stage', 'stage') +
        ' load writes ' + _tip('micro-partitions', 'micro-partition') + ', and the cheapest correct pipeline is usually an ' +
        _tip('idempotent', 'idempotent') + ' one driven by a ' + _tip('watermark', 'watermark') + ' or a ' +
        _tip('MERGE', 'MERGE') + ' — so a failed run is just a safe re-run.';
      cost.appendChild(intro);
      const cgrid = _el('div', 'lcs-cost-grid');
      COST.forEach(c => {
        const card = _el('div', 'lcs-cost-card');
        card.innerHTML = '<div class="lcs-cost-icon">' + c.icon + '</div>' +
          '<div class="lcs-cost-title">' + _esc(c.title) + '</div>' +
          '<div class="lcs-cost-body">' + _esc(c.body) + '</div>';
        cgrid.appendChild(card);
      });
      cost.appendChild(cgrid);
      page.appendChild(cost);

      canvas.appendChild(page);

      // Opt the whole page into the loading glossary auto-decorator, if present.
      if (window.CDWH.LoadingGlossary) {
        try { window.CDWH.LoadingGlossary.decorate(page); } catch (_) {}
      }
      return {};
    },
  };

  function _section(titleHtml) {
    const s = _el('section', 'mod-section');
    const t = _el('div', 'mod-section-title');
    t.innerHTML = titleHtml;
    s.appendChild(t);
    return s;
  }
  function _el(tag, cls) { const el = document.createElement(tag); if (cls) el.className = cls; return el; }
  function _esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  window.CDWH = window.CDWH || {};
  window.CDWH.P.snowflake.Modules = window.CDWH.P.snowflake.Modules || {};
  window.CDWH.P.snowflake.Modules.loadingCheatsheet = Module;
})();
