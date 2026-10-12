import { createModuleShell, createIQSection } from '../components/module-shell.js';

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
      { id: 'analytic', label: '🌲 Analytical Functions' },
      { id: 'time',   label: '⏱️ Time & @' },
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
      <div class="code-cap">filter predicates</div>
      <pre class="code">Customer.[CustomerName].filter(#.Name <span class="tok-k">startswith</span> ([A]) || #.Name <span class="tok-k">endswith</span> ([E]))
Customer.[City].filter(#.Name <span class="tok-k">contains</span> "mu")   <span class="tok-c">-- Muzzafarpur, Mumbai, Yamunanagar…</span></pre>
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
    </div>`;

  return null;
}
