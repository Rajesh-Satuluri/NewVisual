import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

const INPUT_ROWS = [
  { category: 'Electronics', total: 149.99 },
  { category: 'Books',       total:  29.99 },
  { category: 'Electronics', total:  49.99 },
  { category: 'Clothing',    total:  89.99 },
  { category: 'Books',       total:  14.99 },
  { category: 'Electronics', total: 299.99 },
  { category: 'Clothing',    total:  39.99 },
];

function makeAggSteps() {
  const steps = [];
  const hashTable = {};

  steps.push({ inputIdx: -1, hashTable: {}, desc: 'Hash Aggregation: GROUP BY category, compute SUM(total) and COUNT(*). Build a hash table keyed by category — no sorting needed.' });

  INPUT_ROWS.forEach((r, i) => {
    if (!hashTable[r.category]) hashTable[r.category] = { sum: 0, count: 0 };
    hashTable[r.category].sum += r.total;
    hashTable[r.category].count += 1;
    steps.push({
      inputIdx: i, hashTable: JSON.parse(JSON.stringify(hashTable)),
      activeKey: r.category,
      desc: `Row ${i+1}: category='${r.category}', total=${r.total}. ${hashTable[r.category].count === 1 ? 'New bucket created.' : 'Existing bucket updated.'} SUM now ${hashTable[r.category].sum.toFixed(2)}, COUNT=${hashTable[r.category].count}.`,
    });
  });

  const results = Object.entries(hashTable).map(([cat, v]) => ({ category: cat, sum: v.sum.toFixed(2), count: v.count, avg: (v.sum / v.count).toFixed(2) }));
  steps.push({ inputIdx: INPUT_ROWS.length, hashTable: JSON.parse(JSON.stringify(hashTable)), results, desc: `Aggregation complete. Hash table has ${Object.keys(hashTable).length} buckets (one per distinct category). Emit GROUP rows: category, SUM, COUNT, AVG.` });
  return steps;
}

const AGG_STEPS = makeAggSteps();
const COLORS = { Electronics: '#4F46E5', Books: '#10B981', Clothing: '#F59E0B' };

function drawAgg(ctx, stepIdx, w, h) {
  ctx.clearRect(0, 0, w, h);
  if (stepIdx < 0) {
    ctx.fillStyle = '#475569'; ctx.font = '13px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('Press Play to watch GROUP BY hash aggregation', w/2, h/2);
    ctx.textAlign = 'left'; return;
  }

  const step = AGG_STEPS[stepIdx];
  const rowH = 26, rowW = 180;
  const inputX = 20, htX = 240, resX = 560;

  // Input stream
  ctx.fillStyle = '#64748B'; ctx.font = '600 10px system-ui';
  ctx.fillText('Input rows (order_items)', inputX, 20);
  INPUT_ROWS.forEach((r, i) => {
    const y = 28 + i * (rowH + 2);
    const isActive = step.inputIdx === i;
    const isDone = step.inputIdx > i;
    const col = COLORS[r.category];
    ctx.fillStyle = isActive ? col : (isDone ? col + '22' : '#0A0F1A');
    ctx.strokeStyle = isActive ? col : (isDone ? col + '44' : '#1E293B');
    ctx.lineWidth = isActive ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(inputX, y, rowW, rowH - 2, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = isActive ? '#fff' : (isDone ? col : '#475569');
    ctx.font = '9px monospace';
    ctx.fillText(`${r.category} | $${r.total.toFixed(2)}`, inputX + 6, y + 14);
  });

  // Arrow
  if (step.inputIdx >= 0) {
    const iy = 28 + step.inputIdx * (rowH + 2) + rowH/2 - 2;
    ctx.strokeStyle = COLORS[INPUT_ROWS[step.inputIdx]?.category] || '#4F46E5';
    ctx.lineWidth = 1.5; ctx.setLineDash([4,3]);
    ctx.beginPath(); ctx.moveTo(inputX + rowW + 2, iy); ctx.lineTo(htX - 4, iy); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '10px system-ui'; ctx.fillStyle = ctx.strokeStyle;
    ctx.fillText('→', inputX + rowW + 4, iy + 4);
  }

  // Hash table
  ctx.fillStyle = '#64748B'; ctx.font = '600 10px system-ui';
  ctx.fillText('Hash Table (GROUP BY buckets)', htX, 20);
  Object.entries(step.hashTable).forEach(([cat, v], i) => {
    const y = 28 + i * 52;
    const isActive = step.activeKey === cat;
    const col = COLORS[cat];
    ctx.fillStyle = isActive ? col + '22' : '#0F172A';
    ctx.strokeStyle = isActive ? col : '#1E293B';
    ctx.lineWidth = isActive ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(htX, y, 290, 46, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = col; ctx.font = '700 10px system-ui';
    ctx.fillText(cat, htX + 8, y + 14);
    ctx.fillStyle = '#94A3B8'; ctx.font = '9px system-ui';
    ctx.fillText(`SUM: $${v.sum.toFixed(2)}   COUNT: ${v.count}   AVG: $${(v.sum/v.count).toFixed(2)}`, htX + 8, y + 32);
  });

  // Results
  if (step.results) {
    ctx.fillStyle = '#64748B'; ctx.font = '600 10px system-ui';
    ctx.fillText('Output (GROUP BY result)', resX, 20);
    step.results.forEach((r, i) => {
      const y = 28 + i * 52;
      const col = COLORS[r.category];
      ctx.fillStyle = col + '22'; ctx.strokeStyle = col; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(resX, y, 220, 46, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = col; ctx.font = '700 10px system-ui';
      ctx.fillText(r.category, resX + 8, y + 14);
      ctx.fillStyle = '#94A3B8'; ctx.font = '9px system-ui';
      ctx.fillText(`SUM: $${r.sum}  COUNT: ${r.count}  AVG: $${r.avg}`, resX + 8, y + 32);
    });
  }

  // Footer
  ctx.fillStyle = '#1E293B';
  ctx.beginPath(); ctx.roundRect(20, h - 40, w - 40, 32, 4); ctx.fill();
  ctx.fillStyle = '#64748B'; ctx.font = '10px system-ui';
  ctx.fillText(step.desc, 28, h - 20);
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Query Engine · M23',
    title: 'Aggregation',
    subtitle: 'GROUP BY with SUM/COUNT/AVG — hash aggregation vs sort-based, and how Prime Day analytics run.',
    tabs: [
      { id: 'agg',    label: '📈 Hash Aggregation' },
      { id: 'sort',   label: '📊 Sort Aggregation' },
      { id: 'iq',     label: '💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  const aggTab = container.querySelector('#tab-agg');
  aggTab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="canvas-wrap" style="margin-top:12px">
      <canvas width="800" height="380" style="width:100%;max-height:380px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="agg-explainer">
        <h3>Hash Aggregation</h3>
        <p>GROUP BY category uses a hash table keyed by category. Each incoming row updates
           the SUM and COUNT accumulators in the matching bucket. Output is emitted when input
           is exhausted. Press <strong>Play</strong> to watch rows flow into the hash table.</p>
      </div>
    </div>
  `;

  const canvas = aggTab.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const engine = new SimulationEngine({
    initialState: { step: -1 },
    steps: AGG_STEPS.map((s, i) => ({ label: `Row ${i}`, duration: 1600, mutate: st => { st.step = i; } })),
    onRender: state => {
      drawAgg(ctx, state.step, 800, 380);
      const el = aggTab.querySelector('#agg-explainer');
      if (el && state.step >= 0) { const s = AGG_STEPS[state.step]; el.innerHTML = `<h3>Step ${state.step + 1}</h3><p>${s.desc}</p>`; }
    },
  });
  SimulationEngine.renderControls(aggTab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(aggTab.querySelector('.canvas-wrap'), engine);
  drawAgg(ctx, -1, 800, 380);
  engine.reset();

  container.querySelector('#tab-sort').innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">Sort-Based Aggregation</div>
        <div class="section-desc">Sort input by GROUP BY keys, then aggregate adjacent equal-key rows — no hash table needed</div>
      </div>
      <div class="prose">
        <h3>How Sort Aggregation Works</h3>
        <p>Step 1: Sort all input rows by GROUP BY key(s). Adjacent rows with the same key are grouped together.<br>
           Step 2: Scan sorted stream, maintaining running aggregates. When key changes, emit the accumulated GROUP row.<br>
           No hash table — constant memory O(1) per group accumulator.</p>
        <div class="code-block">
<span class="cmt">-- Sorted input (by category):</span>
Books       | $29.99     ← start Books group
Books       | $14.99     ← update Books: SUM=44.98
Clothing    | $89.99     ← KEY CHANGE: emit Books. Start Clothing
Clothing    | $39.99     ← update Clothing
Electronics | $149.99    ← KEY CHANGE: emit Clothing. Start Electronics
Electronics | $49.99
Electronics | $299.99    ← update Electronics
             (end)       ← KEY CHANGE: emit Electronics
        </div>
        <h3>Hash Agg vs Sort Agg — When Each Wins</h3>
      </div>
      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead><tr><th>Criterion</th><th>Hash Aggregation</th><th>Sort Aggregation</th></tr></thead>
          <tbody>
            ${[
              ['Memory', 'O(n_distinct) for hash table', 'O(1) for current group + sort buffer'],
              ['Input ordering', 'Not required — works on any order', 'Requires sorted input (or external sort)'],
              ['Output ordering', 'Unordered (hash table traversal)', 'Sorted by GROUP BY key — free ORDER BY'],
              ['n_distinct is small', '✅ Small hash table fits easily', '⚠️ Sort overhead outweighs savings'],
              ['n_distinct is huge', '❌ Hash table spills to disk', '✅ Only keeps current group in memory'],
              ['ORDER BY same key', '❌ Needs extra Sort node after', '✅ Already sorted — no extra node'],
              ['Input already sorted', '❌ Sort advantage wasted', '✅ Sort is FREE — just scan'],
            ].map(([c, h, s]) => `<tr><td><strong>${c}</strong></td><td>${h}</td><td>${s}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'What is the difference between WHERE and HAVING in terms of aggregation?',
      a: '<strong>WHERE</strong> filters rows BEFORE aggregation — it operates on individual rows and cannot reference aggregate functions. <code>WHERE SUM(total) > 100</code> is a SQL error. <strong>HAVING</strong> filters GROUP rows AFTER aggregation — it operates on the aggregate result. <code>HAVING SUM(total) > 100</code> is valid. Execution order: FROM → WHERE (filter rows) → GROUP BY (aggregate) → HAVING (filter groups) → SELECT (project) → ORDER BY. WHERE predicates are pushed down to the scan; HAVING predicates are evaluated at the aggregate node. Performance tip: push conditions into WHERE where possible — it reduces the number of rows that reach the aggregation step.',
      tip: 'Common interview trick: "What\'s wrong with WHERE SUM(total) > 100?" — WHERE runs before GROUP BY, so aggregate functions are not available.',
    },
    {
      q: 'How does PostgreSQL compute COUNT(DISTINCT col) and why is it expensive?',
      a: 'COUNT(DISTINCT col) requires tracking which values have already been seen to avoid counting duplicates. Approaches: (1) <strong>Exact:</strong> sort all values and count unique — O(N log N). Or hash all values into a set — O(N) time, O(n_distinct) space. Both are expensive for large n_distinct. (2) <strong>Approximate:</strong> HyperLogLog — O(N) time with O(log log N) memory, ±2% error. PostgreSQL 16+ includes approximate COUNT(DISTINCT) via the <code>count_distinct</code> extension. At Amazon scale: counting distinct customers who viewed each product during Prime Day uses HLL — exact count is impractical for 300M customers.',
      tip: 'COUNT(DISTINCT) cannot be parallelized easily (partials must be merged). COUNT(*) and SUM() parallelize trivially by adding partial sums.',
    },
    {
      q: 'What is a streaming aggregation and when does it avoid materializing data?',
      a: 'A streaming (pipeline) aggregation processes rows one at a time without materializing the full input — it maintains only the current accumulator state. This works when: (1) Input is sorted by the GROUP BY key (sort aggregation); (2) The aggregate function is decomposable (SUM, COUNT, MIN, MAX — not MEDIAN). The result is emitted immediately when a new key arrives. Hash aggregation cannot stream because all groups must be finalized before any can be emitted (new rows could still update any bucket). Use case: a time-series query with GROUP BY minute ordered by minute — sort aggregation streams the result without materializing, enabling the client to receive rows as they are computed.',
      tip: 'Streaming aggregation pairs naturally with Sort-Merge Join — a sorted join output goes directly into sort aggregation without an intermediate sort step.',
    },
  ]);
  initIQ(container);

  return () => engine.destroy();
}
