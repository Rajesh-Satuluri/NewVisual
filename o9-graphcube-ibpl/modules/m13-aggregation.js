import { createModuleShell, createIQSection } from '../components/module-shell.js';

const AGG = [
  ['Sum','Add children','The default for quantities & revenue'],
  ['Min','Smallest child',''],
  ['Max','Largest child',''],
  ['Avg','Average of children','Ignores how many are null'],
  ['AvgNonNull','Average of non-null children',''],
  ['AvgNonNullOrZero','Average of children that are non-null and non-zero',''],
  ['FirstChild','Value of first child','Opening balance (e.g. start-of-period inventory)'],
  ['LastChild','Value of last child','Closing balance (e.g. end-of-period inventory)'],
  ['Computed','Derived by a rule','Not a simple roll-up'],
  ['Null','No aggregation','Leaf-only measure'],
];

export const IQ = [
  { q: 'Why does spreading exist, and when can you NOT edit a measure at an aggregate level?',
    a: 'Planners review and adjust at aggregate levels ("bump Fructis +10%"), but data is stored at leaves — so the system must push the aggregate change down to the SKUs. That is spreading. The rule: if no spreading rule is defined for a measure, you cannot edit it at an aggregate level at all — only at leaf level. Also, all basis measures must share the target\'s grain, and you can\'t spread a calculative measure (upload a fact file at the required grain instead).',
    tip: 'One-liner: "no spreading rule → aggregate edits are blocked; you can only write leaves."' },
  { q: 'Explain CopyToLeaves vs DistributeToLeaves with an example.',
    a: 'CopyToLeaves copies the aggregate value verbatim to every leaf — correct when the aggregation is Min/Max/Avg (parent stays equal to the copied value), but WRONG with Sum (set State=8 over 2 cities → both become 8 → parent re-aggregates to 16). DistributeToLeaves splits the aggregate proportional to a basis measure: set State=15 with current Valsad=4, Ahmedabad=6 (self basis) → 15×4/10=6 and 15×6/10=9. That keeps Sum consistent. So: CopyToLeaves for Min/Max/Avg, DistributeToLeaves for Sum.',
    tip: 'The trap they test: CopyToLeaves + Sum double-counts. Give the 8→16 example.' },
  { q: 'What are the four basis measures in DistributeToLeaves and the fallback chain?',
    a: 'BasisMeasure — primary distribution weights (always first). NullBasisMeasure — fallback used only when the primary basis sums to null/zero. AssortmentBasisMeasure — flags which leaves are eligible to receive value at all. RespreadBasisMeasure — weights used only during an explicit RESPREAD command. If the primary basis sums to null/zero and there\'s no null-basis, the value splits EQUALLY among eligible leaves, and new intersections are created.',
    tip: 'Order them: Basis → NullBasis (fallback) → Assortment (eligibility) → Respread (respread only). Equal split when basis is empty.' },
  { q: 'What is a "self basis"?',
    a: 'A self basis is DistributeToLeaves where the basis measure IS the target measure itself — the new aggregate is distributed proportional to the leaves\' current values. Set a State total to 15 when Valsad=4 and Ahmedabad=6 today → they become 6 and 9, preserving their existing ratio. It is the most common case because planners usually want "grow everyone proportionally to where they are now."',
    tip: 'Self basis = distribute by the measure\'s own current values → preserves the existing mix.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M13 · Data Model',
    title: 'Aggregation & Spreading',
    subtitle: 'Roll-up policies (how leaves become parents) and spreading (how an aggregate edit flows back to leaves).',
    tabs: [
      { id: 'agg',    label: '↑ Aggregation Policies' },
      { id: 'spread', label: '↓ Spreading Types' },
      { id: 'basis',  label: '🎭 The 4 Basis Measures' },
      { id: 'iq',     label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });

  container.querySelector('#tab-agg').innerHTML = `
    <div class="section-pad">
      <p class="lead">Aggregation decides how leaf values roll <b>up</b> to parents (computed on read). The policy is per-measure.</p>
      <table class="o9-table">
        <thead><tr><th>Policy</th><th>Rolls up as</th><th>Use for</th></tr></thead>
        <tbody>${AGG.map(([p,d,u])=>`<tr><td><code>${p}</code></td><td>${d}</td><td>${u||'—'}</td></tr>`).join('')}</tbody>
      </table>
      <div class="callout"><b>FirstChild / LastChild</b> are the inventory classics: opening balance = first bucket's value, closing balance = last bucket's value — not a sum.</div>
    </div>`;

  container.querySelector('#tab-spread').innerHTML = `
    <div class="section-pad">
      <p class="lead">Spreading decides how an edit at a parent flows <b>down</b> to leaves. Two types — and picking the wrong one with Sum breaks the numbers.</p>
      <div class="vs-grid">
        <div class="vs-col sql"><h5>CopyToLeaves</h5>
          <p style="color:var(--text2);font-size:12.5px">Copies the parent value to every leaf verbatim.<br><br>
          ✅ Min / Max / Avg / AvgNonNull — parent stays equal to the copied value.<br>
          ❌ <b>Sum</b> — set State=8 over 2 cities → both=8 → parent re-aggregates to 16.</p></div>
        <div class="vs-col ibpl"><h5>DistributeToLeaves</h5>
          <p style="color:var(--text2);font-size:12.5px">Splits the parent proportional to a basis.<br><br>
          Self basis: State 10→15, Valsad 4→6, Ahmedabad 6→9 (keep the ratio).<br>
          ✅ Correct for <b>Sum</b> measures.</p></div>
      </div>
      <div class="code-cap">Worked example — DistributeToLeaves (self basis)</div>
      <table class="o9-table">
        <thead><tr><th>City</th><th>Before</th><th>Parent set to 15 →</th></tr></thead>
        <tbody>
          <tr><td>Valsad</td><td>4</td><td>15 × (4/10) = <b>6</b></td></tr>
          <tr><td>Ahmedabad</td><td>6</td><td>15 × (6/10) = <b>9</b></td></tr>
        </tbody>
      </table>
      <div class="callout warn"><b>No rule, no aggregate edit.</b> If a measure has no spreading rule you can only write it at leaf level. Basis measures must share the target's grain. Calculative measures can't be spread — upload a fact file.</div>
    </div>`;

  container.querySelector('#tab-basis').innerHTML = `
    <div class="section-pad">
      <p class="lead">Once you choose DistributeToLeaves, four basis "slots" with a defined fallback chain control the weights.</p>
      <table class="o9-table">
        <thead><tr><th>Slot</th><th>Purpose</th><th>When it kicks in</th></tr></thead>
        <tbody>
          <tr><td><code>BasisMeasure</code></td><td>Primary distribution weights</td><td>Always the first choice</td></tr>
          <tr><td><code>NullBasisMeasure</code></td><td>Fallback weights</td><td>Only when primary basis sums to null/zero</td></tr>
          <tr><td><code>AssortmentBasisMeasure</code></td><td>Flags which leaves are eligible</td><td>Restricts which leaves can receive value</td></tr>
          <tr><td><code>RespreadBasisMeasure</code></td><td>Weights for the RESPREAD command</td><td>Only during explicit respread</td></tr>
        </tbody>
      </table>
      <div class="code-cap">Basis all null/zero → equal split, new intersections created</div>
      <table class="o9-table">
        <thead><tr><th>SKU</th><th>Basis (Sold)</th><th>Parent 80 →</th></tr></thead>
        <tbody>
          <tr><td>Cinthol</td><td>(null)</td><td>40 (equal)</td></tr>
          <tr><td>Breeze</td><td>0</td><td>40 (equal)</td></tr>
        </tbody>
      </table>
      <div class="callout">With a real basis (Cinthol=1, Breeze=3), the same 80 would split 20 / 60 — proportional, not equal.</div>
    </div>`;

  return null;
}
