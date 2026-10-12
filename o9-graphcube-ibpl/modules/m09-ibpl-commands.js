import { createModuleShell, createIQSection } from '../components/module-shell.js';

export const IQ = [
  { q: 'What are the four member commands and the soft-delete vs purge distinction?',
    a: 'createmember adds a member (with its ancestor in hierarchical dims), updatemember changes a member\'s parent or properties, deletemember soft-deletes (sets $InActive = true but keeps the row), and purge members permanently removes all soft-deleted members. The two-stage delete matters: deletemember is reversible-ish (the row survives, marked inactive) while purge is irreversible and should be tested on dev first. deletemember on a member with children fails unless you add cascade.',
    tip: 'Four commands, and the key nuance: delete = soft (inactive), purge = permanent. cascade takes children with you.' },
  { q: 'How do you create a member, and what do the {key, name} slots mean?',
    a: 'createmember([Item].[SKU] = { , "Liril Strong - 100"}, [Item].[Brand] = { , "Liril"}); — inside {key, name}, the first slot is the Key (empty → auto-generated), the second is the display Name. You create a member along with its ancestor (Brand here) in hierarchical dims; the ancestor must already exist or you create it first. For Time, keys are dates so you must supply them: createmember([Time].[Year] = {todatetime("2019-01-01 00:00:00.000"), "2019"});. For property updates the value goes in the FIRST slot instead: updatemember(…, [SCSLocation].[PinCode] = {"74871", });.',
    tip: 'The slot rule: names go in slot 2, property values go in slot 1. It\'s a common gotcha.' },
  { q: 'What does resetaccesscontrol do and when must you run it?',
    a: 'After you add or edit any data-security rule (grant/deny read/write), the platform does not re-evaluate access automatically. resetaccesscontrol; forces it to re-read the rules so users actually see the change. Skip it and your new grant appears to do nothing. It\'s the security analog of "refresh the cache after changing permissions."',
    tip: 'Say "always resetaccesscontrol; after editing rules, or the change won\'t take effect."' },
  { q: 'How do you grant read access with a scope, and what is the default access?',
    a: 'Syntax: grant read access <RuleName> to roles <[Role1]> for <measure|dimension|members|...> <Name> [using scope (<member filter>)];. The using scope clause row-level-restricts what the role sees (e.g. only their region\'s customers). Defaults before any rule: dimensions and attributes are read-only (write denied), while plans, measures and models (measure groups) have NO access. So you must explicitly grant measure/plan/model access; basic dimension read works out of the box.',
    tip: 'Name the defaults: dims = read-only, measures/plans/models = no access. Then show grant … using scope for row-level security.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M09 · IBPL',
    title: 'IBPL — Commands',
    subtitle: 'Members, versions, transfer and access: createmember, updatemember, delete/purge, copymeasure, grant/deny, resetaccesscontrol.',
    tabs: [
      { id: 'members', label: '👤 Member Commands' },
      { id: 'data',    label: '🔁 Data & Transfer' },
      { id: 'access',  label: '🔐 Access Commands' },
      { id: 'iq',      label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });

  container.querySelector('#tab-members').innerHTML = `
    <div class="section-pad">
      <p class="lead">Four commands manage dimensional structure. <code>{ }</code> holds <b>{key, name}</b> — empty key auto-generates.</p>
      <table class="o9-table">
        <thead><tr><th>Command</th><th>Does</th></tr></thead>
        <tbody>
          <tr><td><code>createmember</code></td><td>Add a member (with its ancestor)</td></tr>
          <tr><td><code>updatemember</code></td><td>Change a member's parent or properties</td></tr>
          <tr><td><code>deletemember</code></td><td>Soft-delete (sets <code>$InActive</code>), keeps the row</td></tr>
          <tr><td><code>purge members</code></td><td>Permanently remove soft-deleted members (irreversible)</td></tr>
        </tbody>
      </table>
      <div class="code-cap">Create (with ancestor) · note the {key, name} slots</div>
      <pre class="code"><span class="tok-k">createmember</span>([Item].[SKU] = { , <span class="tok-s">"Liril Strong - 100"</span>},
             [Item].[Brand] = { , <span class="tok-s">"Liril"</span>});
<span class="tok-c">-- slot 1 = Key (empty → auto), slot 2 = Name. Ancestor (Brand) must exist.</span>

<span class="tok-k">createmember</span>([Time].[Year] = {<span class="tok-f">todatetime</span>(<span class="tok-s">"2019-01-01 00:00:00.000"</span>), <span class="tok-s">"2019"</span>});
<span class="tok-c">-- Time keys are dates — you must supply them.</span></pre>
      <div class="code-cap">Update property (value in slot 1!) · update parent</div>
      <pre class="code"><span class="tok-k">updatemember</span>([SCSLocation].[Location] = { , <span class="tok-s">"Happy Land"</span>},
             [SCSLocation].[PinCode]  = {<span class="tok-s">"74871"</span>, });   <span class="tok-c">-- property → slot 1</span>
<span class="tok-k">updatemember</span>([SCSLocation].[Location] = { , <span class="tok-s">"Happy Land"</span>},
             [SCSLocation].[LocationGroup] = { , <span class="tok-s">"Rhode Island"</span>}); <span class="tok-c">-- move parent</span></pre>
      <div class="code-cap">Delete → cascade → purge</div>
      <pre class="code"><span class="tok-k">deletemember</span>([SCSLocation].[LocationGroup] = { , [Rhode Island]});          <span class="tok-c">-- fails if it has children</span>
<span class="tok-k">deletemember</span>([SCSLocation].[LocationGroup] = { , [Rhode Island]}) <span class="tok-k">cascade</span>; <span class="tok-c">-- take children too</span>
<span class="tok-k">purge members</span>([SCSLocation].[LocationGroup]);                              <span class="tok-c">-- ⚠️ permanent</span></pre>
      <div class="callout warn"><b>Soft vs hard:</b> <code>deletemember</code> only marks <code>$InActive</code>. Data really leaves only on <code>purge</code> — not reversible, test on dev first. Orphan members cause weird computation; don't leave them.</div>
    </div>`;

  container.querySelector('#tab-data').innerHTML = `
    <div class="section-pad">
      <p class="lead">Beyond members: update single cells, copy measures, bulk-delete, and transfer data in/out.</p>
      <div class="code-cap">Update a single fact cell</div>
      <pre class="code"><span class="tok-k">update</span> Measure.[UnitPrice]@(Product.[ProductID].[FUR-BO-10004834],
       Version.[Version Name].[CurrentWorkingView]) = <span class="tok-n">10857.63</span>;</pre>
      <div class="card-grid">
        <div class="card"><h4>📋 copymeasure</h4><p>Copy one measure's values into another (e.g. snapshot a baseline before edits).</p></div>
        <div class="card"><h4>🗑️ delete data for model</h4><p>Bulk-delete fact data for a measure group; <code>delete data for relationshiptype</code> clears edges.</p></div>
        <div class="card"><h4>⬇️ DownloadDataFile / Export</h4><p>Bulk out to CSV/Excel; <code>ExportAll</code> for full extracts.</p></div>
        <div class="card"><h4>🔎 FILTER_BY_UPDATES</h4><p>Show only rows changed-but-not-saved — review pending edits before committing.</p></div>
      </div>
      <div class="callout"><b>Five buckets of IBPL:</b> query (<code>select</code>) · modify (<code>scope</code>, <code>createmember</code>, <code>update</code>, <code>copymeasure</code>) · transfer (<code>DownloadDataFile</code>, <code>Export</code>) · query the model (inspect dims/measures/graphs) · control access (<code>grant</code>/<code>deny</code>).</div>
    </div>`;

  container.querySelector('#tab-access').innerHTML = `
    <div class="section-pad">
      <p class="lead">Two layers: UI roles (can you open the workspace) and data roles + rules (what data you see). Then always reset.</p>
      <div class="code-cap">Rule syntax</div>
      <pre class="code">&lt;<span class="tok-k">grant</span>|<span class="tok-k">deny</span>&gt; &lt;<span class="tok-k">read</span>|<span class="tok-k">write</span>&gt; <span class="tok-k">access</span> &lt;RuleName&gt; <span class="tok-k">to roles</span> &lt;[Role1],[Role2]&gt;
  <span class="tok-k">for</span> &lt;plan|model|measure|dimension|levelattribute|members&gt; &lt;Name&gt;
  [<span class="tok-k">using scope</span> (&lt;member filter&gt;)];

<span class="tok-k">resetaccesscontrol</span>;   <span class="tok-c">-- REQUIRED after any rule change, or it won't take effect</span></pre>
      <table class="o9-table">
        <thead><tr><th>Entity</th><th>Default access (before any rule)</th></tr></thead>
        <tbody>
          <tr><td>Dimension / Attribute</td><td>Read only, write denied</td></tr>
          <tr><td>Plan</td><td>No access</td></tr>
          <tr><td>Measure</td><td>No access</td></tr>
          <tr><td>Model (measure group)</td><td>No access</td></tr>
        </tbody>
      </table>
      <div class="callout"><b>Row-level security:</b> <code>using scope (Customer.[Region].filter(#.Name == "West"))</code> restricts a role to just its slice — the same measure, fewer members.</div>
      <div class="callout sql"><b>Not GRANT in SQL:</b> o9 rules are scoped to <b>plans, measures, models and members</b> (not tables/columns), can be row-restricted by a member <code>using scope</code>, and only take effect after <code>resetaccesscontrol;</code>.</div>
    </div>`;

  return null;
}
