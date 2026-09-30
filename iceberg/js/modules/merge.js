/* ============================================================
   Merge Module
   Animated 10-step MERGE INTO showing ShopKart CDC upsert:
   Kafka → Spark → MERGE INTO orders every 30 seconds.
   ============================================================ */

(function () {
  'use strict';

  const IV = window.IcebergViz;

  /* ── Style injection ────────────────────────────────────── */
  function _injectStyles() {
    if (document.getElementById('mrg-styles')) return;
    const s = document.createElement('style');
    s.id = 'mrg-styles';
    s.textContent = `
.mrg-page { display:flex; flex-direction:column; height:100%; overflow:hidden; }

.mrg-outer {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.mrg-canvas {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background: var(--bg-1);
  overflow: hidden;
  position: relative;
}

.mrg-sidebar {
  width: 360px;
  border-left: 1px solid var(--border-default);
  background: var(--bg-2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.mrg-sidebar-header {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-default);
  flex-shrink: 0;
}

.mrg-sidebar-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.mrg-sidebar-desc {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  line-height: 1.5;
  min-height: 52px;
}

.mrg-steps-list {
  flex: 0 0 auto;
  overflow-y: auto;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-default);
  max-height: 240px;
}

.mrg-step-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 7px 16px;
  cursor: pointer;
  transition: background 0.12s;
  border-left: 3px solid transparent;
  margin-bottom: 1px;
}
.mrg-step-item:hover { background: var(--bg-3); }
.mrg-step-item.active {
  background: rgba(74,174,255,0.07);
  border-left-color: var(--blue);
}
.mrg-step-item.done { opacity: 0.6; }

.mrg-step-badge {
  width: 20px; height: 20px;
  border-radius: 50%;
  background: var(--bg-4);
  color: var(--text-muted);
  font-size: 10px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-top: 1px;
}
.mrg-step-item.active .mrg-step-badge { background: var(--blue); color: #fff; }
.mrg-step-item.done .mrg-step-badge   { background: var(--green); color: #fff; }

.mrg-step-text {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
}
.mrg-step-item.active .mrg-step-text { color: var(--text-primary); font-weight: 500; }

.mrg-code-panel {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.mrg-sql-block {
  background: var(--bg-3);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 10px 12px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-secondary);
  line-height: 1.7;
  white-space: pre;
  overflow-x: auto;
}

.mrg-k { color: var(--blue); font-weight: 600; }
.mrg-s { color: var(--green); }
.mrg-c { color: var(--text-muted); font-style: italic; }
`;
    document.head.appendChild(s);
  }

  /* ── Step descriptions ──────────────────────────────────── */
  function _getStepDescs() {
    return [
      { label: 'CDC Batch Arrives',        desc: 'Every 30 seconds, Spark Structured Streaming reads a CDC batch from Kafka. This batch: 4,847 status updates + 153 new orders. Total: 5,000 records.' },
      { label: 'Stage Source Table',       desc: 'CDC records written to a temporary staging table order_status_cdc in S3. Spark creates an Iceberg scan plan for the MERGE join against the orders table.' },
      { label: 'Hash Join Plan',           desc: 'MERGE optimizer broadcasts the small CDC table (5,000 rows) across all Spark executors. Full orders table scan avoided via order_id bloom filter.' },
      { label: 'MATCHED: 4,847 Updates',   desc: '4,847 records matched existing order_ids. UPDATE SET clause applies: status, updated_at, tracking_id columns modified on matched rows.' },
      { label: 'NOT MATCHED: 153 Inserts', desc: '153 new order_ids not found in the target table. INSERT clause adds full row. These are newly placed orders from the last 30 seconds.' },
      { label: 'CoW: Rewrite Updated Files',desc: '4,847 updated rows span 23 Parquet files. Copy-on-Write rewrites all 23 files (2.9 GB I/O). MoR would write equality-delete + new rows files instead.' },
      { label: 'Write New Order Files',    desc: '153 new orders written to a new Parquet file in the country partition. Small file — will be compacted in next OPTIMIZE run.' },
      { label: 'Atomic Snapshot Commit',   desc: 'All changes committed in one atomic snapshot. Either all 5,000 changes are visible or none. No partial-write inconsistency possible with Iceberg OCC.' },
      { label: 'Concurrency Check',        desc: 'Optimistic concurrency: Iceberg checks that no other writer committed between when this MERGE read its snapshot and now. If conflict: retry the MERGE.' },
      { label: 'Batch Complete',           desc: 'Full CDC batch processed. ShopKart runs 2,880 such batches per day = 14.4M order updates/day with zero duplicates and ACID guarantees.' },
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
    svg.id = 'mrg-svg';

    svg.innerHTML = `
<defs>
  <marker id="mrg-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#484f58"/>
  </marker>
  <marker id="mrg-arr-blue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#58a6ff"/>
  </marker>
  <marker id="mrg-arr-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#56d364"/>
  </marker>
  <marker id="mrg-arr-orange" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#f0883e"/>
  </marker>
</defs>

<rect width="${W}" height="${H}" fill="#090d14"/>
<text x="12" y="16" font-family="system-ui" font-size="9.5" fill="rgba(139,148,158,0.4)" font-weight="600" letter-spacing="1">ShopKart MERGE INTO — Real-time CDC Upsert via Kafka → Spark</text>

<!-- ═══ LEFT: CDC Source (Kafka) ═══ -->
<g id="mrg-kafka-box">
  <rect x="10" y="30" width="148" height="108" rx="8" fill="#1a1030" stroke="#a371f7" stroke-width="1.5"/>
  <text x="26" y="56" font-size="18" dominant-baseline="middle">📨</text>
  <text x="52" y="53" font-family="system-ui" font-size="11" font-weight="700" fill="#e6edf3">CDC Source</text>
  <text x="26" y="72" font-family="system-ui" font-size="9" fill="rgba(163,113,247,0.8)">Kafka Topic:</text>
  <text x="26" y="84" font-family="ui-monospace" font-size="8.5" fill="rgba(163,113,247,0.6)">order-status-events</text>
  <text x="26" y="98" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.6)">Batch every 30s:</text>
  <text x="26" y="111" font-family="ui-monospace" font-size="10" font-weight="700" fill="#a371f7">5,000 records</text>
  <text x="26" y="126" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.4)">4,847 updates + 153 new</text>
</g>
<rect id="mrg-hl-kafka" x="8" y="28" width="152" height="112" rx="9" fill="none" stroke="#a371f7" stroke-width="2.5" opacity="0"/>

<!-- Arrow Kafka → Staging -->
<g id="mrg-arrow-stage" opacity="0">
  <line x1="160" y1="84" x2="208" y2="84" stroke="#58a6ff" stroke-width="2" marker-end="url(#mrg-arr-blue)"/>
  <text x="166" y="79" font-family="system-ui" font-size="8.5" fill="#58a6ff">stage</text>
</g>

<!-- Staging table -->
<g id="mrg-staging-box" opacity="0">
  <rect x="210" y="54" width="148" height="62" rx="7" fill="#0d1117" stroke="#58a6ff" stroke-width="1.2" stroke-dasharray="4 3"/>
  <text x="226" y="78" font-size="12">📋</text>
  <text x="248" y="75" font-family="system-ui" font-size="10" font-weight="600" fill="#e6edf3">order_status_cdc</text>
  <text x="226" y="91" font-family="ui-monospace" font-size="8.5" fill="rgba(88,166,255,0.6)">5,000 rows (temp)</text>
  <text x="226" y="104" font-family="system-ui" font-size="8" fill="rgba(139,148,158,0.4)">staged in S3</text>
</g>

<!-- ═══ CENTER: MERGE Engine ═══ -->
<rect x="386" y="30" width="190" height="200" rx="10" fill="rgba(88,166,255,0.04)" stroke="rgba(88,166,255,0.2)" stroke-width="1.2"/>
<text x="481" y="52" text-anchor="middle" font-family="system-ui" font-size="11" font-weight="700" fill="var(--text-primary)">MERGE Engine</text>
<text x="481" y="66" text-anchor="middle" font-family="system-ui" font-size="8.5" fill="rgba(139,148,158,0.6)">ON target.order_id = source.order_id</text>

<!-- MATCHED branch -->
<g id="mrg-matched-box">
  <rect x="396" y="78" width="170" height="52" rx="7" fill="#1e1408" stroke="#f0883e" stroke-width="1.5"/>
  <text x="406" y="99" font-family="system-ui" font-size="9.5" font-weight="700" fill="#f0883e">WHEN MATCHED</text>
  <text x="406" y="113" font-family="system-ui" font-size="8.5" fill="rgba(240,136,62,0.7)">UPDATE SET status, updated_at,</text>
  <text x="406" y="124" font-family="system-ui" font-size="8.5" fill="rgba(240,136,62,0.7)">  tracking_id</text>
</g>
<rect id="mrg-hl-matched" x="394" y="76" width="174" height="56" rx="8" fill="none" stroke="#f0883e" stroke-width="2.5" opacity="0"/>

<!-- Counter: matched -->
<g id="mrg-count-matched" opacity="0">
  <rect x="480" y="82" width="82" height="28" rx="14" fill="#f0883e"/>
  <text x="521" y="100" text-anchor="middle" font-family="system-ui" font-size="11" font-weight="700" fill="#fff">4,847</text>
</g>

<!-- NOT MATCHED branch -->
<g id="mrg-notmatched-box">
  <rect x="396" y="142" width="170" height="52" rx="7" fill="#0a1f10" stroke="#56d364" stroke-width="1.5"/>
  <text x="406" y="163" font-family="system-ui" font-size="9.5" font-weight="700" fill="#56d364">WHEN NOT MATCHED</text>
  <text x="406" y="177" font-family="system-ui" font-size="8.5" fill="rgba(86,211,100,0.7)">INSERT (order_id, customer_id,</text>
  <text x="406" y="188" font-family="system-ui" font-size="8.5" fill="rgba(86,211,100,0.7)">  status, total_amount, …)</text>
</g>
<rect id="mrg-hl-notmatched" x="394" y="140" width="174" height="56" rx="8" fill="none" stroke="#56d364" stroke-width="2.5" opacity="0"/>

<!-- Counter: not matched -->
<g id="mrg-count-notmatched" opacity="0">
  <rect x="480" y="148" width="82" height="28" rx="14" fill="#56d364"/>
  <text x="521" y="166" text-anchor="middle" font-family="system-ui" font-size="11" font-weight="700" fill="#fff">153</text>
</g>

<!-- Hash Join indicator -->
<g id="mrg-hashjoin" opacity="0">
  <rect x="396" y="206" width="170" height="16" rx="4" fill="rgba(88,166,255,0.1)" stroke="rgba(88,166,255,0.3)" stroke-width="1"/>
  <text x="481" y="218" text-anchor="middle" font-family="system-ui" font-size="8.5" fill="#58a6ff">broadcast hash join (5K rows)</text>
</g>

<!-- Arrow staging → MERGE -->
<g id="mrg-arrow-merge" opacity="0">
  <line x1="360" y1="84" x2="383" y2="84" stroke="#58a6ff" stroke-width="2" marker-end="url(#mrg-arr-blue)"/>
</g>

<!-- ═══ RIGHT: Orders Table ═══ -->
<g id="mrg-orders-box">
  <rect x="600" y="30" width="152" height="200" rx="8" fill="#0d1f3c" stroke="#1f6feb" stroke-width="1.5"/>
  <text x="616" y="56" font-size="14" dominant-baseline="middle">🗄</text>
  <text x="638" y="53" font-family="system-ui" font-size="11" font-weight="700" fill="#e6edf3">orders</text>
  <text x="616" y="70" font-family="ui-monospace" font-size="8.5" fill="rgba(88,166,255,0.6)">prod.orders</text>
  <text x="616" y="84" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.6)">1.2B rows</text>
  <text x="616" y="98" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.6)">24,000 files</text>
  <text x="616" y="112" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.6)">38.4 TB</text>
</g>
<rect id="mrg-hl-orders" x="598" y="28" width="156" height="204" rx="9" fill="none" stroke="#58a6ff" stroke-width="2.5" opacity="0"/>

<!-- Arrow MERGE → orders (matched) -->
<g id="mrg-arrow-update" opacity="0">
  <line x1="568" y1="104" x2="596" y2="104" stroke="#f0883e" stroke-width="2" marker-end="url(#mrg-arr-orange)"/>
  <text x="572" y="99" font-family="system-ui" font-size="8" fill="#f0883e">update</text>
</g>

<!-- Arrow MERGE → orders (insert) -->
<g id="mrg-arrow-insert" opacity="0">
  <line x1="568" y1="168" x2="596" y2="168" stroke="#56d364" stroke-width="2" marker-end="url(#mrg-arr-green)"/>
  <text x="572" y="163" font-family="system-ui" font-size="8" fill="#56d364">insert</text>
</g>

<!-- ═══ BOTTOM: Write activity ═══ -->

<!-- CoW file rewrite (23 files) -->
<g id="mrg-cow-rewrite" opacity="0">
  <rect x="10" y="250" width="580" height="70" rx="8" fill="rgba(88,166,255,0.04)" stroke="rgba(88,166,255,0.2)" stroke-width="1.2"/>
  <text x="22" y="270" font-family="system-ui" font-size="9.5" font-weight="600" fill="#58a6ff">CoW: Rewriting 23 files containing updated rows (2.9 GB)…</text>
  <!-- small file grid -->
  ${Array.from({length: 23}, (_, i) => {
    const x = 22 + (i * 24);
    return `<rect x="${x}" y="278" width="18" height="26" rx="3" fill="#0d1f3c" stroke="#1f6feb" stroke-width="1"/>`;
  }).join('')}
  <!-- new file indicators -->
  ${Array.from({length: 23}, (_, i) => {
    const x = 22 + (i * 24);
    return `<rect x="${x}" y="306" width="18" height="4" rx="1" fill="#56d364" opacity="0.6"/>`;
  }).join('')}
</g>

<!-- New order file (153 rows) -->
<g id="mrg-new-orders-file" opacity="0">
  <rect x="10" y="330" width="290" height="54" rx="7" fill="#0a1f10" stroke="#56d364" stroke-width="1.5"/>
  <text x="26" y="352" font-size="12">🗄</text>
  <text x="48" y="349" font-family="system-ui" font-size="10" font-weight="600" fill="#e6edf3">new-orders.parquet</text>
  <text x="48" y="363" font-family="ui-monospace" font-size="8.5" fill="rgba(86,211,100,0.7)">153 new rows · 0.2 MB</text>
  <text x="48" y="375" font-family="system-ui" font-size="8" fill="rgba(139,148,158,0.4)">will be compacted in next OPTIMIZE</text>
</g>

<!-- Snapshot commit indicator -->
<g id="mrg-snap-commit" opacity="0">
  <rect x="10" y="330" width="430" height="54" rx="7" fill="#1a1a2e" stroke="#58a6ff" stroke-width="1.5"/>
  <text x="26" y="352" font-family="system-ui" font-size="10.5" font-weight="700" fill="#58a6ff">Atomic Snapshot Commit</text>
  <text x="26" y="368" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.7)">All 5,000 changes visible simultaneously — or none (ACID atomicity)</text>
  <text x="26" y="376" font-family="system-ui" font-size="8.5" fill="rgba(139,148,158,0.5)">New metadata.json written, Glue catalog pointer updated atomically</text>
</g>

<!-- Concurrency check indicator -->
<g id="mrg-occ-check" opacity="0">
  <rect x="10" y="330" width="430" height="54" rx="7" fill="rgba(88,166,255,0.06)" stroke="rgba(88,166,255,0.3)" stroke-width="1.2"/>
  <text x="26" y="352" font-family="system-ui" font-size="10.5" font-weight="600" fill="#58a6ff">OCC: Optimistic Concurrency Check</text>
  <text x="26" y="368" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.7)">Re-read catalog pointer: no concurrent writer detected ✓</text>
  <text x="26" y="382" font-family="ui-monospace" font-size="8.5" fill="rgba(86,211,100,0.7)">No conflicts detected — safe to commit</text>
</g>

<!-- Success stats (step 10) -->
<g id="mrg-success" opacity="0">
  <rect x="10" y="250" width="736" height="196" rx="10" fill="#0a1f10" stroke="#56d364" stroke-width="2"/>
  <text x="386" y="278" text-anchor="middle" font-family="system-ui" font-size="16" font-weight="700" fill="#56d364">Batch Complete ✓</text>

  <!-- stat grid -->
  <rect x="30"  y="294" width="156" height="56" rx="7" fill="rgba(86,211,100,0.06)" stroke="rgba(86,211,100,0.2)" stroke-width="1"/>
  <text x="108" y="316" text-anchor="middle" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.6)">UPDATED</text>
  <text x="108" y="336" text-anchor="middle" font-family="ui-monospace" font-size="18" font-weight="700" fill="#56d364">4,847</text>

  <rect x="200" y="294" width="156" height="56" rx="7" fill="rgba(88,166,255,0.06)" stroke="rgba(88,166,255,0.2)" stroke-width="1"/>
  <text x="278" y="316" text-anchor="middle" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.6)">INSERTED</text>
  <text x="278" y="336" text-anchor="middle" font-family="ui-monospace" font-size="18" font-weight="700" fill="#58a6ff">153</text>

  <rect x="370" y="294" width="156" height="56" rx="7" fill="rgba(163,113,247,0.06)" stroke="rgba(163,113,247,0.2)" stroke-width="1"/>
  <text x="448" y="316" text-anchor="middle" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.6)">DUPLICATES</text>
  <text x="448" y="336" text-anchor="middle" font-family="ui-monospace" font-size="18" font-weight="700" fill="#a371f7">0</text>

  <rect x="540" y="294" width="186" height="56" rx="7" fill="rgba(240,136,62,0.06)" stroke="rgba(240,136,62,0.2)" stroke-width="1"/>
  <text x="633" y="316" text-anchor="middle" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.6)">LATENCY</text>
  <text x="633" y="336" text-anchor="middle" font-family="ui-monospace" font-size="18" font-weight="700" fill="#f0883e">4.1s</text>

  <text x="386" y="388" text-anchor="middle" font-family="system-ui" font-size="9.5" fill="rgba(139,148,158,0.6)">ShopKart: 2,880 batches/day = 14.4M order updates/day · ACID guaranteed</text>
  <text x="386" y="404" text-anchor="middle" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.4)">Zero duplicates · Zero partial writes · Full snapshot isolation</text>
  <text x="386" y="432" text-anchor="middle" font-family="system-ui" font-size="9" fill="rgba(86,211,100,0.5)">Next batch in 26 seconds…</text>
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
      AE.fnStep('CDC Batch Arrives', '', (ctx) => {
        show('mrg-hl-kafka', 'purple');
      }, (ctx) => {
        hide('mrg-hl-kafka');
      }, 2500),

      AE.fnStep('Stage Source Table', '', (ctx) => {
        unglow('mrg-hl-kafka');
        show('mrg-arrow-stage', 'blue');
        show('mrg-staging-box', 'blue');
      }, (ctx) => {
        hide('mrg-arrow-stage');
        hide('mrg-staging-box');
      }, 2500),

      AE.fnStep('Hash Join Plan', '', (ctx) => {
        show('mrg-arrow-merge', 'blue');
        show('mrg-hashjoin', 'blue');
        show('mrg-hl-orders', 'blue');
      }, (ctx) => {
        hide('mrg-arrow-merge');
        hide('mrg-hashjoin');
        hide('mrg-hl-orders');
      }, 2800),

      AE.fnStep('MATCHED: 4,847 Updates', '', (ctx) => {
        hide('mrg-hl-orders');
        show('mrg-hl-matched', 'orange');
        show('mrg-count-matched');
        show('mrg-arrow-update', 'orange');
      }, (ctx) => {
        hide('mrg-hl-matched');
        hide('mrg-count-matched');
        hide('mrg-arrow-update');
      }, 3000),

      AE.fnStep('NOT MATCHED: 153 Inserts', '', (ctx) => {
        unglow('mrg-hl-matched');
        show('mrg-hl-notmatched', 'green');
        show('mrg-count-notmatched');
        show('mrg-arrow-insert', 'green');
      }, (ctx) => {
        hide('mrg-hl-notmatched');
        hide('mrg-count-notmatched');
        hide('mrg-arrow-insert');
      }, 2800),

      AE.fnStep('CoW: Rewrite Updated Files', '', (ctx) => {
        hide('mrg-hl-notmatched');
        show('mrg-cow-rewrite', 'blue');
      }, (ctx) => {
        hide('mrg-cow-rewrite');
      }, 3500),

      AE.fnStep('Write New Order Files', '', (ctx) => {
        show('mrg-new-orders-file', 'green');
      }, (ctx) => {
        hide('mrg-new-orders-file');
      }, 2800),

      AE.fnStep('Atomic Snapshot Commit', '', (ctx) => {
        hide('mrg-new-orders-file');
        hide('mrg-cow-rewrite');
        show('mrg-snap-commit', 'blue');
      }, (ctx) => {
        hide('mrg-snap-commit');
      }, 3000),

      AE.fnStep('Concurrency Check', '', (ctx) => {
        hide('mrg-snap-commit');
        show('mrg-occ-check', 'blue');
      }, (ctx) => {
        hide('mrg-occ-check');
      }, 2800),

      AE.fnStep('Batch Complete', '', (ctx) => {
        hide('mrg-occ-check');
        show('mrg-success', 'green');
      }, (ctx) => {
        hide('mrg-success');
      }, 5000),
    ];
  }

  /* ── Sidebar SQL ────────────────────────────────────────── */
  function _buildSQLPanel() {
    return `
<div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;font-weight:600;">MERGE SQL (ShopKart CDC)</div>
<div class="mrg-sql-block"><span class="mrg-k">MERGE INTO</span> prod.orders <span class="mrg-k">AS</span> target
<span class="mrg-k">USING</span> order_status_cdc <span class="mrg-k">AS</span> source
<span class="mrg-k">ON</span> target.order_id = source.order_id
<span class="mrg-k">WHEN MATCHED AND</span>
  source.status != target.status <span class="mrg-k">THEN</span>
  <span class="mrg-k">UPDATE SET</span>
    target.status = source.status,
    target.updated_at = source.event_ts,
    target.tracking_id = source.tracking_id
<span class="mrg-k">WHEN NOT MATCHED THEN</span>
  <span class="mrg-k">INSERT</span> (order_id, customer_id,
          status, total_amount,
          country, placed_at,
          updated_at, tracking_id)
  <span class="mrg-k">VALUES</span> (source.order_id,
          source.customer_id,
          source.status,
          source.total_amount,
          source.country,
          source.placed_at,
          source.event_ts,
          source.tracking_id)</div>
<div style="margin-top:10px;background:var(--bg-3);border:1px solid var(--border-default);border-radius:6px;padding:8px 10px;font-size:11px;color:var(--text-muted);line-height:1.6;">
  <div style="color:var(--text-secondary);font-weight:600;margin-bottom:4px;">Batch Stats</div>
  Every 30s · 2,880 batches/day<br>
  14.4M updates/day · 0 duplicates<br>
  Spark Structured Streaming
</div>
`;
  }

  /* ── Sidebar wiring ─────────────────────────────────────── */
  function _buildSidebar(page, engine, stepsData) {
    const list    = page.querySelector('#mrg-steps-list');
    const titleEl = page.querySelector('#mrg-step-title');
    const descEl  = page.querySelector('#mrg-step-desc');
    if (!list) return;

    list.innerHTML = stepsData.map((s, i) => `
      <div class="mrg-step-item" data-step="${i}">
        <div class="mrg-step-badge">${i + 1}</div>
        <div class="mrg-step-text">${s.label}</div>
      </div>
    `).join('');

    engine.on('stepchange', (idx) => {
      list.querySelectorAll('.mrg-step-item').forEach((el, i) => {
        el.classList.toggle('active', i === idx);
        el.classList.toggle('done', i < idx);
      });
      const step = idx >= 0 ? stepsData[idx] : null;
      if (titleEl) titleEl.textContent = step ? step.label : 'Press Play to begin';
      if (descEl)  descEl.textContent  = step ? step.desc  : 'Watch Iceberg MERGE INTO execute a 5,000-record CDC batch: 4,847 updates + 153 inserts in 4.1 seconds.';
      const active = list.querySelector('.mrg-step-item.active');
      if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });

    list.addEventListener('click', (e) => {
      const item = e.target.closest('[data-step]');
      if (item) engine.goto(parseInt(item.dataset.step, 10));
    });
  }

  /* ── Module ─────────────────────────────────────────────── */
  const mod = {
    id: 'merge',
    title: 'MERGE INTO',
    group: 'write-ops',
    _engine: null,

    render(container) {
      container.innerHTML = '';
      _injectStyles();

      const page = document.createElement('div');
      page.className = 'mrg-page page-enter';
      page.innerHTML = `
        <div class="mrg-outer">
          <div class="mrg-canvas" id="mrg-canvas"></div>
          <div class="mrg-sidebar">
            <div class="mrg-sidebar-header">
              <div class="mrg-sidebar-title" id="mrg-step-title">Press Play to begin</div>
              <div class="mrg-sidebar-desc" id="mrg-step-desc">Watch Iceberg MERGE INTO execute ShopKart's CDC upsert: 5,000 records, 4.1 second latency, zero duplicates.</div>
            </div>
            <div class="mrg-steps-list" id="mrg-steps-list"></div>
            <div class="mrg-code-panel">${_buildSQLPanel()}</div>
          </div>
        </div>
      `;
      container.appendChild(page);

      const svg       = _buildSVG();
      page.querySelector('#mrg-canvas').appendChild(svg);

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
      document.getElementById('mrg-styles')?.remove();
    },
  };

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.modules = window.IcebergViz.modules || {};
  window.IcebergViz.modules['merge'] = mod;
})();
