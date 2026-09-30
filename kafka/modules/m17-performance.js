import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { SparkLine } from '../components/canvas-primitives.js';

const IQ = [
  { q: 'How would you tune a Kafka producer for maximum throughput?', a: 'Key settings for throughput: (1) batch.size=1048576 (1MB) — larger batches amortize overhead. (2) linger.ms=20–50 — wait to fill batches. (3) compression.type=lz4 — best speed/ratio for events. (4) buffer.memory=134217728 (128MB) — more buffer = more batching headroom. (5) acks=1 — leader ACK only (skip if durability required). (6) max.in.flight.requests.per.connection=5 (with enable.idempotence=true). (7) Multiple producer threads per application instance. Benchmark: kafka-producer-perf-test.sh with these settings to find your NIC bottleneck.', tip: 'The goal is: network utilization ~100%, CPU ~20–40%, disk sequential. If CPU is high, add more compression threads. If network is saturated, add brokers.' },
  { q: 'How do you tune a consumer for maximum throughput?', a: '(1) fetch.min.bytes=1048576 — don\'t return until 1MB available, larger batches. (2) fetch.max.wait.ms=500 — wait up to 500ms for fetch.min.bytes. (3) max.poll.records=5000 — process up to 5000 records per poll. (4) max.partition.fetch.bytes=10485760 — 10MB max per partition per fetch. (5) Increase partition count = more consumers in parallel. (6) Move slow processing to async threads — never block poll() for more than max.poll.interval.ms. (7) Use Kafka Streams or Flink instead of raw consumer for complex processing.', tip: 'Consumer throughput is often limited by processing speed, not Kafka. Profile your processing code first before tuning Kafka settings.' },
  { q: 'What hardware profile gives the best Kafka broker performance?', a: 'Kafka is I/O and network bound, not compute bound. Optimal hardware: (1) CPU: 8–16 cores sufficient. High-core-count CPUs are wasted — avoid. (2) RAM: 32–64GB. Keep 24–48GB for OS page cache, 6–8GB JVM heap. Page cache is Kafka\'s read cache. (3) Disk: SSD NVMe >> spinning HDD. 6× faster sequential write. For RAID, use RAID-10 for reliability or JBOD (Kafka handles replication). (4) Network: 10 Gbps minimum. 25 Gbps for high-throughput clusters. RF=3 means each written byte travels the network 3× total. (5) Multiple disks: spread log.dirs across multiple mount points for parallel I/O.', tip: 'The single biggest performance upgrade for an existing cluster is usually spinning HDD → SSD. Second is 1Gbps → 10Gbps NIC.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M17 · Operations',
    title: 'Performance Tuning',
    subtitle: 'Producer, consumer, and broker configs with animated impact meters',
    tabs: [
      { id: 'producer', label: '⚡ Producer Tuning' },
      { id: 'consumer', label: '📥 Consumer Tuning' },
      { id: 'broker',   label: '🖥️ Broker Tuning' },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ]
  });

  let cleanup = buildProducer(container);
  buildConsumerTab(container);
  buildBroker(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

function buildProducer(container) {
  const tab = container.querySelector('#tab-producer');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <canvas id="perf-canvas" width="820" height="260" style="width:100%;max-width:820px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="perf-default">📊 Default Config</button>
        <button class="ctrl-btn" id="perf-tuned">🚀 Tuned Config</button>
        <span class="ctrl-label" id="perf-label">Default: ~100k msg/s</span>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>The two sparklines compare <strong>produce rate (msg/s)</strong> and <strong>P99 latency (ms)</strong> between Default and Tuned producer configurations. Default config optimizes for latency — records send almost immediately (<code>linger.ms=0</code>, <code>batch.size=16KB</code>) so each network round-trip carries very few records. This achieves low latency but poor throughput: you're paying full TCP overhead per tiny batch.</p>
      <p>Tuned config flips the trade-off. Larger <code>batch.size</code> (1 MB) and a non-zero <code>linger.ms</code> (20ms) let the accumulator fill before sending, so each TCP segment carries hundreds or thousands of records. Combined with <code>compression.type=lz4</code>, this reduces both network bytes and broker write I/O. The throughput jump from ~100k to ~1.8M msg/s comes entirely from these three config changes — no hardware change required.</p>
      <p>The configs below the chart are interdependent — tuning one without the others is the most common producer misconfiguration. <code>batch.size</code> sets the ceiling; <code>linger.ms</code> controls how long to wait to reach it; <code>buffer.memory</code> must be large enough to hold all in-flight batches or the producer will block. At Amazon-scale throughput, all three are set together as a unit, not individually.</p>
    </div>
    <div class="config-section">
      <div class="config-grid" id="prod-configs"></div>
    </div>`;

  const canvas = tab.querySelector('#perf-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  const throughput = new SparkLine({ x: 20, y: 20, w: 380, h: 120, color: '#FF6900', label: 'Produce rate (msg/s)', maxVal: 2000000 });
  const latency    = new SparkLine({ x: 420, y: 20, w: 380, h: 120, color: '#3B82F6', label: 'P99 latency (ms)', maxVal: 500 });

  let tuned = false;
  let raf = null, lastT = 0, tick = 0;

  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05);
    lastT = ts;
    tick++;

    if (tick % 15 === 0) {
      if (tuned) {
        throughput.push(1800000 + Math.random() * 150000);
        latency.push(8 + Math.random() * 4);
      } else {
        throughput.push(100000 + Math.random() * 20000);
        latency.push(120 + Math.random() * 30);
      }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    throughput.draw(ctx);
    latency.draw(ctx);

    ctx.font = 'bold 11px system-ui';
    ctx.fillStyle = tuned ? '#10B981' : '#F59E0B';
    ctx.textAlign = 'left';
    ctx.fillText(tuned ? '🚀 TUNED: ~1.8M msg/s, 8ms p99' : '📊 DEFAULT: ~100k msg/s, 120ms p99', 20, 170);

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });

  const configs = [
    { name: 'batch.size', default: '16384', tuned: '1048576', impact: 'high', desc: 'Larger batch = better compression ratio and fewer network round trips.' },
    { name: 'linger.ms', default: '0', tuned: '20', impact: 'high', desc: 'Wait 20ms to fill larger batches. Trades latency for throughput.' },
    { name: 'compression.type', default: 'none', tuned: 'lz4', impact: 'high', desc: 'LZ4 reduces network bytes by 3-5x with minimal CPU overhead.' },
    { name: 'buffer.memory', default: '33554432', tuned: '134217728', impact: 'medium', desc: 'More buffer memory = more headroom for batching before back-pressure.' },
  ];
  tab.querySelector('#prod-configs').innerHTML = configs.map(c => `
    <div class="config-card">
      <div class="config-name">${c.name}</div>
      <div class="config-val">default: ${c.default} → tuned: ${c.tuned}</div>
      <div class="config-desc">${c.desc}</div>
      <div class="config-impact impact-${c.impact}">● ${c.impact.toUpperCase()} IMPACT</div>
    </div>`).join('');

  const label = tab.querySelector('#perf-label');
  tab.querySelector('#perf-default').addEventListener('click', () => { tuned = false; label.textContent = 'Default: ~100k msg/s'; });
  tab.querySelector('#perf-tuned').addEventListener('click', () => { tuned = true; label.textContent = 'Tuned: ~1.8M msg/s'; });

  return () => { if (raf) cancelAnimationFrame(raf); };
}

function buildConsumerTab(container) {
  const tab = container.querySelector('#tab-consumer');
  const configs = [
    { name: 'fetch.min.bytes', val: '1048576', impact: 'high', desc: 'Wait until 1MB available before returning. Reduces broker CPU, increases batch size.' },
    { name: 'fetch.max.wait.ms', val: '500', impact: 'medium', desc: 'Max wait time for fetch.min.bytes. Balances latency vs throughput.' },
    { name: 'max.poll.records', val: '5000', impact: 'high', desc: 'Process 5000 records per poll. Ensure processing completes within max.poll.interval.ms.' },
    { name: 'max.partition.fetch.bytes', val: '10485760', impact: 'medium', desc: '10MB per partition per fetch. Increase for large-value topics.' },
    { name: 'session.timeout.ms', val: '45000', impact: 'medium', desc: 'How long before consumer is declared dead. Balance failure detection vs false rebalances.' },
    { name: 'max.poll.interval.ms', val: '300000', impact: 'high', desc: 'Max time between poll() calls. Increase for slow processing workloads.' },
  ];
  tab.innerHTML = `
    <div class="config-section">
      <div class="section-header"><div class="section-title">Consumer Tuning Configs</div><div class="section-desc">Optimize for throughput without violating poll interval</div></div>
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

function buildBroker(container) {
  const tab = container.querySelector('#tab-broker');
  const hardware = [
    { component: 'CPU', optimal: '8–16 cores', reason: 'Kafka is I/O bound, not compute. More cores rarely help after 16.' },
    { component: 'RAM', optimal: '32–64 GB', reason: 'Keep 24–48GB free for OS page cache. JVM heap: 6–8GB max.' },
    { component: 'Disk', optimal: 'NVMe SSD × 4+', reason: '6× faster than HDD. Multiple disks in log.dirs for parallel I/O.' },
    { component: 'Network', optimal: '10–25 Gbps', reason: 'RF=3: each byte travels 3× over network. NIC is the real bottleneck.' },
  ];
  const brokerConfigs = [
    { name: 'log.dirs', val: '/disk1/kafka,/disk2/kafka,/disk3/kafka', desc: 'Spread across multiple disks for parallel I/O.' },
    { name: 'num.network.threads', val: '8', desc: 'Network handler threads. Match to NIC throughput. Default 3.' },
    { name: 'num.io.threads', val: '16', desc: 'Disk I/O threads. Match to num disks × 4. Default 8.' },
    { name: 'socket.send.buffer.bytes', val: '102400', desc: 'TCP send buffer. Increase for high-throughput cross-AZ replication.' },
    { name: 'replica.fetch.max.bytes', val: '10485760', desc: 'Max bytes per fetch from leader. Increase for large message replication.' },
    { name: 'log.segment.bytes', val: '536870912', desc: '512MB segments. Smaller than default 1GB for faster retention/compaction.' },
  ];
  tab.innerHTML = `
    <div class="compare-table-wrap">
      <div class="section-header"><div class="section-title">Hardware Recommendations</div></div>
      <table class="compare-table">
        <thead><tr><th>Component</th><th>Optimal</th><th>Rationale</th></tr></thead>
        <tbody>${hardware.map(h => `<tr><td style="font-weight:600;color:var(--text)">${h.component}</td><td style="color:var(--green);font-weight:600">${h.optimal}</td><td>${h.reason}</td></tr>`).join('')}</tbody>
      </table>
    </div>
    <div class="config-section">
      <div class="section-title" style="margin-bottom:16px">Broker Config Tuning</div>
      <div class="config-grid">${brokerConfigs.map(c => `
        <div class="config-card">
          <div class="config-name">${c.name}</div>
          <div class="config-val">= ${c.val}</div>
          <div class="config-desc">${c.desc}</div>
        </div>`).join('')}
      </div>
    </div>`;
}
