import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

const STEPS = [
  {
    label: 'Naive Modulo Hashing',
    desc: 'Modulo hashing: node = hash(key) % N. Simple and uniform. Fatal flaw: adding or removing a node reassigns ~(N-1)/N of all keys.',
    duration: 2200,
    mutate: st => { st.stepIdx = 0; },
  },
  {
    label: 'Node Added — Catastrophic Rehash',
    desc: 'Adding node 5: hash(key) % 5 ≠ hash(key) % 4 for most keys. Almost all cached data becomes invalid. Cache stampede hits the database.',
    duration: 2200,
    mutate: st => { st.stepIdx = 1; },
  },
  {
    label: 'Consistent Hashing Ring',
    desc: 'Consistent hashing maps keys AND nodes onto a ring [0, 2³²). A key\'s owner is the first node clockwise from the key\'s hash position.',
    duration: 2200,
    mutate: st => { st.stepIdx = 2; },
  },
  {
    label: 'Adding a Node',
    desc: 'Adding Node5: only the keys that fall between Node4\'s predecessor and Node5 move. ~1/N of keys migrate on average — no stampede.',
    duration: 2200,
    mutate: st => { st.stepIdx = 3; },
  },
  {
    label: 'Virtual Nodes',
    desc: 'Virtual nodes (vnodes): each physical server owns multiple ring positions. Balances load even with heterogeneous hardware. DynamoDB uses 256+ tokens per node.',
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
    ctx.textBaseline = 'middle';
    const mx = (fx + tx) / 2, my = (fy + ty) / 2;
    const nx = -(ty - fy), ny = tx - fx;
    const nl = Math.sqrt(nx * nx + ny * ny) || 1;
    ctx.fillText(lbl, mx + nx / nl * 10, my + ny / nl * 10);
  }
  ctx.restore();
}

// Draw a clockwise arc arrow on the hash ring from angleFrom to angleTo (radians)
function ringArc(ctx, cx, cy, R, fromAng, toAng, col, lw) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, fromAng, toAng, false);
  ctx.strokeStyle = col; ctx.lineWidth = lw || 2; ctx.stroke();
  // Arrowhead at toAng
  const tx2 = cx + R * Math.cos(toAng);
  const ty2 = cy + R * Math.sin(toAng);
  const tangentAng = toAng + Math.PI / 2; // tangent direction (clockwise)
  ctx.beginPath();
  ctx.moveTo(tx2, ty2);
  ctx.lineTo(tx2 - 8 * Math.cos(tangentAng - 0.4), ty2 - 8 * Math.sin(tangentAng - 0.4));
  ctx.lineTo(tx2 - 8 * Math.cos(tangentAng + 0.4), ty2 - 8 * Math.sin(tangentAng + 0.4));
  ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  ctx.restore();
}

// Draw a ring segment (filled arc sector strip)
function ringSegment(ctx, cx, cy, R, r2, fromAng, toAng, fill) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, fromAng, toAng, false);
  ctx.arc(cx, cy, r2, toAng, fromAng, true);
  ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  ctx.restore();
}

function nodeCircle(ctx, cx2, cy2, col, label, dim) {
  const alpha = dim ? '66' : 'FF';
  ctx.beginPath(); ctx.arc(cx2, cy2, 18, 0, Math.PI * 2);
  ctx.fillStyle = col + (dim ? '22' : '28'); ctx.fill();
  ctx.strokeStyle = col + (dim ? '44' : ''); ctx.lineWidth = 2; ctx.stroke();
  tc(ctx, label, cx2, cy2, dim ? col + '66' : col, 10, true);
}

// ── draw ───────────────────────────────────────────────────────────────────────
function draw(ctx, state, W, H) {
  const idx = state.stepIdx;
  ctx.clearRect(0, 0, W, H);

  // ─── Step 0: Naive Modulo Hashing ───
  if (idx === 0) {
    const nodes = [
      { id: 'N1', x: W * 0.12, col: '#4F46E5' },
      { id: 'N2', x: W * 0.35, col: '#10B981' },
      { id: 'N3', x: W * 0.58, col: '#F59E0B' },
      { id: 'N4', x: W * 0.81, col: '#A78BFA' },
    ];
    const ny = H * 0.22;
    // Node circles
    nodes.forEach(n => {
      ctx.beginPath(); ctx.arc(n.x, ny, 22, 0, Math.PI * 2);
      ctx.fillStyle = n.col + '28'; ctx.fill();
      ctx.strokeStyle = n.col; ctx.lineWidth = 2; ctx.stroke();
      tc(ctx, n.id, n.x, ny, n.col, 11, true);
    });
    // Formula
    rr(ctx, W / 2 - 110, H * 0.42, 220, 26, 5, '#0F172A', '#4F46E5', 1.5);
    tc(ctx, 'node = hash(key) % 4', W / 2, H * 0.455, '#A5B4FC', 11, false);

    // Keys
    const keys = [
      { id: 'order_1001', hv: '0x3A4F', mod: 1, ti: 1 },
      { id: 'order_5042', hv: '0xB8C2', mod: 2, ti: 2 },
      { id: 'order_9999', hv: '0x71DE', mod: 3, ti: 3 },
    ];
    const kxs = [W * 0.20, W * 0.47, W * 0.74];
    const ky  = H * 0.70;
    keys.forEach((k, i) => {
      const kx  = kxs[i];
      const col = nodes[k.ti].col;
      rr(ctx, kx - 54, ky - 13, 108, 26, 5, col + '18', col, 1.5);
      tc(ctx, k.id, kx, ky - 4, col, 9, true);
      tc(ctx, `h=${k.hv}  →  %4=${k.mod}`, kx, ky + 7, '#64748B', 8, false);
      arr(ctx, kx, ky - 13, nodes[k.ti].x, ny + 22, col);
    });

    rr(ctx, W * 0.22, H * 0.88, W * 0.56, 20, 4, '#EF444418', '#EF4444', 1);
    tc(ctx, 'Adding/removing a node changes ~(N-1)/N assignments', W / 2, H * 0.89, '#EF4444', 9, true);
  }

  // ─── Step 1: Catastrophic Rehash ───
  if (idx === 1) {
    const nodes4 = [
      { id: 'N1', x: W * 0.10, col: '#4F46E5' },
      { id: 'N2', x: W * 0.28, col: '#10B981' },
      { id: 'N3', x: W * 0.46, col: '#F59E0B' },
      { id: 'N4', x: W * 0.64, col: '#A78BFA' },
    ];
    const n5 = { id: 'N5', x: W * 0.82, col: '#EC4899' };
    const ny = H * 0.22;

    nodes4.forEach(n => {
      ctx.beginPath(); ctx.arc(n.x, ny, 20, 0, Math.PI * 2);
      ctx.fillStyle = n.col + '28'; ctx.fill();
      ctx.strokeStyle = n.col; ctx.lineWidth = 2; ctx.stroke();
      tc(ctx, n.id, n.x, ny, n.col, 10, true);
    });
    // N5 new (glowing)
    ctx.save();
    ctx.shadowColor = n5.col; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(n5.x, ny, 20, 0, Math.PI * 2);
    ctx.fillStyle = n5.col + '28'; ctx.fill();
    ctx.strokeStyle = n5.col; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();
    tc(ctx, n5.id, n5.x, ny, n5.col, 10, true);
    rr(ctx, n5.x - 26, ny - 36, 52, 16, 4, '#EC489922', '#EC4899', 1);
    tc(ctx, 'NEW', n5.x, ny - 28, '#EC4899', 8, true);

    // Old arrows crossed out → new dashed
    const keys = [
      { id: 'order_1001', old: 1, nw: 1 },
      { id: 'order_5042', old: 2, nw: 3 },
      { id: 'order_9999', old: 3, nw: 4 },
    ];
    const kxs = [W * 0.10, W * 0.37, W * 0.64];
    const ky  = H * 0.65;
    const allNodes = [...nodes4, n5];

    keys.forEach((k, i) => {
      const kx   = kxs[i];
      const oldN = nodes4[k.old];
      const newN = allNodes[k.nw];
      const changed = k.old !== k.nw;

      rr(ctx, kx - 44, ky - 12, 88, 24, 5, '#1E293B', '#334155', 1);
      tc(ctx, k.id, kx, ky, '#CBD5E1', 8, false);

      if (changed) {
        // Old line with X
        ctx.save();
        ctx.globalAlpha = 0.35;
        arr(ctx, kx, ky - 12, oldN.x, ny + 20, oldN.col);
        ctx.restore();
        // Red X over old line mid-point
        const mx = (kx + oldN.x) / 2, my = (ky + ny) / 2;
        tc(ctx, '✕', mx, my, '#EF4444', 14, true);
        // New dashed
        arr(ctx, kx, ky - 12, newN.x, ny + 20, newN.col, null, true);
      } else {
        arr(ctx, kx, ky - 12, oldN.x, ny + 20, oldN.col);
      }
    });

    // Badge
    rr(ctx, W / 2 - 90, H * 0.86, 180, 24, 6, '#EF444422', '#EF4444', 1.5);
    tc(ctx, '≈80% keys reassigned!', W / 2, H * 0.875, '#EF4444', 11, true);
  }

  // ─── Step 2: Consistent Hashing Ring ───
  if (idx === 2) {
    const cx2 = W / 2, cy2 = H * 0.46;
    const R   = Math.min(W, H) * 0.33;

    // Ring
    ctx.beginPath(); ctx.arc(cx2, cy2, R, 0, Math.PI * 2);
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 22; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx2, cy2, R, 0, Math.PI * 2);
    ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 18; ctx.stroke();

    // Label ring
    tc(ctx, '0', cx2 + R + 14, cy2, '#64748B', 9, false);
    tc(ctx, '2³²', cx2 + R + 14, cy2 + 10, '#64748B', 8, false);

    // Nodes at 0°, 120°, 240° (in radians: 0, 2π/3, 4π/3)
    const nodeDefs = [
      { id: 'N1', ang: 0,              col: '#4F46E5', label: '0°' },
      { id: 'N2', ang: (2 * Math.PI) / 3, col: '#10B981', label: '120°' },
      { id: 'N3', ang: (4 * Math.PI) / 3, col: '#F59E0B', label: '240°' },
    ];

    nodeDefs.forEach(n => {
      const nx2 = cx2 + R * Math.cos(n.ang);
      const ny2 = cy2 + R * Math.sin(n.ang);
      nodeCircle(ctx, nx2, ny2, n.col, n.id, false);
      // Angle label
      const labR = R + 34;
      tc(ctx, n.label, cx2 + labR * Math.cos(n.ang), cy2 + labR * Math.sin(n.ang), '#64748B', 8, false);
    });

    // 5 key dots at various angles
    const keyAngs = [0.6, 1.5, 2.4, 3.8, 5.2];
    const keyCols = ['#4F46E5', '#4F46E5', '#10B981', '#F59E0B', '#F59E0B'];
    keyAngs.forEach((a, i) => {
      const kx2 = cx2 + R * Math.cos(a);
      const ky2 = cy2 + R * Math.sin(a);
      ctx.beginPath(); ctx.arc(kx2, ky2, 6, 0, Math.PI * 2);
      ctx.fillStyle = keyCols[i] + 'AA'; ctx.fill();
      ctx.strokeStyle = keyCols[i]; ctx.lineWidth = 1.5; ctx.stroke();
      tc(ctx, `k${i + 1}`, kx2, ky2, '#fff', 7, true);

      // Clockwise arc to successor
      const succNode = nodeDefs.find(n => n.ang > a) || nodeDefs[0];
      const toAng = succNode.ang === 0 ? Math.PI * 2 : succNode.ang;
      const arcTo = succNode.ang <= a ? succNode.ang + Math.PI * 2 : succNode.ang;
      ringArc(ctx, cx2, cy2, R - 12, a, arcTo > Math.PI * 2 ? arcTo - Math.PI * 2 : arcTo, keyCols[i] + '88', 1.5);
    });

    tc(ctx, 'Key → first node clockwise', cx2, cy2, '#64748B', 9, false);
  }

  // ─── Step 3: Adding a Node ───
  if (idx === 3) {
    const cx2 = W / 2, cy2 = H * 0.46;
    const R   = Math.min(W, H) * 0.33;

    ctx.beginPath(); ctx.arc(cx2, cy2, R, 0, Math.PI * 2);
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 22; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx2, cy2, R, 0, Math.PI * 2);
    ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 18; ctx.stroke();

    const nodeDefs = [
      { id: 'N1', ang: 0,                col: '#4F46E5' },
      { id: 'N2', ang: (Math.PI * 2) / 3,  col: '#10B981' },
      { id: 'N3', ang: (Math.PI * 4) / 3,  col: '#F59E0B' },
    ];
    // New N5 between N2 (120°) and N3 (240°), placed at 180°
    const n5ang = Math.PI; // 180°

    nodeDefs.forEach(n => {
      const nx2 = cx2 + R * Math.cos(n.ang);
      const ny2 = cy2 + R * Math.sin(n.ang);
      nodeCircle(ctx, nx2, ny2, n.col, n.id, false);
    });

    // Highlight migration arc: from N2 (120°) to N5 (180°) in amber
    ringSegment(ctx, cx2, cy2, R + 10, R - 10,
      (Math.PI * 2) / 3, Math.PI, '#F59E0B33');
    // Migration arc outline
    ctx.beginPath();
    ctx.arc(cx2, cy2, R, (Math.PI * 2) / 3, Math.PI, false);
    ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 3; ctx.stroke();

    // N5 new
    const n5x = cx2 + R * Math.cos(n5ang);
    const n5y = cy2 + R * Math.sin(n5ang);
    ctx.save();
    ctx.shadowColor = '#EC4899'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(n5x, n5y, 18, 0, Math.PI * 2);
    ctx.fillStyle = '#EC489928'; ctx.fill();
    ctx.strokeStyle = '#EC4899'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();
    tc(ctx, 'N5', n5x, n5y, '#EC4899', 10, true);
    tc(ctx, 'NEW', n5x, n5y - 30, '#EC4899', 8, true);

    // Keys in migration arc
    const migKeyAngs = [2.3, 2.7, 3.0];
    migKeyAngs.forEach((a, i) => {
      const kx2 = cx2 + R * Math.cos(a);
      const ky2 = cy2 + R * Math.sin(a);
      ctx.beginPath(); ctx.arc(kx2, ky2, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#F59E0B88'; ctx.fill();
      ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 1.5; ctx.stroke();
      tc(ctx, `k${i}`, kx2, ky2, '#fff', 7, true);
    });

    rr(ctx, cx2 - 110, cy2, 220, 22, 5, '#0F172A', '#F59E0B', 1);
    tc(ctx, '~1/N keys migrate (arc N2 → N5 only)', cx2, cy2 + 11, '#F59E0B', 9, true);
  }

  // ─── Step 4: Virtual Nodes ───
  if (idx === 4) {
    const cx2 = W / 2, cy2 = H * 0.44;
    const R   = Math.min(W, H) * 0.32;

    ctx.beginPath(); ctx.arc(cx2, cy2, R, 0, Math.PI * 2);
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 22; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx2, cy2, R, 0, Math.PI * 2);
    ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 18; ctx.stroke();

    // 3 physical nodes, 3 vnodes each (interleaved at 40° spacing)
    // N1=indigo: 10°, 130°, 250°
    // N2=green:  50°, 170°, 290°
    // N3=amber:  90°, 210°, 330°
    const toRad = d => (d * Math.PI) / 180;
    const vnodes = [
      { phys: 'N1', col: '#4F46E5', angs: [10, 130, 250] },
      { phys: 'N2', col: '#10B981', angs: [50, 170, 290] },
      { phys: 'N3', col: '#F59E0B', angs: [90, 210, 330] },
    ];

    // Draw colored arc segments between consecutive vnodes
    const allTokens = [];
    vnodes.forEach(v => {
      v.angs.forEach(a => allTokens.push({ ang: toRad(a), col: v.col, phys: v.phys }));
    });
    allTokens.sort((a, b) => a.ang - b.ang);

    allTokens.forEach((tok, i) => {
      const nextTok = allTokens[(i + 1) % allTokens.length];
      const endAng  = i < allTokens.length - 1 ? nextTok.ang : nextTok.ang + Math.PI * 2;
      ringSegment(ctx, cx2, cy2, R + 9, R - 9, tok.ang, endAng, tok.col + '33');
      ctx.beginPath();
      ctx.arc(cx2, cy2, R, tok.ang, endAng, false);
      ctx.strokeStyle = tok.col + '88'; ctx.lineWidth = 3; ctx.stroke();
    });

    // Vnode dots
    vnodes.forEach(v => {
      v.angs.forEach(a => {
        const ang = toRad(a);
        const vx  = cx2 + R * Math.cos(ang);
        const vy  = cy2 + R * Math.sin(ang);
        ctx.beginPath(); ctx.arc(vx, vy, 8, 0, Math.PI * 2);
        ctx.fillStyle   = v.col; ctx.fill();
        ctx.strokeStyle = '#0A0F1A'; ctx.lineWidth = 1.5; ctx.stroke();
        tc(ctx, v.phys, vx + Math.cos(ang) * 18, vy + Math.sin(ang) * 18, v.col, 8, true);
      });
    });

    // Legend
    const lgx = W * 0.06, lgy = H * 0.82;
    rr(ctx, lgx - 6, lgy - 6, 170, vnodes.length * 17 + 8, 5, '#0F172A', '#1E293B', 1);
    vnodes.forEach((v, i) => {
      ctx.fillStyle = v.col; ctx.fillRect(lgx, lgy + i * 17, 8, 8);
      tc(ctx, `${v.phys}: tokens at ${v.angs.join('°, ')}°`, lgx + 90, lgy + i * 17 + 4, '#94A3B8', 8, false);
    });

    rr(ctx, cx2 - 120, cy2 - 10, 240, 20, 5, '#0F172A', '#64748B', 1);
    tc(ctx, '3 vnodes per server → balanced load distribution', cx2, cy2, '#64748B', 9, false);
  }
}

// ── detail panel ──────────────────────────────────────────────────────────────
function renderDetail(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="color:#E2E8F0;margin:0 0 14px">Hash Partitioning Deep Dive</h3>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin-bottom:20px">
    ${[
      ['Modulo Hashing', 'node = hash(key) % N. Works perfectly at steady state. Catastrophic during scaling: changing N from 4 to 5 rehashes (N-1)/N ≈ 80% of keys. Cache invalidation + DB flood = cache stampede.', '#4F46E5'],
      ['Consistent Hashing', 'Both keys and nodes are mapped onto a ring [0, 2³²). A key\'s owner is the first node clockwise. Adding node N5 only moves keys in the arc between N5\'s predecessor and N5: ~1/N of total keys.', '#10B981'],
      ['Virtual Nodes (Vnodes)', 'Each physical server owns multiple positions on the ring. With k vnodes per server, each real node owns k arcs. Failing node\'s load spreads across many servers instead of one. Cassandra defaults to 256 vnodes.', '#F59E0B'],
      ['Jump Hash', 'Google\'s O(ln N) alternative to ring hashing. Maps a key to bucket in [0, N) using only integer arithmetic — no ring, no vnodes needed. Used in Guava. Deterministic, no metadata needed. Downside: only supports adding to the end.', '#A78BFA'],
      ['Rendezvous Hashing', 'Each key hashes against every server name; server with highest score wins. Simple, O(N) lookup. Adding a server only moves 1/N keys. Used in routing layers. Expensive at large N.', '#06B6D4'],
      ['Cache Stampede', 'When modulo hash changes, most cache keys miss simultaneously. All misses hit the database at once. Mitigations: lock per key (dog-pile prevention), probabilistic early expiration, or soft TTL with stale serving.', '#EF4444'],
    ].map(([t, d, col]) => `
      <div style="background:#0F172A;border-radius:8px;padding:14px 16px;border-left:3px solid ${col}">
        <div style="color:${col};font-weight:700;font-size:12px;margin-bottom:6px">${t}</div>
        <div style="font-size:11px;color:#94A3B8">${d}</div>
      </div>`).join('')}
  </div>
  <div style="background:#172554;border-left:3px solid #4F46E5;padding:12px 16px;border-radius:0 6px 6px 0;font-size:12px">
    <strong style="color:#818CF8">DynamoDB implementation:</strong> Each partition is identified by a hash key and owns a contiguous range of the hash space.
    DynamoDB uses 256+ virtual tokens per physical partition host.
    When a partition is split (because it exceeded 10 GB or its write throughput limit), the token range is divided and one half migrates to a new host — touching no other partitions.
  </div>
</div>`;
}

// ── IQ panel ──────────────────────────────────────────────────────────────────
function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'What is consistent hashing and why does it solve the modulo rehashing problem?',
      a: 'Consistent hashing places both keys and nodes on a virtual ring [0, 2³²). A key\'s node is determined by scanning clockwise from the key\'s hash position until the first node is found. When N changes by 1 (a node is added or removed), only the keys that fall in the arc owned by that node need to move — approximately 1/N of all keys. With naive modulo hashing, changing from N to N+1 reshuffles (N-1)/N ≈ 80% of keys because most hash(k) % N values differ from hash(k) % (N+1). Consistent hashing preserves ~(N-1)/N of assignments intact.',
      tip: 'Common follow-up: "What is the downside of basic consistent hashing?" Answer: uneven load distribution when nodes are few. Fix: virtual nodes.',
    },
    {
      q: 'How do virtual nodes improve load balance in consistent hashing?',
      a: 'With only a handful of physical nodes, the arc lengths between them can be highly unequal — one node might own 40% of the ring while another owns 10%. Virtual nodes (vnodes) assign each physical server K positions distributed around the ring. The server\'s load is now the sum of K small arcs rather than 1 large arc. With enough vnodes, arc lengths converge to 1/N even if the underlying token positions are randomly placed. Cassandra uses 256 vnodes per node by default. DynamoDB\'s internal system uses hundreds of tokens per partition host. A failing node\'s load also spreads across O(K) other servers instead of being dumped entirely on one neighbor.',
    },
    {
      q: 'What is a cache stampede and how does it relate to modulo hashing?',
      a: 'A cache stampede (also called dog-pile or thundering herd) occurs when many cache keys expire or are invalidated simultaneously, causing all their requests to fall through to the database at the same time. When N changes in a modulo-hashed cache cluster, ~80% of keys become invalid all at once. Mitigations: (1) Mutex/lock per key so only one request fetches from DB while others wait for the cached result. (2) Probabilistic early expiration — re-fetch the key before it actually expires by returning stale data with a probability proportional to how close to expiry it is. (3) Consistent hashing — so only ~1/N of keys are invalidated during a scaling event. (4) Read-through caching layers with circuit breakers.',
    },
  ]);
}

// ── mount ─────────────────────────────────────────────────────────────────────
export function mount(container) {
  const { tabs, body } = createModuleShell(container, {
    tag: 'Distributed',
    title: 'Hash Partitioning',
    subtitle: 'Modulo hashing, consistent hashing rings, and virtual nodes — from stampedes to safe scaling.',
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
