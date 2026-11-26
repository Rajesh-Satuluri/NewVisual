// Study Hub — aggregates every module's interview questions into one filterable
// page (group, module, free-text). Pulls Q&A directly from each module's
// exported IQ array via the shared aggregator, so it covers all 22 modules and
// never drifts from module content. Mirrors the Kafka tool's Study Hub.
import { MODULES } from '../components/nav.js';
import { QUIZ } from '../data/quiz-bank.js';
import { loadAllIQ } from '../data/iq-aggregate.js';
import { enhanceInterviewEdits } from '../components/interview-edits.js';

const GROUPS = [...new Set(MODULES.map((m) => m.group))];

export function mount(container) {
  const state = { group: 'all', module: 'all', query: '' };
  let ALL = [];

  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">★ · Review · ShopStream Edition</div>
        <h1 class="module-title">Study Hub</h1>
        <p class="module-subtitle">Every interview question across the course in one place — filter by section, module, or keyword, and edit any answer in place. Pulled straight from all ${MODULES.length} modules.</p>
      </div>

      <div class="study-stats">
        <div class="stat-box"><span class="stat-val" id="st-iq">…</span><span class="stat-label">Interview Q&amp;As</span></div>
        <div class="stat-box"><span class="stat-val">${MODULES.length}/${MODULES.length}</span><span class="stat-label">Modules covered</span></div>
        <div class="stat-box"><span class="stat-val">${QUIZ.length}</span><span class="stat-label">Quiz questions</span></div>
      </div>

      <div class="study-controls">
        <input class="study-search" type="search" placeholder="🔍 Search questions…" aria-label="Search questions" />
        <div class="study-chips" data-filter="group">
          <button class="study-chip active" data-val="all">All sections</button>
          ${GROUPS.map((g) => `<button class="study-chip" data-val="${g}">${g}</button>`).join('')}
        </div>
        <select class="study-select" aria-label="Filter by module">
          <option value="all">All modules</option>
          ${MODULES.map((m) => `<option value="${m.id}">${m.num} · ${m.title}</option>`).join('')}
        </select>
      </div>

      <div class="study-results" id="study-results"></div>
    </div>`;

  const resultsEl = container.querySelector('#study-results');
  const searchEl = container.querySelector('.study-search');
  resultsEl.innerHTML = `<div class="study-empty">Loading interview questions…</div>`;

  function apply() {
    const q = state.query.toLowerCase();
    const rows = ALL.filter((x) =>
      (state.group === 'all' || x.group === state.group) &&
      (state.module === 'all' || x.moduleId === state.module) &&
      (!q || (x.q + ' ' + x.a + ' ' + (x.tip || '')).toLowerCase().includes(q))
    ).sort((a, b) => a.moduleNum.localeCompare(b.moduleNum) || a.idx - b.idx);

    if (!rows.length) {
      resultsEl.innerHTML = `<div class="study-empty">No questions match your filters.</div>`;
      return;
    }

    resultsEl.innerHTML = `
      <div class="study-count">${rows.length} question${rows.length > 1 ? 's' : ''}</div>
      <div class="iq-list">
        ${rows.map((x) => `
          <div class="iq-item" data-iqkey="${x.moduleId}#${x.idx}" data-mid="${x.moduleId}">
            <div class="iq-question" role="button" tabindex="0" aria-expanded="false">
              <span class="q-num">${x.moduleNum}</span>
              <span class="q-text" style="flex:1">${x.q}</span>
              <span class="q-chevron">▼</span>
            </div>
            <div class="iq-answer">
              <div class="study-src"><a href="#${x.moduleId}">${x.icon} ${x.moduleNum} · ${x.moduleTitle}</a></div>
              <div class="iq-answer-body">
                ${x.a}
                ${x.tip ? `<div class="tip">💡 <strong>Interview tip:</strong> ${x.tip}</div>` : ''}
              </div>
            </div>
          </div>`).join('')}
      </div>`;

    // Expand/collapse — ignore clicks on the source link or the edit button.
    resultsEl.querySelectorAll('.iq-question').forEach((qEl) => {
      const toggle = () => qEl.closest('.iq-item').classList.toggle('open');
      qEl.addEventListener('click', (e) => {
        if (e.target.closest('a') || e.target.closest('.iq-edit-btn')) return;
        toggle();
      });
      qEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });

    // Wire in-place editing (shared with the module tabs via spark:iedit).
    try { enhanceInterviewEdits(resultsEl); } catch (_) {}
  }

  searchEl.addEventListener('input', () => { state.query = searchEl.value; apply(); });
  container.querySelector('.study-chips').addEventListener('click', (e) => {
    const chip = e.target.closest('.study-chip');
    if (!chip) return;
    state.group = chip.dataset.val;
    container.querySelectorAll('.study-chip').forEach((c) => c.classList.toggle('active', c === chip));
    apply();
  });
  container.querySelector('.study-select').addEventListener('change', (e) => { state.module = e.target.value; apply(); });

  let alive = true;
  // Re-render when an edit lands from another device or a module tab, but not
  // while the user is mid-edit here (don't clobber their open editor).
  const onRefresh = () => {
    if (alive && ALL.length && !resultsEl.querySelector('.iq-edit-toolbar')) apply();
  };
  window.addEventListener('spark:cloud-refresh', onRefresh);

  loadAllIQ().then((list) => {
    if (!alive) return;
    ALL = list;
    const iqEl = container.querySelector('#st-iq');
    if (iqEl) iqEl.textContent = ALL.length;
    apply();
  });

  return () => { alive = false; window.removeEventListener('spark:cloud-refresh', onRefresh); };
}

export default { mount };
