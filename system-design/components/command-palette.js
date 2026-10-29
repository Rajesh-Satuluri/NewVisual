// ── Command palette (⌘/Ctrl-K) ───────────────────────────────────────────────
// createCommandPalette({ getItems }) → { open, close, toggle, isOpen }
// Each item: { hash, title, subtitle, icon, group }
// Picking an item sets location.hash to item.hash.

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// highlight matched substring (case-insensitive, first occurrence)
function mark(text, q) {
  if (!q) return esc(text);
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return esc(text);
  return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
}

export function createCommandPalette({ getItems }) {
  const overlay = document.createElement('div');
  overlay.id = 'sd-cmdk';
  overlay.className = 'sd-cmdk-overlay';
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="sd-cmdk-modal" role="dialog" aria-modal="true" aria-label="Command palette">
      <div class="sd-cmdk-searchbar">
        <span class="sd-cmdk-search-icon" aria-hidden="true">🔎</span>
        <input type="text" class="sd-cmdk-input" placeholder="Search concepts, questions, pages…" autocomplete="off" spellcheck="false" />
        <kbd class="sd-cmdk-esc">esc</kbd>
      </div>
      <div class="sd-cmdk-list" role="listbox"></div>
      <div class="sd-cmdk-foot">
        <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
        <span><kbd>↵</kbd> open</span>
        <span><kbd>esc</kbd> close</span>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const input = overlay.querySelector('.sd-cmdk-input');
  const list = overlay.querySelector('.sd-cmdk-list');
  let items = [];
  let filtered = [];
  let active = 0;

  function render() {
    const q = input.value.trim().toLowerCase();
    filtered = !q ? items.slice(0, 50) : items.filter(it => {
      const hay = (it.title + ' ' + (it.subtitle || '') + ' ' + (it.group || '')).toLowerCase();
      return hay.includes(q);
    }).slice(0, 60);
    active = 0;
    if (!filtered.length) {
      list.innerHTML = `<div class="sd-cmdk-empty">No matches for "${esc(input.value.trim())}"</div>`;
      return;
    }
    let lastGroup = null;
    const rows = [];
    filtered.forEach((it, i) => {
      if (it.group && it.group !== lastGroup) {
        rows.push(`<div class="sd-cmdk-grouphead">${esc(it.group)}</div>`);
        lastGroup = it.group;
      }
      rows.push(`
        <div class="sd-cmdk-item${i === 0 ? ' active' : ''}" role="option" data-i="${i}" data-hash="${esc(it.hash)}">
          <span class="sd-cmdk-item-icon">${it.icon || '•'}</span>
          <span class="sd-cmdk-item-text">
            <span class="sd-cmdk-item-title">${mark(it.title, q)}</span>
            ${it.subtitle ? `<span class="sd-cmdk-item-sub">${mark(it.subtitle, q)}</span>` : ''}
          </span>
        </div>`);
    });
    list.innerHTML = rows.join('');
  }

  function setActive(i) {
    const nodes = [...list.querySelectorAll('.sd-cmdk-item')];
    if (!nodes.length) return;
    active = (i + nodes.length) % nodes.length;
    nodes.forEach((n, j) => n.classList.toggle('active', j === active));
    nodes[active].scrollIntoView({ block: 'nearest' });
  }

  function pick(i) {
    const it = filtered[i];
    if (!it) return;
    close();
    location.hash = it.hash;
  }

  function open() {
    items = getItems();
    overlay.hidden = false;
    input.value = '';
    render();
    requestAnimationFrame(() => input.focus());
  }
  function close() { overlay.hidden = true; input.blur(); }
  function toggle() { overlay.hidden ? open() : close(); }
  const isOpen = () => !overlay.hidden;

  input.addEventListener('input', render);
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(active); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  });
  list.addEventListener('click', e => {
    const item = e.target.closest('.sd-cmdk-item');
    if (item) pick(Number(item.dataset.i));
  });
  list.addEventListener('mousemove', e => {
    const item = e.target.closest('.sd-cmdk-item');
    if (item) setActive(Number(item.dataset.i));
  });
  overlay.addEventListener('mousedown', e => { if (e.target === overlay) close(); });

  return { open, close, toggle, isOpen };
}
