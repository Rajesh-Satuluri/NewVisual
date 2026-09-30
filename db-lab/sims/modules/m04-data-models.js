import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';

const MODELS = [
  {
    icon: '📊', name: 'Relational',  color: '#4F46E5',
    strength: 'Complex queries, joins, ACID',
    weakness: 'Schema rigidity, horizontal scale',
    example: 'Amazon orders, payments — need cross-table joins + ACID',
    amazon: 'Aurora PostgreSQL / MySQL (orders, inventory, payments)',
    query: 'SELECT * FROM orders JOIN order_items ON …',
    tags: ['Structured', 'SQL', 'ACID', 'Joins'],
  },
  {
    icon: '📄', name: 'Document',    color: '#06B6D4',
    strength: 'Flexible schema, nested data',
    weakness: 'No multi-document ACID (traditionally)',
    example: 'Product catalog — each product has different attributes',
    amazon: 'DynamoDB (product catalog) / MongoDB',
    query: '{ "product_id": "B08N", "attrs": {"color":"red"} }',
    tags: ['JSON', 'Flexible', 'Nested', 'Schemaless'],
  },
  {
    icon: '🔑', name: 'Key-Value',   color: '#10B981',
    strength: 'O(1) lookup, extreme throughput',
    weakness: 'No range queries, no joins',
    example: 'Session data, cart contents, rate limiting',
    amazon: 'ElastiCache (Redis) / DynamoDB for session',
    query: 'GET cart:user_123 → {"items":[…]}',
    tags: ['Fast', 'Cache', 'Simple', 'Hash'],
  },
  {
    icon: '🕸️', name: 'Graph',       color: '#F59E0B',
    strength: 'Relationship traversal, deep joins',
    weakness: 'Poor for bulk analytics, niche tooling',
    example: 'Product recommendation graph ("customers also bought")',
    amazon: 'Amazon Neptune (recommendation engine)',
    query: 'MATCH (p:Product)-[:BOUGHT_WITH]-(q) RETURN q LIMIT 5',
    tags: ['Nodes', 'Edges', 'Traversal', 'Neptune'],
  },
  {
    icon: '📐', name: 'Columnar',    color: '#EF4444',
    strength: 'Analytical queries, compression',
    weakness: 'Slow point reads/writes',
    example: 'Prime Day sales dashboard: revenue by category/hour',
    amazon: 'Redshift (data warehouse analytics)',
    query: 'SELECT category, SUM(total) FROM orders GROUP BY 1',
    tags: ['OLAP', 'Analytics', 'Compressed', 'Redshift'],
  },
  {
    icon: '⏱️', name: 'Time-Series', color: '#8B5CF6',
    strength: 'Efficient ingestion + range scans over time',
    weakness: 'Poor for ad-hoc joins',
    example: 'Server metrics, order event timestamps on Prime Day',
    amazon: 'Amazon Timestream / Prometheus',
    query: 'SELECT avg(latency) FROM metrics WHERE time > now()-1h',
    tags: ['Metrics', 'Time', 'Series', 'Append'],
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Foundations · M04',
    title: 'Data Models',
    subtitle: 'Six data models Amazon uses on Prime Day — each optimised for a different access pattern.',
    tabs: [
      { id: 'models',  label: '📐 Model Comparison' },
      { id: 'choose',  label: '🎯 How to Choose' },
      { id: 'iq',      label: '💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  // ── Tab: Model Comparison ─────────────────────────────────────────────────
  container.querySelector('#tab-models').innerHTML = `
    ${PRIME_SCHEMA}
    <div class="info-grid" style="padding-top:24px">
      ${MODELS.map(m => `
        <div class="info-card" style="border-color:${m.color}33">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <span style="font-size:24px">${m.icon}</span>
            <div>
              <div class="info-card-title" style="color:${m.color}">${m.name} Model</div>
              <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">
                ${m.tags.map(t => `<span class="info-card-tag" style="color:${m.color};background:${m.color}18">${t}</span>`).join('')}
              </div>
            </div>
          </div>
          <div class="info-card-body">
            <strong style="color:var(--green)">✓ Best for:</strong> ${m.strength}<br>
            <strong style="color:var(--red)">✗ Weak at:</strong> ${m.weakness}
          </div>
          <div style="margin-top:10px;padding:10px;background:var(--bg3);border-radius:6px;font-size:11px">
            <strong style="color:${m.color}">Amazon uses:</strong> ${m.amazon}<br>
            <code style="color:var(--text3);font-size:10px;display:block;margin-top:4px">${m.query}</code>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  // ── Tab: How to Choose ────────────────────────────────────────────────────
  container.querySelector('#tab-choose').innerHTML = `
    <div class="compare-table-wrap">
      <table class="compare-table">
        <thead>
          <tr>
            <th>Access Pattern</th>
            <th>Model</th>
            <th>Why</th>
            <th>Amazon Service</th>
          </tr>
        </thead>
        <tbody>
          ${[
            ['ACID multi-table writes (checkout)', 'Relational', 'Foreign keys, joins, transactions', 'Aurora'],
            ['Flexible product attributes', 'Document', 'Each product has different fields', 'DynamoDB / DocumentDB'],
            ['Session / cart (get by user ID)', 'Key-Value', 'O(1) hash lookup, sub-ms latency', 'ElastiCache Redis'],
            ['Product recommendations', 'Graph', 'Traverse edges ("also bought")', 'Neptune'],
            ['Sales dashboard by category/hour', 'Columnar', 'Aggregates, compression, scan speed', 'Redshift'],
            ['Infrastructure metrics', 'Time-Series', 'Efficient time-range queries', 'Timestream'],
          ].map(([pattern, model, why, svc]) => `
            <tr>
              <td>${pattern}</td>
              <td><strong>${model}</strong></td>
              <td>${why}</td>
              <td><code>${svc}</code></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <div class="scroll-content" style="padding-top:0">
      <div class="prose">
        <h3>The Three Dimensions of a Data Model</h3>
        <p><strong>1. Access pattern:</strong> Point lookup (key-value), range scan (relational/time-series),
           graph traversal (graph), aggregate over columns (columnar).</p>
        <p><strong>2. Schema flexibility:</strong> Relational = strict schema up front.
           Document = schema on read (flexible, but no optimizer help).</p>
        <p><strong>3. Consistency:</strong> Relational = ACID by default.
           Most NoSQL = eventual consistency (tunable in DynamoDB with strong reads).</p>
        <h3>Amazon's Polyglot Persistence</h3>
        <p>No single model wins for all Prime Day workloads. Amazon engineers choose per use-case
           and accept the operational cost of running 6+ different database services simultaneously.</p>
      </div>
    </div>
  `;

  // ── Interview Q&A ─────────────────────────────────────────────────────────
  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'What data model would you use for Amazon\'s product catalog, and why?',
      a: 'A document model (DynamoDB or MongoDB). Each product has a wildly different attribute set — a book has ISBN, author, pages; a TV has screen size, resolution, HDMI ports. A relational table would need hundreds of NULLable columns or a messy EAV table. A document store lets each product be a JSON blob with its own schema, while a single GSI on category enables efficient browsing.',
      tip: 'Mention the EAV anti-pattern — a relational EAV table is worse than a document store for this use case.',
    },
    {
      q: 'What is the difference between OLTP and OLAP data models?',
      a: '<strong>OLTP (Online Transaction Processing):</strong> Many short, concurrent transactions; read + write; optimise for low latency; row-store (read one row = one I/O). Example: order checkout.<br><br><strong>OLAP (Online Analytical Processing):</strong> Few, complex queries; mostly read; optimise for throughput over millions of rows; column-store (read one column of 10M rows = sequential I/O). Example: Prime Day sales dashboard.',
      tip: 'Row-store vs column-store is the key physical implementation difference — explain I/O access patterns.',
    },
    {
      q: 'Why do graph databases outperform relational DBs for multi-hop traversals?',
      a: 'In a relational DB, finding "friends of friends who bought X" requires 2–3 self-joins, and the cost grows exponentially with depth. A graph DB stores edges as direct pointers — each hop is O(degree), not O(log N). Amazon Neptune can answer 3-hop recommendation queries in milliseconds where a relational self-join would time out on 300M customer nodes.',
      tip: 'Cite "index-free adjacency" — each node directly stores pointers to its neighbors, eliminating index lookups per hop.',
    },
  ]);
  initIQ(container);

  return null;
}
