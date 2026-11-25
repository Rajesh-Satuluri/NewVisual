// M19 · Delta Sink & MERGE — Lakehouse & Ops  (no engine: MERGE upsert demo)
import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { injectModStyles, codeBlock, esc } from './_mod-ui.js';

const IQ = [
  { q: 'Why use Delta Lake as a streaming sink?', a: '<p><b>ACID transactions</b> on object storage: each micro-batch commits <b>atomically</b> (a readers-never-see-partial-batch guarantee), with a <b>transaction log</b> that gives exactly-once by batchId, <b>schema enforcement/evolution</b>, <b>time travel</b>, and the ability to <b>MERGE</b> (upsert/delete). It unifies streaming writes and batch reads on the same table — the core of the <b>lakehouse</b>. Plain file sinks give none of this (no updates, no transactions).</p>', tip: 'ACID + transaction log (atomic per-batch, exactly-once by batchId) + schema + time travel + MERGE. File sinks have none of it.' },
  { q: 'How do you do an upsert (MERGE) from a stream into Delta?', a: '<p>Use <b>foreachBatch</b>: for each micro-batch, run <code>DeltaTable.merge(batchDF, "t.key = s.key")</code> with <code>whenMatchedUpdateAll()</code> + <code>whenNotMatchedInsertAll()</code> (and optionally <code>whenMatchedDelete()</code> for CDC deletes). Because MERGE is keyed on a business key, replaying a batch is a <b>no-op/idempotent</b> → exactly-once. This is the standard pattern for maintaining a <b>current-state</b> table (latest row per key) from a stream.</p>', tip: 'foreachBatch + DeltaTable.merge on business key (update/insert/delete). Keyed MERGE = idempotent = exactly-once.' },
  { q: 'What is the difference between appending and merging to Delta?', a: '<p><b>Append</b> adds new rows — good for immutable event logs / facts (each event once). <b>MERGE</b> maintains a <b>mutable current-state</b> table: update existing keys, insert new ones, delete removed ones. Use append for "all orders ever"; use MERGE for "latest status per order" or syncing a <b>CDC</b> feed into a mirror table. MERGE needs foreachBatch; append is a native streaming write.</p>', tip: 'Append = immutable event log (native). MERGE = mutable current-state/CDC mirror (via foreachBatch).' },
  { q: 'How does Delta give exactly-once for streaming appends?', a: '<p>Delta records the <b>streaming query\'s batchId</b> in its transaction log when committing. On replay, Delta sees the <b>same batchId already committed</b> and <b>skips</b> the duplicate write — so even a native append is exactly-once without you doing anything. (For MERGE via foreachBatch, idempotency comes from the business-key keyed merge instead.)</p>', tip: 'Delta logs the batchId; a replayed append with the same batchId is skipped → exactly-once for free on native appends.' },
  { q: 'What is a MERGE used for in a CDC pipeline?', a: '<p><b>Change Data Capture</b>: a stream of <code>insert/update/delete</code> change events (from Debezium/a DB log) is merged into a Delta <b>mirror table</b> so it reflects the source\'s current state. The MERGE applies <code>whenMatchedUpdate</code>, <code>whenNotMatchedInsert</code>, and <code>whenMatchedDelete</code> based on the change op. You usually <b>dedup to the latest change per key per batch</b> first (ordering by a sequence/commit timestamp) so MERGE applies the final state.</p>', tip: 'CDC: merge insert/update/delete changes into a mirror table. Dedup to latest-per-key per batch before MERGE.' },
  { q: 'Why dedup to the latest change per key before a CDC MERGE?', a: '<p>If a single batch contains <b>multiple changes for the same key</b> (e.g. update then delete), MERGE requires <b>at most one source row per target key</b> — otherwise it errors or applies non-deterministically. So you first reduce the batch to the <b>latest</b> change per key (window/row_number by sequence desc), then MERGE that. This ensures the final state is applied correctly and deterministically.</p>', tip: 'MERGE needs ≤1 source row per key. Reduce batch to latest-change-per-key (row_number by seq desc) before merging.' },
  { q: 'What operational issues does streaming into Delta create (small files)?', a: '<p>Frequent small batches write <b>many small files</b> → slow reads and metadata bloat. Mitigations: <b>OPTIMIZE</b> (compaction) / auto-compaction, <b>optimizeWrite</b>, periodic <b>VACUUM</b> to remove old files, and partitioning/Z-ordering sensibly. Managing file sizes is the main ongoing cost of high-frequency streaming writes to a lakehouse table (M20).</p>', tip: 'Small-file problem from frequent batches → OPTIMIZE/auto-compaction, optimizeWrite, VACUUM, Z-order. The main ops cost.' },
  { q: 'How does schema evolution work with a Delta streaming sink?', a: '<p>Delta <b>enforces</b> schema by default (rejecting mismatched writes), and supports <b>evolution</b> via <code>mergeSchema</code> (append) or <code>withSchemaEvolution()</code> on MERGE — new columns are added automatically. This lets upstream add fields without breaking the pipeline, while still protecting against accidental type changes. Contrast with plain file sinks, which have no schema enforcement.</p>', tip: 'Delta enforces schema; evolve with mergeSchema / MERGE withSchemaEvolution. New columns added safely; types protected.' },
  { q: 'Can you read a Delta table as a stream too (streaming source)?', a: '<p>Yes — a Delta table is both a <b>streaming sink and a streaming source</b>. Writing with append and reading the same table as a stream lets you build <b>multi-hop (medallion) pipelines</b>: bronze → silver → gold, each hop a streaming read of the previous Delta table. <b>Change Data Feed (CDF)</b> can expose row-level changes for downstream incremental processing.</p>', tip: 'Delta is sink AND source → medallion (bronze/silver/gold) multi-hop streams; CDF exposes row-level changes.' },
  { q: 'When would you NOT use MERGE and just append?', a: '<p>When the data is <b>immutable facts/events</b> (orders placed, clicks, logs) where each row stands alone and is never updated — <b>append</b> is simpler, cheaper, natively exactly-once, and avoids MERGE\'s per-batch dedup + read-write amplification. Reserve MERGE for <b>mutable current-state</b> (latest per key) or <b>CDC</b>. Appending facts and deriving current-state views downstream is often cheaper than merging on write.</p>', tip: 'Append for immutable facts (simpler/cheaper/native EOS). MERGE only for mutable current-state or CDC.' },
];

// Change events streamed into a Delta table via MERGE.
const CHANGES = [
  { id: 'o1', op: 'insert', status: 'placed', amount: 50 },
  { id: 'o2', op: 'insert', status: 'placed', amount: 30 },
  { id: 'o1', op: 'update', status: 'shipped', amount: 50 },
  { id: 'o3', op: 'insert', status: 'placed', amount: 80 },
  { id: 'o2', op: 'update', status: 'delivered', amount: 30 },
  { id: 'o1', op: 'delete', status: '—', amount: 50 },       // order cancelled
  { id: 'o3', op: 'update', status: 'shipped', amount: 80 },
];
const OP_COLOR = { insert: 'var(--green,#10B981)', update: 'var(--blue,#3B82F6)', delete: 'var(--red,#EF4444)' };

export function mount(container) {
  injectModStyles();

  const concept = `
  <div class="ss-prose">
    <p><b>Delta Lake</b> turns cheap object storage into a <b>transactional table</b> — the sink that makes a streaming pipeline a <b>lakehouse</b>. Unlike a plain file sink (append-only, no transactions), Delta gives ACID, updates, and time travel.</p>
    <div class="ss-grid">
      <div class="ss-card"><h4>⚛️ ACID + atomic batches</h4><p>Each micro-batch commits atomically via the transaction log; readers never see a half-written batch. The batchId in the log gives <b>exactly-once appends for free</b>.</p></div>
      <div class="ss-card"><h4>🔀 MERGE (upsert/delete)</h4><p>Maintain a <b>mutable current-state</b> table: update existing keys, insert new, delete removed — the CDC pattern. Via <b>foreachBatch</b>.</p></div>
      <div class="ss-card"><h4>🧬 Schema + time travel</h4><p>Schema enforcement + evolution (<code>mergeSchema</code>); query past versions; audit history.</p></div>
      <div class="ss-card"><h4>🥉🥈🥇 Source too</h4><p>Delta is sink <b>and</b> source → medallion (bronze→silver→gold) multi-hop streams; Change Data Feed for row-level changes.</p></div>
    </div>
    <h3>Append vs MERGE</h3>
    <p><b>Append</b> for <b>immutable facts</b> (orders, clicks) — native, cheap, exactly-once by batchId. <b>MERGE</b> for <b>mutable current-state</b> (latest status per order) or <b>CDC mirrors</b> — keyed on a business id so a replayed batch is idempotent. MERGE needs <b>foreachBatch</b>, and if a batch has multiple changes per key you first <b>reduce to the latest</b> (MERGE requires ≤1 source row per target key).</p>
    <div class="ss-callout"><b>Ops cost:</b> frequent small batches create <b>many small files</b> → run <b>OPTIMIZE</b>/auto-compaction, <b>optimizeWrite</b>, and <b>VACUUM</b> old files. File-size management is the main ongoing cost of high-frequency lakehouse writes (M20).</div>
  </div>`;

  const interactive = `
  <div class="ss-prose"><p>A stream of <b>change events</b> (insert / update / delete) is <b>MERGE</b>d into a Delta <b>current-state</b> table keyed by <code>order_id</code>. Step through and watch the table reflect the <b>latest</b> state per key — inserts add rows, updates replace, deletes remove.</p></div>
  <div class="ss-controls">
    <button class="ss-btn primary" id="m19-step">Next change ▶</button>
    <button class="ss-btn" id="m19-back">◀ Back</button>
    <button class="ss-btn" id="m19-reset">⟲ Reset</button>
  </div>
  <div class="ss-callout" id="m19-ev" style="border-left-color:var(--accent)">—</div>
  <div class="ss-grid" style="grid-template-columns:1fr 1fr">
    <div class="ss-card"><h4>📥 Change stream (source)</h4><div id="m19-changes"></div></div>
    <div class="ss-card"><h4>🔼 Delta table (current state)</h4><div id="m19-table"></div></div>
  </div>`;

  const story = `
  <div class="ss-prose">
    <h3>ShopStream's order-status mirror</h3>
    <p>ShopStream's operational DB emits a <b>CDC</b> stream of order changes (Debezium → Kafka). A streaming job <b>MERGE</b>s those into a Delta <code>orders_current</code> table so analysts always see the <b>latest status per order</b> without hitting the production DB. Each batch is first <b>reduced to the latest change per order_id</b> (row_number by commit sequence), then merged: <code>whenMatchedUpdateAll</code>, <code>whenNotMatchedInsertAll</code>, <code>whenMatchedDelete</code> for cancellations.</p>
    <p>Separately, the <b>immutable</b> order-events stream (placed/paid facts) is a plain <b>append</b> to a Delta <code>order_events</code> table — simpler and exactly-once by batchId. Downstream, <code>orders_current</code> and <code>order_events</code> feed a <b>medallion</b> pipeline: bronze (raw) → silver (cleaned/merged) → gold (revenue aggregates), each hop a streaming read of the prior Delta table.</p>
    <div class="ss-callout">A nightly <b>OPTIMIZE + VACUUM</b> keeps the high-frequency merge target from drowning in small files — the one recurring chore of streaming into a lakehouse.</div>
  </div>`;

  const code = `
  ${codeBlock('PySpark — streaming CDC MERGE into Delta', `from delta.tables import DeltaTable
from pyspark.sql.functions import row_number, col
from pyspark.sql.window import Window

def upsert_cdc(batch_df, batch_id):
    # 1) reduce to the LATEST change per key (MERGE needs <= 1 source row per key)
    w = Window.partitionBy("order_id").orderBy(col("seq").desc())
    latest = (batch_df.withColumn("rn", row_number().over(w))
                      .where("rn = 1").drop("rn"))
    # 2) MERGE: update / insert / delete based on the change op
    (DeltaTable.forName(spark, "orders_current").alias("t")
        .merge(latest.alias("s"), "t.order_id = s.order_id")
        .whenMatchedDelete(condition="s.op = 'delete'")
        .whenMatchedUpdateAll(condition="s.op = 'update'")
        .whenNotMatchedInsertAll(condition="s.op = 'insert'")
        .execute())

(cdc_stream.writeStream
    .foreachBatch(upsert_cdc)
    .option("checkpointLocation", "s3://shopstream/chk/orders_current")
    .start())`)}
  ${codeBlock('Native append (immutable facts) — exactly-once by batchId', `(order_events.writeStream.format("delta")
    .outputMode("append")
    .option("checkpointLocation", "s3://shopstream/chk/order_events")
    .toTable("order_events"))        # Delta skips a replayed batchId -> exactly-once`)}`;

  container.innerHTML = createModuleShell({
    tag: 'M19 · Lakehouse & Ops',
    title: 'Delta Sink & MERGE',
    subtitle: 'Transactional streaming writes, upserts, and CDC into the lakehouse',
    definition: {
      formal: 'Delta Lake provides an ACID, transaction-logged table usable as both a streaming sink and source. Native appends are exactly-once because Delta records and skips already-committed batchIds. MERGE (via foreachBatch) maintains mutable current-state or CDC-mirror tables by applying keyed update/insert/delete operations idempotently; batches with multiple changes per key must first be reduced to the latest change per key. Delta adds schema enforcement/evolution, time travel, and supports medallion multi-hop streaming pipelines.',
      easy: 'Delta turns cheap cloud storage into a real database table with transactions. Append to it for immutable events (each written once, safely). Or MERGE into it to keep a live mirror of changing data — new orders inserted, status updates applied, cancellations deleted — all keyed by order id so retries are harmless. This demo streams insert/update/delete changes and shows the table always holding the latest state.',
    },
    tabs: [
      { id: 'concept', label: '📖 Concept', content: concept },
      { id: 'demo', label: '🔼 MERGE Upsert', content: interactive },
      { id: 'story', label: '🛒 ShopStream', content: story },
      { id: 'code', label: '💻 Code', content: code },
      { id: 'iq', label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });
  initTabs(container);
  initIQ(container);

  let cursor = -1;
  const evEl = container.querySelector('#m19-ev');
  const changesEl = container.querySelector('#m19-changes');
  const tableEl = container.querySelector('#m19-table');

  function tableAt(c) {
    const t = new Map();
    for (let i = 0; i <= c; i++) {
      const ch = CHANGES[i];
      if (ch.op === 'insert' || ch.op === 'update') t.set(ch.id, { id: ch.id, status: ch.status, amount: ch.amount });
      else if (ch.op === 'delete') t.delete(ch.id);
    }
    return [...t.values()];
  }

  function render() {
    // change stream
    changesEl.innerHTML = `<table class="ss-tbl"><thead><tr><th>#</th><th>order</th><th>op</th><th>status</th></tr></thead><tbody>${
      CHANGES.map((ch, i) => `<tr class="${i === cursor ? 'new' : ''}" style="${i > cursor ? 'opacity:.4' : ''}"><td>${i}</td><td>${esc(ch.id)}</td><td style="color:${OP_COLOR[ch.op]}">${ch.op}</td><td>${esc(ch.status)}</td></tr>`).join('')
    }</tbody></table>`;
    // delta table
    const rows = tableAt(cursor);
    tableEl.innerHTML = rows.length
      ? `<table class="ss-tbl"><thead><tr><th>order_id</th><th>status</th><th>amount</th></tr></thead><tbody>${
          rows.map((r) => { const touched = cursor >= 0 && CHANGES[cursor].id === r.id; return `<tr class="${touched ? 'new' : ''}"><td>${esc(r.id)}</td><td>${esc(r.status)}</td><td>$${r.amount}</td></tr>`; }).join('')
        }</tbody></table>`
      : '<div style="color:var(--text-muted);font-size:12px;padding:6px">— empty table —</div>';
    if (cursor < 0) { evEl.innerHTML = 'Press <b>Next change ▶</b> to MERGE change events into the Delta table.'; return; }
    const ch = CHANGES[cursor];
    const verb = ch.op === 'insert' ? 'inserted a new row for' : ch.op === 'update' ? 'updated' : 'deleted';
    evEl.innerHTML = `<b>Change ${cursor}: ${ch.op.toUpperCase()} ${esc(ch.id)}</b> → MERGE <b>${verb}</b> <code>${esc(ch.id)}</code>${ch.op !== 'delete' ? ` (status=${esc(ch.status)})` : ' (order cancelled, row removed)'}. The table always holds the <b>current state</b> per key.`;
  }

  container.querySelector('#m19-step').addEventListener('click', () => { if (cursor < CHANGES.length - 1) { cursor++; render(); } });
  container.querySelector('#m19-back').addEventListener('click', () => { if (cursor >= 0) { cursor--; render(); } });
  container.querySelector('#m19-reset').addEventListener('click', () => { cursor = -1; render(); });
  render();
}

export default { mount };
