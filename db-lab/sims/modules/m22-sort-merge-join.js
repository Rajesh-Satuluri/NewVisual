import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

const R_SORTED = [
  { key: 1001, data: 'Alice   $149' },
  { key: 1002, data: 'Bob     $49' },
  { key: 1003, data: 'Carol   $299' },
  { key: 1004, data: 'Dave    $89' },
  { key: 1005, data: 'Eve     $199' },
];
const S_SORTED = [
  { key: 1001, data: 'Kindle  qty:2' },
  { key: 1002, data: 'Echo    qty:1' },
  { key: 1003, data: 'FireTV  qty:1' },
  { key: 1004, data: 'Lamp    qty:3' },
  { key: 1006, data: 'AirPods qty:1' }, // no match
];

function makeMergeSteps() {
  const steps = [];
  let ri = 0, si = 0;
  const results = [];

  steps.push({ ri: -1, si: -1, results: [], desc: 'Sort-Merge Join starts. Both inputs are sorted on the join key (order_id). Two pointers scan both sorted lists simultaneously — O(N+M) merge.' });
  steps.push({ ri: 0, si: 0, results: [], desc: 'Initialize: R pointer at orders[0] (key=1001), S pointer at order_items[0] (key=1001). Compare keys.' });

  while (ri < R_SORTED.length && si < S_SORTED.length) {
    const r = R_SORTED[ri], s = S_SORTED[si];
    if (r.key === s.key) {
      results.push({ rk: r.key, rdata: r.data, sdata: s.data });
      steps.push({ ri, si, results: [...results], desc: `✅ Match! R.key=${r.key} = S.key=${s.key} → emit join row: ${r.data.trim()} + ${s.data.trim()}. Advance both pointers.` });
      ri++; si++;
    } else if (r.key < s.key) {
      steps.push({ ri, si, results: [...results], desc: `R.key=${r.key} < S.key=${s.key} → no match in S yet. Advance R pointer.` });
      ri++;
    } else {
      steps.push({ ri, si, results: [...results], desc: `R.key=${r.key} > S.key=${s.key} → no match in R. Advance S pointer.` });
      si++;
    }
  }
  if (si < S_SORTED.length) {
    steps.push({ ri: R_SORTED.length, si, results: [...results], desc: `S still has rows (key=${S_SORTED[si].key}) but R is exhausted. No match — merge done.` });
  }
  steps.push({ ri: -2, si: -2, results, desc: `Sort-Merge Join complete. ${results.length} output rows from ${R_SORTED.length}+${S_SORTED.length} input rows. Total comparisons: ~${R_SORTED.length + S_SORTED.length}. O(N+M) — no hash table needed.` });
  return steps;
}

const SMJ_STEPS = makeMergeSteps();

function drawSMJ(ctx, stepIdx, w, h) {
  ctx.clearRect(0, 0, w, h);
  if (stepIdx < 0) {
    ctx.fillStyle = '#475569'; ctx.font = '13px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('Press Play to watch Sort-Merge Join pointer merge', w/2, h/2);
    ctx.textAlign = 'left'; return;
  }

  const step = SMJ_STEPS[stepIdx];
  const rowH = 28, rowW = 220, gapX = 40;
  const rX = 30, sX = rX + rowW + gapX, resX = sX + rowW + gapX;

  // Headers
  [['Orders (sorted)', rX, '#4F46E5'], ['Order Items (sorted)', sX, '#10B981'], ['Result', resX, '#F59E0B']].forEach(([t, x, c]) => {
    ctx.fillStyle = c; ctx.font = '600 10px system-ui';
    ctx.fillText(t, x, 20);
  });

  R_SORTED.forEach((r, i) => {
    const y = 30 + i * (rowH + 2);
    const isActive = step.ri === i;
    const isDone = step.ri > i || step.ri === -2;
    ctx.fillStyle = isActive ? '#4F46E5' : '#0F172A';
    ctx.strokeStyle = isActive ? '#818CF8' : '#1E293B';
    ctx.lineWidth = isActive ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(rX, y, rowW, rowH - 2, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = isActive ? '#fff' : '#475569';
    ctx.font = '9px monospace';
    ctx.fillText(`[${r.key}] ${r.data}`, rX + 6, y + 16);
    if (isActive) {
      ctx.fillStyle = '#818CF8'; ctx.font = '700 11px system-ui';
      ctx.fillText('◀ R', rX + rowW + 4, y + 16);
    }
  });

  S_SORTED.forEach((s, i) => {
    const y = 30 + i * (rowH + 2);
    const isActive = step.si === i;
    ctx.fillStyle = isActive ? '#10B981' : '#0F172A';
    ctx.strokeStyle = isActive ? '#10B981' : '#1E293B';
    ctx.lineWidth = isActive ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(sX, y, rowW, rowH - 2, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = isActive ? '#fff' : '#475569';
    ctx.font = '9px monospace';
    ctx.fillText(`[${s.key}] ${s.data}`, sX + 6, y + 16);
    if (isActive) {
      ctx.fillStyle = '#10B981'; ctx.font = '700 11px system-ui';
      ctx.fillText('◀ S', sX + rowW + 4, y + 16);
    }
  });

  // Match arrow
  if (step.ri >= 0 && step.si >= 0 && step.ri < R_SORTED.length && step.si < S_SORTED.length) {
    const ry = 30 + step.ri * (rowH + 2) + rowH/2 - 1;
    const sy = 30 + step.si * (rowH + 2) + rowH/2 - 1;
    const match = R_SORTED[step.ri]?.key === S_SORTED[step.si]?.key;
    ctx.strokeStyle = match ? '#F59E0B' : '#EF4444'; ctx.lineWidth = 1.5;
    ctx.setLineDash(match ? [] : [4,3]);
    ctx.beginPath(); ctx.moveTo(rX + rowW + 2, ry); ctx.lineTo(sX - 2, sy); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = match ? '#F59E0B' : '#EF4444'; ctx.font = '10px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(match ? '= ✅' : '≠', rX + rowW + gapX/2, Math.min(ry, sy) - 4);
    ctx.textAlign = 'left';
  }

  step.results.forEach((r, i) => {
    const y = 30 + i * (rowH + 2);
    ctx.fillStyle = '#F59E0B' + '22'; ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(resX, y, 190, rowH - 2, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#F59E0B'; ctx.font = '9px monospace';
    ctx.fillText(`[${r.rk}] ${r.rdata.trim()} + ${r.sdata}`, resX + 4, y + 16);
  });

  // Footer
  ctx.fillStyle = '#1E293B';
  ctx.beginPath(); ctx.roundRect(20, h - 46, w - 40, 38, 4); ctx.fill();
  ctx.fillStyle = '#64748B'; ctx.font = '10px system-ui';
  const s = SMJ_STEPS[stepIdx];
  ctx.fillText(s.desc, 28, h - 25);
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Query Engine · M22',
    title: 'Sort-Merge Join',
    subtitle: 'Sort both inputs on the join key, then merge in O(N+M) — optimal when inputs are already ordered.',
    tabs: [
      { id: 'smj',    label: '🔀 Merge Animation' },
      { id: 'sort',   label: '📊 External Sort' },
      { id: 'iq',     label: '💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  const smjTab = container.querySelector('#tab-smj');
  smjTab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="canvas-wrap" style="margin-top:12px">
      <canvas width="800" height="360" style="width:100%;max-height:360px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="smj-explainer">
        <h3>Sort-Merge Join</h3>
        <p>Both inputs are sorted on order_id. Two pointers advance through the sorted lists,
           emitting matches when keys are equal and advancing the smaller pointer otherwise.
           Press <strong>Play</strong> to watch the merge.</p>
      </div>
    </div>
  `;

  const canvas = smjTab.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const engine = new SimulationEngine({
    initialState: { step: -1 },
    steps: SMJ_STEPS.map((s, i) => ({ label: `Step ${i+1}`, duration: 1800, mutate: st => { st.step = i; } })),
    onRender: state => {
      drawSMJ(ctx, state.step, 800, 360);
      const el = smjTab.querySelector('#smj-explainer');
      if (el && state.step >= 0) { const s = SMJ_STEPS[state.step]; el.innerHTML = `<h3>Step ${state.step + 1}</h3><p>${s.desc}</p>`; }
    },
  });
  SimulationEngine.renderControls(smjTab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(smjTab.querySelector('.canvas-wrap'), engine);
  drawSMJ(ctx, -1, 800, 360);
  engine.reset();

  container.querySelector('#tab-sort').innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">External Merge Sort — Sorting Data Larger Than Memory</div>
        <div class="section-desc">Used when sort input exceeds work_mem — the Sort-Merge Join's pre-step</div>
      </div>
      <div class="prose">
        <h3>Phase 1: Run Formation</h3>
        <p>Read chunks of data that fit in memory. Sort each chunk using quicksort/heapsort.
           Write sorted "runs" to temporary disk files. For a 10 GB order_items table with 4 GB work_mem:
           creates ~3 sorted run files of ~3.3 GB each.</p>
        <h3>Phase 2: Merge Runs</h3>
        <p>Merge sorted runs using a K-way merge (priority queue / min-heap). Read the smallest
           element from each run file, emit the minimum, advance that run's pointer.
           For K=3 runs: one pass merges all into a single sorted stream.</p>
        <div class="code-block">
<span class="cmt">-- External Sort cost (in I/O):</span>
Total I/O = 2 × |R| × (1 + ⌈log_K(⌈|R| / B⌉)⌉)

where B = buffer pool frames, K = merge fan-in
For |R|=3B rows, B=512 frames, K=32:
= 2 × 3B × (1 + ⌈log_32(6M)⌉)
= 2 × 3B × (1 + 4) = 30B page reads

<span class="cmt">-- Sort-Merge Join total I/O:</span>
Sort R: 2×|R| passes + Sort S: 2×|S| passes + Merge: |R|+|S|
= 5×(|R| + |S|) page reads total
        </div>
        <h3>When Sort-Merge Join Beats Hash Join</h3>
        <ul>
          <li>Inputs are already sorted (index scan on join key) — sort step is FREE → total cost = O(N+M)</li>
          <li>ORDER BY or GROUP BY on the same key — sort is reused for multiple operations</li>
          <li>Range join predicates (R.a BETWEEN S.b AND S.c) — hash join can't handle non-equality joins</li>
          <li>Very large datasets with limited memory — sort-merge has lower memory requirements than hash join</li>
        </ul>
      </div>
    </div>
  `;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'When does the optimizer choose Sort-Merge Join over Hash Join?',
      a: 'Sort-Merge Join wins when: (1) <strong>Inputs already sorted</strong> — if both sides come from an index scan on the join key, sort is free; merge takes O(N+M). This beats Hash Join\'s O(N+M) + build overhead. (2) <strong>Non-equality joins</strong> — Hash Join only works on equality predicates (a = b). Sort-Merge handles range joins (a <= b), inequality joins, and band joins. (3) <strong>ORDER BY on the join result</strong> — Sort-Merge produces sorted output, eliminating a subsequent Sort node. (4) <strong>Memory constrained</strong> — Sort-Merge\'s working memory is O(K×buffer_size) for K-way merge; Hash Join requires O(build_side). For a 100 GB build side, Sort-Merge may be the only option.',
      tip: 'Remember: Sort-Merge handles non-equality joins. Hash Join is equality-only. This is a common interview question.',
    },
    {
      q: 'What is external merge sort and why is it used for large joins?',
      a: 'External merge sort handles data larger than available memory. <strong>Phase 1 (Run formation):</strong> Read B buffer frames of data, sort in memory (quicksort), write sorted "run" to disk. Repeat until all input is processed — produces ⌈|R|/B⌉ runs. <strong>Phase 2 (Merge):</strong> Use K-way merge with a min-heap: keep one page buffer per run, yield the minimum key, refill from the corresponding run file. K-way fan-in = min(B-1, num_runs). If runs > B-1, do multiple merge passes. Total I/O = O(|R| × log(|R|/B)/log(B)) pages. For Sort-Merge Join, both sides are externally sorted then merged together in one streaming pass.',
      tip: 'The sort-merge join cost formula is the exam favorite: sort R + sort S + merge = 5×(|R|+|S|) page I/Os in the 2-pass case.',
    },
    {
      q: 'How does Sort-Merge Join handle duplicate join keys?',
      a: 'When multiple rows in R have the same join key (e.g., orders with the same customer_id), Sort-Merge handles it with a "mark/restore" mechanism: (1) When R pointer finds a matching key in S, mark the current S position. (2) Advance S, emitting matches, until S\'s key > R\'s current key. (3) Advance R. If R\'s next key equals the previous S mark position\'s key, RESTORE S to the mark and repeat. This handles many-to-many joins. Cost impact: for a key that appears k times in R and m times in S, the mark/restore causes k×m comparisons — degenerates to O(N×M) for highly skewed data (same as NLJ). Hash Join handles this case with O(k+m) per key — often better for duplicates.',
      tip: 'For one-to-many joins (PK to FK), Sort-Merge is efficient. For many-to-many with duplicates, Hash Join usually wins.',
    },
  ]);
  initIQ(container);

  return () => engine.destroy();
}
