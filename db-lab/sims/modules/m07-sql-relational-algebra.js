import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';

const CANONICAL_SQL = `SELECT p.name, p.price, i.quantity
FROM products p
JOIN inventory i ON p.product_id = i.product_id
WHERE p.product_id = 'B08N5WRWNW'
  AND i.quantity > 0`;

const CANONICAL_RA = `π(name, price, quantity)(
  σ(product_id='B08N5WRWNW' ∧ quantity>0)(
    products ⋈[product_id] inventory
  )
)`;

const STEPS = [
  {
    stage: 'SELECT → π (Projection)',
    color: '#4F46E5',
    sql:   'SELECT p.name, p.price, i.quantity',
    ra:    'π(name, price, quantity)( … )',
    note:  'The SELECT list maps directly to the projection operator — only these three columns survive to the client.',
  },
  {
    stage: 'WHERE → σ (Selection)',
    color: '#EF4444',
    sql:   "WHERE p.product_id = 'B08N5WRWNW'\n  AND i.quantity > 0",
    ra:    "σ(product_id='B08N5WRWNW' ∧ quantity>0)( … )",
    note:  'Both AND predicates become a conjunction (∧) in the σ operator. The optimizer may push each predicate separately.',
  },
  {
    stage: 'JOIN → ⋈ (Join)',
    color: '#10B981',
    sql:   'FROM products p JOIN inventory i ON p.product_id = i.product_id',
    ra:    'products ⋈[product_id] inventory',
    note:  'The equi-join condition becomes the join predicate. The optimizer decides the join algorithm (hash, nested loop, sort-merge) based on statistics.',
  },
  {
    stage: 'Optimized: Push σ Down',
    color: '#F59E0B',
    sql:   '(Both predicates pushed below the join)',
    ra:    "π(name,price,quantity)(\n  σ(product_id='B08N5WRWNW')(products)\n  ⋈\n  σ(quantity>0)(inventory)\n)",
    note:  'The optimizer rewrites using predicate pushdown. Filter products first → tiny set. Then join the tiny set against filtered inventory. Far fewer rows to join.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Foundations · M07',
    title: 'SQL → Relational Algebra',
    subtitle: 'Step through how the query optimizer translates a SQL SELECT into a relational algebra expression tree.',
    tabs: [
      { id: 'translate', label: '🔗 Translation Steps' },
      { id: 'optimized', label: '🎯 Optimization' },
      { id: 'iq',        label: '💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  // ── Translation Steps ──────────────────────────────────────────────────────
  const translateTab = container.querySelector('#tab-translate');
  translateTab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">Canonical Query: Amazon Product Availability Check</div>
        <div class="section-desc">Used on every Prime Day product page — is this item in stock?</div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
        <div>
          <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">SQL</div>
          <div class="code-block" style="margin:0">${CANONICAL_SQL.replace(/</g,'&lt;')}</div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px">Relational Algebra</div>
          <div class="code-block" style="margin:0">${CANONICAL_RA}</div>
        </div>
      </div>

      ${STEPS.slice(0,3).map((s, i) => `
        <div style="display:flex;gap:16px;margin-bottom:20px;padding:16px;
                    background:var(--bg2);border:1px solid ${s.color}33;border-radius:10px">
          <div style="width:28px;height:28px;border-radius:50%;background:${s.color};
                      color:#fff;display:flex;align-items:center;justify-content:center;
                      font-size:13px;font-weight:800;flex-shrink:0">${i+1}</div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:700;color:${s.color};margin-bottom:8px">${s.stage}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div>
                <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">SQL clause</div>
                <code style="font-size:11px;color:var(--text2);white-space:pre;display:block">${s.sql}</code>
              </div>
              <div>
                <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">RA expression</div>
                <code style="font-size:11px;color:${s.color};white-space:pre;display:block">${s.ra}</code>
              </div>
            </div>
            <div style="margin-top:10px;font-size:12px;color:var(--text2)">${s.note}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  // ── Optimization Tab ───────────────────────────────────────────────────────
  const optimTab = container.querySelector('#tab-optimized');
  optimTab.innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">Predicate Pushdown — The Most Important Optimization</div>
        <div class="section-desc">Rewrite the RA tree so filters execute before joins — dramatically reduces intermediate row counts</div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">
        <div>
          <div style="font-size:12px;font-weight:700;color:var(--red);margin-bottom:10px">❌ Naive Plan (filter after join)</div>
          <div class="code-block">
<span class="cmt">-- Join first, then filter:</span>
π(name,price,quantity)(
  σ(product_id='B08N5WRWNW'
    ∧ quantity>0)(
    products ⋈ inventory    <span class="cmt">← All rows</span>
  )
)

<span class="cmt">-- Row count at join:
-- 350M products × N inventory rows
-- Then filter down to 1 product</span>
          </div>
        </div>
        <div>
          <div style="font-size:12px;font-weight:700;color:var(--green);margin-bottom:10px">✅ Optimized Plan (push filters down)</div>
          <div class="code-block">
<span class="cmt">-- Filter each table first, then join:</span>
π(name,price,quantity)(
  σ(product_id='B08N5WRWNW')(products)
  ⋈
  σ(quantity>0)(inventory)
)

<span class="cmt">-- Row count at join:
-- 1 product × warehouse inventory rows
-- Tiny join instead of full cross product</span>
          </div>
        </div>
      </div>

      <div class="stats-row" style="padding:0;margin-bottom:24px">
        <div class="stat-box"><div class="stat-val">350M</div><div class="stat-label">Rows before pushdown</div></div>
        <div class="stat-box" style="border-color:var(--accent)33"><div class="stat-val" style="color:var(--green)">1</div><div class="stat-label">Rows after pushdown</div></div>
        <div class="stat-box"><div class="stat-val">99.999%</div><div class="stat-label">Rows eliminated</div></div>
      </div>

      <div class="prose">
        <h3>Other SQL → RA Translation Rules</h3>
        <ul>
          <li><strong>GROUP BY + aggregate</strong> → γ (Gamma / grouping) operator: <code>γ(category; SUM(total)→revenue)(orders)</code></li>
          <li><strong>ORDER BY</strong> → τ (Tau / sort) operator: <code>τ(total DESC)(orders)</code></li>
          <li><strong>DISTINCT</strong> → δ (Delta / deduplication) or handled by the projection operator in set semantics</li>
          <li><strong>Subquery in WHERE</strong> → dependent join (correlated) or subquery unnesting (anti-join for NOT IN)</li>
        </ul>
      </div>
    </div>
  `;

  // ── Interview Q&A ─────────────────────────────────────────────────────────
  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'What is predicate pushdown and why does it matter?',
      a: 'Predicate pushdown moves WHERE conditions as close as possible to the base tables in the query plan tree. Instead of filtering after a join of 350M × N rows, we filter products first (1 row) and inventory first (limited rows), then join the two tiny results. This is algebraically legal because σ distributes over ⋈ when the predicate references only one table. The optimizer applies this rewrite automatically; you can verify with EXPLAIN.',
      tip: 'Show the cost: join 350M × N rows then filter vs join 1 × M rows — the difference is orders of magnitude.',
    },
    {
      q: 'What happens when SQL has a correlated subquery — how does the optimizer handle it?',
      a: 'A correlated subquery re-executes for every outer row — O(N×M) cost. The optimizer tries to "unnest" it into an equivalent join. Example: <code>WHERE EXISTS (SELECT 1 FROM inventory WHERE inventory.product_id = products.product_id AND quantity > 0)</code> becomes a semi-join: <code>products ⊳ σ(quantity>0)(inventory)</code>. Not all correlated subqueries can be unnested (e.g., aggregates with HAVING referencing the outer query), but modern optimizers handle most common patterns.',
      tip: 'Mention that query unnesting is one of the hardest parts of optimizer implementation — it\'s why CTEs can sometimes block optimizations.',
    },
    {
      q: 'Why does SQL have a defined logical order of clause evaluation?',
      a: 'SQL evaluates clauses in this order: FROM → ON → JOIN → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT. This is the logical order (what the result semantics are), not the physical execution order. You cannot reference a SELECT alias in a WHERE clause because WHERE evaluates before SELECT. HAVING can filter on aggregate functions because it evaluates after GROUP BY. The physical execution plan may differ — it\'s just the logical contract.',
      tip: 'The logical order explains why <code>WHERE alias = x</code> fails but <code>HAVING alias = x</code> can work — aliases resolve in SELECT, which is after WHERE.',
    },
  ]);
  initIQ(container);

  return null;
}
