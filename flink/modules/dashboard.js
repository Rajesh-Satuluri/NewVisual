// Dashboard — honest mastery analytics. Everything here reads the progress
// store (quiz passes, visits, decisions, self-explain, SRS) and refreshes live
// on the flink:progress event.
import { MODULES } from '../components/nav.js';
import { getProgress, masteredSet, PASS_RATIO } from '../data/progress-store.js';
import { deckStats } from '../data/review.js';

function groups() {
  const order = [...new Set(MODULES.map(m => m.group))];
  return order.map(name => ({ name, items: MODULES.filter(m => m.group === name) }));
}

export function mount(container) {
  function render() {
    const prog = getProgress();
    const mastered = masteredSet(prog);
    const masteredMods = MODULES.filter(m => mastered.has(m.id));
    const total = MODULES.length;
    const pct = Math.round((masteredMods.length / total) * 100);

    const visited = new Set(prog.visited);
    const quiz = prog.quiz || {};
    const decisionsDone = Object.values(prog.decisions || {}).reduce((n, a) => n + a.length, 0);
    const selfDone = Object.values(prog.selfExplain || {}).reduce((n, a) => n + a.length, 0);
    const srsReviewed = Object.keys(prog.srs || {}).length;
    const srs = deckStats('all');

    // weak spots: quiz attempted but not passed, or visited but never quizzed
    const weak = MODULES.filter(m => {
      const q = quiz[m.id];
      if (q && q.total > 0 && q.best / q.total < PASS_RATIO) return true;
      if (visited.has(m.id) && !q && !mastered.has(m.id)) return true;
      return false;
    });

    const nextMod = MODULES.find(m => !mastered.has(m.id));

    const R = 54, C = 2 * Math.PI * R;
    const dash = (pct / 100) * C;

    container.innerHTML = `
      <div class="module-page">
        <div class="module-hero">
          <div class="module-tag">📊 Your progress</div>
          <h1 class="module-title">Dashboard</h1>
          <p class="module-subtitle">Mastery is earned by passing each module's quiz (≥ ${Math.round(PASS_RATIO * 100)}%). Everything below is your real activity — nothing is counted just for opening a page.</p>
        </div>
        <div class="tab-content active">
          <div class="dash-top">
            <div class="dash-ring-card">
              <svg viewBox="0 0 128 128" class="dash-ring" role="img" aria-label="${masteredMods.length} of ${total} modules mastered, ${pct} percent">
                <circle cx="64" cy="64" r="${R}" class="dash-ring-bg" fill="none" stroke-width="12"/>
                <circle cx="64" cy="64" r="${R}" class="dash-ring-fg" fill="none" stroke-width="12"
                  stroke-dasharray="${dash.toFixed(1)} ${C.toFixed(1)}" stroke-linecap="round"
                  transform="rotate(-90 64 64)"/>
                <text x="64" y="60" text-anchor="middle" class="dash-ring-pct">${pct}%</text>
                <text x="64" y="80" text-anchor="middle" class="dash-ring-sub">${masteredMods.length}/${total}</text>
              </svg>
              <div class="dash-ring-label">Modules mastered</div>
            </div>
            <div class="dash-kpis">
              <div class="dash-kpi"><div class="dash-kpi-v">${visited.size}</div><div class="dash-kpi-l">Modules visited</div></div>
              <div class="dash-kpi"><div class="dash-kpi-v">${Object.keys(quiz).length}</div><div class="dash-kpi-l">Quizzes attempted</div></div>
              <div class="dash-kpi"><div class="dash-kpi-v">${decisionsDone}</div><div class="dash-kpi-l">Decision drills</div></div>
              <div class="dash-kpi"><div class="dash-kpi-v">${selfDone}</div><div class="dash-kpi-l">Self-explains</div></div>
              <div class="dash-kpi"><div class="dash-kpi-v">${srsReviewed}</div><div class="dash-kpi-l">Cards reviewed</div></div>
              <div class="dash-kpi"><div class="dash-kpi-v">${srs.due}</div><div class="dash-kpi-l">Cards due now</div></div>
            </div>
          </div>

          ${nextMod ? `
            <div class="dash-next">
              <div>
                <div class="dash-next-label">Recommended next</div>
                <div class="dash-next-title">${nextMod.icon} ${nextMod.num} · ${nextMod.title}</div>
              </div>
              <a class="btn btn-primary" href="#${nextMod.id}">Start →</a>
            </div>` : `
            <div class="dash-next dash-next-done">🏆 Every module mastered. Keep your recall sharp in the <a href="#review">Review Center</a>.</div>`}

          <div class="dash-section-title">Progress by area</div>
          <div class="dash-groups">
            ${groups().map(g => {
              const done = g.items.filter(m => mastered.has(m.id)).length;
              const p = Math.round((done / g.items.length) * 100);
              return `
                <div class="dash-group">
                  <div class="dash-group-head"><span>${g.name}</span><span class="dash-group-n">${done}/${g.items.length}</span></div>
                  <div class="dash-bar"><div class="dash-bar-fill" style="width:${p}%"></div></div>
                </div>`;
            }).join('')}
          </div>

          <div class="dash-section-title">Weak spots ${weak.length ? `<span class="dash-group-n">${weak.length}</span>` : ''}</div>
          ${weak.length ? `
            <div class="dash-weak">
              ${weak.map(m => {
                const q = quiz[m.id];
                const detail = q ? `scored ${q.best}/${q.total}` : 'opened, not yet quizzed';
                return `<a class="dash-weak-item" href="#${m.id}"><span>${m.icon} ${m.title}</span><span class="dash-weak-detail">${detail} →</span></a>`;
              }).join('')}
            </div>` : `<div class="dash-empty">No weak spots flagged yet. Attempt a module quiz and anything below ${Math.round(PASS_RATIO * 100)}% shows up here.</div>`}
        </div>
      </div>`;
  }

  render();
  const onProg = () => { if (document.getElementById('module-canvas')?.contains(container) || container.isConnected) render(); };
  window.addEventListener('flink:progress', onProg);
  return () => window.removeEventListener('flink:progress', onProg);
}
