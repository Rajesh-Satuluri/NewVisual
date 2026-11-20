/* app.js — the course shell: top bar · course tree · lesson workspace · narrative.
   The LSM-Tree lesson is fully built; every other catalog concept is navigable
   as a graceful "not built yet" placeholder so the whole curriculum validates. */
import { h, mount } from './engine/h.js';
import { createStore } from './engine/store.js';
import { onRoute, go } from './engine/router.js';
import { createFlowSystem } from './engine/flows.js';
import { renderLsmScene } from './db/lsm-scene.js';
import { renderHud, renderLegend } from './db/hud.js';
import { icon } from './engine/icons.js';
import { lsmLesson } from './content/lsm.js';
import { createLsm } from './kernels/lsm.mjs';
import { CATALOG, TOTAL, BUILT_COUNT } from './content/catalog.js';

const LESSONS = { 'lsm-tree': lsmLesson };
const TABS = ['Learn', 'Practice', 'Design Lab', 'Cheatsheets'];
const CALLOUT_ICON = { warn: 'alert', insight: 'gauge', tip: 'check' };
const CHAPTER_LABEL = { setup: 'Setup', problem: 'Problem', solution: 'Solution', technique: 'How it works', tradeoff: 'Trade-off', recap: 'Recap', insight: 'Insight' };

// section index that contains a given slug (for auto-expand)
function sectionOf(slug) {
  for (let i = 0; i < CATALOG.length; i++) if (CATALOG[i].items.some(it => it.slug === slug)) return i;
  return 0;
}
function catalogItem(slug) {
  for (const s of CATALOG) { const it = s.items.find(i => i.slug === slug); if (it) return { ...it, section: s }; }
  return null;
}

const store = createStore({ slug: 'lsm-tree', step: 0, expanded: new Set([sectionOf('lsm-tree')]) });
let flows = null;

function boot() {
  const app = document.getElementById('app');
  mount(app, h('div.shell', [
    renderTopbar(),
    h('div.layout', [
      h('aside.sidebar', { id: 'sidebar' }),
      h('main.workspace', { id: 'workspace' }),
      h('section.rail', { id: 'rail' }),
    ]),
  ]));
  onRoute(({ lesson, step }) => {
    const slug = lesson || store.get().slug;
    const exp = store.get().expanded; exp.add(sectionOf(slug));
    store.set({ slug, step: step || 0, expanded: exp });
    render();
  });
}

/* ── Top bar ── */
function renderTopbar() {
  return h('header.topbar', [
    h('div.topbar__brand', [h('span.brand__dot'), h('b', 'DB Internals'), h('span.brand__thin', 'to scale')]),
    h('nav.tabs', TABS.map((t, i) => h('button.tab' + (i === 0 ? '.is-active' : ''), { text: t, title: i ? 'Coming soon' : '' }))),
    h('div.topbar__right', [
      h('div.search', [h('span.search__ic', { html: icon('search') }), h('span.search__ph', 'Search concepts…')]),
      h('button.chip-btn', 'EN'),
      h('button.chip-btn', { id: 'themeToggle2', text: '◐', title: 'Toggle theme' }),
    ]),
  ]);
}

function render() {
  const { slug, step } = store.get();
  const lesson = LESSONS[slug];
  renderSidebar(slug);
  if (lesson) { renderBuilt(lesson, step); }
  else { renderPlaceholder(slug); }
}

/* ── Course tree (full catalog) ── */
function renderSidebar(activeSlug) {
  const host = document.getElementById('sidebar');
  const { expanded } = store.get();
  mount(host, h('div.course', [
    h('div.course__head', [h('span', { html: icon('layers') }), h('b', 'Course'), h('span.course__count', `${TOTAL} concepts`)]),
    h('div.sections', CATALOG.map((sec, i) => {
      const open = expanded.has(i);
      const builtN = sec.items.filter(x => x.built).length;
      return h('div.section' + (open ? '.is-open' : ''), [
        h('button.section__head', { onClick: () => toggleSection(i) }, [
          h('span.section__caret', open ? '▾' : '▸'),
          h('span.section__n', { text: sec.n }),
          h('span.section__name', { text: sec.name }),
          h('span.section__count', { text: `${builtN}/${sec.items.length}` }),
        ]),
        open ? h('div.items', sec.items.map(it =>
          h('button.item' + (it.slug === activeSlug ? '.is-active' : '') + (it.built ? '.is-built' : ''),
            { onClick: () => go({ lesson: it.slug, step: 0 }) }, [
            h('span.item__icon', { text: it.built ? '●' : '○' }),
            h('span.item__title', { text: it.title }),
            it.built ? h('span.item__badge', 'live') : null,
          ])) ) : null,
      ]);
    })),
    h('div.progress', [
      h('div.progress__bar', [h('div.progress__fill', { style: { width: (BUILT_COUNT / TOTAL * 100).toFixed(1) + '%' } })]),
      h('div.progress__txt', `${BUILT_COUNT} / ${TOTAL} built`),
    ]),
  ]));
}
function toggleSection(i) {
  const exp = store.get().expanded;
  exp.has(i) ? exp.delete(i) : exp.add(i);
  store.set({ expanded: exp }); renderSidebar(store.get().slug);
}

/* ── Built lesson workspace ── */
function renderBuilt(L, step) {
  step = Math.min(Math.max(0, step), L.steps.length - 1);
  const st = L.steps[step];
  const ws = document.getElementById('workspace');
  if (flows) { flows.clear(); flows = null; }

  const header = h('div.ws-head', [
    h('div.breadcrumb', { text: `${L.group}  /  ${L.title}` }),
    h('h1.ws-title', { text: L.title }),
    h('p.ws-sub', { text: L.summary }),
    h('div.badges', [
      h('span.badge', `⏱ ${L.minutes} min`), h('span.badge', `▲ ${L.level}`), h('span.badge', `☰ ${L.steps.length} steps`),
    ]),
  ]);

  // scene
  let sceneBox, legendEl;
  if (st.scene && st.scene.lab) { sceneBox = h('div', { id: 'labmount' }); }
  else {
    const r = renderLsmScene(st.scene, { hiKey: st.scene.hiKey, pulse: st.scene.pulse, probe: st.probe || [] });
    sceneBox = h('div.scene-box', [r.svg, h('div.scene-note', { text: r.note })]);
    flows = createFlowSystem(r.layer);
    const wr = r.rail('write'); if (wr) flows.add({ path: wr, kind: 'write', speed: 160, size: 5 });
    if (st.scene.pulse === 'flush') { const f = r.rail('flush'); if (f) flows.add({ path: f, kind: 'flush', speed: 120, size: 6 }); }
    legendEl = renderLegend(L.legend);
  }

  mount(ws, h('div', [
    header,
    st.metrics ? h('div.hud-row', [renderHud(st.metrics, L.metrics, step > 0 ? L.steps[step - 1].metrics : null)]) : h('div'),
    sceneBox,
    legendEl || h('div'),
    renderStepRail(L, step),
  ]));

  if (st.scene && st.scene.lab) mountLab(document.getElementById('labmount'), L, step);
  renderNarrative(L, step);
}

/* horizontal step scrubber ("IN THIS LESSON") */
function renderStepRail(L, step) {
  return h('div.steprail', [
    h('div.steprail__head', [h('span', 'In this lesson'), h('span.steprail__count', `Step ${step + 1} of ${L.steps.length}`)]),
    h('div.steprail__track', L.steps.map((s, i) =>
      h('button.srnode' + (i === step ? '.is-active' : '') + (i < step ? '.is-done' : ''),
        { onClick: () => go({ lesson: L.id, step: i }) }, [
        h('span.srnode__dot', { text: String(i + 1) }),
        h('span.srnode__label', { text: s.short }),
      ])),
    ),
  ]);
}

/* ── Narrative rail ── */
function renderNarrative(L, step) {
  const st = L.steps[step];
  mount(document.getElementById('rail'), h('div.rail__inner', [
    h('div.rail__top', [
      h('span.rail__stepno', { text: `STEP ${step + 1} / ${L.steps.length}` }),
      h('span.rail__chaptag.chap--' + st.chapter, { text: (CHAPTER_LABEL[st.chapter] || st.chapter).toUpperCase() }),
    ]),
    h('h2.rail__title', { text: st.title }),
    h('div.rail__body', st.body.map(p => h('p', { html: p }))),
    st.changes ? h('ul.changes', st.changes.map(c => {
      const t = c[0] === '+' ? 'add' : c[0] === '-' ? 'del' : 'mod'; return h('li.change--' + t, { html: c });
    })) : null,
    st.callout ? h('div.callout.callout--' + st.callout.kind, [
      h('span.callout__icon', { html: icon(CALLOUT_ICON[st.callout.kind] || 'check') }), h('span', { html: st.callout.text }),
    ]) : null,
    h('div.nav', [
      h('button.nav__btn', { disabled: step === 0, onClick: () => go({ lesson: L.id, step: step - 1 }) }, '← Back'),
      h('button.nav__btn.nav__btn--primary', { disabled: step === L.steps.length - 1, onClick: () => go({ lesson: L.id, step: step + 1 }) }, 'Next →'),
    ]),
    h('div.youll', [
      h('div.youll__label', 'You will learn'),
      ...L.goals.map(g => h('button.youll__item', { onClick: () => go({ lesson: L.id, step: g.step }) }, [
        h('span.youll__box'), h('span', { html: g.text }),
      ])),
    ]),
  ]));
}

/* ── Live lab ── */
function mountLab(host, L, step) {
  let kernel = createLsm({ memtableLimit: 4, fanout: 4 });
  [[12, 100], [42, 7], [88, 3], [7, 1]].forEach(([k, v]) => kernel.dispatch({ type: 'put', key: k, value: v }));
  let nextKey = 20;
  function paint() {
    if (flows) flows.clear();
    const snap = kernel.snapshot();
    const r = renderLsmScene(snap, {});
    const m = kernel.metrics();
    mount(host, h('div', [
      h('div.hud-row', [renderHud(m, ['memtable', 'sstables', 'readAmp', 'writeAmp'], null)]),
      h('div.scene-box', [r.svg, h('div.scene-note', { text: snap.note })]),
      h('div.lab-controls', [
        h('button.lab-btn', { onClick: () => { kernel.dispatch({ type: 'put', key: nextKey++, value: 1 }); paint(); } }, '+ Put key'),
        h('button.lab-btn', { onClick: () => { kernel.dispatch({ type: 'delete', key: 12 }); paint(); } }, 'Delete 12'),
        h('button.lab-btn', { onClick: () => { kernel.dispatch({ type: 'flush' }); paint(); } }, 'Flush'),
        h('button.lab-btn', { onClick: () => { kernel.dispatch({ type: 'compact' }); paint(); } }, 'Compact'),
        h('button.lab-btn.lab-btn--ghost', { onClick: () => { kernel.reset(); nextKey = 20; paint(); } }, 'Reset'),
      ]),
    ]));
    flows = createFlowSystem(r.layer);
    const wr = r.rail('write'); if (wr) flows.add({ path: wr, kind: 'write', speed: 160, size: 5 });
  }
  paint();
}

/* ── Placeholder for not-yet-built concepts ── */
function renderPlaceholder(slug) {
  if (flows) { flows.clear(); flows = null; }
  const it = catalogItem(slug) || { title: slug, section: { name: '' } };
  mount(document.getElementById('workspace'), h('div', [
    h('div.ws-head', [
      h('div.breadcrumb', { text: `${it.section.name}  /  ${it.title}` }),
      h('h1.ws-title', { text: it.title }),
      h('p.ws-sub', 'This lesson is on the roadmap — the content exists in db-lab; the Designed-to-Scale rebuild is pending.'),
    ]),
    h('div.placeholder', [
      h('div.placeholder__icon', { text: it.icon || '◇' }),
      h('div.placeholder__title', 'Not built yet'),
      h('div.placeholder__sub', `“${it.title}” will become a guided, animated lesson like LSM-Tree.`),
      h('button.placeholder__cta', { onClick: () => go({ lesson: 'lsm-tree', step: 0 }) }, 'Open the LSM-Tree lesson →'),
    ]),
  ]));
  mount(document.getElementById('rail'), h('div.rail__inner', [
    h('div.rail__top', [h('span.rail__stepno', 'PREVIEW')]),
    h('h2.rail__title', { text: it.title }),
    h('p.rail__muted', 'Pick a section on the left to browse the full curriculum. Lessons marked “live” are built; the rest are placeholders for now.'),
  ]));
}

function wireTheme() {
  document.addEventListener('click', e => {
    if (e.target && e.target.id === 'themeToggle2') {
      const dark = document.documentElement.dataset.theme === 'dark';
      document.documentElement.dataset.theme = dark ? 'light' : 'dark';
      try { localStorage.setItem('dbs:theme', JSON.stringify(dark ? 'light' : 'dark')); } catch {}
    }
  });
}

wireTheme();
boot();
