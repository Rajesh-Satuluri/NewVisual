// Gate 7 (I69) — System Design Lab. Pick a brief, make design decisions, then get
// evaluated feedback against the brief's real trade-offs. Not a single "right"
// answer — the rubric rewards choices that satisfy the stated requirements.
import { getScenario } from '../data/scenarios.js';
import { callout, flowDiagram } from '../components/lesson-shell.js';

const BRIEFS = [
  {
    id: 'fraud', icon: '🛡️', title: 'Real-time fraud detection',
    reqs: ['Sub-second scoring latency', 'Per-entity ordering', 'Survive failures without losing events', 'Replay history to retrain models'],
    fields: [
      { id: 'log', label: 'Ingestion log', opts: { kafka: 'Kafka / MSK', kinesis: 'Kinesis', none: 'No durable log (direct call)' } },
      { id: 'proc', label: 'Processor', opts: { flink: 'Apache Flink (per-event)', dbx: 'Databricks (micro-batch)', lambda: 'Lambda (per-event fn)' } },
      { id: 'key', label: 'Partition key', opts: { entity: 'By entity (preserves order)', random: 'Random (max spread)' } },
      { id: 'sink', label: 'Raw landing', opts: { lake: 'Lakehouse / object store', nowrite: 'Do not keep raw' } },
    ],
    score(a) {
      const f = [];
      if (a.log === 'none') f.push(['bad', 'No durable log means no replay and no failure recovery — both are hard requirements here.']);
      else f.push(['good', 'A durable, replayable log satisfies both failure-recovery and replay-for-retraining.']);
      if (a.proc === 'flink') f.push(['good', 'Flink is per-event — meets the sub-second latency requirement and handles rich stateful scoring.']);
      else if (a.proc === 'lambda') f.push(['warn', 'Lambda is low-latency but weak for complex windowed/keyed scoring; fine for simple rules only.']);
      else f.push(['bad', 'Databricks is micro-batch by default (seconds) — misses the sub-second requirement unless you use real-time mode.']);
      if (a.key === 'entity') f.push(['good', 'Keying by entity preserves the per-entity ordering the scoring logic depends on.']);
      else f.push(['bad', 'Random keying maximizes spread but breaks per-entity ordering — scoring would see events out of sequence.']);
      if (a.sink === 'lake') f.push(['good', 'Landing raw to a lakehouse enables model retraining and audit/replay.']);
      else f.push(['bad', 'Not keeping raw data makes retraining and incident forensics impossible.']);
      return f;
    },
    ideal: ['Kafka / MSK', 'Apache Flink (per-event)', 'By entity', 'Lakehouse / object store'],
  },
  {
    id: 'orders', icon: '🛒', title: 'Order processing without double-charges',
    reqs: ['No double-charge ever', 'Per-order event ordering', 'Exactly-once to the ledger', 'Analytics on all orders'],
    fields: [
      { id: 'log', label: 'Ingestion log', opts: { kafka: 'Kafka / MSK', eventhubs: 'Event Hubs', none: 'No durable log' } },
      { id: 'key', label: 'Partition key', opts: { order: 'By order id (ordering)', customer: 'By customer id' } },
      { id: 'sink', label: 'Ledger sink', opts: { txn: 'Transactional sink (Delta/DB txn)', rest: 'Plain REST call', idem: 'REST + idempotency key' } },
      { id: 'analytics', label: 'Analytics path', opts: { lake: 'Stream to lakehouse', none: 'Query the log directly forever' } },
    ],
    score(a) {
      const f = [];
      if (a.log === 'none') f.push(['bad', 'Without a durable log you cannot recover or reprocess — exactly-once is impossible.']);
      else f.push(['good', 'A durable log is the foundation for ordered, recoverable processing.']);
      if (a.key === 'order') f.push(['good', 'Keying by order id keeps each order\'s events (place→pay→ship) in sequence.']);
      else f.push(['warn', 'Keying by customer groups a customer\'s orders but can interleave events of different orders — order id is safer for per-order sequencing.']);
      if (a.sink === 'txn') f.push(['good', 'A transactional sink gives exactly-once to the ledger — no double-charge on replay.']);
      else if (a.sink === 'idem') f.push(['good', 'REST + idempotency key makes the external charge safe under at-least-once replay.']);
      else f.push(['bad', 'A plain REST call is non-idempotent: a replay after failure double-charges. This violates the hard requirement.']);
      if (a.analytics === 'lake') f.push(['good', 'Streaming to a lakehouse gives durable, queryable analytics on all orders.']);
      else f.push(['warn', 'Querying the log forever is impractical (retention, no rich analytics) — land it to a store.']);
      return f;
    },
    ideal: ['Kafka / MSK', 'By order id', 'Transactional sink (Delta/DB txn)', 'Stream to lakehouse'],
  },
  {
    id: 'location', icon: '📍', title: 'Real-time location & ETA (mobility)',
    reqs: ['Handle out-of-order GPS events', 'Event-time windows, not wall-clock', 'Sub-second ETA updates to riders', 'Geospatial aggregation per area'],
    fields: [
      { id: 'log', label: 'Ingestion log', opts: { kafka: 'Kafka / MSK', kinesis: 'Kinesis', none: 'No durable log' } },
      { id: 'time', label: 'Time semantics', opts: { event: 'Event-time + watermarks', proc: 'Processing-time only' } },
      { id: 'proc', label: 'Processor', opts: { flink: 'Flink (per-event, stateful)', batch: 'Hourly batch job' } },
      { id: 'key', label: 'Partition key', opts: { driver: 'By driver/vehicle (ordering)', random: 'Random' } },
    ],
    score(a) {
      const f = [];
      f.push(a.log === 'none' ? ['bad', 'No durable log — you cannot replay GPS streams or recover after failure.'] : ['good', 'A durable log lets you replay GPS history and recover cleanly.']);
      f.push(a.time === 'event' ? ['good', 'Event-time + watermarks correctly handles GPS events that arrive out of order — the core requirement.'] : ['bad', 'Processing-time buckets misplace late GPS pings, corrupting ETA windows. Event-time is required.']);
      f.push(a.proc === 'flink' ? ['good', 'Flink gives sub-second, stateful per-event processing for live ETA.'] : ['bad', 'An hourly batch job cannot meet sub-second ETA updates.']);
      f.push(a.key === 'driver' ? ['good', 'Keying by driver keeps each vehicle\'s pings ordered for trajectory/ETA state.'] : ['warn', 'Random keying spreads load but breaks per-vehicle ordering needed for trajectory state.']);
      return f;
    },
    ideal: ['Kafka / MSK', 'Event-time + watermarks', 'Flink (per-event, stateful)', 'By driver/vehicle'],
  },
  {
    id: 'inventory', icon: '📦', title: 'Real-time inventory without overselling',
    reqs: ['Never oversell a SKU', 'Per-SKU event ordering', 'Consistent counts under bursts', 'Survive processor restarts'],
    fields: [
      { id: 'log', label: 'Ingestion log', opts: { kafka: 'Kafka / MSK', eventhubs: 'Event Hubs', none: 'No durable log' } },
      { id: 'key', label: 'Partition key', opts: { sku: 'By SKU (ordering)', warehouse: 'By warehouse' } },
      { id: 'update', label: 'Count update', opts: { cas: 'Atomic compare-and-set / conditional write', blind: 'Blind decrement (read then write)' } },
      { id: 'state', label: 'Processor state', opts: { ckpt: 'Checkpointed stateful stream', none: 'Stateless, recompute each time' } },
    ],
    score(a) {
      const f = [];
      f.push(a.log === 'none' ? ['bad', 'Without a durable log, reservation events lost on failure cause phantom stock.'] : ['good', 'A durable log makes reservations recoverable and reprocessable.']);
      f.push(a.key === 'sku' ? ['good', 'Keying by SKU serializes reservations per item — the ordering that prevents oversell.'] : ['warn', 'By warehouse can still interleave two orders for the same SKU; SKU keying is safer for the oversell guarantee.']);
      f.push(a.update === 'cas' ? ['good', 'Atomic compare-and-set prevents the lost-update race that leads to overselling.'] : ['bad', 'Blind read-then-write races under concurrency and oversells. Use a conditional/atomic write.']);
      f.push(a.state === 'ckpt' ? ['good', 'Checkpointed state survives restarts without replaying from zero.'] : ['warn', 'Recomputing from the whole log each restart is correct but slow and costly at scale.']);
      return f;
    },
    ideal: ['Kafka / MSK', 'By SKU', 'Atomic compare-and-set / conditional write', 'Checkpointed stateful stream'],
  },
  {
    id: 'clickstream', icon: '🖱️', title: 'High-volume clickstream analytics',
    reqs: ['Ingest very high throughput cheaply', 'Sessionize user activity', 'Approximate metrics acceptable', 'Cheap long-term storage'],
    fields: [
      { id: 'log', label: 'Ingestion log', opts: { kafka: 'Kafka / MSK', kinesis: 'Kinesis', pubsub: 'Pub/Sub' } },
      { id: 'window', label: 'Aggregation', opts: { session: 'Session windows (gap-based)', tumbling: 'Fixed tumbling windows', none: 'No windowing' } },
      { id: 'card', label: 'Unique counts', opts: { approx: 'HyperLogLog (approximate)', exact: 'Exact distinct (full state)' } },
      { id: 'sink', label: 'Storage', opts: { lake: 'Columnar lakehouse (Parquet/Delta)', oltp: 'Row OLTP database' } },
    ],
    score(a) {
      const f = [];
      f.push(['good', 'All three logs scale to high throughput; partition count governs parallelism.']);
      f.push(a.window === 'session' ? ['good', 'Session windows model real user activity bursts separated by inactivity gaps.'] : a.window === 'tumbling' ? ['warn', 'Fixed windows are simpler but split or merge real sessions arbitrarily.'] : ['bad', 'No windowing means no sessionization — a stated requirement.']);
      f.push(a.card === 'approx' ? ['good', 'HyperLogLog gives cheap approximate unique counts — ideal when approximation is acceptable.'] : ['warn', 'Exact distinct holds every key in state — expensive at clickstream scale when approximation was allowed.']);
      f.push(a.sink === 'lake' ? ['good', 'Columnar lakehouse storage is cheap and fast for analytical scans.'] : ['bad', 'A row OLTP store is costly and slow for high-volume analytical queries.']);
      return f;
    },
    ideal: ['Kafka / MSK', 'Session windows (gap-based)', 'HyperLogLog (approximate)', 'Columnar lakehouse (Parquet/Delta)'],
  },
  {
    id: 'recs', icon: '🎯', title: 'Real-time recommendation features',
    reqs: ['Low-latency feature freshness', 'Combine streaming + batch features', 'Consistent reads at serving time', 'Replay to rebuild features'],
    fields: [
      { id: 'log', label: 'Event log', opts: { kafka: 'Kafka / MSK', kinesis: 'Kinesis', none: 'No durable log' } },
      { id: 'proc', label: 'Feature compute', opts: { stream: 'Streaming aggregation (Flink/SS)', nightly: 'Nightly batch only' } },
      { id: 'store', label: 'Feature store', opts: { online: 'Online store + offline parity', cache: 'Ad-hoc cache only' } },
      { id: 'sink', label: 'Raw landing', opts: { lake: 'Land raw to lakehouse', none: 'Discard raw' } },
    ],
    score(a) {
      const f = [];
      f.push(a.log === 'none' ? ['bad', 'No durable log means you cannot replay to rebuild features after a bug.'] : ['good', 'A durable log enables replay to rebuild or backfill features.']);
      f.push(a.proc === 'stream' ? ['good', 'Streaming aggregation keeps features fresh to seconds — the latency requirement.'] : ['bad', 'Nightly batch features are stale by up to a day; fails the freshness requirement.']);
      f.push(a.store === 'online' ? ['good', 'An online store with offline parity gives consistent train/serve features (no skew).'] : ['warn', 'An ad-hoc cache risks train/serve skew and has no durability guarantees.']);
      f.push(a.sink === 'lake' ? ['good', 'Landing raw enables offline training and feature backfills.'] : ['bad', 'Discarding raw blocks retraining and backfills.']);
      return f;
    },
    ideal: ['Kafka / MSK', 'Streaming aggregation (Flink/SS)', 'Online store + offline parity', 'Land raw to lakehouse'],
  },
  {
    id: 'iot', icon: '📡', title: 'IoT telemetry at massive device scale',
    reqs: ['Millions of intermittent devices', 'Tolerate late / duplicate readings', 'Downsample for storage', 'Bounded state growth'],
    fields: [
      { id: 'log', label: 'Ingestion', opts: { kafka: 'Kafka / MSK', eventhubs: 'Event Hubs', iothub: 'Cloud IoT gateway → log' } },
      { id: 'late', label: 'Late data', opts: { wm: 'Watermark + bounded allowed-lateness', drop: 'Drop anything late', keep: 'Keep all state forever' } },
      { id: 'dedup', label: 'Duplicates', opts: { idem: 'Idempotent keys / dedup window', none: 'Ignore duplicates' } },
      { id: 'sink', label: 'Storage', opts: { roll: 'Downsampled rollups + raw cold store', raw: 'Keep every raw reading hot' } },
    ],
    score(a) {
      const f = [];
      f.push(['good', 'All three front-ends can funnel device telemetry into a partitioned log.']);
      f.push(a.late === 'wm' ? ['good', 'Watermarks with bounded allowed-lateness admit stragglers while keeping state bounded.'] : a.late === 'drop' ? ['warn', 'Dropping all late data loses readings from devices with poor connectivity — common in IoT.'] : ['bad', 'Keeping window state forever grows unbounded with millions of devices.']);
      f.push(a.dedup === 'idem' ? ['good', 'Idempotent keys / a dedup window neutralize the duplicate readings devices resend.'] : ['bad', 'Ignoring duplicates double-counts readings from devices that retransmit.']);
      f.push(a.sink === 'roll' ? ['good', 'Downsampled rollups plus a cold raw tier balance query speed and storage cost.'] : ['warn', 'Keeping every raw reading hot is accurate but very costly at device scale.']);
      return f;
    },
    ideal: ['Kafka / MSK', 'Watermark + bounded allowed-lateness', 'Idempotent keys / dedup window', 'Downsampled rollups + raw cold store'],
  },
  {
    id: 'recon', icon: '🧾', title: 'Payment ↔ order reconciliation',
    reqs: ['Match payment to order events', 'Both sides arrive out of order', 'Exactly-once to the ledger', 'Flag unmatched after a timeout'],
    fields: [
      { id: 'log', label: 'Ingestion log', opts: { kafka: 'Kafka / MSK', eventhubs: 'Event Hubs', none: 'No durable log' } },
      { id: 'join', label: 'Correlation', opts: { ttl: 'Stream-stream join with state TTL', lookup: 'Point lookup against a DB', none: 'Assume same-time arrival' } },
      { id: 'key', label: 'Join key', opts: { order: 'By order/transaction id', time: 'By arrival time bucket' } },
      { id: 'sink', label: 'Ledger write', opts: { txn: 'Transactional/exactly-once sink', rest: 'Plain REST (no idempotency)' } },
    ],
    score(a) {
      const f = [];
      f.push(a.log === 'none' ? ['bad', 'No durable log — unmatched events cannot be reprocessed when the other side arrives late.'] : ['good', 'A durable log lets late counterparties be reprocessed against buffered state.']);
      f.push(a.join === 'ttl' ? ['good', 'A stream-stream join with state TTL buffers one side until its match arrives, then expires to flag unmatched — exactly this problem.'] : a.join === 'lookup' ? ['warn', 'A point lookup works only if the other side is already persisted; it misses the out-of-order case.'] : ['bad', 'Assuming same-time arrival fails the out-of-order requirement outright.']);
      f.push(a.key === 'order' ? ['good', 'Joining by order/transaction id is the correct correlation key.'] : ['bad', 'Time-bucket joining mismatches payments and orders that arrive in different buckets.']);
      f.push(a.sink === 'txn' ? ['good', 'A transactional sink gives exactly-once ledger writes under replay.'] : ['bad', 'A non-idempotent REST write double-posts to the ledger on replay.']);
      return f;
    },
    ideal: ['Kafka / MSK', 'Stream-stream join with state TTL', 'By order/transaction id', 'Transactional/exactly-once sink'],
  },
  {
    id: 'lakehouse', icon: '🏞️', title: 'Near-real-time lakehouse ingestion',
    reqs: ['Minutes-fresh tables', 'Handle schema evolution', 'Avoid the small-file problem', 'Exactly-once into the table'],
    fields: [
      { id: 'ingest', label: 'Ingestion', opts: { autoloader: 'Incremental file/stream loader', fullscan: 'Re-scan the whole source each run' } },
      { id: 'schema', label: 'Schema changes', opts: { evolve: 'Schema evolution + enforcement', fail: 'Fail on any new column' } },
      { id: 'write', label: 'Table write', opts: { txn: 'ACID table (Delta/Iceberg) exactly-once', append: 'Raw append, no transaction' } },
      { id: 'files', label: 'File sizing', opts: { compact: 'Periodic compaction / optimized writes', none: 'Write one file per micro-batch' } },
    ],
    score(a) {
      const f = [];
      f.push(a.ingest === 'autoloader' ? ['good', 'Incremental loading processes only new data — keeps tables minutes-fresh at low cost.'] : ['bad', 'Re-scanning the whole source each run is slow and expensive; it cannot stay minutes-fresh.']);
      f.push(a.schema === 'evolve' ? ['good', 'Schema evolution with enforcement absorbs new columns without breaking the pipeline.'] : ['warn', 'Failing on every new column halts ingestion whenever upstream adds a field.']);
      f.push(a.write === 'txn' ? ['good', 'An ACID table gives exactly-once commits — no partial or duplicated micro-batches.'] : ['bad', 'Raw appends without transactions duplicate rows on retry; violates exactly-once.']);
      f.push(a.files === 'compact' ? ['good', 'Compaction/optimized writes prevent the small-file problem that cripples query speed.'] : ['bad', 'One file per micro-batch creates millions of tiny files and slow reads.']);
      return f;
    },
    ideal: ['Incremental file/stream loader', 'Schema evolution + enforcement', 'ACID table (Delta/Iceberg) exactly-once', 'Periodic compaction / optimized writes'],
  },
  {
    id: 'region', icon: '🌐', title: 'Cross-region streaming & recovery',
    reqs: ['Survive a full region loss', 'Bounded data loss (RPO)', 'Preserve ordering within a region', 'No duplicates after failover'],
    fields: [
      { id: 'repl', label: 'Replication', opts: { async: 'Async cross-region mirroring', active: 'Active-active both regions', single: 'Single region only' } },
      { id: 'offset', label: 'Failover offsets', opts: { translate: 'Offset translation / committed checkpoints', restart: 'Restart from latest (skip gap)', zero: 'Restart from zero' } },
      { id: 'dedup', label: 'Post-failover dup handling', opts: { idem: 'Idempotent/transactional sink', none: 'None' } },
      { id: 'key', label: 'Ordering', opts: { key: 'Key-partitioned per region', round: 'Round-robin' } },
    ],
    score(a) {
      const f = [];
      f.push(a.repl === 'single' ? ['bad', 'A single region cannot survive a region loss — the primary requirement.'] : a.repl === 'active' ? ['good', 'Active-active gives the lowest RPO and fastest failover (at higher cost/complexity).'] : ['good', 'Async mirroring survives region loss with a small, bounded RPO.']);
      f.push(a.offset === 'translate' ? ['good', 'Offset translation / committed checkpoints resume near where the failed region stopped — bounded loss, minimal re-read.'] : a.offset === 'restart' ? ['warn', 'Restarting from latest avoids dups but can skip un-replicated events (larger RPO).'] : ['bad', 'Restarting from zero reprocesses everything and floods the sink.']);
      f.push(a.dedup === 'idem' ? ['good', 'An idempotent/transactional sink absorbs the re-reads failover inevitably causes.'] : ['bad', 'Without idempotency, failover re-reads duplicate records downstream.']);
      f.push(a.key === 'key' ? ['good', 'Key-partitioning preserves per-entity ordering within each region.'] : ['warn', 'Round-robin maximizes spread but loses per-entity ordering.']);
      return f;
    },
    ideal: ['Async cross-region mirroring', 'Offset translation / committed checkpoints', 'Idempotent/transactional sink', 'Key-partitioned per region'],
  },
];

export async function mount(container, id) {
  const sc = getScenario();
  if (!id || id === 'sysdesign') return landing(container, sc);
  const brief = BRIEFS.find(b => b.id === id.replace('sd-', ''));
  if (!brief) return landing(container, sc);
  return lab(container, sc, brief);
}

function landing(container, sc) {
  container.innerHTML = `
    <div class="page-head"><div class="page-eyebrow">Practice</div>
      <h1 class="page-title">📐 System Design Lab</h1>
      <p class="page-sub">Take a design brief, make the architecture decisions, and get evaluated feedback on
        whether your choices satisfy the requirements and their trade-offs.</p></div>
    <div class="scenario-banner"><span class="sb-ico">${sc.icon}</span>
      <div class="sb-body">Design practice grounded in both permanent scenarios — mobility and e-commerce.</div></div>
    <div class="fnd-grid">
      ${BRIEFS.map(b => `<div class="card fnd-card" data-go="sd-${b.id}">
        <span class="fnd-num">${b.icon}</span>
        <div><h3>${b.title}</h3><p>Requirements: ${b.reqs.join(' · ')}</p></div></div>`).join('')}
    </div>`;
  container.querySelectorAll('[data-go]').forEach(c => c.addEventListener('click', () => { location.hash = '#' + c.dataset.go; }));
}

function lab(container, sc, brief) {
  const sel = (fld) => `<label class="sim-slider"><span>${fld.label}</span>
    <select id="sd-${fld.id}" style="background:var(--bg3);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:6px">
      ${Object.entries(fld.opts).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>`;
  container.innerHTML = `
    <div class="page-head"><div class="page-eyebrow"><a href="#sysdesign" style="color:var(--text3)">System Design Lab</a></div>
      <h1 class="page-title">${brief.icon} ${brief.title}</h1></div>
    ${callout('info', '📋 Requirements', '<ul class="clean">' + brief.reqs.map(r => `<li>${r}</li>`).join('') + '</ul>')}
    <div class="card"><div style="font-weight:600;margin-bottom:10px">Make your design decisions:</div>
      <div class="sim-controls">${brief.fields.map(sel).join('')}</div>
      <div style="margin-top:12px"><button class="btn primary" id="sd-eval">Evaluate my design</button></div>
    </div>
    <div id="sd-diag"></div><div id="sd-fb"></div>
    <div class="lx-nav"><div><button class="btn" data-go="sysdesign">← All briefs</button></div></div>`;
  container.querySelectorAll('.lx-nav [data-go]').forEach(b => b.addEventListener('click', () => { location.hash = '#' + b.dataset.go; }));
  container.querySelector('#sd-eval').addEventListener('click', () => {
    const a = {}; brief.fields.forEach(f => a[f.id] = container.querySelector('#sd-' + f.id).value);
    const chosen = brief.fields.map(f => f.opts[a[f.id]]);
    const fb = brief.score(a);
    const good = fb.filter(x => x[0] === 'good').length, bad = fb.filter(x => x[0] === 'bad').length;
    const verdict = bad === 0 ? ['ok', `✅ Strong design — ${good}/${fb.length} choices meet the requirements.`]
      : bad <= 1 ? ['warn', `⚠ Nearly there — ${bad} choice violates a requirement.`]
      : ['danger', `✗ Several requirements unmet — ${bad} choices need rework.`];
    container.querySelector('#sd-diag').innerHTML = flowDiagram(chosen);
    container.querySelector('#sd-fb').innerHTML =
      callout(verdict[0], 'Verdict', verdict[1]) +
      fb.map(([k, t]) => callout(k === 'good' ? 'ok' : k === 'warn' ? 'warn' : 'danger', k === 'good' ? '✓' : k === 'warn' ? '⚠' : '✗', t)).join('') +
      callout('info', '💡 A reference design', brief.ideal.join('  →  '));
  });
}
