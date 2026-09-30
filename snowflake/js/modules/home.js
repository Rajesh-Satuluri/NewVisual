/* ============================================================
   Home Module — landing page with Netflix story + module cards
   ============================================================ */

(function () {
  'use strict';

  const MODULE_CARDS = [
    {
      group: 'Foundation',
      items: [
        { id: 'intro',          icon: '🎬', label: 'Introduction',      desc: 'Why Snowflake? Netflix\'s data challenges and how Snowflake solves them.' },
      ],
    },
    {
      group: 'Architecture',
      items: [
        { id: 'architecture',   icon: '🏛️', label: 'Architecture',       desc: 'Three-layer architecture: Cloud Services, Virtual Warehouses, Storage.' },
        { id: 'cloud-services', icon: '☁️', label: 'Cloud Services',     desc: 'Query optimizer, metadata, authentication, access control.' },
        { id: 'storage',        icon: '🗄️', label: 'Storage Layer',      desc: 'Micro-partitions, columnar storage, metadata-driven pruning.' },
        { id: 'compute',        icon: '⚡', label: 'Compute Layer',      desc: 'Virtual Warehouses: multi-cluster, auto-scaling, auto-suspend.' },
      ],
    },
    {
      group: 'Query & Data',
      items: [
        { id: 'query-execution', icon: '🔍', label: 'Query Execution',  desc: 'From SQL parse to result: compilation, optimization, execution.' },
        { id: 'caching',         icon: '💾', label: 'Caching',           desc: 'Three cache layers: result cache, local disk cache, remote disk cache.' },
        { id: 'data-loading',    icon: '📥', label: 'Data Loading',      desc: 'COPY INTO, Snowpipe, Kafka connector, streaming ingestion.' },
      ],
    },
    {
      group: 'Platform',
      items: [
        { id: 'objects',   icon: '🗂️', label: 'Objects & Hierarchy', desc: 'Org → Account → Database → Schema → Table hierarchy in full.' },
        { id: 'advanced',  icon: '🚀', label: 'Advanced Features',   desc: 'Time Travel, Fail-Safe, Zero-Copy Clone, Data Sharing, Snowpark.' },
        { id: 'security',  icon: '🔒', label: 'Security & Governance',desc: 'RBAC, Dynamic Data Masking, Row Access Policies, Compliance.' },
      ],
    },
    {
      group: 'Capstone',
      items: [
        { id: 'e2e-flow',  icon: '🎯', label: 'E2E Flow',            desc: 'Follow a single Netflix watch event from click to recommendation.' },
      ],
    },
  ];

  const HomeModule = {
    render(canvas, { data }) {
      const nd = data;

      canvas.innerHTML = '';

      /* hero */
      const hero = _el('div', 'home-hero');
      hero.innerHTML = `
        <div class="home-hero-badge">Netflix · Snowflake Architecture Handbook</div>
        <h1 class="home-hero-title">
          How Netflix powers<br>
          <span class="gradient-text">238 million subscribers</span><br>
          with Snowflake
        </h1>
        <p class="home-hero-sub">
          An interactive, step-by-step guide to Snowflake's architecture —
          cloud services, virtual warehouses, and columnar storage —
          told through Netflix's real-world data platform.
        </p>
        <div class="home-hero-cta">
          <button class="btn btn-primary" id="home-start-btn">Start Learning</button>
          <button class="btn btn-ghost" id="home-jump-arch-btn">Jump to Architecture</button>
        </div>`;
      canvas.appendChild(hero);

      /* stats strip */
      const stats = _el('div', 'home-stats-strip');
      const statItems = [
        { label: 'Subscribers',         value: '238M',   sub: 'across 190 countries' },
        { label: 'Daily Watch Events',  value: '1.4B',   sub: 'rows ingested per day' },
        { label: 'Watch Events Table',  value: '500B',   sub: 'rows · 180 TB' },
        { label: 'Compute Credits',     value: '2.5M',   sub: 'Snowflake credits / month' },
        { label: 'Daily Watch Hours',   value: '100M',   sub: 'hours streamed daily' },
      ];
      statItems.forEach(s => {
        const card = _el('div', 'home-stat-card');
        card.innerHTML = `<div class="home-stat-value">${s.value}</div>
          <div class="home-stat-label">${s.label}</div>
          <div class="home-stat-sub">${s.sub}</div>`;
        stats.appendChild(card);
      });
      canvas.appendChild(stats);

      /* architecture preview */
      const preview = _el('div', 'home-arch-preview');
      preview.innerHTML = `
        <h2 class="section-title">Three-Layer Architecture</h2>
        <p class="section-sub">Snowflake separates Compute, Storage, and Cloud Services — each scales independently.</p>`;

      const layers = [
        {
          name: 'Cloud Services Layer',
          color: '#a371f7',
          icon: '☁️',
          desc: 'Query optimizer, authentication, metadata, access control. Always on — no warehouse needed.',
          tags: ['Query Optimizer', 'Metadata Store', 'RBAC', 'Transactions'],
        },
        {
          name: 'Virtual Warehouses (Compute)',
          color: '#29b5e8',
          icon: '⚡',
          desc: 'Independent compute clusters. Netflix runs 5 dedicated warehouses for different teams.',
          tags: ['INGEST_WH', 'ANALYTICS_WH', 'ML_TRAINING_WH', 'MARKETING_WH', 'EXEC_WH'],
        },
        {
          name: 'Centralized Storage',
          color: '#3fb950',
          icon: '🗄️',
          desc: 'Columnar micro-partitions in S3/Azure/GCS. Immutable, compressed, automatically managed.',
          tags: ['Micro-Partitions', 'Columnar', 'Compressed', 'Immutable'],
        },
      ];

      const layerGrid = _el('div', 'home-layer-grid');
      layers.forEach(l => {
        const card = _el('div', 'home-layer-card');
        card.style.borderColor = l.color + '40';
        card.innerHTML = `
          <div class="home-layer-icon" style="color:${l.color}">${l.icon}</div>
          <div class="home-layer-name" style="color:${l.color}">${l.name}</div>
          <p class="home-layer-desc">${l.desc}</p>
          <div class="home-layer-tags">${l.tags.map(t => `<span class="chip">${t}</span>`).join('')}</div>`;
        layerGrid.appendChild(card);
      });
      preview.appendChild(layerGrid);
      canvas.appendChild(preview);

      /* warehouses section */
      const whSection = _el('div', 'home-wh-section');
      whSection.innerHTML = `<h2 class="section-title">Netflix Virtual Warehouses</h2>
        <p class="section-sub">Each team at Netflix has a dedicated warehouse — compute isolation without data duplication.</p>`;

      const whGrid = _el('div', 'home-wh-grid');
      if (nd && nd.warehouses) {
        nd.warehouses.forEach(wh => {
          const card = _el('div', 'home-wh-card');
          card.style.borderLeftColor = wh.color;
          card.innerHTML = `
            <div class="home-wh-header">
              <span class="home-wh-name" style="color:${wh.color}">${wh.name}</span>
              <span class="tier-badge tier-${_sizeClass(wh.size)}">${wh.size}</span>
            </div>
            <p class="home-wh-purpose">${wh.purpose}</p>
            <div class="home-wh-meta">
              <span>Clusters: ${wh.clusterMin}–${wh.clusterMax}</span>
              <span>Auto-suspend: ${wh.autoSuspend}s</span>
              <span class="home-wh-team">${wh.team}</span>
            </div>`;
          whGrid.appendChild(card);
        });
      }
      whSection.appendChild(whGrid);
      canvas.appendChild(whSection);

      /* module cards */
      const modsSection = _el('div', 'home-modules-section');
      modsSection.innerHTML = `<h2 class="section-title">All Modules</h2>
        <p class="section-sub">Navigate any topic directly, or follow the guided path from top to bottom.</p>`;

      MODULE_CARDS.forEach(group => {
        const grpEl = _el('div', 'home-module-group');
        const grpTitle = _el('div', 'home-module-group-title');
        grpTitle.textContent = group.group;
        grpEl.appendChild(grpTitle);

        const grid = _el('div', 'home-module-grid');
        group.items.forEach(item => {
          const card = _el('div', 'home-module-card');
          card.tabIndex = 0;
          card.innerHTML = `
            <div class="home-module-icon">${item.icon}</div>
            <div class="home-module-info">
              <div class="home-module-label">${item.label}</div>
              <div class="home-module-desc">${item.desc}</div>
            </div>
            <div class="home-module-arrow">›</div>`;

          const go = () => window.SnowflakeViz.navigate(item.id);
          card.addEventListener('click', go);
          card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
          grid.appendChild(card);
        });
        grpEl.appendChild(grid);
        modsSection.appendChild(grpEl);
      });
      canvas.appendChild(modsSection);

      /* wire CTA buttons */
      canvas.querySelector('#home-start-btn')?.addEventListener('click', () => {
        window.SnowflakeViz.navigate('intro');
      });
      canvas.querySelector('#home-jump-arch-btn')?.addEventListener('click', () => {
        window.SnowflakeViz.navigate('architecture');
      });

      return {};
    },
  };

  function _el(tag, cls) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    return el;
  }

  function _sizeClass(size) {
    const map = {
      'Small': 'small',
      'Medium': 'medium',
      'Large': 'large',
      'X-Large': 'xlarge',
      'X-Large (Snowpark)': 'xlarge',
      '2X-Large': 'xxlarge',
    };
    return map[size] || 'medium';
  }

  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Modules = window.SnowflakeViz.Modules || {};
  window.SnowflakeViz.Modules.home = HomeModule;
})();
