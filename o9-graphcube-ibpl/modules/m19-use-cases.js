import { createModuleShell, createIQSection } from '../components/module-shell.js';

export const IQ = [
  { q: 'Walk me through how demand, supply and inventory planning connect in the CAT tenant.',
    a: 'Demand: a statistical baseline (FiscalWeek Forecast Quantity - Item LC) is adjusted by BAF, exceptions are reviewed, and a Commit-or-Cancel decision produces an accepted Final Forecast Quantity at Customer-Item-LC-FiscalWeek. Supply: that accepted forecast is the demand signal; the DRP/distribution solver nets it against on-hand and in-transit inventory and open orders to compute net requirements, then sources and distributes respecting lead time, capacity and sourcing rules. Inventory: safety-stock targets (driven by demand variability and lead-time variability) feed back as additional demand so supply plans to cover them. All three read/write the same GraphCube.',
    tip: 'The spine: accepted demand → net requirements → sourced/distributed supply, with safety stock looping back as demand.' },
  { q: 'How would you find the parts most at risk of stockout in the next 4 weeks?',
    a: 'Compute days-of-supply = available-for-planning ÷ (avg weekly demand ÷ 7) and flag where it is below total lead time (you can\'t replenish in time), optionally netting safety stock and restricting to priority parts. In IBPL it\'s a select with transient columns and a post-filter ordering by days-of-supply ascending, limit 10 — see the Worked IBPL tab.',
    tip: 'Risk = days-of-supply < lead time. SafeDivide for the ratio, post-filter + orderby asc + limit.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M19 · Practice',
    title: 'Use Cases',
    subtitle: 'How the pieces come together in the CAT tenant — demand, supply, inventory — plus a real worked IBPL query.',
    tabs: [
      { id: 'demand', label: '📈 Demand' },
      { id: 'supply', label: '🚚 Supply / DRP' },
      { id: 'inv',    label: '📦 Inventory' },
      { id: 'worked', label: '⌨️ Worked IBPL' },
      { id: 'iq',     label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });

  container.querySelector('#tab-demand').innerHTML = `
    <div class="section-pad">
      <p class="lead">Produce a consensus forecast and hand it to supply.</p>
      <ol style="font-size:13px;color:var(--text2);line-height:1.9;padding-left:20px">
        <li>Statistical baseline arrives: <code>FiscalWeek Forecast Quantity - Item LC</code>.</li>
        <li><code>BAF</code> / <code>USE_BAF</code> apply customer-driven adjustments.</li>
        <li>Exceptions surface (<code>Weekly CoC Firm Zone Exception</code>, <code>10-Day CoC Exception</code>).</li>
        <li>Planner commits via <code>Forecast Acceptance Status (CIL)</code>.</li>
        <li>Accepted <code>Final Forecast Quantity Weekly Lag</code> → demand signal into supply.</li>
      </ol>
      <div class="callout"><b>Lag measures</b> (Lag 0…52) capture the forecast "as it was" each week — the basis for bias, MAPE and forecast value-add.</div>
    </div>`;

  container.querySelector('#tab-supply').innerHTML = `
    <div class="section-pad">
      <p class="lead">Turn accepted demand into feasible, sourced supply (the CATMPN / DRP solver).</p>
      <ol style="font-size:13px;color:var(--text2);line-height:1.9;padding-left:20px">
        <li>Net demand against on-hand + in-transit inventory and open orders → <b>net requirements</b>.</li>
        <li>Source net requirements to suppliers / upstream LCs respecting <b>sourcing rules & validity</b>.</li>
        <li>Offset by <b>lead time</b> so releases start early enough to arrive on time.</li>
        <li>Respect <b>capacity</b>; under shortage, allocate by <b>priority</b>.</li>
        <li>Write planned orders + <b>pegging edges</b> linking supply to the demand it covers.</li>
      </ol>
      <div class="callout">See the companion <b>o9 Supply Chain Solver</b> lab for the full net-requirement, shortage and allocation walkthrough.</div>
    </div>`;

  container.querySelector('#tab-inv').innerHTML = `
    <div class="section-pad">
      <p class="lead">Set targets that protect service, then loop them back as demand.</p>
      <ol style="font-size:13px;color:var(--text2);line-height:1.9;padding-left:20px">
        <li>Safety stock sized from <b>demand variability</b> and <b>lead-time variability</b> (<code>Safety Stock Final (Volume) - Item LC</code>).</li>
        <li>For a critical part with variable demand AND long variable lead time → higher safety stock, possibly service-level-driven.</li>
        <li>Targets feed back as additional demand so supply plans to cover them.</li>
        <li>Monitor <b>inventory turns</b> and <b>days-of-supply</b>; investigate drops by LC/item.</li>
      </ol>
      <div class="callout warn"><b>Stockout despite "enough" inventory?</b> Usually a data/modelling issue: wrong grain, in-transit not netted, safety stock double-counted, or a priority-part allocation starving it. Debug data layer → business logic → process.</div>
    </div>`;

  container.querySelector('#tab-worked').innerHTML = `
    <div class="section-pad">
      <p class="lead">Top 10 parts at highest stockout risk in the next 4 fiscal weeks — real CAT measures.</p>
      <pre class="code">(<span class="tok-k">select</span> ([Version].[Version Name].[CurrentWorkingView]
   * [Item].[Item Number] * [LogisticsCenter].[Logistics Center Code] *
   {Measure.[On Hand Qty - IL], Measure.[Available for Planning Quantity - IL],
    Measure.[Total Lead Time - IL],
    Measure.[Average Weekly Demand Multi-Echelon - Item LC],
    Measure.[Safety Stock Final (Volume) - Item LC],
    <span class="tok-f">safedivide</span>(Measure.[Available for Planning Quantity - IL],
       <span class="tok-f">safedivide</span>(Measure.[Average Weekly Demand Multi-Echelon - Item LC], <span class="tok-n">7</span>, null),
       null) <span class="tok-k">as</span> Transient.DaysOfSupply}))
.<span class="tok-f">filter</span>(Transient.DaysOfSupply &lt; Measure.[Total Lead Time - IL]
    &amp;&amp; ~<span class="tok-f">isnull</span>(Measure.[Average Weekly Demand Multi-Echelon - Item LC])
    &amp;&amp; Measure.[Available for Planning Quantity - IL] &gt; <span class="tok-n">0</span>)
<span class="tok-k">orderby</span> Transient.DaysOfSupply <span class="tok-k">asc</span> <span class="tok-k">limit</span> <span class="tok-n">10</span>;</pre>
      <p style="font-size:12px;color:var(--text2)">"At risk" = days-of-supply &lt; total lead time (can't replenish in time). Add <code>&amp;&amp; Measure.[Priority Part - IL] == 1</code> to the filter for priority parts only.</p>
      <div class="callout sql"><b>Notice:</b> <code>safedivide</code> (not <code>/</code>) to dodge divide-by-zero, <code>coalesce</code>/<code>isnull</code> for null-safety, a <b>post-filter</b> on a transient column, and <b>Version mandatory</b> — none of which a naive SQL translation would get right.</div>
    </div>`;

  return null;
}
