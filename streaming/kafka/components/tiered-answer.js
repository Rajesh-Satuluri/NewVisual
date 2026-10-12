// Tiered answer — one question, the same answer at Weak / Good / Senior depth,
// switchable with tabs, plus a "why the senior answer wins" note. Used by the
// Answers page. createTieredAnswer(item) -> HTML; initTieredAnswer(root) wires
// the tabs and records a view. Content is trusted in-repo HTML.
import { record } from '../data/progress-store.js';

const TONE = { Weak: 'weak', Good: 'good', Senior: 'senior' };

export function createTieredAnswer(item) {
  return `
    <div class="ta" data-ta="${item.id}">
      <div class="ta-question">${item.question}</div>
      <div class="ta-tabs" role="tablist">
        ${item.tiers.map((t, i) => `
          <button class="ta-tab tone-${TONE[t.label] || ''} ${i === 0 ? 'active' : ''}" role="tab"
                  data-i="${i}" aria-selected="${i === 0}">${t.label}</button>`).join('')}
      </div>
      <div class="ta-panels">
        ${item.tiers.map((t, i) => `
          <div class="ta-panel tone-${TONE[t.label] || ''}" data-i="${i}" ${i === 0 ? '' : 'hidden'}>${t.body}</div>`).join('')}
      </div>
      <div class="ta-why"><span class="ta-why-head">Why the Senior answer wins</span> ${item.whySenior}</div>
    </div>`;
}

export function initTieredAnswer(root) {
  root.querySelectorAll('.ta[data-ta]').forEach(card => {
    const id = card.dataset.ta;
    const tabs = [...card.querySelectorAll('.ta-tab')];
    const panels = [...card.querySelectorAll('.ta-panel')];
    let viewed = false;

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const i = tab.dataset.i;
        tabs.forEach(t => { const on = t === tab; t.classList.toggle('active', on); t.setAttribute('aria-selected', String(on)); });
        panels.forEach(p => { p.hidden = p.dataset.i !== i; });
        if (!viewed) { viewed = true; record('tiered', id, { viewed: true }); }
      });
    });
  });
}
