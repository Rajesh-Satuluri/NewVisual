import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { LagBar } from '../components/canvas-primitives.js';

const IQ = [
  { q: 'What is the difference between the log-end offset, committed offset, and current offset?', a: 'Log-end offset (LEO): the next offset to be written by the producer — the "latest" position in the partition. Committed offset: the offset a consumer has explicitly committed after processing — stored in __consumer_offsets. Current offset: the offset the consumer is currently fetching. Lag = LEO - committed offset. A consumer that reads but never commits has lag = 0 from its own perspective but lag grows from an external monitoring view if it crashes and a new consumer starts from the last committed offset.', tip: 'Draw the timeline: [committed] → [current] → [LEO]. Lag = LEO - committed. Processing lag ≠ consumer lag when commit interval is large.' },
  { q: 'What is the risk of committing offsets before processing is complete?', a: 'This is "at-most-once" semantics. If the consumer commits offset N+1 and then crashes before finishing processing of records N, those records are permanently lost — the group will resume from N+1 on restart. The safest pattern: commit only after successful processing (at-least-once). For exactly-once: use transactional producers/consumers or idempotent consumers (e.g., upsert to a database with the offset as the idempotency key).', tip: 'At-most-once: commit first (fast, lossy). At-least-once: commit after (safe, possible duplicates). EOS: both (complex, Kafka native or database idempotency).' },
  { q: 'How would you replay events from a Kafka topic that you already consumed?', a: 'Options: (1) Seek to specific offset: consumer.seek(partition, targetOffset) — for a known offset. (2) Seek to timestamp: consumer.offsetsForTimes() → seek — for time-based replay. (3) Reset consumer group offset: kafka-consumer-groups.sh --reset-offsets --to-datetime / --to-earliest / --to-offset — for full group replay. (4) Create new consumer group with fresh group.id — reads from auto.offset.reset (earliest or latest). Retention window must still hold the desired offsets.', tip: 'Mention: you cannot replay past the retention window. For guaranteed replay of historical data, consider a compacted topic or external store (S3 + Kafka S3 source connector).' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M09 · Consumer Side',
    title: 'Offsets',
    subtitle: 'Committed vs current vs log-end offset — lag, replay, and consumer group management',
    tabs: [
      { id: 'lag',    label: '📍 Lag Visualization' },
      { id: 'commit', label: '💾 Commit Strategies' },
      { id: 'amazon', label: '📦 Amazon Offsets' },
      { id: 'iq',     label: '🎯 Interview Q&A' },
    ]
  });

  let cleanup = buildLag(container);
  buildCommit(container);
  buildAmazon(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

function buildLag(container) {
  const tab = container.querySelector('#tab-lag');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <canvas id="lag-canvas" width="820" height="380" style="width:100%;max-width:820px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="lag-spike">📈 Producer Spike</button>
        <button class="ctrl-btn" id="lag-slow">🐢 Slow Consumer</button>
        <button class="ctrl-btn" id="lag-normal">✅ Normal</button>
        <span class="ctrl-label" id="lag-status">System balanced</span>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>Each horizontal bar represents one consumer group's lag for a partition — how many records have been produced but not yet committed as processed. The bar fills left to right: <strong>green</strong> means nearly caught up, <strong>amber</strong> means falling behind, <strong>red</strong> means critically behind. Lag is measured in records, not seconds — but at a known production rate you can convert: 10,000 records of lag at 1,000 records/sec equals 10 seconds behind.</p>
      <p>Hit "Producer Spike" to simulate a burst — all bars jump because records arrive faster than consumers process them. Hit "Slow Consumer" to simulate a consumer spending too long per record (e.g., a slow external API call). Notice that <strong>fraud-group lag growing is far more alarming than analytics-group lag growing</strong> — a fraud system that's 5 minutes behind is approving payments it should block, while an analytics dashboard 5 minutes stale is a non-event. One metric, two completely different SLAs.</p>
      <p>The three offset positions shown on the canvas tell the full story: <strong>Log-End Offset (LEO)</strong> is where the next produced record will land. <strong>Current Offset</strong> is what the consumer is actively fetching. <strong>Committed Offset</strong> is the last position durably saved to <code>__consumer_offsets</code> — if the consumer crashes and restarts, it resumes from here. Lag = LEO − Committed Offset. A large gap between Current and Committed means the consumer will reprocess all that work on the next crash restart.</p>
    </div>`;

  const canvas = tab.querySelector('#lag-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  const lagBars = [
    new LagBar({ x: 60, y: 80,  w: 680, h: 40, label: 'P0 — fulfillment-group' }),
    new LagBar({ x: 60, y: 160, w: 680, h: 40, label: 'P1 — fulfillment-group' }),
    new LagBar({ x: 60, y: 240, w: 680, h: 40, label: 'P0 — fraud-group' }),
  ];

  let mode = 'normal';
  let raf = null, lastT = 0, tick = 0;

  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05);
    lastT = ts;
    tick++;

    if (tick % 40 === 0) {
      if (mode === 'spike') {
        lagBars[0].setLag(Math.min(1, lagBars[0].target + 0.08));
        lagBars[1].setLag(Math.min(1, lagBars[1].target + 0.06));
        lagBars[2].setLag(Math.min(1, lagBars[2].target + 0.04));
      } else if (mode === 'slow') {
        lagBars[0].setLag(Math.min(1, lagBars[0].target + 0.05));
        lagBars[1].setLag(0.1 + Math.random() * 0.05);
        lagBars[2].setLag(0.05 + Math.random() * 0.05);
      } else {
        lagBars[0].setLag(0.05 + Math.random() * 0.08);
        lagBars[1].setLag(0.05 + Math.random() * 0.08);
        lagBars[2].setLag(0.02 + Math.random() * 0.05);
      }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = 'bold 12px system-ui';
    ctx.fillStyle = '#94A3B8';
    ctx.textAlign = 'left';
    ctx.fillText('Consumer Lag Monitor — Amazon Order Pipeline', 60, 45);

    lagBars.forEach(lb => { lb.update(dt); lb.draw(ctx); });

    // Offset diagram at bottom
    const y = 320;
    ctx.font = '10px system-ui';
    ctx.fillStyle = '#475569';
    ctx.fillText('Offset anatomy for P0:', 60, y);

    const boxes = [
      { label: 'Committed\nOffset', color: '#10B981', x: 60 },
      { label: 'Current\nOffset', color: '#F59E0B', x: 220 },
      { label: 'Log-End\nOffset (LEO)', color: '#EF4444', x: 380 },
    ];
    boxes.forEach(b => {
      ctx.fillStyle = b.color + '33';
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(b.x, y + 14, 130, 40, 6);
      ctx.fill();
      ctx.stroke();
      ctx.font = 'bold 10px system-ui';
      ctx.fillStyle = b.color;
      ctx.textAlign = 'center';
      b.label.split('\n').forEach((line, i) => ctx.fillText(line, b.x + 65, y + 30 + i * 14));
    });

    ctx.font = '10px system-ui';
    ctx.fillStyle = '#64748B';
    ctx.textAlign = 'left';
    ctx.fillText('← lag (current−committed) →', 220, y + 60);
    ctx.fillText('← lag (LEO−committed, monitored externally) →', 220, y + 74);

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });

  const statusEl = tab.querySelector('#lag-status');
  tab.querySelector('#lag-spike').addEventListener('click', () => {
    mode = 'spike'; statusEl.textContent = '📈 Producer spike — lag growing on P0/P1';
    tab.querySelector('#lag-spike').classList.add('active');
    tab.querySelector('#lag-slow').classList.remove('active');
    tab.querySelector('#lag-normal').classList.remove('active');
  });
  tab.querySelector('#lag-slow').addEventListener('click', () => {
    mode = 'slow'; statusEl.textContent = '🐢 Slow consumer on P0 — lag growing (P1/P2 fine)';
    tab.querySelector('#lag-slow').classList.add('active');
    tab.querySelector('#lag-spike').classList.remove('active');
    tab.querySelector('#lag-normal').classList.remove('active');
  });
  tab.querySelector('#lag-normal').addEventListener('click', () => {
    mode = 'normal'; statusEl.textContent = 'System balanced — normal lag';
    lagBars.forEach(lb => lb.setLag(0));
    tab.querySelector('#lag-normal').classList.add('active');
    tab.querySelector('#lag-spike').classList.remove('active');
    tab.querySelector('#lag-slow').classList.remove('active');
  });

  return () => { if (raf) cancelAnimationFrame(raf); };
}

function buildCommit(container) {
  const tab = container.querySelector('#tab-commit');
  const strategies = [
    { name: 'Auto Commit', config: 'enable.auto.commit=true\nauto.commit.interval.ms=5000', semantic: 'At-most-once', risk: 'high', desc: 'Consumer commits automatically every 5s regardless of processing state. If consumer crashes after commit but before processing completes, records are lost.' },
    { name: 'Manual Sync Commit', config: 'enable.auto.commit=false\nconsumer.commitSync()', semantic: 'At-least-once', risk: 'medium', desc: 'Consumer commits after processing. If crash between process and commit, records are reprocessed (duplicates). Blocks poll() until commit completes.' },
    { name: 'Manual Async Commit', config: 'enable.auto.commit=false\nconsumer.commitAsync()', semantic: 'At-least-once', risk: 'medium', desc: 'Non-blocking commit. Risk of out-of-order commits on retry. Use commitSync() in finally block for shutdown safety.' },
    { name: 'Transactional (EOS)', config: 'isolation.level=read_committed\nproducer.initTransactions()', semantic: 'Exactly-once', risk: 'low', desc: 'Kafka transactions: produce + offset commit are atomic. Consumers only see committed records. Requires Kafka 0.11+, same Kafka cluster for source and sink.' },
  ];
  tab.innerHTML = `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Offset Commit Strategies</div><div class="section-desc">Tradeoffs between throughput, complexity, and delivery semantics</div></div>
      <div class="info-grid">
        ${strategies.map(s => `
          <div class="info-card" style="border-left:3px solid ${s.risk==='high'?'var(--red)':s.risk==='medium'?'var(--amber)':'var(--green)'}">
            <div class="info-card-title">${s.name}</div>
            <div class="info-card-tag" style="margin-bottom:8px">${s.semantic}</div>
            <pre style="font-size:10px;color:var(--accent);font-family:monospace;background:var(--bg);padding:8px;border-radius:6px;margin-bottom:8px;white-space:pre-wrap">${s.config}</pre>
            <div class="info-card-body">${s.desc}</div>
          </div>`).join('')}
      </div>
    </div>`;
}

function buildAmazon(container) {
  const tab = container.querySelector('#tab-amazon');
  tab.innerHTML = `
    <div class="scroll-content" style="max-width:920px;margin:0 auto">

      <!-- Hero -->
      <div style="background:#111827;border:1px solid #FF6900;border-radius:14px;padding:20px 24px;margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#64748B;margin-bottom:8px">Offset anatomy</div>
        <div style="font-size:18px;font-weight:800;color:#F1F5F9;margin-bottom:4px">Where exactly is Fulfillment Service in the orders-P0 log right now?</div>
        <div style="font-size:13px;color:#94A3B8">Your iPhone 15 Pro order landed at offset 847,231. Here's what the three offset positions mean for the Fulfillment consumer that will process it.</div>
      </div>

      <!-- 3 offset positions -->
      <div style="margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748B;margin-bottom:14px">The three offsets — fulfillment-group on orders-P0</div>
        <div style="background:#111827;border:1px solid #1E293B;border-radius:12px;padding:18px 22px">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px">
            ${
              [
                { label:'Committed Offset', val:'847,050', color:'#10B981', desc:'The last offset fulfillment-group durably saved to __consumer_offsets. If consumer crashes right now, it restarts from here.' },
                { label:'Current Offset',   val:'847,195', color:'#F59E0B', desc:'The record the consumer just fetched but has not yet committed. 145 orders are in-flight: fetched and being processed, not yet acknowledged.' },
                { label:'Log-End Offset',   val:'847,231', color:'#EF4444', desc:'The next offset the producer will write. This is where your iPhone order just landed. LEO advances every 50ms at Prime Day rates.' },
              ].map(o => `
              <div style="background:#0A0E1A;border:1.5px solid ${o.color}44;border-radius:10px;padding:14px;text-align:center">
                <div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${o.color};margin-bottom:6px">${o.label}</div>
                <div style="font-size:24px;font-weight:800;color:${o.color};font-family:monospace;margin-bottom:8px">${o.val}</div>
                <div style="font-size:11px;color:#64748B;line-height:1.55">${o.desc}</div>
              </div>`).join('')
            }
          </div>
          <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:#0A0E1A;border-radius:8px;font-size:12px;color:#94A3B8">
            <span style="color:#10B981;font-family:monospace;flex-shrink:0">847,050</span>
            <div style="flex:1;height:3px;background:linear-gradient(to right,#10B981,#F59E0B);border-radius:2px"></div>
            <span style="color:#F59E0B;font-family:monospace;flex-shrink:0">847,195</span>
            <div style="flex:1;height:3px;background:linear-gradient(to right,#F59E0B,#EF4444);border-radius:2px"></div>
            <span style="color:#EF4444;font-family:monospace;flex-shrink:0">847,231</span>
            <span style="margin-left:10px;color:#64748B;flex-shrink:0">lag = 181 records ≈ 9ms at 20k/sec</span>
          </div>
        </div>
      </div>

      <!-- Crash scenario -->
      <div style="margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748B;margin-bottom:14px">What happens if Fulfillment crashes right now</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <div style="background:#EF444412;border:1.5px solid #EF444444;border-radius:12px;padding:16px 20px">
            <div style="font-size:12px;font-weight:700;color:#EF4444;margin-bottom:8px">Without idempotent processing</div>
            <div style="background:#0A0E1A;border-radius:8px;padding:12px;font-size:11px;color:#94A3B8;line-height:1.9">
              1. Consumer fetched offsets 847,050–847,195<br>
              2. Fulfillment DB writes started for 145 orders<br>
              3. <span style="color:#EF4444">Crashes at record 847,100</span><br>
              4. Restart: reads from committed offset 847,050<br>
              5. Re-processes 847,050–847,100 again (50 orders)<br>
              <span style="color:#EF4444">→ 50 orders dispatched twice to warehouse</span>
            </div>
          </div>
          <div style="background:#10B98112;border:1.5px solid #10B98133;border-radius:12px;padding:16px 20px">
            <div style="font-size:12px;font-weight:700;color:#10B981;margin-bottom:8px">With idempotent processing (Amazon)</div>
            <div style="background:#0A0E1A;border-radius:8px;padding:12px;font-size:11px;color:#94A3B8;line-height:1.9">
              1. Consumer fetched offsets 847,050–847,195<br>
              2. Each order: DynamoDB upsert keyed on order_id<br>
              3. <span style="color:#F59E0B">Crashes at record 847,100</span><br>
              4. Restart: reads from committed offset 847,050<br>
              5. Re-upserts 847,050–847,100: DynamoDB sees same key<br>
              <span style="color:#10B981">→ Silent overwrite with identical data. Safe.</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Commit code -->
      <div style="margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748B;margin-bottom:14px">How fulfillment-group commits offsets in production</div>
        <div style="background:#111827;border:1px solid #1E293B;border-radius:12px;padding:18px 22px">
          <code style="display:block;background:#0A0E1A;padding:14px;border-radius:8px;font-size:11px;color:#94A3B8;line-height:1.9;white-space:pre">enable.auto.commit = false
max.poll.records    = 100     // 100 orders per poll at most

while (running) {
  records = consumer.poll(Duration.ofMillis(500))
  for (record : records) {
    fulfillmentDB.upsert(record)   // idempotent DynamoDB write per order
  }
  consumer.commitAsync()           // non-blocking; fast path
}
// On shutdown:
consumer.commitSync()              // flush final offsets before exit</code>
          <div style="margin-top:12px;font-size:12px;color:#94A3B8;line-height:1.7">At 20,000 orders/sec across 6 partitions each consumer processes ~3,333 orders/sec. With max.poll.records=100, commitAsync fires ~33× per second per consumer. The committed offset always trails the DynamoDB write — so a crash always reprocesses at most 100 orders, all of which are safe idempotent upserts.</div>
        </div>
      </div>

      <!-- Replay scenario -->
      <div style="background:#3B82F612;border:1.5px solid #3B82F633;border-radius:12px;padding:18px 22px">
        <div style="font-size:13px;font-weight:700;color:#3B82F6;margin-bottom:10px">Midnight reconciliation — replaying 24 hours of orders from Kafka</div>
        <div style="font-size:12px;color:#94A3B8;line-height:1.7">
          Every night, Amazon's reconciliation job re-verifies all orders from the past 24 hours against the payment gateway. Instead of joining database tables, it replays directly from Kafka:<br><br>
          <code style="display:block;background:#0A0E1A;padding:8px 12px;border-radius:5px;font-size:11px;color:#3B82F6;margin:8px 0">kafka-consumer-groups.sh --reset-offsets --group reconciliation-group --topic orders --to-datetime 2024-12-01T00:00:00.000 --execute</code>
          The reconciliation-group's offset resets to midnight. It batch-reads ~1.2M orders in ~60 seconds. Fulfillment, fraud, and notification groups are completely unaffected — each group has its own independent offset pointer into the same log.
        </div>
      </div>

    </div>`;
}
