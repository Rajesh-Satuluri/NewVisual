// M10 · Stateful Aggregations — State & Output  (engine-driven: MicroBatchQuery)
import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { injectModStyles, codeBlock, esc } from './_mod-ui.js';
import { MicroBatchQuery } from '../sim/microbatch-engine.js';

const IQ = [
  { q: 'What makes an aggregation "stateful," and where is the state kept?', a: '<p>A stateful aggregation must <b>remember results across batches</b> — a running count/sum per group can\'t be computed from the current batch alone. Spark keeps this in the <b>State Store</b>: a versioned, fault-tolerant key-value store <b>partitioned by grouping key</b>, living on the executors and <b>checkpointed every batch</b>. Each batch reads the prior state for its keys, updates it, and writes the new version.</p>', tip: 'State = carried across batches, in the key-partitioned State Store on executors, checkpointed each batch.' },
  { q: 'What determines the size of streaming state?', a: '<p>State size ≈ <b>number of distinct keys currently retained</b> × per-key size. For windowed aggregations that\'s <b>(distinct group keys) × (open windows)</b>. It grows with key cardinality and with how long windows stay open (watermark delay). <b>Unbounded key cardinality</b> (e.g. grouping by a raw user id forever with no watermark) is the classic cause of ever-growing state and eventual OOM.</p>', tip: 'State ∝ retained keys × open windows. Unbounded cardinality + no eviction = OOM. Watch distinct keys.' },
  { q: 'How does state get cleaned up (eviction)?', a: '<p>Via the <b>watermark</b>: once a window\'s end is ≤ the watermark, the window is finalized and its state row is <b>evicted</b>. No watermark on a windowed/aggregating query (or complete mode) means <b>nothing is ever evicted</b> → state grows forever. So a watermark isn\'t just about dropping late data — it\'s the mechanism that bounds state (M08).</p>', tip: 'Eviction is watermark-driven: window end ≤ watermark → evicted. No watermark → unbounded state.' },
  { q: 'Why is the RocksDB state store recommended for large state?', a: '<p>The default (HDFS-backed, in-memory) state store keeps all state <b>on the JVM heap</b> — large state causes GC pressure and OOM. The <b>RocksDB state store</b> keeps state <b>off-heap / on local disk</b> with an in-memory cache, so it scales to <b>many millions of keys</b> without blowing the heap, at a small latency cost. It\'s the production default for big stateful jobs, and supports changelog checkpointing for faster recovery.</p>', tip: 'RocksDB = off-heap/on-disk state → avoids JVM GC/OOM for large state. The go-to for millions of keys.' },
  { q: 'What does spark.sql.shuffle.partitions have to do with state?', a: '<p>Stateful operators run with that many tasks, and <b>state is partitioned across exactly that many partitions</b>. The number is <b>baked into the checkpoint</b> and <b>cannot be changed</b> for a running query — changing it would send keys to different partitions and the state couldn\'t be located on restart. So size it up front for peak key volume; to change it you need a fresh checkpoint (M03).</p>', tip: 'Shuffle partitions = state partition count, fixed by the checkpoint. Size for peak; change needs a new checkpoint.' },
  { q: 'How do output modes interact with aggregation state?', a: '<p><b>Append</b> emits each group/window <b>once at close</b>, then evicts → bounded state. <b>Update</b> emits changed groups each batch and evicts on watermark → bounded. <b>Complete</b> re-emits the <b>entire</b> result table every batch and <b>never evicts</b> → <b>unbounded state</b>, viable only for small, naturally-bounded key spaces. The mode you pick directly governs whether state stays bounded (M12).</p>', tip: 'Append/Update evict (bounded). Complete never evicts (unbounded) — small key spaces only.' },
  { q: 'What aggregations are supported, and can you do multiple at once?', a: '<p>Standard aggregates — <code>count</code>, <code>sum</code>, <code>avg</code>, <code>min</code>, <code>max</code>, <code>approx_count_distinct</code>, <code>collect_list/set</code>, etc. — including <b>multiple in one <code>agg()</code></b> over the same grouping. <b>Multiple distinct aggregations at different grains</b> in one query are limited; you typically run separate queries or a single grouping. <code>count(distinct)</code> is expensive (large state); prefer <code>approx_count_distinct</code> for streaming.</p>', tip: 'All standard aggs, multiple per agg(). Exact distinct is costly → approx_count_distinct in streaming.' },
  { q: 'What is a "state store version" and why does it matter for recovery?', a: '<p>Each batch produces a new <b>numbered version</b> of the state (snapshot + deltas) written to the checkpoint. On restart, Spark loads the state version corresponding to the <b>last committed batch</b> and replays the next one from the offset log — giving exactly-once. Versioning is also what lets a failed task reload prior state on another executor without recomputing from the beginning (M15–M16).</p>', tip: 'Versioned state per batch → load last-committed version on restart → exactly-once + fast task recovery.' },
  { q: 'How would you diagnose and fix growing streaming state?', a: '<p>Check <code>StreamingQueryProgress.stateOperators</code>: <code>numRowsTotal</code> and <code>memoryUsedBytes</code> climbing batch over batch = unbounded state. Causes: no watermark, watermark too large, complete mode, or exploding key cardinality. Fixes: add/tighten the <b>watermark</b>, switch off <b>complete</b> mode, reduce key cardinality (bucket/round keys), use <b>RocksDB</b>, and ensure <code>shuffle.partitions</code> is adequate (M20, M21).</p>', tip: 'numRowsTotal/memoryUsedBytes trend. Fix: watermark, drop complete mode, cut cardinality, RocksDB.' },
  { q: 'Running aggregation without any window — is that stateful?', a: '<p>Yes and <b>dangerously unbounded</b>. <code>groupBy("category").count()</code> with no window keeps a running count per category forever — fine if the key space is <b>small and fixed</b> (a few categories). But <code>groupBy("user_id").count()</code> with no window/watermark accumulates state for <b>every user ever seen</b> → unbounded. Global (un-windowed) aggregations have <b>no watermark-based eviction</b>, so only use them for bounded key spaces.</p>', tip: 'Un-windowed groupBy = running state forever, no eviction. Safe only for small fixed key spaces.' },
];

// Engine-driven: windowed count per category. Feed batches; chart retained-state
// size per batch under a chosen watermark delay + output mode.
const BATCHES = [
  [{ id: 'a', eventTime: 1, cat: 'books' }, { id: 'b', eventTime: 2, cat: 'toys' }, { id: 'c', eventTime: 3, cat: 'books' }],
  [{ id: 'd', eventTime: 6, cat: 'toys' }, { id: 'e', eventTime: 7, cat: 'books' }, { id: 'f', eventTime: 8, cat: 'home' }],
  [{ id: 'g', eventTime: 11, cat: 'books' }, { id: 'h', eventTime: 12, cat: 'toys' }],
  [{ id: 'i', eventTime: 16, cat: 'home' }, { id: 'j', eventTime: 17, cat: 'toys' }],
  [{ id: 'k', eventTime: 21, cat: 'books' }, { id: 'l', eventTime: 22, cat: 'home' }],
];

function drawState(canvas, trace, cursor) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#0A0E1A'; ctx.fillRect(0, 0, W, H);
  const pad = 46, axisY = H - 40, topY = 28;
  const n = trace.length;
  const maxState = Math.max(1, ...trace.map((e) => e.state.length));
  const BX = (i) => pad + (i + 0.5) * ((W - pad * 2) / n);
  const BY = (v) => axisY - (v / maxState) * (axisY - topY);

  // axes
  ctx.strokeStyle = 'rgba(148,163,184,0.4)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(pad, axisY); ctx.lineTo(W - pad, axisY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(pad, topY); ctx.lineTo(pad, axisY); ctx.stroke();
  ctx.fillStyle = 'rgba(148,163,184,0.7)'; ctx.font = '10px ui-monospace,monospace';
  ctx.textAlign = 'right';
  for (let v = 0; v <= maxState; v++) { ctx.fillText(String(v), pad - 8, BY(v) + 3);
    ctx.strokeStyle = 'rgba(148,163,184,0.1)'; ctx.beginPath(); ctx.moveTo(pad, BY(v)); ctx.lineTo(W - pad, BY(v)); ctx.stroke(); }
  ctx.save(); ctx.translate(14, (topY + axisY) / 2); ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#8B5CF6'; ctx.textAlign = 'center'; ctx.fillText('retained state rows', 0, 0); ctx.restore();

  // bars
  const bw = Math.min(46, (W - pad * 2) / n - 14);
  trace.forEach((e, i) => {
    const active = i === cursor;
    const v = e.state.length;
    ctx.fillStyle = active ? '#8B5CF6' : 'rgba(139,92,246,0.4)';
    ctx.strokeStyle = '#8B5CF6'; ctx.lineWidth = active ? 2 : 1;
    const x = BX(i) - bw / 2;
    ctx.beginPath(); ctx.roundRect(x, BY(v), bw, axisY - BY(v), 5); ctx.fill(); if (active) ctx.stroke();
    ctx.fillStyle = active ? '#C4B5FD' : 'rgba(148,163,184,0.7)'; ctx.textAlign = 'center';
    ctx.font = 'bold 11px ui-monospace,monospace'; ctx.fillText(String(v), BX(i), BY(v) - 6);
    ctx.fillStyle = 'rgba(148,163,184,0.7)'; ctx.font = '10px ui-monospace,monospace';
    ctx.fillText('b' + i, BX(i), axisY + 16);
    if (e.droppedCount) { ctx.fillStyle = '#EF4444'; ctx.fillText('↓' + e.droppedCount, BX(i), axisY + 28); }
  });
  ctx.textAlign = 'left';
}

export function mount(container) {
  injectModStyles();

  const concept = `
  <div class="ss-prose">
    <p>Most streaming value comes from <b>stateful</b> operators — a running count, sum, or average that no single batch can produce alone. Spark remembers the running result in the <b>State Store</b> and updates it each batch.</p>
    <div class="ss-grid">
      <div class="ss-card"><h4>🗄️ The State Store</h4><p>Versioned, fault-tolerant KV store, <b>partitioned by grouping key</b>, on the executors, checkpointed every batch. Each batch reads prior state for its keys, updates, writes a new version.</p></div>
      <div class="ss-card"><h4>📏 State size</h4><p>≈ <b>distinct retained keys × open windows</b>. Grows with key cardinality and watermark delay. Unbounded cardinality is the #1 cause of OOM.</p></div>
      <div class="ss-card"><h4>🧹 Eviction = watermark</h4><p>A window with <b>end ≤ watermark</b> is finalized and its state row evicted. No watermark → nothing evicts → state grows forever.</p></div>
      <div class="ss-card"><h4>💾 RocksDB for scale</h4><p>Default state is on-heap (GC/OOM risk). RocksDB keeps it <b>off-heap/on-disk</b> → millions of keys without blowing the heap.</p></div>
    </div>
    <h3>The mode decides whether state stays bounded</h3>
    <p><b>Append</b> & <b>update</b> evict on the watermark → <b>bounded</b> state. <b>Complete</b> re-emits everything and <b>never evicts</b> → <b>unbounded</b> (small key spaces only). And <code>spark.sql.shuffle.partitions</code> fixes how state is partitioned — <b>baked into the checkpoint</b>, unchangeable live, so size it for peak.</p>
    <div class="ss-callout"><b>Un-windowed aggregation</b> (<code>groupBy("user_id").count()</code> with no window) keeps a running total per key <b>forever</b> — safe only for small, fixed key spaces, dangerous for high-cardinality keys.</div>
  </div>`;

  const interactive = `
  <div class="ss-prose"><p>A real <b>E1-engine</b> windowed <code>count by category</code>. Step the batches and watch <b>retained state rows</b> rise as new windows open and <b>fall</b> as the watermark evicts closed ones. Then turn the watermark off and watch state climb without bound.</p></div>
  <div class="ss-controls">
    <button class="ss-btn primary" id="m10-step">Next batch ▶</button>
    <button class="ss-btn" id="m10-back">◀ Back</button>
    <button class="ss-btn" id="m10-reset">⟲ Reset</button>
    <label style="font-size:12.5px;color:var(--text-secondary);margin-left:8px">Mode:
      <select id="m10-mode" class="ss-btn" style="margin-left:4px">
        <option value="update">update (evicts)</option>
        <option value="append">append (evicts)</option>
        <option value="complete">complete (never evicts)</option>
      </select></label>
    <label style="font-size:12.5px;color:var(--text-secondary)">Watermark delay:
      <input type="range" id="m10-delay" min="0" max="6" step="1" value="1" style="vertical-align:middle">
      <span id="m10-delay-v" style="font-family:var(--font-mono)">1</span></label>
  </div>
  <div class="ss-canvas-wrap"><canvas id="m10-canvas" width="720" height="230"></canvas></div>
  <div class="ss-metrics">
    <div class="ss-metric"><div class="k">Batch</div><div class="v" id="m10-bi">—</div></div>
    <div class="ss-metric"><div class="k">Watermark</div><div class="v" id="m10-wm">—</div></div>
    <div class="ss-metric"><div class="k">State rows now</div><div class="v" id="m10-sz">—</div></div>
    <div class="ss-metric"><div class="k">Peak state</div><div class="v" id="m10-peak">—</div></div>
  </div>
  <div class="ss-callout" id="m10-expl">—</div>`;

  const story = `
  <div class="ss-prose">
    <h3>ShopStream's running revenue state</h3>
    <p>ShopStream's core query keeps <b>running revenue per category per 5-minute window</b>. With ~40 categories and a 10-minute watermark, at any moment it holds roughly <b>40 categories × 3 open windows ≈ 120 state rows</b> — tiny and bounded, because the watermark evicts each window ~15 minutes after it starts.</p>
    <p>A new "personalization" query tried <code>groupBy("user_id")</code> to count orders per user with <b>no window and no watermark</b>. State grew by <b>every new user, forever</b> — after two days the executors OOM'd. The fix: switch to a <b>windowed</b> aggregation with a watermark (so old users evict) and move to the <b>RocksDB state store</b> for the still-large key space.</p>
    <div class="ss-callout">ShopStream pre-sized <code>spark.sql.shuffle.partitions = 200</code> for Black Friday peak key volume — because it can't be changed on a live query, under-sizing it would have forced a full restart with a new checkpoint mid-event.</div>
  </div>`;

  const code = `
  ${codeBlock('PySpark', `# Bounded stateful aggregation: windowed + watermark + RocksDB for scale
spark.conf.set("spark.sql.streaming.stateStore.providerClass",
    "org.apache.spark.sql.execution.streaming.state.RocksDBStateStoreProvider")

revenue = (orders
    .withWatermark("event_time", "10 minutes")      # enables eviction
    .groupBy(window("event_time", "5 minutes"), "category")
    .agg(sum("amount").alias("revenue"),
         count("*").alias("orders"),
         approx_count_distinct("user_id").alias("buyers")))  # cheap distinct

# DANGER: unbounded state — per-user running count, no window/watermark:
# orders.groupBy("user_id").count()   # grows for every user ever seen -> OOM`)}
  ${codeBlock('Observing state (StreamingQueryProgress)', `# query.lastProgress["stateOperators"][0]:
#   "numRowsTotal": 1200,            <- retained state rows; trending up = leak
#   "memoryUsedBytes": 48000000,
#   "numRowsRemovedTotal": 980       <- evictions (watermark doing its job)`)}`;

  container.innerHTML = createModuleShell({
    tag: 'M10 · State & Output',
    title: 'Stateful Aggregations',
    subtitle: 'Running aggregates, the State Store, and how to keep state bounded',
    definition: {
      formal: 'A stateful aggregation maintains per-group results across micro-batches in the State Store — a versioned, key-partitioned, checkpointed key-value store on the executors. State size is proportional to retained distinct keys times open windows; the watermark finalizes and evicts windows whose end has passed it, bounding state. The RocksDB state store holds large state off-heap, and the shuffle-partition count (fixed by the checkpoint) determines state partitioning.',
      easy: 'A stateful aggregation is any running total — revenue per category, orders per minute — that Spark has to remember between batches. It stores those running totals in a special key-value store and updates them each batch. The catch is memory: without a watermark to throw away finished time-windows, those totals pile up forever. This demo shows state growing and shrinking as windows open and get evicted.',
    },
    tabs: [
      { id: 'concept', label: '📖 Concept', content: concept },
      { id: 'demo', label: '🗄️ State Size Lab', content: interactive },
      { id: 'story', label: '🛒 ShopStream', content: story },
      { id: 'code', label: '💻 Code', content: code },
      { id: 'iq', label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });
  initTabs(container);
  initIQ(container);

  const canvas = container.querySelector('#m10-canvas');
  const modeSel = container.querySelector('#m10-mode');
  const delay = container.querySelector('#m10-delay'), delayV = container.querySelector('#m10-delay-v');
  const biEl = container.querySelector('#m10-bi'), wmEl = container.querySelector('#m10-wm');
  const szEl = container.querySelector('#m10-sz'), peakEl = container.querySelector('#m10-peak');
  const explEl = container.querySelector('#m10-expl');
  let trace = [], cursor = 0;

  function recompute() {
    const q = new MicroBatchQuery({
      window: { type: 'tumbling', size: 5 },
      watermarkDelay: +delay.value,
      outputMode: modeSel.value,
      groupBy: 'cat',
      aggregate: { fn: 'count' },
    });
    trace = q.run(BATCHES).trace;
    cursor = Math.min(cursor, trace.length - 1);
    render();
  }
  const fmtWm = (v) => (v === Number.NEGATIVE_INFINITY ? '−∞' : String(v));

  function render() {
    delayV.textContent = delay.value;
    drawState(canvas, trace, cursor);
    const e = trace[cursor];
    biEl.textContent = cursor;
    wmEl.textContent = fmtWm(e.watermarkAfter);
    szEl.textContent = e.state.length;
    const peak = Math.max(...trace.map((x) => x.state.length));
    peakEl.textContent = peak;
    const keys = e.state.map((r) => `${r.key}[${r.window.start},${r.window.end})=${r.value}`).join('  ');
    const complete = modeSel.value === 'complete';
    explEl.innerHTML =
      `<b>Batch ${cursor}, mode=${modeSel.value}:</b> watermark = <b>${fmtWm(e.watermarkAfter)}</b>, retaining <b>${e.state.length}</b> state rows.`
      + (complete
          ? `<br>⚠️ <b>complete</b> mode never evicts — state only ever grows (peak ${peak}). Fine here (few categories), fatal for high-cardinality keys.`
          : (e.state.length < peak
              ? `<br>🧹 The watermark evicted closed windows — state dropped from its peak of ${peak}. This is what keeps it bounded.`
              : `<br>State is at/near peak; closed windows will evict as the watermark advances.`))
      + (keys ? `<br><span style="color:var(--text-muted);font-size:12px">${esc(keys)}</span>` : '');
  }

  container.querySelector('#m10-step').addEventListener('click', () => { if (cursor < trace.length - 1) { cursor++; render(); } });
  container.querySelector('#m10-back').addEventListener('click', () => { if (cursor > 0) { cursor--; render(); } });
  container.querySelector('#m10-reset').addEventListener('click', () => { cursor = 0; render(); });
  modeSel.addEventListener('change', recompute);
  delay.addEventListener('input', recompute);
  recompute();
}

export default { mount };
