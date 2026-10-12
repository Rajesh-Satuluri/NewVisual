import { createModuleShell } from '../components/module-shell.js';
import { runIBPL, loadDataset } from '../lib/ibpl-sim.js';
import { createExerciseSet, initExerciseSet } from '../components/exercise.js';

const PRESETS = [
  { label: 'Forecast by SKU (CWV)', ds: 'cat-forecast',
    code: `Select ([Item].[SKU] * {Measure.[Forecast Quantity]})\nwhere { Version.[Version Name].filter(#.Key == 0) }\norderby Measure.[Forecast Quantity] desc;` },
  { label: 'Forget the Version (0 rows)', ds: 'cat-forecast',
    code: `Select ([Item].[SKU] * {Measure.[Forecast Quantity]});` },
  { label: 'BAF % with SafeDivide', ds: 'cat-forecast',
    code: `Select ([Item].[SKU] * [Time].[Week] *\n  { SafeDivide(Measure.[BAF], Measure.[Forecast Quantity]) as Transient.BAFpct })\nwhere { Version.[Version Name].filter(#.Key == 0),\n        [Item].[Brand].filter(#.Name == "320D") }\norderby Transient.BAFpct desc;` },
  { label: 'Prior-week supply with @ LeadOffset', ds: 'cat-inventory',
    code: `Select ([Item].[SKU] * [Time].[Week] *\n  { Measure.[Supply],\n    Measure.[Supply]@(Time.#.LeadOffset(-1)) as Transient.PrevSupply })\nwhere { Version.[Version Name].filter(#.Key == 0),\n        [Item].[SKU].filter(#.Name == "320D-Pump") };` },
  { label: 'Write: add BAF into Forecast (scope)', ds: 'cat-forecast',
    code: `scope: ([Version].[Version Name].filter(#.Key == 0)\n  * [Item].[SKU].filter(#.Name == "320D-Seal")\n  * [Time].[Week]);\n  Measure.[Forecast Quantity] =\n    Measure.[Forecast Quantity] + coalesce(Measure.[BAF], 0);\nend scope;` },
];

const EXERCISES = [
  {
    id: 'sbx-predict-version', type: 'predict', area: 'ibpl', difficulty: 1,
    competencyLabel: 'Select · Version', verify: 'verified',
    prompt: 'A teammate runs <code>Select ([Item].[SKU] * {Measure.[Forecast Quantity]})</code> with <b>no where clause</b>. What comes back?',
    options: [
      { text: 'A syntax error — where is required', why: 'IBPL does not require a where clause syntactically.' },
      { text: '0 rows — Version is a mandatory partition', correct: true, why: 'With no Version filter the query resolves to no partition, so it matches zero stored cells. A valid, empty result — not an error.' },
      { text: 'Every SKU across all versions summed together', why: 'Versions are never auto-summed; you must name one.' },
    ],
    explanation: 'Version partitions every fact. The fix is <code>where { Version.[Version Name].filter(#.Key == 0) }</code> for the Current Working View. This silent 0-row behaviour is the #1 beginner trap.',
    pitfalls: '"It errors out" — it does not; the danger is that it fails <i>silently</i>.',
  },
  {
    id: 'sbx-write-topn', type: 'write', area: 'ibpl', difficulty: 2, dataset: 'cat-forecast',
    competencyLabel: 'Select · orderby/limit', verify: 'simulated',
    prompt: 'Write a query that returns the <b>top 2 SKU×Week</b> cells by Forecast Quantity in the Current Working View. Run it and match the expected result.',
    starter: 'Select ([Item].[SKU] * [Time].[Week] * {Measure.[Forecast Quantity]})\nwhere {  }\norderby \nlimit ;',
    check: (res) => {
      if (!res.ok) return { correct: false, msg: '❌ ' + res.error };
      if (res.rows.length !== 2) return { correct: false, msg: `❌ Expected 2 rows, got ${res.rows.length}. Did you add <code>limit 2</code>?` };
      const top = res.rows[0];
      const sorted = res.rows.every((r, i, a) => i === 0 || (a[i - 1][2] ?? -Infinity) >= (r[2] ?? -Infinity));
      if (!sorted) return { correct: false, msg: '❌ Rows are not sorted descending — add <code>orderby Measure.[Forecast Quantity] desc</code>.' };
      if (!(top[2] >= 200)) return { correct: false, msg: '❌ The top value looks too low — check your Version filter and grain.' };
      return { correct: true, msg: `✅ Correct — top cell is ${top[0]} / ${top[1]} = ${top[2]}. (W01 sums DC-East 120 + DC-West 90 = 210.)` };
    },
    explanation: 'One working answer: <pre class="code">Select ([Item].[SKU] * [Time].[Week] * {Measure.[Forecast Quantity]})\nwhere { Version.[Version Name].filter(#.Key == 0) }\norderby Measure.[Forecast Quantity] desc limit 2;</pre> Because the grain is SKU×Week (no LC), the two Logistics Centers roll up — 320D-Pump W01 = 210.',
  },
  {
    id: 'sbx-fix-compare', type: 'fix', area: 'debug', difficulty: 2, dataset: 'cat-forecast',
    competencyLabel: 'Debug · == vs =', verify: 'simulated',
    prompt: 'This query is meant to return only the <b>320D-Pump</b> rows but returns everything. Fix it and run.',
    starter: 'Select ([Item].[SKU] * {Measure.[Forecast Quantity]})\nwhere { Version.[Version Name].filter(#.Key == 0),\n        [Item].[SKU].filter(#.Name = "320D-Pump") };',
    check: (res) => {
      if (!res.ok) return { correct: false, msg: '❌ ' + res.error };
      const onlyPump = res.rows.length > 0 && res.rows.every(r => String(r[0]) === '320D-Pump');
      return onlyPump
        ? { correct: true, msg: '✅ Fixed — only 320D-Pump returns. The filter needed <code>==</code> (compare), not <code>=</code> (assign).' }
        : { correct: false, msg: `❌ Still ${res.rows.length} row(s). The comparison operator in the member filter is wrong.` };
    },
    explanation: 'In IBPL <code>==</code> compares and <code>=</code> assigns. Inside a <code>.filter()</code> you are comparing, so it must be <code>#.Name == "320D-Pump"</code>.',
    pitfalls: 'Using <code>=</code> — in many languages that compares, but in IBPL it assigns and the predicate silently misbehaves.',
  },
  {
    id: 'sbx-predict-grain', type: 'predict', area: 'model', difficulty: 2,
    competencyLabel: 'Grain · roll-up', verify: 'simulated',
    prompt: 'The dataset stores 320D-Pump at <b>two</b> Logistics Centers in W01 (DC-East = 120, DC-West = 90). You select grain <code>[Item].[SKU] * [Time].[Week]</code> (no LC). What is the 320D-Pump / W01 Forecast?',
    options: [
      { text: '120 (just DC-East)', why: 'Dropping LC from the grain rolls up all LCs, not one.' },
      { text: '210 (DC-East + DC-West)', correct: true, why: 'Forecast Quantity is a Sum measure; omitting LC from the grain aggregates across it.' },
      { text: '105 (the average)', why: 'The aggregation policy here is Sum, not Avg.' },
    ],
    explanation: 'Measure grain is whatever you put in the Select scope. Omit a dimension and its members roll up by the measure’s aggregation policy — here Sum. This is exactly why "the same measure looks different at a different grain".',
  },
  {
    id: 'sbx-explain-safediv', type: 'explain', area: 'concept', difficulty: 1,
    competencyLabel: 'Null handling', verify: 'verified',
    prompt: 'Why do o9 modellers reach for <code>SafeDivide(a, b)</code> and <code>coalesce(x, 0)</code> so often? What breaks without them?',
    explanation: '<b>Nulls propagate.</b> In IBPL any arithmetic touching a null yields null — <code>null + 5 = null</code>, <code>null * 2 = null</code> — so a single missing cell can blank out a whole calculated column. <code>coalesce(x, 0)</code> substitutes a default so arithmetic survives. Division adds a second hazard: dividing by zero errors or produces garbage, so <code>SafeDivide(a, b)</code> returns null instead of blowing up when <code>b = 0</code>. Idiomatic pattern: <code>SafeDivide(coalesce(Measure.[BAF],0), Measure.[Forecast])</code>.',
    pitfalls: 'Assuming null behaves like 0 (it does not), or that <code>a/0</code> just returns 0.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Reference · Lab',
    title: 'IBPL Sandbox',
    subtitle: 'Run a documented subset of IBPL against a small CAT dataset and see real output. A deterministic simulator — not the o9 engine.',
    tabs: [
      { id: 'run', label: '▶ Live Query' },
      { id: 'data', label: '🗃️ Datasets' },
      { id: 'drill', label: '🧪 Warm-up Exercises' },
    ],
  });

  // ---- Live query tab ----
  const run = container.querySelector('#tab-run');
  run.innerHTML = `
    <div class="section-pad">
      <div class="sim-banner">⚙ <b>Simulated — documented subset.</b> Supports Select (where/orderby/limit), transients, coalesce/SafeDivide, @ LeadOffset, and regular <code>scope:</code> writes. Graph edges, recurrence seeding and other scope types are taught as predict/explain exercises, not executed.</div>
      <div class="sbx-presets">
        <label class="sbx-ds">Dataset
          <select id="sbx-dataset">
            <option value="cat-forecast">cat-forecast — Item × LC × Week</option>
            <option value="cat-inventory">cat-inventory — Item × Week (for @ LeadOffset)</option>
          </select>
        </label>
        <span class="sbx-preset-label">Presets:</span>
        <span id="sbx-preset-btns"></span>
      </div>
      <textarea id="sbx-code" class="ex-code" spellcheck="false" rows="7">${PRESETS[0].code}</textarea>
      <div class="ex-editor-tools">
        <button id="sbx-run" class="btn-mini">▶ Run</button>
        <button id="sbx-clear" class="btn-mini ghost">Clear</button>
      </div>
      <div id="sbx-out" class="ex-output" style="margin-top:12px"></div>
    </div>`;

  const ds = run.querySelector('#sbx-dataset');
  const code = run.querySelector('#sbx-code');
  const out = run.querySelector('#sbx-out');
  const presetWrap = run.querySelector('#sbx-preset-btns');
  presetWrap.innerHTML = PRESETS.map((p, i) => `<button class="sbx-preset" data-i="${i}">${p.label}</button>`).join('');

  const doRun = () => {
    const res = runIBPL(code.value, ds.value);
    out.innerHTML = renderResult(res);
  };
  const onPreset = (e) => {
    const b = e.target.closest('.sbx-preset');
    if (!b) return;
    const p = PRESETS[+b.dataset.i];
    code.value = p.code; ds.value = p.ds; doRun();
  };
  presetWrap.addEventListener('click', onPreset);
  run.querySelector('#sbx-run').addEventListener('click', doRun);
  run.querySelector('#sbx-clear').addEventListener('click', () => { code.value = ''; out.innerHTML = ''; });
  doRun();

  // ---- Datasets tab ----
  const dataTab = container.querySelector('#tab-data');
  dataTab.innerHTML = `<div class="section-pad">${datasetCard('cat-forecast')}${datasetCard('cat-inventory')}</div>`;

  // ---- Exercises tab ----
  const drill = container.querySelector('#tab-drill');
  drill.innerHTML = `<div class="section-pad">${createExerciseSet(EXERCISES, { intro: 'Five warm-ups spanning the six competency areas. Solving them updates your competency bars on the Home page.' })}</div>`;
  const cleanupEx = initExerciseSet(drill, EXERCISES);

  return () => {
    presetWrap.removeEventListener('click', onPreset);
    if (cleanupEx) cleanupEx();
  };
}

function renderResult(res) {
  const banner = `<div class="sim-banner">⚙ Simulated — documented subset, not the real o9 engine.</div>`;
  if (!res.ok) return banner + `<div class="sim-err">⚠️ ${escapeHtml(res.error)}</div>`;
  if (!res.rows.length) return banner + `<div class="sim-empty">0 rows — ${escapeHtml(res.note || '')}</div>`;
  return banner + `
    <table class="o9-table sim-table">
      <thead><tr>${res.columns.map(c => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead>
      <tbody>${res.rows.map(r => `<tr>${r.map(v => `<td>${v === null || v === undefined ? '<span class="sim-null">null</span>' : escapeHtml(v)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>
    <div class="sim-note">${escapeHtml(res.note || '')}</div>`;
}

function datasetCard(id) {
  const d = loadDataset(id);
  const dims = Object.entries(d.dims).map(([k, lv]) => `<tr><td><b>${k}</b></td><td>${lv.map(l => `<code>${l}</code>`).join(' · ')}</td></tr>`).join('');
  const sample = d.rows.slice(0, 4);
  const mcols = d.measures;
  const dcols = Object.keys(d.dims).filter(x => x !== 'Version');
  const head = [...dcols, ...mcols];
  const rows = sample.map(r => {
    const dvals = dcols.map(dim => Object.values(r[dim] || {}).join(' / '));
    const mvals = mcols.map(m => r.measures?.[m] ?? '∅');
    return `<tr>${[...dvals, ...mvals].map(v => `<td>${escapeHtml(v)}</td>`).join('')}</tr>`;
  }).join('');
  return `
    <div class="card" style="margin-bottom:16px">
      <h4>🗃️ ${escapeHtml(d.label)}</h4>
      <div class="code-cap">Dimensions &amp; levels</div>
      <table class="o9-table" style="margin:0 0 12px"><tbody>${dims}</tbody></table>
      <div class="code-cap">Measures: ${mcols.map(m => `<code>${escapeHtml(m)}</code>`).join(' · ')}</div>
      <div class="code-cap">Sample rows (first 4)</div>
      <table class="o9-table"><thead><tr>${head.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>
    </div>`;
}

function escapeHtml(s) { return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
