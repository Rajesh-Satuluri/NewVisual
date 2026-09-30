/* ============================================================
   Cross-format concept jump.
   When the current screen has an equivalent concept in another
   registered format, show compact chips in the topbar to jump
   there (keeping you on the same topic). Rendered ONLY in the
   topbar (#xformat-jump) — never injected into a module's DOM,
   so animation layouts are untouched.

   The concept map is data-driven and format-extensible: adding a
   third data format later only means adding its screen id to the
   relevant rows — no code change here, no shipped-UI trace today.
   ============================================================ */
(function () {
  'use strict';
  const TV = (window.TableViz = window.TableViz || {});

  // Each row maps a canonical concept to its per-format screen id.
  // Any subset of formats may appear. delete-compare is offered as a
  // bonus "watch it run" jump from the delete concept.
  const CONCEPTS = [
    { label: 'Introduction',      iceberg: 'why-iceberg',        delta: 'why-delta',       hudi: 'why-hudi',      compare: 'overview' },
    { label: 'Architecture',      iceberg: 'architecture',       delta: 'architecture',    hudi: 'architecture', compare: 'metadata-model' },
    { label: 'CREATE TABLE',      iceberg: 'create-table',       delta: 'create-table' },
    { label: 'Insert / Append',   iceberg: 'insert',             delta: 'insert',          hudi: 'insert' },
    { label: 'Update / Upsert',   iceberg: 'update',             delta: 'update',          hudi: 'upsert',       compare: 'writes-deletes' },
    { label: 'Delete',            iceberg: 'delete',             delta: 'delete',          hudi: 'delete',       compare: 'writes-deletes', animated: 'delete-compare' },
    { label: 'Merge',             iceberg: 'merge',              delta: 'merge' },
    { label: 'Overwrite',         iceberg: 'overwrite',          delta: 'overwrite',       hudi: 'insert-overwrite' },
    { label: 'Read Path',         iceberg: 'read-path',          delta: 'read-path' },
    { label: 'Write Path',        iceberg: 'write-path',         delta: 'write-path' },
    { label: 'Query Planner',     iceberg: 'query-planner',      delta: 'query-planner',   hudi: 'query-planner' },
    { label: 'Time Travel',       iceberg: 'time-travel',        delta: 'time-travel',     compare: 'time-travel' },
    { label: 'Schema Evolution',  iceberg: 'schema-evolution',   delta: 'schema-evolution' },
    { label: 'Concurrency',       iceberg: 'concurrency',        delta: 'concurrency',     hudi: 'concurrency',  compare: 'concurrency' },
    { label: 'Partitioning',      iceberg: 'hidden-partitioning', delta: 'partitioning',   compare: 'layout' },
    { label: 'Engine Integrations', iceberg: 'engine-integrations', delta: 'engine-integrations', compare: 'ecosystem' },
    { label: 'Interview Mode',    iceberg: 'interview',          delta: 'interview' },
    { label: 'Quiz Mode',         iceberg: 'quiz',               delta: 'quiz' },
    { label: 'Study Deck',        iceberg: 'study',              delta: 'study' },
    { label: 'Cheat Sheets',      iceberg: 'cheatsheet',         delta: 'cheatsheet' },
  ];

  const FORMAT_ORDER = ['iceberg', 'delta', 'hudi', 'compare'];
  const SHORT = { iceberg: 'Iceberg', delta: 'Delta', hudi: 'Hudi', compare: 'Compare' };
  const MARK = {
    iceberg: '<svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true"><polygon points="12,4 20,20 4,20" fill="#4aaeff"/></svg>',
    delta:   '<svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true"><polygon points="12,4 20,20 4,20" fill="#ff5a3c"/></svg>',
    hudi:    '<svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true"><rect x="4" y="6" width="16" height="12" rx="2" fill="#14b8a6"/></svg>',
    compare: '<span style="font-weight:800">⇄</span>',
  };

  // Reverse index: (format, screenId) → concept row.
  const index = {};
  CONCEPTS.forEach(row => {
    FORMAT_ORDER.forEach(f => { if (row[f]) index[f + '/' + row[f]] = row; });
    if (row.animated) index['compare/' + row.animated] = row; // reachable from the synced anim too
  });

  function curFmt() { return TV.currentFormat ? (TV.currentFormat() || 'iceberg') : 'iceberg'; }
  function formatVisible(id) {
    const f = TV.formats && TV.formats[id];
    return !!(f && f.visible !== false);
  }
  function moduleExists(fmt, id) { return !!(TV.getModule && TV.getModule(fmt, id)); }

  function render(host, fmt, id) {
    const row = index[fmt + '/' + id];
    host.innerHTML = '';
    if (!row) { host.hidden = true; return; }

    // Targets = the concept's other formats that are registered, visible,
    // and actually have this module — plus the bonus animated compare jump.
    const chips = [];
    FORMAT_ORDER.forEach(f => {
      if (f === fmt) return;
      const target = row[f];
      if (target && formatVisible(f) && moduleExists(f, target)) {
        chips.push({ fmt: f, id: target, label: SHORT[f], kind: 'concept' });
      }
    });
    // Offer the synced Delete animation when you're on a delete screen but not already there.
    if (row.animated && !(fmt === 'compare' && id === row.animated) &&
        formatVisible('compare') && moduleExists('compare', row.animated)) {
      chips.push({ fmt: 'compare', id: row.animated, label: 'Watch CoW vs MoR', kind: 'anim' });
    }

    if (!chips.length) { host.hidden = true; return; }

    const lbl = document.createElement('span');
    lbl.className = 'xfj-label';
    lbl.textContent = 'Also in';
    host.appendChild(lbl);

    chips.forEach(c => {
      const a = document.createElement('a');
      a.className = 'xfj-chip' + (c.kind === 'anim' ? ' xfj-chip--anim' : '') + ' xfj-chip--' + c.fmt;
      a.href = '#' + c.fmt + '/' + c.id;
      a.innerHTML = (c.kind === 'anim' ? '▶ ' : MARK[c.fmt] + ' ') + c.label;
      a.setAttribute('data-tooltip', c.kind === 'anim'
        ? 'Watch the side-by-side delete animation'
        : 'See “' + row.label + '” in ' + SHORT[c.fmt]);
      host.appendChild(a);
    });
    host.hidden = false;
  }

  function sync(id) {
    const host = document.getElementById('xformat-jump');
    if (!host) return;
    const sid = id || (TV.currentScreenId && TV.currentScreenId());
    render(host, curFmt(), sid);
  }

  function init() {
    document.addEventListener('app:navigate', e => sync(e.detail && e.detail.id));
    document.addEventListener('app:format', () => sync());
    sync();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
