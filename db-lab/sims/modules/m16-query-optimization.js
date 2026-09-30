import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

const PIPELINE_STAGES = [
  {
    id: 'parse',    label: 'SQL String',           icon: '📝', color: '#475569',
    desc: 'Raw SQL text arrives from the application. 50-token query string.',
    output: 'String: "SELECT p.name, p.price…"',
  },
  {
    id: 'lex',      label: 'Lexer / Parser',        icon: '🔤', color: '#6366F1',
    desc: 'Tokenise the SQL string and apply grammar rules to produce a parse tree (CST).',
    output: 'CST: SelectStatement → SelectList, FromClause, WhereClause',
  },
  {
    id: 'sem',      label: 'Semantic Analyzer',     icon: '🔎', color: '#4F46E5',
    desc: 'Resolve table/column names via catalog lookup. Type check predicates. Annotate with statistics.',
    output: 'Annotated AST: typed, resolved, with row count estimates',
  },
  {
    id: 'rewrite',  label: 'Rewriter',              icon: '✏️', color: '#06B6D4',
    desc: 'Apply view expansion, rule-based rewrites, subquery flattening, DISTINCT to GROUP BY transforms.',
    output: 'Rewritten query tree — views expanded, subqueries unnested',
  },
  {
    id: 'logical',  label: 'Logical Optimizer',     icon: '📋', color: '#10B981',
    desc: 'Apply heuristic rules: predicate pushdown, projection pushdown, join reordering. Always beneficial — no cost model needed.',
    output: 'Optimized logical plan: filters at leaves, narrow projections',
  },
  {
    id: 'cost',     label: 'Cost-Based Optimizer',  icon: '💰', color: '#F59E0B',
    desc: 'Enumerate physical plan alternatives. Estimate I/O and CPU cost using statistics. Prune the search space with dynamic programming. Choose the minimum-cost plan.',
    output: 'Physical plan: IndexScan → NLJoin → Project (cost=18.41)',
  },
  {
    id: 'exec',     label: 'Executor',              icon: '▶️', color: '#8B5CF6',
    desc: 'Execute the chosen physical plan using the volcano/iterator model. Fetch pages, perform joins, apply filters, return result rows.',
    output: 'Result tuples → client (2 rows in this query)',
  },
];

const COST_EXAMPLES = [
  { op: 'SeqScan products', rows: '350M', pages: '5.25M', io: '5,250,000', cpu: '350,000,000', total: '~1,000s' },
  { op: 'IndexScan products (product_id)', rows: '1', pages: '3', io: '3', cpu: '1', total: '~0.1ms' },
  { op: 'SeqScan inventory', rows: '2.1M', pages: '110K', io: '110,000', cpu: '2,100,000', total: '~2s' },
  { op: 'IndexScan inventory (product_id)', rows: '2', pages: '4', io: '4', cpu: '2', total: '~0.1ms' },
  { op: 'Hash Join (both sides large)', rows: 'N+M', pages: 'N+M', io: '~115K', cpu: 'N+M', total: '~4s' },
  { op: 'NLJ (1 outer, index inner)', rows: '1×2', pages: '7', io: '7', cpu: '3', total: '~0.2ms' },
];

function drawPipeline(ctx, activeIdx, w, h) {
  ctx.clearRect(0, 0, w, h);
  const stageW = 100, stageH = 70, gap = 8;
  const total = PIPELINE_STAGES.length;
  const totalW = total * stageW + (total - 1) * gap;
  const startX = (w - totalW) / 2;
  const y = h / 2 - stageH / 2;

  PIPELINE_STAGES.forEach((s, i) => {
    const x = startX + i * (stageW + gap);
    const active = i === activeIdx;
    const done = i < activeIdx;

    ctx.fillStyle = active ? s.color : (done ? s.color + '44' : '#1E293B');
    ctx.strokeStyle = active ? s.color : (done ? s.color + '88' : '#334155');
    ctx.lineWidth = active ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(x, y, stageW, stageH, 8); ctx.fill(); ctx.stroke();

    ctx.fillStyle = active ? '#fff' : (done ? s.color : '#475569');
    ctx.font = '16px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(s.icon, x + stageW / 2, y + 26);
    ctx.font = (active ? '600' : '400') + ' 9px system-ui';
    ctx.fillStyle = active ? '#fff' : (done ? '#94A3B8' : '#475569');
    const words = s.label.split(' ');
    words.forEach((word, wi) => ctx.fillText(word, x + stageW / 2, y + 44 + wi * 11));
    ctx.textAlign = 'left';

    if (i < total - 1) {
      const ax = x + stageW + 2, ay = y + stageH / 2;
      ctx.strokeStyle = done ? '#4F46E5' : '#334155';
      ctx.lineWidth = done ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + gap - 2, ay); ctx.stroke();
      ctx.fillStyle = done ? '#4F46E5' : '#334155';
      ctx.beginPath(); ctx.moveTo(ax + gap - 2, ay - 3); ctx.lineTo(ax + gap + 2, ay); ctx.lineTo(ax + gap - 2, ay + 3); ctx.fill();
    }
  });

  if (activeIdx >= 0) {
    const s = PIPELINE_STAGES[activeIdx];
    ctx.fillStyle = '#1E293B';
    ctx.beginPath(); ctx.roundRect(20, h - 80, w - 40, 72, 6); ctx.fill();
    ctx.fillStyle = s.color; ctx.font = '700 11px system-ui';
    ctx.fillText(`Output: ${s.output}`, 30, h - 58);
    ctx.fillStyle = '#64748B'; ctx.font = '11px system-ui';
    const words = s.desc.split(' ');
    let line = '', cy = h - 40;
    words.forEach(word => {
      if ((line + word).length > 100) { ctx.fillText(line, 30, cy); line = word + ' '; cy += 14; } else line += word + ' ';
    });
    if (line) ctx.fillText(line, 30, cy);
  }
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Query Engine · M16',
    title: 'Query Optimization',
    subtitle: 'The full pipeline: parse → analyze → rewrite → optimize → execute. Where 880,000× speedups happen.',
    tabs: [
      { id: 'pipeline', label: '🎯 Optimizer Pipeline' },
      { id: 'cost',     label: '💰 Cost Model' },
      { id: 'iq',       label: '💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  const pipeTab = container.querySelector('#tab-pipeline');
  pipeTab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="canvas-wrap" style="margin-top:12px">
      <canvas width="800" height="320" style="width:100%;max-height:320px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="opt-explainer">
        <h3>Query Optimizer Pipeline</h3>
        <p>The 7-stage pipeline every SQL query passes through. Press <strong>Play</strong> to walk through each stage,
           from raw SQL string to result tuples. The optimizer stages (Rewriter, Logical, Cost-Based) are where
           880,000× speedups occur.</p>
      </div>
    </div>
  `;

  const canvas = pipeTab.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const engine = new SimulationEngine({
    initialState: { stage: -1 },
    steps: PIPELINE_STAGES.map((s, i) => ({ label: s.label, duration: 1800, mutate: st => { st.stage = i; } })),
    onRender: state => {
      drawPipeline(ctx, state.stage, 800, 320);
      const el = pipeTab.querySelector('#opt-explainer');
      if (el && state.stage >= 0) { const s = PIPELINE_STAGES[state.stage]; el.innerHTML = `<h3>${s.icon} ${s.label}</h3><p>${s.desc}</p>`; }
    },
  });
  SimulationEngine.renderControls(pipeTab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(pipeTab.querySelector('.canvas-wrap'), engine);
  drawPipeline(ctx, -1, 800, 320);
  engine.reset();

  container.querySelector('#tab-cost').innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">Cost Model — What the Optimizer Estimates</div>
        <div class="section-desc">PostgreSQL cost units: 1.0 = cost of reading one page sequentially from disk</div>
      </div>
      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead><tr><th>Operation</th><th>Rows Touched</th><th>Page Reads</th><th>Estimated Wall Time</th></tr></thead>
          <tbody>
            ${COST_EXAMPLES.map(r => `
              <tr>
                <td><code style="color:var(--accent)">${r.op}</code></td>
                <td>${r.rows}</td>
                <td style="${parseInt(r.pages) > 10000 ? 'color:var(--red)' : 'color:var(--green)'}">${r.pages}</td>
                <td style="font-weight:700;${r.total.includes('ms') ? 'color:var(--green)' : 'color:var(--red)'}">${r.total}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="scroll-content" style="padding-top:20px;padding-bottom:0">
        <div class="prose">
          <h3>PostgreSQL Cost Formula</h3>
          <div class="code-block">cost = (seq_page_cost × pages_seq) + (random_page_cost × pages_random)
           + (cpu_tuple_cost × rows) + (cpu_operator_cost × comparisons)

<span class="cmt">-- Default PG config values:</span>
seq_page_cost    = 1.0    <span class="cmt">-- baseline unit</span>
random_page_cost = 4.0    <span class="cmt">-- SSD: set to 1.1; HDD: keep at 4.0</span>
cpu_tuple_cost   = 0.01
cpu_operator_cost = 0.0025

<span class="cmt">-- IndexScan products on NVMe SSD:</span>
cost = 4.0 × 3 + 0.01 × 1 = 12.01 cost units ≈ 0.1ms</div>
          <h3>Why Tune random_page_cost?</h3>
          <p>The default <code>random_page_cost=4.0</code> was designed for spinning HDDs (random I/O is 40× slower than sequential).
             On NVMe SSDs, random reads are only ~2× slower than sequential. Setting <code>random_page_cost=1.1</code> on SSD clusters
             makes the optimizer prefer IndexScans more aggressively — often the right call for Prime Day-scale OLTP workloads.</p>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'What does EXPLAIN ANALYZE show and how do you use it to find bottlenecks?',
      a: '<code>EXPLAIN</code> shows the planned query tree with estimated costs and row counts. <code>EXPLAIN ANALYZE</code> actually executes the query and adds actual row counts and timing. Key things to look for: (1) <strong>Rows estimate vs actual</strong> — large discrepancies (10× off) mean stale statistics; run ANALYZE to refresh. (2) <strong>Seq Scan on large table</strong> — check if an index would help. (3) <strong>High "Rows Removed by Filter"</strong> after a Seq Scan — predicate pushdown failed; review query structure. (4) <strong>Hash Batches > 1</strong> — hash join spilled to disk; increase work_mem.',
      tip: 'Always use EXPLAIN (ANALYZE, BUFFERS) to see actual timings AND buffer hits/misses. BUFFERS shows "shared hit=X" for cache hits, "read=X" for disk reads.',
    },
    {
      q: 'What causes the query optimizer to choose a bad plan?',
      a: '(1) <strong>Stale statistics</strong> — ANALYZE has not run since a large INSERT/UPDATE. The optimizer estimates 100 rows but 10M exist — it chooses NLJ when HashJoin is cheaper. Fix: run ANALYZE or set autovacuum more aggressively. (2) <strong>Non-default statistics target</strong> — pg_statistic stores 100 histogram buckets by default. High-cardinality columns need more. Fix: ALTER TABLE products ALTER COLUMN product_id SET STATISTICS 500. (3) <strong>Correlated columns</strong> — product_id = X AND category = Y — the optimizer assumes independence but category is functionally dependent on product_id. Fix: CREATE STATISTICS for correlated columns. (4) <strong>Wrong cost parameters</strong> — random_page_cost=4.0 on an SSD cluster forces SeqScans when IndexScans are faster.',
      tip: 'The optimizer is only as good as its statistics. Monitor pg_stat_user_tables for dead tuples and autovacuum lag.',
    },
    {
      q: 'What is the difference between cost-based optimization and rule-based optimization?',
      a: '<strong>Rule-based optimization (RBO)</strong> applies a fixed set of transformation rules in a priority order — no cost estimation. Oracle used pure RBO until version 9i. Simple to implement but brittle: it can pick a bad plan when the statistics favor a different approach. <strong>Cost-based optimization (CBO)</strong> generates multiple candidate plans and uses a cost model (I/O + CPU formula with table statistics) to pick the cheapest. CBO adapts to data distribution — an IndexScan is chosen when the predicate is selective; a SeqScan when it would return > ~10% of rows (index overhead outweighs benefit). PostgreSQL is exclusively CBO (with heuristics as a pre-pass). Oracle CBO replaced RBO in 10g+.',
      tip: 'Modern databases use CBO. If an interviewer asks about RBO, mention it\'s historical — Oracle 9i vintage. CBO is the industry standard.',
    },
  ]);
  initIQ(container);

  return () => engine.destroy();
}
