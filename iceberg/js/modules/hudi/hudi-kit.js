/* ============================================================
   HudiKit — shared scaffold for Apache Hudi animated modules.
   Mirrors DeltaKit: standard animated page (canvas + step sidebar
   + controls bar), small SVG fx helpers, and a declarative
   writeOpModule whose scene is Hudi-shaped: a FILE GROUP (base
   Parquet + Avro log files) on the left and the .hoodie TIMELINE
   (ordered instants) on the right.

   Layout contract mirrors the other formats: the page root is a
   flex column with height:100%; overflow:hidden, so the animation
   never scrolls — quizzes live in the body-level modal only.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  const NS = 'http://www.w3.org/2000/svg';

  function injectStyles() {
    if (document.getElementById('hk-styles')) return;
    const s = document.createElement('style');
    s.id = 'hk-styles';
    s.textContent = `
.hk-page { display:flex; flex-direction:column; height:100%; overflow:hidden; }
.hk-outer { display:flex; flex:1; overflow:hidden; min-height:0; }
.hk-canvas { flex:1; display:flex; align-items:center; justify-content:center; padding:16px; background:var(--bg-1); overflow:hidden; position:relative; }
.hk-canvas svg { max-width:100%; max-height:100%; }
.hk-sidebar { width:360px; border-left:1px solid var(--border-default); background:var(--bg-2); display:flex; flex-direction:column; overflow:hidden; flex-shrink:0; }
.hk-sb-head { padding:14px 18px; border-bottom:1px solid var(--border-default); flex-shrink:0; }
.hk-sb-title { font-size:var(--text-sm); font-weight:600; color:var(--text-primary); margin-bottom:4px; }
.hk-sb-desc { font-size:var(--text-xs); color:var(--text-secondary); line-height:1.55; min-height:56px; }
.hk-steps { flex:0 0 auto; overflow-y:auto; padding:6px 0; border-bottom:1px solid var(--border-default); max-height:230px; }
.hk-step { display:flex; align-items:flex-start; gap:10px; padding:7px 16px; cursor:pointer; border-left:3px solid transparent; transition:background .12s; }
.hk-step:hover { background:var(--bg-3); }
.hk-step.active { background:var(--brand-glow); border-left-color:var(--brand); }
.hk-step.done { opacity:.55; }
.hk-badge { width:20px; height:20px; border-radius:50%; background:var(--bg-4); color:var(--text-muted); font-size:10px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:1px; }
.hk-step.active .hk-badge { background:var(--brand); color:#04211d; }
.hk-step.done .hk-badge { background:var(--green); color:#fff; }
.hk-step-txt { font-size:12px; color:var(--text-secondary); line-height:1.4; }
.hk-step.active .hk-step-txt { color:var(--text-primary); font-weight:500; }
.hk-panel { flex:1; overflow-y:auto; padding:12px; }
.hk-micro { font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; margin:0 0 8px; font-weight:700; }
.hk-sql { background:var(--bg-3); border:1px solid var(--border-default); border-radius:8px; padding:10px 12px; margin-bottom:12px; font-family:var(--font-mono); font-size:11px; color:var(--text-secondary); line-height:1.6; white-space:pre; overflow-x:auto; }
.hk-kw { color:var(--brand); font-weight:600; } .hk-str { color:var(--orange); } .hk-com { color:var(--text-muted); } .hk-fn { color:var(--purple); }
.hk-stats { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.hk-stat { background:var(--bg-3); border:1px solid var(--border-default); border-radius:8px; padding:10px 12px; }
.hk-stat-l { font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.04em; margin-bottom:4px; }
.hk-stat-v { font-size:15px; font-weight:700; color:var(--text-primary); font-family:var(--font-mono); }
.hk-stat-v.green{color:var(--green);} .hk-stat-v.teal{color:#2dd4bf;} .hk-stat-v.orange{color:var(--orange);} .hk-stat-v.red{color:var(--red);} .hk-stat-v.purple{color:var(--purple);}
.hk-stat-s { font-size:10px; color:var(--text-muted); margin-top:2px; }
`;
    document.head.appendChild(s);
  }

  function svgEl(w, h, inner) {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%');
    svg.style.maxWidth = w + 'px'; svg.style.maxHeight = h + 'px';
    svg.innerHTML = inner;
    return svg;
  }

  const GLOW = {
    brand: 'drop-shadow(0 0 8px rgba(20,184,166,.75))',
    teal: 'drop-shadow(0 0 8px rgba(45,212,191,.75))',
    green: 'drop-shadow(0 0 8px rgba(86,211,100,.7))',
    emerald: 'drop-shadow(0 0 8px rgba(52,211,153,.75))',
    orange: 'drop-shadow(0 0 8px rgba(240,136,62,.7))',
    red: 'drop-shadow(0 0 8px rgba(248,81,73,.7))',
  };

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

  function animatedModule(cfg) {
    const mod = {
      id: cfg.id, title: cfg.title, group: cfg.group, format: 'hudi', _engine: null,
      render(container) {
        container.innerHTML = '';
        injectStyles();
        const page = document.createElement('div');
        page.className = 'hk-page page-enter';
        page.innerHTML = `
          <div class="hk-outer">
            <div class="hk-canvas" data-hk-canvas></div>
            <div class="hk-sidebar">
              <div class="hk-sb-head">
                <div class="hk-sb-title" data-hk-title>Press Play to begin</div>
                <div class="hk-sb-desc" data-hk-desc>${cfg.intro || ''}</div>
              </div>
              <div class="hk-steps" data-hk-steps></div>
              <div class="hk-panel" data-hk-panel>${cfg.panelHTML || ''}</div>
            </div>
          </div>`;
        container.appendChild(page);

        const svg = cfg.buildSVG();
        page.querySelector('[data-hk-canvas]').appendChild(svg);

        const fx = makeFx(svg);
        const steps = cfg.buildSteps(svg, fx);
        const data = cfg.stepData || [];
        data.forEach((d, i) => { if (steps[i] && !steps[i].label) steps[i].label = d.label; });
        const engine = new TV.AnimationEngine({ steps });
        this._engine = engine;

        const list = page.querySelector('[data-hk-steps]');
        list.innerHTML = data.map((s, i) =>
          `<div class="hk-step" data-step="${i}"><div class="hk-badge">${i + 1}</div><div class="hk-step-txt">${s.label}</div></div>`).join('');
        const titleEl = page.querySelector('[data-hk-title]');
        const descEl = page.querySelector('[data-hk-desc]');

        engine.on('stepchange', (idx) => {
          list.querySelectorAll('.hk-step').forEach((el, i) => {
            el.classList.toggle('active', i === idx);
            el.classList.toggle('done', i < idx);
          });
          const step = idx >= 0 ? data[idx] : null;
          if (titleEl) titleEl.textContent = step ? step.label : 'Press Play to begin';
          if (descEl) descEl.textContent = step ? step.desc : (cfg.intro || '');
          const active = list.querySelector('.hk-step.active');
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
    TV.registerModule('hudi', mod);
    return mod;
  }

  /* ── Declarative write-operation module ───────────────────────
     Scene: FILE GROUP (base parquet + avro log files) on the left,
     .hoodie TIMELINE (instants) on the right. Each op supplies
     initial files, new files (base or log), timeline actions, and a
     step script. Mirrors DeltaKit.writeOpModule's step vocabulary:
       show:[i]   → reveal new file i (green base / teal log)
       remove:[i] → strike an initial base file (CoW rewrite)
       log:[i]    → tag new file i as a log file
       commit     → reveal the new instant card
       done       → flip the timeline head to the new instant time */
  function esc(s) { return String(s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m])); }

  function writeOpModule(cfg) {
    const W = 760, H = 440;
    const initial = cfg.initial || [];
    const news = cfg.newFiles || [];
    const priors = cfg.priorInstants || ['t1  commit        completed', 't2  deltacommit   completed'];

    function tile(id, slot, f, opacity) {
      const col = slot % 2, row = Math.floor(slot / 2);
      const x = 44 + col * 152, y = 92 + row * 52;
      const isLog = f.kind === 'log';
      const fill = isLog ? '#08201d' : '#0a1f10';
      const stroke = isLog ? '#2dd4bf' : '#56d364';
      const icon = isLog ? '🧾' : '🗄';
      return `
        <g id="${id}" opacity="${opacity}">
          <rect x="${x}" y="${y}" width="140" height="44" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="1.2"/>
          <text x="${x + 12}" y="${y + 19}" font-size="12">${icon}</text>
          <text x="${x + 30}" y="${y + 18}" font-family="ui-monospace" font-size="8.5" fill="#e6edf3">${esc(f.label)}</text>
          <text x="${x + 30}" y="${y + 31}" font-family="ui-monospace" font-size="7.5" fill="rgba(139,148,158,.6)">${esc(f.sub || '')}</text>
        </g>`;
    }
    function overlays(i, slot) {
      const col = slot % 2, row = Math.floor(slot / 2);
      const x = 44 + col * 152, y = 92 + row * 52;
      return `
        <g id="wo-x-${i}" opacity="0">
          <rect x="${x}" y="${y}" width="140" height="44" rx="6" fill="rgba(248,81,73,.16)" stroke="#f85149" stroke-width="1.3"/>
          <line x1="${x + 6}" y1="${y + 6}" x2="${x + 134}" y2="${y + 38}" stroke="#f85149" stroke-width="1.4"/>
          <text x="${x + 130}" y="${y + 13}" text-anchor="end" font-family="system-ui" font-size="7.5" font-weight="700" fill="#f85149">rewritten</text>
        </g>`;
    }

    function buildSVG() {
      let tiles = '', ov = '';
      initial.forEach((f, i) => { tiles += tile('wo-f-' + i, i, f, '1'); ov += overlays(i, i); });
      news.forEach((f, k) => { tiles += tile('wo-n-' + k, initial.length + k, f, '0'); });
      const actionLines = (cfg.actions || []).map((a, i) =>
        `<text x="416" y="${236 + i * 17}" font-family="ui-monospace" font-size="8.5" fill="${a.c || '#8b949e'}">${esc(a.t)}</text>`).join('');
      return svgEl(W, H, `
<rect width="${W}" height="${H}" fill="#08110f"/>
<text x="16" y="18" font-family="system-ui" font-size="9.5" fill="rgba(139,148,158,.4)" font-weight="600" letter-spacing="1">${esc(cfg.caption || 'ShopKart Apache Hudi — write operation')}</text>

<!-- File group -->
<rect x="24" y="40" width="332" height="372" rx="10" fill="#0c1614" stroke="#22403a" stroke-width="1.2"/>
<text x="40" y="62" font-family="system-ui" font-size="11" font-weight="700" fill="#e6edf3">File group: ${esc(cfg.fileGroup || 'fg-0001')}  ·  ${esc(cfg.tableType || 'MoR')}</text>
<text x="40" y="76" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,.55)">base parquet + avro log files (one file slice)</text>
${tiles}
${ov}

<!-- Timeline -->
<rect x="384" y="40" width="352" height="372" rx="10" fill="#0d1a17" stroke="#14b8a6" stroke-width="1.3"/>
<text x="400" y="62" font-family="ui-monospace" font-size="10.5" font-weight="700" fill="#7ff0df">.hoodie/  timeline</text>
<text id="wo-ver" x="720" y="62" text-anchor="end" font-family="ui-monospace" font-size="10" font-weight="700" fill="#8b949e">${cfg.initialVerText || 'head: t2'}</text>
<text x="400" y="82" font-family="ui-monospace" font-size="7.5" fill="rgba(139,148,158,.5)">instant   action        state</text>
${priors.map((p, i) => `<text x="400" y="${100 + i * 15}" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,.5)">${esc(p)}</text>`).join('')}

<!-- new instant card -->
<g id="wo-commit" opacity="0">
  <rect x="400" y="150" width="320" height="250" rx="8" fill="#0d1117" stroke="#14b8a6" stroke-width="1.5"/>
  <text x="416" y="176" font-family="ui-monospace" font-size="9.5" font-weight="700" fill="#7ff0df">${esc(cfg.instant || 't3')}.${esc(cfg.action || 'deltacommit')}</text>
  <text x="416" y="196" font-family="system-ui" font-size="8.5" fill="rgba(139,148,158,.6)">operation: ${esc(cfg.op || 'upsert')}</text>
  <line x1="416" y1="206" x2="704" y2="206" stroke="#22403a" stroke-width="1"/>
  ${actionLines}
</g>

<!-- committed check -->
<g id="wo-done" opacity="0">
  <circle cx="708" cy="176" r="12" fill="#0a1f10" stroke="#56d364" stroke-width="1.5"/>
  <path d="M702 176 l4 4 l8 -9" fill="none" stroke="#56d364" stroke-width="2"/>
</g>

<!-- op echo highlight -->
<rect id="wo-sql" x="384" y="40" width="352" height="372" rx="10" fill="none" stroke="#14b8a6" stroke-width="2" opacity="0"/>
`);
    }

    function buildSteps(svg, fx) {
      const AE = TV.AnimationEngine;
      return (cfg.steps || []).map(st => AE.fnStep(st.label, '', () => {
        if (st.sql) fx.show('wo-sql', 'brand');
        (st.show || []).forEach(k => fx.show('wo-n-' + k, st.log && st.log.includes(k) ? 'teal' : 'green'));
        (st.remove || []).forEach(i => fx.show('wo-x-' + i, 'red'));
        if (st.commit) fx.show('wo-commit', 'brand');
        if (st.done) { fx.show('wo-done', 'green'); fx.text('wo-ver', cfg.doneVerText || ('head: ' + (cfg.instant || 't3'))); fx.attr('wo-ver', 'fill', '#56d364'); }
      }, () => {
        if (st.sql) fx.hide('wo-sql');
        (st.show || []).forEach(k => fx.hide('wo-n-' + k));
        (st.remove || []).forEach(i => fx.hide('wo-x-' + i));
        if (st.commit) fx.hide('wo-commit');
        if (st.done) { fx.hide('wo-done'); fx.text('wo-ver', cfg.initialVerText || 'head: t2'); fx.attr('wo-ver', 'fill', '#8b949e'); }
      }, st.duration || 2500));
    }

    return animatedModule({
      id: cfg.id, title: cfg.title, group: cfg.group, intro: cfg.intro,
      buildSVG, buildSteps, stepData: cfg.steps.map(s => ({ label: s.label, desc: s.desc })),
      panelHTML: cfg.panelHTML,
    });
  }

  /* Shared styles for static reading modules (why-hudi, architecture, …). */
  function injectStaticStyles() {
    if (document.getElementById('hst-styles')) return;
    const s = document.createElement('style');
    s.id = 'hst-styles';
    s.textContent = `
.hst-page { height:100%; overflow-y:auto; padding:30px 32px 60px; }
.hst-wrap { max-width:920px; margin:0 auto; }
.hst-h1 { font-size:24px; font-weight:800; letter-spacing:-.02em; color:var(--text-primary); margin:0 0 8px; }
.hst-lead { font-size:14px; color:var(--text-secondary); line-height:1.7; margin:0 0 22px; max-width:800px; }
.hst-sec { font-size:11px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:var(--brand); margin:26px 0 12px; }
.hst-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:14px; }
.hst-card { background:var(--bg-2); border:1px solid var(--border-default); border-radius:var(--radius-lg); padding:16px 18px; }
.hst-card h3 { font-size:14px; font-weight:700; color:var(--text-primary); margin:0 0 6px; display:flex; align-items:center; gap:8px; }
.hst-card p { font-size:12.5px; color:var(--text-secondary); line-height:1.6; margin:0; }
.hst-card .hst-ic { width:26px; height:26px; border-radius:7px; background:var(--brand-glow); color:var(--brand); display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0; }
.hst-code { font-family:var(--font-mono); font-size:11.5px; line-height:1.7; color:var(--text-secondary); background:var(--code-bg); border:1px solid var(--border-default); border-radius:10px; padding:14px 16px; white-space:pre; overflow-x:auto; margin:0 0 16px; }
.hst-code .k { color:var(--brand); font-weight:600; } .hst-code .s { color:var(--orange); } .hst-code .c { color:var(--text-muted); font-style:italic; } .hst-code .fn { color:var(--purple); } .hst-code .t { color:#5ab0ff; }
.hst-note { padding:12px 14px; background:var(--bg-1); border-left:3px solid var(--brand); border-radius:0 8px 8px 0; font-size:12.5px; color:var(--text-secondary); line-height:1.6; margin:16px 0 0; }
.hst-note b { color:var(--text-primary); }
.hst-tablewrap { overflow-x:auto; border:1px solid var(--border-default); border-radius:var(--radius-lg); }
.hst-table { width:100%; border-collapse:collapse; font-size:12.5px; min-width:560px; }
.hst-table th { text-align:left; padding:10px 14px; font-size:10.5px; font-weight:800; text-transform:uppercase; letter-spacing:.04em; color:var(--text-muted); background:var(--bg-3); border-bottom:1px solid var(--border-default); }
.hst-table td { padding:10px 14px; border-bottom:1px solid var(--border-subtle); color:var(--text-secondary); vertical-align:top; line-height:1.5; }
.hst-table tr:last-child td { border-bottom:none; }
.hst-table td.k { font-weight:700; color:var(--text-primary); white-space:nowrap; }
`;
    document.head.appendChild(s);
  }

  TV.HudiKit = { injectStyles, injectStaticStyles, svgEl, makeFx, animatedModule, writeOpModule, esc, NS };
})();
