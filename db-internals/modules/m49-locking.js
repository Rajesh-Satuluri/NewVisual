import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

/* ── Step data ─────────────────────────────────────────────────────────────── */
// Lock entry: { locktype, relation, page, off, mode, holder, waiter, state }
const LOCK_STEPS = [
  {
    locks: [],
    t1: { status:'idle',    action:'', color:'#4F46E5' },
    t2: { status:'idle',    action:'', color:'#10B981' },
    deadlock: false, resolved: false,
    desc: 'Two concurrent transactions will each attempt to update two orders. Lock Manager is empty. PostgreSQL uses a central lock manager in shared memory to coordinate all lock requests.',
  },
  {
    locks: [
      { rel:'orders', tup:'(5,1)', mode:'RowExclusiveLock', holder:'T1', waiter:null },
    ],
    t1: { status:'active', action:'UPDATE orders SET status=\'shipped\' WHERE order_id=1001', color:'#4F46E5' },
    t2: { status:'idle',   action:'', color:'#10B981' },
    deadlock: false, resolved: false,
    desc: 'T1 begins and acquires a RowExclusiveLock on tuple (5,1) — order 1001. Row-level locks are stored in the lock manager, not on the tuple. The tuple itself carries a "heavyweight lock" hint bit.',
  },
  {
    locks: [
      { rel:'orders', tup:'(5,1)', mode:'RowExclusiveLock', holder:'T1', waiter:null },
      { rel:'orders', tup:'(5,2)', mode:'RowExclusiveLock', holder:'T2', waiter:null },
    ],
    t1: { status:'active', action:'Holds lock on order 1001', color:'#4F46E5' },
    t2: { status:'active', action:'UPDATE orders SET status=\'shipped\' WHERE order_id=1002', color:'#10B981' },
    deadlock: false, resolved: false,
    desc: 'T2 begins and acquires RowExclusiveLock on tuple (5,2) — order 1002. Both transactions now hold one lock each. No conflict yet — they are on different rows.',
  },
  {
    locks: [
      { rel:'orders', tup:'(5,1)', mode:'RowExclusiveLock', holder:'T1', waiter:null },
      { rel:'orders', tup:'(5,2)', mode:'RowExclusiveLock', holder:'T2', waiter:'T1' },
    ],
    t1: { status:'waiting', action:'Wants lock on order 1002 — BLOCKED by T2', color:'#4F46E5' },
    t2: { status:'active',  action:'Holds lock on order 1002', color:'#10B981' },
    deadlock: false, resolved: false,
    desc: 'T1 now tries to UPDATE order 1002. T2 holds that lock — T1 enters the wait queue. PostgreSQL puts T1 to sleep; the OS will wake it when the lock is released.',
  },
  {
    locks: [
      { rel:'orders', tup:'(5,1)', mode:'RowExclusiveLock', holder:'T1', waiter:'T2' },
      { rel:'orders', tup:'(5,2)', mode:'RowExclusiveLock', holder:'T2', waiter:'T1' },
    ],
    t1: { status:'waiting', action:'Waiting for T2 → order 1002', color:'#4F46E5' },
    t2: { status:'waiting', action:'Wants lock on order 1001 — BLOCKED by T1', color:'#10B981' },
    deadlock: true, resolved: false,
    desc: 'T2 now tries to UPDATE order 1001. DEADLOCK: T1 waits for T2, T2 waits for T1. PostgreSQL\'s deadlock detector (runs every deadlock_timeout = 1s) finds this cycle in the wait-for graph.',
  },
  {
    locks: [
      { rel:'orders', tup:'(5,1)', mode:'RowExclusiveLock', holder:'T1', waiter:null },
      { rel:'orders', tup:'(5,2)', mode:'RowExclusiveLock', holder:'T1', waiter:null },
    ],
    t1: { status:'active',    action:'Both locks acquired — will COMMIT', color:'#4F46E5' },
    t2: { status:'aborted',   action:'ERROR: deadlock detected — transaction aborted', color:'#EF4444' },
    deadlock: false, resolved: true,
    desc: 'PostgreSQL picks T2 as the deadlock victim (the transaction that last triggered the detector). T2 is rolled back, its locks released. T1 immediately acquires order 1002 and can proceed.',
  },
  {
    locks: [],
    t1: { status:'committed', action:'COMMIT — both orders updated', color:'#10B981' },
    t2: { status:'aborted',   action:'Application must retry T2', color:'#EF4444' },
    deadlock: false, resolved: true,
    desc: 'T1 commits and all locks are released. T2 was aborted; the application must detect the deadlock error (SQLSTATE 40P01) and retry. Best practice: always acquire locks in a consistent order to avoid deadlocks.',
  },
];

/* ── Canvas renderer ───────────────────────────────────────────────────────── */
function drawLock(ctx, stepIdx, w, h) {
  const step = LOCK_STEPS[stepIdx];
  ctx.clearRect(0, 0, w, h);

  // ── Transaction boxes at top ──
  const txH = 56, txW = (w - 48) / 2;
  function drawTxBox(tx, label, x) {
    const c = tx.color;
    ctx.fillStyle = c + '22'; ctx.strokeStyle = c; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(x, 12, txW, txH, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = c; ctx.font = '700 11px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(label + '  —  ' + tx.status.toUpperCase(), x + 10, 32);
    ctx.fillStyle = '#94A3B8'; ctx.font = '9px system-ui';
    const maxW = txW - 20;
    let act = tx.action;
    while (act && ctx.measureText(act).width > maxW) act = act.slice(0, -1);
    if (act !== tx.action) act += '…';
    ctx.fillText(act || ' ', x + 10, 52);
  }
  drawTxBox(step.t1, 'T1', 16);
  drawTxBox(step.t2, 'T2', 16 + txW + 16);

  // ── Lock Manager table ──
  const tblX = 16, tblY = 84, tblW = w - 32;
  const rowH = 36, hdrH = 28;
  const tableH = hdrH + step.locks.length * rowH + (step.locks.length === 0 ? 36 : 0);

  ctx.fillStyle = '#0F172A'; ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(tblX, tblY, tblW, tableH, 6); ctx.fill(); ctx.stroke();

  ctx.fillStyle = '#334155'; ctx.font = '700 10px system-ui'; ctx.textAlign = 'left';
  ctx.fillText('LOCK MANAGER', tblX + 12, tblY + 17);

  const COLS = [tblX+12, tblX+90, tblX+160, tblX+260, tblX+360, tblX+430];
  const HDR  = ['Relation','Tuple','Mode','Holder','Waiter','State'];
  ctx.fillStyle = '#475569'; ctx.font = '700 9px system-ui';
  HDR.forEach((h, i) => ctx.fillText(h, COLS[i], tblY + hdrH + 4));

  if (step.locks.length === 0) {
    ctx.fillStyle = '#334155'; ctx.font = '9px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('(no locks held)', tblX + tblW / 2, tblY + hdrH + 22);
    ctx.textAlign = 'left';
  }

  step.locks.forEach((lk, i) => {
    const ry = tblY + hdrH + 14 + i * rowH;
    const isT1 = lk.holder === 'T1';
    ctx.fillStyle = (isT1 ? '#4F46E522' : '#10B98122');
    ctx.fillRect(tblX + 1, ry - 12, tblW - 2, rowH - 2);

    const y = ry + 4;
    ctx.font = '10px monospace'; ctx.textAlign = 'left';
    ctx.fillStyle = '#94A3B8'; ctx.fillText(lk.rel, COLS[0], y);
    ctx.fillStyle = '#64748B'; ctx.fillText(lk.tup, COLS[1], y);
    ctx.fillStyle = '#F59E0B'; ctx.font = '10px system-ui'; ctx.fillText(lk.mode, COLS[2], y);
    ctx.fillStyle = isT1 ? '#818CF8' : '#34D399'; ctx.fillText(lk.holder, COLS[3], y);
    ctx.fillStyle = lk.waiter ? '#EF4444' : '#334155';
    ctx.fillText(lk.waiter ? lk.waiter + ' ⏳' : '—', COLS[4], y);
    const granted = !lk.waiter || lk.waiter === lk.holder;
    ctx.fillStyle = '#10B981'; ctx.fillText('GRANTED', COLS[5], y);
    if (lk.waiter && lk.waiter !== lk.holder) {
      ctx.fillStyle = '#EF4444'; ctx.fillText('WAITING', COLS[5] + 55, y);
    }
  });

  // ── Wait-for graph ──
  if (step.deadlock || step.resolved) {
    const gx = 16, gy = tblY + tableH + 12, gw = w - 32, gh = 80;
    ctx.fillStyle = step.deadlock ? '#1C0A0A' : '#071C10';
    ctx.strokeStyle = step.deadlock ? '#7F1D1D' : '#065F46';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(gx, gy, gw, gh, 6); ctx.fill(); ctx.stroke();

    ctx.fillStyle = step.deadlock ? '#EF4444' : '#10B981';
    ctx.font = '700 10px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(step.deadlock ? 'DEADLOCK DETECTED — Wait-for graph has a cycle' : 'RESOLVED — T2 aborted, T1 continues', gx + 12, gy + 18);

    if (step.deadlock) {
      // draw T1 → T2 → T1 cycle
      const cx = gx + gw / 2, cy = gy + 50, r = 22;
      ctx.fillStyle = '#4F46E5'; ctx.beginPath(); ctx.arc(cx - 80, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#10B981'; ctx.beginPath(); ctx.arc(cx + 80, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = '700 10px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('T1', cx - 80, cy + 4); ctx.fillText('T2', cx + 80, cy + 4);
      // arrows
      ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx - 58, cy - 10); ctx.lineTo(cx + 58, cy - 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 58, cy + 10); ctx.lineTo(cx - 58, cy + 10); ctx.stroke();
      ctx.fillStyle = '#EF4444'; ctx.font = '9px system-ui';
      ctx.fillText('waits for', cx, cy - 16);
      ctx.fillText('waits for', cx, cy + 22);
    }
  }
  ctx.textAlign = 'left';
}

/* ── Tabs ──────────────────────────────────────────────────────────────────── */
function renderModesTab(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-family:system-ui;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="margin:0 0 16px;color:#E2E8F0;font-size:15px">PostgreSQL Lock Modes (weakest → strongest)</h3>
  <table style="width:100%;border-collapse:collapse;font-size:11.5px;margin-bottom:24px">
    <thead><tr style="background:#0F172A">
      <th style="padding:8px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Mode</th>
      <th style="padding:8px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Acquired by</th>
      <th style="padding:8px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Conflicts with</th>
    </tr></thead>
    <tbody>
      ${[
        ['AccessShareLock','SELECT','AccessExclusiveLock only'],
        ['RowShareLock','SELECT FOR UPDATE/SHARE','Exclusive + Share Row Exclusive'],
        ['RowExclusiveLock','UPDATE / DELETE / INSERT','Share, Share Row Exclusive, Exclusive, AccessExclusive'],
        ['ShareUpdateExclusiveLock','VACUUM, ANALYZE, CREATE INDEX CONCURRENTLY','Itself + stronger modes'],
        ['ShareLock','CREATE INDEX (non-concurrent)','Row Exclusive + stronger'],
        ['ShareRowExclusiveLock','Rare — CREATE TRIGGER','Itself + stronger'],
        ['ExclusiveLock','pg_advisory_lock(id)','All except AccessShare'],
        ['AccessExclusiveLock','ALTER TABLE, DROP, TRUNCATE, LOCK TABLE','Every other mode'],
      ].map(([m,a,c]) => `
        <tr style="border-bottom:1px solid #0F172A">
          <td style="padding:7px 10px;color:#F59E0B;font-family:monospace;font-size:10.5px">${m}</td>
          <td style="padding:7px 10px;color:#94A3B8">${a}</td>
          <td style="padding:7px 10px;color:#64748B;font-size:10.5px">${c}</td>
        </tr>`).join('')}
    </tbody>
  </table>

  <h3 style="margin:0 0 12px;color:#E2E8F0;font-size:15px">Deadlock Prevention Patterns</h3>
  <ul style="margin:0;padding-left:20px">
    <li style="margin-bottom:8px"><strong>Consistent lock ordering:</strong> Always UPDATE orders in ascending order_id. If all transactions follow the same sequence, cycles cannot form.</li>
    <li style="margin-bottom:8px"><strong>SELECT FOR UPDATE SKIP LOCKED:</strong> Queue-style processing on Prime Day orders — worker picks one row at a time without waiting for locked rows.</li>
    <li style="margin-bottom:8px"><strong>Short transactions:</strong> Minimize time holding locks. Split long analytics + writes across separate transactions.</li>
    <li><strong>lock_timeout:</strong> Set <code style="color:#A78BFA">SET lock_timeout = '2s'</code> so a blocked transaction fails fast rather than holding a connection slot indefinitely.</li>
  </ul>
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'How does PostgreSQL detect deadlocks, and what happens when one is found?',
      a: `PostgreSQL does not prevent deadlocks proactively — it detects them after the fact using a <strong>wait-for graph</strong>. After a transaction has been waiting for <code>deadlock_timeout</code> (default 1 second), the lock manager builds a graph where nodes are transactions and edges represent "waits for." A cycle in this graph is a deadlock. PostgreSQL then selects one transaction as the <strong>victim</strong> (typically the one whose abort causes the least rollback work), rolls it back, and releases all its locks. The victim receives SQLSTATE 40P01 (deadlock detected). The surviving transactions are unblocked and continue. Applications must catch this error and retry the aborted transaction — PostgreSQL itself does not retry.`,
    },
    {
      q: 'What is the difference between row-level and table-level locks in PostgreSQL?',
      a: `<strong>Row-level locks</strong> (RowShareLock, RowExclusiveLock) are acquired automatically by DML — INSERT, UPDATE, DELETE each take a RowExclusiveLock on the affected tuple. These are "lightweight" locks stored in the lock manager's shared memory hash table, not on the disk page. They allow high concurrency because different rows can be independently locked.<br><br>
<strong>Table-level locks</strong> are coarser — they protect the relation as a whole. For example, <code>ALTER TABLE</code> takes AccessExclusiveLock which blocks every other operation on the table. <code>SELECT</code> takes AccessShareLock which conflicts only with AccessExclusiveLock. Most DDL operations on Prime Day are dangerous because they briefly acquire AccessExclusiveLock — use <code>CREATE INDEX CONCURRENTLY</code> and <code>ALTER TABLE ... SET DEFAULT</code> (non-rewrites) to avoid table locks.`,
    },
    {
      q: 'How would you troubleshoot a connection pile-up where many queries are stuck waiting for locks?',
      a: `<strong>pg_locks + pg_stat_activity</strong> is the first stop: <code>SELECT pid, wait_event_type, wait_event, query FROM pg_stat_activity WHERE state='active'</code> shows blocked queries. Join with <code>pg_locks</code> to find the lock holder. Often the blocker is a long-running idle-in-transaction session — find it with <code>SELECT pid, now()-xact_start AS age FROM pg_stat_activity WHERE state='idle in transaction' ORDER BY age DESC</code>. The fix: terminate the blocker with <code>pg_terminate_backend(pid)</code> or set <code>idle_in_transaction_session_timeout</code> to auto-kill long-idle transactions. For Prime Day: set <code>lock_timeout='5s'</code> so blocked queries fail fast rather than queuing indefinitely, and monitor <code>pg_stat_activity.wait_event='relation'</code> for table-level lock storms.`,
    },
  ]);
}

/* ── Mount ─────────────────────────────────────────────────────────────────── */
export function mount(container) {
  const shell = createModuleShell(container, {
    tag: 'Transactions',
    title: 'Locking & Deadlocks',
    subtitle: 'How PostgreSQL coordinates concurrent write access — from row locks to the deadlock detector',
    tabs: [
      { id: 'anim',  label: 'Lock Animation' },
      { id: 'modes', label: 'Lock Modes' },
      { id: 'iq',    label: 'Interview Q&A' },
    ],
  });

  const { tabs, body } = shell;

  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:340px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);

      const steps = LOCK_STEPS.map((s, i) => ({
        label: `Step ${i + 1}`,
        duration: 2600,
        mutate: state => { state.stepIdx = i; },
      }));

      const engine = new SimulationEngine({
        initialState: { stepIdx: 0 },
        steps,
        onRender: (state, cnv) => {
          const ctx = cnv.getContext('2d');
          const pr  = window.devicePixelRatio || 1;
          cnv.width  = cnv.clientWidth  * pr;
          cnv.height = cnv.clientHeight * pr;
          ctx.scale(pr, pr);
          drawLock(ctx, state.stepIdx, cnv.clientWidth, cnv.clientHeight);
        },
      });

      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));

      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);

      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = LOCK_STEPS[i].desc; });
      desc.textContent = LOCK_STEPS[0].desc;

      return () => engine.destroy();
    },
    modes: renderModesTab,
    iq:    renderIQ,
  });

  return null;
}
