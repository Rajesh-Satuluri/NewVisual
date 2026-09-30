/* ============================================================
   Security & Governance Module — RBAC hierarchy, Dynamic Data
   Masking, Row Access Policies, Network Policy, Audit Logging
   ============================================================ */

(function () {
  'use strict';

  const AE = () => window.SnowflakeViz.AnimationEngine;

  const ROLES = [
    {
      id: 'accountadmin', name: 'ACCOUNTADMIN', color: '#f56565', level: 0,
      desc: 'Full account control — billing, users, all objects. Reserved for break-glass use only. Netflix locks this behind hardware MFA (YubiKey) with quarterly rotation.',
      privs: 'All privileges',
    },
    {
      id: 'sysadmin', name: 'SYSADMIN', color: '#f97316', level: 1,
      desc: 'Creates and manages all database objects. Assigned to the infrastructure automation service account. Does NOT manage users or roles.',
      privs: 'CREATE DATABASE, WAREHOUSE',
    },
    {
      id: 'securityadmin', name: 'SECURITYADMIN', color: '#e3b341', level: 1,
      desc: 'Manages users, roles, and network policies. Separate from SYSADMIN to enforce least-privilege separation of duties. Used by Netflix InfoSec team.',
      privs: 'CREATE USER, ROLE, NETWORK POLICY',
    },
    {
      id: 'analytics_admin', name: 'ANALYTICS_ADMIN', color: '#a371f7', level: 2,
      desc: 'Manages analytics databases and warehouses. Granted to the BI platform engineering team. Can create objects in ANALYTICS_DB.',
      privs: 'USAGE on ANALYTICS_DB, ANALYTICS_WH',
    },
    {
      id: 'data_eng', name: 'DATA_ENG_ROLE', color: '#3fb950', level: 2,
      desc: 'Owns ingestion pipelines. Full write access to the RAW schema for Snowpipe and transformation jobs. No access to production reporting tables.',
      privs: 'INSERT, UPDATE on RAW schema',
    },
    {
      id: 'content_role', name: 'CONTENT_ROLE', color: '#2dd4bf', level: 2,
      desc: 'Read-only access to content catalog. Used by the content editorial team and studio partner report generation. Sees unmasked content metadata but not user PII.',
      privs: 'SELECT on CONTENT_DB',
    },
    {
      id: 'auditor', name: 'AUDITOR_ROLE', color: '#29b5e8', level: 2,
      desc: 'Read-only access to ACCOUNT_USAGE and ACCESS_HISTORY for compliance auditing. Used by Netflix\'s legal and compliance teams for GDPR and SOC 2 audits.',
      privs: 'SELECT on ACCOUNT_USAGE',
    },
    {
      id: 'analyst', name: 'ANALYST_ROLE', color: '#4ade80', level: 3,
      desc: 'Analytics team role. SELECT only on ANALYTICS_DB views. PII columns (PHONE, EMAIL) are masked by Dynamic Data Masking policy. Row Access Policy limits to US data.',
      privs: 'SELECT on ANALYTICS_DB (masked)',
    },
    {
      id: 'ingest', name: 'INGEST_ROLE', color: '#60a5fa', level: 3,
      desc: 'Snowpipe and Kafka connector service role. INSERT-only on staging tables in the RAW schema. No SELECT privileges — cannot read data it writes.',
      privs: 'INSERT on RAW.WATCH_EVENTS_STAGE',
    },
  ];

  const MASK_DEMO = [
    { user: 'analyst_user_01', role: 'ANALYST_ROLE',  phone: '***-***-8342', email: 'a***@netflix.com', masked: true  },
    { user: 'data_eng_01',     role: 'DATA_ENG_ROLE', phone: '415-555-8342', email: 'alice@netflix.com', masked: false },
    { user: 'admin_svc_01',    role: 'SYSADMIN',      phone: '415-555-8342', email: 'alice@netflix.com', masked: false },
  ];

  const SecurityModule = {
    render(canvas) {
      canvas.innerHTML = '';

      const wrap = _el('div', 'sec-page');
      canvas.appendChild(wrap);

      const hdr = _el('div', 'mod-header');
      hdr.innerHTML = `
        <div class="mod-eyebrow">Platform</div>
        <h1 class="mod-title">Security &amp; Governance</h1>
        <p class="mod-subtitle">Snowflake provides enterprise-grade security built-in: role-based access control, column-level masking, row-level filtering, network policies, and full audit trails — all managed through SQL, no external tooling required.</p>`;
      wrap.appendChild(hdr);

      const layout = _el('div', 'sec-layout');
      wrap.appendChild(layout);

      const left  = _el('div', 'sec-left');
      const right = _el('div', 'sec-right');
      layout.appendChild(left);
      layout.appendChild(right);

      /* ── RBAC Tree ── */
      const treeTitle = _el('div', 'partition-section-title');
      treeTitle.textContent = 'RBAC Role Hierarchy — Click roles to explore';
      left.appendChild(treeTitle);

      const tree = _el('div', 'sec-role-tree');
      tree.id = 'sec-tree';
      ROLES.forEach(r => {
        const node = _el('div', 'sec-role-node');
        node.id = `sec-role-${r.id}`;
        node.setAttribute('data-level', r.level);
        node.style.setProperty('--sec-role-color', r.color);
        node.innerHTML = `
          <span class="sec-role-name">${r.name}</span>
          <span class="sec-role-privs">${r.privs}</span>`;
        node.addEventListener('click', () => _selectRole(ctx, r.id));
        tree.appendChild(node);
      });
      left.appendChild(tree);

      /* ── Masking demo ── */
      const maskTitle = _el('div', 'partition-section-title');
      maskTitle.style.marginTop = '1.5rem';
      maskTitle.textContent = 'Dynamic Data Masking — Same table, different views';
      left.appendChild(maskTitle);

      const maskTable = _el('div', 'sec-mask-table');
      maskTable.id = 'sec-mask';
      maskTable.innerHTML = `
        <div class="sec-mask-head">
          <span>USER</span><span>ROLE</span><span>PHONE_NUMBER</span><span>EMAIL</span>
        </div>
        ${MASK_DEMO.map(row => {
          const roleColor = ROLES.find(r => r.name === row.role)?.color || 'var(--text-secondary)';
          return `<div class="sec-mask-row${row.masked ? ' sec-masked' : ''}">
            <span class="sec-mask-user">${row.user}</span>
            <span class="sec-mask-role" style="color:${roleColor}">${row.role}</span>
            <span class="sec-mask-val sec-pii">${row.phone}</span>
            <span class="sec-mask-val sec-pii">${row.email}</span>
          </div>`;
        }).join('')}`;
      left.appendChild(maskTable);

      /* ── Right side: anim panel ── */
      const panel = _el('div', 'anim-panel');
      panel.id = 'sec-panel';
      panel.innerHTML = `
        <div class="anim-panel-step-num" id="secpanel-step">Overview</div>
        <div class="anim-panel-title"    id="secpanel-title">Security &amp; Governance</div>
        <div class="anim-panel-body"     id="secpanel-body">Press Play for a guided walkthrough, or click any role node in the hierarchy to explore its privileges.</div>
        <div class="anim-panel-facts"    id="secpanel-facts"></div>`;
      right.appendChild(panel);

      /* Policy SQL box */
      const policyTitle = _el('div', 'partition-section-title');
      policyTitle.style.marginTop = '1.25rem';
      policyTitle.textContent = 'Active Policies';
      right.appendChild(policyTitle);

      const policyBox = _el('pre', 'adv-code-box');
      policyBox.id = 'sec-policy';
      policyBox.innerHTML = '<code>-- Click a role or press Play to see active policies…</code>';
      right.appendChild(policyBox);

      const ctx = { container: canvas, panel, policyBox };
      const engine = new (AE())({ steps: _buildSteps(ctx), speed: 1 });
      engine.setContext(ctx);
      window.SnowflakeViz.AnimationControls.register(engine);

      return { destroy: () => engine.destroy() };
    },
  };

  function _selectRole(ctx, id) {
    const role = ROLES.find(r => r.id === id);
    if (!role) return;
    ctx.container.querySelectorAll('.sec-role-node').forEach(el => el.classList.remove('sec-active'));
    const node = ctx.container.querySelector(`#sec-role-${id}`);
    if (node) node.classList.add('sec-active');
    _setPanel(ctx, role.name, role.name, role.desc, [
      `Hierarchy level: ${role.level === 0 ? 'Root' : role.level}`,
      `Default privileges: ${role.privs}`,
    ]);
  }

  function _setPanel(ctx, step, title, body, facts = []) {
    const p = ctx.panel;
    if (!p) return;
    p.querySelector('#secpanel-step').textContent  = step;
    p.querySelector('#secpanel-title').textContent = title;
    p.querySelector('#secpanel-body').innerHTML    = body;
    p.querySelector('#secpanel-facts').innerHTML   = facts.map(f => `<div class="anim-panel-fact">${f}</div>`).join('');
    p.classList.add('highlighted');
  }

  function _activateRoles(ctx, ids) {
    ctx.container.querySelectorAll('.sec-role-node').forEach(el => el.classList.remove('sec-active'));
    ids.forEach(id => {
      const el = ctx.container.querySelector(`#sec-role-${id}`);
      if (el) el.classList.add('sec-active');
    });
  }

  function _resetAll(ctx) {
    ctx.container.querySelectorAll('.sec-role-node').forEach(el => el.classList.remove('sec-active'));
    ctx.panel?.classList.remove('highlighted');
    if (ctx.policyBox) ctx.policyBox.innerHTML = '<code>-- Click a role or press Play to see active policies…</code>';
  }

  function _policy(ctx, sql) {
    if (ctx.policyBox) ctx.policyBox.innerHTML = `<code>${_esc(sql)}</code>`;
  }

  function _buildSteps(ctx) {
    const F = AE().fnStep;
    return [
      F('Overview', 'Defense-in-depth security model',
        c => {
          _resetAll(c);
          _setPanel(c, 'Step 1 of 7', 'Security & Governance',
            'Snowflake security is built in layers: network isolation → authentication (SSO/MFA) → role-based access → column-level masking → row-level filtering → full audit logging. Netflix applies all layers to protect 238M subscribers\' data.',
            [
              'Network: IP allow-list, AWS PrivateLink endpoint isolation',
              'Auth: Okta SSO + MFA required for all human access',
              'RBAC: 9-role hierarchy, strict least-privilege principle',
              'Data: dynamic masking on PII, row access by region',
            ]);
        }, _resetAll, 3000),

      F('ACCOUNTADMIN', 'Root role — break-glass only',
        c => {
          _resetAll(c);
          _activateRoles(c, ['accountadmin']);
          _setPanel(c, 'Step 2 of 7', 'ACCOUNTADMIN — Root Role',
            'ACCOUNTADMIN is the highest-privilege role in Snowflake. It inherits all other role privileges and controls billing, users, and account-level settings. Netflix locks it behind hardware MFA and uses it only for emergency break-glass scenarios.',
            [
              'Never used for day-to-day operations — emergency use only',
              'Inherits all privileges from every role in the hierarchy',
              'Requires: YubiKey hardware MFA for all Netflix admins',
              'Separation: SYSADMIN for objects, SECURITYADMIN for users',
            ]);
          _policy(c, `-- ACCOUNTADMIN best practices (Netflix pattern)
-- 1. Never grant ACCOUNTADMIN to service accounts
-- 2. Use SECURITYADMIN for user/role management
-- 3. Use SYSADMIN for database/warehouse management
-- 4. Rotate credentials quarterly with hardware MFA

-- Audit who is ACCOUNTADMIN
SELECT GRANTEE_NAME
FROM SNOWFLAKE.ACCOUNT_USAGE.GRANTS_TO_USERS
WHERE ROLE = 'ACCOUNTADMIN'
  AND DELETED_ON IS NULL;`);
        }, _resetAll, 3500),

      F('Separation of Duties', 'SYSADMIN vs SECURITYADMIN',
        c => {
          _resetAll(c);
          _activateRoles(c, ['sysadmin', 'securityadmin']);
          _setPanel(c, 'Step 3 of 7', 'Separation of Duties',
            'Snowflake recommends separating infrastructure (SYSADMIN) from access management (SECURITYADMIN). Netflix enforces this: the data platform team uses SYSADMIN; InfoSec uses SECURITYADMIN. No single person holds both.',
            [
              'SYSADMIN: creates databases, warehouses, stages, pipes',
              'SECURITYADMIN: creates users, roles, network policies',
              'Principle: no single person has SYSADMIN + SECURITYADMIN',
              'AUDITOR_ROLE: read-only ACCOUNT_USAGE for compliance',
            ]);
          _policy(c, `-- Create a new analyst user (run as SECURITYADMIN)
USE ROLE SECURITYADMIN;
CREATE USER analyst_new
  DEFAULT_ROLE      = ANALYST_ROLE
  DEFAULT_WAREHOUSE = ANALYTICS_WH
  MUST_CHANGE_PASSWORD = TRUE;
GRANT ROLE ANALYST_ROLE TO USER analyst_new;

-- Create analytics database (run as SYSADMIN)
USE ROLE SYSADMIN;
CREATE DATABASE IF NOT EXISTS ANALYTICS_DB;
GRANT OWNERSHIP ON DATABASE ANALYTICS_DB
  TO ROLE ANALYTICS_ADMIN;`);
        }, _resetAll, 3500),

      F('ANALYST_ROLE', 'Least-privilege read-only access',
        c => {
          _resetAll(c);
          _activateRoles(c, ['analyst', 'analytics_admin']);
          _setPanel(c, 'Step 4 of 7', 'ANALYST_ROLE — Least Privilege',
            'ANALYST_ROLE has SELECT on analytics tables only — but PII columns are masked by policy, and a Row Access Policy limits queries to US data. Analysts see meaningful data without touching raw PII or non-US subscriber records.',
            [
              'SELECT on ANALYTICS_DB reporting views and tables only',
              'No direct access to raw WATCH_EVENTS in EVENTS_DB.RAW',
              'PHONE_NUMBER, EMAIL: Dynamic Masking → *** for ANALYST_ROLE',
              'Row Access Policy: ANALYST_ROLE auto-filtered to COUNTRY = US',
            ]);
          _policy(c, `-- ANALYST_ROLE privilege grants
GRANT USAGE ON DATABASE ANALYTICS_DB  TO ROLE ANALYST_ROLE;
GRANT USAGE ON SCHEMA ANALYTICS_DB.REPORTING
                                       TO ROLE ANALYST_ROLE;
GRANT SELECT ON ALL TABLES
  IN SCHEMA ANALYTICS_DB.REPORTING     TO ROLE ANALYST_ROLE;

-- What ANALYST_ROLE CANNOT do:
-- ✗  SELECT on EVENTS_DB.RAW (contains raw PII)
-- ✗  INSERT / UPDATE / DELETE on any table
-- ✗  USAGE on DATA_ENG or INGEST warehouses
-- ✗  CREATE TABLE / VIEW / SCHEMA`);
        }, _resetAll, 3500),

      F('Dynamic Data Masking', 'PII protected at column level',
        c => {
          _resetAll(c);
          _activateRoles(c, ['analyst']);
          _setPanel(c, 'Step 5 of 7', 'Dynamic Data Masking',
            'Masking policies are SQL functions attached to columns. When ANALYST_ROLE queries PHONE_NUMBER, the policy returns "***-***-8342". SYSADMIN sees the real value. Zero application code changes needed — the mask is enforced in Cloud Services.',
            [
              'Policy function: IF role IN (SYSADMIN, DATA_ENG_ROLE) THEN real ELSE mask',
              'Transparent: analyst query SQL is unchanged — policy fires in CS layer',
              'No performance impact: masking evaluated in Cloud Services, not warehouse',
              'Netflix: 8 masking policies across PII columns in WATCH_EVENTS',
            ]);
          _policy(c, `-- Create dynamic masking policy
CREATE OR REPLACE MASKING POLICY phone_mask
  AS (val VARCHAR) RETURNS VARCHAR ->
  CASE
    WHEN CURRENT_ROLE() IN ('SYSADMIN','ACCOUNTADMIN') THEN val
    WHEN CURRENT_ROLE() = 'DATA_ENG_ROLE'              THEN val
    ELSE REGEXP_REPLACE(val, '\\d(?=\\d{4})', '*')
  END;

-- Attach masking policy to PHONE_NUMBER column
ALTER TABLE EVENTS_DB.RAW.WATCH_EVENTS
  MODIFY COLUMN PHONE_NUMBER
  SET MASKING POLICY phone_mask;

-- ANALYST_ROLE sees:  ***-***-8342
-- SYSADMIN sees:      415-555-8342`);
        }, _resetAll, 4000),

      F('Row Access Policy', 'Automatic row-level filtering by role',
        c => {
          _resetAll(c);
          _activateRoles(c, ['analyst', 'sysadmin']);
          _setPanel(c, 'Step 6 of 7', 'Row Access Policy',
            'A Row Access Policy adds a WHERE clause automatically based on the querying role. ANALYST_ROLE sees only US subscribers; SYSADMIN sees all 238M globally. Analysts write no COUNTRY filter — the policy enforces data residency compliance.',
            [
              'ANALYST_ROLE: WHERE COUNTRY = \'US\' auto-applied → 45M rows',
              'SYSADMIN: no policy filter applied → 238M rows (all regions)',
              'Transparent: analysts write no COUNTRY predicate themselves',
              'Netflix: regional data residency compliance via Row Access Policy',
            ]);
          _policy(c, `-- Create Row Access Policy for regional compliance
CREATE OR REPLACE ROW ACCESS POLICY region_access
  AS (country VARCHAR) RETURNS BOOLEAN ->
  CASE
    WHEN CURRENT_ROLE() IN ('SYSADMIN','ACCOUNTADMIN') THEN TRUE
    WHEN CURRENT_ROLE() = 'ANALYST_ROLE'   THEN country = 'US'
    WHEN CURRENT_ROLE() = 'CONTENT_ROLE'
      THEN country IN ('US','CA','GB','AU')
    ELSE FALSE
  END;

-- Attach to WATCH_EVENTS
ALTER TABLE EVENTS_DB.RAW.WATCH_EVENTS
  ADD ROW ACCESS POLICY region_access ON (COUNTRY);`);
        }, _resetAll, 4000),

      F('Network Policy & Audit', 'IP allow-lists and full audit trail',
        c => {
          _resetAll(c);
          _activateRoles(c, ['accountadmin', 'securityadmin', 'auditor']);
          _setPanel(c, 'Step 7 of 7', 'Network Policy & Audit Logging',
            'Netflix restricts Snowflake access to corporate VPN IPs and AWS PrivateLink endpoints. Every query — including metadata operations — generates ACCESS_HISTORY records, satisfying SOC 2 Type II and GDPR audit requirements.',
            [
              'Network policy: allow-list of 47 CIDR ranges (VPN + PrivateLink)',
              'ACCESS_HISTORY: which users accessed which columns and when',
              'QUERY_HISTORY: 90-day retention, full query text, execution stats',
              'GDPR compliance: ACCESS_HISTORY proves data minimization',
            ]);
          _policy(c, `-- Account-wide network policy
CREATE OR REPLACE NETWORK POLICY netflix_policy
  ALLOWED_IP_LIST = (
    '10.0.0.0/8',      -- Corporate VPN
    '172.16.0.0/12',   -- AWS PrivateLink
    '192.168.1.0/24'   -- Break-glass office
  );
ALTER ACCOUNT SET NETWORK_POLICY = netflix_policy;

-- Who accessed PHONE_NUMBER today? (GDPR audit)
SELECT USER_NAME, ROLE_NAME, QUERY_START_TIME
FROM SNOWFLAKE.ACCOUNT_USAGE.ACCESS_HISTORY,
  LATERAL FLATTEN(BASE_OBJECTS_ACCESSED) f
WHERE f.value:objectName::STRING
      LIKE '%WATCH_EVENTS%'
  AND QUERY_START_TIME >= CURRENT_DATE
ORDER BY QUERY_START_TIME DESC;`);
        }, _resetAll, 4000),
    ];
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
  window.SnowflakeViz.Modules.security = SecurityModule;
})();
