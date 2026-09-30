/* ============================================================
   Semi-Structured Data Module — VARIANT, OBJECT, ARRAY,
   dot/bracket access, FLATTEN, and file formats.
   ============================================================ */

(function () {
  'use strict';

  const TYPES = [
    { t: 'VARIANT', d: 'Universal container that can hold any semi-structured value — JSON, an object, an array, or a scalar. Stored columnar and automatically statistics-indexed.' },
    { t: 'OBJECT', d: 'Key–value map (like a JSON object). Access values by key with dot or bracket notation.' },
    { t: 'ARRAY', d: 'Ordered list of VARIANT values. Index with [0]; explode into rows with FLATTEN.' },
  ];

  const FORMATS = [
    { n: 'JSON', s: 'Web/event data · loaded into VARIANT' },
    { n: 'Parquet', s: 'Columnar · great for lakes/Iceberg' },
    { n: 'Avro', s: 'Row-based · schema evolution' },
    { n: 'XML / ORC', s: 'Also supported natively' },
  ];

  const LOAD_SQL = `-- Land raw JSON watch events in a single VARIANT column
CREATE TABLE raw_events (v VARIANT);

COPY INTO raw_events
  FROM @netflix_stage/events/
  FILE_FORMAT = (TYPE = JSON STRIP_OUTER_ARRAY = TRUE);`;

  const ACCESS_SQL = `-- A raw event looks like:
-- { "user_id": 42, "device": {"os": "iOS"},
--   "titles": [{"id":"S1","pct":0.9}, {"id":"M7","pct":0.4}] }

SELECT
  v:user_id::NUMBER            AS user_id,      -- dot / colon path
  v:device.os::STRING         AS os,           -- nested object
  v:titles[0].id::STRING      AS first_title,   -- array index
  ARRAY_SIZE(v:titles)        AS n_titles
FROM raw_events;`;

  const FLATTEN_SQL = `-- Explode the titles array: one row per (event, title)
SELECT
  v:user_id::NUMBER      AS user_id,
  f.value:id::STRING     AS title_id,
  f.value:pct::FLOAT     AS completion_pct
FROM raw_events,
     LATERAL FLATTEN(input => v:titles) f
WHERE f.value:pct::FLOAT > 0.8;`;

  const SSModule = {
    render(canvas) {
      canvas.innerHTML = '';
      const page = _el('div', 'mod-page');
      const cv = window.SnowflakeViz.CodeViewer;

      page.appendChild(_header(
        'Query & Data',
        'Semi-Structured Data',
        'Snowflake ingests JSON, Parquet, Avro, XML and ORC without a predefined schema, storing it in the VARIANT type — then queries it with ordinary SQL using path, index, and FLATTEN. Netflix lands 1.4B raw watch events/day this way.'
      ));

      // Types
      const tSec = _section('The Three Building Blocks');
      const grid = _el('div', 'ss-grid');
      TYPES.forEach(x => {
        const c = _el('div', 'ss-card');
        c.innerHTML = `<div class="ss-card-type">${x.t}</div><div class="ss-card-desc">${x.d}</div>`;
        grid.appendChild(c);
      });
      tSec.appendChild(grid);
      page.appendChild(tSec);

      // Load
      const lSec = _section('1 · Load raw JSON into VARIANT');
      if (cv) lSec.appendChild(cv.create(LOAD_SQL, 'sql', 'COPY INTO'));
      page.appendChild(lSec);

      // Access
      const aSec = _section('2 · Access nested values (path · index)');
      const info = _el('div', 'info-box');
      info.innerHTML = `<strong>Syntax:</strong> use <code>:</code> to walk keys, <code>.</code> for nested objects, <code>[n]</code> for array elements, and <code>::TYPE</code> to cast. Casting matters — VARIANT values are untyped until you cast them.`;
      aSec.appendChild(info);
      if (cv) aSec.appendChild(cv.create(ACCESS_SQL, 'sql', 'Path access'));
      page.appendChild(aSec);

      // Flatten
      const fSec = _section('3 · FLATTEN arrays into rows');
      if (cv) fSec.appendChild(cv.create(FLATTEN_SQL, 'sql', 'LATERAL FLATTEN'));
      page.appendChild(fSec);

      // Formats
      const fmtSec = _section('Supported File Formats');
      const row = _el('div', 'ss-fmt-row');
      FORMATS.forEach(f => {
        const el = _el('div', 'ss-fmt');
        el.innerHTML = `<div class="ss-fmt-name">${f.n}</div><div class="ss-fmt-sub">${f.s}</div>`;
        row.appendChild(el);
      });
      fmtSec.appendChild(row);
      page.appendChild(fmtSec);

      canvas.appendChild(page);
      return {};
    },
  };

  function _section(title) {
    const s = _el('div', 'mod-section');
    const t = _el('div', 'mod-section-title');
    t.textContent = title;
    s.appendChild(t);
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
  window.SnowflakeViz.Modules.semiStructured = SSModule;
})();
