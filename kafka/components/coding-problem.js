// Coding-problem drill. Renders one problem from the coding bank: the prompt,
// a worked example, a scratchpad (notes only — NEVER executed; this platform
// has no code runtime), progressive hints revealed one at a time, a reference
// solution with walkthrough + complexity + the "make it a Kafka pipeline"
// follow-up, and a self-rating.
//
//   createCodingProblem(problem) -> HTML string
//   initCodingProblem(rootEl)    -> wires reveals + scratchpad + self-rate
//
// Self-rating records to the progress store under category 'coding'
// (correct === rated "got"). Content is trusted in-repo HTML; the solution
// code is escaped and highlighted client-side.
import { record, get } from '../data/progress-store.js';

// ── Tiny, dependency-free Python highlighter ─────────────────────────────────
// Escapes first (so content can't inject HTML), then wraps tokens in spans.
// Deliberately simple — good enough for short reference snippets, not a parser.
const KEYWORDS = new Set((
  'def class return if elif else for while in not and or is None True False ' +
  'import from as with try except finally raise yield lambda global nonlocal ' +
  'pass break continue assert await async del'
).split(' '));

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlightPy(code) {
  const esc = escapeHtml(code);
  // Tokenize on a single regex pass: comments, strings, numbers, then words.
  // Order matters — comments/strings are matched before words so keywords
  // inside them aren't recolored.
  return esc.replace(
    /(#[^\n]*)|('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")|(\b\d+\.?\d*\b)|(\b[A-Za-z_]\w*\b)/g,
    (m, comment, str, num, word) => {
      if (comment) return `<span class="cm">${comment}</span>`;
      if (str) return `<span class="st">${str}</span>`;
      if (num) return `<span class="nu">${num}</span>`;
      if (word && KEYWORDS.has(word)) return `<span class="kw">${word}</span>`;
      return m;
    }
  );
}

export function codeBlock(code, lang = 'python') {
  const html = lang === 'python' ? highlightPy(code) : escapeHtml(code);
  return `<pre class="cd-pre" data-lang="${lang}"><code>${html}</code></pre>`;
}

const RATE_LABEL = { got: '✅ Got it', partial: '🟡 Partial', review: '🔁 Review' };

export function createCodingProblem(p) {
  const prior = (() => { try { return get('coding', p.id); } catch (e) { return null; } })();
  const hints = p.hints || [];
  return `
    <div class="cd" data-cd="${p.id}">
      <div class="cd-prompt">${p.prompt}</div>

      ${p.example ? `
        <div class="cd-example">
          <div class="cd-sub">Example</div>
          ${p.example.input ? `<div class="cd-io"><span class="cd-io-tag">in</span>${codeBlock(p.example.input)}</div>` : ''}
          ${p.example.output ? `<div class="cd-io"><span class="cd-io-tag">out</span>${codeBlock(p.example.output)}</div>` : ''}
        </div>` : ''}

      ${p.starter ? `
        <details class="cd-fold">
          <summary>Starter stub</summary>
          ${codeBlock(p.starter)}
        </details>` : ''}

      <div class="cd-scratch">
        <div class="cd-sub">Your scratchpad <span class="cd-note">notes only — not executed</span></div>
        <textarea class="cd-pad" spellcheck="false" placeholder="Sketch your approach / write the function here. Saved in your browser; this is a notepad, not a runner."></textarea>
      </div>

      ${hints.length ? `
        <div class="cd-hints" data-total="${hints.length}">
          <div class="cd-sub">Hints</div>
          <div class="cd-hint-list">
            ${hints.map((h, i) => `<div class="cd-hint" data-i="${i}" hidden><span class="cd-hint-n">${i + 1}</span><span>${h}</span></div>`).join('')}
          </div>
          <button class="quiz-btn cd-hint-btn">Show a hint</button>
        </div>` : ''}

      <div class="cd-solution">
        <button class="quiz-btn primary cd-reveal">Reveal reference solution</button>
        <div class="cd-sol-body" hidden>
          <div class="cd-sub">Reference solution <span class="cd-note">Python · study reference, not run here</span></div>
          ${codeBlock(p.solution.code)}
          ${p.solution.walkthrough ? `<div class="cd-walk">${p.solution.walkthrough}</div>` : ''}
          ${p.complexity ? `<div class="cd-complexity"><strong>Complexity:</strong> ${p.complexity}</div>` : ''}
          ${p.kafkaFollowup ? `
            <div class="cd-kafka">
              <div class="cd-kafka-head">🟧 Make it a Kafka pipeline</div>
              <div class="cd-kafka-body">${p.kafkaFollowup}</div>
            </div>` : ''}
          <div class="cd-rate">
            <span class="cd-rate-label">How did you do?</span>
            ${Object.entries(RATE_LABEL).map(([k, v]) =>
              `<button class="cd-rate-btn${prior && prior.rating === k ? ' active' : ''}" data-rate="${k}">${v}</button>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
}

export function initCodingProblem(root) {
  root.querySelectorAll('.cd[data-cd]').forEach(card => {
    const id = card.dataset.cd;

    // Scratchpad — persisted per problem, never executed.
    const pad = card.querySelector('.cd-pad');
    if (pad) {
      const key = `kafka_cd_pad_${id}`;
      try { pad.value = localStorage.getItem(key) || ''; } catch (e) {}
      let t = null;
      pad.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => { try { localStorage.setItem(key, pad.value); } catch (e) {} }, 300);
      });
    }

    // Progressive hints — one per click.
    const hintBox = card.querySelector('.cd-hints');
    if (hintBox) {
      const total = Number(hintBox.dataset.total || 0);
      const btn = hintBox.querySelector('.cd-hint-btn');
      let shown = 0;
      btn?.addEventListener('click', () => {
        if (shown >= total) return;
        const el = hintBox.querySelector(`.cd-hint[data-i="${shown}"]`);
        if (el) el.hidden = false;
        shown++;
        btn.textContent = shown >= total ? 'All hints shown' : `Show hint ${shown + 1} of ${total}`;
        if (shown >= total) { btn.disabled = true; btn.classList.add('spent'); }
      });
    }

    // Reveal solution.
    const reveal = card.querySelector('.cd-reveal');
    const solBody = card.querySelector('.cd-sol-body');
    reveal?.addEventListener('click', () => {
      solBody.hidden = false;
      reveal.hidden = true;
      try { record('coding', id, { revealed: true }); } catch (e) {}
    });

    // Self-rate.
    card.querySelectorAll('.cd-rate-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const rating = btn.dataset.rate;
        card.querySelectorAll('.cd-rate-btn').forEach(b => b.classList.toggle('active', b === btn));
        try { record('coding', id, { rating, correct: rating === 'got', revealed: true }); } catch (e) {}
      });
    });
  });
}
