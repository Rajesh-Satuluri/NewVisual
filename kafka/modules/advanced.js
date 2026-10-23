// Advanced Topics — senior/staff-level theory that extends the core modules.
// Each topic is a card with full explanation and a reveal-able interview answer.
// Registered as the #advanced PAGE.
import { ADVANCED_TOPICS } from '../data/advanced-topics.js';

export function mount(container) {
  const card = t => `
    <section class="adv-card" id="adv-${t.id}">
      <header class="adv-head">
        <span class="adv-icon">${t.icon}</span>
        <div class="adv-headtext">
          <h3 class="adv-title">${t.title}</h3>
          <span class="adv-tag">${t.tag}</span>
        </div>
        <a class="adv-relates" href="#${t.relatesTo}" title="Open the module this extends">extends ${t.relatesTo} ↗</a>
      </header>
      <div class="adv-body">${t.body}</div>
      <div class="adv-iq">
        <button class="adv-iq-btn quiz-btn primary" aria-expanded="false">Show the interview answer</button>
        <div class="adv-iq-body" hidden><span class="adv-iq-tag">🎯 Interview answer</span> ${t.interview}</div>
      </div>
    </section>`;

  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">🧠 · Reference · Deep Dives</div>
        <h1 class="module-title">Advanced Topics</h1>
        <p class="module-subtitle">The senior- and staff-level theory that rounds out the core modules — the topics interviewers reach for once the basics are solid. Each explains the mechanism and gives the answer to say out loud.</p>
      </div>
      <nav class="adv-jump" aria-label="Jump to topic">
        ${ADVANCED_TOPICS.map(t => `<a href="#adv-${t.id}" class="adv-chip">${t.icon} ${t.title}</a>`).join('')}
      </nav>
      <div class="adv-list">
        ${ADVANCED_TOPICS.map(card).join('')}
      </div>
    </div>`;

  // Reveal interview answers.
  container.querySelectorAll('.adv-iq-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const body = btn.nextElementSibling;
      const show = body.hidden;
      body.hidden = !show;
      btn.setAttribute('aria-expanded', String(show));
      btn.textContent = show ? 'Hide the interview answer' : 'Show the interview answer';
    });
  });

  // Smooth in-page jump without touching the hash router.
  container.querySelectorAll('.adv-chip').forEach(chip => {
    chip.addEventListener('click', e => {
      const id = chip.getAttribute('href').slice(1);
      const el = container.querySelector('#' + CSS.escape(id));
      if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });

  return () => {};
}
