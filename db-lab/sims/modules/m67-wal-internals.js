import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

/* ── Data ────────────────────────────────────────────────────────────────────*/
const WAL_STEPS = [
  {
    phase: 'write',
    lsn: '0/1000010',
    records: [],
    desc: 'WAL (Write-Ahead Log) is PostgreSQL\'s durability mechanism. Before any change is written to heap pages, a WAL record is first written to the WAL buffer in memory. On disk, WAL is split into 16MB segment files (by default) named by their starting LSN.',
  },
  {
    phase: 'write',
    lsn: '0/1000040',
    records: [
      { lsn:'0/1000010', type:'HEAP INSERT', rel:'orders', xid:5001, size:78 },
    ],
    desc: 'T1 INSERT: transaction 5001 modifies the orders heap page. BEFORE touching the heap buffer, PostgreSQL writes a WAL record: HEAP INSERT at LSN 0/1000010. The WAL record contains: XID, relation OID, block number, offset, and the full tuple.',
  },
  {
    phase: 'write',
    lsn: '0/1000090',
    records: [
      { lsn:'0/1000010', type:'HEAP INSERT', rel:'orders', xid:5001, size:78 },
      { lsn:'0/1000040', type:'BTREE INSERT', rel:'orders_pkey', xid:5001, size:42 },
    ],
    desc: 'Index update also gets a WAL record. Inserting into an order also updates the B-Tree index (orders_pkey). Each index page modification generates its own WAL record, giving the full picture for redo replay.',
  },
  {
    phase: 'commit',
    lsn: '0/1000090',
    records: [
      { lsn:'0/1000010', type:'HEAP INSERT', rel:'orders', xid:5001, size:78 },
      { lsn:'0/1000040', type:'BTREE INSERT', rel:'orders_pkey', xid:5001, size:42 },
      { lsn:'0/1000080', type:'COMMIT', rel:'—', xid:5001, size:22 },
    ],
    desc: 'COMMIT: transaction 5001 writes a COMMIT WAL record. PostgreSQL calls fsync (or uses group commit) to flush WAL buffer to disk. Only after the COMMIT record is durable does PostgreSQL tell the client "COMMIT successful." This is the WAL guarantee: committed data survives crash.',
  },
  {
    phase: 'fsync',
    lsn: '0/1000090',
    records: [
      { lsn:'0/1000010', type:'HEAP INSERT', rel:'orders', xid:5001, size:78 },
      { lsn:'0/1000040', type:'BTREE INSERT', rel:'orders_pkey', xid:5001, size:42 },
      { lsn:'0/1000080', type:'COMMIT', rel:'—', xid:5001, size:22 },
    ],
    desc: 'WAL is flushed to disk (fsync). Heap pages may still be dirty in shared_buffers — that\'s OK! On crash, the dirty heap is recovered by replaying the WAL from the last checkpoint LSN through the COMMIT record. The heap change is a "lazy" write; the WAL is the authoritative record.',
  },
  {
    phase: 'replay',
    lsn: '0/1000090',
    records: [
      { lsn:'0/1000010', type:'HEAP INSERT', rel:'orders', xid:5001, size:78, replayed:true },
      { lsn:'0/1000040', type:'BTREE INSERT', rel:'orders_pkey', xid:5001, size:42, replayed:true },
      { lsn:'0/1000080', type:'COMMIT', rel:'—', xid:5001, size:22, replayed:true },
    ],
    desc: 'CRASH RECOVERY (redo pass): after a crash, PostgreSQL replays every WAL record from the checkpoint LSN forward. Each HEAP INSERT record is re-applied to the heap page. Each BTREE INSERT rebuilds the index entry. After reaching the last COMMIT, the transaction is durable.',
  },
];

/* ── Canvas ──────────────────────────────────────────────────────────────────*/
function drawWAL(ctx, stepIdx, w, h) {
  const step = WAL_STEPS[stepIdx];
  ctx.clearRect(0, 0, w, h);

  const leftW = w * 0.55;

  // ── WAL buffer / disk ──
  const wbY = 20, wbH = 34;
  const wbColor = step.phase === 'commit' ? '#F59E0B' : (step.phase === 'fsync' || step.phase === 'replay' ? '#10B981' : '#4F46E5');
  ctx.fillStyle = wbColor + '22'; ctx.strokeStyle = wbColor; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(16, wbY, leftW - 32, wbH, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = wbColor; ctx.font = '700 9px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(step.phase === 'replay' ? 'WAL Segment (on disk — redo)' : step.phase === 'fsync' ? 'WAL Segment (flushed to disk)' : 'WAL Buffer (in memory)', leftW / 2, wbY + 14);
  ctx.fillStyle = '#64748B'; ctx.font = '8px monospace';
  ctx.fillText(`Current LSN: ${step.lsn}`, leftW / 2, wbY + 28);

  // WAL records
  step.records.forEach((r, i) => {
    const ry = wbY + wbH + 10 + i * 38;
    const rc = r.type === 'COMMIT' ? '#10B981' : (r.type.startsWith('HEAP') ? '#4F46E5' : '#F59E0B');
    const isReplayed = r.replayed;
    ctx.fillStyle = (isReplayed ? rc : rc) + '22';
    ctx.strokeStyle = isReplayed ? '#10B981' : rc;
    ctx.lineWidth = isReplayed ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(16, ry, leftW - 32, 30, 4); ctx.fill(); ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = rc; ctx.font = '700 8px system-ui';
    ctx.fillText(`LSN ${r.lsn}`, 24, ry + 12);
    ctx.fillStyle = '#94A3B8'; ctx.font = '8px system-ui';
    ctx.fillText(`${r.type}  rel:${r.rel}  xid:${r.xid}  ${r.size}B`, 24, ry + 24);

    if (isReplayed) {
      ctx.fillStyle = '#10B981'; ctx.font = '700 8px system-ui'; ctx.textAlign = 'right';
      ctx.fillText('✓ REPLAYED', leftW - 24, ry + 20);
    }
  });

  // ── Right panel: heap pages + shared_buffers ──
  const rx = leftW + 10, rw = w - rx - 10;
  const pgY = 20;

  // Shared buffers box
  ctx.fillStyle = '#0F172A'; ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(rx, pgY, rw, 130, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#475569'; ctx.font = '700 8px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('shared_buffers', rx + rw / 2, pgY + 14);

  // Heap page
  const heapColor = step.phase === 'write' && step.records.some(r => r.type.startsWith('HEAP'))
    ? '#4F46E5' : (step.phase === 'replay' ? '#10B981' : '#334155');
  ctx.fillStyle = heapColor + '22'; ctx.strokeStyle = heapColor; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(rx + 8, pgY + 22, rw - 16, 40, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = heapColor; ctx.font = '700 8px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('orders (heap)', rx + rw / 2, pgY + 36);
  const heapLabel = step.phase === 'write' && step.records.length > 0 ? 'DIRTY (unflushed)' : step.phase === 'replay' ? 'RESTORED' : 'CLEAN';
  ctx.fillStyle = '#64748B'; ctx.font = '7.5px system-ui';
  ctx.fillText(heapLabel, rx + rw / 2, pgY + 52);

  // Index page
  const idxColor = step.phase === 'write' && step.records.some(r => r.type.startsWith('BTREE'))
    ? '#F59E0B' : (step.phase === 'replay' ? '#10B981' : '#334155');
  ctx.fillStyle = idxColor + '22'; ctx.strokeStyle = idxColor; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(rx + 8, pgY + 70, rw - 16, 40, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = idxColor; ctx.font = '700 8px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('orders_pkey (B-Tree)', rx + rw / 2, pgY + 84);
  ctx.fillStyle = '#64748B'; ctx.font = '7.5px system-ui';
  ctx.fillText(step.phase === 'replay' ? 'RESTORED' : step.records.some(r => r.type.startsWith('BTREE')) ? 'DIRTY' : '—', rx + rw / 2, pgY + 100);

  // fsync arrow
  if (step.phase === 'fsync' || step.phase === 'replay') {
    const arrowY = pgY + 145;
    ctx.strokeStyle = '#10B981'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(leftW / 2, wbY + wbH);
    ctx.quadraticCurveTo(leftW / 2, arrowY, rx + rw / 2, arrowY);
    ctx.stroke();
    ctx.fillStyle = '#10B981'; ctx.font = '700 8px system-ui';
    ctx.fillText(step.phase === 'replay' ? 'REDO replay' : 'fsync to disk ✓', rx + rw / 2, arrowY + 12);
  }

  // Phase badge
  const phaseLabels = { write:'WRITE', commit:'COMMIT', fsync:'FSYNC', replay:'RECOVERY' };
  const phaseColors = { write:'#4F46E5', commit:'#F59E0B', fsync:'#10B981', replay:'#06B6D4' };
  const pc = phaseColors[step.phase];
  ctx.fillStyle = '#0F172A'; ctx.strokeStyle = pc; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(rx, h - 32, rw, 22, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = pc; ctx.font = '700 9px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(phaseLabels[step.phase], rx + rw / 2, h - 18);
  ctx.textAlign = 'left';
}

/* ── WAL levels tab ──────────────────────────────────────────────────────────*/
function renderLevelsTab(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-family:system-ui;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="margin:0 0 14px;color:#E2E8F0;font-size:15px">wal_level Settings</h3>
  <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:20px">
    <thead><tr style="background:#0F172A"><th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Level</th><th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">What it includes</th><th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Use case</th></tr></thead>
    <tbody>
      ${[
        ['minimal','Only enough to recover from a crash. No replication possible.','Standalone server, max write speed'],
        ['replica (default)','+ data needed for streaming replication and base backups.','Primary with standbys — the standard choice'],
        ['logical','+ data for logical decoding (CDC, pglogical, publication/subscription)','Logical replication, Debezium CDC, Kafka connect'],
      ].map(([l,w,u]) => `<tr style="border-bottom:1px solid #0F172A">
        <td style="padding:7px 10px;color:#F59E0B;font-family:monospace">${l}</td>
        <td style="padding:7px 10px;font-size:11.5px">${w}</td>
        <td style="padding:7px 10px;font-size:11.5px">${u}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <h3 style="margin:0 0 12px;color:#E2E8F0;font-size:15px">synchronous_commit Modes</h3>
  <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:20px">
    <thead><tr style="background:#0F172A"><th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Mode</th><th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Durability guarantee</th><th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Latency</th></tr></thead>
    <tbody>
      ${[
        ['off','Transaction commits before WAL flush. Up to ~wal_writer_delay (200ms) of data loss on crash.','Lowest — async'],
        ['local','WAL flushed on primary before returning to client. No replica guarantee.','Low — local fsync only'],
        ['remote_write','Replica received WAL (but not necessarily fsynced).','Medium — 1 network RTT'],
        ['on (default)','Replica fsynced WAL before primary returns.','Higher — 1 network RTT + fsync'],
        ['remote_apply','Replica applied the transaction (visible to reads on replica).','Highest — includes apply time'],
      ].map(([m,d,l]) => `<tr style="border-bottom:1px solid #0F172A">
        <td style="padding:7px 10px;color:#4F46E5;font-family:monospace;font-size:11px">${m}</td>
        <td style="padding:7px 10px;font-size:11px">${d}</td>
        <td style="padding:7px 10px;color:#F59E0B;font-size:11px">${l}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <div style="background:#071C10;border:1px solid #065F46;border-radius:6px;padding:14px;font-size:12px">
    <strong style="color:#10B981">Prime Day WAL strategy:</strong> Use <code>synchronous_commit=local</code> for OLTP order writes (durability without cross-region latency). Use <code>synchronous_commit=remote_apply</code> only for financial settlement writes where replica-visible consistency is required. Use <code>wal_level=logical</code> if CDC to Kafka is needed for real-time analytics.
  </div>
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'Why does WAL guarantee durability even when heap pages haven\'t been flushed to disk at commit time?',
      a: `This is the fundamental WAL contract, also called "steal/no-force" buffer management: (1) <strong>Steal</strong> — dirty (uncommitted) pages CAN be written to disk before the transaction commits (to free buffer pool space). (2) <strong>No-force</strong> — dirty pages do NOT have to be written to disk at commit time.<br><br>
The guarantee works because: before any heap or index page is modified in shared_buffers, its WAL record is written to the WAL buffer. Before the commit record is acknowledged to the client, the WAL buffer is flushed to disk (fsync). Now: if the server crashes after the client receives "COMMIT OK", the COMMIT record is durably on disk. On recovery, PostgreSQL reads WAL from the last checkpoint and re-applies every change — heap modifications, index updates — to their respective pages. The heap pages don't need to have been flushed because WAL contains enough information to reconstruct any page from scratch.`,
    },
    {
      q: 'What is group commit in PostgreSQL, and when does it matter?',
      a: `At commit time, PostgreSQL must call fsync to flush WAL to disk. A single fsync takes 1–10ms on spinning disks, 0.1–0.5ms on NVMe. Under high concurrency (100 commits/second), individual fsyncs would cap throughput at 100–1000 TPS — one fsync per transaction.<br><br>
Group commit (controlled by <code>commit_delay</code> and <code>commit_siblings</code> GUCs, or automatically via the WAL writer process) allows PostgreSQL to batch multiple transactions' WAL records into a single fsync. If <code>commit_delay=100μs</code> and <code>commit_siblings=5</code>: when a transaction is ready to commit, it waits up to 100μs to see if 5 other transactions also become ready. If they do, one fsync covers all of them — dramatically improving TPS on I/O-bound workloads.<br><br>
In practice, PostgreSQL's WAL writer process automatically batches commits that arrive within its wakeup interval (200ms by default, controlled by <code>wal_writer_delay</code>). Group commit matters most when fsync latency dominates — i.e., on rotating disks or cloud storage with high per-operation latency.`,
    },
    {
      q: 'How does logical replication differ from streaming replication at the WAL level?',
      a: `<strong>Streaming replication</strong> (physical) ships raw WAL bytes — the exact byte-level changes to database pages — to the replica. The replica is a bit-for-bit clone of the primary at a slightly older LSN. It can only be used as a hot standby (read queries) or a failover candidate. You cannot selectively replicate one table; you cannot replicate to a different PostgreSQL major version.<br><br>
<strong>Logical replication</strong> decodes WAL records into row-level changes (INSERT/UPDATE/DELETE with old and new values) using the logical decoding plugin framework. Instead of raw page bytes, it sends structured events. This enables: (1) selective replication of specific tables (publications/subscriptions); (2) replication to a different PostgreSQL version or even a non-PostgreSQL database (via Debezium/Kafka Connect reading the logical replication slot); (3) bi-directional replication (each side publishes to the other); (4) CDC pipelines to data warehouses.<br><br>
The cost: logical replication requires <code>wal_level=logical</code>, which writes more data to WAL (old values for UPDATEs/DELETEs), and decoding is CPU-intensive. Slots also hold back WAL cleanup — an abandoned replication slot can cause WAL disk exhaustion.`,
    },
  ]);
}

export function mount(container) {
  const shell = createModuleShell(container, {
    tag: 'Storage',
    title: 'WAL Internals',
    subtitle: 'LSN layout, WAL records per operation, group commit, wal_level, and how WAL enables both durability and replication',
    tabs: [
      { id:'anim',   label:'WAL Write Path' },
      { id:'levels', label:'WAL Levels' },
      { id:'iq',     label:'Interview Q&A' },
    ],
  });
  const { tabs, body } = shell;
  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:340px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);
      const steps = WAL_STEPS.map((s, i) => ({ label: `Step ${i + 1}`, duration: 2800, mutate: st => { st.stepIdx = i; } }));
      const engine = new SimulationEngine({
        initialState: { stepIdx: 0 }, steps,
        onRender: (state, cnv) => {
          const ctx = cnv.getContext('2d'), pr = window.devicePixelRatio || 1;
          cnv.width = cnv.clientWidth * pr; cnv.height = cnv.clientHeight * pr; ctx.scale(pr, pr);
          drawWAL(ctx, state.stepIdx, cnv.clientWidth, cnv.clientHeight);
        },
      });
      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));
      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);
      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = WAL_STEPS[i].desc; });
      desc.textContent = WAL_STEPS[0].desc;
      return () => engine.destroy();
    },
    levels: renderLevelsTab,
    iq:     renderIQ,
  });
  return null;
}
