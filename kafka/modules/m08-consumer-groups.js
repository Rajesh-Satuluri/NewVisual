import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { GlowNode, PulseRing, EventPacket } from '../components/canvas-primitives.js';

const IQ = [
  { q: 'What triggers a consumer group rebalance and what is its impact?', a: 'Rebalance triggers: (1) Consumer joins group, (2) Consumer leaves/crashes (detected after session.timeout.ms), (3) Topic partition count changes, (4) Consumer calls subscribe() with new topics. During a stop-the-world rebalance (eager protocol), ALL consumers stop consuming while partitions are reassigned. For a group consuming 100 partitions with 10 consumers, a single consumer crash pauses all 10 consumers for 1–30 seconds. Cooperative (incremental) rebalancing (default since Kafka 3.1) only revokes partitions that need to move.', tip: 'Tuning: increase heartbeat.interval.ms to reduce false disconnects, decrease session.timeout.ms to speed up failure detection. There is a tradeoff.' },
  { q: 'What is the difference between range and round-robin partition assignment strategies?', a: 'Range (default): assigns partitions consecutively per topic. Consumer 0 gets P0-P2, Consumer 1 gets P3-P5. If consuming multiple topics, C0 always gets the low partitions — uneven if topic partition counts differ. Round-robin: interleaves partitions from all topics across consumers — typically more balanced for multi-topic subscriptions. Sticky: like round-robin but minimizes partition movement on rebalance (consumers keep their current partitions when possible).', tip: 'CooperativeStickyAssignor (Kafka 2.4+) combines sticky assignment with cooperative rebalancing — best of both worlds for production.' },
  { q: 'How does Kafka detect a consumer failure vs. a slow consumer?', a: 'Kafka uses two timeouts: (1) session.timeout.ms (default 45s) — if no heartbeat received within this window, the consumer is declared dead and a rebalance starts. (2) max.poll.interval.ms (default 5 min) — if poll() is not called within this window, the consumer is also declared dead. A slow consumer (processing each batch slowly) will violate max.poll.interval.ms without missing heartbeats. Fix: reduce batch size (max.poll.records), increase max.poll.interval.ms, or move processing to async threads.', tip: 'Separate heartbeat thread from poll thread — heartbeat runs in background, poll triggers processing. Distinguish the two timeout types in interviews.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M08 · Consumer Side',
    title: 'Consumer Groups',
    subtitle: 'Partition assignment, rebalancing strategies, and cooperative vs stop-the-world — animated',
    tabs: [
      { id: 'assign',    label: '👥 Assignment Demo' },
      { id: 'rebalance', label: '⚡ Rebalance Types' },
      { id: 'amazon',    label: '📦 Amazon Groups' },
      { id: 'iq',        label: '🎯 Interview Q&A' },
    ]
  });

  let cleanup = buildAssign(container);
  buildRebalance(container);
  buildAmazon(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

function buildAssign(container) {
  const tab = container.querySelector('#tab-assign');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <canvas id="cg-canvas" width="820" height="380" style="width:100%;max-width:820px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="cg-add">➕ Add Consumer</button>
        <button class="ctrl-btn" id="cg-remove">➖ Remove Consumer</button>
        <button class="ctrl-btn" id="cg-reset">🔄 Reset</button>
        <span class="ctrl-label" id="cg-status">3 consumers, 6 partitions</span>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>The colored boxes are topic partitions (P0–P5). The circles are consumer instances in a single consumer group. Lines show the current assignment — each partition is owned by exactly one consumer at a time. <strong>No two consumers in the same group ever read the same partition simultaneously</strong> — that is the core guarantee of the consumer group protocol, and it's what prevents double-processing without requiring locks or coordination between consumer instances.</p>
      <p>Click "Add Consumer" to trigger a <strong>rebalance</strong>. During the default eager (stop-the-world) rebalance, the group coordinator broker temporarily halts all consumption across every consumer while it recalculates and redistributes partition assignments. For a 200-consumer group handling Amazon Prime Day traffic, this pause can last 30–60 seconds — during which consumer lag climbs and downstream systems stop receiving events.</p>
      <p>Notice the assignment math: with 6 partitions and 3 consumers, each consumer owns exactly 2. Add a 4th consumer and one sits idle — partitions can't be split. This means the <strong>maximum parallelism for a topic is always equal to its partition count</strong>. Increase consumers beyond partition count and the extras wait. Remove consumers below partition count and each survivor absorbs the orphaned partitions — which is why partition count is the most important topic sizing decision you make at creation time.</p>
    </div>`;

  const canvas = tab.querySelector('#cg-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  const PARTITION_COUNT = 6;
  const PARTITION_COLORS = ['#FF6900','#3B82F6','#10B981','#F59E0B','#8B5CF6','#EF4444'];
  let consumers = ['C1','C2','C3'];

  let raf = null, lastT = 0;

  function getAssignment() {
    const asgn = {};
    consumers.forEach(c => asgn[c] = []);
    for (let p = 0; p < PARTITION_COUNT; p++) {
      if (consumers.length === 0) break;
      asgn[consumers[p % consumers.length]].push(p);
    }
    return asgn;
  }

  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05);
    lastT = ts;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const asgn = getAssignment();

    // Partitions row
    ctx.font = 'bold 11px system-ui';
    ctx.fillStyle = '#64748B';
    ctx.textAlign = 'left';
    ctx.fillText(`Topic: orders (${PARTITION_COUNT} partitions)`, 40, 40);

    const PW = 90, PH = 50, PGap = 20;
    const totalW = PARTITION_COUNT * (PW + PGap) - PGap;
    const startX = (canvas.width - totalW) / 2;

    for (let p = 0; p < PARTITION_COUNT; p++) {
      const px = startX + p * (PW + PGap);
      ctx.fillStyle = PARTITION_COLORS[p] + '22';
      ctx.strokeStyle = PARTITION_COLORS[p];
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(px, 60, PW, PH, 8);
      ctx.fill();
      ctx.stroke();
      ctx.font = 'bold 12px system-ui';
      ctx.fillStyle = PARTITION_COLORS[p];
      ctx.textAlign = 'center';
      ctx.fillText(`P${p}`, px + PW/2, 90);
    }

    // Consumers
    if (consumers.length > 0) {
      const CW = 120, CH = 70;
      const cSpacing = Math.min(160, (canvas.width - 80) / consumers.length);
      const cStart = (canvas.width - cSpacing * (consumers.length - 1) - CW) / 2;

      consumers.forEach((c, ci) => {
        const cx = cStart + ci * cSpacing;
        const cy = 220;
        const myParts = asgn[c] || [];

        ctx.fillStyle = '#1E293B';
        ctx.strokeStyle = '#FF6900';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(cx, cy, CW, CH, 8);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 12px system-ui';
        ctx.fillStyle = '#FF6900';
        ctx.textAlign = 'center';
        ctx.fillText(c, cx + CW/2, cy + 22);

        ctx.font = '10px system-ui';
        ctx.fillStyle = '#94A3B8';
        ctx.fillText(`owns: P${myParts.join(', P')||'none'}`, cx + CW/2, cy + 40);
        ctx.fillText(`lag: ${(Math.random()*100)|0}`, cx + CW/2, cy + 56);

        // Lines from partitions
        myParts.forEach(p => {
          const px = startX + p * (PW + PGap) + PW/2;
          ctx.beginPath();
          ctx.moveTo(px, 110);
          ctx.lineTo(cx + CW/2, cy);
          ctx.strokeStyle = PARTITION_COLORS[p] + '88';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 3]);
          ctx.stroke();
          ctx.setLineDash([]);
        });
      });
    }

    const statusEl = tab.querySelector('#cg-status');
    if (statusEl) statusEl.textContent = `${consumers.length} consumer${consumers.length!==1?'s':''}, ${PARTITION_COUNT} partitions — round-robin assignment`;

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });

  tab.querySelector('#cg-add').addEventListener('click', () => {
    if (consumers.length < 8) consumers.push(`C${consumers.length + 1}`);
  });
  tab.querySelector('#cg-remove').addEventListener('click', () => {
    if (consumers.length > 1) consumers.pop();
  });
  tab.querySelector('#cg-reset').addEventListener('click', () => {
    consumers = ['C1','C2','C3'];
  });

  return () => { if (raf) cancelAnimationFrame(raf); };
}

function buildRebalance(container) {
  const tab = container.querySelector('#tab-rebalance');
  const rows = [
    ['Protocol', 'Eager (Stop-the-World)', 'Cooperative (Incremental)'],
    ['Default since', 'Kafka 0.9', 'Kafka 3.1 (CooperativeSticky)'],
    ['On rebalance', 'ALL consumers revoke ALL partitions', 'Only moved partitions are revoked'],
    ['Downtime', '1–30 seconds for full group', 'Near-zero (only moved partitions pause)'],
    ['Assignment', 'Full reassignment each rebalance', 'Sticky — minimize changes'],
    ['Use case', 'Simple setups, small groups', 'Large groups, production workloads'],
    ['Config', 'partition.assignment.strategy=RangeAssignor', 'partition.assignment.strategy=CooperativeStickyAssignor'],
  ];
  tab.innerHTML = `
    <div class="compare-table-wrap">
      <div class="section-header"><div class="section-title">Rebalance Protocols</div><div class="section-desc">Eager vs Cooperative — the difference between 30s downtime and near-zero</div></div>
      <table class="compare-table">
        <thead><tr><th>Dimension</th><th>Eager / Stop-the-World</th><th>Cooperative / Incremental</th></tr></thead>
        <tbody>${rows.map(([d,e,c]) => `<tr><td style="font-weight:600;color:var(--text)">${d}</td><td>${e}</td><td style="color:var(--green)">${c}</td></tr>`).join('')}</tbody>
      </table>
    </div>
    <div class="scroll-content"><div class="prose">
      <h3>Amazon Prime Day Scenario</h3>
      <p>On Prime Day, the fulfillment consumer group has 200 consumers across 1000 partitions. An auto-scaler adds 50 consumers to handle the spike. With the eager protocol, all 200 existing consumers pause for up to 30 seconds during reassignment — 30,000 orders in limbo.</p>
      <p>With CooperativeStickyAssignor: only the ~250 partitions that need to migrate (from old consumers to the 50 new ones) are briefly paused. The remaining 750 partitions continue processing uninterrupted.</p>
    </div></div>`;
}

function buildAmazon(container) {
  const tab = container.querySelector('#tab-amazon');
  tab.innerHTML = `
    <div class="scroll-content" style="max-width:920px;margin:0 auto">

      <!-- Hero -->
      <div style="background:#111827;border:1px solid #FF6900;border-radius:14px;padding:20px 24px;margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#64748B;margin-bottom:8px">Consumer group design</div>
        <div style="font-size:18px;font-weight:800;color:#F1F5F9;margin-bottom:4px">Amazon runs 4 consumer groups on the orders topic — each with different rules</div>
        <div style="font-size:13px;color:#94A3B8">Same 6 partitions. Same records. Four completely independent consumer groups — each reading at its own speed with its own lag SLA, consumer count, and failure budget.</div>
      </div>

      <!-- 4 consumer groups table -->
      <div style="margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748B;margin-bottom:14px">The 4 groups on orders-topic (6 partitions)</div>
        <div style="overflow-x:auto;border-radius:10px;border:1px solid #1E293B">
          <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:720px">
            <thead><tr style="background:#0F172A;border-bottom:1px solid #1E293B">
              <th style="padding:10px 14px;text-align:left;color:#64748B;font-size:10px;text-transform:uppercase;letter-spacing:.06em">Group</th>
              <th style="padding:10px 14px;text-align:left;color:#64748B;font-size:10px;text-transform:uppercase;letter-spacing:.06em">Consumers</th>
              <th style="padding:10px 14px;text-align:left;color:#64748B;font-size:10px;text-transform:uppercase;letter-spacing:.06em">Lag SLA</th>
              <th style="padding:10px 14px;text-align:left;color:#64748B;font-size:10px;text-transform:uppercase;letter-spacing:.06em">Why This Count</th>
            </tr></thead>
            <tbody>
              ${
                [
                  ['fulfillment-group',     '6 of 6', '<2s',     '#10B981', 'Matches partition count exactly — maximum parallelism. Each consumer owns 1 partition. Orders must reach warehouse ASAP.'],
                  ['fraud-detection-group', '3 of 6', '<5s',     '#3B82F6', '3 consumers, 2 partitions each. Fraud model runs ~200ms per order — 3 consumers keep up comfortably. Adding more wastes CPU.'],
                  ['notifications-group',   '2 of 6', '<30s',    '#8B5CF6', 'Email/SMS sends are slow (external API calls). 2 consumers with async HTTP handle the rate. 30s lag SLA — email delay is acceptable.'],
                  ['analytics-group',       '1 of 6', '<1 hour', '#F59E0B', 'Batch reads into S3/Redshift. 1 consumer reads all 6 partitions sequentially. Throughput matters, not latency. Adding more consumers wastes resources.'],
                ].map(([g,c,sla,color,why]) => `
                <tr style="border-bottom:1px solid #0F172A">
                  <td style="padding:10px 14px;color:${color};font-family:monospace;font-size:11px">${g}</td>
                  <td style="padding:10px 14px;color:#F1F5F9;font-weight:600;text-align:center">${c}</td>
                  <td style="padding:10px 14px;color:${color};font-weight:600">${sla}</td>
                  <td style="padding:10px 14px;color:#94A3B8;font-size:11px;line-height:1.55">${why}</td>
                </tr>`).join('')
              }
            </tbody>
          </table>
        </div>
        <div style="margin-top:10px;padding:10px 14px;background:#111827;border-radius:8px;font-size:12px;color:#94A3B8;line-height:1.7">
          <strong style="color:#F59E0B">The idle consumer rule:</strong> analytics-group has 1 consumer for 6 partitions — all 6 assigned to it. Adding a 2nd analytics consumer would leave it permanently idle (partitions can't be split). Consumers &gt; partitions = wasted resources. This is why partition count is chosen to match <em>maximum future consumer parallelism</em>, not current need.
        </div>
      </div>

      <!-- Rebalance cost -->
      <div style="margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748B;margin-bottom:14px">Prime Day auto-scale — why rebalance protocol matters</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <div style="background:#EF444412;border:1.5px solid #EF444444;border-radius:12px;padding:16px 20px">
            <div style="font-size:12px;font-weight:700;color:#EF4444;margin-bottom:8px">Eager rebalance (stop-the-world)</div>
            <div style="font-size:12px;color:#94A3B8;line-height:1.75">
              2:00 PM Prime Day: auto-scaler adds 3 consumers to fulfillment-group (3 → 6).<br><br>
              <strong style="color:#EF4444">All 3 existing consumers pause</strong> for the full rebalance (~8 seconds). At 20,000 orders/sec:<br>
              <span style="color:#EF4444">~160,000 orders queued</span> in producer accumulator. Lag spikes. Fulfillment SLA breached.
            </div>
          </div>
          <div style="background:#10B98112;border:1.5px solid #10B98133;border-radius:12px;padding:16px 20px">
            <div style="font-size:12px;font-weight:700;color:#10B981;margin-bottom:8px">Cooperative rebalance (Amazon's choice)</div>
            <div style="font-size:12px;color:#94A3B8;line-height:1.75">
              Same event: 3 consumers added to fulfillment-group (3 → 6).<br><br>
              3 of the 6 partitions migrate to the 3 new consumers. Only those 3 partitions briefly pause — the other 3 continue uninterrupted. <strong style="color:#10B981">~80,000 orders unaffected</strong>.<br>
              <code style="color:#10B981">CooperativeStickyAssignor</code>
            </div>
          </div>
        </div>
      </div>

      <!-- Consumer crash timeline -->
      <div style="background:#111827;border:1px solid #1E293B;border-radius:12px;padding:18px 22px">
        <div style="font-size:13px;font-weight:700;color:#F1F5F9;margin-bottom:14px">When a fulfillment consumer crashes — what Kafka does</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${
            [
              { t:'T+0s',   color:'#EF4444', e:'Consumer C3 process dies (OOM kill)',       d:'C3 owned orders-P2. It had committed up to offset 847,050 but had fetched up to 847,195 — 145 orders in-flight.' },
              { t:'T+45s',  color:'#F59E0B', e:'session.timeout.ms fires',                  d:'No heartbeat from C3 for 45 seconds. Group coordinator (a broker) declares C3 dead and initiates a cooperative rebalance.' },
              { t:'T+53s',  color:'#3B82F6', e:'Rebalance completes — P2 moves to C4',     d:'C4 takes ownership of orders-P2. It resumes from committed offset 847,050 — reprocessing the 145 orders C3 had fetched but not committed.' },
              { t:'T+53s',  color:'#10B981', e:'Fulfillment resumes — 145 orders reprocessed', d:'Each reprocessed order is an idempotent upsert to the fulfillment DB (order_id primary key). No duplicate dispatches — same data, same key, DynamoDB silently overwrites.' },
            ].map((e,i) => `
            <div style="display:flex;gap:12px;align-items:flex-start">
              <div style="flex-shrink:0;min-width:60px;padding-top:12px;text-align:right">
                <span style="font-size:10px;font-weight:700;color:${e.color};font-family:monospace">${e.t}</span>
              </div>
              <div style="flex:1;background:#0A0E1A;border-radius:8px;padding:10px 14px">
                <div style="font-size:12px;font-weight:700;color:${e.color};margin-bottom:3px">${e.e}</div>
                <div style="font-size:11px;color:#94A3B8;line-height:1.6">${e.d}</div>
              </div>
            </div>`).join('')
          }
        </div>
      </div>

    </div>`;
}
