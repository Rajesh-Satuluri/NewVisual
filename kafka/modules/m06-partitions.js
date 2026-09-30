import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { SparkLine } from '../components/canvas-primitives.js';

const IQ = [
  { q: 'How do you choose the right number of partitions for a topic?', a: 'Target throughput / (partition throughput). Partition throughput: ~10MB/s write, ~50MB/s read per partition (disk I/O bound). Rule of thumb: partition count = max(T/10, desired consumer parallelism). Over-partitioning increases file handles, leader election cost, and end-to-end latency. Under-partitioning limits consumer parallelism. For Amazon orders at 1GB/s: ~100 partitions. Cannot reduce partition count after creation (only increase).', tip: 'Mention: more partitions = more files, more replication traffic, higher minimum latency (each extra partition adds ~1ms to a broker\'s produce loop).' },
  { q: 'What is a hot partition and how do you fix it?', a: 'A hot partition receives disproportionate traffic because many records share the same partition key. E.g., if key=country and 80% of orders are US, partition 0 gets 80% of load. Fix options: (1) Better key — use customer_id or order_id for even distribution. (2) Key salting — append random suffix to key, then strip in consumer. (3) Custom partitioner — route based on business logic. (4) More partitions — doesn\'t help if key cardinality is low.', tip: 'Amazon fraud detection story: keying by payment_method caused hot partition for "credit card". Switched to hash(customer_id) for even distribution.' },
  { q: 'Why does Kafka only guarantee ordering within a partition, not across partitions?', a: 'Each partition is a single ordered log maintained by one leader broker. Ordering across partitions would require a distributed transaction log — prohibitively expensive at scale. For entities that require ordering (e.g., all events for order #12345 in sequence), use the order ID as the partition key: all events route to the same partition and are consumed in order. If you need total ordering across all events, use a single-partition topic (forfeiting parallelism).', tip: 'State the tradeoff explicitly: ordering guarantees come at the cost of parallelism. Single-partition = total order but 1 consumer max.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M06 · Core Internals',
    title: 'Partitions',
    subtitle: 'Distribution, ordering, parallelism, hot partitions — decisions Amazon makes for every topic',
    tabs: [
      { id: 'balance', label: '⚖️ Load Distribution' },
      { id: 'hot',     label: '🔥 Hot Partition Demo' },
      { id: 'amazon',  label: '📦 Amazon Partitioning' },
      { id: 'iq',      label: '🎯 Interview Q&A' },
    ]
  });

  let cleanup = buildBalance(container);
  buildHot(container);
  buildAmazon(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

function buildBalance(container) {
  const tab = container.querySelector('#tab-balance');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <canvas id="part-canvas" width="820" height="360" style="width:100%;max-width:820px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="part-uniform">✅ Uniform Keys (order_id)</button>
        <button class="ctrl-btn" id="part-hot">🔥 Hot Keys (country)</button>
        <span class="ctrl-label">Producer partition assignment by key hash</span>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>Each sparkline shows the per-second message rate arriving at one partition (P0–P4). In <strong>Uniform Keys</strong> mode, the producer keys every record with a high-cardinality value like <code>order_id</code> — a UUID. Kafka's murmur2 hash distributes UUIDs nearly uniformly, so all five charts show similar heights and each consumer thread carries an equal share of the work.</p>
      <p>Switch to <strong>Hot Keys</strong> mode to simulate a producer using <code>country</code> as the partition key. If 80% of Amazon orders originate from US customers, 80% of records hash to whichever partition "US" maps to — one sparkline dominates while the rest starve. This is a <strong>hot partition</strong>: one consumer thread is overwhelmed, the others are idle, and you can't fix it by adding more consumers since each partition has at most one owner per group.</p>
      <p>The fix is a key with higher cardinality. <code>customer_id</code> or <code>order_id</code> distribute evenly because there are millions of distinct values. For cases where the key is inherently low-cardinality but ordering must be preserved per key, <strong>key salting</strong> appends a random suffix (e.g., <code>US-3</code>) to spread load, then strips it in the consumer before processing. Note: you cannot reduce the partition count of an existing topic — only increase it, which breaks per-key ordering for existing consumers until they restart.</p>
    </div>`;

  const canvas = tab.querySelector('#part-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  const P_COUNT = 5;
  const sparklines = [];
  const counters = new Array(P_COUNT).fill(0);
  let isHot = false;
  let raf = null;
  let lastT = 0;
  let tick = 0;

  for (let i = 0; i < P_COUNT; i++) {
    sparklines.push(new SparkLine({
      x: 40 + i * 150, y: 50, w: 130, h: 100,
      color: '#FF6900',
      label: `P${i}`,
      maxVal: 200
    }));
  }

  let simTick = 0;

  function simulate() {
    simTick++;
    if (simTick % 30 !== 0) return;
    for (let i = 0; i < P_COUNT; i++) {
      if (isHot) {
        counters[i] = i === 0 ? 150 + Math.random() * 50 : 5 + Math.random() * 15;
      } else {
        counters[i] = 80 + Math.random() * 40;
      }
      sparklines[i].push(counters[i]);
    }
  }

  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05);
    lastT = ts;

    simulate();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = 'bold 12px system-ui';
    ctx.fillStyle = '#94A3B8';
    ctx.textAlign = 'left';
    ctx.fillText(`Partition Throughput — ${isHot ? '🔥 HOT KEY MODE (country)' : '✅ BALANCED MODE (order_id)'}`, 40, 30);

    sparklines.forEach((sl, i) => {
      if (isHot && i === 0) sl.color = '#EF4444';
      else sl.color = '#FF6900';
      sl.draw(ctx);
    });

    // Labels
    for (let i = 0; i < P_COUNT; i++) {
      ctx.font = '11px system-ui';
      ctx.fillStyle = '#64748B';
      ctx.textAlign = 'center';
      ctx.fillText(`msgs/s: ${Math.round(counters[i])}`, 40 + i * 150 + 65, 175);
      if (isHot && i === 0) {
        ctx.fillStyle = '#EF4444';
        ctx.fillText('HOT!', 40 + i * 150 + 65, 192);
      }
    }

    // Key routing legend
    ctx.font = '10px system-ui';
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'left';
    ctx.fillText(isHot
      ? 'Key: country → 80% traffic has key="US" → all land in P0'
      : 'Key: order_id → high cardinality → murmur2 hash evenly distributes',
      40, 230);

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });

  tab.querySelector('#part-uniform').addEventListener('click', () => {
    isHot = false;
    tab.querySelector('#part-uniform').classList.add('active');
    tab.querySelector('#part-hot').classList.remove('active');
  });
  tab.querySelector('#part-hot').addEventListener('click', () => {
    isHot = true;
    tab.querySelector('#part-hot').classList.add('active');
    tab.querySelector('#part-uniform').classList.remove('active');
  });

  return () => { if (raf) cancelAnimationFrame(raf); };
}

function buildAmazon(container) {
  const tab = container.querySelector('#tab-amazon');
  tab.innerHTML = `
    <div class="scroll-content" style="max-width:920px;margin:0 auto">

      <!-- Hero -->
      <div style="background:#111827;border:1px solid #FF6900;border-radius:14px;padding:20px 24px;margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#64748B;margin-bottom:8px">Design decisions</div>
        <div style="font-size:18px;font-weight:800;color:#F1F5F9;margin-bottom:4px">How Amazon engineers decide partition count and keys for every topic</div>
        <div style="font-size:13px;color:#94A3B8">Two decisions made once at topic creation that can never be cleanly undone — get them right the first time.</div>
      </div>

      <!-- Partition count decision -->
      <div style="margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748B;margin-bottom:14px">Step 1: How many partitions? — The orders topic</div>
        <div style="background:#111827;border:1px solid #1E293B;border-radius:12px;padding:18px 22px;margin-bottom:12px">
          <div style="font-size:13px;font-weight:700;color:#F1F5F9;margin-bottom:12px">The calculation</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;font-size:12px;margin-bottom:14px">
            <div style="background:#0A0E1A;border-radius:8px;padding:12px;text-align:center">
              <div style="font-size:20px;font-weight:800;color:#FF6900">50,000</div>
              <div style="color:#64748B;margin-top:4px">events/sec peak<br>(Prime Day orders)</div>
            </div>
            <div style="background:#0A0E1A;border-radius:8px;padding:12px;text-align:center">
              <div style="font-size:20px;font-weight:800;color:#3B82F6">20,000</div>
              <div style="color:#64748B;margin-top:4px">events/sec per<br>Fulfillment consumer</div>
            </div>
            <div style="background:#0A0E1A;border-radius:8px;padding:12px;text-align:center">
              <div style="font-size:20px;font-weight:800;color:#10B981">3</div>
              <div style="color:#64748B;margin-top:4px">partitions needed<br>(50k ÷ 20k = 2.5 → 3)</div>
            </div>
          </div>
          <div style="background:#F59E0B12;border:1px solid #F59E0B33;border-radius:8px;padding:12px 14px;font-size:12px;color:#94A3B8;line-height:1.7">
            <strong style="color:#F59E0B">Amazon chose 6, not 3.</strong> They over-partitioned 2× so they could scale Fulfillment consumers from 3 to 6 without repartitioning. Increasing partition count is safe; reducing it is not (it reshuffles keys and breaks per-customer ordering). When in doubt: partition count that handles 2× your expected peak load.
          </div>
        </div>
        <div style="background:#EF444412;border:1px solid #EF444433;border-radius:10px;padding:12px 16px;font-size:12px;color:#94A3B8;line-height:1.7">
          <strong style="color:#EF4444">What you cannot do after topic creation:</strong> decrease partition count, or change the key hashing scheme. If you add partitions (orders 3→6), records that were in P2 may now hash to different partitions — breaking the per-customer ordering guarantee for customers already being processed. Amazon freezes the partition count once set on production order topics.
        </div>
      </div>

      <!-- Key strategy per topic -->
      <div style="margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748B;margin-bottom:14px">Step 2: What key to use — different answer for every topic</div>
        <div style="overflow-x:auto;border-radius:10px;border:1px solid #1E293B">
          <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:700px">
            <thead><tr style="background:#0F172A;border-bottom:1px solid #1E293B">
              <th style="padding:10px 14px;text-align:left;color:#64748B;font-size:10px;text-transform:uppercase;letter-spacing:.06em">Topic</th>
              <th style="padding:10px 14px;text-align:left;color:#64748B;font-size:10px;text-transform:uppercase;letter-spacing:.06em">Key Used</th>
              <th style="padding:10px 14px;text-align:left;color:#64748B;font-size:10px;text-transform:uppercase;letter-spacing:.06em">Why This Key</th>
              <th style="padding:10px 14px;text-align:left;color:#64748B;font-size:10px;text-transform:uppercase;letter-spacing:.06em">What Would Break With Wrong Key</th>
            </tr></thead>
            <tbody>
              ${
                [
                  ['orders','customer_id','All of a customer\'s orders land on the same partition. Fulfillment processes Order #1 before Order #2 for the same customer — always.','region → P0 gets 65% US traffic (hot partition). order_id → random partition, no per-customer order guarantee.'],
                  ['payments','order_id','All lifecycle events for one payment (initiated → authorized → captured → refunded) land on the same partition and are processed in sequence.','customer_id → a customer buying 10 items causes 10 payment events, mixing different orders on same partition with no useful ordering.'],
                  ['inventory-updates','product_id','All stock changes for the same product (warehouse receives 500 units, someone buys one, someone returns one) are processed in sequence — stock count never goes negative due to ordering.','null → stock increments and decrements for the same product can arrive out of order, leading to phantom inventory.'],
                  ['click-events','null (no key)','Nobody cares about the order of click events. Maximum throughput matters — null triggers sticky partitioner, filling batches efficiently across all partitions.','customer_id → each unique customer is a key; high cardinality is fine but adds unnecessary serialization overhead with zero benefit.'],
                  ['shipping-events','order_id','Order #12345 lifecycle: Packed → Shipped → Out for delivery → Delivered must be in this exact sequence for the Notifications service to send the right message.','null → Delivered event could arrive before Shipped. Notifications sends "Your order is delivered" before "Your order has shipped" — confusing.'],
                ].map(([t,k,why,wrong]) => `
                <tr style="border-bottom:1px solid #0F172A">
                  <td style="padding:10px 14px;color:#FF6900;font-family:monospace;font-size:11px">${t}</td>
                  <td style="padding:10px 14px;color:#06B6D4;font-family:monospace;font-size:11px">${k}</td>
                  <td style="padding:10px 14px;color:#F1F5F9;font-size:12px;line-height:1.55">${why}</td>
                  <td style="padding:10px 14px;color:#EF4444;font-size:11px;line-height:1.55">${wrong}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- The US-region mistake visual -->
      <div style="background:#EF444412;border:1.5px solid #EF444444;border-radius:12px;padding:18px 22px">
        <div style="font-size:13px;font-weight:700;color:#EF4444;margin-bottom:12px">What would have happened if Amazon used region as the orders key</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:12px">
          <div>
            <div style="color:#EF4444;font-weight:600;margin-bottom:8px">region key — catastrophic skew</div>
            <div style="background:#0A0E1A;border-radius:8px;padding:12px;font-size:11px;color:#94A3B8;line-height:1.9">
              P0 (US) &nbsp;&nbsp;&nbsp; → <span style="color:#EF4444">████████████████ 65%</span><br>
              P1 (EU) &nbsp;&nbsp;&nbsp; → <span style="color:#F59E0B">█████ 20%</span><br>
              P2 (APAC) → <span style="color:#94A3B8">███ 10%</span><br>
              P3 (LATAM) → <span style="color:#475569">█ 5%</span><br>
              <span style="color:#64748B;font-size:10px;display:block;margin-top:6px">P0 consumer handles 13× more work than P3 consumer.<br>Fulfillment for US orders backs up. US customers wait 10 minutes for order confirmation during Prime Day.</span>
            </div>
          </div>
          <div>
            <div style="color:#10B981;font-weight:600;margin-bottom:8px">customer_id key — even spread</div>
            <div style="background:#0A0E1A;border-radius:8px;padding:12px;font-size:11px;color:#94A3B8;line-height:1.9">
              P0 → <span style="color:#10B981">████ 25%</span><br>
              P1 → <span style="color:#10B981">████ 25%</span><br>
              P2 → <span style="color:#10B981">████ 25%</span><br>
              P3 → <span style="color:#10B981">████ 25%</span><br>
              <span style="color:#64748B;font-size:10px;display:block;margin-top:6px">300M+ unique customer IDs → perfect hash distribution.<br>Each Fulfillment consumer handles exactly the same load. No lag on any partition.</span>
            </div>
          </div>
        </div>
      </div>

    </div>`;
}

function buildHot(container) {
  const tab = container.querySelector('#tab-hot');
  tab.innerHTML = `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Hot Partition Causes and Fixes</div></div>
      <div class="info-grid">
        <div class="info-card" style="border-left:3px solid #EF4444">
          <div class="info-card-icon">❌</div>
          <div class="info-card-title">Bad Key: country</div>
          <div class="info-card-body">80% of Amazon orders are US-based. All US orders land in P0. P0 broker is saturated; P1-P4 are idle. Consumer for P0 can't keep up — lag grows.</div>
          <div class="info-card-tag">ANTI-PATTERN</div>
        </div>
        <div class="info-card" style="border-left:3px solid #EF4444">
          <div class="info-card-icon">❌</div>
          <div class="info-card-title">Bad Key: payment_type</div>
          <div class="info-card-body">Amazon Payments: 70% credit card, 20% Prime Wallet, 10% other. Three distinct buckets — maximum 3-way parallelism regardless of partition count.</div>
          <div class="info-card-tag">ANTI-PATTERN</div>
        </div>
        <div class="info-card" style="border-left:3px solid #10B981">
          <div class="info-card-icon">✅</div>
          <div class="info-card-title">Good Key: order_id</div>
          <div class="info-card-body">UUID or monotonic ID — high cardinality, uniform murmur2 hash distribution. All events for order #XYZ land in same partition (ordering preserved). Even load across all partitions.</div>
          <div class="info-card-tag">RECOMMENDED</div>
        </div>
        <div class="info-card" style="border-left:3px solid #10B981">
          <div class="info-card-icon">✅</div>
          <div class="info-card-title">Fix: Key Salting</div>
          <div class="info-card-body">Append random suffix: key = country + ":" + random(0,9). Consumer strips suffix before processing. Trades strict per-country ordering for even distribution. Good for analytics topics.</div>
          <div class="info-card-tag">WORKAROUND</div>
        </div>
        <div class="info-card" style="border-left:3px solid #F59E0B">
          <div class="info-card-icon">⚠️</div>
          <div class="info-card-title">No Key (null)</div>
          <div class="info-card-body">Sticky partitioner: fills one partition batch before moving to next. Even distribution over time but no ordering guarantee. Use for log-style topics where order doesn't matter.</div>
          <div class="info-card-tag">SITUATIONAL</div>
        </div>
        <div class="info-card" style="border-left:3px solid #8B5CF6">
          <div class="info-card-icon">🔧</div>
          <div class="info-card-title">Custom Partitioner</div>
          <div class="info-card-body">Implement Partitioner interface. Route Prime members to dedicated partitions for priority processing. Mix key-based and round-robin logic. Full control at the cost of complexity.</div>
          <div class="info-card-tag">ADVANCED</div>
        </div>
      </div>
    </div>`;
}
