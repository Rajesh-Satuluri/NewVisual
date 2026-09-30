/* ============================================================
   Certification Module — SnowPro exam domains mapped to the
   handbook modules that cover them.
   ============================================================ */

(function () {
  'use strict';

  const CORE = [
    { domain: 'Snowflake AI Data Cloud Features & Architecture', mods: ['intro', 'architecture', 'cloud-services', 'storage', 'compute', 'editions'] },
    { domain: 'Account Access & Security', mods: ['rbac', 'security', 'governance'] },
    { domain: 'Performance & Cost Optimization', mods: ['caching', 'cost-performance'] },
    { domain: 'Data Loading & Unloading', mods: ['data-loading', 'semi-structured'] },
    { domain: 'Data Transformations & Pipelines', mods: ['query-execution', 'data-engineering'] },
    { domain: 'Data Protection & Sharing', mods: ['advanced', 'business-continuity', 'data-sharing'] },
  ];
  const ADVANCED = [
    { t: 'Advanced: Architect', d: 'Designing accounts, security, sharing, and cost architecture at scale.' },
    { t: 'Advanced: Data Engineer', d: 'Pipelines with Streams/Tasks/Dynamic Tables, performance, and Snowpark.' },
    { t: 'Advanced: Administrator', d: 'RBAC, resource monitors, replication/failover, and account operations.' },
    { t: 'Advanced: Data Scientist / ML', d: 'Snowpark ML, feature engineering, and in-database modeling.' },
  ];

  const M = {
    render(canvas) {
      canvas.innerHTML = '';
      const page = _el('div', 'mod-page');
      const labelOf = id => (flatNav().find(i => i.id === id) || {}).label || id;
      const iconOf = id => (flatNav().find(i => i.id === id) || {}).icon || '•';

      page.appendChild(_header(
        'Reference',
        'SnowPro Certification Map',
        'Study smarter: each SnowPro Core exam domain below links to the handbook modules that cover it. Work the domains, take each module\'s quiz, then step up to an Advanced track.'
      ));

      const cSec = _section('SnowPro Core — Domains → Modules');
      CORE.forEach(d => {
        const block = _el('div', 'cert-domain');
        const h = _el('div', 'cert-domain-name'); h.textContent = d.domain; block.appendChild(h);
        const chips = _el('div', 'cert-chips');
        d.mods.forEach(id => {
          const chip = _el('button', 'cert-chip');
          chip.innerHTML = `<span>${iconOf(id)}</span> ${labelOf(id)}`;
          chip.addEventListener('click', () => window.SnowflakeViz.navigate(id));
          chips.appendChild(chip);
        });
        const practice = _el('button', 'cert-chip cert-practice');
        practice.innerHTML = '📝 Practice questions';
        practice.addEventListener('click', () => {
          window.SnowflakeViz._prepModules = d.mods;
          window.SnowflakeViz.navigate('interview-prep');
        });
        chips.appendChild(practice);
        block.appendChild(chips);
        cSec.appendChild(block);
      });
      page.appendChild(cSec);

      const aSec = _section('SnowPro Advanced Tracks');
      const grid = _el('div', 'ss-grid');
      ADVANCED.forEach(x => {
        const c = _el('div', 'ss-card');
        c.innerHTML = `<div class="ss-card-type">${x.t}</div><div class="ss-card-desc">${x.d}</div>`;
        grid.appendChild(c);
      });
      aSec.appendChild(grid);
      const info = _el('div', 'info-box');
      info.innerHTML = `<strong>Exam tip:</strong> SnowPro Core is heavy on architecture, editions/features, RBAC, and cost/performance. Use the ⌘K palette to jump to any concept, and the per-module quizzes to check readiness before test day.`;
      aSec.appendChild(info);
      page.appendChild(aSec);

      canvas.appendChild(page);
      return {};
    },
  };

  function flatNav() { return (window.SnowflakeViz.NAV_GROUPS || []).flatMap(g => g.items); }
  function _section(t) { const s = _el('div', 'mod-section'); const h = _el('div', 'mod-section-title'); h.textContent = t; s.appendChild(h); return s; }
  function _header(e, t, sub) { const h = _el('div', 'mod-header'); h.innerHTML = `<div class="mod-eyebrow">${e}</div><h1 class="mod-title">${t}</h1><p class="mod-subtitle">${sub}</p>`; return h; }
  function _el(tag, cls) { const el = document.createElement(tag); if (cls) el.className = cls; return el; }

  window.SnowflakeViz = window.SnowflakeViz || {};
  window.SnowflakeViz.Modules = window.SnowflakeViz.Modules || {};
  window.SnowflakeViz.Modules.certification = M;
})();
