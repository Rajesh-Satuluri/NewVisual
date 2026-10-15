import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { createExerciseSet, initExerciseSet } from '../components/exercise.js';

const SC_EXERCISES = [
  { id:'m07-predict-cartesian', type:'predict', area:'ibpl', difficulty:1, competencyLabel:'cartesian', verify:'verified',
    prompt:'A <code>cartesian scope</code> lists 2 SKUs and 4 Years (one Version) and assigns a constant. Starting from 0 matching cells, how many cells exist afterwards?',
    options:[ {text:'2', why:'cartesian makes the full cross-product, not just the SKUs.'}, {text:'8', correct:true, why:'2 SKUs × 4 Years = 8 new intersections, each seeded with the constant.'}, {text:'0 (nothing changes)', why:'cartesian creates cells even when none existed.'} ],
    explanation:'cartesian builds every combination of the listed members. Unfiltered, that cross-product can explode — always filter the members.' },

  { id:'m07-predict-recur', type:'predict', area:'ibpl', difficulty:2, competencyLabel:'recurrence', verify:'verified',
    prompt:'A <code>recurrence scope</code> computes <code>Inventory(t) = Inventory(t-1) + Supply(t) − Demand(t)</code>. Week 1 is seeded at 100. Supply/Demand are W2: +60/−90, W3: +70/−50. What is Inventory at W3?',
    options:[ {text:'70', why:'70 is the W2 balance, not W3 — keep chaining one more week.'}, {text:'90', correct:true, why:'W2 = 100 + 60 − 90 = 70; W3 = 70 + 70 − 50 = 90.'}, {text:'180', why:'That would sum everything without the running carry-over.'} ],
    explanation:'W2 = 100 + 60 − 90 = 70; W3 = 70 + 70 − 50 = 90. recurrence chains each period off the previous via @ LeadOffset(-1).' },

  { id:'m07-diag-scopepick', type:'diagnose', area:'ibpl', difficulty:2, competencyLabel:'Pick the scope', verify:'verified',
    prompt:'You have a coarse SKU-level launch date and withdrawal date, and you want a monthly "active" flag for every month a SKU is live. Which scope?',
    options:[ {text:'evaluatemember scope', correct:true, why:'It creates finer-grained (monthly) intersections derived from a coarser (SKU-level) measure by comparing Time.#.Key to the dates.'}, {text:'regular scope', why:'regular only touches months that already have data; it cannot explode the coarse dates into every active month.'}, {text:'spread scope', why:'spread pushes an aggregate edit down a hierarchy — unrelated here.'} ],
    explanation:'evaluatemember is the "explode a coarse attribute into finer time buckets" scope. regular cannot create the finer cells.' },
];

const SCOPES = [
  { k:'cartesian', when:'Create NEW intersections at all combinations of members and drop a constant.',
    warn:'Without member filters you create a massive number of cells — use file upload for large volumes.',
    code:`<span class="tok-k">cartesian scope</span>: ([Version].[Version Name].[CurrentWorkingView]
   * [Time].[Year]
   * [Item].[SKU].filter(#.Name in {"Liril Fresh - 75", "Fructis Shine - 100"}));
   Measure.[SKUByYear] = <span class="tok-n">1</span>;
<span class="tok-k">end scope</span>;`,
    note:'Before → 0 rows. After → 8 rows (2 SKUs × 4 Years cartesian product).' },
  { k:'regular', when:'Standard computation over EXISTING intersections; no new ones (unless coalesce).',
    warn:'Null-safe: if either operand is null the output is null unless you coalesce.',
    code:`<span class="tok-k">scope</span>: ([Version].[Version Name].[CurrentWorkingView] * [Time].[Year] * [Item].[SKU]);
   Measure.[Revenue] = <span class="tok-k">if</span> (Measure.[SKUPrice] != <span class="tok-n">0</span>)
                       <span class="tok-k">then</span> Measure.[SKUPrice] * Measure.[UnitsSold]
                       <span class="tok-k">else null</span>;
<span class="tok-k">end scope</span>;`,
    note:'The everyday workhorse — compute a measure from others, in place.' },
  { k:'evaluatemember', when:'Create FINER-grained intersections from a coarser measure.',
    warn:'Time.#.Key refers to the current fine member\'s date — compare against date-typed measures.',
    code:`<span class="tok-k">evaluatemember scope</span>: ([Version].[Version Name].[CurrentWorkingView]
   * [Item].[SKU] * [Time].[Year-Month]);
   Measure.[SKUActiveFlag] = <span class="tok-k">if</span> (Time.#.Key &gt;= Measure.[SKULaunchDate]
        &amp;&amp; Time.#.Key &lt; Measure.[SKUWithdrawalDate]) <span class="tok-k">then</span> <span class="tok-n">1</span> <span class="tok-k">else null</span>;
<span class="tok-k">end scope</span>;`,
    note:'Coarse SKU-level launch/withdrawal dates → a 1 in every month the SKU is active.' },
  { k:'recurrence', when:'Value in period t depends on period t-1 — inventory carry-over, running balance.',
    warn:'Needs a seed (first period) and an ordered time set; element(0) gives the earliest bucket.',
    code:`<span class="tok-c">-- Inventory(t) = Inventory(t-1) + Supply(t) - Demand(t)</span>
<span class="tok-k">recurrence scope</span>: ([Version].[Version Name].[CurrentWorkingView] * [Item].[SKU] * [Time].[Week]);
   Measure.[Inventory] = Measure.[Inventory]@(Time.#.LeadOffset(-<span class="tok-n">1</span>))
        + Measure.[Supply] - Measure.[Demand];
<span class="tok-k">end scope</span>;`,
    note:'The @ operator reads the prior week\'s Inventory; the recurrence walks time forward.' },
  { k:'block', when:'Like regular, optimized for computing MULTIPLE measures row-by-row efficiently.',
    warn:'Use when several output measures share the same scope — avoids re-scanning.',
    code:`<span class="tok-k">block scope</span>: ([Version].[Version Name].[CurrentWorkingView] * [Item].[SKU] * [Time].[Week]);
   Measure.[Revenue] = Measure.[Price] * Measure.[Units];
   Measure.[Margin]  = Measure.[Revenue] - Measure.[Cost];
<span class="tok-k">end scope</span>;`,
    note:'Several assignments in one pass over the same intersections.' },
  { k:'spread', when:'Assign a value at a HIGHER level and let spreading rules push it to leaves.',
    warn:'Requires a spreading rule on the measure (module 13) — else you can only edit at leaf level.',
    code:`<span class="tok-k">spread scope</span>: ([Version].[Version Name].[CurrentWorkingView] * [Item].[Brand].[Fructis] * [Time].[Month]);
   Measure.[Forecast] = Measure.[Forecast] * <span class="tok-n">1.10</span>;  <span class="tok-c">-- +10% at Brand level</span>
<span class="tok-k">end scope</span>;`,
    note:'Edit the Fructis total; the rule distributes the increase down to every SKU.' },
  { k:'graph', when:'Compute on EDGES (graph relationships) instead of measures.',
    warn:'Uses From./To./Edge. + a RelationshipType — see module 15.',
    code:`<span class="tok-k">Select</span> (From.[Item].[Item] * From.[Location].[Location]
   * To.[Customer].[Customer Name] * To.[Order].[Order Name]) <span class="tok-k">on row</span>,
   ({Edge.[Production_Pegging].[Material Production Pegged Quantity]}) <span class="tok-k">on column</span>
<span class="tok-k">where</span> {RelationshipType.[Production_Pegging], Version.[Version Name]};`,
    note:'Reads/writes values on pegging edges — no SQL analog.' },
];

export const IQ = [
  { q: 'What is a scope statement and how is it structured?',
    a: 'A scope statement is how IBPL writes/computes measures. It names an intersection of dimension members (scope: (Version * Item * Week)), makes one or more assignments (Measure.[X] = expression), and ends with end scope;. It is IBPL\'s analog to SQL UPDATE ... SET ... WHERE — but the WHERE becomes the scope and the SET becomes the assignment, and there are seven variants rather than one.',
    tip: 'Structure it as: scope: (members); Measure.[X] = expr; end scope; — then say "but there are 7 kinds."' },
  { q: 'Explain the difference between cartesian, regular, and recurrence scope — the three they always ask.',
    a: 'cartesian CREATES new intersections at every combination of the listed members and assigns a constant (0 rows → N rows). regular computes over EXISTING intersections only, creating nothing new (null-safe). recurrence handles time-series where period t depends on t-1 (inventory carry-over, running balance) using the @ operator to read the prior period and walking time in order from a seed. The distinction interviewers probe: cartesian makes cells, regular uses cells, recurrence chains cells through time.',
    tip: 'One verb each: cartesian = create, regular = compute, recurrence = chain-through-time.' },
  { q: 'What does evaluatemember scope do that regular scope cannot?',
    a: 'regular scope only touches intersections that already exist at the scope grain. evaluatemember creates finer-grained intersections derived from a coarser measure. Classic case: SKULaunchDate and SKUWithdrawalDate are stored at Version × SKU (coarse). evaluatemember at Version × SKU × Year-Month creates a row for every month in each SKU\'s active window, setting SKUActiveFlag = 1, by comparing Time.#.Key against the coarse date measures.',
    tip: 'The giveaway is "explode a coarse attribute into finer time/other buckets." That\'s evaluatemember.' },
  { q: 'What is the @ operator and give a real use.',
    a: '@ (the "at" operator) reads a measure at a DIFFERENT intersection than the current row. In a recurrence scope, Measure.[Inventory]@(Time.#.LeadOffset(-1)) reads last period\'s inventory to compute this period\'s. More generally Measure.[Inv]@(Time.#.LeadOffset(-1)) or @(To.SCSLocation.[Location]) relocates the read along a dimension or across a graph edge. It is how one cell\'s calculation references another cell.',
    tip: 'Say "@ relocates the read" and give the inventory carry-over LeadOffset(-1) example.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M07 · IBPL',
    title: 'IBPL — Scope & Write',
    subtitle: 'How you write the cube. Seven scope variants — the single most-asked IBPL interview topic.',
    tabs: [
      { id: 'what',   label: '📝 What is Scope' },
      { id: 'seven',  label: '7️⃣ The 7 Scopes' },
      { id: 'recur',  label: '🔁 Recurrence Deep Dive' },
      { id: 'notsql', label: '🚫 Not UPDATE' },
      { id: 'viz',    label: '🔲 Scope Visualizer' },
      { id: 'drill',  label: '🧪 Exercises' },
      { id: 'iq',     label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });

  container.querySelector('#tab-what').innerHTML = `
    <div class="section-pad">
      <p class="lead">A scope statement writes measures. It names <b>where</b> (the intersection), <b>what</b> (assignments), and ends with <code>end scope;</code>.</p>
      <pre class="code">&lt;scope-type&gt; <span class="tok-k">scope</span>: (&lt;dim × dim × dim&gt;);
    Measure.[X] = &lt;expression&gt;;
    Measure.[Y] = &lt;another expression&gt;;
<span class="tok-k">end scope</span>;</pre>
      <div class="callout"><b>Rough SQL cousin:</b> <code>UPDATE … SET … WHERE</code>. In IBPL the <code>WHERE</code> becomes the <b>scope</b> and the <code>SET</code> becomes the <b>assignment</b> — but you choose one of 7 scope types depending on whether you're creating cells, computing over existing ones, chaining through time, or spreading down a hierarchy.</div>
      <div class="callout warn"><b>Ten golden rules recap:</b> every statement ends with <code>;</code> · <code>==</code> compares / <code>=</code> assigns · <code>*</code> joins levels, commas separate set items · <code>Measure.</code> prefix required · <code>#</code> = "self" in a filter · null propagates (coalesce!).</div>

      <h3 style="font-size:16px;font-weight:800;margin:26px 0 8px">🗑️ <code>delete data for model</code> — bulk-wipe fact data</h3>
      <p class="lead" style="margin-bottom:12px">Not a scope, but it lives next door: it removes <b>fact values</b> (measure cells) across a whole measure group, filtered by a <code>where</code> — <i>without</i> touching dimension members. (Removing members is <code>deletemember</code>/<code>purge</code> — see m09.)</p>
      <div class="code-cap">Wipe a whole measure group for one version</div>
      <pre class="code"><span class="tok-k">delete data for model</span> [SalesHistory]
<span class="tok-k">where</span> {Version.[Version Name].[CurrentWorkingView]};</pre>
      <div class="code-cap">Scope it tighter — one version + one brand</div>
      <pre class="code"><span class="tok-k">delete data for model</span> [SalesHistory]
<span class="tok-k">where</span> {Version.[Version Name].[CurrentWorkingView],
       [Item].[Brand].[Fructis].relatedmembers([SKU])};</pre>
      <div class="code-cap">Conditional on measure values</div>
      <pre class="code"><span class="tok-k">delete data for model</span> [SalesHistory]
<span class="tok-k">where</span> {Version.[Version Name].[ScenarioAllPlays],
       ~isnull(Measure.[SalesPrice]),
       Measure.[UnitsSold] &gt; <span class="tok-n">10</span>};</pre>
      <div class="callout warn"><b>Serious, hard-to-undo operation.</b> Always dry-run first: swap <code>delete data for model</code> for a <code>select</code> with the <i>same</i> where-clause and eyeball exactly which cells would go. For edges there's the sibling <code>delete data for relationshiptype</code>.</div>
    </div>`;

  container.querySelector('#tab-seven').innerHTML = `
    <div class="section-pad">
      <p class="lead">Seven variants, each solving a different problem. Know when to reach for each.</p>
      <table class="o9-table">
        <thead><tr><th>#</th><th>Scope</th><th>Use when</th></tr></thead>
        <tbody>
          <tr><td>1</td><td><code>cartesian</code></td><td>Create new intersections at all combinations — assign a constant</td></tr>
          <tr><td>2</td><td><code>regular</code></td><td>Compute over existing intersections; create nothing new</td></tr>
          <tr><td>3</td><td><code>evaluatemember</code></td><td>Create finer-grained intersections from a coarser measure</td></tr>
          <tr><td>4</td><td><code>recurrence</code></td><td>Time-series where t depends on t-1</td></tr>
          <tr><td>5</td><td><code>block</code></td><td>Regular, optimized for several measures row-by-row</td></tr>
          <tr><td>6</td><td><code>spread</code></td><td>Assign at a higher level, spread to leaves by rule</td></tr>
          <tr><td>7</td><td><code>graph</code></td><td>Compute on edges, not measures</td></tr>
        </tbody>
      </table>
      <div class="scope-accordion">
        ${SCOPES.map((s,i)=>`
          <div class="iq-item ${i===0?'open':''}" data-scope>
            <div class="iq-question"><span class="q-num">${s.k}</span><span style="flex:1">${s.when}</span><span class="q-chevron">▼</span></div>
            <div class="iq-answer">
              <pre class="code" style="margin:4px 0 10px">${s.code}</pre>
              <p style="font-size:12px;color:var(--text2)">${s.note}</p>
              <div class="callout warn" style="margin:8px 0 0">${s.warn}</div>
            </div>
          </div>`).join('')}
      </div>

      <div class="code-cap" style="margin-top:22px">Which scope do I reach for?</div>
      <table class="o9-table">
        <thead><tr><th>The situation</th><th>Scope</th></tr></thead>
        <tbody>
          <tr><td>Create 100 new intersections at every combination of 4 SKUs × 5 Weeks and seed a constant</td><td><code>cartesian</code></td></tr>
          <tr><td>Compute Revenue = Price × Units for rows that <b>already exist</b></td><td><code>regular</code></td></tr>
          <tr><td>I have SKULaunchDate/WithdrawalDate at SKU level, want an SKUActiveFlag at SKU × Month</td><td><code>evaluatemember</code></td></tr>
          <tr><td>Running inventory = last_week + supply − demand (period <i>t</i> needs <i>t−1</i>)</td><td><code>recurrence</code></td></tr>
          <tr><td>Three similar computations on the same measure group, and I want speed</td><td><code>block</code></td></tr>
          <tr><td>Set a total at Brand level and let it distribute down to SKUs by rule</td><td><code>spread</code></td></tr>
          <tr><td>Query or modify pegging graph <b>edges</b></td><td><code>graph</code></td></tr>
        </tbody>
      </table>
      <div class="callout"><b>One verb each:</b> cartesian = <b>create</b> cells · regular = <b>compute</b> existing cells · evaluatemember = <b>explode</b> coarse → fine · recurrence = <b>chain</b> through time · block = compute <b>several measures</b> in one pass · spread = <b>push down</b> an aggregate · graph = write <b>edges</b>.</div>
    </div>`;

  // wire the scope accordion (reuses iq styles but separate handler)
  const acc = container.querySelector('.scope-accordion');
  const onAcc = (e) => {
    const q = e.target.closest('.iq-question');
    if (!q || !acc.contains(q)) return;
    const item = q.closest('.iq-item');
    const wasOpen = item.classList.contains('open');
    acc.querySelectorAll('.iq-item').forEach(i => i.classList.remove('open'));
    if (!wasOpen) item.classList.add('open');
  };
  acc.addEventListener('click', onAcc);

  container.querySelector('#tab-notsql').innerHTML = `
    <div class="section-pad">
      <p class="lead">A SQL <code>UPDATE</code> is one statement that sets existing rows. IBPL writes are a <i>family</i> of operations because a cube is not a table.</p>
      <div class="vs-grid">
        <div class="vs-col sql"><h5>SQL — one UPDATE</h5>
<pre class="code" style="margin:0;background:transparent;border:none;padding:0">UPDATE forecast
SET   qty = qty * 1.10
WHERE brand = 'Fructis'
  AND month = '2024-03';</pre>
        <p style="color:var(--text2);font-size:12px;margin-top:8px">Rows must already exist. "brand" is just a column — the DB doesn't push the change down to SKUs.</p></div>
        <div class="vs-col ibpl"><h5>IBPL — pick the right scope</h5>
<pre class="code" style="margin:0;background:transparent;border:none;padding:0">spread scope: (Version.[…] *
  [Item].[Brand].[Fructis] * [Time].[Month]);
  Measure.[Forecast] = Measure.[Forecast]*1.10;
end scope;</pre>
        <p style="color:var(--text2);font-size:12px;margin-top:8px">A <b>spread</b> scope + a spreading rule pushes the +10% down to every SKU. Editing an aggregate and auto-distributing to leaves has no SQL equivalent.</p></div>
      </div>
      <div class="callout sql"><b>The deeper difference:</b> in SQL you can only write cells that exist. In IBPL, <code>cartesian</code>/<code>evaluatemember</code> <b>create</b> cells, <code>recurrence</code> chains them through <b>time</b>, <code>spread</code> writes an <b>aggregate</b> and distributes down, and <code>graph</code> writes <b>edges</b>. One mental model ("UPDATE SET WHERE") cannot cover all of that.</div>
    </div>`;

  container.querySelector('#tab-recur').innerHTML = `
    <div class="section-pad">
      <p class="lead">The interview-favourite scope. A <b>recurrence scope</b> is the only clean way to compute a running series where period <i>t</i> depends on period <i>t−1</i> — inventory carry-over, running balance, cumulative sums.</p>
      <div class="code-cap">The classic inventory formula</div>
      <pre class="code">Inventory(t) = Inventory(t−1) + Supply(t) − Demand(t)</pre>

      <h3 style="font-size:16px;font-weight:800;margin:22px 0 6px">Why <code>regular</code> scope gives the WRONG answer</h3>
      <p style="color:var(--text2);font-size:13px;max-width:760px">A <code>regular</code> scope reads <b>every input once</b>, then writes <b>every output</b>. So when it computes week&nbsp;3 it reads week&nbsp;2's <i>old</i> (pre-update) inventory — not the value it just wrote one step earlier. The error compounds week over week:</p>
      <table class="o9-table">
        <thead><tr><th>Week</th><th>Supply</th><th>Demand</th><th>Expected</th><th><code>regular</code> scope</th><th><code>recurrence</code> scope</th></tr></thead>
        <tbody>
          <tr><td>1 <span style="color:var(--text3)">(seed)</span></td><td>14</td><td>12</td><td>10</td><td style="color:var(--good);font-weight:700">10 ✓</td><td style="color:var(--good);font-weight:700">10 ✓</td></tr>
          <tr><td>2</td><td>8</td><td>10</td><td>8</td><td style="color:var(--good);font-weight:700">8 ✓</td><td style="color:var(--good);font-weight:700">8 ✓</td></tr>
          <tr><td>3</td><td>5</td><td>12</td><td>1</td><td style="color:var(--bad);font-weight:700">−7 ✗</td><td style="color:var(--good);font-weight:700">1 ✓</td></tr>
          <tr><td>4</td><td>8</td><td>9</td><td>0</td><td style="color:var(--bad);font-weight:700">−1 ✗</td><td style="color:var(--good);font-weight:700">0 ✓</td></tr>
        </tbody>
      </table>
      <p style="color:var(--text2);font-size:13px"><code>regular</code> is right through week 2 but wrong from week 3 on — it never sees the <b>freshly-computed</b> prior balance, so it keeps subtracting demand from a stale number.</p>

      <div class="code-cap" style="margin-top:18px">The fix — <code>recurrence</code> walks time step by step</div>
      <pre class="code"><span class="tok-k">recurrence scope</span>: (Version.[Version Name].filter(#.Key==<span class="tok-n">0</span>) * [Item].[SKU] * [Time].[Week]);
   Measure.[Inventory] = <span class="tok-k">if</span> (Time.#.Key == &amp;PastWeeks.element(<span class="tok-n">0</span>).Key)
       <span class="tok-k">then</span> Measure.[Inventory]                                   <span class="tok-c">-- seed: keep week 1 as-is</span>
       <span class="tok-k">else</span> <span class="tok-f">coalesce</span>(Measure.[Inventory]@(Time.#.LeadOffset(-<span class="tok-n">1</span>)), <span class="tok-n">0</span>)   <span class="tok-c">-- prior week's NEW value</span>
          + <span class="tok-f">coalesce</span>(Measure.[Supply], <span class="tok-n">0</span>)
          - <span class="tok-f">coalesce</span>(Measure.[Demand], <span class="tok-n">0</span>);
<span class="tok-k">end scope</span>;</pre>
      <table class="o9-table">
        <thead><tr><th>Piece</th><th>What it does</th></tr></thead>
        <tbody>
          <tr><td><code>@(Time.#.LeadOffset(-1))</code></td><td>Reads the measure at the <b>previous</b> week — and in a recurrence that's the <i>just-computed</i> value, not the stale one.</td></tr>
          <tr><td><code>coalesce(…, 0)</code></td><td>Treats a missing prior inventory / supply / demand as 0 so one null doesn't blank the whole chain.</td></tr>
          <tr><td><code>&amp;PastWeeks.element(0).Key</code></td><td>Identifies the <b>first</b> (seed) bucket — the earliest week, which has no prior to read.</td></tr>
          <tr><td><code>if … then (seed) else (chain)</code></td><td>Week 1 keeps its opening value; every later week chains off the one before.</td></tr>
        </tbody>
      </table>
      <div class="callout warn"><b>Two things a recurrence always needs:</b> (1) a <b>seed</b> for the first period (there is no <i>t−1</i> to read), and (2) an <b>ordered time set</b> so "previous" is well-defined. Miss the seed and the whole series nulls out from the start.</div>
      <div class="callout"><b>Say it in the interview:</b> "regular reads-all-then-writes-all, so prior-period reads are stale; recurrence updates step-by-step so each period sees the freshly-written previous period — that's why running-balance logic needs recurrence, not regular."</div>
    </div>`;

  const cleanupViz = renderScopeViz(container.querySelector('#tab-viz'));
  const drill = container.querySelector('#tab-drill');
  drill.innerHTML = `<div class="section-pad">${createExerciseSet(SC_EXERCISES, { intro: 'Three exercises on the three most-asked scopes: cartesian (create), recurrence (chain through time), evaluatemember (explode coarse → fine).' })}</div>`;
  const cleanupEx = initExerciseSet(drill, SC_EXERCISES);

  return () => { acc.removeEventListener('click', onAcc); cleanupViz && cleanupViz(); cleanupEx && cleanupEx(); };
}

function renderScopeViz(el) {
  // 3 SKUs × 4 weeks grid. "existing" cells are a sparse subset.
  const SKUS = ['320D-Pump', '320D-Seal', '330-Drive'];
  const WEEKS = ['W01', 'W02', 'W03', 'W04'];
  const existing = new Set(['0-0', '0-1', '1-0', '2-2', '2-3']); // sparse populated cells
  const MODES = {
    cartesian: { label:'cartesian — create all', desc:'Creates a cell at <b>every</b> SKU×Week combination (the full cross-product) and seeds a constant. Empty cells become populated — the cube grows.', cells:(r,c)=>true, arrow:false },
    regular:   { label:'regular — existing only', desc:'Computes only over cells that <b>already exist</b> (the sparse populated set). Creates nothing new; empty stays empty.', cells:(r,c)=>existing.has(`${r}-${c}`), arrow:false },
    recurrence:{ label:'recurrence — chain through time', desc:'Walks time left→right per SKU: each week reads the <b>previous</b> week via <code>@ LeadOffset(-1)</code>. Needs a seed in the first week.', cells:(r,c)=>true, arrow:true },
    spread:    { label:'spread — aggregate → leaves', desc:'An edit at a parent (e.g. a Brand row) is pushed <b>down</b> to the leaf SKUs by a spreading rule. Here the top SKU stands in for the aggregate.', cells:(r,c)=>r===0, arrow:false, down:true },
  };

  el.innerHTML = `
    <div class="section-pad">
      <p class="lead">The same grid, four scopes. See <b>which intersections each scope touches</b> — the heart of "a cube is not a table". Dots = cells that already exist (sparse); highlighted = cells this scope writes.</p>
      <div class="lab-controls">
        <span class="lab-sel">Scope:</span>
        ${Object.keys(MODES).map((k,i)=>`<button class="sv-btn${i===0?' on':''}" data-mode="${k}">${k}</button>`).join('')}
      </div>
      <div class="sv-grid-wrap"><div class="sv-grid" id="sv-grid"></div></div>
      <div class="callout" id="sv-desc"></div>
    </div>`;

  const grid = el.querySelector('#sv-grid');
  const desc = el.querySelector('#sv-desc');

  const draw = (mode) => {
    const M = MODES[mode];
    let html = `<div class="sv-corner"></div>` + WEEKS.map(w=>`<div class="sv-head">${w}</div>`).join('');
    SKUS.forEach((s,r)=>{
      html += `<div class="sv-row-head">${s}</div>`;
      WEEKS.forEach((w,c)=>{
        const ex = existing.has(`${r}-${c}`);
        const on = M.cells(r,c);
        const seed = M.arrow && c===0;
        html += `<div class="sv-cell${on?' on':''}${ex?' has':''}${seed?' seed':''}">${ex?'•':''}${M.arrow&&c>0?'<span class="sv-arrow">←</span>':''}${M.down&&r===0?'<span class="sv-down">↓</span>':''}</div>`;
      });
    });
    grid.innerHTML = html;
    desc.innerHTML = `<b>${M.label}.</b> ${M.desc}`;
  };
  draw('cartesian');

  const onClick = (e) => {
    const b = e.target.closest('.sv-btn'); if (!b) return;
    el.querySelectorAll('.sv-btn').forEach(x=>x.classList.remove('on'));
    b.classList.add('on');
    draw(b.dataset.mode);
  };
  el.addEventListener('click', onClick);
  return () => el.removeEventListener('click', onClick);
}
