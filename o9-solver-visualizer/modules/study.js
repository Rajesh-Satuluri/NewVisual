// study.js — Study Hub (Review section).
// A guided "what to study next" view derived entirely from real progress:
// the next unmastered module in curriculum order, the learning path with
// mastered modules checked, weakest groups, and cards due for review.
import { MODULES } from '../components/nav.js';
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

function groupOrder() {
  const seen = [];
  MODULES.forEach(m => { if (!seen.includes(m.group)) seen.push(m.group); });
  return seen;
}

const LEVEL_COLOR = { Beginner: '#10B981', Core: '#38BDF8', Advanced: '#A78BFA' };

function render(container) {
  const body = container.querySelector('#study-body');
  if (!body) return;

  const done = readDone();
  const total = MODULES.length;
  const mastered = MODULES.filter(m => done.has(m.id)).length;

  // Next recommended = first module in order not yet mastered.
  const next = MODULES.find(m => !done.has(m.id));

  // Weakest groups by mastery ratio (only groups with unfinished work).
  const order = groupOrder();
  const groupStats = order.map(g => {
    const mods = MODULES.filter(m => m.group === g);
    const got = mods.filter(m => done.has(m.id)).length;
    return { g, got, total: mods.length, ratio: mods.length ? got / mods.length : 1 };
  });
  const unfinished = groupStats.filter(s => s.got < s.total);
  const minRatio = unfinished.length ? Math.min(...unfinished.map(s => s.ratio)) : 1;
  const weak = unfinished.filter(s => s.ratio === minRatio);

  // Review due.
  const deck = buildDeck();
  const srs = readSrs();
  const { due } = partitionDeck(deck, srs);
  const nd = nextDueLabel(deck, srs);

  const nextCard = next ? `
    <div class="info-card study-next" style="border-left:3px solid ${LEVEL_COLOR[next.level] || 'var(--accent,#6366F1)'}">
      <div class="info-card-title">${next.icon || '▶'} ${next.label}</div>
      <div class="info-card-body">
        <span class="level-badge level-${(next.level || 'core').toLowerCase()}">${next.level || ''}</span>
        <span style="color:var(--text2)">${next.group}</span>
        ${next.prereq ? `<div style="margin-top:6px;font-size:12px;color:var(--text2)">Builds on: <strong>${next.prereq}</strong></div>` : ''}
        <div style="margin-top:6px">${next.desc || ''}</div>
      </div>
      <a class="ctrl-btn" href="#${next.id}" style="margin-top:10px;display:inline-flex">Start →</a>
    </div>` : `
    <div class="info-card" style="border-left:3px solid #10B981">
      <div class="info-card-title">🏆 All modules mastered</div>
      <div class="info-card-body">You've completed every module. Keep the knowledge sharp with spaced-repetition review.</div>
    </div>`;

  body.innerHTML = `
    <div class="section-header">
      <div class="section-title">Study next</div>
      <div class="section-desc">${mastered} of ${total} modules mastered. ${next ? 'Here’s the next one on the path.' : 'The curriculum is complete.'}</div>
    </div>
    <div class="info-grid">${nextCard}</div>

    <div class="section-header" style="margin-top:22px">
      <div class="section-title">Due for review</div>
      <div class="section-desc">Spaced-repetition cards ready now.</div>
    </div>
    <div class="info-grid">
      <div class="info-card" style="border-left:3px solid #F59E0B">
        <div class="dash-kpi-value">${due.length}</div>
        <div class="info-card-title">card(s) due</div>
        <div class="info-card-body">${due.length ? 'Clear them before they pile up.' : (nd ? `Next due in about ${nd}.` : 'Nothing scheduled yet — start a session to seed the deck.')}</div>
        <a class="ctrl-btn" href="#review" style="margin-top:10px;display:inline-flex">🔁 Review now</a>
      </div>
    </div>

    ${weak.length ? `
    <div class="section-header" style="margin-top:22px">
      <div class="section-title">Focus areas</div>
      <div class="section-desc">Group${weak.length > 1 ? 's' : ''} with the least coverage so far.</div>
    </div>
    <div class="info-grid">
      ${weak.map(w => `
        <div class="info-card" style="border-left:3px solid #EF4444">
          <div class="info-card-title">${w.g}</div>
          <div class="info-card-body">${w.got} of ${w.total} mastered — the lowest on the board.</div>
        </div>`).join('')}
    </div>` : ''}

    <div class="section-header" style="margin-top:22px">
      <div class="section-title">The learning path</div>
      <div class="section-desc">Every module in order. ✓ marks what you've mastered.</div>
    </div>
    <div class="study-path">
      ${order.map(g => {
        const mods = MODULES.filter(m => m.group === g);
        return `
          <div class="study-path-group">
            <div class="study-path-head">${g}</div>
            ${mods.map(m => `
              <a class="study-path-item${done.has(m.id) ? ' done' : ''}${next && m.id === next.id ? ' next' : ''}" href="#${m.id}">
                <span class="study-path-check">${done.has(m.id) ? '✓' : (next && m.id === next.id ? '▶' : '○')}</span>
                <span class="study-path-icon">${m.icon || ''}</span>
                <span class="study-path-label">${m.label}</span>
              </a>`).join('')}
          </div>`;
      }).join('')}
    </div>

    <div class="dash-actions">
      <a class="ctrl-btn" href="#dashboard">📊 Dashboard</a>
      <a class="ctrl-btn" href="#master-map">🗺️ Master Map</a>
    </div>`;
}

export function mount(container) {
  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">Review</div>
        <h1 class="module-title">Study Hub</h1>
        <p class="module-subtitle">Your personal plan — the next module to take, what's due for review, where you're weakest, and the whole path at a glance.</p>
      </div>
      <div class="scroll-content" id="study-body"></div>
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
