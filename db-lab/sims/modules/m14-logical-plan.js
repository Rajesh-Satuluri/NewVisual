import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

const PLAN_STEPS = [
  {
    label: 'Initial Logical Plan (naive)',
    desc: 'The annotated AST maps directly to a naive logical plan: Filter AFTER Join AFTER two full scans. This is correct but inefficient — it joins all rows first, then filters.',
    nodes: [
      { id: 'proj',   label: 'Project\n[name, price, qty]', x: 400, y: 40,  color: '#06B6D4' },
      { id: 'filter', label: 'Filter\nproduct_id=B08N5W ∧ qty>0', x: 400, y: 130, color: '#EF4444' },
      { id: 'join',   label: 'Join ⋈\nproduct_id',          x: 400, y: 220, color: '#10B981' },
      { id: 'scanP',  label: 'Scan\nproducts (350M rows)', x: 280, y: 310, color: '#F59E0B' },
      { id: 'scanI',  label: 'Scan\ninventory (2.1M rows)', x: 520, y: 310, color: '#F59E0B' },
    ],
    edges: [['proj','filter'],['filter','join'],['join','scanP'],['join','scanI']],
    cost: '❌ Naive cost: 350M × 2.1M rows at join → filter to 1 row',
  },
  {
    label: 'Rule 1: Predicate Pushdown',
    desc: 'The optimizer applies the distributivity rule: σ(p.product_id=x)(products ⋈ inventory) = σ(p.product_id=x)(products) ⋈ inventory. Push p.product_id predicate below the join, onto the products scan.',
    nodes: [
      { id: 'proj',   label: 'Project\n[name, price, qty]', x: 400, y: 40,  color: '#06B6D4' },
      { id: 'filter_i', label: '✅ Filter\nqty > 0',       x: 520, y: 130, color: '#EF4444' },
      { id: 'join',   label: 'Join ⋈\nproduct_id',         x: 400, y: 220, color: '#10B981' },
      { id: 'filter_p', label: '✅ Filter\nproduct_id=B08N5W', x: 280, y: 130, color: '#4F46E5' },
      { id: 'scanP',  label: 'Scan\nproducts',             x: 280, y: 310, color: '#F59E0B' },
      { id: 'scanI',  label: 'Scan\ninventory',            x: 520, y: 310, color: '#F59E0B' },
    ],
    edges: [['proj','join'],['proj','filter_i'],['filter_i','scanI'],['join','filter_p'],['join','filter_i'],['filter_p','scanP']],
    cost: '↓ After pushdown: 1 row × filtered_inventory rows — much smaller join',
  },
  {
    label: 'Rule 2: Projection Pushdown',
    desc: 'Push π down to eliminate unused columns early. Products only needs name, price, product_id. Inventory only needs quantity, product_id. Smaller row width = fewer bytes to move through the join.',
    nodes: [
      { id: 'proj',    label: 'Project [name,price,qty]', x: 400, y: 40,  color: '#06B6D4' },
      { id: 'join',    label: 'Join ⋈\nproduct_id',       x: 400, y: 130, color: '#10B981' },
      { id: 'πP',      label: '✅ Project\n[name,price,pid]', x: 270, y: 220, color: '#06B6D4' },
      { id: 'πI',      label: '✅ Project\n[qty,pid]',     x: 530, y: 220, color: '#06B6D4' },
      { id: 'filter_p',label: 'Filter pid=B08N5W',         x: 270, y: 310, color: '#4F46E5' },
      { id: 'filter_i',label: 'Filter qty>0',              x: 530, y: 310, color: '#EF4444' },
      { id: 'scanP',   label: 'Scan products',             x: 270, y: 390, color: '#F59E0B' },
      { id: 'scanI',   label: 'Scan inventory',            x: 530, y: 390, color: '#F59E0B' },
    ],
    edges: [['proj','join'],['join','πP'],['join','πI'],['πP','filter_p'],['πI','filter_i'],['filter_p','scanP'],['filter_i','scanI']],
    cost: '↓ Narrower tuples flowing up the tree — less memory, less CPU for join comparisons',
  },
  {
    label: 'Optimized Logical Plan',
    desc: 'Final logical plan after algebraic rewrites: filters pushed to leaves, projections narrowed, join sees minimal data. This is a logical plan — physical operators (HashJoin vs NLJoin, IndexScan vs SeqScan) are chosen next.',
    nodes: [
      { id: 'proj',    label: 'Project [name,price,qty]', x: 400, y: 40,  color: '#06B6D4' },
      { id: 'join',    label: 'Join ⋈ product_id',        x: 400, y: 120, color: '#10B981' },
      { id: 'σP',      label: 'σ pid=B08N5W\n~1 row',     x: 250, y: 210, color: '#4F46E5' },
      { id: 'σI',      label: 'σ qty>0\n~2M rows',        x: 550, y: 210, color: '#EF4444' },
      { id: 'scanP',   label: 'products',                  x: 250, y: 300, color: '#F59E0B' },
      { id: 'scanI',   label: 'inventory',                 x: 550, y: 300, color: '#F59E0B' },
    ],
    edges: [['proj','join'],['join','σP'],['join','σI'],['σP','scanP'],['σI','scanI']],
    cost: '✅ Optimized: 1 row ⋈ ~2M rows → join result ≈ 1 row (if product in stock)',
  },
];

function drawPlan(ctx, stepIdx, w, h) {
  ctx.clearRect(0, 0, w, h);
  if (stepIdx < 0) {
    ctx.fillStyle = '#475569'; ctx.font = '13px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('Press Play to watch the logical plan transform', w/2, h/2);
    ctx.textAlign = 'left'; return;
  }
  const step = PLAN_STEPS[stepIdx];
  const nodeMap = {};
  step.nodes.forEach(n => { nodeMap[n.id] = n; });

  step.edges.forEach(([a, b]) => {
    const na = nodeMap[a], nb = nodeMap[b];
    if (!na || !nb) return;
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.5; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(na.x, na.y + 18); ctx.lineTo(nb.x, nb.y - 18); ctx.stroke();
  });

  step.nodes.forEach(n => {
    const lines = n.label.split('\n');
    const bw = Math.max(...lines.map(l => l.length)) * 6.5 + 24;
    const bh = lines.length > 1 ? 42 : 28;
    const isNew = n.label.startsWith('✅');
    ctx.fillStyle = isNew ? n.color : n.color + '22';
    ctx.strokeStyle = n.color;
    ctx.lineWidth = isNew ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(n.x - bw/2, n.y - bh/2, bw, bh, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = isNew ? '#fff' : '#94A3B8';
    ctx.font = (isNew ? '600' : '400') + ' 10px system-ui';
    ctx.textAlign = 'center';
    lines.forEach((l, i) => ctx.fillText(l, n.x, n.y - (lines.length-1)*7 + i*14 + 4));
    ctx.textAlign = 'left';
  });

  ctx.fillStyle = step.cost.startsWith('✅') ? '#10B981' : step.cost.startsWith('❌') ? '#EF4444' : '#F59E0B';
  ctx.font = '11px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(step.cost, w/2, h - 14);
  ctx.textAlign = 'left';
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Query Engine · M14',
    title: 'Logical Plan',
    subtitle: 'The relational algebra tree after semantic analysis — before physical operators are chosen.',
    tabs: [
      { id: 'plan',    label: '📋 Plan Rewrites' },
      { id: 'rules',   label: '📐 Rewrite Rules' },
      { id: 'iq',      label: '💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  const planTab = container.querySelector('#tab-plan');
  planTab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="canvas-wrap" style="margin-top:12px">
      <canvas width="800" height="430" style="width:100%;max-height:430px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="plan-explainer">
        <h3>Logical Plan Optimizer</h3>
        <p>The logical plan starts as a direct translation of the SQL.
           The optimizer applies algebraic rewrite rules — predicate pushdown,
           projection pushdown — to reduce the data flowing through each node.
           Press <strong>Play</strong> to watch each rewrite.</p>
      </div>
    </div>
  `;

  const canvas = planTab.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const engine = new SimulationEngine({
    initialState: { step: -1 },
    steps: PLAN_STEPS.map((s, i) => ({ label: s.label, duration: 2400, mutate: st => { st.step = i; } })),
    onRender: state => {
      drawPlan(ctx, state.step, 800, 430);
      const el = planTab.querySelector('#plan-explainer');
      if (el && state.step >= 0) { const s = PLAN_STEPS[state.step]; el.innerHTML = `<h3>${s.label}</h3><p>${s.desc}</p>`; }
    },
  });
  SimulationEngine.renderControls(planTab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(planTab.querySelector('.canvas-wrap'), engine);
  drawPlan(ctx, -1, 800, 430);
  engine.reset();

  container.querySelector('#tab-rules').innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">Algebraic Rewrite Rules</div>
        <div class="section-desc">Rules the optimizer applies to transform equivalent logical plans</div>
      </div>
      <div class="info-grid">
        ${[
          { name: 'Predicate Pushdown', color: '#4F46E5', icon: '⬇️',
            rule: 'σ(p)(R ⋈ S) = σ(p)(R) ⋈ S — if p references only R',
            why: 'Filter early → fewer rows reach the join = dramatically lower cost',
            example: 'Move product_id=B08N5W from after join to before join on products side' },
          { name: 'Projection Pushdown', color: '#06B6D4', icon: '✂️',
            rule: 'π(A)(R ⋈ S) = π(A∩R)(R) ⋈ π(A∩S)(S) — only keep columns needed',
            why: 'Narrower tuples → less memory, faster join comparisons, less I/O',
            example: 'products only needs name, price, product_id — drop all other columns early' },
          { name: 'Join Commutativity', color: '#10B981', icon: '↔️',
            rule: 'R ⋈ S = S ⋈ R — result is the same regardless of order',
            why: 'Puts smaller relation on the build side (for hash join) or outer loop (for NLJ)',
            example: 'If products is filtered to 1 row, put it as the build side of the hash join' },
          { name: 'Join Associativity', color: '#F59E0B', icon: '🔄',
            rule: '(R ⋈ S) ⋈ T = R ⋈ (S ⋈ T) — parentheses can move',
            why: 'Enables optimal join ordering for multi-table queries',
            example: 'In a 3-table query: join products ⋈ order_items first, then ⋈ orders' },
          { name: 'Duplicate Elimination', color: '#8B5CF6', icon: '🔁',
            rule: 'δ(σ(p)(R)) = σ(p)(δ(R)) — DISTINCT can move below filter',
            why: 'Fewer distinct values to compute deduplication over',
            example: 'SELECT DISTINCT product_id WHERE qty>0 — filter first, then dedup' },
          { name: 'Subquery Flattening', color: '#EF4444', icon: '🌊',
            rule: 'WHERE EXISTS (subquery) → semi-join ⊳, WHERE IN → anti-join if NOT',
            why: 'Semi-joins avoid materializing the subquery result for each outer row',
            example: 'EXISTS (SELECT 1 FROM inventory WHERE qty>0) → inner join with dedup' },
        ].map(r => `
          <div class="info-card" style="border-color:${r.color}33">
            <div class="info-card-title" style="color:${r.color}">${r.icon} ${r.name}</div>
            <div style="font-family:monospace;font-size:10px;color:#64748B;margin:6px 0;padding:6px;background:var(--bg3);border-radius:4px">${r.rule}</div>
            <div class="info-card-body" style="margin-bottom:6px"><strong>Why:</strong> ${r.why}</div>
            <div style="font-size:11px;color:var(--accent)">Example: ${r.example}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'What is a logical plan and how does it differ from a physical plan?',
      a: 'A <strong>logical plan</strong> describes WHAT data operations to perform using relational algebra operators (Join, Filter, Project). It is implementation-independent: it says "join products and inventory" without specifying HOW to join (hash, nested loop, sort-merge). A <strong>physical plan</strong> specifies the exact algorithm for each operator: HashJoin, NestedLoopJoin, IndexScan, SeqScan. The logical plan is an algebra tree; the physical plan is an executable tree of code paths.',
      tip: 'Logical = what (algebra). Physical = how (algorithms + access methods).',
    },
    {
      q: 'Why is predicate pushdown the most impactful logical rewrite?',
      a: 'The cost of a join is proportional to the sizes of its inputs. Moving a filter from ABOVE a join to BELOW it reduces the input size before the join executes. For the Prime Day query: without pushdown, the join sees 350M × 2.1M row pairs. With pushdown (filter products first), the join sees 1 × 2.1M. The algebraic justification is distributivity: σ(p)(R ⋈ S) = σ(p)(R) ⋈ S when predicate p only references attributes from R. The optimizer verifies the predicate references before applying the rule.',
      tip: 'EXPLAIN ANALYZE in PostgreSQL shows filter pushdown. Look at "Rows Removed by Filter" at each node — high numbers above a join means pushdown did not occur.',
    },
    {
      q: 'What is heuristic optimization vs cost-based optimization?',
      a: '<strong>Heuristic optimization</strong> applies algebraic rewrite rules unconditionally because they are almost always beneficial: predicate pushdown (always filter early), projection pushdown (always narrow early), subquery flattening (almost always better). These do not require statistics and run in O(n) time. <strong>Cost-based optimization</strong> enumerates alternative physical plans (HashJoin vs NLJoin vs Sort-Merge, SeqScan vs IndexScan) and uses statistics to estimate I/O and CPU cost for each. The cheapest plan wins. Heuristics run first to simplify the plan, then cost-based picks the physical operators.',
      tip: 'Rule of thumb: logical plan = heuristics applied. Physical plan = cost-based choice. Both happen inside the optimizer.',
    },
  ]);
  initIQ(container);

  return () => engine.destroy();
}
