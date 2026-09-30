import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

/* ── Data ────────────────────────────────────────────────────────────────────*/
// 5-node Raft cluster: leader election + log replication
const NODES = [
  { id:'N1', x:0.5,  y:0.18 },
  { id:'N2', x:0.18, y:0.42 },
  { id:'N3', x:0.82, y:0.42 },
  { id:'N4', x:0.28, y:0.78 },
  { id:'N5', x:0.72, y:0.78 },
];

const RAFT_STEPS = [
  {
    roles: { N1:'follower', N2:'follower', N3:'follower', N4:'follower', N5:'follower' },
    leader: null, term: 1, logEntries: [],
    links: [], crashed: [],
    desc: 'Initial state: all 5 nodes are followers in term 1. Each follower has an election timeout (150–300ms). They wait for a heartbeat from a leader. Since there is no leader, election timeouts will fire.',
  },
  {
    roles: { N1:'candidate', N2:'follower', N3:'follower', N4:'follower', N5:'follower' },
    leader: null, term: 2, logEntries: [],
    links: [['N1','N2'],['N1','N3'],['N1','N4'],['N1','N5']],
    crashed: [],
    desc: 'N1\'s election timeout fires first. N1 increments term to 2, votes for itself, and sends RequestVote RPCs to all other nodes. Each node can grant at most one vote per term.',
  },
  {
    roles: { N1:'leader', N2:'follower', N3:'follower', N4:'follower', N5:'follower' },
    leader: 'N1', term: 2, logEntries: [],
    links: [['N1','N2'],['N1','N3'],['N1','N4'],['N1','N5']],
    crashed: [],
    desc: 'N1 receives votes from N2, N3, N4 (quorum = 3 of 5). N1 becomes LEADER for term 2. It immediately sends heartbeat AppendEntries RPCs to suppress other elections. Followers reset their timeouts.',
  },
  {
    roles: { N1:'leader', N2:'follower', N3:'follower', N4:'follower', N5:'follower' },
    leader: 'N1', term: 2,
    logEntries: [
      { idx:1, term:2, cmd:'SET x=1', committed:false },
    ],
    links: [['N1','N2'],['N1','N3'],['N1','N4'],['N1','N5']],
    crashed: [],
    desc: 'CLIENT WRITE: Leader N1 appends "SET x=1" to its local log (index 1, term 2). It sends AppendEntries with this entry to all followers. The entry is not yet committed — leader waits for majority acknowledgment.',
  },
  {
    roles: { N1:'leader', N2:'follower', N3:'follower', N4:'follower', N5:'follower' },
    leader: 'N1', term: 2,
    logEntries: [
      { idx:1, term:2, cmd:'SET x=1', committed:true },
    ],
    links: [['N1','N2'],['N1','N3'],['N1','N4'],['N1','N5']],
    crashed: [],
    desc: 'COMMIT: N2, N3, N4 acknowledge the entry (quorum). N1 advances its commit index, applies "SET x=1" to its state machine, responds SUCCESS to client. Next heartbeat notifies followers to commit and apply.',
  },
  {
    roles: { N1:'dead', N2:'candidate', N3:'follower', N4:'follower', N5:'follower' },
    leader: null, term: 3,
    logEntries: [{ idx:1, term:2, cmd:'SET x=1', committed:true }],
    links: [['N2','N3'],['N2','N4'],['N2','N5']],
    crashed: ['N1'],
    desc: 'LEADER FAILURE: N1 crashes. Followers stop receiving heartbeats. N2\'s timeout fires first — it increments term to 3 and sends RequestVote. N2 wins the election (3 of 4 remaining = quorum). No data loss: committed entries were already on N2, N3, N4.',
  },
  {
    roles: { N1:'dead', N2:'leader', N3:'follower', N4:'follower', N5:'follower' },
    leader: 'N2', term: 3,
    logEntries: [{ idx:1, term:2, cmd:'SET x=1', committed:true }],
    links: [['N2','N3'],['N2','N4'],['N2','N5']],
    crashed: ['N1'],
    desc: 'N2 is the new LEADER for term 3. The cluster is fully operational with 4 nodes. When N1 recovers, it will receive AppendEntries from N2, discover term 3 > term 2, revert to follower, and sync its log from N2.',
  },
];

/* ── Canvas ──────────────────────────────────────────────────────────────────*/
const ROLE_COLOR = {
  leader:    '#10B981',
  follower:  '#4F46E5',
  candidate: '#F59E0B',
  dead:      '#EF4444',
};

function drawRaft(ctx, stepIdx, w, h) {
  const step = RAFT_STEPS[stepIdx];
  ctx.clearRect(0, 0, w, h);

  const nodeR = 24;

  // Links
  step.links.forEach(([a, b]) => {
    const na = NODES.find(n => n.id === a);
    const nb = NODES.find(n => n.id === b);
    ctx.strokeStyle = '#1E3A5F'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(na.x * w, na.y * h);
    ctx.lineTo(nb.x * w, nb.y * h);
    ctx.stroke();
  });

  // Nodes
  NODES.forEach(n => {
    const role = step.roles[n.id];
    const crashed = step.crashed.includes(n.id);
    const col = ROLE_COLOR[role] || '#334155';
    const nx = n.x * w, ny = n.y * h;

    ctx.globalAlpha = crashed ? 0.3 : 1;
    ctx.fillStyle = col + '33'; ctx.strokeStyle = col;
    ctx.lineWidth = role === 'leader' ? 3 : (role === 'candidate' ? 2 : 1);
    ctx.beginPath(); ctx.arc(nx, ny, nodeR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    ctx.fillStyle = col; ctx.font = '700 9px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(n.id, nx, ny - 4);
    ctx.fillStyle = '#94A3B8'; ctx.font = '7.5px system-ui';
    ctx.fillText(role.toUpperCase(), nx, ny + 8);

    if (role === 'leader') {
      ctx.fillStyle = '#10B981'; ctx.font = '700 7px system-ui';
      ctx.fillText('♛ LEADER', nx, ny + 20);
    }
    if (crashed) {
      ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(nx - 12, ny - 12); ctx.lineTo(nx + 12, ny + 12);
      ctx.moveTo(nx + 12, ny - 12); ctx.lineTo(nx - 12, ny + 12);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });

  // Term + log panel
  const px = w - 170, py = 10;
  ctx.fillStyle = '#0F172A'; ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(px, py, 158, step.logEntries.length > 0 ? 80 : 42, 6); ctx.fill(); ctx.stroke();

  ctx.fillStyle = '#64748B'; ctx.font = '700 8px system-ui'; ctx.textAlign = 'left';
  ctx.fillText(`Term: ${step.term}`, px + 10, py + 16);
  ctx.fillText(`Leader: ${step.leader || '—'}`, px + 80, py + 16);
  ctx.fillText(`Quorum: ${Math.floor(NODES.length / 2) + 1} of ${NODES.length}`, px + 10, py + 30);

  step.logEntries.forEach((e, i) => {
    const ey = py + 44 + i * 18;
    ctx.fillStyle = e.committed ? '#10B981' + '22' : '#F59E0B' + '22';
    ctx.strokeStyle = e.committed ? '#10B981' : '#F59E0B';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(px + 6, ey, 146, 15, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = e.committed ? '#10B981' : '#F59E0B';
    ctx.font = '7.5px monospace';
    ctx.fillText(`[${e.idx}] t${e.term}: ${e.cmd} (${e.committed ? 'COMMITTED' : 'pending'})`, px + 10, ey + 10);
  });

  ctx.textAlign = 'left';
}

/* ── Raft concepts tab ───────────────────────────────────────────────────────*/
function renderConceptsTab(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-family:system-ui;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="margin:0 0 14px;color:#E2E8F0;font-size:15px">Raft Core Concepts</h3>
  ${[
    { name:'Terms', color:'#818CF8',
      body:'Raft divides time into terms, each starting with an election. Terms are monotonically increasing integers. A node always follows the highest term it has seen — if it sees a message with a higher term, it immediately reverts to follower. Terms are the logical clock of Raft consensus.' },
    { name:'Leader Election', color:'#F59E0B',
      body:'Followers have randomized election timeouts (150–300ms). If no heartbeat arrives, a follower becomes candidate, increments its term, votes for itself, and sends RequestVote to all others. A candidate wins if it gets votes from a strict majority (⌊N/2⌋+1). Each node grants at most one vote per term.' },
    { name:'Log Replication', color:'#10B981',
      body:'Leader receives client commands, appends to its log, then sends AppendEntries to all followers. Once a majority ACK the entry, the leader marks it committed and applies it to its state machine. Followers apply committed entries on the next heartbeat.' },
    { name:'Safety Guarantee', color:'#06B6D4',
      body:'A committed entry is guaranteed to be present in all future leaders\' logs. Raft ensures this via a "log completeness" vote restriction: a candidate cannot win if a voter has a log more up-to-date than the candidate\'s (higher term or same term with higher index).' },
  ].map(c => `<div style="border-left:3px solid ${c.color};padding-left:12px;margin-bottom:16px">
    <h4 style="margin:0 0 6px;color:${c.color};font-size:12px">${c.name}</h4>
    <p style="margin:0;font-size:12px">${c.body}</p>
  </div>`).join('')}

  <h3 style="margin:8px 0 12px;color:#E2E8F0;font-size:15px">Raft Timing Properties</h3>
  <table style="width:100%;border-collapse:collapse;font-size:12px">
    <thead><tr style="background:#0F172A"><th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Property</th><th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Typical Value</th><th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Why</th></tr></thead>
    <tbody>
      ${[
        ['Election timeout','150–300ms (random)','Randomization prevents split-vote ties; must be >> heartbeat interval'],
        ['Heartbeat interval','50–100ms','Must be much less than election timeout to prevent spurious elections'],
        ['Leader failover time','1 election timeout (~200ms)','One election timeout + one round trip for vote RPCs'],
        ['Write latency','1 round trip to majority','Leader → followers (AppendEntries) → leader commits → client'],
        ['Max tolerable failures','⌊N/2⌋','5-node cluster tolerates 2 failures; 3-node tolerates 1'],
      ].map(([p,v,w]) => `<tr style="border-bottom:1px solid #0F172A">
        <td style="padding:7px 10px;color:#94A3B8">${p}</td>
        <td style="padding:7px 10px;color:#F59E0B;font-family:monospace;font-size:11px">${v}</td>
        <td style="padding:7px 10px;font-size:11px">${w}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'How does Raft guarantee that a committed entry is never lost, even after leader failures?',
      a: `Raft's safety guarantee is the "Leader Completeness" property: the leader for any term has all entries committed in previous terms. This is enforced by the <strong>vote restriction</strong> in the election algorithm: a candidate C can only receive a vote from node F if C's log is "at least as up-to-date" as F's log — meaning C's last log entry has a higher term, or if terms are equal, C has a longer log.<br><br>
This works because: (1) a committed entry was replicated to a majority before being committed; (2) any new election requires votes from a majority; (3) by the pigeonhole principle, any new majority overlaps with the old majority — at least one voter has the committed entry; (4) that voter will reject any candidate whose log is missing the entry. Therefore no new leader can win election without having all committed entries.`,
    },
    {
      q: 'What is a split vote in Raft, and how does randomized election timeout prevent it?',
      a: `A split vote occurs when multiple candidates send RequestVote simultaneously, and each candidate gets exactly ⌊N/2⌋ votes — no majority is achieved. Without a tiebreaker, the cluster would loop indefinitely with no leader elected. For example, in a 4-node cluster (quorum=3), if two candidates each get 2 votes, neither wins, and both increment term and try again — potentially forever.<br><br>
Randomized election timeouts solve this probabilistically. Each follower picks a random timeout in [150ms, 300ms]. The node with the shortest timeout fires first, often becoming candidate before others. It sends RequestVote before others timeout, collects votes from nodes that are still followers, and usually wins. The probability of two nodes firing at exactly the same millisecond is low (~1ms resolution → 0.67% chance of collision). In practice, most elections resolve in one round.`,
    },
    {
      q: 'What systems use Raft in production, and how do they adapt it for real workloads?',
      a: `Raft is used in etcd (Kubernetes config store), CockroachDB (SQL, per-shard Raft), TiKV (TiDB's storage layer), Consul, and SingleStore. Each adapts core Raft for production:<br><br>
(1) <strong>Pre-vote</strong>: before incrementing term and becoming candidate, a node sends a "pre-vote" to check if it would win. This prevents a partitioned node from disrupting the cluster by forcing term bumps when it reconnects — the pre-vote is rejected if the cluster already has a live leader. (2) <strong>Leader lease</strong>: to serve linearizable reads without a round trip, the leader tracks that it won the last election <T ms ago (where T < election timeout). Within the lease, it can serve reads from its local state without asking followers. (3) <strong>Batching</strong>: CockroachDB and TiKV batch multiple client writes into single AppendEntries RPCs to amortize the two-round-trip latency across many concurrent writes — critical for OLTP throughput.`,
    },
  ]);
}

export function mount(container) {
  const shell = createModuleShell(container, {
    tag: 'Distributed',
    title: 'Raft Consensus',
    subtitle: 'Leader election, log replication, and safety guarantees — how distributed systems agree on order of operations',
    tabs: [
      { id:'anim',     label:'Raft Walkthrough' },
      { id:'concepts', label:'Core Concepts' },
      { id:'iq',       label:'Interview Q&A' },
    ],
  });
  const { tabs, body } = shell;
  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:340px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);
      const steps = RAFT_STEPS.map((s, i) => ({ label: `Step ${i + 1}`, duration: 2800, mutate: st => { st.stepIdx = i; } }));
      const engine = new SimulationEngine({
        initialState: { stepIdx: 0 }, steps,
        onRender: (state, cnv) => {
          const ctx = cnv.getContext('2d'), pr = window.devicePixelRatio || 1;
          cnv.width = cnv.clientWidth * pr; cnv.height = cnv.clientHeight * pr; ctx.scale(pr, pr);
          drawRaft(ctx, state.stepIdx, cnv.clientWidth, cnv.clientHeight);
        },
      });
      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));
      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);
      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = RAFT_STEPS[i].desc; });
      desc.textContent = RAFT_STEPS[0].desc;
      return () => engine.destroy();
    },
    concepts: renderConceptsTab,
    iq: renderIQ,
  });
  return null;
}
