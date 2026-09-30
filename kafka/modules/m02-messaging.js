import { createModuleShell, createIQSection } from '../components/module-shell.js';

const IQ = [
  {
    q: 'What is the difference between a Kafka topic and a partition?',
    a: 'A topic is a logical channel — a named category of related events. A partition is the physical unit of storage and parallelism. Amazon analogy: the <code>orders</code> topic is the concept of "every order ever placed on Amazon". The 3 partitions (P0, P1, P2) are the actual storage bins on disk — each is a separate ordered log on a separate broker. You write to and read from the <code>orders</code> topic as a logical address, but Kafka physically routes you to exactly one partition. Partition count sets max parallelism: 3 partitions → max 3 consumers in a group can work in parallel.',
    tip: 'Say "topic is the API, partition is the implementation" — topics are how you address data, partitions are how Kafka distributes and stores it.'
  },
  {
    q: 'What is the role of a Kafka broker?',
    a: 'A broker is a Kafka server that stores partitions on disk and handles produce/fetch requests. Each partition has one leader broker (all reads and writes go here) and N-1 follower brokers (silent copies for durability). Amazon analogy: Broker 1 is the leader for orders-P0. Every order event that hashes to P0 is written to Broker 1 first. Brokers 2 and 3 quietly replicate P0. If Broker 1 crashes mid-Prime Day, the controller promotes Broker 2 to leader for P0 in ~1 second — zero data loss, zero missed orders.',
    tip: 'A broker can simultaneously be a leader for some partitions and a follower for others. Leadership is per-partition, not per-broker.'
  },
  {
    q: 'How does Kafka differ from pub/sub systems like Google Pub/Sub or SNS?',
    a: 'Kafka retains messages durably; consumers pull at their own pace. Push-based pub/sub (SNS, Google Pub/Sub) delivers and typically deletes. Amazon\'s own SNS+SQS: SNS fans out to SQS queues, each queue gets one copy, and once consumed the message is gone. With Kafka: the fulfillment, fraud-detection, and notifications consumer groups all read the same <code>orders</code> topic independently — no separate fan-out wiring needed. If fraud-detection crashes and restarts, it replays from its last offset — it doesn\'t miss a single order. That durable, replayable log is Kafka\'s core difference.',
    tip: 'SNS+SQS is push-based fan-out + competing consumers. Kafka unifies both patterns, adds durable replay, and gives strict per-partition ordering.'
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M02 · Foundation',
    title: 'Messaging Fundamentals',
    subtitle: 'Producers, brokers, topics, consumers — every concept explained through Amazon\'s order system',
    tabs: [
      { id: 'concepts', label: '📖 Core Concepts' },
      { id: 'flow',     label: '🔄 Message Journey' },
      { id: 'design',   label: '⚙️ Design Guide' },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ]
  });

  buildConcepts(container);
  buildFlow(container);
  buildDesign(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return null;
}

function buildConcepts(container) {
  const tab = container.querySelector('#tab-concepts');
  const items = [
    {
      icon: '📤',
      title: 'Producer',
      tag: 'Write Path',
      body: `A service that <strong>writes events into Kafka</strong> — it picks the topic, optionally sets a key, and publishes.
        <div class="example-block">
          <span class="example-label">Amazon</span>
          The <strong>Order Service</strong> is a producer. The moment you click Buy Now, it creates one JSON event
          — <code>{orderId, product, price, userId}</code> — and publishes it to the <code>orders</code> topic in ~2ms.
          It doesn't call Inventory or Fulfillment. It just writes one event and returns "Order Confirmed" to your browser.
          The <strong>Payment Service</strong> is a separate producer that publishes to the <code>payments</code> topic
          when your card is charged. Producers never talk to consumers directly.
        </div>`
    },
    {
      icon: '📋',
      title: 'Topic',
      tag: 'Logical Channel',
      body: `A <strong>named, append-only log</strong> of related events. Records are never updated in place — only appended.
        <div class="example-block">
          <span class="example-label">Amazon</span>
          <code>orders</code> is a topic. Every Buy Now click from every Amazon customer worldwide adds one event
          to the end of this log. Order #847,230 sits at offset 847,230 — forever. It doesn't move, doesn't get overwritten.
          The log is retained for 7 days, then old events are pruned. Amazon has hundreds of topics:
          <code>orders</code>, <code>payments</code>, <code>inventory-updates</code>, <code>click-events</code>, <code>returns</code>.
          Each is a completely independent stream.
        </div>`
    },
    {
      icon: '🗂️',
      title: 'Partition',
      tag: 'Physical Unit',
      body: `The actual storage unit inside a topic. Each partition is an <strong>ordered, immutable sequence</strong> on one broker.
        <div class="example-block">
          <span class="example-label">Amazon</span>
          The <code>orders</code> topic has 3 partitions. Amazon keys every order event by <code>customer_id</code>.
          So all orders from customer <code>U-88234</code> always land in <strong>P2</strong> (deterministic hash).
          This guarantees her orders are processed in the exact sequence she placed them — Order #1 before Order #2, always.
          3 partitions also means 3 consumers can work in parallel: one consumer per partition.
        </div>`
    },
    {
      icon: '🖥️',
      title: 'Broker',
      tag: 'Storage Node',
      body: `A Kafka <strong>server that stores partitions</strong> on disk. Each partition has one leader broker and N-1 followers.
        <div class="example-block">
          <span class="example-label">Amazon</span>
          <strong>Broker 1</strong> is the leader for orders-P0. Every order event hashed to P0 is written to Broker 1 first.
          Brokers 2 and 3 quietly replicate P0 in the background. If Broker 1 crashes mid-Prime Day,
          the controller promotes Broker 2 as leader for P0 in ~1 second. No orders are lost. No offsets reset.
          No engineer is woken up to manually recover data.
        </div>`
    },
    {
      icon: '📥',
      title: 'Consumer',
      tag: 'Read Path',
      body: `A service that <strong>pulls records from a partition</strong>. It tracks its position using an offset and moves forward one record at a time.
        <div class="example-block">
          <span class="example-label">Amazon</span>
          One instance of the <strong>Fulfillment Service</strong> is a consumer. It reads order #847,231 from P0:
          checks Seattle warehouse stock, creates a shipping label, schedules UPS pickup.
          Then it commits offset 847,232 — "I've handled everything up to 847,231, give me 847,232 next."
          Kafka never pushes. Consumers pull at whatever rate they can handle.
        </div>`
    },
    {
      icon: '👥',
      title: 'Consumer Group',
      tag: 'Parallelism Unit',
      body: `A named set of consumers <strong>sharing the work</strong> of reading a topic — each partition is owned by exactly one consumer in the group.
        <div class="example-block">
          <span class="example-label">Amazon</span>
          The <code>fulfillment</code> group has 3 instances — one reads P0, one reads P1, one reads P2. 3× throughput.
          The <code>fraud-detection</code> group has 1 instance reading all 3 partitions by itself.
          The <code>notifications</code> group sends "Order Confirmed" emails.
          All three groups read the exact same <code>orders</code> topic simultaneously and
          <strong>completely independently</strong>. Adding a new group never affects the others.
        </div>`
    },
    {
      icon: '🔑',
      title: 'Record Key',
      tag: 'Partition Router',
      body: `An optional field on each event that <strong>determines partition assignment</strong> via consistent hash. Same key → always same partition.
        <div class="example-block">
          <span class="example-label">Amazon</span>
          Order Service sets <code>key = customer_id</code>. Customer <code>U-88234</code> hashes to P2.
          Customer <code>U-00123</code> hashes to P0. This matters for ordering: within P2,
          all of U-88234's orders arrive in the exact sequence she placed them —
          so Fulfillment never processes Order #2 before Order #1 for the same customer.
          If no key is set, Kafka round-robins across partitions (no ordering guarantee).
        </div>`
    },
    {
      icon: '📍',
      title: 'Offset',
      tag: 'Position Pointer',
      body: `A <strong>monotonically increasing integer</strong> per partition that marks exactly where a record lives. Consumers commit offsets to track progress.
        <div class="example-block">
          <span class="example-label">Amazon</span>
          Your iPhone 15 Pro order is at <strong>offset 847,231</strong> in P2.
          Fulfillment Service committed offset 847,231 — it handled your order.
          Fraud Detection is at 847,198 — 33 events behind due to a GC pause, but it'll catch up.
          Notifications is at 847,231 — on time, sent your email.
          Each group's offset is <strong>completely independent</strong>. Fraud Detection lagging
          doesn't slow Fulfillment by even 1ms.
        </div>`
    },
  ];

  tab.innerHTML = `
    <style>
      .example-block {
        margin-top: 10px;
        padding: 10px 12px;
        background: #0A0E1A;
        border-left: 3px solid #FF6900;
        border-radius: 0 6px 6px 0;
        font-size: 12px;
        color: #94A3B8;
        line-height: 1.65;
      }
      .example-label {
        display: inline-block;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: .08em;
        text-transform: uppercase;
        color: #FF6900;
        background: #FF690018;
        border-radius: 4px;
        padding: 1px 6px;
        margin-bottom: 6px;
      }
      .example-block code {
        background: #1E293B;
        padding: 1px 4px;
        border-radius: 3px;
        color: #06B6D4;
        font-size: 11px;
      }
    </style>
    <div class="info-grid">${items.map(c => `
      <div class="info-card">
        <div class="info-card-icon">${c.icon}</div>
        <div class="info-card-title">${c.title}</div>
        <div class="info-card-tag">${c.tag}</div>
        <div class="info-card-body" style="margin-top:8px">${c.body}</div>
      </div>`).join('')}
    </div>`;
}

function buildFlow(container) {
  const tab = container.querySelector('#tab-flow');
  tab.innerHTML = `
    <div class="svg-wrap">
      <svg viewBox="0 0 800 340" width="800" height="340" style="font-family:system-ui">
        <defs>
          <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#FF6900"/>
          </marker>
          <marker id="arr-b" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#3B82F6"/>
          </marker>
          <marker id="arr-g" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#10B981"/>
          </marker>
          <marker id="arr-p" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#8B5CF6"/>
          </marker>
        </defs>

        <!-- Producer -->
        <rect x="10" y="110" width="130" height="80" rx="10" fill="#1E293B" stroke="#FF6900" stroke-width="1.5"/>
        <text x="75" y="140" text-anchor="middle" fill="#FF6900" font-weight="700" font-size="11">Producer</text>
        <text x="75" y="156" text-anchor="middle" fill="#94A3B8" font-size="9">Order Service</text>
        <text x="75" y="170" text-anchor="middle" fill="#64748B" font-size="8">key = customer_id</text>
        <text x="75" y="182" text-anchor="middle" fill="#64748B" font-size="8">acks = all</text>

        <!-- Arrow producer → broker -->
        <line x1="140" y1="150" x2="200" y2="135" stroke="#FF6900" stroke-width="1.5" marker-end="url(#arr)"/>
        <text x="155" y="135" fill="#FF6900" font-size="8">publish</text>

        <!-- Broker box -->
        <rect x="200" y="60" width="380" height="210" rx="10" fill="#0F172A" stroke="#334155" stroke-width="1.5"/>
        <text x="390" y="82" text-anchor="middle" fill="#475569" font-size="10" font-weight="700">BROKER  ·  Topic: orders  (RF = 3)</text>

        <!-- Partition 0 -->
        <rect x="218" y="92" width="344" height="38" rx="6" fill="#1E293B" stroke="#334155"/>
        <text x="230" y="114" fill="#94A3B8" font-size="9" font-weight="700">P0</text>
        <rect x="250" y="97" width="34" height="28" rx="3" fill="#FF690022" stroke="#FF6900" stroke-width="1"/>
        <text x="267" y="115" text-anchor="middle" fill="#FF6900" font-size="8">847,229</text>
        <rect x="288" y="97" width="34" height="28" rx="3" fill="#FF690022" stroke="#FF6900" stroke-width="1"/>
        <text x="305" y="115" text-anchor="middle" fill="#FF6900" font-size="8">847,230</text>
        <rect x="326" y="97" width="34" height="28" rx="3" fill="#FF6900" stroke="#FF6900"/>
        <text x="343" y="115" text-anchor="middle" fill="#fff" font-size="8">847,231</text>
        <text x="368" y="112" fill="#64748B" font-size="8">← U-00123's order</text>

        <!-- Partition 1 -->
        <rect x="218" y="136" width="344" height="38" rx="6" fill="#1E293B" stroke="#334155"/>
        <text x="230" y="158" fill="#94A3B8" font-size="9" font-weight="700">P1</text>
        <rect x="250" y="141" width="34" height="28" rx="3" fill="#3B82F622" stroke="#3B82F6" stroke-width="1"/>
        <text x="267" y="159" text-anchor="middle" fill="#3B82F6" font-size="8">440,101</text>
        <rect x="288" y="141" width="34" height="28" rx="3" fill="#3B82F622" stroke="#3B82F6" stroke-width="1"/>
        <text x="305" y="159" text-anchor="middle" fill="#3B82F6" font-size="8">440,102</text>

        <!-- Partition 2 -->
        <rect x="218" y="180" width="344" height="38" rx="6" fill="#1E293B" stroke="#334155"/>
        <text x="230" y="202" fill="#94A3B8" font-size="9" font-weight="700">P2</text>
        <rect x="250" y="185" width="34" height="28" rx="3" fill="#10B98122" stroke="#10B981" stroke-width="1"/>
        <text x="267" y="203" text-anchor="middle" fill="#10B981" font-size="8">623,450</text>
        <text x="310" y="202" fill="#64748B" font-size="8">← U-88234's orders (your iPhone)</text>

        <!-- Consumer A - fulfillment -->
        <rect x="640" y="60" width="150" height="65" rx="8" fill="#1E293B" stroke="#FF6900" stroke-width="1.5"/>
        <text x="715" y="83" text-anchor="middle" fill="#FF6900" font-weight="700" font-size="10">Fulfillment</text>
        <text x="715" y="98" text-anchor="middle" fill="#94A3B8" font-size="9">group: fulfillment</text>
        <text x="715" y="112" text-anchor="middle" fill="#64748B" font-size="8">offset 847,231 on P0</text>

        <!-- Consumer B - fraud -->
        <rect x="640" y="140" width="150" height="65" rx="8" fill="#1E293B" stroke="#8B5CF6" stroke-width="1.5"/>
        <text x="715" y="163" text-anchor="middle" fill="#8B5CF6" font-weight="700" font-size="10">Fraud Detection</text>
        <text x="715" y="178" text-anchor="middle" fill="#94A3B8" font-size="9">group: fraud-detection</text>
        <text x="715" y="192" text-anchor="middle" fill="#F59E0B" font-size="8">offset 847,198 — lagging</text>

        <!-- Consumer C - notifications -->
        <rect x="640" y="220" width="150" height="65" rx="8" fill="#1E293B" stroke="#10B981" stroke-width="1.5"/>
        <text x="715" y="243" text-anchor="middle" fill="#10B981" font-weight="700" font-size="10">Notifications</text>
        <text x="715" y="258" text-anchor="middle" fill="#94A3B8" font-size="9">group: notifications</text>
        <text x="715" y="272" text-anchor="middle" fill="#64748B" font-size="8">offset 847,231 on P0</text>

        <!-- Arrows broker → consumers -->
        <line x1="562" y1="115" x2="638" y2="95"  stroke="#FF6900" stroke-width="1.5" marker-end="url(#arr)"/>
        <line x1="562" y1="150" x2="638" y2="172" stroke="#8B5CF6" stroke-width="1.5" marker-end="url(#arr-p)"/>
        <line x1="562" y1="195" x2="638" y2="248" stroke="#10B981" stroke-width="1.5" marker-end="url(#arr-g)"/>

        <text x="575" y="100" fill="#FF6900" font-size="8">fetch P0</text>
        <text x="565" y="165" fill="#8B5CF6" font-size="8">fetch all</text>
        <text x="565" y="230" fill="#10B981" font-size="8">fetch P0</text>
      </svg>
    </div>

    <div class="scroll-content">
      <!-- Journey header -->
      <div style="background:#111827;border:1px solid #1E293B;border-radius:14px;padding:20px 24px;margin-bottom:24px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#64748B;margin-bottom:8px">Tracing one event end-to-end</div>
        <div style="font-size:17px;font-weight:800;color:#F1F5F9;margin-bottom:4px">Order AMZ-24601 — iPhone 15 Pro, $999</div>
        <div style="font-size:13px;color:#94A3B8">Customer U-00123 clicks Buy Now. Here is what each Kafka concept does, in sequence.</div>
      </div>

      <!-- Journey steps -->
      <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:28px">

        <div style="display:flex;gap:16px;align-items:flex-start">
          <div style="flex-shrink:0;min-width:90px;text-align:right">
            <span style="background:#FF6900;color:#000;font-size:9px;font-weight:800;padding:2px 8px;border-radius:20px">PRODUCER</span>
          </div>
          <div style="flex:1;background:#111827;border:1px solid #1E293B;border-radius:10px;padding:14px 16px">
            <div style="font-size:13px;font-weight:600;color:#F1F5F9;margin-bottom:4px">Order Service publishes the event</div>
            <div style="font-size:12px;color:#94A3B8;line-height:1.65">Creates <code style="background:#0A0E1A;padding:1px 4px;border-radius:3px;color:#06B6D4">{orderId:"AMZ-24601", product:"iPhone 15 Pro", price:999, userId:"U-00123"}</code> and calls <code style="background:#0A0E1A;padding:1px 4px;border-radius:3px;color:#06B6D4">producer.send("orders", key="U-00123", value=event)</code>. Done in ~2ms. Doesn't call any downstream service.</div>
          </div>
        </div>

        <div style="display:flex;gap:16px;align-items:flex-start">
          <div style="flex-shrink:0;min-width:90px;text-align:right">
            <span style="background:#06B6D4;color:#000;font-size:9px;font-weight:800;padding:2px 8px;border-radius:20px">RECORD KEY</span>
          </div>
          <div style="flex:1;background:#111827;border:1px solid #1E293B;border-radius:10px;padding:14px 16px">
            <div style="font-size:13px;font-weight:600;color:#F1F5F9;margin-bottom:4px">Key <code style="background:#0A0E1A;padding:1px 4px;border-radius:3px;color:#06B6D4">"U-00123"</code> routes to P0</div>
            <div style="font-size:12px;color:#94A3B8;line-height:1.65">Kafka hashes <code style="background:#0A0E1A;padding:1px 4px;border-radius:3px;color:#06B6D4">"U-00123"</code> → picks Partition 0. All future orders from U-00123 will always go to P0. This guarantees their orders are fulfilled in sequence — first order first, second order second.</div>
          </div>
        </div>

        <div style="display:flex;gap:16px;align-items:flex-start">
          <div style="flex-shrink:0;min-width:90px;text-align:right">
            <span style="background:#3B82F6;color:#fff;font-size:9px;font-weight:800;padding:2px 8px;border-radius:20px">TOPIC / PARTITION</span>
          </div>
          <div style="flex:1;background:#111827;border:1px solid #1E293B;border-radius:10px;padding:14px 16px">
            <div style="font-size:13px;font-weight:600;color:#F1F5F9;margin-bottom:4px">Appended to <code style="background:#0A0E1A;padding:1px 4px;border-radius:3px;color:#06B6D4">orders-P0</code> at offset 847,231</div>
            <div style="font-size:12px;color:#94A3B8;line-height:1.65">The event joins the end of the P0 log as a permanent, immutable record at offset 847,231. It will never move, never be updated. Orders 847,229 and 847,230 sit before it forever.</div>
          </div>
        </div>

        <div style="display:flex;gap:16px;align-items:flex-start">
          <div style="flex-shrink:0;min-width:90px;text-align:right">
            <span style="background:#475569;color:#fff;font-size:9px;font-weight:800;padding:2px 8px;border-radius:20px">BROKER</span>
          </div>
          <div style="flex:1;background:#111827;border:1px solid #1E293B;border-radius:10px;padding:14px 16px">
            <div style="font-size:13px;font-weight:600;color:#F1F5F9;margin-bottom:4px">Broker 1 writes it, Brokers 2 & 3 replicate</div>
            <div style="font-size:12px;color:#94A3B8;line-height:1.65">Broker 1 (P0 leader) receives the write and replicates to Brokers 2 and 3. With <code style="background:#0A0E1A;padding:1px 4px;border-radius:3px;color:#06B6D4">acks=all</code>, the Order Service gets confirmation only after all three have written it. Your order is durable before "Order Confirmed" appears on screen.</div>
          </div>
        </div>

        <div style="display:flex;gap:16px;align-items:flex-start">
          <div style="flex-shrink:0;min-width:90px;text-align:right">
            <span style="background:#10B981;color:#000;font-size:9px;font-weight:800;padding:2px 8px;border-radius:20px">CONSUMER GROUP</span>
          </div>
          <div style="flex:1;background:#111827;border:1px solid #1E293B;border-radius:10px;padding:14px 16px">
            <div style="font-size:13px;font-weight:600;color:#F1F5F9;margin-bottom:4px">3 groups read offset 847,231 — independently</div>
            <div style="font-size:12px;color:#94A3B8;line-height:1.65">
              <strong style="color:#FF6900">Fulfillment</strong> reads P0, picks the iPhone from the Seattle warehouse, generates a shipping label.<br>
              <strong style="color:#8B5CF6">Fraud Detection</strong> reads P0, runs its ML model — score 0.12 (legit). No flag.<br>
              <strong style="color:#10B981">Notifications</strong> reads P0, fires the "Order Confirmed" email + push notification.<br>
              All three run in parallel. None knows the others exist.
            </div>
          </div>
        </div>

        <div style="display:flex;gap:16px;align-items:flex-start">
          <div style="flex-shrink:0;min-width:90px;text-align:right">
            <span style="background:#F59E0B;color:#000;font-size:9px;font-weight:800;padding:2px 8px;border-radius:20px">OFFSET</span>
          </div>
          <div style="flex:1;background:#111827;border:1px solid #1E293B;border-radius:10px;padding:14px 16px">
            <div style="font-size:13px;font-weight:600;color:#F1F5F9;margin-bottom:4px">Each group commits its own offset — completely independent</div>
            <div style="font-size:12px;color:#94A3B8;line-height:1.65">Fulfillment commits offset 847,232 (processed yours, ready for the next). Fraud Detection commits 847,199 (it was 33 events behind — GC pause — but it's catching up). Neither affects the other. If Fraud Detection crashes right now, it restarts at 847,199 and replays from there. Zero orders missed.</div>
          </div>
        </div>

      </div>

      <!-- Kafka ↔ Amazon cheat sheet -->
      <div style="background:#111827;border:1px solid #1E293B;border-radius:14px;padding:20px 24px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#64748B;margin-bottom:14px">Kafka concept → Amazon analog</div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead>
              <tr style="border-bottom:1px solid #1E293B">
                <th style="text-align:left;color:#64748B;padding:8px 12px;font-size:10px;letter-spacing:.06em;text-transform:uppercase">Kafka Term</th>
                <th style="text-align:left;color:#64748B;padding:8px 12px;font-size:10px;letter-spacing:.06em;text-transform:uppercase">Amazon Analog</th>
                <th style="text-align:left;color:#64748B;padding:8px 12px;font-size:10px;letter-spacing:.06em;text-transform:uppercase">What it does in the order flow</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom:1px solid #0F172A"><td style="padding:10px 12px;color:#F1F5F9;font-weight:700">Producer</td><td style="padding:10px 12px;color:#FF6900">Order Service, Payment Service</td><td style="padding:10px 12px;color:#94A3B8">Publishes one event per customer action — Buy Now, card charged, return requested</td></tr>
              <tr style="border-bottom:1px solid #0F172A"><td style="padding:10px 12px;color:#F1F5F9;font-weight:700">Topic</td><td style="padding:10px 12px;color:#FF6900"><code style="background:#0A0E1A;color:#06B6D4;padding:1px 4px;border-radius:3px">orders</code>, <code style="background:#0A0E1A;color:#06B6D4;padding:1px 4px;border-radius:3px">payments</code>, <code style="background:#0A0E1A;color:#06B6D4;padding:1px 4px;border-radius:3px">returns</code></td><td style="padding:10px 12px;color:#94A3B8">Named channel that collects all events of a type from all producers globally</td></tr>
              <tr style="border-bottom:1px solid #0F172A"><td style="padding:10px 12px;color:#F1F5F9;font-weight:700">Partition</td><td style="padding:10px 12px;color:#FF6900">P0 = US-West · P1 = US-East · P2 = Intl</td><td style="padding:10px 12px;color:#94A3B8">Physical storage bin; orders within a partition stay in the exact sequence they arrived</td></tr>
              <tr style="border-bottom:1px solid #0F172A"><td style="padding:10px 12px;color:#F1F5F9;font-weight:700">Broker</td><td style="padding:10px 12px;color:#FF6900">Kafka server in Amazon us-east-1 datacenter</td><td style="padding:10px 12px;color:#94A3B8">Holds partitions on disk; leader handles writes, followers keep safe copies</td></tr>
              <tr style="border-bottom:1px solid #0F172A"><td style="padding:10px 12px;color:#F1F5F9;font-weight:700">Consumer</td><td style="padding:10px 12px;color:#FF6900">One Fulfillment Service instance reading P0</td><td style="padding:10px 12px;color:#94A3B8">Pulls the next order event, processes it, commits the offset</td></tr>
              <tr style="border-bottom:1px solid #0F172A"><td style="padding:10px 12px;color:#F1F5F9;font-weight:700">Consumer Group</td><td style="padding:10px 12px;color:#FF6900">All 3 Fulfillment Service instances together</td><td style="padding:10px 12px;color:#94A3B8">Splits the partitions — 3 consumers, 3 partitions, 3× throughput</td></tr>
              <tr style="border-bottom:1px solid #0F172A"><td style="padding:10px 12px;color:#F1F5F9;font-weight:700">Record Key</td><td style="padding:10px 12px;color:#FF6900"><code style="background:#0A0E1A;color:#06B6D4;padding:1px 4px;border-radius:3px">customer_id = "U-88234"</code></td><td style="padding:10px 12px;color:#94A3B8">Routes all orders from one customer to the same partition, preserving sequence</td></tr>
              <tr><td style="padding:10px 12px;color:#F1F5F9;font-weight:700">Offset</td><td style="padding:10px 12px;color:#FF6900">Position 847,231 in P0</td><td style="padding:10px 12px;color:#94A3B8">Bookmark — each group knows exactly which event to read next; safe restart point</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
}

function buildDesign(container) {
  const tab = container.querySelector('#tab-design');

  // Partition-consumer scenario data
  const scenarios = [
    {
      label: '1 Consumer, 3 Partitions',
      badge: 'UNDER-SCALED',
      badgeColor: '#EF4444',
      desc: 'One consumer handles all three partitions alone. Throughput is capped by how fast one instance can process events.',
      amazon: 'One Fulfillment worker processing every Amazon order — a bottleneck on Prime Day.',
      consumers: [
        { id: 'C1', color: '#FF6900', partitions: ['P0','P1','P2'] },
      ],
    },
    {
      label: '2 Consumers, 3 Partitions',
      badge: 'UNBALANCED',
      badgeColor: '#F59E0B',
      desc: 'C1 owns P0, C2 owns P1 + P2. C2 is the bottleneck — it handles twice the load of C1.',
      amazon: 'Worker 1 handles US-West orders. Worker 2 handles US-East AND International — overloaded.',
      consumers: [
        { id: 'C1', color: '#FF6900', partitions: ['P0'] },
        { id: 'C2', color: '#3B82F6', partitions: ['P1','P2'] },
      ],
    },
    {
      label: '3 Consumers, 3 Partitions',
      badge: 'IDEAL ✓',
      badgeColor: '#10B981',
      desc: 'One consumer per partition. Each works independently at full speed. Maximum throughput for this partition count.',
      amazon: 'Three Fulfillment workers — each owns exactly one region. Linear throughput, no bottleneck.',
      consumers: [
        { id: 'C1', color: '#FF6900', partitions: ['P0'] },
        { id: 'C2', color: '#3B82F6', partitions: ['P1'] },
        { id: 'C3', color: '#10B981', partitions: ['P2'] },
      ],
    },
    {
      label: '4 Consumers, 3 Partitions',
      badge: 'WASTEFUL',
      badgeColor: '#8B5CF6',
      desc: 'C4 has no partition to own — it sits completely idle. Adding more consumers beyond the partition count gains nothing.',
      amazon: 'A fourth Fulfillment worker shows up but all regions are taken — they stand idle all day.',
      consumers: [
        { id: 'C1', color: '#FF6900', partitions: ['P0'] },
        { id: 'C2', color: '#3B82F6', partitions: ['P1'] },
        { id: 'C3', color: '#10B981', partitions: ['P2'] },
        { id: 'C4', color: '#475569', partitions: [], idle: true },
      ],
    },
  ];

  const partitionColors = { P0: '#FF6900', P1: '#3B82F6', P2: '#10B981' };

  const scenarioCards = scenarios.map(s => {
    const allPartitions = ['P0','P1','P2'];
    const pMap = {};
    s.consumers.forEach(c => c.partitions.forEach(p => { pMap[p] = c; }));

    const pRows = allPartitions.map(p => {
      const c = pMap[p];
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <div style="width:32px;height:26px;border-radius:5px;border:1.5px solid ${partitionColors[p]};background:${partitionColors[p]}18;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:${partitionColors[p]}">${p}</div>
        <div style="flex:1;height:2px;background:${c ? c.color : '#334155'}22;position:relative">
          <div style="position:absolute;top:50%;left:0;right:0;height:1.5px;background:${c ? c.color : '#334155'};transform:translateY(-50%)"></div>
        </div>
        <div style="width:32px;height:26px;border-radius:5px;border:1.5px solid ${c ? c.color : '#334155'};background:${c ? c.color : '#334155'}18;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:${c ? c.color : '#475569'}">${c ? c.id : '—'}</div>
      </div>`;
    }).join('');

    const idleRow = s.consumers.find(c => c.idle) ? `
      <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
        <div style="width:32px;height:26px;border-radius:5px;border:1.5px dashed #475569;display:flex;align-items:center;justify-content:center;font-size:9px;color:#475569">—</div>
        <div style="flex:1;height:1.5px;background:#334155;border-top:1.5px dashed #334155"></div>
        <div style="width:32px;height:26px;border-radius:5px;border:1.5px dashed #475569;background:#47556918;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#475569">C4</div>
      </div>
      <div style="margin-top:4px;font-size:10px;color:#EF4444;text-align:right">↑ IDLE — no partition</div>` : '';

    return `
      <div style="background:#111827;border:1.5px solid #1E293B;border-radius:12px;padding:18px 20px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <div style="font-size:12px;font-weight:700;color:#F1F5F9">${s.label}</div>
          <span style="background:${s.badgeColor}22;color:${s.badgeColor};font-size:9px;font-weight:800;padding:2px 8px;border-radius:20px;letter-spacing:.06em">${s.badge}</span>
        </div>
        <div style="margin-bottom:12px">
          <div style="font-size:10px;font-weight:600;color:#475569;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px">Partition → Consumer</div>
          ${pRows}${idleRow}
        </div>
        <div style="font-size:11px;color:#94A3B8;line-height:1.6;border-top:1px solid #1E293B;padding-top:10px;margin-top:4px">${s.desc}</div>
        <div style="margin-top:8px;padding:8px 10px;background:#0A0E1A;border-left:3px solid #FF6900;border-radius:0 5px 5px 0;font-size:11px;color:#94A3B8;line-height:1.5"><span style="color:#FF6900;font-weight:700;font-size:9px;letter-spacing:.06em;text-transform:uppercase">Amazon</span><br>${s.amazon}</div>
      </div>`;
  }).join('');

  tab.innerHTML = `
    <div class="scroll-content" style="max-width:920px;margin:0 auto">

      <!-- ── 1. TOPICS ─────────────────────────────────────────────── -->
      <div class="design-section" style="margin-bottom:36px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <div style="width:36px;height:36px;border-radius:10px;background:#FF690022;border:1.5px solid #FF6900;display:flex;align-items:center;justify-content:center;font-size:18px">📋</div>
          <div>
            <div style="font-size:16px;font-weight:800;color:#F1F5F9">How Topics are decided</div>
            <div style="font-size:12px;color:#64748B">One topic per event type — never mix different facts in one stream</div>
          </div>
        </div>

        <div style="background:#111827;border:1px solid #1E293B;border-radius:12px;padding:18px 22px;margin-bottom:16px">
          <div style="font-size:13px;font-weight:700;color:#F1F5F9;margin-bottom:10px">The Rule</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;font-size:12px">
            <div style="background:#10B98110;border:1px solid #10B98133;border-radius:8px;padding:12px">
              <div style="color:#10B981;font-weight:700;margin-bottom:6px">✓ One topic per event type</div>
              <ul style="color:#94A3B8;padding-left:14px;margin:0;line-height:1.8">
                <li>Different schema → different topic</li>
                <li>Different retention needs → different topic</li>
                <li>Different owning team → different topic</li>
                <li>Different consumers → usually different topic</li>
              </ul>
            </div>
            <div style="background:#EF444410;border:1px solid #EF444433;border-radius:8px;padding:12px">
              <div style="color:#EF4444;font-weight:700;margin-bottom:6px">✗ Don't mix event types</div>
              <ul style="color:#94A3B8;padding-left:14px;margin:0;line-height:1.8">
                <li>Orders + Payments in one topic — schema chaos</li>
                <li>Consumers have to filter 90% of irrelevant events</li>
                <li>One team's retention needs block the other</li>
                <li>Hard to replay just one type of event</li>
              </ul>
            </div>
          </div>
        </div>

        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748B;margin-bottom:10px">Amazon's topic landscape</div>
        <div style="overflow-x:auto;border-radius:10px;border:1px solid #1E293B">
          <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:620px">
            <thead><tr style="background:#0F172A;border-bottom:1px solid #1E293B">
              <th style="padding:10px 14px;text-align:left;color:#64748B;font-size:10px;text-transform:uppercase;letter-spacing:.06em">Topic</th>
              <th style="padding:10px 14px;text-align:left;color:#64748B;font-size:10px;text-transform:uppercase;letter-spacing:.06em">Event</th>
              <th style="padding:10px 14px;text-align:left;color:#64748B;font-size:10px;text-transform:uppercase;letter-spacing:.06em">Producer</th>
              <th style="padding:10px 14px;text-align:left;color:#64748B;font-size:10px;text-transform:uppercase;letter-spacing:.06em">Key Consumers</th>
              <th style="padding:10px 14px;text-align:left;color:#64748B;font-size:10px;text-transform:uppercase;letter-spacing:.06em">Retention</th>
            </tr></thead>
            <tbody>
              ${[
                ['orders','Buy Now clicked','Order Service','Fulfillment, Fraud, Notifications, Analytics','7 days'],
                ['payments','Card charged / refunded','Payment Service','Finance, Fraud, Notifications','30 days'],
                ['inventory-updates','Stock level changed','Inventory Service','Order Service, Fulfillment','3 days'],
                ['click-events','Page / product clicked','Web & App frontend','Recommendations, Analytics','1 day'],
                ['returns','Return initiated','Returns Service','Fulfillment, Refund Service, Analytics','30 days'],
                ['shipping-events','Shipped / Out for delivery / Delivered','Logistics Service','Notifications, Analytics','14 days'],
              ].map(([t,e,p,c,r],i) => `
                <tr style="border-bottom:1px solid #0F172A;${i%2===0?'':'background:#0A0E1A08'}">
                  <td style="padding:10px 14px;color:#FF6900;font-family:monospace;font-size:11px">${t}</td>
                  <td style="padding:10px 14px;color:#F1F5F9">${e}</td>
                  <td style="padding:10px 14px;color:#94A3B8">${p}</td>
                  <td style="padding:10px 14px;color:#94A3B8">${c}</td>
                  <td style="padding:10px 14px;color:#64748B">${r}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── 2. PARTITIONS ────────────────────────────────────────── -->
      <div class="design-section" style="margin-bottom:36px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <div style="width:36px;height:36px;border-radius:10px;background:#3B82F622;border:1.5px solid #3B82F6;display:flex;align-items:center;justify-content:center;font-size:18px">🗂️</div>
          <div>
            <div style="font-size:16px;font-weight:800;color:#F1F5F9">How Partitions are decided</div>
            <div style="font-size:12px;color:#64748B">Partition count = the maximum consumers you'll ever want in one group</div>
          </div>
        </div>

        <div style="background:#111827;border:1px solid #1E293B;border-radius:12px;padding:18px 22px;margin-bottom:16px">
          <div style="font-size:13px;font-weight:700;color:#F1F5F9;margin-bottom:10px">The Rule</div>
          <p style="font-size:13px;color:#94A3B8;line-height:1.7;margin-bottom:10px">The partition count is the <strong style="color:#F1F5F9">ceiling on parallelism</strong> for any consumer group. You can never have more active consumers than partitions — the extras sit idle. And you can only <em>increase</em> partition count (never decrease cleanly), so plan ahead.</p>
          <div style="background:#0A0E1A;border-radius:8px;padding:14px 16px;font-size:12px;color:#94A3B8;line-height:1.8">
            <strong style="color:#F59E0B">Formula:</strong> &nbsp;partitions ≥ peak_throughput ÷ throughput_per_consumer<br>
            <strong style="color:#FF6900">Amazon example:</strong> &nbsp;orders topic expects 50,000 events/sec at Prime Day peak. One Fulfillment consumer handles 20,000/sec. → minimum 3 partitions (50k ÷ 20k = 2.5, round up to 3).<br>
            <strong style="color:#10B981">Tip:</strong> &nbsp;Over-partition slightly (e.g. 6 instead of 3) so you can scale consumers later without repartitioning.
          </div>
        </div>

        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748B;margin-bottom:12px">The 4 scenarios — always 3 partitions, varying consumer count</div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-bottom:16px">
          ${scenarioCards}
        </div>

        <div style="background:#10B98112;border:1px solid #10B98133;border-radius:10px;padding:14px 18px;font-size:12px;color:#10B981;line-height:1.7">
          <strong>Golden rule:</strong> Set partition count = the maximum number of consumers you'll ever want reading in parallel. For Amazon's <code style="background:#0A0E1A;padding:1px 4px;border-radius:3px">orders</code> topic in Fulfillment, that's 3 — so 3 partitions. If load grows 10×, increase partitions to 30 and scale consumers to match.
        </div>
      </div>

      <!-- ── 3. PARTITION KEY ─────────────────────────────────────────────── -->
      <div class="design-section" style="margin-bottom:36px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <div style="width:36px;height:36px;border-radius:10px;background:#06B6D422;border:1.5px solid #06B6D4;display:flex;align-items:center;justify-content:center;font-size:18px">🔑</div>
          <div>
            <div style="font-size:16px;font-weight:800;color:#F1F5F9">How the Partition Key is chosen</div>
            <div style="font-size:12px;color:#64748B">Key = the entity for which event order matters</div>
          </div>
        </div>

        <div style="background:#111827;border:1px solid #1E293B;border-radius:12px;padding:18px 22px;margin-bottom:16px">
          <p style="font-size:13px;color:#94A3B8;line-height:1.7;margin-bottom:0">The key is hashed to pick a partition. <strong style="color:#F1F5F9">Same key → always same partition → events for that key are in strict order.</strong> No key → Kafka round-robins → maximum throughput but zero ordering. Choose the key based on what ordering you actually need downstream.</p>
        </div>

        <div style="overflow-x:auto;border-radius:10px;border:1px solid #1E293B;margin-bottom:14px">
          <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:600px">
            <thead><tr style="background:#0F172A;border-bottom:1px solid #1E293B">
              <th style="padding:10px 14px;text-align:left;color:#64748B;font-size:10px;text-transform:uppercase;letter-spacing:.06em">Key Choice</th>
              <th style="padding:10px 14px;text-align:left;color:#64748B;font-size:10px;text-transform:uppercase;letter-spacing:.06em">Ordering Guarantee</th>
              <th style="padding:10px 14px;text-align:left;color:#64748B;font-size:10px;text-transform:uppercase;letter-spacing:.06em">Amazon Use Case</th>
              <th style="padding:10px 14px;text-align:left;color:#64748B;font-size:10px;text-transform:uppercase;letter-spacing:.06em">Watch Out</th>
            </tr></thead>
            <tbody>
              ${[
                ['customer_id','All orders for one customer are in sequence','Fulfillment — customer\'s Order #1 always processed before Order #2','OK cardinality; some high-value customers may be heavy'],
                ['order_id','All lifecycle events for one order are in sequence','Tracking — Placed → Packed → Shipped → Delivered in order','High cardinality is fine; no per-customer ordering'],
                ['product_id','All inventory changes for one product are in sequence','Inventory — stock increments and decrements for the same product never race','Hot partition risk if a viral product gets 100× more events'],
                ['null (no key)','No ordering — pure round-robin across partitions','Click-events — you only care about throughput, not order','Cannot replay in sequence; ordering is undefined'],
                ['country_code','All events from one country land together','Regional analytics — isolate US vs EU events','⚠️ Hot partition: US → P0 gets 60% of all traffic'],
              ].map(([k,o,u,w]) => `
                <tr style="border-bottom:1px solid #0F172A">
                  <td style="padding:10px 14px;color:#06B6D4;font-family:monospace;font-size:11px">${k}</td>
                  <td style="padding:10px 14px;color:#F1F5F9">${o}</td>
                  <td style="padding:10px 14px;color:#94A3B8">${u}</td>
                  <td style="padding:10px 14px;color:#F59E0B;font-size:11px">${w}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>

        <div style="background:#EF444412;border:1.5px solid #EF444444;border-radius:10px;padding:16px 18px">
          <div style="font-size:12px;font-weight:700;color:#EF4444;margin-bottom:10px">⚠️ The Hot Partition Trap — avoid low-cardinality keys</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:12px">
            <div>
              <div style="color:#EF4444;font-weight:600;margin-bottom:6px">Bad: key = country_code</div>
              <div style="background:#0A0E1A;border-radius:8px;padding:10px;font-size:11px;color:#94A3B8;line-height:1.9">
                P0 (US) &nbsp; → <span style="color:#EF4444">████████████ 60%</span> of traffic<br>
                P1 (EU) &nbsp; → <span style="color:#F59E0B">████ 25%</span> of traffic<br>
                P2 (APAC) → <span style="color:#94A3B8">███ 15%</span> of traffic<br>
                <span style="color:#64748B;font-size:10px">Consumer on P0 is 4× busier than P2 — unbalanced</span>
              </div>
            </div>
            <div>
              <div style="color:#10B981;font-weight:600;margin-bottom:6px">Good: key = customer_id</div>
              <div style="background:#0A0E1A;border-radius:8px;padding:10px;font-size:11px;color:#94A3B8;line-height:1.9">
                P0 → <span style="color:#10B981">████ 34%</span> of traffic<br>
                P1 → <span style="color:#10B981">████ 33%</span> of traffic<br>
                P2 → <span style="color:#10B981">████ 33%</span> of traffic<br>
                <span style="color:#64748B;font-size:10px">High cardinality → even hash spread → balanced</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── 4. CONSUMER GROUPS ────────────────────────────────────────── -->
      <div class="design-section" style="margin-bottom:36px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <div style="width:36px;height:36px;border-radius:10px;background:#10B98122;border:1.5px solid #10B981;display:flex;align-items:center;justify-content:center;font-size:18px">👥</div>
          <div>
            <div style="font-size:16px;font-weight:800;color:#F1F5F9">How Consumer Groups are decided</div>
            <div style="font-size:12px;color:#64748B">One group per independent downstream use case</div>
          </div>
        </div>

        <div style="background:#111827;border:1px solid #1E293B;border-radius:12px;padding:18px 22px;margin-bottom:16px">
          <p style="font-size:13px;color:#94A3B8;line-height:1.7;margin-bottom:10px">Ask yourself: <em>"Does this use case need its own independent position in the stream?"</em> If yes → new consumer group. Each group gets its own offset pointer, completely independent of all others. One group crashing, lagging, or replaying <strong style="color:#F1F5F9">never affects any other group.</strong></p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12px">
            <div style="background:#10B98110;border:1px solid #10B98133;border-radius:8px;padding:12px">
              <div style="color:#10B981;font-weight:700;margin-bottom:6px">✓ Create a new group when</div>
              <ul style="color:#94A3B8;padding-left:14px;margin:0;line-height:1.8">
                <li>Different team / different service</li>
                <li>Different business action on the same event</li>
                <li>Different processing speed or SLA</li>
                <li>Need to replay independently of others</li>
              </ul>
            </div>
            <div style="background:#EF444410;border:1px solid #EF444433;border-radius:8px;padding:12px">
              <div style="color:#EF4444;font-weight:700;margin-bottom:6px">✗ Don't share a group when</div>
              <ul style="color:#94A3B8;padding-left:14px;margin:0;line-height:1.8">
                <li>Two services do completely different things</li>
                <li>One service should not know the other's offset</li>
                <li>Services have different scaling requirements</li>
                <li>One replay would block the other's progress</li>
              </ul>
            </div>
          </div>
        </div>

        <div style="background:#111827;border:1px solid #1E293B;border-radius:12px;padding:18px 22px">
          <div style="font-size:12px;font-weight:700;color:#F1F5F9;margin-bottom:14px">Amazon's <code style="background:#0A0E1A;color:#FF6900;padding:2px 6px;border-radius:4px">orders</code> topic — 4 consumer groups, all reading the same stream</div>

          <div style="background:#0A0E1A;border:1.5px solid #FF6900;border-radius:8px;padding:10px 16px;text-align:center;margin-bottom:16px;font-size:12px;font-weight:700;color:#FF6900">
            Topic: orders &nbsp;|&nbsp; 3 partitions &nbsp;|&nbsp; 7-day retention
          </div>

          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">
            ${[
              { color:'#10B981', icon:'🚚', name:'fulfillment', size:'3 consumers', offset:'847,231', action:'Picks item, packs, generates shipping label, schedules UPS pickup' },
              { color:'#8B5CF6', icon:'🛡️', name:'fraud-detection', size:'2 consumers', offset:'847,198 (lagging)', action:'ML model scores every order — unusual IP? High velocity? New card?' },
              { color:'#F59E0B', icon:'🔔', name:'notifications', size:'1 consumer', offset:'847,231', action:'Sends Order Confirmed email + push + SMS' },
              { color:'#06B6D4', icon:'📊', name:'analytics', size:'1 consumer', offset:'312,000 (replaying!)', action:'Joined 3 days later — replaying 7 days of history for dashboards' },
            ].map(g => `
              <div style="background:#0A0E1A;border:1px solid ${g.color}33;border-radius:10px;padding:14px">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                  <span style="font-size:16px">${g.icon}</span>
                  <div>
                    <div style="font-size:11px;font-weight:700;color:${g.color}">${g.name}</div>
                    <div style="font-size:10px;color:#475569">${g.size}</div>
                  </div>
                  <div style="margin-left:auto;font-size:10px;color:#64748B">offset: <span style="color:${g.color}">${g.offset}</span></div>
                </div>
                <div style="font-size:11px;color:#94A3B8;line-height:1.6">${g.action}</div>
              </div>`).join('')}
          </div>

          <div style="margin-top:14px;background:#06B6D412;border:1px solid #06B6D433;border-radius:8px;padding:12px 14px;font-size:12px;color:#06B6D4;line-height:1.65">
            💡 <strong>Notice the analytics group:</strong> It started reading 3 days after the others — at offset 312,000 while everyone else is at 847,231. It's catching up. Order Service was never changed. No other group was affected. The event was just sitting in Kafka, waiting.
          </div>
        </div>
      </div>

      <!-- ── 5. CONSUMER COUNT ─────────────────────────────────────────────── -->
      <div class="design-section" style="margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <div style="width:36px;height:36px;border-radius:10px;background:#F59E0B22;border:1.5px solid #F59E0B;display:flex;align-items:center;justify-content:center;font-size:18px">⚖️</div>
          <div>
            <div style="font-size:16px;font-weight:800;color:#F1F5F9">How many Consumers per Group?</div>
            <div style="font-size:12px;color:#64748B">Scale up to the partition count — then stop</div>
          </div>
        </div>

        <div style="background:#111827;border:1px solid #1E293B;border-radius:12px;padding:18px 22px;margin-bottom:14px">
          <p style="font-size:13px;color:#94A3B8;line-height:1.7;margin-bottom:12px">The constraint is simple: <strong style="color:#F1F5F9">consumers ≤ partitions</strong>. Beyond the partition count, additional consumers sit idle with no partition to own. Scale the consumer count based on your current lag and throughput needs — you can always add or remove consumers and Kafka rebalances automatically.</p>

          <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748B;margin-bottom:10px">Scaling ladder for the fulfillment group (3 partitions)</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${[
              { c:1, throughput:'~20k events/sec', lag:'Growing — 1 worker can\'t keep up with Prime Day traffic', color:'#EF4444', status:'Falling behind' },
              { c:2, throughput:'~40k events/sec', lag:'C2 owns 2 partitions — slight bottleneck, but catching up', color:'#F59E0B', status:'Recovering' },
              { c:3, throughput:'~60k events/sec', lag:'Each consumer owns 1 partition — fully caught up', color:'#10B981', status:'✓ Ideal' },
              { c:4, throughput:'~60k events/sec', lag:'C4 sits idle — no partition to own. Zero benefit.', color:'#475569', status:'Wasteful' },
            ].map(r => `
              <div style="display:flex;align-items:center;gap:12px;background:#0A0E1A;border-radius:8px;padding:10px 14px">
                <div style="flex-shrink:0;width:80px;font-size:11px">
                  <span style="color:${r.color};font-weight:800">${r.c} consumer${r.c>1?'s':''}</span>
                </div>
                <div style="flex-shrink:0;width:120px;font-size:11px;color:#06B6D4">${r.throughput}</div>
                <div style="flex:1;font-size:11px;color:#94A3B8">${r.lag}</div>
                <div style="flex-shrink:0;font-size:10px;font-weight:700;color:${r.color};white-space:nowrap">${r.status}</div>
              </div>`).join('')}
          </div>
        </div>

        <div style="background:#111827;border:1px solid #1E293B;border-radius:12px;padding:16px 20px">
          <div style="font-size:12px;font-weight:700;color:#F1F5F9;margin-bottom:10px">What happens when a consumer joins or leaves? — Rebalancing</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;font-size:11px">
            <div style="background:#0A0E1A;border-radius:8px;padding:12px">
              <div style="color:#F59E0B;font-weight:700;margin-bottom:6px">Consumer joins</div>
              <div style="color:#94A3B8;line-height:1.7">Kafka triggers a rebalance. All consumers briefly pause. Partitions are reassigned evenly. Consumers resume from their last committed offset — no events are skipped or double-processed.</div>
            </div>
            <div style="background:#0A0E1A;border-radius:8px;padding:12px">
              <div style="color:#EF4444;font-weight:700;margin-bottom:6px">Consumer crashes</div>
              <div style="color:#94A3B8;line-height:1.7">Kafka detects the crash via heartbeat timeout (~10s). Rebalance redistributes its partitions to the remaining consumers. No data is lost — the crashed consumer's offset is safely stored in Kafka.</div>
            </div>
            <div style="background:#0A0E1A;border-radius:8px;padding:12px">
              <div style="color:#10B981;font-weight:700;margin-bottom:6px">Consumer scales back</div>
              <div style="color:#94A3B8;line-height:1.7">When the consumer leaves cleanly, rebalance redistributes its partitions. Other consumers pick up the work. Prime Day is over → scale down from 3 to 1 Fulfillment consumer and Kafka handles the rest.</div>
            </div>
          </div>
        </div>
      </div>

    </div>`;
}
