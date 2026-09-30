import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

const LEVELS = [
  { name: 'CPU Registers',  size: '< 1 KB',    latency: '0.3 ns',     bandwidth: '~TB/s',   color: '#4F46E5', icon: '⚡', volatile: true,  managed: 'Hardware' },
  { name: 'L1 Cache',       size: '32–512 KB',  latency: '1 ns',       bandwidth: '~TB/s',   color: '#6366F1', icon: '🔥', volatile: true,  managed: 'Hardware' },
  { name: 'L2 Cache',       size: '256 KB–4 MB',latency: '4 ns',       bandwidth: '~500 GB/s',color: '#818CF8',icon: '🌡️', volatile: true,  managed: 'Hardware' },
  { name: 'L3 Cache',       size: '4–64 MB',    latency: '10–40 ns',   bandwidth: '~200 GB/s',color: '#A5B4FC',icon: '💫', volatile: true,  managed: 'Hardware' },
  { name: 'DRAM (Buffer Pool)', size: '~1 TB',  latency: '50–100 ns',  bandwidth: '~50 GB/s', color: '#06B6D4', icon: '🧠', volatile: true,  managed: 'DBMS Buffer Pool' },
  { name: 'NVMe SSD',       size: '~4 TB',      latency: '50–150 μs',  bandwidth: '~7 GB/s',  color: '#10B981', icon: '💽', volatile: false, managed: 'OS + DBMS' },
  { name: 'HDD / SAN',      size: '~20 TB',     latency: '5–10 ms',    bandwidth: '~200 MB/s',color: '#F59E0B', icon: '🗄️', volatile: false, managed: 'OS' },
  { name: 'S3 / Object Store', size: 'Unlimited',latency: '5–50 ms',   bandwidth: '~5 GB/s',  color: '#64748B', icon: '☁️', volatile: false, managed: 'Cloud Provider' },
];

function drawHierarchy(ctx, activeIdx, w, h) {
  ctx.clearRect(0, 0, w, h);

  const barH = 42;
  const gap   = 6;
  const totalH = LEVELS.length * (barH + gap);
  const startY = (h - totalH) / 2;

  LEVELS.forEach((lvl, i) => {
    const active = i === activeIdx;
    const barW   = w - 60 - (i * 20); // Pyramid shape — narrows at top
    const x = 30 + (i * 10);
    const y = startY + i * (barH + gap);

    ctx.fillStyle = active ? lvl.color : lvl.color + '30';
    ctx.strokeStyle = active ? lvl.color : lvl.color + '60';
    ctx.lineWidth = active ? 2 : 1;
    roundRect(ctx, x, y, barW, barH, 6);
    ctx.fill();
    ctx.stroke();

    // Level name
    ctx.fillStyle = active ? '#fff' : '#94A3B8';
    ctx.font = `${active ? 600 : 400} 12px system-ui`;
    ctx.fillText(`${lvl.icon} ${lvl.name}`, x + 12, y + 16);

    // Specs inline
    ctx.fillStyle = active ? 'rgba(255,255,255,.7)' : '#475569';
    ctx.font = '10px system-ui';
    ctx.fillText(`${lvl.latency} latency  ·  ${lvl.size}  ·  ${lvl.managed}`, x + 12, y + 32);
  });

  // Title
  ctx.fillStyle = '#64748B';
  ctx.font = '11px system-ui';
  ctx.textAlign = 'right';
  ctx.fillText('← FAST', w - 10, startY - 10);
  ctx.fillText('← SLOW', w - 10, startY + totalH + 16);
  ctx.textAlign = 'left';
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Foundations · M09',
    title: 'Storage Hierarchy',
    subtitle: 'The 8-level memory pyramid every DB engineer must know cold — latency numbers that define database design decisions.',
    tabs: [
      { id: 'pyramid', label: '📐 Memory Pyramid' },
      { id: 'numbers', label: '📊 Latency Numbers' },
      { id: 'iq',      label: '💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  // ── Pyramid Tab ────────────────────────────────────────────────────────────
  const pyramidTab = container.querySelector('#tab-pyramid');
  pyramidTab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="canvas-wrap" style="margin-top:16px">
      <canvas width="800" height="420" style="width:100%;max-height:420px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="storage-explainer">
        <h3>The Storage Hierarchy</h3>
        <p>Press <strong>Play</strong> to explore each level — from 0.3ns CPU registers to 50ms S3 object storage.
           The DBMS buffer pool (DRAM) is the critical boundary between "fast" and "slow".</p>
      </div>
    </div>
  `;

  const canvas = pyramidTab.querySelector('canvas');
  const ctx    = canvas.getContext('2d');
  const W = 800, H = 420;

  const engine = new SimulationEngine({
    initialState: { level: -1 },
    steps: LEVELS.map((l, i) => ({
      label: l.name,
      duration: 1600,
      mutate: s => { s.level = i; },
    })),
    onRender: (state) => {
      drawHierarchy(ctx, state.level, W, H);
      const el = pyramidTab.querySelector('#storage-explainer');
      if (el && state.level >= 0) {
        const l = LEVELS[state.level];
        el.innerHTML = `
          <h3>${l.icon} ${l.name}</h3>
          <p>
            <strong>Latency:</strong> ${l.latency} &nbsp;·&nbsp;
            <strong>Size:</strong> ${l.size} &nbsp;·&nbsp;
            <strong>Bandwidth:</strong> ${l.bandwidth}<br>
            <strong>Volatile:</strong> ${l.volatile ? '⚠️ Lost on power failure' : '✅ Persists across restarts'}<br>
            <strong>Managed by:</strong> ${l.managed}
          </p>
        `;
      }
    },
  });

  SimulationEngine.renderControls(pyramidTab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(pyramidTab.querySelector('.canvas-wrap'), engine);
  drawHierarchy(ctx, -1, W, H);
  engine.reset();

  // ── Numbers Tab ────────────────────────────────────────────────────────────
  container.querySelector('#tab-numbers').innerHTML = `
    <div class="compare-table-wrap">
      <table class="compare-table">
        <thead>
          <tr>
            <th>Storage Level</th>
            <th>Latency</th>
            <th>Relative (if 1ns = 1 second)</th>
            <th>DBMS Role</th>
          </tr>
        </thead>
        <tbody>
          ${[
            ['CPU Registers', '0.3 ns', '0.3 sec', 'Loop variables, intermediate calc'],
            ['L1 Cache', '1 ns', '1 sec', 'Hot page frame metadata'],
            ['L2 Cache', '4 ns', '4 sec', 'Page header data'],
            ['L3 Cache', '40 ns', '40 sec', 'Frequently accessed buffer frames'],
            ['DRAM (Buffer Pool)', '100 ns', '100 sec', 'All "hot" data pages must live here'],
            ['NVMe SSD', '100 μs', '28 hours', 'Cold data, WAL writes (sequential)'],
            ['HDD / SAN', '10 ms', '4 months', 'Archival data; DBAs avoid random I/O'],
            ['S3 / Object Store', '50 ms', '1.6 years', 'Backup, data lake, cold Iceberg tables'],
          ].map(([level, lat, human, role]) => `
            <tr>
              <td><strong>${level}</strong></td>
              <td class="tag-good"><code>${lat}</code></td>
              <td style="color:var(--amber)">${human}</td>
              <td>${role}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <div class="scroll-content" style="padding-top:16px">
      <div class="prose">
        <h3>The Buffer Pool is the Most Important DB Performance Lever</h3>
        <p>A buffer pool hit (DRAM) costs 100ns. A miss requiring disk I/O (NVMe SSD) costs 100μs —
           1,000× slower. A Prime Day checkout hitting 10 disk reads instead of cache hits adds
           1ms to latency — noticeable at 2,170 orders/second.</p>
        <h3>Why Databases Bypass the OS Page Cache</h3>
        <p>The OS has its own page cache. Why does a DBMS manage its own buffer pool?
           (1) The DBMS knows which pages are "dirty" and when to write them back.
           (2) The DBMS can implement database-specific eviction policies (e.g., keep index root pages pinned).
           (3) O_DIRECT bypasses OS cache to avoid double-buffering — the DBMS is the only cache.</p>
      </div>
    </div>
  `;

  // ── Interview Q&A ─────────────────────────────────────────────────────────
  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'What latency numbers should every backend engineer know?',
      a: 'The canonical Jeff Dean numbers: L1 cache ~1ns, L2 ~4ns, DRAM ~100ns, NVMe SSD ~100μs, Network round-trip same DC ~500μs, HDD seek ~10ms. These scale: DRAM is 1000× faster than SSD; SSD is 100× faster than HDD. In DB design: keep hot data in buffer pool (DRAM), use sequential I/O on SSD for WAL writes, avoid random HDD I/O at all costs.',
      tip: 'Memorise: DRAM ≈ 100ns, SSD ≈ 100μs, HDD ≈ 10ms. Each is 1000× the previous.',
    },
    {
      q: 'Why do databases prefer sequential I/O over random I/O?',
      a: 'On HDDs: a random read requires seek (5ms) + rotational delay (4ms) + transfer (~0.1ms) = ~10ms. A sequential read streams data from the disk head\'s current position — no seek. On SSDs, random reads are faster (~100μs) but sequential still wins (no erase/write cycle amortisation). DBs exploit this by: (1) WAL — append-only sequential writes, (2) full table scans — sequential page reads, (3) compaction (LSM-tree) — merge-sort SSTables sequentially.',
      tip: 'For HDDs: seq > rand by 100×. For SSDs: seq > rand by ~5×. The gap shrinks but never disappears.',
    },
    {
      q: 'What is a buffer pool miss and how does it affect Prime Day throughput?',
      a: 'A buffer pool miss occurs when the requested page is not in DRAM — the DBMS must fetch it from disk. Cost: NVMe ~100μs (vs 100ns hit = 1000× slower). At 2,170 orders/sec on Prime Day: if each order causes even 1 buffer miss, that\'s 2,170 disk reads/sec — 217 MB/s with 100 KB pages. A well-sized buffer pool (keeping hot inventory and customer pages in memory) reduces this to near-zero misses. Buffer pool sizing is the most impactful DBA tuning lever.',
      tip: 'Buffer pool hit ratio should be > 99% in production. Monitor with pg_stat_bgwriter in PostgreSQL.',
    },
  ]);
  initIQ(container);

  return () => engine.destroy();
}
