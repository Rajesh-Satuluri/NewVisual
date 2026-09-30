import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

/* ── ARIES three-pass recovery animation ─────────────────────────────────── */
// WAL records shown in the log; each has: lsn, tx, type, data, committed?
const LOG_RECORDS = [
  { lsn:'0/001', tx:'T1', type:'BEGIN',    data:'',                        color:'#64748B' },
  { lsn:'0/002', tx:'T1', type:'UPDATE',   data:'page 5 off 2 → val=100',  color:'#4F46E5' },
  { lsn:'0/003', tx:'T2', type:'BEGIN',    data:'',                        color:'#64748B' },
  { lsn:'0/004', tx:'T2', type:'UPDATE',   data:'page 7 off 1 → val=200',  color:'#10B981' },
  { lsn:'0/005', tx:'T1', type:'COMMIT',   data:'commitTime=12:00:05',     color:'#4F46E5', commit:true },
  { lsn:'0/006', tx:'T2', type:'UPDATE',   data:'page 3 off 4 → val=300',  color:'#10B981' },
  { lsn:'0/007', tx:'T3', type:'BEGIN',    data:'',                        color:'#64748B' },
  { lsn:'0/008', tx:'T3', type:'UPDATE',   data:'page 9 off 6 → val=400',  color:'#F59E0B' },
  // crash here — T2 and T3 have no COMMIT
];

const CRASH_STEPS = [
  {
    phase: 'crash', pass: null, scanTo: -1,
    winners: [], losers: [],
    redoFrom: -1, redoDone: [],
    undoSet: [], undoDone: [],
    desc: 'System CRASH detected. PostgreSQL reads pg_control to find the last checkpoint LSN (0/001). Recovery starts. ARIES uses three passes: Analysis, Redo, Undo.',
  },
  {
    phase: 'analysis', pass: 'analysis', scanTo: 0,
    winners: [], losers: ['T1'],
    redoFrom: -1, redoDone: [], undoSet: [], undoDone: [],
    desc: 'Analysis pass (forward scan from checkpoint). LSN 0/001: T1 BEGIN → add T1 to active-txn table as a "loser" candidate.',
  },
  {
    phase: 'analysis', pass: 'analysis', scanTo: 2,
    winners: [], losers: ['T1','T2'],
    redoFrom: -1, redoDone: [], undoSet: [], undoDone: [],
    desc: 'LSN 0/003: T2 BEGIN → add T2 to losers. Scanning all records after checkpoint to build the complete transaction table.',
  },
  {
    phase: 'analysis', pass: 'analysis', scanTo: 4,
    winners: ['T1'], losers: ['T2'],
    redoFrom: -1, redoDone: [], undoSet: [], undoDone: [],
    desc: 'LSN 0/005: T1 COMMIT → move T1 from losers → winners. At scan end: T2 and T3 are losers (no COMMIT), T1 is a winner. RedoLSN = 0/001 (checkpoint).',
  },
  {
    phase: 'analysis', pass: 'analysis', scanTo: 7,
    winners: ['T1'], losers: ['T2','T3'],
    redoFrom: -1, redoDone: [], undoSet: [], undoDone: [],
    desc: 'Analysis complete: Winners = {T1}, Losers = {T2, T3}. All changes must be redone from LSN 0/001 (even winners — we don\'t know which dirty pages made it to disk).',
  },
  {
    phase: 'redo', pass: 'redo', scanTo: 7,
    winners: ['T1'], losers: ['T2','T3'],
    redoFrom: 0, redoDone: [0,1,2,3,4,5,6,7],
    undoSet: [], undoDone: [],
    desc: 'Redo pass (forward from checkpoint LSN). Re-apply EVERY log record — committed or not — to reconstruct the exact pre-crash state. T1\'s commit is redone, T2/T3\'s uncommitted changes are also redone (Undo pass will roll them back).',
  },
  {
    phase: 'undo', pass: 'undo', scanTo: 7,
    winners: ['T1'], losers: ['T2','T3'],
    redoFrom: 0, redoDone: [0,1,2,3,4,5,6,7],
    undoSet: ['T2','T3'], undoDone: [7,5],
    desc: 'Undo pass (backward scan). Roll back each loser\'s changes in reverse LSN order. LSN 0/008 (T3 UPDATE page 9) → undone. LSN 0/006 (T2 UPDATE page 3) → undone.',
  },
  {
    phase: 'undo', pass: 'undo', scanTo: 7,
    winners: ['T1'], losers: ['T2','T3'],
    redoFrom: 0, redoDone: [0,1,2,3,4,5,6,7],
    undoSet: ['T2','T3'], undoDone: [7,5,3,1],
    desc: 'LSN 0/004 (T2 UPDATE page 7) → undone. LSN 0/002 (T1 UPDATE page 5) — T1 is a winner, SKIP. LSN 0/007 (T3 BEGIN), LSN 0/001 (T1 BEGIN) — nothing to undo.',
  },
  {
    phase: 'done', pass: null, scanTo: 7,
    winners: ['T1'], losers: ['T2','T3'],
    redoFrom: 0, redoDone: [0,1,2,3,4,5,6,7],
    undoSet: ['T2','T3'], undoDone: [7,5,3,1],
    desc: 'Recovery complete. T1\'s changes are durable. T2 and T3 are rolled back — their pages are restored to pre-crash state. PostgreSQL writes a new checkpoint and accepts connections.',
  },
];

/* ── Canvas renderer ───────────────────────────────────────────────────────── */
function drawCrashRecovery(ctx, stepIdx, w, h) {
  const step = CRASH_STEPS[stepIdx];
  ctx.clearRect(0, 0, w, h);

  const logX = 16, logY = 36, logW = w - 200, rowH = 30;
  const logH = LOG_RECORDS.length * rowH + 26;

  // ── phase header ──
  const phaseColors = { crash:'#EF4444', analysis:'#F59E0B', redo:'#06B6D4', undo:'#A78BFA', done:'#10B981' };
  const phaseLabel  = { crash:'CRASH', analysis:'PASS 1: ANALYSIS', redo:'PASS 2: REDO', undo:'PASS 3: UNDO', done:'RECOVERY COMPLETE' };
  const pc = phaseColors[step.phase] || '#64748B';
  ctx.fillStyle = pc + '22'; ctx.strokeStyle = pc; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(logX, 8, 220, 22, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = pc; ctx.font = '700 10px system-ui'; ctx.textAlign = 'left';
  ctx.fillText(phaseLabel[step.phase] || '', logX + 8, 22);

  // ── WAL log box ──
  ctx.fillStyle = '#0F172A'; ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(logX, logY, logW, logH, 6); ctx.fill(); ctx.stroke();

  ctx.fillStyle = '#334155'; ctx.font = '700 9px system-ui'; ctx.textAlign = 'left';
  ctx.fillText('WRITE-AHEAD LOG', logX + 10, logY + 16);

  // column headers
  const C = [logX+10, logX+68, logX+108, logX+158];
  const HDRS = ['LSN','TX','TYPE','DATA'];
  ctx.fillStyle = '#475569'; ctx.font = '700 9px system-ui';
  HDRS.forEach((h, i) => ctx.fillText(h, C[i], logY + 28));

  LOG_RECORDS.forEach((r, i) => {
    const ry = logY + 30 + i * rowH;
    const isRedone = step.redoDone.includes(i);
    const isUndone = step.undoDone.includes(i);
    const isScanned = step.scanTo >= i && step.pass === 'analysis';

    // row bg
    if (isUndone) {
      ctx.fillStyle = '#1C0A1C';
    } else if (isRedone) {
      ctx.fillStyle = r.commit ? '#071C10' : '#071828';
    } else if (isScanned) {
      ctx.fillStyle = '#1C1608';
    } else {
      ctx.fillStyle = i % 2 === 0 ? '#0A0F1A' : 'transparent';
    }
    ctx.fillRect(logX + 1, ry, logW - 2, rowH - 1);

    const ty = ry + rowH / 2 + 4;
    ctx.font = '10px monospace'; ctx.textAlign = 'left';
    ctx.fillStyle = '#64748B'; ctx.fillText(r.lsn, C[0], ty);
    ctx.fillStyle = r.color;   ctx.fillText(r.tx,  C[1], ty);
    ctx.fillStyle = r.commit ? '#10B981' : '#94A3B8'; ctx.font = '10px system-ui';
    ctx.fillText(r.type, C[2], ty);
    ctx.fillStyle = '#64748B'; ctx.font = '9px monospace';
    ctx.fillText(r.data, C[3], ty);

    // redo/undo badge
    if (isUndone) {
      ctx.fillStyle = '#A78BFA'; ctx.font = '700 8px system-ui'; ctx.textAlign = 'right';
      ctx.fillText('UNDONE', logX + logW - 6, ty);
      ctx.textAlign = 'left';
    } else if (isRedone) {
      ctx.fillStyle = '#06B6D4'; ctx.font = '700 8px system-ui'; ctx.textAlign = 'right';
      ctx.fillText('REDONE', logX + logW - 6, ty);
      ctx.textAlign = 'left';
    }
  });

  // ── Winner/Loser table ──
  const tx2X = logX + logW + 12, tx2W = w - tx2X - 16;
  const txBoxH = 40;

  const drawTxSet = (label, txs, color, startY) => {
    ctx.fillStyle = '#0F172A'; ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(tx2X, startY, tx2W, txBoxH + txs.length * 20 + 8, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = color; ctx.font = '700 9px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(label, tx2X + 8, startY + 16);
    txs.forEach((t, i) => {
      ctx.fillStyle = '#94A3B8'; ctx.font = '10px monospace';
      ctx.fillText('• ' + t, tx2X + 14, startY + 30 + i * 18);
    });
    return startY + txBoxH + txs.length * 20 + 8;
  };

  let nextY = logY;
  if (step.winners.length > 0 || step.losers.length > 0) {
    nextY = drawTxSet('WINNERS (committed)', step.winners.length ? step.winners : ['(none yet)'], '#10B981', nextY);
    nextY += 8;
    drawTxSet('LOSERS (uncommitted)', step.losers.length ? step.losers : ['(none yet)'], '#EF4444', nextY);
  }

  // crash indicator
  if (step.phase === 'crash') {
    ctx.fillStyle = '#EF444466';
    ctx.fillRect(logX, logY + 30 + 7 * rowH - 8, logW, 4);
    ctx.fillStyle = '#EF4444'; ctx.font = '700 10px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('⚡ CRASH HERE', logX + logW / 2, logY + 30 + 7 * rowH + 14);
  }
  ctx.textAlign = 'left';
}

/* ── ARIES reference tab ───────────────────────────────────────────────────── */
function renderARIESTab(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-family:system-ui;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="margin:0 0 16px;color:#E2E8F0;font-size:15px">ARIES: Algorithm for Recovery and Isolation Exploiting Semantics</h3>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px">
    ${[
      { pass:'Pass 1: Analysis', color:'#F59E0B', items:['Scan WAL forward from last checkpoint','Identify all active transactions at crash time','Classify each as Winner (committed) or Loser (not committed)','Determine minimum redo LSN (RedoLSN)'] },
      { pass:'Pass 2: Redo', color:'#06B6D4', items:['Scan WAL forward from RedoLSN','Re-apply EVERY operation (winners and losers)','Restores database to exact pre-crash disk state','Ensures all committed changes are durable'] },
      { pass:'Pass 3: Undo', color:'#A78BFA', items:['Scan WAL backward','Roll back each loser transaction','Writes CLR (Compensation Log Record) for each undo','Ensures atomicity — partial transactions removed'] },
    ].map(p => `
      <div style="background:#0F172A;border:1px solid #1E293B;border-radius:6px;padding:14px">
        <div style="color:${p.color};font-weight:700;font-size:12px;margin-bottom:10px">${p.pass}</div>
        <ul style="margin:0;padding-left:16px;font-size:11.5px">
          ${p.items.map(i => `<li style="margin-bottom:4px">${i}</li>`).join('')}
        </ul>
      </div>`).join('')}
  </div>

  <h3 style="margin:0 0 12px;color:#E2E8F0;font-size:15px">Key ARIES Principles</h3>
  <ul style="margin:0;padding-left:20px;margin-bottom:16px">
    <li style="margin-bottom:8px"><strong>Write-Ahead Logging:</strong> The log record for a data change must reach disk BEFORE the changed page. This guarantees redo can reconstruct any change.</li>
    <li style="margin-bottom:8px"><strong>Force-at-Commit:</strong> All log records for a transaction must be flushed to disk before COMMIT returns to the client. PostgreSQL does this via <code style="color:#A78BFA">fsync()</code> after writing the COMMIT record.</li>
    <li style="margin-bottom:8px"><strong>No Force / Steal:</strong> Dirty pages can be written before commit (steal), and clean pages don't need to be written at commit (no-force). This gives maximum flexibility — undo handles stolen pages, redo handles no-force pages.</li>
  </ul>

  <h3 style="margin:0 0 12px;color:#E2E8F0;font-size:15px">PostgreSQL-Specific Recovery</h3>
  <pre style="background:#0F172A;border:1px solid #1E293B;border-radius:6px;padding:12px;font-size:11px;color:#94A3B8;overflow-x:auto">
Recovery sequence after a crash:
  1. Read pg_control → find lastCheckpointRecord
  2. Analysis: scan WAL from lastCheckpointRecord → find all in-flight transactions
  3. Redo: replay WAL from checkpointRedo → apply all changes
  4. Undo: roll back uncommitted transactions using pg_undo logs
  5. Write new checkpoint
  6. Remove recovery.signal file → accept connections
</pre>
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'Why does ARIES redo UNCOMMITTED changes during the Redo pass, only to undo them in the Undo pass?',
      a: `This "Redo-everything, Undo-losers" approach is necessary because PostgreSQL uses a <strong>No-Force</strong> policy: dirty buffer pages can be evicted to disk at any time, even before commit. This means an uncommitted transaction's page updates may have already reached disk before the crash. If the Redo pass skipped uncommitted operations, the database could end up in an inconsistent state where some of a loser's changes are on disk and others aren't.<br><br>
By redoing EVERYTHING to reconstruct the exact pre-crash state, then undoing losers, ARIES guarantees a consistent starting point. The cost is doing some work twice, but the alternative — tracking which pages had been flushed — would require much more complex bookkeeping. The Undo pass writes <strong>Compensation Log Records (CLRs)</strong> as it undoes, so if the system crashes again during recovery, the Undo pass can resume without re-undoing already-undone changes.`,
    },
    {
      q: 'What is the difference between "Steal" and "Force" buffer policies and why does PostgreSQL use Steal/No-Force?',
      a: `<strong>Steal</strong>: dirty (uncommitted) pages can be evicted from the buffer pool to disk before the transaction commits. PostgreSQL uses Steal — otherwise the buffer pool could fill with pages from a long-running transaction and halt.<br><br>
<strong>Force</strong>: all dirty pages for a transaction must be written to disk at commit time. PostgreSQL uses <strong>No-Force</strong> — the commit record is written to the WAL and fsync'd, but dirty data pages don't need to be immediately flushed. The WAL provides durability; dirty pages are eventually written by the background writer or checkpointer.<br><br>
Steal/No-Force is the most flexible combination: it allows maximum buffer management freedom at the cost of requiring both Undo (to reverse stolen uncommitted pages) and Redo (to replay committed changes that hadn't been forced to disk). This is why ARIES needs all three passes.`,
    },
    {
      q: 'What happens to a Prime Day database during recovery, and how do you minimize recovery time?',
      a: `During recovery, PostgreSQL is unavailable — it cannot accept connections until recovery completes. Recovery time is proportional to the distance between the last checkpoint and the crash: more WAL records to replay = longer recovery. On a Prime Day server with millions of writes per hour, a 10-minute crash could require replaying millions of WAL records before the database comes back online.<br><br>
Minimize recovery time by: (1) <strong>Setting <code>checkpoint_timeout</code> lower</strong> (e.g., 2–5 minutes instead of default 5) — checkpoints happen more frequently, so recovery starts closer to the crash; (2) <strong>Increasing <code>checkpoint_completion_target</code></strong> (default 0.9) to spread I/O — checkpoints complete faster; (3) <strong>Using streaming standby replicas</strong> — if the primary crashes, promote a warm standby that's already replayed most WAL. A physical replica can be promoted in seconds vs minutes of recovery on the primary.`,
    },
  ]);
}

export function mount(container) {
  const shell = createModuleShell(container, {
    tag: 'Recovery',
    title: 'Crash Recovery — ARIES Algorithm',
    subtitle: 'How PostgreSQL recovers from a crash using three WAL passes: Analysis, Redo, and Undo',
    tabs: [
      { id:'anim',  label:'Recovery Animation' },
      { id:'aries', label:'ARIES Reference' },
      { id:'iq',    label:'Interview Q&A' },
    ],
  });
  const { tabs, body } = shell;
  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:340px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);
      const steps = CRASH_STEPS.map((s, i) => ({ label:`Step ${i+1}`, duration:2800, mutate: st => { st.stepIdx = i; } }));
      const engine = new SimulationEngine({
        initialState: { stepIdx:0 },
        steps,
        onRender: (state, cnv) => {
          const ctx = cnv.getContext('2d'), pr = window.devicePixelRatio||1;
          cnv.width = cnv.clientWidth*pr; cnv.height = cnv.clientHeight*pr;
          ctx.scale(pr,pr);
          drawCrashRecovery(ctx, state.stepIdx, cnv.clientWidth, cnv.clientHeight);
        },
      });
      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));
      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);
      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = CRASH_STEPS[i].desc; });
      desc.textContent = CRASH_STEPS[0].desc;
      return () => engine.destroy();
    },
    aries: renderARIESTab,
    iq:    renderIQ,
  });
  return null;
}
