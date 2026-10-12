// Gate 8 (I75 + I77) — glossary with a beginner/practitioner depth toggle and
// live filter. Multi-level explanations satisfy I77.
import { GLOSSARY } from '../data/glossary.js';

export async function mount(container) {
  let deep = false, filter = '';
  function render() {
    const terms = GLOSSARY
      .filter(g => !filter || (g.term + ' ' + g.short + ' ' + g.deep).toLowerCase().includes(filter))
      .sort((a, b) => a.term.localeCompare(b.term));
    container.innerHTML = `
      <div class="page-head"><div class="page-eyebrow">You</div>
        <h1 class="page-title">📖 Glossary</h1>
        <p class="page-sub">${GLOSSARY.length} streaming terms, each at two depths. Toggle between a plain-language
          definition and the practitioner-level nuance.</p></div>
      <div class="sim-controls" style="justify-content:space-between">
        <input id="gl-q" type="search" value="${filter}" placeholder="Filter terms…" aria-label="Filter glossary"
          style="flex:1;min-width:180px;padding:10px 12px;background:var(--bg2);color:var(--text);border:1px solid var(--border);border-radius:10px" />
        <div style="display:flex;gap:6px">
          <button class="btn${deep ? '' : ' primary'}" data-level="basic">🌱 Plain</button>
          <button class="btn${deep ? ' primary' : ''}" data-level="deep">🎓 Practitioner</button>
        </div>
      </div>
      <div style="color:var(--text3);font-size:13px;margin:8px 0 12px">${terms.length} term${terms.length === 1 ? '' : 's'}</div>
      <div class="grid cols-2">
        ${terms.map(g => `
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
              <h3 style="margin:0">${g.term}</h3>
              ${g.see ? `<button class="btn" data-go="${g.see}" style="font-size:12px;padding:4px 10px">Learn →</button>` : ''}
            </div>
            <p style="color:var(--text2);margin:8px 0 0;font-size:14px">${deep ? g.deep : g.short}</p>
          </div>`).join('')}
      </div>`;
    const q = container.querySelector('#gl-q');
    q.addEventListener('input', () => { filter = q.value.toLowerCase(); const pos = q.selectionStart; render(); const nq = container.querySelector('#gl-q'); nq.focus(); try { nq.setSelectionRange(pos, pos); } catch (e) {} });
    container.querySelectorAll('[data-level]').forEach(b => b.addEventListener('click', () => { deep = b.dataset.level === 'deep'; render(); }));
    container.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { location.hash = '#' + b.dataset.go; }));
  }
  render();
}
