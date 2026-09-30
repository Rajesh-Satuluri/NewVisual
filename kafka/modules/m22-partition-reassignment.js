import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { GlowNode, PulseRing } from '../components/canvas-primitives.js';

const IQ = [
  {
    q: 'What triggers a partition reassignment and how do you execute one safely?',
    a: 'Triggers: (1) Adding brokers — partitions do not auto-move to new brokers; you must manually reassign. (2) Decommissioning a broker — move its partitions to remaining brokers first. (3) Rebalancing uneven load — some brokers have more leader partitions than others. Execution: (1) Generate reassignment plan: kafka-reassign-partitions.sh --generate --topics-to-move-json-file topics.json --broker-list "1,2,3,4" (new broker). (2) Review the plan JSON — check it distributes leaders evenly. (3) Execute: --execute --reassignment-json-file plan.json --throttle 50MB/s. (4) Verify: --verify --reassignment-json-file plan.json (poll until all partitions show "completed"). Safety: always throttle (--throttle) to limit replication bandwidth so production traffic is not starved. Without throttle, rebalancing 1TB can saturate the network for hours.',
    tip: 'The throttle config sets replica.fetch.throttled.replicas and leader.replication.throttled.replicas on both broker and topic. After completion, remove throttle: kafka-configs.sh --alter --add-config "leader.replication.throttled.rate=-1" — otherwise the throttle stays even after reassignment finishes.'
  },
  {
    q: 'What is preferred leader election and why does it matter?',
    a: 'Each partition has a "preferred leader" — the first broker in the replica assignment list (the AR list). When a broker fails and recovers, it comes back as a follower even for partitions where it was the preferred leader. Over time, leaders concentrate on a few brokers — "leadership skew." Preferred leader election fixes this: kafka-leader-election.sh --election-type PREFERRED forces each partition back to its preferred leader. This is a cheap, zero-data-movement operation (no data copy, just leadership handoff). auto.leader.rebalance.enable=true (default) runs preferred election automatically every 300s (leader.imbalance.check.interval.seconds). auto.leader.rebalance.per.broker.percentage=10 — triggers when any broker is unbalanced by >10%.',
    tip: 'Key interview distinction: preferred leader election vs partition reassignment. Preferred election = zero data movement, seconds to complete, just changes which ISR member is leader. Partition reassignment = copies data, minutes to hours depending on size. Always try preferred election first if only fixing leadership skew.'
  },
  {
    q: 'How do you add a new broker to a Kafka cluster and balance load?',
    a: 'Adding a broker does NOT automatically move partitions to it — Kafka does not auto-rebalance. Steps: (1) Start new broker with unique broker.id, pointing to same ZooKeeper/KRaft cluster. (2) New topics created after broker join will include it. Old topics stay on old brokers. (3) Generate reassignment: kafka-reassign-partitions.sh --generate --topics-to-move-json topics.json --broker-list "1,2,3,4" (include new broker 4 in list). (4) Execute with throttle (--throttle 100000000 = 100MB/s). (5) Monitor with --verify and watch UnderReplicatedPartitions in JMX/Grafana — it will spike during reassignment, then drop back to 0. (6) After completion, remove throttle config. (7) Run preferred leader election to distribute leadership. Total time: 1TB ÷ 100MB/s = ~3 hours for data copy at 100MB/s throttle.',
    tip: 'Monitor UnderReplicatedPartitions (URP) during reassignment. URP > 0 is expected and normal during reassignment. A URP that stays high AFTER reassignment completes means a follower is not catching up — investigate disk I/O or network saturation. Reassignment completion ≠ ISR fully rebuilt.'
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M22 · Operations',
    title: 'Partition Reassignment',
    subtitle: 'Add brokers, rebalance leaders, decommission nodes — safely and without downtime',
    tabs: [
      { id: 'sim',      label: '🔀 Reassignment Sim' },
      { id: 'playbook', label: '📋 Ops Playbook' },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ]
  });

  let cleanup = buildSim(container);
  buildPlaybook(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

function buildSim(container) {
  const tab = container.querySelector('#tab-sim');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <canvas id="reassign-canvas" width="820" height="380" style="width:100%;max-width:820px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="ra-add">➕ Add Broker 4</button>
        <button class="ctrl-btn" id="ra-rebalance">🔀 Reassign Partitions</button>
        <button class="ctrl-btn" id="ra-election">👑 Preferred Election</button>
        <button class="ctrl-btn" id="ra-reset">↩ Reset</button>
      </div>
    </div>
    <div style="padding:10px 20px;background:var(--bg2);border-top:1px solid var(--border)">
      <div id="ra-log" style="font-family:monospace;font-size:11px;color:var(--text2);line-height:1.8;max-height:70px;overflow-y:auto"></div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>The broker circles each show a <strong>leader-count bar</strong> (how many partition leaders they hold) and a replica count. In a balanced cluster, both values are roughly equal across all brokers. Click "Add Broker 4" — the new broker appears with zero partitions and zero leaders. <strong>Kafka does not automatically migrate existing partitions to new brokers.</strong> New topics created after the broker joins will include it, but all existing topics stay on their current brokers until you explicitly reassign them.</p>
      <p>Click "Reassign Partitions" to start a migration. The progress bar represents an underlying data copy: each partition's log files are replicated byte-by-byte from their current broker to Broker 4. During this period, <strong>UnderReplicatedPartitions is elevated — this is normal and expected</strong>, not an alert. Each partition in transit temporarily has one extra in-sync follower catching up. The <code>--throttle</code> flag limits replication bandwidth so this copy doesn't compete with production traffic; without it, a 1TB reassignment can saturate the network for hours.</p>
      <p>After data copy completes, click "Preferred Election." Even after reassignment, leadership may stay concentrated on the original brokers because they never stepped down during the copy. Preferred leader election forces each partition to its designated preferred leader (the first broker in its replica assignment list) — distributing leadership evenly. This is a <strong>zero-I/O operation</strong>: no data moves, only the leader role switches, and it completes in milliseconds. Always run preferred election after any reassignment or after a broker rejoins the cluster following downtime.</p>
    </div>`;

  const canvas = tab.querySelector('#reassign-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  const INITIAL_BROKERS = [
    { id: 1, label: 'Broker 1', x: 150, y: 160, alive: true, leaders: 4, replicas: 8,  color: '#FF6900' },
    { id: 2, label: 'Broker 2', x: 340, y: 160, alive: true, leaders: 4, replicas: 8,  color: '#3B82F6' },
    { id: 3, label: 'Broker 3', x: 530, y: 160, alive: true, leaders: 4, replicas: 8,  color: '#10B981' },
  ];

  let brokers = INITIAL_BROKERS.map(b => ({ ...b }));
  let broker4Added = false;
  let reassigning = false;
  let progress = 0; // 0-1
  let rings = [];
  let raf = null, lastT = 0;

  const logEl = tab.querySelector('#ra-log');
  function log(msg) {
    const line = document.createElement('div');
    line.textContent = `[${new Date().toISOString().slice(11,19)}] ${msg}`;
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function drawBroker(b, alpha) {
    const r = 48;
    ctx.globalAlpha = alpha || 1;

    // Background circle
    ctx.beginPath();
    ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
    ctx.fillStyle = b.color + '22';
    ctx.fill();
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Leader count bar (top half)
    const maxL = 8;
    const barW = 60, barH = 8;
    const lFrac = Math.min(b.leaders / maxL, 1);
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(b.x - barW / 2, b.y - 18, barW, barH);
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x - barW / 2, b.y - 18, barW * lFrac, barH);

    // Labels
    ctx.font = 'bold 11px system-ui';
    ctx.fillStyle = b.color;
    ctx.textAlign = 'center';
    ctx.fillText(b.label, b.x, b.y + 4);
    ctx.font = '10px system-ui';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText(`Leaders: ${b.leaders}  Replicas: ${b.replicas}`, b.x, b.y + 18);

    ctx.globalAlpha = 1;
  }

  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05);
    lastT = ts;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.font = 'bold 12px system-ui';
    ctx.fillStyle = '#64748B';
    ctx.textAlign = 'left';
    ctx.fillText('Partition Distribution across Brokers', 30, 30);

    if (reassigning) {
      progress = Math.min(progress + dt * 0.25, 1);
      ctx.font = '11px system-ui';
      ctx.fillStyle = '#F59E0B';
      ctx.textAlign = 'center';
      ctx.fillText(`Reassignment in progress: ${Math.round(progress * 100)}%`, 410, 30);

      // Progress bar
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(200, 40, 420, 8);
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(200, 40, 420 * progress, 8);

      if (progress >= 1) {
        reassigning = false;
        brokers.forEach(b => {
          const target = broker4Added ? 3 : 4;
          b.leaders  = target;
          b.replicas = broker4Added ? 6 : 8;
        });
        log('Reassignment COMPLETE. UnderReplicatedPartitions = 0. Run preferred election next.');
      }
    }

    brokers.forEach(b => drawBroker(b, 1));

    // Skew label
    const leaders = brokers.map(b => b.leaders);
    const maxL = Math.max(...leaders), minL = Math.min(...leaders);
    const skew = maxL - minL;
    ctx.font = '11px system-ui';
    ctx.fillStyle = skew > 2 ? '#EF4444' : '#10B981';
    ctx.textAlign = 'center';
    ctx.fillText(`Leader skew: ${skew} partition${skew !== 1 ? 's' : ''}  (threshold: 2)`, 410, 340);

    rings.forEach(r => { r.update(dt); r.draw(ctx); });

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });

  tab.querySelector('#ra-add').addEventListener('click', () => {
    if (broker4Added) return;
    broker4Added = true;
    brokers.push({ id: 4, label: 'Broker 4', x: 710, y: 160, alive: true, leaders: 0, replicas: 0, color: '#8B5CF6' });
    rings.push(new PulseRing({ x: 710, y: 160, color: '#8B5CF6', maxR: 70 }));
    log('Broker 4 added. 0 partitions assigned — run partition reassignment to balance.');
  });

  tab.querySelector('#ra-rebalance').addEventListener('click', () => {
    if (reassigning) return;
    reassigning = true;
    progress = 0;
    log(`Reassigning partitions with --throttle 50MB/s. UnderReplicatedPartitions will spike temporarily.`);
    brokers.forEach(b => {
      rings.push(new PulseRing({ x: b.x, y: b.y, color: b.color, maxR: 60 }));
    });
  });

  tab.querySelector('#ra-election').addEventListener('click', () => {
    // Simulate skewed leaders getting re-elected
    const total = brokers.reduce((s, b) => s + b.leaders, 0);
    const even = Math.floor(total / brokers.length);
    brokers.forEach(b => { b.leaders = even; });
    rings.push(new PulseRing({ x: 410, y: 160, color: '#FFD700', maxR: 80 }));
    log('Preferred leader election complete. Leadership balanced evenly across all brokers.');
  });

  tab.querySelector('#ra-reset').addEventListener('click', () => {
    broker4Added = false;
    reassigning = false;
    progress = 0;
    rings.length = 0;
    brokers = INITIAL_BROKERS.map(b => ({ ...b }));
    logEl.innerHTML = '';
  });

  return () => { if (raf) cancelAnimationFrame(raf); };
}

function buildPlaybook(container) {
  const tab = container.querySelector('#tab-playbook');
  const scenarios = [
    {
      title: 'Adding a new broker',
      color: '#10B981',
      steps: [
        'Start broker with unique broker.id, same cluster config',
        'Generate reassignment plan: kafka-reassign-partitions.sh --generate --topics-to-move-json topics.json --broker-list "1,2,3,4"',
        'Review generated JSON — verify even leader distribution',
        'Execute with throttle: --execute --reassignment-json-file plan.json --throttle 52428800 (50MB/s)',
        'Monitor: --verify until all partitions show "completed successfully"',
        'Watch UnderReplicatedPartitions in JMX/Grafana — expect spike, then return to 0',
        'Remove throttle: kafka-configs.sh --alter --add-config "leader.replication.throttled.rate=-1" --broker 1,2,3,4',
        'Run preferred leader election to balance leadership',
      ],
    },
    {
      title: 'Decommissioning a broker',
      color: '#EF4444',
      steps: [
        'Generate reassignment moving all partitions off the target broker',
        'Execute reassignment with throttle — wait for full completion',
        'Verify UnderReplicatedPartitions = 0',
        'Run preferred leader election (broker being removed may have been preferred leader)',
        'Stop the broker process gracefully (shutdown hook sends controlled shutdown)',
        'Remove broker from monitoring/alerting configuration',
        'Clean up log.dirs on the decommissioned host',
      ],
    },
    {
      title: 'Fixing leadership skew',
      color: '#F59E0B',
      steps: [
        'Check skew: kafka-topics.sh --describe | grep Leader | awk \'{print $4}\' | sort | uniq -c',
        'If skew > auto.leader.rebalance.per.broker.percentage (default 10%), manual election needed',
        'Run preferred leader election: kafka-leader-election.sh --election-type PREFERRED --all-topic-partitions',
        'Verify: kafka-topics.sh --describe — leaders should now match preferred replica (first in AR list)',
        'No data movement — this is instantaneous, zero I/O',
        'If preferred leaders are skewed due to historical reassignment, generate new plan to fix AR lists',
      ],
    },
  ];

  tab.innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">Partition Reassignment Playbook</div>
        <div class="section-desc">Step-by-step procedures — safe for production with proper throttling</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:16px">
        ${scenarios.map(s => `
          <div style="background:var(--bg2);border:1px solid ${s.color};border-radius:12px;overflow:hidden">
            <div style="background:${s.color}22;padding:12px 20px;font-size:13px;font-weight:700;color:${s.color}">🔧 ${s.title}</div>
            <ol style="padding:14px 20px 14px 40px;margin:0;display:flex;flex-direction:column;gap:6px">
              ${s.steps.map(step => `<li style="font-size:11px;color:var(--text2);font-family:${step.includes('kafka-') ? 'monospace' : 'inherit'}">${step}</li>`).join('')}
            </ol>
          </div>`).join('')}
        <div style="background:var(--bg2);border:1px solid #3B82F6;border-radius:12px;padding:16px 20px">
          <div style="font-size:12px;font-weight:700;color:#3B82F6;margin-bottom:10px">⚡ Key Numbers to Know</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            ${[
              ['Default throttle', 'None — must set explicitly or it uses full bandwidth'],
              ['Recommended throttle', '50–100 MB/s (adjust based on available bandwidth)'],
              ['URP during reassign', 'Normal to spike — only alarm if it stays high after completion'],
              ['Preferred election time', 'Milliseconds — pure metadata, no data movement'],
              ['Remove throttle after', 'Critical — else throttle persists indefinitely after reassignment'],
              ['auto.leader.rebalance.enable', 'true by default — runs election every 300s if skew > 10%'],
            ].map(([k, v]) => `
              <div>
                <div style="font-size:10px;font-weight:700;color:var(--text)">${k}</div>
                <div style="font-size:11px;color:var(--text2)">${v}</div>
              </div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
}
