// Interview Master Bank — reference page (EXTRAS).
// Tiered, full-schema dbt interview questions with search + tier filter.
// Each card expands to short answer, detailed answer, example, common mistake,
// follow-up, and the senior-level answer.
import { createModuleShell } from '../components/module-shell.js';
import { injectCodeEnhancements } from '../components/module-shell.js';
import { BANK, TIERS } from '../data/interview-bank.js';

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Reference · Interview',
    title: 'Interview Master Bank',
    subtitle: `${BANK.length} tiered questions, each with a short + detailed answer, example, common mistake, follow-up, and the senior-level answer.`,
    tabs: [{ id: 'bank', label: '🎯 Question Bank' }],
  });

  const tab = container.querySelector('#tab-bank');
  const counts = Object.fromEntries(TIERS.map(t => [t.id, BANK.filter(b => b.tier === t.id).length]));

  tab.innerHTML = `
    <div class="ref-toolbar">
      <input class="ref-search" id="ib-search" type="text" placeholder="Search questions, answers, topics…" />
    </div>
    <div class="ref-toolbar" id="ib-tiers">
      <button class="ref-chip active" data-tier="all">All <span class="ib-n">${BANK.length}</span></button>
      ${TIERS.map(t => `<button class="ref-chip" data-tier="${t.id}" style="--chipC:${t.color}">${t.label} <span class="ib-n">${counts[t.id] || 0}</span></button>`).join('')}
    </div>
    <div class="ib-count" id="ib-count"></div>
    <div class="ib-list" id="ib-list"></div>
  `;

  const listEl = tab.querySelector('#ib-list');
  const countEl = tab.querySelector('#ib-count');
  const search = tab.querySelector('#ib-search');
  let tier = 'all', q = '';

  const tierMeta = id => TIERS.find(t => t.id === id) || { label: id, color: 'var(--accent)' };

  function card(b, i) {
    const tm = tierMeta(b.tier);
    return `
      <div class="ib-item" data-i="${i}">
        <button class="ib-q">
          <span class="ib-tier" style="background:${tm.color}22;color:${tm.color}">${tm.label}</span>
          <span class="ib-qtext">${b.q}</span>
          <span class="ib-chevron">▾</span>
        </button>
        <div class="ib-a">
          <div class="ib-a-body">
            <div class="ib-row"><span class="ib-k">Short answer</span><div>${b.short}</div></div>
            <div class="ib-row"><span class="ib-k">Detailed</span><div>${b.detailed}</div></div>
            ${b.example ? `<div class="ib-row"><span class="ib-k">Example</span><div class="code-block" data-lang="sql">${escapeHtml(b.example)}</div></div>` : ''}
            <div class="ib-row"><span class="ib-k ib-k-warn">Common mistake</span><div>${b.mistake}</div></div>
            <div class="ib-row"><span class="ib-k ib-k-follow">Follow-up</span><div>${b.followup}</div></div>
            <div class="ib-row"><span class="ib-k ib-k-senior">Senior answer</span><div>${b.senior}</div></div>
          </div>
        </div>
      </div>`;
  }

  function render() {
    const ql = q.trim().toLowerCase();
    const items = BANK.map((b, i) => ({ b, i })).filter(({ b }) => {
      if (tier !== 'all' && b.tier !== tier) return false;
      if (!ql) return true;
      return (b.q + b.short + b.detailed + b.mistake + b.followup + b.senior + b.cat).toLowerCase().includes(ql);
    });
    countEl.textContent = `${items.length} question${items.length === 1 ? '' : 's'}${tier !== 'all' ? ' · ' + tierMeta(tier).label : ''}${ql ? ` · matching "${q.trim()}"` : ''}`;
    listEl.innerHTML = items.length
      ? items.map(({ b, i }) => card(b, i)).join('')
      : `<div class="ref-empty">No questions match. Try a different tier or search.</div>`;
    injectCodeEnhancements(listEl);
  }

  tab.querySelector('#ib-tiers').addEventListener('click', e => {
    const chip = e.target.closest('.ref-chip');
    if (!chip) return;
    tab.querySelectorAll('#ib-tiers .ref-chip').forEach(c => c.classList.toggle('active', c === chip));
    tier = chip.dataset.tier; render();
  });
  search.addEventListener('input', () => { q = search.value; render(); });
  listEl.addEventListener('click', e => {
    const qbtn = e.target.closest('.ib-q');
    if (!qbtn) return;
    const item = qbtn.closest('.ib-item');
    const a = item.querySelector('.ib-a');
    const open = item.classList.toggle('open');
    a.style.maxHeight = open ? a.scrollHeight + 'px' : '0';
  });

  render();
}

function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
