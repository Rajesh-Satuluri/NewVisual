// Cloud module renderer (I39–I43) — one module of a provider, tabbed, scenario-aware.
import { getProvider, providerIdForModule } from '../data/cloud-providers.js';
import { createLessonShell, initTabs } from '../components/lesson-shell.js';
import { getScenario } from '../data/scenarios.js';
import { isDone, markDone, unmarkDone } from '../data/progress-store.js';
import { updateProgress } from '../components/nav.js';
import { pipelineDiagram } from './foundation-sims.js';

function fill(html, sc) {
  return html.replace(/\{ENTITY\}/g, sc.entity).replace(/\{KEY\}/g, sc.keyField).replace(/\{ID\}/g, sc.canonicalId);
}

export async function mount(container, id) {
  const providerId = providerIdForModule(id);
  const p = await getProvider(providerId);
  if (!p) { container.innerHTML = `<div class="card">Unknown module.</div>`; return; }
  const idx = p.modules.findIndex(m => m.id === id);
  const m = p.modules[idx];
  if (!m) { container.innerHTML = `<div class="card">Unknown module.</div>`; return; }
  const sc = getScenario();
  const prev = p.modules[idx - 1], next = p.modules[idx + 1];

  const tabs = m.tabs.map(t => ({ id: t.id, label: t.label, body: fill(t.body, sc) }));
  container.innerHTML =
    createLessonShell({ tag: `${p.name} · Module ${m.num}`, title: `${m.icon} ${m.title}`, subtitle: m.idea, tabs })
    + `<div class="lx-nav">
        <div>${prev ? `<button class="btn" data-go="${prev.id}">← ${prev.num}</button>` : `<button class="btn" data-go="${providerId}">← All ${p.name}</button>`}</div>
        <div style="display:flex;gap:10px">
          <button class="btn" id="cl-done">${isDone(id) ? '✓ Completed' : 'Mark complete'}</button>
          ${next ? `<button class="btn primary" data-go="${next.id}">${next.num} ${next.title} →</button>` : `<button class="btn primary" data-go="${providerId}">Back to ${p.name} ↩</button>`}
        </div>
      </div>`;
  initTabs(container);

  // pipeline diagram mount point (last module)
  const pipe = container.querySelector('#' + id + '-pipeline');
  if (pipe) { const panel = pipe.closest('.lx-panel'); const run = () => pipelineDiagram(pipe, sc); if (!panel || panel.classList.contains('active')) run(); else panel.__onShow = run; }

  container.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { location.hash = '#' + b.dataset.go; }));
  const doneBtn = container.querySelector('#cl-done');
  doneBtn?.addEventListener('click', () => {
    if (isDone(id)) { unmarkDone(id); doneBtn.textContent = 'Mark complete'; }
    else { markDone(id); doneBtn.textContent = '✓ Completed'; }
    updateProgress();
  });
}
