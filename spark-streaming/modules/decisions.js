// B3 viewer · Decision drills — read a scenario, pick an option, reveal verdicts + principle.
import { createModuleShell, initTabs } from '../components/module-shell.js';
import { injectModStyles, esc } from './_mod-ui.js';
import { DECISIONS } from '../data/decisions.js';

export function mount(container) {
  injectModStyles();

  const intro = `
  <div class="ss-prose">
    <p><b>${DECISIONS.length}</b> architectural decision drills — the "what would you choose and why?" questions. Pick an option to see which choices are right and the principle behind it.</p>
  </div>
  <div id="dc-list"></div>`;

  container.innerHTML = createModuleShell({
    tag: 'Interview · B3',
    title: '🔀 Decision Drills',
    subtitle: `${DECISIONS.length} "choose and defend" architecture scenarios`,
    tabs: [{ id: 'dec', label: '🔀 Drills', content: intro }],
  });
  initTabs(container);

  const list = container.querySelector('#dc-list');
  list.innerHTML = DECISIONS.map((d, i) => `
    <div class="ss-card" style="margin:12px 0">
      <div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap">
        <a href="#${d.m}" class="ss-btn" style="padding:1px 7px;font-size:11px;font-weight:700">${d.m.toUpperCase()}</a>
        <b style="color:var(--text-primary);font-size:14px">${esc(d.q)}</b>
      </div>
      <div style="margin:10px 0" id="dc-opts-${i}">
        ${d.options.map((o, j) => `<button class="ss-btn dc-opt" data-d="${i}" data-j="${j}" style="display:block;width:100%;text-align:left;margin:6px 0">${esc(o.t)}</button>`).join('')}
      </div>
      <div class="dc-reveal" data-r="${i}" style="display:none">
        <div class="ss-callout" style="margin:4px 0 0"><b>Principle:</b> ${esc(d.principle)}</div>
      </div>
    </div>`).join('');

  list.querySelectorAll('.dc-opt').forEach((btn) => btn.addEventListener('click', () => {
    const di = +btn.dataset.d;
    const d = DECISIONS[di];
    const opts = list.querySelector(`#dc-opts-${di}`);
    [...opts.querySelectorAll('.dc-opt')].forEach((b, j) => {
      b.disabled = true;
      const o = d.options[j];
      b.style.borderColor = o.ok ? 'var(--green,#10B981)' : 'var(--red,#EF4444)';
      if (!b.querySelector('.dc-why')) {
        b.insertAdjacentHTML('beforeend', `<div class="dc-why" style="margin-top:6px;font-weight:400;font-size:12.5px;color:var(--text-secondary)">${o.ok ? '✅ ' : '❌ '}${esc(o.why)}</div>`);
      }
    });
    list.querySelector(`[data-r="${di}"]`).style.display = 'block';
  }));
  return null;
}

export default { mount };
