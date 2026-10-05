/* ============================================================
   SplitPane — draggable panel resizers for the explorer/diagram
   screens. Two layout modes, one shared behaviour set:

     • GRID mode  — pass `tracks` (one per grid column). Rewrites
       the element's `grid-template-columns` live. Used by the
       Metadata / Manifest explorers (tree | content | context).

     • FLEX mode  — pass `flex: { panel, min, max, def }`. The
       element is a flex row (canvas `flex:1` + a fixed-width
       side panel); dragging sets the side panel's width. Used by
       the animated diagram screens (canvas ↔ step sidebar), wired
       centrally from app.js for the iceberg format.

   LAPTOP-ONLY: every resizer is gated on a fine pointer
   (`@media (pointer: fine)`). Touch devices (iPad included) report
   a coarse pointer, so NO gutter is ever created there and the
   screen renders exactly as it would without this helper — this
   build changes laptop UI only.

   Shared behaviour: sizes clamp to [min,max] and never starve the
   flexible area; sizes persist per screen in localStorage; a gutter
   is a keyboard-focusable role="separator" (arrow keys nudge,
   double-click / Home resets); Pointer Events (mouse, and by design
   never engaged on touch). Auto-disables when the layout stacks
   (grid: narrow viewport; flex: the container query flips it to a
   column) so responsive stacking is untouched. `detach()` restores
   original inline styles — call it from the module's destroy().

     const h = IV.SplitPane.attach(gridEl, { key, disableBelow, tracks:[…] });
     const h = IV.SplitPane.attach(flexOuter, { key, flex:{ panel, min, max, def } });
     h.detach();
   ============================================================ */
(function () {
  'use strict';
  const IV = (window.IcebergViz = window.IcebergViz || {});

  const STYLE_ID = 'iv-splitpane-styles';
  const NUDGE = 16;
  const ptrMql = window.matchMedia('(pointer: fine)');
  const finePointer = () => ptrMql.matches; // laptop trackpad/mouse; false on iPad/touch

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      .iv-split-gutter {
        position: absolute; top: 0; bottom: 0;
        width: 11px; transform: translateX(-50%);
        z-index: 5; cursor: col-resize;
        display: flex; align-items: center; justify-content: center;
        background: transparent; border: none; padding: 0;
        touch-action: none; -webkit-tap-highlight-color: transparent;
      }
      .iv-split-gutter::before {
        content: ''; width: 2px; height: 100%;
        background: var(--border-default, var(--border, rgba(255,255,255,.14)));
        border-radius: 2px; transition: background .12s, width .12s;
      }
      .iv-split-gutter:hover::before,
      .iv-split-gutter.is-dragging::before {
        background: var(--brand-2, var(--iceberg, #4aaeff)); width: 3px;
      }
      .iv-split-gutter:focus-visible { outline: none; }
      .iv-split-gutter:focus-visible::before {
        background: var(--brand-2, var(--iceberg, #4aaeff)); width: 3px;
        box-shadow: 0 0 0 2px var(--brand-glow, rgba(74,174,255,.35));
      }
      .iv-split-gutter::after {
        content: ''; position: absolute; width: 4px; height: 26px;
        border-radius: 3px; opacity: 0;
        background: var(--brand-2, var(--iceberg, #4aaeff));
        transition: opacity .12s;
      }
      .iv-split-gutter:hover::after,
      .iv-split-gutter.is-dragging::after { opacity: .5; }
      body.iv-split-resizing { cursor: col-resize !important; user-select: none !important; }
      @media (prefers-reduced-motion: reduce) {
        .iv-split-gutter::before, .iv-split-gutter::after { transition: none; }
      }
    `;
    document.head.appendChild(s);
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function readGap(el) { const g = parseFloat(getComputedStyle(el).columnGap); return isNaN(g) ? 0 : g; }
  function lsGet(key) { if (!key) return null; try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } }
  function lsSet(key, v) { if (!key) return; try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* ignore */ } }

  function makeGutter() {
    const g = document.createElement('div');
    g.className = 'iv-split-gutter';
    g.setAttribute('role', 'separator');
    g.setAttribute('aria-orientation', 'vertical');
    g.setAttribute('tabindex', '0');
    g.setAttribute('aria-label', 'Resize panel');
    g.style.display = 'none'; // hidden until enable() — correct on first render when disabled
    return g;
  }

  /* ── GRID mode ─────────────────────────────────────────────── */
  function attachGrid(gridEl, opts) {
    const tracks = opts.tracks;
    const key = opts.key ? 'iv:split:' + opts.key : null;
    const disableBelow = opts.disableBelow || 720;
    const panels = tracks.map((t, i) => gridEl.children[i]).filter(Boolean);
    if (panels.length < tracks.length) return null;

    const originalInline = gridEl.style.gridTemplateColumns || '';
    const originalPosition = gridEl.style.position || '';
    if (getComputedStyle(gridEl).position === 'static') gridEl.style.position = 'relative';
    tracks.forEach((t, i) => { if (t.flex) panels[i].style.minWidth = '0'; });

    const sizes = tracks.map((t) => (t.flex ? null : (t.def || 260)));
    const saved = lsGet(key);
    if (Array.isArray(saved) && saved.length === tracks.length) {
      saved.forEach((v, i) => {
        if (!tracks[i].flex && typeof v === 'number' && isFinite(v)) sizes[i] = clamp(v, tracks[i].min, tracks[i].max || v);
      });
    }

    const flexIndex = tracks.findIndex((t) => t.flex);
    const flexMin = flexIndex >= 0 ? (tracks[flexIndex].min || 0) : 0;
    function fixedTotal() { let s = 0; tracks.forEach((t, i) => { if (!t.flex) s += sizes[i]; }); return s; }
    function flexActual() { return gridEl.clientWidth - fixedTotal() - readGap(gridEl) * (tracks.length - 1); }
    function applyTemplate() {
      gridEl.style.gridTemplateColumns = tracks.map((t, i) => (t.flex ? 'minmax(0, 1fr)' : sizes[i] + 'px')).join(' ');
    }

    const gutters = [];
    for (let b = 0; b < tracks.length - 1; b++) {
      const left = b, right = b + 1;
      let owned, dir;
      if (!tracks[left].flex) { owned = left; dir = 1; }
      else if (!tracks[right].flex) { owned = right; dir = -1; }
      else continue;
      const track = tracks[owned];
      const g = makeGutter();
      g.setAttribute('aria-valuemin', String(track.min));
      g.setAttribute('aria-valuemax', String(track.max || Math.round(track.min * 3)));
      g._boundary = b; g._owned = owned;

      function setSize(px) {
        let next = clamp(px, track.min, track.max || px);
        sizes[owned] = next;
        if (flexIndex >= 0) { const d = flexMin - flexActual(); if (d > 0) sizes[owned] = clamp(next - d, track.min, track.max || next); }
        applyTemplate();
        g.setAttribute('aria-valuenow', String(Math.round(sizes[owned])));
        lsSet(key, sizes); layout();
      }
      let startX = 0, startPx = 0;
      function onMove(e) { setSize(startPx + dir * (e.clientX - startX)); }
      function onUp(e) {
        g.classList.remove('is-dragging'); document.body.classList.remove('iv-split-resizing');
        try { g.releasePointerCapture(e.pointerId); } catch (err) {}
        window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp);
      }
      g.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch' || (e.button != null && e.button !== 0)) return;
        e.preventDefault(); startX = e.clientX; startPx = sizes[owned];
        g.classList.add('is-dragging'); document.body.classList.add('iv-split-resizing');
        try { g.setPointerCapture(e.pointerId); } catch (err) {}
        window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
      });
      g.addEventListener('dblclick', () => setSize(track.def || track.min));
      g.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); setSize(sizes[owned] - dir * NUDGE); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); setSize(sizes[owned] + dir * NUDGE); }
        else if (e.key === 'Home') { e.preventDefault(); setSize(track.def || track.min); }
      });
      gridEl.appendChild(g); gutters.push(g);
    }

    function layout() {
      const gap = readGap(gridEl);
      gutters.forEach((g) => { const p = panels[g._boundary]; if (p) g.style.left = (p.offsetLeft + p.offsetWidth + gap / 2) + 'px'; });
    }

    let enabled = false;
    function enable() {
      if (enabled) return; enabled = true; applyTemplate();
      gutters.forEach((g) => { g.style.display = ''; g.setAttribute('aria-valuenow', String(Math.round(sizes[g._owned]))); });
      layout();
    }
    function disable() {
      if (!enabled && gutters.every((g) => g.style.display === 'none')) { gridEl.style.gridTemplateColumns = originalInline; return; }
      enabled = false; gutters.forEach((g) => { g.style.display = 'none'; });
      gridEl.style.gridTemplateColumns = originalInline;
    }
    function sync() {
      if (!finePointer() || window.innerWidth <= disableBelow) disable();
      else { enable(); layout(); }
    }
    return wire(gridEl, { sync, layout, gutters, cleanupExtra() {
      tracks.forEach((t, i) => { if (t.flex && panels[i]) panels[i].style.minWidth = ''; });
      gridEl.style.gridTemplateColumns = originalInline; gridEl.style.position = originalPosition;
    } });
  }

  /* ── FLEX mode ─────────────────────────────────────────────── */
  function attachFlex(outerEl, opts) {
    const cfg = opts.flex;
    const panel = cfg.panel;
    if (!panel || panel.parentElement !== outerEl) return null;
    const key = opts.key ? 'iv:split:' + opts.key : null;
    const min = cfg.min || 220;
    const max = cfg.max || 620;
    const canvasMin = cfg.canvasMin || 260;

    const originalWidth = panel.style.width || '';
    const originalPosition = outerEl.style.position || '';
    if (getComputedStyle(outerEl).position === 'static') outerEl.style.position = 'relative';

    let def = cfg.def || 0; // resolved lazily from computed width if not given
    let width = (typeof lsGet(key) === 'number') ? lsGet(key) : 0;

    function side() { return panel.offsetLeft > 0 ? 'right' : 'left'; } // canvas-then-panel ⇒ right
    function effMax() { return Math.min(max, Math.max(min, outerEl.clientWidth - canvasMin)); }
    function isStacked() { return getComputedStyle(outerEl).flexDirection === 'column'; }
    function apply(px) { width = clamp(px, min, effMax()); panel.style.width = width + 'px'; }

    const g = makeGutter();
    g.setAttribute('aria-valuemin', String(min));
    g.setAttribute('aria-valuemax', String(max));
    const dir = () => (side() === 'right' ? -1 : 1); // right panel: drag left ⇒ wider

    function setSize(px) { apply(px); g.setAttribute('aria-valuenow', String(Math.round(width))); lsSet(key, width); layout(); }
    let startX = 0, startW = 0;
    function onMove(e) { setSize(startW + dir() * (e.clientX - startX)); }
    function onUp(e) {
      g.classList.remove('is-dragging'); document.body.classList.remove('iv-split-resizing');
      try { g.releasePointerCapture(e.pointerId); } catch (err) {}
      window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp);
    }
    g.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch' || (e.button != null && e.button !== 0)) return;
      e.preventDefault(); startX = e.clientX; startW = width;
      g.classList.add('is-dragging'); document.body.classList.add('iv-split-resizing');
      try { g.setPointerCapture(e.pointerId); } catch (err) {}
      window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
    });
    g.addEventListener('dblclick', () => setSize(def || min));
    g.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); setSize(width - dir() * NUDGE); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); setSize(width + dir() * NUDGE); }
      else if (e.key === 'Home') { e.preventDefault(); setSize(def || min); }
    });
    outerEl.appendChild(g);

    function layout() { if (side() === 'right') g.style.left = panel.offsetLeft + 'px'; else g.style.left = (panel.offsetLeft + panel.offsetWidth) + 'px'; }

    let enabled = false;
    function enable() {
      if (enabled) return;
      if (!def) def = Math.round(panel.getBoundingClientRect().width) || min; // native width becomes the reset point
      enabled = true; g.style.display = '';
      apply(width || def);
      g.setAttribute('aria-valuenow', String(Math.round(width)));
      layout();
    }
    function disable() {
      enabled = false; g.style.display = 'none'; panel.style.width = originalWidth; // revert to CSS (300px rule etc.)
    }
    function sync() {
      if (!finePointer() || isStacked() || outerEl.clientWidth < (min + canvasMin)) disable();
      else { enable(); layout(); }
    }
    return wire(outerEl, { sync, layout, gutters: [g], cleanupExtra() {
      panel.style.width = originalWidth; outerEl.style.position = originalPosition;
    } });
  }

  /* ── Shared lifecycle wiring (observers, pointer/resize, detach) ── */
  function wire(el, api) {
    const onPtr = () => api.sync();
    if (ptrMql.addEventListener) ptrMql.addEventListener('change', onPtr);
    else if (ptrMql.addListener) ptrMql.addListener(onPtr);
    const onResize = () => api.sync();
    window.addEventListener('resize', onResize);
    let ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(() => api.sync()); ro.observe(el); }
    api.sync();
    return {
      layout: api.layout,
      detach() {
        if (ptrMql.removeEventListener) ptrMql.removeEventListener('change', onPtr);
        else if (ptrMql.removeListener) ptrMql.removeListener(onPtr);
        window.removeEventListener('resize', onResize);
        if (ro) ro.disconnect();
        api.gutters.forEach((g) => g.remove());
        api.gutters.length = 0;
        try { api.cleanupExtra(); } catch (e) {}
        document.body.classList.remove('iv-split-resizing');
      },
    };
  }

  IV.SplitPane = {
    attach(el, opts) {
      if (!el || !opts) return null;
      injectStyles();
      if (opts.flex) return attachFlex(el, opts);
      if (Array.isArray(opts.tracks)) return attachGrid(el, opts);
      return null;
    },

    /* Central helper for the animated diagram screens: finds the
       `-outer` flex row that holds a `-canvas` + `-sidebar` and
       attaches a flex resizer between them. Returns a handle or null.
       `keyPrefix` namespaces the persisted size per screen. */
    attachCanvasSidebar(container, keyPrefix) {
      if (!container || !IV.SplitPane) return null;
      const outer = Array.from(container.querySelectorAll('[class$="-outer"]'))
        .find((o) => o.querySelector(':scope > [class$="-canvas"]') &&
          (o.querySelector(':scope > [class$="-sidebar"]') || o.querySelector(':scope > [class$="-side"]')));
      if (!outer) return null;
      const panel = outer.querySelector(':scope > [class$="-sidebar"]') || outer.querySelector(':scope > [class$="-side"]');
      if (!panel) return null;
      return IV.SplitPane.attach(outer, {
        key: keyPrefix || 'canvas-sidebar',
        flex: { panel, min: 240, max: 620, canvasMin: 280 },
      });
    },
  };
})();
