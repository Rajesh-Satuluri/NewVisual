import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

// Grid of 48 pages. Sequential scan reads left-to-right. Random reads jump around.
const GRID_COLS = 12, GRID_ROWS = 4;
const TOTAL_PAGES = GRID_COLS * GRID_ROWS;

// Random access pattern: 10 scattered lookups
const RANDOM_PAGES = [5, 38, 2, 22, 41, 11, 29, 7, 35, 17];
// Sequential order: 0..TOTAL_PAGES-1
const SEQ_PAGES = Array.from({ length: TOTAL_PAGES }, (_, i) => i);

function makeIOSteps() {
  const steps = [];
  const seqVisited = new Set(), rndVisited = new Set();

  steps.push({ mode: 'intro', seqVisited: new Set(), rndVisited: new Set(), seqPage: -1, rndPage: -1, desc: 'Left: Sequential scan — reads pages 0–47 in order. Right: Random access — 10 scattered index lookups. Watch the access pattern. Same number of useful rows returned, very different I/O cost on HDD.' });

  // Interleave: show seq scan on left, random on right
  const maxSteps = Math.max(SEQ_PAGES.length, RANDOM_PAGES.length);
  for (let i = 0; i < maxSteps; i++) {
    if (i < SEQ_PAGES.length) seqVisited.add(SEQ_PAGES[i]);
    if (i < RANDOM_PAGES.length) rndVisited.add(RANDOM_PAGES[i]);
    const isRnd = i < RANDOM_PAGES.length;
    const isSq = i < SEQ_PAGES.length;
    steps.push({
      mode: 'running',
      seqVisited: new Set(seqVisited),
      rndVisited: new Set(rndVisited),
      seqPage: isSq ? SEQ_PAGES[i] : -1,
      rndPage: isRnd ? RANDOM_PAGES[i] : -1,
      seqCount: seqVisited.size,
      rndCount: rndVisited.size,
      desc: `Step ${i+1}: Seq reading page ${isSq ? SEQ_PAGES[i] : '(done)'}. Random seeking to page ${isRnd ? RANDOM_PAGES[i] : '(done)'}. HDD cost: seq ~0.1ms/page, random ~8ms/page (80× difference).`,
    });
  }

  steps.push({ mode: 'done', seqVisited: new Set(seqVisited), rndVisited: new Set(rndVisited), seqPage: -1, rndPage: -1, desc: `Done. Sequential: ${SEQ_PAGES.length} pages read in ~4.8s (HDD) or 40ms (NVMe). Random: ${RANDOM_PAGES.length} pages in ~80ms (HDD) or 1ms (NVMe). Sequential wins on HDD by 60×; NVMe nearly equalizes — but sequential still wins for large scans.` });
  return steps;
}

const IO_STEPS = makeIOSteps();

function drawIOComparison(ctx, stepIdx, w, h) {
  ctx.clearRect(0, 0, w, h);

  if (stepIdx < 0) {
    ctx.fillStyle = '#475569'; ctx.font = '13px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('Press Play to compare sequential scan vs random I/O access patterns', w/2, h/2);
    ctx.textAlign = 'left'; return;
  }

  const step = IO_STEPS[stepIdx];
  const cellW = 32, cellH = 22, gap = 2;
  const halfW = w / 2 - 10;

  function drawGrid(ox, visited, activeP, title, color, stats) {
    ctx.fillStyle = color; ctx.font = '700 10px system-ui';
    ctx.fillText(title, ox, 20);
    if (stats) { ctx.fillStyle = '#64748B'; ctx.font = '9px system-ui'; ctx.fillText(stats, ox, 32); }

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const pi = r * GRID_COLS + c;
        const x = ox + c * (cellW + gap);
        const y = 40 + r * (cellH + gap);
        const isActive = pi === activeP;
        const isDone = visited.has(pi) && !isActive;

        ctx.fillStyle = isActive ? color : (isDone ? color + '44' : '#0A0F1A');
        ctx.strokeStyle = isActive ? color : (isDone ? color + '88' : '#1E293B');
        ctx.lineWidth = isActive ? 2 : 1;
        ctx.beginPath(); ctx.roundRect(x, y, cellW, cellH, 3); ctx.fill(); ctx.stroke();
        ctx.fillStyle = isActive ? '#fff' : (isDone ? color : '#334155');
        ctx.font = (isActive ? '700' : '400') + ' 8px system-ui'; ctx.textAlign = 'center';
        ctx.fillText(pi, x + cellW/2, y + cellH/2 + 3);
        ctx.textAlign = 'left';
      }
    }

    // Arrow showing read direction for sequential
    if (activeP >= 0 && title.startsWith('Sequential')) {
      const r = Math.floor(activeP / GRID_COLS), c2 = activeP % GRID_COLS;
      const ax = ox + c2 * (cellW + gap) + cellW/2;
      const ay = 40 + r * (cellH + gap) - 6;
      ctx.fillStyle = color; ctx.font = '10px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('▼', ax, ay);
      ctx.textAlign = 'left';
    }
  }

  const seqStats = step.seqCount ? `${step.seqCount} pages read (contiguous)` : '';
  const rndStats = step.rndCount ? `${step.rndCount} pages read (scattered)` : '';

  drawGrid(20, step.seqVisited, step.seqPage, 'Sequential Scan (SeqScan)', '#10B981', seqStats);
  drawGrid(w/2 + 10, step.rndVisited, step.rndPage, 'Random Access (Index Lookup)', '#EF4444', rndStats);

  // Vertical divider
  ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(w/2, 10); ctx.lineTo(w/2, h - 50); ctx.stroke();

  // HDD latency badges
  const lx = 20, bY = h - 108;
  [
    { label: 'HDD Sequential', val: '~0.1 ms/page', col: '#10B981' },
    { label: 'HDD Random', val: '~8 ms/page (80×)', col: '#EF4444' },
    { label: 'NVMe Sequential', val: '~0.01 ms/page', col: '#06B6D4' },
    { label: 'NVMe Random', val: '~0.1 ms/page (10×)', col: '#F59E0B' },
  ].forEach((b, bi) => {
    const bx = lx + bi * 190;
    ctx.fillStyle = b.col + '22';
    ctx.beginPath(); ctx.roundRect(bx, bY, 182, 42, 4); ctx.fill();
    ctx.strokeStyle = b.col; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(bx, bY, 182, 42, 4); ctx.stroke();
    ctx.fillStyle = b.col; ctx.font = '700 9px system-ui'; ctx.fillText(b.label, bx + 6, bY + 14);
    ctx.fillStyle = '#94A3B8'; ctx.font = '10px system-ui'; ctx.fillText(b.val, bx + 6, bY + 30);
  });

  // Footer
  ctx.fillStyle = '#1E293B';
  ctx.beginPath(); ctx.roundRect(lx, h - 58, w - 40, 50, 4); ctx.fill();
  ctx.fillStyle = '#64748B'; ctx.font = '9.5px system-ui';
  const words = step.desc.split(' ');
  let line = '', ly = h - 42;
  words.forEach(wd => {
    const test = line + (line ? ' ' : '') + wd;
    if (ctx.measureText(test).width > w - 60) { ctx.fillText(line, lx + 8, ly); line = wd; ly += 13; } else line = test;
  });
  if (line) ctx.fillText(line, lx + 8, ly);
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Storage Engine · M34',
    title: 'Sequential vs Random I/O',
    subtitle: 'Sequential scans read contiguous pages at full bandwidth. Random access pays seek cost per lookup. The gap drives every index decision.',
    tabs: [
      { id: 'compare', label: '⏩ Pattern Comparison' },
      { id: 'analysis', label: '📊 Cost Analysis' },
      { id: 'iq',      label: '💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  const compTab = container.querySelector('#tab-compare');
  compTab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="canvas-wrap" style="margin-top:12px">
      <canvas width="800" height="400" style="width:100%;max-height:400px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="io-explainer">
        <h3>Sequential vs Random I/O Access Patterns</h3>
        <p>48 pages of the orders table. Sequential scan reads left-to-right — full bandwidth.
           Index scan makes 10 targeted lookups at scattered page locations — each a separate I/O.
           Press <strong>Play</strong> to watch both patterns simultaneously.</p>
      </div>
    </div>
  `;

  const canvas = compTab.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const engine = new SimulationEngine({
    initialState: { step: -1 },
    steps: IO_STEPS.map((s, i) => ({ label: `Step ${i}`, duration: 300, mutate: st => { st.step = i; } })),
    onRender: state => {
      drawIOComparison(ctx, state.step, 800, 400);
      const el = compTab.querySelector('#io-explainer');
      if (el && state.step >= 0) { const s = IO_STEPS[state.step]; el.innerHTML = `<h3>Step ${state.step}</h3><p>${s.desc}</p>`; }
    },
  });
  SimulationEngine.renderControls(compTab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(compTab.querySelector('.canvas-wrap'), engine);
  drawIOComparison(ctx, -1, 800, 400);
  engine.reset();

  container.querySelector('#tab-analysis').innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">I/O Cost Model — Why the Optimizer Cares</div>
        <div class="section-desc">seq_page_cost vs random_page_cost in PostgreSQL cost estimation</div>
      </div>
      <div class="code-block" style="font-size:11px">
<span class="cmt">-- PostgreSQL cost constants (GUC parameters):</span>
seq_page_cost    = 1.0    <span class="cmt">-- cost unit for sequential page read (baseline)</span>
random_page_cost = 4.0    <span class="cmt">-- cost unit for random page read (default: 4× seq)</span>

<span class="cmt">-- For NVMe SSDs, lower random_page_cost to reflect smaller gap:</span>
ALTER SYSTEM SET random_page_cost = 1.5;  <span class="cmt">-- SSD gap is ~10×, not 80×</span>
SELECT pg_reload_conf();

<span class="cmt">-- Cost calculation for orders table (350M rows, 5.25M pages):</span>
SeqScan cost   = seq_page_cost × 5.25M    = 5,250,000
IndexScan cost = random_page_cost × height × selectivity_rows
               = 4.0 × 3 × 1             = 12   (for 1 row lookup)
               = 4.0 × 3 × 70M           = 840M (for 70M rows — MUCH worse than SeqScan)

<span class="cmt">-- Crossover: IndexScan beats SeqScan when:</span>
random_page_cost × random_pages < seq_page_cost × total_pages
4.0 × (rows_returned × 1) < 1.0 × 5.25M
→ rows_returned < 1.3M  (~0.37% of table)
      </div>
      <div class="compare-table-wrap" style="margin-top:16px">
        <table class="compare-table">
          <thead><tr><th>Scenario</th><th>Seq I/O</th><th>Random I/O</th><th>Winner</th></tr></thead>
          <tbody>
            ${[
              ['1 row by PK', '5.25M pages', '3 pages (B+ tree)', 'Index (0.00006%)'],
              ['1% of rows (3.5M)', '5.25M pages', '3.5M pages (scattered)', 'SeqScan (parallel)'],
              ['Sorted range, 100 rows', '5.25M pages', '~100 pages (clustered index)', 'Clustered Index'],
              ['Full analytics (COUNT, SUM)', '5.25M pages', 'N/A (no index)', 'SeqScan (parallel + BRIN)'],
              ['Last 10 rows (LIMIT 10)', '5.25M pages sorted', '3 pages (backward index scan)', 'Index (astronomically faster)'],
            ].map(([sc, sq, rn, wn]) => `<tr><td><strong>${sc}</strong></td><td style="font-size:10px">${sq}</td><td style="font-size:10px">${rn}</td><td><strong>${wn}</strong></td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'Why does the PostgreSQL planner have both seq_page_cost and random_page_cost, and how should they be tuned?',
      a: 'seq_page_cost (default 1.0) represents the cost to fetch one page in sequential order — the baseline unit for all cost comparisons. random_page_cost (default 4.0) represents the cost of a random page fetch (index lookup). The 4× default was calibrated for spinning HDDs where seek+rotation takes ~4× longer than sequential read per page. For modern NVMe SSDs, the ratio is closer to 1.1–2×. Tuning: (1) NVMe SSD: set random_page_cost=1.5. This makes the planner prefer index scans more aggressively (lowers their estimated cost). (2) Cloud instances with network-attached storage (EBS gp2): keep random_page_cost=4 or higher — network latency adds to random I/O cost. (3) In-memory workload (all data in shared_buffers): set both to 0.01 — random and sequential are equivalent in RAM. Effect: lowering random_page_cost causes the planner to choose index scans over sequential scans at higher selectivity thresholds.',
      tip: 'On Amazon RDS/Aurora with io1 EBS volumes, set random_page_cost=1.1 — Aurora\'s distributed storage is SSD-backed and delivers near-sequential latency for random reads via its distributed log architecture.',
    },
    {
      q: 'What is a BRIN index and how does it exploit sequential I/O patterns?',
      a: 'BRIN (Block Range INdex) stores per-block-range metadata (min/max column values) rather than per-row TIDs. For a table of 5.25M pages: BRIN might store metadata for every 128-page range (41K ranges) — the index is ~1 MB vs a full B+ tree of several GB. Query: WHERE created_at BETWEEN \'2024-07-16\' AND \'2024-07-17\'. BRIN lookup: read the 1 MB index, find which 128-page ranges overlap the date range, scan only those ranges. For an append-ordered table (orders are inserted in created_at order), BRIN is near-perfect: only ~1% of page ranges need to be scanned for a 1-day window. BRIN exploits sequential I/O because: (1) The matching ranges are contiguous in the file (orders are time-ordered); (2) Sequential scan of those ranges is full-bandwidth I/O. Cost: 1 MB BRIN index read + sequential scan of matching ranges — far cheaper than B+ tree random lookups for range queries on large tables.',
      tip: 'BRIN is ideal for time-series or append-only tables (sensor data, order history, event logs). Useless for tables with random insertion order (UUID primary key tables).',
    },
    {
      q: 'How does read-ahead (prefetching) improve sequential scan performance?',
      a: 'Read-ahead is an OS and storage controller optimization: when sequential page reads are detected, upcoming pages are proactively fetched before they are requested. Linux detects sequential read patterns and automatically issues read-ahead requests (controlled by /sys/block/sda/queue/read_ahead_kb, default 128 KB = 16 pages). PostgreSQL also has its own read-ahead: effective_io_concurrency controls how many concurrent disk I/O requests to issue for bitmap heap scans (default 1; for SSDs set to 200+). PostgreSQL 16+ added io_method=io_uring for asynchronous I/O, eliminating the per-syscall overhead. For SeqScan on a 42 GB orders table: OS read-ahead delivers ~500 MB/s throughput (NVMe) — the scan completes in ~84 seconds vs ~420 seconds with no prefetch. For random I/O (B+ tree leaf lookup): read-ahead is useless — each page read is to a different disk location.',
      tip: 'PostgreSQL\'s effective_io_concurrency parameter (default 1) controls parallel I/O for bitmap scans. Set to 200 on NVMe, 4–16 on SATA SSD, leave at 1 on HDD.',
    },
  ]);
  initIQ(container);

  return () => engine.destroy();
}
