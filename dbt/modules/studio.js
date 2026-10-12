// Coding Studio — real, in-browser SQL practice on the e-commerce dataset.
// Genuine execution via DuckDB-WASM (components/duckdb-engine.js). Learners
// write SQL, Run it for real, and Check their result against a reference
// solution (result-set comparison). Progress (solved ids) persists locally.
import { EXERCISES, TOPICS } from '../data/sql-exercises.js';
import { run, resultsEqual, initEngine, engineStatus } from '../components/duckdb-engine.js';
import { injectCodeEnhancements } from '../components/module-shell.js';
import { getNavItem } from '../components/nav.js';

const SCHEMA = [
  { t:'raw_customers',   c:'customer_id, name, country, signup_date' },
  { t:'raw_products',    c:'product_id, sku, category, unit_price' },
  { t:'raw_orders',      c:'order_id, customer_id, status, order_date, updated_at  (order 1004 double-loaded)' },
  { t:'raw_order_items', c:'order_id, product_id, quantity' },
  { t:'raw_payments',    c:'payment_id, order_id, amount, paid_at  (order 1001 paid twice)' },
  { t:'raw_refunds',     c:'refund_id, order_id, amount, refunded_at' },
];

const SOLVED_KEY = 'dbt-studio-solved';
const loadSolved = () => { try { return new Set(JSON.parse(localStorage.getItem(SOLVED_KEY) || '[]')); } catch { return new Set(); } };
const saveSolved = (s) => { try { localStorage.setItem(SOLVED_KEY, JSON.stringify([...s])); } catch {} };

const esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const DIFFS = { beginner:'#3B82F6', intermediate:'#06B6D4', advanced:'#FF694B' };

export function mount(container) {
  const solved = loadSolved();
  let currentId = EXERCISES[0].id;
  let hintsShown = 0;

  container.innerHTML = `
    <div class="module-shell">
      <div class="module-hero">
        <div class="module-badge">🧪 Coding Studio · <span class="studio-exec">Actual execution — DuckDB-WASM in your browser</span></div>
        <h2 class="module-title">Write real SQL. Run it for real.</h2>
        <p class="module-subtitle">Every query below runs against a live in-browser DuckDB loaded with the e-commerce dataset — no backend, no simulation. Pick a problem, write SQL, and <strong>Check</strong> compares your result to a reference solution.</p>
      </div>

      <div class="studio-grid">
        <aside class="studio-list">
          <div class="studio-filters">
            <select class="studio-topic"><option value="">All topics</option>${TOPICS.map(t=>`<option>${t}</option>`).join('')}</select>
            <select class="studio-diff">
              <option value="">All levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div class="studio-progress"><span class="studio-solved-count">${solved.size}</span> / ${EXERCISES.length} solved</div>
          <div class="studio-items"></div>
        </aside>

        <section class="studio-work">
          <div class="studio-prompt"></div>

          <div class="studio-editor-wrap">
            <div class="studio-editor-bar">
              <span class="studio-eng-status" data-state="idle">engine: not loaded (loads on first run)</span>
              <div class="studio-actions">
                <button class="btn btn-ghost studio-reset" type="button">Reset</button>
                <button class="btn btn-secondary studio-run" type="button">▶ Run</button>
                <button class="btn btn-primary studio-check" type="button">✓ Check</button>
              </div>
            </div>
            <textarea class="studio-editor" spellcheck="false" aria-label="SQL editor"></textarea>
          </div>

          <div class="studio-verdict" hidden></div>
          <div class="studio-output"><div class="studio-output-empty">Run a query to see results here.</div></div>

          <details class="studio-hints">
            <summary>Hints &amp; help</summary>
            <div class="studio-hints-body"></div>
          </details>

          <details class="studio-schema">
            <summary>Dataset schema (6 tables)</summary>
            <table class="studio-schema-table"><tbody>
              ${SCHEMA.map(s=>`<tr><td class="studio-schema-t">${s.t}</td><td class="studio-schema-c">${esc(s.c)}</td></tr>`).join('')}
            </tbody></table>
          </details>
        </section>
      </div>
    </div>`;

  const $ = (sel) => container.querySelector(sel);
  const itemsEl = $('.studio-items');
  const promptEl = $('.studio-prompt');
  const editor = $('.studio-editor');
  const outputEl = $('.studio-output');
  const verdictEl = $('.studio-verdict');
  const hintsBody = $('.studio-hints-body');
  const engStatusEl = $('.studio-eng-status');
  const topicSel = $('.studio-topic');
  const diffSel = $('.studio-diff');

  function visibleExercises() {
    return EXERCISES.filter(e =>
      (!topicSel.value || e.topic === topicSel.value) &&
      (!diffSel.value || e.difficulty === diffSel.value));
  }

  function renderList() {
    const list = visibleExercises();
    itemsEl.innerHTML = list.length ? list.map(e => `
      <button class="studio-item ${e.id===currentId?'active':''} ${solved.has(e.id)?'done':''}" data-id="${e.id}">
        <span class="studio-item-dot" style="background:${DIFFS[e.difficulty]}"></span>
        <span class="studio-item-title">${esc(e.title)}</span>
        <span class="studio-item-topic">${e.topic}</span>
        ${solved.has(e.id)?'<span class="studio-item-check">✓</span>':''}
      </button>`).join('') : '<div class="studio-empty">No exercises match.</div>';
  }

  function current() { return EXERCISES.find(e => e.id === currentId); }

  function renderPrompt() {
    const e = current();
    hintsShown = 0;
    const theory = e.theory ? getNavItem(e.theory) : null;
    promptEl.innerHTML = `
      <div class="studio-prompt-head">
        <span class="studio-chip" style="--c:${DIFFS[e.difficulty]}">${e.difficulty}</span>
        <span class="studio-chip-topic">${e.topic}</span>
        <span class="studio-time">~${e.time} min</span>
        ${solved.has(e.id)?'<span class="studio-chip-solved">✓ solved</span>':''}
      </div>
      <h3 class="studio-title">${esc(e.title)}</h3>
      <p class="studio-scenario">${esc(e.scenario)}</p>
      <div class="studio-task"><strong>Task.</strong> ${esc(e.statement)}</div>
      <div class="studio-tables">Tables: ${e.tables.map(t=>`<code>${t}</code>`).join(' ')}</div>
      ${theory ? `<a class="studio-theory" href="#${e.theory}">↳ Related: ${theory.icon} ${theory.title}</a>` : ''}`;
    editor.value = e.starter;
    verdictEl.hidden = true;
    outputEl.innerHTML = '<div class="studio-output-empty">Run a query to see results here.</div>';
    hintsBody.innerHTML = `<p class="studio-hint-lead">Stuck? Reveal hints one at a time.</p>
      <button class="btn btn-ghost studio-hint-next" type="button">Show a hint</button>
      <ol class="studio-hint-list"></ol>
      <div class="studio-mistake"><strong>Common mistake:</strong> ${esc(e.commonWrong)}</div>
      <button class="btn btn-ghost studio-reveal-sol" type="button">Reveal reference solution</button>
      <div class="studio-sol" hidden></div>
      <div class="studio-followup"><strong>Interview follow-up:</strong> ${esc(e.followup)}</div>`;
  }

  function setEng() {
    const { status, error } = engineStatus();
    const map = {
      idle:'engine: not loaded (loads on first run)',
      loading:'engine: loading DuckDB-WASM…',
      ready:'engine: ready ✓ (real DuckDB)',
      error:'engine: unavailable — ' + (error||'offline') + '. Problem text, hints and the reference solution still work.',
    };
    engStatusEl.textContent = map[status] || '';
    engStatusEl.dataset.state = status;
  }

  function renderTable(res) {
    if (!res.columns.length) return '<div class="studio-output-empty">(no columns)</div>';
    const head = res.columns.map(c=>`<th>${esc(c)}</th>`).join('');
    const body = res.rows.slice(0,200).map(r=>`<tr>${r.map(c=>`<td>${c==null?'<span class="studio-null">NULL</span>':esc(c)}</td>`).join('')}</tr>`).join('');
    const more = res.rows.length>200 ? `<div class="studio-more">…${res.rows.length-200} more rows</div>` : '';
    return `<div class="studio-table-scroll"><table class="studio-result"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>
      <div class="studio-rowcount">${res.rows.length} row${res.rows.length===1?'':'s'}</div>${more}`;
  }

  async function doRun() {
    verdictEl.hidden = true;
    outputEl.innerHTML = '<div class="studio-running">Running…</div>';
    setEng();
    try {
      const res = await run(editor.value);
      setEng();
      outputEl.innerHTML = renderTable(res);
    } catch (err) {
      setEng();
      outputEl.innerHTML = `<div class="studio-error"><strong>Query error.</strong><br>${esc(err.message||err)}</div>`;
    }
  }

  async function doCheck() {
    const e = current();
    verdictEl.hidden = true;
    outputEl.innerHTML = '<div class="studio-running">Running your query and the reference solution…</div>';
    setEng();
    try {
      const mine = await run(editor.value);
      const ref = await run(e.solution);
      setEng();
      outputEl.innerHTML = renderTable(mine);
      const pass = resultsEqual(mine, ref, e.orderMatters);
      verdictEl.hidden = false;
      if (pass) {
        verdictEl.className = 'studio-verdict ok';
        verdictEl.innerHTML = '✓ Correct — your result matches the reference solution.';
        if (!solved.has(e.id)) { solved.add(e.id); saveSolved(solved); renderList(); $('.studio-solved-count').textContent = solved.size; renderPrompt(); }
      } else {
        verdictEl.className = 'studio-verdict bad';
        verdictEl.innerHTML = `✗ Not matching yet — expected ${ref.rows.length} row(s)${e.orderMatters?' in a specific order':''}, your query returned ${mine.rows.length}. Check grain, filters and ordering.`;
      }
    } catch (err) {
      setEng();
      outputEl.innerHTML = `<div class="studio-error"><strong>Query error.</strong><br>${esc(err.message||err)}</div>`;
    }
  }

  // ── events ────────────────────────────────────────────────────────────────
  itemsEl.addEventListener('click', ev => {
    const btn = ev.target.closest('.studio-item'); if (!btn) return;
    currentId = btn.dataset.id; renderList(); renderPrompt();
  });
  topicSel.addEventListener('change', () => { const v=visibleExercises(); if (v.length && !v.some(e=>e.id===currentId)) { currentId=v[0].id; renderPrompt(); } renderList(); });
  diffSel.addEventListener('change', () => { const v=visibleExercises(); if (v.length && !v.some(e=>e.id===currentId)) { currentId=v[0].id; renderPrompt(); } renderList(); });
  $('.studio-run').addEventListener('click', doRun);
  $('.studio-check').addEventListener('click', doCheck);
  $('.studio-reset').addEventListener('click', () => { editor.value = current().starter; verdictEl.hidden = true; });
  editor.addEventListener('keydown', ev => {
    if ((ev.ctrlKey||ev.metaKey) && ev.key === 'Enter') { ev.preventDefault(); doRun(); }
    if (ev.key === 'Tab') { ev.preventDefault(); const s=editor.selectionStart, en=editor.selectionEnd; editor.value = editor.value.slice(0,s)+'  '+editor.value.slice(en); editor.selectionStart=editor.selectionEnd=s+2; }
  });
  hintsBody.addEventListener('click', ev => {
    if (ev.target.closest('.studio-hint-next')) {
      const e = current(); const list = hintsBody.querySelector('.studio-hint-list');
      if (hintsShown < e.hints.length) { const li=document.createElement('li'); li.textContent=e.hints[hintsShown++]; list.appendChild(li); }
      if (hintsShown >= e.hints.length) ev.target.closest('.studio-hint-next').disabled = true;
    }
    if (ev.target.closest('.studio-reveal-sol')) {
      const e = current(); const box = hintsBody.querySelector('.studio-sol');
      box.hidden = false; box.innerHTML = `<div class="code-block" data-lang="sql">${esc(e.solution)}</div>`;
      injectCodeEnhancements(box); ev.target.closest('.studio-reveal-sol').disabled = true;
    }
  });

  // Kick off engine load in the background so the first Run is fast.
  initEngine().then(setEng).catch(setEng);

  renderList();
  renderPrompt();
  setEng();
}
