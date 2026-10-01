// Shared content primitive: the "Explain" schema card.
// Every new internals / production module describes a concept or a stage with
// the same contract so the tool reads as one system:
//   what · why · input · output · example · failure · interview
// Pass any subset; missing fields are skipped. `example` is rendered as a
// code block (picks up copy button + highlighting via injectCodeEnhancements).
//
// renderExplain(block)         -> HTML string for one card
// renderExplainList(blocks)    -> HTML string for several stacked cards

const ROWS = [
  { key: 'what',     label: 'What happens', cls: 'ex-what' },
  { key: 'why',      label: 'Why it matters', cls: 'ex-why' },
  { key: 'input',    label: 'Input',  cls: 'ex-io' },
  { key: 'output',   label: 'Output', cls: 'ex-io' },
  { key: 'failure',  label: 'Common failure', cls: 'ex-fail' },
];

export function renderExplain(block) {
  if (!block) return '';
  const rows = ROWS
    .filter(r => block[r.key])
    .map(r => `
      <div class="ex-row ${r.cls}">
        <div class="ex-row-label">${r.label}</div>
        <div class="ex-row-body">${block[r.key]}</div>
      </div>`).join('');

  const example = block.example
    ? `<div class="ex-example"><div class="ex-row-label">Example</div>
         <div class="code-block"${block.lang ? ` data-lang="${block.lang}"` : ''}>${escapeHtml(block.example)}</div>
       </div>`
    : '';

  const interview = block.interview
    ? `<div class="ex-interview"><span class="ex-iq-badge">Interview</span> ${block.interview}</div>`
    : '';

  const head = block.title
    ? `<div class="ex-head">${block.icon ? `<span class="ex-ic">${block.icon}</span>` : ''}
         <span class="ex-title">${block.title}</span>
         ${block.tag ? `<span class="ex-tag">${block.tag}</span>` : ''}</div>`
    : '';

  return `<div class="ex-card">${head}${rows}${example}${interview}</div>`;
}

export function renderExplainList(blocks) {
  return `<div class="ex-list">${(blocks || []).map(renderExplain).join('')}</div>`;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
