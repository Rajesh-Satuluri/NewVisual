import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

const LATENCY_LEVELS = [
  { label: 'L1 Cache',          ns: 0.4,       color: '#4F46E5', desc: 'CPU L1 cache (32–64 KB). ~0.4 ns. A hot register or tight-loop variable. Essentially free — never a bottleneck.' },
  { label: 'L2 Cache',          ns: 4,         color: '#818CF8', desc: 'CPU L2 cache (256 KB – 1 MB). ~4 ns. Frequently-used data structures, hot loop values. 10× slower than L1.' },
  { label: 'L3 Cache',          ns: 40,        color: '#06B6D4', desc: 'CPU L3 cache (8–64 MB, shared across cores). ~40 ns. Critical database structures: frequently accessed index nodes, hot buffer descriptors.' },
  { label: 'DRAM (buffer pool)',ns: 80,        color: '#10B981', desc: 'Main memory. ~80 ns. PostgreSQL shared_buffers, OS page cache. Hot database pages live here. Target: >99% of page requests served from DRAM.' },
  { label: 'NVMe SSD',          ns: 100_000,   color: '#F59E0B', desc: 'NVMe SSD random read. ~0.1 ms = 100 μs. 1,250× slower than DRAM. A 1% buffer miss rate with 1M QPS = 10K disk reads/sec — NVMe handles this but it adds latency.' },
  { label: 'SATA SSD',          ns: 300_000,   color: '#EF4444', desc: 'SATA SSD random read. ~0.3 ms. Common in older cloud instances. 3,750× slower than DRAM. Sustained random I/O saturates at ~100K IOPS.' },
  { label: 'HDD (7200 RPM)',    ns: 8_000_000, color: '#7F1D1D', desc: 'HDD random read: seek (~4 ms) + rotational latency (~4 ms) = ~8 ms. 100,000× slower than DRAM. One random read = 8M ns. Catastrophic for OLTP.' },
];

const IO_STEPS = LATENCY_LEVELS.map((lv, i) => ({ activeIdx: i, desc: lv.desc }));

function formatNs(ns) {
  if (ns < 1000) return `${ns} ns`;
  if (ns < 1_000_000) return `${(ns/1000).toFixed(1)} μs`;
  return `${(ns/1_000_000).toFixed(1)} ms`;
}

function drawLatency(ctx, stepIdx, w, h) {
  ctx.clearRect(0, 0, w, h);

  const maxLog = Math.log10(LATENCY_LEVELS[LATENCY_LEVELS.length - 1].ns);
  const barMaxW = w - 300;
  const rowH = (h - 60) / LATENCY_LEVELS.length;
  const startY = 30;

  ctx.fillStyle = '#64748B'; ctx.font = '700 10px system-ui';
  ctx.fillText('Storage Latency Hierarchy (log scale)', 20, 20);
  ctx.fillStyle = '#334155'; ctx.font = '9px system-ui';
  ctx.fillText('← faster                                         slower →', 20 + 180, 20);

  LATENCY_LEVELS.forEach((lv, i) => {
    const y = startY + i * rowH;
    const isActive = stepIdx < 0 || IO_STEPS[stepIdx]?.activeIdx === i;
    const isPast = stepIdx >= 0 && i < IO_STEPS[stepIdx]?.activeIdx;
    const logW = (Math.log10(lv.ns) / maxLog) * barMaxW;

    // Label
    ctx.fillStyle = isActive ? lv.color : '#475569';
    ctx.font = (isActive ? '700' : '400') + ' 10px system-ui';
    ctx.fillText(lv.label, 20, y + rowH / 2 + 4);

    // Bar
    const bx = 185;
    ctx.fillStyle = isActive ? lv.color + 'AA' : lv.color + '22';
    ctx.strokeStyle = isActive ? lv.color : lv.color + '44';
    ctx.lineWidth = isActive ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(bx, y + 4, logW, rowH - 10, 3); ctx.fill(); ctx.stroke();

    // Value
    ctx.fillStyle = isActive ? lv.color : '#475569';
    ctx.font = (isActive ? '700' : '400') + ' 9px monospace';
    ctx.fillText(formatNs(lv.ns), bx + logW + 6, y + rowH / 2 + 4);

    // Multiplier vs DRAM
    if (i > 3) {
      const mult = Math.round(lv.ns / LATENCY_LEVELS[3].ns);
      ctx.fillStyle = isActive ? lv.color : '#334155';
      ctx.font = '8px system-ui';
      ctx.fillText(`${mult.toLocaleString()}× vs DRAM`, bx + logW + 60, y + rowH / 2 + 4);
    }
  });

  // Detail box
  if (stepIdx >= 0) {
    const desc = IO_STEPS[stepIdx].desc;
    const lv = LATENCY_LEVELS[IO_STEPS[stepIdx].activeIdx];
    const bx = 20, by = h - 64, bw = w - 40, bh = 56;
    ctx.fillStyle = '#0F172A';
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 6); ctx.fill();
    ctx.strokeStyle = lv.color + '66'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 6); ctx.stroke();
    ctx.fillStyle = lv.color; ctx.font = '700 10px system-ui';
    ctx.fillText(`${lv.label} — ${formatNs(lv.ns)}`, bx + 10, by + 16);
    const words = desc.split(' ');
    let line = '', ly = by + 30;
    ctx.fillStyle = '#94A3B8'; ctx.font = '9px system-ui';
    words.forEach(w2 => {
      const test = line + (line ? ' ' : '') + w2;
      if (ctx.measureText(test).width > bw - 20) { ctx.fillText(line, bx + 10, ly); line = w2; ly += 12; } else line = test;
    });
    if (line) ctx.fillText(line, bx + 10, ly);
  } else {
    ctx.fillStyle = '#475569'; ctx.font = '12px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('Press Play to walk through the storage latency hierarchy', w/2, h - 30);
    ctx.textAlign = 'left';
  }
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Storage Engine · M33',
    title: 'Disk I/O',
    subtitle: 'The latency hierarchy from L1 cache to HDD — and why buffer pool hit ratio is the #1 performance lever.',
    tabs: [
      { id: 'latency', label: '⏱️ Latency Hierarchy' },
      { id: 'amp',     label: '📢 I/O Amplification' },
      { id: 'iq',      label: '💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  const latTab = container.querySelector('#tab-latency');
  latTab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="canvas-wrap" style="margin-top:12px">
      <canvas width="800" height="380" style="width:100%;max-height:380px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="lat-explainer">
        <h3>Storage Latency Hierarchy</h3>
        <p>7 levels from CPU L1 cache (0.4 ns) to HDD (8 ms = 20 million× slower).
           Every database I/O decision — index design, buffer pool size, SSD vs HDD —
           is ultimately an attempt to serve reads from DRAM.
           Press <strong>Play</strong> to walk through each level.</p>
      </div>
    </div>
  `;
  const canvas = latTab.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const engine = new SimulationEngine({
    initialState: { step: -1 },
    steps: IO_STEPS.map((s, i) => ({ label: LATENCY_LEVELS[i].label.substring(0,14), duration: 1800, mutate: st => { st.step = i; } })),
    onRender: state => {
      drawLatency(ctx, state.step, 800, 380);
      const el = latTab.querySelector('#lat-explainer');
      if (el && state.step >= 0) { const lv = LATENCY_LEVELS[state.step]; el.innerHTML = `<h3>${lv.label} — ${formatNs(lv.ns)}</h3><p>${lv.desc}</p>`; }
    },
  });
  SimulationEngine.renderControls(latTab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(latTab.querySelector('.canvas-wrap'), engine);
  drawLatency(ctx, -1, 800, 380);
  engine.reset();

  container.querySelector('#tab-amp').innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">Write Amplification and Read Amplification</div>
        <div class="section-desc">How a single logical write or read can trigger many physical I/O operations</div>
      </div>
      <div class="prose">
        <h3>Write Amplification (WA)</h3>
        <p>WA = physical bytes written / logical bytes written. A single row UPDATE in PostgreSQL causes:
           (1) WAL record written (~150 bytes), (2) Dirty heap page written at checkpoint (~8 KB),
           (3) Potentially 2–3 index pages dirtied per index. Total: ~25 KB written for a 100-byte logical write = WA of 250×.</p>
        <div class="code-block" style="font-size:11px">
B+ Tree WA:   ~10–30× (WAL + page write + index updates)
LSM-Tree WA:  ~10–100× (compaction rewrites SSTables repeatedly)
Copy-on-Write: ~1× per level (append-only, no in-place update)

SSD Write Endurance: NVMe rated for 100–1000 TBW
1 TB NVMe at WA=50, 1 GB/s write rate → exhausts in ~20 days
→ High WA is both a durability AND cost problem at Amazon scale
        </div>
        <h3>Read Amplification (RA)</h3>
        <p>RA = physical pages read / logical rows returned. B+ tree: 3–4 page reads per lookup (root→internal→leaf→heap). LSM: up to L levels × 1 bloom filter check + 1 block read per level.</p>
      </div>
      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead><tr><th>Operation</th><th>Logical I/O</th><th>Physical Pages</th><th>Write Ampl.</th></tr></thead>
          <tbody>
            ${[
              ['Single row INSERT', '1 row write', 'WAL + heap page + N index pages', '~10–30×'],
              ['Single row UPDATE (HOT)', '1 row change', 'WAL + heap page only (no index update)', '~3–5×'],
              ['Single row UPDATE (indexed col)', '1 row change', 'WAL + heap page + old+new index page per index', '~20–50×'],
              ['CHECKPOINT flush', 'WAL fsync', 'All dirty buffer pool pages → disk', 'Burst'],
              ['Vacuum of 1M dead tuples', '0 logical writes', '~100K pages scanned + rewritten', 'Internal'],
            ].map(([op, li, pp, wa]) => `<tr><td><strong>${op}</strong></td><td>${li}</td><td style="font-size:10px">${pp}</td><td><strong>${wa}</strong></td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'Why is random I/O so much more expensive than sequential I/O, even on SSDs?',
      a: 'HDDs: random I/O requires mechanical seek (~4 ms) + rotational latency (~4 ms) = ~8 ms per operation. Sequential I/O reads continuous tracks at full disk bandwidth (100–200 MB/s). 1 random HDD read = time for ~1000 sequential pages. SSDs: no mechanical seek, but NAND flash has page-level read granularity (4–16 KB), erase-block granularity (256 KB–2 MB), and internal parallelism that benefits sequential access. An NVMe SSD achieves 3–7 GB/s sequential read vs ~0.5–1.5 million IOPS random read × 4 KB = ~6 GB/s equivalent — similar numbers, but at larger blocks sequential wins due to prefetch and DMA efficiency. Database implication: index scans (random I/O to heap pages) become expensive at high row counts. Sequential scans (large table, many rows returned) are faster per-page. This is why the optimizer switches from IndexScan to SeqScan when selectivity is >5–10%.',
      tip: 'The 5–10% rule: if a query returns >5% of table rows, SeqScan beats IndexScan because random I/O cost exceeds sequential scan cost. This threshold is higher on SSDs than HDDs.',
    },
    {
      q: 'What is IOPS and how does it relate to database throughput?',
      a: 'IOPS = I/O Operations Per Second. Each operation reads or writes one I/O unit (typically 4 KB or the database page size). Throughput (MB/s) = IOPS × block_size. For a database: (1) NVMe: 500K–2M IOPS random 4K → with 8 KB pages: 250K–1M page reads/sec. (2) At 1% buffer miss rate and 1M queries/sec → 10K disk reads/sec — well within NVMe capacity. (3) HDD: 100–200 IOPS → maximum 100–200 random page reads/sec. A single HDD saturates at 100 concurrent queries if each needs one disk read. IOPS budget: each uncached index lookup costs 3–4 IOPS (B+ tree height). Uncached full scan = table_pages IOPS but sequential (full IOPS budget in one operation). Prime Day calculus: 350M product rows × 0.01% cold cache = 35K disk reads. NVMe handles; HDD cannot.',
      tip: 'AWS EBS GP3 delivers 16,000 IOPS at baseline (up to 64,000 provisioned). PostgreSQL on GP3 with shared_buffers=32GB can handle ~10K buffer misses/sec comfortably.',
    },
    {
      q: 'What is the storage latency cliff and how does it manifest during a traffic spike?',
      a: 'The storage latency cliff is the dramatic latency increase when query throughput forces the buffer pool hit ratio to drop. Scenario: normal load at 99.9% hit ratio (1 disk read per 1000 queries). Prime Day spike: 5× traffic → hit ratio drops to 98% (5 disk reads per 1000 queries). At 1M QPS: 5× traffic = 5M QPS → 100K disk reads/sec vs NVMe capacity of ~500K IOPS → 20% of capacity used. Latency: 0.1 ms × (1 / (1 - utilization)) = 0.1 ms × 5 = 0.5 ms → queries that were 1 ms now take 1.5 ms due to disk queuing. Solution cascade: (1) Increase shared_buffers to hold more of the working set. (2) Upgrade to faster storage (NVMe vs SATA). (3) Add read replicas to distribute I/O. (4) Partition hot tables to reduce working set size. (5) Pre-warm buffer pool before the spike (pg_prewarm).',
      tip: 'CloudWatch / pg_stat_bgwriter tracks blks_read. A sudden spike in blks_read during a traffic event is the storage latency cliff in action — time to add capacity or tune shared_buffers.',
    },
  ]);
  initIQ(container);

  return () => engine.destroy();
}
