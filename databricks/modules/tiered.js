// Tiered Answers page — one question answered at Weak / Good / Senior depth,
// plus why the senior answer wins. Renders the TIERED bank with keyword search.
import { TIERED } from '../data/tiered.js';
import { injectStyles, wireCards } from './scenario-shell.js';

const CLS = { Weak: 'tier-weak', Good: 'tier-good', Senior: 'tier-senior' };

export function mount(container) {
  injectStyles();
  const state = { query: '' };

  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">📶 · Scenarios · Tiered Answers</div>
        <h1 class="module-title">One Question, Three Depths</h1>
        <p class="module-subtitle">The same Databricks question answered as a junior would (Weak), as a solid mid-level would (Good), and as it actually impresses (Senior) — with a note on exactly why the senior framing wins.</p>
      </div>
      <div class="scn-controls">
        <input class="scn-search" type="search" placeholder="🔍 Search questions…" aria-label="Search questions" />
      </div>
      <div id="scn-results"></div>
    </div>`;

  const resultsEl = container.querySelector('#scn-results');
  const searchEl = container.querySelector('.scn-search');

  function apply() {
    const q = state.query.toLowerCase();
    const rows = TIERED.filter(t =>
      !q || (t.question + ' ' + t.topic + ' ' + t.tiers.map(x => x.body).join(' ')).toLowerCase().includes(q));

    if (!rows.length) { resultsEl.innerHTML = `<div class="scn-empty">No questions match your search.</div>`; return; }

    resultsEl.innerHTML = `
      <div class="scn-count">${rows.length} question${rows.length>1?'s':''}</div>
      ${rows.map(t => `
        <div class="scn-card">
          <div class="scn-head">
            <span class="scn-ico">📶</span>
            <span class="scn-htext">
              <span class="scn-title">${t.question}</span>
              <span class="scn-meta"><span class="scn-tag">${t.topic}</span><span class="scn-tag">#${t.moduleId}</span></span>
            </span>
            <span class="scn-chev">▼</span>
          </div>
          <div class="scn-body">
            ${t.tiers.map(tier => `
              <div class="tier ${CLS[tier.label]}">
                <div class="tier-h">${tier.label}</div>
                <div class="tier-body">${tier.body}</div>
              </div>`).join('')}
            <div class="scn-note"><b>🏆 Why the senior answer wins:</b> ${t.whySenior}</div>
          </div>
        </div>`).join('')}`;
    wireCards(resultsEl);
  }

  searchEl.addEventListener('input', () => { state.query = searchEl.value; apply(); });
  apply();
  return () => {};
}
