// Foundations landing (I37) — grid of the 15 modules.
import { FOUNDATIONS } from '../data/foundations.js';
import { getScenario } from '../data/scenarios.js';
import { isDone } from '../data/progress-store.js';

export function mount(container) {
  const sc = getScenario();
  container.innerHTML = `
    <div class="page-head">
      <div class="page-eyebrow">Learn</div>
      <h1 class="page-title">🧱 Foundations</h1>
      <p class="page-sub">Streaming from first principles — the 15 concepts every streaming engineer
        needs before touching any specific engine. Vendor-neutral, taught through the
        <b>${sc.name}</b> scenario (switch any time in the top bar).</p>
    </div>
    <div class="scenario-banner">
      <span class="sb-ico">${sc.icon}</span>
      <div class="sb-body">Worked example: <b>${sc.canonicalId}</b>, keyed on <b>${sc.keyField}</b>.
        ${sc.whyOrdering}</div>
    </div>
    <div class="fnd-grid">
      ${FOUNDATIONS.map(m => `
        <div class="card fnd-card" data-go="${m.id}">
          <span class="fnd-num">${m.num}</span>
          <div>
            <h3>${m.icon} ${m.title} ${isDone(m.id) ? '<span class="pill live" style="margin-left:4px">✓</span>' : ''}</h3>
            <p>${m.idea}</p>
          </div>
        </div>`).join('')}
    </div>
    <div class="roadmap-note" style="margin-top:22px">
      💡 Modules 06–08, 10 and 12 include <b>live deterministic simulators</b> (watermarks, windows,
      checkpoint recovery, backpressure) driven by a unit-tested stream engine — not canned animations.
    </div>`;
  container.querySelectorAll('[data-go]').forEach(c => c.addEventListener('click', () => { location.hash = '#' + c.dataset.go; }));
}
