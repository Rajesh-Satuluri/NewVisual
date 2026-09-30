import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Foundations · M05',
    title: 'The Relational Model',
    subtitle: 'Codd\'s 1970 model — relations, tuples, domains — and how it maps to Amazon\'s Prime Day order database.',
    tabs: [
      { id: 'schema',  label: '📊 Schema Explorer' },
      { id: 'theory',  label: '📐 Mathematical Basis' },
      { id: 'iq',      label: '💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  // ── Schema Explorer ────────────────────────────────────────────────────────
  container.querySelector('#tab-schema').innerHTML = `
    ${PRIME_SCHEMA}
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">Prime Day Schema — 6 Relations</div>
        <div class="section-desc">Click a table to see its relation structure</div>
      </div>

      ${[
        {
          name: 'products', pk: 'product_id', color: '#4F46E5',
          cols: [
            ['product_id', 'VARCHAR(20)', 'PRIMARY KEY — uniquely identifies each product'],
            ['name',       'VARCHAR(255)','Product name visible on the detail page'],
            ['category',   'VARCHAR(50)', 'Electronics, Clothing, etc. — used for Browse'],
            ['price',      'DECIMAL(10,2)','Listed price in USD — may differ from paid price'],
          ],
          sample: [
            ['B08N5WRWNW', 'Fire TV Stick 4K', 'Electronics', '49.99'],
            ['B07XJ8C8F5', 'Echo Dot (3rd Gen)', 'Electronics', '39.99'],
            ['B09B8YKGYP', 'AmazonBasics USB-C Cable', 'Electronics', '8.99'],
          ]
        },
        {
          name: 'orders', pk: 'order_id', color: '#06B6D4',
          cols: [
            ['order_id',    'BIGINT',      'PRIMARY KEY — auto-incremented 64-bit integer'],
            ['customer_id', 'BIGINT',      'FOREIGN KEY → customers(customer_id)'],
            ['total',       'DECIMAL(10,2)','Sum of order_items.unit_price × quantity'],
            ['status',      'ENUM',        'pending | processing | shipped | delivered | cancelled'],
            ['created_at',  'TIMESTAMP',   'UTC timestamp of order placement'],
          ],
          sample: [
            ['10000001', '5001', '49.99', 'shipped', '2024-07-16 09:14:22'],
            ['10000002', '5002', '88.98', 'delivered', '2024-07-16 09:15:01'],
          ]
        },
      ].map(tbl => `
        <div style="margin-bottom:28px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <span style="font-family:monospace;font-size:14px;font-weight:700;color:${tbl.color}">${tbl.name}</span>
            <span class="module-tag" style="border-color:${tbl.color};color:${tbl.color}">PK: ${tbl.pk}</span>
          </div>
          <div class="compare-table-wrap" style="padding:0">
            <table class="compare-table" style="margin-bottom:8px">
              <thead><tr><th>Column</th><th>Type</th><th>Description</th></tr></thead>
              <tbody>
                ${tbl.cols.map(([c,t,d]) => `<tr><td><code style="color:${tbl.color}">${c}</code></td><td><code>${t}</code></td><td>${d}</td></tr>`).join('')}
              </tbody>
            </table>
          </div>
          <div style="font-size:11px;color:var(--text3);margin-bottom:4px;padding:0 2px">Sample tuples:</div>
          <div class="compare-table-wrap" style="padding:0">
            <table class="compare-table">
              <thead><tr>${tbl.cols.map(([c]) => `<th>${c}</th>`).join('')}</tr></thead>
              <tbody>
                ${tbl.sample.map(row => `<tr>${row.map(v => `<td><code style="color:var(--text2);font-size:11px">${v}</code></td>`).join('')}</tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  // ── Mathematical Basis ────────────────────────────────────────────────────
  container.querySelector('#tab-theory').innerHTML = `
    <div class="scroll-content">
      <div class="prose">
        <h3>Codd's 12 Rules (simplified)</h3>
        <p>E.F. Codd defined the relational model in 1970. The key mathematical concepts:</p>
        <ul>
          <li><strong>Relation:</strong> A set of tuples — no duplicates, no ordering (sets, not lists)</li>
          <li><strong>Tuple:</strong> An ordered list of attribute values — one row in a table</li>
          <li><strong>Domain:</strong> The set of valid values for an attribute (e.g., status ∈ {pending, shipped, …})</li>
          <li><strong>Schema:</strong> R(A₁:D₁, A₂:D₂, …Aₙ:Dₙ) — relation name + attribute + domain tuples</li>
          <li><strong>Key:</strong> A minimal set of attributes that uniquely identifies a tuple (PRIMARY KEY)</li>
          <li><strong>Foreign Key:</strong> An attribute whose values must appear as a key in another relation</li>
        </ul>

        <h3>Formal Notation → Prime Day Example</h3>
        <p><code>orders(order_id: BIGINT, customer_id: BIGINT, total: DECIMAL, status: ENUM, created_at: TS)</code></p>
        <p>A tuple in orders: <code>(10000001, 5001, 49.99, 'shipped', '2024-07-16 09:14:22')</code></p>
        <p>The schema guarantees: every order_id is unique, every customer_id references a valid customer,
           and status ∈ {pending, processing, shipped, delivered, cancelled}.</p>

        <h3>Why "Set" Semantics Matter</h3>
        <p>SQL results are <em>multisets</em> (bags) — duplicates are allowed unless you use DISTINCT or GROUP BY.
           The mathematical relational model uses pure sets. This distinction matters for correctness:
           <code>SELECT customer_id FROM orders</code> returns duplicates; add DISTINCT to get a set.</p>

        <h3>Integrity Constraints in Prime Day</h3>
        <p><strong>Entity integrity:</strong> No PRIMARY KEY value may be NULL — every order has an order_id.</p>
        <p><strong>Referential integrity:</strong> Every order.customer_id must exist in customers.customer_id.
           Amazon's checkout validates this before inserting to prevent orphaned orders.</p>
        <p><strong>Domain integrity:</strong> price must be ≥ 0. A CHECK constraint enforces this at the DB level.</p>
      </div>
    </div>
  `;

  // ── Interview Q&A ─────────────────────────────────────────────────────────
  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'What is the difference between a primary key and a unique constraint?',
      a: 'Both enforce uniqueness, but: (1) A table can have only one PRIMARY KEY but multiple UNIQUE constraints. (2) PRIMARY KEY columns cannot be NULL; UNIQUE allows NULL values (and multiple NULL rows in some DBs — NULL ≠ NULL). (3) PRIMARY KEY automatically gets a clustered B+ tree index in most DBs; UNIQUE gets a non-clustered index. In orders, order_id is the PK; customer email might have a UNIQUE constraint.',
      tip: 'In PostgreSQL, NULL in a UNIQUE column is allowed and multiple NULLs are permitted — this trips up many candidates.',
    },
    {
      q: 'Explain first, second, and third normal form with a Prime Day example.',
      a: '<strong>1NF:</strong> All column values are atomic (no arrays/sets). ❌ Violates: storing "item1,item2" in an order column. ✅ Fix: separate order_items table.<br><br><strong>2NF:</strong> Non-key attributes depend on the WHOLE primary key (no partial dependency). If PK is (order_id, product_id) in order_items, price must depend on both — not just product_id alone.<br><br><strong>3NF:</strong> No transitive dependency. If orders stored customer_name and customer_email (which depend on customer_id, not order_id), that\'s a 3NF violation. Fix: move to customers table.',
      tip: 'Use the mnemonic "2NF = no partial dependency, 3NF = no transitive dependency."',
    },
    {
      q: 'Why does SQL use three-valued logic (TRUE, FALSE, NULL)?',
      a: 'NULL represents "unknown or missing" — not a value, but the absence of one. Any comparison with NULL returns NULL (unknown): <code>NULL = NULL</code> → NULL. This creates a three-valued logic: T, F, NULL. In WHERE clauses, only TRUE rows pass. This means <code>WHERE price != 100</code> silently drops rows where price IS NULL. Always use <code>IS NULL</code> / <code>IS NOT NULL</code> for NULL checks.',
      tip: 'Demo: <code>SELECT 1 WHERE NULL = NULL</code> returns 0 rows. Many candidates guess 1 row.',
    },
  ]);
  initIQ(container);

  return null;
}
