// Command palette (Cmd/Ctrl-K) — fuzzy search over modules + the Study Hub.
import { MODULES } from './nav.js';

const numOf = id => id.replace(/^m/, '');

function fuzzyScore(query, text) {
  query = query.toLowerCase(); text = text.toLowerCase();
  if (!query) return 0;
  let qi = 0, score = 0, lastIdx = -1;
  for (let ti = 0; ti < text.length && qi < query.length; ti++) {
    if (text[ti] === query[qi]) { score += (lastIdx === -1 ? ti : ti - lastIdx); lastIdx = ti; qi++; }
  }
  return qi === query.length ? score : null;
}

const EXTRA = [{ id: 'study', label: 'Study Hub', icon: '📚', group: 'Review' }];

export function initCommandPalette() {
  const ITEMS = [...MODULES, ...EXTRA];

  const overlay = document.createElement('div');
  overlay.className = 'cmdk-overlay';
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="cmdk-box" role="dialog" aria-modal="true" aria-label="Command palette">
      <input class="cmdk-input" type="text" placeholder="Jump to a module…  (type to filter)" aria-label="Search modules" role="combobox" aria-expanded="true" aria-controls="cmdk-list" />
      <ul class="cmdk-list" id="cmdk-list" role="listbox"></ul>
      <div class="cmdk-foot"><kbd>↑</kbd><kbd>↓</kbd> navigate &nbsp; <kbd>↵</kbd> open &nbsp; <kbd>esc</kbd> close</div>
    </div>`;
  document.body.appendChild(overlay);

  const input = overlay.querySelector('.cmdk-input');
  const list = overlay.querySelector('.cmdk-list');
  let results = [], sel = 0;

  function render() {
    const q = input.value.trim();
    results = ITEMS
      .map(m => ({ m, s: fuzzyScore(q, `${numOf(m.id)} ${m.label} ${m.group}`) }))
      .filter(r => r.s !== null)
      .sort((a, b) => a.s - b.s)
      .map(r => r.m);
    if (sel >= results.length) sel = 0;
    list.innerHTML = results.length
      ? results.map((m, i) => `
        <li class="cmdk-item ${i === sel ? 'sel' : ''}" role="option" aria-selected="${i === sel}" data-id="${m.id}">
          <span class="cmdk-icon">${m.icon}</span>
          <span class="cmdk-title">${m.label}</span>
          <span class="cmdk-group">${m.group}</span>
        </li>`).join('')
      : `<li class="cmdk-empty">No modules match “${q}”</li>`;
  }
  function open() { overlay.hidden = false; input.value = ''; sel = 0; render(); input.focus(); document.body.classList.add('cmdk-open'); }
  function close() { overlay.hidden = true; document.body.classList.remove('cmdk-open'); }
  function go(i) { const m = results[i]; if (!m) return; close(); window.location.hash = m.id; }

  input.addEventListener('input', () => { sel = 0; render(); });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, results.length - 1); render(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); render(); }
    else if (e.key === 'Enter') { e.preventDefault(); go(sel); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  });
  list.addEventListener('click', e => {
    const li = e.target.closest('.cmdk-item[data-id]');
    if (li) { window.location.hash = li.dataset.id; close(); }
  });
  overlay.addEventListener('mousedown', e => { if (e.target === overlay) close(); });

  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      overlay.hidden ? open() : close();
    }
  }, true);

  return { open, close };
}
