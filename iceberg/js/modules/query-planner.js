/* ============================================================
   Query Planner Module
   Animated 7-step deep dive into Iceberg's scan planning
   pipeline: SQL parse → logical plan → partition pruning →
   manifest filtering → file stats → task allocation →
   column + row-group pushdown. ShopKart revenue aggregation.
   ============================================================ */

(function () {
  'use strict';

  const IV = window.IcebergViz;

  /* ── Styles ─────────────────────────────────────────────── */
  function _injectStyles() {
    if (document.getElementById('qp-styles')) return;
    const s = document.createElement('style');
    s.id = 'qp-styles';
    s.textContent = `
.qp-page { display:flex; flex-direction:column; height:100%; overflow:hidden; }

.qp-outer {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.qp-canvas {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: var(--bg-1);
  overflow: hidden;
  position: relative;
}

.qp-sidebar {
  width: 360px;
  border-left: 1px solid var(--border-default);
  background: var(--bg-2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.qp-sidebar-header {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-default);
  flex-shrink: 0;
}

.qp-sidebar-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.qp-sidebar-desc {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  line-height: 1.55;
  min-height: 52px;
}

.qp-steps-list {
  flex: 0 0 auto;
  overflow-y: auto;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-default);
  max-height: 240px;
}

.qp-step-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 7px 16px;
  cursor: pointer;
  transition: background 0.12s;
  border-left: 3px solid transparent;
}
.qp-step-item:hover { background: var(--bg-3); }
.qp-step-item.active { background: rgba(74,174,255,0.07); border-left-color: var(--blue); }
.qp-step-item.done { opacity: 0.6; }

.qp-step-badge {
  width: 20px; height: 20px;
  border-radius: 50%;
  background: var(--bg-4);
  color: var(--text-muted);
  font-size: 10px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-top: 1px;
  transition: background 0.12s, color 0.12s;
}
.qp-step-item.active .qp-step-badge { background: var(--blue); color: #fff; }
.qp-step-item.done .qp-step-badge   { background: var(--green); color: #fff; }

.qp-step-text { font-size: 12px; color: var(--text-secondary); line-height: 1.4; }
.qp-step-item.active .qp-step-text { color: var(--text-primary); font-weight: 500; }

.qp-code-panel {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.qp-sql-block {
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

.qp-kw  { color: var(--blue); font-weight: 600; }
.qp-fn  { color: var(--purple); }
.qp-str { color: var(--orange); }

.qp-info-label {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
  margin-top: 10px;
}

.qp-skip-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 8px;
  background: var(--bg-3);
  border-radius: 5px;
  margin-bottom: 4px;
  font-size: 11px;
}
.qp-skip-label { color: var(--text-secondary); }
.qp-skip-value { color: var(--green); font-family: var(--font-mono); font-weight: 700; }
.qp-skip-value.red { color: var(--red); }
`;
    document.head.appendChild(s);
  }

  /* ── Step metadata ──────────────────────────────────────── */
  function _getStepDescs() {
    return [
      { label: 'SQL Parsed',
        desc: 'Spark SQL parser converts the query to an unresolved logical plan. Predicates identified: order_date >= \'2024-01-01\' and country IN (\'BR\',\'US\',\'DE\').' },
      { label: 'Logical → Physical Plan',
        desc: 'Catalyst optimizer creates a physical plan. The Iceberg data source replaces a generic table scan — it implements the ScanBuilder API to push predicates down.' },
      { label: 'Partition Pruning',
        desc: 'Partition pruning is O(distinct partition values). 90% of partitions eliminated before opening a single manifest file.' },
      { label: 'Manifest List Scan',
        desc: 'Iceberg loads only the 6 manifests covering BR, US, DE partitions. Each manifest entry in the list has partition summary stats.' },
      { label: 'File Statistics Evaluation',
        desc: 'Per-file column stats (written at ingest time) eliminate 60% of remaining files. No I/O on the data files themselves — pure metadata reads.' },
      { label: 'Task Allocation',
        desc: 'Iceberg creates a ScanTaskSet: 96 tasks, each reading 5 Parquet files. Tasks allocated across 24 executors for parallel execution.' },
      { label: 'Column + Row Group Pushdown',
        desc: 'ShopKart query total: 480 files read vs 24,000 total (98% skip). Within-file row groups provide additional 30% reduction. Total I/O: 3.8 GB vs 38.4 TB raw.' },
    ];
  }

  /* ── SVG ────────────────────────────────────────────────── */
  function _buildSVG() {
    const W = 880, H = 420;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.maxWidth = W + 'px';
    svg.style.maxHeight = H + 'px';
    svg.id = 'qp-svg';

    // Pipeline stage positions (5 boxes, horizontal)
    // Box width=132, gap=20, total = 5*132 + 4*20 = 740, left margin = (880-740)/2 = 70
    const bx = [70, 222, 374, 526, 678];
    const bw = 132, bh = 52, by = 40;

    svg.innerHTML = `
<defs>
  <marker id="qp-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M0 0L10 5L0 10z" fill="#484f58"/>
  </marker>
  <marker id="qp-arr-blue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M0 0L10 5L0 10z" fill="#58a6ff"/>
  </marker>
  <marker id="qp-arr-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M0 0L10 5L0 10z" fill="#56d364"/>
  </marker>
</defs>
<rect width="${W}" height="${H}" fill="#090d14"/>
<text x="12" y="14" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.4)" font-weight="600" letter-spacing="1">ShopKart Query Planner — Revenue Aggregation Scan</text>

<!-- ═══ PIPELINE STAGES ═══ -->

<!-- Stage 1: SQL Parse -->
<g id="qp-stage1">
  <rect x="${bx[0]}" y="${by}" width="${bw}" height="${bh}" rx="7" fill="#0d1f3c" stroke="#1f6feb" stroke-width="1.4"/>
  <text x="${bx[0]+bw/2}" y="${by+18}" text-anchor="middle" font-family="system-ui" font-size="10" font-weight="700" fill="#e6edf3">SQL Parse</text>
  <text x="${bx[0]+bw/2}" y="${by+32}" text-anchor="middle" font-family="ui-monospace" font-size="8" fill="rgba(88,166,255,0.6)">AST → LogicalPlan</text>
  <text x="${bx[0]+bw/2}" y="${by+46}" text-anchor="middle" font-family="ui-monospace" font-size="7.5" fill="rgba(139,148,158,0.4)">predicates extracted</text>
</g>
<rect id="qp-hl-s1" x="${bx[0]-2}" y="${by-2}" width="${bw+4}" height="${bh+4}" rx="8" fill="none" stroke="#58a6ff" stroke-width="2.5" opacity="0"/>

<line x1="${bx[0]+bw}" y1="${by+26}" x2="${bx[1]}" y2="${by+26}" stroke="#30363d" stroke-width="1.3" marker-end="url(#qp-arr)"/>

<!-- Stage 2: Logical Plan -->
<g id="qp-stage2">
  <rect x="${bx[1]}" y="${by}" width="${bw}" height="${bh}" rx="7" fill="#0a1f10" stroke="#56d364" stroke-width="1.4"/>
  <text x="${bx[1]+bw/2}" y="${by+18}" text-anchor="middle" font-family="system-ui" font-size="10" font-weight="700" fill="#e6edf3">Logical Plan</text>
  <text x="${bx[1]+bw/2}" y="${by+32}" text-anchor="middle" font-family="ui-monospace" font-size="8" fill="rgba(86,211,100,0.6)">Catalyst Optimizer</text>
  <text x="${bx[1]+bw/2}" y="${by+46}" text-anchor="middle" font-family="ui-monospace" font-size="7.5" fill="rgba(139,148,158,0.4)">rules applied</text>
</g>
<rect id="qp-hl-s2" x="${bx[1]-2}" y="${by-2}" width="${bw+4}" height="${bh+4}" rx="8" fill="none" stroke="#56d364" stroke-width="2.5" opacity="0"/>

<line x1="${bx[1]+bw}" y1="${by+26}" x2="${bx[2]}" y2="${by+26}" stroke="#30363d" stroke-width="1.3" marker-end="url(#qp-arr)"/>

<!-- Stage 3: IcebergScan -->
<g id="qp-stage3">
  <rect x="${bx[2]}" y="${by}" width="${bw}" height="${bh}" rx="7" fill="#0a1a20" stroke="#70c0e8" stroke-width="1.8"/>
  <text x="${bx[2]+bw/2}" y="${by+18}" text-anchor="middle" font-family="system-ui" font-size="10" font-weight="700" fill="#70c0e8">IcebergScan</text>
  <text x="${bx[2]+bw/2}" y="${by+32}" text-anchor="middle" font-family="ui-monospace" font-size="8" fill="rgba(112,192,232,0.7)">ScanBuilder API</text>
  <text x="${bx[2]+bw/2}" y="${by+46}" text-anchor="middle" font-family="ui-monospace" font-size="7.5" fill="rgba(139,148,158,0.4)">predicate pushdown</text>
</g>
<rect id="qp-hl-s3" x="${bx[2]-2}" y="${by-2}" width="${bw+4}" height="${bh+4}" rx="8" fill="none" stroke="#70c0e8" stroke-width="2.5" opacity="0"/>

<line x1="${bx[2]+bw}" y1="${by+26}" x2="${bx[3]}" y2="${by+26}" stroke="#30363d" stroke-width="1.3" marker-end="url(#qp-arr)"/>

<!-- Stage 4: Partition Filter -->
<g id="qp-stage4">
  <rect x="${bx[3]}" y="${by}" width="${bw}" height="${bh}" rx="7" fill="#1a1030" stroke="#f0883e" stroke-width="1.4"/>
  <text x="${bx[3]+bw/2}" y="${by+18}" text-anchor="middle" font-family="system-ui" font-size="10" font-weight="700" fill="#e6edf3">Partition Filter</text>
  <text x="${bx[3]+bw/2}" y="${by+32}" text-anchor="middle" font-family="ui-monospace" font-size="8" fill="rgba(240,136,62,0.6)">manifest list scan</text>
  <text x="${bx[3]+bw/2}" y="${by+46}" text-anchor="middle" font-family="ui-monospace" font-size="7.5" fill="rgba(139,148,158,0.4)">partition skip</text>
</g>
<rect id="qp-hl-s4" x="${bx[3]-2}" y="${by-2}" width="${bw+4}" height="${bh+4}" rx="8" fill="none" stroke="#f0883e" stroke-width="2.5" opacity="0"/>

<line x1="${bx[3]+bw}" y1="${by+26}" x2="${bx[4]}" y2="${by+26}" stroke="#30363d" stroke-width="1.3" marker-end="url(#qp-arr)"/>

<!-- Stage 5: File Tasks -->
<g id="qp-stage5">
  <rect x="${bx[4]}" y="${by}" width="${bw}" height="${bh}" rx="7" fill="#1a1a10" stroke="#e3b341" stroke-width="1.4"/>
  <text x="${bx[4]+bw/2}" y="${by+18}" text-anchor="middle" font-family="system-ui" font-size="10" font-weight="700" fill="#e6edf3">File Tasks</text>
  <text x="${bx[4]+bw/2}" y="${by+32}" text-anchor="middle" font-family="ui-monospace" font-size="8" fill="rgba(227,179,65,0.6)">ScanTaskSet</text>
  <text x="${bx[4]+bw/2}" y="${by+46}" text-anchor="middle" font-family="ui-monospace" font-size="7.5" fill="rgba(139,148,158,0.4)">96 tasks · 24 exec</text>
</g>
<rect id="qp-hl-s5" x="${bx[4]-2}" y="${by-2}" width="${bw+4}" height="${bh+4}" rx="8" fill="none" stroke="#e3b341" stroke-width="2.5" opacity="0"/>

<!-- ═══ DETAIL PANELS (shown per step) ═══ -->

<!-- Step 1: AST panel -->
<g id="qp-ast-panel" opacity="0">
  <rect x="70" y="118" width="740" height="80" rx="7" fill="#0d1117" stroke="#1f6feb" stroke-width="1.2"/>
  <text x="88" y="138" font-family="system-ui" font-size="9" font-weight="700" fill="rgba(88,166,255,0.8)">Simplified AST:</text>
  <text x="88" y="155" font-family="ui-monospace" font-size="9" fill="#e6edf3">SELECT → AGG(SUM) → FILTER(order_date ≥ '2024-01-01' AND country IN ['BR','US','DE']) → SCAN(prod.orders)</text>
  <text x="88" y="172" font-family="system-ui" font-size="8.5" fill="rgba(139,148,158,0.7)">Unresolved predicates pushed to Iceberg ScanBuilder for physical execution</text>
  <text x="88" y="186" font-family="ui-monospace" font-size="8" fill="rgba(240,136,62,0.6)">Predicates: [order_date >= DATE'2024-01-01', country IN ('BR', 'US', 'DE')]</text>
</g>

<!-- Step 2: Physical plan -->
<g id="qp-plan-panel" opacity="0">
  <rect x="70" y="118" width="740" height="88" rx="7" fill="#0d1117" stroke="#56d364" stroke-width="1.2"/>
  <text x="88" y="138" font-family="system-ui" font-size="9" font-weight="700" fill="rgba(86,211,100,0.8)">Physical Plan:</text>
  <text x="88" y="155" font-family="ui-monospace" font-size="8.5" fill="#e6edf3">Sort[revenue DESC] → HashAggregate[country, month, SUM(total_amount)]</text>
  <text x="88" y="169" font-family="ui-monospace" font-size="8.5" fill="#e6edf3">  → Filter[order_date &gt;= 2024-01-01 AND country IN ('BR','US','DE')]</text>
  <text x="88" y="183" font-family="ui-monospace" font-size="8.5" fill="rgba(112,192,232,0.9)">    → IcebergScan[prod.orders](projected=country,order_date,total_amount)</text>
  <text x="88" y="197" font-family="system-ui" font-size="8" fill="rgba(139,148,158,0.6)">IcebergScan implements ScanBuilder — predicates pushed below the Catalyst boundary into Iceberg metadata</text>
</g>

<!-- Step 3: Partition pruning detail -->
<g id="qp-partition-panel" opacity="0">
  <rect x="70" y="118" width="740" height="88" rx="7" fill="#0d1117" stroke="#f0883e" stroke-width="1.2"/>
  <text x="88" y="137" font-family="system-ui" font-size="9" font-weight="700" fill="rgba(240,136,62,0.9)">Partition Pruning:</text>
  <text x="88" y="153" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.8)">Partition spec:  identity(country)</text>
  <text x="88" y="167" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.8)">Distinct values: 30 countries in table</text>
  <text x="88" y="181" font-family="ui-monospace" font-size="8.5" fill="rgba(240,136,62,0.9)">Predicate:       country IN ('BR', 'US', 'DE')  →  3 match / 27 eliminated</text>
  <rect x="550" y="122" width="250" height="28" rx="5" fill="rgba(248,81,73,0.12)" stroke="rgba(248,81,73,0.4)" stroke-width="1"/>
  <text x="675" y="132" text-anchor="middle" font-family="system-ui" font-size="9" font-weight="700" fill="#f85149">27 partitions skipped (90%)</text>
  <text x="675" y="145" text-anchor="middle" font-family="system-ui" font-size="8" fill="rgba(248,81,73,0.7)">O(distinct values) — no file I/O needed</text>
  <text x="88" y="197" font-family="system-ui" font-size="8" fill="rgba(86,211,100,0.6)">Result: only 3 of 30 partition keys need manifest scanning</text>
</g>

<!-- Step 4: Manifest list detail -->
<g id="qp-manifest-panel" opacity="0">
  <rect x="70" y="118" width="740" height="88" rx="7" fill="#0d1117" stroke="#bc8cff" stroke-width="1.2"/>
  <text x="88" y="137" font-family="system-ui" font-size="9" font-weight="700" fill="rgba(188,140,255,0.9)">Manifest List Scan:</text>
  <text x="88" y="153" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.8)">Manifest list: snap-3821904756.avro  →  24 entries total</text>
  <text x="88" y="167" font-family="ui-monospace" font-size="8.5" fill="#f85149">18 entries greyed out  (partition_field != BR/US/DE)</text>
  <text x="88" y="181" font-family="ui-monospace" font-size="8.5" fill="#56d364">6 entries selected  →  manifest files to open</text>
  <text x="88" y="195" font-family="system-ui" font-size="8" fill="rgba(139,148,158,0.6)">Each manifest-list entry holds partition-level summary stats — read in a single S3 GET, O(manifests)</text>
</g>

<!-- Step 5: File stats detail -->
<g id="qp-filestats-panel" opacity="0">
  <rect x="70" y="118" width="740" height="88" rx="7" fill="#0d1117" stroke="#e3b341" stroke-width="1.2"/>
  <text x="88" y="137" font-family="system-ui" font-size="9" font-weight="700" fill="rgba(227,179,65,0.9)">File Statistics Evaluation:</text>
  <text x="88" y="153" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.8)">6 manifests opened  ×  ~200 file entries each  =  1,200 file entries</text>
  <text x="88" y="167" font-family="ui-monospace" font-size="8.5" fill="rgba(227,179,65,0.8)">Column stats filter:  order_date min/max  →  720 files skipped (date range entirely before 2024-01-01)</text>
  <text x="88" y="181" font-family="ui-monospace" font-size="8.5" fill="#56d364">480 files pass all filters  →  eligible for reading</text>
  <rect x="550" y="122" width="250" height="28" rx="5" fill="rgba(86,211,100,0.08)" stroke="rgba(86,211,100,0.3)" stroke-width="1"/>
  <text x="675" y="132" text-anchor="middle" font-family="system-ui" font-size="9" font-weight="700" fill="#56d364">720 files skipped (60%)</text>
  <text x="675" y="145" text-anchor="middle" font-family="system-ui" font-size="8" fill="rgba(86,211,100,0.7)">zero data-file I/O — pure metadata</text>
  <text x="88" y="197" font-family="system-ui" font-size="8" fill="rgba(139,148,158,0.6)">All statistics were collected at write time — this lookup is free</text>
</g>

<!-- Step 6: Task allocation detail -->
<g id="qp-tasks-panel" opacity="0">
  <rect x="70" y="118" width="740" height="88" rx="7" fill="#0d1117" stroke="#e3b341" stroke-width="1.2"/>
  <text x="88" y="137" font-family="system-ui" font-size="9" font-weight="700" fill="rgba(227,179,65,0.9)">Task Allocation:</text>
  <text x="88" y="153" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.8)">480 files  ÷  5 files/task  =  96 Spark tasks</text>
  <text x="88" y="167" font-family="ui-monospace" font-size="8.5" fill="rgba(227,179,65,0.8)">Allocated across 24 executors  →  4 tasks/executor  →  parallel reads</text>
  <text x="88" y="181" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.7)">ScanTaskSet: CombinedScanTask per 5 files, Parquet split boundaries respected</text>
  <rect x="550" y="122" width="250" height="42" rx="5" fill="rgba(88,166,255,0.08)" stroke="rgba(88,166,255,0.3)" stroke-width="1"/>
  <text x="675" y="140" text-anchor="middle" font-family="ui-monospace" font-size="10" font-weight="700" fill="#58a6ff">96 tasks</text>
  <text x="675" y="155" text-anchor="middle" font-family="system-ui" font-size="8" fill="rgba(88,166,255,0.7)">24 executors × 4 tasks each</text>
  <text x="88" y="197" font-family="system-ui" font-size="8" fill="rgba(139,148,158,0.6)">Task count directly controls Spark parallelism — Iceberg controls granularity via target split size</text>
</g>

<!-- Step 7: Final I/O summary -->
<g id="qp-io-panel" opacity="0">
  <rect x="70" y="118" width="740" height="100" rx="7" fill="#0d1117" stroke="#56d364" stroke-width="1.5"/>
  <text x="88" y="138" font-family="system-ui" font-size="9" font-weight="700" fill="rgba(86,211,100,0.9)">Final I/O Accounting — ShopKart Revenue Query:</text>
  <text x="88" y="156" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.8)">Columns projected: 4 of 47  (country, order_date, total_amount, COUNT)  →  91.5% projection savings</text>
  <text x="88" y="170" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.8)">Parquet row-group stats: 30% additional rows skipped within eligible files</text>
  <text x="88" y="184" font-family="ui-monospace" font-size="8.5" fill="#56d364">Effective scan: 2.8% of raw table  →  3.8 GB actual I/O vs 38.4 TB without Iceberg</text>
  <!-- Breakdown bar -->
  <rect x="88" y="196" width="700" height="12" rx="3" fill="#1c2128"/>
  <rect x="88" y="196" width="${Math.round(700*0.028)}" height="12" rx="3" fill="#56d364"/>
  <text x="110" y="207" font-family="system-ui" font-size="7.5" fill="#090d14" font-weight="700">2.8%</text>
  <text x="800" y="207" font-family="system-ui" font-size="7.5" fill="rgba(139,148,158,0.5)">100%</text>
  <text x="88" y="222" font-family="system-ui" font-size="8" fill="rgba(86,211,100,0.7)">480 files read (2%) · 4 columns (8.5%) · 70% row groups · = 2.8% effective scan rate</text>
</g>

<!-- ═══ BOTTOM: file skip funnel ═══ -->
<g id="qp-funnel" opacity="0">
  <!-- Funnel visualization -->
  <rect x="70" y="240" width="740" height="160" rx="7" fill="#0d1117" stroke="#30363d" stroke-width="1.2"/>
  <text x="88" y="260" font-family="system-ui" font-size="9" font-weight="700" fill="rgba(139,148,158,0.8)">Pruning Funnel:</text>

  <!-- Funnel bars -->
  <rect x="100" y="270" width="680" height="16" rx="3" fill="#1c2128"/>
  <rect x="100" y="270" width="680" height="16" rx="3" fill="#30363d"/>
  <text x="90" y="282" text-anchor="end" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,0.6)">All</text>
  <text x="788" y="282" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,0.6)">24,000 files</text>

  <rect x="100" y="294" width="${Math.round(680*0.25)}" height="16" rx="3" fill="#f0883e" opacity="0.7"/>
  <rect x="${100+Math.round(680*0.25)}" y="294" width="${680-Math.round(680*0.25)}" height="16" rx="3" fill="#1c2128"/>
  <text x="90" y="306" text-anchor="end" font-family="ui-monospace" font-size="8" fill="rgba(240,136,62,0.7)">+Part</text>
  <text x="${105+Math.round(680*0.25)}" y="306" font-family="ui-monospace" font-size="8" fill="rgba(248,81,73,0.6)">6,000 remain (27 of 30 partitions skipped)</text>

  <rect x="100" y="318" width="${Math.round(680*0.10)}" height="16" rx="3" fill="#e3b341" opacity="0.7"/>
  <rect x="${100+Math.round(680*0.10)}" y="318" width="${680-Math.round(680*0.10)}" height="16" rx="3" fill="#1c2128"/>
  <text x="90" y="330" text-anchor="end" font-family="ui-monospace" font-size="8" fill="rgba(227,179,65,0.7)">+Stats</text>
  <text x="${105+Math.round(680*0.10)}" y="330" font-family="ui-monospace" font-size="8" fill="rgba(248,81,73,0.6)">480 remain (720 files skipped by column stats)</text>

  <rect x="100" y="342" width="${Math.round(680*0.028)}" height="16" rx="3" fill="#56d364" opacity="0.9"/>
  <rect x="${100+Math.round(680*0.028)}" y="342" width="${680-Math.round(680*0.028)}" height="16" rx="3" fill="#1c2128"/>
  <text x="90" y="354" text-anchor="end" font-family="ui-monospace" font-size="8" fill="rgba(86,211,100,0.7)">+RG</text>
  <text x="${105+Math.round(680*0.028)}" y="354" font-family="ui-monospace" font-size="8" fill="#56d364">3.8 GB effective (row-group pushdown inside 480 files)</text>

  <text x="440" y="388" text-anchor="middle" font-family="system-ui" font-size="9" font-weight="700" fill="#56d364">97.98% of data eliminated before any record is processed</text>
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
      if (glowColor === 'iceberg') el.style.filter = 'drop-shadow(0 0 8px rgba(112,192,232,0.7))';
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
      AE.fnStep('SQL Parsed', '', () => {
        show('qp-hl-s1', 'blue');
        show('qp-ast-panel');
      }, () => {
        hide('qp-hl-s1');
        hide('qp-ast-panel');
      }, 2800),

      AE.fnStep('Logical → Physical Plan', '', () => {
        unglow('qp-hl-s1');
        show('qp-hl-s2', 'green');
        show('qp-hl-s3', 'iceberg');
        show('qp-plan-panel');
      }, () => {
        hide('qp-hl-s2');
        hide('qp-hl-s3');
        hide('qp-plan-panel');
      }, 3000),

      AE.fnStep('Partition Pruning', '', () => {
        unglow('qp-hl-s2'); unglow('qp-hl-s3');
        show('qp-hl-s4', 'orange');
        show('qp-partition-panel');
      }, () => {
        hide('qp-hl-s4');
        hide('qp-partition-panel');
      }, 2800),

      AE.fnStep('Manifest List Scan', '', () => {
        unglow('qp-hl-s4');
        show('qp-hl-s3', 'iceberg');
        show('qp-manifest-panel');
      }, () => {
        hide('qp-hl-s3');
        hide('qp-manifest-panel');
      }, 2800),

      AE.fnStep('File Statistics Evaluation', '', () => {
        unglow('qp-hl-s3');
        show('qp-hl-s4', 'yellow');
        show('qp-filestats-panel');
      }, () => {
        hide('qp-hl-s4');
        hide('qp-filestats-panel');
      }, 3000),

      AE.fnStep('Task Allocation', '', () => {
        unglow('qp-hl-s4');
        show('qp-hl-s5', 'yellow');
        show('qp-tasks-panel');
      }, () => {
        hide('qp-hl-s5');
        hide('qp-tasks-panel');
      }, 2800),

      AE.fnStep('Column + Row Group Pushdown', '', () => {
        unglow('qp-hl-s5');
        show('qp-io-panel');
        show('qp-funnel');
      }, () => {
        hide('qp-io-panel');
        hide('qp-funnel');
      }, 4000),
    ];
  }

  /* ── Sidebar wiring ─────────────────────────────────────── */
  function _buildSidebar(page, engine, stepsData) {
    const list    = page.querySelector('#qp-steps-list');
    const titleEl = page.querySelector('#qp-step-title');
    const descEl  = page.querySelector('#qp-step-desc');
    if (!list) return;

    list.innerHTML = stepsData.map((s, i) => `
      <div class="qp-step-item" data-step="${i}">
        <div class="qp-step-badge">${i + 1}</div>
        <div class="qp-step-text">${s.label}</div>
      </div>
    `).join('');

    engine.on('stepchange', (idx) => {
      list.querySelectorAll('.qp-step-item').forEach((el, i) => {
        el.classList.toggle('active', i === idx);
        el.classList.toggle('done', i < idx);
      });
      const step = idx >= 0 ? stepsData[idx] : null;
      if (titleEl) titleEl.textContent = step ? step.label : 'Press Play to begin';
      if (descEl)  descEl.textContent  = step ? step.desc  : 'See how Iceberg\'s scan planner eliminates 97.98% of data before any Parquet file is opened.';
      const active = list.querySelector('.qp-step-item.active');
      if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });

    list.addEventListener('click', (e) => {
      const item = e.target.closest('[data-step]');
      if (item) engine.goto(parseInt(item.dataset.step, 10));
    });
  }

  /* ── Module ─────────────────────────────────────────────── */
  const mod = {
    id: 'query-planner',
    title: 'Query Planner',
    group: 'read-ops',
    _engine: null,

    render(container) {
      container.innerHTML = '';
      _injectStyles();

      const page = document.createElement('div');
      page.className = 'qp-page page-enter';
      page.innerHTML = `
        <div class="qp-outer">
          <div class="qp-canvas" id="qp-canvas"></div>
          <div class="qp-sidebar">
            <div class="qp-sidebar-header">
              <div class="qp-sidebar-title" id="qp-step-title">Press Play to begin</div>
              <div class="qp-sidebar-desc" id="qp-step-desc">See how Iceberg's scan planner eliminates 97.98% of data before any Parquet file is opened.</div>
            </div>
            <div class="qp-steps-list" id="qp-steps-list"></div>
            <div class="qp-code-panel">
              <div class="qp-info-label">Revenue Query</div>
              <div class="qp-sql-block"><span class="qp-kw">SELECT</span> country,
  <span class="qp-fn">DATE_TRUNC</span>(<span class="qp-str">'month'</span>, order_date) <span class="qp-kw">AS</span> month,
  <span class="qp-fn">SUM</span>(total_amount)            <span class="qp-kw">AS</span> revenue
<span class="qp-kw">FROM</span>   prod.orders
<span class="qp-kw">WHERE</span>  order_date >= <span class="qp-str">'2024-01-01'</span>
  <span class="qp-kw">AND</span>  country <span class="qp-kw">IN</span> (<span class="qp-str">'BR','US','DE'</span>)
<span class="qp-kw">GROUP BY</span> 1, 2
<span class="qp-kw">ORDER BY</span> revenue <span class="qp-kw">DESC</span></div>
              <div class="qp-info-label">Skip Accounting</div>
              <div class="qp-skip-row">
                <span class="qp-skip-label">Total files</span>
                <span class="qp-skip-value" style="color:var(--text-secondary)">24,000</span>
              </div>
              <div class="qp-skip-row">
                <span class="qp-skip-label">After partition prune</span>
                <span class="qp-skip-value red">−18,000</span>
              </div>
              <div class="qp-skip-row">
                <span class="qp-skip-label">After file stats</span>
                <span class="qp-skip-value red">−5,520</span>
              </div>
              <div class="qp-skip-row">
                <span class="qp-skip-label">Files actually read</span>
                <span class="qp-skip-value">480</span>
              </div>
              <div class="qp-skip-row">
                <span class="qp-skip-label">Effective I/O</span>
                <span class="qp-skip-value">3.8 GB / 38.4 TB</span>
              </div>
            </div>
          </div>
        </div>
      `;
      container.appendChild(page);

      const svg    = _buildSVG();
      page.querySelector('#qp-canvas').appendChild(svg);

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
      document.getElementById('qp-styles')?.remove();
    },
  };

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.modules = window.IcebergViz.modules || {};
  window.IcebergViz.modules['query-planner'] = mod;
})();
