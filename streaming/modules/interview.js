// Interview Master (Phase 4). Browse by track with reveal + senior-nuance toggle;
// Rapid-fire and Timed rounds with self-assessment; Review-missed; and
// Mark-for-revision persisted locally (sml-revise). Honest per-bank counts shown.
import { CATEGORIES, QUESTIONS, BANK_TARGETS, bankCounts } from '../data/interview.js';

const REVISE_KEY = 'sml-revise';
function loadRevise() { try { return new Set(JSON.parse(localStorage.getItem(REVISE_KEY) || '[]')); } catch (e) { return new Set(); } }
function saveRevise(set) { try { localStorage.setItem(REVISE_KEY, JSON.stringify([...set])); } catch (e) {} }

let state;
function fresh() {
  return { cat: 'all', mode: 'browse', rIdx: 0, rOrder: [], rShown: false, missed: [], timed: false, startTs: 0, revise: loadRevise() };
}

export async function mount(container) {
  state = fresh();
  render(container);
}

function header() {
  const counts = bankCounts();
  const total = QUESTIONS.length;
  return `<div class="page-head"><div class="page-eyebrow">Practice</div>
    <h1 class="page-title">🎯 Interview Master</h1>
    <p class="page-sub">${total} questions across ${CATEGORIES.length} tracks. Reveal the model answer, expand the
      senior-level nuance, drill with Rapid-fire or a Timed round, then Review the ones you missed.</p></div>`;
}

function render(container) {
  if (state.mode === 'rapid' || state.mode === 'timed') return renderDrill(container);
  if (state.mode === 'review') return renderReview(container);
  const counts = bankCounts();
  const chips = [['all', 'All', QUESTIONS.length]].concat(CATEGORIES.map(c => [c.id, `${c.icon} ${c.label}`, counts[c.id] || 0]));
  const list = QUESTIONS.map((q, i) => ({ q, i })).filter(({ q }) => state.cat === 'all' || q.cat === state.cat);
  container.innerHTML = `
    ${header()}
    <div class="sim-controls" style="justify-content:space-between;gap:10px;flex-wrap:wrap">
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${chips.map(([id, l, n]) => `<button class="btn${state.cat === id ? ' primary' : ''}" data-cat="${id}" style="font-size:13px">${l} <span style="opacity:.6">${n}</span></button>`).join('')}
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn" id="iv-rapid" style="font-size:13px">⚡ Rapid-fire</button>
        <button class="btn" id="iv-timed" style="font-size:13px">⏱ Timed round</button>
        ${state.revise.size ? `<button class="btn" id="iv-revise" style="font-size:13px">☆ Revision (${state.revise.size})</button>` : ''}
      </div>
    </div>
    ${coverageNote(counts)}
    <div style="margin:8px 0 14px;color:var(--text3);font-size:13px">${list.length} question${list.length === 1 ? '' : 's'}</div>
    <div style="display:flex;flex-direction:column;gap:10px">
      ${list.map(({ q, i }) => qCard(q, i)).join('')}
    </div>`;
  wire(container);
}

function coverageNote(counts) {
  // Honest coverage: show current vs target per bank so no count is overstated.
  const rows = CATEGORIES.map(c => {
    const n = counts[c.id] || 0, t = BANK_TARGETS[c.id] || n;
    const pct = Math.min(100, Math.round(n / t * 100));
    return `<span class="pill ${n >= t ? 'live' : 'soon'}" title="${n} of ${t} target">${c.icon} ${n}/${t}</span>`;
  }).join(' ');
  return `<details class="lx-qa" style="margin:6px 0"><summary><span class="lx-qa-n">＋</span>Bank coverage (current / target)</summary>
    <div class="lx-qa-a" style="display:flex;flex-wrap:wrap;gap:6px">${rows}
      <div style="width:100%;color:var(--text3);font-size:12px;margin-top:6px">Targets are the master-prompt goals; banks grow over time. Counts reflect the real, distinct questions that exist today.</div>
    </div></details>`;
}

function qCard(q, i) {
  const cat = CATEGORIES.find(c => c.id === q.cat);
  const marked = state.revise.has(q.q);
  return `<div class="card iv-card">
    <div style="display:flex;gap:8px;align-items:flex-start">
      <span class="pill soon" style="flex-shrink:0">${cat ? cat.icon + ' ' + cat.label : q.cat}</span>
      <div style="font-weight:600;flex:1">${q.q}</div>
      <button class="btn" data-revise="${i}" title="Mark for revision" style="font-size:13px;flex-shrink:0">${marked ? '★' : '☆'}</button>
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
  container.querySelector('#iv-rapid')?.addEventListener('click', () => startDrill(container, false));
  container.querySelector('#iv-timed')?.addEventListener('click', () => startDrill(container, true));
  container.querySelector('#iv-revise')?.addEventListener('click', () => { state.mode = 'review'; state.reviewRevise = true; render(container); });
  container.querySelectorAll('[data-reveal]').forEach(b => b.addEventListener('click', () => {
    const i = b.dataset.reveal; const ans = container.querySelector(`[data-ans="${i}"]`);
    const open = ans.style.display !== 'none';
    ans.style.display = open ? 'none' : 'block'; b.textContent = open ? 'Show answer' : 'Hide answer';
  }));
  container.querySelectorAll('[data-revise]').forEach(b => b.addEventListener('click', () => {
    const q = QUESTIONS[+b.dataset.revise];
    if (state.revise.has(q.q)) state.revise.delete(q.q); else state.revise.add(q.q);
    saveRevise(state.revise); render(container);
  }));
}

function startDrill(container, timed) {
  const pool = QUESTIONS.map((q, i) => ({ q, i })).filter(({ q }) => state.cat === 'all' || q.cat === state.cat);
  state.mode = timed ? 'timed' : 'rapid';
  state.timed = timed;
  state.rShown = false; state.rIdx = 0; state.missed = [];
  state.rOrder = shuffle(pool.map(p => p.i));
  state.startTs = Date.now();
  renderDrill(container);
}

function renderDrill(container) {
  const qi = state.rOrder[state.rIdx]; const q = QUESTIONS[qi];
  const cat = CATEGORIES.find(c => c.id === q.cat);
  const elapsed = Math.floor((Date.now() - state.startTs) / 1000);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0'), ss = String(elapsed % 60).padStart(2, '0');
  container.innerHTML = `
    ${header()}
    <div class="sim-controls" style="justify-content:space-between">
      <div style="color:var(--text3);font-size:13px">${state.timed ? '⏱ Timed' : '⚡ Rapid-fire'} · ${state.rIdx + 1} / ${state.rOrder.length}
        ${state.timed ? `· <b style="color:var(--text)">${mm}:${ss}</b>` : ''} · missed ${state.missed.length}</div>
      <button class="btn" id="iv-exit" style="font-size:13px">✕ Exit</button>
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
      <div><button class="btn" id="iv-reveal">${state.rShown ? 'Hide' : 'Reveal'} answer</button></div>
      <div style="display:flex;gap:10px">
        <button class="btn" id="iv-missed" title="I missed this — add to review">✗ Missed</button>
        <button class="btn primary" id="iv-got">✓ Got it →</button>
      </div>
    </div>`;
  const next = (missed) => {
    if (missed && !state.missed.includes(qi)) state.missed.push(qi);
    if (state.rIdx + 1 >= state.rOrder.length) { state.mode = 'review'; state.reviewRevise = false; return render(container); }
    state.rIdx++; state.rShown = false; renderDrill(container);
  };
  container.querySelector('#iv-exit').addEventListener('click', () => { state.mode = 'browse'; render(container); });
  container.querySelector('#iv-reveal').addEventListener('click', () => { state.rShown = !state.rShown; renderDrill(container); });
  container.querySelector('#iv-got').addEventListener('click', () => next(false));
  container.querySelector('#iv-missed').addEventListener('click', () => next(true));
}

function renderReview(container) {
  const ids = state.reviewRevise
    ? QUESTIONS.map((q, i) => i).filter(i => state.revise.has(QUESTIONS[i].q))
    : state.missed;
  const title = state.reviewRevise ? '☆ Your revision list' : '📋 Round review — questions you missed';
  container.innerHTML = `
    ${header()}
    <div class="sim-controls" style="justify-content:space-between">
      <div style="color:var(--text3);font-size:14px;font-weight:600">${title} · ${ids.length} item${ids.length === 1 ? '' : 's'}</div>
      <button class="btn" id="iv-back" style="font-size:13px">← Back to tracks</button>
    </div>
    ${ids.length === 0
      ? `<div class="card"><p style="color:var(--text2)">${state.reviewRevise ? 'Nothing marked for revision yet — tap ☆ on any question.' : 'Clean round — you did not mark anything missed. 🎉'}</p></div>`
      : `<div style="display:flex;flex-direction:column;gap:10px">${ids.map(i => qCard(QUESTIONS[i], i)).join('')}</div>`}`;
  container.querySelector('#iv-back').addEventListener('click', () => { state.mode = 'browse'; render(container); });
  // reuse reveal/revise wiring
  container.querySelectorAll('[data-reveal]').forEach(b => b.addEventListener('click', () => {
    const i = b.dataset.reveal; const ans = container.querySelector(`[data-ans="${i}"]`);
    const open = ans.style.display !== 'none';
    ans.style.display = open ? 'none' : 'block'; b.textContent = open ? 'Show answer' : 'Hide answer';
  }));
  container.querySelectorAll('[data-revise]').forEach(b => b.addEventListener('click', () => {
    const q = QUESTIONS[+b.dataset.revise];
    if (state.revise.has(q.q)) state.revise.delete(q.q); else state.revise.add(q.q);
    saveRevise(state.revise); renderReview(container);
  }));
}

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }
