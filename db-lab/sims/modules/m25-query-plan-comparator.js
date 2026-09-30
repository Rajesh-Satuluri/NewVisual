import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';

const SCENARIOS = [
  {
    name: 'Product Lookup (Prime Day)',
    query: "SELECT name, price FROM products WHERE product_id = 'B08N5WRWNW'",
    planA: {
      label: 'Index Scan (Chosen)',
      cost: 8.46, rows: 1, time: '0.1ms',
      good: true,
      steps: ['IndexScan on products_pkey', '→ 3 B+tree pages', '→ 1 heap fetch', 'Project [name, price]'],
    },
    planB: {
      label: 'Sequential Scan (Rejected)',
      cost: 1_250_000, rows: 350_000_000, time: '~450s',
      good: false,
      steps: ['SeqScan products', '→ 5.25M pages (42 GB)', '→ Filter product_id = …', '→ 349,999,999 rows wasted'],
    },
    winner: 'A',
    reason: 'Selectivity = 1/350M → IndexScan wins by 880,000×. random_page_cost=4 × 3 pages ≪ seq_page_cost × 5.25M pages.',
  },
  {
    name: 'Category Analytics',
    query: "SELECT category, SUM(total) FROM orders WHERE status='shipped' GROUP BY category",
    planA: {
      label: 'SeqScan + Hash Agg (Chosen)',
      cost: 420_000, rows: 70_000_000, time: '~18s',
      good: true,
      steps: ['Parallel SeqScan orders (8 workers)', '→ Filter status=shipped (~20% pass)', '→ Hash Aggregation', 'Gather Merge'],
    },
    planB: {
      label: 'Index Scan + Sort Agg (Rejected)',
      cost: 980_000, rows: 70_000_000, time: '~42s',
      good: false,
      steps: ['Bitmap IndexScan on (status)', '→ 1.4M TIDs → random heap fetches', '→ Sort by category', '→ Sort Agg'],
    },
    winner: 'A',
    reason: 'status=shipped touches 20% of rows. Random I/O for 70M rows > sequential scan cost. Parallel SeqScan wins.',
  },
  {
    name: 'Recent Orders (Range + Limit)',
    query: 'SELECT * FROM orders ORDER BY created_at DESC LIMIT 10',
    planA: {
      label: 'Index Scan Backward (Chosen)',
      cost: 90, rows: 10, time: '< 1ms',
      good: true,
      steps: ['IndexScan BACKWARD on idx_orders_created_at', '→ Leaf level, read 10 entries right to left', '→ 10 heap fetches', 'Limit 10'],
    },
    planB: {
      label: 'SeqScan + Sort + Limit (Rejected)',
      cost: 5_800_000, rows: 375_000_000, time: '~600s',
      good: false,
      steps: ['SeqScan orders (375M rows)', '→ Sort all by created_at DESC', '→ Return top 10', 'Wasted: 375M rows sorted for 10 results'],
    },
    winner: 'A',
    reason: 'LIMIT 10 + ORDER BY indexed column → backward index scan returns 10 rows instantly. Sort is O(N log N) for N=375M — catastrophic.',
  },
];

const EXPLAIN_NODES = [
  { label: 'Gather Merge', cost: '0.00..9.12', rows: 3, loops: 1, indent: 0, color: '#4F46E5' },
  { label: '→ Sort (created_at)', cost: '0.00..9.12', rows: 3, loops: 1, indent: 1, color: '#06B6D4' },
  { label: '  → Parallel Seq Scan orders', cost: '0.00..8.64', rows: 3, loops: 3, indent: 2, color: '#10B981' },
  { label: '     Filter: status = \'shipped\'', cost: null, rows: null, loops: null, indent: 3, color: '#475569' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Query Engine · M25',
    title: 'Query Plan Comparator',
    subtitle: 'Side-by-side plan comparison: why the optimizer chooses one plan and rejects another.',
    tabs: [
      { id: 'compare', label: '⚖️ Plan Comparison' },
      { id: 'explain', label: '🔍 Reading EXPLAIN' },
      { id: 'iq',      label: '💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  container.querySelector('#tab-compare').innerHTML = `
    ${PRIME_SCHEMA}
    <div class="scroll-content" style="padding-top:20px">
      <div class="section-header">
        <div class="section-title">Three Real Query Scenarios — Two Plans Each</div>
        <div class="section-desc">Understand WHY the optimizer picks each plan and by how much</div>
      </div>
      ${SCENARIOS.map(s => `
        <div style="margin-bottom:28px;padding:16px;background:var(--bg2);border-radius:10px;border:1px solid var(--border)">
          <div style="font-size:13px;font-weight:700;color:var(--text1);margin-bottom:8px">${s.name}</div>
          <div class="code-block" style="margin-bottom:12px;font-size:11px">${s.query}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
            ${[s.planA, s.planB].map((p, pi) => `
              <div style="padding:12px;background:var(--bg3);border-radius:8px;border:1px solid ${p.good ? '#10B981' : '#EF4444'}33">
                <div style="font-size:11px;font-weight:700;color:${p.good ? '#10B981' : '#EF4444'};margin-bottom:6px">
                  ${p.good ? '✅' : '❌'} Plan ${pi === 0 ? 'A' : 'B'}: ${p.label}
                </div>
                <div style="display:flex;gap:12px;margin-bottom:8px;font-size:11px">
                  <span>Cost: <strong style="color:${p.good ? 'var(--green)' : 'var(--red)'}">${p.cost.toLocaleString()}</strong></span>
                  <span>Time: <strong>${p.time}</strong></span>
                </div>
                <ol style="margin:0;padding:0 0 0 14px;font-size:10px;color:var(--text3);line-height:1.7">
                  ${p.steps.map(st => `<li>${st}</li>`).join('')}
                </ol>
              </div>
            `).join('')}
          </div>
          <div style="padding:10px;background:#4F46E5 12;border-radius:6px;font-size:11px;border-left:3px solid #4F46E5">
            <strong>Why Plan A wins:</strong> ${s.reason}
          </div>
        </div>
      `).join('')}
    </div>
  `;

  container.querySelector('#tab-explain').innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">Anatomy of EXPLAIN ANALYZE Output</div>
      </div>
      <div class="code-block" style="font-size:11px">
Gather Merge  (cost=0.00..9.12 rows=3 width=52)
              (actual time=0.042..0.052 rows=3 loops=1)
  Workers Planned: 2   Workers Launched: 2
  -&gt; Sort  (cost=0.00..9.12 rows=3 width=52)
            (actual time=0.028..0.031 rows=1 loops=3)
     Sort Key: created_at DESC
     Sort Method: quicksort  Memory: 25kB
     -&gt; Parallel Seq Scan on orders
        (cost=0.00..8.64 rows=3 width=52)
        (actual time=0.011..0.019 rows=1 loops=3)
        Filter: (status = <span class="str">'shipped'</span>)
        Rows Removed by Filter: 24
Buffers: shared hit=12 read=0
Planning Time: 0.18 ms
Execution Time: 0.21 ms
      </div>
      <div class="info-grid" style="padding-top:16px">
        ${[
          { label: 'cost=0.00..9.12', color: '#4F46E5', desc: 'Startup cost .. total cost (in pg cost units). Startup = cost to return first row. Total = cost to return all rows. Lower is better. Index scans often have high startup, low total.' },
          { label: 'rows=3', color: '#06B6D4', desc: 'ESTIMATED rows from this node. Compare to actual rows — large discrepancy (>10×) means stale statistics. Run ANALYZE to fix.' },
          { label: 'actual time=0.028..0.031', color: '#10B981', desc: 'ACTUAL wall-clock time in ms. First number = time to first row. Second = total. Only shown with ANALYZE option.' },
          { label: 'loops=3', color: '#F59E0B', desc: 'How many times this node was called. In parallel plans, each worker runs once → loops=n_workers. In NLJ inner: loops = outer row count.' },
          { label: 'Rows Removed by Filter: 24', color: '#EF4444', desc: 'Rows that failed the WHERE predicate AFTER fetching. High number here means the filter should be pushed to an index (Index Condition Pushdown).' },
          { label: 'Buffers: shared hit=12 read=0', color: '#8B5CF6', desc: '"hit" = page found in buffer pool (fast). "read" = fetched from disk (slow). Target: hit ratio > 99%. Need EXPLAIN (BUFFERS) to see this.' },
        ].map(e => `
          <div class="info-card" style="border-color:${e.color}33">
            <div style="font-family:monospace;font-size:11px;color:${e.color};font-weight:700;margin-bottom:6px">${e.label}</div>
            <div class="info-card-body">${e.desc}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'How do you use EXPLAIN to diagnose a slow query in production?',
      a: 'Step 1: Run <code>EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)</code> — captures actual timing, buffer hits, and worker info. Step 2: Look for the highest "actual time" node — that is the bottleneck. Step 3: Check "rows estimated vs actual" — large discrepancy → stale statistics → run ANALYZE. Step 4: Look for "Seq Scan on large table" — if rows returned < 1% of total, an index may be missing. Step 5: Check "Rows Removed by Filter" — high count after a Seq Scan → add an index on the filter column. Step 6: Check "Hash Batches > 1" → hash join spilled to disk → increase work_mem. Step 7: Check "Workers Launched < Workers Planned" → parallel workers hit max_parallel_workers system limit.',
      tip: 'EXPLAIN JSON format can be pasted into explain.depesz.com or explain.dalibo.com for a visual tree — faster to spot bottlenecks than raw text.',
    },
    {
      q: 'What is a "row count mismatch" in EXPLAIN ANALYZE and how do you fix it?',
      a: 'A row count mismatch occurs when the "rows=N" estimate in EXPLAIN differs significantly from "actual rows=M" in EXPLAIN ANALYZE. Causes: (1) Stale statistics — table has grown/shrunk since last ANALYZE. Fix: <code>ANALYZE table_name</code>. (2) Low statistics target — only 100 histogram buckets for a high-cardinality column. Fix: <code>ALTER TABLE t ALTER COLUMN c SET STATISTICS 500</code>. (3) Correlated columns — optimizer assumes independence. Fix: <code>CREATE STATISTICS ext_stat ON (col1, col2) FROM table</code>. (4) JSONB/array predicates — no statistics for complex type operators. Fix: use partial indexes or rewrite as a generated column.',
      tip: 'Rule of thumb: estimates within 3× are acceptable. Beyond 10× means the optimizer is flying blind and bad plans result.',
    },
    {
      q: 'What is a "plan instability" problem and how is it handled in production?',
      a: 'Plan instability occurs when the optimizer switches between two plans across executions — often because table statistics are borderline between two cost ranges. One execution uses IndexScan (fast), the next uses SeqScan (slow). Causes: autovacuum running mid-query changes reltuples estimate; or n_distinct estimate straddling a threshold. Solutions: (1) <code>pg_hint_plan</code> extension — force a specific operator: <code>/*+ IndexScan(products products_pkey) */</code>. (2) Raise <code>statistics_target</code> to stabilize estimates. (3) Partial indexes to reduce the estimate variance for specific conditions. (4) Plan-cache invalidation in app layer — force re-plan when schema changes.',
      tip: 'Plan instability is a production DBA nightmare. Monitoring: track slow query log + pg_stat_statements — the same query with bimodal response time distribution signals plan instability.',
    },
  ]);
  initIQ(container);

  return null;
}
