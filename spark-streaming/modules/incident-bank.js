// B4 viewer · Incident labs — symptom first; reveal signals, root cause, fix, prevention.
import { createModuleShell, initTabs } from '../components/module-shell.js';
import { injectModStyles, esc } from './_mod-ui.js';
import { INCIDENTS } from '../data/incidents.js';

export function mount(container) {
  injectModStyles();

  const intro = `
  <div class="ss-prose">
    <p><b>${INCIDENTS.length}</b> production incident labs. Each starts with the <b>symptom</b> — try to diagnose it before revealing the signals, root cause, fix, and prevention. This is how streaming failures actually present on-call.</p>
  </div>
  <div id="in-list"></div>`;

  container.innerHTML = createModuleShell({
    tag: 'Interview · B4',
    title: '🚨 Incident Labs',
    subtitle: `${INCIDENTS.length} production streaming incidents, diagnosed runbook-style`,
    tabs: [{ id: 'inc', label: '🚨 Incidents', content: intro }],
  });
  initTabs(container);

  const list = container.querySelector('#in-list');
  list.innerHTML = INCIDENTS.map((it, i) => `
    <div class="ss-card" style="margin:12px 0">
      <div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap">
        <span style="font-size:11px">🚨</span>
        <a href="#${it.m}" class="ss-btn" style="padding:1px 7px;font-size:11px;font-weight:700">${it.m.toUpperCase()}</a>
        <b style="color:var(--text-primary);font-size:14px">${esc(it.title)}</b>
      </div>
      <p style="margin:8px 0;font-size:13.5px;line-height:1.6;color:var(--text-secondary)"><b style="color:var(--yellow,#F59E0B)">Symptom:</b> ${esc(it.symptom)}</p>
      <button class="ss-btn primary in-toggle" data-i="${i}">Diagnose ▾</button>
      <div class="in-body" data-b="${i}" style="display:none;margin-top:10px">
        <p style="font-size:13px;color:var(--text-muted);margin:4px 0 4px;text-transform:uppercase;letter-spacing:.05em;font-weight:700">Signals</p>
        <ul style="margin:0 0 10px;padding-left:20px;font-size:13px;color:var(--text-secondary);line-height:1.6">${it.signals.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
        <div class="ss-callout" style="margin:6px 0;border-left-color:var(--red,#EF4444)"><b>Root cause:</b> ${esc(it.root)}</div>
        <div class="ss-callout" style="margin:6px 0;border-left-color:var(--green,#10B981)"><b>Fix:</b> ${esc(it.fix)}</div>
        <div class="ss-callout" style="margin:6px 0;border-left-color:var(--blue,#3B82F6)"><b>Prevention:</b> ${esc(it.prevent)}</div>
      </div>
    </div>`).join('');

  list.querySelectorAll('.in-toggle').forEach((btn) => btn.addEventListener('click', () => {
    const body = list.querySelector(`[data-b="${btn.dataset.i}"]`);
    const open = body.style.display !== 'none';
    body.style.display = open ? 'none' : 'block';
    btn.textContent = open ? 'Diagnose ▾' : 'Hide ▴';
  }));
  return null;
}

export default { mount };
