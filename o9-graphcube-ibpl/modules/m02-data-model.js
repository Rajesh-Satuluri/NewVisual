import { createModuleShell, createIQSection } from '../components/module-shell.js';

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

export const IQ = [
  { q: 'Name the core objects of the o9 data model and how they relate.',
    a: 'Dimensions are the axes (Item, Location, Customer, Time, Version). Each dimension has Levels (a.k.a. LevelAttributes) arranged into Hierarchies; a specific value at a level is a Member. Measures are numeric facts; they are organized into Measure Groups, each with a fixed grain (the set of dimensions/levels it is stored by). Edges carry values on typed relationships between member sets. Every stored fact is addressed by one member from each dimension in its measure group\'s grain — including a Version.',
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
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M02 · Platform',
    title: 'Data Model',
    subtitle: 'Dimensions, levels, members, measure groups, measures and edges — the vocabulary everything else is built on.',
    tabs: [
      { id: 'concepts', label: '🧱 Core Objects' },
      { id: 'grain',    label: '📐 Grain & Measure Groups' },
      { id: 'props',    label: '🏷️ Member Properties' },
      { id: 'iq',       label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });

  container.querySelector('#tab-concepts').innerHTML = `
    <div class="section-pad">
      <p class="lead">Eight objects. Learn these and most of IBPL reads naturally.</p>
      <table class="o9-table">
        <thead><tr><th>Object</th><th>What it is</th><th>Example (CAT)</th></tr></thead>
        <tbody>
          ${CONCEPTS.map(([i,t,d,e])=>`<tr><td><b>${i} ${t}</b></td><td>${d}</td><td><code>${e}</code></td></tr>`).join('')}
        </tbody>
      </table>
      <div class="callout"><b>Mental model:</b> a <b>measure group</b> is a table, its <b>grain</b> is the primary key (one member per dimension), a <b>measure</b> is a column, and a <b>cell</b> is one row's value. <b>Edges</b> are the foreign-key-like links — except they're stored and carry their own data.</div>
    </div>`;

  container.querySelector('#tab-grain').innerHTML = `
    <div class="section-pad">
      <p class="lead">Real CAT demand-planning measure groups. Notice the same business area is modelled at three grains, coarse to fine.</p>
      <table class="o9-table">
        <thead><tr><th>Measure Group</th><th>Grain</th><th>Holds</th></tr></thead>
        <tbody>
          <tr><td><b>Customer-LC-Month</b></td><td>Customer × LogisticsCenter × Month</td><td>Aggregate monthly signals — Total Exceptions Firm Zone CoC, Monthly CoC Delta thresholds. Reviewed by CS analysts.</td></tr>
          <tr><td><b>Customer-Item-LC-Month</b></td><td>Customer × Item × LC × Month <span class="pill">459 measures</span></td><td>Bulk forecast management — <code>Forecast Quantity Weekly Lag 0…52</code> (full lag history for MAPE/bias).</td></tr>
          <tr><td><b>Customer-Item-LC-FiscalWeek</b></td><td>Customer × Item × LC × FiscalWeek <span class="pill">300 measures</span></td><td>Operational weekly forecast — BAF, USE_BAF, CoC exception flags, Forecast Acceptance Status.</td></tr>
        </tbody>
      </table>
      <div class="callout"><b>Why lag measures?</b> Storing "what the forecast <i>was</i> N weeks ago" (Lag 1, Lag 6, Lag 26, Lag 52) lets you compare past forecasts to today's actuals — the basis of forecast value-add and bias tracking.</div>
      <div class="callout warn"><b>Grain rule:</b> every measure in a group shares its grain. A weekly and a monthly measure cannot coexist in one group — one physical cell has exactly one address.</div>
    </div>`;

  container.querySelector('#tab-props').innerHTML = `
    <div class="section-pad">
      <p class="lead">Members aren't just a name — they carry system properties the platform and your IBPL rely on.</p>
      <div class="card-grid">
        <div class="card"><h4>🔑 Key</h4><p>The stable internal id. For Time, the Key is a date (<code>todatetime("2019-01-01")</code>); for most dims it's auto-generated.</p></div>
        <div class="card"><h4>🏷️ Name / $DisplayName</h4><p>Name is the identifier; $DisplayName is the label shown in the UI.</p></div>
        <div class="card"><h4>🚫 $InActive</h4><p>Soft-delete flag. <code>deletemember</code> sets it true; the row stays until <code>purge members</code>.</p></div>
        <div class="card"><h4>⏱️ $IsCurrent / $InPast</h4><p>Time-dimension flags — is this bucket the current period, or already elapsed? Used by recurrence calcs and current-period logic.</p></div>
      </div>
      <div class="callout sql"><b>Not a SQL row.</b> A member is a node in a dimension hierarchy with typed system properties and a position in a tree — not just a string in a lookup table.</div>
    </div>`;

  return null;
}
