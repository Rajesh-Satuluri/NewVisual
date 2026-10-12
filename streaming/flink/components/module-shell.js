export function createModuleShell({ tag, title, subtitle, tabs }) {
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
          ${t.content}
        </div>
      `).join('')}
    </div>
  `;
}

export function initTabs(container) {
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

export function createIQSection(questions) {
  return `
    <div class="section-header">
      <div class="section-title">Interview Questions</div>
      <div class="section-desc">Senior Data Engineering level (4–8 years experience)</div>
    </div>
    <div class="iq-list">
      ${questions.map((q, i) => `
        <div class="iq-item">
          <div class="iq-question">
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
    q.addEventListener('click', () => {
      const item = q.closest('.iq-item');
      const wasOpen = item.classList.contains('open');
      container.querySelectorAll('.iq-item').forEach(i => i.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });
}
