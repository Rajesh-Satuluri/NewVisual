import { createModuleShell, createIQSection } from '../components/module-shell.js';

export const IQ = [
  { q: 'What is the difference between the Current Working View, a scenario, and a snapshot?',
    a: 'The Current Working View (CWV, Version Key == 0) is the single live plan everyone edits. A scenario (Key < 0) is a dynamic what-if branch isolated from the CWV — you change assumptions and re-solve without affecting the live plan; it recomputes as inputs change. A snapshot (Key > 0) is a read-only frozen archive — a point-in-time copy kept for comparison/audit that never changes. Version-key sign tells you which you\'re in.',
    tip: 'Key semantics: ==0 CWV (live), <0 scenario (dynamic what-if), >0 snapshot (frozen archive).' },
  { q: 'What does "version isolation" mean and why does it matter?',
    a: 'Every fact is partitioned by version, so edits in a scenario can\'t leak into the CWV or another scenario — each version is an independent copy of the measure space. This lets multiple planners run competing what-ifs (aggressive vs conservative demand) side by side, compare them, and only merge the chosen one back. It\'s also why forgetting the Version filter returns 0 rows: you haven\'t selected a partition.',
    tip: 'Isolation = scenarios are sandboxes; nothing you do in one touches CWV until you deliberately merge.' },
  { q: 'How do you promote a scenario into the live plan?',
    a: 'You copy the chosen scenario\'s measures back into the CWV — conceptually a version merge: for the measures and grain you care about, write the scenario values into Key==0. In IBPL this is a scope/copymeasure that reads from the scenario version and writes to CWV. Snapshots are taken the same way in reverse — copy CWV into a positive-key version to freeze it. The point is that moving between versions is an explicit, auditable copy, not an accident.',
    tip: 'Merge = copy scenario → CWV; snapshot = copy CWV → a frozen positive-key version. Both are explicit.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M14 · Data Model',
    title: 'Version Management',
    subtitle: 'CWV, scenarios and snapshots — the mandatory Version dimension and how what-if planning stays isolated.',
    tabs: [
      { id: 'three', label: '🗂️ Three Version Types' },
      { id: 'iso',   label: '🧪 Isolation & Merge' },
      { id: 'iq',    label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });

  container.querySelector('#tab-three').innerHTML = `
    <div class="section-pad">
      <p class="lead">Version is a mandatory partition. The version key's <b>sign</b> tells you its type.</p>
      <div class="card-grid">
        <div class="card" style="border-left:4px solid #34D399"><h4 style="color:#34D399">Key == 0 · Current Working View</h4><p>The single live plan everyone edits. "CWV" is the default you filter to: <code>Version.[Version Name].filter(#.Key == 0)</code>.</p></div>
        <div class="card" style="border-left:4px solid #A78BFA"><h4 style="color:#A78BFA">Key &lt; 0 · Scenario</h4><p>A dynamic what-if branch, isolated from CWV. Change assumptions, re-solve, compare. Recomputes as inputs change.</p></div>
        <div class="card" style="border-left:4px solid #F59E0B"><h4 style="color:#F59E0B">Key &gt; 0 · Snapshot</h4><p>A read-only frozen archive — a point-in-time copy for comparison/audit. Never changes.</p></div>
      </div>
      <div class="callout"><b>CAT:</b> versions span the CAT Demand, Supply and Inventory plans — e.g. a CWV plus Scenario_Aggressive / Scenario_Conservative demand branches and weekly snapshots for lag comparison.</div>
    </div>`;

  container.querySelector('#tab-iso').innerHTML = `
    <div class="section-pad">
      <p class="lead">Each version is an independent copy of the measure space — nothing crosses over until you deliberately copy it.</p>
      <div class="card" style="text-align:center;padding:22px">
        <div style="display:flex;gap:18px;justify-content:center;align-items:center;flex-wrap:wrap">
          <div class="pill" style="padding:12px 16px;border-color:#A78BFA;color:#A78BFA">Scenario_Aggressive<br><span style="font-size:11px;color:var(--text3)">demand +15%</span></div>
          <div style="color:var(--text3)">— merge →</div>
          <div class="pill on" style="padding:12px 16px">CurrentWorkingView<br><span style="font-size:11px;color:var(--text3)">live plan (Key 0)</span></div>
          <div style="color:var(--text3)">— snapshot →</div>
          <div class="pill" style="padding:12px 16px;border-color:#F59E0B;color:#F59E0B">Snapshot_W40<br><span style="font-size:11px;color:var(--text3)">frozen</span></div>
        </div>
      </div>
      <div class="code-cap">Merge a scenario into CWV (copy measures across versions)</div>
      <pre class="code"><span class="tok-k">scope</span>: ([Version].[Version Name].[CurrentWorkingView] * [Item].[SKU] * [Time].[Week]);
   Measure.[Forecast] = Measure.[Forecast]@(Version.[Version Name].[Scenario_Aggressive]);
<span class="tok-k">end scope</span>;</pre>
      <div class="callout warn"><b>Isolation is why Version is mandatory.</b> No version filter = no partition selected = 0 rows. Moving data between versions is always an explicit, auditable copy — never a side effect.</div>
    </div>`;

  return null;
}
