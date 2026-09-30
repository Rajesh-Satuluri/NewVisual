import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

// ── Step definitions ─────────────────────────────────────────────────────────

const STEPS = [
  {
    label: 'Why Consensus?',
    desc:  'Without consensus, nodes disagree on committed values. Two nodes think different writes are committed. Split-brain causes data corruption. Consensus algorithms ensure all non-faulty nodes agree on the same sequence of values — even if some crash or messages are delayed.',
    scene: 'split',
  },
  {
    label: 'Paxos: Prepare Phase',
    desc:  'Paxos Phase 1 (Prepare): proposer sends PREPARE with a ballot number. Acceptors promise to ignore lower-numbered proposals and report any previously accepted value. Majority of promises = proposer can proceed.',
    scene: 'prepare',
  },
  {
    label: 'Paxos: Accept Phase',
    desc:  'Paxos Phase 2 (Accept): proposer sends ACCEPT with ballot number and value. If a majority reply ACCEPTED, consensus is reached. The value is learned. Multi-Paxos extends this for a log of values (all subsequent entries skip Phase 1).',
    scene: 'accept',
  },
  {
    label: 'Raft vs Paxos',
    desc:  'Raft was designed to be understandable. It uses a strong leader: all writes go through the leader, who replicates to followers. Paxos is more symmetric but notoriously difficult to implement — even Google\'s Chubby paper noted this.',
    scene: 'compare',
  },
  {
    label: 'FLP Impossibility',
    desc:  'FLP Impossibility: in a fully asynchronous network, you cannot have both safety AND liveness with even one faulty process. Real systems assume partial synchrony — messages eventually arrive — which is why Raft uses election timeouts.',
    scene: 'flp',
  },
];

// ── Canvas helpers ────────────────────────────────────────────────────────────

function arrow(ctx, x1, y1, x2, y2, col, lw) {
  lw = lw || 1.5;
  const dx = x2 - x1, dy = y2 - y1;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist, uy = dy / dist;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
  ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke();
  const angle = Math.atan2(dy, dx);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 10 * Math.cos(angle - 0.4), y2 - 10 * Math.sin(angle - 0.4));
  ctx.lineTo(x2 - 10 * Math.cos(angle + 0.4), y2 - 10 * Math.sin(angle + 0.4));
  ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  void ux; void uy;
}

function arrowBetween(ctx, ax, ay, bx, by, col, r, lw) {
  r = r || 26;
  const dist = Math.hypot(bx - ax, by - ay) || 1;
  const ux = (bx - ax) / dist, uy = (by - ay) / dist;
  arrow(ctx, ax + ux * r, ay + uy * r, bx - ux * r, by - uy * r, col, lw);
}

function node(ctx, nx, ny, R, fill, stroke, label, badgeText, badgeCol) {
  ctx.beginPath(); ctx.arc(nx, ny, R + 8, 0, Math.PI * 2);
  ctx.strokeStyle = (badgeCol || fill) + '44'; ctx.lineWidth = 3; ctx.stroke();

  ctx.beginPath(); ctx.arc(nx, ny, R, 0, Math.PI * 2);
  ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = stroke || '#1E293B'; ctx.lineWidth = 2; ctx.stroke();

  ctx.fillStyle = '#F8FAFC'; ctx.font = 'bold 12px system-ui';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, nx, ny);

  if (badgeText) {
    ctx.font = '9px system-ui';
    const bw = ctx.measureText(badgeText).width + 10;
    ctx.fillStyle = (badgeCol || fill) + 'CC';
    ctx.beginPath(); ctx.roundRect(nx - bw / 2, ny + R + 4, bw, 15, 3); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, nx, ny + R + 12);
  }
}

function midLabel(ctx, x, y, text, col) {
  ctx.font = '9px system-ui';
  const tw = ctx.measureText(text).width;
  ctx.fillStyle = '#0A0F1A';
  ctx.fillRect(x - tw / 2 - 4, y - 8, tw + 8, 14);
  ctx.fillStyle = col || '#94A3B8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function dashedArrow(ctx, x1, y1, x2, y2, col) {
  ctx.save();
  ctx.setLineDash([5, 4]);
  arrowBetween(ctx, x1, y1, x2, y2, col, 26, 1.5);
  ctx.setLineDash([]);
  ctx.restore();
}

// ── Scene renderers ───────────────────────────────────────────────────────────

const R = 26;

function sceneSplit(ctx, W, H) {
  // 3 nodes in a horizontal row, centre-ish
  const cx = W / 2, cy = H * 0.38;
  const nx = [cx - 160, cx, cx + 160];
  const ny = [cy, cy, cy];
  const vals = ['A', 'B', 'A'];
  const vcols = ['#4F46E5', '#F59E0B', '#4F46E5'];
  const ids = ['N1', 'N2', 'N3'];

  // Value boxes above each node
  ids.forEach((id, i) => {
    const x = nx[i], y = ny[i];
    ctx.fillStyle = vcols[i] + '22';
    ctx.strokeStyle = vcols[i];
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(x - 44, y - R - 46, 88, 28, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = vcols[i]; ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`value="${vals[i]}"`, x, y - R - 32);

    node(ctx, x, y, R, '#1E293B', '#334155', id, 'COMMITTED', vcols[i]);
  });

  // Conflict arrow between N1 and N2
  ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.moveTo(nx[0] + R + 8, ny[0]); ctx.lineTo(nx[1] - R - 8, ny[1]); ctx.stroke();
  ctx.setLineDash([]);

  // SPLIT badge
  const bx = cx, by = H * 0.66;
  ctx.fillStyle = '#7F1D1D';
  ctx.beginPath(); ctx.roundRect(bx - 55, by - 16, 110, 30, 6); ctx.fill();
  ctx.fillStyle = '#FCA5A5'; ctx.font = 'bold 13px system-ui';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('SPLIT-BRAIN', bx, by - 1);

  // Caption
  ctx.fillStyle = '#EF4444'; ctx.font = '11px system-ui';
  ctx.fillText('N1 and N2 committed different values', cx, by + 26);
}

function scenePrepare(ctx, W, H) {
  const px = W * 0.22, py = H * 0.42;
  const ax = W * 0.60, ay = H * 0.27;
  const bx = W * 0.60, by = H * 0.67;

  // Proposer
  node(ctx, px, py, R, '#4F46E5', '#818CF8', 'N1', 'PROPOSER', '#4F46E5');
  // Acceptors
  node(ctx, ax, ay, R, '#1E293B', '#334155', 'N2', 'ACCEPTOR', '#64748B');
  node(ctx, bx, by, R, '#1E293B', '#334155', 'N3', 'ACCEPTOR', '#64748B');

  // PREPARE arrows N1→N2, N1→N3
  arrowBetween(ctx, px, py, ax, ay, '#A78BFA', R);
  midLabel(ctx, (px + ax) / 2 - 10, (py + ay) / 2 - 12, 'PREPARE(ballot=5)', '#A78BFA');
  arrowBetween(ctx, px, py, bx, by, '#A78BFA', R);
  midLabel(ctx, (px + bx) / 2 - 10, (py + by) / 2 + 12, 'PREPARE(ballot=5)', '#A78BFA');

  // PROMISE arrows N2→N1, N3→N1
  dashedArrow(ctx, ax, ay, px, py, '#10B981');
  midLabel(ctx, (px + ax) / 2 + 30, (py + ay) / 2 + 12, 'PROMISE(5, no_prev)', '#10B981');
  dashedArrow(ctx, bx, by, px, py, '#10B981');
  midLabel(ctx, (px + bx) / 2 + 30, (py + by) / 2 - 12, 'PROMISE(5, no_prev)', '#10B981');

  // Majority badge
  const mx = W * 0.82, my = H * 0.46;
  ctx.fillStyle = '#052E16';
  ctx.beginPath(); ctx.roundRect(mx - 58, my - 18, 116, 36, 6); ctx.fill();
  ctx.fillStyle = '#10B981'; ctx.font = 'bold 11px system-ui';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('MAJORITY PROMISE', mx, my - 4);
  ctx.fillStyle = '#6EE7B7'; ctx.font = '10px system-ui';
  ctx.fillText('Phase 1 complete', mx, my + 10);
}

function sceneAccept(ctx, W, H) {
  const px = W * 0.22, py = H * 0.42;
  const ax = W * 0.60, ay = H * 0.27;
  const bx = W * 0.60, by = H * 0.67;

  node(ctx, px, py, R, '#4F46E5', '#818CF8', 'N1', 'PROPOSER', '#4F46E5');
  node(ctx, ax, ay, R, '#1E293B', '#334155', 'N2', 'ACCEPTOR', '#64748B');
  node(ctx, bx, by, R, '#1E293B', '#334155', 'N3', 'ACCEPTOR', '#64748B');

  // ACCEPT arrows
  arrowBetween(ctx, px, py, ax, ay, '#F59E0B', R);
  midLabel(ctx, (px + ax) / 2 - 10, (py + ay) / 2 - 12, 'ACCEPT(5, value=A)', '#F59E0B');
  arrowBetween(ctx, px, py, bx, by, '#F59E0B', R);
  midLabel(ctx, (px + bx) / 2 - 10, (py + by) / 2 + 12, 'ACCEPT(5, value=A)', '#F59E0B');

  // ACCEPTED replies
  dashedArrow(ctx, ax, ay, px, py, '#10B981');
  midLabel(ctx, (px + ax) / 2 + 30, (py + ay) / 2 + 12, 'ACCEPTED', '#10B981');
  dashedArrow(ctx, bx, by, px, py, '#10B981');
  midLabel(ctx, (px + bx) / 2 + 30, (py + by) / 2 - 12, 'ACCEPTED', '#10B981');

  // Consensus badge
  const mx = W * 0.82, my = H * 0.46;
  ctx.fillStyle = '#052E16';
  ctx.beginPath(); ctx.roundRect(mx - 58, my - 22, 116, 44, 6); ctx.fill();
  ctx.fillStyle = '#10B981'; ctx.font = 'bold 12px system-ui';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('CONSENSUS', mx, my - 8);
  ctx.fillStyle = '#6EE7B7'; ctx.font = '10px system-ui';
  ctx.fillText('value=A learned', mx, my + 8);
}

function sceneCompare(ctx, W, H) {
  const colW = (W - 80) / 2;
  const lx = 40, rx = 40 + colW + 16;
  const headerH = 40, rowH = 38;
  const rows = [
    ['Leader model',    'Strong leader\n(all writes via leader)', 'Any node\ncan propose'],
    ['Log structure',   'Log-centric\n(ordered entries)',         'Value-centric\n(per-slot)'],
    ['Understandability','Designed for clarity\n(Ongaro\'s thesis)','Complex — "famously\nhard to implement"'],
    ['Phase skipping',  'Batches skip election,\ngo straight to log', 'Multi-Paxos skips\nPhase 1 after leader'],
    ['Used by',         'etcd, TiKV,\nCockroachDB', 'Chubby (Google),\nZooKeeper (ZAB≈Paxos)'],
  ];

  // Headers
  ctx.fillStyle = '#10B981';
  ctx.beginPath(); ctx.roundRect(lx, 20, colW, headerH, 5); ctx.fill();
  ctx.fillStyle = '#4F46E5';
  ctx.beginPath(); ctx.roundRect(rx, 20, colW, headerH, 5); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 14px system-ui';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('RAFT', lx + colW / 2, 40);
  ctx.fillText('PAXOS', rx + colW / 2, 40);

  rows.forEach(([cat, lv, rv], ri) => {
    const y = 70 + ri * rowH;
    const bg = ri % 2 === 0 ? '#0F172A' : '#0A0F1A';

    ctx.fillStyle = bg;
    ctx.fillRect(lx, y, colW, rowH);
    ctx.fillRect(rx, y, colW, rowH);

    ctx.fillStyle = '#64748B'; ctx.font = '9px system-ui';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(cat, lx + 8, y + 4);

    // Multi-line values
    [lv, rv].forEach((val, ci) => {
      const x = ci === 0 ? lx : rx;
      const lines = val.split('\n');
      ctx.fillStyle = '#CBD5E1'; ctx.font = '11px system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (lines.length === 1) {
        ctx.fillText(lines[0], x + colW / 2, y + rowH / 2 + 3);
      } else {
        ctx.fillText(lines[0], x + colW / 2, y + rowH / 2 - 4);
        ctx.fillText(lines[1], x + colW / 2, y + rowH / 2 + 9);
      }
    });

    // Border
    ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 1;
    ctx.strokeRect(lx, y, colW, rowH);
    ctx.strokeRect(rx, y, colW, rowH);
  });
}

function sceneFlp(ctx, W, H) {
  // Theorem box
  const bx = W / 2, by = H * 0.28;
  const bw = Math.min(W - 60, 520), bh = 64;
  ctx.fillStyle = '#1E1B4B';
  ctx.strokeStyle = '#4F46E5';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(bx - bw / 2, by - bh / 2, bw, bh, 8); ctx.fill(); ctx.stroke();

  ctx.fillStyle = '#A78BFA'; ctx.font = 'bold 12px system-ui';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('FLP Impossibility (Fischer, Lynch, Paterson — 1985)', bx, by - 16);
  ctx.fillStyle = '#E2E8F0'; ctx.font = '11px system-ui';
  ctx.fillText('In a purely asynchronous system, consensus is impossible', bx, by);
  ctx.fillStyle = '#FCA5A5'; ctx.font = 'bold 11px system-ui';
  ctx.fillText('if even ONE node can fail.', bx, by + 16);

  // Two columns: Real systems
  const cols = [
    {
      title: 'Raft / Paxos',
      col: '#4F46E5',
      items: ['Assume partial synchrony', 'Messages arrive eventually', 'Use timeouts for liveness', 'Safety always preserved'],
    },
    {
      title: 'Production Systems',
      col: '#10B981',
      items: ['etcd (Raft, 500ms timeout)', 'ZooKeeper (ZAB, ~Paxos)', 'CockroachDB (Raft per range)', 'Amazon Corretto (DynamoDB)'],
    },
  ];

  const colW = (W - 80) / 2;
  const startY = H * 0.54;
  cols.forEach((c, ci) => {
    const cx = ci === 0 ? 40 : 40 + colW + 16;
    ctx.fillStyle = c.col + '22';
    ctx.strokeStyle = c.col;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(cx, startY, colW, 28, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#F8FAFC'; ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(c.title, cx + colW / 2, startY + 14);

    c.items.forEach((item, ii) => {
      const iy = startY + 38 + ii * 22;
      ctx.fillStyle = '#334155';
      ctx.beginPath(); ctx.roundRect(cx, iy, colW, 20, 3); ctx.fill();
      ctx.fillStyle = '#CBD5E1'; ctx.font = '10.5px system-ui';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText('• ' + item, cx + 10, iy + 10);
    });
  });
}

// ── Main draw dispatcher ──────────────────────────────────────────────────────

function draw(ctx, state, W, H) {
  ctx.clearRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';

  // Title
  const step = STEPS[state.stepIdx];
  ctx.fillStyle = '#CBD5E1'; ctx.font = 'bold 13px system-ui';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(step.label, 14, 10);
  ctx.textBaseline = 'alphabetic';

  switch (step.scene) {
    case 'split':   sceneSplit(ctx, W, H);   break;
    case 'prepare': scenePrepare(ctx, W, H); break;
    case 'accept':  sceneAccept(ctx, W, H);  break;
    case 'compare': sceneCompare(ctx, W, H); break;
    case 'flp':     sceneFlp(ctx, W, H);     break;
  }
}

// ── Details panel ─────────────────────────────────────────────────────────────

function renderDetail(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="color:#E2E8F0;margin:0 0 14px">Consensus: Core Concepts</h3>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:20px">
    ${[
      ['Agreement', 'All non-faulty nodes must decide the same value. No two correct nodes can commit different values for the same slot.'],
      ['Validity', 'The decided value must have been proposed by some node. Consensus cannot invent values.'],
      ['Termination (Liveness)', 'Every non-faulty node eventually decides. This is the property FLP says you lose in a fully async model.'],
      ['Ballot Numbers', 'Paxos uses monotonically increasing ballot numbers to serialize proposals. A higher ballot supersedes a lower one.'],
      ['Quorum Intersection', 'Any two majorities share at least one node. This overlap carries the last accepted value forward, preserving consistency across rounds.'],
      ['Multi-Paxos', 'Once a leader is stable, Phase 1 is amortized — only Phase 2 runs per log slot. This is how Paxos achieves throughput comparable to Raft.'],
    ].map(([t, d]) => `
      <div style="background:#0F172A;border-radius:8px;padding:14px 16px">
        <div style="color:#A78BFA;font-weight:700;font-size:12px;margin-bottom:6px">${t}</div>
        <div style="font-size:12px;color:#94A3B8">${d}</div>
      </div>`).join('')}
  </div>
  <div style="background:#1C1917;border-left:3px solid #F59E0B;padding:12px 16px;border-radius:0 6px 6px 0;font-size:12px">
    <strong style="color:#FCD34D">Amazon Prime Day:</strong>
    DynamoDB's consensus layer (built on Paxos-style leader election per shard group) handled 300M+ order writes.
    Each shard partition runs its own consensus independently — horizontal scale with strong per-key consistency.
  </div>
</div>`;
}

// ── IQ panel ─────────────────────────────────────────────────────────────────

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'What is the difference between Paxos Phase 1 and Phase 2?',
      a: 'Phase 1 (Prepare/Promise) establishes leadership for a ballot and discovers any previously accepted values. Phase 2 (Accept/Accepted) commits the value. Multi-Paxos amortizes Phase 1 across many slots once a stable leader exists — only running Phase 2 per slot. Raft bakes this directly into its leader-based design.',
      tip: 'Distinguish between single-decree Paxos (one value) and Multi-Paxos (a log of values).',
    },
    {
      q: 'Why is FLP impossibility important for distributed systems engineers?',
      a: 'It proves that in a fully asynchronous network you cannot build a consensus protocol that is both safe (never disagrees) and live (always terminates) when even one node can fail. Real systems sidestep this by assuming partial synchrony: messages eventually arrive within some bound. Raft uses randomised election timeouts; ZooKeeper uses tick-based heartbeats.',
    },
    {
      q: 'If Paxos and Raft both solve consensus, why does Amazon use a custom system?',
      a: 'Raft and standard Paxos optimise for general correctness. DynamoDB needs single-digit-millisecond P99 at millions of requests per second. Amazon uses a leader-lease variant of Paxos with carefully tuned timeouts, optimistic reads without quorum, and hardware-level fencing — trade-offs not in the vanilla algorithms.',
    },
    {
      q: 'How does Raft prevent two leaders in the same term?',
      a: 'Each node grants at most one vote per term (persisted to disk before responding). A leader requires a strict majority (⌈N/2⌉+1). Because any two majorities share at least one node, and that node can only vote once per term, two candidates cannot simultaneously collect majority votes — at most one wins.',
    },
  ]);
}

// ── mount ─────────────────────────────────────────────────────────────────────

export function mount(container) {
  const { tabs, body } = createModuleShell(container, {
    tag: 'Distributed',
    title: 'Consensus Algorithms',
    subtitle: 'Paxos, Raft, and the FLP impossibility — how nodes agree on a single value.',
    tabs: [
      { id: 'anim',   label: 'Animation' },
      { id: 'detail', label: 'Details' },
      { id: 'iq',     label: 'Interview Q&A' },
    ],
  });

  const engine_steps = STEPS.map((s, i) => ({
    label:    s.label,
    duration: 2200,
    mutate:   st => { st.stepIdx = i; },
  }));

  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:420px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);

      const engine = new SimulationEngine({
        initialState: { stepIdx: 0 },
        steps: engine_steps,
        onRender: (state, cnv) => {
          const pr = window.devicePixelRatio || 1;
          cnv.width  = cnv.clientWidth  * pr;
          cnv.height = cnv.clientHeight * pr;
          const ctx = cnv.getContext('2d');
          ctx.scale(pr, pr);
          draw(ctx, state, cnv.clientWidth, cnv.clientHeight);
        },
      });

      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, engine_steps));

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
