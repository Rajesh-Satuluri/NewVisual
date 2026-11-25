// M16 · Fault Tolerance & Exactly-Once — Sinks & Reliability  (engine-driven: E2)
import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { injectModStyles, codeBlock, esc } from './_mod-ui.js';
import { planBatches, CheckpointSim, PHASES } from '../sim/checkpoint-engine.js';

const IQ = [
  { q: 'What are the delivery guarantees, and which does Structured Streaming give?', a: '<p><b>At-most-once</b> (may lose data, never duplicates), <b>at-least-once</b> (never loses, may duplicate), <b>exactly-once</b> (no loss, no duplicates). Structured Streaming provides <b>end-to-end exactly-once</b> when three conditions hold: a <b>replayable source</b> (Kafka/files), <b>deterministic</b> computation, and an <b>idempotent or transactional sink</b>. Miss the last and you drop to at-least-once (possible duplicates).</p>', tip: 'Three levels. SS = exactly-once IF replayable source + deterministic + idempotent/transactional sink. Sink is the usual gap.' },
  { q: 'How is exactly-once actually achieved end to end?', a: '<p>Three cooperating pieces: (1) the <b>replayable source</b> lets a failed batch re-read the <b>same offsets</b> (from the offset log); (2) <b>deterministic</b> processing means the replay produces identical results; (3) the <b>sink</b> makes the write idempotent/transactional so re-writing the same batch doesn\'t duplicate. The <b>offset-log-before / commit-log-after</b> ordering ties them together: on restart, replay any offset-logged-but-uncommitted batch, and the idempotent sink absorbs the repeat.</p>', tip: 'Replayable source + deterministic compute + idempotent sink + offset/commit ordering = end-to-end exactly-once.' },
  { q: 'Executor failure vs driver failure — recovery for each?', a: '<p><b>Executor failure</b>: the task and its state partition are <b>reloaded from the last checkpointed state version</b> on another executor and the batch retries — transparent, no data loss. <b>Driver failure</b>: the query stops; on restart (same checkpoint) it reads the <b>offset log</b>, finds the last uncommitted batch, replays it, and resumes. Use <b>cluster/supervised mode</b> so the driver auto-restarts.</p>', tip: 'Executor = transparent task+state reload/retry. Driver = restart from offset log. Supervised mode auto-restarts the driver.' },
  { q: 'Why does the sink determine whether you get exactly-once or at-least-once?', a: '<p>The dangerous window is <b>after the sink write but before the commit log</b>. If a crash lands there, the batch\'s rows are already in the sink but it looks "not done," so restart <b>replays and re-writes</b> them. A <b>transactional/idempotent</b> sink makes that re-write a no-op (exactly-once); a plain <b>append</b> sink writes them again → <b>duplicates</b> (at-least-once). Same engine, same crash — the sink alone decides the outcome.</p>', tip: 'Crash between sink-write and commit = the replay. Idempotent sink absorbs it (EOS); append sink duplicates (ALO).' },
  { q: 'How do you make a sink idempotent/transactional?', a: '<p>Options: (1) a <b>transactional sink</b> that commits the batch atomically keyed by <b>batchId</b> (Delta, Kafka transactions) — a replayed batchId overwrites, not appends; (2) <b>foreachBatch + MERGE/upsert</b> on a business key so re-writing a key is a no-op; (3) a sink that <b>dedups on a unique id</b>. File sinks are naturally idempotent via the manifest (a replayed batch rewrites the same files). The key idea: writing the same batch twice must equal writing it once.</p>', tip: 'Transactional-by-batchId (Delta/Kafka txn), foreachBatch+MERGE, or dedup-on-id. "Twice == once."' },
  { q: 'Does exactly-once mean each record is processed exactly once?', a: '<p>No — a record may be <b>processed multiple times</b> (replays happen). Exactly-once means the <b>observable effect/output</b> is as if each were processed once: no duplicate rows in the sink, no double-counted aggregates. It\'s <b>effectively-once output</b>, not literally-once execution. That distinction is why non-deterministic side effects inside the stream (e.g. calling an external API that isn\'t idempotent) can break the guarantee.</p>', tip: 'Exactly-once = effect/output once, not execution once. Replays happen; non-idempotent side effects break it.' },
  { q: 'What makes a computation non-deterministic and why does that break EOS?', a: '<p>Using <code>current_timestamp()</code>, random numbers, non-deterministic UDFs, or ordering-dependent logic means a <b>replay produces different results</b> than the original attempt — so the idempotent-sink overwrite no longer matches, and you can get inconsistent output. For exactly-once, the per-batch computation over the <b>pinned offsets</b> must be <b>reproducible</b>. Keep randomness/time out of the streaming transforms (or seed/freeze them).</p>', tip: 'Non-determinism (now(), rand, ordering) makes replay ≠ original → EOS breaks. Keep transforms reproducible.' },
  { q: 'How does foreachBatch help with exactly-once to arbitrary sinks?', a: '<p><code>foreachBatch(fn)</code> gives you the batch\'s DataFrame + its <b>batchId</b>. You can write transactionally/idempotently to <b>any</b> system: MERGE into a DB keyed by business id, or record the <b>batchId</b> in the target and skip it if already present. This lets you reach exactly-once even for sinks without native transactional support — you implement idempotency using the provided batchId (M14).</p>', tip: 'foreachBatch gives (df, batchId) → implement MERGE or batchId-dedup for EOS to any sink.' },
  { q: 'If a batch is replayed, could downstream see partial/old results?', a: '<p>With a <b>transactional</b> sink, no — the batch commit is <b>atomic</b>, so readers see either the pre-batch or post-batch state, never a half-written replay. With a non-transactional append sink, a replay can leave <b>duplicates</b> visible. This is why "exactly-once" requires the sink\'s write to be atomic/idempotent per batch; otherwise downstream must tolerate duplicates (at-least-once) and dedup themselves.</p>', tip: 'Transactional sink = atomic batch commit, no partial reads. Append sink = visible duplicates on replay.' },
  { q: 'Summarize the exactly-once checklist for a production pipeline.', a: '<p>(1) <b>Replayable source</b> (Kafka/files, not socket). (2) <b>Durable, per-query checkpoint</b> on S3/HDFS. (3) <b>Deterministic</b> transforms (no now()/rand in the stream). (4) <b>Idempotent/transactional sink</b> (Delta/Kafka-txn, or foreachBatch+MERGE). (5) <b>Supervised driver</b> for auto-restart. Hit all five → end-to-end exactly-once. Miss the sink → at-least-once + downstream dedup. Miss the source or checkpoint → possible data loss.</p>', tip: 'Replayable source, durable checkpoint, deterministic compute, idempotent sink, supervised driver. The five-point EOS checklist.' },
];

const PHASE_LABEL = {
  planOffsets: 'plan offsets', writeOffsetLog: 'write offset log',
  process: 'process', writeSink: 'write sink', writeCommitLog: 'write commit log',
};

export function mount(container) {
  injectModStyles();

  const ORDERS = Array.from({ length: 6 }, (_, i) => ({ id: 'ord-' + i }));
  const BATCH_SIZE = 2;
  const batches = planBatches(ORDERS, BATCH_SIZE);

  const concept = `
  <div class="ss-prose">
    <p>Three delivery guarantees exist; Structured Streaming targets the strongest — <b>end-to-end exactly-once</b> — but only when every link holds.</p>
    <div class="ss-grid">
      <div class="ss-card"><h4>At-most-once</h4><p>May <b>lose</b> data, never duplicates. (Fire-and-forget. Rare, undesirable.)</p></div>
      <div class="ss-card"><h4>At-least-once</h4><p><b>Never loses</b>, may <b>duplicate</b>. What you get if the sink isn't idempotent.</p></div>
      <div class="ss-card"><h4>Exactly-once ✅</h4><p><b>No loss, no duplicates</b> in the output. The goal — "effectively once."</p></div>
      <div class="ss-card"><h4>The 3 conditions</h4><p><b>Replayable source</b> + <b>deterministic</b> compute + <b>idempotent/transactional sink</b>. Miss the sink → drop to at-least-once.</p></div>
    </div>
    <h3>The dangerous window</h3>
    <p>A crash is only interesting <b>between writing the sink and writing the commit log</b>: the rows are already out, but the batch looks "not done," so restart <b>replays</b> them. A <b>transactional sink</b> makes that re-write a no-op (exactly-once); a plain <b>append</b> sink writes them <b>again</b> → duplicates (at-least-once). <i>Same engine, same crash — the sink alone decides.</i></p>
    <div class="ss-callout"><b>Exactly-once ≠ processed once.</b> Records may be <b>reprocessed</b> on replay; what's guaranteed is the <b>output effect</b> is as if once. That's why non-deterministic transforms (<code>now()</code>, <code>rand()</code>) or non-idempotent side effects (calling an external API) can break it.</div>
  </div>`;

  const interactive = `
  <div class="ss-prose"><p>Inject a crash at any phase of any batch, pick the sink type, and let the <b>real E2 engine</b> recover. The <b>same crash</b> yields clean exactly-once with a transactional sink, or <b>duplicates</b> with an append sink — watch the sink contents.</p></div>
  <div class="ss-controls">
    <label style="font-size:12.5px;color:var(--text-secondary)">Crash at batch:
      <select id="m16-batch" class="ss-btn" style="margin-left:4px">${batches.map((b) => `<option value="${b.batchId}">${b.batchId}</option>`).join('')}</select></label>
    <label style="font-size:12.5px;color:var(--text-secondary)">phase:
      <select id="m16-phase" class="ss-btn" style="margin-left:4px">${PHASES.map((p) => `<option value="${p}"${p === 'writeCommitLog' ? ' selected' : ''}>${PHASE_LABEL[p]}</option>`).join('')}</select></label>
    <label style="font-size:12.5px;color:var(--text-secondary)">sink:
      <select id="m16-sink" class="ss-btn" style="margin-left:4px">
        <option value="exactlyOnce">transactional (exactly-once)</option>
        <option value="atLeastOnce">append (at-least-once)</option>
      </select></label>
    <button class="ss-btn primary" id="m16-run">💥 Crash &amp; recover</button>
  </div>
  <div class="ss-metrics">
    <div class="ss-metric"><div class="k">Guarantee</div><div class="v" id="m16-guar" style="font-size:14px">—</div></div>
    <div class="ss-metric"><div class="k">Duplicates</div><div class="v" id="m16-dup">—</div></div>
    <div class="ss-metric"><div class="k">Data loss?</div><div class="v" id="m16-loss" style="font-size:14px">—</div></div>
  </div>
  <div class="ss-grid" style="grid-template-columns:1fr 1fr">
    <div class="ss-card"><h4>⏱️ Timeline (crash + recovery)</h4><div id="m16-timeline" style="font-size:12px;font-family:var(--font-mono);line-height:1.7"></div></div>
    <div class="ss-card"><h4>🪣 Final sink contents</h4><div id="m16-sink-rows"></div></div>
  </div>
  <div class="ss-callout" id="m16-expl">Pick a crash point and press <b>Crash &amp; recover</b>.</div>`;

  const story = `
  <div class="ss-prose">
    <h3>ShopStream's exactly-once guarantee</h3>
    <p>ShopStream needs revenue that reconciles to the cent with the payment processor — <b>exactly-once is non-negotiable</b>. Their stack: Kafka (replayable source), deterministic transforms (event time from the payload, no <code>now()</code>), a <b>Delta</b> sink that commits each batch transactionally by batchId, and a supervised driver. A spot-instance reclaim mid-batch triggers a replay, and Delta's atomic commit absorbs it — <b>zero double-counted revenue</b>.</p>
    <p>Their <b>fraud-review</b> stream was different: it wrote to a legacy system via a plain append, so a crash-replay <b>double-created review cases</b> — at-least-once. The fix was <code>foreachBatch</code> with a <b>MERGE</b> keyed by <code>order_id</code>, turning the append into an idempotent upsert and restoring exactly-once end to end.</p>
    <div class="ss-callout">The lesson ShopStream teaches new engineers: the engine's recovery is exactly-once-<b>capable</b>, but the <b>sink</b> is where you actually earn (or lose) the guarantee.</div>
  </div>`;

  const code = `
  ${codeBlock('PySpark — exactly-once via a transactional Delta sink', `(revenue.writeStream
    .outputMode("update").format("delta")              # Delta commits per-batch atomically
    .option("checkpointLocation", "s3://shopstream/chk/revenue")
    .start())                                           # replay re-commits same batchId -> no dup`)}
  ${codeBlock('PySpark — exactly-once to a legacy sink via foreachBatch + MERGE', `def upsert(batch_df, batch_id):
    (delta.alias("t")
        .merge(batch_df.alias("s"), "t.order_id = s.order_id")
        .whenNotMatchedInsertAll()      # replayed rows already present -> no-op
        .execute())

reviews.writeStream.foreachBatch(upsert) \\
    .option("checkpointLocation", "s3://shopstream/chk/reviews").start()`)}
  ${codeBlock('The five-point exactly-once checklist', `# 1. Replayable source .............. Kafka / files (NOT socket/rate)
# 2. Durable, per-query checkpoint ... s3://.../chk/<query>
# 3. Deterministic transforms ........ no current_timestamp()/rand() in the stream
# 4. Idempotent/transactional sink ... Delta/Kafka-txn, or foreachBatch + MERGE
# 5. Supervised driver ............... auto-restart on driver failure`)}`;

  container.innerHTML = createModuleShell({
    tag: 'M16 · Sinks & Reliability',
    title: 'Fault Tolerance & Exactly-Once',
    subtitle: 'Crash, replay, and why the sink decides exactly-once vs at-least-once',
    definition: {
      formal: 'Structured Streaming provides end-to-end exactly-once output when the source is replayable, the computation is deterministic, and the sink is idempotent or transactional. On failure, batches present in the offset log but absent from the commit log are replayed from their pinned offsets; a transactional/idempotent sink absorbs the replayed write (exactly-once), whereas an append-only sink re-writes the rows (at-least-once, producing duplicates). Executor failures reload state and retry transparently; driver failures recover from the checkpoint on restart.',
      easy: 'When a streaming job crashes, it redoes the batch it was in the middle of. Whether that redo is harmless or creates duplicate rows depends entirely on the destination: a transactional one (like Delta) treats a repeated write as a replace, so you get each result exactly once; a plain append writes the rows a second time. This demo crashes the pipeline at a point you choose and shows the two outcomes side by side.',
    },
    tabs: [
      { id: 'concept', label: '📖 Concept', content: concept },
      { id: 'demo', label: '💥 Crash & Recover', content: interactive },
      { id: 'story', label: '🛒 ShopStream', content: story },
      { id: 'code', label: '💻 Code', content: code },
      { id: 'iq', label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });
  initTabs(container);
  initIQ(container);

  const batchSel = container.querySelector('#m16-batch');
  const phaseSel = container.querySelector('#m16-phase');
  const sinkSel = container.querySelector('#m16-sink');
  const guarEl = container.querySelector('#m16-guar');
  const dupEl = container.querySelector('#m16-dup');
  const lossEl = container.querySelector('#m16-loss');
  const tlEl = container.querySelector('#m16-timeline');
  const sinkRowsEl = container.querySelector('#m16-sink-rows');
  const explEl = container.querySelector('#m16-expl');

  function runCrash() {
    const crash = { batchId: +batchSel.value, phase: phaseSel.value };
    const sinkMode = sinkSel.value;
    // Run to the crash, then recover — using the E2 engine directly for a full trace.
    const sim = new CheckpointSim({ sinkMode });
    const runResult = sim.run(batches, crash);
    const preSinkIds = sim.sink.ids().slice();
    const recovery = sim.recover(batches);
    const dups = sim.sink.duplicates();
    const coversAll = sim.coversAll(ORDERS);

    const exactlyOnce = dups.length === 0 && coversAll;
    guarEl.textContent = exactlyOnce ? 'Exactly-once' : (coversAll ? 'At-least-once' : 'DATA LOSS');
    guarEl.style.color = exactlyOnce ? 'var(--green,#10B981)' : (coversAll ? 'var(--yellow,#F59E0B)' : 'var(--red,#EF4444)');
    dupEl.textContent = dups.length ? dups.map((d) => `${d.id}×${d.count}`).join(' ') : '0';
    dupEl.style.color = dups.length ? 'var(--red,#EF4444)' : 'var(--text-primary)';
    lossEl.textContent = coversAll ? 'No' : 'Yes';
    lossEl.style.color = coversAll ? 'var(--green,#10B981)' : 'var(--red,#EF4444)';

    // timeline
    const pre = sim.trace.map((t) => {
      const c = t.crashed ? 'var(--red,#EF4444)' : 'var(--text-secondary)';
      return `<div style="color:${c}">b${t.batchId} · ${PHASE_LABEL[t.phase]}${t.crashed ? '  ← 💥 CRASH' : ' ✓'}</div>`;
    }).join('');
    const rec = recovery.map((r) =>
      `<div style="color:${r.action === 'replayed' ? 'var(--yellow,#F59E0B)' : 'var(--blue,#3B82F6)'}">↻ b${r.batchId} · ${r.action}</div>`
    ).join('');
    tlEl.innerHTML = pre + `<div style="margin:6px 0;color:var(--text-muted)">— restart & recover —</div>` + rec;

    // sink rows
    const counts = {};
    sim.sink.ids().forEach((id) => { counts[id] = (counts[id] || 0) + 1; });
    sinkRowsEl.innerHTML = `<table class="ss-tbl"><thead><tr><th>record</th><th>copies</th></tr></thead><tbody>${
      ORDERS.map((o) => {
        const n = counts[o.id] || 0;
        const col = n === 0 ? 'var(--red,#EF4444)' : n > 1 ? 'var(--red,#EF4444)' : 'var(--text-primary)';
        return `<tr><td>${esc(o.id)}</td><td style="color:${col}">${n === 0 ? 'MISSING' : n}</td></tr>`;
      }).join('')
    }</tbody></table>`;

    const window = phaseSel.value === 'writeCommitLog';
    explEl.innerHTML = exactlyOnce
      ? `✅ <b>Exactly-once.</b> Batch ${crash.batchId} was offset-logged but not committed, so recovery <b>replayed</b> it. The <b>transactional sink</b> replaced its prior rows (by batchId), so every order appears <b>exactly once</b> — identical to a crash-free run.`
      : (coversAll
          ? `⚠️ <b>At-least-once.</b> ${window ? 'The crash hit <b>after the sink write but before the commit</b> — the rows were already out. ' : ''}Recovery replayed batch ${crash.batchId}, and the <b>append sink</b> wrote its rows <b>again</b> → duplicates (${dups.map((d) => esc(d.id)).join(', ')}). No data lost, but downstream must dedup. Switch the sink to transactional for exactly-once.`
          : `❌ <b>Data loss</b> — unexpected for this engine; check the crash point.`);
  }

  container.querySelector('#m16-run').addEventListener('click', runCrash);
  // initial illustrative run
  runCrash();
}

export default { mount };
