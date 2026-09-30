/* ============================================================
   First-run guided tour — a few dismissible coach-marks with a
   spotlight + popover. Shown once (localStorage), skippable,
   reduced-motion friendly, keyboard accessible.
   ============================================================ */
(function () {
  'use strict';
  const IV = (window.IcebergViz = window.IcebergViz || {});
  const TV = window.TableViz || IV;
  function KEY() { return 'tv-' + (TV.currentFormat ? (TV.currentFormat() || 'iceberg') : 'iceberg') + '-tour-done'; }

  const STEPS = [
    { sel: '#sidebar-nav', title: 'Browse every topic', body: 'Interactive topics — architecture, write &amp; read paths, query planning, time travel, and more. Switch formats up top.', place: 'right' },
    { sel: '#nav-toggle,#sidebar-search', title: 'Jump anywhere fast', body: 'Press <kbd>⌘</kbd>/<kbd>Ctrl</kbd> <kbd>K</kbd> for the command palette, or search the sidebar.', place: 'right' },
    { sel: '#theme-toggle', title: 'Light or dark', body: 'Toggle the theme any time — your choice is remembered.', place: 'bottom' },
    { sel: '#anim-controls-bar', title: 'Play the animations', body: 'Step through each concept with Play / step controls, or use <kbd>Space</kbd> and arrow keys.', place: 'top' },
  ];

  let i = 0, overlay, spot, pop, done = false;

  function seen() { try { return localStorage.getItem(KEY()) === '1'; } catch (e) { return true; } }
  function markSeen() { try { localStorage.setItem(KEY(), '1'); } catch (e) {} }

  function target(step) {
    for (const s of step.sel.split(',')) {
      const el = document.querySelector(s.trim());
      if (el && el.offsetParent !== null) return el;
    }
    return null;
  }

  function position(el, step) {
    const r = el.getBoundingClientRect();
    const pad = 6;
    spot.style.cssText = `top:${r.top - pad}px;left:${r.left - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px`;

    pop.style.visibility = 'hidden';
    pop.style.top = '0px'; pop.style.left = '0px';
    const pr = pop.getBoundingClientRect();
    let top, left;
    const gap = 14;
    const place = step.place || 'bottom';
    if (place === 'right') { top = r.top; left = r.right + gap; }
    else if (place === 'top') { top = r.top - pr.height - gap; left = r.left; }
    else if (place === 'bottom') { top = r.bottom + gap; left = r.left; }
    else { top = r.top; left = r.left; }
    // Clamp to viewport.
    left = Math.max(12, Math.min(left, window.innerWidth - pr.width - 12));
    top = Math.max(12, Math.min(top, window.innerHeight - pr.height - 12));
    pop.style.top = top + 'px'; pop.style.left = left + 'px';
    pop.style.visibility = 'visible';
  }

  function show() {
    // Skip steps whose target isn't present at this width (e.g. hamburger on desktop).
    let guard = 0;
    while (i < STEPS.length && !target(STEPS[i]) && guard++ < STEPS.length) i++;
    if (i >= STEPS.length) return finish();
    const step = STEPS[i];
    const el = target(step);
    pop.querySelector('.iv-tour__title').innerHTML = step.title;
    pop.querySelector('.iv-tour__body').innerHTML = step.body;
    pop.querySelector('.iv-tour__count').textContent = `${i + 1} / ${STEPS.length}`;
    pop.querySelector('.iv-tour__next').textContent = i === STEPS.length - 1 ? 'Done' : 'Next';
    position(el, step);
  }

  function next() { i++; if (i >= STEPS.length) finish(); else show(); }

  function finish() {
    if (done) return;
    done = true;
    markSeen();
    overlay && overlay.remove();
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
  }

  function onKey(e) {
    if (e.key === 'Escape') finish();
    else if (e.key === 'Enter' || e.key === 'ArrowRight') next();
  }
  function onResize() { if (!done) show(); }

  function build() {
    overlay = document.createElement('div');
    overlay.className = 'iv-tour';
    overlay.innerHTML = `
      <div class="iv-tour__spot"></div>
      <div class="iv-tour__pop" role="dialog" aria-modal="true" aria-label="Getting started">
        <div class="iv-tour__count"></div>
        <div class="iv-tour__title"></div>
        <p class="iv-tour__body"></p>
        <div class="iv-tour__actions">
          <button class="iv-tour__skip" type="button">Skip</button>
          <button class="iv-tour__next btn-primary" type="button">Next</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    spot = overlay.querySelector('.iv-tour__spot');
    pop = overlay.querySelector('.iv-tour__pop');
    overlay.querySelector('.iv-tour__next').addEventListener('click', next);
    overlay.querySelector('.iv-tour__skip').addEventListener('click', finish);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
  }

  function start() { i = 0; done = false; if (!overlay) build(); show(); }

  function init() {
    IV._startTour = start;   // allow re-running from anywhere
    if (seen()) return;
    // Let the first screen settle before spotlighting.
    setTimeout(() => { if (!seen()) start(); }, 900);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
