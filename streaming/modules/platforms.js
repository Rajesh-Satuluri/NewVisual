// Unified platform switcher (I50) — a segmented control in the SIDEBAR that
// swaps between Kafka · Flink · AWS · Azure · Databricks · ⇄ Compare in place,
// no page reload (modeled on the cloud-dwh platform-switch mechanism).
//
// The switcher is injected at the top of the sidebar while this view is active
// and removed on cleanup. Accent recolor is driven by <html data-platform>.
// Kafka/Flink render as embedded frames of the byte-preserved sub-apps (never
// mutated → preservation stays 93/93); AWS/Azure/Databricks render natively
// inline via the lesson shell; Compare mounts the comparison hub.
import { PLATFORMS, ORDER, getPlatform, isPlatform, lastPlatform, rememberPlatform } from '../data/platforms.js';
import { getProvider } from '../data/cloud-providers.js';
import { createLessonShell, initTabs } from '../components/lesson-shell.js';
import { getScenario } from '../data/scenarios.js';
import { isDone, markDone, unmarkDone } from '../data/progress-store.js';
import { updateProgress, setActive } from '../components/nav.js';
import { pipelineDiagram } from './foundation-sims.js';

const fill = (html, sc) => html
  .replace(/\{ENTITY\}/g, sc.entity).replace(/\{KEY\}/g, sc.keyField).replace(/\{ID\}/g, sc.canonicalId);

let _stage = null;
let _platform = null;

export async function mount(container, sub) {
  // sub is the hash tail after "platforms": "", "kafka", or "aws/aws03".
  const parts = String(sub || '').split('/').filter(Boolean);
  const startId = isPlatform(parts[0]) ? parts[0] : lastPlatform();
  const startMod = parts[1] || null;

  setActive('platforms');
  container.innerHTML = `<div class="plat-stage" id="plat-stage"></div>`;
  _stage = container.querySelector('#plat-stage');

  // Foundations modules reuse the shell renderers, which bind [data-go] nav to
  // location.hash. Intercept those clicks in the capture phase so drill-down
  // stays inside the switcher instead of routing away.
  _stage.addEventListener('click', (e) => {
    if (_platform !== 'foundations') return;
    const go = e.target.closest('[data-go]');
    if (!go) return;
    e.preventDefault(); e.stopPropagation();
    const t = go.dataset.go;
    if (isPlatform(t)) setPlatform(t, null);        // "All foundations" / "Continue to Kafka"
    else setPlatform('foundations', t);             // a foundation module id (fNN)
  }, true);

  injectSidebarSwitcher();
  await setPlatform(startId, startMod);

  // cleanup when leaving the platforms view
  return () => {
    removeSidebarSwitcher();
    try { delete document.documentElement.dataset.platform; } catch (e) {}
    _stage = null;
    _platform = null;
  };
}

// ── Sidebar switcher ────────────────────────────────────────────────────────
function injectSidebarSwitcher() {
  const nav = document.getElementById('nav-list');
  if (!nav) return;
  let host = document.getElementById('plat-switch-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'plat-switch-host';
    nav.parentNode.insertBefore(host, nav);
  }
  const real = PLATFORMS.filter(p => ORDER.includes(p.id));
  const compare = PLATFORMS.find(p => p.id === 'compare');
  host.innerHTML = `
    <div class="plat-switch">
      <div class="plat-brand"><span class="plat-brand-ico">⚡</span> Platforms</div>
      <div class="plat-grid">
        ${real.map(p => `<button class="plat-seg" data-platform="${p.id}" title="${p.label} — ${p.tagline}">${p.short}</button>`).join('')}
      </div>
      ${compare ? `<button class="plat-seg plat-seg--compare" data-platform="compare" title="${compare.label}">${compare.short}</button>` : ''}
    </div>`;
  host.querySelectorAll('.plat-seg').forEach(b =>
    b.addEventListener('click', () => setPlatform(b.dataset.platform, null)));
}

function removeSidebarSwitcher() {
  document.getElementById('plat-switch-host')?.remove();
}

function syncSegments(id) {
  document.querySelectorAll('#plat-switch-host .plat-seg').forEach(b =>
    b.classList.toggle('active', b.dataset.platform === id));
}

// ── Switch ──────────────────────────────────────────────────────────────────
async function setPlatform(id, moduleId = null) {
  const p = getPlatform(id);
  if (!p || !_stage) return;
  _platform = id;
  rememberPlatform(id);
  document.documentElement.dataset.platform = id;   // drives accent tokens
  syncSegments(id);
  reflectHash(id, moduleId);

  const crumb = document.getElementById('breadcrumb');
  if (crumb) crumb.innerHTML = `Platforms &rsaquo; <strong>${p.label}</strong>`;

  _stage.scrollTop = 0;
  if (p.kind === 'foundations') return renderFoundations(moduleId);
  if (p.kind === 'frame') return renderFrame(p);
  if (p.kind === 'cloud') return renderCloud(p, moduleId);
  if (p.kind === 'compare') return renderCompare();
}

// ── Foundations — native inline (reuses the shell renderers) ────────────────
async function renderFoundations(moduleId) {
  const [fnd, fm, data] = await Promise.all([
    import('./foundations.js'), import('./foundation.js'), import('../data/foundations.js'),
  ]);
  if (moduleId && data.foundationById(moduleId)) fm.mount(_stage, moduleId);
  else fnd.mount(_stage);
}

function reflectHash(id, moduleId) {
  const h = '#platforms/' + id + (moduleId ? '/' + moduleId : '');
  if (location.hash !== h) { try { history.replaceState(null, '', h); } catch (e) { location.hash = h; } }
}

// ── Kafka / Flink — embedded preserved sub-app ──────────────────────────────
function renderFrame(p) {
  _stage.innerHTML = `
    <div class="plat-frame-bar">
      <span class="plat-frame-dot"></span>
      <span>${p.label} — full interactive app, ${p.tagline}.</span>
      <a class="plat-frame-open" href="${p.url}" target="_blank" rel="noopener">Open in full screen ↗</a>
    </div>
    <iframe class="plat-frame" src="${p.url}" title="${p.label}" loading="lazy"></iframe>`;
}

// ── AWS / Azure / Databricks — native inline ────────────────────────────────
async function renderCloud(p, moduleId) {
  const prov = await getProvider(p.provider);
  if (!prov) { _stage.innerHTML = `<div class="card">Provider not available yet.</div>`; return; }
  if (moduleId && prov.modules.some(m => m.id === moduleId)) return renderCloudModule(p, prov, moduleId);

  _stage.innerHTML = `
    <div class="page-head">
      <div class="page-eyebrow">${prov.name}</div>
      <h1 class="page-title">${prov.icon} ${prov.name}</h1>
      <p class="page-sub">${prov.blurb}</p>
    </div>
    <div class="fnd-grid">
      ${prov.modules.map(m => `
        <div class="card fnd-card" data-mod="${m.id}">
          <span class="fnd-num">${m.num}</span>
          <div>
            <h3>${m.icon || ''} ${m.title} ${isDone(m.id) ? '<span class="pill live" style="margin-left:4px">✓</span>' : ''}</h3>
            <p>${m.idea}</p>
          </div>
        </div>`).join('')}
    </div>`;
  _stage.querySelectorAll('[data-mod]').forEach(c =>
    c.addEventListener('click', () => setPlatform(p.id, c.dataset.mod)));
}

function renderCloudModule(p, prov, id) {
  const idx = prov.modules.findIndex(m => m.id === id);
  const m = prov.modules[idx];
  const sc = getScenario();
  const prev = prov.modules[idx - 1], next = prov.modules[idx + 1];
  const tabs = m.tabs.map(t => ({ id: t.id, label: t.label, body: fill(t.body, sc) }));

  _stage.innerHTML =
    createLessonShell({ tag: `${prov.name} · Module ${m.num}`, title: `${m.icon || ''} ${m.title}`, subtitle: m.idea, tabs })
    + `<div class="lx-nav">
        <div>${prev ? `<button class="btn" data-mod="${prev.id}">← ${prev.num}</button>` : `<button class="btn" data-grid>← All ${prov.name}</button>`}</div>
        <div style="display:flex;gap:10px">
          <button class="btn" id="cl-done">${isDone(id) ? '✓ Completed' : 'Mark complete'}</button>
          ${next ? `<button class="btn primary" data-mod="${next.id}">${next.num} ${next.title} →</button>` : `<button class="btn primary" data-grid>Back to ${prov.name} ↩</button>`}
        </div>
      </div>`;
  initTabs(_stage);

  const pipe = _stage.querySelector('#' + id + '-pipeline');
  if (pipe) { const panel = pipe.closest('.lx-panel'); const run = () => pipelineDiagram(pipe, sc); if (!panel || panel.classList.contains('active')) run(); else panel.__onShow = run; }

  _stage.querySelectorAll('[data-mod]').forEach(b => b.addEventListener('click', () => setPlatform(p.id, b.dataset.mod)));
  _stage.querySelectorAll('[data-grid]').forEach(b => b.addEventListener('click', () => setPlatform(p.id, null)));
  const doneBtn = _stage.querySelector('#cl-done');
  doneBtn?.addEventListener('click', () => {
    if (isDone(id)) { unmarkDone(id); doneBtn.textContent = 'Mark complete'; }
    else { markDone(id); doneBtn.textContent = '✓ Completed'; }
    updateProgress();
  });
}

// ── Compare — comparison hub ────────────────────────────────────────────────
async function renderCompare() {
  try {
    const mod = await import('./engines.js');
    await mod.mount(_stage, 'engines');
  } catch (e) {
    _stage.innerHTML = `<div class="card"><h3>Could not load Compare</h3><p style="color:var(--text2)">${String(e && e.message || e)}</p></div>`;
  }
}
