/* ============================================================
   Cloud DE Visualizer — Architecture Studio (Phase 6).

   A free-form canvas for sketching data architectures: drag service
   blocks from a palette onto a board, move them, connect them, and
   save/load named designs (localStorage). Fully functional — real
   drag, real connections, real persistence. Additive: a new screen
   registered under "Design"; nothing existing is modified.

   Honest feedback only: the "layer coverage" panel states which
   architecture layers your current canvas includes (a factual
   reflection of the blocks you placed) — it is NOT a quality score
   and is labelled as a self-check, not an assessment.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  const esc = s => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

  const KEY = 'cde-arch-designs';
  // category -> architecture layer
  const LAYER = {
    'ingest-etl': 'ingest', streaming: 'ingest',
    storage: 'storage', databases: 'storage',
    compute: 'process', analytics: 'process', ml: 'process', orchestration: 'process',
    governance: 'govern', ops: 'govern',
  };
  const LAYERS = [
    { id: 'ingest', label: 'Ingest' },
    { id: 'storage', label: 'Store' },
    { id: 'process', label: 'Process' },
    { id: 'serve', label: 'Serve' },
    { id: 'govern', label: 'Govern' },
  ];
  const LAYER_COLOR = { ingest: '#0ea5e9', storage: '#10b981', process: '#8b5cf6', serve: '#f59e0b', govern: '#ef4444' };

  // Build the palette from all registered services (deduped by name+layer).
  function palette() {
    const svcs = (TV._services && TV._services) || {};
    const seen = new Set();
    const out = {};
    ['azure', 'databricks', 'aws', 'fabric'].forEach(fmt => {
      (svcs[fmt] || []).forEach(s => {
        const layer = LAYER[s.category] || 'process';
        const key = (s.name + '|' + layer).toLowerCase();
        if (seen.has(key)) return; seen.add(key);
        (out[layer] = out[layer] || []).push({ svcId: s.id, name: s.name, layer, fmt });
      });
    });
    return out;
  }

  // Starter templates — common reference patterns, loaded in one click.
  // Each node: [name, layer, col, row]; edges by node index.
  const TEMPLATES = {
    medallion: {
      label: 'Medallion lakehouse',
      nodes: [['Source systems', 'ingest', 0, 0], ['Ingestion', 'ingest', 1, 0], ['Bronze', 'storage', 2, 0],
        ['Silver', 'storage', 2, 1], ['Gold', 'storage', 2, 2], ['BI / Serving', 'serve', 3, 2], ['Governance', 'govern', 3, 0]],
      edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [6, 2], [6, 3], [6, 4]],
    },
    streaming: {
      label: 'Streaming pipeline',
      nodes: [['Producers', 'ingest', 0, 0], ['Event log / Kafka', 'ingest', 1, 0], ['Stream processor', 'process', 2, 0],
        ['Delta / sink', 'storage', 3, 0], ['Real-time dashboard', 'serve', 3, 1], ['Monitoring', 'govern', 2, 1]],
      edges: [[0, 1], [1, 2], [2, 3], [3, 4], [5, 2]],
    },
    warehouse: {
      label: 'Analytics warehouse',
      nodes: [['Operational DBs', 'storage', 0, 0], ['ELT / ingestion', 'ingest', 1, 0], ['Staging', 'storage', 2, 0],
        ['Warehouse', 'process', 2, 1], ['Semantic model', 'serve', 3, 1], ['BI tools', 'serve', 3, 2], ['Catalog / lineage', 'govern', 1, 1]],
      edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [6, 2], [6, 3]],
    },
  };
  function loadTemplate(key) {
    const t = TEMPLATES[key]; if (!t) return;
    state = { nodes: [], edges: [], seq: 1 };
    t.nodes.forEach(([name, layer, col, row]) => {
      state.nodes.push({ nid: 'n' + (state.seq++), name, layer, x: 24 + col * 185, y: 24 + row * 92 });
    });
    (t.edges || []).forEach(([a, b]) => {
      const na = state.nodes[a], nb = state.nodes[b];
      if (na && nb) state.edges.push([na.nid, nb.nid]);
    });
    connectFrom = null;
    redraw();
  }

  let state = { nodes: [], edges: [], seq: 1 }; // nodes:{nid,name,layer,x,y}; edges:[nidA,nidB]
  let connectFrom = null;

  function loadDesigns() { try { return JSON.parse(TV.ls.get(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function saveDesigns(d) { TV.ls.set(KEY, JSON.stringify(d)); }

  // Share-link codec: a design travels in the URL query (?arch=...), so it
  // works across devices without a server. Unicode-safe base64.
  function encodeState(st) {
    try { return btoa(unescape(encodeURIComponent(JSON.stringify({ nodes: st.nodes, edges: st.edges, seq: st.seq })))); }
    catch (e) { return ''; }
  }
  function decodeState(s) {
    try {
      const o = JSON.parse(decodeURIComponent(escape(atob(s))));
      if (o && Array.isArray(o.nodes) && Array.isArray(o.edges)) return { nodes: o.nodes, edges: o.edges, seq: o.seq || (o.nodes.length + 1) };
    } catch (e) {}
    return null;
  }
  function shareURL() {
    const code = encodeState(state);
    const fmt = TV.activeFormat || (location.hash.split('/')[0] || '').replace('#', '') || 'azure';
    return location.origin + location.pathname + '?arch=' + encodeURIComponent(code) + '#' + fmt + '/architecture-studio';
  }
  function importFromURL() {
    try {
      const code = new URLSearchParams(location.search).get('arch');
      if (!code) return false;
      const st = decodeState(code);
      // strip the param so refreshes/links stay clean, keep the hash route
      history.replaceState(null, '', location.pathname + location.hash);
      if (st) { state = st; connectFrom = null; return true; }
    } catch (e) {}
    return false;
  }

  function ensureStyles() {
    if (document.getElementById('arch-styles')) return;
    const el = document.createElement('style');
    el.id = 'arch-styles';
    el.textContent = `
.arch { height:100%; display:flex; flex-direction:column; overflow:hidden; }
.arch-top { padding:18px 24px 12px; border-bottom:1px solid var(--border-subtle); }
.arch-eyebrow { font-size:11px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:var(--brand); margin-bottom:6px; }
.arch-h1 { font-size:22px; font-weight:800; letter-spacing:-.02em; color:var(--text-primary); margin:0 0 4px; }
.arch-sub { font-size:13px; color:var(--text-secondary); line-height:1.6; margin:0; max-width:760px; }
.arch-main { flex:1; display:grid; grid-template-columns:230px 1fr 230px; min-height:0; }
.arch-pal, .arch-side { overflow-y:auto; padding:14px; }
.arch-pal { border-right:1px solid var(--border-subtle); }
.arch-side { border-left:1px solid var(--border-subtle); }
.arch-pal-h, .arch-side-h { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.05em; color:var(--text-muted); margin:14px 0 7px; }
.arch-pal-h:first-child { margin-top:0; }
.arch-chip { display:block; width:100%; text-align:left; cursor:grab; border:1px solid var(--border-default); background:var(--bg-2); color:var(--text-primary); font:inherit; font-size:12px; font-weight:600; padding:6px 10px; border-radius:7px; margin-bottom:5px; border-left-width:3px; }
.arch-chip:hover { border-color:var(--brand); }
.arch-chip:active { cursor:grabbing; }
.arch-canvas-wrap { position:relative; overflow:hidden; background:
  radial-gradient(circle, var(--border-subtle) 1px, transparent 1px); background-size:22px 22px; background-color:var(--bg-0); }
.arch-canvas { position:absolute; inset:0; }
.arch-svg { position:absolute; inset:0; width:100%; height:100%; pointer-events:none; }
.arch-edge { stroke:var(--text-muted); stroke-width:2; fill:none; opacity:.6; }
.arch-node { position:absolute; min-width:120px; max-width:170px; background:var(--bg-2); border:1px solid var(--border-default); border-left:3px solid var(--text-muted); border-radius:9px; padding:8px 10px; cursor:grab; box-shadow:var(--lift,0 4px 14px rgba(0,0,0,.15)); user-select:none; }
.arch-node.is-connecting { outline:2px solid var(--brand); outline-offset:1px; }
.arch-node-name { font-size:12px; font-weight:700; color:var(--text-primary); line-height:1.3; margin-bottom:3px; padding-right:14px; }
.arch-node-layer { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:var(--text-muted); }
.arch-node-x { position:absolute; top:4px; right:5px; cursor:pointer; border:0; background:none; color:var(--text-muted); font-size:14px; line-height:1; padding:2px; }
.arch-node-x:hover { color:var(--red,#ef4444); }
.arch-node-link { position:absolute; bottom:4px; right:6px; cursor:pointer; border:0; background:none; color:var(--text-muted); font-size:11px; font-weight:800; }
.arch-node-link:hover { color:var(--brand); }
.arch-empty { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:var(--text-muted); font-size:13px; text-align:center; pointer-events:none; padding:24px; }
.arch-toolbar { display:flex; gap:7px; padding:9px 24px; border-bottom:1px solid var(--border-subtle); flex-wrap:wrap; align-items:center; }
.arch-btn { cursor:pointer; border:1px solid var(--border-default); background:var(--bg-2); color:var(--text-primary); font:inherit; font-size:12px; font-weight:700; padding:6px 11px; border-radius:8px; }
.arch-btn:hover { border-color:var(--brand); }
.arch-btn.is-on { background:var(--brand); border-color:var(--brand); color:#06171a; }
.arch-hint { font-size:11px; color:var(--text-muted); }
.arch-cov { display:grid; gap:6px; margin-bottom:8px; }
.arch-cov-row { display:flex; align-items:center; gap:8px; font-size:12px; }
.arch-cov-dot { width:10px; height:10px; border-radius:3px; flex:0 0 auto; }
.arch-cov-lbl { flex:1; color:var(--text-secondary); font-weight:600; }
.arch-cov-n { font-weight:800; color:var(--text-primary); }
.arch-cov-row.is-empty .arch-cov-lbl, .arch-cov-row.is-empty .arch-cov-n { color:var(--text-muted); }
.arch-note { font-size:11px; color:var(--text-muted); line-height:1.5; margin:8px 0 0; padding:8px 10px; border:1px dashed var(--border-default); border-radius:8px; }
.arch-saved { display:grid; gap:5px; margin-top:6px; }
.arch-saved-row { display:flex; align-items:center; gap:6px; }
.arch-saved-open { flex:1; text-align:left; cursor:pointer; border:1px solid var(--border-default); background:var(--bg-2); color:var(--text-primary); font:inherit; font-size:12px; font-weight:600; padding:5px 9px; border-radius:7px; }
.arch-saved-open:hover { border-color:var(--brand); }
.arch-saved-del { cursor:pointer; border:0; background:none; color:var(--text-muted); font-size:14px; }
.arch-saved-del:hover { color:var(--red,#ef4444); }
@media (max-width:860px){ .arch-main { grid-template-columns:1fr; grid-template-rows:auto 320px auto; } .arch-pal,.arch-side{ border:0; border-bottom:1px solid var(--border-subtle);} }
`;
    document.head.appendChild(el);
  }

  let elCanvas, elSvg, elCov, elSaved, elEmpty, container0;

  function layerCounts() {
    const c = {}; LAYERS.forEach(l => c[l.id] = 0);
    state.nodes.forEach(n => { c[n.layer] = (c[n.layer] || 0) + 1; });
    return c;
  }

  function renderCoverage() {
    const c = layerCounts();
    const covered = LAYERS.filter(l => c[l.id] > 0).length;
    elCov.innerHTML = LAYERS.map(l =>
      `<div class="arch-cov-row ${c[l.id] ? '' : 'is-empty'}">
         <span class="arch-cov-dot" style="background:${c[l.id] ? LAYER_COLOR[l.id] : 'var(--border-default)'}"></span>
         <span class="arch-cov-lbl">${esc(l.label)}</span>
         <span class="arch-cov-n">${c[l.id]}</span>
       </div>`).join('') +
      `<div class="arch-cov-row" style="margin-top:4px;border-top:1px solid var(--border-subtle);padding-top:7px">
         <span class="arch-cov-lbl">Layers covered</span><span class="arch-cov-n">${covered} / ${LAYERS.length}</span>
       </div>`;
  }

  function renderEdges() {
    const byId = {}; state.nodes.forEach(n => byId[n.nid] = n);
    const rect = elCanvas.getBoundingClientRect();
    const lines = state.edges.map(([a, b]) => {
      const na = byId[a], nb = byId[b]; if (!na || !nb) return '';
      const ax = na.x + 75, ay = na.y + 22, bx = nb.x + 75, by = nb.y + 22;
      return `<path class="arch-edge" d="M${ax},${ay} C${ax},${(ay + by) / 2} ${bx},${(ay + by) / 2} ${bx},${by}" />`;
    }).join('');
    elSvg.innerHTML = lines;
  }

  function nodeEl(n) {
    const el = document.createElement('div');
    el.className = 'arch-node' + (connectFrom === n.nid ? ' is-connecting' : '');
    el.style.left = n.x + 'px'; el.style.top = n.y + 'px';
    el.style.borderLeftColor = LAYER_COLOR[n.layer] || 'var(--text-muted)';
    el.setAttribute('data-nid', n.nid);
    el.innerHTML =
      `<button class="arch-node-x" title="Delete" data-arch-del>×</button>
       <div class="arch-node-name">${esc(n.name)}</div>
       <div class="arch-node-layer">${esc(n.layer)}</div>
       <button class="arch-node-link" title="Connect to…" data-arch-link>↔ link</button>`;
    // delete
    el.querySelector('[data-arch-del]').addEventListener('click', e => {
      e.stopPropagation();
      state.nodes = state.nodes.filter(x => x.nid !== n.nid);
      state.edges = state.edges.filter(([a, b]) => a !== n.nid && b !== n.nid);
      if (connectFrom === n.nid) connectFrom = null;
      redraw();
    });
    // connect
    el.querySelector('[data-arch-link]').addEventListener('click', e => {
      e.stopPropagation();
      if (connectFrom == null) { connectFrom = n.nid; redraw(); }
      else if (connectFrom === n.nid) { connectFrom = null; redraw(); }
      else {
        const pair = [connectFrom, n.nid];
        if (!state.edges.some(([a, b]) => (a === pair[0] && b === pair[1]) || (a === pair[1] && b === pair[0]))) state.edges.push(pair);
        connectFrom = null; redraw();
      }
    });
    // drag to move (pointer events)
    el.addEventListener('pointerdown', e => {
      if (e.target.closest('button')) return;
      el.setPointerCapture(e.pointerId);
      const rect = elCanvas.getBoundingClientRect();
      const offX = e.clientX - rect.left - n.x, offY = e.clientY - rect.top - n.y;
      el.style.cursor = 'grabbing';
      const move = ev => {
        const r = elCanvas.getBoundingClientRect();
        n.x = Math.max(0, Math.min(r.width - 120, ev.clientX - r.left - offX));
        n.y = Math.max(0, Math.min(r.height - 44, ev.clientY - r.top - offY));
        el.style.left = n.x + 'px'; el.style.top = n.y + 'px';
        renderEdges();
      };
      const up = ev => { el.releasePointerCapture(e.pointerId); el.style.cursor = 'grab'; el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
    });
    return el;
  }

  function redraw() {
    // rebuild nodes layer
    [...elCanvas.querySelectorAll('.arch-node')].forEach(n => n.remove());
    state.nodes.forEach(n => elCanvas.appendChild(nodeEl(n)));
    elEmpty.style.display = state.nodes.length ? 'none' : 'flex';
    renderEdges();
    renderCoverage();
  }

  function addNode(svc, x, y) {
    const r = elCanvas.getBoundingClientRect();
    state.nodes.push({
      nid: 'n' + (state.seq++), name: svc.name, layer: svc.layer,
      x: Math.max(0, Math.min((r.width || 600) - 120, x)), y: Math.max(0, Math.min((r.height || 400) - 44, y)),
    });
    redraw();
  }

  function renderSaved() {
    const d = loadDesigns();
    const names = Object.keys(d);
    elSaved.innerHTML = names.length
      ? names.map(nm => `<div class="arch-saved-row">
          <button class="arch-saved-open" data-arch-open="${esc(nm)}">${esc(nm)}</button>
          <button class="arch-saved-del" title="Delete" data-arch-sdel="${esc(nm)}">🗑</button>
        </div>`).join('')
      : `<div class="arch-hint">No saved designs yet.</div>`;
    elSaved.querySelectorAll('[data-arch-open]').forEach(b => b.addEventListener('click', () => {
      const saved = loadDesigns()[b.getAttribute('data-arch-open')];
      if (saved) { state = JSON.parse(JSON.stringify(saved)); connectFrom = null; if (!state.seq) state.seq = state.nodes.length + 1; redraw(); }
    }));
    elSaved.querySelectorAll('[data-arch-sdel]').forEach(b => b.addEventListener('click', () => {
      const dd = loadDesigns(); delete dd[b.getAttribute('data-arch-sdel')]; saveDesigns(dd); renderSaved();
    }));
  }

  function render(container) {
    ensureStyles();
    container.className = '';
    container0 = container;
    const importedFromURL = importFromURL();
    const pal = palette();
    const palHtml = LAYERS.map(l => {
      const items = pal[l.id] || [];
      if (!items.length && l.id === 'serve') return `<div class="arch-pal-h">${esc(l.label)}</div><div class="arch-hint">Use a Store/Process service as a serving layer.</div>`;
      if (!items.length) return '';
      return `<div class="arch-pal-h">${esc(l.label)}</div>` + items.slice(0, 10).map(it =>
        `<button class="arch-chip" draggable="true" data-arch-add="${esc(it.svcId)}|${esc(it.layer)}|${esc(it.name)}" style="border-left-color:${LAYER_COLOR[it.layer]}">${esc(it.name)}</button>`).join('');
    }).join('');

    container.innerHTML = `
<div class="arch">
  <div class="arch-top">
    <div class="arch-eyebrow">Design</div>
    <h1 class="arch-h1">Architecture Studio</h1>
    <p class="arch-sub">Sketch a data architecture: drag service blocks onto the canvas, move them, and link them. Save named designs to revisit later. This is a free-form sandbox for thinking through designs — it does not deploy anything.</p>
  </div>
  <div class="arch-toolbar">
    <select class="arch-btn arch-tpl" aria-label="Load a starter template">
      <option value="">Start from template…</option>
      ${Object.keys(TEMPLATES).map(k => `<option value="${esc(k)}">${esc(TEMPLATES[k].label)}</option>`).join('')}
    </select>
    <button class="arch-btn" data-arch-clear>Clear canvas</button>
    <button class="arch-btn" data-arch-save>Save design…</button>
    <button class="arch-btn" data-arch-share>Copy share link</button>
    <button class="arch-btn" data-arch-export>Export JSON</button>
    <span class="arch-hint">Tip: drag a block from the left; click <b>↔ link</b> on one node then another to connect them.</span>
  </div>
  <div class="arch-main">
    <div class="arch-pal">${palHtml}</div>
    <div class="arch-canvas-wrap">
      <div class="arch-canvas">
        <svg class="arch-svg"></svg>
        <div class="arch-empty">Drag service blocks here to start sketching your architecture.</div>
      </div>
    </div>
    <div class="arch-side">
      <div class="arch-side-h">Layer coverage</div>
      <div class="arch-cov"></div>
      <p class="arch-note">Self-check only — this shows which architecture layers your current canvas includes. It is a reflection of what you placed, not a quality score or assessment.</p>
      <div class="arch-side-h">Saved designs</div>
      <div class="arch-saved"></div>
    </div>
  </div>
</div>`;

    elCanvas = container.querySelector('.arch-canvas');
    elSvg = container.querySelector('.arch-svg');
    elCov = container.querySelector('.arch-cov');
    elSaved = container.querySelector('.arch-saved');
    elEmpty = container.querySelector('.arch-empty');

    // palette drag + click-to-add fallback
    container.querySelectorAll('[data-arch-add]').forEach(chip => {
      const parse = () => { const [svcId, layer, name] = chip.getAttribute('data-arch-add').split('|'); return { svcId, layer, name }; };
      chip.addEventListener('dragstart', e => { try { e.dataTransfer.setData('text/plain', chip.getAttribute('data-arch-add')); } catch (x) {} });
      chip.addEventListener('click', () => { const i = state.nodes.length; addNode(parse(), 24 + (i % 4) * 185, 24 + Math.floor(i / 4) * 92); });
    });
    const wrap = container.querySelector('.arch-canvas-wrap');
    wrap.addEventListener('dragover', e => e.preventDefault());
    wrap.addEventListener('drop', e => {
      e.preventDefault();
      const data = (() => { try { return e.dataTransfer.getData('text/plain'); } catch (x) { return ''; } })();
      if (!data) return;
      const [svcId, layer, name] = data.split('|');
      const r = elCanvas.getBoundingClientRect();
      addNode({ svcId, layer, name }, e.clientX - r.left - 60, e.clientY - r.top - 20);
    });

    const tplSel = container.querySelector('.arch-tpl');
    if (tplSel) tplSel.addEventListener('change', () => {
      const key = tplSel.value; if (!key) return;
      const apply = () => { loadTemplate(key); tplSel.value = ''; if (TV.DS && TV.DS.toast) TV.DS.toast('Template loaded', { type: 'success' }); };
      if (state.nodes.length && TV.DS && TV.DS.confirm) {
        TV.DS.confirm({ message: 'Replace the current canvas with this template?', confirmText: 'Load template' })
          .then(okd => { if (okd) apply(); else tplSel.value = ''; });
      } else apply();
    });
    container.querySelector('[data-arch-clear]').addEventListener('click', () => {
      const doClear = () => { state = { nodes: [], edges: [], seq: 1 }; connectFrom = null; redraw(); };
      if (!state.nodes.length) { doClear(); return; }
      if (TV.DS && TV.DS.confirm) {
        TV.DS.confirm({ message: 'Clear the canvas?', confirmText: 'Clear', danger: true }).then(okd => { if (okd) doClear(); });
      } else if (confirm('Clear the canvas?')) doClear();
    });
    container.querySelector('[data-arch-save]').addEventListener('click', () => {
      const nm = (prompt('Name this design:') || '').trim();
      if (!nm) return;
      const d = loadDesigns(); d[nm] = JSON.parse(JSON.stringify(state)); saveDesigns(d); renderSaved();
      if (TV.DS && TV.DS.toast) TV.DS.toast('Design saved', { type: 'success' });
    });
    container.querySelector('[data-arch-share]').addEventListener('click', () => {
      if (!state.nodes.length) { if (TV.DS && TV.DS.toast) TV.DS.toast('Add something to the canvas first', { type: 'info' }); return; }
      const url = shareURL();
      const okMsg = () => { if (TV.DS && TV.DS.toast) TV.DS.toast('Share link copied', { type: 'success' }); };
      if (TV.DS && TV.DS.copy) TV.DS.copy(url).then(okMsg).catch(() => { if (TV.DS.toast) TV.DS.toast('Copy failed', { type: 'error' }); });
      else if (navigator.clipboard) navigator.clipboard.writeText(url).then(okMsg).catch(() => {});
    });
    container.querySelector('[data-arch-export]').addEventListener('click', () => {
      try {
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'architecture.json'; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      } catch (x) { if (TV.DS && TV.DS.toast) TV.DS.toast('Export not available', { type: 'error' }); }
    });

    redraw();
    renderSaved();
    if (importedFromURL && TV.DS && TV.DS.toast) TV.DS.toast('Loaded shared design from link', { type: 'success' });
  }

  function destroy() { if (TV.AnimationControls) TV.AnimationControls.hide(); }

  const MODULE = { id: 'architecture-studio', title: 'Architecture Studio', group: 'overview', render, destroy };
  function register() {
    ['azure', 'databricks', 'aws', 'fabric', 'multi-cloud'].forEach(fmt => {
      TV.registerModule(fmt, Object.assign({}, MODULE, { format: fmt }));
      const desc = TV.formats && TV.formats[fmt];
      if (!desc || !Array.isArray(desc.navGroups)) return;
      const item = { id: 'architecture-studio', label: 'Architecture Studio', icon: 'git-branch', available: true };
      const grp = desc.navGroups.find(g => g.id === 'overview');
      if (grp) { if (!grp.items.some(it => it.id === 'architecture-studio')) grp.items.push(item); }
      else desc.navGroups.unshift({ id: 'overview', label: 'Overview', items: [item] });
    });
  }

  register();
  TV.ArchitectureStudio = { register, render, destroy };
})();
