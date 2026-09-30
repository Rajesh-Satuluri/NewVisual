import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

const NODES = [
  { id:'N1', x:0.50, y:0.15 },
  { id:'N2', x:0.17, y:0.38 },
  { id:'N3', x:0.28, y:0.76 },
  { id:'N4', x:0.72, y:0.76 },
  { id:'N5', x:0.83, y:0.38 },
];

// role: leader | follower | candidate | dead
// arrows: [{from,to,label,col}]
const LE_STEPS = [
  {
    label: 'Stable Cluster',
    desc: 'N1 is the current leader (Raft term 3). All followers receive heartbeats and stay idle.',
    roles: { N1:'leader', N2:'follower', N3:'follower', N4:'follower', N5:'follower' },
    term: 3, arrows: [], dead: [],
  },
  {
    label: 'Leader Fails',
    desc: 'N1 crashes. Followers stop receiving heartbeats. After the election timeout (randomized 150–300 ms), the first node to time out becomes a candidate.',
    roles: { N1:'dead', N2:'follower', N3:'follower', N4:'follower', N5:'follower' },
    term: 3, arrows: [], dead: ['N1'],
  },
  {
    label: 'N3 Starts Election',
    desc: 'N3\'s timer fires first. It increments term to 4, votes for itself, and sends RequestVote RPCs to all peers.',
    roles: { N1:'dead', N2:'follower', N3:'candidate', N4:'follower', N5:'follower' },
    term: 4,
    arrows: [
      { from:'N3', to:'N2', label:'RequestVote t4', col:'#F59E0B' },
      { from:'N3', to:'N4', label:'RequestVote t4', col:'#F59E0B' },
      { from:'N3', to:'N5', label:'RequestVote t4', col:'#F59E0B' },
    ],
    dead: ['N1'],
  },
  {
    label: 'Votes Granted',
    desc: 'N2, N4, N5 grant their votes (they haven\'t seen a higher term). N3 collects 3 votes — a quorum of 3 out of 4 active nodes (strict majority of 5 total: ≥3).',
    roles: { N1:'dead', N2:'follower', N3:'candidate', N4:'follower', N5:'follower' },
    term: 4,
    arrows: [
      { from:'N2', to:'N3', label:'VoteGranted', col:'#10B981' },
      { from:'N4', to:'N3', label:'VoteGranted', col:'#10B981' },
      { from:'N5', to:'N3', label:'VoteGranted', col:'#10B981' },
    ],
    dead: ['N1'],
  },
  {
    label: 'N3 Becomes Leader',
    desc: 'N3 wins the election and becomes leader for term 4. It immediately sends AppendEntries (heartbeats) to assert leadership and reset follower timers.',
    roles: { N1:'dead', N2:'follower', N3:'leader', N4:'follower', N5:'follower' },
    term: 4,
    arrows: [
      { from:'N3', to:'N2', label:'Heartbeat t4', col:'#10B981' },
      { from:'N3', to:'N4', label:'Heartbeat t4', col:'#10B981' },
      { from:'N3', to:'N5', label:'Heartbeat t4', col:'#10B981' },
    ],
    dead: ['N1'],
  },
];

const ROLE_COLOR = { leader:'#10B981', follower:'#4F46E5', candidate:'#F59E0B', dead:'#334155' };

function drawLE(ctx, idx, w, h) {
  const step = LE_STEPS[idx];
  ctx.clearRect(0, 0, w, h);
  const R = 22;

  // Arrows
  step.arrows.forEach(({ from, to, label, col }) => {
    const a = NODES.find(n => n.id === from);
    const b = NODES.find(n => n.id === to);
    const ax = a.x * w, ay = a.y * h, bx = b.x * w, by = b.y * h;
    const dist = Math.hypot(bx - ax, by - ay) || 1;
    const ux = (bx - ax) / dist, uy = (by - ay) / dist;
    const sx = ax + ux * R, sy = ay + uy * R;
    const ex = bx - ux * R, ey = by - uy * R;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey);
    ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
    const angle = Math.atan2(ey - sy, ex - sx);
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - 9 * Math.cos(angle - 0.4), ey - 9 * Math.sin(angle - 0.4));
    ctx.lineTo(ex - 9 * Math.cos(angle + 0.4), ey - 9 * Math.sin(angle + 0.4));
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
    // Label at midpoint
    const mx = (sx + ex) / 2, my = (sy + ey) / 2;
    ctx.fillStyle = '#0F172A'; ctx.font = '9px system-ui';
    const tw = ctx.measureText(label).width;
    ctx.fillRect(mx - tw / 2 - 3, my - 8, tw + 6, 13);
    ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, mx, my);
  });

  // Nodes
  NODES.forEach(n => {
    const nx = n.x * w, ny = n.y * h;
    const role = step.roles[n.id];
    const col = ROLE_COLOR[role];
    const isDead = step.dead.includes(n.id);

    if (!isDead) {
      ctx.beginPath(); ctx.arc(nx, ny, R + 9, 0, Math.PI * 2);
      ctx.strokeStyle = col + '44'; ctx.lineWidth = 3; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(nx, ny, R, 0, Math.PI * 2);
    ctx.fillStyle = col; ctx.fill();
    ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 2; ctx.stroke();

    if (isDead) {
      ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(nx - 10, ny - 10); ctx.lineTo(nx + 10, ny + 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(nx + 10, ny - 10); ctx.lineTo(nx - 10, ny + 10); ctx.stroke();
    } else {
      ctx.fillStyle = '#F8FAFC'; ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(n.id, nx, ny);
    }

    const badge = role.toUpperCase();
    ctx.fillStyle = col + 'CC';
    ctx.beginPath();
    const bw = ctx.measureText(badge).width + 12;
    ctx.roundRect(nx - bw / 2, ny + R + 4, bw, 15, 3); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '9px system-ui';
    ctx.fillText(badge, nx, ny + R + 12);
  });

  // Term badge
  const termLabel = `Term ${step.term}`;
  ctx.fillStyle = '#1E293B'; ctx.beginPath();
  ctx.roundRect(w - 90, 10, 80, 26, 5); ctx.fill();
  ctx.fillStyle = '#818CF8'; ctx.font = '700 12px system-ui';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(termLabel, w - 50, 23);

  // Legend
  const leg = [
    { col:'#10B981', label:'Leader' }, { col:'#4F46E5', label:'Follower' },
    { col:'#F59E0B', label:'Candidate' }, { col:'#334155', label:'Dead' },
  ];
  let lx = 12, ly = h - 14;
  leg.forEach(({ col, label }) => {
    ctx.fillStyle = col; ctx.fillRect(lx, ly - 7, 9, 9);
    ctx.fillStyle = '#94A3B8'; ctx.font = '10px system-ui';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(label, lx + 12, ly - 2);
    lx += ctx.measureText(label).width + 28;
  });
  ctx.textBaseline = 'alphabetic';
}

function renderConcepts(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="color:#E2E8F0;margin:0 0 14px">Election Safety Guarantees</h3>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:20px">
    ${[
      ['Election Safety','At most one leader per term. Ensured by requiring a strict majority (quorum) of votes.'],
      ['Randomized Timeout','Each follower has a random election timeout (150–300 ms). The first to timeout becomes candidate, reducing simultaneous candidacies.'],
      ['Term as Logical Clock','Terms monotonically increase. Any node receiving a higher term immediately reverts to follower, aborting any ongoing candidacy.'],
      ['Log Completeness','A candidate must have the most up-to-date log (by term then index) to win. Ensures all committed entries survive elections.'],
      ['Vote Persistence','Nodes persist their vote on disk before responding. If a node restarts mid-election, it won\'t vote for a different candidate in the same term.'],
      ['Leader Lease (optional)','Leader skips heartbeat round-trips for read linearizability by assuming its lease is still valid within a bounded clock skew window.'],
    ].map(([t,d]) => `
      <div style="background:#0F172A;border-radius:8px;padding:14px 16px">
        <div style="color:#10B981;font-weight:700;font-size:12px;margin-bottom:6px">${t}</div>
        <div style="font-size:12px;color:#94A3B8">${d}</div>
      </div>`).join('')}
  </div>
  <div style="background:#172554;border-left:3px solid #4F46E5;padding:12px 16px;border-radius:0 6px 6px 0;font-size:12px">
    <strong style="color:#818CF8">Bully Algorithm vs Raft:</strong>
    Bully elects the node with the highest ID (or priority). Simpler but doesn't account for log freshness — old data can become leader.
    Raft ties vote eligibility to log completeness, ensuring durability.
  </div>
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'Why does Raft use randomised election timeouts instead of fixed ones?',
      a: 'Fixed timeouts risk split-vote: multiple nodes time out simultaneously, each becomes a candidate, and votes are split such that no candidate reaches a majority. Randomisation statistically separates the timeouts so one node almost always fires first, becomes candidate, and collects a quorum before others even start.',
    },
    {
      q: 'How does Raft ensure a newly elected leader has all committed entries?',
      a: 'During RequestVote, the candidate includes its last log term and index. A voter only grants its vote if the candidate\'s log is at least as up-to-date as the voter\'s own log (compare by term first, then index). Because a quorum must have acknowledged every committed entry, and the quorum that votes overlaps with the quorum that committed, the winner must contain those entries.',
    },
    {
      q: 'What happens if two candidates start an election at the same time?',
      a: 'Neither may win the first round (split vote). Both restart with a new random timeout. Statistically, one fires sooner in the next round and wins. Raft handles arbitrary many split elections as long as one eventually gets a clean round — the algorithm is live, just potentially slow during contention.',
    },
  ]);
}

export function mount(container) {
  const shell = createModuleShell(container, {
    tag: 'Distributed',
    title: 'Leader Election',
    subtitle: 'How Raft elects a new leader when the current one fails.',
    tabs: [
      { id:'anim',     label:'Election Walkthrough' },
      { id:'concepts', label:'Safety Guarantees' },
      { id:'iq',       label:'Interview Q&A' },
    ],
  });
  const { tabs, body } = shell;
  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:340px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);
      const steps = LE_STEPS.map((s, i) => ({ label: s.label, duration: 2000, mutate: st => { st.idx = i; } }));
      const engine = new SimulationEngine({
        initialState: { idx: 0 }, steps,
        onRender: (state, cnv) => {
          const c = cnv.getContext('2d'), pr = window.devicePixelRatio || 1;
          cnv.width = cnv.clientWidth * pr; cnv.height = cnv.clientHeight * pr; c.scale(pr, pr);
          drawLE(c, state.idx, cnv.clientWidth, cnv.clientHeight);
        },
      });
      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));
      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);
      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = LE_STEPS[i].desc; });
      desc.textContent = LE_STEPS[0].desc;
      return () => engine.destroy();
    },
    concepts: renderConcepts,
    iq:       renderIQ,
  });
  return null;
}
