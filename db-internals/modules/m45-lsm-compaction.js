import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

// L0 files with overlapping key ranges
const L0_FILES = [
  { id:'f0a', range:[5,30],  x:60,  y:60,  w:180, label:'L0-A [5..30]',  color:'#10B981', seq:1 },
  { id:'f0b', range:[15,45], x:60,  y:100, w:220, label:'L0-B [15..45]', color:'#10B981', seq:2 },
  { id:'f0c', range:[20,60], x:60,  y:140, w:260, label:'L0-C [20..60]', color:'#10B981', seq:3 },
  { id:'f0d', range:[40,70], x:60,  y:180, w:220, label:'L0-D [40..70]', color:'#10B981', seq:4 },
];
const L1_OLD = [
  { id:'f1a', range:[1,35],  x:60,  y:280, w:240, label:'L1-X [1..35]',  color:'#818CF8', seq:0 },
  { id:'f1b', range:[50,90], x:320, y:280, w:260, label:'L1-Y [50..90]', color:'#818CF8', seq:0 },
];
const L1_NEW = [
  { id:'f1n', range:[1,70],  x:60,  y:280, w:480, label:'L1-NEW [1..70]  ← compaction output', color:'#4F46E5', seq:5 },
  { id:'f1b', range:[50,90], x:560, y:280, w:200, label:'L1-Y [50..90]', color:'#818CF8', seq:0 },
];

const COMP_STEPS = [
  { showL0:['f0a','f0b','f0c','f0d'], showL1:['f1a','f1b'], hi:[], showNew:false, showMerge:false,
    desc:'LSM-Tree compaction: L0 has 4 SSTables with OVERLAPPING key ranges (each flush creates a new L0 file). L1 has 2 non-overlapping SSTables. When L0 count ≥ threshold (typically 4), L0→L1 compaction is triggered.' },
  { showL0:['f0a','f0b','f0c','f0d'], showL1:['f1a','f1b'], hi:['f0a','f0b','f0c','f0d'], showNew:false, showMerge:false,
    desc:'Step 1: SELECT compaction inputs. Pick all L0 files (they overlap each other, so all must be merged). Find L1 files whose key ranges overlap with L0 range [5..70]: L1-X [1..35] and part of L1-Y [50..90] overlap → include them.' },
  { showL0:['f0a','f0b','f0c','f0d'], showL1:['f1a','f1b'], hi:['f0a','f0b','f0c','f0d','f1a'], showNew:false, showMerge:false,
    desc:'Step 2: L1-X [1..35] overlaps with L0 range [5..70] → must include in compaction. L1-Y [50..90] also partially overlaps → include. Compaction inputs: 4 L0 files + 2 L1 files = 6 SSTables being merged.' },
  { showL0:['f0a','f0b','f0c','f0d'], showL1:['f1a','f1b'], hi:[], showNew:false, showMerge:true,
    desc:'Step 3: MERGE-SORT all 6 input SSTables simultaneously. Use a priority queue (min-heap) over iterators of each file. At each step, pop the minimum key across all iterators. If the same key appears in multiple files: keep only the newest version (highest sequence number). Tombstones (delete markers) absorb older versions.' },
  { showL0:[], showL1:[], hi:['f1n'], showNew:true, showMerge:false,
    desc:'Step 4: WRITE output. The merged, sorted stream is written as new SSTable file(s) at L1. Result: L1-NEW [1..70] covers the merged range with non-overlapping key space. L1-Y [50..90] is outside the merged range and remains unchanged.' },
  { showL0:[], showL1:['f1b'], hi:[], showNew:true, showMerge:false,
    desc:'Step 5: CLEANUP. After atomically updating MANIFEST to reference new L1 files: delete the 6 input SSTables (4 L0 + 2 old L1). Space is reclaimed. New L1 has no key overlap — a point lookup at L1 now reads at most 1 file. Write amplification: 6 files read → 1 file written = ~4× WA for this compaction.' },
];

function drawFile(ctx, f, isHi, crossed) {
  ctx.fillStyle = isHi ? f.color+'33' : crossed ? '#0A0F1A' : '#0F172A';
  ctx.strokeStyle = isHi ? f.color : crossed ? '#334155' : '#1E293B';
  ctx.lineWidth = isHi ? 2.5 : 1;
  ctx.beginPath(); ctx.roundRect(f.x, f.y, f.w, 30, 4); ctx.fill(); ctx.stroke();
  if (crossed) {
    ctx.strokeStyle='#EF444488'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(f.x+4, f.y+4); ctx.lineTo(f.x+f.w-4, f.y+26); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(f.x+f.w-4, f.y+4); ctx.lineTo(f.x+4, f.y+26); ctx.stroke();
  }
  ctx.fillStyle = isHi ? f.color : crossed ? '#334155' : '#475569';
  ctx.font = (isHi?'700':'400') + ' 9px system-ui';
  ctx.fillText(f.label, f.x+8, f.y+18);
  ctx.fillStyle = '#334155'; ctx.font='7px system-ui';
  ctx.fillText(`seq=${f.seq}`, f.x+f.w-40, f.y+18);
}

function drawCompaction(ctx, stepIdx, w, h) {
  ctx.clearRect(0, 0, w, h);
  const step = COMP_STEPS[Math.max(0, stepIdx)];
  const hiSet = new Set(step.hi);
  const l0Set = new Set(step.showL0);
  const l1Set = new Set(step.showL1);

  // Level labels
  ctx.fillStyle='#10B981'; ctx.font='700 10px system-ui'; ctx.fillText('Level 0 (overlapping ranges)', 20, 50);
  ctx.fillStyle='#818CF8'; ctx.fillText('Level 1 (non-overlapping — sorted)', 20, 265);

  // Key range ruler
  ctx.fillStyle='#334155'; ctx.font='8px system-ui'; ctx.textAlign='center';
  [0,10,20,30,40,50,60,70,80,90].forEach(k => {
    const kx = 60 + k*(540/90);
    ctx.fillText(k, kx, 240);
    ctx.strokeStyle='#1E293B'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(kx, 225); ctx.lineTo(kx, 235); ctx.stroke();
  });
  ctx.strokeStyle='#1E293B'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(60, 235); ctx.lineTo(640, 235); ctx.stroke();
  ctx.fillStyle='#334155'; ctx.font='8px system-ui'; ctx.textAlign='left';
  ctx.fillText('key →', 645, 239);
  ctx.textAlign='left';

  L0_FILES.forEach(f => {
    if (l0Set.has(f.id)) {
      const isHi = hiSet.has(f.id);
      const x = 60 + f.range[0]*(540/90);
      const w2 = (f.range[1]-f.range[0])*(540/90);
      drawFile(ctx, {...f, x, w:w2}, isHi, false);
    }
  });

  if (step.showNew) {
    L1_NEW.forEach(f => {
      const x = 60 + f.range[0]*(540/90);
      const w2 = Math.min((f.range[1]-f.range[0])*(540/90), 480);
      drawFile(ctx, {...f, x, w:w2}, hiSet.has(f.id), false);
    });
  } else {
    L1_OLD.forEach(f => {
      const show = l1Set.has(f.id);
      if (show) {
        const x = 60 + f.range[0]*(540/90);
        const w2 = (f.range[1]-f.range[0])*(540/90);
        drawFile(ctx, {...f, x, w:w2}, hiSet.has(f.id), false);
      }
    });
  }

  // Merge visualization
  if (step.showMerge) {
    ctx.fillStyle='#F59E0B22'; ctx.strokeStyle='#F59E0B'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.roundRect(100, 310, 500, 50, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#F59E0B'; ctx.font='700 11px system-ui'; ctx.textAlign='center';
    ctx.fillText('⚙️  MERGE-SORT  (priority queue over 6 iterators, seq# resolves conflicts)', 350, 330);
    ctx.fillStyle='#94A3B8'; ctx.font='9px system-ui';
    ctx.fillText('1, 5, 10, 15, 20, 25, 27, 30, 35, 40, 45, 50, 55, 60, 65, 70 → newest version wins', 350, 348);
    ctx.textAlign='left';
  }

  if (stepIdx<0) {
    ctx.fillStyle='#475569'; ctx.font='13px system-ui'; ctx.textAlign='center';
    ctx.fillText('Press Play to animate L0→L1 compaction', w/2, h/2);
    ctx.textAlign='left';
  } else {
    ctx.fillStyle='#0F172A'; ctx.beginPath(); ctx.roundRect(20, h-52, w-40, 44, 4); ctx.fill();
    const words=step.desc.split(' ');
    let line='', ly=h-36;
    ctx.fillStyle='#94A3B8'; ctx.font='9.5px system-ui';
    words.forEach(wd=>{
      const t=line+(line?' ':'')+wd;
      if(ctx.measureText(t).width>w-50){ctx.fillText(line,28,ly);line=wd;ly+=13;}else line=t;
    });
    if(line) ctx.fillText(line,28,ly);
  }
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag:'Storage Engine · M45', title:'LSM Compaction',
    subtitle:'Leveled compaction: merge overlapping L0 SSTables with L1, eliminate duplicate keys, reclaim space.',
    tabs:[
      { id:'comp', label:'⚙️ Compaction Animation' },
      { id:'types', label:'📋 Compaction Strategies' },
      { id:'iq',   label:'💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  const tab = container.querySelector('#tab-comp');
  tab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="canvas-wrap" style="margin-top:12px">
      <canvas width="800" height="390" style="width:100%;max-height:390px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="comp-exp">
        <h3>L0 → L1 Compaction</h3>
        <p>L0 files have overlapping key ranges (each MemTable flush creates a new L0 SSTable regardless of key overlap).
           When L0 count reaches the threshold, compaction merges all L0 files with the overlapping L1 files,
           producing non-overlapping sorted output. Press <strong>Play</strong> to animate the process.</p>
      </div>
    </div>`;
  const canvas = tab.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const engine = new SimulationEngine({
    initialState:{step:-1},
    steps:COMP_STEPS.map((s,i)=>({label:`Step ${i+1}`, duration:2500, mutate:st=>{st.step=i;}})),
    onRender:state=>{
      drawCompaction(ctx, state.step, 800, 390);
      const el=tab.querySelector('#comp-exp');
      if(el&&state.step>=0) el.innerHTML=`<h3>Step ${state.step+1}</h3><p>${COMP_STEPS[state.step].desc}</p>`;
    },
  });
  SimulationEngine.renderControls(tab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(tab.querySelector('.canvas-wrap'), engine);
  drawCompaction(ctx, -1, 800, 390);
  engine.reset();

  container.querySelector('#tab-types').innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">Compaction Strategies</div>
        <div class="section-desc">Leveled, Tiered, and FIFO — trade-offs in WA, RA, and SA</div>
      </div>
      <div class="prose">
        <h3>Leveled Compaction (RocksDB default)</h3>
        <div class="code-block">
Level size multiplier: 10× (L1=256MB, L2=2.5GB, L3=25GB, ...)
Non-overlapping within each level (except L0).
Write Amplification: ~30× per key (rewritten at each level)
Read Amplification: L+1 file checks (one per level)
Space Amplification: ~1.1× (compaction keeps old versions short-lived)

Best for: OLTP, mixed read/write, space efficiency.
        </div>
        <h3>Tiered/Size-Tiered Compaction (Cassandra, ScyllaDB)</h3>
        <div class="code-block">
Multiple overlapping SSTables per level, compact when count threshold hit.
Write Amplification: ~10× (fewer rewrites per key)
Read Amplification: higher — overlap means more files to check per level
Space Amplification: ~2× (older versions live longer before compaction)

Best for: write-heavy workloads, bulk loads.
        </div>
        <h3>FIFO Compaction (time-series, TTL workloads)</h3>
        <div class="code-block">
Only deletes oldest SSTable when total size exceeds threshold.
No real merging — just deletion.
Write Amplification: ~1× (no rewriting)
Read Amplification: very high (all files may need checking)

Best for: append-only time-series where old data TTLs out.
        </div>
      </div>
      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead><tr><th>Strategy</th><th>Write Ampl.</th><th>Read Ampl.</th><th>Space Ampl.</th><th>Use Case</th></tr></thead>
          <tbody>
            ${[
              ['Leveled','~30×','O(L)','~1.1×','PostgreSQL on RocksDB, OLTP'],
              ['Tiered','~10×','O(L × T)','~2×','Cassandra, write-heavy streams'],
              ['FIFO','~1×','very high','~1×','Time-series with TTL'],
              ['Universal','~10×','medium','~2×','Backup, analytical reads'],
            ].map(([s,w,r,sp,u])=>`<tr><td><strong>${s}</strong></td><td>${w}</td><td>${r}</td><td>${sp}</td><td style="font-size:10px">${u}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q:'Why does leveled compaction require all L0 files to be merged together, while L1+ can do partial compaction?',
      a:'L0 files have OVERLAPPING key ranges. Each MemTable flush creates a new L0 SSTable regardless of where keys land — flush 1 might write keys [5..70], and flush 2 might also write keys [15..80]. They overlap. For a point lookup at L0: you must check ALL L0 files (any of them might have the newest version of your key). For compaction: to produce non-overlapping L1 output, you must merge ALL L0 files that overlap with your target L1 range — which is all of them since L0 files overlap each other. L1+ files have NON-OVERLAPPING key ranges within the level. At L1, the key space is partitioned: each L1 SSTable owns a contiguous, non-overlapping range. Partial compaction at L1→L2: pick one L1 file. Find the L2 files that overlap with its key range. Compact just those L2 files. The other L1 files (different key ranges) are unaffected. This is why L0 compaction is expensive (all L0 files) but L1+ compaction is cheap (just the selected file + its L2 overlaps). Implication: keep L0 file count small. RocksDB default: L0_stop_writes_trigger=20 (stop accepting writes if L0 has 20 files — compaction can\'t keep up).',
      tip:'L0 file count is one of the most important RocksDB health metrics. rocksdb.num-files-at-level0 should stay below 8. If it climbs toward 20 (write stall threshold), increase compaction thread count (max_background_compactions) or reduce write rate.',
    },
    {
      q:'What is write amplification in LSM-Tree and how does compaction cause it?',
      a:'Write amplification (WA): physical bytes written / logical bytes written. In LSM-Tree: a key written once by the application is rewritten multiple times by compaction: (1) Written to WAL. (2) Flushed from MemTable to L0 SSTable. (3) Compacted from L0 into L1. (4) Compacted from L1 into L2. (5) ... up to Lmax. Each compaction level rewrites the data. For leveled compaction with 4 levels and level ratio 10×: a key is compacted through each level once on average. WA per level ≈ 10× (each L1 file overlaps with ~10 L2 files, so writing 1 file at L1 causes 10 files of L2 to be rewritten). Total WA ≈ levels × ratio ≈ 4 × 10 = 40×. In practice RocksDB sees WA of 30–50× for typical workloads. Impact: (1) SSD endurance — NVMe rated for 100 TBW. 1 TB NVMe with WA=40, 1 GB/s application write rate → exhausted in ~3 days. Solution: use higher-endurance SSDs, reduce WA with larger levels or compression. (2) I/O bandwidth — compaction competes with application writes/reads for disk bandwidth. At Amazon scale: DynamoDB provisions dedicated compaction I/O capacity separate from the read/write request path.',
      tip:'RocksDB statistic rocksdb.compact.write.bytes / rocksdb.write.bytes gives the empirical WA ratio. Compare with your SSD\'s TBW rating to estimate endurance. If WA > 50×, consider switching to tiered compaction or tuning level_size_multiplier.',
    },
    {
      q:'How does compaction handle DELETE operations and when is data actually removed?',
      a:'LSM-Tree DELETE: a delete is implemented as inserting a "tombstone" key-value pair (key + delete marker). The tombstone has a higher sequence number than the original key. The old data is NOT removed from the SSTable — it\'s still on disk. READ sees the tombstone first (newest sequence): returns "key does not exist." Compaction removes data: when compaction merges an SSTable containing a tombstone with the SSTable containing the original key, the merge-sort produces output where: the tombstone "wins" over the old value (higher seq#), THEN compaction drops both — the tombstone has absorbed the old value. The key is gone from the output. Edge case — bottommost level: at the deepest level (Lmax), there is no older version below. A tombstone at Lmax can be safely dropped because no lower level has the original key. Compaction at Lmax drops tombstones without including them in output. Time-to-actual-delete: from application DELETE to physical removal = time for the tombstone to compact through all levels to Lmax. For a 4-level LSM with 25 GB/level and 1 GB/s compaction throughput: ~hours to days. This is why LSM-Tree space amplification can be ~2× temporarily — deleted data persists until compaction finishes.',
      tip:'RocksDB snapshot retention blocks tombstone dropping. If a reader holds an old snapshot (for long-running analytics), tombstones covering keys older than that snapshot cannot be dropped — they must be preserved for MVCC visibility. This is why long-running reads cause index bloat in both PostgreSQL (dead tuples) and RocksDB (tombstone accumulation).',
    },
  ]);
  initIQ(container);
  return () => engine.destroy();
}
