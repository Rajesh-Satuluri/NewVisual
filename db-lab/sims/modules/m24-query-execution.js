import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

// Volcano model: 5-node plan tree
// Project → NLJ → [IndexScan products, IndexScan inventory]
const PLAN_NODES = [
  { id: 'proj',  label: 'Project\n[name,price,qty]', x: 400, y: 40,  color: '#4F46E5', open: false, rows: 0 },
  { id: 'nlj',   label: 'Nested Loop\nJoin',          x: 400, y: 130, color: '#10B981', open: false, rows: 0 },
  { id: 'idxP',  label: 'IndexScan\nproducts',        x: 240, y: 230, color: '#06B6D4', open: false, rows: 0 },
  { id: 'idxI',  label: 'IndexScan\ninventory',       x: 560, y: 230, color: '#06B6D4', open: false, rows: 0 },
];

const VOLCANO_STEPS = [
  { activeCall: 'proj', phase: 'open', node: 'proj',  desc: 'Client calls Project.open(). Project calls NLJ.open() (its child).', callStack: ['Project.open()'] },
  { activeCall: 'nlj',  phase: 'open', node: 'nlj',   desc: 'NLJ.open() → calls both children: IndexScan_P.open() and IndexScan_I.open(). Both index scans position at tree roots.', callStack: ['Project.open()', 'NLJ.open()'] },
  { activeCall: 'idxP', phase: 'open', node: 'idxP',  desc: 'IndexScan_P.open(): positions B+ tree cursor at product_id = B08N5WRWNW. Root of the call stack. All iterators are now open.', callStack: ['Project.open()', 'NLJ.open()', 'IndexScan_P.open()'] },
  { activeCall: 'proj', phase: 'next', node: 'proj',  desc: 'Client calls Project.next(). Project calls NLJ.next() — "give me a row".', callStack: ['Project.next()'] },
  { activeCall: 'nlj',  phase: 'next', node: 'nlj',   desc: 'NLJ.next(): calls IndexScan_P.next() for the next outer row.', callStack: ['Project.next()', 'NLJ.next()'] },
  { activeCall: 'idxP', phase: 'next', node: 'idxP',  desc: 'IndexScan_P.next(): traverse B+ tree → returns 1 row (product B08N5WRWNW). NLJ receives this row as the outer.', callStack: ['Project.next()', 'NLJ.next()', 'IndexScan_P.next() → row'] },
  { activeCall: 'idxI', phase: 'next', node: 'idxI',  desc: 'NLJ calls IndexScan_I.next() with the join key B08N5WRWNW. Inventory index returns 1st matching row (SEA1, qty=1240). NLJ emits join row.', callStack: ['Project.next()', 'NLJ.next()', 'IndexScan_I.next() → row'] },
  { activeCall: 'proj', phase: 'emit', node: 'proj',  desc: 'Project receives the join row, extracts [name, price, qty], emits it to the client. Client calls Project.next() again.', callStack: ['Project.next() → ROW 1 emitted'] },
  { activeCall: 'idxI', phase: 'next2', node: 'idxI', desc: 'NLJ calls IndexScan_I.next() again — returns 2nd matching row (JFK1, qty=876). NLJ emits 2nd join row.', callStack: ['Project.next()', 'NLJ.next()', 'IndexScan_I.next() → row 2'] },
  { activeCall: 'proj', phase: 'emit2', node: 'proj', desc: 'Project emits 2nd row to client. Client calls Project.next() again.', callStack: ['Project.next() → ROW 2 emitted'] },
  { activeCall: 'idxI', phase: 'eof',  node: 'idxI',  desc: 'IndexScan_I.next() returns EOF (no more inventory rows for this product_id and qty>0). NLJ advances outer → IndexScan_P.next() also returns EOF.', callStack: ['IndexScan_I.next() → EOF'] },
  { activeCall: 'proj', phase: 'close', node: 'proj', desc: 'NLJ returns EOF to Project. Project returns EOF to client. Client calls Project.close() → propagates Close down the tree. All iterators release resources.', callStack: ['Project.close()', 'NLJ.close()', 'IndexScan.close()'] },
];

function drawVolcano(ctx, stepIdx, w, h) {
  ctx.clearRect(0, 0, w, h);
  if (stepIdx < 0) {
    ctx.fillStyle = '#475569'; ctx.font = '13px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('Press Play to trace Volcano iterator calls through the plan tree', w/2, h/2);
    ctx.textAlign = 'left'; return;
  }

  const step = VOLCANO_STEPS[stepIdx];
  const nodeMap = {};
  PLAN_NODES.forEach(n => { nodeMap[n.id] = n; });

  // Edges
  [['proj','nlj'],['nlj','idxP'],['nlj','idxI']].forEach(([a,b]) => {
    const na = nodeMap[a], nb = nodeMap[b];
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(na.x, na.y + 22); ctx.lineTo(nb.x, nb.y - 22); ctx.stroke();
  });

  PLAN_NODES.forEach(n => {
    const isActive = n.id === step.node;
    const lines = n.label.split('\n');
    const bw = Math.max(...lines.map(l => l.length)) * 7 + 24;
    const bh = 42;
    ctx.fillStyle = isActive ? n.color : n.color + '22';
    ctx.strokeStyle = isActive ? n.color : n.color + '66';
    ctx.lineWidth = isActive ? 2.5 : 1;
    ctx.beginPath(); ctx.roundRect(n.x - bw/2, n.y - bh/2, bw, bh, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = isActive ? '#fff' : '#94A3B8';
    ctx.font = (isActive ? '700' : '400') + ' 11px system-ui';
    ctx.textAlign = 'center';
    lines.forEach((l, i) => ctx.fillText(l, n.x, n.y - (lines.length-1)*7 + i*14 + 2));
    ctx.textAlign = 'left';
    if (isActive) {
      ctx.fillStyle = n.color; ctx.font = '700 10px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(step.phase.toUpperCase(), n.x, n.y + bh/2 + 14);
      ctx.textAlign = 'left';
    }
  });

  // Call stack
  const stackX = 20, stackY = 290;
  ctx.fillStyle = '#1E293B';
  ctx.beginPath(); ctx.roundRect(stackX, stackY, w - 40, 80, 6); ctx.fill();
  ctx.fillStyle = '#4F46E5'; ctx.font = '700 10px system-ui';
  ctx.fillText('Call Stack:', stackX + 8, stackY + 16);
  step.callStack.forEach((c, i) => {
    ctx.fillStyle = i === step.callStack.length - 1 ? '#818CF8' : '#475569';
    ctx.font = '10px monospace';
    ctx.fillText(`${'  '.repeat(i)}${c}`, stackX + 8, stackY + 30 + i * 14);
  });
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Query Engine · M24',
    title: 'Query Execution',
    subtitle: 'The Volcano/Iterator model: open → next → close propagating down the plan tree.',
    tabs: [
      { id: 'volcano', label: '▶️ Volcano Model' },
      { id: 'pipeline',label: '🔗 Pipelining' },
      { id: 'iq',      label: '💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  const vTab = container.querySelector('#tab-volcano');
  vTab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="canvas-wrap" style="margin-top:12px">
      <canvas width="800" height="400" style="width:100%;max-height:400px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="v-explainer">
        <h3>Volcano / Iterator Model</h3>
        <p>Every operator implements three methods: <strong>open()</strong> — initialize state,
           <strong>next()</strong> — return one tuple or EOF, <strong>close()</strong> — release resources.
           The parent calls <em>next()</em> on its children (pull-based). Press <strong>Play</strong>
           to trace open/next/close through the plan tree.</p>
      </div>
    </div>
  `;

  const canvas = vTab.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const engine = new SimulationEngine({
    initialState: { step: -1 },
    steps: VOLCANO_STEPS.map((s, i) => ({ label: s.desc.substring(0, 30) + '…', duration: 2000, mutate: st => { st.step = i; } })),
    onRender: state => {
      drawVolcano(ctx, state.step, 800, 400);
      const el = vTab.querySelector('#v-explainer');
      if (el && state.step >= 0) { const s = VOLCANO_STEPS[state.step]; el.innerHTML = `<h3>Phase: ${s.phase.toUpperCase()} — ${s.activeCall}</h3><p>${s.desc}</p>`; }
    },
  });
  SimulationEngine.renderControls(vTab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(vTab.querySelector('.canvas-wrap'), engine);
  drawVolcano(ctx, -1, 800, 400);
  engine.reset();

  container.querySelector('#tab-pipeline').innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">Pipeline vs Materialization</div>
        <div class="section-desc">When operators can stream vs when they must buffer all rows first</div>
      </div>
      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead><tr><th>Operator</th><th>Pipelining?</th><th>Why / Why Not</th></tr></thead>
          <tbody>
            ${[
              ['Project', '✅ Full pipeline', 'Emits one row immediately for each next() call from parent. No buffering.'],
              ['Filter (WHERE)', '✅ Full pipeline', 'Passes rows that match predicate immediately, discards others. O(1) memory.'],
              ['NLJ (with index inner)', '✅ Full pipeline', 'Each outer row immediately triggers inner probe and emits joins.'],
              ['Hash Join', '❌ Blocking (build phase)', 'Must consume entire build side before emitting ANY rows from probe phase.'],
              ['Sort', '❌ Blocking', 'Must consume all input and sort before emitting row 1. O(N log N), O(N) memory.'],
              ['Hash Aggregation', '❌ Blocking', 'Must see all groups before finalizing. SUM/COUNT finalized only at end.'],
              ['Sort Aggregation', '⚠️ Semi-blocking', 'Streams output but requires sorted input (from a blocking Sort above).'],
              ['Limit', '✅ Full pipeline', 'Calls next() up to N times then stops — parent operators see early termination.'],
            ].map(([op, p, why]) => `<tr><td><code style="color:var(--accent)">${op}</code></td><td>${p}</td><td style="font-size:11px">${why}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="prose" style="padding-top:20px">
        <h3>Morsel-Driven Parallelism (Modern Execution)</h3>
        <p>The Volcano model is single-threaded (one next() call at a time). Modern DBMS use
           <strong>morsel-driven execution</strong>: the input is split into fixed-size "morsels"
           (1024–4096 rows), and multiple threads process different morsels in parallel.
           DuckDB and Hyper use this model. PostgreSQL uses process-per-worker parallelism
           (Gather/GatherMerge nodes) — each worker runs a full Volcano subplan on its data partition.</p>
      </div>
    </div>
  `;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'Explain the Volcano/Iterator model and why it is used in most SQL databases.',
      a: 'The Volcano (iterator) model gives every operator three methods: <strong>open()</strong> initializes state and opens child operators; <strong>next()</strong> returns the next tuple (or EOF); <strong>close()</strong> releases resources and closes children. The root operator\'s next() drives execution. Advantages: (1) <strong>Memory efficiency</strong> — pipelined operators pass one tuple at a time; no intermediate results materialized unless necessary. (2) <strong>Early termination</strong> — LIMIT 10 stops after 10 next() calls, without processing remaining rows. (3) <strong>Composability</strong> — any operator can sit above any other; new operators are added by implementing the three methods. Used by PostgreSQL, MySQL, Oracle, SQL Server.',
      tip: 'Volcano = pull-based. The parent pulls from children. Contrast with push-based (Hyper, DuckDB): the leaf pushes rows up — better CPU cache behavior.',
    },
    {
      q: 'What is a blocking operator and how does it affect query latency vs throughput?',
      a: 'A blocking operator must consume its entire input before emitting any output: Sort, Hash Join (build phase), Hash Aggregation. Effect on latency: the time-to-first-row is delayed until the blocking phase completes — sorting 1 GB before returning row 1 costs seconds of latency. Effect on throughput: high (processes large batches efficiently). Non-blocking (pipelined) operators return row 1 immediately — LIMIT 1 with a pipelined plan returns in microseconds. Design implication: for interactive queries (low latency), avoid unnecessary Sort and Hash Agg; use Sort Agg on pre-sorted input and NLJ with indexes. For batch ETL (high throughput), blocking is fine.',
      tip: 'LIMIT queries benefit enormously from pipelined plans. EXPLAIN shows the actual rows returned — if a blocking sort precedes a LIMIT, the full sort still runs. Push LIMIT information into the plan to avoid unnecessary work.',
    },
    {
      q: 'How does PostgreSQL parallelize query execution?',
      a: 'PostgreSQL uses a <strong>parallel query</strong> model with a coordinator process and multiple worker processes. The plan contains a <strong>Gather</strong> or <strong>GatherMerge</strong> node that collects results from workers. Each worker runs an independent Volcano subplan on a different partition of the data (parallel SeqScan divides pages; parallel IndexScan is less common). Workers communicate via shared memory queues. Key parameters: <code>max_parallel_workers_per_gather</code> (default 2), <code>max_parallel_workers</code> (default 8), <code>parallel_setup_cost</code> (cost to start workers — 1000 units default). Joins and aggregates parallelize if the sub-plans are safe. Hash Join can split the build side across workers.',
      tip: 'For OLAP queries, parallel plans can be 4–8× faster. Monitor with EXPLAIN (ANALYZE, BUFFERS) and look for "Workers Launched" vs "Workers Planned" — discrepancy indicates max_parallel_workers is the bottleneck.',
    },
  ]);
  initIQ(container);

  return () => engine.destroy();
}
