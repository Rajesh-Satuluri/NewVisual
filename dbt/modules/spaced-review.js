// Spaced Review (Iter 6)
// A spaced-repetition trainer over the interview bank. Each card you grade is
// scheduled with a compact SM-2 algorithm (the SuperMemo-2 scheme Anki is based
// on): easy cards drift far into the future, cards you miss come back tomorrow.
// All state is local (localStorage 'dbt-srs'); nothing is sent anywhere.
import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { BANK, TIERS } from '../data/interview-bank.js';

const KEY = 'dbt-srs';
const DAY = 86400000;
const todayStamp = () => Math.floor(Date.now() / DAY); // integer day index

// ── Persistence ──────────────────────────────────────────────────────────────
function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
  catch (e) { return {}; }
}
function save(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
}

// Stable id for a bank question (index is stable within a build; guard with a
// short hash of the question text so reordering can't silently remap history).
function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
const cardId = q => hash(q.q);

// ── SM-2 (compact) ───────────────────────────────────────────────────────────
// grade: 0 Again · 3 Hard · 4 Good · 5 Easy  (quality in SM-2 terms)
function schedule(card, grade) {
  let { ef = 2.5, reps = 0, interval = 0 } = card || {};
  if (grade < 3) {
    reps = 0;
    interval = 1;                       // lapse → see again tomorrow
  } else {
    reps += 1;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = 6;
    else interval = Math.round(interval * ef);
    // EF update, clamped to SM-2's floor of 1.3
    ef = ef + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
    if (ef < 1.3) ef = 1.3;
  }
  return { ef: +ef.toFixed(2), reps, interval, due: todayStamp() + interval, last: todayStamp() };
}

const GRADES = [
  { g: 0, label: 'Again', sub: 'blanked', cls: 'again' },
  { g: 3, label: 'Hard',  sub: 'got it, barely', cls: 'hard' },
  { g: 4, label: 'Good',  sub: 'recalled it', cls: 'good' },
  { g: 5, label: 'Easy',  sub: 'instant', cls: 'easy' },
];

function tierLabel(id) {
  const t = TIERS.find(t => t.id === id);
  return t ? t.label : id;
}

// Build today's queue: all due cards (due <= today) + new cards up to a cap.
function buildQueue(state, newCap = 15) {
  const today = todayStamp();
  const due = [];
  const fresh = [];
  for (const q of BANK) {
    const id = cardId(q);
    const c = state[id];
    if (!c) fresh.push(q);
    else if (c.due <= today) due.push(q);
  }
  // Due first (oldest due first), then a capped slice of new cards.
  due.sort((a, b) => (state[cardId(a)].due) - (state[cardId(b)].due));
  return due.concat(fresh.slice(0, newCap));
}

function stats(state) {
  const today = todayStamp();
  let seen = 0, dueNow = 0, mature = 0;
  for (const q of BANK) {
    const c = state[cardId(q)];
    if (!c) continue;
    seen++;
    if (c.due <= today) dueNow++;
    if (c.interval >= 21) mature++;
  }
  return { seen, dueNow, mature, total: BANK.length, fresh: BANK.length - seen };
}

const IQ = [
  { q: 'What problem does spaced repetition actually solve for interview prep?',
    a: 'Massed cramming decays fast — the forgetting curve is steep. Spaced repetition schedules each fact for review just as you are about to forget it, which flattens the curve for a fraction of the total study time. For a 293-question bank you cannot re-read everything daily; SM-2 surfaces only what is <em>due</em>, so effort tracks weakness.',
    tip: 'Grade honestly. Marking a card "Easy" when you fumbled just buries it for weeks.' },
  { q: 'Why does a missed card come back tomorrow instead of in a few days?',
    a: 'A lapse (grade < 3) resets the repetition count and the interval to 1 day in SM-2. The idea: a fact you just failed is not yet encoded, so the next exposure must be soon. The ease factor also drops, so even after you relearn it, its future intervals grow more slowly than an easy card\'s.',
    tip: 'This is exactly how Anki behaves — the scheduler here is the same SM-2 family.' },
  { q: 'Is this the same as the Interview Simulator?',
    a: 'No — complementary. The Simulator runs an escalating mock interview in one sitting (breadth, pressure, self-assessment). Spaced Review is the long game: it drills retention of individual answers over days and weeks so the facts are there when the Simulator — or a real interviewer — asks.',
    tip: 'Use Spaced Review daily in short bursts; use the Simulator before an actual interview.' },
];

export function mount(container) {
  let state = load();

  container.innerHTML = createModuleShell({
    tag: 'Practice · Retention',
    title: 'Spaced Review',
    subtitle: `Spaced-repetition drilling over all <strong>${BANK.length}</strong> interview questions. Grade each card and an SM-2 scheduler decides when you see it next. Progress is saved locally in your browser only.`,
    tabs: [
      { id: 'review', label: '🔁 Review' },
      { id: 'progress', label: '📊 Progress' },
      { id: 'iq', label: '💬 About SRS' },
    ],
  });

  const reviewTab = container.querySelector('#tab-review');
  const progressTab = container.querySelector('#tab-progress');
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);

  let queue = buildQueue(state);
  let pos = 0;

  function renderProgress() {
    const s = stats(state);
    const pct = Math.round((s.seen / s.total) * 100);
    progressTab.innerHTML = `
      <div class="srs-stats">
        <div class="srs-stat"><div class="srs-statn">${s.dueNow}</div><div class="srs-statl">due now</div></div>
        <div class="srs-stat"><div class="srs-statn">${s.seen}</div><div class="srs-statl">studied</div></div>
        <div class="srs-stat"><div class="srs-statn">${s.mature}</div><div class="srs-statl">mature (≥21d)</div></div>
        <div class="srs-stat"><div class="srs-statn">${s.fresh}</div><div class="srs-statl">never seen</div></div>
      </div>
      <div class="srs-bar"><div class="srs-barfill" style="width:${pct}%"></div></div>
      <p class="srs-barcap">${s.seen} / ${s.total} questions entered into the schedule (${pct}%).</p>
      <div class="srs-reset">
        <button class="srs-resetbtn" id="srs-reset" type="button">Reset all review history</button>
        <span class="srs-resetnote">Clears local SM-2 state only. The question bank is untouched.</span>
      </div>`;
    const rb = progressTab.querySelector('#srs-reset');
    if (rb) rb.addEventListener('click', () => {
      if (!confirm('Reset all spaced-review history? This cannot be undone.')) return;
      state = {}; save(state);
      queue = buildQueue(state); pos = 0;
      renderCard(); renderProgress();
    });
  }

  function renderDone() {
    const s = stats(state);
    reviewTab.innerHTML = `
      <div class="srs-done">
        <div class="srs-doneico">✅</div>
        <h3>Queue clear for today</h3>
        <p>No cards are due right now. ${s.fresh > 0
          ? `You have <strong>${s.fresh}</strong> questions not yet in rotation — they'll be offered in future sessions (capped per day so it stays manageable).`
          : `Every question is scheduled. Come back when cards fall due.`}</p>
        <button class="srs-more" id="srs-more" type="button">${s.fresh > 0 ? 'Add 15 new cards now' : 'Refresh'}</button>
      </div>`;
    const mb = reviewTab.querySelector('#srs-more');
    if (mb) mb.addEventListener('click', () => {
      queue = buildQueue(state); pos = 0;
      if (queue.length) renderCard(); else renderDone();
    });
  }

  function renderCard() {
    if (pos >= queue.length) { renderDone(); renderProgress(); return; }
    const q = queue[pos];
    const id = cardId(q);
    const c = state[id];
    const statusChip = c
      ? `<span class="srs-chip seen">review · ${c.interval}d interval</span>`
      : `<span class="srs-chip new">new card</span>`;
    const remaining = queue.length - pos;

    reviewTab.innerHTML = `
      <div class="srs-head">
        <span class="srs-tier" data-tier="${q.tier}">${tierLabel(q.tier)}</span>
        <span class="srs-cat">${q.cat}</span>
        ${statusChip}
        <span class="srs-remain">${remaining} left in queue</span>
      </div>
      <div class="srs-card">
        <div class="srs-q">${q.q}</div>
        <div class="srs-answer" id="srs-answer" hidden>
          <div class="srs-short"><strong>Short:</strong> ${q.short || ''}</div>
          ${q.detailed ? `<div class="srs-detailed">${q.detailed}</div>` : ''}
          ${q.mistake ? `<div class="srs-mistake">⚠️ <strong>Common mistake:</strong> ${q.mistake}</div>` : ''}
          ${q.senior ? `<div class="srs-senior">🎯 <strong>Senior signal:</strong> ${q.senior}</div>` : ''}
        </div>
      </div>
      <div class="srs-actions" id="srs-actions">
        <button class="srs-reveal" id="srs-reveal" type="button">Show answer</button>
      </div>`;

    reviewTab.querySelector('#srs-reveal').addEventListener('click', () => {
      reviewTab.querySelector('#srs-answer').hidden = false;
      reviewTab.querySelector('#srs-actions').innerHTML =
        `<div class="srs-grades">` +
        GRADES.map(g => {
          const next = schedule(c, g.g);
          return `<button class="srs-grade ${g.cls}" data-g="${g.g}" type="button">
            <span class="srs-gl">${g.label}</span>
            <span class="srs-gs">${g.sub}</span>
            <span class="srs-gn">+${next.interval}d</span></button>`;
        }).join('') + `</div>`;
      reviewTab.querySelectorAll('.srs-grade').forEach(btn => {
        btn.addEventListener('click', () => {
          const g = Number(btn.dataset.g);
          state[id] = schedule(c, g);
          save(state);
          pos++;
          renderCard();
          renderProgress();
        });
      });
    });
  }

  if (queue.length) renderCard(); else renderDone();
  renderProgress();
}
