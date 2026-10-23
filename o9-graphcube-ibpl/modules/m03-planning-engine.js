import { createModuleShell, createIQSection } from '../components/module-shell.js';

export const IQ = [
  { q: 'What does the o9 planning engine actually do over the GraphCube?',
    a: 'It runs solvers that read input measures (demand, supply, capacity, constraints) at their intersections, optimize against an objective (minimize cost, maximize service, minimize lateness) subject to constraints (capacity, lead time, sourcing rules), and write output measures back into the cube (planned orders, net requirements, allocations). Because inputs and outputs are all measures in the same graph, a change to an assumption re-propagates and can be re-solved without moving data between systems.',
    tip: 'Frame it as read-inputs → optimize(objective, constraints) → write-outputs, all in-cube.' },
  { q: 'What are the main constraint types a supply solver respects?',
    a: 'Capacity (a resource/plant can only produce so much per bucket), material/BOM (you can\'t build a finished good without its components), lead time (supply must start early enough to arrive on time), sourcing/validity (which location can supply which demand, and when a lane is valid), and priority (which demand gets served first under shortage). The CAT distribution solver (DRP) layers these to turn net requirements into feasible planned orders.',
    tip: 'Group them: capacity, material, time, sourcing, priority. Then give the DRP example.' },
  { q: 'How do demand, supply and inventory planning connect in one model?',
    a: 'Demand planning produces a consensus forecast (statistical baseline + BAF adjustments + planner commits) at Customer-Item-LC-Week. That accepted forecast becomes the demand signal for supply planning, which nets it against on-hand and in-transit inventory and existing orders to compute net requirements, then distributes/sources them respecting constraints. Inventory planning sets safety-stock targets that feed back as additional demand. All three read and write the same GraphCube, so they stay consistent.',
    tip: 'The handoff to name: accepted Final Forecast Quantity → demand signal into supply/DRP.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M03 · Platform',
    title: 'Planning Engine',
    subtitle: 'The computation layer — solvers that read input measures, optimize against constraints, and write plans back to the cube.',
    tabs: [
      { id: 'flow',       label: '⚙️ Solve Loop' },
      { id: 'constraints', label: '⛓️ Constraints' },
      { id: 'iq',         label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });

  const STEPS = [
    ['1','Read inputs','Solver reads demand, on-hand & in-transit inventory, open orders, capacity and constraint measures at their intersections.','#F59E0B'],
    ['2','Optimize','Searches for a feasible, optimal plan against an objective (min cost / max service / min lateness) subject to all constraints.','#A78BFA'],
    ['3','Write outputs','Planned orders, net requirements, allocations and pegging edges are written back into the GraphCube as measures/edges.','#22D3EE'],
    ['4','Propagate & re-solve','A changed assumption re-propagates through the graph; planners can re-run scenarios on isolated versions.','#34D399'],
  ];
  container.querySelector('#tab-flow').innerHTML = `
    <div class="section-pad">
      <p class="lead">The solver doesn't move data to a separate engine — it reads and writes measures in place.</p>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${STEPS.map(([n,t,d,c])=>`
          <div class="card" style="border-left:4px solid ${c};display:flex;gap:14px;align-items:flex-start">
            <div style="font-size:20px;font-weight:800;color:${c};min-width:26px">${n}</div>
            <div><h4 style="color:${c}">${t}</h4><p>${d}</p></div>
          </div>`).join('')}
      </div>
      <div class="callout">The CAT distribution solver (<b>CATMPN / DRP</b>) is the supply-side instance of this loop — see the companion <b>o9 Supply Chain Solver</b> lab for the full net-requirement, shortage and allocation walkthrough.</div>
    </div>`;

  const CONS = [
    ['🏭','Capacity','A resource or plant can only produce/handle so much per time bucket.'],
    ['🧱','Material / BOM','Can\'t build a finished good without its components; explosion follows the BOM edges.'],
    ['⏱️','Lead time','Supply must be released early enough to arrive by the demand date.'],
    ['🗺️','Sourcing / validity','Which location may supply which demand, and over what valid date range.'],
    ['🥇','Priority','Which demand is served first when supply is short.'],
    ['📦','Inventory targets','Safety-stock and min/max targets that constrain how low stock may go.'],
  ];
  container.querySelector('#tab-constraints').innerHTML = `
    <div class="section-pad">
      <p class="lead">Six constraint families a supply solver balances simultaneously.</p>
      <div class="card-grid">
        ${CONS.map(([i,t,d])=>`<div class="card"><h4>${i} ${t}</h4><p>${d}</p></div>`).join('')}
      </div>
      <div class="callout warn"><b>Infeasibility is information.</b> When constraints conflict (demand exceeds capacity within lead time), the solver surfaces shortages and late orders — the planner then relaxes a constraint, re-sources, or accepts the lateness.</div>
    </div>`;

  return null;
}
