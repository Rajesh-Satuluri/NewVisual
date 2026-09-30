import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

// Reference string for replacement policy simulation
const REF_STRING = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5];
const POOL_SIZE = 3;

// LRU simulation
function simulateLRU(refs, capacity) {
  const steps = [];
  let pool = []; // most recent last
  let hits = 0, misses = 0;
  refs.forEach((page, i) => {
    const inPool = pool.includes(page);
    if (inPool) {
      hits++;
      pool = pool.filter(p => p !== page);
      pool.push(page);
      steps.push({ pool: [...pool], page, hit: true, evicted: null, hits, misses });
    } else {
      misses++;
      let evicted = null;
      if (pool.length >= capacity) { evicted = pool.shift(); }
      pool.push(page);
      steps.push({ pool: [...pool], page, hit: false, evicted, hits, misses });
    }
  });
  return steps;
}

// Clock simulation
function simulateClock(refs, capacity) {
  const steps = [];
  const frames = Array(capacity).fill(null).map(() => ({ page: null, ref: false }));
  let hand = 0;
  let hits = 0, misses = 0;
  refs.forEach((page, i) => {
    const fi = frames.findIndex(f => f.page === page);
    if (fi !== -1) {
      hits++;
      frames[fi].ref = true;
      steps.push({ frames: frames.map(f => ({ ...f })), page, hit: true, hand, evicted: null, hits, misses });
    } else {
      misses++;
      let evicted = null;
      while (frames[hand].ref) {
        frames[hand].ref = false;
        hand = (hand + 1) % capacity;
      }
      evicted = frames[hand].page;
      frames[hand] = { page, ref: true };
      hand = (hand + 1) % capacity;
      steps.push({ frames: frames.map(f => ({ ...f })), page, hit: false, hand, evicted, hits, misses });
    }
  });
  return steps;
}

const LRU_STEPS = simulateLRU(REF_STRING, POOL_SIZE);
const CLOCK_STEPS = simulateClock(REF_STRING, POOL_SIZE);

const PAGE_COLORS = [null, '#4F46E5','#10B981','#06B6D4','#F59E0B','#8B5CF6','#EF4444'];

function drawComparison(ctx, stepIdx, w, h) {
  ctx.clearRect(0, 0, w, h);

  const lruStep = stepIdx >= 0 ? LRU_STEPS[Math.min(stepIdx, LRU_STEPS.length - 1)] : null;
  const clkStep = stepIdx >= 0 ? CLOCK_STEPS[Math.min(stepIdx, CLOCK_STEPS.length - 1)] : null;

  // Reference string
  const rsX = 20, rsY = 20, cellW = 48, cellH = 28;
  ctx.fillStyle = '#64748B'; ctx.font = '700 10px system-ui';
  ctx.fillText(`Reference String (${POOL_SIZE} frames):`, rsX, rsY);
  REF_STRING.forEach((p, i) => {
    const x = rsX + i * (cellW + 2), y = rsY + 10;
    const isActive = stepIdx === i;
    const isPast = stepIdx > i;
    const col = PAGE_COLORS[p] || '#475569';
    ctx.fillStyle = isActive ? col : (isPast ? col + '55' : '#0A0F1A');
    ctx.strokeStyle = isActive ? col : '#1E293B'; ctx.lineWidth = isActive ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(x, y, cellW - 2, cellH, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = isActive ? '#fff' : (isPast ? col : '#475569');
    ctx.font = (isActive ? '700' : '400') + ' 12px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(`P${p}`, x + cellW/2 - 1, y + cellH/2 + 4);
    ctx.textAlign = 'left';
  });

  const sectionY = rsY + cellH + 28;
  const halfW = (w - 60) / 2;

  // LRU panel
  const lX = 20;
  ctx.fillStyle = '#4F46E5'; ctx.font = '700 11px system-ui';
  ctx.fillText('LRU (Least Recently Used)', lX, sectionY);
  if (lruStep) {
    const col = lruStep.hit ? '#10B981' : '#EF4444';
    ctx.fillStyle = col + '22';
    ctx.beginPath(); ctx.roundRect(lX, sectionY + 8, halfW, 22, 4); ctx.fill();
    ctx.fillStyle = col; ctx.font = '700 10px system-ui';
    ctx.fillText(`${lruStep.hit ? '✓ HIT' : '✗ MISS'} — Page ${lruStep.page}${lruStep.evicted ? ` (evict P${lruStep.evicted})` : ''}`, lX + 6, sectionY + 23);

    ctx.fillStyle = '#64748B'; ctx.font = '9px system-ui';
    ctx.fillText('Pool (LRU ← → MRU):', lX, sectionY + 44);
    lruStep.pool.forEach((p, pi) => {
      const x = lX + pi * 64, y = sectionY + 50;
      const col2 = PAGE_COLORS[p] || '#475569';
      const isNew = !lruStep.hit && pi === lruStep.pool.length - 1;
      ctx.fillStyle = col2 + (isNew ? '44' : '22');
      ctx.strokeStyle = col2 + (isNew ? 'FF' : '88'); ctx.lineWidth = isNew ? 2 : 1;
      ctx.beginPath(); ctx.roundRect(x, y, 56, 36, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = col2; ctx.font = '700 13px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(`P${p}`, x + 28, y + 22);
      ctx.textAlign = 'left';
      if (pi === 0) { ctx.fillStyle = '#475569'; ctx.font = '7px system-ui'; ctx.textAlign = 'center'; ctx.fillText('LRU', x + 28, y + 46); ctx.textAlign = 'left'; }
      if (pi === lruStep.pool.length - 1) { ctx.fillStyle = '#475569'; ctx.font = '7px system-ui'; ctx.textAlign = 'center'; ctx.fillText('MRU', x + 28, y + 46); ctx.textAlign = 'left'; }
    });

    ctx.fillStyle = '#10B981'; ctx.font = '700 10px system-ui';
    ctx.fillText(`Hits: ${lruStep.hits}  Misses: ${lruStep.misses}  (Hit rate: ${Math.round(lruStep.hits / (lruStep.hits + lruStep.misses) * 100)}%)`, lX, sectionY + 108);
  }

  // Divider
  ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(lX + halfW + 20, sectionY - 10); ctx.lineTo(lX + halfW + 20, sectionY + 130); ctx.stroke();

  // Clock panel
  const rX = lX + halfW + 40;
  ctx.fillStyle = '#06B6D4'; ctx.font = '700 11px system-ui';
  ctx.fillText('Clock (Second Chance)', rX, sectionY);
  if (clkStep) {
    const col = clkStep.hit ? '#10B981' : '#EF4444';
    ctx.fillStyle = col + '22';
    ctx.beginPath(); ctx.roundRect(rX, sectionY + 8, halfW, 22, 4); ctx.fill();
    ctx.fillStyle = col; ctx.font = '700 10px system-ui';
    ctx.fillText(`${clkStep.hit ? '✓ HIT' : '✗ MISS'} — Page ${clkStep.page}${clkStep.evicted ? ` (evict P${clkStep.evicted})` : ''}`, rX + 6, sectionY + 23);

    ctx.fillStyle = '#64748B'; ctx.font = '9px system-ui';
    ctx.fillText('Frames (hand →):', rX, sectionY + 44);
    const circR = 36, cX = rX + 80, cY = sectionY + 100;
    clkStep.frames.forEach((frame, fi) => {
      const angle = (fi / POOL_SIZE) * Math.PI * 2 - Math.PI / 2;
      const fx = cX + Math.cos(angle) * circR;
      const fy = cY + Math.sin(angle) * circR;
      const isHand = clkStep.hand === (fi + 1) % POOL_SIZE;
      const col2 = frame.page ? (PAGE_COLORS[frame.page] || '#475569') : '#1E293B';
      ctx.fillStyle = col2 + '33'; ctx.strokeStyle = isHand ? '#06B6D4' : col2 + '88'; ctx.lineWidth = isHand ? 2.5 : 1;
      ctx.beginPath(); ctx.arc(fx, fy, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = frame.page ? col2 : '#334155'; ctx.font = '700 10px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(frame.page ? `P${frame.page}` : '—', fx, fy + 3);
      ctx.fillStyle = frame.ref ? '#10B981' : '#475569'; ctx.font = '7px system-ui';
      ctx.fillText(`ref=${frame.ref ? 1 : 0}`, fx, fy + 13);
      ctx.textAlign = 'left';
    });
    // Clock hand
    const handAngle = ((clkStep.hand - 1 + POOL_SIZE) % POOL_SIZE / POOL_SIZE) * Math.PI * 2 - Math.PI / 2;
    ctx.strokeStyle = '#06B6D4'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cX, cY); ctx.lineTo(cX + Math.cos(handAngle) * 28, cY + Math.sin(handAngle) * 28); ctx.stroke();

    ctx.fillStyle = '#10B981'; ctx.font = '700 10px system-ui';
    ctx.fillText(`Hits: ${clkStep.hits}  Misses: ${clkStep.misses}  (Hit rate: ${Math.round(clkStep.hits / (clkStep.hits + clkStep.misses) * 100)}%)`, rX, sectionY + 108);
  }

  if (stepIdx < 0) {
    ctx.fillStyle = '#475569'; ctx.font = '12px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('Press Play to compare LRU vs Clock replacement side by side', w/2, h/2);
    ctx.textAlign = 'left';
  }

  // Footer
  if (stepIdx >= 0) {
    ctx.fillStyle = '#1E293B';
    ctx.beginPath(); ctx.roundRect(20, h - 38, w - 40, 30, 4); ctx.fill();
    const lhits = lruStep.hits, lmisses = lruStep.misses;
    const chits = clkStep.hits, cmisses = clkStep.misses;
    ctx.fillStyle = '#94A3B8'; ctx.font = '9px system-ui';
    ctx.fillText(`Reference: P${REF_STRING[Math.min(stepIdx, REF_STRING.length-1)]}   LRU: ${lhits}H/${lmisses}M   Clock: ${chits}H/${cmisses}M   Note: Clock approximates LRU with O(1) overhead vs O(N) for true LRU`, 28, h - 18);
  }
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Storage Engine · M31',
    title: 'Buffer Pool Replacement',
    subtitle: 'LRU, Clock, LRU-K — which frame to evict when the pool is full during a Prime Day traffic spike.',
    tabs: [
      { id: 'policy', label: '♻️ LRU vs Clock' },
      { id: 'lruk',   label: '📈 LRU-K & Beyond' },
      { id: 'iq',     label: '💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  const policyTab = container.querySelector('#tab-policy');
  policyTab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="canvas-wrap" style="margin-top:12px">
      <canvas width="800" height="380" style="width:100%;max-height:380px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="repl-explainer">
        <h3>LRU vs Clock Replacement Policies</h3>
        <p>Reference string: <strong>[${REF_STRING.join(', ')}]</strong> with pool size 3.
           LRU evicts the least-recently-used frame (tracks full recency). Clock approximates LRU
           with a circular hand and reference bits — O(1) per eviction.
           Press <strong>Play</strong> to step through both simultaneously.</p>
      </div>
    </div>
  `;

  const canvas = policyTab.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const maxSteps = Math.max(LRU_STEPS.length, CLOCK_STEPS.length);
  const engine = new SimulationEngine({
    initialState: { step: -1 },
    steps: Array.from({ length: maxSteps }, (_, i) => ({
      label: `P${REF_STRING[i]}`,
      duration: 1800,
      mutate: st => { st.step = i; },
    })),
    onRender: state => {
      drawComparison(ctx, state.step, 800, 380);
      const el = policyTab.querySelector('#repl-explainer');
      if (el && state.step >= 0) {
        const lru = LRU_STEPS[state.step];
        const clk = CLOCK_STEPS[state.step];
        el.innerHTML = `<h3>Step ${state.step + 1}: Reference Page ${REF_STRING[state.step]}</h3>
          <p>LRU: ${lru.hit ? 'HIT' : 'MISS' + (lru.evicted ? ` → evict P${lru.evicted}` : '')} &nbsp;|&nbsp;
             Clock: ${clk.hit ? 'HIT' : 'MISS' + (clk.evicted ? ` → evict P${clk.evicted}` : '')}</p>`;
      }
    },
  });
  SimulationEngine.renderControls(policyTab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(policyTab.querySelector('.canvas-wrap'), engine);
  drawComparison(ctx, -1, 800, 380);
  engine.reset();

  container.querySelector('#tab-lruk').innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">LRU-K, 2Q, and ARC — Advanced Replacement Policies</div>
        <div class="section-desc">LRU is vulnerable to sequential scans evicting hot pages — modern databases use smarter algorithms</div>
      </div>
      <div class="prose">
        <h3>The Sequential Scan Problem (LRU is Naive)</h3>
        <p>During a full table scan (SeqScan on orders table: 5 million pages), LRU evicts all the hot "working set" pages
           from the buffer pool — replaced by cold scan pages that are read once and never again.
           After the scan, every subsequent OLTP query is a buffer miss. This is called "LRU pollution" or "scan thrashing".</p>
      </div>
      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead><tr><th>Policy</th><th>Algorithm</th><th>Scan Resistant?</th><th>Used By</th></tr></thead>
          <tbody>
            ${[
              ['LRU', 'Evict the frame with the oldest last-access time. O(N) to find LRU frame (or O(1) with doubly-linked list + hash).', '❌ Full scans evict hot pages', 'Simple systems, toy DBs'],
              ['Clock (Second Chance)', 'Circular hand; frames have ref bit. If ref=1 on pass: clear to 0, advance. If ref=0: evict. O(1) amortized.', '⚠️ Better, but still vulnerable', 'PostgreSQL (default)'],
              ['LRU-K (K=2)', 'Track K most recent access times per frame. Evict frame with oldest K-th access. New pages get +∞ age until seen K times — scan pages never "age in".', '✅ Excellent scan resistance', 'SQL Server (2014+), academic DBs'],
              ['2Q (Two Queue)', 'Two-queue model: new pages enter Kin (FIFO queue). After second access → promoted to Kout (LRU queue). Scan pages cycle through Kin and are evicted without polluting Kout.', '✅ Practical scan resistance', 'MySQL (variant), InnoDB midpoint'],
              ['ARC (Adaptive Replacement)', 'Four lists: T1 (recent once), T2 (recent twice), B1 (ghost: evicted from T1), B2 (ghost: evicted from T2). Dynamically adjusts T1/T2 split based on ghost hits.', '✅ Self-tuning, excellent hit rate', 'ZFS, Solaris'],
              ['InnoDB Midpoint', 'Modified LRU: new pages inserted at 3/8 position (midpoint), not front. Pages reach front (hot zone) only on second access. Scan pages stay in young zone and expire quickly.', '✅ Practical, production-proven', 'MySQL InnoDB (default)'],
            ].map(([p, alg, sr, ub]) => `<tr><td><strong>${p}</strong></td><td style="font-size:10px">${alg}</td><td>${sr}</td><td style="font-size:10px">${ub}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="prose" style="padding-top:16px">
        <h3>PostgreSQL's Mitigation: Ring Buffer for SeqScan</h3>
        <p>PostgreSQL detects when a table scan will exceed 1/4 of shared_buffers and switches to a
           <strong>ring buffer</strong> — a small fixed-size circular buffer (256 KB default) allocated separately.
           SeqScan pages cycle through the ring and are never placed in the main buffer pool.
           This prevents scan pollution without LRU-K complexity. The 256 KB ring fits ~32 pages —
           ideal for sequential access but useless for queries that revisit pages (NLJ inner scan).</p>
      </div>
    </div>
  `;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'Why does LRU perform poorly during sequential scans, and how does PostgreSQL mitigate this?',
      a: 'LRU evicts the frame with the oldest last-access timestamp. During a full table scan (e.g., SeqScan orders — 5 million pages), every scan page is the most recently accessed. LRU cannot distinguish "read once, never again" (scan page) from "read frequently" (hot OLTP page). Each new scan page evicts a hot page, leaving the pool cold after the scan. PostgreSQL mitigates with a ring buffer: when a relation is larger than shared_buffers/4, sequential scans use a private ring buffer (256 KB) separate from the main pool. Scan pages cycle through the ring and are never placed in shared_buffers. After the scan completes, the main pool is unchanged — hot pages are preserved. For Prime Day analytics (SeqScan across 350M product rows), ring buffers prevent the analytics query from evicting OLTP cache pages.',
      tip: 'Ring buffer size is controlled by BAS_SEQUENTIAL (256 KB) in bufmgr.c. It can be extended for parallel scans — each parallel worker gets its own ring buffer.',
    },
    {
      q: 'What is the Belady\'s Optimal algorithm and why can\'t it be used in practice?',
      a: 'Belady\'s Optimal (OPT) evicts the frame that will be accessed furthest in the future (or never again). It is provably optimal — produces the minimum number of page faults for any reference string. Impossible in practice because it requires knowing future page references — a property that requires clairvoyance. Importance: OPT defines the theoretical lower bound on buffer misses. Real policies are measured against OPT: "this policy achieves 85% of OPT\'s hit rate." LRU approximates OPT under the assumption that recently-used pages will be used again soon (temporal locality). For workloads with temporal locality (OLTP), LRU is near-optimal. For workloads with no locality (analytics, sequential scans), LRU diverges from OPT — ring buffers and LRU-K bridge this gap.',
      tip: 'Belady\'s anomaly (FIFO): increasing the number of frames can sometimes INCREASE page faults for FIFO. LRU is immune to Belady\'s anomaly — more frames always means ≤ page faults.',
    },
    {
      q: 'How does PostgreSQL\'s Clock replacement algorithm work, and what are its trade-offs vs true LRU?',
      a: 'PostgreSQL\'s Clock uses a circular array of buffer descriptors. Each frame has a usage_count (up to 5). A "clock hand" sweeps the array. On eviction: (1) If frame is pinned (pin_count > 0): skip. (2) If usage_count > 0: decrement usage_count and advance. (3) If usage_count = 0 and not dirty: evict (ideal). (4) If usage_count = 0 and dirty: add to flush list, keep scanning. After a full sweep, dirty candidates are flushed and evicted. usage_count up to 5 (not just 1 ref bit) gives hot pages more "second chances." Trade-offs vs true LRU: (1) O(1) amortized eviction vs O(1) for doubly-linked-list LRU (similar practical cost). (2) Approximate recency — clock doesn\'t track exact last-access time. (3) No global ordering — cannot identify the single globally-oldest page. (4) Simple implementation: no hash table maintenance for position tracking. In practice, Clock achieves 95–99% of LRU\'s hit rate for OLTP workloads.',
      tip: 'PostgreSQL\'s clock is implemented in bufmgr.c: StrategyGetBuffer() loops the clock hand, decrements usage_count, and returns the first frame with usage_count=0 and no pins.',
    },
  ]);
  initIQ(container);

  return () => engine.destroy();
}
