import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { createExerciseSet, initExerciseSet } from '../components/exercise.js';

// End-to-end guided model-build project — one decision per stage.
const BP = [
  { id:'bp-dims', type:'diagnose', area:'model', difficulty:1, competencyLabel:'Stage 1 · Dimensions', verify:'verified',
    prompt:'<b>Stage 1 — Requirement:</b> "Weekly demand forecast by <b>product</b> and <b>location</b>, reviewed per <b>customer</b>, with <b>what-if scenarios</b>." Which dimension set?',
    options:[ {text:'Item, LogisticsCenter, Customer, PlanningCalendar, Version', correct:true, why:'Product→Item, location→LC, customer review→Customer, weekly→PlanningCalendar, scenarios→Version.'}, {text:'Item, LogisticsCenter, PlanningCalendar', why:'Misses Customer (review axis) and Version (scenarios).'}, {text:'Item, Supplier, PlanningCalendar, Version', why:'Supplier is supply-side; this is a demand forecast.'} ],
    explanation:'Map each noun in the requirement to a dimension. "Scenarios/what-if" always implies Version; a review axis ("by customer") is a real dimension, not just a filter.' },
  { id:'bp-grain', type:'diagnose', area:'model', difficulty:2, competencyLabel:'Stage 2 · Grain', verify:'verified',
    prompt:'<b>Stage 2 — Fact grain.</b> Given those dimensions and a weekly demand review, the measure-group grain should be…',
    options:[ {text:'Customer × Item × LogisticsCenter × FiscalWeek × Version', correct:true, why:'Matches the review granularity; Version is always part of the grain.'}, {text:'Item × Day × Version', why:'Day is finer than needed (explodes cells) and drops Customer/LC.'}, {text:'Customer × Item × Month × Version', why:'Monthly is coarser than the weekly requirement.'} ],
    explanation:'Grain = the finest level the plan is actually reviewed/edited at. Finer "just in case" multiplies intersections; coarser loses the needed detail.' },
  { id:'bp-measures', type:'diagnose', area:'model', difficulty:2, competencyLabel:'Stage 3 · Measures', verify:'verified',
    prompt:'<b>Stage 3 — Measures.</b> Which split is right for this group?',
    options:[ {text:'Editable: Forecast Quantity, BAF, USE_BAF · Calculated: Net Forecast, Forecast Error, MAPE', correct:true, why:'Planners type the base forecast and overrides; the derived metrics come from rules.'}, {text:'Everything editable', why:'Error/MAPE must be derived, not typed, or they drift from their inputs.'}, {text:'Everything calculated', why:'Then planners could not enter a forecast or an override at all.'} ],
    explanation:'Editable vs calculative is a per-measure flag. Inputs (forecast, overrides, flags) are editable; KPIs (error, MAPE, net) are calculated by rules and cannot be directly edited or spread.' },
  { id:'bp-agg', type:'predict', area:'model', difficulty:2, competencyLabel:'Stage 4 · Aggregation', verify:'verified',
    prompt:'<b>Stage 4 — Aggregation.</b> Forecast Quantity rolls up by Sum. The companion <b>on-hand inventory</b> opening balance should roll up over Time by…',
    options:[ {text:'Sum', why:'Summing weekly on-hand invents inventory that never existed.'}, {text:'FirstChild', correct:true, why:'Opening balance = the first bucket’s value; it is semi-additive (sums across Item/LC, not Time).'}, {text:'Avg', why:'An average of balances is not the opening position.'} ],
    explanation:'Quantities Sum; balances are semi-additive (FirstChild/LastChild over Time). Choosing the policy per measure is part of model design.' },
  { id:'bp-ibpl', type:'write', area:'ibpl', difficulty:2, dataset:'cat-forecast', competencyLabel:'Stage 5 · IBPL', verify:'simulated',
    prompt:'<b>Stage 5 — Calculation.</b> Build the <b>Net Forecast</b> as a transient = Forecast + BAF when USE_BAF = 1, else just Forecast. Null-safe. Run it.',
    starter:'Select ([Item].[SKU] * [Time].[Week] *\n  {  as Transient.NetForecast })\nwhere { Version.[Version Name].filter(#.Key == 0) };',
    check:(res)=>{ if(!res.ok) return {correct:false,msg:'❌ '+res.error}; if(res.columns[res.columns.length-1]!=='NetForecast') return {correct:false,msg:'❌ Name the transient <code>Transient.NetForecast</code>.'}; const anyNull = res.rows.some(r=>r[r.length-1]==null); return anyNull?{correct:false,msg:'❌ Some rows are null — coalesce the base forecast.'}:{correct:true,msg:'✅ Net Forecast computed with the USE_BAF gate, null-safe.'}; },
    explanation:'<code>coalesce(Measure.[Forecast Quantity],0) + if (Measure.[USE_BAF] == 1) then coalesce(Measure.[BAF],0) else 0 as Transient.NetForecast</code>.' },
  { id:'bp-validate', type:'diagnose', area:'debug', difficulty:2, competencyLabel:'Stage 6 · Validation', verify:'verified',
    prompt:'<b>Stage 6 — Validation.</b> The daily load sometimes brings SKUs not yet in the item master. The right guard is…',
    options:[ {text:'Reject/stage facts whose Item is not in master data (referential integrity)', correct:true, why:'Members must exist before facts reference them; otherwise facts orphan and totals drift.'}, {text:'Auto-create the missing SKUs from the fact file', why:'Silently inventing members hides data-quality problems and corrupts the hierarchy.'}, {text:'Ignore it — GraphCube handles missing keys', why:'It does not; orphaned facts roll up nowhere.'} ],
    explanation:'Load members first, then facts; validate that every fact key resolves to an existing member at the right grain. Stage-and-reject beats auto-create.' },
  { id:'bp-version', type:'predict', area:'business', difficulty:2, competencyLabel:'Stage 7 · Versions', verify:'verified',
    prompt:'<b>Stage 7 — Version strategy.</b> To compare an aggressive what-if against a frozen baseline, you need…',
    options:[ {text:'CWV for live, a scenario (Key<0) for the what-if, and a snapshot (Key>0) as the frozen baseline', correct:true, why:'Three roles: live plan, isolated what-if, read-only frozen comparison point.'}, {text:'Just the CWV', why:'A single version cannot hold both the live plan and an isolated what-if.'}, {text:'Two CWVs', why:'There is exactly one CWV (Key 0); scenarios and snapshots are separate version types.'} ],
    explanation:'CWV (0) = live; scenario (<0) = isolated what-if; snapshot (>0) = frozen baseline to compare against. Scenario-vs-baseline needs the snapshot.' },
  { id:'bp-perf', type:'explain', area:'business', difficulty:3, competencyLabel:'Stage 8 · Performance', verify:'verified',
    prompt:'<b>Stage 8 — Performance review & deployment.</b> Before shipping, what would you check so this model scales — and what is the single biggest risk? Reveal a reference.',
    explanation:'<b>Reference.</b> (1) <b>Grain/sparsity:</b> estimate populated intersections — Customer×Item×LC×Week×Version can be large; confirm it stays sparse (only real combinations exist) and consider dropping Customer where the plan does not truly vary by customer. (2) <b>Scope hygiene:</b> ensure rules filter members and avoid unfiltered cartesian scopes. (3) <b>Calculation order/dependencies:</b> verify no cycles and that calculated measures evaluate after their inputs. (4) <b>Aggregation policies</b> set per measure (Sum vs FirstChild/LastChild). (5) <b>Validation</b> on load (referential integrity, grain). (6) <b>Regression:</b> a saved snapshot + test queries to diff before/after a change. <b>Biggest risk:</b> grain explosion — every extra dimension or finer time bucket multiplies cells, so the finest-grain-that-is-reviewed rule is the key guardrail.',
    pitfalls:'Shipping at Day grain or with Customer everywhere "for flexibility"; no snapshot for regression; unfiltered cartesian rules.' },
];

export const IQ = [
  { q: 'What kinds of dimensions exist in o9 and how do they differ?',
    a: 'Regular dimensions (Item, Location, Customer, Supplier) model business entities — members are added/updated/deleted via IBPL, keys are usually auto-generated. The Time dimension is special: members are date-keyed (you supply keys via todatetime), and it carries time-aware system properties ($IsCurrent, $InPast) that power recurrence and current-period logic. The Version dimension is a mandatory partition — every fact is stored per version, and queries must filter it or return 0 rows.',
    tip: 'Three buckets: regular (entities), Time (date-keyed, time-aware), Version (mandatory partition).' },
  { q: 'What is the difference between a member Key and a member Name?',
    a: 'The Key is the stable internal identifier used to address and join data — for most dimensions it is auto-generated, but for Time it is the actual date (todatetime("2019-01-01")). The Name is the human identifier (and $DisplayName the UI label). Keys matter because version semantics are key-based (Key==0 is the Current Working View) and because createmember\'s first {slot} is the key. Two members can share a Name across levels but keys are unique within a level.',
    tip: 'Say "Key is what the system addresses by; Name is what humans read. Version semantics are key-based (Key==0 = CWV)."' },
  { q: 'What are hidden/system member properties and where are they used?',
    a: '$DisplayName (UI label), $InActive (soft-delete flag set by deletemember), and for Time $IsCurrent (is this the current bucket) and $InPast (already elapsed). They drive real behavior: filtering out inactive SKUs, seeding recurrence from the last past period, and showing current-period-only views. You can read them in a select and filter on them.',
    tip: 'Name $InActive for soft-delete and $IsCurrent/$InPast for time logic — it signals hands-on experience.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M10 · Data Model',
    title: 'Dimensions & Members',
    subtitle: 'Regular vs Time vs Version dimensions, member keys and names, and the system properties every member carries.',
    tabs: [
      { id: 'kinds',  label: '📂 Three Kinds' },
      { id: 'keys',   label: '🔑 Keys & Names' },
      { id: 'cat',    label: '🏭 CAT Dimensions' },
      { id: 'build',  label: '🏗️ Build Project' },
      { id: 'iq',     label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });

  container.querySelector('#tab-kinds').innerHTML = `
    <div class="section-pad">
      <p class="lead">Not all dimensions behave alike. Three kinds, three sets of rules.</p>
      <div class="card-grid">
        <div class="card" style="border-left:4px solid #22D3EE"><h4 style="color:#22D3EE">📦 Regular</h4><p>Business entities — Item, Location, Customer, Supplier. Members created/updated/deleted via IBPL; keys auto-generated. Arranged into hierarchies.</p></div>
        <div class="card" style="border-left:4px solid #A78BFA"><h4 style="color:#A78BFA">⏱️ Time</h4><p>Date-keyed — you supply keys via <code>todatetime</code>. Carries <code>$IsCurrent</code> / <code>$InPast</code>. Drives recurrence, lag and current-period logic.</p></div>
        <div class="card" style="border-left:4px solid #34D399"><h4 style="color:#34D399">🗂️ Version</h4><p>Mandatory partition — every fact stored per version. <code>Key==0</code> = Current Working View. Skip it in a query → 0 rows.</p></div>
      </div>
      <div class="callout warn"><b>The Version rule, again:</b> it isn't optional metadata — it's a storage partition. No version filter means no partition means an empty (not erroneous) result.</div>
    </div>`;

  container.querySelector('#tab-keys').innerHTML = `
    <div class="section-pad">
      <p class="lead">Every member is more than a label.</p>
      <table class="o9-table">
        <thead><tr><th>Property</th><th>What it is</th><th>Note</th></tr></thead>
        <tbody>
          <tr><td><code>Key</code></td><td>Stable internal id the system addresses by</td><td>Auto for most dims; a <b>date</b> for Time</td></tr>
          <tr><td><code>Name</code></td><td>Human identifier</td><td>Goes in <code>createmember</code> slot 2</td></tr>
          <tr><td><code>$DisplayName</code></td><td>UI label</td><td>May differ from Name</td></tr>
          <tr><td><code>$InActive</code></td><td>Soft-delete flag</td><td>Set by <code>deletemember</code>; cleared on <code>purge</code></td></tr>
          <tr><td><code>$IsCurrent</code></td><td>Is this the current time bucket?</td><td>Time only</td></tr>
          <tr><td><code>$InPast</code></td><td>Has this bucket elapsed?</td><td>Time only — seeds recurrence</td></tr>
        </tbody>
      </table>
      <div class="code-cap">Version key semantics</div>
      <table class="o9-table">
        <thead><tr><th>Key</th><th>Version type</th><th>Meaning</th></tr></thead>
        <tbody>
          <tr><td><code>Key == 0</code></td><td>Current Working View</td><td>The live plan everyone edits</td></tr>
          <tr><td><code>Key &lt; 0</code></td><td>Scenario</td><td>Dynamic what-if, isolated from CWV</td></tr>
          <tr><td><code>Key &gt; 0</code></td><td>Snapshot</td><td>Read-only frozen archive</td></tr>
        </tbody>
      </table>
    </div>`;

  container.querySelector('#tab-cat').innerHTML = `
    <div class="section-pad">
      <p class="lead">The CAT aftermarket-parts tenant's dimensions.</p>
      <div class="card-grid">
        <div class="card"><h4>📦 Item</h4><p>Parts & assemblies — raw material, intermediate, finished good. Hierarchy up through brand/category.</p></div>
        <div class="card"><h4>🏬 LogisticsCenter</h4><p>DCs / plants / stocking locations (the CAT analog of Location).</p></div>
        <div class="card"><h4>🤝 Customer</h4><p>Dealers and end customers receiving demand.</p></div>
        <div class="card"><h4>🏭 Supplier</h4><p>Upstream sources feeding supply and sourcing rules.</p></div>
        <div class="card"><h4>📅 PlanningCalendar</h4><p>Time dimension — FiscalWeek / Month buckets the plans run on.</p></div>
        <div class="card"><h4>🗂️ Version</h4><p>CWV, scenarios and snapshots across CAT Demand / Supply / Inventory plans.</p></div>
      </div>
    </div>`;

  const build = container.querySelector('#tab-build');
  build.innerHTML = `<div class="section-pad">
    <div class="callout" style="margin-top:0"><b>Guided project.</b> Build a demand-forecast model end to end — eight decisions from requirement to deployment. Each stage records to your Model-design & Business competency. Reference answers explain the reasoning and the trade-offs.</div>
    ${createExerciseSet(BP)}
  </div>`;
  const cleanupBP = initExerciseSet(build, BP);
  return () => { cleanupBP && cleanupBP(); };
}
