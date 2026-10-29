// ── Generic concept renderer (Concepts layer) ───────────────────────────────
// Renders a concept data object (see content/concepts.js) as a tabbed page:
//   📖 Concept        — clear explanation (sections, tables, flow, optional widget)
//   💬 Interview Q&A  — collapsible accordion of questions + answers + tips
//   🔗 Related        — links to matching questions from the 91-question catalog
//
// mount(container, data, { meta }) → cleanup()

import { QUESTIONS, CATEGORY_LABEL } from '../content/index.js';
import { WIDGETS, WIDGET_META } from './widgets/index.js';

const DIFF_CLASS = {
  Fundamental: 'diff-fundamental', Intermediate: 'diff-intermediate', Advanced: 'diff-advanced',
};

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
function fmt(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}
function paras(s) {
  return String(s).split(/\n\s*\n/).filter(Boolean)
    .map(p => `<p>${fmt(p.trim())}</p>`).join('');
}
function tableHtml(t) {
  const head = (t.head || []).map(h => `<th>${fmt(h)}</th>`).join('');
  const rows = (t.rows || []).map(r =>
    `<tr>${r.map((c, i) => `<td${i === 0 ? ' class="sd-td-key"' : ''}>${fmt(c)}</td>`).join('')}</tr>`).join('');
  return `<div class="sd-table-wrap"><table class="sd-table">
    ${head ? `<thead><tr>${head}</tr></thead>` : ''}<tbody>${rows}</tbody></table></div>`;
}
function flowStrip(steps) {
  return `<div class="sd-flow">${steps.map((s, i) =>
    `<span class="sd-flow-node">${fmt(s)}</span>${i < steps.length - 1 ? '<span class="sd-flow-arrow">→</span>' : ''}`
  ).join('')}</div>`;
}

function sectionCard(s, i) {
  const parts = [];
  if (s.body) parts.push(paras(s.body));
  if (s.bullets && s.bullets.length) parts.push(`<ul class="sd-bullets">${s.bullets.map(b => `<li>${fmt(b)}</li>`).join('')}</ul>`);
  if (s.rules && s.rules.length) parts.push(`<div class="sd-rules">${s.rules.map(r => `<div class="sd-rule">${fmt(r)}</div>`).join('')}</div>`);
  if (s.table) parts.push(tableHtml(s.table));
  if (s.body2) parts.push(paras(s.body2));
  if (s.flow && s.flow.length) parts.push(flowStrip(s.flow));
  return `<section class="sd-con-section">
    ${s.title ? `<h3 class="sd-con-h"><span class="sd-con-n">${i + 1}</span>${fmt(s.title)}</h3>` : ''}
    <div class="sd-con-body">${parts.join('')}</div>
  </section>`;
}

function qaHtml(qa) {
  return `<div class="iq-list">${qa.map((item, i) => {
    const body = [];
    if (item.a) body.push(paras(item.a));
    if (item.bullets && item.bullets.length) body.push(`<ul class="sd-bullets">${item.bullets.map(b => `<li>${fmt(b)}</li>`).join('')}</ul>`);
    if (item.table) body.push(tableHtml(item.table));
    return `
      <div class="iq-item">
        <button class="iq-question" aria-expanded="false">
          <span class="iq-num">Q${i + 1}</span>
          <span class="iq-q-text">${fmt(item.q)}</span>
          <span class="iq-chevron">▾</span>
        </button>
        <div class="iq-answer">
          <div class="iq-answer-body">${body.join('')}${item.tip ? `<div class="iq-tip">💡 ${fmt(item.tip)}</div>` : ''}</div>
        </div>
      </div>`;
  }).join('')}</div>`;
}

function relatedHtml(ids) {
  const items = ids.map(id => QUESTIONS.find(q => q.id === id)).filter(Boolean);
  if (!items.length) return '';
  return `<div class="sd-rel-list">${items.map(q => `
    <a class="sd-rel-item" href="#${q.id}">
      <span class="sd-rel-icon">${q.icon || '📘'}</span>
      <span class="sd-rel-main">
        <span class="sd-rel-q">${esc(q.question)}</span>
        <span class="sd-rel-meta">
          <span class="sd-diff ${DIFF_CLASS[q.difficulty] || ''}">${esc(q.difficulty || '')}</span>
          <span class="sd-rel-cat">${esc(CATEGORY_LABEL[q.category] || q.category || '')}</span>
        </span>
      </span>
      <span class="sd-rel-arrow">→</span>
    </a>`).join('')}</div>`;
}

export function mount(container, data, opts = {}) {
  const meta = opts.meta || {};
  const sections = data.sections || [];
  const qa = data.qa || [];
  const relIds = data.related || [];
  const relItems = relIds.map(id => QUESTIONS.find(q => q.id === id)).filter(Boolean);
  const widgetId = data.widget && WIDGETS[data.widget] ? data.widget : null;
  const widgetMeta = (widgetId && WIDGET_META[widgetId]) || { title: 'Interactive', hint: '' };

  const tabs = [
    { id: 'concept', label: '📖 Concept' },
    ...(qa.length ? [{ id: 'qa', label: `💬 Interview Q&A · ${qa.length}` }] : []),
    ...(relItems.length ? [{ id: 'related', label: `🔗 Related · ${relItems.length}` }] : []),
  ];

  container.innerHTML = `
    <div class="module-page sd-concept">
      <div class="module-hero">
        <div class="sd-badges">
          <span class="sd-con-chip">📘 Ch ${data.chapter || meta.chapter || '—'}</span>
          <span class="sd-cat">${esc(data.group || meta.group || '')}</span>
        </div>
        <h1 class="module-title">${esc(data.icon || meta.icon || '')} ${esc(data.title || meta.title || '')}</h1>
        ${data.summary ? `<p class="sd-tldr"><span class="sd-tldr-tag">In short</span> ${fmt(data.summary)}</p>` : ''}
      </div>

      <div class="sd-tabbar" role="tablist">
        ${tabs.map((t, i) => `<button class="sd-tab${i === 0 ? ' active' : ''}" role="tab" data-tab="${t.id}" aria-selected="${i === 0}">${t.label}</button>`).join('')}
      </div>

      <div class="sd-tab-panel active" data-panel="concept">
        ${sections.map(sectionCard).join('')}
        ${widgetId ? `
          <section class="sd-section sd-widget-section">
            <div class="sd-widget-head">
              <span class="sd-widget-badge">▶ Interactive</span>
              <div>
                <h3 class="sd-section-title sd-widget-title">${esc(widgetMeta.title)}</h3>
                ${widgetMeta.hint ? `<p class="sd-widget-hint">${esc(widgetMeta.hint)}</p>` : ''}
              </div>
            </div>
            <div class="sd-widget-mount" id="sd-con-widget"><div class="sd-widget-loading">Loading interactive…</div></div>
          </section>` : ''}
      </div>

      ${qa.length ? `<div class="sd-tab-panel" data-panel="qa">${qaHtml(qa)}</div>` : ''}
      ${relItems.length ? `<div class="sd-tab-panel" data-panel="related">
        <p class="sd-rel-intro">Questions from the catalog that drill into this concept:</p>
        ${relatedHtml(relIds)}</div>` : ''}
    </div>`;

  // ── tabs ──────────────────────────────────────────────────────────────────
  const tabBtns = [...container.querySelectorAll('.sd-tab')];
  const panels = [...container.querySelectorAll('.sd-tab-panel')];
  function activate(id) {
    tabBtns.forEach(b => { const on = b.dataset.tab === id; b.classList.toggle('active', on); b.setAttribute('aria-selected', String(on)); });
    panels.forEach(p => p.classList.toggle('active', p.dataset.panel === id));
    const canvas = document.getElementById('module-canvas');
    if (canvas) canvas.scrollTo(0, 0);
  }
  tabBtns.forEach(b => b.addEventListener('click', () => activate(b.dataset.tab)));

  // ── Q&A accordion ─────────────────────────────────────────────────────────
  container.querySelectorAll('.iq-item').forEach(item => {
    const q = item.querySelector('.iq-question');
    const a = item.querySelector('.iq-answer');
    q.addEventListener('click', () => {
      const open = item.classList.toggle('open');
      q.setAttribute('aria-expanded', String(open));
      a.style.maxHeight = open ? a.scrollHeight + 'px' : '0';
    });
  });

  // ── widget ────────────────────────────────────────────────────────────────
  let widgetCleanup = null, widgetCancelled = false;
  if (widgetId) {
    const mountEl = container.querySelector('#sd-con-widget');
    WIDGETS[widgetId]().then(mod => {
      if (widgetCancelled || !mountEl) return;
      const fn = mod.mount || (mod.default && mod.default.mount) || mod.default;
      if (typeof fn !== 'function') throw new Error('widget has no mount()');
      mountEl.innerHTML = '';
      const c = fn(mountEl, { data });
      if (typeof c === 'function') widgetCleanup = c;
    }).catch(err => {
      if (mountEl) mountEl.innerHTML = `<div class="sd-widget-error">Interactive failed to load: ${esc(err.message)}</div>`;
    });
  }

  return function cleanup() {
    widgetCancelled = true;
    if (widgetCleanup) { try { widgetCleanup(); } catch {} widgetCleanup = null; }
  };
}
