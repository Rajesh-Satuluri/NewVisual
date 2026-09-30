/* ============================================================
   Write Tuning & Metrics Module
   Animates why you get tiny files even before compaction and how
   to shape files AT WRITE TIME: write.distribution-mode
   (none / hash / range), the fanout writer, and
   write.target-file-size-bytes. Then covers metrics modes
   (full / truncate / counts / none) and their pruning trade-off.
   ShopKart production context.
   ============================================================ */

(function () {
  'use strict';

  const IV = window.IcebergViz;

  /* ── Style injection ────────────────────────────────────── */
  function _injectStyles() {
    if (document.getElementById('wt-styles')) return;
    const s = document.createElement('style');
    s.id = 'wt-styles';
    s.textContent = `
.wt-page { display:flex; flex-direction:column; height:100%; overflow:hidden; }

.wt-outer { display:flex; flex:1; overflow:hidden; min-height:0; }

.wt-canvas {
  flex:1; display:flex; align-items:center; justify-content:center;
  padding:16px; background:var(--bg-1); overflow:hidden; position:relative;
}

.wt-sidebar {
  width:360px; border-left:1px solid var(--border-default);
  background:var(--bg-2); display:flex; flex-direction:column;
  overflow:hidden; flex-shrink:0;
}
.wt-sidebar-header { padding:14px 18px; border-bottom:1px solid var(--border-default); flex-shrink:0; }
.wt-sidebar-title { font-size:var(--text-sm); font-weight:600; color:var(--text-primary); margin-bottom:4px; }
.wt-sidebar-desc { font-size:var(--text-xs); color:var(--text-secondary); line-height:1.5; min-height:52px; }

.wt-steps-list {
  flex:0 0 auto; overflow-y:auto; padding:6px 0;
  border-bottom:1px solid var(--border-default); max-height:220px;
}
.wt-step-item {
  display:flex; align-items:flex-start; gap:10px; padding:7px 16px;
  cursor:pointer; transition:background .12s; border-left:3px solid transparent; margin-bottom:1px;
}
.wt-step-item:hover { background:var(--bg-3); }
.wt-step-item.active { background:rgba(74,174,255,0.07); border-left-color:var(--blue); }
.wt-step-item.done { opacity:0.6; }
.wt-step-badge {
  width:20px; height:20px; border-radius:50%; background:var(--bg-4);
  color:var(--text-muted); font-size:10px; font-weight:700;
  display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:1px;
  transition:background .12s, color .12s;
}
.wt-step-item.active .wt-step-badge { background:var(--blue); color:#fff; }
.wt-step-item.done .wt-step-badge { background:var(--green); color:#fff; }
.wt-step-text { font-size:12px; color:var(--text-secondary); line-height:1.4; }
.wt-step-item.active .wt-step-text { color:var(--text-primary); font-weight:500; }

.wt-info { flex:1; overflow-y:auto; padding:12px; }
.wt-info-label { font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; margin:0 0 8px; }
.wt-info-label + .wt-sql, .wt-cmp + .wt-info-label { margin-top:0; }

.wt-cmp { width:100%; border-collapse:collapse; margin-bottom:14px; }
.wt-cmp th, .wt-cmp td { text-align:left; padding:6px 8px; font-size:11px; border-bottom:1px solid var(--border-subtle); vertical-align:top; }
.wt-cmp th { color:var(--text-muted); font-weight:700; text-transform:uppercase; letter-spacing:.04em; font-size:9.5px; }
.wt-cmp td:first-child { font-family:var(--font-mono); font-size:10.5px; color:var(--blue); white-space:nowrap; }
.wt-cmp td:last-child { color:var(--text-secondary); }

.wt-sql {
  background:var(--bg-3); border:1px solid var(--border-default); border-radius:8px;
  padding:10px 12px; font-family:var(--font-mono); font-size:11px;
  color:var(--text-secondary); line-height:1.6; white-space:pre; overflow-x:auto; margin-bottom:12px;
}
.wt-k { color:var(--blue); font-weight:600; }
.wt-s { color:var(--orange); }
.wt-c { color:var(--text-muted); font-style:italic; }
.wt-note {
  font-size:11.5px; color:var(--text-secondary); background:rgba(74,174,255,.06);
  border-left:3px solid var(--blue); border-radius:0 6px 6px 0;
  padding:8px 11px; line-height:1.55;
}
.wt-note strong { color:var(--blue); }
`;
    document.head.appendChild(s);
  }

  /* ── Step descriptions (sidebar) ────────────────────────── */
  function _getStepDescs() {
    return [
      { label: 'The Write Job', desc: 'Four Spark tasks write into a table partitioned by 3 values (country = BR / US / IN). How files land depends on write.distribution-mode — the shape is decided at WRITE time, before any compaction.' },
      { label: 'distribution-mode = none', desc: 'No shuffle: every task writes to every partition it happens to hold rows for. 4 tasks × 3 partitions = up to 12 tiny files per commit. This is the small-file problem, created on write.' },
      { label: 'distribution-mode = hash', desc: 'Iceberg shuffles rows by partition key so each partition is written by few tasks. Same data → ~6 right-sized files. This is the default for partitioned tables in modern Iceberg.' },
      { label: 'distribution-mode = range', desc: 'Rows are range-partitioned on the sort order, so each file covers a narrow key range. Fewest, largest files AND tight per-file min/max — best pruning for sorted/clustered reads.' },
      { label: 'Fanout vs Sorted Writer', desc: 'The fanout writer keeps one open writer per partition, so unsorted input still lands in the right files (costs memory). The sorted writer needs sorted input but streams one partition at a time. fanout-enabled=true avoids a pre-sort.' },
      { label: 'Metrics Modes', desc: 'write.metadata.metrics governs how much per-column stat goes in manifests: full, truncate(N) (default 16), counts, or none. More stats = better file pruning but larger manifests — turn wide/blob columns down to counts/none.' },
      { label: 'Target File Size', desc: 'write.target-file-size-bytes (default 512 MB) sizes files as they are written. Combine a good distribution-mode with the target size and you avoid the small-file problem up front, instead of leaning on nightly compaction.' },
    ];
  }

  /* ── Build SVG ──────────────────────────────────────────── */
  function _buildSVG() {
    const W = 800, H = 470;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.maxWidth = W + 'px';
    svg.style.maxHeight = H + 'px';
    svg.id = 'wt-svg';

    // executors
    let execs = '';
    for (let i = 0; i < 4; i++) {
      execs += `<g>
        <rect x="24" y="${96 + i * 52}" width="120" height="42" rx="7" fill="#0d1f3c" stroke="#1f6feb" stroke-width="1.2"/>
        <text x="40" y="${114 + i * 52}" font-size="12" dominant-baseline="middle">⚡</text>
        <text x="58" y="${114 + i * 52}" font-family="system-ui" font-size="10" font-weight="600" fill="#e6edf3">task ${i}</text>
        <text x="58" y="${128 + i * 52}" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,0.6)">mixed rows</text>
      </g>`;
    }

    // partition bins
    const bins = [
      { id: 'BR', x: 300, color: '#f0883e' },
      { id: 'US', x: 452, color: '#58a6ff' },
      { id: 'IN', x: 604, color: '#a371f7' },
    ];
    let binBoxes = '';
    bins.forEach(b => {
      binBoxes += `<g>
        <rect x="${b.x}" y="96" width="140" height="206" rx="8" fill="#0d1117" stroke="#30363d" stroke-width="1.3"/>
        <text x="${b.x + 12}" y="116" font-family="system-ui" font-size="10" font-weight="700" fill="${b.color}">country = ${b.id}</text>
      </g>`;
    });

    // file-set helpers
    function fileTile(x, y, w, h, color, label) {
      return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${color}22" stroke="${color}" stroke-width="1"/>${label ? `<text x="${x + w / 2}" y="${y + h / 2 + 3}" text-anchor="middle" font-family="ui-monospace" font-size="7.5" fill="${color}">${label}</text>` : ''}</g>`;
    }
    // none: 4 tiny per bin
    let noneFiles = '';
    bins.forEach(b => {
      for (let i = 0; i < 4; i++) noneFiles += fileTile(b.x + 20, 132 + i * 22, 100, 16, '#f85149', '8 MB');
    });
    // hash: 2 medium per bin
    let hashFiles = '';
    bins.forEach(b => {
      for (let i = 0; i < 2; i++) hashFiles += fileTile(b.x + 20, 138 + i * 62, 100, 52, '#56d364', '64 MB');
    });
    // range: 1 large per bin, with sort ticks
    let rangeFiles = '';
    bins.forEach(b => {
      rangeFiles += fileTile(b.x + 20, 138, 100, 150, '#56d364', '');
      rangeFiles += `<text x="${b.x + 70}" y="205" text-anchor="middle" font-family="ui-monospace" font-size="8.5" fill="#56d364">256 MB</text>`;
      rangeFiles += `<text x="${b.x + 70}" y="222" text-anchor="middle" font-family="ui-monospace" font-size="7.5" fill="rgba(86,211,100,0.7)">sorted</text>`;
    });

    svg.innerHTML = `
<defs>
  <marker id="wt-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#484f58"/>
  </marker>
  <marker id="wt-arr-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#56d364"/>
  </marker>
</defs>

<rect width="${W}" height="${H}" fill="#090d14"/>
<text x="12" y="16" font-family="system-ui" font-size="9.5" fill="rgba(139,148,158,0.4)" font-weight="600" letter-spacing="1">ShopKart — shaping files at write time (distribution-mode + target size)</text>

${execs}
${binBoxes}

<!-- shuffle node (hash/range) -->
<g id="wt-shuffle" opacity="0">
  <rect x="176" y="170" width="96" height="58" rx="8" fill="#161b22" stroke="#56d364" stroke-width="1.3"/>
  <text x="224" y="192" text-anchor="middle" font-family="system-ui" font-size="9.5" font-weight="700" fill="#56d364">shuffle</text>
  <text id="wt-shuffle-sub" x="224" y="207" text-anchor="middle" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,0.8)">by partition</text>
  <text x="224" y="219" text-anchor="middle" font-family="ui-monospace" font-size="7.5" fill="rgba(139,148,158,0.55)">hash(country)</text>
</g>
<!-- "no shuffle" note -->
<g id="wt-noshuffle" opacity="0">
  <text x="224" y="330" text-anchor="middle" font-family="system-ui" font-size="9" font-weight="700" fill="#f85149">no shuffle</text>
  <text x="224" y="344" text-anchor="middle" font-family="system-ui" font-size="8" fill="rgba(139,148,158,0.7)">every task writes every partition</text>
</g>

<!-- file sets -->
<g id="wt-files-none" opacity="0">${noneFiles}</g>
<g id="wt-files-hash" opacity="0">${hashFiles}</g>
<g id="wt-files-range" opacity="0">${rangeFiles}</g>

<!-- mode label + count -->
<g id="wt-modelabel" opacity="0">
  <rect x="300" y="316" width="444" height="34" rx="6" fill="#0d1117" stroke="#30363d" stroke-width="1"/>
  <text id="wt-mode-txt" x="316" y="337" font-family="ui-monospace" font-size="10" font-weight="700" fill="#e6edf3">write.distribution-mode = none</text>
  <text id="wt-mode-count" x="728" y="337" text-anchor="end" font-family="system-ui" font-size="10" font-weight="700" fill="#f85149">12 tiny files / commit</text>
</g>

<!-- ═══ Metrics modes overlay (step 6) ═══ -->
<g id="wt-metrics" opacity="0">
  <rect x="176" y="90" width="600" height="212" rx="10" fill="#0d1117" stroke="#a371f7" stroke-width="1.6"/>
  <text x="196" y="114" font-family="system-ui" font-size="12" font-weight="700" fill="#a371f7">write.metadata.metrics — what per-column stats go in manifests</text>
  <text x="196"  y="142" font-family="ui-monospace" font-size="10" font-weight="700" fill="#56d364">full</text>
  <text x="300"  y="142" font-family="system-ui" font-size="9.5" fill="rgba(230,237,243,0.88)">min / max / null / value counts — best pruning, largest manifests</text>
  <text x="196"  y="166" font-family="ui-monospace" font-size="10" font-weight="700" fill="#58a6ff">truncate(16)</text>
  <text x="300"  y="166" font-family="system-ui" font-size="9.5" fill="rgba(230,237,243,0.88)">bounds truncated to 16 chars — the DEFAULT, balanced</text>
  <text x="196"  y="190" font-family="ui-monospace" font-size="10" font-weight="700" fill="#e3b341">counts</text>
  <text x="300"  y="190" font-family="system-ui" font-size="9.5" fill="rgba(230,237,243,0.88)">null / value counts only — no min/max → no range pruning</text>
  <text x="196"  y="214" font-family="ui-monospace" font-size="10" font-weight="700" fill="#f85149">none</text>
  <text x="300"  y="214" font-family="system-ui" font-size="9.5" fill="rgba(230,237,243,0.88)">nothing stored — smallest manifests, no pruning at all</text>
  <text x="196"  y="248" font-family="system-ui" font-size="9.5" fill="rgba(139,148,158,0.85)">Set per column: keep filter/join keys on full/truncate; turn big blob &amp;</text>
  <text x="196"  y="262" font-family="system-ui" font-size="9.5" fill="rgba(139,148,158,0.85)">free-text columns down to counts/none so manifests stay small &amp; fast.</text>
  <text x="196"  y="286" font-family="ui-monospace" font-size="8.5" fill="rgba(163,113,247,0.85)">'write.metadata.metrics.column.description' = 'none'</text>
</g>

<!-- ═══ Target size overlay (step 7) ═══ -->
<g id="wt-target" opacity="0">
  <rect x="176" y="110" width="600" height="180" rx="10" fill="#0a1f10" stroke="#56d364" stroke-width="1.6"/>
  <text x="196" y="136" font-family="system-ui" font-size="12" font-weight="700" fill="#56d364">write.target-file-size-bytes</text>
  <text x="196" y="162" font-family="ui-monospace" font-size="10" fill="rgba(230,237,243,0.9)">= 536870912  <tspan fill="rgba(139,148,158,0.7)">(512 MB default)</tspan></text>
  <text x="196" y="188" font-family="system-ui" font-size="10" fill="rgba(230,237,243,0.9)">Sizes each file as it is written — the writer rolls a new file</text>
  <text x="196" y="204" font-family="system-ui" font-size="10" fill="rgba(230,237,243,0.9)">once it hits the target.</text>
  <text x="196" y="232" font-family="system-ui" font-size="10" font-weight="700" fill="#56d364">The recipe:</text>
  <text x="196" y="250" font-family="system-ui" font-size="9.5" fill="rgba(230,237,243,0.88)">distribution-mode = hash/range  +  target-file-size  +  fanout</text>
  <text x="196" y="266" font-family="system-ui" font-size="9.5" fill="rgba(230,237,243,0.88)">→ right-sized files ON WRITE, so you don't depend on compaction.</text>
</g>
`;
    return svg;
  }

  /* ── Animation steps ────────────────────────────────────── */
  function _buildAnimationSteps(svg) {
    const AE = IV.AnimationEngine;
    function g(id) { return svg.getElementById(id); }
    function show(id, glow) {
      const el = g(id); if (!el) return;
      el.setAttribute('opacity', '1');
      if (glow === 'green')  el.style.filter = 'drop-shadow(0 0 8px rgba(86,211,100,0.7))';
      if (glow === 'purple') el.style.filter = 'drop-shadow(0 0 8px rgba(163,113,247,0.7))';
      if (glow === 'red')    el.style.filter = 'drop-shadow(0 0 8px rgba(248,81,73,0.6))';
    }
    function hide(id) { const el = g(id); if (el) { el.setAttribute('opacity', '0'); el.style.filter = ''; } }
    function unglow(id) { const el = g(id); if (el) el.style.filter = ''; }
    function setMode(txt, count, color) {
      const t = g('wt-mode-txt'); if (t) t.textContent = txt;
      const c = g('wt-mode-count'); if (c) { c.textContent = count; c.setAttribute('fill', color); }
    }
    function shuffleSub(txt) { const s = g('wt-shuffle-sub'); if (s) s.textContent = txt; }

    return [
      AE.fnStep('The Write Job', '', () => {
        show('wt-modelabel');
        setMode('write to a partitioned table…', '4 tasks · 3 partitions', '#8b949e');
      }, () => {}, 2400),

      AE.fnStep('distribution-mode = none', '', () => {
        show('wt-noshuffle', 'red');
        show('wt-files-none', 'red');
        setMode('write.distribution-mode = none', '12 tiny files / commit', '#f85149');
      }, () => {
        hide('wt-noshuffle'); hide('wt-files-none'); unglow('wt-files-none');
      }, 3000),

      AE.fnStep('distribution-mode = hash', '', () => {
        hide('wt-noshuffle'); hide('wt-files-none');
        shuffleSub('by partition');
        show('wt-shuffle', 'green');
        show('wt-files-hash', 'green');
        setMode('write.distribution-mode = hash', '6 right-sized files', '#56d364');
      }, () => {
        hide('wt-files-hash'); unglow('wt-files-hash');
      }, 3000),

      AE.fnStep('distribution-mode = range', '', () => {
        hide('wt-files-hash');
        shuffleSub('range + sort');
        show('wt-shuffle', 'green');
        show('wt-files-range', 'green');
        setMode('write.distribution-mode = range', '3 large sorted files', '#56d364');
      }, () => {
        hide('wt-files-range'); unglow('wt-files-range');
        hide('wt-shuffle'); unglow('wt-shuffle');
      }, 3000),

      AE.fnStep('Fanout vs Sorted Writer', '', () => {
        // keep range files as the good outcome; spotlight the shuffle node
        show('wt-files-range');
        show('wt-shuffle', 'green');
        shuffleSub('fanout writer');
        setMode('fanout-enabled = true', 'no pre-sort needed', '#58a6ff');
      }, () => {
        hide('wt-files-range'); hide('wt-shuffle'); unglow('wt-shuffle');
        hide('wt-modelabel');
      }, 3000),

      AE.fnStep('Metrics Modes', '', () => {
        hide('wt-modelabel'); hide('wt-files-range'); hide('wt-shuffle');
        show('wt-metrics', 'purple');
      }, () => {
        hide('wt-metrics'); unglow('wt-metrics');
      }, 3600),

      AE.fnStep('Target File Size', '', () => {
        hide('wt-metrics');
        show('wt-target', 'green');
      }, () => {
        hide('wt-target'); unglow('wt-target');
      }, 3600),
    ];
  }

  /* ── Sidebar wiring ─────────────────────────────────────── */
  function _buildSidebar(page, engine, stepsData) {
    const list = page.querySelector('#wt-steps-list');
    const titleEl = page.querySelector('#wt-step-title');
    const descEl = page.querySelector('#wt-step-desc');
    if (!list) return;

    list.innerHTML = stepsData.map((s, i) => `
      <div class="wt-step-item" data-step="${i}">
        <div class="wt-step-badge">${i + 1}</div>
        <div class="wt-step-text">${s.label}</div>
      </div>
    `).join('');

    engine.on('stepchange', (idx) => {
      list.querySelectorAll('.wt-step-item').forEach((el, i) => {
        el.classList.toggle('active', i === idx);
        el.classList.toggle('done', i < idx);
      });
      const step = idx >= 0 ? stepsData[idx] : null;
      if (titleEl) titleEl.textContent = step ? step.label : 'Press Play to begin';
      if (descEl)  descEl.textContent  = step ? step.desc  : 'Watch how write.distribution-mode and target file size shape files on write — and how metrics modes trade manifest size for pruning.';
      const active = list.querySelector('.wt-step-item.active');
      if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });

    list.addEventListener('click', (e) => {
      const item = e.target.closest('[data-step]');
      if (item) engine.goto(parseInt(item.dataset.step, 10));
    });
  }

  /* ── Module ─────────────────────────────────────────────── */
  const mod = {
    id: 'write-tuning',
    title: 'Write Tuning & Metrics',
    group: 'advanced',
    _engine: null,

    render(container) {
      container.innerHTML = '';
      _injectStyles();

      const page = document.createElement('div');
      page.className = 'wt-page page-enter';
      page.innerHTML = `
        <div class="wt-outer">
          <div class="wt-canvas" id="wt-canvas"></div>
          <div class="wt-sidebar">
            <div class="wt-sidebar-header">
              <div class="wt-sidebar-title" id="wt-step-title">Press Play to begin</div>
              <div class="wt-sidebar-desc" id="wt-step-desc">Watch how write.distribution-mode and target file size shape files on write — and how metrics modes trade manifest size for pruning.</div>
            </div>
            <div class="wt-steps-list" id="wt-steps-list"></div>
            <div class="wt-info">
              <div class="wt-info-label">distribution-mode</div>
              <table class="wt-cmp">
                <tbody>
                  <tr><td>none</td><td>no shuffle → many tiny files (small-file problem on write)</td></tr>
                  <tr><td>hash</td><td>shuffle by partition → few right-sized files (default)</td></tr>
                  <tr><td>range</td><td>range + sort → largest files + tight min/max for pruning</td></tr>
                </tbody>
              </table>
              <div class="wt-info-label">Set it on the table</div>
              <div class="wt-sql"><span class="wt-k">ALTER TABLE</span> prod.orders <span class="wt-k">SET TBLPROPERTIES</span> (
  <span class="wt-s">'write.distribution-mode'</span>    = <span class="wt-s">'hash'</span>,
  <span class="wt-s">'write.target-file-size-bytes'</span> = <span class="wt-s">'536870912'</span>,
  <span class="wt-s">'write.spark.fanout.enabled'</span>   = <span class="wt-s">'true'</span>
);

<span class="wt-c">-- Wide/blob columns: skip stats to keep manifests small</span>
<span class="wt-k">SET TBLPROPERTIES</span> (
  <span class="wt-s">'write.metadata.metrics.column.payload'</span> = <span class="wt-s">'none'</span>);</div>
              <div class="wt-note"><strong>Interview tip:</strong> if you get tiny files "even though I run compaction," the fix is usually distribution-mode = none. Shape files on write (hash/range + target size); compaction is the safety net, not the primary tool.</div>
            </div>
          </div>
        </div>
      `;
      container.appendChild(page);

      const svg = _buildSVG();
      page.querySelector('#wt-canvas').appendChild(svg);

      const stepsData = _getStepDescs();
      const steps = _buildAnimationSteps(svg);
      const engine = new IV.AnimationEngine({ steps });
      engine.setContext({ svg });
      this._engine = engine;

      _buildSidebar(page, engine, stepsData);
      IV.AnimationControls.register(engine);
    },

    destroy() {
      if (this._engine) { this._engine.destroy(); this._engine = null; }
      IV.AnimationControls.hide();
      document.getElementById('wt-styles')?.remove();
    },
  };

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.modules = window.IcebergViz.modules || {};
  window.IcebergViz.modules['write-tuning'] = mod;
})();
