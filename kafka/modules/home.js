// Home — landing page. Hero, stats strip, "start here" path, full curriculum
// grid (auto-built from the nav MODULES so it never drifts), and reference
// links. Registered as the default route in script.js.
import { MODULES } from '../components/nav.js';
import { QUIZ_BANK } from '../data/quiz-bank.js';
import { loadAllIQ } from '../data/iq-aggregate.js';

const GROUP_ORDER = ['Foundation', 'Core Internals', 'Consumer Side', 'Delivery', 'Ecosystem', 'Operations', 'Advanced'];

// A short "why start here" path — the spine through the 22 modules.
const START_PATH = ['m01', 'm03', 'm04', 'm08', 'm11', 'm19'];

export function mount(container) {
  const done = new Set(JSON.parse(localStorage.getItem('kafka-done') || '[]'));
  const doneCount = MODULES.filter(m => done.has(m.id)).length;

  const totalQuiz = Object.values(QUIZ_BANK).reduce((n, arr) => n + (arr ? arr.length : 0), 0);

  const groups = {};
  MODULES.forEach(m => { (groups[m.group] = groups[m.group] || []).push(m); });

  const stat = (val, label) => `
    <div class="stat-box"><span class="stat-val">${val}</span><span class="stat-label">${label}</span></div>`;

  const startCard = id => {
    const m = MODULES.find(x => x.id === id);
    if (!m) return '';
    const n = m.id.replace(/^m/, '');
    return `
      <a href="#${m.id}" class="home-step${done.has(m.id) ? ' done' : ''}">
        <span class="home-step-num">${n}</span>
        <span class="home-step-body">
          <span class="home-step-title">${m.icon} ${m.label}</span>
          <span class="home-step-desc">${m.desc}</span>
        </span>
        ${done.has(m.id) ? '<span class="home-step-check">✓</span>' : '<span class="home-step-arrow">→</span>'}
      </a>`;
  };

  const curriculumCard = m => {
    const n = m.id.replace(/^m/, '');
    return `
      <a href="#${m.id}" class="home-card${done.has(m.id) ? ' done' : ''}">
        <span class="home-card-icon">${m.icon}</span>
        <span class="home-card-text">
          <span class="home-card-title"><span class="home-card-num">${n}</span> ${m.label}</span>
          <span class="home-card-desc">${m.desc}</span>
        </span>
      </a>`;
  };

  const groupBlock = g => {
    const items = groups[g] || [];
    if (!items.length) return '';
    return `
      <div class="home-group">
        <div class="home-group-head">
          <span class="home-group-name">${g}</span>
          <span class="home-group-count">${items.length} module${items.length > 1 ? 's' : ''}</span>
        </div>
        <div class="home-grid">${items.map(curriculumCard).join('')}</div>
      </div>`;
  };

  container.innerHTML = `
    <div class="module-page">
      <div class="home-hero">
        <div class="module-tag">📨 · Interactive Learning Lab · Amazon Edition</div>
        <h1 class="home-title">Apache Kafka,<br><span class="home-title-grad">from the inside out.</span></h1>
        <p class="home-sub">A visual, animated walkthrough of Kafka's internals — producers, brokers,
        partitions, replication, delivery guarantees, and the failure modes you'll be asked about in
        senior data-engineering interviews. 22 modules, zero setup, runs in your browser.</p>
        <div class="home-cta">
          <a class="home-btn home-btn-primary" href="#m01">Start learning →</a>
          <a class="home-btn home-btn-ghost" href="#study">Interview prep</a>
        </div>
        <div class="stats-row home-stats">
          ${stat(MODULES.length, 'Modules')}
          <div class="stat-box"><span class="stat-val" id="home-iq">…</span><span class="stat-label">Interview Q&amp;As</span></div>
          ${stat(totalQuiz || '—', 'Quiz questions')}
          ${stat(`${doneCount}/${MODULES.length}`, 'Your progress')}
        </div>
      </div>

      <div class="section-header home-section-head">
        <div class="section-title">Start here</div>
        <div class="section-desc">The shortest path from "what is Kafka" to an end-to-end pipeline.</div>
      </div>
      <div class="home-steps">${START_PATH.map(startCard).join('')}</div>

      <div class="section-header home-section-head">
        <div class="section-title">Full curriculum</div>
        <div class="section-desc">All ${MODULES.length} modules, grouped by theme. Pick up anywhere — your progress is saved.</div>
      </div>
      ${GROUP_ORDER.map(groupBlock).join('')}

      <div class="section-header home-section-head">
        <div class="section-title">Reference</div>
        <div class="section-desc">Jump to review tools any time.</div>
      </div>
      <div class="home-grid home-ref-grid">
        <a href="#master-map" class="home-card">
          <span class="home-card-icon">🗺️</span>
          <span class="home-card-text">
            <span class="home-card-title">Master Map</span>
            <span class="home-card-desc">Follow one event end to end, then jump into any stage.</span>
          </span>
        </a>
        <a href="#glossary" class="home-card">
          <span class="home-card-icon">📖</span>
          <span class="home-card-text">
            <span class="home-card-title">Glossary</span>
            <span class="home-card-desc">Every term defined in one line and linked to its module.</span>
          </span>
        </a>
        <a href="#cheatsheet" class="home-card">
          <span class="home-card-icon">📋</span>
          <span class="home-card-text">
            <span class="home-card-title">Cheat Sheet</span>
            <span class="home-card-desc">CLI, key configs, and delivery semantics on one printable page.</span>
          </span>
        </a>
        <a href="#decisions" class="home-card">
          <span class="home-card-icon">🧭</span>
          <span class="home-card-text">
            <span class="home-card-title">Choose the Approach</span>
            <span class="home-card-desc">Make the trade-off call on real scenarios, then see why each option wins or loses.</span>
          </span>
        </a>
        <a href="#study" class="home-card">
          <span class="home-card-icon">📚</span>
          <span class="home-card-text">
            <span class="home-card-title">Study Hub</span>
            <span class="home-card-desc">Every interview question in one searchable, filterable place.</span>
          </span>
        </a>
      </div>

      <p class="home-tip">Tips: <kbd>Ctrl</kbd>/<kbd>⌘</kbd>+<kbd>K</kbd> to jump anywhere · <kbd>←</kbd><kbd>→</kbd> to move between modules · <kbd>P</kbd> to play · <kbd>?</kbd> for all shortcuts.</p>
    </div>`;

  // Fill the interview-question count lazily so it never blocks first paint.
  let alive = true;
  const fill = () => loadAllIQ().then(list => {
    if (!alive) return;
    const el = container.querySelector('#home-iq');
    if (el) el.textContent = list.length;
  });
  if ('requestIdleCallback' in window) requestIdleCallback(fill); else setTimeout(fill, 400);

  return () => { alive = false; };
}
