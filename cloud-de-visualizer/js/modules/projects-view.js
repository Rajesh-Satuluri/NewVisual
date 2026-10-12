/* ============================================================
   Cloud DE Visualizer — Project Tracks view (Phase 4 / L4.2).

   Registers a "Project Tracks" list + one page per track into
   every format (azure/databricks/aws/fabric/multi-cloud), under a
   "Build" nav group. A track page shows the architecture, skills,
   cert mapping and ordered stages with a per-stage completion
   checkbox persisted in localStorage (key cde-pt-<trackId>), a
   progress bar, and a TV.Progress hook when available.

   Prefix: pt-.
   ============================================================ */
(function () {
  'use strict';
  const TV = window.TableViz;
  if (!TV.ProjectTracks) return;

  const CLOUD_LABEL = { aws: 'AWS', azure: 'Azure', databricks: 'Databricks', fabric: 'Fabric', 'multi-cloud': 'Cross-cloud' };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
  }
  function key(id) { return 'cde-pt-' + id; }
  function getDone(id) {
    try { const v = JSON.parse(localStorage.getItem(key(id)) || '[]'); return Array.isArray(v) ? v : []; }
    catch (_) { return []; }
  }
  function setDone(id, arr) { try { localStorage.setItem(key(id), JSON.stringify(arr)); } catch (_) {} }
  function pct(t) {
    const total = (t.stages || []).length || 1;
    const done = getDone(t.id).filter(sid => (t.stages || []).some(s => s.id === sid)).length;
    return Math.round((done / total) * 100);
  }

  function styleTag() {
    if (document.getElementById('pt-styles')) return '';
    return `
<style id="pt-styles">
.pt { height:100%; overflow-y:auto; padding:30px 32px 72px; }
.pt-wrap { max-width:900px; margin:0 auto; }
.pt-eyebrow { font-size:11px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:var(--brand); margin-bottom:8px; }
.pt-h1 { font-size:27px; font-weight:800; letter-spacing:-.02em; color:var(--text-primary); margin:0 0 8px; }
.pt-intro { font-size:15px; color:var(--text-secondary); line-height:1.7; margin:0 0 22px; max-width:800px; }
.pt-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(270px,1fr)); gap:14px; }
.pt-card { display:block; text-decoration:none; background:var(--bg-2); border:1px solid var(--border-default); border-radius:14px; padding:16px 18px; transition:border-color .12s, transform .12s, box-shadow .12s; }
.pt-card:hover { border-color:var(--brand); transform:translateY(-2px); box-shadow:var(--lift); text-decoration:none; }
.pt-card-top { display:flex; align-items:center; gap:8px; margin-bottom:9px; flex-wrap:wrap; }
.pt-tag { font-size:10px; font-weight:800; letter-spacing:.04em; text-transform:uppercase; padding:2px 8px; border-radius:999px; background:var(--bg-4); color:var(--text-muted); }
.pt-tag--cloud { background:var(--brand-glow); color:var(--brand); }
.pt-card-name { font-size:16px; font-weight:800; color:var(--text-primary); margin-bottom:6px; }
.pt-card-sum { font-size:13px; color:var(--text-secondary); line-height:1.55; }
.pt-bar { height:6px; border-radius:999px; background:var(--bg-4); overflow:hidden; margin-top:12px; }
.pt-bar-fill { height:100%; background:var(--green); border-radius:999px; transition:width .25s; }
.pt-card-meta { margin-top:8px; font-size:12px; color:var(--text-muted); font-weight:600; display:flex; justify-content:space-between; }
.pt-back { display:inline-flex; align-items:center; gap:6px; font-size:13px; color:var(--brand); text-decoration:none; margin-bottom:16px; }
.pt-back:hover { text-decoration:underline; }
.pt-panel { border:1px solid var(--border-default); border-radius:14px; padding:16px 18px; margin-bottom:16px; background:var(--bg-2); }
.pt-panel-h { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); margin-bottom:11px; }
.pt-arch { display:grid; gap:7px; }
.pt-arch-step { display:flex; gap:9px; align-items:flex-start; font-size:13px; color:var(--text-secondary); line-height:1.6; }
.pt-arch-step::before { content:'→'; color:var(--brand); font-weight:800; }
.pt-chips { display:flex; flex-wrap:wrap; gap:7px; }
.pt-chip { font-size:12px; color:var(--text-secondary); background:var(--bg-1); border:1px solid var(--border-subtle); border-radius:999px; padding:4px 11px; }
.pt-outcome { border-left:3px solid var(--green); background:var(--green-subtle); border-radius:10px; padding:12px 15px; font-size:14px; color:var(--text-primary); line-height:1.6; margin-bottom:18px; }
.pt-prog { display:flex; align-items:center; gap:14px; margin:0 0 18px; flex-wrap:wrap; }
.pt-prog-pct { font-size:22px; font-weight:800; color:var(--green); }
.pt-prog .pt-bar { flex:1; min-width:160px; margin-top:0; }
.pt-reset { cursor:pointer; font:inherit; font-size:12px; font-weight:700; color:var(--text-muted); background:none; border:1px solid var(--border-default); border-radius:8px; padding:5px 11px; }
.pt-reset:hover { color:var(--text-primary); border-color:var(--brand); }
.pt-stage { border:1px solid var(--border-default); border-radius:14px; padding:0; margin-bottom:14px; background:var(--bg-2); overflow:hidden; }
.pt-stage.done { border-color:var(--green); }
.pt-stage-head { display:flex; gap:12px; align-items:flex-start; padding:15px 17px; }
.pt-stage-check { flex-shrink:0; margin-top:2px; width:20px; height:20px; accent-color:var(--green); cursor:pointer; }
.pt-stage-main { flex:1; }
.pt-stage-n { font-size:11px; font-weight:800; color:var(--brand); text-transform:uppercase; letter-spacing:.05em; }
.pt-stage-title { font-size:16px; font-weight:800; color:var(--text-primary); margin:2px 0 4px; }
.pt-stage.done .pt-stage-title { text-decoration:line-through; color:var(--text-muted); }
.pt-stage-obj { font-size:13px; color:var(--text-secondary); line-height:1.6; }
.pt-stage-body { padding:0 17px 16px 49px; }
.pt-stage-svcs { display:flex; flex-wrap:wrap; gap:6px; margin:4px 0 12px; }
.pt-svc { font-size:11px; font-weight:700; color:var(--brand); background:var(--brand-glow); border-radius:999px; padding:3px 9px; text-decoration:none; }
a.pt-svc:hover { text-decoration:underline; }
.pt-sub { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.05em; color:var(--text-muted); margin:10px 0 6px; }
.pt-steps { margin:0; padding-left:20px; } .pt-steps li { font-size:13px; color:var(--text-secondary); line-height:1.7; }
.pt-deliver { font-size:13px; color:var(--text-primary); line-height:1.6; background:var(--bg-1); border:1px solid var(--border-subtle); border-radius:9px; padding:9px 12px; margin-top:4px; }
.pt-deliver b { color:var(--brand); }
.pt-verify { margin:6px 0 0; padding-left:20px; } .pt-verify li { font-size:13px; color:var(--text-secondary); line-height:1.7; }
.pt-refs { display:flex; flex-wrap:wrap; gap:9px; }
.pt-ref { font-size:12px; color:var(--brand); text-decoration:none; border:1px solid var(--border-default); border-radius:8px; padding:6px 11px; }
.pt-ref:hover { border-color:var(--brand); text-decoration:none; }
.pt-cm { display:flex; flex-wrap:wrap; gap:7px; }
.pt-cm-item { font-size:12px; font-weight:700; color:var(--text-secondary); background:var(--bg-1); border:1px solid var(--border-subtle); border-radius:8px; padding:5px 11px; }
</style>`;
  }

  /* ── List ────────────────────────────────────────────────── */
  function renderList(container, format) {
    container.className = '';
    const styles = styleTag();
    const tracks = TV.ProjectTracks.all();
    const cards = tracks.map(t => {
      const p = pct(t);
      return `
      <a class="pt-card" href="#${format}/pt-${esc(t.id)}">
        <div class="pt-card-top">
          <span class="pt-tag pt-tag--cloud">${esc(CLOUD_LABEL[t.cloud] || t.cloud)}</span>
          <span class="pt-tag">${esc(t.level)}</span>
        </div>
        <div class="pt-card-name">${esc(t.title)}</div>
        <div class="pt-card-sum">${esc(t.summary)}</div>
        <div class="pt-bar"><div class="pt-bar-fill" style="width:${p}%"></div></div>
        <div class="pt-card-meta"><span>${(t.stages || []).length} stages</span><span>${p}% complete</span></div>
      </a>`;
    }).join('');
    container.innerHTML = `${styles}
<div class="pt page-enter">
  <div class="pt-wrap">
    <div class="pt-eyebrow">Hands-on · portfolio builds</div>
    <h1 class="pt-h1">Project Tracks</h1>
    <p class="pt-intro">End-to-end builds you run in your own account and show in interviews — not single-service labs. Each track chains real services into a working platform, stage by stage, with a concrete deliverable and verification at every step. Progress is saved on this device.</p>
    <div class="pt-grid">${cards}</div>
  </div>
</div>`;
  }

  /* ── Track detail ────────────────────────────────────────── */
  function renderTrack(container, format, t) {
    container.className = '';
    const styles = styleTag();
    const done = new Set(getDone(t.id));
    const arch = (t.architecture || []).map(a => `<div class="pt-arch-step">${esc(a)}</div>`).join('');
    const skills = (t.skills || []).map(s => `<span class="pt-chip">${esc(s)}</span>`).join('');
    const cm = (t.certMapping || []).map(c => `<span class="pt-cm-item">${esc(c.label)}</span>`).join('');
    const refs = (t.refs || []).map(r => `<a class="pt-ref" href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.label)} ↗</a>`).join('');
    const stages = (t.stages || []).map((s, i) => {
      const isDone = done.has(s.id);
      const svcs = (s.services || []).map(sv => `<a class="pt-svc" href="#${esc(format)}/${esc(sv)}">${esc(sv)}</a>`).join('');
      const steps = (s.steps || []).map(x => `<li>${esc(x)}</li>`).join('');
      const verify = (s.verify || []).map(x => `<li>${esc(x)}</li>`).join('');
      return `
      <div class="pt-stage${isDone ? ' done' : ''}" data-stage="${esc(s.id)}">
        <div class="pt-stage-head">
          <input type="checkbox" class="pt-stage-check" ${isDone ? 'checked' : ''} aria-label="Mark stage complete" />
          <div class="pt-stage-main">
            <div class="pt-stage-n">Stage ${i + 1}</div>
            <div class="pt-stage-title">${esc(s.title)}</div>
            <div class="pt-stage-obj">${esc(s.objective)}</div>
          </div>
        </div>
        <div class="pt-stage-body">
          ${svcs ? `<div class="pt-stage-svcs">${svcs}</div>` : ''}
          ${steps ? `<div class="pt-sub">Steps</div><ol class="pt-steps">${steps}</ol>` : ''}
          ${s.deliverable ? `<div class="pt-sub">Deliverable</div><div class="pt-deliver"><b>✓</b> ${esc(s.deliverable)}</div>` : ''}
          ${verify ? `<div class="pt-sub">Verify</div><ul class="pt-verify">${verify}</ul>` : ''}
        </div>
      </div>`;
    }).join('');
    const p = pct(t);
    container.innerHTML = `${styles}
<div class="pt page-enter">
  <div class="pt-wrap">
    <a class="pt-back" href="#${esc(format)}/project-tracks">← All project tracks</a>
    <div class="pt-eyebrow">${esc(CLOUD_LABEL[t.cloud] || t.cloud)} · ${esc(t.level)}</div>
    <h1 class="pt-h1">${esc(t.title)}</h1>
    <p class="pt-intro">${esc(t.summary)}</p>
    <div class="pt-outcome"><b>Outcome:</b> ${esc(t.outcome)}</div>
    <div class="pt-prog">
      <span class="pt-prog-pct" id="pt-pct">${p}%</span>
      <div class="pt-bar"><div class="pt-bar-fill" id="pt-fill" style="width:${p}%"></div></div>
      <button class="pt-reset" id="pt-reset">Reset progress</button>
    </div>
    <div class="pt-panel"><div class="pt-panel-h">Architecture</div><div class="pt-arch">${arch}</div></div>
    <div class="pt-panel"><div class="pt-panel-h">Skills demonstrated</div><div class="pt-chips">${skills}</div></div>
    ${stages}
    ${cm ? `<div class="pt-panel"><div class="pt-panel-h">Certification mapping</div><div class="pt-cm">${cm}</div></div>` : ''}
    ${refs ? `<div class="pt-panel"><div class="pt-panel-h">Official references</div><div class="pt-refs">${refs}</div></div>` : ''}
  </div>
</div>`;

    function refresh() {
      const np = pct(t);
      const pctEl = container.querySelector('#pt-pct');
      const fill = container.querySelector('#pt-fill');
      if (pctEl) pctEl.textContent = np + '%';
      if (fill) fill.style.width = np + '%';
      if (TV.Progress && TV.Progress.recordProjectStage) {
        try { TV.Progress.recordProjectStage(t.id, np); } catch (_) {}
      }
    }
    container.querySelectorAll('.pt-stage').forEach(row => {
      const cb = row.querySelector('.pt-stage-check');
      cb.addEventListener('change', () => {
        const sid = row.dataset.stage;
        const cur = new Set(getDone(t.id));
        if (cb.checked) cur.add(sid); else cur.delete(sid);
        setDone(t.id, [...cur]);
        row.classList.toggle('done', cb.checked);
        refresh();
      });
    });
    const reset = container.querySelector('#pt-reset');
    if (reset) reset.addEventListener('click', () => {
      setDone(t.id, []);
      container.querySelectorAll('.pt-stage').forEach(row => {
        row.classList.remove('done');
        const cb = row.querySelector('.pt-stage-check'); if (cb) cb.checked = false;
      });
      refresh();
    });
  }

  /* ── Registration (all formats, "Build" nav group) ───────── */
  const FORMATS = ['azure', 'databricks', 'aws', 'fabric', 'multi-cloud'];
  function register() {
    FORMATS.forEach(fmt => {
      TV.registerModule(fmt, {
        id: 'project-tracks', title: 'Project Tracks', group: 'build', format: fmt,
        render(container) { renderList(container, fmt); },
        destroy() { if (TV.AnimationControls) TV.AnimationControls.hide(); },
      });
      TV.ProjectTracks.all().forEach(t => {
        TV.registerModule(fmt, {
          id: 'pt-' + t.id, title: t.title, group: 'build-detail', format: fmt,
          render(container) { renderTrack(container, fmt, t); },
          destroy() { if (TV.AnimationControls) TV.AnimationControls.hide(); },
        });
      });
      const desc = TV.formats && TV.formats[fmt];
      if (!desc || !Array.isArray(desc.navGroups)) return;
      if (!desc.navGroups.some(g => g.id === 'build')) {
        const grp = { id: 'build', label: 'Build', items: [{ id: 'project-tracks', label: 'Project Tracks', icon: 'package', available: true }] };
        const operate = desc.navGroups.findIndex(g => g.id === 'operate');
        if (operate !== -1) desc.navGroups.splice(operate + 1, 0, grp); else desc.navGroups.push(grp);
      } else {
        const g = desc.navGroups.find(x => x.id === 'build');
        if (g && !g.items.some(it => it.id === 'project-tracks')) g.items.push({ id: 'project-tracks', label: 'Project Tracks', icon: 'package', available: true });
      }
    });
  }

  register();
  TV.ProjectsView = { register };
})();
