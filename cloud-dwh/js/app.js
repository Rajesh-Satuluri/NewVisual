/* ============================================================
   CloudDWH — platform-aware shell (Snowflake framework)
   Iceberg-style switcher: Snowflake | Redshift | Fabric | Compare.
   Shared infra under window.CDWH; modules bucketed in CDWH.P[id].Modules.
   ============================================================ */
(function () {
  'use strict';
  const viz = (window.CDWH = window.CDWH || {});
  viz.P = viz.P || {};
  const ORDER = ['snowflake', 'redshift', 'fabric'];
  const LS_PLATFORM = 'cdwh-platform';

  let _platform = null;
  let _currentModuleId = null;
  let _currentInstance = null;

  function platforms() { return ORDER.filter(id => viz.P[id] && viz.P[id].meta); }
  function P(id) { return viz.P[id || _platform]; }

  /* Point shared data/nav pointers at the active platform so shared
     features (enhance, command palette, modules) read the right data. */
  function _syncActive(id) {
    const p = P(id); if (!p) return;
    viz.NAV_GROUPS     = p.navGroups;
    viz.Concepts       = p.concepts || {};
    viz.QuizBank       = p.quizBank || {};
    viz.InterviewBank  = p.interviewBank || {};
    viz.NetflixData    = p.data || {};
    document.documentElement.dataset.platform = id;
    // Sidebar brand + docs link
    const lt = document.getElementById('logo-title');
    const ls = document.getElementById('logo-sub');
    if (lt) lt.textContent = p.meta.label;
    if (ls) ls.textContent = p.meta.tagline;
    const docs = document.getElementById('docs-link');
    if (docs) { docs.href = p.meta.docsUrl; docs.title = p.meta.label + ' docs'; }
  }

  /* ── Boot ───────────────────────────────────────────────── */
  function init() {
    _buildSwitcher();
    _bindSearch();
    _bindThemeToggle();
    _setupMobileNav();
    viz.Keyboard && viz.Keyboard.init(navigate);
    viz.Tooltip && viz.Tooltip.init();
    viz.AnimationControls && viz.AnimationControls.init();
    _setupShortcutsModal();
    viz.CommandPalette && viz.CommandPalette.init();
    viz.Enhance && viz.Enhance.init();

    const parsed = _parseHash(location.hash);
    let startP = parsed.platform
      || (function(){ try { return localStorage.getItem(LS_PLATFORM); } catch(_) { return null; } })()
      || 'snowflake';
    if (!viz.P[startP] || !viz.P[startP].meta) startP = platforms()[0] || 'snowflake';

    setPlatform(startP, { initial: true, target: parsed.id });

    window.addEventListener('hashchange', () => {
      const h = _parseHash(location.hash);
      if (h.platform && h.platform !== _platform) { setPlatform(h.platform, { target: h.id }); return; }
      if (h.id && h.id !== _currentModuleId) navigate(h.id);
    });
  }

  /* ── Hash: #platform/module  |  #module  (platform may be "compare") ─ */
  function _parseHash(hash) {
    const raw = (hash || '').replace(/^#/, '');
    if (!raw) return { platform: null, id: '' };
    const parts = raw.split('/');
    if (viz.P[parts[0]] && viz.P[parts[0]].meta) {
      return { platform: parts[0], id: parts[1] || '' };
    }
    return { platform: null, id: parts[0] || '' };
  }

  /* ── Platform switcher ──────────────────────────────────── */
  function _buildSwitcher() {
    const host = document.getElementById('platform-switch');
    if (!host) return;
    const list = platforms();
    const track = document.createElement('div');
    track.className = 'plat-track';
    list.forEach(id => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'plat-seg'; b.dataset.platform = id;
      b.textContent = P(id).meta.short;
      b.addEventListener('click', () => setPlatform(id));
      track.appendChild(b);
    });
    if (list.length > 1 && viz.P.compare && viz.P.compare.meta) {
      const c = document.createElement('button');
      c.type = 'button'; c.className = 'plat-seg plat-seg--compare'; c.dataset.platform = 'compare';
      c.textContent = '⇄ Compare';
      c.addEventListener('click', () => setPlatform('compare'));
      track.appendChild(c);
    }
    host.innerHTML = ''; host.appendChild(track);
  }
  function _syncSwitcher() {
    document.querySelectorAll('#platform-switch .plat-seg').forEach(b => {
      b.classList.toggle('active', b.dataset.platform === _platform);
    });
  }

  /* ── Set active platform ────────────────────────────────── */
  function setPlatform(id, opts) {
    opts = opts || {};
    if (!viz.P[id] || !viz.P[id].meta) return;
    _platform = id;
    viz.activePlatform = id;
    try { localStorage.setItem(LS_PLATFORM, id); } catch (_) {}
    _syncActive(id);
    _buildNav();
    _syncSwitcher();
    const target = opts.target && _allItems().some(i => i.id === opts.target) ? opts.target : P(id).meta.home;
    _currentModuleId = null;
    navigate(target, { replace: true });
  }

  function _allItems() { return (viz.NAV_GROUPS || []).flatMap(g => g.items); }

  /* ── Navigate within active platform ────────────────────── */
  function navigate(moduleId, opts) {
    opts = opts || {};
    const items = _allItems();
    const target = items.find(i => i.id === moduleId) || items[0];
    if (!target) return;
    if (_currentModuleId === target.id && !opts.force) { _reflectHash(target.id); return; }
    _currentModuleId = target.id;
    viz.currentModuleId = target.id;

    document.querySelectorAll('.nav-item').forEach(el => {
      const on = el.dataset.module === target.id;
      el.classList.toggle('active', on);
      on ? el.setAttribute('aria-current', 'page') : el.removeAttribute('aria-current');
    });
    _updateBreadcrumb(target);
    viz.AnimationControls && viz.AnimationControls.hide();
    if (_currentInstance && typeof _currentInstance.destroy === 'function') _currentInstance.destroy();
    _currentInstance = null;
    _reflectHash(target.id);

    const canvas = document.getElementById('canvas');
    if (!canvas) return;
    canvas.innerHTML = ''; canvas.classList.add('loading');
    const key = _idToKey(target.id);
    const mod = P().Modules && P().Modules[key];
    if (mod) {
      try { _currentInstance = mod.render(canvas, { data: P().data, concepts: P().concepts }); }
      catch (err) { canvas.innerHTML = `<div class="placeholder-msg"><p>Error loading module: ${err.message}</p></div>`; }
    } else {
      canvas.innerHTML = `<div class="placeholder-msg"><div class="placeholder-icon">${target.icon}</div><h2>${target.label}</h2><p class="text-muted">Module coming in a future iteration.</p></div>`;
    }
    canvas.classList.remove('loading');
    if (window.innerWidth <= 1024 && viz._closeMobileNav) viz._closeMobileNav();
    document.dispatchEvent(new CustomEvent('cdwh:navigate', { detail: { id: target.id, platform: _platform } }));
  }

  function _reflectHash(id) { history.replaceState(null, '', '#' + _platform + '/' + id); }

  /* ── Nav builder (active platform's groups) ─────────────── */
  function _buildNav() {
    const nav = document.getElementById('sidebar-nav');
    if (!nav) return;
    nav.innerHTML = '';
    const collapsed = _getCollapsed();
    const bar = document.createElement('div'); bar.className = 'nav-toolbar';
    const toggleAll = document.createElement('button'); toggleAll.type = 'button'; toggleAll.className = 'nav-toggle-all';
    bar.appendChild(toggleAll); nav.appendChild(bar);
    (viz.NAV_GROUPS || []).forEach(group => {
      const isC = collapsed.has(group.label);
      const g = document.createElement('div'); g.className = 'nav-group' + (isC ? ' collapsed' : '');
      const h = document.createElement('button'); h.type = 'button'; h.className = 'nav-group-header';
      h.setAttribute('aria-expanded', String(!isC));
      h.innerHTML = `<span class="nav-group-label">${group.label}</span><svg class="group-chevron" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>`;
      g.appendChild(h);
      const wrap = document.createElement('div'); wrap.className = 'nav-group-items';
      const inner = document.createElement('div'); inner.className = 'nav-group-items-inner';
      group.items.forEach(item => {
        const a = document.createElement('a'); a.className = 'nav-item'; a.href = '#' + _platform + '/' + item.id;
        a.dataset.module = item.id;
        a.innerHTML = `<span class="nav-icon">${item.icon}</span><span class="nav-label">${item.label}</span>`;
        a.addEventListener('click', e => { e.preventDefault(); navigate(item.id); });
        inner.appendChild(a);
      });
      wrap.appendChild(inner); g.appendChild(wrap);
      h.addEventListener('click', () => { const nc = g.classList.toggle('collapsed'); h.setAttribute('aria-expanded', String(!nc)); _saveCollapsed(group.label, nc); _syncToggleAll(); });
      nav.appendChild(g);
    });
    toggleAll.addEventListener('click', () => {
      const groups = [...nav.querySelectorAll('.nav-group')];
      const anyOpen = groups.some(x => !x.classList.contains('collapsed'));
      groups.forEach(x => { x.classList.toggle('collapsed', anyOpen); const hh = x.querySelector('.nav-group-header'); if (hh) hh.setAttribute('aria-expanded', String(!anyOpen)); });
      _setCollapsed(anyOpen ? (viz.NAV_GROUPS || []).map(x => x.label) : []); _syncToggleAll();
    });
    _syncToggleAll();
    function _syncToggleAll() {
      const groups = [...nav.querySelectorAll('.nav-group')];
      const anyOpen = groups.some(x => !x.classList.contains('collapsed'));
      toggleAll.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${anyOpen ? '<polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/>' : '<polyline points="9 21 3 21 3 15"/><polyline points="15 3 21 3 21 9"/>'}</svg><span>${anyOpen ? 'Collapse all' : 'Expand all'}</span>`;
    }
  }

  /* collapsed persistence (per platform) */
  function _ck() { return 'cdwh-' + _platform + '-nav-collapsed'; }
  function _getCollapsed() { try { return new Set(JSON.parse(localStorage.getItem(_ck()) || '[]')); } catch (_) { return new Set(); } }
  function _setCollapsed(a) { try { localStorage.setItem(_ck(), JSON.stringify(a)); } catch (_) {} }
  function _saveCollapsed(label, c) { const s = _getCollapsed(); c ? s.add(label) : s.delete(label); _setCollapsed([...s]); }

  /* ── Search / theme / mobile / breadcrumb / shortcuts ───── */
  function _bindSearch() {
    const input = document.getElementById('sidebar-search'); if (!input) return;
    const nav = document.getElementById('sidebar-nav');
    input.addEventListener('input', () => {
      const q = input.value.toLowerCase();
      if (nav) nav.classList.toggle('searching', !!q);
      document.querySelectorAll('.nav-item').forEach(el => {
        const m = el.dataset.module.includes(q) || el.querySelector('.nav-label')?.textContent.toLowerCase().includes(q);
        el.style.display = q && !m ? 'none' : '';
      });
      document.querySelectorAll('.nav-group').forEach(grp => {
        const vis = [...grp.querySelectorAll('.nav-item')].some(el => el.style.display !== 'none');
        grp.style.display = q && !vis ? 'none' : '';
      });
    });
  }
  function _bindThemeToggle() {
    const btn = document.getElementById('theme-toggle'); if (!btn) return;
    const root = document.documentElement;
    const stored = localStorage.getItem('cdwh-theme'); if (stored) root.setAttribute('data-theme', stored);
    btn.addEventListener('click', () => { const cur = root.getAttribute('data-theme'); const nx = cur === 'light' ? 'dark' : 'light'; root.setAttribute('data-theme', nx); try { localStorage.setItem('cdwh-theme', nx); } catch (_) {} });
  }
  function _setupMobileNav() {
    const toggle = document.getElementById('nav-toggle'); const sidebar = document.getElementById('sidebar'); const backdrop = document.getElementById('nav-backdrop');
    if (!toggle || !sidebar) return;
    const open = () => { sidebar.classList.add('open'); backdrop && backdrop.classList.add('visible'); toggle.setAttribute('aria-expanded', 'true'); };
    const close = () => { sidebar.classList.remove('open'); backdrop && backdrop.classList.remove('visible'); toggle.setAttribute('aria-expanded', 'false'); };
    toggle.addEventListener('click', () => sidebar.classList.contains('open') ? close() : open());
    backdrop && backdrop.addEventListener('click', close);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    window.addEventListener('resize', () => { if (window.innerWidth > 1024) close(); });
    viz._closeMobileNav = close;
  }
  function _updateBreadcrumb(item) {
    const bc = document.getElementById('breadcrumb'); if (!bc) return;
    const brand = P() ? P().meta.label : 'CloudDWH';
    const group = (viz.NAV_GROUPS || []).find(g => g.items.some(i => i.id === item.id));
    bc.innerHTML = `<span>${brand}</span>` + (group ? `<span class="bc-sep">›</span><span>${group.label}</span>` : '') + `<span class="bc-sep">›</span><span>${item.label}</span>`;
  }
  function _setupShortcutsModal() {
    const modal = document.getElementById('shortcuts-modal'); const closeBtn = document.getElementById('shortcuts-close'); if (!modal) return;
    viz._showShortcutsModal = () => { _renderShortcuts(modal); modal.classList.add('visible'); };
    closeBtn?.addEventListener('click', () => modal.classList.remove('visible'));
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('visible'); });
  }
  function _renderShortcuts(modal) {
    const grid = modal.querySelector('.shortcuts-grid'); if (!grid || !viz.Keyboard) return;
    const byGroup = {}; viz.Keyboard.getAll().forEach(s => { (byGroup[s.group] = byGroup[s.group] || []).push(s); });
    grid.innerHTML = Object.entries(byGroup).map(([grp, items]) => `<div class="shortcut-group"><div class="shortcut-group-title">${grp}</div>${items.map(s => `<div class="shortcut-row"><kbd>${_fmtKey(s.key)}</kbd><span>${s.description}</span></div>`).join('')}</div>`).join('');
  }
  function _fmtKey(k) { return k.split('+').map(p => ({ ctrl: '⌃', alt: '⌥', shift: '⇧', arrowleft: '←', arrowright: '→', ' ': 'Space', escape: 'Esc' }[p] || p.toUpperCase())).join(' '); }

  function _idToKey(id) { return id.replace(/-([a-z])/g, (_, c) => c.toUpperCase()); }

  viz.navigate = navigate;
  viz.setPlatform = setPlatform;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
