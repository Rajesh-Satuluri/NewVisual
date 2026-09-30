/* ============================================================
   Apps Platform Module — building on Snowflake: Streamlit,
   Native Apps, Snowpark Container Services, UDFs & procedures.
   ============================================================ */

(function () {
  'use strict';

  const CARDS = [
    { n: 'Streamlit in Snowflake', d: 'Build interactive Python data apps that run inside Snowflake, next to the data, with governed access — no separate app server.' },
    { n: 'Native Apps Framework', d: 'Package data + logic (procs, Streamlit, models) into an installable app and distribute/monetize it on the Marketplace.' },
    { n: 'Snowpark Container Services', d: 'Run any containerized workload (services, jobs, even GPUs) fully managed inside Snowflake\'s perimeter.' },
    { n: 'UDFs & Stored Procedures', d: 'Extend SQL with Python/Java/Scala/JavaScript functions and procedural logic that execute on warehouse compute.' },
  ];

  const STREAMLIT_SQL = `-- A Streamlit app object lives in a schema and runs on a warehouse
CREATE STREAMLIT reco_explorer
  ROOT_LOCATION = '@apps_stage/reco_explorer'
  MAIN_FILE = 'app.py'
  QUERY_WAREHOUSE = analytics_wh;

-- A Python UDF, callable from SQL
CREATE FUNCTION to_upper(s STRING)
  RETURNS STRING LANGUAGE PYTHON RUNTIME_VERSION=3.10
  HANDLER='f' AS $$
def f(s): return s.upper()
$$;
SELECT to_upper(title) FROM movies;`;

  const M = {
    render(canvas) {
      canvas.innerHTML = '';
      const page = _el('div', 'mod-page');
      const cv = window.SnowflakeViz.CodeViewer;

      page.appendChild(_header(
        'Platform',
        'Apps on Snowflake',
        'Snowflake is not just a warehouse you query — it\'s a platform you build on. Bring the application to the data: Streamlit dashboards, distributable Native Apps, containerized services, and UDFs, all governed by the same RBAC.'
      ));

      const cSec = _section('Ways to Build');
      const grid = _el('div', 'ss-grid');
      CARDS.forEach(x => {
        const c = _el('div', 'ss-card');
        c.innerHTML = `<div class="ss-card-type">${x.n}</div><div class="ss-card-desc">${x.d}</div>`;
        grid.appendChild(c);
      });
      cSec.appendChild(grid);
      const info = _el('div', 'info-box');
      info.innerHTML = `<strong>Why build in Snowflake?</strong> Code runs next to the data inside the security perimeter — no data egress, no separate app infrastructure to secure, and the same roles/masking/row policies apply automatically.`;
      cSec.appendChild(info);
      page.appendChild(cSec);

      const sSec = _section('Streamlit App + Python UDF');
      if (cv) sSec.appendChild(cv.create(STREAMLIT_SQL, 'sql', 'Build on Snowflake'));
      page.appendChild(sSec);

      canvas.appendChild(page);
      return {};
    },
  };

  function _section(t) { const s = _el('div', 'mod-section'); const h = _el('div', 'mod-section-title'); h.textContent = t; s.appendChild(h); return s; }
  function _header(e, t, sub) { const h = _el('div', 'mod-header'); h.innerHTML = `<div class="mod-eyebrow">${e}</div><h1 class="mod-title">${t}</h1><p class="mod-subtitle">${sub}</p>`; return h; }
  function _el(tag, cls) { const el = document.createElement(tag); if (cls) el.className = cls; return el; }

  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Modules = window.SnowflakeViz.Modules || {};
  window.SnowflakeViz.Modules.apps = M;
})();
