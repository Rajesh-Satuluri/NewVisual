/* ============================================================
   Test Yourself — per-module quiz in a MODAL overlay.

   A contextual topbar button (#quiz-toggle) appears only on screens
   that have a bank in IV.QuestionBank. Clicking opens the quiz in a
   modal appended to <body>, so nothing is ever injected into a
   module's own DOM — animation layouts are never touched.

   Inline grading, explanations, and per-screen best-score persistence.
   ============================================================ */
(function () {
  'use strict';
  const IV = (window.IcebergViz = window.IcebergViz || {});

  let modal, panel, titleEl, bestEl, bodyEl, scoreEl, footBtn, lastFocus;
  let currentId = null;

  const TV = window.TableViz || IV;
  function fmt() { return TV.currentFormat ? (TV.currentFormat() || 'iceberg') : 'iceberg'; }
  function bankFor(id) {
    const QB = IV.QuestionBank || {};
    if (QB[fmt()] && QB[fmt()][id]) return QB[fmt()][id];          // format-keyed (Delta/Compare)
    if (fmt() === 'iceberg' && QB[id]) return QB[id];              // legacy flat (Iceberg)
    return null;
  }
  function bestKey(id) { return 'tv-' + fmt() + '-quiz-' + id; }
  function getBest(id) { try { return parseInt(localStorage.getItem(bestKey(id)) || '', 10); } catch (e) { return NaN; } }
  function setBest(id, pct) {
    const prev = getBest(id);
    if (Number.isNaN(prev) || pct > prev) { try { localStorage.setItem(bestKey(id), String(pct)); } catch (e) {} }
  }
  function esc(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

  function label(id) {
    const s = (IV.getScreens ? IV.getScreens() : []).find(x => x.id === id);
    return s ? s.label : id;
  }

  function build() {
    modal = document.createElement('div');
    modal.className = 'ty-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <div class="ty-modal__panel" role="dialog" aria-modal="true" aria-label="Test yourself">
        <div class="ty-modal__head">
          <div class="ty-modal__title">Test Yourself<small></small></div>
          <div style="display:flex;align-items:center;gap:10px">
            <span class="ty-modal__best" hidden></span>
            <button class="ty-close" type="button" aria-label="Close quiz">&#x2715;</button>
          </div>
        </div>
        <div class="ty-modal__body"><ol class="iv-ty__list"></ol></div>
        <div class="ty-modal__foot">
          <span class="ty-modal__score" aria-live="polite"></span>
          <button class="ty-modal__retry btn-secondary" type="button" hidden>Try again</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    panel = modal.querySelector('.ty-modal__panel');
    titleEl = modal.querySelector('.ty-modal__title small');
    bestEl = modal.querySelector('.ty-modal__best');
    bodyEl = modal.querySelector('.iv-ty__list');
    scoreEl = modal.querySelector('.ty-modal__score');
    footBtn = modal.querySelector('.ty-modal__retry');

    modal.querySelector('.ty-close').addEventListener('click', close);
    footBtn.addEventListener('click', () => populate(currentId));
    modal.addEventListener('mousedown', e => { if (e.target === modal) close(); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) { e.preventDefault(); close(); }
    });
  }

  function populate(id) {
    const bank = bankFor(id) || [];
    currentId = id;
    titleEl.textContent = label(id);
    bodyEl.innerHTML = '';
    scoreEl.textContent = '';
    scoreEl.classList.remove('is-shown');
    footBtn.hidden = true;

    const best = getBest(id);
    bestEl.hidden = Number.isNaN(best);
    if (!Number.isNaN(best)) bestEl.textContent = `Best: ${best}%`;

    let answered = 0, correct = 0;
    bank.forEach(qq => {
      const li = document.createElement('li');
      li.className = 'iv-ty__q';
      li.innerHTML = `
        <div class="iv-ty__prompt"><span class="iv-ty__diff iv-ty__diff--${qq.difficulty}">${qq.difficulty}</span>${esc(qq.q)}</div>
        <div class="iv-ty__opts" role="group"></div>
        <div class="iv-ty__exp" hidden></div>`;
      const opts = li.querySelector('.iv-ty__opts');
      qq.options.forEach((opt, oi) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'iv-ty__opt';
        b.innerHTML = `<span class="iv-ty__mark"></span><span>${esc(opt)}</span>`;
        b.addEventListener('click', () => {
          if (li.dataset.done) return;
          li.dataset.done = '1';
          answered++;
          const right = oi === qq.correct;
          if (right) correct++;
          opts.querySelectorAll('.iv-ty__opt').forEach((btn, bi) => {
            btn.disabled = true;
            if (bi === qq.correct) btn.classList.add('is-correct');
            if (bi === oi && !right) btn.classList.add('is-wrong');
          });
          const exp = li.querySelector('.iv-ty__exp');
          exp.innerHTML = `<strong>${right ? 'Correct.' : 'Not quite.'}</strong> ${esc(qq.explanation)}`;
          exp.hidden = false;
          if (answered === bank.length) finish(id, correct, bank.length);
        });
        opts.appendChild(b);
      });
      bodyEl.appendChild(li);
    });
  }

  function finish(id, correct, total) {
    const pct = Math.round((correct / total) * 100);
    setBest(id, pct);
    scoreEl.textContent = `You scored ${correct} / ${total} (${pct}%)`;
    scoreEl.classList.add('is-shown');
    const nb = getBest(id);
    if (!Number.isNaN(nb)) { bestEl.hidden = false; bestEl.textContent = `Best: ${nb}%`; }
    footBtn.hidden = false;
  }

  function open() {
    if (!modal) build();
    const id = IV.currentScreenId && IV.currentScreenId();
    if (!id || !bankFor(id)) return;
    populate(id);
    lastFocus = document.activeElement;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => modal.querySelector('.ty-close')?.focus(), 20);
  }

  function close() {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  // Show/hide the topbar trigger for the current screen.
  function syncButton(id) {
    const btn = document.getElementById('quiz-toggle');
    if (!btn) return;
    const has = !!bankFor(id);
    btn.hidden = !has;
    // Close a stale modal when navigating to a screen without a bank.
    if (!has && modal && modal.classList.contains('is-open')) close();
  }

  function init() {
    const btn = document.getElementById('quiz-toggle');
    btn?.addEventListener('click', open);
    document.addEventListener('app:navigate', e => syncButton(e.detail && e.detail.id));
    if (IV.currentScreenId) syncButton(IV.currentScreenId());
    IV._openQuiz = open;
    IV._closeQuiz = close;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
