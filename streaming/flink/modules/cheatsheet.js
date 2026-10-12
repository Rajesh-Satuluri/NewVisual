// Cheat Sheet — quick reference for the APIs, configs and CLI you actually reach for.
const CARDS = [
  { icon: '🧩', title: 'DataStream API essentials (PyFlink)', rows: [
    ['Map / filter', 'stream.map(lambda x: ...).filter(lambda x: ...)'],
    ['Key by field', 'stream.key_by(lambda e: e["driver_id"])'],
    ['Tumbling window', '.window(TumblingEventTimeWindows.of(Time.seconds(10)))'],
    ['Sliding window', '.window(SlidingEventTimeWindows.of(size, slide))'],
    ['Session window', '.window(EventTimeSessionWindows.with_gap(Time.minutes(5)))'],
    ['Low-level fn', '.process(FraudDetector())  # KeyedProcessFunction subclass'],
    ['Async I/O', 'Java-only → use Table API lookup join in PyFlink'],
  ]},
  { icon: '💧', title: 'Watermarks & time (PyFlink)', rows: [
    ['Bounded OOO', 'WatermarkStrategy.for_bounded_out_of_orderness(Duration.of_seconds(5))'],
    ['Timestamp assigner', '.with_timestamp_assigner(RideEventTimestamp())'],
    ['Idle sources', '.with_idleness(Duration.of_seconds(15))'],
    ['Allowed lateness', '.allowed_lateness(Time.minutes(2))'],
    ['Late data', '.side_output_late_data(late_tag)'],
  ]},
  { icon: '🗄️', title: 'State (PyFlink)', rows: [
    ['Value state', 'ctx.get_state(ValueStateDescriptor("cnt", Types.LONG()))'],
    ['RocksDB backend', 'env.set_state_backend(EmbeddedRocksDBStateBackend(True))'],
    ['State TTL', 'StateTtlConfig.new_builder(Time.days(7)).build()'],
    ['Incremental ckpt', 'state.backend.incremental: true'],
  ]},
  { icon: '✅', title: 'Checkpointing config (PyFlink)', rows: [
    ['Enable', 'env.enable_checkpointing(60000)  # ms'],
    ['Exactly-once', 'cfg.set_checkpointing_mode(CheckpointingMode.EXACTLY_ONCE)'],
    ['Min pause', 'cfg.set_min_pause_between_checkpoints(30000)'],
    ['Timeout', 'cfg.set_checkpoint_timeout(600000)'],
    ['Retain on cancel', 'cfg.set_externalized_checkpoint_cleanup(RETAIN_ON_CANCELLATION)'],
    ['Unaligned', 'cfg.enable_unaligned_checkpoints()'],
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
    ['Object reuse', 'env.get_config().enable_object_reuse()'],
    ['Disable chaining', '.disable_chaining() / .start_new_chain()'],
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
