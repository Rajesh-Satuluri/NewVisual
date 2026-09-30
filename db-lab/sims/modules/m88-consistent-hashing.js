import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

const TWO_PI = Math.PI * 2;

const STEPS = [
  {
    label: 'Naive Modulo Hashing',
    desc: 'Naive approach: hash(key) % N assigns keys to nodes. Works fine — until you add or remove a node. Every key remaps: nearly ALL data migrates. Unacceptable in production.',
  },
  {
    label: 'Hash Ring (3 Nodes)',
    desc: 'Consistent hashing maps both keys and nodes onto a 0–2³² ring. A key is served by the first node clockwise. Adding/removing one node remaps only ~1/N of keys — the rest stay put.',
  },
  {
    label: 'Virtual Nodes (vnodes)',
    desc: 'Real deployments use 150–200 virtual nodes per physical node. This evens out the key distribution and lets you weight nodes by capacity. Cassandra and DynamoDB both use vnodes.',
  },
  {
    label: 'Add Node P4',
    desc: 'P4 joins the ring. Only the keys in the arc between P4 and its predecessor migrate to P4. All other keys stay where they are. Migration is proportional to 1/(N+1).',
  },
  {
    label: 'Remove Node P1',
    desc: 'P1 leaves (or fails). Its key range transfers clockwise to the next node. Replication factor ≥ 2 means data already exists there — removal is just a routing change.',
  },
];

/* ── helpers ─────────────────────────────────────────────────────────────── */
function polar(cx, cy, r, angle) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function rr(ctx, x, y, w, h, rad, fill, stroke, lw) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, rad);
  if (fill)   { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1.5; ctx.stroke(); }
}

function tc(ctx, t, x, y, col, size, bold) {
  ctx.save();
  ctx.fillStyle = col; ctx.font = `${bold ? '600 ' : ''}${size || 11}px system-ui,sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(t, x, y); ctx.restore();
}

/* ── step 0: naive modulo ─────────────────────────────────────────────────── */
function drawNaive(ctx, W, H) {
  const cols = ['#4F46E5', '#10B981', '#F59E0B'];
  const labels = ['N0', 'N1', 'N2'];
  const bw = 72, bh = 60, gap = 28;
  const totalW = cols.length * bw + (cols.length - 1) * gap;
  const startX = (W - totalW) / 2;
  const by = H * 0.28;

  cols.forEach((col, i) => {
    rr(ctx, startX + i * (bw + gap), by, bw, bh, 8, col + '22', col, 1.5);
    tc(ctx, labels[i], startX + i * (bw + gap) + bw / 2, by + bh / 2, col, 14, true);
  });
  tc(ctx, 'hash(key) % 3', W / 2, by - 20, '#94A3B8', 11, false);

  const keys = ['order_1', 'order_2', 'order_3', 'order_4', 'order_5', 'order_6'];
  const assigned = keys.map((k, i) => ({ k, node: i % 3 }));
  const ky = by + bh + 30;
  tc(ctx, 'keys: evenly distributed ✓', W / 2, ky, '#10B981', 10, false);

  // Resize to 4 nodes warning
  const wy = ky + 36;
  rr(ctx, W / 2 - 180, wy, 360, 46, 6, '#7F1D1D22', '#EF4444', 1.5);
  tc(ctx, '⚠  Add 1 node → hash(key) % 4', W / 2, wy + 14, '#FCA5A5', 10, false);
  tc(ctx, '~75% of ALL keys must migrate  (catastrophic)', W / 2, wy + 30, '#EF4444', 10, true);
}

/* ── ring drawing ──────────────────────────────────────────────────────────── */
function drawRing(ctx, cx, cy, R, nodes, keys, highlight, dimIdx) {
  // ring
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, TWO_PI);
  ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 2.5; ctx.stroke();

  // key dots
  const keyColMap = { '#4F46E5': '#818CF8', '#10B981': '#34D399', '#F59E0B': '#FCD34D', '#A78BFA': '#C4B5FD', '#06B6D4': '#22D3EE' };

  keys.forEach(kp => {
    const p = polar(cx, cy, R, kp.angle);
    const col = keyColMap[kp.ownerColor] || '#64748B';
    ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, TWO_PI);
    ctx.fillStyle = col; ctx.fill();
  });

  // migrating arc highlight
  if (highlight) {
    ctx.beginPath();
    ctx.arc(cx, cy, R, highlight.start, highlight.end);
    ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 5; ctx.globalAlpha = 0.35; ctx.stroke();
    ctx.globalAlpha = 1; ctx.lineWidth = 2.5;
  }

  // nodes
  nodes.forEach((n, i) => {
    const p = polar(cx, cy, R, n.angle);
    const dim = dimIdx === i;
    const col = dim ? '#334155' : n.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, 16, 0, TWO_PI);
    ctx.fillStyle = dim ? '#0F172A' : col + '33';
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.fill(); ctx.stroke();
    tc(ctx, n.label, p.x, p.y, dim ? '#475569' : col, 10, true);

    if (dim) {
      ctx.beginPath(); ctx.arc(p.x, p.y, 16, 0, TWO_PI);
      ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
    }
  });
}

/* ── main draw ────────────────────────────────────────────────────────────── */
function draw(ctx, state, W, H) {
  const idx = state.stepIdx;
  ctx.clearRect(0, 0, W, H);

  if (idx === 0) { drawNaive(ctx, W, H); return; }

  const cx = W / 2, cy = H * 0.48, R = Math.min(W, H) * 0.30;

  const baseNodes = [
    { label: 'P0', angle: -Math.PI / 2,              color: '#4F46E5' },
    { label: 'P1', angle: -Math.PI / 2 + TWO_PI / 3, color: '#10B981' },
    { label: 'P2', angle: -Math.PI / 2 + 2 * TWO_PI / 3, color: '#F59E0B' },
  ];

  const baseKeys = [
    { angle: -Math.PI / 2 + 0.20, ownerColor: '#10B981' },
    { angle: -Math.PI / 2 + 0.60, ownerColor: '#10B981' },
    { angle: -Math.PI / 2 + 1.20, ownerColor: '#F59E0B' },
    { angle: -Math.PI / 2 + 1.70, ownerColor: '#F59E0B' },
    { angle: -Math.PI / 2 + 2.30, ownerColor: '#4F46E5' },
    { angle: -Math.PI / 2 + 2.90, ownerColor: '#4F46E5' },
    { angle: -Math.PI / 2 + 3.50, ownerColor: '#4F46E5' },
    { angle: -Math.PI / 2 + 4.10, ownerColor: '#10B981' },
    { angle: -Math.PI / 2 + 5.00, ownerColor: '#10B981' },
    { angle: -Math.PI / 2 + 5.60, ownerColor: '#10B981' },
    { angle: -Math.PI / 2 + 6.00, ownerColor: '#4F46E5' },
  ];

  if (idx === 1) {
    drawRing(ctx, cx, cy, R, baseNodes, baseKeys, null, null);
    tc(ctx, 'Hash Ring — 0 to 2³²', cx, cy * 0.24, '#94A3B8', 12, false);
    const legend = [
      { col: '#4F46E5', lbl: 'P0 — owns range from P2→P0' },
      { col: '#10B981', lbl: 'P1 — owns range from P0→P1' },
      { col: '#F59E0B', lbl: 'P2 — owns range from P1→P2' },
    ];
    legend.forEach((l, i) => {
      ctx.fillStyle = l.col;
      ctx.beginPath(); ctx.arc(cx - 110, H * 0.87 + i * 18, 5, 0, TWO_PI); ctx.fill();
      ctx.fillStyle = '#94A3B8'; ctx.font = '9px system-ui'; ctx.textAlign = 'left';
      ctx.textBaseline = 'middle'; ctx.fillText(l.lbl, cx - 100, H * 0.87 + i * 18);
    });
  }

  if (idx === 2) {
    // virtual nodes — show each physical node with multiple ring positions
    const vnodeAngles = [
      { base: 0, color: '#4F46E5', label: 'P0' },
      { base: 1, color: '#4F46E5', label: 'P0' },
      { base: 2, color: '#4F46E5', label: 'P0' },
      { base: 3, color: '#10B981', label: 'P1' },
      { base: 4, color: '#10B981', label: 'P1' },
      { base: 5, color: '#10B981', label: 'P1' },
      { base: 6, color: '#F59E0B', label: 'P2' },
      { base: 7, color: '#F59E0B', label: 'P2' },
      { base: 8, color: '#F59E0B', label: 'P2' },
    ];

    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TWO_PI);
    ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 2.5; ctx.stroke();

    vnodeAngles.forEach(v => {
      const ang = -Math.PI / 2 + (v.base / 9) * TWO_PI;
      const p = polar(cx, cy, R, ang);
      ctx.beginPath(); ctx.arc(p.x, p.y, 11, 0, TWO_PI);
      ctx.fillStyle = v.color + '33'; ctx.strokeStyle = v.color; ctx.lineWidth = 1.5;
      ctx.fill(); ctx.stroke();
      tc(ctx, v.label, p.x, p.y, v.color, 8, true);
    });

    tc(ctx, 'Virtual Nodes (3 vnodes per physical node)', cx, cy * 0.24, '#A78BFA', 11, false);
    tc(ctx, '~uniform distribution even with few physical nodes', cx, cy * 0.38, '#64748B', 9, false);
  }

  if (idx === 3) {
    // P4 added between P2 and P0
    const p4Angle = -Math.PI / 2 + TWO_PI * (11 / 12);
    const nodesPlus = [...baseNodes, { label: 'P4', angle: p4Angle, color: '#06B6D4' }];
    const migrateStart = baseNodes[2].angle;
    const migrateEnd   = p4Angle;

    const keys4 = baseKeys.map(k => {
      const inMigrate = k.angle > migrateStart && k.angle < migrateEnd;
      return { ...k, ownerColor: inMigrate ? '#06B6D4' : k.ownerColor };
    });

    drawRing(ctx, cx, cy, R, nodesPlus, keys4, { start: migrateStart, end: migrateEnd }, null);
    tc(ctx, 'P4 joins', cx, cy * 0.24, '#06B6D4', 12, true);

    rr(ctx, cx - 115, H * 0.84, 230, 26, 5, '#06B6D41A', '#06B6D4', 1);
    tc(ctx, '~25% keys migrate  (1/N+1)  — highlighted arc', cx, H * 0.84 + 13, '#06B6D4', 9, false);
  }

  if (idx === 4) {
    // P1 removed
    const nodesNoDead = baseNodes.filter(n => n.label !== 'P1');
    const p1Idx = 1;
    drawRing(ctx, cx, cy, R, baseNodes, baseKeys, null, p1Idx);
    tc(ctx, 'P1 leaves / fails', cx, cy * 0.24, '#EF4444', 12, true);
    tc(ctx, 'P1\'s range shifts to next node clockwise (P2)', cx, cy * 0.38, '#94A3B8', 9, false);

    rr(ctx, cx - 130, H * 0.84, 260, 26, 5, '#EF44441A', '#EF4444', 1);
    tc(ctx, 'Only P1 arc is affected — all other keys untouched', cx, H * 0.84 + 13, '#EF4444', 9, false);
  }
}

/* ── detail panel ─────────────────────────────────────────────────────────── */
function renderDetail(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-family:system-ui;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="margin:0 0 14px;color:#E2E8F0;font-size:15px">How Consistent Hashing Works</h3>
  <p>Both nodes and keys are hashed onto a circular ring of size 2³² (0 to 4,294,967,295). A key is owned by the first node encountered when walking clockwise from its hash position. With N nodes, each owns approximately 1/N of the ring.</p>

  <h3 style="margin:16px 0 10px;color:#E2E8F0;font-size:14px">Key Properties</h3>
  <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:18px">
    <thead><tr style="background:#0F172A">
      <th style="padding:8px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Property</th>
      <th style="padding:8px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Naive Modulo</th>
      <th style="padding:8px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Consistent Hashing</th>
    </tr></thead>
    <tbody>
      ${[
        ['Keys migrated on ±1 node','~100%','~1/N (optimal)'],
        ['Load variance (no vnodes)','Uniform','High (up to 2× mean)'],
        ['Load variance (with vnodes)','—','~±10% with 150+ vnodes'],
        ['Rebalancing cost','Full reshuffle','Proportional to migrated arc'],
        ['Used by','Simple caches','Cassandra, DynamoDB, Redis Cluster, Riak'],
      ].map(([p,m,c]) => `<tr style="border-bottom:1px solid #0F172A">
        <td style="padding:8px;color:#94A3B8">${p}</td>
        <td style="padding:8px;color:#EF4444">${m}</td>
        <td style="padding:8px;color:#10B981">${c}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <h3 style="margin:0 0 10px;color:#E2E8F0;font-size:14px">Virtual Nodes in DynamoDB</h3>
  <p>DynamoDB partitions each item using a composite key: <code style="color:#A78BFA">hash(partition_key)</code>. Internally, the service maps partition-key hashes to storage nodes via consistent hashing with virtual nodes. When you provision more capacity, new vnodes are inserted, pulling traffic from existing nodes until balance is restored — with zero downtime.</p>

  <div style="background:#0F172A;border:1px solid #1E293B;border-radius:6px;padding:12px;font-size:11px;color:#64748B;margin-top:12px">
    <strong style="color:#A78BFA">Prime Day implication:</strong> Consistent hashing means you can horizontally scale DynamoDB capacity by adding partitions during the traffic ramp — only ~1/N of your existing hot keys need to be routed differently. The alternative (fixed shard count) would require offline migration of the full dataset.
  </div>
</div>`;
}

/* ── IQ ──────────────────────────────────────────────────────────────────── */
function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'Why does consistent hashing reduce data migration when a node joins or leaves?',
      a: 'In consistent hashing, each node owns a contiguous arc of the hash ring. When node P4 is inserted, only the keys in the arc between P4\'s predecessor and P4 itself move to P4 — roughly 1/(N+1) of total keys. All other arcs are unchanged. Naive modulo hashing forces a full rehash because changing N changes the bucket assignment for almost every key.',
    },
    {
      q: 'What problem do virtual nodes solve, and what is the trade-off?',
      a: 'With only 3–5 physical nodes, random ring placement yields highly uneven arcs (one node might own 40%, another 15%). Virtual nodes (each physical node gets 150–200 ring positions) smooth this out to within ±10% of the mean. The trade-off: each virtual node must be tracked in the cluster metadata, and more vnodes means more rebalancing messages when a node leaves. Cassandra defaults to 256 vnodes per node.',
    },
    {
      q: 'How does DynamoDB use consistent hashing internally?',
      a: 'DynamoDB hashes the partition key using an internal hash function and maps the result onto a ring of virtual nodes managed by the storage layer. Each partition (a storage unit handling ≤10 GB and ≤3,000 WCU) is assigned to a vnode. When a partition exceeds its capacity limits, DynamoDB splits it — inserting a new vnode into the ring and migrating roughly half the key range. This is transparent to the user and can happen mid-traffic.',
    },
    {
      q: 'When consistent hashing is used with replication factor R, what happens when a node fails?',
      a: 'With replication factor R, each key is written to the R nodes clockwise from its ring position. When a node fails, the next node clockwise already holds a replica and can serve the request immediately — no data migration needed at read time. The failed node\'s range is handled by the successor until a replacement joins. The replacement then receives a copy of the range (read repair or active anti-entropy). In Cassandra this is called "hinted handoff" — the successor stores hints to replay when the failed node recovers.',
    },
  ]);
}

/* ── mount ───────────────────────────────────────────────────────────────── */
export function mount(container) {
  const { tabs, body } = createModuleShell(container, {
    tag: 'Distributed',
    title: 'Consistent Hashing',
    subtitle: 'Why a hash ring minimises key migration when nodes join or leave — the backbone of DynamoDB, Cassandra, and Redis Cluster.',
    tabs: [
      { id: 'anim',   label: 'Ring Animation' },
      { id: 'detail', label: 'Details' },
      { id: 'iq',     label: 'Interview Q&A' },
    ],
  });

  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:420px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);

      const steps = STEPS.map((s, i) => ({
        label: s.label, duration: 2400,
        mutate: st => { st.stepIdx = i; },
      }));

      const engine = new SimulationEngine({
        initialState: { stepIdx: 0 },
        steps,
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
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));

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
