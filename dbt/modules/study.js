// Study Hub — every Test-Yourself question in one filterable place, plus
// progress stats and deep links into each module. A review surface.
import { createModuleShell } from '../components/module-shell.js';
import { MODULES } from '../components/nav.js';
import { QUIZ_BANK } from '../data/quiz-bank.js';

export function mount(container) {
  const done = new Set(JSON.parse(localStorage.getItem('dbt-done') || '[]'));
  const realDone = [...done].filter(id => MODULES.some(m => m.id === id)).length;

  // Flatten all quiz questions, tagged with their module.
  const ALL = [];
  MODULES.forEach(m => {
    (QUIZ_BANK[m.id] || []).forEach(q => ALL.push({ ...q, mid: m.id, mtitle: m.title, micon: m.icon }));
  });

  container.innerHTML = createModuleShell({
    tag: 'Review · Study Hub',
    title: 'Study Hub',
    subtitle: 'Every check-yourself question across all modules, in one place. Search, filter by module, and reveal answers to review before an interview.',
    tabs: [{ id: 's', label: '📚 Review Deck' }],
  });

  const modOpts = ['<option value="all">All modules</option>']
    .concat(MODULES.filter(m => QUIZ_BANK[m.id]).map(m => `<option value="${m.id}">${m.icon} ${m.title}</option>`))
    .join('');

  const tab = container.querySelector('#tab-s');
  tab.innerHTML = `
    <div class="study-stats">
      <div class="stat-box"><span class="stat-val">${realDone}/${MODULES.length}</span><span class="stat-label">Modules viewed</span></div>
      <div class="stat-box"><span class="stat-val">${ALL.length}</span><span class="stat-label">Review questions</span></div>
      <div class="stat-box"><span class="stat-val">${Math.round((realDone / MODULES.length) * 100)}%</span><span class="stat-label">Course progress</span></div>
    </div>
    <div class="study-controls">
      <input class="study-search" type="text" placeholder="Search questions…" aria-label="Search questions" />
      <select class="study-select" aria-label="Filter by module">${modOpts}</select>
      <button class="ref-chip" data-reveal>Reveal all</button>
    </div>
    <div class="study-count"></div>
    <div class="iq-list study-list"></div>
    <div class="study-empty" hidden>No questions match your search.</div>
  `;

  const list = tab.querySelector('.study-list');
  const empty = tab.querySelector('.study-empty');
  const count = tab.querySelector('.study-count');
  const search = tab.querySelector('.study-search');
  const select = tab.querySelector('.study-select');
  let allRevealed = false;

  function render() {
    const q = search.value.trim().toLowerCase();
    const mid = select.value;
    const items = ALL.filter(it =>
      (mid === 'all' || it.mid === mid) &&
      (!q || it.q.toLowerCase().includes(q) || it.explanation.toLowerCase().includes(q))
    );
    count.textContent = `${items.length} question${items.length === 1 ? '' : 's'}`;
    list.innerHTML = items.map((it, i) => `
      <div class="iq-item ${allRevealed ? 'open' : ''}">
        <button class="iq-question">
          <span class="iq-num">${it.micon}</span>
          <span>${it.q}</span>
          <span class="iq-chevron">▾</span>
        </button>
        <div class="iq-answer" style="${allRevealed ? 'max-height:600px' : ''}">
          <div class="iq-answer-body">
            <strong>Answer:</strong> ${it.options[it.answer]}
            <div class="iq-tip" style="margin-top:10px">💡 ${it.explanation}</div>
            <div class="study-src" style="margin-top:10px">↳ <a data-goto="${it.mid}">Go to ${it.micon} ${it.mtitle}</a></div>
          </div>
        </div>
      </div>`).join('');
    empty.hidden = items.length > 0;

    // Accordion behaviour (mirrors initIQ, scoped here).
    list.querySelectorAll('.iq-item').forEach(item => {
      const btn = item.querySelector('.iq-question');
      const ans = item.querySelector('.iq-answer');
      btn.addEventListener('click', () => {
        const open = item.classList.toggle('open');
        ans.style.maxHeight = open ? ans.scrollHeight + 'px' : '0';
      });
    });
  }

  search.addEventListener('input', render);
  select.addEventListener('change', render);
  tab.querySelector('[data-reveal]').addEventListener('click', (e) => {
    allRevealed = !allRevealed;
    e.target.classList.toggle('active', allRevealed);
    e.target.textContent = allRevealed ? 'Hide all' : 'Reveal all';
    render();
  });
  list.addEventListener('click', e => {
    const link = e.target.closest('[data-goto]');
    if (link) window.location.hash = link.dataset.goto;
  });

  render();
}
