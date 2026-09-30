/* ============================================================
   Command Palette (Cmd/Ctrl-K)
   Fuzzy search over all screens + glossary concepts.
   ARIA combobox + listbox; keyboard and pointer navigable.
   ============================================================ */
(function () {
  'use strict';
  const IV = (window.IcebergViz = window.IcebergViz || {});

  let root, input, list, items = [], filtered = [], active = 0, lastFocus = null, built = false;

  /* ── Build the searchable index (lazy) ─────────────────────── */
  function buildIndex() {
    const idx = [];
    (IV.getScreens ? IV.getScreens() : []).forEach(s => {
      idx.push({ type: 'screen', id: s.id, title: s.label, sub: s.group, hay: (s.label + ' ' + s.group).toLowerCase() });
    });
    const gloss = (IV.Concepts && IV.Concepts.glossary) || [];
    gloss.forEach(g => {
      idx.push({ type: 'concept', title: g.term, sub: 'Glossary', def: g.definition, hay: (g.term + ' ' + g.definition).toLowerCase() });
    });
    return idx;
  }

  /* ── Tiny fuzzy scorer: subsequence + word-boundary bonus ──── */
  function score(q, item) {
    if (!q) return 1;
    const hay = item.hay;
    let qi = 0, s = 0, streak = 0, prev = -2;
    const title = item.title.toLowerCase();
    if (title.startsWith(q)) s += 50;
    else if (title.includes(q)) s += 25;
    for (let i = 0; i < hay.length && qi < q.length; i++) {
      if (hay[i] === q[qi]) {
        s += 1;
        if (i === prev + 1) { streak++; s += streak; } else streak = 0;
        if (i === 0 || hay[i - 1] === ' ') s += 3; // word-boundary
        prev = i; qi++;
      }
    }
    return qi === q.length ? s : 0;
  }

  function render() {
    const q = input.value.trim().toLowerCase();
    filtered = items
      .map(it => ({ it, sc: score(q, it) }))
      .filter(x => x.sc > 0)
      .sort((a, b) => b.sc - a.sc)
      .slice(0, 40)
      .map(x => x.it);
    active = 0;
    list.innerHTML = '';
    if (!filtered.length) {
      list.innerHTML = `<li class="cp-empty" role="option" aria-disabled="true">No matches</li>`;
      return;
    }
    filtered.forEach((it, i) => {
      const li = document.createElement('li');
      li.className = 'cp-item' + (i === active ? ' is-active' : '');
      li.id = 'cp-opt-' + i;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', i === active ? 'true' : 'false');
      li.innerHTML =
        `<span class="cp-kind cp-kind--${it.type}">${it.type === 'screen' ? 'Go' : 'Def'}</span>` +
        `<span class="cp-title">${it.title}</span>` +
        `<span class="cp-sub">${it.sub}</span>`;
      li.addEventListener('click', () => choose(i));
      li.addEventListener('mousemove', () => setActive(i));
      list.appendChild(li);
    });
  }

  function setActive(i) {
    const nodes = list.querySelectorAll('.cp-item');
    if (!nodes.length) return;
    active = (i + nodes.length) % nodes.length;
    nodes.forEach((n, idx) => {
      const on = idx === active;
      n.classList.toggle('is-active', on);
      n.setAttribute('aria-selected', on ? 'true' : 'false');
      if (on) {
        n.scrollIntoView({ block: 'nearest' });
        input.setAttribute('aria-activedescendant', n.id);
      }
    });
  }

  function choose(i) {
    const it = filtered[i];
    if (!it) return;
    close();
    if (it.type === 'screen') {
      IV.navigate ? IV.navigate(it.id) : (location.hash = '#' + it.id);
    } else {
      IV.toast(it.def, { title: it.title, icon: '📖', duration: 6000 });
    }
  }

  function open() {
    if (!built) build();
    items = buildIndex();
    lastFocus = document.activeElement;
    root.classList.add('is-open');
    root.setAttribute('aria-hidden', 'false');
    input.value = '';
    render();
    setTimeout(() => input.focus(), 20);
  }

  function close() {
    if (!root) return;
    root.classList.remove('is-open');
    root.setAttribute('aria-hidden', 'true');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function onKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(active); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  }

  function build() {
    root = document.createElement('div');
    root.className = 'cp-backdrop';
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML = `
      <div class="cp-panel" role="dialog" aria-modal="true" aria-label="Command palette">
        <div class="cp-input-row">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="7" cy="7" r="4.5"/><path d="M11 11l3 3"/></svg>
          <input id="cp-input" type="text" role="combobox" aria-expanded="true" aria-controls="cp-list"
            aria-autocomplete="list" placeholder="Search screens & concepts…" autocomplete="off" spellcheck="false" />
          <kbd class="cp-esc">Esc</kbd>
        </div>
        <ul id="cp-list" class="cp-list" role="listbox" aria-label="Results"></ul>
        <div class="cp-foot"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> open</span></div>
      </div>`;
    document.body.appendChild(root);
    input = root.querySelector('#cp-input');
    list = root.querySelector('#cp-list');
    input.addEventListener('input', render);
    input.addEventListener('keydown', onKey);
    root.addEventListener('mousedown', e => { if (e.target === root) close(); });
    built = true;
  }

  // Capture-phase Cmd/Ctrl-K so the palette wins over other handlers.
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      if (root && root.classList.contains('is-open')) close(); else open();
    }
  }, true);

  IV._openPalette = open;
  IV._closePalette = close;
})();
