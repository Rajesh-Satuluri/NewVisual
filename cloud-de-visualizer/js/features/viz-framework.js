/* ============================================================
   Cloud DE Visualizer — interactive visualizer framework.

   A dependency-free, data-driven "stepper" player used by the
   conceptual visualizers (Spark execution, Delta transactions,
   pipeline flow, storage layout). Every visualizer built on this
   framework is an EXPLANATORY SIMULATION — it models how a system
   behaves conceptually; it does NOT connect to any live cloud,
   cluster, or engine. That is stated prominently on every player.

   A visualizer spec:
     {
       id, title, subtitle,
       conceptualNote,                // overrides the default disclaimer
       steps: [ { title, caption, diagram } ]
       //   diagram: HTML string, or (state) => HTML string
       //   state = { i, total } for the current step
     }

   Public API:
     TV.Viz.register(spec)        register a visualizer
     TV.Viz.get(id) / TV.Viz.list()
     TV.Viz.player(spec, host)    build a live player into `host`
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  const esc = (TV.DS && TV.DS.esc) || (s => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m])));

  const REG = {};
  function register(spec) { if (spec && spec.id) REG[spec.id] = spec; return spec; }
  function get(id) { return REG[id] || null; }
  function list() { return Object.keys(REG).map(k => REG[k]); }

  const DEFAULT_NOTE =
    'Conceptual simulation — this models the behaviour for learning. It is not connected to a live cluster, engine, or cloud account, and runs entirely in your browser.';

  const prefersReduced = () => {
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (e) { return false; }
  };

  function ensureStyles() {
    if (document.getElementById('viz-styles')) return;
    const el = document.createElement('style');
    el.id = 'viz-styles';
    el.textContent = `
.viz { border:1px solid var(--border-default); border-radius:var(--radius-lg,14px); background:var(--bg-2); overflow:hidden; }
.viz-head { padding:16px 18px 14px; border-bottom:1px solid var(--border-subtle); }
.viz-title { font-size:17px; font-weight:800; color:var(--text-primary); margin:0 0 3px; letter-spacing:-.01em; }
.viz-sub { font-size:13px; color:var(--text-secondary); line-height:1.6; margin:0; }
.viz-note { display:flex; gap:8px; align-items:flex-start; margin:12px 18px 0; padding:9px 12px; border:1px dashed color-mix(in srgb, var(--yellow,#f59e0b) 55%, transparent); background:color-mix(in srgb, var(--yellow,#f59e0b) 10%, transparent); border-radius:9px; font-size:12px; color:var(--text-secondary); line-height:1.55; }
.viz-note b { color:var(--text-primary); }
.viz-note-ico { flex:0 0 auto; }
.viz-stage { position:relative; min-height:230px; padding:20px 18px; display:flex; align-items:center; justify-content:center; }
.viz-stage-inner { width:100%; }
.viz-rail { display:flex; gap:6px; padding:0 18px 4px; }
.viz-rail-seg { flex:1; height:4px; border-radius:3px; background:var(--border-default); transition:background .2s; }
.viz-rail-seg.is-done { background:color-mix(in srgb, var(--brand) 55%, transparent); }
.viz-rail-seg.is-cur { background:var(--brand); }
.viz-stepmeta { padding:4px 18px 2px; }
.viz-step-title { font-size:14px; font-weight:800; color:var(--text-primary); margin:0 0 4px; display:flex; align-items:center; gap:8px; }
.viz-step-n { font-size:11px; font-weight:800; color:#fff; background:var(--brand); border-radius:6px; padding:2px 7px; }
.viz-step-cap { font-size:13px; color:var(--text-secondary); line-height:1.65; margin:0; }
.viz-controls { display:flex; align-items:center; gap:8px; padding:14px 18px 16px; flex-wrap:wrap; }
.viz-btn { cursor:pointer; border:1px solid var(--border-default); background:var(--bg-1); color:var(--text-primary); font:inherit; font-size:13px; font-weight:700; padding:7px 14px; border-radius:9px; transition:border-color .12s, background .12s, opacity .12s; }
.viz-btn:hover:not(:disabled) { border-color:var(--brand); }
.viz-btn:disabled { opacity:.4; cursor:not-allowed; }
.viz-btn--primary { background:var(--brand); border-color:var(--brand); color:#06171a; }
.viz-btn--primary:hover:not(:disabled) { filter:brightness(1.08); }
.viz-spacer { flex:1; }
.viz-count { font-size:12px; color:var(--text-muted); font-weight:700; }
/* generic diagram primitives reused by visualizers */
.viz-row { display:flex; gap:10px; flex-wrap:wrap; align-items:center; justify-content:center; }
.viz-col { display:flex; flex-direction:column; gap:8px; align-items:center; }
.viz-box { border:1px solid var(--border-default); background:var(--bg-1); border-radius:9px; padding:9px 12px; font-size:12px; font-weight:700; color:var(--text-primary); text-align:center; min-width:74px; transition:border-color .25s, background .25s, transform .25s, opacity .25s; }
.viz-box small { display:block; font-weight:600; color:var(--text-muted); font-size:10px; margin-top:2px; }
.viz-box.is-active { border-color:var(--brand); background:color-mix(in srgb, var(--brand) 12%, transparent); }
.viz-box.is-dim { opacity:.4; }
.viz-box.is-done { border-color:color-mix(in srgb, var(--green,#10b981) 50%, transparent); background:color-mix(in srgb, var(--green,#10b981) 12%, transparent); }
.viz-box.is-hot { border-color:color-mix(in srgb, var(--red,#ef4444) 55%, transparent); background:color-mix(in srgb, var(--red,#ef4444) 12%, transparent); }
.viz-arrow { color:var(--text-muted); font-size:18px; font-weight:800; }
.viz-tag { display:inline-block; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.05em; padding:2px 8px; border-radius:999px; border:1px solid var(--border-default); color:var(--text-muted); background:var(--bg-2); }
.viz-tag--shuffle { color:#b45309; border-color:color-mix(in srgb,#f59e0b 45%,transparent); background:color-mix(in srgb,#f59e0b 12%,transparent); }
.viz-tag--narrow { color:#047857; border-color:color-mix(in srgb,#10b981 45%,transparent); background:color-mix(in srgb,#10b981 12%,transparent); }
:root[data-theme="dark"] .viz-tag--shuffle, :root:not([data-theme="light"]) .viz-tag--shuffle { color:#fcd34d; }
:root[data-theme="dark"] .viz-tag--narrow, :root:not([data-theme="light"]) .viz-tag--narrow { color:#6ee7b7; }
.viz-lane { display:grid; gap:7px; }
.viz-lane-h { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.05em; color:var(--text-muted); }
@media (prefers-reduced-motion: reduce){ .viz-box { transition:none; } }
@media (max-width:640px){ .viz-stage { min-height:200px; } }
`;
    document.head.appendChild(el);
  }

  /* Build a live player for `spec` into `host`. Returns a controller
     { el, go(i), next, prev, destroy }. */
  function player(spec, host) {
    ensureStyles();
    const steps = (spec && spec.steps) || [];
    const total = steps.length;
    let i = 0, timer = null;

    const el = document.createElement('div');
    el.className = 'viz';
    el.innerHTML = `
      <div class="viz-head">
        <h3 class="viz-title">${esc(spec.title || 'Visualizer')}</h3>
        ${spec.subtitle ? `<p class="viz-sub">${esc(spec.subtitle)}</p>` : ''}
      </div>
      <div class="viz-note">
        <span class="viz-note-ico" aria-hidden="true">🧪</span>
        <span><b>Conceptual.</b> ${esc(spec.conceptualNote || DEFAULT_NOTE)}</span>
      </div>
      <div class="viz-rail">${steps.map(() => `<span class="viz-rail-seg"></span>`).join('')}</div>
      <div class="viz-stepmeta">
        <div class="viz-step-title"><span class="viz-step-n"></span><span class="viz-step-label"></span></div>
        <p class="viz-step-cap"></p>
      </div>
      <div class="viz-stage"><div class="viz-stage-inner"></div></div>
      <div class="viz-controls">
        <button type="button" class="viz-btn" data-viz="reset">⟲ Reset</button>
        <button type="button" class="viz-btn" data-viz="prev">← Prev</button>
        <button type="button" class="viz-btn viz-btn--primary" data-viz="next">Next →</button>
        <button type="button" class="viz-btn" data-viz="play">▶ Play</button>
        <span class="viz-spacer"></span>
        <span class="viz-count"></span>
      </div>`;

    const stage = el.querySelector('.viz-stage-inner');
    const segs = [...el.querySelectorAll('.viz-rail-seg')];
    const stepN = el.querySelector('.viz-step-n');
    const stepLabel = el.querySelector('.viz-step-label');
    const stepCap = el.querySelector('.viz-step-cap');
    const count = el.querySelector('.viz-count');
    const btn = n => el.querySelector(`[data-viz="${n}"]`);

    function stopPlay() { if (timer) { clearInterval(timer); timer = null; btn('play').textContent = '▶ Play'; } }

    function draw() {
      const s = steps[i] || {};
      const dia = typeof s.diagram === 'function' ? s.diagram({ i, total }) : (s.diagram || '');
      stage.innerHTML = dia;
      stepN.textContent = (i + 1);
      stepLabel.textContent = s.title || '';
      stepCap.textContent = s.caption || '';
      count.textContent = `Step ${i + 1} of ${total}`;
      segs.forEach((seg, k) => {
        seg.classList.toggle('is-done', k < i);
        seg.classList.toggle('is-cur', k === i);
      });
      btn('prev').disabled = i === 0;
      btn('next').disabled = i >= total - 1;
    }

    function go(n) { i = Math.max(0, Math.min(total - 1, n)); draw(); }
    function next() { if (i < total - 1) { go(i + 1); } else { stopPlay(); } }
    function prev() { go(i - 1); }
    function reset() { stopPlay(); go(0); }
    function play() {
      if (timer) { stopPlay(); return; }
      if (i >= total - 1) go(0);
      btn('play').textContent = '⏸ Pause';
      const delay = prefersReduced() ? 1600 : 1100;
      timer = setInterval(() => { if (i >= total - 1) { stopPlay(); } else { go(i + 1); } }, delay);
    }

    btn('reset').addEventListener('click', reset);
    btn('prev').addEventListener('click', () => { stopPlay(); prev(); });
    btn('next').addEventListener('click', () => { stopPlay(); next(); });
    btn('play').addEventListener('click', play);

    if (host) host.appendChild(el);
    go(0);
    return { el, go, next, prev, reset, destroy: stopPlay };
  }

  TV.Viz = { register, get, list, player };
})();
