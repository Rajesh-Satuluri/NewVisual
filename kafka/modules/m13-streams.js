import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { drawRoundRect, drawArrow, EventPacket } from '../components/canvas-primitives.js';

export const IQ = [
  { q: 'What is the difference between KStream and KTable in Kafka Streams?', a: 'KStream: an unbounded sequence of records where each record is an independent event. Analogous to a database INSERT — all records are meaningful. KTable: a changelog stream where each record is an UPDATE — only the latest value for a key is relevant. Analogous to a database table. KTable is backed by a changelog topic (compacted) and a local RocksDB state store. Joining a KStream with a KTable: for each stream record, look up the matching KTable entry — powerful for enrichment (e.g., join order events with customer profile).', tip: 'Mental model: KStream = append-only log, KTable = materialized view. Same data, different interpretation.' },
  { q: 'How does Kafka Streams handle state stores and what happens on failure?', a: 'State stores (RocksDB by default) are local per-task. They are backed by a changelog Kafka topic (auto-created, compacted). On failure, Kafka Streams restores state by replaying the changelog topic. For large state (GB+), this can take minutes. Standby replicas (num.standby.replicas) maintain warm copies of state stores on other instances for faster failover. For read access, interactive queries allow other application instances to query local state stores via RPC.', tip: 'Restoration time = state size / disk speed. For low-latency failover, use standby replicas. For the largest states, consider RocksDB with SSD and pre-warmed standbys.' },
  { q: 'What is a stream-table join and give an Amazon use case?', a: 'A KStream-KTable join enriches each event in the stream with the latest state from a table. For each stream record, Kafka Streams does a local RocksDB lookup — no network hop. Amazon order enrichment: KStream<orderId, OrderPlaced> joined with KTable<customerId, CustomerProfile>. Result: each order event enriched with customer tier (Prime/regular), shipping address, payment preference — all without a database query on the hot path. The KTable is kept fresh via a Debezium CDC topic from the customer database.', tip: 'Kafka Streams joins are always co-partitioned — stream and table must have the same partition key and count. Repartition if needed (results in a repartition topic).' },
  { q: 'How does Kafka Streams windowing handle late-arriving events?', a: 'Streams windows are driven by event time plus a grace period. (1) Each record is placed in its window by its event timestamp, not arrival time, so out-of-order records still land in the right window. (2) A window stays open for its size plus grace.ms; a late event arriving within grace is folded in and updates the result. (3) After the grace period the window closes and truly late events are dropped. (4) Stream time advances by the max timestamp seen, so a sparse partition can delay window closing. The tradeoff: a longer grace tolerates more lateness but holds state longer and delays the final result.', tip: 'Name the knob: grace period (ofSizeAndGrace / grace.ms). Say "windows close on stream time, size + grace; events later than grace are dropped" — shows event-time vs processing-time understanding.', difficulty: 'hard' },
  { q: 'When would you choose Kafka Streams over Flink or Spark Structured Streaming?', a: 'Kafka Streams is a library, not a cluster — it runs inside your own application JVM, so there is no separate processing cluster to operate. (1) Choose Streams when source and sink are both Kafka, you want simple per-key stateful processing, and you prefer embedding logic in a microservice. (2) Choose Flink for advanced event-time windowing, very low latency at large scale, exactly-once across many external systems, or non-Kafka sources. (3) Choose Spark Structured Streaming when you already run Spark and want micro-batch analytics beside batch jobs. The tradeoff: Streams is lightest to operate but Kafka-centric; Flink is heavier but far more capable.', tip: 'Lead with "Streams is a library, Flink/Spark are clusters." That one distinction drives most of the decision — operational simplicity vs raw capability.', difficulty: 'medium' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M13 · Ecosystem',
    title: 'Kafka Streams',
    subtitle: 'DSL builder — map, filter, aggregate, join, state store — with Amazon pipeline example',
    definition: {
      formal: "Kafka Streams is a client library for building stream-processing apps that read from Kafka topics, transform records (map, filter, aggregate, join) using managed local state stores, and write results back to Kafka — with no separate processing cluster required.",
      easy: "A code library that lets your own app transform Kafka data on the fly — filtering, counting, joining streams — and write the results back, without standing up a separate big-data cluster.",
    },
    tabs: [
      { id: 'dsl',      label: '🌊 Stream DSL' },
      { id: 'duality',  label: '🔀 KStream ⇄ KTable' },
      { id: 'state',    label: '🗄️ State & Changelog' },
      { id: 'topology', label: '🗺️ Topology View' },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ]
  });

  const cleanups = [];
  buildDSL(container);
  cleanups.push(buildDuality(container));
  buildState(container);
  buildTopology(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return () => cleanups.forEach(fn => { if (typeof fn === 'function') fn(); });
}

/* ─────────────────────────────────────────────────────────────────────────
   TAB — KStream ⇄ KTable (the stream/table duality)
   ───────────────────────────────────────────────────────────────────────── */
function buildDuality(container) {
  const tab = container.querySelector('#tab-duality');

  // A sequence of keyed updates — e.g. each user's running cart total as they shop.
  const RECS = [
    { k: 'alice', v: 40 }, { k: 'bob', v: 15 }, { k: 'alice', v: 65 },
    { k: 'carol', v: 22 }, { k: 'bob', v: 30 }, { k: 'alice', v: 12 }, { k: 'carol', v: 48 },
  ];
  const KCOL = { alice: '#3B82F6', bob: '#10B981', carol: '#F59E0B' };
  let step = 0, timer = null;

  function render() {
    const seen = RECS.slice(0, step);
    const lastKey = step > 0 ? RECS[step - 1].k : null;

    // KStream column — every record is a row (append-only)
    tab.querySelector('#dz-stream').innerHTML = seen.length === 0
      ? `<div style="color:#5B6B82;font-size:11px;padding:10px">No records yet — press Next.</div>`
      : seen.map((r, i) => {
        const isLast = i === seen.length - 1;
        return `<div style="display:flex;justify-content:space-between;padding:6px 10px;border-radius:6px;margin-bottom:4px;
          background:${isLast ? KCOL[r.k] + '26' : '#0E1626'};border:1px solid ${isLast ? KCOL[r.k] : '#1C2740'};font-family:ui-monospace,monospace;font-size:11px">
          <span style="color:${KCOL[r.k]}">${r.k}</span><span style="color:#CBD5E1">cart = $${r.v}</span></div>`;
      }).join('');

    // KTable column — latest value per key (materialized view)
    const table = {};
    seen.forEach(r => { table[r.k] = r.v; });
    const keys = Object.keys(table);
    tab.querySelector('#dz-table').innerHTML = keys.length === 0
      ? `<div style="color:#5B6B82;font-size:11px;padding:10px">Empty table.</div>`
      : keys.map(k => {
        const updated = k === lastKey;
        return `<div style="display:flex;justify-content:space-between;padding:7px 10px;border-radius:6px;margin-bottom:4px;
          background:${updated ? KCOL[k] + '26' : '#0E1626'};border:1px solid ${updated ? KCOL[k] : '#1C2740'};font-family:ui-monospace,monospace;font-size:11.5px">
          <span style="color:${KCOL[k]};font-weight:700">${k}</span>
          <span style="color:#CBD5E1">$${table[k]}${updated ? ' <span style="color:' + KCOL[k] + ';font-size:9px">◂ upsert</span>' : ''}</span></div>`;
      }).join('');

    tab.querySelector('#dz-counts').innerHTML =
      `<span style="color:#60A5FA">KStream: ${seen.length} records</span> &nbsp;·&nbsp; <span style="color:#FBBF24">KTable: ${keys.length} keys</span>`;
    tab.querySelector('#dz-next').textContent = step >= RECS.length ? '✓ Done' : '▶ Next record';
  }

  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">The deepest idea in Kafka Streams: <b>a stream and a table are two readings of the same data</b>. The exact same keyed records, seen as an append-only <b>KStream</b> (every event matters) on the left, and as a materialized <b>KTable</b> (only the latest value per key) on the right. Step records in and watch the table <b>upsert in place</b> while the stream just grows.</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div style="background:#0C1424;border:1px solid #1C2740;border-radius:10px;padding:12px 14px">
          <div style="font-size:11px;font-weight:700;color:#60A5FA;margin-bottom:3px">KStream &nbsp;<span style="font-weight:400;color:#64748B">— append-only log</span></div>
          <div style="font-size:9px;color:#5B6B82;margin-bottom:10px">every record is an independent event (INSERT)</div>
          <div id="dz-stream" style="max-height:280px;overflow:auto"></div>
        </div>
        <div style="background:#0C1424;border:1px solid #1C2740;border-radius:10px;padding:12px 14px">
          <div style="font-size:11px;font-weight:700;color:#FBBF24;margin-bottom:3px">KTable &nbsp;<span style="font-weight:400;color:#64748B">— materialized view</span></div>
          <div style="font-size:9px;color:#5B6B82;margin-bottom:10px">latest value per key (UPSERT), backed by a compacted changelog</div>
          <div id="dz-table"></div>
        </div>
      </div>
      <div id="dz-counts" style="text-align:center;font-size:11px;font-family:ui-monospace,monospace;margin-top:12px"></div>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="dz-next">▶ Next record</button>
        <button class="ctrl-btn" id="dz-run">⏩ Play</button>
        <button class="ctrl-btn" id="dz-reset">↻ Reset</button>
        <span class="ctrl-label">Same records → the stream grows, the table upserts</span>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>This is the <strong>stream–table duality</strong>, and internalising it is the thing that makes everything else in Kafka Streams click. The identical sequence of keyed records can be interpreted two ways. As a <strong>KStream</strong> it is an unbounded, append-only log where <em>every</em> record is a meaningful fact — alice's cart hit $40, then later $65, then $12; all three are real events you might count, filter, or join. As a <strong>KTable</strong> it is a changelog: each record is an <em>update</em> for its key, so only the latest value survives — alice's cart <em>is</em> $12 now, the earlier values are history. KStream ≈ INSERTs; KTable ≈ UPSERTs into a keyed table.</p>
      <p>A KTable isn't just a logical view — it is physically <strong>materialized</strong> in a local RocksDB state store and backed by a <strong>compacted changelog topic</strong>, so compaction eventually keeps only the latest record per key, exactly mirroring the table. That's why a KTable can be looked up by key with no network hop (crucial for joins) and rebuilt after a crash by replaying its changelog. The two directions are first-class DSL operations: <code>builder.table(topic)</code> or <code>stream.toTable()</code> collapses a stream into a table, and <code>table.toStream()</code> re-emits the table's changes as a stream of updates.</p>
      <p>There's a third type worth naming: a <strong>GlobalKTable</strong>, which materializes the <em>entire</em> topic on <em>every</em> instance (not partitioned), so you can join a stream to it without co-partitioning — ideal for small, mostly-static reference data (country codes, product catalog). The cost is full replication of the table to every instance.</p>
      <p><strong>Interview angle:</strong> say "a stream is a table's changelog, and a table is a stream's latest-value snapshot — they're duals." Then connect it: aggregations turn a KStream into a KTable (<code>groupByKey().count()</code> yields a KTable of counts); <code>toStream()</code> turns it back. Knowing which operations cross the stream⇄table boundary is what separates someone who has read the docs from someone who understands the model.</p>
    </div>`;

  render();
  const next = () => { if (step < RECS.length) { step++; render(); } };
  tab.querySelector('#dz-next').addEventListener('click', next);
  tab.querySelector('#dz-reset').addEventListener('click', () => { if (timer) { clearInterval(timer); timer = null; } step = 0; render(); });
  tab.querySelector('#dz-run').addEventListener('click', () => {
    if (timer) { clearInterval(timer); timer = null; }
    step = 0; render();
    timer = setInterval(() => { if (step >= RECS.length) { clearInterval(timer); timer = null; return; } step++; render(); }, 850);
  });
  return () => { if (timer) clearInterval(timer); };
}

function buildDSL(container) {
  const tab = container.querySelector('#tab-dsl');
  const ops = [
    { op: 'filter', color: '#3B82F6', icon: '🔍', desc: 'Drop records that don\'t match a predicate', code: '.filter((key, order) => order.total > 100)' },
    { op: 'map', color: '#8B5CF6', icon: '🔄', desc: 'Transform each record to a new key-value', code: '.map((id, order) => KeyValue.pair(order.customerId, order))' },
    { op: 'flatMap', color: '#6366F1', icon: '⚡', desc: 'Expand each record into zero or more records', code: '.flatMap((id, order) => order.items.map(item => ...)' },
    { op: 'groupByKey', color: '#F59E0B', icon: '👥', desc: 'Group records by key for aggregation', code: '.groupByKey()' },
    { op: 'aggregate', color: '#FF6900', icon: '∑', desc: 'Stateful aggregation with custom initializer', code: '.aggregate(() -> new Revenue(), (key, order, agg) -> agg.add(order.total))' },
    { op: 'windowedBy', color: '#EF4444', icon: '⏱️', desc: 'Tumbling / hopping / session windows', code: '.windowedBy(TimeWindows.of(Duration.ofMinutes(5)))' },
    { op: 'join', color: '#10B981', icon: '🔗', desc: 'Stream-stream or stream-table join', code: '.join(customerTable, (order, profile) -> enrich(order, profile))' },
    { op: 'to', color: '#94A3B8', icon: '📤', desc: 'Write result to output Kafka topic', code: '.to("enriched-orders", Produced.with(Serdes.String(), orderSerde))' },
  ];
  const stateful = new Set(['groupByKey', 'aggregate', 'windowedBy', 'join']);
  const flow = [
    { t: 'orders', kind: 'source' },
    { t: '.filter', kind: 'stateless' },
    { t: '.map', kind: 'stateless' },
    { t: '.groupByKey', kind: 'stateful' },
    { t: '.aggregate', kind: 'stateful' },
    { t: '.to(output)', kind: 'sink' },
  ];
  const kindColor = { source: '#FF6900', stateless: '#3B82F6', stateful: '#F59E0B', sink: '#10B981' };
  tab.innerHTML = `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Kafka Streams DSL Operations</div><div class="section-desc">Functional pipeline for stateless and stateful stream processing</div></div>

      <div class="canvas-explainer" style="border-top:none;border-radius:10px;margin-bottom:16px">
        <p>Kafka Streams lets you build a processing <strong>topology</strong> by chaining operators onto a stream — a <code>KStream</code> (an append-only sequence of events, like a log) or a <code>KTable</code> (a changelog where only the latest value per key matters, like a materialized table). The DSL reads like a functional pipeline: each operator takes a stream and returns a new one, so records flow left-to-right from a <strong>source</strong> topic through transforms to a <strong>sink</strong> topic.</p>
        <p>The line that matters most is <strong>stateless vs stateful</strong>. Stateless operators (<code>filter</code>, <code>map</code>, <code>flatMap</code>) look at one record at a time and need no memory. Stateful operators (<code>groupByKey</code>, <code>aggregate</code>, <code>windowedBy</code>, <code>join</code>) must remember past records, so Kafka Streams keeps a <strong>local RocksDB state store</strong> backed by a compacted changelog topic — that's what makes running totals, windows, and joins possible, and what has to be restored on restart.</p>
      </div>

      <div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px;background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:10px">
        ${flow.map((f, i) => `
          <span style="background:${kindColor[f.kind]}22;border:1.5px solid ${kindColor[f.kind]};color:${kindColor[f.kind]};font-family:monospace;font-size:11px;font-weight:700;padding:6px 10px;border-radius:7px;white-space:nowrap">${f.t}</span>
          ${i < flow.length - 1 ? `<span style="color:var(--text3);font-size:14px">→</span>` : ''}`).join('')}
      </div>
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:18px;font-size:11px;color:var(--text3)">
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#FF6900;vertical-align:middle;margin-right:5px"></span>source topic</span>
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#3B82F6;vertical-align:middle;margin-right:5px"></span>stateless (no memory)</span>
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#F59E0B;vertical-align:middle;margin-right:5px"></span>stateful (RocksDB state store)</span>
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#10B981;vertical-align:middle;margin-right:5px"></span>sink topic</span>
      </div>

      <div style="display:flex;flex-direction:column;gap:10px">
        ${ops.map(o => `
          <div style="display:flex;gap:12px;background:var(--bg2);border:1px solid var(--border);border-left:3px solid ${o.color};border-radius:10px;padding:14px;align-items:flex-start">
            <div style="font-size:20px;flex-shrink:0;margin-top:2px">${o.icon}</div>
            <div style="flex:1">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                <span style="font-size:12px;font-weight:700;color:${o.color};font-family:monospace">.${o.op}()</span>
                <span style="font-size:9px;font-weight:700;letter-spacing:.04em;padding:1px 6px;border-radius:4px;background:${stateful.has(o.op)?'#F59E0B22':'#3B82F622'};color:${stateful.has(o.op)?'#F59E0B':'#3B82F6'}">${stateful.has(o.op)?'STATEFUL':'STATELESS'}</span>
              </div>
              <div style="font-size:12px;color:var(--text2);margin-bottom:6px">${o.desc}</div>
              <code style="font-size:11px;color:var(--accent);background:var(--bg);padding:4px 8px;border-radius:4px;display:block;font-family:monospace">${o.code}</code>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}

/* ─────────────────────────────────────────────────────────────────────────
   TAB — State Stores & Changelog (RocksDB + changelog restore + standby)
   ───────────────────────────────────────────────────────────────────────── */
function buildState(container) {
  const tab = container.querySelector('#tab-state');

  const RECS = ['pageA', 'pageB', 'pageA', 'pageA', 'pageB', 'pageC', 'pageA'];
  const KCOL = { pageA: '#3B82F6', pageB: '#10B981', pageC: '#F59E0B' };
  let idx = 0;
  let counts = {};          // live state store contents
  let changelog = [];       // [{k, v}] appended on every state update
  let storeAlive = true;    // false after a crash with no standby
  let standby = false;
  let note = '';

  function render() {
    // mini flow
    tab.querySelector('#st-flow').innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:10px;font-weight:600">
        <span style="padding:6px 10px;border-radius:7px;background:#111A2B;border:1px solid #FF690066;color:#FF9900">clicks topic</span>
        <span style="color:#334155">→</span>
        <span style="padding:6px 10px;border-radius:7px;background:#111A2B;border:1px solid #8B5CF6;color:#8B5CF6">groupByKey().count()</span>
        <span style="color:#334155">→ writes →</span>
        <span style="padding:6px 10px;border-radius:7px;background:#111A2B;border:1px solid #06B6D4;color:#06B6D4">changelog topic</span>
      </div>`;

    // state store panel
    const storeKeys = Object.keys(counts);
    tab.querySelector('#st-store').innerHTML =
      `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div style="font-size:11px;font-weight:700;color:${storeAlive ? '#8B5CF6' : '#EF4444'}">Local State Store · RocksDB ${standby ? '<span style="color:#10B981;font-size:9px">+ standby warm</span>' : ''}</div>
        <div style="font-size:9px;color:${storeAlive ? '#10B981' : '#EF4444'}">${storeAlive ? '● on instance A' : '✖ lost with instance A'}</div>
      </div>` +
      (!storeAlive
        ? `<div style="color:#F87171;font-size:11px;padding:14px;text-align:center;border:1px dashed #7F1D1D;border-radius:8px">state store gone — local disk died with the instance</div>`
        : storeKeys.length === 0
          ? `<div style="color:#5B6B82;font-size:11px;padding:10px">empty — process a record</div>`
          : storeKeys.map(k => `<div style="display:flex;justify-content:space-between;padding:6px 10px;border-radius:6px;margin-bottom:4px;background:#0E1626;border:1px solid ${KCOL[k]}55;font-family:ui-monospace,monospace;font-size:11.5px"><span style="color:${KCOL[k]};font-weight:700">${k}</span><span style="color:#CBD5E1">count = ${counts[k]}</span></div>`).join(''));

    // changelog panel — compacted: dim superseded entries
    const latestIdxForKey = {};
    changelog.forEach((e, i) => { latestIdxForKey[e.k] = i; });
    tab.querySelector('#st-changelog').innerHTML =
      `<div style="font-size:11px;font-weight:700;color:#06B6D4;margin-bottom:8px">Changelog topic <span style="font-weight:400;color:#64748B">— compacted, in Kafka (survives crashes)</span></div>` +
      (changelog.length === 0
        ? `<div style="color:#5B6B82;font-size:11px;padding:10px">no changelog records yet</div>`
        : changelog.map((e, i) => {
          const superseded = latestIdxForKey[e.k] !== i;
          return `<div style="display:flex;justify-content:space-between;padding:5px 10px;border-radius:6px;margin-bottom:3px;font-family:ui-monospace,monospace;font-size:10.5px;opacity:${superseded ? 0.4 : 1};background:#0E1626;border:1px solid ${superseded ? '#1C2740' : KCOL[e.k] + '55'}">
            <span style="color:${KCOL[e.k]}">${e.k}</span><span style="color:#CBD5E1">→ ${e.v}${superseded ? ' <span style="color:#64748B;font-size:8px">compacted away</span>' : ' <span style="color:#10B981;font-size:8px">kept</span>'}</span></div>`;
        }).join(''));

    tab.querySelector('#st-note').innerHTML = note || `<span style="color:#64748B">Process records to build state. Each update is written to the local store <b>and</b> appended to the changelog topic in Kafka. Then crash the instance.</span>`;
    tab.querySelector('#st-standby').innerHTML = `standby replica = <b>${standby ? 'on' : 'off'}</b>`;
    tab.querySelector('#st-standby').style.borderColor = standby ? '#10B981' : '';
    tab.querySelector('#st-next').textContent = idx >= RECS.length ? '↻ (all processed)' : '▶ Process click';
  }

  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">Stateful operators (<code>count</code>, <code>aggregate</code>, <code>join</code>) keep a <b>local RocksDB state store</b> — fast, on-instance, but ephemeral. Durability comes from a <b>compacted changelog topic</b> in Kafka: every state update is written there too. Build some state, then <b>crash the instance</b> and watch it rebuild by replaying the changelog — or fail over instantly with a <b>standby replica</b>.</div>
      <div id="st-flow" style="margin-bottom:14px"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div id="st-store" style="background:#0C1424;border:1px solid #1C2740;border-radius:10px;padding:12px 14px;min-height:150px"></div>
        <div id="st-changelog" style="background:#0C1424;border:1px solid #1C2740;border-radius:10px;padding:12px 14px;min-height:150px;max-height:280px;overflow:auto"></div>
      </div>
      <div id="st-note" style="font-size:11.5px;line-height:1.6;margin-top:12px;min-height:34px"></div>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="st-next">▶ Process click</button>
        <button class="ctrl-btn" id="st-crash">💥 Crash instance</button>
        <button class="ctrl-btn" id="st-restore">♻ Restore</button>
        <button class="ctrl-btn" id="st-standby">standby</button>
        <button class="ctrl-btn" id="st-reset">↻ Reset</button>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>Anything stateful in Kafka Streams — a running <code>count</code>, an <code>aggregate</code>, the table side of a join, a window — needs somewhere to remember past records. That somewhere is a <strong>local state store</strong>, RocksDB by default, living on the instance's own disk right next to the processing thread. Local means a key lookup is an embedded-database read with <em>no network hop</em>, which is exactly why Streams joins and aggregations are fast. But local also means <strong>ephemeral</strong>: if the instance dies, its disk goes with it.</p>
      <p>Durability is solved by backing every store with a <strong>changelog topic</strong> in Kafka (auto-created, named <code>&lt;application.id&gt;-&lt;store&gt;-changelog</code>, and <strong>log-compacted</strong>). Every write to the store is also produced to the changelog, so the topic is a complete, replayable history of the store — and because it's compacted, Kafka eventually keeps only the latest value per key (watch the superseded entries dim above), so the changelog's retained size tracks the store's size rather than growing forever. On a clean restart or a crash, Streams rebuilds the store by <strong>replaying the changelog</strong> from the beginning into a fresh RocksDB instance.</p>
      <p>The catch is <strong>restore time</strong>: for a multi-gigabyte store, replaying the whole changelog can take minutes, during which that task processes nothing. Two mitigations: <strong>standby replicas</strong> (<code>num.standby.replicas</code>) keep a warm, continuously-updated copy of the store on another instance, so a failure fails over to the standby almost instantly instead of replaying from zero; and Streams persists RocksDB to disk so a restart on the <em>same</em> instance only needs to replay the tail since the last checkpoint, not everything.</p>
      <p><strong>Interview angle:</strong> the one-liner is "state is local RocksDB for speed, durable via a compacted changelog topic for recovery." Then the senior detail: restore cost is proportional to state size, so you use standby replicas for fast failover and you care about <code>num.standby.replicas</code>, rack-aware assignment, and keeping stores small. Interactive queries (<code>KafkaStreams#store</code> + an RPC layer) let other instances read these same local stores — turning your streaming app into a queryable materialized view with no external database.</p>
    </div>`;

  function processNext() {
    if (idx >= RECS.length || !storeAlive) return;
    const k = RECS[idx++];
    counts[k] = (counts[k] || 0) + 1;
    changelog.push({ k, v: counts[k] });
    note = `<span style="color:#CBD5E1">Processed <b style="color:${KCOL[k]}">${k}</b> → store now ${k}=${counts[k]}, and appended <code>${k}→${counts[k]}</code> to the changelog.</span>`;
    render();
  }
  function crash() {
    if (!storeAlive) return;
    if (standby) {
      note = `<span style="color:#86EFAC">✓ Instance A crashed — but the <b>standby</b> on instance B was warm (kept up to date from the changelog), so the task failed over in <b>seconds</b> with full state intact. No replay needed.</span>`;
      // state preserved via standby
    } else {
      storeAlive = false;
      note = `<span style="color:#F87171">💥 Instance A crashed and its local RocksDB store is gone. The changelog topic in Kafka survives. Press <b>Restore</b> to rebuild the store by replaying it.</span>`;
    }
    render();
  }
  function restore() {
    if (storeAlive) { note = `<span style="color:#64748B">Nothing to restore — the store is alive. Crash the instance first.</span>`; render(); return; }
    // replay compacted changelog → latest value per key
    counts = {};
    const latest = {};
    changelog.forEach(e => { latest[e.k] = e.v; });
    Object.assign(counts, latest);
    storeAlive = true;
    note = `<span style="color:#86EFAC">♻ Restored: replayed the compacted changelog (${Object.keys(latest).length} live keys) into a fresh RocksDB store on a new instance. State is back — processing resumes. For a large store this replay is what takes minutes.</span>`;
    render();
  }

  render();
  tab.querySelector('#st-next').addEventListener('click', processNext);
  tab.querySelector('#st-crash').addEventListener('click', crash);
  tab.querySelector('#st-restore').addEventListener('click', restore);
  tab.querySelector('#st-standby').addEventListener('click', () => { standby = !standby; note = standby ? `<span style="color:#86EFAC">Standby replica enabled — instance B now keeps a warm copy of the store, updated live from the changelog. A crash will fail over to it instantly.</span>` : ''; render(); });
  tab.querySelector('#st-reset').addEventListener('click', () => { idx = 0; counts = {}; changelog = []; storeAlive = true; standby = false; note = ''; render(); });
}

function buildTopology(container) {
  const tab = container.querySelector('#tab-topology');
  tab.innerHTML = `
    <div class="svg-wrap">
      <svg viewBox="0 0 800 440" width="800" height="440" style="font-family:system-ui">
        <defs>
          <marker id="aT" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#FF6900"/>
          </marker>
        </defs>

        <text x="30" y="28" fill="#94A3B8" font-size="12" font-weight="700">Amazon Order Revenue Topology — 5-minute tumbling window</text>

        ${[
          { x: 30,  y: 50,  w: 140, h: 50, label: 'orders topic',         color: '#FF6900', sub: 'KStream<orderId>' },
          { x: 30,  y: 140, w: 140, h: 50, label: 'customers topic',      color: '#3B82F6', sub: 'KTable<customerId>' },
          { x: 220, y: 80,  w: 140, h: 50, label: 'filter',               color: '#3B82F6', sub: 'total > $10' },
          { x: 220, y: 160, w: 140, h: 50, label: 'join',                 color: '#10B981', sub: 'enrich + tier' },
          { x: 400, y: 80,  w: 140, h: 50, label: 'groupBy(category)',    color: '#F59E0B', sub: 'repartition' },
          { x: 400, y: 160, w: 140, h: 50, label: 'windowed(5min)',       color: '#EF4444', sub: 'tumbling window' },
          { x: 580, y: 80,  w: 140, h: 50, label: 'aggregate(sum)',       color: '#8B5CF6', sub: 'RocksDB state' },
          { x: 580, y: 160, w: 140, h: 50, label: 'toStream()',           color: '#6366F1', sub: 'windowed result' },
          { x: 580, y: 260, w: 140, h: 50, label: 'revenue-by-category', color: '#10B981', sub: 'output topic' },
        ].map(b => `
          <rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="8" fill="#1E293B" stroke="${b.color}" stroke-width="1.5"/>
          <text x="${b.x + b.w/2}" y="${b.y + 22}" text-anchor="middle" fill="${b.color}" font-size="10" font-weight="700">${b.label}</text>
          <text x="${b.x + b.w/2}" y="${b.y + 38}" text-anchor="middle" fill="#94A3B8" font-size="9">${b.sub}</text>
        `).join('')}

        <!-- Arrows -->
        ${[
          [170, 75, 218, 105],
          [170, 165, 218, 185],
          [360, 105, 398, 105],
          [360, 185, 398, 185],
          [540, 105, 578, 105],
          [540, 185, 578, 185],
          [650, 210, 650, 258],
        ].map(([x1,y1,x2,y2]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#FF6900" stroke-width="1.5" marker-end="url(#aT)"/>`).join('')}

        <!-- State store annotation -->
        <rect x="30" y="300" width="340" height="60" rx="8" fill="#1E293B" stroke="#8B5CF6" stroke-width="1"/>
        <text x="200" y="322" text-anchor="middle" fill="#8B5CF6" font-size="11" font-weight="700">Local State Store (RocksDB)</text>
        <text x="200" y="340" text-anchor="middle" fill="#94A3B8" font-size="9">Backed by Kafka changelog topic (compacted)</text>
        <text x="200" y="354" text-anchor="middle" fill="#94A3B8" font-size="9">Restored on restart by replaying changelog</text>

        <rect x="400" y="300" width="360" height="60" rx="8" fill="#1E293B" stroke="#F59E0B" stroke-width="1"/>
        <text x="580" y="322" text-anchor="middle" fill="#F59E0B" font-size="11" font-weight="700">Example Output</text>
        <text x="580" y="340" text-anchor="middle" fill="#94A3B8" font-size="9">Key: electronics|2024-01-15T14:05</text>
        <text x="580" y="354" text-anchor="middle" fill="#94A3B8" font-size="9">Value: $2,847,332 revenue</text>
      </svg>
    </div>`;
}
