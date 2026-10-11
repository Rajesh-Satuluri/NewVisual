// Module 15 — Flink SQL & Table API
// Interactive query explorer: pick a SQL query category, see the query,
// the underlying Table/DataStream plan, and live "result rows" for Uber GPS data.

import { rideSpine, initRideSpine, rideCallout } from '../components/story-ui.js';

const QUERIES = [
  {
    id: 'select',
    label: 'SELECT / Filter',
    icon: '🔎',
    category: 'Basic',
    desc: 'The simplest Flink SQL query — filter and project GPS events. Translates to filter() + map() in the DataStream API.',
    uber: 'Select only speeding events for the real-time dashboard. Flink pushes the WHERE predicate into the source connector as a "partition pruning" hint when supported.',
    sql: `-- Real-time GPS event filtering
SELECT
  driver_id,
  speed_kmh,
  lat,
  lon,
  event_time
FROM gps_events
WHERE speed_kmh > 80
  AND speed_kmh < 200  -- sanity bound`,
    plan: `# PyFlink Table API equivalent:
from pyflink.table.expressions import col

(t_env.from_path("gps_events")
   .filter((col("speed_kmh") > 80) & (col("speed_kmh") < 200))
   .select(col("driver_id"), col("speed_kmh"),
           col("lat"), col("lon"), col("event_time")))

# PyFlink DataStream equivalent:
stream.filter(lambda e: 80 < e["speed_kmh"] < 200) \\
      .map(lambda e: to_dashboard_event(e))`,
    results: [
      { driver_id:'D-001', speed_kmh:91,  lat:37.774, lon:-122.432, event_time:'10:00:03' },
      { driver_id:'D-003', speed_kmh:88,  lat:37.765, lon:-122.418, event_time:'10:00:07' },
      { driver_id:'D-002', speed_kmh:105, lat:37.781, lon:-122.445, event_time:'10:00:11' },
    ],
  },
  {
    id: 'tumble',
    label: 'TUMBLE Window',
    icon: '⬜',
    category: 'Windowing',
    desc: 'TUMBLE() is Flink SQL\'s built-in tumbling window function. Results emit at the end of each window when the watermark passes the window end.',
    uber: 'Count GPS pings and avg speed per driver per 10-minute window — drives surge pricing calculation.',
    sql: `-- Average speed per driver per 10-minute window
SELECT
  driver_id,
  TUMBLE_START(event_time, INTERVAL '10' MINUTE) AS window_start,
  TUMBLE_END(event_time, INTERVAL '10' MINUTE)   AS window_end,
  COUNT(*)                                        AS ping_count,
  AVG(speed_kmh)                                  AS avg_speed,
  MAX(speed_kmh)                                  AS max_speed
FROM gps_events
GROUP BY
  driver_id,
  TUMBLE(event_time, INTERVAL '10' MINUTE)`,
    plan: `# PyFlink Table API equivalent:
from pyflink.table.expressions import col, lit
from pyflink.table.window import Tumble

(table.window(Tumble.over(lit(10).minutes)
                    .on(col("event_time")).alias("w"))
      .group_by(col("driver_id"), col("w"))
      .select(
          col("driver_id"),
          col("w").start.alias("window_start"),
          col("w").end.alias("window_end"),
          col("speed_kmh").count.alias("ping_count"),
          col("speed_kmh").avg.alias("avg_speed"),
          col("speed_kmh").max.alias("max_speed")))`,
    results: [
      { driver_id:'D-001', window_start:'10:00', window_end:'10:10', ping_count:4, avg_speed:44, max_speed:91 },
      { driver_id:'D-002', window_start:'10:00', window_end:'10:10', ping_count:3, avg_speed:50, max_speed:105 },
      { driver_id:'D-003', window_start:'10:00', window_end:'10:10', ping_count:2, avg_speed:38, max_speed:88 },
    ],
  },
  {
    id: 'hop',
    label: 'HOP (Sliding) Window',
    icon: '🔲',
    category: 'Windowing',
    desc: 'HOP() creates sliding windows. Each event appears in multiple windows. HOP(event_time, slide, size) emits every slide interval.',
    uber: 'Rolling 15-min average speed, updated every 5 min — used by the speeding alert model to smooth out brief spikes.',
    sql: `-- Rolling 15-min avg speed, refreshed every 5 min
SELECT
  driver_id,
  HOP_START(event_time, INTERVAL '5' MINUTE,
                        INTERVAL '15' MINUTE) AS window_start,
  AVG(speed_kmh)                              AS avg_speed_15m,
  MAX(speed_kmh)                              AS max_speed_15m
FROM gps_events
GROUP BY
  driver_id,
  HOP(event_time, INTERVAL '5' MINUTE, INTERVAL '15' MINUTE)`,
    plan: `# PyFlink Table API equivalent:
from pyflink.table.expressions import col, lit
from pyflink.table.window import Slide

(table.window(Slide.over(lit(15).minutes)
                   .every(lit(5).minutes)
                   .on(col("event_time")).alias("w"))
      .group_by(col("driver_id"), col("w"))
      .select(col("driver_id"),
              col("w").start,
              col("speed_kmh").avg.alias("avg_speed_15m"),
              col("speed_kmh").max.alias("max_speed_15m")))`,
    results: [
      { driver_id:'D-001', window_start:'09:45', avg_speed_15m:40, max_speed_15m:91 },
      { driver_id:'D-001', window_start:'09:50', avg_speed_15m:43, max_speed_15m:91 },
      { driver_id:'D-002', window_start:'09:45', avg_speed_15m:48, max_speed_15m:105 },
    ],
  },
  {
    id: 'join',
    label: 'Temporal Join',
    icon: '🔗',
    category: 'Joins',
    desc: 'Flink SQL\'s temporal join enriches a fact stream with dimension table data at the event\'s specific point in time. Uses the FOR SYSTEM_TIME AS OF syntax.',
    uber: 'Enrich each GPS ping with the driver\'s current tier (Gold/Silver) from the driver_profiles lookup table — tier changes over time, so the join must be point-in-time.',
    sql: `-- Enrich GPS events with driver tier at event time
SELECT
  g.driver_id,
  g.speed_kmh,
  g.event_time,
  p.tier,          -- Gold / Silver / Standard
  p.max_speed_limit
FROM gps_events AS g
JOIN driver_profiles FOR SYSTEM_TIME AS OF g.event_time AS p
  ON g.driver_id = p.driver_id
WHERE g.speed_kmh > p.max_speed_limit`,
    plan: `# Temporal join uses a versioned lookup table:
# driver_profiles must have a primary key and be backed by
# a changelog source (Kafka CDC) or a JDBC lookup connector.

t_env.execute_sql("""
  CREATE TABLE driver_profiles (
    driver_id STRING,
    tier STRING,
    max_speed_limit INT,
    PRIMARY KEY (driver_id) NOT ENFORCED
  ) WITH ('connector' = 'jdbc', ...)
""")
# Flink uses async lookup by default for JDBC`,
    results: [
      { driver_id:'D-001', speed_kmh:91,  event_time:'10:00:03', tier:'Gold',     max_speed_limit:85 },
      { driver_id:'D-002', speed_kmh:105, event_time:'10:00:11', tier:'Standard', max_speed_limit:90 },
    ],
  },
  {
    id: 'dedup',
    label: 'Deduplication',
    icon: '♻️',
    category: 'Advanced',
    desc: 'Flink SQL\'s ROW_NUMBER() OVER (PARTITION BY … ORDER BY … ) pattern efficiently deduplicates a stream, keeping only the first (or last) record per key.',
    uber: 'GPS events can be duplicated by mobile SDK retries. Deduplicate by (driver_id, event_time) to prevent double-counting trips.',
    sql: `-- Keep only the first GPS ping per (driver, second)
SELECT driver_id, speed_kmh, lat, lon, event_time
FROM (
  SELECT *,
    ROW_NUMBER() OVER (
      PARTITION BY driver_id, event_time
      ORDER BY proc_time  -- processing time tie-break
    ) AS row_num
  FROM gps_events
)
WHERE row_num = 1`,
    plan: `# Translated to a stateful KeyedProcessFunction:
# Flink keeps a minibatch of (driver_id, event_time) keys
# in state with TTL, checking duplicates on arrival.
# State TTL must cover the max expected duplicate delay.

# Config hint (set on t_env.get_config().get_configuration()):
# table.exec.mini-batch.enabled: true
# table.exec.mini-batch.allow-latency: 5s
# table.exec.mini-batch.size: 5000`,
    results: [
      { driver_id:'D-001', speed_kmh:91, lat:37.774, lon:-122.432, event_time:'10:00:03', row_num:1 },
      { driver_id:'D-002', speed_kmh:35, lat:37.781, lon:-122.445, event_time:'10:00:05', row_num:1 },
    ],
  },
];

const IQS = [
  { q:'How does Flink SQL relate to the DataStream API?', a:'Flink SQL is compiled by the Table planner (Blink planner since 1.11) into a logical plan, then an optimized physical plan, and finally into DataStream API operators. Every SQL query ultimately becomes a graph of map/filter/keyBy/window/process operators under the hood. The Table API is a type-safe programmatic layer over the same planner. You can mix Table and DataStream: tableEnv.toDataStream(table) and tableEnv.fromDataStream(stream). SQL is preferred for ad-hoc analytics; DataStream for complex stateful logic.' },
  { q:'What is the difference between processing-time and event-time in Flink SQL?', a:'In Flink SQL, you declare the time attribute in the table DDL: WATERMARK FOR event_time AS event_time - INTERVAL \'5\' SECOND for event time, or PROCTIME() for processing time. Window functions (TUMBLE, HOP, SESSION) then use whichever time attribute the table is partitioned on. Event time windows produce deterministic results regardless of processing delays; processing-time windows are simpler but not repeatable. Uber always uses event-time in SQL pipelines for correct aggregations, even at the cost of latency.' },
  { q:'How does Flink handle late data in SQL windowed queries?', a:'In Flink SQL, the WATERMARK definition implicitly sets the allowed out-of-orderness. If WATERMARK FOR event_time AS event_time - INTERVAL \'5\' SECOND, events up to 5s late are included in their correct window. Events later than 5s after the watermark passes are silently dropped (there\'s no sideOutputLateData equivalent in SQL — you\'d need to use the Table API or DataStream for late data side outputs). For Uber\'s GPS pipeline, a 10s watermark delay is set to absorb cellular buffer jitter.' },
  { q:'What is a dynamic table in Flink SQL?', a:'A dynamic table is Flink\'s abstraction over a continuous stream as if it were an ever-updating database table. As new events arrive, the table is conceptually updated. SQL queries over dynamic tables produce dynamic result tables. Flink then either materializes these as a changelog stream (INSERT/UPDATE/DELETE rows) for a mutable sink (JDBC, Cassandra) or as an append-only stream for immutable sinks (Kafka, filesystem). The dual view — stream as table, table as stream — is the foundation of Flink\'s unified batch/streaming semantics.' },
  { q:'When would you choose Flink SQL over the DataStream API?', a:'Choose Flink SQL when: (1) the logic is expressible as set-based transformations (aggregations, joins, filters) — SQL is far more concise and benefits from query optimization. (2) You need ad-hoc analytics without redeploying a JAR. (3) Your team is more SQL-fluent than Java/Scala. Choose DataStream when: (1) the logic requires fine-grained per-event control (complex state machines, custom triggers). (2) You need side outputs, low-level timers, or RPC calls per event. (3) You need to embed ML inference inside processing logic. Uber uses SQL for aggregations and DataStream for the core FraudDetector KeyedProcessFunction.' },
];

// ── "What & Why" foundations (additive) ──────────────────────────
const WHY_REASONS = [
  { icon: '✍️', title: 'Say what, not how', body: 'A windowed average is a few lines of SQL instead of a keyed <code>AggregateFunction</code> with manual state — declarative, not imperative.' },
  { icon: '🧠', title: 'Free optimization', body: 'The Blink planner reorders filters, pushes predicates into sources, and picks join strategies — optimizations you\'d hand-code in DataStream.' },
  { icon: '🔄', title: 'Stream = table', body: 'A stream is modeled as a <b>dynamic table</b> that updates as events arrive; a query over it produces another continuously-updating table.' },
  { icon: '🔀', title: 'Unified batch & stream', body: 'The same SQL runs over a bounded table (batch) or an unbounded stream — one query, two execution modes.' },
  { icon: '⚡', title: 'Ad-hoc, no redeploy', body: 'Submit a new SQL query to a running SQL gateway — no recompiling and shipping a JAR for every analytics question.' },
  { icon: '🤝', title: 'Mix with DataStream', body: '<code>toDataStream()</code> / <code>fromDataStream()</code> let you drop into low-level code exactly where SQL isn\'t expressive enough.' },
];

const PROBLEMS = [
  { naive: 'Hand-code a windowed AVG as a keyed AggregateFunction.', fail: 'Dozens of lines of accumulator, merge, and state wiring — <b>verbose and bug-prone</b> for what is one GROUP BY.', fix: 'Flink SQL\'s <code>TUMBLE</code> + <code>AVG</code> expresses it in a few declarative lines.' },
  { naive: 'Manually order filters and joins in DataStream.', fail: 'A sub-optimal plan does <b>needless work</b> — filtering after a join instead of before it.', fix: 'The query planner reorders and pushes down predicates automatically.' },
  { naive: 'Write a new JAR and redeploy for each new metric.', fail: 'Every ad-hoc question means a <b>code change, build, and deploy</b> cycle.', fix: 'Submit SQL to a running job/gateway — no redeploy for a new query.' },
  { naive: 'Treat the stream as a one-off sequence of events.', fail: 'Joins and updates (a driver changing tier) are <b>awkward</b> without a table abstraction.', fix: 'Dynamic tables model the stream as an updating table, so JOINs and upserts just work.' },
];

const WHY_HTML = `
  <div class="sm-wrap">
    <div class="sm-def card">
      <div class="sm-def-ic">🗃️</div>
      <div>
        <div class="sm-def-eyebrow">What is Flink SQL &amp; the Table API?</div>
        <p class="sm-def-lead"><b>Flink SQL</b> (and its type-safe sibling, the <b>Table API</b>) is a declarative layer over the DataStream API: you write <em>what</em> you want, and the planner compiles it into the same map/keyBy/window operators. Its core idea is the <b>dynamic table</b> — a stream treated as an ever-updating table, and a table read back as a changelog stream. On ride <b>R-4471</b>, it's how aggregations and enrichment joins over <code>gps_events</code> are expressed without hand-writing stateful operators.</p>
      </div>
    </div>

    <div class="sm-def card" style="margin:18px 0 6px;border-left:3px solid #10b981">
      <div class="sm-def-ic">🧭</div>
      <div>
        <div class="sm-def-eyebrow">Scope &amp; related module</div>
        <p class="sm-def-lead" style="font-size:0.95rem">This module covers <b>Flink SQL &amp; Table API fundamentals</b> — dynamic tables, DDL, and the core query patterns. For <b>production patterns</b> (CEP with <code>MATCH_RECOGNIZE</code>, CDC ingestion, StatementSets, async lookup joins), continue to <a href="#m17" style="color:#10b981;font-weight:600">Module 17 — Flink SQL: Advanced Patterns →</a>.</p>
      </div>
    </div>

    <div class="section-header" style="margin:26px 0 12px">
      <div class="section-title">SQL vs. DataStream</div>
      <div class="section-desc">Two ways to express the same pipeline — pick per problem.</div>
    </div>
    <div class="sm-vs">
      <div class="sm-vs-card stateless">
        <div class="sm-vs-head">🧮 Flink SQL / Table API</div>
        <p class="sm-vs-sub">Declarative, optimized, concise.</p>
        <ul>
          <li>Aggregations, joins, filters</li>
          <li>Automatic state &amp; optimization</li>
          <li>Ad-hoc, no redeploy</li>
        </ul>
        <div class="sm-vs-note">Best for set-based logic and analytics.</div>
      </div>
      <div class="sm-vs-card stateful">
        <div class="sm-vs-head">⚙️ DataStream API</div>
        <p class="sm-vs-sub">Imperative, full control.</p>
        <ul>
          <li>Custom state machines &amp; timers</li>
          <li>Side outputs, per-event RPC</li>
          <li>Anything the planner can't express</li>
        </ul>
        <div class="sm-vs-note">Best for the FraudDetector core logic.</div>
      </div>
    </div>

    <div class="section-header" style="margin:26px 0 12px">
      <div class="section-title">Why use SQL over hand-written operators</div>
      <div class="section-desc">Six wins the declarative layer gives you for free.</div>
    </div>
    <div class="sm-why-grid">
      ${WHY_REASONS.map(r => `
        <div class="sm-why">
          <div class="sm-why-ic">${r.icon}</div>
          <div class="sm-why-title">${r.title}</div>
          <p>${r.body}</p>
        </div>
      `).join('')}
    </div>

    <div class="section-header" style="margin:26px 0 12px">
      <div class="section-title">The problem Flink SQL solves</div>
      <div class="section-desc">Four ways raw DataStream code is painful for analytics — and the fix.</div>
    </div>
    <div class="sm-prob-list">
      ${PROBLEMS.map((p, i) => `
        <div class="sm-prob">
          <div class="sm-prob-no">${i + 1}</div>
          <div class="sm-prob-body">
            <div class="sm-prob-naive"><span class="sm-tag naive">Naïve</span>${p.naive}</div>
            <div class="sm-prob-fail"><span class="sm-tag fail">Breaks</span>${p.fail}</div>
            <div class="sm-prob-fix"><span class="sm-tag fix">Flink SQL</span>${p.fix}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="section-header" style="margin:26px 0 12px">
      <div class="section-title">The key idea: dynamic tables</div>
    </div>
    <div class="sm-keyed card">
      <p>Flink SQL rests on the <b>stream ↔ table duality</b> — the insight that makes SQL work on unbounded data.</p>
      <ul>
        <li><b>Stream → table</b> — each arriving event conceptually updates an ever-growing dynamic table.</li>
        <li><b>Query → query</b> — a SQL query over a dynamic table produces another dynamic (continuously updating) result table.</li>
        <li><b>Table → stream</b> — the result is emitted as a changelog (INSERT/UPDATE/DELETE) for mutable sinks, or append-only for Kafka.</li>
      </ul>
      <div class="sm-keyed-flow">
        <code>gps_events</code> stream <span class="sm-arrow">→</span> <b>dynamic table</b> <span class="sm-arrow">→</span> <code>SELECT … GROUP BY</code> <span class="sm-arrow">→</span> <b>result table</b> <span class="sm-arrow">→</span> changelog stream → sink
      </div>
    </div>

    <div class="sm-bridge" style="margin-top:26px">
      <div class="sm-bridge-txt">
        <div class="sm-bridge-k">Now run the queries</div>
        <p>You know <b>what</b> Flink SQL is and <b>why</b> — explore SELECT, TUMBLE, HOP, temporal joins, and dedup with their Table API plan and live result rows.</p>
      </div>
      <button class="sm-bridge-btn" data-jump="explorer">Open the Query Explorer →</button>
    </div>
  </div>
`;

export function mount(container) {
  let selected = QUERIES[0];

  container.innerHTML = `
    ${rideSpine({ active: ['LOCATION_UPDATED', 'RIDE_COMPLETED'] })}
    <div class="module-hero">
      <div class="module-hero-content">
        <span class="module-badge">Module 15</span>
        <h1 class="module-title">Flink SQL &amp; Table API</h1>
        <p class="module-subtitle">Pick a query pattern, see the SQL, its Table API equivalent, and live result rows from Uber's GPS event stream.</p>
      </div>
    </div>
    <div class="module-tabs">
      <button class="tab-btn active" data-tab="why">What &amp; Why</button>
      <button class="tab-btn" data-tab="explorer">Query Explorer</button>
      <button class="tab-btn" data-tab="setup">DDL &amp; Setup</button>
      <button class="tab-btn" data-tab="iq">Interview Q&amp;A</button>
    </div>

    <div class="tab-content active" data-tab="why">
      ${WHY_HTML}
    </div>

    <div class="tab-content" data-tab="explorer">
      <div class="sql-picker" id="sql-picker"></div>
      <div id="sql-detail"></div>
    </div>

    <div class="tab-content" data-tab="setup">
      ${rideCallout('LOCATION_UPDATED', { openEvent: false })}
      <div class="grid-2 gap-20">
        <div class="card p-24">
          <h3 class="mb-12">Table DDL — GPS Events Source</h3>
          <div class="code-block fs-11"><pre>CREATE TABLE gps_events (
  driver_id   STRING,
  lat         DOUBLE,
  lon         DOUBLE,
  speed_kmh   INT,
  event_time  TIMESTAMP(3),
  proc_time   AS PROCTIME(),
  WATERMARK FOR event_time
    AS event_time - INTERVAL '5' SECOND
) WITH (
  'connector'   = 'kafka',
  'topic'       = 'driver-locations',
  'properties.bootstrap.servers' = 'kafka:9092',
  'format'      = 'json',
  'scan.startup.mode' = 'latest-offset'
);</pre></div>
        </div>
        <div class="card p-24">
          <h3 class="mb-12">Table DDL — Fraud Alerts Sink</h3>
          <div class="code-block fs-11"><pre>CREATE TABLE fraud_alerts (
  driver_id   STRING,
  alert_type  STRING,
  speed_kmh   INT,
  alert_time  TIMESTAMP(3)
) WITH (
  'connector' = 'kafka',
  'topic'     = 'fraud-alerts',
  'properties.bootstrap.servers' = 'kafka:9092',
  'format'    = 'json'
);

-- Insert result of SQL query into sink:
INSERT INTO fraud_alerts
SELECT driver_id, 'SPEEDING', speed_kmh, event_time
FROM gps_events
WHERE speed_kmh > 80;</pre></div>
        </div>
        <div class="card p-24">
          <h3 class="mb-12">TableEnvironment Setup</h3>
          <div class="code-block fs-11"><span class="lang-tag">PyFlink · Table API</span><pre>from pyflink.datastream import StreamExecutionEnvironment
from pyflink.table import StreamTableEnvironment, Schema

env = StreamExecutionEnvironment.get_execution_environment()
env.set_parallelism(4)
t_env = StreamTableEnvironment.create(env)

# Register a table from a DataStream:
stream = env.from_source(ride_source, ride_watermarks, "gps")
t_env.create_temporary_view(
    "gps_events", stream,
    Schema.new_builder()
        .column_by_expression("proc_time", "PROCTIME()")
        .watermark("event_time",
                   "event_time - INTERVAL '5' SECOND")
        .build())

# Run SQL:
result = t_env.sql_query("SELECT ... FROM gps_events WHERE ...")

# Convert back to a DataStream:
out = t_env.to_data_stream(result)
env.execute("Uber GPS SQL Pipeline")</pre></div>
        </div>
        <div class="card p-24">
          <h3 class="mb-12">Table API vs DataStream Comparison</h3>
          ${[
            ['Abstraction level','High (declarative)','Low (imperative)'],
            ['Optimization','Query planner (Blink)','Manual'],
            ['State management','Automatic','Manual'],
            ['Flexibility','Moderate','Full'],
            ['Custom logic','Limited','Anything'],
            ['Best for','Aggregations, joins','Complex state machines'],
            ['Uber use','Aggregations, ETL','FraudDetector core'],
          ].map(([f,ta,ds]) => `
            <div style="display:grid;grid-template-columns:1.2fr 1fr 1fr;padding:6px 0;border-bottom:1px solid var(--border);font-size:11.5px">
              <span class="t-sec">${f}</span>
              <span style="color:#6366f1">${ta}</span>
              <span style="color:#FF6B35">${ds}</span>
            </div>
          `).join('')}
          <div style="display:grid;grid-template-columns:1.2fr 1fr 1fr;padding:4px 0;font-size:10px;font-weight:700;color:var(--text-secondary)"><span></span><span>TABLE API</span><span>DATASTREAM</span></div>
        </div>
      </div>
    </div>

    <div class="tab-content" data-tab="iq">
      <div class="iq-section" id="iq15-section"></div>
    </div>
  `;

  initRideSpine(container);

  // Tabs
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      container.querySelector(`.tab-content[data-tab="${btn.dataset.tab}"]`).classList.add('active');
    });
  });

  // Bridge button: jump from "What & Why" into the Query Explorer tab.
  const jumpBtn = container.querySelector('[data-jump]');
  if (jumpBtn) {
    jumpBtn.addEventListener('click', () => {
      const target = jumpBtn.dataset.jump;
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === target));
      container.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.dataset.tab === target));
      container.querySelector('.module-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // IQ
  const iqSec = container.querySelector('#iq15-section');
  iqSec.innerHTML = IQS.map((item, i) => `
    <div class="iq-item" id="iq15-${i}">
      <div class="iq-question" data-idx="${i}"><span>${item.q}</span><span class="iq-chevron">›</span></div>
      <div class="iq-answer">${item.a}</div>
    </div>
  `).join('');
  iqSec.querySelectorAll('.iq-question').forEach(q => {
    q.addEventListener('click', () => {
      const item = iqSec.querySelector(`#iq15-${q.dataset.idx}`);
      const open = item.classList.contains('open');
      iqSec.querySelectorAll('.iq-item').forEach(i => i.classList.remove('open'));
      if (!open) item.classList.add('open');
    });
  });

  // Query picker
  const picker = container.querySelector('#sql-picker');
  picker.innerHTML = QUERIES.map(q => `
    <button class="op-pill${q.id === selected.id ? ' active' : ''}" data-qid="${q.id}">
      ${q.icon} ${q.label}
      <span class="op-pill-cat">${q.category}</span>
    </button>
  `).join('');

  function renderDetail(q) {
    const detail = container.querySelector('#sql-detail');
    const cols = q.results.length ? Object.keys(q.results[0]) : [];
    detail.innerHTML = `
      <div class="sql-detail-grid">
        <div class="card p-24">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
            <span class="fs-28">${q.icon}</span>
            <div>
              <div style="font-size:17px;font-weight:700;color:var(--text)">${q.label}</div>
              <span class="badge" style="font-size:10px">${q.category}</span>
            </div>
          </div>
          <p style="color:var(--text-secondary);font-size:13.5px;line-height:1.7;margin:0 0 12px">${q.desc}</p>
          <div class="lc-uber-box">
            <div class="lc-uber-label">🚗 Uber Use Case</div>
            <p class="fs-125">${q.uber}</p>
          </div>
        </div>
        <div>
          <div class="eyebrow-flow">SQL Query</div>
          <div class="code-block" style="font-size:11.5px;max-height:280px;overflow-y:auto"><pre>${q.sql}</pre></div>
        </div>
        <div>
          <div class="eyebrow-flow">Table API / DataStream Plan</div>
          <div class="code-block" style="font-size:11px;max-height:280px;overflow-y:auto"><pre>${q.plan}</pre></div>
        </div>
        <div>
          <div class="eyebrow-flow">Result Rows (sample)</div>
          <div class="scroll-x">
            <table style="width:100%;border-collapse:collapse;font-size:12px">
              <thead>
                <tr>${cols.map(c => `<th style="padding:8px 12px;text-align:left;border-bottom:1px solid var(--border);color:var(--text-secondary);white-space:nowrap">${c}</th>`).join('')}</tr>
              </thead>
              <tbody>
                ${q.results.map(row => `
                  <tr style="border-bottom:1px solid var(--border)">
                    ${cols.map(c => `<td style="padding:7px 12px;color:var(--text);font-family:var(--font-mono,monospace);font-size:11.5px;white-space:nowrap">${row[c]}</td>`).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  picker.querySelectorAll('.op-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      selected = QUERIES.find(q => q.id === btn.dataset.qid);
      picker.querySelectorAll('.op-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderDetail(selected);
    });
  });

  renderDetail(selected);
}
