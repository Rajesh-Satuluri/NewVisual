import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { createExerciseSet, initExerciseSet } from '../components/exercise.js';

const M08_EX = [
  { id:'m08-write-bias', type:'write', area:'ibpl', difficulty:2, dataset:'cat-forecast', competencyLabel:'Computed measure', verify:'simulated',
    prompt:'Compute <b>forecast error %</b> = (Forecast − Actual) ÷ Actual per SKU×Week in the CWV, as a transient, protected against divide-by-zero. Run it (330-Link has Actual with Forecast 0; 320D-Seal W02 has Actual 0).',
    starter:'Select ([Item].[SKU] * [Time].[Week] *\n  {  as Transient.ErrPct })\nwhere { Version.[Version Name].filter(#.Key == 0) };',
    check:(res)=>{ if(!res.ok) return {correct:false,msg:'❌ '+res.error}; if(res.columns[res.columns.length-1]!=='ErrPct') return {correct:false,msg:'❌ Name the transient <code>Transient.ErrPct</code>.'}; return {correct:true,msg:'✅ Ran. SafeDivide returns null where Actual = 0 instead of erroring — exactly the guard you want.'}; },
    explanation:'<code>SafeDivide(Measure.[Forecast Quantity] - Measure.[Actual Quantity], Measure.[Actual Quantity]) as Transient.ErrPct</code>. Add <code>coalesce(…, 0)</code> if you want 0 rather than null where Actual is 0.' },
  { id:'m08-fix-nullprop', type:'fix', area:'debug', difficulty:2, dataset:'cat-inventory', competencyLabel:'Fix · null propagation', verify:'simulated',
    prompt:'On the inventory dataset, <code>Inventory</code> is unpopulated (null) everywhere. This computes <code>Supply + Inventory</code> and the whole column comes back blank. Make the missing Inventory behave as 0. Run until no nulls remain.',
    starter:'Select ([Item].[SKU] * [Time].[Week] *\n  { Measure.[Supply] + Measure.[Inventory] as Transient.Available })\nwhere { Version.[Version Name].filter(#.Key == 0) };',
    check:(res)=>{ if(!res.ok) return {correct:false,msg:'❌ '+res.error}; const last=res.rows.map(r=>r[r.length-1]); return last.some(v=>v==null)?{correct:false,msg:'❌ Still blank — wrap it: <code>Measure.[Supply] + coalesce(Measure.[Inventory], 0)</code>.'}:{correct:true,msg:'✅ No blanks — coalesce stops the null Inventory from nulling the whole sum.'}; },
    explanation:'Null propagates through <code>+</code>: <code>100 + null = null</code>. <code>coalesce(Measure.[Inventory], 0)</code> defaults the missing value to 0 so the arithmetic survives.' },
];


export const IQ = [
  { q: 'What is the "null trap" in IBPL arithmetic and how do you avoid it?',
    a: 'If any operand of + - * / ^ is null, the whole result is null — so Measure.[A] + Measure.[B] silently becomes null whenever either is missing, quietly zeroing out totals. The fix is coalesce(x, 0) around each operand you want treated as zero: coalesce(Measure.[A],0) + coalesce(Measure.[B],0). Division by zero throws an error, so use SafeDivide or guard with if (denom != 0).',
    tip: 'Say "nulls propagate through every arithmetic operator — coalesce defensively." Add the divide-by-zero → SafeDivide note.' },
  { q: 'Explain the difference between member analytic and attribute analytic functions — the analytical trap.',
    a: 'Attribute analytic functions operate on an attribute member SET (a filtered set); they are named plural + AtLevel: AncestorsAtLevel, DescendantsAtLevel, plus filter/find/UnionWith/IntersectWith. Their input is [Dim].[Attr].filter(...). Member analytic functions operate on ONE specific member and are named singular: Ancestor, Children, LeadOffset, Between. Their input is [Dim].[Attr].[MemberName]. Feeding a member into an attribute function (Time.[Day].[30].ancestorsAtLevel([Week])) errors; you must filter first: Time.[Day].filter(#.Name=="30").ancestorsAtLevel([Week]).',
    tip: 'The rule: attribute fns want a filtered set, member fns want a .[member]. Mixing them is a classic trap.' },
  { q: 'What does the @ (at) operator do with LeadOffset?',
    a: '@ reads a measure at a different intersection; LeadOffset(n) moves n positions along a level at the same grain. Measure.[UnitSold]@(Time.#.LeadOffset(2)) reads UnitSold from 2 weeks ahead and displays it against the current week — handy for lead/lag comparisons and recurrence seeds. Negative offsets look backward (the inventory carry-over uses LeadOffset(-1)).',
    tip: 'Positive LeadOffset = future periods, negative = past. Pair it with @ to relocate the read.' },
  { q: 'When would you use if/then/else vs coalesce in a rule?',
    a: 'Use if/then/else for conditional logic — compute Revenue only when price is non-zero, otherwise null. Use coalesce to substitute a default for null — treat a missing quantity as 0 so it doesn\'t poison a sum. They compose: Measure.[Total] = if (Measure.[Flag]==1) then coalesce(Measure.[A],0)+coalesce(Measure.[B],0) else null;. Also know == vs = (compare vs assign) and the string quirks — (1.0)=="1" is true but (1.0)=="1.0" is false.',
    tip: 'if = branching logic; coalesce = null defaulting. Showing you compose them signals fluency.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M08 · IBPL',
    title: 'IBPL — Rules (Operators & Functions)',
    subtitle: 'The expressions inside scope assignments: arithmetic, logic, the @ operator, hierarchy navigation and time functions.',
    tabs: [
      { id: 'ops',    label: '🧮 Operators' },
      { id: 'nulls',  label: '⚠️ Null & Divide' },
      { id: 'fns',    label: '🔢 Functions & Formats' },
      { id: 'analytic', label: '🌲 Analytical Functions' },
      { id: 'time',   label: '⏱️ Time & @' },
      { id: 'drill',  label: '🧪 Exercises' },
      { id: 'iq',     label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });

  container.querySelector('#tab-ops').innerHTML = `
    <div class="section-pad">
      <p class="lead">Arithmetic follows BODMAS. Relational returns true/false. Logical combines them. Watch the comparison operators.</p>
      <table class="o9-table">
        <thead><tr><th>Family</th><th>Operators</th><th>Note</th></tr></thead>
        <tbody>
          <tr><td>Arithmetic</td><td><code>+</code> <code>-</code> <code>*</code> <code>/</code> <code>^</code></td><td>BODMAS; <code>+</code> also concatenates strings</td></tr>
          <tr><td>Relational</td><td><code>==</code> <code>!=</code>/<code>&lt;&gt;</code> <code>&lt;</code> <code>&lt;=</code> <code>&gt;</code> <code>&gt;=</code></td><td><b><code>==</code> compares, <code>=</code> assigns</b></td></tr>
          <tr><td>Logical</td><td><code>&amp;&amp;</code> <code>||</code> <code>in { }</code> <code>~</code></td><td>AND / OR / membership / NOT</td></tr>
          <tr><td>Special</td><td><code>@</code> <code>+</code> (concat)</td><td><code>@</code> reads a measure at another intersection</td></tr>
        </tbody>
      </table>
      <div class="callout warn"><b>The cardinal mistake:</b> <code>=</code> is assignment, not comparison. Using <code>=</code> where a boolean is expected fails silently or corrupts data. Always <code>==</code> to compare.</div>
      <div class="callout"><b>String-vs-number quirks:</b> <code>(1.0) == "1"</code> → true, but <code>(1.0) == "1.0"</code> → false (stringifying strips the <code>.0</code>); <code>(11) &lt; "2"</code> → true (compared as strings). Keep both sides the same type.</div>
    </div>`;

  container.querySelector('#tab-nulls').innerHTML = `
    <div class="section-pad">
      <p class="lead">The #1 source of silently-wrong numbers. Nulls propagate through every arithmetic operator.</p>
      <div class="vs-grid">
        <div class="vs-col sql"><h5>❌ Nulls destroy the sum</h5>
<pre class="code" style="margin:0;background:transparent;border:none;padding:0">Measure.[Total] =
   Measure.[A] + Measure.[B];
-- if B is null, Total is null</pre></div>
        <div class="vs-col ibpl"><h5>✅ Coalesce defensively</h5>
<pre class="code" style="margin:0;background:transparent;border:none;padding:0">Measure.[Total] =
   coalesce(Measure.[A],0)
 + coalesce(Measure.[B],0);</pre></div>
      </div>
      <div class="code-cap">Divide-by-zero — guard it</div>
      <pre class="code">Measure.[Rate] = <span class="tok-k">if</span> (Measure.[Denom] != <span class="tok-n">0</span>)
                 <span class="tok-k">then</span> Measure.[Num] / Measure.[Denom]
                 <span class="tok-k">else null</span>;              <span class="tok-c">-- or use SafeDivide(num, denom)</span></pre>
      <div class="callout"><code>/</code> throws on a zero divisor — never let it hit one. <code>SafeDivide</code> returns null instead of erroring.</div>
    </div>`;

  container.querySelector('#tab-analytic').innerHTML = `
    <div class="section-pad">
      <p class="lead">Everything in analytical land splits into two families. Mixing them is the interview trap.</p>
      <div class="vs-grid">
        <div class="vs-col sql"><h5>Attribute analytic (a SET)</h5>
          <p style="color:var(--text2);font-size:12px">Plural + AtLevel. Input = a filtered set.<br><br>
          <code class="tok-f">AncestorsAtLevel</code>, <code class="tok-f">DescendantsAtLevel</code>,<br>
          <code class="tok-f">filter</code>, <code class="tok-f">find</code>, <code class="tok-f">element</code>, <code class="tok-f">first/last</code>,<br>
          <code class="tok-f">UnionWith</code>, <code class="tok-f">IntersectWith</code>, <code class="tok-f">RelatedMembers</code></p></div>
        <div class="vs-col ibpl"><h5>Member analytic (one MEMBER)</h5>
          <p style="color:var(--text2);font-size:12px">Singular. Input = <code>.[MemberName]</code>.<br><br>
          <code class="tok-f">Ancestor</code>, <code class="tok-f">Children</code>,<br>
          <code class="tok-f">LeadOffset</code>, <code class="tok-f">Between</code></p></div>
      </div>
      <div class="code-cap">The trap, demonstrated</div>
      <pre class="code"><span class="tok-k">select</span> Time.[Day].[30].ancestorsAtLevel([Week]);                 <span class="tok-c">-- ❌ member into attribute fn</span>
<span class="tok-k">select</span> Time.[Day].filter(#.Name == "30").ancestorsAtLevel([Week]); <span class="tok-c">-- ✅ → 5</span>
<span class="tok-k">select</span> Time.[Week].[5].descendantsAtLevel([Day]);                 <span class="tok-c">-- ❌</span>
<span class="tok-k">select</span> Time.[Week].filter(#.Name == [5]).descendantsAtLevel([Day]);<span class="tok-c">-- ✅ → 27,28,29,30,31</span></pre>
      <div class="code-cap">filter predicates — startswith / endswith / contains</div>
      <pre class="code">Customer.[CustomerName].filter(#.Name <span class="tok-k">startswith</span> ([A]) || #.Name <span class="tok-k">endswith</span> ([E]))
Customer.[City].filter(#.Name <span class="tok-k">contains</span> "mu")   <span class="tok-c">-- Muzzafarpur, Mumbai, Yamunanagar…</span></pre>

      <div class="code-cap" style="margin-top:18px">Hierarchy navigation — up, down, across</div>
      <table class="o9-table">
        <thead><tr><th>Function</th><th>Direction</th><th>Family / input</th></tr></thead>
        <tbody>
          <tr><td><code>AncestorAtLevel([Week])</code></td><td>Up to a named level</td><td>Attribute → needs a filtered set</td></tr>
          <tr><td><code>DescendantAtLevel([Day])</code></td><td>Down to a named level</td><td>Attribute → needs a filtered set</td></tr>
          <tr><td><code>Ancestor(HierDim, n)</code></td><td>Up n levels</td><td>Member → needs <code>.[Member]</code></td></tr>
          <tr><td><code>Children(HierDim)</code></td><td>Down one level</td><td>Member → needs <code>.[Member]</code></td></tr>
          <tr><td><code>RelatedMembers([SKU])</code></td><td>Cross-dim related set</td><td>All members at the target level linked to this one</td></tr>
          <tr><td><code>LeadOffset(n)</code></td><td>Same level, ±n positions</td><td>+ future / − past (pairs with <code>@</code>)</td></tr>
          <tr><td><code>Between(mA, mB)</code></td><td>Inclusive range, same level</td><td>e.g. all Weeks from W2 to W4</td></tr>
          <tr><td><code>element(n)</code> · <code>first()</code> · <code>last()</code></td><td>Positional pick from a set</td><td><code>element(0)</code> = first (0-indexed)</td></tr>
        </tbody>
      </table>
      <pre class="code"><span class="tok-c">-- RelatedMembers: every SKU under the Fructis brand</span>
[Item].[Brand].[Fructis].<span class="tok-f">relatedmembers</span>([SKU])
<span class="tok-c">-- Between: Weeks 2 through 4 inclusive, then read their sales</span>
[Time].[Week].filter(#.Name==[2]).<span class="tok-f">Between</span>([Time].[Week].filter(#.Name==[4]))
<span class="tok-c">-- element: the earliest week in an ordered set (recurrence seed)</span>
&amp;PastWeeks.<span class="tok-f">element</span>(<span class="tok-n">0</span>).Key</pre>

      <div class="code-cap">find · set ops · calculated members</div>
      <table class="o9-table">
        <thead><tr><th>Construct</th><th>What it does</th></tr></thead>
        <tbody>
          <tr><td><code>find</code></td><td>Locate a single member by a condition (vs <code>filter</code>, which returns a set).</td></tr>
          <tr><td><code>setA UnionWith setB</code></td><td>Combine two member sets (all members in either).</td></tr>
          <tr><td><code>setA IntersectWith setB</code></td><td>Keep only members common to both sets.</td></tr>
          <tr><td><code>Filter_By_Updates</code></td><td>Show only rows changed-but-not-saved — review pending edits.</td></tr>
          <tr><td><code>With Calculated Members</code></td><td>Define a reusable computed member/column inline for the query.</td></tr>
        </tbody>
      </table>
      <div class="callout"><b>Count works on one level only:</b> <code>Customer.[CustomerName].count</code> ✓ and <code>Customer.[City].[Mumbai].relatedmembers([CustomerName]).count</code> ✓, but <code>(Customer.[City].[Mumbai] * Customer.[CustomerName].count)</code> ✗ — you can't count across a cross-product.</div>
    </div>`;

  container.querySelector('#tab-time').innerHTML = `
    <div class="section-pad">
      <p class="lead">Time calculations lean on the <code>@</code> operator and <code>LeadOffset</code> to reach other periods.</p>
      <div class="code-cap">Read a measure from a different period</div>
      <pre class="code"><span class="tok-k">Select</span> (... * Time.[Week].[1] *
   {Measure.[UnitSold]@(Time.#.leadoffset(<span class="tok-n">2</span>)) <span class="tok-k">as</span> Transient.Result});
<span class="tok-c">-- reads UnitSold from 2 weeks LATER, shown against Week 1</span></pre>
      <div class="code-cap">The inventory carry-over (recurrence)</div>
      <pre class="code">Measure.[Inventory] = Measure.[Inventory]@(Time.#.LeadOffset(-<span class="tok-n">1</span>))
                    + Measure.[Supply] - Measure.[Demand];
<span class="tok-c">-- LeadOffset(-1) = previous week</span></pre>
      <table class="o9-table">
        <thead><tr><th>Construct</th><th>Meaning</th></tr></thead>
        <tbody>
          <tr><td><code>@( … )</code></td><td>Read the measure at a different intersection</td></tr>
          <tr><td><code>LeadOffset(n)</code></td><td>Move n positions at the same level (+ future, − past)</td></tr>
          <tr><td><code>Time.#.Key</code></td><td>The current time member's date key — compare to date measures</td></tr>
          <tr><td><code>as Transient.X</code></td><td>Name a scratch/calculated column in the result</td></tr>
          <tr><td><code>todatetime("…")</code></td><td>Parse a string to a date (Time keys are dates)</td></tr>
        </tbody>
      </table>

      <div class="code-cap" style="margin-top:18px">Date/time functions</div>
      <table class="o9-table">
        <thead><tr><th>Function</th><th>Does</th><th>Example → result</th></tr></thead>
        <tbody>
          <tr><td><code>now()</code></td><td>Current server datetime</td><td><code>select now();</code></td></tr>
          <tr><td><code>ToDateTime(str)</code></td><td>String → date literal</td><td><code>todatetime("Aug 30 2018")</code> → 2018-08-30T00:00:00</td></tr>
          <tr><td><code>DateAdd(date, n, [unit])</code></td><td>Shift a date by n units</td><td><code>dateadd(todatetime("08/27/2018"), 2, [week])</code> → 2018-09-10</td></tr>
          <tr><td><code>DateDiff(d1, d2, [unit])</code></td><td>Difference between two dates</td><td><code>datediff(…"1/1/2000", …"08/31/2018", [month])</code> → 224</td></tr>
        </tbody>
      </table>
      <div class="callout"><b><code>ToDateTime</code> gotchas:</b> numeric month must come first (<code>MM/dd/yyyy</code>); a textual month (<code>Aug</code>) can go in any order. Units for <code>DateAdd</code>/<code>DateDiff</code>: <code>[year] [month] [week] [day] [hour] [minute] [second]</code>. To extract the year of a date measure, <code>datediff(todatetime("1/1/2000"), Measure.[D], [year])</code> gives years-since-2000 (add 2000 back).</div>
    </div>`;

  container.querySelector('#tab-fns').innerHTML = `
    <div class="section-pad">
      <p class="lead">The function reference you'll return to constantly: numeric, string, and the output-format strings for numbers and dates. The tricky ones — <code>Avg</code> vs <code>AvgWithNulls</code>, the <code>Floor/Ceiling/Round/Integer</code> family, and <code>SafeDivide</code>'s fallback — are exactly what gets asked.</p>

      <div class="code-cap">Numeric functions</div>
      <table class="o9-table">
        <thead><tr><th>Function</th><th>Purpose</th><th>Note</th></tr></thead>
        <tbody>
          <tr><td><code>Avg(a, b, …)</code></td><td>Average of the arguments</td><td><b>Ignores nulls</b> (averages only the non-null values)</td></tr>
          <tr><td><code>AvgWithNulls(a, b, …)</code></td><td>Average, nulls counted as 0</td><td>Divisor stays the same → nulls pull it <b>down</b></td></tr>
          <tr><td><code>Sum(a, b, …)</code></td><td>Sum of the <b>arguments in one row</b></td><td>NOT the same as a measure's cross-row aggregation</td></tr>
          <tr><td><code>Min / Max(a, b, …)</code></td><td>Smallest / largest argument</td><td></td></tr>
          <tr><td><code>Count</code></td><td>Count members in an attribute set</td><td>Single level attribute only — not a cross-product</td></tr>
          <tr><td><code>Abs(x)</code></td><td>Absolute value</td><td><code>abs(-8.5)</code> → 8.5</td></tr>
          <tr><td><code>Floor / Ceiling / Round / Integer(x)</code></td><td>Rounding family (see table below)</td><td><code>Floor</code> won't accept strings</td></tr>
          <tr><td><code>Float(x)</code></td><td>Numeric string → float</td><td>Needed before math on string-typed measures</td></tr>
          <tr><td><code>SafeDivide(a, b, fallback)</code></td><td><code>a/b</code>, but returns <code>fallback</code> when <code>b == 0</code></td><td>The right way to divide — never throws</td></tr>
          <tr><td><code>Coalesce(a, b, …)</code></td><td>First non-null argument</td><td>Universal null-guard</td></tr>
        </tbody>
      </table>

      <div class="vs-grid">
        <div class="vs-col sql"><h5><code>Avg</code> — ignores nulls</h5>
          <p style="color:var(--text2);font-size:12px">UnitPrice = 10858, UnitCost = null<br><br><code>Avg(10858, null)</code> = <b>10858</b><br><span style="color:var(--text3)">(average of just {10858})</span></p></div>
        <div class="vs-col ibpl"><h5><code>AvgWithNulls</code> — null = 0</h5>
          <p style="color:var(--text2);font-size:12px">Same inputs<br><br><code>AvgWithNulls(10858, null)</code> = <b>5429</b><br><span style="color:var(--text3)">((10858 + 0) / 2)</span></p></div>
      </div>

      <div class="code-cap">Floor / Ceiling / Round / Integer — know the sign behaviour</div>
      <table class="o9-table">
        <thead><tr><th>x</th><th>Floor (→ −∞)</th><th>Ceiling (→ +∞)</th><th>Round (nearest)</th><th>Integer (→ 0)</th></tr></thead>
        <tbody>
          <tr><td>2.85</td><td>2</td><td>3</td><td>3</td><td>2</td></tr>
          <tr><td>−2.85</td><td>−3</td><td>−2</td><td>−3</td><td>−2</td></tr>
          <tr><td>2.5</td><td>2</td><td>3</td><td>2</td><td>2</td></tr>
          <tr><td>3.5</td><td>3</td><td>4</td><td>4</td><td>3</td></tr>
        </tbody>
      </table>
      <div class="callout"><b><code>Integer</code> truncates toward zero</b> — positive numbers behave like <code>Floor</code>, negatives like <code>Ceiling</code>. That's the distinction interviewers want: <code>Floor(-2.85) = -3</code> but <code>Integer(-2.85) = -2</code>.</div>

      <div class="code-cap">SafeDivide — the three-argument form</div>
      <pre class="code"><span class="tok-f">SafeDivide</span>(<span class="tok-n">4</span>, <span class="tok-n">3</span>)        <span class="tok-c">-- 1.333…</span>
<span class="tok-f">SafeDivide</span>(<span class="tok-n">8</span>, <span class="tok-n">5</span>, <span class="tok-n">3</span>)     <span class="tok-c">-- 1.6   (fallback ignored — divisor ≠ 0)</span>
<span class="tok-f">SafeDivide</span>(<span class="tok-n">8</span>, <span class="tok-n">0</span>, <span class="tok-n">3</span>)     <span class="tok-c">-- 3     (divisor is 0 → returns the fallback)</span>
<span class="tok-c">-- Profit % that never divides by zero:</span>
<span class="tok-f">SafeDivide</span>((Measure.[UnitPrice] - Measure.[UnitCost]) * <span class="tok-n">100</span>, Measure.[UnitCost], <span class="tok-n">9</span>) <span class="tok-k">as</span> Transient.ProfitPct;</pre>

      <div class="code-cap">Coalesce — first non-null, chained</div>
      <pre class="code"><span class="tok-f">Coalesce</span>(Measure.[UnitPrice], <span class="tok-n">0</span>)                              <span class="tok-c">-- price, else 0</span>
<span class="tok-f">Coalesce</span>(Measure.[UnitPrice], <span class="tok-n">1.4</span>*Measure.[UnitCost], <span class="tok-n">0</span>)   <span class="tok-c">-- price, else 40% markup on cost, else 0</span></pre>

      <div class="code-cap">String functions</div>
      <table class="o9-table">
        <thead><tr><th>Function</th><th>Example</th><th>Result</th></tr></thead>
        <tbody>
          <tr><td><code>ToString(x)</code></td><td><code>ToString(5+3)</code></td><td><code>"8"</code> — convert to string</td></tr>
          <tr><td><code>Upper(s)</code></td><td><code>Upper("Hello!")</code></td><td><code>"HELLO!"</code></td></tr>
          <tr><td><code>Lower(s)</code></td><td><code>Lower("Hello!")</code></td><td><code>"hello!"</code></td></tr>
          <tr><td><code>+</code> (concat)</td><td><code>"Rs. " + Measure.[TextPrice] + "/- only"</code></td><td><code>"Rs. 10857.63/- only"</code></td></tr>
        </tbody>
      </table>
      <div class="callout warn">String functions work on measure/string <b>values</b>, not directly on attribute members. And when a measure is string-typed, wrap it in <code>float(…)</code> before doing math — otherwise <code>+</code> concatenates instead of adding.</div>

      <div class="code-cap">Number format strings (display only)</div>
      <table class="o9-table">
        <thead><tr><th>Format</th><th>1234567.1256 →</th><th>−9875.23 →</th></tr></thead>
        <tbody>
          <tr><td><code>#.00</code></td><td>1234567.13</td><td>−9875.23</td></tr>
          <tr><td><code>,.00</code></td><td>1,234,567.13</td><td>−9,875.23</td></tr>
          <tr><td><code>$ ,.00</code></td><td>$ 1,234,567.13</td><td>−$ 9,875.23</td></tr>
          <tr><td><code>#.00 a</code></td><td>1.23 m</td><td>−9.86 k</td></tr>
          <tr><td><code>,.00;(,.00)</code></td><td>1,234,567.13</td><td>(9,875.23)</td></tr>
        </tbody>
      </table>
      <div class="callout"><code>;</code> splits positive-from-negative format (accountant parentheses) · <code>,</code> thousands · <code>$</code> currency · <code>a</code> scale suffix (k/m) · <code>o</code> ordinal (1st) · <code>%</code> multiplies by 100.</div>

      <div class="code-cap">Date format strings</div>
      <table class="o9-table">
        <thead><tr><th>Symbol</th><th>Meaning</th><th>Sample</th></tr></thead>
        <tbody>
          <tr><td><code>d</code> / <code>dd</code></td><td>Day of month, 1 / 2 digits</td><td>6 / 06</td></tr>
          <tr><td><code>ddd</code> / <code>dddd</code></td><td>Day name short / full</td><td>Thu / Thursday</td></tr>
          <tr><td><code>M</code>/<code>MM</code>/<code>MMM</code>/<code>MMMM</code></td><td>Month: num / 2-dig / abbr / full</td><td>8 / 08 / Aug / August</td></tr>
          <tr><td><code>yy</code> / <code>yyyy</code></td><td>Year, 2 / 4 digits</td><td>18 / 2018</td></tr>
          <tr><td><code>hh</code> / <code>HH</code></td><td>12-hour / 24-hour hour</td><td>08 / 08</td></tr>
          <tr><td><code>mm</code> / <code>ss</code></td><td>Minute / second</td><td>42 / 54</td></tr>
          <tr><td><code>tt</code> / <code>zzz</code></td><td>AM-PM / timezone</td><td>PM / +05:30</td></tr>
        </tbody>
      </table>
      <div class="callout"><b>Patterns:</b> <code>yyyy-MM-dd HH:mm:ss</code> → 2018-08-30 08:42:54 · <code>dd-MMM-yyyy</code> → 30-Aug-2018. Default IBPL datetime format: <code>yyyy-MM-ddThh:mm:ss.ffffffzzz</code>. Formatting <code>2018-08-30 08:42:54</code> with <code>yyyy/MM/dd HH:mm</code> → <code>2018/08/30 08:42</code> (seconds dropped).</div>
    </div>`;

  const drill = container.querySelector('#tab-drill');
  drill.innerHTML = `<div class="section-pad">${createExerciseSet(M08_EX, { intro: 'Two write/fix exercises on computed measures and null propagation — run them against the simulator.' })}</div>`;
  const cleanup = initExerciseSet(drill, M08_EX);
  return () => { cleanup && cleanup(); };
}
