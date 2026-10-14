/* ============================================================
   RedshiftViz App — router, nav, module loader
   Netflix Snowflake Architecture Handbook
   ============================================================ */

(function () {
  'use strict';

  /* ── Module registry ────────────────────────────────────── */
  const NAV_GROUPS = [
    {
      label: "🧠 Learn — Fundamentals",
      items: [
        { id: "home", label: "Home", icon: "🧭" },
        { id: "intro", label: "Introduction", icon: "🎬" },
        { id: "architecture", label: "Architecture", icon: "🏛️" },
        { id: "ra3-managed-storage", label: "RA3 & Managed Storage", icon: "🗄️" },
        { id: "serverless", label: "Redshift Serverless", icon: "⚡" },
        { id: "columnar-storage", label: "Columnar Storage & Zone Maps", icon: "📊" },
      ],
    },
    {
      label: "🧠 Learn — Internals & Data",
      items: [
        { id: "distribution-styles", label: "Distribution Styles", icon: "🔀" },
        { id: "sort-keys", label: "Sort Keys", icon: "↕️" },
        { id: "compression", label: "Compression & Encoding", icon: "🗜️" },
        { id: "vacuum-analyze", label: "VACUUM & ANALYZE", icon: "🧹" },
        { id: "query-execution", label: "Query Execution", icon: "🔍" },
        { id: "result-caching", label: "Result Caching", icon: "💾" },
        { id: "materialized-views", label: "Materialized Views", icon: "🧱" },
      ],
    },
    {
      label: "⚡ Scale & Performance",
      items: [
        { id: "wlm", label: "Workload Management (WLM)", icon: "🚦" },
        { id: "concurrency-scaling", label: "Concurrency Scaling", icon: "➕" },
        { id: "resize", label: "Elastic vs Classic Resize", icon: "📏" },
        { id: "short-query-accel", label: "Short Query Acceleration", icon: "🏃" },
        { id: "cost-performance", label: "Cost & Performance", icon: "💰" },
      ],
    },
    {
      label: "🔌 Ecosystem & Integration",
      items: [
        { id: "spectrum", label: "Redshift Spectrum", icon: "🪣" },
        { id: "federated-query", label: "Federated Query", icon: "🌉" },
        { id: "datashares", label: "Data Sharing (Datashares)", icon: "🤝" },
        { id: "redshift-ml", label: "Redshift ML", icon: "🤖" },
        { id: "super-partiql", label: "SUPER & PartiQL", icon: "🧩" },
        { id: "copy-unload", label: "COPY & UNLOAD", icon: "🔁" },
      ],
    },
    {
      label: "🔐 Security & Governance",
      items: [
        { id: "iam-rbac", label: "IAM & RBAC", icon: "🔑" },
        { id: "kms-encryption", label: "Encryption & KMS", icon: "🔒" },
        { id: "lake-formation", label: "Lake Formation Integration", icon: "🏞️" },
      ],
    },
    {
      label: "🚨 Troubleshoot",
      items: [
        { id: "lab-troubleshooting", label: "Troubleshooting Lab", icon: "🔥" },
        { id: "lab-failure", label: "Architecture Failure", icon: "💥" },
        { id: "lab-de", label: "Redshift + Data Eng", icon: "🔗" },
      ],
    },
    {
      label: "🔎 Optimize",
      items: [
        { id: "lab-query-opt", label: "Query Optimization Lab", icon: "🔎" },
        { id: "lab-cost", label: "Cost Decision Lab", icon: "💸" },
      ],
    },
    {
      label: "🎯 Practice",
      items: [
        { id: "lab-decisions", label: "Feature Decisions", icon: "⚖️" },
        { id: "lab-sql", label: "SQL Scenarios", icon: "🧮" },
        { id: "lab-traps", label: "Interview Traps", icon: "⚠️" },
        { id: "lab-cert-interview", label: "Cert → Interview", icon: "🎓" },
        { id: "interview-prep", label: "Interview Prep", icon: "💬" },
      ],
    },
    {
      label: "🏗️ Design",
      items: [
        { id: "lab-design", label: "System Design", icon: "🏗️" },
        { id: "lab-rbac", label: "RBAC Design Lab", icon: "🔐" },
        { id: "lab-loading", label: "Data Loading Lab", icon: "📥" },
      ],
    },
    {
      label: "🎤 Interview",
      items: [
        { id: "lab-chains", label: "Follow-Up Chains", icon: "🎤" },
        { id: "lab-answers", label: "Bad → Good → Senior", icon: "🌟" },
        { id: "lab-case", label: "E2E Case Study", icon: "🎬" },
        { id: "lab-mock", label: "Mock Interview", icon: "🎙️" },
      ],
    },
    {
      label: "📊 Progress",
      items: [
        { id: "lab-dashboard", label: "Readiness Dashboard", icon: "📈" },
      ],
    },
    {
      label: "📚 Reference",
      items: [
        { id: "reference", label: "Glossary & Cheat Sheet", icon: "📚" },
        { id: "comparison", label: "Redshift vs Field", icon: "🔬" },
        { id: "certification", label: "AWS Cert Map", icon: "🎓" },
        { id: "e2e-flow", label: "E2E Capstone Flow", icon: "🎯" },
      ],
    },
  ];

  /* ── App state ──────────────────────────────────────────── */
  let _currentModuleId = null;
  let _currentModuleInstance = null;

  /* ── Boot ───────────────────────────────────────────────── */
  function init() {
    _buildNav();
    _bindSearch();
    _bindThemeToggle();
    _setupMobileNav();

    const viz = window.RedshiftViz;
    viz.Keyboard.init(navigate);
    viz.Tooltip.init();
    viz.AnimationControls.init();
    _setupShortcutsModal();

    // Expose the nav registry for the palette, pager, gestures, progress.
    viz.NAV_GROUPS = NAV_GROUPS;
    viz.CommandPalette && viz.CommandPalette.init();
    viz.Enhance && viz.Enhance.init();

    // Restore last-visited module when there is no explicit hash target.
    let lastModule = null;
    try { lastModule = localStorage.getItem('rviz-last-module'); } catch (_) {}
    const initial = _hashToId(location.hash) || lastModule || 'home';
    _applyPendingStep();
    navigate(initial);

    window.addEventListener('hashchange', () => {
      const id = _hashToId(location.hash);
      _applyPendingStep();
      if (id && id !== _currentModuleId) navigate(id);
    });
  }

  /* Parse "#module" or "#module/step" — stash the step for the engine. */
  function _applyPendingStep() {
    const raw = (location.hash || '').replace(/^#/, '');
    const parts = raw.split('/');
    const step = parts[1] != null ? parseInt(parts[1], 10) : null;
    window.RedshiftViz._pendingStep = Number.isInteger(step) ? step : null;
  }

  /* ── Navigation ─────────────────────────────────────────── */
  function navigate(moduleId) {
    const allItems = NAV_GROUPS.flatMap(g => g.items);
    const target = allItems.find(i => i.id === moduleId) || allItems[0];
    if (_currentModuleId === target.id) return;

    _currentModuleId = target.id;
    window.RedshiftViz.currentModuleId = target.id;
    try { localStorage.setItem('rviz-last-module', target.id); } catch (_) {}

    document.querySelectorAll('.nav-item').forEach(el => {
      const on = el.dataset.module === target.id;
      el.classList.toggle('active', on);
      if (on) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
    });

    _updateBreadcrumb(target);

    const viz = window.RedshiftViz;
    viz.AnimationControls.hide();
    if (_currentModuleInstance && typeof _currentModuleInstance.destroy === 'function') {
      _currentModuleInstance.destroy();
    }
    _currentModuleInstance = null;

    history.replaceState(null, '', '#' + target.id);

    const canvas = document.getElementById('canvas');
    if (!canvas) return;
    canvas.innerHTML = '';
    canvas.classList.add('loading');

    const modKey = _idToModuleKey(target.id);
    const mod = viz.Modules && viz.Modules[modKey];
    if (mod) {
      try {
        _currentModuleInstance = mod.render(canvas, {
          data:     viz.NetflixData,
          concepts: viz.Concepts,
        });
      } catch (err) {
        canvas.innerHTML = `<div class="placeholder-msg"><p>Error loading module: ${err.message}</p></div>`;
      }
    } else {
      canvas.innerHTML = `<div class="placeholder-msg">
        <div class="placeholder-icon">${target.icon}</div>
        <h2>${target.label}</h2>
        <p class="text-muted">Module coming in a future iteration.</p>
      </div>`;
    }
    canvas.classList.remove('loading');

    // Dismiss the off-canvas drawer after choosing a module on tablet/mobile.
    if (window.innerWidth <= 1024 && window.RedshiftViz._closeMobileNav) {
      window.RedshiftViz._closeMobileNav();
    }

    // Notify enhancements (progress, pager) that navigation completed.
    document.dispatchEvent(new CustomEvent('rviz:navigate', { detail: { id: target.id } }));
  }

  /* ── Nav builder ─────────────────────────────────────────── */
  function _buildNav() {
    const nav = document.getElementById('sidebar-nav');
    if (!nav) return;
    nav.innerHTML = '';

    const collapsed = _getCollapsedGroups();

    // Collapse / expand-all toolbar
    const bar = document.createElement('div');
    bar.className = 'nav-toolbar';
    const toggleAll = document.createElement('button');
    toggleAll.type = 'button';
    toggleAll.className = 'nav-toggle-all';
    bar.appendChild(toggleAll);
    nav.appendChild(bar);

    NAV_GROUPS.forEach(group => {
      const isCollapsed = collapsed.has(group.label);
      const grpEl = document.createElement('div');
      grpEl.className = 'nav-group' + (isCollapsed ? ' collapsed' : '');

      const header = document.createElement('button');
      header.type = 'button';
      header.className = 'nav-group-header';
      header.setAttribute('aria-expanded', String(!isCollapsed));
      header.innerHTML =
        `<span class="nav-group-label">${group.label}</span>` +
        `<svg class="group-chevron" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>`;
      grpEl.appendChild(header);

      const itemsWrap = document.createElement('div');
      itemsWrap.className = 'nav-group-items';
      const inner = document.createElement('div');
      inner.className = 'nav-group-items-inner';

      group.items.forEach(item => {
        const a = document.createElement('a');
        a.className = 'nav-item';
        a.href = '#' + item.id;
        a.dataset.module = item.id;
        a.innerHTML = `<span class="nav-icon">${item.icon}</span><span class="nav-label">${item.label}</span>`;
        a.addEventListener('click', e => { e.preventDefault(); navigate(item.id); });
        inner.appendChild(a);
      });
      itemsWrap.appendChild(inner);
      grpEl.appendChild(itemsWrap);

      header.addEventListener('click', () => {
        const nowCollapsed = grpEl.classList.toggle('collapsed');
        header.setAttribute('aria-expanded', String(!nowCollapsed));
        _saveGroupCollapsed(group.label, nowCollapsed);
        _syncToggleAll();
      });

      nav.appendChild(grpEl);
    });

    toggleAll.addEventListener('click', () => {
      const groups = [...nav.querySelectorAll('.nav-group')];
      const anyOpen = groups.some(g => !g.classList.contains('collapsed'));
      groups.forEach(g => {
        g.classList.toggle('collapsed', anyOpen);
        const h = g.querySelector('.nav-group-header');
        if (h) h.setAttribute('aria-expanded', String(!anyOpen));
      });
      _setCollapsedGroups(anyOpen ? NAV_GROUPS.map(x => x.label) : []);
      _syncToggleAll();
    });

    _syncToggleAll();

    function _syncToggleAll() {
      const groups = [...nav.querySelectorAll('.nav-group')];
      const anyOpen = groups.some(g => !g.classList.contains('collapsed'));
      toggleAll.innerHTML =
        `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${anyOpen ? '<polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/>' : '<polyline points="9 21 3 21 3 15"/><polyline points="15 3 21 3 21 9"/>'}</svg>` +
        `<span>${anyOpen ? 'Collapse all' : 'Expand all'}</span>`;
      toggleAll.setAttribute('aria-label', anyOpen ? 'Collapse all sections' : 'Expand all sections');
    }
  }

  /* Collapsed-group persistence */
  function _getCollapsedGroups() {
    try { return new Set(JSON.parse(localStorage.getItem('rviz-nav-collapsed') || '[]')); }
    catch (_) { return new Set(); }
  }
  function _setCollapsedGroups(arr) {
    try { localStorage.setItem('rviz-nav-collapsed', JSON.stringify(arr)); } catch (_) {}
  }
  function _saveGroupCollapsed(label, isCollapsed) {
    const s = _getCollapsedGroups();
    isCollapsed ? s.add(label) : s.delete(label);
    _setCollapsedGroups([...s]);
  }

  /* ── Mobile / tablet off-canvas nav ──────────────────────── */
  function _setupMobileNav() {
    const toggle   = document.getElementById('nav-toggle');
    const sidebar  = document.getElementById('sidebar');
    const backdrop = document.getElementById('nav-backdrop');
    if (!toggle || !sidebar) return;

    const open = () => {
      sidebar.classList.add('open');
      backdrop && backdrop.classList.add('visible');
      toggle.setAttribute('aria-expanded', 'true');
    };
    const close = () => {
      sidebar.classList.remove('open');
      backdrop && backdrop.classList.remove('visible');
      toggle.setAttribute('aria-expanded', 'false');
    };

    toggle.addEventListener('click', () => {
      sidebar.classList.contains('open') ? close() : open();
    });
    backdrop && backdrop.addEventListener('click', close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    window.addEventListener('resize', () => { if (window.innerWidth > 1024) close(); });

    // Let navigate() dismiss the drawer after a selection on small screens.
    window.RedshiftViz._closeMobileNav = close;
  }

  /* ── Search ──────────────────────────────────────────────── */
  function _bindSearch() {
    const input = document.getElementById('sidebar-search');
    if (!input) return;
    const nav = document.getElementById('sidebar-nav');
    input.addEventListener('input', () => {
      const q = input.value.toLowerCase();
      if (nav) nav.classList.toggle('searching', !!q);
      document.querySelectorAll('.nav-item').forEach(el => {
        const match = el.dataset.module.includes(q) ||
          el.querySelector('.nav-label')?.textContent.toLowerCase().includes(q);
        el.style.display = q && !match ? 'none' : '';
      });
      document.querySelectorAll('.nav-group').forEach(grp => {
        const visible = [...grp.querySelectorAll('.nav-item')].some(el => el.style.display !== 'none');
        grp.style.display = q && !visible ? 'none' : '';
      });
    });
  }

  /* ── Theme toggle ────────────────────────────────────────── */
  function _bindThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    const root = document.documentElement;
    const stored = localStorage.getItem('rviz-theme');
    if (stored) root.setAttribute('data-theme', stored);

    btn.addEventListener('click', () => {
      const current = root.getAttribute('data-theme');
      const next = current === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      localStorage.setItem('rviz-theme', next);
    });
  }

  /* ── Breadcrumb ──────────────────────────────────────────── */
  function _updateBreadcrumb(item) {
    const bc = document.getElementById('breadcrumb');
    if (!bc) return;
    const group = NAV_GROUPS.find(g => g.items.some(i => i.id === item.id));
    bc.innerHTML = `<span>RedshiftViz</span>` +
      (group ? `<span class="bc-sep">›</span><span>${group.label}</span>` : '') +
      `<span class="bc-sep">›</span><span>${item.label}</span>`;
  }

  /* ── Shortcuts modal ─────────────────────────────────────── */
  function _setupShortcutsModal() {
    const modal    = document.getElementById('shortcuts-modal');
    const closeBtn = document.getElementById('shortcuts-close');
    if (!modal) return;

    window.RedshiftViz._showShortcutsModal = () => {
      _renderShortcuts(modal);
      modal.classList.add('visible');
    };

    closeBtn?.addEventListener('click', () => modal.classList.remove('visible'));
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('visible'); });
  }

  function _renderShortcuts(modal) {
    const grid = modal.querySelector('.shortcuts-grid');
    if (!grid) return;
    const shortcuts = window.RedshiftViz.Keyboard.getAll();
    const byGroup = {};
    shortcuts.forEach(s => {
      (byGroup[s.group] = byGroup[s.group] || []).push(s);
    });
    grid.innerHTML = Object.entries(byGroup).map(([grp, items]) => `
      <div class="shortcut-group">
        <div class="shortcut-group-title">${grp}</div>
        ${items.map(s => `
          <div class="shortcut-row">
            <kbd>${_formatKey(s.key)}</kbd>
            <span>${s.description}</span>
          </div>`).join('')}
      </div>`).join('');
  }

  function _formatKey(k) {
    return k.split('+').map(p => {
      const map = { ctrl: '⌃', alt: '⌥', shift: '⇧', arrowleft: '←', arrowright: '→', ' ': 'Space', escape: 'Esc' };
      return map[p] || p.toUpperCase();
    }).join(' ');
  }

  /* ── Helpers ─────────────────────────────────────────────── */
  function _hashToId(hash) {
    if (!hash) return null;
    return hash.replace(/^#/, '').split('/')[0] || null;
  }

  function _idToModuleKey(id) {
    return id.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  }

  /* ── Expose navigate & boot ──────────────────────────────── */
  window.RedshiftViz = window.RedshiftViz || {};
  window.RedshiftViz.navigate = navigate;
  window.RedshiftViz.Modules  = window.RedshiftViz.Modules || {};

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
