// Cheat Sheet — quick reference for the APIs, configs and CLI you actually reach for.
const CARDS = [
  { icon: '🧩', title: 'DataStream API essentials', rows: [
    ['Map / filter', 'stream.map(x -> ...).filter(x -> ...)'],
    ['Key by field', 'stream.keyBy(e -> e.driverId)'],
    ['Tumbling window', '.window(TumblingEventTimeWindows.of(Time.seconds(10)))'],
    ['Sliding window', '.window(SlidingEventTimeWindows.of(size, slide))'],
    ['Session window', '.window(EventTimeSessionWindows.withGap(Time.minutes(5)))'],
    ['Low-level fn', '.process(new KeyedProcessFunction<>() { ... })'],
    ['Async I/O', 'AsyncDataStream.unorderedWait(stream, fn, 1, SECONDS)'],
  ]},
  { icon: '💧', title: 'Watermarks & time', rows: [
    ['Bounded OOO', 'WatermarkStrategy.forBoundedOutOfOrderness(Duration.ofSeconds(5))'],
    ['Timestamp assigner', '.withTimestampAssigner((e, ts) -> e.eventTime)'],
    ['Idle sources', '.withIdleness(Duration.ofSeconds(10))'],
    ['Allowed lateness', '.allowedLateness(Time.seconds(30))'],
    ['Late data', '.sideOutputLateData(lateTag)'],
  ]},
  { icon: '🗄️', title: 'State', rows: [
    ['Value state', 'ValueStateDescriptor<Long> d = new ValueStateDescriptor<>("cnt", Long.class)'],
    ['RocksDB backend', 'env.setStateBackend(new EmbeddedRocksDBStateBackend())'],
    ['State TTL', 'StateTtlConfig.newBuilder(Time.days(7)).build()'],
    ['Incremental ckpt', 'state.backend.incremental: true'],
  ]},
  { icon: '✅', title: 'Checkpointing config', rows: [
    ['Enable', 'env.enableCheckpointing(60000) // ms'],
    ['Exactly-once', 'cfg.setCheckpointingMode(CheckpointingMode.EXACTLY_ONCE)'],
    ['Min pause', 'cfg.setMinPauseBetweenCheckpoints(30000)'],
    ['Timeout', 'cfg.setCheckpointTimeout(600000)'],
    ['Retain on cancel', 'cfg.setExternalizedCheckpointCleanup(RETAIN_ON_CANCELLATION)'],
    ['Unaligned', 'cfg.enableUnalignedCheckpoints()'],
  ]},
  { icon: '📊', title: 'Flink SQL', rows: [
    ['Kafka source', "CREATE TABLE t (...) WITH ('connector'='kafka', ...)"],
    ['Tumbling agg', 'GROUP BY TUMBLE(ts, INTERVAL \'10\' SECOND), driver_id'],
    ['Watermark in DDL', 'WATERMARK FOR ts AS ts - INTERVAL \'5\' SECOND'],
    ['Interval join', 'ON a.id=b.id AND a.ts BETWEEN b.ts - INTERVAL ...'],
  ]},
  { icon: '💾', title: 'CLI & operations', rows: [
    ['Submit job', 'flink run -d -p 8 job.jar'],
    ['List jobs', 'flink list'],
    ['Trigger savepoint', 'flink savepoint <jobId> s3://.../savepoints'],
    ['Cancel w/ savepoint', 'flink cancel -s s3://.../savepoints <jobId>'],
    ['Restore', 'flink run -s <savepointPath> job.jar'],
    ['Rescale', 'flink run -s <savepoint> -p 16 job.jar'],
  ]},
  { icon: '🚀', title: 'Tuning knobs', rows: [
    ['Parallelism', '-p / parallelism.default'],
    ['Network buffers', 'taskmanager.memory.network.fraction: 0.1'],
    ['Managed memory', 'taskmanager.memory.managed.fraction: 0.4 (RocksDB)'],
    ['Object reuse', 'env.getConfig().enableObjectReuse()'],
    ['Disable chaining', '.disableChaining() / .startNewChain()'],
  ]},
  { icon: '🛡️', title: 'Delivery guarantees', rows: [
    ['At-most-once', 'No checkpointing — fastest, data loss on failure'],
    ['At-least-once', 'Checkpoints, non-txn sink — possible duplicates'],
    ['Exactly-once', 'Checkpoints + 2PC/idempotent sink — no dupes'],
  ]},
];

export function mount(container) {
  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">📋 Reference · Cheat Sheet</div>
        <h1 class="module-title">Flink Cheat Sheet</h1>
        <p class="module-subtitle">The APIs, configs and CLI commands you'll reach for most — grouped for fast recall before an interview or a deploy.</p>
      </div>
      <div class="tab-content active">
        <div class="cheat-grid">
          ${CARDS.map(c => `
            <div class="cheat-card">
              <div class="cheat-head">${c.icon} ${c.title}</div>
              <div class="cheat-body">
                ${c.rows.map(([k, v]) => `
                  <div class="cheat-row">
                    <div class="cheat-k">${k}</div>
                    <div class="cheat-v">${v.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                  </div>`).join('')}
              </div>
            </div>`).join('')}
        </div>
      </div>
    </div>
  `;
  return () => {};
}
