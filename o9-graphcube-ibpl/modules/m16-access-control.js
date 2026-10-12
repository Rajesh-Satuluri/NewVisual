import { createModuleShell, createIQSection } from '../components/module-shell.js';

export const IQ = [
  { q: 'What are the two layers of security in o9 and why do you need both?',
    a: 'UI Access (governed by a UI Role) controls whether a user can see/open a workspace at all. Data Security (governed by a Data Role + rules) controls what data — plans, models, measures, dimensions, members — they can read or write. You need both: a UI role lets someone open a workspace, but without data rules they see an empty shell. A data role without a UI role gives them access to data they can\'t navigate to.',
    tip: 'UI role = can you open the workspace; data role + rules = what data you see inside it. Both required.' },
  { q: 'What are the default access levels before any rule is written?',
    a: 'Dimensions and attributes default to read-only (write denied). Plans, measures and models (measure groups) default to NO access. So users get basic dimension read out of the box, but everything that matters — plans, measures, the models themselves — must be explicitly granted. This is deny-by-default for the valuable objects.',
    tip: 'Defaults: dims = read-only, plans/measures/models = no access. Grant them explicitly.' },
  { q: 'Write the rule syntax and explain "using scope" for row-level security.',
    a: 'Syntax: <grant|deny> <read|write> access <RuleName> to roles <[Role1],...> for <plan|model|measure|dimension|levelattribute|members> <Name> [using scope (<member filter>)]; The using scope clause restricts the rows a role sees — e.g. using scope (Customer.[Region].filter(#.Name == "West")) gives the role the same measure but only for West-region customers. That is o9\'s row-level security.',
    tip: 'Show grant read access ... for measure ... using scope (member filter) — the scope clause is the row-level control.' },
  { q: 'What is resetaccesscontrol and why is it essential?',
    a: 'After adding or editing any security rule, the platform does not re-evaluate access automatically — the change appears to do nothing until you run resetaccesscontrol;. It forces a re-read of all rules. Forgetting it is a classic "I granted access but the user still can\'t see it" support ticket.',
    tip: 'Always end a rule change with resetaccesscontrol; — it\'s the "apply" button.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M16 · Operations',
    title: 'Access Control & Security',
    subtitle: 'Two layers — UI roles and data roles — plus grant/deny rules, row-level scoping, and resetaccesscontrol.',
    tabs: [
      { id: 'layers', label: '🔐 Two Layers' },
      { id: 'rules',  label: '📜 Rules & Defaults' },
      { id: 'scope',  label: '🎯 Row-Level Scope' },
      { id: 'iq',     label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });

  container.querySelector('#tab-layers').innerHTML = `
    <div class="section-pad">
      <p class="lead">Security is layered. You need both to make data visible.</p>
      <table class="o9-table">
        <thead><tr><th>Layer</th><th>Governed by</th><th>Controls</th></tr></thead>
        <tbody>
          <tr><td><b>UI Access</b></td><td>UI Role</td><td>Whether a user can see/open a workspace at all</td></tr>
          <tr><td><b>Data Security</b></td><td>Data Role + Rules</td><td>What data (plans, models, measures, dims, members) they read/write</td></tr>
        </tbody>
      </table>
      <div class="card-grid">
        <div class="card"><h4>🖥️ UI Role — 3 steps</h4><p>Define role (Authorization Groups → UI tab) → assign to user → add role to the workspace (Layout → Workspaces → Edit → Roles).</p></div>
        <div class="card"><h4>🔒 Data Role — 3 steps</h4><p>Define role (Authorization Groups → DATA tab) → assign to user → write rules in Designer → Rules tab → <code>resetaccesscontrol;</code>.</p></div>
      </div>
      <div class="callout warn"><b>Empty workspace?</b> A UI role with no data rules opens the workspace but shows nothing — the #1 "it's broken" that isn't.</div>
    </div>`;

  container.querySelector('#tab-rules').innerHTML = `
    <div class="section-pad">
      <p class="lead">One syntax for all grants and denies.</p>
      <pre class="code">&lt;<span class="tok-k">grant</span>|<span class="tok-k">deny</span>&gt; &lt;<span class="tok-k">read</span>|<span class="tok-k">write</span>&gt; <span class="tok-k">access</span> &lt;RuleName&gt; <span class="tok-k">to roles</span> &lt;[Role1],[Role2]&gt;
  <span class="tok-k">for</span> &lt;plan|model|measure|dimension|levelattribute|members&gt; &lt;Name&gt;
  [<span class="tok-k">using scope</span> (&lt;member filter&gt;)];
<span class="tok-k">resetaccesscontrol</span>;</pre>
      <div class="code-cap">Defaults before any rule (deny-by-default for the valuable objects)</div>
      <table class="o9-table">
        <thead><tr><th>Entity</th><th>Default</th></tr></thead>
        <tbody>
          <tr><td>Dimension / Attribute</td><td>Read only, write denied</td></tr>
          <tr><td>Plan</td><td>No access</td></tr>
          <tr><td>Measure</td><td>No access</td></tr>
          <tr><td>Model (measure group)</td><td>No access</td></tr>
        </tbody>
      </table>
    </div>`;

  container.querySelector('#tab-scope').innerHTML = `
    <div class="section-pad">
      <p class="lead">The <code>using scope</code> clause gives different roles different slices of the same measure.</p>
      <pre class="code"><span class="tok-c">-- West-region planners see forecast only for their customers</span>
<span class="tok-k">grant read access</span> West_Forecast <span class="tok-k">to roles</span> [West_Planner]
  <span class="tok-k">for</span> measure [Forecast Quantity]
  <span class="tok-k">using scope</span> (Customer.[Region].filter(#.Name == <span class="tok-s">"West"</span>));
<span class="tok-k">resetaccesscontrol</span>;</pre>
      <div class="callout"><b>Same measure, fewer members.</b> Row-level security in o9 is a member filter on the grant — not a separate copy of the data.</div>
      <div class="callout warn"><b>deny wins:</b> an explicit <code>deny</code> overrides a <code>grant</code>. Use deny to carve exceptions out of a broad grant.</div>
    </div>`;

  return null;
}
