/* ============================================================
   Cloud DE Visualizer — shared question-engine substrate (F0.4)

   Both the certification practice exam (cert-exam.js) and the Test
   Yourself quiz (quiz.js) are modal, multiple-choice, grade-on-select
   flows. They had each hand-rolled the same dialog plumbing — backdrop,
   focus trap, Esc/backdrop close, focus capture + restore, body
   modal-open lock — and the same answer-grading loop. Any fix (an a11y
   bug, a focus-restore regression) had to be made twice and could drift.

   This module owns that substrate ONCE:
     • createModal()  — a self-managing dialog controller.
     • gradeOptions() — the correct/wrong + ✓/✗ marking applied on select.
     • shuffle(), esc() — the shared pure helpers.

   It deliberately does NOT own each flow's markup, scoring, domain
   tallies or persistence — those stay in the feature files, so the two
   experiences remain independent. New question UIs (the Phase-1 timed
   exam simulator, the Phase-2 incident simulator) build on this shell
   instead of copying it a third time.
   ============================================================ */
(function () {
  'use strict';
  const TV = (window.TableViz = window.TableViz || {});

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
  }

  /* Fisher–Yates on a copy (non-mutating). */
  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* Mark options after a selection: the key goes green with ✓, a wrong
     pick goes red with ✗, and every option is disabled. Pure DOM, prefix
     agnostic — pass the class/selectors the caller uses.
       cfg = { optSel, letterSel, answer, chosen } */
  function gradeOptions(root, cfg) {
    if (!root) return;
    root.querySelectorAll(cfg.optSel).forEach((b, idx) => {
      b.disabled = true;
      const letter = cfg.letterSel ? b.querySelector(cfg.letterSel) : null;
      if (idx === cfg.answer) { b.classList.add('correct'); if (letter) letter.textContent = '✓'; }
      if (idx === cfg.chosen && cfg.chosen !== cfg.answer) { b.classList.add('wrong'); if (letter) letter.textContent = '✗'; }
    });
  }

  /* A self-managing modal dialog controller.

     opts = {
       className,       // backdrop class, e.g. 'cx-backdrop'
       ariaLabel,       // dialog aria-label
       focusSelectors,  // ordered preference list to focus on open,
                        //   e.g. ['.cx-opt', '.cx-close']
       onClose,         // optional callback after close
     }

     Returns { root(), open(renderFn), render(renderFn), close(),
               isOpen() }.  open() captures the active element and
     restores it on close; renderFn(root) paints the body. */
  function createModal(opts) {
    opts = opts || {};
    let root = null;
    let lastFocus = null;

    function isOpen() { return !!(root && root.classList.contains('visible')); }

    function trapFocus(e) {
      if (e.key !== 'Tab' || !isOpen()) return;
      const f = root.querySelectorAll('button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    function ensure() {
      if (root) return root;
      root = document.createElement('div');
      root.className = opts.className || 'qe-backdrop';
      root.setAttribute('role', 'dialog');
      root.setAttribute('aria-modal', 'true');
      if (opts.ariaLabel) root.setAttribute('aria-label', opts.ariaLabel);
      document.body.appendChild(root);
      root.addEventListener('click', (e) => { if (e.target === root) close(); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) close(); });
      document.addEventListener('keydown', trapFocus);
      return root;
    }

    function focusFirst() {
      const sels = opts.focusSelectors || [];
      for (const sel of sels) {
        const el = root.querySelector(sel);
        if (el) { el.focus(); return; }
      }
    }

    function open(renderFn) {
      lastFocus = document.activeElement;
      ensure();
      if (typeof renderFn === 'function') renderFn(root);
      root.classList.add('visible');
      document.body.classList.add('modal-open');
      focusFirst();
    }

    /* Re-paint without touching open/close state (next question). */
    function render(renderFn) {
      ensure();
      if (typeof renderFn === 'function') renderFn(root);
    }

    function close() {
      if (root) root.classList.remove('visible');
      document.body.classList.remove('modal-open');
      if (lastFocus && typeof lastFocus.focus === 'function') { try { lastFocus.focus(); } catch (e) {} }
      lastFocus = null;
      if (typeof opts.onClose === 'function') opts.onClose();
    }

    return {
      root() { return ensure(); },
      open, render, close, isOpen,
    };
  }

  TV.QuestionEngine = { createModal, gradeOptions, shuffle, esc };
})();
