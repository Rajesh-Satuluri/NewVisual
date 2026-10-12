// Gate 8 (I76) — curated learning paths. Each path is an ordered set of clickable
// steps; completed steps (tracked in the sml-done store) show a check.
import { PATHS } from '../data/paths.js';
import { isDone } from '../data/progress-store.js';

export async function mount(container) {
  container.innerHTML = `
    <div class="page-head"><div class="page-eyebrow">You</div>
      <h1 class="page-title">🧭 Learning paths</h1>
      <p class="page-sub">Curated routes through the lab for a specific goal. Follow the steps in order, or jump
        to any one. Completed modules show a ✓.</p></div>
    <div style="display:flex;flex-direction:column;gap:16px">
      ${PATHS.map(p => {
    const doneCount = p.steps.filter(([id]) => isDone(id)).length;
    return `<div class="card">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
          <h3 style="margin:0">${p.icon} ${p.title}</h3>
          <span class="pill ${doneCount === p.steps.length ? 'live' : 'soon'}">${doneCount}/${p.steps.length}</span>
        </div>
        <p style="color:var(--text2);margin:6px 0 12px;font-size:14px">${p.for}</p>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
          ${p.steps.map(([id, label], i) => `
            ${i ? '<span style="color:var(--text3)">→</span>' : ''}
            <button class="btn${isDone(id) ? ' primary' : ''}" data-go="${id}" style="font-size:13px">
              ${isDone(id) ? '✓ ' : ''}${label}</button>`).join('')}
        </div>
      </div>`;
  }).join('')}
    </div>`;
  container.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { location.hash = '#' + b.dataset.go; }));
}
