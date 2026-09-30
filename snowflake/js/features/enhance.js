/* ============================================================
   Enhancements — progress tracking, module pager, swipe
   gestures, guided tour, toast. Driven by 'sviz:navigate'.
   ============================================================ */

(function () {
  'use strict';

  const LS_VISITED = 'sviz-visited';
  const LS_TOUR    = 'sviz-tour-done';

  function flatNav() {
    return (window.SnowflakeViz.NAV_GROUPS || []).flatMap(g => g.items);
  }
  function learnable() { return flatNav().filter(i => i.id !== 'home'); }

  /* ── Toast ─────────────────────────────────────────────────── */
  let _toastEl, _toastTimer;
  function toast(msg) {
    if (!_toastEl) {
      _toastEl = document.createElement('div');
      _toastEl.className = 'toast';
      document.body.appendChild(_toastEl);
    }
    _toastEl.textContent = msg;
    _toastEl.classList.add('visible');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => _toastEl.classList.remove('visible'), 2200);
  }

  /* ── Progress ──────────────────────────────────────────────── */
  function getVisited() {
    try { return new Set(JSON.parse(localStorage.getItem(LS_VISITED) || '[]')); }
    catch (_) { return new Set(); }
  }
  function saveVisited(set) {
    try { localStorage.setItem(LS_VISITED, JSON.stringify([...set])); } catch (_) {}
  }

  let _meterFill, _meterLabel;
  function buildMeter() {
    const sidebar = document.getElementById('sidebar');
    const footer = document.getElementById('sidebar-footer');
    if (!sidebar || !footer || document.getElementById('sviz-progress')) return;
    const wrap = document.createElement('div');
    wrap.id = 'sviz-progress';
    wrap.style.padding = '10px 16px';
    wrap.style.borderTop = '1px solid var(--border-subtle)';
    wrap.innerHTML = `<div class="progress-meter">
        <div class="progress-meter-track"><div class="progress-meter-fill"></div></div>
        <span class="progress-meter-label">0%</span>
      </div>`;
    sidebar.insertBefore(wrap, footer);
    _meterFill = wrap.querySelector('.progress-meter-fill');
    _meterLabel = wrap.querySelector('.progress-meter-label');
  }
  function addNavChecks() {
    document.querySelectorAll('.nav-item').forEach(el => {
      if (el.querySelector('.nav-check')) return;
      const c = document.createElement('span');
      c.className = 'nav-check';
      c.setAttribute('aria-hidden', 'true');
      c.innerHTML = `<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="3.5 8.5 6.5 11.5 12.5 5"/></svg>`;
      el.appendChild(c);
    });
  }
  function refreshProgress() {
    const visited = getVisited();
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('visited', visited.has(el.dataset.module));
    });
    const total = learnable().length || 1;
    const done = learnable().filter(i => visited.has(i.id)).length;
    const pct = Math.round((done / total) * 100);
    if (_meterFill) _meterFill.style.width = pct + '%';
    if (_meterLabel) _meterLabel.textContent = pct + '%';
    return { done, total, pct };
  }

  /* ── Module pager ──────────────────────────────────────────── */
  function renderPager(id) {
    const canvas = document.getElementById('canvas');
    if (!canvas) return;
    const old = canvas.querySelector('.module-pager');
    if (old) old.remove();
    if (id === 'home') return;

    const items = flatNav();
    const idx = items.findIndex(i => i.id === id);
    if (idx < 0) return;
    const prev = items[idx - 1], next = items[idx + 1];

    const pager = document.createElement('nav');
    pager.className = 'module-pager';
    pager.setAttribute('aria-label', 'Module navigation');
    pager.innerHTML =
      (prev
        ? `<button class="module-pager-btn prev" data-go="${prev.id}">
             <span class="module-pager-arrow">←</span>
             <span><span class="module-pager-dir">Previous</span><br><span class="module-pager-name">${prev.icon} ${prev.label}</span></span>
           </button>`
        : `<button class="module-pager-btn placeholder" tabindex="-1"></button>`) +
      (next
        ? `<button class="module-pager-btn next" data-go="${next.id}">
             <span><span class="module-pager-dir">Next</span><br><span class="module-pager-name">${next.label} ${next.icon}</span></span>
             <span class="module-pager-arrow">→</span>
           </button>`
        : `<button class="module-pager-btn placeholder" tabindex="-1"></button>`);
    pager.querySelectorAll('[data-go]').forEach(b =>
      b.addEventListener('click', () => window.SnowflakeViz.navigate(b.dataset.go)));
    canvas.appendChild(pager);
  }

  /* ── Interview Q&A section (I3) ────────────────────────────── */
  // Which Q&A each module surfaces: architectureLayers by id + the
  // top-level interviewQs bank by category.
  const QA_MAP = {
    architecture:     { layers: ['cloud-services', 'virtual-warehouses', 'storage', 'external-storage'], cats: ['Architecture'] },
    'cloud-services': { layers: ['cloud-services'], cats: [] },
    compute:          { layers: ['virtual-warehouses'], cats: [] },
    storage:          { layers: ['storage', 'external-storage'], cats: ['Storage'] },
    caching:          { layers: [], cats: ['Performance'] },
    'data-loading':   { layers: [], cats: ['Data Loading'] },
    security:         { layers: [], cats: ['Security'] },
    rbac:             { layers: [], cats: ['Security'] },
    advanced:         { layers: [], cats: ['Features', 'Advanced'] },
    'semi-structured':{ layers: [], cats: [] },
    'cost-performance':{ layers: [], cats: ['Performance'] },
    'data-engineering':{ layers: [], cats: ['Data Loading', 'Advanced'] },
    governance:       { layers: [], cats: ['Security'] },
    'data-sharing':   { layers: [], cats: [] },
    'business-continuity':{ layers: [], cats: ['Features'] },
  };

  function collectQA(id) {
    // Prefer the curated per-module interview bank when present.
    const bank = (window.SnowflakeViz.InterviewBank || {})[id];
    if (bank && bank.length) return bank;

    const map = QA_MAP[id];
    if (!map) return [];
    const C = window.SnowflakeViz.Concepts || {};
    const items = [];
    (map.layers || []).forEach(lid => {
      const layer = (C.architectureLayers || []).find(l => l.id === lid);
      if (layer && Array.isArray(layer.interviewQs)) {
        layer.interviewQs.forEach(x => { if (x && (x.q || x.question)) items.push(x); });
      }
    });
    if (map.cats && map.cats.length && Array.isArray(C.interviewQs)) {
      C.interviewQs.forEach(x => { if (map.cats.includes(x.category)) items.push(x); });
    }
    return items;
  }

  function renderInterviewQA(id) {
    const canvas = document.getElementById('canvas');
    if (!canvas) return;
    const old = canvas.querySelector('.interview-qa-section');
    if (old) old.remove();
    const items = collectQA(id);
    if (!items.length || !window.SnowflakeViz.QAAccordion) return;

    const section = document.createElement('section');
    section.className = 'mod-section interview-qa-section';
    const title = document.createElement('div');
    title.className = 'mod-section-title';
    title.textContent = '💬 Interview Questions';
    section.appendChild(title);
    section.appendChild(window.SnowflakeViz.QAAccordion.create(items));
    canvas.appendChild(section);
  }

  /* ── Quiz section (I11) ────────────────────────────────────── */
  function renderQuiz(id) {
    const canvas = document.getElementById('canvas');
    if (!canvas) return;
    const old = canvas.querySelector('.quiz-section');
    if (old) old.remove();
    const bank = (window.SnowflakeViz.QuizBank || {})[id];
    if (!bank || !bank.length || !window.SnowflakeViz.Quiz) return;

    const section = document.createElement('section');
    section.className = 'mod-section quiz-section';
    const title = document.createElement('div');
    title.className = 'mod-section-title';
    title.textContent = '📝 Test Yourself';
    section.appendChild(title);
    section.appendChild(window.SnowflakeViz.Quiz.create(id, bank));
    canvas.appendChild(section);
  }

  /* ── Swipe gestures ────────────────────────────────────────── */
  function setupGestures() {
    const canvas = document.getElementById('canvas');
    if (!canvas) return;
    let x0 = 0, y0 = 0, t0 = 0, tracking = false;
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) { tracking = false; return; }
      const t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; t0 = Date.now(); tracking = true;
    }, { passive: true });
    canvas.addEventListener('touchend', (e) => {
      if (!tracking) return; tracking = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - x0, dy = t.clientY - y0, dt = Date.now() - t0;
      if (dt > 600 || Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2) return;
      // Don't hijack horizontally scrollable content (code blocks, tables).
      if (e.target.closest('.code-block, table, [data-noswipe]')) return;
      const items = flatNav();
      const idx = items.findIndex(i => i.id === window.SnowflakeViz.currentModuleId);
      if (idx < 0) return;
      const target = dx < 0 ? items[idx + 1] : items[idx - 1];
      if (target) window.SnowflakeViz.navigate(target.id);
    }, { passive: true });
  }

  /* ── Guided tour ───────────────────────────────────────────── */
  const TOUR = [
    { sel: '#sidebar-nav', title: 'Browse the handbook', body: 'Twelve modules take you from Snowflake fundamentals to a full end-to-end Netflix data flow.' },
    { sel: '#theme-toggle', title: 'Light or dark', body: 'Switch themes anytime — your choice is remembered on this device.' },
    { sel: '#nav-toggle',  title: 'Search everything', body: 'Press ⌘K / Ctrl-K to jump to any module or concept instantly. On desktop, use the sidebar; on iPad, tap the menu.' },
  ];
  function runTour() {
    let done = false;
    try { done = localStorage.getItem(LS_TOUR) === '1'; } catch (_) {}
    if (done) return;

    const overlay = document.createElement('div');
    overlay.className = 'tour-overlay';
    overlay.innerHTML = `<div class="tour-spot"></div>
      <div class="tour-pop" role="dialog" aria-label="Guided tour">
        <h4></h4><p></p>
        <div class="tour-pop-actions">
          <span class="tour-step-count"></span>
          <span class="tour-pop-btns">
            <button class="btn btn-ghost" data-act="skip">Skip</button>
            <button class="btn btn-primary" data-act="next">Next</button>
          </span>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const spot = overlay.querySelector('.tour-spot');
    const pop = overlay.querySelector('.tour-pop');
    let step = 0;

    function finish() {
      overlay.classList.remove('visible');
      try { localStorage.setItem(LS_TOUR, '1'); } catch (_) {}
      setTimeout(() => overlay.remove(), 300);
    }
    function show(i) {
      const t = TOUR[i];
      let el = document.querySelector(t.sel);
      // Fall back if the target is hidden (e.g. hamburger on desktop).
      if (!el || el.offsetParent === null) el = document.getElementById('sidebar') || document.body;
      const r = el.getBoundingClientRect();
      const pad = 6;
      spot.style.top = (r.top - pad) + 'px';
      spot.style.left = (r.left - pad) + 'px';
      spot.style.width = (r.width + pad * 2) + 'px';
      spot.style.height = (r.height + pad * 2) + 'px';
      pop.querySelector('h4').textContent = t.title;
      pop.querySelector('p').textContent = t.body;
      pop.querySelector('.tour-step-count').textContent = `${i + 1} of ${TOUR.length}`;
      pop.querySelector('[data-act="next"]').textContent = i === TOUR.length - 1 ? 'Done' : 'Next';
      // Position popover: below the spot, clamped to viewport.
      const top = Math.min(r.bottom + 14, window.innerHeight - 180);
      const left = Math.min(Math.max(r.left, 12), window.innerWidth - 320);
      pop.style.top = top + 'px';
      pop.style.left = left + 'px';
    }
    overlay.addEventListener('click', (e) => {
      const act = e.target.dataset.act;
      if (act === 'skip') finish();
      else if (act === 'next') { step++; step >= TOUR.length ? finish() : show(step); }
    });
    overlay.classList.add('visible');
    show(0);
    window.addEventListener('resize', () => overlay.classList.contains('visible') && show(step));
  }

  /* ── Init + wiring ─────────────────────────────────────────── */
  function init() {
    buildMeter();
    addNavChecks();
    refreshProgress();
    setupGestures();
    setTimeout(runTour, 900);
  }

  document.addEventListener('sviz:navigate', (e) => {
    const id = e.detail && e.detail.id;
    // Mark visited (home doesn't count toward completion but is fine to store).
    const visited = getVisited();
    if (id && id !== 'home' && !visited.has(id)) {
      visited.add(id);
      saveVisited(visited);
      const p = refreshProgress();
      if (p.done === p.total) setTimeout(() => toast('🎉 All modules explored — nice work!'), 400);
    } else {
      refreshProgress();
    }
    renderInterviewQA(id);
    renderQuiz(id);
    renderPager(id);
  });

  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Enhance = { init, toast };
  window.SnowflakeViz.toast = toast;
})();
