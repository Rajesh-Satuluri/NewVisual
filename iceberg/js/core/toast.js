/* ============================================================
   Toast — one shared notifier reused across features.
   IV.toast(message, { type, icon, duration, title })
   ============================================================ */
(function () {
  'use strict';
  const IV = (window.IcebergViz = window.IcebergViz || {});

  let stack = null;
  function ensureStack() {
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'iv-toast-stack';
      stack.setAttribute('aria-live', 'polite');
      stack.setAttribute('role', 'status');
      document.body.appendChild(stack);
    }
    return stack;
  }

  IV.toast = function (message, opts = {}) {
    const host = ensureStack();
    const el = document.createElement('div');
    el.className = 'iv-toast' + (opts.type ? ' iv-toast--' + opts.type : '');
    el.innerHTML =
      (opts.icon ? `<span class="iv-toast__icon" aria-hidden="true">${opts.icon}</span>` : '') +
      `<div class="iv-toast__body">` +
      (opts.title ? `<div class="iv-toast__title">${opts.title}</div>` : '') +
      `<div class="iv-toast__msg">${message}</div></div>`;
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-visible'));

    const dur = opts.duration || 2800;
    const kill = () => {
      el.classList.remove('is-visible');
      setTimeout(() => el.remove(), 300);
    };
    const timer = setTimeout(kill, dur);
    el.addEventListener('click', () => { clearTimeout(timer); kill(); });
    return el;
  };
})();
