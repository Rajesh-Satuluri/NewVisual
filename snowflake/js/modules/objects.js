/* ============================================================
   Objects & Hierarchy Module — clickable Org → Table explorer
   Netflix production structure: Org → Account → DB → Schema → Table
   ============================================================ */

(function () {
  'use strict';

  const OBJ_TREE = [
    {
      type: 'org',
      name: 'Netflix Organization',
      icon: '🏢',
      detail: 'The Snowflake Organization is the top-level container grouping all Netflix accounts under a single identity, SSO configuration, and billing structure.',
      facts: [
        'Netflix runs 3 Snowflake accounts across regions: US-East-1, EU-West-1, AP-Southeast-1',
        'Organization policies: MFA enforcement, SSO via Okta, SCIM provisioning',
        'Cross-account data sharing via Snowflake Marketplace within the Org',
        'Org-level spend governance and account creation via Snowsight Organization Admin',
      ],
      children: [
        {
          type: 'account',
          name: 'NETFLIX_PROD',
          icon: '🔵',
          region: 'AWS us-east-1',
          detail: 'The primary production Snowflake account. Hosts all analytical and operational workloads for Netflix\'s content, events, and analytics data.',
          facts: [
            'Edition: Business Critical (Tri-Secret Secure, HIPAA/SOC2 compliance)',
            'Region: AWS us-east-1 — co-located with Netflix\'s primary S3 data lake',
            'Multi-cluster warehouses enabled: up to 10 clusters per warehouse',
            '~240 virtual warehouses across engineering, data science, and analytics teams',
          ],
          children: [
            {
              type: 'database',
              name: 'EVENTS_DB',
              icon: '📁',
              detail: 'Raw and processed watch event data. Primary ingestion target receiving Snowpipe loads every 60 seconds across 6 global regions.',
              facts: [
                'Storage: ~180 TB compressed, ~2.9 PB logical uncompressed',
                'WATCH_EVENTS: 500B rows, 182,500 micro-partitions, clustered by WATCH_DATE',
                'Schemas: RAW (direct ingest), PROCESSED (cleaned), STREAMING (Kafka)',
                'TIME_TRAVEL: 7 days · FAIL_SAFE: 7 days · DATA_RETENTION_TIME = 7',
              ],
              children: [
                {
                  type: 'schema',
                  name: 'RAW',
                  icon: '📂',
                  detail: 'Raw ingested event data, unmodified from source systems. Managed exclusively by the Data Engineering team.',
                  facts: [
                    'Tables land here directly from Snowpipe (S3) and COPY INTO (historical)',
                    'No transforms applied — data is exactly as received from streaming services',
                    'Data engineering owns write access; analytics teams read-only via role',
                  ],
                  children: [
                    { type: 'table', name: 'WATCH_EVENTS',   icon: '📋', rows: '500B',   cols: 12, clusterKey: 'WATCH_DATE' },
                    { type: 'table', name: 'CLICK_STREAM',   icon: '📋', rows: '1.2T',   cols: 8,  clusterKey: 'EVENT_DATE' },
                    { type: 'table', name: 'USER_SESSIONS',  icon: '📋', rows: '18B',    cols: 15, clusterKey: 'SESSION_DATE' },
                    { type: 'table', name: 'APP_EVENTS',     icon: '📋', rows: '890B',   cols: 10, clusterKey: 'EVENT_DATE' },
                  ],
                },
                {
                  type: 'schema',
                  name: 'PROCESSED',
                  icon: '📂',
                  detail: 'Cleansed, deduplicated, and enriched events ready for analytics consumption. Refreshed hourly from RAW via Snowflake Tasks.',
                  facts: [
                    'Deduplication removes ~0.3% of duplicates from Snowpipe micro-batches',
                    'PII columns masked via dynamic data masking policies',
                    'Refreshed hourly by TASK_WATCH_EVENTS_PROCESS (CRON: 0 * * * *)',
                  ],
                  children: [
                    { type: 'table', name: 'WATCH_EVENTS_CLEAN', icon: '📋', rows: '498B', cols: 14, clusterKey: 'WATCH_DATE, REGION' },
                    { type: 'table', name: 'USER_PROFILES',      icon: '📋', rows: '238M', cols: 28, clusterKey: 'COUNTRY_CODE' },
                    { type: 'table', name: 'CONTENT_RATINGS',    icon: '📋', rows: '2B',   cols: 7,  clusterKey: 'RATING_DATE' },
                  ],
                },
                {
                  type: 'schema',
                  name: 'STREAMING',
                  icon: '📂',
                  detail: 'Near-realtime tables populated by the Kafka Connector via Snowpipe Streaming. Rows visible within 5 seconds of the Kafka producer.',
                  facts: [
                    'Kafka Connector: 16 tasks, 5s buffer flush, SNOWPIPE_STREAMING mode',
                    'WATCH_EVENTS_STREAM used by real-time recommendation engine',
                    'Micro-partitions are initially small (streaming) — compacted hourly via Tasks',
                  ],
                  children: [
                    { type: 'table', name: 'WATCH_EVENTS_STREAM',   icon: '📋', rows: 'Live', cols: 12, clusterKey: '(none — streaming)' },
                    { type: 'table', name: 'CLICK_STREAM_LIVE',      icon: '📋', rows: 'Live', cols: 8,  clusterKey: '(none — streaming)' },
                  ],
                },
              ],
            },
            {
              type: 'database',
              name: 'CONTENT_DB',
              icon: '📁',
              detail: 'Content catalog metadata: movies, TV shows, episodes, and licensing data. Read-mostly, updated nightly via ETL from the content management system.',
              facts: [
                'Storage: ~12 GB (compact — content catalog has ~25K titles total)',
                'MOVIES: 17,000 rows · TV_SHOWS: 8,500 rows · EPISODES: 580,000 rows',
                'CLUSTER BY (RELEASE_YEAR) on MOVIES and TV_SHOWS for filter performance',
                'Shared to ANALYTICS_DB via Zero-Copy Clone for read-only analytics access',
              ],
              children: [
                {
                  type: 'schema',
                  name: 'PROCESSED',
                  icon: '📂',
                  detail: 'Enriched content records with genre taxonomy, licensing windows, and localization metadata. Used by the recommendation engine.',
                  facts: [
                    'Joined with third-party licensing data from external tables',
                    'Genre taxonomy: 42 primary genres, 380 micro-genres (tags)',
                  ],
                  children: [
                    { type: 'table', name: 'MOVIES',    icon: '📋', rows: '17K',  cols: 11, clusterKey: 'RELEASE_YEAR' },
                    { type: 'table', name: 'TV_SHOWS',  icon: '📋', rows: '8.5K', cols: 13, clusterKey: 'RELEASE_YEAR' },
                    { type: 'table', name: 'EPISODES',  icon: '📋', rows: '580K', cols: 9,  clusterKey: 'SHOW_ID' },
                    { type: 'table', name: 'GENRES',    icon: '📋', rows: '42',   cols: 4,  clusterKey: '(none — small)' },
                  ],
                },
              ],
            },
            {
              type: 'database',
              name: 'ANALYTICS_DB',
              icon: '📁',
              detail: 'Pre-aggregated metrics and materialized views for dashboards and BI tools. Refreshed continuously via Dynamic Tables and hourly Snowflake Tasks.',
              facts: [
                'Storage: ~4.2 TB — aggregated from 180 TB EVENTS_DB via Dynamic Tables',
                'Dynamic Tables: auto-refresh from EVENTS_DB every 5 minutes',
                'Read-only to BI team, Product, and Finance; write access for Data Engineering',
                'Looker, Tableau, and Metabase connect to this database via service accounts',
              ],
              children: [
                {
                  type: 'schema',
                  name: 'METRICS',
                  icon: '📂',
                  detail: 'Aggregated KPIs, funnel metrics, cohort analysis, and A/B test result tables for product analytics and executive dashboards.',
                  facts: [
                    'DAILY_VIEWING is a Dynamic Table — auto-refreshes every 5 min from RAW',
                    'RETENTION_COHORTS: monthly cohorts tracked for 12 months post-signup',
                    'AB_TEST_RESULTS: 400+ concurrent A/B tests tracked with statistical significance',
                  ],
                  children: [
                    { type: 'table', name: 'DAILY_VIEWING',      icon: '📋', rows: '7.3K',  cols: 18, clusterKey: 'METRIC_DATE' },
                    { type: 'table', name: 'RETENTION_COHORTS',  icon: '📋', rows: '125K',  cols: 12, clusterKey: 'COHORT_MONTH' },
                    { type: 'table', name: 'AB_TEST_RESULTS',    icon: '📋', rows: '8.4M',  cols: 22, clusterKey: 'EXPERIMENT_ID' },
                    { type: 'table', name: 'CONTENT_PERFORMANCE',icon: '📋', rows: '520K',  cols: 16, clusterKey: 'CONTENT_ID' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ];

  const WATCH_EVENTS_COLS = [
    { name: 'EVENT_ID',     type: 'VARCHAR(36)',   note: 'Primary Key (UUID)' },
    { name: 'USER_ID',      type: 'NUMBER(18,0)',  note: 'Foreign Key → USER_PROFILES' },
    { name: 'CONTENT_ID',   type: 'NUMBER(18,0)',  note: 'Foreign Key → MOVIES / EPISODES' },
    { name: 'WATCH_DATE',   type: 'DATE',          note: 'Cluster Key' },
    { name: 'START_TS',     type: 'TIMESTAMP_NTZ', note: '' },
    { name: 'DURATION_S',   type: 'NUMBER(10,0)',  note: 'Watch duration in seconds' },
    { name: 'REGION',       type: 'VARCHAR(8)',    note: 'e.g. us-east-1' },
    { name: 'DEVICE_TYPE',  type: 'VARCHAR(20)',   note: 'TV / MOBILE / WEB / TABLET' },
    { name: 'QUALITY',      type: 'VARCHAR(4)',    note: 'SD / HD / 4K' },
    { name: 'COUNTRY',      type: 'VARCHAR(3)',    note: 'ISO 3166-1 alpha-3' },
    { name: 'APP_VERSION',  type: 'VARCHAR(20)',   note: '' },
    { name: 'COMPLETED',    type: 'BOOLEAN',       note: 'Watched > 90% of runtime' },
  ];

  let _idCounter = 0;

  const ObjHierarchyModule = {
    render(canvas) {
      canvas.innerHTML = '';
      _idCounter = 0;

      const wrap = _el('div', 'obj-page');
      canvas.appendChild(wrap);

      const hdr = _el('div', 'mod-header');
      hdr.innerHTML = `
        <div class="mod-eyebrow">Platform</div>
        <h1 class="mod-title">Objects &amp; Hierarchy</h1>
        <p class="mod-subtitle">Snowflake's object model is a strict hierarchy: Organization → Account → Database → Schema → Table. Click any node to explore Netflix's production structure.</p>`;
      wrap.appendChild(hdr);

      const body = _el('div', 'obj-body');
      wrap.appendChild(body);

      const treeCol   = _el('div', 'obj-tree-col');
      const detailCol = _el('div', 'obj-detail-col');
      body.appendChild(treeCol);
      body.appendChild(detailCol);

      /* Hierarchy reference strip */
      const strip = _el('div', 'obj-hier-strip');
      strip.innerHTML = `
        <div class="obj-hier-item org">🏢 Org</div><div class="obj-hier-sep">›</div>
        <div class="obj-hier-item account">🔵 Account</div><div class="obj-hier-sep">›</div>
        <div class="obj-hier-item database">📁 Database</div><div class="obj-hier-sep">›</div>
        <div class="obj-hier-item schema">📂 Schema</div><div class="obj-hier-sep">›</div>
        <div class="obj-hier-item table">📋 Table</div>`;
      treeCol.appendChild(strip);

      /* Breadcrumb */
      const bc = _el('div', 'obj-breadcrumb');
      bc.id = 'obj-bc';
      bc.innerHTML = '<span class="obj-bc-item active">Netflix Org</span>';
      treeCol.appendChild(bc);

      /* Tree */
      const tree = _el('div', 'obj-tree');
      tree.id = 'obj-tree';
      treeCol.appendChild(tree);

      /* Detail panel */
      const detail = _el('div', 'obj-detail');
      detail.id = 'obj-detail';
      detail.innerHTML = `
        <div class="obj-detail-empty">
          <div style="font-size:2.5rem;margin-bottom:.75rem">🗂️</div>
          <div style="font-weight:600;margin-bottom:.375rem;">Select an object</div>
          <div style="font-size:.8125rem;color:var(--text-muted)">Click any node in the tree to view its details, statistics, and child objects.</div>
        </div>`;
      detailCol.appendChild(detail);

      /* Render the tree */
      _renderLevel(tree, OBJ_TREE, detail, 0, []);

      /* Auto-expand and select root */
      setTimeout(() => {
        const rootRow = tree.querySelector('.obj-node-row[data-depth="0"]');
        if (rootRow) {
          rootRow.click();
          /* Also expand the root so account is visible */
          const rootToggle = rootRow.querySelector('.obj-toggle');
          if (rootToggle && rootToggle.textContent === '▶') rootRow.click();
        }
      }, 60);

      return { destroy() {} };
    },
  };

  function _renderLevel(container, nodes, detailEl, depth, pathSoFar) {
    nodes.forEach(node => {
      const nodeId = _idCounter++;
      const wrap   = _el('div', 'obj-node-wrap');

      const hasChildren = Array.isArray(node.children) && node.children.length > 0;

      const row = _el('div', `obj-node-row obj-node-${node.type}`);
      row.dataset.depth = depth;
      row.style.paddingLeft = `${0.75 + depth * 1.25}rem`;

      row.innerHTML = `
        <span class="obj-toggle">${hasChildren ? '▶' : ''}</span>
        <span class="obj-node-icon">${node.icon}</span>
        <span class="obj-node-name">${node.name}</span>
        ${node.region ? `<span class="obj-node-region">${node.region}</span>` : ''}
        ${node.type === 'table' ? `<span class="obj-node-rows">${node.rows} rows</span>` : ''}
        <span class="obj-type-pill obj-type-${node.type}">${node.type}</span>`;

      wrap.appendChild(row);

      let childWrap = null;
      if (hasChildren) {
        childWrap = _el('div', 'obj-children');
        childWrap.style.display = 'none';
        _renderLevel(childWrap, node.children, detailEl, depth + 1, [...pathSoFar, node.name]);
        wrap.appendChild(childWrap);
      }

      row.addEventListener('click', e => {
        e.stopPropagation();

        /* Toggle children */
        if (hasChildren && childWrap) {
          const open = childWrap.style.display !== 'none';
          childWrap.style.display = open ? 'none' : '';
          const t = row.querySelector('.obj-toggle');
          if (t) t.textContent = open ? '▶' : '▼';
        }

        /* Deselect others, select this */
        container.closest('#obj-tree')?.querySelectorAll('.obj-node-row').forEach(r => r.classList.remove('selected'));
        row.classList.add('selected');

        /* Breadcrumb */
        const bcEl = container.closest('.obj-tree-col')?.querySelector('#obj-bc');
        if (bcEl) {
          const fullPath = [...pathSoFar, node.name];
          bcEl.innerHTML = fullPath.map((seg, i) =>
            `<span class="obj-bc-item${i === fullPath.length - 1 ? ' active' : ''}">${seg}</span>`
          ).join('<span class="obj-bc-sep">›</span>');
        }

        /* Detail pane */
        _renderDetail(detailEl, node);
      });

      container.appendChild(wrap);
    });
  }

  function _renderDetail(el, node) {
    if (node.type === 'table') {
      const isWatchEvents = node.name.startsWith('WATCH_EVENTS') && !node.name.includes('CLICK');
      el.innerHTML = `
        <div class="obj-detail-header">
          <span class="obj-type-pill obj-type-table">TABLE</span>
          <div class="obj-detail-name">${node.icon} ${node.name}</div>
        </div>
        <div class="obj-table-stats">
          <div class="obj-ts-item"><div class="obj-ts-val">${node.rows}</div><div class="obj-ts-lbl">Rows</div></div>
          <div class="obj-ts-item"><div class="obj-ts-val">${node.cols}</div><div class="obj-ts-lbl">Columns</div></div>
          <div class="obj-ts-item" style="flex:2"><div class="obj-ts-val">${node.clusterKey}</div><div class="obj-ts-lbl">Cluster Key</div></div>
        </div>`;

      if (isWatchEvents) {
        const colSection = _el('div', '');
        colSection.innerHTML = `<div class="obj-detail-section-title">Column Schema — WATCH_EVENTS</div>`;
        const colTable = _el('div', 'obj-col-table');
        colTable.innerHTML = `
          <div class="obj-col-head"><span>Column</span><span>Type</span><span>Notes</span></div>
          ${WATCH_EVENTS_COLS.map(c => `
            <div class="obj-col-row">
              <span class="obj-col-name">${c.name}</span>
              <span class="obj-col-type">${c.type}</span>
              <span class="obj-col-note">${c.note}</span>
            </div>`).join('')}`;
        colSection.appendChild(colTable);
        el.appendChild(colSection);
      }
      return;
    }

    const facts = node.facts || [];
    el.innerHTML = `
      <div class="obj-detail-header">
        <span class="obj-type-pill obj-type-${node.type}">${node.type.toUpperCase()}</span>
        <div class="obj-detail-name">${node.icon} ${node.name}</div>
        ${node.region ? `<div class="obj-detail-region"><span>📍</span> ${node.region}</div>` : ''}
      </div>
      <div class="obj-detail-desc">${node.detail || ''}</div>
      ${facts.length ? `<div class="obj-detail-section-title" style="margin-top:1rem">Key Facts</div><div class="anim-panel-facts">${facts.map(f => `<div class="anim-panel-fact">${f}</div>`).join('')}</div>` : ''}
      ${node.children ? `<div class="obj-detail-children">Contains <strong>${node.children.length}</strong> child object${node.children.length !== 1 ? 's' : ''} — expand in tree to explore</div>` : ''}`;
  }

  function _el(tag, cls) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    return el;
  }

  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Modules = window.SnowflakeViz.Modules || {};
  window.SnowflakeViz.Modules.objects = ObjHierarchyModule;
})();
