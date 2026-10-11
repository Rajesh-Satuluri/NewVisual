// Self-explanation card: write your own explanation, then reveal a model answer.
// Your text is saved locally so it survives revisits. createSelfExplain(id, prompts)
// -> HTML; initSelfExplain(container) wires persistence + reveal.

export function createSelfExplain(id, prompts) {
  if (!prompts || !prompts.length) return '';
  return `
    <section class="selfx-section" data-selfx="${id}">
      <div class="section-header">
        <div class="section-title">✍️ Explain it yourself</div>
        <div class="section-desc">Put the idea in your own words first — then reveal the model answer and compare. Writing it beats re-reading it.</div>
      </div>
      <div class="selfx-list">
        ${prompts.map((p, i) => `
          <div class="selfx-item" data-i="${i}">
            <div class="selfx-q">${p.prompt}</div>
            <textarea class="selfx-input" rows="3" placeholder="Type your explanation… (saved automatically)"></textarea>
            <div class="selfx-actions">
              <button class="selfx-reveal quiz-btn primary" aria-expanded="false">Reveal model answer</button>
              <span class="selfx-saved" hidden>✓ Saved</span>
            </div>
            <div class="selfx-answer" hidden><strong>Model answer:</strong> ${p.answer}</div>
          </div>`).join('')}
      </div>
    </section>`;
}

export function initSelfExplain(container) {
  container.querySelectorAll('.selfx-section').forEach(section => {
    const id = section.dataset.selfx;
    section.querySelectorAll('.selfx-item').forEach(item => {
      const i = item.dataset.i;
      const key = `kafka_selfx_${id}_${i}`;
      const input = item.querySelector('.selfx-input');
      const savedTag = item.querySelector('.selfx-saved');
      const revealBtn = item.querySelector('.selfx-reveal');
      const answer = item.querySelector('.selfx-answer');

      // Restore any prior response.
      try {
        const prior = localStorage.getItem(key);
        if (prior) { input.value = prior; savedTag.hidden = false; }
      } catch (e) {}

      let t = null;
      input.addEventListener('input', () => {
        savedTag.hidden = true;
        clearTimeout(t);
        t = setTimeout(() => {
          try {
            if (input.value.trim()) localStorage.setItem(key, input.value);
            else localStorage.removeItem(key);
          } catch (e) {}
          savedTag.hidden = !input.value.trim();
        }, 400);
      });

      revealBtn.addEventListener('click', () => {
        const show = answer.hidden;
        answer.hidden = !show;
        revealBtn.setAttribute('aria-expanded', String(show));
        revealBtn.textContent = show ? 'Hide model answer' : 'Reveal model answer';
      });
    });
  });
}
