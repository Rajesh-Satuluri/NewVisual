// exercise.js — reusable exercise-runner for every module.
// Exercise types: mcq, predict (options), diagnose, fill, write, fix, explain.
// `write`/`fix` run against the documented-subset simulator and compare output.
// Records outcomes into the competency store.

import { runIBPL } from '../lib/ibpl-sim.js';
import { record } from './competency.js';

let SEQ = 0;

const DIFF = { 1: '🟢 Foundational', 2: '🟡 Intermediate', 3: '🔴 Advanced' };

function esc(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

function resultTable(res) {
  if (!res.ok) return `<div class="sim-err">⚠️ ${esc(res.error)}</div>`;
  if (!res.rows.length) return `<div class="sim-empty">0 rows — ${esc(res.note || '')}</div>`;
  return `
    <table class="o9-table sim-table">
      <thead><tr>${res.columns.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
      <tbody>${res.rows.map(r => `<tr>${r.map(v => `<td>${v === null || v === undefined ? '<span class="sim-null">null</span>' : esc(v)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>
    <div class="sim-note">${esc(res.note || '')}</div>`;
}

// Compare two result row-sets order-independently (numbers tolerant).
function rowsMatch(got, want) {
  if (!got || got.length !== want.length) return false;
  const norm = rows => rows.map(r => r.map(v => (typeof v === 'number' ? Math.round(v * 1e4) / 1e4 : v)).join('\u0001')).sort();
  const a = norm(got), b = norm(want);
  return a.every((v, i) => v === b[i]);
}

export function createExerciseSet(exercises, opts = {}) {
  const intro = opts.intro ? `<p class="lead">${opts.intro}</p>` : '';
  return `<div class="exset">${intro}${exercises.map(renderCard).join('')}</div>`;
}

function renderCard(ex) {
  const uid = ex.id || `ex${++SEQ}`;
  ex._uid = uid;
  const badge = `<span class="ex-diff">${DIFF[ex.difficulty] || ''}</span>`;
  const comp = ex.competencyLabel ? `<span class="ex-comp">${ex.competencyLabel}</span>` : '';
  const src = ex.verify === 'verified'
    ? `<span class="ex-src verified" title="Syntax verified against the IBPL quick reference">✔ verified</span>`
    : `<span class="ex-src sim" title="Runs on the documented-subset simulator, not the real o9 engine">⚙ simulated</span>`;

  let body = '';
  if (ex.type === 'mcq' || ex.type === 'predict' || ex.type === 'diagnose') {
    body = `<div class="ex-options" role="group">
      ${ex.options.map((o, i) => `<button class="ex-opt" data-i="${i}">${o.text}</button>`).join('')}
    </div>`;
  } else if (ex.type === 'fill') {
    body = `<div class="ex-fill">
      <input class="ex-input" type="text" placeholder="Type the missing part…" />
      <button class="ex-check btn-mini">Check</button>
    </div>`;
  } else if (ex.type === 'write' || ex.type === 'fix') {
    body = `
      <div class="ex-editor">
        <textarea class="ex-code" spellcheck="false" rows="${Math.min(10, (ex.starter || '').split('\n').length + 2)}">${esc(ex.starter || '')}</textarea>
        <div class="ex-editor-tools">
          <button class="ex-run btn-mini">▶ Run</button>
          <button class="ex-reset btn-mini ghost">↺ Reset</button>
          <span class="ex-dataset">dataset: <code>${esc(ex.dataset || 'cat-forecast')}</code></span>
        </div>
      </div>
      <div class="ex-output" hidden></div>`;
  } else if (ex.type === 'explain') {
    body = `<button class="ex-reveal btn-mini">Reveal model answer</button>`;
  }

  return `
    <div class="ex-card" data-type="${ex.type}" data-uid="${uid}">
      <div class="ex-top">
        <span class="ex-kind">${kindLabel(ex.type)}</span>${badge}${comp}${src}
      </div>
      <div class="ex-prompt">${ex.prompt}</div>
      ${ex.data ? `<div class="ex-data">${ex.data}</div>` : ''}
      ${body}
      <div class="ex-feedback" hidden></div>
      <div class="ex-explain" hidden>${ex.explanation || ''}${ex.pitfalls ? `<div class="ex-pitfall"><b>Common wrong answers:</b> ${ex.pitfalls}</div>` : ''}</div>
      <div class="ex-actions"><button class="ex-show-explain btn-link" hidden>Show explanation ▾</button></div>
    </div>`;
}

function kindLabel(t) {
  return ({ mcq: 'Multiple choice', predict: 'Predict the output', diagnose: 'Diagnose', fill: 'Complete the expression', write: 'Write a query', fix: 'Fix the query', explain: 'Explain' })[t] || t;
}

// Wire a container of exercise cards. `exercises` is the same array passed to createExerciseSet.
export function initExerciseSet(container, exercises) {
  const byUid = {};
  exercises.forEach(ex => { byUid[ex._uid || ex.id] = ex; });

  const handlers = [];
  const on = (el, evt, fn) => { el.addEventListener(evt, fn); handlers.push(() => el.removeEventListener(evt, fn)); };

  container.querySelectorAll('.ex-card').forEach(card => {
    const ex = byUid[card.dataset.uid];
    if (!ex) return;
    const feedback = card.querySelector('.ex-feedback');
    const explainBox = card.querySelector('.ex-explain');
    const showExplainBtn = card.querySelector('.ex-show-explain');
    const area = ex.area || 'concept';

    const reveal = (correct, msg) => {
      feedback.hidden = false;
      feedback.className = 'ex-feedback ' + (correct ? 'good' : 'bad');
      feedback.innerHTML = msg;
      if (explainBox.innerHTML.trim()) { showExplainBtn.hidden = false; }
      if (!ex._scored) { record(ex.id || ex._uid, area, correct); ex._scored = true; card.classList.add(correct ? 'solved' : 'tried'); }
    };

    if (showExplainBtn) on(showExplainBtn, 'click', () => {
      explainBox.hidden = !explainBox.hidden;
      showExplainBtn.textContent = explainBox.hidden ? 'Show explanation ▾' : 'Hide explanation ▴';
    });

    // option-based
    card.querySelectorAll('.ex-opt').forEach(btn => on(btn, 'click', () => {
      const i = +btn.dataset.i;
      const opt = ex.options[i];
      card.querySelectorAll('.ex-opt').forEach((b, j) => {
        b.disabled = true;
        if (ex.options[j].correct) b.classList.add('correct');
        else if (j === i) b.classList.add('wrong');
      });
      reveal(!!opt.correct, (opt.correct ? '✅ Correct. ' : '❌ Not quite. ') + (opt.why || ''));
    }));

    // fill
    const fillBtn = card.querySelector('.ex-check');
    if (fillBtn) on(fillBtn, 'click', () => {
      const val = card.querySelector('.ex-input').value.trim();
      const accepted = (ex.accept || []).map(a => a.toLowerCase().replace(/\s+/g, ''));
      const norm = val.toLowerCase().replace(/\s+/g, '');
      const correct = accepted.includes(norm);
      reveal(correct, correct ? '✅ Correct.' : `❌ Expected something like <code>${esc(ex.accept?.[0] || '')}</code>.`);
    });

    // write / fix (run simulator)
    const runBtn = card.querySelector('.ex-run');
    if (runBtn) {
      const ta = card.querySelector('.ex-code');
      const out = card.querySelector('.ex-output');
      on(runBtn, 'click', () => {
        const res = runIBPL(ta.value, ex.dataset || 'cat-forecast');
        out.hidden = false;
        out.innerHTML = `<div class="sim-banner">⚙ Simulated — documented subset of IBPL, not the real o9 engine.</div>${resultTable(res)}`;
        let correct = false, msg;
        if (typeof ex.check === 'function') { const v = ex.check(res); correct = v.correct; msg = v.msg; }
        else if (ex.expectedRows) { correct = res.ok && rowsMatch(res.rows, ex.expectedRows); msg = correct ? '✅ Output matches the expected result.' : '❌ Output does not match yet — compare row counts and values.'; }
        else { correct = res.ok; msg = res.ok ? '✅ Ran without error.' : '❌ ' + esc(res.error); }
        reveal(correct, msg);
      });
      const resetBtn = card.querySelector('.ex-reset');
      if (resetBtn) on(resetBtn, 'click', () => { ta.value = ex.starter || ''; out.hidden = true; });
    }

    // explain (self-grade)
    const revealBtn = card.querySelector('.ex-reveal');
    if (revealBtn) on(revealBtn, 'click', () => {
      explainBox.hidden = false;
      revealBtn.hidden = true;
      feedback.hidden = false;
      feedback.className = 'ex-feedback neutral';
      feedback.innerHTML = `Model answer shown. How did you do? <button class="sg btn-mini" data-ok="1">I had it</button> <button class="sg btn-mini ghost" data-ok="0">Need review</button>`;
      feedback.querySelectorAll('.sg').forEach(b => on(b, 'click', () => {
        const ok = b.dataset.ok === '1';
        if (!ex._scored) { record(ex.id || ex._uid, area, ok); ex._scored = true; card.classList.add(ok ? 'solved' : 'tried'); }
        feedback.innerHTML = ok ? '✅ Marked as known.' : '📌 Flagged for review.';
      }));
    });
  });

  return () => handlers.forEach(fn => fn());
}
