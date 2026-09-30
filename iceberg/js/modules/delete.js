/* ============================================================
   Delete Module
   Animated 8-step comparison of Copy-on-Write vs Merge-on-Read
   DELETE strategies for ShopKart orders table.
   ============================================================ */

(function () {
  'use strict';

  const IV = window.IcebergViz;

  /* ── Style injection ────────────────────────────────────── */
  function _injectStyles() {
    if (document.getElementById('del-styles')) return;
    const s = document.createElement('style');
    s.id = 'del-styles';
    s.textContent = `
.del-page { display:flex; flex-direction:column; height:100%; overflow:hidden; }

.del-outer {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.del-canvas {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background: var(--bg-1);
  overflow: hidden;
  position: relative;
}

.del-sidebar {
  width: 340px;
  border-left: 1px solid var(--border-default);
  background: var(--bg-2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.del-sidebar-header {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-default);
  flex-shrink: 0;
}

.del-sidebar-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.del-sidebar-desc {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  line-height: 1.5;
  min-height: 52px;
}

.del-steps-list {
  flex: 0 0 auto;
  overflow-y: auto;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-default);
  max-height: 240px;
}

.del-step-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 7px 16px;
  cursor: pointer;
  transition: background 0.12s;
  border-left: 3px solid transparent;
  margin-bottom: 1px;
}
.del-step-item:hover { background: var(--bg-3); }
.del-step-item.active {
  background: rgba(74,174,255,0.07);
  border-left-color: var(--blue);
}
.del-step-item.done { opacity: 0.6; }

.del-step-badge {
  width: 20px; height: 20px;
  border-radius: 50%;
  background: var(--bg-4);
  color: var(--text-muted);
  font-size: 10px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-top: 1px;
}
.del-step-item.active .del-step-badge { background: var(--blue); color: #fff; }
.del-step-item.done .del-step-badge   { background: var(--green); color: #fff; }

.del-step-text {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
}
.del-step-item.active .del-step-text { color: var(--text-primary); font-weight: 500; }

.del-info-panel {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.del-compare-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  margin-top: 6px;
}
.del-compare-table th {
  padding: 6px 8px;
  text-align: left;
  font-weight: 700;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .04em;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border-default);
}
.del-compare-table th.cow { color: var(--blue); }
.del-compare-table th.mor { color: var(--orange); }
.del-compare-table td {
  padding: 6px 8px;
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  vertical-align: top;
}
.del-compare-table td.metric { color: var(--text-muted); font-size: 10px; }
.del-compare-table td.val-cow { color: var(--blue); font-family: var(--font-mono); font-size: 11px; }
.del-compare-table td.val-mor { color: var(--orange); font-family: var(--font-mono); font-size: 11px; }
.del-compare-table tr:last-child td { border-bottom: none; }
`;
    document.head.appendChild(s);
  }

  /* ── Step descriptions ──────────────────────────────────── */
  function _getStepDescs() {
    return [
      { label: 'Scan for Matches',        desc: 'The DELETE predicate is pushed down to file-level stats. 3 of 24,000 Parquet files contain rows matching status=CANCELLED AND placed_at < 2022-01-01.' },
      { label: 'CoW: Read Full Files',    desc: 'Copy-on-Write must read entire affected files regardless of how few rows match. 3 files × 128 MB = 384 MB read before any writes begin.' },
      { label: 'CoW: Filter & Rewrite',  desc: 'Each file is filtered (matching rows removed) and rewritten as new Parquet files. 384 MB rewritten even if only 0.001% of rows are deleted.' },
      { label: 'CoW: Snapshot Committed',desc: 'New snapshot points to 3 new files + 23,997 unchanged files. Old files remain until expire_snapshots runs. Pure metadata pointer swap.' },
      { label: 'MoR: Write Delete File', desc: 'Merge-on-Read writes a position-delete file: a list of (file_path, row_position) pairs for every deleted row. 0 data files rewritten.' },
      { label: 'MoR: Snapshot Committed',desc: 'New snapshot adds the delete file to the manifest. The original 3 data files are unchanged. Total write I/O: 2.4 KB vs CoW\'s 384 MB.' },
      { label: 'MoR: Read-time Merge',   desc: 'At query time, Iceberg readers join the base file against the delete file and filter out deleted positions. Small merge overhead is the trade-off.' },
      { label: 'Strategy Comparison',    desc: 'CoW excels for read-heavy analytics workloads. MoR excels for write-heavy CDC/streaming workloads. ShopKart uses CoW for analytics, MoR for streaming.' },
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
    svg.id = 'del-svg';

    // Helper: file card
    function fileCard(id, x, y, label, color, strokeColor, opacity) {
      const fc = color || '#0d1117';
      const sc = strokeColor || '#30363d';
      const op = opacity || '1';
      return `
<g id="${id}" opacity="${op}">
  <rect x="${x}" y="${y}" width="86" height="44" rx="5" fill="${fc}" stroke="${sc}" stroke-width="1.3"/>
  <text x="${x+9}" y="${y+17}" font-size="11">🗄</text>
  <text x="${x+26}" y="${y+15}" font-family="ui-monospace" font-size="8.5" fill="#e6edf3">${label.split('\n')[0]}</text>
  <text x="${x+26}" y="${y+27}" font-family="ui-monospace" font-size="7.5" fill="rgba(139,148,158,0.5)">${label.split('\n')[1] || '128 MB'}</text>
  <text x="${x+26}" y="${y+39}" font-family="ui-monospace" font-size="7" fill="rgba(139,148,158,0.35)">PARQUET</text>
</g>`;
    }

    svg.innerHTML = `
<defs>
  <marker id="del-arr-blue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#58a6ff"/>
  </marker>
  <marker id="del-arr-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#56d364"/>
  </marker>
  <marker id="del-arr-orange" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#f0883e"/>
  </marker>
</defs>

<rect width="${W}" height="${H}" fill="#090d14"/>
<text x="12" y="16" font-family="system-ui" font-size="9.5" fill="rgba(139,148,158,0.4)" font-weight="600" letter-spacing="1">DELETE — Copy-on-Write vs Merge-on-Read</text>

<!-- DELETE SQL banner -->
<rect x="12" y="22" width="736" height="28" rx="5" fill="rgba(88,166,255,0.04)" stroke="rgba(88,166,255,0.15)" stroke-width="1"/>
<text x="24" y="34" font-family="ui-monospace" font-size="9" fill="rgba(88,166,255,0.7)">DELETE FROM orders WHERE status = 'CANCELLED' AND placed_at &lt; '2022-01-01'</text>
<text x="24" y="45" font-family="system-ui" font-size="8.5" fill="rgba(139,148,158,0.5)">3 of 24,000 files matched · ~1,200 rows deleted</text>

<!-- ═══ CoW HALF (LEFT) ═══ -->
<rect x="12" y="56" width="368" height="390" rx="10" fill="rgba(88,166,255,0.03)" stroke="rgba(88,166,255,0.2)" stroke-width="1.2"/>
<rect x="12" y="56" width="368" height="26" rx="10" fill="rgba(88,166,255,0.1)"/>
<text x="24" y="74" font-family="system-ui" font-size="11" font-weight="700" fill="#58a6ff">Copy-on-Write (CoW)</text>
<text x="280" y="74" font-family="system-ui" font-size="9" fill="rgba(88,166,255,0.6)">write-heavy cost</text>

<!-- CoW original files -->
<text x="24" y="102" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.6)">Original files (3 affected of 24,000):</text>
${fileCard('del-cow-f0', 24,  108, 'part-0847\n128 MB', '#0d1f3c', '#1f6feb')}
${fileCard('del-cow-f1', 120, 108, 'part-1203\n128 MB', '#0d1f3c', '#1f6feb')}
${fileCard('del-cow-f2', 216, 108, 'part-2891\n128 MB', '#0d1f3c', '#1f6feb')}

<!-- CoW reading indicator -->
<g id="del-cow-reading" opacity="0">
  <rect x="24" y="158" width="278" height="22" rx="4" fill="rgba(88,166,255,0.08)" stroke="#58a6ff" stroke-width="1"/>
  <text x="163" y="173" text-anchor="middle" font-family="system-ui" font-size="9.5" font-weight="600" fill="#58a6ff">Reading 384 MB (3 × 128 MB)…</text>
</g>

<!-- CoW rewrite arrows -->
<g id="del-cow-arrows" opacity="0">
  <line x1="67"  y1="186" x2="67"  y2="216" stroke="#56d364" stroke-width="1.5" marker-end="url(#del-arr-green)"/>
  <line x1="163" y1="186" x2="163" y2="216" stroke="#56d364" stroke-width="1.5" marker-end="url(#del-arr-green)"/>
  <line x1="259" y1="186" x2="259" y2="216" stroke="#56d364" stroke-width="1.5" marker-end="url(#del-arr-green)"/>
  <text x="163" y="210" text-anchor="middle" font-family="system-ui" font-size="8.5" fill="#56d364">filter + rewrite</text>
</g>

<!-- CoW new files (rewritten) -->
<g id="del-cow-newfiles" opacity="0">
  <text x="24" y="226" font-family="system-ui" font-size="9" fill="rgba(86,211,100,0.7)">New files (deleted rows removed):</text>
  ${fileCard('del-cow-nf0', 24,  232, 'part-0847-new\n127.8 MB', '#0a1f10', '#56d364')}
  ${fileCard('del-cow-nf1', 120, 232, 'part-1203-new\n127.9 MB', '#0a1f10', '#56d364')}
  ${fileCard('del-cow-nf2', 216, 232, 'part-2891-new\n128.0 MB', '#0a1f10', '#56d364')}
</g>

<!-- CoW snapshot indicator -->
<g id="del-cow-snap" opacity="0">
  <rect x="24" y="284" width="278" height="44" rx="6" fill="#1a1a2e" stroke="#58a6ff" stroke-width="1.5"/>
  <text x="34" y="303" font-family="system-ui" font-size="9.5" font-weight="600" fill="#58a6ff">New Snapshot</text>
  <text x="34" y="318" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.6)">→ 3 new files + 23,997 unchanged</text>
  <text x="34" y="323" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,0.4)">old files expire on next cleanup</text>
</g>

<!-- CoW write cost badge -->
<g id="del-cow-cost" opacity="0">
  <rect x="24" y="338" width="278" height="34" rx="6" fill="rgba(88,166,255,0.06)" stroke="rgba(88,166,255,0.25)" stroke-width="1"/>
  <text x="34" y="354" font-family="system-ui" font-size="9.5" fill="rgba(88,166,255,0.8)">Write I/O: <tspan font-weight="700" fill="#58a6ff">384 MB</tspan>  Files Rewritten: <tspan font-weight="700" fill="#58a6ff">3</tspan></text>
  <text x="34" y="368" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.6)">Read overhead at query time: None</text>
</g>

<!-- ═══ MoR HALF (RIGHT) ═══ -->
<rect x="390" y="56" width="358" height="390" rx="10" fill="rgba(240,136,62,0.03)" stroke="rgba(240,136,62,0.2)" stroke-width="1.2"/>
<rect x="390" y="56" width="358" height="26" rx="10" fill="rgba(240,136,62,0.1)"/>
<text x="402" y="74" font-family="system-ui" font-size="11" font-weight="700" fill="#f0883e">Merge-on-Read (MoR)</text>
<text x="636" y="74" font-family="system-ui" font-size="9" fill="rgba(240,136,62,0.6)">read-time cost</text>

<!-- MoR original files (unchanged) -->
<text x="402" y="102" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.6)">Original files (unchanged throughout):</text>
${fileCard('del-mor-f0', 402, 108, 'part-0847\n128 MB', '#0d1f3c', '#1f6feb')}
${fileCard('del-mor-f1', 498, 108, 'part-1203\n128 MB', '#0d1f3c', '#1f6feb')}
${fileCard('del-mor-f2', 594, 108, 'part-2891\n128 MB', '#0d1f3c', '#1f6feb')}

<!-- MoR unchanged indicator -->
<g id="del-mor-unchanged" opacity="0">
  <rect x="402" y="158" width="278" height="22" rx="4" fill="rgba(240,136,62,0.08)" stroke="#f0883e" stroke-width="1"/>
  <text x="541" y="173" text-anchor="middle" font-family="system-ui" font-size="9.5" font-weight="600" fill="#f0883e">Original files NOT rewritten ✓</text>
</g>

<!-- MoR delete file -->
<g id="del-mor-delfile" opacity="0">
  <text x="402" y="202" font-family="system-ui" font-size="9" fill="rgba(240,136,62,0.7)">Position-delete file written:</text>
  <rect x="402" y="210" width="186" height="50" rx="6" fill="#1e1408" stroke="#f0883e" stroke-width="1.8"/>
  <text x="416" y="232" font-size="12">📝</text>
  <text x="438" y="229" font-family="ui-monospace" font-size="9" font-weight="600" fill="#e6edf3">deletes.parquet</text>
  <text x="438" y="242" font-family="ui-monospace" font-size="8.5" fill="rgba(240,136,62,0.7)">2.4 KB  position-deletes</text>
  <text x="438" y="254" font-family="ui-monospace" font-size="7.5" fill="rgba(139,148,158,0.4)">(file_path, row_position)</text>
</g>

<!-- MoR snapshot indicator -->
<g id="del-mor-snap" opacity="0">
  <rect x="402" y="270" width="278" height="44" rx="6" fill="#1e1408" stroke="#f0883e" stroke-width="1.5"/>
  <text x="412" y="289" font-family="system-ui" font-size="9.5" font-weight="600" fill="#f0883e">New Snapshot</text>
  <text x="412" y="304" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.6)">→ delete file in manifest + 3 unchanged</text>
  <text x="412" y="317" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,0.4)">0 data files rewritten</text>
</g>

<!-- MoR read-time merge diagram -->
<g id="del-mor-merge" opacity="0">
  <text x="402" y="330" font-family="system-ui" font-size="9" fill="rgba(240,136,62,0.7)">At read time:</text>
  <rect x="402" y="336" width="278" height="44" rx="5" fill="rgba(240,136,62,0.05)" stroke="rgba(240,136,62,0.3)" stroke-width="1"/>
  <text x="412" y="354" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.7)">data file ⊕ delete file → filtered result</text>
  <text x="412" y="370" font-family="system-ui" font-size="8.5" fill="rgba(139,148,158,0.5)">Iceberg reader applies positional deletes</text>
</g>

<!-- MoR write cost badge -->
<g id="del-mor-cost" opacity="0">
  <rect x="402" y="388" width="278" height="34" rx="6" fill="rgba(240,136,62,0.06)" stroke="rgba(240,136,62,0.25)" stroke-width="1"/>
  <text x="412" y="404" font-family="system-ui" font-size="9.5" fill="rgba(240,136,62,0.8)">Write I/O: <tspan font-weight="700" fill="#f0883e">2.4 KB</tspan>  Files Rewritten: <tspan font-weight="700" fill="#f0883e">0</tspan></text>
  <text x="412" y="418" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.6)">Read overhead: small merge at query time</text>
</g>

<!-- Full comparison table (step 8) -->
<g id="del-comparison" opacity="0">
  <rect x="12" y="56" width="736" height="390" rx="10" fill="#0d1117"/>
  <text x="386" y="80" text-anchor="middle" font-family="system-ui" font-size="14" font-weight="700" fill="var(--text-primary)">DELETE Strategy Comparison</text>

  <!-- Table header -->
  <rect x="24" y="90" width="720" height="28" rx="5" fill="var(--bg-3)"/>
  <text x="80"  y="109" font-family="system-ui" font-size="10" font-weight="700" fill="rgba(139,148,158,0.7)" text-anchor="middle">Metric</text>
  <text x="320" y="109" font-family="system-ui" font-size="10" font-weight="700" fill="#58a6ff" text-anchor="middle">Copy-on-Write</text>
  <text x="560" y="109" font-family="system-ui" font-size="10" font-weight="700" fill="#f0883e" text-anchor="middle">Merge-on-Read</text>

  <!-- rows -->
  <rect x="24" y="118" width="720" height="28" rx="0" fill="rgba(88,166,255,0.03)"/>
  <text x="80"  y="136" text-anchor="middle" font-family="system-ui" font-size="10" fill="rgba(139,148,158,0.7)">Write I/O</text>
  <text x="320" y="136" text-anchor="middle" font-family="ui-monospace" font-size="11" font-weight="700" fill="#f85149">384 MB</text>
  <text x="560" y="136" text-anchor="middle" font-family="ui-monospace" font-size="11" font-weight="700" fill="#56d364">2.4 KB</text>

  <rect x="24" y="146" width="720" height="28" rx="0" fill="transparent"/>
  <text x="80"  y="164" text-anchor="middle" font-family="system-ui" font-size="10" fill="rgba(139,148,158,0.7)">Files Rewritten</text>
  <text x="320" y="164" text-anchor="middle" font-family="ui-monospace" font-size="11" font-weight="700" fill="#f85149">3</text>
  <text x="560" y="164" text-anchor="middle" font-family="ui-monospace" font-size="11" font-weight="700" fill="#56d364">0</text>

  <rect x="24" y="174" width="720" height="28" rx="0" fill="rgba(88,166,255,0.03)"/>
  <text x="80"  y="192" text-anchor="middle" font-family="system-ui" font-size="10" fill="rgba(139,148,158,0.7)">Read Overhead</text>
  <text x="320" y="192" text-anchor="middle" font-family="ui-monospace" font-size="11" font-weight="700" fill="#56d364">None</text>
  <text x="560" y="192" text-anchor="middle" font-family="ui-monospace" font-size="11" fill="#e3b341">Small merge cost</text>

  <rect x="24" y="202" width="720" height="28" rx="0" fill="transparent"/>
  <text x="80"  y="220" text-anchor="middle" font-family="system-ui" font-size="10" fill="rgba(139,148,158,0.7)">Best For</text>
  <text x="320" y="220" text-anchor="middle" font-family="system-ui" font-size="10" fill="#58a6ff">Read-heavy analytics</text>
  <text x="560" y="220" text-anchor="middle" font-family="system-ui" font-size="10" fill="#f0883e">Write-heavy / CDC</text>

  <rect x="24" y="230" width="720" height="28" rx="0" fill="rgba(88,166,255,0.03)"/>
  <text x="80"  y="248" text-anchor="middle" font-family="system-ui" font-size="10" fill="rgba(139,148,158,0.7)">Delete File Type</text>
  <text x="320" y="248" text-anchor="middle" font-family="system-ui" font-size="10" fill="rgba(139,148,158,0.5)">N/A (full rewrite)</text>
  <text x="560" y="248" text-anchor="middle" font-family="ui-monospace" font-size="10" fill="#f0883e">position-delete file</text>

  <rect x="24" y="258" width="720" height="28" rx="0" fill="transparent"/>
  <text x="80"  y="276" text-anchor="middle" font-family="system-ui" font-size="10" fill="rgba(139,148,158,0.7)">ShopKart Config</text>
  <text x="320" y="276" text-anchor="middle" font-family="system-ui" font-size="10" fill="#58a6ff">Analytics tables</text>
  <text x="560" y="276" text-anchor="middle" font-family="system-ui" font-size="10" fill="#f0883e">CDC / streaming</text>

  <!-- Summary note -->
  <rect x="24" y="298" width="720" height="56" rx="8" fill="rgba(86,211,100,0.06)" stroke="rgba(86,211,100,0.2)" stroke-width="1"/>
  <text x="386" y="320" text-anchor="middle" font-family="system-ui" font-size="11" font-weight="600" fill="#56d364">ShopKart uses both strategies</text>
  <text x="386" y="338" text-anchor="middle" font-family="system-ui" font-size="9.5" fill="rgba(139,148,158,0.7)">CoW: order_analytics, reporting tables — low write frequency, heavy BI reads</text>
  <text x="386" y="352" text-anchor="middle" font-family="system-ui" font-size="9.5" fill="rgba(139,148,158,0.7)">MoR: order_status_live, CDC tables — high write frequency, 5,000 updates/sec</text>
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
        show('del-cow-f0', 'blue');
        show('del-cow-f1', 'blue');
        show('del-cow-f2', 'blue');
        show('del-mor-f0', 'blue');
        show('del-mor-f1', 'blue');
        show('del-mor-f2', 'blue');
      }, (ctx) => {
        unglow('del-cow-f0'); unglow('del-cow-f1'); unglow('del-cow-f2');
        unglow('del-mor-f0'); unglow('del-mor-f1'); unglow('del-mor-f2');
      }, 2500),

      AE.fnStep('CoW: Read Full Files', '', (ctx) => {
        show('del-cow-reading', 'blue');
        unglow('del-mor-f0'); unglow('del-mor-f1'); unglow('del-mor-f2');
      }, (ctx) => {
        hide('del-cow-reading');
      }, 2800),

      AE.fnStep('CoW: Filter & Rewrite', '', (ctx) => {
        hide('del-cow-reading');
        show('del-cow-arrows');
        show('del-cow-newfiles', 'green');
      }, (ctx) => {
        hide('del-cow-arrows');
        hide('del-cow-newfiles');
      }, 3000),

      AE.fnStep('CoW: Snapshot Committed', '', (ctx) => {
        hide('del-cow-arrows');
        unglow('del-cow-f0'); unglow('del-cow-f1'); unglow('del-cow-f2');
        const f0 = g('del-cow-f0'), f1 = g('del-cow-f1'), f2 = g('del-cow-f2');
        if (f0) f0.setAttribute('opacity', '0.3');
        if (f1) f1.setAttribute('opacity', '0.3');
        if (f2) f2.setAttribute('opacity', '0.3');
        show('del-cow-snap', 'blue');
        show('del-cow-cost');
      }, (ctx) => {
        const f0 = g('del-cow-f0'), f1 = g('del-cow-f1'), f2 = g('del-cow-f2');
        if (f0) f0.setAttribute('opacity', '1');
        if (f1) f1.setAttribute('opacity', '1');
        if (f2) f2.setAttribute('opacity', '1');
        hide('del-cow-snap');
        hide('del-cow-cost');
      }, 3000),

      AE.fnStep('MoR: Write Delete File', '', (ctx) => {
        show('del-mor-unchanged', 'orange');
        show('del-mor-delfile', 'orange');
      }, (ctx) => {
        hide('del-mor-unchanged');
        hide('del-mor-delfile');
      }, 3000),

      AE.fnStep('MoR: Snapshot Committed', '', (ctx) => {
        hide('del-mor-unchanged');
        show('del-mor-snap', 'orange');
      }, (ctx) => {
        hide('del-mor-snap');
      }, 2800),

      AE.fnStep('MoR: Read-time Merge', '', (ctx) => {
        show('del-mor-merge', 'orange');
        show('del-mor-cost');
      }, (ctx) => {
        hide('del-mor-merge');
        hide('del-mor-cost');
      }, 3000),

      AE.fnStep('Strategy Comparison', '', (ctx) => {
        show('del-comparison');
      }, (ctx) => {
        hide('del-comparison');
      }, 5000),
    ];
  }

  /* ── Sidebar wiring ─────────────────────────────────────── */
  function _buildSidebar(page, engine, stepsData) {
    const list    = page.querySelector('#del-steps-list');
    const titleEl = page.querySelector('#del-step-title');
    const descEl  = page.querySelector('#del-step-desc');
    if (!list) return;

    list.innerHTML = stepsData.map((s, i) => `
      <div class="del-step-item" data-step="${i}">
        <div class="del-step-badge">${i + 1}</div>
        <div class="del-step-text">${s.label}</div>
      </div>
    `).join('');

    engine.on('stepchange', (idx) => {
      list.querySelectorAll('.del-step-item').forEach((el, i) => {
        el.classList.toggle('active', i === idx);
        el.classList.toggle('done', i < idx);
      });
      const step = idx >= 0 ? stepsData[idx] : null;
      if (titleEl) titleEl.textContent = step ? step.label : 'Press Play to begin';
      if (descEl)  descEl.textContent  = step ? step.desc  : 'Compare CoW and MoR DELETE strategies side-by-side. Same data, very different trade-offs.';
      const active = list.querySelector('.del-step-item.active');
      if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });

    list.addEventListener('click', (e) => {
      const item = e.target.closest('[data-step]');
      if (item) engine.goto(parseInt(item.dataset.step, 10));
    });
  }

  /* ── Module ─────────────────────────────────────────────── */
  const mod = {
    id: 'delete',
    title: 'DELETE',
    group: 'write-ops',
    _engine: null,

    render(container) {
      container.innerHTML = '';
      _injectStyles();

      const page = document.createElement('div');
      page.className = 'del-page page-enter';
      page.innerHTML = `
        <div class="del-outer">
          <div class="del-canvas" id="del-canvas"></div>
          <div class="del-sidebar">
            <div class="del-sidebar-header">
              <div class="del-sidebar-title" id="del-step-title">Press Play to begin</div>
              <div class="del-sidebar-desc" id="del-step-desc">Compare CoW and MoR DELETE strategies side-by-side. Same data — very different write/read trade-offs.</div>
            </div>
            <div class="del-steps-list" id="del-steps-list"></div>
            <div class="del-info-panel">
              <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;font-weight:600;">Quick Reference</div>
              <table class="del-compare-table">
                <thead>
                  <tr>
                    <th></th>
                    <th class="cow">CoW</th>
                    <th class="mor">MoR</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="metric">Write I/O</td>
                    <td class="val-cow">384 MB</td>
                    <td class="val-mor">2.4 KB</td>
                  </tr>
                  <tr>
                    <td class="metric">Files Rewritten</td>
                    <td class="val-cow">3</td>
                    <td class="val-mor">0</td>
                  </tr>
                  <tr>
                    <td class="metric">Read Overhead</td>
                    <td class="val-cow">None</td>
                    <td class="val-mor">merge cost</td>
                  </tr>
                  <tr>
                    <td class="metric">Best For</td>
                    <td style="color:var(--blue);font-size:10px;">Read-heavy</td>
                    <td style="color:var(--orange);font-size:10px;">Write-heavy</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
      container.appendChild(page);

      const svg       = _buildSVG();
      page.querySelector('#del-canvas').appendChild(svg);

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
      document.getElementById('del-styles')?.remove();
    },
  };

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.modules = window.IcebergViz.modules || {};
  window.IcebergViz.modules['delete'] = mod;
})();
