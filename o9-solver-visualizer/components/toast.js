// Shared toast utility — a single stack, auto-dismissing.
let wrap = null;

function ensureWrap() {
  if (wrap && document.body.contains(wrap)) return wrap;
  wrap = document.createElement('div');
  wrap.className = 'toast-wrap';
  wrap.setAttribute('aria-live', 'polite');
  document.body.appendChild(wrap);
  return wrap;
}

export function toast(msg, { duration = 2800, icon = '' } = {}) {
  const w = ensureWrap();
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = (icon ? `<span class="toast-icon">${icon}</span>` : '') + `<span>${msg}</span>`;
  w.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  const remove = () => { el.classList.remove('show'); setTimeout(() => el.remove(), 260); };
  const t = setTimeout(remove, duration);
  el.addEventListener('click', () => { clearTimeout(t); remove(); });
  return remove;
}
