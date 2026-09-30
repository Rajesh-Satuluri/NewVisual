import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

const OUTER = [
  { id: 'B08N5WRWNW', name: 'Echo Dot',     price: '$49.99' },
]; // 1 row (after filter on products)
const INNER = [
  { product_id: 'B08N5WRWNW', warehouse: 'SEA1', qty: 1240 },
  { product_id: 'B08N5WRWNW', warehouse: 'JFK1', qty:  876 },
  { product_id: 'B08N5WRWNW', warehouse: 'LAX2', qty:    0 },
  { product_id: 'B07XYZ1234', warehouse: 'SEA1', qty:  300 },
]; // inventory rows (returned from index probe)

function makeSteps() {
  const steps = [];
  steps.push({ label: 'Start: 1 outer row (products)', outerIdx: -1, innerIdx: -1, probeIdx: -1, results: [], desc: 'Products has been filtered to 1 row (product_id = B08N5WRWNW) by the index scan. Nested Loop outer = this 1 row.' });
  OUTER.forEach((o, oi) => {
    steps.push({ label: `Outer row ${oi+1}: ${o.id}`, outerIdx: oi, innerIdx: -1, probeIdx: -1, results: [], desc: `Take outer row: product_id = '${o.id}', name = '${o.name}'. Now probe the inventory index with this key.` });
    INNER.forEach((inn, ii) => {
      const match = inn.product_id === o.id && inn.qty > 0;
      const prevResults = steps.slice(-1)[0]?.results || [];
      const newResults = match ? [...prevResults, { ...o, ...inn }] : [...prevResults];
      steps.push({
        label: `Probe inventory: ${inn.warehouse}`,
        outerIdx: oi, innerIdx: ii, probeIdx: ii,
        results: newResults,
        desc: match
          ? `✅ Match! inventory.product_id = '${inn.product_id}', qty = ${inn.qty} > 0 → join output row added.`
          : `${inn.qty === 0 ? '⚠️ No match: qty = 0 fails qty > 0 filter.' : '❌ No match: product_id differs.'}`,
      });
    });
  });
  steps.push({ label: 'Done: NLJ complete', outerIdx: -1, innerIdx: -1, probeIdx: -1, results: [{ id:'B08N5WRWNW', name:'Echo Dot', price:'$49.99', warehouse:'SEA1', qty:1240 },{ id:'B08N5WRWNW', name:'Echo Dot', price:'$49.99', warehouse:'JFK1', qty:876 }], desc: '2 result rows. Nested Loop completed: 1 outer × (index probe returning 4 inventory rows) = 4 comparisons. Total page reads: 3 (products index) + 3 (inventory index) = 6.' });
  return steps;
}

const NLJ_STEPS = makeSteps();

function drawNLJ(ctx, stepIdx, w, h) {
  ctx.clearRect(0, 0, w, h);
  if (stepIdx < 0) {
    ctx.fillStyle = '#475569'; ctx.font = '13px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('Press Play to watch Nested Loop Join iterate', w/2, h/2);
    ctx.textAlign = 'left'; return;
  }
  const step = NLJ_STEPS[stepIdx];
  const colW = (w - 60) / 3;

  // Headers
  ['Outer (products)', 'Inner (inventory)', 'Result'].forEach((title, ci) => {
    const x = 20 + ci * (colW + 10);
    ctx.fillStyle = ['#4F46E5','#10B981','#F59E0B'][ci] + '22';
    ctx.beginPath(); ctx.roundRect(x, 20, colW, 22, 4); ctx.fill();
    ctx.fillStyle = ['#818CF8','#10B981','#F59E0B'][ci];
    ctx.font = '600 10px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(title, x + colW/2, 35);
    ctx.textAlign = 'left';
  });

  // Outer rows
  OUTER.forEach((o, i) => {
    const x = 20, y = 52 + i * 32;
    const isActive = step.outerIdx === i;
    ctx.fillStyle = isActive ? '#4F46E5' : '#0F172A';
    ctx.strokeStyle = isActive ? '#818CF8' : '#1E293B';
    ctx.lineWidth = isActive ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(x, y, colW, 26, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = isActive ? '#fff' : '#475569';
    ctx.font = '9px monospace'; ctx.textAlign = 'left';
    ctx.fillText(`${o.id} | ${o.name} | ${o.price}`, x + 6, y + 16);
  });

  // Inner rows
  INNER.forEach((inn, i) => {
    const x = 20 + colW + 10, y = 52 + i * 32;
    const isActive = step.probeIdx === i;
    const isDone = step.probeIdx > i;
    const match = inn.product_id === 'B08N5WRWNW' && inn.qty > 0;
    ctx.fillStyle = isActive ? (match ? '#10B981' : '#EF4444') : (isDone ? '#0F172A' : '#0A0F1A');
    ctx.strokeStyle = isActive ? (match ? '#10B981' : '#EF4444') : '#1E293B';
    ctx.lineWidth = isActive ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(x, y, colW, 26, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = isActive ? '#fff' : '#475569';
    ctx.font = '9px monospace';
    ctx.fillText(`${inn.product_id} | ${inn.warehouse} | qty:${inn.qty}`, x + 6, y + 16);
  });

  // Join arrow
  if (step.outerIdx >= 0 && step.probeIdx >= 0) {
    const oy = 52 + step.outerIdx * 32 + 13;
    const iy = 52 + step.probeIdx * 32 + 13;
    ctx.strokeStyle = '#4F46E5'; ctx.lineWidth = 1.5;
    ctx.setLineDash([4,3]);
    ctx.beginPath(); ctx.moveTo(20 + colW, oy); ctx.lineTo(20 + colW + 10, iy); ctx.stroke();
    ctx.setLineDash([]);
  }

  // Results
  step.results.forEach((r, i) => {
    const x = 20 + (colW + 10) * 2, y = 52 + i * 32;
    ctx.fillStyle = '#F59E0B' + '22'; ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(x, y, colW, 26, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#F59E0B'; ctx.font = '9px monospace';
    ctx.fillText(`${r.name} | ${r.warehouse} | ${r.qty}`, x + 6, y + 16);
  });

  // Status bar
  const comparisons = Math.max(0, stepIdx - 1);
  ctx.fillStyle = '#1E293B';
  ctx.beginPath(); ctx.roundRect(20, h - 50, w - 40, 40, 6); ctx.fill();
  ctx.fillStyle = '#4F46E5'; ctx.font = '700 11px system-ui';
  ctx.fillText(`Iterations: ${comparisons} / ${OUTER.length * INNER.length}   Result rows: ${step.results.length}   Page reads: ~6`, 30, h - 28);
  ctx.fillStyle = '#64748B'; ctx.font = '10px system-ui';
  ctx.fillText(step.desc, 30, h - 12);
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Query Engine · M20',
    title: 'Nested Loop Join',
    subtitle: 'For each outer row, probe the inner side — optimal when outer is tiny and inner has an index.',
    tabs: [
      { id: 'nlj',      label: '🔁 NLJ Animation' },
      { id: 'variants', label: '📋 Variants' },
      { id: 'iq',       label: '💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  const nljTab = container.querySelector('#tab-nlj');
  nljTab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="canvas-wrap" style="margin-top:12px">
      <canvas width="800" height="380" style="width:100%;max-height:380px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="nlj-explainer">
        <h3>Nested Loop Join</h3>
        <p>The outer loop iterates over each row in the outer relation (products — 1 row after filter).
           For each outer row, it probes the inner relation (inventory) using an index on product_id.
           Press <strong>Play</strong> to watch the join execute.</p>
      </div>
    </div>
  `;

  const canvas = nljTab.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const engine = new SimulationEngine({
    initialState: { step: -1 },
    steps: NLJ_STEPS.map((s, i) => ({ label: s.label, duration: 1800, mutate: st => { st.step = i; } })),
    onRender: state => {
      drawNLJ(ctx, state.step, 800, 380);
      const el = nljTab.querySelector('#nlj-explainer');
      if (el && state.step >= 0) {
        const s = NLJ_STEPS[state.step];
        el.innerHTML = `<h3>${s.label}</h3><p>${s.desc}</p>`;
      }
    },
  });
  SimulationEngine.renderControls(nljTab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(nljTab.querySelector('.canvas-wrap'), engine);
  drawNLJ(ctx, -1, 800, 380);
  engine.reset();

  container.querySelector('#tab-variants').innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">NLJ Variants & When to Use Each</div>
      </div>
      <div class="info-grid">
        ${[
          { name: 'Simple NLJ (index inner)', color: '#4F46E5',
            when: 'Outer is tiny (1–1000 rows), inner has index on join key',
            cost: 'O(|outer| × index_lookup_cost) — our Prime Day query: 1 × 4ms = 4ms total',
            good: true, note: 'The chosen plan for product_id lookup on Prime Day' },
          { name: 'Block Nested Loop (BNL)', color: '#06B6D4',
            when: 'No index on inner join key — buffer the outer in memory blocks',
            cost: 'O(|outer_pages| × |inner_pages|) — much better than simple NLJ without index',
            good: false, note: 'MySQL uses this when no index exists — PostgreSQL uses HashJoin instead' },
          { name: 'Batched Key Access (BKA)', color: '#10B981',
            when: 'Multiple outer rows can be batched for inner index lookups (MRR)',
            cost: 'Groups 100s of outer rows, sorts by inner page number, reads inner sequentially',
            good: true, note: 'MySQL\'s Multi-Range Read optimization — reduces random I/O on inner' },
          { name: 'NLJ with materialized inner', color: '#F59E0B',
            when: 'Inner is a subquery/CTE that would re-execute for each outer row',
            cost: 'Materializes inner result once → O(|outer| × scan_materialized)',
            good: true, note: 'PostgreSQL materializes inner CTEs by default (pre-PG 12); PG 12+ inlines unless MATERIALIZED keyword used' },
        ].map(v => `
          <div class="info-card" style="border-color:${v.color}33">
            <div class="info-card-title" style="color:${v.color};margin-bottom:6px">${v.good ? '✅' : '⚠️'} ${v.name}</div>
            <div style="font-size:11px;margin-bottom:4px"><strong>When:</strong> ${v.when}</div>
            <div style="font-size:11px;margin-bottom:4px"><strong>Cost:</strong> ${v.cost}</div>
            <div style="font-size:10px;color:${v.color}">${v.note}</div>
          </div>
        `).join('')}
      </div>
      <div class="prose" style="padding-top:20px">
        <h3>NLJ Complexity</h3>
        <p>With index on inner: O(|R| × log(|S|)) — logarithmic per probe.<br>
           Without index on inner: O(|R| × |S|) — O(n²) — catastrophic for large tables.<br>
           Prime Day: |R|=1, |S|=2.1M with index → O(1 × log(2.1M)) ≈ O(21) comparisons. Fast.</p>
      </div>
    </div>
  `;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'When does the optimizer choose Nested Loop Join vs Hash Join?',
      a: '<strong>NLJ wins when:</strong> (1) The outer relation is very small (1–1000 rows after filtering); (2) The inner relation has a useful index on the join key; (3) Memory is limited (NLJ uses O(1) memory vs O(|build_side|) for Hash). <strong>Hash Join wins when:</strong> (1) Both sides are large; (2) No index exists on the join key; (3) Enough memory is available for the hash table (work_mem). <strong>Sort-Merge wins when:</strong> Both sides are already sorted on the join key (e.g., both read from an index scan). The query optimizer evaluates the cost formula for each and picks the minimum — check EXPLAIN output to see what it chose.',
      tip: 'At Amazon scale: 99% of OLTP joins use NLJ (1 outer row from PK lookup). OLAP joins use Hash Join for multi-million-row aggregations.',
    },
    {
      q: 'Why is a Cartesian join (NLJ without a predicate) so dangerous?',
      a: 'A Cartesian join has no join predicate — every row from the outer is paired with every row from the inner: |R| × |S| output rows. Amazon\'s 350M products × 300M customers = 105 quadrillion rows. At 100 bytes per row, that\'s 10.5 exabytes — impossible to store or transmit. Common cause: a multi-table FROM clause with a missing JOIN condition. <code>SELECT * FROM products, customers</code> is a Cartesian join. Always verify EXPLAIN output shows a join predicate, not a "Cross Join" or "Nested Loop (no join condition)" node.',
      tip: 'SQL WHERE-style joins (FROM A, B WHERE A.x = B.x) are semantically equivalent to EXPLICIT JOIN ON. But if the WHERE clause is accidentally dropped, the Cartesian product appears silently.',
    },
    {
      q: 'How does the optimizer decide which side of a join is the "outer" vs "inner"?',
      a: 'The optimizer estimates row counts for both sides after applying all filters. It puts the smaller estimate as the outer (driving) side of the NLJ — this minimizes the number of inner probes. Cost = outer_rows × inner_probe_cost. For our query: products after filter = 1 row (outer), inventory = 2.1M rows (inner with index). Swapping makes it 2.1M × (products index probe) = 2.1M probes — far worse. For Hash Join: the smaller side is the "build" side (hash table). For Sort-Merge: both are sorted and merged symmetrically.',
      tip: 'In EXPLAIN, the NLJ outer is the top node under "Nested Loop". The inner is the bottom. Check "loops=N" — N should be the outer row count.',
    },
  ]);
  initIQ(container);

  return () => engine.destroy();
}
