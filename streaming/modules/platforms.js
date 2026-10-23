// Unified platform switcher (I50) — a blended, platform-aware shell modeled on
// the cloud-dwh / iceberg mechanism. While this view is active the ENTIRE
// sidebar becomes the platform experience:
//
//   ┌──────────────────────────┐
//   │  ⚡ segmented switcher     │  ← Foundations · Kafka · Flink · AWS ·
//   │                          │     Azure · Databricks · ⇄ Compare
//   ├──────────────────────────┤
//   │  <active tool's OWN nav>  │  ← that tool's grouped module tree,
//   │   Foundation             │     rebuilt in place on every switch
//   │    • Why Kafka           │
//   │    • Architecture …      │
//   └──────────────────────────┘
//
// Switching a segment swaps the whole nav tree + accent + brand + breadcrumb,
// no page reload. Content renders natively inline for Foundations / AWS /
// Azure / Databricks / Compare. Kafka & Flink are byte-preserved standalone
// apps, so their nav tree is built from their own importable MODULES manifest
// and each click deep-links one persistent iframe (#<module>) — never editing
// a preserved file, so preservation stays 93/93.
import { PLATFORMS, ORDER, getPlatform, isPlatform, lastPlatform, rememberPlatform } from '../data/platforms.js';
import { getProvider } from '../data/cloud-providers.js';
import { createLessonShell, initTabs } from '../components/lesson-shell.js';
import { getScenario } from '../data/scenarios.js';
import { isDone, markDone, unmarkDone } from '../data/progress-store.js';
import { updateProgress, setActive, renderNav } from '../components/nav.js';
import { pipelineDiagram } from './foundation-sims.js';
import { FOUNDATIONS, foundationById } from '../data/foundations.js';
import { MODULES as KAFKA_MODULES } from '../kafka/components/nav.js';
import { MODULES as FLINK_MODULES } from '../flink/components/nav.js';

const fill = (html, sc) => html
  .replace(/\{ENTITY\}/g, sc.entity).replace(/\{KEY\}/g, sc.keyField).replace(/\{ID\}/g, sc.canonicalId);

let _stage = null;
let _platform = null;
let _brandSaved = null;

// Thematic grouping for the 15 flat Foundations modules (cosmetic only).
const FND_GROUPS = [
  ['First principles',   ['f01', 'f02', 'f03', 'f04', 'f05']],
  ['Time & correctness', ['f06', 'f07', 'f08', 'f09']],
  ['State & delivery',   ['f10', 'f11', 'f12', 'f13']],
  ['Operating it',       ['f14', 'f15']],
];

// Compare hub tools (mirror of modules/engines.js TOOLS, kept in sync by id).
const COMPARE_TOOLS = [
  { id: 'eng-graph',    icon: '🕸️', label: 'Concept graph' },
  { id: 'eng-compare',  icon: '📊', label: 'Comparison matrix' },
  { id: 'eng-trace',    icon: '🔎', label: 'Trace One Event' },
  { id: 'eng-break',    icon: '💥', label: 'Break the Pipeline' },
  { id: 'eng-builder',  icon: '🏗️', label: 'Architecture Builder' },
  { id: 'eng-decide',   icon: '🧭', label: 'Decision Engine' },
  { id: 'eng-capacity', icon: '🧮', label: 'Capacity calculator' },
];

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

  injectSidebarShell();
  await setPlatform(startId, startMod);

  // cleanup when leaving the platforms view — restore the global shell nav
  return () => {
    removeSidebarShell();
    try { delete document.documentElement.dataset.platform; } catch (e) {}
    _stage = null;
    _platform = null;
  };
}

// ── Sidebar shell: switcher + per-platform nav tree ─────────────────────────
function injectSidebarShell() {
  const nav = document.getElementById('nav-list');
  if (!nav) return;
  nav.style.display = 'none';                     // hide the global shell nav

  let rail = document.getElementById('plat-rail');
  if (!rail) {
    rail = document.createElement('div');
    rail.id = 'plat-rail';
    nav.parentNode.insertBefore(rail, nav);
  }
  const real = PLATFORMS.filter(p => ORDER.includes(p.id));
  const compare = PLATFORMS.find(p => p.id === 'compare');
  rail.innerHTML = `
    <div class="plat-switch">
      <div class="plat-brand"><span class="plat-brand-ico">⚡</span> Platforms</div>
      <div class="plat-grid">
        ${real.map(p => `<button class="plat-seg" data-platform="${p.id}" title="${p.label} — ${p.tagline}">${p.short}</button>`).join('')}
      </div>
      ${compare ? `<button class="plat-seg plat-seg--compare" data-platform="compare" title="${compare.label}">${compare.short}</button>` : ''}
    </div>
    <nav class="plat-nav" id="plat-nav" aria-label="Platform navigation"></nav>`;
  rail.querySelectorAll('.plat-seg').forEach(b =>
    b.addEventListener('click', () => setPlatform(b.dataset.platform, null)));

  // Remember the shell brand so we can restore it on cleanup.
  const title = document.querySelector('.brand-title');
  const subEl = document.querySelector('.brand-sub');
  _brandSaved = { title: title ? title.textContent : null, sub: subEl ? subEl.textContent : null };
}

function removeSidebarShell() {
  document.getElementById('plat-rail')?.remove();
  const nav = document.getElementById('nav-list');
  if (nav) nav.style.display = '';
  if (_brandSaved) {
    const title = document.querySelector('.brand-title');
    const subEl = document.querySelector('.brand-sub');
    if (title && _brandSaved.title != null) title.textContent = _brandSaved.title;
    if (subEl && _brandSaved.sub != null) subEl.textContent = _brandSaved.sub;
    _brandSaved = null;
  }
  try { renderNav('platforms'); } catch (e) {}   // rebuild the real nav underneath
}

function syncSegments(id) {
  document.querySelectorAll('#plat-rail .plat-seg').forEach(b =>
    b.classList.toggle('active', b.dataset.platform === id));
}

function applyBrand(p) {
  const title = document.querySelector('.brand-title');
  const subEl = document.querySelector('.brand-sub');
  if (title) title.textContent = p.label;
  if (subEl) subEl.textContent = p.tagline;
}

// ── Per-platform nav model ──────────────────────────────────────────────────
function groupBy(items) {
  const order = [];
  const map = new Map();
  for (const it of items) {
    const g = it.group || 'Modules';
    if (!map.has(g)) { map.set(g, []); order.push(g); }
    map.get(g).push(it);
  }
  return order.map(label => ({ label, items: map.get(label) }));
}

async function navModel(id) {
  if (id === 'foundations') {
    const byId = Object.fromEntries(FOUNDATIONS.map(m => [m.id, m]));
    const seen = new Set();
    const groups = FND_GROUPS.map(([label, ids]) => ({
      label,
      items: ids.filter(x => byId[x]).map(x => { seen.add(x); const m = byId[x]; return { id: m.id, icon: m.icon, label: `${m.num} · ${m.title}` }; }),
    })).filter(g => g.items.length);
    const extra = FOUNDATIONS.filter(m => !seen.has(m.id)).map(m => ({ id: m.id, icon: m.icon, label: `${m.num} · ${m.title}` }));
    if (extra.length) groups.push({ label: 'More', items: extra });
    return groups;
  }
  if (id === 'kafka') return groupBy(KAFKA_MODULES.map(m => ({ id: m.id, icon: m.icon, label: m.label, group: m.group })));
  if (id === 'flink') return groupBy(FLINK_MODULES.map(m => ({ id: m.id, icon: m.icon, label: `${m.num ? m.num + ' · ' : ''}${m.title}`, group: m.group })));
  if (id === 'compare') return [{ label: 'Compare engines & clouds', items: COMPARE_TOOLS.map(t => ({ id: t.id, icon: t.icon, label: t.label })) }];
  // cloud providers
  const p = getPlatform(id);
  if (p && p.kind === 'cloud') {
    const prov = await getProvider(p.provider);
    if (prov) return [{ label: prov.name, items: prov.modules.map(m => ({ id: m.id, icon: m.icon || '•', label: `${m.num} · ${m.title}` })) }];
  }
  return [];
}

function renderNavTree(groups, activeModuleId) {
  const host = document.getElementById('plat-nav');
  if (!host) return;
  let html = '';
  for (const g of groups) {
    html += `<div class="nav-group-label">${g.label}</div>`;
    for (const it of g.items) {
      const active = it.id === activeModuleId ? ' active' : '';
      html += `<div class="nav-item${active}" data-mod="${it.id}" role="link" tabindex="0">
        <span class="ni-icon">${it.icon}</span><span>${it.label}</span>${isDone(it.id) ? '<span class="ni-badge live">✓</span>' : ''}
      </div>`;
    }
  }
  host.innerHTML = html;
  host.querySelectorAll('[data-mod]').forEach(n =>
    n.addEventListener('click', () => setPlatform(_platform, n.dataset.mod)));
}

function syncNavActive(moduleId) {
  document.querySelectorAll('#plat-nav .nav-item').forEach(n =>
    n.classList.toggle('active', n.dataset.mod === moduleId));
}

function setBreadcrumb(p, groups, moduleId) {
  const crumb = document.getElementById('breadcrumb');
  if (!crumb) return;
  let trail = `Platforms &rsaquo; <strong>${p.label}</strong>`;
  if (moduleId) {
    const g = groups.find(gr => gr.items.some(i => i.id === moduleId));
    const it = g && g.items.find(i => i.id === moduleId);
    if (g) trail += ` &rsaquo; <span>${g.label}</span>`;
    if (it) trail += ` &rsaquo; <strong>${it.label}</strong>`;
  }
  crumb.innerHTML = trail;
}

// ── Switch ──────────────────────────────────────────────────────────────────
async function setPlatform(id, moduleId = null) {
  const p = getPlatform(id);
  if (!p || !_stage) return;
  _platform = id;
  rememberPlatform(id);
  document.documentElement.dataset.platform = id;   // drives accent tokens
  syncSegments(id);
  applyBrand(p);
  reflectHash(id, moduleId);

  const groups = await navModel(id);
  renderNavTree(groups, moduleId);
  setBreadcrumb(p, groups, moduleId);

  _stage.scrollTop = 0;
  if (p.kind === 'foundations') return renderFoundations(moduleId);
  if (p.kind === 'frame') return renderFrame(p, moduleId);
  if (p.kind === 'cloud') return renderCloud(p, moduleId);
  if (p.kind === 'compare') return renderCompare(moduleId);
}

function reflectHash(id, moduleId) {
  const h = '#platforms/' + id + (moduleId ? '/' + moduleId : '');
  if (location.hash !== h) { try { history.replaceState(null, '', h); } catch (e) { location.hash = h; } }
}

// ── Foundations — native inline (reuses the shell renderers) ────────────────
async function renderFoundations(moduleId) {
  const [fnd, fm] = await Promise.all([import('./foundations.js'), import('./foundation.js')]);
  if (moduleId && foundationById(moduleId)) fm.mount(_stage, moduleId);
  else fnd.mount(_stage);
}

// ── Kafka / Flink — native nav tree driving one deep-linked preserved iframe ─
function renderFrame(p, moduleId) {
  // The embedded sub-app is same-origin, so it shares this localStorage. Its
  // first-run tour points at the sidebar we hide, so pre-dismiss it for a
  // seamless embed (never edits a preserved file).
  try { localStorage.setItem(p.id + '_tour_done', '1'); } catch (e) {}

  let frame = _stage.querySelector('.plat-frame');
  const needNew = !frame || frame.dataset.platform !== p.id;
  if (needNew) {
    const src = p.url + (moduleId ? '#' + moduleId : '');
    _stage.innerHTML = `<iframe class="plat-frame" data-platform="${p.id}" src="${src}" title="${p.label}" loading="lazy"></iframe>`;
    frame = _stage.querySelector('.plat-frame');
    const blend = () => blendFrameChrome(frame);
    frame.addEventListener('load', blend);
    blend(); // in case it is already loaded (cache)
  } else if (moduleId) {
    // Deep-link in place — no reload, no edit to the preserved sub-app.
    try { frame.contentWindow.location.hash = '#' + moduleId; }
    catch (e) { frame.src = p.url + '#' + moduleId; }
  }
}

// Same-origin: hide the preserved sub-app's OWN sidebar so our shell nav is the
// only navigation and the lesson fills the width — a style injection into the
// iframe, never an edit to a preserved file (preservation stays 93/93).
function blendFrameChrome(frame) {
  try {
    const doc = frame.contentDocument;
    if (!doc) return;
    if (doc.getElementById('plat-blend-style')) return;
    const st = doc.createElement('style');
    st.id = 'plat-blend-style';
    st.textContent = `
      #sidebar { display: none !important; }
      #app { display: block !important; }
      #content { margin-left: 0 !important; width: 100% !important; max-width: 100% !important; }
      /* Hide the sub-app's own top chrome — our shell already provides it */
      #module-header { display: none !important; }
      .nv-actions, .nv-backup, .nv-actions--fixed, .nv-backup--fixed, .nv-home { display: none !important; }
      #module-canvas { padding-top: 14px !important; }`;
    (doc.head || doc.documentElement).appendChild(st);
  } catch (e) { /* cross-origin or not ready — ignore */ }
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
    // Refresh the ✓ badge on this module's sidebar nav item in place.
    const ni = document.querySelector(`#plat-nav .nav-item[data-mod="${id}"]`);
    if (ni) {
      ni.querySelector('.ni-badge')?.remove();
      if (isDone(id)) ni.insertAdjacentHTML('beforeend', '<span class="ni-badge live">✓</span>');
    }
  });
}

// ── Compare — comparison hub ────────────────────────────────────────────────
async function renderCompare(moduleId) {
  try {
    const mod = await import('./engines.js');
    await mod.mount(_stage, moduleId || 'engines');
  } catch (e) {
    _stage.innerHTML = `<div class="card"><h3>Could not load Compare</h3><p style="color:var(--text2)">${String(e && e.message || e)}</p></div>`;
  }
}
