// Module 19 — Uber End-to-End Pipeline (Capstone)
// Interactive walkthrough of Uber's complete Flink streaming platform:
// GPS ingest → fraud detection → ETA computation → driver stats → data lake

const STAGES = [
  {
    id: 'ingest',
    label: 'GPS Ingest',
    icon: '📡',
    color: '#6366f1',
    tagline: '1M events/sec from 3M drivers',
    desc: 'KafkaSource reads from "driver-locations" topic (1024 partitions). Each event carries driver_id, lat/lon, speed_kmh, and event_time. Source parallelism = 256 (4 partitions each). Watermark strategy: BoundedOutOfOrdernessWatermarks with 5-second tolerance.',
    uber: 'Every driver app pings every 4 seconds. At peak (Friday 6pm) Uber sees 1.2M events/sec. The Kafka cluster has 12 brokers; Flink consumes from all 1024 partitions concurrently.',
    metrics: { throughput: '1M eps', latency: '< 5ms', parallelism: 256, partitions: 1024 },
    code: `KafkaSource<GPSEvent> source = KafkaSource
  .<GPSEvent>builder()
  .setBootstrapServers("kafka:9092")
  .setTopics("driver-locations")
  .setGroupId("flink-pipeline")
  .setStartingOffsets(
      OffsetsInitializer.committedOffsets(
          OffsetResetStrategy.LATEST))
  .setValueOnlyDeserializer(new GPSSchema())
  .build();

DataStream<GPSEvent> gps = env.fromSource(
  source,
  WatermarkStrategy
    .<GPSEvent>forBoundedOutOfOrderness(
        Duration.ofSeconds(5))
    .withTimestampAssigner(
        (e,t) -> e.eventTimeMs),
  "GPS-Source");`,
  },
  {
    id: 'enrich',
    label: 'Enrichment',
    icon: '🔗',
    color: '#8b5cf6',
    tagline: 'Async driver profile lookup',
    desc: 'AsyncDataStream enriches each GPS ping with driver tier and rating from the driver-profiles service. Async I/O allows 500 concurrent in-flight requests per subtask. Results cached in a local Guava cache with 5-minute TTL to reduce service QPS by 95%.',
    uber: 'Driver tier (Gold/Silver/Basic) affects fraud thresholds. A Gold driver triggering the same speed pattern as a new driver gets a higher alert threshold. The enrichment service is Redis-backed at 99th percentile < 2ms.',
    metrics: { throughput: '1M eps', latency: '< 8ms', parallelism: 256, concurrency: 500 },
    code: `DataStream<EnrichedEvent> enriched =
  AsyncDataStream.unorderedWait(
    gps,
    new DriverProfileAsyncFunction(
        redisClient,
        cacheSpec(5, TimeUnit.MINUTES, 100_000)),
    500,
    TimeUnit.MILLISECONDS,
    500  // max concurrent requests
  );

// AsyncFunction implementation:
class DriverProfileAsyncFunction
    extends RichAsyncFunction<GPSEvent, EnrichedEvent> {
  @Override
  public void asyncInvoke(GPSEvent e,
      ResultFuture<EnrichedEvent> out) {
    cache.getAsync(e.driverId)
      .thenAccept(profile ->
          out.complete(List.of(
              EnrichedEvent.of(e, profile))));
  }
}`,
  },
  {
    id: 'fraud',
    label: 'Fraud Detection',
    icon: '🚨',
    color: '#ef4444',
    tagline: 'CEP in < 10ms',
    desc: 'KeyedProcessFunction keyed on driver_id maintains a sliding window of the last 60 GPS pings in ValueState. Three fraud rules run in parallel: (1) impossible speed > 250 km/h, (2) GPS spoofing (distance > physics allows), (3) MATCH_RECOGNIZE pattern for rapid location jumps. Alerts written to fraud-alerts Kafka topic.',
    uber: '14M trips/day. Uber estimates 0.3% fraud rate if unchecked. FraudDetector prevents > $40M/year in losses. End-to-end alert latency target: 10ms p99. RocksDB backend for the 60-ping window per driver.',
    metrics: { throughput: '1M eps', latency: '< 10ms p99', parallelism: 512, alertRate: '~3K/min' },
    code: `KeyedStream<EnrichedEvent, String> keyed =
  enriched.keyBy(e -> e.driverId);

DataStream<FraudAlert> alerts =
  keyed.process(new FraudDetectorFunction());

class FraudDetectorFunction extends
    KeyedProcessFunction<String, EnrichedEvent, FraudAlert> {

  ValueState<Deque<GPSEvent>> windowState;

  @Override public void processElement(
      EnrichedEvent e, Context ctx,
      Collector<FraudAlert> out) {
    Deque<GPSEvent> window = windowState.value();
    window.addLast(e.gps);
    if (window.size() > 60) window.pollFirst();
    windowState.update(window);

    // Rule 1: impossible speed
    if (e.gps.speedKmh > 250) {
      out.collect(FraudAlert.of(e, "IMPOSSIBLE_SPEED"));
    }
    // Rule 2: GPS spoof check
    if (window.size() >= 2) {
      double dist = haversine(
          window.peekLast(), e.gps);
      double timeSec = (e.gps.eventTimeMs
          - window.peekFirst().eventTimeMs) / 1000.0;
      if (dist / timeSec > 69.44) // 250 km/h in m/s
        out.collect(FraudAlert.of(e, "GPS_SPOOF"));
    }
  }
}`,
  },
  {
    id: 'eta',
    label: 'ETA Computation',
    icon: '⏱️',
    color: '#f59e0b',
    tagline: 'Rolling 5-min window per zone',
    desc: 'TumblingEventTimeWindows (5 minutes) per geo_cell key compute: average speed, median speed, 95th-percentile speed. Output feeds the ETA model. ProcessWindowFunction accesses WindowState for full window contents; IncrementalAggregation pre-aggregates per subtask.',
    uber: 'ETA accuracy drives rider satisfaction. Zone-level speed aggregations from real Flink output reduced Uber ETA MAPE (mean absolute percentage error) from 18% to 11%. Window output latency: 5 minutes + watermark propagation.',
    metrics: { throughput: '200K eps', latency: '5min window', parallelism: 128, geoZones: '2M' },
    code: `DataStream<ZoneStats> etaFeed = enriched
  .keyBy(e -> e.geoCell)
  .window(TumblingEventTimeWindows
      .of(Time.minutes(5)))
  .aggregate(
    new SpeedAggregator(),    // incremental
    new ZoneStatsFunction()   // per-window enrichment
  );

class SpeedAggregator implements
    AggregateFunction<EnrichedEvent,
                      SpeedAccum, SpeedAccum> {
  @Override
  public SpeedAccum add(
      EnrichedEvent e, SpeedAccum acc) {
    acc.sum += e.gps.speedKmh;
    acc.count++;
    acc.speeds.add(e.gps.speedKmh);
    return acc;
  }
  @Override
  public SpeedAccum getResult(SpeedAccum acc) {
    return acc;  // passed to ProcessWindowFunction
  }
}`,
  },
  {
    id: 'stats',
    label: 'Driver Stats',
    icon: '📊',
    color: '#10b981',
    tagline: 'Hourly aggregates to PostgreSQL',
    desc: 'TumblingEventTimeWindows (1 hour) keyed by driver_id compute trip count, total distance, average speed, and active minutes. JdbcSink upserts into PostgreSQL using ON CONFLICT DO UPDATE. Used by the Ops Dashboard for real-time driver performance metrics.',
    uber: 'The Ops Dashboard shows 3M+ driver statistics refreshed every hour. JdbcSink batch size = 5000 rows, flush interval = 1s. Upsert ensures idempotency across restarts. State backend: HashMapStateBackend (window fits in memory).',
    metrics: { throughput: '50K eps', latency: '1hr window', parallelism: 64, sinkBatch: 5000 },
    code: `DataStream<DriverStats> stats = enriched
  .keyBy(e -> e.driverId)
  .window(TumblingEventTimeWindows
      .of(Time.hours(1)))
  .process(new DriverStatsFunction());

// Sink: PostgreSQL upsert
SinkFunction<DriverStats> pgSink = JdbcSink.sink(
  "INSERT INTO driver_stats"
  + "(driver_id,trip_count,total_km,avg_speed,hour)"
  + " VALUES(?,?,?,?,?)"
  + " ON CONFLICT(driver_id,hour)"
  + " DO UPDATE SET"
  + "   trip_count=EXCLUDED.trip_count,"
  + "   total_km=EXCLUDED.total_km,"
  + "   avg_speed=EXCLUDED.avg_speed",
  (stmt, s) -> {
    stmt.setString(1, s.driverId);
    stmt.setLong(2, s.tripCount);
    stmt.setDouble(3, s.totalKm);
    stmt.setDouble(4, s.avgSpeed);
    stmt.setTimestamp(5, s.windowHour);
  },
  JdbcExecutionOptions.builder()
    .withBatchSize(5000)
    .withBatchIntervalMs(1000L)
    .build(),
  connOptions);`,
  },
  {
    id: 'lake',
    label: 'Data Lake',
    icon: '🏔️',
    color: '#3b82f6',
    tagline: 'S3 Parquet + Iceberg',
    desc: 'FileSink writes raw GPS events to S3 in Parquet format, partitioned by date/hour. Iceberg sink writes enriched events with UPSERT semantics for downstream Spark/Presto ML training. OnCheckpointRollingPolicy ensures file commits are aligned with Flink checkpoints for exactly-once guarantees.',
    uber: 'GPS data lake: 2.5TB/day in Parquet. Iceberg tables enable time travel queries for model debugging ("what did the model see at 6pm on Friday?"). Presto queries the same Iceberg tables Flink writes — no ETL pipeline needed.',
    metrics: { throughput: '1M eps', latency: '5min files', parallelism: 128, dailySize: '2.5TB' },
    code: `// Raw GPS → S3 Parquet (FileSink)
FileSink<GPSEvent> s3Sink = FileSink
  .forBulkFormat(
    new Path("s3://uber-datalake/gps-raw/"),
    ParquetAvroWriters
        .forReflectRecord(GPSEvent.class))
  .withBucketAssigner(
    new DateTimeBucketAssigner<>("yyyy-MM-dd/HH"))
  .withRollingPolicy(
    OnCheckpointRollingPolicy.build())
  .build();

// Enriched → Iceberg (upsert)
tableEnv.executeSql("""
  INSERT INTO uber_catalog.gps.enriched_events
  SELECT driver_id, lat, lon, speed_kmh,
         tier, rating, event_time
  FROM enriched_stream
""");`,
  },
];

const CHECKPOINTS = [
  { label: 'Interval', value: '30s', note: 'Production target: 30s checkpoint interval' },
  { label: 'Timeout', value: '5min', note: 'Checkpoint fails if not complete in 5 minutes' },
  { label: 'Mode', value: 'Exactly-Once', note: 'Two-phase commit with KafkaSink' },
  { label: 'Concurrent', value: '1', note: 'Only one checkpoint in-flight at a time' },
  { label: 'State Backend', value: 'RocksDB', note: 'Incremental checkpoints to S3' },
  { label: 'Savepoints', value: 'Before deploy', note: 'Manual savepoint before every upgrade' },
];

const IQS = [
  { q:'How does Uber ensure exactly-once end-to-end in this pipeline?', a:'Three layers: (1) KafkaSource checkpoints offsets into Flink state — on recovery, it replays from the last committed offset. (2) FraudDetector and window operators restore their keyed state from the RocksDB snapshot at the last checkpoint. (3) KafkaSink uses Kafka transactions (2PC): records are pre-written to Kafka in a transaction; the transaction commits only when Flink\'s checkpoint completes. If the job fails mid-checkpoint, the transaction aborts and Kafka consumers never see the uncommitted records. FileSink uses in-progress/pending/finished file state machine — files become visible to S3 readers only after checkpoint confirms them.' },
  { q:'What happens when a single TaskManager crashes in production?', a:'Flink detects the failure via heartbeat timeout (~10s). JobManager requests new containers from YARN/Kubernetes. The job restores from the last successful checkpoint (at most 30 seconds of re-processing). All operator state (fraud window, driver stats accumulators) is restored from RocksDB snapshots stored on S3. Kafka offsets are reset to the checkpoint position, so events from the failure window are re-read and re-processed. Because all sinks are idempotent (Kafka 2PC, JDBC upsert), duplicate processing produces the same result as if the crash never happened.' },
  { q:'How does the async enrichment maintain event ordering?', a:'AsyncDataStream.unorderedWait() is used — this maximizes throughput by returning enriched events as soon as the async call completes, regardless of arrival order. Watermarks are still propagated correctly because Flink\'s async operator holds watermarks until all in-flight requests older than the watermark are complete. For fraud detection (which uses ProcessWindowFunction internally) ordering doesn\'t matter because it works on keyed state, not event sequence. If strict ordering were required, AsyncDataStream.orderedWait() would be used at the cost of head-of-line blocking.' },
  { q:'How would you handle a surge to 3x normal throughput (Black Friday)?', a:'Flink on Kubernetes with reactive mode auto-scales: as the Kafka consumer lag grows, the autoscaler increases TaskManager count. Parallelism scales proportionally. Key considerations: (1) RocksDB state may need more memory — use off-heap memory pools. (2) Checkpoint duration grows with state size — increase checkpoint timeout during surge. (3) JdbcSink PostgreSQL may become the bottleneck — add a buffer in front and use connection pooling. (4) Fraud detector\'s keyed state is partitioned by driver_id, so adding more subtasks just redistributes the key space. Uber uses KEDA (Kubernetes Event-Driven Autoscaler) triggered on Kafka consumer lag metrics.' },
  { q:'What metrics do you monitor in production for this pipeline?', a:'Five key metrics: (1) numRecordsInPerSecond per source subtask — drop = Kafka lag spike. (2) currentOutputWatermark vs system clock — gap = event time lag, indicates late data. (3) lastCheckpointDuration and lastCheckpointSize — both trending up = state explosion. (4) numBytesInPerSecond at JdbcSink — spike = upsert batching falling behind. (5) Operator backpressure ratio — sustained > 0.5 = downstream bottleneck. Uber uses Flink metrics pushed to M3 (their internal Prometheus-like system) with Grafana dashboards. PagerDuty alerts on checkpoint duration > 3min or backpressure > 0.8 for > 60s.' },
];

export function mount(container) {
  let selectedStage = STAGES[0];
  let animHandle = null;
  let animStep = 0;

  container.innerHTML = `
    <div class="module-hero">
      <div class="module-hero-content">
        <span class="module-badge">Module 19</span>
        <h1 class="module-title">Uber End-to-End Pipeline</h1>
        <p class="module-subtitle">The complete Flink streaming platform at Uber — GPS ingest to fraud detection, ETA, driver stats, and data lake. 1M events/sec, exactly-once, six production stages.</p>
      </div>
    </div>
    <div class="module-tabs">
      <button class="tab-btn active" data-tab="pipeline">Pipeline Explorer</button>
      <button class="tab-btn" data-tab="config">Job Config</button>
      <button class="tab-btn" data-tab="iq">Interview Q&amp;A</button>
    </div>

    <div class="tab-content active" data-tab="pipeline">
      <div class="p19-flow" id="p19-flow"></div>
      <div id="p19-detail" style="padding:0 28px 28px"></div>
    </div>

    <div class="tab-content" data-tab="config">
      <div style="padding:28px">
        <div class="grid-2" style="gap:20px;margin-bottom:20px">
          <div class="card p-24">
            <div class="card-title">Checkpoint Configuration</div>
            <table style="width:100%;border-collapse:collapse">
              ${CHECKPOINTS.map(c => `
                <tr style="border-bottom:1px solid var(--border)">
                  <td style="padding:10px 0;font-size:12px;font-weight:600;color:var(--text);width:40%">${c.label}</td>
                  <td style="padding:10px 0;font-size:12px"><span class="badge">${c.value}</span></td>
                  <td style="padding:10px 0;font-size:11px;color:var(--text-secondary)">${c.note}</td>
                </tr>`).join('')}
            </table>
          </div>
          <div class="card p-24">
            <div class="card-title">Job Resource Profile</div>
            <div class="code-block fs-11"><pre>// Flink Job configuration
StreamExecutionEnvironment env =
  StreamExecutionEnvironment
    .getExecutionEnvironment();

// Checkpointing
env.enableCheckpointing(30_000); // 30s
env.getCheckpointConfig()
  .setCheckpointingMode(
      CheckpointingMode.EXACTLY_ONCE);
env.getCheckpointConfig()
  .setCheckpointTimeout(300_000); // 5min
env.getCheckpointConfig()
  .setMaxConcurrentCheckpoints(1);

// State backend: RocksDB on S3
env.setStateBackend(
  new EmbeddedRocksDBStateBackend(true));
env.getCheckpointConfig()
  .setCheckpointStorage(
      "s3://uber-flink/checkpoints/");

// Parallelism
env.setParallelism(256);

// Restart strategy
env.setRestartStrategy(
  RestartStrategies
    .exponentialDelayRestart(
        Time.seconds(1),
        Time.seconds(60),
        2.0, // backoff multiplier
        Time.minutes(5),
        0.1  // jitter
    ));</pre></div>
          </div>
        </div>
        <div class="card p-24">
          <div class="card-title">Full Pipeline Assembly</div>
          <div class="code-block" style="font-size:11px;max-height:420px;overflow-y:auto"><pre>// === UBER GPS FRAUD PIPELINE ===
// 1. Ingest
DataStream&lt;GPSEvent&gt; gps = env.fromSource(
  kafkaSource, watermarkStrategy, "GPS-Source");

// 2. Enrich (async, unordered)
DataStream&lt;EnrichedEvent&gt; enriched =
  AsyncDataStream.unorderedWait(
    gps, new DriverProfileLookup(),
    500, TimeUnit.MILLISECONDS, 500);

// 3. Fraud detection (keyed, stateful)
DataStream&lt;FraudAlert&gt; alerts = enriched
  .keyBy(e -&gt; e.driverId)
  .process(new FraudDetectorFunction());

// 4. ETA feed (5-min window per zone)
DataStream&lt;ZoneStats&gt; etaFeed = enriched
  .keyBy(e -&gt; e.geoCell)
  .window(TumblingEventTimeWindows.of(Time.minutes(5)))
  .aggregate(new SpeedAgg(), new ZoneStatsWin());

// 5. Driver stats (hourly)
DataStream&lt;DriverStats&gt; driverStats = enriched
  .keyBy(e -&gt; e.driverId)
  .window(TumblingEventTimeWindows.of(Time.hours(1)))
  .process(new DriverStatsFunction());

// === SINKS (StatementSet pattern) ===
// Fraud alerts → Kafka
alerts.sinkTo(fraudKafkaSink);

// ETA → Kafka
etaFeed.sinkTo(etaKafkaSink);

// Driver stats → PostgreSQL
driverStats.addSink(pgSink);

// Raw GPS → S3
gps.sinkTo(s3FileSink);

// Enriched → Iceberg
// (via Flink SQL Table API)

env.execute("Uber-GPS-Fraud-Pipeline");</pre></div>
        </div>
      </div>
    </div>

    <div class="tab-content" data-tab="iq">
      <div class="iq-section" id="iq19-section"></div>
    </div>
  `;

  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      container.querySelector(`.tab-content[data-tab="${btn.dataset.tab}"]`).classList.add('active');
    });
  });

  // IQ section
  const iqSec = container.querySelector('#iq19-section');
  iqSec.innerHTML = IQS.map((item, i) => `
    <div class="iq-item" id="iq19-${i}">
      <div class="iq-question" data-idx="${i}"><span>${item.q}</span><span class="iq-chevron">›</span></div>
      <div class="iq-answer">${item.a}</div>
    </div>
  `).join('');
  iqSec.querySelectorAll('.iq-question').forEach(q => {
    q.addEventListener('click', () => {
      const item = iqSec.querySelector(`#iq19-${q.dataset.idx}`);
      const open = item.classList.contains('open');
      iqSec.querySelectorAll('.iq-item').forEach(i => i.classList.remove('open'));
      if (!open) item.classList.add('open');
    });
  });

  // Pipeline flow bar
  const flow = container.querySelector('#p19-flow');
  flow.innerHTML = STAGES.map((s, i) => `
    <div class="p19-stage${s.id === selectedStage.id ? ' active' : ''}" data-sid="${s.id}" style="--stageColor:${s.color}">
      <span class="p19-icon">${s.icon}</span>
      <div class="p19-label">${s.label}</div>
      <div class="p19-tagline">${s.tagline}</div>
      ${i < STAGES.length - 1 ? '<div class="p19-arrow">→</div>' : ''}
    </div>
  `).join('');

  function renderDetail(s) {
    container.querySelector('#p19-detail').innerHTML = `
      <div class="grid-2 gap-20">
        <div class="card" style="padding:24px;border-left:4px solid ${s.color}">
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">
            <span class="fs-36">${s.icon}</span>
            <div>
              <div style="font-size:19px;font-weight:700;color:${s.color}">${s.label}</div>
              <div style="font-size:11px;color:var(--text-secondary);margin-top:3px">${s.tagline}</div>
            </div>
          </div>
          <p style="color:var(--text-secondary);font-size:13.5px;line-height:1.7;margin:0 0 14px">${s.desc}</p>
          <div class="lc-uber-box">
            <div class="lc-uber-label">🚗 Uber Production Reality</div>
            <p class="fs-125">${s.uber}</p>
          </div>
          <div style="margin-top:16px;display:grid;grid-template-columns:repeat(2,1fr);gap:10px" id="p19-metrics">
            ${Object.entries(s.metrics).map(([k, v]) => `
              <div style="background:var(--surface2);border-radius:8px;padding:10px 12px">
                <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:${s.color};letter-spacing:.5px">${k.replace(/([A-Z])/g,' $1').trim()}</div>
                <div style="font-size:16px;font-weight:700;color:var(--text);margin-top:4px">${v}</div>
              </div>`).join('')}
          </div>
        </div>
        <div>
          <div class="eyebrow">Production Code</div>
          <div class="code-block" style="font-size:11px;max-height:520px;overflow-y:auto"><pre>${s.code}</pre></div>
        </div>
      </div>
    `;
  }

  flow.querySelectorAll('.p19-stage').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedStage = STAGES.find(s => s.id === btn.dataset.sid);
      flow.querySelectorAll('.p19-stage').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderDetail(selectedStage);
    });
  });

  renderDetail(selectedStage);
}
