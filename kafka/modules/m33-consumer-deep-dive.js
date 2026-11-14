import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { EventPacket, drawRoundRect } from '../components/canvas-primitives.js';

export const IQ = [
  { q: 'What does consumer.poll(timeout) actually do under the hood?', a: 'poll() is NOT one network round-trip per record. It (1) ensures the consumer is joined to its group and has partitions assigned, (2) sends any pending FetchRequests to brokers for partitions whose prefetch buffer is low, (3) returns records already sitting in the in-memory fetch buffer (up to max.poll.records), and (4) runs the coordinator bookkeeping — heartbeats, offset commits (if auto-commit), and rebalance callbacks. A single-threaded consumer spends almost all its time draining a locally buffered queue; the actual broker fetches happen pipelined in the background so the next poll() rarely waits on the network.', tip: 'The killer detail: poll() is also the liveness signal. If your processing between two poll() calls exceeds max.poll.interval.ms, the coordinator assumes the consumer is dead and triggers a rebalance — the #1 cause of "rebalance storms." Heartbeats run on a separate thread and do NOT save you from slow processing.' },
  { q: 'Why can a Kafka consumer read millions of records/sec from one broker with almost no broker CPU?', a: 'Zero-copy. When the broker serves a FetchRequest, the record batch is already stored on disk in the exact wire format the consumer expects (same binary layout the producer sent). So the broker calls the sendfile() syscall, which streams bytes straight from the OS page cache to the network socket inside the kernel — never copying them into the broker JVM heap, never deserializing, never re-compressing. On a warm topic the data is already in page cache, so it is a RAM-to-NIC transfer. The broker is basically a dumb byte pump; all the real CPU work (decompression, deserialization) happens in the consumer.', tip: 'This is why adding consumer groups is cheap — each group just re-reads the same page-cache pages via sendfile. It is also why a cold consumer (reading old data not in page cache) hurts: it forces disk reads and evicts hot pages, so you see latency spikes for everyone on that broker.' },
  { q: 'Where does deserialization happen, and what is a "poison pill"?', a: 'Deserialization happens in the CONSUMER process, inside poll(), after the raw bytes arrive — never on the broker (the broker only ever sees opaque bytes). The consumer runs the configured key/value deserializer (StringDeserializer, Avro + Schema Registry, Protobuf, JSON). With Avro, the first bytes are a magic byte + 4-byte schema ID; the deserializer looks that ID up in the Schema Registry (cached after first fetch) to decode the record. A "poison pill" is a record the deserializer cannot parse — e.g. a non-Avro message on an Avro topic. It throws inside poll(), and because the offset was never advanced, a naive consumer retries the same record forever and gets stuck. The fix is ErrorHandlingDeserializer + a dead-letter topic.', tip: 'Deserialization is pure consumer-side CPU. If a consumer is CPU-bound, it is usually decompression + deserialization, not network — which is why Avro/Protobuf (compact, fast) beat JSON at scale.' },
  { q: 'A single consumer instance reads 6 partitions. Is it 6 threads?', a: 'No. A KafkaConsumer is single-threaded by design and is NOT thread-safe. One consumer object multiplexes all its assigned partitions over per-broker TCP connections: it sends one FetchRequest per broker that covers every assigned partition led by that broker, and poll() returns an interleaved batch across all of them. If you need parallelism, you either run more consumer instances in the group (up to one per partition) or hand records off to a worker pool after poll() — but then YOU own offset management, because committing an offset you have not actually finished processing re-introduces data loss.', tip: 'The clean scaling unit is "one consumer instance per partition." Beyond that, extra instances in the group sit idle. That is the real meaning of "partitions = the unit of consumer parallelism."' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M33 · Consumer Side',
    title: 'Consumer Deep Dive',
    subtitle: 'Poll loop → Fetch protocol → Zero-copy → Deserialize — the read path traced through Amazon\'s Fulfillment Service',
    tabs: [
      { id: 'pollloop',  label: '🔄 The Poll Loop' },
      { id: 'fetch',     label: '📡 Fetch Protocol' },
      { id: 'zerocopy',  label: '⚡ Zero-Copy & Page Cache' },
      { id: 'deser',     label: '🧬 Deserialization' },
      { id: 'walk',      label: '🎬 End-to-End' },
      { id: 'usecases',  label: '🛒 Real-World Consumers' },
      { id: 'iq',        label: '🎯 Interview Q&A' },
    ]
  });

  let cleanup = buildPollLoop(container);
  buildFetch(container);
  buildZeroCopy(container);
  buildDeser(container);
  buildWalk(container);
  buildUseCases(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

/* ─────────────────────────────────────────────────────────────────────────
   TAB 1 — The Poll Loop (canvas animation)
   ───────────────────────────────────────────────────────────────────────── */
function buildPollLoop(container) {
  const tab = container.querySelector('#tab-pollloop');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">A consumer is a <b>single thread spinning a loop</b>. The green pills are record batches a <b>background Fetcher</b> pulls from the broker into an in-memory <b>prefetch buffer</b>. Each <b>poll()</b> call drains up to <code>max.poll.records</code> from that buffer and hands them to <b>your code</b>; the broker box flashes when a FetchRequest is served, the commit box flashes when the offset is committed. Press <b>poll() once</b> or <b>Run loop</b>.</div>
      <canvas id="consumer-canvas" width="820" height="360" style="width:100%;max-width:820px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="cons-poll">🔄 poll() once</button>
        <button class="ctrl-btn" id="cons-run">▶️ Run loop</button>
        <button class="ctrl-btn" id="cons-slow">🐢 Slow handler (evict!)</button>
        <span class="ctrl-label">Watch: fetch (background) → buffer → poll drains → handle → commit</span>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>The single most common misconception about consumers is that <code>poll()</code> makes a network call that fetches one record. It does not. A consumer runs a tight single-threaded loop: <code>while (running) { records = consumer.poll(Duration.ofMillis(100)); process(records); }</code>. Almost all the real work — the actual broker fetches — happens <strong>in the background, ahead of time</strong>, so that by the time your code calls <code>poll()</code> the records are usually already sitting in a local in-memory buffer waiting to be handed over.</p>
      <p>A dedicated <strong>Fetcher</strong> (part of the consumer's internals) pipelines <code>FetchRequest</code>s to the brokers: while your code is busy processing the current batch, the next batch is already being fetched. This prefetching is why one consumer thread can sustain millions of records per second — it is rarely blocked on the network. <code>poll()</code> simply returns whatever is buffered, up to <code>max.poll.records</code> (default 500).</p>
      <p><strong><code>poll()</code> does far more than fetch.</strong> It is also the consumer's heartbeat-and-liveness checkpoint: on every call it drives the group coordinator protocol — sending heartbeats, running any pending rebalance callbacks, and (with <code>enable.auto.commit=true</code>) committing offsets on a timer. This is the crucial trap: <strong>if your processing between two <code>poll()</code> calls takes longer than <code>max.poll.interval.ms</code> (default 5 min), the coordinator assumes your consumer has died</strong> and kicks it out of the group, triggering a rebalance. Press <b>Slow handler</b> above to watch exactly that eviction happen.</p>
      <p><strong>Interview angle:</strong> a <code>KafkaConsumer</code> is <em>not thread-safe</em> and is single-threaded by design — one object multiplexes every assigned partition over per-broker connections. You scale by adding instances to the group (one per partition, max), not threads. And heartbeats run on a <em>separate</em> background thread since KIP-62, so a brief GC pause won't evict you — but slow <em>processing</em> still will, because that is governed by <code>max.poll.interval.ms</code>, not <code>session.timeout.ms</code>. Knowing which timeout governs which failure is a classic senior-level distinction.</p>
    </div>`;

  const canvas = tab.querySelector('#consumer-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  const stages = [
    { x: 40,  y: 155, w: 110, h: 54, label: 'Broker',     sub: 'leader of P0–P5',    color: '#10B981' },
    { x: 215, y: 85,  w: 120, h: 50, label: 'Fetcher',    sub: 'background thread',   color: '#06B6D4' },
    { x: 360, y: 155, w: 120, h: 54, label: 'Prefetch buf', sub: 'in-memory queue',   color: '#F59E0B' },
    { x: 525, y: 155, w: 110, h: 54, label: 'poll()',     sub: '≤ max.poll.records',  color: '#8B5CF6' },
    { x: 685, y: 155, w: 95,  h: 54, label: 'Your code',  sub: 'process + commit',    color: '#3B82F6' },
  ];

  const packets = [];
  let raf = null, lastT = 0;
  let brokerFlash = 0, commitFlash = 0, bufferCount = 0, evicted = 0, running = false, runTimer = 0;
  let batchCount = 0;

  // A "fetch" packet: broker → fetcher → buffer
  function spawnFetch() {
    brokerFlash = 30;
    packets.push(new EventPacket({
      label: `batch-${++batchCount}`,
      color: '#10B981',
      speed: 2.0,
      path: [ {x:95,y:182}, {x:215,y:110}, {x:300,y:110}, {x:360,y:160}, {x:420,y:182} ],
      onArrive: () => { bufferCount = Math.min(bufferCount + 1, 5); }
    }));
  }
  // A "poll" packet: buffer → poll() → your code → commit flash
  function spawnPoll() {
    if (bufferCount <= 0) { spawnFetch(); return; }
    bufferCount = Math.max(0, bufferCount - 1);
    packets.push(new EventPacket({
      label: 'records',
      color: '#8B5CF6',
      speed: 1.7,
      path: [ {x:420,y:182}, {x:525,y:182}, {x:635,y:182}, {x:732,y:182} ],
      onArrive: () => { commitFlash = 36; if (bufferCount < 2) spawnFetch(); }
    }));
  }

  function triggerEvict() {
    evicted = 180;
    running = false;
  }

  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05);
    lastT = ts;
    if (brokerFlash > 0) brokerFlash--;
    if (commitFlash > 0) commitFlash--;
    if (evicted > 0) evicted--;

    if (running) {
      runTimer += dt;
      if (runTimer > 0.55) { runTimer = 0; spawnPoll(); }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // connections
    ctx.setLineDash([4,3]); ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(150,182); ctx.lineTo(215,110);
    ctx.moveTo(335,110); ctx.lineTo(360,160);
    ctx.moveTo(480,182); ctx.lineTo(525,182);
    ctx.moveTo(635,182); ctx.lineTo(685,182);
    ctx.stroke();
    ctx.setLineDash([]);

    // the loop arrow (your code → poll, the "while(running)" cycle)
    ctx.setLineDash([3,3]); ctx.strokeStyle = '#8B5CF655'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(732,209); ctx.lineTo(732,250); ctx.lineTo(580,250); ctx.lineTo(580,209);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '9px system-ui'; ctx.fillStyle = '#8B5CF6aa'; ctx.textAlign = 'center';
    ctx.fillText('while (running) — loop back to poll()', 656, 264);

    stages.forEach(s => {
      let flash = false, fc = s.color;
      if (s.label === 'Broker' && brokerFlash > 0) flash = true;
      if (s.label === 'Your code' && commitFlash > 0) flash = true;
      drawRoundRect(ctx, s.x, s.y, s.w, s.h, 9,
        flash ? s.color + '44' : '#111827', flash ? s.color : s.color + '88');
      ctx.font = 'bold 12px system-ui'; ctx.fillStyle = s.color; ctx.textAlign = 'center';
      ctx.fillText(s.label, s.x + s.w/2, s.y + 22);
      ctx.font = '9px system-ui'; ctx.fillStyle = '#8A98AE';
      ctx.fillText(s.sub, s.x + s.w/2, s.y + 38);
    });

    // buffer depth indicator
    ctx.font = '9px system-ui'; ctx.fillStyle = '#F59E0B'; ctx.textAlign = 'center';
    ctx.fillText('prefetch buffer: ' + bufferCount + ' / 5 batches', 420, 130);

    // commit label
    if (commitFlash > 0) {
      ctx.font = 'bold 10px system-ui'; ctx.fillStyle = '#3B82F6'; ctx.textAlign = 'center';
      ctx.fillText('✓ commit offset', 732, 148);
    }

    // eviction banner
    if (evicted > 0) {
      ctx.fillStyle = '#EF444422'; ctx.fillRect(0, 300, canvas.width, 60);
      ctx.font = 'bold 13px system-ui'; ctx.fillStyle = '#EF4444'; ctx.textAlign = 'center';
      ctx.fillText('⚠ max.poll.interval.ms exceeded → coordinator evicts this consumer → REBALANCE', 410, 326);
      ctx.font = '10px system-ui'; ctx.fillStyle = '#FCA5A5';
      ctx.fillText('Processing took too long between poll() calls. Its partitions are reassigned to another member.', 410, 344);
    }

    packets.forEach(p => p.update(dt));
    packets.forEach(p => p.draw(ctx));
    while (packets.length > 24) packets.shift();

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });

  tab.querySelector('#cons-poll').addEventListener('click', () => spawnPoll());
  tab.querySelector('#cons-run').addEventListener('click', (e) => {
    running = !running;
    e.target.textContent = running ? '⏸️ Pause loop' : '▶️ Run loop';
    if (running && bufferCount === 0) spawnFetch();
  });
  tab.querySelector('#cons-slow').addEventListener('click', () => triggerEvict());

  return () => { if (raf) cancelAnimationFrame(raf); };
}

/* ─────────────────────────────────────────────────────────────────────────
   TAB 2 — Fetch Protocol
   ───────────────────────────────────────────────────────────────────────── */
function buildFetch(container) {
  const tab = container.querySelector('#tab-fetch');
  const chip = 'font-size:11px;color:#CBD5E1;background:#0A0E1A;padding:2px 6px;border-radius:5px;font-family:monospace';
  tab.innerHTML = `
    <div class="scroll-content" style="max-width:920px;margin:0 auto">

      <div style="background:#111827;border:1px solid #06B6D4;border-radius:14px;padding:20px 24px;margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94A3B8;margin-bottom:8px">The wire protocol</div>
        <div style="font-size:18px;font-weight:800;color:#F1F5F9;margin-bottom:6px">One FetchRequest per broker — not per partition, not per record</div>
        <div style="font-size:13px;color:#94A3B8;line-height:1.6">A consumer assigned 6 partitions spread over 3 brokers sends <b>3</b> FetchRequests, each asking one broker for <i>all</i> the partitions it leads. The broker holds the request open until there is enough data or the wait times out, then returns one response carrying interleaved batches. This "long-poll + multiplexing" is the whole secret to Kafka's read efficiency.</div>
      </div>

      <!-- SVG: multiplexed fetch -->
      <div style="background:#0A0E1A;border:1px solid #1E293B;border-radius:12px;padding:18px;margin-bottom:12px">
        <svg viewBox="0 0 860 240" style="width:100%;height:auto" role="img" aria-label="A consumer sending one FetchRequest per broker, each covering all partitions that broker leads.">
          <!-- consumer -->
          <rect x="20" y="90" width="130" height="60" rx="10" fill="#111827" stroke="#8B5CF6"/>
          <text x="85" y="115" fill="#8B5CF6" font-size="13" font-weight="700" text-anchor="middle" font-family="system-ui">Consumer</text>
          <text x="85" y="134" fill="#8A98AE" font-size="9" text-anchor="middle" font-family="system-ui">assigned P0–P5</text>
          <!-- brokers -->
          <rect x="620" y="20"  width="200" height="56" rx="10" fill="#111827" stroke="#10B981"/>
          <text x="720" y="42"  fill="#10B981" font-size="12" font-weight="700" text-anchor="middle" font-family="system-ui">Broker 1 · leads P0,P3</text>
          <text x="720" y="60"  fill="#8A98AE" font-size="9" text-anchor="middle" font-family="system-ui">serves via sendfile()</text>
          <rect x="620" y="92"  width="200" height="56" rx="10" fill="#111827" stroke="#10B981"/>
          <text x="720" y="114" fill="#10B981" font-size="12" font-weight="700" text-anchor="middle" font-family="system-ui">Broker 2 · leads P1,P4</text>
          <text x="720" y="132" fill="#8A98AE" font-size="9" text-anchor="middle" font-family="system-ui">one connection, many parts</text>
          <rect x="620" y="164" width="200" height="56" rx="10" fill="#111827" stroke="#10B981"/>
          <text x="720" y="186" fill="#10B981" font-size="12" font-weight="700" text-anchor="middle" font-family="system-ui">Broker 3 · leads P2,P5</text>
          <text x="720" y="204" fill="#8A98AE" font-size="9" text-anchor="middle" font-family="system-ui">long-poll until min.bytes</text>
          <!-- arrows -->
          <line x1="150" y1="112" x2="620" y2="48"  stroke="#06B6D4" stroke-width="2"/>
          <line x1="150" y1="120" x2="620" y2="120" stroke="#06B6D4" stroke-width="2"/>
          <line x1="150" y1="128" x2="620" y2="192" stroke="#06B6D4" stroke-width="2"/>
          <text x="370" y="66"  fill="#06B6D4" font-size="10" text-anchor="middle" font-family="monospace">FetchRequest {P0,P3}</text>
          <text x="385" y="113" fill="#06B6D4" font-size="10" text-anchor="middle" font-family="monospace">FetchRequest {P1,P4}</text>
          <text x="370" y="176" fill="#06B6D4" font-size="10" text-anchor="middle" font-family="monospace">FetchRequest {P2,P5}</text>
        </svg>
      </div>
      <div style="font-size:11px;color:#64748B;text-align:center;margin-bottom:28px">3 brokers → 3 FetchRequests, each multiplexing the partitions that broker leads. 6 partitions does <b>not</b> mean 6 requests.</div>

      <!-- the knobs -->
      <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94A3B8;margin-bottom:14px">The fetch knobs — the latency vs. throughput dial</div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:28px">
        ${[
          { k:'fetch.min.bytes = 1', c:'#06B6D4', d:`The <b>minimum</b> data a broker must have before it answers a FetchRequest. Default <span style="${chip}">1</span> = "reply the instant any record exists" (lowest latency). Raise it (e.g. <span style="${chip}">64KB</span>) and the broker waits to accumulate a bigger payload — fewer, fatter responses, far less CPU on both sides, at the cost of a little latency. This is the throughput dial.` },
          { k:'fetch.max.wait.ms = 500', c:'#F59E0B', d:`The <b>maximum</b> the broker will hold the request waiting for <span style="${chip}">fetch.min.bytes</span> to be reached. It is the <i>latency ceiling</i> on an idle topic: with min.bytes=64KB but a quiet partition, the broker still replies after 500ms rather than hanging forever. min.bytes and max.wait together are a classic race — whichever condition is hit first ends the long-poll.` },
          { k:'fetch.max.bytes = 50MB', c:'#3B82F6', d:`Hard cap on the <b>total</b> size of a single FetchResponse across all partitions. Protects consumer memory from a runaway fetch. The broker will always return at least one record batch even if it exceeds this, so a single oversized message can never deadlock the consumer.` },
          { k:'max.partition.fetch.bytes = 1MB', c:'#10B981', d:`Per-partition slice of the above — how much can come back <b>from one partition</b> in a response. Stops a single hot partition from starving the others in the same multiplexed request. Must be ≥ the broker's largest message or that partition stalls.` },
          { k:'max.poll.records = 500', c:'#8B5CF6', d:`Not a fetch knob but a <b>poll()</b> knob — how many buffered records <span style="${chip}">poll()</span> hands your code at once. Lower it when per-record processing is heavy so a single batch can't blow past <span style="${chip}">max.poll.interval.ms</span> and get you evicted. It decouples "how much is fetched" from "how much you digest per loop."` },
        ].map(x => `
          <div style="background:#111827;border:1px solid #1E293B;border-left:3px solid ${x.c};border-radius:10px;padding:14px 18px;display:flex;gap:14px">
            <div style="flex-shrink:0;min-width:210px"><code style="font-size:11px;color:${x.c};background:#0A0E1A;padding:4px 8px;border-radius:5px;font-weight:700">${x.k}</code></div>
            <div style="font-size:12px;color:#94A3B8;line-height:1.65">${x.d}</div>
          </div>`).join('')}
      </div>

      <div style="background:#06B6D412;border:1.5px solid #06B6D444;border-radius:12px;padding:18px 22px">
        <div style="font-size:13px;font-weight:700;color:#06B6D4;margin-bottom:10px">The mental model: a consumer is a long-poll client, not a request/response client</div>
        <div style="font-size:12.5px;color:#94A3B8;line-height:1.75">
          A naive queue client asks "any message?", gets "no", sleeps, asks again — busy-polling that burns CPU for nothing. Kafka inverts this: the consumer says "give me data when you have at least <span style="${chip}">fetch.min.bytes</span>, but don't make me wait more than <span style="${chip}">fetch.max.wait.ms</span>," and the <b>broker holds the connection open</b> until one of those is true. No busy-polling, and the broker batches naturally under load. Because the Fetcher keeps the next request in flight while your code processes the current batch, the network round-trip is hidden behind your processing time — the pipeline is never idle waiting on bytes.
        </div>
      </div>

    </div>`;
}

/* ─────────────────────────────────────────────────────────────────────────
   TAB 3 — Zero-Copy & Page Cache
   ───────────────────────────────────────────────────────────────────────── */
function buildZeroCopy(container) {
  const tab = container.querySelector('#tab-zerocopy');
  const chip = 'font-size:11px;color:#CBD5E1;background:#0A0E1A;padding:2px 6px;border-radius:5px;font-family:monospace';
  tab.innerHTML = `
    <div class="scroll-content" style="max-width:920px;margin:0 auto">

      <div style="background:#111827;border:1px solid #F59E0B;border-radius:14px;padding:20px 24px;margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94A3B8;margin-bottom:8px">Why reads are almost free for the broker</div>
        <div style="font-size:18px;font-weight:800;color:#F1F5F9;margin-bottom:6px">The broker never looks at your records — it <code>sendfile()</code>s raw bytes from page cache to the socket</div>
        <div style="font-size:13px;color:#94A3B8;line-height:1.6">Records are stored on disk in the <b>exact wire format</b> the producer sent and the consumer expects. So the broker never copies them into the JVM heap, never deserializes, never re-compresses. It issues one kernel syscall and the OS streams bytes straight from the file's page cache to the network card.</div>
      </div>

      <!-- SVG: zero-copy vs naive -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:12px">
        <div style="background:#0A0E1A;border:1px solid #EF444455;border-radius:12px;padding:16px">
          <div style="font-size:12px;font-weight:700;color:#EF4444;margin-bottom:10px;text-align:center">❌ Naive read (4 copies, 2 context switches)</div>
          <svg viewBox="0 0 360 200" style="width:100%;height:auto" role="img" aria-label="Naive read path copying data disk to kernel to app to socket buffer.">
            <rect x="20" y="20" width="90" height="40" rx="6" fill="#111827" stroke="#64748B"/><text x="65" y="44" fill="#CBD5E1" font-size="10" text-anchor="middle" font-family="system-ui">Disk / cache</text>
            <rect x="20" y="150" width="90" height="40" rx="6" fill="#111827" stroke="#64748B"/><text x="65" y="174" fill="#CBD5E1" font-size="10" text-anchor="middle" font-family="system-ui">Kernel buf</text>
            <rect x="250" y="150" width="90" height="40" rx="6" fill="#111827" stroke="#64748B"/><text x="295" y="174" fill="#CBD5E1" font-size="10" text-anchor="middle" font-family="system-ui">App (JVM)</text>
            <rect x="250" y="20" width="90" height="40" rx="6" fill="#111827" stroke="#64748B"/><text x="295" y="44" fill="#CBD5E1" font-size="10" text-anchor="middle" font-family="system-ui">Socket buf</text>
            <line x1="65" y1="60" x2="65" y2="150" stroke="#EF4444" stroke-width="2"/><text x="72" y="108" fill="#EF4444" font-size="9" font-family="system-ui">1</text>
            <line x1="110" y1="170" x2="250" y2="170" stroke="#EF4444" stroke-width="2"/><text x="180" y="164" fill="#EF4444" font-size="9" text-anchor="middle" font-family="system-ui">2 (→ user space)</text>
            <line x1="295" y1="150" x2="295" y2="60" stroke="#EF4444" stroke-width="2"/><text x="302" y="108" fill="#EF4444" font-size="9" font-family="system-ui">3</text>
            <text x="180" y="14" fill="#8A98AE" font-size="8" text-anchor="middle" font-family="system-ui">4 → NIC</text>
          </svg>
          <div style="font-size:10.5px;color:#94A3B8;line-height:1.6;margin-top:8px">Bytes cross the user/kernel boundary twice and are copied 4 times. Every byte served touches the CPU.</div>
        </div>
        <div style="background:#0A0E1A;border:1px solid #10B98155;border-radius:12px;padding:16px">
          <div style="font-size:12px;font-weight:700;color:#10B981;margin-bottom:10px;text-align:center">✅ Zero-copy (sendfile — stays in kernel)</div>
          <svg viewBox="0 0 360 200" style="width:100%;height:auto" role="img" aria-label="Zero-copy path: page cache straight to NIC via sendfile, bypassing the application.">
            <rect x="20" y="80" width="110" height="44" rx="6" fill="#111827" stroke="#10B981"/><text x="75" y="100" fill="#10B981" font-size="10" text-anchor="middle" font-family="system-ui">Page cache</text><text x="75" y="115" fill="#8A98AE" font-size="8" text-anchor="middle" font-family="system-ui">(kernel)</text>
            <rect x="240" y="80" width="100" height="44" rx="6" fill="#111827" stroke="#10B981"/><text x="290" y="100" fill="#10B981" font-size="10" text-anchor="middle" font-family="system-ui">NIC / socket</text><text x="290" y="115" fill="#8A98AE" font-size="8" text-anchor="middle" font-family="system-ui">(kernel)</text>
            <rect x="140" y="20" width="90" height="34" rx="6" fill="#0A0E1A" stroke="#334155" stroke-dasharray="4 3"/><text x="185" y="41" fill="#64748B" font-size="9" text-anchor="middle" font-family="system-ui">App skipped</text>
            <line x1="130" y1="102" x2="240" y2="102" stroke="#10B981" stroke-width="3"/>
            <text x="185" y="140" fill="#10B981" font-size="10" text-anchor="middle" font-family="monospace">sendfile()</text>
            <text x="185" y="156" fill="#8A98AE" font-size="8" text-anchor="middle" font-family="system-ui">1 copy, 0 user-space hops</text>
          </svg>
          <div style="font-size:10.5px;color:#94A3B8;line-height:1.6;margin-top:8px">One syscall. Bytes go page cache → NIC inside the kernel. The broker JVM never sees them — RAM-to-wire at line rate.</div>
        </div>
      </div>
      <div style="font-size:11px;color:#64748B;text-align:center;margin-bottom:28px">Same reason the producer's compressed batch is stored as-is: the format on the wire = the format on disk = the format in page cache. No translation anywhere in the broker.</div>

      <!-- page cache prose -->
      <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94A3B8;margin-bottom:14px">The page cache is the real Kafka database</div>
      <div style="background:#111827;border:1px solid #1E293B;border-radius:12px;padding:18px 22px;font-size:12.5px;color:#94A3B8;line-height:1.75;margin-bottom:24px">
        <p style="margin:0 0 14px">Kafka deliberately does <b>not</b> maintain its own in-process cache of messages. It writes records to the OS page cache (which lazily flushes to disk) and reads them back from that same page cache. The operating system — not the JVM — owns the hot set. This is why a Kafka broker runs happily with a small heap but wants a <b>large amount of RAM</b>: that RAM is page cache, and page cache is where your recent data lives.</p>
        <p style="margin:0 0 14px"><b style="color:#10B981">The happy path:</b> consumers read at the tail — the newest records, which the producer wrote seconds ago and are still resident in page cache. So the "disk" in "Kafka reads from disk" is almost always a lie: it is a RAM read dressed up as a file read, which is why a well-fed broker serves reads with near-zero disk I/O.</p>
        <p style="margin:0"><b style="color:#EF4444">The cold-read trap:</b> a consumer that falls far behind, or a brand-new consumer group reading from the beginning, asks for <i>old</i> pages that are no longer cached. Now the broker must hit the actual disk, and worse, those cold pages <b>evict the hot tail pages</b> that every other consumer depends on — so one lagging batch job can spike read latency for every real-time consumer on that broker. This is why big backfills are often isolated to their own brokers or throttled.</p>
      </div>

      <div style="background:#F59E0B12;border:1.5px solid #F59E0B44;border-radius:12px;padding:18px 22px">
        <div style="font-size:13px;font-weight:700;color:#F59E0B;margin-bottom:10px">Where this breaks: zero-copy only works for untouched bytes</div>
        <div style="font-size:12.5px;color:#94A3B8;line-height:1.75">The moment the broker has to <i>modify</i> a batch on the read path, <span style="${chip}">sendfile()</span> is off the table and it falls back to copying through the heap. The big one is <b>TLS/SSL</b>: encrypting the stream means the bytes must pass through user space to be encrypted, so enabling in-transit encryption measurably raises broker CPU and lowers max throughput. The other is <b>down-conversion</b> — an old consumer asking for an older message format than what's on disk forces the broker to re-encode each batch. Keeping clients and brokers on matching message formats preserves the zero-copy fast path; it's a real, often-overlooked performance lever.</div>
      </div>

    </div>`;
}

/* ─────────────────────────────────────────────────────────────────────────
   TAB 4 — Deserialization
   ───────────────────────────────────────────────────────────────────────── */
function buildDeser(container) {
  const tab = container.querySelector('#tab-deser');
  const chip = 'font-size:11px;color:#CBD5E1;background:#0A0E1A;padding:2px 6px;border-radius:5px;font-family:monospace';
  tab.innerHTML = `
    <div class="scroll-content" style="max-width:920px;margin:0 auto">

      <div style="background:#111827;border:1px solid #8B5CF6;border-radius:14px;padding:20px 24px;margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94A3B8;margin-bottom:8px">Bytes → objects, in your process</div>
        <div style="font-size:18px;font-weight:800;color:#F1F5F9;margin-bottom:6px">Deserialization is the consumer's job — the broker only ever moved opaque bytes</div>
        <div style="font-size:13px;color:#94A3B8;line-height:1.6">The symmetric mirror of the producer's serializer. Inside <span style="${chip}">poll()</span>, after the raw batch arrives and is decompressed, the configured key/value deserializer turns bytes back into objects. This is pure consumer-side CPU — and the place where a single malformed record can wedge an entire partition.</div>
      </div>

      <!-- avro wire format SVG -->
      <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94A3B8;margin-bottom:14px">The Avro + Schema Registry wire format</div>
      <div style="background:#0A0E1A;border:1px solid #1E293B;border-radius:12px;padding:18px;margin-bottom:10px">
        <svg viewBox="0 0 860 150" style="width:100%;height:auto" role="img" aria-label="Avro Confluent wire format: magic byte, 4-byte schema id, then Avro-encoded payload; the id is looked up in the Schema Registry.">
          <rect x="20"  y="30" width="60"  height="46" rx="6" fill="#1E293B" stroke="#EF4444"/><text x="50"  y="50" fill="#EF4444" font-size="10" text-anchor="middle" font-family="monospace">0x00</text><text x="50" y="64" fill="#8A98AE" font-size="8" text-anchor="middle" font-family="system-ui">magic</text>
          <rect x="84"  y="30" width="110" height="46" rx="6" fill="#1E293B" stroke="#F59E0B"/><text x="139" y="50" fill="#F59E0B" font-size="10" text-anchor="middle" font-family="monospace">schema id</text><text x="139" y="64" fill="#8A98AE" font-size="8" text-anchor="middle" font-family="system-ui">4 bytes (=152)</text>
          <rect x="198" y="30" width="360" height="46" rx="6" fill="#1E293B" stroke="#8B5CF6"/><text x="378" y="50" fill="#8B5CF6" font-size="10" text-anchor="middle" font-family="monospace">Avro-encoded payload</text><text x="378" y="64" fill="#8A98AE" font-size="8" text-anchor="middle" font-family="system-ui">no field names — compact binary, schema-driven</text>
          <!-- registry lookup -->
          <rect x="620" y="95" width="210" height="44" rx="8" fill="#111827" stroke="#06B6D4"/><text x="725" y="114" fill="#06B6D4" font-size="11" font-weight="700" text-anchor="middle" font-family="system-ui">Schema Registry</text><text x="725" y="130" fill="#8A98AE" font-size="8" text-anchor="middle" font-family="system-ui">id 152 → writer schema (cached)</text>
          <line x1="139" y1="76" x2="660" y2="95" stroke="#F59E0B" stroke-width="1.5" stroke-dasharray="4 3"/>
          <text x="400" y="100" fill="#F59E0B" font-size="9" text-anchor="middle" font-family="system-ui">look up id → decode with that schema</text>
        </svg>
      </div>
      <div style="font-size:11px;color:#64748B;text-align:center;margin-bottom:28px">The payload has <b>no field names</b> — that's why Avro is ~5× smaller than JSON. The decoder <i>needs</i> the schema (fetched once by id, then cached) to know what the bytes mean.</div>

      <!-- deserializer cards -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:28px">
        ${[
          { t:'String / primitive', c:'#64748B', d:'StringDeserializer, LongDeserializer. Zero schema machinery — just decode UTF-8 / fixed-width bytes. Fine for keys and simple pipelines; no evolution safety.' },
          { t:'JSON', c:'#3B82F6', d:'Human-readable, self-describing, but field names repeat in every record (bloat) and there is no enforced contract — a producer typo silently becomes a null downstream.' },
          { t:'Avro + Schema Registry', c:'#8B5CF6', d:'Compact binary + a central schema contract with compatibility rules. The dominant choice at scale. The consumer caches each schema id after first lookup, so the registry is not on the hot path.' },
          { t:'Protobuf', c:'#10B981', d:'Also compact + schema-governed, with cross-language codegen. Similar trade-offs to Avro; choice is usually org convention.' },
        ].map(x => `
          <div style="background:#111827;border:1px solid #1E293B;border-left:3px solid ${x.c};border-radius:10px;padding:14px 18px">
            <div style="font-size:12.5px;font-weight:700;color:${x.c};margin-bottom:6px">${x.t}</div>
            <div style="font-size:12px;color:#94A3B8;line-height:1.65">${x.d}</div>
          </div>`).join('')}
      </div>

      <!-- poison pill -->
      <div style="background:#EF444412;border:1.5px solid #EF444444;border-radius:12px;padding:18px 22px;margin-bottom:22px">
        <div style="font-size:13px;font-weight:700;color:#EF4444;margin-bottom:12px">The poison pill — one bad record stops the whole partition</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:12px">
          <div>
            <div style="color:#EF4444;font-weight:600;margin-bottom:8px">Naive consumer (stuck forever)</div>
            <div style="background:#0A0E1A;border-radius:8px;padding:12px;color:#94A3B8;line-height:1.8;font-size:11px">
              1. poll() returns batch, offset 5,012 is a JSON blob on an Avro topic<br>
              2. Avro deserializer throws <span style="color:#EF4444">SerializationException</span> inside poll()<br>
              3. Offset 5,012 was never committed → not advanced<br>
              4. Next poll() returns the <span style="color:#EF4444">same</span> record 5,012<br>
              5. Throws again… forever. Partition lag climbs; everything behind 5,012 is blocked.
            </div>
          </div>
          <div>
            <div style="color:#10B981;font-weight:600;margin-bottom:8px">ErrorHandlingDeserializer + DLQ</div>
            <div style="background:#0A0E1A;border-radius:8px;padding:12px;color:#94A3B8;line-height:1.8;font-size:11px">
              1. Wrapper deserializer catches the parse failure<br>
              2. Hands your code a <span style="color:#10B981">marker</span> instead of throwing<br>
              3. You route the raw bytes to a <span style="color:#10B981">dead-letter topic</span><br>
              4. Commit past 5,012 and keep going<br>
              5. Partition flows; the bad record is quarantined for later inspection.
            </div>
          </div>
        </div>
      </div>

      <div style="background:#8B5CF612;border:1.5px solid #8B5CF644;border-radius:12px;padding:18px 22px">
        <div style="font-size:13px;font-weight:700;color:#8B5CF6;margin-bottom:10px">Why this is the consumer's CPU bottleneck</div>
        <div style="font-size:12.5px;color:#94A3B8;line-height:1.75">Because the broker ships bytes untouched (zero-copy), <b>all</b> the per-record CPU — decompression of the batch, then deserializing every record into an object, plus any schema lookups on first sight — lands in the consumer. When a consumer is "slow" and nobody can find the network bottleneck, it is almost always this: decompress + deserialize. It is also why compact, binary formats (Avro, Protobuf) and keeping <span style="${chip}">max.poll.records</span> sized to your CPU budget matter — the decode cost scales with records per poll, and if it pushes you past <span style="${chip}">max.poll.interval.ms</span> you get evicted mid-batch.</div>
      </div>

    </div>`;
}

/* ─────────────────────────────────────────────────────────────────────────
   TAB 5 — End-to-End Walkthrough
   ───────────────────────────────────────────────────────────────────────── */
function buildWalk(container) {
  const tab = container.querySelector('#tab-walk');
  tab.innerHTML = `
    <div class="scroll-content" style="max-width:920px;margin:0 auto">

      <div style="background:#111827;border:1px solid #3B82F6;border-radius:14px;padding:20px 24px;margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94A3B8;margin-bottom:8px">One record, end to end</div>
        <div style="font-size:18px;font-weight:800;color:#F1F5F9;margin-bottom:4px">Amazon's Fulfillment Service reads order AMZ-24601 off Partition 0</div>
        <div style="font-size:13px;color:#94A3B8">The producer put it at offset 847,231. Here is every stage on the read path — from bytes on a broker's disk to a warehouse pick-task created — and which config governs each.</div>
      </div>

      <div style="margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94A3B8;margin-bottom:14px">The consumer read path — 8 stages</div>
        ${[
          { n:'1', color:'#06B6D4', stage:'Background fetch (ahead of time)', desc:'While Fulfillment is still processing the previous batch, the Fetcher already has a FetchRequest in flight to Broker 1 for Partition 0, asking for data from offset 847,231 with fetch.min.bytes=64KB / fetch.max.wait.ms=500ms.' },
          { n:'2', color:'#10B981', stage:'Broker serves via sendfile()', desc:'The batch containing offset 847,231 is in Broker 1\'s page cache (written 3 seconds ago). The broker streams it straight from page cache to the socket with sendfile() — no heap copy, no deserialize. ~892 compressed bytes carrying 47 orders.' },
          { n:'3', color:'#F59E0B', stage:'Lands in the prefetch buffer', desc:'The compressed batch arrives at the consumer and sits in the in-memory fetch buffer. The Fetcher immediately pipelines the NEXT request so the pipe stays full. Fulfillment\'s code hasn\'t been involved yet.' },
          { n:'4', color:'#8B5CF6', stage:'poll() returns records', desc:'Fulfillment\'s loop calls poll(100ms). It decompresses the LZ4 batch and runs the Avro deserializer on each record (schema id 152, cached) — turning bytes back into OrderEvent objects. Returns up to max.poll.records=500; here, 47.' },
          { n:'5', color:'#3B82F6', stage:'Your code processes AMZ-24601', desc:'The handler reads {orderId:"AMZ-24601", product:"iPhone 15 Pro", warehouseId:"SEA-2"} and calls the Warehouse API to create a pick task. This is the only stage that is "business logic" — everything above is plumbing.' },
          { n:'6', color:'#10B981', stage:'Commit the offset', desc:'After the pick task is durably created, Fulfillment commits offset 847,232 (next to read) to __consumer_offsets via commitSync(). Commit AFTER the side effect = at-least-once: a crash before commit replays AMZ-24601, so the Warehouse API must be idempotent.' },
          { n:'7', color:'#06B6D4', stage:'Loop — poll() again', desc:'Back to the top of the while(running) loop. The next batch is already buffered (step 3 prefetched it), so this poll() returns almost instantly. The network round-trip was hidden behind steps 4–6.' },
          { n:'8', color:'#F59E0B', stage:'Lag stays near zero', desc:'Because fetch is pipelined and processing keeps up, Fulfillment\'s consumer lag (log-end-offset − committed-offset) hovers near 0. If the Warehouse API slows down, lag grows — the single clearest health metric for any consumer.' },
        ].map((t,i,arr) => `
          <div style="display:flex;gap:14px;margin-bottom:10px">
            <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:center">
              <div style="width:26px;height:26px;border-radius:50%;background:${t.color}22;border:1.5px solid ${t.color};color:${t.color};font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;margin-top:12px;flex-shrink:0">${t.n}</div>
              ${i < arr.length-1 ? `<div style="width:2px;flex:1;background:${t.color}33;min-height:18px"></div>` : ''}
            </div>
            <div style="flex:1;background:#111827;border:1px solid #1E293B;border-radius:10px;padding:12px 16px">
              <div style="font-size:12.5px;font-weight:700;color:${t.color};margin-bottom:4px">${t.stage}</div>
              <div style="font-size:12px;color:#94A3B8;line-height:1.65">${t.desc}</div>
            </div>
          </div>`).join('')}
      </div>

      <div style="background:#3B82F612;border:1.5px solid #3B82F644;border-radius:12px;padding:18px 22px">
        <div style="font-size:13px;font-weight:700;color:#3B82F6;margin-bottom:10px">The one-line summary to remember</div>
        <div style="font-size:13px;color:#CBD5E1;line-height:1.8">
          <b>Fetch is pipelined in the background; poll() drains a local buffer and does the decode; your code is the only business stage; the commit is what makes it durable.</b> Everything else — zero-copy, long-poll, prefetch — exists so that single consumer thread almost never waits on the network, and the commit strategy (covered in <span style="color:#F59E0B">Offsets → Commit Strategies</span>) is what decides whether a crash loses, duplicates, or exactly-once-processes AMZ-24601.
        </div>
      </div>

    </div>`;
}

/* ─────────────────────────────────────────────────────────────────────────
   TAB 6 — Real-World Consumers (Amazon fan-out)
   ───────────────────────────────────────────────────────────────────────── */
function buildUseCases(container) {
  const tab = container.querySelector('#tab-usecases');
  const chip = 'font-size:11px;color:#CBD5E1;background:#0A0E1A;padding:2px 6px;border-radius:5px;font-family:monospace';
  tab.innerHTML = `
    <div class="scroll-content" style="max-width:920px;margin:0 auto">

      <div style="background:#111827;border:1px solid #FF6900;border-radius:14px;padding:20px 24px;margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94A3B8;margin-bottom:8px">The system view — the fan-out</div>
        <div style="font-size:18px;font-weight:800;color:#F1F5F9;margin-bottom:6px">One <code>orders</code> event feeds six completely different consumers — at once</div>
        <div style="font-size:13px;color:#94A3B8;line-height:1.6">The M08 tab answered <i>"what is a consumer?"</i>. This answers <i>"in a real Amazon system, who all consumes the same stream, and why does each one pick a different consumer style and commit strategy?"</i> Same bytes, same FetchRequest protocol, same partitions — but six wildly different latency, ordering, and durability needs. That difference is the whole point of Kafka's fan-out.</div>
      </div>

      <!-- fan-out SVG -->
      <div style="background:#0A0E1A;border:1px solid #1E293B;border-radius:12px;padding:18px;margin-bottom:10px">
        <svg viewBox="0 0 860 300" style="width:100%;height:auto" role="img" aria-label="One orders topic read independently by six consumer groups, each at its own offset.">
          <rect x="20" y="120" width="150" height="60" rx="10" fill="#111827" stroke="#FF6900"/>
          <text x="95" y="146" fill="#FF6900" font-size="13" font-weight="700" text-anchor="middle" font-family="system-ui">orders topic</text>
          <text x="95" y="164" fill="#8A98AE" font-size="9" text-anchor="middle" font-family="system-ui">6 partitions</text>
          ${[
            {y:20,  c:'#10B981', t:'Fulfillment'},
            {y:66,  c:'#8B5CF6', t:'Fraud (Flink)'},
            {y:112, c:'#EC4899', t:'Notifications'},
            {y:158, c:'#F59E0B', t:'Analytics (Connect)'},
            {y:204, c:'#3B82F6', t:'Recommendations'},
            {y:250, c:'#06B6D4', t:'Inventory'},
          ].map(g => `
            <line x1="170" y1="150" x2="560" y2="${g.y+20}" stroke="${g.c}66" stroke-width="1.5"/>
            <rect x="560" y="${g.y}" width="280" height="40" rx="8" fill="#111827" stroke="${g.c}"/>
            <text x="574" y="${g.y+25}" fill="${g.c}" font-size="11" font-weight="700" font-family="system-ui">${g.t}</text>
            <text x="826" y="${g.y+25}" fill="#8A98AE" font-size="8.5" text-anchor="end" font-family="monospace">own group · own offset</text>
          `).join('')}
        </svg>
      </div>
      <div style="font-size:11px;color:#64748B;text-align:center;margin-bottom:28px">Each group tracks its <b>own</b> committed offset in <span style="${chip}">__consumer_offsets</span>, so a slow analytics backfill never holds up real-time fulfillment. Adding a group is cheap — it just re-reads the same page-cache pages via sendfile().</div>

      <!-- per use-case cards -->
      <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94A3B8;margin-bottom:14px">Who consumes it — and why each chooses what it does</div>
      <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:28px">
        ${[
          { t:'Fulfillment — create pick tasks', c:'#10B981', style:'Stateless microservice (plain KafkaConsumer, 6 pods = 6 partitions)',
            why:'Needs per-customer ordering (process order #1 before #2) and zero loss. Commits <span style="'+chip+'">sync after</span> the Warehouse API call + idempotent writes → at-least-once. Low lag is a hard SLA; scale pods to partitions.' },
          { t:'Fraud detection — score each order', c:'#8B5CF6', style:'Apache Flink (stateful, windowed)',
            why:'Needs stateful windows ("5 orders from a new card in 2 min") and exactly-once. Its source operator <i>contains</i> a KafkaConsumer, but offsets live in Flink <span style="'+chip+'">checkpoints</span>, not auto-commit — the whole job (state + offset) commits atomically or rolls back.' },
          { t:'Notifications — send "order shipped"', c:'#EC4899', style:'Stateless microservice, async commit',
            why:'A duplicate email is annoying, not catastrophic, and a missed one is recoverable. Optimises for throughput: <span style="'+chip+'">commitAsync()</span>, high max.poll.records. Loss-tolerant, so it trades durability for speed — the opposite of fulfillment.' },
          { t:'Analytics / lakehouse — land in Iceberg', c:'#F59E0B', style:'Kafka Connect S3/Iceberg sink (managed consumer)',
            why:'No custom code — Connect <i>is</i> a managed consumer; its tasks are consumers in a group. Batches thousands of records, writes a file, <span style="'+chip+'">then</span> commits (flush-then-commit). Lag of minutes is fine; it optimises for big columnar writes, not latency.' },
          { t:'Recommendations — update "bought together"', c:'#3B82F6', style:'Kafka Streams (local state store)',
            why:'Maintains aggregates keyed by product in a local RocksDB state store, backed by a changelog topic. Streams manages offsets + state together. Reads the same stream as everyone else, builds a totally different materialized view.' },
          { t:'Inventory — decrement stock', c:'#06B6D4', style:'Microservice, transactional (EOS) or sync+idempotent',
            why:'Double-decrementing oversells; losing a decrement oversells too. Either reads-process-writes inside a Kafka transaction (exactly-once within the cluster) or commits sync after an idempotent DB upsert. Correctness over throughput.' },
        ].map(x => `
          <div style="background:#111827;border:1px solid #1E293B;border-left:3px solid ${x.c};border-radius:10px;padding:14px 18px">
            <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;margin-bottom:6px">
              <div style="font-size:12.5px;font-weight:700;color:${x.c}">${x.t}</div>
              <div style="font-size:10.5px;color:#CBD5E1;background:#0A0E1A;padding:2px 8px;border-radius:5px">${x.style}</div>
            </div>
            <div style="font-size:12px;color:#94A3B8;line-height:1.65">${x.why}</div>
          </div>`).join('')}
      </div>

      <!-- key insight -->
      <div style="background:linear-gradient(135deg,#FF690018,#8B5CF618);border:1.5px solid #FF690055;border-radius:12px;padding:20px 24px">
        <div style="font-size:14px;font-weight:800;color:#F1F5F9;margin-bottom:10px">🔑 The insight: the protocol is identical, the design is not</div>
        <div style="font-size:12.5px;color:#CBD5E1;line-height:1.8">
          All six send the same <span style="${chip}">FetchRequest</span>, get bytes via the same <span style="${chip}">sendfile()</span>, run the same poll loop. What differs is <b>the code wrapped around the loop</b> (plain service vs. Flink vs. Connect vs. Streams) and <b>who owns the offset</b> (auto-commit vs. checkpoint vs. flush-then-commit vs. transaction). Those two choices follow directly from one question per consumer: <i>what does this workload need — ordering? exactly-once? throughput? low latency?</i> Get that straight and you can design, or interview about, any consumer in any system. From here, the natural next stops are <span style="color:#8B5CF6">Consumer Groups</span> (how partitions get assigned) and <span style="color:#F59E0B">Offsets → Commit Strategies</span> (how each of these commits safely).
        </div>
      </div>

    </div>`;
}
