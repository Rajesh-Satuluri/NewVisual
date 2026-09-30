/* ============================================================
   Concurrency Module
   Animated 8-step walkthrough of Iceberg Optimistic
   Concurrency Control: two simultaneous writers, Writer B
   wins the first commit, Writer A detects the 409 conflict,
   analyses overlap, retries with refreshed base, and succeeds.
   ShopKart: bulk migration vs CDC streaming job.
   ============================================================ */

(function () {
  'use strict';

  const IV = window.IcebergViz;

  /* ── Styles ─────────────────────────────────────────────── */
  function _injectStyles() {
    if (document.getElementById('cc-styles')) return;
    const s = document.createElement('style');
    s.id = 'cc-styles';
    s.textContent = `
.cc-page { display:flex; flex-direction:column; height:100%; overflow:hidden; }

.cc-outer {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.cc-canvas {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: var(--bg-1);
  overflow: hidden;
  position: relative;
}

.cc-sidebar {
  width: 360px;
  border-left: 1px solid var(--border-default);
  background: var(--bg-2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.cc-sidebar-header {
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-default);
  flex-shrink: 0;
}

.cc-sidebar-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.cc-sidebar-desc {
  font-size: var(--text-xs);
  color: var(--text-secondary);
  line-height: 1.55;
  min-height: 52px;
}

.cc-steps-list {
  flex: 0 0 auto;
  overflow-y: auto;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-default);
  max-height: 260px;
}

.cc-step-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 7px 16px;
  cursor: pointer;
  transition: background 0.12s;
  border-left: 3px solid transparent;
}
.cc-step-item:hover { background: var(--bg-3); }
.cc-step-item.active { background: rgba(74,174,255,0.07); border-left-color: var(--blue); }
.cc-step-item.done { opacity: 0.6; }

.cc-step-badge {
  width: 20px; height: 20px;
  border-radius: 50%;
  background: var(--bg-4);
  color: var(--text-muted);
  font-size: 10px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-top: 1px;
  transition: background 0.12s, color 0.12s;
}
.cc-step-item.active .cc-step-badge { background: var(--blue); color: #fff; }
.cc-step-item.done .cc-step-badge   { background: var(--green); color: #fff; }

.cc-step-text { font-size: 12px; color: var(--text-secondary); line-height: 1.4; }
.cc-step-item.active .cc-step-text { color: var(--text-primary); font-weight: 500; }

.cc-info-panel {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.cc-info-label {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
  margin-top: 10px;
}

.cc-writer-card {
  background: var(--bg-3);
  border: 1px solid var(--border-default);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 6px;
}

.cc-writer-name { font-size: 11px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
.cc-writer-detail { font-size: 10.5px; color: var(--text-secondary); font-family: var(--font-mono); line-height: 1.5; }
.cc-writer-card.writer-a { border-color: rgba(88,166,255,0.4); background: rgba(88,166,255,0.05); }
.cc-writer-card.writer-b { border-color: rgba(86,211,100,0.4); background: rgba(86,211,100,0.05); }

.cc-rule-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 10.5px;
  margin-top: 4px;
}

.cc-rule-table th {
  background: var(--bg-4);
  color: var(--text-muted);
  font-size: 9.5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 5px 8px;
  text-align: left;
  border-bottom: 1px solid var(--border-default);
}

.cc-rule-table td {
  padding: 5px 8px;
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  vertical-align: top;
}

.cc-rule-table tr:last-child td { border-bottom: none; }
.cc-rule-table td:first-child { color: var(--text-primary); font-weight: 500; }
`;
    document.head.appendChild(s);
  }

  /* ── Step metadata ──────────────────────────────────────── */
  function _getStepDescs() {
    return [
      { label: 'Two Writers Start',
        desc: 'Optimistic concurrency: both writers start by reading the current snapshot. No locks taken. Writer A: bulk migration (45M rows). Writer B: CDC batch (5,000 rows).' },
      { label: 'Both Write Data Files to S3',
        desc: 'Data files are written to S3 before any metadata commit. Files in S3 are invisible to readers until a snapshot references them.' },
      { label: 'Writer B Finishes First',
        desc: 'Writer B is faster (1 file vs 356). B atomically swaps metadata.json from v12 to v13 using S3 conditional PUT (if-none-match: version-12-etag).' },
      { label: 'Writer A Attempts Commit',
        desc: 'Writer A\'s commit fails — it expected metadata.json to still be v12. S3\'s conditional PUT returns 409 Conflict. Writer A\'s 356 data files are already in S3 but still unreferenced.' },
      { label: 'Conflict Detection & Analysis',
        desc: 'Iceberg\'s conflict checker inspects what changed between v12→v13. B wrote to country=SG (Singapore) — A\'s partitions (BR, US, DE) are unaffected. Safe to retry.' },
      { label: 'Writer A Retries',
        desc: 'A re-reads the current snapshot (v13), re-checks its data files are still valid, and creates new manifests based on snapshot 6. A\'s 356 S3 files are reused — no re-write needed.' },
      { label: 'Writer A Commits',
        desc: 'A\'s retry succeeds: metadata.json atomically updated to v14. Snapshot 7 created, inheriting snapshot 6\'s manifests plus A\'s 3 new manifests.' },
      { label: 'Conflict Modes Reference',
        desc: 'Iceberg\'s conflict resolution strategy depends on the type of concurrent operation. Disjoint partition writes always retry successfully; schema conflicts always fail.' },
    ];
  }

  /* ── SVG ────────────────────────────────────────────────── */
  function _buildSVG() {
    const W = 880, H = 440;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.maxWidth = W + 'px';
    svg.style.maxHeight = H + 'px';
    svg.id = 'cc-svg';

    svg.innerHTML = `
<defs>
  <marker id="cc-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M0 0L10 5L0 10z" fill="#484f58"/>
  </marker>
  <marker id="cc-arr-blue" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M0 0L10 5L0 10z" fill="#58a6ff"/>
  </marker>
  <marker id="cc-arr-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M0 0L10 5L0 10z" fill="#56d364"/>
  </marker>
  <marker id="cc-arr-red" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M0 0L10 5L0 10z" fill="#f85149"/>
  </marker>
  <marker id="cc-arr-orange" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M0 0L10 5L0 10z" fill="#f0883e"/>
  </marker>
</defs>
<rect width="${W}" height="${H}" fill="#090d14"/>
<text x="12" y="14" font-family="system-ui" font-size="9" fill="rgba(139,148,158,0.4)" font-weight="600" letter-spacing="1">ShopKart Optimistic Concurrency — Bulk Migration vs CDC Streaming</text>

<!-- ═══ LANE LABELS ═══ -->
<text x="20" y="42" font-family="system-ui" font-size="10" font-weight="700" fill="rgba(88,166,255,0.7)">WRITER A — Bulk Migration (356 files)</text>
<text x="20" y="244" font-family="system-ui" font-size="10" font-weight="700" fill="rgba(86,211,100,0.7)">WRITER B — CDC Stream (1 file)</text>
<line x1="12" y1="220" x2="868" y2="220" stroke="#1c2128" stroke-width="1" stroke-dasharray="4 3"/>

<!-- ═══ WRITER A (top lane) ═══ -->
<g id="cc-wa-box">
  <rect x="12" y="50" width="180" height="70" rx="7" fill="#0d1f3c" stroke="#1f6feb" stroke-width="1.4"/>
  <text x="24" y="72" font-family="system-ui" font-size="11" font-weight="700" fill="#e6edf3">Writer A</text>
  <text x="24" y="87" font-family="ui-monospace" font-size="8.5" fill="rgba(88,166,255,0.7)">Reading metadata.json v12</text>
  <text x="24" y="100" font-family="ui-monospace" font-size="8.5" fill="rgba(88,166,255,0.7)">Snapshot 5 (base)</text>
  <text x="24" y="113" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,0.5)">45M rows · 356 files</text>
</g>
<rect id="cc-hl-wa" x="10" y="48" width="184" height="74" rx="8" fill="none" stroke="#58a6ff" stroke-width="2.5" opacity="0"/>

<!-- ═══ WRITER B (bottom lane) ═══ -->
<g id="cc-wb-box">
  <rect x="12" y="254" width="180" height="70" rx="7" fill="#0a1f10" stroke="#238636" stroke-width="1.4"/>
  <text x="24" y="276" font-family="system-ui" font-size="11" font-weight="700" fill="#e6edf3">Writer B</text>
  <text x="24" y="291" font-family="ui-monospace" font-size="8.5" fill="rgba(86,211,100,0.7)">Reading metadata.json v12</text>
  <text x="24" y="304" font-family="ui-monospace" font-size="8.5" fill="rgba(86,211,100,0.7)">Snapshot 5 (base)</text>
  <text x="24" y="317" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,0.5)">5,000 rows · 1 file</text>
</g>
<rect id="cc-hl-wb" x="10" y="252" width="184" height="74" rx="8" fill="none" stroke="#56d364" stroke-width="2.5" opacity="0"/>

<!-- ═══ CENTER: metadata.json ═══ -->
<g id="cc-meta-box">
  <rect x="370" y="140" width="200" height="68" rx="8" fill="#130a1a" stroke="#a371f7" stroke-width="1.8"/>
  <text x="386" y="162" font-family="system-ui" font-size="11" font-weight="700" fill="#e6edf3">metadata.json</text>
  <text id="cc-meta-version" x="386" y="178" font-family="ui-monospace" font-size="12" font-weight="700" fill="#a371f7">v12</text>
  <text x="386" y="193" font-family="ui-monospace" font-size="8.5" fill="rgba(163,113,247,0.6)">snapshot_id: 5</text>
</g>
<rect id="cc-hl-meta" x="368" y="138" width="204" height="72" rx="9" fill="none" stroke="#a371f7" stroke-width="2.5" opacity="0"/>

<!-- Version label overlays -->
<text id="cc-ver-v13" x="386" y="178" font-family="ui-monospace" font-size="12" font-weight="700" fill="#56d364" opacity="0">v13 (B committed)</text>
<text id="cc-ver-v14" x="386" y="178" font-family="ui-monospace" font-size="12" font-weight="700" fill="#58a6ff" opacity="0">v14 (A committed)</text>
<text id="cc-snap-6" x="386" y="193" font-family="ui-monospace" font-size="8.5" fill="rgba(86,211,100,0.6)" opacity="0">snapshot_id: 6</text>
<text id="cc-snap-7" x="386" y="193" font-family="ui-monospace" font-size="8.5" fill="rgba(88,166,255,0.6)" opacity="0">snapshot_id: 7</text>

<!-- ═══ S3 area (right) ═══ -->
<rect x="690" y="48" width="178" height="340" rx="7" fill="#0a1117" stroke="#30363d" stroke-width="1.2"/>
<text x="706" y="68" font-family="system-ui" font-size="9" font-weight="700" fill="rgba(139,148,158,0.6)">S3 Data Files</text>

<!-- Writer A files in S3 (initially hidden) -->
<g id="cc-wa-s3-files" opacity="0">
  <rect x="700" y="76" width="158" height="18" rx="3" fill="#0d1f3c" stroke="rgba(88,166,255,0.3)" stroke-width="1"/>
  <text x="712" y="89" font-family="ui-monospace" font-size="8" fill="rgba(88,166,255,0.8)">A: 356 Parquet files...</text>
  <rect x="700" y="98" width="158" height="18" rx="3" fill="#0d1f3c" stroke="rgba(88,166,255,0.2)" stroke-width="1"/>
  <text x="712" y="111" font-family="ui-monospace" font-size="8" fill="rgba(88,166,255,0.6)">country=BR/: 119 files</text>
  <rect x="700" y="120" width="158" height="18" rx="3" fill="#0d1f3c" stroke="rgba(88,166,255,0.2)" stroke-width="1"/>
  <text x="712" y="133" font-family="ui-monospace" font-size="8" fill="rgba(88,166,255,0.6)">country=US/: 119 files</text>
  <rect x="700" y="142" width="158" height="18" rx="3" fill="#0d1f3c" stroke="rgba(88,166,255,0.2)" stroke-width="1"/>
  <text x="712" y="155" font-family="ui-monospace" font-size="8" fill="rgba(88,166,255,0.6)">country=DE/: 118 files</text>
  <text x="779" y="178" text-anchor="middle" font-family="system-ui" font-size="8" fill="rgba(248,81,73,0.6)">unreferenced until</text>
  <text x="779" y="190" text-anchor="middle" font-family="system-ui" font-size="8" fill="rgba(248,81,73,0.6)">snapshot commits</text>
</g>

<!-- Writer B files in S3 -->
<g id="cc-wb-s3-files" opacity="0">
  <rect x="700" y="210" width="158" height="18" rx="3" fill="#0a1f10" stroke="rgba(86,211,100,0.3)" stroke-width="1"/>
  <text x="712" y="223" font-family="ui-monospace" font-size="8" fill="rgba(86,211,100,0.8)">B: 1 Parquet file</text>
  <rect x="700" y="232" width="158" height="18" rx="3" fill="#0a1f10" stroke="rgba(86,211,100,0.2)" stroke-width="1"/>
  <text x="712" y="245" font-family="ui-monospace" font-size="8" fill="rgba(86,211,100,0.6)">country=SG/: 1 file</text>
  <text x="779" y="268" text-anchor="middle" font-family="system-ui" font-size="8" fill="rgba(248,81,73,0.5)">unreferenced</text>
</g>

<!-- ═══ ARROWS ═══ -->
<!-- A reads metadata -->
<g id="cc-arr-a-reads" opacity="0">
  <line x1="192" y1="80" x2="368" y2="168" stroke="#58a6ff" stroke-width="1.5" marker-end="url(#cc-arr-blue)" stroke-dasharray="5 3"/>
  <text x="250" y="112" font-family="system-ui" font-size="8" fill="rgba(88,166,255,0.7)" transform="rotate(-18,250,112)">reads v12</text>
</g>

<!-- B reads metadata -->
<g id="cc-arr-b-reads" opacity="0">
  <line x1="192" y1="290" x2="368" y2="204" stroke="#56d364" stroke-width="1.5" marker-end="url(#cc-arr-green)" stroke-dasharray="5 3"/>
  <text x="250" y="260" font-family="system-ui" font-size="8" fill="rgba(86,211,100,0.7)" transform="rotate(18,250,260)">reads v12</text>
</g>

<!-- A writes to S3 -->
<g id="cc-arr-a-s3" opacity="0">
  <line x1="192" y1="82" x2="688" y2="115" stroke="#58a6ff" stroke-width="1.5" marker-end="url(#cc-arr-blue)" stroke-dasharray="4 3"/>
  <text x="430" y="86" font-family="system-ui" font-size="8" fill="rgba(88,166,255,0.6)">356 files → S3</text>
</g>

<!-- B writes to S3 -->
<g id="cc-arr-b-s3" opacity="0">
  <line x1="192" y1="286" x2="688" y2="236" stroke="#56d364" stroke-width="1.5" marker-end="url(#cc-arr-green)" stroke-dasharray="4 3"/>
  <text x="430" y="276" font-family="system-ui" font-size="8" fill="rgba(86,211,100,0.6)">1 file → S3</text>
</g>

<!-- B commits successfully -->
<g id="cc-arr-b-commit" opacity="0">
  <line x1="192" y1="284" x2="368" y2="205" stroke="#56d364" stroke-width="2" marker-end="url(#cc-arr-green)"/>
  <text x="250" y="262" font-family="system-ui" font-size="8.5" font-weight="700" fill="#56d364" transform="rotate(18,250,262)">PUT v12→v13 ✓</text>
</g>

<!-- A commit fails -->
<g id="cc-arr-a-fail" opacity="0">
  <line x1="192" y1="82" x2="368" y2="162" stroke="#f85149" stroke-width="2" marker-end="url(#cc-arr-red)"/>
  <rect x="248" y="96" width="100" height="22" rx="4" fill="rgba(248,81,73,0.15)" stroke="rgba(248,81,73,0.5)" stroke-width="1"/>
  <text x="298" y="108" text-anchor="middle" font-family="system-ui" font-size="8.5" font-weight="700" fill="#f85149">409 Conflict!</text>
  <text x="298" y="120" text-anchor="middle" font-family="system-ui" font-size="7.5" fill="rgba(248,81,73,0.8)">Expected v12, found v13</text>
</g>

<!-- A retries commit -->
<g id="cc-arr-a-retry" opacity="0">
  <line x1="192" y1="72" x2="368" y2="154" stroke="#58a6ff" stroke-width="2" marker-end="url(#cc-arr-blue)"/>
  <text x="250" y="96" font-family="system-ui" font-size="8" fill="rgba(88,166,255,0.8)" transform="rotate(-18,250,96)">re-reads v13</text>
</g>

<!-- A commits successfully -->
<g id="cc-arr-a-commit" opacity="0">
  <line x1="192" y1="72" x2="368" y2="154" stroke="#58a6ff" stroke-width="2" marker-end="url(#cc-arr-blue)"/>
  <rect x="220" y="88" width="108" height="22" rx="4" fill="rgba(88,166,255,0.1)" stroke="rgba(88,166,255,0.4)" stroke-width="1"/>
  <text x="274" y="100" text-anchor="middle" font-family="system-ui" font-size="8.5" font-weight="700" fill="#58a6ff">PUT v13→v14 ✓</text>
  <text x="274" y="112" text-anchor="middle" font-family="system-ui" font-size="7.5" fill="rgba(88,166,255,0.8)">Snapshot 7 live</text>
</g>

<!-- ═══ CONFLICT ANALYSIS BOX ═══ -->
<g id="cc-analysis-box" opacity="0">
  <rect x="200" y="285" width="450" height="120" rx="7" fill="#0d1117" stroke="#58a6ff" stroke-width="1.5"/>
  <text x="220" y="306" font-family="system-ui" font-size="9.5" font-weight="700" fill="#58a6ff">Conflict Analysis: v12 → v13</text>
  <text x="220" y="324" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.8)">Partition overlap?</text>
  <text x="220" y="338" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.8)">  A: country=BR, US, DE  ×  B: country=SG</text>
  <text x="560" y="338" text-anchor="end" font-family="ui-monospace" font-size="8.5" font-weight="700" fill="#56d364">No overlap ✓</text>
  <text x="220" y="354" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.8)">Schema change?</text>
  <text x="560" y="354" text-anchor="end" font-family="ui-monospace" font-size="8.5" font-weight="700" fill="#56d364">None ✓</text>
  <text x="220" y="370" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.8)">Delete conflict?</text>
  <text x="560" y="370" text-anchor="end" font-family="ui-monospace" font-size="8.5" font-weight="700" fill="#56d364">None ✓</text>
  <rect x="210" y="380" width="430" height="16" rx="3" fill="rgba(86,211,100,0.1)" stroke="rgba(86,211,100,0.3)" stroke-width="1"/>
  <text x="425" y="392" text-anchor="middle" font-family="system-ui" font-size="8.5" font-weight="700" fill="#56d364">→ RETRY safe — no conflict on touched data</text>
</g>

<!-- ═══ CONFLICT MODES TABLE (step 8) ═══ -->
<g id="cc-modes-table" opacity="0">
  <rect x="12" y="30" width="856" height="388" rx="8" fill="#0d1117" stroke="#30363d" stroke-width="1.2"/>
  <text x="28" y="56" font-family="system-ui" font-size="12" font-weight="700" fill="#e6edf3">Iceberg Conflict Resolution Reference</text>
  <!-- Table header -->
  <rect x="20" y="66" width="840" height="24" rx="4" fill="#1c2128"/>
  <text x="36" y="82" font-family="system-ui" font-size="9" font-weight="700" fill="rgba(139,148,158,0.8)" letter-spacing="0.03em">CONFLICT TYPE</text>
  <text x="316" y="82" font-family="system-ui" font-size="9" font-weight="700" fill="rgba(139,148,158,0.8)" letter-spacing="0.03em">DEFAULT BEHAVIOR</text>
  <text x="576" y="82" font-family="system-ui" font-size="9" font-weight="700" fill="rgba(139,148,158,0.8)" letter-spacing="0.03em">CONFIG OPTION</text>
  <!-- Row 1 -->
  <rect x="20" y="94" width="840" height="38" rx="3" fill="#161b22"/>
  <text x="36" y="110" font-family="system-ui" font-size="10" font-weight="600" fill="#e6edf3">Disjoint partition writes</text>
  <text x="36" y="124" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.6)">A writes BR/US/DE · B writes SG</text>
  <text x="316" y="117" font-family="system-ui" font-size="10" font-weight="600" fill="#56d364">Auto-retry succeeds</text>
  <text x="576" y="117" font-family="ui-monospace" font-size="9" fill="rgba(139,148,158,0.6)">—</text>
  <!-- Row 2 -->
  <rect x="20" y="136" width="840" height="38" rx="3" fill="#0d1117"/>
  <text x="36" y="152" font-family="system-ui" font-size="10" font-weight="600" fill="#e6edf3">Overlapping append writes</text>
  <text x="36" y="166" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.6)">Both writers add rows to same partition</text>
  <text x="316" y="152" font-family="system-ui" font-size="10" font-weight="600" fill="#56d364">Auto-retry succeeds</text>
  <text x="316" y="166" font-family="system-ui" font-size="8.5" fill="rgba(86,211,100,0.6)">(appends never conflict)</text>
  <text x="576" y="159" font-family="ui-monospace" font-size="9" fill="rgba(139,148,158,0.7)">commit.retry.num-retries</text>
  <!-- Row 3 -->
  <rect x="20" y="178" width="840" height="38" rx="3" fill="#161b22"/>
  <text x="36" y="194" font-family="system-ui" font-size="10" font-weight="600" fill="#e6edf3">Concurrent DELETE + write</text>
  <text x="36" y="208" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.6)">One writer deletes, another appends same files</text>
  <text x="316" y="194" font-family="system-ui" font-size="10" font-weight="600" fill="#e3b341">SERIALIZABLE check</text>
  <text x="316" y="208" font-family="system-ui" font-size="8.5" fill="rgba(227,179,65,0.6)">(may fail on overlap)</text>
  <text x="576" y="201" font-family="ui-monospace" font-size="9" fill="rgba(139,148,158,0.7)">write.delete.isolation-level</text>
  <!-- Row 4 -->
  <rect x="20" y="220" width="840" height="38" rx="3" fill="#0d1117"/>
  <text x="36" y="236" font-family="system-ui" font-size="10" font-weight="600" fill="#e6edf3">Schema change conflict</text>
  <text x="36" y="250" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.6)">Another writer added/renamed a column</text>
  <text x="316" y="243" font-family="system-ui" font-size="10" font-weight="600" fill="#f85149">Fail, user must refresh</text>
  <text x="576" y="243" font-family="ui-monospace" font-size="9" fill="rgba(139,148,158,0.6)">—</text>
  <!-- Row 5 -->
  <rect x="20" y="262" width="840" height="38" rx="3" fill="#161b22"/>
  <text x="36" y="278" font-family="system-ui" font-size="10" font-weight="600" fill="#e6edf3">Same-row UPDATE contention</text>
  <text x="36" y="292" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.6)">Two writers UPDATE the same row concurrently</text>
  <text x="316" y="278" font-family="system-ui" font-size="10" font-weight="600" fill="#e3b341">Last writer wins</text>
  <text x="316" y="292" font-family="system-ui" font-size="8.5" fill="rgba(227,179,65,0.6)">(no row-level locks)</text>
  <text x="576" y="285" font-family="ui-monospace" font-size="9" fill="rgba(139,148,158,0.7)">write.update.isolation-level</text>
  <!-- Row 6 -->
  <rect x="20" y="304" width="840" height="38" rx="3" fill="#0d1117"/>
  <text x="36" y="320" font-family="system-ui" font-size="10" font-weight="600" fill="#e6edf3">INSERT OVERWRITE partition overlap</text>
  <text x="36" y="334" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.6)">Two overwrite jobs touch same partition</text>
  <text x="316" y="320" font-family="system-ui" font-size="10" font-weight="600" fill="#f85149">Fail (serializable)</text>
  <text x="576" y="327" font-family="ui-monospace" font-size="9" fill="rgba(139,148,158,0.7)">write.overwrite.mode</text>
  <!-- Footer note -->
  <rect x="20" y="352" width="840" height="56" rx="5" fill="rgba(88,166,255,0.05)" stroke="rgba(88,166,255,0.15)" stroke-width="1"/>
  <text x="36" y="371" font-family="system-ui" font-size="9" font-weight="600" fill="rgba(88,166,255,0.8)">How retries work:</text>
  <text x="36" y="386" font-family="system-ui" font-size="8.5" fill="rgba(139,148,158,0.7)">1. Re-read current metadata.json  2. Re-validate your data files still valid  3. Rebuild manifests on top of new base snapshot</text>
  <text x="36" y="399" font-family="system-ui" font-size="8.5" fill="rgba(139,148,158,0.7)">4. Re-attempt conditional PUT.  Default: 4 retries (commit.retry.num-retries=4), exponential back-off.</text>
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
      if (glowColor === 'red')    el.style.filter = 'drop-shadow(0 0 8px rgba(248,81,73,0.8))';
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
    function setText(id, val) {
      const el = g(id);
      if (el) el.textContent = val;
    }

    return [
      AE.fnStep('Two Writers Start', '', () => {
        show('cc-hl-wa', 'blue');
        show('cc-hl-wb', 'green');
        show('cc-hl-meta', 'purple');
        show('cc-arr-a-reads');
        show('cc-arr-b-reads');
      }, () => {
        hide('cc-hl-wa'); hide('cc-hl-wb'); hide('cc-hl-meta');
        hide('cc-arr-a-reads'); hide('cc-arr-b-reads');
      }, 2800),

      AE.fnStep('Both Write Data Files to S3', '', () => {
        unglow('cc-hl-wa'); unglow('cc-hl-wb'); unglow('cc-hl-meta');
        hide('cc-arr-a-reads'); hide('cc-arr-b-reads');
        show('cc-arr-a-s3');
        show('cc-arr-b-s3');
        show('cc-wa-s3-files');
        show('cc-wb-s3-files');
      }, () => {
        hide('cc-arr-a-s3'); hide('cc-arr-b-s3');
      }, 3000),

      AE.fnStep('Writer B Finishes First', '', () => {
        hide('cc-arr-b-s3');
        show('cc-hl-wb', 'green');
        show('cc-arr-b-commit');
        // Update meta version text
        const versionEl = g('cc-meta-version');
        if (versionEl) { versionEl.setAttribute('opacity', '0'); }
        show('cc-ver-v13');
        show('cc-snap-6');
      }, () => {
        hide('cc-hl-wb'); hide('cc-arr-b-commit');
        const versionEl = g('cc-meta-version');
        if (versionEl) { versionEl.setAttribute('opacity', '1'); }
        hide('cc-ver-v13'); hide('cc-snap-6');
      }, 2800),

      AE.fnStep('Writer A Attempts Commit', '', () => {
        unglow('cc-hl-wb');
        show('cc-hl-wa', 'red');
        show('cc-arr-a-fail');
        hide('cc-arr-a-s3');
      }, () => {
        hide('cc-hl-wa');
        hide('cc-arr-a-fail');
      }, 3000),

      AE.fnStep('Conflict Detection & Analysis', '', () => {
        unglow('cc-hl-wa');
        hide('cc-arr-a-fail');
        show('cc-analysis-box');
      }, () => {
        hide('cc-analysis-box');
      }, 3200),

      AE.fnStep('Writer A Retries', '', () => {
        hide('cc-analysis-box');
        show('cc-hl-wa', 'blue');
        show('cc-arr-a-retry');
      }, () => {
        hide('cc-hl-wa');
        hide('cc-arr-a-retry');
      }, 2600),

      AE.fnStep('Writer A Commits', '', () => {
        unglow('cc-hl-wa');
        hide('cc-arr-a-retry');
        show('cc-hl-wa', 'green');
        show('cc-hl-meta', 'blue');
        show('cc-arr-a-commit');
        hide('cc-ver-v13');
        show('cc-ver-v14');
        hide('cc-snap-6');
        show('cc-snap-7');
      }, () => {
        hide('cc-hl-wa'); hide('cc-hl-meta');
        hide('cc-arr-a-commit');
        hide('cc-ver-v14'); hide('cc-snap-7');
        const versionEl = g('cc-meta-version');
        if (versionEl) { versionEl.setAttribute('opacity', '1'); }
      }, 3000),

      AE.fnStep('Conflict Modes Reference', '', () => {
        hide('cc-hl-wa'); hide('cc-hl-wb'); hide('cc-hl-meta');
        hide('cc-wa-s3-files'); hide('cc-wb-s3-files');
        hide('cc-ver-v14'); hide('cc-snap-7'); hide('cc-arr-a-commit');
        show('cc-modes-table');
      }, () => {
        hide('cc-modes-table');
        const versionEl = g('cc-meta-version');
        if (versionEl) { versionEl.setAttribute('opacity', '1'); }
      }, 5000),
    ];
  }

  /* ── Sidebar ────────────────────────────────────────────── */
  function _buildSidebar(page, engine, stepsData) {
    const list    = page.querySelector('#cc-steps-list');
    const titleEl = page.querySelector('#cc-step-title');
    const descEl  = page.querySelector('#cc-step-desc');
    if (!list) return;

    list.innerHTML = stepsData.map((s, i) => `
      <div class="cc-step-item" data-step="${i}">
        <div class="cc-step-badge">${i + 1}</div>
        <div class="cc-step-text">${s.label}</div>
      </div>
    `).join('');

    engine.on('stepchange', (idx) => {
      list.querySelectorAll('.cc-step-item').forEach((el, i) => {
        el.classList.toggle('active', i === idx);
        el.classList.toggle('done', i < idx);
      });
      const step = idx >= 0 ? stepsData[idx] : null;
      if (titleEl) titleEl.textContent = step ? step.label : 'Press Play to begin';
      if (descEl)  descEl.textContent  = step ? step.desc  : 'Watch two concurrent writers race to commit — Writer B wins, Writer A detects the conflict and retries successfully.';
      const active = list.querySelector('.cc-step-item.active');
      if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });

    list.addEventListener('click', (e) => {
      const item = e.target.closest('[data-step]');
      if (item) engine.goto(parseInt(item.dataset.step, 10));
    });
  }

  /* ── Module ─────────────────────────────────────────────── */
  const mod = {
    id: 'concurrency',
    title: 'Concurrency',
    group: 'advanced',
    _engine: null,

    render(container) {
      container.innerHTML = '';
      _injectStyles();

      const page = document.createElement('div');
      page.className = 'cc-page page-enter';
      page.innerHTML = `
        <div class="cc-outer">
          <div class="cc-canvas" id="cc-canvas"></div>
          <div class="cc-sidebar">
            <div class="cc-sidebar-header">
              <div class="cc-sidebar-title" id="cc-step-title">Press Play to begin</div>
              <div class="cc-sidebar-desc" id="cc-step-desc">Watch two concurrent writers race to commit — Writer B wins, Writer A detects the conflict and retries successfully.</div>
            </div>
            <div class="cc-steps-list" id="cc-steps-list"></div>
            <div class="cc-info-panel">
              <div class="cc-info-label">Writers</div>
              <div class="cc-writer-card writer-a">
                <div class="cc-writer-name">Writer A — Bulk Migration</div>
                <div class="cc-writer-detail">45M rows · 356 Parquet files
Partitions: BR, US, DE
Base snapshot: v12 / snap 5</div>
              </div>
              <div class="cc-writer-card writer-b">
                <div class="cc-writer-name">Writer B — CDC Streaming</div>
                <div class="cc-writer-detail">5,000 rows · 1 Parquet file
Partition: SG (Singapore)
Base snapshot: v12 / snap 5</div>
              </div>
              <div class="cc-info-label">OCC Guarantee</div>
              <div style="background:var(--bg-3);border:1px solid var(--border-default);border-radius:8px;padding:10px 12px;font-size:10.5px;color:var(--text-secondary);line-height:1.6">
                No distributed locks.<br>
                S3 conditional PUT atomically validates version.<br>
                Conflict detected at commit time only.<br>
                Disjoint writers always retry successfully.
              </div>
            </div>
          </div>
        </div>
      `;
      container.appendChild(page);

      const svg    = _buildSVG();
      page.querySelector('#cc-canvas').appendChild(svg);

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
      document.getElementById('cc-styles')?.remove();
    },
  };

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.modules = window.IcebergViz.modules || {};
  window.IcebergViz.modules['concurrency'] = mod;
})();
