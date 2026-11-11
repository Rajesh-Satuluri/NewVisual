// ── Dashboard page ────────────────────────────────────────────────────────────
// Honest mastery analytics from the local progress set: overall + per-group
// progress, and a "study next" list. mount(container, { done }) → cleanup

import { reg } from '../content/registry.js';
import { esc } from './render-helpers.js';

export function mount(container, { done } = { done: new Set() }) {
  const { QUESTIONS, CATEGORY_ORDER, CATEGORY_LABEL, CONCEPTS, CONCEPT_GROUPS, CONCEPT_PREFIX } = reg;
  const builtConcepts = CONCEPTS.filter(c => c.built);
  const conceptsDone = builtConcepts.filter(c => done.has(CONCEPT_PREFIX + c.id)).length;
  const questionsDone = QUESTIONS.filter(q => done.has(q.id)).length;
  const total = builtConcepts.length + QUESTIONS.length;
  const doneTotal = conceptsDone + questionsDone;
  const pct = total ? Math.round((doneTotal / total) * 100) : 0;

  const circ = 2 * Math.PI * 52;
  const dash = (pct / 100) * circ;

  function bar(label, d, n, hash) {
    const p = n ? Math.round((d / n) * 100) : 0;
    const row = `
      <div class="sd-db-row">
        <div class="sd-db-row-head">
          <span class="sd-db-row-label">${esc(label)}</span>
          <span class="sd-db-row-count">${d}/${n}</span>
        </div>
        <div class="sd-db-bar"><div class="sd-db-fill${p === 100 ? ' full' : ''}" style="width:${p}%"></div></div>
      </div>`;
    return hash ? `<a class="sd-db-row-link" href="#${hash}">${row}</a>` : row;
  }

  // per concept group
  const conByGroup = {};
  builtConcepts.forEach(c => { (conByGroup[c.group] = conByGroup[c.group] || []).push(c); });
  const conceptBars = CONCEPT_GROUPS.map(g => {
    const items = conByGroup[g] || [];
    if (!items.length) return '';
    const d = items.filter(c => done.has(CONCEPT_PREFIX + c.id)).length;
    return bar(g, d, items.length);
  }).join('');

  // per question category
  const qByCat = {};
  QUESTIONS.forEach(q => { (qByCat[q.category] = qByCat[q.category] || []).push(q); });
  const questionBars = CATEGORY_ORDER.map(cat => {
    const items = qByCat[cat] || [];
    if (!items.length) return '';
    const d = items.filter(q => done.has(q.id)).length;
    return bar(CATEGORY_LABEL[cat] || cat, d, items.length);
  }).join('');

  // study next — first few built concepts not yet done, in chapter order
  const next = builtConcepts
    .slice().sort((a, b) => a.chapter - b.chapter)
    .filter(c => !done.has(CONCEPT_PREFIX + c.id))
    .slice(0, 5);
  const nextHtml = next.length ? next.map(c => `
    <a class="sd-db-next-item" href="#${CONCEPT_PREFIX}${c.id}">
      <span class="sd-db-next-icon">${c.icon || '🧭'}</span>
      <span class="sd-db-next-text"><span class="sd-db-next-title">${esc(c.title)}</span><span class="sd-db-next-sub">Ch ${c.chapter} · ${esc(c.group)}</span></span>
      <span class="sd-db-next-arrow">→</span>
    </a>`).join('') : `<div class="sd-db-done-all">🎉 Every concept is marked done. Try the question catalog next.</div>`;

  const stat = (val, label, tone) => `<div class="sd-stat-tile sd-stat-${tone || 'accent'}"><span class="sd-stat-value">${val}</span><span class="sd-stat-label">${label}</span></div>`;

  container.innerHTML = `
    <div class="module-page sd-ref-page">
      <div class="module-hero">
        <div class="module-tag">📊 · Reference</div>
        <h1 class="module-title">Dashboard</h1>
        <p class="sd-tldr"><span class="sd-tldr-tag">Your progress</span> Tracked locally in your browser — where you are, and what to pick up next.</p>
      </div>

      <div class="sd-db-top">
        <div class="sd-db-ring-card">
          <svg class="sd-db-ring" viewBox="0 0 120 120" width="128" height="128">
            <circle cx="60" cy="60" r="52" class="sd-db-ring-bg" fill="none" stroke-width="12"/>
            <circle cx="60" cy="60" r="52" class="sd-db-ring-fg" fill="none" stroke-width="12"
              stroke-dasharray="${dash.toFixed(1)} ${circ.toFixed(1)}" stroke-linecap="round"
              transform="rotate(-90 60 60)"/>
            <text x="60" y="56" text-anchor="middle" class="sd-db-ring-pct">${pct}%</text>
            <text x="60" y="74" text-anchor="middle" class="sd-db-ring-sub">${doneTotal}/${total}</text>
          </svg>
          <div class="sd-db-ring-caption">Overall completion</div>
        </div>
        <div class="sd-db-stats">
          ${stat(`${conceptsDone}/${builtConcepts.length}`, 'Concepts done', 'blue')}
          ${QUESTIONS.length ? stat(`${questionsDone}/${QUESTIONS.length}`, 'Questions done', 'green') : ''}
          ${stat(doneTotal, 'Total completed', 'accent')}
          ${stat(total - doneTotal, 'Remaining', 'amber')}
        </div>
      </div>

      <div class="sd-db-cols">
        <section class="sd-db-panel">
          <h2 class="sd-db-panel-title">🧭 Concepts by theme</h2>
          ${conceptBars}
        </section>
        ${QUESTIONS.length ? `<section class="sd-db-panel">
          <h2 class="sd-db-panel-title">❓ Questions by category</h2>
          ${questionBars}
        </section>` : ''}
      </div>

      <section class="sd-db-panel sd-db-next">
        <h2 class="sd-db-panel-title">▶️ Study next</h2>
        <div class="sd-db-next-list">${nextHtml}</div>
      </section>
    </div>`;

  return () => {};
}
