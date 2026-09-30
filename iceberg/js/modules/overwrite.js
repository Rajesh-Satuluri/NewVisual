/* ============================================================
   Overwrite Module
   Animated 8-step walkthrough of INSERT OVERWRITE with Dynamic
   Partition Overwrite (DPO): scan source, detect affected
   partitions, compute aggregates, atomically replace only the
   touched partitions, leave all others untouched.
   ShopKart: daily ETL refreshing December 2024 aggregates.
   ============================================================ */

(function () {
  'use strict';

  const IV = window.IcebergViz;

  /* ── Styles ─────────────────────────────────────────────── */
  function _injectStyles() {
    if (document.getElementById('ow-styles')) return;
    const s = document.createElement('style');
    s.id = 'ow-styles';
    s.textContent = `
.ow-page { display:flex; flex-direction:column; height:100%; overflow:hidden; }

.ow-outer {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.ow-canvas {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: var(--bg-1);
  overflow: hidden;
  position: relative;
}

.ow-sidebar {
  width: 360px;
  border-left: 1px solid var(--border-default);
  background: var(--bg-2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.ow-sidebar-header {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-default);
  flex-shrink: 0;
}

.ow-sidebar-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.ow-sidebar-desc {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  line-height: 1.55;
  min-height: 52px;
}

.ow-steps-list {
  flex: 0 0 auto;
  overflow-y: auto;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-default);
  max-height: 270px;
}

.ow-step-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 7px 16px;
  cursor: pointer;
  transition: background 0.12s;
  border-left: 3px solid transparent;
}
.ow-step-item:hover { background: var(--bg-3); }
.ow-step-item.active { background: rgba(74,174,255,0.07); border-left-color: var(--blue); }
.ow-step-item.done { opacity: 0.6; }

.ow-step-badge {
  width: 20px; height: 20px;
  border-radius: 50%;
  background: var(--bg-4);
  color: var(--text-muted);
  font-size: 10px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-top: 1px;
  transition: background 0.12s, color 0.12s;
}
.ow-step-item.active .ow-step-badge { background: var(--blue); color: #fff; }
.ow-step-item.done .ow-step-badge   { background: var(--green); color: #fff; }

.ow-step-text { font-size: 12px; color: var(--text-secondary); line-height: 1.4; }
.ow-step-item.active .ow-step-text { color: var(--text-primary); font-weight: 500; }

.ow-code-panel {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.ow-sql-block {
  background: var(--bg-3);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 10px 12px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-secondary);
  line-height: 1.65;
  white-space: pre;
  overflow-x: auto;
  margin-bottom: 10px;
}

.ow-kw  { color: var(--blue); font-weight: 600; }
.ow-fn  { color: var(--purple); }
.ow-str { color: var(--orange); }
.ow-cmt { color: var(--text-muted); }

.ow-info-label {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
  margin-top: 10px;
}

.ow-stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.ow-stat-card {
  background: var(--bg-3);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 9px 11px;
}

.ow-stat-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 3px; }
.ow-stat-value { font-size: 14px; font-weight: 700; color: var(--text-primary); font-family: var(--font-mono); }
.ow-stat-sub   { font-size: 10px; color: var(--text-muted); margin-top: 2px; }
.ow-stat-value.green  { color: var(--green); }
.ow-stat-value.blue   { color: var(--blue); }
.ow-stat-value.orange { color: var(--orange); }
`;
    document.head.appendChild(s);
  }

  /* ── Step metadata ──────────────────────────────────────── */
  function _getStepDescs() {
    return [
      { label: 'Query Submitted',
        desc: 'INSERT OVERWRITE submitted with Dynamic Partition Overwrite mode (spark.sql.sources.partitionOverwriteMode=dynamic). Only partitions containing new data will be replaced.' },
      { label: 'Source Scan',
        desc: 'Iceberg scan plan: only files in the order_date BETWEEN \'2024-12-01\' AND \'2024-12-31\' range loaded. 186 source files out of 24,000 total.' },
      { label: 'Identify Affected Partitions',
        desc: 'DPO inspects the new data to determine which output partitions will be written. Only 3 partition groups identified (BR, US, DE × Dec 2024).' },
      { label: 'Compute Aggregates + Write',
        desc: 'Spark computes GROUP BY aggregates and writes 3 compact Parquet files. Much smaller than source: 24M raw rows → 93 aggregate rows per country-day.' },
      { label: 'Snapshot Captures Atomically',
        desc: 'The overwrite snapshot records both the removals (old Dec 2024 files) AND the additions (new aggregate files) atomically. No partial state is ever visible.' },
      { label: 'Atomic Replacement',
        desc: 'New snapshot goes live: old Dec 2024 partition files replaced by new aggregate files. Readers mid-query on dec 2024 data see consistent old state until the commit lands.' },
      { label: 'DPO vs Full Overwrite',
        desc: 'Full overwrite (INSERT OVERWRITE in Hive) would rewrite all 360 partitions — 38.4 TB of data. DPO cost is proportional to affected partitions only.' },
      { label: 'Other Partitions Untouched',
        desc: '357 partitions from November 2024 and earlier are completely untouched. ShopKart runs 31 such daily refreshes per month — each touches only its own date partitions.' },
    ];
  }

  /* ── Build partition grid (used in SVG) ─────────────────── */
  function _buildPartitionGrid() {
    // 4 rows × 6 cols = 24 squares representing month/country combos
    // Bottom row (index 18-23) = Dec 2024 BR/US/DE (affected) + 3 others
    const cells = [];
    const cols = 6, rows = 4;
    const sx = 598, sy = 32, cw = 40, ch = 36, gap = 4;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const x = sx + c * (cw + gap);
        const y = sy + r * (ch + gap);
        // Last row, first 3 cells = Dec 2024 affected
        const isAffected = (r === rows - 1 && c < 3);
        cells.push({ idx, x, y, isAffected });
      }
    }
    return cells;
  }

  /* ── SVG ────────────────────────────────────────────────── */
  function _buildSVG() {
    const W = 860, H = 440;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.maxWidth = W + 'px';
    svg.style.maxHeight = H + 'px';
    svg.id = 'ow-svg';

    const gridCells = _buildPartitionGrid();

    // Build partition grid SVG elements
    const gridSvg = gridCells.map(cell => {
      const baseColor = cell.isAffected ? '#1a1030' : '#0d1117';
      const baseBorder = cell.isAffected ? '#2a1a40' : '#1c2128';
      const label = cell.isAffected ? ['BR','US','DE'][cell.idx - 18] : '';
      const rowLabel = ['Nov','Oct','Sep','Dec'][Math.floor(cell.idx / 6)];
      return `
        <g id="ow-cell-${cell.idx}">
          <rect x="${cell.x}" y="${cell.y}" width="40" height="36" rx="4"
            fill="${baseColor}" stroke="${baseBorder}" stroke-width="1"/>
          ${label ? `<text x="${cell.x+20}" y="${cell.y+14}" text-anchor="middle" font-family="ui-monospace" font-size="7.5" fill="rgba(163,113,247,0.6)">${label}</text>` : ''}
          <text x="${cell.x+20}" y="${cell.y+26}" text-anchor="middle" font-family="ui-monospace" font-size="7" fill="rgba(139,148,158,0.3)">${rowLabel}</text>
        </g>
      `;
    }).join('');

    // Highlight overlays for affected cells (step 6)
    const affectedHighlights = gridCells.filter(c => c.isAffected).map(cell => `
      <rect id="ow-cell-aff-${cell.idx}" x="${cell.x-1}" y="${cell.y-1}" width="42" height="38" rx="5"
        fill="rgba(86,211,100,0.15)" stroke="#56d364" stroke-width="1.5" opacity="0"/>
    `).join('');

    // Old affected cells (grey overlay for replacement)
    const oldCellOverlays = gridCells.filter(c => c.isAffected).map(cell => `
      <rect id="ow-cell-old-${cell.idx}" x="${cell.x-1}" y="${cell.y-1}" width="42" height="38" rx="5"
        fill="rgba(248,81,73,0.12)" stroke="rgba(248,81,73,0.4)" stroke-width="1.5" opacity="0"/>
    `).join('');

    // Full overwrite highlight (all cells) for step 7
    const allHighlights = gridCells.map(cell => `
      <rect id="ow-full-${cell.idx}" x="${cell.x-1}" y="${cell.y-1}" width="42" height="38" rx="5"
        fill="rgba(248,81,73,0.12)" stroke="rgba(248,81,73,0.3)" stroke-width="1" opacity="0"/>
    `).join('');

    svg.innerHTML = `
<defs>
  <marker id="ow-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M0 0L10 5L0 10z" fill="#484f58"/>
  </marker>
  <marker id="ow-arr-blue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M0 0L10 5L0 10z" fill="#58a6ff"/>
  </marker>
  <marker id="ow-arr-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M0 0L10 5L0 10z" fill="#56d364"/>
  </marker>
  <marker id="ow-arr-orange" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M0 0L10 5L0 10z" fill="#f0883e"/>
  </marker>
</defs>
<rect width="${W}" height="${H}" fill="#090d14"/>
<text x="12" y="14" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.4)" font-weight="600" letter-spacing="1">ShopKart Dynamic Partition Overwrite — Daily Aggregation ETL</text>

<!-- ═══ LEFT: Source ═══ -->
<g id="ow-source-box">
  <rect x="12" y="26" width="170" height="72" rx="7" fill="#0d1f3c" stroke="#1f6feb" stroke-width="1.4"/>
  <text x="24" y="46" font-family="system-ui" font-size="10.5" font-weight="700" fill="#e6edf3">Source: prod.orders</text>
  <text x="24" y="61" font-family="ui-monospace" font-size="8.5" fill="rgba(88,166,255,0.6)">24M rows — Dec 2024</text>
  <text x="24" y="75" font-family="ui-monospace" font-size="8.5" fill="rgba(88,166,255,0.6)">24,000 total files</text>
  <text x="24" y="89" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,0.4)">Airflow · 02:00 UTC</text>
</g>
<rect id="ow-hl-source" x="10" y="24" width="174" height="76" rx="8" fill="none" stroke="#58a6ff" stroke-width="2.5" opacity="0"/>

<!-- Source scan info (step 2) -->
<g id="ow-source-scan" opacity="0">
  <rect x="12" y="110" width="170" height="46" rx="6" fill="#0a1117" stroke="#e3b341" stroke-width="1"/>
  <text x="24" y="128" font-family="ui-monospace" font-size="8.5" font-weight="600" fill="rgba(227,179,65,0.8)">Scan plan:</text>
  <text x="24" y="142" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,0.7)">186 / 24,000 files</text>
  <text x="24" y="152" font-family="ui-monospace" font-size="8" fill="rgba(86,211,100,0.6)">99.2% skip rate!</text>
</g>

<!-- ═══ CENTER: DPO Engine ═══ -->
<g id="ow-dpo-box">
  <rect x="250" y="80" width="196" height="80" rx="8" fill="#0d1a10" stroke="#56d364" stroke-width="1.5"/>
  <text x="266" y="104" font-family="system-ui" font-size="11" font-weight="700" fill="#e6edf3">DPO Engine</text>
  <text x="266" y="120" font-family="ui-monospace" font-size="8.5" fill="rgba(86,211,100,0.6)">partitionOverwriteMode</text>
  <text x="266" y="133" font-family="ui-monospace" font-size="8.5" fill="rgba(86,211,100,0.6)">= dynamic</text>
  <text x="266" y="148" font-family="system-ui" font-size="8" fill="rgba(139,148,158,0.4)">detect → compute → replace</text>
</g>
<rect id="ow-hl-dpo" x="248" y="78" width="200" height="84" rx="9" fill="none" stroke="#56d364" stroke-width="2.5" opacity="0"/>

<!-- DPO partition detection (step 3) -->
<g id="ow-dpo-detect" opacity="0">
  <rect x="250" y="174" width="196" height="70" rx="6" fill="#0a1117" stroke="#56d364" stroke-width="1"/>
  <text x="264" y="192" font-family="system-ui" font-size="8.5" font-weight="600" fill="rgba(86,211,100,0.8)">Detected output partitions:</text>
  <text x="264" y="208" font-family="ui-monospace" font-size="8" fill="#e6edf3">country=BR × Dec 2024</text>
  <text x="264" y="220" font-family="ui-monospace" font-size="8" fill="#e6edf3">country=US × Dec 2024</text>
  <text x="264" y="232" font-family="ui-monospace" font-size="8" fill="#e6edf3">country=DE × Dec 2024</text>
  <text x="264" y="237" font-family="ui-monospace" font-size="8" fill="rgba(86,211,100,0.6)"> → 3 of 360 partitions</text>
</g>

<!-- New files written (step 4) -->
<g id="ow-new-files" opacity="0">
  <rect x="250" y="254" width="196" height="56" rx="6" fill="#0a1117" stroke="#56d364" stroke-width="1"/>
  <text x="264" y="272" font-family="system-ui" font-size="8.5" font-weight="600" fill="#56d364">3 new aggregate files:</text>
  <text x="264" y="287" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,0.7)">orders_agg_BR_2024-12.parquet</text>
  <text x="264" y="299" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,0.7)">orders_agg_US_2024-12.parquet</text>
  <text x="264" y="311" font-family="ui-monospace" font-size="8" fill="rgba(86,211,100,0.6)">892 KB total (24M → 93 rows/day)</text>
</g>

<!-- Snapshot diff (step 5) -->
<g id="ow-snap-diff" opacity="0">
  <rect x="250" y="324" width="196" height="90" rx="6" fill="#0a1117" stroke="#bc8cff" stroke-width="1.2"/>
  <text x="264" y="343" font-family="system-ui" font-size="8.5" font-weight="600" fill="rgba(188,140,255,0.9)">Overwrite Snapshot Diff:</text>
  <text x="264" y="359" font-family="system-ui" font-size="8" fill="rgba(248,81,73,0.7)">DELETE:</text>
  <text x="264" y="371" font-family="ui-monospace" font-size="8" fill="rgba(248,81,73,0.7)">  3 old files (BR/US/DE Dec 2024)</text>
  <text x="264" y="385" font-family="system-ui" font-size="8" fill="rgba(86,211,100,0.7)">ADD:</text>
  <text x="264" y="397" font-family="ui-monospace" font-size="8" fill="rgba(86,211,100,0.7)">  3 new aggregate files</text>
  <text x="264" y="407" font-family="system-ui" font-size="7.5" fill="rgba(139,148,158,0.6)">Atomically — no partial state visible</text>
</g>

<!-- ═══ ARROWS ═══ -->
<line x1="182" y1="62" x2="248" y2="110" stroke="#30363d" stroke-width="1.2" marker-end="url(#ow-arr)"/>

<g id="ow-scan-arrow" opacity="0">
  <line x1="182" y1="62" x2="248" y2="102" stroke="#58a6ff" stroke-width="1.8" marker-end="url(#ow-arr-blue)"/>
  <text x="196" y="72" font-family="system-ui" font-size="8" fill="rgba(88,166,255,0.7)">186 files</text>
</g>

<g id="ow-write-arrow" opacity="0">
  <line x1="446" y1="120" x2="590" y2="195" stroke="#56d364" stroke-width="1.8" marker-end="url(#ow-arr-green)"/>
  <text x="490" y="148" font-family="system-ui" font-size="8" fill="rgba(86,211,100,0.7)">3 new files</text>
</g>

<!-- ═══ RIGHT: Partition Grid ═══ -->
<text x="598" y="26" font-family="system-ui" font-size="9" font-weight="700" fill="rgba(139,148,158,0.6)">Target: prod.order_aggregates</text>
<text x="598" y="38" font-family="system-ui" font-size="8" fill="rgba(139,148,158,0.4)">24 partitions shown (4 months × 6 countries)</text>

${gridSvg}
${affectedHighlights}
${oldCellOverlays}
${allHighlights}

<!-- Grid legend -->
<rect x="598" y="204" width="120" height="20" rx="3" fill="rgba(86,211,100,0.1)" stroke="rgba(86,211,100,0.3)" stroke-width="1"/>
<text x="608" y="217" font-family="system-ui" font-size="8" fill="rgba(86,211,100,0.7)">Dec 2024 (affected)</text>

<!-- DPO vs Full comparison (step 7) -->
<g id="ow-dpo-compare" opacity="0">
  <rect x="12" y="26" width="826" height="388" rx="8" fill="#0d1117" stroke="#30363d" stroke-width="1.2"/>
  <text x="28" y="54" font-family="system-ui" font-size="13" font-weight="700" fill="#e6edf3">DPO vs Full INSERT OVERWRITE</text>

  <!-- DPO side -->
  <rect x="20" y="68" width="400" height="300" rx="7" fill="rgba(86,211,100,0.04)" stroke="rgba(86,211,100,0.25)" stroke-width="1"/>
  <text x="220" y="94" text-anchor="middle" font-family="system-ui" font-size="11" font-weight="700" fill="#56d364">Dynamic Partition Overwrite (DPO)</text>
  <text x="220" y="112" text-anchor="middle" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.8)">partitionOverwriteMode = dynamic</text>

  <text x="40" y="136" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.8)">Partitions touched:</text>
  <text x="380" y="136" text-anchor="end" font-family="ui-monospace" font-size="9" font-weight="700" fill="#56d364">3 of 360</text>
  <text x="40" y="154" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.8)">Files replaced:</text>
  <text x="380" y="154" text-anchor="end" font-family="ui-monospace" font-size="9" font-weight="700" fill="#56d364">3 files</text>
  <text x="40" y="172" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.8)">Data rewritten:</text>
  <text x="380" y="172" text-anchor="end" font-family="ui-monospace" font-size="9" font-weight="700" fill="#56d364">892 KB</text>
  <text x="40" y="190" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.8)">Other partitions:</text>
  <text x="380" y="190" text-anchor="end" font-family="ui-monospace" font-size="9" font-weight="700" fill="#56d364">Untouched ✓</text>
  <text x="40" y="208" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.8)">Monthly cost (31 runs):</text>
  <text x="380" y="208" text-anchor="end" font-family="ui-monospace" font-size="9" font-weight="700" fill="#56d364">~$0.04</text>

  <!-- Visual: 3 cells highlighted -->
  <rect x="36" y="228" width="168" height="36" rx="5" fill="#1a0f30" stroke="rgba(163,113,247,0.4)" stroke-width="1"/>
  <text x="120" y="249" text-anchor="middle" font-family="system-ui" font-size="8.5" fill="rgba(163,113,247,0.8)">3 partitions replaced</text>
  <rect x="212" y="228" width="168" height="36" rx="5" fill="#0d1117" stroke="#1c2128" stroke-width="1"/>
  <text x="296" y="249" text-anchor="middle" font-family="system-ui" font-size="8.5" fill="rgba(139,148,158,0.4)">357 partitions untouched</text>

  <rect x="36" y="280" width="344" height="56" rx="5" fill="rgba(86,211,100,0.06)" stroke="rgba(86,211,100,0.2)" stroke-width="1"/>
  <text x="208" y="300" text-anchor="middle" font-family="system-ui" font-size="9.5" font-weight="700" fill="#56d364">Proportional cost = 3/360 = 0.83% of full overwrite</text>
  <text x="208" y="316" text-anchor="middle" font-family="system-ui" font-size="8.5" fill="rgba(86,211,100,0.7)">Cost scales with data affected, not table size</text>
  <text x="208" y="330" text-anchor="middle" font-family="system-ui" font-size="8.5" fill="rgba(86,211,100,0.6)">Each daily run: only Dec touched. Nov, Oct untouched.</text>

  <!-- Full Overwrite side -->
  <rect x="430" y="68" width="400" height="300" rx="7" fill="rgba(248,81,73,0.04)" stroke="rgba(248,81,73,0.2)" stroke-width="1"/>
  <text x="630" y="94" text-anchor="middle" font-family="system-ui" font-size="11" font-weight="700" fill="#f85149">Full INSERT OVERWRITE (Hive-style)</text>
  <text x="630" y="112" text-anchor="middle" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.8)">partitionOverwriteMode = static</text>

  <text x="448" y="136" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.8)">Partitions touched:</text>
  <text x="812" y="136" text-anchor="end" font-family="ui-monospace" font-size="9" font-weight="700" fill="#f85149">360 of 360</text>
  <text x="448" y="154" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.8)">Files replaced:</text>
  <text x="812" y="154" text-anchor="end" font-family="ui-monospace" font-size="9" font-weight="700" fill="#f85149">24,000 files</text>
  <text x="448" y="172" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.8)">Data rewritten:</text>
  <text x="812" y="172" text-anchor="end" font-family="ui-monospace" font-size="9" font-weight="700" fill="#f85149">38.4 TB</text>
  <text x="448" y="190" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.8)">Other partitions:</text>
  <text x="812" y="190" text-anchor="end" font-family="ui-monospace" font-size="9" font-weight="700" fill="#f85149">Wiped &amp; rewritten</text>
  <text x="448" y="208" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.8)">Monthly cost (31 runs):</text>
  <text x="812" y="208" text-anchor="end" font-family="ui-monospace" font-size="9" font-weight="700" fill="#f85149">~$4,800</text>

  <!-- Visual: all cells red -->
  <rect x="444" y="228" width="378" height="36" rx="5" fill="rgba(248,81,73,0.12)" stroke="rgba(248,81,73,0.3)" stroke-width="1"/>
  <text x="633" y="249" text-anchor="middle" font-family="system-ui" font-size="8.5" fill="#f85149">All 360 partitions truncated and rewritten</text>

  <rect x="444" y="280" width="378" height="56" rx="5" fill="rgba(248,81,73,0.06)" stroke="rgba(248,81,73,0.2)" stroke-width="1"/>
  <text x="633" y="300" text-anchor="middle" font-family="system-ui" font-size="9.5" font-weight="700" fill="#f85149">Fixed cost = full table regardless of what changed</text>
  <text x="633" y="316" text-anchor="middle" font-family="system-ui" font-size="8.5" fill="rgba(248,81,73,0.7)">38.4 TB I/O every run — no matter how small the change</text>
  <text x="633" y="330" text-anchor="middle" font-family="system-ui" font-size="8.5" fill="rgba(248,81,73,0.6)">Concurrent readers see empty table during overwrite!</text>
</g>

<!-- Concurrent query badge (step 8) -->
<g id="ow-concurrent-query" opacity="0">
  <rect x="12" y="340" width="576" height="48" rx="6" fill="#0d1117" stroke="#58a6ff" stroke-width="1.2"/>
  <text x="28" y="358" font-family="system-ui" font-size="8.5" font-weight="600" fill="rgba(88,166,255,0.8)">Concurrent query on untouched partition:</text>
  <text x="28" y="374" font-family="ui-monospace" font-size="8.5" fill="#e6edf3">SELECT * FROM order_aggregates WHERE country='BR' AND order_day='2024-11-15'</text>
  <text x="28" y="382" font-family="system-ui" font-size="8" fill="rgba(86,211,100,0.6)">  → Returns results normally. Zero impact from Dec 2024 overwrite.</text>
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
      if (glowColor === 'blue')   el.style.filter = 'drop-shadow(0 0 8px rgba(88,166,255,0.7))';
      if (glowColor === 'green')  el.style.filter = 'drop-shadow(0 0 8px rgba(86,211,100,0.7))';
      if (glowColor === 'orange') el.style.filter = 'drop-shadow(0 0 8px rgba(240,136,62,0.7))';
      if (glowColor === 'yellow') el.style.filter = 'drop-shadow(0 0 8px rgba(227,179,65,0.7))';
      if (glowColor === 'purple') el.style.filter = 'drop-shadow(0 0 8px rgba(188,140,255,0.7))';
    }
    function hide(id) {
      const el = g(id);
      if (el) { el.setAttribute('opacity', '0'); el.style.filter = ''; }
    }
    function unglow(id) {
      const el = g(id);
      if (el) el.style.filter = '';
    }

    // Helper to show/hide partition cell highlights
    function showAffectedCells(prefix, opacity) {
      [18, 19, 20].forEach(idx => {
        const el = g(`${prefix}${idx}`);
        if (el) el.setAttribute('opacity', String(opacity));
      });
    }
    function showAllCells(prefix, opacity) {
      for (let i = 0; i < 24; i++) {
        const el = g(`${prefix}${i}`);
        if (el) el.setAttribute('opacity', String(opacity));
      }
    }

    return [
      AE.fnStep('Query Submitted', '', () => {
        show('ow-hl-source', 'blue');
      }, () => {
        hide('ow-hl-source');
      }, 2400),

      AE.fnStep('Source Scan', '', () => {
        unglow('ow-hl-source');
        show('ow-scan-arrow');
        show('ow-source-scan');
      }, () => {
        hide('ow-scan-arrow');
        hide('ow-source-scan');
      }, 2800),

      AE.fnStep('Identify Affected Partitions', '', () => {
        hide('ow-scan-arrow');
        show('ow-hl-dpo', 'green');
        show('ow-dpo-detect');
        showAffectedCells('ow-cell-aff-', 1);
      }, () => {
        hide('ow-hl-dpo');
        hide('ow-dpo-detect');
        showAffectedCells('ow-cell-aff-', 0);
      }, 3000),

      AE.fnStep('Compute Aggregates + Write', '', () => {
        unglow('ow-hl-dpo');
        show('ow-hl-dpo', 'green');
        show('ow-new-files');
        show('ow-write-arrow');
        showAffectedCells('ow-cell-aff-', 1);
      }, () => {
        hide('ow-hl-dpo');
        hide('ow-new-files');
        hide('ow-write-arrow');
        showAffectedCells('ow-cell-aff-', 0);
      }, 2800),

      AE.fnStep('Snapshot Captures Atomically', '', () => {
        unglow('ow-hl-dpo');
        show('ow-snap-diff', 'purple');
        showAffectedCells('ow-cell-old-', 1);
        showAffectedCells('ow-cell-aff-', 1);
      }, () => {
        hide('ow-snap-diff');
        showAffectedCells('ow-cell-old-', 0);
        showAffectedCells('ow-cell-aff-', 0);
      }, 3000),

      AE.fnStep('Atomic Replacement', '', () => {
        hide('ow-snap-diff');
        showAffectedCells('ow-cell-old-', 0);
        showAffectedCells('ow-cell-aff-', 1);
        show('ow-hl-dpo', 'green');
      }, () => {
        hide('ow-hl-dpo');
        showAffectedCells('ow-cell-aff-', 0);
      }, 2600),

      AE.fnStep('DPO vs Full Overwrite', '', () => {
        unglow('ow-hl-dpo');
        showAffectedCells('ow-cell-aff-', 0);
        hide('ow-source-scan');
        hide('ow-dpo-detect');
        hide('ow-new-files');
        hide('ow-write-arrow');
        show('ow-dpo-compare');
      }, () => {
        hide('ow-dpo-compare');
      }, 5000),

      AE.fnStep('Other Partitions Untouched', '', () => {
        hide('ow-dpo-compare');
        showAllCells('ow-full-', 0);
        showAffectedCells('ow-cell-aff-', 1);
        show('ow-concurrent-query');
      }, () => {
        showAffectedCells('ow-cell-aff-', 0);
        showAllCells('ow-full-', 0);
        hide('ow-concurrent-query');
      }, 4000),
    ];
  }

  /* ── Sidebar ────────────────────────────────────────────── */
  function _buildSidebar(page, engine, stepsData) {
    const list    = page.querySelector('#ow-steps-list');
    const titleEl = page.querySelector('#ow-step-title');
    const descEl  = page.querySelector('#ow-step-desc');
    if (!list) return;

    list.innerHTML = stepsData.map((s, i) => `
      <div class="ow-step-item" data-step="${i}">
        <div class="ow-step-badge">${i + 1}</div>
        <div class="ow-step-text">${s.label}</div>
      </div>
    `).join('');

    engine.on('stepchange', (idx) => {
      list.querySelectorAll('.ow-step-item').forEach((el, i) => {
        el.classList.toggle('active', i === idx);
        el.classList.toggle('done', i < idx);
      });
      const step = idx >= 0 ? stepsData[idx] : null;
      if (titleEl) titleEl.textContent = step ? step.label : 'Press Play to begin';
      if (descEl)  descEl.textContent  = step ? step.desc  : 'See how DPO replaces only 3 of 360 partitions — saving 99.2% of compute vs a full table overwrite.';
      const active = list.querySelector('.ow-step-item.active');
      if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });

    list.addEventListener('click', (e) => {
      const item = e.target.closest('[data-step]');
      if (item) engine.goto(parseInt(item.dataset.step, 10));
    });
  }

  /* ── Module ─────────────────────────────────────────────── */
  const mod = {
    id: 'overwrite',
    title: 'INSERT OVERWRITE',
    group: 'write-ops',
    _engine: null,

    render(container) {
      container.innerHTML = '';
      _injectStyles();

      const page = document.createElement('div');
      page.className = 'ow-page page-enter';
      page.innerHTML = `
        <div class="ow-outer">
          <div class="ow-canvas" id="ow-canvas"></div>
          <div class="ow-sidebar">
            <div class="ow-sidebar-header">
              <div class="ow-sidebar-title" id="ow-step-title">Press Play to begin</div>
              <div class="ow-sidebar-desc" id="ow-step-desc">See how DPO replaces only 3 of 360 partitions — saving 99.2% of compute vs a full table overwrite.</div>
            </div>
            <div class="ow-steps-list" id="ow-steps-list"></div>
            <div class="ow-code-panel">
              <div class="ow-info-label">Overwrite Query</div>
              <div class="ow-sql-block"><span class="ow-cmt">-- Dynamic Partition Overwrite</span>
<span class="ow-kw">INSERT OVERWRITE</span> prod.order_aggregates
<span class="ow-kw">SELECT</span> country,
  <span class="ow-fn">DATE_TRUNC</span>(<span class="ow-str">'day'</span>, order_date) <span class="ow-kw">AS</span> order_day,
  <span class="ow-fn">COUNT</span>(*)              <span class="ow-kw">AS</span> order_count,
  <span class="ow-fn">SUM</span>(total_amount)     <span class="ow-kw">AS</span> daily_revenue
<span class="ow-kw">FROM</span>   prod.orders
<span class="ow-kw">WHERE</span>  order_date <span class="ow-kw">BETWEEN</span>
  <span class="ow-str">'2024-12-01'</span> <span class="ow-kw">AND</span> <span class="ow-str">'2024-12-31'</span>
<span class="ow-kw">GROUP BY</span> 1, 2</div>
              <div class="ow-info-label">DPO Statistics</div>
              <div class="ow-stat-grid">
                <div class="ow-stat-card">
                  <div class="ow-stat-label">Source Files</div>
                  <div class="ow-stat-value blue">186</div>
                  <div class="ow-stat-sub">of 24,000 total</div>
                </div>
                <div class="ow-stat-card">
                  <div class="ow-stat-label">Partitions Hit</div>
                  <div class="ow-stat-value">3</div>
                  <div class="ow-stat-sub">of 360 total</div>
                </div>
                <div class="ow-stat-card">
                  <div class="ow-stat-label">Output Files</div>
                  <div class="ow-stat-value green">3</div>
                  <div class="ow-stat-sub">892 KB total</div>
                </div>
                <div class="ow-stat-card">
                  <div class="ow-stat-label">I/O vs Full</div>
                  <div class="ow-stat-value orange">0.83%</div>
                  <div class="ow-stat-sub">3 of 360 partitions</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      container.appendChild(page);

      const svg    = _buildSVG();
      page.querySelector('#ow-canvas').appendChild(svg);

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
      document.getElementById('ow-styles')?.remove();
    },
  };

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.modules = window.IcebergViz.modules || {};
  window.IcebergViz.modules['overwrite'] = mod;
})();
