/* ============================================================
   Loading Workshop (P0-B) — Stages, File Formats, COPY INTO and
   an interactive data-validation exercise. Hands-on: start from
   source files, end at verified Snowflake table data. All SQL is
   technically valid for its context; the exercise is a clearly
   labelled in-browser simulation (copySim), not live execution.
   ============================================================ */
(function () {
  'use strict';
  const CV = () => window.CDWH.CodeViewer;
  const SIM = () => window.CDWH.P.snowflake.loadingSim;

  /* ---------- Content: Stages ---------- */
  const STAGE_SQL = `-- A STAGE names a location of files. An EXTERNAL stage REFERENCES
-- files in your bucket; it does NOT copy them into Snowflake.
-- Credentials live in a STORAGE INTEGRATION, never inline.

CREATE OR REPLACE STORAGE INTEGRATION s3_int
  TYPE = EXTERNAL_STAGE  STORAGE_PROVIDER = 'S3'  ENABLED = TRUE
  STORAGE_AWS_ROLE_ARN = 'arn:aws:iam::<acct>:role/<role>'   -- placeholder
  STORAGE_ALLOWED_LOCATIONS = ('s3://events-raw/orders/');

CREATE OR REPLACE STAGE events_db.landing.orders_stage
  STORAGE_INTEGRATION = s3_int
  URL = 's3://events-raw/orders/'
  FILE_FORMAT = events_db.landing.ff_csv;

LIST @events_db.landing.orders_stage;   -- inspect files + sizes before loading`;

  const STAGE_KINDS = [
    { n: 'Internal named stage', d: 'Snowflake-managed storage (e.g. @my_stage). Load local files with PUT, then COPY. Good default when you do not already have a bucket.' },
    { n: 'External named stage', d: 'Points at your own S3 / GCS / Azure path via a storage integration. References files in place — no data is copied into Snowflake until COPY/Snowpipe runs.' },
    { n: 'User / table stage', d: '@~ (user) and @%table (table) are implicit stages handy for quick, ad-hoc loads; named stages are preferred for shared, repeatable pipelines.' },
  ];

  /* ---------- Content: File formats ---------- */
  const FORMATS = {
    csv: {
      label: 'CSV', sample: `order_id,customer,amount,status,order_date
1001,Acme,250.00,SHIPPED,2024-01-15
1002,"Smith, Jr",99.50,PENDING,2024-01-16`,
      ddl: `CREATE OR REPLACE FILE FORMAT events_db.landing.ff_csv
  TYPE = CSV
  PARSE_HEADER = TRUE                       -- use the header row for names
  FIELD_OPTIONALLY_ENCLOSED_BY = '"'        -- allow commas inside quotes
  NULL_IF = ('', 'NULL')                    -- treat blanks/NULL text as NULL
  DATE_FORMAT = 'AUTO'
  TRIM_SPACE = TRUE
  ERROR_ON_COLUMN_COUNT_MISMATCH = TRUE;`,
      notes: ['Row/field delimiters, quoting and header handling are explicit.', 'FIELD_OPTIONALLY_ENCLOSED_BY is what lets a quoted field contain the delimiter.', 'Schema is positional unless PARSE_HEADER / MATCH_BY_COLUMN_NAME is used.'],
      errors: ['Unquoted delimiter inside a value → column-count mismatch.', 'Empty string into a numeric/date column without NULL_IF → cast error.', 'Non-default date/time text without DATE_FORMAT/TIMESTAMP_FORMAT.'],
      conv: 'Everything is text until cast; a tight file format is where most CSV correctness is won or lost.',
    },
    json: {
      label: 'JSON', sample: `{"order_id":1001,"customer":"Acme","amount":250.00,
 "items":[{"sku":"A1","qty":2}],"status":"SHIPPED"}`,
      ddl: `CREATE OR REPLACE FILE FORMAT events_db.landing.ff_json
  TYPE = JSON
  STRIP_OUTER_ARRAY = TRUE                  -- one row per array element
  DATE_FORMAT = 'AUTO';

-- Land flexibly into a VARIANT column, then promote hot fields:
CREATE OR REPLACE TABLE events_db.landing.orders_raw (v VARIANT);
COPY INTO events_db.landing.orders_raw
FROM @events_db.landing.orders_stage
FILE_FORMAT = events_db.landing.ff_json;`,
      notes: ['Loads into a VARIANT column; query with v:field and v:arr[0]:x.', 'STRIP_OUTER_ARRAY turns a top-level array into one row per element.', 'Use LATERAL FLATTEN to explode nested arrays into rows.'],
      errors: ['Expecting flat columns — JSON lands as VARIANT by default.', 'Deeply nested access without FLATTEN is slow and awkward.', 'Mixed types across records for the same path.'],
      conv: 'Promote the handful of constantly-filtered fields to typed columns; leave the long tail in VARIANT.',
    },
    parquet: {
      label: 'Parquet', sample: `(binary columnar) schema:
  order_id: INT64, customer: BYTE_ARRAY (UTF8),
  amount: DOUBLE, status: BYTE_ARRAY, order_date: INT32 (DATE)`,
      ddl: `CREATE OR REPLACE FILE FORMAT events_db.landing.ff_parquet
  TYPE = PARQUET
  COMPRESSION = SNAPPY;                      -- AUTO also works for Parquet

COPY INTO events_db.landing.orders
FROM @events_db.landing.orders_stage
FILE_FORMAT = events_db.landing.ff_parquet
MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE;    -- map by name, not position`,
      notes: ['Columnar + typed + compressed — the preferred bulk format.', 'MATCH_BY_COLUMN_NAME maps source columns by name.', 'Can also be read via INFER_SCHEMA / external tables.'],
      errors: ['Type widening/narrowing mismatches vs the target column.', 'Assuming positional mapping when columns are reordered.', 'Many tiny Parquet files still hurt load throughput.'],
      conv: 'Types travel with the file, so conversion is mostly validation — far fewer parse surprises than CSV.',
    },
    avro: {
      label: 'Avro', sample: `{"type":"record","name":"Order","fields":[
  {"name":"order_id","type":"long"},
  {"name":"amount","type":["null","double"]} ]}`,
      ddl: `CREATE OR REPLACE FILE FORMAT events_db.landing.ff_avro
  TYPE = AVRO
  COMPRESSION = AUTO;

COPY INTO events_db.landing.orders_raw   -- VARIANT target
FROM @events_db.landing.orders_stage
FILE_FORMAT = events_db.landing.ff_avro
MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE;`,
      notes: ['Row-based, schema travels in the file — common from Kafka.', 'Loads into VARIANT; the embedded schema drives field access.', 'Union types (["null","double"]) express nullability.'],
      errors: ['Schema evolution: reader vs writer schema drift.', 'Union/logical types needing explicit handling downstream.', 'Treating it as flat when it lands as VARIANT.'],
      conv: 'Embedded schema makes evolution explicit — plan for added/removed fields rather than hard-failing.',
    },
  };

  /* ---------- Content: COPY INTO progressive workshop ---------- */
  const COPY_STEPS = [
    { t: '1 · Create the schema layers', sql: `CREATE DATABASE IF NOT EXISTS events_db;
CREATE SCHEMA IF NOT EXISTS events_db.landing;   -- raw, immutable
CREATE SCHEMA IF NOT EXISTS events_db.staging;   -- typed, deduped
CREATE SCHEMA IF NOT EXISTS events_db.curated;   -- query-ready`, n: 'Separate RAW/STAGING/CURATED so you can always reprocess from immutable landing data.' },
    { t: '2 · Define a reusable file format', sql: `CREATE OR REPLACE FILE FORMAT events_db.landing.ff_csv
  TYPE = CSV PARSE_HEADER = TRUE
  FIELD_OPTIONALLY_ENCLOSED_BY = '"'
  NULL_IF = ('', 'NULL') DATE_FORMAT = 'AUTO';`, n: 'One named format object, referenced everywhere — no copy-pasted options drifting out of sync.' },
    { t: '3 · Create the stage', sql: `CREATE OR REPLACE STAGE events_db.landing.orders_stage
  STORAGE_INTEGRATION = s3_int
  URL = 's3://events-raw/orders/'
  FILE_FORMAT = events_db.landing.ff_csv;`, n: 'The stage references files in your bucket; credentials come from the integration.' },
    { t: '4 · Inspect available files', sql: `LIST @events_db.landing.orders_stage;`, n: 'Always look before loading: confirm the files, sizes and prefix are what you expect.' },
    { t: '5 · Infer the source structure', sql: `SELECT *
FROM TABLE(INFER_SCHEMA(
  LOCATION => '@events_db.landing.orders_stage',
  FILE_FORMAT => 'events_db.landing.ff_csv'));`, n: 'INFER_SCHEMA suggests columns/types; use it to build the table, then review the types.' },
    { t: '6 · Create the RAW landing table', sql: `CREATE OR REPLACE TABLE events_db.landing.orders (
  order_id    NUMBER,
  customer    VARCHAR,
  amount      NUMBER(12,2),
  status      VARCHAR,
  order_date  DATE
);`, n: 'Explicit columns + types. Keep RAW append-friendly and immutable.' },
    { t: '7 · Load with COPY INTO', sql: `COPY INTO events_db.landing.orders
FROM @events_db.landing.orders_stage
MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE
ON_ERROR = 'CONTINUE';`, n: 'ON_ERROR = CONTINUE loads good rows and records the bad ones instead of aborting.' },
    { t: '8 · Inspect the loaded data', sql: `SELECT * FROM events_db.landing.orders LIMIT 20;
SELECT COUNT(*) FROM events_db.landing.orders;`, n: 'Sanity-check row counts and a sample before trusting the load.' },
    { t: '9 · Inspect load history', sql: `SELECT file_name, status, row_count, row_parsed, error_count, first_error
FROM TABLE(events_db.information_schema.copy_history(
  table_name => 'LANDING.ORDERS',
  start_time => DATEADD('hour', -1, CURRENT_TIMESTAMP)));`, n: 'COPY_HISTORY is the per-file audit: rows parsed vs loaded vs errors.' },
    { t: '10 · Validate (dry run)', sql: `COPY INTO events_db.landing.orders
FROM @events_db.landing.orders_stage
VALIDATION_MODE = 'RETURN_ERRORS';`, n: 'VALIDATION_MODE shows what WOULD fail without loading anything.' },
    { t: '11 · Diagnose with file metadata', sql: `SELECT METADATA$FILENAME, METADATA$FILE_ROW_NUMBER, *
FROM @events_db.landing.orders_stage
(FILE_FORMAT => 'events_db.landing.ff_csv')
LIMIT 50;`, n: 'METADATA$FILENAME / $FILE_ROW_NUMBER pinpoint exactly which file + line is bad.' },
    { t: '12 · Safely retry', sql: `-- Re-running is safe: files already loaded are skipped by load metadata.
COPY INTO events_db.landing.orders
FROM @events_db.landing.orders_stage
ON_ERROR = 'CONTINUE';
-- FORCE = TRUE re-loads everything and DUPLICATES rows. Not a default fix.`, n: 'File-load tracking makes retry idempotent at the FILE level — not a substitute for business-key dedup.' },
  ];

  /* ---------- Content: exercise dataset ---------- */
  const DATASET = [
    { id: 1, cells: ['1001', 'Acme', '250.00', 'SHIPPED', '2024-01-15'], issue: 'ok', label: 'Clean row' },
    { id: 2, cells: ['1002', '"Smith, Jr"', '99.50', 'PENDING', '2024-01-16'], issue: 'quoted_comma', label: 'Comma inside a quoted field' },
    { id: 3, cells: ['1003', 'Lee', '(empty)', 'PENDING', '2024-01-16'], issue: 'empty_number', label: 'Empty amount (blank → NULL?)' },
    { id: 4, cells: ['1004', 'Nolan', '75.00', 'SHIPPED', '15/01/2024'], issue: 'bad_date', label: 'Date as DD/MM/YYYY' },
    { id: 5, cells: ['1005', 'Ortiz', '1e9999', 'SHIPPED', '2024-01-17'], issue: 'overflow', label: 'Numeric overflow (real data error)' },
    { id: 6, cells: ['1006', 'Park', '120.00', '(empty)', '2024-01-18'], issue: 'ok', label: 'Empty status (valid text)' },
  ];
  const COLS = ['order_id', 'customer', 'amount', 'status', 'order_date'];

  const Module = {
    render(canvas) {
      canvas.innerHTML = '';
      const page = _el('div', 'mod-page');
      page.innerHTML = `
        <div class="mod-header">
          <div class="mod-eyebrow">Query &amp; Data</div>
          <h1 class="mod-title">Loading Workshop</h1>
          <p class="mod-subtitle">From source files to verified table data: stages, file formats, a step-by-step COPY INTO, and an interactive validation exercise. Every statement is valid Snowflake SQL; the exercise is a labelled in-browser simulation.</p>
        </div>`;
      canvas.appendChild(page);

      const tabs = ['Stages', 'File Formats', 'COPY INTO', 'Exercise'];
      const bar = _el('div', 'wk-tabs');
      const body = _el('div', 'wk-body');
      tabs.forEach((t, i) => {
        const b = _el('button', 'wk-tab' + (i === 0 ? ' active' : ''));
        b.type = 'button'; b.textContent = t;
        b.addEventListener('click', () => { bar.querySelectorAll('.wk-tab').forEach(x => x.classList.remove('active')); b.classList.add('active'); renderTab(i); });
        bar.appendChild(b);
      });
      page.append(bar, body);

      function renderTab(i) {
        body.innerHTML = '';
        if (i === 0) renderStages();
        else if (i === 1) renderFormats();
        else if (i === 2) renderCopy();
        else renderExercise();
      }

      function renderStages() {
        body.appendChild(_callout('🔑 Reference vs load', 'An <strong>external stage references files in place</strong> — nothing moves into Snowflake until a COPY/Snowpipe reads it and writes rows into the table. File storage and Snowflake table storage are different things.'));
        const grid = _el('div', 'wk-grid');
        STAGE_KINDS.forEach(k => { const c = _el('div', 'wk-card'); c.innerHTML = `<div class="wk-card-h">${k.n}</div><p>${k.d}</p>`; grid.appendChild(c); });
        body.appendChild(grid);
        if (CV()) body.appendChild(CV().create(STAGE_SQL, 'sql', 'Stage + storage integration'));
        body.appendChild(_callout('🔒 Credentials', 'Never embed access keys in SQL. Use a <strong>storage integration</strong> (an IAM role / managed identity); examples here use placeholders.'));
      }

      function renderFormats() {
        const sub = _el('div', 'wk-subtabs');
        const detail = _el('div');
        Object.keys(FORMATS).forEach((k, idx) => {
          const b = _el('button', 'wk-subtab' + (idx === 0 ? ' active' : ''));
          b.type = 'button'; b.textContent = FORMATS[k].label;
          b.addEventListener('click', () => { sub.querySelectorAll('.wk-subtab').forEach(x => x.classList.remove('active')); b.classList.add('active'); showFmt(k); });
          sub.appendChild(b);
        });
        body.append(sub, detail);
        function showFmt(k) {
          const f = FORMATS[k];
          detail.innerHTML = `<div class="wk-fmt-sample"><div class="wk-mini-h">Example source</div><pre>${_esc(f.sample)}</pre></div>`;
          if (CV()) detail.appendChild(CV().create(f.ddl, 'sql', `CREATE FILE FORMAT — ${f.label}`));
          const cols = _el('div', 'wk-grid');
          cols.appendChild(_list('Parsing options & behaviour', f.notes));
          cols.appendChild(_list('Common errors', f.errors));
          detail.appendChild(cols);
          detail.appendChild(_callout('🔁 Type conversion', f.conv));
        }
        showFmt('csv');
        body.appendChild(_callout('⚠️ Options are per-format', 'Options valid for one format may be invalid for another (e.g. FIELD_OPTIONALLY_ENCLOSED_BY is a CSV option, STRIP_OUTER_ARRAY is JSON). Match options to the file type.'));
      }

      function renderCopy() {
        body.appendChild(_callout('🧭 Ordered, not snippets', 'Run these in order. Names stay consistent: <code>EVENTS_DB.LANDING → STAGING → CURATED</code>. Steps that write require an appropriately privileged role.'));
        COPY_STEPS.forEach(s => {
          const wrap = _el('div', 'wk-step');
          wrap.innerHTML = `<div class="wk-step-h">${s.t}</div>`;
          if (CV()) wrap.appendChild(CV().create(s.sql, 'sql', ''));
          wrap.appendChild(_el('div', 'wk-step-note')).innerHTML = s.n;
          body.appendChild(wrap);
        });
      }

      function renderExercise() {
        body.appendChild(_callout('🧪 Simulation', 'Change the options, then run the load. Results are computed in your browser by a deterministic simulator — <strong>no SQL executes against a real account</strong>.'));

        const opts = { onError: 'ABORT_STATEMENT', enclosed: false, nullIf: false, dateDMY: false };
        const controls = _el('div', 'wk-controls');
        controls.innerHTML = `
          <label class="wk-ctl">ON_ERROR
            <select id="wk-onerror">
              <option value="ABORT_STATEMENT">ABORT_STATEMENT</option>
              <option value="CONTINUE">CONTINUE</option>
              <option value="SKIP_FILE">SKIP_FILE</option>
            </select></label>
          <label class="wk-ctl wk-check"><input type="checkbox" id="wk-enclosed"> FIELD_OPTIONALLY_ENCLOSED_BY = '"'</label>
          <label class="wk-ctl wk-check"><input type="checkbox" id="wk-nullif"> NULL_IF = ('')</label>
          <label class="wk-ctl wk-check"><input type="checkbox" id="wk-date"> DATE_FORMAT = 'DD/MM/YYYY'</label>
          <button type="button" id="wk-run" class="wk-run">Run COPY INTO</button>`;
        body.appendChild(controls);

        const summary = _el('div', 'wk-summary'); summary.id = 'wk-summary';
        const grid = _el('div'); grid.id = 'wk-result';
        body.append(summary, grid);

        const sqlBox = _el('div'); sqlBox.id = 'wk-sql';
        body.appendChild(sqlBox);

        function run() {
          opts.onError = document.getElementById('wk-onerror').value;
          opts.enclosed = document.getElementById('wk-enclosed').checked;
          opts.nullIf = document.getElementById('wk-nullif').checked;
          opts.dateDMY = document.getElementById('wk-date').checked;
          const res = SIM().copySim(DATASET, opts);

          summary.className = 'wk-summary wk-' + res.status;
          summary.innerHTML = `<div class="wk-sum-line"><strong>${res.statusText}</strong></div>` +
            `<div class="wk-sum-counts"><span class="wk-pill ok">${res.loaded} loaded</span><span class="wk-pill bad">${res.rejected} rejected</span></div>` +
            (res.note ? `<div class="wk-sum-note">${res.note}</div>` : '');

          grid.innerHTML = `<table class="wk-table"><thead><tr><th>#</th>${COLS.map(c => `<th>${c}</th>`).join('')}<th>Result</th></tr></thead><tbody>` +
            res.rows.map(r => {
              const cls = r.status === 'loaded' ? 'r-ok' : r.status === 'error' ? 'r-bad' : 'r-skip';
              const badge = r.status === 'loaded' ? '✓ loaded' : r.status === 'error' ? '✗ rejected' : r.status === 'aborted' ? '⟂ aborted' : '⊘ skipped';
              return `<tr class="${cls}"><td>${r.id}</td>${r.cells.map(c => `<td>${_esc(c)}</td>`).join('')}<td class="wk-res">${badge}${r.reason ? `<div class="wk-reason">${_esc(r.reason)}</div>` : ''}</td></tr>`;
            }).join('') + '</tbody></table>';

          const sql = `COPY INTO events_db.landing.orders\nFROM @events_db.landing.orders_stage\nFILE_FORMAT = (TYPE = CSV` +
            (opts.enclosed ? `\n  FIELD_OPTIONALLY_ENCLOSED_BY = '"'` : '') +
            (opts.nullIf ? `\n  NULL_IF = ('')` : '') +
            (opts.dateDMY ? `\n  DATE_FORMAT = 'DD/MM/YYYY'` : '') +
            `)\nON_ERROR = '${opts.onError}';`;
          sqlBox.innerHTML = '';
          if (CV()) sqlBox.appendChild(CV().create(sql, 'sql', 'Your COPY statement'));
        }
        document.getElementById('wk-run').addEventListener('click', run);
        run();
      }

      renderTab(0);
      return {};
    },
  };

  /* ---- helpers ---- */
  function _callout(tag, html) { const d = _el('div', 'wk-callout'); d.innerHTML = `<div class="wk-callout-tag">${tag}</div><p>${html}</p>`; return d; }
  function _list(title, items) { const d = _el('div', 'wk-card'); d.innerHTML = `<div class="wk-card-h">${title}</div><ul class="wk-ul">${items.map(x => `<li>${x}</li>`).join('')}</ul>`; return d; }
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function _el(tag, cls) { const el = document.createElement(tag); if (cls) el.className = cls; return el; }

  window.CDWH = window.CDWH || {};
  window.CDWH.Modules = window.CDWH.Modules || {};
  window.CDWH.P.snowflake.Modules.loadingWorkshop = Module;
})();
