/* ============================================================
   RBAC Module — Snowflake role hierarchy & access control
   System roles, inheritance, grants, and Netflix role design.
   ============================================================ */

(function () {
  'use strict';

  // Canonical system-role tiers (top = most privileged).
  const TIERS = [
    [{ name: 'ORGADMIN', cls: 'sys', desc: 'Manages the organization: accounts, regions, and org-level settings.' }],
    [{ name: 'ACCOUNTADMIN', cls: 'sys', desc: 'Top of the account. Contains SECURITYADMIN + SYSADMIN. Use rarely; never for day-to-day work.' }],
    [
      { name: 'SECURITYADMIN', cls: 'sys', desc: 'Manages grants globally; contains USERADMIN. Can monitor and manage any grant.' },
      { name: 'SYSADMIN', cls: 'sys', desc: 'Creates/owns databases, schemas, warehouses. Custom roles should roll up to here.' },
    ],
    [
      { name: 'USERADMIN', cls: 'sys', desc: 'Creates and manages users and roles (but not arbitrary grants).' },
      { name: 'ANALYTICS_ROLE', cls: 'custom', desc: 'Read ENGAGEMENT_DB + CONTENT_DB via ANALYTICS_WH.' },
      { name: 'ML_ROLE', cls: 'custom', desc: 'Read/write RECOMMENDATIONS_DB via ML_TRAINING_WH.' },
    ],
    [{ name: 'PUBLIC', cls: 'public', desc: 'Automatically granted to every role/user. Objects here are visible to everyone.' }],
  ];

  const GRANTS_SQL = `-- Privileges are granted to ROLES, roles are granted to USERS/ROLES.
CREATE ROLE analytics_role;

-- Object privileges → role
GRANT USAGE   ON DATABASE engagement_db      TO ROLE analytics_role;
GRANT USAGE   ON WAREHOUSE analytics_wh      TO ROLE analytics_role;
GRANT SELECT  ON ALL TABLES IN SCHEMA
      engagement_db.public                   TO ROLE analytics_role;

-- Role → role (build the hierarchy: custom roles roll up to SYSADMIN)
GRANT ROLE analytics_role TO ROLE sysadmin;

-- Role → user
GRANT ROLE analytics_role TO USER jdoe;

-- A user activates one role at a time
USE ROLE analytics_role;`;

  const RBACModule = {
    render(canvas, { concepts }) {
      canvas.innerHTML = '';
      const page = _el('div', 'mod-page');

      page.appendChild(_header(
        'Security & Governance',
        'RBAC & Role Hierarchy',
        'Snowflake access control is role-based: privileges are granted to roles, and roles are granted to users and to other roles. A user inherits every privilege of the role tree beneath their active role.'
      ));

      /* System hierarchy */
      const hSec = _section('System Role Hierarchy');
      const hier = _el('div', 'rbac-hierarchy');
      TIERS.forEach((tier, i) => {
        if (i > 0) hier.appendChild(_el('div', 'rbac-connector'));
        const row = _el('div', 'rbac-tier');
        tier.forEach(r => {
          const node = _el('div', 'rbac-node ' + r.cls);
          node.innerHTML = `<div class="rbac-node-name">${r.name}</div><div class="rbac-node-desc">${r.desc}</div>`;
          row.appendChild(node);
        });
        hier.appendChild(row);
      });
      hSec.appendChild(hier);
      const note = _el('div', 'rbac-flow-note');
      note.textContent = 'Privileges flow UP: a higher role inherits everything its child roles can do.';
      hSec.appendChild(note);
      page.appendChild(hSec);

      /* Key principle */
      const kSec = _section('The Golden Rules');
      const info = _el('div', 'info-box');
      info.innerHTML = `<strong>Design principle:</strong> create custom roles for job functions (not people), grant them the minimum object privileges they need, and <em>grant every custom role to <code>SYSADMIN</code></em> so administrators retain visibility. Never build daily workflows on <code>ACCOUNTADMIN</code>. Separate duties: <code>SYSADMIN</code> owns objects, <code>SECURITYADMIN</code>/<code>USERADMIN</code> manage identity and grants.`;
      kSec.appendChild(info);
      page.appendChild(kSec);

      /* Netflix role design (from data if available) */
      const roles = (concepts && concepts.security && concepts.security.roles) || [];
      if (roles.length) {
        const nSec = _section('Netflix Role Design');
        const grid = _el('div', 'ss-grid');
        roles.forEach(r => {
          const card = _el('div', 'ss-card');
          card.innerHTML = `<div class="ss-card-type">${r.name}</div><div class="ss-card-desc">${r.desc}</div>`;
          grid.appendChild(card);
        });
        nSec.appendChild(grid);
        page.appendChild(nSec);
      }

      /* Grants in SQL */
      const gSec = _section('Grants in SQL');
      const cv = window.SnowflakeViz.CodeViewer;
      if (cv) gSec.appendChild(cv.create(GRANTS_SQL, 'sql', 'Building a role'));
      page.appendChild(gSec);

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
  window.SnowflakeViz.Modules.rbac = RBACModule;
})();
