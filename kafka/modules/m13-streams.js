import { createModuleShell, createIQSection } from '../components/module-shell.js';

const IQ = [
  { q: 'What is the difference between KStream and KTable in Kafka Streams?', a: 'KStream: an unbounded sequence of records where each record is an independent event. Analogous to a database INSERT — all records are meaningful. KTable: a changelog stream where each record is an UPDATE — only the latest value for a key is relevant. Analogous to a database table. KTable is backed by a changelog topic (compacted) and a local RocksDB state store. Joining a KStream with a KTable: for each stream record, look up the matching KTable entry — powerful for enrichment (e.g., join order events with customer profile).', tip: 'Mental model: KStream = append-only log, KTable = materialized view. Same data, different interpretation.' },
  { q: 'How does Kafka Streams handle state stores and what happens on failure?', a: 'State stores (RocksDB by default) are local per-task. They are backed by a changelog Kafka topic (auto-created, compacted). On failure, Kafka Streams restores state by replaying the changelog topic. For large state (GB+), this can take minutes. Standby replicas (num.standby.replicas) maintain warm copies of state stores on other instances for faster failover. For read access, interactive queries allow other application instances to query local state stores via RPC.', tip: 'Restoration time = state size / disk speed. For low-latency failover, use standby replicas. For the largest states, consider RocksDB with SSD and pre-warmed standbys.' },
  { q: 'What is a stream-table join and give an Amazon use case?', a: 'A KStream-KTable join enriches each event in the stream with the latest state from a table. For each stream record, Kafka Streams does a local RocksDB lookup — no network hop. Amazon order enrichment: KStream<orderId, OrderPlaced> joined with KTable<customerId, CustomerProfile>. Result: each order event enriched with customer tier (Prime/regular), shipping address, payment preference — all without a database query on the hot path. The KTable is kept fresh via a Debezium CDC topic from the customer database.', tip: 'Kafka Streams joins are always co-partitioned — stream and table must have the same partition key and count. Repartition if needed (results in a repartition topic).' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M13 · Ecosystem',
    title: 'Kafka Streams',
    subtitle: 'DSL builder — map, filter, aggregate, join, state store — with Amazon pipeline example',
    tabs: [
      { id: 'dsl',      label: '🌊 Stream DSL' },
      { id: 'topology', label: '🗺️ Topology View' },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ]
  });

  buildDSL(container);
  buildTopology(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return null;
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
  tab.innerHTML = `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Kafka Streams DSL Operations</div><div class="section-desc">Functional pipeline for stateless and stateful stream processing</div></div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${ops.map(o => `
          <div style="display:flex;gap:12px;background:var(--bg2);border:1px solid var(--border);border-left:3px solid ${o.color};border-radius:10px;padding:14px;align-items:flex-start">
            <div style="font-size:20px;flex-shrink:0;margin-top:2px">${o.icon}</div>
            <div style="flex:1">
              <div style="font-size:12px;font-weight:700;color:${o.color};font-family:monospace;margin-bottom:4px">.${o.op}()</div>
              <div style="font-size:12px;color:var(--text2);margin-bottom:6px">${o.desc}</div>
              <code style="font-size:11px;color:var(--accent);background:var(--bg);padding:4px 8px;border-radius:4px;display:block;font-family:monospace">${o.code}</code>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
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
          <text x="${b.x + b.w/2}" y="${b.y + 38}" text-anchor="middle" fill="#64748B" font-size="9">${b.sub}</text>
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
        <text x="200" y="354" text-anchor="middle" fill="#64748B" font-size="9">Restored on restart by replaying changelog</text>

        <rect x="400" y="300" width="360" height="60" rx="8" fill="#1E293B" stroke="#F59E0B" stroke-width="1"/>
        <text x="580" y="322" text-anchor="middle" fill="#F59E0B" font-size="11" font-weight="700">Example Output</text>
        <text x="580" y="340" text-anchor="middle" fill="#94A3B8" font-size="9">Key: electronics|2024-01-15T14:05</text>
        <text x="580" y="354" text-anchor="middle" fill="#64748B" font-size="9">Value: $2,847,332 revenue</text>
      </svg>
    </div>`;
}
