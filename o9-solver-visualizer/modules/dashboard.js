// dashboard.js — Readiness Dashboard (Review section).
// Aggregates REAL learner progress: module mastery (localStorage 'o9scs-done'),
// per-group coverage, active-practice tallies (progress-store), and spaced-
// repetition status (data/review.js over the shared SRS store 'o9scs-srs-v1').
// Nothing here is invented — every number is derived from stored progress.
import { MODULES } from '../components/nav.js';
import { all, counts } from '../data/progress-store.js';
import { buildDeck, partitionDeck, nextDueLabel } from '../data/review.js';

const SRS_KEY = 'o9scs-srs-v1';
const DONE_KEY = 'o9scs-done';

function readSrs() {
  try {
    const raw = JSON.parse(localStorage.getItem(SRS_KEY) || '{}');
    return raw && typeof raw === 'object' ? raw : {};
  } catch (e) { return {}; }
}
function readDone() {
  try {
    const raw = JSON.parse(localStorage.getItem(DONE_KEY) || '[]');
    return new Set(Array.isArray(raw) ? raw : []);
  } catch (e) { return new Set(); }
}

// Group order = first-seen order in MODULES.
function groupOrder() {
  const seen = [];
  MODULES.forEach(m => { if (!seen.includes(m.group)) seen.push(m.group); });
  return seen;
}

function pct(n, d) { return d ? Math.round((n / d) * 100) : 0; }

function bar(frac, color) {
  const w = Math.max(0, Math.min(100, frac));
  return `<div class="dash-bar"><div class="dash-bar-fill" style="width:${w}%;background:${color}"></div></div>`;
}

function compute() {
  const done = readDone();
  const ids = new Set(MODULES.map(m => m.id));
  const masteredIds = [...done].filter(id => ids.has(id));
  const mastered = masteredIds.length;
  const total = MODULES.length;

  const order = groupOrder();
  const groups = order.map(g => {
    const mods = MODULES.filter(m => m.group === g);
    const got = mods.filter(m => done.has(m.id)).length;
    return { g, got, total: mods.length };
  });

  const decisions = counts('decisions');
  const rca = counts('rca-clinic');
  const mockAll = all('mock');
  const mockRated = Object.values(mockAll).filter(v => v && v.rated);
  const mockGot = mockRated.filter(v => v.rated === 'got').length;

  const deck = buildDeck();
  const srs = readSrs();
  const { due, fresh, later, learned } = partitionDeck(deck, srs);
  const nextDue = nextDueLabel(deck, srs);

  return {
    mastered, total, masteredIds, groups,
    decisions, rca,
    mock: { attempted: mockRated.length, got: mockGot },
    srs: { due: due.length, fresh: fresh.length, later: later.length, learned, deck: deck.length, nextDue },
  };
}

function render(container) {
  const d = compute();
  const order = d.groups;

  const kpi = (label, value, sub) => `
    <div class="info-card dash-kpi">
      <div class="dash-kpi-value">${value}</div>
      <div class="info-card-title">${label}</div>
      ${sub ? `<div class="info-card-body">${sub}</div>` : ''}
    </div>`;

  const root = container.querySelector('#dash-body');
  if (!root) return;
  root.innerHTML = `
    <div class="section-header">
      <div class="section-title">Mastery</div>
      <div class="section-desc">A module counts as mastered once its quiz is passed. ${d.mastered} of ${d.total} complete (${pct(d.mastered, d.total)}%).</div>
    </div>
    <div class="dash-overall">
      ${bar(pct(d.mastered, d.total), 'var(--accent, #6366F1)')}
      <div class="dash-overall-label">${d.mastered} / ${d.total} modules</div>
    </div>

    <div class="info-grid" style="margin-top:6px">
      ${kpi('Modules mastered', `${d.mastered}<span class="dash-kpi-of">/${d.total}</span>`, `${pct(d.mastered, d.total)}% of the curriculum`)}
      ${kpi('Cards due for review', d.srs.due, d.srs.nextDue ? `next due in ${d.srs.nextDue}` : (d.srs.deck ? 'all caught up' : 'deck not started'))}
      ${kpi('Cards learned', d.srs.learned, `of ${d.srs.deck} in the deck`)}
      ${kpi('Decision drills', `${d.decisions.correct}<span class="dash-kpi-of">/${d.decisions.attempted}</span>`, 'correct / attempted')}
      ${kpi('RCA clinic', `${d.rca.correct}<span class="dash-kpi-of">/${d.rca.attempted}</span>`, 'correct / attempted')}
      ${kpi('Mock interview', `${d.mock.got}<span class="dash-kpi-of">/${d.mock.attempted}</span>`, 'rated “got it” / answered')}
    </div>

    <div class="section-header" style="margin-top:22px">
      <div class="section-title">Coverage by group</div>
      <div class="section-desc">Mastered modules in each of the ${order.length} curriculum groups.</div>
    </div>
    <div class="dash-groups">
      ${order.map(row => `
        <div class="dash-group-row">
          <div class="dash-group-name">${row.g}</div>
          <div class="dash-group-bar">${bar(pct(row.got, row.total), row.got === row.total ? '#10B981' : 'var(--accent, #6366F1)')}</div>
          <div class="dash-group-count">${row.got}/${row.total}</div>
        </div>`).join('')}
    </div>

    <div class="section-header" style="margin-top:22px">
      <div class="section-title">Spaced repetition</div>
      <div class="section-desc">Flashcards derived from the quiz bank and glossary. Drill them in the <a class="nav-item" style="display:inline" href="#review">Review Center</a>.</div>
    </div>
    <div class="info-grid">
      <div class="info-card" style="border-left:3px solid #F59E0B"><div class="info-card-title">Due now</div><div class="info-card-body"><strong>${d.srs.due}</strong> card(s) ready to review${d.srs.nextDue ? ` · next in ${d.srs.nextDue}` : ''}.</div></div>
      <div class="info-card" style="border-left:3px solid #38BDF8"><div class="info-card-title">New</div><div class="info-card-body"><strong>${d.srs.fresh}</strong> card(s) not yet seen.</div></div>
      <div class="info-card" style="border-left:3px solid #10B981"><div class="info-card-title">Scheduled later</div><div class="info-card-body"><strong>${d.srs.later}</strong> card(s) already learned and scheduled ahead.</div></div>
    </div>

    <div class="dash-actions">
      <a class="ctrl-btn" href="#review">🔁 Review due cards</a>
      <a class="ctrl-btn" href="#study">📚 What to study next</a>
      <a class="ctrl-btn" href="#master-map">🗺️ Master Map</a>
    </div>`;
}

export function mount(container) {
  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">Review</div>
        <h1 class="module-title">Dashboard</h1>
        <p class="module-subtitle">Your readiness at a glance — module mastery, group coverage, practice tallies and spaced-repetition status, all from your own progress.</p>
      </div>
      <div class="scroll-content" id="dash-body"></div>
    </div>`;

  render(container);

  const onChange = () => render(container);
  window.addEventListener('o9scs:progress', onChange);
  window.addEventListener('o9scs:quiz-graded', onChange);

  return () => {
    window.removeEventListener('o9scs:progress', onChange);
    window.removeEventListener('o9scs:quiz-graded', onChange);
  };
}
