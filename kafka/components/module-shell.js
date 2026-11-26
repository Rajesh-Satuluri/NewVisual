// `definition` (optional): { formal, easy } — renders a "what this module means"
// card between the hero and the tabs so the plain-language definition is always
// visible no matter which tab is active. Omit it on utility/lab pages that aren't
// teaching a single named concept.
function createDefinitionCard(definition) {
  if (!definition || !definition.formal) return '';
  const { formal, easy } = definition;
  return `
    <div class="module-definition" style="background:#111827;border:1px solid #1E293B;border-left:3px solid #06B6D4;border-radius:12px;padding:16px 20px;margin-bottom:22px">
      <div style="font-size:10px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#06B6D4;margin-bottom:8px">📘 Definition</div>
      <div style="font-size:13.5px;line-height:1.7;color:#E2E8F0">${formal}</div>
      ${easy ? `
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid #1E293B;font-size:12.5px;line-height:1.7;color:#94A3B8">
        <span style="display:inline-block;font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#10B981;margin-right:8px">In plain terms</span>${easy}
      </div>` : ''}
    </div>`;
}

export function createModuleShell({ tag, title, subtitle, tabs, definition }) {
  return `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">${tag}</div>
        <h1 class="module-title">${title}</h1>
        <p class="module-subtitle">${subtitle}</p>
      </div>
      ${createDefinitionCard(definition)}
      <div class="module-tabs" role="tablist" aria-label="Module sections">
        ${tabs.map((t, i) => `
          <button class="tab-btn ${i === 0 ? 'active' : ''}" data-tab="${t.id}" role="tab"
            id="tabbtn-${t.id}" aria-controls="tab-${t.id}" aria-selected="${i === 0 ? 'true' : 'false'}"
            tabindex="${i === 0 ? '0' : '-1'}">${t.label}</button>
        `).join('')}
      </div>
      ${tabs.map((t, i) => `
        <div class="tab-content ${i === 0 ? 'active' : ''}" id="tab-${t.id}" role="tabpanel"
          aria-labelledby="tabbtn-${t.id}" tabindex="0" ${i === 0 ? '' : 'hidden'}>
          ${t.content || ''}
        </div>
      `).join('')}
    </div>
  `;
}

export function initTabs(container) {
  const groups = new Map();
  // Group tab buttons by their tablist so multiple tab sets on a page are independent.
  container.querySelectorAll('.module-tabs[role="tablist"]').forEach(list => {
    groups.set(list, [...list.querySelectorAll('.tab-btn')]);
  });
  // Fallback for any legacy markup without an explicit tablist.
  if (groups.size === 0) {
    const btns = [...container.querySelectorAll('.tab-btn')];
    if (btns.length) groups.set(container, btns);
  }

  const activate = (btns, btn, focus) => {
    btns.forEach(b => {
      const on = b === btn;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
      const panel = container.querySelector(`#tab-${b.dataset.tab}`);
      if (panel) { panel.classList.toggle('active', on); panel.hidden = !on; }
    });
    if (focus) btn.focus();
  };

  groups.forEach(btns => {
    btns.forEach((btn, i) => {
      btn.addEventListener('click', () => activate(btns, btn));
      btn.addEventListener('keydown', e => {
        let next = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = btns[(i + 1) % btns.length];
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = btns[(i - 1 + btns.length) % btns.length];
        else if (e.key === 'Home') next = btns[0];
        else if (e.key === 'End') next = btns[btns.length - 1];
        if (next) { e.preventDefault(); activate(btns, next, true); }
      });
    });
  });
}

import { renderMarkdown } from './md.js';

// An answer is HTML by default. Opt into Markdown rendering with `md: true`
// on the question object (used for answers authored or pasted as Markdown).
export function renderAnswer(q) {
  return q && q.md ? renderMarkdown(q.a) : (q ? q.a : '');
}

export function createIQSection(questions) {
  return `
    <div class="section-header">
      <div class="section-title">Interview Questions</div>
      <div class="section-desc">Senior Data Engineering level (4–8 years experience)</div>
    </div>
    <div class="iq-list">
      ${questions.map((q, i) => `
        <div class="iq-item">
          <div class="iq-question" role="button" tabindex="0" aria-expanded="false" aria-controls="iqa-${i}">
            <span class="q-num">Q${String(i+1).padStart(2,'0')}</span>
            <span style="flex:1">${q.q}</span>
            <span class="q-chevron" aria-hidden="true">▼</span>
          </div>
          <div class="iq-answer-wrap">
            <div class="iq-answer" id="iqa-${i}">
              ${renderAnswer(q)}
              ${q.tip ? `<div class="tip">💡 <strong>Interview tip:</strong> ${q.tip}</div>` : ''}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

export function initIQ(container) {
  // Multi-open accordion: each question toggles independently and opening one
  // never collapses another. The old single-open behaviour collapsed the open
  // item above the one just clicked, which yanked the clicked header upward (the
  // answer looked like it "opened upward") — worst at the top of the list, where
  // there is no scroll room to absorb the shift. Toggling in place means the
  // answer always expands straight down. Matches the Study Hub's behaviour.
  const toggle = q => {
    const item = q.closest('.iq-item');
    const nowOpen = item.classList.toggle('open');
    q.setAttribute('aria-expanded', nowOpen ? 'true' : 'false');
  };
  container.querySelectorAll('.iq-question').forEach(q => {
    q.addEventListener('click', () => toggle(q));
    q.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(q); }
    });
  });
}
