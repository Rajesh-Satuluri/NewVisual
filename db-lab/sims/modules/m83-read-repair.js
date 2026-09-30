import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

// Topic: Anti-Entropy — background repair, convergence, CRDTs
const AE_STEPS = [
  {
    label: 'Why Anti-Entropy?',
    desc: 'Passive read repair only heals data that is actively read. Silent divergence accumulates in cold key ranges. Anti-entropy proactively reconciles all replicas — even data nobody has read recently.',
    phase: 'why',
  },
  {
    label: 'Gossip Membership',
    desc: 'Nodes gossip their membership state continuously. Each gossip round a node picks k random peers and exchanges state. This propagates "node up/down" information in O(log N) rounds across the cluster.',
    phase: 'gossip',
  },
  {
    label: 'Merkle Tree Exchange',
    desc: 'For each key range (token range in Cassandra), two replicas exchange Merkle tree hashes. The root hash tells them instantly if data matches. If not, they bisect until finding the divergent leaf range.',
    phase: 'merkle',
  },
  {
    label: 'Streaming Repair',
    desc: 'The node with the more recent data streams the divergent SSTables. Incremental repair tracks repaired status per-SSTable, streaming only the delta since the last repair run.',
    phase: 'stream',
  },
  {
    label: 'CRDTs',
    desc: 'Conflict-free Replicated Data Types avoid repair entirely for some use cases. CRDTs are designed so all orderings of concurrent operations produce the same result — they converge without coordination. Examples: G-Counter, PN-Counter, OR-Set.',
    phase: 'crdt',
  },
];

function drawAE(ctx, idx, w, h) {
  const step = AE_STEPS[idx];
  ctx.clearRect(0, 0, w, h);
  const { phase } = step;

  function roundRect(x, y, bw, bh, r, fill, stroke) {
    ctx.beginPath(); ctx.roundRect(x, y, bw, bh, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
  }
  function textC(t, x, y, col, size, bold) {
    ctx.fillStyle = col; ctx.font = `${bold ? '700 ' : ''}${size || 11}px system-ui`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, x, y);
  }
  function arrow(fx, fy, tx, ty, col, lbl, dashed) {
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
      ctx.fillStyle = col; ctx.font = '9px system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(lbl, (fx + tx) / 2, Math.min(fy, ty) - 3);
    }
  }

  if (phase === 'why') {
    // Hot vs cold key range chart
    const bx = w * 0.08, by = h * 0.25, bw2 = w * 0.84, bh = 24;
    // Key range bar
    const grad = ctx.createLinearGradient(bx, 0, bx + bw2, 0);
    grad.addColorStop(0, '#EF4444');
    grad.addColorStop(0.3, '#F59E0B');
    grad.addColorStop(0.5, '#10B981');
    grad.addColorStop(1, '#1E293B');
    ctx.fillStyle = grad; ctx.beginPath(); ctx.roundRect(bx, by, bw2, bh, 4); ctx.fill();
    textC('← Hot (read often)         Cold (rarely read) →', bx + bw2 / 2, by + 12, '#fff', 9, false);
    // Passive repair covers hot
    roundRect(bx, by + 36, bw2 * 0.45, 20, 3, '#10B98133', '#10B981');
    textC('Passive read repair covers this', bx + bw2 * 0.22, by + 46, '#10B981', 9, false);
    // Anti-entropy covers all
    roundRect(bx, by + 66, bw2, 20, 3, '#4F46E533', '#4F46E5');
    textC('Anti-entropy covers ALL key ranges', bx + bw2 / 2, by + 76, '#4F46E5', 9, false);
    textC('Silent divergence accumulates in cold ranges without anti-entropy', w / 2, h * 0.72, '#EF4444', 10, true);
  }

  if (phase === 'gossip') {
    const GNODES = [
      { x:0.50, y:0.20 }, { x:0.20, y:0.45 }, { x:0.35, y:0.75 },
      { x:0.65, y:0.75 }, { x:0.80, y:0.45 },
    ];
    const gossipArrows = [[0,1],[1,2],[2,3],[3,4],[4,0],[1,3]];
    ctx.setLineDash([5, 4]);
    gossipArrows.forEach(([a, b]) => {
      const na = GNODES[a], nb = GNODES[b];
      ctx.beginPath();
      ctx.moveTo(na.x * w, na.y * h);
      ctx.lineTo(nb.x * w, nb.y * h);
      ctx.strokeStyle = '#A78BFA66'; ctx.lineWidth = 1; ctx.stroke();
    });
    ctx.setLineDash([]);
    GNODES.forEach((n, i) => {
      ctx.beginPath(); ctx.arc(n.x * w, n.y * h, 18, 0, Math.PI * 2);
      ctx.fillStyle = '#4F46E5'; ctx.fill();
      ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 2; ctx.stroke();
      textC(`N${i + 1}`, n.x * w, n.y * h, '#fff', 11, true);
    });
    textC('Each node gossips with k random peers per round', w / 2, h * 0.90, '#94A3B8', 10, false);
    textC('O(log N) rounds for cluster-wide convergence', w / 2, h * 0.97, '#A78BFA', 9, true);
  }

  if (phase === 'merkle') {
    // Bisection diagram
    const cx = w * 0.5, ty = 24;
    roundRect(cx - 50, ty, 100, 24, 4, '#EF444433', '#EF4444');
    textC('Root: DIFFER', cx, ty + 12, '#EF4444', 9, true);
    // Level 1
    roundRect(cx - 120, ty + 46, 90, 22, 3, '#10B98133', '#10B981');
    textC('Left: MATCH', cx - 75, ty + 57, '#10B981', 8, false);
    roundRect(cx + 30, ty + 46, 90, 22, 3, '#EF444433', '#EF4444');
    textC('Right: DIFFER', cx + 75, ty + 57, '#EF4444', 8, false);
    ctx.beginPath(); ctx.moveTo(cx, ty + 24); ctx.lineTo(cx - 75, ty + 46);
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, ty + 24); ctx.lineTo(cx + 75, ty + 46);
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.stroke();
    // Level 2 (right side only)
    roundRect(cx + 10, ty + 90, 70, 20, 3, '#10B98133', '#10B981');
    textC('RL: OK', cx + 45, ty + 100, '#10B981', 8, false);
    roundRect(cx + 90, ty + 90, 70, 20, 3, '#EF444433', '#EF4444');
    textC('RR: DIFFER ← HERE', cx + 125, ty + 100, '#EF4444', 8, false);
    ctx.beginPath(); ctx.moveTo(cx + 75, ty + 68); ctx.lineTo(cx + 45, ty + 90);
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 75, ty + 68); ctx.lineTo(cx + 125, ty + 90);
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.stroke();
    textC('Found divergent range in O(log N) steps — stream only this range', w / 2, h * 0.72, '#10B981', 10, true);
    textC('Without Merkle tree: O(N) row-by-row comparison', w / 2, h * 0.83, '#94A3B8', 9, false);
  }

  if (phase === 'stream') {
    const n1 = w * 0.25, n2 = w * 0.75, my = h * 0.35;
    // Nodes
    roundRect(n1 - 55, my - 18, 110, 36, 6, '#4F46E533', '#4F46E5');
    textC('Node 1 (has v=7)', n1, my, '#4F46E5', 10, true);
    roundRect(n2 - 55, my - 18, 110, 36, 6, '#EF444433', '#EF4444');
    textC('Node 2 (has v=3)', n2, my, '#EF4444', 10, true);
    // Stream arrow
    ctx.setLineDash([5, 4]);
    arrow(n1, my + 18, n2, h * 0.60, '#10B981', 'Stream SSTable delta', false);
    ctx.setLineDash([]);
    // After
    roundRect(n2 - 55, h * 0.68, 110, 30, 6, '#10B98133', '#10B981');
    textC('Node 2 (v=7 ✓)', n2, h * 0.74, '#10B981', 10, true);
    // Size comparison
    const bx = w * 0.08, by = h * 0.84;
    roundRect(bx, by, w * 0.84, 28, 4, '#0F172A', '#334155');
    const fullW = (w * 0.84 - 8) * 1.0;
    const incrW = (w * 0.84 - 8) * 0.09;
    ctx.fillStyle = '#EF4444'; ctx.beginPath(); ctx.roundRect(bx + 4, by + 4, fullW, 10, 2); ctx.fill();
    ctx.fillStyle = '#10B981'; ctx.beginPath(); ctx.roundRect(bx + 4, by + 16, incrW, 10, 2); ctx.fill();
    textC('Full repair', bx + 4 + fullW / 2, by + 9, '#fff', 8, false);
    textC('Incremental (9% of data)', bx + 4 + incrW / 2, by + 21, '#fff', 7, false);
  }

  if (phase === 'crdt') {
    // G-Counter (grow-only counter)
    const nx = [w * 0.20, w * 0.50, w * 0.80];
    const labels = ['Node A', 'Node B', 'Node C'];
    const counts = [[3,0,0],[0,2,0],[0,0,4]]; // each node's view
    const merged = [3,2,4]; // merged = max per node
    const ty = h * 0.20;
    nx.forEach((x, i) => {
      roundRect(x - 52, ty, 104, 64, 8, '#1E293B', '#4F46E5');
      textC(labels[i], x, ty + 14, '#4F46E5', 10, true);
      textC(`[${counts[i].join(',')}]`, x, ty + 32, '#818CF8', 10, false);
      textC(`local total: ${counts[i].reduce((a,b)=>a+b,0)}`, x, ty + 50, '#94A3B8', 9, false);
    });
    // Merge arrows
    arrow(nx[0], ty + 64, nx[1], ty + 64, '#A78BFA', 'gossip', true);
    arrow(nx[2], ty + 64, nx[1], ty + 64, '#A78BFA', 'gossip', true);
    // Merged state
    roundRect(nx[1] - 60, h * 0.62, 120, 50, 8, '#10B98133', '#10B981');
    textC('Merged (max per slot)', nx[1], h * 0.70, '#10B981', 10, true);
    textC(`[${merged.join(',')}] → total: ${merged.reduce((a,b)=>a+b,0)}`, nx[1], h * 0.83, '#10B981', 10, false);
    textC('CRDT merge is commutative, associative, idempotent', w / 2, h * 0.94, '#94A3B8', 9, false);
  }

  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

function renderCRDTs(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="color:#E2E8F0;margin:0 0 14px">Common CRDT Types</h3>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin-bottom:20px">
    ${[
      ['G-Counter','Grow-only counter. Each node maintains its own slot. Merge = max per slot. Total = sum of all slots. Used by Riak, Basho.','#10B981'],
      ['PN-Counter','Positive-Negative counter. Two G-Counters: one for increments, one for decrements. Net value = sum(P) − sum(N).','#4F46E5'],
      ['G-Set','Grow-only set. Elements are only added, never removed. Merge = union. Simple but cannot support deletes.','#F59E0B'],
      ['OR-Set (Observed-Remove)','Supports add + remove. Each element tagged with a unique token on add; remove marks that token. Merge = union-then-purge.','#A78BFA'],
      ['LWW-Register','Last-Write-Wins register. Each write stamped with timestamp. Merge = pick highest timestamp. Simple but clock-dependent.','#06B6D4'],
      ['MV-Register','Multi-Value register. Concurrent writes produce multiple values tracked in a version vector. Client resolves conflicts.','#EF4444'],
    ].map(([t,d,col]) => `
      <div style="background:#0F172A;border-radius:8px;padding:14px 16px;border-left:3px solid ${col}">
        <div style="color:${col};font-weight:700;font-size:12px;margin-bottom:6px">${t}</div>
        <div style="font-size:11px;color:#94A3B8">${d}</div>
      </div>`).join('')}
  </div>
  <div style="background:#172554;border-left:3px solid #A78BFA;padding:12px 16px;border-radius:0 6px 6px 0;font-size:12px">
    <strong style="color:#A78BFA">Used in production:</strong>
    Riak (CRDTs as first-class data types), Redis CRDT module, Cassandra counters (PN-Counter semantics),
    Apple Notes conflict resolution, collaborative editing (CRDT text editors like Logoot/LSEQ).
  </div>
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'What are the three mathematical properties a CRDT merge function must satisfy?',
      a: 'Commutativity: merge(A,B) = merge(B,A) — order of merging does not matter. Associativity: merge(A, merge(B,C)) = merge(merge(A,B), C) — grouping does not matter. Idempotency: merge(A,A) = A — merging the same state twice produces the same result as merging once. These three properties guarantee that regardless of the order, number of times, or grouping in which replicas exchange state, they will always converge to the same result.',
    },
    {
      q: 'Why do traditional databases not use CRDTs?',
      a: 'CRDTs work for a limited class of data types where all operations can be designed to commute. Many real-world operations cannot be commuted: "subtract from a bank balance if positive" is not commutable (can go negative if two subtracts happen concurrently), "move an element from one set to another" across two sets is not a single commuting operation, and any operation that requires reading a value to compute the next value (read-modify-write) breaks CRDT semantics. Traditional databases handle arbitrary read-modify-write transactions using MVCC and locking, which CRDTs cannot replace.',
    },
    {
      q: 'How does anti-entropy differ from gossip-based failure detection?',
      a: 'Gossip-based failure detection exchanges membership state (which nodes are alive/dead) and propagates quickly using epidemic protocols — it operates on small, frequently updated metadata. Anti-entropy exchanges actual data hashes to detect and repair divergent key ranges — it operates on potentially large data payloads (SSTable streams). They use the same gossip transport but for different purposes: failure detection runs continuously with short messages; anti-entropy runs on a schedule (e.g., daily) and may transfer gigabytes when it finds divergence. Cassandra\'s nodetool repair command triggers anti-entropy; the gossip protocol is always running in the background.',
    },
  ]);
}

export function mount(container) {
  const shell = createModuleShell(container, {
    tag: 'Distributed',
    title: 'Anti-Entropy',
    subtitle: 'Background repair, Merkle tree exchange, incremental repair, and CRDTs.',
    tabs: [
      { id:'anim',  label:'Visualisation' },
      { id:'crdts', label:'CRDT Types' },
      { id:'iq',    label:'Interview Q&A' },
    ],
  });
  const { tabs, body } = shell;
  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:340px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);
      const steps = AE_STEPS.map((s, i) => ({ label: s.label, duration: 2200, mutate: st => { st.idx = i; } }));
      const engine = new SimulationEngine({
        initialState: { idx: 0 }, steps,
        onRender: (state, cnv) => {
          const c = cnv.getContext('2d'), pr = window.devicePixelRatio || 1;
          cnv.width = cnv.clientWidth * pr; cnv.height = cnv.clientHeight * pr; c.scale(pr, pr);
          drawAE(c, state.idx, cnv.clientWidth, cnv.clientHeight);
        },
      });
      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));
      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);
      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = AE_STEPS[i].desc; });
      desc.textContent = AE_STEPS[0].desc;
      return () => engine.destroy();
    },
    crdts: renderCRDTs,
    iq:    renderIQ,
  });
  return null;
}
