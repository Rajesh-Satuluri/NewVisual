/* ============================================================
   DeltaKit — shared scaffold for Delta Lake animated modules.
   Provides the standard page (canvas + step sidebar), wires the
   AnimationEngine to the controls bar, and offers small SVG fx
   helpers so each module only supplies its diagram + steps.

   Layout contract mirrors the Iceberg animated modules: the page
   root is a flex column with height:100%; overflow:hidden, so the
   animation never scrolls — quizzes live in the body-level modal,
   never injected here.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  const NS = 'http://www.w3.org/2000/svg';

  function injectStyles() {
    if (document.getElementById('dk-styles')) return;
    const s = document.createElement('style');
    s.id = 'dk-styles';
    s.textContent = `
.dk-page { display:flex; flex-direction:column; height:100%; overflow:hidden; }
.dk-outer { display:flex; flex:1; overflow:hidden; min-height:0; }
.dk-canvas { flex:1; display:flex; align-items:center; justify-content:center; padding:16px; background:var(--bg-1); overflow:hidden; position:relative; }
.dk-canvas svg { max-width:100%; max-height:100%; }
.dk-sidebar { width:360px; border-left:1px solid var(--border-default); background:var(--bg-2); display:flex; flex-direction:column; overflow:hidden; flex-shrink:0; }
.dk-sb-head { padding:14px 18px; border-bottom:1px solid var(--border-default); flex-shrink:0; }
.dk-sb-title { font-size:var(--text-sm); font-weight:600; color:var(--text-primary); margin-bottom:4px; }
.dk-sb-desc { font-size:var(--text-xs); color:var(--text-secondary); line-height:1.55; min-height:56px; }
.dk-steps { flex:0 0 auto; overflow-y:auto; padding:6px 0; border-bottom:1px solid var(--border-default); max-height:230px; }
.dk-step { display:flex; align-items:flex-start; gap:10px; padding:7px 16px; cursor:pointer; border-left:3px solid transparent; transition:background .12s; }
.dk-step:hover { background:var(--bg-3); }
.dk-step.active { background:var(--brand-glow); border-left-color:var(--brand); }
.dk-step.done { opacity:.55; }
.dk-badge { width:20px; height:20px; border-radius:50%; background:var(--bg-4); color:var(--text-muted); font-size:10px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:1px; }
.dk-step.active .dk-badge { background:var(--brand); color:#fff; }
.dk-step.done .dk-badge { background:var(--green); color:#fff; }
.dk-step-txt { font-size:12px; color:var(--text-secondary); line-height:1.4; }
.dk-step.active .dk-step-txt { color:var(--text-primary); font-weight:500; }
.dk-panel { flex:1; overflow-y:auto; padding:12px; }
.dk-micro { font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; margin:0 0 8px; font-weight:700; }
.dk-sql { background:var(--bg-3); border:1px solid var(--border-default); border-radius:8px; padding:10px 12px; margin-bottom:12px; font-family:var(--font-mono); font-size:11px; color:var(--text-secondary); line-height:1.6; white-space:pre; overflow-x:auto; }
.dk-kw { color:var(--brand); font-weight:600; } .dk-str { color:var(--orange); } .dk-com { color:var(--text-muted); } .dk-fn { color:var(--purple); }
.dk-stats { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.dk-stat { background:var(--bg-3); border:1px solid var(--border-default); border-radius:8px; padding:10px 12px; }
.dk-stat-l { font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.04em; margin-bottom:4px; }
.dk-stat-v { font-size:15px; font-weight:700; color:var(--text-primary); font-family:var(--font-mono); }
.dk-stat-v.green{color:var(--green);} .dk-stat-v.blue{color:var(--blue);} .dk-stat-v.orange{color:var(--orange);} .dk-stat-v.red{color:var(--red);} .dk-stat-v.purple{color:var(--purple);}
.dk-stat-s { font-size:10px; color:var(--text-muted); margin-top:2px; }
`;
    document.head.appendChild(s);
  }

  /** Build an <svg> from a viewBox and inner markup string. */
  function svgEl(w, h, inner) {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.maxWidth = w + 'px';
    svg.style.maxHeight = h + 'px';
    svg.innerHTML = inner;
    return svg;
  }

  const GLOW = {
    brand: 'drop-shadow(0 0 8px rgba(255,90,60,.7))',
    green: 'drop-shadow(0 0 8px rgba(86,211,100,.7))',
    blue: 'drop-shadow(0 0 8px rgba(88,166,255,.7))',
    purple: 'drop-shadow(0 0 8px rgba(163,113,247,.7))',
    orange: 'drop-shadow(0 0 8px rgba(240,136,62,.7))',
    amber: 'drop-shadow(0 0 8px rgba(255,176,32,.75))',
    red: 'drop-shadow(0 0 8px rgba(248,81,73,.7))',
  };

  /** fx helpers bound to a specific svg. */
  function makeFx(svg) {
    const g = (id) => svg.getElementById(id);
    return {
      g,
      show(id, glow) { const el = g(id); if (el) { el.setAttribute('opacity', '1'); if (glow) el.style.filter = GLOW[glow] || ''; } },
      hide(id) { const el = g(id); if (el) { el.setAttribute('opacity', '0'); el.style.filter = ''; } },
      glow(id, c) { const el = g(id); if (el) el.style.filter = GLOW[c] || ''; },
      unglow(id) { const el = g(id); if (el) el.style.filter = ''; },
      text(id, str) { const el = g(id); if (el) el.textContent = str; },
      attr(id, k, v) { const el = g(id); if (el) el.setAttribute(k, v); },
    };
  }

  /**
   * Build a Delta animated module.
   * cfg: { id, title, group, intro, w, h, buildSVG(), buildSteps(svg, fx) -> [AE steps],
   *        stepData: [{label,desc}], panelHTML?: string }
   */
  function animatedModule(cfg) {
    const mod = {
      id: cfg.id, title: cfg.title, group: cfg.group, format: 'delta', _engine: null,
      render(container) {
        container.innerHTML = '';
        injectStyles();
        const page = document.createElement('div');
        page.className = 'dk-page page-enter';
        page.innerHTML = `
          <div class="dk-outer">
            <div class="dk-canvas" data-dk-canvas></div>
            <div class="dk-sidebar">
              <div class="dk-sb-head">
                <div class="dk-sb-title" data-dk-title>Press Play to begin</div>
                <div class="dk-sb-desc" data-dk-desc>${cfg.intro || ''}</div>
              </div>
              <div class="dk-steps" data-dk-steps></div>
              <div class="dk-panel" data-dk-panel>${cfg.panelHTML || ''}</div>
            </div>
          </div>`;
        container.appendChild(page);

        const svg = cfg.buildSVG();
        page.querySelector('[data-dk-canvas]').appendChild(svg);

        const fx = makeFx(svg);
        const steps = cfg.buildSteps(svg, fx);
        const data = cfg.stepData || [];
        // Ensure the controls-bar step label is populated even when a module's
        // engine steps use empty labels (sidebar narration lives in stepData).
        data.forEach((d, i) => { if (steps[i] && !steps[i].label) steps[i].label = d.label; });
        const engine = new TV.AnimationEngine({ steps });
        this._engine = engine;

        // Step list
        const list = page.querySelector('[data-dk-steps]');
        list.innerHTML = data.map((s, i) =>
          `<div class="dk-step" data-step="${i}"><div class="dk-badge">${i + 1}</div><div class="dk-step-txt">${s.label}</div></div>`).join('');
        const titleEl = page.querySelector('[data-dk-title]');
        const descEl = page.querySelector('[data-dk-desc]');

        engine.on('stepchange', (idx) => {
          list.querySelectorAll('.dk-step').forEach((el, i) => {
            el.classList.toggle('active', i === idx);
            el.classList.toggle('done', i < idx);
          });
          const step = idx >= 0 ? data[idx] : null;
          if (titleEl) titleEl.textContent = step ? step.label : 'Press Play to begin';
          if (descEl) descEl.textContent = step ? step.desc : (cfg.intro || '');
          const active = list.querySelector('.dk-step.active');
          if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
        list.addEventListener('click', (e) => {
          const it = e.target.closest('[data-step]');
          if (it) engine.goto(parseInt(it.dataset.step, 10));
        });

        TV.AnimationControls.register(engine);
      },
      destroy() {
        if (this._engine) { this._engine.destroy(); this._engine = null; }
        TV.AnimationControls.hide();
      },
    };
    TV.registerModule('delta', mod);
    return mod;
  }

  /* ── Declarative write-operation module ───────────────────────
     Shared "table state (data files) + _delta_log commit" scene for
     CREATE/INSERT/UPDATE/DELETE/MERGE/replaceWhere. Each op supplies
     initial files, new files, an actions list, and a step script. */
  function esc(s) { return String(s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m])); }

  function writeOpModule(cfg) {
    const W = 760, H = 440;
    const initial = cfg.initial || [];
    const news = cfg.newFiles || [];
    const priors = cfg.priorCommits || ['…0045.json  WRITE', '…0046.json  MERGE'];

    function tile(id, slot, f, opacity) {
      const col = slot % 2, row = Math.floor(slot / 2);
      const x = 44 + col * 152, y = 88 + row * 54;
      return `
        <g id="${id}" opacity="${opacity}">
          <rect x="${x}" y="${y}" width="140" height="44" rx="6" fill="#0a1f10" stroke="#56d364" stroke-width="1.2"/>
          <text x="${x + 12}" y="${y + 19}" font-size="12">🗄</text>
          <text x="${x + 30}" y="${y + 18}" font-family="ui-monospace" font-size="8.5" fill="#e6edf3">${esc(f.label)}</text>
          <text x="${x + 30}" y="${y + 31}" font-family="ui-monospace" font-size="7.5" fill="rgba(139,148,158,.6)">${esc(f.sub || '')}</text>
        </g>`;
    }
    function overlays(i, slot) {
      const col = slot % 2, row = Math.floor(slot / 2);
      const x = 44 + col * 152, y = 88 + row * 54;
      return `
        <g id="wo-x-${i}" opacity="0">
          <rect x="${x}" y="${y}" width="140" height="44" rx="6" fill="rgba(248,81,73,.16)" stroke="#f85149" stroke-width="1.3"/>
          <line x1="${x + 6}" y1="${y + 6}" x2="${x + 134}" y2="${y + 38}" stroke="#f85149" stroke-width="1.4"/>
          <text x="${x + 130}" y="${y + 13}" text-anchor="end" font-family="system-ui" font-size="7.5" font-weight="700" fill="#f85149">remove</text>
        </g>
        <g id="wo-dv-${i}" opacity="0">
          <rect x="${x + 104}" y="${y + 26}" width="30" height="13" rx="3" fill="rgba(255,176,32,.18)" stroke="#ffb020" stroke-width="1"/>
          <text x="${x + 119}" y="${y + 35.5}" text-anchor="middle" font-family="system-ui" font-size="7" font-weight="700" fill="#ffb020">DV</text>
        </g>`;
    }

    function buildSVG() {
      let tiles = '', ov = '';
      initial.forEach((f, i) => { tiles += tile('wo-f-' + i, i, f, '1'); ov += overlays(i, i); });
      news.forEach((f, k) => { tiles += tile('wo-n-' + k, initial.length + k, f, '0'); });
      const actionLines = (cfg.actions || []).map((a, i) =>
        `<text x="416" y="${232 + i * 17}" font-family="ui-monospace" font-size="8.5" fill="${a.c || '#8b949e'}">${esc(a.t)}</text>`).join('');
      return svgEl(W, H, `
<rect width="${W}" height="${H}" fill="#090d14"/>
<text x="16" y="18" font-family="system-ui" font-size="9.5" fill="rgba(139,148,158,.4)" font-weight="600" letter-spacing="1">${esc(cfg.caption || 'ShopKart Delta Lake — write operation')}</text>

<!-- Table state -->
<rect x="24" y="40" width="332" height="372" rx="10" fill="#0c141f" stroke="#223047" stroke-width="1.2"/>
<text x="40" y="64" font-family="system-ui" font-size="11" font-weight="700" fill="#e6edf3">Table: ${esc(cfg.table || 'orders')}</text>
<text x="40" y="78" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,.55)">immutable parquet data files</text>
${tiles}
${ov}

<!-- _delta_log -->
<rect x="384" y="40" width="352" height="372" rx="10" fill="#12101f" stroke="#a371f7" stroke-width="1.3"/>
<text x="400" y="64" font-family="ui-monospace" font-size="10.5" font-weight="700" fill="#c9b6f7">_delta_log/</text>
<text id="wo-ver" x="720" y="64" text-anchor="end" font-family="ui-monospace" font-size="10" font-weight="700" fill="#8b949e">${cfg.initialVerText || ('v' + cfg.version)}</text>
${priors.map((p, i) => `<text x="400" y="${88 + i * 15}" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,.45)">${esc(p)}</text>`).join('')}

<!-- new commit card -->
<g id="wo-commit" opacity="0">
  <rect x="400" y="150" width="320" height="240" rx="8" fill="#0d1117" stroke="#a371f7" stroke-width="1.5"/>
  <text x="416" y="176" font-family="ui-monospace" font-size="9.5" font-weight="700" fill="#c9b6f7">${String(cfg.version + 1).padStart(4, '0')}…${(cfg.version + 1)}.json</text>
  <text x="416" y="196" font-family="system-ui" font-size="8.5" fill="rgba(139,148,158,.6)">operation: ${esc(cfg.op)}</text>
  <line x1="416" y1="206" x2="704" y2="206" stroke="#223047" stroke-width="1"/>
  ${actionLines}
</g>

<!-- committed check -->
<g id="wo-done" opacity="0">
  <circle cx="708" cy="176" r="12" fill="#0a1f10" stroke="#56d364" stroke-width="1.5"/>
  <path d="M702 176 l4 4 l8 -9" fill="none" stroke="#56d364" stroke-width="2"/>
</g>

<!-- SQL echo highlight -->
<rect id="wo-sql" x="384" y="40" width="352" height="372" rx="10" fill="none" stroke="#ff5a3c" stroke-width="2" opacity="0"/>
`);
    }

    function buildSteps(svg, fx) {
      const AE = TV.AnimationEngine;
      return (cfg.steps || []).map(st => AE.fnStep(st.label, '', () => {
        if (st.sql) fx.show('wo-sql', 'brand');
        (st.show || []).forEach(k => fx.show('wo-n-' + k, 'green'));
        (st.remove || []).forEach(i => fx.show('wo-x-' + i, 'red'));
        (st.dv || []).forEach(i => fx.show('wo-dv-' + i, 'amber'));
        if (st.commit) fx.show('wo-commit', 'purple');
        if (st.done) { fx.show('wo-done', 'green'); fx.text('wo-ver', cfg.doneVerText || ('v' + (cfg.version + 1))); fx.attr('wo-ver', 'fill', '#56d364'); }
      }, () => {
        if (st.sql) fx.hide('wo-sql');
        (st.show || []).forEach(k => fx.hide('wo-n-' + k));
        (st.remove || []).forEach(i => fx.hide('wo-x-' + i));
        (st.dv || []).forEach(i => fx.hide('wo-dv-' + i));
        if (st.commit) fx.hide('wo-commit');
        if (st.done) { fx.hide('wo-done'); fx.text('wo-ver', cfg.initialVerText || ('v' + cfg.version)); fx.attr('wo-ver', 'fill', '#8b949e'); }
      }, st.duration || 2500));
    }

    return animatedModule({
      id: cfg.id, title: cfg.title, group: cfg.group, intro: cfg.intro,
      buildSVG, buildSteps, stepData: cfg.steps.map(s => ({ label: s.label, desc: s.desc })),
      panelHTML: cfg.panelHTML,
    });
  }

  TV.DeltaKit = { injectStyles, svgEl, makeFx, animatedModule, writeOpModule, esc, NS };
})();

