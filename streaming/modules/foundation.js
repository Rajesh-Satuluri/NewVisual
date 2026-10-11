// Foundation module renderer (I30–I36). Renders one module by id, fills scenario
// tokens, builds the tabbed lesson, wires any interactive simulator, and adds
// prev/next + mark-complete.
import { FOUNDATIONS, foundationById } from '../data/foundations.js';
import { createLessonShell, initTabs } from '../components/lesson-shell.js';
import { getScenario } from '../data/scenarios.js';
import { isDone, markDone, unmarkDone } from '../data/progress-store.js';
import { updateProgress } from '../components/nav.js';
import { SIMS, eventCard, pipelineDiagram } from './foundation-sims.js';

function fillTokens(html, sc) {
  return html
    .replace(/\{ENTITY\}/g, sc.entity)
    .replace(/\{KEY\}/g, sc.keyField)
    .replace(/\{ID\}/g, sc.canonicalId);
}

export function mount(container, id) {
  const m = foundationById(id);
  if (!m) { container.innerHTML = `<div class="card">Unknown module.</div>`; return; }
  const sc = getScenario();
  const idx = FOUNDATIONS.findIndex(x => x.id === id);
  const prev = FOUNDATIONS[idx - 1], next = FOUNDATIONS[idx + 1];

  const tabs = m.tabs.map(t => ({ id: t.id, label: t.label, body: fillTokens(t.body, sc) }));
  container.innerHTML =
    createLessonShell({ tag: `Foundations · Module ${m.num}`, title: `${m.icon} ${m.title}`, subtitle: m.idea, tabs })
    + `<div class="lx-nav">
        <div>${prev ? `<button class="btn" data-go="${prev.id}">← ${prev.num} ${prev.title}</button>` : `<button class="btn" data-go="foundations">← All foundations</button>`}</div>
        <div style="display:flex;gap:10px">
          <button class="btn" id="fnd-done">${isDone(id) ? '✓ Completed' : 'Mark complete'}</button>
          ${next ? `<button class="btn primary" data-go="${next.id}">${next.num} ${next.title} →</button>` : `<button class="btn primary" data-go="kafka">Continue to Kafka →</button>`}
        </div>
      </div>`;

  initTabs(container);

  // Wire simulators to their mount points, initialising on first show so the
  // canvas has a real width.
  const wire = (mountId, fn) => {
    const el = container.querySelector('#' + mountId);
    if (!el) return;
    const panel = el.closest('.lx-panel');
    const run = () => { try { fn(el, sc); } catch (e) { console.error(e); } };
    if (!panel || panel.classList.contains('active')) run();
    else { panel.__onShow = run; }
  };
  wire('f02-event', eventCard);
  wire('f15-pipeline', pipelineDiagram);
  if (m.sim && SIMS[m.sim]) {
    const simMount = m.id + '-sim';
    wire(simMount, SIMS[m.sim]);
  }

  // nav + complete
  container.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { location.hash = '#' + b.dataset.go; }));
  const doneBtn = container.querySelector('#fnd-done');
  doneBtn?.addEventListener('click', () => {
    if (isDone(id)) { unmarkDone(id); doneBtn.textContent = 'Mark complete'; }
    else { markDone(id); doneBtn.textContent = '✓ Completed'; }
    updateProgress();
  });
}
