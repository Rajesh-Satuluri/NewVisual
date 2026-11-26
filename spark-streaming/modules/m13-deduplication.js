// M13 · Deduplication — State & Output
// NOTE: the dedup logic here is a small SELF-CONTAINED deterministic simulation
// (dropDuplicates is not part of the E1 micro-batch engine). It is clearly
// labeled as simulated in the UI and in sim/PRESERVATION.md.
import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { injectModStyles, codeBlock, esc } from './_mod-ui.js';

export const IQ = [
  { q: 'How does dropDuplicates work in Structured Streaming?', a: '<p>It keeps a <b>state store of keys already seen</b>; for each incoming row it computes the dedup key (the chosen columns), checks the store, <b>passes the row through if new</b> and <b>drops it if seen</b>, recording new keys. Because the stream is unbounded, that "seen keys" set would grow forever — so you pair it with a <b>watermark</b> so old keys can be evicted. Exactly-once delivery still produces duplicates across failures/replays; dedup is how you tolerate at-least-once sources.</p>', tip: 'Keeps a "seen keys" state set; new→pass, seen→drop. Unbounded without a watermark to evict old keys.' },
  { q: 'Why is a watermark important for dropDuplicates?', a: '<p>Without one, the "seen keys" state grows <b>unbounded</b> — every key ever seen is retained forever → OOM. With <code>dropDuplicates(["id"])</code> plus <code>withWatermark("event_time", "1 hour")</code>, Spark only needs to remember keys <b>within the watermark window</b>; once event time moves past a key\'s timestamp + delay, that key is <b>evicted</b>, bounding state. The trade-off: a duplicate arriving <b>after</b> the watermark passes is <b>no longer caught</b> (treated as new).</p>', tip: 'Watermark bounds the seen-keys state via eviction. Cost: dupes beyond the watermark slip through.' },
  { q: 'What is the difference between dropDuplicates and dropDuplicatesWithinWatermark?', a: '<p><code>dropDuplicates(cols)</code> + a watermark dedups and evicts based on the <b>event-time column</b> you must include/relate to the key. <b>dropDuplicatesWithinWatermark</b> (Spark 3.5+) dedups within the watermark interval <b>without requiring the event-time column to be part of the dedup key</b> — handy when duplicates can have <i>different</i> event times (e.g. retried events re-timestamped). It makes the common "dedup by business id within a time bound" case cleaner.</p>', tip: 'dropDuplicatesWithinWatermark (3.5+) = dedup within time bound WITHOUT event time in the key. For re-timestamped dupes.' },
  { q: 'Where do duplicates come from in a streaming pipeline?', a: '<p><b>At-least-once sources/producers</b> (Kafka producer retries without idempotence), <b>upstream replays</b>, <b>consumer re-reads after a crash</b> before committing, and <b>application-level resends</b>. Even Structured Streaming\'s own exactly-once applies to <i>its</i> processing; if the <b>source</b> already contains duplicates (same order sent twice), you need explicit dedup. So dedup handles duplicate <b>data</b>, distinct from the engine\'s exactly-once <b>processing</b> guarantee.</p>', tip: 'Producer retries, replays, crash re-reads, app resends. Source-level dupes ≠ engine exactly-once; dedup handles data dupes.' },
  { q: 'How do you choose the dedup key?', a: '<p>Use a <b>stable, unique business identifier</b> for the logical event — e.g. <code>order_id</code>, an idempotency key, or <code>(user_id, action_id)</code>. It must be the same across duplicate copies. Avoid keys that differ between retries (like a processing timestamp or an auto-generated row id). If duplicates can carry different event times, prefer <code>dropDuplicatesWithinWatermark</code> so the time column needn\'t be in the key.</p>', tip: 'Stable business id shared by all copies (order_id / idempotency key). Not per-attempt fields.' },
  { q: 'What happens to state size with and without the watermark?', a: '<p><b>Without</b>: the seen-keys set grows by every distinct key forever → unbounded, eventual OOM. <b>With</b> a watermark of delay D: state holds roughly the keys seen in the <b>last D of event time</b> — bounded by your key arrival rate × D. So the watermark delay directly sizes dedup state: longer delay catches later duplicates but holds more keys (M10).</p>', tip: 'No watermark → unbounded seen-keys. With delay D → ~keys in last D. Delay sizes dedup state.' },
  { q: 'Is dropDuplicates exactly-once or best-effort?', a: '<p>Within the watermark window it is <b>deterministic and complete</b> — every duplicate whose twin is still in state is dropped. Beyond the watermark it\'s <b>best-effort</b>: a very-late duplicate (past eviction) is treated as new and passes through. So it gives <b>exactly-once within the time bound</b> you configure, which is why you set the delay to cover the realistic duplicate-arrival spread.</p>', tip: 'Exactly-once WITHIN the watermark window; best-effort beyond it. Set delay to cover real dupe spread.' },
  { q: 'Can you dedup a stream feeding a stateful aggregation?', a: '<p>Yes — <code>dropDuplicates</code> before the aggregation ensures each logical event is counted once. Both operators are stateful and both rely on the watermark; the dedup state and the aggregation state are separate stores. Order matters: dedup first so duplicates never reach the aggregate. Watch combined state size, since you\'re now holding two stateful operators\' worth.</p>', tip: 'Dedup before aggregate so dupes never count. Two separate state stores; watch combined size.' },
  { q: 'Alternative to dropDuplicates for exactly-once writes?', a: '<p>Use an <b>idempotent sink</b>: write with the business key as the primary key and <b>upsert/MERGE</b> (e.g. Delta <code>MERGE</code> in <code>foreachBatch</code>) so re-writing the same key is a no-op. This pushes dedup to the <b>write side</b> and is often more robust than in-stream dedup for end-to-end exactly-once, because it tolerates duplicates introduced anywhere upstream (M14, M16, M19).</p>', tip: 'Idempotent sink + MERGE on business key = dedup at write side. Often more robust than in-stream dropDuplicates.' },
  { q: 'What are the failure modes of in-stream dedup?', a: '<p>(1) <b>Wrong key</b> — using a per-attempt field means duplicates aren\'t recognized. (2) <b>Watermark too tight</b> — late duplicates slip through. (3) <b>Unbounded state</b> — forgot the watermark → OOM. (4) <b>Assuming it fixes sink duplicates</b> — if the sink isn\'t idempotent, a retried batch can still double-write; combine dedup with an idempotent sink for true end-to-end safety.</p>', tip: 'Wrong key, tight watermark, no watermark (OOM), and assuming it covers sink writes. Pair with idempotent sink.' },
];

// Simulated dedup: seen-keys set with event-time-based eviction at watermark.
// records: {id, key, eventTime}; watermark advances as max(eventTime)-delay per batch.
function runDedup(batches, delay, useWatermark) {
  let watermark = Number.NEGATIVE_INFINITY, maxEt = Number.NEGATIVE_INFINITY;
  const seen = new Map(); // key -> eventTime last seen
  const trace = [];
  batches.forEach((batch, bi) => {
    const wmBefore = watermark;
    const passed = [], dropped = [];
    for (const r of batch) {
      if (r.eventTime > maxEt) maxEt = r.eventTime;
      // evict late duplicate check happens against current watermark
      const prior = seen.has(r.key);
      if (prior) { dropped.push(r); }
      else { passed.push(r); seen.set(r.key, r.eventTime); }
    }
    if (useWatermark) {
      watermark = maxEt === Number.NEGATIVE_INFINITY ? wmBefore : Math.max(wmBefore, maxEt - delay);
      // evict seen keys whose eventTime < watermark (safe: their dupes are now "too late")
      for (const [k, et] of seen) if (et < watermark) seen.delete(k);
    }
    trace.push({
      index: bi, wmBefore, wmAfter: watermark, maxEt,
      passed: passed.map((r) => ({ ...r })), dropped: dropped.map((r) => ({ ...r })),
      stateKeys: [...seen.keys()].sort(),
    });
  });
  return trace;
}

// ShopStream orders with duplicate order_ids (producer retries) and a late dupe.
const BATCHES = [
  [{ id: 'r1', key: 'ord-1', eventTime: 1 }, { id: 'r2', key: 'ord-2', eventTime: 2 }],
  [{ id: 'r3', key: 'ord-1', eventTime: 2 }, { id: 'r4', key: 'ord-3', eventTime: 6 }],   // ord-1 dup
  [{ id: 'r5', key: 'ord-4', eventTime: 9 }, { id: 'r6', key: 'ord-2', eventTime: 3 }],   // ord-2 dup (older)
  [{ id: 'r7', key: 'ord-5', eventTime: 14 }, { id: 'r8', key: 'ord-1', eventTime: 1 }],  // ord-1 very-late dup
];

export function mount(container) {
  injectModStyles();

  const concept = `
  <div class="ss-prose">
    <p>Sources lie: the same order can arrive twice (producer retries, replays, crash re-reads). <code>dropDuplicates</code> remembers <b>which keys it has already seen</b> and drops repeats — but on an unbounded stream that memory must be bounded by a <b>watermark</b>.</p>
    <div class="ss-grid">
      <div class="ss-card"><h4>🧠 Seen-keys state</h4><p>A state store of dedup keys already passed. New key → emit + remember; seen key → <b>drop</b>. This is a stateful operator.</p></div>
      <div class="ss-card"><h4>💧 Watermark bounds it</h4><p>Without a watermark the seen-set grows forever → OOM. With one, keys older than the watermark are <b>evicted</b> → bounded state, at the cost of missing very-late duplicates.</p></div>
      <div class="ss-card"><h4>🔑 Pick a stable key</h4><p>A business id shared by all copies — <code>order_id</code>, an idempotency key — never a per-attempt field like a processing timestamp.</p></div>
      <div class="ss-card"><h4>🆕 WithinWatermark (3.5+)</h4><p><code>dropDuplicatesWithinWatermark</code> dedups within the time bound <b>without</b> needing the event-time column in the key — for retries re-timestamped differently.</p></div>
    </div>
    <h3>Dedup data vs exactly-once processing</h3>
    <p>Spark's exactly-once covers <i>its own processing</i>. If the <b>source already contains duplicate records</b>, you still need explicit dedup — or, better for end-to-end safety, an <b>idempotent sink</b> that upserts on the business key (Delta <code>MERGE</code>), so a re-written row is a no-op (M14, M16, M19).</p>
    <div class="ss-callout"><b>Guarantee shape:</b> dropDuplicates is <b>exactly-once within the watermark window</b> and <b>best-effort beyond it</b> — a duplicate arriving after its key is evicted passes through as new. Size the delay to cover realistic duplicate spread.</div>
  </div>`;

  const interactive = `
  <div class="ss-prose"><p><i>Simulated dedup</i> (illustrative — not the E1 engine): ShopStream orders arrive with duplicate <code>order_id</code>s from producer retries. Step the batches; new ids <b>pass</b>, repeats <b>drop</b>, and the <b>seen-keys state</b> is evicted by the watermark. Toggle the watermark off to watch state grow unbounded.</p></div>
  <div class="ss-controls">
    <button class="ss-btn primary" id="m13-step">Next batch ▶</button>
    <button class="ss-btn" id="m13-back">◀ Back</button>
    <button class="ss-btn" id="m13-reset">⟲ Reset</button>
    <label style="font-size:12.5px;color:var(--text-secondary);margin-left:8px">
      <input type="checkbox" id="m13-wm" checked style="vertical-align:middle"> Watermark on</label>
    <label style="font-size:12.5px;color:var(--text-secondary)">delay:
      <input type="range" id="m13-delay" min="0" max="8" step="1" value="4" style="vertical-align:middle">
      <span id="m13-delay-v" style="font-family:var(--font-mono)">4</span></label>
  </div>
  <div class="ss-metrics">
    <div class="ss-metric"><div class="k">Batch</div><div class="v" id="m13-bi">—</div></div>
    <div class="ss-metric"><div class="k">Watermark</div><div class="v" id="m13-wm-v">—</div></div>
    <div class="ss-metric"><div class="k">Seen-keys state</div><div class="v" id="m13-state">—</div></div>
    <div class="ss-metric"><div class="k">Total dropped</div><div class="v" id="m13-drop">—</div></div>
  </div>
  <div id="m13-rows"></div>
  <div class="ss-callout" id="m13-expl">—</div>`;

  const story = `
  <div class="ss-prose">
    <h3>ShopStream's double-charged order</h3>
    <p>ShopStream's order producer uses Kafka with retries but <b>without idempotence</b>, so a network blip occasionally publishes the <b>same <code>order_id</code> twice</b>. Without dedup, the revenue pipeline counted some orders twice — finance noticed revenue didn't reconcile with the payment processor.</p>
    <p>The fix: <code>dropDuplicates(["order_id"])</code> with <code>withWatermark("event_time", "1 hour")</code> — duplicates within an hour are dropped, and the seen-keys state stays bounded (~one hour of order ids). For <b>absolute</b> safety they also made the Delta sink <b>idempotent</b>: a <code>MERGE</code> on <code>order_id</code> so even a duplicate that slips past the watermark can't double-write.</p>
    <div class="ss-callout">Belt and braces: in-stream <b>dropDuplicates</b> catches the common case cheaply; the <b>idempotent MERGE sink</b> is the backstop for anything beyond the watermark. Together they give end-to-end exactly-once on a duplicate-prone source.</div>
  </div>`;

  const code = `
  ${codeBlock('PySpark', `# Dedup by business id within a bounded time window
deduped = (orders
    .withWatermark("event_time", "1 hour")   # bounds the seen-keys state
    .dropDuplicates(["order_id"]))           # drop repeated order_ids

# Spark 3.5+: dedup within watermark WITHOUT event_time in the key
deduped = (orders
    .withWatermark("event_time", "1 hour")
    .dropDuplicatesWithinWatermark(["order_id"]))

revenue = deduped.groupBy("category").agg(sum("amount").alias("revenue"))`)}
  ${codeBlock('Idempotent sink backstop (Delta MERGE in foreachBatch)', `def upsert(batch_df, batch_id):
    (delta_table.alias("t")
        .merge(batch_df.alias("s"), "t.order_id = s.order_id")
        .whenNotMatchedInsertAll()        # duplicate order_id -> no-op, never double-writes
        .execute())

deduped.writeStream.foreachBatch(upsert) \\
    .option("checkpointLocation", "s3://shopstream/chk/orders").start()`)}`;

  container.innerHTML = createModuleShell({
    tag: 'M13 · State & Output',
    title: 'Deduplication',
    subtitle: 'dropDuplicates, the seen-keys state, and bounding it with a watermark',
    definition: {
      formal: 'dropDuplicates maintains a state store of previously observed dedup keys, passing a record through only if its key is unseen and dropping it otherwise. Paired with a watermark, keys whose event time falls below the watermark are evicted, bounding state and giving exactly-once deduplication within the watermark interval and best-effort beyond it. dropDuplicatesWithinWatermark (3.5+) dedups within the time bound without requiring the event-time column in the key.',
      easy: 'The same order can show up twice because of retries or replays. Deduplication remembers the IDs it has already let through and throws away repeats. Because it can\'t remember every ID forever, you give it a time limit (the watermark) so it forgets old IDs — which keeps memory bounded but means a very-late duplicate might sneak through. For total safety you also make the final write idempotent.',
    },
    tabs: [
      { id: 'concept', label: '📖 Concept', content: concept },
      { id: 'demo', label: '🧹 Dedup Simulator', content: interactive },
      { id: 'story', label: '🛒 ShopStream', content: story },
      { id: 'code', label: '💻 Code', content: code },
      { id: 'iq', label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });
  initTabs(container);
  initIQ(container);

  const stepB = container.querySelector('#m13-step'), backB = container.querySelector('#m13-back'), resetB = container.querySelector('#m13-reset');
  const wmChk = container.querySelector('#m13-wm');
  const delay = container.querySelector('#m13-delay'), delayV = container.querySelector('#m13-delay-v');
  const biEl = container.querySelector('#m13-bi'), wmEl = container.querySelector('#m13-wm-v');
  const stateEl = container.querySelector('#m13-state'), dropEl = container.querySelector('#m13-drop');
  const rowsEl = container.querySelector('#m13-rows'), explEl = container.querySelector('#m13-expl');
  let trace = [], cursor = -1;

  function recompute() {
    trace = runDedup(BATCHES, +delay.value, wmChk.checked);
    cursor = Math.min(cursor, trace.length - 1);
    render();
  }
  const fmtWm = (v) => (v === Number.NEGATIVE_INFINITY ? '−∞' : String(v));

  function render() {
    delayV.textContent = delay.value;
    delay.disabled = !wmChk.checked;
    if (cursor < 0) {
      biEl.textContent = '—'; wmEl.textContent = '−∞'; stateEl.textContent = '0'; dropEl.textContent = '0';
      rowsEl.innerHTML = ''; explEl.innerHTML = 'Press <b>Next batch ▶</b>. Watch duplicate <code>order_id</code>s get dropped and the seen-keys state evict (or not).';
      return;
    }
    const e = trace[cursor];
    biEl.textContent = cursor;
    wmEl.textContent = wmChk.checked ? fmtWm(e.wmAfter) : 'off';
    stateEl.textContent = e.stateKeys.length;
    const totDrop = trace.slice(0, cursor + 1).reduce((s, x) => s + x.dropped.length, 0);
    dropEl.textContent = totDrop;
    const rowChip = (r, kind) => `<span style="display:inline-block;margin:2px 4px;padding:2px 8px;border-radius:6px;font-family:var(--font-mono);font-size:12px;background:${kind === 'pass' ? 'color-mix(in srgb,var(--green,#10B981) 18%,transparent)' : 'color-mix(in srgb,var(--red,#EF4444) 18%,transparent)'};color:${kind === 'pass' ? 'var(--green,#10B981)' : 'var(--red,#EF4444)'}">${kind === 'pass' ? '✓' : '✗'} ${esc(r.key)} (t${r.eventTime})</span>`;
    rowsEl.innerHTML =
      `<div style="margin:8px 0"><b style="font-size:12px;color:var(--text-secondary)">This batch:</b><br>${e.passed.map((r) => rowChip(r, 'pass')).join('')}${e.dropped.map((r) => rowChip(r, 'drop')).join('')}</div>`
      + `<div style="font-size:12px;color:var(--text-muted)">Seen-keys state: ${e.stateKeys.map((k) => `<code>${esc(k)}</code>`).join(' ') || '(empty)'}</div>`;
    const lateDup = e.dropped.length === 0 && e.passed.some((r) => BATCHES.flat().filter((x) => x.key === r.key).length > 1);
    explEl.innerHTML = wmChk.checked
      ? `<b>Batch ${cursor}:</b> watermark = <b>${fmtWm(e.wmAfter)}</b>, seen-keys state = <b>${e.stateKeys.length}</b> (keys older than the watermark were evicted).`
        + (lateDup ? ` <span style="color:var(--yellow,#F59E0B)">A duplicate slipped through — its key was already evicted (arrived past the watermark), so dedup treated it as new.</span>` : '')
      : `<b>Batch ${cursor} (watermark OFF):</b> every key is remembered forever — seen-keys state = <b>${e.stateKeys.length}</b> and only ever grows. On a real unbounded stream this is an OOM waiting to happen.`;
  }

  stepB.addEventListener('click', () => { if (cursor < trace.length - 1) { cursor++; render(); } });
  backB.addEventListener('click', () => { if (cursor >= 0) { cursor--; render(); } });
  resetB.addEventListener('click', () => { cursor = -1; render(); });
  wmChk.addEventListener('change', recompute);
  delay.addEventListener('input', recompute);
  recompute();
}

export default { mount };
