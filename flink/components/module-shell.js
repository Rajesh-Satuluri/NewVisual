export function createModuleShell({ tag, title, subtitle, tabs }) {
  return `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">${tag}</div>
        <h1 class="module-title">${title}</h1>
        <p class="module-subtitle">${subtitle}</p>
      </div>
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
        <div class="iq-item">
          <div class="iq-question" role="button" tabindex="0" aria-expanded="false">
            <span class="q-num">Q${String(i+1).padStart(2,'0')}</span>
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

export function initIQ(container) {
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
