// Dashboard — honest mastery analytics. Reads real signals: modules mastered
// (quiz-passed), per-group progress, quiz/decision/troubleshoot/tiered/SRS
// activity, and self-explanations written. Surfaces weak spots and the next
// recommended module. Live-refreshes on progress changes. #dashboard PAGE.
import { MODULES } from '../components/nav.js';
import { all, counts } from '../data/progress-store.js';

const GROUP_ORDER = ['Foundation', 'Core Internals', 'Consumer Side', 'Delivery', 'Ecosystem', 'Operations', 'Advanced', 'Change Data Capture', 'CDC Integrations & Lakehouse'];

function readDone() {
  try { return new Set(JSON.parse(localStorage.getItem('kafka-done') || '[]')); } catch (e) { return new Set(); }
}
function countLocalPrefix(prefix) {
  let n = 0;
  try { for (let i = 0; i < localStorage.length; i++) { if (localStorage.key(i).startsWith(prefix)) n++; } } catch (e) {}
  return n;
}

function ring(pct) {
  const r = 52, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
  return `
    <svg class="db-ring" viewBox="0 0 120 120" width="120" height="120" role="img" aria-label="${pct}% of modules mastered">
      <circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--border)" stroke-width="10"/>
      <circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--accent)" stroke-width="10" stroke-linecap="round"
        stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 60 60)"/>
      <text x="60" y="58" text-anchor="middle" font-size="26" font-weight="800" fill="var(--text)">${pct}%</text>
      <text x="60" y="76" text-anchor="middle" font-size="10" fill="var(--text3)">mastered</text>
    </svg>`;
}

export function mount(container) {
  const render = () => {
    const done = readDone();
    const mastered = MODULES.filter(m => done.has(m.id));
    const pct = Math.round((mastered.length / MODULES.length) * 100);

    const byGroup = GROUP_ORDER.map(g => {
      const items = MODULES.filter(m => m.group === g);
      const got = items.filter(m => done.has(m.id)).length;
      return { g, got, total: items.length, pct: items.length ? Math.round(got / items.length * 100) : 0 };
    });

    const quiz = all('quiz');
    const quizPassed = Object.values(quiz).filter(q => q.passed).length;
    const quizAttempted = Object.keys(quiz).length;
    const dec = counts('decisions');
    const trb = counts('troubleshoot');
    const cod = counts('coding');
    const tiered = Object.keys(all('tiered')).length;
    const srs = all('srs');
    const srsLearning = Object.values(srs).filter(s => s.reps > 0).length;
    const selfx = countLocalPrefix('kafka_selfx_');

    const visited = all('visited');
    const weak = MODULES.filter(m => (visited[m.id] || quiz[m.id]) && !done.has(m.id));
    const next = MODULES.find(m => !done.has(m.id));

    const stat = (val, label, sub) => `
      <div class="db-stat"><div class="db-stat-val">${val}</div><div class="db-stat-label">${label}</div>${sub ? `<div class="db-stat-sub">${sub}</div>` : ''}</div>`;

    container.querySelector('#db-body').innerHTML = `
      <div class="db-top">
        <div class="db-ring-wrap">
          ${ring(pct)}
          <div class="db-ring-cap">${mastered.length} / ${MODULES.length} modules</div>
          <div class="db-ring-note">A module counts only when its quiz is passed — real mastery, not pages opened.</div>
        </div>
        <div class="db-groups">
          ${byGroup.map(b => `
            <div class="db-grow">
              <div class="db-grow-head"><span>${b.g}</span><span class="db-grow-n">${b.got}/${b.total}</span></div>
              <div class="db-grow-bar"><div class="db-grow-fill" style="width:${b.pct}%"></div></div>
            </div>`).join('')}
        </div>
      </div>

      <div class="section-header home-section-head"><div class="section-title">Activity</div><div class="section-desc">What you've practiced across the whole platform.</div></div>
      <div class="db-stats">
        ${stat(`${quizPassed}`, 'Quizzes passed', `${quizAttempted} attempted`)}
        ${stat(`${dec.correct}/${dec.attempted || 0}`, 'Decision drills', 'correct / attempted')}
        ${stat(`${trb.correct}/${trb.attempted || 0}`, 'Incidents solved', 'clean / attempted')}
        ${stat(`${tiered}`, 'Tiered answers studied', 'Weak→Senior')}
        ${stat(`${selfx}`, 'Self-explanations written', 'generate-then-compare')}
        ${stat(`${srsLearning}`, 'Cards in review', 'spaced repetition')}
        ${stat(`${cod.correct}/${cod.attempted || 0}`, 'Coding drills', 'got it / rated')}
      </div>

      <div class="db-grid2">
        <div class="db-panel">
          <h3 class="db-panel-title">▶ Recommended next</h3>
          ${next ? `
            <a class="db-next" href="#${next.id}">
              <span class="db-next-icon">${next.icon}</span>
              <span class="db-next-body"><span class="db-next-title">${next.label}</span><span class="db-next-desc">${next.desc}</span></span>
              <span class="db-next-arrow">→</span>
            </a>` : `<div class="db-done">🏆 Every module mastered. Keep them sharp in the <a href="#review">Review Center</a>.</div>`}
        </div>
        <div class="db-panel">
          <h3 class="db-panel-title">⚠ Weak spots</h3>
          ${weak.length ? `
            <div class="db-weak-list">
              ${weak.slice(0, 8).map(m => `<a class="db-weak" href="#${m.id}"><span>${m.icon} ${m.label}</span><span class="db-weak-tag">${quiz[m.id] ? 'quiz not passed' : 'visited, no quiz'}</span></a>`).join('')}
            </div>` : `<div class="db-done">No weak spots — you've passed the quiz on every module you've opened.</div>`}
        </div>
      </div>

      <div class="db-actions">
        <a class="quiz-btn" href="#review">Open Review Center</a>
        <a class="quiz-btn" href="#study">Browse all interview questions</a>
      </div>`;
  };

  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">📊 · Review · Your Progress</div>
        <h1 class="module-title">Dashboard</h1>
        <p class="module-subtitle">An honest view of where you stand — mastery by group, what you've practiced, your weak spots, and what to study next. Everything is measured from real activity, stored in your browser.</p>
      </div>
      <div id="db-body"></div>
    </div>`;

  render();
  const onProgress = () => render();
  window.addEventListener('kafka:progress', onProgress);
  return () => window.removeEventListener('kafka:progress', onProgress);
}
