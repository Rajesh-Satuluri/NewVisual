import { createModuleShell, createIQSection } from '../components/module-shell.js';

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
      { id: 'iq',      label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });

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

  return null;
}
