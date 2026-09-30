import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

const STEPS = [
  {
    label: 'Followers Idle',
    desc: 'All 5 nodes start as Followers in term 1. Each has an election timeout (150–300 ms). No heartbeats arrive, so the fastest timer fires first — that node becomes a Candidate.',
  },
  {
    label: 'Candidate Starts Election',
    desc: 'N3\'s election timer fires. N3 increments its term to 2, votes for itself, and broadcasts RequestVote(term=2) to all peers. It needs ⌊5/2⌋ + 1 = 3 votes to win.',
  },
  {
    label: 'Votes Granted → Leader',
    desc: 'N1 and N4 reply with VoteGranted. N3 now has 3 votes (majority). N3 becomes Leader for term 2 and immediately sends AppendEntries heartbeats to prevent new elections.',
  },
  {
    label: 'Log Replication',
    desc: 'Client sends a write (order_id=9999). Leader N3 appends it at log index 4 (term 2) and sends AppendEntries to all followers. Once a majority acknowledges, the entry is committed.',
  },
  {
    label: 'Leader Crash + Re-election',
    desc: 'N3 crashes. Followers stop receiving heartbeats. N1 times out first, starts a term-3 election, collects votes, and becomes the new leader. Log is consistent — N3\'s commit was already replicated.',
  },
];

const COLORS = {
  follower:  '#4F46E5',
  candidate: '#F59E0B',
  leader:    '#10B981',
  dead:      '#334155',
  commit:    '#A78BFA',
};

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
function arr(ctx, fx, fy, tx, ty, col, dashed) {
  ctx.save();
  if (dashed) ctx.setLineDash([5, 4]);
  ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty);
  ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
  const ang = Math.atan2(ty - fy, tx - fx);
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx - 9 * Math.cos(ang - 0.4), ty - 9 * Math.sin(ang - 0.4));
  ctx.lineTo(tx - 9 * Math.cos(ang + 0.4), ty - 9 * Math.sin(ang + 0.4));
  ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.restore();
}

/* ── node positions (pentagon) ────────────────────────────────────────────── */
function getNodes(W, H) {
  const cx = W / 2, cy = H * 0.44, R = Math.min(W, H) * 0.28;
  return [0, 1, 2, 3, 4].map(i => {
    const ang = -Math.PI / 2 + (i / 5) * Math.PI * 2;
    return { id: i + 1, x: cx + R * Math.cos(ang), y: cy + R * Math.sin(ang) };
  });
}

function drawNode(ctx, n, role, term, logLen) {
  const col = COLORS[role] || COLORS.follower;
  ctx.beginPath(); ctx.arc(n.x, n.y, 24, 0, Math.PI * 2);
  ctx.fillStyle = col + '22'; ctx.strokeStyle = col; ctx.lineWidth = 2;
  ctx.fill(); ctx.stroke();

  if (role === 'dead') {
    ctx.beginPath(); ctx.arc(n.x, n.y, 24, 0, Math.PI * 2);
    ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#EF4444'; ctx.font = '14px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('✕', n.x, n.y); return;
  }

  tc(ctx, `N${n.id}`, n.x, n.y - 5, col, 11, true);
  tc(ctx, `t${term}`, n.x, n.y + 7, col, 8, false);

  // role badge
  const roleLabel = role === 'leader' ? 'LEADER' : role === 'candidate' ? 'CAND' : 'FLWR';
  tc(ctx, roleLabel, n.x, n.y + 24, col, 7, true);

  // tiny log strip
  if (logLen > 0) {
    const lw = 6, lh = 5, lgap = 2;
    const startX = n.x - (logLen * (lw + lgap) - lgap) / 2;
    for (let j = 0; j < logLen; j++) {
      const col2 = j === logLen - 1 && role === 'leader' ? COLORS.commit : '#334155';
      rr(ctx, startX + j * (lw + lgap), n.y - 36, lw, lh, 1, col2, null);
    }
  }
}

function drawArrow(ctx, from, to, col, lbl, dashed) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = dx / len, ny = dy / len;
  arr(ctx, from.x + nx * 25, from.y + ny * 25, to.x - nx * 25, to.y - ny * 25, col, dashed);
  if (lbl) {
    const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;
    tc(ctx, lbl, mx, my - 10, col, 8, false);
  }
}

/* ── main draw ────────────────────────────────────────────────────────────── */
function draw(ctx, state, W, H) {
  const idx = state.stepIdx;
  ctx.clearRect(0, 0, W, H);

  const nodes = getNodes(W, H);

  if (idx === 0) {
    // all followers, term 1
    nodes.forEach(n => drawNode(ctx, n, 'follower', 1, 3));
    tc(ctx, 'All followers — election timers counting down', W / 2, H * 0.86, '#64748B', 10, false);
    rr(ctx, W / 2 - 100, H * 0.08, 200, 24, 5, '#1E293B', '#334155', 1);
    tc(ctx, 'TERM  1', W / 2, H * 0.08 + 12, '#94A3B8', 11, true);
  }

  if (idx === 1) {
    nodes.forEach((n, i) => {
      const role = i === 2 ? 'candidate' : 'follower';
      drawNode(ctx, n, role, i === 2 ? 2 : 1, 3);
      if (i !== 2) drawArrow(ctx, nodes[2], n, '#F59E0B', 'RequestVote(2)');
    });
    tc(ctx, 'N3 → Candidate  |  needs 3 votes', W / 2, H * 0.86, '#F59E0B', 10, false);
    rr(ctx, W / 2 - 100, H * 0.08, 200, 24, 5, '#1E293B', '#F59E0B', 1);
    tc(ctx, 'TERM  2', W / 2, H * 0.08 + 12, '#F59E0B', 11, true);
  }

  if (idx === 2) {
    nodes.forEach((n, i) => {
      const role = i === 2 ? 'leader' : 'follower';
      drawNode(ctx, n, role, 2, 3);
    });
    // heartbeat arrows from leader to all
    nodes.forEach((n, i) => {
      if (i !== 2) drawArrow(ctx, nodes[2], n, '#10B981', 'Heartbeat', false);
    });
    tc(ctx, 'N3 elected Leader  |  sends heartbeats', W / 2, H * 0.86, '#10B981', 10, false);
    rr(ctx, W / 2 - 100, H * 0.08, 200, 24, 5, '#1E293B', '#10B981', 1);
    tc(ctx, 'TERM  2', W / 2, H * 0.08 + 12, '#10B981', 11, true);
  }

  if (idx === 3) {
    nodes.forEach((n, i) => {
      const role = i === 2 ? 'leader' : 'follower';
      const logLen = (i === 2 || i === 0 || i === 3) ? 4 : 3;
      drawNode(ctx, n, role, 2, logLen);
      if (i !== 2) drawArrow(ctx, nodes[2], n, '#A78BFA', 'AppendEntries', i === 1 || i === 4);
    });
    tc(ctx, 'Entry idx=4 replicated to majority → committed', W / 2, H * 0.86, '#A78BFA', 10, false);
    rr(ctx, W / 2 - 100, H * 0.08, 200, 24, 5, '#1E293B', '#A78BFA', 1);
    tc(ctx, 'TERM  2  |  log idx 4 committed', W / 2, H * 0.08 + 12, '#A78BFA', 11, true);
  }

  if (idx === 4) {
    nodes.forEach((n, i) => {
      const role = i === 2 ? 'dead' : (i === 0 ? 'leader' : 'follower');
      const term = i === 0 ? 3 : 2;
      drawNode(ctx, n, role, term, i === 2 ? 0 : 4);
      if (i !== 2 && i !== 0) drawArrow(ctx, nodes[0], n, '#10B981', 'Heartbeat');
    });
    tc(ctx, 'N3 crashed  |  N1 wins re-election (term 3)', W / 2, H * 0.86, '#10B981', 10, false);
    rr(ctx, W / 2 - 100, H * 0.08, 200, 24, 5, '#1E293B', '#10B981', 1);
    tc(ctx, 'TERM  3', W / 2, H * 0.08 + 12, '#10B981', 11, true);
  }
}

/* ── detail panel ─────────────────────────────────────────────────────────── */
function renderDetail(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-family:system-ui;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="margin:0 0 14px;color:#E2E8F0;font-size:15px">Raft in Three Parts</h3>

  <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:20px">
    <thead><tr style="background:#0F172A">
      <th style="padding:8px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Property</th>
      <th style="padding:8px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Detail</th>
    </tr></thead>
    <tbody>
      ${[
        ['Election timeout', '150–300 ms random. Randomness prevents split votes.'],
        ['Vote grant condition', 'Grant if (a) term ≥ candidate term AND (b) log is at least as up-to-date.'],
        ['Log matching property', 'If two logs have same (index, term) entry, all prior entries are identical.'],
        ['Commit rule', 'Leader may commit an entry only after a majority stores it AND it is from the current term.'],
        ['Leader append-only', 'Leaders never overwrite entries; they only append. Followers accept or reject via log index+term check.'],
        ['Heartbeat interval', 'Typically 50–150 ms — must be << election timeout to prevent spurious elections.'],
      ].map(([p, d]) => `<tr style="border-bottom:1px solid #0F172A">
        <td style="padding:8px;color:#A78BFA;font-weight:600">${p}</td>
        <td style="padding:8px">${d}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <h3 style="margin:0 0 10px;color:#E2E8F0;font-size:14px">Log Entry Format</h3>
  <pre style="background:#0F172A;border:1px solid #1E293B;border-radius:6px;padding:12px;font-size:11px;color:#94A3B8;overflow-x:auto">
{ index: 4, term: 2, command: "SET order_9999.status = shipped" }
  </pre>
  <p style="margin:12px 0 0">Once the entry is committed, it will <strong>never be rolled back</strong>. The state machine applies commands in order — every node ends up with the same state after replaying the log.</p>
</div>`;
}

/* ── IQ ──────────────────────────────────────────────────────────────────── */
function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'Walk through a complete Raft leader election.',
      a: 'A follower converts to candidate when its election timer expires. It increments its local term, votes for itself, and sends RequestVote RPCs to all peers. A peer grants its vote if: (1) the candidate\'s term ≥ the peer\'s current term, and (2) the candidate\'s log is at least as up-to-date (compare last-log-term first, then last-log-index). The first candidate to collect ⌊N/2⌋ + 1 votes becomes leader. If no candidate wins (split vote), all restart with a higher random timeout — randomised delays make repeated splits extremely rare.',
    },
    {
      q: 'What is the "leader completeness" property and why does it matter?',
      a: 'Leader completeness guarantees that a newly elected leader always has all committed entries. A candidate can only win if it has the most up-to-date log among a majority. Because a committed entry is stored on a majority, any majority-intersecting quorum the candidate polls must contain at least one node with that entry — so the candidate\'s log cannot be behind. This means once committed, an entry is never lost, even across leader changes.',
    },
    {
      q: 'Why can\'t a Raft leader commit an entry from a previous term?',
      a: 'This is a subtle correctness rule. Imagine leader L1 replicates entry E (term 1) to a majority, then crashes before committing. L2 is elected (term 2) and may overwrite E on some followers if it has a conflicting entry at the same index. If L2 then committed E\'s position with a term-2 entry, that\'s fine. But if L1 had "committed" E directly, and L2 later overwrote it on those followers, committed data would be lost. Raft prevents this by only allowing a leader to commit entries from the current term — once a current-term entry is committed, all prior entries are implicitly safe.',
    },
    {
      q: 'etcd powers Kubernetes. What happens to the cluster when etcd loses quorum?',
      a: 'etcd uses Raft. With 3 nodes, the cluster tolerates 1 failure (majority = 2). If 2 of 3 nodes fail, the remaining node cannot form a majority — it cannot commit new entries and transitions to a read-only state (serving stale reads for some implementations). Kubernetes control-plane components (kube-apiserver, kube-scheduler, controller-manager) that depend on etcd for state will fail new writes — running pods continue, but no new scheduling decisions can be persisted. Recovery requires restarting the failed etcd nodes with their data directories intact, or a forced leader election from a backup snapshot.',
    },
  ]);
}

/* ── mount ───────────────────────────────────────────────────────────────── */
export function mount(container) {
  const { tabs, body } = createModuleShell(container, {
    tag: 'Distributed',
    title: 'Raft Consensus Concepts',
    subtitle: 'Leader election, log replication, and safety guarantees — how etcd, CockroachDB, and TiKV achieve fault-tolerant consensus.',
    tabs: [
      { id: 'anim',   label: 'Election Animation' },
      { id: 'detail', label: 'Protocol Details' },
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
