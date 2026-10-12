import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { createExerciseSet, initExerciseSet } from '../components/exercise.js';

// Dependency/lineage graph (layered DAG). deps = direct upstream ids.
const LN_NODES = [
  { id:'src-fcst',  label:'Forecast Load',   layer:0, kind:'source', deps:[], role:'Ingested statistical/consensus forecast rows at Customer×Item×LC×Week.' },
  { id:'src-act',   label:'Actuals Load',    layer:0, kind:'source', deps:[], role:'Shipped/sold actual quantities, loaded weekly.' },
  { id:'src-master',label:'Master Data',     layer:0, kind:'source', deps:[], role:'Item / LC / Customer members and hierarchies — loaded before any facts.' },
  { id:'fcst',  label:'Forecast Quantity', layer:1, kind:'base', deps:['src-fcst','src-master'], role:'Editable base forecast measure (Sum).' },
  { id:'act',   label:'Actual Quantity',   layer:1, kind:'base', deps:['src-act','src-master'], role:'Actuals measure used for error/bias (Sum).' },
  { id:'baf',   label:'BAF',               layer:1, kind:'base', deps:['src-fcst'], role:'Business Adjustment Factor — a manual override delta.' },
  { id:'usebaf',label:'USE_BAF',           layer:1, kind:'base', deps:['src-fcst'], role:'Flag: apply the BAF override or not.' },
  { id:'net',   label:'Net Forecast',      layer:2, kind:'calc', deps:['fcst','baf','usebaf'], role:'Forecast + (BAF when USE_BAF=1). A calculated measure.' },
  { id:'err',   label:'Forecast Error',    layer:2, kind:'calc', deps:['net','act'], role:'Net Forecast − Actual Quantity.' },
  { id:'mape',  label:'MAPE',              layer:2, kind:'calc', deps:['err'], role:'Mean absolute % error — forecast accuracy KPI.' },
  { id:'supply',label:'Supply Plan Input', layer:3, kind:'out', deps:['net'], role:'Net Forecast handed to the supply solver.' },
  { id:'excp',  label:'Exception Flags',   layer:3, kind:'out', deps:['err'], role:'CoC / bias exceptions raised when error breaches a threshold.' },
  { id:'export',label:'Downstream Export', layer:3, kind:'out', deps:['mape','supply'], role:'Published metrics + plan to downstream systems.' },
];

const M12_EX = [
  { id:'m12-diag-lineage', type:'diagnose', area:'debug', difficulty:2, competencyLabel:'Lineage trace', verify:'verified',
    prompt:'A planner flips <b>USE_BAF</b> on for a few cells. Using the lineage, which outputs can legitimately move as a result?',
    options:[ {text:'Only Net Forecast', why:'Net Forecast changes, but so does everything that depends on it.'}, {text:'Net Forecast, Forecast Error, MAPE, Supply Plan Input, Exceptions and the Export', correct:true, why:'USE_BAF → Net Forecast, which flows to Error → MAPE and to Supply Plan Input → Exceptions and Export. The whole downstream cone moves.'}, {text:'Nothing — USE_BAF is just a flag', why:'The flag gates whether BAF is added, so it changes Net Forecast and everything downstream.'} ],
    explanation:'Trace forward from USE_BAF in the Lineage Explorer: its descendant cone is Net Forecast → Error → MAPE → Supply → Exceptions → Export.' },
  { id:'m12-predict-change', type:'predict', area:'model', difficulty:2, competencyLabel:'Change propagation', verify:'simulated',
    prompt:'For one cell, Forecast Quantity is <code>null</code> (not stored) and the Net Forecast rule is <code>Forecast + if(USE_BAF==1) then BAF else 0</code> with <b>no coalesce</b>. What is Net Forecast there?',
    options:[ {text:'null — it propagates from the missing Forecast', correct:true, why:'null + anything = null; the if-guard protects BAF, not the base forecast.'}, {text:'0', why:'Nothing defaults the null to 0 without coalesce.'}, {text:'Just the BAF value', why:'null + BAF still yields null.'} ],
    explanation:'Lineage tells you *what* depends on Forecast Quantity; null-propagation tells you *how* the change travels. Harden with coalesce(Forecast, 0).' },
];

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
      { id: 'lineage', label: '🔗 Lineage Explorer' },
      { id: 'drill', label: '🧪 Exercises' },
      { id: 'iq',    label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });

  const cleanupLn = renderLineage(container.querySelector('#tab-lineage'));
  const drill = container.querySelector('#tab-drill');
  drill.innerHTML = `<div class="section-pad">${createExerciseSet(M12_EX, { intro: 'Trace cause and effect through the lineage, then reason about how a change propagates.' })}</div>`;
  const cleanupEx = initExerciseSet(drill, M12_EX);

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

  return () => { cleanupLn && cleanupLn(); cleanupEx && cleanupEx(); };
}

function renderLineage(el) {
  const byId = Object.fromEntries(LN_NODES.map(n => [n.id, n]));
  const children = {}; LN_NODES.forEach(n => n.deps.forEach(d => { (children[d] = children[d] || []).push(n.id); }));
  const ancestors = (id, acc = new Set()) => { byId[id].deps.forEach(d => { if (!acc.has(d)) { acc.add(d); ancestors(d, acc); } }); return acc; };
  const descendants = (id, acc = new Set()) => { (children[id] || []).forEach(c => { if (!acc.has(c)) { acc.add(c); descendants(c, acc); } }); return acc; };

  // layout
  const COLW = 214, BW = 160, BH = 44, X0 = 20, GAPY = 20, Y0 = 20;
  const layers = [[], [], [], []]; LN_NODES.forEach(n => layers[n.layer].push(n));
  const pos = {};
  const maxRows = Math.max(...layers.map(l => l.length));
  const H = Y0 * 2 + maxRows * (BH + GAPY);
  layers.forEach((nodes, li) => {
    const colH = nodes.length * (BH + GAPY) - GAPY;
    const startY = (H - colH) / 2;
    nodes.forEach((n, i) => { pos[n.id] = { x: X0 + li * COLW, y: startY + i * (BH + GAPY) }; });
  });
  const W = X0 * 2 + 3 * COLW + BW;

  const edgeSvg = LN_NODES.flatMap(n => n.deps.map(d => {
    const a = pos[d], b = pos[n.id];
    return `<path class="ln-edge" data-from="${d}" data-to="${n.id}" d="M ${a.x + BW} ${a.y + BH/2} C ${a.x + BW + 40} ${a.y + BH/2}, ${b.x - 40} ${b.y + BH/2}, ${b.x} ${b.y + BH/2}" />`;
  })).join('');
  const nodeSvg = LN_NODES.map(n => {
    const p = pos[n.id];
    return `<g class="ln-node ln-${n.kind}" data-id="${n.id}" transform="translate(${p.x},${p.y})">
      <rect width="${BW}" height="${BH}" rx="9" /><text x="${BW/2}" y="${BH/2}">${n.label}</text></g>`;
  }).join('');

  el.innerHTML = `
    <div class="section-pad">
      <p class="lead">Trace a value through the model. Click any measure to light up everything it <b>depends on</b> (upstream) and everything that <b>depends on it</b> (downstream) — the backward/forward lineage planners ask for when a number looks wrong.</p>
      <div class="ln-legend"><span class="ln-k src">Source</span><span class="ln-k base">Base measure</span><span class="ln-k calc">Calculated</span><span class="ln-k out">Output</span><span class="ln-k up">— upstream</span><span class="ln-k down">— downstream</span></div>
      <div class="ln-wrap"><svg viewBox="0 0 ${W} ${H}" class="ln-svg" role="img" aria-label="Measure lineage graph"><g class="ln-edges">${edgeSvg}</g>${nodeSvg}</svg></div>
      <div class="ln-detail" id="ln-detail"><p class="mx-hint">Click a node to trace its lineage.</p></div>
    </div>`;

  const detail = el.querySelector('#ln-detail');
  const clear = () => el.querySelectorAll('.ln-node,.ln-edge').forEach(n => n.classList.remove('sel','up','down'));

  const select = (id) => {
    clear();
    const up = ancestors(id), down = descendants(id);
    el.querySelector(`.ln-node[data-id="${id}"]`)?.classList.add('sel');
    up.forEach(u => el.querySelector(`.ln-node[data-id="${u}"]`)?.classList.add('up'));
    down.forEach(d => el.querySelector(`.ln-node[data-id="${d}"]`)?.classList.add('down'));
    el.querySelectorAll('.ln-edge').forEach(e => {
      const f = e.dataset.from, t = e.dataset.to;
      if ((up.has(f) || f === id) && (up.has(t) || t === id)) e.classList.add('up');
      if ((down.has(t) || t === id) && (down.has(f) || f === id)) e.classList.add('down');
    });
    const n = byId[id];
    const names = ids => { const a = [...ids]; return a.length ? a.map(x => byId[x].label).join(', ') : '—'; };
    detail.innerHTML = `<div class="mx-card"><h4>${n.label} <span class="mx-tag ${n.kind==='source'?'illus':'real'}">${n.kind}</span></h4>
      <p>${n.role}</p>
      <div class="mx-grid">
        <div><b>⬅ Depends on (upstream)</b><br>${names(up)}</div>
        <div><b>➡ Feeds (downstream)</b><br>${names(down)}</div>
        <div><b>Direct inputs</b><br>${names(new Set(n.deps))}</div>
      </div></div>`;
  };
  const onClick = (e) => { const g = e.target.closest('.ln-node'); if (g) select(g.dataset.id); };
  el.querySelector('.ln-svg').addEventListener('click', onClick);
  return () => el.querySelector('.ln-svg')?.removeEventListener('click', onClick);
}
