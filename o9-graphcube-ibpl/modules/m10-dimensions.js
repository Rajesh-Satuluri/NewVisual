import { createModuleShell, createIQSection } from '../components/module-shell.js';

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

  return null;
}
