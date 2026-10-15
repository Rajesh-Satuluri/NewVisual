// Unified platform switcher (I50) — one segmented control that swaps between
// Kafka · Flink · AWS · Azure · Databricks · ⇄ Compare in place, no page reload.
//
// Mechanism (mirrors the cloud-dwh platform-switch model, adapted to this lab):
//   • A persistent segmented bar; the active segment recolors to the platform
//     accent via [data-platform] tokens in styles.css.
//   • Switching = re-render the stage for the chosen platform. Kafka/Flink are
//     byte-preserved sub-apps, so they render in an embedded frame (we never
//     touch those files → preservation stays 93/93). AWS/Azure/Databricks and
//     Compare render natively inline with the shell's lesson components.
//   • Hash is mirrored as #platforms/<id>[/<module>] via replaceState so deep
//     links and the back button work without a full re-route.
import { PLATFORMS, ORDER, getPlatform, isPlatform, lastPlatform, rememberPlatform } from '../data/platforms.js';
import { getProvider } from '../data/cloud-providers.js';
import { createLessonShell, initTabs } from '../components/lesson-shell.js';
import { getScenario } from '../data/scenarios.js';
import { isDone, markDone, unmarkDone } from '../data/progress-store.js';
import { updateProgress, setActive } from '../components/nav.js';
import { pipelineDiagram } from './foundation-sims.js';

const fill = (html, sc) => html
  .replace(/\{ENTITY\}/g, sc.entity).replace(/\{KEY\}/g, sc.keyField).replace(/\{ID\}/g, sc.canonicalId);

let _platform = null;      // active platform id
let _module = null;        // active cloud module id (within a provider)

export async function mount(container, sub) {
  // sub is the hash tail after "platforms": "", "kafka", or "aws/aws03".
  const parts = String(sub || '').split('/').filter(Boolean);
  const startId = isPlatform(parts[0]) ? parts[0] : lastPlatform();
  const startMod = parts[1] || null;

  setActive('platforms');
  const crumb = document.getElementById('breadcrumb');
  if (crumb) crumb.innerHTML = 'Engines & Clouds &rsaquo; <strong>⚡ Platform switch</strong>';

  container.innerHTML = `
    <div class="plat-wrap" data-platform="${startId}">
      <div class="plat-switch" role="tablist" aria-label="Platform switcher">
        <div class="plat-track" id="plat-track"></div>
      </div>
      <div class="plat-stage" id="plat-stage"></div>
    </div>`;

  const track = container.querySelector('#plat-track');
  const real = PLATFORMS.filter(p => ORDER.includes(p.id));
  const compare = PLATFORMS.find(p => p.id === 'compare');
  for (const p of real) track.appendChild(seg(p, false));
  if (compare) track.appendChild(seg(compare, true));

  track.addEventListener('click', (e) => {
    const b = e.target.closest('.plat-seg');
    if (b) setPlatform(container, b.dataset.platform);
  });

  await setPlatform(container, startId, startMod, { initial: true });
  return () => { _platform = null; _module = null; };
}

function seg(p, isCompare) {
  const b = document.createElement('button');
  b.className = 'plat-seg' + (isCompare ? ' plat-seg--compare' : '');
  b.dataset.platform = p.id;
  b.style.setProperty('--seg-accent', p.accent);
  b.setAttribute('role', 'tab');
  b.title = p.label + ' — ' + p.tagline;
  b.innerHTML = `<span class="plat-seg-label">${p.short}</span>`;
  return b;
}

async function setPlatform(container, id, moduleId = null, opts = {}) {
  const p = getPlatform(id);
  if (!p) return;
  _platform = id;
  _module = moduleId;
  rememberPlatform(id);

  const wrap = container.querySelector('.plat-wrap');
  if (wrap) wrap.dataset.platform = id;
  container.querySelectorAll('.plat-seg').forEach(b =>
    b.classList.toggle('active', b.dataset.platform === id));

  reflectHash(id, moduleId);

  const stage = container.querySelector('#plat-stage');
  if (!stage) return;
  stage.scrollTop = 0;

  if (p.kind === 'frame') return renderFrame(stage, p);
  if (p.kind === 'cloud') return renderCloud(container, stage, p, moduleId);
  if (p.kind === 'compare') return renderCompare(stage);
}

function reflectHash(id, moduleId) {
  const h = '#platforms/' + id + (moduleId ? '/' + moduleId : '');
  if (location.hash !== h) { try { history.replaceState(null, '', h); } catch (e) { location.hash = h; } }
}

// ── Kafka / Flink — embedded preserved sub-app ──────────────────────────────
function renderFrame(stage, p) {
  stage.innerHTML = `
    <div class="plat-frame-bar">
      <span class="plat-frame-dot"></span>
      <span>${p.label} — full interactive app, ${p.tagline}.</span>
      <a class="plat-frame-open" href="${p.url}" target="_blank" rel="noopener">Open in full screen ↗</a>
    </div>
    <iframe class="plat-frame" src="${p.url}" title="${p.label}" loading="lazy"></iframe>`;
}

// ── AWS / Azure / Databricks — native inline ────────────────────────────────
async function renderCloud(container, stage, p, moduleId) {
  const prov = await getProvider(p.provider);
  if (!prov) { stage.innerHTML = `<div class="card">Provider not available yet.</div>`; return; }
  if (moduleId && prov.modules.some(m => m.id === moduleId)) return renderCloudModule(container, stage, p, prov, moduleId);

  const sc = getScenario();
  stage.innerHTML = `
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
  stage.querySelectorAll('[data-mod]').forEach(c =>
    c.addEventListener('click', () => setPlatform(container, p.id, c.dataset.mod)));
}

function renderCloudModule(container, stage, p, prov, id) {
  const idx = prov.modules.findIndex(m => m.id === id);
  const m = prov.modules[idx];
  const sc = getScenario();
  const prev = prov.modules[idx - 1], next = prov.modules[idx + 1];
  const tabs = m.tabs.map(t => ({ id: t.id, label: t.label, body: fill(t.body, sc) }));

  stage.innerHTML =
    createLessonShell({ tag: `${prov.name} · Module ${m.num}`, title: `${m.icon || ''} ${m.title}`, subtitle: m.idea, tabs })
    + `<div class="lx-nav">
        <div>${prev ? `<button class="btn" data-mod="${prev.id}">← ${prev.num}</button>` : `<button class="btn" data-grid>← All ${prov.name}</button>`}</div>
        <div style="display:flex;gap:10px">
          <button class="btn" id="cl-done">${isDone(id) ? '✓ Completed' : 'Mark complete'}</button>
          ${next ? `<button class="btn primary" data-mod="${next.id}">${next.num} ${next.title} →</button>` : `<button class="btn primary" data-grid>Back to ${prov.name} ↩</button>`}
        </div>
      </div>`;
  initTabs(stage);

  const pipe = stage.querySelector('#' + id + '-pipeline');
  if (pipe) { const panel = pipe.closest('.lx-panel'); const run = () => pipelineDiagram(pipe, sc); if (!panel || panel.classList.contains('active')) run(); else panel.__onShow = run; }

  stage.querySelectorAll('[data-mod]').forEach(b => b.addEventListener('click', () => setPlatform(container, p.id, b.dataset.mod)));
  stage.querySelectorAll('[data-grid]').forEach(b => b.addEventListener('click', () => setPlatform(container, p.id, null)));
  const doneBtn = stage.querySelector('#cl-done');
  doneBtn?.addEventListener('click', () => {
    if (isDone(id)) { unmarkDone(id); doneBtn.textContent = 'Mark complete'; }
    else { markDone(id); doneBtn.textContent = '✓ Completed'; }
    updateProgress();
  });
}

// ── Compare — comparison hub ────────────────────────────────────────────────
async function renderCompare(stage) {
  try {
    const mod = await import('./engines.js');
    await mod.mount(stage, 'engines');
  } catch (e) {
    stage.innerHTML = `<div class="card"><h3>Could not load Compare</h3><p style="color:var(--text2)">${String(e && e.message || e)}</p></div>`;
  }
}
