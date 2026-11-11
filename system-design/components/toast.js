// ── Toast notifications ──────────────────────────────────────────────────────
// toast(message, { tone, icon, timeout }) — lightweight, auto-dismissing.
// tone: 'note' | 'good' | 'warn' | 'bad'

let host = null;
function ensureHost() {
  if (host && document.body.contains(host)) return host;
  host = document.createElement('div');
  host.id = 'sd-toasts';
  host.setAttribute('aria-live', 'polite');
  document.body.appendChild(host);
  return host;
}

const TONE_ICON = { note: 'ℹ️', good: '✅', warn: '⚠️', bad: '❌' };

export function toast(message, opts = {}) {
  const tone = opts.tone || 'note';
  const icon = opts.icon || TONE_ICON[tone] || 'ℹ️';
  const el = document.createElement('div');
  el.className = `sd-toast sd-toast-${tone}`;
  el.innerHTML = `<span class="sd-toast-icon" aria-hidden="true">${icon}</span><span class="sd-toast-msg"></span>`;
  el.querySelector('.sd-toast-msg').textContent = message;
  ensureHost().appendChild(el);
  // enter
  requestAnimationFrame(() => el.classList.add('in'));
  const t = setTimeout(() => dismiss(el), opts.timeout || 2600);
  el.addEventListener('click', () => { clearTimeout(t); dismiss(el); });
  return el;
}

function dismiss(el) {
  el.classList.remove('in');
  el.classList.add('out');
  setTimeout(() => el.remove(), 260);
}
