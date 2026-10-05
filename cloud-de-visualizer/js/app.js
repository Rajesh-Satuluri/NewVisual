/* ============================================================
   TableViz App — Bootstrap, Router, Navigation, Format Switcher
   Entry point: runs after all formats + modules are loaded.

   Multi-format aware:
   - Formats live in TV.formats (see js/formats/*.js).
   - Modules resolve via TV.getModule(activeFormat, id); legacy
     Iceberg modules registered flat are absorbed into the
     'iceberg' bucket at boot.
   - Hash router understands #<format>/<screen>/<step>, with
     back-compat for a bare #<screen> under the active format.
   - Persistence is namespaced per format (tv-<fmt>-…); global
     prefs (theme, sidebar) are tv-…; one-time migration from the
     old iv-… keys runs at boot.
   ============================================================ */

(function () {
  'use strict';

  const TV = window.TableViz;
  const FORMAT_IDS = () => Object.keys(TV.formats);
  const DEFAULT_FORMAT = 'azure';

  /* ── Active-format helpers ────────────────────────────────── */
  function fmt() { return TV.activeFormat; }
  function fmtDesc(id) { return TV.formats[id || TV.activeFormat] || {}; }
  function navGroups(id) { return (fmtDesc(id).navGroups) || []; }
  function homeScreen(id) { return fmtDesc(id).home || 'home'; }

  /* ── Icon set (inline SVG path data) — shared across formats ─ */
  function _navIcon(name) {
    const p = {
      home:          'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10',
      shield:        'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
      layers:        'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
      folder:        'M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z',
      'table-plus':  'M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18',
      'arrow-down':  'M12 5v14M19 12l-7 7-7-7',
      pencil:        'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z',
      trash:         'M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6',
      merge:         'M18 21v-4a4 4 0 00-4-4H6M6 3v4a4 4 0 004 4h8 M15 18l3 3 3-3',
      refresh:       'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15',
      plus:          'M12 5v14M5 12h14',
      search:        'M11 19A8 8 0 1011 3a8 8 0 010 16zM21 21l-4.35-4.35',
      edit:          'M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z',
      cpu:           'M9 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2h-2M9 3v2h6V3M9 3H6M15 3h3M12 12h.01',
      clock:         'M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2',
      camera:        'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z M12 17a4 4 0 100-8 4 4 0 000 8z',
      list:          'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
      columns:       'M12 3H3a1 1 0 00-1 1v16a1 1 0 001 1h9M12 3h9a1 1 0 011 1v16a1 1 0 01-1 1h-9M12 3v18',
      filter:        'M22 3H2l8 9.46V19l4 2v-8.54L22 3z',
      'git-branch':  'M6 3v12M18 9a3 3 0 100-6 3 3 0 000 6zM6 21a3 3 0 100-6 3 3 0 000 6zM18 9a9 9 0 01-9 9',
      book:          'M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 014 17V5h16v12H6.5A2.5 2.5 0 004 19.5z',
      users:         'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
      tool:          'M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z',
      zap:           'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
      activity:      'M22 12h-4l-3 9L9 3l-3 9H2',
      upload:        'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12',
      sparkles:      'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 15l.9 2.6L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.4z',
      sliders:       'M4 21v-7M4 10V3M12 21v-9M12 6V3M20 21v-5M20 12V3M1 14h6M9 6h6M17 16h6',
      link:          'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71',
      'message-square': 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
      'check-square': 'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11',
      'file-text':   'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6M16 13H8M16 17H8M10 9H8',
    };
    const d = p[name] || p.home;
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="16" height="16" aria-hidden="true"><path d="${d}"/></svg>`;
  }

  function _chevronSvg() {
    return `<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" width="10" height="10" aria-hidden="true"><path d="M3 4l3 3 3-3"/></svg>`;
  }

  /* ── localStorage-safe helpers ───────────────────────────── */
  const _lsGet = TV.ls.get, _lsSet = TV.ls.set;

  /* ── Collapsed-group persistence (per format) ────────────── */
  function _collapseKey() { return 'cde-' + fmt() + '-nav-collapsed'; }
  function _getCollapsedGroups() {
    try { return new Set(JSON.parse(_lsGet(_collapseKey()) || '[]')); }
    catch (e) { return new Set(); }
  }
  function _saveCollapsedGroups() {
    const ids = [...document.querySelectorAll('.nav-group.collapsed')].map(s => s.dataset.group);
    _lsSet(_collapseKey(), JSON.stringify(ids));
  }
  function _updateCollapseAllBtn() {
    const btn = document.getElementById('nav-collapse-all');
    if (!btn) return;
    const groups = document.querySelectorAll('.nav-group');
    const anyOpen = [...groups].some(g => !g.classList.contains('collapsed'));
    btn.dataset.mode = anyOpen ? 'collapse' : 'expand';
    btn.textContent = anyOpen ? 'Collapse all' : 'Expand all';
  }

  /* ── Format switcher (registry-driven; single-format collapse) ── */
  function _buildFormatSwitcher() {
    const host = document.getElementById('format-switcher');
    if (!host) return;
    const formats = FORMAT_IDS().map(id => TV.formats[id]).filter(f => f && f.visible !== false && f.id !== 'compare');
    const compare = TV.formats.compare;
    host.innerHTML = '';

    // Single format → static brand label (never an orphan control).
    if (formats.length < 2) {
      host.classList.add('single');
      host.classList.remove('multi');
      const f = formats[0] || fmtDesc();
      host.innerHTML = `<span class="fmt-static">${f.label || 'Table Formats'}</span>`;
      return;
    }

    host.classList.add('multi');
    host.classList.remove('single');
    const track = document.createElement('div');
    track.className = 'fmt-track';
    const mk = (f, isCompare) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'fmt-seg' + (f.id === fmt() ? ' active' : '') + (isCompare ? ' fmt-seg--compare' : '');
      b.dataset.format = f.id;
      b.textContent = isCompare ? '⇄ ' + (f.short || f.label) : (f.short || f.label);
      b.setAttribute('aria-pressed', String(f.id === fmt()));
      b.addEventListener('click', () => switchFormat(f.id));
      return b;
    };
    formats.forEach(f => track.appendChild(mk(f, false)));
    if (compare && compare.visible !== false) track.appendChild(mk(compare, true));
    host.appendChild(track);
  }

  function _syncFormatSwitcher() {
    document.querySelectorAll('#format-switcher .fmt-seg').forEach(b => {
      const on = b.dataset.format === fmt();
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', String(on));
    });
  }

  /* ── Apply a format's brand (attribute + sidebar + docs) ──── */
  function _applyFormatBrand() {
    const d = fmtDesc();
    document.documentElement.dataset.format = fmt();
    const logo = document.getElementById('sidebar-logo');
    if (logo && d.logoSvg) logo.innerHTML = d.logoSvg;
    const name = document.getElementById('sidebar-name');
    if (name) name.textContent = d.short ? d.short + 'Viz' : 'TableViz';
    const tag = document.getElementById('sidebar-tagline');
    if (tag) tag.textContent = d.tagline || '';
    const docs = document.getElementById('docs-link');
    if (docs && d.docsUrl) {
      docs.href = d.docsUrl;
      docs.title = d.docsLabel || 'Documentation';
      docs.setAttribute('data-tooltip', 'Open ' + (d.docsLabel || 'documentation'));
    }
  }

  /* ── Build sidebar navigation (active format) ────────────── */
  function _buildNav() {
    const nav = document.getElementById('sidebar-nav');
    if (!nav) return;
    nav.innerHTML = '';
    const collapsed = _getCollapsedGroups();

    const tools = document.createElement('div');
    tools.className = 'nav-tools';
    tools.innerHTML = `<button id="nav-collapse-all" class="nav-tools-btn" type="button"></button>`;
    tools.querySelector('button').addEventListener('click', () => {
      const collapseAll = document.getElementById('nav-collapse-all').dataset.mode !== 'expand';
      document.querySelectorAll('.nav-group').forEach(section => {
        section.classList.toggle('collapsed', collapseAll);
        const h = section.querySelector('.nav-group-header');
        if (h) h.setAttribute('aria-expanded', String(!collapseAll));
      });
      _saveCollapsedGroups();
      _updateCollapseAllBtn();
    });
    nav.appendChild(tools);

    navGroups().forEach(group => {
      const section = document.createElement('div');
      section.className = 'nav-group' + (collapsed.has(group.id) ? ' collapsed' : '');
      section.dataset.group = group.id;

      const groupHeader = document.createElement('button');
      groupHeader.type = 'button';
      groupHeader.className = 'nav-group-header';
      groupHeader.setAttribute('aria-expanded', String(!collapsed.has(group.id)));
      groupHeader.innerHTML = `
        <span class="nav-group-label">${group.label}</span>
        <span class="nav-group-chevron">${_chevronSvg()}</span>
      `;
      groupHeader.addEventListener('click', () => {
        const isCollapsed = section.classList.toggle('collapsed');
        groupHeader.setAttribute('aria-expanded', String(!isCollapsed));
        _saveCollapsedGroups();
        _updateCollapseAllBtn();
      });
      section.appendChild(groupHeader);

      const itemsContainer = document.createElement('div');
      itemsContainer.className = 'nav-group-items';
      const inner = document.createElement('div');
      inner.className = 'nav-group-inner';

      group.items.forEach(item => {
        const a = document.createElement('a');
        a.href = item.available ? '#' + fmt() + '/' + item.id : 'javascript:void(0)';
        a.className = 'nav-item' + (item.available ? '' : ' coming-soon');
        a.dataset.navId = item.id;
        a.innerHTML = `
          <span class="nav-icon">${_navIcon(item.icon)}</span>
          <span class="nav-label">${item.label}</span>
          ${!item.available ? '<span class="nav-badge">soon</span>' : ''}
        `;
        if (!item.available) {
          a.addEventListener('click', (e) => { e.preventDefault(); _showComingSoon(item.label); });
        }
        inner.appendChild(a);
      });

      itemsContainer.appendChild(inner);
      section.appendChild(itemsContainer);
      nav.appendChild(section);
    });

    _updateCollapseAllBtn();
  }

  /* ── Active nav highlight ────────────────────────────────── */
  function _setActiveNav(id) {
    document.querySelectorAll('a.nav-item[data-nav-id]').forEach(a => {
      a.classList.toggle('active', a.dataset.navId === id);
    });
  }

  /* ── Breadcrumb update ───────────────────────────────────── */
  function _setBreadcrumb(id) {
    const bc = document.getElementById('breadcrumb');
    if (!bc) return;
    let groupLabel = '', itemLabel = '';
    navGroups().forEach(g => g.items.forEach(item => {
      if (item.id === id) { groupLabel = g.label; itemLabel = item.label; }
    }));
    const root = (fmtDesc().short ? fmtDesc().short + 'Viz' : 'TableViz');
    bc.innerHTML = `
      <span class="bc-root">${root}</span>
      ${groupLabel ? `<span class="bc-sep">›</span><span class="bc-group">${groupLabel}</span>` : ''}
      ${itemLabel ? `<span class="bc-sep">›</span><span class="bc-current">${itemLabel}</span>` : ''}
    `;
  }

  /* ── "Coming soon" toast ─────────────────────────────────── */
  function _showComingSoon(label) {
    const existing = document.querySelector('.coming-soon-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'coming-soon-toast';
    toast.innerHTML = `<strong>${label}</strong> is coming in a future iteration!`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => { toast.classList.remove('visible'); setTimeout(() => toast.remove(), 300); }, 2500);
  }

  /* ── Route/navigation motion: top progress bar ───────────── */
  let _npTimer = null;
  function _navProgress() {
    const b = document.getElementById('nav-progress');
    if (!b) return;
    b.classList.remove('done'); b.classList.add('run');
    b.style.width = '0%'; void b.offsetWidth; b.style.width = '82%';
    clearTimeout(_npTimer);
    _npTimer = setTimeout(() => {
      b.style.width = '100%'; b.classList.add('done');
      setTimeout(() => { b.classList.remove('run', 'done'); b.style.width = '0%'; }, 240);
    }, 170);
  }
  function _riseIn() {
    const m = document.getElementById('module-container');
    if (!m) return;
    m.classList.remove('main-enter'); void m.offsetWidth; m.classList.add('main-enter');
  }

  /* ── Current module tracking ─────────────────────────────── */
  let _currentModuleId = null;
  let _currentModuleInstance = null;
  let _currentSplit = null; // central canvas↔sidebar resizer for iceberg animated screens

  /* ── Hash parsing: #[format/]screen[/step] ───────────────── */
  function _parseHash() {
    const raw = location.hash.replace(/^#/, '').trim();
    if (!raw) return { format: null, id: '', step: null };
    const parts = raw.split('/');
    let format = null, id = '', stepStr = null;
    if (TV.formats[parts[0]]) { format = parts[0]; id = parts[1] || ''; stepStr = parts[2]; }
    else { id = parts[0]; stepStr = parts[1]; }
    const step = stepStr != null ? parseInt(stepStr, 10) : null;
    return { format, id, step: Number.isNaN(step) ? null : step };
  }

  function _seek(step) {
    if (step == null || step < 0) return;
    const eng = TV.AnimationControls && TV.AnimationControls._engine;
    if (eng && step < eng.totalSteps) eng.goto(step);
  }

  /* ── Mirror the current animation step into the URL ───────── */
  TV._syncStepToUrl = function (i) {
    if (!_currentModuleId) return;
    const base = '#' + fmt() + '/' + _currentModuleId;
    const next = i >= 0 ? base + '/' + i : base;
    if (location.hash !== next) history.replaceState(null, '', next);
  };

  /* ── Switch active format ────────────────────────────────── */
  function switchFormat(nextFmt, id) {
    if (!TV.formats[nextFmt]) return;
    if (nextFmt === fmt() && !id) return;
    TV.activeFormat = nextFmt;
    _lsSet('cde-format', nextFmt);
    _applyFormatBrand();
    _buildNav();
    _syncFormatSwitcher();
    document.dispatchEvent(new CustomEvent('app:format', { detail: { format: nextFmt } }));
    // Keep the same screen if it exists in the target format, else its home / resume.
    let target = id;
    if (!target) {
      const last = _lsGet('cde-' + nextFmt + '-last-screen');
      target = (last && TV.getModule(nextFmt, last)) ? last : homeScreen(nextFmt);
    }
    _currentModuleId = null; // force a fresh render
    navigate(target);
  }

  /* ── Navigate to a module (within active format) ─────────── */
  function navigate(id, step) {
    id = id || homeScreen();
    if (id === _currentModuleId) { _seek(step); return; }

    if (_currentSplit) { try { _currentSplit.detach(); } catch (e) {} _currentSplit = null; }
    if (_currentModuleInstance && typeof _currentModuleInstance.destroy === 'function') {
      try { _currentModuleInstance.destroy(); } catch (e) { console.warn('Module destroy error:', e); }
    }
    TV.AnimationControls.hide();
    _navProgress();

    const container = document.getElementById('module-container');
    if (!container) return;

    const mod = TV.getModule(fmt(), id);
    if (!mod) {
      container.innerHTML = `
        <div class="placeholder-module">
          <div class="placeholder-icon">🧊</div>
          <h2>${id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</h2>
          <p>This module is coming in a future iteration.</p>
          <button class="btn-primary" onclick="location.hash='${fmt()}/${homeScreen()}'">← Back to Home</button>
        </div>`;
      _currentModuleId = id; _currentModuleInstance = null;
      _setActiveNav(id); _setBreadcrumb(id); _riseIn();
      _lsSet('cde-' + fmt() + '-last-screen', id);
      document.dispatchEvent(new CustomEvent('app:navigate', { detail: { id, format: fmt() } }));
      return;
    }

    container.innerHTML = '';
    try { mod.render(container); }
    catch (err) {
      console.error('Module render error [' + id + ']:', err);
      container.innerHTML = `
        <div class="error-module">
          <h3>Error rendering module: ${id}</h3>
          <pre>${err.message}\n\n${err.stack || ''}</pre>
        </div>`;
    }

    _currentModuleId = id; _currentModuleInstance = mod;

    /* Central draggable resizer for iceberg animated diagram screens
       (canvas ↔ step sidebar). Grid-based screens (metadata/manifest/
       architecture) manage their own resizer and don't match this
       flex pattern, so they're skipped. Laptop-only via SplitPane. */
    if (fmt() === 'iceberg' && TV.SplitPane) {
      try { _currentSplit = TV.SplitPane.attachCanvasSidebar(container, 'iceberg/' + id + '/canvas'); }
      catch (e) { _currentSplit = null; }
    }

    _setActiveNav(id); _setBreadcrumb(id); _riseIn();
    container.scrollTop = 0; window.scrollTo(0, 0);

    const h = _parseHash();
    if (h.id !== id || h.format !== fmt()) history.pushState(null, '', '#' + fmt() + '/' + id);

    _lsSet('cde-' + fmt() + '-last-screen', id);
    document.dispatchEvent(new CustomEvent('app:navigate', { detail: { id, format: fmt() } }));

    if (step != null) { _seek(step); requestAnimationFrame(() => _seek(step)); }
  }

  /* ── Hash router ─────────────────────────────────────────── */
  function _routeFromHash() {
    const { format, id, step } = _parseHash();
    if (format && format !== fmt()) {
      TV.activeFormat = format;
      _lsSet('cde-format', format);
      _applyFormatBrand(); _buildNav(); _syncFormatSwitcher();
      document.dispatchEvent(new CustomEvent('app:format', { detail: { format } }));
    }
    if (!id) { navigate(_lsGet('cde-' + fmt() + '-last-screen') || homeScreen()); return; }
    navigate(id, step);
  }

  /* ── Sidebar search ──────────────────────────────────────── */
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
        document.querySelectorAll('.nav-group').forEach(g => {
          g.classList.remove('collapsed');
          g.querySelector('.nav-group-header')?.setAttribute('aria-expanded', 'true');
        });
      } else {
        const saved = _getCollapsedGroups();
        document.querySelectorAll('.nav-group').forEach(g => {
          const c = saved.has(g.dataset.group);
          g.classList.toggle('collapsed', c);
          g.querySelector('.nav-group-header')?.setAttribute('aria-expanded', String(!c));
        });
      }
      _updateCollapseAllBtn();
    });
  }

  /* ── Sidebar collapse toggle ─────────────────────────────── */
  function _initSidebarToggle() {
    const toggleBtn = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    if (!toggleBtn || !sidebar) return;
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      document.body.classList.toggle('sidebar-collapsed', sidebar.classList.contains('collapsed'));
      _lsSet('cde-sidebar-collapsed', sidebar.classList.contains('collapsed') ? '1' : '0');
    });
    if (_lsGet('cde-sidebar-collapsed') === '1') {
      sidebar.classList.add('collapsed');
      document.body.classList.add('sidebar-collapsed');
    }
  }

  /* ── Off-canvas nav drawer (tablet / touch) ──────────────── */
  const _drawerMQ = window.matchMedia('(max-width: 1024px)');
  function _openDrawer() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    sidebar.classList.add('drawer-open');
    document.body.classList.add('sidebar-open');
    document.getElementById('nav-backdrop')?.classList.add('visible');
    document.getElementById('nav-toggle')?.setAttribute('aria-expanded', 'true');
  }
  function _closeDrawer() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    sidebar.classList.remove('drawer-open');
    document.body.classList.remove('sidebar-open');
    document.getElementById('nav-backdrop')?.classList.remove('visible');
    document.getElementById('nav-toggle')?.setAttribute('aria-expanded', 'false');
  }
  function _syncDrawerMode() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    if (_drawerMQ.matches) { sidebar.classList.remove('collapsed'); document.body.classList.remove('sidebar-collapsed'); }
    else {
      _closeDrawer();
      if (_lsGet('cde-sidebar-collapsed') === '1') { sidebar.classList.add('collapsed'); document.body.classList.add('sidebar-collapsed'); }
    }
  }
  function _initDrawer() {
    const toggle = document.getElementById('nav-toggle');
    const sidebar = document.getElementById('sidebar');
    toggle?.addEventListener('click', () => {
      if (_drawerMQ.matches) {
        // Tablet / portrait: open or close the off-canvas drawer.
        if (sidebar?.classList.contains('drawer-open')) _closeDrawer(); else _openDrawer();
      } else if (sidebar) {
        // Desktop: collapse / expand the persistent sidebar (reclaims
        // width so landscape diagrams fill the canvas), and persist it.
        const collapsed = sidebar.classList.toggle('collapsed');
        document.body.classList.toggle('sidebar-collapsed', collapsed);
        _lsSet('cde-sidebar-collapsed', collapsed ? '1' : '0');
        toggle.setAttribute('aria-expanded', String(!collapsed));
      }
    });
    document.getElementById('nav-backdrop')?.addEventListener('click', _closeDrawer);
    document.getElementById('sidebar-nav')?.addEventListener('click', (e) => {
      if (e.target.closest('a.nav-item') && _drawerMQ.matches) _closeDrawer();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sidebar?.classList.contains('drawer-open')) _closeDrawer();
    });
    const onChange = () => _syncDrawerMode();
    if (_drawerMQ.addEventListener) _drawerMQ.addEventListener('change', onChange);
    else _drawerMQ.addListener(onChange);
    _syncDrawerMode();
    TV._closeDrawer = _closeDrawer;
  }

  /* ── Theme toggle ────────────────────────────────────────── */
  function _initThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const root = document.documentElement;
      const next = root.dataset.theme === 'light' ? 'dark' : 'light';
      root.dataset.theme = next;
      _lsSet('cde-theme', next);
    });
    const saved = _lsGet('cde-theme');
    if (saved) document.documentElement.dataset.theme = saved;
  }

  /* ── Keyboard shortcuts modal ────────────────────────────── */
  function _initShortcutsModal() {
    const modal = document.getElementById('shortcuts-modal');
    if (!modal) return;
    const close = () => modal.classList.remove('visible');
    modal.querySelector('.modal-close')?.addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    TV._showShortcutsModal = () => modal.classList.add('visible');
  }

  /* ── Wire [data-nav] click delegation ───────────────────── */
  function _wireNavCards() {
    document.addEventListener('click', (e) => {
      const card = e.target.closest('[data-nav]');
      if (card) { const target = card.dataset.nav; if (target) { e.preventDefault(); navigate(target); } }
    });
  }

  /* ── Bootstrap ───────────────────────────────────────────── */
  function _boot() {
    // Resolve active format: saved → default, must exist in registry.
    let saved = _lsGet('cde-format');
    if (!saved || !TV.formats[saved]) saved = TV.formats[DEFAULT_FORMAT] ? DEFAULT_FORMAT : FORMAT_IDS()[0];
    TV.activeFormat = saved;

    TV.Tooltip.init();
    TV.AnimationControls.init();
    TV.Keyboard.init(navigate);

    _applyFormatBrand();
    _buildFormatSwitcher();
    _buildNav();
    _initSidebarSearch();
    _initSidebarToggle();
    _initDrawer();
    _initThemeToggle();
    _initShortcutsModal();
    _wireNavCards();

    window.addEventListener('hashchange', _routeFromHash);
    _routeFromHash();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _boot);
  else _boot();

  /* ── Public API ──────────────────────────────────────────── */
  TV.navigate = navigate;
  TV.switchFormat = switchFormat;
  TV.getScreens = (id) => navGroups(id).flatMap(g =>
    g.items.filter(it => it.available !== false).map(it => ({ id: it.id, label: it.label, icon: it.icon, group: g.label })));
  TV.getNavGroups = (id) => navGroups(id);
  TV.currentScreenId = () => _currentModuleId;
})();
