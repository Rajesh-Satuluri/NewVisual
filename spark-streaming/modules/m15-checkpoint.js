// M15 · Checkpoint & Offset Log — Sinks & Reliability  (engine-driven: E2)
import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { injectModStyles, codeBlock, esc } from './_mod-ui.js';
import { planBatches, CheckpointSim, PHASES } from '../sim/checkpoint-engine.js';

const IQ = [
  { q: 'What does the checkpoint directory contain?', a: '<p>Four things, per query: the <b>offset log</b> (offsets planned per batch, written <i>before</i> processing), the <b>commit log</b> (batches confirmed complete, written <i>after</i> the sink), <b>state store</b> snapshots + deltas (versioned per batch), and <b>metadata</b> (query id, source descriptions). On restart Spark compares offset vs commit logs to decide which batch to replay. It must be a <b>durable, query-specific</b> path (S3/HDFS/ADLS).</p>', tip: 'offset log + commit log + state + metadata. Durable + per-query. Offset-vs-commit comparison drives recovery.' },
  { q: 'Walk through the offset-log-before / commit-log-after ordering.', a: '<p>Each batch: (1) plan the new <b>offset range</b>; (2) write it to the <b>offset log</b> <i>before</i> any processing; (3) process + update state; (4) write results to the <b>sink</b>; (5) write the <b>commit log</b> entry <i>after</i> the sink. On restart, a batch in the offset log but <b>not</b> in the commit log is <b>replayed</b> from its logged offsets. This exact ordering is what guarantees no batch is skipped (offset logged first) and no batch is falsely considered done (commit only after the sink).</p>', tip: 'Offset BEFORE process, commit AFTER sink. Offset-logged-not-committed → replay. The ordering IS the guarantee.' },
  { q: 'Why is the checkpoint location tied to a single query?', a: '<p>The checkpoint encodes a specific query\'s <b>sources, offsets, state layout and shuffle-partition count</b>. Pointing two queries at the same checkpoint, or reusing one for a different query, corrupts recovery (mismatched offsets/state). Each <code>writeStream</code> needs its <b>own</b> <code>checkpointLocation</code>. To re-run a query from scratch (e.g. re-read from earliest), you give it a <b>fresh</b> checkpoint path.</p>', tip: 'One checkpoint per query. Never share/reuse. Fresh path = start over.' },
  { q: 'What happens on restart if the last batch was interrupted?', a: '<p>Spark reads the logs: the last batch is in the <b>offset log</b> but missing from the <b>commit log</b>, so it <b>re-reads the exact same offsets</b> recorded there, reprocesses, re-writes the sink, and commits. Because the offsets are pinned by the log (not "latest"), the replay is <b>identical</b> to what the batch would have done — the basis of exactly-once. Then it proceeds to new data.</p>', tip: 'Re-read the SAME logged offsets, reprocess, commit. Pinned offsets → identical replay → exactly-once.' },
  { q: 'Can you move or change a checkpoint between runs?', a: '<p>You can <b>copy</b> it to a new durable location and point the restarted query there (migration), but you must not change its <b>internal structure</b> or the query shape it encodes. You <b>cannot</b> change <code>spark.sql.shuffle.partitions</code> or the source set and reuse the same checkpoint — state partitioning wouldn\'t match. Changing those requires a <b>new</b> checkpoint (and re-reading data).</p>', tip: 'Copy/migrate OK. Changing shuffle partitions / sources needs a NEW checkpoint. State layout is pinned.' },
  { q: 'What is state-store checkpointing and how often does it happen?', a: '<p>Every batch, the state store writes a <b>versioned delta</b> (and periodic full snapshots) to the checkpoint. On restart the last committed version is loaded. This is also what lets a <b>failed task</b> reload its state partition on another executor without recomputing from the start. RocksDB adds <b>changelog checkpointing</b> to make this cheaper/faster for large state (M10, M20).</p>', tip: 'Per-batch versioned state deltas + periodic snapshots. Enables task recovery and fast restart. RocksDB changelog for scale.' },
  { q: 'What goes wrong if the checkpoint is on non-durable storage?', a: '<p>If the checkpoint is on local/ephemeral disk and the node dies, you <b>lose the logs and state</b> → no recovery, possible data loss or duplicates, and you may be forced to restart from <code>earliest</code>/<code>latest</code>. The checkpoint MUST be on <b>durable, replicated</b> storage (S3/HDFS/ADLS) that survives executor and driver failures. This is a common production misconfiguration.</p>', tip: 'Non-durable checkpoint = no recovery. Must be S3/HDFS/ADLS. Classic misconfig.' },
  { q: 'How does the commit log prevent double-processing on restart?', a: '<p>If a batch\'s id is in the <b>commit log</b>, Spark knows the sink write <b>succeeded</b>, so it <b>skips</b> that batch on restart and never reprocesses it. Only batches that are offset-logged but <b>not</b> commit-logged are replayed. So the commit log is the "done" marker that short-circuits already-finished work — essential to not re-emitting committed results.</p>', tip: 'In commit log = done = skipped. Only offset-logged-not-committed replays. Commit log = the "done" marker.' },
  { q: 'Is the offset log the same as Kafka consumer offsets?', a: '<p>No. Spark manages its <b>own</b> offset log in the checkpoint and does <b>not</b> rely on Kafka\'s consumer-group offset commit for correctness (it may disable auto-commit). This decouples recovery from the broker: Spark\'s checkpoint is the single source of truth for "where am I," so you get consistent exactly-once regardless of Kafka\'s own offset bookkeeping.</p>', tip: 'Spark\'s offset log ≠ Kafka consumer offsets. Checkpoint is the source of truth; don\'t rely on Kafka auto-commit.' },
  { q: 'What is checkpoint/metadata log compaction?', a: '<p>The offset and commit logs would grow unbounded, so Spark periodically <b>compacts</b> them (keeping recent entries, discarding old committed ones) and the state store compacts deltas into snapshots. You generally don\'t manage this, but very long-running queries with tiny batches can accumulate many small files — a known operational concern addressed by compaction and (for state) snapshot intervals (M20).</p>', tip: 'Logs + state deltas compact periodically. Many tiny batches → small-file pressure; compaction/snapshots address it.' },
];

const PHASE_LABEL = {
  planOffsets: '1 · plan offsets', writeOffsetLog: '2 · write OFFSET log',
  process: '3 · process + state', writeSink: '4 · write sink', writeCommitLog: '5 · write COMMIT log',
};
const PHASE_DESC = {
  planOffsets: 'Ask the source for the offset range of new orders since the last commit.',
  writeOffsetLog: 'Persist {batchId → offset range} to the WAL — BEFORE any processing. This is the "I am about to do batch N over these offsets" promise.',
  process: 'Run the batch: read the data, update state, compute the result.',
  writeSink: 'Write the result to the sink (Delta/Kafka). The data is out, but not yet marked done.',
  writeCommitLog: 'Persist "batchId committed" — AFTER the sink. Only now is the batch officially complete and safe from replay.',
};

export function mount(container) {
  injectModStyles();

  const ORDERS = Array.from({ length: 6 }, (_, i) => ({ id: 'ord-' + i }));
  const BATCH_SIZE = 2;
  const batches = planBatches(ORDERS, BATCH_SIZE);

  const concept = `
  <div class="ss-prose">
    <p>The <b>checkpoint</b> is the save-file that lets an unbounded query crash and resume <b>exactly where it left off</b>, with no lost or double-counted data. It holds four things:</p>
    <div class="ss-grid">
      <div class="ss-card"><h4>📝 Offset log</h4><p>Offsets <b>planned</b> per batch, written <b>before</b> processing. "I'm about to do batch N over these offsets."</p></div>
      <div class="ss-card"><h4>✅ Commit log</h4><p>Batches <b>confirmed done</b>, written <b>after</b> the sink. The "done" marker that short-circuits replay.</p></div>
      <div class="ss-card"><h4>🗄️ State snapshots</h4><p>Versioned state-store deltas + snapshots, per batch. Lets a failed task reload state without recomputing.</p></div>
      <div class="ss-card"><h4>🏷️ Metadata</h4><p>Query id, source descriptions, state layout — pins the query shape so recovery is consistent.</p></div>
    </div>
    <h3>The ordering IS the guarantee</h3>
    <p>Offset-log <b>before</b> processing → no batch is silently skipped. Commit-log <b>after</b> the sink → no batch is falsely marked done. On restart Spark compares the two logs: a batch that is <b>offset-logged but not commit-logged</b> is <b>replayed from its logged offsets</b> (M16). Because those offsets are pinned, the replay is identical — the foundation of exactly-once.</p>
    <div class="ss-callout"><b>Must be durable + per-query:</b> the checkpoint lives on replicated storage (S3/HDFS/ADLS) and belongs to <b>one</b> <code>writeStream</code>. A non-durable checkpoint = no recovery; a shared/reused one = corruption. Changing shuffle partitions or sources needs a <b>fresh</b> checkpoint.</div>
  </div>`;

  const interactive = `
  <div class="ss-prose"><p>Step the <b>real E2 engine</b> through the 5-phase lifecycle of each batch and watch the <b>offset log</b> (written before processing) and <b>commit log</b> (written after the sink) fill in. Notice the window between writing the sink and writing the commit — that's where a crash gets interesting (M16).</p></div>
  <div class="ss-controls">
    <button class="ss-btn primary" id="m15-step">Next phase ▶</button>
    <button class="ss-btn" id="m15-reset">⟲ Reset</button>
    <span style="font-size:12.5px;color:var(--text-secondary)" id="m15-pos">—</span>
  </div>
  <div class="ss-callout" id="m15-phase" style="border-left-color:var(--accent)">—</div>
  <div class="ss-grid" style="grid-template-columns:1fr 1fr 1fr">
    <div class="ss-card"><h4>📝 Offset log (WAL)</h4><div id="m15-offset"></div></div>
    <div class="ss-card"><h4>✅ Commit log</h4><div id="m15-commit"></div></div>
    <div class="ss-card"><h4>🪣 Sink</h4><div id="m15-sink"></div></div>
  </div>`;

  const story = `
  <div class="ss-prose">
    <h3>ShopStream's checkpoint on S3</h3>
    <p>ShopStream's revenue query checkpoints to <code>s3://shopstream/chk/revenue</code>. Each 10-second batch writes its Kafka offset range to the offset log, processes, writes to Delta, then commits. When an executor was terminated by a spot-instance reclaim mid-batch, the driver restarted the batch, reloaded state from the last version, and the Delta sink's transactional write meant <b>no double-counted revenue</b>.</p>
    <p>A costly near-miss: an engineer once set <code>checkpointLocation</code> to a <b>local path</b> on a dev cluster. When the node recycled, the checkpoint vanished and the query could only restart from <code>latest</code> — <b>silently skipping</b> the orders in flight. The runbook now mandates a durable S3 path and a unique checkpoint per query.</p>
    <div class="ss-callout">Because the <code>shuffle.partitions</code> and source set are pinned in the checkpoint, ShopStream treats "change partitions" or "add a topic" as a <b>new-checkpoint</b> operation — planned, with a backfill — never an in-place edit.</div>
  </div>`;

  const code = `
  ${codeBlock('PySpark', `(revenue.writeStream
    .outputMode("update").format("delta")
    .option("path", "/lake/shopstream/revenue")
    .option("checkpointLocation", "s3://shopstream/chk/revenue")  # durable + per-query
    .trigger(processingTime="10 seconds")
    .start())`)}
  ${codeBlock('Checkpoint directory layout', `s3://shopstream/chk/revenue/
├── offsets/        # offset log: offsets PLANNED per batch (written BEFORE process)
│     ├── 0  1  2  3 ...
├── commits/        # commit log: batches CONFIRMED done (written AFTER sink)
│     ├── 0  1  2 ...        <- batch 3 missing => batch 3 is replayed on restart
├── state/          # versioned state snapshots + deltas, per partition
│     └── 0/ 1/ ...
└── metadata        # query id, source descriptions`)}
  ${codeBlock('Recovery rule (what restart does)', `# Spark compares offsets/ vs commits/:
#   batch in offsets/ but NOT in commits/  -> REPLAY from its logged offsets
#   batch in commits/                      -> already done, SKIP
# Replayed offsets are pinned (not "latest") -> identical reprocessing -> exactly-once`)}`;

  container.innerHTML = createModuleShell({
    tag: 'M15 · Sinks & Reliability',
    title: 'Checkpoint & Offset Log',
    subtitle: 'The write-ahead log that makes crash recovery exactly-once',
    definition: {
      formal: 'The checkpoint is a durable, per-query directory holding the offset log (offsets planned per batch, written before processing), the commit log (batches confirmed after the sink), versioned state-store snapshots/deltas, and query metadata. On restart, Spark replays any batch present in the offset log but absent from the commit log, re-reading its pinned offsets, which yields identical reprocessing and underpins exactly-once semantics.',
      easy: 'The checkpoint is Spark\'s save-file. Before doing each batch it writes down "I\'m about to process these records"; after the results are safely written it notes "that batch is done." If it crashes, it reads those two lists on restart — anything it started but didn\'t finish gets redone from the exact same spot, so nothing is lost or counted twice. It has to live on durable storage like S3.',
    },
    tabs: [
      { id: 'concept', label: '📖 Concept', content: concept },
      { id: 'demo', label: '📝 WAL Stepper', content: interactive },
      { id: 'story', label: '🛒 ShopStream', content: story },
      { id: 'code', label: '💻 Code', content: code },
      { id: 'iq', label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });
  initTabs(container);
  initIQ(container);

  // Build the full phase sequence trace with the E2 engine.
  const sim = new CheckpointSim();
  sim.run(batches); // full clean run populates sim.trace in phase order
  const seq = sim.trace; // [{batchId, phase, done}]
  let step = -1;

  const offsetEl = container.querySelector('#m15-offset');
  const commitEl = container.querySelector('#m15-commit');
  const sinkEl = container.querySelector('#m15-sink');
  const phaseEl = container.querySelector('#m15-phase');
  const posEl = container.querySelector('#m15-pos');

  // Rebuild log/sink state by replaying phases up to `step`.
  function stateAt(s) {
    const offset = new Map(), commit = new Set(), sinkIds = [];
    for (let i = 0; i <= s; i++) {
      const { batchId, phase } = seq[i];
      const b = batches[batchId];
      if (phase === 'writeOffsetLog') offset.set(batchId, { start: b.start, end: b.end });
      if (phase === 'writeSink') for (const r of b.records) sinkIds.push(r.id);
      if (phase === 'writeCommitLog') commit.add(batchId);
    }
    return { offset, commit, sinkIds };
  }

  function listHtml(entries) {
    if (!entries.length) return '<div style="color:var(--text-muted);font-size:12px">(empty)</div>';
    return entries.map((e) => `<div style="font-family:var(--font-mono);font-size:12px;padding:2px 0">${e}</div>`).join('');
  }

  function render() {
    posEl.textContent = step < 0 ? 'not started' : `step ${step + 1} / ${seq.length}`;
    if (step < 0) {
      phaseEl.innerHTML = 'Press <b>Next phase ▶</b> to run batch 0 through its 5-phase lifecycle.';
      offsetEl.innerHTML = listHtml([]); commitEl.innerHTML = listHtml([]); sinkEl.innerHTML = listHtml([]);
      return;
    }
    const { batchId, phase } = seq[step];
    const st = stateAt(step);
    phaseEl.innerHTML = `<b>Batch ${batchId} — ${PHASE_LABEL[phase]}:</b> ${PHASE_DESC[phase]}`;
    phaseEl.style.borderLeftColor = phase === 'writeOffsetLog' ? 'var(--blue,#3B82F6)'
      : phase === 'writeCommitLog' ? 'var(--green,#10B981)'
      : phase === 'writeSink' ? 'var(--yellow,#F59E0B)' : 'var(--accent)';
    offsetEl.innerHTML = listHtml([...st.offset.entries()].map(([id, r]) => `batch ${id}: [${r.start},${r.end})`));
    commitEl.innerHTML = listHtml([...st.commit].sort((a, b) => a - b).map((id) => `batch ${id} ✓`));
    sinkEl.innerHTML = listHtml(st.sinkIds.map((id) => esc(id)));
  }

  container.querySelector('#m15-step').addEventListener('click', () => { if (step < seq.length - 1) { step++; render(); } });
  container.querySelector('#m15-reset').addEventListener('click', () => { step = -1; render(); });
  render();
}

export default { mount };
