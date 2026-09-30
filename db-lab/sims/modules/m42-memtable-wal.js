import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

// Write sequence: 5 writes, then flush
const WRITES = [
  { key:42,  val:'order#A', t:'12:00:01' },
  { key:15,  val:'order#B', t:'12:00:02' },
  { key:78,  val:'order#C', t:'12:00:03' },
  { key:31,  val:'order#D', t:'12:00:04' },
  { key:55,  val:'order#E', t:'12:00:05' },
];
// MemTable sorted state after each insertion
const MEM_STATES = [
  [],
  [[42,'order#A']],
  [[15,'order#B'],[42,'order#A']],
  [[15,'order#B'],[42,'order#A'],[78,'order#C']],
  [[15,'order#B'],[31,'order#D'],[42,'order#A'],[78,'order#C']],
  [[15,'order#B'],[31,'order#D'],[42,'order#A'],[55,'order#E'],[78,'order#C']],
];

const MW_STEPS = [
  { wi:-1,  mem:0, phase:'idle',   wal:[], desc:'MemTable + WAL write path. Every write goes to two places: (1) WAL (Write-Ahead Log) — sequential append to disk for durability. (2) MemTable — in-memory sorted structure for fast reads. Neither write requires a random disk seek.' },
  { wi:0,   mem:1, phase:'write',  wal:[0], desc:'Write key=42. Step 1: append WAL record {seq:1, key:42, val:"order#A"} to the log file — sequential disk write (~10μs on NVMe). Step 2: insert key=42 into MemTable red-black tree — O(log N) in RAM.' },
  { wi:1,   mem:2, phase:'write',  wal:[0,1], desc:'Write key=15. WAL record appended. MemTable now sorted: [15,42]. LSM-Tree maintains sort order in MemTable using a self-balancing BST (RocksDB uses skip list, many others use red-black tree).' },
  { wi:2,   mem:3, phase:'write',  wal:[0,1,2], desc:'Write key=78. WAL appended. MemTable: [15,42,78]. Reads can be served from MemTable (O(log N) lookup) — most recent version of a key always available in RAM without any disk I/O.' },
  { wi:3,   mem:4, phase:'write',  wal:[0,1,2,3], desc:'Write key=31. WAL appended. MemTable: [15,31,42,78]. Notice the MemTable is always kept sorted — flush will produce a sorted SSTable file at zero extra cost (just a sorted iterator walk).' },
  { wi:4,   mem:5, phase:'write',  wal:[0,1,2,3,4], desc:'Write key=55. MemTable now has 5 entries. MemTable size threshold reached (RocksDB default: 64 MB). Next: MemTable is made immutable and flushed to an SSTable at Level 0.' },
  { wi:-1,  mem:5, phase:'flush',  wal:[0,1,2,3,4], desc:'FLUSH: immutable MemTable is written as a sorted SSTable file to Level 0 (disk). Sequential write: iterate MemTable in sorted order → write data blocks. New MemTable starts empty for incoming writes. WAL log can be safely truncated after flush completes.' },
];

function drawMemWAL(ctx, stepIdx, w, h) {
  ctx.clearRect(0, 0, w, h);
  const step = MW_STEPS[Math.max(0, stepIdx)];

  // Panel labels
  ctx.fillStyle='#64748B'; ctx.font='700 10px system-ui';
  ctx.fillText('WAL (disk — sequential log)', 30, 22);
  ctx.fillText('MemTable (RAM — sorted red-black tree)', 430, 22);

  // WAL panel
  ctx.fillStyle='#0A0F1A'; ctx.strokeStyle='#F59E0B33'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.roundRect(20, 30, 380, 160, 6); ctx.fill(); ctx.stroke();

  WRITES.forEach((wr, i) => {
    const active = step.wal.includes(i);
    const isCurrent = step.wi === i;
    const ry = 42 + i * 28;
    ctx.fillStyle = isCurrent ? '#F59E0B33' : active ? '#1E293B' : '#0A0F1A';
    ctx.strokeStyle = isCurrent ? '#F59E0B' : active ? '#334155' : '#1E293B44';
    ctx.lineWidth = isCurrent ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(28, ry, 364, 24, 3); ctx.fill(); ctx.stroke();
    if (active) {
      ctx.fillStyle = isCurrent ? '#F59E0B' : '#64748B'; ctx.font = (isCurrent?'700':'400') + ' 9px monospace';
      ctx.fillText(`{seq:${i+1}, key:${wr.key}, val:"${wr.val}", ts:${wr.t}}`, 36, ry+15);
    } else {
      ctx.fillStyle='#1E293B'; ctx.font='9px monospace';
      ctx.fillText(`[slot ${i+1} — empty]`, 36, ry+15);
    }
  });

  // WAL label
  ctx.fillStyle='#334155'; ctx.font='8px system-ui';
  ctx.fillText('← sequential append only', 28, 205);

  // MemTable panel
  const mstate = MEM_STATES[step.mem];
  ctx.fillStyle='#0A0F1A'; ctx.strokeStyle='#4F46E533'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.roundRect(420, 30, 360, 160, 6); ctx.fill(); ctx.stroke();

  const mw = 320, mh = 24;
  const mtop = 42;
  mstate.forEach(([k, v], i) => {
    const my = mtop + i * 28;
    const isCurr = step.wi>=0 && WRITES[step.wi].key === k;
    ctx.fillStyle = isCurr ? '#4F46E533' : '#0F172A';
    ctx.strokeStyle = isCurr ? '#4F46E5' : '#334155';
    ctx.lineWidth = isCurr ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(428, my, mw, mh, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = isCurr ? '#818CF8' : '#64748B';
    ctx.font = (isCurr?'700':'400') + ' 9px monospace';
    ctx.fillText(`key=${k}  →  ${v}`, 436, my+15);
    // BST node indicator
    ctx.fillStyle = isCurr ? '#4F46E5' : '#334155';
    ctx.beginPath(); ctx.arc(755, my+12, 4, 0, Math.PI*2); ctx.fill();
  });
  if (mstate.length === 0) {
    ctx.fillStyle='#334155'; ctx.font='11px system-ui'; ctx.textAlign='center';
    ctx.fillText('(empty)', 600, 115); ctx.textAlign='left';
  }
  ctx.fillStyle='#334155'; ctx.font='8px system-ui';
  ctx.fillText(`sorted — ${mstate.length} keys — O(log N) lookup`, 428, 205);

  // Phase badge
  if (step.phase !== 'idle') {
    const colors = {write:'#06B6D4', flush:'#10B981'};
    const labels = {write:`WRITE key=${step.wi>=0?WRITES[step.wi].key:''}`, flush:'FLUSH → SSTable L0'};
    ctx.fillStyle=colors[step.phase]+'22'; ctx.strokeStyle=colors[step.phase]; ctx.lineWidth=2;
    const bw = 200;
    ctx.beginPath(); ctx.roundRect(w/2-bw/2, 220, bw, 30, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle=colors[step.phase]; ctx.font='700 12px system-ui'; ctx.textAlign='center';
    ctx.fillText(labels[step.phase], w/2, 240); ctx.textAlign='left';
  }

  // SSTable box (shown during flush)
  if (step.phase === 'flush') {
    ctx.fillStyle='#10B98122'; ctx.strokeStyle='#10B981'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.roundRect(220, 270, 360, 60, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#10B981'; ctx.font='700 11px system-ui'; ctx.textAlign='center';
    ctx.fillText('SSTable L0 — sorted sequential file', 400, 292);
    ctx.font='9px monospace';
    ctx.fillText('[15,31,42,55,78] + index + bloom filter', 400, 312);
    ctx.textAlign='left';
  }

  if (stepIdx<0) {
    ctx.fillStyle='#475569'; ctx.font='13px system-ui'; ctx.textAlign='center';
    ctx.fillText('Press Play to animate writes through WAL → MemTable → SSTable', w/2, h/2+80);
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
    tag:'Storage Engine · M42', title:'MemTable + WAL',
    subtitle:'Every LSM write hits WAL (sequential disk) then MemTable (sorted RAM), then flushes to SSTable.',
    tabs:[
      { id:'mw',    label:'💾 Write Animation' },
      { id:'crash', label:'🔄 Crash Recovery' },
      { id:'iq',    label:'💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  const tab = container.querySelector('#tab-mw');
  tab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="canvas-wrap" style="margin-top:12px">
      <canvas width="800" height="400" style="width:100%;max-height:400px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="mw-exp">
        <h3>MemTable + WAL — Two-Phase Write</h3>
        <p>Every LSM write hits two places in order: (1) WAL — sequential disk append for durability,
           ~10μs. (2) MemTable — in-memory sorted tree, ~1μs. Client gets an ACK after both complete.
           The MemTable serves reads while WAL provides crash recovery.
           Press <strong>Play</strong> to animate 5 writes and a flush.</p>
      </div>
    </div>`;
  const canvas = tab.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const engine = new SimulationEngine({
    initialState:{step:-1},
    steps:MW_STEPS.map((s,i)=>({label:`Step ${i+1}`, duration:2000, mutate:st=>{st.step=i;}})),
    onRender:state=>{
      drawMemWAL(ctx, state.step, 800, 400);
      const el=tab.querySelector('#mw-exp');
      if(el&&state.step>=0) el.innerHTML=`<h3>Step ${state.step+1}</h3><p>${MW_STEPS[state.step].desc}</p>`;
    },
  });
  SimulationEngine.renderControls(tab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(tab.querySelector('.canvas-wrap'), engine);
  drawMemWAL(ctx, -1, 800, 400);
  engine.reset();

  container.querySelector('#tab-crash').innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">WAL-Based Crash Recovery</div>
        <div class="section-desc">How LSM-Tree survives crashes without losing committed data</div>
      </div>
      <div class="prose">
        <h3>Recovery Algorithm</h3>
        <div class="code-block">
On crash: MemTable is LOST (RAM is volatile). SSTables are safe (disk).

Recovery sequence:
1. Find the last successful SSTable flush. Read its sequence number (seq=N).
2. Open the WAL log. Replay all records with seq > N.
3. Rebuild the MemTable from replayed WAL records.
4. Resume normal operation.

Key property: WAL is fsync'd before write ACK is returned to client.
  No WAL fsync → no ACK. (Write is "uncommitted" until WAL is durable.)

RocksDB WAL format:
  - Block size: 32 KB aligned
  - Each record: CRC32 checksum | size | type | data
  - CRC check on replay catches corrupted WAL records (hardware errors)
        </div>
        <h3>WAL Group Commit</h3>
        <p>Each fsync is expensive (~0.01–0.1ms). Writes are batched: many concurrent writes
           are grouped together and fsynced in a single call ("group commit"). One fsync covers
           potentially thousands of concurrent writes. Leader thread does the fsync; followers
           wait for it, then all receive ACK simultaneously. RocksDB default: sync every write
           (safe), or <code>sync_log_period_micros</code> for batch fsync.</p>
      </div>
      <div class="info-grid">
        ${[
          { label:'WAL truncation',  color:'#10B981', desc:'After a successful MemTable flush to SSTable, all WAL records with seq ≤ flush_seq can be discarded. WAL truncation reclaims disk space. RocksDB uses multiple WAL files (one per MemTable flush), deleting old WAL files entirely.' },
          { label:'2-phase commit',  color:'#4F46E5', desc:'Distributed transactions (cross-shard in Amazon DynamoDB) use 2PC over WAL. Prepare phase: write PREPARE record to WAL. Commit: write COMMIT record. On crash after PREPARE but before COMMIT: recovery re-runs the commit protocol to ask coordinator.' },
          { label:'Immutable MemTable', color:'#F59E0B', desc:'When flush is triggered, the current MemTable becomes "immutable" — no more writes. A new active MemTable accepts new writes immediately. Flush runs in background. Both the immutable and active MemTable are searchable during reads.' },
          { label:'MemTable choice',    color:'#06B6D4', desc:'RocksDB uses a skip list (default) for O(log N) insert/lookup/range. Alternative: vector (no sort during writes, sort at flush — great for bulk loading). HashLinkList (O(1) point lookup but no range). Facebook MyRocks uses skip list for all OLTP workloads.' },
        ].map(e=>`
          <div class="info-card" style="border-color:${e.color}33">
            <div style="font-weight:700;font-size:11px;color:${e.color};margin-bottom:6px">${e.label}</div>
            <div class="info-card-body">${e.desc}</div>
          </div>`).join('')}
      </div>
    </div>`;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q:'Why does LSM-Tree write to both a WAL and a MemTable, and what is the role of each?',
      a:'WAL (Write-Ahead Log) purpose: DURABILITY. Every write is appended sequentially to the WAL and fsync\'d before ACK is returned. RAM (MemTable) is volatile — a crash loses the MemTable. The WAL on disk survives the crash. On recovery, replay the WAL to reconstruct the MemTable. The WAL record format typically includes: sequence number, key, value, type (Put/Delete), and CRC checksum. MemTable purpose: PERFORMANCE and READ SERVING. After WAL write, insert the key into the MemTable (skip list or red-black tree in RAM). Reads check the MemTable first — O(log N) RAM lookup = nanoseconds. The MemTable holds the most recent version of recently-written keys. Without MemTable, reads would require disk I/O even for recently written data. Two writes, two roles: WAL = durability (disk), MemTable = performance (RAM). The MemTable is redundant with the WAL for recovery purposes — it\'s a performance optimization, not a new durability mechanism. When MemTable is flushed to SSTable, the corresponding WAL segment is deleted.',
      tip:'Both WAL and MemTable are write targets, but only the WAL fsync guarantees durability. Writing to MemTable without WAL fsync gives a performance boost but means a crash can lose the last N seconds of writes. MongoDB\'s "w:0" and Cassandra\'s "commitlog_sync=periodic" use this trade-off explicitly.',
    },
    {
      q:'How does MemTable flush work and why does it not block incoming writes?',
      a:'Flush trigger: MemTable reaches a size threshold (RocksDB default: 64 MB, configurable). Flush process: (1) The current MemTable is atomically marked as "immutable" — no more writes allowed to it. This is an in-memory state change, not a disk operation. (2) A new, empty "active" MemTable is created immediately. New writes go here. (3) A background flush thread reads the immutable MemTable, iterates its keys in sorted order (O(N) — they\'re already sorted), and writes a new SSTable file to Level 0 (sequential disk write). (4) Once flush completes, the immutable MemTable is freed. The WAL segment covering these writes is deleted. Non-blocking property: steps 2 and 3 happen concurrently. Incoming writes use the new active MemTable immediately. Reads check: active MemTable + all immutable MemTables (there can be multiple if flush is falling behind) + all SSTable levels. Write stall: if too many immutable MemTables accumulate (flush can\'t keep up with write rate), RocksDB applies write throttling. At Amazon scale: Prime Day write rates can exceed MemTable flush capacity → manual provisioning of more flush threads and compaction bandwidth before the event.',
      tip:'RocksDB metrics to monitor: rocksdb.num-immutable-mem-table (should stay 0 or 1 normally). rocksdb.stall-micros (total time writes were stalled waiting for flush/compaction). High stall-micros = write path is the bottleneck.',
    },
    {
      q:'How does crash recovery work in an LSM-Tree database, and what are the durability guarantees?',
      a:'Crash recovery steps: (1) On startup, read the MANIFEST file — it records which SSTable files are valid and their sequence numbers. SSTables are immutable so they are always consistent on disk. (2) Find the highest sequence number across all SSTable files — this is the "recovery point." (3) Open the WAL log file. Skip records with seq ≤ recovery point (already in SSTable). Replay all records with seq > recovery point. (4) Apply replayed records to a fresh MemTable. After recovery, the MemTable has all writes that were committed (WAL fsync\'d) but not yet flushed to SSTable. Durability guarantee: every write that received an ACK had its WAL record fsynced to disk. So: any committed write is in either an SSTable (if flush happened) or the WAL (if not yet flushed). Both survive a crash. Uncommitted writes (in flight during crash, no ACK sent): WAL records may exist but without a COMMIT record. These are discarded during recovery. Correctness: WAL records have CRC checksums. Corrupted records are detected and truncated at the corruption point.',
      tip:'RocksDB\'s MANIFEST (version history) and WAL together form a two-tier recovery system. MANIFEST tracks SSTable versions; WAL tracks in-memory state. Never delete a WAL file that covers seq numbers beyond the latest SSTable flush — RocksDB handles this automatically via LogNumber in the MANIFEST.',
    },
  ]);
  initIQ(container);
  return () => engine.destroy();
}
