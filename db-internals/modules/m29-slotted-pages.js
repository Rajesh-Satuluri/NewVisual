import { createModuleShell, initTabs, createIQSection, initIQ, PRIME_SCHEMA } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

// Slotted page simulation: insert, delete, compact
// Page = 400 units tall. Slot array grows down from top, tuples pack up from bottom.
const PAGE_CAP = 400;

function makeSlotSteps() {
  const steps = [];
  let slots = [];    // { id, label, size, dead, offset }
  let bottom = PAGE_CAP; // tuples pack from bottom

  function snap(desc) {
    steps.push({ slots: JSON.parse(JSON.stringify(slots)), bottom, desc });
  }

  snap('Empty slotted page: slot array at top (grows ↓), free space in middle, tuple data at bottom (grows ↑). pd_lower = 24 (after header), pd_upper = 8192.');

  // Insert A
  const sA = 60; bottom -= sA;
  slots.push({ id: 0, label: 'Tuple A\norder #1001', size: sA, dead: false, offset: bottom });
  snap('INSERT order #1001: slot[0] added at pd_lower, tuple A written at pd_upper−60. pd_lower += 4, pd_upper −= 60. Free space shrinks by 64 bytes.');

  // Insert B
  const sB = 72; bottom -= sB;
  slots.push({ id: 1, label: 'Tuple B\norder #1002', size: sB, dead: false, offset: bottom });
  snap('INSERT order #1002: slot[1] added, tuple B at pd_upper−72. Note: B physically above A in the page (tuples pack upward from bottom).');

  // Insert C
  const sC = 56; bottom -= sC;
  slots.push({ id: 2, label: 'Tuple C\norder #1003', size: sC, dead: false, offset: bottom });
  snap('INSERT order #1003: slot[2] added, tuple C placed. Three rows, three slots. Free space = pd_upper − pd_lower.');

  // Insert D
  const sD = 48; bottom -= sD;
  slots.push({ id: 3, label: 'Tuple D\norder #1004', size: sD, dead: false, offset: bottom });
  snap('INSERT order #1004: slot[3] added. Page is roughly half-full. Each slot is a 4-byte ItemIdData (offset + length + flags).');

  // Delete B
  slots[1].dead = true;
  snap('DELETE order #1002: slot[1].flags = LP_DEAD. Tuple B data is NOT removed — the page still has it. Dead space counts against pd_upper but is not usable. pd_lower and pd_upper do NOT change.');

  // Try insert E (small, fits in free space at top)
  const sE = 44; bottom -= sE;
  slots.push({ id: 4, label: 'Tuple E\norder #1005', size: sE, dead: false, offset: bottom });
  snap('INSERT order #1005: slot[4] added at pd_lower, tuple E at new pd_upper. The dead tuple B still occupies its original space — insertion cannot reclaim it without compaction.');

  // VACUUM compact
  const liveSlots = slots.filter(s => !s.dead).map((s, i) => ({ ...s, id: i }));
  let newBottom = PAGE_CAP;
  liveSlots.forEach(s => { newBottom -= s.size; s.offset = newBottom; });
  slots = liveSlots;
  bottom = newBottom;
  snap('VACUUM (page compaction): dead tuple B removed. Live tuples A, C, D, E repacked from bottom — contiguous free space restored. pd_upper raised, pd_lower reduced by 1 slot. Free Space Map updated.');

  return steps;
}

const SLOT_STEPS = makeSlotSteps();
const SLOT_COLORS = ['#4F46E5', '#EF4444', '#10B981', '#F59E0B', '#06B6D4'];

function drawSlotted(ctx, stepIdx, w, h) {
  ctx.clearRect(0, 0, w, h);
  if (stepIdx < 0) {
    ctx.fillStyle = '#475569'; ctx.font = '13px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('Press Play to watch INSERT / DELETE / VACUUM on a slotted page', w/2, h/2);
    ctx.textAlign = 'left'; return;
  }

  const step = SLOT_STEPS[stepIdx];
  const pageX = 80, pageW = 280, pageH = h - 60, pageY = 20;
  const scale = pageH / 400;

  // Page outline
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.5;
  ctx.strokeRect(pageX, pageY, pageW, pageH);
  ctx.fillStyle = '#64748B'; ctx.font = '700 10px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('Slotted Page (8 KB)', pageX + pageW/2, pageY - 6);
  ctx.textAlign = 'left';

  // Page header (always shown)
  const headerH = 24 * scale;
  ctx.fillStyle = '#1E2D3D';
  ctx.fillRect(pageX + 1, pageY + 1, pageW - 2, headerH);
  ctx.strokeStyle = '#4F46E5' + '88'; ctx.lineWidth = 1;
  ctx.strokeRect(pageX + 1, pageY + 1, pageW - 2, headerH);
  ctx.fillStyle = '#818CF8'; ctx.font = '8px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('Page Header (24 B) — pd_lsn, pd_lower, pd_upper, pd_flags', pageX + pageW/2, pageY + headerH/2 + 3);
  ctx.textAlign = 'left';

  // Slot array (grows down from header)
  step.slots.forEach((s, i) => {
    const sy = pageY + headerH + i * (10 * scale);
    const sw = pageW - 2, sh = 9 * scale;
    const col = s.dead ? '#EF4444' : SLOT_COLORS[s.id % SLOT_COLORS.length];
    ctx.fillStyle = s.dead ? '#EF4444' + '22' : col + '33';
    ctx.strokeStyle = col + '88'; ctx.lineWidth = 1;
    ctx.fillRect(pageX + 1, sy, sw, sh);
    ctx.strokeRect(pageX + 1, sy, sw, sh);
    ctx.fillStyle = s.dead ? '#EF4444' : col;
    ctx.font = '7px monospace';
    ctx.fillText(`slot[${i}]: off=${s.offset} len=${s.size}${s.dead ? ' DEAD' : ''}`, pageX + 5, sy + sh/2 + 2);
  });

  // Free space
  const slotBottom = pageY + headerH + step.slots.length * 10 * scale;
  const tupleTop = pageY + step.bottom * scale;
  if (tupleTop > slotBottom + 4) {
    ctx.fillStyle = '#0F1A2A';
    ctx.fillRect(pageX + 1, slotBottom, pageW - 2, tupleTop - slotBottom);
    ctx.fillStyle = '#1E293B'; ctx.font = '9px system-ui'; ctx.textAlign = 'center';
    const freeH = tupleTop - slotBottom;
    if (freeH > 14) ctx.fillText('← free space →', pageX + pageW/2, slotBottom + freeH/2 + 3);
    ctx.textAlign = 'left';
  }

  // Tuples (packed from bottom)
  [...step.slots].reverse().forEach(s => {
    const ty = pageY + s.offset * scale;
    const th = s.size * scale;
    const col = s.dead ? '#EF4444' : SLOT_COLORS[s.id % SLOT_COLORS.length];
    ctx.fillStyle = s.dead ? '#EF4444' + '18' : col + '28';
    ctx.strokeStyle = s.dead ? '#EF4444' + '55' : col + '77';
    ctx.lineWidth = s.dead ? 1 : 1.5;
    ctx.fillRect(pageX + 1, ty, pageW - 2, th - 1);
    ctx.strokeRect(pageX + 1, ty, pageW - 2, th - 1);
    if (s.dead) {
      ctx.fillStyle = '#EF4444'; ctx.font = '7px monospace'; ctx.textAlign = 'center';
      ctx.fillText('DEAD (order #1002)', pageX + pageW/2, ty + th/2 + 3);
    } else {
      ctx.fillStyle = col; ctx.font = '700 8px system-ui'; ctx.textAlign = 'center';
      s.label.split('\n').forEach((l, li) => ctx.fillText(l, pageX + pageW/2, ty + th/2 + (li - 0.5) * 11));
    }
    ctx.textAlign = 'left';
  });

  // Detail panel
  const panelX = pageX + pageW + 30, panelW = w - panelX - 10;
  ctx.fillStyle = '#0F172A';
  ctx.beginPath(); ctx.roundRect(panelX, pageY, panelW, pageH, 6); ctx.fill();
  ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(panelX, pageY, panelW, pageH, 6); ctx.stroke();

  const liveCount = step.slots.filter(s => !s.dead).length;
  const deadCount = step.slots.filter(s => s.dead).length;
  const freeBytes = Math.round((step.bottom - 24 - step.slots.length * 10) * 8192 / 400);

  ctx.fillStyle = '#818CF8'; ctx.font = '700 10px system-ui';
  ctx.fillText(`Step ${stepIdx + 1} of ${SLOT_STEPS.length}`, panelX + 10, pageY + 18);
  ctx.fillStyle = '#94A3B8'; ctx.font = '9px system-ui';
  ctx.fillText(`Live tuples: ${liveCount}`, panelX + 10, pageY + 36);
  ctx.fillText(`Dead tuples: ${deadCount}`, panelX + 10, pageY + 50);
  ctx.fillText(`~Free space: ${freeBytes} B`, panelX + 10, pageY + 64);

  ctx.fillStyle = '#334155';
  ctx.fillRect(panelX + 10, pageY + 76, panelW - 20, 1);

  const words = step.desc.split(' ');
  let line = '', ly = pageY + 92, maxW = panelW - 20;
  ctx.fillStyle = '#64748B'; ctx.font = '9px system-ui';
  words.forEach(word => {
    const test = line + (line ? ' ' : '') + word;
    if (ctx.measureText(test).width > maxW) {
      ctx.fillText(line, panelX + 10, ly);
      line = word; ly += 13;
    } else line = test;
  });
  if (line) ctx.fillText(line, panelX + 10, ly);
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Storage Engine · M29',
    title: 'Slotted Pages',
    subtitle: 'Slot array + variable-length tuple packing — INSERT, DELETE, and VACUUM compaction inside a page.',
    tabs: [
      { id: 'slots',   label: '🗂️ Slot Animation' },
      { id: 'compact', label: '🧹 Compaction' },
      { id: 'iq',      label: '💼 Interview Q&A' },
    ],
  });
  initTabs(container);

  const slotsTab = container.querySelector('#tab-slots');
  slotsTab.innerHTML = `
    ${PRIME_SCHEMA}
    <div class="canvas-wrap" style="margin-top:12px">
      <canvas width="800" height="380" style="width:100%;max-height:380px"></canvas>
      <div class="canvas-controls"></div>
      <div class="sim-timeline"></div>
      <div class="canvas-explainer" id="slots-explainer">
        <h3>Slotted Page Layout</h3>
        <p>Slot array grows downward from the page header; tuple data grows upward from the page bottom.
           Free space sits between them. A DELETE marks a slot dead but does not compact immediately.
           Press <strong>Play</strong> to watch INSERT → DELETE → VACUUM.</p>
      </div>
    </div>
  `;

  const canvas = slotsTab.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  const engine = new SimulationEngine({
    initialState: { step: -1 },
    steps: SLOT_STEPS.map((s, i) => ({ label: `Step ${i+1}`, duration: 2000, mutate: st => { st.step = i; } })),
    onRender: state => {
      drawSlotted(ctx, state.step, 800, 380);
      const el = slotsTab.querySelector('#slots-explainer');
      if (el && state.step >= 0) { const s = SLOT_STEPS[state.step]; el.innerHTML = `<h3>Step ${state.step + 1}</h3><p>${s.desc}</p>`; }
    },
  });
  SimulationEngine.renderControls(slotsTab.querySelector('.canvas-wrap'), engine);
  SimulationEngine.renderTimeline(slotsTab.querySelector('.canvas-wrap'), engine);
  drawSlotted(ctx, -1, 800, 380);
  engine.reset();

  container.querySelector('#tab-compact').innerHTML = `
    <div class="scroll-content">
      <div class="section-header">
        <div class="section-title">VACUUM Compaction — Reclaiming Dead Tuple Space</div>
        <div class="section-desc">PostgreSQL MVCC never updates in place — VACUUM cleans up dead versions left by DELETE and UPDATE</div>
      </div>
      <div class="prose">
        <h3>What Causes Page Bloat</h3>
        <p>Every DELETE and UPDATE leaves dead tuples in the heap. The space is not reclaimed until VACUUM runs.
           At Amazon Prime Day rates (millions of order updates/hour), pages accumulate dead tuples rapidly.</p>
        <div class="code-block">
<span class="cmt">-- Monitor dead tuples per table:</span>
SELECT relname, n_live_tup, n_dead_tup,
       round(n_dead_tup::numeric / nullif(n_live_tup,0) * 100, 1) AS dead_pct,
       last_vacuum, last_autovacuum
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;

<span class="cmt">-- Force vacuum on orders table:</span>
VACUUM (VERBOSE, ANALYZE) orders;

<span class="cmt">-- Tune autovacuum for high-write tables:</span>
ALTER TABLE orders SET (
  autovacuum_vacuum_scale_factor = 0.01,   <span class="cmt">-- trigger at 1% dead (not 20%)</span>
  autovacuum_vacuum_cost_delay = 2,        <span class="cmt">-- reduce vacuum throttle (ms)</span>
  autovacuum_vacuum_threshold = 1000       <span class="cmt">-- minimum dead tuples to trigger</span>
);
        </div>
        <h3>Three Levels of VACUUM</h3>
      </div>
      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead><tr><th>Operation</th><th>What It Does</th><th>Table Lock?</th><th>When</th></tr></thead>
          <tbody>
            ${[
              ['VACUUM', 'Mark dead tuples reclaimable; update FSM; update visibility map; advance relfrozenxid', 'No (ShareUpdateExclusive)', 'Automatic (autovacuum) or manual'],
              ['VACUUM ANALYZE', 'VACUUM + update pg_statistic histogram buckets for the planner', 'No', 'After bulk inserts or schema changes'],
              ['VACUUM FULL', 'Rewrite entire table into a new heap file — fully defragmented, no bloat', 'AccessExclusive (table lock)', 'Only for extreme bloat — blocks all reads/writes'],
              ['pg_repack', 'Online VACUUM FULL equivalent — rewrites table without locking (uses trigger-based replication)', 'No long lock', 'Production alternative to VACUUM FULL'],
            ].map(([op, what, lock, when]) => `<tr><td><strong>${op}</strong></td><td style="font-size:10px">${what}</td><td>${lock}</td><td style="font-size:10px">${when}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'What is a "slotted page" and how does it support variable-length rows without external fragmentation?',
      a: 'A slotted page separates row location (slot array) from row data (tuple area). The slot array grows downward from the page header; tuples are packed upward from the page bottom. Free space sits between them. When a row is inserted: a 4-byte slot is appended to the array (recording the tuple\'s byte offset and length), and the tuple is written at the top of the free area. When a row is deleted: only the slot is marked dead — no data movement. This design prevents external fragmentation (no gaps between tuples until compaction) and allows rows to shrink/grow during UPDATE without shuffling other rows. Rows are addressed by TID = (page_number, slot_index), which is stable even after compaction (slot index is preserved, offset within the page changes — but slot always points to the correct location).',
      tip: 'Slot arrays also enable "redirect" entries: an updated row can be replaced with a redirect slot pointing to the new location, keeping old TIDs valid — used by HOT updates.',
    },
    {
      q: 'How does VACUUM handle page compaction and what is "tuple visibility"?',
      a: 'VACUUM scans the heap looking for dead tuples (those with t_xmax committed and visible to all active transactions). For each page: (1) Dead tuples are identified using pg_clog (commit log) to confirm t_xmax committed. (2) If ALL dead tuples on a page are safe to remove, the page is compacted in-place: live tuples are shifted toward the bottom, the slot array is rebuilt with updated offsets, and the free space is consolidated. (3) The FSM entry for the page is updated with the new free byte count. (4) If no dead tuples exist and t_xmin of all tuples is below relfrozenxid, the all-visible and all-frozen bits in the VM are set. VACUUM never removes a tuple that might still be visible to any in-progress transaction — it checks pg_clog and the oldest active XID from pg_stat_activity.',
      tip: 'VACUUM FULL is a special case: it rewrites the entire table file, reclaiming bloat from previously freed pages. This requires an exclusive table lock and should not be done on production during Prime Day.',
    },
    {
      q: 'What is the "heap bloat" problem and how do you measure and fix it?',
      a: 'Heap bloat occurs when VACUUM cannot keep up with the rate of dead tuple creation. Causes: (1) Long-running transactions prevent VACUUM from removing dead tuples visible to those transactions. (2) Autovacuum settings too conservative (default scale_factor=0.2 means 20% dead before autovacuum triggers). (3) High UPDATE/DELETE rates exceeding autovacuum throughput. Measurement: <code>SELECT relname, pg_size_pretty(pg_total_relation_size(oid)) FROM pg_class WHERE relname = \'orders\'</code> and compare to actual data size using n_live_tup × avg_row_size. Fix: (1) Tune autovacuum_vacuum_scale_factor=0.01 for high-write tables. (2) Kill long-running queries: <code>SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = \'idle in transaction\' AND age > \'5 minutes\'</code>. (3) Use pg_repack for online defragmentation without locks.',
      tip: 'At Amazon scale, heap bloat is a top-3 DBA problem. A table that should be 10 GB growing to 50 GB is classic bloat. Monitor with pgbadger or pg_activity during Prime Day.',
    },
  ]);
  initIQ(container);

  return () => engine.destroy();
}
