// Readiness Dashboard (EXTRAS).
// Computes a per-area learning-progress score from what you've viewed
// (localStorage dbt-done) and your best quiz scores (dbt-quiz-<id>). This is
// LEARNING PROGRESS through the tool — explicitly NOT a claim of job readiness.
import { createModuleShell } from '../components/module-shell.js';
import { QUIZ_BANK } from '../data/quiz-bank.js';

const AREAS = [
  { name: 'Fundamentals',        color: '#3B82F6', ids: ['m01','m02','m03','m04','m05','m06','m07','m08','m09'] },
  { name: 'Modeling',            color: '#06B6D4', ids: ['m10','m12','m13','m14','m15','m21'] },
  { name: 'Testing & Quality',   color: '#10B981', ids: ['m11','m22','m23'] },
  { name: 'Internals',           color: '#8B5CF6', ids: ['m17','m18','m19','m20'] },
  { name: 'Production',          color: '#EF4444', ids: ['m16','m24','m25','m26'] },
  { name: 'CI/CD & Environments',color: '#F59E0B', ids: ['m27','m28'] },
  { name: 'Architecture',        color: '#EC4899', ids: ['m29','m30','m31'] },
  { name: 'Commands & Interview',color: '#14B8A6', ids: ['m32'] },
];

function readState() {
  let done = new Set();
  try { done = new Set(JSON.parse(localStorage.getItem('dbt-done') || '[]')); } catch (e) {}
  const quiz = id => {
    try { const v = localStorage.getItem(`dbt-quiz-${id}`); return v === null ? null : Number(v); } catch (e) { return null; }
  };
  return { done, quiz };
}

// Per module: 40% for viewing, 60% for quiz performance (if a quiz exists & taken).
function moduleScore(id, st) {
  const total = (QUIZ_BANK[id] || []).length;
  const viewed = st.done.has(id) ? 1 : 0;
  if (!total) return viewed; // no quiz → viewing is the whole signal
  const best = st.quiz(id);
  const quizFrac = best === null ? 0 : Math.min(best / total, 1);
  return 0.4 * viewed + 0.6 * quizFrac;
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Review · Progress',
    title: 'Readiness Dashboard',
    subtitle: 'Your learning progress through the tool, by area — from modules viewed and quiz scores.',
    tabs: [{ id: 'dash', label: '📊 Dashboard' }],
  });
  const tab = container.querySelector('#tab-dash');
  render(tab);
}

function render(tab) {
  const st = readState();
  const areaPct = AREAS.map(a => {
    const scores = a.ids.map(id => moduleScore(id, st));
    const pct = Math.round((scores.reduce((s, x) => s + x, 0) / a.ids.length) * 100);
    return { ...a, pct };
  });
  const overall = Math.round(areaPct.reduce((s, a) => s + a.pct, 0) / areaPct.length);
  const viewedCount = [...st.done].filter(id => /^m\d+$/.test(id)).length;

  tab.innerHTML = `
    <div class="rd-top">
      <div class="sim-score-ring" style="--pct:${overall}">
        <div class="sim-score-val">${overall}%</div>
        <div class="sim-score-lbl">overall</div>
      </div>
      <div class="rd-top-body">
        <h3>Your dbt learning progress</h3>
        <p>${viewedCount} of 32 modules viewed. Scores combine modules you've opened with your best quiz results. Take each module's <em>Test Yourself</em> quiz and work the <em>Interview Simulator</em> to raise your numbers.</p>
        <p class="rd-disclaimer">This measures your progress through this tool — it is <strong>not</strong> a measure of actual job readiness.</p>
      </div>
    </div>
    <div class="rd-areas">
      ${areaPct.map(a => `
        <div class="rd-area">
          <div class="rd-area-head">
            <span class="rd-area-name">${a.name}</span>
            <span class="rd-area-pct" style="color:${a.color}">${a.pct}%</span>
          </div>
          <div class="rd-track"><div class="rd-fill" style="width:${a.pct}%;background:${a.color}"></div></div>
        </div>`).join('')}
    </div>
    <div class="rd-actions">
      <button class="btn btn-secondary" id="rd-refresh">↻ Refresh</button>
      <button class="btn btn-ghost" id="rd-reset">Reset progress</button>
    </div>
    <p class="rd-weak" id="rd-weak"></p>
  `;

  const weak = [...areaPct].sort((a, b) => a.pct - b.pct).slice(0, 3).filter(a => a.pct < 100);
  tab.querySelector('#rd-weak').innerHTML = weak.length
    ? `Weakest areas to focus next: ${weak.map(a => `<strong>${a.name}</strong> (${a.pct}%)`).join(' · ')}.`
    : 'Every area at 100% — nice. Revisit the Interview Simulator to keep it sharp.';

  tab.querySelector('#rd-refresh').addEventListener('click', () => render(tab));
  tab.querySelector('#rd-reset').addEventListener('click', () => {
    if (!confirm('Reset all viewed-module and quiz progress? This cannot be undone.')) return;
    try {
      localStorage.removeItem('dbt-done');
      Object.keys(localStorage).filter(k => k.startsWith('dbt-quiz-')).forEach(k => localStorage.removeItem(k));
    } catch (e) {}
    render(tab);
  });
}
