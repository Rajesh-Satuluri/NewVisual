import { createModuleShell, createIQSection } from '../components/module-shell.js';

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
      { id: 'notsql', label: '🚫 Not UPDATE' },
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

  return () => acc.removeEventListener('click', onAcc);
}
