import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';

const OPERATOR_MAP = [
  {
    logical: 'Scan (products)',
    physical: 'Index Scan',
    color: '#4F46E5',
    reason: "Predicate product_id = 'B08N5WRWNW' matches the PRIMARY KEY index. B+ tree lookup → 3 page reads to reach the leaf with this product_id. No full table scan needed.",
    cost: '~3 page reads',
    alt: 'SeqScan (350M rows = 42 GB) — rejected: 10,000× more expensive',
  },
  {
    logical: 'Filter (qty > 0)',
    physical: 'Filter (Index Condition Pushdown)',
    color: '#10B981',
    reason: 'An index on inventory(product_id) can include quantity. The filter qty>0 is pushed into the index scan — only matching rows are fetched from the heap. This eliminates a separate Filter node.',
    cost: 'Free — evaluated during index traversal',
    alt: 'Separate Filter node post-scan — rejected: requires fetching all rows first',
  },
  {
    logical: 'Join ⋈ product_id',
    physical: 'Nested Loop Join',
    color: '#06B6D4',
    reason: 'The outer loop has exactly 1 row (after products index scan). For 1 outer row, nested loop is always optimal — no hash table build cost, no sort cost. Inner side probes inventory by index scan.',
    cost: '1 outer × (index scan inventory) ≈ 3+k reads (k = matching rows)',
    alt: 'Hash Join — rejected: building a hash table for 1 row is wasteful overhead',
  },
  {
    logical: 'Project [name, price, qty]',
    physical: 'Result Projection',
    color: '#F59E0B',
    reason: 'Physical projection simply extracts the needed columns from the join output. No copy is needed if the parent iterator pulls columns directly from the child\'s tuple slot.',
    cost: 'Nearly free — column offset extraction',
    alt: 'N/A — projection always maps directly',
  },
];

const PLAN_VARIANTS = [
  {
    name: 'Plan A (Chosen) — Index+NLJ',
    color: '#4F46E5',
    cost: '~6 page reads total',
    good: true,
    steps: [
      'IndexScan products on product_id → 1 row (3 B+tree reads)',
      'NLJoin outer=1 row',
      'IndexScan inventory on product_id → k rows (3 + data reads)',
      'Filter qty > 0 (ICP — free)',
      'Project [name, price, qty]',
    ],
  },
  {
    name: 'Plan B — SeqScan + Hash Join',
    color: '#EF4444',
    cost: '~500,000 page reads',
    good: false,
    steps: [
      'SeqScan products → 350M rows (42 GB = ~5.25M pages)',
      'Filter product_id = B08N5W → 1 row',
      'SeqScan inventory → 2.1M rows (110K pages)',
      'Filter qty > 0 → ~2M rows',
      'HashJoin build inventory hash table, probe with products row',
      'Project [name, price, qty]',
    ],
  },
  {
    name: 'Plan C — Bitmap Index + Merge Join',
    color: '#F59E0B',
    cost: '~100 page reads',
    good: false,
    steps: [
      'Bitmap IndexScan products (product_id) → 1 TID',
      'Bitmap Heap Scan → 1 row',
      'Bitmap IndexScan inventory (product_id) → k TIDs',
      'Sort both sides on product_id',
      'Merge Join on product_id',
      'Filter qty > 0, Project [name, price, qty]',
    ],
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Query Engine · M15',
    title: 'Physical Plan',
    subtitle: 'Choosing the algorithm for each operator: IndexScan vs SeqScan, NLJoin vs HashJoin vs MergeJoin.',
    tabs: [
      { id: 'mapping', label: '⚙️ Operator Mapping' },
      { id: 'compare', label: '📊 Plan Comparison' },
      { id: 'iq',      label: '💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  container.querySelector('#tab-mapping').innerHTML = `
    ${PRIME_SCHEMA}
    <div class="scroll-content" style="padding-top:20px">
      <div class="section-header">
        <div class="section-title">Logical → Physical Operator Mapping</div>
        <div class="section-desc">For the canonical Prime Day product availability query</div>
      </div>
      <div style="display:grid;gap:16px">
        ${OPERATOR_MAP.map(op => `
          <div class="info-card" style="border-color:${op.color}33">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start">
              <div>
                <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">Logical Operator</div>
                <div style="color:var(--text2);font-size:12px;font-weight:600">${op.logical}</div>
              </div>
              <div>
                <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">Physical Operator Chosen</div>
                <div style="color:${op.color};font-size:13px;font-weight:700">${op.physical}</div>
              </div>
            </div>
            <div style="margin-top:10px;padding:10px;background:var(--bg3);border-radius:6px;font-size:11px">
              <div style="color:var(--text2);margin-bottom:6px">${op.reason}</div>
              <div style="display:flex;gap:16px;flex-wrap:wrap">
                <span><span style="color:${op.color}">Cost:</span> ${op.cost}</span>
                <span><span style="color:var(--text3)">Rejected:</span> ${op.alt}</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  container.querySelector('#tab-compare').innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">Three Plans for the Same Query</div>
        <div class="section-desc">Same result, radically different costs — the optimizer picks Plan A</div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px">
        ${PLAN_VARIANTS.map(p => `
          <div class="info-card" style="border-color:${p.color}33">
            <div style="font-size:11px;font-weight:700;color:${p.color};margin-bottom:4px">
              ${p.good ? '✅' : '❌'} ${p.name}
            </div>
            <div style="font-size:13px;font-weight:800;color:${p.good ? '#10B981' : '#EF4444'};margin-bottom:10px">${p.cost}</div>
            <ol style="margin:0;padding:0 0 0 16px;font-size:10px;color:var(--text3);line-height:1.6">
              ${p.steps.map(s => `<li>${s}</li>`).join('')}
            </ol>
          </div>
        `).join('')}
      </div>
      <div class="stats-row">
        <div class="stat-box"><div class="stat-val">6</div><div class="stat-label">Plan A page reads</div></div>
        <div class="stat-box"><div class="stat-val" style="color:var(--red)">5.3M</div><div class="stat-label">Plan B page reads</div></div>
        <div class="stat-box"><div class="stat-val">880,000×</div><div class="stat-label">Cost difference</div></div>
      </div>
      <div class="scroll-content" style="padding-top:16px;padding-bottom:0">
        <div class="prose">
          <h3>Reading an EXPLAIN Output</h3>
          <div class="code-block" style="font-size:11px">
<span class="cmt">EXPLAIN (ANALYZE, BUFFERS) SELECT p.name, p.price, i.quantity</span>
<span class="cmt">FROM products p JOIN inventory i ON p.product_id = i.product_id</span>
<span class="cmt">WHERE p.product_id = 'B08N5WRWNW' AND i.quantity > 0;</span>

Nested Loop  (cost=0.87..18.41 rows=3 width=52) (actual rows=2 loops=1)
  -&gt; Index Scan using products_pkey on products p
       (cost=0.44..8.46 rows=1 width=36) (actual rows=1 loops=1)
       Index Cond: (product_id = <span class="str">'B08N5WRWNW'</span>)
  -&gt; Index Scan using inventory_product_id_idx on inventory i
       (cost=0.43..9.91 rows=3 width=24) (actual rows=2 loops=1)
       Index Cond: (product_id = <span class="str">'B08N5WRWNW'</span>)
       Filter: (quantity &gt; 0)
Buffers: shared hit=9
          </div>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'When does the optimizer choose a Hash Join vs Nested Loop Join?',
      a: '<strong>Nested Loop Join (NLJ):</strong> Best when the outer relation is tiny (1–100 rows) and the inner has an index. Cost: outer_rows × (index_lookup_cost). For 1 outer row, NLJ is always cheapest.<br><br><strong>Hash Join:</strong> Best when both sides are large and no useful index exists on the join key. Build a hash table on the smaller side (in memory), probe with the larger side. Cost: O(|R| + |S|). Requires enough memory for the hash table — if it spills to disk, cost increases significantly.<br><br><strong>Sort-Merge Join:</strong> Best when both sides are already sorted on the join key (e.g., both have clustered indexes). Avoids the hash table; just merges two sorted streams.',
      tip: 'Rule of thumb: tiny outer + index → NLJ. Large sides, no index → Hash. Pre-sorted → Merge.',
    },
    {
      q: 'How does Index Condition Pushdown (ICP) improve performance?',
      a: 'Without ICP: the storage engine fetches the full row from the heap for every index entry that matches the indexed column predicate, then MySQL/PG applies remaining WHERE conditions at the server layer. With ICP: the WHERE conditions that reference indexed columns are evaluated inside the storage engine during index traversal — rows that fail are rejected without a heap fetch. Example: index on (product_id, quantity). ICP evaluates quantity > 0 during index traversal → only rows with quantity > 0 trigger a heap fetch. Reduces heap fetches by the fraction of rows failing the quantity predicate.',
      tip: 'ICP = filter during index scan, not after. EXPLAIN shows "Index Cond" for ICP predicates, "Filter" for post-fetch predicates.',
    },
    {
      q: 'What is a parallel query plan and when does PostgreSQL use one?',
      a: 'A parallel plan splits work across multiple worker processes. PostgreSQL uses parallel plans when: (1) the estimated sequential scan cost exceeds <code>parallel_setup_cost</code> (default 1000 cost units), and (2) the query accesses a table larger than <code>min_parallel_table_scan_size</code> (8 MB default). For our 350M-row products table, a SeqScan would use parallel workers. Our query avoids the SeqScan via IndexScan, so no parallelism is needed — single-row index lookups cannot benefit from parallelism. <code>max_parallel_workers_per_gather</code> controls the worker count (default 2).',
      tip: 'EXPLAIN ANALYZE shows "Workers Planned" and "Workers Launched" for parallel plans. A parallel SeqScan on a huge table can be 4–8× faster than serial.',
    },
  ]);
  initIQ(container);

  return null;
}
