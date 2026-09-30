import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

const IO_PATHS = [
  {
    id: 'double',
    label: 'PostgreSQL Default (Double Buffering)',
    steps: [
      { layer: 'DB', label: 'Query requests page 42', color: '#4F46E5' },
      { layer: 'shared_buffers', label: 'Check shared_buffers — MISS', color: '#06B6D4' },
      { layer: 'kernel', label: 'read() syscall → kernel checks page cache', color: '#10B981' },
      { layer: 'os_cache', label: 'OS page cache HIT — copy page to shared_buffers', color: '#10B981' },
      { layer: 'shared_buffers', label: 'Page now in shared_buffers — serve query', color: '#06B6D4' },
    ],
    note: 'Page lives in both OS page cache AND shared_buffers — double buffering. Two copies in RAM. Memory wasted. Benefit: OS pre-reads (read-ahead) can speed up sequential scans.',
  },
  {
    id: 'direct',
    label: 'O_DIRECT (InnoDB / bypass OS cache)',
    steps: [
      { layer: 'DB', label: 'Query requests page 42', color: '#4F46E5' },
      { layer: 'innodb', label: 'Check InnoDB buffer pool — MISS', color: '#F59E0B' },
      { layer: 'kernel', label: 'pread() with O_DIRECT — bypass OS page cache', color: '#EF4444' },
      { layer: 'disk', label: 'DMA direct from disk to InnoDB buffer pool frame', color: '#8B5CF6' },
      { layer: 'innodb', label: 'Page in buffer pool — serve query', color: '#F59E0B' },
    ],
    note: 'O_DIRECT bypasses OS page cache entirely. Single copy in RAM (buffer pool). Full control over replacement policy. No kernel cache pollution. Required for large in-memory databases.',
  },
  {
    id: 'miss',
    label: 'True Disk Miss (both caches cold)',
    steps: [
      { layer: 'DB', label: 'Query requests page 42 (cold start)', color: '#4F46E5' },
      { layer: 'shared_buffers', label: 'shared_buffers MISS', color: '#06B6D4' },
      { layer: 'os_cache', label: 'OS page cache MISS', color: '#EF4444' },
      { layer: 'disk', label: 'Physical disk read (~0.1ms SSD, ~8ms HDD) — true I/O', color: '#EF4444' },
      { layer: 'os_cache', label: 'Page loaded into OS cache + shared_buffers', color: '#10B981' },
    ],
    note: 'Full disk miss: both caches cold. SSD: ~0.1ms. HDD: ~8ms. This is the expensive path. Buffer pool hit ratio >99% keeps 99% of reads in DRAM (~50–200ns) rather than SSD/disk.',
  },
];

const IO_STEPS = IO_PATHS.flatMap(path =>
  path.steps.map((step, i) => ({ path, stepInPath: i, step, totalInPath: path.steps.length }))
);

const LAYER_Y = { DB: 30, shared_buffers: 80, innodb: 80, kernel: 140, os_cache: 200, disk: 270 };
const LAYER_LABELS = {
  DB: 'Application / Query',
  shared_buffers: 'shared_buffers (PostgreSQL)',
  innodb: 'InnoDB Buffer Pool',
  kernel: 'Linux Kernel VFS',
  os_cache: 'OS Page Cache (pagecache)',
  disk: 'NVMe SSD / HDD',
};

function drawIOPath(ctx, stepIdx, w, h) {
  ctx.clearRect(0, 0, w, h);
  if (stepIdx < 0) {
    ctx.fillStyle = '#475569'; ctx.font = '13px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('Press Play to trace I/O through OS page cache vs buffer pool layers', w/2, h/2);
    ctx.textAlign = 'left'; return;
  }

  const ioStep = IO_STEPS[stepIdx];
  const path = ioStep.path;
  const layerKeys = ['DB', path.id === 'direct' ? 'innodb' : 'shared_buffers', 'kernel', 'os_cache', 'disk'];
  const layerW = 320, layerH = 36;
  const lx = 30;

  // Draw path badge
  ctx.fillStyle = '#1E293B';
  ctx.beginPath(); ctx.roundRect(lx, 0, w - 40, 22, 4); ctx.fill();
  ctx.fillStyle = '#818CF8'; ctx.font = '700 10px system-ui';
  ctx.fillText(path.label, lx + 8, 15);

  layerKeys.forEach((key, ki) => {
    const ly = LAYER_Y[key] || 30 + ki * 60;
    const isActive = key === ioStep.step.layer;
    const isPast = path.steps.slice(0, ioStep.stepInPath).some(s => s.layer === key);
    const col = ioStep.step.color;

    ctx.fillStyle = isActive ? col + '22' : (isPast ? '#1A2434' : '#0A0F1A');
    ctx.strokeStyle = isActive ? col : '#1E293B'; ctx.lineWidth = isActive ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(lx, ly, layerW, layerH, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = isActive ? col : '#475569'; ctx.font = (isActive ? '700' : '400') + ' 10px system-ui';
    ctx.fillText(LAYER_LABELS[key] || key, lx + 8, ly + layerH/2 + 4);

    if (isActive) {
      ctx.fillStyle = col; ctx.font = '700 9px system-ui'; ctx.textAlign = 'right';
      ctx.fillText('◀ active', lx + layerW - 6, ly + layerH/2 + 3);
      ctx.textAlign = 'left';
    }
  });

  // Arrows between layers
  for (let ki = 0; ki < layerKeys.length - 1; ki++) {
    const fromKey = layerKeys[ki], toKey = layerKeys[ki + 1];
    const fy = LAYER_Y[fromKey] + layerH;
    const ty = LAYER_Y[toKey];
    const activeIdx = ioStep.stepInPath;
    const fromStep = path.steps[activeIdx]?.layer;
    const isFlow = activeIdx > ki;
    ctx.strokeStyle = isFlow ? (ioStep.step.color + '88') : '#1E293B';
    ctx.lineWidth = isFlow ? 1.5 : 1;
    ctx.setLineDash(isFlow ? [] : [4, 4]);
    ctx.beginPath();
    ctx.moveTo(lx + layerW / 2, fy);
    ctx.lineTo(lx + layerW / 2, ty);
    ctx.stroke();
    ctx.setLineDash([]);
    if (isFlow) {
      ctx.fillStyle = ioStep.step.color + '88'; ctx.font = '10px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('↓', lx + layerW / 2, fy + (ty - fy) / 2 + 4);
      ctx.textAlign = 'left';
    }
  }

  // Step description panel
  const panelX = lx + layerW + 30;
  const panelW = w - panelX - 10;
  ctx.fillStyle = '#0F172A';
  ctx.beginPath(); ctx.roundRect(panelX, 0, panelW, 310, 6); ctx.fill();
  ctx.strokeStyle = ioStep.step.color + '55'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(panelX, 0, panelW, 310, 6); ctx.stroke();

  ctx.fillStyle = ioStep.step.color; ctx.font = '700 10px system-ui';
  ctx.fillText(`Step ${ioStep.stepInPath + 1}/${ioStep.totalInPath}`, panelX + 10, 20);
  ctx.fillStyle = '#94A3B8'; ctx.font = '10px system-ui';

  const desc = ioStep.step.label;
  const words = desc.split(' ');
  let line = '', ly2 = 38;
  words.forEach(word => {
    const test = line + (line ? ' ' : '') + word;
    if (ctx.measureText(test).width > panelW - 20) {
      ctx.fillText(line, panelX + 10, ly2); line = word; ly2 += 15;
    } else line = test;
  });
  if (line) { ctx.fillText(line, panelX + 10, ly2); ly2 += 20; }

  ctx.fillStyle = '#334155';
  ctx.fillRect(panelX + 10, ly2, panelW - 20, 1);
  ly2 += 14;

  const noteWords = path.note.split(' ');
  let noteLine = '';
  noteWords.forEach(word => {
    const test = noteLine + (noteLine ? ' ' : '') + word;
    if (ctx.measureText(test).width > panelW - 20) {
      ctx.fillStyle = '#64748B'; ctx.font = '9px system-ui';
      ctx.fillText(noteLine, panelX + 10, ly2); noteLine = word; ly2 += 13;
    } else noteLine = test;
  });
  if (noteLine) { ctx.fillStyle = '#64748B'; ctx.font = '9px system-ui'; ctx.fillText(noteLine, panelX + 10, ly2); }
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Storage Engine · M32',
    title: 'Page Cache',
    subtitle: 'OS page cache vs DB buffer pool — double buffering, O_DIRECT, and why databases manage their own memory.',
    tabs: [
      { id: 'layers', label: '💭 I/O Layer Stack' },
      { id: 'odirect', label: '⚡ O_DIRECT & WAL' },
      { id: 'iq',     label: '💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  const layersTab = container.querySelector('#tab-layers');
  layersTab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="canvas-wrap" style="margin-top:12px">
      <canvas width="800" height="340" style="width:100%;max-height:340px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="cache-explainer">
        <h3>I/O Layer Stack</h3>
        <p>A page request travels through multiple caching layers before hitting disk.
           PostgreSQL uses shared_buffers + OS page cache (double buffering).
           InnoDB uses O_DIRECT to bypass the OS cache.
           Press <strong>Play</strong> to trace three I/O scenarios.</p>
      </div>
    </div>
  `;

  const canvas = layersTab.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const engine = new SimulationEngine({
    initialState: { step: -1 },
    steps: IO_STEPS.map((s, i) => ({ label: s.path.id + ' ' + (s.stepInPath + 1), duration: 1600, mutate: st => { st.step = i; } })),
    onRender: state => {
      drawIOPath(ctx, state.step, 800, 340);
      const el = layersTab.querySelector('#cache-explainer');
      if (el && state.step >= 0) {
        const s = IO_STEPS[state.step];
        el.innerHTML = `<h3>${s.path.label} — Step ${s.stepInPath + 1}</h3><p>${s.step.label}</p>`;
      }
    },
  });
  SimulationEngine.renderControls(layersTab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(layersTab.querySelector('.canvas-wrap'), engine);
  drawIOPath(ctx, -1, 800, 340);
  engine.reset();

  container.querySelector('#tab-odirect').innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">O_DIRECT, WAL, and the Memory Hierarchy</div>
        <div class="section-desc">Why databases bypass the OS and what they do instead</div>
      </div>
      <div class="prose">
        <h3>Why O_DIRECT?</h3>
        <p>The OS page cache uses LRU replacement that cannot be tuned for database access patterns.
           With large buffer pools (32–256 GB), the OS cache duplicates pages already in the buffer pool,
           wasting half the memory. InnoDB uses <code>O_DIRECT</code> to:</p>
        <ul>
          <li>Avoid double-caching: 1 copy in buffer pool only</li>
          <li>Use the database's own replacement policy (LRU-K / midpoint insertion)</li>
          <li>Prevent OS page cache replacement from interfering with hot page residency</li>
          <li>Enable precise memory accounting: exactly buffer_pool_size bytes used</li>
        </ul>
        <h3>PostgreSQL's Approach</h3>
        <p>PostgreSQL does NOT use O_DIRECT by default (historical POSIX compatibility reasons).
           It relies on the OS page cache as a second tier below shared_buffers.
           <code>effective_cache_size</code> tells the planner how much OS cache exists
           (so index scans are preferred when the working set fits in OS cache).</p>
        <div class="code-block" style="font-size:11px">
<span class="cmt">-- Memory hierarchy latency (approximate):</span>
L1 cache:          0.4 ns   → CPU registers / hot variable
L2 cache:          4   ns   → hot loop values
L3 cache:          40  ns   → frequently accessed data structures
DRAM (buffer pool): 80 ns   → hot database pages in shared_buffers
OS page cache:     ~80 ns   → cold database pages (still in RAM)
NVMe SSD:         100 μs    → 1,000× slower than DRAM — a miss matters
SATA SSD:         300 μs    → cold index or full-table scan page
HDD:               8  ms    → 100,000× slower than DRAM

<span class="cmt">-- Prime Day: 1M queries/sec × 1% miss rate × 100μs/miss = 1 sec of I/O wait/sec</span>
<span class="cmt">-- Buffer hit ratio MUST be >99% to sustain 1M QPS on NVMe</span>
        </div>
        <h3>WAL and the Checkpoint Protocol</h3>
        <p>WAL (Write-Ahead Log) ensures durability without synchronous heap flushes.
           Modified pages (dirty frames) are written to the WAL log <em>first</em>, then
           the heap pages are lazily flushed at checkpoint time. Recovery replays WAL from
           the last checkpoint forward. This is why PostgreSQL's durability does not depend on
           O_DIRECT or fdatasync on every page write — WAL handles it.</p>
      </div>
      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead><tr><th>Aspect</th><th>PostgreSQL (default)</th><th>InnoDB / O_DIRECT</th></tr></thead>
          <tbody>
            ${[
              ['Cache layers', 'shared_buffers + OS page cache (2-tier)', 'InnoDB buffer pool only (1-tier)'],
              ['Replacement policy', 'Clock (buffer pool) + Linux LRU (OS cache)', 'Custom midpoint LRU (buffer pool only)'],
              ['Memory accounting', 'shared_buffers + unpredictable OS cache', 'Exactly innodb_buffer_pool_size'],
              ['SeqScan behavior', 'Ring buffer bypasses shared_buffers; OS cache may absorb', 'O_DIRECT ring — bypasses both caches'],
              ['Durability', 'WAL + fdatasync at checkpoint', 'WAL (redo log) + O_DIRECT for predictability'],
              ['pg_prewarm', 'Can preload pages into shared_buffers after restart', 'warmup_time auto-warms buffer pool on startup'],
            ].map(([asp, pg, inn]) => `<tr><td><strong>${asp}</strong></td><td style="font-size:10px">${pg}</td><td style="font-size:10px">${inn}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'What is "double buffering" in PostgreSQL and why is it both a feature and a problem?',
      a: 'Double buffering occurs because PostgreSQL reads/writes files through the Linux VFS layer, which goes through the OS page cache. When a page is fetched from disk: (1) The OS reads the page into its page cache. (2) PostgreSQL copies it from the page cache into shared_buffers. The page now exists in two places — OS cache and shared_buffers — wasting RAM. Why it\'s a feature: (1) The OS page cache acts as a second-tier buffer. If shared_buffers is cold (after restart), the OS cache may already have the page — no disk I/O. (2) OS read-ahead prefetches sequential pages automatically — speeds up SeqScan without explicit PostgreSQL read-ahead. Why it\'s a problem: (1) Memory waste — if shared_buffers=32 GB and OS cache has another 32 GB of the same pages, 32 GB is wasted. (2) OS replacement policy cannot be tuned. (3) Hard to predict actual memory usage. Fix: pg_prewarm extension loads pages directly into shared_buffers after restart, reducing cold-cache startup latency on Prime Day reboot.',
      tip: 'Amazon Aurora decouples storage from compute and uses its own distributed storage layer (Aurora Storage) — no OS page cache at all. Shared_buffers is the only cache layer, making memory management predictable.',
    },
    {
      q: 'How does the OS page cache interact with WAL writes, and what is fsync?',
      a: 'WAL (Write-Ahead Log) records are written to a file (WAL segment, 16 MB by default). Without fsync, the OS may buffer WAL writes in the page cache — a system crash could lose recent WAL records, causing data loss. fsync() (or fdatasync()) forces the OS to flush dirty pages to the physical storage device, ensuring durability. PostgreSQL calls fsync on WAL after each synchronous commit (synchronous_commit=on). Key settings: (1) synchronous_commit=off — WAL is written to OS cache but not fsynced; up to wal_writer_delay (200ms) of data loss on crash; faster for high-throughput non-critical writes. (2) synchronous_commit=on — fsync on every commit; full durability; ~1–2ms latency penalty per commit. (3) wal_sync_method=fdatasync (Linux default) — skips metadata updates for speed. (4) full_page_writes=on — writes full 8 KB page to WAL after a checkpoint to survive partial writes (torn pages).',
      tip: 'The "wal_level=replica" setting must be on for streaming replication. "wal_level=logical" enables logical replication. Higher wal_level increases WAL volume.',
    },
    {
      q: 'What is pg_prewarm and when should it be used in production?',
      a: 'pg_prewarm is a PostgreSQL extension that loads relation pages into shared_buffers (or the OS page cache) at startup or on demand. Without it, after a database restart, shared_buffers is cold — every OLTP query hits disk until the working set is naturally loaded. For Prime Day: an e-commerce database restart before the sale means the first hour of traffic suffers from high disk I/O (cold cache tax). pg_prewarm solves this: (1) Before maintenance window: pg_dump the buffer pool contents using pg_buffercache. (2) After restart: pg_prewarm(\'orders\', \'buffer\', \'main\', 0, 500000) preloads pages 0–500,000. (3) Alternatively, pg_prewarm can be called from postgresql.conf\'s session_preload_libraries to run automatically at startup. Strategy: prioritize indexes over heap (indexes are smaller, consulted on every query); prewarm orders, products, customers tables; monitor pg_stat_bgwriter.buffers_clean to confirm pool is warm. A fully warmed pool restores >99% hit ratio within minutes rather than hours of organic traffic.',
      tip: 'Amazon RDS/Aurora automatically warms the buffer pool from a snapshot of the previous pool state on instance restart — eliminating the cold-cache startup penalty for managed databases.',
    },
  ]);
  initIQ(container);

  return () => engine.destroy();
}
