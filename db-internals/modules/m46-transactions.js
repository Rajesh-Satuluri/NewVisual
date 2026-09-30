import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

// Transaction timeline: T1 (transfer $100) and T2 (concurrent read)
// Timeline events across steps
const EVENTS = [
  // [tx, time_slot, type, label, color]
  ['T1', 0, 'begin',  'BEGIN',                '#4F46E5'],
  ['T1', 1, 'write',  'UPDATE acct A: -$100', '#4F46E5'],
  ['T2', 2, 'begin',  'BEGIN',                '#10B981'],
  ['T2', 3, 'read',   'SELECT acct A → -$100?','#10B981'],
  ['T1', 4, 'write',  'UPDATE acct B: +$100', '#4F46E5'],
  ['T1', 5, 'commit', 'COMMIT',               '#4F46E5'],
  ['T2', 6, 'read',   'SELECT acct B → old?', '#10B981'],
  ['T2', 7, 'commit', 'COMMIT',               '#10B981'],
];

const TX_STEPS = [
  { show:[], acid:'', problem:'', desc:'Database transactions and ACID guarantees. A transaction groups multiple operations into an all-or-nothing unit. ACID = Atomicity, Consistency, Isolation, Durability. Critical for financial systems like Amazon Pay.' },
  { show:[0], acid:'A', problem:'', desc:'ATOMICITY: T1 debits account A (–$100) and credits account B (+$100). These two writes must be atomic — either BOTH succeed or NEITHER does. A crash between the two writes must not leave A debited without B credited (money would vanish).' },
  { show:[0,1], acid:'A', problem:'', desc:'T1 writes –$100 to account A. This change is only visible to T1 for now (not committed). If T1 crashes before COMMIT, the debit is rolled back — account A is unchanged. WAL ensures atomicity: incomplete transactions are undone on recovery.' },
  { show:[0,1,2,3], acid:'I', problem:'dirty_read', desc:'T2 starts concurrently. T2 reads account A and sees –$100 (T1 has written but NOT committed). This is a "dirty read" — T2 sees an uncommitted write that might be rolled back. READ COMMITTED isolation prevents this.' },
  { show:[0,1,2,3,4,5], acid:'A', problem:'', desc:'T1 writes +$100 to account B, then COMMITS. The COMMIT WAL record is fsynced. Both writes are now durable and visible to all future transactions. Atomicity preserved: both writes committed together.' },
  { show:[0,1,2,3,4,5,6,7], acid:'I', problem:'non_repeatable', desc:'T2 reads account B AFTER T1 committed. Under READ COMMITTED: T2 sees different values of A and B in the same transaction (read A before T1 commit, read B after). Non-repeatable read. REPEATABLE READ prevents this by taking a snapshot at T2 BEGIN.' },
  { show:[0,1,2,3,4,5,6,7], acid:'C', problem:'', desc:'CONSISTENCY: the total balance (A+B) must remain constant. Before T1: A+B = $200. After T1: A+B = $100+$100 = $200. The invariant is preserved. Consistency is enforced by constraints, triggers, and application logic — the DB provides the mechanism (atomicity + isolation), the app defines the invariant.' },
  { show:[0,1,2,3,4,5,6,7], acid:'D', problem:'', desc:'DURABILITY: T1\'s COMMIT is durable even if the server crashes immediately after. The WAL record was fsynced before COMMIT returned. On recovery: WAL replay re-applies T1\'s changes. T2 also durably committed. No committed transaction is ever lost.' },
];

const ACID_COLORS = { A:'#4F46E5', C:'#10B981', I:'#F59E0B', D:'#06B6D4' };
const PROBLEM_LABELS = {
  dirty_read: { label:'⚠️ Dirty Read Risk', col:'#EF4444' },
  non_repeatable: { label:'⚠️ Non-Repeatable Read', col:'#F59E0B' },
};

function drawTx(ctx, stepIdx, w, h) {
  ctx.clearRect(0, 0, w, h);
  const step = TX_STEPS[Math.max(0, stepIdx)];
  const showSet = new Set(step.show);
  const txY = { T1: 80, T2: 180 };
  const slotW = 88, startX = 80;

  // ACID indicator top-right
  'ACID'.split('').forEach((letter, i) => {
    const isActive = step.acid === letter;
    const col = ACID_COLORS[letter];
    ctx.fillStyle = isActive ? col+'33' : '#0A0F1A';
    ctx.strokeStyle = isActive ? col : '#1E293B';
    ctx.lineWidth = isActive ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(w-180+i*42, 12, 36, 36, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = isActive ? col : '#475569';
    ctx.font = (isActive?'700':'400') + ' 14px system-ui'; ctx.textAlign='center';
    ctx.fillText(letter, w-162+i*42, 34); ctx.textAlign='left';
  });

  // Timeline lanes
  ['T1','T2'].forEach(tx => {
    const y = txY[tx];
    ctx.fillStyle = tx==='T1' ? '#4F46E5' : '#10B981';
    ctx.font = '700 11px system-ui'; ctx.fillText(tx, 20, y+16);
    ctx.strokeStyle='#1E293B'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(startX, y+10); ctx.lineTo(w-60, y+10); ctx.stroke();
  });

  // Events
  EVENTS.forEach((ev, i) => {
    if (!showSet.has(i)) return;
    const [tx, slot, type, label, col] = ev;
    const y = txY[tx];
    const x = startX + slot * slotW;
    const boxW = 76, boxH = 36;
    ctx.fillStyle = col+'33'; ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(x-2, y-8, boxW, boxH, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = col; ctx.font = '700 8px system-ui'; ctx.textAlign='center';
    ctx.fillText(type.toUpperCase(), x+boxW/2-2, y+5);
    ctx.fillStyle='#94A3B8'; ctx.font='8px system-ui';
    ctx.fillText(label, x+boxW/2-2, y+18); ctx.textAlign='left';
    // Dot on timeline
    ctx.fillStyle=col; ctx.beginPath(); ctx.arc(x+boxW/2-2, y+10, 5, 0, Math.PI*2); ctx.fill();
  });

  // Problem badge
  if (step.problem && PROBLEM_LABELS[step.problem]) {
    const {label, col} = PROBLEM_LABELS[step.problem];
    const bfont='700 11px system-ui'; ctx.font=bfont;
    const bw=ctx.measureText(label).width+24;
    ctx.fillStyle=col+'22'; ctx.strokeStyle=col; ctx.lineWidth=2;
    ctx.beginPath(); ctx.roundRect(20, 260, bw, 28, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle=col; ctx.fillText(label, 32, 278);
  }

  // Isolation levels reference
  if (stepIdx>=2) {
    ctx.fillStyle='#0F172A'; ctx.beginPath(); ctx.roundRect(20, 300, w-40, 50, 4); ctx.fill();
    ctx.fillStyle='#4F46E5'; ctx.font='700 9px system-ui'; ctx.fillText('Isolation Levels →', 28, 318);
    [['READ UNCOMMITTED','sees dirty reads','#EF4444'],['READ COMMITTED','sees non-repeatable reads','#F59E0B'],['REPEATABLE READ','sees phantom reads','#10B981'],['SERIALIZABLE','fully isolated','#4F46E5']].forEach(([lv,note,col],i)=>{
      ctx.fillStyle=col; ctx.font='700 8px system-ui'; ctx.fillText(lv, 28+i*185, 335);
      ctx.fillStyle='#475569'; ctx.font='7px system-ui'; ctx.fillText(note, 28+i*185, 346);
    });
  }

  if (stepIdx<0) {
    ctx.fillStyle='#475569'; ctx.font='13px system-ui'; ctx.textAlign='center';
    ctx.fillText('Press Play to walk through a concurrent transaction scenario', w/2, h/2-20);
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
    tag:'Transactions · M46', title:'Transactions & ACID',
    subtitle:'Atomicity, Consistency, Isolation, Durability — the four guarantees that make databases trustworthy.',
    tabs:[
      { id:'acid',  label:'⚛️ ACID Animation' },
      { id:'iso',   label:'🔒 Isolation Levels' },
      { id:'iq',    label:'💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  const tab = container.querySelector('#tab-acid');
  tab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="canvas-wrap" style="margin-top:12px">
      <canvas width="800" height="410" style="width:100%;max-height:410px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="acid-exp">
        <h3>ACID Transaction — Concurrent Bank Transfer</h3>
        <p>T1 transfers $100 from account A to B. T2 reads accounts concurrently.
           The timeline shows dirty reads, non-repeatable reads, and how each ACID property is tested.
           Press <strong>Play</strong> to walk through the concurrent transaction scenario.</p>
      </div>
    </div>`;
  const canvas = tab.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const engine = new SimulationEngine({
    initialState:{step:-1},
    steps:TX_STEPS.map((s,i)=>({label:i===0?'Intro':i<=2?'Atom':i<=5?'Iso':i===6?'Cons':'Dur', duration:2200, mutate:st=>{st.step=i;}})),
    onRender:state=>{
      drawTx(ctx, state.step, 800, 410);
      const el=tab.querySelector('#acid-exp');
      if(el&&state.step>=0) el.innerHTML=`<h3>Step ${state.step+1} — ${['Intro','Atomicity','Atomicity','Isolation','Atomicity','Isolation','Consistency','Durability'][state.step]}</h3><p>${TX_STEPS[state.step].desc}</p>`;
    },
  });
  SimulationEngine.renderControls(tab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(tab.querySelector('.canvas-wrap'), engine);
  drawTx(ctx, -1, 800, 410);
  engine.reset();

  container.querySelector('#tab-iso').innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">PostgreSQL Isolation Levels</div>
        <div class="section-desc">READ COMMITTED, REPEATABLE READ, and SERIALIZABLE</div>
      </div>
      <div class="prose">
        <h3>Isolation Level Anomalies</h3>
        <div class="code-block">
Dirty Read:       read uncommitted data from another tx (not yet committed)
Non-Repeatable:   same row read twice gives different values in one tx
Phantom Read:     range query gives different ROW COUNTS in one tx
Serialization:    two txs produce an outcome impossible with any serial order

-- PostgreSQL default: READ COMMITTED
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;

-- Check current isolation:
SHOW transaction_isolation;
        </div>
        <h3>MVCC — How PostgreSQL Avoids Locks for Reads</h3>
        <p>PostgreSQL uses Multi-Version Concurrency Control (MVCC). Each transaction sees
           a consistent snapshot of the database taken at the start of the transaction (REPEATABLE READ)
           or at the start of each statement (READ COMMITTED). Readers never block writers;
           writers never block readers. Old versions (dead tuples) accumulate until VACUUM removes them.</p>
      </div>
      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead><tr><th>Isolation Level</th><th>Dirty Read</th><th>Non-Repeatable</th><th>Phantom</th><th>PostgreSQL Default</th></tr></thead>
          <tbody>
            ${[
              ['READ UNCOMMITTED','Possible','Possible','Possible','No (upgraded to RC)'],
              ['READ COMMITTED','Prevented','Possible','Possible','Yes ← default'],
              ['REPEATABLE READ','Prevented','Prevented','Prevented*','No'],
              ['SERIALIZABLE','Prevented','Prevented','Prevented','No (slowest)'],
            ].map(([l,d,n,p,def])=>`<tr><td><strong>${l}</strong></td><td style="color:${d==='Prevented'?'#10B981':'#EF4444'};font-size:10px">${d}</td><td style="color:${n==='Prevented'?'#10B981':'#EF4444'};font-size:10px">${n}</td><td style="color:${p.startsWith('P')?'#10B981':'#EF4444'};font-size:10px">${p}</td><td style="font-size:10px">${def}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <p style="font-size:11px;color:#64748B;margin-top:8px">* PostgreSQL REPEATABLE READ prevents phantom reads (unlike SQL standard) via snapshot isolation.</p>
    </div>`;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q:'What does ACID mean and why does each property matter for a payment system?',
      a:'ATOMICITY: a transaction\'s changes are all-or-nothing. For a transfer: debit A AND credit B must both happen or neither happens. Without atomicity: crash between debit and credit → money vanishes from A but never appears in B. Implementation: WAL records all changes; on crash recovery, incomplete transactions are rolled back. CONSISTENCY: the database goes from one valid state to another. The invariant "sum of all balances = $X" must hold before and after. Consistency is the application\'s responsibility (constraints, triggers) — the DB provides atomic and isolated execution. ISOLATION: concurrent transactions don\'t interfere. T2 reading accounts while T1 is mid-transfer must not see an inconsistent state (A debited but B not yet credited). MVCC snapshot isolation prevents this. DURABILITY: committed data survives crashes. After COMMIT returns to Amazon Pay: the transaction is on disk (WAL fsynced). A server reboot does not lose the payment. Implementation: WAL fsync before ACK. Without durability: "payment completed" page → server crash → payment is gone. Amazon Pay processes billions of dollars daily — every transaction must be ACID-compliant.',
      tip:'"Consistency" in ACID is different from "Consistency" in CAP theorem. ACID Consistency = application-defined invariants. CAP Consistency = all nodes see the same data at the same time (linearizability). They are distinct concepts despite the shared letter.',
    },
    {
      q:'What is the difference between READ COMMITTED and REPEATABLE READ in PostgreSQL?',
      a:'READ COMMITTED (PostgreSQL default): each SQL statement within the transaction gets a fresh snapshot. Two SELECT statements in the same transaction may return different results if another transaction commits between them. Non-repeatable reads are possible. Dirty reads are prevented (snapshot is taken at statement start, so only committed data is visible). REPEATABLE READ: the snapshot is taken ONCE at the start of the transaction (specifically: at the first non-transaction-control statement). All statements in the transaction see the same snapshot. Non-repeatable reads are prevented. In PostgreSQL, REPEATABLE READ also prevents phantom reads (PostgreSQL exceeds the SQL standard here — standard RR allows phantoms). Implementation: both use MVCC with different snapshot points. READ COMMITTED snapshot = current transaction ID at statement start. REPEATABLE READ snapshot = transaction ID at first statement. Practical implication: long-running analytics queries should use REPEATABLE READ to avoid seeing mid-query data changes. Payment processing uses READ COMMITTED (or SERIALIZABLE for bank-level correctness) — the shorter the transaction, the less anomaly risk.',
      tip:'PostgreSQL\'s REPEATABLE READ is actually Snapshot Isolation (SI), not true Repeatable Read as defined by the SQL standard. SI prevents most anomalies but can still have "write skew" (two transactions each read a set and update based on the read — the combined result violates an invariant). SERIALIZABLE prevents write skew.',
    },
    {
      q:'How does MVCC allow readers and writers to proceed concurrently without locking?',
      a:'MVCC (Multi-Version Concurrency Control): instead of locking a row when writing, PostgreSQL creates a NEW VERSION of the row (a new heap tuple). The old version stays. Each transaction has a snapshot ID (the transaction ID when it started). When reading a row, PostgreSQL checks tuple visibility: a tuple is visible to a transaction T if: (1) xmin (the transaction that created it) ≤ T.snapshot_id AND xmin is committed. AND (2) xmax (the transaction that deleted/replaced it) is either 0 (not deleted) OR xmax > T.snapshot_id OR xmax is aborted. This means: a reader always sees the version that was committed as of its snapshot start — no matter what concurrent writers are doing. Writers create new tuples — readers continue reading the old version. No read-write locking. Consequences: (1) Dead tuples accumulate (old versions visible to no one). VACUUM reclaims them. (2) Long-running transactions hold snapshots open → prevent VACUUM from collecting old tuples (bloat). (3) Writers still lock each other for the same row (exclusive row lock on write). Reader-writer concurrency is free; writer-writer concurrency still serializes.',
      tip:'pg_stat_activity shows active transactions and their query_start / xact_start times. A transaction with xact_start from hours ago is holding an old snapshot — it blocks VACUUM from collecting dead tuples across the ENTIRE database, causing table and index bloat. Monitor with: SELECT age(backend_xmin) FROM pg_stat_activity WHERE backend_xmin IS NOT NULL.',
    },
  ]);
  initIQ(container);
  return () => engine.destroy();
}
