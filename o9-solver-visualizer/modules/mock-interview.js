// mock-interview.js — "Mock Interview": a timed simulator that draws a random
// 8-question set from the aggregated interview bank, one at a time, with a
// running timer, a reveal, and a self-rating persisted to the progress store.
import { ALL_QUESTIONS } from '../data/interview-bank.js';
import { record } from '../data/progress-store.js';

const SET_SIZE = 8;
const RATINGS = [
  { key: 'got', label: '✅ Got it', color: '#10B981' },
  { key: 'shaky', label: '🤔 Shaky', color: '#F59E0B' },
  { key: 'missed', label: '❌ Missed', color: '#EF4444' },
];

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function fmt(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function mount(container) {
  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">Practice</div>
        <h1 class="module-title">Mock Interview</h1>
        <p class="module-subtitle">${SET_SIZE} questions, drawn at random from the full bank, one at a time. Answer out loud, reveal the model answer, rate yourself. The clock is running.</p>
      </div>
      <div class="scroll-content" id="mi-root"></div>
    </div>`;

  const root = container.querySelector('#mi-root');

  let set = [];
  let idx = 0;
  let revealed = false;
  const ratings = {};      // qid -> rating key
  let startTs = 0;
  let timerRaf = null;

  function stopTimer() { if (timerRaf) { cancelAnimationFrame(timerRaf); timerRaf = null; } }
  function tickTimer() {
    const el = root.querySelector('#mi-timer');
    if (el) el.textContent = fmt(Date.now() - startTs);
    timerRaf = requestAnimationFrame(tickTimer);
  }

  function renderStart() {
    stopTimer();
    root.innerHTML = `
      <div class="canvas-explainer" style="text-align:center">
        <h3>Ready?</h3>
        <p>You'll get ${SET_SIZE} random questions from across all ${ALL_QUESTIONS.length} in the course. Treat it like the real thing: say your answer before you reveal the model one.</p>
        <button class="ctrl-btn" id="mi-start" style="margin-top:14px;font-size:15px;padding:10px 22px">▶ Start mock interview</button>
      </div>`;
    root.querySelector('#mi-start').addEventListener('click', begin);
  }

  function begin() {
    set = shuffle(ALL_QUESTIONS).slice(0, SET_SIZE);
    idx = 0; revealed = false;
    Object.keys(ratings).forEach(k => delete ratings[k]);
    startTs = Date.now();
    stopTimer(); tickTimer();
    renderQuestion();
  }

  function renderQuestion() {
    const item = set[idx];
    revealed = revealed && false; // reset per nav below sets explicitly
    root.innerHTML = `
      <div class="mi-bar" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px">
        <span class="ctrl-label" style="font-weight:700">Question ${idx + 1} / ${SET_SIZE}</span>
        <span class="ctrl-label">⏱ <span id="mi-timer">${fmt(Date.now() - startTs)}</span></span>
        <span class="ctrl-label" style="margin-left:auto">${esc(item.label)}</span>
      </div>
      <div class="mi-progress" style="height:6px;background:var(--surface2,#111827);border-radius:4px;overflow:hidden;margin-bottom:18px">
        <div style="height:100%;width:${((idx) / SET_SIZE) * 100}%;background:var(--accent,#6366f1);transition:width .3s"></div>
      </div>
      <div class="info-card" style="border-left:3px solid var(--accent,#6366f1);padding:18px 20px;margin-bottom:16px">
        <div style="font-size:12px;color:var(--text2,#94a3b8);margin-bottom:6px">${esc(item.group)}</div>
        <div style="font-size:16px;font-weight:600;line-height:1.55;color:var(--text,#e2e8f0)">${esc(item.q)}</div>
      </div>
      <div id="mi-answer"></div>
      <div class="mi-controls" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px">
        <button class="ctrl-btn" id="mi-prev" ${idx === 0 ? 'disabled' : ''}>◀ Prev</button>
        <button class="ctrl-btn" id="mi-reveal">💡 Reveal model answer</button>
        <button class="ctrl-btn" id="mi-next">${idx === SET_SIZE - 1 ? 'Finish ▸' : 'Next ▶'}</button>
        <button class="ctrl-btn" id="mi-restart" style="margin-left:auto">↺ Restart</button>
      </div>`;

    const ansHost = root.querySelector('#mi-answer');
    const drawAnswer = () => {
      const chosen = ratings[item.id];
      ansHost.innerHTML = `
        <div class="info-card" style="border-left:3px solid #10B981;padding:16px 18px">
          <div style="font-weight:700;color:#34D399;margin-bottom:8px">Model answer</div>
          <div style="line-height:1.65;color:var(--text2,#cbd5e1)">${item.a}</div>
          <div style="margin-top:12px;padding:9px 12px;background:rgba(99,102,241,0.12);border-radius:8px;font-size:13px;color:var(--text,#e2e8f0)"><strong>💬 Say it:</strong> ${esc(item.tip)}</div>
          <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            <span class="ctrl-label">Rate yourself:</span>
            ${RATINGS.map(r => `<button class="ctrl-btn mi-rate" data-rate="${r.key}" style="${chosen === r.key ? `background:${r.color};border-color:${r.color};color:#06240f` : ''}">${r.label}</button>`).join('')}
          </div>
        </div>`;
      ansHost.querySelectorAll('.mi-rate').forEach(b => b.addEventListener('click', () => {
        ratings[item.id] = b.dataset.rate;
        try { record('mock', item.id, { rated: b.dataset.rate, moduleId: item.moduleId }); } catch (e) {}
        drawAnswer();
      }));
    };
    if (revealed) drawAnswer();

    root.querySelector('#mi-reveal').addEventListener('click', () => { revealed = true; drawAnswer(); });
    root.querySelector('#mi-prev').addEventListener('click', () => { if (idx > 0) { idx--; revealed = !!ratings[set[idx].id]; renderQuestion(); } });
    root.querySelector('#mi-next').addEventListener('click', () => {
      if (idx === SET_SIZE - 1) { renderSummary(); return; }
      idx++; revealed = !!ratings[set[idx].id]; renderQuestion();
    });
    root.querySelector('#mi-restart').addEventListener('click', begin);
  }

  function renderSummary() {
    stopTimer();
    const elapsed = Date.now() - startTs;
    const tally = RATINGS.map(r => ({ ...r, n: set.filter(q => ratings[q.id] === r.key).length }));
    const unrated = set.filter(q => !ratings[q.id]).length;
    root.innerHTML = `
      <div class="canvas-explainer" style="text-align:center">
        <h3>Mock interview complete</h3>
        <p>${SET_SIZE} questions in <strong>${fmt(elapsed)}</strong>.</p>
      </div>
      <div class="info-grid" style="margin-top:12px">
        ${tally.map(r => `
          <div class="info-card" style="border-left:3px solid ${r.color};text-align:center">
            <div style="font-size:30px;font-weight:800;color:${r.color}">${r.n}</div>
            <div class="info-card-title" style="justify-content:center">${esc(r.label)}</div>
          </div>`).join('')}
        ${unrated ? `<div class="info-card" style="border-left:3px solid #64748B;text-align:center"><div style="font-size:30px;font-weight:800;color:#94a3b8">${unrated}</div><div class="info-card-title" style="justify-content:center">Unrated</div></div>` : ''}
      </div>
      <div style="display:flex;gap:10px;justify-content:center;margin-top:20px;flex-wrap:wrap">
        <button class="ctrl-btn" id="mi-again" style="font-size:15px;padding:10px 22px">↺ New set of ${SET_SIZE}</button>
        <a class="ctrl-btn" href="#interview" style="text-decoration:none;display:inline-flex;align-items:center">📚 Browse the full bank</a>
      </div>`;
    root.querySelector('#mi-again').addEventListener('click', begin);
  }

  renderStart();
  return () => stopTimer();
}
