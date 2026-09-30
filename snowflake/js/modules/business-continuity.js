/* ============================================================
   Business Continuity Module — data protection ladder,
   replication, failover/failback, and client redirect.
   ============================================================ */

(function () {
  'use strict';

  const LADDER = [
    { n: 'Time Travel', d: 'Query/restore a table as of a past point (up to 90 days on Enterprise). First line of defense against bad DML.' },
    { n: 'Fail-Safe', d: 'A further 7-day, non-queryable recovery period after Time Travel — recoverable only by Snowflake Support.' },
    { n: 'Database Replication', d: 'Continuously replicate databases to another account/region/cloud for a warm standby copy.' },
    { n: 'Failover / Failback', d: 'Promote the replica to primary during an outage; fail back when the region recovers. Business Critical edition.' },
    { n: 'Client Redirect', d: 'A connection URL that points clients at whichever account is currently primary — failover without changing app config.' },
  ];

  const REPL_SQL = `-- Replicate a database to a second region and enable failover
ALTER DATABASE analytics_db ENABLE REPLICATION
  TO ACCOUNTS myorg.prod_eu;

-- On the secondary account: refresh the replica
CREATE DATABASE analytics_db AS REPLICA OF myorg.prod_us.analytics_db;
ALTER DATABASE analytics_db REFRESH;

-- Failover group + client redirect for seamless promotion
CREATE FAILOVER GROUP fg
  OBJECT_TYPES = DATABASES, ROLES
  ALLOWED_DATABASES = analytics_db
  ALLOWED_ACCOUNTS = myorg.prod_us, myorg.prod_eu;`;

  const M = {
    render(canvas) {
      canvas.innerHTML = '';
      const page = _el('div', 'mod-page');
      const cv = window.SnowflakeViz.CodeViewer;

      page.appendChild(_header(
        'Platform',
        'Business Continuity',
        'From an accidental DELETE to a full region outage, Snowflake layers protection: Time Travel → Fail-Safe → cross-region replication → failover. Netflix keeps EU and US accounts in sync so a regional failure never takes analytics down.'
      ));

      const lSec = _section('The Data Protection Ladder');
      const grid = _el('div', 'ss-grid');
      LADDER.forEach(x => {
        const c = _el('div', 'ss-card');
        c.innerHTML = `<div class="ss-card-type">${x.n}</div><div class="ss-card-desc">${x.d}</div>`;
        grid.appendChild(c);
      });
      lSec.appendChild(grid);
      const info = _el('div', 'info-box');
      info.innerHTML = `<strong>Match the tool to the failure:</strong> Time Travel for human error (dropped table, bad update), Fail-Safe for "we noticed too late", and replication + failover for infrastructure/region loss. Only replication protects against a whole-region outage.`;
      lSec.appendChild(info);
      page.appendChild(lSec);

      const rSec = _section('Replication & Failover');
      if (cv) rSec.appendChild(cv.create(REPL_SQL, 'sql', 'Cross-region DR'));
      page.appendChild(rSec);

      canvas.appendChild(page);
      return {};
    },
  };

  function _section(t) { const s = _el('div', 'mod-section'); const h = _el('div', 'mod-section-title'); h.textContent = t; s.appendChild(h); return s; }
  function _header(e, t, sub) { const h = _el('div', 'mod-header'); h.innerHTML = `<div class="mod-eyebrow">${e}</div><h1 class="mod-title">${t}</h1><p class="mod-subtitle">${sub}</p>`; return h; }
  function _el(tag, cls) { const el = document.createElement(tag); if (cls) el.className = cls; return el; }

  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Modules = window.SnowflakeViz.Modules || {};
  window.SnowflakeViz.Modules.businessContinuity = M;
})();
