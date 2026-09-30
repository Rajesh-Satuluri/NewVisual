import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

const PAGES = 12; // pages shown in animation
const ROWS_PER_PAGE = 4;
const PAGE_W = 54, PAGE_H = 60, GAP = 8;
const POOL_FRAMES = 4;

function drawSeqScan(ctx, scanPage, w, h) {
  ctx.clearRect(0, 0, w, h);
  const startX = (w - (PAGES * (PAGE_W + GAP))) / 2;

  // Title: disk
  ctx.fillStyle = '#64748B'; ctx.font = '10px system-ui';
  ctx.fillText('DISK — products table (42 GB, 5.25M pages total — showing first 12)', startX, 22);

  // Draw all pages
  for (let i = 0; i < PAGES; i++) {
    const x = startX + i * (PAGE_W + GAP);
    const y = 36;
    const isCurrent = i === scanPage;
    const isDone = i < scanPage;
    ctx.fillStyle = isCurrent ? '#4F46E5' : (isDone ? '#1E2D3D' : '#0F172A');
    ctx.strokeStyle = isCurrent ? '#818CF8' : (isDone ? '#334155' : '#1E293B');
    ctx.lineWidth = isCurrent ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(x, y, PAGE_W, PAGE_H, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = isCurrent ? '#fff' : (isDone ? '#334155' : '#1E293B');
    ctx.font = '8px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(`P${i+1}`, x + PAGE_W/2, y + 12);
    for (let r = 0; r < ROWS_PER_PAGE; r++) {
      ctx.fillStyle = isCurrent ? '#818CF8' : (isDone ? '#1E293B' : '#0F172A');
      ctx.fillRect(x + 6, y + 16 + r * 10, PAGE_W - 12, 7);
    }
    ctx.textAlign = 'left';
  }

  // Buffer pool
  const poolY = 140;
  ctx.fillStyle = '#0F172A';
  ctx.beginPath(); ctx.roundRect(startX, poolY, POOL_FRAMES * (PAGE_W + GAP) - GAP, 80, 6); ctx.fill();
  ctx.strokeStyle = '#06B6D4'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(startX, poolY, POOL_FRAMES * (PAGE_W + GAP) - GAP, 80, 6); ctx.stroke();
  ctx.fillStyle = '#06B6D4'; ctx.font = '10px system-ui';
  ctx.fillText(`Buffer Pool (${POOL_FRAMES} frames)`, startX + 8, poolY + 15);
  for (let f = 0; f < POOL_FRAMES; f++) {
    const fx = startX + f * (PAGE_W + GAP);
    const fy = poolY + 22;
    const inPool = f < Math.min(scanPage + 1, POOL_FRAMES);
    const pageInSlot = scanPage >= POOL_FRAMES ? scanPage - POOL_FRAMES + f + 1 : f;
    ctx.fillStyle = inPool ? '#06B6D4' + '33' : '#0F172A';
    ctx.strokeStyle = inPool ? '#06B6D4' : '#1E293B';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(fx, fy, PAGE_W, 50, 4); ctx.fill(); ctx.stroke();
    if (inPool) {
      ctx.fillStyle = '#06B6D4'; ctx.font = '8px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(`P${pageInSlot + 1}`, fx + PAGE_W/2, fy + 14);
      for (let r = 0; r < ROWS_PER_PAGE; r++) {
        ctx.fillStyle = '#06B6D4' + '44';
        ctx.fillRect(fx + 4, fy + 18 + r * 8, PAGE_W - 8, 5);
      }
      ctx.textAlign = 'left';
    }
  }

  // Eviction note
  if (scanPage >= POOL_FRAMES) {
    ctx.fillStyle = '#F59E0B'; ctx.font = '10px system-ui';
    ctx.fillText(`⟳ Evicting P${scanPage - POOL_FRAMES + 1}, loading P${scanPage + 1}`, startX + POOL_FRAMES * (PAGE_W + GAP) + 8, poolY + 45);
  }

  // Result buffer
  const resY = 260;
  ctx.fillStyle = '#1E2D3D';
  ctx.beginPath(); ctx.roundRect(startX, resY, 300, 60, 6); ctx.fill();
  ctx.fillStyle = '#10B981'; ctx.font = '10px system-ui';
  ctx.fillText(`Result so far: ${Math.min(scanPage + 1, PAGES)} pages scanned`, startX + 8, resY + 18);
  ctx.fillStyle = '#64748B'; ctx.font = '10px system-ui';
  ctx.fillText(`Rows matching filter: 0 — none match product_id = 'B08N5WRWNW' yet`, startX + 8, resY + 36);
  ctx.fillStyle = '#EF4444'; ctx.font = '9px system-ui';
  ctx.fillText(`Wasted: ${Math.min(scanPage + 1, PAGES) * ROWS_PER_PAGE} row evaluations with 0 results`, startX + 8, resY + 52);
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Query Engine · M18',
    title: 'Table Scan (SeqScan)',
    subtitle: 'How a sequential full table scan works — page by page through the heap — and when to avoid it.',
    tabs: [
      { id: 'scan',  label: '🔄 Scan Animation' },
      { id: 'when',  label: '⚖️ When to Use' },
      { id: 'iq',    label: '💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  const scanTab = container.querySelector('#tab-scan');
  scanTab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="canvas-wrap" style="margin-top:12px">
      <canvas width="800" height="360" style="width:100%;max-height:360px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="scan-explainer">
        <h3>Sequential Table Scan</h3>
        <p>A SeqScan reads every page of the table from start to finish — regardless of how many rows
           match the filter. For the Prime Day query with product_id = 'B08N5WRWNW', a SeqScan
           would read all 42 GB to find 1 row. Press <strong>Play</strong> to see why this is catastrophic.</p>
      </div>
    </div>
  `;

  const canvas = scanTab.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const steps = Array.from({ length: PAGES }, (_, i) => ({
    label: `Scan page ${i+1}/${PAGES}`,
    duration: 600,
    mutate: s => { s.page = i; },
  }));

  const engine = new SimulationEngine({
    initialState: { page: -1 },
    steps,
    onRender: state => {
      drawSeqScan(ctx, state.page, 800, 360);
      const el = scanTab.querySelector('#scan-explainer');
      if (el && state.page >= 0) {
        el.innerHTML = `<h3>Page ${state.page + 1} of 5,250,000</h3>
          <p>Reading page ${state.page + 1}. Each page holds ~4 product rows (8KB page / ~2KB average row).
             Buffer pool holds ${POOL_FRAMES} frames — older pages are evicted as new ones arrive.
             ${state.page >= POOL_FRAMES ? `Evicted P${state.page - POOL_FRAMES + 1}, loaded P${state.page + 1}.` : ''}
             At this rate: 5.25M pages × ~0.1ms/page = <strong>~525 seconds</strong> for a full scan.</p>`;
      }
    },
  });
  SimulationEngine.renderControls(scanTab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(scanTab.querySelector('.canvas-wrap'), engine);
  drawSeqScan(ctx, -1, 800, 360);
  engine.reset();

  container.querySelector('#tab-when').innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">SeqScan vs IndexScan — When Each Wins</div>
      </div>
      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead><tr><th>Scenario</th><th>SeqScan</th><th>IndexScan</th><th>Threshold</th></tr></thead>
          <tbody>
            ${[
              ['product_id = B08N5W (1 row)', '❌ 5.25M pages', '✅ 3 pages', '< 0.01% of rows → always IndexScan'],
              ['status = shipped (20% of rows)', '✅ 1.05M pages sequential', '❌ random I/O for 70M rows', '> 5–10% of rows → SeqScan wins on HDD'],
              ['Full analytics query (no filter)', '✅ Only option', '❌ Cannot help', '100% rows needed'],
              ['price BETWEEN 10 AND 20 (15%)', '✅ Sequential is faster', '⚠️ Bitmap IndexScan possible', 'With NVMe SSD: IndexScan may still win'],
              ['category = Electronics (8M rows)', '⚠️ SeqScan likely', '⚠️ Bitmap heap scan', 'Depends on category column statistics'],
              ['Parallel workers available', '✅ Parallel SeqScan', '❌ Cannot parallelize', 'Large tables: parallel SeqScan >> serial'],
            ].map(([s, seq, idx, t]) => `<tr><td><strong>${s}</strong></td><td>${seq}</td><td>${idx}</td><td style="font-size:10px">${t}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="prose" style="padding-top:20px">
        <h3>The 5–10% Rule of Thumb</h3>
        <p>On HDDs, IndexScan beats SeqScan when selectivity < ~5% of rows. On NVMe SSDs,
           the threshold drops to ~1–2%. This is because: IndexScan does random I/O (each B+tree
           leaf + heap page is a separate random read); SeqScan does sequential I/O (streaming).
           Sequential I/O is ~4× faster than random on SSD and ~40× on HDD.
           PostgreSQL encodes this in <code>random_page_cost</code> (default 4.0, optimal 1.1 for SSD).</p>
        <h3>Parallel SeqScan</h3>
        <p>For large analytical queries, PostgreSQL spawns parallel workers to split the SeqScan.
           4 workers → each reads 1/4 of the pages → ~4× faster. OLTP queries (1 row returned) never
           benefit from parallel scans. OLAP queries (millions of rows) benefit significantly.</p>
      </div>
    </div>
  `;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'What happens in the buffer pool during a sequential scan?',
      a: 'The SeqScan fetches pages one by one in physical storage order. For each page: (1) check if already in buffer pool; (2) if not, evict a frame using the replacement policy (LRU/Clock); (3) read the page from disk into the evicted frame; (4) iterate over each row, apply the WHERE filter; (5) if the row passes, add it to the result. Large SeqScans thrash the buffer pool — a single 42 GB scan evicts all hot OLTP pages from the pool, causing cache misses for concurrent queries. PostgreSQL uses a ring buffer for SeqScans to prevent this (evicts the scan pages first, protecting the hot pages).',
      tip: 'SeqScan ring buffer is a key PostgreSQL optimization. EXPLAIN ANALYZE shows "Buffers: shared hit/read" — a full scan shows mostly "read" (disk), not "hit" (cache).',
    },
    {
      q: 'When is a SeqScan faster than an IndexScan even with a selective predicate?',
      a: 'If the rows are physically scattered across many pages (low correlation between index order and heap order), IndexScan causes many random disk reads — each row may be on a different page. A SeqScan reads pages sequentially and evaluates all rows at once. The crossover point: if more than ~10% of pages need to be visited for matching rows, a SeqScan with one sequential pass may be faster than IndexScan with many random reads. PostgreSQL uses the <code>correlation</code> statistic in pg_statistic: correlation ≈ 1.0 means the physical and logical orders match → IndexScan is safe. Correlation ≈ 0 → consider a Bitmap Index Scan (collects all TIDs first, then reads heap in physical order).',
      tip: 'Bitmap Index Scan is the hybrid: collect all matching TIDs (index traversal), sort by physical page number, then read heap sequentially. Best for 1–10% selectivity on unsorted data.',
    },
    {
      q: 'What is a covering index and how does it eliminate the heap fetch?',
      a: 'A covering index (Index-Only Scan in PostgreSQL) includes all columns needed by the query in the index itself. Example: <code>CREATE INDEX ON products (product_id) INCLUDE (name, price)</code>. The query <code>SELECT name, price FROM products WHERE product_id = \'B08N5WRWNW\'</code> can be answered entirely from the B+ tree leaf — no heap page read needed. This turns 2 I/Os (index + heap) into 1 (index only). However: it only works if the visibility map shows all pages are "all-visible" (vacuumed clean). Otherwise PG still checks the heap to verify tuple visibility.',
      tip: 'EXPLAIN output shows "Index Only Scan" and "Heap Fetches: 0" for a perfect covering index hit. Heap Fetches > 0 means some visibility map bits are dirty — run VACUUM.',
    },
  ]);
  initIQ(container);

  return () => engine.destroy();
}
