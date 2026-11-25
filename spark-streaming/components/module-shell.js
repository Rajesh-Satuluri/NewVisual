import { enhanceInterviewEdits } from './interview-edits.js';

// Optional `definition` card: { formal, easy } — shows a "what this means" card
// between the hero and the tabs so the plain-language definition is always visible
// regardless of the active tab. Omit on labs/utility pages.
function createDefinitionCard(definition) {
  if (!definition || !definition.formal) return '';
  const { formal, easy } = definition;
  return `
    <div class="module-definition" style="background:var(--bg-card);border:1px solid var(--border);border-left:3px solid var(--cyan,#06B6D4);border-radius:12px;padding:16px 20px;margin-bottom:22px">
      <div style="font-size:10px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--cyan,#06B6D4);margin-bottom:8px">📘 Definition</div>
      <div style="font-size:13.5px;line-height:1.7;color:var(--text-primary)">${formal}</div>
      ${easy ? `
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);font-size:12.5px;line-height:1.7;color:var(--text-secondary)">
        <span style="display:inline-block;font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--green,#10B981);margin-right:8px">In plain terms</span>${easy}
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
      <div class="module-tabs" role="tablist" aria-label="${title} sections">
        ${tabs.map((t, i) => `
          <button class="tab-btn ${i === 0 ? 'active' : ''}" role="tab"
                  id="tabbtn-${t.id}" data-tab="${t.id}"
                  aria-selected="${i === 0 ? 'true' : 'false'}"
                  aria-controls="tab-${t.id}" tabindex="${i === 0 ? '0' : '-1'}">${t.label}</button>
        `).join('')}
      </div>
      ${tabs.map((t, i) => `
        <div class="tab-content ${i === 0 ? 'active' : ''}" id="tab-${t.id}"
             role="tabpanel" aria-labelledby="tabbtn-${t.id}" tabindex="0" ${i === 0 ? '' : 'hidden'}>
          ${t.content}
        </div>
      `).join('')}
    </div>
  `;
}

export function initTabs(container) {
  const strips = container.querySelectorAll('.module-tabs[role="tablist"], .module-tabs');
  strips.forEach(strip => {
    const btns = [...strip.querySelectorAll('.tab-btn')];
    if (!btns.length) return;

    const activate = (btn, focus = true) => {
      const tab = btn.dataset.tab;
      btns.forEach(b => {
        const on = b === btn;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', String(on));
        b.tabIndex = on ? 0 : -1;
      });
      container.querySelectorAll('.tab-content').forEach(c => {
        const on = c.id === `tab-${tab}`;
        c.classList.toggle('active', on);
        if (c.hasAttribute('role')) c.hidden = !on;
      });
      if (focus) btn.focus();
    };

    btns.forEach((btn, i) => {
      btn.addEventListener('click', () => activate(btn, false));
      btn.addEventListener('keydown', e => {
        let target = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') target = btns[(i + 1) % btns.length];
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') target = btns[(i - 1 + btns.length) % btns.length];
        else if (e.key === 'Home') target = btns[0];
        else if (e.key === 'End') target = btns[btns.length - 1];
        if (target) { e.preventDefault(); activate(target); }
      });
    });
  });
}

export function createIQSection(questions) {
  return `
    <div class="section-header">
      <div class="section-title">Interview Questions</div>
      <div class="section-desc">Senior Data Engineering level (4–8 years experience)</div>
    </div>
    <div class="iq-list">
      ${questions.map((q, i) => `
        <div class="iq-item" data-idx="${i}">
          <div class="iq-question" role="button" tabindex="0" aria-expanded="false">
            <span class="q-num">Q${String(i+1).padStart(2,'0')}</span>
            <span class="q-text" style="flex:1">${q.q}</span>
            <span class="q-chevron">▼</span>
          </div>
          <div class="iq-answer">
            <div class="iq-answer-body">
              ${q.a}
              ${q.tip ? `<div class="tip">💡 <strong>Interview tip:</strong> ${q.tip}</div>` : ''}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

export function initIQ(container) {
  // Make each module's Interview Q&A editable in place (synced via spark:iedit),
  // mirroring the Study Hub. Keyed per-route under a distinct "mod:" namespace
  // so module-tab edits never collide with the Study-Hub bank's own keys.
  const mod = (location.hash || '').replace(/^#/, '').split(/[?&/]/)[0] || 'mod';
  container.querySelectorAll('.iq-item[data-idx]').forEach((item) => {
    if (!item.dataset.iqkey) item.dataset.iqkey = `mod:${mod}#${item.dataset.idx}`;
  });
  try { enhanceInterviewEdits(container); } catch (_) {}

  container.querySelectorAll('.iq-question').forEach(q => {
    const toggle = () => {
      const item = q.closest('.iq-item');
      const wasOpen = item.classList.contains('open');
      container.querySelectorAll('.iq-item').forEach(i => {
        i.classList.remove('open');
        i.querySelector('.iq-question')?.setAttribute('aria-expanded', 'false');
      });
      if (!wasOpen) { item.classList.add('open'); q.setAttribute('aria-expanded', 'true'); }
    };
    q.addEventListener('click', toggle);
    q.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });
}
