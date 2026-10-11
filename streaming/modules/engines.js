// Gate 6 — Cross-cutting engines (I59–I65). One hub + seven interactive tools:
//  eng-graph    I59 Concept graph
//  eng-compare  I60 Comparison matrix
//  eng-trace    I61 Trace One Event
//  eng-break    I62 Break the Pipeline (predict-then-reveal)
//  eng-builder  I63 Architecture Builder (requirement-checked)
//  eng-decide   I64 Technology Decision Engine
//  eng-capacity I65 Capacity calculator (stated assumptions)
// Facts reuse what was validated for the cloud gates; Kafka/Flink claims are
// stated carefully (never overstate exactly-once, no invented benchmarks).
import { getScenario } from '../data/scenarios.js';
import { compareTable, flowDiagram, iqSection, callout } from '../components/lesson-shell.js';
import { setupCanvas, clear, roundRect, C, metricsPanel, controlRow, btn, slider } from '../components/sim-ui.js';

const TOOLS = [
  { id: 'eng-graph',    icon: '🕸️', title: 'Concept graph',        idea: 'How every streaming concept connects — click a node to explore.' },
  { id: 'eng-compare',  icon: '📊', title: 'Comparison matrix',    idea: 'Kafka · Flink · Kinesis · Event Hubs · Databricks, side by side.' },
  { id: 'eng-trace',    icon: '🔎', title: 'Trace One Event',      idea: 'Step one event through your pipeline, stage by stage.' },
  { id: 'eng-break',    icon: '💥', title: 'Break the Pipeline',   idea: 'Inject a fault, predict the symptom, reveal the fix.' },
  { id: 'eng-builder',  icon: '🏗️', title: 'Architecture Builder', idea: 'Assemble a pipeline; get it checked against requirements.' },
  { id: 'eng-decide',   icon: '🧭', title: 'Decision Engine',      idea: 'Answer a few questions → a justified technology pick.' },
  { id: 'eng-capacity', icon: '🧮', title: 'Capacity calculator',  idea: 'Throughput, storage, partitions — with assumptions shown.' },
];
export const ENGINE_TOOL_IDS = TOOLS.map(t => t.id);

export async function mount(container, id) {
  if (id === 'engines' || !id) return hub(container);
  const tool = RENDER[id];
  if (!tool) { container.innerHTML = `<div class="card">Unknown tool.</div>`; return; }
  return tool(container);
}

function hub(container) {
  const sc = getScenario();
  container.innerHTML = `
    <div class="page-head">
      <div class="page-eyebrow">Build</div>
      <h1 class="page-title">⚙️ Compare & Engines</h1>
      <p class="page-sub">Seven cross-cutting tools that tie every technology and concept together — a graph,
        a comparison matrix, and five interactive engines, all framed by your active scenario.</p>
    </div>
    <div class="scenario-banner"><span class="sb-ico">${sc.icon}</span>
      <div class="sb-body">Framed by the <b>${sc.name}</b> scenario (${sc.canonicalId}, keyed on <b>${sc.keyField}</b>).
        Switch scenarios any time — the trace, builder, and calculator all re-frame.</div></div>
    <div class="fnd-grid">
      ${TOOLS.map((t, i) => `
        <div class="card fnd-card" data-go="${t.id}">
          <span class="fnd-num">${String(i + 1).padStart(2, '0')}</span>
          <div><h3>${t.icon} ${t.title}</h3><p>${t.idea}</p></div>
        </div>`).join('')}
    </div>`;
  container.querySelectorAll('[data-go]').forEach(c => c.addEventListener('click', () => { location.hash = '#' + c.dataset.go; }));
}

// Shared tool chrome: title + back link; returns the body host element.
function toolShell(container, icon, title, sub) {
  container.innerHTML = `
    <div class="page-head">
      <div class="page-eyebrow"><a href="#engines" style="color:var(--text3)">Compare & Engines</a></div>
      <h1 class="page-title">${icon} ${title}</h1>
      <p class="page-sub">${sub}</p>
    </div>
    <div id="eng-body"></div>
    <div class="lx-nav"><div><button class="btn" data-go="engines">← All engines</button></div></div>`;
  container.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { location.hash = '#' + b.dataset.go; }));
  return container.querySelector('#eng-body');
}

// ───────────────────────────────────────────────────────────────── I59 graph
function renderGraph(container) {
  const host = toolShell(container, '🕸️', 'Concept graph', 'Every core streaming concept and how it depends on the others. Click a node to see what it is and where to learn it.');
  // Fixed layout (x,y in a 0..1 space), grouped by layer.
  const N = {
    event:      { x: .10, y: .20, label: 'Event',            grp: 'ingest' },
    partition:  { x: .28, y: .10, label: 'Partition/Shard',  grp: 'ingest' },
    key:        { x: .28, y: .32, label: 'Partition key',    grp: 'ingest' },
    offset:     { x: .46, y: .18, label: 'Offset',           grp: 'ingest' },
    etime:      { x: .14, y: .55, label: 'Event time',       grp: 'time' },
    watermark:  { x: .34, y: .62, label: 'Watermark',        grp: 'time' },
    window:     { x: .54, y: .55, label: 'Window',           grp: 'time' },
    state:      { x: .56, y: .80, label: 'State',            grp: 'state' },
    checkpoint: { x: .76, y: .80, label: 'Checkpoint',       grp: 'state' },
    delivery:   { x: .74, y: .40, label: 'Delivery guarantee', grp: 'guarantees' },
    backpress:  { x: .90, y: .60, label: 'Backpressure',     grp: 'ops' },
    cgroup:     { x: .64, y: .16, label: 'Consumer group',   grp: 'ingest' },
  };
  const E = [
    ['event', 'partition'], ['key', 'partition'], ['partition', 'offset'],
    ['offset', 'cgroup'], ['event', 'etime'], ['etime', 'watermark'],
    ['watermark', 'window'], ['window', 'state'], ['state', 'checkpoint'],
    ['checkpoint', 'delivery'], ['offset', 'delivery'], ['cgroup', 'backpress'],
    ['window', 'backpress'], ['key', 'state'],
  ];
  const INFO = {
    event: ['An immutable record of something that happened — the atom of streaming.', 'f01'],
    partition: ['The unit of parallelism and ordering: order is guaranteed within a partition/shard, not across.', 'f03'],
    key: ['Chooses the partition; same key → same partition → preserved per-key order.', 'f03'],
    offset: ['A monotonic position in a partition; lets consumers track progress and replay.', 'f04'],
    cgroup: ['A set of consumers sharing partitions to scale out; each partition goes to one member.', 'kafka'],
    etime: ['When the event actually happened (vs processing time, when it is seen).', 'f06'],
    watermark: ['A moving threshold = max event time − allowed lateness; bounds state and closes windows.', 'f07'],
    window: ['Groups events over time (tumbling/sliding/session) so unbounded streams yield finite results.', 'f08'],
    state: ['What a stateful operator remembers between events (counts, join buffers, dedup sets).', 'f09'],
    checkpoint: ['A consistent snapshot of offsets + state enabling exactly-once-capable recovery.', 'f10'],
    delivery: ['At-most / at-least / effectively-once — a property of source + engine + sink together.', 'f11'],
    backpress: ['When input outpaces processing, lag grows; a healthy system slows ingestion to match.', 'f12'],
  };
  const GRP = { ingest: C.cyan2, time: C.wm, state: C.keyB, guarantees: C.ok, ops: C.err };
  host.innerHTML = `<canvas id="g-cv" style="cursor:pointer"></canvas>
    <div id="g-info" class="card" style="margin-top:6px"><p style="color:var(--text2);margin:0">Click any node to see what it means and jump to the module that teaches it.</p></div>`;
  const cv = host.querySelector('#g-cv');
  let W, H, R = 30, pts = {};
  function draw(hl) {
    const r = setupCanvas(cv, host.clientWidth - 4, 440); W = r.w; H = r.h; const ctx = r.ctx;
    clear(ctx, W, H);
    pts = {}; for (const k in N) pts[k] = { x: 30 + N[k].x * (W - 60), y: 20 + N[k].y * (H - 40) };
    ctx.lineWidth = 1.5;
    for (const [a, b] of E) { ctx.strokeStyle = 'rgba(148,163,184,.35)'; ctx.beginPath(); ctx.moveTo(pts[a].x, pts[a].y); ctx.lineTo(pts[b].x, pts[b].y); ctx.stroke(); }
    for (const k in N) {
      const p = pts[k], col = GRP[N[k].grp] || C.cyan2, on = k === hl;
      ctx.fillStyle = on ? col : 'rgba(15,23,42,.9)'; ctx.strokeStyle = col; ctx.lineWidth = on ? 3 : 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = on ? '#06121f' : C.textHi; ctx.font = `${on ? 'bold ' : ''}11px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const words = N[k].label.split(' '); words.forEach((w, i) => ctx.fillText(w, p.x, p.y - (words.length - 1) * 6 + i * 12));
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
  draw(null);
  cv.addEventListener('click', (ev) => {
    const rect = cv.getBoundingClientRect(); const mx = ev.clientX - rect.left, my = ev.clientY - rect.top;
    for (const k in pts) { if (Math.hypot(mx - pts[k].x, my - pts[k].y) <= R) {
      draw(k); const [desc, mod] = INFO[k] || ['', null];
      host.querySelector('#g-info').innerHTML = `<h3 style="margin:0 0 6px">${N[k].label}</h3>
        <p style="color:var(--text2);margin:0 0 10px">${desc}</p>
        ${mod ? `<button class="btn primary" data-go="${mod}" style="font-size:13px">Learn this →</button>` : ''}`;
      host.querySelector('[data-go]')?.addEventListener('click', e => { location.hash = '#' + e.target.dataset.go; });
      return; } }
  });
  const onResize = () => draw(null); window.addEventListener('resize', onResize);
  return () => window.removeEventListener('resize', onResize);
}

// ─────────────────────────────────────────────────────────────── I60 compare
function renderCompare(container) {
  const host = toolShell(container, '📊', 'Comparison matrix', 'The five technologies in this lab, compared on the dimensions that actually decide an architecture. Claims are stated carefully — exactly-once is never overstated.');
  const COLS = ['Dimension', 'Apache Kafka', 'Apache Flink', 'Kinesis Data Streams', 'Azure Event Hubs', 'Databricks Structured Streaming'];
  const ROWS = [
    ['Primary role', 'Durable log / broker', 'Stream processor', 'Managed log', 'Managed log', 'Processor + lakehouse'],
    ['Processing model', 'Storage (pub/sub); Kafka Streams for compute', 'Native per-event streaming', 'Storage (process in consumer)', 'Storage (process downstream)', 'Micro-batch by default'],
    ['Unit of scale', 'Partitions', 'Parallelism / task slots', 'Shards (1 MB/s in each)', 'Throughput Units + partitions', 'Cluster workers / Spark tasks'],
    ['Ordering', 'Per partition', 'Per key (keyed streams)', 'Per shard', 'Per partition', 'Per key within state'],
    ['Managed state', 'Only via Kafka Streams', 'Yes — keyed state (RocksDB)', 'No', 'No', 'Yes — state store (RocksDB option)'],
    ['Windowing', 'Kafka Streams only', 'Rich: tumbling/sliding/session', 'None (do it yourself)', 'Via Stream Analytics', 'Tumbling/sliding/session'],
    ['Delivery semantics', 'At-least-once; EOS for read-process-write', 'Exactly-once within pipeline + compatible sinks', 'At-least-once (dedupe yourself)', 'At-least-once', 'Exactly-once Delta-to-Delta; else at-least-once'],
    ['Typical latency', 'ms (broker)', 'Low (per-event)', 'Sub-second–seconds', 'Sub-second–seconds', 'Seconds (micro-batch); lower in real-time mode'],
    ['Operational model', 'Self-managed or MSK', 'Self or Managed Service for Apache Flink', 'Fully managed', 'Fully managed', 'Fully managed'],
  ];
  host.innerHTML = `
    ${controlRow(TOOLS ? `<label class="sim-slider" style="min-width:220px"><span>Highlight row</span>
      <select id="cmp-row" style="background:var(--bg3);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:6px">
        <option value="-1">— none —</option>${ROWS.map((r, i) => `<option value="${i}">${r[0]}</option>`).join('')}
      </select></label>` : '')}
    <div id="cmp-tbl">${compareTable(COLS, ROWS)}</div>
    ${callout('info', 'How to read this', 'Kafka and the cloud brokers are <b>logs</b> — they store and move data. Flink and Databricks are <b>processors</b> — they transform it. Many real systems combine one of each (e.g. Kafka → Flink, or Event Hubs → Databricks).')}
    ${iqSection([
      { q: 'Is Kafka an alternative to Flink?', a: 'Not really — they solve different problems. <b>Kafka</b> is a durable log (storage + transport); <b>Flink</b> is a stateful stream processor. They are complementary: a very common architecture is Kafka as the log feeding Flink as the processor. Kafka Streams exists for lighter in-Kafka processing, but it is not Flink\'s equal for complex stateful jobs.' },
      { q: 'Which gives true exactly-once?', a: 'Each gives exactly-once <b>only under conditions</b>. Kafka: exactly-once for read-process-write <i>within Kafka</i> via idempotent + transactional producers. Flink: exactly-once <i>within the pipeline</i> via checkpoints, and end-to-end only with compatible (transactional/idempotent) sinks. Databricks: exactly-once <b>Delta-to-Delta</b>; a non-Delta/foreachBatch sink is at-least-once unless you add idempotency. Kinesis/Event Hubs deliver at-least-once — you dedupe downstream.' },
      { q: 'When would you pick a managed log over self-hosted Kafka?', a: 'When you want to avoid broker operations and your scale/ecosystem needs fit the managed service. Kinesis and Event Hubs remove capacity/patching work; MSK gives managed Kafka if you need the Kafka API/ecosystem. Self-hosted Kafka wins on control, portability, and avoiding per-throughput cloud pricing at very large scale.' },
    ])}`;
  const sel = host.querySelector('#cmp-row');
  sel?.addEventListener('change', () => {
    const i = +sel.value;
    host.querySelectorAll('#cmp-tbl tbody tr').forEach((tr, idx) => { tr.style.background = idx === i ? 'var(--accent-lo)' : ''; });
  });
  return () => {};
}

// ───────────────────────────────────────────────────────────────── I61 trace
function renderTrace(container) {
  const sc = getScenario();
  const host = toolShell(container, '🔎', 'Trace One Event', `Follow a single ${sc.entity} event (${sc.canonicalId}) through the pipeline, one stage at a time — see what each stage does and what state it holds.`);
  const stages = sc.pipeline;
  // What happens at each stage (generic but scenario-aware narration).
  const NARR = stages.map((s, i) => {
    if (i === 0) return `The ${sc.entity} originates here and is emitted as an event keyed on <code>${sc.keyField}</code>.`;
    if (/ingest/i.test(s)) return `Ingest assigns the event to a partition by hashing <code>${sc.keyField}</code>, appends it to the log, and returns an offset.`;
    if (/engine/i.test(s)) return `The stream engine reads the event in offset order, updates keyed state for <code>${sc.keyField}</code>, and advances the watermark.`;
    if (/fraud/i.test(s)) return `Fraud scoring joins recent per-<code>${sc.keyField}</code> state against rules within a bounded time window.`;
    if (/warehouse/i.test(s)) return `The enriched event is written to the warehouse/lakehouse for analytics — exactly-once if the sink is transactional.`;
    return `The event is processed at the <b>${s}</b> stage and passed downstream.`;
  });
  let i = 0;
  host.innerHTML = `
    ${controlRow(btn('tr-prev', '← Back') + btn('tr-next', 'Advance ▶', true) + btn('tr-reset', '↺ Restart'))}
    <canvas id="tr-cv"></canvas>
    <div id="tr-narr" class="card" style="margin-top:4px"></div>`;
  const cv = host.querySelector('#tr-cv');
  function draw() {
    const r = setupCanvas(cv, host.clientWidth - 4, 150); const ctx = r.ctx; clear(ctx, r.w, r.h);
    const n = stages.length, gap = (r.w - 40) / n, y = 60;
    stages.forEach((s, idx) => {
      const x = 20 + gap * idx + gap / 2, on = idx === i, done = idx < i;
      ctx.fillStyle = on ? C.cyan2 : (done ? 'rgba(16,185,129,.25)' : 'rgba(15,23,42,.9)');
      ctx.strokeStyle = on ? C.cyan2 : (done ? C.ok : C.axis); ctx.lineWidth = on ? 3 : 1.5;
      roundRect(ctx, x - gap / 2 + 8, y - 22, gap - 16, 44, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = on ? '#06121f' : C.textHi; ctx.font = `${on ? 'bold ' : ''}10px sans-serif`; ctx.textAlign = 'center';
      const words = s.split(' '); words.forEach((w, wi) => ctx.fillText(w, x, y - (words.length - 1) * 6 + wi * 12));
      if (idx < n - 1) { ctx.strokeStyle = C.axis; ctx.beginPath(); ctx.moveTo(x + gap / 2 - 8, y); ctx.lineTo(x + gap / 2 + 8, y); ctx.stroke(); }
    });
    ctx.textAlign = 'left';
    host.querySelector('#tr-narr').innerHTML = `<div style="font-size:12px;color:var(--text3);margin-bottom:6px">Stage ${i + 1} / ${stages.length} — <b style="color:var(--accent2)">${stages[i]}</b></div>
      <p style="margin:0;color:var(--text2)">${NARR[i]}</p>`;
  }
  draw();
  host.querySelector('#tr-next').addEventListener('click', () => { if (i < stages.length - 1) { i++; draw(); } });
  host.querySelector('#tr-prev').addEventListener('click', () => { if (i > 0) { i--; draw(); } });
  host.querySelector('#tr-reset').addEventListener('click', () => { i = 0; draw(); });
  const onResize = () => draw(); window.addEventListener('resize', onResize);
  return () => window.removeEventListener('resize', onResize);
}

// ───────────────────────────────────────────────────────────────── I62 break
function renderBreak(container) {
  const sc = getScenario();
  const host = toolShell(container, '💥', 'Break the Pipeline', 'Pick a fault. Predict what you think happens before revealing the real symptom and the fix. This is how incident intuition is built.');
  const FAULTS = [
    { id: 'nowm', t: 'Remove the watermark', symptom: 'Windowed aggregations never finalize in append mode (the engine can\'t decide a window is done) and <b>state grows without bound</b> until the job OOMs.', fix: 'Declare a watermark (<code>withWatermark</code>) so windows close and old state is evicted.' },
    { id: 'nockpt', t: 'Delete the checkpoint', symptom: 'On restart the job has no memory of offsets or state — it <b>reprocesses from scratch or loses progress</b>, breaking exactly-once and producing duplicates or gaps.', fix: 'Always configure a durable, per-query checkpoint location; never share one between queries.' },
    { id: 'skew', t: `Route all ${sc.entity}s to one ${sc.keyField}`, symptom: 'One partition/key becomes a <b>hot shard</b>: that consumer lags while others idle — throughput collapses to a single core.', fix: 'Choose a higher-cardinality key or add a salt; rebalance partitions so load spreads.' },
    { id: 'slowcons', t: 'Make the consumer slower than input', symptom: 'Consumer <b>lag grows monotonically</b>; end-to-end latency climbs; eventually retention may drop unread data.', fix: 'Scale out consumers/parallelism, optimize the hot path, or apply backpressure to the source.' },
    { id: 'nonidem', t: 'Use a non-idempotent sink with retries', symptom: 'A replayed batch after failure <b>double-writes</b> — at-least-once leaks become visible duplicates downstream.', fix: 'Make the sink idempotent/transactional (e.g. Delta, or dedupe on a batch/event id).' },
    { id: 'rebalance', t: 'Add consumers mid-stream (rebalance storm)', symptom: 'Frequent group <b>rebalances pause consumption</b> and can reprocess some records, spiking latency.', fix: 'Use static membership / cooperative rebalancing and avoid flapping consumers.' },
  ];
  host.innerHTML = `
    ${controlRow(`<label class="sim-slider" style="min-width:280px"><span>Fault to inject</span>
      <select id="bk-sel" style="background:var(--bg3);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:6px">
        ${FAULTS.map(f => `<option value="${f.id}">${f.t}</option>`).join('')}</select></label>`)}
    <div class="card"><div style="font-size:12px;color:var(--text3);margin-bottom:6px">1 · Predict — what do you think breaks?</div>
      <textarea id="bk-guess" placeholder="Type your prediction…" style="width:100%;min-height:60px;background:var(--bg3);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:10px;font:inherit"></textarea>
      <div style="margin-top:10px">${btn('bk-reveal', 'Reveal the symptom & fix', true)}</div>
    </div>
    <div id="bk-ans"></div>`;
  const sel = host.querySelector('#bk-sel');
  host.querySelector('#bk-reveal').addEventListener('click', () => {
    const f = FAULTS.find(x => x.id === sel.value);
    host.querySelector('#bk-ans').innerHTML = `
      ${callout('danger', '💥 Symptom', f.symptom)}
      ${callout('ok', '🛠️ Fix', f.fix)}`;
  });
  sel.addEventListener('change', () => { host.querySelector('#bk-ans').innerHTML = ''; });
  return () => {};
}

// ─────────────────────────────────────────────────────────────── I63 builder
function renderBuilder(container) {
  const sc = getScenario();
  const host = toolShell(container, '🏗️', 'Architecture Builder', 'Pick a source, a processor, and a sink, then set your requirements. The builder checks whether your choices actually satisfy them.');
  const SRC = { kafka: 'Apache Kafka', kinesis: 'Kinesis Data Streams', eventhubs: 'Azure Event Hubs', autoloader: 'Auto Loader (files)' };
  const PROC = { flink: 'Apache Flink', dbx: 'Databricks Structured Streaming', kstreams: 'Kafka Streams', lambda: 'AWS Lambda' };
  const SINK = { delta: 'Delta Lake', s3: 'S3 / object store', warehouse: 'Data warehouse', nosql: 'Key-value store' };
  const opt = (o) => Object.entries(o).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
  host.innerHTML = `
    ${controlRow(`
      <label class="sim-slider"><span>Source</span><select id="b-src" style="background:var(--bg3);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:6px">${opt(SRC)}</select></label>
      <label class="sim-slider"><span>Processor</span><select id="b-proc" style="background:var(--bg3);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:6px">${opt(PROC)}</select></label>
      <label class="sim-slider"><span>Sink</span><select id="b-sink" style="background:var(--bg3);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:6px">${opt(SINK)}</select></label>`)}
    ${controlRow(`
      <label style="display:flex;align-items:center;gap:6px;color:var(--text2);font-size:13px"><input type="checkbox" id="r-eos"> Need exactly-once</label>
      <label style="display:flex;align-items:center;gap:6px;color:var(--text2);font-size:13px"><input type="checkbox" id="r-state"> Need stateful (windows/joins)</label>
      <label style="display:flex;align-items:center;gap:6px;color:var(--text2);font-size:13px"><input type="checkbox" id="r-lowlat"> Need low (sub-second) latency</label>
      ${btn('b-check', 'Check design', true)}`)}
    <div id="b-diag"></div><div id="b-fb"></div>`;
  const val = (id) => host.querySelector('#' + id).value;
  function check() {
    const src = val('b-src'), proc = val('b-proc'), sink = val('b-sink');
    const eos = host.querySelector('#r-eos').checked, state = host.querySelector('#r-state').checked, low = host.querySelector('#r-lowlat').checked;
    host.querySelector('#b-diag').innerHTML = flowDiagram([SRC[src], PROC[proc], SINK[sink]]);
    const issues = [], good = [];
    // stateful
    if (state) { if (proc === 'lambda') issues.push('Lambda is per-event and <b>not</b> suited to rich windows/joins — use Flink or Databricks for stateful work.'); else good.push('Processor supports stateful windows/joins.'); }
    // exactly-once
    if (eos) {
      if (proc === 'lambda') issues.push('Lambda consumers are at-least-once; you must dedupe downstream for effectively-once.');
      if (proc === 'dbx' && sink !== 'delta') issues.push('Databricks exactly-once is strongest <b>Delta-to-Delta</b>; with a non-Delta sink you must add idempotency (batchId).');
      if (proc === 'flink' && (sink === 's3' || sink === 'nosql')) issues.push('Flink end-to-end exactly-once needs a <b>transactional/idempotent</b> sink — plain object/KV stores need a compatible connector or idempotent writes.');
      if (proc === 'flink' && (sink === 'delta' || sink === 'warehouse')) good.push('Flink + transactional sink can achieve end-to-end exactly-once.');
      if (proc === 'dbx' && sink === 'delta') good.push('Databricks Delta-to-Delta is exactly-once.');
      if (proc === 'kstreams' && src !== 'kafka') issues.push('Kafka Streams EOS applies to <b>Kafka-to-Kafka</b> read-process-write; a non-Kafka source breaks that guarantee.');
    }
    // low latency
    if (low && proc === 'dbx') issues.push('Databricks is micro-batch by default (seconds); for sub-second use real-time mode or a per-event engine like Flink.');
    if (low && proc === 'flink') good.push('Flink is per-event — well suited to low latency.');
    // source/proc coherence
    if (proc === 'kstreams' && src !== 'kafka') issues.push('Kafka Streams only reads from Kafka — pair it with a Kafka source.');
    if (src === 'autoloader' && proc !== 'dbx') issues.push('Auto Loader is a Databricks feature — pair it with Databricks Structured Streaming.');
    host.querySelector('#b-fb').innerHTML =
      (good.length ? callout('ok', '✓ Looks sound', '<ul class="clean">' + good.map(g => `<li>${g}</li>`).join('') + '</ul>') : '') +
      (issues.length ? callout('warn', '⚠ Check these', '<ul class="clean">' + issues.map(g => `<li>${g}</li>`).join('') + '</ul>') :
        callout('ok', '✓ No conflicts found', 'This combination satisfies the requirements you selected.'));
  }
  host.querySelector('#b-check').addEventListener('click', check);
  check();
  return () => {};
}

// ──────────────────────────────────────────────────────────────── I64 decide
function renderDecide(container) {
  const host = toolShell(container, '🧭', 'Technology Decision Engine', 'Answer a few questions and get a justified recommendation. It is a guide, not gospel — the rationale matters more than the pick.');
  const Q = [
    { id: 'need', q: 'What do you primarily need?', a: [['log', 'A durable log to move/store events'], ['proc', 'To transform/aggregate streams (stateful)'], ['both', 'Both — ingest and process']] },
    { id: 'cloud', q: 'Operational preference?', a: [['self', 'Maximum control / portability (self-manage)'], ['managed', 'Minimize ops (fully managed)']] },
    { id: 'eco', q: 'Ecosystem?', a: [['kafka', 'Want the Kafka API / Connect / Streams'], ['aws', 'AWS-centric'], ['azure', 'Azure-centric'], ['lake', 'Lakehouse / analytics + ML']] },
    { id: 'lat', q: 'Latency need?', a: [['low', 'Sub-second, per-event'], ['sec', 'Seconds is fine']] },
  ];
  let ans = {};
  function render() {
    host.innerHTML = Q.map(q => `
      <div class="card"><div style="font-weight:600;margin-bottom:8px">${q.q}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">${q.a.map(([v, l]) =>
        `<button class="btn${ans[q.id] === v ? ' primary' : ''}" data-q="${q.id}" data-v="${v}" style="font-size:13px">${l}</button>`).join('')}</div></div>`).join('')
      + `<div id="d-rec"></div>`;
    host.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => { ans[b.dataset.q] = b.dataset.v; render(); recommend(); }));
    recommend();
  }
  function recommend() {
    if (Object.keys(ans).length < Q.length) { host.querySelector('#d-rec').innerHTML = `<p style="color:var(--text3);text-align:center">Answer all questions for a recommendation.</p>`; return; }
    const picks = []; const why = [];
    // log / ingest
    if (ans.need !== 'proc') {
      if (ans.eco === 'kafka') { picks.push(ans.cloud === 'managed' ? 'Amazon MSK (managed Kafka)' : 'Apache Kafka (self-managed)'); why.push('You want the Kafka API/ecosystem.'); }
      else if (ans.eco === 'aws') { picks.push('Kinesis Data Streams'); why.push('AWS-centric, fully managed log.'); }
      else if (ans.eco === 'azure') { picks.push('Azure Event Hubs'); why.push('Azure-native log with Kafka protocol surface.'); }
      else if (ans.eco === 'lake') { picks.push('Auto Loader / Kafka → Delta'); why.push('Lakehouse ingestion into Delta.'); }
      else { picks.push(ans.cloud === 'managed' ? 'A managed log (Kinesis/Event Hubs/MSK)' : 'Apache Kafka'); }
    }
    // processing
    if (ans.need !== 'log') {
      if (ans.eco === 'lake') { picks.push('Databricks Structured Streaming'); why.push('Lakehouse/analytics + ML fit.'); if (ans.lat === 'low') why.push('For sub-second, use Databricks real-time mode or add Flink.'); }
      else if (ans.lat === 'low') { picks.push('Apache Flink (or Managed Service for Apache Flink)'); why.push('Per-event engine for sub-second latency and rich state.'); }
      else if (ans.eco === 'aws') { picks.push('Managed Service for Apache Flink'); why.push('Managed stateful processing on AWS.'); }
      else { picks.push('Apache Flink'); why.push('General stateful stream processing.'); }
    }
    host.querySelector('#d-rec').innerHTML = callout('info', '🧭 Recommendation',
      `<div style="font-size:16px;font-weight:700;color:var(--accent2);margin-bottom:6px">${picks.join('  +  ')}</div>
       <ul class="clean">${why.map(w => `<li>${w}</li>`).join('')}</ul>
       <div style="font-size:12px;color:var(--text3);margin-top:6px">Heuristic guidance — validate against your real throughput, team skills, and cost model.</div>`);
  }
  render();
  return () => {};
}

// ────────────────────────────────────────────────────────────── I65 capacity
function renderCapacity(container) {
  const host = toolShell(container, '🧮', 'Capacity calculator', 'Estimate throughput, storage, and partition/shard counts from first principles. Every number shows its assumption — these are planning estimates, not benchmarks.');
  let eps = 50000, size = 1, retention = 7, rf = 3, perPart = 10;
  host.innerHTML = `
    ${controlRow(
      slider('c-eps', 'Events / sec', 1000, 1000000, eps, 1000) +
      slider('c-size', 'Avg event size (KB)', 1, 20, size) +
      slider('c-ret', 'Retention (days)', 1, 30, retention) +
      slider('c-rf', 'Replication factor', 1, 3, rf) +
      slider('c-pp', 'Target MB/s per partition', 2, 20, perPart))}
    <div id="c-out"></div>
    <div id="c-assume" class="card" style="margin-top:4px"></div>`;
  function calc() {
    const bytesPerSec = eps * size * 1024;
    const mbPerSec = bytesPerSec / (1024 * 1024);
    const rawStorageGB = (bytesPerSec * 86400 * retention) / (1024 ** 3);
    const replStorageGB = rawStorageGB * rf;
    const partitions = Math.max(1, Math.ceil(mbPerSec / perPart));
    const kinesisShards = Math.max(1, Math.ceil(mbPerSec / 1)); // 1 MB/s write per shard (validated)
    host.querySelector('#c-out').innerHTML = metricsPanel([
      { label: 'Ingress throughput', value: mbPerSec.toFixed(1) + ' MB/s', color: C.cyan2 },
      { label: 'Raw storage (retention)', value: rawStorageGB.toFixed(0) + ' GB', color: C.keyB },
      { label: `Replicated (×${rf})`, value: replStorageGB.toFixed(0) + ' GB', color: C.warn },
      { label: 'Kafka partitions (est.)', value: partitions, color: C.ok },
      { label: 'Kinesis shards (est.)', value: kinesisShards, color: C.ok },
    ]);
    host.querySelector('#c-assume').innerHTML = `
      <div style="font-size:12px;color:var(--text3);margin-bottom:6px">Assumptions (change the model, change the answer):</div>
      <ul class="clean" style="font-size:13px;color:var(--text2)">
        <li>Throughput = events/s × size; <b>1 KB = 1024 B</b>, 1 MB = 1024 KB.</li>
        <li>Storage = ingress × 86,400 s/day × retention; compression and headers ignored (plan with headroom).</li>
        <li>Kafka partitions = ⌈ingress ÷ your "${perPart} MB/s per partition" target⌉ — a <i>planning</i> target, not a hard limit; real limits depend on hardware and config.</li>
        <li>Kinesis shards = ⌈ingress ÷ <b>1 MB/s</b>⌉ — the validated per-shard write cap (also 1,000 records/s, not modeled here).</li>
        <li>Replication multiplies storage, not ingress-to-clients; consumer fan-out adds read load separately.</li>
      </ul>`;
  }
  calc();
  [['c-eps', v => eps = v], ['c-size', v => size = v], ['c-ret', v => retention = v], ['c-rf', v => rf = v], ['c-pp', v => perPart = v]]
    .forEach(([id, set]) => host.querySelector('#' + id).addEventListener('input', e => { set(+e.target.value); host.querySelector('#' + id + '-val').textContent = e.target.value; calc(); }));
  return () => {};
}

const RENDER = {
  'eng-graph': renderGraph, 'eng-compare': renderCompare, 'eng-trace': renderTrace,
  'eng-break': renderBreak, 'eng-builder': renderBuilder, 'eng-decide': renderDecide,
  'eng-capacity': renderCapacity,
};
