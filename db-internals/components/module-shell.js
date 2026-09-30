/**
 * module-shell.js — shared layout helpers for DB Internals modules.
 *
 * Two calling conventions are supported (both live in the codebase):
 *
 *  OLD (string) API — m1–m47:
 *    container.innerHTML = createModuleShell({ tag, title, subtitle, tabs:[{id,label,content}] });
 *    initTabs(container);
 *    container.querySelector('#tab-iq').innerHTML = createIQSection(questions);
 *    initIQ(container);
 *
 *  NEW (DOM) API — m48+:
 *    const { tabs, body } = createModuleShell(container, { tag, title, subtitle, tabs:[{id,label}] });
 *    initTabs(tabs, body, { anim: panel => {...}, iq: panel => {...} });
 *    const iq = createIQSection();  panel.appendChild(iq.el);  initIQ(iq, [{q,a,tip}]);
 */

/* ── createModuleShell ──────────────────────────────────────────────────────── */
export function createModuleShell(a, b) {
  // NEW API: createModuleShell(container, opts) → { tabs, body }
  if (b !== undefined) {
    const container = a;
    const { tag, title, subtitle, tabs } = b;

    const page = document.createElement('div');
    page.className = 'module-page';
    page.innerHTML = `
      <div class="module-hero">
        <div class="module-tag">${tag || ''}</div>
        <h1 class="module-title">${title || ''}</h1>
        <p class="module-subtitle">${subtitle || ''}</p>
      </div>
      <div class="module-tabs">
        ${tabs.map((t, i) => `
          <button class="tab-btn ${i === 0 ? 'active' : ''}" data-tab="${t.id}">${t.label}</button>
        `).join('')}
      </div>
      <div class="module-body">
        ${tabs.map((t, i) => `
          <div class="tab-content ${i === 0 ? 'active' : ''}" id="tab-${t.id}"></div>
        `).join('')}
      </div>
    `;

    container.innerHTML = '';
    container.appendChild(page);

    const tabButtons = Array.from(page.querySelectorAll('.tab-btn'));
    const body = page.querySelector('.module-body');
    return { tabs: tabButtons, body, page };
  }

  // OLD API: createModuleShell({...}) → HTML string
  const { tag, title, subtitle, tabs } = a;
  return `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">${tag}</div>
        <h1 class="module-title">${title}</h1>
        <p class="module-subtitle">${subtitle}</p>
      </div>
      <div class="module-tabs">
        ${tabs.map((t, i) => `
          <button class="tab-btn ${i === 0 ? 'active' : ''}" data-tab="${t.id}">${t.label}</button>
        `).join('')}
      </div>
      ${tabs.map((t, i) => `
        <div class="tab-content ${i === 0 ? 'active' : ''}" id="tab-${t.id}">
          ${t.content || ''}
        </div>
      `).join('')}
    </div>
  `;
}

/* ── initTabs ───────────────────────────────────────────────────────────────── */
export function initTabs(a, body, handlers) {
  // NEW API: initTabs(tabButtons, body, handlers)
  if (body !== undefined) {
    const tabButtons = a;
    const cleanups = [];

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        body.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const panel = body.querySelector(`#tab-${btn.dataset.tab}`);
        if (panel) panel.classList.add('active');
      });
    });

    if (handlers) {
      Object.entries(handlers).forEach(([id, fn]) => {
        const panel = body.querySelector(`#tab-${id}`);
        if (panel && typeof fn === 'function') {
          const cleanup = fn(panel);
          if (typeof cleanup === 'function') cleanups.push(cleanup);
        }
      });
    }

    return () => cleanups.forEach(fn => fn());
  }

  // OLD API: initTabs(container)
  const container = a;
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const content = container.querySelector(`#tab-${tab}`);
      if (content) content.classList.add('active');
    });
  });
}

/* ── IQ section markup ──────────────────────────────────────────────────────── */
function iqListHTML(questions) {
  return `
    <div class="section-header" style="padding:32px 40px 0">
      <div class="section-title">Interview Questions</div>
      <div class="section-desc">Senior Data Engineering level — Amazon Prime Day context</div>
    </div>
    <div class="iq-list">
      ${questions.map((q, i) => `
        <div class="iq-item">
          <div class="iq-question">
            <span class="q-num">Q${String(i + 1).padStart(2, '0')}</span>
            <span style="flex:1">${q.q}</span>
            <span class="q-chevron">▼</span>
          </div>
          <div class="iq-answer">
            ${q.a}
            ${q.tip ? `<div class="tip">💡 <strong>Interview tip:</strong> ${q.tip}</div>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function wireIQ(root) {
  root.querySelectorAll('.iq-question').forEach(q => {
    q.addEventListener('click', () => {
      const item = q.closest('.iq-item');
      const wasOpen = item.classList.contains('open');
      root.querySelectorAll('.iq-item').forEach(i => i.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });
}

/* ── createIQSection ────────────────────────────────────────────────────────── */
export function createIQSection(questions) {
  // NEW API: createIQSection() → { el } (populated later by initIQ(iq, items))
  if (questions === undefined) {
    const el = document.createElement('div');
    el.className = 'iq-section';
    return { el };
  }
  // OLD API: createIQSection(questions) → HTML string
  return iqListHTML(questions);
}

/* ── initIQ ─────────────────────────────────────────────────────────────────── */
export function initIQ(a, items) {
  // NEW API: initIQ(iq, items) — iq is the { el } object from createIQSection()
  if (items !== undefined) {
    const iq = a;
    iq.el.innerHTML = iqListHTML(items);
    wireIQ(iq.el);
    return;
  }
  // OLD API: initIQ(container)
  wireIQ(a);
}

export const PRIME_SCHEMA = `
  <div style="padding:16px 40px 0;display:flex;flex-wrap:wrap;gap:6px;align-items:center">
    <span style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-right:4px">Schema:</span>
    ${['products','inventory','customers','orders','order_items','payments'].map(t =>
      `<span class="schema-pill"><span class="tbl">${t}</span></span>`
    ).join('')}
  </div>
`;
