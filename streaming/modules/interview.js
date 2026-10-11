// Gate 7 (I70–I72) — Interview Master. Browse by category with reveal + a
// "senior nuance" depth toggle (also serves I77 multi-level explanations), plus a
// Rapid-fire mode that shuffles the whole bank for self-testing.
import { CATEGORIES, QUESTIONS } from '../data/interview.js';

let state = { cat: 'all', rapid: false, rIdx: 0, rOrder: [], rShown: false };

export async function mount(container) {
  state = { cat: 'all', rapid: false, rIdx: 0, rOrder: [], rShown: false };
  render(container);
}

function header() {
  return `<div class="page-head"><div class="page-eyebrow">Practice</div>
    <h1 class="page-title">🎯 Interview Master</h1>
    <p class="page-sub">${QUESTIONS.length} questions across ${CATEGORIES.length} tracks. Reveal the model answer,
      then expand the senior-level nuance. Or switch to Rapid-fire to drill the whole bank.</p></div>`;
}

function render(container) {
  if (state.rapid) return renderRapid(container);
  const chips = [['all', 'All']].concat(CATEGORIES.map(c => [c.id, `${c.icon} ${c.label}`]));
  const list = QUESTIONS.filter(q => state.cat === 'all' || q.cat === state.cat);
  container.innerHTML = `
    ${header()}
    <div class="sim-controls" style="justify-content:space-between">
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${chips.map(([id, l]) => `<button class="btn${state.cat === id ? ' primary' : ''}" data-cat="${id}" style="font-size:13px">${l}</button>`).join('')}
      </div>
      <button class="btn" id="iv-rapid" style="font-size:13px">⚡ Rapid-fire</button>
    </div>
    <div style="margin:8px 0 14px;color:var(--text3);font-size:13px">${list.length} question${list.length === 1 ? '' : 's'}</div>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${list.map((q, i) => qCard(q, i)).join('')}
    </div>`;
  wire(container);
}

function qCard(q, i) {
  const cat = CATEGORIES.find(c => c.id === q.cat);
  return `<div class="card iv-card">
    <div style="display:flex;gap:8px;align-items:flex-start">
      <span class="pill soon" style="flex-shrink:0">${cat ? cat.icon + ' ' + cat.label : q.cat}</span>
      <div style="font-weight:600">${q.q}</div>
    </div>
    <div style="margin-top:10px"><button class="btn" data-reveal="${i}" style="font-size:13px">Show answer</button></div>
    <div class="iv-ans" data-ans="${i}" style="display:none;margin-top:10px">
      <p style="color:var(--text2);margin:0 0 8px">${q.a}</p>
      ${q.senior ? `<details class="lx-qa"><summary><span class="lx-qa-n">＋</span>Senior-level nuance</summary>
        <div class="lx-qa-a">${q.senior}</div></details>` : ''}
    </div>
  </div>`;
}

function wire(container) {
  container.querySelectorAll('[data-cat]').forEach(b => b.addEventListener('click', () => { state.cat = b.dataset.cat; render(container); }));
  container.querySelector('#iv-rapid')?.addEventListener('click', () => {
    state.rapid = true; state.rShown = false; state.rIdx = 0;
    state.rOrder = shuffle([...QUESTIONS.keys()]); render(container);
  });
  container.querySelectorAll('[data-reveal]').forEach(b => b.addEventListener('click', () => {
    const i = b.dataset.reveal; const ans = container.querySelector(`[data-ans="${i}"]`);
    const open = ans.style.display !== 'none';
    ans.style.display = open ? 'none' : 'block'; b.textContent = open ? 'Show answer' : 'Hide answer';
  }));
}

function renderRapid(container) {
  const qi = state.rOrder[state.rIdx]; const q = QUESTIONS[qi];
  const cat = CATEGORIES.find(c => c.id === q.cat);
  container.innerHTML = `
    ${header()}
    <div class="sim-controls" style="justify-content:space-between">
      <div style="color:var(--text3);font-size:13px">Rapid-fire · ${state.rIdx + 1} / ${state.rOrder.length}</div>
      <button class="btn" id="iv-exit" style="font-size:13px">✕ Exit rapid-fire</button>
    </div>
    <div class="card" style="min-height:160px">
      <span class="pill soon">${cat ? cat.icon + ' ' + cat.label : q.cat}</span>
      <div style="font-weight:700;font-size:18px;margin:12px 0">${q.q}</div>
      <div id="iv-rans" style="display:${state.rShown ? 'block' : 'none'}">
        <p style="color:var(--text2);margin:0 0 8px">${q.a}</p>
        ${q.senior ? `<details class="lx-qa"><summary><span class="lx-qa-n">＋</span>Senior-level nuance</summary><div class="lx-qa-a">${q.senior}</div></details>` : ''}
      </div>
    </div>
    <div class="lx-nav">
      <div><button class="btn" id="iv-prev">← Prev</button></div>
      <div style="display:flex;gap:10px">
        <button class="btn" id="iv-reveal">${state.rShown ? 'Hide' : 'Reveal'} answer</button>
        <button class="btn primary" id="iv-next">Next →</button>
      </div>
    </div>`;
  container.querySelector('#iv-exit').addEventListener('click', () => { state.rapid = false; render(container); });
  container.querySelector('#iv-reveal').addEventListener('click', () => { state.rShown = !state.rShown; renderRapid(container); });
  container.querySelector('#iv-next').addEventListener('click', () => { state.rIdx = (state.rIdx + 1) % state.rOrder.length; state.rShown = false; renderRapid(container); });
  container.querySelector('#iv-prev').addEventListener('click', () => { state.rIdx = (state.rIdx - 1 + state.rOrder.length) % state.rOrder.length; state.rShown = false; renderRapid(container); });
}

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }
