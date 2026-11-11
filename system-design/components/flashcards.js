// ── Flashcard / recall mode (Block D · D12) ─────────────────────────────────
// Drills a deck of questions: shows the question, you try to answer from
// memory, reveal the model TL;DR + step outline, then self-grade (Again/Good).
// "Again" requeues the card later in the session; "Good" retires it.
//
// mount(container, { cards, onExit }) → cleanup()
//   cards: array of question METADATA objects (id, question, difficulty…)

import { reg } from '../content/registry.js';

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}
function shuffle(a) {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

export function mount(container, { cards, onExit } = {}) {
  let queue = shuffle(cards || []);
  const total = queue.length;
  let done = 0;           // retired (graded Good)
  let seen = 0;           // cards shown
  let revealed = false;
  const cache = {};       // id -> full data

  if (!total) {
    container.innerHTML = `<div class="sd-fc-wrap"><div class="sd-empty">
      <div class="sd-empty-icon">🃏</div><p>No cards in this deck.</p>
      <button class="sd-btn" id="sd-fc-exit">← Back</button></div></div>`;
    container.querySelector('#sd-fc-exit').addEventListener('click', () => onExit && onExit());
    return () => {};
  }

  container.innerHTML = `
    <div class="sd-fc-wrap">
      <div class="sd-fc-bar">
        <button class="sd-btn" id="sd-fc-exit">← Exit</button>
        <div class="sd-fc-progress">
          <span id="sd-fc-done">0</span> / ${total} learned
          <span class="sd-fc-remaining">· <span id="sd-fc-left">${total}</span> left</span>
        </div>
      </div>
      <div class="sd-fc-card" id="sd-fc-card"></div>
      <div class="sd-fc-finish" id="sd-fc-finish" hidden>
        <div class="sd-fc-finish-icon">🎉</div>
        <h2>Deck complete</h2>
        <p>You worked through <b>${total}</b> card${total === 1 ? '' : 's'}.</p>
        <div class="sd-fc-finish-actions">
          <button class="sd-btn sd-btn-primary" id="sd-fc-restart">Shuffle &amp; restart</button>
          <button class="sd-btn" id="sd-fc-exit2">← Back to list</button>
        </div>
      </div>
    </div>`;

  const cardEl = container.querySelector('#sd-fc-card');
  const finishEl = container.querySelector('#sd-fc-finish');
  const doneEl = container.querySelector('#sd-fc-done');
  const leftEl = container.querySelector('#sd-fc-left');

  function updateCounts() {
    doneEl.textContent = String(done);
    leftEl.textContent = String(queue.length);
  }

  async function loadData(id) {
    if (cache[id]) return cache[id];
    try {
      const mod = await reg.LOADERS[id]();
      cache[id] = mod.default || mod;
    } catch { cache[id] = null; }
    return cache[id];
  }

  function renderFront(meta) {
    revealed = false;
    cardEl.className = 'sd-fc-card';
    cardEl.innerHTML = `
      <div class="sd-fc-face sd-fc-front">
        <div class="sd-fc-meta">
          <span class="sd-diff ${{Fundamental:'diff-fundamental',Intermediate:'diff-intermediate',Advanced:'diff-advanced'}[meta.difficulty] || ''}">${esc(meta.difficulty || '')}</span>
          <span class="sd-cat">${esc(reg.CATEGORY_LABEL[meta.category] || meta.category || '')}</span>
        </div>
        <div class="sd-fc-icon">${meta.icon || '📘'}</div>
        <h2 class="sd-fc-q">${esc(meta.question)}</h2>
        <p class="sd-fc-hint">Answer it in your head, then reveal.</p>
        <button class="sd-btn sd-btn-primary sd-fc-reveal" id="sd-fc-reveal">Reveal answer</button>
      </div>`;
    container.querySelector('#sd-fc-reveal').addEventListener('click', () => renderBack(meta));
  }

  async function renderBack(meta) {
    revealed = true;
    const data = await loadData(meta.id);
    const tldr = data && data.tldr ? data.tldr : '(No model answer written for this card yet.)';
    const steps = (data && data.steps) || [];
    const outline = steps.length
      ? `<ol class="sd-fc-outline">${steps.map(s => `<li>${esc(s.title || '')}</li>`).join('')}</ol>`
      : (data && data.draft ? '<p class="sd-fc-draft">Draft — full step-by-step answer coming soon.</p>' : '');
    cardEl.className = 'sd-fc-card revealed';
    cardEl.innerHTML = `
      <div class="sd-fc-face sd-fc-back">
        <h3 class="sd-fc-q-sm">${esc(meta.question)}</h3>
        <p class="sd-fc-tldr"><span class="sd-tldr-tag">TL;DR</span> ${esc(tldr)}</p>
        ${outline ? `<div class="sd-fc-outline-wrap"><div class="sd-fc-outline-title">Answer outline</div>${outline}</div>` : ''}
        <a class="sd-fc-open" href="#${meta.id}">Open full question →</a>
        <div class="sd-fc-grade">
          <button class="sd-btn sd-fc-again" id="sd-fc-again">↻ Again</button>
          <button class="sd-btn sd-btn-primary sd-fc-good" id="sd-fc-good">✓ Got it</button>
        </div>
      </div>`;
    container.querySelector('#sd-fc-again').addEventListener('click', () => grade(false, meta));
    container.querySelector('#sd-fc-good').addEventListener('click', () => grade(true, meta));
  }

  function grade(good, meta) {
    if (good) { done++; }
    else {
      // requeue a few cards later
      const pos = Math.min(queue.length, 3 + Math.floor(Math.random() * 3));
      queue.splice(pos, 0, meta);
    }
    next();
  }

  function next() {
    if (!queue.length) { showFinish(); return; }
    const meta = queue.shift();
    seen++;
    updateCounts();
    renderFront(meta);
  }

  function showFinish() {
    updateCounts();
    cardEl.hidden = true;
    finishEl.hidden = false;
  }

  function onKey(e) {
    if (e.target.closest('input, textarea, select')) return;
    if (e.key === ' ' || e.key === 'Enter') {
      const reveal = container.querySelector('#sd-fc-reveal');
      if (reveal) { e.preventDefault(); reveal.click(); }
    } else if (revealed && (e.key === '1' || e.key.toLowerCase() === 'a')) {
      const b = container.querySelector('#sd-fc-again'); if (b) b.click();
    } else if (revealed && (e.key === '2' || e.key.toLowerCase() === 'g')) {
      const b = container.querySelector('#sd-fc-good'); if (b) b.click();
    }
  }

  // wire static buttons
  container.querySelector('#sd-fc-exit').addEventListener('click', () => onExit && onExit());
  container.querySelector('#sd-fc-exit2').addEventListener('click', () => onExit && onExit());
  container.querySelector('#sd-fc-restart').addEventListener('click', () => {
    queue = shuffle(cards); done = 0; seen = 0;
    cardEl.hidden = false; finishEl.hidden = true;
    next();
  });
  document.addEventListener('keydown', onKey);

  next();
  return function cleanup() { document.removeEventListener('keydown', onKey); };
}
