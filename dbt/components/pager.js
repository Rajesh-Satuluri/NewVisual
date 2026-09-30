// Prev/Next pager, derived from module order. Appended to the mounted page.
import { MODULES } from './nav.js';

export function renderPager(activeId) {
  const canvas = document.getElementById('module-canvas');
  if (!canvas) return;

  // Remove a stale pager if one is already present.
  canvas.querySelector('.pager')?.remove();

  const idx = MODULES.findIndex(m => m.id === activeId);
  if (idx === -1) return; // not a numbered module (home / reference / study)

  const prev = MODULES[idx - 1];
  const next = MODULES[idx + 1];

  const pager = document.createElement('nav');
  pager.className = 'pager';
  pager.setAttribute('aria-label', 'Module navigation');
  pager.innerHTML = `
    ${prev ? `
      <a class="pager-btn pager-prev" href="#${prev.id}">
        <span class="pager-dir">← Previous</span>
        <span class="pager-name">${prev.icon} ${prev.title}</span>
      </a>` : '<span></span>'}
    ${next ? `
      <a class="pager-btn pager-next" href="#${next.id}">
        <span class="pager-dir">Next →</span>
        <span class="pager-name">${next.icon} ${next.title}</span>
      </a>` : '<span></span>'}
  `;
  canvas.appendChild(pager);
}
