import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

const STEPS = [
  {
    label: 'Normal Operation',
    desc: 'All 6 nodes communicate freely. The leader (N1) replicates every write to followers. Clients see consistent data. Latency is low.',
  },
  {
    label: 'Network Partition Occurs',
    desc: 'A network fault splits the cluster: Group A (N1, N2, N3) and Group B (N4, N5, N6) can no longer communicate. Messages sent across the partition are dropped silently.',
  },
  {
    label: 'Group A Keeps the Leader',
    desc: 'N1 still has majority (3/6) and continues accepting writes. Group B has no leader. N4 times out and starts an election — but it can only reach N5 and N6 (2 votes), not a majority of 6, so no leader is elected in Group B.',
  },
  {
    label: 'Divergence (if no quorum)',
    desc: 'If the system uses quorum=1 (like async MySQL replication), Group B might elect a local leader and accept writes — leading to conflicting data on both sides. Strong quorum prevents this: only Group A makes progress.',
  },
  {
    label: 'Partition Heals',
    desc: 'Network recovers. Group B reconnects. Nodes N4–N6 roll back any uncommitted divergent state and sync from N1\'s log. Committed data in Group A is never lost. Diverged writes in Group B are discarded.',
  },
];

/* ── helpers ─────────────────────────────────────────────────────────────── */
function rr(ctx, x, y, w, h, r, fill, stroke, lw) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  if (fill)   { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1.5; ctx.stroke(); }
}
function tc(ctx, t, x, y, col, size, bold) {
  ctx.save();
  ctx.fillStyle = col; ctx.font = `${bold ? '600 ' : ''}${size || 11}px system-ui,sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, x, y); ctx.restore();
}
function tl(ctx, t, x, y, col, size) {
  ctx.save();
  ctx.fillStyle = col; ctx.font = `${size || 10}px system-ui,sans-serif`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(t, x, y); ctx.restore();
}

function drawNode(ctx, x, y, label, role, status) {
  const col = role === 'leader' ? '#10B981' : role === 'candidate' ? '#F59E0B' : '#4F46E5';
  const dim = status === 'dim';
  const err = status === 'split';

  ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2);
  ctx.fillStyle = dim ? '#0F172A' : col + '22';
  ctx.strokeStyle = err ? '#EF4444' : (dim ? '#334155' : col);
  ctx.lineWidth = err ? 2 : 1.5;
  ctx.fill(); ctx.stroke();

  tc(ctx, label, x, y - 4, dim ? '#475569' : col, 10, true);
  const roleStr = role === 'leader' ? 'LDR' : role === 'candidate' ? 'CAND' : 'FLW';
  tc(ctx, roleStr, x, y + 7, dim ? '#334155' : col, 7, false);
}

function drawLink(ctx, x1, y1, x2, y2, col, dashed) {
  ctx.save();
  if (dashed) ctx.setLineDash([5, 5]);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
  ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.setLineDash([]); ctx.restore();
}

function drawPacket(ctx, x, y, col) {
  rr(ctx, x - 5, y - 5, 10, 10, 2, col + '55', col, 1);
}

/* ── node layout ─────────────────────────────────────────────────────────── */
function nodeLayout(W, H) {
  const midY = H * 0.48;
  const grpW = W * 0.30;
  const grpH = H * 0.35;
  const lx = W * 0.20, rx = W * 0.80;
  return [
    // Group A: left side (N1 leader, N2, N3)
    { id: 1, x: lx,             y: midY - grpH * 0.4, group: 'A', defRole: 'leader' },
    { id: 2, x: lx - grpW * 0.4, y: midY + grpH * 0.3, group: 'A', defRole: 'follower' },
    { id: 3, x: lx + grpW * 0.4, y: midY + grpH * 0.3, group: 'A', defRole: 'follower' },
    // Group B: right side
    { id: 4, x: rx,             y: midY - grpH * 0.4, group: 'B', defRole: 'follower' },
    { id: 5, x: rx - grpW * 0.4, y: midY + grpH * 0.3, group: 'B', defRole: 'follower' },
    { id: 6, x: rx + grpW * 0.4, y: midY + grpH * 0.3, group: 'B', defRole: 'follower' },
  ];
}

function drawPartitionWall(ctx, W, H) {
  const mx = W / 2;
  ctx.save();
  ctx.setLineDash([8, 5]);
  ctx.beginPath(); ctx.moveTo(mx, H * 0.12); ctx.lineTo(mx, H * 0.88);
  ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 2; ctx.globalAlpha = 0.6; ctx.stroke();
  ctx.globalAlpha = 1; ctx.setLineDash([]);

  tc(ctx, '✕', mx, H * 0.48, '#EF4444', 16, true);
  rr(ctx, mx - 60, H * 0.12, 120, 20, 4, '#7F1D1D22', '#EF4444', 1);
  tc(ctx, 'NETWORK PARTITION', mx, H * 0.12 + 10, '#EF4444', 8, true);
  ctx.restore();
}

/* ── main draw ────────────────────────────────────────────────────────────── */
function draw(ctx, state, W, H) {
  const idx = state.stepIdx;
  ctx.clearRect(0, 0, W, H);

  const nodes = nodeLayout(W, H);

  // ── Step 0: Normal ──
  if (idx === 0) {
    // cross-links
    [0, 1, 2].forEach(a => [3, 4, 5].forEach(b => {
      drawLink(ctx, nodes[a].x, nodes[a].y, nodes[b].x, nodes[b].y, '#1E293B', false);
    }));
    [0, 1, 2].forEach(a => [1, 2].filter(b => b > a && b < 3).forEach(b => {
      drawLink(ctx, nodes[a].x, nodes[a].y, nodes[b].x, nodes[b].y, '#4F46E5', false);
    }));
    [3, 4, 5].forEach(a => [4, 5].filter(b => b > a).forEach(b => {
      drawLink(ctx, nodes[a].x, nodes[a].y, nodes[b].x, nodes[b].y, '#4F46E5', false);
    }));
    nodes.forEach(n => drawNode(ctx, n.x, n.y, `N${n.id}`, n.defRole, 'normal'));
    tc(ctx, 'All nodes connected  |  N1 = Leader', W / 2, H * 0.88, '#10B981', 10, false);
  }

  // ── Step 1: Partition appears ──
  if (idx === 1) {
    // intra-group links
    drawLink(ctx, nodes[0].x, nodes[0].y, nodes[1].x, nodes[1].y, '#4F46E5');
    drawLink(ctx, nodes[0].x, nodes[0].y, nodes[2].x, nodes[2].y, '#4F46E5');
    drawLink(ctx, nodes[1].x, nodes[1].y, nodes[2].x, nodes[2].y, '#4F46E5');
    drawLink(ctx, nodes[3].x, nodes[3].y, nodes[4].x, nodes[4].y, '#4F46E5');
    drawLink(ctx, nodes[3].x, nodes[3].y, nodes[5].x, nodes[5].y, '#4F46E5');
    drawLink(ctx, nodes[4].x, nodes[4].y, nodes[5].x, nodes[5].y, '#4F46E5');
    // cross-links show dropped
    drawLink(ctx, nodes[0].x, nodes[0].y, nodes[3].x, nodes[3].y, '#EF444455', true);
    drawPartitionWall(ctx, W, H);
    nodes.forEach(n => drawNode(ctx, n.x, n.y, `N${n.id}`, n.defRole, 'normal'));
    rr(ctx, W * 0.10, H * 0.12, W * 0.25, 22, 4, '#1E293B', '#4F46E5', 1);
    tc(ctx, 'Group A', W * 0.225, H * 0.12 + 11, '#4F46E5', 10, true);
    rr(ctx, W * 0.65, H * 0.12, W * 0.25, 22, 4, '#1E293B', '#EF4444', 1);
    tc(ctx, 'Group B', W * 0.775, H * 0.12 + 11, '#EF4444', 10, true);
  }

  // ── Step 2: Group A continues, B can't elect ──
  if (idx === 2) {
    drawLink(ctx, nodes[0].x, nodes[0].y, nodes[1].x, nodes[1].y, '#10B981');
    drawLink(ctx, nodes[0].x, nodes[0].y, nodes[2].x, nodes[2].y, '#10B981');
    drawLink(ctx, nodes[1].x, nodes[1].y, nodes[2].x, nodes[2].y, '#4F46E5');
    drawLink(ctx, nodes[3].x, nodes[3].y, nodes[4].x, nodes[4].y, '#F59E0B', true);
    drawLink(ctx, nodes[3].x, nodes[3].y, nodes[5].x, nodes[5].y, '#F59E0B', true);
    drawLink(ctx, nodes[4].x, nodes[4].y, nodes[5].x, nodes[5].y, '#4F46E5');
    drawPartitionWall(ctx, W, H);
    nodes.slice(0, 3).forEach(n => drawNode(ctx, n.x, n.y, `N${n.id}`, n.defRole, 'normal'));
    drawNode(ctx, nodes[3].x, nodes[3].y, 'N4', 'candidate', 'split');
    drawNode(ctx, nodes[4].x, nodes[4].y, 'N5', 'follower', 'normal');
    drawNode(ctx, nodes[5].x, nodes[5].y, 'N6', 'follower', 'normal');

    rr(ctx, W * 0.05, H * 0.82, W * 0.36, 22, 4, '#10B9811A', '#10B981', 1);
    tc(ctx, 'Group A: writes accepted (majority=3)', W * 0.23, H * 0.82 + 11, '#10B981', 9, false);
    rr(ctx, W * 0.59, H * 0.82, W * 0.36, 22, 4, '#EF44441A', '#EF4444', 1);
    tc(ctx, 'Group B: no quorum — election fails', W * 0.77, H * 0.82 + 11, '#EF4444', 9, false);
  }

  // ── Step 3: Divergence ──
  if (idx === 3) {
    drawPartitionWall(ctx, W, H);
    nodes.slice(0, 3).forEach(n => drawNode(ctx, n.x, n.y, `N${n.id}`, n.defRole, 'normal'));
    nodes.slice(3).forEach(n => drawNode(ctx, n.x, n.y, `N${n.id}`, n.id === 4 ? 'leader' : 'follower', 'split'));

    // Write A
    rr(ctx, W * 0.05, H * 0.76, W * 0.33, 30, 5, '#10B9811A', '#10B981', 1);
    tc(ctx, 'A writes: order_9 → shipped', W * 0.215, H * 0.76 + 9, '#10B981', 9, false);
    tc(ctx, '(quorum=3 ✓  committed)', W * 0.215, H * 0.76 + 21, '#10B981', 8, false);

    // Write B (conflict)
    rr(ctx, W * 0.62, H * 0.76, W * 0.33, 30, 5, '#EF44441A', '#EF4444', 1);
    tc(ctx, 'B writes: order_9 → cancelled', W * 0.785, H * 0.76 + 9, '#EF4444', 9, false);
    tc(ctx, '(no quorum → DIVERGED)', W * 0.785, H * 0.76 + 21, '#EF4444', 8, false);

    rr(ctx, W / 2 - 100, H * 0.12, 200, 20, 4, '#7F1D1D22', '#EF4444', 1);
    tc(ctx, 'SPLIT-BRAIN if both accept writes', W / 2, H * 0.12 + 10, '#EF4444', 8, true);
  }

  // ── Step 4: Partition heals ──
  if (idx === 4) {
    [0, 1, 2].forEach(a => [3, 4, 5].forEach(b => {
      drawLink(ctx, nodes[a].x, nodes[a].y, nodes[b].x, nodes[b].y, '#10B981', false);
    }));
    nodes.forEach(n => drawNode(ctx, n.x, n.y, `N${n.id}`, n.id === 1 ? 'leader' : 'follower', 'normal'));

    // Sync arrow from N1 to B group
    tc(ctx, 'sync log →', W * 0.60, nodes[0].y, '#10B981', 9, false);

    rr(ctx, W / 2 - 145, H * 0.84, 290, 28, 5, '#10B9811A', '#10B981', 1);
    tc(ctx, 'N4–N6 roll back diverged state  |  sync from N1  |  cluster consistent', W / 2, H * 0.84 + 14, '#10B981', 9, false);
  }
}

/* ── detail ──────────────────────────────────────────────────────────────── */
function renderDetail(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-family:system-ui;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="margin:0 0 14px;color:#E2E8F0;font-size:15px">CAP Theorem Under a Network Partition</h3>
  <p>The CAP theorem states that during a network partition (P), a distributed system must choose between Consistency (C) and Availability (A).</p>

  <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:18px">
    <thead><tr style="background:#0F172A">
      <th style="padding:8px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Choice</th>
      <th style="padding:8px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Behaviour during partition</th>
      <th style="padding:8px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Example</th>
    </tr></thead>
    <tbody>
      ${[
        ['CP (Raft / Paxos)', 'Minority partition becomes unavailable. Writes blocked until quorum. No stale reads.', 'etcd, ZooKeeper, HBase'],
        ['AP (Dynamo-style)', 'Both partitions stay available. Risk of divergent writes. Reconcile on heal.', 'DynamoDB (eventually consistent), Cassandra'],
        ['PA/EL (CockroachDB)', 'Short-circuits with bounded staleness, then blocks. Best-effort.', 'CockroachDB, Spanner'],
      ].map(([c, b, e]) => `<tr style="border-bottom:1px solid #0F172A">
        <td style="padding:8px;color:#A78BFA;font-weight:600">${c}</td>
        <td style="padding:8px">${b}</td>
        <td style="padding:8px;color:#64748B;font-size:11px">${e}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <h3 style="margin:0 0 10px;color:#E2E8F0;font-size:14px">Prime Day Perspective</h3>
  <div style="background:#1C0A0A;border:1px solid #7F1D1D;border-radius:6px;padding:12px;font-size:12px">
    DynamoDB runs across multiple AZs. An AZ network event is effectively a partial partition. DynamoDB's quorum writes (typically 2-of-3 AZs) ensure CP behaviour for the majority — isolated replicas stop accepting writes rather than risk divergence. Your order data is consistent at the cost of higher write latency during the event, not stale data.
  </div>
</div>`;
}

/* ── IQ ──────────────────────────────────────────────────────────────────── */
function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'What happens to a Raft cluster when the majority partition loses connectivity?',
      a: 'The minority partition (containing the current leader) loses quorum — it stops processing writes after it can no longer confirm a majority for new log entries. The majority partition elects a new leader and continues. When connectivity restores, the old leader (now isolated) discovers a higher term, steps down, and syncs its log from the new leader. No committed data is lost because committed entries existed on a majority before the partition.',
    },
    {
      q: 'How does DynamoDB handle a network partition between availability zones?',
      a: 'DynamoDB stores three replicas of each partition across three AZs. A write must succeed on 2 of 3 replicas (quorum). If one AZ is isolated, the remaining two AZs form a quorum and continue accepting writes. The isolated AZ replica becomes stale and will sync on recovery. If 2 AZs are isolated — extremely rare — writes fail with a service error rather than accepting data that cannot be durably replicated. This is CP behaviour at the AZ level.',
    },
    {
      q: 'What is the PACELC model and how does it extend CAP?',
      a: 'CAP only describes behaviour during a partition (P). PACELC adds the normal case: Else (no partition), does the system favour Latency (L) or Consistency (C)? A CP system under partition might still offer tunable staleness for lower latency in normal operation. For example, Cassandra is PA/EL — it chooses Availability under partition and Latency in normal operation (eventual consistency by default). Spanner is PC/EC — it sacrifices availability under partition and accepts higher latency normally to guarantee linearisability.',
    },
  ]);
}

/* ── mount ───────────────────────────────────────────────────────────────── */
export function mount(container) {
  const { tabs, body } = createModuleShell(container, {
    tag: 'Distributed',
    title: 'Network Partitions',
    subtitle: 'What happens when nodes can\'t talk to each other — CAP theorem in practice across DynamoDB, etcd, and Cassandra.',
    tabs: [
      { id: 'anim',   label: 'Partition Animation' },
      { id: 'detail', label: 'CAP Details' },
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
