import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { runIBPL } from '../lib/ibpl-sim.js';
import { createExerciseSet, initExerciseSet } from '../components/exercise.js';

const PG_PRESETS = [
  { label:'Forecast by SKU (CWV)', ds:'cat-forecast', code:`Select ([Item].[SKU] * {Measure.[Forecast Quantity]})\nwhere { Version.[Version Name].filter(#.Key == 0) }\norderby Measure.[Forecast Quantity] desc;` },
  { label:'BAF % (SafeDivide)', ds:'cat-forecast', code:`Select ([Item].[SKU] * [Time].[Week] *\n  { SafeDivide(Measure.[BAF], Measure.[Forecast Quantity]) as Transient.BAFpct })\nwhere { Version.[Version Name].filter(#.Key == 0) };` },
  { label:'Member list (no measures)', ds:'cat-forecast', code:`Select ([Item].[SKU])\nwhere { Version.[Version Name].filter(#.Key == 0) };` },
  { label:'Prior-week supply (@ LeadOffset)', ds:'cat-inventory', code:`Select ([Item].[SKU] * [Time].[Week] *\n  { Measure.[Supply]@(Time.#.LeadOffset(-1)) as Transient.PrevSupply })\nwhere { Version.[Version Name].filter(#.Key == 0) };` },
];

const PG_EXERCISES = [
  { id:'pg-predict-select', type:'predict', area:'ibpl', difficulty:1, competencyLabel:'Predict output', verify:'simulated',
    prompt:'Grain is <code>[Item].[SKU]</code> only (no LC, no Week). For the CWV, how many rows does Forecast Quantity return, and is 330-Drive’s value 410?',
    options:[ {text:'4 rows; 330-Drive = 410', correct:true, why:'Four SKUs exist; 330-Drive = 200 + 210 across weeks/LCs = 410.'}, {text:'8 rows; 330-Drive = 200', why:'8 rows is SKU×Week; at SKU grain the weeks roll up.'}, {text:'0 rows', why:'Only if the Version filter were missing.'} ],
    explanation:'Run it in the editor above to confirm. Grain controls both the row count and the magnitude (Sum roll-up).' },

  { id:'pg-fill-version', type:'fill', area:'ibpl', difficulty:1, competencyLabel:'Complete the clause', verify:'verified',
    prompt:'Complete the where clause so this returns the Current Working View:<br><code>Select ([Item].[SKU] * {Measure.[Forecast Quantity]}) where { ___ };</code>',
    accept:['Version.[Version Name].filter(#.Key == 0)','Version.[Version Name].filter(#.Key==0)'],
    explanation:'Version is a mandatory partition; <code>#.Key == 0</code> selects the CWV.' },

  { id:'pg-write-req', type:'write', area:'ibpl', difficulty:2, dataset:'cat-forecast', competencyLabel:'Write from a requirement', verify:'simulated',
    prompt:'<b>Requirement:</b> "Show Forecast Quantity by SKU and Week for brand <b>330</b> only, in the CWV, highest first." Write and run it.',
    starter:'Select ([Item].[SKU] * [Time].[Week] * {Measure.[Forecast Quantity]})\nwhere {  }\norderby ;',
    check:(res)=>{ if(!res.ok) return {correct:false,msg:'❌ '+res.error}; if(!res.rows.length) return {correct:false,msg:'❌ 0 rows — check the Version filter.'}; const all330 = res.rows.every(r=>String(r[0]).startsWith('330')); const sorted = res.rows.every((r,i,a)=>i===0||(a[i-1][2]??-Infinity)>=(r[2]??-Infinity)); if(!all330) return {correct:false,msg:'❌ Add a brand filter: <code>[Item].[Brand].filter(#.Name == "330")</code>.'}; if(!sorted) return {correct:false,msg:'❌ Add <code>orderby Measure.[Forecast Quantity] desc</code>.'}; return {correct:true,msg:'✅ Correct — only brand 330, sorted descending.'}; },
    explanation:'One answer: <pre class="code">Select ([Item].[SKU] * [Time].[Week] * {Measure.[Forecast Quantity]})\nwhere { Version.[Version Name].filter(#.Key == 0),\n        [Item].[Brand].filter(#.Name == "330") }\norderby Measure.[Forecast Quantity] desc;</pre>' },

  { id:'pg-fix-eq', type:'fix', area:'debug', difficulty:1, dataset:'cat-forecast', competencyLabel:'Fix · == vs =', verify:'simulated',
    prompt:'This should return only 330-Drive but returns everything. Fix and run.',
    starter:'Select ([Item].[SKU] * {Measure.[Forecast Quantity]})\nwhere { Version.[Version Name].filter(#.Key == 0),\n        [Item].[SKU].filter(#.Name = "330-Drive") };',
    check:(res)=>{ if(!res.ok) return {correct:false,msg:'❌ '+res.error}; const only = res.rows.length>0 && res.rows.every(r=>String(r[0])==='330-Drive'); return only?{correct:true,msg:'✅ Fixed — <code>==</code> compares, <code>=</code> assigns.'}:{correct:false,msg:`❌ Still ${res.rows.length} rows — the filter operator is wrong.`}; },
    explanation:'Inside <code>.filter()</code> you compare, so it must be <code>#.Name == "330-Drive"</code>.' },

  { id:'pg-diag-scope', type:'diagnose', area:'ibpl', difficulty:2, competencyLabel:'Scope choice', verify:'verified',
    prompt:'You need to <b>create</b> new cells at every Item×Year combination and seed them with a constant. Which scope?',
    options:[ {text:'regular scope', why:'regular only computes over intersections that already exist.'}, {text:'cartesian scope', correct:true, why:'cartesian creates the full cross-product of listed members and assigns a constant.'}, {text:'recurrence scope', why:'recurrence chains period t from t-1; it does not create a cross-product.'} ],
    explanation:'cartesian = create cells; regular = compute existing; recurrence = chain through time. See m07.' },

  { id:'pg-fix-null', type:'fix', area:'debug', difficulty:2, dataset:'cat-forecast', competencyLabel:'Fix · null handling', verify:'simulated',
    prompt:'This ratio is <code>null</code> wherever USE_BAF = 0 (division by zero). Make those rows <b>0</b> instead, using SafeDivide + coalesce. Run and ensure no nulls remain.',
    starter:'Select ([Item].[SKU] * [Time].[Week] *\n  { Measure.[BAF] / Measure.[USE_BAF] as Transient.Ratio })\nwhere { Version.[Version Name].filter(#.Key == 0) };',
    check:(res)=>{ if(!res.ok) return {correct:false,msg:'❌ '+res.error}; const last = res.rows.map(r=>r[r.length-1]); const anyNull = last.some(v=>v===null||v===undefined); return anyNull?{correct:false,msg:'❌ Still some null values — wrap it: <code>coalesce(SafeDivide(Measure.[BAF], Measure.[USE_BAF]), 0)</code>.'}:{correct:true,msg:'✅ No nulls — SafeDivide avoids the divide-by-zero and coalesce defaults it to 0.'}; },
    explanation:'<code>coalesce(SafeDivide(Measure.[BAF], Measure.[USE_BAF]), 0) as Transient.Ratio</code>. SafeDivide returns null on a zero divisor; coalesce turns null into 0.' },

  { id:'pg-write-leadoffset', type:'write', area:'ibpl', difficulty:3, dataset:'cat-inventory', competencyLabel:'Time offset', verify:'simulated',
    prompt:'On the inventory dataset, return each week’s Supply and the <b>previous</b> week’s Supply side by side for every SKU (CWV). Use the <code>@</code> operator with <code>LeadOffset(-1)</code>.',
    starter:'Select ([Item].[SKU] * [Time].[Week] *\n  { Measure.[Supply],\n     as Transient.PrevSupply })\nwhere { Version.[Version Name].filter(#.Key == 0) };',
    check:(res)=>{ if(!res.ok) return {correct:false,msg:'❌ '+res.error}; if(res.columns.length<3) return {correct:false,msg:'❌ Add the previous-supply transient column.'}; const pump = res.rows.filter(r=>r[0]==='320D-Pump'); const w2 = pump.find(r=>r[1]==='W02'); return (w2 && w2[w2.length-1]===100)?{correct:true,msg:'✅ 320D-Pump W02 prev-supply = 100 (W01’s Supply). The @ operator relocated the read one week back.'}:{correct:false,msg:'❌ Prev-supply not right yet — use <code>Measure.[Supply]@(Time.#.LeadOffset(-1))</code>.'}; },
    explanation:'<code>Measure.[Supply]@(Time.#.LeadOffset(-1)) as Transient.PrevSupply</code>. <code>@</code> relocates the read; <code>LeadOffset(-1)</code> moves one bucket back; the first week has no prior, so it is null.' },

  { id:'pg-opt-scope', type:'explain', area:'debug', difficulty:3, competencyLabel:'Optimize a scope', verify:'verified',
    prompt:'A rule runs a <code>cartesian scope</code> over all Items × all Weeks × all Customers to set a flag that only applies to ~20 SKUs. It is slow and bloats the cube. How would you optimize it — reveal the approach.',
    explanation:'<b>Narrow the scope before you create cells.</b> (1) Add member filters so the cartesian only spans the ~20 relevant SKUs (<code>[Item].[SKU].filter(#.Name in {…})</code>) and the needed time window, not every Item×Week×Customer. (2) Prefer <code>regular</code>/<code>evaluatemember</code> if you only need to compute over cells that already exist rather than create the full cross-product. (3) Drop Customer from the scope if the flag does not vary by customer — every extra dimension multiplies intersections. (4) For large legitimate volumes, load via a fact file instead of generating cells in a rule. The golden rule: cartesian creates cells, so every unfiltered member explodes storage and runtime.',
    pitfalls:'Leaving cartesian unfiltered "to be safe"; keeping a dimension in the scope that the output does not actually depend on.' },

  { id:'pg-explain-rule', type:'explain', area:'ibpl', difficulty:2, competencyLabel:'Explain a rule', verify:'verified',
    prompt:'Explain in plain English what this does and when the result is null:<br><pre class="code">scope: (Version.[…].filter(#.Key==0) * [Item].[SKU] * [Time].[Week]);\n  Measure.[Net Forecast] = Measure.[Forecast Quantity]\n    + if (Measure.[USE_BAF] == 1) then Measure.[BAF] else 0;\nend scope;</pre>',
    explanation:'For every SKU×Week in the CWV it computes <b>Net Forecast = Forecast Quantity + (BAF when USE_BAF=1, else 0)</b> — i.e. it applies the Business Adjustment Factor only when the override flag is on, otherwise leaves the system forecast untouched. The result is <b>null</b> for any intersection where Forecast Quantity itself is null (null propagates through <code>+</code>); the <code>if … else 0</code> protects against BAF being null when the flag is off, but not against a null base forecast. To harden it, wrap the base in <code>coalesce(Measure.[Forecast Quantity], 0)</code>.',
    pitfalls:'Assuming the if-guard protects the whole expression — a null base Forecast still propagates.' },

  { id:'pg-design-calc', type:'explain', area:'business', difficulty:3, competencyLabel:'Design a calculation', verify:'verified',
    prompt:'<b>Design task:</b> a planner wants a weekly <b>Projected On-Hand</b> = prior-week on-hand + this week’s receipts − this week’s demand, per SKU×LC. Sketch the IBPL (scope type, operator, seeding, null-handling) — then reveal a reference.',
    explanation:'<b>Reference.</b> This is a running balance, so use a <code>recurrence scope</code> over <code>Version × Item × LogisticsCenter × Time.[Week]</code>, ordered by week. Body:<pre class="code">recurrence scope: (Version.[…].filter(#.Key==0) * [Item].[SKU] * [LogisticsCenter].[Name] * [Time].[Week]);\n  Measure.[Projected OH] =\n    coalesce(Measure.[Projected OH]@(Time.#.LeadOffset(-1)), Measure.[Opening OH])\n    + coalesce(Measure.[Receipts], 0)\n    - coalesce(Measure.[Demand], 0);\nend scope;</pre> Key points: <code>@(Time.#.LeadOffset(-1))</code> reads last week’s result; the first week has no prior, so <code>coalesce(..., Opening OH)</code> seeds it; <code>coalesce(x,0)</code> stops a single missing receipt/demand from blanking the whole series.',
    pitfalls:'Using regular scope (no carry-over); forgetting to seed the first period; letting null receipts/demand null out the balance.' },
];

export const IQ = [
  { q: 'What are the five parts of a SELECT statement, and which are mandatory?',
    a: 'Scope/granularity (the dimensions & levels, joined with *) — MANDATORY. Measures (prefixed Measure., wrapped in {}) — MANDATORY. where clause (filters input; must include a Version or you get 0 rows) — optional but effectively mandatory. orderby (sort by measure or property, add desc) — optional. limit N (row cap) — optional but strongly recommended so the browser doesn\'t hang. Example: Select([Item].[SKU] * [Time].[Week] * {Measure.[UnitSold], Measure.[UnitPrice]}) where {Version.[Version Name].filter(#.Key == 0)} orderby Measure.[UnitPrice] desc limit 6;',
    tip: 'List them in order: scope, measures, where, orderby, limit. Flag that scope + measures are the only hard-required two.' },
  { q: 'Explain the difference between where and .filter(). This is the classic trap.',
    a: 'where runs BEFORE the result table is built — it filters the input (members and measures) upstream, so it is faster. .filter() (the post-filter wrapping the whole select) runs AFTER the table is built — it filters the output rows, so it can filter on computed/transient columns but is slower. They are not always equivalent: a where on a measure limits what gets computed; a .filter() on the same measure computes everything then discards rows. Also note the other .filter() — the one inside the scope, e.g. [Item].[SKU].filter(#.Name == "X") — which selects members, a different use again.',
    tip: 'Three filter positions: where (pre-input), member .filter() inside scope, and post-filter wrapping the select. Keep them distinct.' },
  { q: 'Why does a select without a Version return 0 rows instead of an error?',
    a: 'Version is a mandatory partition on every fact. With no Version filter, the query resolves to no partition, so it legitimately matches zero stored cells — that\'s a valid (empty) result, not a syntax error. This fails silently, which is exactly why it catches beginners. The fix is always to include where {Version.[Version Name].filter(#.Key == 0)} for the Current Working View, or the specific version key you want.',
    tip: 'Say "it\'s a silent 0-row result, not an error — that\'s what makes it dangerous." Then give the Key==0 fix.' },
  { q: 'How do you select member data (not measures), including custom properties?',
    a: 'Omit the Measure set and name the attribute. select ([Item].[Brand]) with round brackets returns just values (Fructis | Liril); select [Item].[Brand] without round brackets returns Key | Name | DisplayName | properties. For custom properties like PinCode you use include memberproperties {[SCSLocation].[Location],[PinCode]}. To see properties as columns rather than raw JSON in the debug workspace, run "execute datasource" instead of plain "execute".',
    tip: 'The round-bracket vs no-bracket distinction (values vs full property row) is a neat detail that signals real usage.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M06 · IBPL',
    title: 'IBPL — Select (Reading the Cube)',
    subtitle: 'How you read cells. Five parts, two mandatory, Version non-negotiable — and three different kinds of filter.',
    tabs: [
      { id: 'anatomy', label: '🧬 Anatomy of SELECT' },
      { id: 'notsql',  label: '🚫 Not SQL' },
      { id: 'filter',  label: '🎚️ where vs .filter()' },
      { id: 'members', label: '🔹 Selecting Members' },
      { id: 'play',    label: '🧪 Playground' },
      { id: 'iq',      label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });

  const cleanupPlay = renderPlayground(container.querySelector('#tab-play'));

  container.querySelector('#tab-anatomy').innerHTML = `
    <div class="section-pad">
      <p class="lead">Every full-featured select has five parts. Only ① and ② are mandatory — but ③ Version is effectively mandatory too.</p>
      <pre class="code"><span class="tok-k">Select</span> ( [Item].[SKU] * [Time].[Week] *            <span class="tok-c">-- ① scope / granularity (MANDATORY)</span>
         {Measure.[UnitSold], Measure.[UnitPrice]}   <span class="tok-c">-- ② measures (MANDATORY)</span>
) <span class="tok-k">where</span> {Version.[Version Name].Filter(#.Key == <span class="tok-n">0</span>)}  <span class="tok-c">-- ③ where (0 rows without it!)</span>
  <span class="tok-k">orderby</span> Measure.[UnitPrice] <span class="tok-k">desc</span>               <span class="tok-c">-- ④ sorting (optional)</span>
  <span class="tok-k">limit</span> <span class="tok-n">6</span>;                                     <span class="tok-c">-- ⑤ row cap (recommended)</span></pre>
      <table class="o9-table">
        <thead><tr><th>#</th><th>Part</th><th>Rule</th></tr></thead>
        <tbody>
          <tr><td>①</td><td>Scope / granularity</td><td>Dimensions & levels joined with <code>*</code>. Written <code>[Dim].[Attr]</code>.</td></tr>
          <tr><td>②</td><td>Measures</td><td>Always <code>Measure.</code>-prefixed, wrapped in <code>{ }</code> if a set.</td></tr>
          <tr><td>③</td><td>where</td><td>Filters input. <b>No Version → 0 rows.</b></td></tr>
          <tr><td>④</td><td>orderby</td><td>By measure or member property; <code>desc</code> for descending.</td></tr>
          <tr><td>⑤</td><td>limit</td><td>Cap rows while exploring or the browser hangs.</td></tr>
        </tbody>
      </table>
      <div class="code-cap">Two equivalent styles</div>
      <pre class="code"><span class="tok-c">-- Star style (compact)</span>
<span class="tok-k">Select</span> ([Item].[SKU] * [Time].[Week] * {Measure.[UnitSold]});
<span class="tok-c">-- Row/Column style (what the UI generates) — identical result</span>
<span class="tok-k">Select</span> ([Item].[SKU] * [Time].[Week]) <span class="tok-k">on row</span>, ({Measure.[UnitSold]}) <span class="tok-k">on column</span>;</pre>
    </div>`;

  container.querySelector('#tab-notsql').innerHTML = `
    <div class="section-pad">
      <p class="lead">The analogy "IBPL is SQL for a cube" gets the <i>vibe</i> right and the <i>details</i> wrong. Here's the honest mapping.</p>
      <div class="vs-grid">
        <div class="vs-col sql"><h5>SQL</h5>
<pre class="code" style="margin:0;background:transparent;border:none;padding:0">SELECT sku, week, units_sold
FROM   sales
WHERE  version = 0
ORDER BY unit_price DESC
LIMIT 6;</pre></div>
        <div class="vs-col ibpl"><h5>IBPL</h5>
<pre class="code" style="margin:0;background:transparent;border:none;padding:0">Select ([Item].[SKU] * [Time].[Week] *
  {Measure.[UnitSold]})
where {Version.[Version Name].filter(#.Key==0)}
orderby Measure.[UnitPrice] desc limit 6;</pre></div>
      </div>
      <table class="o9-table">
        <thead><tr><th>SQL habit</th><th>In IBPL</th></tr></thead>
        <tbody>
          <tr><td><code>FROM table</code></td><td>No tables — you pick <b>dimensions & a grain</b> with <code>*</code>.</td></tr>
          <tr><td>Columns are bare names</td><td>Measures need the <code>Measure.</code> prefix; sets go in <code>{ }</code>.</td></tr>
          <tr><td>Rows exist until deleted</td><td>Only populated <b>intersections</b> exist (sparse).</td></tr>
          <tr><td><code>WHERE</code> optional</td><td><b>Version mandatory</b> — skip it → 0 rows, no error.</td></tr>
          <tr><td><code>=</code> compares</td><td><code>==</code> compares, <code>=</code> assigns (mixing fails silently).</td></tr>
          <tr><td>NULL + 5 = NULL (SQL too)</td><td>Same, but you'll <code>coalesce(x,0)</code> constantly — nulls propagate everywhere.</td></tr>
          <tr><td><code>JOIN ... ON</code></td><td>Graph <b>edges</b> — <code>From./To./Edge.</code> + <code>RelationshipType</code>. Not a join.</td></tr>
          <tr><td>One <code>UPDATE ... SET</code></td><td><b>7 scope variants</b> for writes — see module 07.</td></tr>
        </tbody>
      </table>
      <div class="callout sql"><b>Bottom line:</b> treat IBPL as its own dimensional, graph-aware language. SQL intuition helps with filtering and sorting, and misleads on storage, joins, writes and null-handling.</div>
    </div>`;

  container.querySelector('#tab-filter').innerHTML = `
    <div class="section-pad">
      <p class="lead">"What's the difference between <code>where</code> and <code>.filter()</code>?" is the interviewer's favourite. There are actually <b>three</b> filter positions.</p>
      <table class="o9-table">
        <thead><tr><th></th><th>where clause</th><th>.filter() post-filter</th></tr></thead>
        <tbody>
          <tr><td><b>When it runs</b></td><td>Before the table is built</td><td>After the whole table is built</td></tr>
          <tr><td><b>Filters on</b></td><td>Members & measures (input)</td><td>Anything in the output (incl. transient columns)</td></tr>
          <tr><td><b>Performance</b></td><td>Faster — filters upstream</td><td>Slower — filters downstream</td></tr>
        </tbody>
      </table>
      <div class="card-grid">
        <div class="card"><h4>1 · where (pre-input)</h4><pre class="code" style="margin:6px 0 0">... where {Version.[Version Name]
     .filter(#.Key == 0)}</pre></div>
        <div class="card"><h4>2 · member .filter() (in scope)</h4><pre class="code" style="margin:6px 0 0">[Customer].[City]
  .filter(#.Name in {[Mumbai],[Kanpur]})</pre></div>
        <div class="card"><h4>3 · post-filter (wraps select)</h4><pre class="code" style="margin:6px 0 0">Select(...)
  .filter(Measure.[Profit] > 0)</pre></div>
      </div>
      <div class="callout warn"><b>Not always equivalent:</b> a <code>where</code> on a measure limits what gets computed; the same condition as a post-<code>.filter()</code> computes everything, then throws rows away.</div>
    </div>`;

  container.querySelector('#tab-members').innerHTML = `
    <div class="section-pad">
      <p class="lead">Sometimes you want to inspect what members exist, not read measures. Round brackets change the output.</p>
      <div class="code-cap">Values only (round brackets)</div>
      <pre class="code"><span class="tok-k">select</span> ([Item].[Brand]) <span class="tok-k">limit</span> <span class="tok-n">100</span>;   <span class="tok-c">-- Fructis | Liril</span></pre>
      <div class="code-cap">Full property row (no round brackets)</div>
      <pre class="code"><span class="tok-k">select</span> [Item].[Brand] <span class="tok-k">limit</span> <span class="tok-n">100</span>;     <span class="tok-c">-- Key | Name | DisplayName | Image | IsEditable</span></pre>
      <div class="code-cap">Custom member properties</div>
      <pre class="code"><span class="tok-k">select</span> ([SCSLocation].[Location] * [SCSLocation].[LocationGroup]) <span class="tok-k">on row</span>, () <span class="tok-k">on column</span>
  <span class="tok-k">include memberproperties</span>
    {[SCSLocation].[Location], [PinCode]}
    {[SCSLocation].[Location], [ContactNumber]}
  <span class="tok-k">limit</span> <span class="tok-n">5</span>;</pre>
      <div class="callout"><b>Debug tip:</b> use <code>execute datasource</code> (not plain <code>execute</code>) in the debug workspace to see properties as columns instead of raw JSON. And <code>select ("Hello IBPL")</code> / <code>select (5 + 3 * 2)</code> print constants for sanity checks (BODMAS → 11).</div>
    </div>`;

  return () => { cleanupPlay && cleanupPlay(); };
}

function renderPlayground(el) {
  const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[c]));
  el.innerHTML = `
    <div class="section-pad">
      <div class="sim-banner">⚙ <b>Simulated — documented subset.</b> A free editor plus a ten-step exercise ladder (predict → complete → write → fix → diagnose → null-fix → time-offset → optimize → explain → design). Solving them fills your IBPL competency on the Home page.</div>
      <div class="pg-free">
        <div class="sbx-presets">
          <label class="sbx-ds">Dataset
            <select id="pg-ds"><option value="cat-forecast">cat-forecast</option><option value="cat-inventory">cat-inventory</option></select>
          </label>
          <span class="sbx-preset-label">Presets:</span><span id="pg-presets"></span>
        </div>
        <textarea id="pg-code" class="ex-code" spellcheck="false" rows="6">${esc(PG_PRESETS[0].code)}</textarea>
        <div class="ex-editor-tools"><button id="pg-run" class="btn-mini">▶ Run</button><button id="pg-clear" class="btn-mini ghost">Clear</button></div>
        <div id="pg-out" class="ex-output" style="margin-top:12px"></div>
      </div>
      <h3 style="font-size:16px;font-weight:800;margin:24px 0 10px">The ten-step ladder</h3>
      ${createExerciseSet(PG_EXERCISES)}
    </div>`;

  const ds = el.querySelector('#pg-ds');
  const code = el.querySelector('#pg-code');
  const out = el.querySelector('#pg-out');
  const presets = el.querySelector('#pg-presets');
  presets.innerHTML = PG_PRESETS.map((p,i)=>`<button class="sbx-preset" data-i="${i}">${p.label}</button>`).join('');
  const resTable = (res) => {
    if (!res.ok) return `<div class="sim-err">⚠️ ${esc(res.error)}</div>`;
    if (!res.rows.length) return `<div class="sim-empty">0 rows — ${esc(res.note||'')}</div>`;
    return `<table class="o9-table sim-table"><thead><tr>${res.columns.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${res.rows.map(r=>`<tr>${r.map(v=>`<td>${v==null?'<span class="sim-null">null</span>':esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table><div class="sim-note">${esc(res.note||'')}</div>`;
  };
  const doRun = () => { out.innerHTML = `<div class="sim-banner">⚙ Simulated — documented subset.</div>${resTable(runIBPL(code.value, ds.value))}`; };
  const onPreset = e => { const b = e.target.closest('.sbx-preset'); if (!b) return; const p = PG_PRESETS[+b.dataset.i]; code.value = p.code; ds.value = p.ds; doRun(); };
  presets.addEventListener('click', onPreset);
  el.querySelector('#pg-run').addEventListener('click', doRun);
  el.querySelector('#pg-clear').addEventListener('click', () => { code.value=''; out.innerHTML=''; });
  doRun();

  const cleanupEx = initExerciseSet(el, PG_EXERCISES);
  return () => { presets.removeEventListener('click', onPreset); cleanupEx && cleanupEx(); };
}
