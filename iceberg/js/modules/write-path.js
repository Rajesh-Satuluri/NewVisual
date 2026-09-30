/* ============================================================
   Write Path Module
   Animated 8-step walkthrough of Iceberg's write path:
   Spark INSERT → executor tasks → Parquet writes → column
   stats → manifests → manifest list → concurrency check →
   atomic metadata commit. ShopKart: 45M legacy order import.
   ============================================================ */

(function () {
  'use strict';

  const IV = window.IcebergViz;

  /* ── Styles ─────────────────────────────────────────────── */
  function _injectStyles() {
    if (document.getElementById('wp-styles')) return;
    const s = document.createElement('style');
    s.id = 'wp-styles';
    s.textContent = `
.wp-page { display:flex; flex-direction:column; height:100%; overflow:hidden; }

.wp-outer {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.wp-canvas {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: var(--bg-1);
  overflow: hidden;
  position: relative;
}

.wp-sidebar {
  width: 360px;
  border-left: 1px solid var(--border-default);
  background: var(--bg-2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.wp-sidebar-header {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-default);
  flex-shrink: 0;
}

.wp-sidebar-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.wp-sidebar-desc {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  line-height: 1.55;
  min-height: 52px;
}

.wp-steps-list {
  flex: 0 0 auto;
  overflow-y: auto;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-default);
  max-height: 270px;
}

.wp-step-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 7px 16px;
  cursor: pointer;
  transition: background 0.12s;
  border-left: 3px solid transparent;
}
.wp-step-item:hover { background: var(--bg-3); }
.wp-step-item.active {
  background: rgba(74,174,255,0.07);
  border-left-color: var(--blue);
}
.wp-step-item.done { opacity: 0.6; }

.wp-step-badge {
  width: 20px; height: 20px;
  border-radius: 50%;
  background: var(--bg-4);
  color: var(--text-muted);
  font-size: 10px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-top: 1px;
  transition: background 0.12s, color 0.12s;
}
.wp-step-item.active .wp-step-badge { background: var(--blue); color: #fff; }
.wp-step-item.done .wp-step-badge   { background: var(--green); color: #fff; }

.wp-step-text {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
}
.wp-step-item.active .wp-step-text { color: var(--text-primary); font-weight: 500; }

.wp-code-panel {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.wp-sql-block {
  background: var(--bg-3);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 10px 12px;
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--text-secondary);
  line-height: 1.65;
  white-space: pre;
  overflow-x: auto;
  margin-bottom: 10px;
}

.wp-kw  { color: var(--blue); font-weight: 600; }
.wp-str { color: var(--orange); }
.wp-cmt { color: var(--text-muted); }

.wp-info-label {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
  margin-top: 10px;
}

.wp-stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.wp-stat-card {
  background: var(--bg-3);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 9px 11px;
}

.wp-stat-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 3px; }
.wp-stat-value { font-size: 14px; font-weight: 700; color: var(--text-primary); font-family: var(--font-mono); }
.wp-stat-sub   { font-size: 10px; color: var(--text-muted); margin-top: 2px; }
.wp-stat-value.green  { color: var(--green); }
.wp-stat-value.blue   { color: var(--blue); }
.wp-stat-value.orange { color: var(--orange); }
`;
    document.head.appendChild(s);
  }

  /* ── Step metadata ──────────────────────────────────────── */
  function _getStepDescs() {
    return [
      { label: 'Write Job Submitted',
        desc: 'Spark optimizer creates a write plan: 45M rows across 3 partitions. Driver allocates 9 write tasks (3 tasks × 3 executors).' },
      { label: 'Task Parallelism',
        desc: 'Each executor handles ~15M rows, writing to all 3 country partitions concurrently. Iceberg tracks each task independently.' },
      { label: 'Parquet File Writing',
        desc: '9 writer threads active. Target file size: 128 MB (Snappy). Files appear in S3 before any snapshot is committed — not yet visible to readers.' },
      { label: 'Column Statistics Collected',
        desc: 'During write, each Parquet writer tracks per-column min/max/null_count. These statistics power future query pruning — written once, used millions of times.' },
      { label: 'Manifest Files Assembled',
        desc: '3 manifest files built (one per partition group). Each manifest lists its data files with column stats. This is the file-level index of the new snapshot.' },
      { label: 'Manifest List Created',
        desc: 'A manifest list is created pointing to all 3 manifests. The manifest list is the snapshot\'s root index — O(1) partition-level lookup regardless of table size.' },
      { label: 'Optimistic Concurrency Check',
        desc: 'Before committing, Iceberg checks that no other writer changed metadata.json since this job started. If another writer committed first, the entire commit retries.' },
      { label: 'Atomic Metadata Commit',
        desc: 'metadata.json atomically updated via S3 conditional PUT (if-none-match). New snapshot 847 is now live — all 45M migrated orders instantly visible to every reader worldwide.' },
    ];
  }

  /* ── SVG ────────────────────────────────────────────────── */
  function _buildSVG() {
    const W = 900, H = 460;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.maxWidth = W + 'px';
    svg.style.maxHeight = H + 'px';
    svg.id = 'wp-svg';

    svg.innerHTML = `
<defs>
  <marker id="wp-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M0 0L10 5L0 10z" fill="#484f58"/>
  </marker>
  <marker id="wp-arr-blue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M0 0L10 5L0 10z" fill="#58a6ff"/>
  </marker>
  <marker id="wp-arr-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M0 0L10 5L0 10z" fill="#56d364"/>
  </marker>
  <marker id="wp-arr-orange" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M0 0L10 5L0 10z" fill="#f0883e"/>
  </marker>
</defs>
<rect width="${W}" height="${H}" fill="#090d14"/>
<text x="12" y="14" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.4)" font-weight="600" letter-spacing="1">ShopKart Write Path — Legacy Order Migration (45M rows)</text>

<!-- ═══ LEFT COLUMN ═══ -->
<!-- Spark Driver -->
<g id="wp-driver-box">
  <rect x="12" y="22" width="148" height="62" rx="7" fill="#0d1f3c" stroke="#1f6feb" stroke-width="1.5"/>
  <text x="24" y="45" font-family="system-ui" font-size="11" font-weight="700" fill="#e6edf3">Spark Driver</text>
  <text x="24" y="59" font-family="ui-monospace" font-size="8.5" fill="rgba(88,166,255,0.7)">INSERT INTO prod.orders</text>
  <text x="24" y="70" font-family="ui-monospace" font-size="8.5" fill="rgba(88,166,255,0.7)">SELECT * FROM legacy…</text>
  <text x="24" y="79" font-family="ui-monospace" font-size="7.5" fill="rgba(139,148,158,0.45)">45M rows / 9 tasks</text>
</g>
<rect id="wp-hl-driver" x="10" y="20" width="152" height="66" rx="8" fill="none" stroke="#58a6ff" stroke-width="2.5" opacity="0"/>

<!-- Executor E1 -->
<g id="wp-e1-box">
  <rect x="12" y="104" width="148" height="46" rx="6" fill="#161b22" stroke="#30363d" stroke-width="1.2"/>
  <text x="24" y="122" font-family="system-ui" font-size="10" font-weight="600" fill="rgba(230,237,243,0.7)">Executor 1</text>
  <text x="24" y="136" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,0.5)">15M rows · 3 partitions</text>
  <text x="24" y="147" font-family="ui-monospace" font-size="7.5" fill="rgba(139,148,158,0.35)">tasks: BR-01, US-01, DE-01</text>
</g>
<rect id="wp-hl-e1" x="10" y="102" width="152" height="50" rx="7" fill="none" stroke="#f0883e" stroke-width="2" opacity="0"/>

<!-- Executor E2 -->
<g id="wp-e2-box">
  <rect x="12" y="160" width="148" height="46" rx="6" fill="#161b22" stroke="#30363d" stroke-width="1.2"/>
  <text x="24" y="178" font-family="system-ui" font-size="10" font-weight="600" fill="rgba(230,237,243,0.7)">Executor 2</text>
  <text x="24" y="192" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,0.5)">15M rows · 3 partitions</text>
  <text x="24" y="203" font-family="ui-monospace" font-size="7.5" fill="rgba(139,148,158,0.35)">tasks: BR-02, US-02, DE-02</text>
</g>
<rect id="wp-hl-e2" x="10" y="158" width="152" height="50" rx="7" fill="none" stroke="#f0883e" stroke-width="2" opacity="0"/>

<!-- Executor E3 -->
<g id="wp-e3-box">
  <rect x="12" y="216" width="148" height="46" rx="6" fill="#161b22" stroke="#30363d" stroke-width="1.2"/>
  <text x="24" y="234" font-family="system-ui" font-size="10" font-weight="600" fill="rgba(230,237,243,0.7)">Executor 3</text>
  <text x="24" y="248" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,0.5)">15M rows · 3 partitions</text>
  <text x="24" y="259" font-family="ui-monospace" font-size="7.5" fill="rgba(139,148,158,0.35)">tasks: BR-03, US-03, DE-03</text>
</g>
<rect id="wp-hl-e3" x="10" y="214" width="152" height="50" rx="7" fill="none" stroke="#f0883e" stroke-width="2" opacity="0"/>

<!-- ═══ ARROWS LEFT → CENTER ═══ -->
<line x1="160" y1="53" x2="334" y2="48" stroke="#30363d" stroke-width="1.2" marker-end="url(#wp-arr)"/>
<g id="wp-exec-arrows" opacity="0">
  <line x1="160" y1="127" x2="334" y2="106" stroke="#f0883e" stroke-width="1.5" marker-end="url(#wp-arr-orange)" stroke-dasharray="4 3"/>
  <line x1="160" y1="183" x2="334" y2="110" stroke="#f0883e" stroke-width="1.5" marker-end="url(#wp-arr-orange)" stroke-dasharray="4 3"/>
  <line x1="160" y1="239" x2="334" y2="114" stroke="#f0883e" stroke-width="1.5" marker-end="url(#wp-arr-orange)" stroke-dasharray="4 3"/>
</g>
<g id="wp-write-arrow" opacity="0">
  <line x1="522" y1="110" x2="666" y2="100" stroke="#56d364" stroke-width="1.8" marker-end="url(#wp-arr-green)"/>
  <text x="560" y="104" font-family="system-ui" font-size="8" fill="#56d364">9 writers</text>
</g>

<!-- ═══ CENTER PIPELINE ═══ -->
<!-- Task Allocation -->
<g id="wp-tasks-box">
  <rect x="334" y="26" width="188" height="44" rx="7" fill="#0d1f3c" stroke="#1f6feb" stroke-width="1.4"/>
  <text x="350" y="45" font-family="system-ui" font-size="10.5" font-weight="600" fill="#e6edf3">Task Allocation</text>
  <text x="350" y="60" font-family="ui-monospace" font-size="8.5" fill="rgba(88,166,255,0.6)">9 tasks · 3 executors · 3 partitions</text>
</g>
<rect id="wp-hl-tasks" x="332" y="24" width="192" height="48" rx="8" fill="none" stroke="#58a6ff" stroke-width="2.5" opacity="0"/>

<line x1="428" y1="70" x2="428" y2="84" stroke="#30363d" stroke-width="1.2" marker-end="url(#wp-arr)"/>

<!-- Parquet Writers -->
<g id="wp-writers-box">
  <rect x="334" y="86" width="188" height="44" rx="7" fill="#0a1f10" stroke="#56d364" stroke-width="1.4"/>
  <text x="350" y="104" font-family="system-ui" font-size="10.5" font-weight="600" fill="#e6edf3">Parquet Writers (×9)</text>
  <text x="350" y="119" font-family="ui-monospace" font-size="8.5" fill="rgba(86,211,100,0.6)">128 MB target · Snappy compression</text>
</g>
<rect id="wp-hl-writers" x="332" y="84" width="192" height="48" rx="8" fill="none" stroke="#56d364" stroke-width="2.5" opacity="0"/>

<line x1="428" y1="130" x2="428" y2="144" stroke="#30363d" stroke-width="1.2" marker-end="url(#wp-arr)"/>

<!-- Column Stats -->
<g id="wp-colstats-box">
  <rect x="334" y="146" width="188" height="44" rx="7" fill="#1a1a10" stroke="#e3b341" stroke-width="1.4"/>
  <text x="350" y="164" font-family="system-ui" font-size="10.5" font-weight="600" fill="#e6edf3">Column Statistics</text>
  <text x="350" y="179" font-family="ui-monospace" font-size="8.5" fill="rgba(227,179,65,0.6)">min/max/null_count per column</text>
</g>
<rect id="wp-hl-colstats" x="332" y="144" width="192" height="48" rx="8" fill="none" stroke="#e3b341" stroke-width="2.5" opacity="0"/>

<line x1="428" y1="190" x2="428" y2="204" stroke="#30363d" stroke-width="1.2" marker-end="url(#wp-arr)"/>

<!-- Manifest Files -->
<g id="wp-maniffiles-box">
  <rect x="334" y="206" width="188" height="44" rx="7" fill="#1a1030" stroke="#f0883e" stroke-width="1.4"/>
  <text x="350" y="224" font-family="system-ui" font-size="10.5" font-weight="600" fill="#e6edf3">Manifest Files (×3)</text>
  <text x="350" y="239" font-family="ui-monospace" font-size="8.5" fill="rgba(240,136,62,0.6)">BR · US · DE — file-level index</text>
</g>
<rect id="wp-hl-maniffiles" x="332" y="204" width="192" height="48" rx="8" fill="none" stroke="#f0883e" stroke-width="2.5" opacity="0"/>

<line x1="428" y1="250" x2="428" y2="264" stroke="#30363d" stroke-width="1.2" marker-end="url(#wp-arr)"/>

<!-- Manifest List -->
<g id="wp-maniflist-box">
  <rect x="334" y="266" width="188" height="44" rx="7" fill="#1a1030" stroke="#bc8cff" stroke-width="1.4"/>
  <text x="350" y="284" font-family="system-ui" font-size="10.5" font-weight="600" fill="#e6edf3">Manifest List</text>
  <text x="350" y="299" font-family="ui-monospace" font-size="8.5" fill="rgba(188,140,255,0.6)">snap-847.avro · 3 manifest entries</text>
</g>
<rect id="wp-hl-maniflist" x="332" y="264" width="192" height="48" rx="8" fill="none" stroke="#bc8cff" stroke-width="2.5" opacity="0"/>

<line x1="428" y1="310" x2="428" y2="324" stroke="#30363d" stroke-width="1.2" marker-end="url(#wp-arr)"/>

<!-- metadata.json -->
<g id="wp-meta-box">
  <rect x="334" y="326" width="188" height="56" rx="7" fill="#130a1a" stroke="#a371f7" stroke-width="1.4"/>
  <text x="350" y="346" font-family="system-ui" font-size="10.5" font-weight="600" fill="#e6edf3">metadata.json</text>
  <text x="350" y="360" font-family="ui-monospace" font-size="8.5" fill="rgba(163,113,247,0.7)">v12 → v13</text>
  <text x="350" y="372" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,0.4)">snapshot_id: 847 · seq: 847</text>
</g>
<rect id="wp-hl-meta" x="332" y="324" width="192" height="60" rx="8" fill="none" stroke="#a371f7" stroke-width="2.5" opacity="0"/>

<!-- ═══ RIGHT COLUMN: S3 ═══ -->
<rect x="670" y="22" width="218" height="300" rx="8" fill="#0a1117" stroke="#30363d" stroke-width="1.2"/>
<text x="686" y="41" font-family="system-ui" font-size="10" font-weight="700" fill="rgba(139,148,158,0.6)">S3 / shopkart-lakehouse</text>
<line x1="670" y1="50" x2="888" y2="50" stroke="#1c2128" stroke-width="1"/>

<!-- BR folder -->
<g id="wp-s3-br">
  <rect x="680" y="58" width="198" height="72" rx="5" fill="#111a11" stroke="#1e3a1e" stroke-width="1"/>
  <text x="694" y="76" font-family="ui-monospace" font-size="8.5" fill="rgba(86,211,100,0.5)">country=BR /</text>
  <text x="694" y="89" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,0.35)">order_date_month=*</text>
  <text id="wp-br-count" x="694" y="103" font-family="ui-monospace" font-size="9" fill="rgba(86,211,100,0.3)">0 files</text>
  <text id="wp-br-size" x="694" y="118" font-family="ui-monospace" font-size="7.5" fill="rgba(139,148,158,0.25)">0 bytes</text>
</g>

<!-- US folder -->
<g id="wp-s3-us">
  <rect x="680" y="140" width="198" height="72" rx="5" fill="#111a11" stroke="#1e3a1e" stroke-width="1"/>
  <text x="694" y="158" font-family="ui-monospace" font-size="8.5" fill="rgba(86,211,100,0.5)">country=US /</text>
  <text x="694" y="171" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,0.35)">order_date_month=*</text>
  <text id="wp-us-count" x="694" y="185" font-family="ui-monospace" font-size="9" fill="rgba(86,211,100,0.3)">0 files</text>
  <text id="wp-us-size" x="694" y="200" font-family="ui-monospace" font-size="7.5" fill="rgba(139,148,158,0.25)">0 bytes</text>
</g>

<!-- DE folder -->
<g id="wp-s3-de">
  <rect x="680" y="222" width="198" height="72" rx="5" fill="#111a11" stroke="#1e3a1e" stroke-width="1"/>
  <text x="694" y="240" font-family="ui-monospace" font-size="8.5" fill="rgba(86,211,100,0.5)">country=DE /</text>
  <text x="694" y="253" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,0.35)">order_date_month=*</text>
  <text id="wp-de-count" x="694" y="267" font-family="ui-monospace" font-size="9" fill="rgba(86,211,100,0.3)">0 files</text>
  <text id="wp-de-size" x="694" y="282" font-family="ui-monospace" font-size="7.5" fill="rgba(139,148,158,0.25)">0 bytes</text>
</g>

<!-- S3 file count overlays (shown in step 3) -->
<g id="wp-s3-active" opacity="0">
  <text x="694" y="103" font-family="ui-monospace" font-size="9" font-weight="700" fill="#56d364">119 files</text>
  <text x="694" y="118" font-family="ui-monospace" font-size="7.5" fill="rgba(86,211,100,0.6)">14.9 GB</text>
  <text x="694" y="185" font-family="ui-monospace" font-size="9" font-weight="700" fill="#56d364">119 files</text>
  <text x="694" y="200" font-family="ui-monospace" font-size="7.5" fill="rgba(86,211,100,0.6)">14.9 GB</text>
  <text x="694" y="267" font-family="ui-monospace" font-size="9" font-weight="700" fill="#56d364">118 files</text>
  <text x="694" y="282" font-family="ui-monospace" font-size="7.5" fill="rgba(86,211,100,0.6)">14.8 GB</text>
  <!-- "Not yet visible" badge -->
  <rect x="670" y="304" width="218" height="18" rx="4" fill="rgba(248,81,73,0.1)" stroke="rgba(248,81,73,0.3)" stroke-width="1"/>
  <text x="779" y="316" text-anchor="middle" font-family="system-ui" font-size="8" fill="#f85149">Not yet visible to readers — no snapshot yet</text>
</g>

<!-- Column stats overlay (shown in step 4) -->
<g id="wp-colstats-overlay" opacity="0">
  <rect x="670" y="330" width="218" height="104" rx="6" fill="#0d1117" stroke="#e3b341" stroke-width="1.2"/>
  <text x="682" y="348" font-family="system-ui" font-size="9" font-weight="700" fill="#e3b341">Column Statistics</text>
  <text x="682" y="364" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,0.7)">order_id:</text>
  <text x="780" y="364" font-family="ui-monospace" font-size="8" fill="rgba(230,237,243,0.8)">min=1001 max=45000999</text>
  <text x="682" y="378" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,0.7)">total_amount:</text>
  <text x="780" y="378" font-family="ui-monospace" font-size="8" fill="rgba(230,237,243,0.8)">min=0.99 max=4899.00</text>
  <text x="682" y="392" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,0.7)">null_count:</text>
  <text x="780" y="392" font-family="ui-monospace" font-size="8" fill="#56d364">0</text>
  <text x="682" y="410" font-family="system-ui" font-size="7.5" fill="rgba(86,211,100,0.6)">Written once, used for all future queries</text>
  <text x="682" y="424" font-family="system-ui" font-size="7.5" fill="rgba(227,179,65,0.6)">Enables partition + file skip pruning</text>
</g>

<!-- Manifest cards (shown in step 5) -->
<g id="wp-manif-cards" opacity="0">
  <rect x="670" y="330" width="218" height="104" rx="6" fill="#0d1117" stroke="#f0883e" stroke-width="1.2"/>
  <text x="682" y="348" font-family="system-ui" font-size="9" font-weight="700" fill="#f0883e">3 Manifest Files</text>
  <rect x="680" y="354" width="198" height="20" rx="3" fill="#1a1030"/>
  <text x="688" y="368" font-family="ui-monospace" font-size="8" fill="rgba(240,136,62,0.8)">manifest-BR.avro — 119 file entries</text>
  <rect x="680" y="378" width="198" height="20" rx="3" fill="#1a1030"/>
  <text x="688" y="392" font-family="ui-monospace" font-size="8" fill="rgba(240,136,62,0.8)">manifest-US.avro — 119 file entries</text>
  <rect x="680" y="402" width="198" height="20" rx="3" fill="#1a1030"/>
  <text x="688" y="416" font-family="ui-monospace" font-size="8" fill="rgba(240,136,62,0.8)">manifest-DE.avro — 118 file entries</text>
  <text x="682" y="430" font-family="system-ui" font-size="7.5" fill="rgba(139,148,158,0.6)">356 total data files referenced</text>
</g>

<!-- Concurrency check (shown in step 7) -->
<g id="wp-concurrency-box" opacity="0">
  <rect x="670" y="330" width="218" height="90" rx="6" fill="#0d1117" stroke="#58a6ff" stroke-width="1.5"/>
  <text x="779" y="350" text-anchor="middle" font-family="system-ui" font-size="12">🔒</text>
  <text x="779" y="368" text-anchor="middle" font-family="system-ui" font-size="9" font-weight="700" fill="#58a6ff">Optimistic Concurrency Check</text>
  <text x="779" y="384" text-anchor="middle" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.8)">Expected: v12</text>
  <text x="779" y="398" text-anchor="middle" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.8)">Found: v12</text>
  <text x="779" y="414" text-anchor="middle" font-family="ui-monospace" font-size="9" font-weight="700" fill="#56d364">✓ No conflict — safe to commit</text>
</g>

<!-- Commit badge (shown in step 8) -->
<g id="wp-commit-badge" opacity="0">
  <rect x="670" y="330" width="218" height="90" rx="6" fill="rgba(86,211,100,0.08)" stroke="#56d364" stroke-width="1.5"/>
  <text x="779" y="355" text-anchor="middle" font-family="system-ui" font-size="14">✅</text>
  <text x="779" y="375" text-anchor="middle" font-family="system-ui" font-size="10" font-weight="700" fill="#56d364">Snapshot 847 Committed</text>
  <text x="779" y="391" text-anchor="middle" font-family="ui-monospace" font-size="8.5" fill="rgba(86,211,100,0.7)">metadata.json: v12 → v13</text>
  <text x="779" y="407" text-anchor="middle" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.7)">45M rows now visible</text>
  <text x="779" y="416" text-anchor="middle" font-family="system-ui" font-size="7.5" fill="rgba(139,148,158,0.5)">conditional PUT (if-none-match)</text>
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
      if (glowColor === 'purple') el.style.filter = 'drop-shadow(0 0 8px rgba(163,113,247,0.7))';
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
      AE.fnStep('Write Job Submitted', '', (ctx) => {
        show('wp-hl-driver', 'blue');
        show('wp-hl-tasks', 'blue');
      }, () => {
        hide('wp-hl-driver');
        hide('wp-hl-tasks');
      }, 2400),

      AE.fnStep('Task Parallelism', '', (ctx) => {
        unglow('wp-hl-tasks');
        show('wp-hl-e1', 'orange');
        show('wp-hl-e2', 'orange');
        show('wp-hl-e3', 'orange');
        show('wp-exec-arrows');
      }, () => {
        hide('wp-hl-e1');
        hide('wp-hl-e2');
        hide('wp-hl-e3');
        hide('wp-exec-arrows');
      }, 2600),

      AE.fnStep('Parquet File Writing', '', (ctx) => {
        unglow('wp-hl-e1'); unglow('wp-hl-e2'); unglow('wp-hl-e3');
        show('wp-hl-writers', 'green');
        show('wp-write-arrow');
        show('wp-s3-active');
      }, () => {
        hide('wp-hl-writers');
        hide('wp-write-arrow');
        hide('wp-s3-active');
      }, 3000),

      AE.fnStep('Column Statistics Collected', '', (ctx) => {
        unglow('wp-hl-writers');
        show('wp-hl-colstats', 'yellow');
        show('wp-colstats-overlay');
      }, () => {
        hide('wp-hl-colstats');
        hide('wp-colstats-overlay');
      }, 3000),

      AE.fnStep('Manifest Files Assembled', '', (ctx) => {
        unglow('wp-hl-colstats');
        show('wp-hl-maniffiles', 'orange');
        show('wp-manif-cards');
      }, () => {
        hide('wp-hl-maniffiles');
        hide('wp-manif-cards');
      }, 2800),

      AE.fnStep('Manifest List Created', '', (ctx) => {
        unglow('wp-hl-maniffiles');
        show('wp-hl-maniflist', 'purple');
      }, () => {
        hide('wp-hl-maniflist');
      }, 2600),

      AE.fnStep('Optimistic Concurrency Check', '', (ctx) => {
        unglow('wp-hl-maniflist');
        show('wp-hl-meta', 'blue');
        show('wp-concurrency-box');
      }, () => {
        hide('wp-hl-meta');
        hide('wp-concurrency-box');
      }, 2800),

      AE.fnStep('Atomic Metadata Commit', '', (ctx) => {
        hide('wp-concurrency-box');
        show('wp-hl-meta', 'green');
        show('wp-commit-badge');
        show('wp-s3-active');
      }, () => {
        hide('wp-hl-meta');
        hide('wp-commit-badge');
        hide('wp-s3-active');
      }, 4000),
    ];
  }

  /* ── Sidebar wiring ─────────────────────────────────────── */
  function _buildSidebar(page, engine, stepsData) {
    const list    = page.querySelector('#wp-steps-list');
    const titleEl = page.querySelector('#wp-step-title');
    const descEl  = page.querySelector('#wp-step-desc');
    if (!list) return;

    list.innerHTML = stepsData.map((s, i) => `
      <div class="wp-step-item" data-step="${i}">
        <div class="wp-step-badge">${i + 1}</div>
        <div class="wp-step-text">${s.label}</div>
      </div>
    `).join('');

    engine.on('stepchange', (idx) => {
      list.querySelectorAll('.wp-step-item').forEach((el, i) => {
        el.classList.toggle('active', i === idx);
        el.classList.toggle('done', i < idx);
      });
      const step = idx >= 0 ? stepsData[idx] : null;
      if (titleEl) titleEl.textContent = step ? step.label : 'Press Play to begin';
      if (descEl)  descEl.textContent  = step ? step.desc  : 'Watch Iceberg\'s complete write path for a 45M-row legacy order migration into the ShopKart production table.';
      const active = list.querySelector('.wp-step-item.active');
      if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });

    list.addEventListener('click', (e) => {
      const item = e.target.closest('[data-step]');
      if (item) engine.goto(parseInt(item.dataset.step, 10));
    });
  }

  /* ── Module ─────────────────────────────────────────────── */
  const mod = {
    id: 'write-path',
    title: 'Write Path',
    group: 'read-ops',
    _engine: null,

    render(container) {
      container.innerHTML = '';
      _injectStyles();

      const page = document.createElement('div');
      page.className = 'wp-page page-enter';
      page.innerHTML = `
        <div class="wp-outer">
          <div class="wp-canvas" id="wp-canvas"></div>
          <div class="wp-sidebar">
            <div class="wp-sidebar-header">
              <div class="wp-sidebar-title" id="wp-step-title">Press Play to begin</div>
              <div class="wp-sidebar-desc" id="wp-step-desc">Watch Iceberg's complete write path for a 45M-row legacy order migration into the ShopKart production table.</div>
            </div>
            <div class="wp-steps-list" id="wp-steps-list"></div>
            <div class="wp-code-panel">
              <div class="wp-info-label">Migration Query</div>
              <div class="wp-sql-block"><span class="wp-kw">INSERT INTO</span> prod.orders
<span class="wp-kw">SELECT</span> * <span class="wp-kw">FROM</span> legacy_orders
<span class="wp-kw">WHERE</span> migrated = <span class="wp-str">false</span></div>
              <div class="wp-info-label">Write Statistics</div>
              <div class="wp-stat-grid">
                <div class="wp-stat-card">
                  <div class="wp-stat-label">Total Rows</div>
                  <div class="wp-stat-value blue">45M</div>
                  <div class="wp-stat-sub">legacy orders</div>
                </div>
                <div class="wp-stat-card">
                  <div class="wp-stat-label">Parquet Files</div>
                  <div class="wp-stat-value">356</div>
                  <div class="wp-stat-sub">~128 MB each</div>
                </div>
                <div class="wp-stat-card">
                  <div class="wp-stat-label">Partitions</div>
                  <div class="wp-stat-value">3</div>
                  <div class="wp-stat-sub">BR · US · DE</div>
                </div>
                <div class="wp-stat-card">
                  <div class="wp-stat-label">Write Tasks</div>
                  <div class="wp-stat-value orange">9</div>
                  <div class="wp-stat-sub">3 per executor</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      container.appendChild(page);

      const svg    = _buildSVG();
      page.querySelector('#wp-canvas').appendChild(svg);

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
      document.getElementById('wp-styles')?.remove();
    },
  };

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.modules = window.IcebergViz.modules || {};
  window.IcebergViz.modules['write-path'] = mod;
})();
