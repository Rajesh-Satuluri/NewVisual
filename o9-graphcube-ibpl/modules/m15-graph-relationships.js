import { createModuleShell, createIQSection } from '../components/module-shell.js';

export const IQ = [
  { q: 'What is a graph relationship (edge) in o9, and how is it different from a measure?',
    a: 'A measure lives at the intersection of dimension members (a node-space cell). An edge lives on a relationship between two member sets — a FROM intersection and a TO intersection — and carries its own edge properties. For example the Production_Pegging relationship connects a FROM (supplying Item/Location/Activity/Lot/Week) to a TO (consuming Customer/Item/Location/Order/Week) and carries edge properties like Material Production Pegged Quantity. You query edges with From./To./Edge. prefixes and a RelationshipType filter — not with a plain measure select.',
    tip: 'Say it crisply: "measures sit on nodes/intersections; edges sit on relationships and have their own properties."' },
  { q: 'Walk through the syntax of a graph scope / edge select.',
    a: 'You put FROM attributes and TO attributes in the row scope (joined with *), the edge properties in the column set, and filter by RelationshipType plus Version. e.g.: Select (From.[Item].[Item] * From.[Location].[Location] * To.[Customer].[Customer Name] * To.[Order].[Order Name]) on row, ({Edge.[Production_Pegging].[Material Production Pegged Quantity]}) on column where {RelationshipType.[Production_Pegging], Version.[Version Name]}; Each result row is one edge instance linking a specific FROM cell to a specific TO cell, with the pegged quantity on it.',
    tip: 'The three prefixes to remember: From., To., Edge. — plus the RelationshipType.[…] in the where.' },
  { q: 'What is the difference between a symmetrical and an asymmetrical graph, and why does it matter for cycles?',
    a: 'An asymmetrical (cross-dimension) relationship connects two different dimensions — e.g. Brand→Product — and can\'t cycle. A symmetrical relationship connects a dimension to itself — Item→Item (Bill of Materials) or Location→Location (transportation network). For a BOM, a cycle (A needs B needs A) is a data error that would make explosion loop forever. For a transportation network, cycles are expected and valid (you can ship both directions). So the same self-referential shape is a bug in one context and correct in another.',
    tip: 'Give both examples: BOM cycle = error; transport-lane cycle = valid. It shows you understand graph semantics, not just syntax.' },
  { q: 'What do UPSTREAM and DOWNSTREAM traversal mean on an edge?',
    a: 'DOWNSTREAM follows the edge in its natural FROM→TO direction (e.g. from a supplying activity toward the customer order it pegs to). UPSTREAM follows it backwards TO→FROM (from a demand back to what supplies it). Supply-chain pegging questions — "what demand is this production covering?" vs "what supply covers this order?" — are exactly downstream vs upstream traversals of the pegging graph.',
    tip: 'Anchor it to pegging: downstream = supply→demand, upstream = demand→supply.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M15 · GraphCube',
    title: 'Graph Relationships & Edges',
    subtitle: 'The part with no SQL equivalent: typed edges between member sets, queried with From / To / Edge / RelationshipType.',
    tabs: [
      { id: 'what',   label: '🕸️ Edges vs Measures' },
      { id: 'examples', label: '🔗 Three Relationships' },
      { id: 'syntax', label: '⌨️ Edge Syntax' },
      { id: 'iq',     label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });

  container.querySelector('#tab-what').innerHTML = `
    <div class="section-pad">
      <p class="lead">A measure answers "what is the value <i>here</i>?" An edge answers "what connects <i>this</i> to <i>that</i>, and how much?"</p>
      <div class="vs-grid">
        <div class="vs-col sql"><h5>Measure (node / intersection)</h5>
          <p style="color:var(--text2);font-size:12.5px">Lives at one cell — a point in dimension space.<br><br>
          <code class="tok-f">Measure.[Forecast Quantity]</code> at<br>{ Item, LC, Week, Version }<br><br>Scalar value. No direction.</p></div>
        <div class="vs-col ibpl"><h5>Edge (relationship)</h5>
          <p style="color:var(--text2);font-size:12.5px">Lives on a link between a FROM cell and a TO cell.<br><br>
          <code class="tok-f">Edge.[Production_Pegging].[Qty]</code> from<br>{ supplying Item/Loc/Activity } → { consuming Customer/Order }<br><br>Has direction + its own properties.</p></div>
      </div>
      <div class="callout sql"><b>Why this breaks the "IBPL = SQL" analogy:</b> a SQL join is computed on the fly from matching keys and vanishes after the query. An o9 edge is <b>stored, typed and first-class</b> — it carries data (pegged quantity, lead time, constraint type) and is traversed, not joined.</div>
    </div>`;

  const REL = [
    { t:'Brand → Product', kind:'Asymmetrical (cross-dimension)', cyc:'Cycles impossible', color:'#22D3EE',
      d:'Connects the Brand dimension to the Product dimension. A product belongs to exactly one brand; you can traverse brand→its products or product→its brand, but it can never loop.' },
    { t:'Item → Item (Bill of Materials)', kind:'Symmetrical (self-referential)', cyc:'Cycles = DATA ERROR', color:'#A78BFA',
      d:'A finished good is made of sub-assemblies made of raw materials — all Items. BOM explosion walks this graph downward. If component A (indirectly) needs A, explosion loops forever — that cycle is a bug to detect and reject.' },
    { t:'Location → Location (Transport Network)', kind:'Symmetrical (self-referential)', cyc:'Cycles = VALID', color:'#34D399',
      d:'Plants, DCs and stores shipping to each other — all Locations. The same self-referential shape as BOM, but here a cycle (Dallas↔LA lanes both ways) is expected and correct.' },
  ];
  container.querySelector('#tab-examples').innerHTML = `
    <div class="section-pad">
      <p class="lead">Three relationship shapes you must be able to tell apart — especially why the identical self-referential shape is a bug in one and valid in another.</p>
      <div style="display:flex;flex-direction:column;gap:12px">
        ${REL.map(r=>`
          <div class="card" style="border-left:4px solid ${r.color}">
            <h4 style="color:${r.color}">${r.t}</h4>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 8px">
              <span class="pill">${r.kind}</span>
              <span class="pill ${r.cyc.includes('VALID')?'on':''}" style="${r.cyc.includes('ERROR')?'color:var(--red);border-color:var(--red)':''}">${r.cyc}</span>
            </div>
            <p>${r.d}</p>
          </div>`).join('')}
      </div>
      <div class="callout"><b>Traversal:</b> DOWNSTREAM follows FROM→TO (supply → the demand it covers); UPSTREAM follows TO→FROM (demand → the supply covering it).</div>
    </div>`;

  container.querySelector('#tab-syntax').innerHTML = `
    <div class="section-pad">
      <p class="lead">The real quick-ref graph-scope example: the CAT <b>Production_Pegging</b> relationship, FROM a supplying activity TO a customer order.</p>
      <div class="code-cap">Edge definition (relationship type)</div>
      <table class="o9-table">
        <thead><tr><th>FROM attributes</th><th>TO attributes</th><th>Edge properties</th></tr></thead>
        <tbody>
          <tr>
            <td>Item.[Item]<br>Location.[Location]<br>Activity.[Activity]<br>Lot.[Lot ID]<br>Time.[FiscalWeek]</td>
            <td>Item.[Item]<br>Location.[Location]<br>Order.[Order Name]<br>Customer.[CustomerID]<br>Time.[FiscalWeek]</td>
            <td>Material Production Pegged Quantity<br>MaterialConstraintQty<br>MaterialConstraintType</td>
          </tr>
        </tbody>
      </table>
      <div class="code-cap">Querying the edge</div>
      <pre class="code"><span class="tok-k">Select</span> (From.[Time].[Fiscal Week] * From.[Activity].[Activity] *
        From.[Item].[Item] * From.[Location].[Location] * From.[Lot].[Lot ID] *
        To.[Customer].[Customer Name] * To.[Item].[Item] *
        To.[Location].[Location] * To.[Order].[Order Name] *
        To.[Time].[Fiscal Week]) <span class="tok-k">on row</span>,
       ({<span class="tok-f">Edge.[Production_Pegging].[Material Production Pegged Quantity]</span>,
         <span class="tok-f">Edge.[Production_Pegging].[MaterialConstraintQty]</span>,
         <span class="tok-f">Edge.[Production_Pegging].[MaterialConstraintType]</span>}) <span class="tok-k">on column</span>
<span class="tok-k">where</span> {RelationshipType.[Production_Pegging], Version.[Version Name]};</pre>
      <p style="font-size:12px;color:var(--text2)">Each result row is one pegging edge: a supplying BOH/FG activity at a plant/week linked to a specific customer order, carrying the pegged quantity (e.g. 400) and any constraint type (e.g. <code class="tok-s">LeadtimePlanBeforeCurrent</code>).</p>
      <div class="callout sql"><b>No SQL equivalent.</b> There is no table to <code>FROM</code> and no <code>JOIN ON</code>. You name a <code class="tok-f">RelationshipType</code>, project <code class="tok-f">From.</code>/<code class="tok-f">To.</code> attributes, and read <code class="tok-f">Edge.</code> properties off the link itself.</div>
    </div>`;

  return null;
}
