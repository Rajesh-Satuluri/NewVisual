import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

const NODES = [
  { id:'N1', x:0.50, y:0.18 },
  { id:'N2', x:0.20, y:0.42 },
  { id:'N3', x:0.35, y:0.72 },
  { id:'N4', x:0.65, y:0.72 },
  { id:'N5', x:0.80, y:0.42 },
];

const HB_STEPS = [
  {
    label: 'All Alive',
    desc: 'Every node broadcasts a heartbeat (alive counter) each round. Neighbours update their local membership view.',
    silent: [], gossip: [],
  },
  {
    label: 'N3 Stops',
    desc: 'N3 crashes. Its heartbeat counter stops. Direct neighbours N2 and N4 detect no increment within the timeout window.',
    silent: ['N3'], gossip: [],
  },
  {
    label: 'Gossip Spreads',
    desc: 'N2 and N4 gossip "N3 suspect" to their peers. Each merge picks the highest heartbeat counter seen.',
    silent: ['N3'], gossip: [{from:'N2',to:'N1'},{from:'N4',to:'N5'},{from:'N1',to:'N5'}],
  },
  {
    label: 'Full Convergence',
    desc: 'Within O(log N) rounds all nodes converge on "N3 = dead". No central coordinator needed.',
    silent: ['N3'], gossip: [{from:'N1',to:'N5'},{from:'N5',to:'N2'},{from:'N2',to:'N4'}],
  },
  {
    label: 'N3 Rejoins',
    desc: 'N3 restarts with a higher incarnation number, overriding the dead state cluster-wide in the next gossip round.',
    silent: [], gossip: [{from:'N3',to:'N2'},{from:'N3',to:'N4'}], rejoin: 'N3',
  },
];

function drawHB(ctx, idx, w, h) {
  const step = HB_STEPS[idx];
  ctx.clearRect(0, 0, w, h);
  const R = 22;

  // Gossip arrows
  ctx.setLineDash([5, 4]);
  step.gossip.forEach(({ from, to }) => {
    const a = NODES.find(n => n.id === from);
    const b = NODES.find(n => n.id === to);
    const ax = a.x * w, ay = a.y * h, bx = b.x * w, by = b.y * h;
    const dist = Math.hypot(bx - ax, by - ay) || 1;
    const ux = (bx - ax) / dist, uy = (by - ay) / dist;
    const sx = ax + ux * R, sy = ay + uy * R;
    const ex = bx - ux * R, ey = by - uy * R;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey);
    ctx.strokeStyle = '#A78BFA'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.setLineDash([]);
    const angle = Math.atan2(ey - sy, ex - sx);
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - 9 * Math.cos(angle - 0.4), ey - 9 * Math.sin(angle - 0.4));
    ctx.lineTo(ex - 9 * Math.cos(angle + 0.4), ey - 9 * Math.sin(angle + 0.4));
    ctx.closePath(); ctx.fillStyle = '#A78BFA'; ctx.fill();
    ctx.setLineDash([5, 4]);
  });
  ctx.setLineDash([]);

  // Nodes
  NODES.forEach(n => {
    const nx = n.x * w, ny = n.y * h;
    const isSilent = step.silent.includes(n.id);
    const isRejoin = step.rejoin === n.id;
    const col = isRejoin ? '#10B981' : isSilent ? '#EF4444' : '#4F46E5';

    if (!isSilent) {
      ctx.beginPath(); ctx.arc(nx, ny, R + 9, 0, Math.PI * 2);
      ctx.strokeStyle = '#10B98155'; ctx.lineWidth = 3; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(nx, ny, R, 0, Math.PI * 2);
    ctx.fillStyle = col; ctx.fill();
    ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 2; ctx.stroke();

    ctx.fillStyle = '#F8FAFC'; ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(n.id, nx, ny);

    const badge = isRejoin ? 'REJOINED' : isSilent ? 'SILENT' : '♥ ALIVE';
    ctx.fillStyle = (isRejoin ? '#10B981' : isSilent ? '#EF4444' : '#4F46E5') + 'CC';
    const bw = ctx.measureText(badge).width + 12;
    ctx.beginPath(); ctx.roundRect(nx - bw / 2, ny + R + 4, bw, 15, 3); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '9px system-ui';
    ctx.fillText(badge, nx, ny + R + 12);
  });

  // Legend
  const legend = [
    { col:'#4F46E5', label:'Alive' }, { col:'#EF4444', label:'Silent' },
    { col:'#10B981', label:'Rejoined' }, { col:'#A78BFA', label:'Gossip msg' },
  ];
  let lx = 12, ly = h - 14;
  legend.forEach(({ col, label }) => {
    ctx.fillStyle = col; ctx.fillRect(lx, ly - 7, 9, 9);
    ctx.fillStyle = '#94A3B8'; ctx.font = '10px system-ui';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(label, lx + 12, ly - 2);
    lx += ctx.measureText(label).width + 30;
  });
  ctx.textBaseline = 'alphabetic';
}

function renderMath(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="color:#E2E8F0;margin:0 0 14px">Gossip Convergence Math</h3>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:20px">
    ${[
      ['Fanout (k)','Each node picks k random peers per round (typically k=2). Information spreads exponentially.'],
      ['Rounds to converge','O(log₂ N) rounds. 100-node cluster: ~7 rounds. 1 000-node: ~10 rounds.'],
      ['Bandwidth','O(N·k) messages/round total. Scales linearly — far cheaper than all-to-all O(N²).'],
      ['Heartbeat counter','Monotonic counter per node. Merge rule: pick max. Stale entries expire after T_fail.'],
      ['Incarnation number','Restarted node increments incarnation, overriding stale "dead" gossip.'],
      ['Phi accrual (Cassandra)','Models inter-arrival times statistically. φ threshold ~8 for LAN — adapts to jitter.'],
    ].map(([t,d]) => `
      <div style="background:#0F172A;border-radius:8px;padding:14px 16px">
        <div style="color:#818CF8;font-weight:700;font-size:12px;margin-bottom:6px">${t}</div>
        <div style="font-size:12px;color:#94A3B8">${d}</div>
      </div>`).join('')}
  </div>
  <div style="background:#172554;border-left:3px solid #4F46E5;padding:12px 16px;border-radius:0 6px 6px 0;font-size:12px">
    <strong style="color:#818CF8">Formula:</strong> After <em>r</em> rounds, fraction informed ≈ 1 − (1 − k/N)ʳ.
    With k=2, N=100: after 7 rounds → 99.9% informed.
  </div>
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'Why does gossip converge in O(log N) rounds?',
      a: 'Each round approximately doubles the set of informed nodes (exponential growth). The math mirrors a binary tree: depth = log₂ N levels to reach all N leaves.',
    },
    {
      q: 'What is an incarnation number and why is it needed?',
      a: 'A monotonically increasing counter a node stamps on its own record. If falsely declared dead, the restarted node broadcasts a higher incarnation — this new message overrides the stale "dead" gossip across the cluster within one gossip round.',
    },
    {
      q: "How does Cassandra's phi accrual detector differ from a fixed timeout?",
      a: 'Instead of binary alive/dead at a fixed threshold, it accumulates inter-arrival times and computes φ — the probability (log-scale) that the node has failed. Applications choose their own φ threshold, trading false positives for detection speed. A jittery network simply raises the distribution mean, reducing false positives automatically.',
    },
  ]);
}

export function mount(container) {
  const shell = createModuleShell(container, {
    tag: 'Distributed',
    title: 'Heartbeats & Gossip Protocol',
    subtitle: 'How nodes detect each other\'s liveness without a central coordinator.',
    tabs: [
      { id:'anim', label:'Simulation' },
      { id:'math', label:'Gossip Math' },
      { id:'iq',   label:'Interview Q&A' },
    ],
  });
  const { tabs, body } = shell;
  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:320px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);
      const steps = HB_STEPS.map((s, i) => ({ label: s.label, duration: 1800, mutate: st => { st.idx = i; } }));
      const engine = new SimulationEngine({
        initialState: { idx: 0 }, steps,
        onRender: (state, cnv) => {
          const c = cnv.getContext('2d'), pr = window.devicePixelRatio || 1;
          cnv.width = cnv.clientWidth * pr; cnv.height = cnv.clientHeight * pr; c.scale(pr, pr);
          drawHB(c, state.idx, cnv.clientWidth, cnv.clientHeight);
        },
      });
      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));
      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);
      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = HB_STEPS[i].desc; });
      desc.textContent = HB_STEPS[0].desc;
      return () => engine.destroy();
    },
    math: renderMath,
    iq:   renderIQ,
  });
  return null;
}
