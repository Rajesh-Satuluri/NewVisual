import { createModuleShell, createIQSection } from '../components/module-shell.js';

const IQ = [
  {
    q: 'A team wants to use dbt to power their real-time fraud detection pipeline. What do you tell them?',
    a: `<strong>dbt is the wrong tool. Here's why and what to use instead.</strong>
    <br><br>
    <strong>Why dbt can't do real-time fraud detection:</strong>
    <ul>
      <li>dbt runs on a batch schedule — every N minutes at best with dbt Cloud. Fraud detection needs sub-second latency.</li>
      <li>dbt transforms data that already exists in a warehouse. It has no concept of a real-time event stream.</li>
      <li>dbt has no state management for streaming windows (tumbling windows, sliding windows, session windows).</li>
    </ul>
    <strong>What to use instead:</strong>
    <ul>
      <li><strong>Apache Flink / Kafka Streams / Spark Streaming:</strong> For real-time feature computation (rolling 10-minute transaction count per card).</li>
      <li><strong>Feature stores (Feast, Tecton):</strong> Serve computed features to the fraud model at transaction time with sub-10ms latency.</li>
      <li><strong>Where dbt fits in the same pipeline:</strong> Training data preparation (batch). dbt can build the historical feature tables used to train the fraud model — just not serve it in real-time.</li>
    </ul>
    <strong>The nuanced answer:</strong> "dbt is excellent for training data preparation — but Flink for real-time features. They're complementary, not competing."`,
    tip: '"dbt for training, Flink for serving" is a more sophisticated answer than just "dbt can\'t do real-time." It shows you understand where dbt fits within a complete ML pipeline rather than dismissing it entirely.',
  },
  {
    q: 'When is dbt overkill? Describe three scenarios where you would NOT introduce it.',
    a: `<strong>1. A tiny, one-person analytics function</strong>
    <ul><li>One analyst, 3 source tables, a weekly report. The setup cost (learning Jinja, profiles.yml, CI/CD configuration) exceeds the benefit. A Python script with pandas or a few SQL files is faster to build and maintain. Introduce dbt when the codebase grows or a second person joins.</li></ul>
    <strong>2. A one-time exploratory analysis or migration</strong>
    <ul><li>A data migration that runs once is not a dbt use case. dbt's value is in reproducibility — running the same transformations repeatedly with tests and documentation. A one-off migration is better as a Python script with unit tests.</li></ul>
    <strong>3. OLTP write workloads</strong>
    <ul><li>dbt is read-only: it reads from source tables and writes transformed tables back to the warehouse. It cannot INSERT, UPDATE, or DELETE from OLTP application databases. If you need to write back to an operational system (e.g., update Salesforce lead scores), dbt is the wrong layer. Use Airflow + Python or a reverse ETL tool (Census, Hightouch).</li></ul>`,
    tip: '"dbt is read-only" is a fundamental constraint most junior candidates miss. The corollary — "for writing back to operational systems, use reverse ETL" — shows you know the ecosystem, not just the tool.',
  },
  {
    q: 'You\'re consulting for a company using dbt to power a customer-facing dashboard that queries directly from the dbt model outputs. The dashboard is too slow. What is your diagnosis and fix?',
    a: `<strong>Diagnosis:</strong>
    <ol>
      <li>Are they querying the mart directly from the warehouse with a query engine (Athena, Snowflake, BigQuery)? If yes, cold-start latency + compute time for complex queries is likely the issue — not a dbt problem.</li>
      <li>Are the mart tables appropriately materialized? A mart materialized as <code>view</code> re-executes the full join chain on every dashboard load.</li>
      <li>Is the mart missing indexes or clustering keys? Snowflake clustering keys, BigQuery partitioning, Redshift distkeys — all need to be set for large marts.</li>
    </ol>
    <strong>Fixes:</strong>
    <ul>
      <li><strong>Immediate:</strong> Change mart materialization from <code>view</code> to <code>table</code>. Eliminates repeated computation on each dashboard query.</li>
      <li><strong>Better:</strong> Add a caching layer. Pre-aggregate the mart into summary tables (dbt models) sized for the specific dashboard queries. Smaller tables = faster queries.</li>
      <li><strong>Best for customer-facing sub-second latency:</strong> Decouple the warehouse from the dashboard. Use a BI tool with its own caching (Looker PDTs, Metabase materializations), or export mart outputs to a purpose-built serving store (Redis, DynamoDB) for &lt;100ms latency.</li>
    </ul>
    <strong>The root issue:</strong> dbt is designed for analytical workloads (large scans, complex aggregations). Sub-second customer-facing dashboards often require a different serving layer.`,
    tip: 'The answer demonstrates that slow dashboards are often a serving layer problem, not a dbt problem. Recommending a caching layer or serving store instead of just "optimize the SQL" shows system design maturity.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M16 · Advanced',
    title: 'When NOT to Use dbt',
    subtitle: 'The best engineers know the edges of their tools. Five scenarios where dbt is the wrong choice.',
    tabs: [
      { id: 'visual', label: '🚫 Decision Guide' },
      { id: 'detail', label: '📋 The Full Picture' },
      { id: 'iq',     label: '🎯 Interview Q&A' },
    ]
  });

  buildDecisionGuide(container);
  buildDetail(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return () => {};
}

function buildDecisionGuide(container) {
  const tab = container.querySelector('#tab-visual');
  tab.innerHTML = `
    <div style="padding:20px 4px">
      <p style="font-size:13px;color:var(--text-2);margin-bottom:20px;line-height:1.6">
        dbt is powerful — but it's a batch, read-only, SQL-first transformation tool. These five scenarios fall outside that design. Using dbt for them adds complexity without benefit.
      </p>

      <div style="display:grid;gap:14px">

        <div class="no-dbt-card" style="border:1px solid #EF444444;border-radius:10px;padding:18px;background:rgba(239,68,68,0.04)">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <span style="font-size:20px">⚡</span>
            <strong style="color:#EF4444;font-size:13px">Real-time / Streaming Pipelines</strong>
            <span style="margin-left:auto;font-size:11px;color:#EF4444;background:#EF444422;padding:3px 8px;border-radius:4px">WRONG LAYER</span>
          </div>
          <p style="font-size:12px;color:var(--text-2);margin:0 0 6px;line-height:1.6">
            dbt runs on a schedule (every N minutes at fastest). Fraud detection, live inventory, real-time recommendations require sub-second latency. dbt has no concept of event streams or streaming windows.
          </p>
          <p style="font-size:11px;color:#4B5E78;margin:0">
            <strong style="color:#10B981">Use instead:</strong> Apache Flink, Kafka Streams, Spark Structured Streaming, AWS Kinesis.
            dbt can still contribute: train ML models on dbt-built feature tables, then serve features via Flink.
          </p>
        </div>

        <div class="no-dbt-card" style="border:1px solid #F59E0B44;border-radius:10px;padding:18px;background:rgba(245,158,11,0.04)">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <span style="font-size:20px">✍</span>
            <strong style="color:#F59E0B;font-size:13px">Writing Back to Operational Systems</strong>
            <span style="margin-left:auto;font-size:11px;color:#F59E0B;background:#F59E0B22;padding:3px 8px;border-radius:4px">READ-ONLY</span>
          </div>
          <p style="font-size:12px;color:var(--text-2);margin:0 0 6px;line-height:1.6">
            dbt is a read-only transformation tool. It cannot INSERT/UPDATE/DELETE from your application database, Salesforce, HubSpot, or any OLTP system. Attempting to use dbt for reverse ETL creates unsupported workflows.
          </p>
          <p style="font-size:11px;color:#4B5E78;margin:0">
            <strong style="color:#10B981">Use instead:</strong> Reverse ETL tools (Census, Hightouch) read from your warehouse and write to operational systems. They can reference dbt model outputs as their source.
          </p>
        </div>

        <div class="no-dbt-card" style="border:1px solid #8B5CF644;border-radius:10px;padding:18px;background:rgba(139,92,246,0.04)">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <span style="font-size:20px">🐍</span>
            <strong style="color:#8B5CF6;font-size:13px">Complex Python / ML Transformations</strong>
            <span style="margin-left:auto;font-size:11px;color:#8B5CF6;background:#8B5CF622;padding:3px 8px;border-radius:4px">SQL-FIRST</span>
          </div>
          <p style="font-size:12px;color:var(--text-2);margin:0 0 6px;line-height:1.6">
            dbt models are SQL files. Heavy pandas manipulations, custom model training, image processing, NLP tokenization — these require Python. dbt Python models (Snowpark/BigQuery) exist but are limited; complex ML belongs in dedicated tooling.
          </p>
          <p style="font-size:11px;color:#4B5E78;margin:0">
            <strong style="color:#10B981">Use instead:</strong> Airflow + Python operators, Prefect, Dagster, SageMaker Pipelines. Use dbt to prepare features, then hand off to Python for model training.
          </p>
        </div>

        <div class="no-dbt-card" style="border:1px solid #3B82F644;border-radius:10px;padding:18px;background:rgba(59,130,246,0.04)">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <span style="font-size:20px">📁</span>
            <strong style="color:#3B82F6;font-size:13px">Tiny Teams or One-Time Scripts</strong>
            <span style="margin-left:auto;font-size:11px;color:#3B82F6;background:#3B82F622;padding:3px 8px;border-radius:4px">OVERKILL</span>
          </div>
          <p style="font-size:12px;color:var(--text-2);margin:0 0 6px;line-height:1.6">
            One analyst, three source tables, a weekly report. The setup cost (Jinja, profiles.yml, CI/CD) exceeds the benefit. A one-time data migration that runs once doesn't need a reproducible transformation framework.
          </p>
          <p style="font-size:11px;color:#4B5E78;margin:0">
            <strong style="color:#10B981">Rule:</strong> Introduce dbt when the codebase grows beyond one person, or when you're committing to running the same transformations repeatedly. Don't over-engineer a one-off.
          </p>
        </div>

        <div class="no-dbt-card" style="border:1px solid #4ECDC444;border-radius:10px;padding:18px;background:rgba(78,205,196,0.04)">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <span style="font-size:20px">⏱</span>
            <strong style="color:#4ECDC4;font-size:13px">Sub-second Customer-Facing Queries</strong>
            <span style="margin-left:auto;font-size:11px;color:#4ECDC4;background:#4ECDC422;padding:3px 8px;border-radius:4px">WRONG LAYER</span>
          </div>
          <p style="font-size:12px;color:var(--text-2);margin:0 0 6px;line-height:1.6">
            A customer-facing dashboard querying a 500M-row mart directly on every page load will be slow, regardless of how well the dbt model is written. dbt is designed for analytical workloads, not transactional serving.
          </p>
          <p style="font-size:11px;color:#4B5E78;margin:0">
            <strong style="color:#10B981">Use instead:</strong> Export mart outputs to Redis/DynamoDB for &lt;10ms serving. Or use a BI tool with pre-aggregated caches (Looker PDTs, Metabase materializations). dbt feeds the cache; a different layer serves it.
          </p>
        </div>

      </div>

      <div style="margin-top:20px;padding:16px 20px;background:rgba(16,185,129,0.06);border:1px solid #10B98133;border-radius:10px">
        <strong style="color:#10B981;font-size:12px">✓  dbt IS the right tool when:</strong>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px">
          ${[
            'Batch analytical transformations (any latency &gt; 1 minute is fine)',
            'SQL-based transformations with version control and testing requirements',
            'Multiple analysts collaborating on the same data pipeline',
            'Preparing training data for ML models',
            'Creating a canonical metric layer (revenue, active users, CLV)',
            'Auditable, documented data lineage for compliance',
          ].map(t => `<div style="font-size:11px;color:var(--text-2);line-height:1.5">• ${t}</div>`).join('')}
        </div>
      </div>
    </div>
  `;
}

function buildDetail(container) {
  container.querySelector('#tab-detail').innerHTML = `
    <div class="detail-section">
      <h3>The dbt design constraints</h3>
      <p>dbt is purpose-built for one thing: batch SQL transformations in a warehouse. Understanding these three constraints tells you exactly where dbt doesn't fit:</p>
      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead><tr><th>Constraint</th><th>What it means</th><th>What it rules out</th></tr></thead>
          <tbody>
            <tr><td>Batch execution</td><td>Runs on a schedule, not event-triggered</td><td>Real-time pipelines, sub-second latency</td></tr>
            <tr><td>Read-only</td><td>Can only SELECT from sources; creates new tables in warehouse</td><td>Writing to OLTP systems, application databases</td></tr>
            <tr><td>SQL-first</td><td>Models are SQL files; Jinja adds templating, not computation</td><td>Complex ML, image processing, custom Python algorithms</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="detail-section">
      <h3>The modern data stack: where dbt sits</h3>
      <div class="info-grid">
        <div class="info-card" style="border-left-color:#4B5E78">
          <div class="info-card-title">Extract & Load</div>
          <div class="info-card-tag" style="color:#4B5E78;background:#4B5E7822">Before dbt</div>
          <div class="info-card-body">Fivetran, Airbyte, Kafka, Debezium. Gets raw data into the warehouse. dbt doesn't touch this layer.</div>
        </div>
        <div class="info-card" style="border-left-color:#FF694B">
          <div class="info-card-title">Transform</div>
          <div class="info-card-tag" style="color:#FF694B;background:#FF694B22">dbt's domain</div>
          <div class="info-card-body">Raw → staging → intermediate → marts. dbt owns this layer exclusively. Version control, tests, documentation, DAG.</div>
        </div>
        <div class="info-card" style="border-left-color:#3B82F6">
          <div class="info-card-title">Serve</div>
          <div class="info-card-tag" style="color:#3B82F6;background:#3B82F622">After dbt</div>
          <div class="info-card-body">BI tools (Looker, Metabase, Tableau), reverse ETL (Census, Hightouch), ML serving (Feast). Reads from dbt mart outputs.</div>
        </div>
        <div class="info-card" style="border-left-color:#10B981">
          <div class="info-card-title">Orchestrate</div>
          <div class="info-card-tag" style="color:#10B981;background:#10B98122">Coordinates all</div>
          <div class="info-card-body">Airflow, Dagster, Prefect. Triggers dbt runs after loads complete, coordinates with Spark/Flink jobs, manages retry logic.</div>
        </div>
      </div>
    </div>
    <div class="detail-section">
      <h3>The mature answer</h3>
      <p style="font-size:15px;font-weight:600;color:var(--accent)">The engineers who get hired at senior levels don't just know how to use dbt — they know exactly where it stops being the right tool, and what to reach for next. A tool used beyond its design constraints creates more problems than it solves.</p>
    </div>
  `;
}
