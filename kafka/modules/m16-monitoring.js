import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { SparkLine, LagBar } from '../components/canvas-primitives.js';

const IQ = [
  { q: 'What are the top 5 Kafka metrics every data engineer must monitor?', a: '1. Consumer lag (kafka.consumer:type=consumer-fetch-manager-metrics,client-id=*,topic=*,partition=* records-lag): rising lag = consumer can\'t keep up. 2. Under-replicated partitions (UnderReplicatedPartitions on kafka.server:type=ReplicaManager): >0 means durability risk. 3. ISR shrink rate (IsrShrinksPerSec): broker falling out of ISR — disk, GC, or network issue. 4. Producer request latency (ProduceRequestMs p99): high latency = back-pressure upstream. 5. ActiveControllerCount: must be exactly 1. 0 = cluster leaderless; >1 = split-brain (impossible in normal KRaft but alert anyway).', tip: 'Consumer lag is the most operationally important — it is the first symptom of almost every Kafka problem. Alert at lag > 10k records or lag > 5 minutes of production rate.' },
  { q: 'How do you debug a growing consumer lag?', a: 'Step 1: Identify which partition has lag (kafka-consumer-groups.sh --describe). Step 2: Is it one partition (hot partition, slow consumer instance) or all partitions (producer spike, consumer resource constraint)? Step 3: Check consumer GC logs and CPU — max.poll.interval.ms violations. Step 4: Check broker disk I/O and network for the partition leader. Step 5: Options: (a) Scale out consumers (add instances, increase partition count), (b) Tune max.poll.records to reduce per-batch processing time, (c) Offload slow processing to async threads. Never increase session.timeout.ms as a first step — that just delays failure detection.', tip: 'Tools: kafka-consumer-groups.sh, Burrow (LinkedIn lag monitor), Grafana + JMX exporter, Confluent Control Center.' },
  { q: 'What is the significance of the under-replicated partitions metric?', a: 'Under-replicated partitions (URP) means one or more followers are behind the leader. This is a durability signal: with acks=all and min.insync.replicas=2, if URP > 0, you\'re one more broker failure away from producer blocking. Causes: (1) Broker restart — follower is catching up (temporary, should resolve in minutes). (2) Broker slow — disk I/O bottleneck, GC pressure, network saturation. (3) Network partition between brokers. Alert at URP > 0 for > 5 minutes. URP = 0 is a healthy cluster invariant.', tip: 'URP alert is binary: either 0 (healthy) or >0 (action required). Don\'t set thresholds — any URP > 0 for more than a few minutes needs investigation.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M16 · Operations',
    title: 'Monitoring',
    subtitle: 'Live Grafana-style dashboard — lag, throughput, ISR, disk',
    tabs: [
      { id: 'dashboard', label: '📊 Live Dashboard' },
      { id: 'metrics',   label: '📐 Key Metrics' },
      { id: 'iq',        label: '🎯 Interview Q&A' },
    ]
  });

  let cleanup = buildDashboard(container);
  buildMetrics(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

function buildDashboard(container) {
  const tab = container.querySelector('#tab-dashboard');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <canvas id="mon-canvas" width="820" height="480" style="width:100%;max-width:820px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="mon-spike">📈 Produce Spike</button>
        <button class="ctrl-btn" id="mon-lag">⚠️ Lag Alert</button>
        <button class="ctrl-btn" id="mon-urp">🔴 Under-replicated</button>
        <button class="ctrl-btn" id="mon-normal">✅ Normal</button>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>Reading the dashboard</h3>
      <p>The four sparklines are the primary throughput signals. <strong>Produce rate</strong> and <strong>Consume rate</strong> should track closely — a widening gap means lag is accumulating somewhere. <strong>Produce latency P99</strong> above 200ms usually indicates broker disk I/O saturation or network congestion; it is the earliest warning sign before lag becomes visible. <strong>Disk write MB/s</strong> rising sharply during normal operation often precedes a disk-full incident — alert before it reaches 80% of provisioned throughput.</p>
      <p>The three lag bars represent different consumer groups on the same topic — notice they have very different acceptable thresholds. The <strong>fulfillment-group</strong> drives warehouse pick requests: any lag means delayed shipments with a measurable customer SLA impact. The <strong>fraud-group</strong> must approve payments in under 200ms: lag here directly means financial exposure. The <strong>analytics-group</strong> feeds business dashboards: a few minutes of lag is invisible to any user. One Kafka cluster, three completely different operational SLAs on the same data.</p>
      <p>The Cluster Health panel contains the most critical binary metrics. <code>ActiveControllerCount</code> must always be exactly 1 — zero means the cluster cannot handle broker failures; more than 1 indicates a split-brain condition. <code>UnderReplicatedPartitions</code> above zero for more than 5 minutes means durability is at risk: one more broker failure could take those partitions offline. <code>OfflinePartitions</code> above zero means data is completely unreachable — this is an active production incident requiring immediate response, not a warning.</p>
    </div>`;

  const canvas = tab.querySelector('#mon-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  const sparks = {
    produce:   new SparkLine({ x: 20,  y: 30,  w: 180, h: 80, color: '#FF6900', label: 'Produce rate (msg/s)', maxVal: 5000 }),
    consume:   new SparkLine({ x: 220, y: 30,  w: 180, h: 80, color: '#3B82F6', label: 'Consume rate (msg/s)', maxVal: 5000 }),
    latency:   new SparkLine({ x: 420, y: 30,  w: 180, h: 80, color: '#8B5CF6', label: 'Produce latency (ms)', maxVal: 200 }),
    disk:      new SparkLine({ x: 620, y: 30,  w: 180, h: 80, color: '#F59E0B', label: 'Disk write (MB/s)',    maxVal: 500 }),
  };

  const lags = [
    new LagBar({ x: 20,  y: 160, w: 380, h: 28, label: 'fulfillment-group (P0-P2)' }),
    new LagBar({ x: 20,  y: 210, w: 380, h: 28, label: 'fraud-group (P0-P2)' }),
    new LagBar({ x: 20,  y: 260, w: 380, h: 28, label: 'analytics-group (P0-P2)' }),
  ];

  let mode = 'normal';
  let raf = null, lastT = 0, tick = 0;
  let urp = 0, activeController = 1;

  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05);
    lastT = ts;
    tick++;

    if (tick % 20 === 0) {
      if (mode === 'spike') {
        sparks.produce.push(4000 + Math.random() * 500);
        sparks.consume.push(2000 + Math.random() * 200);
        sparks.latency.push(80 + Math.random() * 40);
        sparks.disk.push(380 + Math.random() * 60);
        lags[0].setLag(0.6 + Math.random() * 0.2);
        lags[1].setLag(0.3 + Math.random() * 0.1);
      } else if (mode === 'lag') {
        sparks.produce.push(3000 + Math.random() * 300);
        sparks.consume.push(800 + Math.random() * 100);
        sparks.latency.push(120 + Math.random() * 30);
        sparks.disk.push(280 + Math.random() * 40);
        lags[0].setLag(0.85 + Math.random() * 0.1);
        lags[1].setLag(0.7 + Math.random() * 0.1);
        lags[2].setLag(0.5 + Math.random() * 0.1);
      } else {
        sparks.produce.push(2000 + Math.random() * 300);
        sparks.consume.push(2100 + Math.random() * 200);
        sparks.latency.push(12 + Math.random() * 8);
        sparks.disk.push(180 + Math.random() * 40);
        lags.forEach(lb => lb.setLag(0.02 + Math.random() * 0.06));
      }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    Object.values(sparks).forEach(s => s.draw(ctx));
    lags.forEach(lb => { lb.update(dt); lb.draw(ctx); });

    // Cluster health panel
    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(420, 155, 380, 145, 10);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 11px system-ui';
    ctx.fillStyle = '#94A3B8';
    ctx.textAlign = 'left';
    ctx.fillText('Cluster Health', 438, 178);

    const health = [
      { label: 'ActiveControllerCount', val: activeController, ok: activeController === 1 },
      { label: 'UnderReplicatedPartitions', val: urp, ok: urp === 0 },
      { label: 'OfflinePartitionsCount', val: 0, ok: true },
      { label: 'BrokerCount', val: 3, ok: true },
    ];

    health.forEach((h, i) => {
      ctx.font = '10px system-ui';
      ctx.fillStyle = h.ok ? '#10B981' : '#EF4444';
      ctx.textAlign = 'left';
      ctx.fillText(`${h.ok ? '●' : '●'} ${h.label}: ${h.val}`, 438, 200 + i * 22);
    });

    // Broker status
    [0,1,2].forEach((b, i) => {
      const bx = 420 + i * 128;
      const by = 320;
      const alive = !(mode === 'urp' && i === 1);
      ctx.fillStyle = alive ? '#10B98122' : '#EF444422';
      ctx.strokeStyle = alive ? '#10B981' : '#EF4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(bx, by, 110, 50, 8);
      ctx.fill();
      ctx.stroke();
      ctx.font = 'bold 11px system-ui';
      ctx.fillStyle = alive ? '#10B981' : '#EF4444';
      ctx.textAlign = 'center';
      ctx.fillText(`Broker ${b+1}`, bx + 55, by + 22);
      ctx.font = '9px system-ui';
      ctx.fillStyle = '#64748B';
      ctx.fillText(alive ? 'healthy' : 'DOWN', bx + 55, by + 36);
    });

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });

  tab.querySelector('#mon-spike').addEventListener('click', () => { mode = 'spike'; urp = 0; activeController = 1; });
  tab.querySelector('#mon-lag').addEventListener('click', () => { mode = 'lag'; urp = 0; activeController = 1; });
  tab.querySelector('#mon-urp').addEventListener('click', () => { mode = 'urp'; urp = 3; activeController = 1; });
  tab.querySelector('#mon-normal').addEventListener('click', () => { mode = 'normal'; urp = 0; activeController = 1; lags.forEach(lb => lb.setLag(0)); });

  return () => { if (raf) cancelAnimationFrame(raf); };
}

function buildMetrics(container) {
  const tab = container.querySelector('#tab-metrics');
  const metrics = [
    { name: 'records-lag', mbean: 'kafka.consumer:type=consumer-fetch-manager-metrics', alert: '>10,000', color: '#EF4444', desc: 'Per-partition consumer lag. Most critical operational metric.' },
    { name: 'UnderReplicatedPartitions', mbean: 'kafka.server:type=ReplicaManager', alert: '>0', color: '#EF4444', desc: 'Follower is behind leader. Durability risk.' },
    { name: 'IsrShrinksPerSec', mbean: 'kafka.server:type=ReplicaManager', alert: '>0', color: '#F59E0B', desc: 'Rate of ISR removals. Indicates broker stress.' },
    { name: 'ActiveControllerCount', mbean: 'kafka.controller:type=KafkaController', alert: '≠1', color: '#EF4444', desc: 'Must be exactly 1. 0=leaderless, >1=impossible but alert.' },
    { name: 'ProduceRequestMs.p99', mbean: 'kafka.network:type=RequestMetrics', alert: '>200ms', color: '#F59E0B', desc: 'Producer latency. High = broker overloaded or acks=all bottleneck.' },
    { name: 'FetchConsumerTotalTimeMs.p99', mbean: 'kafka.network:type=RequestMetrics', alert: '>500ms', color: '#F59E0B', desc: 'Consumer fetch latency. High = broker I/O contention.' },
    { name: 'BytesInPerSec', mbean: 'kafka.server:type=BrokerTopicMetrics', alert: '>80% NIC', color: '#F59E0B', desc: 'Network bytes in. Monitor for saturation approaching NIC limit.' },
    { name: 'LogFlushRateAndTimeMs', mbean: 'kafka.log:type=LogFlushStats', alert: '>50ms avg', color: '#F59E0B', desc: 'Disk flush latency. High = disk I/O bottleneck. Switch to SSD.' },
  ];
  tab.innerHTML = `
    <div class="compare-table-wrap">
      <div class="section-header"><div class="section-title">Essential JMX Metrics</div><div class="section-desc">Monitor these 8 metrics and you cover 90% of Kafka operational issues</div></div>
      <table class="compare-table">
        <thead><tr><th>Metric</th><th>MBean</th><th>Alert Threshold</th><th>Description</th></tr></thead>
        <tbody>${metrics.map(m => `
          <tr>
            <td style="font-family:monospace;font-size:11px;color:${m.color};font-weight:600">${m.name}</td>
            <td style="font-family:monospace;font-size:9px;color:var(--text3)">${m.mbean}</td>
            <td style="color:${m.color};font-weight:700;font-size:11px">${m.alert}</td>
            <td style="font-size:11px;color:var(--text2)">${m.desc}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}
