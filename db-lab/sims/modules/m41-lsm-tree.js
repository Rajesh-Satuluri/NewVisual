import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

// LSM-Tree: write path Client → WAL → MemTable → L0 SSTables → L1 → L2
const COMPONENTS = [
  { id:'client',  label:'Client Write',    x:90,  y:50,  w:130, h:36, color:'#06B6D4', shape:'rect' },
  { id:'wal',     label:'WAL (disk)',       x:90,  y:130, w:130, h:36, color:'#F59E0B', shape:'rect' },
  { id:'mem',     label:'MemTable (RAM)',   x:90,  y:210, w:130, h:36, color:'#4F46E5', shape:'rect' },
  { id:'l0a',     label:'SST L0',          x:280, y:150, w:80,  h:30, color:'#10B981', shape:'sst' },
  { id:'l0b',     label:'SST L0',          x:370, y:150, w:80,  h:30, color:'#10B981', shape:'sst' },
  { id:'l0c',     label:'SST L0',          x:460, y:150, w:80,  h:30, color:'#10B981', shape:'sst' },
  { id:'l1a',     label:'SST L1',          x:280, y:230, w:100, h:30, color:'#818CF8', shape:'sst' },
  { id:'l1b',     label:'SST L1',          x:390, y:230, w:100, h:30, color:'#818CF8', shape:'sst' },
  { id:'l2a',     label:'SST L2',          x:280, y:310, w:260, h:30, color:'#A78BFA', shape:'sst' },
];

const LSM_STEPS = [
  { hi:[], arrows:[], desc:'LSM-Tree (Log-Structured Merge-Tree). Optimizes for sequential writes. All writes go to a sequential log + in-memory structure. Data is periodically flushed to disk in sorted "SSTable" files, then merged in background compaction.' },
  { hi:['client','wal'], arrows:[['client','wal']], desc:'Step 1 — Write: Client sends INSERT/UPDATE. Operation is appended to the Write-Ahead Log (WAL) sequentially. WAL is a sequential disk write (~0.01ms on NVMe). Durability achieved immediately — even if the server crashes, WAL replays on restart.' },
  { hi:['wal','mem'], arrows:[['wal','mem']], desc:'Step 2 — MemTable: after WAL write, key is inserted into the MemTable (in-memory sorted structure, usually a red-black tree or skip list). Insertion is O(log N) in RAM. Client gets the write ACK now — very low latency.' },
  { hi:['mem','l0a'], arrows:[['mem','l0a']], desc:'Step 3 — Flush: MemTable reaches threshold (e.g., 64 MB). It is flushed to disk as an immutable SSTable file at Level 0. The flush is a sequential write. A new empty MemTable is created for incoming writes.' },
  { hi:['l0a','l0b','l0c'], arrows:[], desc:'Level 0 SSTables: multiple SSTable files exist at L0. L0 files may have OVERLAPPING key ranges (each is a separate flush). Point lookups must check ALL L0 files — this is why L0 size is kept small (typically 4 files max).' },
  { hi:['l0a','l0b','l0c','l1a','l1b'], arrows:[['l0a','l1a'],['l0b','l1b']], desc:'Step 4 — Compaction L0→L1: when L0 has enough files, a background compaction merges them with L1 files. Output is a new set of L1 SSTables with non-overlapping key ranges. Old files are deleted after compaction.' },
  { hi:['l1a','l1b','l2a'], arrows:[['l1a','l2a'],['l1b','l2a']], desc:'Step 5 — Compaction L1→L2: similarly, L1 files compact into L2. Each level is typically 10× larger than the previous. L2 files can be hundreds of GB. L2 has no key overlap — a point lookup of a non-L0 key touches at most 1 file per level.' },
  { hi:[], arrows:[], desc:'LSM vs B+ Tree: LSM wins on WRITE throughput (sequential I/O only). B+ Tree wins on READ latency (guaranteed O(log N), no level scanning). Databases using LSM: RocksDB (Amazon DynamoDB backend, MyRocks), LevelDB, Apache Cassandra, ClickHouse.' },
];

function drawArrow(ctx, from, to, color) {
  ctx.strokeStyle=color||'#F59E0B'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(from[0],from[1]); ctx.lineTo(to[0],to[1]); ctx.stroke();
  const dx=to[0]-from[0], dy=to[1]-from[1];
  const len=Math.sqrt(dx*dx+dy*dy);
  if(len<1) return;
  const ux=dx/len,uy=dy/len;
  ctx.fillStyle=color||'#F59E0B'; ctx.beginPath();
  ctx.moveTo(to[0],to[1]);
  ctx.lineTo(to[0]-ux*10-uy*5,to[1]-uy*10+ux*5);
  ctx.lineTo(to[0]-ux*10+uy*5,to[1]-uy*10-ux*5);
  ctx.fill();
}

function drawLSM(ctx, stepIdx, w, h) {
  ctx.clearRect(0, 0, w, h);
  const step = LSM_STEPS[Math.max(0, stepIdx)];
  const hiSet = new Set(step.hi);

  // Level labels
  ctx.fillStyle='#334155'; ctx.font='700 10px system-ui';
  ctx.fillText('DRAM', 240, 225); ctx.fillText('L0 (disk)', 570, 165); ctx.fillText('L1', 570, 245); ctx.fillText('L2', 570, 325);
  // Vertical divider
  ctx.strokeStyle='#1E293B'; ctx.lineWidth=1; ctx.setLineDash([4,4]);
  ctx.beginPath(); ctx.moveTo(240, 80); ctx.lineTo(240, 360); ctx.stroke();
  ctx.setLineDash([]);

  // Draw components
  COMPONENTS.forEach(c => {
    const isHi = hiSet.has(c.id);
    ctx.fillStyle = isHi ? c.color+'33' : '#0A0F1A';
    ctx.strokeStyle = isHi ? c.color : '#1E293B';
    ctx.lineWidth = isHi ? 2.5 : 1;
    ctx.beginPath(); ctx.roundRect(c.x, c.y, c.w, c.h, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = isHi ? c.color : '#475569';
    ctx.font = (isHi?'700':'400')+' 10px system-ui'; ctx.textAlign='center';
    ctx.fillText(c.label, c.x+c.w/2, c.y+c.h/2+4); ctx.textAlign='left';
  });

  // Draw size labels under SSTs
  [['l0a','~64MB'],['l0b','~64MB'],['l0c','~64MB'],['l1a','~640MB'],['l1b','~640MB'],['l2a','~6.4GB']].forEach(([id,lbl])=>{
    const c=COMPONENTS.find(x=>x.id===id);
    ctx.fillStyle='#334155'; ctx.font='8px system-ui'; ctx.textAlign='center';
    ctx.fillText(lbl, c.x+c.w/2, c.y+c.h+12); ctx.textAlign='left';
  });

  // Draw arrows for active steps
  const arrowMap = { 'client→wal':[[155,68],[155,130]], 'wal→mem':[[155,166],[155,210]], 'mem→l0a':[[155,246],[280,165]], 'l0a→l1a':[[320,180],[320,230]], 'l0b→l1b':[[410,180],[420,230]], 'l1a→l2a':[[330,260],[330,310]], 'l1b→l2a':[[440,260],[440,310]] };
  step.arrows.forEach(([a,b])=>{
    const key=`${a}→${b}`;
    if(arrowMap[key]) drawArrow(ctx, arrowMap[key][0], arrowMap[key][1], '#F59E0B');
  });

  // Legend
  ctx.fillStyle='#1E293B'; ctx.beginPath(); ctx.roundRect(20, h-52, 230, 44, 4); ctx.fill();
  [['#4F46E5','MemTable (RAM)'],['#10B981','L0 (recent)'],['#818CF8','L1 (compacted)'],['#A78BFA','L2 (large)']].forEach(([col,lbl],i)=>{
    ctx.fillStyle=col; ctx.beginPath(); ctx.roundRect(28, h-44+i*11, 8, 8, 2); ctx.fill();
    ctx.fillStyle='#94A3B8'; ctx.font='8px system-ui'; ctx.fillText(lbl, 40, h-37+i*11);
  });

  if (stepIdx<0) {
    ctx.fillStyle='#475569'; ctx.font='13px system-ui'; ctx.textAlign='center';
    ctx.fillText('Press Play to walk through the LSM-Tree write path', w/2, h/2);
    ctx.textAlign='left';
  } else {
    ctx.fillStyle='#0F172A'; ctx.beginPath(); ctx.roundRect(260, h-52, w-280, 44, 4); ctx.fill();
    const words=step.desc.split(' ');
    let line='', ly=h-36;
    ctx.fillStyle='#94A3B8'; ctx.font='9.5px system-ui';
    words.forEach(wd=>{
      const t=line+(line?' ':'')+wd;
      if(ctx.measureText(t).width>w-300){ctx.fillText(line,268,ly);line=wd;ly+=13;}else line=t;
    });
    if(line) ctx.fillText(line,268,ly);
  }
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag:'Storage Engine · M41', title:'LSM-Tree',
    subtitle:'Log-Structured Merge-Tree: sequential writes to WAL + MemTable, compaction to sorted SSTables.',
    tabs:[
      { id:'lsm',  label:'🌲 LSM Write Path' },
      { id:'cmp',  label:'⚖️ B+ Tree vs LSM' },
      { id:'iq',   label:'💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  const tab = container.querySelector('#tab-lsm');
  tab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="canvas-wrap" style="margin-top:12px">
      <canvas width="800" height="380" style="width:100%;max-height:380px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="lsm-exp">
        <h3>LSM-Tree — Write-Optimized Storage</h3>
        <p>LSM-Tree converts all writes into sequential I/O: write to WAL (sequential disk), then MemTable (RAM).
           Background compaction merges data into progressively larger sorted SSTable files.
           Optimized for high write throughput at the cost of higher read amplification.
           Press <strong>Play</strong> to walk the write path.</p>
      </div>
    </div>`;
  const canvas = tab.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const engine = new SimulationEngine({
    initialState:{step:-1},
    steps:LSM_STEPS.map((s,i)=>({label:`Step ${i+1}`, duration:2200, mutate:st=>{st.step=i;}})),
    onRender:state=>{
      drawLSM(ctx, state.step, 800, 380);
      const el=tab.querySelector('#lsm-exp');
      if(el&&state.step>=0) el.innerHTML=`<h3>Step ${state.step+1}</h3><p>${LSM_STEPS[state.step].desc}</p>`;
    },
  });
  SimulationEngine.renderControls(tab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(tab.querySelector('.canvas-wrap'), engine);
  drawLSM(ctx, -1, 800, 380);
  engine.reset();

  container.querySelector('#tab-cmp').innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">B+ Tree vs LSM-Tree Trade-offs</div>
        <div class="section-desc">Write amplification, read amplification, and space amplification</div>
      </div>
      <div class="prose">
        <h3>The Three Amplifications</h3>
        <div class="code-block">
Write Amplification (WA) = physical bytes written / logical bytes written
Read Amplification (RA)  = physical reads / logical reads
Space Amplification (SA) = disk used / live data size

B+ Tree:   WA=10–30×  RA=4 page reads  SA=1.1–1.5×
LSM-Tree:  WA=10–100× RA=L levels      SA=1.1–2×
  (RocksDB Leveled: WA≈30, RA≈5, SA≈1.1)
  (RocksDB Universal: WA≈10, RA≈10, SA≈2)
        </div>
        <h3>Use Case Decision</h3>
        <div class="code-block">
Choose B+ Tree when:
  - Read-heavy workloads (OLTP, product catalog lookups)
  - Predictable O(log N) read latency required
  - Complex queries with range scans and joins
  → PostgreSQL, MySQL InnoDB, Oracle, SQL Server

Choose LSM-Tree when:
  - Write-heavy workloads (event streams, time-series, logs)
  - Sequential key patterns (timestamps, monotonic IDs)
  - Space efficiency is critical (compaction removes old versions)
  → RocksDB (DynamoDB, TiKV), Cassandra, ClickHouse, ScyllaDB
        </div>
      </div>
      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead><tr><th>Property</th><th>B+ Tree</th><th>LSM-Tree</th></tr></thead>
          <tbody>
            ${[
              ['Write I/O pattern','Random (any leaf page)','Sequential (WAL + memtable flush)'],
              ['Write latency','~0.1–1ms (NVMe)','~0.01ms (WAL seq write + RAM)'],
              ['Read latency','O(log N) guaranteed','O(L × bloom filter check)'],
              ['Point lookup worst case','4 page reads','L levels × (bloom + block read)'],
              ['Range scan','O(log N + K) leaf chain','Merge iterator across levels'],
              ['Space on DELETE','Leaves bloat until VACUUM','Compaction removes old versions'],
              ['Background work','AUTOVACUUM','Compaction threads'],
              ['Production users','PostgreSQL, MySQL, Oracle','RocksDB, Cassandra, LevelDB'],
            ].map(([p,b,l])=>`<tr><td><strong>${p}</strong></td><td style="font-size:10px">${b}</td><td style="font-size:10px">${l}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q:'What is the core insight of LSM-Tree and why does it improve write throughput over B+ Tree?',
      a:'LSM-Tree\'s core insight: convert random writes (which are slow) into sequential writes (which are fast). In a B+ Tree, every INSERT/UPDATE requires a random write to a specific leaf page — wherever that key falls in the sorted tree. On HDD this is 8ms per random write. On NVMe it\'s 0.1ms — still slower than sequential. LSM-Tree instead: (1) Write to WAL: sequential append to a log file — 0.01ms, regardless of key. (2) Insert into MemTable: in-memory red-black tree or skip list — nanoseconds. (3) Periodically flush MemTable to disk: sequential write of a sorted file (SSTable). This flush is ONE sequential I/O for potentially millions of key-value pairs. (4) Background compaction: merges SSTables into larger sorted files — also sequential I/O. Result: client-visible write latency = WAL write time (~0.01ms) + RAM insert time (~0.001ms). Compared to B+ tree: ~0.1–1ms per write (random I/O to leaf page). LSM-Tree write throughput: 10–100× higher. Trade-off: reads are more expensive — must search multiple SSTable levels and use bloom filters to avoid reading every SSTable.',
      tip:'The WAL is shared by both LSM-Tree (as crash recovery) and B+ Tree (as durability). The difference: in B+ Tree the WAL is for recovery only; in LSM-Tree the WAL is the primary durability mechanism AND the first persistent storage for every write.',
    },
    {
      q:'How does read amplification work in LSM-Tree and how do bloom filters mitigate it?',
      a:'Read amplification: for a point lookup in LSM-Tree, the system must search: MemTable (in-memory, fast), then Level 0 files (all of them, since L0 has overlapping key ranges, typically 4 files), then Level 1 (only 1 file since L1 has non-overlapping ranges), then Level 2 (1 file), ... through all levels. Worst case: key is not found → check everything. Read amplification = L levels checked. RocksDB with 5 levels: check MemTable + 4 L0 files + 1 per L1-L5 = ~10 checks before concluding key doesn\'t exist. Each "check" is a random I/O to an SSTable file block. Bloom filter mitigation: each SSTable has a bloom filter (probabilistic data structure). Before reading a data block, check the bloom filter: if it says "definitely not here" → skip this SSTable (no I/O). Bloom filters are <1% false positive rate for typical sizes. Result: for each level, instead of 1 full block read, just a bloom filter check (~50–200 bytes in cache). Actual I/O only on true positives. In practice: 95–99% of non-existent key lookups are handled by bloom filters with zero data block I/O.',
      tip:'RocksDB metrics: read_amplification is a first-class metric. bloom_filter_useful counts how many times the bloom filter saved a data block read. On a healthy read workload: bloom_filter_useful should be 90–99% of reads for non-existent keys.',
    },
    {
      q:'What is compaction in LSM-Tree and what problem does it solve?',
      a:'Compaction is the background process that merges SSTable files from one level into the next larger level. Problem it solves: without compaction, data would accumulate at L0 as many overlapping SSTable files. Reads would get slower as L0 file count grows (must check every L0 file). Deleted/updated data (marked with "tombstones") would persist forever, wasting space. Compaction algorithm (RocksDB Leveled): when L0 has ≥ 4 files, pick L0 files that overlap with L1. Merge-sort the key ranges together, producing new L1 files. Delete old L0 and L1 files. In the merged output: newest version of each key wins; tombstones remove old versions. L1→L2 compaction similarly runs when L1 exceeds its size limit. Benefits: (1) Fewer files per level → faster reads (fewer SSTables to check). (2) Space reclamation: deleted and overwritten data is removed. (3) Key ordering enforced: non-overlapping files enable binary search for lookup. Write amplification cost: a key written once may be rewritten at L0→L1→L2→L3 compaction = ~30× write amplification for 4-level RocksDB. SSDs have write endurance limits — high WA exhausts SSD cells faster.',
      tip:'RocksDB statistic rocksdb.compaction.key.drop.obsolete counts keys removed during compaction. A high number means many overwrites or deletes — compaction is reclaiming significant space. Also check rocksdb.compact-write-bytes vs rocksdb.write-bytes (application writes) for actual WA ratio.',
    },
  ]);
  initIQ(container);
  return () => engine.destroy();
}
