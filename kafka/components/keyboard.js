// Global keyboard shortcuts. Works across every module without per-module
// wiring: module navigation via arrows, and animation transport (play the
// primary control, reset) by targeting the active module's .canvas-controls.
import { MODULES } from './nav.js';
import { toast } from './toast.js';

function isTyping(e) {
  const t = e.target;
  const tag = (t.tagName || '').toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable;
}

// The module's primary action button (first control in the controls bar).
function primaryControl() {
  const canvas = document.getElementById('module-canvas');
  if (!canvas) return null;
  return canvas.querySelector('.canvas-controls .ctrl-btn') || canvas.querySelector('.ctrl-btn');
}

// A "reset" control, matched by id or visible label.
function resetControl() {
  const canvas = document.getElementById('module-canvas');
  if (!canvas) return null;
  return [...canvas.querySelectorAll('.ctrl-btn')].find(b =>
    /reset|restore/i.test(b.id) || /reset|↺|⟳|🔄|↩/i.test(b.textContent));
}

const HELP = [
  ['← / →', 'Previous / next module'],
  ['P or Enter', 'Play the module’s main animation'],
  ['R', 'Reset the animation'],
  ['/', 'Filter modules'],
  ['H', 'Home'],
  ['Ctrl/⌘ K', 'Command palette'],
  ['?', 'This help'],
];

function showHelp() {
  toast(HELP.map(([k, v]) => `${k} — ${v}`).join('  ·  '), { icon: '⌨️', duration: 5200 });
}

export function initKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;          // leave Cmd/Ctrl-K etc. alone
    if (isTyping(e)) return;
    if (document.querySelector('.cmdk-overlay:not([hidden])')) return; // palette open
    if (document.body.classList.contains('nav-open')) return;          // mobile drawer open

    const hash = location.hash.slice(1);
    const idx = MODULES.findIndex(m => m.id === hash);
    const atBody = document.activeElement === document.body;

    switch (e.key) {
      case 'ArrowRight':
        if (atBody && idx > -1 && idx < MODULES.length - 1) { e.preventDefault(); location.hash = MODULES[idx + 1].id; }
        break;
      case 'ArrowLeft':
        if (atBody && idx > 0) { e.preventDefault(); location.hash = MODULES[idx - 1].id; }
        break;
      case 'p': case 'P': case 'Enter': {
        const btn = primaryControl();
        if (btn) { e.preventDefault(); btn.click(); }
        break;
      }
      case 'r': case 'R': {
        const btn = resetControl();
        if (btn) { e.preventDefault(); btn.click(); }
        break;
      }
      case '/': {
        const f = document.querySelector('.nav-filter');
        if (f) { e.preventDefault(); f.focus(); }
        break;
      }
      case 'h': case 'H':
        if (hash !== 'home') location.hash = 'home';
        break;
      case '?':
        showHelp();
        break;
    }
  });
}
