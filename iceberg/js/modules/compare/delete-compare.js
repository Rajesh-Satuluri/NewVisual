/* ============================================================
   Compare — Delete: Copy-on-Write vs Merge-on-Read (synced).
   A SINGLE AnimationEngine drives BOTH panes in lockstep:
   left = Iceberg copy-on-write (rewrite file), right = Delta
   merge-on-read (deletion vector). Honors the one-engine rule
   (Compare uses one engine for N panes) and the animation-layout
   contract (height:100%; overflow:hidden; no injected scroll).
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  const NS = 'http://www.w3.org/2000/svg';

  function injectStyles() {
    if (document.getElementById('cmpa-styles')) return;
    const s = document.createElement('style');
    s.id = 'cmpa-styles';
    s.textContent = `
.cmpa-page { display:flex; flex-direction:column; height:100%; overflow:hidden; }
.cmpa-outer { display:flex; flex:1; overflow:hidden; min-height:0; }
.cmpa-canvas { flex:1; display:flex; align-items:center; justify-content:center; padding:16px; background:var(--bg-1); overflow:hidden; }
.cmpa-canvas svg { max-width:100%; max-height:100%; }
.cmpa-side { width:340px; border-left:1px solid var(--border-default); background:var(--bg-2); display:flex; flex-direction:column; overflow:hidden; flex-shrink:0; }
.cmpa-head { padding:14px 18px; border-bottom:1px solid var(--border-default); flex-shrink:0; }
.cmpa-title { font-size:var(--text-sm); font-weight:700; color:var(--text-primary); margin-bottom:4px; }
.cmpa-desc { font-size:var(--text-xs); color:var(--text-secondary); line-height:1.55; min-height:60px; }
.cmpa-steps { overflow-y:auto; padding:6px 0; border-bottom:1px solid var(--border-default); }
.cmpa-step { display:flex; align-items:flex-start; gap:10px; padding:8px 16px; cursor:pointer; border-left:3px solid transparent; }
.cmpa-step:hover { background:var(--bg-3); }
.cmpa-step.active { background:var(--brand-glow); border-left-color:var(--brand-2); }
.cmpa-step.done { opacity:.55; }
.cmpa-badge { width:20px; height:20px; border-radius:50%; background:var(--bg-4); color:var(--text-muted); font-size:10px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:1px; }
.cmpa-step.active .cmpa-badge { background:var(--brand-2); color:#06111f; }
.cmpa-step.done .cmpa-badge { background:var(--green); color:#fff; }
.cmpa-step-txt { font-size:12px; color:var(--text-secondary); line-height:1.4; }
.cmpa-step.active .cmpa-step-txt { color:var(--text-primary); font-weight:500; }
.cmpa-legend { padding:12px 16px; font-size:11px; color:var(--text-muted); line-height:1.7; }
.cmpa-legend b.ice { color:#5ab0ff; } .cmpa-legend b.delta { color:#ff8a5c; }
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
  function fx(svg) {
    const g = id => svg.getElementById(id);
    const GLOW = { blue: 'drop-shadow(0 0 7px rgba(74,174,255,.75))', amber: 'drop-shadow(0 0 7px rgba(255,176,32,.8))', green: 'drop-shadow(0 0 7px rgba(86,211,100,.75))', red: 'drop-shadow(0 0 7px rgba(248,81,73,.75))' };
    return {
      show(id, glow) { const e = g(id); if (e) { e.setAttribute('opacity', '1'); if (glow) e.style.filter = GLOW[glow] || ''; } },
      hide(id) { const e = g(id); if (e) { e.setAttribute('opacity', '0'); e.style.filter = ''; } },
      text(id, t) { const e = g(id); if (e) e.textContent = t; },
      attr(id, k, v) { const e = g(id); if (e) e.setAttribute(k, v); },
    };
  }

  // Row helper for a data file: 4 rows, row index 1 is the delete target.
  function rows(x, y, ghostThird) {
    const data = ['ord_5521 · BR', 'ord_4410 · BR', 'ord_3277 · US', 'ord_9910 · IN'];
    return data.map((d, i) => {
      const ry = y + 8 + i * 20;
      const del = i === 1;
      return `<g>
        <rect x="${x + 8}" y="${ry}" width="150" height="16" rx="3" fill="${del ? 'rgba(248,81,73,.10)' : 'rgba(255,255,255,.02)'}" stroke="${del ? 'rgba(248,81,73,.5)' : 'rgba(139,148,158,.25)'}" stroke-width="1"/>
        <text x="${x + 15}" y="${ry + 11.5}" font-family="ui-monospace" font-size="8.5" fill="${del ? '#f8a49f' : '#a9b2bd'}">${d}${del ? '  ← delete' : ''}</text>
      </g>`;
    }).join('');
  }

  const W = 880, H = 470;
  function buildSVG() {
    return svgEl(W, H, `
<rect width="${W}" height="${H}" fill="#090d14"/>
<text x="16" y="20" font-family="system-ui" font-size="10" fill="rgba(139,148,158,.45)" font-weight="600" letter-spacing="1">ShopKart — DELETE FROM orders WHERE order_id = 'ord_4410'</text>

<!-- divider -->
<line x1="440" y1="40" x2="440" y2="452" stroke="#1b2636" stroke-width="1.5" stroke-dasharray="4 4"/>

<!-- ── LEFT: Iceberg copy-on-write ── -->
<text x="30" y="52" font-family="system-ui" font-size="13" font-weight="800" fill="#5ab0ff">Apache Iceberg — Copy-on-Write</text>
<text x="30" y="68" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,.55)">rewrite the whole file; reads stay clean</text>

<!-- original file (ice) -->
<g id="ice-orig">
  <rect x="30" y="82" width="180" height="104" rx="8" fill="#0c141f" stroke="#4aaeff" stroke-width="1.3"/>
  <text x="40" y="98" font-family="ui-monospace" font-size="9" font-weight="700" fill="#9dc9f5">orders-t0.parquet</text>
  ${rows(30, 100)}
</g>
<!-- remove overlay (ice) -->
<g id="ice-remove" opacity="0">
  <rect x="30" y="82" width="180" height="104" rx="8" fill="rgba(248,81,73,.14)" stroke="#f85149" stroke-width="1.4"/>
  <line x1="36" y1="88" x2="204" y2="180" stroke="#f85149" stroke-width="1.5"/>
  <text x="200" y="98" text-anchor="end" font-family="system-ui" font-size="8" font-weight="700" fill="#f85149">remove</text>
</g>
<!-- new rewritten file (ice) -->
<g id="ice-new" opacity="0">
  <rect x="234" y="82" width="180" height="86" rx="8" fill="#0a1f10" stroke="#56d364" stroke-width="1.4"/>
  <text x="244" y="98" font-family="ui-monospace" font-size="9" font-weight="700" fill="#7ee787">orders-t1.parquet</text>
  <text x="244" y="112" font-family="ui-monospace" font-size="7.5" fill="rgba(139,148,158,.6)">3 rows (deleted row gone)</text>
  <text x="244" y="130" font-family="ui-monospace" font-size="8.5" fill="#a9b2bd">ord_5521 · BR</text>
  <text x="244" y="144" font-family="ui-monospace" font-size="8.5" fill="#a9b2bd">ord_3277 · US</text>
  <text x="244" y="158" font-family="ui-monospace" font-size="8.5" fill="#a9b2bd">ord_9910 · IN</text>
</g>
<!-- ice arrow -->
<g id="ice-arrow" opacity="0">
  <path d="M214 130 h16" stroke="#56d364" stroke-width="1.6" marker-end="url(#cmpa-ah)"/>
</g>
<!-- ice commit -->
<g id="ice-commit" opacity="0">
  <rect x="30" y="200" width="384" height="52" rx="8" fill="#0d1117" stroke="#4aaeff" stroke-width="1.2"/>
  <text x="42" y="220" font-family="ui-monospace" font-size="9" font-weight="700" fill="#9dc9f5">snapshot snap-1  (new metadata.json)</text>
  <text x="42" y="236" font-family="ui-monospace" font-size="8" fill="#8b949e">remove: orders-t0   ·   add: orders-t1</text>
  <text x="42" y="248" font-family="ui-monospace" font-size="8" fill="#8b949e">write cost: full-file rewrite  ·  read cost: none</text>
</g>
<!-- ice read -->
<g id="ice-read" opacity="0">
  <rect x="30" y="266" width="384" height="40" rx="8" fill="rgba(74,174,255,.07)" stroke="#4aaeff" stroke-width="1"/>
  <text x="42" y="284" font-family="system-ui" font-size="9.5" font-weight="700" fill="#5ab0ff">Reader: opens orders-t1 directly — 3 rows.</text>
  <text x="42" y="298" font-family="ui-monospace" font-size="8" fill="#8b949e">no merge step; clean scan</text>
</g>

<!-- ── RIGHT: Delta merge-on-read ── -->
<text x="466" y="52" font-family="system-ui" font-size="13" font-weight="800" fill="#ff8a5c">Delta Lake — Merge-on-Read (Deletion Vector)</text>
<text x="466" y="68" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,.55)">flag the row; rewrite later on OPTIMIZE</text>

<!-- file (delta) stays -->
<g id="d-orig">
  <rect x="466" y="82" width="180" height="104" rx="8" fill="#0c141f" stroke="#ff5a3c" stroke-width="1.3"/>
  <text x="476" y="98" font-family="ui-monospace" font-size="9" font-weight="700" fill="#f5b79d">orders-t0.parquet</text>
  ${rows(466, 100)}
</g>
<!-- deletion vector (delta) -->
<g id="d-dv" opacity="0">
  <rect x="662" y="118" width="150" height="52" rx="7" fill="#1a1408" stroke="#ffb020" stroke-width="1.3"/>
  <text x="672" y="134" font-family="ui-monospace" font-size="8.5" font-weight="700" fill="#ffcf6b">deletion vector</text>
  <text x="672" y="148" font-family="ui-monospace" font-size="7.5" fill="rgba(255,207,107,.75)">orders-t0 → bitmap</text>
  <text x="672" y="161" font-family="ui-monospace" font-size="7.5" fill="rgba(255,207,107,.75)">row 1 = deleted</text>
</g>
<g id="d-dv-arrow" opacity="0"><path d="M648 144 h12" stroke="#ffb020" stroke-width="1.6" marker-end="url(#cmpa-ah-a)"/></g>
<!-- delta commit -->
<g id="d-commit" opacity="0">
  <rect x="466" y="200" width="346" height="52" rx="8" fill="#0d1117" stroke="#ff5a3c" stroke-width="1.2"/>
  <text x="478" y="220" font-family="ui-monospace" font-size="9" font-weight="700" fill="#f5b79d">…0043.json  (version 43)</text>
  <text x="478" y="236" font-family="ui-monospace" font-size="8" fill="#8b949e">add DV for orders-t0  ·  file untouched</text>
  <text x="478" y="248" font-family="ui-monospace" font-size="8" fill="#8b949e">write cost: tiny  ·  read cost: merge DV</text>
</g>
<!-- delta read -->
<g id="d-read" opacity="0">
  <rect x="466" y="266" width="346" height="40" rx="8" fill="rgba(255,90,60,.07)" stroke="#ff5a3c" stroke-width="1"/>
  <text x="478" y="284" font-family="system-ui" font-size="9.5" font-weight="700" fill="#ff8a5c">Reader: scans orders-t0, skips row 1 via DV.</text>
  <text x="478" y="298" font-family="ui-monospace" font-size="8" fill="#8b949e">merge step until OPTIMIZE materializes it</text>
</g>
<!-- delta optimize -->
<g id="d-opt" opacity="0">
  <rect x="466" y="318" width="346" height="40" rx="8" fill="rgba(86,211,100,.07)" stroke="#56d364" stroke-width="1"/>
  <text x="478" y="336" font-family="system-ui" font-size="9.5" font-weight="700" fill="#7ee787">OPTIMIZE: rewrites orders-t0 without row 1.</text>
  <text x="478" y="350" font-family="ui-monospace" font-size="8" fill="#8b949e">DV dropped; now equivalent to copy-on-write</text>
</g>

<!-- ice converge note -->
<g id="conv" opacity="0">
  <rect x="30" y="376" width="820" height="72" rx="10" fill="#0c141f" stroke="#8b94a3" stroke-width="1.2"/>
  <text x="46" y="398" font-family="system-ui" font-size="11" font-weight="800" fill="#c9d3e0">Same outcome, opposite cost profile</text>
  <text x="46" y="416" font-family="system-ui" font-size="9.5" fill="#a9b2bd">Copy-on-write pays at WRITE time (rewrite the file) so reads are clean.</text>
  <text x="46" y="432" font-family="system-ui" font-size="9.5" fill="#a9b2bd">Merge-on-read pays a little at READ time (apply the vector) until OPTIMIZE compacts — great for frequent point deletes.</text>
</g>

<defs>
  <marker id="cmpa-ah" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill="#56d364"/></marker>
  <marker id="cmpa-ah-a" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0 0l6 3-6 3z" fill="#ffb020"/></marker>
</defs>
`);
  }

  const STEPS = [
    {
      label: 'The same DELETE, both formats',
      desc: 'ShopKart deletes one order. Each table starts from the identical file: orders-t0.parquet with 4 rows; the second row is the delete target.',
      enter(f) {}, exit(f) {},
    },
    {
      label: 'Iceberg rewrites · Delta flags',
      desc: 'Iceberg (copy-on-write) writes a NEW file with the row gone. Delta (merge-on-read) leaves the file alone and writes a small deletion vector — a bitmap marking row 1.',
      enter(f) { f.show('ice-arrow', 'green'); f.show('ice-new', 'green'); f.show('ice-remove', 'red'); f.show('d-dv-arrow', 'amber'); f.show('d-dv', 'amber'); },
      exit(f) { f.hide('ice-arrow'); f.hide('ice-new'); f.hide('ice-remove'); f.hide('d-dv-arrow'); f.hide('d-dv'); },
    },
    {
      label: 'Both commit atomically',
      desc: 'Iceberg commits a new snapshot (remove orders-t0, add orders-t1). Delta commits version 43 referencing the deletion vector. Iceberg paid a full-file rewrite; Delta paid almost nothing.',
      enter(f) { f.show('ice-commit', 'blue'); f.show('d-commit', 'red'); },
      exit(f) { f.hide('ice-commit'); f.hide('d-commit'); },
    },
    {
      label: 'Read time diverges',
      desc: 'Iceberg reads the rewritten file directly — no merge. Delta scans orders-t0 and applies the deletion vector to skip row 1 — a small read-time merge that lasts until compaction.',
      enter(f) { f.show('ice-read', 'blue'); f.show('d-read', 'red'); },
      exit(f) { f.hide('ice-read'); f.hide('d-read'); },
    },
    {
      label: 'OPTIMIZE converges them',
      desc: 'Delta’s OPTIMIZE later rewrites orders-t0 without row 1 and drops the vector — now identical to Iceberg’s copy-on-write result. Same outcome, opposite cost profile: write-time vs read-time.',
      enter(f) { f.show('d-opt', 'green'); f.show('conv'); },
      exit(f) { f.hide('d-opt'); f.hide('conv'); },
    },
  ];

  function render(container) {
    injectStyles();
    container.className = '';
    const page = document.createElement('div');
    page.className = 'cmpa-page page-enter';
    page.innerHTML = `
      <div class="cmpa-outer">
        <div class="cmpa-canvas" data-canvas></div>
        <div class="cmpa-side">
          <div class="cmpa-head">
            <div class="cmpa-title" data-title>Press Play to begin</div>
            <div class="cmpa-desc" data-desc>One engine drives both panes. Watch how copy-on-write and merge-on-read handle the very same delete.</div>
          </div>
          <div class="cmpa-steps" data-steps></div>
          <div class="cmpa-legend">
            <b class="ice">Iceberg</b> rewrites the file at write time.<br>
            <b class="delta">Delta</b> flags rows with a deletion vector, then compacts on OPTIMIZE.
          </div>
        </div>
      </div>`;
    container.appendChild(page);

    const svg = buildSVG();
    page.querySelector('[data-canvas]').appendChild(svg);
    const f = fx(svg);
    const AE = TV.AnimationEngine;
    const steps = STEPS.map(st => AE.fnStep(st.label, st.desc, () => st.enter(f), () => st.exit(f), 2600));
    const engine = new AE({ steps });
    this._engine = engine;

    const list = page.querySelector('[data-steps]');
    list.innerHTML = STEPS.map((s, i) => `<div class="cmpa-step" data-step="${i}"><div class="cmpa-badge">${i + 1}</div><div class="cmpa-step-txt">${s.label}</div></div>`).join('');
    const titleEl = page.querySelector('[data-title]');
    const descEl = page.querySelector('[data-desc]');
    engine.on('stepchange', (idx) => {
      list.querySelectorAll('.cmpa-step').forEach((el, i) => { el.classList.toggle('active', i === idx); el.classList.toggle('done', i < idx); });
      const st = idx >= 0 ? STEPS[idx] : null;
      if (titleEl) titleEl.textContent = st ? st.label : 'Press Play to begin';
      if (descEl) descEl.textContent = st ? st.desc : 'One engine drives both panes. Watch how copy-on-write and merge-on-read handle the very same delete.';
      const active = list.querySelector('.cmpa-step.active');
      if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
    list.addEventListener('click', (e) => {
      const it = e.target.closest('[data-step]');
      if (it) engine.goto(parseInt(it.dataset.step, 10));
    });

    TV.AnimationControls.register(engine);
  }

  TV.registerModule('compare', {
    id: 'delete-compare', title: 'Delete: CoW vs MoR', group: 'animated', format: 'compare',
    _engine: null,
    render,
    destroy() { if (this._engine) { this._engine.destroy(); this._engine = null; } TV.AnimationControls.hide(); },
  });
})();
