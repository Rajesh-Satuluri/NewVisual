/* ============================================================
   Swipe gestures (touch) — left/right between adjacent screens.
   Guarded so it never hijacks horizontally-scrollable children
   (code blocks, tables, the animation scrubber, SVG diagrams).
   ============================================================ */
(function () {
  'use strict';
  const IV = (window.IcebergViz = window.IcebergViz || {});

  const THRESHOLD = 70;   // px horizontal travel to count as a swipe
  const V_LIMIT = 60;     // max vertical drift to still count as horizontal
  let x0 = 0, y0 = 0, tracking = false;

  function order() { return IV.getScreens ? IV.getScreens() : []; }

  function adjacent(id, dir) {
    const list = order();
    const i = list.findIndex(s => s.id === id);
    if (i === -1) return null;
    const t = list[i + dir];
    return t ? t.id : null;
  }

  // Walk up from the touch target; bail if inside something scrollable sideways.
  function inHorizontalScroller(el) {
    const root = document.getElementById('module-container');
    while (el && el !== root && el !== document.body) {
      if (el.scrollWidth - el.clientWidth > 8) {
        const ov = getComputedStyle(el).overflowX;
        if (ov === 'auto' || ov === 'scroll') return true;
      }
      if (el.closest && el.closest('.anim-progress-track')) return true;
      el = el.parentElement;
    }
    return false;
  }

  function onStart(e) {
    if (e.touches.length !== 1) { tracking = false; return; }
    if (inHorizontalScroller(e.target)) { tracking = false; return; }
    const t = e.touches[0];
    x0 = t.clientX; y0 = t.clientY; tracking = true;
  }

  function onEnd(e) {
    if (!tracking) return;
    tracking = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - x0, dy = t.clientY - y0;
    if (Math.abs(dx) < THRESHOLD || Math.abs(dy) > V_LIMIT) return;
    const id = IV.currentScreenId && IV.currentScreenId();
    if (!id) return;
    const target = adjacent(id, dx < 0 ? 1 : -1); // swipe left → next
    if (target && IV.navigate) IV.navigate(target);
  }

  function init() {
    const c = document.getElementById('module-container');
    if (!c) return;
    c.addEventListener('touchstart', onStart, { passive: true });
    c.addEventListener('touchend', onEnd, { passive: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
