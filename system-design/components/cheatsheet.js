// ── Cheat sheet page ──────────────────────────────────────────────────────────
// The numbers, formulas and one-liners worth memorizing. mount(container) → cleanup

import { reg } from '../content/registry.js';
import { esc, fmt, tableHtml, bulletsHtml, rulesHtml, statsHtml, stepsHtml } from './render-helpers.js';

export function mount(container) {
  const { CHEATSHEET } = reg;
  const section = s => {
    const parts = [];
    if (s.note) parts.push(`<p class="sd-cs-note">${fmt(s.note)}</p>`);
    if (s.stats && s.stats.length) parts.push(statsHtml(s.stats));
    if (s.steps && s.steps.length) parts.push(stepsHtml(s.steps));
    if (s.table) parts.push(tableHtml(s.table));
    if (s.bullets && s.bullets.length) parts.push(bulletsHtml(s.bullets));
    if (s.rules && s.rules.length) parts.push(rulesHtml(s.rules));
    return `<section class="sd-cs-card">
      <h2 class="sd-cs-title">${s.icon ? `<span class="sd-cs-icon">${s.icon}</span>` : ''}${esc(s.title)}</h2>
      ${parts.join('')}
    </section>`;
  };

  container.innerHTML = `
    <div class="module-page sd-ref-page">
      <div class="module-hero">
        <div class="module-tag">📋 · Reference</div>
        <h1 class="module-title">Cheat sheet</h1>
        <p class="sd-tldr"><span class="sd-tldr-tag">Memorize these</span> The numbers, pickers, and one-liners worth having at your fingertips before an interview.</p>
      </div>
      <div class="sd-cs-grid">${CHEATSHEET.map(section).join('')}</div>
    </div>`;

  return () => {};
}
