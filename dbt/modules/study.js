// Study Hub — two review surfaces in one place:
//   1. Interview Q&A — every module's interview question, aggregated from the
//      modules' exported `IQ` arrays (via iq-aggregate.js), searchable and
//      filterable, with inline editing that writes back to the same override the
//      module's own Q&A tab reads (iq-overrides.js).
//   2. Review Deck — every check-yourself quiz question across all modules.
// Mirrors the kafka Study Hub: the questions are rendered from the module
// "backend", never duplicated here, so the hub can never drift from the content.
import { createModuleShell } from '../components/module-shell.js';
import { MODULES, EXTRAS } from '../components/nav.js';
import { QUIZ_BANK } from '../data/quiz-bank.js';
import { loadAllIQ } from '../data/iq-aggregate.js';
import { loadOverride, saveOverride, applyOverrideTo } from '../components/iq-overrides.js';
import { cloud } from '../components/cloudsync.js';

export function mount(container) {
  const done = new Set(JSON.parse(localStorage.getItem('dbt-done') || '[]'));
  const realDone = [...done].filter(id => MODULES.some(m => m.id === id)).length;

  // Pages whose interview Q&A the hub aggregates (for the module filter).
  const IQ_SOURCES = [...MODULES, ...EXTRAS.filter(e => e.id === 'concepts' || e.id === 'comparison')];

  // Flatten all quiz questions, tagged with their module (Review Deck tab).
  const ALLQ = [];
  MODULES.forEach(m => {
    (QUIZ_BANK[m.id] || []).forEach(q => ALLQ.push({ ...q, mid: m.id, mtitle: m.title, micon: m.icon }));
  });

  container.innerHTML = createModuleShell({
    tag: 'Review · Study Hub',
    title: 'Study Hub',
    subtitle: 'Every interview question and check-yourself quiz across all modules, in one place. Search, filter by module, reveal answers, and edit any question to make it your own — edits show up in the module too.',
    tabs: [
      { id: 'iq', label: '💬 Interview Q&A' },
      { id: 's', label: '📚 Review Deck' },
    ],
  });

  const teardown = mountIQ(container.querySelector('#tab-iq'), IQ_SOURCES);
  mountReviewDeck(container.querySelector('#tab-s'), ALLQ, realDone);
  return teardown;
}

// Sync hint shown under the editor: when cross-device sync is linked, edits
// follow everywhere; otherwise offer a one-click CTA to turn it on.
function syncHint(moduleLabel) {
  let on = false;
  try { on = !!(cloud && cloud.enabled && cloud.enabled()); } catch (e) {}
  if (on) {
    return `Saved everywhere — the Study Hub, ${moduleLabel}'s own Q&amp;A tab, and all your devices (cross-device sync is on).`;
  }
  return `Saved on this device, and it shows in both the Study Hub and ${moduleLabel}'s Q&amp;A tab. ` +
    'To see your edits on your phone and other devices too, ' +
    '<button type="button" class="iqe-synccta">turn on cross-device sync</button>.';
}
function wireSyncCta(root) {
  const cta = root && root.querySelector && root.querySelector('.iqe-synccta');
  if (!cta) return;
  cta.addEventListener('click', e => {
    e.preventDefault(); e.stopPropagation();
    const btn = document.getElementById('cloud-sync-btn');
    if (btn) btn.click();
  });
}

// ─── Tab 1: aggregated Interview Q&A ────────────────────────────────────────
function mountIQ(tab, sources) {
  const state = { module: 'all', query: '' };
  let ALL = [];
  let allRevealed = false;

  const modOpts = ['<option value="all">All modules</option>']
    .concat(sources.map(m => `<option value="${m.id}">${m.icon} ${m.num ? m.num + ' · ' : ''}${m.title}</option>`))
    .join('');

  tab.innerHTML = `
    <div class="study-stats">
      <div class="stat-box"><span class="stat-val" id="st-iq">…</span><span class="stat-label">Interview Q&amp;As</span></div>
      <div class="stat-box"><span class="stat-val">${sources.length}</span><span class="stat-label">Modules covered</span></div>
      <div class="stat-box"><span class="stat-val" id="st-edited">0</span><span class="stat-label">Edited by you</span></div>
    </div>
    <div class="study-controls">
      <input class="study-search" type="text" placeholder="Search interview questions…" aria-label="Search questions" />
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
  const stEdited = tab.querySelector('#st-edited');

  const viewOf = x => applyOverrideTo(x, x.moduleId, x.idx);

  function answerInner(v) {
    return `
      <div class="iq-answer-body">${v.a}</div>
      ${v.tip ? `<div class="iq-tip">💡 ${v.tip}</div>` : ''}
      <div class="study-src" style="margin-top:10px">↳ <a data-goto="${v.moduleId}">Go to ${v.icon} ${v.moduleTitle}</a></div>`;
  }

  function render() {
    const q = state.query.trim().toLowerCase();
    const rows = ALL.map(viewOf).filter(x =>
      (state.module === 'all' || x.moduleId === state.module) &&
      (!q || (x.q + ' ' + x.a).toLowerCase().includes(q))
    );
    stEdited.textContent = ALL.filter(x => loadOverride(x.moduleId, x.idx)).length;
    count.textContent = `${rows.length} question${rows.length === 1 ? '' : 's'}`;
    empty.hidden = rows.length > 0;

    list.innerHTML = rows.map(x => `
      <div class="iq-item ${allRevealed ? 'open' : ''}${x.edited ? ' iqe-edited' : ''}" data-mid="${x.moduleId}" data-idx="${x.idx}">
        <button class="iq-question">
          <span class="iq-num">${x.icon}</span>
          <span style="flex:1">${x.q}</span>
          <span class="iqe-badge"${x.edited ? '' : ' hidden'} title="You edited this question">edited</span>
          <button type="button" class="iqe-edit" title="Edit this question" aria-label="Edit this question">✎</button>
          <span class="iq-chevron" aria-hidden="true">▾</span>
        </button>
        <div class="iq-answer" style="${allRevealed ? 'max-height:1200px' : ''}">${answerInner(x)}</div>
      </div>`).join('');

    list.querySelectorAll('.iq-item').forEach(item => {
      const btn = item.querySelector('.iq-question');
      const ans = item.querySelector('.iq-answer');
      btn.addEventListener('click', e => {
        if (e.target.closest('.iqe-edit') || e.target.closest('[data-goto]')) return;
        const open = item.classList.toggle('open');
        ans.style.maxHeight = open ? ans.scrollHeight + 'px' : '0';
      });
    });
    list.querySelectorAll('.iqe-edit').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); enterEdit(btn.closest('.iq-item')); });
    });
  }

  function enterEdit(item) {
    if (!item) return;
    const mid = item.dataset.mid;
    const idx = Number(item.dataset.idx);
    const orig = ALL.find(x => x.moduleId === mid && x.idx === idx);
    if (!orig) return;
    const ov = loadOverride(mid, idx);
    const curQ = (ov && typeof ov.q === 'string') ? ov.q : orig.q;
    const curA = (ov && typeof ov.a === 'string') ? ov.a : orig.a;
    const ae = item.querySelector('.iq-answer');
    if (!ae) return;
    item.classList.add('open', 'iqe-editing');
    ae.style.maxHeight = '2000px';

    ae.innerHTML = `
      <div class="iqe-editor">
        <label class="iqe-label">Question</label>
        <div class="iqe-field iqe-q" contenteditable="true" role="textbox" aria-label="Edit question">${curQ}</div>
        <label class="iqe-label">Answer (HTML allowed)</label>
        <div class="iqe-field iqe-a" contenteditable="true" role="textbox" aria-label="Edit answer">${curA}</div>
        <div class="iqe-actions">
          <button type="button" class="iqe-btn iqe-save">Save</button>
          <button type="button" class="iqe-btn iqe-cancel">Cancel</button>
          <button type="button" class="iqe-btn iqe-reset"${ov ? '' : ' hidden'}>Reset to original</button>
        </div>
        <div class="iqe-hint">${syncHint(`${orig.icon} ${orig.moduleTitle}`)}</div>
      </div>`;
    const qField = ae.querySelector('.iqe-q');
    const aField = ae.querySelector('.iqe-a');
    wireSyncCta(ae);
    qField?.focus();

    ae.querySelector('.iqe-save').addEventListener('click', () => {
      const q = (qField.innerHTML || '').trim();
      const a = (aField.innerHTML || '').trim();
      const next = {};
      if (q && q !== orig.q.trim()) next.q = q;
      if (a && a !== orig.a.trim()) next.a = a;
      saveOverride(mid, idx, next);
      render();
    });
    ae.querySelector('.iqe-cancel').addEventListener('click', () => {
      item.classList.remove('iqe-editing');
      ae.innerHTML = answerInner(viewOf(orig));
      ae.style.maxHeight = ae.scrollHeight + 'px';
    });
    ae.querySelector('.iqe-reset').addEventListener('click', () => {
      saveOverride(mid, idx, null);
      render();
    });
    ae.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); ae.querySelector('.iqe-save').click(); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); ae.querySelector('.iqe-cancel').click(); }
    });
  }

  search.addEventListener('input', () => { state.query = search.value; render(); });
  select.addEventListener('change', () => { state.module = select.value; render(); });
  tab.querySelector('[data-reveal]').addEventListener('click', e => {
    allRevealed = !allRevealed;
    e.target.classList.toggle('active', allRevealed);
    e.target.textContent = allRevealed ? 'Hide all' : 'Reveal all';
    render();
  });
  list.addEventListener('click', e => {
    const link = e.target.closest('[data-goto]');
    if (link) window.location.hash = link.dataset.goto;
  });

  list.innerHTML = `<div class="study-empty">Loading interview questions…</div>`;
  loadAllIQ().then(rows => {
    ALL = rows;
    const el = tab.querySelector('#st-iq');
    if (el) el.textContent = ALL.length;
    render();
  });

  // Re-render when an edit lands from another device (cloud pull), but not while
  // the user is mid-edit here (don't clobber their open editor).
  let alive = true;
  const onRefresh = () => {
    if (alive && ALL.length && !list.querySelector('.iqe-editing') && !tab.querySelector('.iqe-editing')) render();
  };
  window.addEventListener('dbt:cloud-refresh', onRefresh);
  return () => { alive = false; window.removeEventListener('dbt:cloud-refresh', onRefresh); };
}

// ─── Tab 2: quiz Review Deck (unchanged behaviour) ──────────────────────────
function mountReviewDeck(tab, ALL, realDone) {
  const modOpts = ['<option value="all">All modules</option>']
    .concat(MODULES.filter(m => QUIZ_BANK[m.id]).map(m => `<option value="${m.id}">${m.icon} ${m.title}</option>`))
    .join('');

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
    list.innerHTML = items.map(it => `
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
  tab.querySelector('[data-reveal]').addEventListener('click', e => {
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
