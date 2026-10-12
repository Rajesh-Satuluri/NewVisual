import { createModuleShell, createIQSection } from '../components/module-shell.js';

const LAYERS = [
  { n:'4', name:'Decision / Consumption', color:'#22D3EE', icon:'🖥️',
    body:'Planning workbenches, dashboards, IBP & what-if scenarios, and the API. This is where planners act on the plan and where IBPL queries surface results.' },
  { n:'3', name:'Graph Cube + Engine', color:'#A78BFA', icon:'🧊',
    body:'The in-memory GraphCube holds measures at intersections of dimension nodes; the solver/planning math computes over it. Values aggregate and disaggregate along graph edges — the heart of the platform.' },
  { n:'2', name:'Enterprise Knowledge Graph', color:'#34D399', icon:'🕸️',
    body:'The value-chain graph of relatively stable business entities — products, BOMs, suppliers, plants, customers — plus facts, assumptions and versioned plans connected to the assumptions that created them.' },
  { n:'1', name:'Data Ingestion / Sources', color:'#F59E0B', icon:'🔌',
    body:'ERP, POS and external feeds land via SFTP batch, REST API, SOAP/XML and streaming, with connectors to SAP, Oracle, Snowflake, Databricks and BigQuery into a data lake / staging.' },
];

const PILLARS = [
  ['🧠','Digital Brain','The branded name for the whole platform — an enterprise "brain" that senses, decides and acts across the value chain.'],
  ['🕸️','Enterprise Knowledge Graph','A connected model of the business so a change in one place propagates everywhere instantly.'],
  ['🧊','GraphCube','Graph + cube: multi-dimensional measures stored sparsely, aggregating along graph edges — not a traditional OLAP cube.'],
  ['⌨️','IBPL','Integrated Business Planning Language — the query & scripting language to read, write and reshape cube data.'],
  ['⚙️','Planning Engine','Solvers and optimization that turn demand, supply and constraints into feasible, optimal plans.'],
  ['🔀','Workflow Engine','Planning cycles, approvals, exception queues and commit-or-cancel decisions.'],
  ['📊','Analytics & AI/ML','Statistical forecasting, demand sensing and scenario analysis built on the same graph.'],
  ['🗂️','Versioning','Current Working View, scenarios and snapshots give isolated what-if planning.'],
  ['🔐','Security','UI roles + data roles with grant/deny rules scoped to plans, measures and members.'],
];

export const IQ = [
  { q: 'What is the o9 Digital Brain, and how do GraphCube and IBPL fit into it?',
    a: 'The Digital Brain is o9\'s branded platform (also called mPower) — an enterprise decision-making system built on an Enterprise Knowledge Graph (EKG). The GraphCube is the storage/compute engine inside it: a multi-dimensional model where dimensions are nodes in a graph and measures live at their intersections, aggregating along graph edges. IBPL (Integrated Business Planning Language) is how configurators and planners talk to that GraphCube — reading cells, writing cells with scope statements, and reshaping the model.',
    tip: 'Frame it as three layers: the knowledge graph (what the business is), the GraphCube (how its numbers are stored & computed), and IBPL (how you interact with it).' },
  { q: 'Why does o9 use a graph + cube instead of a traditional OLAP cube or a relational star schema?',
    a: 'A traditional OLAP cube pre-allocates every intersection (dense) and has no native concept of relationships between members. o9\'s model is sparse — only populated intersections are stored — and the dimensions are connected by typed edges (e.g. Item→Location pegging, BOM Item→Item). That lets values propagate along real business relationships (a BOM explosion, a sourcing path) and lets planners edit at aggregate levels with values spreading down to leaves. It\'s designed around the cause-and-effect relationships between plans, decisions and outcomes.',
    tip: 'The two differentiators to name: native graph edges (relationships) and sparse storage with aggregation along those edges.' },
  { q: 'What are the four layers of the o9 Enterprise Knowledge Graph?',
    a: '(1) Data ingestion from systems of record and external feeds; (2) the knowledge graph of stable business entities (products, BOMs, suppliers, plants, customers) plus facts, assumptions and versioned plans; (3) the GraphCube + planning engine that computes over it; and (4) the consumption layer — workbenches, dashboards, IBP/what-if and APIs. Plans are versioned and linked to the assumptions used to create them, and decisions are recorded as structured objects.',
    tip: 'Mention that plans being connected to their assumptions is what makes scenario comparison and "why did the plan change?" traceability possible.' },
  { q: 'What is a "tenant" in o9, and what does the CAT tenant look like?',
    a: 'A tenant is a customer\'s isolated instance of the platform — its own dimensions, hierarchies, measure groups, measures, versions and rules. The CAT (aftermarket parts) tenant models dimensions like Item, LogisticsCenter, Customer, Supplier, PlanningCalendar and Version, with measure groups at grains such as Customer-Item-LC-Month and Customer-Item-LC-FiscalWeek, holding measures like Forecast Quantity Weekly Lag 0–52, BAF and Commit-or-Cancel flags across CAT Demand, Supply and Inventory plans.',
    tip: 'Knowing real measure-group grains (e.g. Customer × Item × LC × FiscalWeek) signals you have hands-on tenant experience, not just theory.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M01 · Platform',
    title: 'o9 Platform Overview',
    subtitle: 'The Digital Brain, the Enterprise Knowledge Graph, the GraphCube, and IBPL — how the pieces fit together.',
    tabs: [
      { id: 'layers',  label: '🏛️ Four Layers' },
      { id: 'pillars', label: '🧩 Capabilities' },
      { id: 'brain',   label: '🧠 Digital Brain' },
      { id: 'iq',      label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });

  container.querySelector('#tab-layers').innerHTML = `
    <div class="section-pad">
      <p class="lead">o9 describes its Enterprise Knowledge Graph as four stacked layers. Data flows <b>up</b> (ingestion → graph → cube → consumption) and plans flow <b>back down</b> as write-backs. Read from the bottom.</p>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${LAYERS.map(l => `
          <div class="card" style="border-left:4px solid ${l.color};display:flex;gap:14px;align-items:flex-start">
            <div style="font-size:26px">${l.icon}</div>
            <div>
              <h4 style="color:${l.color}">Layer ${l.n} — ${l.name}</h4>
              <p>${l.body}</p>
            </div>
          </div>`).join('')}
      </div>
      <div class="callout"><b>The key move</b> happens between layers 2 and 3: the knowledge graph defines <i>which</i> entities relate to which, and the GraphCube stores the <i>numbers</i> at those intersections — then aggregates them along the very edges the graph defines.</div>
    </div>`;

  container.querySelector('#tab-pillars').innerHTML = `
    <div class="section-pad">
      <p class="lead">Nine capabilities you should be able to name and place on the platform map.</p>
      <div class="card-grid">
        ${PILLARS.map(([i,t,d]) => `<div class="card"><h4>${i} ${t}</h4><p>${d}</p></div>`).join('')}
      </div>
    </div>`;

  container.querySelector('#tab-brain').innerHTML = `
    <div class="section-pad">
      <p class="lead">The "Digital Brain" metaphor, made concrete.</p>
      <div class="vs-grid" style="grid-template-columns:1fr">
        <div class="vs-col ibpl" style="border-right:none">
          <h5>Sense → Decide → Act</h5>
          <p style="color:var(--text2);font-size:12.5px">
            <b>Sense</b> — ingest demand signals, inventory positions, supplier commits into the knowledge graph.<br><br>
            <b>Decide</b> — the planning engine runs solvers over the GraphCube to produce feasible, optimal plans; planners run what-if scenarios on isolated versions.<br><br>
            <b>Act</b> — approved plans write back down to leaf level (DistributeToLeaves) and flow to execution systems and downstream exports.
          </p>
        </div>
      </div>
      <div class="card-grid">
        <div class="card"><h4>🔁 Fully linked</h4><p>Because everything lives in one graph, a changed assumption propagates to every dependent plan immediately — no overnight batch reconciliation.</p></div>
        <div class="card"><h4>⚡ Fast aggregation</h4><p>Built-in support for lightning-fast roll-up and drill-down along any hierarchy, on sparse data.</p></div>
        <div class="card"><h4>🗂️ Versioned</h4><p>Every plan is a version; scenarios branch off without touching the live Current Working View.</p></div>
      </div>
    </div>`;

  return null;
}
