import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { SegmentFill } from '../components/canvas-primitives.js';

export const IQ = [
  { q: 'How does Kafka use the OS page cache to achieve high throughput?', a: 'Kafka never maintains an in-process message cache. All data is written to and read from the OS page cache via regular file system calls. The OS handles caching and eviction with LRU. Kafka\'s log segments map directly to page-cached regions. When a consumer reads data that was just produced, it almost certainly comes from page cache (not disk), so the read is as fast as RAM. This design keeps Kafka brokers stateless with respect to cache and allows the JVM heap to stay small (<6GB).', tip: 'Say: "Kafka trusts the OS page cache rather than rolling its own — the OS is better at it, and it enables zero-copy reads."' },
  { q: 'What is the structure of a Kafka log segment?', a: 'Each partition is stored as a directory of log segments. A segment consists of: (1) .log — the actual message data (records appended sequentially). (2) .index — sparse offset-to-byte-offset index, one entry per ~4KB. (3) .timeindex — timestamp-to-offset index for time-based seeks. Active segment is the latest; older segments are sealed and eligible for retention cleanup. Segments are rolled on size (log.segment.bytes, default 1GB) or time (log.roll.ms).', tip: 'Know that Kafka can locate any offset in O(log n) using the binary search on the sparse .index file.' },
  { q: 'How does zero-copy I/O work in Kafka and why does it matter?', a: 'Without zero-copy, serving a fetch request involves: disk→kernel buffer→user space buffer→kernel socket buffer→NIC. That\'s 2 extra copies and 4 context switches. With sendfile() (Linux) or TransferTo (Java NIO), data goes disk→kernel buffer→NIC directly — 0 user-space copies, 2 context switches. For a 10Gbps NIC, this is the difference between saturating the link or not. Kafka\'s 2M msg/s throughput benchmarks depend on this.', tip: 'Mention that zero-copy only works for uncompressed data (or when the consumer and producer use the same compression codec). If Kafka must re-compress, it must copy to user space.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M05 · Core Internals',
    title: 'Broker Internals',
    subtitle: 'Log segments, page cache, zero-copy I/O — explained through Amazon\'s orders broker',
    tabs: [
      { id: 'segments',  label: '📁 Log Segments' },
      { id: 'pagecache', label: '🧠 Page Cache' },
      { id: 'amazon',    label: '📦 Amazon Broker' },
      { id: 'iq',        label: '🎯 Interview Q&A' },
    ]
  });

  let cleanup = buildSegments(container);
  buildPageCache(container);
  buildAmazon(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

function buildSegments(container) {
  const tab = container.querySelector('#tab-segments');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">A partition is physically a directory of <b>segment files</b> on disk. Grey segments are <b>sealed</b> (full, immutable); the orange one is <b>active</b> — the only file being written to right now. Press <b>Write Records</b> to fill it, then <b>Roll Segment</b> to seal it and open a new active segment. Each <code>.log</code> ships with a sparse <code>.index</code> and <code>.timeindex</code> sibling.</div>
      <canvas id="seg-canvas" width="820" height="320" style="width:100%;max-width:820px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="seg-write">✍️ Write Records</button>
        <button class="ctrl-btn" id="seg-roll">🔄 Roll Segment</button>
        <span class="ctrl-label">Watch segments fill and roll to new active segment</span>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>Each colored bar is a log segment — a fixed-size file on disk that holds a sequential slice of a partition's records. <strong>Sealed segments</strong> (grey) are full and immutable — no records will ever be appended to them again. The <strong>active segment</strong> (orange) is the only file Kafka writes to right now, with all new records appended sequentially to its end.</p>
      <p>When the active segment reaches <code>log.segment.bytes</code> (default 1 GB) or <code>log.roll.ms</code> time passes, it is sealed and a new active segment opens — click "Roll Segment" to trigger this. Alongside each <code>.log</code> data file, Kafka maintains a sparse <code>.index</code> file mapping offsets to byte positions. This index lets Kafka locate any offset in O(log n) via binary search, rather than scanning the entire log file sequentially.</p>
      <p>Sealed segments are eligible for retention cleanup: time-based retention deletes segments older than <code>log.retention.ms</code>; size-based deletes the oldest when total log size exceeds <code>log.retention.bytes</code>. Because records are only ever appended and never modified, Kafka's disk I/O pattern is entirely sequential — which is why a commodity spinning disk can sustain 200k+ records/sec and why the OS page cache almost never needs to seek.</p>
      <p><strong>Interview angle:</strong> be ready to explain the <em>offset lookup</em> — Kafka finds any record in O(log n) by binary-searching the sparse <code>.index</code> to the nearest indexed offset, then scanning forward at most one index interval (~4 KB). And be ready to connect segments to throughput: sequential appends plus <strong>zero-copy</strong> reads (<code>sendfile()</code> sends bytes straight from the page cache to the socket, skipping user space) are why one broker serves 2M+ messages/sec — the broker does almost no per-message work. The active segment is never eligible for retention or compaction, so the newest data is always safe regardless of policy.</p>
    </div>`;

  const canvas = tab.querySelector('#seg-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  const SEGS = [
    new SegmentFill({ x: 40,  y: 80, w: 160, h: 60, color: '#334155', label: 'seg-0 (sealed)' }),
    new SegmentFill({ x: 220, y: 80, w: 160, h: 60, color: '#334155', label: 'seg-1 (sealed)' }),
    new SegmentFill({ x: 400, y: 80, w: 160, h: 60, color: '#FF6900', label: 'seg-2 (active)' }),
  ];
  SEGS[0].fill = 1;
  SEGS[1].fill = 1;
  SEGS[2].fill = 0.3;

  let raf = null;
  let lastT = 0;

  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05);
    lastT = ts;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = 'bold 12px system-ui';
    ctx.fillStyle = '#94A3B8';
    ctx.textAlign = 'left';
    ctx.fillText('Partition 0 — /var/kafka/orders-0/', 40, 50);

    SEGS.forEach(s => s.draw(ctx));

    // Index files
    ctx.font = '9px system-ui';
    ctx.fillStyle = '#8A98AE';
    [40, 220, 400].forEach((x, i) => {
      ctx.fillText(`${['seg-0', 'seg-1', 'seg-2'][i]}.log`, x, 170);
      ctx.fillText(`${['seg-0', 'seg-1', 'seg-2'][i]}.index`, x, 183);
      ctx.fillText(`${['seg-0', 'seg-1', 'seg-2'][i]}.timeindex`, x, 196);
    });

    // Active label
    ctx.fillStyle = '#FF6900';
    ctx.font = 'bold 10px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('▲ ACTIVE', 480, 78);

    // Legend
    ctx.font = '11px system-ui';
    ctx.fillStyle = '#94A3B8';
    ctx.textAlign = 'left';
    ctx.fillText('New records always appended to active segment. Sealed segments are immutable.', 40, 230);
    ctx.fillText('Segment rolls at log.segment.bytes (1GB) or log.roll.ms (7 days).', 40, 248);
    ctx.fillText('Retention deletes/compacts oldest sealed segments first.', 40, 266);

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });

  tab.querySelector('#seg-write').addEventListener('click', () => {
    const active = SEGS[SEGS.length - 1];
    active.fill = Math.min(1, active.fill + 0.15);
  });

  tab.querySelector('#seg-roll').addEventListener('click', () => {
    const active = SEGS[SEGS.length - 1];
    active.fill = 1;
    active.color = '#334155';
    active.label = active.label.replace('active', 'sealed');
    const newX = active.x + 180;
    if (newX < 760) {
      SEGS.push(new SegmentFill({ x: newX, y: 80, w: 160, h: 60, color: '#FF6900', label: `seg-${SEGS.length} (active)` }));
    }
  });

  return () => { if (raf) cancelAnimationFrame(raf); };
}

function buildAmazon(container) {
  const tab = container.querySelector('#tab-amazon');
  tab.innerHTML = `
    <div class="scroll-content" style="max-width:920px;margin:0 auto">

      <!-- Hero -->
      <div style="background:#111827;border:1px solid #FF6900;border-radius:14px;padding:20px 24px;margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94A3B8;margin-bottom:8px">Inside Broker 1</div>
        <div style="font-size:18px;font-weight:800;color:#F1F5F9;margin-bottom:4px">What's actually on disk when your order hits Kafka</div>
        <div style="font-size:13px;color:#94A3B8">Broker 1 is the leader for <code style="background:#0A0E1A;color:#FF6900;padding:1px 5px;border-radius:3px">orders-P0</code>. Every Buy Now from US-West customers lands here. Here's what the broker does with your order event.</div>
      </div>

      <!-- Physical disk layout -->
      <div style="margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94A3B8;margin-bottom:14px">What's on disk — /var/kafka/orders-0/</div>
        <div style="background:#111827;border:1px solid #1E293B;border-radius:12px;padding:18px 22px">
          <div style="font-family:monospace;font-size:12px;color:#94A3B8;line-height:2">
            <div style="color:#8A98AE;margin-bottom:8px"># Sealed segments (immutable, eligible for retention cleanup after 7 days)</div>
            <div><span style="color:#3B82F6">00000000000000000000.log</span>&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#8A98AE">1.0 GB</span>&nbsp;&nbsp;&nbsp;<span style="color:#94A3B8">offsets 0 – 11,999,999 &nbsp; (first 12M orders ever)</span></div>
            <div><span style="color:#3B82F6">00000000000000000000.index</span>&nbsp;&nbsp;<span style="color:#8A98AE">2.1 MB</span>&nbsp;&nbsp;&nbsp;<span style="color:#94A3B8">sparse offset→byte map, one entry per ~4KB</span></div>
            <div><span style="color:#3B82F6">00000000000000000000.timeindex</span>&nbsp;<span style="color:#8A98AE">1.8 MB</span>&nbsp;&nbsp;&nbsp;<span style="color:#94A3B8">timestamp→offset map for time-based seeks</span></div>
            <div style="margin-top:6px"><span style="color:#3B82F6">00000000012000000000.log</span>&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#8A98AE">1.0 GB</span>&nbsp;&nbsp;&nbsp;<span style="color:#94A3B8">offsets 12,000,000 – 23,999,999 &nbsp; (sealed)</span></div>
            <div><span style="color:#3B82F6">00000000024000000000.log</span>&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#8A98AE">1.0 GB</span>&nbsp;&nbsp;&nbsp;<span style="color:#94A3B8">offsets 24,000,000 – 35,999,999 &nbsp; (sealed)</span></div>
            <div style="color:#8A98AE;margin-top:10px;margin-bottom:6px"># 70 more sealed segments…</div>
            <div style="margin-top:6px"><span style="color:#FF6900">00000000840000000000.log</span>&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#8A98AE">384 MB</span>&nbsp;&nbsp;&nbsp;<span style="color:#FF6900">← ACTIVE &nbsp; offsets 840,000,000 – 847,231+ &nbsp; growing now</span></div>
            <div><span style="color:#FF6900">00000000840000000000.index</span>&nbsp;&nbsp;<span style="color:#8A98AE">798 KB</span>&nbsp;&nbsp;&nbsp;<span style="color:#94A3B8">your order at offset 847,231 is indexed here</span></div>
          </div>
          <div style="margin-top:14px;padding:10px 14px;background:#0A0E1A;border-radius:8px;font-size:12px;color:#94A3B8;line-height:1.7">
            <strong style="color:#F59E0B">Segment rolling:</strong> At normal Amazon load (~800k orders/day through P0), a 1GB segment fills in <strong style="color:#F1F5F9">~8 hours</strong>. During Prime Day (3× traffic), the same segment fills in <strong style="color:#EF4444">~2.7 hours</strong>. The 7-day retention window means Broker 1 keeps ~21 GB of order history on disk per partition at all times.
          </div>
        </div>
      </div>

      <!-- Offset lookup -->
      <div style="margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94A3B8;margin-bottom:14px">How Kafka finds your order in O(log n)</div>
        <div style="background:#111827;border:1px solid #1E293B;border-radius:12px;padding:18px 22px">
          <p style="font-size:13px;color:#94A3B8;line-height:1.7;margin-bottom:16px">Fulfillment Service asks: "give me the record at offset 847,231." Kafka doesn't scan the entire 384MB active segment. Here's the lookup:</p>
          <div style="display:flex;flex-direction:column;gap:10px">
            ${
              [
                { n:'1', color:'#3B82F6', step:'Binary search on .index', detail:'The sparse index has one entry per ~4KB of .log data. Binary search finds: "offset 847,228 is at byte position 183,420,816". That\'s the closest indexed entry before 847,231.' },
                { n:'2', color:'#F59E0B', step:'Sequential scan (max 4KB)', detail:'Kafka reads from byte 183,420,816 forward. Within 4KB of sequential scan, it finds offset 847,231 at byte 183,421,440 — your iPhone 15 Pro order.' },
                { n:'3', color:'#10B981', step:'Zero-copy sendfile()',      detail:'The 148-byte record is sent directly from the OS page cache to the Fulfillment consumer\'s TCP socket — no copy to user space, no CPU involvement. The broker is transparent glass.' },
              ].map(s => `
              <div style="display:flex;gap:12px;align-items:flex-start">
                <div style="flex-shrink:0;width:24px;height:24px;border-radius:50%;background:${s.color}22;border:1.5px solid ${s.color};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:${s.color};margin-top:2px">${s.n}</div>
                <div style="flex:1;background:#0A0E1A;border-radius:8px;padding:10px 14px">
                  <div style="font-size:12px;font-weight:700;color:${s.color};margin-bottom:4px">${s.step}</div>
                  <div style="font-size:12px;color:#94A3B8;line-height:1.65">${s.detail}</div>
                </div>
              </div>`).join('')}
          </div>
        </div>
      </div>

      <!-- Page cache hit rate -->
      <div style="margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94A3B8;margin-bottom:14px">Why the Fulfillment consumer almost never touches disk</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <div style="background:#111827;border:1px solid #1E293B;border-radius:12px;padding:16px 20px">
            <div style="font-size:13px;font-weight:700;color:#10B981;margin-bottom:8px">Page cache hit rate: ~99.7%</div>
            <div style="font-size:12px;color:#94A3B8;line-height:1.7">Fulfillment Service reads orders about 10 seconds after they're written. Those records are almost certainly still in the OS page cache — the same RAM the broker used to write them. The "disk read" is actually a RAM read. This is why Kafka needs no JVM heap cache of its own.</div>
          </div>
          <div style="background:#111827;border:1px solid #1E293B;border-radius:12px;padding:16px 20px">
            <div style="font-size:13px;font-weight:700;color:#06B6D4;margin-bottom:8px">Analytics consumer: cache miss</div>
            <div style="font-size:12px;color:#94A3B8;line-height:1.7">The analytics consumer reads 3-day-old records to backfill dashboards — those pages were evicted from cache long ago. This triggers actual disk reads. That's OK: analytics has no SLA. Prime Day sales dashboard rebuilding from disk doesn't block anyone's order processing.</div>
          </div>
        </div>
      </div>

      <!-- Theory: append-only + OS cache -->
      <div style="margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94A3B8;margin-bottom:14px">The mental model — the broker is an append-only file, and the OS is the cache</div>
        <div style="background:#111827;border:1px solid #1E293B;border-radius:12px;padding:18px 22px;font-size:12.5px;color:#94A3B8;line-height:1.75">
          <p style="margin:0 0 14px">Every write is an <strong style="color:#E2E8F0">append to the end of the active segment</strong> — never an in-place update, never a random seek. Sequential disk throughput runs into the hundreds of MB/s even on spinning disks, one to two orders of magnitude faster than random I/O, so by only ever appending, Kafka turns "writing to disk" into the one thing disks are genuinely fast at. The log is also <strong style="color:#E2E8F0">immutable</strong>: a record, once written, is never modified — which is why there are no row locks, no in-place fragmentation, and why replication and retention reduce to "copy a byte range" and "delete a file."</p>
          <p style="margin:0 0 14px">When Fulfillment reads offset 847,231, the broker calls <code style="font-size:11px;color:#CBD5E1;background:#0A0E1A;padding:2px 6px;border-radius:5px">sendfile()</code> and the kernel streams bytes <strong style="color:#E2E8F0">straight from the page cache to the network socket</strong> — never copying them into the broker's Java heap and back. A naive server does four copies and two context switches per read; zero-copy does it with none in user space. That is why a broker's CPU barely moves while it serves millions of reads a second — it is, as the note below puts it, transparent glass.</p>
          <p style="margin:0">Kafka keeps a deliberately <strong style="color:#E2E8F0">small JVM heap</strong> (often 5–6 GB even on a 64 GB box) and hands the rest of RAM to the OS page cache. Recent reads are served from that cache — the same RAM the write just populated — so a "disk read" is usually a RAM read, and Kafka needs no cache of its own inside the heap. Because the page cache lives in kernel memory, it <strong style="color:#E2E8F0">survives a broker process restart</strong>: a bounced broker comes back with a warm cache, where an in-heap cache would start cold.</p>
        </div>
      </div>

      <!-- Where the model breaks -->
      <div style="margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94A3B8;margin-bottom:14px">Where the fast path breaks down</div>
        <div style="background:#111827;border:1px solid #1E293B;border-left:3px solid #F59E0B;border-radius:10px;padding:14px 18px;font-size:12px;color:#94A3B8;line-height:1.7">
          Two things turn this fast path slow. <strong style="color:#F59E0B">Too many partitions on one broker:</strong> each partition is its own set of files with its own append point, so thousands of them fragment the single sequential write into many scattered ones and multiply open file handles and failover time. <strong style="color:#F59E0B">Consumers reading old data:</strong> a backfill of week-old records is a guaranteed page-cache miss, pulling cold pages off disk and competing with live writes for I/O. This is exactly why Amazon keeps the latency-sensitive Fulfillment consumer and the throughput-only Analytics consumer apart — so the second can never starve the first.
        </div>
      </div>

      <!-- Key insight callout -->
      <div style="background:#10B98112;border:1.5px solid #10B98133;border-radius:12px;padding:16px 20px;font-size:13px;color:#94A3B8;line-height:1.7">
        💡 <strong style="color:#10B981">The broker does almost nothing.</strong> It appends bytes to a file (sequential write — fastest possible disk operation), indexes them, and later reads them via sendfile (zero user-space copies). There's no message parsing, no routing logic, no per-message overhead. This is why a single commodity server can handle 2 million messages per second. Kafka's performance isn't clever — it's just refusing to do unnecessary work.
      </div>

    </div>`;
}

function buildPageCache(container) {
  const tab = container.querySelector('#tab-pagecache');
  tab.innerHTML = `
    <div class="svg-wrap">
      <svg viewBox="0 0 760 360" width="760" height="360" style="font-family:system-ui">
        <!-- Without zero-copy -->
        <text x="160" y="30" text-anchor="middle" fill="#EF4444" font-size="12" font-weight="700">Without Zero-Copy (4 copies)</text>
        <rect x="20" y="50" width="100" height="36" rx="6" fill="#1E293B" stroke="#334155"/>
        <text x="70" y="73" text-anchor="middle" fill="#94A3B8" font-size="10">Disk</text>
        <rect x="145" y="50" width="100" height="36" rx="6" fill="#1E293B" stroke="#334155"/>
        <text x="195" y="73" text-anchor="middle" fill="#94A3B8" font-size="10">Kernel Buffer</text>
        <rect x="270" y="50" width="100" height="36" rx="6" fill="#1E293B" stroke="#EF4444"/>
        <text x="320" y="67" text-anchor="middle" fill="#EF4444" font-size="10">User Space</text>
        <text x="320" y="80" text-anchor="middle" fill="#EF4444" font-size="9">Buffer</text>
        <rect x="395" y="50" width="100" height="36" rx="6" fill="#1E293B" stroke="#334155"/>
        <text x="445" y="73" text-anchor="middle" fill="#94A3B8" font-size="10">Socket Buffer</text>
        <rect x="520" y="50" width="100" height="36" rx="6" fill="#1E293B" stroke="#334155"/>
        <text x="570" y="73" text-anchor="middle" fill="#94A3B8" font-size="10">NIC</text>
        <line x1="120" y1="68" x2="143" y2="68" stroke="#8A98AE" stroke-width="1.5" marker-end="url(#aG)"/>
        <line x1="245" y1="68" x2="268" y2="68" stroke="#EF4444" stroke-width="1.5" marker-end="url(#aG)"/>
        <line x1="370" y1="68" x2="393" y2="68" stroke="#EF4444" stroke-width="1.5" marker-end="url(#aG)"/>
        <line x1="495" y1="68" x2="518" y2="68" stroke="#8A98AE" stroke-width="1.5" marker-end="url(#aG)"/>
        <text x="257" y="44" fill="#EF4444" font-size="9">copy</text>
        <text x="382" y="44" fill="#EF4444" font-size="9">copy</text>

        <!-- With zero-copy -->
        <text x="200" y="150" text-anchor="middle" fill="#10B981" font-size="12" font-weight="700">With Zero-Copy / sendfile() (2 copies)</text>
        <rect x="20" y="170" width="100" height="36" rx="6" fill="#1E293B" stroke="#334155"/>
        <text x="70" y="193" text-anchor="middle" fill="#94A3B8" font-size="10">Disk</text>
        <rect x="145" y="170" width="100" height="36" rx="6" fill="#1E293B" stroke="#10B981"/>
        <text x="195" y="193" text-anchor="middle" fill="#10B981" font-size="10">Page Cache</text>
        <rect x="270" y="170" width="100" height="36" rx="6" fill="#1E293B" stroke="#334155"/>
        <text x="320" y="193" text-anchor="middle" fill="#94A3B8" font-size="10">Socket Buffer</text>
        <rect x="395" y="170" width="100" height="36" rx="6" fill="#1E293B" stroke="#334155"/>
        <text x="445" y="193" text-anchor="middle" fill="#94A3B8" font-size="10">NIC</text>
        <line x1="120" y1="188" x2="143" y2="188" stroke="#8A98AE" stroke-width="1.5" marker-end="url(#aG)"/>
        <line x1="245" y1="188" x2="268" y2="188" stroke="#10B981" stroke-width="2" marker-end="url(#aG)"/>
        <line x1="370" y1="188" x2="393" y2="188" stroke="#8A98AE" stroke-width="1.5" marker-end="url(#aG)"/>
        <text x="250" y="163" fill="#10B981" font-size="9">DMA copy</text>
        <text x="680" y="188" fill="#10B981" font-size="10">✓ Skip</text>
        <text x="680" y="200" fill="#10B981" font-size="9">user space</text>

        <!-- Stats -->
        <rect x="20" y="260" width="200" height="80" rx="8" fill="#1E293B" stroke="#EF4444" stroke-width="1.5"/>
        <text x="120" y="284" text-anchor="middle" fill="#EF4444" font-weight="700" font-size="11">Traditional Copy</text>
        <text x="120" y="302" text-anchor="middle" fill="#94A3B8" font-size="10">4 data copies</text>
        <text x="120" y="317" text-anchor="middle" fill="#94A3B8" font-size="10">4 context switches</text>
        <text x="120" y="332" text-anchor="middle" fill="#EF4444" font-size="10">CPU overhead: HIGH</text>

        <rect x="240" y="260" width="200" height="80" rx="8" fill="#1E293B" stroke="#10B981" stroke-width="1.5"/>
        <text x="340" y="284" text-anchor="middle" fill="#10B981" font-weight="700" font-size="11">Zero-Copy (sendfile)</text>
        <text x="340" y="302" text-anchor="middle" fill="#94A3B8" font-size="10">2 DMA copies</text>
        <text x="340" y="317" text-anchor="middle" fill="#94A3B8" font-size="10">2 context switches</text>
        <text x="340" y="332" text-anchor="middle" fill="#10B981" font-size="10">CPU overhead: LOW</text>

        <rect x="460" y="260" width="200" height="80" rx="8" fill="#1E293B" stroke="#FF6900" stroke-width="1.5"/>
        <text x="560" y="284" text-anchor="middle" fill="#FF6900" font-weight="700" font-size="11">Kafka Result</text>
        <text x="560" y="302" text-anchor="middle" fill="#94A3B8" font-size="10">2M+ msgs/sec per broker</text>
        <text x="560" y="317" text-anchor="middle" fill="#94A3B8" font-size="10">Network is bottleneck</text>
        <text x="560" y="332" text-anchor="middle" fill="#10B981" font-size="10">(not CPU or disk)</text>

        <defs>
          <marker id="aG" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#8A98AE"/>
          </marker>
        </defs>
      </svg>
    </div>

    <!-- What the page cache actually is -->
    <div style="margin-top:8px;margin-bottom:28px">
      <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94A3B8;margin-bottom:14px">What the page cache actually is</div>
      <div style="background:#111827;border:1px solid #1E293B;border-radius:12px;padding:18px 22px;font-size:12.5px;color:#94A3B8;line-height:1.75">
        <p style="margin:0 0 14px">The <strong style="color:#E2E8F0">page cache</strong> is not a Kafka feature — it is a part of the Linux kernel. Whenever any process reads or writes a file, the OS keeps those 4KB chunks (<em>pages</em>) of the file in otherwise-free RAM, so the next access to the same bytes is served from memory instead of disk. Kafka's entire I/O design is built on handing this job to the kernel rather than reinventing it inside the JVM.</p>
        <p style="margin:0 0 14px">When Broker 1 appends your iPhone 15 Pro order to the active segment, it doesn't force the bytes to the physical platter and wait. It writes into the page cache and returns immediately; the kernel flushes those <em>dirty pages</em> to disk in the background. So a "write to disk" is really a <strong style="color:#E2E8F0">write to RAM</strong> that the OS persists later — which is why a single broker sustains millions of appends per second.</p>
        <p style="margin:0">A few seconds later the Fulfillment Service reads that same offset. The page is <strong style="color:#E2E8F0">still in the cache</strong> — the exact RAM the write just populated — so the read never touches the disk at all. Write-populates-cache, read-hits-cache: the same pages serve both sides, and the disk is only ever touched lazily in the background.</p>
      </div>
    </div>

    <!-- Reading the diagram: why zero-copy needs the cache -->
    <div style="margin-bottom:28px">
      <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94A3B8;margin-bottom:14px">Reading the diagram — why zero-copy depends on the cache</div>
      <div style="background:#111827;border:1px solid #1E293B;border-radius:12px;padding:18px 22px;font-size:12.5px;color:#94A3B8;line-height:1.75">
        <p style="margin:0 0 14px">In the <strong style="color:#EF4444">traditional path</strong> (top row), serving one record copies it four times — disk → kernel buffer → the broker's user-space (Java heap) buffer → socket buffer → NIC — and crosses the user/kernel boundary on every hop. The broker's CPU is busy shovelling bytes it never even looks at.</p>
        <p style="margin:0 0 14px">In the <strong style="color:#10B981">zero-copy path</strong> (bottom row), the broker calls <code style="font-size:11px;color:#CBD5E1;background:#0A0E1A;padding:2px 6px;border-radius:5px">sendfile()</code> and the kernel streams the bytes <strong style="color:#E2E8F0">straight from the page cache into the socket</strong>, skipping the user-space buffer entirely. The data never enters the JVM heap, so there is nothing to garbage-collect and the CPU barely moves. This only works because the records are <em>already sitting in the page cache</em> — zero-copy and the page cache are two halves of the same trick.</p>
        <p style="margin:0">That is the real meaning of "the broker is transparent glass": on the hot path it parses nothing, caches nothing in its own heap, and routes nothing — it just points the kernel at a byte range and lets the hardware do the transfer.</p>
      </div>
    </div>

    <!-- Hit vs miss, and the small-heap trade-off -->
    <div style="margin-bottom:28px">
      <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94A3B8;margin-bottom:14px">Cache hit vs. miss — and why Kafka keeps a tiny heap</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
        <div style="background:#111827;border:1px solid #1E293B;border-radius:12px;padding:16px 20px">
          <div style="font-size:13px;font-weight:700;color:#10B981;margin-bottom:8px">Hit — the common case (~99.7%)</div>
          <div style="font-size:12px;color:#94A3B8;line-height:1.7">Fulfillment reads records seconds after they're written. Those pages are still resident, so the read is a RAM read served by <code style="font-size:11px;color:#CBD5E1;background:#0A0E1A;padding:2px 5px;border-radius:5px">sendfile()</code> with no disk seek. This is the path almost every live consumer takes.</div>
        </div>
        <div style="background:#111827;border:1px solid #1E293B;border-radius:12px;padding:16px 20px">
          <div style="font-size:13px;font-weight:700;color:#06B6D4;margin-bottom:8px">Miss — the cold case</div>
          <div style="font-size:12px;color:#94A3B8;line-height:1.7">The Analytics consumer backfills 3-day-old records whose pages were evicted long ago. That forces a real disk read and competes with live writes for I/O — which is exactly why Amazon isolates the latency-sensitive Fulfillment consumer from the throughput-only Analytics one.</div>
        </div>
      </div>
      <div style="background:#111827;border:1px solid #1E293B;border-radius:12px;padding:16px 20px;font-size:12.5px;color:#94A3B8;line-height:1.75">
        <p style="margin:0 0 12px">Because the kernel is doing the caching, Kafka deliberately runs a <strong style="color:#E2E8F0">small JVM heap</strong> — often just 5–6 GB even on a 64 GB broker — and hands the other ~58 GB to the OS for the page cache. Caching inside the heap would be counter-productive: it would double-store the same bytes (once in the heap, once in the kernel cache) and hand the garbage collector tens of gigabytes to scan.</p>
        <p style="margin:0">The page cache lives in kernel memory, so it also <strong style="color:#E2E8F0">survives a broker process restart</strong>. A bounced broker comes back to a <em>warm</em> cache and keeps serving reads from RAM, where an in-heap cache would restart stone cold and hammer the disk until it refilled.</p>
      </div>
    </div>

    <!-- Worked example: a real cluster -->
    <div style="margin-bottom:28px">
      <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94A3B8;margin-bottom:14px">A real cluster — watch the page cache actually happen</div>
      <div style="background:#111827;border:1px solid #1E293B;border-radius:12px;padding:18px 22px;font-size:12.5px;color:#94A3B8;line-height:1.75">
        <p style="margin:0 0 16px">Abstractions get slippery without numbers, so here is a concrete Amazon-scale <code style="font-size:11px;color:#CBD5E1;background:#0A0E1A;padding:2px 6px;border-radius:5px">orders</code> cluster. Every claim below is just arithmetic on these specs — no Kafka magic.</p>

        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:18px">
          <div style="background:#0A0E1A;border:1px solid #1E293B;border-radius:9px;padding:12px 14px">
            <div style="font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#64748B;margin-bottom:6px">Hardware — per broker</div>
            <div style="font-size:12px;color:#CBD5E1;line-height:1.8">6 × AWS <strong style="color:#E2E8F0">i3en.2xlarge</strong><br>8 vCPU · <strong style="color:#E2E8F0">64 GB RAM</strong> · 25 Gbps NIC<br>2 × 2.5 TB local NVMe SSD</div>
          </div>
          <div style="background:#0A0E1A;border:1px solid #1E293B;border-radius:9px;padding:12px 14px">
            <div style="font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#64748B;margin-bottom:6px">Memory split</div>
            <div style="font-size:12px;color:#CBD5E1;line-height:1.8">JVM heap: <strong style="color:#E2E8F0">6 GB</strong><br>OS + overhead: ~3 GB<br>Free for <strong style="color:#10B981">page cache: ~55 GB</strong></div>
          </div>
          <div style="background:#0A0E1A;border:1px solid #1E293B;border-radius:9px;padding:12px 14px">
            <div style="font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#64748B;margin-bottom:6px">Topic + load (Prime Day peak)</div>
            <div style="font-size:12px;color:#CBD5E1;line-height:1.8">36 partitions · RF 3 · lz4<br>~1 KB/record · <strong style="color:#E2E8F0">500 MB/s</strong> written per broker</div>
          </div>
          <div style="background:#0A0E1A;border:1px solid #1E293B;border-radius:9px;padding:12px 14px">
            <div style="font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#64748B;margin-bottom:6px">Consumers</div>
            <div style="font-size:12px;color:#CBD5E1;line-height:1.8"><span style="color:#10B981">Fulfillment</span> — lags ~10 s<br><span style="color:#06B6D4">Analytics</span> — backfills hours/days</div>
          </div>
        </div>

        <p style="margin:0 0 6px;color:#E2E8F0;font-weight:700;font-size:12px">① The write (a producer appends an order)</p>
        <p style="margin:0 0 16px">The broker's <code style="font-size:11px;color:#CBD5E1;background:#0A0E1A;padding:2px 6px;border-radius:5px">write()</code> to the active segment file returns in <strong style="color:#E2E8F0">microseconds</strong> — it only copied ~1 KB into a page cache page and marked that page <em>dirty</em>. No platter was touched. The kernel's flusher threads write dirty pages to NVMe in the background, governed by <code style="font-size:11px;color:#CBD5E1;background:#0A0E1A;padding:2px 6px;border-radius:5px">vm.dirty_background_ratio</code> (start flushing at ~N% dirty) and <code style="font-size:11px;color:#CBD5E1;background:#0A0E1A;padding:2px 6px;border-radius:5px">vm.dirty_ratio</code> (block writers if dirty pages pile up too high). At 500 MB/s the SSD keeps up easily, so dirty pages rarely accumulate — the write path never stalls.</p>

        <p style="margin:0 0 6px;color:#E2E8F0;font-weight:700;font-size:12px">② The cache horizon — the one number that explains everything</p>
        <p style="margin:0 0 10px">How long does a record stay in RAM before the kernel evicts it to make room for newer writes? It's just capacity ÷ rate:</p>
        <div style="background:#0A0E1A;border:1px solid #10B98144;border-radius:9px;padding:14px 16px;margin-bottom:12px;font-family:ui-monospace,monospace;font-size:12px;color:#CBD5E1;line-height:1.9">
          cache horizon ≈ page cache size ÷ write rate<br>
          &nbsp;&nbsp;= 55 GB ÷ 500 MB/s<br>
          &nbsp;&nbsp;≈ <strong style="color:#10B981">110 seconds</strong> of the newest data lives in RAM
        </div>
        <p style="margin:0 0 16px">So <strong style="color:#E2E8F0">any consumer lagging under ~110 seconds is a guaranteed cache hit</strong> — its reads never touch disk. Fulfillment, lagging ~10 s, sits comfortably inside the window: that's the <strong style="color:#10B981">~99.7% hit rate</strong>. Note the direction: a <em>bigger</em> write rate <em>shrinks</em> the window, so the busier the cluster gets, the shorter the span a lagging consumer can afford before it falls to disk.</p>

        <p style="margin:0 0 6px;color:#E2E8F0;font-weight:700;font-size:12px">③ The read (Fulfillment fetches offset 847,231)</p>
        <p style="margin:0 0 16px">The record was written 10 s ago — well inside the 110 s horizon — so its page is still resident. The broker issues <code style="font-size:11px;color:#CBD5E1;background:#0A0E1A;padding:2px 6px;border-radius:5px">sendfile()</code> and the kernel DMA-streams those bytes from the page cache straight to the NIC. Zero user-space copies, no JVM heap allocation, no disk seek. The 25 Gbps network — not the CPU and not the SSD — is the ceiling.</p>

        <p style="margin:0 0 6px;color:#06B6D4;font-weight:700;font-size:12px">④ The miss (Analytics backfills 3-day-old orders)</p>
        <p style="margin:0">Those pages were evicted ~110 s after they were written, three days ago. The fetch now triggers a <strong style="color:#E2E8F0">real NVMe read</strong>, and — worse — the kernel pulls those cold pages <em>into</em> the cache, evicting hot pages the live consumers were using. One greedy backfill can quietly cool the cache for everyone, which is exactly why Amazon runs Analytics on a separate consumer (often a separate set of follower-fetch or tiered-storage brokers) so its cold reads never evict Fulfillment's hot pages.</p>
      </div>
    </div>

    <!-- Key takeaway -->
    <div style="background:#10B98112;border:1.5px solid #10B98133;border-radius:12px;padding:16px 20px;font-size:13px;color:#94A3B8;line-height:1.7">
      💡 <strong style="color:#10B981">Kafka's speed is borrowed, not built.</strong> It doesn't implement a cache, a buffer pool, or a read-ahead engine — it lets the Linux page cache do all three, then uses <code style="font-size:11px;color:#CBD5E1;background:#0A0E1A;padding:2px 6px;border-radius:5px">sendfile()</code> to move bytes from that cache to the network without ever touching user space. The write warms the cache; the read drains it; the disk is just the backing store the kernel flushes to in the background.
    </div>`;
}
