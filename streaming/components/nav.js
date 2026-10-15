// Sidebar nav (I09) — built from the content registry, grouped.
import { SECTIONS, NAV_GROUPS, PRIMARY_IDS } from '../data/registry.js';
import { progress, isVisited } from '../data/progress-store.js';

export function renderNav(currentId) {
  const el = document.getElementById('nav-list');
  if (!el) return;
  let html = '';

  // Home sits above groups
  html += navItem(SECTIONS.find(s => s.id === 'home'), currentId);

  for (const group of NAV_GROUPS) {
    const items = SECTIONS.filter(s => s.group === group && !s.hidden);
    if (!items.length) continue;
    html += `<div class="nav-group-label">${group}</div>`;
    for (const s of items) html += navItem(s, currentId);
  }
  el.innerHTML = html;

  el.querySelectorAll('.nav-item').forEach(n => {
    n.addEventListener('click', () => {
      if (n.dataset.url) { window.location.href = n.dataset.url; return; }
      location.hash = '#' + n.dataset.id;
    });
  });
  updateProgress();
}

function navItem(s, currentId) {
  if (!s) return '';
  const active = s.id === currentId ? ' active' : '';
  const badge = s.status === 'live'
    ? `<span class="ni-badge live">live</span>`
    : (s.gate ? `<span class="ni-badge">${s.gate.replace('Gate ', 'G')}</span>` : '');
  const urlAttr = s.url ? ` data-url="${s.url}"` : '';
  return `<div class="nav-item${active}" data-id="${s.id}"${urlAttr} role="link" tabindex="0">
    <span class="ni-icon">${s.icon}</span><span>${s.title}</span>${badge}
  </div>`;
}

export function updateProgress() {
  const p = progress(PRIMARY_IDS);
  const count = document.getElementById('progress-count');
  const fill = document.getElementById('progress-fill');
  if (count) count.textContent = `${p.complete} / ${p.total}`;
  if (fill) fill.style.width = p.pct + '%';
}

export function setActive(id) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.id === id));
}
