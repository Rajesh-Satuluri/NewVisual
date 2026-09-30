/* ============================================================
   Migrate to Iceberg Module
   Animates converting an existing Hive/Parquet table into an
   Iceberg table WITHOUT rewriting data — the key hands-on point:
   only metadata (manifests, manifest list, metadata.json) is
   generated; the existing Parquet files are reused in place.
   Sidebar compares the three procedures: snapshot, migrate,
   add_files (+ register_table). ShopKart production context.
   ============================================================ */

(function () {
  'use strict';

  const IV = window.IcebergViz;

  /* ── Style injection ────────────────────────────────────── */
  function _injectStyles() {
    if (document.getElementById('mi-styles')) return;
    const s = document.createElement('style');
    s.id = 'mi-styles';
    s.textContent = `
.mi-page { display:flex; flex-direction:column; height:100%; overflow:hidden; }

.mi-outer { display:flex; flex:1; overflow:hidden; min-height:0; }

.mi-canvas {
  flex:1; display:flex; align-items:center; justify-content:center;
  padding:16px; background:var(--bg-1); overflow:hidden; position:relative;
}

.mi-sidebar {
  width:360px; border-left:1px solid var(--border-default);
  background:var(--bg-2); display:flex; flex-direction:column;
  overflow:hidden; flex-shrink:0;
}
.mi-sidebar-header { padding:14px 18px; border-bottom:1px solid var(--border-default); flex-shrink:0; }
.mi-sidebar-title { font-size:var(--text-sm); font-weight:600; color:var(--text-primary); margin-bottom:4px; }
.mi-sidebar-desc { font-size:var(--text-xs); color:var(--text-secondary); line-height:1.5; min-height:52px; }

.mi-steps-list {
  flex:0 0 auto; overflow-y:auto; padding:6px 0;
  border-bottom:1px solid var(--border-default); max-height:230px;
}
.mi-step-item {
  display:flex; align-items:flex-start; gap:10px; padding:7px 16px;
  cursor:pointer; transition:background .12s; border-left:3px solid transparent; margin-bottom:1px;
}
.mi-step-item:hover { background:var(--bg-3); }
.mi-step-item.active { background:rgba(74,174,255,0.07); border-left-color:var(--blue); }
.mi-step-item.done { opacity:0.6; }
.mi-step-badge {
  width:20px; height:20px; border-radius:50%; background:var(--bg-4);
  color:var(--text-muted); font-size:10px; font-weight:700;
  display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:1px;
  transition:background .12s, color .12s;
}
.mi-step-item.active .mi-step-badge { background:var(--blue); color:#fff; }
.mi-step-item.done .mi-step-badge { background:var(--green); color:#fff; }
.mi-step-text { font-size:12px; color:var(--text-secondary); line-height:1.4; }
.mi-step-item.active .mi-step-text { color:var(--text-primary); font-weight:500; }

.mi-info { flex:1; overflow-y:auto; padding:12px; }
.mi-info-label {
  font-size:10px; color:var(--text-muted); text-transform:uppercase;
  letter-spacing:.05em; margin-bottom:8px;
}

.mi-proc { display:flex; flex-direction:column; gap:8px; margin-bottom:14px; }
.mi-proc-card {
  background:var(--bg-3); border:1px solid var(--border-default);
  border-radius:8px; padding:9px 11px;
}
.mi-proc-card.chosen { border-color:var(--blue); background:rgba(74,174,255,0.06); }
.mi-proc-name { font-family:var(--font-mono); font-size:11.5px; font-weight:700; color:var(--blue); }
.mi-proc-card.chosen .mi-proc-name { color:var(--blue); }
.mi-proc-desc { font-size:11px; color:var(--text-secondary); line-height:1.5; margin-top:3px; }
.mi-proc-tag {
  display:inline-block; font-size:9px; font-weight:700; text-transform:uppercase;
  letter-spacing:.04em; padding:1px 6px; border-radius:4px; margin-top:5px;
}
.mi-proc-tag.safe   { background:rgba(63,185,80,.15); color:var(--green); }
.mi-proc-tag.inplace{ background:rgba(240,136,62,.15); color:var(--orange); }
.mi-proc-tag.import { background:rgba(163,113,247,.15); color:var(--purple); }

.mi-sql {
  background:var(--bg-3); border:1px solid var(--border-default); border-radius:8px;
  padding:10px 12px; font-family:var(--font-mono); font-size:11px;
  color:var(--text-secondary); line-height:1.6; white-space:pre; overflow-x:auto;
}
.mi-k { color:var(--blue); font-weight:600; }
.mi-s { color:var(--orange); }
.mi-c { color:var(--text-muted); font-style:italic; }
`;
    document.head.appendChild(s);
  }

  /* ── Step descriptions (sidebar) ────────────────────────── */
  function _getStepDescs() {
    return [
      { label: 'Source: Hive Table', desc: 'ShopKart\'s legacy orders table is a Hive external table — a Metastore pointer plus a folder of Parquet files on S3. No Iceberg metadata exists yet.' },
      { label: 'Choose a Path', desc: 'Three procedures: snapshot (throwaway shadow copy for testing), migrate (in-place — keeps the table name), and add_files (import files into an existing Iceberg table). We follow migrate.' },
      { label: 'Scan Existing Files', desc: 'Iceberg reads each Parquet file\'s footer for row counts and column min/max stats. The row data itself is never read or copied.' },
      { label: 'Write Manifests', desc: 'Manifest files are written that POINT AT the existing Parquet files with their stats. Zero data files are rewritten — this is why migration of a 10 TB table takes minutes, not hours.' },
      { label: 'Build Snapshot', desc: 'A manifest list and a new metadata.json wrap the manifests into snapshot 1 — the first Iceberg snapshot of the table.' },
      { label: 'Commit to Catalog', desc: 'One atomic pointer swap makes the catalog resolve the orders name to the Iceberg metadata.json. The table is now an Iceberg table.' },
      { label: 'Validate — Backup Retained', desc: 'migrate leaves the original table as orders__BACKUP_. Run row-count / DQ checks; if anything is wrong, rollback is just pointing the name back at the backup.' },
      { label: 'Cutover Complete', desc: '0 bytes of data rewritten. Spark, Trino, and Flink now read the same files through Iceberg — with time travel, schema evolution, and ACID from here on.' },
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
    svg.id = 'mi-svg';

    // Parquet data-file tiles (reused, never rewritten)
    let tiles = '';
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 8; c++) {
        tiles += `<rect x="${266 + c * 36}" y="${356 + r * 22}" width="30" height="16" rx="2" fill="rgba(86,211,100,0.28)" stroke="rgba(86,211,100,0.45)" stroke-width="0.8"/>`;
      }
    }

    svg.innerHTML = `
<defs>
  <marker id="mi-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#484f58"/>
  </marker>
  <marker id="mi-arr-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#56d364"/>
  </marker>
  <marker id="mi-arr-orange" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#f0883e"/>
  </marker>
</defs>

<rect width="${W}" height="${H}" fill="#090d14"/>
<text x="12" y="16" font-family="system-ui" font-size="9.5" fill="rgba(139,148,158,0.4)" font-weight="600" letter-spacing="1">ShopKart Migration — Hive → Iceberg (in-place, no data rewrite)</text>

<!-- ═══ Approach chips (step 2) ═══ -->
<g id="mi-appr-snapshot" opacity="0">
  <rect x="250" y="28" width="168" height="44" rx="7" fill="#0a1f10" stroke="#56d364" stroke-width="1.3"/>
  <text x="262" y="45" font-family="ui-monospace" font-size="10" font-weight="700" fill="#56d364">snapshot</text>
  <text x="262" y="59" font-family="system-ui" font-size="8.5" fill="rgba(139,148,158,0.75)">shadow copy · test safely</text>
  <text x="262" y="69" font-family="system-ui" font-size="8" fill="rgba(139,148,158,0.5)">source stays a Hive table</text>
</g>
<g id="mi-appr-migrate" opacity="0">
  <rect x="430" y="28" width="168" height="44" rx="7" fill="#0d1f3c" stroke="#58a6ff" stroke-width="1.3"/>
  <text x="442" y="45" font-family="ui-monospace" font-size="10" font-weight="700" fill="#58a6ff">migrate  ★</text>
  <text x="442" y="59" font-family="system-ui" font-size="8.5" fill="rgba(139,148,158,0.75)">in-place · keeps the name</text>
  <text x="442" y="69" font-family="system-ui" font-size="8" fill="rgba(139,148,158,0.5)">leaves orders__BACKUP_</text>
</g>
<g id="mi-appr-add" opacity="0">
  <rect x="610" y="28" width="176" height="44" rx="7" fill="#1a1030" stroke="#a371f7" stroke-width="1.3"/>
  <text x="622" y="45" font-family="ui-monospace" font-size="10" font-weight="700" fill="#a371f7">add_files</text>
  <text x="622" y="59" font-family="system-ui" font-size="8.5" fill="rgba(139,148,158,0.75)">import files → existing table</text>
  <text x="622" y="69" font-family="system-ui" font-size="8" fill="rgba(139,148,158,0.5)">also: register_table</text>
</g>

<!-- ═══ Source: Hive Table ═══ -->
<g id="mi-hive-box">
  <rect x="16" y="104" width="184" height="80" rx="8" fill="#161b22" stroke="#8b949e" stroke-width="1.4"/>
  <text x="32" y="128" font-size="15" dominant-baseline="middle">🗃</text>
  <text x="54" y="126" font-family="system-ui" font-size="11" font-weight="700" fill="#e6edf3">Hive Table</text>
  <text x="32" y="146" font-family="ui-monospace" font-size="9" fill="rgba(139,148,158,0.8)">orders (external)</text>
  <text x="32" y="160" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.55)">Metastore → s3://…/orders/</text>
  <text x="32" y="174" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.45)">no snapshots · no ACID</text>
</g>
<rect id="mi-hl-hive" x="14" y="102" width="188" height="84" rx="9" fill="none" stroke="#58a6ff" stroke-width="2.5" opacity="0"/>

<!-- ═══ Iceberg metadata chain (center) ═══ -->
<!-- metadata.json (top) -->
<g id="mi-meta-box" opacity="0">
  <rect x="258" y="104" width="220" height="48" rx="7" fill="#1a1030" stroke="#a371f7" stroke-width="1.4"/>
  <text x="274" y="126" font-size="12" dominant-baseline="middle">📄</text>
  <text x="296" y="123" font-family="system-ui" font-size="10.5" font-weight="600" fill="#e6edf3">metadata.json</text>
  <text x="296" y="137" font-family="ui-monospace" font-size="8.5" fill="rgba(163,113,247,0.75)">schema · spec · current-snapshot-id</text>
</g>
<line id="mi-a-meta-list" x1="368" y1="152" x2="368" y2="166" stroke="#484f58" stroke-width="1.4" marker-end="url(#mi-arr)" opacity="0"/>

<!-- manifest list -->
<g id="mi-list-box" opacity="0">
  <rect x="258" y="168" width="220" height="48" rx="7" fill="#1a1030" stroke="#f0883e" stroke-width="1.4"/>
  <text x="274" y="190" font-size="12" dominant-baseline="middle">📋</text>
  <text x="296" y="187" font-family="system-ui" font-size="10.5" font-weight="600" fill="#e6edf3">manifest list</text>
  <text x="296" y="201" font-family="ui-monospace" font-size="8.5" fill="rgba(240,136,62,0.75)">snap-1.avro · one snapshot</text>
</g>
<line id="mi-a-list-mani" x1="368" y1="216" x2="368" y2="230" stroke="#484f58" stroke-width="1.4" marker-end="url(#mi-arr)" opacity="0"/>

<!-- manifest files -->
<g id="mi-mani-box" opacity="0">
  <rect x="258" y="232" width="220" height="48" rx="7" fill="#1a1a10" stroke="#e3b341" stroke-width="1.4"/>
  <text x="274" y="254" font-size="12" dominant-baseline="middle">📊</text>
  <text x="296" y="251" font-family="system-ui" font-size="10.5" font-weight="600" fill="#e6edf3">manifest files</text>
  <text x="296" y="265" font-family="ui-monospace" font-size="8.5" fill="rgba(227,179,65,0.8)">list existing files + stats</text>
</g>

<!-- ═══ Shared data files (bottom, reused) ═══ -->
<g id="mi-data-box">
  <rect x="252" y="316" width="316" height="120" rx="8" fill="#0a1f10" stroke="#56d364" stroke-width="1.4"/>
  <text x="266" y="336" font-family="system-ui" font-size="10.5" font-weight="700" fill="#56d364">Existing Parquet data files</text>
  <text x="452" y="336" text-anchor="end" font-family="ui-monospace" font-size="9" fill="rgba(139,148,158,0.7)">24,000 files · 38.4 TB</text>
  ${tiles}
  <text x="266" y="428" font-family="system-ui" font-size="8.5" fill="rgba(86,211,100,0.75)">reused in place — 0 bytes rewritten</text>
</g>
<rect id="mi-hl-data" x="250" y="314" width="320" height="124" rx="9" fill="none" stroke="#56d364" stroke-width="2.5" opacity="0"/>

<!-- hive owns the data files (step 1) -->
<path id="mi-a-hive-data" d="M 108 184 C 108 300, 260 300, 300 330" fill="none" stroke="#484f58" stroke-width="1.4" stroke-dasharray="4 3" marker-end="url(#mi-arr)" opacity="0"/>

<!-- reuse arrows: data files → manifests (step 4) -->
<g id="mi-reuse" opacity="0">
  <line x1="360" y1="316" x2="368" y2="282" stroke="#56d364" stroke-width="1.6" marker-end="url(#mi-arr-green)" stroke-dasharray="5 3"/>
  <text x="382" y="304" font-family="system-ui" font-size="8.5" fill="#56d364">reference, don't copy</text>
</g>

<!-- no-rewrite badge (step 4) -->
<g id="mi-badge-norewrite" opacity="0">
  <rect x="486" y="232" width="128" height="34" rx="6" fill="rgba(86,211,100,0.12)" stroke="#56d364" stroke-width="1.1"/>
  <text x="550" y="247" text-anchor="middle" font-family="system-ui" font-size="9.5" font-weight="700" fill="#56d364">no data rewrite</text>
  <text x="550" y="259" text-anchor="middle" font-family="system-ui" font-size="8" fill="rgba(86,211,100,0.7)">metadata only</text>
</g>

<!-- scan note (step 3) -->
<g id="mi-scan-note" opacity="0">
  <rect x="586" y="330" width="200" height="60" rx="6" fill="rgba(88,166,255,0.06)" stroke="#58a6ff" stroke-width="1.1"/>
  <text x="596" y="347" font-family="system-ui" font-size="9" font-weight="600" fill="rgba(88,166,255,0.85)">Scanning footers only:</text>
  <text x="596" y="361" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.8)">▶ row counts</text>
  <text x="596" y="373" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.8)">▶ column min / max / nulls</text>
  <text x="596" y="385" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,0.5)">rows are never read</text>
</g>

<!-- ═══ Catalog (right) ═══ -->
<g id="mi-catalog-box">
  <rect x="600" y="104" width="186" height="72" rx="8" fill="#0d1117" stroke="#8b949e" stroke-width="1.4"/>
  <text x="616" y="128" font-size="14" dominant-baseline="middle">📖</text>
  <text x="638" y="126" font-family="system-ui" font-size="10.5" font-weight="700" fill="#e6edf3">Catalog</text>
  <text x="616" y="146" font-family="ui-monospace" font-size="9" fill="rgba(139,148,158,0.7)">orders resolves to:</text>
  <text id="mi-cat-ptr-hive" x="616" y="162" font-family="ui-monospace" font-size="9" fill="rgba(139,148,158,0.9)">→ Hive Metastore</text>
  <text id="mi-cat-ptr-ice" x="616" y="162" font-family="ui-monospace" font-size="9" font-weight="700" fill="#56d364" opacity="0">→ metadata.json ✓</text>
</g>
<rect id="mi-hl-catalog" x="598" y="102" width="190" height="76" rx="9" fill="none" stroke="#f0883e" stroke-width="2.5" opacity="0"/>

<!-- backup (step 7) -->
<g id="mi-backup-box" opacity="0">
  <rect x="600" y="196" width="186" height="58" rx="8" fill="#161b22" stroke="#e3b341" stroke-width="1.3"/>
  <text x="616" y="220" font-size="13" dominant-baseline="middle">🛟</text>
  <text x="636" y="218" font-family="ui-monospace" font-size="9.5" font-weight="700" fill="#e3b341">orders__BACKUP_</text>
  <text x="616" y="236" font-family="system-ui" font-size="8.5" fill="rgba(139,148,158,0.7)">original table retained</text>
  <text x="616" y="248" font-family="system-ui" font-size="8" fill="rgba(139,148,158,0.5)">rollback = re-point the name</text>
</g>

<!-- success (step 8) -->
<g id="mi-success-box" opacity="0">
  <rect x="600" y="274" width="186" height="96" rx="8" fill="#0a1f10" stroke="#56d364" stroke-width="1.6"/>
  <text x="616" y="298" font-size="15" dominant-baseline="middle">✅</text>
  <text x="640" y="296" font-family="system-ui" font-size="10.5" font-weight="700" fill="#e6edf3">Now an Iceberg table</text>
  <text x="616" y="316" font-family="ui-monospace" font-size="8.5" fill="rgba(86,211,100,0.85)">▶ Spark · Trino · Flink</text>
  <text x="616" y="330" font-family="ui-monospace" font-size="8.5" fill="rgba(86,211,100,0.85)">▶ time travel + ACID</text>
  <text x="616" y="344" font-family="ui-monospace" font-size="8.5" fill="rgba(86,211,100,0.85)">▶ schema evolution</text>
  <text x="616" y="360" font-family="ui-monospace" font-size="9" font-weight="700" fill="#56d364">0 bytes rewritten ⚡</text>
</g>

<!-- catalog → hive (before commit) -->
<line id="mi-a-cat-hive" x1="600" y1="150" x2="204" y2="150" stroke="#484f58" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#mi-arr)" opacity="0"/>
<!-- catalog → metadata.json (after commit) -->
<line id="mi-a-cat-meta" x1="600" y1="132" x2="482" y2="128" stroke="#56d364" stroke-width="1.8" marker-end="url(#mi-arr-green)" opacity="0"/>
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
      if (glow === 'blue')   el.style.filter = 'drop-shadow(0 0 8px rgba(88,166,255,0.7))';
      if (glow === 'green')  el.style.filter = 'drop-shadow(0 0 8px rgba(86,211,100,0.7))';
      if (glow === 'purple') el.style.filter = 'drop-shadow(0 0 8px rgba(163,113,247,0.7))';
      if (glow === 'orange') el.style.filter = 'drop-shadow(0 0 8px rgba(240,136,62,0.7))';
      if (glow === 'yellow') el.style.filter = 'drop-shadow(0 0 8px rgba(227,179,65,0.7))';
    }
    function hide(id) { const el = g(id); if (el) { el.setAttribute('opacity', '0'); el.style.filter = ''; } }
    function unglow(id) { const el = g(id); if (el) el.style.filter = ''; }

    return [
      AE.fnStep('Source: Hive Table', '', () => {
        show('mi-hl-hive', 'blue');
        show('mi-a-hive-data');
        show('mi-a-cat-hive');
      }, () => {
        hide('mi-hl-hive');
      }, 2400),

      AE.fnStep('Choose a Path', '', () => {
        unglow('mi-hl-hive'); hide('mi-hl-hive');
        show('mi-appr-snapshot');
        show('mi-appr-migrate', 'blue');
        show('mi-appr-add');
      }, () => {
        hide('mi-appr-snapshot'); hide('mi-appr-add');
        unglow('mi-appr-migrate');
      }, 3000),

      AE.fnStep('Scan Existing Files', '', () => {
        hide('mi-appr-migrate');
        show('mi-hl-data', 'green');
        show('mi-scan-note', 'blue');
      }, () => {
        hide('mi-hl-data'); hide('mi-scan-note');
      }, 2800),

      AE.fnStep('Write Manifests', '', () => {
        unglow('mi-hl-data'); hide('mi-hl-data');
        show('mi-mani-box', 'yellow');
        show('mi-reuse');
        show('mi-badge-norewrite', 'green');
      }, () => {
        unglow('mi-mani-box');
        hide('mi-badge-norewrite');
      }, 3000),

      AE.fnStep('Build Snapshot', '', () => {
        hide('mi-reuse');
        show('mi-list-box', 'orange');
        show('mi-a-list-mani');
        show('mi-meta-box', 'purple');
        show('mi-a-meta-list');
      }, () => {
        unglow('mi-list-box'); unglow('mi-meta-box');
      }, 3000),

      AE.fnStep('Commit to Catalog', '', () => {
        unglow('mi-list-box'); unglow('mi-meta-box');
        hide('mi-a-cat-hive');
        show('mi-hl-catalog', 'orange');
        const ph = g('mi-cat-ptr-hive'); if (ph) ph.setAttribute('opacity', '0');
        const pi = g('mi-cat-ptr-ice');  if (pi) pi.setAttribute('opacity', '1');
        show('mi-a-cat-meta', 'green');
      }, () => {
        hide('mi-hl-catalog');
      }, 3000),

      AE.fnStep('Validate — Backup Retained', '', () => {
        unglow('mi-hl-catalog'); hide('mi-hl-catalog');
        show('mi-backup-box', 'yellow');
      }, () => {
        unglow('mi-backup-box');
      }, 2800),

      AE.fnStep('Cutover Complete', '', () => {
        unglow('mi-backup-box');
        show('mi-success-box', 'green');
      }, () => {
        hide('mi-success-box');
      }, 3600),
    ];
  }

  /* ── Sidebar wiring ─────────────────────────────────────── */
  function _buildSidebar(page, engine, stepsData) {
    const list = page.querySelector('#mi-steps-list');
    const titleEl = page.querySelector('#mi-step-title');
    const descEl = page.querySelector('#mi-step-desc');
    if (!list) return;

    list.innerHTML = stepsData.map((s, i) => `
      <div class="mi-step-item" data-step="${i}">
        <div class="mi-step-badge">${i + 1}</div>
        <div class="mi-step-text">${s.label}</div>
      </div>
    `).join('');

    engine.on('stepchange', (idx) => {
      list.querySelectorAll('.mi-step-item').forEach((el, i) => {
        el.classList.toggle('active', i === idx);
        el.classList.toggle('done', i < idx);
      });
      const step = idx >= 0 ? stepsData[idx] : null;
      if (titleEl) titleEl.textContent = step ? step.label : 'Press Play to begin';
      if (descEl)  descEl.textContent  = step ? step.desc  : 'Watch a Hive table become an Iceberg table in place — new metadata, the same Parquet files, zero rewrite.';
      // Highlight the chosen procedure card once we pass the choice step
      const chosen = page.querySelector('.mi-proc-card[data-proc="migrate"]');
      if (chosen) chosen.classList.toggle('chosen', idx >= 1);
      const active = list.querySelector('.mi-step-item.active');
      if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });

    list.addEventListener('click', (e) => {
      const item = e.target.closest('[data-step]');
      if (item) engine.goto(parseInt(item.dataset.step, 10));
    });
  }

  /* ── Module ─────────────────────────────────────────────── */
  const mod = {
    id: 'migrate-to-iceberg',
    title: 'Migrate to Iceberg',
    group: 'advanced',
    _engine: null,

    render(container) {
      container.innerHTML = '';
      _injectStyles();

      const page = document.createElement('div');
      page.className = 'mi-page page-enter';
      page.innerHTML = `
        <div class="mi-outer">
          <div class="mi-canvas" id="mi-canvas"></div>
          <div class="mi-sidebar">
            <div class="mi-sidebar-header">
              <div class="mi-sidebar-title" id="mi-step-title">Press Play to begin</div>
              <div class="mi-sidebar-desc" id="mi-step-desc">Watch a Hive table become an Iceberg table in place — new metadata, the same Parquet files, zero rewrite.</div>
            </div>
            <div class="mi-steps-list" id="mi-steps-list"></div>
            <div class="mi-info">
              <div class="mi-info-label">Three migration procedures</div>
              <div class="mi-proc">
                <div class="mi-proc-card" data-proc="snapshot">
                  <div class="mi-proc-name">snapshot</div>
                  <div class="mi-proc-desc">Creates an independent Iceberg copy that shares the source's data files. The source stays a Hive table — perfect for testing Iceberg risk-free.</div>
                  <span class="mi-proc-tag safe">zero risk · throwaway</span>
                </div>
                <div class="mi-proc-card" data-proc="migrate">
                  <div class="mi-proc-name">migrate</div>
                  <div class="mi-proc-desc">In-place conversion. Keeps the table name, reuses the files, and leaves the original as <code>orders__BACKUP_</code> for rollback.</div>
                  <span class="mi-proc-tag inplace">in-place · keeps name</span>
                </div>
                <div class="mi-proc-card" data-proc="add">
                  <div class="mi-proc-name">add_files</div>
                  <div class="mi-proc-desc">Imports existing Parquet files into an already-created Iceberg table. <code>register_table</code> instead attaches an orphaned metadata.json.</div>
                  <span class="mi-proc-tag import">import files</span>
                </div>
              </div>
              <div class="mi-info-label">Spark procedures</div>
              <div class="mi-sql"><span class="mi-c">-- 1. Test first (source untouched)</span>
<span class="mi-k">CALL</span> sys.snapshot(
  <span class="mi-s">'hive.db.orders'</span>, <span class="mi-s">'ice.db.orders_test'</span>)

<span class="mi-c">-- 2. Convert in place</span>
<span class="mi-k">CALL</span> sys.migrate(<span class="mi-s">'hive.db.orders'</span>)

<span class="mi-c">-- 3. Import files into an Iceberg table</span>
<span class="mi-k">CALL</span> sys.add_files(
  table => <span class="mi-s">'ice.db.orders'</span>,
  source_table => <span class="mi-s">'hive.db.orders'</span>)</div>
            </div>
          </div>
        </div>
      `;
      container.appendChild(page);

      const svg = _buildSVG();
      page.querySelector('#mi-canvas').appendChild(svg);

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
      document.getElementById('mi-styles')?.remove();
    },
  };

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.modules = window.IcebergViz.modules || {};
  window.IcebergViz.modules['migrate-to-iceberg'] = mod;
})();
