// ── Decision drills page ("Choose the Approach") ─────────────────────────────────
// Pick an option, then every option reveals its verdict + why. mount(container) → cleanup

import { reg } from '../content/registry.js';
import { esc, fmt } from './render-helpers.js';

const VERDICT = {
  best: { label: 'Best choice', cls: 'good', icon: '✅' },
  ok:   { label: 'Defensible', cls: 'warn', icon: '🤔' },
  bad:  { label: 'Weak choice', cls: 'bad', icon: '❌' },
};

export function mount(container) {
  const { DECISIONS, CONCEPTS, CONCEPT_PREFIX } = reg;
  const conceptTitle = id => (CONCEPTS.find(c => c.id === id) || {}).title || id;

  container.innerHTML = `
    <div class="module-page sd-ref-page">
      <div class="module-hero">
        <div class="module-tag">🧭 · Practice</div>
        <h1 class="module-title">Choose the approach</h1>
        <p class="sd-tldr"><span class="sd-tldr-tag">${DECISIONS.length} drills</span> Real trade-off calls. Pick an option, then see why each one wins or loses — the way a strong candidate reasons out loud.</p>
      </div>
      <div class="sd-dec-list">
        ${DECISIONS.map((d, i) => drill(d, i)).join('')}
      </div>
    </div>`;

  function drill(d, i) {
    const see = d.see ? `<a class="sd-dec-see" href="#${CONCEPT_PREFIX}${d.see}">Deep dive: ${esc(conceptTitle(d.see))} →</a>` : '';
    return `<section class="sd-dec-card" data-drill="${i}">
      <div class="sd-dec-scenario">
        <span class="sd-dec-n">${i + 1}</span>
        <div>
          <h2 class="sd-dec-title">${esc(d.title)}</h2>
          <p class="sd-dec-text">${fmt(d.scenario)}</p>
        </div>
      </div>
      <div class="sd-dec-options">
        ${d.options.map((o, j) => `
          <button class="sd-dec-opt" data-opt="${j}" data-verdict="${o.verdict}">
            <span class="sd-dec-opt-letter">${String.fromCharCode(65 + j)}</span>
            <span class="sd-dec-opt-label">${fmt(o.label)}</span>
            <span class="sd-dec-opt-verdict"></span>
          </button>
          <div class="sd-dec-why" data-why="${j}">${fmt(o.why)}</div>`).join('')}
      </div>
      <div class="sd-dec-reveal" data-reveal>
        <div class="sd-dec-takeaway"><span class="sd-dec-takeaway-tag">Takeaway</span> ${fmt(d.takeaway)}</div>
        ${see}
      </div>
    </section>`;
  }

  container.querySelectorAll('.sd-dec-card').forEach(card => {
    const opts = [...card.querySelectorAll('.sd-dec-opt')];
    opts.forEach(opt => opt.addEventListener('click', () => {
      if (card.classList.contains('answered')) return;
      card.classList.add('answered');
      const picked = opt.dataset.opt;
      opts.forEach(o => {
        const v = VERDICT[o.dataset.verdict];
        o.classList.add('revealed', `v-${v.cls}`);
        if (o.dataset.opt === picked) o.classList.add('picked');
        o.querySelector('.sd-dec-opt-verdict').textContent = `${v.icon} ${v.label}`;
        card.querySelector(`.sd-dec-why[data-why="${o.dataset.opt}"]`).classList.add('show');
      });
      card.querySelector('[data-reveal]').classList.add('show');
    }));
  });

  return () => {};
}
