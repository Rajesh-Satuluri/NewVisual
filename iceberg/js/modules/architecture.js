/* ============================================================
   Architecture Module
   Tab 1: Interactive Metadata Hierarchy SVG diagram
   Tab 2: Query Path Animation (15-step read path)
   ============================================================ */

(function () {
  'use strict';

  const D = () => window.IcebergViz.Data;
  const AE = () => window.IcebergViz.AnimationEngine;
  const CV = () => window.IcebergViz.CodeViewer;
  // CodeViewer.create() returns an element; detail panels build HTML strings,
  // so serialise to markup here (interpolating the element gave
  // "[object HTMLDivElement]"). Inline JSON comments are preserved.
  const _codeHTML = (code, lang, title) => CV().create(code, lang, title).outerHTML;

  const mod = {
    id: 'architecture',
    title: 'Architecture',
    group: 'foundations',
    _cleanups: [],
    _engine: null,

    render(container) {
      container.innerHTML = '';
      const page = document.createElement('div');
      page.className = 'arch-page page-enter';
      page.innerHTML = _buildShell();
      container.appendChild(page);

      _buildHierarchyDiagram(page.querySelector('#arch-diagram-container'));
      _buildQueryPathView(page.querySelector('#arch-querypath-container'));
      _wireTabBar(page, this);
      _wireHierarchyInteractions(page, this._cleanups);

      /* ── Draggable resizer: diagram canvas ↔ detail panel (laptop only) ── */
      const main = page.querySelector('.arch-main');
      if (main && window.IcebergViz.SplitPane) {
        this._split = window.IcebergViz.SplitPane.attach(main, {
          key: 'iceberg/architecture',
          disableBelow: 820,
          tracks: [
            { flex: true, min: 300 },          // metadata hierarchy diagram
            { min: 280, max: 560, def: 380 },  // detail panel
          ],
        });
      }
    },

    destroy() {
      if (this._split) { this._split.detach(); this._split = null; }
      this._cleanups.forEach(fn => fn && fn());
      this._cleanups = [];
      if (this._engine) { this._engine.destroy(); this._engine = null; }
      window.IcebergViz.AnimationControls.hide();
    },
  };

  /* ── Shell HTML ────────────────────────────────────────── */
  function _buildShell() {
    return `
<style>
.arch-page { display:flex; flex-direction:column; height:100%; overflow:hidden; }

/* Tab bar */
.arch-tabs {
  display: flex;
  align-items: center;
  gap: 0;
  background: var(--bg-2);
  border-bottom: 1px solid var(--border-default);
  padding: 0 var(--space-5);
  flex-shrink: 0;
}

.arch-tab-btn {
  padding: 14px var(--space-5);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color var(--ease-fast), border-color var(--ease-fast);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  white-space: nowrap;
}
.arch-tab-btn:hover { color: var(--text-secondary); }
.arch-tab-btn.active { color: var(--blue); border-bottom-color: var(--blue); }

/* Main split area */
.arch-main {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 380px;
  overflow: hidden;
  min-height: 0;
}

.arch-canvas {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
  overflow: hidden;
  position: relative;
  background: var(--bg-1);
}

.arch-detail-panel {
  border-left: 1px solid var(--border-default);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-2);
}

.arch-detail-header {
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border-default);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-shrink: 0;
}

.arch-detail-icon {
  font-size: 22px;
}

.arch-detail-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
}

.arch-detail-subtitle {
  font-size: var(--text-xs);
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.arch-detail-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
}

.arch-detail-section {
  margin-bottom: var(--space-5);
}

.arch-detail-section-title {
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin-bottom: var(--space-3);
}

/* "Where it sits" relationship strip */
.arch-rel {
  margin-bottom: var(--space-4);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--bg-1);
}
.arch-rel-row {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  padding: 7px var(--space-3);
  font-size: var(--text-xs);
  line-height: 1.5;
}
.arch-rel-row + .arch-rel-row { border-top: 1px solid var(--border-default); }
.arch-rel-row.is-self { background: var(--brand-glow, rgba(74,174,255,.10)); }
.arch-rel-dir {
  flex-shrink: 0;
  width: 58px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .04em;
  font-size: 9.5px;
  color: var(--text-muted);
  padding-top: 1px;
}
.arch-rel-row.is-self .arch-rel-dir { color: var(--blue); }
.arch-rel-main { color: var(--text-secondary); }
.arch-rel-main strong { color: var(--text-primary); font-weight: 600; }
.arch-rel-main code {
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--text-secondary);
}

.arch-detail-body p.layer-card-desc + .code-block { margin-top: var(--space-3); }

/* Field-guide list: what the key fields on this node mean */
.arch-fields {
  list-style: none;
  margin: 0;
  padding: 0;
}
.arch-fields li {
  display: flex;
  gap: var(--space-2);
  padding: 6px 0;
  font-size: var(--text-xs);
  line-height: 1.55;
  color: var(--text-secondary);
  border-top: 1px solid var(--border-subtle, var(--border-default));
}
.arch-fields li:first-child { border-top: none; }
.arch-fields code {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--blue);
  white-space: nowrap;
}

/* Layer description cards */
.layer-card {
  background: var(--bg-3);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-3);
}

.layer-card-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.layer-card-desc {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  line-height: var(--leading-relaxed);
}

/* Query path layout */
.qp-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.qp-canvas {
  flex: 1;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-1);
  padding: var(--space-4);
}

.qp-step-info {
  border-top: 1px solid var(--border-default);
  padding: var(--space-4) var(--space-5);
  background: var(--bg-2);
  flex-shrink: 0;
  min-height: 80px;
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
}

.qp-step-num {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--text-muted);
  white-space: nowrap;
  padding-top: 3px;
}

.qp-step-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.qp-step-desc {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: var(--leading-relaxed);
}

/* Node tooltip */
.arch-node-clickable {
  cursor: pointer;
}

.arch-node-clickable rect,
.arch-node-clickable path {
  transition: fill 0.15s ease, stroke 0.15s ease;
}

.arch-node-clickable:hover rect,
.arch-node-clickable:hover path {
  filter: brightness(1.15);
}

.arch-selected rect,
.arch-selected path {
  stroke: var(--blue) !important;
  stroke-width: 2 !important;
}
</style>

<!-- Tab bar -->
<div class="arch-tabs">
  <button class="arch-tab-btn active" data-tab="hierarchy">
    🗂 Metadata Hierarchy
  </button>
  <button class="arch-tab-btn" data-tab="querypath">
    🔍 Query Path Animation
  </button>
</div>

<!-- Tab: Metadata Hierarchy -->
<div id="arch-tab-hierarchy" class="arch-main">
  <div class="arch-canvas" id="arch-diagram-container"></div>
  <div class="arch-detail-panel" id="arch-detail-panel">
    <div class="arch-detail-header">
      <div class="arch-detail-icon">🗂</div>
      <div>
        <div class="arch-detail-title">Metadata Hierarchy</div>
        <div class="arch-detail-subtitle">Click any node to explore</div>
      </div>
    </div>
    <div class="arch-detail-body" id="arch-detail-body">
      ${_defaultDetailHTML()}
    </div>
  </div>
</div>

<!-- Tab: Query Path -->
<div id="arch-tab-querypath" style="display:none;flex:1;flex-direction:column;overflow:hidden;">
  <div id="arch-querypath-container" style="flex:1;overflow:hidden;display:flex;flex-direction:column;"></div>
</div>
`;
  }

  /* ── Default Detail Panel ──────────────────────────────── */
  function _defaultDetailHTML() {
    return `
      <p style="color:var(--text-secondary);font-size:var(--text-sm);line-height:var(--leading-relaxed);margin-bottom:var(--space-4)">
        The Iceberg metadata hierarchy is a six-layer tree that describes every file in the table.
        A query walks it top-down, pruning at each level so it opens only the data files it truly needs.
      </p>
      <p style="color:var(--text-muted);font-size:var(--text-xs);line-height:var(--leading-relaxed);margin-bottom:var(--space-5)">
        <strong>Click any node</strong> in the diagram to see its real contents, the fields explained,
        and how it links to the layers above and below.
      </p>
      <div class="layer-card">
        <div class="layer-card-title">🏛 Layer 1 — Catalog</div>
        <div class="layer-card-desc">Maps the table name → current metadata.json location. AWS Glue, Hive Metastore, Nessie, or REST Catalog. The atomic pointer swap here is the transaction.</div>
      </div>
      <div class="layer-card">
        <div class="layer-card-title">📄 Layer 2 — Metadata File</div>
        <div class="layer-card-desc">metadata.json — schema history, partition specs, sort orders, table properties, every snapshot, and the current pointers. Rewritten on every commit.</div>
      </div>
      <div class="layer-card">
        <div class="layer-card-title">📸 Layer 3 — Snapshots</div>
        <div class="layer-card-desc">One immutable record per commit. Each points to a manifest list and carries a change summary. Choosing a snapshot is how time travel &amp; rollback work.</div>
      </div>
      <div class="layer-card">
        <div class="layer-card-title">📋 Layer 4 — Manifest List</div>
        <div class="layer-card-desc">Avro file (snap-*.avro) listing every manifest for a snapshot with partition bounds — the first pruning stage.</div>
      </div>
      <div class="layer-card">
        <div class="layer-card-title">📊 Layer 5 — Manifest Files</div>
        <div class="layer-card-desc">Avro files listing data files with column-level statistics (min, max, null counts) — the second pruning stage.</div>
      </div>
      <div class="layer-card">
        <div class="layer-card-title">🗄 Layer 6 — Data Files</div>
        <div class="layer-card-desc">Parquet / ORC / Avro files holding the actual rows. Immutable leaves of the tree — writes create new files, never edit these.</div>
      </div>
    `;
  }

  /* ── Hierarchy Diagram SVG ─────────────────────────────── */
  function _buildHierarchyDiagram(container) {
    const W = 820, H = 640;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.maxWidth = W + 'px';
    svg.style.maxHeight = H + 'px';
    svg.id = 'arch-svg';

    svg.innerHTML = `
<defs>
  <linearGradient id="gCatalog" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#1f6feb" stop-opacity="0.9"/>
    <stop offset="100%" stop-color="#388bfd" stop-opacity="0.9"/>
  </linearGradient>
  <linearGradient id="gMeta" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#6e40c9"/>
    <stop offset="100%" stop-color="#a371f7"/>
  </linearGradient>
  <linearGradient id="gSnap" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#2ea043"/>
    <stop offset="100%" stop-color="#3fb950"/>
  </linearGradient>
  <linearGradient id="gManifestList" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#b45309"/>
    <stop offset="100%" stop-color="#f97316"/>
  </linearGradient>
  <linearGradient id="gManifest" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#1e5a8c"/>
    <stop offset="100%" stop-color="#2188ff"/>
  </linearGradient>
  <linearGradient id="gData" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#1a4731"/>
    <stop offset="100%" stop-color="#238636"/>
  </linearGradient>
  <filter id="glow-blue">
    <feGaussianBlur stdDeviation="3" result="blur"/>
    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5"
    markerWidth="6" markerHeight="6" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#484f58"/>
  </marker>
  <marker id="arrow-blue" viewBox="0 0 10 10" refX="9" refY="5"
    markerWidth="6" markerHeight="6" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#58a6ff"/>
  </marker>
</defs>

<!-- ── Background grid ───────────────────────────────────── -->
<rect width="${W}" height="${H}" fill="var(--bg-1)"/>

<!-- Watermark label -->
<text x="14" y="26" font-family="system-ui" font-size="11" fill="rgba(139,148,158,0.4)" font-weight="600" letter-spacing="1">
  ShopKart Global E-Commerce Lakehouse
</text>

<!-- ── LAYER LABELS ───────────────────────────────────────── -->
${_layerLabel(22, 'Layer 1', '— Catalog')}
${_layerLabel(140, 'Layer 2', '— Metadata File')}
${_layerLabel(270, 'Layer 3', '— Snapshots')}
${_layerLabel(390, 'Layer 4', '— Manifest List')}
${_layerLabel(500, 'Layer 5', '— Manifest Files')}
${_layerLabel(600, 'Layer 6', '— Data Files')}

<!-- ── CONNECTOR LINES ────────────────────────────────────── -->
<!-- Catalog → metadata.json -->
<line x1="410" y1="96" x2="410" y2="140" stroke="#484f58" stroke-width="1.5" marker-end="url(#arrow)"/>

<!-- metadata.json → snapshots -->
<line x1="290" y1="200" x2="235" y2="268" stroke="#484f58" stroke-width="1.5" marker-end="url(#arrow)"/>
<line x1="410" y1="200" x2="410" y2="268" stroke="#484f58" stroke-width="1.5" marker-end="url(#arrow)"/>
<line x1="530" y1="200" x2="585" y2="268" stroke="#484f58" stroke-width="1.5" marker-end="url(#arrow)"/>

<!-- Current snapshot (center) → manifest list -->
<line x1="410" y1="318" x2="500" y2="388" stroke="#3fb950" stroke-width="2" stroke-dasharray="5 3" marker-end="url(#arrow)"/>
<text x="430" y="360" font-family="system-ui" font-size="10" fill="var(--green)" opacity="0.8" transform="rotate(-30,430,360)">current</text>

<!-- manifest list → manifests -->
<line x1="450" y1="445" x2="260" y2="498" stroke="#484f58" stroke-width="1.5" marker-end="url(#arrow)"/>
<line x1="500" y1="445" x2="500" y2="498" stroke="#484f58" stroke-width="1.5" marker-end="url(#arrow)"/>
<line x1="550" y1="445" x2="680" y2="498" stroke="#484f58" stroke-width="1.5" marker-end="url(#arrow)"/>

<!-- manifests → data files -->
<line x1="230" y1="548" x2="160" y2="598" stroke="#484f58" stroke-width="1" marker-end="url(#arrow)"/>
<line x1="260" y1="548" x2="260" y2="598" stroke="#484f58" stroke-width="1" marker-end="url(#arrow)"/>
<line x1="500" y1="548" x2="500" y2="598" stroke="#484f58" stroke-width="1" marker-end="url(#arrow)"/>
<line x1="650" y1="548" x2="620" y2="598" stroke="#484f58" stroke-width="1" marker-end="url(#arrow)"/>
<line x1="710" y1="548" x2="710" y2="598" stroke="#484f58" stroke-width="1" marker-end="url(#arrow)"/>

<!-- ── LAYER 1: CATALOG ───────────────────────────────────── -->
${_node({
  id: 'node-catalog', x: 260, y: 48, w: 300, h: 56,
  fill: 'url(#gCatalog)', stroke: '#388bfd',
  icon: '🏛', title: 'AWS Glue Data Catalog',
  subtitle: 'shopkart_prod.orders',
  badge: 'CATALOG',
})}

<!-- ── LAYER 2: METADATA.JSON ────────────────────────────── -->
${_node({
  id: 'node-metadata', x: 250, y: 140, w: 320, h: 60,
  fill: 'url(#gMeta)', stroke: '#a371f7',
  icon: '📄', title: 'v12-a3f8bc.metadata.json',
  subtitle: 'format-version: 2  ·  schemas: 4  ·  snapshots: 47',
  badge: 'METADATA',
})}

<!-- ── LAYER 3: SNAPSHOTS ─────────────────────────────────── -->
${_node({
  id: 'node-snap1', x: 100, y: 268, w: 175, h: 54,
  fill: '#1a2030', stroke: '#30363d',
  icon: '📸', title: 'snap-1001',
  subtitle: 'append  ·  expired',
  badge: null, dim: true,
})}
${_node({
  id: 'node-snap2', x: 322, y: 268, w: 175, h: 54,
  fill: '#1a2030', stroke: '#30363d',
  icon: '📸', title: 'snap-3051 (tagged)',
  subtitle: 'append  ·  q4_2024_close',
  badge: null,
})}
${_node({
  id: 'node-snap-current', x: 512, y: 268, w: 195, h: 54,
  fill: 'url(#gSnap)', stroke: '#3fb950',
  icon: '📸', title: 'snap-8922 ← current',
  subtitle: 'append  ·  2024-11-29',
  badge: 'CURRENT',
})}

<!-- ── LAYER 4: MANIFEST LIST ────────────────────────────── -->
${_node({
  id: 'node-mlist', x: 355, y: 390, w: 295, h: 54,
  fill: 'url(#gManifestList)', stroke: '#f97316',
  icon: '📋', title: 'snap-8922...-a3f8bc.avro',
  subtitle: 'manifest list  ·  3 entries  ·  10.3 KB',
  badge: 'MANIFEST LIST',
})}

<!-- ── LAYER 5: MANIFESTS ────────────────────────────────── -->
${_node({
  id: 'node-m-br', x: 90, y: 498, w: 185, h: 50,
  fill: 'url(#gManifest)', stroke: '#2188ff',
  icon: '📊', title: 'a1b2c3d4-manifest.avro',
  subtitle: 'BR · 2024-11-29 · 3 files',
  badge: null,
})}
${_node({
  id: 'node-m-us', x: 407, y: 498, w: 185, h: 50,
  fill: 'url(#gManifest)', stroke: '#2188ff',
  icon: '📊', title: 'e5f6g7h8-manifest.avro',
  subtitle: 'US · 2024-11-29 · 389 files',
  badge: null,
})}
${_node({
  id: 'node-m-de', x: 601, y: 498, w: 185, h: 50,
  fill: 'url(#gManifest)', stroke: '#2188ff',
  icon: '📊', title: 'i9j0k1l2-manifest.avro',
  subtitle: 'DE · 2024-11-29 · 47 files',
  badge: null,
})}

<!-- ── LAYER 6: DATA FILES ────────────────────────────────── -->
${_dataFileNode(118, 598, 'part-00000-a1b2.parquet', '134 MB')}
${_dataFileNode(221, 598, 'part-00001-c3d4.parquet', '128 MB')}
${_dataFileNode(440, 598, 'part-00000-e5f6.parquet', '127 MB')}
${_dataFileNode(583, 598, 'part-00000-i9j0.parquet', '131 MB')}
${_dataFileNode(673, 598, 'part-00001-k1l2.parquet', '129 MB')}
`;

    container.appendChild(svg);
  }

  function _layerLabel(y, l1, l2) {
    return `<text x="14" y="${y + 12}" font-family="system-ui" font-size="10" fill="rgba(139,148,158,0.55)" font-weight="600">
      <tspan>${l1}</tspan><tspan fill="rgba(139,148,158,0.35)">${l2}</tspan>
    </text>
    <line x1="14" y1="${y + 18}" x2="820" y2="${y + 18}" stroke="rgba(48,54,61,0.5)" stroke-width="1" stroke-dasharray="3 5"/>`;
  }

  function _node({ id, x, y, w, h, fill, stroke, icon, title, subtitle, badge, dim }) {
    const rx = 8;
    const opacity = dim ? 0.4 : 1;
    return `
<g id="${id}" class="arch-node-clickable" opacity="${opacity}" transform="translate(${x},${y})">
  <rect width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" opacity="0.9"/>
  <rect width="${w}" height="${h}" rx="${rx}" fill="rgba(255,255,255,0.03)" stroke="none"/>
  <text x="12" y="22" font-size="16" dominant-baseline="middle">${icon}</text>
  <text x="36" y="18" font-family="system-ui,-apple-system,sans-serif" font-size="12" font-weight="600" fill="#e6edf3" dominant-baseline="auto">${_truncate(title, 32)}</text>
  <text x="36" y="34" font-family="ui-monospace,SFMono-Regular,monospace" font-size="10" fill="rgba(230,237,243,0.6)" dominant-baseline="auto">${subtitle}</text>
  ${badge ? `<rect x="${w - _badgeW(badge) - 8}" y="8" width="${_badgeW(badge)}" height="16" rx="4" fill="rgba(0,0,0,0.3)"/>
  <text x="${w - _badgeW(badge)/2 - 8}" y="16" text-anchor="middle" font-family="system-ui" font-size="9" font-weight="700" fill="rgba(230,237,243,0.7)" letter-spacing="0.5">${badge}</text>` : ''}
</g>`;
  }

  function _dataFileNode(x, y, name, size) {
    return `
<g class="arch-node-clickable" transform="translate(${x},${y})">
  <rect width="90" height="34" rx="5" fill="url(#gData)" stroke="#238636" stroke-width="1" opacity="0.85"/>
  <text x="7" y="13" font-size="11" dominant-baseline="middle">🗄</text>
  <text x="22" y="11" font-family="ui-monospace" font-size="8" fill="#e6edf3" dominant-baseline="auto">${name.substring(0,14)}</text>
  <text x="22" y="23" font-family="system-ui" font-size="8.5" fill="rgba(230,237,243,0.55)">${size}</text>
</g>`;
  }

  function _truncate(s, n) {
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
  }

  function _badgeW(s) { return s.length * 6.5 + 10; }

  /* ── Wire hierarchy node clicks ────────────────────────── */
  function _wireHierarchyInteractions(page, cleanups) {
    const svg = page.querySelector('#arch-svg');
    const detailBody = page.querySelector('#arch-detail-body');
    if (!svg || !detailBody) return;

    const nodeDetails = {
      'node-catalog': _catalogDetail(),
      'node-metadata': _metadataDetail(),
      'node-snap-current': _snapDetail(),
      'node-snap2': _snap2Detail(),
      'node-mlist': _manifestListDetail(),
      'node-m-br': _manifestBRDetail(),
      'node-m-us': _manifestUSDetail(),
      'node-m-de': _manifestDEDetail(),
    };

    const handler = (e) => {
      const node = e.target.closest('[id^="node-"]');
      if (!node) return;
      const detail = nodeDetails[node.id];
      if (!detail) return;

      // Remove previous selection
      svg.querySelectorAll('.arch-selected').forEach(n => n.classList.remove('arch-selected'));
      node.classList.add('arch-selected');

      detailBody.innerHTML = detail;
      detailBody.scrollTop = 0;
    };

    svg.addEventListener('click', handler);
    cleanups.push(() => svg.removeEventListener('click', handler));
  }

  /* ── Node Detail Panels ────────────────────────────────── */
  function _hdr(icon, title, sub) {
    return `
      <div class="arch-detail-header" style="padding:0;margin-bottom:var(--space-4)">
        <div class="arch-detail-icon">${icon}</div>
        <div>
          <div class="arch-detail-title">${title}</div>
          <div class="arch-detail-subtitle">${sub}</div>
        </div>
      </div>`;
  }
  function _infoIcon() {
    return `<svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  }
  function _info(kind, html) {
    return `<div class="info-box info-box-${kind}" style="margin-top:var(--space-3)">${_infoIcon()}<span>${html}</span></div>`;
  }

  function _catalogDetail() {
    return `
      ${_hdr('🏛', 'AWS Glue Data Catalog', 'Layer 1 · shopkart_prod.orders')}
      ${_relations([
        { dir: 'This', self: true, html: '<strong>Catalog</strong> — one row per table' },
        { dir: '↓ Points to', html: 'the current <code>metadata.json</code> (Layer 2)' },
      ])}
      <p class="layer-card-desc" style="margin-bottom:var(--space-4)">
        The catalog is a tiny lookup table that maps a human-readable table name
        (<code>shopkart_prod.orders</code>) to the S3 path of the table's <em>current</em>
        <code>metadata.json</code>. Every engine — Spark, Trino, Athena, Flink — asks the
        catalog first, then follows the pointer down into the tree below.
      </p>
      <p class="layer-card-desc" style="margin-bottom:var(--space-4)">
        This one pointer is what makes Iceberg <strong>ACID</strong>. A commit writes all new
        files first, then swaps <code>metadata_location</code> to the new metadata.json in a
        single atomic compare-and-set. Readers see either the old table or the new one — never
        a half-written state.
      </p>
      ${_codeHTML(JSON.stringify({
        DatabaseName: "shopkart_prod",
        TableName: "orders",
        Parameters: {
          "table_type": "ICEBERG",
          "metadata_location": "s3://shopkart-lakehouse/warehouse/prod/orders/metadata/v12-a3f8bc.metadata.json"
        }
      }, null, 2), 'json', 'Glue Catalog Entry')}
      ${_fieldGuide('Key fields', [
        ['table_type', 'Tells engines to use the Iceberg reader, not treat the folder as raw files.'],
        ['metadata_location', 'The only pointer that changes on a commit — the root of the whole tree.'],
      ])}
      ${_info('tip', 'The <code>metadata_location</code> swap <strong>is</strong> the transaction. Different catalogs implement the atomic swap differently — Glue &amp; Hive use a locked update, the REST catalog and Nessie/Polaris use a commit API, but the guarantee is identical.')}
    `;
  }

  function _metadataDetail() {
    const meta = D().metadataJson.content;
    const simplified = {
      "format-version": meta["format-version"],
      "table-uuid": meta["table-uuid"],
      "location": meta.location,
      "current-schema-id": meta["current-schema-id"],
      "current-partition-spec": meta["current-partition-spec"],
      "current-snapshot-id": meta["current-snapshot-id"],
      "last-sequence-number": meta["last-sequence-number"],
      "last-updated-ms": meta["last-updated-ms"],
      "snapshots": `[ ... ${meta.snapshots.length} snapshots ... ]`,
      "properties": meta.properties,
    };
    return `
      ${_hdr('📄', 'metadata.json', 'Layer 2 · v12-a3f8bc.metadata.json · 142.8 KB')}
      ${_relations([
        { dir: '↑ Named by', html: 'the <strong>Catalog</strong> pointer (Layer 1)' },
        { dir: 'This', self: true, html: '<strong>metadata.json</strong> — the table\'s brain' },
        { dir: '↓ Points to', html: 'the current snapshot\'s <strong>manifest list</strong> (Layer 3)' },
      ])}
      <p class="layer-card-desc" style="margin-bottom:var(--space-4)">
        The complete state of the table in one JSON file: every schema it has ever had,
        every partition spec, every sort order, the full snapshot history, table properties,
        and the pointers marking which of those are "current". A brand-new file is written
        on <em>every</em> commit (v12 here means the twelfth) — the old ones are kept for
        rollback until they're expired.
      </p>
      ${_codeHTML(JSON.stringify(simplified, null, 2), 'json', 'metadata.json (simplified)')}
      ${_fieldGuide('Reading the pointers', [
        ['format-version', 'Iceberg spec level in use — v2 adds row-level deletes, v3 adds deletion vectors.'],
        ['current-schema-id', 'Which schema in the history queries use now (older files still readable).'],
        ['current-snapshot-id', 'Which version a plain SELECT sees — change this and you time-travel.'],
        ['last-sequence-number', 'A monotonic counter bumped every commit; orders snapshots and deletes.'],
        ['snapshots', 'The whole version chain kept inline — this is what powers time travel & rollback.'],
        ['properties', 'Tuning knobs: target file size, compression, snapshot retention, and more.'],
      ])}
      ${_info('note', 'Because the file is rewritten each commit, it stays small by keeping only <em>metadata</em> — never data. Millions of data files are described indirectly through the manifest layers below, so metadata.json rarely grows past a few hundred KB.')}
    `;
  }

  function _snapDetail() {
    const snap = D().metadataJson.content.snapshots[1];
    return `
      ${_hdr('📸', 'Current Snapshot', 'Layer 3 · snap-8922019143787970520')}
      ${_relations([
        { dir: '↑ Listed in', html: '<strong>metadata.json</strong> → <code>snapshots[]</code> (Layer 2)' },
        { dir: 'This', self: true, html: '<strong>Snapshot</strong> — one committed version of the table' },
        { dir: '↓ Points to', html: 'the <strong>manifest list</strong> Avro file (Layer 4)' },
      ])}
      <p class="layer-card-desc" style="margin-bottom:var(--space-4)">
        A snapshot is a complete, immutable picture of the table at one commit. It never holds
        data itself — it holds a single pointer (<code>manifest-list</code>) to the Avro file
        that enumerates every manifest, plus a <code>summary</code> of what the commit changed.
        Reading "the table" means reading whichever snapshot <code>current-snapshot-id</code>
        names.
      </p>
      ${_codeHTML(JSON.stringify(snap, null, 2), 'json', 'Snapshot entry from metadata.json')}
      ${_fieldGuide('Anatomy of a snapshot', [
        ['snapshot-id', 'This version\'s unique ID — the value you pass to VERSION AS OF.'],
        ['parent-snapshot-id', 'The snapshot this one was built on — follow it back to replay history.'],
        ['sequence-number', 'Commit order; higher wins, and drives which deletes apply to which files.'],
        ['manifest-list', 'The single pointer down to Layer 4 — everything else hangs off this.'],
        ['summary', 'operation (append/overwrite/delete) plus added/deleted rows &amp; files.'],
      ])}
      ${_info('tip', 'Time travel and rollback are cheap because a snapshot is just this small record. <code>ROLLBACK</code> simply re-points <code>current-snapshot-id</code> at an older entry — no data is copied or rewritten.')}
    `;
  }

  function _snap2Detail() {
    return `
      ${_hdr('🏷', 'Tagged Snapshot', 'Layer 3 · q4_2024_close — 7-year retention')}
      ${_relations([
        { dir: '↑ Held in', html: '<strong>metadata.json</strong> → <code>refs</code> (Layer 2)' },
        { dir: 'This', self: true, html: 'A <strong>tag</strong> — a named, fixed pointer to one snapshot' },
        { dir: '↓ Points to', html: 'snapshot <code>3051729675574597004</code>' },
      ])}
      <p class="layer-card-desc" style="margin-bottom:var(--space-4)">
        A <strong>tag</strong> is a named reference that pins one snapshot in place. Here the
        Q4 books are frozen for audit: normal snapshots expire after the retention window, but
        anything a tag points to (and its data files) is protected for as long as the tag lives —
        7 years in this case.
      </p>
      ${_codeHTML(JSON.stringify({
        "q4_2024_close": {
          "snapshot-id": 3051729675574597004,
          "type": "tag",
          "max-ref-age-ms": 220752000000
        }
      }, null, 2), 'json', 'Tag definition (from metadata.json refs)')}
      ${_codeHTML(`-- Create compliance tag
CALL shopkart.system.create_tag(
  'prod.orders',
  'q4_2024_close',
  3051729675574597004,
  220752000000  -- 7 years in ms
);

-- Read the tagged snapshot (always same result)
SELECT * FROM shopkart.prod.orders
VERSION AS OF 'q4_2024_close';`, 'sql', 'Creating & querying a tag')}
      ${_info('note', '<strong>Tag vs. branch:</strong> a <em>tag</em> is fixed — it always points to the same snapshot, ideal for audits and reproducible reports. A <em>branch</em> moves forward as you commit to it, enabling write-audit-publish and experimentation without touching <code>main</code>.')}
    `;
  }

  function _manifestListDetail() {
    const ml = D().manifestListEntry;
    return `
      ${_hdr('📋', 'Manifest List', 'Layer 4 · snap-8922...-a3f8bc.avro · 10.3 KB')}
      ${_relations([
        { dir: '↑ Pointed to by', html: 'the current <strong>Snapshot</strong> (Layer 3)' },
        { dir: 'This', self: true, html: '<strong>Manifest list</strong> — index of manifests for this snapshot' },
        { dir: '↓ Points to', html: '3 <strong>manifest files</strong> — BR, US, DE (Layer 5)' },
      ])}
      <p class="layer-card-desc" style="margin-bottom:var(--space-4)">
        One Avro file per snapshot that lists every manifest making up the table, and — crucially —
        the partition value <em>range</em> covered by each one. This is the first pruning stage:
        the engine reads this small file and decides which manifests are even worth opening.
      </p>
      ${_codeHTML(JSON.stringify(ml.entries[0], null, 2), 'json', 'Entry 1 of 3 (BR manifest)')}
      ${_fieldGuide('Per-manifest entry', [
        ['manifest_path', 'S3 location of the manifest file this entry describes.'],
        ['partition_spec_id', 'Which partition layout the files in that manifest were written with.'],
        ['added_snapshot_id', 'The snapshot that first added this manifest — used by incremental reads.'],
        ['partitions', 'Min/max partition bounds — the summary that drives manifest-level pruning.'],
      ])}
      ${_info('tip', 'A query <code>WHERE country_code = \'US\'</code> reads only this ~10&nbsp;KB file, sees the BR and DE entries can\'t contain US rows, and skips both manifests — before opening a single data file. That\'s the first of Iceberg\'s two pruning stages.')}
    `;
  }

  function _manifestBRDetail() {
    const entry = D().manifestFileEntry.entries[0];
    return `
      ${_hdr('📊', 'Manifest: Brazil 2024-11-29', 'Layer 5 · a1b2c3d4-manifest.avro · 4.2 MB · 3 data files')}
      ${_relations([
        { dir: '↑ Listed in', html: 'the <strong>manifest list</strong> (Layer 4)' },
        { dir: 'This', self: true, html: '<strong>Manifest</strong> for the BR partition' },
        { dir: '↓ Points to', html: '3 <strong>Parquet data files</strong> (Layer 6)' },
      ])}
      <p class="layer-card-desc" style="margin-bottom:var(--space-4)">
        An Avro file that lists the actual data files for one partition region, each with rich
        column statistics. This is the second pruning stage: after the manifest list narrows things
        to BR, the engine reads these per-file bounds to skip individual Parquet files too.
      </p>
      ${_codeHTML(JSON.stringify(entry, null, 2), 'json', 'Data file entry 1 of 3')}
      ${_fieldGuide('Per-data-file entry', [
        ['status', '0 = EXISTING, 1 = ADDED, 2 = DELETED — how this file changed in the snapshot.'],
        ['content', '0 = data file, 1 = position deletes, 2 = equality deletes.'],
        ['file_path', 'Exact S3 path of the Parquet file the reader will open.'],
        ['record_count', 'Rows in the file — feeds cost estimates and split planning.'],
        ['lower_bounds / upper_bounds', 'Per-column min/max — lets the engine skip this file on a predicate.'],
      ])}
      ${_info('note', 'These column bounds are what turn a "scan everything" query into a targeted read. <code>WHERE order_id &gt; 90000000</code> can skip any file whose <code>upper_bounds</code> for order_id is below that — no bytes read.')}
    `;
  }

  function _manifestUSDetail() {
    return `
      ${_hdr('📊', 'Manifest: USA 2024-11-29', 'Layer 5 · e5f6g7h8-manifest.avro · 18.7 MB · 389 data files')}
      ${_relations([
        { dir: '↑ Listed in', html: 'the <strong>manifest list</strong> (Layer 4)' },
        { dir: 'This', self: true, html: '<strong>Manifest</strong> for the US partition — peer of BR &amp; DE' },
        { dir: '↓ Points to', html: '389 <strong>Parquet data files</strong> (Layer 6)' },
      ])}
      <p class="layer-card-desc" style="margin-bottom:var(--space-4)">
        Black Friday made the US the largest region — 389 Parquet files at ~128&nbsp;MB each. It has
        the same structure as the Brazil manifest, just far more entries. A query filtered to
        <code>country_code = 'BR'</code> skips this entire manifest at the list stage, never paying
        to read its 18.7&nbsp;MB.
      </p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);margin-bottom:var(--space-4)">
        ${_statMini('389', 'Data Files')}
        ${_statMini('18.7 MB', 'Manifest Size')}
        ${_statMini('~127 MB', 'Avg File Size')}
        ${_statMini('48.2 GB', 'Total Data')}
      </div>
      ${_info('tip', 'Iceberg targets ~128&nbsp;MB files (<code>write.target-file-size-bytes</code>) to balance parallelism against per-file overhead. The US region hits that target cleanly; smaller regions like Germany end up below it and are prime candidates for compaction.')}
    `;
  }

  function _manifestDEDetail() {
    return `
      ${_hdr('📊', 'Manifest: Germany 2024-11-29', 'Layer 5 · i9j0k1l2-manifest.avro · 2.1 MB · 47 data files')}
      ${_relations([
        { dir: '↑ Listed in', html: 'the <strong>manifest list</strong> (Layer 4)' },
        { dir: 'This', self: true, html: '<strong>Manifest</strong> for the DE partition — peer of BR &amp; US' },
        { dir: '↓ Points to', html: '47 <strong>Parquet data files</strong> (Layer 6)' },
      ])}
      <p class="layer-card-desc" style="margin-bottom:var(--space-4)">
        A smaller region: 47 files, 5.9&nbsp;GB total. Same manifest structure as BR and US — the
        three are siblings under the manifest list, one per <code>country_code</code>, and the
        engine keeps or drops each independently based on the partition bounds.
      </p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3);margin-bottom:var(--space-4)">
        ${_statMini('47', 'Data Files')}
        ${_statMini('2.1 MB', 'Manifest Size')}
        ${_statMini('~128 MB', 'Avg File Size')}
        ${_statMini('5.9 GB', 'Total Data')}
      </div>
      ${_info('note', 'Splitting one snapshot across three partition manifests (BR/US/DE) is what lets a country-filtered query touch only the manifests it needs. Add more countries and you add more sibling manifests — pruning scales with them.')}
    `;
  }

  function _statMini(value, label) {
    return `<div style="background:var(--bg-3);border:1px solid var(--border-default);border-radius:var(--radius-sm);padding:var(--space-2) var(--space-3)">
      <div style="font-size:var(--text-xl);font-weight:700;color:var(--text-primary)">${value}</div>
      <div style="font-size:var(--text-xs);color:var(--text-muted)">${label}</div>
    </div>`;
  }

  /* Position-in-hierarchy strip. rows: [{dir, html}], one flagged self. */
  function _relations(rows) {
    return `<div class="arch-rel">` + rows.map(r =>
      `<div class="arch-rel-row${r.self ? ' is-self' : ''}">
        <span class="arch-rel-dir">${r.dir}</span>
        <span class="arch-rel-main">${r.html}</span>
      </div>`).join('') + `</div>`;
  }

  /* Field guide: [ [field, meaning], ... ] */
  function _fieldGuide(title, items) {
    return `
      <div class="arch-detail-section">
        <div class="arch-detail-section-title">${title}</div>
        <ul class="arch-fields">
          ${items.map(([f, m]) => `<li><code>${f}</code><span>${m}</span></li>`).join('')}
        </ul>
      </div>`;
  }

  /* ── Query Path Animation ──────────────────────────────── */
  function _buildQueryPathView(container) {
    container.innerHTML = `
<style>
.qp-outer {
  display: flex;
  height: 100%;
  overflow: hidden;
}
.qp-diagram {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-5);
  overflow: hidden;
  background: var(--bg-1);
}
.qp-sidebar {
  width: 320px;
  border-left: 1px solid var(--border-default);
  display: flex;
  flex-direction: column;
  background: var(--bg-2);
  overflow: hidden;
}
.qp-sidebar-header {
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border-default);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
}
.qp-steps-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2);
}
.qp-step-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  margin-bottom: 2px;
  cursor: pointer;
  transition: background var(--ease-fast);
}
.qp-step-item:hover { background: var(--bg-3); }
.qp-step-item.active {
  background: rgba(74,174,255,0.08);
}
.qp-step-item .num {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--bg-4);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  flex-shrink: 0;
  margin-top: 1px;
  transition: background var(--ease-fast), color var(--ease-fast);
}
.qp-step-item.active .num { background: var(--blue-dim); color: white; }
.qp-step-item.done .num { background: var(--green-dim); color: white; }
.qp-step-label { font-size: var(--text-xs); color: var(--text-secondary); line-height: 1.4; }
.qp-step-item.active .qp-step-label { color: var(--text-primary); font-weight: 500; }
.qp-start-prompt {
  padding: var(--space-4);
  border-top: 1px solid var(--border-default);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-shrink: 0;
}
</style>
<div class="qp-outer">
  <div class="qp-diagram" id="qp-diagram-inner"></div>
  <div class="qp-sidebar">
    <div class="qp-sidebar-header">
      🔍 Query: WHERE order_date = '2024-11-29' AND country_code = 'BR'
    </div>
    <div class="qp-steps-list" id="qp-steps-list"></div>
    <div class="qp-start-prompt">
      <button class="btn btn-primary btn-sm" id="qp-start-btn">▶ Start Animation</button>
      <span style="font-size:var(--text-xs);color:var(--text-muted)">Press Space or use controls below</span>
    </div>
  </div>
</div>
`;
    _buildQueryPathSVG(container.querySelector('#qp-diagram-inner'));
    _buildQueryPathSteps(container);
  }

  function _buildQueryPathSVG(container) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'qp-svg';
    svg.setAttribute('viewBox', '0 0 580 560');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.maxWidth = '580px';
    svg.style.maxHeight = '560px';

    svg.innerHTML = `
<defs>
  <marker id="qp-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#484f58"/>
  </marker>
  <marker id="qp-arrow-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#58a6ff"/>
  </marker>
  <filter id="qp-glow"><feGaussianBlur stdDeviation="4" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
</defs>

<rect width="580" height="560" fill="var(--bg-1)"/>

<!-- Query box at top -->
<rect id="qp-query-box" x="120" y="10" width="340" height="44" rx="8" fill="#1a2030" stroke="#30363d" stroke-width="1.5"/>
<text x="290" y="27" text-anchor="middle" font-family="system-ui" font-size="11" font-weight="600" fill="#8b949e">SPARK QUERY ENGINE</text>
<text x="290" y="43" text-anchor="middle" font-family="ui-monospace" font-size="9.5" fill="#58a6ff">WHERE order_date='2024-11-29' AND country_code='BR'</text>

<!-- Arrow: Query → Catalog -->
<line id="qp-l0" x1="290" y1="54" x2="290" y2="94" stroke="#30363d" stroke-width="1.5" marker-end="url(#qp-arrow)"/>

<!-- CATALOG -->
<rect id="qp-catalog" x="145" y="94" width="290" height="50" rx="8" fill="#0d1f3c" stroke="#1f6feb" stroke-width="1.5"/>
<text x="165" y="114" font-size="15">🏛</text>
<text x="188" y="114" font-family="system-ui" font-size="12" font-weight="600" fill="#e6edf3">AWS Glue Catalog</text>
<text x="188" y="130" font-family="ui-monospace" font-size="10" fill="rgba(88,166,255,0.8)">→ returns metadata_location</text>

<!-- Arrow: Catalog → metadata.json -->
<line id="qp-l1" x1="290" y1="144" x2="290" y2="184" stroke="#30363d" stroke-width="1.5" marker-end="url(#qp-arrow)"/>

<!-- METADATA.JSON -->
<rect id="qp-meta" x="125" y="184" width="330" height="50" rx="8" fill="#1a1030" stroke="#6e40c9" stroke-width="1.5"/>
<text x="145" y="204" font-size="15">📄</text>
<text x="168" y="204" font-family="system-ui" font-size="12" font-weight="600" fill="#e6edf3">metadata.json</text>
<text x="168" y="220" font-family="ui-monospace" font-size="10" fill="rgba(163,113,247,0.8)">→ current-snapshot-id, manifest-list path</text>

<!-- Arrow: meta → manifest list -->
<line id="qp-l2" x1="290" y1="234" x2="290" y2="274" stroke="#30363d" stroke-width="1.5" marker-end="url(#qp-arrow)"/>

<!-- MANIFEST LIST -->
<rect id="qp-mlist" x="120" y="274" width="340" height="50" rx="8" fill="#1e1400" stroke="#f97316" stroke-width="1.5"/>
<text x="140" y="294" font-size="15">📋</text>
<text x="163" y="294" font-family="system-ui" font-size="12" font-weight="600" fill="#e6edf3">Manifest List</text>
<text x="163" y="310" font-family="ui-monospace" font-size="10" fill="rgba(249,115,22,0.8)">→ 2,000 entries · partition statistics per manifest</text>

<!-- Pruning label -->
<text id="qp-prune-label" x="290" y="355" text-anchor="middle" font-family="system-ui" font-size="10" fill="rgba(248,81,73,0)" font-weight="600">1,999 manifests PRUNED — only 1 matches BR + 2024-11-29</text>

<!-- Arrows: manifest list → manifests -->
<line id="qp-lm0" x1="200" y1="324" x2="110" y2="374" stroke="#30363d" stroke-width="1" marker-end="url(#qp-arrow)"/>
<line id="qp-lm1" x1="265" y1="324" x2="265" y2="374" stroke="#30363d" stroke-width="1" marker-end="url(#qp-arrow)"/>
<line id="qp-lm2" x1="350" y1="324" x2="380" y2="374" stroke="#30363d" stroke-width="1" marker-end="url(#qp-arrow)"/>
<line id="qp-lm3" x1="415" y1="324" x2="480" y2="374" stroke="#30363d" stroke-width="1" marker-end="url(#qp-arrow)"/>

<!-- 4 manifests (3 pruned, 1 included) -->
${_qpManifest('qp-m0', 30, 374, 'US-29', '#1e0f0f', '#da3633', true)}
${_qpManifest('qp-m1', 200, 374, 'DE-29', '#1e0f0f', '#da3633', true)}
${_qpManifest('qp-m2', 305, 374, 'BR-29 ✓', '#0a1f10', '#238636', false)}
${_qpManifest('qp-m3', 435, 374, 'US-28', '#1e0f0f', '#da3633', true)}

<!-- Arrow: BR manifest → data files -->
<line id="qp-ldata" x1="365" y1="424" x2="365" y2="464" stroke="#30363d" stroke-width="1.5" marker-end="url(#qp-arrow)"/>

<!-- DATA FILES ROW -->
${_qpDataFile('qp-d0', 220, 464, 'part-00000.parquet\n134 MB')}
${_qpDataFile('qp-d1', 320, 464, 'part-00001.parquet\n128 MB')}
${_qpDataFile('qp-d2', 420, 464, 'part-00002.parquet\n141 MB')}

<!-- Result -->
<rect id="qp-result" x="165" y="520" width="250" height="34" rx="8" fill="#0a1f10" stroke="#238636" stroke-width="1.5" opacity="0"/>
<text id="qp-result-text" x="290" y="542" text-anchor="middle" font-family="system-ui" font-size="12" font-weight="600" fill="#3fb950" opacity="0">✓ Query Complete: 384 MB read (of 6 PB)</text>

<!-- Cursor -->
<circle id="qp-cursor" cx="290" cy="32" r="6" fill="#58a6ff" opacity="0">
  <animate attributeName="opacity" values="0.6;1;0.6" dur="1.2s" repeatCount="indefinite"/>
</circle>
`;
    container.appendChild(svg);
  }

  function _qpManifest(id, x, y, label, bg, stroke, pruned) {
    return `<g id="${id}" opacity="${pruned ? 1 : 1}">
      <rect x="${x}" y="${y}" width="100" height="48" rx="6" fill="${bg}" stroke="${stroke}" stroke-width="1.5"/>
      <text x="${x+50}" y="${y+20}" text-anchor="middle" font-size="11" font-weight="600" font-family="system-ui" fill="#e6edf3">${label}</text>
      <text x="${x+50}" y="${y+35}" text-anchor="middle" font-size="9" font-family="ui-monospace" fill="${pruned ? '#da3633' : '#238636'}">${pruned ? 'SKIP' : 'READ'}</text>
    </g>`;
  }

  function _qpDataFile(id, x, y, label) {
    const lines = label.split('\n');
    return `<g id="${id}" opacity="0">
      <rect x="${x}" y="${y}" width="90" height="48" rx="5" fill="#0a1f10" stroke="#238636" stroke-width="1.5"/>
      <text x="${x+45}" y="${y+18}" text-anchor="middle" font-size="9" font-family="ui-monospace" fill="#e6edf3">${lines[0]}</text>
      <text x="${x+45}" y="${y+32}" text-anchor="middle" font-size="10" font-family="system-ui" fill="#3fb950">${lines[1]}</text>
    </g>`;
  }

  function _buildQueryPathSteps(container) {
    const AEClass = window.IcebergViz.AnimationEngine;

    const steps = [
      {
        label: 'Spark submits query to catalog',
        description: 'The Spark plan optimizer prepares the query. First step: ask the catalog for the current metadata location.',
        duration: 2500,
        enter(ctx) { _qpHighlight(ctx, 'qp-catalog', 'qp-l0'); },
      },
      {
        label: 'Glue returns metadata_location',
        description: 'Glue returns: s3://.../metadata/v12-a3f8bc.metadata.json. This is the only catalog call for the entire query.',
        duration: 2500,
        enter(ctx) { _qpSetText(ctx, 'qp-catalog', 'rgba(88,166,255,0.9)'); },
      },
      {
        label: 'Read metadata.json',
        description: 'Spark reads the metadata.json file. From it: current-snapshot-id = 8922..., manifest-list path.',
        duration: 2500,
        enter(ctx) { _qpHighlight(ctx, 'qp-meta', 'qp-l1'); },
      },
      {
        label: 'Get current snapshot → manifest list path',
        description: 'metadata.json reveals the manifest-list path for the current snapshot. Spark will read that file next.',
        duration: 2000,
        enter(ctx) { _qpSetText(ctx, 'qp-meta', 'rgba(163,113,247,0.9)'); },
      },
      {
        label: 'Read manifest list (10 KB)',
        description: 'Spark reads the manifest list — a single 10 KB Avro file listing all manifests with their partition statistics.',
        duration: 2500,
        enter(ctx) { _qpHighlight(ctx, 'qp-mlist', 'qp-l2'); },
      },
      {
        label: 'Evaluate partition predicates against manifest stats',
        description: 'For each manifest entry, Spark checks: does partition bounds overlap with order_date=2024-11-29 AND country_code=BR?',
        duration: 3000,
        enter(ctx) { _qpSetText(ctx, 'qp-mlist', 'rgba(249,115,22,0.9)'); },
      },
      {
        label: '1,999 manifests PRUNED — 1 matches',
        description: 'US, DE, and all other date partitions are pruned. Only the BR/2024-11-29 manifest will be read. Zero data files opened yet.',
        duration: 3000,
        enter(ctx) {
          _qpDim(ctx, 'qp-m0');
          _qpDim(ctx, 'qp-m1');
          _qpDim(ctx, 'qp-m3');
          _qpShowText(ctx, 'qp-prune-label', 'rgba(248,81,73,0.9)');
        },
      },
      {
        label: 'Read the 1 matching manifest (4.2 MB)',
        description: 'Spark reads a1b2c3d4-manifest.avro. This file lists 3 data files for BR/2024-11-29 with column statistics per file.',
        duration: 2500,
        enter(ctx) { _qpHighlight(ctx, 'qp-m2', 'qp-ldata'); },
      },
      {
        label: 'Column statistics: no data-file skip',
        description: 'Per the manifest, all 3 data files have records that could satisfy the query. No file-level skip is possible. All 3 files will be read.',
        duration: 2500,
        enter(ctx) {
          _qpShow(ctx, 'qp-d0');
          _qpShow(ctx, 'qp-d1');
          _qpShow(ctx, 'qp-d2');
        },
      },
      {
        label: 'Read 3 Parquet files (384 MB total)',
        description: 'Spark reads 3 Parquet files: 134 MB + 128 MB + 141 MB = 384 MB. Parquet pushes down the column and row predicates natively.',
        duration: 3000,
        enter(ctx) {
          _qpHighlightData(ctx);
        },
      },
      {
        label: '✓ Query complete — 384 MB read of 6 PB',
        description: 'Without Iceberg (Hive full scan): 6 PB read. With Iceberg manifest pruning: 384 MB read. Speedup: ~16,000x.',
        duration: 4000,
        enter(ctx) {
          _qpShowResult(ctx);
        },
      },
    ];

    const svg = container.querySelector('#qp-svg');
    const engine = new AEClass({ steps });
    engine.setContext({ container, svg });
    mod._engine = engine;

    // Build steps list
    const list = container.querySelector('#qp-steps-list');
    if (list) {
      list.innerHTML = steps.map((s, i) => `
        <div class="qp-step-item" data-step="${i}">
          <div class="num">${i+1}</div>
          <div class="qp-step-label">${s.label}</div>
        </div>
      `).join('');
    }

    engine.on('stepchange', (idx) => {
      if (!list) return;
      list.querySelectorAll('.qp-step-item').forEach((el, i) => {
        el.classList.toggle('active', i === idx);
        el.classList.toggle('done', i < idx);
      });
    });

    const startBtn = container.querySelector('#qp-start-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        engine.reset();
        engine.play();
      });
    }

    // Wire step clicks in list
    if (list) {
      list.addEventListener('click', (e) => {
        const item = e.target.closest('[data-step]');
        if (item) {
          engine.goto(parseInt(item.dataset.step, 10));
        }
      });
    }

    window.IcebergViz.AnimationControls.register(engine);
  }

  /* ── Query Path SVG helpers ────────────────────────────── */
  function _qpHighlight(ctx, nodeId, lineId) {
    const svg = ctx.svg;
    if (!svg) return;
    // Reset previous
    svg.querySelectorAll('rect[data-qp-highlighted]').forEach(el => {
      el.removeAttribute('data-qp-highlighted');
      el.style.filter = '';
    });
    const node = svg.getElementById(nodeId);
    if (node) {
      node.style.filter = 'drop-shadow(0 0 8px rgba(74,174,255,0.7))';
      node.setAttribute('data-qp-highlighted', '1');
    }
    if (lineId) {
      const line = svg.getElementById(lineId);
      if (line) {
        line.setAttribute('stroke', '#58a6ff');
        line.setAttribute('stroke-width', '2.5');
        line.setAttribute('marker-end', 'url(#qp-arrow-active)');
      }
    }
  }

  function _qpSetText(ctx, nodeId, color) {
    const svg = ctx.svg;
    const node = svg && svg.getElementById(nodeId);
    if (!node) return;
    node.querySelectorAll('text:last-child').forEach(t => {
      t.setAttribute('fill', color);
    });
  }

  function _qpDim(ctx, nodeId) {
    const el = ctx.svg && ctx.svg.getElementById(nodeId);
    if (el) {
      el.style.transition = 'opacity 0.4s';
      el.setAttribute('opacity', '0.2');
    }
  }

  function _qpShowText(ctx, textId, color) {
    const el = ctx.svg && ctx.svg.getElementById(textId);
    if (el) {
      el.setAttribute('fill', color);
      el.style.transition = 'opacity 0.3s';
    }
  }

  function _qpShow(ctx, nodeId) {
    const el = ctx.svg && ctx.svg.getElementById(nodeId);
    if (el) {
      el.style.transition = 'opacity 0.4s';
      el.setAttribute('opacity', '1');
    }
  }

  function _qpHighlightData(ctx) {
    ['qp-d0','qp-d1','qp-d2'].forEach(id => {
      const el = ctx.svg && ctx.svg.getElementById(id);
      if (el) {
        el.style.filter = 'drop-shadow(0 0 8px rgba(63,185,80,0.6))';
      }
    });
  }

  function _qpShowResult(ctx) {
    const result = ctx.svg && ctx.svg.getElementById('qp-result');
    const text   = ctx.svg && ctx.svg.getElementById('qp-result-text');
    if (result) { result.style.transition = 'opacity 0.5s'; result.setAttribute('opacity', '1'); }
    if (text)   { text.style.transition   = 'opacity 0.5s'; text.setAttribute('opacity', '1'); }
  }

  /* ── Tab bar wiring ────────────────────────────────────── */
  function _wireTabBar(page, modRef) {
    const tabs = page.querySelectorAll('.arch-tab-btn');
    const hierView  = page.querySelector('#arch-tab-hierarchy');
    const queryView = page.querySelector('#arch-tab-querypath');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const which = tab.dataset.tab;
        if (which === 'hierarchy') {
          hierView.style.display = '';
          queryView.style.display = 'none';
          window.IcebergViz.AnimationControls.hide();
        } else {
          hierView.style.display = 'none';
          queryView.style.display = 'flex';
          if (modRef._engine) {
            window.IcebergViz.AnimationControls.register(modRef._engine);
          }
        }
      });
    });
  }

  /* ── Register ──────────────────────────────────────────── */
  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.modules = window.IcebergViz.modules || {};
  window.IcebergViz.modules.architecture = mod;
})();
