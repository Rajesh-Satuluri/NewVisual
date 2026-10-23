export function createModuleShell({ tag, title, subtitle, tabs }) {
  return `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">${tag}</div>
        <h1 class="module-title">${title}</h1>
        <p class="module-subtitle">${subtitle}</p>
      </div>
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
          <div class="iq-answer" id="iqa-${i}">
            ${q.a}
            ${q.tip ? `<div class="tip">💡 <strong>Interview tip:</strong> ${q.tip}</div>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

export function initIQ(container) {
  const toggle = q => {
    const item = q.closest('.iq-item');
    const wasOpen = item.classList.contains('open');
    container.querySelectorAll('.iq-item').forEach(i => {
      i.classList.remove('open');
      i.querySelector('.iq-question')?.setAttribute('aria-expanded', 'false');
    });
    if (!wasOpen) { item.classList.add('open'); q.setAttribute('aria-expanded', 'true'); }
  };
  container.querySelectorAll('.iq-question').forEach(q => {
    q.addEventListener('click', () => toggle(q));
    q.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(q); }
    });
  });
}
