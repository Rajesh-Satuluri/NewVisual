// Master Map — the end-to-end journey of an event through Kafka, as clickable
// stages that deep-link into the module covering each one. Plus a concept map
// grouping every module by theme.

const STAGES = [
  { n: '01', icon: '🛒', m: 'm04', title: 'Produce',       sub: 'Serialize → partition → batch → acks',        note: 'An order event is keyed, routed to a partition, batched, and acknowledged.',
    payload: 'key = cust-7701 · {orderId:"A1", total:2490} → Avro bytes (schema-id 142)',
    detail: 'The order service <b>serializes</b> the event (Avro/Protobuf via Schema Registry — a magic byte + schema id + compact body), the <b>partitioner hashes the key</b> (customerId) to choose a partition, and the record joins an in-memory <b>batch</b> that flushes on <code>batch.size</code> or <code>linger.ms</code>. The <b>idempotent producer</b> tags each batch with a sequence number so retries never duplicate, and the send isn\'t acknowledged until <code>acks=all</code> in-sync replicas hold it.',
    mech: ['key → partitioner', 'batch + linger.ms', 'acks=all', 'idempotent producer'] },
  { n: '02', icon: '🖥️', m: 'm05', title: 'Store',         sub: 'Append to log segment · page cache',           note: 'The broker appends to the active segment; zero-copy keeps it fast.',
    payload: 'orders-3 @ offset 104271 — appended to active .log segment',
    detail: 'The partition <b>leader</b> appends the record batch to the end of the <b>active log segment</b> on disk — a sequential, append-only write that is effectively O(1) — and assigns the next <b>offset</b>. The bytes live in the OS <b>page cache</b>, so hot reads are served straight from RAM to the network with <b>zero-copy</b> (<code>sendfile</code>): the broker never deserializes or copies the record into the JVM heap.',
    mech: ['append-only segment', 'offset assigned', 'page cache', 'zero-copy sendfile'] },
  { n: '03', icon: '🔁', m: 'm07', title: 'Replicate',      sub: 'Leader → ISR followers · HWM',                 note: 'Followers fetch from the leader; the high watermark advances once in-sync.',
    payload: 'replicated to 3 ISR · High Watermark → 104272 · committed',
    detail: 'In-sync <b>follower</b> replicas issue <code>FetchRequest</code>s to the leader and copy the batch. Once every replica in the <b>ISR</b> has it, the leader advances the <b>High Watermark</b> — and only then is the record <b>committed</b> and visible to consumers. Under <code>acks=all</code> the producer\'s acknowledgement waits for exactly this, which is why <code>min.insync.replicas</code> is the durability knob.',
    mech: ['ISR', 'follower fetch', 'High Watermark', 'min.insync.replicas'] },
  { n: '04', icon: '🗂️', m: 'm06', title: 'Partition',      sub: 'Ordering · parallelism · keys',                note: 'Order holds within a partition; keys decide which one — and parallelism.',
    payload: 'all cust-7701 events → partition 3 (ordered) · 12 partitions total',
    detail: 'Ordering is guaranteed <b>only within a partition</b>, and the key pins every event for a customer to the <b>same partition</b> — so one customer\'s history stays strictly ordered while different customers spread across partitions for <b>parallelism</b>. Partition count is the permanent ceiling on consumer parallelism, so it\'s a capacity decision made up front.',
    mech: ['key → same partition', 'per-partition order', 'partitions = parallelism'] },
  { n: '05', icon: '👥', m: 'm08', title: 'Consume',        sub: 'Group · assignment · rebalance',               note: 'A consumer group divides partitions; membership changes trigger rebalances.',
    payload: 'group=fulfillment · consumer-2 owns orders-3 · poll() → @104271',
    detail: 'A <b>consumer group</b> divides the topic\'s partitions among its members — each partition goes to <b>at most one</b> consumer in the group. The <b>group coordinator</b> assigns partitions and triggers a <b>rebalance</b> when members join or leave; modern clients use <b>cooperative/incremental</b> rebalancing so only the partitions that must move are paused, not the whole group.',
    mech: ['group coordinator', 'partition assignment', 'cooperative rebalance'] },
  { n: '06', icon: '📍', m: 'm09', title: 'Track offsets',  sub: 'Commit · lag · replay',                        note: 'Committed offsets record progress; lag is the health metric; seek to replay.',
    payload: 'committed offset 104272 · lag = 0 · seekable for replay',
    detail: 'The consumer <b>commits</b> the offset of records it has processed to the internal <code>__consumer_offsets</code> topic — this is progress, and it is independent of the LSN or any sink marker. <b>Lag</b> = log-end-offset − committed offset is <em>the</em> health metric for a pipeline. <code>seek()</code> lets you <b>replay</b> from an earlier offset or skip ahead, and auto-vs-manual commit timing is what decides at-least-once vs at-most-once.',
    mech: ['commit → __consumer_offsets', 'lag = LEO − committed', 'seek() to replay'] },
  { n: '07', icon: '🛡️', m: 'm11', title: 'Guarantee',      sub: 'At-least / exactly-once',                      note: 'Idempotence + transactions turn duplicates into exactly-once processing.',
    payload: 'processing.guarantee = exactly_once_v2 · no dup, no loss',
    detail: 'The default is <b>at-least-once</b> (commit after processing → a crash before commit replays, causing duplicates). The <b>idempotent producer</b> removes duplicate <em>writes</em>; <b>transactions</b> make the <b>read-process-write</b> cycle atomic — consumed offsets and produced records commit together — giving <b>exactly-once</b> within Kafka. Any external sink still needs its own idempotency for true end-to-end EOS.',
    mech: ['idempotent producer', 'transactions', 'read-process-write', 'EOS'] },
  { n: '08', icon: '🌊', m: 'm13', title: 'Process',        sub: 'Streams · Connect · sink',                     note: 'Kafka Streams transforms in flight; Connect sinks to the warehouse.',
    payload: 'enriched order → revenue-by-category rollup → Iceberg table',
    detail: 'Now the event becomes a <b>product</b>. <b>Kafka Streams</b> transforms it in flight — filter, enrich via a <code>KTable</code> join, windowed aggregate — with local <b>state stores</b> backed by changelog topics; <b>Kafka Connect</b> sinks the result to a warehouse or lakehouse with no custom code. A raw order turns into a recommendation, a fraud flag, or a live revenue rollup.',
    mech: ['Streams (stateful transform)', 'Connect sink', 'changelog-backed state'] },
];

const GROUPS = [
  { title: 'Foundation', icon: '📜', color: 'var(--accent)', items: [['m01', 'Why Kafka'], ['m02', 'Messaging Fundamentals'], ['m03', 'Architecture']] },
  { title: 'Core Internals', icon: '⚙️', color: 'var(--blue)', items: [['m04', 'Producer'], ['m05', 'Broker Internals'], ['m06', 'Partitions'], ['m07', 'Replication']] },
  { title: 'Consumer Side', icon: '👥', color: 'var(--green)', items: [['m08', 'Consumer Groups'], ['m09', 'Offsets'], ['m10', 'Retention & Compaction']] },
  { title: 'Delivery', icon: '🛡️', color: 'var(--amber)', items: [['m11', 'Delivery Guarantees']] },
  { title: 'Ecosystem', icon: '🔌', color: 'var(--accent2, var(--accent))', items: [['m12', 'Kafka Connect'], ['m13', 'Kafka Streams'], ['m14', 'Schema Registry'], ['m20', 'vs Competitors']] },
  { title: 'Operations', icon: '🔧', color: 'var(--blue)', items: [['m15', 'Security'], ['m16', 'Monitoring'], ['m17', 'Performance'], ['m22', 'Reassignment']] },
  { title: 'Advanced', icon: '🚀', color: 'var(--red)', items: [['m18', 'Failure Simulation'], ['m19', 'Amazon Pipeline'], ['m21', 'MirrorMaker 2']] },
];

export function mount(container) {
  const stage = (s, i) => `
    <a class="mm-stage" href="#${s.m}" data-idx="${i}" id="mm-stage-${i}">
      <span class="mm-stage-top"><span class="mm-stage-num">${s.n}</span><span class="mm-stage-icon">${s.icon}</span></span>
      <span class="mm-stage-title">${s.title}</span>
      <span class="mm-stage-sub">${s.sub}</span>
      <span class="mm-stage-note">${s.note}</span>
    </a>`;

  const group = g => `
    <div class="mm-group">
      <div class="mm-group-head" style="border-left:3px solid ${g.color}">
        <span class="mm-group-icon">${g.icon}</span><span class="mm-group-title">${g.title}</span>
      </div>
      <div class="mm-group-items">
        ${g.items.map(([id, label]) => `<a class="mm-chip" href="#${id}"><span class="mm-chip-num">${id.replace(/^m/, '')}</span>${label}</a>`).join('')}
      </div>
    </div>`;

  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">🗺️ · Reference · Amazon Edition</div>
        <h1 class="module-title">Master Map</h1>
        <p class="module-subtitle">Follow one event end to end — from an Amazon order all the way to the warehouse — then jump into any stage. Every node links into its module.</p>
      </div>

      <div class="section-header"><div class="section-title">The journey of an event</div>
        <div class="section-desc">One Amazon order, produced → stored → replicated → consumed → processed. <b>Trace it</b> to see what happens at each hop, or click a stage to open its module.</div></div>
      <div class="mm-flow">
        ${STAGES.map(stage).join('<span class="mm-arrow">→</span>')}
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:14px 0 4px">
        <button class="ctrl-btn" id="mm-trace">▶ Trace the event</button>
        <button class="ctrl-btn" id="mm-step">⏭ Step</button>
        <button class="ctrl-btn" id="mm-reset">↻ Reset</button>
        <span style="font-size:11px;color:var(--text3)">follow one order event hop by hop — the live payload shows its state at each stage</span>
      </div>
      <div id="mm-detail" style="background:var(--bg2,#0C1424);border:1px solid var(--border,#1C2740);border-radius:12px;padding:16px 18px;min-height:150px"></div>

      <div class="section-header"><div class="section-title">Concept map</div>
        <div class="section-desc">All 22 modules, grouped by theme.</div></div>
      <div class="mm-groups">
        ${GROUPS.map(group).join('')}
      </div>
    </div>`;

  // ── Interactive event trace ─────────────────────────────────────────────
  const detail = container.querySelector('#mm-detail');
  const cards = [...container.querySelectorAll('.mm-stage')];
  let idx = -1, timer = null;

  function renderDetail() {
    if (idx < 0) {
      detail.innerHTML = `<div style="color:var(--text3);font-size:12.5px;line-height:1.6">Press <b>Trace the event</b> to follow one Amazon order from the checkout button all the way to the warehouse — each hop highlights above and expands here, showing the mechanism and the event's live state at that point.</div>`;
    } else {
      const s = STAGES[idx];
      detail.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px">
          <span style="font-size:22px">${s.icon}</span>
          <div style="flex:1;min-width:150px">
            <div style="font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--accent)">Stage ${s.n} / 08 · ${s.sub}</div>
            <div style="font-size:16px;font-weight:700;color:var(--text,#E2E8F0)">${s.title}</div>
          </div>
          <a class="ctrl-btn" href="#${s.m}" style="font-size:11px;text-decoration:none">Open module →</a>
        </div>
        <div style="font-family:ui-monospace,monospace;font-size:11px;color:#86EFAC;background:var(--bg,#070B14);border:1px solid var(--border,#1C2740);border-radius:8px;padding:9px 12px;margin-bottom:10px;word-break:break-word"><span style="color:var(--accent)">▸ event:</span> ${s.payload}</div>
        <div style="font-size:12.5px;line-height:1.65;color:var(--text2,#CBD5E1);margin-bottom:10px">${s.detail}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${s.mech.map(m => `<span style="font-size:10px;font-family:ui-monospace,monospace;color:var(--text2,#94A3B8);background:var(--bg3,#111A2B);border:1px solid var(--border,#243149);border-radius:5px;padding:3px 8px">${m}</span>`).join('')}
        </div>`;
    }
    cards.forEach((c, j) => {
      c.style.outline = j === idx ? '2px solid var(--accent)' : '';
      c.style.outlineOffset = j === idx ? '2px' : '';
      c.style.opacity = idx >= 0 && j !== idx ? '0.55' : '1';
      c.style.transition = 'opacity .2s, outline-color .2s';
    });
  }

  function step() {
    idx = idx >= STAGES.length - 1 ? 0 : idx + 1;
    renderDetail();
  }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

  container.querySelector('#mm-step').addEventListener('click', () => { stopTimer(); step(); });
  container.querySelector('#mm-reset').addEventListener('click', () => { stopTimer(); idx = -1; renderDetail(); });
  container.querySelector('#mm-trace').addEventListener('click', () => {
    stopTimer(); idx = -1; renderDetail();
    timer = setInterval(() => {
      if (idx >= STAGES.length - 1) { step(); stopTimer(); return; }
      step();
    }, 1600);
  });
  // Clicking a stage card selects it in the trace too (nav still works via hashchange,
  // but a modifier-less click on same-page anchor just updates the hash; show detail first).
  cards.forEach((c, j) => c.addEventListener('click', () => { stopTimer(); idx = j; renderDetail(); }));

  renderDetail();
  return () => stopTimer();
}
