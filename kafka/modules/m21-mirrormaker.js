import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { EventPacket, GlowNode, PulseRing } from '../components/canvas-primitives.js';

const IQ = [
  {
    q: 'What is MirrorMaker 2 and how does it differ from MirrorMaker 1?',
    a: 'MirrorMaker 2 (MM2) is built on Kafka Connect and replicates topics between Kafka clusters. MM2 improvements over MM1: (1) Offset translation — MM2 maps source offsets to target offsets via the __consumer_offsets.sync topic, allowing consumers to resume on failover without data loss. MM1 had no offset sync. (2) Topology awareness — MM2 detects and avoids replication cycles in active-active setups using a replication prefix (e.g., us-east.topic-name). MM1 would loop indefinitely. (3) Configuration-driven — MM2 uses Connect worker config, REST API for management; MM1 needed manual process management. (4) Consumer group offset sync — MM2 syncs consumer group offsets so downstream consumers can failover. MM1 did not. (5) Heartbeat topics — MM2 writes heartbeat records so you can measure replication lag precisely.',
    tip: 'The critical interview point: MM2 solves the two MM1 failure modes — offset translation (resume consumers on DR) and cycle prevention (active-active without infinite loop). Both are "name the exact problem and the MM2 solution" questions.'
  },
  {
    q: 'Design a Kafka disaster recovery setup using MirrorMaker 2 for an e-commerce company.',
    a: 'Active-Passive DR: Primary cluster (us-east-1), DR cluster (us-west-2). MM2 setup: (1) MirrorSourceConnector: replicates all production topics to DR (prefix us-east.orders, us-east.payments). (2) MirrorCheckpointConnector: syncs consumer group offsets every 60s to __consumer_offsets on DR cluster — translated offsets, not raw. (3) MirrorHeartbeatConnector: writes heartbeat records every 1s for lag measurement. Failover procedure: (1) Consumer app config updated to point to DR cluster. (2) Consumers fetch translated offsets from DR via KafkaAdminClient.listConsumerGroupOffsets(). (3) Consumers seek to translated offsets — zero records re-processed if checkpoints were recent. RPO = checkpoint interval (60s). RTO = time to update consumer config + seek (<5 min). Active-active: add second MM2 replicating west→east; use replication prefix to prevent cycles.',
    tip: 'RPO (Recovery Point Objective) = how much data you can lose = checkpoint sync interval. RTO (Recovery Time Objective) = how fast you can switch = consumer reconfigure time. MM2 gives RPO of seconds with frequent checkpoints.'
  },
  {
    q: 'How does MirrorMaker 2 prevent infinite replication loops in active-active setups?',
    a: 'MM2 uses a dot-prefixed replication naming convention: when replicating from cluster A to cluster B, topics are renamed A.topic-name. When B replicates back to A, MM2 checks the topic name — if it starts with the target cluster name (A.), it skips replication. The ReplicationPolicy (DefaultReplicationPolicy) implements this: it strips the source prefix and checks for cycles. Configuration: replication.policy.class=org.apache.kafka.connect.mirror.DefaultReplicationPolicy. Each cluster has a unique cluster.alias (e.g., us-east, us-west). The alias becomes the prefix. Example: us-east.orders is a replica — us-west will not re-replicate it back to us-east because it checks "does this topic start with the target alias + dot?" and skips it. This prevents A→B→A→B... infinite replication.',
    tip: 'The naming convention is the key insight: topic prefix = source cluster alias. Any topic matching [target_alias].* is skipped. This is a configuration-time guarantee, not a runtime check — get the aliases right and cycles are impossible.'
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M21 · Advanced',
    title: 'MirrorMaker 2',
    subtitle: 'Cross-cluster replication, active-active DR, offset translation — the multi-region Kafka story',
    tabs: [
      { id: 'flow',    label: '🌐 Replication Flow' },
      { id: 'modes',   label: '🔄 Deployment Modes' },
      { id: 'iq',      label: '🎯 Interview Q&A' },
    ]
  });

  let cleanup = buildFlow(container);
  buildModes(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

function buildFlow(container) {
  const tab = container.querySelector('#tab-flow');
  tab.innerHTML = `
    <div class="canvas-wrap" style="position:relative">
      <canvas id="mm2-canvas" width="820" height="420" style="width:100%;max-width:820px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="mm2-produce">📤 Produce to Primary</button>
        <button class="ctrl-btn" id="mm2-failover">🔴 Simulate Failover</button>
        <button class="ctrl-btn" id="mm2-reset">🔄 Reset</button>
        <span class="ctrl-label">Watch MirrorMaker 2 replicate records cross-region</span>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>The left node is your primary Kafka cluster in <strong>us-east-1</strong>; the right is the DR cluster in <strong>us-west-2</strong>. The central MirrorMaker 2 node is a Kafka Connect worker running three connectors simultaneously: <code>MirrorSourceConnector</code> reads topic data from the primary and writes it to the DR cluster (the orange→green→blue packet flow); <code>MirrorCheckpointConnector</code> translates consumer group offsets and saves them on the DR cluster (the amber return packets); <code>MirrorHeartbeatConnector</code> writes a heartbeat record every second so you can measure exact replication lag.</p>
      <p>The <strong>amber checkpoint packets</strong> flowing back are the most critical part for disaster recovery. Raw Kafka offsets are cluster-local integers — offset 1,042,500 on the primary is not the same position as offset 1,042,500 on the DR cluster, because the DR cluster may have started replication mid-stream or had compaction run. MM2 maintains a source-to-target offset mapping and writes translated offsets to the DR cluster's <code>__consumer_offsets.sync</code> topic, so consumers know exactly where to resume without reprocessing or skipping records.</p>
      <p>Click "Simulate Failover" to see the primary go dark. In a real failover, your application's bootstrap server config switches to the DR cluster. Consumers call <code>KafkaAdminClient.listConsumerGroupOffsets()</code> to retrieve the translated offsets and <code>seek()</code> to that position before polling. Your maximum data loss (RPO) equals the checkpoint sync interval — default 60 seconds. Any event produced to the primary in the last 60 seconds that wasn't checkpointed yet is the only potential gap.</p>
    </div>`;

  const canvas = tab.querySelector('#mm2-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  const LEFT_X = 170, RIGHT_X = 640, MID_X = 410;
  const TOPIC_Y = [120, 200, 280];

  const CLUSTERS = [
    { label: 'Primary\n(us-east-1)', x: LEFT_X,  y: 200, color: '#FF6900', alive: true  },
    { label: 'DR\n(us-west-2)',      x: RIGHT_X, y: 200, color: '#3B82F6', alive: true  },
  ];
  const MM2_NODE = { label: 'MirrorMaker 2', x: MID_X, y: 200, color: '#10B981', alive: true };

  const glowL = new GlowNode({ x: LEFT_X,  y: 200, r: 48, color: '#FF6900', label: 'us-east-1', active: true });
  const glowR = new GlowNode({ x: RIGHT_X, y: 200, r: 48, color: '#3B82F6', label: 'us-west-2', active: true });
  const glowM = new GlowNode({ x: MID_X,   y: 200, r: 34, color: '#10B981', label: 'MM2',       active: true });

  const rings  = [];
  const packets = [];
  let raf = null, lastT = 0, tick = 0;
  let failedOver = false;
  let msgCount = 0;

  function spawnRecord() {
    msgCount++;
    const label = `msg-${msgCount}`;
    // Producer → Primary Kafka
    packets.push(new EventPacket({
      label, color: '#FF6900',
      path: [{ x: 60, y: 200 }, { x: LEFT_X - 50, y: 200 }],
      speed: 1.4,
      onArrive: () => {
        rings.push(new PulseRing({ x: LEFT_X, y: 200, color: '#FF6900', maxR: 60, duration: 0.5 }));
        // Primary → MM2
        setTimeout(() => {
          packets.push(new EventPacket({
            label, color: '#10B981',
            path: [{ x: LEFT_X + 50, y: 200 }, { x: MID_X - 36, y: 200 }],
            speed: 1.1,
            onArrive: () => {
              rings.push(new PulseRing({ x: MID_X, y: 200, color: '#10B981', maxR: 44, duration: 0.4 }));
              // MM2 → DR
              setTimeout(() => {
                packets.push(new EventPacket({
                  label: 'us-east.' + label, color: '#3B82F6',
                  path: [{ x: MID_X + 36, y: 200 }, { x: RIGHT_X - 50, y: 200 }],
                  speed: 1.1,
                  onArrive: () => {
                    rings.push(new PulseRing({ x: RIGHT_X, y: 200, color: '#3B82F6', maxR: 60, duration: 0.5 }));
                    // Offset checkpoint back
                    setTimeout(() => {
                      packets.push(new EventPacket({
                        label: 'ckpt', color: '#F59E0B',
                        path: [{ x: RIGHT_X - 50, y: 220 }, { x: MID_X + 36, y: 220 }],
                        speed: 0.9,
                      }));
                    }, 200);
                  }
                }));
              }, 150);
            }
          }));
        }, 200);
      }
    }));
  }

  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05);
    lastT = ts;
    tick++;

    if (tick % 200 === 0 && !failedOver) spawnRecord();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Producer label
    ctx.font = 'bold 10px system-ui';
    ctx.fillStyle = '#64748B';
    ctx.textAlign = 'center';
    ctx.fillText('Producer', 60, 185);
    ctx.fillText('Consumer', 60, 230);

    // Draw connection lines
    const lineColor = failedOver ? '#EF444444' : '#FF690044';
    ctx.beginPath();
    ctx.moveTo(LEFT_X + 50, 200); ctx.lineTo(MID_X - 36, 200);
    ctx.strokeStyle = failedOver ? '#EF444433' : '#10B98144';
    ctx.lineWidth = 2;
    ctx.setLineDash(failedOver ? [4,4] : []);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.moveTo(MID_X + 36, 200); ctx.lineTo(RIGHT_X - 50, 200);
    ctx.strokeStyle = '#3B82F644';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Producer → Primary
    ctx.beginPath();
    ctx.moveTo(80, 200); ctx.lineTo(LEFT_X - 50, 200);
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Consumer line to DR on failover
    if (failedOver) {
      ctx.beginPath();
      ctx.moveTo(80, 220); ctx.lineTo(RIGHT_X - 50, 220);
      ctx.strokeStyle = '#3B82F644';
      ctx.lineWidth = 2;
      ctx.setLineDash([4,4]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.font = '10px system-ui';
      ctx.fillStyle = '#EF4444';
      ctx.textAlign = 'center';
      ctx.fillText('Primary DOWN — consumers rerouted to DR', MID_X, 320);
      ctx.fillStyle = '#10B981';
      ctx.fillText('Translated offsets from __consumer_offsets.sync', MID_X, 335);
    }

    // Checkpoint annotation
    ctx.font = '9px system-ui';
    ctx.fillStyle = '#F59E0B';
    ctx.textAlign = 'center';
    ctx.fillText('offset checkpoints', MID_X, 250);

    glowL.active = !failedOver;
    glowL.color = failedOver ? '#475569' : '#FF6900';
    glowR.active = true;
    glowM.active = true;

    glowL.update(dt); glowL.draw(ctx);
    glowR.update(dt); glowR.draw(ctx);
    glowM.update(dt); glowM.draw(ctx);

    if (failedOver) {
      ctx.font = 'bold 22px system-ui';
      ctx.fillStyle = '#EF4444';
      ctx.textAlign = 'center';
      ctx.fillText('✕', LEFT_X, 207);
    }

    ctx.font = '9px system-ui';
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'center';
    ctx.fillText(CLUSTERS[0].label.split('\n')[1], LEFT_X, 260);
    ctx.fillText(CLUSTERS[1].label.split('\n')[1], RIGHT_X, 260);
    ctx.fillText('Connector\nWorker', MID_X, 245);

    packets.forEach(p => { p.update(dt); p.draw(ctx); });
    rings.forEach(r => { r.update(dt); r.draw(ctx); });
    while (packets.length > 30) packets.shift();

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });

  tab.querySelector('#mm2-produce').addEventListener('click', () => {
    if (!failedOver) spawnRecord();
  });
  tab.querySelector('#mm2-failover').addEventListener('click', () => {
    failedOver = true;
    rings.push(new PulseRing({ x: LEFT_X, y: 200, color: '#EF4444', maxR: 80 }));
  });
  tab.querySelector('#mm2-reset').addEventListener('click', () => {
    failedOver = false;
    packets.length = 0;
    rings.length = 0;
    msgCount = 0;
  });

  return () => { if (raf) cancelAnimationFrame(raf); };
}

function buildModes(container) {
  const tab = container.querySelector('#tab-modes');
  const modes = [
    {
      title: 'Active-Passive (DR)',
      icon: '🔴',
      color: '#EF4444',
      desc: 'One primary cluster serves all traffic. MM2 replicates to a standby DR cluster. On failure, consumers switch to DR using translated offsets from MirrorCheckpointConnector.',
      connectors: ['MirrorSourceConnector — replicates topic data', 'MirrorCheckpointConnector — syncs consumer offsets every N seconds', 'MirrorHeartbeatConnector — measures replication lag'],
      pros: ['Simple topology — one-directional replication', 'No conflict resolution needed', 'RPO ≈ checkpoint interval (60s default)', 'Proven pattern at LinkedIn, Netflix'],
      cons: ['DR cluster is idle (wasteful cost)', 'Manual or semi-manual failover procedure', 'RTO depends on how fast consumers reconfigure'],
    },
    {
      title: 'Active-Active (Multi-region)',
      icon: '🟢',
      color: '#10B981',
      desc: 'Both clusters serve traffic simultaneously. MM2 replicates bidirectionally using cluster alias prefix (us-east.orders ↔ us-west.orders) to prevent infinite loops.',
      connectors: ['MM2 East→West: replicates us-east.* topics to West', 'MM2 West→East: replicates us-west.* topics to East', 'ReplicationPolicy prevents cycle: skips [target].*  topics'],
      pros: ['Both clusters active — no idle resources', 'Regional low-latency reads', 'Automatic cycle prevention via topic prefix', 'Zero RPO if writes are region-pinned'],
      cons: ['Consumers must distinguish local vs replicated topics', 'No global ordering guarantee across regions', 'Schema Registry must be geo-replicated separately', 'Conflict resolution logic required for shared state'],
    },
    {
      title: 'Aggregation (Hub and Spoke)',
      icon: '🔵',
      color: '#3B82F6',
      desc: 'Multiple edge/regional clusters replicate into a central analytics cluster. Common for global data lakes: IoT edge clusters → central Kafka → Snowflake / Spark.',
      connectors: ['N × MirrorSourceConnectors (one per edge cluster)', 'Central cluster receives all prefixed topics', 'Connect Sink to DWH from central cluster only'],
      pros: ['Single analytics cluster processes global data', 'Edge clusters stay small and fast', 'Simpler schema management at central cluster', 'Natural for Kafka Connect sink to Snowflake/S3'],
      cons: ['Central cluster becomes a bottleneck at scale', 'MM2 instances per edge cluster add operational overhead', 'Topic namespace collisions if not aliased carefully'],
    },
  ];

  tab.innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">MirrorMaker 2 Deployment Patterns</div>
        <div class="section-desc">Choose based on RTO/RPO requirements and operational complexity tolerance</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:16px">
        ${modes.map(m => `
          <div style="background:var(--bg2);border:1px solid ${m.color};border-radius:12px;overflow:hidden">
            <div style="padding:12px 20px;background:${m.color}22;font-size:14px;font-weight:700;color:${m.color}">${m.icon} ${m.title}</div>
            <div style="padding:14px 20px 4px">
              <div style="font-size:12px;color:var(--text2);margin-bottom:12px">${m.desc}</div>
              <div style="font-size:11px;font-weight:700;color:var(--text);margin-bottom:6px">Connectors used:</div>
              ${m.connectors.map(c => `<div style="font-size:11px;color:${m.color};margin-bottom:4px;padding-left:12px;position:relative"><span style="position:absolute;left:0">▸</span>${c}</div>`).join('')}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;border-top:1px solid var(--border)">
              <div style="padding:12px 20px;border-right:1px solid var(--border)">
                <div style="font-size:11px;font-weight:700;color:var(--green);margin-bottom:6px">✅ Advantages</div>
                ${m.pros.map(p => `<div style="font-size:11px;color:var(--text2);margin-bottom:4px;padding-left:12px;position:relative"><span style="position:absolute;left:0;color:var(--green)">•</span>${p}</div>`).join('')}
              </div>
              <div style="padding:12px 20px">
                <div style="font-size:11px;font-weight:700;color:var(--red);margin-bottom:6px">❌ Limitations</div>
                ${m.cons.map(c => `<div style="font-size:11px;color:var(--text2);margin-bottom:4px;padding-left:12px;position:relative"><span style="position:absolute;left:0;color:var(--red)">•</span>${c}</div>`).join('')}
              </div>
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}
