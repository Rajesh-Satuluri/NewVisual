// Master Map — the end-to-end journey of an event through Kafka, as clickable
// stages that deep-link into the module covering each one. Plus a concept map
// grouping every module by theme.
//
// The event trace is intentionally exhaustive: every stage carries a
// micro-sequence (the sub-steps that happen inside that one hop, with
// illustrative per-step timing), the exact config knobs that govern it, the
// metrics you'd watch in production, and the failure mode that bites there.

const STAGES = [
  { n: '01', icon: '🛒', m: 'm04', title: 'Produce', sub: 'Serialize → partition → batch → acks',
    note: 'An order event is keyed, routed to a partition, batched, and acknowledged.',
    payload: 'key = cust-7701 · {orderId:"A1", total:2490} → Avro bytes (magic 0x00 · schema-id 142 · 38 B)',
    detail: 'The order service <b>serializes</b> the event (Avro/Protobuf via Schema Registry — a magic byte + 4-byte schema id + compact body), the <b>partitioner hashes the key</b> (customerId) with murmur2 to choose a partition, and the record joins an in-memory <b>batch</b> that flushes on <code>batch.size</code> or <code>linger.ms</code>. The <b>idempotent producer</b> tags each batch with a (producer-id, epoch, sequence) so retries never duplicate, and the send isn\'t acknowledged until <code>acks=all</code> in-sync replicas hold it.',
    micro: [
      { ms: 0.02, label: 'interceptor.onSend()', desc: 'ProducerInterceptor chain fires — tracing headers (trace-id) injected before anything touches the wire.' },
      { ms: 0.15, label: 'serialize key + value', desc: 'Value serializer asks Schema Registry (cached) for schema-id 142, writes magic byte 0x00 + id + Avro body. Key → UTF-8 bytes.' },
      { ms: 0.03, label: 'partitioner', desc: 'murmur2(keyBytes) & 0x7fffffff % 12 → partition 3. Same customer key ⇒ always partition 3, forever.' },
      { ms: 0.04, label: 'accumulator.append()', desc: 'Record dropped into the per-partition RecordAccumulator deque. Compressed into the open batch (lz4). If buffer.memory is full, send() blocks up to max.block.ms.' },
      { ms: 5.0, label: 'linger wait', desc: 'Batch sits for up to linger.ms (here ~5ms) collecting siblings so the ProduceRequest is fat, not chatty — throughput vs latency dial.' },
      { ms: 0.2, label: 'sender drains', desc: 'The single Sender I/O thread groups ready batches by partition-leader broker, stamps sequence numbers, builds one ProduceRequest per broker (≤ max.in.flight.requests.per.connection in flight).' },
      { ms: 1.8, label: 'await acks=all', desc: 'Broker leader will not answer until min.insync.replicas hold the batch. Future completes → callback runs → RecordMetadata{partition:3, offset:104271} returned.' },
    ],
    knobs: ['acks=all', 'enable.idempotence=true', 'linger.ms=5', 'batch.size=16384', 'compression.type=lz4', 'max.in.flight=5', 'delivery.timeout.ms=120000', 'buffer.memory=32MB'],
    watch: ['record-send-rate', 'request-latency-avg', 'batch-size-avg', 'record-error-rate', 'buffer-available-bytes', 'record-retry-rate'],
    pitfall: 'acks=1 returns the moment the leader writes — if the leader dies before a follower copies the batch, the record is silently lost. And max.in.flight>1 without idempotence can reorder a retried batch.',
    mech: ['key → partitioner', 'batch + linger.ms', 'acks=all', 'idempotent producer'] },

  { n: '02', icon: '🖥️', m: 'm05', title: 'Store', sub: 'Append to log segment · page cache',
    note: 'The broker appends to the active segment; zero-copy keeps it fast.',
    payload: 'orders-3 @ offset 104271 — appended to 00000000000000104000.log · position 71 642',
    detail: 'The partition <b>leader</b> validates the batch (CRC, magic, sequence), appends it to the end of the <b>active log segment</b> — a sequential, append-only write that is effectively O(1) — assigns the next <b>offset</b>, and updates the <b>offset index</b> and <b>time index</b>. The bytes live in the OS <b>page cache</b>, so hot reads later leave via <b>zero-copy</b> (<code>sendfile</code>): the broker never copies the record into the JVM heap.',
    micro: [
      { ms: 0.05, label: 'validate batch', desc: 'Leader checks CRC32C, magic byte, and — for an idempotent producer — that the sequence is exactly lastSeq+1 for this (PID, partition). A gap ⇒ OutOfOrderSequence; a repeat ⇒ Duplicate, dropped silently.' },
      { ms: 0.08, label: 'assign offsets', desc: 'The batch\'s baseOffset is set to LEO; each record gets baseOffset + relativeOffset. LEO advances 104271 → 104272.' },
      { ms: 0.12, label: 'append to segment', desc: 'Bytes written to the active .log segment via FileChannel. Written to page cache, NOT fsync\'d per-record — Kafka trusts replication for durability, not disk flush.' },
      { ms: 0.04, label: 'update indexes', desc: 'Sparse .index (offset → file position) gets an entry every index.interval.bytes (4KB); .timeindex maps max-timestamp → offset for time-based seeks.' },
      { ms: 0.01, label: 'maybe roll segment', desc: 'If the active segment passed segment.bytes (1GB) or segment.ms, it\'s closed and a new one opened, named for its base offset. Old closed segments become eligible for retention/compaction.' },
    ],
    knobs: ['segment.bytes=1GB', 'segment.ms=7d', 'index.interval.bytes=4096', 'log.flush.interval.messages=∞', 'message.max.bytes', 'log.dirs (JBOD)'],
    watch: ['LogEndOffset', 'LogStartOffset', 'page-cache hit ratio', 'disk write bytes/s', 'under-min-isr (soon)', 'log-flush-rate'],
    pitfall: 'Kafka does not fsync each write — a simultaneous power loss on leader + all ISR before the OS flushes page cache can lose committed data. Durability comes from replica count, not the disk. Too-small segments ⇒ too many open files + slow recovery.',
    mech: ['append-only segment', 'offset assigned', 'sparse index', 'page cache', 'zero-copy sendfile'] },

  { n: '03', icon: '🔁', m: 'm07', title: 'Replicate', sub: 'Leader → ISR followers · HWM',
    note: 'Followers fetch from the leader; the high watermark advances once in-sync.',
    payload: 'replicated to broker 2 & 3 · High Watermark 104271 → 104272 · committed ✓',
    detail: 'In-sync <b>follower</b> replicas issue <code>FetchRequest</code>s to the leader and copy the batch, exactly like a consumer. Once <em>every</em> replica in the <b>ISR</b> has fetched past this offset, the leader advances the <b>High Watermark</b> — and only then is the record <b>committed</b> and visible to consumers. Under <code>acks=all</code> the producer\'s ack waits for exactly this moment, which is why <code>min.insync.replicas</code> is the real durability knob.',
    micro: [
      { ms: 0.3, label: 'follower FetchRequest', desc: 'Followers on brokers 2 & 3 long-poll the leader with their current fetch offset (104271) — they are consumers of the leader\'s log.' },
      { ms: 0.4, label: 'leader responds', desc: 'Leader returns the batch at 104271. Each follower appends it to its own replica of the log and updates its LEO.' },
      { ms: 0.3, label: 'follower reports LEO', desc: 'Next fetch carries the follower\'s new LEO (104272). The leader records each follower\'s position in the replica-fetcher state.' },
      { ms: 0.05, label: 'advance High Watermark', desc: 'HWM = min(LEO across all ISR members). Once brokers 1,2,3 all reach 104272, HWM = 104272. The record is now COMMITTED.' },
      { ms: 0.02, label: 'release producer ack', desc: 'The ProduceRequest from stage 01 was parked waiting for exactly this. acks=all future completes now. Consumers may only read ≤ HWM, never uncommitted tails.' },
    ],
    knobs: ['replication.factor=3', 'min.insync.replicas=2', 'replica.lag.time.max.ms=30000', 'acks=all', 'unclean.leader.election.enable=false', 'replica.fetch.max.bytes'],
    watch: ['UnderReplicatedPartitions', 'UnderMinIsrPartitions', 'IsrShrinksPerSec / IsrExpandsPerSec', 'replica-lag (maxLag)', 'LeaderCount'],
    pitfall: 'If a follower falls behind replica.lag.time.max.ms it is kicked from the ISR — the ISR shrinks to 1, and with min.insync.replicas=2 producers now get NotEnoughReplicas and block. Enabling unclean.leader.election trades that availability for silent data loss.',
    mech: ['ISR', 'follower fetch', 'High Watermark', 'min.insync.replicas'] },

  { n: '04', icon: '🗂️', m: 'm06', title: 'Partition', sub: 'Ordering · parallelism · keys',
    note: 'Order holds within a partition; keys decide which one — and parallelism.',
    payload: 'all cust-7701 events → partition 3 (strict order) · topic orders = 12 partitions',
    detail: 'Ordering is guaranteed <b>only within a partition</b>, and the key pins every event for a customer to the <b>same partition</b> — so one customer\'s history stays strictly ordered while different customers spread across partitions for <b>parallelism</b>. Partition count is the permanent ceiling on consumer parallelism and the unit of placement, so it\'s a capacity decision made up front.',
    micro: [
      { ms: 0, label: 'determinism of the key', desc: 'murmur2(cust-7701) is stable across clients and restarts, so every event this customer ever produces lands on partition 3 — their timeline is one ordered log.' },
      { ms: 0, label: 'per-partition total order', desc: 'Within partition 3 offsets are monotonic and gap-free; across partitions there is NO global order. "Order of all orders" is a cross-partition illusion.' },
      { ms: 0, label: 'parallelism ceiling', desc: '12 partitions ⇒ at most 12 useful consumers in a group. Consumer #13 sits idle. You can only raise this number, never lower it.' },
      { ms: 0, label: 'repartition cost', desc: 'Adding partitions changes murmur2(key) % N, so cust-7701 may move to a new partition — breaking key-order continuity. This is why partition count is sized up front.' },
      { ms: 0, label: 'hot-key skew', desc: 'If one key dominates (a celebrity seller), its partition becomes a hotspot while others idle. Fix with a composite key or custom partitioner, not more partitions.' },
    ],
    knobs: ['num.partitions', 'partitioner.class', 'key.serializer', 'partition count is grow-only'],
    watch: ['per-partition bytes-in skew', 'partition-size imbalance', 'MaxLag by partition', 'leader distribution across brokers'],
    pitfall: 'Picking too few partitions caps throughput forever; picking too many bloats open-file counts, controller metadata, and rebalance time. And a null key ⇒ sticky/round-robin spread, which destroys per-customer ordering if you actually needed it.',
    mech: ['key → same partition', 'per-partition order', 'partitions = parallelism', 'grow-only'] },

  { n: '05', icon: '👥', m: 'm08', title: 'Consume', sub: 'Group · assignment · rebalance',
    note: 'A consumer group divides partitions; membership changes trigger rebalances.',
    payload: 'group=fulfillment · consumer-2 owns orders-3 · poll() returns record @ 104271',
    detail: 'A <b>consumer group</b> divides the topic\'s partitions among its members — each partition goes to <b>at most one</b> consumer in the group. The <b>group coordinator</b> (a broker) assigns partitions and triggers a <b>rebalance</b> when members join, leave, or time out; modern clients use <b>cooperative/incremental</b> rebalancing so only the partitions that must move are revoked, not the whole group.',
    micro: [
      { ms: 0.5, label: 'find coordinator', desc: 'Consumer hashes group.id to a __consumer_offsets partition; that partition\'s leader broker is the group coordinator. FindCoordinator → JoinGroup.' },
      { ms: 1.0, label: 'join + assign', desc: 'One member becomes group leader, runs the assignor (CooperativeSticky) to map partitions → members, and ships the plan back via SyncGroup. consumer-2 is granted orders-3.' },
      { ms: 0.4, label: 'fetch from HWM', desc: 'poll() issues a FetchRequest for orders-3 at the last committed offset. Broker returns records up to the High Watermark (104272) — never uncommitted data.' },
      { ms: 0.1, label: 'deserialize + deliver', desc: 'Fetched bytes are decompressed, Avro-decoded via schema-id 142, and handed to application code as a ConsumerRecord. max.poll.records caps the batch.' },
      { ms: 3.0, label: 'heartbeat loop', desc: 'A background thread sends heartbeats every heartbeat.interval.ms. Miss session.timeout.ms and you\'re evicted; exceed max.poll.interval.ms between polls and you\'re evicted for being "stuck".' },
    ],
    knobs: ['group.id', 'partition.assignment.strategy=CooperativeSticky', 'session.timeout.ms=45000', 'heartbeat.interval.ms=3000', 'max.poll.interval.ms=300000', 'max.poll.records=500', 'fetch.min.bytes'],
    watch: ['rebalance-rate-per-hour', 'rebalance-latency-avg', 'assigned-partitions', 'records-lag-max', 'last-poll-seconds-ago', 'join/sync time'],
    pitfall: 'Slow processing that blows past max.poll.interval.ms triggers a rebalance mid-batch — the partition is reassigned and the work reprocessed, a self-reinforcing "rebalance storm". Eager (non-cooperative) assignors make it worse by stopping the WHOLE group on every change.',
    mech: ['group coordinator', 'partition assignment', 'cooperative rebalance', 'heartbeat vs poll'] },

  { n: '06', icon: '📍', m: 'm09', title: 'Track offsets', sub: 'Commit · lag · replay',
    note: 'Committed offsets record progress; lag is the health metric; seek to replay.',
    payload: 'committed offset 104272 → __consumer_offsets-11 · lag = 0 · seekable for replay',
    detail: 'After processing, the consumer <b>commits</b> the next offset to the internal, compacted <code>__consumer_offsets</code> topic — this is progress, independent of the LSN or any sink marker. <b>Lag</b> = log-end-offset − committed offset is <em>the</em> health metric for a pipeline. <code>seek()</code> lets you <b>replay</b> from an earlier offset or skip ahead, and the <em>timing</em> of the commit relative to processing is what decides at-least-once vs at-most-once.',
    micro: [
      { ms: 0.05, label: 'process the record', desc: 'Application does its work — write to a DB, call a service, update state. The offset is NOT yet committed; a crash here replays the record.' },
      { ms: 0.3, label: 'commit (async/sync)', desc: 'commitAsync() fires an OffsetCommitRequest for {orders-3: 104272} to the coordinator. The number stored is the NEXT offset to read, not the last one read.' },
      { ms: 0.1, label: 'append to __consumer_offsets', desc: 'Coordinator appends the commit to __consumer_offsets, keyed by (group, topic, partition) — a compacted topic, so only the latest offset per key survives.' },
      { ms: 0, label: 'lag recomputed', desc: 'lag = LogEndOffset(104272) − committed(104272) = 0. A burner consumer or Burrow reads __consumer_offsets to chart this per partition.' },
      { ms: 0, label: 'seek / replay (optional)', desc: 'seek(104000) or seekToBeginning() rewinds; offsetsForTimes() turns a wall-clock time into offsets via the .timeindex. This is how you reprocess a bad deploy.' },
    ],
    knobs: ['enable.auto.commit=false', 'auto.commit.interval.ms=5000', 'auto.offset.reset=earliest|latest', 'isolation.level=read_committed', 'offsets.retention.minutes'],
    watch: ['records-lag-max', 'records-lag (per partition)', 'commit-latency-avg', 'commit-rate', 'time-lag (seconds behind)'],
    pitfall: 'Commit BEFORE processing ⇒ at-most-once (crash loses the record). Commit AFTER ⇒ at-least-once (crash replays it). auto-commit on a 5s timer can do either depending on where the crash lands — which is why exactly-once needs the next stage.',
    mech: ['commit → __consumer_offsets', 'lag = LEO − committed', 'compacted offsets topic', 'seek() to replay'] },

  { n: '07', icon: '🛡️', m: 'm11', title: 'Guarantee', sub: 'At-least / exactly-once',
    note: 'Idempotence + transactions turn duplicates into exactly-once processing.',
    payload: 'processing.guarantee = exactly_once_v2 · offsets + output commit atomically · no dup, no loss',
    detail: 'The default is <b>at-least-once</b>. The <b>idempotent producer</b> removes duplicate <em>writes</em> on retry; <b>transactions</b> make the whole <b>read-process-write</b> cycle atomic — the consumed offsets and the produced records commit <em>together</em> or not at all — giving <b>exactly-once</b> within Kafka. A reader with <code>isolation.level=read_committed</code> never sees records from an aborted transaction. Any external sink still needs its own idempotency for true end-to-end EOS.',
    micro: [
      { ms: 0.1, label: 'initTransactions()', desc: 'Producer registers a transactional.id, fences any older instance by bumping the producer epoch — a zombie from a previous crash can no longer write.' },
      { ms: 0.05, label: 'beginTransaction()', desc: 'Opens a transaction. All following sends and the offset commit become one atomic unit.' },
      { ms: 0.4, label: 'read-process-write', desc: 'Consume 104271, compute the enriched/aggregated output, produce it to the downstream topic — still uncommitted, invisible to read_committed consumers.' },
      { ms: 0.2, label: 'sendOffsetsToTransaction()', desc: 'The input offset 104272 is added to the SAME transaction instead of a plain commit — binding "I read this" to "I wrote that".' },
      { ms: 0.3, label: 'commitTransaction()', desc: 'Transaction coordinator writes markers to every affected partition. Output + offsets become visible atomically. A crash mid-way ⇒ the transaction aborts and everything rolls back.' },
    ],
    knobs: ['processing.guarantee=exactly_once_v2', 'transactional.id', 'isolation.level=read_committed', 'transaction.timeout.ms', 'enable.idempotence=true', 'acks=all (forced)'],
    watch: ['transaction commit rate', 'abort rate', 'txn commit latency', 'LSO (last stable offset) lag', 'fenced-producer errors'],
    pitfall: 'EOS is exactly-once WITHIN Kafka only. The moment the data leaves for an external DB/warehouse, that sink must be idempotent (upsert by a natural key) or de-dupe on its own marker — otherwise a replayed transaction double-writes downstream. transaction.timeout.ms too low ⇒ spurious aborts under load.',
    mech: ['idempotent producer', 'transactions', 'read-process-write', 'read_committed', 'EOS'] },

  { n: '08', icon: '🌊', m: 'm13', title: 'Process & Sink', sub: 'Streams · Connect · lakehouse',
    note: 'Kafka Streams transforms in flight; Connect sinks to the warehouse.',
    payload: 'enriched order → revenue-by-category window → Iceberg snapshot s7 · table version 42',
    detail: 'Now the event becomes a <b>product</b>. <b>Kafka Streams</b> transforms it in flight — filter, enrich via a <code>KTable</code> join, windowed aggregate — with local <b>RocksDB state stores</b> backed by changelog topics; <b>Kafka Connect</b> then sinks the result to a warehouse or lakehouse with no custom code, committing the sink\'s own offset/checkpoint. A raw order has become a recommendation, a fraud flag, or a live revenue rollup in an Iceberg/Delta table.',
    micro: [
      { ms: 0.2, label: 'Streams topology', desc: 'The record enters a sub-topology: a KTable join enriches it with product/category, a windowed aggregate (tumbling 1h) rolls it into revenue-by-category. State lives in RocksDB.' },
      { ms: 0.1, label: 'changelog-backed state', desc: 'Every state-store update is also produced to a compacted changelog topic. On failure a standby replica or a restored instance replays it — the aggregate survives a crash.' },
      { ms: 0.3, label: 'emit to output topic', desc: 'The rollup is produced (under EOS) to a downstream topic that Connect watches. Suppressed until the window closes past its grace period, so late events still count.' },
      { ms: 1.5, label: 'Connect sink task', desc: 'A sink connector task polls the topic, batches records, and writes Parquet data files. It only advances its own Kafka-offset checkpoint after the files are durably written.' },
      { ms: 0.4, label: 'lakehouse commit', desc: 'Iceberg writes data files → manifest → manifest-list → snapshot s7 → new metadata.json, then swaps the catalog pointer atomically (table version 41 → 42). Readers see all-or-nothing.' },
    ],
    knobs: ['processing.guarantee=exactly_once_v2 (Streams)', 'commit.interval.ms', 'state.dir / RocksDB', 'num.standby.replicas', 'Connect: tasks.max, flush.size, offset.flush.interval.ms', 'Iceberg: commit.retry, target-file-size'],
    watch: ['Streams: process-rate, commit-latency, store-put-rate, standby lag', 'Connect: sink-record-send-rate, offset-commit-success', 'table: snapshot count, small-file ratio'],
    pitfall: 'Four independent progress markers now exist — source LSN, Kafka committed offset, sink checkpoint, table version — and they advance at different times. End-to-end exactly-once requires each hop to be idempotent; a non-idempotent sink turns a Streams replay into duplicate table rows.',
    mech: ['Streams (stateful transform)', 'changelog-backed state', 'Connect sink', 'atomic table commit'] },
];

const GROUPS = [
  { title: 'Foundation', icon: '📜', color: 'var(--accent)', items: [['m01', 'Why Kafka'], ['m02', 'Messaging Fundamentals'], ['m03', 'Architecture']] },
  { title: 'Core Internals', icon: '⚙️', color: 'var(--blue)', items: [['m04', 'Producer'], ['m05', 'Broker Internals'], ['m06', 'Partitions'], ['m07', 'Replication']] },
  { title: 'Consumer Side', icon: '👥', color: 'var(--green)', items: [['m08', 'Consumer Groups'], ['m09', 'Offsets'], ['m10', 'Retention & Compaction']] },
  { title: 'Delivery', icon: '🛡️', color: 'var(--amber)', items: [['m11', 'Delivery Guarantees']] },
  { title: 'Ecosystem', icon: '🔌', color: 'var(--accent2, var(--accent))', items: [['m12', 'Kafka Connect'], ['m13', 'Kafka Streams'], ['m14', 'Schema Registry'], ['m20', 'vs Competitors']] },
  { title: 'Operations', icon: '🔧', color: 'var(--blue)', items: [['m15', 'Security'], ['m16', 'Monitoring'], ['m17', 'Performance'], ['m22', 'Reassignment']] },
  { title: 'Advanced', icon: '🚀', color: 'var(--red)', items: [['m18', 'Failure Simulation'], ['m19', 'Amazon Pipeline'], ['m21', 'MirrorMaker 2']] },
];

export function mount(container) {
  const stage = (s, i) => `
    <a class="mm-stage" href="#${s.m}" data-idx="${i}" id="mm-stage-${i}">
      <span class="mm-stage-top"><span class="mm-stage-num">${s.n}</span><span class="mm-stage-icon">${s.icon}</span></span>
      <span class="mm-stage-title">${s.title}</span>
      <span class="mm-stage-sub">${s.sub}</span>
      <span class="mm-stage-note">${s.note}</span>
    </a>`;

  const group = g => `
    <div class="mm-group">
      <div class="mm-group-head" style="border-left:3px solid ${g.color}">
        <span class="mm-group-icon">${g.icon}</span><span class="mm-group-title">${g.title}</span>
      </div>
      <div class="mm-group-items">
        ${g.items.map(([id, label]) => `<a class="mm-chip" href="#${id}"><span class="mm-chip-num">${id.replace(/^m/, '')}</span>${label}</a>`).join('')}
      </div>
    </div>`;

  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">🗺️ · Reference · Amazon Edition</div>
        <h1 class="module-title">Master Map</h1>
        <p class="module-subtitle">Follow one event end to end — from an Amazon order all the way to the warehouse — then jump into any stage. Every node links into its module.</p>
      </div>

      <div class="section-header"><div class="section-title">The journey of an event</div>
        <div class="section-desc">One Amazon order, produced → stored → replicated → consumed → processed. <b>Trace it</b> to open each hop and watch the event\'s live state, the micro-sequence inside that hop, the config knobs, the metrics you\'d watch, and the failure mode that bites there.</div></div>
      <div class="mm-flow">
        ${STAGES.map(stage).join('<span class="mm-arrow">→</span>')}
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:14px 0 4px">
        <button class="ctrl-btn" id="mm-trace">▶ Trace the event</button>
        <button class="ctrl-btn" id="mm-step">⏭ Step</button>
        <button class="ctrl-btn" id="mm-back">⏮ Back</button>
        <button class="ctrl-btn" id="mm-reset">↻ Reset</button>
        <span id="mm-clock" style="font-size:11px;font-family:ui-monospace,monospace;color:var(--text3);margin-left:auto"></span>
      </div>
      <div id="mm-detail" style="background:var(--bg2,#0C1424);border:1px solid var(--border,#1C2740);border-radius:12px;padding:16px 18px;min-height:150px"></div>

      <div class="section-header"><div class="section-title">Concept map</div>
        <div class="section-desc">All 22 modules, grouped by theme.</div></div>
      <div class="mm-groups">
        ${GROUPS.map(group).join('')}
      </div>
    </div>`;

  // ── Interactive event trace ─────────────────────────────────────────────
  const detail = container.querySelector('#mm-detail');
  const clock = container.querySelector('#mm-clock');
  const cards = [...container.querySelectorAll('.mm-stage')];
  let idx = -1, timer = null;

  // cumulative latency up to and including a given stage (sum of its micro ms)
  const stageMs = STAGES.map(s => s.micro.reduce((a, m) => a + (m.ms || 0), 0));
  const cumMs = stageMs.map((_, i) => stageMs.slice(0, i + 1).reduce((a, b) => a + b, 0));
  const fmt = n => n >= 1 ? `${n.toFixed(n < 10 ? 1 : 0)}ms` : `${(n * 1000).toFixed(0)}µs`;

  function renderClock() {
    if (idx < 0) { clock.textContent = ''; return; }
    clock.innerHTML = `⏱ hop ${STAGES[idx].n}/08 · this hop ~${fmt(stageMs[idx])} · elapsed ~${fmt(cumMs[idx])}`;
  }

  function renderDetail() {
    if (idx < 0) {
      detail.innerHTML = `<div style="color:var(--text3);font-size:12.5px;line-height:1.6">Press <b>Trace the event</b> to follow one Amazon order from the checkout button all the way to the warehouse. Each hop highlights above and expands here into its full anatomy — the event\'s live bytes, the ordered micro-sequence that happens inside that single hop (with illustrative timing), the exact config knobs that govern it, the metrics you\'d watch in production, and the one failure mode that bites there. <b>No stone unturned.</b></div>`;
      renderClock();
    } else {
      const s = STAGES[idx];
      detail.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px">
          <span style="font-size:22px">${s.icon}</span>
          <div style="flex:1;min-width:150px">
            <div style="font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--accent)">Stage ${s.n} / 08 · ${s.sub}</div>
            <div style="font-size:16px;font-weight:700;color:var(--text,#E2E8F0)">${s.title}</div>
          </div>
          <a class="ctrl-btn" href="#${s.m}" style="font-size:11px;text-decoration:none">Open module →</a>
        </div>

        <div style="font-family:ui-monospace,monospace;font-size:11px;color:#86EFAC;background:var(--bg,#070B14);border:1px solid var(--border,#1C2740);border-radius:8px;padding:9px 12px;margin-bottom:12px;word-break:break-word"><span style="color:var(--accent)">▸ event:</span> ${s.payload}</div>

        <div style="font-size:12.5px;line-height:1.65;color:var(--text2,#CBD5E1);margin-bottom:14px">${s.detail}</div>

        <div style="font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--text3);margin-bottom:8px">Inside this hop — the micro-sequence</div>
        <div style="margin-bottom:14px">
          ${s.micro.map((m, k) => `
            <div style="display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-top:${k ? '1px solid var(--border,#1C2740)' : 'none'}">
              <span style="flex:none;width:20px;height:20px;border-radius:6px;background:var(--accent);color:#061018;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;margin-top:1px">${k + 1}</span>
              <div style="flex:1;min-width:0">
                <div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap">
                  <span style="font-family:ui-monospace,monospace;font-size:11.5px;font-weight:700;color:var(--text,#E2E8F0)">${m.label}</span>
                  <span style="font-family:ui-monospace,monospace;font-size:9.5px;color:var(--text3)">+${fmt(m.ms)}</span>
                </div>
                <div style="font-size:11.5px;line-height:1.55;color:var(--text2,#94A3B8);margin-top:2px">${m.desc}</div>
              </div>
            </div>`).join('')}
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-bottom:12px">
          <div style="background:var(--bg,#070B14);border:1px solid var(--border,#1C2740);border-radius:9px;padding:10px 12px">
            <div style="font-size:9px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--blue,#60A5FA);margin-bottom:7px">⚙️ Config knobs</div>
            <div style="display:flex;gap:5px;flex-wrap:wrap">
              ${s.knobs.map(k => `<span style="font-size:10px;font-family:ui-monospace,monospace;color:var(--text2,#CBD5E1);background:var(--bg3,#111A2B);border:1px solid var(--border,#243149);border-radius:5px;padding:2px 7px">${k}</span>`).join('')}
            </div>
          </div>
          <div style="background:var(--bg,#070B14);border:1px solid var(--border,#1C2740);border-radius:9px;padding:10px 12px">
            <div style="font-size:9px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--green,#4ADE80);margin-bottom:7px">📈 What you watch</div>
            <div style="display:flex;gap:5px;flex-wrap:wrap">
              ${s.watch.map(w => `<span style="font-size:10px;font-family:ui-monospace,monospace;color:var(--text2,#CBD5E1);background:var(--bg3,#111A2B);border:1px solid var(--border,#243149);border-radius:5px;padding:2px 7px">${w}</span>`).join('')}
            </div>
          </div>
        </div>

        <div style="display:flex;gap:9px;align-items:flex-start;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.35);border-radius:9px;padding:10px 12px;margin-bottom:12px">
          <span style="font-size:14px;flex:none">⚠️</span>
          <div style="font-size:11.5px;line-height:1.55;color:var(--text2,#FCA5A5)"><b style="color:#F87171">Where it bites:</b> ${s.pitfall}</div>
        </div>

        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${s.mech.map(m => `<span style="font-size:10px;font-family:ui-monospace,monospace;color:var(--text2,#94A3B8);background:var(--bg3,#111A2B);border:1px solid var(--border,#243149);border-radius:5px;padding:3px 8px">${m}</span>`).join('')}
        </div>`;
      renderClock();
    }
    cards.forEach((c, j) => {
      c.style.outline = j === idx ? '2px solid var(--accent)' : '';
      c.style.outlineOffset = j === idx ? '2px' : '';
      c.style.opacity = idx >= 0 && j !== idx ? '0.55' : '1';
      c.style.transition = 'opacity .2s, outline-color .2s';
    });
  }

  function step() {
    idx = idx >= STAGES.length - 1 ? 0 : idx + 1;
    renderDetail();
  }
  function back() {
    idx = idx <= 0 ? STAGES.length - 1 : idx - 1;
    renderDetail();
  }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

  container.querySelector('#mm-step').addEventListener('click', () => { stopTimer(); step(); });
  container.querySelector('#mm-back').addEventListener('click', () => { stopTimer(); back(); });
  container.querySelector('#mm-reset').addEventListener('click', () => { stopTimer(); idx = -1; renderDetail(); });
  container.querySelector('#mm-trace').addEventListener('click', () => {
    stopTimer(); idx = -1; renderDetail();
    timer = setInterval(() => {
      if (idx >= STAGES.length - 1) { step(); stopTimer(); return; }
      step();
    }, 2600);
  });
  cards.forEach((c, j) => c.addEventListener('click', () => { stopTimer(); idx = j; renderDetail(); }));

  renderDetail();
  return () => stopTimer();
}
