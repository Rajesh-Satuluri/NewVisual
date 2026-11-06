import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { ARCH_NODES } from '../data/arch-nodes.js';

export const IQ = [
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
    <div class="arch-controls">
      <button id="arch-play" class="arch-btn arch-btn-play" type="button">▶ Play event flow</button>
      <div class="arch-seg" role="group" aria-label="Producer acks setting">
        <span class="arch-seg-label">acks</span>
        <button class="arch-seg-btn" data-acks="1" type="button">=1</button>
        <button class="arch-seg-btn is-active" data-acks="all" type="button">=all</button>
      </div>
      <button id="arch-kill" class="arch-btn arch-btn-kill" type="button">💥 Kill Broker 1</button>
      <button id="arch-reset" class="arch-btn arch-btn-ghost" type="button">↺ Reset</button>
    </div>
    <div id="arch-status" class="arch-status">Press <b>▶ Play event flow</b> to send a live order event through the cluster — or <b>💥 Kill Broker 1</b> to watch it self-heal.</div>
    <div class="arch-layout">
    <div class="svg-wrap">
      <svg viewBox="0 0 860 480" width="860" height="480" style="font-family:system-ui">
        <defs>
          <marker id="a3" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#8A98AE"/>
          </marker>
          <marker id="a3r" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#FF6900"/>
          </marker>
          <linearGradient id="clusterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#101A30"/>
            <stop offset="1" stop-color="#0A0F1E"/>
          </linearGradient>
          <filter id="archGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.4" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        <!-- Producers -->
        <rect x="10" y="60" width="120" height="56" rx="8" fill="#1E293B" stroke="#FF6900" stroke-width="1.5"/>
        <text x="70" y="80" text-anchor="middle" fill="#FF6900" font-size="11" font-weight="700">Producer</text>
        <text x="70" y="95" text-anchor="middle" fill="#94A3B8" font-size="9">Order Service</text>
        <text x="70" y="108" text-anchor="middle" fill="#94A3B8" font-size="8">publishes on Buy Now</text>

        <rect x="10" y="135" width="120" height="56" rx="8" fill="#1E293B" stroke="#FF6900" stroke-width="1.5"/>
        <text x="70" y="155" text-anchor="middle" fill="#FF6900" font-size="11" font-weight="700">Producer</text>
        <text x="70" y="170" text-anchor="middle" fill="#94A3B8" font-size="9">Payment Service</text>
        <text x="70" y="183" text-anchor="middle" fill="#94A3B8" font-size="8">publishes on charge</text>

        <!-- Arrows to cluster -->
        <line x1="130" y1="88"  x2="205" y2="130" stroke="#FF6900" stroke-width="1.5" marker-end="url(#a3r)"/>
        <line x1="130" y1="163" x2="205" y2="200" stroke="#FF6900" stroke-width="1.5" marker-end="url(#a3r)"/>

        <!-- Cluster box -->
        <rect x="200" y="60" width="400" height="350" rx="12" fill="url(#clusterGrad)" stroke="#334155" stroke-width="2"/>
        <text x="400" y="85" text-anchor="middle" fill="#8A98AE" font-size="11" font-weight="700" letter-spacing="1">KAFKA CLUSTER  (RF = 3)</text>

        <!-- Broker 1 (controller + leader) -->
        <rect id="b1-rect" x="220" y="100" width="110" height="140" rx="8" fill="#1E293B" stroke="#FF6900" stroke-width="2"/>
        <text x="275" y="120" text-anchor="middle" fill="#FF6900" font-size="10" font-weight="800">Broker 1</text>
        <rect x="228" y="127" width="94" height="14" rx="4" fill="#FF690022"/>
        <text x="275" y="138" text-anchor="middle" fill="#FF6900" font-size="9">★ Controller</text>
        <text x="275" y="158" text-anchor="middle" fill="#94A3B8" font-size="9">orders P0 (Leader)</text>
        <text x="275" y="173" text-anchor="middle" fill="#94A3B8" font-size="9">payments P0 (Leader)</text>
        <text x="275" y="188" text-anchor="middle" fill="#94A3B8" font-size="9">orders P1 (Follower)</text>
        <text x="275" y="215" text-anchor="middle" fill="#8A98AE" font-size="8">L = leader  F = follower</text>
        <text x="275" y="230" text-anchor="middle" fill="#8A98AE" font-size="8">elect new leader if dies</text>

        <!-- Broker 2 -->
        <rect x="345" y="100" width="110" height="140" rx="8" fill="#1E293B" stroke="#334155" stroke-width="1.5"/>
        <text x="400" y="120" text-anchor="middle" fill="#E2E8F0" font-size="10" font-weight="800">Broker 2</text>
        <text x="400" y="145" text-anchor="middle" fill="#94A3B8" font-size="9">orders P1 (Leader)</text>
        <text x="400" y="160" text-anchor="middle" fill="#94A3B8" font-size="9">orders P0 (Follower)</text>
        <text x="400" y="175" text-anchor="middle" fill="#94A3B8" font-size="9">payments P0 (Flwr)</text>
        <text x="400" y="220" text-anchor="middle" fill="#8A98AE" font-size="8">safe copy of every record</text>

        <!-- Broker 3 -->
        <rect x="470" y="100" width="110" height="140" rx="8" fill="#1E293B" stroke="#334155" stroke-width="1.5"/>
        <text x="525" y="120" text-anchor="middle" fill="#E2E8F0" font-size="10" font-weight="800">Broker 3</text>
        <text x="525" y="145" text-anchor="middle" fill="#94A3B8" font-size="9">orders P2 (Leader)</text>
        <text x="525" y="160" text-anchor="middle" fill="#94A3B8" font-size="9">orders P1 (Follower)</text>
        <text x="525" y="220" text-anchor="middle" fill="#8A98AE" font-size="8">safe copy of every record</text>

        <!-- Topics -->
        <rect x="220" y="265" width="360" height="55" rx="8" fill="#0A0E1A" stroke="#334155"/>
        <text x="255" y="286" fill="#FF6900" font-size="10" font-weight="700">Topic: orders</text>
        <text x="255" y="301" fill="#94A3B8" font-size="9">3 partitions · RF=3 · 7-day retention</text>
        <text x="255" y="313" fill="#8A98AE" font-size="8">key = orderId → deterministic partition routing</text>

        <rect x="220" y="330" width="360" height="55" rx="8" fill="#0A0E1A" stroke="#334155"/>
        <text x="255" y="351" fill="#3B82F6" font-size="10" font-weight="700">Topic: payments</text>
        <text x="255" y="366" fill="#94A3B8" font-size="9">1 partition · RF=3 · 30-day retention</text>
        <text x="255" y="378" fill="#8A98AE" font-size="8">key = orderId → joins with orders downstream</text>

        <!-- Arrows to consumers -->
        <line x1="600" y1="160" x2="680" y2="110" stroke="#8A98AE" stroke-width="1.5" marker-end="url(#a3)"/>
        <line x1="600" y1="190" x2="680" y2="210" stroke="#8A98AE" stroke-width="1.5" marker-end="url(#a3)"/>
        <line x1="600" y1="215" x2="680" y2="310" stroke="#8A98AE" stroke-width="1.5" marker-end="url(#a3)"/>

        <!-- Consumer Groups -->
        <rect x="680" y="68" width="155" height="76" rx="8" fill="#1E293B" stroke="#10B981" stroke-width="1.5"/>
        <text x="757" y="88"  text-anchor="middle" fill="#10B981" font-size="10" font-weight="700">Consumer Group</text>
        <text x="757" y="103" text-anchor="middle" fill="#94A3B8" font-size="9">fulfillment</text>
        <text x="757" y="118" text-anchor="middle" fill="#94A3B8" font-size="9">3 consumers · 1 per partition</text>
        <text x="757" y="135" text-anchor="middle" fill="#8A98AE" font-size="8">Packs &amp; ships your order</text>

        <rect x="680" y="170" width="155" height="76" rx="8" fill="#1E293B" stroke="#8B5CF6" stroke-width="1.5"/>
        <text x="757" y="190" text-anchor="middle" fill="#8B5CF6" font-size="10" font-weight="700">Consumer Group</text>
        <text x="757" y="205" text-anchor="middle" fill="#94A3B8" font-size="9">fraud-detection</text>
        <text x="757" y="220" text-anchor="middle" fill="#94A3B8" font-size="9">1 consumer · reads all partitions</text>
        <text x="757" y="237" text-anchor="middle" fill="#8A98AE" font-size="8">Scores every order for fraud</text>

        <rect x="680" y="272" width="155" height="76" rx="8" fill="#1E293B" stroke="#F59E0B" stroke-width="1.5"/>
        <text x="757" y="292" text-anchor="middle" fill="#F59E0B" font-size="10" font-weight="700">Consumer Group</text>
        <text x="757" y="307" text-anchor="middle" fill="#94A3B8" font-size="9">notifications</text>
        <text x="757" y="322" text-anchor="middle" fill="#94A3B8" font-size="9">1 consumer · reads all partitions</text>
        <text x="757" y="339" text-anchor="middle" fill="#8A98AE" font-size="8">Sends "Order Confirmed" email</text>

        <!-- Schema Registry -->
        <rect x="680" y="370" width="155" height="52" rx="8" fill="#1E293B" stroke="#06B6D4" stroke-width="1.5"/>
        <text x="757" y="392" text-anchor="middle" fill="#06B6D4" font-size="10" font-weight="700">Schema Registry</text>
        <text x="757" y="410" text-anchor="middle" fill="#94A3B8" font-size="9">Avro · Protobuf · JSON Schema</text>
        <line x1="680" y1="395" x2="603" y2="395" stroke="#06B6D4" stroke-width="1" stroke-dasharray="4,3"/>

        <!-- Fault-injection overlay (red X, controller migration) — populated by JS -->
        <g id="arch-fault"></g>
        <!-- Live animation layer (event packets, replication, acks) — populated by JS -->
        <g id="arch-anim"></g>

        <!-- Clickable hit-layer (transparent). Draws a selection ring on the chosen component. -->
        <g id="arch-hits">
          ${Object.entries(ARCH_NODES).map(([id, n]) => {
            const [x, y, w, h] = n.box;
            return `<rect class="arch-hit" data-node="${id}" x="${x}" y="${y}" width="${w}" height="${h}" rx="8"
                      tabindex="0" role="button" aria-label="${n.title.replace(/"/g, '&quot;')}"></rect>`;
          }).join('')}
        </g>
      </svg>
    </div>
    <aside class="arch-detail" id="arch-detail">
      <div class="arch-detail-hint">
        <div class="arch-detail-hint-icon">👆</div>
        <p>Click any component in the diagram to see what it is, its role in the order flow, and where to learn more.</p>
      </div>
    </aside>
    </div>
    <div class="arch-legend">
      <span class="arch-legend-item"><i class="arch-dot" style="background:#FF6900"></i>Live event / write</span>
      <span class="arch-legend-item"><i class="arch-dot" style="background:#FFB066"></i>Replication copy</span>
      <span class="arch-legend-item"><i class="arch-dot" style="background:#10B981"></i>Ack (committed)</span>
      <span class="arch-legend-item"><i class="arch-dot" style="background:#3B82F6"></i>Consumer read</span>
      <span class="arch-legend-item"><i class="arch-swatch arch-swatch-leader"></i>Leader broker</span>
      <span class="arch-legend-item"><i class="arch-swatch arch-swatch-follower"></i>Follower</span>
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

  initArchDiagram(tab);
}

// Wire the clickable architecture: selecting a component highlights it and
// renders its explanation (from ARCH_NODES) into the detail panel. Also drives
// the live animation layer (event flow, acks, replication) and the
// fault-injection scenario (kill Broker 1 → controller re-election).
function initArchDiagram(tab) {
  const detail = tab.querySelector('#arch-detail');
  const hits = [...tab.querySelectorAll('.arch-hit')];
  if (!detail || !hits.length) return;

  // ---------- click-to-explain (unchanged behaviour) ----------
  function select(id) {
    const n = ARCH_NODES[id];
    if (!n) return;
    hits.forEach(h => h.classList.toggle('selected', h.dataset.node === id));
    detail.innerHTML = `
      <div class="arch-card">
        <div class="arch-card-title">${n.title}</div>
        <div class="arch-card-role">${n.role}</div>
        <div class="arch-card-detail">${n.detail}</div>
        ${n.keyPoints && n.keyPoints.length ? `
          <ul class="arch-card-points">${n.keyPoints.map(p => `<li>${p}</li>`).join('')}</ul>` : ''}
        ${n.link ? `<a class="arch-card-link" href="#${n.link}">${n.linkLabel || 'Learn more'} →</a>` : ''}
      </div>`;
    detail.scrollTop = 0;
  }
  hits.forEach(h => {
    h.addEventListener('click', () => select(h.dataset.node));
    h.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(h.dataset.node); }
    });
  });

  // ---------- interactive animation + fault injection ----------
  const NS = 'http://www.w3.org/2000/svg';
  const anim   = tab.querySelector('#arch-anim');
  const fault  = tab.querySelector('#arch-fault');
  const status = tab.querySelector('#arch-status');
  const b1Rect = tab.querySelector('#b1-rect');
  const playBtn  = tab.querySelector('#arch-play');
  const killBtn  = tab.querySelector('#arch-kill');
  const resetBtn = tab.querySelector('#arch-reset');
  const segBtns  = [...tab.querySelectorAll('.arch-seg-btn')];
  if (!anim || !playBtn) return; // defensive: older markup

  let token = 0;       // bumped on every new play/kill/reset to cancel in-flight frames
  let acks = 'all';    // 'all' | '1'
  let dead = false;    // Broker 1 killed?
  let running = false;

  // Waypoints in SVG user units (viewBox 0 0 860 480).
  const PRODUCE = [[130, 88], [205, 120], [480, 150], [525, 165]];
  const REP_B1  = [[512, 178], [320, 200]];
  const REP_B2  = [[512, 178], [432, 195]];
  const ACK     = [[520, 158], [205, 100], [130, 80]];
  const C_FUL   = [[600, 150], [758, 106]];
  const C_FRA   = [[600, 178], [758, 208]];
  const C_NOT   = [[600, 205], [758, 310]];

  const lerp = (a, b, k) => a + (b - a) * k;
  function polyAt(pts, k) {
    const L = []; let tot = 0;
    for (let i = 1; i < pts.length; i++) {
      const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      L.push(d); tot += d;
    }
    let d = k * tot, i = 0;
    while (i < L.length && d > L[i]) { d -= L[i]; i++; }
    if (i >= L.length) return pts[pts.length - 1];
    const r = L[i] ? d / L[i] : 0;
    return [lerp(pts[i][0], pts[i + 1][0], r), lerp(pts[i][1], pts[i + 1][1], r)];
  }
  function tween(dur, fn, tok) {
    return new Promise(res => {
      let s = null;
      function frame(t) {
        if (tok !== token) return res();
        if (s === null) s = t;
        const k = Math.min(1, (t - s) / dur);
        fn(k);
        if (k < 1 && tok === token) requestAnimationFrame(frame); else res();
      }
      requestAnimationFrame(frame);
    });
  }
  function el(name, attrs) {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function packet(color, label) {
    const g = el('g', {});
    g.appendChild(el('circle', { r: 10, fill: color, filter: 'url(#archGlow)' }));
    if (label) {
      const t = el('text', { 'text-anchor': 'middle', dy: 3, 'font-size': 8, 'font-weight': 700, fill: '#0A0E1A' });
      t.textContent = label; g.appendChild(t);
    }
    anim.appendChild(g);
    return g;
  }
  const place = (g, x, y) => g.setAttribute('transform', `translate(${x},${y})`);
  async function fly(color, label, path, dur, tok) {
    const g = packet(color, label);
    place(g, path[0][0], path[0][1]);
    await tween(dur, k => { const [x, y] = polyAt(path, k); place(g, x, y); }, tok);
    return g;
  }
  function fade(g) {
    if (!g) return;
    g.style.transition = 'opacity .4s'; g.style.opacity = '0';
    setTimeout(() => g.remove(), 420);
  }
  const clearAnim = () => { anim.innerHTML = ''; };
  const say = html => { if (status) status.innerHTML = html; };

  async function replicate(tok) {
    const targets = dead ? [REP_B2] : [REP_B1, REP_B2];
    const lines = targets.map(p => {
      const l = el('path', {
        d: `M${p[0][0]},${p[0][1]} L${p[p.length - 1][0]},${p[p.length - 1][1]}`,
        stroke: '#FFB066', 'stroke-width': 2, fill: 'none', 'stroke-dasharray': '5,4', opacity: 0.75,
      });
      anim.appendChild(l); return l;
    });
    const gs = await Promise.all(targets.map(p => fly('#FFB066', '', p, 650, tok)));
    gs.forEach(fade); lines.forEach(fade);
  }
  async function ackAnim(tok) { fade(await fly('#10B981', '✓', ACK, 700, tok)); }

  async function play() {
    if (running) return;
    token++; const tok = token; running = true;
    clearAnim(); playBtn.disabled = true;
    say(`<b>1 · Produce</b> — the Order Service appends the event to the <b>leader</b> of <code>orders-P2</code> (Broker 3).`);
    const p = await fly('#FF6900', 'ev', PRODUCE, 900, tok);
    if (tok !== token) { running = false; return; }
    if (acks === '1') {
      say(`<b>2 · Ack (acks=1)</b> — the leader has the record, so the producer is acknowledged <i>immediately</i> — fast, but only one copy exists yet.`);
      await ackAnim(tok);
      if (tok !== token) { running = false; return; }
      say(`<b>3 · Replicate</b> — Broker${dead ? ' 2 copies' : 's 1 &amp; 2 copy'} the record <i>after</i> the ack. A leader crash now could lose it.`);
      await replicate(tok);
    } else {
      say(`<b>2 · Replicate (acks=all)</b> — Broker${dead ? ' 2 copies' : 's 1 &amp; 2 copy'} the record; it is <b>committed</b> only once every in-sync replica has it.`);
      await replicate(tok);
      if (tok !== token) { running = false; return; }
      say(`<b>3 · Ack (acks=all)</b> — all in-sync replicas hold the record → durable → the producer gets "Order confirmed!".`);
      await ackAnim(tok);
    }
    if (tok !== token) { running = false; return; }
    fade(p);
    say(`<b>4 · Consume</b> — three independent consumer groups read the <i>same</i> event in parallel, each at its own offset.`);
    const cs = await Promise.all([
      fly('#3B82F6', '', C_FUL, 800, tok),
      fly('#8B5CF6', '', C_FRA, 850, tok),
      fly('#F59E0B', '', C_NOT, 900, tok),
    ]);
    cs.forEach(fade);
    if (tok !== token) { running = false; return; }
    say(`✅ <b>Delivered.</b> One write → durably replicated → fanned out to every consumer. Toggle <b>acks</b> or press <b>💥 Kill Broker 1</b> to see failover.`);
    playBtn.disabled = false; running = false;
  }

  function renderDown() {
    fault.innerHTML = '';
    const [x, y, w, h] = [220, 100, 110, 140];
    fault.appendChild(el('rect', { x, y, width: w, height: h, rx: 8, fill: 'rgba(10,14,26,.72)', stroke: '#EF4444', 'stroke-width': 2 }));
    fault.appendChild(el('line', { x1: x + 14, y1: y + 14, x2: x + w - 14, y2: y + h - 14, stroke: '#EF4444', 'stroke-width': 3 }));
    fault.appendChild(el('line', { x1: x + w - 14, y1: y + 14, x2: x + 14, y2: y + h - 14, stroke: '#EF4444', 'stroke-width': 3 }));
    const t = el('text', { x: 275, y: y + h - 16, 'text-anchor': 'middle', fill: '#EF4444', 'font-size': 11, 'font-weight': 800 });
    t.textContent = '✖ DOWN'; fault.appendChild(t);
    if (b1Rect) b1Rect.classList.add('arch-is-dead');
  }
  function renderHealed() {
    const pill = el('rect', { x: 356, y: 128, width: 88, height: 15, rx: 4, fill: '#10B98122' });
    fault.appendChild(pill);
    const ctl = el('text', { x: 400, y: 139, 'text-anchor': 'middle', fill: '#10B981', 'font-size': 9, 'font-weight': 700 });
    ctl.textContent = '★ Controller'; fault.appendChild(ctl);
    const note = el('text', { x: 400, y: 254, 'text-anchor': 'middle', fill: '#10B981', 'font-size': 8, 'font-weight': 700 });
    note.textContent = 'orders-P0 leader → Broker 2'; fault.appendChild(note);
  }
  function kill() {
    token++; dead = true; running = false;
    clearAnim(); renderDown();
    killBtn.disabled = true; playBtn.disabled = false;
    say(`💥 <b>Broker 1 is down.</b> It was the <b>controller</b> and the leader of <code>orders-P0</code>. Both roles must move — but every follower already holds a copy.`);
    setTimeout(() => {
      if (!dead) return;
      renderHealed();
      say(`♻️ <b>Re-election (~1s).</b> Broker 2 becomes the controller and takes over <code>orders-P0</code> leadership from its in-sync copy. <b>No data lost.</b> Press <b>▶ Play</b> to produce on the healed cluster, or <b>↺ Reset</b>.`);
    }, 1100);
  }
  function reset() {
    token++; dead = false; running = false;
    clearAnim(); fault.innerHTML = '';
    if (b1Rect) b1Rect.classList.remove('arch-is-dead');
    killBtn.disabled = false; playBtn.disabled = false;
    say(`Cluster reset. Press <b>▶ Play event flow</b>, toggle <b>acks</b>, or <b>💥 Kill Broker 1</b>.`);
  }

  playBtn.addEventListener('click', play);
  killBtn.addEventListener('click', kill);
  resetBtn.addEventListener('click', reset);
  segBtns.forEach(b => b.addEventListener('click', () => {
    acks = b.dataset.acks;
    segBtns.forEach(x => x.classList.toggle('is-active', x === b));
  }));
}

function buildAmazon(container) {
  const tab = container.querySelector('#tab-amazon');
  tab.innerHTML = `
    <div class="scroll-content" style="max-width:900px;margin:0 auto">

      <!-- Scenario header -->
      <div style="background:#111827;border:1px solid #1E293B;border-radius:16px;padding:24px 28px;margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94A3B8;margin-bottom:8px">Real-World Scenario</div>
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
            <span style="color:#94A3B8">// Published to Kafka topic: <span style="color:#FF6900">orders</span></span><br>
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
              <div style="font-size:9px;color:#94A3B8;margin-top:2px">Receives write first</div>
            </div>
            <div style="background:#0A0E1A;border:1px solid #334155;border-radius:8px;padding:12px;text-align:center">
              <div style="font-size:11px;font-weight:700;color:#E2E8F0;margin-bottom:4px">Broker 1</div>
              <div style="font-size:10px;color:#94A3B8">orders-P2</div>
              <div style="font-size:10px;color:#94A3B8;font-weight:700;margin-top:4px">FOLLOWER</div>
              <div style="font-size:9px;color:#94A3B8;margin-top:2px">Replicates from leader</div>
            </div>
            <div style="background:#0A0E1A;border:1px solid #334155;border-radius:8px;padding:12px;text-align:center">
              <div style="font-size:11px;font-weight:700;color:#E2E8F0;margin-bottom:4px">Broker 2</div>
              <div style="font-size:10px;color:#94A3B8">orders-P2</div>
              <div style="font-size:10px;color:#94A3B8;font-weight:700;margin-top:4px">FOLLOWER</div>
              <div style="font-size:9px;color:#94A3B8;margin-top:2px">Replicates from leader</div>
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
                  <div style="font-size:10px;color:#94A3B8">group: inventory-check</div>
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
                  <div style="font-size:10px;color:#94A3B8">group: fulfillment</div>
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
                  <div style="font-size:10px;color:#94A3B8">group: fraud-detection</div>
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
                  <div style="font-size:10px;color:#94A3B8">group: notifications</div>
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
        <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94A3B8;margin-bottom:12px">💡 Why Kafka? The Core Insight</div>
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
            <div style="color:#94A3B8;margin-top:2px">1 ahead — fast</div>
          </div>
          <div style="background:#0A0E1A;border-radius:8px;padding:10px;text-align:center">
            <div style="color:#10B981;font-weight:700;margin-bottom:4px">fulfillment</div>
            <div style="color:#10B981;font-size:14px;font-weight:800">847,231</div>
            <div style="color:#94A3B8;margin-top:2px">processing now</div>
          </div>
          <div style="background:#0A0E1A;border-radius:8px;padding:10px;text-align:center">
            <div style="color:#8B5CF6;font-weight:700;margin-bottom:4px">fraud-detection</div>
            <div style="color:#F59E0B;font-size:14px;font-weight:800">847,198</div>
            <div style="color:#F59E0B;margin-top:2px">33 behind — lagging</div>
          </div>
          <div style="background:#0A0E1A;border-radius:8px;padding:10px;text-align:center">
            <div style="color:#F59E0B;font-weight:700;margin-bottom:4px">notifications</div>
            <div style="color:#10B981;font-size:14px;font-weight:800">847,231</div>
            <div style="color:#94A3B8;margin-top:2px">on time</div>
          </div>
        </div>
        <p style="font-size:12px;color:#94A3B8;margin-top:12px;line-height:1.6">Fraud detection is 33 events behind — maybe it had a GC pause. That's fine. Kafka doesn't care. Fraud detection will catch up. And if Kafka deletes old events after 7 days, fraud detection still has 7 days to process everything. The other consumer groups are completely unaffected.</p>
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
      <div style="margin-bottom:24px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94A3B8;margin-bottom:12px">Controller failover — the number that matters at Prime Day</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div style="display:flex;align-items:center;gap:14px">
            <div style="width:140px;flex-shrink:0;font-size:12px;font-weight:600;color:#94A3B8;text-align:right">ZooKeeper mode</div>
            <div style="flex:1;background:#1E293B;border-radius:7px;height:30px;position:relative;overflow:hidden">
              <div style="position:absolute;inset:0 auto 0 0;width:100%;background:linear-gradient(90deg,#EF4444cc,#EF4444);border-radius:7px"></div>
              <div style="position:absolute;inset:0;display:flex;align-items:center;padding-left:12px;font-size:11px;font-weight:800;color:#fff;font-family:monospace">30–60 s  (no new partitions, "Buy Now" can stall)</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:14px">
            <div style="width:140px;flex-shrink:0;font-size:12px;font-weight:600;color:#94A3B8;text-align:right">KRaft mode</div>
            <div style="flex:1;background:#1E293B;border-radius:7px;height:30px;position:relative;overflow:hidden">
              <div style="position:absolute;inset:0 auto 0 0;width:3%;min-width:40px;background:linear-gradient(90deg,#10B981cc,#10B981);border-radius:7px"></div>
              <div style="position:absolute;inset:0;display:flex;align-items:center;padding-left:52px;font-size:11px;font-weight:800;color:#10B981;font-family:monospace">&lt;1 s</div>
            </div>
          </div>
        </div>
        <div style="margin-top:10px;font-size:12px;color:#94A3B8;line-height:1.7">Bar width is drawn to scale: KRaft's sub-second failover is a thin sliver next to ZooKeeper's 30–60 s. KRaft keeps metadata in a built-in Raft quorum, so a dead controller is replaced by a standby that already holds the full metadata log — no external ZooKeeper round-trip, no cold reload. That same design removes the ~200k-partition ceiling.</div>
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
