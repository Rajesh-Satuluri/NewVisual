/* ============================================================
   Cloud DE Visualizer — guided product tour (Wave 3).

   A lightweight, dismissible multi-step welcome that introduces the
   main areas. Shows automatically on first visit only (persisted in
   localStorage: cde-tour-seen), and can be reopened any time from the
   command palette ("Product tour") or TV.Tour.open(). Each step can
   deep-link to the area it describes. Fully additive — it overlays,
   never blocks, and navigating or closing dismisses it.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  if (!TV) return;
  const esc = s => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
  const SEEN = 'cde-tour-seen';
  const fmt = () => TV.activeFormat || (location.hash.split('/')[0] || '').replace('#', '') || 'azure';

  const STEPS = [
    { icon: '👋', title: 'Welcome', body: 'This is a hands-on learning platform for cloud data engineering across AWS, Azure, Databricks and Microsoft Fabric — service deep dives, interactive visualizers, a design canvas, an incident simulator, certifications and more. Here’s a 60-second tour.' },
    { icon: '📘', title: 'Learn the services', body: 'Every service has a deep dive: architecture, worked examples, security, operations, troubleshooting and certification mapping. Jump in from the Overview.', go: () => `#${fmt()}/home`, cta: 'Open service docs' },
    { icon: '🎞️', title: 'Interactive visualizers', body: 'Step through how the engines actually work — Spark execution, Delta transactions, streaming windows, partitions, lineage, cost and more. Each is a conceptual simulation you control.', go: () => `#${fmt()}/visualizers`, cta: 'Open Visualizers' },
    { icon: '📐', title: 'Architecture Studio', body: 'Sketch data architectures on a free-form canvas: drag service blocks, connect them, start from a template, and save your designs.', go: () => `#${fmt()}/architecture-studio`, cta: 'Open Studio' },
    { icon: '🛠️', title: 'Practice incidents', body: 'Diagnose realistic production incidents: investigate evidence, form a hypothesis, pick a root cause and remediation, and get scored on evidence-led reasoning.', go: () => `#${fmt()}/incidents`, cta: 'Open Incident Simulator' },
    { icon: '📊', title: 'Track your mastery', body: 'The Mastery hub shows your progress across six skill dimensions — honestly: anything you haven’t exercised reads “Not assessed”, never an invented score. Everything is computed from your own activity on this device.', go: () => `#${fmt()}/mastery`, cta: 'Open Mastery' },
    { icon: '⌘', title: 'Search anything', body: 'Press Ctrl/Cmd+K (or “/”) anywhere to jump to any service, visualizer, incident, challenge or screen. That’s the fastest way around. Enjoy exploring!' },
  ];

  let overlay = null, i = 0;

  function ensureStyles() {
    if (document.getElementById('tour-styles')) return;
    const el = document.createElement('style'); el.id = 'tour-styles';
    el.textContent = `
.tour-ov { position:fixed; inset:0; z-index:9500; background:rgba(0,0,0,.6); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:20px; }
.tour-card { background:var(--bg-2,#131b2b); border:1px solid var(--border-default,#223047); border-radius:16px; width:460px; max-width:100%; box-shadow:var(--shadow-xl,0 16px 48px rgba(0,0,0,.7)); overflow:hidden; }
.tour-body { padding:26px 24px 18px; text-align:center; }
.tour-ic { font-size:40px; line-height:1; margin-bottom:12px; }
.tour-title { font-size:20px; font-weight:800; color:var(--text-primary,#e6edf7); margin:0 0 8px; letter-spacing:-.01em; }
.tour-text { font-size:14px; color:var(--text-secondary,#b3c0d6); line-height:1.65; margin:0; }
.tour-dots { display:flex; gap:6px; justify-content:center; margin:18px 0 0; }
.tour-dot { width:7px; height:7px; border-radius:50%; background:var(--border-default,#223047); }
.tour-dot.on { background:var(--brand,#58a6ff); }
.tour-foot { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:14px 20px; border-top:1px solid var(--border-default,#223047); }
.tour-btn { cursor:pointer; border:1px solid var(--border-default,#223047); background:var(--bg-1,#0e1420); color:var(--text-secondary,#b3c0d6); font:inherit; font-size:13px; font-weight:700; padding:8px 15px; border-radius:9px; }
.tour-btn:hover { border-color:var(--brand,#58a6ff); color:var(--text-primary,#e6edf7); }
.tour-btn--primary { background:var(--brand,#58a6ff); border-color:var(--brand,#58a6ff); color:#06171a; }
.tour-btn--primary:hover { filter:brightness(1.08); color:#06171a; }
.tour-right { display:flex; gap:8px; }
.tour-skip { background:none; border:none; color:var(--text-muted,#7e8da8); font:inherit; font-size:12px; cursor:pointer; }
.tour-skip:hover { color:var(--text-primary,#e6edf7); text-decoration:underline; }
`;
    document.head.appendChild(el);
  }

  function markSeen() { try { TV.ls.set(SEEN, '1'); } catch (e) {} }

  function render() {
    const s = STEPS[i];
    const last = i === STEPS.length - 1;
    overlay.innerHTML = `
      <div class="tour-card" role="dialog" aria-modal="true" aria-label="Product tour">
        <div class="tour-body">
          <div class="tour-ic" aria-hidden="true">${s.icon}</div>
          <h2 class="tour-title">${esc(s.title)}</h2>
          <p class="tour-text">${esc(s.body)}</p>
          <div class="tour-dots">${STEPS.map((_, k) => `<span class="tour-dot ${k === i ? 'on' : ''}"></span>`).join('')}</div>
        </div>
        <div class="tour-foot">
          <button class="tour-skip" data-tour="skip">Skip tour</button>
          <div class="tour-right">
            ${i > 0 ? '<button class="tour-btn" data-tour="prev">Back</button>' : ''}
            ${s.go ? `<button class="tour-btn" data-tour="go">${esc(s.cta || 'Go')}</button>` : ''}
            <button class="tour-btn tour-btn--primary" data-tour="next">${last ? 'Finish' : 'Next'}</button>
          </div>
        </div>
      </div>`;
    const on = (n, fn) => { const b = overlay.querySelector(`[data-tour="${n}"]`); if (b) b.addEventListener('click', fn); };
    on('skip', close);
    on('prev', () => { i = Math.max(0, i - 1); render(); });
    on('next', () => { if (last) close(); else { i++; render(); } });
    on('go', () => { const href = s.go(); close(); location.hash = href.replace(/^#/, ''); });
    overlay.querySelector('.tour-btn--primary').focus();
  }

  function open(startAt) {
    ensureStyles();
    markSeen();
    i = startAt || 0;
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'tour-ov';
      overlay.addEventListener('mousedown', e => { if (e.target === overlay) close(); });
      document.addEventListener('keydown', onKey);
      document.body.appendChild(overlay);
    }
    render();
  }

  function onKey(e) {
    if (!overlay) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') { if (i < STEPS.length - 1) { i++; render(); } }
    else if (e.key === 'ArrowLeft') { if (i > 0) { i--; render(); } }
  }

  function close() {
    markSeen();
    if (overlay) { overlay.remove(); overlay = null; document.removeEventListener('keydown', onKey); }
  }

  function maybeAutoStart() {
    let seen = null; try { seen = TV.ls.get(SEEN); } catch (e) { seen = '1'; }
    if (!seen) setTimeout(() => { if (!overlay) open(0); }, 900);
  }

  TV.Tour = { open, close, maybeAutoStart };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', maybeAutoStart);
  else maybeAutoStart();
})();
