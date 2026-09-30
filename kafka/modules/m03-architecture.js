import { createModuleShell, createIQSection } from '../components/module-shell.js';

const IQ = [
  {
    q: 'How does KRaft replace ZooKeeper in Kafka?',
    a: 'KRaft uses a Raft-based consensus protocol built into Kafka itself. A small quorum of controller brokers (typically 3) maintain the cluster metadata log — topic/partition state, ISR lists, broker registrations. The active controller is the Raft leader. On controller failure, Raft elects a new leader in under 1 second. No ZooKeeper process, no separate cluster to operate. Metadata is stored as Kafka records in the __cluster_metadata topic, enabling snapshots and fast recovery.',
    tip: 'KRaft removes the 200k partition limit (ZK bottleneck) and achieves sub-second failover. Know that controllers can be combined with brokers (combined mode) or separate (dedicated mode).'
  },
  {
    q: 'What is an ISR and why does it matter for durability?',
    a: 'ISR (In-Sync Replicas) is the set of follower replicas that are caught up with the leader within replica.lag.time.max.ms (default 30s). When acks=all, the producer only receives acknowledgement after all ISR members have written the record. Think of it this way: at Amazon, when a customer places an order for $999 during Prime Day, acks=all ensures the order is written to at least 2 brokers before the Order Service says "Order Confirmed!" — if Broker 1 dies milliseconds later, Broker 2 already has every byte of that order record. If a follower falls behind due to a slow disk or GC pause, it is evicted from the ISR until it catches up.',
    tip: 'Say: ISR is the dynamic set of replicas eligible to become leader — it is the safety fence between "committed" and "durable".'
  },
  {
    q: 'Walk me through what happens when a Kafka broker dies.',
    a: 'The controller detects the dead broker via Raft heartbeat timeout (KRaft) or ZooKeeper session expiry. For each partition where the dead broker was leader, the controller picks the first replica in the ISR list as the new leader and broadcasts updated metadata. Clients reconnect and resume. Real Amazon scenario: Broker 1 is the leader for orders-P0. It crashes mid-Prime Day. The controller elects Broker 2 as leader for P0 in ~1 second. The Fulfillment Service consumer group briefly pauses, fetches new metadata, and resumes reading from exactly where it left off — no orders are lost, no offsets are reset, no engineer is paged.',
    tip: 'Know the difference between clean shutdown (preferred leader election, very fast) vs hard kill (ISR-based election, slightly slower). unclean.leader.election.enable=false prevents data loss at the cost of availability.'
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M03 · Foundation',
    title: 'Kafka Architecture',
    subtitle: 'Brokers, topics, partitions, replication — explained through a real Amazon order',
    tabs: [
      { id: 'diagram',  label: '🏗️ Cluster Diagram' },
      { id: 'amazon',   label: '📦 Amazon Order Flow' },
      { id: 'kraft',    label: '🔑 KRaft vs ZooKeeper' },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ]
  });

  buildDiagram(container);
  buildAmazon(container);
  buildKraft(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return null;
}

function buildDiagram(container) {
  const tab = container.querySelector('#tab-diagram');
  tab.innerHTML = `
    <div class="svg-wrap">
      <svg viewBox="0 0 860 480" width="860" height="480" style="font-family:system-ui">
        <defs>
          <marker id="a3" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#475569"/>
          </marker>
          <marker id="a3r" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#FF6900"/>
          </marker>
        </defs>

        <!-- Producers -->
        <rect x="10" y="60" width="120" height="56" rx="8" fill="#1E293B" stroke="#FF6900" stroke-width="1.5"/>
        <text x="70" y="80" text-anchor="middle" fill="#FF6900" font-size="11" font-weight="700">Producer</text>
        <text x="70" y="95" text-anchor="middle" fill="#94A3B8" font-size="9">Order Service</text>
        <text x="70" y="108" text-anchor="middle" fill="#64748B" font-size="8">publishes on Buy Now</text>

        <rect x="10" y="135" width="120" height="56" rx="8" fill="#1E293B" stroke="#FF6900" stroke-width="1.5"/>
        <text x="70" y="155" text-anchor="middle" fill="#FF6900" font-size="11" font-weight="700">Producer</text>
        <text x="70" y="170" text-anchor="middle" fill="#94A3B8" font-size="9">Payment Service</text>
        <text x="70" y="183" text-anchor="middle" fill="#64748B" font-size="8">publishes on charge</text>

        <!-- Arrows to cluster -->
        <line x1="130" y1="88"  x2="205" y2="130" stroke="#FF6900" stroke-width="1.5" marker-end="url(#a3r)"/>
        <line x1="130" y1="163" x2="205" y2="200" stroke="#FF6900" stroke-width="1.5" marker-end="url(#a3r)"/>

        <!-- Cluster box -->
        <rect x="200" y="60" width="400" height="350" rx="12" fill="#0F172A" stroke="#334155" stroke-width="2"/>
        <text x="400" y="85" text-anchor="middle" fill="#475569" font-size="11" font-weight="700" letter-spacing="1">KAFKA CLUSTER  (RF = 3)</text>

        <!-- Broker 1 (controller + leader) -->
        <rect x="220" y="100" width="110" height="140" rx="8" fill="#1E293B" stroke="#FF6900" stroke-width="2"/>
        <text x="275" y="120" text-anchor="middle" fill="#FF6900" font-size="10" font-weight="800">Broker 1</text>
        <rect x="228" y="127" width="94" height="14" rx="4" fill="#FF690022"/>
        <text x="275" y="138" text-anchor="middle" fill="#FF6900" font-size="9">★ Controller</text>
        <text x="275" y="158" text-anchor="middle" fill="#94A3B8" font-size="9">orders P0 (Leader)</text>
        <text x="275" y="173" text-anchor="middle" fill="#94A3B8" font-size="9">payments P0 (Leader)</text>
        <text x="275" y="188" text-anchor="middle" fill="#64748B" font-size="9">orders P1 (Follower)</text>
        <text x="275" y="215" text-anchor="middle" fill="#475569" font-size="8">L = leader  F = follower</text>
        <text x="275" y="230" text-anchor="middle" fill="#475569" font-size="8">elect new leader if dies</text>

        <!-- Broker 2 -->
        <rect x="345" y="100" width="110" height="140" rx="8" fill="#1E293B" stroke="#334155" stroke-width="1.5"/>
        <text x="400" y="120" text-anchor="middle" fill="#E2E8F0" font-size="10" font-weight="800">Broker 2</text>
        <text x="400" y="145" text-anchor="middle" fill="#94A3B8" font-size="9">orders P1 (Leader)</text>
        <text x="400" y="160" text-anchor="middle" fill="#64748B" font-size="9">orders P0 (Follower)</text>
        <text x="400" y="175" text-anchor="middle" fill="#64748B" font-size="9">payments P0 (Flwr)</text>
        <text x="400" y="220" text-anchor="middle" fill="#475569" font-size="8">safe copy of every record</text>

        <!-- Broker 3 -->
        <rect x="470" y="100" width="110" height="140" rx="8" fill="#1E293B" stroke="#334155" stroke-width="1.5"/>
        <text x="525" y="120" text-anchor="middle" fill="#E2E8F0" font-size="10" font-weight="800">Broker 3</text>
        <text x="525" y="145" text-anchor="middle" fill="#94A3B8" font-size="9">orders P2 (Leader)</text>
        <text x="525" y="160" text-anchor="middle" fill="#64748B" font-size="9">orders P1 (Follower)</text>
        <text x="525" y="220" text-anchor="middle" fill="#475569" font-size="8">safe copy of every record</text>

        <!-- Topics -->
        <rect x="220" y="265" width="360" height="55" rx="8" fill="#0A0E1A" stroke="#334155"/>
        <text x="255" y="286" fill="#FF6900" font-size="10" font-weight="700">Topic: orders</text>
        <text x="255" y="301" fill="#64748B" font-size="9">3 partitions · RF=3 · 7-day retention</text>
        <text x="255" y="313" fill="#475569" font-size="8">key = orderId → deterministic partition routing</text>

        <rect x="220" y="330" width="360" height="55" rx="8" fill="#0A0E1A" stroke="#334155"/>
        <text x="255" y="351" fill="#3B82F6" font-size="10" font-weight="700">Topic: payments</text>
        <text x="255" y="366" fill="#64748B" font-size="9">1 partition · RF=3 · 30-day retention</text>
        <text x="255" y="378" fill="#475569" font-size="8">key = orderId → joins with orders downstream</text>

        <!-- Arrows to consumers -->
        <line x1="600" y1="160" x2="680" y2="110" stroke="#475569" stroke-width="1.5" marker-end="url(#a3)"/>
        <line x1="600" y1="190" x2="680" y2="210" stroke="#475569" stroke-width="1.5" marker-end="url(#a3)"/>
        <line x1="600" y1="215" x2="680" y2="310" stroke="#475569" stroke-width="1.5" marker-end="url(#a3)"/>

        <!-- Consumer Groups -->
        <rect x="680" y="68" width="155" height="76" rx="8" fill="#1E293B" stroke="#10B981" stroke-width="1.5"/>
        <text x="757" y="88"  text-anchor="middle" fill="#10B981" font-size="10" font-weight="700">Consumer Group</text>
        <text x="757" y="103" text-anchor="middle" fill="#94A3B8" font-size="9">fulfillment</text>
        <text x="757" y="118" text-anchor="middle" fill="#64748B" font-size="9">3 consumers · 1 per partition</text>
        <text x="757" y="135" text-anchor="middle" fill="#475569" font-size="8">Packs &amp; ships your order</text>

        <rect x="680" y="170" width="155" height="76" rx="8" fill="#1E293B" stroke="#8B5CF6" stroke-width="1.5"/>
        <text x="757" y="190" text-anchor="middle" fill="#8B5CF6" font-size="10" font-weight="700">Consumer Group</text>
        <text x="757" y="205" text-anchor="middle" fill="#94A3B8" font-size="9">fraud-detection</text>
        <text x="757" y="220" text-anchor="middle" fill="#64748B" font-size="9">1 consumer · reads all partitions</text>
        <text x="757" y="237" text-anchor="middle" fill="#475569" font-size="8">Scores every order for fraud</text>

        <rect x="680" y="272" width="155" height="76" rx="8" fill="#1E293B" stroke="#F59E0B" stroke-width="1.5"/>
        <text x="757" y="292" text-anchor="middle" fill="#F59E0B" font-size="10" font-weight="700">Consumer Group</text>
        <text x="757" y="307" text-anchor="middle" fill="#94A3B8" font-size="9">notifications</text>
        <text x="757" y="322" text-anchor="middle" fill="#64748B" font-size="9">1 consumer · reads all partitions</text>
        <text x="757" y="339" text-anchor="middle" fill="#475569" font-size="8">Sends "Order Confirmed" email</text>

        <!-- Schema Registry -->
        <rect x="680" y="370" width="155" height="52" rx="8" fill="#1E293B" stroke="#06B6D4" stroke-width="1.5"/>
        <text x="757" y="392" text-anchor="middle" fill="#06B6D4" font-size="10" font-weight="700">Schema Registry</text>
        <text x="757" y="410" text-anchor="middle" fill="#94A3B8" font-size="9">Avro · Protobuf · JSON Schema</text>
        <line x1="680" y1="395" x2="603" y2="395" stroke="#06B6D4" stroke-width="1" stroke-dasharray="4,3"/>
      </svg>
    </div>
    <div class="scroll-content">
      <div class="prose">
        <h3>The moment you click "Buy Now" on Amazon</h3>
        <p>Your click hits the <strong>Order Service</strong>, which creates a single JSON event and publishes it to the <code>orders</code> Kafka topic — then immediately returns <em>"Order confirmed!"</em> to your browser. That's it. Order Service is done in ~2ms. It doesn't call Inventory, Fulfillment, Fraud Detection, or Notifications directly. It just writes one event.</p>
        <p>Behind the scenes, Kafka routes the event to <code>orders-P2</code> (deterministically hashed from the orderId), writes it on Broker 3 (the partition leader), and replicates it to Broker 1 and Broker 2. With <code>acks=all</code>, the Order Service gets confirmation only after all three copies are written — your order is durable before your browser even renders the confirmation page.</p>
        <p>Three independent consumer groups then read that same event at their own pace: <strong>Fulfillment</strong> packs and ships, <strong>Fraud Detection</strong> scores the transaction with ML, <strong>Notifications</strong> fires the email. All three run in parallel. None of them know about each other. If Fraud Detection crashes and restarts, it simply resumes from its last committed offset — the event is still in Kafka.</p>
        <p>Switch to the <strong>📦 Amazon Order Flow</strong> tab for the full step-by-step story.</p>
      </div>
    </div>`;
}

function buildAmazon(container) {
  const tab = container.querySelector('#tab-amazon');
  tab.innerHTML = `
    <div class="scroll-content" style="max-width:900px;margin:0 auto">

      <!-- Scenario header -->
      <div style="background:#111827;border:1px solid #1E293B;border-radius:16px;padding:24px 28px;margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#64748B;margin-bottom:8px">Real-World Scenario</div>
        <div style="font-size:20px;font-weight:800;color:#F1F5F9;margin-bottom:6px">You click "Buy Now" on an iPhone 15 Pro — $999</div>
        <div style="font-size:14px;color:#94A3B8;line-height:1.6">What happens inside Amazon's systems in the next 200 milliseconds? Everything you see below is powered by Kafka.</div>
      </div>

      <!-- Step 1 -->
      <div class="amazon-step" style="display:flex;gap:20px;margin-bottom:20px;align-items:flex-start">
        <div style="flex-shrink:0;width:44px;height:44px;border-radius:12px;background:#FF690022;border:1.5px solid #FF6900;display:flex;align-items:center;justify-content:center;font-size:20px">🛒</div>
        <div style="flex:1;background:#111827;border:1px solid #1E293B;border-radius:12px;padding:20px 22px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <span style="background:#FF6900;color:#000;font-size:10px;font-weight:800;padding:2px 8px;border-radius:20px">STEP 1</span>
            <span style="font-size:15px;font-weight:700;color:#F1F5F9">Order Service creates the event</span>
          </div>
          <p style="font-size:13px;color:#94A3B8;line-height:1.7;margin-bottom:12px">The moment you click Buy Now, the Order Service microservice creates one structured event. It does <em>not</em> call any other service. It publishes this single event to Kafka and returns "Order Confirmed" to your browser in ~2ms.</p>
          <div style="background:#0A0E1A;border:1px solid #334155;border-radius:8px;padding:14px 16px;font-family:monospace;font-size:12px;color:#94A3B8;line-height:1.8">
            <span style="color:#64748B">// Published to Kafka topic: <span style="color:#FF6900">orders</span></span><br>
            {<br>
            &nbsp;&nbsp;<span style="color:#06B6D4">"orderId"</span>: <span style="color:#10B981">"AMZ-24601-2024"</span>,<br>
            &nbsp;&nbsp;<span style="color:#06B6D4">"userId"</span>: <span style="color:#10B981">"U-88234"</span>,<br>
            &nbsp;&nbsp;<span style="color:#06B6D4">"product"</span>: <span style="color:#10B981">"iPhone 15 Pro 256GB"</span>,<br>
            &nbsp;&nbsp;<span style="color:#06B6D4">"price"</span>: <span style="color:#F59E0B">999.00</span>,<br>
            &nbsp;&nbsp;<span style="color:#06B6D4">"warehouse"</span>: <span style="color:#10B981">"SEA-3"</span>,<br>
            &nbsp;&nbsp;<span style="color:#06B6D4">"timestamp"</span>: <span style="color:#10B981">"2024-07-16T14:23:01Z"</span><br>
            }
          </div>
        </div>
      </div>

      <!-- Arrow -->
      <div style="text-align:center;color:#334155;font-size:20px;margin-bottom:20px">▼</div>

      <!-- Step 2 -->
      <div class="amazon-step" style="display:flex;gap:20px;margin-bottom:20px;align-items:flex-start">
        <div style="flex-shrink:0;width:44px;height:44px;border-radius:12px;background:#3B82F622;border:1.5px solid #3B82F6;display:flex;align-items:center;justify-content:center;font-size:20px">💾</div>
        <div style="flex:1;background:#111827;border:1px solid #1E293B;border-radius:12px;padding:20px 22px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <span style="background:#3B82F6;color:#fff;font-size:10px;font-weight:800;padding:2px 8px;border-radius:20px">STEP 2</span>
            <span style="font-size:15px;font-weight:700;color:#F1F5F9">Kafka stores it — durably, on 3 brokers</span>
          </div>
          <p style="font-size:13px;color:#94A3B8;line-height:1.7;margin-bottom:14px">Kafka hashes the <code style="background:#0A0E1A;padding:1px 5px;border-radius:4px;color:#06B6D4">orderId</code> to pick a partition — say, <strong>orders-P2</strong> on Broker 3. It writes the event there, then replicates it to Broker 1 and Broker 2. With <code style="background:#0A0E1A;padding:1px 5px;border-radius:4px;color:#06B6D4">acks=all</code>, Broker 3 only acknowledges the write after all 3 copies are confirmed.</p>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
            <div style="background:#0A0E1A;border:1.5px solid #FF6900;border-radius:8px;padding:12px;text-align:center">
              <div style="font-size:11px;font-weight:700;color:#FF6900;margin-bottom:4px">Broker 3</div>
              <div style="font-size:10px;color:#94A3B8">orders-P2</div>
              <div style="font-size:10px;color:#10B981;font-weight:700;margin-top:4px">★ LEADER</div>
              <div style="font-size:9px;color:#64748B;margin-top:2px">Receives write first</div>
            </div>
            <div style="background:#0A0E1A;border:1px solid #334155;border-radius:8px;padding:12px;text-align:center">
              <div style="font-size:11px;font-weight:700;color:#E2E8F0;margin-bottom:4px">Broker 1</div>
              <div style="font-size:10px;color:#94A3B8">orders-P2</div>
              <div style="font-size:10px;color:#64748B;font-weight:700;margin-top:4px">FOLLOWER</div>
              <div style="font-size:9px;color:#64748B;margin-top:2px">Replicates from leader</div>
            </div>
            <div style="background:#0A0E1A;border:1px solid #334155;border-radius:8px;padding:12px;text-align:center">
              <div style="font-size:11px;font-weight:700;color:#E2E8F0;margin-bottom:4px">Broker 2</div>
              <div style="font-size:10px;color:#94A3B8">orders-P2</div>
              <div style="font-size:10px;color:#64748B;font-weight:700;margin-top:4px">FOLLOWER</div>
              <div style="font-size:9px;color:#64748B;margin-top:2px">Replicates from leader</div>
            </div>
          </div>
          <div style="margin-top:12px;background:#10B98112;border:1px solid #10B98133;border-radius:8px;padding:10px 14px;font-size:12px;color:#10B981">
            ✓ Even if 2 of 3 brokers crash simultaneously, this order survives. That is RF=3 at work.
          </div>
        </div>
      </div>

      <!-- Arrow -->
      <div style="text-align:center;color:#334155;font-size:20px;margin-bottom:20px">▼</div>

      <!-- Step 3 -->
      <div class="amazon-step" style="display:flex;gap:20px;margin-bottom:20px;align-items:flex-start">
        <div style="flex-shrink:0;width:44px;height:44px;border-radius:12px;background:#10B98122;border:1.5px solid #10B981;display:flex;align-items:center;justify-content:center;font-size:20px">📡</div>
        <div style="flex:1;background:#111827;border:1px solid #1E293B;border-radius:12px;padding:20px 22px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <span style="background:#10B981;color:#000;font-size:10px;font-weight:800;padding:2px 8px;border-radius:20px">STEP 3</span>
            <span style="font-size:15px;font-weight:700;color:#F1F5F9">4 teams read the same event — independently, in parallel</span>
          </div>
          <p style="font-size:13px;color:#94A3B8;line-height:1.7;margin-bottom:16px">Order Service published <em>one</em> event. But four completely separate consumer groups each read their own copy, at their own pace, tracking their own offset. They don't know about each other — and none of them slow each other down.</p>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px">

            <!-- Inventory -->
            <div style="background:#0A0E1A;border:1px solid #06B6D433;border-radius:10px;padding:16px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                <span style="font-size:18px">📦</span>
                <div>
                  <div style="font-size:12px;font-weight:700;color:#06B6D4">Inventory Service</div>
                  <div style="font-size:10px;color:#64748B">group: inventory-check</div>
                </div>
              </div>
              <ul style="font-size:12px;color:#94A3B8;line-height:1.8;padding-left:16px;margin:0">
                <li>Reads the orderId from the event</li>
                <li>Checks Seattle warehouse (SEA-3) stock</li>
                <li>Reserves 1 iPhone 15 Pro for this order</li>
                <li>If out of stock → triggers backorder flow</li>
              </ul>
            </div>

            <!-- Fulfillment -->
            <div style="background:#0A0E1A;border:1px solid #10B98133;border-radius:10px;padding:16px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                <span style="font-size:18px">🚚</span>
                <div>
                  <div style="font-size:12px;font-weight:700;color:#10B981">Fulfillment Service</div>
                  <div style="font-size:10px;color:#64748B">group: fulfillment</div>
                </div>
              </div>
              <ul style="font-size:12px;color:#94A3B8;line-height:1.8;padding-left:16px;margin:0">
                <li>Creates a warehouse pick-list</li>
                <li>Assigns to an FBA warehouse worker</li>
                <li>Generates a shipping label (UPS/USPS)</li>
                <li>Schedules Prime 2-day delivery window</li>
              </ul>
            </div>

            <!-- Fraud Detection -->
            <div style="background:#0A0E1A;border:1px solid #8B5CF633;border-radius:10px;padding:16px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                <span style="font-size:18px">🛡️</span>
                <div>
                  <div style="font-size:12px;font-weight:700;color:#8B5CF6">Fraud Detection</div>
                  <div style="font-size:10px;color:#64748B">group: fraud-detection</div>
                </div>
              </div>
              <ul style="font-size:12px;color:#94A3B8;line-height:1.8;padding-left:16px;margin:0">
                <li>ML model scores the transaction</li>
                <li>Checks: unusual IP? High velocity? New card?</li>
                <li>If score &gt; 0.8 → flags order for manual review</li>
                <li>Publishes result to <code style="color:#8B5CF6">fraud-decisions</code> topic</li>
              </ul>
            </div>

            <!-- Notifications -->
            <div style="background:#0A0E1A;border:1px solid #F59E0B33;border-radius:10px;padding:16px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                <span style="font-size:18px">🔔</span>
                <div>
                  <div style="font-size:12px;font-weight:700;color:#F59E0B">Notification Service</div>
                  <div style="font-size:10px;color:#64748B">group: notifications</div>
                </div>
              </div>
              <ul style="font-size:12px;color:#94A3B8;line-height:1.8;padding-left:16px;margin:0">
                <li>Sends "Order Confirmed!" email</li>
                <li>Pushes notification to Amazon app</li>
                <li>Triggers SMS if enabled on account</li>
                <li>Schedules shipping update reminders</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Arrow -->
      <div style="text-align:center;color:#334155;font-size:20px;margin-bottom:20px">▼</div>

      <!-- Key Insight -->
      <div style="background:linear-gradient(135deg,#0F172A,#111827);border:1.5px solid #334155;border-radius:16px;padding:24px 28px;margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#64748B;margin-bottom:12px">💡 Why Kafka? The Core Insight</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
          <div>
            <div style="font-size:12px;font-weight:700;color:#EF4444;margin-bottom:8px">❌ Without Kafka</div>
            <ul style="font-size:12px;color:#94A3B8;line-height:1.8;padding-left:16px;margin:0">
              <li>Order Service calls Inventory API → waits</li>
              <li>Then calls Fulfillment API → waits</li>
              <li>Then calls Fraud API → waits</li>
              <li>Then calls Notifications API → waits</li>
              <li>If any service is down → order fails</li>
              <li>Total latency: 200–500ms of chained calls</li>
              <li>Adding a new service = changing Order Service code</li>
            </ul>
          </div>
          <div>
            <div style="font-size:12px;font-weight:700;color:#10B981;margin-bottom:8px">✓ With Kafka</div>
            <ul style="font-size:12px;color:#94A3B8;line-height:1.8;padding-left:16px;margin:0">
              <li>Order Service publishes 1 event → done in ~2ms</li>
              <li>All 4 services run in parallel</li>
              <li>If Fraud Detection crashes → it catches up when it restarts</li>
              <li>Order never fails because of a downstream service</li>
              <li>New service (e.g. AI Recommender) can subscribe without touching Order Service</li>
              <li>Events replay — replay 7 days of orders for a new service</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Offset story -->
      <div style="background:#111827;border:1px solid #1E293B;border-radius:12px;padding:20px 22px;margin-bottom:28px">
        <div style="font-size:13px;font-weight:700;color:#F1F5F9;margin-bottom:10px">📍 Each consumer group tracks its own offset</div>
        <p style="font-size:13px;color:#94A3B8;line-height:1.7;margin-bottom:12px">Your iPhone order is event #847,231 in the <code style="background:#0A0E1A;padding:1px 5px;border-radius:4px;color:#06B6D4">orders-P2</code> partition (offset 847231). Each consumer group stores its progress independently:</p>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;font-size:11px">
          <div style="background:#0A0E1A;border-radius:8px;padding:10px;text-align:center">
            <div style="color:#06B6D4;font-weight:700;margin-bottom:4px">inventory-check</div>
            <div style="color:#10B981;font-size:14px;font-weight:800">847,232</div>
            <div style="color:#64748B;margin-top:2px">1 ahead — fast</div>
          </div>
          <div style="background:#0A0E1A;border-radius:8px;padding:10px;text-align:center">
            <div style="color:#10B981;font-weight:700;margin-bottom:4px">fulfillment</div>
            <div style="color:#10B981;font-size:14px;font-weight:800">847,231</div>
            <div style="color:#64748B;margin-top:2px">processing now</div>
          </div>
          <div style="background:#0A0E1A;border-radius:8px;padding:10px;text-align:center">
            <div style="color:#8B5CF6;font-weight:700;margin-bottom:4px">fraud-detection</div>
            <div style="color:#F59E0B;font-size:14px;font-weight:800">847,198</div>
            <div style="color:#F59E0B;margin-top:2px">33 behind — lagging</div>
          </div>
          <div style="background:#0A0E1A;border-radius:8px;padding:10px;text-align:center">
            <div style="color:#F59E0B;font-weight:700;margin-bottom:4px">notifications</div>
            <div style="color:#10B981;font-size:14px;font-weight:800">847,231</div>
            <div style="color:#64748B;margin-top:2px">on time</div>
          </div>
        </div>
        <p style="font-size:12px;color:#64748B;margin-top:12px;line-height:1.6">Fraud detection is 33 events behind — maybe it had a GC pause. That's fine. Kafka doesn't care. Fraud detection will catch up. And if Kafka deletes old events after 7 days, fraud detection still has 7 days to process everything. The other consumer groups are completely unaffected.</p>
      </div>

    </div>`;
}

function buildKraft(container) {
  const tab = container.querySelector('#tab-kraft');
  const rows = [
    ['Metadata store', 'External ZooKeeper (3–5 nodes)', 'Built-in Raft quorum (3 controllers)'],
    ['Controller failover', '30–60 seconds', '<1 second'],
    ['Max partitions', '~200,000 (ZK limit)', 'Millions (tested 3.3M)'],
    ['Operational cost', 'Run ZK cluster separately', 'Kafka manages itself'],
    ['Startup time', 'Load all ZK state at boot', 'Snapshot + delta log replay'],
    ['Metadata consistency', 'ZK watches, eventual', 'Strong (Raft log)'],
    ['GA since', '—', 'Kafka 3.3 (Oct 2022)'],
    ['ZK deprecated', '—', 'Kafka 3.5 (soft), 4.0 (removed)'],
  ];
  tab.innerHTML = `
    <div class="scroll-content" style="max-width:860px;margin:0 auto">
      <div style="background:#111827;border:1px solid #1E293B;border-radius:12px;padding:20px 22px;margin-bottom:24px">
        <div style="font-size:13px;font-weight:700;color:#F1F5F9;margin-bottom:8px">🏭 Amazon-scale context</div>
        <p style="font-size:13px;color:#94A3B8;line-height:1.7;margin:0">Amazon's Kafka clusters handle millions of partitions across thousands of topics (orders, payments, inventory-updates, click-events, etc.). Under ZooKeeper, hitting the ~200k partition limit was a real scaling wall. KRaft removes that ceiling and cuts controller failover from a 30–60 second operational nightmare — during which no new partitions can be created — to under 1 second. During Prime Day, when a controller broker dies, KRaft means your "Buy Now" flow keeps working within a second instead of going dark for a minute.</p>
      </div>
      <div class="compare-table-wrap">
        <div class="section-header">
          <div class="section-title">KRaft vs ZooKeeper</div>
          <div class="section-desc">Why Kafka replaced its external coordinator</div>
        </div>
        <table class="compare-table">
          <thead><tr><th>Dimension</th><th>ZooKeeper Mode</th><th>KRaft Mode</th></tr></thead>
          <tbody>${rows.map(([d,z,k]) => `<tr><td style="font-weight:600;color:var(--text)">${d}</td><td>${z}</td><td style="color:var(--green)">${k}</td></tr>`).join('')}</tbody>
        </table>
      </div>
    </div>`;
}
