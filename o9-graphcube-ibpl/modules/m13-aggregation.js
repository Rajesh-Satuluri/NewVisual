import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { aggregatePolicy, distributeToLeaves } from '../lib/ibpl-sim.js';
import { createExerciseSet, initExerciseSet } from '../components/exercise.js';

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

const EXERCISES = [
  { id:'m13-predict-policy', type:'predict', area:'model', difficulty:1, competencyLabel:'Policy choice', verify:'verified',
    prompt:'On-hand inventory is reviewed by week within a month. The <b>opening balance</b> for the month should be which aggregation policy over the weekly leaves?',
    options:[ {text:'Sum', why:'Summing weekly on-hand would invent inventory that never existed.'}, {text:'FirstChild', correct:true, why:'Opening balance = the first bucket’s value; closing = LastChild. Neither is a sum.'}, {text:'Avg', why:'An average of weekly balances is not the opening position.'} ],
    explanation:'Balances are semi-additive: they sum across Item/Location but NOT across Time. FirstChild/LastChild give opening/closing; a naïve Sum over time is the classic error.' },

  { id:'m13-predict-nullavg', type:'predict', area:'concept', difficulty:2, competencyLabel:'Null vs zero', verify:'simulated',
    prompt:'Leaves are <code>[null, 10]</code> with policy <b>Avg</b>. One teammate argues the parent is 5, another says 10. Who’s right — and what if the null were an explicit 0?',
    options:[ {text:'10 now; 5 if it were 0', correct:true, why:'Avg divides by the count of stored values (one), giving 10. An explicit 0 is a stored leaf, so avg of {0,10}=5.'}, {text:'5 now; 10 if it were 0', why:'Backwards — the unstored null is skipped, not the zero.'}, {text:'10 in both cases', why:'An explicit 0 counts toward the average.'} ],
    explanation:'This is the single most common aggregation bug: a sparse null is skipped by Avg, but a real zero is counted. Try it in the Aggregation Lab.' },

  { id:'m13-predict-copysum', type:'predict', area:'debug', difficulty:2, competencyLabel:'CopyToLeaves trap', verify:'verified',
    prompt:'A <b>Sum</b> measure has a <code>CopyToLeaves</code> spreading rule. A planner sets the State total to 8 across 2 cities. On reopen, the State shows…',
    options:[ {text:'8 (correct)', why:'Only true for Min/Max/Avg. With Sum, copying 8 to each city double-counts.'}, {text:'16 (double-counted)', correct:true, why:'CopyToLeaves writes 8 to both cities; a Sum parent re-aggregates 8+8=16.'}, {text:'4 (halved)', why:'Nothing halves here — that would be a distribute.'} ],
    explanation:'CopyToLeaves + Sum is the textbook spreading bug. Sum measures must use DistributeToLeaves so the total is split, not copied. Reproduce it in the Spreading Lab.' },

  { id:'m13-predict-distself', type:'predict', area:'model', difficulty:2, competencyLabel:'Self basis', verify:'simulated',
    prompt:'DistributeToLeaves with a <b>self basis</b>: leaves are Valsad=4, Ahmedabad=6 and a planner sets the State total to 15. The new leaf values are…',
    options:[ {text:'7.5 and 7.5 (equal)', why:'Equal split only happens when the basis sums to null/zero.'}, {text:'6 and 9 (proportional)', correct:true, why:'15 × 4/10 = 6 and 15 × 6/10 = 9 — the existing 4:6 ratio is preserved.'}, {text:'4 and 6 (unchanged)', why:'The total changed from 10 to 15, so leaves must move.'} ],
    explanation:'Self basis distributes by the measure’s own current values, preserving the existing mix. It’s the default planner intuition: "grow everyone proportionally."' },

  { id:'m13-diag-nospread', type:'diagnose', area:'debug', difficulty:2, competencyLabel:'Diagnose · blocked edit', verify:'verified',
    prompt:'A planner edits a Brand-level forecast, hits save, and the value reverts on reopen. Leaf-level edits stick fine. Most likely cause?',
    options:[ {text:'The measure has no spreading rule, so aggregate edits are rejected', correct:true, why:'Without a spreading rule you can only write leaves; aggregate writes are silently discarded.'}, {text:'A version isolation issue', why:'That would affect leaf edits too, not just aggregate ones.'}, {text:'The measure is read-only', why:'Then leaf edits would not stick either.'} ],
    explanation:'Fix: define a spreading rule (CopyToLeaves for Min/Max/Avg, DistributeToLeaves for Sum) or have the planner edit at leaf level.' },

  { id:'m13-explain-basis', type:'explain', area:'concept', difficulty:3, competencyLabel:'Basis fallback chain', verify:'verified',
    prompt:'Explain the four DistributeToLeaves basis slots and the exact order they take effect — then what happens when the primary basis sums to zero.',
    explanation:'<b>BasisMeasure</b> — the primary weights, used first. <b>NullBasisMeasure</b> — a fallback used only when the primary basis sums to null/zero. <b>AssortmentBasisMeasure</b> — an eligibility flag deciding which leaves may receive value at all (it gates, it does not weight). <b>RespreadBasisMeasure</b> — weights used only during an explicit RESPREAD. Order: eligibility (Assortment) filters the leaf set, then weights come from Basis → NullBasis. If the primary basis sums to null/zero and there is no null-basis, the aggregate splits <b>equally</b> among the eligible leaves and new intersections are created as needed.',
    pitfalls:'Thinking Assortment provides weights (it only gates eligibility); forgetting the equal-split fallback when the basis is empty.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M13 · Data Model',
    title: 'Aggregation & Spreading',
    subtitle: 'Roll-up policies (how leaves become parents) and spreading (how an aggregate edit flows back to leaves) — with two live labs.',
    tabs: [
      { id: 'agg',    label: '↑ Policies' },
      { id: 'agglab', label: '🧮 Aggregation Lab' },
      { id: 'spread', label: '↓ Spreading' },
      { id: 'splab',  label: '💧 Spreading Lab' },
      { id: 'basis',  label: '🎭 Basis Measures' },
      { id: 'iq',     label: '🎯 Interview Q&A', content: createIQSection(IQ) },
      { id: 'drill',  label: '🧪 Exercises' },
    ],
  });

  container.querySelector('#tab-agg').innerHTML = `
    <div class="section-pad">
      <p class="lead">Aggregation decides how leaf values roll <b>up</b> to parents (computed on read). The policy is per-measure.</p>
      <table class="o9-table">
        <thead><tr><th>Policy</th><th>Rolls up as</th><th>Use for</th></tr></thead>
        <tbody>${AGG.map(([p,d,u])=>`<tr><td><code>${p}</code></td><td>${d}</td><td>${u||'—'}</td></tr>`).join('')}</tbody>
      </table>
      <div class="callout"><b>FirstChild / LastChild</b> are the inventory classics: opening balance = first bucket's value, closing = last bucket's value — not a sum.</div>
      <div class="callout warn"><b>Semi-additive:</b> balances (on-hand, headcount) sum across Item/Location but <b>not</b> across Time. Pick FirstChild/LastChild for the time roll-up.</div>
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
      <div class="callout">Try the fallback live in the <b>Spreading Lab</b>: set every basis to 0 and watch the aggregate split equally instead.</div>
    </div>`;

  const cleanupAgg = renderAggLab(container.querySelector('#tab-agglab'));
  const cleanupSp = renderSpreadLab(container.querySelector('#tab-splab'));

  const drill = container.querySelector('#tab-drill');
  drill.innerHTML = `<div class="section-pad">${createExerciseSet(EXERCISES, { intro: 'Six exercises on policies, null-vs-zero, the CopyToLeaves trap and the basis fallback chain. Reproduce each in the labs above.' })}</div>`;
  const cleanupEx = initExerciseSet(drill, EXERCISES);

  return () => { cleanupAgg && cleanupAgg(); cleanupSp && cleanupSp(); cleanupEx && cleanupEx(); };
}

/* ───────────────────────── Aggregation Lab ──────────────────────────────── */
function renderAggLab(el) {
  const POLICIES = ['Sum','Min','Max','Avg','AvgNonNull','AvgNonNullOrZero','FirstChild','LastChild'];
  const leaves = [
    { n:'W01', v:120 }, { n:'W02', v:null }, { n:'W03', v:0 }, { n:'W04', v:90 },
  ];
  el.innerHTML = `
    <div class="section-pad">
      <p class="lead">Four weekly leaves roll up to one month. Change the policy and edit a leaf (leave a cell blank for a sparse <code>null</code>, type <code>0</code> for a real zero) — watch the parent recompute. This is where "null ≠ zero" becomes obvious.</p>
      <div class="lab-controls">
        <label class="lab-sel">Aggregation policy
          <select id="agg-policy">${POLICIES.map(p=>`<option${p==='Sum'?' selected':''}>${p}</option>`).join('')}</select>
        </label>
      </div>
      <table class="o9-table lab-table">
        <thead><tr><th>Week (leaf)</th><th>Value</th></tr></thead>
        <tbody id="agg-rows"></tbody>
        <tfoot><tr><th>Month (parent)</th><th id="agg-parent" class="lab-parent"></th></tr></tfoot>
      </table>
      <div class="callout warn" id="agg-insight"></div>
    </div>`;

  const rowsEl = el.querySelector('#agg-rows');
  const parentEl = el.querySelector('#agg-parent');
  const insight = el.querySelector('#agg-insight');
  const policyEl = el.querySelector('#agg-policy');

  const draw = () => {
    rowsEl.innerHTML = leaves.map((l,i)=>`<tr><td>${l.n}</td>
      <td><input class="lab-in" data-i="${i}" type="text" value="${l.v===null?'':l.v}" placeholder="(null)" style="width:90px"></td></tr>`).join('');
  };
  const compute = () => {
    const policy = policyEl.value;
    const vals = leaves.map(l => l.v);
    const p = aggregatePolicy(vals, policy);
    parentEl.textContent = p === null ? 'null' : (Math.round(p*1e4)/1e4);
    const nNull = vals.filter(v=>v===null).length;
    const nZero = vals.filter(v=>v===0).length;
    insight.innerHTML = policy==='Sum'
      ? `<b>Sum</b> skips the ${nNull} null cell(s) and adds the rest (the explicit 0 contributes 0). Switch to <b>Avg</b> vs <b>AvgNonNullOrZero</b> to see the divisor change.`
      : (policy.startsWith('Avg')
        ? `<b>${policy}</b> divides by ${policy==='AvgNonNullOrZero' ? `non-null-non-zero leaves (${vals.filter(v=>v!==null&&v!==0).length})` : `non-null leaves (${vals.filter(v=>v!==null).length})`}. The ${nNull} null is skipped${policy==='AvgNonNullOrZero'?` and the ${nZero} zero too`:`; a real 0 still counts`}.`
        : `<b>${policy}</b> picks a single leaf, not a combination — this is how opening/closing balances roll up over time.`);
  };
  const onIn = (e) => {
    if (e.target.classList.contains('lab-in')) {
      const i = +e.target.dataset.i; const raw = e.target.value.trim();
      leaves[i].v = raw === '' ? null : (Number.isNaN(Number(raw)) ? null : Number(raw));
      compute();
    }
  };
  const onChange = () => compute();
  draw(); compute();
  el.addEventListener('input', onIn);
  policyEl.addEventListener('change', onChange);
  return () => { el.removeEventListener('input', onIn); policyEl.removeEventListener('change', onChange); };
}

/* ───────────────────────── Spreading Lab ────────────────────────────────── */
function renderSpreadLab(el) {
  const leaves = [
    { n:'320D-Pump', basis:4, elig:true },
    { n:'320D-Seal', basis:6, elig:true },
    { n:'330-Drive', basis:0, elig:true },
  ];
  el.innerHTML = `
    <div class="section-pad">
      <p class="lead">Set an aggregate and watch it reach the leaves. Flip between <b>CopyToLeaves</b> and <b>DistributeToLeaves</b>, edit the basis, and toggle eligibility. The "re-aggregates to" row is the Sum the parent will show on reopen — the moment CopyToLeaves + Sum breaks.</p>
      <div class="lab-controls">
        <label class="lab-sel">Aggregate value
          <input id="sp-agg" type="number" value="15" style="width:90px">
        </label>
        <label class="lab-sel">Method
          <select id="sp-method"><option value="dist" selected>DistributeToLeaves</option><option value="copy">CopyToLeaves</option></select>
        </label>
      </div>
      <table class="o9-table lab-table">
        <thead><tr><th>Leaf (SKU)</th><th>Basis</th><th>Eligible</th><th>Leaf value</th></tr></thead>
        <tbody id="sp-rows"></tbody>
        <tfoot><tr><th colspan="3">Re-aggregates to (Sum)</th><th id="sp-reagg" class="lab-parent"></th></tr></tfoot>
      </table>
      <div class="callout" id="sp-insight"></div>
    </div>`;

  const rowsEl = el.querySelector('#sp-rows');
  const reaggEl = el.querySelector('#sp-reagg');
  const insight = el.querySelector('#sp-insight');
  const aggEl = el.querySelector('#sp-agg');
  const methodEl = el.querySelector('#sp-method');

  const compute = () => {
    const agg = Number(aggEl.value) || 0;
    const method = methodEl.value;
    let vals;
    if (method === 'copy') {
      vals = leaves.map(l => l.elig ? agg : null);
    } else {
      const basis = leaves.map(l => l.basis);
      const assort = leaves.map(l => l.elig ? 1 : 0);
      vals = distributeToLeaves(agg, basis, assort);
    }
    rowsEl.innerHTML = leaves.map((l,i)=>`<tr>
      <td>${l.n}</td>
      <td><input class="lab-in sp-basis" data-i="${i}" type="number" value="${l.basis}" style="width:70px"${method==='copy'?' disabled':''}></td>
      <td><input class="sp-elig" data-i="${i}" type="checkbox" ${l.elig?'checked':''}></td>
      <td><b>${vals[i]===null||vals[i]===undefined?'<span class="sim-null">—</span>':(Math.round(vals[i]*1e4)/1e4)}</b></td></tr>`).join('');
    const reagg = vals.reduce((s,v)=>s+(v||0),0);
    reaggEl.textContent = Math.round(reagg*1e4)/1e4;
    const eligCount = leaves.filter(l=>l.elig).length;
    const basisSum = leaves.filter(l=>l.elig).reduce((s,l)=>s+(l.basis||0),0);
    if (method==='copy') {
      insight.className = 'callout ' + (Math.abs(reagg-agg) > 1e-9 ? 'warn' : '');
      insight.innerHTML = Math.abs(reagg-agg) > 1e-9
        ? `⚠️ <b>CopyToLeaves + Sum double-counts.</b> Each eligible leaf got the full ${agg}; a Sum parent re-aggregates to ${Math.round(reagg*1e4)/1e4} (= ${agg} × ${eligCount} eligible leaves), not ${agg}. Use DistributeToLeaves for Sum measures.`
        : `CopyToLeaves copies ${agg} to every eligible leaf. Correct only for Min/Max/Avg, where the parent stays equal to ${agg}.`;
    } else {
      insight.className = 'callout';
      insight.innerHTML = basisSum === 0
        ? `Basis sums to 0 → <b>equal split</b> fallback: ${agg} ÷ ${eligCount} eligible = ${Math.round((agg/eligCount)*1e4)/1e4} each. (Set a real basis to weight it.)`
        : `DistributeToLeaves splits ${agg} by basis weight, so the leaves re-aggregate back to exactly ${Math.round(reagg*1e4)/1e4}. Ineligible leaves (Assortment) receive nothing.`;
    }
  };

  const onIn = (e) => {
    if (e.target.classList.contains('sp-basis')) { leaves[+e.target.dataset.i].basis = Number(e.target.value)||0; compute(); }
    if (e.target.id === 'sp-agg') compute();
  };
  const onChange = (e) => {
    if (e.target.classList.contains('sp-elig')) { leaves[+e.target.dataset.i].elig = e.target.checked; compute(); }
    if (e.target.id === 'sp-method') compute();
  };
  compute();
  el.addEventListener('input', onIn);
  el.addEventListener('change', onChange);
  return () => { el.removeEventListener('input', onIn); el.removeEventListener('change', onChange); };
}
