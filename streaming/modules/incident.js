// Gate 7 (I66) — Incident Lab engine. Lists production incidents; each is a
// predict-then-reveal drill: read the symptom, diagnose via MCQ, then reveal the
// root cause and recovery playbook. Scenario-aware via {ENTITY}/{KEY}/{ID}.
import { INCIDENTS } from '../data/incidents.js';
import { getScenario } from '../data/scenarios.js';
import { isDone, markDone } from '../data/progress-store.js';
import { updateProgress } from '../components/nav.js';
import { callout } from '../components/lesson-shell.js';

function fill(html, sc) {
  return String(html).replace(/\{ENTITY\}/g, sc.entity).replace(/\{KEY\}/g, sc.keyField).replace(/\{ID\}/g, sc.canonicalId);
}

export async function mount(container, id) {
  const sc = getScenario();
  // id is 'incident' (landing) or 'inc01'.. (a drill)
  if (!id || id === 'incident') return landing(container, sc);
  const inc = INCIDENTS.find(x => x.id === id);
  if (!inc) return landing(container, sc);
  return drill(container, sc, inc);
}

function landing(container, sc) {
  container.innerHTML = `
    <div class="page-head">
      <div class="page-eyebrow">Practice</div>
      <h1 class="page-title">🚨 Incident Lab</h1>
      <p class="page-sub">${INCIDENTS.length} production incidents to diagnose. Read the symptom, commit to a
        diagnosis, then reveal the root cause and the recovery playbook — the way on-call actually works.</p>
    </div>
    <div class="scenario-banner"><span class="sb-ico">${sc.icon}</span>
      <div class="sb-body">Framed by the <b>${sc.name}</b> scenario (${sc.canonicalId}). Each incident links to
        the concept that explains it.</div></div>
    <div class="fnd-grid">
      ${INCIDENTS.map(inc => `
        <div class="card fnd-card" data-go="${inc.id}">
          <span class="fnd-num">${inc.icon}</span>
          <div><h3>${inc.title} ${isDone(inc.id) ? '<span class="pill live" style="margin-left:4px">✓</span>' : ''}
            <span class="pill soon" style="margin-left:4px">${inc.severity}</span></h3>
            <p>${fill(inc.symptom, sc).replace(/<[^>]+>/g, '').slice(0, 110)}…</p></div>
        </div>`).join('')}
    </div>`;
  container.querySelectorAll('[data-go]').forEach(c => c.addEventListener('click', () => { location.hash = '#' + c.dataset.go; }));
}

function drill(container, sc, inc) {
  const idx = INCIDENTS.findIndex(x => x.id === inc.id);
  const next = INCIDENTS[idx + 1];
  container.innerHTML = `
    <div class="page-head">
      <div class="page-eyebrow"><a href="#incident" style="color:var(--text3)">Incident Lab</a> · ${inc.severity}</div>
      <h1 class="page-title">${inc.icon} ${inc.title}</h1>
    </div>
    ${callout('warn', '🔔 Symptom', fill(inc.symptom, sc))}
    <div class="card">
      <div style="font-weight:600;margin-bottom:10px">Diagnose it — pick the most likely root cause:</div>
      <div id="inc-opts" style="display:flex;flex-direction:column;gap:8px">
        ${inc.options.map((o, i) => `<button class="btn" data-opt="${i}" style="text-align:left;justify-content:flex-start">${fill(o.text, sc)}</button>`).join('')}
      </div>
    </div>
    <div id="inc-reveal"></div>
    <div class="lx-nav">
      <div><button class="btn" data-go="incident">← All incidents</button></div>
      <div style="display:flex;gap:10px">
        <button class="btn" id="inc-done">${isDone(inc.id) ? '✓ Completed' : 'Mark complete'}</button>
        ${next ? `<button class="btn primary" data-go="${next.id}">Next incident →</button>` : `<button class="btn primary" data-go="incident">Back to list ↩</button>`}
      </div>
    </div>`;

  let answered = false;
  container.querySelectorAll('[data-opt]').forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.opt; const o = inc.options[i];
    container.querySelectorAll('[data-opt]').forEach((btn, j) => {
      btn.disabled = true;
      if (inc.options[j].correct) btn.classList.add('primary');
      else if (j === i) btn.style.opacity = '.55';
    });
    if (!answered) {
      answered = true;
      container.querySelector('#inc-reveal').innerHTML = `
        ${callout(o.correct ? 'ok' : 'danger', o.correct ? '✓ Correct' : '✗ Not quite', fill(o.why, sc))}
        ${callout('info', '🔍 Root cause', fill(inc.rootCause, sc))}
        ${callout('ok', '🛠️ Recovery playbook', '<ol style="margin:0;padding-left:20px">' + inc.playbook.map(s => `<li style="margin:4px 0">${fill(s, sc)}</li>`).join('') + '</ol>')}
        ${inc.concept ? `<div style="margin-top:12px"><button class="btn" data-go="${inc.concept}">📚 Learn the underlying concept →</button></div>` : ''}`;
      container.querySelector('#inc-reveal').querySelectorAll('[data-go]').forEach(x => x.addEventListener('click', () => { location.hash = '#' + x.dataset.go; }));
    }
  }));
  container.querySelectorAll('.lx-nav [data-go]').forEach(b => b.addEventListener('click', () => { location.hash = '#' + b.dataset.go; }));
  const doneBtn = container.querySelector('#inc-done');
  doneBtn.addEventListener('click', () => { markDone(inc.id); doneBtn.textContent = '✓ Completed'; updateProgress(); });
}
