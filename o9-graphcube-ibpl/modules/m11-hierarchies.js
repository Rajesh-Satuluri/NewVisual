import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { createExerciseSet, initExerciseSet } from '../components/exercise.js';

const M11_EX = [
  { id:'m11-diag-orphan', type:'diagnose', area:'debug', difficulty:2, competencyLabel:'Hanging member', verify:'verified',
    prompt:'A Brand roll-up is short by exactly one SKU’s worth of forecast. The SKU exists and has data. Most likely cause?',
    options:[ {text:'The SKU is a hanging/orphan member with no Brand parent', correct:true, why:'A member with no parent at the Brand level rolls up nowhere, so the Brand total is short by its value.'}, {text:'The aggregation policy is Avg', why:'Avg would change the whole total, not drop exactly one SKU.'}, {text:'A version mismatch', why:'That would change or empty the result, not drop one member.'} ],
    explanation:'List members with no parent at the level above; assign the correct parent (or createmember it). Add a validation rule to reject parentless members on load.' },
];


export const IQ = [
  { q: 'What is a level (LevelAttribute) and how does a hierarchy use it?',
    a: 'A level is a named tier within a dimension you can grain by — e.g. Item has SKU, Brand, Category levels. A hierarchy is a parent/child chain of levels (Category → Brand → SKU) that enables roll-up and drill-down: a measure stored at SKU rolls up to Brand and Category along the hierarchy. You navigate it with AncestorsAtLevel (up) and DescendantsAtLevel (down) in IBPL.',
    tip: 'Level = a tier you can grain by; hierarchy = the chain of tiers enabling roll-up/drill-down.' },
  { q: 'What are alternate hierarchies and why are they useful?',
    a: 'A dimension can have more than one hierarchy over the same members — e.g. Items rolled up by Brand in one hierarchy and by Sourcing Category in another. Planners analyze the same leaf data two ways without duplicating it. Each hierarchy defines its own parent/child chain; aggregation follows whichever hierarchy the query uses.',
    tip: 'Example: Item by Brand vs Item by Commodity — same leaves, two roll-up paths.' },
  { q: 'What is a hanging (orphan) member and why is it a problem?',
    a: 'A hanging member is a member with no parent in a hierarchy (e.g. a SKU whose Brand was deleted, or one created without its ancestor). It still has leaf data but won\'t roll up correctly — its values can disappear from aggregate views or be double-counted. The docs warn that orphans cause weird computation; the fix is to assign a parent (updatemember) or purge them.',
    tip: 'Say "orphans break roll-up — they have leaf data but no aggregation path." Tie it to always creating a member with its ancestor.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M11 · Data Model',
    title: 'Hierarchies & Levels',
    subtitle: 'How members roll up: levels, parent/child chains, alternate hierarchies, and the orphan-member trap.',
    tabs: [
      { id: 'levels', label: '🪜 Levels & Roll-up' },
      { id: 'alt',    label: '🔀 Alternate Hierarchies' },
      { id: 'nav',    label: '🧭 Navigating in IBPL' },
      { id: 'drill',  label: '🧪 Exercises' },
      { id: 'iq',     label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });

  container.querySelector('#tab-levels').innerHTML = `
    <div class="section-pad">
      <p class="lead">A hierarchy is a chain of levels. Measures are stored at the leaf and computed up the chain on read.</p>
      <div class="card" style="text-align:center;padding:24px">
        <div style="display:inline-flex;flex-direction:column;gap:10px;align-items:stretch;min-width:280px">
          <div class="pill on" style="padding:10px">Category — <b>Hydraulics</b> <span style="color:var(--text3)">(Σ 1,280)</span></div>
          <div style="color:var(--text3)">▲ rolls up</div>
          <div style="display:flex;gap:10px;justify-content:center">
            <div class="pill" style="padding:10px">Brand — 320-Series <span style="color:var(--text3)">(820)</span></div>
            <div class="pill" style="padding:10px">Brand — 330-Series <span style="color:var(--text3)">(460)</span></div>
          </div>
          <div style="color:var(--text3)">▲</div>
          <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
            <div class="pill" style="padding:8px">SKU 320D-Pump · 500</div>
            <div class="pill" style="padding:8px">SKU 320D-Seal · 320</div>
            <div class="pill" style="padding:8px">SKU 330-Drive · 260</div>
            <div class="pill" style="padding:8px">SKU 330-Link · 200</div>
          </div>
        </div>
      </div>
      <div class="callout"><b>Computed on read:</b> only the four SKU leaves are stored. Brand (820, 460) and Category (1,280) are summed along the hierarchy when queried — never stored, never stale.</div>
    </div>`;

  container.querySelector('#tab-alt').innerHTML = `
    <div class="section-pad">
      <p class="lead">The same leaves can roll up more than one way.</p>
      <div class="vs-grid">
        <div class="vs-col ibpl"><h5>Hierarchy A — by Brand</h5><p style="color:var(--text2);font-size:12.5px">Category → Brand → SKU. For marketing & product-line analysis.</p></div>
        <div class="vs-col sql" style="background:var(--accent-lo)"><h5>Hierarchy B — by Commodity</h5><p style="color:var(--text2);font-size:12.5px">Commodity Group → Sub-Commodity → SKU. For sourcing & procurement analysis.</p></div>
      </div>
      <div class="callout"><b>No data duplication:</b> one set of SKU-level facts; each hierarchy just defines a different set of parents. Aggregation follows whichever hierarchy the query grains by.</div>
    </div>`;

  container.querySelector('#tab-nav').innerHTML = `
    <div class="section-pad">
      <p class="lead">Move up and down the hierarchy with analytical functions (remember: attribute functions take a <i>filtered set</i>).</p>
      <pre class="code"><span class="tok-c">-- up: SKUs → their Brand</span>
<span class="tok-k">select</span> Item.[SKU].filter(#.Name in {[320D-Pump],[320D-Seal]}).<span class="tok-f">ancestorsAtLevel</span>([Brand]);
<span class="tok-c">-- down: a Brand → its SKUs</span>
<span class="tok-k">select</span> Item.[Brand].filter(#.Name == [320-Series]).<span class="tok-f">descendantsAtLevel</span>([SKU]);
<span class="tok-c">-- a single member's direct children (member analytic fn)</span>
<span class="tok-k">select</span> Item.[Brand].[320-Series].<span class="tok-f">children</span>;</pre>
      <div class="callout warn"><b>Orphan trap:</b> a SKU created without its Brand (or whose Brand was deleted) is a <b>hanging member</b> — it has leaf data but no roll-up path, so it vanishes from aggregates or double-counts. Always <code>createmember</code> a member <i>with</i> its ancestor; fix orphans with <code>updatemember</code> or purge them.</div>
    </div>`;

  const drill = container.querySelector('#tab-drill');
  drill.innerHTML = `<div class="section-pad">${createExerciseSet(M11_EX, { intro: 'The classic hierarchy-integrity bug.' })}</div>`;
  const cleanup = initExerciseSet(drill, M11_EX);
  return () => { cleanup && cleanup(); };
}
