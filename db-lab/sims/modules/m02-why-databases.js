import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';

const PROBLEMS = [
  {
    icon: '⚔️', title: 'Concurrency Hell',
    file: 'Two processes read inventory = 1, both sell it → inventory = -1',
    db:   'Transaction manager uses locks/MVCC — only one sale succeeds, other rolls back',
    color: '#EF4444',
  },
  {
    icon: '💥', title: 'Crash & Data Loss',
    file: 'Power cut mid-write → partial order written, money charged but no order created',
    db:   'WAL + ACID atomicity: either all changes commit or none do, even after a crash',
    color: '#F59E0B',
  },
  {
    icon: '🐌', title: 'Slow Queries',
    file: 'Find all Prime Day orders over $100: scan every line of a 10 GB CSV',
    db:   'B+ tree index on (total, status): O(log n) lookup instead of O(n) full scan',
    color: '#F97316',
  },
  {
    icon: '🔒', title: 'No Access Control',
    file: 'Any process can read or overwrite any file — customer PII exposed',
    db:   'Role-based grants: analytics role reads orders, never touches payments',
    color: '#8B5CF6',
  },
  {
    icon: '🔗', title: 'Data Integrity',
    file: 'Delete a product_id from products.csv — broken references in orders.csv stay',
    db:   'FOREIGN KEY constraint + CASCADE/RESTRICT prevent orphaned order rows',
    color: '#06B6D4',
  },
  {
    icon: '📊', title: 'No Ad-hoc Queries',
    file: 'Need sales by category for Prime Day dashboard? Write a new Python script',
    db:   'SQL: SELECT category, SUM(total) FROM orders JOIN products … GROUP BY category',
    color: '#10B981',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Foundations · M02',
    title: 'Why Databases?',
    subtitle: 'Six problems Amazon faces if Prime Day runs on flat files — and how a DBMS solves each one.',
    tabs: [
      { id: 'compare', label: '⚔️ Files vs DB' },
      { id: 'scale',   label: '📊 Scale Numbers' },
      { id: 'iq',      label: '💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  // ── Tab: Files vs DB ───────────────────────────────────────────────────────
  container.querySelector('#tab-compare').innerHTML = `
    ${PRIME_SCHEMA}
    <div class="compare-table-wrap">
      <table class="compare-table">
        <thead>
          <tr>
            <th style="width:12%">Problem</th>
            <th style="width:40%">❌ Flat Files on Prime Day</th>
            <th style="width:40%">✅ DBMS Solution</th>
          </tr>
        </thead>
        <tbody>
          ${PROBLEMS.map(p => `
            <tr>
              <td><strong style="color:${p.color}">${p.icon} ${p.title}</strong></td>
              <td class="tag-bad">${p.file}</td>
              <td class="tag-good">${p.db}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="scroll-content" style="padding-top:0">
      <div class="prose">
        <h3>The Core Insight</h3>
        <p>Every problem above boils down to three fundamental challenges:</p>
        <ul>
          <li><strong>Concurrency</strong> — multiple threads/machines touching the same data simultaneously</li>
          <li><strong>Durability</strong> — surviving crashes without data loss or corruption</li>
          <li><strong>Efficient access</strong> — finding one row in billions without reading everything</li>
        </ul>
        <p>File systems solve none of these. A DBMS is purpose-built for all three.</p>
        <h3>Amazon Prime Day Numbers (2023)</h3>
        <p>375 million items ordered over 48 hours = <strong>~2,170 orders/second</strong> at peak.
           Each order touches 6 tables in our schema — that's <strong>13,000+ row operations/second</strong>
           across concurrent transactions. No flat file survives this.</p>
      </div>
    </div>
  `;

  // ── Tab: Scale Numbers ────────────────────────────────────────────────────
  container.querySelector('#tab-scale').innerHTML = `
    <div class="stats-row">
      ${[
        ['375M+', 'Items ordered on Prime Day 2023'],
        ['2,170', 'Orders per second at peak'],
        ['13,000+', 'Row ops/sec across 6 tables'],
        ['300M+', 'Active customer records'],
        ['350M+', 'Products in catalog'],
        ['99.999%', 'Uptime target during Prime Day'],
      ].map(([val, label]) => `
        <div class="stat-box">
          <div class="stat-val">${val}</div>
          <div class="stat-label">${label}</div>
        </div>
      `).join('')}
    </div>

    <div class="compare-table-wrap" style="margin-top:32px">
      <table class="compare-table">
        <thead>
          <tr>
            <th>Storage Option</th>
            <th>Read 1 row from 375M orders</th>
            <th>Concurrent writers</th>
            <th>Crash recovery</th>
            <th>Verdict</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>CSV / Flat file</strong></td>
            <td class="tag-bad">Full scan: ~30 seconds</td>
            <td class="tag-bad">Corrupts data</td>
            <td class="tag-bad">Manual repair</td>
            <td class="tag-bad">❌ Unusable</td>
          </tr>
          <tr>
            <td><strong>RDBMS (PostgreSQL)</strong></td>
            <td class="tag-good">B+ tree index: &lt;1ms</td>
            <td class="tag-good">MVCC: safe</td>
            <td class="tag-good">ARIES: automatic</td>
            <td class="tag-good">✅ Production-ready</td>
          </tr>
          <tr>
            <td><strong>DynamoDB (NoSQL)</strong></td>
            <td class="tag-good">Hash lookup: &lt;10ms</td>
            <td class="tag-good">Optimistic locking</td>
            <td class="tag-good">Replicated WAL</td>
            <td class="tag-warn">⚠️ Limited queries</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  // ── Tab: Interview Q&A ────────────────────────────────────────────────────
  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'Why can\'t Amazon just use S3 + CSV files for Prime Day orders?',
      a: 'Three fatal problems: (1) <strong>No isolation</strong> — two processes read inventory=1, both decrement, final value is -1 (oversell). (2) <strong>No atomicity</strong> — power failure mid-write leaves a partial order: payment charged, order_items not recorded. (3) <strong>No efficient access</strong> — finding order #X in a 10 GB CSV requires a full scan taking ~30 seconds. A DBMS solves all three.',
      tip: 'The interviewer wants to hear "concurrency, atomicity, and index access" — name all three explicitly.',
    },
    {
      q: 'When would you choose a NoSQL database over a relational one?',
      a: 'NoSQL wins when: (1) your data has a well-known, fixed access pattern (e.g., get user by ID — DynamoDB), (2) you need horizontal scale beyond a single machine and your queries are simple, (3) your schema evolves rapidly (document stores). RDBMS wins when: complex joins are common, ACID across multiple entities is required, and query patterns are ad-hoc. Amazon uses both: DynamoDB for cart/session (simple key lookup), Aurora for orders/payments (complex joins, ACID).',
      tip: 'Show you understand the tradeoff — don\'t say "NoSQL is faster" without qualification.',
    },
    {
      q: 'What is the N+1 query problem and how does a DBMS help?',
      a: 'N+1 happens when you fetch N orders then issue 1 query per order to get its items — 1 + N round trips. A DBMS with a JOIN solves this in 1 query: <code>SELECT … FROM orders JOIN order_items ON …</code>. The optimizer chooses an efficient join algorithm (hash join for large tables) and returns all data in one network round trip.',
      tip: 'Mention that ORMs often generate N+1 queries by default — you fix it with eager loading or a JOIN.',
    },
  ]);
  initIQ(container);

  return null;
}
