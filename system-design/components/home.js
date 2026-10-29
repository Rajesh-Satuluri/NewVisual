// ── Home explorer ────────────────────────────────────────────────────────────
// A segmented home with two views:
//   🧭 Concepts  — the 28-topic learning path (grouped cards; "soon" roadmap)
//   ❓ Questions — faceted explorer over the 91-question catalog + flashcards
//
// mount(container, { done }) → cleanup()

import {
  QUESTIONS, CATEGORY_ORDER, CATEGORY_LABEL, DIFFICULTY_ORDER, allTags,
} from '../content/index.js';
import { CONCEPTS, CONCEPT_GROUPS, CONCEPT_PREFIX } from '../content/concepts.js';
import { mount as mountFlashcards } from './flashcards.js';

const DIFF_CLASS = {
  Fundamental: 'diff-fundamental', Intermediate: 'diff-intermediate', Advanced: 'diff-advanced',
};
const VIEW_KEY = 'system-design-home-view';

// Difficulty + rough reading time per concept group, so a learner can gauge a
// concept before opening it.
const GROUP_LEVEL = {
  'Foundations': 'Beginner',
  'Core building blocks': 'Intermediate',
  'Classic designs': 'Intermediate',
  'Scale & media': 'Advanced',
  'Data & infra systems': 'Advanced',
  'Money & real-time': 'Advanced',
};
const GROUP_MINS = {
  'Foundations': 8, 'Core building blocks': 12, 'Classic designs': 14,
  'Scale & media': 16, 'Data & infra systems': 16, 'Money & real-time': 18,
};
const LEVEL_CLASS = { Beginner: 'lvl-beg', Intermediate: 'lvl-int', Advanced: 'lvl-adv' };
function conceptBadges(c) {
  const lv = GROUP_LEVEL[c.group] || 'Intermediate';
  return `<span class="sd-card-badges"><span class="sd-lvl ${LEVEL_CLASS[lv]}">${lv}</span><span class="sd-mins">~${GROUP_MINS[c.group] || 14} min</span></span>`;
}

// The shortest path from "what is system design" to interview-ready.
const START_PATH = ['interview-framework', 'back-of-envelope-estimation', 'scaling-zero-to-millions', 'rate-limiter', 'url-shortener', 'news-feed-system'];

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// filter state persists for the session
const state = { q: '', difficulty: null, tags: new Set(), category: 'all' };

export function mount(container, { done } = { done: new Set() }) {
  let view = localStorage.getItem(VIEW_KEY) || 'concepts';
  if (view !== 'concepts' && view !== 'questions') view = 'concepts';

  const builtCount = CONCEPTS.filter(c => c.built).length;
  const conceptsDone = CONCEPTS.filter(c => c.built && done.has(CONCEPT_PREFIX + c.id)).length;
  const questionsDone = QUESTIONS.filter(q => done.has(q.id)).length;

  container.innerHTML = `
    <div class="module-page sd-home">
      <div class="sd-home-hero">
        <div class="module-tag">Visual Learning Lab</div>
        <h1 class="sd-home-title">System design,<br><span class="sd-home-title-grad">from the inside out.</span></h1>
        <p class="sd-home-sub">
          Learn the concepts first, then drill with real-world questions, model
          answers, flashcards and interactive widgets.
        </p>
        <div class="sd-home-stats">
          <span><b>${builtCount}</b> of ${CONCEPTS.length} concepts</span>
          <span><b>${QUESTIONS.length}</b> questions</span>
          <span><b>${conceptsDone + questionsDone}</b> completed</span>
        </div>
      </div>

      <div class="sd-view-toggle" role="tablist">
        <button class="sd-view-btn${view === 'concepts' ? ' active' : ''}" data-view="concepts" role="tab">🧭 Concepts</button>
        <button class="sd-view-btn${view === 'questions' ? ' active' : ''}" data-view="questions" role="tab">❓ Questions</button>
      </div>

      <div id="sd-home-view"></div>

      <section class="sd-ref-row">
        <div class="sd-section-head sd-section-head-mt">
          <h2 class="sd-section-h">🎯 Practice & reference</h2>
          <p class="sd-section-sub">Drill the trade-off calls, sharpen your answers, and look things up.</p>
        </div>
        <div class="sd-ref-cards">
          <a class="sd-ref-card" href="#p:decisions">
            <span class="sd-ref-card-icon">🧭</span>
            <span class="sd-ref-card-title">Choose the approach</span>
            <span class="sd-ref-card-sum">Make the trade-off call on real scenarios, then see why each option wins or loses.</span>
          </a>
          <a class="sd-ref-card" href="#p:answers">
            <span class="sd-ref-card-icon">🎯</span>
            <span class="sd-ref-card-title">Level up your answer</span>
            <span class="sd-ref-card-sum">The same question answered Weak / Good / Senior — and why the senior version wins.</span>
          </a>
          <a class="sd-ref-card" href="#p:dashboard">
            <span class="sd-ref-card-icon">📊</span>
            <span class="sd-ref-card-title">Dashboard</span>
            <span class="sd-ref-card-sum">Your progress by theme and what to study next.</span>
          </a>
          <a class="sd-ref-card" href="#p:glossary">
            <span class="sd-ref-card-icon">📖</span>
            <span class="sd-ref-card-title">Glossary</span>
            <span class="sd-ref-card-sum">Every key term in one line, linked to its concept.</span>
          </a>
          <a class="sd-ref-card" href="#p:cheatsheet">
            <span class="sd-ref-card-icon">📋</span>
            <span class="sd-ref-card-title">Cheat sheet</span>
            <span class="sd-ref-card-sum">Latency numbers, capacity math, and pattern picks.</span>
          </a>
        </div>
      </section>
    </div>`;

  const viewEl = container.querySelector('#sd-home-view');
  const viewBtns = [...container.querySelectorAll('.sd-view-btn')];
  let fcCleanup = null;

  // ── Concepts view ───────────────────────────────────────────────────────────
  function startHereCard(id, n) {
    const c = CONCEPTS.find(x => x.id === id);
    if (!c || !c.built) return '';
    const isDone = done.has(CONCEPT_PREFIX + c.id);
    return `<a class="sd-step-card${isDone ? ' done' : ''}" href="#${CONCEPT_PREFIX}${c.id}">
      <span class="sd-step-card-num">${n}</span>
      <span class="sd-step-card-body">
        <span class="sd-step-card-title">${c.icon || '🧭'} ${esc(c.title)}</span>
        <span class="sd-step-card-sum">${esc(c.summary || '')}</span>
      </span>
      <span class="sd-step-card-mark">${isDone ? '✓' : '→'}</span>
    </a>`;
  }

  function renderConcepts() {
    const byGroup = {};
    CONCEPTS.forEach(c => { (byGroup[c.group] = byGroup[c.group] || []).push(c); });
    const startCards = START_PATH.map((id, i) => startHereCard(id, i + 1)).filter(Boolean).join('');
    viewEl.innerHTML = `
      ${startCards ? `
      <section class="sd-start-here">
        <div class="sd-section-head">
          <h2 class="sd-section-h">🚀 Start here</h2>
          <p class="sd-section-sub">The shortest path from "what is system design" to interview-ready.</p>
        </div>
        <div class="sd-steps-grid">${startCards}</div>
      </section>` : ''}
      <div class="sd-section-head sd-section-head-mt">
        <h2 class="sd-section-h">📚 Full curriculum</h2>
        <p class="sd-section-sub">All ${CONCEPTS.length} concepts, grouped by theme — each with a clear explanation, interview Q&amp;A, and linked questions.</p>
      </div>
      ${CONCEPT_GROUPS.map(group => {
        const items = byGroup[group] || [];
        if (!items.length) return '';
        return `
          <section class="sd-con-group">
            <h2 class="sd-con-group-title">${esc(group)}</h2>
            <div class="sd-card-grid">
              ${items.map(c => conceptCard(c)).join('')}
            </div>
          </section>`;
      }).join('')}`;
  }

  function conceptCard(c) {
    const isDone = c.built && done.has(CONCEPT_PREFIX + c.id);
    if (!c.built) {
      return `<div class="sd-card sd-card-soon" aria-disabled="true">
        <div class="sd-card-top">
          <span class="sd-card-icon">${c.icon || '📘'}</span>
          <span class="sd-con-chip">Ch ${c.chapter}</span>
          <span class="sd-soon-badge">soon</span>
        </div>
        <h3 class="sd-card-q">${esc(c.title)}</h3>
        <div class="sd-card-sum">${esc(c.summary || '')}</div>
      </div>`;
    }
    return `<a class="sd-card${isDone ? ' done' : ''}" href="#${CONCEPT_PREFIX}${c.id}">
      <div class="sd-card-top">
        <span class="sd-card-icon">${c.icon || '📘'}</span>
        <span class="sd-con-chip">Ch ${c.chapter}</span>
        ${isDone ? '<span class="sd-card-check" title="Completed">✓</span>' : ''}
      </div>
      <h3 class="sd-card-q">${esc(c.title)}</h3>
      <div class="sd-card-sum">${esc(c.summary || '')}</div>
      ${conceptBadges(c)}
    </a>`;
  }

  // ── Questions view ──────────────────────────────────────────────────────────
  let lastList = [];
  function renderQuestions() {
    const tags = allTags();
    const cats = CATEGORY_ORDER.filter(c => QUESTIONS.some(q => q.category === c));
    viewEl.innerHTML = `
      <div class="sd-filters">
        <input type="search" id="sd-search" class="sd-search" placeholder="Search questions…" autocomplete="off" />
        <div class="sd-filter-row">
          <div class="sd-pill-group" id="sd-diff-pills" role="group" aria-label="Difficulty">
            <button class="sd-pill active" data-diff="all">All levels</button>
            ${DIFFICULTY_ORDER.map(d => `<button class="sd-pill" data-diff="${d}">${d}</button>`).join('')}
          </div>
          <select class="sd-select" id="sd-cat">
            <option value="all">All categories</option>
            ${cats.map(c => `<option value="${esc(c)}">${esc(CATEGORY_LABEL[c] || c)}</option>`).join('')}
          </select>
        </div>
        <div class="sd-tag-group" id="sd-tag-chips" role="group" aria-label="Tags">
          ${tags.map(t => `<button class="sd-tag-chip" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}
        </div>
      </div>
      <div class="sd-result-bar">
        <span id="sd-count"></span>
        <div class="sd-result-actions">
          <button class="sd-study" id="sd-study">🃏 Study as flashcards</button>
          <button class="sd-clear" id="sd-clear" hidden>Clear filters</button>
        </div>
      </div>
      <div class="sd-card-grid" id="sd-grid"></div>
      <div class="sd-empty" id="sd-empty" hidden>
        <div class="sd-empty-icon">🔍</div><p>No questions match these filters.</p>
      </div>`;

    const grid = viewEl.querySelector('#sd-grid');
    const empty = viewEl.querySelector('#sd-empty');
    const countEl = viewEl.querySelector('#sd-count');
    const search = viewEl.querySelector('#sd-search');
    const catSel = viewEl.querySelector('#sd-cat');
    const clearBtn = viewEl.querySelector('#sd-clear');
    const diffPills = [...viewEl.querySelectorAll('[data-diff]')];
    const tagChips = [...viewEl.querySelectorAll('[data-tag]')];
    const studyBtn = viewEl.querySelector('#sd-study');

    function matches(qn) {
      if (state.difficulty && qn.difficulty !== state.difficulty) return false;
      if (state.category !== 'all' && qn.category !== state.category) return false;
      if (state.tags.size && ![...state.tags].every(t => (qn.tags || []).includes(t))) return false;
      if (state.q) {
        const hay = (qn.question + ' ' + qn.category + ' ' + (qn.tags || []).join(' ')).toLowerCase();
        if (!hay.includes(state.q)) return false;
      }
      return true;
    }
    function card(qn) {
      const dc = DIFF_CLASS[qn.difficulty] || '';
      const isDone = done.has(qn.id);
      const tagsHtml = (qn.tags || []).slice(0, 3).map(t => `<span class="sd-tag">${esc(t)}</span>`).join('');
      return `
        <a class="sd-card${isDone ? ' done' : ''}" href="#${qn.id}">
          <div class="sd-card-top">
            <span class="sd-card-icon">${qn.icon || '📘'}</span>
            <span class="sd-diff ${dc}">${esc(qn.difficulty || '')}</span>
            ${qn.widget ? '<span class="sd-interactive" title="Has an interactive widget">▶ interactive</span>' : ''}
            ${qn.draft ? '<span class="sd-draft">draft</span>' : ''}
            ${isDone ? '<span class="sd-card-check" title="Completed">✓</span>' : ''}
          </div>
          <h3 class="sd-card-q">${esc(qn.question)}</h3>
          <div class="sd-card-cat">${esc(CATEGORY_LABEL[qn.category] || qn.category || '')}</div>
          <div class="sd-tags">${tagsHtml}</div>
        </a>`;
    }
    function render() {
      const list = QUESTIONS.filter(matches);
      lastList = list;
      grid.innerHTML = list.map(card).join('');
      empty.hidden = list.length > 0;
      grid.hidden = list.length === 0;
      countEl.textContent = `${list.length} of ${QUESTIONS.length} question${QUESTIONS.length === 1 ? '' : 's'}`;
      const active = state.q || state.difficulty || state.tags.size || state.category !== 'all';
      clearBtn.hidden = !active;
      studyBtn.disabled = list.length === 0;
      studyBtn.textContent = `🃏 Study ${list.length} as flashcards`;
    }

    let searchTimer = null;
    search.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { state.q = search.value.trim().toLowerCase(); render(); }, 120);
    });
    diffPills.forEach(p => p.addEventListener('click', () => {
      const d = p.dataset.diff;
      state.difficulty = d === 'all' ? null : d;
      diffPills.forEach(x => x.classList.toggle('active', x.dataset.diff === (state.difficulty || 'all')));
      render();
    }));
    tagChips.forEach(c => c.addEventListener('click', () => {
      const t = c.dataset.tag;
      if (state.tags.has(t)) state.tags.delete(t); else state.tags.add(t);
      c.classList.toggle('active', state.tags.has(t));
      render();
    }));
    catSel.addEventListener('change', () => { state.category = catSel.value; render(); });
    studyBtn.addEventListener('click', () => {
      if (!lastList.length) return;
      fcCleanup = mountFlashcards(container, {
        cards: lastList.slice(),
        onExit: () => { if (fcCleanup) { fcCleanup(); fcCleanup = null; } mount(container, { done }); },
      });
    });
    clearBtn.addEventListener('click', () => {
      state.q = ''; state.difficulty = null; state.tags.clear(); state.category = 'all';
      search.value = ''; catSel.value = 'all';
      diffPills.forEach(x => x.classList.toggle('active', x.dataset.diff === 'all'));
      tagChips.forEach(x => x.classList.remove('active'));
      render();
    });

    // restore session state into controls
    search.value = state.q;
    catSel.value = state.category;
    diffPills.forEach(x => x.classList.toggle('active', x.dataset.diff === (state.difficulty || 'all')));
    tagChips.forEach(x => x.classList.toggle('active', state.tags.has(x.dataset.tag)));
    render();
  }

  function show(v) {
    view = v;
    localStorage.setItem(VIEW_KEY, v);
    viewBtns.forEach(b => b.classList.toggle('active', b.dataset.view === v));
    if (v === 'concepts') renderConcepts(); else renderQuestions();
  }
  viewBtns.forEach(b => b.addEventListener('click', () => show(b.dataset.view)));

  show(view);

  return function cleanup() {
    if (fcCleanup) { fcCleanup(); fcCleanup = null; }
  };
}
