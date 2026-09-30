import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

// Linearizability: total order of operations visible to all clients
const LIN_STEPS = [
  {
    label: 'Consistency Spectrum',
    desc: 'Consistency models range from weakest (eventual) to strongest (linearizability). Stronger models are easier to reason about but have higher latency and availability costs.',
    phase: 'spectrum',
  },
  {
    label: 'Linearizability',
    desc: 'Linearizability: once a write completes, ALL subsequent reads (from any client, any node) see that write. The system appears to execute one operation at a time on a single copy. Requires coordination — typically Raft or Paxos.',
    phase: 'linear',
  },
  {
    label: 'Sequential Consistency',
    desc: 'Operations appear to execute in some total order that respects each client\'s individual operation order. Clients may disagree on the global order as long as each client\'s view is consistent. Weaker than linearizability — real time not preserved.',
    phase: 'sequential',
  },
  {
    label: 'Causal Consistency',
    desc: 'Causally related operations are seen in order by all nodes. Independent operations may be seen in different orders. Lamport clocks / vector clocks track causality. Used in MongoDB sessions and CockroachDB follower reads.',
    phase: 'causal',
  },
  {
    label: 'Eventual Consistency',
    desc: 'If no new writes occur, all replicas will eventually converge to the same value. No guarantees about when, or about ordering of reads. Highest availability and partition tolerance. Used in DNS, Cassandra (tunable), S3.',
    phase: 'eventual',
  },
];

const MODELS = [
  { name:'Linearizability', col:'#EF4444', available:'Low',  latency:'High',  example:'etcd, Zookeeper, Spanner' },
  { name:'Serializability',  col:'#F59E0B', available:'Low',  latency:'High',  example:'PostgreSQL SERIALIZABLE' },
  { name:'Causal',           col:'#A78BFA', available:'Med',  latency:'Med',   example:'MongoDB sessions, CockroachDB' },
  { name:'Read-your-writes', col:'#4F46E5', available:'Med',  latency:'Med',   example:'All session-level DBs' },
  { name:'Monotonic reads',  col:'#06B6D4', available:'High', latency:'Low',   example:'Most distributed DBs' },
  { name:'Eventual',         col:'#10B981', available:'Very high', latency:'Very low', example:'Cassandra, S3, DNS' },
];

function drawLIN(ctx, idx, w, h) {
  const step = LIN_STEPS[idx];
  ctx.clearRect(0, 0, w, h);
  const { phase } = step;

  function roundRect(x, y, bw, bh, r, fill, stroke) {
    ctx.beginPath(); ctx.roundRect(x, y, bw, bh, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
  }

  function textC(t, x, y, col, size, bold) {
    ctx.fillStyle = col; ctx.font = `${bold ? '700 ' : ''}${size}px system-ui`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, x, y);
  }

  if (phase === 'spectrum') {
    // Horizontal bar from weak to strong
    const bx = w * 0.05, by = h * 0.35, bw = w * 0.90, bh = 24;
    const grad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    grad.addColorStop(0, '#10B981'); grad.addColorStop(1, '#EF4444');
    ctx.fillStyle = grad; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 4); ctx.fill();
    textC('← Weaker (more available)', bx + bw * 0.25, by + 12, '#fff', 10, true);
    textC('Stronger (safer) →', bx + bw * 0.75, by + 12, '#fff', 10, true);

    const positions = [0.05, 0.28, 0.52, 0.70, 0.88];
    const labels = ['Eventual','Causal','Monotonic\nreads','Sequential','Lineariz-\nable'];
    const cols = ['#10B981','#A78BFA','#06B6D4','#F59E0B','#EF4444'];
    positions.forEach((p, i) => {
      const x = bx + bw * p;
      ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.arc(x, by - 10, 5, 0, Math.PI * 2); ctx.fill();
      const lines = labels[i].split('\n');
      lines.forEach((ln, li) => textC(ln, x, by - 32 + li * 14, cols[i], 9, true));
    });

    // Bottom: tradeoff table
    const tx = w * 0.05, ty = h * 0.62;
    roundRect(tx, ty, w * 0.90, h * 0.30, 6, '#0F172A', '#334155');
    textC('Availability', w * 0.30, ty + 14, '#94A3B8', 10, true);
    textC('Latency', w * 0.55, ty + 14, '#94A3B8', 10, true);
    textC('Safety', w * 0.78, ty + 14, '#94A3B8', 10, true);
    MODELS.slice(0, 4).forEach((m, i) => {
      const ry = ty + 28 + i * 18;
      textC(m.name, w * 0.15, ry + 7, m.col, 9, false);
      const avBar = { 'Low':0.2,'Med':0.5,'High':0.8,'Very high':1.0 }[m.available];
      ctx.fillStyle = '#1E293B'; ctx.beginPath(); ctx.roundRect(w * 0.22, ry, 80, 14, 2); ctx.fill();
      ctx.fillStyle = m.col; ctx.beginPath(); ctx.roundRect(w * 0.22, ry, 80 * avBar, 14, 2); ctx.fill();
    });
  }

  if (phase === 'linear') {
    // Two clients, one register, timeline
    const cl1 = w * 0.10, cl2 = w * 0.10, regX = w * 0.55;
    const rows = [
      { client: 'Client A', y: h * 0.22, op: 'write(x=1)', t1: 0.18, t2: 0.46, col: '#10B981', result: '' },
      { client: 'Client B', y: h * 0.50, op: 'read(x)→1',  t1: 0.50, t2: 0.74, col: '#4F46E5', result: '1' },
      { client: 'Client C', y: h * 0.74, op: 'read(x)→1',  t1: 0.55, t2: 0.78, col: '#818CF8', result: '1' },
    ];
    // Time axis
    const tAxis = h * 0.12;
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(w * 0.12, tAxis); ctx.lineTo(w * 0.92, tAxis); ctx.stroke();
    textC('time →', w * 0.52, tAxis - 8, '#334155', 9, false);

    rows.forEach(r => {
      textC(r.client, w * 0.07, r.y, r.col, 9, true);
      const x1 = w * r.t1, x2 = w * r.t2;
      roundRect(x1, r.y - 12, x2 - x1, 24, 4, r.col + '33', r.col);
      textC(r.op, (x1 + x2) / 2, r.y, '#fff', 9, false);
    });

    // Linearization point
    const lpX = w * 0.46;
    ctx.strokeStyle = '#EF4444'; ctx.setLineDash([4, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(lpX, tAxis + 4); ctx.lineTo(lpX, h * 0.88); ctx.stroke();
    ctx.setLineDash([]);
    textC('Linearisation', lpX, h * 0.90, '#EF4444', 9, true);
    textC('point (LP)', lpX, h * 0.96, '#EF4444', 9, false);
    textC('After LP: all reads return 1', w * 0.6, h * 0.90, '#10B981', 10, true);
  }

  if (phase === 'sequential') {
    // Show two clients seeing different orders
    const rows = [
      { label:'Client A sees:', ops: ['w(x=1)','w(y=2)','r(y)→2','r(x)→1'], cols: ['#10B981','#10B981','#4F46E5','#10B981'] },
      { label:'Client B sees:', ops: ['w(y=2)','w(x=1)','r(x)→1','r(y)→2'], cols: ['#4F46E5','#10B981','#10B981','#4F46E5'] },
    ];
    rows.forEach((r, ri) => {
      const ry = h * (0.28 + ri * 0.38);
      textC(r.label, w * 0.12, ry, '#94A3B8', 10, true);
      r.ops.forEach((op, oi) => {
        const ox = w * (0.22 + oi * 0.18);
        roundRect(ox - 36, ry - 12, 72, 24, 4, r.cols[oi] + '33', r.cols[oi]);
        textC(op, ox, ry, '#fff', 9, false);
      });
    });
    textC('Both views are internally consistent — different global orders are OK', w * 0.5, h * 0.80, '#94A3B8', 10, false);
    textC('(real time NOT preserved)', w * 0.5, h * 0.90, '#F59E0B', 9, true);
  }

  if (phase === 'causal') {
    // Vector clock example
    const n1x = w * 0.20, n2x = w * 0.55, n3x = w * 0.85;
    const ys = [h * 0.22, h * 0.48, h * 0.72];
    // Node headers
    [[n1x,'Node 1','#10B981'],[n2x,'Node 2','#4F46E5'],[n3x,'Node 3','#A78BFA']].forEach(([x,l,c]) => {
      roundRect(x - 42, 12, 84, 26, 5, c + '33', c);
      textC(l, x, 25, c, 11, true);
    });
    // Op: N1 writes x=1 at VC [1,0,0]
    roundRect(n1x - 44, ys[0] - 14, 88, 28, 4, '#10B98133', '#10B981');
    textC('w(x=1) VC[1,0,0]', n1x, ys[0], '#10B981', 9, false);
    // Arrow N1 → N2
    ctx.beginPath(); ctx.moveTo(n1x + 44, ys[0]); ctx.lineTo(n2x - 44, ys[1]);
    ctx.strokeStyle = '#10B981'; ctx.lineWidth = 1.5; ctx.stroke();
    textC('→', (n1x + n2x) / 2, (ys[0] + ys[1]) / 2 - 8, '#10B981', 9, false);
    // N2 writes after seeing N1
    roundRect(n2x - 50, ys[1] - 14, 100, 28, 4, '#4F46E533', '#4F46E5');
    textC('r(x)→1 VC[1,1,0]', n2x, ys[1], '#4F46E5', 9, false);
    // N3 concurrent — no causal link
    roundRect(n3x - 44, ys[0] - 14, 88, 28, 4, '#A78BFA33', '#A78BFA');
    textC('w(y=5) VC[0,0,1]', n3x, ys[0], '#A78BFA', 9, false);
    textC('concurrent — no order req.', (n2x + n3x) / 2, ys[2], '#94A3B8', 9, false);
  }

  if (phase === 'eventual') {
    // 3 replicas drifting then converging
    const rxs = [w * 0.18, w * 0.50, w * 0.82];
    const cols = ['#10B981', '#4F46E5', '#A78BFA'];
    const vals = ['x=3 ✓', 'x=1 (stale)', 'x=2 (stale)'];
    rxs.forEach((x, i) => {
      roundRect(x - 50, h * 0.15, 100, 50, 8, cols[i] + '33', cols[i]);
      textC(`Replica ${i + 1}`, x, h * 0.28, cols[i], 11, true);
      textC(vals[i], x, h * 0.42, i === 0 ? '#10B981' : '#EF4444', 9, false);
    });
    // Anti-entropy arrows
    const ay = h * 0.58;
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(rxs[0], h * 0.40); ctx.lineTo(rxs[1], ay); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rxs[0], h * 0.40); ctx.lineTo(rxs[2], ay); ctx.stroke();
    ctx.setLineDash([]);
    textC('Anti-entropy sync (Merkle tree reconciliation)', w / 2, ay + 14, '#94A3B8', 9, false);
    // After convergence
    rxs.forEach((x, i) => {
      roundRect(x - 50, h * 0.70, 100, 40, 8, '#10B98133', '#10B981');
      textC(`Replica ${i + 1}`, x, h * 0.78, '#10B981', 10, true);
      textC('x=3 ✓', x, h * 0.88, '#10B981', 9, false);
    });
    textC('After convergence — eventually all agree', w / 2, h * 0.96, '#10B981', 10, true);
  }

  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

function renderModels(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="color:#E2E8F0;margin:0 0 14px">Consistency Models Reference</h3>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin-bottom:20px">
    ${MODELS.map(m => `
      <div style="background:#0F172A;border-radius:8px;padding:14px 16px;border-left:3px solid ${m.col}">
        <div style="color:${m.col};font-weight:700;font-size:12px;margin-bottom:4px">${m.name}</div>
        <div style="font-size:11px;color:#64748B">Available: ${m.available} | Latency: ${m.latency}</div>
        <div style="font-size:11px;color:#94A3B8;margin-top:4px">${m.example}</div>
      </div>`).join('')}
  </div>
  <div style="background:#172554;border-left:3px solid #A78BFA;padding:12px 16px;border-radius:0 6px 6px 0;font-size:12px">
    <strong style="color:#A78BFA">Jepsen tests:</strong> Kyle Kingsbury\'s Jepsen project empirically tests distributed databases for consistency violations by injecting network partitions and clock skew, then verifying the operation history for linearizability. Has found bugs in Cassandra, MongoDB, Redis, and many others.
  </div>
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'What is the difference between linearizability and serializability?',
      a: 'Both are strong consistency guarantees but they apply to different layers. Serializability (the S in ACID) guarantees that concurrent transactions execute as if they ran one at a time in some serial order — it applies to multi-operation transactions. Linearizability applies to individual read/write operations on a single register: it guarantees that once a write completes, all subsequent reads see it, as if operations are applied instantaneously at some point within their real-time interval. Strict serializability combines both: transactions are both serializable AND their serial order respects real time — this is what Google Spanner provides using TrueTime.',
    },
    {
      q: 'Why does linearizability require coordination?',
      a: 'Linearizability requires that a read reflects the most recent write globally — not just locally. Without coordination, two nodes can independently process reads and writes, and a read on one node might not know about a concurrent write on another. The only way to guarantee all reads see the most recent write is to either (1) route all operations through a single leader that has the authoritative value, or (2) use a consensus protocol (Raft/Paxos) to agree on the value before returning. Both add latency and reduce availability during partitions (the C in CAP).',
    },
    {
      q: 'How does CockroachDB achieve linearizable reads without routing all reads to a leader?',
      a: 'CockroachDB uses closed timestamps and range leases. The lease holder for a range serves reads at a recent timestamp. For follower reads (reads from non-lease-holder replicas), the system uses a slightly older timestamp guaranteed to be closed (no writes can come in below it) — this is safe because the closed timestamp was computed using an observed maximum clock uncertainty across the cluster (similar to Spanner\'s TrueTime). Reads at the closed timestamp on any follower are linearizable because no uncommitted write can be below that boundary.',
    },
  ]);
}

export function mount(container) {
  const shell = createModuleShell(container, {
    tag: 'Distributed',
    title: 'Consistency Models',
    subtitle: 'Linearizability, sequential, causal, and eventual consistency — the spectrum from safe to scalable.',
    tabs: [
      { id:'anim',   label:'Spectrum' },
      { id:'models', label:'Model Reference' },
      { id:'iq',     label:'Interview Q&A' },
    ],
  });
  const { tabs, body } = shell;
  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:360px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);
      const steps = LIN_STEPS.map((s, i) => ({ label: s.label, duration: 2200, mutate: st => { st.idx = i; } }));
      const engine = new SimulationEngine({
        initialState: { idx: 0 }, steps,
        onRender: (state, cnv) => {
          const c = cnv.getContext('2d'), pr = window.devicePixelRatio || 1;
          cnv.width = cnv.clientWidth * pr; cnv.height = cnv.clientHeight * pr; c.scale(pr, pr);
          drawLIN(c, state.idx, cnv.clientWidth, cnv.clientHeight);
        },
      });
      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));
      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);
      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = LIN_STEPS[i].desc; });
      desc.textContent = LIN_STEPS[0].desc;
      return () => engine.destroy();
    },
    models: renderModels,
    iq:     renderIQ,
  });
  return null;
}
