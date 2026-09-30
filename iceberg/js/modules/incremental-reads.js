/* ============================================================
   Incremental & CDC Reads Module
   Animates reading CHANGES out of Iceberg (the consume side of
   CDC, as opposed to MERGE which writes it):
     • incremental append scan between two snapshots
     • the changelog view for row-level INSERT/UPDATE/DELETE
     • feeding a downstream consumer, then advancing the cursor
   Ends on the practical caveats. ShopKart production context.
   ============================================================ */

(function () {
  'use strict';

  const IV = window.IcebergViz;

  /* ── Style injection ────────────────────────────────────── */
  function _injectStyles() {
    if (document.getElementById('ic-styles')) return;
    const s = document.createElement('style');
    s.id = 'ic-styles';
    s.textContent = `
.ic-page { display:flex; flex-direction:column; height:100%; overflow:hidden; }

.ic-outer { display:flex; flex:1; overflow:hidden; min-height:0; }

.ic-canvas {
  flex:1; display:flex; align-items:center; justify-content:center;
  padding:16px; background:var(--bg-1); overflow:hidden; position:relative;
}

.ic-sidebar {
  width:360px; border-left:1px solid var(--border-default);
  background:var(--bg-2); display:flex; flex-direction:column;
  overflow:hidden; flex-shrink:0;
}
.ic-sidebar-header { padding:14px 18px; border-bottom:1px solid var(--border-default); flex-shrink:0; }
.ic-sidebar-title { font-size:var(--text-sm); font-weight:600; color:var(--text-primary); margin-bottom:4px; }
.ic-sidebar-desc { font-size:var(--text-xs); color:var(--text-secondary); line-height:1.5; min-height:52px; }

.ic-steps-list {
  flex:0 0 auto; overflow-y:auto; padding:6px 0;
  border-bottom:1px solid var(--border-default); max-height:220px;
}
.ic-step-item {
  display:flex; align-items:flex-start; gap:10px; padding:7px 16px;
  cursor:pointer; transition:background .12s; border-left:3px solid transparent; margin-bottom:1px;
}
.ic-step-item:hover { background:var(--bg-3); }
.ic-step-item.active { background:rgba(74,174,255,0.07); border-left-color:var(--blue); }
.ic-step-item.done { opacity:0.6; }
.ic-step-badge {
  width:20px; height:20px; border-radius:50%; background:var(--bg-4);
  color:var(--text-muted); font-size:10px; font-weight:700;
  display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:1px;
  transition:background .12s, color .12s;
}
.ic-step-item.active .ic-step-badge { background:var(--blue); color:#fff; }
.ic-step-item.done .ic-step-badge { background:var(--green); color:#fff; }
.ic-step-text { font-size:12px; color:var(--text-secondary); line-height:1.4; }
.ic-step-item.active .ic-step-text { color:var(--text-primary); font-weight:500; }

.ic-info { flex:1; overflow-y:auto; padding:12px; }
.ic-info-label {
  font-size:10px; color:var(--text-muted); text-transform:uppercase;
  letter-spacing:.05em; margin:0 0 8px;
}
.ic-info-label + .ic-info-label { margin-top:14px; }
.ic-sql {
  background:var(--bg-3); border:1px solid var(--border-default); border-radius:8px;
  padding:10px 12px; font-family:var(--font-mono); font-size:11px;
  color:var(--text-secondary); line-height:1.6; white-space:pre; overflow-x:auto; margin-bottom:12px;
}
.ic-k { color:var(--blue); font-weight:600; }
.ic-s { color:var(--orange); }
.ic-c { color:var(--text-muted); font-style:italic; }
.ic-note {
  font-size:11.5px; color:var(--text-secondary); background:rgba(163,113,247,.07);
  border-left:3px solid var(--purple); border-radius:0 6px 6px 0;
  padding:8px 11px; line-height:1.55;
}
.ic-note strong { color:var(--purple); }
`;
    document.head.appendChild(s);
  }

  /* ── Step descriptions (sidebar) ────────────────────────── */
  function _getStepDescs() {
    return [
      { label: 'Snapshot Timeline', desc: 'Each commit is an immutable snapshot. S1 is the base load; S2–S4 each appended new files on top. S4 is the current snapshot a normal query sees.' },
      { label: 'Full Scan (baseline)', desc: 'A plain SELECT reads the entire current table — every file from S1 through S4 (24,000 files). This is what you do NOT want for repeated downstream sync.' },
      { label: 'Incremental Append Scan', desc: 'Set start-snapshot-id = S1 and end = S4. Iceberg returns only the files APPENDED after S1 — 900 files, not 24,000. This is the incremental read.' },
      { label: 'Only New Data', desc: 'The append scan reads ~96% less I/O. Caveat: it sees appended files only — it does not surface row-level updates or deletes on existing rows.' },
      { label: 'Changelog View', desc: 'create_changelog_view emits per-row changes with _change_type (INSERT / UPDATE_BEFORE / UPDATE_AFTER / DELETE), plus _commit_snapshot_id and _change_ordinal — real row-level CDC out of the table.' },
      { label: 'CDC Out to Downstream', desc: 'Feed the changes to a mart or Kafka. The next run uses the last consumed snapshot id as the new start bound — exactly-once, resumable incremental sync.' },
      { label: 'Caveats', desc: 'Append scan misses MoR deletes/overwrites — use the changelog for those. The start snapshot must still exist, so expire_snapshots can break the cursor if retention is too short.' },
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
    svg.id = 'ic-svg';

    // helper to emit a small grid of file tiles
    function tiles(cx, y, n, color) {
      let out = '';
      for (let i = 0; i < n; i++) {
        const col = i % 3, row = Math.floor(i / 3);
        out += `<rect x="${cx - 33 + col * 23}" y="${y + row * 16}" width="20" height="13" rx="2" fill="${color}" stroke="${color}" stroke-width="0.6" opacity="0.9"/>`;
      }
      return out;
    }

    const BLUE = 'rgba(88,166,255,0.45)';
    const GREEN = 'rgba(86,211,100,0.55)';

    svg.innerHTML = `
<defs>
  <marker id="ic-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#484f58"/>
  </marker>
  <marker id="ic-arr-purple" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
    <path d="M 0 0 L 10 5 L 0 10 z" fill="#a371f7"/>
  </marker>
</defs>

<rect width="${W}" height="${H}" fill="#090d14"/>
<text x="12" y="16" font-family="system-ui" font-size="9.5" fill="rgba(139,148,158,0.4)" font-weight="600" letter-spacing="1">ShopKart — Reading changes out of Iceberg (incremental + changelog)</text>

<!-- ═══ Snapshot timeline ═══ -->
<line x1="100" y1="64" x2="610" y2="64" stroke="#30363d" stroke-width="2"/>
<g id="ic-snap-s1">
  <circle cx="100" cy="64" r="22" fill="#0d1f3c" stroke="#58a6ff" stroke-width="1.8"/>
  <text x="100" y="64" text-anchor="middle" dominant-baseline="middle" font-family="ui-monospace" font-size="11" font-weight="700" fill="#e6edf3">S1</text>
  <text x="100" y="98" text-anchor="middle" font-family="system-ui" font-size="8" fill="rgba(139,148,158,0.65)">base load</text>
</g>
<g id="ic-snap-s2">
  <circle cx="270" cy="64" r="22" fill="#0a1f10" stroke="#56d364" stroke-width="1.8"/>
  <text x="270" y="64" text-anchor="middle" dominant-baseline="middle" font-family="ui-monospace" font-size="11" font-weight="700" fill="#e6edf3">S2</text>
  <text x="270" y="98" text-anchor="middle" font-family="system-ui" font-size="8" fill="rgba(139,148,158,0.65)">append</text>
</g>
<g id="ic-snap-s3">
  <circle cx="440" cy="64" r="22" fill="#0a1f10" stroke="#56d364" stroke-width="1.8"/>
  <text x="440" y="64" text-anchor="middle" dominant-baseline="middle" font-family="ui-monospace" font-size="11" font-weight="700" fill="#e6edf3">S3</text>
  <text x="440" y="98" text-anchor="middle" font-family="system-ui" font-size="8" fill="rgba(139,148,158,0.65)">upsert</text>
</g>
<g id="ic-snap-s4">
  <circle cx="610" cy="64" r="22" fill="#0a1f10" stroke="#56d364" stroke-width="1.8"/>
  <text x="610" y="64" text-anchor="middle" dominant-baseline="middle" font-family="ui-monospace" font-size="11" font-weight="700" fill="#e6edf3">S4</text>
  <text x="610" y="98" text-anchor="middle" font-family="system-ui" font-size="8" fill="#56d364" font-weight="700">current</text>
</g>

<!-- files added by each snapshot -->
<g id="ic-files-s1">${tiles(100, 112, 6, BLUE)}</g>
<g id="ic-files-s2">${tiles(270, 112, 2, GREEN)}</g>
<g id="ic-files-s3">${tiles(440, 112, 2, GREEN)}</g>
<g id="ic-files-s4">${tiles(610, 112, 2, GREEN)}</g>

<!-- full-scan glow frame -->
<rect id="ic-hl-full" x="60" y="104" width="576" height="52" rx="8" fill="none" stroke="#58a6ff" stroke-width="2.2" opacity="0"/>
<!-- incremental (delta) frame over S2..S4 -->
<g id="ic-delta" opacity="0">
  <rect x="232" y="102" width="410" height="56" rx="8" fill="rgba(86,211,100,0.06)" stroke="#56d364" stroke-width="2" stroke-dasharray="6 3"/>
  <text x="437" y="150" text-anchor="middle" font-family="system-ui" font-size="9" font-weight="700" fill="#56d364">delta since S1 — appended files only</text>
</g>

<!-- ═══ Read boxes ═══ -->
<g id="ic-fullscan-box" opacity="0">
  <rect x="40" y="182" width="252" height="66" rx="8" fill="#0d1117" stroke="#58a6ff" stroke-width="1.4"/>
  <text x="54" y="202" font-family="system-ui" font-size="10" font-weight="700" fill="#58a6ff">Full scan (normal SELECT)</text>
  <text x="54" y="219" font-family="ui-monospace" font-size="9" fill="rgba(139,148,158,0.8)">SELECT * FROM orders</text>
  <text x="54" y="236" font-family="ui-monospace" font-size="9" fill="rgba(248,81,73,0.8)">reads 24,000 files · whole table</text>
</g>
<g id="ic-incr-box" opacity="0">
  <rect x="310" y="182" width="300" height="66" rx="8" fill="#0a1f10" stroke="#56d364" stroke-width="1.4"/>
  <text x="324" y="202" font-family="system-ui" font-size="10" font-weight="700" fill="#56d364">Incremental append scan</text>
  <text x="324" y="219" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.85)">start-snapshot-id = S1</text>
  <text x="324" y="233" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.85)">end-snapshot-id   = S4</text>
  <text x="324" y="245" font-family="ui-monospace" font-size="8.5" fill="rgba(86,211,100,0.9)">reads 900 files · appended only</text>
</g>
<g id="ic-stat-badge" opacity="0">
  <rect x="628" y="182" width="152" height="66" rx="8" fill="rgba(240,136,62,0.08)" stroke="#f0883e" stroke-width="1.3"/>
  <text x="704" y="204" text-anchor="middle" font-family="ui-monospace" font-size="13" font-weight="800" fill="#f0883e">24,000 → 900</text>
  <text x="704" y="220" text-anchor="middle" font-family="system-ui" font-size="8.5" fill="rgba(139,148,158,0.8)">files read</text>
  <text x="704" y="238" text-anchor="middle" font-family="system-ui" font-size="9.5" font-weight="700" fill="#56d364">~96% less I/O</text>
</g>

<!-- ═══ Changelog table (step 5) ═══ -->
<g id="ic-changelog" opacity="0">
  <rect x="40" y="264" width="520" height="182" rx="8" fill="#0d1117" stroke="#a371f7" stroke-width="1.4"/>
  <text x="54" y="284" font-family="system-ui" font-size="10" font-weight="700" fill="#a371f7">changelog view — row-level CDC</text>
  <!-- header -->
  <text x="54"  y="306" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.9)" font-weight="700">_change_type</text>
  <text x="230" y="306" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.9)" font-weight="700">order_id</text>
  <text x="330" y="306" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.9)" font-weight="700">amount</text>
  <text x="450" y="306" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.9)" font-weight="700">_commit</text>
  <line x1="54" y1="312" x2="546" y2="312" stroke="#30363d" stroke-width="1"/>
  <!-- rows -->
  <text x="54"  y="330" font-family="ui-monospace" font-size="9" fill="#56d364" font-weight="700">INSERT</text>
  <text x="230" y="330" font-family="ui-monospace" font-size="9" fill="#e6edf3">9001</text>
  <text x="330" y="330" font-family="ui-monospace" font-size="9" fill="#e6edf3">250.00</text>
  <text x="450" y="330" font-family="ui-monospace" font-size="9" fill="rgba(139,148,158,0.8)">S2</text>

  <text x="54"  y="352" font-family="ui-monospace" font-size="9" fill="#f0883e" font-weight="700">UPDATE_BEFORE</text>
  <text x="230" y="352" font-family="ui-monospace" font-size="9" fill="#e6edf3">9001</text>
  <text x="330" y="352" font-family="ui-monospace" font-size="9" fill="rgba(139,148,158,0.8)">250.00</text>
  <text x="450" y="352" font-family="ui-monospace" font-size="9" fill="rgba(139,148,158,0.8)">S3</text>

  <text x="54"  y="374" font-family="ui-monospace" font-size="9" fill="#f0883e" font-weight="700">UPDATE_AFTER</text>
  <text x="230" y="374" font-family="ui-monospace" font-size="9" fill="#e6edf3">9001</text>
  <text x="330" y="374" font-family="ui-monospace" font-size="9" fill="#56d364" font-weight="700">275.00</text>
  <text x="450" y="374" font-family="ui-monospace" font-size="9" fill="rgba(139,148,158,0.8)">S3</text>

  <text x="54"  y="396" font-family="ui-monospace" font-size="9" fill="#f85149" font-weight="700">DELETE</text>
  <text x="230" y="396" font-family="ui-monospace" font-size="9" fill="#e6edf3">8804</text>
  <text x="330" y="396" font-family="ui-monospace" font-size="9" fill="rgba(139,148,158,0.8)">120.00</text>
  <text x="450" y="396" font-family="ui-monospace" font-size="9" fill="rgba(139,148,158,0.8)">S4</text>

  <text x="54" y="424" font-family="system-ui" font-size="8.5" fill="rgba(139,148,158,0.65)">an UPDATE surfaces as a matched BEFORE / AFTER pair — captures updates &amp; deletes,</text>
  <text x="54" y="436" font-family="system-ui" font-size="8.5" fill="rgba(139,148,158,0.65)">not just appends.</text>
</g>

<!-- ═══ Downstream consumer (step 6) ═══ -->
<g id="ic-downstream" opacity="0">
  <rect x="600" y="286" width="184" height="104" rx="8" fill="#1a1a10" stroke="#e3b341" stroke-width="1.4"/>
  <text x="616" y="310" font-size="14" dominant-baseline="middle">📦</text>
  <text x="640" y="308" font-family="system-ui" font-size="10" font-weight="700" fill="#e6edf3">Downstream</text>
  <text x="616" y="328" font-family="ui-monospace" font-size="8.5" fill="rgba(227,179,65,0.85)">▶ curated mart / Kafka</text>
  <text x="616" y="343" font-family="ui-monospace" font-size="8.5" fill="rgba(139,148,158,0.8)">apply INSERT/UPD/DEL</text>
  <text x="616" y="362" font-family="system-ui" font-size="8" fill="rgba(139,148,158,0.7)">next run start = S4</text>
  <text x="616" y="377" font-family="ui-monospace" font-size="8.5" font-weight="700" fill="#56d364">resumable · exactly-once</text>
</g>
<line id="ic-a-cdc" x1="560" y1="340" x2="598" y2="338" stroke="#a371f7" stroke-width="1.8" marker-end="url(#ic-arr-purple)" opacity="0"/>

<!-- ═══ Caveats overlay (step 7) ═══ -->
<g id="ic-caveats" opacity="0">
  <rect x="40" y="176" width="740" height="76" rx="8" fill="#1a1012" stroke="#f85149" stroke-width="1.4"/>
  <text x="56" y="197" font-family="system-ui" font-size="10" font-weight="700" fill="#f85149">Caveats to remember</text>
  <text x="56" y="215" font-family="system-ui" font-size="9" fill="rgba(230,237,243,0.85)">▶ Append scan sees APPENDED files only — MoR deletes / overwrites are invisible to it. Use the changelog view for those.</text>
  <text x="56" y="230" font-family="system-ui" font-size="9" fill="rgba(230,237,243,0.85)">▶ The start snapshot must still exist — if expire_snapshots removes it, the incremental cursor breaks. Retain long enough.</text>
  <text x="56" y="245" font-family="system-ui" font-size="9" fill="rgba(230,237,243,0.85)">▶ Requires format-version 2 and the snapshots between start and end to be retained.</text>
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
    function glowFiles(ids, color) { ids.forEach(id => show(id, color)); }
    function unglowFiles(ids) { ids.forEach(id => unglow(id)); }
    const ALL_FILES = ['ic-files-s1', 'ic-files-s2', 'ic-files-s3', 'ic-files-s4'];
    const DELTA_FILES = ['ic-files-s2', 'ic-files-s3', 'ic-files-s4'];

    return [
      AE.fnStep('Snapshot Timeline', '', () => {
        show('ic-snap-s4', 'green');
      }, () => {
        unglow('ic-snap-s4');
      }, 2600),

      AE.fnStep('Full Scan (baseline)', '', () => {
        unglow('ic-snap-s4');
        show('ic-hl-full', 'blue');
        glowFiles(ALL_FILES, 'blue');
        show('ic-fullscan-box', 'blue');
      }, () => {
        hide('ic-hl-full');
        unglowFiles(ALL_FILES);
        unglow('ic-fullscan-box');
      }, 3000),

      AE.fnStep('Incremental Append Scan', '', () => {
        hide('ic-hl-full');
        unglowFiles(ALL_FILES);
        unglow('ic-fullscan-box');
        show('ic-delta', 'green');
        glowFiles(DELTA_FILES, 'green');
        show('ic-incr-box', 'green');
      }, () => {
        unglowFiles(DELTA_FILES);
        unglow('ic-incr-box');
      }, 3200),

      AE.fnStep('Only New Data', '', () => {
        unglowFiles(DELTA_FILES);
        show('ic-stat-badge', 'orange');
      }, () => {
        unglow('ic-stat-badge');
      }, 2800),

      AE.fnStep('Changelog View', '', () => {
        unglow('ic-stat-badge');
        show('ic-changelog', 'purple');
      }, () => {
        unglow('ic-changelog');
      }, 3400),

      AE.fnStep('CDC Out to Downstream', '', () => {
        unglow('ic-changelog');
        show('ic-a-cdc');
        show('ic-downstream', 'orange');
      }, () => {
        hide('ic-a-cdc');
        unglow('ic-downstream');
      }, 3000),

      AE.fnStep('Caveats', '', () => {
        unglow('ic-downstream');
        show('ic-caveats', 'orange');
      }, () => {
        hide('ic-caveats');
      }, 3600),
    ];
  }

  /* ── Sidebar wiring ─────────────────────────────────────── */
  function _buildSidebar(page, engine, stepsData) {
    const list = page.querySelector('#ic-steps-list');
    const titleEl = page.querySelector('#ic-step-title');
    const descEl = page.querySelector('#ic-step-desc');
    if (!list) return;

    list.innerHTML = stepsData.map((s, i) => `
      <div class="ic-step-item" data-step="${i}">
        <div class="ic-step-badge">${i + 1}</div>
        <div class="ic-step-text">${s.label}</div>
      </div>
    `).join('');

    engine.on('stepchange', (idx) => {
      list.querySelectorAll('.ic-step-item').forEach((el, i) => {
        el.classList.toggle('active', i === idx);
        el.classList.toggle('done', i < idx);
      });
      const step = idx >= 0 ? stepsData[idx] : null;
      if (titleEl) titleEl.textContent = step ? step.label : 'Press Play to begin';
      if (descEl)  descEl.textContent  = step ? step.desc  : 'Watch Iceberg return only what changed between two snapshots — and emit row-level INSERT/UPDATE/DELETE via the changelog.';
      const active = list.querySelector('.ic-step-item.active');
      if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });

    list.addEventListener('click', (e) => {
      const item = e.target.closest('[data-step]');
      if (item) engine.goto(parseInt(item.dataset.step, 10));
    });
  }

  /* ── Module ─────────────────────────────────────────────── */
  const mod = {
    id: 'incremental-reads',
    title: 'Incremental & CDC Reads',
    group: 'read-ops',
    _engine: null,

    render(container) {
      container.innerHTML = '';
      _injectStyles();

      const page = document.createElement('div');
      page.className = 'ic-page page-enter';
      page.innerHTML = `
        <div class="ic-outer">
          <div class="ic-canvas" id="ic-canvas"></div>
          <div class="ic-sidebar">
            <div class="ic-sidebar-header">
              <div class="ic-sidebar-title" id="ic-step-title">Press Play to begin</div>
              <div class="ic-sidebar-desc" id="ic-step-desc">Watch Iceberg return only what changed between two snapshots — and emit row-level INSERT/UPDATE/DELETE via the changelog.</div>
            </div>
            <div class="ic-steps-list" id="ic-steps-list"></div>
            <div class="ic-info">
              <div class="ic-info-label">Incremental append scan (Spark)</div>
              <div class="ic-sql"><span class="ic-k">spark.read</span>
  .format(<span class="ic-s">"iceberg"</span>)
  .option(<span class="ic-s">"start-snapshot-id"</span>, s1)
  .option(<span class="ic-s">"end-snapshot-id"</span>,   s4)
  .load(<span class="ic-s">"prod.orders"</span>)
<span class="ic-c">-- appended rows between S1 and S4 only</span></div>
              <div class="ic-info-label">Changelog view — row-level CDC</div>
              <div class="ic-sql"><span class="ic-k">CALL</span> sys.create_changelog_view(
  table => <span class="ic-s">'prod.orders'</span>,
  options => map(
    <span class="ic-s">'start-snapshot-id'</span>, <span class="ic-s">'S1'</span>,
    <span class="ic-s">'end-snapshot-id'</span>,   <span class="ic-s">'S4'</span>))

<span class="ic-k">SELECT</span> _change_type, order_id, amount
<span class="ic-k">FROM</span> orders_changes</div>
              <div class="ic-note"><strong>Which to use?</strong> Append scan is cheapest but sees appends only. For updates &amp; deletes (MoR/CDC targets), use the changelog view — it emits UPDATE_BEFORE / UPDATE_AFTER / DELETE.</div>
            </div>
          </div>
        </div>
      `;
      container.appendChild(page);

      const svg = _buildSVG();
      page.querySelector('#ic-canvas').appendChild(svg);

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
      document.getElementById('ic-styles')?.remove();
    },
  };

  window.IcebergViz = window.IcebergViz || {};
  window.IcebergViz.modules = window.IcebergViz.modules || {};
  window.IcebergViz.modules['incremental-reads'] = mod;
})();
