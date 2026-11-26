// B2 viewer · Coding problems — prompt + approach, reveal worked PySpark/Scala solution.
import { createModuleShell, initTabs } from '../components/module-shell.js';
import { injectModStyles, codeBlock, esc } from './_mod-ui.js';
import { CODING } from '../data/coding-bank.js';
import { MODULES } from '../components/nav.js';

const titleOf = (id) => (MODULES.find((m) => m.id === id) || {}).title || id;
const DIFF = { easy: ['Easy', 'var(--green,#10B981)'], med: ['Medium', 'var(--yellow,#F59E0B)'], hard: ['Hard', 'var(--red,#EF4444)'] };

export function mount(container) {
  injectModStyles();

  const intro = `
  <div class="ss-prose">
    <p><b>${CODING.length}</b> PySpark/Scala coding problems with worked solutions — the kind you write on a whiteboard or in a take-home. Read the prompt, think through the approach, then reveal the solution.</p>
  </div>
  <div class="ss-controls">
    <label style="font-size:12.5px;color:var(--text-secondary)">Difficulty:
      <select id="cd-diff" class="ss-btn" style="margin-left:4px">
        <option value="__all__">All (${CODING.length})</option>
        <option value="easy">Easy</option><option value="med">Medium</option><option value="hard">Hard</option>
      </select></label>
    <button class="ss-btn" id="cd-expand">Reveal all</button>
    <button class="ss-btn" id="cd-collapse">Hide all</button>
  </div>
  <div id="cd-list"></div>`;

  container.innerHTML = createModuleShell({
    tag: 'Interview · B2',
    title: '⌨️ Coding Problems',
    subtitle: `${CODING.length} PySpark/Scala problems with worked solutions`,
    tabs: [{ id: 'coding', label: '⌨️ Problems', content: intro }],
  });
  initTabs(container);

  const list = container.querySelector('#cd-list');
  const diffSel = container.querySelector('#cd-diff');

  function render() {
    const d = diffSel.value;
    const items = CODING.filter((c) => d === '__all__' || c.diff === d);
    list.innerHTML = items.map((c, i) => {
      const [dl, dc] = DIFF[c.diff];
      return `<div class="ss-card" style="margin:12px 0">
        <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">
          <span style="font-size:11px;font-weight:700;color:${dc};border:1px solid ${dc};border-radius:5px;padding:1px 7px">${dl}</span>
          <a href="#${c.m}" class="ss-btn" style="padding:1px 7px;font-size:11px;font-weight:700">${c.m.toUpperCase()}</a>
          <b style="color:var(--text-primary);font-size:14px">${esc(c.title)}</b>
        </div>
        <p style="margin:8px 0;font-size:13.5px;line-height:1.6;color:var(--text-secondary)">${esc(c.prompt)}</p>
        <button class="ss-btn primary cd-toggle" data-i="${i}" style="margin-top:4px">Show solution ▾</button>
        <div class="cd-sol" data-sol="${i}" style="display:none;margin-top:10px">
          <div class="ss-callout" style="margin:0 0 8px"><b>Approach:</b> ${esc(c.approach)}</div>
          ${codeBlock('PySpark', c.py)}
          ${codeBlock('Scala', c.scala)}
        </div>
      </div>`;
    }).join('');
    list.querySelectorAll('.cd-toggle').forEach((btn) => btn.addEventListener('click', () => {
      const sol = list.querySelector(`[data-sol="${btn.dataset.i}"]`);
      const open = sol.style.display !== 'none';
      sol.style.display = open ? 'none' : 'block';
      btn.textContent = open ? 'Show solution ▾' : 'Hide solution ▴';
    }));
  }

  container.querySelector('#cd-expand').addEventListener('click', () => { list.querySelectorAll('.cd-sol').forEach((s) => (s.style.display = 'block')); list.querySelectorAll('.cd-toggle').forEach((b) => (b.textContent = 'Hide solution ▴')); });
  container.querySelector('#cd-collapse').addEventListener('click', () => { list.querySelectorAll('.cd-sol').forEach((s) => (s.style.display = 'none')); list.querySelectorAll('.cd-toggle').forEach((b) => (b.textContent = 'Show solution ▾')); });
  diffSel.addEventListener('change', render);
  render();
  return null;
}

export default { mount };
