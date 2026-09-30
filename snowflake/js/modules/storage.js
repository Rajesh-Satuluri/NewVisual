/* ============================================================
   Storage Module — micro-partition scan + pruning animation
   Drives AnimationEngine with the WATCH_EVENTS / MOVIES tables.
   ============================================================ */

(function () {
  'use strict';

  const AE = () => window.SnowflakeViz.AnimationEngine;

  /* Columns we'll show for the MOVIES table query walkthrough */
  const QUERY_COLUMNS = [
    { name: 'MOVIE_ID',      type: 'NUMBER',    selected: false },
    { name: 'TITLE',         type: 'VARCHAR',   selected: true  },
    { name: 'GENRE',         type: 'ARRAY',     selected: true  },
    { name: 'RELEASE_YEAR',  type: 'NUMBER',    selected: true  },
    { name: 'LANGUAGE',      type: 'VARCHAR',   selected: false },
    { name: 'MATURITY_RATING',type: 'VARCHAR',  selected: false },
    { name: 'DURATION_MINS', type: 'NUMBER',    selected: false },
    { name: 'COUNTRY_CODE',  type: 'VARCHAR',   selected: false },
  ];

  /* Query driving the animation */
  const DEMO_QUERY = `SELECT
    m.TITLE,
    m.GENRE[0]::STRING  AS PRIMARY_GENRE,
    m.RELEASE_YEAR
FROM CONTENT_DB.PROCESSED.MOVIES m
WHERE m.RELEASE_YEAR BETWEEN <span class="tok-num">2013</span> AND <span class="tok-num">2018</span>
ORDER BY m.RELEASE_YEAR;
-- Targeting partitions: id 7-10 (years 2005–2018)`;

  const StorageModule = {
    render(canvas, { data }) {
      canvas.innerHTML = '';

      const nd = data;
      const partitions = (nd && nd.microPartitions) ? nd.microPartitions : _fallbackPartitions();

      /* ── Layout ── */
      const layout = _el('div', 'storage-layout');
      const left   = _el('div', '');
      const right  = _el('div', '');
      layout.appendChild(left);
      layout.appendChild(right);
      canvas.appendChild(layout);

      /* ── Left: header + query + partition grid + col list ── */
      const tableHeader = _el('div', 'storage-table-header');
      tableHeader.innerHTML = `
        <div class="storage-table-name">CONTENT_DB.PROCESSED.MOVIES</div>
        <div class="storage-table-stats">
          <div class="storage-table-stat"><div class="val">17,000</div><div class="lbl">Rows</div></div>
          <div class="storage-table-stat"><div class="val">12 GB</div><div class="lbl">Storage</div></div>
          <div class="storage-table-stat"><div class="val">${partitions.length}</div><div class="lbl">Micro-Partitions</div></div>
          <div class="storage-table-stat"><div class="val">RELEASE_YEAR</div><div class="lbl">Cluster Key</div></div>
        </div>`;
      left.appendChild(tableHeader);

      const queryBox = _el('div', 'storage-query-box');
      queryBox.id = 'storage-query';
      queryBox.innerHTML = DEMO_QUERY;
      left.appendChild(queryBox);

      const partTitle = _el('div', 'partition-section-title');
      partTitle.textContent = 'Micro-Partition Map — Clustered by RELEASE_YEAR';
      left.appendChild(partTitle);

      const grid = _el('div', 'partition-grid');
      grid.id = 'partition-grid';
      partitions.forEach(p => {
        const card = _el('div', 'partition-card idle');
        card.id = `mp-${p.id}`;
        card.innerHTML = `
          <div class="partition-id">MP-${String(p.id).padStart(3,'0')}</div>
          <div class="partition-year-range">${p.minYear} – ${p.maxYear}</div>
          <div class="partition-genres">${p.genres.join(', ')}</div>
          <div class="partition-rows">
            <span>${p.rows.toLocaleString()} rows</span>
            <span>${p.sizeKB} KB</span>
          </div>
          <div class="partition-status">idle</div>`;
        grid.appendChild(card);
      });
      left.appendChild(grid);

      /* stats bar */
      const statsBar = _el('div', 'storage-stats-bar');
      statsBar.id = 'storage-stats';
      statsBar.innerHTML = `
        <div class="storage-stat"><div class="val" id="stat-total">${partitions.length}</div><div class="lbl">Total Partitions</div></div>
        <div class="storage-stat"><div class="val" id="stat-pruned">0</div><div class="lbl">Pruned</div></div>
        <div class="storage-stat"><div class="val" id="stat-scanned">0</div><div class="lbl">Scanned</div></div>
        <div class="storage-stat"><div class="val" id="stat-pct">0%</div><div class="lbl">Data Skipped</div></div>`;
      left.appendChild(statsBar);

      /* ── Right: info panel + column list ── */
      const panel = _el('div', 'anim-panel');
      panel.id = 'storage-panel';
      panel.innerHTML = `
        <div class="anim-panel-step-num" id="spanel-step">Overview</div>
        <div class="anim-panel-title"    id="spanel-title">Micro-Partition Storage</div>
        <div class="anim-panel-body"     id="spanel-body">Press Play to watch how Snowflake handles a query against the Netflix MOVIES table using partition pruning and columnar reads.</div>
        <div class="anim-panel-facts"    id="spanel-facts"></div>`;
      right.appendChild(panel);

      const colTitle = _el('div', 'partition-section-title');
      colTitle.style.marginTop = '1.5rem';
      colTitle.textContent = 'Column Projection';
      right.appendChild(colTitle);

      const colList = _el('div', 'column-list');
      colList.id = 'col-list';
      QUERY_COLUMNS.forEach(col => {
        const row = _el('div', 'col-row');
        row.id = `col-${col.name.toLowerCase()}`;
        row.innerHTML = `<div class="col-check"></div>
          <span class="col-name">${col.name}</span>
          <span class="col-type">${col.type}</span>`;
        colList.appendChild(row);
      });
      right.appendChild(colList);

      /* ── Engine ── */
      const ctx = {
        container: canvas,
        panel,
        partitions,
        prunedIds:  [],
        scannedIds: [],
      };

      /* determine which partitions are in/out for RELEASE_YEAR BETWEEN 2013 AND 2018 */
      partitions.forEach(p => {
        if (p.maxYear < 2013 || p.minYear > 2018) {
          ctx.prunedIds.push(p.id);
        } else {
          ctx.scannedIds.push(p.id);
        }
      });

      const engine = new (AE())({ steps: _buildSteps(ctx), speed: 1 });
      engine.setContext(ctx);
      window.SnowflakeViz.AnimationControls.register(engine);

      return { destroy: () => engine.destroy() };
    },
  };

  /* ── Step helpers ────────────────────────────────────────── */

  function _setPanel(ctx, step, title, body, facts = []) {
    const p = ctx.panel;
    if (!p) return;
    p.querySelector('#spanel-step').textContent  = step;
    p.querySelector('#spanel-title').textContent = title;
    p.querySelector('#spanel-body').innerHTML    = body;
    p.querySelector('#spanel-facts').innerHTML   = facts.map(f => `<div class="anim-panel-fact">${f}</div>`).join('');
    p.classList.add('highlighted');
  }

  function _resetPartitions(ctx) {
    ctx.container.querySelectorAll('.partition-card').forEach(el => {
      el.className = 'partition-card idle';
      el.querySelector('.partition-status').textContent = 'idle';
    });
    _setStats(ctx, 0, 0);
    ctx.container.querySelector('#storage-query')?.classList.remove('active');
    ctx.container.querySelector('#storage-stats')?.classList.remove('active');
    ctx.container.querySelectorAll('.col-row').forEach(el => {
      el.classList.remove('selected', 'pruned');
    });
    ctx.panel?.classList.remove('highlighted');
  }

  function _setStats(ctx, pruned, scanned) {
    const total = ctx.partitions.length;
    const pct   = total > 0 ? Math.round(((total - scanned) / total) * 100) : 0;
    const c     = ctx.container;
    const set   = (id, v) => { const el = c.querySelector('#' + id); if (el) el.textContent = v; };
    set('stat-pruned',  pruned);
    set('stat-scanned', scanned);
    set('stat-pct',     pct + '%');
  }

  function _markPartitions(ctx, ids, state) {
    const label = state === 'scanning' ? 'scanning' : 'pruned';
    ids.forEach(id => {
      const el = ctx.container.querySelector(`#mp-${id}`);
      if (!el) return;
      el.className = `partition-card ${state}`;
      el.querySelector('.partition-status').textContent = label;
    });
  }

  function _applyColumnProjection(ctx, selectedNames) {
    ctx.container.querySelectorAll('.col-row').forEach(el => {
      const name = el.id.replace('col-', '').toUpperCase();
      if (selectedNames.includes(name)) {
        el.classList.add('selected');
        el.classList.remove('pruned');
      } else {
        el.classList.add('pruned');
        el.classList.remove('selected');
      }
    });
  }

  function _buildSteps(ctx) {
    const F = AE().fnStep;

    return [
      F('Micro-Partitions', 'What they are and why they matter',
        (c) => {
          _resetPartitions(c);
          _setPanel(c,
            'Step 1 of 8',
            'Micro-Partition Structure',
            'Snowflake stores all data in immutable micro-partitions of ~16 MB of uncompressed data. Each is compressed (~5:1 ratio), stored columnar, and contains contiguous rows.',
            [
              `MOVIES table: ${c.partitions.length} partitions, clustered by RELEASE_YEAR`,
              'Each partition stores row metadata: min/max value per column',
              'Partitions are immutable — UPDATEs create new partitions',
              'Netflix WATCH_EVENTS: 182,500 partitions · 180 TB compressed',
            ]
          );
        },
        _resetPartitions,
        3000
      ),

      F('Columnar Layout', 'How data is physically stored inside each partition',
        (c) => {
          _resetPartitions(c);
          _setPanel(c,
            'Step 2 of 8',
            'Columnar Storage Layout',
            'Within each micro-partition, data is stored column-by-column, not row-by-row. A query for TITLE + RELEASE_YEAR reads only those two column files — all other columns are untouched.',
            [
              'SELECT TITLE, GENRE → reads 2 of 11 column files per partition',
              'Columnar compression: repeated COUNTRY_CODE values compress extremely well',
              'Netflix reads 90%+ less data on analytical queries vs row-oriented storage',
            ]
          );
          /* highlight some partitions to show they have structure */
          [1,2,3,4].forEach(id => {
            const el = c.container.querySelector(`#mp-${id}`);
            if (el) el.style.outline = '2px solid rgba(41,181,232,.4)';
          });
        },
        (c) => {
          [1,2,3,4].forEach(id => {
            const el = c.container.querySelector(`#mp-${id}`);
            if (el) el.style.outline = '';
          });
          _resetPartitions(c);
        },
        3000
      ),

      F('Partition Metadata', 'The secret behind pruning performance',
        (c) => {
          _resetPartitions(c);
          _setPanel(c,
            'Step 3 of 8',
            'Partition Metadata Tracking',
            'Snowflake\'s Cloud Services layer maintains a metadata catalog: for every column in every micro-partition, it stores the min and max value. This enables partition pruning with zero I/O.',
            [
              'MP-001: RELEASE_YEAR min=1940, max=1965 · genres: Drama, Classic',
              'MP-007: RELEASE_YEAR min=2005, max=2009 · genres: Drama, SciFi',
              'MP-012: RELEASE_YEAR min=2020, max=2023 · genres: SciFi, Action',
              'Metadata fits in memory — lookup is microseconds, not milliseconds',
            ]
          );
        },
        _resetPartitions,
        3000
      ),

      F('The Query', 'RELEASE_YEAR BETWEEN 2013 AND 2018',
        (c) => {
          _resetPartitions(c);
          c.container.querySelector('#storage-query')?.classList.add('active');
          _setPanel(c,
            'Step 4 of 8',
            'Query Arrives — Cloud Services Takes Over',
            'SELECT TITLE, GENRE, RELEASE_YEAR … WHERE RELEASE_YEAR BETWEEN 2013 AND 2018. Before ANALYTICS_WH even starts, Cloud Services checks partition metadata.',
            [
              'Cloud Services parses and optimizes the SQL — no warehouse needed yet',
              'Optimizer identifies RELEASE_YEAR as the clustering key',
              `Partition metadata query: which of the ${c.partitions.length} partitions have maxYear >= 2013 AND minYear <= 2018?`,
              'This metadata check takes milliseconds and costs zero credits',
            ]
          );
        },
        (c) => {
          _resetPartitions(c);
          c.container.querySelector('#storage-query')?.classList.remove('active');
        },
        3500
      ),

      F('Pruning Pass', 'Cloud Services eliminates partitions before the warehouse sees them',
        (c) => {
          _resetPartitions(c);
          c.container.querySelector('#storage-query')?.classList.add('active');
          _markPartitions(c, c.prunedIds, 'pruned');
          _setStats(c, c.prunedIds.length, 0);
          _setPanel(c,
            'Step 5 of 8',
            'Partition Pruning — No Warehouse Needed',
            `Cloud Services eliminates ${c.prunedIds.length} of ${c.partitions.length} partitions. Their maxYear < 2013 or minYear > 2018 — they cannot contain matching rows.`,
            [
              `${c.prunedIds.length} partitions pruned — never sent to the warehouse`,
              'Pruning happens at query planning time, in Cloud Services, zero credit cost',
              `Remaining: ${c.scannedIds.length} partitions contain the target year range`,
              'At Netflix scale: 182,500 partition WATCH_EVENTS → pruning is essential',
            ]
          );
        },
        _resetPartitions,
        3500
      ),

      F('Warehouse Scan', 'Only relevant partitions are read',
        (c) => {
          _resetPartitions(c);
          c.container.querySelector('#storage-query')?.classList.add('active');
          _markPartitions(c, c.prunedIds,  'pruned');
          _markPartitions(c, c.scannedIds, 'scanning');
          _setStats(c, c.prunedIds.length, c.scannedIds.length);
          c.container.querySelector('#storage-stats')?.classList.add('active');
          const pct = Math.round((c.prunedIds.length / c.partitions.length) * 100);
          _setPanel(c,
            'Step 6 of 8',
            'ANALYTICS_WH Scans Surviving Partitions',
            `The warehouse reads only ${c.scannedIds.length} partitions. ${pct}% of the table is never touched.`,
            [
              `${c.scannedIds.length} partitions scanned — only those overlapping 2013–2018`,
              'Each partition read in parallel across warehouse nodes',
              'Columnar reads: only TITLE, GENRE, RELEASE_YEAR columns fetched',
              `${pct}% data skipped — massive compute credit savings`,
            ]
          );
        },
        _resetPartitions,
        4000
      ),

      F('Column Projection', 'Only requested columns leave storage',
        (c) => {
          _resetPartitions(c);
          c.container.querySelector('#storage-query')?.classList.add('active');
          _markPartitions(c, c.prunedIds,  'pruned');
          _markPartitions(c, c.scannedIds, 'scanning');
          _setStats(c, c.prunedIds.length, c.scannedIds.length);
          _applyColumnProjection(c, ['TITLE', 'GENRE', 'RELEASE_YEAR']);
          _setPanel(c,
            'Step 7 of 8',
            'Column Projection — Only 3 of 11 Columns Read',
            'Even within the surviving partitions, Snowflake reads only the columns requested in the SELECT clause. DURATION_MINS, LANGUAGE, COUNTRY_CODE are never loaded.',
            [
              'SELECT TITLE, GENRE, RELEASE_YEAR → 3 column files per partition',
              '8 columns never fetched — 73% of column I/O eliminated',
              'Combined with partition pruning: Netflix sees 90%+ I/O reduction on typical analytical queries',
            ]
          );
        },
        _resetPartitions,
        4000
      ),

      F('Result & Caching', 'Query complete — result stored in Cloud Services',
        (c) => {
          _resetPartitions(c);
          _markPartitions(c, c.prunedIds,  'pruned');
          _markPartitions(c, c.scannedIds, 'idle');
          _setStats(c, c.prunedIds.length, c.scannedIds.length);
          c.container.querySelector('#storage-stats')?.classList.add('active');
          _applyColumnProjection(c, ['TITLE', 'GENRE', 'RELEASE_YEAR']);
          const pct = Math.round((c.prunedIds.length / c.partitions.length) * 100);
          _setPanel(c,
            'Step 8 of 8',
            'Result Returned — Cached for 24 Hours',
            'The warehouse assembles results from scanned partitions and returns them. The result is stored in Snowflake\'s Result Cache (Cloud Services layer). Identical re-runs cost zero compute credits.',
            [
              `Query complete — ${pct}% of the table was never read`,
              'Result Cache entry created (24-hour TTL)',
              'Next identical query → Cloud Services returns cached result instantly',
              'Netflix daily recommendation batch: pre-computed results served from cache to 80M users',
            ]
          );
        },
        _resetPartitions,
        4000
      ),
    ];
  }

  /* ── Fallback data ────────────────────────────────────────── */
  function _fallbackPartitions() {
    return [
      { id:1,  rows:710,  sizeKB:312, minYear:1940, maxYear:1965, genres:['Drama','Classic']       },
      { id:2,  rows:842,  sizeKB:398, minYear:1965, maxYear:1979, genres:['Drama','Crime']          },
      { id:3,  rows:931,  sizeKB:445, minYear:1979, maxYear:1989, genres:['Action','Drama']         },
      { id:4,  rows:1024, sizeKB:512, minYear:1989, maxYear:1995, genres:['Comedy','Romance']       },
      { id:5,  rows:1156, sizeKB:556, minYear:1995, maxYear:2000, genres:['Thriller','Action']      },
      { id:6,  rows:1289, sizeKB:612, minYear:2000, maxYear:2005, genres:['Animation','Comedy']     },
      { id:7,  rows:1401, sizeKB:689, minYear:2005, maxYear:2009, genres:['Drama','SciFi']          },
      { id:8,  rows:1512, sizeKB:734, minYear:2009, maxYear:2013, genres:['Action','Adventure']     },
      { id:9,  rows:1623, sizeKB:801, minYear:2013, maxYear:2016, genres:['Documentary','Drama']    },
      { id:10, rows:1734, sizeKB:856, minYear:2016, maxYear:2018, genres:['Horror','Thriller']      },
      { id:11, rows:1845, sizeKB:912, minYear:2018, maxYear:2020, genres:['Drama','Romance']        },
      { id:12, rows:1901, sizeKB:978, minYear:2020, maxYear:2023, genres:['SciFi','Action']         },
    ];
  }

  /* ── Helpers ─────────────────────────────────────────────── */
  function _el(tag, cls) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    return el;
  }

  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Modules = window.SnowflakeViz.Modules || {};
  window.SnowflakeViz.Modules.storage = StorageModule;
})();
