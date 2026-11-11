// Flink configuration reference — the settings a senior engineer actually tunes.
// "Uber Edition" Flink learning SPA. Facts verified against Flink 1.17–1.18 defaults.
export const CONFIGS = [
  // ── Checkpointing ──────────────────────────────────────────────
  {
    key: 'execution.checkpointing.interval',
    category: 'Checkpointing',
    default: '(disabled)',
    typical: '30 s – 3 min',
    what: 'How often Flink triggers a checkpoint.',
    breaks: 'Too frequent → checkpoint storms + backpressure; too rare → huge replay + large source rewind on recovery.',
    module: 'm12'
  },
  {
    key: 'execution.checkpointing.mode',
    category: 'Checkpointing',
    default: 'EXACTLY_ONCE',
    typical: 'EXACTLY_ONCE',
    what: 'Consistency guarantee: EXACTLY_ONCE (aligned barriers) vs AT_LEAST_ONCE.',
    breaks: 'AT_LEAST_ONCE can duplicate records after recovery; EXACTLY_ONCE adds alignment latency under skew.',
    module: 'm12'
  },
  {
    key: 'execution.checkpointing.min-pause',
    category: 'Checkpointing',
    default: '0 ms',
    typical: '5 s – 30 s',
    what: 'Minimum gap between the end of one checkpoint and the start of the next.',
    breaks: 'Zero means back-to-back checkpoints that never let the pipeline catch up when checkpoints run long.',
    module: 'm12'
  },
  {
    key: 'execution.checkpointing.timeout',
    category: 'Checkpointing',
    default: '10 min',
    typical: '10 min – 1 h',
    what: 'Abort a checkpoint if it does not complete within this time.',
    breaks: 'Too low → checkpoints keep aborting under load and state keeps growing; too high → stuck checkpoints hide real backpressure.',
    module: 'm12'
  },
  {
    key: 'execution.checkpointing.unaligned.enabled',
    category: 'Checkpointing',
    default: 'false',
    typical: 'true (under heavy backpressure)',
    what: 'Let barriers overtake in-flight buffered records so checkpoints complete despite backpressure.',
    breaks: 'Enabling bloats checkpoint size (in-flight data is persisted) and raises I/O; leaving off stalls checkpoints when backpressured.',
    module: 'm14'
  },
  {
    key: 'execution.checkpointing.tolerable-failed-checkpoints',
    category: 'Checkpointing',
    default: '0',
    typical: '3 – 5',
    what: 'How many consecutive checkpoint failures to tolerate before failing the job.',
    breaks: 'Default 0 fails the whole job on a single transient checkpoint error (e.g. a blip in S3/HDFS).',
    module: 'm13'
  },
  {
    key: 'execution.checkpointing.externalized-checkpoint-retention',
    category: 'Checkpointing',
    default: 'NO_EXTERNALIZED_CHECKPOINTS',
    typical: 'RETAIN_ON_CANCELLATION',
    what: 'Whether retained checkpoints survive job cancellation for manual restore.',
    breaks: 'Default deletes checkpoints on cancel, so you cannot restart from the last checkpoint after a planned stop.',
    module: 'm13b'
  },
  {
    key: 'execution.checkpointing.max-concurrent-checkpoints',
    category: 'Checkpointing',
    default: '1',
    typical: '1',
    what: 'How many checkpoints may be in flight at once.',
    breaks: 'Raising it hurts exactly-once semantics and lets slow checkpoints pile up; keep at 1 for most jobs.',
    module: 'm12'
  },

  // ── State / RocksDB ────────────────────────────────────────────
  {
    key: 'state.backend.type',
    category: 'State/RocksDB',
    default: 'hashmap',
    typical: 'rocksdb (large state)',
    what: 'State backend: hashmap (on-heap) vs rocksdb (on-disk, spillable).',
    breaks: 'hashmap OOMs with large keyed state; rocksdb adds serialization + disk latency for small state.',
    module: 'm11'
  },
  {
    key: 'state.backend.incremental',
    category: 'State/RocksDB',
    default: 'false',
    typical: 'true (RocksDB)',
    what: 'Upload only changed RocksDB SST files per checkpoint instead of the full state.',
    breaks: 'Off means every checkpoint reuploads full state → slow checkpoints and high network for TB-scale state.',
    module: 'm12'
  },
  {
    key: 'state.backend.rocksdb.memory.managed',
    category: 'State/RocksDB',
    default: 'true',
    typical: 'true',
    what: 'Let Flink cap RocksDB block cache + write buffers inside the managed memory budget.',
    breaks: 'Disabling lets RocksDB allocate off-heap freely → container killed by the OS/YARN/K8s for OOM.',
    module: 'm11'
  },
  {
    key: 'state.backend.rocksdb.memory.write-buffer-ratio',
    category: 'State/RocksDB',
    default: '0.5',
    typical: '0.5 – 0.7 (write-heavy)',
    what: 'Fraction of RocksDB managed memory given to write (memtable) buffers vs block cache.',
    breaks: 'Too low throttles writes (frequent flushes/stalls); too high starves reads causing disk thrash.',
    module: 'm11'
  },
  {
    key: 'state.backend.local-recovery',
    category: 'State/RocksDB',
    default: 'false',
    typical: 'true',
    what: 'Keep a local copy of state so a task restart restores from local disk, not remote storage.',
    breaks: 'Off makes every recovery re-download full state from DFS → long downtime on restart.',
    module: 'm13'
  },
  {
    key: 'state.checkpoints.dir',
    category: 'State/RocksDB',
    default: '(none)',
    typical: 's3://.../checkpoints or hdfs://...',
    what: 'Durable storage location for checkpoint data and metadata.',
    breaks: 'Unset or pointing at local disk means checkpoints are lost when a node dies → no real recovery.',
    module: 'm12'
  },
  {
    key: 'state.savepoints.dir',
    category: 'State/RocksDB',
    default: '(none)',
    typical: 's3://.../savepoints',
    what: 'Default durable location for manually triggered savepoints.',
    breaks: 'Unset forces a path on every savepoint command; wrong/local path loses upgrade + migration snapshots.',
    module: 'm13b'
  },

  // ── Parallelism ────────────────────────────────────────────────
  {
    key: 'parallelism.default',
    category: 'Parallelism',
    default: '1',
    typical: 'matches slot count / Kafka partitions',
    what: 'Default parallelism for operators that do not set it explicitly.',
    breaks: 'Default 1 silently runs the whole job single-threaded; mismatch with partitions leaves idle subtasks.',
    module: 'm05'
  },
  {
    key: 'pipeline.max-parallelism',
    category: 'Parallelism',
    default: '128 – 32768 (derived)',
    typical: 'set once, generously (e.g. 720)',
    what: 'Number of key-groups — the hard ceiling for rescaling keyed state.',
    breaks: 'Changing it after a savepoint makes state unrestorable; too low caps future scale-up forever.',
    module: 'm05'
  },
  {
    key: 'taskmanager.numberOfTaskSlots',
    category: 'Parallelism',
    default: '1',
    typical: '# cores per TaskManager',
    what: 'Slots per TaskManager — how many parallel subtasks one TM runs.',
    breaks: 'Too many slots oversubscribe CPU and share memory thinly; too few waste cores and inflate TM count.',
    module: 'm05'
  },

  // ── Memory ─────────────────────────────────────────────────────
  {
    key: 'taskmanager.memory.process.size',
    category: 'Memory',
    default: '(none)',
    typical: '4g – 16g',
    what: 'Total memory for the TaskManager process (JVM + off-heap + overhead).',
    breaks: 'Mis-sized causes container OOM-kills (too high for the pod) or constant GC/spilling (too low).',
    module: 'm18'
  },
  {
    key: 'taskmanager.memory.managed.fraction',
    category: 'Memory',
    default: '0.4',
    typical: '0.4 – 0.7 (RocksDB)',
    what: 'Fraction of Flink memory reserved as managed memory (RocksDB, sorting, batch).',
    breaks: 'Too low starves RocksDB → disk thrash + stalls; too high shrinks task heap → GC pressure.',
    module: 'm18'
  },
  {
    key: 'taskmanager.memory.network.fraction',
    category: 'Memory',
    default: '0.1',
    typical: '0.1 – 0.2 (wide shuffles)',
    what: 'Fraction of total memory for network shuffle buffers.',
    breaks: 'Too low throws "Insufficient number of network buffers"; too high steals heap/managed memory.',
    module: 'm14'
  },
  {
    key: 'taskmanager.memory.jvm-metaspace.size',
    category: 'Memory',
    default: '256 mb',
    typical: '256 mb – 512 mb',
    what: 'JVM metaspace size for the TaskManager.',
    breaks: 'Too small → Metaspace OOM on jobs with many classes/UDFs or frequent restarts (classloader leaks).',
    module: 'm18'
  },
  {
    key: 'jobmanager.memory.process.size',
    category: 'Memory',
    default: '(none)',
    typical: '1g – 4g',
    what: 'Total memory for the JobManager process.',
    breaks: 'Too small → JM OOM on large job graphs or many concurrent checkpoints metadata.',
    module: 'm18'
  },

  // ── Network ────────────────────────────────────────────────────
  {
    key: 'taskmanager.network.memory.buffers-per-channel',
    category: 'Network',
    default: '2',
    typical: '2 – 4',
    what: 'Exclusive network buffers per input channel (per upstream subtask).',
    breaks: 'Combined with high parallelism this explodes buffer demand → "Insufficient network buffers" on wide shuffles.',
    module: 'm14'
  },
  {
    key: 'taskmanager.network.memory.floating-buffers-per-gate',
    category: 'Network',
    default: '8',
    typical: '8 – 16',
    what: 'Shared floating buffers per input gate, allocated on demand across channels.',
    breaks: 'Too few reduces throughput under bursty skew; too many inflate network memory needs.',
    module: 'm14'
  },
  {
    key: 'execution.buffer-timeout',
    category: 'Network',
    default: '100 ms',
    typical: '0 – 100 ms',
    what: 'Max time output buffers are held before flushing downstream (latency vs throughput knob).',
    breaks: 'High value batches more (higher throughput, higher latency); 0 flushes per record → throughput collapse.',
    module: 'm18'
  },

  // ── Restart / HA ───────────────────────────────────────────────
  {
    key: 'restart-strategy.type',
    category: 'Restart/HA',
    default: 'fixed-delay (if checkpointing on)',
    typical: 'exponential-delay or failure-rate',
    what: 'How the job restarts after a failure: fixed-delay, failure-rate, exponential-delay, or none.',
    breaks: '"none" kills the job on the first exception; a naive strategy hammers a failing downstream in a tight loop.',
    module: 'm13'
  },
  {
    key: 'restart-strategy.fixed-delay.attempts',
    category: 'Restart/HA',
    default: '1',
    typical: '3 – 10',
    what: 'Number of restart attempts before the job fails permanently.',
    breaks: 'Default 1 gives up almost immediately; too high masks a real persistent failure as endless restarts.',
    module: 'm13'
  },
  {
    key: 'restart-strategy.fixed-delay.delay',
    category: 'Restart/HA',
    default: '1 s',
    typical: '10 s – 30 s',
    what: 'Delay between restart attempts in the fixed-delay strategy.',
    breaks: 'Too short restarts before a flaky dependency recovers; too long extends downtime needlessly.',
    module: 'm13'
  },
  {
    key: 'restart-strategy.failure-rate.max-failures-per-interval',
    category: 'Restart/HA',
    default: '1',
    typical: '3 – 5',
    what: 'Allowed failures within the measurement interval before the job gives up.',
    breaks: 'Paired badly with the interval, it either fails too eagerly or tolerates a genuinely broken job forever.',
    module: 'm13'
  },
  {
    key: 'restart-strategy.failure-rate.failure-rate-interval',
    category: 'Restart/HA',
    default: '1 min',
    typical: '5 min',
    what: 'Sliding window over which failures are counted for the failure-rate strategy.',
    breaks: 'Too short resets the counter so chronic failures never trip the limit; too long over-penalizes bursts.',
    module: 'm13'
  },
  {
    key: 'high-availability.type',
    category: 'Restart/HA',
    default: 'NONE',
    typical: 'zookeeper or kubernetes',
    what: 'JobManager HA provider for leader election and metadata persistence.',
    breaks: 'NONE means a JobManager crash loses the running job and all checkpoint pointers — no failover.',
    module: 'm13'
  },
  {
    key: 'high-availability.storageDir',
    category: 'Restart/HA',
    default: '(none)',
    typical: 's3://.../ha or hdfs://.../ha',
    what: 'Durable store for HA metadata (submitted job graphs, checkpoint pointers).',
    breaks: 'Unset or local path breaks HA — after JM failover there is no metadata to resume the job from.',
    module: 'm13'
  },

  // ── Watermarks / Time ──────────────────────────────────────────
  {
    key: 'pipeline.auto-watermark-interval',
    category: 'Watermarks/Time',
    default: '200 ms',
    typical: '100 ms – 1 s',
    what: 'How often watermarks are generated/emitted by periodic watermark generators.',
    breaks: '0 disables periodic watermarks (windows never fire on event time); too large adds window-trigger latency.',
    module: 'm09'
  },
  {
    key: 'table.exec.source.idle-timeout',
    category: 'Watermarks/Time',
    default: '0 (disabled)',
    typical: '15 s – 1 min',
    what: 'Mark a source subtask idle after this long with no data so it stops holding back the watermark.',
    breaks: 'Disabled, one empty Kafka partition stalls the global watermark and windows never fire across the job.',
    module: 'm09'
  },

  // ── SQL / Table ────────────────────────────────────────────────
  {
    key: 'table.exec.state.ttl',
    category: 'SQL/Table',
    default: '0 (never expire)',
    typical: '1 h – 36 h',
    what: 'Idle-state retention for SQL joins/aggregations/dedup — expires keys unused for this long.',
    breaks: 'Default 0 grows regular-join/dedup state unbounded forever; too short drops keys that come back → wrong results.',
    module: 'm15'
  },
  {
    key: 'table.exec.mini-batch.enabled',
    category: 'SQL/Table',
    default: 'false',
    typical: 'true (high-volume aggs)',
    what: 'Buffer records into mini-batches to amortize state access in aggregations.',
    breaks: 'Off hammers state per record on hot keys; on without allowing latency raises end-to-end delay.',
    module: 'm16'
  },
  {
    key: 'table.exec.mini-batch.allow-latency',
    category: 'SQL/Table',
    default: '0 ms',
    typical: '1 s – 5 s',
    what: 'Max latency a record waits while a mini-batch fills.',
    breaks: 'Required (>0) for mini-batch to take effect; too high adds visible lag to aggregation output.',
    module: 'm16'
  },
  {
    key: 'table.optimizer.distinct-agg.split.enabled',
    category: 'SQL/Table',
    default: 'false',
    typical: 'true (skewed COUNT DISTINCT)',
    what: 'Split distinct aggregations into two phases to spread load off hot keys.',
    breaks: 'Off leaves a single skewed COUNT(DISTINCT) key as a hotspot → backpressure on that one subtask.',
    module: 'm16'
  },
  {
    key: 'table.exec.resource.default-parallelism',
    category: 'SQL/Table',
    default: '-1 (use parallelism.default)',
    typical: 'match sink/source partitions',
    what: 'Default parallelism for SQL/Table operators.',
    breaks: 'Leaving -1 may inherit 1 and run the SQL pipeline single-threaded under heavy load.',
    module: 'm15'
  },

  // ── Connectors / Kafka ─────────────────────────────────────────
  {
    key: 'scan.startup.mode',
    category: 'Connectors/Kafka',
    default: 'group-offsets',
    typical: 'earliest-offset or group-offsets',
    what: 'Where a Kafka source begins reading on a fresh start (no state).',
    breaks: 'latest-offset silently skips the backlog on first run; wrong mode causes data loss or full replays.',
    module: 'm17'
  },
  {
    key: 'sink.delivery-guarantee',
    category: 'Connectors/Kafka',
    default: 'at-least-once',
    typical: 'exactly-once (transactional)',
    what: 'Kafka sink semantics: none, at-least-once, or exactly-once (uses transactions).',
    breaks: 'at-least-once duplicates on recovery; exactly-once needs tuned transaction-timeout or it aborts under long checkpoints.',
    module: 'm17'
  },
  {
    key: 'properties.transaction.timeout.ms',
    category: 'Connectors/Kafka',
    default: '15 min (broker transaction.max.timeout.ms)',
    typical: '> checkpoint interval, < broker max',
    what: 'Kafka producer transaction timeout for the exactly-once sink.',
    breaks: 'Shorter than checkpoint interval → transactions time out and data is lost; above broker max → sink fails to start.',
    module: 'm17'
  },
  {
    key: 'pipeline.object-reuse',
    category: 'Connectors/Kafka',
    default: 'false',
    typical: 'true (perf-critical, careful)',
    what: 'Reuse object instances between operators to cut allocation/GC.',
    breaks: 'Enabling with stateful user code that keeps references to records causes silent data corruption.',
    module: 'm18'
  }
];
