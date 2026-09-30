import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

const STEPS = [
  {
    label: 'Single Leader — Healthy',
    desc: 'One leader node holds the lock/lease. All followers know who the leader is. Writes go through the leader only. Fencing token = 33 (monotonically increasing).',
  },
  {
    label: 'GC Pause on Leader',
    desc: 'Leader L1 enters a long GC pause (50–150 s in Java). Its lease expires on the coordination service, but L1 doesn\'t know it yet — it wakes up thinking it\'s still the leader.',
  },
  {
    label: 'New Leader Elected (L2)',
    desc: 'A follower (L2) wins the new election. The fencing token increments to 34. L2 is now the legitimate leader. L1 is still waking up from GC, unaware.',
  },
  {
    label: 'Split-Brain — Two Leaders',
    desc: 'L1 wakes from GC and tries to write with its stale token (33). Without fencing, the storage server accepts both. Data corruption: two leaders believe they own the same resource.',
  },
  {
    label: 'Fencing Token Prevents Split-Brain',
    desc: 'Storage server rejects writes with token ≤ the last seen token (33 < 34 → rejected). L1\'s stale writes are blocked. Only L2 with token 34 can write. Split-brain resolved.',
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
function arr(ctx, fx, fy, tx, ty, col, lbl, dashed) {
  ctx.save();
  if (dashed) ctx.setLineDash([5, 4]);
  ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty);
  ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
  const ang = Math.atan2(ty - fy, tx - fx);
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx - 9 * Math.cos(ang - 0.4), ty - 9 * Math.sin(ang - 0.4));
  ctx.lineTo(tx - 9 * Math.cos(ang + 0.4), ty - 9 * Math.sin(ang + 0.4));
  ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  if (lbl) {
    ctx.fillStyle = col; ctx.font = '9px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(lbl, (fx + tx) / 2, Math.min(fy, ty) - 3);
  }
  ctx.restore();
}

function drawLeaderBox(ctx, x, y, label, token, status) {
  const col   = status === 'stale'  ? '#F59E0B'
               : status === 'dead'  ? '#334155'
               : status === 'split' ? '#EF4444'
               : '#10B981';
  const w = 110, h = 64;

  rr(ctx, x - w / 2, y - h / 2, w, h, 8, col + '1A', col, 2);

  tc(ctx, label, x, y - 14, col, 12, true);
  tc(ctx, `token: ${token}`, x, y + 2, col, 9, false);

  const statusText = status === 'stale' ? '⏸ GC PAUSE' : status === 'dead' ? '✕ EXPIRED' : status === 'split' ? '⚠ STALE' : '✓ LEADER';
  tc(ctx, statusText, x, y + 16, col, 8, true);
}

function drawStorage(ctx, x, y, lastToken, accepted, rejected) {
  const w = 120, h = 70;
  rr(ctx, x - w / 2, y - h / 2, w, h, 8, '#0F172A', '#334155', 1.5);
  tc(ctx, '🗄  Storage', x, y - 20, '#94A3B8', 10, true);
  tc(ctx, `last_token: ${lastToken}`, x, y - 4, '#64748B', 9, false);
  if (accepted) {
    rr(ctx, x - 46, y + 8, 92, 18, 4, '#10B9811A', '#10B981', 1);
    tc(ctx, `✓ accepted (${accepted})`, x, y + 17, '#10B981', 8, true);
  }
  if (rejected) {
    rr(ctx, x - 46, y + 8, 92, 18, 4, '#EF44441A', '#EF4444', 1);
    tc(ctx, `✗ rejected (${rejected})`, x, y + 17, '#EF4444', 8, true);
  }
}

function drawCoord(ctx, x, y, currentLeader, token) {
  const w = 130, h = 58;
  rr(ctx, x - w / 2, y - h / 2, w, h, 8, '#A78BFA1A', '#A78BFA', 1.5);
  tc(ctx, 'ZooKeeper / etcd', x, y - 14, '#A78BFA', 10, true);
  tc(ctx, `leader: ${currentLeader}`, x, y + 2, '#94A3B8', 9, false);
  tc(ctx, `fence_token: ${token}`, x, y + 16, '#94A3B8', 9, false);
}

/* ── main draw ────────────────────────────────────────────────────────────── */
function draw(ctx, state, W, H) {
  const idx = state.stepIdx;
  ctx.clearRect(0, 0, W, H);

  const cx = W / 2;
  const l1x = cx - W * 0.28, l2x = cx + W * 0.28;
  const leaderY  = H * 0.25;
  const coordY   = H * 0.55;
  const storageY = H * 0.78;

  if (idx === 0) {
    drawCoord(ctx, cx, coordY, 'L1', 33);
    drawLeaderBox(ctx, l1x, leaderY, 'L1', 33, 'active');
    // Followers (simplified)
    [l2x].forEach(x => {
      rr(ctx, x - 44, leaderY - 22, 88, 44, 6, '#4F46E51A', '#4F46E5', 1.5);
      tc(ctx, 'L2  (follower)', x, leaderY, '#4F46E5', 9, false);
    });
    drawStorage(ctx, cx, storageY, 33, 'token 33', null);
    arr(ctx, l1x, leaderY + 32, cx, storageY - 35, '#10B981', 'write t33');
    arr(ctx, l1x, leaderY + 8, cx - 20, coordY - 29, '#A78BFA', 'heartbeat');
    tc(ctx, 'Healthy — single leader, fencing token 33', cx, H * 0.92, '#10B981', 10, false);
  }

  if (idx === 1) {
    drawCoord(ctx, cx, coordY, 'L1 (expiring)', 33);
    drawLeaderBox(ctx, l1x, leaderY, 'L1', 33, 'stale');
    rr(ctx, l2x - 44, leaderY - 22, 88, 44, 6, '#4F46E51A', '#4F46E5', 1.5);
    tc(ctx, 'L2  (follower)', l2x, leaderY, '#4F46E5', 9, false);
    drawStorage(ctx, cx, storageY, 33, null, null);

    // GC annotation
    rr(ctx, l1x - 60, leaderY + 44, 120, 28, 5, '#F59E0B1A', '#F59E0B', 1.5);
    tc(ctx, '💤 GC pause ~90s', l1x, leaderY + 58, '#F59E0B', 9, true);

    // lease countdown bar
    const lbx = cx - 60, lby = coordY + 29, lbw = 120, lbh = 8;
    rr(ctx, lbx, lby, lbw, lbh, 3, '#1E293B', '#334155', 1);
    rr(ctx, lbx, lby, lbw * 0.08, lbh, 3, '#EF4444', null);
    tc(ctx, 'lease expired', cx, lby + 18, '#EF4444', 8, false);

    tc(ctx, 'L1 paused — lease expires unnoticed', cx, H * 0.92, '#F59E0B', 10, false);
  }

  if (idx === 2) {
    drawCoord(ctx, cx, coordY, 'L2', 34);
    drawLeaderBox(ctx, l1x, leaderY, 'L1 (GC...)', 33, 'dead');
    drawLeaderBox(ctx, l2x, leaderY, 'L2  NEW', 34, 'active');
    drawStorage(ctx, cx, storageY, 34, null, null);
    arr(ctx, l2x, leaderY + 32, cx, storageY - 35, '#10B981', 'write t34');
    arr(ctx, l2x, leaderY + 8, cx + 20, coordY - 29, '#A78BFA', 'lease t34');
    tc(ctx, 'L2 elected  |  fencing token increments to 34', cx, H * 0.92, '#10B981', 10, false);
  }

  if (idx === 3) {
    // SPLIT BRAIN — no fencing
    drawCoord(ctx, cx, coordY, 'L2', 34);
    drawLeaderBox(ctx, l1x, leaderY, 'L1 (stale)', 33, 'split');
    drawLeaderBox(ctx, l2x, leaderY, 'L2  NEW', 34, 'active');
    drawStorage(ctx, cx, storageY, '?', null, null);

    arr(ctx, l1x, leaderY + 32, cx - 30, storageY - 35, '#EF4444', 'WRITE t33 ⚡');
    arr(ctx, l2x, leaderY + 32, cx + 30, storageY - 35, '#10B981', 'WRITE t34');

    rr(ctx, cx - 100, H * 0.85, 200, 26, 5, '#7F1D1D22', '#EF4444', 1.5);
    tc(ctx, '⚠  SPLIT-BRAIN — both accepted', cx, H * 0.85 + 13, '#EF4444', 9, true);
  }

  if (idx === 4) {
    // Fencing works
    drawCoord(ctx, cx, coordY, 'L2', 34);
    drawLeaderBox(ctx, l1x, leaderY, 'L1 (stale)', 33, 'split');
    drawLeaderBox(ctx, l2x, leaderY, 'L2  NEW', 34, 'active');
    drawStorage(ctx, cx, storageY, 34, 'token 34', 'token 33');

    arr(ctx, l1x, leaderY + 32, cx - 30, storageY - 35, '#EF4444', 'WRITE t33 ✕', true);
    arr(ctx, l2x, leaderY + 32, cx + 30, storageY - 35, '#10B981', 'WRITE t34 ✓');

    rr(ctx, cx - 130, H * 0.86, 260, 26, 5, '#10B9811A', '#10B981', 1.5);
    tc(ctx, '✓ Fencing: reject t33 < last_token 34 — split-brain blocked', cx, H * 0.86 + 13, '#10B981', 9, true);
  }
}

/* ── detail ──────────────────────────────────────────────────────────────── */
function renderDetail(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-family:system-ui;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="margin:0 0 14px;color:#E2E8F0;font-size:15px">What Is Split-Brain?</h3>
  <p>Split-brain occurs when two nodes simultaneously believe they are the sole leader. The most common cause is not a network partition but a <strong>stop-the-world GC pause</strong> or a slow disk: the leader is alive but unresponsive for long enough that its lease expires and a new leader is elected before the old one wakes up.</p>

  <h3 style="margin:12px 0 10px;color:#E2E8F0;font-size:14px">Fencing Token Pattern</h3>
  <pre style="background:#0F172A;border:1px solid #1E293B;border-radius:6px;padding:12px;font-size:11px;color:#94A3B8;overflow-x:auto">
# Coordination service (ZooKeeper / etcd)
token = acquire_lease(resource)  # returns monotonically increasing int

# Storage server enforcement
def write(data, client_token):
    if client_token <= last_seen_token:
        raise Rejected("stale leader")
    last_seen_token = client_token
    apply(data)
  </pre>

  <h3 style="margin:14px 0 10px;color:#E2E8F0;font-size:14px">Prevention Strategies</h3>
  <table style="width:100%;border-collapse:collapse;font-size:12px">
    <thead><tr style="background:#0F172A">
      <th style="padding:8px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Strategy</th>
      <th style="padding:8px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">How it helps</th>
    </tr></thead>
    <tbody>
      ${[
        ['Fencing tokens', 'Storage layer rejects writes with token ≤ last accepted. Stale leader blocked even if it believes it\'s the leader.'],
        ['Short leases + fast GC', 'Keep lease TTL short (≤30 s). Use G1GC / ZGC to minimise pause. Leader loses lease before causing damage.'],
        ['STONITH (Shoot The Other Node In The Head)', 'Quorum-based systems can issue a kill command to the suspected stale leader before electing a new one. Ensures only one active node.'],
        ['Quorum-only writes', 'Never accept a write without confirmation from majority. A stale leader that has lost quorum cannot satisfy this — writes fail rather than corrupt.'],
      ].map(([s, h]) => `<tr style="border-bottom:1px solid #0F172A">
        <td style="padding:8px;color:#A78BFA;font-weight:600">${s}</td>
        <td style="padding:8px">${h}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>`;
}

/* ── IQ ──────────────────────────────────────────────────────────────────── */
function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'What causes split-brain in distributed systems?',
      a: 'The most common cause is NOT a network partition — it\'s a stop-the-world event on the leader (GC pause, disk stall, VM migration) that makes it temporarily unresponsive. The cluster elects a new leader (correct). When the paused leader resumes, it believes it\'s still the leader and may try to write. Without fencing, both accept writes. A true network partition can also cause split-brain if quorum rules are violated (e.g., async replication with no quorum check).',
    },
    {
      q: 'How do fencing tokens prevent a stale leader from corrupting data?',
      a: 'When a node acquires a distributed lock or lease, the coordination service (ZooKeeper, etcd) returns a monotonically increasing fencing token. The node includes this token in every write to the storage backend. The storage backend tracks the maximum token it has ever seen for a resource and rejects any write whose token is ≤ that maximum. A stale leader waking from a GC pause still holds its old, lower token — its writes are silently dropped even though the leader believes it\'s authorised.',
    },
    {
      q: 'How does DynamoDB prevent split-brain at the storage layer?',
      a: 'DynamoDB uses Paxos-based consensus for leader election within each partition (storage node group). The leader holds a lease issued by the Paxos group. To write, the leader must be within its lease period AND a majority of replicas must acknowledge. A leader that loses connectivity cannot satisfy the majority acknowledgement condition, so writes fail rather than silently accepting and diverging. The fencing is enforced by the quorum requirement, not a separate token, but the effect is the same: stale leaders cannot commit writes.',
    },
    {
      q: 'What is STONITH and when is it used?',
      a: 'STONITH (Shoot The Other Node In The Head) is a technique where a newly elected leader instructs the cluster management layer to forcefully power-cycle or fence the suspected stale leader before accepting writes. It\'s common in high-availability database setups (PostgreSQL with Patroni, MySQL with MHA). The key insight: you can\'t always trust the stale node to voluntarily stop — STONITH makes sure it\'s actually dead before proceeding. The downside is it adds complexity and can cause double-fence storms if misconfigured.',
    },
  ]);
}

/* ── mount ───────────────────────────────────────────────────────────────── */
export function mount(container) {
  const { tabs, body } = createModuleShell(container, {
    tag: 'Distributed',
    title: 'Split-Brain Problem',
    subtitle: 'When two nodes both think they\'re leader — GC pauses, stale leases, fencing tokens, and STONITH.',
    tabs: [
      { id: 'anim',   label: 'Split-Brain Animation' },
      { id: 'detail', label: 'Prevention Strategies' },
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
