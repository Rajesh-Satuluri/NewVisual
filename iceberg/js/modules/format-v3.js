/* ============================================================
   Spec v3 & Deletion Vectors Module
   Animates what changes from Iceberg format-version 2 → 3, with
   the headline feature front and centre: deletion vectors replace
   positional delete FILES (many small .avro / row) with ONE
   roaring-bitmap vector per data file (Puffin-backed). Also covers
   row lineage and the other v3 additions. ShopKart context.
   ============================================================ */

(function () {
  'use strict';

  const IV = window.IcebergViz;

  /* ── Style injection ────────────────────────────────────── */
  function _injectStyles() {
    if (document.getElementById('v3-styles')) return;
    const s = document.createElement('style');
    s.id = 'v3-styles';
    s.textContent = `
.v3-page { display:flex; flex-direction:column; height:100%; overflow:hidden; }

.v3-outer { display:flex; flex:1; overflow:hidden; min-height:0; }

.v3-canvas {
  flex:1; display:flex; align-items:center; justify-content:center;
  padding:16px; background:var(--bg-1); overflow:hidden; position:relative;
}

.v3-sidebar {
  width:360px; border-left:1px solid var(--border-default);
  background:var(--bg-2); display:flex; flex-direction:column;
  overflow:hidden; flex-shrink:0;
}
.v3-sidebar-header { padding:14px 18px; border-bottom:1px solid var(--border-default); flex-shrink:0; }
.v3-sidebar-title { font-size:var(--text-sm); font-weight:600; color:var(--text-primary); margin-bottom:4px; }
.v3-sidebar-desc { font-size:var(--text-xs); color:var(--text-secondary); line-height:1.5; min-height:52px; }

.v3-steps-list {
  flex:0 0 auto; overflow-y:auto; padding:6px 0;
  border-bottom:1px solid var(--border-default); max-height:220px;
}
.v3-step-item {
  display:flex; align-items:flex-start; gap:10px; padding:7px 16px;
  cursor:pointer; transition:background .12s; border-left:3px solid transparent; margin-bottom:1px;
}
.v3-step-item:hover { background:var(--bg-3); }
.v3-step-item.active { background:rgba(74,174,255,0.07); border-left-color:var(--blue); }
.v3-step-item.done { opacity:0.6; }
.v3-step-badge {
  width:20px; height:20px; border-radius:50%; background:var(--bg-4);
  color:var(--text-muted); font-size:10px; font-weight:700;
  display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:1px;
  transition:background .12s, color .12s;
}
.v3-step-item.active .v3-step-badge { background:var(--blue); color:#fff; }
.v3-step-item.done .v3-step-badge { background:var(--green); color:#fff; }
.v3-step-text { font-size:12px; color:var(--text-secondary); line-height:1.4; }
.v3-step-item.active .v3-step-text { color:var(--text-primary); font-weight:500; }

.v3-info { flex:1; overflow-y:auto; padding:12px; }
.v3-info-label { font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:.05em; margin:0 0 8px; }

.v3-cmp { width:100%; border-collapse:collapse; margin-bottom:14px; }
.v3-cmp th, .v3-cmp td {
  text-align:left; padding:6px 8px; font-size:11px;
  border-bottom:1px solid var(--border-subtle); vertical-align:top;
}
.v3-cmp th { color:var(--text-muted); font-weight:700; text-transform:uppercase; letter-spacing:.04em; font-size:9.5px; }
.v3-cmp td:first-child { color:var(--text-secondary); }
.v3-cmp .v3-v2 { color:var(--orange); font-family:var(--font-mono); font-size:10.5px; }
.v3-cmp .v3-v3 { color:var(--green); font-family:var(--font-mono); font-size:10.5px; }

.v3-note {
  font-size:11.5px; color:var(--text-secondary); background:rgba(240,136,62,.07);
  border-left:3px solid var(--orange); border-radius:0 6px 6px 0;
  padding:8px 11px; line-height:1.55;
}
.v3-note strong { color:var(--orange); }
`;
    document.head.appendChild(s);
  }

  /* ── Step descriptions (sidebar) ────────────────────────── */
  function _getStepDescs() {
    return [
      { label: 'The Data File', desc: 'Start with one Parquet data file of 8 order rows. A Merge-on-Read DELETE must mark some rows removed without rewriting this file.' },
      { label: 'v2: Positional Delete Files', desc: 'In format-version 2, each MoR delete writes a separate positional delete file (file_path + row position). Three deletes over time = three small .avro files piling up.' },
      { label: 'v2 Read: Merge Many Files', desc: 'A reader must open the data file AND every delete file and merge them. High-churn tables accumulate thousands of tiny delete files — the small-file problem, on the delete side.' },
      { label: 'v3: Deletion Vector', desc: 'format-version 3 replaces those files with ONE deletion vector per data file — a compressed roaring bitmap of deleted positions, stored in a Puffin file and updated in place.' },
      { label: 'v3 Read: One Bitmap', desc: 'The reader applies a single bitmap instead of merging N delete files. Far fewer files, faster planning and scans, and deletes stay compact as churn grows.' },
      { label: 'Row Lineage', desc: 'v3 adds row lineage: every row carries a stable _row_id and a _last_updated_sequence_number. That makes incremental processing and change tracking cheap without diffing snapshots.' },
      { label: 'More in v3', desc: 'Also new: the variant type (semi-structured JSON), geometry/geography types, nanosecond timestamps, and default column values. Adopt v3 only when every engine that touches the table supports it.' },
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
    svg.id = 'v3-svg';

    // 8 row tiles inside the data file
    let rows = '';
    for (let i = 0; i < 8; i++) {
      rows += `<g id="v3-row-${i}">
        <rect x="40" y="${175 + i * 17}" width="140" height="13" rx="2" fill="rgba(88,166,255,0.18)" stroke="rgba(88,166,255,0.4)" stroke-width="0.7"/>
        <text x="46" y="${185 + i * 17}" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,0.8)">order ${9001 + i}</text>
        <line id="v3-strike-${i}" x1="42" y1="${181 + i * 17}" x2="178" y2="${181 + i * 17}" stroke="#f85149" stroke-width="1.4" opacity="0"/>
      </g>`;
    }

    svg.innerHTML = `
<defs>
  <marker id="v3-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#484f58"/>
  </marker>
  <marker id="v3-arr-orange" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#f0883e"/>
  </marker>
  <marker id="v3-arr-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#56d364"/>
  </marker>
</defs>

<rect width="${W}" height="${H}" fill="#090d14"/>
<text x="12" y="16" font-family="system-ui" font-size="9.5" fill="rgba(139,148,158,0.4)" font-weight="600" letter-spacing="1">ShopKart — Iceberg format-version 2 → 3 (deletion vectors)</text>

<!-- lane divider -->
<line x1="230" y1="248" x2="788" y2="248" stroke="#21262d" stroke-width="1" stroke-dasharray="3 4"/>
<text x="240" y="70" font-family="system-ui" font-size="10" font-weight="700" fill="#f0883e">v2 — positional delete files</text>
<text x="240" y="286" font-family="system-ui" font-size="10" font-weight="700" fill="#56d364">v3 — deletion vector (one bitmap / file)</text>

<!-- ═══ Shared data file (left) ═══ -->
<g id="v3-datafile">
  <rect x="24" y="150" width="172" height="178" rx="8" fill="#0d1117" stroke="#58a6ff" stroke-width="1.5"/>
  <text x="40" y="167" font-family="system-ui" font-size="10" font-weight="700" fill="#e6edf3">orders-t0.parquet</text>
  ${rows}
</g>
<rect id="v3-hl-datafile" x="22" y="148" width="176" height="182" rx="9" fill="none" stroke="#58a6ff" stroke-width="2.4" opacity="0"/>

<!-- ═══ v2 lane: positional delete files ═══ -->
<g id="v3-del-1" opacity="0">
  <rect x="300" y="86" width="80" height="46" rx="6" fill="#1a1a10" stroke="#e3b341" stroke-width="1.2"/>
  <text x="340" y="104" text-anchor="middle" font-family="ui-monospace" font-size="8.5" font-weight="700" fill="#e3b341">del-1.avro</text>
  <text x="340" y="118" text-anchor="middle" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,0.75)">pos: 2</text>
</g>
<g id="v3-del-2" opacity="0">
  <rect x="392" y="86" width="80" height="46" rx="6" fill="#1a1a10" stroke="#e3b341" stroke-width="1.2"/>
  <text x="432" y="104" text-anchor="middle" font-family="ui-monospace" font-size="8.5" font-weight="700" fill="#e3b341">del-2.avro</text>
  <text x="432" y="118" text-anchor="middle" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,0.75)">pos: 5</text>
</g>
<g id="v3-del-3" opacity="0">
  <rect x="484" y="86" width="80" height="46" rx="6" fill="#1a1a10" stroke="#e3b341" stroke-width="1.2"/>
  <text x="524" y="104" text-anchor="middle" font-family="ui-monospace" font-size="8.5" font-weight="700" fill="#e3b341">del-3.avro</text>
  <text x="524" y="118" text-anchor="middle" font-family="ui-monospace" font-size="8" fill="rgba(139,148,158,0.75)">pos: 6</text>
</g>
<g id="v3-del-more" opacity="0">
  <text x="576" y="112" font-family="ui-monospace" font-size="9" fill="rgba(248,81,73,0.8)">… thousands</text>
  <text x="576" y="124" font-family="system-ui" font-size="8" fill="rgba(139,148,158,0.6)">small-file churn</text>
</g>
<line id="v3-a-df-del" x1="196" y1="150" x2="300" y2="108" stroke="#484f58" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#v3-arr)" opacity="0"/>

<g id="v3-v2read" opacity="0">
  <rect x="600" y="80" width="186" height="90" rx="8" fill="#1a1012" stroke="#f0883e" stroke-width="1.4"/>
  <text x="616" y="102" font-family="system-ui" font-size="10" font-weight="700" fill="#f0883e">Read (v2)</text>
  <text x="616" y="120" font-family="ui-monospace" font-size="8.5" fill="rgba(230,237,243,0.85)">open data file</text>
  <text x="616" y="133" font-family="ui-monospace" font-size="8.5" fill="rgba(230,237,243,0.85)">+ merge N delete files</text>
  <text x="616" y="151" font-family="system-ui" font-size="8.5" fill="rgba(248,81,73,0.85)">N grows with churn →</text>
  <text x="616" y="163" font-family="system-ui" font-size="8.5" fill="rgba(248,81,73,0.85)">slower planning &amp; scans</text>
</g>
<line id="v3-a-del-read" x1="564" y1="112" x2="598" y2="120" stroke="#f0883e" stroke-width="1.5" marker-end="url(#v3-arr-orange)" opacity="0"/>

<!-- ═══ v3 lane: deletion vector ═══ -->
<g id="v3-dv" opacity="0">
  <rect x="300" y="300" width="248" height="80" rx="8" fill="#0a1f10" stroke="#56d364" stroke-width="1.5"/>
  <text x="316" y="320" font-family="system-ui" font-size="10" font-weight="700" fill="#56d364">deletion vector</text>
  <text x="316" y="335" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.8)">roaring bitmap · Puffin file</text>
  <!-- bitmap cells -->
  <g font-family="ui-monospace" font-size="9" font-weight="700">
    <rect x="316" y="344" width="16" height="16" rx="2" fill="rgba(139,148,158,0.12)"/><text x="324" y="356" text-anchor="middle" fill="rgba(139,148,158,0.6)">0</text>
    <rect x="336" y="344" width="16" height="16" rx="2" fill="rgba(139,148,158,0.12)"/><text x="344" y="356" text-anchor="middle" fill="rgba(139,148,158,0.6)">0</text>
    <rect x="356" y="344" width="16" height="16" rx="2" fill="rgba(248,81,73,0.35)"/><text x="364" y="356" text-anchor="middle" fill="#f85149">1</text>
    <rect x="376" y="344" width="16" height="16" rx="2" fill="rgba(139,148,158,0.12)"/><text x="384" y="356" text-anchor="middle" fill="rgba(139,148,158,0.6)">0</text>
    <rect x="396" y="344" width="16" height="16" rx="2" fill="rgba(139,148,158,0.12)"/><text x="404" y="356" text-anchor="middle" fill="rgba(139,148,158,0.6)">0</text>
    <rect x="416" y="344" width="16" height="16" rx="2" fill="rgba(248,81,73,0.35)"/><text x="424" y="356" text-anchor="middle" fill="#f85149">1</text>
    <rect x="436" y="344" width="16" height="16" rx="2" fill="rgba(248,81,73,0.35)"/><text x="444" y="356" text-anchor="middle" fill="#f85149">1</text>
    <rect x="456" y="344" width="16" height="16" rx="2" fill="rgba(139,148,158,0.12)"/><text x="464" y="356" text-anchor="middle" fill="rgba(139,148,158,0.6)">0</text>
  </g>
  <text x="482" y="356" font-family="ui-monospace" font-size="8" fill="rgba(86,211,100,0.85)">{2,5,6}</text>
</g>
<line id="v3-a-df-dv" x1="150" y1="328" x2="298" y2="336" stroke="#484f58" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#v3-arr)" opacity="0"/>

<g id="v3-v3read" opacity="0">
  <rect x="600" y="300" width="186" height="80" rx="8" fill="#0a1f10" stroke="#56d364" stroke-width="1.4"/>
  <text x="616" y="322" font-family="system-ui" font-size="10" font-weight="700" fill="#56d364">Read (v3)</text>
  <text x="616" y="340" font-family="ui-monospace" font-size="8.5" fill="rgba(230,237,243,0.85)">open data file</text>
  <text x="616" y="353" font-family="ui-monospace" font-size="8.5" fill="rgba(230,237,243,0.85)">+ apply 1 bitmap</text>
  <text x="616" y="371" font-family="system-ui" font-size="8.5" font-weight="700" fill="#56d364">fewer files · faster ⚡</text>
</g>
<line id="v3-a-dv-read" x1="548" y1="336" x2="598" y2="338" stroke="#56d364" stroke-width="1.5" marker-end="url(#v3-arr-green)" opacity="0"/>

<!-- ═══ Row lineage overlay (step 6) ═══ -->
<g id="v3-lineage" opacity="0">
  <rect x="210" y="150" width="210" height="90" rx="8" fill="rgba(163,113,247,0.08)" stroke="#a371f7" stroke-width="1.3"/>
  <text x="224" y="170" font-family="system-ui" font-size="10" font-weight="700" fill="#a371f7">Row lineage (v3)</text>
  <text x="224" y="188" font-family="ui-monospace" font-size="8.5" fill="rgba(230,237,243,0.85)">_row_id</text>
  <text x="224" y="202" font-family="ui-monospace" font-size="8.5" fill="rgba(230,237,243,0.85)">_last_updated_sequence_number</text>
  <text x="224" y="222" font-family="system-ui" font-size="8.5" fill="rgba(139,148,158,0.8)">stable per-row identity →</text>
  <text x="224" y="234" font-family="system-ui" font-size="8.5" fill="rgba(139,148,158,0.8)">cheap change tracking / dedup</text>
</g>

<!-- ═══ More-in-v3 overlay (step 7) ═══ -->
<g id="v3-more" opacity="0">
  <rect x="228" y="150" width="558" height="176" rx="10" fill="#0d1117" stroke="#a371f7" stroke-width="1.6"/>
  <text x="248" y="176" font-family="system-ui" font-size="12" font-weight="700" fill="#a371f7">Also new in format-version 3</text>
  <text x="248" y="202" font-family="system-ui" font-size="10" fill="rgba(230,237,243,0.9)">▶ <tspan font-weight="700" fill="#56d364">variant</tspan> type — store semi-structured JSON with efficient access</text>
  <text x="248" y="224" font-family="system-ui" font-size="10" fill="rgba(230,237,243,0.9)">▶ <tspan font-weight="700" fill="#56d364">geometry / geography</tspan> types for spatial data</text>
  <text x="248" y="246" font-family="system-ui" font-size="10" fill="rgba(230,237,243,0.9)">▶ <tspan font-weight="700" fill="#56d364">nanosecond timestamps</tspan> (timestamp_ns / timestamptz_ns)</text>
  <text x="248" y="268" font-family="system-ui" font-size="10" fill="rgba(230,237,243,0.9)">▶ <tspan font-weight="700" fill="#56d364">default column values</tspan> — real defaults for new columns</text>
  <text x="248" y="290" font-family="system-ui" font-size="10" fill="rgba(230,237,243,0.9)">▶ <tspan font-weight="700" fill="#56d364">deletion vectors</tspan> + <tspan font-weight="700" fill="#56d364">row lineage</tspan> (shown above)</text>
  <text x="248" y="312" font-family="system-ui" font-size="9" fill="rgba(248,81,73,0.85)">⚠ Adopt v3 only when every engine that reads/writes the table supports it.</text>
</g>
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
    }
    function hide(id) { const el = g(id); if (el) { el.setAttribute('opacity', '0'); el.style.filter = ''; } }
    function unglow(id) { const el = g(id); if (el) el.style.filter = ''; }
    // rows 2,5,6 are the deleted positions
    const DEL = [2, 5, 6];
    function strike(on) { DEL.forEach(i => { const l = g('v3-strike-' + i); if (l) l.setAttribute('opacity', on ? '1' : '0'); }); }

    return [
      AE.fnStep('The Data File', '', () => {
        show('v3-hl-datafile', 'blue');
      }, () => {
        hide('v3-hl-datafile');
      }, 2400),

      AE.fnStep('v2: Positional Delete Files', '', () => {
        unglow('v3-hl-datafile'); hide('v3-hl-datafile');
        strike(true);
        show('v3-a-df-del');
        show('v3-del-1'); show('v3-del-2'); show('v3-del-3');
        show('v3-del-more');
      }, () => {
        // keep the delete files; drop the "thousands" note on advance
      }, 3000),

      AE.fnStep('v2 Read: Merge Many Files', '', () => {
        show('v3-a-del-read');
        show('v3-v2read', 'orange');
      }, () => {
        // fade the whole v2 lane out as we move to v3
        hide('v3-del-1'); hide('v3-del-2'); hide('v3-del-3'); hide('v3-del-more');
        hide('v3-a-df-del'); hide('v3-a-del-read');
        hide('v3-v2read'); unglow('v3-v2read');
      }, 3000),

      AE.fnStep('v3: Deletion Vector', '', () => {
        show('v3-a-df-dv');
        show('v3-dv', 'green');
      }, () => {
        unglow('v3-dv');
      }, 3000),

      AE.fnStep('v3 Read: One Bitmap', '', () => {
        unglow('v3-dv');
        show('v3-a-dv-read');
        show('v3-v3read', 'green');
      }, () => {
        unglow('v3-v3read');
      }, 2800),

      AE.fnStep('Row Lineage', '', () => {
        // dim the v3 lane, spotlight lineage over the data file
        hide('v3-dv'); hide('v3-v3read'); hide('v3-a-df-dv'); hide('v3-a-dv-read');
        strike(false);
        show('v3-lineage', 'purple');
      }, () => {
        hide('v3-lineage');
      }, 3000),

      AE.fnStep('More in v3', '', () => {
        hide('v3-lineage');
        show('v3-more', 'purple');
      }, () => {
        hide('v3-more');
      }, 3800),
    ];
  }

  /* ── Sidebar wiring ─────────────────────────────────────── */
  function _buildSidebar(page, engine, stepsData) {
    const list = page.querySelector('#v3-steps-list');
    const titleEl = page.querySelector('#v3-step-title');
    const descEl = page.querySelector('#v3-step-desc');
    if (!list) return;

    list.innerHTML = stepsData.map((s, i) => `
      <div class="v3-step-item" data-step="${i}">
        <div class="v3-step-badge">${i + 1}</div>
        <div class="v3-step-text">${s.label}</div>
      </div>
    `).join('');

    engine.on('stepchange', (idx) => {
      list.querySelectorAll('.v3-step-item').forEach((el, i) => {
        el.classList.toggle('active', i === idx);
        el.classList.toggle('done', i < idx);
      });
      const step = idx >= 0 ? stepsData[idx] : null;
      if (titleEl) titleEl.textContent = step ? step.label : 'Press Play to begin';
      if (descEl)  descEl.textContent  = step ? step.desc  : 'Watch what changes from Iceberg v2 to v3 — deletion vectors replace piles of positional delete files, plus row lineage and new types.';
      const active = list.querySelector('.v3-step-item.active');
      if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });

    list.addEventListener('click', (e) => {
      const item = e.target.closest('[data-step]');
      if (item) engine.goto(parseInt(item.dataset.step, 10));
    });
  }

  /* ── Module ─────────────────────────────────────────────── */
  const mod = {
    id: 'format-v3',
    title: 'Spec v3 & Deletion Vectors',
    group: 'advanced',
    _engine: null,

    render(container) {
      container.innerHTML = '';
      _injectStyles();

      const page = document.createElement('div');
      page.className = 'v3-page page-enter';
      page.innerHTML = `
        <div class="v3-outer">
          <div class="v3-canvas" id="v3-canvas"></div>
          <div class="v3-sidebar">
            <div class="v3-sidebar-header">
              <div class="v3-sidebar-title" id="v3-step-title">Press Play to begin</div>
              <div class="v3-sidebar-desc" id="v3-step-desc">Watch what changes from Iceberg v2 to v3 — deletion vectors replace piles of positional delete files, plus row lineage and new types.</div>
            </div>
            <div class="v3-steps-list" id="v3-steps-list"></div>
            <div class="v3-info">
              <div class="v3-info-label">v2 vs v3 at a glance</div>
              <table class="v3-cmp">
                <thead><tr><th>Aspect</th><th>v2</th><th>v3</th></tr></thead>
                <tbody>
                  <tr><td>MoR deletes</td><td class="v3-v2">delete files</td><td class="v3-v3">deletion vectors</td></tr>
                  <tr><td>Delete files / churn</td><td class="v3-v2">many small</td><td class="v3-v3">1 bitmap / file</td></tr>
                  <tr><td>Row lineage</td><td class="v3-v2">—</td><td class="v3-v3">_row_id + seq</td></tr>
                  <tr><td>Semi-structured</td><td class="v3-v2">string / json()</td><td class="v3-v3">variant</td></tr>
                  <tr><td>Spatial types</td><td class="v3-v2">—</td><td class="v3-v3">geometry / geo</td></tr>
                  <tr><td>Timestamp res.</td><td class="v3-v2">microsecond</td><td class="v3-v3">+ nanosecond</td></tr>
                  <tr><td>Column defaults</td><td class="v3-v2">null only</td><td class="v3-v3">real defaults</td></tr>
                </tbody>
              </table>
              <div class="v3-note"><strong>Interview tip:</strong> the headline v3 change is deletion vectors — one roaring bitmap per data file instead of a growing pile of positional delete files. Only enable v3 once every engine reading/writing the table supports it.</div>
            </div>
          </div>
        </div>
      `;
      container.appendChild(page);

      const svg = _buildSVG();
      page.querySelector('#v3-canvas').appendChild(svg);

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
      document.getElementById('v3-styles')?.remove();
    },
  };

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.modules = window.IcebergViz.modules || {};
  window.IcebergViz.modules['format-v3'] = mod;
})();
