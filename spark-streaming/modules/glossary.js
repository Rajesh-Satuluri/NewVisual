// R3 · Glossary — every Structured Streaming term, searchable, with module links
import { createModuleShell, initTabs } from '../components/module-shell.js';
import { injectModStyles, esc } from './_mod-ui.js';

// [term, definition, moduleId?]  — definition blends formal + plain.
export const TERMS = [
  ['Structured Streaming', 'Spark\'s declarative stream-processing engine that treats a live stream as an ever-growing table and runs the same DataFrame/SQL query you\'d run on batch, incrementally and forever.', 'm01'],
  ['Unbounded table', 'The core mental model: an input stream is an input table with no end, to which new rows are continuously appended; your query is an incremental view over it.', 'm02'],
  ['Result table', 'The conceptual output table Spark maintains and updates each micro-batch; what gets written to the sink depends on the output mode.', 'm02'],
  ['Incremental execution', 'Spark computes only the change to the result caused by each new micro-batch, rather than recomputing from scratch — the engine (E1) that makes streaming tractable.', 'm05'],
  ['Micro-batch', 'The default execution model: the stream is processed as a series of small, bounded batch jobs, each reading a fixed offset range. Amortizes checkpoint overhead and reuses the batch optimizer.', 'm05'],
  ['Continuous processing', 'An experimental mode giving ~1 ms latency by processing records one at a time, with at-least-once guarantees and a limited set of supported operations.', 'm06'],
  ['DStream', 'The legacy RDD-based streaming API (Spark Streaming). Superseded by Structured Streaming; lacks first-class event time and strong guarantees.', 'm01'],
  ['Driver', 'The process that plans each micro-batch, tracks offsets, manages the checkpoint, and coordinates executors.', 'm03'],
  ['Executor', 'A worker process that runs the tasks of each micro-batch and holds a shard of the state store.', 'm03'],
  ['Query planner', 'The Catalyst-based component that turns your declarative query into an incremental physical plan for each batch.', 'm03'],
  ['Source', 'An input connector that exposes replayable offsets — Kafka, file, rate, socket. Replayability is what enables exactly-once recovery.', 'm04'],
  ['Kafka source', 'Reads from Kafka topics; offsets are managed in Spark\'s checkpoint (not Kafka consumer groups). The most common production source.', 'm04'],
  ['Rate source', 'A built-in test source emitting N rows/second with timestamp and value columns — used to demo and benchmark.', 'm04'],
  ['File source', 'Reads new files dropped into a directory; requires an explicit schema and picks up files per maxFilesPerTrigger.', 'm04'],
  ['Schema inference', 'For streaming, usually disallowed/disabled — you must supply an explicit schema so the stream\'s shape is stable across batches.', 'm04'],
  ['Starting offsets', 'Where a new query begins reading (latest / earliest / explicit). Ignored once a checkpoint exists, since recovery resumes from the offset log.', 'm04'],
  ['Trigger', 'The policy that decides when the next micro-batch fires: default (ASAP), fixed processingTime interval, availableNow, once, or continuous.', 'm05'],
  ['processingTime trigger', 'Fires a micro-batch every fixed interval (e.g. 30 s) — the workhorse for steady throughput and predictable latency.', 'm05'],
  ['availableNow trigger', 'Processes all currently available data in multiple batches, then stops. Ideal for scheduled incremental batch jobs.', 'm05'],
  ['once trigger', 'Processes a single batch then stops; deprecated in favor of availableNow.', 'm05'],
  ['Batch planning', 'The deterministic act of choosing which offset range forms the next micro-batch given the trigger — modeled exactly by E1\'s planBatches.', 'm05'],
  ['Event time', 'The timestamp of when an event actually occurred (embedded in the data) — the honest clock for correct windowing, independent of when Spark sees it.', 'm07'],
  ['Processing time', 'The wall-clock time when Spark processes a record. Easy but wrong for analytics when data is delayed or out of order.', 'm07'],
  ['Out-of-order data', 'Events that arrive in a different order than they occurred — normal in distributed systems; handled via event time + watermarks.', 'm07'],
  ['Late data', 'An event whose event time is older than the current watermark. In append/update it is dropped; in complete mode nothing is late.', 'm08'],
  ['Watermark', 'A moving threshold = max(event time seen) − delay, below which data is considered too late. Bounds state and enables eviction. Monotonic by construction.', 'm08'],
  ['Watermark delay', 'The allowed lateness you configure (e.g. 10 min). Too small drops valid data; too large grows state and delays emission. Size it to real p99 lateness.', 'm08'],
  ['Global watermark', 'With multiple inputs/operators, the single watermark Spark propagates — by default the minimum across inputs, so the slowest source gates eviction everywhere.', 'm22'],
  ['Allowed lateness', 'The grace window (the watermark delay) during which late events are still accepted into their window before it is finalized.', 'm08'],
  ['Window', 'A bucket grouping events by event time so you can aggregate over time ranges. Tumbling, sliding, or session.', 'm09'],
  ['Tumbling window', 'Fixed-size, non-overlapping windows (e.g. every 5 min). Each event lands in exactly one window.', 'm09'],
  ['Sliding window', 'Fixed-size windows that advance by a smaller slide, so they overlap and an event can belong to multiple windows.', 'm09'],
  ['Session window', 'A dynamic window that groups events separated by less than a gap timeout; expands as activity continues and closes after inactivity.', 'm09'],
  ['Window assignment', 'The rule mapping an event time to the window(s) it belongs to — [start, end) half-open intervals.', 'm09'],
  ['Stateful aggregation', 'An aggregation (count/sum/etc.) keyed by group+window whose running state is kept in the state store across batches.', 'm10'],
  ['State store', 'The versioned, checkpointed key-value store (HDFS- or RocksDB-backed) holding aggregation/join/dedup state between micro-batches.', 'm10'],
  ['State eviction', 'Removing state once the watermark passes a window/key\'s end, so memory stays bounded. The whole point of watermarks.', 'm10'],
  ['RocksDB state store', 'An off-heap, disk-backed state store provider for large state — less GC pressure than the default HDFS-backed provider.', 'm20'],
  ['Keyed state', 'State partitioned by a grouping key so each key\'s aggregate/session is maintained independently.', 'm10'],
  ['Arbitrary stateful processing', 'mapGroupsWithState / flatMapGroupsWithState: full control over per-key state and timeouts for custom logic (e.g. a cart state machine).', 'm11'],
  ['GroupState', 'The handle inside [flat]mapGroupsWithState giving you get/update/remove on per-key state plus timeout control.', 'm11'],
  ['State timeout', 'A processing-time or event-time deadline after which a key\'s state callback fires (e.g. to expire an abandoned cart).', 'm11'],
  ['Output mode', 'Governs which result rows are written each batch: append, update, or complete.', 'm12'],
  ['Append mode', 'Emits only new, finalized rows that will never change (e.g. closed windows at the watermark). The default; widely supported by sinks.', 'm12'],
  ['Update mode', 'Emits only the rows that changed this batch (running aggregates of still-open windows). Ideal for live dashboards.', 'm12'],
  ['Complete mode', 'Emits the entire result table every batch. Only for small, fully-recomputable aggregations; never evicts state.', 'm12'],
  ['Deduplication', 'Removing duplicate records via dropDuplicates; without a watermark its state grows unbounded.', 'm13'],
  ['dropDuplicatesWithinWatermark', 'Dedup bounded to the watermark window, so dedup state stays finite. Preferred over plain dropDuplicates.', 'm13'],
  ['Sink', 'The output connector: Kafka, Delta, file/parquet, console, memory, or foreachBatch. Its transactional capability determines exactly-once.', 'm14'],
  ['foreachBatch', 'A sink that hands you (batchDF, batchId) so you can write with arbitrary, idempotent, or transactional logic — the universal escape hatch.', 'm14'],
  ['Idempotent write', 'A sink write that produces the same result if replayed (e.g. keyed by batch id), enabling exactly-once even on an append-only target.', 'm14'],
  ['Memory sink', 'Writes results to an in-memory table (by queryName) for debugging/interactive queries. Not for production.', 'm14'],
  ['Console sink', 'Prints each batch\'s output to the console — for development only.', 'm14'],
  ['Checkpoint', 'The directory (offset log + commit log + state + metadata) that makes a query recoverable and exactly-once. Required; one per query.', 'm15'],
  ['checkpointLocation', 'The option naming the checkpoint directory. Without it there is no recovery and no exactly-once.', 'm15'],
  ['Offset log', 'The write-ahead log of each batch\'s input offset range, written BEFORE processing so a crash can be replayed deterministically.', 'm15'],
  ['Commit log', 'The log written AFTER a batch\'s results are durably in the sink, marking it complete. Offset-logged-but-not-committed batches are replayed on restart.', 'm15'],
  ['Write-ahead log (WAL)', 'The general pattern of recording intent (offsets) before acting, so recovery is deterministic — the basis of the offset log.', 'm15'],
  ['Offset-before / commit-after', 'The protocol: log offsets before processing, log commit after sinking. Combined with a transactional sink, it yields exactly-once (engine E2).', 'm15'],
  ['Replay', 'On restart, re-reading the exact offsets of an uncommitted batch and reprocessing it. With a transactional sink this produces no duplicates.', 'm16'],
  ['Fault tolerance', 'The guarantee that a crash loses no data and (with the right source+sink) produces no duplicates, via the checkpoint.', 'm16'],
  ['Exactly-once', 'Each input affects the result exactly once end-to-end. Requires a replayable source, deterministic reprocessing, and a transactional/idempotent sink.', 'm16'],
  ['At-least-once', 'Each input affects the result one or more times — the fallback when the sink is append-only (duplicates possible, no loss).', 'm16'],
  ['Replayable source', 'A source that can re-serve the same offset range on demand (Kafka, files) — a precondition for exactly-once.', 'm16'],
  ['Transactional sink', 'A sink that can atomically replace a batch\'s output by batch id (e.g. Delta), so a replay overwrites rather than duplicates.', 'm16'],
  ['Stream-static join', 'Joining a stream to a static (re-read) table for enrichment; the static side holds no state and needs no watermark.', 'm17'],
  ['Dimension lookup', 'The classic stream-static use case: enriching streaming facts with slowly-changing dimension attributes.', 'm17'],
  ['Stream-stream join', 'Joining two live streams on an equality key plus a time-range constraint; both sides are buffered in state until the watermark proves no future match.', 'm18'],
  ['Time-range constraint', 'The mandatory bound (e.g. right within [left.t, left.t+1h]) that makes stream-stream join state finite.', 'm18'],
  ['Outer-join null emission', 'In left/right/full outer stream-stream joins, unmatched rows emit null-padded results only at watermark eviction — deliberately delayed.', 'm18'],
  ['Dual-side buffering', 'Stream-stream joins keep both inputs\' recent rows in state (keyed) so a match is found regardless of which side arrives first.', 'm18'],
  ['Delta Lake', 'An ACID table format on object storage; a transactional streaming sink supporting MERGE, time travel, and schema enforcement.', 'm19'],
  ['MERGE', 'An upsert operation (insert/update/delete by key) — in streaming, run inside foreachBatch to maintain a current-state table from a change stream.', 'm19'],
  ['CDC', 'Change Data Capture: a stream of insert/update/delete events; merged into a Delta table to mirror a source\'s current state.', 'm19'],
  ['Medallion architecture', 'Bronze→silver→gold layering of lakehouse tables (raw → cleaned → aggregated), commonly fed by streaming pipelines.', 'm19'],
  ['Small-file problem', 'Streaming sinks produce many tiny files; mitigated by compaction/OPTIMIZE and tuning trigger interval.', 'm19'],
  ['Shuffle partitions', 'spark.sql.shuffle.partitions sets state-store parallelism for stateful ops; CANNOT be changed after a checkpoint exists.', 'm20'],
  ['maxOffsetsPerTrigger', 'Caps Kafka records per batch — the primary backpressure / batch-size lever.', 'm20'],
  ['Backpressure', 'Automatically limiting intake so the engine keeps up; in Structured Streaming via maxOffsetsPerTrigger / rate limits.', 'm20'],
  ['Batch duration', 'How long a micro-batch takes to process; must stay under the trigger interval or the query falls behind.', 'm21'],
  ['Trigger interval', 'The target time between batch starts (processingTime). If batch duration exceeds it, latency grows unbounded.', 'm21'],
  ['StreamingQueryProgress', 'The per-batch metrics object (lastProgress): input rows, rates, durations, watermark, and per-operator state stats.', 'm21'],
  ['numInputRows', 'Rows read in a batch — a key throughput metric in StreamingQueryProgress.', 'm21'],
  ['inputRowsPerSecond', 'The incoming rate; compare against processedRowsPerSecond to spot a lagging query.', 'm21'],
  ['stateOperators', 'The StreamingQueryProgress section reporting state row counts and memory per stateful operator — your first stop for state-growth diagnosis.', 'm21'],
  ['StreamingQueryListener', 'A callback interface (onQueryStarted/Progress/Terminated) for pushing streaming metrics to alerting/monitoring.', 'm21'],
  ['numRowsDroppedByWatermark', 'Count of late rows discarded by the watermark in a batch — a signal your delay may be too tight.', 'm21'],
  ['Capstone pipeline', 'An end-to-end query composing windows, joins, and checkpointing under one watermark and one checkpoint (engines E1+E2+E3).', 'm22'],
  ['Checkpoint compatibility', 'The rule that you cannot change aggregation keys, window definitions, state parallelism, or add/remove stateful ops against an existing checkpoint.', 'm22'],
  ['Query graph', 'The DAG of operators (sources, stateful ops, sink) that make up one streaming query, sharing one checkpoint and watermark.', 'm22'],
  // ── general / supporting terms ──
  ['DataFrame', 'Spark\'s distributed table abstraction; the same API works for batch and streaming queries.', 'm01'],
  ['Catalyst', 'Spark\'s query optimizer that plans both batch and streaming queries into efficient physical plans.', 'm03'],
  ['Spark SQL', 'The SQL/DataFrame engine underneath Structured Streaming; streaming is "SQL that runs forever".', 'm01'],
  ['Offset', 'A position in a source partition (e.g. Kafka offset) identifying where a batch\'s read starts/ends.', 'm04'],
  ['Partition', 'A unit of parallelism — a source partition (Kafka) or a Spark shuffle partition for state.', 'm20'],
  ['Barrier / epoch', 'In continuous mode, the marker coordinating consistent offset commits across tasks.', 'm06'],
  ['Grace period', 'Another name for the watermark\'s allowed-lateness window before a window finalizes.', 'm08'],
  ['Finalization', 'The moment a window closes (watermark passes its end) and its append-mode result is emitted and state evicted.', 'm09'],
  ['Hopping window', 'Kafka Streams\' name for a sliding window; same overlapping-fixed-size concept.', 'm09'],
  ['Changelog', 'The stream of state updates (used by RocksDB changelog checkpointing and by Kafka Streams state topics).', 'm20'],
  ['Savepoint', 'Flink\'s equivalent of a checkpoint taken on demand for upgrades; Spark uses the checkpoint directory + minBatchesToRetain.', 'm16'],
  ['Idempotence key', 'The key (often batchId) by which a sink deduplicates replays to achieve exactly-once on non-transactional targets.', 'm14'],
  ['Backfill', 'Reprocessing historical data, often via availableNow, through the same streaming code path.', 'm05'],
  ['noDataMicroBatches', 'Empty batches fired during quiet periods so watermarks still advance and windows close on time.', 'm12'],
  ['Watermark monotonicity', 'The guarantee that the watermark never moves backward, even if a late batch has a smaller max event time.', 'm08'],
  ['Spill', 'When state or shuffle data exceeds memory and is written to disk — a tuning signal (favor RocksDB for large state).', 'm20'],
  ['OOM risk', 'Out-of-memory danger from unbounded or oversized state; diagnosed via stateOperators memory and fixed by watermarks/RocksDB.', 'm20'],
  ['Multiple watermark policy', 'spark.sql.streaming.multipleWatermarkPolicy — min (safe default) vs max across multiple input watermarks.', 'm22'],
  ['Exactly-once sink contract', 'The sink-side half of EOS: atomically commit a batch id once, ignoring replays of the same id.', 'm16'],
  ['Rate limiting', 'Bounding intake per batch (maxOffsetsPerTrigger / minOffsetsPerTrigger) to control latency and batch size.', 'm20'],
];

export function mount(container) {
  injectModStyles();

  const intro = `
  <div class="ss-prose">
    <p>Every Structured Streaming term in this course — ${TERMS.length} of them — defined and linked to the module that teaches it. Type to filter by term or definition.</p>
  </div>
  <div class="ss-controls">
    <input id="gl-q" placeholder="Search ${TERMS.length} terms…" style="flex:1;min-width:220px;background:var(--bg-elevated);border:1px solid var(--border);color:var(--text-primary);border-radius:8px;padding:8px 12px;font-size:13px">
    <span id="gl-count" style="font-size:12px;color:var(--text-muted)"></span>
  </div>
  <div id="gl-list"></div>`;

  container.innerHTML = createModuleShell({
    tag: 'Reference · R3',
    title: '📖 Glossary',
    subtitle: `${TERMS.length} terms — formal + plain, linked to their module`,
    tabs: [{ id: 'gl', label: '📖 Terms', content: intro }],
  });
  initTabs(container);

  const list = container.querySelector('#gl-list');
  const q = container.querySelector('#gl-q');
  const countEl = container.querySelector('#gl-count');
  const sorted = [...TERMS].sort((a, b) => a[0].localeCompare(b[0]));

  function render(filter) {
    const f = (filter || '').trim().toLowerCase();
    const rows = sorted.filter((t) => !f || (t[0] + ' ' + t[1]).toLowerCase().includes(f));
    countEl.textContent = `${rows.length} / ${TERMS.length}`;
    if (!rows.length) { list.innerHTML = '<p style="color:var(--text-muted);font-size:13px;padding:16px">No terms match.</p>'; return; }
    list.innerHTML = rows.map((t) => `
      <div style="padding:12px 0;border-top:1px solid color-mix(in srgb,var(--border) 55%,transparent)">
        <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">
          <b style="color:var(--text-primary);font-size:14px">${esc(t[0])}</b>
          ${t[2] ? `<a href="#${t[2]}" class="ss-btn" style="padding:2px 8px;font-size:11px;font-weight:700">${t[2].toUpperCase()} ↗</a>` : ''}
        </div>
        <p style="margin:5px 0 0;font-size:13px;line-height:1.6;color:var(--text-secondary);max-width:80ch">${esc(t[1])}</p>
      </div>`).join('');
  }

  q.addEventListener('input', () => render(q.value));
  render('');
  return null;
}

export default { mount };
