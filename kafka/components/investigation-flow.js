// Investigation flow — interactive troubleshooting. Given a production symptom,
// the learner chooses what to check at each step. A correct choice reveals the
// evidence it surfaces and why it was the right move, then advances; a wrong
// choice explains the misconception and lets them try again. Reaching the end
// reveals root cause, resolution, prevention and a spoken interview answer.
//
//   createInvestigation(scenario)        -> HTML string
//   initInvestigation(rootEl, scenarios) -> wires the step machine; `scenarios`
//                                           is a map { id: scenario }
//
// Records to the progress store under 'troubleshoot' (correct === solved with
// no wrong picks). Content is trusted in-repo HTML.
import { record } from '../data/progress-store.js';

export function createInvestigation(s) {
  return `
    <div class="inv" data-inv="${s.id}">
      <div class="inv-symptom">
        <div class="inv-symptom-head">🚨 Symptom</div>
        <div class="inv-symptom-body">${s.symptom}</div>
      </div>
      <div class="inv-progress"><span class="inv-step-count"></span></div>
      <div class="inv-stage"></div>
      <div class="inv-outcome" hidden>
        <div class="inv-block inv-root"><div class="inv-block-head">🎯 Root cause</div><div class="inv-block-body">${s.rootCause}</div></div>
        <div class="inv-block inv-res"><div class="inv-block-head">🔧 Resolution</div><div class="inv-block-body">${s.resolution}</div></div>
        <div class="inv-block inv-prev"><div class="inv-block-head">🛡️ Prevention</div><div class="inv-block-body">${s.prevention}</div></div>
        <div class="inv-block inv-say"><div class="inv-block-head">🎙️ Say it in an interview</div><div class="inv-block-body">${s.interviewAnswer}</div></div>
      </div>
    </div>`;
}

export function initInvestigation(root, scenarios) {
  root.querySelectorAll('.inv[data-inv]').forEach(card => {
    const id = card.dataset.inv;
    const scenario = scenarios && scenarios[id];
    if (!scenario) return;

    const stageEl = card.querySelector('.inv-stage');
    const countEl = card.querySelector('.inv-step-count');
    const outcomeEl = card.querySelector('.inv-outcome');
    let step = 0;
    let clean = true; // no wrong picks so far

    function renderStep() {
      const st = scenario.steps[step];
      countEl.textContent = `Step ${step + 1} of ${scenario.steps.length}`;
      stageEl.innerHTML = `
        <div class="inv-prompt">${st.prompt}</div>
        <div class="inv-checks">
          ${st.checks.map((c, i) => `
            <button class="inv-check" data-i="${i}" data-correct="${!!c.correct}">
              <span class="inv-check-label">${c.label}</span>
              <span class="inv-check-feedback" hidden></span>
            </button>`).join('')}
        </div>`;

      stageEl.querySelectorAll('.inv-check').forEach(btn => {
        btn.addEventListener('click', () => onPick(btn, st));
      });
    }

    function onPick(btn, st) {
      const i = +btn.dataset.i;
      const choice = st.checks[i];
      const fb = btn.querySelector('.inv-check-feedback');
      if (btn.classList.contains('resolved') || btn.classList.contains('was-wrong')) return;

      if (choice.correct) {
        btn.classList.add('correct', 'resolved');
        fb.innerHTML = `<span class="inv-evidence"><b>Evidence:</b> ${choice.evidence}</span>
                        <span class="inv-why"><b>Why this check:</b> ${choice.reasoning}</span>`;
        fb.hidden = false;
        // lock the other options for this step
        stageEl.querySelectorAll('.inv-check').forEach(b => { if (b !== btn) b.disabled = true; });
        setTimeout(advance, 120);
      } else {
        clean = false;
        btn.classList.add('wrong', 'was-wrong');
        btn.disabled = true;
        fb.innerHTML = `<span class="inv-wrongwhy"><b>Not the best next move:</b> ${choice.why}</span>`;
        fb.hidden = false;
      }
    }

    function advance() {
      step++;
      if (step < scenario.steps.length) {
        renderStep();
      } else {
        finish();
      }
    }

    function finish() {
      stageEl.innerHTML = `<div class="inv-solved">✅ Investigation complete${clean ? ' — solved with no wrong turns!' : ''}</div>`;
      outcomeEl.hidden = false;
      record('troubleshoot', id, { correct: clean, solved: true });
    }

    renderStep();
  });
}
