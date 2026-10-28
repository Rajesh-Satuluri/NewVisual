// ── Generic question renderer (Block B) ─────────────────────────────────────
// Turns a question data object (see content/schema.md) into the full UI:
// header + TL;DR + intro, optional flow strip, a step-through of answer steps
// (B6) with tables (B5), and a collapsible checklist self-check (B7).
//
// mount(container, data, { label }) → cleanup()

import { CATEGORY_LABEL } from '../content/index.js';

const DIFF_CLASS = {
  Fundamental: 'diff-fundamental',
  Intermediate: 'diff-intermediate',
  Advanced: 'diff-advanced',
};

// ── tiny, safe inline formatting ────────────────────────────────────────────
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
// escape first, then re-enable a small, fixed markup set: `code` and **bold**.
function fmt(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}
// split prose into paragraphs on blank lines
function paras(s) {
  return String(s).split(/\n\s*\n/).filter(Boolean)
    .map(p => `<p>${fmt(p.trim())}</p>`).join('');
}

// ── one answer step → card html ─────────────────────────────────────────────
function stepCard(step) {
  const parts = [];
  if (step.body)  parts.push(paras(step.body));
  if (step.bullets && step.bullets.length) {
    parts.push(`<ul class="sd-bullets">${
      step.bullets.map(b => `<li>${fmt(b)}</li>`).join('')
    }</ul>`);
  }
  if (step.rules && step.rules.length) {
    parts.push(`<div class="sd-rules">${
      step.rules.map(r => `<div class="sd-rule">${fmt(r)}</div>`).join('')
    }</div>`);
  }
  if (step.table) parts.push(tableHtml(step.table));
  if (step.body2) parts.push(paras(step.body2));
  if (step.flow && step.flow.length) parts.push(flowStrip(step.flow));
  return parts.join('');
}

// ── comparison table (B5) ───────────────────────────────────────────────────
function tableHtml(t) {
  const head = (t.head || []).map(h => `<th>${fmt(h)}</th>`).join('');
  const rows = (t.rows || []).map(r =>
    `<tr>${r.map((c, i) =>
      `<td${i === 0 ? ' class="sd-td-key"' : ''}>${fmt(c)}</td>`).join('')}</tr>`
  ).join('');
  return `<div class="sd-table-wrap"><table class="sd-table">
    ${head ? `<thead><tr>${head}</tr></thead>` : ''}
    <tbody>${rows}</tbody></table></div>`;
}

// ── flow strip (static chips; animated version lands in Block E) ────────────
function flowStrip(steps) {
  return `<div class="sd-flow">${
    steps.map((s, i) => `
      <span class="sd-flow-node">${fmt(s)}</span>
      ${i < steps.length - 1 ? '<span class="sd-flow-arrow">→</span>' : ''}
    `).join('')
  }</div>`;
}

export function mount(container, data, opts = {}) {
  const steps = data.steps || [];
  const checklist = data.checklist || [];
  const diffClass = DIFF_CLASS[data.difficulty] || '';
  const tags = (data.tags || [])
    .map(t => `<span class="sd-tag">${esc(t)}</span>`).join('');

  container.innerHTML = `
    <div class="module-page sd-question">
      <div class="module-hero">
        <div class="sd-badges">
          <span class="sd-diff ${diffClass}">${esc(data.difficulty || '')}</span>
          ${data.draft ? '<span class="sd-draft">draft</span>' : ''}
          <span class="sd-cat">${esc(CATEGORY_LABEL[data.category] || data.category || '')}</span>
        </div>
        <h1 class="module-title">${esc(data.question)}</h1>
        ${data.tldr ? `<p class="sd-tldr"><span class="sd-tldr-tag">TL;DR</span> ${fmt(data.tldr)}</p>` : ''}
        ${tags ? `<div class="sd-tags">${tags}</div>` : ''}
      </div>

      ${data.intro ? `<div class="sd-intro">${paras(data.intro)}</div>` : ''}

      ${data.flow && data.flow.length ? `
        <section class="sd-section">
          <h3 class="sd-section-title">The flow at a glance</h3>
          ${flowStrip(data.flow)}
        </section>` : ''}

      ${steps.length ? `
        <section class="sd-section sd-stepper" aria-label="Answer steps">
          <div class="sd-step-head">
            <span class="sd-step-count">Step <b id="sd-cur">1</b> of ${steps.length}</span>
            <div class="sd-dots" id="sd-dots">
              ${steps.map((_, i) => `<button class="sd-dot${i === 0 ? ' active' : ''}" data-i="${i}" title="Step ${i + 1}" aria-label="Go to step ${i + 1}"></button>`).join('')}
            </div>
          </div>
          <div class="sd-step-card" id="sd-step-card"></div>
          <div class="sd-step-nav">
            <button class="sd-btn" id="sd-prev" disabled>← Prev</button>
            <button class="sd-btn sd-btn-primary" id="sd-next">Next →</button>
          </div>
        </section>` : ''}

      ${checklist.length ? `
        <section class="sd-section sd-checklist-section">
          <button class="sd-check-toggle" id="sd-check-toggle" aria-expanded="true">
            <span>✔ Before you're done — self-check</span>
            <span class="sd-check-meta"><span id="sd-check-count">0</span>/${checklist.length}</span>
          </button>
          <ul class="sd-checklist" id="sd-checklist">
            ${checklist.map((c, i) => `
              <li class="sd-check-item" data-i="${i}">
                <button class="sd-check-box" aria-label="Toggle"></button>
                <span>${fmt(c)}</span>
              </li>`).join('')}
          </ul>
        </section>` : ''}
    </div>`;

  // ── stepper behaviour (B6) ────────────────────────────────────────────────
  let cur = 0;
  const card = container.querySelector('#sd-step-card');
  const curEl = container.querySelector('#sd-cur');
  const prevBtn = container.querySelector('#sd-prev');
  const nextBtn = container.querySelector('#sd-next');
  const dots = [...container.querySelectorAll('.sd-dot')];

  function showStep(i) {
    cur = Math.max(0, Math.min(steps.length - 1, i));
    const s = steps[cur];
    card.innerHTML = `
      <div class="sd-step-num">${cur + 1}</div>
      <h4 class="sd-step-title">${fmt(s.title || '')}</h4>
      <div class="sd-step-body">${stepCard(s)}</div>`;
    if (curEl) curEl.textContent = String(cur + 1);
    dots.forEach((d, j) => d.classList.toggle('active', j === cur));
    dots.forEach((d, j) => d.classList.toggle('seen', j <= cur));
    if (prevBtn) prevBtn.disabled = cur === 0;
    if (nextBtn) {
      nextBtn.disabled = cur === steps.length - 1;
      nextBtn.textContent = cur === steps.length - 1 ? 'Done ✓' : 'Next →';
    }
  }

  function onKey(e) {
    if (e.target.closest('input, textarea')) return;
    if (e.key === 'ArrowRight') { showStep(cur + 1); }
    else if (e.key === 'ArrowLeft') { showStep(cur - 1); }
  }

  if (steps.length) {
    prevBtn.addEventListener('click', () => showStep(cur - 1));
    nextBtn.addEventListener('click', () => showStep(cur + 1));
    dots.forEach(d => d.addEventListener('click', () => showStep(+d.dataset.i)));
    document.addEventListener('keydown', onKey);
    showStep(0);
  }

  // ── checklist behaviour (B7) ──────────────────────────────────────────────
  const checkToggle = container.querySelector('#sd-check-toggle');
  const checkList = container.querySelector('#sd-checklist');
  const checkCount = container.querySelector('#sd-check-count');
  if (checkToggle) {
    const items = [...container.querySelectorAll('.sd-check-item')];
    const refresh = () =>
      checkCount.textContent = String(items.filter(it => it.classList.contains('checked')).length);
    items.forEach(it => it.addEventListener('click', () => {
      it.classList.toggle('checked');
      refresh();
    }));
    checkToggle.addEventListener('click', () => {
      const open = checkList.classList.toggle('collapsed');
      checkToggle.setAttribute('aria-expanded', String(!open));
    });
  }

  return function cleanup() {
    document.removeEventListener('keydown', onKey);
  };
}
