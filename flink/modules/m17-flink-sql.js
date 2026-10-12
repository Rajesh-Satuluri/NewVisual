// Module 17 — Flink SQL (advanced patterns)
// Focuses on production SQL patterns: CEP with MATCH_RECOGNIZE,
// CDC ingestion, EXPLAIN plan reading, and multi-sink INSERT INTO.

import { rideSpine, initRideSpine, rideCallout, scenarioList } from '../components/story-ui.js';
import { casesByModule } from '../data/interview-cases.js';

const PATTERNS = [
  {
    id:'cep',    label:'CEP / MATCH_RECOGNIZE', icon:'🔍', category:'Advanced',
    desc:'MATCH_RECOGNIZE lets you write Complex Event Processing queries in SQL — detect sequences and patterns across rows without writing a ProcessFunction.',
    uber:'Detect a "speeding-then-braking" pattern: driver accelerates >80 km/h then decelerates below 10 km/h within 30 seconds — risk indicator for harsh driving.',
    sql:`-- Detect harsh driving: fast then sudden stop
SELECT *
FROM gps_events
MATCH_RECOGNIZE (
  PARTITION BY driver_id
  ORDER BY event_time
  MEASURES
    FAST.speed_kmh  AS peak_speed,
    STOP.speed_kmh  AS final_speed,
    FAST.event_time AS pattern_start
  ONE ROW PER MATCH
  AFTER MATCH SKIP TO NEXT ROW
  PATTERN (FAST+ STOP)
  WITHIN INTERVAL '30' SECOND
  DEFINE
    FAST AS speed_kmh > 80,
    STOP AS speed_kmh < 10
) AS T`,
    notes:'MATCH_RECOGNIZE compiles to a NFA (Non-Deterministic Finite Automaton) in Flink\'s CEP library. It is stateful — pattern state lives in the operator\'s keyed state, one NFA per driver_id.',
  },
  {
    id:'cdc',    label:'CDC Ingestion', icon:'🔄', category:'Streaming ETL',
    desc:'Flink-CDC sources emit INSERT/UPDATE_BEFORE/UPDATE_AFTER/DELETE changelog rows. Flink SQL treats these as a dynamic table with full upsert semantics.',
    uber:'Stream MySQL driver_profiles table changes into Flink. Join with GPS event stream in real time to enrich fraud scoring with up-to-date driver tier.',
    sql:`-- CDC source: MySQL driver profiles
CREATE TABLE driver_profiles_cdc (
  driver_id STRING PRIMARY KEY NOT ENFORCED,
  tier      STRING,
  rating    DOUBLE,
  updated   TIMESTAMP(3),
  -- CDC metadata:
  PRIMARY KEY (driver_id) NOT ENFORCED
) WITH (
  'connector' = 'mysql-cdc',
  'hostname'  = 'mysql-prod',
  'database-name' = 'uber_drivers',
  'table-name'    = 'driver_profiles',
  'username'  = 'flink_cdc',
  'password'  = '***'
);

-- Join CDC stream with GPS events:
SELECT g.driver_id, g.speed_kmh,
       p.tier, p.rating, g.event_time
FROM gps_events AS g
JOIN driver_profiles_cdc FOR SYSTEM_TIME AS OF g.event_time AS p
  ON g.driver_id = p.driver_id`,
    notes:'The FOR SYSTEM_TIME AS OF clause enables temporal join — enrichment uses the driver profile that was current at the GPS event\'s event time, not the latest version.',
  },
  {
    id:'multisink', label:'Multi-Sink (Statement Set)', icon:'📤', category:'Streaming ETL',
    desc:'A StatementSet lets you run multiple INSERT INTO statements in a single Flink job, sharing the source parsing cost and checkpoint overhead.',
    uber:'From one GPS event stream: write speeding alerts to Kafka, write raw GPS to S3, and write hourly driver stats to PostgreSQL — three sinks, one job, one checkpoint.',
    sql:`# One source, three sinks — single job (PyFlink Table API)
stmts = t_env.create_statement_set()

# Sink 1: Kafka fraud alerts
stmts.add_insert_sql("""
  INSERT INTO fraud_alerts_kafka
  SELECT driver_id, speed_kmh, event_time
  FROM gps_events WHERE speed_kmh > 80
""")

# Sink 2: S3 raw events (Parquet)
stmts.add_insert_sql("""
  INSERT INTO gps_raw_s3
  SELECT * FROM gps_events
""")

# Sink 3: PostgreSQL hourly aggregates
stmts.add_insert_sql("""
  INSERT INTO driver_stats_pg
  SELECT driver_id,
    TUMBLE_START(event_time, INTERVAL '1' HOUR),
    COUNT(*), AVG(speed_kmh)
  FROM gps_events
  GROUP BY driver_id,
    TUMBLE(event_time, INTERVAL '1' HOUR)
""")

stmts.execute()   # one Flink job`,
    notes:'Without StatementSet, each INSERT INTO would be a separate job with its own Kafka source — tripling ingest cost. StatementSet DAG-fuses sources automatically.',
  },
  {
    id:'explain',  label:'EXPLAIN Plan', icon:'📋', category:'Optimization',
    desc:'EXPLAIN shows the optimized physical plan Flink\'s Blink planner generates. Use it to verify predicate pushdown, join order, and whether a window is translated correctly.',
    uber:'Before deploying any production SQL job, Uber\'s platform team runs EXPLAIN and validates: (1) filter pushed into source, (2) no cross-join (missing ON clause), (3) aggregation uses mini-batch.',
    sql:`-- Always EXPLAIN before deploying:
EXPLAIN PLAN FOR
SELECT driver_id,
  TUMBLE_START(event_time, INTERVAL '10' MINUTE),
  AVG(speed_kmh)
FROM gps_events
WHERE speed_kmh > 0       -- predicate pushdown?
GROUP BY driver_id,
  TUMBLE(event_time, INTERVAL '10' MINUTE);

-- Key things to check in output:
-- ✓ TableSourceScan shows pushdown=[speed_kmh > 0]
-- ✓ LocalWindowAggregate before GlobalWindowAggregate (two-phase)
-- ✓ No CartesianProduct (missing join key = full cross join)
-- ✓ MiniBatchAssigner if mini-batch enabled`,
    notes:'Two-phase window aggregation (LocalWindowAggregate + GlobalWindowAggregate) is Flink\'s equivalent of map-side combine — reduces shuffle data by pre-aggregating per subtask before the global merge.',
  },
  {
    id:'lookup',   label:'Lookup Join (Async)', icon:'🔗', category:'Joins',
    desc:'Lookup joins enrich a streaming fact with a slowly-changing dimension table queried on demand. Flink uses async I/O to batch and cache lookups.',
    uber:'Enrich GPS events with city/zone name from a Redis geo-lookup service — 50M unique geo-cells, updated every hour. Cache TTL=5min reduces Redis QPS by 95%.',
    sql:`-- Lookup join with async enrichment:
CREATE TABLE geo_zones (
  geo_cell  STRING,
  zone_name STRING,
  city      STRING,
  PRIMARY KEY (geo_cell) NOT ENFORCED
) WITH (
  'connector'   = 'jdbc',
  'url'         = 'jdbc:postgresql://geo-db:5432/zones',
  'table-name'  = 'geo_zones',
  'lookup.cache.max-rows'   = '100000',
  'lookup.cache.ttl'        = '5min',
  'lookup.max-retries'      = '3'
);

SELECT g.driver_id, g.speed_kmh,
       z.zone_name, z.city
FROM gps_events AS g
JOIN geo_zones FOR SYSTEM_TIME AS OF g.event_time AS z
  ON g.geo_cell = z.geo_cell`,
    notes:'lookup.cache.max-rows and lookup.cache.ttl enable built-in LRU caching in Flink SQL — without this every GPS event would hit the database, overwhelming it at 1M events/sec.',
  },
];

const IQS = [
  { q:'What is MATCH_RECOGNIZE and when would you use it over a ProcessFunction?', a:'MATCH_RECOGNIZE is Flink SQL\'s implementation of CEP — it detects ordered event sequences per partition using a declarative pattern language (like regex but for rows). Use it when the pattern is expressible as a sequence of row conditions with optional quantifiers (+, *, ?). Use a KeyedProcessFunction instead when: the pattern requires complex branching logic, you need to update state based on timer callbacks, or the detection logic involves external lookups. MATCH_RECOGNIZE is simpler to write but less flexible.' },
  { q:'How does Flink SQL handle CDC changelog streams?', a:'Flink SQL represents CDC data as a ChangelogStream with four message types: INSERT (+I), UPDATE_BEFORE (-U), UPDATE_AFTER (+U), and DELETE (-D). Aggregate functions and joins are aware of retraction: when an UPDATE_BEFORE arrives, the row is "un-aggregated" before the new value is added. This makes it possible to maintain correct rolling sums, counts, and joins over mutable source data. The upsert changelog (only +I and +U, no -U/-D) is the simpler variant used with primary-key sources.' },
  { q:'What is two-phase aggregation (local + global) in Flink SQL?', a:'Like map-side combine in MapReduce. Flink\'s Blink planner splits a GROUP BY aggregation into: (1) LocalWindowAggregate — pre-aggregates per subtask without shuffling (reduces data volume), (2) GlobalWindowAggregate — merges partial aggregates after shuffle. A COUNT(*) at parallelism 8 with 1M events/sec becomes: 8 local subtasks each counting their slice, then one global aggregator merging 8 partial counts. This cuts shuffle data by ~8×.' },
  { q:'What is a StatementSet and why is it important for production SQL pipelines?', a:'A StatementSet bundles multiple INSERT INTO statements into a single Flink job execution. Without it, each INSERT INTO statement creates a separate job — each with its own source readers, deserializers, and checkpoints. If two jobs share a Kafka source, each reads the same topic independently, doubling broker load. StatementSet lets the planner DAG-merge the shared source, parse each record once, then fan it out to multiple sinks. Uber uses StatementSet to run 10+ downstream materializations from one GPS source in a single job.' },
  { q:'How do you optimize a slow Flink SQL window aggregation in production?', a:'In priority order: (1) Enable mini-batch: table.exec.mini-batch.enabled=true, mini-batch.allow-latency=5s — buffers records before processing, reducing state access frequency. (2) Enable two-phase aggregation (on by default with Blink planner). (3) Check EXPLAIN for filter pushdown — WHERE clauses should appear inside TableSourceScan. (4) Increase parallelism for the aggregation operator if it\'s the bottleneck. (5) If state is large, switch to RocksDB. (6) For deduplication-heavy pipelines, enable table.exec.deduplicate.mini-batch.enabled.' },
];

// ── "What & Why" foundations (additive) ──────────────────────────
const WHY_REASONS = [
  { icon: '🔍', title: 'Detect sequences', body: '<code>MATCH_RECOGNIZE</code> finds ordered patterns (speed-up then hard-stop) in SQL — CEP without hand-writing a ProcessFunction and NFA.' },
  { icon: '🔄', title: 'Ingest database changes', body: 'CDC sources turn a MySQL binlog into a changelog table, so a dimension (driver tier) stays live inside the stream.' },
  { icon: '📤', title: 'Fan out once', body: 'A StatementSet runs many <code>INSERT INTO</code> sinks in one job, parsing the source once instead of N times.' },
  { icon: '📋', title: 'Read the plan', body: '<code>EXPLAIN</code> reveals predicate pushdown, join order, and two-phase aggregation — catching a cross-join before it reaches production.' },
  { icon: '🔗', title: 'Enrich on demand', body: 'Async lookup joins hit an external table per event with built-in LRU caching, so 1M events/sec don\'t overwhelm the DB.' },
  { icon: '⚡', title: 'Tune for scale', body: 'Mini-batch, two-phase aggregation, and RocksDB turn a correct-but-slow query into one that holds at peak traffic.' },
];

const PROBLEMS = [
  { naive: 'Hand-code harsh-driving detection in a ProcessFunction.', fail: 'A bespoke NFA is <b>complex and hard to maintain</b> for what is a declarable sequence.', fix: '<code>MATCH_RECOGNIZE</code> expresses the pattern as <code>PATTERN (FAST+ STOP)</code> in SQL.' },
  { naive: 'Run each INSERT INTO sink as its own job.', fail: 'Every job re-reads the Kafka source — <b>N× the broker load</b> and N× the checkpoints.', fix: 'A StatementSet DAG-fuses the shared source and fans out to all sinks in one job.' },
  { naive: 'Deploy SQL without reading its plan.', fail: 'A missing <code>ON</code> clause silently becomes a <b>cross-join</b> that melts the cluster.', fix: '<code>EXPLAIN</code> surfaces the physical plan so you catch it before deploy.' },
  { naive: 'Join the stream to a dimension with a plain per-event query.', fail: 'Every event hits the database — it <b>can\'t survive</b> 1M lookups/sec.', fix: 'Async lookup joins batch and cache (<code>lookup.cache.ttl</code>), cutting DB QPS ~95%.' },
];

const WHY_HTML = `
  <div class="sm-wrap">
    <div class="sm-def card">
      <div class="sm-def-ic">🧩</div>
      <div>
        <div class="sm-def-eyebrow">What are advanced SQL patterns?</div>
        <p class="sm-def-lead">Basic Flink SQL (module 15) covers filters, windows, and joins. <b>Advanced patterns</b> are the production-grade features real pipelines depend on: <b>CEP</b> (MATCH_RECOGNIZE), <b>CDC</b> ingestion, multi-sink <b>StatementSets</b>, <b>EXPLAIN</b> plan reading, and <b>async lookup joins</b>. They turn SQL from a query tool into a way to ship complex, efficient streaming jobs. On ride <b>R-4471</b>, they detect harsh-driving patterns and enrich events at Uber scale.</p>
      </div>
    </div>

    <div class="section-header" style="margin:26px 0 12px">
      <div class="section-title">Basic SQL vs. production patterns</div>
      <div class="section-desc">Where the simple layer ends and these patterns begin.</div>
    </div>
    <div class="sm-vs">
      <div class="sm-vs-card stateless">
        <div class="sm-vs-head">🧮 Basic SQL (m15)</div>
        <p class="sm-vs-sub">Set-based transformations.</p>
        <ul>
          <li>SELECT / WHERE / GROUP BY</li>
          <li>TUMBLE / HOP windows</li>
          <li>Simple joins</li>
        </ul>
        <div class="sm-vs-note">Enough for most aggregations and ETL.</div>
      </div>
      <div class="sm-vs-card stateful">
        <div class="sm-vs-head">🚀 Production patterns (m17)</div>
        <p class="sm-vs-sub">The features real pipelines need.</p>
        <ul>
          <li>CEP, CDC, StatementSets</li>
          <li>EXPLAIN-driven optimization</li>
          <li>Async cached lookups</li>
        </ul>
        <div class="sm-vs-note">Complex detection and enrichment at 1M events/sec.</div>
      </div>
    </div>

    <div class="section-header" style="margin:26px 0 12px">
      <div class="section-title">Why production SQL needs more</div>
      <div class="section-desc">Six patterns and what each buys you.</div>
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
      <div class="section-title">The problem these patterns solve</div>
      <div class="section-desc">Four production pains basic SQL leaves — and the pattern that fixes each.</div>
    </div>
    <div class="sm-prob-list">
      ${PROBLEMS.map((p, i) => `
        <div class="sm-prob">
          <div class="sm-prob-no">${i + 1}</div>
          <div class="sm-prob-body">
            <div class="sm-prob-naive"><span class="sm-tag naive">Naïve</span>${p.naive}</div>
            <div class="sm-prob-fail"><span class="sm-tag fail">Breaks</span>${p.fail}</div>
            <div class="sm-prob-fix"><span class="sm-tag fix">Pattern</span>${p.fix}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="section-header" style="margin:26px 0 12px">
      <div class="section-title">Which pattern, when</div>
    </div>
    <div class="sm-keyed card">
      <p>Each pattern answers a specific production question:</p>
      <ul>
        <li><b>Ordered event pattern?</b> → <code>MATCH_RECOGNIZE</code> (CEP).</li>
        <li><b>Live dimension from a DB?</b> → CDC source + temporal join.</li>
        <li><b>Many sinks from one source?</b> → StatementSet.</li>
        <li><b>Is my query efficient?</b> → <code>EXPLAIN</code>, then mini-batch / two-phase tuning.</li>
        <li><b>Enrich from a huge table?</b> → async lookup join with cache TTL.</li>
      </ul>
      <div class="sm-keyed-flow">
        basic SQL works <span class="sm-arrow">→</span> hit a <b>production need</b> <span class="sm-arrow">→</span> reach for the matching pattern <span class="sm-arrow">→</span> <code>EXPLAIN</code> &amp; tune <span class="sm-arrow">→</span> ship
      </div>
    </div>

    <div class="sm-bridge" style="margin-top:26px">
      <div class="sm-bridge-txt">
        <div class="sm-bridge-k">Now study each pattern</div>
        <p>You know <b>why</b> each pattern exists — explore MATCH_RECOGNIZE, CDC, StatementSets, EXPLAIN, and lookup joins with full SQL and how each works.</p>
      </div>
      <button class="sm-bridge-btn" data-jump="patterns">Open the Pattern Explorer →</button>
    </div>
  </div>
`;

export function mount(container) {
  let selected = PATTERNS[0];

  container.innerHTML = `
    ${rideSpine({ active: ['LOCATION_UPDATED', 'RIDE_COMPLETED'], incidents: ['DEFECT-6'] })}
    <div class="module-hero">
      <div class="module-hero-content">
        <span class="module-badge">Module 17</span>
        <h1 class="module-title">Flink SQL — Advanced Patterns</h1>
        <p class="module-subtitle">CEP with MATCH_RECOGNIZE, CDC ingestion, multi-sink StatementSets, EXPLAIN plan reading, and async lookup joins — production SQL at Uber scale.</p>
      </div>
    </div>
    <div class="module-tabs">
      <button class="tab-btn active" data-tab="why">What &amp; Why</button>
      <button class="tab-btn" data-tab="patterns">Pattern Explorer</button>
      <button class="tab-btn" data-tab="iq">Interview Q&amp;A</button>
    </div>

    <div class="tab-content active" data-tab="why">
      ${WHY_HTML}
    </div>

    <div class="tab-content" data-tab="patterns">
      ${rideCallout('LOCATION_UPDATED', { openEvent: false })}
      <div class="sql-picker" id="sql17-picker"></div>
      <div id="sql17-detail" style="padding:20px 28px 28px"></div>
    </div>

    <div class="tab-content" data-tab="iq">
      <div class="section-header" style="margin-bottom:8px">
        <div class="section-title">Interview corner cases — on ride R-4471</div>
        <div class="section-desc">CEP/MATCH_RECOGNIZE for surge detection — the PyFlink-vs-Java-CEP gap.</div>
      </div>
      <div id="sql-scenarios"></div>
      <div class="section-header" style="margin:22px 0 8px"><div class="section-title">More SQL Q&amp;A</div></div>
      <div class="iq-section" id="iq17-section"></div>
    </div>
  `;

  initRideSpine(container);
  const sqlScen = container.querySelector('#sql-scenarios');
  if (sqlScen) sqlScen.innerHTML = scenarioList(casesByModule('m17'));

  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      container.querySelector(`.tab-content[data-tab="${btn.dataset.tab}"]`).classList.add('active');
    });
  });

  // Bridge button: jump from "What & Why" into the Pattern Explorer tab.
  const jumpBtn = container.querySelector('[data-jump]');
  if (jumpBtn) {
    jumpBtn.addEventListener('click', () => {
      const target = jumpBtn.dataset.jump;
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === target));
      container.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.dataset.tab === target));
      container.querySelector('.module-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  const iqSec = container.querySelector('#iq17-section');
  iqSec.innerHTML = IQS.map((item, i) => `
    <div class="iq-item" id="iq17-${i}">
      <div class="iq-question" data-idx="${i}"><span>${item.q}</span><span class="iq-chevron">›</span></div>
      <div class="iq-answer">${item.a}</div>
    </div>
  `).join('');
  iqSec.querySelectorAll('.iq-question').forEach(q => {
    q.addEventListener('click', () => {
      const item = iqSec.querySelector(`#iq17-${q.dataset.idx}`);
      const open = item.classList.contains('open');
      iqSec.querySelectorAll('.iq-item').forEach(i => i.classList.remove('open'));
      if (!open) item.classList.add('open');
    });
  });

  const picker = container.querySelector('#sql17-picker');
  picker.innerHTML = PATTERNS.map(p => `
    <button class="op-pill${p.id === selected.id ? ' active' : ''}" data-pid="${p.id}">
      ${p.icon} ${p.label} <span class="op-pill-cat">${p.category}</span>
    </button>
  `).join('');

  function renderDetail(p) {
    container.querySelector('#sql17-detail').innerHTML = `
      <div class="grid-2 gap-20">
        <div class="card p-24">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
            <span class="fs-28">${p.icon}</span>
            <div>
              <div style="font-size:17px;font-weight:700;color:var(--text)">${p.label}</div>
              <span class="badge" style="font-size:10px">${p.category}</span>
            </div>
          </div>
          <p style="color:var(--text-secondary);font-size:13.5px;line-height:1.7;margin:0 0 14px">${p.desc}</p>
          <div class="lc-uber-box">
            <div class="lc-uber-label">🚗 Uber Use Case</div>
            <p class="fs-125">${p.uber}</p>
          </div>
          <div style="margin-top:14px;padding:12px 14px;background:var(--surface2);border-radius:8px;border-left:3px solid var(--accent)">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--accent);margin-bottom:6px">How it works</div>
            <p style="font-size:12.5px;color:var(--text-secondary);margin:0">${p.notes}</p>
          </div>
        </div>
        <div>
          <div class="eyebrow">SQL / Code</div>
          <div class="code-block" style="font-size:11px;max-height:480px;overflow-y:auto"><pre>${p.sql}</pre></div>
        </div>
      </div>
    `;
  }

  picker.querySelectorAll('.op-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      selected = PATTERNS.find(p => p.id === btn.dataset.pid);
      picker.querySelectorAll('.op-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderDetail(selected);
    });
  });

  renderDetail(selected);
}
