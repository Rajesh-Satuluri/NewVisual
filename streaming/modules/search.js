// Gate 8 (I74) — global search across every module, tool, incident, interview
// question, and glossary term. Pure client-side filter over the lazy catalog.
import { buildCatalog } from '../data/catalog.js';

export async function mount(container) {
  const items = await buildCatalog();
  container.innerHTML = `
    <div class="page-head"><div class="page-eyebrow">You</div>
      <h1 class="page-title">🔍 Search</h1>
      <p class="page-sub">Find any module, tool, incident, interview question, or glossary term across the lab.</p></div>
    <input id="q" type="search" placeholder="Search ${items.length} items — try &quot;watermark&quot;, &quot;exactly-once&quot;, &quot;shard&quot;…"
      aria-label="Search" autocomplete="off"
      style="width:100%;padding:14px 16px;font-size:16px;background:var(--bg2);color:var(--text);border:1px solid var(--border);border-radius:12px" />
    <div id="q-results" style="margin-top:14px"></div>`;
  const input = container.querySelector('#q');
  const out = container.querySelector('#q-results');

  function run(term) {
    const t = term.trim().toLowerCase();
    if (!t) { out.innerHTML = `<p style="color:var(--text3)">Type to search.</p>`; return; }
    const hits = items
      .map(it => ({ it, score: score(it, t) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 40);
    if (!hits.length) { out.innerHTML = `<p style="color:var(--text3)">No matches for “${escapeHtml(term)}”.</p>`; return; }
    out.innerHTML = `<div style="color:var(--text3);font-size:13px;margin-bottom:8px">${hits.length} result${hits.length === 1 ? '' : 's'}</div>
      <div style="display:flex;flex-direction:column;gap:8px">
      ${hits.map(({ it }) => `
        <div class="card" data-go="${it.id}" style="cursor:pointer;display:flex;gap:10px;align-items:flex-start">
          <span class="pill soon" style="flex-shrink:0">${it.kind}</span>
          <div><div style="font-weight:600">${hl(it.title, t)}</div>
            <div style="font-size:13px;color:var(--text2);margin-top:2px">${hl(it.sub || '', t)}</div></div>
        </div>`).join('')}</div>`;
    out.querySelectorAll('[data-go]').forEach(el => el.addEventListener('click', () => { location.hash = '#' + el.dataset.go; }));
  }
  input.addEventListener('input', () => run(input.value));
  run('');
  setTimeout(() => input.focus(), 30);
}

function score(it, t) {
  const title = (it.title || '').toLowerCase(), sub = (it.sub || '').toLowerCase(), kind = (it.kind || '').toLowerCase();
  let s = 0;
  if (title === t) s += 100;
  if (title.startsWith(t)) s += 40;
  if (title.includes(t)) s += 25;
  if (sub.includes(t)) s += 10;
  if (kind.includes(t)) s += 5;
  return s;
}
function hl(text, t) {
  const esc = escapeHtml(text); if (!t) return esc;
  try { return esc.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark style="background:var(--accent-lo);color:var(--accent2);padding:0 2px;border-radius:3px">$1</mark>'); }
  catch (e) { return esc; }
}
function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
