import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

/* ── Data ────────────────────────────────────────────────────────────────────*/
const FAILURE_TYPES = [
  { id:'crash',   label:'Node Crash',        color:'#EF4444', icon:'💥' },
  { id:'slow',    label:'Slow Node',          color:'#F59E0B', icon:'🐢' },
  { id:'net_part',label:'Network Partition',  color:'#A78BFA', icon:'✂️' },
  { id:'corrupt', label:'Data Corruption',    color:'#06B6D4', icon:'🔀' },
];

const FM_STEPS = [
  {
    active: null,
    nodes: [
      { id:'N1', x:0.2, y:0.4, state:'ok' },
      { id:'N2', x:0.5, y:0.2, state:'ok' },
      { id:'N3', x:0.8, y:0.4, state:'ok' },
      { id:'N4', x:0.35,y:0.7, state:'ok' },
      { id:'N5', x:0.65,y:0.7, state:'ok' },
    ],
    links: [['N1','N2'],['N2','N3'],['N1','N4'],['N4','N5'],['N3','N5'],['N2','N5']],
    desc: 'Distributed systems must assume nodes and networks WILL fail. A 5-node cluster with 99.9% per-node availability has only 99.9^5 = 99.5% combined availability without failure handling. With proper failure detection and recovery, availability approaches 99.99%+.',
  },
  {
    active: 'crash',
    nodes: [
      { id:'N1', x:0.2, y:0.4, state:'ok' },
      { id:'N2', x:0.5, y:0.2, state:'crashed' },
      { id:'N3', x:0.8, y:0.4, state:'ok' },
      { id:'N4', x:0.35,y:0.7, state:'ok' },
      { id:'N5', x:0.65,y:0.7, state:'ok' },
    ],
    links: [['N1','N2'],['N2','N3'],['N1','N4'],['N4','N5'],['N3','N5'],['N2','N5']],
    desc: 'NODE CRASH: N2 fails (OOM kill, hardware fault, kernel panic). Stop-fail — the node simply stops responding. Detection: heartbeat timeout (typically 3–10 seconds). Recovery: elect a new leader (Raft), re-route reads/writes to remaining nodes. Committed data is not lost if replication was synchronous.',
  },
  {
    active: 'slow',
    nodes: [
      { id:'N1', x:0.2, y:0.4, state:'ok' },
      { id:'N2', x:0.5, y:0.2, state:'slow' },
      { id:'N3', x:0.8, y:0.4, state:'ok' },
      { id:'N4', x:0.35,y:0.7, state:'ok' },
      { id:'N5', x:0.65,y:0.7, state:'ok' },
    ],
    links: [['N1','N2'],['N2','N3'],['N1','N4'],['N4','N5'],['N3','N5'],['N2','N5']],
    desc: 'SLOW NODE (Partial failure): N2 responds but 10× slower (disk I/O saturation, GC pause, noisy neighbor on cloud). Harder to detect than a crash — heartbeats still arrive. Causes tail latency: the slowest node drags down P99. Fix: hedged requests (send to 2 nodes, take the first response).',
  },
  {
    active: 'net_part',
    nodes: [
      { id:'N1', x:0.2, y:0.4, state:'ok' },
      { id:'N2', x:0.5, y:0.2, state:'ok' },
      { id:'N3', x:0.8, y:0.4, state:'partitioned' },
      { id:'N4', x:0.35,y:0.7, state:'ok' },
      { id:'N5', x:0.65,y:0.7, state:'partitioned' },
    ],
    links: [['N1','N2'],['N2','N3'],['N1','N4'],['N4','N5'],['N3','N5'],['N2','N5']],
    partitionCut: [['N2','N3'],['N2','N5'],['N4','N5']],
    desc: 'NETWORK PARTITION: {N1,N2,N4} and {N3,N5} can no longer communicate. Both groups are still running — nodes are not crashed. CAP theorem applies: the cluster must choose CONSISTENCY (stop writes in the minority partition) or AVAILABILITY (allow divergent writes). Raft chooses C: minority stops accepting writes.',
  },
  {
    active: 'corrupt',
    nodes: [
      { id:'N1', x:0.2, y:0.4, state:'ok' },
      { id:'N2', x:0.5, y:0.2, state:'corrupt' },
      { id:'N3', x:0.8, y:0.4, state:'ok' },
      { id:'N4', x:0.35,y:0.7, state:'ok' },
      { id:'N5', x:0.65,y:0.7, state:'ok' },
    ],
    links: [['N1','N2'],['N2','N3'],['N1','N4'],['N4','N5'],['N3','N5'],['N2','N5']],
    desc: 'DATA CORRUPTION: N2 returns wrong data (bit flip, storage bug). Byzantine failure — the hardest to detect and handle. Standard Raft/Paxos assumes crash-stop failures; a node that responds with wrong values breaks the protocol. Defense: checksums on data blocks (PostgreSQL page checksums), cryptographic hashing on replicated log entries.',
  },
];

const STATE_COLOR = { ok:'#4F46E5', crashed:'#EF4444', slow:'#F59E0B', partitioned:'#A78BFA', corrupt:'#06B6D4' };

/* ── Canvas ──────────────────────────────────────────────────────────────────*/
function drawFM(ctx, stepIdx, w, h) {
  const step = FM_STEPS[stepIdx];
  ctx.clearRect(0, 0, w, h);

  const nodeR = 22;

  // Links
  step.links.forEach(([a, b]) => {
    const na = step.nodes.find(n => n.id === a);
    const nb = step.nodes.find(n => n.id === b);
    const isCut = step.partitionCut && step.partitionCut.some(([x, y]) =>
      (x === a && y === b) || (x === b && y === a));

    if (isCut) {
      ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(na.x * w, na.y * h);
      ctx.lineTo(nb.x * w, nb.y * h);
      ctx.stroke();
      ctx.setLineDash([]);
      // ✕ in middle
      const mx = (na.x + nb.x) / 2 * w, my = (na.y + nb.y) / 2 * h;
      ctx.fillStyle = '#EF4444'; ctx.font = '700 10px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('✕', mx, my + 4);
    } else {
      ctx.strokeStyle = '#1E3A5F'; ctx.lineWidth = 1; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(na.x * w, na.y * h); ctx.lineTo(nb.x * w, nb.y * h); ctx.stroke();
    }
  });

  // Nodes
  step.nodes.forEach(n => {
    const col = STATE_COLOR[n.state] || '#334155';
    const nx = n.x * w, ny = n.y * h;

    ctx.fillStyle = col + '33'; ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(nx, ny, nodeR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    ctx.fillStyle = col; ctx.font = '700 9px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(n.id, nx, ny - 4);
    ctx.fillStyle = '#94A3B8'; ctx.font = '7.5px system-ui';
    ctx.fillText(n.state.toUpperCase(), nx, ny + 8);

    if (n.state === 'crashed') {
      ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(nx - 10, ny - 10); ctx.lineTo(nx + 10, ny + 10);
      ctx.moveTo(nx + 10, ny - 10); ctx.lineTo(nx - 10, ny + 10);
      ctx.stroke();
    }
    if (n.state === 'slow') {
      ctx.fillStyle = '#F59E0B'; ctx.font = '10px system-ui';
      ctx.fillText('🐢', nx - 5, ny + 22);
    }
  });

  // Failure type legend
  const active = step.active;
  if (active) {
    const ft = FAILURE_TYPES.find(f => f.id === active);
    ctx.fillStyle = ft.color + '22'; ctx.strokeStyle = ft.color; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(10, h - 38, 180, 28, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = ft.color; ctx.font = '700 9px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(`${ft.icon}  ${ft.label}`, 20, h - 21);
  }
  ctx.textAlign = 'left';
}

/* ── Detection tab ───────────────────────────────────────────────────────────*/
function renderDetectionTab(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-family:system-ui;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="margin:0 0 14px;color:#E2E8F0;font-size:15px">Failure Detection Techniques</h3>
  ${[
    { name:'Heartbeat / Ping', color:'#4F46E5',
      body:'Each node periodically sends a "I am alive" message. If no heartbeat arrives within a timeout (T_fail), the monitoring node declares the target failed. Problem: you cannot distinguish crash from slow network — both look the same before the timeout. Trade-off: short timeout → fast detection but false positives; long timeout → slower detection but fewer false positives.' },
    { name:'Phi Accrual Failure Detector', color:'#10B981',
      body:'Used by Cassandra and Akka. Instead of a binary alive/dead decision, maintains a probability score φ (phi) based on the distribution of inter-heartbeat arrival times. When φ exceeds a threshold (e.g., 8.0), the node is declared suspected. Adapts to network jitter — a slightly late heartbeat increases φ marginally, while a very late one crosses the threshold quickly. Fewer false positives than fixed-timeout detectors.' },
    { name:'Gossip Protocol', color:'#F59E0B',
      body:'Each node periodically exchanges state (which nodes it believes are alive/failed) with a random subset of other nodes. Information propagates in O(log N) rounds. Cassandra uses gossip for membership and failure detection. Advantage: no single point of failure; all nodes collectively maintain the membership view. Used alongside phi accrual detector for fine-grained failure suspicion.' },
    { name:'Lease-based Detection', color:'#A78BFA',
      body:'A central coordinator grants time-bounded "leases" to nodes. A node with a valid lease is considered alive. If a node fails to renew its lease before expiry, it loses its lease and is declared failed. Used by Google Chubby and etcd (lease TTL). Guarantees that a node cannot claim liveness after its lease expires — useful for leader validity.' },
  ].map(t => `<div style="border-left:3px solid ${t.color};padding-left:12px;margin-bottom:16px">
    <h4 style="margin:0 0 6px;color:${t.color};font-size:12px">${t.name}</h4>
    <p style="margin:0;font-size:12px">${t.body}</p>
  </div>`).join('')}
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'Why is "slow node" harder to handle than a crashed node?',
      a: `A crashed node simply stops responding — after the heartbeat timeout, it is definitively declared dead and the system routes around it. The response is clear and decisive.<br><br>
A slow node still responds — it shows up as alive in heartbeat checks — but its responses take 5–50× longer than normal. This causes: (1) <strong>Tail latency amplification</strong>: in a cluster of 5 nodes, if one node serves 20% of requests at 10× normal latency, P99 latency is dominated by that node. (2) <strong>Cascading overload</strong>: if timeouts are long, requests to the slow node back up, consuming connection pool slots and causing other requests to also time out. (3) <strong>Incorrect failure detection</strong>: if the threshold is "no response in T seconds," a node responding in T+1ms is not declared failed but is useless for latency SLOs.<br><br>
Solutions: hedged requests (send to N+1 nodes, use the fastest response), adaptive timeouts (reduce timeout for a node that's been consistently slow), and circuit breakers (stop sending requests to a slow node for a cool-down period).`,
    },
    {
      q: 'What is split-brain and how do distributed databases prevent it?',
      a: `Split-brain occurs when a network partition divides a cluster into two groups, and both groups independently elect a leader and continue accepting writes. Each half believes it is the authoritative group. When the partition heals, both halves have divergent data — a genuine data conflict with no clear resolution.<br><br>
Prevention: (1) <strong>Quorum-based leadership</strong>: a leader can only be elected with votes from a strict majority (>N/2) of nodes. In a 5-node cluster split into {3} and {2}, only the group of 3 can elect a leader. The minority of 2 cannot form a quorum → they stop accepting writes → no split-brain. (2) <strong>Fencing tokens</strong>: when a leader is elected, it receives a monotonically increasing token. Any operation requiring shared state must include this token; the shared resource rejects requests with an old token — even if the old leader thinks it's still active. (3) <strong>STONITH (Shoot The Other Node In The Head)</strong>: the winning partition sends a power-off command to the nodes in the minority partition before proceeding — guarantees the minority is dead before the majority proceeds.`,
    },
    {
      q: 'What is a Byzantine failure, and do production distributed databases handle it?',
      a: `A Byzantine failure is one where a node behaves arbitrarily — it might respond with wrong data, send different messages to different peers, or selectively drop some messages while forwarding others. Named after the Byzantine Generals Problem. This is more severe than a crash-stop failure because the node appears to be working but is actively lying.<br><br>
Most production distributed databases (PostgreSQL streaming replication, CockroachDB, Cassandra, Spanner) assume <strong>crash-stop failures only</strong>. Their consensus protocols (Raft, Paxos) break under Byzantine nodes — a single Byzantine node can cause an otherwise correct cluster to make wrong decisions.<br><br>
Byzantine Fault Tolerance (BFT) requires 3f+1 nodes to tolerate f Byzantine failures (vs 2f+1 for crash-stop). The overhead is significant — typically 3–5× more messages and cryptographic signatures on every message. BFT is used in blockchain systems (Tendermint BFT, PBFT in Hyperledger) where participants are untrusted. Production databases instead rely on hardware integrity, OS memory protection, and checksums to detect (not tolerate) corruption — they alert and halt rather than continuing with incorrect data.`,
    },
  ]);
}

export function mount(container) {
  const shell = createModuleShell(container, {
    tag: 'Distributed',
    title: 'Failure Modes',
    subtitle: 'Node crash, slow nodes, network partitions, and data corruption — how distributed systems detect and respond to failures',
    tabs: [
      { id:'anim',      label:'Failure Types' },
      { id:'detection', label:'Failure Detection' },
      { id:'iq',        label:'Interview Q&A' },
    ],
  });
  const { tabs, body } = shell;
  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:340px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);
      const steps = FM_STEPS.map((s, i) => ({ label: `Step ${i + 1}`, duration: 2800, mutate: st => { st.stepIdx = i; } }));
      const engine = new SimulationEngine({
        initialState: { stepIdx: 0 }, steps,
        onRender: (state, cnv) => {
          const ctx = cnv.getContext('2d'), pr = window.devicePixelRatio || 1;
          cnv.width = cnv.clientWidth * pr; cnv.height = cnv.clientHeight * pr; ctx.scale(pr, pr);
          drawFM(ctx, state.stepIdx, cnv.clientWidth, cnv.clientHeight);
        },
      });
      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));
      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);
      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = FM_STEPS[i].desc; });
      desc.textContent = FM_STEPS[0].desc;
      return () => engine.destroy();
    },
    detection: renderDetectionTab,
    iq:        renderIQ,
  });
  return null;
}
