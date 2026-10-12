import { createModuleShell, createIQSection } from '../components/module-shell.js';

export const IQ = [
  { q: 'What is a measure group and what defines it?',
    a: 'A measure group (also called a Model) is a set of measures that share one grain — the exact combination of dimensions and levels they are stored by. The grain is the measure group\'s defining property: it is effectively the primary key of a table whose columns are the measures. In the CAT tenant, Customer-Item-LC-Month and Customer-Item-LC-FiscalWeek are separate groups because their time grain differs (Month vs Week).',
    tip: 'Measure group = table; its grain = primary key; its measures = columns.' },
  { q: 'What measure data types and flags matter?',
    a: 'Measures have a data type — numeric (the usual), but also string, date/datetime, and boolean/flag measures (USE_BAF, BAF Exclusion Flag, Forecast Acceptance Status). A key flag is editable/IsEditable: whether planners can write the measure in the UI, vs computed/calculative measures which are derived by rules and can\'t be directly edited (and can\'t be spread — you upload a fact file instead). Aggregation policy (Sum, Min, Avg…) is also a per-measure property.',
    tip: 'Name the editable vs calculative distinction — it decides whether a planner can type a value or not.' },
  { q: 'Why can\'t a weekly and a monthly measure live in the same measure group?',
    a: 'Because every measure in a group is physically stored at the group\'s grain, and a single cell has exactly one address. A weekly measure needs a FiscalWeek coordinate; a monthly measure needs a Month coordinate — they can\'t share one cell. So the tenant models them as separate groups (Customer-Item-LC-FiscalWeek vs Customer-Item-LC-Month) and relates them through aggregation/spreading when needed.',
    tip: 'One cell, one address → one grain per group. That\'s the whole reason.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M12 · Data Model',
    title: 'Measure Groups & Measures',
    subtitle: 'The "tables" of the GraphCube: a measure group is a set of measures sharing one grain.',
    tabs: [
      { id: 'grain', label: '📐 Grain = Primary Key' },
      { id: 'types', label: '🔢 Types & Flags' },
      { id: 'cat',   label: '🏭 CAT Measure Groups' },
      { id: 'iq',    label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });

  container.querySelector('#tab-grain').innerHTML = `
    <div class="section-pad">
      <p class="lead">A measure group's grain is the set of dimensions/levels it is stored by — its primary key.</p>
      <div class="card">
        <h4>📊 Customer-Item-LC-FiscalWeek</h4>
        <p style="margin-bottom:8px"><b>Grain (PK):</b> <code class="k">Customer × Item × LogisticsCenter × FiscalWeek</code> — plus Version, always.</p>
        <table class="o9-table" style="margin:0">
          <thead><tr><th>Customer</th><th>Item</th><th>LC</th><th>Week</th><th>Forecast Qty</th><th>Final Fcst Qty</th></tr></thead>
          <tbody>
            <tr><td>DealerA</td><td>320D-Pump</td><td>DC-Dallas</td><td>W01</td><td>500</td><td>520</td></tr>
            <tr><td>DealerA</td><td>320D-Pump</td><td>DC-Dallas</td><td>W02</td><td>480</td><td>480</td></tr>
          </tbody>
        </table>
      </div>
      <div class="callout"><b>Columns = measures.</b> Adding a measure adds a column at this grain; it does not change the grain. All ~300 measures in this group share it.</div>
    </div>`;

  container.querySelector('#tab-types').innerHTML = `
    <div class="section-pad">
      <p class="lead">Per-measure properties decide how a measure behaves.</p>
      <table class="o9-table">
        <thead><tr><th>Property</th><th>Values</th><th>Effect</th></tr></thead>
        <tbody>
          <tr><td><b>Data type</b></td><td>Numeric · String · Date · Boolean/Flag</td><td>What the cell holds (e.g. <code>USE_BAF</code> is a flag)</td></tr>
          <tr><td><b>Editable (IsEditable)</b></td><td>true / false</td><td>Can a planner type a value, or is it computed?</td></tr>
          <tr><td><b>Calculative</b></td><td>rule-derived</td><td>Can't be edited or spread — comes from a rule / fact upload</td></tr>
          <tr><td><b>Aggregation policy</b></td><td>Sum · Min · Max · Avg · …</td><td>How leaves roll up to parents (module 13)</td></tr>
          <tr><td><b>Spreading rule</b></td><td>CopyToLeaves · DistributeToLeaves</td><td>How an aggregate edit flows to leaves (module 13)</td></tr>
        </tbody>
      </table>
      <div class="callout warn"><b>Editable vs calculative:</b> you can only write (and spread) an editable measure. A calculative measure is derived — to change it you change its rule or upload a fact file at the right grain.</div>
    </div>`;

  container.querySelector('#tab-cat').innerHTML = `
    <div class="section-pad">
      <p class="lead">Real CAT demand-planning measure groups, coarse to fine.</p>
      <table class="o9-table">
        <thead><tr><th>Measure Group</th><th>Grain</th><th>Representative measures</th></tr></thead>
        <tbody>
          <tr><td><b>Customer-LC-Month</b></td><td>Customer × LC × Month</td><td>Total Exceptions Firm Zone CoC, Monthly CoC Delta Thresholds</td></tr>
          <tr><td><b>Customer-Item-LC-Month</b></td><td>Customer × Item × LC × Month <span class="pill">459</span></td><td>Forecast Quantity Weekly Lag 0…52</td></tr>
          <tr><td><b>Customer-Item-LC-FiscalWeek</b></td><td>Customer × Item × LC × FiscalWeek <span class="pill">300</span></td><td>BAF, USE_BAF, Forecast Acceptance Status, CoC flags</td></tr>
          <tr><td><b>Item-LC-FiscalWeek</b></td><td>Item × LC × FiscalWeek</td><td>FiscalWeek Forecast Quantity - Item LC (statistical baseline)</td></tr>
        </tbody>
      </table>
      <div class="callout"><b>Why so many lag measures?</b> Storing the forecast "as it was" at each weekly lag (Lag 1, 6, 26, 52) is what lets CAT measure forecast value-add, bias and MAPE against today's actuals.</div>
    </div>`;

  return null;
}
