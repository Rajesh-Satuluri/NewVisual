/* app.js — boot, layout, step navigation, and the live-lab host. */
import { h, mount, clear } from './engine/h.js';
import { createStore } from './engine/store.js';
import { onRoute, go, parseHash } from './engine/router.js';
import { createFlowSystem } from './engine/flows.js';
import { renderLsmScene } from './db/lsm-scene.js';
import { renderHud, renderLegend } from './db/hud.js';
import { icon } from './engine/icons.js';
import { lsmLesson } from './content/lsm.js';
import { createLsm } from './kernels/lsm.mjs';

const LESSONS = [lsmLesson];
const byId = id => LESSONS.find(l => l.id === id) || LESSONS[0];

const CALLOUT_ICON = { warn: 'alert', insight: 'gauge', tip: 'check' };
const CHAPTER_LABEL = { setup: 'Setup', problem: 'Problem', solution: 'Solution', technique: 'How it works', tradeoff: 'Trade-off', recap: 'Recap', insight: 'Insight' };

const store = createStore({ lesson: lsmLesson.id, step: 0 });
let flows = null;          // current flow system

function boot() {
  const app = document.getElementById('app');
  mount(app, h('div.layout', [
    h('aside.sidebar', { id: 'sidebar' }),
    h('main.stage-wrap', [
      h('div.stage', { id: 'stage' }),
      h('div.hud-row', { id: 'hudrow' }),
    ]),
    h('section.rail', { id: 'rail' }),
  ]));
  onRoute(({ lesson, step }) => {
    const L = byId(lesson || store.get().lesson);
    const s = Math.min(Math.max(0, step || 0), L.steps.length - 1);
    store.set({ lesson: L.id, step: s });
    render();
  });
}

function render() {
  const { lesson, step } = store.get();
  const L = byId(lesson);
  renderSidebar(L, step);
  renderStage(L, step);
  renderRail(L, step);
}

/* ── Sidebar: lesson header + goals + step list grouped by chapter ── */
function renderSidebar(L, step) {
  const host = document.getElementById('sidebar');
  mount(host, h('div', [
    h('div.brand', [h('span.brand__dot'), h('span', { text: 'DB Internals · to scale' })]),
    h('div.lesson-head', [
      h('div.lesson-head__group', { text: L.group }),
      h('h1.lesson-head__title', { text: L.title }),
      h('p.lesson-head__summary', { text: L.summary }),
      h('div.lesson-head__meta', { text: `${L.level} · ${L.minutes} min · ${L.steps.length} steps` }),
    ]),
    h('div.goals', [
      h('div.goals__label', { text: 'You will learn' }),
      ...L.goals.map(g => h('button.goal', { onClick: () => go({ lesson: L.id, step: g.step }) }, [
        h('span.goal__bullet'), h('span', { html: g.text }),
      ])),
    ]),
    h('div.steplist', L.steps.map((st, i) =>
      h('button.steprow' + (i === step ? '.is-active' : ''), { onClick: () => go({ lesson: L.id, step: i }) }, [
        h('span.steprow__n', { text: String(i + 1) }),
        h('span.steprow__body', [
          h('span.steprow__chapter.chap--' + st.chapter, { text: CHAPTER_LABEL[st.chapter] || st.chapter }),
          h('span.steprow__short', { text: st.short }),
        ]),
      ]))),
  ]));
}

/* ── Stage: the scene + HUD + legend ── */
function renderStage(L, step) {
  const st = L.steps[step];
  const stage = document.getElementById('stage');
  const hudrow = document.getElementById('hudrow');
  if (flows) { flows.clear(); flows = null; }

  if (st.scene && st.scene.lab) { renderLab(L, step, stage, hudrow); return; }

  const { svg, layer, rail, note } = renderLsmScene(st.scene, {
    hiKey: st.scene.hiKey, pulse: st.scene.pulse, probe: st.probe || [],
  });
  mount(stage, h('div.scene-box', [svg, h('div.scene-note', { text: note })]));

  // animate the write rail (client → WAL → MemTable) for life
  flows = createFlowSystem(layer);
  const writeRail = rail('write');
  if (writeRail) { flows.add({ path: writeRail, kind: 'write', speed: 160, size: 5 }); }
  if (st.scene.pulse === 'flush') { const r = rail('flush'); if (r) flows.add({ path: r, kind: 'flush', speed: 120, size: 6 }); }

  // HUD — compare against the PREVIOUS step's metrics (deterministic, order-independent)
  const prev = step > 0 ? L.steps[step - 1].metrics : null;
  mount(hudrow, h('div', [
    renderHud(st.metrics || {}, L.metrics, prev),
    renderLegend(L.legend),
  ]));
}

/* ── Rail: prose, callout, changes, prev/next ── */
function renderRail(L, step) {
  const st = L.steps[step];
  const host = document.getElementById('rail');
  mount(host, h('div.rail__inner', [
    h('div.rail__chapter.chap--' + st.chapter, { text: CHAPTER_LABEL[st.chapter] || st.chapter }),
    h('h2.rail__title', { text: st.title }),
    h('div.rail__body', st.body.map(p => h('p', { html: p }))),
    st.changes ? h('ul.changes', st.changes.map(c => {
      const sign = c[0]; const tone = sign === '+' ? 'add' : sign === '-' ? 'del' : 'mod';
      return h('li.change--' + tone, { html: c });
    })) : null,
    st.callout ? h('div.callout.callout--' + st.callout.kind, [
      h('span.callout__icon', { html: icon(CALLOUT_ICON[st.callout.kind] || 'check') }),
      h('span', { html: st.callout.text }),
    ]) : null,
    h('div.nav', [
      h('button.nav__btn', { disabled: step === 0, onClick: () => go({ lesson: L.id, step: step - 1 }) }, '← Prev'),
      h('span.nav__count', { text: `${step + 1} / ${L.steps.length}` }),
      h('button.nav__btn.nav__btn--primary', { disabled: step === L.steps.length - 1, onClick: () => go({ lesson: L.id, step: step + 1 }) }, 'Next →'),
    ]),
  ]));
}

/* ── Live lab: real LSM kernel through the same renderer ── */
function renderLab(L, step, stage, hudrow) {
  let kernel = createLsm({ memtableLimit: 4, fanout: 4 });
  [[12, 100], [42, 7], [88, 3], [7, 1]].forEach(([k, v]) => kernel.dispatch({ type: 'put', key: k, value: v }));
  let nextKey = 20;

  function paint() {
    const snap = kernel.snapshot();
    const { svg, layer, rail } = renderLsmScene(snap, {});
    mount(stage, h('div.scene-box', [svg, h('div.scene-note', { text: snap.note })]));
    flows = createFlowSystem(layer);
    const wr = rail('write'); if (wr) flows.add({ path: wr, kind: 'write', speed: 160, size: 5 });

    const m = kernel.metrics();
    mount(hudrow, h('div', [
      renderHud(m, ['memtable', 'sstables', 'readAmp', 'writeAmp'], null),
      h('div.lab-controls', [
        h('button.lab-btn', { onClick: () => { kernel.dispatch({ type: 'put', key: nextKey++, value: 1 }); paint(); } }, '+ Put key'),
        h('button.lab-btn', { onClick: () => { kernel.dispatch({ type: 'delete', key: 12 }); paint(); } }, 'Delete 12'),
        h('button.lab-btn', { onClick: () => { kernel.dispatch({ type: 'flush' }); paint(); } }, 'Flush'),
        h('button.lab-btn', { onClick: () => { kernel.dispatch({ type: 'compact' }); paint(); } }, 'Compact'),
        h('button.lab-btn.lab-btn--ghost', { onClick: () => { kernel.reset(); nextKey = 20; paint(); } }, 'Reset'),
      ]),
    ]));
  }
  if (flows) { flows.clear(); }
  paint();
}

boot();
