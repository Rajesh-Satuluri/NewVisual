// B6 viewer · Self-Explain — one prompt per module; type/think, then reveal the
// key points a complete answer must hit (self-assessment).
import { createModuleShell, initTabs } from '../components/module-shell.js';
import { injectModStyles, esc } from './_mod-ui.js';
import { SELF_EXPLAIN } from '../data/self-explain.js';
import { MODULES } from '../components/nav.js';

const titleOf = (id) => (MODULES.find((m) => m.id === id) || {}).title || id;

export function mount(container) {
  injectModStyles();

  const intro = `
  <div class="ss-prose">
    <p>The Feynman technique: explain each module <b>in your own words</b> before revealing the key points a complete answer must hit. One prompt per module (${SELF_EXPLAIN.length} total). Jot your answer, then check yourself.</p>
  </div>
  <div id="se-list"></div>`;

  container.innerHTML = createModuleShell({
    tag: 'Interview · B6',
    title: '🗣️ Self-Explain',
    subtitle: `${SELF_EXPLAIN.length} Feynman-style prompts — one per module`,
    tabs: [{ id: 'se', label: '🗣️ Prompts', content: intro }],
  });
  initTabs(container);

  const list = container.querySelector('#se-list');
  list.innerHTML = SELF_EXPLAIN.map((s, i) => `
    <div class="ss-card" style="margin:12px 0">
      <div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap">
        <a href="#${s.m}" class="ss-btn" style="padding:1px 7px;font-size:11px;font-weight:700">${s.m.toUpperCase()}</a>
        <b style="color:var(--text-primary);font-size:14px">${esc(titleOf(s.m))}</b>
      </div>
      <p style="margin:8px 0;font-size:13.5px;color:var(--text-secondary)">${esc(s.prompt)}</p>
      <textarea class="se-ta" rows="3" placeholder="Explain in your own words…" style="width:100%;background:var(--bg-elevated);border:1px solid var(--border);color:var(--text-primary);border-radius:8px;padding:8px 10px;font-size:13px;font-family:inherit;resize:vertical"></textarea>
      <button class="ss-btn primary se-toggle" data-i="${i}" style="margin-top:8px">Reveal key points ▾</button>
      <div class="se-key" data-k="${i}" style="display:none;margin-top:8px">
        <div class="ss-callout" style="margin:0"><b>A complete answer hits:</b><ul style="margin:6px 0 0;padding-left:20px">${s.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>
      </div>
    </div>`).join('');

  list.querySelectorAll('.se-toggle').forEach((btn) => btn.addEventListener('click', () => {
    const key = list.querySelector(`[data-k="${btn.dataset.i}"]`);
    const open = key.style.display !== 'none';
    key.style.display = open ? 'none' : 'block';
    btn.textContent = open ? 'Reveal key points ▾' : 'Hide key points ▴';
  }));
  return null;
}

export default { mount };
