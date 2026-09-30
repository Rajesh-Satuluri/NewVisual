import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { GlowNode, PulseRing, LagBar } from '../components/canvas-primitives.js';

const IQ = [
  { q: 'What is the sequence of events when a producer fails mid-batch?', a: 'With enable.idempotence=true: (1) Producer sends batch with PID + sequence 42. (2) Broker appends to log. (3) Producer crashes before receiving ACK. (4) On restart, producer gets new PID (different instance) OR retries with same PID (if configured). (5) If retry with same PID + seq 42: broker detects duplicate (seq already seen) → returns DuplicateSequenceException → producer discards. (6) If new PID: broker cannot detect duplication — rely on consumer-side idempotency (upsert by order_id). The EOS guarantee covers the same producer instance within a session.', tip: 'EOS is per-session. Across process restarts, use transactional.id — the broker fences old instances using epoch numbers, guaranteeing at-most-one active producer per transactional.id.' },
  { q: 'What happens to consumers when their broker (group coordinator) dies?', a: 'The group coordinator is the broker hosting the __consumer_offsets partition for that consumer group. On coordinator death: (1) Consumer heartbeats start failing. (2) After session.timeout.ms, consumers declare themselves coordinator-less. (3) The controller selects a new coordinator (new leader for that __consumer_offsets partition). (4) Consumers reconnect to new coordinator via metadata fetch. (5) Rebalance triggered — all consumers rejoin the group. Total downtime: session.timeout.ms + rebalance time (seconds to minutes).', tip: 'This is why __consumer_offsets has high replication factor (default 3) and min.insync.replicas=2 in production — coordinator failure must not lose committed offsets.' },
  { q: 'How would you design a Kafka cluster to survive an entire availability zone failure?', a: 'Multi-AZ design: (1) Minimum 3 brokers across 3 AZs (1 per AZ). (2) RF=3, min.insync.replicas=2 — 1 AZ can go down without producer blocking. (3) Configure broker.rack=us-east-1a/1b/1c and replica.selector.class=RackAwareReplicaSelector — ensures partition leader and followers are in different AZs. (4) Consumer group members in all AZs — surviving AZ consumers take over after rebalance. (5) Producer client connects to any broker (metadata protocol) — retries on connection failure. Total recovery time: ~30s for KRaft, ~60s for ZooKeeper mode.', tip: 'RF=3, min.insync.replicas=2 is the minimum viable multi-AZ config. For zero-downtime reads: ensure at least one preferred replica per AZ so consumers always have a local follower to read from (follower reads, introduced in 2.4).' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M18 · Advanced',
    title: 'Failure Simulation',
    subtitle: 'Kill producers, brokers, and leaders — watch Kafka recover in real time',
    tabs: [
      { id: 'sim',      label: '💥 Failure Simulator' },
      { id: 'recovery', label: '🔄 Recovery Playbook' },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ]
  });

  let cleanup = buildSim(container);
  buildRecovery(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

function buildSim(container) {
  const tab = container.querySelector('#tab-sim');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <canvas id="fail-canvas" width="820" height="420" style="width:100%;max-width:820px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="fail-broker">💀 Kill Broker 2</button>
        <button class="ctrl-btn" id="fail-producer">💥 Kill Producer</button>
        <button class="ctrl-btn" id="fail-network">🌐 Network Partition</button>
        <button class="ctrl-btn" id="fail-restore">🔄 Restore All</button>
      </div>
    </div>
    <div style="padding:12px 20px;background:var(--bg2);border-top:1px solid var(--border)">
      <div id="fail-log" style="font-family:monospace;font-size:11px;color:var(--text2);line-height:1.8;max-height:80px;overflow-y:auto"></div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>The seven nodes show a minimal Kafka cluster: two producers writing to a three-broker replication group, and two consumers reading from it. <strong>Broker 1</strong> is the partition leader — it accepts all writes. Brokers 2 and 3 are followers — they fetch and replicate asynchronously. The lag bar at the bottom shows the consumer group's position relative to the leader's latest offset.</p>
      <p>When you kill Broker 2, watch the sequence in the log: the controller detects the missed heartbeat, removes Broker 2 from the ISR, and marks it offline. No leader election is needed here since Broker 1 is still alive — but <strong>UnderReplicatedPartitions jumps to 3</strong>, meaning each partition now has only 2 live replicas. If Broker 1 also fails now, you have a single point of failure. Use "Network Partition" to drop both Broker 2 and 3 simultaneously and see a <code>NotEnoughReplicasException</code> scenario with <code>min.insync.replicas=2</code>.</p>
      <p>This is the fundamental availability vs. durability tension in distributed systems. With <code>min.insync.replicas=1</code>, writes continue even with a single surviving replica — but if that replica dies before replication completes, data is lost. With <code>min.insync.replicas=2</code>, writes block when ISR drops below 2 — durability is protected, but availability decreases. Amazon's payment topics use <code>min.insync.replicas=2</code>. Metrics and logs topics often use <code>min.insync.replicas=1</code>.</p>
    </div>`;

  const canvas = tab.querySelector('#fail-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  const NODES = [
    { id: 'p1',  label: 'Producer 1', x: 80,  y: 80,  r: 30, color: '#FF6900', alive: true },
    { id: 'p2',  label: 'Producer 2', x: 80,  y: 200, r: 30, color: '#FF6900', alive: true },
    { id: 'b1',  label: 'Broker 1\n(Leader)', x: 300, y: 140, r: 38, color: '#3B82F6', alive: true, leader: true },
    { id: 'b2',  label: 'Broker 2', x: 480, y: 80,  r: 32, color: '#3B82F6', alive: true },
    { id: 'b3',  label: 'Broker 3', x: 480, y: 200, r: 32, color: '#3B82F6', alive: true },
    { id: 'c1',  label: 'Consumer 1', x: 680, y: 120, r: 28, color: '#10B981', alive: true },
    { id: 'c2',  label: 'Consumer 2', x: 680, y: 240, r: 28, color: '#10B981', alive: true },
  ];

  const glowNodes = NODES.map(n => new GlowNode({ x: n.x, y: n.y, r: n.r, color: n.color, label: n.label.split('\n')[0], active: true }));
  const rings = [];
  const lagBars = [
    new LagBar({ x: 40, y: 340, w: 360, h: 24, label: 'consumer-group lag' }),
  ];

  let raf = null, lastT = 0, tick = 0;
  const logEl = tab.querySelector('#fail-log');

  function log(msg) {
    const line = document.createElement('div');
    line.textContent = `[${new Date().toISOString().slice(11,19)}] ${msg}`;
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05);
    lastT = ts;
    tick++;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Connections
    const EDGES = [
      ['p1','b1'], ['p2','b1'], ['b1','b2'], ['b1','b3'], ['b2','c1'], ['b3','c2']
    ];
    EDGES.forEach(([a, b]) => {
      const na = NODES.find(n => n.id === a);
      const nb = NODES.find(n => n.id === b);
      if (!na || !nb) return;
      const ok = na.alive && nb.alive;
      ctx.beginPath();
      ctx.moveTo(na.x, na.y);
      ctx.lineTo(nb.x, nb.y);
      ctx.strokeStyle = ok ? '#334155' : '#EF444433';
      ctx.lineWidth = ok ? 2 : 1;
      ctx.setLineDash(ok ? [] : [4,4]);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    NODES.forEach((n, i) => {
      glowNodes[i].active = n.alive;
      glowNodes[i].color = n.alive ? n.color : '#475569';
      glowNodes[i].update(dt);
      glowNodes[i].draw(ctx);

      ctx.font = '9px system-ui';
      ctx.fillStyle = n.alive ? n.color : '#475569';
      ctx.textAlign = 'center';
      n.label.split('\n').forEach((line, li) => {
        ctx.fillText(line, n.x, n.y + n.r + 14 + li * 12);
      });

      if (!n.alive) {
        ctx.font = 'bold 18px system-ui';
        ctx.fillStyle = '#EF4444';
        ctx.textAlign = 'center';
        ctx.fillText('✕', n.x, n.y + 7);
      }
    });

    const dead = NODES.filter(n => !n.alive);
    if (dead.length > 0) {
      lagBars[0].setLag(0.5 + dead.length * 0.15);
    } else {
      lagBars[0].setLag(0.05);
    }
    lagBars[0].update(dt);
    lagBars[0].draw(ctx);

    rings.forEach(r => { r.update(dt); r.draw(ctx); });

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });

  tab.querySelector('#fail-broker').addEventListener('click', () => {
    const b2 = NODES.find(n => n.id === 'b2');
    b2.alive = false;
    rings.push(new PulseRing({ x: b2.x, y: b2.y, color: '#EF4444', maxR: 60 }));
    log('BROKER FAILURE: Broker 2 is down. Controller detecting via missed heartbeat...');
    setTimeout(() => {
      log('RECOVERY: Controller elected new leaders for affected partitions. ISR reduced to {B1,B3}.');
      log('WARN: UnderReplicatedPartitions=3. Add replacement broker or restore B2 to recover RF.');
    }, 2000);
  });

  tab.querySelector('#fail-producer').addEventListener('click', () => {
    const p1 = NODES.find(n => n.id === 'p1');
    p1.alive = false;
    rings.push(new PulseRing({ x: p1.x, y: p1.y, color: '#EF4444', maxR: 50 }));
    log('PRODUCER FAILURE: Producer 1 crashed. In-flight batch may be lost or duplicated.');
    log('With enable.idempotence=true: broker deduplicates retries using PID+sequence.');
    setTimeout(() => log('Producer 2 continues. Topic unaffected — producers are stateless from Kafka\'s view.'), 1000);
  });

  tab.querySelector('#fail-network').addEventListener('click', () => {
    NODES.find(n => n.id === 'b2').alive = false;
    NODES.find(n => n.id === 'b3').alive = false;
    log('NETWORK PARTITION: AZ-B unreachable. Broker 2 + 3 isolated from cluster.');
    log('With min.insync.replicas=2 and RF=3: cluster loses quorum. acks=all producers BLOCK.');
    setTimeout(() => log('Broker 1 continues as lone ISR member. min.insync.replicas violation — NotEnoughReplicasException.'), 1500);
  });

  tab.querySelector('#fail-restore').addEventListener('click', () => {
    NODES.forEach(n => { n.alive = true; });
    log('RESTORE: All nodes healthy. ISR rebuilding... URP clearing... Normal operations resumed.');
    NODES.filter(n => n.id.startsWith('b')).forEach(n => {
      rings.push(new PulseRing({ x: n.x, y: n.y, color: '#10B981', maxR: 50 }));
    });
  });

  return () => { if (raf) cancelAnimationFrame(raf); };
}

function buildRecovery(container) {
  const tab = container.querySelector('#tab-recovery');
  const scenarios = [
    { title: 'Broker crash', steps: ['Controller detects via missed heartbeat (session.timeout)', 'Controller elects new leaders from ISR for affected partitions', 'Metadata propagated to all clients', 'Producers/consumers reconnect to new leaders (1–10s)', 'Bring up replacement broker — it fetches from current leaders', 'Monitor UnderReplicatedPartitions → 0 when caught up'], color: '#EF4444' },
    { title: 'Producer crash', steps: ['In-flight batch: if acks=0, lost. If acks=1/all, depends on whether leader wrote it', 'With idempotence: restart producer, resend — broker deduplicates', 'Without idempotence: check consumer for duplicates, apply business-level dedup', 'New producer instance gets new PID — prior session\'s transactional.id is fenced'], color: '#F59E0B' },
    { title: 'Consumer crash', steps: ['Group coordinator detects via missed heartbeat (session.timeout.ms)', 'Rebalance triggered — other consumers take over dead consumer\'s partitions', 'New consumer starts from last committed offset (at-least-once reprocessing)', 'Committed offset gap: any uncommitted records since last commit are reprocessed', 'Tune heartbeat.interval.ms < session.timeout.ms/3 for fastest detection'], color: '#8B5CF6' },
    { title: 'Full AZ failure', steps: ['Brokers in AZ: controller detects en masse', 'Partitions whose leaders were in failed AZ: elect new leaders from remaining ISR', 'Min RF=3, min.insync.replicas=2: survive 1 full AZ with acks=all', 'Consumers in failed AZ: group rebalance, surviving AZ consumers take over', 'When AZ recovers: brokers rejoin, replay from current leaders, ISR rebuilds'], color: '#3B82F6' },
  ];
  tab.innerHTML = `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Recovery Playbook</div><div class="section-desc">Step-by-step recovery sequence for each failure type</div></div>
      <div style="display:flex;flex-direction:column;gap:16px">
        ${scenarios.map(s => `
          <div style="background:var(--bg2);border:1px solid ${s.color};border-radius:12px;overflow:hidden">
            <div style="background:${s.color}22;padding:12px 20px;font-size:13px;font-weight:700;color:${s.color}">💥 ${s.title}</div>
            <ol style="padding:14px 20px 14px 40px;margin:0;display:flex;flex-direction:column;gap:6px">
              ${s.steps.map(step => `<li style="font-size:12px;color:var(--text2)">${step}</li>`).join('')}
            </ol>
          </div>`).join('')}
      </div>
    </div>`;
}
