/* ============================================================
   Read Path Module
   Animates Iceberg read path: query → catalog → manifest list
   → manifest files → parquet files → results, with massive
   file skipping stats for ShopKart's Brazil 2024 query.
   ============================================================ */

(function () {
  'use strict';

  const IV = window.IcebergViz;

  /* ── Style injection ────────────────────────────────────── */
  function _injectStyles() {
    if (document.getElementById('rp-styles')) return;
    const s = document.createElement('style');
    s.id = 'rp-styles';
    s.textContent = `
.rp-page { display:flex; flex-direction:column; height:100%; overflow:hidden; }

.rp-outer {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.rp-canvas {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: var(--bg-1);
  overflow: hidden;
  position: relative;
}

.rp-sidebar {
  width: 360px;
  border-left: 1px solid var(--border-default);
  background: var(--bg-2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.rp-sidebar-header {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-default);
  flex-shrink: 0;
}

.rp-sidebar-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.rp-sidebar-desc {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  line-height: 1.5;
  min-height: 52px;
}

.rp-steps-list {
  flex: 0 0 auto;
  overflow-y: auto;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-default);
  max-height: 260px;
}

.rp-step-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 7px 16px;
  cursor: pointer;
  transition: background 0.12s;
  border-left: 3px solid transparent;
  margin-bottom: 1px;
}
.rp-step-item:hover { background: var(--bg-3); }
.rp-step-item.active {
  background: rgba(74,174,255,0.07);
  border-left-color: var(--blue);
}
.rp-step-item.done { opacity: 0.6; }

.rp-step-badge {
  width: 20px; height: 20px;
  border-radius: 50%;
  background: var(--bg-4);
  color: var(--text-muted);
  font-size: 10px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-top: 1px;
  transition: background 0.12s, color 0.12s;
}
.rp-step-item.active .rp-step-badge { background: var(--blue); color: #fff; }
.rp-step-item.done .rp-step-badge   { background: var(--green); color: #fff; }

.rp-step-text {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
}
.rp-step-item.active .rp-step-text { color: var(--text-primary); font-weight: 500; }

.rp-stats-panel {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.rp-stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.rp-stat-card {
  background: var(--bg-3);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 10px 12px;
}

.rp-stat-label {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}

.rp-stat-value {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  font-family: var(--font-mono);
}

.rp-stat-sub {
  font-size: 10px;
  color: var(--text-muted);
  margin-top: 2px;
}

.rp-stat-value.green { color: var(--green); }
.rp-stat-value.blue  { color: var(--blue); }
.rp-stat-value.orange { color: var(--orange); }

.rp-sql-block {
  background: var(--bg-3);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 10px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.6;
  white-space: pre;
  overflow-x: auto;
}

.rp-sql-keyword { color: var(--blue); font-weight: 600; }
.rp-sql-string  { color: var(--orange); }
.rp-sql-comment { color: var(--text-muted); }
`;
    document.head.appendChild(s);
  }

  /* ── Step descriptions ──────────────────────────────────── */
  function _getStepDescs() {
    return [
      { label: 'Query Submitted',      desc: 'Spark SQL optimizer parses the WHERE clause and extracts predicates: country = \'BR\' and order_date range. Predicate pushdown plan prepared for Iceberg scan.' },
      { label: 'Load Snapshot',        desc: 'Glue Catalog returns the current snapshot pointer. metadata.json loaded: snapshot_id 3821904756, sequence_number 847. Zero data files read so far.' },
      { label: 'Partition Pruning',    desc: 'Manifest list has 12 entries. Partition filter country=BR eliminates 9 manifests instantly — no I/O on those 9 manifest files at all.' },
      { label: 'Manifest Filtering',   desc: '3 manifests contain 1,200 file entries. Column stats (min/max order_date) eliminate 890 files that don\'t overlap the date range. Pure metadata read.' },
      { label: 'File Skip Summary',    desc: 'Only 310 Parquet files need to be read. Without Iceberg statistics, all 24,000 files (38.4 TB) would be scanned. That\'s a 98.7% reduction in I/O.' },
      { label: 'Column Projection',    desc: 'Parquet columnar format: only 3 of 47 columns read per file (order_id, total_amount, country). Actual I/O reduced from 512 MB/file to ~33 MB/file.' },
      { label: 'Parallel Read',        desc: '310 files read in parallel across 62 Spark executors (5 files/executor). Total I/O: 10.2 GB vs 38.4 TB full scan — a 3,765× I/O reduction.' },
      { label: 'Results Returned',     desc: '847,293 matching orders returned in 4.2 seconds. Full table scan estimate: ~180 minutes. Iceberg speedup: 2,571×.' },
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
    svg.id = 'rp-svg';

    svg.innerHTML = `
<defs>
  <marker id="rp-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#484f58"/>
  </marker>
  <marker id="rp-arr-blue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#58a6ff"/>
  </marker>
  <marker id="rp-arr-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#56d364"/>
  </marker>
  <marker id="rp-arr-orange" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#f0883e"/>
  </marker>
</defs>

<rect width="${W}" height="${H}" fill="#090d14"/>
<text x="12" y="16" font-family="system-ui" font-size="9.5" fill="rgba(139,148,158,0.4)" font-weight="600" letter-spacing="1">ShopKart Read Path — Brazil 2024 Query</text>

<!-- ═══ LEFT COLUMN: Spark Executor ═══ -->
<g id="rp-spark-box">
  <rect x="12" y="28" width="148" height="90" rx="8" fill="#0d1f3c" stroke="#1f6feb" stroke-width="1.5"/>
  <text x="28" y="52" font-size="16" dominant-baseline="middle">⚡</text>
  <text x="50" y="50" font-family="system-ui" font-size="11" font-weight="700" fill="#e6edf3">Spark Executor</text>
  <text x="50" y="65" font-family="ui-monospace" font-size="8.5" fill="rgba(88,166,255,0.7)">SELECT order_id,</text>
  <text x="50" y="76" font-family="ui-monospace" font-size="8.5" fill="rgba(88,166,255,0.7)">  total_amount,</text>
  <text x="50" y="87" font-family="ui-monospace" font-size="8.5" fill="rgba(88,166,255,0.7)">  country</text>
  <text x="50" y="98" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,0.5)">WHERE country='BR'</text>
  <text x="50" y="109" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,0.5)">  AND order_date…</text>
</g>
<rect id="rp-hl-spark" x="10" y="26" width="152" height="94" rx="9" fill="none" stroke="#58a6ff" stroke-width="2.5" opacity="0"/>

<!-- ═══ CENTER COLUMN: metadata chain ═══ -->

<!-- metadata.json box -->
<g id="rp-meta-box">
  <rect x="210" y="28" width="200" height="58" rx="7" fill="#1a1030" stroke="#a371f7" stroke-width="1.5"/>
  <text x="226" y="50" font-size="13" dominant-baseline="middle">📄</text>
  <text x="248" y="47" font-family="system-ui" font-size="11" font-weight="600" fill="#e6edf3">metadata.json</text>
  <text x="248" y="61" font-family="ui-monospace" font-size="9" fill="rgba(163,113,247,0.7)">Glue Catalog pointer</text>
  <text x="248" y="75" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.45)">snapshot_id: 3821904756</text>
</g>
<rect id="rp-hl-meta" x="208" y="26" width="204" height="62" rx="8" fill="none" stroke="#a371f7" stroke-width="2.5" opacity="0"/>

<!-- Arrow meta → manifest list -->
<line x1="310" y1="90" x2="310" y2="116" stroke="#484f58" stroke-width="1.5" marker-end="url(#rp-arr)"/>

<!-- Manifest List box -->
<g id="rp-maniflist-box">
  <rect x="210" y="118" width="200" height="58" rx="7" fill="#1a1030" stroke="#f0883e" stroke-width="1.5"/>
  <text x="226" y="140" font-size="13" dominant-baseline="middle">📋</text>
  <text x="248" y="137" font-family="system-ui" font-size="11" font-weight="600" fill="#e6edf3">Manifest List</text>
  <text x="248" y="151" font-family="ui-monospace" font-size="9" fill="rgba(240,136,62,0.7)">12 entries</text>
  <text x="248" y="165" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.45)">snap-3821904756.avro</text>
</g>
<rect id="rp-hl-maniflist" x="208" y="116" width="204" height="62" rx="8" fill="none" stroke="#f0883e" stroke-width="2.5" opacity="0"/>

<!-- Skip badge maniflist -->
<g id="rp-skip-maniflist" opacity="0">
  <rect x="420" y="130" width="148" height="32" rx="6" fill="rgba(248,81,73,0.12)" stroke="#f85149" stroke-width="1.2"/>
  <text x="494" y="145" text-anchor="middle" font-family="system-ui" font-size="9.5" font-weight="700" fill="#f85149">9 of 12 skipped</text>
  <text x="494" y="158" text-anchor="middle" font-family="system-ui" font-size="8.5" fill="rgba(248,81,73,0.7)">partition pruning</text>
  <line x1="418" y1="146" x2="412" y2="146" stroke="#f85149" stroke-width="1.2"/>
</g>

<!-- Arrow maniflist → maniffiles -->
<line x1="310" y1="180" x2="310" y2="206" stroke="#484f58" stroke-width="1.5" marker-end="url(#rp-arr)"/>

<!-- Manifest Files box -->
<g id="rp-maniffiles-box">
  <rect x="210" y="208" width="200" height="58" rx="7" fill="#1a1a10" stroke="#e3b341" stroke-width="1.5"/>
  <text x="226" y="230" font-size="13" dominant-baseline="middle">📊</text>
  <text x="248" y="227" font-family="system-ui" font-size="11" font-weight="600" fill="#e6edf3">Manifest Files</text>
  <text x="248" y="241" font-family="ui-monospace" font-size="9" fill="rgba(227,179,65,0.7)">3 relevant / 12 total</text>
  <text x="248" y="255" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.45)">1,200 file entries examined</text>
</g>
<rect id="rp-hl-maniffiles" x="208" y="206" width="204" height="62" rx="8" fill="none" stroke="#e3b341" stroke-width="2.5" opacity="0"/>

<!-- Skip badge maniffiles -->
<g id="rp-skip-maniffiles" opacity="0">
  <rect x="420" y="220" width="168" height="32" rx="6" fill="rgba(248,81,73,0.12)" stroke="#f85149" stroke-width="1.2"/>
  <text x="504" y="235" text-anchor="middle" font-family="system-ui" font-size="9.5" font-weight="700" fill="#f85149">890 of 1,200 skipped</text>
  <text x="504" y="248" text-anchor="middle" font-family="system-ui" font-size="8.5" fill="rgba(248,81,73,0.7)">column stats (date range)</text>
  <line x1="418" y1="236" x2="412" y2="236" stroke="#f85149" stroke-width="1.2"/>
</g>

<!-- Arrow maniffiles → parquet -->
<line x1="310" y1="270" x2="310" y2="296" stroke="#484f58" stroke-width="1.5" marker-end="url(#rp-arr)"/>

<!-- Parquet Files box -->
<g id="rp-parquet-box">
  <rect x="210" y="298" width="200" height="60" rx="7" fill="#0a1f10" stroke="#56d364" stroke-width="1.5"/>
  <text x="226" y="320" font-size="13" dominant-baseline="middle">🗄</text>
  <text x="248" y="317" font-family="system-ui" font-size="11" font-weight="600" fill="#e6edf3">Parquet Files</text>
  <text x="248" y="331" font-family="ui-monospace" font-size="9" fill="rgba(86,211,100,0.7)">310 relevant / 24,000 total</text>
  <text x="248" y="345" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.45)">10.2 GB of 38.4 TB</text>
</g>
<rect id="rp-hl-parquet" x="208" y="296" width="204" height="64" rx="8" fill="none" stroke="#56d364" stroke-width="2.5" opacity="0"/>

<!-- Skip badge parquet -->
<g id="rp-skip-parquet" opacity="0">
  <rect x="420" y="308" width="192" height="36" rx="6" fill="rgba(248,81,73,0.12)" stroke="#f85149" stroke-width="1.2"/>
  <text x="516" y="324" text-anchor="middle" font-family="system-ui" font-size="9.5" font-weight="700" fill="#f85149">23,690 of 24,000 skipped</text>
  <text x="516" y="337" text-anchor="middle" font-family="system-ui" font-size="8.5" fill="rgba(248,81,73,0.7)">98.7% file skip rate!</text>
  <line x1="418" y1="326" x2="412" y2="326" stroke="#f85149" stroke-width="1.2"/>
</g>

<!-- Column projection overlay -->
<g id="rp-col-proj" opacity="0">
  <rect x="210" y="370" width="200" height="72" rx="6" fill="rgba(88,166,255,0.06)" stroke="#58a6ff" stroke-width="1.2"/>
  <text x="220" y="386" font-family="system-ui" font-size="9" font-weight="600" fill="rgba(88,166,255,0.8)">Column Projection (3 of 47):</text>
  <text x="224" y="400" font-family="ui-monospace" font-size="9" fill="#56d364">▶ order_id</text>
  <text x="224" y="412" font-family="ui-monospace" font-size="9" fill="#56d364">▶ total_amount</text>
  <text x="224" y="424" font-family="ui-monospace" font-size="9" fill="#56d364">▶ country</text>
  <text x="224" y="437" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,0.4)">44 columns not read → 33 MB/file</text>
</g>

<!-- ═══ RIGHT COLUMN: Results ═══ -->
<g id="rp-results-box">
  <rect x="588" y="28" width="160" height="88" rx="8" fill="#0a1f10" stroke="#56d364" stroke-width="1.5" opacity="0.6"/>
  <text x="608" y="54" font-size="16" dominant-baseline="middle">✅</text>
  <text x="632" y="52" font-family="system-ui" font-size="11" font-weight="700" fill="rgba(230,237,243,0.5)">Results</text>
  <text x="608" y="70" font-family="ui-monospace" font-size="9" fill="rgba(86,211,100,0.4)">847,293 rows</text>
  <text x="608" y="83" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.3)">country=BR</text>
  <text x="608" y="96" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.3)">order_date 2024</text>
  <text x="608" y="109" font-family="ui-monospace" font-size="9" fill="rgba(86,211,100,0.3)">4.2 seconds</text>
</g>
<rect id="rp-hl-results" x="586" y="26" width="164" height="92" rx="9" fill="none" stroke="#56d364" stroke-width="2.5" opacity="0"/>
<g id="rp-results-glow" opacity="0">
  <rect x="588" y="28" width="160" height="88" rx="8" fill="#0a1f10" stroke="#56d364" stroke-width="2"/>
  <text x="608" y="54" font-size="16" dominant-baseline="middle">✅</text>
  <text x="632" y="52" font-family="system-ui" font-size="11" font-weight="700" fill="#e6edf3">Results</text>
  <text x="608" y="70" font-family="ui-monospace" font-size="10" fill="#56d364">847,293 rows</text>
  <text x="608" y="83" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.7)">country=BR</text>
  <text x="608" y="96" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.7)">order_date 2024</text>
  <text x="608" y="109" font-family="ui-monospace" font-size="10" font-weight="700" fill="#56d364">4.2 seconds ⚡</text>
</g>

<!-- Arrows: Spark → metadata, metadata → maniflist etc. (left side arrows) -->
<g id="rp-arrow-sm" opacity="0">
  <line x1="160" y1="57" x2="207" y2="57" stroke="#58a6ff" stroke-width="2" marker-end="url(#rp-arr-blue)"/>
  <text x="168" y="52" font-family="system-ui" font-size="8.5" fill="#58a6ff">catalog</text>
</g>

<!-- Parallel read arrows (step 7) -->
<g id="rp-parallel-arrows" opacity="0">
  <line x1="412" y1="316" x2="585" y2="66" stroke="#56d364" stroke-width="1.5" marker-end="url(#rp-arr-green)" stroke-dasharray="5 3"/>
  <line x1="412" y1="326" x2="585" y2="72" stroke="#56d364" stroke-width="1.5" marker-end="url(#rp-arr-green)" stroke-dasharray="5 3"/>
  <line x1="412" y1="336" x2="585" y2="78" stroke="#56d364" stroke-width="1.5" marker-end="url(#rp-arr-green)" stroke-dasharray="5 3"/>
  <text x="480" y="165" font-family="system-ui" font-size="9" fill="#56d364" transform="rotate(-52,480,165)">62 executors</text>
</g>

<!-- Stats panel (step 8) -->
<g id="rp-stats-panel" opacity="0">
  <rect x="12" y="138" width="188" height="130" rx="8" fill="#0d1117" stroke="#56d364" stroke-width="1.5"/>
  <text x="22" y="156" font-family="system-ui" font-size="10" font-weight="700" fill="#56d364">Query Stats</text>
  <text x="22" y="174" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.8)">Files Scanned:</text>
  <text x="140" y="174" text-anchor="end" font-family="ui-monospace" font-size="9" font-weight="700" fill="#56d364">310 / 24,000</text>
  <text x="22" y="189" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.8)">Skip Rate:</text>
  <text x="140" y="189" text-anchor="end" font-family="ui-monospace" font-size="9" font-weight="700" fill="#56d364">98.7%</text>
  <text x="22" y="204" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.8)">Data Read:</text>
  <text x="140" y="204" text-anchor="end" font-family="ui-monospace" font-size="9" font-weight="700" fill="#58a6ff">10.2 GB / 38.4 TB</text>
  <text x="22" y="219" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.8)">Query Time:</text>
  <text x="140" y="219" text-anchor="end" font-family="ui-monospace" font-size="9" font-weight="700" fill="#f0883e">4.2s vs ~180 min</text>
  <text x="22" y="234" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.8)">Rows:</text>
  <text x="140" y="234" text-anchor="end" font-family="ui-monospace" font-size="9" font-weight="700" fill="#e6edf3">847,293</text>
  <text x="22" y="252" font-family="system-ui" font-size="9.5" font-weight="700" fill="rgba(86,211,100,0.8)">Speedup: 2,571×</text>
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
      if (glowColor === 'purple') el.style.filter = 'drop-shadow(0 0 8px rgba(163,113,247,0.7))';
      if (glowColor === 'orange') el.style.filter = 'drop-shadow(0 0 8px rgba(240,136,62,0.7))';
      if (glowColor === 'yellow') el.style.filter = 'drop-shadow(0 0 8px rgba(227,179,65,0.7))';
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
      AE.fnStep('Query Submitted', '', (ctx) => {
        show('rp-hl-spark', 'blue');
      }, (ctx) => {
        hide('rp-hl-spark');
      }, 2200),

      AE.fnStep('Load Snapshot', '', (ctx) => {
        unglow('rp-hl-spark');
        show('rp-arrow-sm', 'blue');
        show('rp-hl-meta', 'purple');
      }, (ctx) => {
        hide('rp-arrow-sm');
        hide('rp-hl-meta');
      }, 2500),

      AE.fnStep('Partition Pruning', '', (ctx) => {
        unglow('rp-hl-meta');
        show('rp-hl-maniflist', 'orange');
        show('rp-skip-maniflist');
      }, (ctx) => {
        hide('rp-hl-maniflist');
        hide('rp-skip-maniflist');
      }, 2800),

      AE.fnStep('Manifest Filtering', '', (ctx) => {
        unglow('rp-hl-maniflist');
        show('rp-hl-maniffiles', 'yellow');
        show('rp-skip-maniffiles');
      }, (ctx) => {
        hide('rp-hl-maniffiles');
        hide('rp-skip-maniffiles');
      }, 2800),

      AE.fnStep('File Skip Summary', '', (ctx) => {
        unglow('rp-hl-maniffiles');
        show('rp-hl-parquet', 'green');
        show('rp-skip-parquet');
      }, (ctx) => {
        hide('rp-hl-parquet');
        hide('rp-skip-parquet');
      }, 3000),

      AE.fnStep('Column Projection', '', (ctx) => {
        unglow('rp-hl-parquet');
        show('rp-col-proj', 'blue');
      }, (ctx) => {
        hide('rp-col-proj');
      }, 2800),

      AE.fnStep('Parallel Read', '', (ctx) => {
        show('rp-parallel-arrows', 'green');
        show('rp-hl-parquet');
      }, (ctx) => {
        hide('rp-parallel-arrows');
        hide('rp-hl-parquet');
      }, 3000),

      AE.fnStep('Results Returned', '', (ctx) => {
        hide('rp-parallel-arrows');
        show('rp-hl-results', 'green');
        show('rp-results-glow', 'green');
        show('rp-stats-panel', 'green');
      }, (ctx) => {
        hide('rp-hl-results');
        hide('rp-results-glow');
        hide('rp-stats-panel');
      }, 4000),
    ];
  }

  /* ── Sidebar wiring ─────────────────────────────────────── */
  function _buildSidebar(page, engine, stepsData) {
    const list      = page.querySelector('#rp-steps-list');
    const titleEl   = page.querySelector('#rp-step-title');
    const descEl    = page.querySelector('#rp-step-desc');
    if (!list) return;

    list.innerHTML = stepsData.map((s, i) => `
      <div class="rp-step-item" data-step="${i}">
        <div class="rp-step-badge">${i + 1}</div>
        <div class="rp-step-text">${s.label}</div>
      </div>
    `).join('');

    engine.on('stepchange', (idx) => {
      list.querySelectorAll('.rp-step-item').forEach((el, i) => {
        el.classList.toggle('active', i === idx);
        el.classList.toggle('done', i < idx);
      });
      const step = idx >= 0 ? stepsData[idx] : null;
      if (titleEl) titleEl.textContent = step ? step.label : 'Press Play to begin';
      if (descEl)  descEl.textContent  = step ? step.desc  : 'Watch Iceberg\'s read path execute a 847K-row Brazil query while skipping 98.7% of 24,000 data files.';
      const active = list.querySelector('.rp-step-item.active');
      if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });

    list.addEventListener('click', (e) => {
      const item = e.target.closest('[data-step]');
      if (item) engine.goto(parseInt(item.dataset.step, 10));
    });
  }

  /* ── Module ─────────────────────────────────────────────── */
  const mod = {
    id: 'read-path',
    title: 'Read Path',
    group: 'read-ops',
    _engine: null,

    render(container) {
      container.innerHTML = '';
      _injectStyles();

      const page = document.createElement('div');
      page.className = 'rp-page page-enter';
      page.innerHTML = `
        <div class="rp-outer">
          <div class="rp-canvas" id="rp-canvas"></div>
          <div class="rp-sidebar">
            <div class="rp-sidebar-header">
              <div class="rp-sidebar-title" id="rp-step-title">Press Play to begin</div>
              <div class="rp-sidebar-desc" id="rp-step-desc">Watch Iceberg's read path execute a Brazil 2024 query while skipping 98.7% of all data files.</div>
            </div>
            <div class="rp-steps-list" id="rp-steps-list"></div>
            <div class="rp-stats-panel" id="rp-stats-panel-sidebar">
              <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">Query</div>
              <div class="rp-sql-block"><span class="rp-sql-keyword">SELECT</span> order_id, total_amount, country
<span class="rp-sql-keyword">FROM</span> orders
<span class="rp-sql-keyword">WHERE</span> country = <span class="rp-sql-string">'BR'</span>
  <span class="rp-sql-keyword">AND</span> order_date <span class="rp-sql-keyword">BETWEEN</span>
    <span class="rp-sql-string">'2024-01-01'</span> <span class="rp-sql-keyword">AND</span> <span class="rp-sql-string">'2024-12-31'</span></div>
              <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">File Statistics</div>
              <div class="rp-stat-grid">
                <div class="rp-stat-card">
                  <div class="rp-stat-label">Total Files</div>
                  <div class="rp-stat-value">24,000</div>
                  <div class="rp-stat-sub">38.4 TB total</div>
                </div>
                <div class="rp-stat-card">
                  <div class="rp-stat-label">Files Read</div>
                  <div class="rp-stat-value green">310</div>
                  <div class="rp-stat-sub">10.2 GB only</div>
                </div>
                <div class="rp-stat-card">
                  <div class="rp-stat-label">Skip Rate</div>
                  <div class="rp-stat-value green">98.7%</div>
                  <div class="rp-stat-sub">23,690 skipped</div>
                </div>
                <div class="rp-stat-card">
                  <div class="rp-stat-label">Speedup</div>
                  <div class="rp-stat-value orange">2,571×</div>
                  <div class="rp-stat-sub">4.2s vs 180 min</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      container.appendChild(page);

      const svg       = _buildSVG();
      page.querySelector('#rp-canvas').appendChild(svg);

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
      document.getElementById('rp-styles')?.remove();
    },
  };

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.modules = window.IcebergViz.modules || {};
  window.IcebergViz.modules['read-path'] = mod;
})();
