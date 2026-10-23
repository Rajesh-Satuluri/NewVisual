const TERMS = [
  ['Dimension','A "table"-like axis of the model (Item, LogisticsCenter, Customer, Supplier, PlanningCalendar, Version).'],
  ['Level / LevelAttribute','A tier within a dimension you can grain by (Item.[SKU], Time.[Week]).'],
  ['Hierarchy','A parent/child chain of levels enabling roll-up and drill-down.'],
  ['Member','A specific value at a level — Item.[SKU].[320D-Pump].'],
  ['Measure','A numeric fact at an intersection — always Measure.-prefixed.'],
  ['Measure Group (Model)','A set of measures sharing one grain.'],
  ['Grain','The exact dimensions/levels a measure group is stored by — its primary key.'],
  ['Edge','A value on a typed graph relationship — Edge.[Production_Pegging].[Qty].'],
  ['RelationshipType','The named type of a graph relationship (e.g. Production_Pegging).'],
  ['Version','Mandatory partition — CWV (Key 0), scenario (Key<0), snapshot (Key>0).'],
  ['CWV','Current Working View — the live plan; Version Key == 0.'],
  ['Scope','A statement that writes/computes measures over an intersection; 7 variants.'],
  ['Transient','A scratch/calculated column named in a select — ... as Transient.X.'],
  ['# (hash)','"Self" inside a filter — the level attribute being filtered (#.Name == "X").'],
  ['@ (at)','Read a measure at a different intersection — Measure.[Inv]@(Time.#.LeadOffset(-1)).'],
  ['LeadOffset(n)','Move n positions at a level (+ future, − past).'],
  ['coalesce(x, 0)','Substitute a default for null — essential, nulls propagate through arithmetic.'],
  ['SafeDivide','Division that returns null instead of erroring on a zero divisor.'],
  ['where vs .filter()','where filters input before the table is built; .filter() filters output after.'],
  ['CopyToLeaves','Spreading: copy the aggregate verbatim to every leaf (Min/Max/Avg).'],
  ['DistributeToLeaves','Spreading: split the aggregate proportional to a basis measure (Sum).'],
  ['BasisMeasure','The weights DistributeToLeaves uses; NullBasis/Assortment/Respread are fallbacks/modifiers.'],
  ['Aggregation policy','How leaves roll up — Sum, Min, Max, Avg, FirstChild, LastChild, …'],
  ['$InActive','Soft-delete flag set by deletemember; cleared only by purge.'],
  ['$IsCurrent / $InPast','Time-dimension flags — current vs elapsed bucket.'],
  ['createmember','Add a member (with its ancestor); {key, name} slots.'],
  ['purge members','Permanently remove soft-deleted members — irreversible.'],
  ['resetaccesscontrol','Re-evaluate security rules after any grant/deny change.'],
  ['BAF','Business Adjustment Factor — overrides the system forecast (USE_BAF flag).'],
  ['CoC','Commit-or-Cancel — the governance gate accepting/rejecting a forecast change.'],
  ['GraphCube','o9\'s sparse, graph-aware storage/compute engine — not an OLAP cube.'],
  ['IBPL','Integrated Business Planning Language — how you query & script the GraphCube.'],
];

export function mount(container) {
  const rows = TERMS.slice().sort((a,b)=>a[0].localeCompare(b[0]));
  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">Reference</div>
        <h1 class="module-title">Glossary</h1>
        <p class="module-subtitle">Every term in this tool, in one place. Filter to find one fast.</p>
      </div>
      <div class="section-pad">
        <input id="gloss-filter" type="text" placeholder="Filter terms…" aria-label="Filter terms"
          style="width:100%;max-width:360px;padding:9px 12px;margin-bottom:16px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px">
        <table class="o9-table"><tbody id="gloss-body">
          ${rows.map(([t,d])=>`<tr><td style="white-space:nowrap"><b>${t}</b></td><td>${d}</td></tr>`).join('')}
        </tbody></table>
      </div>
    </div>`;
  const f = container.querySelector('#gloss-filter');
  const onF = () => {
    const q = f.value.trim().toLowerCase();
    container.querySelectorAll('#gloss-body tr').forEach(tr => {
      tr.hidden = q && !tr.textContent.toLowerCase().includes(q);
    });
  };
  f.addEventListener('input', onF);
  return () => f.removeEventListener('input', onF);
}
