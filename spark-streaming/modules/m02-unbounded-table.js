// M02 · The Unbounded Table — Foundation
import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { injectModStyles, codeBlock } from './_mod-ui.js';

export const IQ = [
  { q: 'Explain the "unbounded table" model of Structured Streaming.', a: '<p>Every record that arrives is conceptually a new <b>row appended to an unbounded input table</b>. Your query defines a <b>result table</b> as a view over that input. As new rows arrive, Spark <b>incrementally updates the result table</b> and writes the change to the sink according to the output mode. You reason about it exactly like a batch query — the engine handles doing it incrementally.</p>', tip: 'Draw it: input table grows downward; result table is a derived view; sink receives the delta. This picture answers half of all "how does it work" questions.' },
  { q: 'Does Spark actually store the whole unbounded input table?', a: '<p>No — that is the <b>conceptual</b> model. Spark only keeps the <b>state</b> needed to maintain the result incrementally (e.g. running aggregates per key/window, join buffers), bounded by the <b>watermark</b>. Raw input rows are not retained; they live in the replayable source (Kafka). Confusing the mental model with real storage is a common mistake.</p>', tip: 'Emphasize: "conceptually unbounded, physically just bounded state + the offset log." Watermarks are what keep state finite.' },
  { q: 'What is the "result table" and how does it relate to output modes?', a: '<p>The result table is the full answer if you recomputed the query over all input so far. The <b>output mode</b> decides what portion of it is written each trigger: <b>complete</b> writes the entire result table; <b>append</b> writes only new, now-final rows; <b>update</b> writes only rows that changed this batch. The result table is the shared abstraction all three modes derive from.</p>', tip: 'Tie result table → output mode explicitly; interviewers love when you connect the two concepts.' },
  { q: 'What does "incremental execution" mean here?', a: '<p>Instead of recomputing the query from scratch over all data each trigger, Spark reads <b>only the new input</b> since the last offset, updates the <b>state</b>, and produces the <b>delta</b> to the result. This is what makes streaming tractable: cost per trigger scales with <b>new data + live state</b>, not with total history.</p>', tip: 'Contrast with naive "re-run the batch query every second," which would be O(all history) — incremental execution is the whole trick.' },
  { q: 'Why is the batch = stream unification valuable beyond convenience?', a: '<p>Correctness and reuse. The same operator means the same thing on bounded and unbounded input, so a <b>backfill and the live job share code</b> and semantics. It also lets Catalyst optimize streaming queries with batch machinery, and it makes a <b>Kappa-style</b> single pipeline feasible instead of maintaining separate batch and speed layers (Lambda).</p>', tip: 'Mention Lambda vs Kappa — unification is the technical basis for collapsing them.' },
  { q: 'If the input table is append-only, how do updates/deletes (CDC) fit?', a: '<p>The <b>stream</b> is append-only (each change is a new row: an insert/update/delete <i>event</i>). Your query interprets those events — e.g. keep the latest per key, or apply them with <code>foreachBatch</code> + a Delta <b>MERGE</b> so the <b>sink table</b> reflects updates and deletes. The append-only input models the change log; the materialized table is derived (M13, M19).</p>', tip: 'Key distinction: the stream is a changelog (append-only); the destination table can still be mutable via MERGE.' },
  { q: 'How does a record flow from the input table to the sink?', a: '<p>Source appends rows (offsets) → the trigger forms a micro-batch of new rows → transformations + stateful operators update the <b>state store</b> → the <b>result table</b> delta is computed → the sink writes it under the output mode → progress (offsets + commit) is recorded in the checkpoint. Next trigger repeats from the new offset.</p>', tip: 'Being able to narrate this path end-to-end (source→state→result→sink→checkpoint) is a strong signal.' },
  { q: 'Can two queries read the same source "table" independently?', a: '<p>Yes. Each <code>writeStream...start()</code> is an independent query with its <b>own checkpoint, offsets and state</b>. Two queries subscribed to the same Kafka topic each track their own progress. They do not share state; if you want shared intermediate results you must materialize them (e.g. to Kafka or Delta) and read that.</p>', tip: 'Common design question: "one big query vs several" — separate queries = independent failure/scaling/checkpoints but duplicated reads.' },
  { q: 'What bounds the size of the state the engine keeps?', a: '<p>The <b>watermark</b>. For event-time windows and stateful ops, once the watermark passes a window/key, its state is <b>evicted</b>. Without a watermark, stateful aggregations keep state <b>forever</b> (unbounded growth → OOM). So the unbounded-table model stays physically bounded only because watermarks expire old state (M08, M10).</p>', tip: 'If asked "what keeps state from growing forever," the one-word answer is watermark.' },
  { q: 'How is this different from a materialized view in a database?', a: '<p>Very similar in spirit — a continuously maintained view over changing input. The differences: Structured Streaming runs on a <b>distributed compute engine</b> with explicit <b>event-time + watermark</b> semantics, pluggable <b>sources/sinks</b>, and <b>exactly-once</b> via its own checkpointing, rather than being tied to one database. The "incrementally maintained view" analogy is a good one to offer.</p>', tip: 'Offering the materialized-view analogy proactively shows conceptual maturity.' },
  { q: 'Walk me through what happens on the very first trigger of a new query.', a: '<p>Spark resolves <code>startingOffsets</code> (default <code>latest</code> for Kafka), reads the available new rows into the first micro-batch, runs the query, initializes <b>state</b> (empty), computes the result delta, writes it, and records the committed offsets. The watermark starts effectively at −∞, so nothing is "late" yet and nothing is evicted.</p>', tip: 'Mention startingOffsets (latest vs earliest) — a frequent follow-up that trips people up on the first run.' },
];

const ORDERS = [
  { t: '12:00:02', cat: 'books', amt: 18 },
  { t: '12:00:05', cat: 'games', amt: 60 },
  { t: '12:00:07', cat: 'books', amt: 12 },
  { t: '12:00:11', cat: 'phones', amt: 799 },
  { t: '12:00:14', cat: 'games', amt: 45 },
  { t: '12:00:19', cat: 'books', amt: 9 },
  { t: '12:00:23', cat: 'phones', amt: 699 },
  { t: '12:00:27', cat: 'games', amt: 30 },
];

export function mount(container) {
  injectModStyles();

  const concept = `
  <div class="ss-prose">
    <p>The single idea that makes Structured Streaming click: <b>a data stream is an append-only table that never stops growing.</b></p>
    <ul>
      <li>Each arriving record = one new <b>row</b> appended to the <b>Input Table</b>.</li>
      <li>Your query defines the <b>Result Table</b> as a <b>view</b> over the Input Table.</li>
      <li>On every trigger, Spark <b>incrementally</b> updates the Result Table and writes the change to the sink.</li>
    </ul>
    <p>You never write "streaming logic" — you write a query over a table, and Spark is responsible for keeping that query's answer current as the table grows. Because the semantics equal batch, a <b>backfill and the live job are the same code</b>.</p>
    <h3>Conceptual vs physical</h3>
    <p>"Unbounded table" is a <b>mental model</b>, not storage. Spark keeps only the <b>state</b> needed to maintain the result (running aggregates, join buffers), kept finite by the <b>watermark</b>. Raw rows stay in the replayable source (Kafka), not in Spark.</p>
    <div class="ss-callout">Result Table + <b>output mode</b> = what the sink sees. <b>Complete</b> = whole table; <b>append</b> = only new final rows; <b>update</b> = only changed rows (M12).</div>
  </div>`;

  const interactive = `
  <div class="ss-prose"><p>Append ShopStream orders and watch the <b>Input Table</b> grow while the <b>Result Table</b> (revenue per category) is incrementally recomputed as a view. This is the whole model in one picture.</p></div>
  <div class="ss-controls">
    <button class="ss-btn primary" id="m02-add">+ Append next order</button>
    <button class="ss-btn" id="m02-auto">▶ Auto</button>
    <button class="ss-btn" id="m02-reset">⟲ Reset</button>
    <span style="font-size:12.5px;color:var(--text-muted)">Query: <code style="font-family:var(--font-mono)">SELECT category, SUM(amount) GROUP BY category</code></span>
  </div>
  <div class="ss-grid">
    <div class="ss-card">
      <h4>Input Table <span style="font-weight:400;color:var(--text-muted);font-size:11px">(append-only, unbounded)</span></h4>
      <div style="max-height:260px;overflow:auto"><table class="ss-tbl" id="m02-input"><thead><tr><th>event_time</th><th>category</th><th>amount</th></tr></thead><tbody></tbody></table></div>
    </div>
    <div class="ss-card">
      <h4>Result Table <span style="font-weight:400;color:var(--text-muted);font-size:11px">(a view, kept current)</span></h4>
      <table class="ss-tbl" id="m02-result"><thead><tr><th>category</th><th>orders</th><th>revenue</th></tr></thead><tbody></tbody></table>
      <div style="margin-top:8px;font-size:11.5px;color:var(--text-muted)">Rows appended: <b id="m02-n" style="font-family:var(--font-mono);color:var(--text-primary)">0</b> · State kept: <b id="m02-s" style="font-family:var(--font-mono);color:var(--text-primary)">0</b> groups</div>
    </div>
  </div>
  <div class="ss-caption">Note the asymmetry: the Input Table grows without bound, but the Result Table (and the <b>state</b> Spark actually stores) stays small — one row per category. That is why streaming aggregation is cheap even over huge input.</div>`;

  const story = `
  <div class="ss-prose">
    <h3>ShopStream as one ever-growing table</h3>
    <p>Every order and click ShopStream emits is a row appended to its respective input table. The ops team's "revenue by category" board is literally a <b>Result Table view</b> over the orders input — Spark keeps it live. The fraud model, the session view, the Delta lakehouse: each is another view over the same append-only inputs.</p>
    <p>Because the input is modeled as a changelog, <b>order amendments and cancellations</b> arrive as new rows too (an update/cancel <i>event</i>), and M13/M19 show how to resolve them into the final mutable orders table via dedup and <code>MERGE</code>.</p>
    <div class="ss-callout">One source table, many views: revenue, sessions, fraud, lakehouse — each an independent query with its <b>own checkpoint and state</b>, all reading the same ShopStream topics.</div>
  </div>`;

  const code = `
  <div class="ss-prose"><p>The query is pure DataFrame/SQL — identical to how you'd write it on a static table. <code>readStream</code> is the only hint that the input is unbounded.</p></div>
  ${codeBlock('PySpark', `# Input Table: the unbounded stream of orders
orders = (spark.readStream.format("kafka")
    .option("subscribe", "shopstream.orders").load())
orders = parse_orders(orders)   # -> event_time, category, amount

# Result Table: a view defined by a batch-style query
revenue = (orders.groupBy("category")
    .agg(count("*").alias("orders"), sum("amount").alias("revenue")))

# Spark keeps the Result Table current, trigger by trigger
(revenue.writeStream
    .outputMode("complete")             # emit the whole Result Table each batch
    .format("console")
    .option("checkpointLocation", "/chk/revenue-by-cat")
    .start())`)}
  ${codeBlock('SQL (same view, batch or stream)', `SELECT category, COUNT(*) AS orders, SUM(amount) AS revenue
FROM   orders
GROUP  BY category;
-- Identical logic whether 'orders' is a bounded table (backfill)
-- or an unbounded stream (live). That is the unification.`)}`;

  container.innerHTML = createModuleShell({
    tag: 'M02 · Foundation',
    title: 'The Unbounded Table',
    subtitle: 'A stream as an append-only input table, your query as a continuously-maintained view',
    definition: {
      formal: 'Structured Streaming models a stream as an unbounded Input Table to which each new record appends a row. A streaming query defines a Result Table as a view over that input; on every trigger the engine incrementally updates the Result Table and emits the change to the sink per the output mode.',
      easy: 'Imagine a table that keeps growing as data arrives. Your query is just a view on that table, and Spark keeps the view up to date automatically — you never hand-write the "streaming" part.',
    },
    tabs: [
      { id: 'concept', label: '📖 Concept', content: concept },
      { id: 'demo', label: '🧮 Input → Result', content: interactive },
      { id: 'story', label: '🛒 ShopStream', content: story },
      { id: 'code', label: '💻 Code', content: code },
      { id: 'iq', label: '🎯 Interview Q&A', content: createIQSection(IQ) },
    ],
  });
  initTabs(container);
  initIQ(container);

  // Incremental table demo
  const inBody = container.querySelector('#m02-input tbody');
  const resBody = container.querySelector('#m02-result tbody');
  const nEl = container.querySelector('#m02-n'), sEl = container.querySelector('#m02-s');
  let i = 0, timer = null;
  const state = new Map(); // cat -> {n, rev}

  function render() {
    // result
    resBody.innerHTML = [...state.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([cat, v]) => `<tr><td>${cat}</td><td>${v.n}</td><td>$${v.rev}</td></tr>`).join('');
    nEl.textContent = i; sEl.textContent = state.size;
  }
  function addOne() {
    if (i >= ORDERS.length) { stopAuto(); return; }
    const o = ORDERS[i++];
    const tr = document.createElement('tr');
    tr.className = 'new';
    tr.innerHTML = `<td>${o.t}</td><td>${o.cat}</td><td>$${o.amt}</td>`;
    inBody.appendChild(tr);
    setTimeout(() => tr.classList.remove('new'), 500);
    const cur = state.get(o.cat) || { n: 0, rev: 0 };
    cur.n++; cur.rev += o.amt; state.set(o.cat, cur);
    render();
  }
  function stopAuto() { if (timer) { clearInterval(timer); timer = null; } container.querySelector('#m02-auto').textContent = '▶ Auto'; }
  function reset() { stopAuto(); i = 0; state.clear(); inBody.innerHTML = ''; render(); }

  container.querySelector('#m02-add').addEventListener('click', addOne);
  container.querySelector('#m02-auto').addEventListener('click', (e) => {
    if (timer) { stopAuto(); return; }
    if (i >= ORDERS.length) reset();
    e.target.textContent = '⏸ Pause'; timer = setInterval(addOne, 900);
  });
  container.querySelector('#m02-reset').addEventListener('click', reset);
  render();

  return () => stopAuto();
}

export default { mount };
