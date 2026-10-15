// Streaming Engineering Master Lab — app bootstrap & hash router (I06)
import { SECTIONS, byId, PRIMARY_IDS } from './data/registry.js';
import { renderNav, setActive, updateProgress } from './components/nav.js';
import { initScenarioSwitcher } from './components/scenario-switcher.js';
import { markVisited } from './data/progress-store.js';
import { isCloudModule, isCloudLanding } from './data/cloud-providers.js';

const BUILD = '20261015a'; // cache-buster — bump on each deploy
const imp = (p) => import(`${p}?v=${BUILD}`);

// Lazy loaders. 'home' has its own module; every other section uses the generic
// section renderer until its gate ships a dedicated module.
const LOADERS = {
  home: () => imp('./modules/home.js'),
  foundations: () => imp('./modules/foundations.js'),
  platforms: () => imp('./modules/platforms.js'),
  engines: () => imp('./modules/engines.js'),
  incident: () => imp('./modules/incident.js'),
  sysdesign: () => imp('./modules/sysdesign.js'),
  interview: () => imp('./modules/interview.js'),
  dashboard: () => imp('./modules/dashboard.js'),
  search: () => imp('./modules/search.js'),
  glossary: () => imp('./modules/glossary.js'),
  paths: () => imp('./modules/paths.js'),
  __section: () => imp('./modules/section.js'),
  __foundation: () => imp('./modules/foundation.js'),
  __cloud: () => imp('./modules/cloud.js'),
  __cloudModule: () => imp('./modules/cloud-module.js'),
};

// Foundation module ids are f01..f15.
const isFoundationModule = (id) => /^f\d{2}$/.test(id);
// Engine tool ids (Gate 6).
const isEngineTool = (id) => /^eng-(graph|compare|trace|break|builder|decide|capacity)$/.test(id);
// Practice-lab sub-routes (Gate 7).
const isIncidentDrill = (id) => /^inc\d{2}$/.test(id);
const isSysdesignBrief = (id) => /^sd-/.test(id);

let cleanupFn = null;

async function route() {
  const id = (location.hash.replace(/^#/, '') || 'home');

  // Back-compat: fold the old standalone learn/engine/cloud routes into the switcher.
  if (id === 'foundations') { location.hash = '#platforms/foundations'; return; }
  if (isFoundationModule(id)) { location.hash = '#platforms/foundations/' + id; return; }
  if (id === 'kafka' || id === 'flink') { location.hash = '#platforms/' + id; return; }
  if (isCloudModule(id)) { location.hash = '#platforms/' + id.replace(/\d+$/, '') + '/' + id; return; }
  if (isCloudLanding(id)) { location.hash = '#platforms/' + id; return; }

  // Unified platform switcher (#platforms, #platforms/<id>, #platforms/<id>/<module>).
  if (id === 'platforms' || id.startsWith('platforms/')) {
    if (typeof cleanupFn === 'function') { try { cleanupFn(); } catch (e) {} cleanupFn = null; }
    const canvas = document.getElementById('module-canvas');
    const crumb = document.getElementById('breadcrumb');
    if (crumb) crumb.innerHTML = `Engines & Clouds &rsaquo; <strong>⚡ Platform switch</strong>`;
    setActive('platforms'); closeMobileNav(); window.scrollTo(0, 0);
    const sub = id === 'platforms' ? '' : id.slice('platforms/'.length);
    try { const mod = await LOADERS.platforms(); cleanupFn = (await mod.mount(canvas, sub)) || null; }
    catch (err) { canvas.innerHTML = `<div class="card"><h3>Could not load platforms</h3><p style="color:var(--text2)">${String(err && err.message || err)}</p></div>`; console.error(err); }
    return;
  }

  // Foundation module route (f01..f15) — not a top-level registry section.
  if (isFoundationModule(id)) {
    if (typeof cleanupFn === 'function') { try { cleanupFn(); } catch (e) {} cleanupFn = null; }
    const canvas = document.getElementById('module-canvas');
    const crumb = document.getElementById('breadcrumb');
    if (crumb) crumb.innerHTML = `Learn &rsaquo; <a href="#foundations">Foundations</a> &rsaquo; <strong>Module ${id.slice(1)}</strong>`;
    setActive('foundations');
    closeMobileNav(); window.scrollTo(0, 0);
    try { const mod = await LOADERS.__foundation(); cleanupFn = mod.mount(canvas, id) || null; }
    catch (err) { canvas.innerHTML = `<div class="card"><h3>Could not load module</h3><p style="color:var(--text2)">${String(err && err.message || err)}</p></div>`; console.error(err); }
    return;
  }

  // Engine tool route (eng-graph, eng-compare, ...).
  if (isEngineTool(id)) {
    if (typeof cleanupFn === 'function') { try { cleanupFn(); } catch (e) {} cleanupFn = null; }
    const canvas = document.getElementById('module-canvas');
    const crumb = document.getElementById('breadcrumb');
    if (crumb) crumb.innerHTML = `Build &rsaquo; <a href="#engines">Compare &amp; Engines</a> &rsaquo; <strong>Tool</strong>`;
    setActive('engines'); closeMobileNav(); window.scrollTo(0, 0);
    try { const mod = await LOADERS.engines(); cleanupFn = (await mod.mount(canvas, id)) || null; }
    catch (err) { canvas.innerHTML = `<div class="card"><h3>Could not load tool</h3><p style="color:var(--text2)">${String(err && err.message || err)}</p></div>`; console.error(err); }
    return;
  }

  // Practice-lab sub-routes (incident drills, system-design briefs).
  if (isIncidentDrill(id) || isSysdesignBrief(id)) {
    if (typeof cleanupFn === 'function') { try { cleanupFn(); } catch (e) {} cleanupFn = null; }
    const canvas = document.getElementById('module-canvas');
    const crumb = document.getElementById('breadcrumb');
    const parent = isIncidentDrill(id) ? 'incident' : 'sysdesign';
    const label = parent === 'incident' ? 'Incident Lab' : 'System Design Lab';
    if (crumb) crumb.innerHTML = `Practice &rsaquo; <a href="#${parent}">${label}</a> &rsaquo; <strong>Exercise</strong>`;
    setActive(parent); closeMobileNav(); window.scrollTo(0, 0);
    try { const mod = await LOADERS[parent](); cleanupFn = (await mod.mount(canvas, id)) || null; }
    catch (err) { canvas.innerHTML = `<div class="card"><h3>Could not load exercise</h3><p style="color:var(--text2)">${String(err && err.message || err)}</p></div>`; console.error(err); }
    return;
  }

  // Cloud module route (aws01.., azure01.., databricks01..).
  if (isCloudModule(id)) {
    if (typeof cleanupFn === 'function') { try { cleanupFn(); } catch (e) {} cleanupFn = null; }
    const canvas = document.getElementById('module-canvas');
    const crumb = document.getElementById('breadcrumb');
    const prov = id.replace(/\d+$/, '');
    if (crumb) crumb.innerHTML = `Cloud &rsaquo; <a href="#${prov}">${prov.toUpperCase()}</a> &rsaquo; <strong>Module ${id.slice(prov.length)}</strong>`;
    setActive(prov); closeMobileNav(); window.scrollTo(0, 0);
    try { const mod = await LOADERS.__cloudModule(); cleanupFn = (await mod.mount(canvas, id)) || null; }
    catch (err) { canvas.innerHTML = `<div class="card"><h3>Could not load module</h3><p style="color:var(--text2)">${String(err && err.message || err)}</p></div>`; console.error(err); }
    return;
  }

  const section = byId(id) || byId('home');
  const resolvedId = section.id;

  // Cloud landing pages (aws/azure/databricks) with a built dataset render the module grid.
  if (isCloudLanding(resolvedId) && !section.url) {
    if (typeof cleanupFn === 'function') { try { cleanupFn(); } catch (e) {} cleanupFn = null; }
    const canvas = document.getElementById('module-canvas');
    const crumb = document.getElementById('breadcrumb');
    if (crumb) crumb.innerHTML = section.breadcrumb;
    setActive(resolvedId); markVisited(resolvedId); updateProgress(); closeMobileNav(); window.scrollTo(0, 0);
    try { const mod = await LOADERS.__cloud(); cleanupFn = (await mod.mount(canvas, resolvedId)) || null; }
    catch (err) { canvas.innerHTML = `<div class="card"><h3>Could not load section</h3><p style="color:var(--text2)">${String(err && err.message || err)}</p></div>`; console.error(err); }
    return;
  }

  // Sections backed by a ported sub-app (Kafka/Flink) are full SPAs — navigate to them.
  if (section.url) { window.location.href = section.url; return; }

  // cleanup previous view
  if (typeof cleanupFn === 'function') { try { cleanupFn(); } catch (e) {} cleanupFn = null; }

  const canvas = document.getElementById('module-canvas');
  const crumb = document.getElementById('breadcrumb');
  if (crumb) crumb.innerHTML = section.breadcrumb || `<strong>${section.title}</strong>`;

  setActive(resolvedId);
  markVisited(resolvedId);
  updateProgress();
  closeMobileNav();
  window.scrollTo(0, 0);

  try {
    let mod;
    if (resolvedId === 'home') {
      mod = await LOADERS.home();
      cleanupFn = mod.mount(canvas) || null;
    } else if (resolvedId === 'foundations') {
      mod = await LOADERS.foundations();
      cleanupFn = mod.mount(canvas) || null;
    } else if (resolvedId === 'engines') {
      mod = await LOADERS.engines();
      cleanupFn = (await mod.mount(canvas, 'engines')) || null;
    } else if (resolvedId === 'incident') {
      mod = await LOADERS.incident();
      cleanupFn = (await mod.mount(canvas, 'incident')) || null;
    } else if (resolvedId === 'sysdesign') {
      mod = await LOADERS.sysdesign();
      cleanupFn = (await mod.mount(canvas, 'sysdesign')) || null;
    } else if (resolvedId === 'interview') {
      mod = await LOADERS.interview();
      cleanupFn = (await mod.mount(canvas)) || null;
    } else if (resolvedId === 'dashboard') {
      mod = await LOADERS.dashboard();
      cleanupFn = (await mod.mount(canvas)) || null;
    } else if (resolvedId === 'search') {
      mod = await LOADERS.search();
      cleanupFn = (await mod.mount(canvas)) || null;
    } else if (resolvedId === 'glossary') {
      mod = await LOADERS.glossary();
      cleanupFn = (await mod.mount(canvas)) || null;
    } else if (resolvedId === 'paths') {
      mod = await LOADERS.paths();
      cleanupFn = (await mod.mount(canvas)) || null;
    } else {
      mod = await LOADERS.__section();
      cleanupFn = mod.mount(canvas, resolvedId) || null;
    }
  } catch (err) {
    canvas.innerHTML = `<div class="card"><h3>Could not load this section</h3>
      <p style="color:var(--text2)">${String(err && err.message || err)}</p></div>`;
    console.error(err);
  }
}

// ── Theme ────────────────────────────────────────────────────
function initTheme() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('sml-theme', next); } catch (e) {}
  });
}

// ── Mobile nav ───────────────────────────────────────────────
function closeMobileNav() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('nav-scrim')?.classList.remove('show');
}
function initMobileNav() {
  const open = document.getElementById('nav-open');
  const scrim = document.getElementById('nav-scrim');
  const sidebar = document.getElementById('sidebar');
  open?.addEventListener('click', () => { sidebar?.classList.add('open'); scrim?.classList.add('show'); });
  scrim?.addEventListener('click', closeMobileNav);
}

// ── Boot ─────────────────────────────────────────────────────
function boot() {
  const badge = document.getElementById('build-badge');
  if (badge) badge.textContent = `build ${BUILD}`;
  renderNav((location.hash.replace(/^#/, '') || 'home'));
  initTheme();
  initMobileNav();
  initScenarioSwitcher(() => route()); // re-render current view on scenario change
  window.addEventListener('hashchange', route);
  route();
}

boot();
