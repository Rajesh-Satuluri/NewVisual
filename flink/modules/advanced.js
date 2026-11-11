// Advanced Topics — senior-level deep dives the core modules don't fully cover.
import { ADVANCED_TOPICS } from '../data/advanced-topics.js';
import { MODULES } from '../components/nav.js';

const titleOf = id => (MODULES.find(m => m.id === id) || {}).title || id;

export function mount(container) {
  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">🧬 Reference · Advanced</div>
        <h1 class="module-title">Advanced Topics</h1>
        <p class="module-subtitle">The deeper patterns a senior Flink engineer is expected to know cold — each with the angle an interviewer is really probing. Click to expand.</p>
      </div>
      <div class="tab-content active">
        <div class="adv-toc">
          ${ADVANCED_TOPICS.map(t => `<a class="adv-toc-item" href="#advanced-${t.id}" data-jump="${t.id}">${t.icon} ${t.title}</a>`).join('')}
        </div>
        <div class="adv-list">
          ${ADVANCED_TOPICS.map((t, i) => `
            <div class="adv-card ${i === 0 ? 'open' : ''}" id="adv-${t.id}" data-id="${t.id}">
              <button class="adv-head" aria-expanded="${i === 0}">
                <span class="adv-ic">${t.icon}</span>
                <span class="adv-head-text">
                  <span class="adv-title">${t.title}</span>
                  <span class="adv-summary">${t.summary}</span>
                </span>
                <span class="adv-chevron">▾</span>
              </button>
              <div class="adv-body">
                ${t.body}
                <div class="adv-angle">🎯 <strong>Interview angle:</strong> ${t.interviewAngle}</div>
                ${t.related && t.related.length ? `<div class="adv-related">Related: ${t.related.map(id => `<a href="#${id}">${titleOf(id)}</a>`).join(' · ')}</div>` : ''}
              </div>
            </div>`).join('')}
        </div>
      </div>
    </div>`;

  container.querySelectorAll('.adv-head').forEach(head => {
    head.addEventListener('click', () => {
      const card = head.closest('.adv-card');
      const open = card.classList.toggle('open');
      head.setAttribute('aria-expanded', String(open));
    });
  });
  container.querySelectorAll('.adv-toc-item').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const card = container.querySelector(`#adv-${a.dataset.jump}`);
      if (card) {
        card.classList.add('open');
        card.querySelector('.adv-head')?.setAttribute('aria-expanded', 'true');
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  return () => {};
}
