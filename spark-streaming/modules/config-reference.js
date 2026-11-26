// R5 · Config Reference — streaming knobs, defaults, and effects (searchable)
import { createModuleShell, initTabs } from '../components/module-shell.js';
import { injectModStyles, esc } from './_mod-ui.js';

// group, key, default, effect
export const CONFIGS = [
  // ── Source / read options ──
  ['Source', 'startingOffsets', 'latest', 'Where a NEW query begins: "latest", "earliest", or explicit JSON offsets. Ignored once a checkpoint exists (recovery resumes from the offset log).'],
  ['Source', 'maxOffsetsPerTrigger', 'none (all)', 'Caps Kafka records read per micro-batch → rate limiting / bounded batch size. The main backpressure lever for Kafka.'],
  ['Source', 'minOffsetsPerTrigger', 'none', 'Wait until at least this many records are available before firing a batch (amortize tiny batches).'],
  ['Source', 'maxFilesPerTrigger', '1000', 'File source: how many new files to pick up per batch. Lower it to smooth bursty backfills.'],
  ['Source', 'failOnDataLoss', 'true', 'Fail if Kafka offsets vanish (topic deleted / retention). Set false to tolerate gaps (at-least-once-ish).'],
  ['Source', 'kafka.group.id', 'auto', 'Rarely set — Spark manages offsets in its checkpoint, NOT in Kafka consumer groups.'],
  ['Source', 'includeHeaders', 'false', 'Expose Kafka record headers as a column.'],

  // ── Trigger ──
  ['Trigger', 'Trigger.ProcessingTime', '0 (ASAP)', 'Fixed micro-batch interval. Default fires a new batch as soon as the previous finishes.'],
  ['Trigger', 'Trigger.AvailableNow', '—', 'Process all available data in multiple batches, then stop. Best for scheduled incremental jobs.'],
  ['Trigger', 'Trigger.Once', '—', 'One batch then stop (deprecated in favor of AvailableNow).'],
  ['Trigger', 'Trigger.Continuous', '—', 'Experimental ~1 ms latency, at-least-once, limited operations.'],

  // ── Watermark / event time ──
  ['Watermark', 'withWatermark(col, delay)', 'none', 'Defines event-time watermark = max(eventTime) − delay. Required for append windows, stream-stream joins, dedup-within-watermark.'],
  ['Watermark', 'spark.sql.streaming.multipleWatermarkPolicy', 'min', 'With multiple inputs, the global watermark is the min (safe) or max of per-input watermarks.'],

  // ── State store ──
  ['State', 'spark.sql.streaming.stateStore.providerClass', 'HDFSBackedStateStoreProvider', 'Set to RocksDBStateStoreProvider for large state (off-heap, less GC pressure).'],
  ['State', 'spark.sql.streaming.stateStore.rocksdb.compactOnCommit', 'false', 'Compact RocksDB on each commit — smaller files, more CPU.'],
  ['State', 'spark.sql.streaming.stateStore.rocksdb.changelogCheckpointing.enabled', 'false', 'Checkpoint only the changelog (faster commits) instead of full snapshots.'],
  ['State', 'spark.sql.shuffle.partitions', '200', 'Number of state-store partitions for stateful ops. CANNOT change after a checkpoint exists — it fixes state parallelism.'],
  ['State', 'spark.sql.streaming.stateStore.maintenanceInterval', '60s', 'How often background maintenance (snapshot/cleanup) runs.'],
  ['State', 'spark.sql.streaming.stateStore.minDeltasForSnapshot', '10', 'Delta files before a full snapshot is written.'],

  // ── Checkpoint / reliability ──
  ['Checkpoint', 'checkpointLocation', 'none (required)', 'Directory holding offset log, commit log, state, and metadata. The foundation of fault tolerance + exactly-once. One per query.'],
  ['Checkpoint', 'spark.sql.streaming.minBatchesToRetain', '100', 'How many old batch metadata/state versions to keep for recovery and debugging.'],
  ['Checkpoint', 'spark.sql.streaming.checkpointFileManagerClass', 'auto', 'Pluggable checkpoint FS manager (e.g. for object stores needing atomic rename).'],
  ['Checkpoint', 'asyncProgressTrackingEnabled', 'false', 'Write offset/commit logs asynchronously to cut latency (trades a little recovery granularity).'],

  // ── Join ──
  ['Join', 'join time-range condition', 'none', 'Mandatory for stream-stream joins — bounds buffering so state is finite. The width is your biggest state lever.'],
  ['Join', 'spark.sql.streaming.join.stateFormatVersion', '2', 'Internal join-state encoding; keep default unless migrating.'],

  // ── Dedup ──
  ['Dedup', 'dropDuplicates(cols)', 'none', 'Keeps unbounded state unless combined with a watermark — can grow forever.'],
  ['Dedup', 'dropDuplicatesWithinWatermark(cols)', 'none', 'Bounds dedup state to the watermark window (preferred).'],

  // ── Output / sink ──
  ['Sink', 'outputMode', 'append', 'append | update | complete — governs which rows emit and whether state evicts.'],
  ['Sink', 'foreachBatch', '—', 'Per-batch function (batchDF, batchId) — the escape hatch for idempotent/transactional/multi-sink writes.'],
  ['Sink', 'spark.sql.streaming.noDataMicroBatches.enabled', 'true', 'Fire empty batches so watermarks still advance and windows close during quiet periods.'],
  ['Sink', 'queryName', 'auto', 'Names the query (memory sink table name; shows in the Spark UI).'],

  // ── Performance / tuning ──
  ['Perf', 'spark.sql.streaming.metricsEnabled', 'false', 'Expose per-query metrics via Dropwizard/Spark UI.'],
  ['Perf', 'spark.streaming.backpressure.enabled', 'true (DStream)', 'Legacy DStream auto rate control; Structured Streaming uses maxOffsetsPerTrigger instead.'],
  ['Perf', 'spark.sql.adaptive.enabled', 'true', 'Adaptive Query Execution — helps skew/partition sizing within each micro-batch.'],
  ['Perf', 'spark.sql.streaming.statefulOperator.checkCorrectness.enabled', 'true', 'Guards against unsupported stateful-op changes that would corrupt results.'],
  ['Perf', 'spark.sql.streaming.maxBatchesToRetainInMemory', '2', 'State versions cached in memory for speed.'],
];

export function mount(container) {
  injectModStyles();

  const groups = [...new Set(CONFIGS.map((c) => c[0]))];

  const intro = `
  <div class="ss-prose">
    <p>The configuration knobs that actually matter for Structured Streaming — grouped by concern, with defaults and what each one does. Type to filter.</p>
    <div class="ss-callout"><b>Checkpoint-sensitive:</b> <code>spark.sql.shuffle.partitions</code> and anything that changes state layout (keys, windows, stateful ops) <b>cannot</b> be changed against an existing checkpoint. Treat the checkpoint as the schema of your state.</div>
  </div>
  <div class="ss-controls">
    <input id="cfg-q" placeholder="Filter configs…" style="flex:1;min-width:220px;background:var(--bg-elevated);border:1px solid var(--border);color:var(--text-primary);border-radius:8px;padding:8px 12px;font-size:13px">
    <span id="cfg-count" style="font-size:12px;color:var(--text-muted)"></span>
  </div>
  <div id="cfg-tables"></div>`;

  container.innerHTML = createModuleShell({
    tag: 'Reference · R5',
    title: '⚙️ Config Reference',
    subtitle: 'Streaming knobs, defaults, and what they actually do',
    tabs: [{ id: 'cfg', label: '⚙️ Configs', content: intro }],
  });
  initTabs(container);

  const host = container.querySelector('#cfg-tables');
  const q = container.querySelector('#cfg-q');
  const countEl = container.querySelector('#cfg-count');

  function render(filter) {
    const f = (filter || '').trim().toLowerCase();
    let shown = 0;
    host.innerHTML = groups.map((g) => {
      const rows = CONFIGS.filter((c) => c[0] === g && (!f || (c[1] + ' ' + c[3]).toLowerCase().includes(f)));
      if (!rows.length) return '';
      shown += rows.length;
      return `<h3 style="color:var(--text-primary);font-size:15px;margin:18px 0 8px">${g}</h3>
      <div style="overflow-x:auto"><table class="ss-tbl" style="font-size:12px">
        <thead><tr><th style="min-width:230px">Key</th><th style="min-width:110px">Default</th><th>Effect</th></tr></thead>
        <tbody>${rows.map((c) => `<tr><td style="color:var(--cyan,#06B6D4)">${esc(c[1])}</td><td style="color:var(--text-muted)">${esc(c[2])}</td><td style="font-family:inherit;color:var(--text-secondary)">${c[3]}</td></tr>`).join('')}</tbody>
      </table></div>`;
    }).join('');
    countEl.textContent = `${shown} / ${CONFIGS.length} shown`;
    if (!shown) host.innerHTML = '<p style="color:var(--text-muted);font-size:13px;padding:16px">No configs match that filter.</p>';
  }

  q.addEventListener('input', () => render(q.value));
  render('');
  return null;
}

export default { mount };
