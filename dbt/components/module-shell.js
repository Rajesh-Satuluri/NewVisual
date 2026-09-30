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

// ── Code blocks: copy button + light SQL/Jinja highlighting ────────────────
// Runs once per .code-block (guarded by data-enhanced). Blocks that already
// carry manual highlight spans keep their markup — we only add the copy button.
const SQL_KW = /\b(select|from|where|group by|order by|having|join|left join|right join|inner join|full join|cross join|on|as|with|union all|union|distinct|case|when|then|else|end|and|or|not|in|is|null|between|like|limit|over|partition by|create|replace|table|view|materialized|insert|into|values|update|set|delete|coalesce|cast|count|sum|avg|min|max|row_number|rank|dense_rank|lag|lead|desc|asc)\b/gi;

function highlightCode(raw) {
  // Escape first so code text can never inject markup.
  let s = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const stash = [];
  const keep = (cls, txt) => { stash.push(`<span class="${cls}">${txt}</span>`); return `\x00${stash.length - 1}\x00`; };

  // Comments (-- … and # …), then strings, then Jinja, then keywords, numbers.
  s = s.replace(/(--|#)[^\n]*/g, m => keep('cmt', m));
  s = s.replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g, m => keep('str', m));
  s = s.replace(/\{\{[^]*?\}\}|\{%[^]*?%\}/g, m => keep('fn', m));
  s = s.replace(SQL_KW, m => keep('kw', m));
  s = s.replace(/\b\d+\.?\d*\b/g, m => keep('num', m));

  s = s.replace(/\x00(\d+)\x00/g, (_, i) => stash[Number(i)]);
  return s;
}

export function injectCodeEnhancements(container) {
  container.querySelectorAll('.code-block').forEach(block => {
    if (block.dataset.enhanced) return;
    block.dataset.enhanced = '1';

    // Capture the pristine code text before adding chrome.
    const codeText = block.textContent;

    // Highlight only plain-text blocks (skip ones with existing spans).
    const lang = block.dataset.lang;
    if (lang && !block.querySelector('span, button')) {
      block.innerHTML = highlightCode(codeText);
    }

    if (lang) {
      const tag = document.createElement('span');
      tag.className = 'code-lang';
      tag.textContent = lang;
      block.appendChild(tag);
    }

    const btn = document.createElement('button');
    btn.className = 'code-copy-btn';
    btn.type = 'button';
    btn.innerHTML = '📋 Copy';
    btn.addEventListener('click', async () => {
      const code = codeText;
      try {
        await navigator.clipboard.writeText(code);
      } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = code; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (_) {}
        ta.remove();
      }
      btn.classList.add('copied');
      btn.innerHTML = '✓ Copied';
      setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = '📋 Copy'; }, 1600);
    });
    block.appendChild(btn);
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
