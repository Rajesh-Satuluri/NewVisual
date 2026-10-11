// Cloud provider landing (I39/I43) — grid of a provider's modules. Reused for
// AWS, Azure, Databricks.
import { getProvider } from '../data/cloud-providers.js';
import { getScenario } from '../data/scenarios.js';
import { isDone } from '../data/progress-store.js';

export async function mount(container, providerId) {
  const p = await getProvider(providerId);
  if (!p) { container.innerHTML = `<div class="card">Provider not available yet.</div>`; return; }
  const sc = getScenario();
  container.innerHTML = `
    <div class="page-head">
      <div class="page-eyebrow">Cloud</div>
      <h1 class="page-title">${p.icon} ${p.name}</h1>
      <p class="page-sub">${p.blurb}</p>
    </div>
    <div class="scenario-banner">
      <span class="sb-ico">${sc.icon}</span>
      <div class="sb-body">Worked through the <b>${sc.name}</b> scenario (${sc.canonicalId}, keyed on
        <b>${sc.keyField}</b>). All factual claims validated against official docs — see the accuracy review.</div>
    </div>
    <div class="fnd-grid">
      ${p.modules.map(m => `
        <div class="card fnd-card" data-go="${m.id}">
          <span class="fnd-num">${m.num}</span>
          <div>
            <h3>${m.icon} ${m.title} ${isDone(m.id) ? '<span class="pill live" style="margin-left:4px">✓</span>' : ''}</h3>
            <p>${m.idea}</p>
          </div>
        </div>`).join('')}
    </div>`;
  container.querySelectorAll('[data-go]').forEach(c => c.addEventListener('click', () => { location.hash = '#' + c.dataset.go; }));
}
