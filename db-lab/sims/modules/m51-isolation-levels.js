import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

/* ── Step data ─────────────────────────────────────────────────────────────── */
// Shows 3 key anomalies: dirty read, non-repeatable read, phantom read
// Events: { t:'T1'|'T2', type:'begin'|'write'|'read'|'commit'|'rollback', text, y:lane_y, anomaly? }
const IL_STEPS = [
  {
    show: [],
    isolation: 'READ COMMITTED', problem: '',
    header: 'Dirty Read (prevented in READ COMMITTED)',
    desc: 'Scenario: T1 deposits $200 into account A (not yet committed). T2 reads account A. Will T2 see the uncommitted $200? In READ UNCOMMITTED it would — PostgreSQL does not implement READ UNCOMMITTED, so this anomaly never occurs.',
  },
  {
    show: [0],
    isolation: 'READ COMMITTED', problem: '',
    header: 'Dirty Read (prevented in READ COMMITTED)',
    desc: 'T1 begins a transfer: account A balance was $1,000. T1 UPDATEs account A to $1,200 but has NOT committed yet.',
  },
  {
    show: [0,1],
    isolation: 'READ COMMITTED', problem: '',
    header: 'Dirty Read (prevented in READ COMMITTED)',
    desc: 'T2 begins and runs SELECT on account A. Under READ COMMITTED, T2\'s snapshot only includes COMMITTED data. T1\'s write is invisible — T2 sees $1,000. Dirty read is prevented.',
  },
  {
    show: [0,1,2,3],
    isolation: 'READ COMMITTED', problem: 'NON-REPEATABLE READ',
    header: 'Non-Repeatable Read (occurs in READ COMMITTED)',
    desc: 'T2 reads account A again after T1 commits. T1\'s $200 deposit is now visible — T2 sees $1,200. T2 got a different answer for the same query in the same transaction. This is the non-repeatable read anomaly.',
  },
  {
    show: [0,1,2,3,4],
    isolation: 'REPEATABLE READ', problem: '',
    header: 'Repeatable Read (REPEATABLE READ prevents this)',
    desc: 'Switch to REPEATABLE READ. T2\'s snapshot is taken ONCE at the start of the first query. Even after T1 commits, T2\'s second SELECT still sees the original $1,000 — the snapshot is "frozen" for the transaction.',
  },
  {
    show: [0,1,2,3,4,5],
    isolation: 'REPEATABLE READ', problem: 'PHANTOM READ',
    header: 'Phantom Read (occurs in some databases, prevented in PostgreSQL)',
    desc: 'Phantom read: T2 queries orders placed today — gets 5 rows. T1 inserts a new order and commits. T2 queries again and gets 6 rows. The new row is a "phantom." In PostgreSQL, REPEATABLE READ also prevents phantoms because snapshots cover all table versions.',
  },
  {
    show: [0,1,2,3,4,5,6],
    isolation: 'SERIALIZABLE', problem: '',
    header: 'Serializable — full protection',
    desc: 'SERIALIZABLE (SSI) detects read-write conflicts between concurrent transactions and aborts one if they could not have run serially. Prevents all anomalies including write skew. PostgreSQL implements SSI without locking using predicate tracking.',
  },
];

// Timeline events rendered in order
const EVENTS = [
  { t:'T1', type:'write',  text:'UPDATE accounts SET balance=1200 WHERE id=A  (not committed)', y:80  },
  { t:'T2', type:'read',   text:'SELECT balance FROM accounts WHERE id=A  → 1,000 (T1 invisible)',  y:180 },
  { t:'T1', type:'commit', text:'COMMIT — T1 committed, A=1,200', y:80  },
  { t:'T2', type:'read',   text:'SELECT balance FROM accounts WHERE id=A  → 1,200 ← NON-REPEATABLE!', y:180, anomaly:true },
  { t:'T2', type:'read',   text:'[REPEATABLE READ] SELECT balance FROM accounts WHERE id=A  → 1,000 ✓', y:180 },
  { t:'T1', type:'write',  text:'INSERT INTO orders (customer_id, total) VALUES (42, 99.90)  + COMMIT', y:80, anomaly:true },
  { t:'T2', type:'read',   text:'SELECT COUNT(*) FROM orders WHERE date=today  → 6 ← PHANTOM!', y:180, anomaly:true },
];

/* ── Canvas renderer ───────────────────────────────────────────────────────── */
function drawIL(ctx, stepIdx, w, h) {
  const step = IL_STEPS[stepIdx];
  ctx.clearRect(0, 0, w, h);

  // ── Isolation level badge ──
  ctx.fillStyle = '#0F172A'; ctx.strokeStyle = '#4F46E5'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(16, 8, 200, 24, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#818CF8'; ctx.font = '700 10px system-ui'; ctx.textAlign = 'left';
  ctx.fillText('ISOLATION LEVEL: ' + step.isolation, 26, 23);

  if (step.problem) {
    ctx.fillStyle = '#1C0A0A'; ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(230, 8, 240, 24, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#EF4444'; ctx.font = '700 10px system-ui';
    ctx.fillText('⚠ ' + step.problem, 240, 23);
  }

  // ── Timeline lanes ──
  const laneColors = { T1:'#4F46E5', T2:'#10B981' };
  const laneLabels = { T1: { y:80 }, T2: { y:180 } };

  ['T1','T2'].forEach(t => {
    const laneY = laneLabels[t].y;
    const c = laneColors[t];
    // label
    ctx.fillStyle = c + '33'; ctx.strokeStyle = c; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(16, laneY - 18, 30, 18, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = c; ctx.font = '700 10px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(t, 31, laneY - 5);
    ctx.textAlign = 'left';
    // lane line
    ctx.strokeStyle = c + '44'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(50, laneY); ctx.lineTo(w - 16, laneY); ctx.stroke();
    ctx.setLineDash([]);
  });

  // ── Events ──
  const xStep = (w - 80) / 7;
  step.show.forEach(idx => {
    const ev = EVENTS[idx];
    const ex = 60 + idx * xStep;
    const ey = ev.y;
    const c  = laneColors[ev.t];

    // dot
    ctx.fillStyle = ev.anomaly ? '#EF4444' : c;
    ctx.beginPath(); ctx.arc(ex, ey, 7, 0, Math.PI * 2); ctx.fill();
    if (ev.type === 'commit') {
      ctx.fillStyle = '#10B981'; ctx.beginPath(); ctx.arc(ex, ey, 7, 0, Math.PI * 2); ctx.fill();
    }

    // label box
    const boxW = Math.min(180, (w - ex - 16));
    const lx = Math.min(ex + 10, w - boxW - 8);
    const ly = ey + (ey < 130 ? 12 : -52);

    ctx.fillStyle = ev.anomaly ? '#1C0A0A' : '#0F172A';
    ctx.strokeStyle = ev.anomaly ? '#EF4444' : (ev.type === 'commit' ? '#10B981' : c);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(lx, ly, boxW, 40, 4); ctx.fill(); ctx.stroke();

    ctx.fillStyle = ev.anomaly ? '#EF4444' : '#94A3B8';
    ctx.font = '9px system-ui'; ctx.textAlign = 'left';
    // word-wrap inside box
    const words = ev.text.split(' ');
    let line = '', lineY = ly + 13;
    for (const word of words) {
      const test = line + (line ? ' ' : '') + word;
      if (ctx.measureText(test).width > boxW - 10 && line) {
        ctx.fillText(line, lx + 6, lineY);
        line = word; lineY += 12;
        if (lineY > ly + 38) break;
      } else { line = test; }
    }
    ctx.fillText(line, lx + 6, lineY);
    ctx.textAlign = 'left';

    // vertical connector from dot to box
    ctx.strokeStyle = ev.anomaly ? '#EF444466' : c + '66'; ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(ex, ey + (ey < 130 ? 7 : -7));
    ctx.lineTo(ex, ey + (ey < 130 ? 12 : -12));
    ctx.stroke();
    ctx.setLineDash([]);
  });
}

/* ── Anomaly table tab ─────────────────────────────────────────────────────── */
function renderTableTab(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-family:system-ui;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="margin:0 0 16px;color:#E2E8F0;font-size:15px">Isolation Level Anomaly Matrix</h3>
  <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:24px">
    <thead><tr style="background:#0F172A">
      <th style="padding:9px 12px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Isolation Level</th>
      <th style="padding:9px 12px;text-align:center;color:#64748B;border-bottom:1px solid #1E293B">Dirty Read</th>
      <th style="padding:9px 12px;text-align:center;color:#64748B;border-bottom:1px solid #1E293B">Non-Repeatable Read</th>
      <th style="padding:9px 12px;text-align:center;color:#64748B;border-bottom:1px solid #1E293B">Phantom Read</th>
      <th style="padding:9px 12px;text-align:center;color:#64748B;border-bottom:1px solid #1E293B">Write Skew</th>
    </tr></thead>
    <tbody>
      ${[
        ['READ UNCOMMITTED','Possible¹','Possible','Possible','Possible'],
        ['READ COMMITTED (PG default)','Prevented','Possible','Possible','Possible'],
        ['REPEATABLE READ','Prevented','Prevented','Prevented²','Possible'],
        ['SERIALIZABLE (SSI)','Prevented','Prevented','Prevented','Prevented'],
      ].map(([lvl,...cells]) => `
        <tr style="border-bottom:1px solid #0F172A">
          <td style="padding:8px 12px;color:${lvl.includes('SERIALIZABLE')?'#10B981':lvl.includes('REPEATABLE')?'#818CF8':lvl.includes('default')?'#F59E0B':'#64748B'};font-weight:600">${lvl}</td>
          ${cells.map(c => `<td style="padding:8px 12px;text-align:center;color:${c.startsWith('Prevented')?'#10B981':'#EF4444'}">${c}</td>`).join('')}
        </tr>`).join('')}
    </tbody>
  </table>
  <p style="font-size:11px;color:#475569;margin-top:-16px">¹ PostgreSQL treats READ UNCOMMITTED as READ COMMITTED — dirty reads never occur. &nbsp;² PostgreSQL's REPEATABLE READ also prevents phantoms.</p>

  <h3 style="margin:20px 0 12px;color:#E2E8F0;font-size:15px">Write Skew — The Subtle Anomaly</h3>
  <pre style="background:#0F172A;border:1px solid #1E293B;border-radius:6px;padding:14px;font-size:11px;color:#94A3B8;overflow-x:auto">
-- Invariant: at least 1 doctor must be on-call at all times
-- T1 and T2 both read: 2 doctors currently on-call
-- T1: UPDATE doctors SET on_call=false WHERE id=Alice  -- now 1 on-call
-- T2: UPDATE doctors SET on_call=false WHERE id=Bob    -- now 0 on-call ← invariant violated
-- Both transactions read the SAME snapshot (both saw 2 doctors), so
-- neither sees the other's write. Both commit. Invariant broken.
-- FIX: use SERIALIZABLE isolation or explicit SELECT FOR UPDATE.
</pre>

  <h3 style="margin:16px 0 12px;color:#E2E8F0;font-size:15px">Prime Day Guidance</h3>
  <ul style="margin:0;padding-left:20px">
    <li style="margin-bottom:6px"><strong>Order placement:</strong> READ COMMITTED is sufficient. Dirty reads don't occur in PostgreSQL; phantom reads are rare in OLTP single-row operations.</li>
    <li style="margin-bottom:6px"><strong>Inventory reservation:</strong> Use <code style="color:#A78BFA">SELECT FOR UPDATE</code> to lock the inventory row before decrementing — avoids concurrent over-selling without needing SERIALIZABLE.</li>
    <li><strong>Financial reconciliation:</strong> Use SERIALIZABLE to prevent write skew on balance calculations. Accept the ~5% serialization failure rate and retry.</li>
  </ul>
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'Explain the difference between a non-repeatable read and a phantom read.',
      a: `A <strong>non-repeatable read</strong> occurs when a transaction reads the same ROW twice and gets different values — because another transaction updated and committed that row between the two reads. It's about existing data changing.<br><br>
A <strong>phantom read</strong> occurs when a transaction executes the same QUERY twice (e.g., COUNT(*) WHERE date=today) and gets a different result set — because another transaction inserted or deleted rows matching the predicate. It's about the set of rows changing, not their values. PostgreSQL's REPEATABLE READ prevents both anomalies by holding a consistent snapshot for the entire transaction, which covers both row versions and the set of visible rows.`,
    },
    {
      q: 'What is Serializable Snapshot Isolation (SSI) and how does PostgreSQL implement it?',
      a: `SSI is PostgreSQL's implementation of SERIALIZABLE isolation. It extends MVCC snapshot isolation with <strong>predicate locking</strong> — tracking which predicates (WHERE conditions) each transaction read. When two concurrent transactions have a read-write dependency cycle (T1 reads what T2 writes, T2 reads what T1 writes), SSI detects this as a potential serialization anomaly and aborts one transaction with error 40001 (serialization failure).<br><br>
Key properties: (1) No actual locking — predicates are tracked in memory using "SIReadLock" entries in shared memory; (2) False positives are possible — SSI may abort a transaction that could have committed safely, requiring a retry; (3) Overhead is low in practice (~10–20% versus READ COMMITTED for typical OLTP workloads). SSI prevents write skew and all ANSI isolation anomalies without sacrificing concurrency via lock contention.`,
    },
    {
      q: 'How would you set isolation level per transaction, and when should you deviate from READ COMMITTED on Amazon Prime Day?',
      a: `Per-transaction: <code>BEGIN; SET TRANSACTION ISOLATION LEVEL REPEATABLE READ; ...</code> or inline: <code>BEGIN ISOLATION LEVEL SERIALIZABLE</code>. The default READ COMMITTED is appropriate for most Prime Day OLTP operations (order inserts, status updates) because:<br><br>
<strong>Stay with READ COMMITTED for:</strong> order placement, status updates, catalog reads — high concurrency, low anomaly risk.<br><br>
<strong>Use REPEATABLE READ for:</strong> multi-query reports that must see a consistent snapshot (e.g., order summary dashboards running as a single transaction).<br><br>
<strong>Use SERIALIZABLE for:</strong> financial operations requiring correctness guarantees — inventory reservation (prevent oversell), double-spending prevention, balance adjustments with invariant checks. Pair with application-level retry logic for serialization failures.`,
    },
  ]);
}

/* ── Mount ─────────────────────────────────────────────────────────────────── */
export function mount(container) {
  const shell = createModuleShell(container, {
    tag: 'Transactions',
    title: 'Isolation Levels in Depth',
    subtitle: 'Dirty reads, non-repeatable reads, phantom reads, and write skew — with concrete examples',
    tabs: [
      { id: 'anim',  label: 'Anomaly Animation' },
      { id: 'table', label: 'Isolation Matrix' },
      { id: 'iq',    label: 'Interview Q&A' },
    ],
  });

  const { tabs, body } = shell;

  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:300px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);

      const steps = IL_STEPS.map((s, i) => ({
        label: `Step ${i + 1}`,
        duration: 2800,
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
          drawIL(ctx, state.stepIdx, cnv.clientWidth, cnv.clientHeight);
        },
      });

      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));

      const header = document.createElement('div');
      header.style.cssText = 'margin-top:10px;padding:6px 14px;background:#0F172A;border-radius:6px 6px 0 0;font-size:11px;font-weight:700;color:#818CF8';
      panel.appendChild(header);

      const desc = document.createElement('div');
      desc.style.cssText = 'padding:8px 14px 10px;background:#0F172A;border-radius:0 0 6px 6px;font-size:12px;color:#94A3B8;line-height:1.55;margin-bottom:2px';
      panel.appendChild(desc);

      engine.attach(canvas);
      engine.on('step', i => {
        header.textContent = IL_STEPS[i].header;
        desc.textContent   = IL_STEPS[i].desc;
      });
      header.textContent = IL_STEPS[0].header;
      desc.textContent   = IL_STEPS[0].desc;

      return () => engine.destroy();
    },
    table: renderTableTab,
    iq:    renderIQ,
  });

  return null;
}
