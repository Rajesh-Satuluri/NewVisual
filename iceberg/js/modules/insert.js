/* ============================================================
   Insert Module
   Animates the full INSERT INTO orders SELECT … write path:
   query planning → task parallelism → parquet writes →
   column stats → manifest → snapshot → manifest list →
   concurrency check → metadata.json committed → done
   ============================================================ */

(function () {
  'use strict';

  const D  = () => window.IcebergViz.Data;
  const IV = window.IcebergViz;

  /* ── Style injection ────────────────────────────────────── */
  function _injectStyles() {
    if (document.getElementById('ins-styles')) return;
    const s = document.createElement('style');
    s.id = 'ins-styles';
    s.textContent = `
.ins-page { display:flex; flex-direction:column; height:100%; overflow:hidden; }

.ins-outer {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.ins-canvas {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: var(--bg-1);
  overflow: hidden;
  position: relative;
}

.ins-sidebar {
  width: 360px;
  border-left: 1px solid var(--border-default);
  background: var(--bg-2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.ins-sidebar-header {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-default);
  flex-shrink: 0;
}

.ins-sidebar-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.ins-sidebar-desc {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  line-height: 1.5;
  min-height: 40px;
}

.ins-steps-list {
  flex: 0 0 auto;
  overflow-y: auto;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-default);
  max-height: 290px;
}

.ins-step-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 7px 16px;
  cursor: pointer;
  transition: background var(--ease-fast);
  border-left: 3px solid transparent;
  margin-bottom: 1px;
}
.ins-step-item:hover { background: var(--bg-3); }
.ins-step-item.active {
  background: rgba(74,174,255,0.07);
  border-left-color: var(--blue);
}
.ins-step-item.done { opacity: 0.6; }

.ins-step-badge {
  width: 20px; height: 20px;
  border-radius: 50%;
  background: var(--bg-4);
  color: var(--text-muted);
  font-size: 10px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-top: 1px;
  transition: background var(--ease-fast), color var(--ease-fast);
}
.ins-step-item.active .ins-step-badge { background: var(--blue); color: #fff; }
.ins-step-item.done .ins-step-badge   { background: var(--green); color: #fff; }

.ins-step-text {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
}
.ins-step-item.active .ins-step-text { color: var(--text-primary); font-weight: 500; }

.ins-code-panel {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}
.ins-code-panel .code-block { margin: 0; }
`;
    document.head.appendChild(s);
  }

  /* ── Step data ──────────────────────────────────────────── */
  function _getStepsData() {
    const insertSQL = D().sql.insert;

    const taskPlan = JSON.stringify({
      "operation": "APPEND",
      "parallelism": 9,
      "partitions": [
        { "country_code": "BR", "tasks": 3, "target_files": 3 },
        { "country_code": "US", "tasks": 3, "target_files": 3 },
        { "country_code": "DE", "tasks": 3, "target_files": 3 }
      ],
      "write.target-file-size-bytes": 134217728,
      "write.distribution-mode": "hash"
    }, null, 2);

    const parquetFiles = `-- 9 Parquet files written to S3:
-- data/order_date_day=2024-11-29/country_code=BR/
--   part-00000-a1b2.parquet   134 MB  (47,293 rows)
--   part-00001-c3d4.parquet   128 MB  (51,847 rows)
--   part-00002-e5f6.parquet   141 MB  (49,102 rows)
-- data/order_date_day=2024-11-29/country_code=US/
--   part-00000-g7h8.parquet   127 MB
--   part-00001-i9j0.parquet   131 MB
--   part-00002-k1l2.parquet   129 MB
-- data/order_date_day=2024-11-29/country_code=DE/
--   part-00000-m3n4.parquet   128 MB
--   part-00001-o5p6.parquet   125 MB
--   part-00002-q7r8.parquet   130 MB
--
-- Compression: ZSTD
-- Total: ~1.17 GB written in 9 files`;

    const colStats = JSON.stringify({
      "file": "part-00000-a1b2.parquet",
      "record-count": 47293,
      "column-stats": {
        "order_id":      { "lower": 10000001,    "upper": 10047293,    "null-count": 0 },
        "customer_id":   { "lower": 50001,        "upper": 8924731,     "null-count": 0 },
        "order_date":    { "lower": "2024-11-29", "upper": "2024-11-29","null-count": 0 },
        "country_code":  { "lower": "BR",         "upper": "BR",        "null-count": 0 },
        "total_amount":  { "lower": 12.50,        "upper": 4999.99,     "null-count": 1203 }
      }
    }, null, 2);

    const manifestEntry = JSON.stringify(D().manifestFileEntry.entries[0], null, 2);

    const snapshotObj = JSON.stringify({
      "snapshot-id": 8922019143787970520,
      "parent-snapshot-id": 3051729675574597004,
      "sequence-number": 47,
      "timestamp-ms": 1701388800000,
      "operation": "append",
      "summary": {
        "added-data-files": "9",
        "added-records": "20000000",
        "added-files-size": "1258291200",
        "total-records": "86429187341",
        "total-files-size": "6291456000000"
      },
      "_note": "In-memory object — not yet written to S3"
    }, null, 2);

    const manifestListEntry = JSON.stringify(D().manifestListEntry.entries[0], null, 2);

    const concurrencyCheck = `-- Optimistic Concurrency Check (OCC):
-- 1. Read current metadata.json pointer from Glue:
--    metadata_location = s3://…/v11-prev.metadata.json
--
-- 2. Compare with "base" metadata read at job start:
--    base.current-snapshot-id = 3051729675574597004  ✓
--    live.current-snapshot-id = 3051729675574597004  ✓
--    → No concurrent writer committed; safe to proceed.
--
-- 3. If they differed → retry commit with conflict resolution
--    (Iceberg's optimistic concurrency — no distributed lock)`;

    const metaV12 = JSON.stringify({
      "format-version": 2,
      "table-uuid": "b55d9dda-6561-423a-8bfc-8be6f4b0cf9e",
      "last-sequence-number": 47,
      "last-updated-ms": 1701388800000,
      "current-schema-id": 3,
      "current-snapshot-id": 8922019143787970520,
      "snapshots": [
        {
          "snapshot-id": 3051729675574597004,
          "sequence-number": 43,
          "manifest-list": "s3://shopkart-lakehouse/…/snap-3051…avro"
        },
        {
          "snapshot-id": 8922019143787970520,
          "parent-snapshot-id": 3051729675574597004,
          "sequence-number": 47,
          "manifest-list": "s3://shopkart-lakehouse/…/snap-8922…avro"
        }
      ]
    }, null, 2);

    const summary = `-- ✓ INSERT commit complete!
--
-- Rows written:     ~20 million
-- Parquet files:    9
-- Total data:       ~1.17 GB
-- Manifest:         1 manifest .avro
-- Manifest list:    1 snap-*.avro updated
-- metadata.json:    v12 atomically swapped
-- Wall clock:       ~45 seconds
--
-- The Glue catalog metadata_location now points to
-- v12-a3f8bc.metadata.json — one atomic pointer swap
-- makes all 20M new rows immediately visible to readers.
--
-- Verify:
SELECT COUNT(*) FROM shopkart.prod.orders;
-- 86,429,187,341 rows`;

    return [
      { label: 'Query Planning',              description: 'Spark planner detects INSERT … SELECT and routes to APPEND operation mode. Write tasks are allocated: 9 tasks across 3 partitions × 3 files each.',       code: insertSQL,          lang: 'sql',  codeTitle: 'INSERT INTO SQL' },
      { label: 'Task Parallelism',            description: '9 write tasks launched: 3 for country_code=BR, 3 for US, 3 for DE. Each task writes one Parquet file. Target file size: 128 MB (134217728 bytes).',     code: taskPlan,           lang: 'json', codeTitle: 'Write Task Plan' },
      { label: 'Parquet Files Written',       description: '9 Parquet files written to S3 in parallel. All data is now on S3 but not yet committed — no reader can see it until the snapshot is committed.',          code: parquetFiles,       lang: 'sql',  codeTitle: '9 Parquet files → S3' },
      { label: 'Column Stats Computed',       description: 'Each writer computes min/max/null-counts per column for its Parquet file. These statistics are embedded into the manifest for later query pruning.',       code: colStats,           lang: 'json', codeTitle: 'Column Statistics (BR file 1)' },
      { label: 'Manifest File Created',       description: '1 manifest Avro file created listing all 9 data files with their column statistics. This is the a1b2c3d4-manifest.avro file.',                             code: manifestEntry,      lang: 'json', codeTitle: 'Manifest entry (BR file 1 of 3)' },
      { label: 'Snapshot Record Built',       description: 'In-memory snapshot object assembled: new snapshot ID, parent snapshot ID, timestamp, operation=append, and summary statistics. Not on S3 yet.',           code: snapshotObj,        lang: 'json', codeTitle: 'Snapshot object (in-memory)' },
      { label: 'Manifest List Written',       description: 'The manifest list Avro file (snap-8922…avro) is written to .metadata/. It references the 3 partition manifests and their partition bounds.',               code: manifestListEntry,  lang: 'json', codeTitle: 'Manifest list entry (BR manifest)' },
      { label: 'Optimistic Concurrency Check',description: 'Before committing, Spark re-reads the live metadata.json and verifies no concurrent writer has committed since the job started. This is Iceberg\'s OCC.',  code: concurrencyCheck,   lang: 'sql',  codeTitle: 'Concurrency Check (OCC)' },
      { label: 'metadata.json v12 Committed', description: 'New metadata.json v12 atomically written to S3. Glue Catalog metadata_location pointer updated in a single atomic operation. New data now visible.',      code: metaV12,            lang: 'json', codeTitle: 'v12-a3f8bc.metadata.json' },
      { label: 'Commit Complete',             description: '20 million rows are now queryable. The entire commit took ~45 seconds. 9 Parquet files, 1 manifest, 1 manifest list, 1 metadata.json.',                   code: summary,            lang: 'sql',  codeTitle: 'Commit Summary' },
    ];
  }

  /* ── SVG Diagram ────────────────────────────────────────── */
  function _buildSVG() {
    const W = 610, H = 450;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.maxWidth = W + 'px';
    svg.style.maxHeight = H + 'px';
    svg.id = 'ins-svg';

    // Helper: build a small parquet file rect
    function pqFile(id, x, y, label) {
      return `<g id="${id}" opacity="0">
        <rect x="${x}" y="${y}" width="72" height="36" rx="4" fill="#0a1f10" stroke="#238636" stroke-width="1.2"/>
        <text x="${x+6}" y="${y+14}" font-size="9" dominant-baseline="middle">🗄</text>
        <text x="${x+20}" y="${y+12}" font-family="ui-monospace" font-size="7.5" fill="#e6edf3">${label}</text>
        <text x="${x+20}" y="${y+24}" font-family="system-ui" font-size="7" fill="rgba(63,185,80,0.7)">PARQUET</text>
      </g>`;
    }

    svg.innerHTML = `
<defs>
  <marker id="ins-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#484f58"/>
  </marker>
  <marker id="ins-arr-blue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#58a6ff"/>
  </marker>
  <marker id="ins-arr-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#3fb950"/>
  </marker>
  <filter id="ins-glow-blue">
    <feGaussianBlur stdDeviation="3" result="b"/>
    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
</defs>

<rect width="${W}" height="${H}" fill="var(--bg-1)"/>
<text x="10" y="16" font-family="system-ui" font-size="10" fill="rgba(139,148,158,0.4)" font-weight="600" letter-spacing="1">ShopKart INSERT Animation — Append Write Path</text>

<!-- ── Spark ── -->
<g id="ins-spark">
  <rect x="10" y="26" width="175" height="58" rx="8" fill="#0d1f3c" stroke="#1f6feb" stroke-width="1.5"/>
  <text x="26" y="48" font-size="14" dominant-baseline="middle">⚡</text>
  <text x="46" y="46" font-family="system-ui" font-size="11.5" font-weight="600" fill="#e6edf3">Spark Executor</text>
  <text x="46" y="61" font-family="ui-monospace" font-size="9" fill="rgba(88,166,255,0.7)">INSERT INTO orders SELECT …</text>
  <text x="46" y="74" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.5)">operation: APPEND</text>
</g>
<rect id="ins-hl-spark" x="8" y="24" width="179" height="62" rx="9" fill="none" stroke="#58a6ff" stroke-width="2.5" opacity="0"/>

<!-- ── Task slots (9 boxes, shown at step 1) ── -->
<g id="ins-tasks" opacity="0">
  <text x="220" y="36" font-family="system-ui" font-size="10" font-weight="600" fill="rgba(88,166,255,0.8)">9 Write Tasks (3 partitions × 3 files)</text>
  ${[0,1,2,3,4,5,6,7,8].map(i => {
    const cols = ['BR','BR','BR','US','US','US','DE','DE','DE'];
    const col = cols[i];
    const x = 220 + (i % 3) * 64;
    const y = 44 + Math.floor(i/3) * 26;
    const c = col==='BR' ? '#1e5a8c' : col==='US' ? '#2ea043' : '#6e40c9';
    const sc = col==='BR' ? '#2188ff' : col==='US' ? '#3fb950' : '#a371f7';
    return `<rect x="${x}" y="${y}" width="56" height="18" rx="3" fill="${c}" stroke="${sc}" stroke-width="1" opacity="0.85"/>
            <text x="${x+28}" y="${y+13}" text-anchor="middle" font-family="ui-monospace" font-size="8" fill="#e6edf3">task-${i+1} ${col}</text>`;
  }).join('')}
</g>

<!-- ── S3 Bucket ── -->
<rect x="10" y="120" width="590" height="318" rx="10" fill="#1a1409" stroke="#f97316" stroke-width="1.5" opacity="0.9"/>
<text x="24" y="140" font-family="system-ui" font-size="10.5" font-weight="700" fill="#f97316">S3  s3://shopkart-lakehouse/warehouse/prod/orders/</text>

<!-- data/ area -->
<rect x="16" y="148" width="578" height="196" rx="6" fill="rgba(249,115,22,0.05)" stroke="rgba(249,115,22,0.25)" stroke-width="1" stroke-dasharray="4 3"/>
<text x="28" y="165" font-family="ui-monospace" font-size="9.5" fill="rgba(249,115,22,0.6)">📂 data/order_date_day=2024-11-29/</text>

<!-- BR partition -->
<rect x="22" y="172" width="180" height="64" rx="5" fill="rgba(33,136,255,0.07)" stroke="rgba(33,136,255,0.25)" stroke-width="1"/>
<text x="34" y="188" font-family="ui-monospace" font-size="9" fill="rgba(33,136,255,0.7)">country_code=BR</text>
${pqFile('ins-br0', 26, 193, 'part-00000-a1b2')}
${pqFile('ins-br1', 103, 193, 'part-00001-c3d4')}
${pqFile('ins-br2', 133, 193, 'part-00002-e5f6')}

<!-- US partition -->
<rect x="216" y="172" width="180" height="64" rx="5" fill="rgba(63,185,80,0.06)" stroke="rgba(63,185,80,0.2)" stroke-width="1"/>
<text x="228" y="188" font-family="ui-monospace" font-size="9" fill="rgba(63,185,80,0.6)">country_code=US</text>
${pqFile('ins-us0', 220, 193, 'part-00000-g7h8')}
${pqFile('ins-us1', 297, 193, 'part-00001-i9j0')}
${pqFile('ins-us2', 327, 193, 'part-00002-k1l2')}

<!-- DE partition -->
<rect x="410" y="172" width="172" height="64" rx="5" fill="rgba(163,113,247,0.06)" stroke="rgba(163,113,247,0.2)" stroke-width="1"/>
<text x="422" y="188" font-family="ui-monospace" font-size="9" fill="rgba(163,113,247,0.55)">country_code=DE</text>
${pqFile('ins-de0', 414, 193, 'part-00000-m3n4')}
${pqFile('ins-de1', 491, 193, 'part-00001-o5p6')}
${pqFile('ins-de2', 518, 193, 'part-00002-q7r8')}

<!-- Stats overlay (column stats step) -->
<g id="ins-stats-overlay" opacity="0">
  <rect x="22" y="256" width="576" height="22" rx="4" fill="rgba(88,166,255,0.08)" stroke="#58a6ff" stroke-width="1"/>
  <text x="310" y="271" text-anchor="middle" font-family="system-ui" font-size="9.5" font-weight="600" fill="#58a6ff">Column statistics computed (min/max/null-counts) — embedded in manifest entries</text>
</g>

<!-- .metadata/ area -->
<rect x="16" y="286" width="578" height="144" rx="6" fill="rgba(163,113,247,0.04)" stroke="rgba(163,113,247,0.2)" stroke-width="1" stroke-dasharray="4 3"/>
<text x="28" y="303" font-family="ui-monospace" font-size="9.5" fill="rgba(163,113,247,0.6)">📂 .metadata/</text>

<!-- manifest .avro -->
<g id="ins-manifest" opacity="0">
  <rect x="22" y="309" width="200" height="48" rx="5" fill="#1e1030" stroke="#a371f7" stroke-width="1.5"/>
  <text x="38" y="328" font-size="11" dominant-baseline="middle">📊</text>
  <text x="56" y="325" font-family="ui-monospace" font-size="9.5" font-weight="600" fill="#e6edf3">a1b2c3d4-manifest.avro</text>
  <text x="56" y="339" font-family="ui-monospace" font-size="8.5" fill="rgba(163,113,247,0.65)">9 data files · 4.2 MB</text>
  <text x="56" y="351" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,0.45)">status=ADDED</text>
</g>

<!-- manifest list .avro -->
<g id="ins-maniflist" opacity="0">
  <rect x="238" y="309" width="210" height="48" rx="5" fill="#1a1a10" stroke="#f97316" stroke-width="1.5"/>
  <text x="254" y="328" font-size="11" dominant-baseline="middle">📋</text>
  <text x="272" y="325" font-family="ui-monospace" font-size="9.5" font-weight="600" fill="#e6edf3">snap-8922…avro</text>
  <text x="272" y="339" font-family="ui-monospace" font-size="8.5" fill="rgba(249,115,22,0.65)">manifest list · 10.3 KB</text>
  <text x="272" y="351" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,0.45)">3 manifest entries</text>
</g>

<!-- metadata.json v12 -->
<g id="ins-metajson" opacity="0">
  <rect x="464" y="309" width="122" height="48" rx="5" fill="#1a1030" stroke="#58a6ff" stroke-width="2"/>
  <text x="476" y="328" font-size="11" dominant-baseline="middle">📄</text>
  <text x="494" y="324" font-family="ui-monospace" font-size="9" font-weight="600" fill="#e6edf3">v12-a3f8bc</text>
  <text x="494" y="337" font-family="ui-monospace" font-size="8.5" fill="rgba(88,166,255,0.7)">.metadata.json</text>
  <text x="494" y="350" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,0.45)">142.8 KB</text>
</g>

<!-- OCC check label -->
<g id="ins-occ-label" opacity="0">
  <rect x="22" y="364" width="440" height="22" rx="4" fill="rgba(248,81,73,0.08)" stroke="rgba(248,81,73,0.4)" stroke-width="1"/>
  <text x="242" y="379" text-anchor="middle" font-family="system-ui" font-size="9.5" font-weight="600" fill="#f85149">OCC: re-read catalog pointer — no concurrent writer detected ✓</text>
</g>

<!-- Commit complete badge -->
<g id="ins-done-badge" opacity="0">
  <rect x="470" y="364" width="120" height="22" rx="11" fill="#0a1f10" stroke="#3fb950" stroke-width="1.5"/>
  <text x="530" y="379" text-anchor="middle" font-family="system-ui" font-size="10" font-weight="700" fill="#3fb950">✓ Committed</text>
</g>

<!-- Arrow Spark → S3 -->
<g id="ins-arrow-write" opacity="0">
  <line x1="98" y1="84" x2="98" y2="118" stroke="#58a6ff" stroke-width="2" marker-end="url(#ins-arr-blue)"/>
  <text x="104" y="105" font-family="system-ui" font-size="9" fill="#58a6ff">write</text>
</g>
`;

    return svg;
  }

  /* ── Animation steps ────────────────────────────────────── */
  function _buildAnimationSteps(svg) {
    const AE = IV.AnimationEngine;

    function g(id) { return svg.getElementById(id); }
    function show(id, glow) {
      const el = g(id);
      if (!el) return;
      el.setAttribute('opacity', '1');
      if (glow === 'blue')   el.style.filter = 'drop-shadow(0 0 8px rgba(74,174,255,0.7))';
      if (glow === 'green')  el.style.filter = 'drop-shadow(0 0 8px rgba(63,185,80,0.6))';
      if (glow === 'purple') el.style.filter = 'drop-shadow(0 0 8px rgba(163,113,247,0.7))';
      if (glow === 'orange') el.style.filter = 'drop-shadow(0 0 8px rgba(249,115,22,0.6))';
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
      AE.fnStep('Query Planning', '', (ctx) => {
        show('ins-hl-spark');
        show('ins-arrow-write', 'blue');
      }, (ctx) => {
        hide('ins-hl-spark');
        hide('ins-arrow-write');
      }, 2500),

      AE.fnStep('Task Parallelism', '', (ctx) => {
        show('ins-tasks', 'blue');
        unglow('ins-hl-spark');
      }, (ctx) => {
        hide('ins-tasks');
      }, 2800),

      AE.fnStep('Parquet Files Written', '', (ctx) => {
        ['ins-br0','ins-br1','ins-br2','ins-us0','ins-us1','ins-us2','ins-de0','ins-de1','ins-de2']
          .forEach((id, i) => setTimeout(() => show(id, 'green'), i * 60));
      }, (ctx) => {
        ['ins-br0','ins-br1','ins-br2','ins-us0','ins-us1','ins-us2','ins-de0','ins-de1','ins-de2']
          .forEach(id => hide(id));
      }, 3000),

      AE.fnStep('Column Stats Computed', '', (ctx) => {
        show('ins-stats-overlay', 'blue');
      }, (ctx) => {
        hide('ins-stats-overlay');
      }, 2500),

      AE.fnStep('Manifest File Created', '', (ctx) => {
        show('ins-manifest', 'purple');
        hide('ins-stats-overlay');
      }, (ctx) => {
        hide('ins-manifest');
      }, 2800),

      AE.fnStep('Snapshot Record Built', '', (ctx) => {
        unglow('ins-manifest');
      }, (ctx) => {}, 2500),

      AE.fnStep('Manifest List Written', '', (ctx) => {
        show('ins-maniflist', 'orange');
      }, (ctx) => {
        hide('ins-maniflist');
      }, 2800),

      AE.fnStep('Optimistic Concurrency Check', '', (ctx) => {
        show('ins-occ-label');
      }, (ctx) => {
        hide('ins-occ-label');
      }, 3000),

      AE.fnStep('metadata.json v12 Committed', '', (ctx) => {
        show('ins-metajson', 'blue');
        hide('ins-occ-label');
      }, (ctx) => {
        hide('ins-metajson');
      }, 2800),

      AE.fnStep('Commit Complete', '', (ctx) => {
        show('ins-done-badge', 'green');
        unglow('ins-metajson');
        ['ins-br0','ins-br1','ins-br2','ins-us0','ins-us1','ins-us2','ins-de0','ins-de1','ins-de2']
          .forEach(id => unglow(id));
      }, (ctx) => {
        hide('ins-done-badge');
      }, 3500),
    ];
  }

  /* ── Sidebar wiring ─────────────────────────────────────── */
  function _buildSidebar(page, engine, stepsData) {
    const list     = page.querySelector('#ins-steps-list');
    const titleEl  = page.querySelector('#ins-step-title');
    const descEl   = page.querySelector('#ins-step-desc');
    const codePanel = page.querySelector('#ins-code-panel');
    if (!list) return;

    list.innerHTML = stepsData.map((s, i) => `
      <div class="ins-step-item" data-step="${i}">
        <div class="ins-step-badge">${i + 1}</div>
        <div class="ins-step-text">${s.label}</div>
      </div>
    `).join('');

    engine.on('stepchange', (idx) => {
      list.querySelectorAll('.ins-step-item').forEach((el, i) => {
        el.classList.toggle('active', i === idx);
        el.classList.toggle('done', i < idx);
      });
      const step = idx >= 0 ? stepsData[idx] : null;
      if (titleEl) titleEl.textContent = step ? step.label : 'Press Play to begin';
      if (descEl)  descEl.textContent  = step ? step.description : 'Watch the full Iceberg append write path from query planning to atomic commit.';
      if (codePanel && step) {
        codePanel.innerHTML = '';
        codePanel.appendChild(IV.CodeViewer.create(step.code, step.lang || 'json', step.codeTitle));
      }
      const active = list.querySelector('.ins-step-item.active');
      if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });

    list.addEventListener('click', (e) => {
      const item = e.target.closest('[data-step]');
      if (item) engine.goto(parseInt(item.dataset.step, 10));
    });
  }

  /* ── Module ─────────────────────────────────────────────── */
  const mod = {
    id: 'insert',
    title: 'INSERT',
    group: 'write-ops',
    _engine: null,

    render(container) {
      container.innerHTML = '';
      _injectStyles();

      const page = document.createElement('div');
      page.className = 'ins-page page-enter';
      page.innerHTML = `
        <div class="ins-outer">
          <div class="ins-canvas" id="ins-canvas"></div>
          <div class="ins-sidebar">
            <div class="ins-sidebar-header">
              <div class="ins-sidebar-title" id="ins-step-title">Press Play to begin</div>
              <div class="ins-sidebar-desc" id="ins-step-desc">Watch the full Iceberg append write path — from Spark query planning to atomic metadata.json commit.</div>
            </div>
            <div class="ins-steps-list" id="ins-steps-list"></div>
            <div class="ins-code-panel" id="ins-code-panel"></div>
          </div>
        </div>
      `;
      container.appendChild(page);

      const svg     = _buildSVG();
      page.querySelector('#ins-canvas').appendChild(svg);

      const stepsData = _getStepsData();
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
      document.getElementById('ins-styles')?.remove();
    },
  };

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.modules = window.IcebergViz.modules || {};
  window.IcebergViz.modules['insert'] = mod;
})();
