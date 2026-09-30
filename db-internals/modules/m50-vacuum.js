import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

/* ── Step data ─────────────────────────────────────────────────────────────── */
// Each tuple: { tid, xmin, xmax, data, dead, vacuumed, isNew }
const VACUUM_STEPS = [
  {
    tuples: [
      { tid:'(7,1)', xmin:10, xmax:null, data:'order_id=101  status=placed',    dead:false, vacuumed:false },
      { tid:'(7,2)', xmin:12, xmax:null, data:'order_id=102  status=placed',    dead:false, vacuumed:false },
      { tid:'(7,3)', xmin:14, xmax:null, data:'order_id=103  status=placed',    dead:false, vacuumed:false },
      { tid:'(7,4)', xmin:16, xmax:null, data:'order_id=104  status=placed',    dead:false, vacuumed:false },
      { tid:'(7,5)', xmin:18, xmax:null, data:'order_id=105  status=placed',    dead:false, vacuumed:false },
    ],
    deadCount: 0, liveCount: 5, phase: 'init', scanAt: -1,
    desc: 'Heap page 7 holds 5 live rows — all orders in "placed" status. The page is full. As updates and deletes occur, dead tuples will accumulate here.',
  },
  {
    tuples: [
      { tid:'(7,1)', xmin:10, xmax:null, data:'order_id=101  status=placed',    dead:false, vacuumed:false },
      { tid:'(7,2)', xmin:12, xmax:100,  data:'order_id=102  status=placed',    dead:true,  vacuumed:false },
      { tid:'(7,3)', xmin:14, xmax:null, data:'order_id=103  status=placed',    dead:false, vacuumed:false },
      { tid:'(7,4)', xmin:16, xmax:null, data:'order_id=104  status=placed',    dead:false, vacuumed:false },
      { tid:'(7,5)', xmin:18, xmax:null, data:'order_id=105  status=placed',    dead:false, vacuumed:false },
      { tid:'(7,6)', xmin:100,xmax:null, data:'order_id=102  status=shipped',   dead:false, vacuumed:false, isNew:true },
    ],
    deadCount: 1, liveCount: 5, phase: 'update', scanAt: -1,
    desc: 'T100 UPDATEs order 102 to "shipped". Old version (7,2) is stamped xmax=100, new version (7,6) inserted with xmin=100. The page now has 1 dead tuple consuming 8 KB of space.',
  },
  {
    tuples: [
      { tid:'(7,1)', xmin:10, xmax:null, data:'order_id=101  status=placed',    dead:false, vacuumed:false },
      { tid:'(7,2)', xmin:12, xmax:100,  data:'order_id=102  status=placed',    dead:true,  vacuumed:false },
      { tid:'(7,3)', xmin:14, xmax:105,  data:'order_id=103  status=placed',    dead:true,  vacuumed:false },
      { tid:'(7,4)', xmin:16, xmax:null, data:'order_id=104  status=placed',    dead:false, vacuumed:false },
      { tid:'(7,5)', xmin:18, xmax:null, data:'order_id=105  status=placed',    dead:false, vacuumed:false },
      { tid:'(7,6)', xmin:100,xmax:null, data:'order_id=102  status=shipped',   dead:false, vacuumed:false, isNew:true },
      { tid:'(7,7)', xmin:105,xmax:null, data:'order_id=103  status=shipped',   dead:false, vacuumed:false, isNew:true },
    ],
    deadCount: 2, liveCount: 5, phase: 'update', scanAt: -1,
    desc: 'T105 UPDATEs order 103 to "shipped". Another dead tuple (7,3). Page has 2 dead tuples. Any new INSERT will fail — page is full. PostgreSQL must extend the table to a new page.',
  },
  {
    tuples: [
      { tid:'(7,1)', xmin:10, xmax:null, data:'order_id=101  status=placed',    dead:false, vacuumed:false },
      { tid:'(7,2)', xmin:12, xmax:100,  data:'order_id=102  status=placed',    dead:true,  vacuumed:false },
      { tid:'(7,3)', xmin:14, xmax:105,  data:'order_id=103  status=placed',    dead:true,  vacuumed:false },
      { tid:'(7,4)', xmin:16, xmax:110,  data:'order_id=104  status=placed',    dead:true,  vacuumed:false },
      { tid:'(7,5)', xmin:18, xmax:null, data:'order_id=105  status=placed',    dead:false, vacuumed:false },
      { tid:'(7,6)', xmin:100,xmax:null, data:'order_id=102  status=shipped',   dead:false, vacuumed:false, isNew:true },
      { tid:'(7,7)', xmin:105,xmax:null, data:'order_id=103  status=shipped',   dead:false, vacuumed:false, isNew:true },
      { tid:'(7,8)', xmin:110,xmax:null, data:'order_id=104  status=shipped',   dead:false, vacuumed:false, isNew:true },
    ],
    deadCount: 3, liveCount: 5, phase: 'bloat', scanAt: -1,
    desc: 'T110 UPDATEs order 104. 3 dead tuples now. autovacuum threshold exceeded: n_dead_tup ≥ autovacuum_vacuum_threshold + autovacuum_vacuum_scale_factor × reltuples. autovacuum kicks in.',
  },
  {
    tuples: [
      { tid:'(7,1)', xmin:10, xmax:null, data:'order_id=101  status=placed',    dead:false, vacuumed:false },
      { tid:'(7,2)', xmin:12, xmax:100,  data:'order_id=102  status=placed',    dead:true,  vacuumed:false },
      { tid:'(7,3)', xmin:14, xmax:105,  data:'order_id=103  status=placed',    dead:true,  vacuumed:false },
      { tid:'(7,4)', xmin:16, xmax:110,  data:'order_id=104  status=placed',    dead:true,  vacuumed:false },
      { tid:'(7,5)', xmin:18, xmax:null, data:'order_id=105  status=placed',    dead:false, vacuumed:false },
      { tid:'(7,6)', xmin:100,xmax:null, data:'order_id=102  status=shipped',   dead:false, vacuumed:false },
      { tid:'(7,7)', xmin:105,xmax:null, data:'order_id=103  status=shipped',   dead:false, vacuumed:false },
      { tid:'(7,8)', xmin:110,xmax:null, data:'order_id=104  status=shipped',   dead:false, vacuumed:false },
    ],
    deadCount: 3, liveCount: 5, phase: 'scan', scanAt: 1,
    desc: 'VACUUM scans page 7 sequentially (no table lock needed — uses ShareUpdateExclusiveLock). It inspects each tuple header, checking whether xmax is a committed XID with no active readers.',
  },
  {
    tuples: [
      { tid:'(7,1)', xmin:10, xmax:null, data:'order_id=101  status=placed',    dead:false, vacuumed:false },
      { tid:'(7,2)', xmin:12, xmax:100,  data:'————————————————————',           dead:true,  vacuumed:true },
      { tid:'(7,3)', xmin:14, xmax:105,  data:'————————————————————',           dead:true,  vacuumed:true },
      { tid:'(7,4)', xmin:16, xmax:110,  data:'————————————————————',           dead:true,  vacuumed:true },
      { tid:'(7,5)', xmin:18, xmax:null, data:'order_id=105  status=placed',    dead:false, vacuumed:false },
      { tid:'(7,6)', xmin:100,xmax:null, data:'order_id=102  status=shipped',   dead:false, vacuumed:false },
      { tid:'(7,7)', xmin:105,xmax:null, data:'order_id=103  status=shipped',   dead:false, vacuumed:false },
      { tid:'(7,8)', xmin:110,xmax:null, data:'order_id=104  status=shipped',   dead:false, vacuumed:false },
    ],
    deadCount: 0, liveCount: 5, phase: 'reclaim', scanAt: -1,
    desc: 'VACUUM marks all 3 dead slots as free in the page header\'s line pointer array and updates the Free Space Map (FSM). The page can now reuse this space for future INSERTs — no file shrink occurs.',
  },
  {
    tuples: [
      { tid:'(7,1)', xmin:10, xmax:null, data:'order_id=101  status=placed',    dead:false, vacuumed:false },
      { tid:'(7,5)', xmin:18, xmax:null, data:'order_id=105  status=placed',    dead:false, vacuumed:false },
      { tid:'(7,6)', xmin:100,xmax:null, data:'order_id=102  status=shipped',   dead:false, vacuumed:false },
      { tid:'(7,7)', xmin:105,xmax:null, data:'order_id=103  status=shipped',   dead:false, vacuumed:false },
      { tid:'(7,8)', xmin:110,xmax:null, data:'order_id=104  status=shipped',   dead:false, vacuumed:false },
    ],
    deadCount: 0, liveCount: 5, phase: 'done', scanAt: -1,
    desc: 'After VACUUM: 5 live tuples remain, 3 slots freed. Indexes pointing to dead heap tuples are also cleaned (index vacuum pass). VACUUM FULL would compact the file but requires AccessExclusiveLock — avoid on Prime Day.',
  },
];

/* ── Canvas renderer ───────────────────────────────────────────────────────── */
function drawVacuum(ctx, stepIdx, w, h) {
  const step = VACUUM_STEPS[stepIdx];
  ctx.clearRect(0, 0, w, h);

  const tuples = step.tuples;
  const rowH   = 38;
  const pageX  = 16, pageY = 44;
  const pageW  = w - 32;
  const pageH  = tuples.length * rowH + 34;

  // ── Stats bar ──
  ctx.fillStyle = '#1E293B'; ctx.font = '10px system-ui'; ctx.textAlign = 'left';
  const statsY = 22;
  const deadPct = step.deadCount / (step.deadCount + step.liveCount) * 100;
  ctx.fillStyle = '#64748B'; ctx.fillText(`Live: ${step.liveCount}`, pageX, statsY);
  ctx.fillStyle = '#EF4444'; ctx.fillText(`Dead: ${step.deadCount}`, pageX + 65, statsY);
  ctx.fillStyle = '#F59E0B'; ctx.fillText(`Bloat: ${deadPct.toFixed(0)}%`, pageX + 130, statsY);
  if (step.phase === 'scan') {
    ctx.fillStyle = '#06B6D4'; ctx.font = '700 10px system-ui';
    ctx.fillText('VACUUM SCAN IN PROGRESS', pageX + 240, statsY);
  } else if (step.phase === 'reclaim' || step.phase === 'done') {
    ctx.fillStyle = '#10B981'; ctx.font = '700 10px system-ui';
    ctx.fillText('VACUUM COMPLETE', pageX + 240, statsY);
  }

  // ── Page box ──
  ctx.fillStyle = '#0F172A'; ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.roundRect(pageX, pageY, pageW, pageH, 6); ctx.fill(); ctx.stroke();

  ctx.fillStyle = '#475569'; ctx.font = '700 10px system-ui'; ctx.textAlign = 'left';
  ctx.fillText('HEAP PAGE 7  (8 KB)', pageX + 12, pageY + 18);

  // column X positions
  const C0 = pageX + 12, C1 = C0 + 72, C2 = C1 + 68, C3 = C2 + 68;

  // header
  const hY = pageY + 32;
  ctx.fillStyle = '#334155'; ctx.font = '700 9px system-ui';
  ['TID', 'xmin', 'xmax', 'DATA'].forEach((h, i) => {
    ctx.fillText(h, [C0, C1, C2, C3][i], hY);
  });

  tuples.forEach((t, i) => {
    const ry = pageY + 36 + i * rowH;
    const isScanned = step.scanAt >= 0 && i <= step.scanAt;

    // row bg
    if (t.vacuumed) {
      ctx.fillStyle = '#071C10';
    } else if (t.dead) {
      ctx.fillStyle = '#1C0A0A';
    } else if (t.isNew) {
      ctx.fillStyle = '#0D0B1A';
    } else {
      ctx.fillStyle = i % 2 === 0 ? '#0A0F1A' : 'transparent';
    }
    ctx.fillRect(pageX + 2, ry + 2, pageW - 4, rowH - 4);

    // border
    if (t.vacuumed) {
      ctx.strokeStyle = '#10B981'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    } else if (t.dead) {
      ctx.strokeStyle = '#7F1D1D'; ctx.lineWidth = 1; ctx.setLineDash([]);
    } else if (t.isNew) {
      ctx.strokeStyle = '#A78BFA'; ctx.lineWidth = 1; ctx.setLineDash([3, 2]);
    } else {
      ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 0.5; ctx.setLineDash([]);
    }
    if (isScanned && step.phase === 'scan') {
      ctx.strokeStyle = '#06B6D4'; ctx.lineWidth = 1.5; ctx.setLineDash([]);
    }
    ctx.strokeRect(pageX + 2, ry + 2, pageW - 4, rowH - 4);
    ctx.setLineDash([]);

    const textY = ry + rowH / 2 + 4;
    ctx.globalAlpha = t.dead && !t.vacuumed ? 0.5 : t.vacuumed ? 0.35 : 1;

    ctx.fillStyle = '#94A3B8'; ctx.font = '700 10px monospace'; ctx.textAlign = 'left';
    ctx.fillText(t.tid, C0, textY);
    ctx.fillStyle = t.xmin >= 100 ? '#A78BFA' : '#64748B';
    ctx.fillText(String(t.xmin), C1, textY);
    ctx.fillStyle = t.xmax != null ? '#EF4444' : '#334155';
    ctx.fillText(t.xmax != null ? String(t.xmax) : 'null', C2, textY);
    ctx.fillStyle = t.vacuumed ? '#10B981' : t.dead ? '#7F1D1D' : '#CBD5E1';
    ctx.font = '10px monospace';
    ctx.fillText(t.data, C3, textY);
    ctx.globalAlpha = 1;

    // strikethrough for dead tuples
    if (t.dead && !t.vacuumed) {
      ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 1; ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(pageX + 4, ry + rowH / 2);
      ctx.lineTo(pageX + pageW - 4, ry + rowH / 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // "FREE" badge for vacuumed slots
    if (t.vacuumed) {
      ctx.fillStyle = '#10B981'; ctx.font = '700 9px system-ui';
      ctx.textAlign = 'right';
      ctx.fillText('FREE SLOT', pageX + pageW - 8, textY);
      ctx.textAlign = 'left';
    }
  });

  // VACUUM cursor
  if (step.scanAt >= 0) {
    const cursorY = pageY + 36 + step.scanAt * rowH + rowH / 2;
    ctx.fillStyle = '#06B6D4'; ctx.font = '700 10px system-ui'; ctx.textAlign = 'right';
    ctx.fillText('▶ VACUUM', pageX + pageW - 4, cursorY + 4);
    ctx.textAlign = 'left';
  }

  // FSM indicator at bottom
  if (step.phase === 'reclaim' || step.phase === 'done') {
    const fsmY = pageY + pageH + 16;
    ctx.fillStyle = '#071C10'; ctx.strokeStyle = '#065F46'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(pageX, fsmY, pageW, 32, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#10B981'; ctx.font = '700 10px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(`FSM updated — page 7 has ${step.phase === 'done' ? '3' : '3'} free slots available for new inserts`, pageX + 12, fsmY + 20);
  }
  ctx.textAlign = 'left';
}

/* ── Autovacuum config tab ─────────────────────────────────────────────────── */
function renderConfigTab(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-family:system-ui;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="margin:0 0 16px;color:#E2E8F0;font-size:15px">autovacuum Trigger Formula</h3>
  <div style="background:#0F172A;border:1px solid #1E293B;border-radius:6px;padding:14px;font-family:monospace;font-size:12px;color:#A78BFA;margin-bottom:20px">
    n_dead_tup  ≥  autovacuum_vacuum_threshold  +  autovacuum_vacuum_scale_factor × reltuples<br>
    <span style="color:#64748B">default: 50  +  0.20 × table_rows</span>
  </div>
  <p style="margin:0 0 12px">For a 10M-row orders table, autovacuum fires after 2,000,050 dead tuples — that's a lot of bloat. During Prime Day, set <code style="color:#A78BFA">autovacuum_vacuum_scale_factor = 0.01</code> on high-churn tables to trigger after just 1%.</p>

  <h3 style="margin:16px 0 12px;color:#E2E8F0;font-size:15px">Key autovacuum Parameters</h3>
  <table style="width:100%;border-collapse:collapse;font-size:11.5px;margin-bottom:24px">
    <thead><tr style="background:#0F172A">
      <th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Parameter</th>
      <th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Default</th>
      <th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Effect</th>
    </tr></thead>
    <tbody>
      ${[
        ['autovacuum_vacuum_scale_factor','0.20','Fraction of table rows that must be dead before vacuum triggers'],
        ['autovacuum_vacuum_threshold','50','Minimum dead rows regardless of table size'],
        ['autovacuum_vacuum_cost_delay','2ms','Sleep time between work units — throttles I/O impact'],
        ['autovacuum_vacuum_cost_limit','200','Work units before triggering cost_delay — higher = faster vacuum'],
        ['autovacuum_max_workers','3','Parallel autovacuum workers across all tables'],
        ['autovacuum_freeze_max_age','200M','Force vacuum to freeze tuples before XID wraparound (32-bit limit ~4B)'],
      ].map(([p,d,e]) => `
        <tr style="border-bottom:1px solid #0F172A">
          <td style="padding:7px 10px;color:#F59E0B;font-family:monospace;font-size:10px">${p}</td>
          <td style="padding:7px 10px;color:#64748B">${d}</td>
          <td style="padding:7px 10px">${e}</td>
        </tr>`).join('')}
    </tbody>
  </table>

  <h3 style="margin:0 0 12px;color:#E2E8F0;font-size:15px">Transaction ID Wraparound — The Hidden Danger</h3>
  <div style="background:#1C0A0A;border:1px solid #7F1D1D;border-radius:6px;padding:14px;font-size:12px">
    PostgreSQL XIDs are 32-bit integers. After ~2.1 billion transactions, the XID counter wraps around. Old tuples would appear to be "in the future" — PostgreSQL deliberately shuts down with a PANIC rather than serve corrupt data. VACUUM prevents this by <strong>freezing</strong> old tuples: it stamps their xmin with a special FrozenTransactionId (XID=2) which is always considered older than any live snapshot. Monitor with <code style="color:#A78BFA">SELECT datname, age(datfrozenxid) FROM pg_database ORDER BY 2 DESC</code> — alert if age exceeds 1.5 billion.
  </div>
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'What is table bloat and how does VACUUM address it?',
      a: `Table bloat is wasted space inside heap pages occupied by dead tuples — row versions that are no longer visible to any transaction but haven't been physically removed. MVCC requires PostgreSQL to keep old versions until no snapshot can see them, so dead tuples accumulate naturally with any UPDATE or DELETE workload.<br><br>
Regular VACUUM (not VACUUM FULL) does an in-place cleanup: it marks dead tuple slots as reusable in the page's line pointer array and updates the Free Space Map so future INSERTs can reuse those slots. It does NOT shrink the physical file — the OS still sees the same file size. VACUUM FULL rewrites the entire table into a new file (compacting it), but requires AccessExclusiveLock — blocking all reads and writes — and should almost never be run on a live production table during business hours.`,
    },
    {
      q: 'How does autovacuum work and when does it fail to keep up?',
      a: `autovacuum is a background daemon that monitors pg_stat_user_tables for dead tuple counts and triggers VACUUM when the threshold is exceeded. It runs multiple workers (autovacuum_max_workers, default 3) and throttles its I/O impact using a cost-based delay mechanism (autovacuum_vacuum_cost_delay and _cost_limit). This throttling prevents autovacuum from impacting normal query performance.<br><br>
autovacuum fails to keep up when: (1) the DML rate exceeds what throttled autovacuum can process — raise autovacuum_vacuum_cost_limit or lower cost_delay for hot tables; (2) a long-running transaction holds an old snapshot — VACUUM cannot reclaim tuples visible to that snapshot regardless of their xmax; (3) autovacuum_vacuum_scale_factor is too high for large tables — it may trigger after millions of dead tuples accumulate. On Prime Day: proactively run <code>VACUUM ANALYZE orders</code> during off-peak hours, and monitor <code>pg_stat_user_tables.n_dead_tup</code>.`,
    },
    {
      q: 'What is the difference between VACUUM, VACUUM FULL, and VACUUM ANALYZE?',
      a: `<strong>VACUUM:</strong> Marks dead tuples as reusable, updates FSM, cleans indexes, freezes old XIDs. Runs concurrently with reads and writes (ShareUpdateExclusiveLock only). Does not shrink the file. Should run regularly via autovacuum.<br><br>
<strong>VACUUM FULL:</strong> Rewrites the entire table file to a new compact file. Reclaims disk space at the OS level. Requires AccessExclusiveLock — blocks all access for the duration. Only appropriate when bloat is severe and a maintenance window exists.<br><br>
<strong>VACUUM ANALYZE:</strong> Runs VACUUM then updates pg_statistic with current column statistics (row counts, value distributions, null fractions). The planner uses these statistics for cost estimation — stale stats cause bad query plans. Always run VACUUM ANALYZE after bulk loads, before an important Prime Day batch query, or after massive DELETE operations.`,
    },
  ]);
}

/* ── Mount ─────────────────────────────────────────────────────────────────── */
export function mount(container) {
  const shell = createModuleShell(container, {
    tag: 'Storage',
    title: 'VACUUM & Table Bloat',
    subtitle: 'How PostgreSQL reclaims dead tuple space and prevents transaction ID wraparound',
    tabs: [
      { id: 'anim',   label: 'VACUUM Animation' },
      { id: 'config', label: 'autovacuum Config' },
      { id: 'iq',     label: 'Interview Q&A' },
    ],
  });

  const { tabs, body } = shell;

  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:380px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);

      const steps = VACUUM_STEPS.map((s, i) => ({
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
          drawVacuum(ctx, state.stepIdx, cnv.clientWidth, cnv.clientHeight);
        },
      });

      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));

      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);

      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = VACUUM_STEPS[i].desc; });
      desc.textContent = VACUUM_STEPS[0].desc;

      return () => engine.destroy();
    },
    config: renderConfigTab,
    iq:     renderIQ,
  });

  return null;
}
