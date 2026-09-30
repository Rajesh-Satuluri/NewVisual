import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

/* ── Step data ─────────────────────────────────────────────────────────────── */
// Each tuple: tid, xmin (creator XID), xmax (deleter XID|null), data, flags
const MVCC_STEPS = [
  {
    tuples: [
      { tid:'(23,1)', xmin:50,  xmax:null, data:'order_id=1001  status=placed',  dead:false, isNew:false },
      { tid:'(23,2)', xmin:55,  xmax:null, data:'order_id=1002  status=placed',  dead:false, isNew:false },
      { tid:'(23,3)', xmin:60,  xmax:null, data:'order_id=1003  status=placed',  dead:false, isNew:false },
    ],
    t1: null, t2: null, vacuum: false,
    hi: [],
    desc: 'Heap page 23 holds 3 live tuples. xmin = transaction that INSERT-ed the row (committed). xmax = null means no one has deleted it. All are visible to any new transaction.',
  },
  {
    tuples: [
      { tid:'(23,1)', xmin:50,  xmax:null, data:'order_id=1001  status=placed',  dead:false, isNew:false },
      { tid:'(23,2)', xmin:55,  xmax:null, data:'order_id=1002  status=placed',  dead:false, isNew:false },
      { tid:'(23,3)', xmin:60,  xmax:null, data:'order_id=1003  status=placed',  dead:false, isNew:false },
    ],
    t1: { xid:100, status:'active', label:'T1 active' },
    t2: null, vacuum: false,
    hi: [1],
    desc: 'T1 (XID=100) starts: UPDATE orders SET status=\'shipped\' WHERE order_id=1002. It targets tuple (23,2). MVCC will create a new row version — no table lock required.',
  },
  {
    tuples: [
      { tid:'(23,1)', xmin:50,  xmax:null, data:'order_id=1001  status=placed',  dead:false, isNew:false },
      { tid:'(23,2)', xmin:55,  xmax:100,  data:'order_id=1002  status=placed',  dead:false, isNew:false },
      { tid:'(23,3)', xmin:60,  xmax:null, data:'order_id=1003  status=placed',  dead:false, isNew:false },
      { tid:'(23,4)', xmin:100, xmax:null, data:'order_id=1002  status=shipped', dead:false, isNew:true },
    ],
    t1: { xid:100, status:'active', label:'T1 active — old xmax=100, new xmin=100' },
    t2: null, vacuum: false,
    hi: [1, 3],
    desc: 'T1 stamps xmax=100 on old tuple (23,2) and inserts new version (23,4) with xmin=100. Two versions coexist in the page. Writers never block readers — the heart of MVCC.',
  },
  {
    tuples: [
      { tid:'(23,1)', xmin:50,  xmax:null, data:'order_id=1001  status=placed',  dead:false, isNew:false },
      { tid:'(23,2)', xmin:55,  xmax:100,  data:'order_id=1002  status=placed',  dead:false, isNew:false },
      { tid:'(23,3)', xmin:60,  xmax:null, data:'order_id=1003  status=placed',  dead:false, isNew:false },
      { tid:'(23,4)', xmin:100, xmax:null, data:'order_id=1002  status=shipped', dead:false, isNew:true },
    ],
    t1: { xid:100, status:'active', label:'T1 active — not yet committed' },
    t2: { xid:101, status:'active', label:'T2 starts SELECT' },
    vacuum: false,
    hi: [1, 3],
    desc: 'T2 (XID=101) starts. Its snapshot records which XIDs are active at that moment. T1 (XID=100) is in the active list → T2 cannot see rows with xmin=100.',
  },
  {
    tuples: [
      { tid:'(23,1)', xmin:50,  xmax:null, data:'order_id=1001  status=placed',  dead:false, isNew:false, t2:true },
      { tid:'(23,2)', xmin:55,  xmax:100,  data:'order_id=1002  status=placed',  dead:false, isNew:false, t2:true  },
      { tid:'(23,3)', xmin:60,  xmax:null, data:'order_id=1003  status=placed',  dead:false, isNew:false, t2:true },
      { tid:'(23,4)', xmin:100, xmax:null, data:'order_id=1002  status=shipped', dead:false, isNew:true,  t2:false },
    ],
    t1: { xid:100, status:'active', label:'T1 still active' },
    t2: { xid:101, status:'active', label:'T2 reads old version → status=placed' },
    vacuum: false,
    hi: [1],
    desc: 'T2 sees the OLD version (23,2) with status=placed. Tuple (23,4) is invisible: its xmin=100 is in T2\'s active-transaction list. Snapshot isolation delivers a consistent read without any lock.',
  },
  {
    tuples: [
      { tid:'(23,1)', xmin:50,  xmax:null, data:'order_id=1001  status=placed',  dead:false, isNew:false },
      { tid:'(23,2)', xmin:55,  xmax:100,  data:'order_id=1002  status=placed',  dead:true,  isNew:false },
      { tid:'(23,3)', xmin:60,  xmax:null, data:'order_id=1003  status=placed',  dead:false, isNew:false },
      { tid:'(23,4)', xmin:100, xmax:null, data:'order_id=1002  status=shipped', dead:false, isNew:false },
    ],
    t1: { xid:100, status:'committed', label:'T1 COMMIT' },
    t2: { xid:101, status:'committed', label:'T2 COMMIT — saw consistent snapshot' },
    vacuum: false,
    hi: [3],
    desc: 'T1 commits. (23,2) is now a dead tuple — its xmax=100 is a committed XID, so all future snapshots skip it. T2 also commits; it saw a fully consistent view throughout its lifetime.',
  },
  {
    tuples: [
      { tid:'(23,1)', xmin:50,  xmax:null, data:'order_id=1001  status=placed',  dead:false, isNew:false },
      { tid:'(23,3)', xmin:60,  xmax:null, data:'order_id=1003  status=placed',  dead:false, isNew:false },
      { tid:'(23,4)', xmin:100, xmax:null, data:'order_id=1002  status=shipped', dead:false, isNew:false },
    ],
    t1: null, t2: null, vacuum: true,
    hi: [],
    desc: 'VACUUM reclaims (23,2). Dead tuples are not removed immediately — VACUUM runs periodically to compact pages and return space to the free-space map. Long-running transactions block VACUUM.',
  },
];

/* ── Canvas renderer ───────────────────────────────────────────────────────── */
function drawMVCC(ctx, stepIdx, w, h) {
  const step = MVCC_STEPS[stepIdx];
  ctx.clearRect(0, 0, w, h);

  const tuples = step.tuples;
  const rowH   = 44;
  const pageX  = 20, pageY = 48;
  const pageW  = w - 40;
  const pageH  = tuples.length * rowH + 36;

  // ── page box ──
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.5;
  ctx.fillStyle   = '#0F172A';
  ctx.beginPath(); ctx.roundRect(pageX, pageY, pageW, pageH, 6); ctx.fill(); ctx.stroke();

  ctx.fillStyle = '#64748B'; ctx.font = '700 10px system-ui'; ctx.textAlign = 'left';
  ctx.fillText('HEAP PAGE 23  (8 KB)', pageX + 12, pageY + 18);

  // column widths
  const C0 = pageX + 12;
  const C1 = C0 + 72;
  const C2 = C1 + 68;
  const C3 = C2 + 68;
  const C4 = C3 + 54;

  // header
  const hY = pageY + 32;
  ctx.fillStyle = '#475569'; ctx.font = '700 9px system-ui'; ctx.textAlign = 'left';
  ['TID', 'xmin', 'xmax', 'ver', 'DATA'].forEach((h, i) => {
    ctx.fillText(h, [C0, C1, C2, C3, C4][i], hY);
  });

  // ── draw each tuple ──
  tuples.forEach((t, i) => {
    const ry = pageY + 36 + i * rowH;
    const isHi = step.hi.includes(i);

    // row background
    if (t.dead) {
      ctx.fillStyle = '#1C0A0A';
    } else if (t.isNew) {
      ctx.fillStyle = '#0D0B1A';
    } else if (isHi) {
      ctx.fillStyle = '#0F1F3D';
    } else {
      ctx.fillStyle = 'transparent';
    }
    ctx.fillRect(pageX + 2, ry + 2, pageW - 4, rowH - 4);

    // row border
    if (t.isNew) {
      ctx.strokeStyle = '#A78BFA'; ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
    } else if (t.dead) {
      ctx.strokeStyle = '#7F1D1D'; ctx.lineWidth = 1;
      ctx.setLineDash([]);
    } else if (isHi) {
      ctx.strokeStyle = '#4F46E5'; ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
    } else {
      ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 1;
      ctx.setLineDash([]);
    }
    ctx.strokeRect(pageX + 2, ry + 2, pageW - 4, rowH - 4);
    ctx.setLineDash([]);

    const textY = ry + rowH / 2 + 4;
    const alpha = t.dead ? 0.4 : 1;

    // TID
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = '#94A3B8'; ctx.font = '700 10px monospace'; ctx.textAlign = 'left';
    ctx.fillText(t.tid, C0, textY);

    // xmin
    ctx.fillStyle = t.xmin >= 100 ? '#A78BFA' : '#64748B';
    ctx.fillText(String(t.xmin), C1, textY);

    // xmax
    ctx.fillStyle = t.xmax != null ? '#EF4444' : '#10B981';
    ctx.fillText(t.xmax != null ? String(t.xmax) : 'null', C2, textY);

    // version badge
    ctx.fillStyle = t.isNew ? '#A78BFA' : '#64748B';
    ctx.font = '600 9px system-ui';
    ctx.fillText(t.isNew ? 'v2 NEW' : 'v1', C3, textY);

    // data
    ctx.fillStyle = t.dead ? '#7F1D1D' : '#CBD5E1';
    ctx.font = '10px monospace';
    const maxDataW = pageW - (C4 - pageX) - 12;
    let dataStr = t.data;
    while (ctx.measureText(dataStr).width > maxDataW && dataStr.length > 10) {
      dataStr = dataStr.slice(0, -1);
    }
    if (dataStr !== t.data) dataStr += '…';
    ctx.fillText(dataStr, C4, textY);
    ctx.globalAlpha = 1;

    // T2 visibility dot
    if (t.t2 !== undefined) {
      const dotX = pageX + pageW - 12;
      ctx.fillStyle = t.t2 ? '#10B981' : '#EF4444';
      ctx.beginPath(); ctx.arc(dotX, textY - 4, 4, 0, Math.PI * 2); ctx.fill();
    }

    // dead strikethrough
    if (t.dead && !step.vacuum) {
      ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 1; ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(pageX + 4, ry + rowH / 2);
      ctx.lineTo(pageX + pageW - 4, ry + rowH / 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  });

  // ── Transaction status boxes ──
  const boxY = pageY + pageH + 16;
  const boxH = 46;

  function drawTxBox(tx, x, bw, color) {
    ctx.fillStyle = color + '22';
    ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.roundRect(x, boxY, bw, boxH, 6); ctx.fill(); ctx.stroke();

    ctx.fillStyle = color; ctx.font = '700 10px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(`XID ${tx.xid}  —  ${tx.status.toUpperCase()}`, x + 10, boxY + 16);
    ctx.fillStyle = '#94A3B8'; ctx.font = '9px system-ui';
    ctx.fillText(tx.label, x + 10, boxY + 32);
  }

  const halfW = (pageW - 12) / 2;
  if (step.t1) drawTxBox(step.t1, pageX, halfW, '#4F46E5');
  if (step.t2) drawTxBox(step.t2, pageX + halfW + 12, halfW, '#10B981');

  // ── T2 legend if applicable ──
  if (step.tuples.some(t => t.t2 !== undefined)) {
    const lx = pageX + pageW - 105, ly = pageY + pageH - 28;
    ctx.fillStyle = '#0F172A'; ctx.strokeStyle = '#334155';
    ctx.beginPath(); ctx.roundRect(lx, ly, 100, 24, 4); ctx.fill(); ctx.stroke();
    ctx.font = '9px system-ui'; ctx.textAlign = 'left';
    ctx.fillStyle = '#10B981'; ctx.fillText('●', lx + 6, ly + 15);
    ctx.fillStyle = '#94A3B8'; ctx.fillText(' visible to T2', lx + 14, ly + 15);
    ctx.fillStyle = '#EF4444'; ctx.fillText('●', lx + 6, ly + 26);
    ctx.fillStyle = '#94A3B8'; ctx.fillText(' hidden from T2', lx + 14, ly + 26);
  }

  // ── VACUUM label ──
  if (step.vacuum) {
    ctx.fillStyle = '#F59E0B'; ctx.font = '700 11px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('VACUUM: dead tuple reclaimed — space returned to free-space map', w / 2, boxY + 24);
  }

  // ── Snapshot rule at top ──
  ctx.fillStyle = '#334155'; ctx.font = '9px system-ui'; ctx.textAlign = 'left';
  ctx.fillText('Visibility rule:  xmin committed  AND  (xmax = null  OR  xmax in-progress at snapshot)', pageX, 34);
  ctx.textAlign = 'left';
}

/* ── Content tabs ──────────────────────────────────────────────────────────── */
function renderTuplesTab(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-family:system-ui;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="margin:0 0 16px;color:#E2E8F0;font-size:15px">PostgreSQL Tuple Header Fields</h3>

  <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:24px">
    <thead>
      <tr style="background:#0F172A">
        <th style="padding:8px 12px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B;font-weight:600">Field</th>
        <th style="padding:8px 12px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B;font-weight:600">Size</th>
        <th style="padding:8px 12px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B;font-weight:600">Purpose</th>
      </tr>
    </thead>
    <tbody>
      ${[
        ['t_xmin','4 bytes','XID of the INSERT transaction. Row is visible if xmin is committed and ≤ snapshot XID.'],
        ['t_xmax','4 bytes','XID of DELETE/UPDATE transaction. 0 = still live. Row is invisible if xmax is committed.'],
        ['t_cid','4 bytes','Command ID within the transaction — distinguishes multiple SQL statements in one txn.'],
        ['t_ctid','6 bytes','Physical location (page, offset) of the LATEST version of this row (self-pointer if current).'],
        ['t_infomask','2 bytes','Visibility hint bits: XMIN_COMMITTED, XMAX_COMMITTED, IS_HEAP_HOT_UPDATED, etc.'],
        ['t_hoff','1 byte','Offset to the actual data — accounts for null bitmap and alignment padding.'],
      ].map(([f,s,d]) => `
        <tr style="border-bottom:1px solid #0F172A">
          <td style="padding:8px 12px;color:#A78BFA;font-family:monospace">${f}</td>
          <td style="padding:8px 12px;color:#64748B">${s}</td>
          <td style="padding:8px 12px">${d}</td>
        </tr>`).join('')}
    </tbody>
  </table>

  <h3 style="margin:0 0 12px;color:#E2E8F0;font-size:15px">Visibility Algorithm (simplified)</h3>
  <pre style="background:#0F172A;border:1px solid #1E293B;border-radius:6px;padding:14px;font-size:11px;color:#94A3B8;overflow-x:auto">
function isVisible(tuple, snapshot):
  # row must have been inserted by a committed transaction
  if NOT xmin_is_committed(tuple.xmin, snapshot):   return False
  if tuple.xmin > snapshot.xid:                      return False
  if tuple.xmin in snapshot.active_xids:             return False

  # row must not have been deleted by a committed transaction
  if tuple.xmax == 0:                                return True   # still live
  if NOT xmax_is_committed(tuple.xmax, snapshot):   return True   # deleter aborted/active
  if tuple.xmax > snapshot.xid:                      return True   # deleted after our snapshot
  if tuple.xmax in snapshot.active_xids:             return True   # deleter still active

  return False  # definitively deleted
</pre>

  <h3 style="margin:16px 0 12px;color:#E2E8F0;font-size:15px">HOT Updates (Heap-Only Tuple)</h3>
  <p style="margin:0 0 8px">When an UPDATE does NOT change any indexed column, PostgreSQL uses a HOT update:</p>
  <ul style="margin:0;padding-left:20px">
    <li style="margin-bottom:6px">New version is placed on the <strong>same heap page</strong> (if space allows)</li>
    <li style="margin-bottom:6px">Old tuple's <code style="color:#A78BFA">t_ctid</code> points to the new version — index entries are <strong>not</strong> duplicated</li>
    <li style="margin-bottom:6px">Index scans follow the HOT chain on the heap page</li>
    <li>Amazon Prime Day: status column updates (placed→shipped→delivered) are ideal HOT candidates when the indexed columns (order_id, customer_id) don't change</li>
  </ul>

  <h3 style="margin:16px 0 12px;color:#E2E8F0;font-size:15px">Why Long-Running Transactions Are Dangerous</h3>
  <div style="background:#1C0A0A;border:1px solid #7F1D1D;border-radius:6px;padding:14px;font-size:12px">
    <strong style="color:#EF4444">Transaction Horizon:</strong> VACUUM cannot reclaim dead tuples that are still visible to <em>any</em> open transaction. A single 30-minute analytics query during Prime Day blocks VACUUM from reclaiming any rows updated in that window — even on unrelated tables — because the old snapshots must be preserved. This is called "transaction ID horizon bloat."
  </div>
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'How does MVCC achieve snapshot isolation without read locks?',
      a: `PostgreSQL never locks rows for reads. Instead, each transaction captures a <strong>snapshot</strong> at start — a list of committed XIDs and the set of in-progress XIDs at that moment. For each heap tuple it evaluates the visibility rule: xmin must be a committed XID ≤ snapshot.xid and not in the active set; xmax must be null, uncommitted, or > snapshot.xid. The reader simply skips invisible versions without contacting the lock manager. The cost is storage: multiple tuple versions coexist on heap pages until VACUUM reclaims dead ones. On Prime Day, this lets analytics SELECT queries scan order history while thousands of concurrent UPDATEs mark orders shipped — zero lock contention between them.`,
    },
    {
      q: 'What is the difference between READ COMMITTED and REPEATABLE READ isolation in PostgreSQL under MVCC?',
      a: `<strong>READ COMMITTED</strong> (the default) takes a fresh snapshot at the start of <em>each SQL statement</em>. If T1 commits between two SELECTs in T2, T2's second SELECT sees the new data — a non-repeatable read is possible.<br><br>
<strong>REPEATABLE READ</strong> takes the snapshot once at the start of the <em>first statement</em> and holds it for the entire transaction. All reads see a consistent point-in-time view. Phantom rows are also prevented because new rows inserted by committed transactions after snapshot time are invisible. The tradeoff: PostgreSQL may raise a serialization error if a write conflict is detected, requiring the application to retry.`,
    },
    {
      q: 'What is VACUUM\'s role in MVCC, and when does autovacuum fail to keep up?',
      a: `MVCC deliberately leaves dead tuples in place so concurrent readers can still see them. VACUUM scans heap pages, identifies tuples where xmax is committed and no open snapshot can see them, and reclaims their space into the free-space map (FSM) for reuse. Without VACUUM: (1) <strong>table bloat</strong> — pages fill with dead tuples, sequential scans read more blocks; (2) <strong>index bloat</strong> — index leaf pages retain entries pointing to dead heap tuples; (3) <strong>transaction ID wraparound</strong> — XID is a 32-bit counter; without freezing old tuples, after ~2 billion transactions PostgreSQL would consider old data "in the future" and corrupt the database.<br><br>
Autovacuum fails to keep up when: update/delete rate exceeds the cost-delay throttle, a long-running transaction holds an old snapshot blocking cleanup, or <code>autovacuum_vacuum_scale_factor</code> is too high for large tables. On Prime Day: set <code>autovacuum_vacuum_scale_factor=0.01</code> for the orders table so it triggers after 1% of rows are dead, not the default 20%.`,
    },
  ]);
}

/* ── Mount ─────────────────────────────────────────────────────────────────── */
export function mount(container) {
  const shell = createModuleShell(container, {
    tag: 'Transactions',
    title: 'MVCC — Multi-Version Concurrency Control',
    subtitle: 'How PostgreSQL serves consistent snapshots to every reader without blocking writers — the mechanism behind isolation levels',
    tabs: [
      { id: 'anim',   label: 'MVCC Animation' },
      { id: 'tuples', label: 'Tuple Versioning' },
      { id: 'iq',     label: 'Interview Q&A' },
    ],
  });

  const { tabs, body } = shell;

  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:360px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);

      const steps = MVCC_STEPS.map((s, i) => ({
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
          drawMVCC(ctx, state.stepIdx, cnv.clientWidth, cnv.clientHeight);
        },
      });

      const controls = SimulationEngine.renderControls(engine);
      const timeline = SimulationEngine.renderTimeline(engine, steps);
      panel.appendChild(controls);
      panel.appendChild(timeline);

      // desc box
      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);

      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = MVCC_STEPS[i].desc; });
      desc.textContent = MVCC_STEPS[0].desc;

      return () => engine.destroy();
    },

    tuples: renderTuplesTab,
    iq:     renderIQ,
  });

  return null;
}
