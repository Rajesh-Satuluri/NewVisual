// B1 viewer · Quiz flow — pick a scope, answer MCQs, get scored, review explanations.
import { createModuleShell, initTabs } from '../components/module-shell.js';
import { injectModStyles, esc } from './_mod-ui.js';
import { QUIZ } from '../data/quiz-bank.js';
import { MODULES } from '../components/nav.js';

const titleOf = (id) => (MODULES.find((m) => m.id === id) || {}).title || id;
const shuffle = (a) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

export function mount(container) {
  injectModStyles();

  const mods = [...new Set(QUIZ.map((q) => q.m))].sort();
  const intro = `
  <div class="ss-prose">
    <p><b>${QUIZ.length}</b> interview-style multiple-choice questions across every module. Pick a scope and length, answer, and get a scored review with explanations.</p>
  </div>
  <div class="ss-controls">
    <label style="font-size:12.5px;color:var(--text-secondary)">Scope:
      <select id="qz-scope" class="ss-btn" style="margin-left:4px">
        <option value="__all__">All modules (${QUIZ.length})</option>
        ${mods.map((m) => `<option value="${m}">${m.toUpperCase()} · ${esc(titleOf(m))} (${QUIZ.filter((q) => q.m === m).length})</option>`).join('')}
      </select></label>
    <label style="font-size:12.5px;color:var(--text-secondary)">Length:
      <select id="qz-len" class="ss-btn" style="margin-left:4px">
        <option value="10">10</option><option value="20">20</option><option value="0">All in scope</option>
      </select></label>
    <button class="ss-btn primary" id="qz-start">Start quiz ▶</button>
  </div>
  <div id="qz-area"></div>`;

  container.innerHTML = createModuleShell({
    tag: 'Interview · B1',
    title: '❓ Quiz Bank',
    subtitle: `${QUIZ.length} module-tagged multiple-choice questions`,
    tabs: [{ id: 'quiz', label: '❓ Quiz', content: intro }],
  });
  initTabs(container);

  const area = container.querySelector('#qz-area');
  const scopeSel = container.querySelector('#qz-scope');
  const lenSel = container.querySelector('#qz-len');

  let set = [], answers = [], idx = 0;

  function start() {
    const scope = scopeSel.value;
    const pool = scope === '__all__' ? QUIZ : QUIZ.filter((q) => q.m === scope);
    const len = +lenSel.value;
    set = shuffle(pool);
    if (len > 0) set = set.slice(0, len);
    answers = new Array(set.length).fill(null);
    idx = 0;
    renderQ();
  }

  function renderQ() {
    const q = set[idx];
    area.innerHTML = `
      <div class="ss-metrics"><div class="ss-metric"><div class="k">Question</div><div class="v">${idx + 1} / ${set.length}</div></div>
        <div class="ss-metric"><div class="k">Module</div><div class="v" style="font-size:14px">${q.m.toUpperCase()}</div></div></div>
      <div class="ss-card" style="margin:10px 0">
        <p style="color:var(--text-primary);font-size:14.5px;font-weight:600;margin:0 0 12px">${esc(q.q)}</p>
        <div id="qz-choices">${q.c.map((c, i) => `<button class="ss-btn qz-choice" data-i="${i}" style="display:block;width:100%;text-align:left;margin:6px 0">${String.fromCharCode(65 + i)}. ${esc(c)}</button>`).join('')}</div>
        <div id="qz-fb" style="margin-top:10px"></div>
      </div>
      <div class="ss-controls"><button class="ss-btn" id="qz-prev"${idx === 0 ? ' disabled' : ''}>◀ Prev</button>
        <button class="ss-btn primary" id="qz-next">${idx === set.length - 1 ? 'Finish ▶' : 'Next ▶'}</button></div>`;

    const choicesEl = area.querySelector('#qz-choices');
    const fb = area.querySelector('#qz-fb');
    const reveal = (chosen) => {
      [...choicesEl.querySelectorAll('.qz-choice')].forEach((b) => {
        const i = +b.dataset.i;
        b.disabled = true;
        if (i === q.a) b.style.borderColor = 'var(--green,#10B981)';
        if (i === chosen && chosen !== q.a) b.style.borderColor = 'var(--red,#EF4444)';
      });
      fb.innerHTML = `<div class="ss-callout" style="margin:8px 0 0;border-left-color:${chosen === q.a ? 'var(--green,#10B981)' : 'var(--red,#EF4444)'}">${chosen === q.a ? '✅ Correct.' : '❌ Not quite.'} ${esc(q.e)}</div>`;
    };
    if (answers[idx] !== null) reveal(answers[idx]);
    choicesEl.querySelectorAll('.qz-choice').forEach((b) => b.addEventListener('click', () => { answers[idx] = +b.dataset.i; reveal(+b.dataset.i); }));
    area.querySelector('#qz-prev').addEventListener('click', () => { if (idx > 0) { idx--; renderQ(); } });
    area.querySelector('#qz-next').addEventListener('click', () => { if (idx < set.length - 1) { idx++; renderQ(); } else finish(); });
  }

  function finish() {
    const correct = set.reduce((n, q, i) => n + (answers[i] === q.a ? 1 : 0), 0);
    const pct = Math.round((correct / set.length) * 100);
    const byMod = {};
    set.forEach((q, i) => { byMod[q.m] = byMod[q.m] || { n: 0, c: 0 }; byMod[q.m].n++; if (answers[i] === q.a) byMod[q.m].c++; });
    area.innerHTML = `
      <div class="ss-metrics">
        <div class="ss-metric"><div class="k">Score</div><div class="v" style="color:${pct >= 70 ? 'var(--green,#10B981)' : pct >= 50 ? 'var(--yellow,#F59E0B)' : 'var(--red,#EF4444)'}">${pct}%</div></div>
        <div class="ss-metric"><div class="k">Correct</div><div class="v">${correct} / ${set.length}</div></div>
      </div>
      <div class="ss-prose"><h3>By module</h3>
        <table class="ss-tbl"><thead><tr><th>Module</th><th>Score</th></tr></thead><tbody>
        ${Object.entries(byMod).sort().map(([m, s]) => `<tr><td>${m.toUpperCase()} · ${esc(titleOf(m))}</td><td>${s.c}/${s.n}</td></tr>`).join('')}
        </tbody></table>
        ${Object.entries(byMod).filter(([, s]) => s.c < s.n).length ? `<div class="ss-callout">Review the modules where you missed questions, then retake the quiz scoped to them.</div>` : '<div class="ss-callout">Perfect run — try "All modules" for a full sweep.</div>'}
      </div>
      <div class="ss-controls"><button class="ss-btn primary" id="qz-again">⟲ New quiz</button></div>`;
    area.querySelector('#qz-again').addEventListener('click', () => { area.innerHTML = ''; });
  }

  container.querySelector('#qz-start').addEventListener('click', start);
  return null;
}

export default { mount };
