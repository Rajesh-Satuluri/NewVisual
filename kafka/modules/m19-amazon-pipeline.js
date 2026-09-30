import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { EventPacket, GlowNode, PulseRing } from '../components/canvas-primitives.js';

const IQ = [
  { q: 'Design a real-time fraud detection pipeline using Kafka for Amazon payments.', a: 'Pipeline: (1) Payment Service → Kafka topic payments (RF=3, acks=all, EOS). (2) Fraud ML Consumer Group reads payments — Kafka Streams enriches with customer history (KTable from customer-events, RocksDB state). (3) Feature extractor aggregates: 5-min rolling average spend, unique merchant count, geo-velocity. (4) Fraud model scores each payment (ONNX or SageMaker call). (5) If score > threshold → write to payments-blocked + fraud-alerts topics. (6) Alert Consumer Group → SNS → customer SMS + agent dashboard. (7) All decisions logged to S3 via Kafka Connect S3 Sink for model retraining. Total latency: <200ms from payment to block decision.', tip: 'Mention: use Kafka Streams windowed aggregations (5-min tumbling) for feature generation, not batch jobs. This is what gives sub-second fraud detection vs minutes for batch.' },
  { q: 'How would you build a real-time Amazon Prime recommendation engine on Kafka?', a: 'Architecture: (1) Clickstream Producer: every browse/view/add-to-cart event → user-activity topic (keyed by user_id for ordering). (2) Kafka Streams topology: filter, sessionize (session windows 30-min gap), extract features. (3) Feature topic → ML Consumer → SageMaker endpoint → recommendation scores → recs-by-user topic (compacted). (4) Recommendation API reads KTable built from recs-by-user via Kafka Streams interactive queries — serves homepage in <10ms. (5) Purchase events feed back into training pipeline via S3 sink. Key: the compacted recs-by-user topic is the "recommendation database" — always has the latest recs per user, queryable without a separate DB.', tip: 'The KTable-as-database pattern is the most important Kafka Streams production pattern. Show you understand that interactive queries make state stores directly queryable from application code.' },
  { q: 'What Kafka design decisions would you make for an order management system handling 1M orders/day?', a: '1M orders/day = ~12 orders/sec peak. But Amazon\'s actual peak (Prime Day): ~1000× that = 12k orders/sec. Design: (1) orders topic: 100 partitions (12k msg/s ÷ 120 msg/s per partition with headroom), RF=3, retention=7d. (2) Partition key: order_id (UUID) — even distribution, per-order ordering. (3) Producer: acks=all, enable.idempotence=true, compression=lz4. (4) Multiple consumer groups: fulfillment (reads all partitions), fraud (reads all), analytics (reads all, lag-tolerant). (5) Exactly-once for payment confirmation, at-least-once for fulfillment (idempotent by order_id upsert). (6) Dead-letter queues for failed processing. (7) Schema Registry with FULL compatibility for OrderPlaced Avro schema.', tip: 'Always size for peak load with 2× headroom, not average. Calculate: partitions = peak msg/s × headroom / partition throughput. Then round up to nearest power of 2 for easy rebalancing.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M19 · Advanced',
    title: 'Amazon Pipeline',
    subtitle: 'End-to-end: order → Kafka → 8 services → Snowflake → BI — the complete Amazon story',
    tabs: [
      { id: 'pipeline', label: '🛒 Live Pipeline' },
      { id: 'services', label: '🏗️ Service Map' },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ]
  });

  let cleanup = buildPipeline(container);
  buildServices(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

function buildPipeline(container) {
  const tab = container.querySelector('#tab-pipeline');
  tab.innerHTML = `
    <div class="canvas-wrap" style="position:relative">
      <canvas id="amz-canvas" width="820" height="480" style="width:100%;max-width:820px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="amz-order">🛒 Place Order</button>
        <button class="ctrl-btn" id="amz-fraud">🚨 Flag Fraud</button>
        <button class="ctrl-btn" id="amz-prime">⭐ Prime Order</button>
        <span class="ctrl-label">Watch events flow through the full Amazon pipeline</span>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>Each node is a separate Amazon microservice consuming the same order event from Kafka through its own independent consumer group. When you place an order, a single <code>OrderPlaced</code> event is written once to Kafka — and from that one write, <strong>five downstream services simultaneously receive their own copy</strong> with zero coupling between them. The Inventory Service doesn't know the Fraud Service exists. The Notification Service doesn't know about Recommendations. Each team deploys and scales independently.</p>
      <p>This fan-out pattern is why Kafka replaced point-to-point REST calls inside Amazon's order pipeline. Before Kafka, adding the Recommendations Service meant the Order Service team had to add a new outbound HTTP call, handle timeouts, manage retries, and coordinate deployments with another team. After Kafka, the Recommendations team created a new consumer group pointing at the existing topic — the Order Service team made zero changes and was never consulted.</p>
      <p>Notice the <strong>Snowflake DW</strong> node receiving events via Kafka Connect Sink — this is the analytics copy, lag-tolerant, accumulating every event from every topic for business intelligence queries. The <strong>BI Dashboard</strong> then queries Snowflake rather than touching production Kafka at all. This separation of operational consumers (low-latency, sub-second SLA) from analytical consumers (batch-tolerant, minutes of acceptable lag) running on the same cluster and same topic is a core architectural pattern at Amazon, Netflix, and LinkedIn.</p>
    </div>`;

  const canvas = tab.querySelector('#amz-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  const SERVICES = [
    { id: 'order',    label: 'Order\nService',    x: 60,  y: 220, color: '#FF6900' },
    { id: 'kafka',    label: 'Kafka\nCluster',    x: 220, y: 220, color: '#FF6900' },
    { id: 'inv',      label: 'Inventory',         x: 420, y: 80,  color: '#3B82F6' },
    { id: 'payment',  label: 'Payment',           x: 420, y: 150, color: '#10B981' },
    { id: 'fraud',    label: 'Fraud\nDetect',     x: 420, y: 220, color: '#EF4444' },
    { id: 'notif',    label: 'Notifications',     x: 420, y: 290, color: '#F59E0B' },
    { id: 'rec',      label: 'Recommendations',  x: 420, y: 360, color: '#8B5CF6' },
    { id: 'snow',     label: 'Snowflake\nDW',    x: 620, y: 150, color: '#29B5E8' },
    { id: 'bi',       label: 'BI\nDashboard',    x: 780, y: 150, color: '#6366F1' },
  ];

  const glowNodes = SERVICES.map(s => new GlowNode({ x: s.x, y: s.y, r: 30, color: s.color, label: s.label.split('\n')[0], active: true }));
  const packets = [];
  const rings = [];
  let raf = null, lastT = 0, tick = 0;
  let orderCount = 0;

  function spawnOrderFlow(type) {
    const color = type === 'fraud' ? '#EF4444' : type === 'prime' ? '#FFD700' : '#FF6900';
    const label = type === 'fraud' ? 'FRAUD' : type === 'prime' ? 'PRIME' : `ord-${++orderCount}`;

    // Order → Kafka
    packets.push(new EventPacket({
      label, color,
      path: [{ x: 90, y: 220 }, { x: 220, y: 220 }],
      speed: 1.4,
      onArrive: () => {
        rings.push(new PulseRing({ x: 220, y: 220, color, maxR: 50, duration: 0.6 }));
        // Kafka → services
        const targets = SERVICES.filter(s => !['order','kafka'].includes(s.id));
        targets.forEach((svc, i) => {
          setTimeout(() => {
            const skip = type === 'fraud' && svc.id !== 'fraud';
            if (!skip || svc.id === 'snow') {
              packets.push(new EventPacket({
                label: svc.label.split('\n')[0].slice(0,5),
                color: svc.color,
                path: [{ x: 260, y: 220 }, { x: svc.x, y: svc.y }],
                speed: 1.0,
                onArrive: () => {
                  rings.push(new PulseRing({ x: svc.x, y: svc.y, color: svc.color, maxR: 35, duration: 0.5 }));
                  if (svc.id === 'snow') {
                    setTimeout(() => {
                      packets.push(new EventPacket({
                        label: 'BI',
                        color: '#6366F1',
                        path: [{ x: 650, y: 150 }, { x: 780, y: 150 }],
                        speed: 1.2,
                      }));
                    }, 300);
                  }
                }
              }));
            }
          }, i * 120);
        });
      }
    }));
  }

  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05);
    lastT = ts;
    tick++;

    if (tick % 180 === 0) spawnOrderFlow('normal');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Connections from Kafka
    SERVICES.filter(s => !['order','kafka','snow','bi'].includes(s.id)).forEach(svc => {
      ctx.beginPath();
      ctx.moveTo(260, 220);
      ctx.lineTo(svc.x, svc.y);
      ctx.strokeStyle = svc.color + '33';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Snowflake → BI
    ctx.beginPath();
    ctx.moveTo(650, 150); ctx.lineTo(750, 150);
    ctx.strokeStyle = '#6366F133';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Order → Kafka
    ctx.beginPath();
    ctx.moveTo(90, 220); ctx.lineTo(190, 220);
    ctx.strokeStyle = '#FF690066';
    ctx.lineWidth = 2;
    ctx.stroke();

    glowNodes.forEach((g, i) => {
      g.update(dt);
      g.draw(ctx);
      const s = SERVICES[i];
      ctx.font = '8px system-ui';
      ctx.fillStyle = '#475569';
      ctx.textAlign = 'center';
      if (s.label.includes('\n')) {
        ctx.fillText(s.label.split('\n')[1], s.x, s.y + 44);
      }
    });

    packets.forEach(p => { p.update(dt); p.draw(ctx); });
    rings.forEach(r => { r.update(dt); r.draw(ctx); });
    while (packets.length > 40) packets.shift();

    // Label
    ctx.font = 'bold 11px system-ui';
    ctx.fillStyle = '#64748B';
    ctx.textAlign = 'left';
    ctx.fillText('Orders placed: ' + orderCount, 40, 430);
    ctx.fillText('All services receive every order event independently', 40, 448);

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });

  tab.querySelector('#amz-order').addEventListener('click', () => spawnOrderFlow('normal'));
  tab.querySelector('#amz-fraud').addEventListener('click', () => spawnOrderFlow('fraud'));
  tab.querySelector('#amz-prime').addEventListener('click', () => spawnOrderFlow('prime'));

  return () => { if (raf) cancelAnimationFrame(raf); };
}

function buildServices(container) {
  const tab = container.querySelector('#tab-services');
  const services = [
    { name: 'Order Service', icon: '🛒', color: '#FF6900', topic: 'orders (produce)', desc: 'Writes OrderPlaced events. Uses EOS transactions — payment + order atomic. acks=all, enable.idempotence=true.' },
    { name: 'Inventory Service', icon: '📦', color: '#3B82F6', topic: 'orders (consume)', desc: 'Consumes OrderPlaced, decrements inventory in DynamoDB. Idempotent upsert by order_id prevents double-decrement.' },
    { name: 'Payment Service', icon: '💳', color: '#10B981', topic: 'payments (produce/consume)', desc: 'Charges customer card, produces PaymentConfirmed. Kafka Streams joins order + payment for reconciliation.' },
    { name: 'Fraud Detection', icon: '🔍', color: '#EF4444', topic: 'orders, payments (consume)', desc: 'ML scoring in <200ms. Kafka Streams windowed aggregations for features. Writes to fraud-alerts + payments-blocked.' },
    { name: 'Notification Service', icon: '🔔', color: '#F59E0B', topic: 'order-status (consume)', desc: 'Sends email/SMS/push on order confirmation, shipping, delivery. At-least-once with SNS dedup on customer side.' },
    { name: 'Recommendation Engine', icon: '⭐', color: '#8B5CF6', topic: 'user-activity (consume)', desc: 'Kafka Streams session windows on clickstream → ML features → recs-by-user (compacted) → homepage API.' },
    { name: 'Snowflake DWH', icon: '❄️', color: '#29B5E8', topic: 'all topics (Kafka Connect Sink)', desc: 'Confluent Snowflake Sink Connector streams all topics to Snowflake. Business analysts query in near-real-time (lag ~30s).' },
    { name: 'BI Dashboard', icon: '📊', color: '#6366F1', topic: 'Snowflake (query)', desc: 'Grafana + Superset dashboards on Snowflake. Prime Day GMV by category, order funnel, fraud rate — live.' },
  ];
  tab.innerHTML = `
    <div class="info-grid">
      ${services.map(s => `
        <div class="info-card" style="border-left:3px solid ${s.color}">
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
            <span style="font-size:20px">${s.icon}</span>
            <div>
              <div class="info-card-title">${s.name}</div>
              <div class="info-card-tag" style="color:${s.color};background:${s.color}22">${s.topic}</div>
            </div>
          </div>
          <div class="info-card-body">${s.desc}</div>
        </div>`).join('')}
    </div>`;
}
