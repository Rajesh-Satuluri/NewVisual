/* ============================================================
   Time Travel Module
   Animates ShopKart incident SK-2023-0412: bad DELETE recovered
   via time travel — 0 rows lost, 8.3 second recovery.
   ============================================================ */

(function () {
  'use strict';

  const IV = window.IcebergViz;

  /* ── Style injection ────────────────────────────────────── */
  function _injectStyles() {
    if (document.getElementById('tt-styles')) return;
    const s = document.createElement('style');
    s.id = 'tt-styles';
    s.textContent = `
.tt-page { display:flex; flex-direction:column; height:100%; overflow:hidden; }

.tt-outer {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.tt-canvas {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: var(--bg-1);
  overflow: hidden;
  position: relative;
}

.tt-sidebar {
  width: 360px;
  border-left: 1px solid var(--border-default);
  background: var(--bg-2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.tt-sidebar-header {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-default);
  flex-shrink: 0;
}

.tt-sidebar-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.tt-sidebar-desc {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  line-height: 1.5;
  min-height: 52px;
}

.tt-steps-list {
  flex: 0 0 auto;
  overflow-y: auto;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-default);
  max-height: 230px;
}

.tt-step-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 7px 16px;
  cursor: pointer;
  transition: background 0.12s;
  border-left: 3px solid transparent;
  margin-bottom: 1px;
}
.tt-step-item:hover { background: var(--bg-3); }
.tt-step-item.active {
  background: rgba(74,174,255,0.07);
  border-left-color: var(--blue);
}
.tt-step-item.done { opacity: 0.6; }

.tt-step-badge {
  width: 20px; height: 20px;
  border-radius: 50%;
  background: var(--bg-4);
  color: var(--text-muted);
  font-size: 10px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-top: 1px;
  transition: background 0.12s, color 0.12s;
}
.tt-step-item.active .tt-step-badge { background: var(--blue); color: #fff; }
.tt-step-item.done .tt-step-badge   { background: var(--green); color: #fff; }

.tt-step-text {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
}
.tt-step-item.active .tt-step-text { color: var(--text-primary); font-weight: 500; }

.tt-code-panel {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.tt-code-card {
  background: var(--bg-3);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 8px;
}

.tt-code-card-title {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: .04em;
  margin-bottom: 6px;
  font-weight: 600;
}

.tt-code-card pre {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-secondary);
  margin: 0;
  white-space: pre;
  overflow-x: auto;
  line-height: 1.6;
}

.tt-sql-keyword { color: var(--blue); font-weight: 600; }
.tt-sql-num     { color: var(--orange); }
.tt-sql-str     { color: var(--green); }
`;
    document.head.appendChild(s);
  }

  /* ── Step descriptions ──────────────────────────────────── */
  function _getStepDescs() {
    return [
      { label: 'Production State',     desc: 'ShopKart orders table: snapshot 5 (2024-01-15), 1.2 billion rows, 24,000 data files, 38.4 TB. All healthy.' },
      { label: 'Bad DELETE Runs',      desc: 'Engineer intended to delete test records. Missing AND status = \'TEST\' predicate deleted 2.1M real customer orders. Snapshot 5 is corrupted.' },
      { label: 'Time Travel Query',    desc: 'Using VERSION AS OF to verify snapshot 4 (pre-deletion) still has all rows. This reads snapshot 4\'s manifest list — snapshot 5\'s deletes are invisible.' },
      { label: 'Snapshot 4 Verified', desc: 'Confirmed: snapshot 4 contains all 1.2B orders. Iceberg never deleted the Parquet files — it only marked them as deleted in snapshot 5\'s manifest.' },
      { label: 'Rollback Command',     desc: 'Rolling back creates a NEW snapshot (6) that points to snapshot 4\'s manifest list. No data files are rewritten — it\'s a pure metadata operation.' },
      { label: 'Snapshot 6 Created',  desc: 'Snapshot 6 is the new HEAD. It inherits snapshot 4\'s manifest list. Snapshot 5 still exists and is browsable via time travel but is no longer active.' },
      { label: 'Recovery Complete',   desc: 'Full data recovery: 8.3 seconds. No ETL jobs, no backups, no data reprocessing. Iceberg\'s append-only metadata is production-critical infrastructure.' },
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
    svg.id = 'tt-svg';

    // Snapshot timeline positions
    // 5 original snapshots + space for snap 6
    const snaps = [
      { id: 1, x: 60,  label: 'Snap 1', date: '2023-11-15', rows: '980M',  color: '#1f6feb' },
      { id: 2, x: 180, label: 'Snap 2', date: '2023-12-01', rows: '1.05B', color: '#1f6feb' },
      { id: 3, x: 300, label: 'Snap 3', date: '2023-12-15', rows: '1.12B', color: '#1f6feb' },
      { id: 4, x: 420, label: 'Snap 4', date: '2024-01-01', rows: '1.2B',  color: '#1f6feb' },
      { id: 5, x: 540, label: 'Snap 5', date: '2024-01-15', rows: '1.2B',  color: '#f85149' },
    ];

    function snapCircle(snap, idSuffix) {
      return `
<g id="tt-snap${snap.id}${idSuffix || ''}">
  <circle cx="${snap.x}" cy="80" r="26" fill="#0d1117" stroke="${snap.color}" stroke-width="2"/>
  <text x="${snap.x}" y="76" text-anchor="middle" font-family="system-ui" font-size="10" font-weight="700" fill="${snap.color}">S${snap.id}</text>
  <text x="${snap.x}" y="89" text-anchor="middle" font-family="ui-monospace" font-size="7.5" fill="rgba(230,237,243,0.6)">${snap.rows}</text>
  <text x="${snap.x}" y="116" text-anchor="middle" font-family="system-ui" font-size="8.5" fill="rgba(139,148,158,0.5)">${snap.date}</text>
</g>`;
    }

    svg.innerHTML = `
<defs>
  <marker id="tt-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#484f58"/>
  </marker>
  <marker id="tt-arr-blue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#58a6ff"/>
  </marker>
  <marker id="tt-arr-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#56d364"/>
  </marker>
  <marker id="tt-arr-red" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#f85149"/>
  </marker>
</defs>

<rect width="${W}" height="${H}" fill="#090d14"/>
<text x="12" y="16" font-family="system-ui" font-size="9.5" fill="rgba(139,148,158,0.4)" font-weight="600" letter-spacing="1">ShopKart Time Travel — Incident SK-2023-0412 Recovery</text>

<!-- ═══ SNAPSHOT TIMELINE ═══ -->
<rect x="24" y="30" width="712" height="118" rx="10" fill="rgba(30,92,219,0.04)" stroke="rgba(30,92,219,0.2)" stroke-width="1.2"/>
<text x="38" y="50" font-family="system-ui" font-size="10" font-weight="600" fill="rgba(139,148,158,0.6)">Snapshot Timeline</text>

<!-- connector lines -->
<line x1="86" y1="80" x2="154" y2="80" stroke="#30363d" stroke-width="1.5"/>
<line x1="206" y1="80" x2="274" y2="80" stroke="#30363d" stroke-width="1.5"/>
<line x1="326" y1="80" x2="394" y2="80" stroke="#30363d" stroke-width="1.5"/>
<line x1="446" y1="80" x2="514" y2="80" stroke="#30363d" stroke-width="1.5"/>

<!-- snap 1–5 base circles -->
${snaps.map(s => snapCircle(s)).join('')}

<!-- "CURRENT" badge on snap5 by default -->
<g id="tt-current-badge">
  <rect x="513" y="52" width="56" height="16" rx="8" fill="#1f6feb" opacity="0.8"/>
  <text x="541" y="64" text-anchor="middle" font-family="system-ui" font-size="8.5" font-weight="700" fill="#fff">CURRENT</text>
</g>

<!-- Snap 5 red overlay (bad delete) -->
<g id="tt-snap5-red" opacity="0">
  <circle cx="540" cy="80" r="26" fill="rgba(248,81,73,0.15)" stroke="#f85149" stroke-width="2.5"/>
  <text x="540" y="76" text-anchor="middle" font-family="system-ui" font-size="10" font-weight="700" fill="#f85149">S5</text>
  <text x="540" y="89" text-anchor="middle" font-family="ui-monospace" font-size="7.5" fill="rgba(248,81,73,0.7)">-2.1M</text>
  <line x1="524" y1="64" x2="556" y2="96" stroke="#f85149" stroke-width="2"/>
  <line x1="556" y1="64" x2="524" y2="96" stroke="#f85149" stroke-width="2"/>
</g>

<!-- Snap 4 verified (green) overlay -->
<g id="tt-snap4-green" opacity="0">
  <circle cx="420" cy="80" r="28" fill="rgba(86,211,100,0.12)" stroke="#56d364" stroke-width="2.5"/>
  <text x="420" y="76" text-anchor="middle" font-family="system-ui" font-size="10" font-weight="700" fill="#56d364">S4</text>
  <text x="420" y="89" text-anchor="middle" font-family="ui-monospace" font-size="7.5" fill="#56d364">✓ 1.2B</text>
</g>

<!-- Snap 6 (new, appears at step 6) -->
<g id="tt-snap6" opacity="0">
  <!-- connector from snap5 area down and back up to snap6 -->
  <line x1="563" y1="80" x2="650" y2="80" stroke="#56d364" stroke-width="2" stroke-dasharray="5 3" marker-end="url(#tt-arr-green)"/>
  <circle cx="672" cy="80" r="26" fill="#0a1f10" stroke="#56d364" stroke-width="2"/>
  <text x="672" y="76" text-anchor="middle" font-family="system-ui" font-size="10" font-weight="700" fill="#56d364">S6</text>
  <text x="672" y="89" text-anchor="middle" font-family="ui-monospace" font-size="7.5" fill="#56d364">1.2B</text>
  <text x="672" y="116" text-anchor="middle" font-family="system-ui" font-size="8.5" fill="rgba(86,211,100,0.6)">2024-01-15</text>
  <rect x="644" y="52" width="56" height="16" rx="8" fill="#56d364" opacity="0.9"/>
  <text x="672" y="64" text-anchor="middle" font-family="system-ui" font-size="8.5" font-weight="700" fill="#fff">HEAD</text>
</g>

<!-- Snap 5 strikethrough at recovery complete -->
<g id="tt-snap5-strike" opacity="0">
  <line x1="520" y1="62" x2="560" y2="98" stroke="rgba(248,81,73,0.5)" stroke-width="3"/>
  <line x1="560" y1="62" x2="520" y2="98" stroke="rgba(248,81,73,0.5)" stroke-width="3"/>
  <text x="540" y="128" text-anchor="middle" font-family="system-ui" font-size="8" fill="rgba(248,81,73,0.5)">not HEAD</text>
</g>

<!-- ═══ BOTTOM PANELS ═══ -->

<!-- Current State panel -->
<g id="tt-current-state">
  <rect x="24" y="162" width="348" height="130" rx="8" fill="var(--bg-2)" stroke="var(--border-default)" stroke-width="1.2"/>
  <text x="40" y="182" font-family="system-ui" font-size="10.5" font-weight="700" fill="var(--text-secondary)">Current State</text>

  <!-- rows indicator -->
  <text x="40" y="204" font-family="system-ui" font-size="9.5" fill="rgba(139,148,158,0.7)">Row Count:</text>
  <text x="220" y="204" font-family="ui-monospace" font-size="11" font-weight="700" fill="#58a6ff" id="tt-row-count">1,200,000,000</text>

  <text x="40" y="222" font-family="system-ui" font-size="9.5" fill="rgba(139,148,158,0.7)">Data Files:</text>
  <text x="220" y="222" font-family="ui-monospace" font-size="11" font-weight="700" fill="var(--text-primary)">24,000</text>

  <text x="40" y="240" font-family="system-ui" font-size="9.5" fill="rgba(139,148,158,0.7)">Data Size:</text>
  <text x="220" y="240" font-family="ui-monospace" font-size="11" font-weight="700" fill="var(--text-primary)">38.4 TB</text>

  <text x="40" y="258" font-family="system-ui" font-size="9.5" fill="rgba(139,148,158,0.7)">Active Snapshot:</text>
  <text x="220" y="258" font-family="ui-monospace" font-size="9" font-weight="700" fill="#a371f7" id="tt-active-snap">3821904756</text>

  <text x="40" y="276" font-family="system-ui" font-size="9.5" fill="rgba(139,148,158,0.7)">Status:</text>
  <text x="220" y="276" font-family="ui-monospace" font-size="11" font-weight="700" fill="#56d364" id="tt-status">HEALTHY</text>
</g>

<!-- Warning banner (bad delete step) -->
<g id="tt-warning-banner" opacity="0">
  <rect x="24" y="300" width="348" height="44" rx="6" fill="rgba(248,81,73,0.12)" stroke="#f85149" stroke-width="1.5"/>
  <text x="38" y="320" font-family="system-ui" font-size="10.5" font-weight="700" fill="#f85149">⚠ 2.1M orders accidentally deleted!</text>
  <text x="38" y="336" font-family="system-ui" font-size="9" fill="rgba(248,81,73,0.7)">WHERE predicate too broad — missed AND status='TEST'</text>
</g>

<!-- Recovery Log panel -->
<g id="tt-recovery-panel">
  <rect x="388" y="162" width="348" height="270" rx="8" fill="var(--bg-2)" stroke="var(--border-default)" stroke-width="1.2"/>
  <text x="404" y="182" font-family="system-ui" font-size="10.5" font-weight="700" fill="var(--text-secondary)">Recovery Log</text>

  <!-- step entries that appear progressively -->
  <g id="tt-log-s1" opacity="0">
    <text x="404" y="206" font-family="ui-monospace" font-size="9" fill="rgba(88,166,255,0.7)">▶ Incident detected: row count mismatch</text>
  </g>
  <g id="tt-log-s2" opacity="0">
    <text x="404" y="222" font-family="ui-monospace" font-size="9" fill="rgba(248,81,73,0.8)">✗ DELETE without status='TEST' predicate</text>
  </g>
  <g id="tt-log-s3" opacity="0">
    <text x="404" y="238" font-family="ui-monospace" font-size="9" fill="rgba(88,166,255,0.7)">▶ Querying VERSION AS OF 3821904756…</text>
  </g>
  <g id="tt-log-s4" opacity="0">
    <text x="404" y="254" font-family="ui-monospace" font-size="9" fill="rgba(86,211,100,0.8)">✓ Snapshot 4 intact: 1,200,000,000 rows</text>
  </g>
  <g id="tt-log-s5" opacity="0">
    <text x="404" y="270" font-family="ui-monospace" font-size="9" fill="rgba(88,166,255,0.7)">▶ CALL system.rollback_to_snapshot(…)</text>
    <text x="404" y="284" font-family="ui-monospace" font-size="9" fill="rgba(139,148,158,0.5)">  Pure metadata — no data files rewritten</text>
  </g>
  <g id="tt-log-s6" opacity="0">
    <text x="404" y="302" font-family="ui-monospace" font-size="9" fill="rgba(86,211,100,0.8)">✓ Snapshot 6 created (new HEAD)</text>
    <text x="404" y="316" font-family="ui-monospace" font-size="9" fill="rgba(139,148,158,0.5)">  Points to S4 manifest list</text>
  </g>
  <g id="tt-log-s7" opacity="0">
    <rect x="392" y="328" width="336" height="56" rx="6" fill="rgba(86,211,100,0.08)" stroke="#56d364" stroke-width="1.2"/>
    <text x="404" y="348" font-family="system-ui" font-size="11" font-weight="700" fill="#56d364">✓ Recovery Complete</text>
    <text x="404" y="364" font-family="system-ui" font-size="9.5" fill="rgba(86,211,100,0.7)">0 rows lost · Recovery time: 8.3 seconds</text>
    <text x="404" y="378" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.5)">No ETL · No backup restore · No reprocessing</text>
  </g>
</g>

<!-- Time travel arrow indicator (step 3) -->
<g id="tt-travel-arrow" opacity="0">
  <path d="M 540,106 Q 540,148 420,148 Q 300,148 300,118" stroke="#58a6ff" stroke-width="2" fill="none" stroke-dasharray="6 3" marker-end="url(#tt-arr-blue)"/>
  <rect x="418" y="130" width="122" height="20" rx="4" fill="rgba(88,166,255,0.1)" stroke="#58a6ff" stroke-width="1"/>
  <text x="479" y="144" text-anchor="middle" font-family="system-ui" font-size="8.5" fill="#58a6ff">VERSION AS OF S4</text>
</g>

<!-- Rollback arrow (step 5) -->
<g id="tt-rollback-arrow" opacity="0">
  <path d="M 420,108 Q 420,150 480,152 Q 570,152 600,108" stroke="#56d364" stroke-width="2" fill="none" stroke-dasharray="6 3" marker-end="url(#tt-arr-green)"/>
  <text x="510" y="148" text-anchor="middle" font-family="system-ui" font-size="8.5" fill="#56d364">rollback → new S6</text>
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
      if (glowColor === 'red')    el.style.filter = 'drop-shadow(0 0 8px rgba(248,81,73,0.7))';
    }
    function hide(id) {
      const el = g(id);
      if (el) { el.setAttribute('opacity', '0'); el.style.filter = ''; }
    }
    function setText(id, text, color) {
      const el = g(id);
      if (el) {
        el.textContent = text;
        if (color) el.setAttribute('fill', color);
      }
    }

    return [
      AE.fnStep('Production State', '', (ctx) => {
        show('tt-current-badge');
      }, (ctx) => {
        hide('tt-current-badge');
      }, 2500),

      AE.fnStep('Bad DELETE Runs', '', (ctx) => {
        show('tt-snap5-red', 'red');
        show('tt-warning-banner');
        hide('tt-current-badge');
        const statusEl = svg.getElementById('tt-status');
        if (statusEl) { statusEl.textContent = 'CORRUPTED'; statusEl.setAttribute('fill', '#f85149'); }
        const rowEl = svg.getElementById('tt-row-count');
        if (rowEl) { rowEl.textContent = '1,197,900,000'; rowEl.setAttribute('fill', '#f85149'); }
        show('tt-log-s1');
        show('tt-log-s2');
      }, (ctx) => {
        hide('tt-snap5-red');
        hide('tt-warning-banner');
        hide('tt-log-s1');
        hide('tt-log-s2');
        const statusEl = svg.getElementById('tt-status');
        if (statusEl) { statusEl.textContent = 'HEALTHY'; statusEl.setAttribute('fill', '#56d364'); }
        const rowEl = svg.getElementById('tt-row-count');
        if (rowEl) { rowEl.textContent = '1,200,000,000'; rowEl.setAttribute('fill', '#58a6ff'); }
      }, 3000),

      AE.fnStep('Time Travel Query', '', (ctx) => {
        show('tt-travel-arrow', 'blue');
        show('tt-log-s3');
      }, (ctx) => {
        hide('tt-travel-arrow');
        hide('tt-log-s3');
      }, 2800),

      AE.fnStep('Snapshot 4 Verified', '', (ctx) => {
        hide('tt-travel-arrow');
        show('tt-snap4-green', 'green');
        show('tt-log-s4');
      }, (ctx) => {
        hide('tt-snap4-green');
        hide('tt-log-s4');
      }, 2800),

      AE.fnStep('Rollback Command', '', (ctx) => {
        show('tt-rollback-arrow', 'green');
        show('tt-log-s5');
      }, (ctx) => {
        hide('tt-rollback-arrow');
        hide('tt-log-s5');
      }, 3000),

      AE.fnStep('Snapshot 6 Created', '', (ctx) => {
        hide('tt-rollback-arrow');
        show('tt-snap6', 'green');
        show('tt-snap5-strike');
        show('tt-log-s6');
      }, (ctx) => {
        hide('tt-snap6');
        hide('tt-snap5-strike');
        hide('tt-log-s6');
      }, 3000),

      AE.fnStep('Recovery Complete', '', (ctx) => {
        show('tt-log-s7', 'green');
        const statusEl = svg.getElementById('tt-status');
        if (statusEl) { statusEl.textContent = 'RECOVERED ✓'; statusEl.setAttribute('fill', '#56d364'); }
        const rowEl = svg.getElementById('tt-row-count');
        if (rowEl) { rowEl.textContent = '1,200,000,000'; rowEl.setAttribute('fill', '#56d364'); }
        const snapEl = svg.getElementById('tt-active-snap');
        if (snapEl) { snapEl.textContent = 'new-snap-6'; snapEl.setAttribute('fill', '#56d364'); }
      }, (ctx) => {
        hide('tt-log-s7');
        const statusEl = svg.getElementById('tt-status');
        if (statusEl) { statusEl.textContent = 'HEALTHY'; statusEl.setAttribute('fill', '#56d364'); }
        const snapEl = svg.getElementById('tt-active-snap');
        if (snapEl) { snapEl.textContent = '3821904756'; snapEl.setAttribute('fill', '#a371f7'); }
      }, 4000),
    ];
  }

  /* ── Sidebar code cards ─────────────────────────────────── */
  function _buildCodeCards() {
    return `
      <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;font-weight:600;">SQL Reference</div>

      <div class="tt-code-card">
        <div class="tt-code-card-title">VERSION AS OF (snapshot id)</div>
        <pre><span class="tt-sql-keyword">SELECT</span> COUNT(*)
<span class="tt-sql-keyword">FROM</span> orders
<span class="tt-sql-keyword">VERSION AS OF</span> <span class="tt-sql-num">3821904756</span></pre>
      </div>

      <div class="tt-code-card">
        <div class="tt-code-card-title">TIMESTAMP AS OF</div>
        <pre><span class="tt-sql-keyword">SELECT</span> COUNT(*)
<span class="tt-sql-keyword">FROM</span> orders
<span class="tt-sql-keyword">TIMESTAMP AS OF</span>
  <span class="tt-sql-str">'2024-01-14 23:59:59'</span></pre>
      </div>

      <div class="tt-code-card">
        <div class="tt-code-card-title">ROLLBACK_TO_SNAPSHOT</div>
        <pre><span class="tt-sql-keyword">CALL</span> system.rollback_to_snapshot(
  <span class="tt-sql-str">'prod.orders'</span>,
  <span class="tt-sql-num">3821904756</span>
)</pre>
      </div>

      <div class="tt-code-card">
        <div class="tt-code-card-title">Bad DELETE (the mistake)</div>
        <pre><span class="tt-sql-keyword">DELETE FROM</span> orders
<span class="tt-sql-keyword">WHERE</span> order_date &lt; <span class="tt-sql-str">'2023-12-31'</span>
  <span class="tt-sql-keyword">AND</span> status != <span class="tt-sql-str">'COMPLETED'</span>
<span style="color:var(--red)">-- Missing: AND status = 'TEST'</span></pre>
      </div>
    `;
  }

  /* ── Sidebar wiring ─────────────────────────────────────── */
  function _buildSidebar(page, engine, stepsData) {
    const list    = page.querySelector('#tt-steps-list');
    const titleEl = page.querySelector('#tt-step-title');
    const descEl  = page.querySelector('#tt-step-desc');
    if (!list) return;

    list.innerHTML = stepsData.map((s, i) => `
      <div class="tt-step-item" data-step="${i}">
        <div class="tt-step-badge">${i + 1}</div>
        <div class="tt-step-text">${s.label}</div>
      </div>
    `).join('');

    engine.on('stepchange', (idx) => {
      list.querySelectorAll('.tt-step-item').forEach((el, i) => {
        el.classList.toggle('active', i === idx);
        el.classList.toggle('done', i < idx);
      });
      const step = idx >= 0 ? stepsData[idx] : null;
      if (titleEl) titleEl.textContent = step ? step.label : 'Press Play to begin';
      if (descEl)  descEl.textContent  = step ? step.desc  : 'Watch ShopKart recover from incident SK-2023-0412 using Iceberg time travel — no data lost, 8.3 second recovery.';
      const active = list.querySelector('.tt-step-item.active');
      if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });

    list.addEventListener('click', (e) => {
      const item = e.target.closest('[data-step]');
      if (item) engine.goto(parseInt(item.dataset.step, 10));
    });
  }

  /* ── Module ─────────────────────────────────────────────── */
  const mod = {
    id: 'time-travel',
    title: 'Time Travel',
    group: 'read-ops',
    _engine: null,

    render(container) {
      container.innerHTML = '';
      _injectStyles();

      const page = document.createElement('div');
      page.className = 'tt-page page-enter';
      page.innerHTML = `
        <div class="tt-outer">
          <div class="tt-canvas" id="tt-canvas"></div>
          <div class="tt-sidebar">
            <div class="tt-sidebar-header">
              <div class="tt-sidebar-title" id="tt-step-title">Press Play to begin</div>
              <div class="tt-sidebar-desc" id="tt-step-desc">Watch ShopKart recover from a bad DELETE using Iceberg time travel — no data lost, 8.3 second recovery.</div>
            </div>
            <div class="tt-steps-list" id="tt-steps-list"></div>
            <div class="tt-code-panel" id="tt-code-panel">
              ${_buildCodeCards()}
            </div>
          </div>
        </div>
      `;
      container.appendChild(page);

      const svg       = _buildSVG();
      page.querySelector('#tt-canvas').appendChild(svg);

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
      document.getElementById('tt-styles')?.remove();
    },
  };

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.modules = window.IcebergViz.modules || {};
  window.IcebergViz.modules['time-travel'] = mod;
})();
