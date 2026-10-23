export function createModuleShell({ tag, title, subtitle, tabs }) {
  return `
    <div class="module-shell">
      <div class="module-hero">
        <div class="module-badge">${tag}</div>
        <h2 class="module-title" tabindex="-1">${title}</h2>
        <p class="module-subtitle">${subtitle}</p>
      </div>
      <div class="tab-bar" role="tablist" aria-label="${title} — sections">
        ${tabs.map((t, i) => `<button class="tab-btn${i === 0 ? ' active' : ''}" role="tab" id="tabbtn-${t.id}" aria-controls="tab-${t.id}" aria-selected="${i === 0 ? 'true' : 'false'}" tabindex="${i === 0 ? '0' : '-1'}" data-tab="${t.id}">${t.label}</button>`).join('')}
      </div>
      ${tabs.map((t, i) => `<div class="tab-content${i === 0 ? ' active' : ''}" id="tab-${t.id}" role="tabpanel" aria-labelledby="tabbtn-${t.id}" tabindex="0"></div>`).join('')}
    </div>
  `;
}

// Unique-per-call prefix so accordion ids never collide if a page ever renders
// more than one IQ list.
let iqSeq = 0;

export function createIQSection(IQ) {
  const p = `iq${++iqSeq}`;
  return `
    <div class="iq-list">
      ${IQ.map((item, i) => `
        <div class="iq-item">
          <button class="iq-question" aria-expanded="false" aria-controls="${p}-a${i}" id="${p}-q${i}">
            <span class="iq-num">Q${i + 1}</span>
            <span>${item.q}</span>
            <span class="iq-chevron" aria-hidden="true">▾</span>
          </button>
          <div class="iq-answer" id="${p}-a${i}" role="region" aria-labelledby="${p}-q${i}">
            <div class="iq-answer-body">${item.a}</div>
            ${item.tip ? `<div class="iq-tip">💡 ${item.tip}</div>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

export function initTabs(container) {
  const btns = [...container.querySelectorAll('.tab-btn')];
  const contents = [...container.querySelectorAll('.tab-content')];
  if (!btns.length) return;

  function activate(btn, focus) {
    btns.forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
      b.tabIndex = -1;
    });
    contents.forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    btn.tabIndex = 0;
    const target = container.querySelector(`#tab-${btn.dataset.tab}`);
    if (target) target.classList.add('active');
    if (focus) btn.focus();
  }

  btns.forEach((btn, idx) => {
    btn.addEventListener('click', () => activate(btn));
    // Arrow/Home/End keyboard navigation per the ARIA tablist pattern.
    btn.addEventListener('keydown', e => {
      let ni = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') ni = (idx + 1) % btns.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ni = (idx - 1 + btns.length) % btns.length;
      else if (e.key === 'Home') ni = 0;
      else if (e.key === 'End') ni = btns.length - 1;
      if (ni !== null) { e.preventDefault(); activate(btns[ni], true); }
    });
  });
}

// ── Code blocks: copy button + light SQL/Jinja highlighting ────────────────
// Runs once per .code-block (guarded by data-enhanced). Blocks that already
// carry manual highlight spans keep their markup — we only add the copy button.
const SQL_KW = /\b(select|from|where|group by|order by|having|join|left join|right join|inner join|full join|cross join|on|as|with|union all|union|distinct|case|when|then|else|end|and|or|not|in|is|null|between|like|limit|over|partition by|create|replace|table|view|materialized|insert|into|values|update|set|delete|coalesce|cast|count|sum|avg|min|max|row_number|rank|dense_rank|lag|lead|desc|asc)\b/gi;

function highlightCode(raw, lang) {
  // Escape first so code text can never inject markup.
  let s = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const stash = [];
  const keep = (cls, txt) => { stash.push(`<span class="${cls}">${txt}</span>`); return `\x00${stash.length - 1}\x00`; };

  // Comments, then strings, then Jinja, then keywords, numbers.
  // Comment syntax is language-aware:
  //   yaml  → only `#`
  //   bash  → `#`, or `--` ONLY when followed by whitespace (a `-- note`), so a
  //           shell flag like `--select`/`--full-refresh` is never dimmed, while
  //           inline SQL annotations in a console block still read as comments.
  //   sql / jinja / text / default → `--` or `#`
  let cmtRe;
  if (lang === 'yaml') cmtRe = /#[^\n]*/g;
  else if (lang === 'bash') cmtRe = /#[^\n]*|--(?=\s)[^\n]*/g;
  else cmtRe = /(--|#)[^\n]*/g;
  s = s.replace(cmtRe, m => keep('cmt', m));
  s = s.replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g, m => keep('str', m));
  s = s.replace(/\{\{[^]*?\}\}|\{%[^]*?%\}/g, m => keep('fn', m));
  // SQL keyword coloring only for SQL/Jinja. For yaml/bash/text it would mis-tint
  // ordinary words (e.g. yaml `values:`, `table:`), so we keep just the
  // always-correct comment/string/Jinja/number passes for those.
  if (lang === 'sql' || lang === 'jinja') s = s.replace(SQL_KW, m => keep('kw', m));
  // Number pass must not match the digits inside existing \x00<index>\x00
  // placeholders, or it re-stashes them and corrupts the restore below.
  s = s.replace(/(?<!\x00)\b\d+\.?\d*\b(?!\x00)/g, m => keep('num', m));

  // Restore iteratively: a stashed span (e.g. a Jinja block) can itself contain
  // placeholders for tokens nested inside it (strings/numbers), so one pass is
  // not enough. Loop until no placeholders remain.
  let prev;
  do { prev = s; s = s.replace(/\x00(\d+)\x00/g, (_, i) => stash[Number(i)]); }
  while (s !== prev);
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
      block.innerHTML = highlightCode(codeText, lang);
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
      q.setAttribute('aria-expanded', String(isOpen));
      a.style.maxHeight = isOpen ? a.scrollHeight + 'px' : '0';
    });
  });
}
