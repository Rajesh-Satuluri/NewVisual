/* ============================================================
   Update Module
   Animated 8-step comparison of Copy-on-Write vs Merge-on-Read
   UPDATE strategies for ShopKart orders (IN_TRANSIT → DELIVERED).
   ============================================================ */

(function () {
  'use strict';

  const IV = window.IcebergViz;

  /* ── Style injection ────────────────────────────────────── */
  function _injectStyles() {
    if (document.getElementById('upd-styles')) return;
    const s = document.createElement('style');
    s.id = 'upd-styles';
    s.textContent = `
.upd-page { display:flex; flex-direction:column; height:100%; overflow:hidden; }

.upd-outer {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.upd-canvas {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background: var(--bg-1);
  overflow: hidden;
  position: relative;
}

.upd-sidebar {
  width: 340px;
  border-left: 1px solid var(--border-default);
  background: var(--bg-2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.upd-sidebar-header {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-default);
  flex-shrink: 0;
}

.upd-sidebar-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.upd-sidebar-desc {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  line-height: 1.5;
  min-height: 52px;
}

.upd-steps-list {
  flex: 0 0 auto;
  overflow-y: auto;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-default);
  max-height: 240px;
}

.upd-step-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 7px 16px;
  cursor: pointer;
  transition: background 0.12s;
  border-left: 3px solid transparent;
  margin-bottom: 1px;
}
.upd-step-item:hover { background: var(--bg-3); }
.upd-step-item.active {
  background: rgba(74,174,255,0.07);
  border-left-color: var(--blue);
}
.upd-step-item.done { opacity: 0.6; }

.upd-step-badge {
  width: 20px; height: 20px;
  border-radius: 50%;
  background: var(--bg-4);
  color: var(--text-muted);
  font-size: 10px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-top: 1px;
}
.upd-step-item.active .upd-step-badge { background: var(--blue); color: #fff; }
.upd-step-item.done .upd-step-badge   { background: var(--green); color: #fff; }

.upd-step-text {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
}
.upd-step-item.active .upd-step-text { color: var(--text-primary); font-weight: 500; }

.upd-info-panel {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.upd-stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: var(--bg-3);
  border-radius: 6px;
  margin-bottom: 6px;
  font-size: 11px;
}
.upd-stat-row .label { color: var(--text-muted); }
.upd-stat-row .cow-val { color: var(--blue); font-family: var(--font-mono); font-weight: 700; }
.upd-stat-row .mor-val { color: var(--orange); font-family: var(--font-mono); font-weight: 700; }

.upd-section-label {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: .05em;
  margin: 10px 0 6px;
  font-weight: 600;
}
`;
    document.head.appendChild(s);
  }

  /* ── Step descriptions ──────────────────────────────────── */
  function _getStepDescs() {
    return [
      { label: 'Scan for Matches',         desc: 'UPDATE is more expensive than DELETE — any file containing matching rows must be processed. 890 of 24,000 files contain status=IN_TRANSIT rows. 1.2M rows to update.' },
      { label: 'CoW: Read 890 Files',      desc: 'Copy-on-Write reads all 890 affected files in full. 890 × 128 MB = 113.9 GB read before any writes begin. This is the write amplification problem.' },
      { label: 'CoW: Apply Update + Rewrite', desc: 'For each affected file: read all rows, apply SET clause to matching rows (status=DELIVERED, delivery_ts=now), write entire file as new Parquet. 113.9 GB written.' },
      { label: 'CoW: New Snapshot',        desc: 'New snapshot with 890 rewritten files + 23,110 unchanged. Total cost: 227.8 GB I/O (113.9 GB read + 113.9 GB write). Old files expire later.' },
      { label: 'MoR: Equality Delete Files', desc: 'Merge-on-Read for UPDATE uses equality deletes: a file listing the primary key (order_id) of all rows to logically delete, plus a new file with updated rows.' },
      { label: 'MoR: Write New Rows',      desc: 'A new data file is written with only the 1.2M updated rows (status=DELIVERED, delivery_ts set). Total write: 47 MB delete file + 47 MB new rows = 94 MB.' },
      { label: 'MoR: Snapshot Committed',  desc: 'New snapshot adds 1 equality-delete file + 1 new data file. 889 original data files are unchanged. MoR write cost: 94 MB vs CoW\'s 227.8 GB.' },
      { label: 'Strategy Comparison',      desc: 'CoW trades 227.8 GB of I/O for zero read overhead. MoR trades 94 MB of I/O for a small equality-delete merge at read time. Scale matters for this choice.' },
    ];
  }

  /* ── Build SVG ──────────────────────────────────────────── */
  function _buildSVG() {
    const W = 760, H = 460;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.maxWidth = W + 'px';
    svg.style.maxHeight = H + 'px';
    svg.id = 'upd-svg';

    // Mini file grid for 890 files representation (condensed as dots)
    function miniFileGrid(startX, startY, count, color, id) {
      const cols = 18;
      const rows = Math.ceil(Math.min(count, 54) / cols);
      let cells = '';
      for (let i = 0; i < Math.min(count, 54); i++) {
        const cx = startX + (i % cols) * 12;
        const cy = startY + Math.floor(i / cols) * 12;
        cells += `<rect x="${cx}" y="${cy}" width="9" height="9" rx="1.5" fill="${color}" opacity="0.7"/>`;
      }
      return `<g id="${id}">${cells}</g>`;
    }

    svg.innerHTML = `
<defs>
  <marker id="upd-arr-blue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#58a6ff"/>
  </marker>
  <marker id="upd-arr-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#56d364"/>
  </marker>
  <marker id="upd-arr-orange" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#f0883e"/>
  </marker>
</defs>

<rect width="${W}" height="${H}" fill="#090d14"/>
<text x="12" y="16" font-family="system-ui" font-size="9.5" fill="rgba(139,148,158,0.4)" font-weight="600" letter-spacing="1">UPDATE — Copy-on-Write vs Merge-on-Read</text>

<!-- UPDATE SQL banner -->
<rect x="12" y="22" width="736" height="28" rx="5" fill="rgba(88,166,255,0.04)" stroke="rgba(88,166,255,0.15)" stroke-width="1"/>
<text x="24" y="34" font-family="ui-monospace" font-size="8.5" fill="rgba(88,166,255,0.7)">UPDATE orders SET status = 'DELIVERED', delivery_ts = CURRENT_TIMESTAMP WHERE tracking_id IS NOT NULL AND status = 'IN_TRANSIT'</text>
<text x="24" y="45" font-family="system-ui" font-size="8.5" fill="rgba(139,148,158,0.5)">890 of 24,000 files affected · 1,200,000 rows to update</text>

<!-- ═══ CoW HALF (LEFT) ═══ -->
<rect x="12" y="56" width="366" height="390" rx="10" fill="rgba(88,166,255,0.03)" stroke="rgba(88,166,255,0.2)" stroke-width="1.2"/>
<rect x="12" y="56" width="366" height="26" rx="10" fill="rgba(88,166,255,0.1)"/>
<text x="24" y="74" font-family="system-ui" font-size="11" font-weight="700" fill="#58a6ff">Copy-on-Write (CoW)</text>
<text x="270" y="74" font-family="system-ui" font-size="9" fill="rgba(88,166,255,0.6)">227.8 GB I/O</text>

<!-- CoW: affected files indicator -->
<g id="upd-cow-scan">
  <text x="24" y="100" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.6)">890 affected files (status=IN_TRANSIT present):</text>
  ${miniFileGrid(24, 105, 54, '#1f6feb', 'upd-cow-filegrid')}
  <text x="26" y="180" font-family="ui-monospace" font-size="8" fill="rgba(88,166,255,0.5)">… +836 more files (54 shown)</text>
</g>

<!-- CoW reading progress -->
<g id="upd-cow-reading" opacity="0">
  <rect x="24" y="188" width="340" height="24" rx="4" fill="rgba(88,166,255,0.08)" stroke="#58a6ff" stroke-width="1"/>
  <text x="194" y="204" text-anchor="middle" font-family="system-ui" font-size="9.5" font-weight="600" fill="#58a6ff">Reading 113.9 GB (890 × 128 MB)…</text>
</g>

<!-- CoW rewrite progress -->
<g id="upd-cow-rewriting" opacity="0">
  <rect x="24" y="218" width="340" height="42" rx="5" fill="rgba(86,211,100,0.06)" stroke="rgba(86,211,100,0.3)" stroke-width="1"/>
  <text x="194" y="236" text-anchor="middle" font-family="system-ui" font-size="9.5" font-weight="600" fill="#56d364">Applying SET clause + rewriting…</text>
  <text x="194" y="252" text-anchor="middle" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.6)">890 new Parquet files being written</text>
</g>

<!-- CoW new files grid (green) -->
<g id="upd-cow-newgrid" opacity="0">
  <text x="24" y="276" font-family="system-ui" font-size="9" fill="rgba(86,211,100,0.7)">890 rewritten files (new versions):</text>
  ${miniFileGrid(24, 282, 54, '#2ea043', 'upd-cow-newgrid-cells')}
  <text x="26" y="354" font-family="ui-monospace" font-size="8" fill="rgba(86,211,100,0.4)">… +836 more new files</text>
</g>

<!-- CoW snapshot committed -->
<g id="upd-cow-snap" opacity="0">
  <rect x="24" y="360" width="340" height="46" rx="6" fill="#0d1f3c" stroke="#58a6ff" stroke-width="1.5"/>
  <text x="34" y="380" font-family="system-ui" font-size="9.5" font-weight="600" fill="#58a6ff">New Snapshot</text>
  <text x="34" y="395" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.6)">890 new files + 23,110 unchanged</text>
  <text x="270" y="395" text-anchor="middle" font-family="ui-monospace" font-size="9" font-weight="700" fill="#f85149">227.8 GB total I/O</text>
</g>

<!-- ═══ MoR HALF (RIGHT) ═══ -->
<rect x="388" y="56" width="360" height="390" rx="10" fill="rgba(240,136,62,0.03)" stroke="rgba(240,136,62,0.2)" stroke-width="1.2"/>
<rect x="388" y="56" width="360" height="26" rx="10" fill="rgba(240,136,62,0.1)"/>
<text x="400" y="74" font-family="system-ui" font-size="11" font-weight="700" fill="#f0883e">Merge-on-Read (MoR)</text>
<text x="632" y="74" font-family="system-ui" font-size="9" fill="rgba(240,136,62,0.6)">94 MB I/O</text>

<!-- MoR: original 890 files (unchanged) -->
<g id="upd-mor-scan">
  <text x="400" y="100" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.6)">890 affected files (NOT rewritten):</text>
  ${miniFileGrid(400, 105, 54, '#1f6feb', 'upd-mor-filegrid')}
  <text x="402" y="180" font-family="ui-monospace" font-size="8" fill="rgba(88,166,255,0.5)">… unchanged in place</text>
</g>

<!-- MoR equality-delete file -->
<g id="upd-mor-eqdelete" opacity="0">
  <text x="400" y="200" font-family="system-ui" font-size="9" fill="rgba(240,136,62,0.7)">Equality-delete file written:</text>
  <rect x="400" y="207" width="210" height="52" rx="6" fill="#1e1408" stroke="#f0883e" stroke-width="1.8"/>
  <text x="416" y="229" font-size="12">📝</text>
  <text x="438" y="226" font-family="ui-monospace" font-size="9.5" font-weight="600" fill="#e6edf3">equality-deletes.parquet</text>
  <text x="438" y="239" font-family="ui-monospace" font-size="8.5" fill="rgba(240,136,62,0.7)">47 MB · 1.2M order_ids</text>
  <text x="438" y="252" font-family="ui-monospace" font-size="7.5" fill="rgba(139,148,158,0.4)">key: order_id (equality match)</text>
</g>

<!-- MoR new data rows file -->
<g id="upd-mor-newrows" opacity="0">
  <text x="400" y="272" font-family="system-ui" font-size="9" fill="rgba(86,211,100,0.7)">Updated rows file written:</text>
  <rect x="400" y="279" width="210" height="52" rx="6" fill="#0a1f10" stroke="#56d364" stroke-width="1.8"/>
  <text x="416" y="301" font-size="12">🗄</text>
  <text x="438" y="298" font-family="ui-monospace" font-size="9.5" font-weight="600" fill="#e6edf3">updated-rows.parquet</text>
  <text x="438" y="311" font-family="ui-monospace" font-size="8.5" fill="rgba(86,211,100,0.7)">47 MB · 1.2M rows</text>
  <text x="438" y="324" font-family="ui-monospace" font-size="7.5" fill="rgba(139,148,158,0.4)">status=DELIVERED, delivery_ts set</text>
</g>

<!-- MoR snapshot committed -->
<g id="upd-mor-snap" opacity="0">
  <rect x="400" y="342" width="336" height="64" rx="6" fill="#1e1408" stroke="#f0883e" stroke-width="1.5"/>
  <text x="410" y="362" font-family="system-ui" font-size="9.5" font-weight="600" fill="#f0883e">New Snapshot</text>
  <text x="410" y="378" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.6)">+1 equality-delete file (47 MB)</text>
  <text x="410" y="391" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.6)">+1 new data file (47 MB)</text>
  <text x="410" y="400" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,0.4)">0 of 890 original files rewritten</text>
  <text x="618" y="380" text-anchor="middle" font-family="ui-monospace" font-size="11" font-weight="700" fill="#56d364">94 MB total</text>
</g>

<!-- Full comparison overlay (step 8) -->
<g id="upd-comparison" opacity="0">
  <rect x="12" y="56" width="736" height="390" rx="10" fill="#0d1117"/>
  <text x="386" y="82" text-anchor="middle" font-family="system-ui" font-size="14" font-weight="700" fill="var(--text-primary)">UPDATE Strategy Comparison</text>

  <rect x="24" y="92" width="720" height="28" rx="5" fill="var(--bg-3)"/>
  <text x="80"  y="111" font-family="system-ui" font-size="10" font-weight="700" fill="rgba(139,148,158,0.7)" text-anchor="middle">Metric</text>
  <text x="320" y="111" font-family="system-ui" font-size="10" font-weight="700" fill="#58a6ff" text-anchor="middle">Copy-on-Write</text>
  <text x="580" y="111" font-family="system-ui" font-size="10" font-weight="700" fill="#f0883e" text-anchor="middle">Merge-on-Read</text>

  <rect x="24" y="120" width="720" height="26" fill="rgba(88,166,255,0.03)"/>
  <text x="80"  y="137" text-anchor="middle" font-family="system-ui" font-size="10" fill="rgba(139,148,158,0.7)">Write I/O</text>
  <text x="320" y="137" text-anchor="middle" font-family="ui-monospace" font-size="11" font-weight="700" fill="#f85149">227.8 GB</text>
  <text x="580" y="137" text-anchor="middle" font-family="ui-monospace" font-size="11" font-weight="700" fill="#56d364">94 MB</text>

  <rect x="24" y="146" width="720" height="26" fill="transparent"/>
  <text x="80"  y="163" text-anchor="middle" font-family="system-ui" font-size="10" fill="rgba(139,148,158,0.7)">Files Rewritten</text>
  <text x="320" y="163" text-anchor="middle" font-family="ui-monospace" font-size="11" font-weight="700" fill="#f85149">890</text>
  <text x="580" y="163" text-anchor="middle" font-family="ui-monospace" font-size="11" font-weight="700" fill="#56d364">0</text>

  <rect x="24" y="172" width="720" height="26" fill="rgba(88,166,255,0.03)"/>
  <text x="80"  y="189" text-anchor="middle" font-family="system-ui" font-size="10" fill="rgba(139,148,158,0.7)">Read Overhead</text>
  <text x="320" y="189" text-anchor="middle" font-family="system-ui" font-size="10" fill="#56d364">None</text>
  <text x="580" y="189" text-anchor="middle" font-family="system-ui" font-size="10" fill="#e3b341">Equality-delete merge</text>

  <rect x="24" y="198" width="720" height="26" fill="transparent"/>
  <text x="80"  y="215" text-anchor="middle" font-family="system-ui" font-size="10" fill="rgba(139,148,158,0.7)">Delete Type</text>
  <text x="320" y="215" text-anchor="middle" font-family="system-ui" font-size="10" fill="rgba(139,148,158,0.5)">N/A (full rewrite)</text>
  <text x="580" y="215" text-anchor="middle" font-family="ui-monospace" font-size="10" fill="#f0883e">equality-delete file</text>

  <rect x="24" y="224" width="720" height="26" fill="rgba(88,166,255,0.03)"/>
  <text x="80"  y="241" text-anchor="middle" font-family="system-ui" font-size="10" fill="rgba(139,148,158,0.7)">Best For</text>
  <text x="320" y="241" text-anchor="middle" font-family="system-ui" font-size="10" fill="#58a6ff">Read-heavy analytics</text>
  <text x="580" y="241" text-anchor="middle" font-family="system-ui" font-size="10" fill="#f0883e">Write-heavy / real-time sync</text>

  <rect x="24" y="250" width="720" height="26" fill="transparent"/>
  <text x="80"  y="267" text-anchor="middle" font-family="system-ui" font-size="10" fill="rgba(139,148,158,0.7)">ShopKart</text>
  <text x="320" y="267" text-anchor="middle" font-family="system-ui" font-size="10" fill="#58a6ff">Order analytics</text>
  <text x="580" y="267" text-anchor="middle" font-family="system-ui" font-size="10" fill="#f0883e">Real-time order sync</text>

  <rect x="24" y="290" width="720" height="72" rx="8" fill="rgba(86,211,100,0.05)" stroke="rgba(86,211,100,0.2)" stroke-width="1"/>
  <text x="386" y="312" text-anchor="middle" font-family="system-ui" font-size="11" font-weight="600" fill="#56d364">I/O Reduction: 227.8 GB → 94 MB = 2,413× less I/O with MoR</text>
  <text x="386" y="330" text-anchor="middle" font-family="system-ui" font-size="9.5" fill="rgba(139,148,158,0.7)">At ShopKart scale: CoW UPDATE takes ~12 minutes · MoR UPDATE takes ~3 seconds</text>
  <text x="386" y="348" text-anchor="middle" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.5)">MoR accumulates delete files over time — OPTIMIZE (rewrite_data_files) periodically compacts them</text>
</g>
`;
    return svg;
  }

  /* ── Animation steps ────────────────────────────────────── */
  function _buildAnimationSteps(svg) {
    const AE = IV.AnimationEngine;

    function g(id) { return svg.getElementById(id); }
    function show(id, glowColor) {
      const el = g(id);
      if (!el) return;
      el.setAttribute('opacity', '1');
      if (glowColor === 'blue')   el.style.filter = 'drop-shadow(0 0 8px rgba(88,166,255,0.6))';
      if (glowColor === 'green')  el.style.filter = 'drop-shadow(0 0 8px rgba(86,211,100,0.6))';
      if (glowColor === 'orange') el.style.filter = 'drop-shadow(0 0 8px rgba(240,136,62,0.6))';
    }
    function hide(id) {
      const el = g(id);
      if (el) { el.setAttribute('opacity', '0'); el.style.filter = ''; }
    }
    function unglow(id) {
      const el = g(id);
      if (el) el.style.filter = '';
    }

    return [
      AE.fnStep('Scan for Matches', '', (ctx) => {
        show('upd-cow-scan');
        show('upd-mor-scan');
        show('upd-cow-filegrid', 'blue');
        show('upd-mor-filegrid', 'blue');
      }, (ctx) => {
        unglow('upd-cow-filegrid');
        unglow('upd-mor-filegrid');
      }, 2500),

      AE.fnStep('CoW: Read 890 Files', '', (ctx) => {
        show('upd-cow-reading', 'blue');
        unglow('upd-mor-filegrid');
      }, (ctx) => {
        hide('upd-cow-reading');
      }, 3000),

      AE.fnStep('CoW: Apply Update + Rewrite', '', (ctx) => {
        hide('upd-cow-reading');
        show('upd-cow-rewriting', 'green');
        show('upd-cow-newgrid', 'green');
      }, (ctx) => {
        hide('upd-cow-rewriting');
        hide('upd-cow-newgrid');
      }, 3500),

      AE.fnStep('CoW: New Snapshot', '', (ctx) => {
        hide('upd-cow-rewriting');
        unglow('upd-cow-newgrid');
        const fg = g('upd-cow-filegrid');
        if (fg) fg.setAttribute('opacity', '0.25');
        show('upd-cow-snap', 'blue');
      }, (ctx) => {
        const fg = g('upd-cow-filegrid');
        if (fg) fg.setAttribute('opacity', '1');
        hide('upd-cow-snap');
      }, 3000),

      AE.fnStep('MoR: Equality Delete Files', '', (ctx) => {
        show('upd-mor-eqdelete', 'orange');
      }, (ctx) => {
        hide('upd-mor-eqdelete');
      }, 3000),

      AE.fnStep('MoR: Write New Rows', '', (ctx) => {
        show('upd-mor-newrows', 'green');
      }, (ctx) => {
        hide('upd-mor-newrows');
      }, 2800),

      AE.fnStep('MoR: Snapshot Committed', '', (ctx) => {
        show('upd-mor-snap', 'orange');
      }, (ctx) => {
        hide('upd-mor-snap');
      }, 3000),

      AE.fnStep('Strategy Comparison', '', (ctx) => {
        show('upd-comparison');
      }, (ctx) => {
        hide('upd-comparison');
      }, 5000),
    ];
  }

  /* ── Sidebar wiring ─────────────────────────────────────── */
  function _buildSidebar(page, engine, stepsData) {
    const list    = page.querySelector('#upd-steps-list');
    const titleEl = page.querySelector('#upd-step-title');
    const descEl  = page.querySelector('#upd-step-desc');
    if (!list) return;

    list.innerHTML = stepsData.map((s, i) => `
      <div class="upd-step-item" data-step="${i}">
        <div class="upd-step-badge">${i + 1}</div>
        <div class="upd-step-text">${s.label}</div>
      </div>
    `).join('');

    engine.on('stepchange', (idx) => {
      list.querySelectorAll('.upd-step-item').forEach((el, i) => {
        el.classList.toggle('active', i === idx);
        el.classList.toggle('done', i < idx);
      });
      const step = idx >= 0 ? stepsData[idx] : null;
      if (titleEl) titleEl.textContent = step ? step.label : 'Press Play to begin';
      if (descEl)  descEl.textContent  = step ? step.desc  : 'Compare CoW and MoR UPDATE strategies. CoW rewrites 227.8 GB; MoR writes just 94 MB.';
      const active = list.querySelector('.upd-step-item.active');
      if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });

    list.addEventListener('click', (e) => {
      const item = e.target.closest('[data-step]');
      if (item) engine.goto(parseInt(item.dataset.step, 10));
    });
  }

  /* ── Module ─────────────────────────────────────────────── */
  const mod = {
    id: 'update',
    title: 'UPDATE',
    group: 'write-ops',
    _engine: null,

    render(container) {
      container.innerHTML = '';
      _injectStyles();

      const page = document.createElement('div');
      page.className = 'upd-page page-enter';
      page.innerHTML = `
        <div class="upd-outer">
          <div class="upd-canvas" id="upd-canvas"></div>
          <div class="upd-sidebar">
            <div class="upd-sidebar-header">
              <div class="upd-sidebar-title" id="upd-step-title">Press Play to begin</div>
              <div class="upd-sidebar-desc" id="upd-step-desc">Update 1.2M orders to DELIVERED status. CoW rewrites 227.8 GB; MoR writes just 94 MB.</div>
            </div>
            <div class="upd-steps-list" id="upd-steps-list"></div>
            <div class="upd-info-panel">
              <div class="upd-section-label">I/O Comparison</div>
              <div class="upd-stat-row">
                <span class="label">Write I/O</span>
                <span class="cow-val">227.8 GB</span>
                <span class="mor-val">94 MB</span>
              </div>
              <div class="upd-stat-row">
                <span class="label">Files Rewritten</span>
                <span class="cow-val">890</span>
                <span class="mor-val">0</span>
              </div>
              <div class="upd-stat-row">
                <span class="label">Read Overhead</span>
                <span class="cow-val">None</span>
                <span class="mor-val">eq-del merge</span>
              </div>
              <div class="upd-stat-row">
                <span class="label">I/O Reduction</span>
                <span style="color:var(--green);font-family:var(--font-mono);font-weight:700;">MoR 2,413×</span>
              </div>
              <div class="upd-section-label" style="margin-top:12px;">Query</div>
              <div style="background:var(--bg-3);border:1px solid var(--border-default);border-radius:8px;padding:10px;font-family:var(--font-mono);font-size:10px;color:var(--text-secondary);line-height:1.6;overflow-x:auto;white-space:pre"><span style="color:var(--blue);font-weight:600">UPDATE</span> orders
<span style="color:var(--blue);font-weight:600">SET</span> status = <span style="color:var(--green)">'DELIVERED'</span>,
    delivery_ts = <span style="color:var(--blue);font-weight:600">CURRENT_TIMESTAMP</span>
<span style="color:var(--blue);font-weight:600">WHERE</span> tracking_id <span style="color:var(--blue);font-weight:600">IS NOT NULL</span>
  <span style="color:var(--blue);font-weight:600">AND</span> status = <span style="color:var(--green)">'IN_TRANSIT'</span></div>
            </div>
          </div>
        </div>
      `;
      container.appendChild(page);

      const svg       = _buildSVG();
      page.querySelector('#upd-canvas').appendChild(svg);

      const stepsData = _getStepDescs();
      const steps     = _buildAnimationSteps(svg);
      const engine    = new IV.AnimationEngine({ steps });
      engine.setContext({ svg });
      this._engine = engine;

      _buildSidebar(page, engine, stepsData);
      IV.AnimationControls.register(engine);
    },

    destroy() {
      if (this._engine) { this._engine.destroy(); this._engine = null; }
      IV.AnimationControls.hide();
      document.getElementById('upd-styles')?.remove();
    },
  };

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.modules = window.IcebergViz.modules || {};
  window.IcebergViz.modules['update'] = mod;
})();
