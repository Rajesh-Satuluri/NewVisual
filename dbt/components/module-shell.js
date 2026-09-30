export function createModuleShell({ tag, title, subtitle, tabs }) {
  return `
    <div class="module-shell">
      <div class="module-hero">
        <div class="module-badge">${tag}</div>
        <h2 class="module-title">${title}</h2>
        <p class="module-subtitle">${subtitle}</p>
      </div>
      <div class="tab-bar">
        ${tabs.map((t, i) => `<button class="tab-btn${i === 0 ? ' active' : ''}" data-tab="${t.id}">${t.label}</button>`).join('')}
      </div>
      ${tabs.map((t, i) => `<div class="tab-content${i === 0 ? ' active' : ''}" id="tab-${t.id}"></div>`).join('')}
    </div>
  `;
}

export function createIQSection(IQ) {
  return `
    <div class="iq-list">
      ${IQ.map((item, i) => `
        <div class="iq-item">
          <button class="iq-question">
            <span class="iq-num">Q${i + 1}</span>
            <span>${item.q}</span>
            <span class="iq-chevron">▾</span>
          </button>
          <div class="iq-answer">
            <div class="iq-answer-body">${item.a}</div>
            ${item.tip ? `<div class="iq-tip">💡 ${item.tip}</div>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

export function initTabs(container) {
  const btns = container.querySelectorAll('.tab-btn');
  const contents = container.querySelectorAll('.tab-content');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const target = container.querySelector(`#tab-${btn.dataset.tab}`);
      if (target) target.classList.add('active');
    });
  });
}

export function initIQ(container) {
  container.querySelectorAll('.iq-item').forEach(item => {
    const q = item.querySelector('.iq-question');
    const a = item.querySelector('.iq-answer');
    if (!q || !a) return;
    q.addEventListener('click', () => {
      const isOpen = item.classList.toggle('open');
      a.style.maxHeight = isOpen ? a.scrollHeight + 'px' : '0';
    });
  });
}
