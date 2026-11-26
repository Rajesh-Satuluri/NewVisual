// interview.js — "Interview Q&A": a browsable, filterable bank of every
// interview question across the curriculum. All content is imported live from
// data/interview-bank.js (which aggregates each module's own IQ export) — this
// page retypes nothing.
import { INTERVIEW, GROUPS, QUESTION_COUNT } from '../data/interview-bank.js';

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export function mount(container) {
  const byGroup = GROUPS.map(g => ({
    group: g,
    entries: INTERVIEW.filter(e => e.group === g),
    count: INTERVIEW.filter(e => e.group === g).reduce((s, e) => s + e.questions.length, 0),
  }));

  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">Practice</div>
        <h1 class="module-title">Interview Q&amp;A</h1>
        <p class="module-subtitle">Every interview question in the course — ${QUESTION_COUNT} in all, drawn straight from each module's own bank. Filter, then reveal the model answer and the one-line tip to say out loud.</p>
      </div>
      <div class="scroll-content">
        <div class="iv-toolbar" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:18px">
          <input class="nav-filter" id="iv-filter" type="text" placeholder="Filter questions…" aria-label="Filter questions" style="max-width:420px" />
          <button class="ctrl-btn" id="iv-expand">Reveal all</button>
          <button class="ctrl-btn" id="iv-collapse">Hide all</button>
          <span class="ctrl-label" id="iv-count">${QUESTION_COUNT} questions</span>
        </div>
        <div id="iv-list">
          ${byGroup.map(g => `
            <div class="iv-group" data-group="${esc(g.group)}">
              <div class="section-header">
                <div class="section-title">${esc(g.group)} <span style="color:var(--text2);font-weight:500">· ${g.count}</span></div>
              </div>
              ${g.entries.map(e => e.questions.map((qq, i) => `
                <div class="iv-item" data-q="${esc((qq.q + ' ' + e.label).toLowerCase())}" style="margin:0 0 10px">
                  <button class="iv-q" aria-expanded="false" style="width:100%;text-align:left;background:var(--surface2,#111827);border:1px solid var(--border,#1e2a3f);border-left:3px solid var(--accent,#6366f1);border-radius:10px;padding:13px 15px;cursor:pointer;color:var(--text,#e2e8f0);font:inherit;font-weight:600;line-height:1.5">
                    <span style="display:block;font-size:11px;font-weight:600;color:var(--text2,#94a3b8);margin-bottom:4px">${esc(e.label)}</span>
                    ${esc(qq.q)}
                  </button>
                  <div class="iv-a" hidden style="border:1px solid var(--border,#1e2a3f);border-top:none;border-radius:0 0 10px 10px;padding:14px 16px;color:var(--text2,#cbd5e1);line-height:1.65">
                    <div class="iv-a-body">${qq.a}</div>
                    <div class="iv-tip" style="margin-top:12px;padding:9px 12px;background:rgba(99,102,241,0.12);border-radius:8px;font-size:13px;color:var(--text,#e2e8f0)"><strong>💬 Say it:</strong> ${esc(qq.tip)}</div>
                  </div>
                </div>`).join('')).join('')}
            </div>`).join('')}
        </div>
        <div id="iv-empty" hidden style="text-align:center;color:var(--text2);padding:40px">No questions match that filter.</div>
      </div>
    </div>`;

  const list = container.querySelector('#iv-list');

  // Toggle a single answer.
  list.addEventListener('click', e => {
    const btn = e.target.closest('.iv-q');
    if (!btn) return;
    const ans = btn.nextElementSibling;
    const open = !ans.hidden;
    ans.hidden = open;
    btn.setAttribute('aria-expanded', String(!open));
  });

  const setAll = open => {
    list.querySelectorAll('.iv-item').forEach(item => {
      if (item.hidden) return;
      const btn = item.querySelector('.iv-q');
      const ans = item.querySelector('.iv-a');
      ans.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
    });
  };
  container.querySelector('#iv-expand').addEventListener('click', () => setAll(true));
  container.querySelector('#iv-collapse').addEventListener('click', () => setAll(false));

  // Filter.
  const filter = container.querySelector('#iv-filter');
  const countEl = container.querySelector('#iv-count');
  const empty = container.querySelector('#iv-empty');
  filter.addEventListener('input', () => {
    const q = filter.value.trim().toLowerCase();
    let shown = 0;
    container.querySelectorAll('.iv-group').forEach(group => {
      let any = false;
      group.querySelectorAll('.iv-item').forEach(item => {
        const match = !q || item.dataset.q.includes(q);
        item.hidden = !match;
        if (match) { any = true; shown++; }
      });
      group.hidden = !any;
    });
    countEl.textContent = q ? `${shown} match${shown === 1 ? '' : 'es'}` : `${QUESTION_COUNT} questions`;
    empty.hidden = shown !== 0;
  });

  return null;
}
