import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

// SSTable layout (from bottom to top of file):
// Footer | Meta Index Block | Filter Block | Index Block | Data Blocks (sorted)
const SECTIONS = [
  { id:'footer', label:'Footer', sub:'48 bytes · magic number + metaindex offset', color:'#64748B', h:36, y:0 },
  { id:'meta',   label:'Meta Index Block', sub:'pointer to filter block and index block', color:'#F59E0B', h:36, y:0 },
  { id:'filter', label:'Filter Block (Bloom)', sub:'bloom filter for each data block — ~10 bits/key', color:'#A78BFA', h:36, y:0 },
  { id:'index',  label:'Index Block', sub:'sparse index: last key of each data block + block offset', color:'#818CF8', h:36, y:0 },
  { id:'data3',  label:'Data Block 3', sub:'keys: [55,60,70,78] — compressed, sorted', color:'#10B981', h:40, y:0 },
  { id:'data2',  label:'Data Block 2', sub:'keys: [31,38,42,48] — compressed, sorted', color:'#10B981', h:40, y:0 },
  { id:'data1',  label:'Data Block 1', sub:'keys: [10,15,20,25] — compressed, sorted', color:'#10B981', h:40, y:0 },
];
// Positions are computed bottom-up
(function() {
  let y = 30;
  for (let i = SECTIONS.length-1; i >= 0; i--) {
    SECTIONS[i].y = y; y += SECTIONS[i].h + 6;
  }
})();

const SST_STEPS = [
  { hi:[], lookup:null, desc:'SSTable (Sorted String Table): an immutable, sorted, compressed file written during MemTable flush. Once written, an SSTable is never modified — only read or deleted during compaction. Structure from top: data blocks, index block, filter block, meta index, footer.' },
  { hi:['data1','data2','data3'], lookup:null, desc:'Data Blocks: the actual key-value pairs, sorted by key, compressed with Snappy or LZ4. Each block is typically 4 KB. Keys within a block share a common prefix (RocksDB uses prefix compression). Block is the unit of I/O — a point lookup reads exactly one block.' },
  { hi:['index'], lookup:null, desc:'Index Block: a sparse index mapping the LAST key of each data block to its file offset + size. Point lookup: binary search the index block (16–32 entries) → find the correct data block → read just that block. Index block is tiny and usually stays cached in block cache.' },
  { hi:['filter'], lookup:null, desc:'Filter Block: holds a bloom filter for each data block (or one per file). Before reading a data block, check its bloom filter — if "definitely not here," skip the block entirely. Filters are stored in compressed form and loaded into block cache. ~10 bits/key → ~1% false positive rate.' },
  { hi:['meta','footer'], lookup:null, desc:'Meta Index Block + Footer: the footer is a fixed 48-byte structure at the end of the file with a magic number and the offset of the meta index block. On open, read footer → find meta index → find filter and index blocks. SSTable is self-describing.' },
  { hi:['filter','index','data2'], lookup:42, desc:'Point lookup for key=42: (1) Check filter block → bloom filter says "maybe." (2) Binary search index block → data block 2 covers keys [31..48]. (3) Read data block 2 from disk → decompress → binary search → found key=42. 3 operations, 1 data block read.' },
  { hi:['index','data2','data3'], lookup:null, desc:'Range scan [42, 60]: index block gives data block 2 (first key ≥ 42). Read data block 2, return keys [42,48]. Follow to data block 3 (index says start key=55). Read data block 3, return [55,60]. Done — 2 data block reads for 4 keys.' },
];

function drawSST(ctx, stepIdx, w, h) {
  ctx.clearRect(0, 0, w, h);
  const step = SST_STEPS[Math.max(0, stepIdx)];
  const hiSet = new Set(step.hi);

  const fileX = 60, fileW = 500;
  ctx.fillStyle='#64748B'; ctx.font='700 10px system-ui';
  ctx.fillText('SSTable file (on disk — immutable)', fileX, 22);
  ctx.fillStyle='#F59E0B'; ctx.font='10px system-ui';
  ctx.fillText('← grows during flush (sequential write, top to bottom in file order)', fileX+10, h-10);

  SECTIONS.forEach(s => {
    const isHi = hiSet.has(s.id);
    ctx.fillStyle = isHi ? s.color+'33' : '#0A0F1A';
    ctx.strokeStyle = isHi ? s.color : '#1E293B';
    ctx.lineWidth = isHi ? 2.5 : 1;
    ctx.beginPath(); ctx.roundRect(fileX, s.y, fileW, s.h, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = isHi ? s.color : '#475569';
    ctx.font = (isHi?'700':'400') + ' 11px system-ui';
    ctx.fillText(s.label, fileX+12, s.y + s.h/2 - 4);
    ctx.fillStyle = isHi ? s.color+'CC' : '#334155'; ctx.font = '8px system-ui';
    ctx.fillText(s.sub, fileX+12, s.y + s.h/2 + 9);
  });

  // Size callout on right
  const sizes = [['footer','48 B'],['meta','~200 B'],['filter','~1 bit/key × N'],['index','~32 entries × 20 B'],['data3','~4 KB'],['data2','~4 KB'],['data1','~4 KB']];
  sizes.forEach(([id,sz])=>{
    const s=SECTIONS.find(x=>x.id===id);
    const isHi=hiSet.has(id);
    ctx.fillStyle=isHi?s.color:'#334155'; ctx.font=(isHi?'700':'400')+' 8px monospace';
    ctx.fillText(sz, fileX+fileW+12, s.y+s.h/2+4);
  });

  // Lookup animation
  if (step.lookup && stepIdx>=0) {
    ctx.fillStyle='#F59E0B22'; ctx.strokeStyle='#F59E0B'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.roundRect(w-200, 30, 185, 100, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#F59E0B'; ctx.font='700 10px system-ui';
    ctx.fillText(`Lookup: key=${step.lookup}`, w-192, 48);
    ctx.fillStyle='#94A3B8'; ctx.font='9px system-ui';
    ['1. Check bloom filter','2. Binary-search index','3. Read 1 data block','4. Binary-search block'].forEach((t,i)=>{
      ctx.fillText(t, w-192, 66+i*13);
    });
  }

  if (stepIdx<0) {
    ctx.fillStyle='#475569'; ctx.font='13px system-ui'; ctx.textAlign='center';
    ctx.fillText('Press Play to explore SSTable structure and lookup', w/2, h/2+20);
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
    tag:'Storage Engine · M43', title:'SSTable',
    subtitle:'Sorted String Table: immutable, sorted, compressed file with sparse index and bloom filter.',
    tabs:[
      { id:'sst',    label:'📦 SSTable Layout' },
      { id:'lookup', label:'🔎 Lookup Algorithm' },
      { id:'iq',     label:'💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  const tab = container.querySelector('#tab-sst');
  tab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="canvas-wrap" style="margin-top:12px">
      <canvas width="800" height="380" style="width:100%;max-height:380px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="sst-exp">
        <h3>SSTable — Self-Describing Sorted File</h3>
        <p>An SSTable is an immutable on-disk file produced by flushing a MemTable or by compaction.
           Its structure is designed for efficient lookup: footer → meta index → bloom filter → sparse index → data blocks.
           Press <strong>Play</strong> to walk through each component and a point lookup.</p>
      </div>
    </div>`;
  const canvas = tab.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const engine = new SimulationEngine({
    initialState:{step:-1},
    steps:SST_STEPS.map((s,i)=>({label:`Step ${i+1}`, duration:2200, mutate:st=>{st.step=i;}})),
    onRender:state=>{
      drawSST(ctx, state.step, 800, 380);
      const el=tab.querySelector('#sst-exp');
      if(el&&state.step>=0) el.innerHTML=`<h3>Step ${state.step+1}</h3><p>${SST_STEPS[state.step].desc}</p>`;
    },
  });
  SimulationEngine.renderControls(tab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(tab.querySelector('.canvas-wrap'), engine);
  drawSST(ctx, -1, 800, 380);
  engine.reset();

  container.querySelector('#tab-lookup').innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">SSTable Lookup Algorithm</div>
        <div class="section-desc">How point lookup and range scan traverse SSTable structure</div>
      </div>
      <div class="prose">
        <h3>Point Lookup (multi-level)</h3>
        <div class="code-block">
For each level in LSM-Tree (MemTable → L0 → L1 → ... → Ln):

1. MemTable lookup: skip list search, O(log N). If found: return value.
2. For each SSTable at this level (all L0 files, 1 file per L1+):
   a. CHECK bloom filter for the target key.
      → "definitely not here" (no false negative): skip this file.
      → "maybe here" (1% false positive): continue to step b.
   b. BINARY SEARCH the index block (sparse, small, likely cached).
      → Find which data block contains the key range.
   c. READ the data block (4 KB) from disk (or block cache).
   d. BINARY SEARCH or prefix scan within the decompressed block.
3. If key found: return newest version. If not found: continue next level.
4. After all levels: key does not exist.
        </div>
        <h3>Range Scan</h3>
        <div class="code-block">
Range scan for keys A..B across all SSTable levels:
1. For each level: find the starting SSTable (binary search on min key).
2. Create a merge iterator across all relevant SSTables.
3. Merge iterator returns keys in sorted order (like merge sort).
4. Keys from higher levels (newer data) shadow lower-level duplicates.
5. Return each unique key in ascending order until key > B.

Cost: O(K) keys returned, O(L) iterators open simultaneously.
RocksDB compaction ensures L1+ files are non-overlapping → merge
iterator at L1+ always has at most 1 active SSTable per level.
        </div>
      </div>
      <div class="info-grid">
        ${[
          { label:'Block cache', color:'#4F46E5', desc:'RocksDB block cache holds frequently accessed data blocks, index blocks, and bloom filters in RAM. LRU eviction. Typical size: 50–70% of RAM. A fully cached index block means lookup costs 0 disk reads until the data block itself. Tuning: set block_cache_size to the amount of RAM you can spare.' },
          { label:'Compression',   color:'#10B981', desc:'Data blocks are compressed with Snappy (fast) or Zstd (better ratio). Typical compression ratio: 3–5× for string data. Compression reduces I/O (fewer bytes to read) at the cost of CPU for decompression. Index and filter blocks are stored uncompressed for fast access. Dictionary compression for similar keys (e.g., same key prefix) achieves 10× ratios.' },
          { label:'Prefix coding', color:'#F59E0B', desc:'Within a data block, RocksDB uses prefix compression: each key stores only the diff from the previous key. Example: "order:1000001", "order:1000002" → store full first key, then just "+1" for next. Restart points every 16 keys allow random access within a block without decoding from the start.' },
          { label:'Two-level index', color:'#06B6D4', desc:'For very large SSTable files, RocksDB uses a two-level index: a top-level index pointing to index blocks (each covering a range of data blocks). This keeps the first-level index small enough to always cache in RAM, while the second-level index blocks are loaded on demand.' },
        ].map(e=>`
          <div class="info-card" style="border-color:${e.color}33">
            <div style="font-weight:700;font-size:11px;color:${e.color};margin-bottom:6px">${e.label}</div>
            <div class="info-card-body">${e.desc}</div>
          </div>`).join('')}
      </div>
    </div>`;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q:'Walk through a point lookup in RocksDB. How many disk reads does it take in the best and worst case?',
      a:'Lookup for key K in RocksDB with 4 levels (L0–L3): Best case (key in MemTable): 0 disk reads. Skip list lookup in RAM. Best case (key in block cache): bloom filter (memory) says "maybe" → index block (cached) gives block offset → data block (cached) has the key. 0 disk reads, ~3 memory lookups. Typical case (key in L1, bloom filters in cache): L0: 4 bloom filter checks (memory) → all say "not here" (or 1 says "maybe" → 1 block read). L1: 1 bloom filter check → "maybe" → 1 data block read. Total: 1–2 disk reads. Worst case (key not found, no bloom filters cached): check MemTable, L0 (4 files × 1 block read each), L1 (1 block read), L2 (1 block read), L3 (1 block read) = up to 7+ block reads. This is why bloom filters are critical — without them, every "not found" key is an expensive multi-level scan. With bloom filters: "not found" key = O(L) bloom filter checks (all in cache) + 0 disk reads (no false positives). False positive rate ~1% → 1% of "not found" keys still trigger a data block read.',
      tip:'RocksDB block cache hit/miss ratio is the single most important operational metric. Use rocksdb.block.cache.hit and rocksdb.block.cache.miss counters. Target: >95% hit rate. If lower: increase block_cache_size or investigate working set size.',
    },
    {
      q:'Why are SSTables immutable and how does compaction replace them?',
      a:'SSTable immutability: once an SSTable file is written during a flush or compaction, it is NEVER modified. This simplifies the architecture enormously: (1) No concurrency issues — readers never see partial writes. (2) No lock needed for reads — multiple readers can read the same SSTable simultaneously without coordination. (3) Crash recovery is simple — SSTables on disk are always complete files; partial writes at the end of a crash are ignored. (4) OS page cache works efficiently — immutable files have stable mappings. Compaction replaces SSTables: when L0 has too many files, compaction reads multiple SSTable files, merge-sorts their key ranges into new SSTable files for L1, then ATOMICALLY updates the MANIFEST to: add the new L1 SSTables, remove the old L0 SSTables. The old files are physically deleted after all open readers have closed them (ref-counting via shared_ptr in RocksDB). Readers that opened an SSTable before compaction can finish reading it — the file still exists until they release their reference. Readers that open after compaction see the new L1 SSTables.',
      tip:'MANIFEST file tracks which SSTables exist and their key ranges at each level. After a crash, RocksDB replays the MANIFEST to discover the correct set of SSTable files. Any SSTable files on disk not referenced by MANIFEST are garbage-collected on startup.',
    },
    {
      q:'What is the index block in an SSTable and why is it "sparse"?',
      a:'Index block: maps the last key of each data block to the block\'s file offset and size. Example: data block 1 contains keys [10..25], data block 2 contains [31..48]. Index block entries: {key=25, offset=0, size=4096}, {key=48, offset=4096, size=4096}. "Sparse" because the index doesn\'t list every key — just one entry per data block. For a 64 MB SSTable with 4 KB data blocks: 16,384 data blocks → 16,384 index entries. At ~20 bytes per entry: index block is ~320 KB. This fits in memory easily (RocksDB block cache). Lookup efficiency: binary search the index block (16K entries, O(log 16K) = 14 comparisons) → find one data block → read 4 KB from disk → binary search within block. Total: 0 disk reads for index (cached) + 1 disk read for data. Contrast with a "dense" index (one entry per key): for 350M keys at 20 bytes each → 7 GB index — cannot be cached. The sparse index trades perfect precision for cacheability. The data block read is unavoidable but it\'s exactly 1 block regardless of table size.',
      tip:'RocksDB\'s index_block_size_bytes controls data block size (default 4096). Larger blocks: fewer index entries (better cacheability), but each block read transfers more data (higher I/O for point lookups). Typical production setting: 4–16 KB.',
    },
  ]);
  initIQ(container);
  return () => engine.destroy();
}
