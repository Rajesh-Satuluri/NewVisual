import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

/* ── Plan tree data ──────────────────────────────────────────────────────── */
// A query plan tree for: SELECT o.order_id, c.name, SUM(oi.price)
//   FROM orders o JOIN customers c ON o.customer_id=c.id
//   JOIN order_items oi ON oi.order_id=o.order_id
//   WHERE o.order_date > '2025-07-01' GROUP BY o.order_id, c.name
const PLAN_NODES = [
  {
    id:'agg', type:'Finalize GroupAggregate', cost:'1200..1450', rows:50000, actual:48200,
    width:40, x:0.5, y:0.05, color:'#A78BFA',
    detail:'GroupAggregate: SUM(oi.price) grouped by order_id, c.name. Needs sorted input.',
  },
  {
    id:'sort', type:'Sort', cost:'900..950', rows:200000, actual:195000,
    width:40, x:0.5, y:0.24, color:'#F59E0B',
    detail:'Sort by order_id, c.name. Uses external merge sort (exceeded work_mem). Spilled to disk!',
    warn:true,
  },
  {
    id:'hash_join', type:'Hash Join', cost:'400..800', rows:200000, actual:195000,
    width:40, x:0.5, y:0.43, color:'#06B6D4',
    detail:'Hash Join on o.order_id = oi.order_id. Outer: orders_join. Inner: order_items (hash table).',
  },
  {
    id:'nl_join', type:'Nested Loop', cost:'100..300', rows:80000, actual:77500,
    width:40, x:0.3, y:0.62, color:'#818CF8',
    detail:'Nested Loop: orders × customers. For each order row, look up customer by index.',
  },
  {
    id:'idx_scan', type:'Index Scan', cost:'0.29..2.1', rows:80000, actual:77500,
    width:40, x:0.18, y:0.80, color:'#10B981',
    detail:'Index Scan on orders using orders_order_date_idx. Filter: order_date > 2025-07-01.',
  },
  {
    id:'idx_cust', type:'Index Scan', cost:'0.29..0.31', rows:1, actual:1,
    width:40, x:0.42, y:0.80, color:'#10B981',
    detail:'Index Scan on customers using customers_pkey. Lookup by customer_id for each order.',
  },
  {
    id:'seq_items', type:'Seq Scan', cost:'200..600', rows:3000000, actual:2980000,
    width:40, x:0.72, y:0.62, color:'#EF4444',
    detail:'Sequential Scan on order_items: 3M rows. No index available for this join. Consider adding an index on order_items(order_id).',
    warn:true,
  },
];

const PLAN_EDGES = [
  ['agg','sort'],['sort','hash_join'],
  ['hash_join','nl_join'],['hash_join','seq_items'],
  ['nl_join','idx_scan'],['nl_join','idx_cust'],
];

const EA_STEPS = [
  {
    activeNode: null, phase:'overview',
    desc: 'EXPLAIN ANALYZE shows the actual execution plan with timing and row counts. Each node is a plan step — read the plan bottom-up (leaves execute first). Arrows show data flowing upward.',
  },
  {
    activeNode:'idx_scan', phase:'scan',
    desc: 'Leaf node: Index Scan on orders. orders_order_date_idx prunes most of the table. Actual rows (77,500) closely matches estimated rows (80,000) — good statistics. Execution starts here.',
  },
  {
    activeNode:'idx_cust', phase:'scan',
    desc: 'Second leaf: Index Scan on customers via primary key. Each of the 77,500 order rows triggers one index lookup into customers. Actual=1 row per lookup — perfect index usage.',
  },
  {
    activeNode:'nl_join', phase:'join',
    desc: 'Nested Loop joins orders + customers. 77,500 outer rows × 1 inner row each = 77,500 result rows. Cheap because the inner side uses an index — O(outer × log(inner)) complexity.',
  },
  {
    activeNode:'seq_items', phase:'scan',
    desc: 'WARNING: Sequential Scan on order_items (3M rows). No index for the join — the planner chose to build a hash table of order_items and probe it. Adding an index on order_items(order_id) could eliminate this full scan.',
  },
  {
    activeNode:'hash_join', phase:'join',
    desc: 'Hash Join: build a hash table from order_items (3M rows), then probe with each orders row. The hash table may spill to disk if 3M rows exceed work_mem. Result: 195,000 matching rows.',
  },
  {
    activeNode:'sort', phase:'sort',
    desc: 'WARNING: Sort node spilled to disk (external merge sort). Input (195K rows) exceeded work_mem (default 4 MB). Increase work_mem to 64–256 MB for this query to sort in RAM — eliminates disk I/O here.',
  },
  {
    activeNode:'agg', phase:'agg',
    desc: 'GroupAggregate: final SUM aggregation over sorted groups. Produces 48,200 distinct (order_id, customer) combinations. This is the query result returned to the client.',
  },
];

/* ── Canvas ──────────────────────────────────────────────────────────────────*/
function drawExplain(ctx, stepIdx, w, h) {
  const step = EA_STEPS[stepIdx];
  ctx.clearRect(0, 0, w, h);

  const nodeW = 150, nodeH = 44;

  // draw edges first
  PLAN_EDGES.forEach(([fromId, toId]) => {
    const from = PLAN_NODES.find(n => n.id === fromId);
    const to   = PLAN_NODES.find(n => n.id === toId);
    const fx = from.x * w, fy = from.y * h + nodeH;
    const tx = to.x * w,   ty = to.y * h;
    ctx.strokeStyle = '#1E3A5F'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
  });

  // draw nodes
  PLAN_NODES.forEach(n => {
    const nx = n.x * w - nodeW / 2, ny = n.y * h;
    const isActive = step.activeNode === n.id;
    const c = n.color;

    ctx.fillStyle = isActive ? c + '44' : (n.warn ? '#1C0A0A' : '#0F172A');
    ctx.strokeStyle = isActive ? c : (n.warn ? '#7F1D1D' : '#334155');
    ctx.lineWidth = isActive ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(nx, ny, nodeW, nodeH, 4); ctx.fill(); ctx.stroke();

    ctx.fillStyle = isActive ? c : '#94A3B8';
    ctx.font = '700 9px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(n.type, n.x * w, ny + 14);
    ctx.fillStyle = '#64748B'; ctx.font = '8px system-ui';
    ctx.fillText(`est ${n.rows.toLocaleString()} → actual ${n.actual.toLocaleString()}`, n.x * w, ny + 26);
    ctx.fillStyle = '#475569'; ctx.font = '8px monospace';
    ctx.fillText(`cost: ${n.cost}`, n.x * w, ny + 37);

    if (n.warn && !isActive) {
      ctx.fillStyle = '#EF4444'; ctx.font = '700 9px system-ui';
      ctx.fillText('⚠', n.x * w + nodeW/2 - 8, ny + 10);
    }
  });
  ctx.textAlign = 'left';
}

/* ── Reading EXPLAIN tab ────────────────────────────────────────────────────*/
function renderReadingTab(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-family:system-ui;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="margin:0 0 14px;color:#E2E8F0;font-size:15px">How to Read EXPLAIN ANALYZE</h3>
  <pre style="background:#0F172A;border:1px solid #1E293B;border-radius:6px;padding:12px;font-size:10.5px;color:#94A3B8;overflow-x:auto;margin-bottom:16px">
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT ...;

Finalize GroupAggregate  (cost=1200..1450 rows=50000) <span style="color:#A78BFA">(actual time=420..510 rows=48200 loops=1)</span>
  ->  Sort  (cost=900..950 rows=200000) <span style="color:#EF4444">(actual time=210..240 rows=195000 loops=1)</span>
        Sort Key: o.order_id, c.name
        Sort Method: external merge  Disk: 24576kB  <span style="color:#EF4444">← spilled to disk!</span>
    ->  Hash Join  (cost=400..800 rows=200000) (actual time=120..180 rows=195000 loops=1)
          Hash Cond: (oi.order_id = o.order_id)
          ->  Seq Scan on order_items  <span style="color:#EF4444">(actual time=0.1..60 rows=2980000 loops=1)</span>
          ->  Nested Loop  (actual time=5..80 rows=77500 loops=1)
                ->  Index Scan on orders using orders_order_date_idx
                      Filter: (order_date > '2025-07-01')
                      Rows Removed by Filter: 22500
                ->  Index Scan on customers using customers_pkey
                      Index Cond: (id = o.customer_id)

Planning Time: 3.2 ms
Execution Time: 520.4 ms
</pre>

  <h3 style="margin:0 0 12px;color:#E2E8F0;font-size:15px">Key Fields to Look For</h3>
  <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:20px">
    <thead><tr style="background:#0F172A"><th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Field</th><th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">What it tells you</th></tr></thead>
    <tbody>
      ${[
        ['actual rows vs estimated rows','Large discrepancy = stale statistics. Run ANALYZE to fix.'],
        ['Sort Method: external merge','Sort spilled to disk. Increase work_mem for this session.'],
        ['Seq Scan on large table','Missing index. Consider adding one on the filter/join column.'],
        ['Rows Removed by Filter','High value = index is not selective enough; bloom filter may help.'],
        ['Buffers: hit / read','hit = from shared_buffers; read = from disk. Low hit rate = undersized shared_buffers.'],
        ['loops','Node executed N times. Cost and rows are per-loop; actual total = rows × loops.'],
      ].map(([f,d]) => `<tr style="border-bottom:1px solid #0F172A"><td style="padding:7px 10px;color:#F59E0B;font-family:monospace;font-size:10.5px">${f}</td><td style="padding:7px 10px">${d}</td></tr>`).join('')}
    </tbody>
  </table>

  <div style="background:#071C10;border:1px solid #065F46;border-radius:6px;padding:14px;font-size:12px">
    <strong style="color:#10B981">Prime Day tip:</strong> Run <code>EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)</code> for machine-readable output. Feed it to <a href="https://explain.dalibo.com" style="color:#818CF8">explain.dalibo.com</a> or Metabase for visual plan diffing before and after index changes.
  </div>
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'How do you identify the bottleneck in a slow query using EXPLAIN ANALYZE?',
      a: `Look for the node with the highest <strong>actual time</strong>. In EXPLAIN ANALYZE output, each node shows <code>(actual time=start..end rows=N loops=L)</code>. The end time minus start time, multiplied by loops, gives the total time spent in that node. A sequential scan on a large table, a sort with "external merge" (disk spill), or a nested loop with many loops are the most common bottlenecks.<br><br>
Second signal: large discrepancy between estimated and actual row counts. If the planner estimated 100 rows but actually got 100,000, join order and algorithm choice are probably wrong — the fix is fresher statistics (ANALYZE) or table statistics targets (ALTER TABLE t ALTER COLUMN c SET STATISTICS 500).`,
    },
    {
      q: 'What does "Seq Scan on large table" in a query plan tell you, and how do you fix it?',
      a: `A sequential scan reads every page of the table from start to finish — O(table size) I/O regardless of selectivity. It appears when: (1) no usable index exists on the filter column; (2) an index exists but the planner estimates a seq scan is cheaper (e.g., the query returns >10–15% of rows — index overhead exceeds sequential read benefit); (3) the WHERE clause uses a function that prevents index use (<code>WHERE date_trunc('day', created_at) = today</code> instead of <code>WHERE created_at >= today AND created_at < today+1</code>).<br><br>
Fix: create an index on the filter column. Verify it's used with <code>SET enable_seqscan=off</code> in a test session — this forces index use; if the index scan is still fast, the planner's cost model was wrong. Adjust <code>random_page_cost</code> (default 4.0; set to 1.1 for SSDs) so the planner accurately weights random I/O.`,
    },
    {
      q: 'How does work_mem affect query performance, and what are the tradeoffs of increasing it?',
      a: `<code>work_mem</code> is the amount of RAM each <strong>sort or hash operation</strong> can use before spilling to disk. With 4 MB (default), a Sort node processing 200MB of data spills to disk and uses merge sort — potentially 10–50× slower than an in-memory sort. Increasing work_mem eliminates the disk spill.<br><br>
The critical caveat: work_mem is per-operation, not per-session. A single query with 3 Sort nodes uses up to 3 × work_mem. With 200 active connections each running complex queries, total RAM usage = 200 × 3 × work_mem = 200 × 3 × 256 MB = 150 GB. Setting work_mem globally to a large value can cause OOM.<br><br>
Best practice: keep global work_mem low (4–16 MB). For specific heavy queries run by known sessions (analytics, reporting), set it per-session: <code>SET work_mem='256MB'</code>. On Prime Day, increase it for the analytics replica only.`,
    },
  ]);
}

export function mount(container) {
  const shell = createModuleShell(container, {
    tag: 'Performance',
    title: 'EXPLAIN ANALYZE',
    subtitle: 'Reading PostgreSQL query plans — node types, cost estimation, and how to spot bottlenecks',
    tabs: [
      { id:'anim',    label:'Plan Explorer' },
      { id:'reading', label:'Reading EXPLAIN' },
      { id:'iq',      label:'Interview Q&A' },
    ],
  });
  const { tabs, body } = shell;
  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:340px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);
      const steps = EA_STEPS.map((s,i) => ({ label:`Step ${i+1}`, duration:2800, mutate: st=>{ st.stepIdx=i; } }));
      const engine = new SimulationEngine({
        initialState:{stepIdx:0}, steps,
        onRender:(state,cnv) => {
          const ctx=cnv.getContext('2d'),pr=window.devicePixelRatio||1;
          cnv.width=cnv.clientWidth*pr; cnv.height=cnv.clientHeight*pr; ctx.scale(pr,pr);
          drawExplain(ctx, state.stepIdx, cnv.clientWidth, cnv.clientHeight);
        },
      });
      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));
      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);
      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = EA_STEPS[i].desc; });
      desc.textContent = EA_STEPS[0].desc;
      return () => engine.destroy();
    },
    reading: renderReadingTab,
    iq:      renderIQ,
  });
  return null;
}
