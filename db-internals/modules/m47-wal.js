import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

// WAL records for a transaction: BEGIN, UPDATE acct A, UPDATE acct B, COMMIT
// Then show crash scenario: crash after UPDATE B, before COMMIT
const WAL_RECORDS = [
  { lsn:'0/01000000', type:'XLOG_CHECKPOINT_ONLINE', tx:null,   data:'priorCheckpoint=0/00F00000', color:'#64748B' },
  { lsn:'0/01000100', type:'XLOG_HEAP_INSERT',       tx:'T1',   data:'rel=accounts page=23 off=5 key=A val=-100', color:'#4F46E5' },
  { lsn:'0/01000200', type:'XLOG_HEAP_INSERT',       tx:'T1',   data:'rel=accounts page=31 off=2 key=B val=+100', color:'#4F46E5' },
  { lsn:'0/01000300', type:'XLOG_XACT_COMMIT',       tx:'T1',   data:'commitTime=2024-01-15T12:00:05', color:'#10B981' },
  { lsn:'0/01000400', type:'XLOG_HEAP_INSERT',       tx:'T2',   data:'rel=orders  page=88 off=1 key=ORD-999 status=placed', color:'#F59E0B' },
];
const CRASH_RECORDS = [
  { lsn:'0/01000000', type:'XLOG_CHECKPOINT_ONLINE', tx:null,   data:'priorCheckpoint=0/00F00000', color:'#64748B', ckpt:true },
  { lsn:'0/01000100', type:'XLOG_HEAP_INSERT',       tx:'T3',   data:'rel=accounts page=23 off=6 key=C val=-50', color:'#818CF8' },
  { lsn:'0/01000200', type:'XLOG_HEAP_INSERT',       tx:'T3',   data:'rel=accounts page=31 off=3 key=D val=+50', color:'#818CF8' },
  // T3 COMMIT never written — crash here
];

const WAL_STEPS = [
  { show:[], crash:false, desc:'WAL (Write-Ahead Log) in PostgreSQL. All changes are written to the WAL before being applied to heap pages. Durability guarantee: COMMIT only returns after WAL is fsync\'d. On crash: replay WAL from last checkpoint to recover committed transactions.' },
  { show:[0], crash:false, desc:'Checkpoint record: marks a point where all dirty buffer pool pages have been written to disk. Recovery only needs to replay WAL records AFTER the last checkpoint. Checkpoints happen every checkpoint_timeout (default 5 minutes) or checkpoint_segments.' },
  { show:[0,1], crash:false, desc:'T1 updates account A: WAL record {type:HEAP_INSERT, tx:T1, page:23, before:-0, after:-100}. Written to WAL buffer. NOT yet fsynced — T1 hasn\'t committed. Heap page 23 is marked dirty in buffer pool (not yet written to disk).' },
  { show:[0,1,2], crash:false, desc:'T1 updates account B: second WAL record written to WAL buffer. Two WAL records, two dirty heap pages. Still not fsynced — T1 can still ROLLBACK at this point. No durability yet.' },
  { show:[0,1,2,3], crash:false, desc:'T1 COMMITs. XLOG_XACT_COMMIT record written and FSYNCED to disk. After fsync: both WAL records are durable. COMMIT ACK returned to client. Heap pages 23 and 31 are still dirty in buffer pool — bgwriter will flush them later.' },
  { show:[0,1,2,3,4], crash:false, desc:'T2 inserts a new order: another WAL record. Also not yet committed. At this point: WAL is a sequential log of all changes. Buffer pool has dirty pages. Disk heap files may or may not have the T1 changes yet (bgwriter flushes them asynchronously).' },
  { show:[0,1,2], crash:true, desc:'CRASH SCENARIO: server crashes after T3 writes 2 WAL records but before COMMIT. WAL records for T3 are in the WAL buffer (not fsynced). On restart: PostgreSQL replays WAL from last checkpoint. It finds records for T3 but no COMMIT record. T3 is ROLLED BACK — changes discarded.' },
];

function drawWAL(ctx, stepIdx, w, h) {
  ctx.clearRect(0, 0, w, h);
  const step = WAL_STEPS[Math.max(0, stepIdx)];
  const records = step.crash ? CRASH_RECORDS : WAL_RECORDS;
  const showN = step.show.length;

  // WAL log panel
  ctx.fillStyle='#64748B'; ctx.font='700 10px system-ui';
  ctx.fillText('pg_wal / xlog — Write-Ahead Log (sequential file)', 20, 22);

  const panelH = Math.min(showN * 46 + 20, 260);
  ctx.fillStyle='#0A0F1A'; ctx.strokeStyle=step.crash?'#EF444444':'#F59E0B44'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.roundRect(20, 30, w-40, panelH, 6); ctx.fill(); ctx.stroke();

  step.show.forEach((ri, i) => {
    const rec = records[ri];
    const ry = 42 + i * 46;
    const isCurrent = i === showN - 1;
    ctx.fillStyle = isCurrent ? rec.color+'22' : '#0F172A';
    ctx.strokeStyle = isCurrent ? rec.color : rec.ckpt ? '#64748B44' : '#1E293B';
    ctx.lineWidth = isCurrent ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(28, ry, w-56, 40, 4); ctx.fill(); ctx.stroke();

    // LSN
    ctx.fillStyle = isCurrent ? rec.color : '#475569'; ctx.font='700 8px monospace';
    ctx.fillText(rec.lsn, 36, ry+13);
    // Type
    ctx.fillStyle = isCurrent ? rec.color : '#334155'; ctx.font='700 9px system-ui';
    ctx.fillText(rec.type, 150, ry+13);
    // Tx
    if (rec.tx) { ctx.fillStyle='#64748B'; ctx.font='9px system-ui'; ctx.fillText(`tx:${rec.tx}`, 420, ry+13); }
    // Data
    ctx.fillStyle = isCurrent ? rec.color+'BB' : '#334155'; ctx.font='8px monospace';
    ctx.fillText(rec.data, 36, ry+30);
  });

  // Crash indicator
  if (step.crash && stepIdx >= 0) {
    const crashY = 42 + step.show.length * 46 + 10;
    ctx.fillStyle='#EF4444'; ctx.strokeStyle='#EF4444'; ctx.lineWidth=2;
    ctx.setLineDash([6,4]);
    ctx.beginPath(); ctx.moveTo(28, crashY); ctx.lineTo(w-28, crashY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font='700 11px system-ui'; ctx.textAlign='center';
    ctx.fillText('💥 SERVER CRASH — no COMMIT record flushed', w/2, crashY+16);
    ctx.textAlign='left';

    // Recovery outcome
    ctx.fillStyle='#EF444422'; ctx.strokeStyle='#EF4444'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.roundRect(20, crashY+30, w-40, 45, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#EF4444'; ctx.font='700 10px system-ui'; ctx.textAlign='center';
    ctx.fillText('RECOVERY: replay from checkpoint → find T3 records → no COMMIT → ROLLBACK T3', w/2, crashY+50);
    ctx.fillStyle='#94A3B8'; ctx.font='9px system-ui';
    ctx.fillText('Result: accounts C and D unchanged. Atomicity guaranteed.', w/2, crashY+65);
    ctx.textAlign='left';
  }

  // Status bar: buffer pool vs disk
  if (!step.crash && stepIdx > 0) {
    const by=360;
    ctx.fillStyle='#0F172A'; ctx.beginPath(); ctx.roundRect(20, by, w-40, 55, 4); ctx.fill();
    ctx.fillStyle='#64748B'; ctx.font='700 9px system-ui'; ctx.fillText('Buffer Pool State:', 28, by+16);
    [['Page 23 (acct A)', step.show.length>=2 ? '#4F46E5' : '#334155', step.show.length>=2],
     ['Page 31 (acct B)', step.show.length>=3 ? '#4F46E5' : '#334155', step.show.length>=3],
     ['WAL Buffer',       '#F59E0B', step.show.length>=2],
     ['WAL Fsynced',      step.show.length>=4 ? '#10B981' : '#334155', step.show.length>=4],
    ].forEach(([lbl,col,active],i)=>{
      const px = 28 + i*190;
      ctx.fillStyle=active?col+'33':'#0A0F1A'; ctx.strokeStyle=active?col:'#1E293B'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.roundRect(px, by+22, 180, 24, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle=active?col:'#334155'; ctx.font=(active?'700':'400')+' 8px system-ui';
      ctx.fillText((active?'● ':'○ ')+lbl, px+8, by+37);
    });
  }

  if (stepIdx<0) {
    ctx.fillStyle='#475569'; ctx.font='13px system-ui'; ctx.textAlign='center';
    ctx.fillText('Press Play to walk through WAL write and crash recovery', w/2, h/2);
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
    tag:'Transactions · M47', title:'Write-Ahead Log',
    subtitle:'WAL: every change written to the log before heap pages — enables crash recovery and replication.',
    tabs:[
      { id:'wal',   label:'📜 WAL Animation' },
      { id:'fmt',   label:'📋 WAL Format' },
      { id:'iq',    label:'💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  const tab = container.querySelector('#tab-wal');
  tab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="canvas-wrap" style="margin-top:12px">
      <canvas width="800" height="440" style="width:100%;max-height:440px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="wal-exp">
        <h3>WAL — Write-Ahead Log</h3>
        <p>Every database change produces a WAL record before the heap page is modified.
           COMMIT fsyncs the WAL — this is the moment of durability.
           Heap pages are flushed later by bgwriter/checkpoint.
           On crash: replay WAL from last checkpoint to recover committed transactions.
           Press <strong>Play</strong> to walk through a committed transaction and a crash scenario.</p>
      </div>
    </div>`;
  const canvas = tab.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const engine = new SimulationEngine({
    initialState:{step:-1},
    steps:WAL_STEPS.map((s,i)=>({label:`Step ${i+1}`, duration:2200, mutate:st=>{st.step=i;}})),
    onRender:state=>{
      drawWAL(ctx, state.step, 800, 440);
      const el=tab.querySelector('#wal-exp');
      if(el&&state.step>=0) el.innerHTML=`<h3>Step ${state.step+1}</h3><p>${WAL_STEPS[state.step].desc}</p>`;
    },
  });
  SimulationEngine.renderControls(tab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(tab.querySelector('.canvas-wrap'), engine);
  drawWAL(ctx, -1, 800, 440);
  engine.reset();

  container.querySelector('#tab-fmt').innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">WAL Format and Configuration</div>
        <div class="section-desc">PostgreSQL WAL internals and durability tuning</div>
      </div>
      <div class="prose">
        <h3>WAL Record Structure</h3>
        <div class="code-block">
Each WAL record (XLogRecord):
  xl_tot_len   uint32   total record length
  xl_xid       TransactionId
  xl_prev      XLogRecPtr   LSN of previous record (linked list)
  xl_info      uint8        RMGR-specific info
  xl_rmid      RmgrId       resource manager (heap, btree, xact, ...)
  xl_crc       pg_crc32c    CRC of the record

Resource Managers (RMGR):
  XLOG (checkpoint, switch), Heap, Heap2, Btree, Hash,
  Gin, Gist, Sequence, SPGist, BRIN, CommitTs, Multixact,
  RelationMap, Standby, Heap3 (new), LogicalMessage
        </div>
        <h3>Key WAL Configuration Parameters</h3>
        <div class="code-block">
wal_level = replica         -- minimal / replica / logical
fsync = on                  -- NEVER disable in production
synchronous_commit = on     -- off = async (faster but data loss risk)
wal_buffers = 16MB          -- WAL buffer size (auto-tune)
checkpoint_timeout = 5min   -- max time between checkpoints
max_wal_size = 1GB          -- max WAL before forced checkpoint
wal_compression = on        -- compress WAL records (zstd in PG 15+)

-- Streaming replication WAL:
wal_level = replica         -- required for replication
max_wal_senders = 10        -- concurrent replication connections
wal_keep_size = 1GB         -- keep WAL for replicas
        </div>
      </div>
      <div class="info-grid">
        ${[
          { label:'synchronous_commit=off', color:'#EF4444', desc:'Async commit: WAL is written but NOT fsynced before COMMIT returns. ~0.1ms faster per commit. Risk: up to wal_writer_delay (default 200ms) of committed transactions lost on crash. Never use for financial data. Use for non-critical events where a few seconds of data loss is acceptable.' },
          { label:'WAL archiving',          color:'#4F46E5', desc:'archive_mode=on + archive_command copies WAL files to S3 or NFS. Enables point-in-time recovery (PITR): restore from a base backup, replay WAL to any timestamp. Critical for disaster recovery. Amazon RDS uses WAL archiving for automated backups and read replicas.' },
          { label:'Logical replication',    color:'#10B981', desc:'wal_level=logical generates WAL that includes row-level change data (not just physical page changes). Used for logical replication (SUBSCRIBE/PUBLISH), CDC (Change Data Capture), and migrating data to Kafka or other systems. Higher WAL volume than physical replication.' },
          { label:'CHECKPOINT frequency',   color:'#F59E0B', desc:'Checkpoint writes all dirty buffer pool pages to disk and records the LSN in pg_control. After a crash, recovery only replays WAL since the last checkpoint. Frequent checkpoints: faster recovery, more I/O during checkpoint. Infrequent: slower recovery, less checkpoint I/O. RDS default: 5-minute checkpoint_timeout.' },
        ].map(e=>`
          <div class="info-card" style="border-color:${e.color}33">
            <div style="font-weight:700;font-size:11px;color:${e.color};margin-bottom:6px">${e.label}</div>
            <div class="info-card-body">${e.desc}</div>
          </div>`).join('')}
      </div>
    </div>`;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q:'Explain the WAL write path for a simple INSERT statement in PostgreSQL.',
      a:'For INSERT INTO orders (customer_id, total) VALUES (12345, 99.99): (1) WAL buffer: PostgreSQL constructs an XLogRecord containing the RMGR type (Heap), the relation/page/offset of the new tuple, and the full tuple data (for physical replication). Written to the WAL buffer in shared_buffers — not yet on disk. (2) Heap page: the tuple is inserted into the target heap page in the buffer pool. The page is marked dirty (dirty flag set in buffer descriptor). (3) On COMMIT: an XLOG_XACT_COMMIT record is written to the WAL buffer. Then XLogFlush() is called — all buffered WAL records up to this LSN are written to the WAL file and fsync\'d. After fsync succeeds: COMMIT returns to the client. (4) Heap page flush: the dirty heap page remains in buffer pool. bgwriter flushes it to disk at its own pace. The next CHECKPOINT forces all dirty pages to disk and records the LSN. (5) After the heap page is written to disk: the WAL records for this INSERT are no longer needed for recovery (heap is up to date). They can be archived or recycled after the next CHECKPOINT. The key invariant: WAL LSN of the dirty page write ≤ WAL LSN already flushed to disk. This ensures that the heap page\'s state can always be reconstructed from the WAL.',
      tip:'LSN = Log Sequence Number. Every WAL record has an LSN (monotonically increasing byte offset in the WAL stream). pg_current_wal_lsn() returns the current write position. pg_stat_bgwriter shows checkpoint frequency and buffer writes. Lag between WAL write LSN and last checkpoint LSN = recovery work needed on crash.',
    },
    {
      q:'What happens during PostgreSQL crash recovery and how does WAL ensure no committed data is lost?',
      a:'Crash recovery sequence: (1) Read pg_control file to find the last CHECKPOINT LSN. The checkpoint record contains the LSN of all dirty pages at checkpoint time. (2) Open the WAL file at the checkpoint LSN. (3) Replay WAL records in order: for each XLOG_HEAP record, apply the change to the heap page (read from disk if needed, apply the WAL record\'s delta). For XLOG_XACT_COMMIT: mark the transaction as committed. For XLOG_XACT_ABORT: mark as aborted (no redo needed). (4) At end of WAL: all committed transactions are applied. Transactions that had started but have no COMMIT record are rolled back (abort). (5) Recovery complete: database is open for connections. No committed data is lost because: COMMIT only returns after WAL is fsynced to disk. So any transaction with a COMMIT record in the WAL was committed before the crash. WAL replay re-applies all those changes to the heap. Edge case — partial WAL records: the last WAL record may be incomplete (crash during write). PostgreSQL detects this via CRC check. The partial record is ignored — it has no COMMIT, so the transaction is automatically rolled back.',
      tip:'pg_waldump is a PostgreSQL tool to read WAL records: pg_waldump -p $PGDATA/pg_wal -s 0/01000000 shows human-readable WAL contents. Useful for debugging: finding what changed between two LSNs, understanding write amplification (how many WAL records per application write), and auditing.',
    },
    {
      q:'What is wal_level and how does it affect WAL volume and replication capabilities?',
      a:'wal_level controls the amount of information written to WAL. Three levels: (1) minimal: only enough to recover from a crash. No replication, no PITR, no pg_upgrade. Not usable for standby servers. (2) replica (default): adds information for streaming replication (physical standby), base backups, and PITR. WAL includes full page images on first write after checkpoint (full_page_writes=on) to handle torn pages. Volume: ~10–30% more than minimal. (3) logical: adds information for logical decoding — row-level changes with column values, old/new tuple data. Required for logical replication, CDC, and pg_logical. Volume: ~50–200% more than replica because each WAL record includes full column data. Trade-offs: minimal = lowest volume but no replication. replica = production default. logical = needed for Kafka/Debezium CDC, max volume. AWS RDS uses wal_level=logical when logical replication or DMS migration is enabled — this increases storage and I/O cost noticeably (~20–40%). Monitor: pg_stat_replication.write_lag, replay_lag to check if replicas are keeping up with WAL volume.',
      tip:'full_page_writes=on (default) writes the entire 8 KB page on first write after each checkpoint. This protects against partial page writes (torn pages) on crash. Disabling it reduces WAL volume by 30–50% but risks data corruption if a crash occurs mid-page-write. Never disable without a storage layer that guarantees atomic page writes (e.g., ZFS).',
    },
  ]);
  initIQ(container);
  return () => engine.destroy();
}
