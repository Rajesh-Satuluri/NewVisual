/* ============================================================
   DBViz App — Bootstrap, Router, Navigation
   Entry point: runs after all modules are loaded.
   ============================================================ */

(function () {
  'use strict';

  const IV = window.IcebergViz;

  /* ── Navigation registry ─────────────────────────────────── */
  const NAV_GROUPS = [
    {
      id: 'get-started',
      label: 'Get Started',
      items: [
        { id: 'home',                  label: 'Home',                    icon: 'home',       available: true  },
        { id: 'database-introduction', label: 'Why Databases Exist',     icon: 'database',   available: true  },
      ],
    },
    {
      id: 'db-design',
      label: 'DB Design',
      items: [
        { id: 'database-design',       label: 'Database Design',         icon: 'layers',     available: false },
        { id: 'keys',                  label: 'Keys',                    icon: 'key',        available: true  },
        { id: 'relationships',         label: 'Relationships',           icon: 'git-branch', available: true  },
        { id: 'normalization',         label: 'Normalization',           icon: 'filter',     available: true  },
      ],
    },
    {
      id: 'db-internals',
      label: 'DB Internals',
      items: [
        { id: 'database-storage',      label: 'Storage & Pages',         icon: 'disk',       available: false },
        { id: 'indexes',               label: 'Indexes & B+ Trees',      icon: 'search',     available: false },
        { id: 'query-execution',       label: 'Query Execution',         icon: 'cpu',        available: false },
      ],
    },
    {
      id: 'reliability',
      label: 'Reliability & Scale',
      items: [
        { id: 'transactions',          label: 'Transactions & ACID',     icon: 'shield',     available: false },
        { id: 'replication',           label: 'Replication & HA',        icon: 'radio',      available: false },
        { id: 'partitioning',          label: 'Partitioning & Sharding', icon: 'git-branch', available: false },
      ],
    },
    {
      id: 'analytics',
      label: 'Analytics',
      items: [
        { id: 'warehouse',             label: 'Data Warehouse',          icon: 'warehouse',  available: false },
        { id: 'dimensional-modeling',  label: 'Dimensional Modeling',    icon: 'star',       available: false },
        { id: 'fact-dimensions',       label: 'Facts & Dimensions',      icon: 'table',      available: false },
      ],
    },
    {
      id: 'modern-de',
      label: 'Modern Data Engineering',
      items: [
        { id: 'medallion',             label: 'Medallion Architecture',  icon: 'layers',     available: false },
        { id: 'delta-lake',            label: 'Delta Lake',              icon: 'zap',        available: false },
        { id: 'spark',                 label: 'Apache Spark',            icon: 'activity',   available: false },
      ],
    },
    {
      id: 'governance',
      label: 'Governance',
      items: [
        { id: 'unity-catalog',         label: 'Unity Catalog',           icon: 'folder',     available: false },
        { id: 'lakehouse',             label: 'Lakehouse Architecture',  icon: 'home',       available: false },
      ],
    },
    {
      id: 'apply',
      label: 'Apply & Test',
      items: [
        { id: 'case-studies',          label: 'Case Studies',            icon: 'file-text',  available: false },
        { id: 'quiz',                  label: 'Quiz Mode',               icon: 'check',      available: false },
      ],
    },
  ];

  /* ── Icon set ────────────────────────────────────────────── */
  function _navIcon(name) {
    const p = {
      home:             'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10',
      shield:           'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
      layers:           'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
      folder:           'M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z',
      clock:            'M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2',
      columns:          'M12 3H3a1 1 0 00-1 1v16a1 1 0 001 1h9M12 3h9a1 1 0 011 1v16a1 1 0 01-1 1h-9M12 3v18',
      filter:           'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
      zap:              'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
      radio:            'M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01',
      check:            'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11',
      'arrow-down':     'M12 5v14M19 12l-7 7-7-7',
      upload:           'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12',
      merge:            'M18 21v-4a4 4 0 00-4-4H6M6 3v4a4 4 0 004 4h8 M15 18l3 3 3-3',
      trash:            'M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6',
      save:             'M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8',
      search:           'M11 19A8 8 0 1011 3a8 8 0 010 16zM21 21l-4.35-4.35',
      'bar-chart':      'M18 20V10M12 20V4M6 20v-6',
      camera:           'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z M12 17a4 4 0 100-8 4 4 0 000 8z',
      database:         'M12 2a9 3 0 100 6 9 3 0 000-6zM3 5v14a9 3 0 0018 0V5M3 12a9 3 0 0018 0',
      'git-branch':     'M6 3v12M18 9a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zM18 9a9 9 0 01-9 9',
      lock:             'M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4',
      'eye-off':        'M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22',
      share:            'M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13',
      'file-text':      'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6M16 13H8M16 17H8M10 9H8',
      cpu:              'M9 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2h-2M9 3v2h6V3M9 3H6M15 3h3M12 12h.01',
      star:             'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
      target:           'M12 22a10 10 0 100-20 10 10 0 000 20zM12 18a6 6 0 100-12 6 6 0 000 12zM12 14a2 2 0 100-4 2 2 0 000 4z',
      activity:         'M22 12h-4l-3 9L9 3l-3 9H2',
      tool:             'M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z',
      users:            'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
      'message-square': 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
      'check-square':   'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11',
      key:              'M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4',
      disk:             'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12h4m8 0h4M12 4v4m0 8v4',
      warehouse:        'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10',
      table:            'M12 3H3a1 1 0 00-1 1v16a1 1 0 001 1h9M12 3h9a1 1 0 011 1v16a1 1 0 01-1 1h-9M12 3v18',
    };
    const d = p[name] || p.home;
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><path d="${d}"/></svg>`;
  }

  function _chevronSvg() {
    return `<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" width="10" height="10" aria-hidden="true"><path d="M3 4l3 3 3-3"/></svg>`;
  }

  /* ── Build sidebar navigation ────────────────────────────── */
  function _buildNav() {
    const nav = document.getElementById('sidebar-nav');
    if (!nav) return;
    nav.innerHTML = '';

    NAV_GROUPS.forEach(group => {
      const section = document.createElement('div');
      section.className = 'nav-group';
      section.dataset.group = group.id;

      const groupHeader = document.createElement('div');
      groupHeader.className = 'nav-group-header';
      groupHeader.innerHTML = `
        <span class="nav-group-label">${group.label}</span>
        <span class="nav-group-chevron">${_chevronSvg()}</span>
      `;
      groupHeader.addEventListener('click', () => section.classList.toggle('collapsed'));
      section.appendChild(groupHeader);

      const itemsContainer = document.createElement('div');
      itemsContainer.className = 'nav-group-items';

      group.items.forEach(item => {
        const a = document.createElement('a');
        a.href = item.available ? '#' + item.id : 'javascript:void(0)';
        a.className = 'nav-item' + (item.available ? '' : ' coming-soon');
        a.dataset.navId = item.id;
        a.innerHTML = `
          <span class="nav-icon">${_navIcon(item.icon)}</span>
          <span class="nav-label">${item.label}</span>
          ${!item.available ? '<span class="nav-badge">soon</span>' : ''}
        `;
        if (!item.available) {
          a.addEventListener('click', (e) => {
            e.preventDefault();
            _showComingSoon(item.label);
          });
        }
        itemsContainer.appendChild(a);
      });

      section.appendChild(itemsContainer);
      nav.appendChild(section);
    });
  }

  function _setActiveNav(id) {
    document.querySelectorAll('a.nav-item[data-nav-id]').forEach(a => {
      a.classList.toggle('active', a.dataset.navId === id);
    });
  }

  function _setBreadcrumb(id) {
    const bc = document.getElementById('breadcrumb');
    if (!bc) return;
    let groupLabel = '';
    let itemLabel = '';
    NAV_GROUPS.forEach(g => {
      g.items.forEach(item => {
        if (item.id === id) { groupLabel = g.label; itemLabel = item.label; }
      });
    });
    bc.innerHTML = `
      <span class="bc-root">DBViz</span>
      ${groupLabel ? '<span class="bc-sep">›</span><span class="bc-group">' + groupLabel + '</span>' : ''}
      ${itemLabel ? '<span class="bc-sep">›</span><span class="bc-current">' + itemLabel + '</span>' : ''}
    `;
  }

  function _showComingSoon(label) {
    const existing = document.querySelector('.coming-soon-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'coming-soon-toast';
    toast.innerHTML = `<strong>${label}</strong> is coming in a future iteration!`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  let _currentModuleId = null;
  let _currentModuleInstance = null;

  function navigate(id) {
    id = id || 'home';
    if (id === _currentModuleId) return;

    if (_currentModuleInstance && typeof _currentModuleInstance.destroy === 'function') {
      try { _currentModuleInstance.destroy(); } catch(e) { console.warn('Module destroy error:', e); }
    }
    IV.AnimationControls.hide();

    const container = document.getElementById('module-container');
    if (!container) return;

    const mod = IV.modules[id];
    if (!mod) {
      container.innerHTML = `
        <div class="placeholder-module">
          <div class="placeholder-icon">&#9711;</div>
          <h2>${id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</h2>
          <p>This module is coming in a future iteration.</p>
          <button class="btn-primary" onclick="location.hash='home'">&#8592; Back to Home</button>
        </div>
      `;
      _currentModuleId = id;
      _currentModuleInstance = null;
      _setActiveNav(id);
      _setBreadcrumb(id);
      return;
    }

    container.innerHTML = '';
    try {
      mod.render(container);
    } catch(err) {
      console.error('Module render error [' + id + ']:', err);
      container.innerHTML = `
        <div class="error-module">
          <h3>Error rendering module: ${id}</h3>
          <pre>${err.message}\n\n${err.stack || ''}</pre>
        </div>
      `;
    }

    _currentModuleId = id;
    _currentModuleInstance = mod;
    if (IV.Progress && id !== 'home') IV.Progress.markVisited(id);
    _setActiveNav(id);
    _setBreadcrumb(id);

    container.scrollTop = 0;
    window.scrollTo(0, 0);

    if (location.hash !== '#' + id) {
      history.pushState(null, '', '#' + id);
    }
  }

  function _routeFromHash() {
    const hash = location.hash.replace('#', '').trim();
    navigate(hash || 'home');
  }

  function _initSidebarSearch() {
    const input = document.getElementById('sidebar-search');
    if (!input) return;
    input.addEventListener('input', () => {
      const q = input.value.toLowerCase().trim();
      document.querySelectorAll('a.nav-item[data-nav-id]').forEach(a => {
        const label = a.querySelector('.nav-label')?.textContent.toLowerCase() || '';
        a.style.display = !q || label.includes(q) ? '' : 'none';
      });
      if (q) {
        document.querySelectorAll('.nav-group').forEach(g => g.classList.remove('collapsed'));
      }
    });
  }

  function _initSidebarToggle() {
    const toggleBtn = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    if (!toggleBtn || !sidebar) return;
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      localStorage.setItem('dv-sidebar-collapsed', sidebar.classList.contains('collapsed') ? '1' : '0');
    });
    if (localStorage.getItem('dv-sidebar-collapsed') === '1') {
      sidebar.classList.add('collapsed');
    }
  }

  function _initThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const root = document.documentElement;
      const next = root.dataset.theme === 'light' ? 'dark' : 'light';
      root.dataset.theme = next;
      localStorage.setItem('dv-theme', next);
    });
    const saved = localStorage.getItem('dv-theme');
    if (saved) document.documentElement.dataset.theme = saved;
  }

  function _initShortcutsModal() {
    const modal = document.getElementById('shortcuts-modal');
    if (!modal) return;
    const close = () => modal.classList.remove('visible');
    modal.querySelector('.modal-close')?.addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    IV._showShortcutsModal = () => modal.classList.add('visible');
  }

  function _wireNavCards() {
    document.addEventListener('click', (e) => {
      const card = e.target.closest('[data-nav]');
      if (card) {
        const target = card.dataset.nav;
        if (target) { e.preventDefault(); navigate(target); }
      }
    });
  }

  function _boot() {
    IV.Tooltip.init();
    IV.AnimationControls.init();
    IV.Keyboard.init(navigate);

    _buildNav();
    _initSidebarSearch();
    _initSidebarToggle();
    _initThemeToggle();
    _initShortcutsModal();
    _wireNavCards();

    window.addEventListener('hashchange', _routeFromHash);
    _routeFromHash();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _boot);
  } else {
    _boot();
  }

  window.IcebergViz.navigate = navigate;
})();
