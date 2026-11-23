// Study Hub — aggregates every module's interview questions into one filterable
// page (difficulty, module, free-text). Each question can be edited in place;
// edits are stored as per-question overrides and carried across devices by the
// optional cloud sync. Auto-populates as IQ_BANK grows.
import { MODULES } from '../components/nav.js';
import { IQ_BANK } from '../data/iq-bank.js';
import { QUIZ_BANK } from '../data/quiz-bank.js';
import { renderAnswer } from '../components/module-shell.js';
import { renderMarkdown } from '../components/md.js';
import { loadOverride, saveOverride, applyOverrideTo, syncHint, wireSyncCta } from '../components/iq-overrides.js';
import { cloud } from '../components/cloudsync.js';

const DIFF_ORDER = { easy: 0, medium: 1, hard: 2 };
const numOf = id => id.replace(/^m/, '');

// Flat list of every interview question across all modules, tagged with its
// source module and its index within that module (the override key).
function flatten() {
  const out = [];
  MODULES.forEach(m => {
    (IQ_BANK[m.id] || []).forEach((qa, i) => {
      out.push({
        moduleId: m.id, moduleTitle: m.label, moduleNum: numOf(m.id),
        group: m.group, icon: m.icon,
        difficulty: qa.difficulty || 'medium', q: qa.q, a: qa.a, tip: qa.tip, md: qa.md, idx: i,
      });
    });
  });
  return out;
}

export function mount(container) {
  const ALL = flatten();
  const modulesCovered = new Set(ALL.map(x => x.moduleId));
  const totalQuizzes = Object.keys(QUIZ_BANK).reduce((n, k) => n + QUIZ_BANK[k].length, 0);
  const state = { difficulty: 'all', module: 'all', query: '' };

  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">★ · Review · Amazon Edition</div>
        <h1 class="module-title">Study Hub</h1>
        <p class="module-subtitle">Every interview question across the course in one place — filter by difficulty, module, or keyword, and edit any answer in place. Grows automatically as each module's Q&amp;A is added.</p>
      </div>

      <div class="study-stats">
        <div class="stat-box"><span class="stat-val">${ALL.length}</span><span class="stat-label">Interview Q&amp;As</span></div>
        <div class="stat-box"><span class="stat-val">${modulesCovered.size}/${MODULES.length}</span><span class="stat-label">Modules covered</span></div>
        <div class="stat-box"><span class="stat-val">${totalQuizzes}</span><span class="stat-label">Quiz questions</span></div>
      </div>

      <div class="study-controls">
        <input class="study-search" type="search" placeholder="🔍 Search questions…" aria-label="Search questions" />
        <div class="study-chips" data-filter="difficulty">
          ${['all', 'easy', 'medium', 'hard'].map(d =>
            `<button class="study-chip ${d === 'all' ? 'active' : ''}" data-val="${d}">${d === 'all' ? 'All levels' : d[0].toUpperCase() + d.slice(1)}</button>`).join('')}
        </div>
        <select class="study-select" aria-label="Filter by module">
          <option value="all">All modules</option>
          ${MODULES.filter(m => modulesCovered.has(m.id)).map(m =>
            `<option value="${m.id}">${numOf(m.id)} · ${m.label}</option>`).join('')}
        </select>
      </div>

      <div class="study-results" id="study-results"></div>
    </div>`;

  const resultsEl = container.querySelector('#study-results');
  const searchEl = container.querySelector('.study-search');

  // The display content for a row = its original Q&A with the user's override
  // (if any) merged in. This is the same override record the module tab would
  // read/write, so an edit here shows up anywhere that question appears.
  const viewOf = x => applyOverrideTo(x, x.moduleId, x.idx);

  const answerInner = v => `
    <div class="study-src"><a href="#${v.moduleId}">${v.icon} ${v.moduleTitle}</a></div>
    ${renderAnswer(v)}
    ${v.tip ? `<div class="tip">💡 <strong>Interview tip:</strong> ${v.tip}</div>` : ''}`;

  function apply() {
    const q = state.query.toLowerCase();
    const rows = ALL.map(viewOf).filter(x =>
      (state.difficulty === 'all' || x.difficulty === state.difficulty) &&
      (state.module === 'all' || x.moduleId === state.module) &&
      (!q || (x.q + ' ' + x.a).toLowerCase().includes(q))
    ).sort((a, b) => (DIFF_ORDER[a.difficulty] - DIFF_ORDER[b.difficulty]) || a.moduleNum.localeCompare(b.moduleNum));

    if (!rows.length) {
      resultsEl.innerHTML = ALL.length
        ? `<div class="study-empty">No questions match your filters.</div>`
        : `<div class="study-empty">No questions yet — interview content is aggregated here as it is added to the bank.</div>`;
      return;
    }

    resultsEl.innerHTML = `
      <div class="study-count">${rows.length} question${rows.length > 1 ? 's' : ''}</div>
      <div class="iq-list">
        ${rows.map(x => `
          <div class="iq-item${x.edited ? ' iqe-edited' : ''}" data-mid="${x.moduleId}" data-idx="${x.idx}">
            <div class="iq-question">
              <span class="q-num">${x.moduleNum}</span>
              <span class="q-text" style="flex:1">${x.q}</span>
              <span class="diff-badge diff-${x.difficulty}">${x.difficulty}</span>
              <span class="iqe-tools">
                <span class="iqe-badge"${x.edited ? '' : ' hidden'} title="You have edited this question">edited</span>
                <button type="button" class="iqe-edit" aria-label="Edit this question">✎</button>
              </span>
              <span class="q-chevron">▼</span>
            </div>
            <div class="iq-answer">${answerInner(x)}</div>
          </div>`).join('')}
      </div>`;

    resultsEl.querySelectorAll('.iq-question').forEach(qEl => {
      qEl.addEventListener('click', e => {
        if (e.target.closest('a') || e.target.closest('.iqe-tools')) return;
        qEl.closest('.iq-item').classList.toggle('open');
      });
    });

    resultsEl.querySelectorAll('.iqe-edit').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        enterEdit(btn.closest('.iq-item'));
      });
    });
  }

  // Refresh a single row's read-only content in place after Save/Reset — rebuild
  // its answer, question text, "edited" badge and class — WITHOUT re-rendering the
  // whole list (which would collapse the open row and jump the scroll).
  function refreshRow(item, orig) {
    item.classList.remove('iqe-editing');
    const v = viewOf(orig);
    const ae = item.querySelector('.iq-answer');
    if (ae) ae.innerHTML = answerInner(v);
    const qt = item.querySelector('.iq-question .q-text');
    if (qt) qt.innerHTML = v.q;
    const badge = item.querySelector('.iqe-badge');
    if (badge) badge.hidden = !v.edited;
    item.classList.toggle('iqe-edited', !!v.edited);
  }

  // In-place editor for a Study Hub row. Writes the same override key the module
  // tab uses, so the edit propagates to both surfaces (and across devices).
  function enterEdit(item) {
    if (!item) return;
    const mid = item.dataset.mid;
    const idx = Number(item.dataset.idx);
    const orig = ALL.find(x => x.moduleId === mid && x.idx === idx);
    if (!orig) return;
    const ov = loadOverride(mid, idx);
    const curQ = (ov && typeof ov.q === 'string') ? ov.q : orig.q;
    // The rich-text editor works in HTML. A Markdown answer is rendered to HTML
    // first so the author edits the formatted form (never raw **asterisks**);
    // saving it then stores HTML and drops the `md` flag (see applyOverrideTo).
    const baseA = renderAnswer(orig);
    const curA = (ov && typeof ov.a === 'string') ? ov.a : baseA;
    const ae = item.querySelector('.iq-answer');
    if (!ae) return;
    item.classList.add('open', 'iqe-editing');

    ae.innerHTML = `
      <div class="iqe-editor">
        <label class="iqe-label">Question</label>
        <div class="iqe-field iqe-q" contenteditable="true" role="textbox" aria-label="Edit question">${curQ}</div>
        <label class="iqe-label">
          Answer
          <span class="iqe-md-toggle" title="Tick if you pasted Markdown (**bold**, lists, tables, \`code\`)">
            <input type="checkbox" class="iqe-md"> Markdown
          </span>
        </label>
        <div class="iqe-field iqe-a" contenteditable="true" role="textbox" aria-label="Edit answer">${curA}</div>
        <div class="iqe-md-note" hidden>Editing as Markdown — <code>**bold**</code>, <code>- lists</code>, <code>| tables |</code>, <code>\`code\`</code>. It renders on Save.</div>
        <div class="iqe-actions">
          <button type="button" class="iqe-btn iqe-save">Save</button>
          <button type="button" class="iqe-btn iqe-cancel">Cancel</button>
          <button type="button" class="iqe-btn iqe-reset"${ov ? '' : ' hidden'}>Reset to original</button>
        </div>
        <div class="iqe-hint">${syncHint()}</div>
      </div>`;
    const qField = ae.querySelector('.iqe-q');
    const aField = ae.querySelector('.iqe-a');
    const mdToggle = ae.querySelector('.iqe-md');
    const mdNote = ae.querySelector('.iqe-md-note');
    wireSyncCta(ae);
    qField?.focus();

    // Markdown mode: collapse the rich field to editable plain text so the
    // author types/pastes raw Markdown, which is rendered to HTML on Save.
    mdToggle?.addEventListener('change', () => {
      if (mdToggle.checked) {
        aField.textContent = aField.innerText;   // strip formatting → raw text
        aField.classList.add('iqe-a-md');
      } else {
        aField.classList.remove('iqe-a-md');
      }
      if (mdNote) mdNote.hidden = !mdToggle.checked;
    });

    ae.querySelector('.iqe-save').addEventListener('click', () => {
      const q = (qField.innerHTML || '').trim();
      // In Markdown mode the field holds raw Markdown source; render it to the
      // HTML that gets stored (so the override is HTML, same as any other edit).
      const a = (mdToggle?.checked
        ? renderMarkdown(aField.innerText || '')
        : (aField.innerHTML || '')).trim();
      const next = {};
      if (q && q !== orig.q.trim()) next.q = q;
      if (a && a !== baseA.trim()) next.a = a;
      saveOverride(mid, idx, next);
      try { cloud.onLocalChange(); } catch (e) {}
      refreshRow(item, orig);
    });
    ae.querySelector('.iqe-cancel').addEventListener('click', () => {
      item.classList.remove('iqe-editing');
      ae.innerHTML = answerInner(viewOf(orig));
    });
    ae.querySelector('.iqe-reset').addEventListener('click', () => {
      saveOverride(mid, idx, null);
      try { cloud.onLocalChange(); } catch (e) {}
      refreshRow(item, orig);
    });
    ae.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); ae.querySelector('.iqe-save').click(); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); ae.querySelector('.iqe-cancel').click(); }
    });
  }

  searchEl.addEventListener('input', () => { state.query = searchEl.value; apply(); });
  container.querySelector('.study-chips').addEventListener('click', e => {
    const chip = e.target.closest('.study-chip');
    if (!chip) return;
    state.difficulty = chip.dataset.val;
    container.querySelectorAll('.study-chip').forEach(c => c.classList.toggle('active', c === chip));
    apply();
  });
  container.querySelector('.study-select').addEventListener('change', e => { state.module = e.target.value; apply(); });

  // Re-render when an edit lands from another device or tab via cloud sync, but
  // not while the user is mid-edit here (don't clobber their open editor).
  const onRefresh = () => {
    if (!resultsEl.querySelector('.iqe-editing')) apply();
  };
  window.addEventListener('databricks:cloud-refresh', onRefresh);

  apply();
  return () => { window.removeEventListener('databricks:cloud-refresh', onRefresh); };
}
