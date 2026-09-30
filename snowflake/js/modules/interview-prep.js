/* ============================================================
   Interview Prep — aggregate view of every interview question,
   filterable by difficulty, SnowPro domain, and free text.
   ============================================================ */

(function () {
  'use strict';

  // SnowPro Core domain → module ids (mirrors the cert map).
  const DOMAINS = {
    'Architecture & Features': ['intro', 'architecture', 'cloud-services', 'storage', 'compute', 'editions'],
    'Account Access & Security': ['rbac', 'security', 'governance'],
    'Performance & Cost': ['caching', 'cost-performance'],
    'Data Loading & Semi-Structured': ['data-loading', 'semi-structured'],
    'Transformations & Pipelines': ['query-execution', 'data-engineering'],
    'Data Protection & Sharing': ['advanced', 'business-continuity', 'data-sharing'],
  };

  const M = {
    render(canvas) {
      canvas.innerHTML = '';
      const page = _el('div', 'mod-page');
      const IB = window.SnowflakeViz.InterviewBank || {};
      const nav = (window.SnowflakeViz.NAV_GROUPS || []).flatMap(g => g.items);
      const meta = id => nav.find(i => i.id === id) || { label: id, icon: '•' };

      const total = Object.values(IB).reduce((s, a) => s + a.length, 0);

      page.appendChild(_header('Reference', 'Interview Prep',
        `All ${total} interview questions in one place. Filter by difficulty or SnowPro domain, or search — then quiz yourself before test day.`));

      /* Filter bar */
      const bar = _el('div', 'prep-bar');
      const search = _mk('input', 'prep-input'); search.type = 'search'; search.placeholder = 'Search questions…';
      const diffSel = _mk('select', 'prep-select');
      diffSel.innerHTML = `<option value="">All difficulties</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>`;
      const domSel = _mk('select', 'prep-select');
      domSel.innerHTML = `<option value="">All domains</option>` + Object.keys(DOMAINS).map(d => `<option value="${d}">${d}</option>`).join('');
      const count = _mk('span', 'prep-count');
      bar.append(search, diffSel, domSel, count);
      page.appendChild(bar);

      // Honor a module preselect coming from the cert map (IE7).
      let forcedMods = null;
      const pm = window.SnowflakeViz._prepModules;
      if (Array.isArray(pm) && pm.length) { forcedMods = new Set(pm); window.SnowflakeViz._prepModules = null; }

      const results = _el('div', 'prep-results');
      page.appendChild(results);

      function render() {
        const q = search.value.trim().toLowerCase();
        const diff = diffSel.value;
        const dom = domSel.value;
        const allow = forcedMods || (dom ? new Set(DOMAINS[dom]) : null);
        results.innerHTML = '';
        let shown = 0;

        Object.keys(IB).forEach(id => {
          if (allow && !allow.has(id)) return;
          let items = IB[id];
          if (diff) items = items.filter(x => x.difficulty === diff);
          if (q) items = items.filter(x => (x.q + ' ' + x.a).toLowerCase().includes(q));
          if (!items.length) return;
          shown += items.length;
          const group = _el('div', 'prep-group');
          const h = _el('button', 'prep-group-head');
          h.innerHTML = `<span>${meta(id).icon} ${meta(id).label}</span><span class="prep-group-count">${items.length}</span>`;
          h.addEventListener('click', () => window.SnowflakeViz.navigate(id));
          group.appendChild(h);
          if (window.SnowflakeViz.QAAccordion) group.appendChild(window.SnowflakeViz.QAAccordion.create(items));
          results.appendChild(group);
        });

        if (!shown) results.innerHTML = `<div class="cmdk-empty">No questions match.</div>`;
        count.textContent = `${shown} shown`;
      }

      // Any manual filter change clears the cert-map preselect.
      bar.addEventListener('input', () => { forcedMods = null; render(); });
      bar.addEventListener('change', () => { forcedMods = null; render(); });
      render();

      canvas.appendChild(page);
      return {};
    },
  };

  function _header(e, t, sub) { const h = _el('div', 'mod-header'); h.innerHTML = `<div class="mod-eyebrow">${e}</div><h1 class="mod-title">${t}</h1><p class="mod-subtitle">${sub}</p>`; return h; }
  function _el(tag, cls) { const el = document.createElement(tag); if (cls) el.className = cls; return el; }
  function _mk(tag, cls) { return _el(tag, cls); }

  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Modules = window.SnowflakeViz.Modules || {};
  window.SnowflakeViz.Modules.interviewPrep = M;
})();
