import { MODULES } from '../components/nav.js';

export function mount(container) {
  const pick = (id) => MODULES.find(m => m.id === id);
  const startCards = ['what-is-solver', 'obo-heuristic', 'three-phases', 'demand-sorting', 'net-requirements', 'pegging']
    .map(pick).filter(Boolean);

  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">o9 SCS Mastery · Start Here</div>
        <h1 class="module-title">Master the o9 Supply Chain Solver</h1>
        <p class="module-subtitle">A beginner → interview-ready path through the heuristic Supply Chain Solver: how it sorts demand, plans order-by-order, times supply across JIT / Build-Ahead / Build-Late, pegs supply to demand, and explains every shortage.</p>
      </div>

      <div class="scroll-content">
        <div class="section-header">
          <div class="section-title">Start here</div>
          <div class="section-desc">Jump into the core ideas. Each module ends with a short quiz — pass it to mark the module mastered.</div>
        </div>
        <div class="info-grid">
          ${startCards.map(m => `
            <a href="#${m.id}" class="info-card" style="text-decoration:none; display:block">
              <div class="info-card-title">${m.icon} ${m.label}</div>
              <div class="info-card-body">${m.desc}</div>
            </a>`).join('')}
        </div>

        <div class="section-header" style="margin-top:28px">
          <div class="section-title">How this platform works</div>
          <div class="section-desc">Same learning architecture as the Kafka visualizer — grouped curriculum, per-module quizzes, spaced-repetition review, and a progress dashboard.</div>
        </div>
        <div class="prose">
          <p><strong>Learn by doing.</strong> The solver is simple enough to run in the browser — a real, deterministic engine drives the interactive demos, so you see the exact behaviour, not a cartoon of it.</p>
          <p><strong>Honest progress.</strong> Opening a page counts as <em>visited</em>; a module is <em>mastered</em> only when you pass its quiz. Your progress, quiz scores and review schedule are saved locally (and can optionally sync across devices).</p>
          <p><strong>Grounded in reality.</strong> The content mirrors how the solver actually behaves in a production o9 tenant — demand sorting, lead-time offset, lot sizing, sourcing splits, pegging and RCA — using clear, illustrative examples.</p>
        </div>
      </div>
    </div>`;
  return null;
}
