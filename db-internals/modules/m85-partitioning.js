import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

const STEPS = [
  {
    label: 'Single Table',
    desc: 'All 300M Prime Day orders on one node. Sequential scans take minutes. Writes queue up. The node becomes a bottleneck.',
    duration: 2200,
    mutate: st => { st.stepIdx = 0; },
  },
  {
    label: 'Horizontal Partitioning',
    desc: 'Horizontal partitioning splits rows across nodes. Each shard holds ~75M rows. Reads and writes parallelise across 4 nodes.',
    duration: 2200,
    mutate: st => { st.stepIdx = 1; },
  },
  {
    label: 'Range Partition',
    desc: 'Range partitioning: rows assigned by order_id range. Range queries hit only 1 shard. Problem: new orders always go to the last shard → hot partition.',
    duration: 2200,
    mutate: st => { st.stepIdx = 2; },
  },
  {
    label: 'Hash Partition',
    desc: 'Hash partitioning: hash(customer_id) % 4 distributes rows uniformly. Eliminates hot spots. Downside: range queries must hit ALL shards.',
    duration: 2200,
    mutate: st => { st.stepIdx = 3; },
  },
  {
    label: 'Composite Partition',
    desc: 'Composite partitioning: first by region (list), then by hash inside each region. Queries scoped to a region touch only 2 shards, not 8.',
    duration: 2200,
    mutate: st => { st.stepIdx = 4; },
  },
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

// ── draw ───────────────────────────────────────────────────────────────────────
function draw(ctx, state, W, H) {
  const idx = state.stepIdx;
  ctx.clearRect(0, 0, W, H);

  // ── Step 0: Single Table ──
  if (idx === 0) {
    const bx = W / 2 - 115, by = H * 0.28, bw = 230, bh = 130;

    // Load bar
    const lbx = W / 2 - 85, lby = by - 38, lbw = 170, lbh = 12;
    rr(ctx, lbx, lby, lbw, lbh, 3, '#1E293B', '#334155', 1);
    rr(ctx, lbx, lby, lbw * 0.95, lbh, 3, '#EF4444', null);
    tc(ctx, 'CPU 95%', W / 2, lby - 11, '#EF4444', 9, true);

    // Main table box
    rr(ctx, bx, by, bw, bh, 10, '#7f1d1d22', '#EF4444', 2);
    tc(ctx, 'orders', W / 2, by + 36, '#FCA5A5', 18, true);
    tc(ctx, '300M rows', W / 2, by + 62, '#EF4444', 13, false);
    rr(ctx, W / 2 - 64, by + 88, 128, 22, 5, '#EF4444', null);
    tc(ctx, '⚠  BOTTLENECK — single node', W / 2, by + 99, '#fff', 9, true);

    // Write queue arrows
    for (let i = 0; i < 5; i++) {
      const ay = by + 22 + i * 20;
      arr(ctx, bx - 48, ay, bx, ay, '#F59E0B');
    }
    tc(ctx, 'write queue', bx - 70, by + 62, '#F59E0B', 9, false);

    // Read latency badge
    rr(ctx, bx + bw + 8, by + 30, 96, 40, 6, '#171717', '#F59E0B', 1);
    tc(ctx, 'scan latency', bx + bw + 56, by + 44, '#F59E0B', 8, false);
    tc(ctx, '4–8 min', bx + bw + 56, by + 58, '#FEF08A', 11, true);
  }

  // ── Step 1: Horizontal Partitioning (2×2 grid) ──
  if (idx === 1) {
    const shards = [
      { id: 'P0', x: W * 0.25, y: H * 0.28, col: '#4F46E5' },
      { id: 'P1', x: W * 0.75, y: H * 0.28, col: '#10B981' },
      { id: 'P2', x: W * 0.25, y: H * 0.68, col: '#F59E0B' },
      { id: 'P3', x: W * 0.75, y: H * 0.68, col: '#A78BFA' },
    ];
    const sw = W * 0.26, sh = H * 0.24;
    const cx = W / 2, cy = H / 2;

    // Central router
    rr(ctx, cx - 44, cy - 14, 88, 28, 6, '#1E293B', '#10B981', 1.5);
    tc(ctx, '⟶ DISTRIBUTE', cx, cy, '#10B981', 10, true);

    shards.forEach(s => {
      // Arrow from router
      arr(ctx, cx, cy, s.x, s.y, '#10B981');
      // Shard box
      rr(ctx, s.x - sw / 2, s.y - sh / 2, sw, sh, 8, s.col + '1A', s.col, 1.5);
      tc(ctx, s.id, s.x, s.y - 12, s.col, 16, true);
      tc(ctx, '~75M rows', s.x, s.y + 8, '#94A3B8', 10, false);
      // Small load bar (low, green)
      const bw2 = sw * 0.6;
      rr(ctx, s.x - bw2 / 2, s.y + 22, bw2, 7, 2, '#1E293B', null);
      rr(ctx, s.x - bw2 / 2, s.y + 22, bw2 * 0.28, 7, 2, '#10B981', null);
    });
  }

  // ── Step 2: Range Partition ──
  if (idx === 2) {
    const shards = [
      { id: 'P0', range: '1 – 75M',     x: W * 0.12, y: H * 0.30, col: '#4F46E5' },
      { id: 'P1', range: '75M – 150M',  x: W * 0.37, y: H * 0.30, col: '#10B981' },
      { id: 'P2', range: '150M – 225M', x: W * 0.63, y: H * 0.30, col: '#F59E0B' },
      { id: 'P3', range: '225M – 300M', x: W * 0.88, y: H * 0.30, col: '#A78BFA' },
    ];
    const sw = W * 0.21, sh = H * 0.26;

    shards.forEach((s, i) => {
      const dim = (i !== 2);
      rr(ctx, s.x - sw / 2, s.y - sh / 2, sw, sh, 8, s.col + (dim ? '0A' : '1A'), dim ? '#334155' : s.col, 1.5);
      tc(ctx, s.id, s.x, s.y - 14, dim ? '#334155' : s.col, 15, true);
      tc(ctx, s.range, s.x, s.y + 4, dim ? '#475569' : '#94A3B8', 8, false);
      if (dim) {
        rr(ctx, s.x - 30, s.y + 18, 60, 16, 4, '#00000060', null);
        tc(ctx, 'PRUNED', s.x, s.y + 26, '#475569', 8, true);
      }
    });

    // Hot badge on P3
    rr(ctx, shards[3].x - 34, shards[3].y + sh / 2 + 6, 68, 18, 4, '#EF444422', '#EF4444', 1);
    tc(ctx, '🔥 HOT', shards[3].x, shards[3].y + sh / 2 + 15, '#EF4444', 9, true);

    // Query box
    const qy = H * 0.76;
    rr(ctx, shards[2].x - 100, qy - 16, 200, 32, 5, '#0F172A', '#4F46E5', 1.5);
    tc(ctx, 'WHERE order_id', shards[2].x, qy - 5, '#94A3B8', 9, false);
    tc(ctx, 'BETWEEN 160M AND 210M', shards[2].x, qy + 9, '#CBD5E1', 9, false);

    arr(ctx, shards[2].x, qy - 16, shards[2].x, shards[2].y + sh / 2, '#F59E0B', 'prune →');
  }

  // ── Step 3: Hash Partition ──
  if (idx === 3) {
    const shards = [
      { id: 'P0', x: W * 0.12, y: H * 0.28, col: '#4F46E5' },
      { id: 'P1', x: W * 0.37, y: H * 0.28, col: '#10B981' },
      { id: 'P2', x: W * 0.63, y: H * 0.28, col: '#F59E0B' },
      { id: 'P3', x: W * 0.88, y: H * 0.28, col: '#A78BFA' },
    ];
    const sw = W * 0.21, sh = H * 0.22;

    shards.forEach((s, i) => {
      rr(ctx, s.x - sw / 2, s.y - sh / 2, sw, sh, 8, s.col + '1A', s.col, 1.5);
      tc(ctx, s.id, s.x, s.y - 10, s.col, 15, true);
      tc(ctx, `hash % 4 = ${i}`, s.x, s.y + 8, '#94A3B8', 8, false);
    });

    tc(ctx, 'hash(customer_id) % 4', W / 2, H * 0.56, '#64748B', 9, true);

    const customers = [
      { id: 'C1001', val: '0xF3…%4=0', ti: 0 },
      { id: 'C5042', val: '0xA7…%4=1', ti: 1 },
      { id: 'C8831', val: '0x2C…%4=2', ti: 2 },
      { id: 'C2200', val: '0xD1…%4=3', ti: 3 },
      { id: 'C6677', val: '0xE9…%4=0', ti: 0 },
    ];
    const dotXs = [W * 0.10, W * 0.28, W * 0.50, W * 0.70, W * 0.88];
    const dotY  = H * 0.75;

    customers.forEach((c, i) => {
      const cx2 = dotXs[i];
      const col = shards[c.ti].col;
      ctx.beginPath(); ctx.arc(cx2, dotY, 13, 0, Math.PI * 2);
      ctx.fillStyle = col + '22'; ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
      tc(ctx, c.id, cx2, dotY - 1, col, 7, true);
      tc(ctx, c.val, cx2, dotY + 17, '#64748B', 7, false);
      arr(ctx, cx2, dotY - 15, shards[c.ti].x, shards[c.ti].y + sh / 2, col);
    });
  }

  // ── Step 4: Composite Partition ──
  if (idx === 4) {
    const rootX = W / 2, rootY = H * 0.10;
    rr(ctx, rootX - 80, rootY - 12, 160, 24, 5, '#1E293B', '#4F46E5', 1.5);
    tc(ctx, 'orders (300M rows)', rootX, rootY, '#CBD5E1', 10, true);

    const regions = [
      { label: 'US  (list)', x: W * 0.28, y: H * 0.33, col: '#10B981' },
      { label: 'EU  (list)', x: W * 0.72, y: H * 0.33, col: '#4F46E5' },
    ];

    regions.forEach(r => {
      arr(ctx, rootX, rootY + 12, r.x, r.y - 14, '#334155');
      rr(ctx, r.x - 58, r.y - 14, 116, 28, 6, r.col + '22', r.col, 1.5);
      tc(ctx, r.label, r.x, r.y, r.col, 11, true);
    });

    // Hash shards per region (4 each = 8 total)
    const shardCols = ['#4F46E5', '#10B981', '#F59E0B', '#A78BFA'];
    const regionShards = [
      [
        { l: 'US-H0', x: W * 0.09 },
        { l: 'US-H1', x: W * 0.22 },
        { l: 'US-H2', x: W * 0.35 },
        { l: 'US-H3', x: W * 0.48 },
      ],
      [
        { l: 'EU-H0', x: W * 0.52 },
        { l: 'EU-H1', x: W * 0.65 },
        { l: 'EU-H2', x: W * 0.78 },
        { l: 'EU-H3', x: W * 0.91 },
      ],
    ];
    const shardY = H * 0.65;

    regionShards.forEach((group, gi) => {
      group.forEach((s, si) => {
        const col = gi === 0 ? '#10B981' : '#4F46E5';
        const shade = shardCols[si];
        const active = gi === 0; // US query highlighted
        arr(ctx, regions[gi].x, regions[gi].y + 14, s.x, shardY - 12, '#334155');
        rr(ctx, s.x - 28, shardY - 12, 56, 26, 5, shade + (active ? '22' : '0A'), active ? shade : '#334155', 1.5);
        tc(ctx, s.l, s.x, shardY, active ? shade : '#475569', 8, true);
        tc(ctx, 'hash', s.x, shardY + 9, '#475569', 7, false);
      });
    });

    // Annotation: US query touches 4 of 8
    rr(ctx, W * 0.04, H * 0.84, W * 0.44, 22, 5, '#052e1655', '#10B981', 1);
    tc(ctx, 'US query → 4 of 8 shards (not all 8)', W * 0.26, H * 0.855, '#10B981', 9, true);
    rr(ctx, W * 0.52, H * 0.84, W * 0.44, 22, 5, '#17173b55', '#334155', 1);
    tc(ctx, 'EU shards untouched', W * 0.74, H * 0.855, '#475569', 9, false);
  }

  // ── Legend bottom-right ──
  const items = [
    { col: '#EF4444', label: 'Overloaded' },
    { col: '#4F46E5', label: 'Range shard' },
    { col: '#10B981', label: 'Hash shard' },
    { col: '#A78BFA', label: 'Composite' },
  ];
  const lgx = W - 130, lgy = H - 72;
  rr(ctx, lgx - 6, lgy - 6, 126, items.length * 16 + 8, 5, '#0F172A99', '#1E293B', 1);
  items.forEach((it, i) => {
    ctx.fillStyle = it.col;
    ctx.fillRect(lgx, lgy + i * 16, 8, 8);
    tl(ctx, it.label, lgx + 14, lgy + i * 16 + 4, '#94A3B8', 9);
  });
}

// ── detail panel ──────────────────────────────────────────────────────────────
function renderDetail(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="color:#E2E8F0;margin:0 0 14px">Partitioning Strategies</h3>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin-bottom:20px">
    ${[
      ['Horizontal Partitioning', 'Rows are divided across multiple shards. Each shard holds a subset of rows but all columns. Contrast with vertical partitioning (splitting columns) or functional partitioning (splitting by feature). Horizontal is the dominant strategy for write scale-out.', '#4F46E5'],
      ['Range Partitioning', 'Key space divided into contiguous ranges. Supports efficient range scans: the query planner can prune all but one shard. Downside: monotonically increasing keys (like order_id) create a perpetual hot shard as all new writes target the last partition.', '#10B981'],
      ['Hash Partitioning', 'hash(key) % N assigns each row to a shard. Provides uniform distribution and eliminates hot spots. Breaks range queries: a WHERE … BETWEEN … must fan out to every shard because hash ordering is non-contiguous.', '#F59E0B'],
      ['Composite Partitioning', 'Two-level strategy: e.g., partition first by region (list), then by hash within each region. A region-scoped query prunes to one subtree. Used by Amazon DynamoDB and Apache Cassandra.', '#A78BFA'],
      ['Partition Elimination', 'The query planner inspects partition boundaries and skips shards whose key range cannot satisfy the predicate. Range partitioning makes elimination exact. Hash partitioning makes it impossible for range predicates.', '#06B6D4'],
      ['Hot Partition Mitigation', 'Options: (1) Pre-split at ingest time using UUID or random prefix. (2) Suffix the key with a random shard number and scatter-gather on read. (3) Use time-based rotation: a new partition every hour so load spreads across time.', '#EF4444'],
    ].map(([t, d, col]) => `
      <div style="background:#0F172A;border-radius:8px;padding:14px 16px;border-left:3px solid ${col}">
        <div style="color:${col};font-weight:700;font-size:12px;margin-bottom:6px">${t}</div>
        <div style="font-size:11px;color:#94A3B8">${d}</div>
      </div>`).join('')}
  </div>
  <div style="background:#172554;border-left:3px solid #4F46E5;padding:12px 16px;border-radius:0 6px 6px 0;font-size:12px">
    <strong style="color:#818CF8">Amazon Prime Day context:</strong> Orders table grows monotonically.
    Pure range partitioning on order_id causes P_last to absorb all 100K+ writes/sec.
    Amazon DynamoDB uses composite partitioning: a partition key (hash) with an optional sort key (range), giving you both uniform write distribution and efficient range scans within a partition.
  </div>
</div>`;
}

// ── IQ panel ──────────────────────────────────────────────────────────────────
function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'What is the difference between range and hash partitioning? When do you choose each?',
      a: 'Range partitioning divides the key space into contiguous intervals and assigns each interval to a shard. It enables partition elimination for range predicates and produces naturally sorted output within a shard. Choose it when your query workload is dominated by range scans (e.g., "orders in the last 7 days"). Hash partitioning applies a hash function to the key and takes it modulo the number of shards. This produces a uniform distribution and eliminates hot spots. Choose it when you need high write throughput with no skew and range scans are rare or not needed. For mixed workloads, use composite (hash then range or list then hash).',
      tip: 'Interviewers often follow up: "What happens if you need to add a new shard to a hash-partitioned system?" Answer with consistent hashing.',
    },
    {
      q: 'Why do monotonically increasing keys cause hot partitions in range-partitioned tables?',
      a: 'In range partitioning, the shard that owns the highest key range receives every new INSERT because inserts always append to the current maximum. During Prime Day, all 100K writes/sec hit the last partition exclusively. The other shards sit idle. This is the classic "last-shard hot spot" and is why DynamoDB recommends using a high-cardinality partition key (like customer_id or a UUID derivative) rather than order_id as the primary partition dimension.',
    },
    {
      q: 'How does partition elimination work and what prevents it in hash-partitioned tables?',
      a: 'Partition elimination (also called partition pruning) is when the query planner inspects the predicate and determines which partitions cannot possibly contain matching rows, then skips them entirely. For range partitioning, if the metadata says partition P1 owns order_id [75M, 150M) and the predicate is WHERE order_id BETWEEN 80M AND 120M, the planner can skip P0, P2, P3. For hash partitioning, the hash function destroys key ordering: rows with adjacent order_id values may be on completely different shards. The planner cannot determine which shards contain rows satisfying a range predicate without scanning all of them.',
    },
  ]);
}

// ── mount ─────────────────────────────────────────────────────────────────────
export function mount(container) {
  const { tabs, body } = createModuleShell(container, {
    tag: 'Distributed',
    title: 'Partitioning Strategies',
    subtitle: 'Horizontal vs. range vs. hash vs. composite — splitting 300M Prime Day orders across nodes.',
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
