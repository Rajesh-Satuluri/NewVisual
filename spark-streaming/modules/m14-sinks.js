// M14 · Sinks & foreachBatch — Sinks & Reliability  (no engine: sink picker demo)
import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { injectModStyles, codeBlock, esc } from './_mod-ui.js';

const IQ = [
  { q: 'What streaming sinks does Structured Streaming provide?', a: '<p><b>Production:</b> <b>Kafka</b>, <b>file</b> sinks (Parquet/JSON/ORC — append only), <b>Delta/Iceberg</b> (transactional), and <b>foreachBatch</b> / <b>foreach</b> for arbitrary systems. <b>Testing:</b> <b>console</b> (prints) and <b>memory</b> (in-memory table for queries). The big one is <b>foreachBatch</b>, which hands you each batch\'s DataFrame + batchId so you can write <b>anywhere</b>, including with transactional/idempotent logic.</p>', tip: 'Kafka, files (append-only), Delta/Iceberg (txn), foreachBatch/foreach; console/memory for testing. foreachBatch is the universal escape hatch.' },
  { q: 'What is foreachBatch and why is it so important?', a: '<p><code>foreachBatch((df, batchId) => ...)</code> runs your function <b>once per micro-batch</b> with the batch as a <b>regular (batch) DataFrame</b> and its <b>batchId</b>. That lets you: write to <b>multiple sinks</b>, use <b>batch-only</b> sinks/APIs (JDBC, any DB), do <b>MERGE/upsert</b> for exactly-once, and reuse batch code. It\'s the bridge from streaming to the entire batch ecosystem — the most powerful sink.</p>', tip: 'foreachBatch(df, batchId): batch DataFrame per micro-batch → write anywhere, multi-sink, MERGE/upsert, batch APIs.' },
  { q: 'How do you achieve exactly-once with foreachBatch?', a: '<p>Use the <b>batchId</b> for idempotency: (1) <b>MERGE/upsert</b> on a business key so re-writing a replayed batch is a no-op; or (2) record the <b>batchId</b> in the target and <b>skip</b> if already present (transactional "has this batch been written?"). Because a failed batch is replayed with the <b>same batchId</b>, keying idempotency on it (or a business key) makes the write effectively-once even to non-transactional systems (M16).</p>', tip: 'Key idempotency on batchId or business key: MERGE/upsert, or skip-if-batchId-present. Replay uses same batchId → effectively once.' },
  { q: 'Which sinks support which output modes?', a: '<p><b>File</b>: <b>append only</b> (can\'t rewrite old files). <b>Kafka</b>: append + update. <b>console/memory/foreachBatch</b>: all modes. <b>Delta</b>: append natively, upsert via <code>foreachBatch</code>+MERGE. You must match the <b>mode your query needs</b> to a sink that supports it, or Spark rejects it at start. foreachBatch sidesteps most limitations because you control the write (M12).</p>', tip: 'File=append only; Kafka=append/update; console/memory/foreachBatch=all. Match mode to sink; foreachBatch bypasses limits.' },
  { q: 'foreach vs foreachBatch?', a: '<p><b>foreach</b> (via a <code>ForeachWriter</code>) processes <b>one record at a time</b> with open/process/close per partition — for row-level custom writes (e.g. a REST call per record), and you implement idempotency yourself. <b>foreachBatch</b> gives the <b>whole batch as a DataFrame</b> — better for bulk/transactional writes and reusing batch APIs. Prefer <b>foreachBatch</b> for throughput and MERGE-style exactly-once; use <b>foreach</b> only when you truly need per-record handling.</p>', tip: 'foreach = per-record (ForeachWriter, open/process/close). foreachBatch = whole-batch DataFrame. Prefer foreachBatch.' },
  { q: 'How do you write to multiple sinks from one stream?', a: '<p>Two ways: (1) <b>foreachBatch</b> — inside it, <code>persist()</code> the batch df and write it to several destinations (A, B, C) in one function; or (2) start <b>multiple writeStreams</b> off the same source (each its own checkpoint). foreachBatch is usually preferred for multi-sink because you process the batch <b>once</b> and fan out, rather than re-reading the source per stream.</p>', tip: 'foreachBatch + persist + write to A,B,C (one read, fan out), or multiple writeStreams (separate checkpoints). Prefer foreachBatch.' },
  { q: 'Why cache/persist the DataFrame inside foreachBatch?', a: '<p>If you write the same batch df to <b>multiple sinks</b> (or reference it multiple times), without <code>persist()</code> Spark <b>recomputes</b> the whole batch lineage for each action → duplicated work and possible inconsistency. <code>batchDf.persist()</code> materializes it once; write to all sinks; then <code>unpersist()</code>. Standard pattern for multi-sink foreachBatch.</p>', tip: 'Persist the batch df before multiple writes → avoid recomputing lineage per sink. persist → write ×N → unpersist.' },
  { q: 'What about the trigger/commit semantics of a custom foreachBatch?', a: '<p>Spark treats your foreachBatch function as the sink write: it\'s invoked <b>after processing</b>, and only once it <b>returns successfully</b> does Spark write the <b>commit log</b> entry. If your function <b>throws</b>, the batch isn\'t committed and will be <b>replayed</b> on restart with the same batchId — which is exactly why your write must be <b>idempotent</b>. You get at-least-once from the engine; idempotency makes it exactly-once (M15, M16).</p>', tip: 'foreachBatch success → commit log written. Throw → replay same batchId. Engine gives at-least-once; your idempotency makes it exactly-once.' },
  { q: 'Can foreachBatch use batch-only operations the streaming API forbids?', a: '<p>Yes — inside foreachBatch the df is a <b>normal batch DataFrame</b>, so you can do things streaming disallows: <b>multiple aggregations</b>, arbitrary joins, <code>collect()</code>, JDBC writes, <code>MERGE INTO</code>, writing to formats without a streaming sink, etc. That\'s a core reason it exists — it reopens the full batch API for the per-batch data within a streaming query.</p>', tip: 'Inside foreachBatch the df is batch → use batch-only ops (MERGE, JDBC, multi-agg, collect). Reopens the full batch API.' },
  { q: 'What are common foreachBatch pitfalls?', a: '<p>(1) <b>Non-idempotent writes</b> → duplicates on replay (use MERGE/batchId). (2) Forgetting to <b>persist</b> for multi-sink → recompute. (3) <b>Non-deterministic</b> logic breaking replay consistency. (4) Heavy <b>driver-side</b> work (<code>collect()</code> huge data). (5) Long-running writes that push <b>batchDuration</b> over the trigger interval. Keep it idempotent, deterministic, and fast.</p>', tip: 'Non-idempotent, no persist, non-deterministic, driver collect(), slow writes. Keep it idempotent/deterministic/fast.' },
];

const SINKS = {
  kafka: { name: 'Kafka', grade: 'Production', modes: 'append, update', exactlyOnce: 'Yes (transactional)', desc: 'Publish results to a topic. Supports transactions for exactly-once. The default for streaming-to-streaming pipelines.', good: true },
  delta: { name: 'Delta / Iceberg', grade: 'Production', modes: 'append (+ upsert via foreachBatch)', exactlyOnce: 'Yes (atomic per-batch commit)', desc: 'Transactional lakehouse table. Each batch commits atomically by batchId; MERGE via foreachBatch gives upserts. The go-to analytics sink.', good: true },
  file: { name: 'File (Parquet/JSON)', grade: 'Production', modes: 'append only', exactlyOnce: 'Yes (manifest)', desc: 'Writes new files to a directory. Append-only (cannot rewrite old files); a manifest tracks committed files so a replayed batch rewrites the same files.', good: true },
  foreachBatch: { name: 'foreachBatch', grade: 'Production ★', modes: 'ALL (you control)', exactlyOnce: 'Yes if you MERGE / key on batchId', desc: 'The universal sink: your function gets each batch as a DataFrame + batchId. Write anywhere (JDBC, multiple sinks, MERGE), use batch-only APIs, implement idempotency yourself.', good: true },
  console: { name: 'console / memory', grade: 'Testing only', modes: 'all', exactlyOnce: 'N/A', desc: 'console prints batches to stdout; memory keeps an in-memory queryable table. For debugging and tests — never production.', good: false },
};

export function mount(container) {
  injectModStyles();

  const concept = `
  <div class="ss-prose">
    <p>The <b>sink</b> is where results go — and it's where you actually earn exactly-once (M16). Structured Streaming ships several, but one towers over the rest: <b>foreachBatch</b>.</p>
    <div class="ss-grid">
      <div class="ss-card"><h4>📨 Kafka</h4><p>Publish to a topic; transactional. Append + update.</p></div>
      <div class="ss-card"><h4>🔼 Delta / Iceberg</h4><p>Transactional table, atomic per-batch commit; upsert via foreachBatch+MERGE.</p></div>
      <div class="ss-card"><h4>📁 File</h4><p>Parquet/JSON to a directory — <b>append only</b>, manifest-tracked.</p></div>
      <div class="ss-card"><h4>🪣 foreachBatch ★</h4><p>Your function gets <b>(batchDF, batchId)</b> → write <b>anywhere</b>, multi-sink, MERGE, batch-only APIs.</p></div>
    </div>
    <h3>foreachBatch — the universal sink</h3>
    <p>It runs once per micro-batch with the batch as a <b>normal batch DataFrame</b> plus its <b>batchId</b>. That unlocks: writing to <b>any</b> system (JDBC, DBs with no streaming sink), <b>multiple sinks</b> in one pass, <b>MERGE/upsert</b> for exactly-once, and all the <b>batch-only</b> operations streaming forbids. Spark writes the <b>commit log</b> only after your function returns successfully; if it throws, the batch <b>replays</b> with the same <code>batchId</code> — which is why your write must be <b>idempotent</b>.</p>
    <div class="ss-callout"><b>Exactly-once with foreachBatch:</b> key idempotency on the <b>batchId</b> or a <b>business key</b> — MERGE/upsert so a replayed batch is a no-op, or record the batchId and skip if present. The engine gives at-least-once; your idempotent write makes it exactly-once.</div>
  </div>`;

  const interactive = `
  <div class="ss-prose"><p>Pick a sink to see its output modes, exactly-once story, and where it fits. foreachBatch (★) is the one that unlocks everything else.</p></div>
  <div class="ss-controls" id="m14-btns">
    ${Object.entries(SINKS).map(([k, s], i) => `<button class="ss-btn${i === 0 ? ' primary' : ''}" data-sink="${k}">${s.name}</button>`).join('')}
  </div>
  <div class="ss-metrics">
    <div class="ss-metric"><div class="k">Grade</div><div class="v" id="m14-grade" style="font-size:14px">—</div></div>
    <div class="ss-metric"><div class="k">Output modes</div><div class="v" id="m14-modes" style="font-size:12px">—</div></div>
    <div class="ss-metric"><div class="k">Exactly-once?</div><div class="v" id="m14-eos" style="font-size:12px">—</div></div>
  </div>
  <div class="ss-callout" id="m14-desc">—</div>`;

  const story = `
  <div class="ss-prose">
    <h3>ShopStream's fan-out sink</h3>
    <p>ShopStream's enriched order stream must land in <b>three</b> places each batch: the <b>Delta</b> revenue table (analytics), a <b>Postgres</b> dashboard table (ops), and a <b>Kafka</b> topic (downstream fraud). Rather than three separate streams re-reading Kafka, they use <b>one</b> <code>foreachBatch</code>: <code>persist()</code> the batch, then write to all three — Delta via <b>MERGE</b> on <code>order_id</code>, Postgres via a keyed upsert, Kafka via the native writer — then <code>unpersist()</code>.</p>
    <p>Because every write is <b>keyed by order_id (idempotent)</b>, a crash-replay of the same <b>batchId</b> re-runs all three writes as no-ops — <b>exactly-once to all three sinks</b>. Postgres has no streaming sink at all; foreachBatch is the only way to reach it, using the ordinary JDBC batch writer.</p>
    <div class="ss-callout">The team's rule: <b>any</b> non-trivial sink (multi-destination, a DB, upserts) goes through <b>foreachBatch</b> with idempotent writes — it's the one pattern that reaches the whole ecosystem while preserving exactly-once.</div>
  </div>`;

  const code = `
  ${codeBlock('PySpark — foreachBatch fan-out with idempotent writes', `def write_batch(batch_df, batch_id):
    batch_df.persist()                                  # compute once, write to many
    # 1) Delta upsert (MERGE on business key) -> idempotent
    (delta.alias("t").merge(batch_df.alias("s"), "t.order_id = s.order_id")
        .whenMatchedUpdateAll().whenNotMatchedInsertAll().execute())
    # 2) Postgres upsert via JDBC (batch-only API, no streaming sink exists)
    batch_df.write.format("jdbc").mode("append") \\
        .option("url", PG_URL).option("dbtable", "revenue_live").save()
    # 3) Kafka
    to_kafka(batch_df).write.format("kafka").option("topic", "fraud.in").save()
    batch_df.unpersist()

(enriched.writeStream
    .foreachBatch(write_batch)
    .option("checkpointLocation", "s3://shopstream/chk/fanout")
    .trigger(processingTime="10 seconds").start())`)}
  ${codeBlock('Scala — foreachBatch signature', `enriched.writeStream.foreachBatch { (batchDf: DataFrame, batchId: Long) =>
  batchDf.persist()
  // MERGE into Delta, upsert to JDBC, publish to Kafka — all keyed/idempotent
  batchDf.unpersist()
}.option("checkpointLocation", "s3://shopstream/chk/fanout").start()`)}`;

  container.innerHTML = createModuleShell({
    tag: 'M14 · Sinks & Reliability',
    title: 'Sinks & foreachBatch',
    subtitle: 'Where results go — and why foreachBatch is the universal, exactly-once-capable sink',
    definition: {
      formal: 'A sink is the output destination of a streaming query. Built-in sinks include Kafka, file (append-only), Delta/Iceberg (transactional), console and memory (testing). foreachBatch invokes a user function once per micro-batch with the batch as a batch DataFrame and its batchId, enabling writes to arbitrary systems, multiple sinks, batch-only operations, and idempotent/transactional writes (e.g. MERGE) keyed on batchId or a business key; Spark records the commit log only after the function returns successfully, replaying the same batchId on failure.',
      easy: 'The sink is wherever your results end up — Kafka, files, a Delta table, or a database. The standout is foreachBatch: it hands you each batch as a normal DataFrame plus an id, so you can write to anything (even systems with no streaming support), send to several places at once, and do upserts. Because a failed batch is retried with the same id, keying your writes on that id makes them safe to repeat — that\'s how you get exactly-once.',
    },
    tabs: [
      { id: 'concept', label: '📖 Concept', content: concept },
      { id: 'demo', label: '🪣 Sink Explorer', content: interactive },
      { id: 'story', label: '🛒 ShopStream', content: story },
      { id: 'code', label: '💻 Code', content: code },
      { id: 'iq', label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });
  initTabs(container);
  initIQ(container);

  const grade = container.querySelector('#m14-grade');
  const modes = container.querySelector('#m14-modes');
  const eos = container.querySelector('#m14-eos');
  const desc = container.querySelector('#m14-desc');

  function selectSink(k) {
    const s = SINKS[k];
    grade.textContent = s.grade;
    grade.style.color = s.good ? 'var(--green,#10B981)' : 'var(--yellow,#F59E0B)';
    modes.textContent = s.modes;
    eos.textContent = s.exactlyOnce;
    desc.innerHTML = `<b>${esc(s.name)}:</b> ${s.desc}`;
    container.querySelectorAll('#m14-btns .ss-btn').forEach((b) => b.classList.toggle('primary', b.dataset.sink === k));
  }
  container.querySelector('#m14-btns').addEventListener('click', (e) => {
    const b = e.target.closest('[data-sink]'); if (b) selectSink(b.dataset.sink);
  });
  selectSink('kafka');
}

export default { mount };
