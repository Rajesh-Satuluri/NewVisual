import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { runIBPL } from '../lib/ibpl-sim.js';
import { createExerciseSet, initExerciseSet } from '../components/exercise.js';

/* ──────────────────────────────── DATA ──────────────────────────────────── */

const CONCEPTS = [
  ['📂','Dimension','A "table"-like axis of the model. CAT: Item, LogisticsCenter, Customer, Supplier, PlanningCalendar, Version.','[Item]'],
  ['🪜','Level / LevelAttribute','A level in a dimension hierarchy — a column you grain by.','[Item].[SKU], [Time].[Week]'],
  ['🌳','Hierarchy','Parent/child chain of levels enabling roll-up & drill-down.','Brand → SKU'],
  ['🔹','Member','A specific value at a level.','[SKU].[RM_320D-Pump]'],
  ['📊','Measure Group','A set of measures sharing one grain (the dimensions they are stored by).','Customer-Item-LC-FiscalWeek'],
  ['🔢','Measure','A numeric fact at an intersection.','Measure.[Forecast Quantity]'],
  ['🔗','Edge','A value on a typed graph relationship.','Edge.[Production_Pegging].[Qty]'],
  ['🗂️','Version','Mandatory partition — CWV, scenarios, snapshots.','[Version Name].[CurrentWorkingView]'],
];

// The concept path — progressive, beginner→advanced. Each links where relevant.
const PATH = [
  ['Foundations', [
    ['Enterprise Knowledge Graph', 'o9 models the business as one connected graph of entities (items, locations, customers, suppliers) and the flows between them.', 'Why: planning questions ("which supplier covers this stockout?") are graph traversals, not table joins.', 'The 4 layers: data → knowledge graph → analytics → decisions.', 'Treating it as a star schema and losing the edges.', 'm01'],
    ['GraphCube vs the data model', 'GraphCube is the storage/compute engine; the data model is the logical shape (dimensions, measure groups) you design on top of it.', 'Why: you design the model; GraphCube decides how sparsely it is stored and how values aggregate along edges.', 'A measure group you define becomes sparse key-addressed cells in GraphCube.', 'Confusing the logical model with physical storage (it is not an OLAP cube).', 'm05'],
    ['Dimensions & members', 'Dimensions are the axes; a member is one value at a level. Regular (Item), Time (date-keyed), and Version (mandatory) behave differently.', 'Why: every stored fact is addressed by one member from each dimension in its grain.', 'Item.[SKU].[320D-Pump]; Time.[Week].[W01]; Version.Key==0.', 'Forgetting Time is date-keyed and Version is a partition.', 'm10'],
  ]],
  ['Structure', [
    ['Levels & LevelAttributes', 'A dimension has levels you can grain or filter by; each level carries attributes (properties).', 'Why: the level you select sets the granularity of your query.', '[Item].[Brand] vs [Item].[SKU] change the grain.', 'Selecting a level that does not exist in the hierarchy.', 'm11'],
    ['Hierarchies & roll-up', 'Levels chain into parent/child hierarchies so leaf values roll up to parents on read.', 'Why: planners review at Brand/Category and the engine rolls leaves up by each measure’s policy.', 'SKU → Brand → Category; a forecast sums up the tree.', 'Assuming every measure sums (Min/Max/Avg/FirstChild exist).', 'm11'],
    ['Parent-child & traversal', 'Hierarchy navigation (ancestors, descendants, leaves) and alternate hierarchies let one dimension roll up multiple ways.', 'Why: the same Item can roll up by Brand and by Commodity.', 'An alternate hierarchy for sourcing commodity groups.', 'Hanging/orphan members with no parent silently dropping from totals.', 'm11'],
    ['Reference & master data', 'Members and their attributes are master data, loaded before any facts can reference them.', 'Why: a fact keyed to a member that does not exist cannot be stored correctly.', 'Load the SKU master, then the forecast facts.', 'Loading facts before members → orphaned/ignored rows.', 'm18'],
  ]],
  ['Measures & grain', [
    ['Measures & measure groups', 'A measure is a numeric fact; measures sharing one grain are grouped into a measure group.', 'Why: a physical cell has exactly one address, so one group = one grain.', 'CAT Customer-Item-LC-FiscalWeek holds ~300 weekly measures.', 'Mixing weekly and monthly measures in one group.', 'm12'],
    ['Measure grain & dimensionality', 'Grain = the exact dimensions/levels a measure is stored by. Omit a dimension in a query and it rolls up.', 'Why: the same measure reads differently at a different grain.', 'Forecast at Item×LC×Week vs Item×Week (LC rolled up).', 'Reading a number at the wrong grain and trusting it.', 'm12'],
    ['Fact data & intersections', 'A fact is a value at one intersection (one member per grain dimension). Only populated intersections exist (sparse).', 'Why: storage is sparse — missing combinations simply are not stored.', '320D-Pump × DC-East × W01 × CWV = 120.', 'Expecting a dense grid; most intersections are empty.', 'm05'],
    ['Units & currency', 'Measures carry an implied unit (eaches, cases, USD). Conversions are modelled explicitly, never assumed.', 'Why: summing mixed units silently produces nonsense.', 'Convert cases→eaches before aggregating a total.', 'Aggregating two measures in different UOMs.', null],
  ]],
  ['Behavior', [
    ['Versions & scenarios', 'Version partitions every fact: CWV (Key 0), scenarios (Key<0), snapshots (Key>0).', 'Why: the same cell holds different values per plan; queries must name one.', 'Compare CWV vs an aggressive scenario side by side.', 'Omitting Version → 0 rows (silent).', 'm14'],
    ['Aggregation policies', 'How leaves roll up: Sum, Min, Max, Avg, FirstChild, LastChild, …', 'Why: inventory opening/closing balances are FirstChild/LastChild, not sums.', 'Forecast = Sum; On-hand opening = FirstChild.', 'Assuming Sum for a semi-additive measure.', 'm13'],
    ['Spreading & allocation', 'Editing an aggregate pushes the change down to leaves via a spreading rule (Copy or Distribute).', 'Why: planners edit at Brand; data lives at SKU.', 'Bump Fructis +10% → distributed to each SKU.', 'CopyToLeaves on a Sum measure double-counts.', 'm13'],
    ['Relationships & pegging', 'Items/locations/suppliers/customers connect through typed graph edges (sourcing, pegging).', 'Why: supply-to-demand pegging is an edge value, not a join.', 'Edge.[Production_Pegging].[Qty].', 'Modelling a relationship as a shared dimension instead of an edge.', 'm15'],
  ]],
  ['Integrity & design', [
    ['Validation & referential integrity', 'Facts must reference existing members at the right grain; checks catch orphans, dupes and wrong-grain loads.', 'Why: bad keys corrupt totals quietly.', 'Reject a forecast row whose SKU is not in the master.', 'No validation step → silent data drift.', 'm18'],
    ['Dependencies & calculation order', 'Calculated measures depend on inputs; the engine evaluates in dependency order.', 'Why: a stale input or a cycle produces wrong or non-converging results.', 'Revenue depends on Price×Units; order matters.', 'Cyclic dependencies between measures.', 'm08'],
    ['Design trade-offs & scale', 'Grain choice trades detail vs sparsity vs performance; finer grain = more cells.', 'Why: an over-fine grain explodes intersections and slows queries.', 'Daily×SKU×Customer may be billions of cells.', 'Picking the finest grain "just in case".', 'm20'],
  ]],
];

// Model explorer nodes
const DIMS = [
  { id:'Item', label:'Item', real:true, purpose:'Parts & assemblies being planned (raw → finished).', attrs:['SKU','Brand','Category','UOM'], members:'320D-Pump, 320D-Seal, 330-Drive…', note:'Hub of almost every measure group and every sourcing/pegging edge.' },
  { id:'LogisticsCenter', label:'Logistics Center', real:true, purpose:'DCs / plants / stocking locations (CAT’s "Location").', attrs:['Name','Region','Type'], members:'DC-East, DC-West…', note:'Where inventory sits and demand is served from.' },
  { id:'Customer', label:'Customer', real:true, purpose:'Dealers & end customers receiving demand.', attrs:['Customer Name','Channel'], members:'Dealer-A, Dealer-B…', note:'Only demand-side measure groups carry Customer.' },
  { id:'Supplier', label:'Supplier', real:true, purpose:'Upstream sources feeding supply & sourcing rules.', attrs:['Supplier Name','Lead Time'], members:'Supp-1, Supp-2…', note:'Connected to Item by a sourcing edge, not a shared dimension.' },
  { id:'Time', label:'Time (Calendar)', real:true, purpose:'FiscalWeek / Month buckets the plans run on. Date-keyed.', attrs:['Week','Month','$IsCurrent','$InPast'], members:'W01, W02…', note:'Powers recurrence, lag and current-period logic.' },
  { id:'Version', label:'Version', real:true, purpose:'Mandatory partition: CWV / scenario / snapshot.', attrs:['Key','Name'], members:'CWV (0), Scenario (<0), Snapshot (>0)', note:'Skip it in a query → 0 rows.' },
];
const MGROUPS = [
  { id:'Forecast', label:'Forecast', real:true, grain:['Customer','Item','LogisticsCenter','Time','Version'], measures:'Forecast Quantity, BAF, USE_BAF', note:'Real CAT group: Customer-Item-LC-FiscalWeek (~300 measures).' },
  { id:'Inventory', label:'Inventory', real:false, grain:['Item','LogisticsCenter','Time','Version'], measures:'On-Hand, Opening (FirstChild), Closing (LastChild)', note:'Illustrative grain for teaching semi-additive roll-up.' },
  { id:'Supply', label:'Supply', real:false, grain:['Item','LogisticsCenter','Supplier','Time','Version'], measures:'Receipts, In-Transit', note:'Illustrative — adds Supplier to the grain.' },
  { id:'PurchaseOrders', label:'Purchase Orders', real:false, grain:['Supplier','Item','LogisticsCenter','Time','Version'], measures:'PO Qty, Due Qty', note:'Illustrative — keyed by delivery period.' },
];

export const IQ = [
  { q: 'Name the core objects of the o9 data model and how they relate.',
    a: 'Dimensions are the axes (Item, Location, Customer, Supplier, Time, Version). Each dimension has Levels (a.k.a. LevelAttributes) arranged into Hierarchies; a specific value at a level is a Member. Measures are numeric facts; they are organized into Measure Groups, each with a fixed grain (the set of dimensions/levels it is stored by). Edges carry values on typed relationships between member sets. Every stored fact is addressed by one member from each dimension in its measure group\'s grain — including a Version.',
    tip: 'Say "measure group = a table; its grain = the primary key." It maps cleanly to what interviewers know.' },
  { q: 'What is the "grain" of a measure group, and why can\'t you mix measures of different grains?',
    a: 'The grain is the exact combination of dimensions and levels a measure group is stored by — e.g. Customer × Item × LC × FiscalWeek. Every measure in that group is stored at that granularity. You can\'t put a monthly measure and a weekly measure in the same group because a single physical cell can only have one address. In the CAT tenant, Customer-Item-LC-Month (459 measures) and Customer-Item-LC-FiscalWeek (300 measures) are separate groups precisely because their time grain differs.',
    tip: 'Drop a real number: "CAT\'s Customer-Item-LC-FiscalWeek group has ~300 measures, all at weekly grain."' },
  { q: 'Why is Version a dimension, and what happens if you forget it in a query?',
    a: 'Version partitions every fact — the same Item/LC/Week can have different values in the Current Working View, an aggressive scenario, and a frozen snapshot. Because it is a mandatory partition, a select without a Version filter resolves to no partition and returns 0 rows. This is the single most common beginner mistake. Always include where {Version.[Version Name].filter(#.Key == 0)} (or the version you want).',
    tip: 'The golden rule: "Version is mandatory — skip it and you get 0 rows, not an error."' },
  { q: 'What hidden/system member properties should you know?',
    a: 'Members carry system properties beyond Key and Name: $DisplayName (what the UI shows), $InActive (soft-delete flag — deletemember sets it), and for the Time dimension $IsCurrent and $InPast (whether a bucket is the current period or already elapsed). These power things like showing only active SKUs, or recurrence scopes that seed from the last past period.',
    tip: 'Mentioning $InActive shows you understand soft-delete vs purge; $IsCurrent/$InPast shows you understand time-aware calcs.' },
  { q: 'A measure looks right at SKU×Week but wrong when you roll it to Brand. Where do you look first?',
    a: 'Three usual suspects: (1) the aggregation policy — if the measure is Avg/Min/Max/FirstChild it will not sum to the brand total you expect; (2) hanging/orphan members — SKUs with no Brand parent drop out of the brand roll-up, so the parent is short; (3) sparsity/nulls — if some SKU×Week cells are null, an Avg policy divides by a different count than you think. Check the policy, then reconcile leaf sum vs parent, then look for orphans.',
    tip: 'Lead with "what is the aggregation policy?" — most "wrong rollup" bugs are a non-Sum policy or an orphan member.' },
  { q: 'Explain the difference between a missing value and an explicit zero, and why it matters.',
    a: 'A missing (null) intersection is simply not stored — sparse. An explicit zero is a stored cell whose value is 0. They differ in arithmetic (null propagates: null+5=null, so one missing input can blank a calculated column) and in aggregation (Avg over {null, 10} is 10; over {0, 10} is 5). That is why modellers coalesce(x,0) before arithmetic and choose AvgNonNull vs Avg deliberately.',
    tip: 'Null ≠ 0. Null propagates through arithmetic and is skipped by some agg policies; zero is a real value that counts.' },
];

/* ───────────────────────────── EXERCISES ────────────────────────────────── */

const EXERCISES = [
  { id:'m02-predict-rollup', type:'predict', area:'model', difficulty:1, competencyLabel:'Grain · roll-up', verify:'simulated',
    prompt:'Forecast Quantity is a <b>Sum</b> measure. 320D-Pump is stored at DC-East (120) and DC-West (90) in W01. You query grain <code>[Item].[SKU] × [Time].[Week]</code> (no Logistics Center). What value do you get for 320D-Pump / W01?',
    options:[ {text:'120',why:'That is only one LC; dropping LC rolls up all of them.'}, {text:'210',correct:true,why:'Sum rolls up across the omitted LC dimension: 120 + 90 = 210.'}, {text:'105',why:'That would be an Avg policy; this measure is Sum.'} ],
    explanation:'Grain is whatever you put in the Select scope. Omit a dimension and its members aggregate by the measure’s policy — Sum here.' },

  { id:'m02-predict-nullzero', type:'predict', area:'concept', difficulty:2, competencyLabel:'Null vs zero', verify:'verified',
    prompt:'A measure with policy <b>Avg</b> has two leaves: one is <code>null</code> (not stored), the other is <code>10</code>. What does the parent show, and how would it change if the null were an explicit <code>0</code>?',
    options:[ {text:'10 now; 5 if it were 0', correct:true, why:'Avg skips the unstored null (avg of one value = 10). An explicit 0 is a real leaf, so avg of {0,10}=5.'}, {text:'5 either way', why:'Only true if both are stored values.'}, {text:'null either way', why:'Avg does not propagate null the way arithmetic does.'} ],
    explanation:'Missing (sparse) ≠ zero. Aggregation policies treat an unstored null differently from a stored 0 — a core source of "the total looks off" bugs.' },

  { id:'m02-write-grain', type:'write', area:'ibpl', difficulty:2, dataset:'cat-forecast', competencyLabel:'Grain in a query', verify:'simulated',
    prompt:'Prove the roll-up yourself. Write a query at grain <b>Item (SKU) only</b> (roll up LC and Week) returning Forecast Quantity for the CWV, and confirm 320D-Pump = 340.',
    starter:'Select ([Item].[SKU] * {Measure.[Forecast Quantity]})\nwhere {  };',
    check:(res)=>{ if(!res.ok) return {correct:false,msg:'❌ '+res.error}; const m=Object.fromEntries(res.rows.map(r=>[r[0],r[1]])); return m['320D-Pump']===340 ? {correct:true,msg:'✅ 320D-Pump = 340 (120+130 DC-East + 90 DC-West, across W01+W02). Omitting LC and Week rolled them up.'} : {correct:false,msg:'❌ Expected 320D-Pump = 340. Add the Version filter: <code>where { Version.[Version Name].filter(#.Key == 0) }</code>.'}; },
    explanation:'Same measure, coarser grain, bigger numbers — because Sum rolls up the omitted dimensions. The data did not change; the grain did.' },

  { id:'m02-diag-version', type:'diagnose', area:'debug', difficulty:1, competencyLabel:'Diagnose · empty result', verify:'verified',
    prompt:'A planner says "my select returns nothing, but the data is definitely there." The query filters Item and Time but has no Version clause. Most likely cause?',
    options:[ {text:'The measure group is empty', why:'Unlikely — they can see the data in the workbench.'}, {text:'No Version filter → the query matched no partition (0 rows)', correct:true, why:'Version is a mandatory partition; without it the query resolves to no partition and returns an empty, valid result.'}, {text:'A syntax error', why:'That would raise an error, not return 0 rows silently.'} ],
    explanation:'The fix: <code>where { Version.[Version Name].filter(#.Key == 0) }</code>. Empty-not-error is the signature of a missing Version.' },

  { id:'m02-diag-badkey', type:'diagnose', area:'debug', difficulty:2, competencyLabel:'Diagnose · integrity', verify:'verified',
    prompt:'After a data load, a Brand total is lower than the sum of its SKUs computed by hand. Facts loaded fine with no errors. Best first diagnostic?',
    options:[ {text:'Check for SKUs with no Brand parent (hanging members)', correct:true, why:'Orphan/hanging members have no parent to roll into, so they silently drop from the Brand total.'}, {text:'Rebuild the measure group', why:'Premature — nothing says the group is corrupt.'}, {text:'Switch the aggregation policy to Sum', why:'If it were a non-Sum policy the leaf-sum comparison itself would not be meaningful; the symptom points at missing members.'} ],
    explanation:'Referential integrity: a fact keyed to a member whose parent is missing rolls up nowhere. List members with no parent, fix the hierarchy, re-check the total.' },

  { id:'m02-diag-grain', type:'diagnose', area:'debug', difficulty:3, competencyLabel:'Diagnose · wrong grain', verify:'simulated',
    prompt:'A measure was loaded from a source extract that had one row per Item×LC×Day, but the measure group grain is Item×LC×Week. The weekly numbers look ~7× too high. Why?',
    options:[ {text:'Daily rows collapsed into the week by Sum, stacking 7 days', correct:true, why:'Loading finer-grained source rows into a coarser Sum grain aggregates them — 7 daily values land in one weekly cell.'}, {text:'The Version was wrong', why:'A wrong version gives empty or different values, not a consistent 7× inflation.'}, {text:'Avg policy miscounted', why:'Avg would not inflate; it would average down.'} ],
    explanation:'Source-table grain, fact-record grain and measure grain must line up. Finer source rows summed into a coarser Sum grain multiply. Pre-aggregate to the target grain, or load at the group’s grain.' },

  { id:'m02-model-design', type:'explain', area:'model', difficulty:3, competencyLabel:'Model design', verify:'verified',
    prompt:'Design task: "Demand forecast by product, location and week, with scenario comparison." List the dimensions, the fact grain, which measures, the version strategy, and one performance risk — then reveal a reference answer.',
    explanation:'<b>Reference design.</b> Dimensions: Item (product), LogisticsCenter (location), PlanningCalendar (week), Version — and Customer if demand is customer-specific. <b>Fact grain:</b> Item×LC×Week×Version (add Customer if needed). <b>Measures:</b> Forecast Quantity (Sum), plus BAF / USE_BAF for overrides and lag measures for bias. <b>Versions:</b> CWV for the live plan; one or more scenario versions (Key<0) for what-ifs; snapshots (Key>0) to freeze a baseline for comparison. <b>Aggregation:</b> Sum for quantities. <b>Performance risk:</b> adding Customer and/or moving to Day grain multiplies intersections fast — only add the dimension if the plan is actually reviewed at that grain. <b>Validation:</b> reject forecast rows whose Item/LC/Customer are not in master data.',
    pitfalls:'Choosing Day grain "for flexibility" (explodes cells); forgetting the snapshot version needed for scenario-vs-baseline comparison.' },
];

/* ─────────────────────────────── MOUNT ──────────────────────────────────── */

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M02 · Platform',
    title: 'Data Model',
    subtitle: 'The full shape of an o9 planning model — objects, the concept path, an interactive model explorer, a grain lab, and troubleshooting.',
    tabs: [
      { id: 'path',    label: '🧭 Concept Path' },
      { id: 'explorer',label: '🕸️ Model Explorer' },
      { id: 'grain',   label: '📐 Grain Lab' },
      { id: 'objects', label: '🧱 Core Objects' },
      { id: 'trouble', label: '🔧 Troubleshooting' },
      { id: 'iq',      label: '🎯 Interview Q&A', content: createIQSection(IQ) },
      { id: 'drill',   label: '🧪 Exercises' },
    ],
  });

  renderPath(container.querySelector('#tab-path'));
  renderObjects(container.querySelector('#tab-objects'));
  const cleanupExplorer = renderExplorer(container.querySelector('#tab-explorer'));
  const cleanupGrain = renderGrainLab(container.querySelector('#tab-grain'));
  const cleanupTrouble = renderTrouble(container.querySelector('#tab-trouble'));

  const drill = container.querySelector('#tab-drill');
  drill.innerHTML = `<div class="section-pad">${createExerciseSet(EXERCISES, { intro: 'Seven exercises on grain, nulls, roll-up and data-model troubleshooting. Solving them fills your Model-design and Debugging competency.' })}</div>`;
  const cleanupEx = initExerciseSet(drill, EXERCISES);

  return () => { cleanupExplorer && cleanupExplorer(); cleanupGrain && cleanupGrain(); cleanupTrouble && cleanupTrouble(); cleanupEx && cleanupEx(); };
}

function renderPath(el) {
  el.innerHTML = `
    <div class="section-pad">
      <p class="lead">Twenty concepts, beginner → advanced. Expand any one — each links to the deep-dive module that covers it.</p>
      ${PATH.map(([section, items]) => `
        <div class="cp-section">
          <div class="cp-section-head">${section}</div>
          ${items.map(([t, what, why, example, pitfall, link]) => `
            <details class="cp-item">
              <summary><span class="cp-t">${t}</span>${link ? `<a class="cp-link" href="#${link}">${link} →</a>` : ''}</summary>
              <div class="cp-body">
                <p>${what}</p>
                <p class="cp-why">${why}</p>
                <div class="cp-meta"><span class="cp-ex"><b>Example:</b> ${example}</span><span class="cp-pit"><b>⚠ Pitfall:</b> ${pitfall}</span></div>
              </div>
            </details>`).join('')}
        </div>`).join('')}
    </div>`;
}

function renderObjects(el) {
  el.innerHTML = `
    <div class="section-pad">
      <p class="lead">Eight objects. Learn these and most of IBPL reads naturally.</p>
      <table class="o9-table">
        <thead><tr><th>Object</th><th>What it is</th><th>Example (CAT)</th></tr></thead>
        <tbody>${CONCEPTS.map(([i,t,d,e])=>`<tr><td><b>${i} ${t}</b></td><td>${d}</td><td><code>${e}</code></td></tr>`).join('')}</tbody>
      </table>
      <div class="callout"><b>Mental model:</b> a <b>measure group</b> is a table, its <b>grain</b> is the primary key (one member per dimension), a <b>measure</b> is a column, and a <b>cell</b> is one row's value. <b>Edges</b> are the foreign-key-like links — except they're stored and carry their own data.</div>
      <h3 style="font-size:16px;font-weight:800;margin:22px 0 4px">Member properties</h3>
      <p class="lead" style="margin-bottom:12px">A member isn’t just a label — it carries system properties the platform and your IBPL rely on.</p>
      <div class="card-grid">
        <div class="card"><h4>🔑 Key</h4><p>Stable internal id. For Time the Key is a date (<code>todatetime("2019-01-01")</code>); for most dims it’s auto-generated.</p></div>
        <div class="card"><h4>🏷️ Name / $DisplayName</h4><p>Name is the identifier; $DisplayName is the UI label.</p></div>
        <div class="card"><h4>🚫 $InActive</h4><p>Soft-delete flag. <code>deletemember</code> sets it; the row stays until <code>purge members</code>.</p></div>
        <div class="card"><h4>⏱️ $IsCurrent / $InPast</h4><p>Time flags — current bucket vs elapsed. Used by recurrence and current-period logic.</p></div>
      </div>
      <div class="callout sql"><b>Not a SQL row.</b> A member is a node in a dimension hierarchy with typed system properties and a position in a tree — not just a string in a lookup table.</div>
    </div>`;
}

function renderExplorer(el) {
  // bipartite layout: dimensions across the top, measure groups across the bottom
  const W = 920, topY = 70, botY = 300;
  const dimX = i => 80 + i * ((W - 160) / (DIMS.length - 1));
  const mgX = i => 150 + i * ((W - 300) / (MGROUPS.length - 1));
  const dimPos = {}; DIMS.forEach((d, i) => dimPos[d.id] = { x: dimX(i), y: topY });
  const mgPos = {}; MGROUPS.forEach((m, i) => mgPos[m.id] = { x: mgX(i), y: botY });

  const edges = [];
  MGROUPS.forEach(m => m.grain.forEach(dim => edges.push({ mg: m.id, dim, real: m.real })));

  const edgeSvg = edges.map((e, i) => {
    const a = mgPos[e.mg], b = dimPos[e.dim];
    return `<line class="mx-edge" data-edge="${i}" x1="${a.x}" y1="${a.y - 18}" x2="${b.x}" y2="${b.y + 16}" />`;
  }).join('');

  const dimSvg = DIMS.map(d => {
    const p = dimPos[d.id];
    return `<g class="mx-node mx-dim ${d.real ? '' : 'illus'}" data-node="dim:${d.id}" transform="translate(${p.x},${p.y})">
      <circle r="26" /><text class="mx-ico" y="-2">📂</text><text class="mx-lbl" y="42">${d.label}</text></g>`;
  }).join('');
  const mgSvg = MGROUPS.map(m => {
    const p = mgPos[m.id];
    return `<g class="mx-node mx-mg ${m.real ? '' : 'illus'}" data-node="mg:${m.id}" transform="translate(${p.x},${p.y})">
      <rect x="-46" y="-18" width="92" height="36" rx="9" /><text class="mx-lbl2" y="4">${m.label}</text></g>`;
  }).join('');

  el.innerHTML = `
    <div class="section-pad">
      <p class="lead">How the CAT model connects. <b>Dimensions</b> (top) are shared axes; <b>measure groups</b> (bottom) each sit at a grain made of several dimensions. Click a node, or a connecting line, for detail.</p>
      <div class="mx-legend"><span class="mx-k dim">● Dimension</span><span class="mx-k mg">▬ Measure group</span><span class="mx-k real">solid = real CAT</span><span class="mx-k illus">dashed = illustrative</span></div>
      <div class="mx-wrap">
        <svg viewBox="0 0 ${W} 360" class="mx-svg" role="img" aria-label="Data model relationship map">
          <g class="mx-edges">${edgeSvg}</g>${dimSvg}${mgSvg}
        </svg>
      </div>
      <div class="mx-detail" id="mx-detail"><p class="mx-hint">Select a node or an edge above.</p></div>
      <div class="callout" style="margin-top:14px"><b>Graph edges (no SQL analog):</b> Supplier→Item <b>sourcing</b> and Item→Order <b>pegging</b> are typed relationships carrying their own values (<code>Edge.[Production_Pegging].[Qty]</code>), not shared dimensions. See <a href="#m15">m15 →</a>.</div>
    </div>`;

  const detail = el.querySelector('#mx-detail');
  const clearActive = () => el.querySelectorAll('.mx-edge.on,.mx-node.on').forEach(n => n.classList.remove('on'));

  const showNode = (type, id) => {
    clearActive();
    const node = el.querySelector(`[data-node="${type}:${id}"]`); node && node.classList.add('on');
    if (type === 'dim') {
      const d = DIMS.find(x => x.id === id);
      edges.forEach((e, i) => { if (e.dim === id) el.querySelector(`[data-edge="${i}"]`)?.classList.add('on'); });
      const groups = MGROUPS.filter(m => m.grain.includes(id)).map(m => m.label).join(', ') || '—';
      detail.innerHTML = `<div class="mx-card"><h4>📂 ${d.label} <span class="mx-tag ${d.real?'real':'illus'}">${d.real?'real CAT':'illustrative'}</span></h4>
        <p>${d.purpose}</p>
        <div class="mx-grid"><div><b>Attributes</b><br>${d.attrs.map(a=>`<code>${a}</code>`).join(' ')}</div>
        <div><b>Example members</b><br>${d.members}</div>
        <div><b>Appears in</b><br>${groups}</div></div>
        <p class="mx-note">${d.note}</p></div>`;
    } else {
      const m = MGROUPS.find(x => x.id === id);
      edges.forEach((e, i) => { if (e.mg === id) el.querySelector(`[data-edge="${i}"]`)?.classList.add('on'); });
      detail.innerHTML = `<div class="mx-card"><h4>📊 ${m.label} measure group <span class="mx-tag ${m.real?'real':'illus'}">${m.real?'real CAT':'illustrative'}</span></h4>
        <p><b>Grain:</b> ${m.grain.map(g=>`<code>${(DIMS.find(d=>d.id===g)||{}).label||g}</code>`).join(' × ')}</p>
        <p><b>Measures:</b> ${m.measures}</p>
        <p class="mx-note">${m.note}</p></div>`;
    }
  };
  const showEdge = (i) => {
    clearActive();
    const e = edges[i]; el.querySelector(`[data-edge="${i}"]`)?.classList.add('on');
    el.querySelector(`[data-node="mg:${e.mg}"]`)?.classList.add('on');
    el.querySelector(`[data-node="dim:${e.dim}"]`)?.classList.add('on');
    const m = MGROUPS.find(x => x.id === e.mg), d = DIMS.find(x => x.id === e.dim);
    detail.innerHTML = `<div class="mx-card"><h4>🔗 ${m.label} is stored per ${d.label}</h4>
      <p>This edge means <b>${d.label}</b> is part of the <b>${m.label}</b> grain — every ${m.label} cell is addressed by one ${d.label} member${d.id==='Version'?' (the mandatory partition)':''}.</p>
      <p class="mx-note">Drop ${d.label} from a query over ${m.label} and its members roll up by the measure’s aggregation policy.</p></div>`;
  };

  const onClick = (ev) => {
    const edge = ev.target.closest('.mx-edge');
    if (edge) { showEdge(+edge.dataset.edge); return; }
    const node = ev.target.closest('.mx-node');
    if (node) { const [t, id] = node.dataset.node.split(':'); showNode(t, id); }
  };
  el.querySelector('.mx-svg').addEventListener('click', onClick);
  return () => el.querySelector('.mx-svg')?.removeEventListener('click', onClick);
}

function renderGrainLab(el) {
  el.innerHTML = `
    <div class="section-pad">
      <p class="lead">Grain = the dimensions you keep. Toggle which dimensions are in the grain and watch the <b>same</b> Forecast Quantity regroup — fewer dimensions means bigger numbers (Sum rolls up) and fewer rows.</p>
      <div class="gl-controls">
        <span class="gl-lbl">Grain includes:</span>
        <label class="gl-chip"><input type="checkbox" data-dim="item" checked> Item (SKU)</label>
        <label class="gl-chip"><input type="checkbox" data-dim="lc" checked> Logistics Center</label>
        <label class="gl-chip"><input type="checkbox" data-dim="week" checked> Week</label>
      </div>
      <div class="code-cap">Generated query (simulated)</div>
      <pre class="code" id="gl-query"></pre>
      <div id="gl-out" class="ex-output"></div>
      <div class="callout warn" id="gl-insight"></div>
    </div>`;

  const q = el.querySelector('#gl-query');
  const out = el.querySelector('#gl-out');
  const insight = el.querySelector('#gl-insight');
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[c]));

  const build = () => {
    const on = {};
    el.querySelectorAll('input[data-dim]').forEach(c => on[c.dataset.dim] = c.checked);
    const levels = [];
    if (on.item) levels.push('[Item].[SKU]');
    if (on.lc) levels.push('[LogisticsCenter].[Name]');
    if (on.week) levels.push('[Time].[Week]');
    const scope = levels.length ? levels.join(' * ') + ' * ' : '';
    const code = `Select (${scope}{Measure.[Forecast Quantity]})\nwhere { Version.[Version Name].filter(#.Key == 0) };`;
    q.innerHTML = esc(code).replace(/Select|where|filter/g, m => `<span class="tok-k">${m}</span>`);
    const res = runIBPL(code, 'cat-forecast');
    out.innerHTML = `<div class="sim-banner">⚙ Simulated — documented subset.</div>${resultTable(res)}`;
    const n = res.rows.length;
    const dims = levels.length;
    insight.innerHTML = dims === 0
      ? `<b>Grand total:</b> every dimension rolled up → <b>1 row</b>, the sum of all forecast (835). This is the coarsest grain.`
      : `<b>${dims} dimension${dims>1?'s':''} in grain → ${n} row${n>1?'s':''}.</b> Each dimension you remove rolls its members up (Sum) and collapses rows. The numbers are the same data at a different resolution.`;
  };

  const onChange = () => build();
  el.addEventListener('change', onChange);
  build();
  return () => el.removeEventListener('change', onChange);
}

function resultTable(res) {
  const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[c]));
  if (!res.ok) return `<div class="sim-err">⚠️ ${esc(res.error)}</div>`;
  if (!res.rows.length) return `<div class="sim-empty">0 rows — ${esc(res.note || '')}</div>`;
  return `<table class="o9-table sim-table"><thead><tr>${res.columns.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead>
    <tbody>${res.rows.map(r=>`<tr>${r.map(v=>`<td>${v==null?'<span class="sim-null">null</span>':esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>
    <div class="sim-note">${esc(res.note||'')}</div>`;
}

const CASES = [
  { sym:'A forecast total for a Brand is lower than the hand-summed SKUs.', data:'SKU "330-LinkX" exists with Brand = (blank). Its 50-unit forecast is in the group.', diag:'List members with no parent at the Brand level; reconcile leaf-sum vs parent.', root:'Hanging/orphan member — 330-LinkX has no Brand parent, so its 50 units roll up nowhere.', fix:'Assign the correct Brand parent (or createmember the parent), then re-aggregate. Add a validation rule rejecting SKUs without a Brand.' },
  { sym:'Weekly numbers are ~7× what the business expects after a load.', data:'Source extract had one row per Item×LC×Day; group grain is Item×LC×Week.', diag:'Compare source-record grain to measure-group grain; count source rows per week.', root:'Wrong-grain load — 7 daily rows summed into one weekly Sum cell.', fix:'Pre-aggregate the source to weekly (or load to a daily group and roll up). Never load finer rows into a coarser Sum grain blindly.' },
  { sym:'A measure edit "saved" but the value is unchanged on reopen.', data:'The measure has no spreading rule and the planner edited at Brand (aggregate) level.', diag:'Check whether the edit was at a leaf or an aggregate, and whether the measure has a spreading rule.', root:'Aggregate edit on a measure with no spreading rule — aggregate writes are rejected; only leaf writes persist.', fix:'Define a spreading rule (CopyToLeaves / DistributeToLeaves) or edit at leaf level. See m13.' },
  { sym:'A select returns nothing though the workbench shows data.', data:'Query filters Item and Week; no Version clause.', diag:'Check the where clause for a Version filter.', root:'Missing Version — the query matched no partition and returned a valid empty result.', fix:'Add <code>where { Version.[Version Name].filter(#.Key == 0) }</code>.' },
];

function renderTrouble(el) {
  el.innerHTML = `
    <div class="section-pad">
      <p class="lead">Real failure signatures. Read the symptom and evidence, form a hypothesis, then reveal the root cause and fix. Investigate before you expand.</p>
      ${CASES.map((c,i)=>`
        <div class="tc-card">
          <div class="tc-sym"><span class="tc-badge">Case ${i+1}</span> ${c.sym}</div>
          <div class="tc-evidence"><b>Evidence:</b> ${c.data}</div>
          <div class="tc-diag"><b>Diagnostic:</b> ${c.diag}</div>
          <details class="tc-reveal"><summary>Reveal root cause & fix</summary>
            <div class="tc-root"><b>Root cause:</b> ${c.root}</div>
            <div class="tc-fix"><b>Fix:</b> ${c.fix}</div>
          </details>
        </div>`).join('')}
    </div>`;
  return null;
}
