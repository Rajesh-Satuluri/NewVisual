// Tiered answer cards: the SAME interview question answered at three levels.
// Weak (junior) -> Good (mid) -> Senior. Uber "ride R-4471" framing.
// 1M GPS pings/sec, fraud <100ms, surge pricing.

export const TIERED = {
  m01: [
    {
      q: 'Why would Uber choose Apache Flink over Spark Structured Streaming for real-time fraud and surge pricing?',
      weak: `Flink is a <b>streaming framework</b>, so it processes data in real time instead of in batches. Spark is mostly for batch, so Flink is faster for live data like GPS pings. That's why Uber uses it.`,
      good: `Flink is a <b>true record-at-a-time streaming engine</b>, while Spark Structured Streaming is micro-batch (it buffers records into small batches). For Uber's needs that matters:
      <ul>
        <li><b>Latency</b>: Flink processes each GPS ping as it arrives; Spark adds the micro-batch interval (often 100ms-seconds) as a floor.</li>
        <li><b>Event time + watermarks</b>: Flink has first-class event-time semantics, so out-of-order pings from flaky mobile networks are handled correctly.</li>
        <li><b>Stateful processing</b>: Flink keeps large keyed state (per-ride, per-driver) with exactly-once guarantees.</li>
      </ul>
      So for sub-100ms fraud scoring on ride R-4471, Flink's per-event model wins.`,
      senior: `The honest answer is "it depends on the latency SLO and the state story," and that's what the interviewer is probing for.
      <ul>
        <li><b>Latency floor</b>: Fraud must score in &lt;100ms. Spark micro-batch adds <code>trigger interval + batch scheduling</code> jitter to every record; even continuous mode is experimental and limited. Flink's pipelined, record-at-a-time dataflow gives single-digit-ms per-operator latency, so a 1M-pings/sec fraud pipeline comfortably hits p99 &lt;100ms.</li>
        <li><b>State as a first-class citizen</b>: Surge needs per-hex-cell windowed aggregates and fraud needs per-driver/per-rider feature state. Flink keeps this in <b>RocksDB with incremental checkpoints</b>, so state can exceed memory (hundreds of GB) and checkpoints stay cheap. Spark's state store (even RocksDB-backed) is tied to the batch boundary and historically heavier to operate at that scale.</li>
        <li><b>Backpressure</b>: Flink's credit-based flow control propagates backpressure naturally without dropping data; a micro-batch system instead grows batch duration, blowing the latency SLO silently.</li>
        <li><b>Trade-offs I'd flag</b>: Spark wins on unified batch+stream code, a larger hiring pool, and tight Databricks/Delta integration. If the SLO were "seconds, not milliseconds" and the team already lived in Spark, I would NOT rip it out just for Flink. The decision is latency SLO + state size + existing platform, not religion.</li>
        <li><b>Metric that decides it</b>: measure end-to-end p99 under 1M pings/sec with realistic out-of-orderness. If Spark can't hold &lt;100ms p99, Flink is the answer.</li>
      </ul>`
    }
  ],

  m05: [
    {
      q: 'Explain parallelism, slot sharing, and key groups in Flink. How does this affect rescaling the R-4471 fraud job?',
      weak: `Parallelism is how many parallel tasks run. You set it higher to go faster. Each task runs in a slot on a TaskManager. If you need more throughput you increase parallelism and add more TaskManagers.`,
      good: `Three related concepts:
      <ul>
        <li><b>Parallelism</b>: the number of parallel subtasks per operator. Each subtask processes a slice of the stream.</li>
        <li><b>Slot sharing</b>: by default, subtasks from different operators of the same job can share one task slot (same <i>slot sharing group</i>), so a slot runs a full pipeline slice. This reduces the slot count needed and co-locates operators to cut network shuffles.</li>
        <li><b>Key groups</b>: keyed state is split into <code>maxParallelism</code> key groups (a hash bucket space). Key groups, not individual keys, are the unit of state assignment to subtasks.</li>
      </ul>
      When you rescale, Flink redistributes <b>whole key groups</b> across the new subtasks, so each new subtask owns a contiguous range of key groups.`,
      senior: `The thing interviewers really probe: <b>maxParallelism is set at first run and bakes in your rescaling ceiling.</b>
      <ul>
        <li><b>Key groups math</b>: there are exactly <code>maxParallelism</code> key groups (default derived as ~<code>min(max(parallelism*1.5), 32768)</code>, rounded). A subtask owns <code>maxParallelism / parallelism</code> groups. You can only rescale up to <code>parallelism &le; maxParallelism</code>. If I set maxParallelism=128 at launch and later need parallelism=256, I'm stuck and must restate from scratch. So for R-4471 I'd set maxParallelism deliberately high (e.g. 4096) up front to leave headroom, accepting a small metadata cost.</li>
        <li><b>Key skew is the real killer</b>: key groups rebalance evenly, but if a few driver_ids carry disproportionate traffic (airport hotspots), a single key group gets hot and one subtask backpressures the whole job. Fix: salt the key (<code>driver_id + '#' + bucket</code>) then re-aggregate, or use <code>rebalance()/rescale()</code> before stateless stages.</li>
        <li><b>Slot sharing trade-off</b>: sharing packs a full pipeline slice into one slot (fewer slots, less network), but a heavy operator (RocksDB-backed fraud state) and a light source then compete for the same slot's CPU/memory. For the fraud operator I'd put it in its own <b>slot sharing group</b> so I can give it dedicated resources and set its parallelism independently.</li>
        <li><b>Rescaling in practice</b>: you cannot change parallelism on a running job. You take a <b>savepoint</b>, restart with new parallelism; Flink reassigns key-group ranges. Downtime is the savepoint-restore time, so size state and checkpoint storage accordingly.</li>
        <li><b>Metric to watch</b>: per-subtask <code>busyTimeMsPerSecond</code> and records-in skew across subtasks. Even distribution of key groups means nothing if one group is 10x hotter.</li>
      </ul>`
    }
  ],

  m07: [
    {
      q: 'How does Flink give exactly-once guarantees from Kafka source to Kafka sink? Explain the two-phase commit.',
      weak: `Flink does exactly-once by using checkpoints. It saves the offsets and the state, so if it crashes it restarts from the last checkpoint and doesn't lose or duplicate data. The Kafka connector handles this automatically.`,
      good: `Exactly-once end-to-end needs coordination between Flink's checkpoint and the external systems:
      <ul>
        <li><b>Source</b>: the Kafka source stores consumed offsets <i>in Flink state</i> (not committed back to Kafka as the source of truth). On restore, it replays from the checkpointed offsets.</li>
        <li><b>Sink</b>: the Kafka sink uses <b>two-phase commit (2PC)</b> tied to the checkpoint barrier. On each checkpoint it <i>pre-commits</i> (flushes a Kafka transaction but doesn't commit), and only after the checkpoint completes globally does it <i>commit</i> the transaction.</li>
      </ul>
      So records between two checkpoints become visible atomically only when that checkpoint succeeds, giving exactly-once.`,
      senior: `The core idea: <b>Flink's checkpoint barrier IS the 2PC coordinator</b>, and the subtle failure windows are what matters.
      <ul>
        <li><b>Protocol</b>: barrier flows through the graph. On barrier, the <code>TwoPhaseCommitSinkFunction</code> (or the newer unified <code>KafkaSink</code> with <code>DeliveryGuarantee.EXACTLY_ONCE</code>) flushes the current Kafka transaction = <b>pre-commit</b>. When the JobManager marks the checkpoint complete, it sends <code>notifyCheckpointComplete</code>, and the sink <b>commits</b> the transaction. Only then are records readable by downstream consumers set to <code>read_committed</code>.</li>
        <li><b>Consumers MUST use <code>isolation.level=read_committed</code></b> or they'll see uncommitted/aborted records — a classic production bug where "Flink is exactly-once but I still see dupes."</li>
        <li><b>transaction.timeout.ms</b>: this is the nastiest knob. Kafka's <code>transaction.max.timeout.ms</code> (broker, default 15min) must be &ge; Flink's producer <code>transaction.timeout.ms</code>, which must be &ge; your max checkpoint interval + downtime. If a job is down longer than the transaction timeout, Kafka aborts the pending transaction and you get <b>data loss</b>, not duplicates. For R-4471 I size timeout to tolerate realistic recovery (e.g. 1 hour).</li>
        <li><b>Transactional ID / producer pool</b>: each sink subtask uses a pool of transactional IDs; after a restore Flink must <i>fence</i> zombie producers from the previous run. Rescaling the sink can leak transactions if IDs aren't managed — the unified <code>KafkaSink</code> handles this better than the deprecated <code>FlinkKafkaProducer</code>.</li>
        <li><b>Cost trade-off</b>: exactly-once adds end-to-end latency equal to the checkpoint interval (data only visible on commit). For fraud alerts needing &lt;100ms visibility I might choose <b>at-least-once</b> on the alert sink + idempotent downstream dedup, and reserve exactly-once for the billing/audit sink where duplicates cost money. Pick the guarantee per sink, not per job.</li>
      </ul>`
    }
  ],

  m09: [
    {
      q: 'What are watermarks? Explain bounded out-of-orderness, idle sources, and late data for the GPS ping stream.',
      weak: `A watermark is a marker that tells Flink the time has progressed. It says "we won't see events older than this." Flink uses watermarks to know when to close windows. You set a watermark so late data gets handled.`,
      good: `A watermark is a special record carrying a timestamp <code>W(t)</code> that asserts "no more events with event-time &le; t are expected." It drives event-time progress.
      <ul>
        <li><b>Bounded out-of-orderness</b>: GPS pings arrive out of order (mobile networks). You declare a bound, e.g. 5s, so the watermark = <code>maxObservedEventTime - 5s</code>. This gives slack for stragglers.</li>
        <li><b>Idle sources</b>: if one Kafka partition goes quiet, its watermark stops advancing and the <i>minimum</i> across partitions stalls the whole job. Mark idle partitions with <code>withIdleness(...)</code> so they're excluded from the watermark min.</li>
        <li><b>Late data</b>: events arriving after the watermark passed their window are "late." They can be dropped, or routed to a side output, or re-fire the window within <code>allowedLateness</code>.</li>
      </ul>`,
      senior: `This is the single most misunderstood area, so the interviewer wants the trade-off: <b>bound = latency vs completeness</b>, and the failure modes.
      <ul>
        <li><b>The fundamental tension</b>: a larger out-of-orderness bound catches more stragglers (completeness) but delays every window firing by that bound (latency). For R-4471 I'd measure the actual event-time lag distribution (ingest_time - event_time) and set the bound at ~p99, not a guess. A 5s bound when p99 lag is 800ms just burns 4s of latency for nothing.</li>
        <li><b>Watermark = min over all input channels</b>: a single slow/stuck partition drags the whole operator's event time. <code>withIdleness(Duration.ofSeconds(15))</code> is mandatory at 1M pings/sec across many partitions, because a quiet partition (no drivers in a rural hex) would otherwise freeze windowing globally. Trade-off: if an idle partition suddenly resumes with old events, those are now late.</li>
        <li><b>Per-partition watermarks</b>: generate watermarks <i>at the source, per split</i> (<code>WatermarkStrategy</code> on the source) so per-partition out-of-orderness isn't conflated across partitions — otherwise one fast partition's watermark marks another's in-order data as late.</li>
        <li><b>Late data strategy, tiered</b>: (1) within <code>allowedLateness</code> -> window re-fires and emits an updated (retract-capable) result; (2) beyond that -> <b>side output</b> to a "late pings" stream for backfill/audit rather than silent drop. For fraud I never silently drop; a late ping could be the one that completes an impossible-travel pattern.</li>
        <li><b>Metrics</b>: watch <code>currentOutputWatermark</code> per subtask and <code>numLateRecordsDropped</code>. A rising gap between wall clock and watermark = a stuck/skewed partition. A nonzero drop counter = your bound or allowedLateness is too tight.</li>
        <li><b>Edge case</b>: watermarks are a heuristic, never a guarantee — a device buffering offline for an hour then dumping pings WILL be late no matter the bound. That's a design decision (side output + reprocess), not something you solve by cranking the bound to 1h and destroying latency.</li>
      </ul>`
    }
  ],

  m10: [
    {
      q: 'Compare tumbling, sliding, and session windows. How do triggers and allowed lateness work for surge pricing aggregates?',
      weak: `Tumbling windows are fixed non-overlapping, sliding windows overlap, and session windows group by activity with a gap. You pick the window type and Flink aggregates the data in it, then fires the result when the window ends.`,
      good: `<ul>
        <li><b>Tumbling</b>: fixed, non-overlapping (e.g. demand per hex per 1 min). Each event in exactly one window.</li>
        <li><b>Sliding</b>: fixed length + slide (e.g. 5-min demand updated every 1 min). Each event in multiple windows -> more compute.</li>
        <li><b>Session</b>: dynamic, closed by an inactivity gap (e.g. a rider's browsing session). Window length is data-driven.</li>
      </ul>
      <b>Triggers</b> decide when a window emits. Default is "on watermark passing window end." You can add early/late firings. <b>Allowed lateness</b> keeps window state after firing so late events re-trigger and emit updated results, until state is finally purged.`,
      senior: `For surge, the interviewer wants: how do you get <b>fresh</b> surge multipliers without waiting for a window to close, and what does that cost?
      <ul>
        <li><b>Window choice with trade-offs</b>: surge needs a <i>sliding</i> window (e.g. 5-min demand, slide 30s) for a smooth, responsive multiplier. But sliding puts each ping into <code>size/slide</code> = 10 windows -> 10x the state and aggregation. At 1M pings/sec that's real cost. Alternative: a tumbling window + incremental decay, or a <code>GlobalWindow</code> with a custom trigger. I'd benchmark state size before committing to fine-grained sliding.</li>
        <li><b>Early firing trigger</b>: default on-watermark firing means the surge price updates only when the window closes — too stale. I'd use a custom trigger (or <code>CONTINUOUS_PROCESSING_TIME</code> early firings every, say, 5s) to emit provisional multipliers, then a final on-watermark firing. Downstream must treat early fires as updates (idempotent on window key).</li>
        <li><b>Incremental vs full aggregation</b>: use <code>AggregateFunction</code>/<code>ReduceFunction</code> (incremental, O(1) state per window) over <code>ProcessWindowFunction</code> alone (buffers all events). Combine them: incremental aggregate + a ProcessWindowFunction that only receives the pre-aggregated result plus window metadata. This is the difference between kilobytes and gigabytes of window state.</li>
        <li><b>Allowed lateness is a memory bill</b>: every window with <code>allowedLateness(t)</code> keeps its state for an extra <code>t</code>. Across millions of hex-cell windows that multiplies memory. I set it to the minimum that matters for pricing accuracy and send the rest to a side output.</li>
        <li><b>Session window gotcha</b>: sessions <i>merge</i> as events fill gaps, so you can't use a cheap incremental-only path blindly; merging state has cost and ordering subtleties. Fine for per-rider sessions, wrong tool for high-cardinality surge aggregation.</li>
        <li><b>Metric</b>: window state size per subtask and trigger fire rate. If state grows unbounded, lateness/trigger config or a missing purge is the cause.</li>
      </ul>`
    }
  ],

  m11: [
    {
      q: 'Heap vs RocksDB state backend, and state TTL — which would you use for the R-4471 fraud feature store and why?',
      weak: `The heap backend keeps state in memory so it's fast, and RocksDB keeps it on disk so it can hold more. You use RocksDB when state is too big for memory. TTL lets old state expire so it doesn't grow forever.`,
      good: `<ul>
        <li><b>HashMapStateBackend (heap)</b>: state lives as Java objects on the JVM heap. Very low latency (no serialization on access), but bounded by heap size and subject to GC pressure. Good for small state.</li>
        <li><b>EmbeddedRocksDBStateBackend</b>: state lives in an embedded RocksDB (off-heap, spills to local disk). Can hold state far larger than memory, supports <b>incremental checkpoints</b>, but every access serializes/deserializes -> higher per-access latency.</li>
        <li><b>State TTL</b>: configure <code>StateTtlConfig</code> so entries expire after a duration (e.g. drop a driver's features after 24h of inactivity), keeping state bounded.</li>
      </ul>
      For a large fraud feature store I'd use RocksDB with TTL.`,
      senior: `The interviewer wants: do you understand the <b>serialization cost, checkpoint behavior, and TTL cleanup mechanics</b>, not just "big = RocksDB."
      <ul>
        <li><b>Decision for R-4471</b>: fraud features (per-driver/per-rider rolling counters, last-N locations, velocity) across millions of entities = tens-to-hundreds of GB. That exceeds heap, so <b>RocksDB</b>. I accept the per-access serialization cost because: (a) incremental checkpoints mean a 200GB state checkpoints in seconds (only changed SST files uploaded), and (b) heap at that size = brutal GC pauses that would blow the &lt;100ms SLO worse than RocksDB's deterministic latency.</li>
        <li><b>When heap still wins</b>: if state were small (say &lt;a few GB per TM) and latency-critical, HashMapStateBackend avoids serialization entirely and is measurably faster. Don't reach for RocksDB reflexively.</li>
        <li><b>RocksDB tuning knobs</b> (the real "senior" detail): block cache size, write buffer, <code>state.backend.rocksdb.memory.managed=true</code> so RocksDB uses Flink's managed memory (prevents native-memory OOM killing the container), and use <code>MapState</code> over <code>ValueState&lt;Map&gt;</code> because the latter deserializes the whole map on every access — a classic perf cliff.</li>
        <li><b>TTL mechanics matter</b>: TTL without cleanup just <i>marks</i> entries expired on read; the bytes linger. Enable <code>cleanupInRocksdbCompactFilter</code> (runs during compaction) so expired state is actually reclaimed, and set <code>updateType</code> (OnCreateAndWrite vs OnReadAndWrite) deliberately — OnReadAndWrite keeps hot keys alive, which you may or may not want for fraud recency.</li>
        <li><b>Edge case</b>: TTL granularity and <code>neverReturnExpired</code> vs <code>returnExpiredIfNotCleanedUp</code> — for fraud you want <code>neverReturnExpired</code> so a stale velocity feature never contributes to a score.</li>
        <li><b>Metric</b>: checkpoint size/duration, RocksDB native memory usage, and state size growth over time. Flat state size = TTL cleanup is actually working.</li>
      </ul>`
    }
  ],

  m12: [
    {
      q: 'Explain Flink checkpointing: aligned vs unaligned barriers and incremental checkpoints. Which for the fraud job under backpressure?',
      weak: `Checkpointing periodically saves the job's state so it can recover after a failure. Flink sends barriers through the stream and when they reach operators it snapshots the state. Unaligned checkpoints are faster and incremental ones only save what changed.`,
      good: `Checkpointing snapshots consistent global state using <b>barriers</b> injected at sources at the checkpoint interval.
      <ul>
        <li><b>Aligned checkpoints</b>: an operator with multiple inputs waits until the barrier arrives on <i>all</i> input channels (barrier alignment) before snapshotting. Buffers faster channels meanwhile. Consistent, but under backpressure the alignment can take a long time.</li>
        <li><b>Unaligned checkpoints</b>: the barrier overtakes buffered in-flight data; that in-flight data is snapshotted <i>as part of the checkpoint</i>. Checkpoint completes fast regardless of backpressure, at the cost of larger checkpoint size (it includes buffered records).</li>
        <li><b>Incremental checkpoints</b> (RocksDB): upload only the SST files changed since the last checkpoint instead of the full state.</li>
      </ul>
      Under backpressure I'd enable unaligned checkpoints.`,
      senior: `The interviewer is probing whether you know <b>when NOT to use unaligned, and the recovery/exactly-once implications.</b>
      <ul>
        <li><b>Why alignment stalls</b>: under backpressure the slow channel's barrier crawls; the operator buffers the fast channels and checkpoint duration balloons -> you see checkpoints timing out, then the job can't make progress on recovery either. At 1M pings/sec with hot-key skew this is a real failure mode.</li>
        <li><b>Unaligned fix + its cost</b>: unaligned persists in-flight buffers so the barrier doesn't wait. Checkpoints complete in seconds even under heavy backpressure. BUT: (a) checkpoint size grows by the in-flight buffer volume, hammering checkpoint storage/network; (b) recovery is heavier (must restore in-flight data); (c) it does NOT compose cleanly with <i>rescaling</i> in older versions — restoring an unaligned checkpoint at a different parallelism had limitations. So I'd use unaligned for routine recovery but take a <b>savepoint (which is aligned)</b> for rescaling/upgrades.</li>
        <li><b>My actual config for R-4471</b>: unaligned checkpoints ON (to survive bursty backpressure), <code>alignedCheckpointTimeout</code> set so it starts aligned and <i>falls back</i> to unaligned only when alignment exceeds the timeout — best of both: small checkpoints normally, resilience under pressure. Incremental checkpoints ON (RocksDB) so 200GB state checkpoints cheaply.</li>
        <li><b>Interval vs latency</b>: checkpoint interval is a trade-off — shorter = less reprocessing on failure but more overhead and, with exactly-once sinks, more end-to-end latency (data visible on commit). I'd also set <code>minPauseBetweenCheckpoints</code> so a slow checkpoint doesn't immediately trigger the next and starve processing.</li>
        <li><b>Incremental checkpoint gotcha</b>: incremental checkpoints share SST files across checkpoints, so the <i>retained</i> on-storage size can be much larger than one checkpoint, and cleanup depends on RocksDB compaction. Monitor actual storage usage, not just reported checkpoint size.</li>
        <li><b>Metrics</b>: <code>lastCheckpointDuration</code>, <code>alignmentDuration</code>, <code>checkpointSize</code> vs persisted size, and failed/expired checkpoint count. Rising alignment time = enable/trust the unaligned fallback.</li>
      </ul>`
    }
  ],

  m13: [
    {
      q: 'How does Flink recover from a TaskManager crash? Explain restart strategies, region failover, and end-to-end exactly-once.',
      weak: `If a TaskManager crashes, Flink restarts the job from the last checkpoint. You configure a restart strategy like fixed-delay so it retries a few times. The state is restored so no data is lost.`,
      good: `On a TaskManager failure:
      <ul>
        <li><b>Restart strategy</b> governs <i>whether and how</i> to restart: <code>fixed-delay</code> (N retries with delay), <code>exponential-delay</code> (backoff), <code>failure-rate</code> (restart unless too many failures in a window), or <code>none</code>. Set via config.</li>
        <li><b>Recovery</b>: Flink cancels affected tasks, reschedules them, and restores keyed/operator state from the latest completed checkpoint. Sources rewind to the checkpointed offsets.</li>
        <li><b>Region failover</b> (<code>pipelined-region</code> strategy): instead of restarting the whole job, Flink restarts only the connected <i>region</i> (set of tasks linked by pipelined exchanges) containing the failure, which for embarrassingly-parallel graphs restarts far fewer tasks.</li>
        <li><b>End-to-end exactly-once</b> comes from checkpointed source offsets + 2PC sinks, so recovery neither drops nor duplicates output.</li>
      </ul>`,
      senior: `The interviewer wants: the <b>scope of a restart, why region failover often doesn't help a shuffle-heavy job, and the end-to-end guarantee caveats.</b>
      <ul>
        <li><b>Region failover reality</b>: it only restarts a region, but a <code>keyBy</code> creates a <i>blocking/all-to-all</i> dependency, so for a fraud job that shuffles on driver_id, the "region" is effectively the whole pipeline downstream of the keyBy — region failover saves little. It shines for embarrassingly parallel ETL. I'd be honest that for R-4471's keyed graph, most failures restart the whole keyed subgraph, so I optimize for <b>fast restore</b> (local recovery, small incremental checkpoints) rather than hoping region failover limits blast radius.</li>
        <li><b>Task-local recovery</b>: <code>state.backend.local-recovery=true</code> keeps a local copy of state on the TM so a restart doesn't re-download 200GB from object storage — this is the single biggest recovery-time win and I'd always enable it for large state.</li>
        <li><b>Restart strategy choice</b>: <code>exponential-delay</code> or <code>failure-rate</code>, never infinite <code>fixed-delay</code> with zero delay — a crash-looping job hammers Kafka/checkpoint storage and masks the root cause. <code>failure-rate</code> lets me alert and page instead of silently thrashing.</li>
        <li><b>End-to-end exactly-once caveats</b>: it holds only if (a) the source is replayable (Kafka yes, a non-rewindable socket no), (b) the sink is transactional (2PC) or idempotent, and (c) the Kafka transaction timeout exceeds max downtime (else aborted transactions = data loss on recovery). "Exactly-once" is a property of the whole pipeline, not a checkbox.</li>
        <li><b>JobManager failure</b> is separate: needs HA (ZooKeeper/Kubernetes HA) so a standby JM takes over using the checkpoint metadata in the HA store; without HA, a JM crash loses the job. I'd never run production fraud without JM HA.</li>
        <li><b>Metrics/SLO</b>: measure <code>fullRestarts</code>, restore duration, and the data-loss-free recovery window (= Kafka transaction timeout). Define an availability SLO: e.g. recover and be caught up within N minutes, which bounds acceptable checkpoint size.</li>
      </ul>`
    }
  ],

  m13b: [
    {
      q: 'How do savepoints enable upgrading and rescaling a stateful job? Explain operator UIDs, key groups, and schema evolution.',
      weak: `A savepoint is a manual checkpoint you take before upgrading. You stop the job with a savepoint, deploy new code, and restart from it so you keep the state. You can also change parallelism when restoring from a savepoint.`,
      good: `A <b>savepoint</b> is a user-triggered, self-contained snapshot meant for planned operations (upgrades, migrations, rescaling), vs checkpoints which are for automatic recovery.
      <ul>
        <li><b>Upgrades</b>: <code>stop-with-savepoint</code>, deploy new job jar, start from the savepoint. State is matched to operators by <b>operator UID</b>, so you must set a stable <code>.uid("fraud-state")</code> on every stateful operator — otherwise Flink generates UIDs from the graph topology and any change to the pipeline breaks state mapping.</li>
        <li><b>Rescaling</b>: restore at a new parallelism; Flink redistributes <b>key groups</b> (the keyed-state partitioning unit) across the new subtasks, so each gets a new range of key groups.</li>
        <li><b>Schema evolution</b>: if you use a supported serializer (POJO, Avro), you can add/remove fields and Flink migrates state on restore.</li>
      </ul>`,
      senior: `This is a pure "have you operated Flink in prod" question. The gotchas:
      <ul>
        <li><b>UIDs are non-negotiable and permanent</b>: set <code>.uid()</code> on <i>every</i> stateful operator from day one. Without them, inserting a trivial <code>map()</code> upstream shifts auto-generated UIDs and the restore fails with "cannot map state." On restore I use <code>--allowNonRestoredState</code> deliberately only when I'm intentionally dropping an operator's state, never as a reflex to silence errors (that's silent data loss).</li>
        <li><b>maxParallelism is the hard rescaling ceiling</b>: key groups = maxParallelism, fixed at first launch and <i>stored in the savepoint</i>. You can rescale to any parallelism &le; maxParallelism; beyond it you cannot restore. So I set maxParallelism high (e.g. 4096) at launch for R-4471. You also cannot change maxParallelism via savepoint restore — it's baked in.</li>
        <li><b>Schema evolution limits</b>: works for Avro and Flink POJOs with specific rules — you can add fields (defaulted) and remove fields, but you <b>cannot</b> change a field's type, rename without care, or change the key type. Kryo-serialized state does NOT support evolution — if someone let Kryo fall through, you're stuck. So I pin serializers (Avro/POJO) and register them explicitly; I treat "is this state schema-evolvable?" as a design-review gate.</li>
        <li><b>Savepoint vs checkpoint internals</b>: savepoints historically use a canonical, portable format (slower to write, but relocatable and version-portable), while checkpoints are backend-native and faster. Flink added <i>native-format</i> savepoints for speed — I pick canonical for cross-version upgrades, native when I just need a fast consistent point and will restore on the same version. Also, savepoints are NOT auto-cleaned — they're my responsibility to garbage-collect, unlike retained checkpoints.</li>
        <li><b>Safe upgrade procedure</b>: <code>stop-with-savepoint --drain</code> only when I truly want to flush windows/advance watermark to MAX (it permanently fires timers — do NOT drain if you'll resume processing, or you corrupt windowing). For a routine upgrade I stop-with-savepoint <i>without</i> drain.</li>
        <li><b>Metric/validation</b>: after restore, verify state size matches and watermarks resume from the expected point; a sudden state-size drop means a UID mismatch silently discarded state.</li>
      </ul>`
    }
  ],

  m14: [
    {
      q: 'What is backpressure in Flink, how does credit-based flow control work, and how would you diagnose it on the fraud pipeline?',
      weak: `Backpressure is when a downstream operator is too slow, so upstream operators slow down too. Flink shows backpressure in the web UI. You fix it by increasing parallelism or giving more resources to the slow operator.`,
      good: `Backpressure = a slow consumer forcing producers to slow down so buffers don't overflow.
      <ul>
        <li><b>Credit-based flow control</b>: each receiving subtask advertises how many network buffers (credits) it has free. A sender only transmits as many buffers as the receiver has credits for. If the receiver is slow, credits run out, the sender stops, and backpressure propagates upstream naturally — without filling the TCP buffers of the whole shared connection (which would block unrelated channels).</li>
        <li><b>Diagnosis</b>: Flink's web UI shows a backpressure indicator and <code>busyTimeMsPerSecond</code>/<code>backPressuredTimeMsPerSecond</code> per operator. The <i>first</i> operator (reading downstream) that is busy but <i>not</i> backpressured is the bottleneck.</li>
      </ul>
      Fix by scaling the bottleneck operator or removing its slowdown (e.g. slow sink, hot key).`,
      senior: `The interviewer wants a <b>systematic diagnosis method and root causes beyond "add parallelism."</b>
      <ul>
        <li><b>Credit-based detail</b>: credits = exclusive buffers per channel + a floating buffer pool shared across channels. The benefit over plain TCP backpressure is <b>channel isolation</b>: one slow subtask doesn't stall the whole multiplexed TCP connection, so other keyed channels keep flowing. Tuning <code>taskmanager.network.memory.buffers-per-channel</code> and <code>floating-buffers-per-gate</code> affects throughput-vs-latency under bursts.</li>
        <li><b>Diagnosis algorithm</b>: walk the graph from sink to source. The bottleneck is the first operator that is <b>HIGH busy% and LOW backpressured%</b> — it's working flat out and nothing downstream is holding it back. Everything upstream of it shows high backpressure (symptom, not cause). The UI colors this; I confirm with <code>backPressuredTimeMsPerSecond</code> and <code>busyTimeMsPerSecond</code> metrics.</li>
        <li><b>Root causes I rank for R-4471</b>: (1) <b>data skew</b> — one driver_id/hex is 10x hot, so one subtask of the keyed fraud operator pins at 100% busy while peers idle; add key-level metrics to confirm, then salt the key. (2) <b>slow external call</b> — synchronous enrichment lookup (Redis/HTTP) blocks the operator; fix with <b>Async I/O</b> (<code>AsyncDataStream</code>) so lookups overlap instead of serializing. (3) <b>slow sink</b> — small Kafka batch/linger or a DB with row-by-row writes; batch it. (4) <b>under-resourced RocksDB</b> — disk I/O bound; check RocksDB metrics.</li>
        <li><b>Why "just add parallelism" is wrong</b>: if the cause is skew, more subtasks don't help the hot key at all. If the cause is a slow sync lookup, Async I/O gives 10x with the same parallelism. Diagnose the cause before scaling.</li>
        <li><b>Interaction with checkpoints</b>: sustained backpressure makes <b>aligned</b> checkpoints time out (barriers can't advance). So backpressure and failing checkpoints usually show up together; enabling unaligned checkpoints treats the symptom but I still fix the root cause.</li>
        <li><b>Metrics to alert on</b>: per-subtask <code>busyTimeMsPerSecond</code>, <code>backPressuredTimeMsPerSecond</code>, input/output buffer pool usage (<code>inPoolUsage</code>/<code>outPoolUsage</code> near 1.0 = buffers exhausted), records-in skew across subtasks, and checkpoint alignment duration.</li>
      </ul>`
    }
  ],

  m16: [
    {
      q: 'Explain the 2PC Kafka sink connector and upsert-kafka. When would you use each for Uber data?',
      weak: `The Kafka sink writes results to Kafka with exactly-once using two-phase commit. Upsert-kafka lets you update records by key, so instead of appending it overwrites, which is good for keeping the latest value like the latest surge price.`,
      good: `<ul>
        <li><b>Transactional (2PC) Kafka sink</b>: <code>KafkaSink</code> with <code>DeliveryGuarantee.EXACTLY_ONCE</code> uses Kafka transactions committed on checkpoint completion, so each result appears exactly once in an <i>append</i> log. It's for append-only event streams (e.g. fraud alerts, trip events).</li>
        <li><b>upsert-kafka connector</b>: a Flink SQL connector that treats a Kafka topic as a <b>changelog keyed by the Kafka key</b>. It writes an INSERT/UPDATE as a record with that key and a DELETE as a <code>null</code> value (tombstone). Compacted topics then keep only the latest value per key. Used when you want "current state per key," like the latest surge multiplier per hex cell.</li>
      </ul>
      So: append semantics -> transactional sink; keyed latest-value / materialized state -> upsert-kafka.`,
      senior: `The interviewer wants: the <b>changelog semantics, compaction coupling, and the exactly-once/ordering caveats.</b>
      <ul>
        <li><b>upsert-kafka = changelog with primary key</b>: it requires a <code>PRIMARY KEY ... NOT ENFORCED</code> in the DDL; Flink maps that to the Kafka message key and emits tombstones (<code>null</code> value) on retract. Downstream consumers and any compacted topic MUST understand tombstones, and the topic should be <b>log-compacted</b> or old versions pile up forever. For "latest surge per hex," upsert-kafka + compaction is exactly right.</li>
        <li><b>Why not just the transactional append sink for surge?</b> An append log of every surge recomputation grows unbounded and consumers must do last-write-wins themselves. upsert-kafka pushes that into the topic model. But upsert-kafka's exactly-once story is weaker: it historically relies on idempotent upserts + key ordering rather than full 2PC, so I verify the delivery guarantee for the Flink version I'm on rather than assuming it's transactional.</li>
        <li><b>Ordering is the trap</b>: upsert correctness depends on all records for a key landing in the <i>same partition in order</i>. Flink partitions by the Kafka key by default, which preserves this — but if someone overrides the partitioner or changes the key, you get out-of-order upserts and the "latest" value is wrong. I'd test that key -> partition mapping is stable.</li>
        <li><b>Retract streams feed upsert-kafka</b>: a SQL query with aggregation produces a <i>retract</i> or <i>upsert</i> changelog; upsert-kafka consumes the upsert form, collapsing +U/-U into a single keyed write. If the query produces a pure retract stream with no PK, you can't sink to upsert-kafka — the planner needs the key.</li>
        <li><b>When I'd use each at Uber</b>: fraud alerts / trip lifecycle events / billing -> <b>transactional append sink</b> (every event matters, exactly-once, immutable audit). Latest surge multiplier per hex / driver availability state / current ETA -> <b>upsert-kafka</b> on a compacted topic (consumers want current value, not history).</li>
        <li><b>Config/metrics</b>: for the transactional sink, <code>transaction.timeout.ms</code> vs broker max and <code>read_committed</code> consumers (as in exactly-once); for upsert-kafka, monitor compaction lag and tombstone handling, and watch topic size — unbounded growth means compaction isn't keeping up.</li>
      </ul>`
    }
  ],

  m17: [
    {
      q: 'In Flink SQL, explain retract vs upsert (changelog) streams and temporal joins. Give an Uber example.',
      weak: `Flink SQL can turn tables into streams. A retract stream sends updates by first retracting the old row then adding the new one. An upsert stream just sends the new value by key. A temporal join joins a stream with a table as it was at a point in time, like joining trips with the exchange rate at that moment.`,
      good: `<ul>
        <li><b>Append stream</b>: insert-only (e.g. raw GPS pings).</li>
        <li><b>Retract stream</b>: a continuously-updating query (e.g. <code>COUNT(*) GROUP BY hex</code>) emits <code>+I</code>/<code>+U</code> as an <b>add</b> and the superseded value as a <b>retract</b> (<code>-U</code>/<code>-D</code>). Downstream must subtract retractions to stay correct. No primary key needed.</li>
        <li><b>Upsert stream</b>: same updating result but keyed by a primary key, emitting just the new value per key (and deletes). More compact; requires a PK and a sink that understands upserts (e.g. upsert-kafka, JDBC with PK).</li>
        <li><b>Temporal join</b>: join a stream to a <i>versioned</i> table <code>FOR SYSTEM_TIME AS OF</code> the stream row's time, so each ride joins the surge rate / FX rate that was valid at the ride's event time, not the latest.</li>
      </ul>`,
      senior: `The interviewer is checking whether you understand <b>why the changelog mode matters for correctness, cost, and what breaks.</b>
      <ul>
        <li><b>Retract vs upsert is a cost/compatibility trade-off</b>: retract streams need no PK but double the message volume (every change = retract + add) and force <i>every</i> downstream operator to be retract-aware (stateful subtraction). Upsert streams halve the traffic and are far cheaper to materialize, but require a PK the planner can derive and a PK-aware sink. For a surge aggregate feeding upsert-kafka, I want the query shaped so the planner produces an <b>upsert</b> changelog (group by the key that becomes the PK) — otherwise it falls back to retract and can't sink to upsert-kafka.</li>
        <li><b>State growth is the real risk</b>: an updating aggregation keeps state per group key forever unless bounded. A <code>GROUP BY rider_id</code> over all time at Uber scale = unbounded state. I bound it with a time window, state TTL (<code>table.exec.state.ttl</code>), or a windowing TVF so idle keys expire. "Correct but OOMs in 3 days" is a classic failure.</li>
        <li><b>Temporal join, precise semantics</b>: <code>FOR SYSTEM_TIME AS OF o.event_time</code> against a <i>versioned table</i> (a changelog with a PK + event-time attribute, e.g. a surge-rate table keyed by hex) joins each trip to the rate version valid at the trip's event time. This is deterministic and reprocessable, unlike joining to a regular table (which uses the latest, non-deterministic). For billing a ride at the surge rate <i>at pickup time</i>, temporal join is the correct tool; a plain join would re-price history whenever the rate changes.</li>
        <li><b>Watermarks drive temporal joins</b>: the join waits for watermarks on both sides to know the versioned table is complete up to the trip's time. A missing/late watermark on the rate table stalls or produces wrong versions — so idleness handling (m09) directly affects join correctness.</li>
        <li><b>Regular vs interval vs temporal join trade-off</b>: a regular equi-join keeps <i>both</i> sides' full state (dangerous at stream scale); an <b>interval join</b> (<code>BETWEEN ... AND</code> on time) bounds state to the time window; a temporal join bounds the right side to versions. I pick interval/temporal joins over regular joins specifically to bound state.</li>
        <li><b>Metrics/validation</b>: watch operator state size for the join/aggregate, confirm the planned changelog mode (via <code>EXPLAIN CHANGELOG_MODE</code>), and verify temporal join output is stable under reprocessing (same input -> same prices).</li>
      </ul>`
    }
  ]
};
