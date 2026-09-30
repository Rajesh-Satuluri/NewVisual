/* ============================================================
   PyRef — App Engine
   app.js: navigation, rendering, search, favorites, theme
   ============================================================ */

/* ── State ───────────────────────────────────────────────────── */
const S = {
  lang:    'python',
  catKey:  null,
  favs:    new Set(JSON.parse(localStorage.getItem('pyref-favs')   || '[]')),
  recent:  JSON.parse(localStorage.getItem('pyref-recent') || '[]'),
  theme:   localStorage.getItem('pyref-theme') || 'auto',
};

const DATA = {
  python:  window.PYREF_PYTHON,
  numpy:   window.PYREF_NUMPY,
  pandas:  window.PYREF_PANDAS,
  pyspark: window.PYREF_PYSPARK,
};

/* ── Syntax highlighter ──────────────────────────────────────── */
const KW = new Set(['for','in','if','else','elif','while','def','class','return',
  'import','from','as','try','except','finally','with','pass','break','continue',
  'lambda','yield','not','and','or','True','False','None','raise','del','assert',
  'global','nonlocal','is','await','async']);

const BI = new Set(['print','len','range','enumerate','zip','map','filter','sorted',
  'reversed','list','dict','set','tuple','int','float','str','bool','type','isinstance',
  'issubclass','any','all','sum','min','max','abs','round','divmod','pow','open',
  'hasattr','getattr','setattr','delattr','callable','iter','next','vars','dir',
  'repr','hash','id','input','format','bin','oct','hex','chr','ord','bytes',
  'bytearray','super','object','property','staticmethod','classmethod']);

function hl(rawCode) {
  const lines = rawCode.split('\n');
  return lines.map(line => {
    let out = ''; let i = 0;
    const safe = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    while (i < line.length) {
      const ch = line[i];
      // comment
      if (ch === '#') { out += `<span class="cm">${safe(line.slice(i))}</span>`; break; }
      // f-string or string
      if (ch === "'" || ch === '"') {
        const q = ch; let j = i+1;
        // triple quote
        if (line[i+1]===q && line[i+2]===q) {
          j = i+3;
          while (j < line.length-2 && !(line[j]===q&&line[j+1]===q&&line[j+2]===q)) j++;
          j += 3;
          out += `<span class="str">${safe(line.slice(i,j))}</span>`; i=j; continue;
        }
        while (j < line.length && line[j] !== q) { if (line[j]==='\\') j++; j++; }
        out += `<span class="str">${safe(line.slice(i,j+1))}</span>`; i=j+1; continue;
      }
      // word
      if (/[a-zA-Z_]/.test(ch)) {
        let j = i;
        while (j < line.length && /[a-zA-Z0-9_]/.test(line[j])) j++;
        const w = line.slice(i,j);
        if (KW.has(w))      out += `<span class="kw">${w}</span>`;
        else if (BI.has(w)) out += `<span class="bi">${w}</span>`;
        else                out += w;
        i=j; continue;
      }
      // number
      if (/[0-9]/.test(ch)) {
        let j = i;
        while (j < line.length && /[0-9._xXbBoO]/.test(line[j])) j++;
        out += `<span class="num">${line.slice(i,j)}</span>`; i=j; continue;
      }
      out += safe(ch); i++;
    }
    return out;
  }).join('\n');
}

/* ── Rendering ───────────────────────────────────────────────── */
function badgeHTML(b) {
  const map = {
    builtin:'badge-builtin', lazy:'badge-lazy', safe:'badge-safe',
    o1:'badge-o1', on:'badge-on', on2:'badge-on2', mut:'badge-mut',
    method:'badge-method', func:'badge-func',
    numpy:'badge-numpy', pandas:'badge-pandas', pyspark:'badge-pyspark',
  };
  const cls = map[b] || 'badge-builtin';
  const labels = {
    builtin:'built-in', lazy:'O(1) lazy', safe:'no mutation',
    o1:'O(1)', on:'O(n)', on2:'O(n²)', mut:'mutates',
    method:'method', func:'function',
    numpy:'numpy', pandas:'pandas', pyspark:'pyspark',
  };
  return `<span class="badge ${cls}">${labels[b]||b}</span>`;
}

function metaHTML(m) {
  const good = v => typeof v==='boolean' ? (v?'<span class="meta-val bad">Yes</span>':'<span class="meta-val good">No</span>') : `<span class="meta-val">${v}</span>`;
  return `
  <div class="fn-meta-grid">
    <div class="meta-cell"><div class="meta-label">Returns</div><div class="meta-val">${m.ret}</div></div>
    <div class="meta-cell"><div class="meta-label">Mutates input</div>${good(m.mut)}</div>
    <div class="meta-cell"><div class="meta-label">Time complexity</div><div class="meta-val">${m.time}</div></div>
    <div class="meta-cell"><div class="meta-label">Space complexity</div><div class="meta-val">${m.space}</div></div>
  </div>`;
}

function paramsHTML(params) {
  if (!params || !params.length) return '';
  const rows = params.map(p => {
    const def = p.req
      ? `<span class="param-req">required</span>`
      : `<span class="param-default">${p.default ?? '—'}</span>`;
    return `<tr>
      <td><span class="param-name">${p.name}</span></td>
      <td><span class="param-type">${p.type||'any'}</span></td>
      <td>${def}</td>
      <td class="param-desc">${p.desc}</td>
    </tr>`;
  }).join('');
  return `<div class="card-section">
    <div class="section-label">Parameters</div>
    <div style="overflow-x:auto">
    <table class="params-table">
      <thead><tr><th style="width:120px">Name</th><th style="width:140px">Type</th><th style="width:100px">Default</th><th>Description</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
  </div>`;
}

function sigHTML(sig) {
  if (!sig) return '';
  // sig is a raw string like "enumerate(iterable: Iterable, start: int = 0) → Iterator[...]"
  const esc = s => s.replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return `<div class="sig-row">${esc(sig)}</div>`;
}

function codeHTML(code) {
  if (!code) return '';
  return `<div class="card-section">
    <div class="section-label">Example</div>
    <div class="code-block"><pre>${hl(code)}</pre></div>
  </div>`;
}

function baHTML(ba) {
  if (!ba) return '';
  const beforeRows = ba.before.rows.map((r,i)=>
    `<div class="ba-row"><span class="ba-idx">[${i}]</span><span class="ba-val">${r}</span></div>`
  ).join('');
  const afterRows = ba.after.rows.map(r=>
    `<div class="ba-row hi"><span class="ba-val">${r}</span></div>`
  ).join('');
  return `<div class="card-section">
    <div class="section-label">Before / After</div>
    <div class="ba-wrap">
      <div><div class="ba-table"><div class="ba-table-hd">${ba.before.label}</div>${beforeRows}</div></div>
      <div class="ba-arrow">→</div>
      <div><div class="ba-table"><div class="ba-table-hd">${ba.after.label}</div>${afterRows}</div></div>
    </div>
  </div>`;
}

function tagsHTML(related, tags) {
  if (!related?.length && !tags?.length) return '';
  let inner = '';
  if (related?.length) {
    inner += `<div class="tag-group">
      <div class="tag-group-label">Related</div>
      <div class="tags">${related.map(r=>`<span class="tag related" data-fn="${r}">${r}</span>`).join('')}</div>
    </div>`;
  }
  if (tags?.length) {
    inner += `<div class="tag-group">
      <div class="tag-group-label">Tags</div>
      <div class="tags">${tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>
    </div>`;
  }
  return `<div class="card-section"><div class="tags-row">${inner}</div></div>`;
}

function listSectionHTML(label, items, dotClass) {
  if (!items?.length) return '';
  const rows = items.map(it=>
    `<div class="list-item"><div class="list-dot ${dotClass}"></div><span>${it}</span></div>`
  ).join('');
  return `<div class="card-section"><div class="section-label">${label}</div><div class="list-items">${rows}</div></div>`;
}

function cardHTML(fn, lang) {
  const id = `card-${lang}-${fn.id}`;
  const saved = S.favs.has(fn.id);
  const badges = (fn.badge||[]).map(badgeHTML).join('');

  const body = [
    sigHTML(fn.sig),
    fn.meta ? metaHTML(fn.meta) : '',
    paramsHTML(fn.params),
    codeHTML(fn.code),
    baHTML(fn.ba),
    tagsHTML(fn.related, fn.tags),
    listSectionHTML('Common interview use cases', fn.interview, 'green'),
    listSectionHTML('Common mistakes', fn.mistakes, 'red'),
    listSectionHTML('Notes & edge cases', fn.notes, 'yellow'),
  ].join('');

  return `
  <div class="fn-card" id="${id}" data-fn="${fn.id}" data-lang="${lang}">
    <div class="fn-card-header" onclick="toggleCard('${id}')">
      <div class="fn-header-left">
        <span class="fn-name">${fn.name}</span>
        <span class="fn-purpose">${fn.purpose}</span>
      </div>
      <div class="fn-header-right">
        ${badges}
        <button class="copy-btn" onclick="copySnippet(event,'${fn.id}')" title="Copy snippet">⧉ Copy</button>
        <button class="fn-fav${saved?' saved':''}" onclick="toggleFav(event,'${fn.id}')" title="${saved?'Remove from saved':'Save'}">★</button>
        <svg class="fn-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
      </div>
    </div>
    <div class="fn-card-body">${body}</div>
  </div>`;
}

/* ── Navigation ──────────────────────────────────────────────── */
function buildNav(lang) {
  const d = DATA[lang];
  if (!d) return;
  const nav = document.getElementById('cat-nav');
  nav.innerHTML = d.groups.map(g => `
    <details class="cat-group" open>
      <summary class="cat-group-label">
        ${g.label}
        <svg class="cat-group-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
      </summary>
      ${g.cats.map(c => `
        <a class="cat-item${S.catKey===c.key?' active':''}" data-lang="${lang}" data-lang-tab="${lang}" data-cat="${c.key}" href="#" onclick="selectCat(event,'${lang}','${c.key}')">
          ${c.label}
          <span class="cat-badge">${c.fns.length}</span>
        </a>`).join('')}
    </details>`).join('');

  // Update lang tab active state
  document.querySelectorAll('.lang-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.lang === lang);
  });
}

function selectCat(e, lang, catKey) {
  if (e) e.preventDefault();
  S.lang = lang;
  S.catKey = catKey;

  // update nav active state
  document.querySelectorAll('.cat-item').forEach(el =>
    el.classList.toggle('active', el.dataset.cat === catKey && el.dataset.langTab === lang)
  );

  // find the category
  const d = DATA[lang];
  let cat = null, group = null;
  for (const g of d.groups) {
    const found = g.cats.find(c => c.key === catKey);
    if (found) { cat = found; group = g; break; }
  }
  if (!cat) return;

  // breadcrumb
  document.getElementById('bc-lang').textContent = d.label;
  document.getElementById('bc-group').textContent = group.label;
  document.getElementById('bc-sep2').style.display = '';
  document.getElementById('bc-cat').textContent = cat.label;
  document.getElementById('bc-lang').className = `bc-lang`;

  // cat header
  const hdr = document.getElementById('cat-header');
  hdr.style.display = '';
  document.getElementById('cat-title').textContent = cat.label;
  document.getElementById('cat-meta').textContent = `${cat.fns.length} function${cat.fns.length!==1?'s':''} · ${d.label}`;

  // render cards
  document.getElementById('fn-list').innerHTML = cat.fns.map(fn => cardHTML(fn, lang)).join('');

  // scroll to top
  document.getElementById('content').scrollTop = 0;
}

/* ── Lang tab switch ─────────────────────────────────────────── */
function switchLang(lang) {
  if (!DATA[lang]) return;
  S.lang = lang;
  S.catKey = null;
  buildNav(lang);

  // auto-select first cat
  const first = DATA[lang].groups[0]?.cats[0];
  if (first) selectCat(null, lang, first.key);
}

/* ── Card toggle ─────────────────────────────────────────────── */
function toggleCard(id) {
  const card = document.getElementById(id);
  if (!card) return;
  const opening = !card.classList.contains('open');
  card.classList.toggle('open');
  if (opening) {
    const fnId = card.dataset.fn;
    if (fnId) addRecent(fnId);
  }
}

/* ── Copy snippet ────────────────────────────────────────────── */
const SNIPPETS = {};
function buildSnippetMap() {
  for (const lang of Object.keys(DATA)) {
    const d = DATA[lang];
    if (!d) continue;
    for (const g of d.groups) for (const c of g.cats) for (const fn of c.fns) {
      SNIPPETS[fn.id] = fn.snippet || fn.name;
    }
  }
}

function copySnippet(e, fnId) {
  e.stopPropagation();
  const btn = e.currentTarget;
  const code = SNIPPETS[fnId] || fnId;
  navigator.clipboard.writeText(code).catch(() => {});
  btn.textContent = '✓ Copied';
  btn.classList.add('copied');
  setTimeout(() => { btn.textContent = '⧉ Copy'; btn.classList.remove('copied'); }, 1800);
}

/* ── Favorites ───────────────────────────────────────────────── */
function toggleFav(e, fnId) {
  e.stopPropagation();
  const btn = e.currentTarget;
  if (S.favs.has(fnId)) {
    S.favs.delete(fnId);
    btn.classList.remove('saved');
    btn.title = 'Save';
  } else {
    S.favs.add(fnId);
    btn.classList.add('saved');
    btn.title = 'Remove from saved';
  }
  localStorage.setItem('pyref-favs', JSON.stringify([...S.favs]));
}

/* ── Recently viewed ─────────────────────────────────────────── */
function addRecent(fnId) {
  S.recent = [fnId, ...S.recent.filter(x=>x!==fnId)].slice(0,20);
  localStorage.setItem('pyref-recent', JSON.stringify(S.recent));
}

/* ── Saved / Recent panel ────────────────────────────────────── */
function showSavedPanel() {
  const ids = [...S.favs];
  if (!ids.length) { alert('No saved functions yet. Click ★ on any card to save it.'); return; }
  const fns = collectFnsById(ids);
  renderSpecialView('Saved Functions', fns);
}

function showRecentPanel() {
  if (!S.recent.length) { alert('No recently viewed functions yet.'); return; }
  const fns = collectFnsById(S.recent);
  renderSpecialView('Recently Viewed', fns);
}

function collectFnsById(ids) {
  const results = [];
  for (const id of ids) {
    for (const lang of Object.keys(DATA)) {
      const d = DATA[lang]; if (!d) continue;
      for (const g of d.groups) for (const c of g.cats) {
        const fn = c.fns.find(f=>f.id===id);
        if (fn) { results.push({fn, lang}); break; }
      }
    }
  }
  return results;
}

function renderSpecialView(title, fnLangPairs) {
  S.catKey = null;
  document.querySelectorAll('.cat-item').forEach(el => el.classList.remove('active'));
  document.getElementById('cat-header').style.display = '';
  document.getElementById('cat-title').textContent = title;
  document.getElementById('cat-meta').textContent = `${fnLangPairs.length} function${fnLangPairs.length!==1?'s':''}`;
  document.getElementById('fn-list').innerHTML = fnLangPairs.map(({fn,lang})=>cardHTML(fn,lang)).join('');
  document.getElementById('content').scrollTop = 0;
}

/* ── Search overlay ──────────────────────────────────────────── */
function openSearch() {
  document.getElementById('search-overlay').classList.remove('hidden');
  document.getElementById('search-input').value = '';
  document.getElementById('search-results').innerHTML = renderSearchEmpty('Start typing to search…');
  setTimeout(() => document.getElementById('search-input').focus(), 50);
}

function closeSearch() {
  document.getElementById('search-overlay').classList.add('hidden');
}

function renderSearchEmpty(msg) {
  return `<div class="search-empty">${msg}</div>`;
}

let searchIdx = [];
function buildSearchIndex() {
  searchIdx = [];
  for (const lang of Object.keys(DATA)) {
    const d = DATA[lang]; if (!d) continue;
    for (const g of d.groups) for (const c of g.cats) for (const fn of c.fns) {
      searchIdx.push({
        id: fn.id, name: fn.name, purpose: fn.purpose, lang,
        langLabel: d.label, cat: c.label,
        tags: (fn.tags||[]).join(' '), related: (fn.related||[]).join(' '),
        searchStr: [fn.name, fn.purpose, ...(fn.tags||[]), ...(fn.related||[])].join(' ').toLowerCase()
      });
    }
  }
}

function doSearch(q) {
  q = q.trim().toLowerCase();
  if (!q) { document.getElementById('search-results').innerHTML = renderSearchEmpty('Start typing to search…'); return; }

  const results = searchIdx.filter(r => r.searchStr.includes(q)).slice(0, 30);

  if (!results.length) {
    document.getElementById('search-results').innerHTML = renderSearchEmpty(`No results for "<strong>${q}</strong>"`);
    return;
  }

  // Group by lang
  const byLang = {};
  for (const r of results) {
    (byLang[r.lang] = byLang[r.lang]||[]).push(r);
  }

  let html = '';
  for (const [lang, items] of Object.entries(byLang)) {
    html += `<div class="search-section-label">${DATA[lang].label}</div>`;
    html += items.map(r => `
      <div class="search-result-item" onclick="goToFn('${r.lang}','${r.id}')">
        <div>
          <div class="result-name">${r.name}</div>
          <div class="result-desc">${r.purpose}</div>
        </div>
        <div class="result-langs">
          <span class="result-lang-tag ${r.lang}">${r.langLabel}</span>
          <span style="font-size:11px;color:var(--text-muted)">${r.cat}</span>
        </div>
      </div>`).join('');
  }
  document.getElementById('search-results').innerHTML = html;
}

function goToFn(lang, fnId) {
  closeSearch();

  // find cat containing this fn
  const d = DATA[lang];
  for (const g of d.groups) for (const c of g.cats) {
    if (c.fns.find(f=>f.id===fnId)) {
      if (S.lang !== lang) { S.lang=lang; buildNav(lang); }
      selectCat(null, lang, c.key);
      setTimeout(() => {
        const card = document.getElementById(`card-${lang}-${fnId}`);
        if (card) { card.scrollIntoView({behavior:'smooth',block:'start'}); }
      }, 100);
      return;
    }
  }
}

/* ── Theme ───────────────────────────────────────────────────── */
function applyTheme(t) {
  S.theme = t;
  document.documentElement.dataset.theme = t==='auto' ? '' : t;
  if (t==='auto') delete document.documentElement.dataset.theme;
  localStorage.setItem('pyref-theme', t);
}

function cycleTheme() {
  const themes = ['auto','dark','light'];
  const i = themes.indexOf(S.theme);
  applyTheme(themes[(i+1)%themes.length]);
}

/* ── Sidebar collapse ────────────────────────────────────────── */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('collapsed');
}

function openMobileMenu() {
  document.getElementById('sidebar').classList.add('mobile-open');
  document.getElementById('mobile-backdrop').style.display = '';
}

function closeMobileMenu() {
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('mobile-backdrop').style.display = 'none';
}

/* ── Event binding ───────────────────────────────────────────── */
function bindEvents() {
  // Lang tabs
  document.getElementById('lang-tabs').addEventListener('click', e => {
    const tab = e.target.closest('.lang-tab');
    if (tab) switchLang(tab.dataset.lang);
  });

  // Search trigger
  document.getElementById('search-trigger').addEventListener('click', openSearch);
  document.getElementById('search-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeSearch();
  });
  document.getElementById('search-input').addEventListener('input', e => doSearch(e.target.value));

  // Keyboard
  document.addEventListener('keydown', e => {
    if ((e.metaKey||e.ctrlKey) && e.key==='k') { e.preventDefault(); openSearch(); }
    if (e.key==='Escape') closeSearch();
  });

  // Theme
  document.getElementById('btn-theme').addEventListener('click', cycleTheme);

  // Sidebar collapse
  document.getElementById('sidebar-collapse').addEventListener('click', toggleSidebar);

  // Mobile menu
  document.getElementById('mobile-menu-btn').addEventListener('click', openMobileMenu);

  // Saved / recent
  document.getElementById('btn-favs').addEventListener('click', showSavedPanel);
  document.getElementById('btn-recent').addEventListener('click', showRecentPanel);

  // Related tag clicks — navigate to related fn
  document.getElementById('fn-list').addEventListener('click', e => {
    const tag = e.target.closest('.tag.related');
    if (!tag) return;
    const name = tag.dataset.fn;
    const match = searchIdx.find(r => r.name === name);
    if (match) goToFn(match.lang, match.id);
  });
}

/* ── Init ────────────────────────────────────────────────────── */
function init() {
  applyTheme(S.theme);
  buildSearchIndex();
  buildSnippetMap();
  buildNav('python');
  const first = DATA.python.groups[0]?.cats[0];
  if (first) selectCat(null, 'python', first.key);
  bindEvents();
}

document.addEventListener('DOMContentLoaded', init);
