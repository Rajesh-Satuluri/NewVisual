// Reusable multiple-choice quiz engine with per-quiz best-score persistence.
// createQuiz(id, questions) -> HTML; initQuiz(container) wires grading/retry.
// questions: [{ q, options:[...], answer:<index>, explanation }]

export function createQuiz(id, questions) {
  if (!questions || !questions.length) return '';
  return `
    <section class="quiz-section" data-quiz="${id}">
      <div class="section-header">
        <div class="section-title">🧠 Test Yourself</div>
        <div class="section-desc">${questions.length} question${questions.length > 1 ? 's' : ''} · <span class="quiz-best" data-best>Best: —</span></div>
      </div>
      <div class="quiz-body">
        ${questions.map((qq, i) => `
          <div class="quiz-q" data-q="${i}" data-answer="${qq.answer}">
            <div class="quiz-prompt"><span class="quiz-qnum">${i + 1}</span><span>${qq.q}</span></div>
            <div class="quiz-opts" role="radiogroup">
              ${qq.options.map((opt, oi) => `
                <button class="quiz-opt" data-opt="${oi}" role="radio" aria-checked="false">
                  <span class="quiz-marker">${String.fromCharCode(65 + oi)}</span><span>${opt}</span>
                </button>`).join('')}
            </div>
            <div class="quiz-explain" hidden><strong>Why:</strong> ${qq.explanation}</div>
          </div>`).join('')}
      </div>
      <div class="quiz-actions">
        <button class="quiz-btn primary quiz-grade">Check answers</button>
        <button class="quiz-btn quiz-retry" hidden>Try again</button>
        <span class="quiz-score" hidden></span>
      </div>
    </section>`;
}

export function initQuiz(container) {
  container.querySelectorAll('.quiz-section').forEach(section => {
    const id = section.dataset.quiz;
    const key = `databricks_quiz_${id}`;
    const qs = [...section.querySelectorAll('.quiz-q')];
    const gradeBtn = section.querySelector('.quiz-grade');
    const retryBtn = section.querySelector('.quiz-retry');
    const scoreEl = section.querySelector('.quiz-score');
    const bestEl = section.querySelector('[data-best]');

    try {
      const best = localStorage.getItem(key);
      if (best !== null) bestEl.textContent = `Best: ${best}/${qs.length}`;
    } catch (e) {}

    section.querySelectorAll('.quiz-opts').forEach(group => {
      group.addEventListener('click', e => {
        const btn = e.target.closest('.quiz-opt');
        if (!btn || section.classList.contains('graded')) return;
        group.querySelectorAll('.quiz-opt').forEach(b => { b.classList.remove('selected'); b.setAttribute('aria-checked', 'false'); });
        btn.classList.add('selected'); btn.setAttribute('aria-checked', 'true');
      });
    });

    gradeBtn.addEventListener('click', () => {
      let correct = 0;
      qs.forEach(q => {
        const answer = Number(q.dataset.answer);
        const chosen = q.querySelector('.quiz-opt.selected');
        q.querySelectorAll('.quiz-opt').forEach((b, oi) => {
          b.disabled = true;
          if (oi === answer) b.classList.add('is-correct');
          else if (b === chosen) b.classList.add('is-wrong');
        });
        if (chosen && Number(chosen.dataset.opt) === answer) correct++;
        q.querySelector('.quiz-explain').hidden = false;
      });
      section.classList.add('graded');
      scoreEl.hidden = false;
      scoreEl.textContent = `You scored ${correct}/${qs.length}`;
      gradeBtn.hidden = true; retryBtn.hidden = false;
      try {
        const prev = Number(localStorage.getItem(key) ?? -1);
        if (correct > prev) { localStorage.setItem(key, String(correct)); bestEl.textContent = `Best: ${correct}/${qs.length}`; }
      } catch (e) {}
    });

    retryBtn.addEventListener('click', () => {
      section.classList.remove('graded');
      qs.forEach(q => {
        q.querySelectorAll('.quiz-opt').forEach(b => { b.disabled = false; b.classList.remove('is-correct', 'is-wrong', 'selected'); b.setAttribute('aria-checked', 'false'); });
        q.querySelector('.quiz-explain').hidden = true;
      });
      scoreEl.hidden = true; retryBtn.hidden = true; gradeBtn.hidden = false;
    });
  });
}
