// Config Lab — Jinja templating + YAML/config repair with real validation.
// Jinja renders via a labeled teaching evaluator (components/jinja-eval.js);
// YAML parses for real (components/yaml-lint.js: js-yaml or validated fallback).
// Teaches the ladder: valid → parsed → compiled → executed → correct.
import { CONFIG_EXERCISES } from '../data/config-exercises.js';
import { render as jinja, JinjaError } from '../components/jinja-eval.js';
import { parseYaml, checkAsserts } from '../components/yaml-lint.js';
import { injectCodeEnhancements } from '../components/module-shell.js';
import { getNavItem } from '../components/nav.js';

const LADDER = [
  { id:'valid',    label:'Syntactically valid', hint:'The text is well-formed SQL/YAML/Jinja.' },
  { id:'parsed',   label:'Parsed',    hint:'dbt reads the project into a manifest — YAML keys resolve.' },
  { id:'compiled', label:'Compiled',  hint:'Jinja renders to plain SQL — refs and logic resolve.' },
  { id:'executed', label:'Executed',  hint:'The SQL runs on the warehouse without error.' },
  { id:'correct',  label:'Business-correct', hint:'The result is the right answer, not just a successful run.' },
];
const DIFFS = { beginner:'#3B82F6', intermediate:'#06B6D4', advanced:'#FF694B' };
const SOLVED_KEY = 'dbt-configlab-solved';
const loadSolved = () => { try { return new Set(JSON.parse(localStorage.getItem(SOLVED_KEY)||'[]')); } catch { return new Set(); } };
const saveSolved = (s) => { try { localStorage.setItem(SOLVED_KEY, JSON.stringify([...s])); } catch {} };
const esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

export function mount(container) {
  const solved = loadSolved();
  let currentId = CONFIG_EXERCISES[0].id;
  let hintsShown = 0;

  container.innerHTML = `
    <div class="module-shell">
      <div class="module-hero">
        <div class="module-badge">⚙️ Config Lab · <span class="cfg-exec">Real YAML parse · teaching Jinja evaluator</span></div>
        <h2 class="module-title">Jinja &amp; YAML — write it, render it, repair it</h2>
        <p class="module-subtitle">Template real dbt Jinja and fix broken config files, with genuine validation. Watch where each exercise sits on the path from <em>valid</em> text to a <em>business-correct</em> result.</p>
      </div>

      <div class="cfg-ladder">
        ${LADDER.map(s=>`<div class="cfg-ladder-step" data-step="${s.id}"><span class="cfg-ladder-dot"></span><span class="cfg-ladder-label">${s.label}</span><span class="cfg-ladder-hint">${s.hint}</span></div>`).join('<span class="cfg-ladder-arrow">→</span>')}
      </div>

      <div style="margin:0 0 18px">
        <p style="padding:12px 14px;background:var(--surface-2);border-left:3px solid var(--accent);border-radius:8px;font-size:14px;margin:0">
          <strong>🧠 First principles —</strong> that ladder <em>is</em> the two-phase model: Jinja <strong>renders</strong> to SQL first (dbt, no warehouse), then the warehouse <strong>executes</strong> it. "Valid" and "compiled" are the render phase; "executed" and "correct" are the run phase — and Jinja can never branch on a value from your data, because at render time there are no rows yet. <a href="#concepts" style="color:var(--accent);font-weight:600">Core Concepts → Jinja &amp; Templating</a>.
        </p>
      </div>

      <div class="studio-grid">
        <aside class="studio-list">
          <div class="studio-filters">
            <select class="cfg-kind"><option value="">All kinds</option><option value="jinja">Jinja</option><option value="yaml">YAML</option></select>
          </div>
          <div class="studio-progress"><span class="cfg-solved-count">${solved.size}</span> / ${CONFIG_EXERCISES.length} solved</div>
          <div class="cfg-items"></div>
        </aside>

        <section class="studio-work">
          <div class="cfg-prompt"></div>
          <div class="studio-editor-wrap">
            <div class="studio-editor-bar">
              <span class="cfg-engine"></span>
              <div class="studio-actions">
                <button class="btn btn-ghost cfg-reset" type="button">Reset</button>
                <button class="btn btn-secondary cfg-run" type="button">▶ Render</button>
                <button class="btn btn-primary cfg-check" type="button">✓ Check</button>
              </div>
            </div>
            <textarea class="studio-editor cfg-editor" spellcheck="false" aria-label="Config editor. Press Escape then Tab to move focus out of the editor."></textarea>
          </div>
          <div class="studio-verdict cfg-verdict" hidden></div>
          <div class="studio-output cfg-output"><div class="studio-output-empty">Render or Check to see the result.</div></div>
          <details class="studio-hints cfg-hints"><summary>Hints &amp; help</summary><div class="studio-hints-body cfg-hints-body"></div></details>
        </section>
      </div>
    </div>`;

  const $ = (s) => container.querySelector(s);
  const itemsEl = $('.cfg-items'), promptEl = $('.cfg-prompt'), editor = $('.cfg-editor');
  const outputEl = $('.cfg-output'), verdictEl = $('.cfg-verdict'), hintsBody = $('.cfg-hints-body');
  const kindSel = $('.cfg-kind'), engineEl = $('.cfg-engine');
  const current = () => CONFIG_EXERCISES.find(e => e.id === currentId);
  const visible = () => CONFIG_EXERCISES.filter(e => !kindSel.value || e.kind === kindSel.value);

  function renderList() {
    const list = visible();
    itemsEl.innerHTML = list.map(e => `
      <button class="studio-item ${e.id===currentId?'active':''} ${solved.has(e.id)?'done':''}" data-id="${e.id}">
        <span class="studio-item-dot" style="background:${DIFFS[e.difficulty]}"></span>
        <span class="studio-item-title">${esc(e.title)}</span>
        <span class="studio-item-topic">${e.kind.toUpperCase()} · ${e.topic}</span>
        ${solved.has(e.id)?'<span class="studio-item-check">✓</span>':''}
      </button>`).join('');
  }

  function renderPrompt() {
    const e = current(); hintsShown = 0;
    container.querySelectorAll('.cfg-ladder-step').forEach(s => s.classList.toggle('on', s.dataset.step === e.ladder));
    const theory = e.theory ? getNavItem(e.theory) : null;
    $('.cfg-run').textContent = e.kind === 'jinja' ? '▶ Render' : '▶ Validate';
    promptEl.innerHTML = `
      <div class="studio-prompt-head">
        <span class="studio-chip" style="--c:${DIFFS[e.difficulty]}">${e.difficulty}</span>
        <span class="studio-chip-topic">${e.kind.toUpperCase()} · ${e.topic}</span>
        <span class="studio-time">~${e.time} min</span>
        ${solved.has(e.id)?'<span class="studio-chip-solved">✓ solved</span>':''}
      </div>
      <h3 class="studio-title">${esc(e.title)}</h3>
      <p class="studio-scenario">${esc(e.scenario)}</p>
      <div class="studio-task"><strong>Task.</strong> ${esc(e.statement)}</div>
      ${theory ? `<a class="studio-theory" href="#${e.theory}">↳ Related: ${theory.icon} ${theory.title}</a>` : ''}`;
    editor.value = e.starter;
    verdictEl.hidden = true;
    outputEl.innerHTML = '<div class="studio-output-empty">Render or Check to see the result.</div>';
    engineEl.textContent = e.kind === 'jinja' ? 'teaching Jinja evaluator (not dbt runtime)' : 'real YAML parse';
    hintsBody.innerHTML = `<p class="studio-hint-lead">Stuck? Reveal hints one at a time.</p>
      <button class="btn btn-ghost cfg-hint-next" type="button">Show a hint</button>
      <ol class="studio-hint-list"></ol>
      <div class="studio-mistake"><strong>Common mistake:</strong> ${esc(e.commonWrong)}</div>
      <button class="btn btn-ghost cfg-reveal-sol" type="button">Reveal reference solution</button>
      <div class="studio-sol cfg-sol" hidden></div>
      <div class="studio-followup"><strong>Interview follow-up:</strong> ${esc(e.followup)}</div>`;
  }

  function doRun() {
    const e = current(); verdictEl.hidden = true;
    if (e.kind === 'jinja') {
      const blocks = e.contexts.map((ctx, i) => {
        let out;
        try { out = jinja(editor.value, ctx); }
        catch (err) { return `<div class="cfg-render-block"><div class="cfg-ctx">context ${i+1}: ${esc(JSON.stringify(ctx))}</div><div class="studio-error">${esc(err.message)}</div></div>`; }
        return `<div class="cfg-render-block"><div class="cfg-ctx">context ${i+1}: ${esc(JSON.stringify(ctx))}</div><div class="code-block" data-lang="sql">${esc(out)}</div></div>`;
      }).join('');
      outputEl.innerHTML = `<div class="cfg-renders">${blocks}</div>`;
      injectCodeEnhancements(outputEl);
    } else {
      parseYaml(editor.value).then(res => {
        if (!res.ok) { outputEl.innerHTML = `<div class="studio-error"><strong>YAML parse error${res.line?` (line ${res.line})`:''}.</strong><br>${esc(res.error)}</div>`; return; }
        const checks = checkAsserts(res.data, e.asserts);
        outputEl.innerHTML = `<div class="cfg-parsed"><div class="cfg-parse-ok">Parsed with ${res.engine} ✓</div>
          <table class="cfg-assert-table"><tbody>${checks.map(c=>`<tr class="${c.pass?'ok':'bad'}"><td>${c.pass?'✓':'✗'}</td><td class="cfg-assert-path">${esc(c.path)}</td><td>${c.pass?'as expected':'got '+esc(JSON.stringify(c.actual))}</td></tr>`).join('')}</tbody></table></div>`;
      });
    }
  }

  function markSolved(e) {
    if (!solved.has(e.id)) { solved.add(e.id); saveSolved(solved); renderList(); $('.cfg-solved-count').textContent = solved.size; renderPrompt(); }
  }

  function doCheck() {
    const e = current(); verdictEl.hidden = false;
    if (e.kind === 'jinja') {
      let pass = true, reason = '';
      for (const ctx of e.contexts) {
        let mine, ref;
        try { mine = jinja(editor.value, ctx); } catch (err) { pass = false; reason = 'Your template errored: ' + err.message; break; }
        try { ref = jinja(e.solution, ctx); } catch { ref = null; }
        if (mine.replace(/\s+/g,' ').trim() !== (ref||'').replace(/\s+/g,' ').trim()) { pass = false; reason = 'Output differs from the reference for context ' + JSON.stringify(ctx); break; }
      }
      verdictEl.className = 'studio-verdict cfg-verdict ' + (pass?'ok':'bad');
      verdictEl.innerHTML = pass ? '✓ Correct — renders identically to the reference across every context.' : '✗ ' + esc(reason);
      doRun();
      if (pass) markSolved(e);
    } else {
      parseYaml(editor.value).then(res => {
        if (!res.ok) { verdictEl.className='studio-verdict cfg-verdict bad'; verdictEl.innerHTML = `✗ Does not parse${res.line?` (line ${res.line})`:''}: ${esc(res.error)}`; doRun(); return; }
        const checks = checkAsserts(res.data, e.asserts);
        const pass = checks.every(c => c.pass);
        verdictEl.className = 'studio-verdict cfg-verdict ' + (pass?'ok':'bad');
        verdictEl.innerHTML = pass ? '✓ Correct — parses and every required key is in the right place.' : `✗ ${checks.filter(c=>!c.pass).length} of ${checks.length} checks failed — see below.`;
        doRun();
        if (pass) markSolved(e);
      });
    }
  }

  itemsEl.addEventListener('click', ev => { const b = ev.target.closest('.studio-item'); if (!b) return; currentId = b.dataset.id; renderList(); renderPrompt(); });
  kindSel.addEventListener('change', () => { const v = visible(); if (v.length && !v.some(e=>e.id===currentId)) { currentId = v[0].id; renderPrompt(); } renderList(); });
  $('.cfg-run').addEventListener('click', doRun);
  $('.cfg-check').addEventListener('click', doCheck);
  $('.cfg-reset').addEventListener('click', () => { editor.value = current().starter; verdictEl.hidden = true; });
  // Tab indents, but Esc releases the trap so keyboard-only users can Tab out
  // of the editor (WCAG 2.1.2). Re-focusing re-arms indentation.
  let tabTraps = true;
  editor.addEventListener('focus', () => { tabTraps = true; });
  editor.addEventListener('keydown', ev => {
    if (ev.key === 'Escape') { tabTraps = false; return; }
    if (ev.key === 'Tab' && tabTraps) { ev.preventDefault(); const s=editor.selectionStart,en=editor.selectionEnd; editor.value=editor.value.slice(0,s)+'  '+editor.value.slice(en); editor.selectionStart=editor.selectionEnd=s+2; }
  });
  hintsBody.addEventListener('click', ev => {
    if (ev.target.closest('.cfg-hint-next')) {
      const e = current(), list = hintsBody.querySelector('.studio-hint-list');
      if (hintsShown < e.hints.length) { const li=document.createElement('li'); li.textContent=e.hints[hintsShown++]; list.appendChild(li); }
      if (hintsShown >= e.hints.length) ev.target.closest('.cfg-hint-next').disabled = true;
    }
    if (ev.target.closest('.cfg-reveal-sol')) {
      const e = current(), box = hintsBody.querySelector('.cfg-sol');
      box.hidden = false; box.innerHTML = `<div class="code-block" data-lang="${e.kind==='yaml'?'yaml':'sql'}">${esc(e.solution)}</div>`;
      injectCodeEnhancements(box); ev.target.closest('.cfg-reveal-sol').disabled = true;
    }
  });

  renderList(); renderPrompt();
}
