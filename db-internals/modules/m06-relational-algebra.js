import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';

const OPS = [
  {
    symbol: 'σ', name: 'Selection',      color: '#4F46E5',
    desc: 'Filter rows that satisfy a predicate — equivalent to SQL WHERE',
    sql:   "SELECT * FROM orders WHERE status = 'shipped'",
    ra:    "σ(status='shipped')(orders)",
    result: 'Returns only tuples where status = shipped',
    icon: '🔍',
  },
  {
    symbol: 'π', name: 'Projection',     color: '#06B6D4',
    desc: 'Select specific columns — equivalent to SQL SELECT column list',
    sql:   'SELECT order_id, total FROM orders',
    ra:    'π(order_id, total)(orders)',
    result: 'Returns only the order_id and total columns (removes duplicates in theory)',
    icon: '📋',
  },
  {
    symbol: '⋈', name: 'Natural Join',   color: '#10B981',
    desc: 'Combine tuples from two relations on matching column values',
    sql:   'SELECT * FROM orders JOIN order_items ON orders.order_id = order_items.order_id',
    ra:    'orders ⋈ order_items',
    result: 'Returns all columns; tuples matched on the shared order_id attribute',
    icon: '🔗',
  },
  {
    symbol: '∪', name: 'Union',           color: '#F59E0B',
    desc: 'Combine rows from two compatible relations — equivalent to SQL UNION',
    sql:   'SELECT customer_id FROM orders UNION SELECT customer_id FROM payments',
    ra:    'π(customer_id)(orders) ∪ π(customer_id)(payments)',
    result: 'All distinct customer_ids that appear in either orders or payments',
    icon: '🔀',
  },
  {
    symbol: '−', name: 'Difference',     color: '#EF4444',
    desc: 'Rows in R1 but not in R2 — equivalent to SQL EXCEPT',
    sql:   'SELECT customer_id FROM orders EXCEPT SELECT customer_id FROM payments',
    ra:    'π(customer_id)(orders) − π(customer_id)(payments)',
    result: 'Customer IDs with an order but no matching payment (failed checkouts)',
    icon: '➖',
  },
  {
    symbol: '×', name: 'Cross Product',  color: '#8B5CF6',
    desc: 'Every tuple of R1 paired with every tuple of R2 — rarely used alone',
    sql:   'SELECT * FROM products, customers',
    ra:    'products × customers',
    result: 'All combinations: 350M products × 300M customers = 105 quadrillion rows ⚠️',
    icon: '✖️',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Foundations · M06',
    title: 'Relational Algebra',
    subtitle: 'The six core operations that every SQL query compiles down to — shown with Prime Day examples.',
    tabs: [
      { id: 'ops',    label: '➕ Core Operations' },
      { id: 'compose', label: '🔗 Composition' },
      { id: 'iq',     label: '💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  // ── Core Operations ───────────────────────────────────────────────────────
  container.querySelector('#tab-ops').innerHTML = `
    ${PRIME_SCHEMA}
    <div class="info-grid" style="padding-top:20px">
      ${OPS.map(op => `
        <div class="info-card" style="border-color:${op.color}33">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
            <div style="width:44px;height:44px;border-radius:10px;background:${op.color}22;
                        display:flex;align-items:center;justify-content:center;
                        font-size:22px;font-weight:800;color:${op.color};font-family:monospace">
              ${op.symbol}
            </div>
            <div>
              <div class="info-card-title">${op.icon} ${op.name}</div>
              <div class="info-card-body" style="margin-top:2px">${op.desc}</div>
            </div>
          </div>
          <div style="background:var(--bg3);border-radius:6px;padding:10px;font-size:11px">
            <div style="color:var(--text3);margin-bottom:4px">SQL:</div>
            <code style="color:var(--accent);word-break:break-all">${op.sql}</code>
            <div style="color:var(--text3);margin:8px 0 4px">RA notation:</div>
            <code style="color:${op.color}">${op.ra}</code>
            <div style="color:var(--text3);margin:8px 0 4px">Result:</div>
            <span style="color:var(--text2)">${op.result}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  // ── Composition ────────────────────────────────────────────────────────────
  container.querySelector('#tab-compose').innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">Composing Operations — Complex Prime Day Queries</div>
        <div class="section-desc">Relational algebra expressions compose like function calls — inner to outer</div>
      </div>
      <div class="prose">
        <h3>Query: "All shipped orders with product details"</h3>
        <div class="code-block">
<span class="cmt">-- SQL:</span>
<span class="kw">SELECT</span> o.order_id, p.name, p.price, oi.quantity
<span class="kw">FROM</span> orders o
<span class="kw">JOIN</span> order_items oi <span class="kw">ON</span> o.order_id = oi.order_id
<span class="kw">JOIN</span> products p  <span class="kw">ON</span> oi.product_id = p.product_id
<span class="kw">WHERE</span> o.status = <span class="str">'shipped'</span>

<span class="cmt">-- Relational Algebra (inner → outer):</span>
π(order_id, name, price, quantity)(
  σ(status='shipped')(orders)
  ⋈ order_items
  ⋈ products
)
        </div>

        <h3>Why This Matters for Optimization</h3>
        <p>The optimizer can reorder operations that are <strong>algebraically equivalent</strong>:</p>
        <ul>
          <li><strong>Predicate pushdown:</strong> Apply σ as early as possible to reduce rows before joining</li>
          <li><strong>Projection pushdown:</strong> Apply π early to reduce column width in intermediate results</li>
          <li><strong>Join reordering:</strong> σ(status='shipped')(orders) is much smaller than orders —
              join the filtered set first to minimise intermediate row count</li>
        </ul>

        <h3>The Three Laws the Optimizer Uses</h3>
        <p><strong>Commutativity:</strong> R ⋈ S = S ⋈ R (join order doesn't change the result)</p>
        <p><strong>Associativity:</strong> (R ⋈ S) ⋈ T = R ⋈ (S ⋈ T) (parentheses can be rearranged)</p>
        <p><strong>Distributivity:</strong> σ(p)(R ⋈ S) = σ(p)(R) ⋈ S if p only references R's attributes</p>
        <p>These three laws give the optimizer freedom to rearrange the algebra tree without changing
           the result — the key to cost-based optimization.</p>
      </div>
    </div>
  `;

  // ── Interview Q&A ─────────────────────────────────────────────────────────
  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'What is the difference between selection (σ) and projection (π)?',
      a: 'Selection filters <em>rows</em> (equivalent to WHERE): <code>σ(status=\'shipped\')</code> returns all columns but only rows matching the predicate. Projection filters <em>columns</em> (equivalent to SELECT list): <code>π(order_id, total)</code> returns all rows but only the named columns. In SQL both appear together: SELECT (projection) + WHERE (selection). The optimizer typically pushes both down to reduce data volume early.',
      tip: 'σ = row filter, π = column filter. Easy mnemonic: "S" for "select rows", "P" for "project columns".',
    },
    {
      q: 'Why is a cross product (Cartesian product) dangerous in SQL?',
      a: 'A cross product R × S produces |R| × |S| tuples. Amazon\'s products (350M) × customers (300M) = 105 quadrillion rows — impossible to materialise. A missing JOIN condition in a multi-table query silently produces a cross product. Always verify EXPLAIN output shows a join, not a Cartesian product. Use EXPLAIN ANALYZE in PostgreSQL to catch this before production.',
      tip: 'A common interview trap: <code>SELECT * FROM A, B</code> without a WHERE/ON condition is a cross product in SQL.',
    },
    {
      q: 'How does relational algebra form the basis for query optimization?',
      a: 'Relational algebra expressions are mathematically equivalent if they compute the same result. The optimizer exploits equivalence rules to rewrite an expression for lower cost: (1) push σ past ⋈ to filter early, (2) push π past ⋈ to narrow columns, (3) reorder joins via commutativity/associativity to put the smallest relation first. This works because algebra is declarative — you specify WHAT, not HOW. The optimizer is free to choose any HOW that preserves equivalence.',
      tip: 'Explain that SQL is declarative (what) while execution plan is imperative (how) — algebra bridges the two.',
    },
  ]);
  initIQ(container);

  return null;
}
