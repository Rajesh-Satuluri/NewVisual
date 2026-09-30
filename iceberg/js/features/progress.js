/* ============================================================
   Progress tracking — visited checkmarks in nav + sidebar meter.
   Per-format: persisted under tv-<format>-visited; rebuilds on
   format switch. Celebratory toast at 100% (per format).
   ============================================================ */
(function () {
  'use strict';
  const TV = (window.TableViz = window.TableViz || {});

  function fmt() { return TV.currentFormat ? TV.currentFormat() : 'iceberg'; }
  function KEY() { return 'tv-' + fmt() + '-visited'; }
  function DONE() { return 'tv-' + fmt() + '-progress-celebrated'; }

  function load() { try { return new Set(JSON.parse(TV.ls.get(KEY()) || '[]')); } catch (e) { return new Set(); } }
  function save(set) { TV.ls.set(KEY(), JSON.stringify([...set])); }

  let visited = new Set();
  let meterFill, meterLabel;

  function total() { return (TV.getScreens ? TV.getScreens() : []).length || 1; }

  function buildMeter() {
    const search = document.querySelector('.sidebar-search-wrap');
    if (!search || document.getElementById('iv-progress')) return;
    const box = document.createElement('div');
    box.id = 'iv-progress';
    box.className = 'iv-progress';
    box.innerHTML = `
      <div class="iv-progress__row">
        <span class="iv-progress__label">Progress</span>
        <span class="iv-progress__count" id="iv-progress-count">0 / 0</span>
      </div>
      <div class="iv-progress__track"><div class="iv-progress__fill" id="iv-progress-fill"></div></div>`;
    search.insertAdjacentElement('afterend', box);
    meterFill = box.querySelector('#iv-progress-fill');
    meterLabel = box.querySelector('#iv-progress-count');
  }

  function paintNav() {
    document.querySelectorAll('a.nav-item[data-nav-id]').forEach(a => {
      a.classList.toggle('nav-done', visited.has(a.dataset.navId));
    });
  }

  function celebrated() { return TV.ls.get(DONE()) === '1'; }
  function markCelebrated() { TV.ls.set(DONE(), '1'); }

  function updateMeter() {
    const n = visited.size, t = total();
    if (meterFill) meterFill.style.width = Math.min(100, (n / t) * 100).toFixed(1) + '%';
    if (meterLabel) meterLabel.textContent = `${n} / ${t}`;
    if (n >= t && !celebrated()) {
      markCelebrated();
      if (TV.toast) TV.toast('You explored every topic. Nice work!', { title: '🎉 All done', duration: 5000 });
    }
  }

  function mark(id) {
    if (!id || visited.has(id)) { paintNav(); return; }
    visited.add(id); save(visited); paintNav(); updateMeter();
  }

  /** Reload state for the active format and repaint (called on format switch). */
  function reload() {
    visited = load();
    paintNav();
    updateMeter();
  }

  function init() {
    buildMeter();
    visited = load();
    paintNav();
    updateMeter();
    document.addEventListener('app:navigate', (e) => mark(e.detail && e.detail.id));
    document.addEventListener('app:format', reload);
    if (TV.currentScreenId && TV.currentScreenId()) mark(TV.currentScreenId());
    TV._reloadProgress = reload;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
