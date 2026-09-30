import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

// Buffer pool: 6 frames, simulate page requests
const POOL_SIZE = 6;

const BP_OPS = [
  // { op: 'read'|'evict'|'dirty'|'pin'|'unpin', page, frame, desc }
  { op: 'init', desc: 'Buffer pool initialized: 6 frames in shared memory (shared_buffers). All frames empty. No pages loaded. Every read will be a disk fetch (miss).' },
  { op: 'miss', page: 1, frame: 0, desc: 'Request page 1 (orders table, page 0). Buffer pool miss — not in memory. Read from disk → load into frame 0. Pin count = 1 (query is reading). Reference bit set.' },
  { op: 'miss', page: 2, frame: 1, desc: 'Request page 2 (orders, page 1). Miss → disk read → frame 1. Two frames now occupied.' },
  { op: 'miss', page: 3, frame: 2, desc: 'Request page 3 (products table). Miss → disk read → frame 2. 3/6 frames used.' },
  { op: 'miss', page: 4, frame: 3, desc: 'Request page 4 (inventory index leaf). Miss → disk read → frame 3. 4/6 frames used.' },
  { op: 'hit',  page: 1, frame: 0, desc: 'Request page 1 again. Buffer pool HIT — already in frame 0. No disk I/O. Pin count incremented. This is the key performance benefit of the buffer pool: cache hot pages.' },
  { op: 'dirty', page: 2, frame: 1, desc: 'UPDATE on order in page 2. Modified in frame 1 (in DRAM). Frame marked dirty = true. Disk page is now stale. WAL record written first (Write-Ahead Logging) before the page is considered durably modified.' },
  { op: 'miss', page: 5, frame: 4, desc: 'Request page 5 (customers). Miss → frame 4. 5/6 frames used.' },
  { op: 'miss', page: 6, frame: 5, desc: 'Request page 6 (payments). Miss → frame 5. Buffer pool full: all 6 frames occupied.' },
  { op: 'evict', evictFrame: 2, page: 7, frame: 2, desc: 'Request page 7. Pool full. Must evict a frame. Clock/LRU selects frame 2 (page 3 — not recently used, not dirty, pin=0). Evict page 3 to disk? No — it\'s clean (not modified). Just overwrite frame 2 with page 7.' },
  { op: 'evict-dirty', evictFrame: 1, page: 8, frame: 1, desc: 'Request page 8. Evict frame 1 (page 2 — dirty!). Must write dirty page 2 to disk before eviction (flush). Then load page 8 into frame 1. bgwriter daemon pre-flushes dirty frames to reduce eviction stalls.' },
  { op: 'unpin', page: 1, frame: 0, desc: 'Query using page 1 completes. Pin count decremented to 0. Page 1 is now eviction candidate. Pin > 0 = cannot evict (frame in use). Pin = 0 = available for replacement.' },
];

function initFrames() {
  return Array.from({ length: POOL_SIZE }, (_, i) => ({
    id: i, page: null, dirty: false, pinCount: 0, refBit: false, accessed: 0,
  }));
}

function applyOp(frames, op) {
  const f = JSON.parse(JSON.stringify(frames));
  if (op.op === 'miss') {
    f[op.frame] = { id: op.frame, page: op.page, dirty: false, pinCount: 1, refBit: true, accessed: op.frame };
  } else if (op.op === 'hit') {
    const fr = f.find(fr => fr.page === op.page);
    if (fr) { fr.pinCount++; fr.refBit = true; }
  } else if (op.op === 'dirty') {
    const fr = f.find(fr => fr.page === op.page);
    if (fr) fr.dirty = true;
  } else if (op.op === 'evict') {
    f[op.evictFrame] = { id: op.evictFrame, page: op.page, dirty: false, pinCount: 1, refBit: true, accessed: op.evictFrame };
  } else if (op.op === 'evict-dirty') {
    f[op.evictFrame] = { id: op.evictFrame, page: op.page, dirty: false, pinCount: 1, refBit: true, accessed: op.evictFrame };
  } else if (op.op === 'unpin') {
    const fr = f.find(fr => fr.page === op.page);
    if (fr) fr.pinCount = Math.max(0, fr.pinCount - 1);
  }
  return f;
}

function makeBPSteps() {
  let frames = initFrames();
  return BP_OPS.map((op, i) => {
    if (i > 0) frames = applyOp(frames, op);
    return { op, frames: JSON.parse(JSON.stringify(frames)), stepIdx: i };
  });
}

const BP_STEPS = makeBPSteps();
const PAGE_COLORS = { 1: '#4F46E5', 2: '#10B981', 3: '#06B6D4', 4: '#F59E0B', 5: '#8B5CF6', 6: '#EF4444', 7: '#EC4899', 8: '#14B8A6' };

function drawBP(ctx, stepIdx, w, h) {
  ctx.clearRect(0, 0, w, h);
  if (stepIdx < 0) {
    ctx.fillStyle = '#475569'; ctx.font = '13px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('Press Play to watch buffer pool: miss → load → hit → dirty → evict', w/2, h/2);
    ctx.textAlign = 'left'; return;
  }

  const step = BP_STEPS[stepIdx];
  const frameW = 110, frameH = 90, cols = 3;
  const startX = 30, startY = 50, gap = 16;

  // Header
  ctx.fillStyle = '#64748B'; ctx.font = '700 10px system-ui';
  ctx.fillText('Buffer Pool — Shared Memory Frames (shared_buffers)', startX, 32);

  // Disk label
  const diskX = startX + cols * (frameW + gap) + 20;
  ctx.fillStyle = '#475569'; ctx.font = '700 10px system-ui';
  ctx.fillText('Disk / WAL', diskX, 32);
  ctx.fillStyle = '#1E293B'; ctx.lineWidth = 1.5; ctx.strokeStyle = '#334155';
  ctx.beginPath(); ctx.roundRect(diskX, 40, 120, 60, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#475569'; ctx.font = '9px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('Pages 1–N', diskX + 60, 73);
  ctx.textAlign = 'left';

  // Op badge
  const op = step.op;
  const badgeColor = op.op === 'hit' ? '#10B981' : op.op.startsWith('evict') ? '#EF4444' : op.op === 'dirty' ? '#F59E0B' : '#4F46E5';
  const badgeLabel = op.op === 'miss' ? 'MISS → disk read' : op.op === 'hit' ? 'HIT ✓' : op.op === 'dirty' ? 'DIRTY mark' : op.op === 'evict' ? 'EVICT (clean)' : op.op === 'evict-dirty' ? 'EVICT + flush' : op.op === 'unpin' ? 'UNPIN' : 'INIT';
  ctx.fillStyle = badgeColor + '22';
  ctx.beginPath(); ctx.roundRect(diskX, 110, 140, 24, 4); ctx.fill();
  ctx.strokeStyle = badgeColor; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(diskX, 110, 140, 24, 4); ctx.stroke();
  ctx.fillStyle = badgeColor; ctx.font = '700 10px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(badgeLabel, diskX + 70, 127);
  ctx.textAlign = 'left';

  // Stats
  const loaded = step.frames.filter(f => f.page !== null).length;
  const dirty = step.frames.filter(f => f.dirty).length;
  const pinned = step.frames.filter(f => f.pinCount > 0).length;
  ctx.fillStyle = '#475569'; ctx.font = '9px system-ui';
  ctx.fillText(`Loaded: ${loaded}/${POOL_SIZE}  Dirty: ${dirty}  Pinned: ${pinned}`, diskX, 148);

  // Frames
  step.frames.forEach((frame, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = startX + col * (frameW + gap);
    const y = startY + row * (frameH + gap);

    const isActive = (op.frame === i && op.op !== 'unpin') || (op.evictFrame === i);
    const col2 = frame.page ? (PAGE_COLORS[frame.page] || '#64748B') : '#1E293B';

    ctx.fillStyle = frame.page ? col2 + '22' : '#0A0F1A';
    ctx.strokeStyle = isActive ? col2 : (frame.page ? col2 + '66' : '#1E293B');
    ctx.lineWidth = isActive ? 2.5 : 1;
    ctx.beginPath(); ctx.roundRect(x, y, frameW, frameH, 8); ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#475569'; ctx.font = '700 9px system-ui';
    ctx.fillText(`Frame ${i}`, x + 6, y + 14);

    if (frame.page) {
      ctx.fillStyle = col2; ctx.font = '700 13px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(`Page ${frame.page}`, x + frameW/2, y + 40);
      ctx.textAlign = 'left';

      // Flags
      const flags = [];
      if (frame.dirty) flags.push({ text: 'DIRTY', col: '#F59E0B' });
      if (frame.pinCount > 0) flags.push({ text: `pin=${frame.pinCount}`, col: '#10B981' });
      if (frame.refBit) flags.push({ text: 'ref=1', col: '#818CF8' });
      flags.forEach((fl, fi) => {
        ctx.fillStyle = fl.col + '33';
        ctx.beginPath(); ctx.roundRect(x + 6 + fi * 38, y + 52, 34, 14, 3); ctx.fill();
        ctx.fillStyle = fl.col; ctx.font = '7px monospace';
        ctx.fillText(fl.text, x + 8 + fi * 38, y + 62);
      });
    } else {
      ctx.fillStyle = '#334155'; ctx.font = '9px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('empty', x + frameW/2, y + frameH/2 + 3);
      ctx.textAlign = 'left';
    }
  });

  // Footer
  ctx.fillStyle = '#1E293B';
  ctx.beginPath(); ctx.roundRect(startX, h - 44, w - 40, 36, 4); ctx.fill();
  ctx.fillStyle = '#64748B'; ctx.font = '10px system-ui';
  const words = op.desc.split(' ');
  let line = '', ly = h - 28, maxW = w - 60;
  words.forEach(word => {
    const test = line + (line ? ' ' : '') + word;
    if (ctx.measureText(test).width > maxW) {
      ctx.fillText(line, startX + 8, ly); line = word; ly += 13;
    } else line = test;
  });
  if (line) ctx.fillText(line, startX + 8, ly);
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Storage Engine · M30',
    title: 'Buffer Pool',
    subtitle: 'Shared memory frames in PostgreSQL — miss, hit, dirty, pin, evict. The most critical performance lever in any RDBMS.',
    tabs: [
      { id: 'pool',    label: '🏊 Buffer Pool' },
      { id: 'tuning',  label: '⚙️ Tuning' },
      { id: 'iq',      label: '💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  const poolTab = container.querySelector('#tab-pool');
  poolTab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="canvas-wrap" style="margin-top:12px">
      <canvas width="800" height="400" style="width:100%;max-height:400px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="bp-explainer">
        <h3>Buffer Pool (shared_buffers)</h3>
        <p>PostgreSQL allocates shared_buffers as a fixed pool of 8 KB frames in shared memory.
           All backends share this pool. Every disk page must pass through the buffer pool.
           Press <strong>Play</strong> to trace page requests through the pool.</p>
      </div>
    </div>
  `;

  const canvas = poolTab.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const engine = new SimulationEngine({
    initialState: { step: -1 },
    steps: BP_STEPS.map((s, i) => ({ label: s.op.op, duration: 2000, mutate: st => { st.step = i; } })),
    onRender: state => {
      drawBP(ctx, state.step, 800, 400);
      const el = poolTab.querySelector('#bp-explainer');
      if (el && state.step >= 0) {
        const s = BP_STEPS[state.step];
        el.innerHTML = `<h3>Step ${state.step + 1}: ${s.op.op.toUpperCase()}</h3><p>${s.op.desc}</p>`;
      }
    },
  });
  SimulationEngine.renderControls(poolTab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(poolTab.querySelector('.canvas-wrap'), engine);
  drawBP(ctx, -1, 800, 400);
  engine.reset();

  container.querySelector('#tab-tuning').innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">Buffer Pool Tuning for Prime Day Workloads</div>
        <div class="section-desc">shared_buffers is the single most important PostgreSQL memory setting</div>
      </div>
      <div class="code-block" style="font-size:11px">
<span class="cmt">-- Key buffer pool settings (postgresql.conf):</span>
shared_buffers = 32GB          <span class="cmt">-- 25% of RAM (64 GB server = 16 GB rule of thumb)</span>
effective_cache_size = 48GB    <span class="cmt">-- RAM available for OS page cache (informs planner only)</span>
work_mem = 64MB                <span class="cmt">-- per-sort/hash-join allocation (careful: N connections × work_mem)</span>
maintenance_work_mem = 1GB     <span class="cmt">-- VACUUM, CREATE INDEX, ALTER TABLE ADD FK</span>
bgwriter_lru_maxpages = 100    <span class="cmt">-- dirty pages bgwriter flushes per round</span>
bgwriter_delay = 200ms         <span class="cmt">-- bgwriter sleep between rounds</span>
checkpoint_completion_target = 0.9  <span class="cmt">-- spread checkpoint I/O over 90% of checkpoint_timeout</span>

<span class="cmt">-- Monitor buffer pool hit ratio (should be >99%):</span>
SELECT
  sum(blks_hit)::float / nullif(sum(blks_hit) + sum(blks_read), 0) AS hit_ratio
FROM pg_stat_database;

<span class="cmt">-- Pages loaded per table:</span>
SELECT relname, heap_blks_hit, heap_blks_read,
  round(heap_blks_hit::numeric / nullif(heap_blks_hit+heap_blks_read,0)*100,1) AS hit_pct
FROM pg_statio_user_tables ORDER BY heap_blks_read DESC;
      </div>
      <div class="info-grid" style="padding-top:14px">
        ${[
          { label: 'shared_buffers (25% RAM rule)', color: '#4F46E5', desc: 'PostgreSQL\'s main buffer pool. Frames are 8 KB. Common: 4–32 GB. Beyond 8 GB, Linux THP and large-page configuration help. Increasing reduces disk reads — most impactful single change for read-heavy workloads.' },
          { label: 'effective_cache_size', color: '#10B981', desc: 'Estimate of total memory available for caching (shared_buffers + OS page cache). Used by the query planner — higher values make the planner prefer index scans over seq scans. Does NOT allocate memory.' },
          { label: 'work_mem', color: '#06B6D4', desc: 'Memory per sort/hash operation. One query can use multiple sorts in parallel. Total = work_mem × max_connections × sorts_per_query. Too high → OOM. Too low → sort spills to disk (check "Sort Method: external merge" in EXPLAIN ANALYZE).' },
          { label: 'bgwriter', color: '#F59E0B', desc: 'Background writer daemon that proactively flushes dirty frames to disk — reduces eviction stalls by ensuring clean frames are available. Tune bgwriter_lru_maxpages and bgwriter_delay for high-write workloads like Prime Day.' },
          { label: 'Buffer pin protocol', color: '#8B5CF6', desc: 'Before reading a frame, a backend pins it (increments pin count). Pin = 0 → evictable. Pin > 0 → must not evict. Pins are dropped when done with the page. A stuck pin (crash before unpin) is a crash recovery concern — WAL handles this.' },
          { label: 'Dirty page flush (WAL first)', color: '#EF4444', desc: 'WAL is written before a dirty page is flushed to disk (Write-Ahead Logging). This ensures crash recovery: even if a dirty page in memory is lost, WAL has the redo record. Never flush the heap page before its WAL record is durable.' },
        ].map(e => `
          <div class="info-card" style="border-color:${e.color}33">
            <div style="font-weight:700;font-size:11px;color:${e.color};margin-bottom:6px">${e.label}</div>
            <div class="info-card-body">${e.desc}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'How does PostgreSQL\'s buffer pool differ from InnoDB\'s buffer pool?',
      a: 'Both maintain a shared pool of 8–16 KB page frames in DRAM, but differ significantly: (1) <strong>Scope:</strong> PostgreSQL shared_buffers is a shared-memory segment mapped by all backends; InnoDB has a single global pool. (2) <strong>Replacement:</strong> PostgreSQL uses a Clock-based algorithm (cheap, O(1)); InnoDB uses a modified LRU with "midpoint insertion" — new pages enter at the 3/8 point, promoted to the hot list on second access (prevents full-table scans from evicting frequently-used pages). (3) <strong>OS page cache:</strong> PostgreSQL reads/writes go through both shared_buffers AND the OS page cache (double buffering), using effective_cache_size to account for OS caching in planning; InnoDB uses O_DIRECT to bypass OS page cache. (4) <strong>Lock granularity:</strong> PostgreSQL has a buffer descriptor lock (LW_LOCK) per frame; InnoDB has a buffer pool mutex and list locks. (5) <strong>WAL and dirty tracking:</strong> Both use WAL-before-flush, but track dirty pages differently (PostgreSQL: dirty bit per frame; InnoDB: dirty list with LSN tracking).',
      tip: 'A key Prime Day interview question: "Why does a 200 GB database with 32 GB shared_buffers still have low latency for hot tables?" — Working set (hot pages) fits in shared_buffers; cold data pages are evicted.',
    },
    {
      q: 'What is the bgwriter daemon and why is it important for write-heavy workloads?',
      a: 'The bgwriter (background writer) is a PostgreSQL daemon that proactively flushes dirty buffer frames to disk. Without it, eviction happens during the critical path of a query — when the pool is full and a new page is needed, the requesting backend must flush the dirty frame itself (a "forced eviction" stall). Bgwriter prevents this by keeping a reserve of clean frames ready. Key behavior: every bgwriter_delay ms (default 200ms), it scans up to bgwriter_lru_maxpages (default 100) frames starting from the LRU end, flushing dirty ones. For Prime Day write surges: (1) Increase bgwriter_lru_maxpages to 500; (2) Reduce bgwriter_delay to 50ms; (3) Monitor pg_stat_bgwriter.buffers_backend — high values mean bgwriter is falling behind and backends are doing their own flushes. Also: checkpoint process flushes all dirty pages at checkpoints (checkpoint_timeout, typically 5 min) — checkpoint I/O spikes cause latency spikes; tune checkpoint_completion_target=0.9 to spread I/O.',
      tip: 'Checkpoint storms are a classic Prime Day performance problem: every checkpoint_timeout minutes, a sudden burst of disk writes causes query latency spikes. Monitor via pg_stat_bgwriter.checkpoints_timed.',
    },
    {
      q: 'What does "buffer hit ratio" measure and what is an acceptable value?',
      a: 'Buffer hit ratio = blks_hit / (blks_hit + blks_read). blks_hit = page requests served from shared_buffers (in memory). blks_read = page requests that required reading from disk (or OS cache). Target: >99% for OLTP. At 99%: 1 in 100 page requests hits disk. At 98%: 2× more disk I/O. Below 95% is critical — the working set doesn\'t fit in shared_buffers. Queries to diagnose: (1) pg_stat_database for database-wide ratio; (2) pg_statio_user_tables for per-table; (3) pg_statio_user_indexes for per-index. A low ratio on a specific index means index pages don\'t stay cached — the index may be too large or scanned too infrequently to benefit from caching. Fix: increase shared_buffers, reduce working set (partition large tables), or use pg_prewarm to preload hot pages after restart.',
      tip: 'Buffer hit ratio includes OS page cache hits in PostgreSQL (unlike InnoDB which uses O_DIRECT). True disk hit ratio requires pg_statio which only counts OS-bypassing reads — rare in practice.',
    },
  ]);
  initIQ(container);

  return () => engine.destroy();
}
