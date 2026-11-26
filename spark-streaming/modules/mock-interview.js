// B7 viewer · Mock interview — a timed 45-minute set; advance question by question,
// reveal a model answer, with a running clock and per-phase time budget.
import { createModuleShell, initTabs } from '../components/module-shell.js';
import { injectModStyles, esc } from './_mod-ui.js';
import { MOCK } from '../data/mock-exam.js';

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export function mount(container) {
  injectModStyles();

  const qs = MOCK.questions;
  const phases = [...new Set(qs.map((q) => q.phase))];

  const intro = `
  <div class="ss-prose">
    <p>A curated <b>${MOCK.totalMins}-minute</b> mock interview — ${qs.length} questions across ${phases.length} phases (${phases.join(' · ')}), just like a real loop. Start the clock, answer out loud or in writing, then reveal the model answer and self-grade.</p>
  </div>
  <div class="ss-metrics">
    <div class="ss-metric"><div class="k">Elapsed</div><div class="v" id="mk-clock">0:00</div></div>
    <div class="ss-metric"><div class="k">Budget</div><div class="v">${MOCK.totalMins}:00</div></div>
    <div class="ss-metric"><div class="k">Question</div><div class="v" id="mk-pos">— / ${qs.length}</div></div>
  </div>
  <div class="ss-controls">
    <button class="ss-btn primary" id="mk-start">Start interview ▶</button>
    <button class="ss-btn" id="mk-pause" disabled>Pause</button>
    <button class="ss-btn" id="mk-reset">⟲ Reset</button>
  </div>
  <div id="mk-area"></div>`;

  container.innerHTML = createModuleShell({
    tag: 'Interview · B7',
    title: '🎤 Mock Interview',
    subtitle: `A timed ${MOCK.totalMins}-minute Structured Streaming interview set`,
    tabs: [{ id: 'mock', label: '🎤 Mock', content: intro }],
  });
  initTabs(container);

  const clockEl = container.querySelector('#mk-clock');
  const posEl = container.querySelector('#mk-pos');
  const area = container.querySelector('#mk-area');
  const startBtn = container.querySelector('#mk-start');
  const pauseBtn = container.querySelector('#mk-pause');

  let idx = -1, secs = 0, timer = null;

  function tick() { secs++; clockEl.textContent = fmt(secs); if (secs >= MOCK.totalMins * 60) clockEl.style.color = 'var(--red,#EF4444)'; }
  function startClock() { if (!timer) timer = setInterval(tick, 1000); pauseBtn.disabled = false; pauseBtn.textContent = 'Pause'; }
  function stopClock() { if (timer) { clearInterval(timer); timer = null; } }

  function renderQ() {
    const q = qs[idx];
    posEl.textContent = `${idx + 1} / ${qs.length}`;
    area.innerHTML = `
      <div class="ss-card" style="margin:10px 0">
        <div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;margin-bottom:6px">
          <span style="font-size:11px;font-weight:700;color:var(--accent);border:1px solid var(--accent);border-radius:5px;padding:1px 7px">${esc(q.phase)}</span>
          <span style="font-size:11px;color:var(--text-muted)">~${q.mins} min</span>
          <a href="#${q.m}" class="ss-btn" style="padding:1px 7px;font-size:11px;font-weight:700">${q.m.toUpperCase()}</a>
        </div>
        <p style="color:var(--text-primary);font-size:15px;font-weight:600;margin:0 0 10px">${esc(q.q)}</p>
        <button class="ss-btn primary" id="mk-reveal">Reveal model answer ▾</button>
        <div id="mk-model" style="display:none;margin-top:10px"><div class="ss-callout" style="margin:0"><b>Model answer:</b> ${esc(q.model)}</div></div>
      </div>
      <div class="ss-controls">
        <button class="ss-btn" id="mk-prev"${idx === 0 ? ' disabled' : ''}>◀ Prev</button>
        <button class="ss-btn primary" id="mk-next">${idx === qs.length - 1 ? 'Finish ▶' : 'Next ▶'}</button>
      </div>`;
    area.querySelector('#mk-reveal').addEventListener('click', (e) => {
      const m = area.querySelector('#mk-model'); const open = m.style.display !== 'none';
      m.style.display = open ? 'none' : 'block'; e.target.textContent = open ? 'Reveal model answer ▾' : 'Hide model answer ▴';
    });
    area.querySelector('#mk-prev').addEventListener('click', () => { if (idx > 0) { idx--; renderQ(); } });
    area.querySelector('#mk-next').addEventListener('click', () => { if (idx < qs.length - 1) { idx++; renderQ(); } else finish(); });
  }

  function finish() {
    stopClock();
    const over = secs > MOCK.totalMins * 60;
    area.innerHTML = `
      <div class="ss-card" style="margin:10px 0">
        <h3 style="margin:0 0 8px;color:var(--text-primary)">Interview complete</h3>
        <p style="font-size:13.5px;color:var(--text-secondary)">You finished in <b>${fmt(secs)}</b> ${over ? '(over the 45-minute budget — tighten your answers)' : '(within budget)'}.</p>
        <p style="font-size:13.5px;color:var(--text-secondary)">Self-grade each answer against the model: did you hit the key points, or ramble/miss the senior framing? Re-run focusing on phases you felt shaky on.</p>
        <button class="ss-btn primary" id="mk-again" style="margin-top:6px">⟲ Restart</button>
      </div>`;
    area.querySelector('#mk-again').addEventListener('click', reset);
  }

  function begin() { idx = 0; secs = 0; clockEl.style.color = ''; clockEl.textContent = '0:00'; startClock(); renderQ(); startBtn.textContent = 'Restart ▶'; }
  function reset() { stopClock(); idx = -1; secs = 0; clockEl.style.color = ''; clockEl.textContent = '0:00'; posEl.textContent = `— / ${qs.length}`; area.innerHTML = ''; pauseBtn.disabled = true; startBtn.textContent = 'Start interview ▶'; }

  startBtn.addEventListener('click', begin);
  pauseBtn.addEventListener('click', () => { if (timer) { stopClock(); pauseBtn.textContent = 'Resume'; } else { startClock(); } });
  container.querySelector('#mk-reset').addEventListener('click', reset);

  return () => stopClock();
}

export default { mount };
