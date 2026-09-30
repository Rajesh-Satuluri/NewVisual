/* ============================================================
   Cloud Services Module — the always-on brain of Snowflake
   6 sub-services, 9-step query-flow animation
   ============================================================ */

(function () {
  'use strict';

  const AE = () => window.SnowflakeViz.AnimationEngine;

  const COMPONENTS = [
    {
      id: 'auth',
      icon: '🔐',
      name: 'Authentication & Authorization',
      desc: 'SSO, MFA, SCIM provisioning. Role-based access control evaluates every object privilege at query time — no warehouse needed.',
      color: '#a371f7',
    },
    {
      id: 'metadata',
      icon: '📊',
      name: 'Metadata Catalog',
      desc: 'In-memory store of partition min/max stats, table schemas, object definitions, and clustering info. Enables pruning with zero I/O.',
      color: '#29b5e8',
    },
    {
      id: 'optimizer',
      icon: '🧠',
      name: 'Query Optimizer',
      desc: 'Cost-based optimizer: predicate push-down, join reordering, subquery flattening, partition pruning decisions — all before the warehouse starts.',
      color: '#f97316',
    },
    {
      id: 'compiler',
      icon: '⚙️',
      name: 'Query Compiler',
      desc: 'Translates the optimized logical plan into a physical execution plan (bytecode). Sent to the virtual warehouse for execution.',
      color: '#e3b341',
    },
    {
      id: 'txn',
      icon: '🔄',
      name: 'Transaction Manager',
      desc: 'Serializable snapshot isolation: reads see a consistent snapshot; writes are atomic. ACID across all DML — INSERT, UPDATE, DELETE, MERGE.',
      color: '#3fb950',
    },
    {
      id: 'monitor',
      icon: '📈',
      name: 'Monitoring & Logging',
      desc: 'QUERY_HISTORY, ACCESS_HISTORY, ACCOUNT_USAGE schema. Stores performance metrics for every query ever run — without warehouse credits.',
      color: '#2dd4bf',
    },
  ];

  const CloudServicesModule = {
    render(canvas) {
      canvas.innerHTML = '';

      const wrap = _el('div', 'cs-page');
      canvas.appendChild(wrap);

      const hdr = _el('div', 'mod-header');
      hdr.innerHTML = `
        <div class="mod-eyebrow">Architecture</div>
        <h1 class="mod-title">Cloud Services Layer</h1>
        <p class="mod-subtitle">Cloud Services is Snowflake's always-on brain — running 24/7 on Snowflake-managed compute. It handles authentication, metadata, query optimization, and transaction management entirely without a virtual warehouse.</p>`;
      wrap.appendChild(hdr);

      /* Always-on badge */
      const badge = _el('div', 'cs-always-on-badge');
      badge.innerHTML = '⚡ Always-on — no warehouse required — billed as % of compute';
      wrap.appendChild(badge);

      const layout = _el('div', 'cs-layout');
      wrap.appendChild(layout);

      const left  = _el('div', 'cs-left');
      const right = _el('div', 'cs-right');
      layout.appendChild(left);
      layout.appendChild(right);

      /* ── Component grid ── */
      const compTitle = _el('div', 'partition-section-title');
      compTitle.textContent = 'Cloud Services Components — Click to Highlight';
      left.appendChild(compTitle);

      const grid = _el('div', 'cs-comp-grid');
      COMPONENTS.forEach(c => {
        const card = _el('div', 'cs-comp-card');
        card.id = `cs-comp-${c.id}`;
        card.style.setProperty('--cs-color', c.color);
        card.innerHTML = `
          <div class="cs-comp-header">
            <span class="cs-comp-icon">${c.icon}</span>
            <span class="cs-comp-name">${c.name}</span>
          </div>
          <div class="cs-comp-desc">${c.desc}</div>`;
        card.addEventListener('click', () => {
          grid.querySelectorAll('.cs-comp-card').forEach(el => el.classList.remove('selected'));
          card.classList.toggle('selected');
        });
        grid.appendChild(card);
      });
      left.appendChild(grid);

      /* ── Activity log ── */
      const logTitle = _el('div', 'partition-section-title');
      logTitle.style.marginTop = '1.5rem';
      logTitle.textContent = 'Cloud Services Activity Log';
      left.appendChild(logTitle);

      const log = _el('div', 'cs-activity-log');
      log.id = 'cs-log';
      log.innerHTML = '<div class="cs-log-empty">Activity appears here during animation…</div>';
      left.appendChild(log);

      /* ── Right: anim panel + stats ── */
      const panel = _el('div', 'anim-panel');
      panel.id = 'cs-panel';
      panel.innerHTML = `
        <div class="anim-panel-step-num" id="cspanel-step">Overview</div>
        <div class="anim-panel-title"    id="cspanel-title">Cloud Services</div>
        <div class="anim-panel-body"     id="cspanel-body">Press Play to see what happens inside Cloud Services when Netflix's Tableau dashboard fires a query — before the virtual warehouse even starts.</div>
        <div class="anim-panel-facts"    id="cspanel-facts"></div>`;
      right.appendChild(panel);

      /* stats */
      const statsTitle = _el('div', 'partition-section-title');
      statsTitle.style.marginTop = '1.5rem';
      statsTitle.textContent = 'Cloud Services Metrics';
      right.appendChild(statsTitle);

      const stats = _el('div', 'cs-stats');
      stats.innerHTML = `
        <div class="cs-stat"><div class="cs-stat-val" id="css-uptime">24/7</div><div class="cs-stat-lbl">Availability</div></div>
        <div class="cs-stat"><div class="cs-stat-val" id="css-time">~21ms</div><div class="cs-stat-lbl">Avg CS Overhead</div></div>
        <div class="cs-stat"><div class="cs-stat-val" id="css-cost">10%</div><div class="cs-stat-lbl">Of Compute Cost</div></div>`;
      right.appendChild(stats);

      /* ── What Cloud Services Does NOT need a warehouse for ── */
      const noWhTitle = _el('div', 'partition-section-title');
      noWhTitle.style.marginTop = '1.25rem';
      noWhTitle.textContent = 'Zero-Credit Operations';
      right.appendChild(noWhTitle);

      const noWh = _el('div', 'cs-no-wh-list');
      [
        'SHOW TABLES / DESCRIBE TABLE',
        'SELECT from INFORMATION_SCHEMA',
        'Result Cache hits (any query)',
        'Metadata-only queries',
        'GRANT / REVOKE',
        'CREATE / DROP / ALTER (DDL)',
        'USE DATABASE / WAREHOUSE',
      ].forEach(op => {
        const row = _el('div', 'cs-no-wh-row');
        row.innerHTML = `<span class="cs-no-wh-check">✓</span> <span>${op}</span>`;
        noWh.appendChild(row);
      });
      right.appendChild(noWh);

      /* ── Engine ── */
      const ctx = { container: canvas, panel, log };
      const engine = new (AE())({ steps: _buildSteps(ctx), speed: 1 });
      engine.setContext(ctx);
      window.SnowflakeViz.AnimationControls.register(engine);

      return { destroy: () => engine.destroy() };
    },
  };

  /* ── Step helpers ── */
  function _setPanel(ctx, step, title, body, facts = []) {
    const p = ctx.panel;
    if (!p) return;
    p.querySelector('#cspanel-step').textContent  = step;
    p.querySelector('#cspanel-title').textContent = title;
    p.querySelector('#cspanel-body').innerHTML    = body;
    p.querySelector('#cspanel-facts').innerHTML   = facts.map(f => `<div class="anim-panel-fact">${f}</div>`).join('');
    p.classList.add('highlighted');
  }

  function _resetAll(ctx) {
    ctx.container.querySelectorAll('.cs-comp-card').forEach(el => el.classList.remove('cs-active', 'selected'));
    if (ctx.log) ctx.log.innerHTML = '<div class="cs-log-empty">Activity appears here during animation…</div>';
    ctx.panel?.classList.remove('highlighted');
  }

  function _activate(ctx, ids) {
    ctx.container.querySelectorAll('.cs-comp-card').forEach(el => el.classList.remove('cs-active'));
    ids.forEach(id => {
      const el = ctx.container.querySelector(`#cs-comp-${id}`);
      if (el) el.classList.add('cs-active');
    });
  }

  function _log(ctx, entries) {
    if (!ctx.log) return;
    ctx.log.innerHTML = entries.map(e =>
      `<div class="cs-log-row"><span class="cs-log-tag ${e.type}">${e.tag}</span><span class="cs-log-msg">${e.msg}</span><span class="cs-log-dur">${e.dur || ''}</span></div>`
    ).join('');
  }

  function _buildSteps(ctx) {
    const F = AE().fnStep;
    return [
      F('CS Overview', 'Always-on, zero-warehouse operations',
        c => {
          _resetAll(c);
          _setPanel(c, 'Step 1 of 9', 'Cloud Services: The Always-On Brain',
            'Cloud Services runs on Snowflake-managed infrastructure 24/7. It handles everything that <em>doesn\'t</em> need data scanning. Netflix runs ~2M queries/day — the majority touch only Cloud Services, not a warehouse.',
            [
              'Always-on: no startup latency, no credits to spin up Cloud Services',
              'Billed at ~10% of daily warehouse compute (included in edition pricing)',
              'Handles: auth, DDL, metadata queries, Result Cache hits, GRANT/REVOKE',
              'Netflix: ~40% of all queries return from Result Cache via CS (0 WH credits)',
            ]);
        }, _resetAll, 3000),

      F('Query Arrives', 'Netflix Tableau sends SQL over JDBC',
        c => {
          _resetAll(c);
          _log(c, [
            { type: 'recv', tag: 'RECV', msg: 'Query received from TABLEAU_CONN (ANALYST_ROLE)', dur: '< 1ms' },
          ]);
          _setPanel(c, 'Step 2 of 9', 'Query Arrives at Cloud Services',
            'The query lands at Cloud Services via JDBC/ODBC driver. At this point: no warehouse is involved. Cloud Services begins processing the SQL immediately.',
            [
              'Client: Tableau → JDBC driver → TLS connection to Snowflake endpoint',
              'Session context: ANALYTICS_DB, ANALYST_ROLE, ANALYTICS_WH assigned',
              'Cloud Services: query accepted, session validated, processing begins',
              'Warehouse: not yet contacted — CS handles all pre-execution work',
            ]);
        }, _resetAll, 3000),

      F('Authentication', 'Role and privilege check in microseconds',
        c => {
          _resetAll(c);
          _activate(c, ['auth']);
          _log(c, [
            { type: 'recv', tag: 'RECV',  msg: 'Query received from TABLEAU_CONN (ANALYST_ROLE)',   dur: '< 1ms' },
            { type: 'auth', tag: 'AUTH',  msg: 'Session validated: ANALYST_ROLE, MFA verified',     dur: '~0.5ms' },
            { type: 'auth', tag: 'PRIV',  msg: 'SELECT on EVENTS_DB.RAW.WATCH_EVENTS → GRANTED',    dur: '~0.3ms' },
            { type: 'auth', tag: 'PRIV',  msg: 'SELECT on CONTENT_DB.PROCESSED.MOVIES → GRANTED',   dur: '~0.3ms' },
          ]);
          _setPanel(c, 'Step 3 of 9', 'Authentication & Authorization',
            'Cloud Services verifies the session (SSO/MFA via Okta) and evaluates all object-level privileges for the ANALYST_ROLE. This entire check takes < 1ms — all cached in memory.',
            [
              'Session: ANALYST_ROLE authenticated via Okta SAML SSO + MFA',
              'Privilege check: ANALYST_ROLE has SELECT on both joined tables',
              'Privilege evaluation: in-memory graph lookup — no disk I/O',
              'Row access policies evaluated here too: ANALYST_ROLE sees US data only',
            ]);
        }, _resetAll, 3500),

      F('Metadata Lookup', 'Partition stats fetched for pruning',
        c => {
          _resetAll(c);
          _activate(c, ['auth', 'metadata']);
          _log(c, [
            { type: 'auth', tag: 'AUTH',  msg: 'Privileges verified — ANALYST_ROLE authorized', dur: '' },
            { type: 'meta', tag: 'META',  msg: 'Fetching partition metadata for WATCH_EVENTS', dur: '~2ms' },
            { type: 'meta', tag: 'META',  msg: '182,500 partitions · min/max per column loaded', dur: '' },
            { type: 'meta', tag: 'META',  msg: 'Schema definitions for JOIN columns verified', dur: '~1ms' },
          ]);
          _setPanel(c, 'Step 4 of 9', 'Metadata Catalog Lookup',
            'Cloud Services retrieves partition min/max statistics from its in-memory metadata catalog. For WATCH_EVENTS (182,500 partitions), this lookup takes ~2ms and requires zero S3 I/O.',
            [
              '182,500 partitions in WATCH_EVENTS · min/max per column per partition',
              'Metadata always warm: Cloud Services pre-loads stats on table modification',
              'JOIN validation: MOVIE_ID type compatibility check across both tables',
              'Clustering info: WATCH_DATE cluster key identifies candidate pruning range',
            ]);
        }, _resetAll, 3500),

      F('Result Cache Check', 'Hash lookup — 24-hour window',
        c => {
          _resetAll(c);
          _activate(c, ['metadata']);
          _log(c, [
            { type: 'meta', tag: 'META',  msg: 'Metadata loaded — ready for optimization', dur: '' },
            { type: 'cache', tag: 'CACHE', msg: 'Computing query hash (SQL + session params)', dur: '< 1ms' },
            { type: 'cache', tag: 'CACHE', msg: 'Result Cache: MISS — table modified 2h ago', dur: '~1ms' },
          ]);
          _setPanel(c, 'Step 5 of 9', 'Result Cache Check — MISS',
            'Cloud Services computes a hash of the normalized SQL + session parameters and looks it up in the Result Cache. WATCH_EVENTS was loaded by Snowpipe 2 hours ago — any DML invalidates the cache entry.',
            [
              'Query hash: SHA-256 of normalized SQL + role + database + warehouse',
              '✗ Cache MISS — WATCH_EVENTS was loaded by Snowpipe (DML → invalidated)',
              'Cache HIT would return results instantly, zero warehouse credits',
              'Netflix: ~40% of queries are cache hits; this one is a miss → WH needed',
            ]);
        }, _resetAll, 3500),

      F('Query Parsing', 'SQL → Abstract Syntax Tree',
        c => {
          _resetAll(c);
          _activate(c, ['optimizer']);
          _log(c, [
            { type: 'cache', tag: 'CACHE', msg: 'Cache MISS — proceeding to optimize',         dur: '' },
            { type: 'parse', tag: 'PARSE', msg: 'Tokenizing SQL — keywords, identifiers, literals', dur: '~2ms' },
            { type: 'parse', tag: 'PARSE', msg: 'Building Abstract Syntax Tree (AST)',           dur: '~3ms' },
            { type: 'parse', tag: 'PARSE', msg: 'Semantic validation: column references OK',    dur: '~1ms' },
          ]);
          _setPanel(c, 'Step 6 of 9', 'Query Parsing & Semantic Validation',
            'The query optimizer\'s first pass: tokenize the SQL into keywords/identifiers/literals, build an AST, then validate semantic correctness (column names, type compatibility, function signatures).',
            [
              'Lexer: SQL text → token stream in ~1ms',
              'Parser: token stream → AST representing query structure',
              'Semantic check: all column references resolve, JOIN types are compatible',
              'Subquery flattening: correlated subqueries rewritten as JOINs where possible',
            ]);
        }, _resetAll, 3500),

      F('Cost-Based Optimization', 'Predicate pushdown, join reorder, pruning decisions',
        c => {
          _resetAll(c);
          _activate(c, ['optimizer', 'metadata']);
          _log(c, [
            { type: 'parse', tag: 'PARSE', msg: 'AST validated and ready for optimization', dur: '' },
            { type: 'opt',   tag: 'OPT',   msg: 'Predicate push-down: WHERE before JOIN', dur: '~3ms' },
            { type: 'opt',   tag: 'OPT',   msg: 'Partition pruning: 182,500 → 1,270 partitions', dur: '~8ms' },
            { type: 'opt',   tag: 'OPT',   msg: 'Join reorder: MOVIES (small) as broadcast', dur: '~4ms' },
            { type: 'opt',   tag: 'OPT',   msg: 'Bloom filter: MOVIE_ID set for hash join', dur: '~2ms' },
          ]);
          _setPanel(c, 'Step 7 of 9', 'Cost-Based Query Optimization',
            'The optimizer uses partition metadata to make pruning decisions, reorders joins based on cardinality estimates, and pushes predicates as close to storage as possible.',
            [
              'Predicate pushdown: WATCH_DATE filter applied before JOIN — 99.3% reduction',
              'Partition pruning: 182,500 → 1,270 partitions (99.3% eliminated)',
              'Join strategy: MOVIES (17K rows) broadcast to all nodes — avoids shuffle',
              'Bloom filter: pre-computed MOVIE_ID set eliminates non-matching rows',
            ]);
        }, _resetAll, 4000),

      F('Execution Plan Compiled', 'Physical plan dispatched to warehouse',
        c => {
          _resetAll(c);
          _activate(c, ['compiler', 'txn']);
          _log(c, [
            { type: 'opt',   tag: 'OPT',  msg: 'Optimized logical plan ready', dur: '' },
            { type: 'comp',  tag: 'COMP', msg: 'Compiling logical → physical execution plan', dur: '~4ms' },
            { type: 'comp',  tag: 'COMP', msg: 'Parallelism: 16 nodes × 79 partitions each', dur: '' },
            { type: 'txn',   tag: 'TXN',  msg: 'Snapshot isolation: read timestamp = T₀', dur: '~1ms' },
            { type: 'comp',  tag: 'COMP', msg: 'Plan dispatched to ANALYTICS_WH (XL)', dur: '~3ms' },
          ]);
          _setPanel(c, 'Step 8 of 9', 'Physical Plan Compiled & Dispatched',
            'The logical plan is compiled into a physical execution plan specifying parallelism, partition assignments, and operator order. The Transaction Manager sets a snapshot timestamp ensuring consistent reads.',
            [
              'Physical plan: 16 nodes, each assigned ~79 of the 1,270 pruned partitions',
              'Snapshot isolation: query sees data as of timestamp T₀ — no phantom reads',
              'Partition file list sent to ANALYTICS_WH — S3 paths for pruned partitions only',
              'Total CS time: ~21ms — warehouse receives a fully optimized work order',
            ]);
        }, _resetAll, 4000),

      F('Monitoring & Complete', 'Query tracked in QUERY_HISTORY',
        c => {
          _resetAll(c);
          _activate(c, ['monitor']);
          _log(c, [
            { type: 'comp',  tag: 'COMP',  msg: 'Plan dispatched — warehouse executing', dur: '' },
            { type: 'mon',   tag: 'MON',   msg: 'Query telemetry record created in QUERY_HISTORY', dur: '' },
            { type: 'mon',   tag: 'MON',   msg: 'CS overhead logged: 21ms (parse+optimize+compile)', dur: '' },
            { type: 'auth',  tag: 'AUDIT', msg: 'ACCESS_HISTORY: ANALYST_ROLE accessed WATCH_EVENTS', dur: '' },
            { type: 'mon',   tag: 'CACHE', msg: 'On completion: result stored in cache (24h TTL)', dur: '' },
          ]);
          _setPanel(c, 'Step 9 of 9', 'Telemetry & Audit Logging',
            'Every query generates a QUERY_HISTORY entry and ACCESS_HISTORY record — entirely within Cloud Services, at no warehouse cost. Netflix\'s compliance team uses ACCESS_HISTORY for GDPR data lineage audits.',
            [
              'QUERY_HISTORY: execution time, bytes scanned, partitions pruned, WH credits',
              'ACCESS_HISTORY: which user, role, and table columns were accessed',
              'Governance: ANALYST_ROLE touching PHONE_NUMBER triggers masking policy log',
              'Netflix: 90-day QUERY_HISTORY retention for performance optimization analysis',
            ]);
        }, _resetAll, 4000),
    ];
  }

  function _el(tag, cls) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    return el;
  }

  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Modules = window.SnowflakeViz.Modules || {};
  window.SnowflakeViz.Modules.cloudServices = CloudServicesModule;
})();
