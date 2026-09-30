import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

const STEPS = [
  {
    label: 'Range Overview',
    desc: 'Range partitioning: divide the key space into contiguous ranges. Each partition owns an exclusive range of primary key values.',
    duration: 2200,
    mutate: st => { st.stepIdx = 0; },
  },
  {
    label: 'Range Query Pruning',
    desc: 'Range scans are efficient: the query optimizer prunes irrelevant partitions. Only P1 is accessed. This is partition elimination.',
    duration: 2200,
    mutate: st => { st.stepIdx = 1; },
  },
  {
    label: 'Write Hotspot (Prime Day)',
    desc: 'Critical flaw: new orders always have the highest IDs and land in the last partition. P3 becomes a write hot spot during Prime Day — all 100K writes/sec hit one node.',
    duration: 2200,
    mutate: st => { st.stepIdx = 2; },
  },
  {
    label: 'Rebalancing',
    desc: 'Mitigation: split the hot partition. P3 divides into P3a and P3b, each on a different shard server. Future splits can happen in real time with zero downtime if the engine supports online rebalancing.',
    duration: 2200,
    mutate: st => { st.stepIdx = 3; },
  },
  {
    label: 'Sorted Access Pattern',
    desc: 'Range partitioning shines for ORDER BY queries — they\'re already sorted within and across partitions. Hash partitioning requires a global sort merge across all shards.',
    duration: 2200,
    mutate: st => { st.stepIdx = 4; },
  },
];

const SHARD_DEFS = [
  { id: 'P0', lo: '0',    hi: '75M',  col: '#4F46E5', label: '1 – 75M' },
  { id: 'P1', lo: '75M',  hi: '150M', col: '#10B981', label: '75M – 150M' },
  { id: 'P2', lo: '150M', hi: '225M', col: '#F59E0B', label: '150M – 225M' },
  { id: 'P3', lo: '225M', hi: '300M', col: '#A78BFA', label: '225M – 300M' },
];

// ── helpers ────────────────────────────────────────────────────────────────────
function rr(ctx, x, y, w, h, r, fill, stroke, lw) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill)   { ctx.fillStyle   = fill;        ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1.5; ctx.stroke(); }
}

function tc(ctx, t, x, y, col, size, bold) {
  ctx.save();
  ctx.fillStyle    = col;
  ctx.font         = `${bold ? '600 ' : ''}${size || 11}px system-ui,sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(t, x, y);
  ctx.restore();
}

function tl(ctx, t, x, y, col, size) {
  ctx.save();
  ctx.fillStyle    = col;
  ctx.font         = `${size || 10}px system-ui,sans-serif`;
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(t, x, y);
  ctx.restore();
}

function arr(ctx, fx, fy, tx, ty, col, lbl, dashed) {
  ctx.save();
  if (dashed) ctx.setLineDash([5, 4]);
  ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty);
  ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.setLineDash([]);
  const ang = Math.atan2(ty - fy, tx - fx);
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx - 9 * Math.cos(ang - 0.4), ty - 9 * Math.sin(ang - 0.4));
  ctx.lineTo(tx - 9 * Math.cos(ang + 0.4), ty - 9 * Math.sin(ang + 0.4));
  ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  if (lbl) {
    ctx.fillStyle    = col;
    ctx.font         = '9px system-ui,sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(lbl, (fx + tx) / 2, Math.min(fy, ty) - 3);
  }
  ctx.restore();
}

// Draw the number line with 4 colored segments
function drawNumberLine(ctx, W, H, lineY, dimMask, highlightIdx) {
  const lx = W * 0.06, rx = W * 0.94;
  const lw  = rx - lx;
  const segW = lw / 4;
  const barH = 26;

  // Background track
  rr(ctx, lx, lineY - barH / 2, lw, barH, 4, '#1E293B', '#334155', 1);

  SHARD_DEFS.forEach((s, i) => {
    const sx     = lx + i * segW;
    const dim    = dimMask && dimMask[i];
    const active = highlightIdx === i;
    rr(ctx, sx, lineY - barH / 2, segW, barH, i === 0 ? [4, 0, 0, 4] : (i === 3 ? [0, 4, 4, 0] : 0),
      s.col + (dim ? '18' : (active ? 'CC' : '40')),
      active ? s.col : (dim ? '#1E293B' : s.col + '88'),
      active ? 2 : 1);
    // Shard id inside bar
    tc(ctx, s.id, sx + segW / 2, lineY, dim ? '#334155' : s.col, 10, true);
  });

  // Tick marks + labels below
  const ticks = [0, 75, 150, 225, 300];
  ticks.forEach((v, i) => {
    const tx2 = lx + i * segW;
    ctx.beginPath(); ctx.moveTo(tx2, lineY + barH / 2); ctx.lineTo(tx2, lineY + barH / 2 + 8);
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.stroke();
    tc(ctx, v === 0 ? '0' : `${v}M`, tx2, lineY + barH / 2 + 16, '#64748B', 8, false);
  });
  // End tick
  const endX = rx;
  ctx.beginPath(); ctx.moveTo(endX, lineY + barH / 2); ctx.lineTo(endX, lineY + barH / 2 + 8);
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.stroke();

  // Axis label
  tc(ctx, 'order_id →', W / 2, lineY + barH / 2 + 30, '#475569', 9, false);

  return { lx, rx, segW, lineY, barH };
}

// ── draw ───────────────────────────────────────────────────────────────────────
function draw(ctx, state, W, H) {
  const idx = state.stepIdx;
  ctx.clearRect(0, 0, W, H);

  const lineY = H * 0.42;

  // ─── Step 0: Range Overview ───
  if (idx === 0) {
    // Router box at top
    const routerY = H * 0.15;
    rr(ctx, W / 2 - 60, routerY - 13, 120, 26, 5, '#0F172A', '#4F46E5', 1.5);
    tc(ctx, '⟶ Router / Planner', W / 2, routerY, '#A5B4FC', 10, false);
    arr(ctx, W / 2, routerY + 13, W / 2, lineY - 18, '#334155');

    const { lx, segW } = drawNumberLine(ctx, W, H, lineY, null, -1);

    // Partition labels above bar
    SHARD_DEFS.forEach((s, i) => {
      const cx2 = lx + i * segW + segW / 2;
      tc(ctx, s.label, cx2, lineY - 28, s.col, 8, false);
      tc(ctx, '~75M rows', cx2, lineY - 16, '#475569', 8, false);
    });
  }

  // ─── Step 1: Range Query Pruning ───
  if (idx === 1) {
    const dimMask   = [true, false, true, true];
    const { lx, segW } = drawNumberLine(ctx, W, H, lineY, dimMask, 1);

    SHARD_DEFS.forEach((s, i) => {
      const cx2 = lx + i * segW + segW / 2;
      const dim  = dimMask[i];
      tc(ctx, s.label, cx2, lineY - 28, dim ? '#334155' : s.col, 8, false);
      if (dim) {
        rr(ctx, cx2 - 28, lineY - 16, 56, 14, 3, '#00000040', null);
        tc(ctx, 'PRUNED', cx2, lineY - 9, '#475569', 8, true);
      }
    });

    // Query box
    const p1cx = lx + 1 * segW + segW / 2;
    const queryY = H * 0.78;
    rr(ctx, p1cx - 105, queryY - 16, 210, 32, 5, '#0F172A', '#10B981', 1.5);
    tc(ctx, 'SELECT * FROM orders', p1cx, queryY - 5, '#94A3B8', 9, false);
    tc(ctx, 'WHERE order_id BETWEEN 80M AND 120M', p1cx, queryY + 7, '#CBD5E1', 9, false);

    arr(ctx, p1cx, queryY - 16, p1cx, lineY + 18, '#10B981', 'eliminate');

    // Elimination badge
    rr(ctx, p1cx - 56, lineY + 30, 112, 20, 4, '#052e1655', '#10B981', 1);
    tc(ctx, 'partition elimination', p1cx, lineY + 40, '#10B981', 9, true);
  }

  // ─── Step 2: Write Hotspot ───
  if (idx === 2) {
    const { lx, segW } = drawNumberLine(ctx, W, H, lineY, null, -1);

    // Load bars above each partition
    SHARD_DEFS.forEach((s, i) => {
      const cx2 = lx + i * segW + segW / 2;
      const hot  = i === 3;
      const load = hot ? 0.97 : [0.10, 0.12, 0.09][i] || 0.10;
      const barW = segW * 0.7;
      rr(ctx, cx2 - barW / 2, lineY - 48, barW, 14, 2, '#1E293B', null);
      rr(ctx, cx2 - barW / 2, lineY - 48, barW * load, 14, 2, hot ? '#EF4444' : '#10B981', null);
      tc(ctx, hot ? '97%' : `${Math.round(load * 100)}%`, cx2, lineY - 41, hot ? '#FCA5A5' : '#10B981', 8, true);
    });

    // Write arrows piling into P3
    const p3cx = lx + 3 * segW + segW / 2;
    const p3top = lineY - 13;
    for (let i = 0; i < 6; i++) {
      const ax = p3cx - 20 + i * 8;
      arr(ctx, ax, H * 0.76, ax, p3top + 2, '#EF4444');
    }
    tc(ctx, 'all new writes ↓', p3cx, H * 0.80, '#EF4444', 9, true);

    // Hot badge
    rr(ctx, p3cx - 44, lineY + 32, 88, 20, 5, '#EF444422', '#EF4444', 1.5);
    tc(ctx, '🔥 HOT PARTITION', p3cx, lineY + 42, '#EF4444', 9, true);

    // Prime Day label
    rr(ctx, W / 2 - 95, H * 0.88, 190, 22, 5, '#EF444418', '#EF4444', 1);
    tc(ctx, 'Prime Day: 100K writes/sec → 1 shard', W / 2, H * 0.892, '#EF4444', 9, true);
  }

  // ─── Step 3: Rebalancing — P3 splits ───
  if (idx === 3) {
    // Draw P0, P1, P2 normally
    const lx    = W * 0.06;
    const lw    = W * 0.88;
    const segW3 = lw / 4;
    const barH  = 26;

    rr(ctx, lx, lineY - barH / 2, lw, barH, 4, '#1E293B', '#334155', 1);
    SHARD_DEFS.slice(0, 3).forEach((s, i) => {
      rr(ctx, lx + i * segW3, lineY - barH / 2, segW3, barH,
        i === 0 ? [4, 0, 0, 4] : 0, s.col + '40', s.col + '88', 1);
      tc(ctx, s.id, lx + i * segW3 + segW3 / 2, lineY, s.col, 10, true);
      tc(ctx, s.label, lx + i * segW3 + segW3 / 2, lineY - 28, s.col, 8, false);
    });

    // P3 split into P3a and P3b
    const p3start = lx + 3 * segW3;
    const halfSeg = segW3 / 2;
    const p3aCol  = '#A78BFA';
    const p3bCol  = '#EC4899';

    rr(ctx, p3start, lineY - barH / 2, halfSeg, barH, 0, p3aCol + '40', p3aCol, 1.5);
    tc(ctx, 'P3a', p3start + halfSeg / 2, lineY, p3aCol, 10, true);
    tc(ctx, '225M – 262M', p3start + halfSeg / 2, lineY - 28, p3aCol, 8, false);

    rr(ctx, p3start + halfSeg, lineY - barH / 2, halfSeg, barH, [0, 4, 4, 0], p3bCol + '40', p3bCol, 1.5);
    tc(ctx, 'P3b', p3start + halfSeg + halfSeg / 2, lineY, p3bCol, 10, true);
    tc(ctx, '262M – 300M', p3start + halfSeg + halfSeg / 2, lineY - 28, p3bCol, 8, false);

    // Split divider line
    ctx.beginPath();
    ctx.moveTo(p3start + halfSeg, lineY - barH / 2 - 10);
    ctx.lineTo(p3start + halfSeg, lineY + barH / 2 + 10);
    ctx.strokeStyle = '#EC4899'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.stroke();
    ctx.setLineDash([]);
    tc(ctx, '✂', p3start + halfSeg, lineY - barH / 2 - 22, '#EC4899', 14, false);

    // Tick labels below
    const ticks2 = [0, 75, 150, 225, 262, 300];
    const tickXs  = [lx, lx + segW3, lx + 2 * segW3, lx + 3 * segW3, p3start + halfSeg, lx + lw];
    ticks2.forEach((v, i) => {
      ctx.beginPath(); ctx.moveTo(tickXs[i], lineY + barH / 2); ctx.lineTo(tickXs[i], lineY + barH / 2 + 8);
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.stroke();
      tc(ctx, v === 0 ? '0' : `${v}M`, tickXs[i], lineY + barH / 2 + 16, '#64748B', 8, false);
    });
    tc(ctx, 'order_id →', W / 2, lineY + barH / 2 + 30, '#475569', 9, false);

    // Server labels below axis
    rr(ctx, p3start - 4, lineY + 52, halfSeg + 4, 18, 3, '#A78BFA18', '#A78BFA', 1);
    tc(ctx, 'Shard server A', p3start + halfSeg / 2, lineY + 61, '#A78BFA', 8, false);
    rr(ctx, p3start + halfSeg, lineY + 52, halfSeg + 4, 18, 3, '#EC489918', '#EC4899', 1);
    tc(ctx, 'Shard server B', p3start + halfSeg + halfSeg / 2, lineY + 61, '#EC4899', 8, false);

    rr(ctx, W / 2 - 130, H * 0.88, 260, 20, 4, '#10B98118', '#10B981', 1);
    tc(ctx, 'Online rebalancing — zero downtime', W / 2, H * 0.892, '#10B981', 9, true);
  }

  // ─── Step 4: Sorted Access Pattern ───
  if (idx === 4) {
    const lx2 = W * 0.06, lw2 = W * 0.46;
    const segW4 = lw2 / 4, barH4 = 22, lineY4 = H * 0.32;

    // Left: Range partition — single scan
    tc(ctx, 'Range Partition', lx2 + lw2 / 2, lineY4 - 52, '#10B981', 11, true);
    tc(ctx, 'ORDER BY order_id — single shard scan', lx2 + lw2 / 2, lineY4 - 38, '#64748B', 9, false);

    rr(ctx, lx2, lineY4 - barH4 / 2, lw2, barH4, 4, '#1E293B', '#334155', 1);
    SHARD_DEFS.forEach((s, i) => {
      const active = i === 1;
      rr(ctx, lx2 + i * segW4, lineY4 - barH4 / 2, segW4, barH4,
        i === 0 ? [4, 0, 0, 4] : (i === 3 ? [0, 4, 4, 0] : 0),
        s.col + (active ? '60' : '18'),
        active ? s.col : s.col + '44',
        active ? 2 : 1);
      tc(ctx, s.id, lx2 + i * segW4 + segW4 / 2, lineY4, active ? s.col : '#334155', 9, true);
    });

    // Sequential scan arrow across P1
    const p1start = lx2 + 1 * segW4, p1end = lx2 + 2 * segW4;
    arr(ctx, p1start + 4, lineY4 + barH4 / 2 + 10, p1end - 4, lineY4 + barH4 / 2 + 10, '#10B981', 'seq scan');

    // Sorted rows coming out
    const rowY = lineY4 + barH4 / 2 + 34;
    for (let i = 0; i < 3; i++) {
      const rx2 = lx2 + lw2 * 0.20 + i * lw2 * 0.28;
      rr(ctx, rx2 - 32, rowY, 64, 16, 3, '#10B98118', '#10B981', 1);
      tc(ctx, `id=${80 + i * 20}M`, rx2, rowY + 8, '#10B981', 8, false);
    }
    arr(ctx, lx2 + lw2 * 0.20, rowY + 8, lx2 + lw2 * 0.20 + 2 * lw2 * 0.28, rowY + 8, '#10B981');

    // Right: Hash partition — fan-out
    const rx3 = W * 0.56, rw3 = W * 0.40;
    tc(ctx, 'Hash Partition', rx3 + rw3 / 2, lineY4 - 52, '#EF4444', 11, true);
    tc(ctx, 'ORDER BY order_id — fan-out to all shards', rx3 + rw3 / 2, lineY4 - 38, '#64748B', 9, false);

    const hashShardW = rw3 / 4;
    const hashCols   = ['#4F46E5', '#10B981', '#F59E0B', '#A78BFA'];
    rr(ctx, rx3, lineY4 - barH4 / 2, rw3, barH4, 4, '#1E293B', '#334155', 1);
    hashCols.forEach((col, i) => {
      rr(ctx, rx3 + i * hashShardW, lineY4 - barH4 / 2, hashShardW, barH4,
        i === 0 ? [4, 0, 0, 4] : (i === 3 ? [0, 4, 4, 0] : 0),
        col + '40', col + '88', 1);
      tc(ctx, `H${i}`, rx3 + i * hashShardW + hashShardW / 2, lineY4, col, 9, true);
    });

    // Fan-out arrows
    const fanSrcX = rx3 + rw3 / 2;
    const fanSrcY = lineY4 + barH4 / 2 + 10;
    rr(ctx, fanSrcX - 54, fanSrcY - 2, 108, 16, 3, '#EF444418', '#EF4444', 1);
    tc(ctx, 'global sort-merge', fanSrcX, fanSrcY + 6, '#EF4444', 8, false);

    hashCols.forEach((col, i) => {
      const ex = rx3 + i * hashShardW + hashShardW / 2;
      arr(ctx, fanSrcX, fanSrcY + 8, ex, lineY4 + barH4 / 2 + 34, col);
    });

    // Sort-merge output
    rr(ctx, rx3 + rw3 / 2 - 70, H * 0.68, 140, 18, 4, '#EF444418', '#EF4444', 1);
    tc(ctx, '↺ merge-sort across 4 streams', rx3 + rw3 / 2, H * 0.69, '#EF4444', 8, true);

    // Comparison footer
    rr(ctx, W * 0.06, H * 0.85, W * 0.88, 22, 5, '#0F172A', '#334155', 1);
    tc(ctx, 'Range: O(partition) for sorted reads  ·  Hash: O(N × partition) + merge overhead', W / 2, H * 0.862, '#94A3B8', 9, false);
  }
}

// ── detail panel ──────────────────────────────────────────────────────────────
function renderDetail(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="color:#E2E8F0;margin:0 0 14px">Range Partitioning</h3>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin-bottom:20px">
    ${[
      ['Partition Metadata', 'The database stores a routing table: [(key_range → shard_server)]. On every query, the planner consults this table. PostgreSQL stores it in pg_inherits + check constraints; MySQL NDB in the NDB dictionary; DynamoDB internally in the partition map service.', '#4F46E5'],
      ['Partition Elimination', 'For a predicate WHERE order_id BETWEEN lo AND hi, the planner computes the intersection of [lo, hi] with each shard\'s [lo_i, hi_i]. Only shards with non-empty intersection are scanned. For equality predicates (=), exactly one shard is accessed.', '#10B981'],
      ['Hot Partition Root Cause', 'Auto-increment or timestamp-based keys are monotonically increasing. Every INSERT goes to the latest key range. In a range-partitioned table, that means one shard permanently absorbs 100% of write traffic. Reads may also concentrate on recent data.', '#EF4444'],
      ['Online Rebalancing', 'Modern engines split hot partitions without downtime: (1) lock the shard, (2) copy [mid, hi] to a new host, (3) update the routing table atomically, (4) redirect traffic. CockroachDB, TiDB, and Spanner all support online range splits.', '#F59E0B'],
      ['Sorted ORDER BY', 'Within a single range shard, rows are stored in primary key order. A full-table ORDER BY becomes a merge of sorted shard outputs — each shard returns rows in order and they are merged. Hash partitioning produces no such locality; a full sort is needed.', '#A78BFA'],
      ['Write Hotspot Mitigations', '(1) UUID or random prefix: destroys ordering but spreads load. (2) Temporal partitioning: a new shard per day/week so load shifts rather than accumulates. (3) Application-level sharding: prefix order_id with shard_id and route at application layer.', '#06B6D4'],
    ].map(([t, d, col]) => `
      <div style="background:#0F172A;border-radius:8px;padding:14px 16px;border-left:3px solid ${col}">
        <div style="color:${col};font-weight:700;font-size:12px;margin-bottom:6px">${t}</div>
        <div style="font-size:11px;color:#94A3B8">${d}</div>
      </div>`).join('')}
  </div>
  <div style="background:#172554;border-left:3px solid #4F46E5;padding:12px 16px;border-radius:0 6px 6px 0;font-size:12px">
    <strong style="color:#818CF8">Amazon context:</strong> DynamoDB allows you to specify a sort key alongside a partition key.
    Within a single partition (hash key value), rows are stored sorted by the sort key.
    A GetItem with both hash and sort key hits exactly one partition.
    A Query with hash key + sort key range scan stays within one partition — no fan-out.
    The partition key must be high-cardinality to avoid hotspots.
  </div>
</div>`;
}

// ── IQ panel ──────────────────────────────────────────────────────────────────
function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'Explain partition elimination and when it fails.',
      a: 'Partition elimination (partition pruning) is the optimizer\'s ability to skip shards that cannot satisfy the query predicate. It works when the predicate involves the partition key and the optimizer can statically compute which partition ranges overlap the predicate. Example: WHERE order_id BETWEEN 80M AND 120M prunes any shard whose range [lo, hi] has no overlap with [80M, 120M]. It fails when: (1) the predicate involves a non-partition column (e.g., WHERE customer_id = X on a table partitioned by order_id — every shard must be scanned), (2) the predicate is wrapped in a function (WHERE YEAR(created_at) = 2024 prevents pruning on a created_at range partition), (3) the query uses an OR combining different partition keys.',
      tip: 'A common trap: CAST or TO_DATE wrapping the partition column defeats pruning even on range partitions.',
    },
    {
      q: 'How would you design the partitioning strategy for Amazon\'s orders table to handle Prime Day spikes?',
      a: 'The challenge is that order_id is monotonically increasing (causes hot-last-partition with range) and customer_id is the most queried dimension. Recommended design: (1) Use composite partitioning — partition key = hash(customer_id), sort key = order_id. This gives uniform write distribution (no hot partition) and allows efficient queries like "all recent orders for customer X" (single shard scan, sorted by order_id). (2) Use table-level throughput capacity with auto-scaling in DynamoDB, or consistent hashing with vnodes in Cassandra. (3) For analytics (scan by time range), replicate to a separate fact table partitioned by date using range partitioning on order_date.',
    },
    {
      q: 'What is online range rebalancing and how does it work?',
      a: 'Online rebalancing is the process of splitting or moving a partition while the system continues serving reads and writes. The typical algorithm: (1) Identify the split point (midpoint of the hot range, or a suggested split from load metrics). (2) Create a new partition descriptor covering [mid, old_hi]. (3) Begin streaming rows in [mid, old_hi] from the old shard to the new host (range copy). (4) Once the copy is caught up, acquire a brief write lock on just that key range. (5) Update the partition routing table atomically — from this moment new writes to [mid, old_hi] go to the new host. (6) Release the lock. Old host continues serving [old_lo, mid]. Systems like CockroachDB, Google Spanner, and TiDB implement this. The write lock duration is typically milliseconds.',
    },
  ]);
}

// ── mount ─────────────────────────────────────────────────────────────────────
export function mount(container) {
  const { tabs, body } = createModuleShell(container, {
    tag: 'Distributed',
    title: 'Range Partitioning',
    subtitle: 'Range splits, partition pruning, write hotspots, and online rebalancing for Prime Day.',
    tabs: [
      { id: 'anim',   label: 'Animation' },
      { id: 'detail', label: 'Details'   },
      { id: 'iq',     label: 'Interview Q&A' },
    ],
  });

  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:420px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);

      const engine = new SimulationEngine({
        initialState: { stepIdx: 0 },
        steps: STEPS,
        onRender: (state, cnv) => {
          const pr = window.devicePixelRatio || 1;
          cnv.width  = cnv.clientWidth  * pr;
          cnv.height = cnv.clientHeight * pr;
          const ctx  = cnv.getContext('2d');
          ctx.scale(pr, pr);
          draw(ctx, state, cnv.clientWidth, cnv.clientHeight);
        },
      });

      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, STEPS));

      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);

      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = STEPS[i].desc; });
      desc.textContent = STEPS[0].desc;
      return () => engine.destroy();
    },
    detail: renderDetail,
    iq:     renderIQ,
  });

  return null;
}
