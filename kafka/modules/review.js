// Review Center — spaced-repetition flashcards built from the quiz bank and
// glossary. Shows what's due, runs a grading session (Again/Hard/Good/Easy),
// and persists each card's schedule to the progress store. #review PAGE.
import { buildDeck, schedule, partitionDeck, buildSession, nextDueLabel } from '../data/review.js';
import { all, record } from '../data/progress-store.js';

const GRADES = [
  { g: 'again', label: 'Again', cls: 'rv-again', hint: 'forgot' },
  { g: 'hard', label: 'Hard', cls: 'rv-hard', hint: 'tough' },
  { g: 'good', label: 'Good', cls: 'rv-good', hint: 'recalled' },
  { g: 'easy', label: 'Easy', cls: 'rv-easy', hint: 'trivial' },
];

export function mount(container) {
  const deck = buildDeck();
  let filter = 'all';

  const states = () => all('srs');

  const renderHome = () => {
    const d = deck.filter(c => filter === 'all' || c.kind === filter);
    const { due, fresh, learned } = partitionDeck(d, states());
    const nd = nextDueLabel(d, states());
    container.querySelector('#rv-stage').innerHTML = `
      <div class="rv-stats">
        <div class="rv-stat rv-stat-due"><div class="rv-stat-val">${due.length}</div><div class="rv-stat-label">Due now</div></div>
        <div class="rv-stat"><div class="rv-stat-val">${fresh.length}</div><div class="rv-stat-label">New</div></div>
        <div class="rv-stat"><div class="rv-stat-val">${learned}</div><div class="rv-stat-label">Learning</div></div>
        <div class="rv-stat"><div class="rv-stat-val">${d.length}</div><div class="rv-stat-label">Total cards</div></div>
      </div>
      ${(due.length + fresh.length) === 0
        ? `<div class="rv-empty">🎉 Nothing due right now${nd ? ` — next review in about <strong>${nd}</strong>` : ''}. Spaced repetition works by waiting; come back later.</div>`
        : `<button class="rv-start quiz-btn primary" id="rv-start">Start review — ${Math.min(40, due.length + Math.min(15, fresh.length))} cards</button>`}
      <p class="rv-note">Cards are generated from the quiz bank and glossary. Grading schedules each card further out as you remember it (an SM-2-style algorithm) — the honest way to move facts into long-term memory. Progress is saved in your browser.</p>`;
    const startBtn = container.querySelector('#rv-start');
    if (startBtn) startBtn.addEventListener('click', () => runSession(d));
  };

  const runSession = (d) => {
    let queue = buildSession(d, states());
    if (!queue.length) { renderHome(); return; }
    let idx = 0, reviewed = 0;

    const showCard = () => {
      if (idx >= queue.length) { finish(); return; }
      const card = queue[idx];
      container.querySelector('#rv-stage').innerHTML = `
        <div class="rv-progress"><div class="rv-progress-bar" style="width:${(reviewed / (reviewed + (queue.length - idx)) * 100) || 0}%"></div></div>
        <div class="rv-meta"><span class="rv-kind rv-kind-${card.kind}">${card.kind}</span><span class="rv-tag">${card.tag}</span><span class="rv-remain">${queue.length - idx} left</span></div>
        <div class="rv-card" id="rv-card" tabindex="0" role="button" aria-label="Show answer">
          <div class="rv-front">${card.front}</div>
          <div class="rv-back" hidden><div class="rv-divider"></div>${card.back}
            <a class="rv-open" href="#${card.moduleId}">Open ${card.moduleId} ↗</a></div>
        </div>
        <div class="rv-controls" id="rv-controls">
          <button class="rv-show quiz-btn primary" id="rv-show">Show answer <span class="rv-kbd">space</span></button>
          <div class="rv-grades" hidden id="rv-grades">
            ${GRADES.map(x => `<button class="rv-grade ${x.cls}" data-g="${x.g}"><span>${x.label}</span><small>${x.hint}</small></button>`).join('')}
          </div>
        </div>`;

      const cardEl = container.querySelector('#rv-card');
      const back = cardEl.querySelector('.rv-back');
      const showBtn = container.querySelector('#rv-show');
      const grades = container.querySelector('#rv-grades');
      const reveal = () => { back.hidden = false; showBtn.hidden = true; grades.hidden = false; };
      showBtn.addEventListener('click', reveal);
      cardEl.addEventListener('click', () => { if (back.hidden) reveal(); });

      const grade = g => {
        const prev = states()[card.id] || {};
        const next = schedule(prev, g);
        try { record('srs', card.id, next); } catch (e) {}
        reviewed++;
        if (g === 'again') queue.push(card); // re-show later this session
        idx++;
        showCard();
      };
      grades.querySelectorAll('.rv-grade').forEach(b => b.addEventListener('click', () => grade(b.dataset.g)));

      // Keyboard: space reveals, 1-4 grade
      const onKey = e => {
        if (e.key === ' ' && back.hidden) { e.preventDefault(); reveal(); }
        else if (!back.hidden && ['1','2','3','4'].includes(e.key)) { e.preventDefault(); grade(GRADES[+e.key - 1].g); }
      };
      container._rvKey && document.removeEventListener('keydown', container._rvKey);
      container._rvKey = onKey;
      document.addEventListener('keydown', onKey);
    };

    const finish = () => {
      if (container._rvKey) { document.removeEventListener('keydown', container._rvKey); container._rvKey = null; }
      container.querySelector('#rv-stage').innerHTML = `
        <div class="rv-empty">✅ Session complete — <strong>${reviewed}</strong> card${reviewed === 1 ? '' : 's'} reviewed. Each is scheduled to return right before you'd forget it.</div>
        <button class="rv-start quiz-btn primary" id="rv-again">Back to overview</button>`;
      container.querySelector('#rv-again').addEventListener('click', renderHome);
    };

    showCard();
  };

  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">🔁 · Review · Spaced Repetition</div>
        <h1 class="module-title">Review Center</h1>
        <p class="module-subtitle">Spaced repetition turns cramming into retention. Review what's due today; grade yourself honestly and each card returns right before you'd forget it. Cards come from every quiz and glossary term.</p>
      </div>
      <div class="rv-filter">
        ${['all','quiz','glossary'].map(f => `<button class="srch-chip${f==='all'?' active':''}" data-filter="${f}">${f === 'all' ? 'All cards' : f === 'quiz' ? 'Quiz recall' : 'Glossary'}</button>`).join('')}
      </div>
      <div id="rv-stage"></div>
    </div>`;

  container.querySelectorAll('.rv-filter .srch-chip').forEach(b => b.addEventListener('click', () => {
    container.querySelectorAll('.rv-filter .srch-chip').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    filter = b.dataset.filter;
    renderHome();
  }));

  renderHome();
  return () => { if (container._rvKey) { document.removeEventListener('keydown', container._rvKey); container._rvKey = null; } };
}
