// M12 · Output Modes — State & Output  (engine-driven: MicroBatchQuery ×3)
import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { injectModStyles, codeBlock, esc } from './_mod-ui.js';
import { MicroBatchQuery } from '../sim/microbatch-engine.js';

const IQ = [
  { q: 'What are the three output modes and what does each emit?', a: '<p><b>Append</b> — emits each result row <b>once, when it is final</b> and will never change (for aggregations: when the window closes past the watermark). <b>Update</b> — emits <b>only the rows that changed</b> in this batch (new or updated groups). <b>Complete</b> — emits the <b>entire result table</b> every batch. Append is the default-friendly streaming mode; update is for live dashboards; complete is for small, fully-materialized results.</p>', tip: 'Append = once-when-final; Update = changed rows only; Complete = whole table every batch.' },
  { q: 'Which output modes are valid for which queries?', a: '<p><b>No aggregation</b> (map/filter): only <b>append</b> (there\'s nothing to update). <b>Aggregation with a watermark</b>: <b>append</b> (emit on close), <b>update</b>, and <b>complete</b> all valid. <b>Aggregation without a watermark</b>: <b>complete</b> or <b>update</b> only — append can\'t be used because without a watermark a window never "closes," so there\'s no safe moment to emit-once. Spark rejects invalid mode/query combos at start.</p>', tip: 'No-agg → append only. Agg+watermark → all three. Agg without watermark → no append (nothing ever closes).' },
  { q: 'Why does append require a watermark for aggregations?', a: '<p>Append promises each row is emitted <b>exactly once and never revised</b>. For a windowed aggregate, a row is only final once <b>no more data can land in it</b> — which is precisely what the <b>watermark</b> determines (window end ≤ watermark). Without a watermark the window could always receive more data, so there\'s no point at which append could safely emit. Hence append + aggregation ⇒ watermark mandatory.</p>', tip: 'Append = emit-once-never-revise. "Final" is defined by the watermark. No watermark → no "final" → no append.' },
  { q: 'What are the state/eviction implications of each mode?', a: '<p><b>Append</b> & <b>update</b> evict window state once the watermark passes → <b>bounded</b> state. <b>Complete</b> must keep <b>all</b> result rows to re-emit them every batch, so it <b>never evicts</b> → <b>unbounded</b> state, only safe for small/bounded key spaces. This is the single most important practical difference: complete mode trades memory safety for a fully-materialized output (M10).</p>', tip: 'Append/Update evict → bounded. Complete retains everything → unbounded. The memory trade-off.' },
  { q: 'Which sinks support which output modes?', a: '<p>Depends on the sink. <b>File</b> sinks: <b>append only</b> (can\'t rewrite old files). <b>Kafka</b>: append/update (and complete, with care). <b>foreachBatch</b>/<b>console</b>/<b>memory</b>: all modes. <b>Delta</b>: append and (via <code>foreachBatch</code> + MERGE) effectively upsert. A key design step is matching the mode your query needs to a sink that supports it — e.g. append aggregates to Delta, upserts via foreachBatch (M14, M19).</p>', tip: 'File = append only. Kafka = append/update. foreachBatch/console/memory = all. Match mode to sink.' },
  { q: 'When would you choose update over append for a dashboard?', a: '<p>When you want <b>low-latency, continuously-refreshing</b> results and can tolerate a window\'s value changing as more data arrives. <b>Update</b> emits a window\'s current value every batch it changes — so a dashboard shows the running total <i>now</i>, updated repeatedly, rather than waiting for the window to fully close (as append does). The sink must handle <b>upserts</b> (keyed replace), since the same window is emitted multiple times.</p>', tip: 'Update = live, upsert-keyed, value changes over time. Append = wait for final. Dashboards usually want update.' },
  { q: 'What exactly does "complete mode re-emits everything" mean for a sink?', a: '<p>Every batch the sink receives the <b>full result table</b> — all groups, all current values — not a delta. The sink typically <b>overwrites</b> its target each batch. It\'s simple and always-consistent but <b>O(result size)</b> writes per batch and unbounded state, so it\'s only practical when the result is <b>small and bounded</b> (e.g. "total revenue per ~40 categories"). Never use it for per-user or per-window-over-time results.</p>', tip: 'Complete = full-table overwrite each batch, O(result) writes, unbounded state. Small bounded results only.' },
  { q: 'Can you change the output mode on a running query?', a: '<p>No — like the trigger, you stop and restart (same checkpoint) to change it, provided the new mode is valid for the query. You can\'t hot-swap it. If switching to/from complete changes eviction behavior, be mindful of the state the checkpoint already holds. In practice you decide the mode up front based on the sink and freshness needs.</p>', tip: 'Mode: stop + restart to change (if valid). No hot-swap. Decide up front from sink + freshness.' },
  { q: 'A window emits in append mode — can it ever emit again?', a: '<p>No. In append, a window emits <b>exactly once</b> (at close) and is then <b>evicted</b>; any later-arriving data for that window is <b>dropped by the watermark</b> (it\'s past). That\'s the guarantee append gives downstream: a row, once written, is final and unique. If you need to revise, use update (and an upsert-capable sink).</p>', tip: 'Append window = emits once, evicts, late data dropped. Final + unique downstream. No revisions.' },
  { q: 'Summarize the decision: which mode do I pick?', a: '<p><b>Append</b> — default for aggregations feeding append-only/immutable sinks (files, append tables), when each window\'s final value is what you want. <b>Update</b> — live dashboards / upsert sinks where you want the latest value continuously. <b>Complete</b> — only for <b>small, bounded</b> fully-materialized tables (a handful of keys) where you want the whole picture every batch and don\'t mind re-writing it. Default to append or update; reach for complete rarely.</p>', tip: 'Append=immutable/final sinks, Update=live/upsert, Complete=tiny bounded full tables. Default append/update.' },
];

// Same batches of orders; run all three modes in lockstep, show emitted + sink.
const BATCHES = [
  [{ id: 'a', eventTime: 1, cat: 'books' }, { id: 'b', eventTime: 2, cat: 'toys' }],
  [{ id: 'c', eventTime: 3, cat: 'books' }, { id: 'd', eventTime: 7, cat: 'toys' }],
  [{ id: 'e', eventTime: 8, cat: 'books' }, { id: 'f', eventTime: 12, cat: 'home' }],
  [{ id: 'g', eventTime: 13, cat: 'toys' }, { id: 'h', eventTime: 17, cat: 'books' }],
];
const MODES = ['append', 'update', 'complete'];
const MODE_COLOR = { append: 'var(--green,#10B981)', update: 'var(--blue,#3B82F6)', complete: 'var(--purple,#8B5CF6)' };

function winLabel(w) { return `[${w.start},${w.end})`; }

// Downstream sink contents for a mode after processing up to cursor (inclusive).
function sinkAt(mode, trace, cursor) {
  if (cursor < 0) return [];
  if (mode === 'complete') return trace[cursor].emitted.slice();
  const map = new Map();
  for (let i = 0; i <= cursor; i++) {
    for (const r of trace[i].emitted) map.set(r.key + '|' + winLabel(r.window), r); // upsert
  }
  return [...map.values()];
}

function rowsHtml(rows, highlight) {
  if (!rows.length) return '<div style="color:var(--text-muted);font-size:12px;padding:6px">— empty —</div>';
  const hi = new Set((highlight || []).map((r) => r.key + '|' + winLabel(r.window)));
  return `<table class="ss-tbl"><thead><tr><th>cat</th><th>window</th><th>count</th></tr></thead><tbody>${rows
    .slice()
    .sort((a, b) => String(a.key).localeCompare(b.key) || a.window.start - b.window.start)
    .map((r) => `<tr class="${hi.has(r.key + '|' + winLabel(r.window)) ? 'new' : ''}"><td>${esc(r.key)}</td><td>${winLabel(r.window)}</td><td>${r.value}</td></tr>`)
    .join('')}</tbody></table>`;
}

export function mount(container) {
  injectModStyles();

  const concept = `
  <div class="ss-prose">
    <p>The <b>output mode</b> answers: <i>of my result table, what do I write to the sink each batch?</i> Three choices, each a different contract with downstream.</p>
    <div class="ss-grid">
      <div class="ss-card"><h4 style="color:var(--green)">➕ Append</h4><p>Emit each row <b>once, when final</b> (window closed past the watermark), then evict. Immutable, unique rows. <b>Requires a watermark</b> for aggregations. Bounded state.</p></div>
      <div class="ss-card"><h4 style="color:var(--blue)">🔄 Update</h4><p>Emit <b>only changed rows</b> each batch. The same window re-emits as it grows. Live dashboards; sink must <b>upsert</b>. Bounded state (evicts on watermark).</p></div>
      <div class="ss-card"><h4 style="color:var(--purple)">📋 Complete</h4><p>Emit the <b>whole result table</b> every batch. Simple & always consistent, but <b>never evicts</b> → <b>unbounded state</b>. Small bounded key spaces only.</p></div>
    </div>
    <h3>Valid mode depends on the query</h3>
    <ul>
      <li><b>No aggregation</b> (map/filter) → <b>append only</b> (nothing to update).</li>
      <li><b>Aggregation + watermark</b> → append, update, or complete.</li>
      <li><b>Aggregation, no watermark</b> → update or complete only — <b>append can't be used</b>, because without a watermark no window ever "closes," so there's no moment at which a row is final.</li>
    </ul>
    <div class="ss-callout"><b>Sink compatibility matters:</b> file sinks are <b>append-only</b>; Kafka does append/update; <code>foreachBatch</code>/console/memory do all three; Delta upserts via <code>foreachBatch</code>+MERGE. Match the mode your query needs to a sink that supports it (M14, M19).</div>
  </div>`;

  const interactive = `
  <div class="ss-prose"><p>The same ShopStream orders drive <b>all three modes at once</b> through the real E1 engine. Step the batches: watch what each mode <b>emits this batch</b> (top) vs the accumulated <b>sink table</b> (bottom). Append stays sparse and final; update upserts; complete re-emits everything.</p></div>
  <div class="ss-controls">
    <button class="ss-btn primary" id="m12-step">Next batch ▶</button>
    <button class="ss-btn" id="m12-back">◀ Back</button>
    <button class="ss-btn" id="m12-reset">⟲ Reset</button>
    <span style="font-size:12.5px;color:var(--text-secondary)">Watermark delay = 1, tumbling size 5, count</span>
  </div>
  <div class="ss-metric" style="margin:8px 0"><div class="k">Batch</div><div class="v" id="m12-bi" style="display:inline-block">—</div></div>
  <div class="ss-grid" style="grid-template-columns:1fr 1fr 1fr">
    ${MODES.map((m) => `<div class="ss-card" style="padding:10px">
      <h4 style="color:${MODE_COLOR[m]};text-transform:capitalize">${m}</h4>
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin:6px 0 2px">Emitted this batch</div>
      <div id="m12-emit-${m}"></div>
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--text-muted);margin:8px 0 2px">Sink table (accumulated)</div>
      <div id="m12-sink-${m}"></div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:6px">rows in sink: <b id="m12-cnt-${m}" style="color:${MODE_COLOR[m]}">0</b></div>
    </div>`).join('')}
  </div>
  <div class="ss-callout" id="m12-expl">—</div>`;

  const story = `
  <div class="ss-prose">
    <h3>ShopStream's three outputs, three modes</h3>
    <ul>
      <li><b>Live revenue dashboard</b> → <b>update</b> to a Postgres upsert sink via <code>foreachBatch</code>. Each 5-min window's revenue refreshes every batch so the dashboard shows "now," and the keyed upsert replaces the prior value.</li>
      <li><b>Hourly finance export</b> → <b>append</b> to Delta. Each window is written <b>once</b> when it closes, immutable — the finance team gets exactly one final, auditable row per window.</li>
      <li><b>Top-category leaderboard</b> (≈40 keys) → <b>complete</b> to a small KV table. The whole ranked table is tiny, so re-writing it every batch is cheap and always perfectly consistent.</li>
    </ul>
    <div class="ss-callout">When a junior engineer set the <b>hourly export to complete</b> mode on a <b>per-order-id</b> result, state grew unbounded and the job OOM'd overnight — complete only works when the full result is small. They switched it to append.</div>
  </div>`;

  const code = `
  ${codeBlock('PySpark', `agg = (orders.withWatermark("event_time", "10 minutes")
    .groupBy(window("event_time", "5 minutes"), "category")
    .agg(sum("amount").alias("revenue")))

# Append -> immutable Delta, one final row per window
agg.writeStream.outputMode("append").format("delta") \\
   .option("checkpointLocation", "s3://shopstream/chk/rev_append").start()

# Update -> live dashboard via upsert (foreachBatch keyed MERGE)
agg.writeStream.outputMode("update").foreachBatch(upsert_to_postgres) \\
   .option("checkpointLocation", "s3://shopstream/chk/rev_live").start()

# Complete -> tiny leaderboard, full table re-written each batch
top = orders.groupBy("category").agg(sum("amount").alias("revenue"))
top.writeStream.outputMode("complete").format("memory").queryName("leaderboard").start()`)}
  ${codeBlock('Validity (rejected at start if invalid)', `# append on an aggregation with NO watermark -> ERROR:
# "Append output mode not supported when there are streaming aggregations
#  on streaming DataFrames without watermark"`)}`;

  container.innerHTML = createModuleShell({
    tag: 'M12 · State & Output',
    title: 'Output Modes',
    subtitle: 'Append, update, complete — what each writes, and when each is valid',
    definition: {
      formal: 'The output mode governs which result rows are written to the sink each micro-batch. Append emits each row once when it becomes final (for aggregations, when its window closes past the watermark) then evicts; update emits only rows changed in the batch; complete emits the entire result table every batch and never evicts. Append on a streaming aggregation requires a watermark; mode validity depends on the query shape and sink, and is checked at query start.',
      easy: 'Output mode is what Spark actually sends to your database or files each round. Append sends a finished row just once (and never touches it again). Update sends only what changed, so the same window can be re-sent with a new value — good for a live dashboard. Complete re-sends the entire table every time — simple, but only workable when that table is small. This demo runs all three side by side on the same orders.',
    },
    tabs: [
      { id: 'concept', label: '📖 Concept', content: concept },
      { id: 'demo', label: '📤 Three Modes Live', content: interactive },
      { id: 'story', label: '🛒 ShopStream', content: story },
      { id: 'code', label: '💻 Code', content: code },
      { id: 'iq', label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });
  initTabs(container);
  initIQ(container);

  // Precompute traces for each mode.
  const traces = {};
  for (const m of MODES) {
    traces[m] = new MicroBatchQuery({
      window: { type: 'tumbling', size: 5 }, watermarkDelay: 1, outputMode: m,
      groupBy: 'cat', aggregate: { fn: 'count' },
    }).run(BATCHES).trace;
  }
  let cursor = -1;
  const biEl = container.querySelector('#m12-bi');
  const explEl = container.querySelector('#m12-expl');

  function render() {
    biEl.textContent = cursor < 0 ? '—' : cursor;
    for (const m of MODES) {
      const emitted = cursor < 0 ? [] : traces[m][cursor].emitted;
      const sink = sinkAt(m, traces[m], cursor);
      container.querySelector(`#m12-emit-${m}`).innerHTML = rowsHtml(emitted, emitted);
      container.querySelector(`#m12-sink-${m}`).innerHTML = rowsHtml(sink, emitted);
      container.querySelector(`#m12-cnt-${m}`).textContent = sink.length;
    }
    if (cursor < 0) { explEl.innerHTML = 'Press <b>Next batch ▶</b> to feed the first batch into all three modes.'; return; }
    const ap = sinkAt('append', traces.append, cursor).length;
    const up = sinkAt('update', traces.update, cursor).length;
    const co = traces.complete[cursor].emitted.length;
    explEl.innerHTML =
      `<b>After batch ${cursor}:</b> <span style="color:${MODE_COLOR.append}">append</span> sink holds <b>${ap}</b> final rows (only closed windows), `
      + `<span style="color:${MODE_COLOR.update}">update</span> sink holds <b>${up}</b> rows (every window seen, upserted to its latest value), `
      + `<span style="color:${MODE_COLOR.complete}">complete</span> re-emitted the whole <b>${co}</b>-row table this batch. `
      + `Notice append only grows when a window <i>closes</i>; complete carries every open window forever (unbounded).`;
  }

  container.querySelector('#m12-step').addEventListener('click', () => { if (cursor < BATCHES.length - 1) { cursor++; render(); } });
  container.querySelector('#m12-back').addEventListener('click', () => { if (cursor >= 0) { cursor--; render(); } });
  container.querySelector('#m12-reset').addEventListener('click', () => { cursor = -1; render(); });
  render();
}

export default { mount };
