import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { EventPacket, drawRoundRect } from '../components/canvas-primitives.js';

const IQ = [
  { q: 'What happens inside a Kafka producer before a record reaches the broker?', a: 'The producer pipeline: (1) Serialize — key and value serialized to bytes (Avro/JSON/String). (2) Partition — route to a partition via key hash (murmur2), sticky partitioner, or custom. (3) Accumulator — records batched in memory by partition. (4) Sender thread — when batch.size or linger.ms triggers, compress and send to broker. (5) Receive acks — broker acknowledges based on acks setting. (6) Retry — on transient failure, resend up to retries count.', tip: 'The Accumulator is per-partition — each partition has its own deque of record batches. Understanding this explains why high-cardinality keys can cause memory pressure.' },
  { q: 'What is the difference between acks=0, acks=1, and acks=all?', a: 'acks=0: producer does not wait for any acknowledgment — fire and forget. Fastest, risk of data loss even if broker is healthy. acks=1 (default): leader writes to its local log and acknowledges. Fastest safe option, but data can be lost if leader fails before followers replicate. acks=all (or -1): leader waits for all ISR members to acknowledge. No data loss as long as at least one ISR member survives. Use with min.insync.replicas≥2 for strong durability.', tip: 'Pair acks=all with min.insync.replicas=2 and replication.factor=3 for production — this means 2 replicas must acknowledge, and you can survive one broker failure.' },
  { q: 'How does the sticky partitioner improve throughput compared to round-robin?', a: 'Round-robin assigns each record to the next partition, creating many small batches across all partitions. The sticky partitioner fills a batch for one partition (until batch.size or linger.ms), then "sticks" to the next. This produces fewer, larger batches — better compression ratios and fewer network round-trips. For keyless records, sticky partitioning typically doubles throughput versus round-robin.', tip: 'Default since Kafka 2.4. Mention that it still achieves even partition distribution over time — it just does it in bursts rather than record-by-record.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M04 · Core Internals',
    title: 'Producer Deep Dive',
    subtitle: 'Serializer → Partitioner → Accumulator → Sender — traced through Amazon\'s Order Service',
    tabs: [
      { id: 'pipeline', label: '⚡ Pipeline Animation' },
      { id: 'config',   label: '⚙️ Key Configs' },
      { id: 'amazon',   label: '📦 Amazon Story' },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ]
  });

  let cleanup = buildPipeline(container);
  buildConfig(container);
  buildAmazon(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

function buildPipeline(container) {
  const tab = container.querySelector('#tab-pipeline');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <canvas id="producer-canvas" width="820" height="360" style="width:100%;max-width:820px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="prod-send">📤 Send Order Event</button>
        <button class="ctrl-btn" id="prod-burst">⚡ Burst (10 events)</button>
        <span class="ctrl-label">Watch: serialize → partition → batch → send → ack</span>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>The animation shows a single record's journey from application code through four internal pipeline stages before it reaches a broker. The <strong>Serializer</strong> converts Java objects to bytes using Avro or JSON schema. The <strong>Partitioner</strong> runs a murmur2 hash on the record key to deterministically pick a partition — the same key always lands on the same partition, which is how per-key ordering is guaranteed across all producers.</p>
      <p>The <strong>Accumulator</strong> is the stage most engineers overlook. Records don't send immediately — they pool in a per-partition deque until <code>batch.size</code> bytes are reached or <code>linger.ms</code> milliseconds pass, whichever comes first. This batching is the primary reason Kafka achieves millions of records per second: the network overhead of one TCP segment carrying 1,000 records is nearly identical to carrying 1.</p>
      <p>The <strong>acks</strong> setting controls what "sent" means at the broker end. With <code>acks=0</code> the producer fires and forgets — no broker response is waited for, and data loss is possible. With <code>acks=1</code> the leader writes to its log and replies immediately, but followers may not have replicated yet. With <code>acks=all</code> the leader waits until every ISR member confirms before replying — the production-safe default at Amazon for financial events.</p>
    </div>`;

  const canvas = tab.querySelector('#producer-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  // Stages
  const stages = [
    { x: 60,  y: 160, w: 100, h: 50, label: 'Application', color: '#3B82F6' },
    { x: 200, y: 160, w: 100, h: 50, label: 'Serializer',  color: '#8B5CF6' },
    { x: 340, y: 160, w: 100, h: 50, label: 'Partitioner', color: '#F59E0B' },
    { x: 480, y: 100, w: 100, h: 50, label: 'Batch P0',    color: '#FF6900' },
    { x: 480, y: 165, w: 100, h: 50, label: 'Batch P1',    color: '#FF6900' },
    { x: 480, y: 230, w: 100, h: 50, label: 'Batch P2',    color: '#FF6900' },
    { x: 660, y: 160, w: 100, h: 50, label: 'Broker',      color: '#10B981' },
  ];

  const packets = [];
  let raf = null;
  let lastT = 0;
  let ackFlash = 0;
  let msgCount = 0;

  function spawnPacket(label) {
    const pIdx = Math.floor(Math.random() * 3);
    const batchY = [125, 190, 255][pIdx];
    packets.push(new EventPacket({
      label: label || `ord-${++msgCount}`,
      color: '#FF6900',
      path: [
        { x: 110, y: 185 },
        { x: 200, y: 185 },
        { x: 300, y: 185 },
        { x: 400, y: 185 },
        { x: 480, y: batchY + 25 },
        { x: 580, y: batchY + 25 },
        { x: 660, y: 185 },
        { x: 760, y: 185 },
      ],
      speed: 1.4,
      onArrive: () => { ackFlash = 40; }
    }));
  }

  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05);
    lastT = ts;
    if (ackFlash > 0) ackFlash--;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Stage connections
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(160, 185); ctx.lineTo(200, 185);
    ctx.moveTo(300, 185); ctx.lineTo(340, 185);
    ctx.moveTo(440, 185); ctx.lineTo(480, 125);
    ctx.moveTo(440, 185); ctx.lineTo(480, 190);
    ctx.moveTo(440, 185); ctx.lineTo(480, 255);
    ctx.moveTo(580, 125); ctx.lineTo(660, 175);
    ctx.moveTo(580, 190); ctx.lineTo(660, 185);
    ctx.moveTo(580, 255); ctx.lineTo(660, 195);
    ctx.stroke();
    ctx.setLineDash([]);

    // Stages
    stages.forEach(s => {
      const isAck = s.label === 'Broker' && ackFlash > 0;
      drawRoundRect(ctx, s.x, s.y, s.w, s.h, 8,
        isAck ? s.color + '44' : '#1E293B',
        isAck ? s.color : s.color + '88');
      ctx.font = 'bold 11px system-ui';
      ctx.fillStyle = s.color;
      ctx.textAlign = 'center';
      ctx.fillText(s.label, s.x + s.w/2, s.y + s.h/2 + 4);
    });

    // Stage labels below
    const stageDescs = ['Order Event', 'key→bytes\nvalue→Avro', 'murmur2(key)\n% partitions', 'partition 0', 'partition 1', 'partition 2', 'Leader\n+ ISR ack'];
    stages.forEach((s, i) => {
      ctx.font = '9px system-ui';
      ctx.fillStyle = '#475569';
      ctx.textAlign = 'center';
      stageDescs[i].split('\n').forEach((line, li) => {
        ctx.fillText(line, s.x + s.w/2, s.y + s.h + 14 + li * 12);
      });
    });

    // Packets
    packets.forEach(p => p.update(dt));
    packets.forEach(p => p.draw(ctx));
    // Remove old done packets
    while (packets.length > 30) packets.shift();

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });

  tab.querySelector('#prod-send').addEventListener('click', () => spawnPacket());
  tab.querySelector('#prod-burst').addEventListener('click', () => {
    for (let i = 0; i < 10; i++) {
      setTimeout(() => spawnPacket(), i * 80);
    }
  });

  return () => { if (raf) cancelAnimationFrame(raf); };
}

function buildAmazon(container) {
  const tab = container.querySelector('#tab-amazon');
  tab.innerHTML = `
    <div class="scroll-content" style="max-width:920px;margin:0 auto">

      <!-- Hero card -->
      <div style="background:#111827;border:1px solid #FF6900;border-radius:14px;padding:20px 24px;margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#64748B;margin-bottom:8px">The producer in action</div>
        <div style="font-size:18px;font-weight:800;color:#F1F5F9;margin-bottom:4px">You click Buy Now on iPhone 15 Pro — $999</div>
        <div style="font-size:13px;color:#94A3B8">Here is exactly what the Order Service (a Kafka producer) does in the next 11 milliseconds.</div>
      </div>

      <!-- Timeline -->
      <div style="margin-bottom:32px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748B;margin-bottom:14px">Producer timeline — 11ms from click to "Order Confirmed"</div>
        ${
          [
            { ms:'0ms',   color:'#3B82F6', stage:'Your click',        desc:'Browser sends POST /orders to Order Service. The handler creates a Java OrderEvent object: {orderId:"AMZ-24601", product:"iPhone 15 Pro", price:999, userId:"U-00123", warehouseId:"SEA-2"}' },
            { ms:'2ms',   color:'#8B5CF6', stage:'Serializer',        desc:'Avro schema converts the OrderEvent object to 148 bytes of binary. The key "U-00123" is serialized separately to 7 bytes. No JSON overhead — Avro is 5× smaller than equivalent JSON.' },
            { ms:'2.5ms', color:'#F59E0B', stage:'Partitioner',       desc:'murmur2("U-00123") % 3 = 0 → Partition 0. All U-00123\'s orders always land here — guaranteeing Fulfillment processes Order #1 before Order #2.' },
            { ms:'2.6ms', color:'#FF6900', stage:'Accumulator',       desc:'Record queued in the Batch P0 deque in memory. Prime Day rate: 47 order events per batch at linger.ms=5. The producer doesn\'t send yet — it waits for the batch to fill.' },
            { ms:'7.6ms', color:'#FF6900', stage:'linger.ms fires',   desc:'5ms elapsed. Sender thread wakes up, compresses the batch with LZ4 (148B × 47 orders → 892B compressed = 5.7× ratio), and sends one TCP segment to Broker 1.' },
            { ms:'9ms',   color:'#10B981', stage:'Broker ack (ISR)',  desc:'Broker 1 writes to its log and replicates to Brokers 2 & 3. With acks=all, Order Service gets confirmation only after all 3 are written. Your order is durable on 3 machines.' },
            { ms:'11ms',  color:'#10B981', stage:'"Order Confirmed"', desc:'"Order Confirmed" renders in your browser. The Order Service returned HTTP 200. Fulfillment, Fraud Detection, and Notifications have already started reading offset 847,231.' },
          ].map((t,i) => `
          <div style="display:flex;gap:14px;margin-bottom:10px">
            <div style="flex-shrink:0;text-align:right;min-width:48px;padding-top:12px">
              <span style="font-size:10px;font-weight:700;color:${t.color};font-family:monospace">${t.ms}</span>
            </div>
            <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:center">
              <div style="width:12px;height:12px;border-radius:50%;background:${t.color};margin-top:14px;flex-shrink:0"></div>
              ${i < 6 ? `<div style="width:2px;flex:1;background:${t.color}33;min-height:20px"></div>` : ''}
            </div>
            <div style="flex:1;background:#111827;border:1px solid #1E293B;border-radius:10px;padding:12px 16px">
              <div style="font-size:12px;font-weight:700;color:${t.color};margin-bottom:4px">${t.stage}</div>
              <div style="font-size:12px;color:#94A3B8;line-height:1.65">${t.desc}</div>
            </div>
          </div>`).join('')}
      </div>

      <!-- Config explained in plain English -->
      <div style="margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748B;margin-bottom:14px">Why Amazon chose these producer settings — in plain English</div>
        <div style="display:flex;flex-direction:column;gap:10px">
          ${
            [
              { key:'acks = all',              color:'#FF6900', plain:'Every order must be written to 3 brokers before "Order Confirmed" is shown. If the network drops at 8ms, the Order Service retries — the customer never sees a failed payment followed by a missing order.' },
              { key:'enable.idempotence = true', color:'#8B5CF6', plain:'The producer assigns a unique sequence number to each record. If Order Service crashes after sending but before receiving the ack, it retries — but the broker recognises the duplicate sequence and silently drops the second copy. The customer\'s order is never double-created.' },
              { key:'linger.ms = 5',           color:'#F59E0B', plain:'Instead of sending each order event individually (47 network round-trips), the producer batches all orders that arrive within 5ms into one TCP segment. At Prime Day rates of 14,000 orders/min, this cuts network calls by 47× and improves compression.' },
              { key:'compression.type = lz4',  color:'#3B82F6', plain:'Order events are repetitive JSON-like structures (same field names, similar values). LZ4 compresses them ~5:1. The broker stores and replicates compressed data, so 1GB of orders takes only ~200MB of disk and network. LZ4 decompresses in microseconds — no latency penalty.' },
              { key:'max.in.flight = 5 (idempotent)', color:'#10B981', plain:'With idempotence enabled, up to 5 batches can be in-flight to the broker simultaneously — the broker\'s sequence tracking prevents any reordering. Without idempotence, Amazon sets this to 1 for topics where ordering is critical (payments).' },
            ].map(c => `
            <div style="background:#111827;border:1px solid #1E293B;border-radius:10px;padding:14px 18px;display:flex;gap:14px">
              <div style="flex-shrink:0;min-width:220px">
                <code style="font-size:11px;color:${c.color};background:#0A0E1A;padding:4px 8px;border-radius:5px;font-weight:700">${c.key}</code>
              </div>
              <div style="font-size:12px;color:#94A3B8;line-height:1.65">${c.plain}</div>
            </div>`).join('')}
        </div>
      </div>

      <!-- Idempotence failure scenario -->
      <div style="background:#8B5CF612;border:1.5px solid #8B5CF644;border-radius:12px;padding:18px 22px">
        <div style="font-size:13px;font-weight:700;color:#8B5CF6;margin-bottom:12px">The idempotent producer — what happens when a retry would double-charge you</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:12px">
          <div>
            <div style="color:#EF4444;font-weight:600;margin-bottom:8px">Without idempotence (dangerous)</div>
            <div style="background:#0A0E1A;border-radius:8px;padding:12px;color:#94A3B8;line-height:1.8;font-size:11px">
              1. Order Service sends order for iPhone 15 Pro<br>
              2. Broker writes it at offset 847,231 ✓<br>
              3. Network drops — ack never reaches producer<br>
              4. Producer retries — sends the same order again<br>
              5. Broker writes it <span style="color:#EF4444">again</span> at offset 847,232<br>
              <span style="color:#EF4444">→ Customer charged twice, two iPhones shipped</span>
            </div>
          </div>
          <div>
            <div style="color:#10B981;font-weight:600;margin-bottom:8px">With idempotence (safe)</div>
            <div style="background:#0A0E1A;border-radius:8px;padding:12px;color:#94A3B8;line-height:1.8;font-size:11px">
              1. Producer sends order with PID=42, seq=7<br>
              2. Broker writes it at offset 847,231 ✓<br>
              3. Network drops — ack never reaches producer<br>
              4. Producer retries — same PID=42, seq=7<br>
              5. Broker sees seq=7 already written → <span style="color:#10B981">drops silently</span><br>
              <span style="color:#10B981">→ Exactly one order, exactly one charge</span>
            </div>
          </div>
        </div>
      </div>

    </div>`;
}

function buildConfig(container) {
  const tab = container.querySelector('#tab-config');
  const configs = [
    { name: 'acks', val: 'all', desc: 'Wait for all ISR replicas to acknowledge. Maximum durability.', impact: 'high' },
    { name: 'batch.size', val: '16384', desc: 'Max bytes per batch per partition. Larger = better compression, higher latency.', impact: 'medium' },
    { name: 'linger.ms', val: '5', desc: 'Wait up to Nms for more records before sending. Increases batch fill.', impact: 'medium' },
    { name: 'compression.type', val: 'lz4', desc: 'Compress batches before sending. LZ4 = best speed/ratio for events.', impact: 'high' },
    { name: 'max.in.flight.requests', val: '1', desc: 'Set to 1 with retries enabled for strict ordering. 5 for idempotent producer.', impact: 'high' },
    { name: 'enable.idempotence', val: 'true', desc: 'Broker deduplicates retries using producer ID + sequence. Required for EOS.', impact: 'high' },
    { name: 'retries', val: '2147483647', desc: 'Retry on transient errors. Combined with delivery.timeout.ms for total timeout.', impact: 'medium' },
    { name: 'buffer.memory', val: '33554432', desc: '32MB total producer buffer. Blocks send() when full (max.block.ms).', impact: 'low' },
  ];
  tab.innerHTML = `
    <div class="config-section">
      <div class="section-header"><div class="section-title">Producer Configuration</div><div class="section-desc">Production-grade settings for Amazon order pipeline</div></div>
      <div class="config-grid">${configs.map(c => `
        <div class="config-card">
          <div class="config-name">${c.name}</div>
          <div class="config-val">= ${c.val}</div>
          <div class="config-desc">${c.desc}</div>
          <div class="config-impact impact-${c.impact}">● ${c.impact.toUpperCase()} IMPACT</div>
        </div>`).join('')}
      </div>
    </div>`;
}
