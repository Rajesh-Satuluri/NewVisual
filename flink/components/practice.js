// ─────────────────────────────────────────────────────────────────────────
// Practice components: self-explain prompts, decision drills, tiered answers.
// Each renders from a per-module bank and records activity to the progress
// store so the dashboard can reflect it.
// ─────────────────────────────────────────────────────────────────────────
import { recordSelfExplain, recordDecision } from '../data/progress-store.js';

// ── Self-explain (Feynman active recall) ────────────────────────────────────
export function createSelfExplain(id, items) {
  if (!items || !items.length) return '';
  return `
    <section class="practice-section se-section" data-se="${id}">
      <div class="section-header">
        <div class="section-title">🧠 Self-explain</div>
        <div class="section-desc">Say it out loud first, then reveal the model answer and check yourself.</div>
      </div>
      ${items.map((it, i) => `
        <div class="se-card" data-i="${i}">
          <div class="se-prompt">${it.prompt}</div>
          <button class="btn btn-secondary se-reveal" type="button">Reveal model answer</button>
          <div class="se-model" hidden>
            ${it.keyPoints && it.keyPoints.length ? `
              <div class="se-points">
                <div class="se-points-label">Your explanation should mention:</div>
                <ul>${it.keyPoints.map(p => `<li>${p}</li>`).join('')}</ul>
              </div>` : ''}
            <div class="se-answer">${it.modelAnswer}</div>
          </div>
        </div>`).join('')}
    </section>`;
}

export function initSelfExplain(container) {
  container.querySelectorAll('.se-section').forEach(section => {
    const id = section.dataset.se;
    section.querySelectorAll('.se-card').forEach(card => {
      const btn = card.querySelector('.se-reveal');
      const model = card.querySelector('.se-model');
      btn?.addEventListener('click', () => {
        const show = model.hidden;
        model.hidden = !show;
        btn.textContent = show ? 'Hide model answer' : 'Reveal model answer';
        if (show) { try { recordSelfExplain(id, Number(card.dataset.i)); } catch (e) {} }
      });
    });
  });
}

// ── Decision drills (engineering judgment) ──────────────────────────────────
export function createDecisionDrill(id, items) {
  if (!items || !items.length) return '';
  return `
    <section class="practice-section dd-section" data-dd="${id}">
      <div class="section-header">
        <div class="section-title">🧭 Decision drill</div>
        <div class="section-desc">Pick the best option, then see how an interviewer scores each choice.</div>
      </div>
      ${items.map((d, di) => `
        <div class="dd-card" data-i="${di}">
          <div class="dd-scenario">${d.scenario}</div>
          <div class="dd-options">
            ${d.options.map((o, oi) => `
              <button class="dd-option" type="button" data-verdict="${o.verdict}" data-oi="${oi}">
                <span class="dd-option-label">${o.label}</span>
                <span class="dd-verdict" hidden>${verdictBadge(o.verdict)}</span>
                <span class="dd-why" hidden>${o.why}</span>
              </button>`).join('')}
          </div>
          <div class="dd-takeaway" hidden>💡 <strong>Takeaway:</strong> ${d.takeaway}</div>
        </div>`).join('')}
    </section>`;
}

function verdictBadge(v) {
  const map = { best: ['✓ Best', 'best'], ok: ['~ Workable', 'ok'], bad: ['✗ Avoid', 'bad'] };
  const [label, cls] = map[v] || ['?', 'ok'];
  return `<span class="dd-badge dd-${cls}">${label}</span>`;
}

export function initDecisionDrill(container) {
  container.querySelectorAll('.dd-section').forEach(section => {
    const id = section.dataset.dd;
    section.querySelectorAll('.dd-card').forEach(card => {
      const opts = [...card.querySelectorAll('.dd-option')];
      opts.forEach(opt => {
        opt.addEventListener('click', () => {
          if (card.classList.contains('answered')) return;
          card.classList.add('answered');
          opts.forEach(o => {
            o.classList.add('revealed', `v-${o.dataset.verdict}`);
            o.querySelector('.dd-verdict').hidden = false;
            o.querySelector('.dd-why').hidden = false;
          });
          opt.classList.add('chosen');
          card.querySelector('.dd-takeaway').hidden = false;
          if (opt.dataset.verdict === 'best') {
            try { recordDecision(id, Number(card.dataset.i)); } catch (e) {}
          }
        });
      });
    });
  });
}

// ── Tiered answers (Weak → Good → Senior) ───────────────────────────────────
export function createTieredCards(items) {
  if (!items || !items.length) return '';
  return items.map(t => `
    <div class="tiered-card">
      <div class="tiered-q">${t.q}</div>
      <div class="tiered-tiers">
        <div class="tiered-tier tier-weak"><div class="tier-label">Weak</div><div class="tier-body">${t.weak}</div></div>
        <div class="tiered-tier tier-good"><div class="tier-label">Good</div><div class="tier-body">${t.good}</div></div>
        <div class="tiered-tier tier-senior"><div class="tier-label">Senior</div><div class="tier-body">${t.senior}</div></div>
      </div>
    </div>`).join('');
}
