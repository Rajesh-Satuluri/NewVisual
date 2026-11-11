// ── Tiered answers page ("Level Up Your Answer") ──────────────────────────────────
// The same question answered Weak → Good → Senior, revealed one tier at a time.
// mount(container) → cleanup

import { reg } from '../content/registry.js';
import { esc, fmt } from './render-helpers.js';

const TIER_CLASS = { Weak: 'weak', Good: 'good', Senior: 'senior' };

export function mount(container) {
  const { TIERED, CONCEPTS, CONCEPT_PREFIX } = reg;
  const conceptTitle = id => (CONCEPTS.find(c => c.id === id) || {}).title || id;

  container.innerHTML = `
    <div class="module-page sd-ref-page">
      <div class="module-hero">
        <div class="module-tag">🎯 · Practice</div>
        <h1 class="module-title">Level up your answer</h1>
        <p class="sd-tldr"><span class="sd-tldr-tag">${TIERED.length} questions</span> The same question answered three ways — Weak, Good, Senior — with a note on exactly what moves each answer up a level.</p>
      </div>
      <div class="sd-tier-list">
        ${TIERED.map((t, i) => item(t, i)).join('')}
      </div>
    </div>`;

  function item(t, i) {
    const see = t.see ? `<a class="sd-dec-see" href="#${CONCEPT_PREFIX}${t.see}">Deep dive: ${esc(conceptTitle(t.see))} →</a>` : '';
    return `<section class="sd-tier-card" data-item="${i}">
      <div class="sd-tier-q"><span class="sd-dec-n">${i + 1}</span><h2 class="sd-tier-qtext">${fmt(t.question)}</h2></div>
      <div class="sd-tier-tiers">
        ${t.tiers.map((tier, j) => `
          <div class="sd-tier sd-tier-${TIER_CLASS[tier.level] || 'good'}${j === 0 ? ' open' : ''}" data-tier="${j}">
            <button class="sd-tier-head">
              <span class="sd-tier-badge">${esc(tier.level)}</span>
              <span class="sd-tier-chevron">▾</span>
            </button>
            <div class="sd-tier-body">
              <p class="sd-tier-answer">${fmt(tier.answer)}</p>
              <div class="sd-tier-note"><span class="sd-tier-note-tag">Why</span> ${fmt(tier.note)}</div>
            </div>
          </div>`).join('')}
      </div>
      <div class="sd-dec-takeaway"><span class="sd-dec-takeaway-tag">Takeaway</span> ${fmt(t.takeaway)}</div>
      ${see}
    </section>`;
  }

  container.querySelectorAll('.sd-tier').forEach(tier => {
    const head = tier.querySelector('.sd-tier-head');
    const body = tier.querySelector('.sd-tier-body');
    const sync = () => { body.style.maxHeight = tier.classList.contains('open') ? body.scrollHeight + 'px' : '0'; };
    sync();
    head.addEventListener('click', () => { tier.classList.toggle('open'); sync(); });
  });

  return () => {};
}
