/* ============================================================
   Reference Module — searchable glossary + printable SQL
   cheat sheet.
   ============================================================ */

(function () {
  'use strict';

  const GLOSSARY = [
    ['Account', 'Your Snowflake instance in a region/cloud; top of the object hierarchy below Organization.'],
    ['Virtual Warehouse', 'An independent compute cluster that executes queries and loads data. Sizes XS→6XL.'],
    ['Micro-partition', 'Immutable ~50–500 MB columnar file with per-column min/max metadata; the unit of pruning.'],
    ['Pruning', 'Skipping micro-partitions that cannot match a query\'s WHERE clause, using metadata only.'],
    ['Clustering Key', 'Optional column(s) used to co-locate data on very large tables to keep pruning effective.'],
    ['Result Cache', 'Cloud-Services cache of a query\'s exact result for 24h; identical queries return instantly.'],
    ['Auto-Suspend', 'Stops a warehouse after idle time so you stop paying for compute.'],
    ['Multi-cluster', 'A warehouse that adds/removes clusters to absorb concurrent query load (scale out).'],
    ['Credit', 'The unit of compute billing; credits/hour double with each warehouse size.'],
    ['Resource Monitor', 'A credit budget with NOTIFY/SUSPEND triggers attached to warehouses.'],
    ['VARIANT', 'Universal semi-structured type holding JSON, objects, arrays, or scalars.'],
    ['FLATTEN', 'Table function that expands an array/object into one row per element.'],
    ['Stage', 'A location holding files for load/unload — internal (Snowflake-managed) or external (your bucket).'],
    ['Snowpipe', 'Serverless, event-driven micro-batch loading of files as they arrive.'],
    ['Stream', 'A change-tracking cursor over a table (CDC): the rows changed since last read.'],
    ['Task', 'Scheduled or DAG-based SQL execution, often paired with Streams.'],
    ['Dynamic Table', 'Declarative, incrementally-refreshed table with a TARGET_LAG freshness goal.'],
    ['Time Travel', 'Query a table as of a past point within its retention window (up to 90 days).'],
    ['Fail-Safe', 'Non-queryable 7-day recovery period after Time Travel; Snowflake Support only.'],
    ['Zero-Copy Clone', 'Instant clone that shares micro-partitions; you pay only for changes.'],
    ['RBAC', 'Role-Based Access Control: privileges → roles → users/roles.'],
    ['Masking Policy', 'Dynamically transforms a column\'s output based on the querying role.'],
    ['Row Access Policy', 'Restricts which rows a role can see.'],
    ['Secure Data Share', 'Live, zero-copy sharing of objects with other accounts.'],
    ['Reader Account', 'Provider-managed account that lets non-Snowflake consumers query a share.'],
    ['Snowpark', 'Python/Java/Scala DataFrame API that runs inside Snowflake compute.'],
  ];

  const CHEATS = [
    { title: 'Warehouses', lang: 'sql', code: `CREATE WAREHOUSE wh WITH WAREHOUSE_SIZE='MEDIUM'
  AUTO_SUSPEND=60 AUTO_RESUME=TRUE
  MIN_CLUSTER_COUNT=1 MAX_CLUSTER_COUNT=3;
ALTER WAREHOUSE wh SET WAREHOUSE_SIZE='LARGE';
USE WAREHOUSE wh;` },
    { title: 'Loading', lang: 'sql', code: `COPY INTO tbl FROM @stage
  FILE_FORMAT=(TYPE=PARQUET);
-- semi-structured
SELECT v:user_id::NUMBER, f.value:id::STRING
FROM raw, LATERAL FLATTEN(input => v:items) f;` },
    { title: 'Time Travel & Clone', lang: 'sql', code: `SELECT * FROM t AT (OFFSET => -3600);        -- 1h ago
CREATE TABLE t_restore CLONE t
  BEFORE (STATEMENT => '<query_id>');
CREATE DATABASE dev CLONE prod;              -- zero-copy` },
    { title: 'RBAC', lang: 'sql', code: `CREATE ROLE analyst;
GRANT USAGE ON WAREHOUSE wh TO ROLE analyst;
GRANT SELECT ON ALL TABLES IN SCHEMA db.public TO ROLE analyst;
GRANT ROLE analyst TO ROLE sysadmin;
GRANT ROLE analyst TO USER jdoe;` },
  ];

  const RefModule = {
    render(canvas) {
      canvas.innerHTML = '';
      const page = _el('div', 'mod-page');
      const cv = window.SnowflakeViz.CodeViewer;

      const header = _el('div', 'mod-header');
      header.innerHTML = `<div class="mod-eyebrow">Reference</div>
        <h1 class="mod-title">Glossary & Cheat Sheet</h1>
        <p class="mod-subtitle">Every key term in one place, plus a printable SQL quick-reference. Use ⌘K to jump anywhere; use Print to save the cheat sheet as PDF.</p>`;
      const printBtn = _el('button', 'btn btn-ghost ref-print');
      printBtn.textContent = '🖨️ Print / Save PDF';
      printBtn.addEventListener('click', () => window.print());
      header.appendChild(printBtn);
      page.appendChild(header);

      /* Glossary */
      const gSec = _section('Glossary');
      const search = _el('input', 'ref-search');
      search.type = 'search';
      search.placeholder = 'Filter terms…';
      gSec.appendChild(search);
      const listEl = _el('div', 'ref-glossary');
      GLOSSARY.slice().sort((a, b) => a[0].localeCompare(b[0])).forEach(([term, def]) => {
        const row = _el('div', 'ref-term');
        row.innerHTML = `<div class="ref-term-name">${_esc(term)}</div><div class="ref-term-def">${_esc(def)}</div>`;
        listEl.appendChild(row);
      });
      search.addEventListener('input', () => {
        const q = search.value.toLowerCase();
        listEl.querySelectorAll('.ref-term').forEach(r => {
          r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none';
        });
      });
      gSec.appendChild(listEl);
      page.appendChild(gSec);

      /* Cheat sheet */
      const cSec = _section('SQL Cheat Sheet');
      cSec.classList.add('ref-cheats');
      const grid = _el('div', 'ref-cheat-grid');
      CHEATS.forEach(c => {
        const cell = _el('div', 'ref-cheat');
        const h = _el('div', 'ref-cheat-title'); h.textContent = c.title; cell.appendChild(h);
        if (cv) cell.appendChild(cv.create(c.code, c.lang, c.title));
        grid.appendChild(cell);
      });
      cSec.appendChild(grid);
      page.appendChild(cSec);

      canvas.appendChild(page);
      return {};
    },
  };

  function _section(title) {
    const s = _el('div', 'mod-section');
    const t = _el('div', 'mod-section-title'); t.textContent = title; s.appendChild(t);
    return s;
  }
  function _esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function _el(tag, cls) { const el = document.createElement(tag); if (cls) el.className = cls; return el; }

  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Modules = window.SnowflakeViz.Modules || {};
  window.SnowflakeViz.Modules.reference = RefModule;
})();
