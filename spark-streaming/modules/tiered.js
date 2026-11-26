// B5 viewer · Tiered answers — same question at junior / mid / senior depth.
import { createModuleShell, initTabs } from '../components/module-shell.js';
import { injectModStyles, esc } from './_mod-ui.js';
import { TIERED } from '../data/tiered.js';

const TIERS = [['junior', 'Junior', 'var(--cyan,#06B6D4)'], ['mid', 'Mid', 'var(--yellow,#F59E0B)'], ['senior', 'Senior', 'var(--purple,#8B5CF6)']];

export function mount(container) {
  injectModStyles();

  const intro = `
  <div class="ss-prose">
    <p><b>${TIERED.length}</b> core questions, each answered at three levels — see exactly how depth separates a <b style="color:var(--cyan,#06B6D4)">junior</b>, <b style="color:var(--yellow,#F59E0B)">mid</b>, and <b style="color:var(--purple,#8B5CF6)">senior</b> answer. Aim for the senior framing in interviews.</p>
  </div>
  <div id="ti-list"></div>`;

  container.innerHTML = createModuleShell({
    tag: 'Interview · B5',
    title: '🪜 Tiered Answers',
    subtitle: `${TIERED.length} questions × junior / mid / senior depth`,
    tabs: [{ id: 'tiered', label: '🪜 Tiers', content: intro }],
  });
  initTabs(container);

  const list = container.querySelector('#ti-list');
  list.innerHTML = TIERED.map((t, i) => `
    <div class="ss-card" style="margin:12px 0">
      <div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;margin-bottom:8px">
        <a href="#${t.m}" class="ss-btn" style="padding:1px 7px;font-size:11px;font-weight:700">${t.m.toUpperCase()}</a>
        <b style="color:var(--text-primary);font-size:14px">${esc(t.q)}</b>
      </div>
      <div class="ss-controls" style="margin:4px 0 8px">
        ${TIERS.map(([k, lbl, c], j) => `<button class="ss-btn ti-tab${j === 0 ? ' primary' : ''}" data-i="${i}" data-k="${k}" style="border-color:${c}">${lbl}</button>`).join('')}
      </div>
      <div class="ti-ans ss-callout" data-a="${i}" style="margin:0">${esc(t.junior)}</div>
    </div>`).join('');

  list.querySelectorAll('.ti-tab').forEach((btn) => btn.addEventListener('click', () => {
    const i = btn.dataset.i;
    const t = TIERED[i];
    list.querySelector(`[data-a="${i}"]`).textContent = t[btn.dataset.k];
    btn.parentElement.querySelectorAll('.ti-tab').forEach((b) => b.classList.toggle('primary', b === btn));
  }));
  return null;
}

export default { mount };
