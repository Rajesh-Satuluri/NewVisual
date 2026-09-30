import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { SegmentFill } from '../components/canvas-primitives.js';

const IQ = [
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
    ctx.fillStyle = '#475569';
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
    ctx.fillStyle = '#64748B';
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
        <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#64748B;margin-bottom:8px">Inside Broker 1</div>
        <div style="font-size:18px;font-weight:800;color:#F1F5F9;margin-bottom:4px">What's actually on disk when your order hits Kafka</div>
        <div style="font-size:13px;color:#94A3B8">Broker 1 is the leader for <code style="background:#0A0E1A;color:#FF6900;padding:1px 5px;border-radius:3px">orders-P0</code>. Every Buy Now from US-West customers lands here. Here's what the broker does with your order event.</div>
      </div>

      <!-- Physical disk layout -->
      <div style="margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748B;margin-bottom:14px">What's on disk — /var/kafka/orders-0/</div>
        <div style="background:#111827;border:1px solid #1E293B;border-radius:12px;padding:18px 22px">
          <div style="font-family:monospace;font-size:12px;color:#94A3B8;line-height:2">
            <div style="color:#475569;margin-bottom:8px"># Sealed segments (immutable, eligible for retention cleanup after 7 days)</div>
            <div><span style="color:#3B82F6">00000000000000000000.log</span>&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#475569">1.0 GB</span>&nbsp;&nbsp;&nbsp;<span style="color:#64748B">offsets 0 – 11,999,999 &nbsp; (first 12M orders ever)</span></div>
            <div><span style="color:#3B82F6">00000000000000000000.index</span>&nbsp;&nbsp;<span style="color:#475569">2.1 MB</span>&nbsp;&nbsp;&nbsp;<span style="color:#64748B">sparse offset→byte map, one entry per ~4KB</span></div>
            <div><span style="color:#3B82F6">00000000000000000000.timeindex</span>&nbsp;<span style="color:#475569">1.8 MB</span>&nbsp;&nbsp;&nbsp;<span style="color:#64748B">timestamp→offset map for time-based seeks</span></div>
            <div style="margin-top:6px"><span style="color:#3B82F6">00000000012000000000.log</span>&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#475569">1.0 GB</span>&nbsp;&nbsp;&nbsp;<span style="color:#64748B">offsets 12,000,000 – 23,999,999 &nbsp; (sealed)</span></div>
            <div><span style="color:#3B82F6">00000000024000000000.log</span>&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#475569">1.0 GB</span>&nbsp;&nbsp;&nbsp;<span style="color:#64748B">offsets 24,000,000 – 35,999,999 &nbsp; (sealed)</span></div>
            <div style="color:#475569;margin-top:10px;margin-bottom:6px"># 70 more sealed segments…</div>
            <div style="margin-top:6px"><span style="color:#FF6900">00000000840000000000.log</span>&nbsp;&nbsp;&nbsp;&nbsp;<span style="color:#475569">384 MB</span>&nbsp;&nbsp;&nbsp;<span style="color:#FF6900">← ACTIVE &nbsp; offsets 840,000,000 – 847,231+ &nbsp; growing now</span></div>
            <div><span style="color:#FF6900">00000000840000000000.index</span>&nbsp;&nbsp;<span style="color:#475569">798 KB</span>&nbsp;&nbsp;&nbsp;<span style="color:#64748B">your order at offset 847,231 is indexed here</span></div>
          </div>
          <div style="margin-top:14px;padding:10px 14px;background:#0A0E1A;border-radius:8px;font-size:12px;color:#94A3B8;line-height:1.7">
            <strong style="color:#F59E0B">Segment rolling:</strong> At normal Amazon load (~800k orders/day through P0), a 1GB segment fills in <strong style="color:#F1F5F9">~8 hours</strong>. During Prime Day (3× traffic), the same segment fills in <strong style="color:#EF4444">~2.7 hours</strong>. The 7-day retention window means Broker 1 keeps ~21 GB of order history on disk per partition at all times.
          </div>
        </div>
      </div>

      <!-- Offset lookup -->
      <div style="margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748B;margin-bottom:14px">How Kafka finds your order in O(log n)</div>
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
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748B;margin-bottom:14px">Why the Fulfillment consumer almost never touches disk</div>
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
        <line x1="120" y1="68" x2="143" y2="68" stroke="#475569" stroke-width="1.5" marker-end="url(#aG)"/>
        <line x1="245" y1="68" x2="268" y2="68" stroke="#EF4444" stroke-width="1.5" marker-end="url(#aG)"/>
        <line x1="370" y1="68" x2="393" y2="68" stroke="#EF4444" stroke-width="1.5" marker-end="url(#aG)"/>
        <line x1="495" y1="68" x2="518" y2="68" stroke="#475569" stroke-width="1.5" marker-end="url(#aG)"/>
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
        <line x1="120" y1="188" x2="143" y2="188" stroke="#475569" stroke-width="1.5" marker-end="url(#aG)"/>
        <line x1="245" y1="188" x2="268" y2="188" stroke="#10B981" stroke-width="2" marker-end="url(#aG)"/>
        <line x1="370" y1="188" x2="393" y2="188" stroke="#475569" stroke-width="1.5" marker-end="url(#aG)"/>
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
            <path d="M0,0 L0,6 L8,3 z" fill="#475569"/>
          </marker>
        </defs>
      </svg>
    </div>`;
}
