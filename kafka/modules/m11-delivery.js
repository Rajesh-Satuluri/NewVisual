import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { EventPacket, drawRoundRect } from '../components/canvas-primitives.js';

const IQ = [
  { q: 'How does Kafka achieve exactly-once semantics (EOS)?', a: 'EOS requires two components: (1) Idempotent producer: each producer gets a PID (producer ID) and sends a monotonic sequence number per partition. The broker deduplicates retries using (PID, partition, sequence). (2) Transactions: group produce + consumer offset commit into an atomic transaction using beginTransaction() / commitTransaction(). Consumers must use isolation.level=read_committed to skip uncommitted records. Together: consume-transform-produce is atomic — either all succeeds or none is visible.', tip: 'EOS is only "exactly-once within Kafka." If the Kafka consumer writes to an external system (e.g., DynamoDB), that write must also be idempotent. The Kafka guarantee ends at the Kafka sink.' },
  { q: 'What is the difference between at-least-once and at-most-once delivery?', a: 'At-most-once: commit offset before processing. If consumer crashes, records are lost (never reprocessed). Zero duplicates, possible data loss. At-least-once: commit offset after processing. If consumer crashes before commit, records are reprocessed. Possible duplicates, no data loss. Which is worse depends on the domain: for financial transactions, data loss is unacceptable → at-least-once. For sensor data where loss is acceptable but duplicates cause double-billing → at-most-once.', tip: 'Amazon: payment events use EOS (financial). Clickstream events use at-least-once (duplicates deduped in Redshift UPSERT). Sensor telemetry uses at-most-once (latest value overwrites).' },
  { q: 'What is the transaction coordinator in Kafka and what is its role?', a: 'The transaction coordinator is a broker-side component that manages transaction state. Each transactional producer is assigned a coordinator based on its transactional.id hash. The coordinator maintains a transaction log (__transaction_state, 50 partitions). State machine: ONGOING → PREPARE_COMMIT → COMMIT (or PREPARE_ABORT → ABORT). On producer failure, the coordinator waits transaction.timeout.ms and then aborts. Consumers filter uncommitted records by checking the transaction markers (COMMIT/ABORT records written to the log).', tip: 'Mention the two-phase commit: first, coordinator writes prepare, then writes the transaction marker to each involved partition. Consumers see the marker and skip or include records.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M11 · Delivery',
    title: 'Delivery Guarantees',
    subtitle: 'At-most-once, at-least-once, exactly-once — animated 3-lane comparison',
    tabs: [
      { id: 'lanes',  label: '🛡️ 3-Lane Comparison' },
      { id: 'eos',    label: '⚛️ EOS Deep Dive' },
      { id: 'zombie', label: '🧟 Zombie Fencing' },
      { id: 'amazon', label: '📦 Amazon Delivery' },
      { id: 'iq',     label: '🎯 Interview Q&A' },
    ]
  });

  let cleanup = buildLanes(container);
  buildEOS(container);
  buildZombie(container);
  buildAmazon(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

function buildLanes(container) {
  const tab = container.querySelector('#tab-lanes');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <canvas id="dlv-canvas" width="820" height="420" style="width:100%;max-width:820px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="dlv-crash">💥 Simulate Crash</button>
        <button class="ctrl-btn" id="dlv-reset">🔄 Reset</button>
        <span class="ctrl-label">Watch what happens to each delivery semantic on crash</span>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>The three lanes run the same consume-process-produce workflow under different delivery semantics. <strong>Red (at-most-once)</strong> commits the offset before processing — if the consumer crashes after the commit but before finishing work, that record is permanently gone. Zero duplicates, possible data loss. Producers use <code>acks=0</code> or <code>acks=1</code> and never retry. This is acceptable for sensor telemetry where the latest reading overwrites the last anyway.</p>
      <p><strong>Amber (at-least-once)</strong> commits only after successful processing — a crash before the commit causes the consumer to restart from the last committed offset and reprocess. No data loss, but duplicates are possible. Your downstream system must be idempotent: a database upsert keyed on <code>order_id</code> is safe to run twice, a bank transfer is not. This is Amazon's default for most non-financial pipelines including clickstream, inventory sync, and notifications.</p>
      <p><strong>Green (exactly-once)</strong> wraps consume + process + produce-offset into one atomic Kafka transaction. Either all three succeed together, or none are visible. The cost: producer needs <code>enable.idempotence=true</code> and a <code>transactional.id</code>, consumers need <code>isolation.level=read_committed</code>, and each transaction adds ~5ms latency for the two-phase commit round-trip with the transaction coordinator. Amazon uses EOS for payment confirmations. It does not use it for recommendation clicks — the operational cost isn't justified.</p>
    </div>`;

  const canvas = tab.querySelector('#dlv-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  const LANES = [
    { y: 80,  label: 'At-Most-Once',  color: '#EF4444', commit: 'before', desc: 'Commit offset → process → crash → LOST' },
    { y: 200, label: 'At-Least-Once', color: '#F59E0B', commit: 'after',  desc: 'Process → commit offset → crash → REPROCESS (duplicate)' },
    { y: 320, label: 'Exactly-Once',  color: '#10B981', commit: 'atomic', desc: 'Atomic transaction: process + commit = one unit' },
  ];

  const packets = [];
  let crashed = false;
  let raf = null, lastT = 0, tick = 0;

  function spawnPackets() {
    packets.length = 0;
    LANES.forEach((lane, li) => {
      packets.push(new EventPacket({
        label: `msg-${li+1}`,
        color: lane.color,
        path: [
          { x: 60,  y: lane.y + 30 },
          { x: 280, y: lane.y + 30 },
          { x: 500, y: lane.y + 30 },
          { x: 720, y: lane.y + 30 },
        ],
        speed: 0.8,
      }));
    });
  }

  spawnPackets();

  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05);
    lastT = ts;
    tick++;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    LANES.forEach(lane => {
      // Lane box
      drawRoundRect(ctx, 30, lane.y, 760, 100, 10, '#1E293B', lane.color + '44');

      ctx.font = 'bold 12px system-ui';
      ctx.fillStyle = lane.color;
      ctx.textAlign = 'left';
      ctx.fillText(lane.label, 50, lane.y + 22);

      ctx.font = '10px system-ui';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText(lane.desc, 50, lane.y + 82);

      // Stage markers
      const stages = ['Producer', 'Commit Offset', 'Process', 'Done'];
      const xs = [60, 280, 500, 720];
      stages.forEach((s, i) => {
        ctx.font = '9px system-ui';
        ctx.fillStyle = '#475569';
        ctx.textAlign = 'center';
        ctx.fillText(s, xs[i], lane.y + 55);
        ctx.beginPath();
        ctx.arc(xs[i], lane.y + 30, 5, 0, Math.PI * 2);
        ctx.fillStyle = lane.color + '66';
        ctx.fill();
      });

      // Crash marker
      if (crashed) {
        const crashX = lane.commit === 'before' ? 370 : lane.commit === 'after' ? 370 : 600;
        ctx.font = 'bold 16px system-ui';
        ctx.fillStyle = '#EF4444';
        ctx.textAlign = 'center';
        ctx.fillText('💥', crashX, lane.y + 35);

        if (lane.commit === 'before') {
          ctx.fillStyle = '#EF4444';
          ctx.font = 'bold 10px system-ui';
          ctx.fillText('LOST!', crashX + 50, lane.y + 35);
        } else if (lane.commit === 'after') {
          ctx.fillStyle = '#F59E0B';
          ctx.fillText('RETRY', crashX + 50, lane.y + 35);
        } else {
          ctx.fillStyle = '#10B981';
          ctx.fillText('ABORT TX', crashX + 60, lane.y + 35);
        }
      }
    });

    packets.forEach(p => { if (!crashed) p.update(dt); p.draw(ctx); });

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });

  tab.querySelector('#dlv-crash').addEventListener('click', () => { crashed = true; });
  tab.querySelector('#dlv-reset').addEventListener('click', () => { crashed = false; spawnPackets(); });

  return () => { if (raf) cancelAnimationFrame(raf); };
}

function buildEOS(container) {
  const tab = container.querySelector('#tab-eos');
  tab.innerHTML = `
    <div class="svg-wrap">
      <svg viewBox="0 0 800 400" width="800" height="400" style="font-family:system-ui">
        <text x="30" y="30" fill="#94A3B8" font-size="12" font-weight="700">Exactly-Once Semantics — Component Map</text>

        <!-- Idempotent Producer -->
        <rect x="30" y="50" width="200" height="100" rx="10" fill="#1E293B" stroke="#FF6900" stroke-width="2"/>
        <text x="130" y="76" text-anchor="middle" fill="#FF6900" font-size="11" font-weight="800">Idempotent Producer</text>
        <text x="130" y="96" text-anchor="middle" fill="#94A3B8" font-size="9">PID: 12345</text>
        <text x="130" y="112" text-anchor="middle" fill="#94A3B8" font-size="9">Sequence: 0, 1, 2, 3…</text>
        <text x="130" y="128" text-anchor="middle" fill="#94A3B8" font-size="9">enable.idempotence=true</text>
        <text x="130" y="144" text-anchor="middle" fill="#64748B" font-size="8">Broker deduplicates retries</text>

        <!-- Transaction Coordinator -->
        <rect x="300" y="50" width="200" height="100" rx="10" fill="#1E293B" stroke="#8B5CF6" stroke-width="2"/>
        <text x="400" y="76" text-anchor="middle" fill="#8B5CF6" font-size="11" font-weight="800">Tx Coordinator</text>
        <text x="400" y="96" text-anchor="middle" fill="#94A3B8" font-size="9">transactional.id = "order-proc"</text>
        <text x="400" y="112" text-anchor="middle" fill="#94A3B8" font-size="9">ONGOING → COMMIT</text>
        <text x="400" y="128" text-anchor="middle" fill="#94A3B8" font-size="9">__transaction_state</text>
        <text x="400" y="144" text-anchor="middle" fill="#64748B" font-size="8">2-phase commit protocol</text>

        <!-- Consumer -->
        <rect x="570" y="50" width="200" height="100" rx="10" fill="#1E293B" stroke="#10B981" stroke-width="2"/>
        <text x="670" y="76" text-anchor="middle" fill="#10B981" font-size="11" font-weight="800">EOS Consumer</text>
        <text x="670" y="96" text-anchor="middle" fill="#94A3B8" font-size="9">isolation.level=</text>
        <text x="670" y="112" text-anchor="middle" fill="#94A3B8" font-size="9">read_committed</text>
        <text x="670" y="128" text-anchor="middle" fill="#94A3B8" font-size="9">Skips ABORT records</text>
        <text x="670" y="144" text-anchor="middle" fill="#64748B" font-size="8">Only sees committed txns</text>

        <!-- Flow -->
        <text x="30" y="195" fill="#94A3B8" font-size="11" font-weight="700">Transaction Flow</text>

        ${
          [
            '1. producer.initTransactions() — register with coordinator',
            '2. producer.beginTransaction()',
            '3. producer.send(output-topic, transformed-record)',
            '4. producer.sendOffsetsToTransaction(offsets, consumer-group)',
            '5. producer.commitTransaction() — coordinator writes COMMIT marker',
            '6. Consumer sees COMMIT marker → includes records in its view',
          ].map((step, i) => `
          <rect x="30" y="${210 + i*28}" width="740" height="22" rx="5"
            fill="${i===4||i===5 ? '#10B98111' : '#1E293B'}"
            stroke="${i===4||i===5 ? '#10B981' : '#334155'}" stroke-width="1"/>
          <text x="44" y="${225 + i*28}" fill="${i===4||i===5 ? '#10B981' : '#94A3B8'}" font-size="10">${step}</text>
        `).join('')
        }

        <text x="30" y="392" fill="#F59E0B" font-size="10">⚠️ On crash: coordinator aborts after transaction.timeout.ms (default 1min). Consumers never see partial results.</text>
      </svg>
    </div>`;
}

function buildZombie(container) {
  const tab = container.querySelector('#tab-zombie');
  if (!tab) return;
  tab.innerHTML = `
    <div class="svg-wrap">
      <svg viewBox="0 0 820 500" width="820" height="500" style="font-family:system-ui">
        <defs>
          <marker id="aZR" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#EF4444"/>
          </marker>
          <marker id="aZG" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#10B981"/>
          </marker>
          <marker id="aZO" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#F59E0B"/>
          </marker>
        </defs>

        <!-- Title -->
        <text x="30" y="30" fill="#94A3B8" font-size="13" font-weight="800">Zombie Fencing — How transactional.id + Epoch prevents duplicate writes</text>

        <!-- ── BEFORE FENCING (top half) ── -->
        <text x="30" y="60" fill="#EF4444" font-size="11" font-weight="700">❌ WITHOUT Fencing — Zombie producer corrupts the topic</text>

        <!-- Producer v1 (zombie) -->
        <rect x="30" y="75" width="150" height="60" rx="8" fill="#EF444422" stroke="#EF4444" stroke-width="2"/>
        <text x="105" y="98" text-anchor="middle" fill="#EF4444" font-size="11" font-weight="700">Producer v1 🧟</text>
        <text x="105" y="114" text-anchor="middle" fill="#94A3B8" font-size="9">transactional.id=</text>
        <text x="105" y="126" text-anchor="middle" fill="#94A3B8" font-size="9">"order-processor"</text>

        <!-- Producer v2 (legit) -->
        <rect x="30" y="155" width="150" height="60" rx="8" fill="#10B98122" stroke="#10B981" stroke-width="2"/>
        <text x="105" y="178" text-anchor="middle" fill="#10B981" font-size="11" font-weight="700">Producer v2 ✅</text>
        <text x="105" y="194" text-anchor="middle" fill="#94A3B8" font-size="9">transactional.id=</text>
        <text x="105" y="206" text-anchor="middle" fill="#94A3B8" font-size="9">"order-processor"</text>

        <!-- Broker (no fencing) -->
        <rect x="260" y="75" width="160" height="140" rx="8" fill="#1E293B" stroke="#EF4444" stroke-width="1.5"/>
        <text x="340" y="100" text-anchor="middle" fill="#EF4444" font-size="11" font-weight="700">Broker</text>
        <text x="340" y="118" text-anchor="middle" fill="#94A3B8" font-size="9">No epoch check</text>
        <text x="340" y="140" text-anchor="middle" fill="#F59E0B" font-size="9">Accepts BOTH producers</text>
        <rect x="275" y="150" width="130" height="22" rx="4" fill="#EF444433" stroke="#EF4444" stroke-width="1"/>
        <text x="340" y="165" text-anchor="middle" fill="#EF4444" font-size="9">🧟 stale write accepted!</text>
        <rect x="275" y="178" width="130" height="22" rx="4" fill="#10B98133" stroke="#10B981" stroke-width="1"/>
        <text x="340" y="193" text-anchor="middle" fill="#10B981" font-size="9">v2 write accepted</text>

        <line x1="180" y1="105" x2="258" y2="130" stroke="#EF4444" stroke-width="1.5" marker-end="url(#aZR)" stroke-dasharray="4,3"/>
        <line x1="180" y1="185" x2="258" y2="170" stroke="#10B981" stroke-width="1.5" marker-end="url(#aZG)"/>
        <text x="195" y="123" fill="#EF4444" font-size="8">stale tx</text>
        <text x="195" y="162" fill="#10B981" font-size="8">new tx</text>

        <!-- Result: corruption -->
        <rect x="470" y="95" width="180" height="100" rx="8" fill="#EF444411" stroke="#EF4444" stroke-width="1.5"/>
        <text x="560" y="118" text-anchor="middle" fill="#EF4444" font-size="11" font-weight="700">Topic: orders</text>
        <text x="560" y="138" text-anchor="middle" fill="#94A3B8" font-size="9">off:10 → 🧟 stale order (dup!)</text>
        <text x="560" y="154" text-anchor="middle" fill="#94A3B8" font-size="9">off:11 → ✅ v2 correct order</text>
        <text x="560" y="174" text-anchor="middle" fill="#EF4444" font-size="9">⚠️ Duplicate charge!</text>
        <line x1="420" y1="145" x2="468" y2="145" stroke="#EF4444" stroke-width="1.5" marker-end="url(#aZR)"/>

        <!-- ── AFTER FENCING (bottom half) ── -->
        <text x="30" y="260" fill="#10B981" font-size="11" font-weight="700">✅ WITH Fencing — Epoch bumped, zombie rejected</text>

        <!-- Producer v1 (zombie, fenced) -->
        <rect x="30" y="275" width="150" height="60" rx="8" fill="#47556911" stroke="#475569" stroke-width="1.5" stroke-dasharray="4,3"/>
        <text x="105" y="298" text-anchor="middle" fill="#475569" font-size="11" font-weight="700">Producer v1 🧟</text>
        <text x="105" y="314" text-anchor="middle" fill="#475569" font-size="9">epoch=0 (old)</text>
        <text x="105" y="326" text-anchor="middle" fill="#475569" font-size="9">transactional.id=…</text>

        <!-- Producer v2 (new, higher epoch) -->
        <rect x="30" y="355" width="150" height="60" rx="8" fill="#10B98122" stroke="#10B981" stroke-width="2"/>
        <text x="105" y="378" text-anchor="middle" fill="#10B981" font-size="11" font-weight="700">Producer v2 ✅</text>
        <text x="105" y="394" text-anchor="middle" fill="#10B981" font-size="9">epoch=1 (bumped)</text>
        <text x="105" y="406" text-anchor="middle" fill="#94A3B8" font-size="9">transactional.id=…</text>

        <!-- Broker with fencing -->
        <rect x="260" y="275" width="160" height="140" rx="8" fill="#1E293B" stroke="#10B981" stroke-width="2"/>
        <text x="340" y="300" text-anchor="middle" fill="#10B981" font-size="11" font-weight="700">Broker</text>
        <text x="340" y="318" text-anchor="middle" fill="#94A3B8" font-size="9">epoch check: stored=1</text>
        <rect x="275" y="328" width="130" height="22" rx="4" fill="#EF444433" stroke="#EF4444" stroke-width="1"/>
        <text x="340" y="343" text-anchor="middle" fill="#EF4444" font-size="9">epoch=0 &lt; 1 → FENCE! 🚫</text>
        <rect x="275" y="356" width="130" height="22" rx="4" fill="#10B98133" stroke="#10B981" stroke-width="1"/>
        <text x="340" y="371" text-anchor="middle" fill="#10B981" font-size="9">epoch=1 = 1 → ACCEPT ✓</text>
        <rect x="275" y="384" width="130" height="20" rx="4" fill="#1E293B" stroke="#334155"/>
        <text x="340" y="398" text-anchor="middle" fill="#64748B" font-size="8">ProducerFencedException</text>

        <line x1="180" y1="305" x2="258" y2="330" stroke="#EF4444" stroke-width="1.5" marker-end="url(#aZR)" stroke-dasharray="4,3"/>
        <line x1="180" y1="385" x2="258" y2="370" stroke="#10B981" stroke-width="1.5" marker-end="url(#aZG)"/>

        <!-- Result: clean -->
        <rect x="470" y="295" width="180" height="100" rx="8" fill="#10B98111" stroke="#10B981" stroke-width="1.5"/>
        <text x="560" y="318" text-anchor="middle" fill="#10B981" font-size="11" font-weight="700">Topic: orders</text>
        <text x="560" y="338" text-anchor="middle" fill="#94A3B8" font-size="9">off:10 → ✅ v2 correct order</text>
        <text x="560" y="358" text-anchor="middle" fill="#94A3B8" font-size="9">off:11 → ✅ v2 next order</text>
        <text x="560" y="378" text-anchor="middle" fill="#10B981" font-size="9">No duplicates. No data loss.</text>
        <line x1="420" y1="345" x2="468" y2="345" stroke="#10B981" stroke-width="1.5" marker-end="url(#aZG)"/>

        <!-- Key insight -->
        <rect x="680" y="75" width="130" height="320" rx="10" fill="#1E293B" stroke="#F59E0B" stroke-width="1.5"/>
        <text x="745" y="100" text-anchor="middle" fill="#F59E0B" font-size="10" font-weight="700">How it works</text>
        <text x="695" y="122" fill="#94A3B8" font-size="9">1. v1 registers with</text>
        <text x="695" y="136" fill="#94A3B8" font-size="9">   transactional.id</text>
        <text x="695" y="150" fill="#94A3B8" font-size="9">   → epoch=0</text>
        <text x="695" y="172" fill="#94A3B8" font-size="9">2. v1 crashes / GC</text>
        <text x="695" y="186" fill="#94A3B8" font-size="9">   pause / slow</text>
        <text x="695" y="208" fill="#94A3B8" font-size="9">3. v2 starts, calls</text>
        <text x="695" y="222" fill="#94A3B8" font-size="9">   initTransactions()</text>
        <text x="695" y="236" fill="#94A3B8" font-size="9">   → epoch bumped to 1</text>
        <text x="695" y="258" fill="#94A3B8" font-size="9">4. Broker stores</text>
        <text x="695" y="272" fill="#94A3B8" font-size="9">   epoch=1 for this</text>
        <text x="695" y="286" fill="#94A3B8" font-size="9">   transactional.id</text>
        <text x="695" y="308" fill="#94A3B8" font-size="9">5. v1 wakes up and</text>
        <text x="695" y="322" fill="#94A3B8" font-size="9">   tries to write</text>
        <text x="695" y="336" fill="#F59E0B" font-size="9">   epoch=0 &lt; 1 →</text>
        <text x="695" y="350" fill="#F59E0B" font-size="9">   ProducerFenced</text>
        <text x="695" y="364" fill="#10B981" font-size="9">   Exception ✓</text>
      </svg>
    </div>
    <div class="scroll-content">
      <div class="prose">
        <h3>Why "zombie" producer is dangerous</h3>
        <p>When a producer process suffers a long GC pause, network partition, or slow restart, a second instance may start under the same <code>transactional.id</code>. The original producer — now a "zombie" — eventually recovers and continues sending stale transactions. Without fencing, both write to the same topic simultaneously, causing <strong>duplicate records and potential double-charges</strong>.</p>
        <h3>The epoch mechanism</h3>
        <p>Every call to <code>initTransactions()</code> increments the epoch stored by the transaction coordinator for that <code>transactional.id</code>. Any write arriving with an older epoch is immediately rejected with <code>ProducerFencedException</code> — the zombie is killed at the broker, not at the client. The new producer never even knows the zombie existed.</p>
        <h3>Amazon payments use case</h3>
        <p>The Amazon payment processor sets <code>transactional.id = "payment-proc-" + region</code>. On rolling deploy, the new pod calls <code>initTransactions()</code> first — bumping epoch — before the old pod is terminated. This guarantees zero duplicate charges even during deployments where both old and new instances briefly overlap.</p>
      </div>
    </div>`;
}

function buildAmazon(container) {
  const tab = container.querySelector('#tab-amazon');
  tab.innerHTML = `
    <div class="scroll-content" style="max-width:920px;margin:0 auto">

      <!-- Hero -->
      <div style="background:#111827;border:1px solid #FF6900;border-radius:14px;padding:20px 24px;margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#64748B;margin-bottom:8px">Delivery semantics in practice</div>
        <div style="font-size:18px;font-weight:800;color:#F1F5F9;margin-bottom:4px">Amazon chose a different delivery guarantee for every pipeline — here's why</div>
        <div style="font-size:13px;color:#94A3B8">At-most-once, at-least-once, and exactly-once aren't interchangeable. The wrong choice either loses data or causes double-charges. Each pipeline's tolerance for loss vs. duplicates drives the decision.</div>
      </div>

      <!-- Decision table -->
      <div style="margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748B;margin-bottom:14px">Which guarantee — and what breaks with the wrong choice</div>
        <div style="display:flex;flex-direction:column;gap:10px">
          ${
            [
              {
                topic:'payment-confirmations',
                guarantee:'Exactly-Once (EOS)',
                color:'#10B981',
                why:'Loss = charge with no order record (customer charged, item never shipped). Duplicate = double charge. Neither is acceptable. EOS via transactional.id + acks=all + isolation.level=read_committed is the only correct choice.',
                wrong:'at-least-once: producer retries after network drop → duplicate payment event → Fraud Detection locks account or customer charged twice for iPhone 15 Pro.',
              },
              {
                topic:'orders',
                guarantee:'At-Least-Once + idempotent sink',
                color:'#3B82F6',
                why:'Loss = customer paid but warehouse never notified (catastrophic). Duplicate = safe if Fulfillment DB uses order_id as PK (upsert is harmless). At-least-once + DynamoDB upsert gives effectively-EOS semantics without Kafka transaction overhead.',
                wrong:'at-most-once: consumer crashes after committing offset but before DynamoDB write → order silently lost → customer waits for a package that will never ship.',
              },
              {
                topic:'clickstream / recommendations',
                guarantee:'At-Most-Once',
                color:'#8B5CF6',
                why:'Losing 0.01% of clicks is statistically invisible to the ML model. Duplicates, however, artificially inflate click-through rates — poisoning recommendations. A retry storm after a broker restart could duplicate 5M click events, making irrelevant products appear to trend.',
                wrong:'at-least-once: retry after crash → duplicated click events → recommendation model thinks Product X is trending → users see irrelevant ads for hours.',
              },
              {
                topic:'inventory-updates',
                guarantee:'At-Least-Once + upsert',
                color:'#F59E0B',
                why:'"stock=500" written twice to DynamoDB via SET is idempotent — same result either way. "stock=500" lost once means the system shows 0 units when 500 are in the warehouse — orders blocked on Prime Day. Loss is worse than duplication here.',
                wrong:'at-most-once: warehouse scans 500 units received, event lost → system still shows out-of-stock → iPhone 15 Pro disappears from the store despite being in-warehouse.',
              },
              {
                topic:'notifications (email/SMS)',
                guarantee:'At-Least-Once + notification_id dedup',
                color:'#F59E0B',
                why:'"Order shipped" not sent = customer calls support. "Order shipped" sent twice = minor annoyance. At-least-once ensures delivery. A notification_id (hash of order_id + event_type) stored in DynamoDB deduplicates: if already sent, skip.',
                wrong:'at-most-once: Notifications consumer crashes after offset commit but before sending email → customer receives no "shipped" notification → support ticket volume spikes during Prime Day.',
              },
            ].map(r => `
            <div style="background:#111827;border:1px solid #1E293B;border-radius:12px;padding:16px 20px">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap">
                <code style="font-size:11px;color:#FF6900;background:#0A0E1A;padding:3px 8px;border-radius:4px">${r.topic}</code>
                <span style="background:${r.color}22;color:${r.color};padding:3px 10px;border-radius:12px;font-size:10px;font-weight:700">${r.guarantee}</span>
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:11px">
                <div style="background:#0A0E1A;border-radius:8px;padding:10px 14px">
                  <div style="font-size:10px;font-weight:700;color:${r.color};margin-bottom:5px;text-transform:uppercase;letter-spacing:.06em">Why this guarantee</div>
                  <div style="color:#94A3B8;line-height:1.65">${r.why}</div>
                </div>
                <div style="background:#EF444408;border:1px solid #EF444422;border-radius:8px;padding:10px 14px">
                  <div style="font-size:10px;font-weight:700;color:#EF4444;margin-bottom:5px;text-transform:uppercase;letter-spacing:.06em">Wrong choice → what breaks</div>
                  <div style="color:#94A3B8;line-height:1.65">${r.wrong}</div>
                </div>
              </div>
            </div>`).join('')
          }
        </div>
      </div>

      <!-- EOS cost -->
      <div style="background:#10B98112;border:1.5px solid #10B98133;border-radius:12px;padding:18px 22px">
        <div style="font-size:13px;font-weight:700;color:#10B981;margin-bottom:12px">Why Amazon doesn't use EOS for everything — the real cost</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;font-size:12px">
          <div>
            <div style="color:#EF4444;font-weight:600;margin-bottom:8px">EOS overhead vs at-least-once</div>
            <div style="color:#94A3B8;line-height:1.75">
              • 2 extra broker RPCs per transaction (begin + commit)<br>
              • ~5ms added latency per commit (two-phase commit to coordinator)<br>
              • Consumers need isolation.level=read_committed — ~5% throughput penalty scanning transaction markers<br>
              • Each pod needs a unique transactional.id — complex in auto-scaled Kubernetes deployments
            </div>
          </div>
          <div>
            <div style="color:#10B981;font-weight:600;margin-bottom:8px">Amazon's rule of thumb</div>
            <div style="color:#94A3B8;line-height:1.75">
              Use EOS only when <em>both</em> loss and duplicates cause unacceptable business outcomes and the sink can't deduplicate externally.<br><br>
              At Amazon's scale (&gt;1M msgs/sec), 5ms per transaction × payment volume = real latency budget. At-least-once + idempotent sink is simpler, faster, cheaper — and just as correct for most pipelines.
            </div>
          </div>
        </div>
      </div>

    </div>`;
}
