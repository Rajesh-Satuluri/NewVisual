/* ============================================================
   Home Module — DB Engineering Visualizer landing page
   Interactive roadmap covering all 20 modules / 7 levels
   ============================================================ */

(function () {
  'use strict';

  const mod = {
    id: 'home',
    title: 'Home',
    group: 'get-started',
    _cleanups: [],

    render(container) {
      container.innerHTML = '';
      container.className = '';
      const page = document.createElement('div');
      page.className = 'home-page page-enter';
      page.innerHTML = _buildHTML();
      container.appendChild(page);
      _animateCounters(page);
    },

    destroy() {
      this._cleanups.forEach(fn => fn && fn());
      this._cleanups = [];
      window.IcebergViz.AnimationControls.hide();
    },
  };

  /* ── Roadmap data ────────────────────────────────────────── */
  const LEVELS = [
    {
      id: 'level-0', label: 'Level 0 — Foundation', color: '#3b82f6',
      modules: [
        { id: 'database-introduction', title: 'Why Databases Exist', icon: 'db',
          desc: 'Excel → CSV → Database. See exactly why files fail at scale.', time: '20 min' },
      ],
    },
    {
      id: 'level-1', label: 'Level 1 — DB Design', color: '#10b981',
      modules: [
        { id: 'database-design', title: 'Database Design', icon: 'layers',
          desc: 'Entities → Attributes → Relationships → Conceptual → Logical → Physical.', time: '30 min' },
        { id: 'keys', title: 'Keys', icon: 'key',
          desc: 'Primary, Foreign, Composite, Surrogate, Natural, Candidate.', time: '20 min' },
        { id: 'relationships', title: 'Relationships', icon: 'branch',
          desc: "One-One, One-Many, Many-Many, Bridge tables. Crow's Foot notation.", time: '25 min' },
        { id: 'normalization', title: 'Normalization', icon: 'filter',
          desc: 'Start with one big table. Animate through 1NF → 2NF → 3NF → BCNF.', time: '30 min' },
      ],
    },
    {
      id: 'level-2', label: 'Level 2 — DB Internals', color: '#8b5cf6',
      modules: [
        { id: 'database-storage', title: 'Storage & Pages', icon: 'disk',
          desc: 'Pages, Extents, Heap files, Buffer Pool, WAL — how data lives on disk.', time: '35 min' },
        { id: 'indexes', title: 'Indexes & B+ Trees', icon: 'search',
          desc: 'B+ Tree traversal, Clustered vs Non-Clustered, covering indexes.', time: '40 min' },
        { id: 'query-execution', title: 'Query Execution', icon: 'cpu',
          desc: 'Parser → Optimizer → Execution Plan. Nested Loop, Hash Join, Merge.', time: '45 min' },
      ],
    },
    {
      id: 'level-3', label: 'Level 3 — Reliability & Scale', color: '#f59e0b',
      modules: [
        { id: 'transactions', title: 'Transactions & ACID', icon: 'shield',
          desc: 'ACID properties, Isolation levels, Locks, Latches, MVCC, Deadlocks.', time: '40 min' },
        { id: 'replication', title: 'Replication & HA', icon: 'radio',
          desc: 'Primary-Replica, Synchronous vs Async, Leader Election, Failover.', time: '30 min' },
        { id: 'partitioning', title: 'Partitioning & Sharding', icon: 'branch',
          desc: 'Horizontal partitioning, Consistent Hashing, CAP theorem, PACELC.', time: '30 min' },
      ],
    },
    {
      id: 'level-4', label: 'Level 4 — Analytics', color: '#ef4444',
      modules: [
        { id: 'warehouse', title: 'Data Warehouse', icon: 'warehouse',
          desc: 'OLTP vs OLAP. ETL, CDC, Incremental loading, Data Marts.', time: '30 min' },
        { id: 'dimensional-modeling', title: 'Dimensional Modeling', icon: 'star',
          desc: 'Star Schema builder, Snowflake, Conformed/Junk/Mini dimensions, SCD.', time: '45 min' },
        { id: 'fact-dimensions', title: 'Facts & Dimensions', icon: 'table',
          desc: 'Transactional, Snapshot, Accumulating facts. SCD Type 0-3.', time: '35 min' },
      ],
    },
    {
      id: 'level-5', label: 'Level 5 — Modern Data Engineering', color: '#06b6d4',
      modules: [
        { id: 'medallion', title: 'Medallion Architecture', icon: 'layers',
          desc: "Bronze → Silver → Gold. See data flow through ShopFlow's pipeline.", time: '35 min' },
        { id: 'delta-lake', title: 'Delta Lake', icon: 'zap',
          desc: 'ACID on data lakes. Parquet + transaction log, time travel, compaction.', time: '40 min' },
        { id: 'spark', title: 'Apache Spark', icon: 'spark',
          desc: 'DAGs, Catalyst optimizer, Stages → Tasks → Executors.', time: '50 min' },
      ],
    },
    {
      id: 'level-6', label: 'Level 6 — Governance', color: '#a855f7',
      modules: [
        { id: 'unity-catalog', title: 'Unity Catalog', icon: 'catalog',
          desc: 'Catalog → Schema → Tables → Views → Lineage → Permissions.', time: '35 min' },
        { id: 'lakehouse', title: 'Lakehouse Architecture', icon: 'house',
          desc: 'Warehouse + Lake = Lakehouse. The full ShopFlow data platform.', time: '30 min' },
      ],
    },
    {
      id: 'level-7', label: 'Level 7 — Apply & Test', color: '#64748b',
      modules: [
        { id: 'case-studies', title: 'Case Studies', icon: 'briefcase',
          desc: 'Uber, Netflix, Amazon, Airbnb — ER diagrams, pipelines, architectures.', time: '60 min' },
        { id: 'quiz', title: 'Quiz Mode', icon: 'check',
          desc: 'Test your knowledge across all 20 modules with instant feedback.', time: '30 min' },
      ],
    },
  ];

  /* ── SVG icons ───────────────────────────────────────────────── */
  function _icon(type, color) {
    const paths = {
      db:       'M21 5a9 3 0 10-18 0v14a9 3 0 0018 0V5zM3 12a9 3 0 0018 0',
      layers:   'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
      key:      'M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4',
      branch:   'M6 3v12M18 9a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zM18 9a9 9 0 01-9 9',
      filter:   'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
      disk:     'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12h4m8 0h4M12 4v4m0 8v4',
      search:   'M11 19A8 8 0 1011 3a8 8 0 010 16zM21 21l-4.35-4.35',
      cpu:      'M9 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2h-2M9 3v2h6V3M9 3H6M15 3h3M12 12h.01',
      shield:   'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
      radio:    'M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01',
      warehouse:'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10',
      star:     'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
      table:    'M12 3H3a1 1 0 00-1 1v16a1 1 0 001 1h9M12 3h9a1 1 0 011 1v16a1 1 0 01-1 1h-9M12 3v18',
      zap:      'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
      spark:    'M22 12h-4l-3 9L9 3l-3 9H2',
      catalog:  'M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z',
      house:    'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z',
      briefcase:'M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2',
      check:    'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11',
    };
    const d = paths[type] || paths.db;
    return '<svg viewBox="0 0 24 24" fill="none" stroke="' + color + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" aria-hidden="true"><path d="' + d + '"/></svg>';
  }

  /* ── HTML builder ───────────────────────────────────────────── */
  function _buildHTML() {
    return '<style>\n.home-page { overflow-y: auto; height: 100%; background: var(--bg-1); }\n\n/* Hero */\n.hm-hero {\n  background: linear-gradient(180deg, var(--bg-0) 0%, var(--bg-1) 100%);\n  padding: 72px 48px 56px;\n  text-align: center;\n  position: relative;\n  overflow: hidden;\n  border-bottom: 1px solid var(--border-default);\n}\n.hm-hero::before {\n  content: \'\';\n  position: absolute; inset: 0;\n  background: radial-gradient(ellipse 80% 55% at 50% 0%, rgba(59,130,246,0.08) 0%, transparent 70%);\n  pointer-events: none;\n}\n.hm-eyebrow {\n  display: inline-flex; align-items: center; gap: 8px;\n  padding: 5px 14px;\n  background: rgba(59,130,246,.1); border: 1px solid rgba(59,130,246,.25);\n  border-radius: 9999px;\n  font-size: 11px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase;\n  color: var(--blue); margin-bottom: 24px;\n}\n.hm-logo { margin-bottom: 20px; display: flex; justify-content: center; }\n.hm-title {\n  font-size: clamp(30px,5vw,52px); font-weight: 800; letter-spacing: -0.03em;\n  margin-bottom: 16px; line-height: 1.1; color: var(--text-primary);\n}\n.hm-subtitle {\n  font-size: var(--text-lg); color: var(--text-secondary);\n  max-width: 560px; margin: 0 auto 32px; line-height: 1.65;\n}\n.hm-cta { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 48px; }\n.hm-stats {\n  display: flex; justify-content: center; gap: 40px; flex-wrap: wrap;\n  padding-top: 32px; border-top: 1px solid var(--border-default);\n}\n.hm-stat { text-align: center; }\n.hm-stat-val {\n  font-size: 30px; font-weight: 800; letter-spacing: -0.02em;\n  color: var(--text-primary); font-family: var(--font-mono);\n}\n.hm-stat-lbl { font-size: 12px; color: var(--text-muted); margin-top: 4px; }\n\n/* Roadmap */\n.hm-roadmap { padding: 52px 48px 96px; max-width: 1200px; margin: 0 auto; }\n.hm-roadmap-hd { text-align: center; margin-bottom: 48px; }\n.hm-roadmap-hd h2 { font-size: 26px; font-weight: 700; margin-bottom: 8px; }\n.hm-roadmap-hd p { font-size: 14px; color: var(--text-muted); max-width: 520px; margin: 0 auto; }\n\n/* Level block */\n.hm-level { margin-bottom: 32px; }\n.hm-level-hdr { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }\n.hm-level-pill {\n  font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;\n  padding: 4px 12px; border-radius: 9999px; white-space: nowrap;\n}\n.hm-level-rule { flex: 1; height: 1px; background: var(--border-default); }\n\n/* Module grid */\n.hm-modules { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }\n\n/* Module card */\n.hm-card {\n  background: var(--bg-2); border: 1px solid var(--border-default); border-radius: 12px;\n  padding: 18px; cursor: pointer;\n  transition: border-color 0.18s, box-shadow 0.18s, transform 0.18s;\n  position: relative; overflow: hidden;\n  display: flex; flex-direction: column; gap: 10px;\n  text-decoration: none;\n}\n.hm-card::before {\n  content: \'\'; position: absolute; top: 0; left: 0; right: 0; height: 2px;\n  opacity: 0; transition: opacity 0.18s; border-radius: 12px 12px 0 0;\n}\n.hm-card:hover {\n  border-color: var(--border-muted);\n  box-shadow: 0 8px 28px rgba(0,0,0,.45);\n  transform: translateY(-2px);\n}\n.hm-card:hover::before { opacity: 1; }\n.hm-card-icon {\n  width: 40px; height: 40px; border-radius: 10px;\n  display: flex; align-items: center; justify-content: center; flex-shrink: 0;\n}\n.hm-card-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }\n.hm-card.done { border-color: rgba(63,185,80,.35); }\n.hm-card-check { color: var(--green); font-weight: 700; margin-left: 4px; }\n.hm-card-desc { font-size: 12px; color: var(--text-muted); line-height: 1.55; flex: 1; }\n.hm-card-foot {\n  display: flex; align-items: center; justify-content: space-between; margin-top: 2px;\n}\n.hm-card-time { font-size: 11px; color: var(--text-disabled); font-family: var(--font-mono); }\n.hm-card-arr {\n  font-size: 14px; color: var(--text-muted);\n  opacity: 0; transition: opacity 0.15s, transform 0.15s;\n}\n.hm-card:hover .hm-card-arr { opacity: 1; transform: translateX(4px); }\n\n/* Connector */\n.hm-connector { text-align: center; padding: 6px; color: var(--text-disabled); font-size: 18px; line-height: 1; }\n\n@media (max-width: 700px) {\n  .hm-hero, .hm-roadmap { padding-left: 20px; padding-right: 20px; }\n  .hm-stats { gap: 20px; }\n  .hm-stat-val { font-size: 22px; }\n}\n</style>\n\n' + _buildHero() + '\n' + _buildRoadmap();
  }

  function _buildHero() {
    return '<div class="hm-hero">\n  <div class="hm-eyebrow">\n    <svg viewBox="0 0 16 16" fill="currentColor" width="10" height="10"><circle cx="8" cy="8" r="8"/></svg>\n    ShopFlow Engineering — Learn by Building\n  </div>\n  <div class="hm-logo">\n    <svg viewBox="0 0 68 68" width="72" height="72" fill="none" aria-hidden="true">\n      <defs>\n        <linearGradient id="hm-grad" x1="0" y1="0" x2="68" y2="68" gradientUnits="userSpaceOnUse">\n          <stop offset="0%" stop-color="#3b82f6"/>\n          <stop offset="100%" stop-color="#06b6d4"/>\n        </linearGradient>\n      </defs>\n      <rect x="4" y="4" width="60" height="60" rx="16" fill="rgba(59,130,246,0.08)" stroke="url(#hm-grad)" stroke-width="1.5"/>\n      <path d="M18 48 L34 20 L50 48" stroke="url(#hm-grad)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>\n      <circle cx="34" cy="34" r="4.5" fill="url(#hm-grad)"/>\n      <ellipse cx="34" cy="50" rx="10" ry="3" fill="rgba(59,130,246,0.15)" stroke="url(#hm-grad)" stroke-width="1.5"/>\n    </svg>\n  </div>\n  <h1 class="hm-title">DB Engineering Visualizer</h1>\n  <p class="hm-subtitle">Learn Database Engineering from zero to Lakehouse — through the story of ShopFlow, a 50M-customer e-commerce platform.</p>\n  <div class="hm-cta">\n    <button class="btn btn-primary btn-lg" data-nav="database-introduction">Start Learning &#8594;</button>\n    <button class="btn btn-secondary btn-lg"\n      onclick="this.closest(\'.home-page\').querySelector(\'.hm-roadmap\').scrollIntoView({behavior:\'smooth\'});">\n      View Roadmap &#8595;\n    </button>\n  </div>\n  <div class="hm-stats">\n    <div class="hm-stat">\n      <div class="hm-stat-val" data-counter="20">0</div>\n      <div class="hm-stat-lbl">Interactive Modules</div>\n    </div>\n    <div class="hm-stat">\n      <div class="hm-stat-val" data-counter="8">0</div>\n      <div class="hm-stat-lbl">Learning Levels</div>\n    </div>\n    <div class="hm-stat">\n      <div class="hm-stat-val" data-counter="200">0</div>\n      <div class="hm-stat-lbl">Animated Steps</div>\n    </div>\n    <div class="hm-stat">\n      <div class="hm-stat-val" data-counter="50">0</div>\n      <div class="hm-stat-lbl">Million Customers (ShopFlow)</div>\n    </div>\n  </div>\n</div>';
  }

  function _buildRoadmap() {
    var html = '<div class="hm-roadmap">\n  <div class="hm-roadmap-hd">\n    <h2>The Learning Roadmap</h2>\n    <p>Every concept builds on the last. Follow the path from raw spreadsheets to a production-grade Lakehouse.</p>\n  </div>';

    LEVELS.forEach(function(level, li) {
      var c = level.color;
      html += '\n  <div class="hm-level">\n    <div class="hm-level-hdr">\n      <div class="hm-level-pill" style="background:' + c + '18;color:' + c + ';border:1px solid ' + c + '35;">' + level.label + '</div>\n      <div class="hm-level-rule"></div>\n    </div>\n    <div class="hm-modules">';

      level.modules.forEach(function(m) {
        var done = window.IcebergViz.Progress && window.IcebergViz.Progress.isVisited(m.id);
        var check = done ? ' <span class="hm-card-check" title="Visited">&#10003;</span>' : '';
        html += '\n      <div class="hm-card' + (done ? ' done' : '') + '" data-nav="' + m.id + '" role="button" tabindex="0" aria-label="Go to ' + m.title + '">\n        <style>.hm-card[data-nav="' + m.id + '"]::before{background:' + c + ';}</style>\n        <div class="hm-card-icon" style="background:' + c + '18;">' + _icon(m.icon, c) + '</div>\n        <div class="hm-card-name">' + m.title + check + '</div>\n        <div class="hm-card-desc">' + m.desc + '</div>\n        <div class="hm-card-foot">\n          <span class="hm-card-time">' + m.time + '</span>\n          <span class="hm-card-arr">&#8594;</span>\n        </div>\n      </div>';
      });

      html += '\n    </div>\n  </div>';

      if (li < LEVELS.length - 1) {
        html += '<div class="hm-connector">&#8595;</div>';
      }
    });

    html += '\n</div>';
    return html;
  }

  /* ── Counter animation ────────────────────────────────────────── */
  function _animateCounters(page) {
    page.querySelectorAll('[data-counter]').forEach(function(el) {
      var target = parseInt(el.dataset.counter, 10);
      var dur = 1200;
      var start = null;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(eased * target);
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.modules = window.IcebergViz.modules || {};
  window.IcebergViz.modules['home'] = mod;
})();
