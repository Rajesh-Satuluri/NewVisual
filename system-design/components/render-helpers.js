// ── Shared render helpers ─────────────────────────────────────────────────────
// Small, dependency-free formatters reused by the reference/practice pages.

export function esc(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
export function fmt(s) {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}
export function paras(s) {
  return String(s).split(/\n\s*\n/).filter(Boolean)
    .map(p => `<p>${fmt(p.trim())}</p>`).join('');
}
export function tableHtml(t) {
  const head = (t.head || []).map(h => `<th>${fmt(h)}</th>`).join('');
  const rows = (t.rows || []).map(r =>
    `<tr>${r.map((c, i) => `<td${i === 0 ? ' class="sd-td-key"' : ''}>${fmt(c)}</td>`).join('')}</tr>`).join('');
  return `<div class="sd-table-wrap"><table class="sd-table">
    ${head ? `<thead><tr>${head}</tr></thead>` : ''}<tbody>${rows}</tbody></table></div>`;
}
export function bulletsHtml(items) {
  return `<ul class="sd-bullets">${items.map(b => `<li>${fmt(b)}</li>`).join('')}</ul>`;
}
export function rulesHtml(items) {
  return `<div class="sd-rules">${items.map(r => `<div class="sd-rule">${fmt(r)}</div>`).join('')}</div>`;
}
export function statsHtml(stats) {
  return `<div class="sd-stat-row">${stats.map(s => `
    <div class="sd-stat-tile sd-stat-${s.tone || 'accent'}">
      <span class="sd-stat-value">${fmt(s.value)}</span>
      <span class="sd-stat-label">${fmt(s.label)}</span>
    </div>`).join('')}</div>`;
}
export function stepsHtml(steps) {
  return `<ol class="sd-steps">${steps.map(s => {
    const o = typeof s === 'string' ? { title: s } : s;
    return `<li class="sd-step"><div class="sd-step-title">${fmt(o.title || '')}</div>${o.detail ? `<div class="sd-step-detail">${fmt(o.detail)}</div>` : ''}</li>`;
  }).join('')}</ol>`;
}
const CALLOUT_ICON = { note: '📌', tip: '💡', warn: '⚠️', good: '✅', bad: '❌', key: '🔑', info: 'ℹ️' };
export function calloutHtml(c) {
  const tone = c.tone || 'note';
  const icon = c.icon || CALLOUT_ICON[tone] || '📌';
  const label = c.label ? `<strong class="sd-callout-label">${fmt(c.label)}</strong> ` : '';
  return `<div class="sd-callout sd-callout-${tone}"><span class="sd-callout-icon" aria-hidden="true">${icon}</span><div class="sd-callout-body">${label}${fmt(c.body || c.text || '')}</div></div>`;
}
