import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

// Simulate a hash join between orders (build side, smaller) and order_items (probe side)
const BUILD_ROWS = [
  { order_id: 1001, customer: 'Alice',   total: 149.99 },
  { order_id: 1002, customer: 'Bob',     total:  49.99 },
  { order_id: 1003, customer: 'Carol',   total: 299.99 },
  { order_id: 1004, customer: 'Dave',    total:  89.99 },
  { order_id: 1005, customer: 'Eve',     total: 199.99 },
];
const PROBE_ROWS = [
  { order_id: 1002, item: 'Echo Dot',    qty: 1 },
  { order_id: 1001, item: 'Kindle',      qty: 2 },
  { order_id: 1003, item: 'Fire TV',     qty: 1 },
  { order_id: 1006, item: 'AirPods',     qty: 1 }, // no match
  { order_id: 1004, item: 'Desk Lamp',   qty: 3 },
];

const HASH_BUCKETS = 4;
function hashFn(id) { return (id * 2654435761 % (2**32)) % HASH_BUCKETS; }

function makeHashJoinSteps() {
  const steps = [];
  const hashTable = Array.from({ length: HASH_BUCKETS }, () => []);

  // Phase 1: build
  steps.push({ phase: 'build', buildDone: 0, probeDone: -1, hashTable: hashTable.map(b => [...b]), results: [], desc: 'Phase 1: Build. Hash the smaller relation (orders) into an in-memory hash table. Bucket = hash(order_id) % 4.' });
  BUILD_ROWS.forEach((r, i) => {
    const bucket = hashFn(r.order_id);
    hashTable[bucket] = [...hashTable[bucket], r];
    steps.push({ phase: 'build', buildDone: i + 1, probeDone: -1, hashTable: hashTable.map(b => [...b]), results: [], activeRow: r, activeBucket: bucket, desc: `Build: INSERT orders.order_id=${r.order_id} → bucket ${bucket} (hash(${r.order_id}) % 4). Hash table now has ${i+1} entries.` });
  });

  // Phase 2: probe
  const results = [];
  steps.push({ phase: 'probe', buildDone: BUILD_ROWS.length, probeDone: -1, hashTable: hashTable.map(b => [...b]), results: [], desc: 'Phase 2: Probe. Stream order_items rows. For each row, compute hash(order_id) % 4 → look up matching orders in that bucket.' });
  PROBE_ROWS.forEach((r, i) => {
    const bucket = hashFn(r.order_id);
    const match = hashTable[bucket].find(b => b.order_id === r.order_id);
    if (match) results.push({ ...match, ...r });
    steps.push({ phase: 'probe', buildDone: BUILD_ROWS.length, probeDone: i, hashTable: hashTable.map(b => [...b]), results: [...results], activeRow: r, activeBucket: bucket, matchFound: !!match, desc: match ? `✅ Probe: order_items.order_id=${r.order_id} → bucket ${bucket} → MATCH with ${match.customer}. Join output: ${match.customer} | ${r.item} | ${r.qty}` : `❌ Probe: order_items.order_id=${r.order_id} → bucket ${bucket} → NO MATCH (no order 1006 in build side).` });
  });

  steps.push({ phase: 'done', buildDone: BUILD_ROWS.length, probeDone: PROBE_ROWS.length, hashTable: hashTable.map(b => [...b]), results, desc: `Hash Join complete. ${results.length} output rows. Build phase: ${BUILD_ROWS.length} rows inserted. Probe phase: ${PROBE_ROWS.length} rows probed (${PROBE_ROWS.length - 1} matches, 1 miss).` });
  return steps;
}

const HJ_STEPS = makeHashJoinSteps();

function drawHashJoin(ctx, stepIdx, w, h) {
  ctx.clearRect(0, 0, w, h);
  if (stepIdx < 0) {
    ctx.fillStyle = '#475569'; ctx.font = '13px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('Press Play to watch Hash Join build then probe', w/2, h/2);
    ctx.textAlign = 'left'; return;
  }

  const step = HJ_STEPS[stepIdx];
  const isBuild = step.phase === 'build';

  // Phase label
  ctx.fillStyle = isBuild ? '#06B6D4' : '#F59E0B';
  ctx.font = '700 12px system-ui';
  ctx.fillText(`Phase: ${isBuild ? '1 — BUILD (hash table from orders)' : step.phase === 'done' ? 'DONE' : '2 — PROBE (stream order_items)'}`, 20, 22);

  // Hash table buckets
  const htX = 20, htY = 36, bucketH = 60, bucketW = 220;
  ctx.fillStyle = '#64748B'; ctx.font = '600 10px system-ui';
  ctx.fillText('In-Memory Hash Table (orders)', htX, htY - 6);
  step.hashTable.forEach((bucket, bi) => {
    const y = htY + bi * (bucketH + 4);
    const isActive = step.activeBucket === bi;
    ctx.fillStyle = isActive ? '#06B6D4' + '22' : '#0F172A';
    ctx.strokeStyle = isActive ? '#06B6D4' : '#1E293B';
    ctx.lineWidth = isActive ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(htX, y, bucketW, bucketH, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#475569'; ctx.font = '9px system-ui';
    ctx.fillText(`Bucket ${bi}:`, htX + 6, y + 14);
    bucket.forEach((row, ri) => {
      ctx.fillStyle = '#64748B';
      ctx.fillText(`  [${row.order_id}] ${row.customer} $${row.total}`, htX + 6, y + 26 + ri * 12);
    });
  });

  // Build/Probe stream
  const streamX = 280, streamY = 36;
  ctx.fillStyle = '#64748B'; ctx.font = '600 10px system-ui';
  ctx.fillText(isBuild ? 'Build Input (orders)' : 'Probe Input (order_items)', streamX, streamY - 6);
  const streamRows = isBuild ? BUILD_ROWS : PROBE_ROWS;
  streamRows.forEach((r, i) => {
    const y = streamY + i * 28;
    const isDone = isBuild ? i < step.buildDone : i <= step.probeDone;
    const isActive = isBuild ? (step.activeRow && step.activeRow.order_id === r.order_id && i === step.buildDone - 1) : (step.activeRow && step.activeRow.order_id === r.order_id && i === step.probeDone);
    ctx.fillStyle = isActive ? (isBuild ? '#06B6D4' : (step.matchFound ? '#10B981' : '#EF4444')) : (isDone ? '#0F172A' : '#0A0F1A');
    ctx.strokeStyle = isActive ? (isBuild ? '#06B6D4' : (step.matchFound ? '#10B981' : '#EF4444')) : '#1E293B';
    ctx.lineWidth = isActive ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(streamX, y, 210, 22, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = isActive ? '#fff' : '#475569';
    ctx.font = '9px monospace';
    ctx.fillText(isBuild ? `${r.order_id} | ${r.customer} | $${r.total}` : `${r.order_id} | ${r.item} | qty:${r.qty}`, streamX + 6, y + 14);
  });

  // Arrow to hash table
  if (step.activeRow && step.activeBucket !== undefined) {
    const arrowX = streamX - 2;
    const arrowY = streamY + (isBuild ? (step.buildDone - 1) : step.probeDone) * 28 + 11;
    const targetY = htY + step.activeBucket * 64 + 30;
    ctx.strokeStyle = isBuild ? '#06B6D4' : (step.matchFound ? '#10B981' : '#EF4444');
    ctx.lineWidth = 1.5; ctx.setLineDash([4,3]);
    ctx.beginPath(); ctx.moveTo(arrowX, arrowY); ctx.lineTo(htX + bucketW + 4, targetY); ctx.stroke();
    ctx.setLineDash([]);
  }

  // Results
  const resX = 520, resY = 36;
  ctx.fillStyle = '#64748B'; ctx.font = '600 10px system-ui';
  ctx.fillText('Output Rows', resX, resY - 6);
  step.results.forEach((r, i) => {
    const y = resY + i * 26;
    ctx.fillStyle = '#F59E0B' + '22'; ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(resX, y, 260, 20, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#F59E0B'; ctx.font = '9px monospace';
    ctx.fillText(`${r.customer} | ${r.item} | $${r.total}`, resX + 6, y + 13);
  });

  // Footer
  ctx.fillStyle = '#1E293B';
  ctx.beginPath(); ctx.roundRect(20, h - 38, w - 40, 30, 4); ctx.fill();
  ctx.fillStyle = '#64748B'; ctx.font = '10px system-ui';
  ctx.fillText(step.desc, 28, h - 19);
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Query Engine · M21',
    title: 'Hash Join',
    subtitle: 'Build a hash table on the smaller side, probe with the larger — O(N+M) join for large tables without indexes.',
    tabs: [
      { id: 'hj',    label: '#️⃣ Hash Join' },
      { id: 'grace', label: '💾 Partitioned (Grace)' },
      { id: 'iq',    label: '💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  const hjTab = container.querySelector('#tab-hj');
  hjTab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="canvas-wrap" style="margin-top:12px">
      <canvas width="800" height="380" style="width:100%;max-height:380px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="hj-explainer">
        <h3>Hash Join — Two Phases</h3>
        <p><strong>Phase 1 (Build):</strong> Hash the smaller relation (orders) into an in-memory hash table.<br>
           <strong>Phase 2 (Probe):</strong> Stream the larger relation (order_items), probe each row against the hash table.<br>
           Press <strong>Play</strong> to watch both phases execute.</p>
      </div>
    </div>
  `;

  const canvas = hjTab.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const engine = new SimulationEngine({
    initialState: { step: -1 },
    steps: HJ_STEPS.map((s, i) => ({ label: s.phase === 'build' ? `Build ${i}` : `Probe ${i}`, duration: 1600, mutate: st => { st.step = i; } })),
    onRender: state => {
      drawHashJoin(ctx, state.step, 800, 380);
      const el = hjTab.querySelector('#hj-explainer');
      if (el && state.step >= 0) { const s = HJ_STEPS[state.step]; el.innerHTML = `<h3>${s.phase === 'build' ? 'Build Phase' : s.phase === 'probe' ? 'Probe Phase' : 'Complete'}</h3><p>${s.desc}</p>`; }
    },
  });
  SimulationEngine.renderControls(hjTab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(hjTab.querySelector('.canvas-wrap'), engine);
  drawHashJoin(ctx, -1, 800, 380);
  engine.reset();

  container.querySelector('#tab-grace').innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">Grace Hash Join — When the Hash Table Doesn't Fit in Memory</div>
      </div>
      <div class="prose">
        <h3>The Problem: Hash Table Spills to Disk</h3>
        <p>Simple Hash Join requires the entire build side to fit in <code>work_mem</code> (default 4MB in PostgreSQL).
           For a 1 GB orders table on Prime Day, the hash table doesn't fit. Solution: partition both sides
           before hashing.</p>
        <h3>Grace Hash Join (3 Phases)</h3>
        <div class="code-block">
<span class="cmt">-- Phase 1: Partition both sides using hash function h1</span>
orders      → partitioned into B files (orders.0, orders.1, … orders.B)
order_items → partitioned into B files (items.0,  items.1,  … items.B)

<span class="cmt">-- Property: matching rows (on join key) land in the SAME partition number</span>
<span class="cmt">-- hash(order_id) % B = same partition for both sides</span>

<span class="cmt">-- Phase 2: For each partition pair (i, 0..B-1):</span>
<span class="kw">BUILD</span>: Load orders.i into memory hash table (using h2 ≠ h1)
<span class="kw">PROBE</span>: Stream items.i, probe the hash table
<span class="cmt">-- Each partition is small enough to fit in work_mem</span>

<span class="cmt">-- If a partition is still too large: recurse (recursive partitioning)</span>
        </div>
        <h3>Cost of Grace Hash Join</h3>
        <ul>
          <li><strong>I/O:</strong> 3 × (|R| + |S|) page reads — read both sides once to partition, read each partition once to join</li>
          <li><strong>Memory:</strong> O(√(|R|)) — need √ of rows in memory for optimal B partitions</li>
          <li><strong>For Prime Day:</strong> orders (1B rows) + order_items (3B rows) — Grace partitioning with B=64 buckets, each ~50M rows → fits in 8 GB work_mem partition</li>
        </ul>
        <h3>EXPLAIN: Hash Batches &gt; 1</h3>
        <p>When EXPLAIN ANALYZE shows "Hash Batches: 8", the hash join spilled to disk 8 times.
           Fix: increase <code>work_mem</code> for the session (<code>SET work_mem = '256MB'</code>).
           Each batch requires extra disk I/O — a 8-batch join is ~3× slower than in-memory.</p>
      </div>
    </div>
  `;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'Explain Hash Join step by step and its time complexity.',
      a: '<strong>Phase 1 (Build):</strong> Read the smaller relation (R), compute hash(join_key) % B for each row, insert into hash table bucket. Cost: O(|R|) time, O(|R|) space. <strong>Phase 2 (Probe):</strong> Read the larger relation (S) row by row, compute hash(join_key) % B, look up matching rows in the corresponding bucket. For each bucket hit, compare full join key (handles hash collisions). Cost: O(|S|) time. <strong>Total:</strong> O(|R| + |S|) — linear in input sizes. <strong>Space:</strong> O(|R|) for the hash table. If |R| > work_mem, use Grace Hash Join (spill partitions to disk): O(3(|R| + |S|)) I/O.',
      tip: 'Key interview fact: Hash Join is O(N+M) time but requires O(min(N,M)) memory. NLJ with index is O(N log M). SeqScan join is O(N×M). Hash Join wins for large unindexed joins.',
    },
    {
      q: 'What is the difference between an in-memory hash join and a hybrid hash join?',
      a: '<strong>In-memory hash join:</strong> The entire build side fits in work_mem. Build phase reads R once and inserts into memory. Probe phase reads S once. Total I/O: 2 reads of R + 1 read of S. <strong>Hybrid hash join (PostgreSQL\'s implementation):</strong> Keeps as many partitions of R as fit in memory; spills the rest to disk. For partitions that fit, probes them immediately while building. For spilled partitions, writes matching S rows to disk for a second pass. This overlaps I/O and computation, reducing latency compared to Grace. <strong>Grace hash join:</strong> Always partitions everything to disk first; simpler but more I/O. PostgreSQL uses Hybrid; databases designed for HDD used Grace.',
      tip: 'PostgreSQL\'s "Batches: 1" in EXPLAIN means fully in-memory (fastest). "Batches: N" means N passes over spilled partitions (slower, proportional to batches).',
    },
    {
      q: 'How does hash join handle skewed data (one join key value much more frequent)?',
      a: 'If one order_id appears in 50% of order_items (a hot product promotion), all those rows land in the same bucket — a "skewed" hash table. That bucket may not fit in memory even if the total build side does. Solutions: (1) <strong>Bucket overflow:</strong> PostgreSQL uses linked overflow chains in the hash bucket, continuing to disk if needed. (2) <strong>Independent hash function:</strong> Use a different hash function for the inner loop to distribute within the large bucket. (3) <strong>Application-level fix:</strong> Partition the skewed key separately (handle the hot product_id case explicitly with a separate indexed lookup). Recognizing skew in EXPLAIN: one partition has "Batches: 8" while others have "Batches: 1".',
      tip: 'Skew is the hash join\'s Achilles heel. Always check data distribution before assuming hash join will be efficient.',
    },
  ]);
  initIQ(container);

  return () => engine.destroy();
}
