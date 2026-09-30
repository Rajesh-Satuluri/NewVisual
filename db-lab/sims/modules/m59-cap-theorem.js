import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

/* ── Step data ─────────────────────────────────────────────────────────────── */
// CAP triangle animation: 3 nodes, network partition scenarios
const CAP_STEPS = [
  {
    nodes: [
      { id:'N1', x:0.2, y:0.45, label:'Node A', color:'#4F46E5', val:'stock=100' },
      { id:'N2', x:0.5, y:0.20, label:'Node B', color:'#10B981', val:'stock=100' },
      { id:'N3', x:0.8, y:0.45, label:'Node C', color:'#F59E0B', val:'stock=100' },
    ],
    links: [['N1','N2','ok'],['N2','N3','ok'],['N1','N3','ok']],
    scenario: 'normal', choice: null,
    desc: 'Three-node distributed cluster. All nodes agree: inventory stock=100. All links healthy — data is Consistent, Available, and the system is Partition Tolerant. CAP theorem: you can only guarantee 2 of 3 when a partition occurs.',
  },
  {
    nodes: [
      { id:'N1', x:0.2, y:0.45, label:'Node A', color:'#4F46E5', val:'stock=100' },
      { id:'N2', x:0.5, y:0.20, label:'Node B', color:'#10B981', val:'stock=100' },
      { id:'N3', x:0.8, y:0.45, label:'Node C', color:'#F59E0B', val:'stock=100' },
    ],
    links: [['N1','N2','ok'],['N2','N3','broken'],['N1','N3','broken']],
    scenario: 'partition', choice: null,
    desc: 'NETWORK PARTITION: Node C loses connectivity to A and B. Messages between {A,B} and {C} are dropped. This is the "P" in CAP — partitions happen in real distributed systems. Now we must choose: Consistency or Availability?',
  },
  {
    nodes: [
      { id:'N1', x:0.2, y:0.45, label:'Node A', color:'#4F46E5', val:'stock=90', write:true },
      { id:'N2', x:0.5, y:0.20, label:'Node B', color:'#10B981', val:'stock=90' },
      { id:'N3', x:0.8, y:0.45, label:'Node C', color:'#EF4444', val:'stock=100', blocked:true },
    ],
    links: [['N1','N2','ok'],['N2','N3','broken'],['N1','N3','broken']],
    scenario: 'cp', choice: 'CP',
    desc: 'CP choice (Consistent + Partition-Tolerant): Client writes stock=90 to Node A. Node A replicates to B (healthy). C is unreachable — A rejects reads/writes routed to C, or C returns "service unavailable." Consistency preserved; C is unavailable during the partition.',
  },
  {
    nodes: [
      { id:'N1', x:0.2, y:0.45, label:'Node A', color:'#4F46E5', val:'stock=90', write:true },
      { id:'N2', x:0.5, y:0.20, label:'Node B', color:'#10B981', val:'stock=90' },
      { id:'N3', x:0.8, y:0.45, label:'Node C', color:'#F59E0B', val:'stock=100', stale:true },
    ],
    links: [['N1','N2','ok'],['N2','N3','broken'],['N1','N3','broken']],
    scenario: 'ap', choice: 'AP',
    desc: 'AP choice (Available + Partition-Tolerant): All nodes accept reads and writes. C accepts a read and returns stock=100 (stale!). When the partition heals, nodes reconcile — "eventual consistency." C will eventually learn stock=90. Used by Cassandra, DynamoDB, CouchDB.',
  },
  {
    nodes: [
      { id:'N1', x:0.2, y:0.45, label:'Node A', color:'#4F46E5', val:'stock=90' },
      { id:'N2', x:0.5, y:0.20, label:'Node B', color:'#10B981', val:'stock=90' },
      { id:'N3', x:0.8, y:0.45, label:'Node C', color:'#F59E0B', val:'stock=90' },
    ],
    links: [['N1','N2','ok'],['N2','N3','ok'],['N1','N3','ok']],
    scenario: 'heal', choice: null,
    desc: 'Partition heals. In the AP system, C reconciles: it receives the stock=90 write and updates its state. Consistency is eventually achieved. In the CP system, C was blocked during the partition and is now caught up immediately.',
  },
];

/* ── Canvas renderer ─────────────────────────────────────────────────────────*/
function drawCAP(ctx, stepIdx, w, h) {
  const step = CAP_STEPS[stepIdx];
  ctx.clearRect(0, 0, w, h);

  // ── Links ──
  const nodeMap = {};
  step.nodes.forEach(n => { nodeMap[n.id] = n; });

  step.links.forEach(([a, b, state]) => {
    const na = nodeMap[a], nb = nodeMap[b];
    const ax = na.x * w, ay = na.y * h;
    const bx = nb.x * w, by = nb.y * h;

    ctx.strokeStyle = state === 'broken' ? '#EF4444' : '#10B981';
    ctx.lineWidth = 2;
    ctx.setLineDash(state === 'broken' ? [6, 4] : []);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.setLineDash([]);

    if (state === 'broken') {
      const mx = (ax+bx)/2, my = (ay+by)/2;
      ctx.fillStyle = '#EF4444'; ctx.font = '700 14px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('✕', mx, my + 5);
    } else if (state === 'ok' && step.scenario === 'normal') {
      const mx = (ax+bx)/2, my = (ay+by)/2;
      ctx.fillStyle = '#10B98166'; ctx.font = '10px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('✓', mx, my + 4);
    }
  });

  // ── Nodes ──
  step.nodes.forEach(n => {
    const nx = n.x * w, ny = n.y * h;
    const r = 36;
    const c = n.color;

    // node circle
    ctx.fillStyle = (n.blocked ? '#1C0A0A' : n.stale ? '#1C1608' : c + '33');
    ctx.strokeStyle = c;
    ctx.lineWidth = n.write ? 3 : (n.blocked ? 2 : 1.5);
    ctx.setLineDash(n.blocked ? [4,3] : []);
    ctx.beginPath(); ctx.arc(nx, ny, r, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = c; ctx.font = '700 10px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(n.label, nx, ny - 8);
    ctx.fillStyle = '#CBD5E1'; ctx.font = '9px monospace';
    ctx.fillText(n.val, nx, ny + 6);

    if (n.write) {
      ctx.fillStyle = '#10B981'; ctx.font = '700 9px system-ui';
      ctx.fillText('← WRITE', nx + r + 6, ny + 4);
    }
    if (n.blocked) {
      ctx.fillStyle = '#EF4444'; ctx.font = '700 9px system-ui';
      ctx.fillText('UNAVAILABLE', nx, ny + 20);
    }
    if (n.stale) {
      ctx.fillStyle = '#F59E0B'; ctx.font = '700 9px system-ui';
      ctx.fillText('STALE READ', nx, ny + 20);
    }
  });

  // ── CAP choice badge ──
  if (step.choice) {
    const bx = w/2, by = h - 48;
    const choiceColor = step.choice === 'CP' ? '#4F46E5' : '#F59E0B';
    ctx.fillStyle = choiceColor + '22'; ctx.strokeStyle = choiceColor; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(bx - 70, by, 140, 36, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = choiceColor; ctx.font = '700 12px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(step.choice === 'CP' ? 'CP System' : 'AP System', bx, by + 15);
    ctx.fillStyle = '#94A3B8'; ctx.font = '9px system-ui';
    ctx.fillText(step.choice === 'CP' ? 'Consistent, less available' : 'Always available, eventually consistent', bx, by + 28);
  }

  // ── Triangle overlay ──
  ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 0.5; ctx.setLineDash([2,4]);
  // subtle triangle connecting node positions
  ctx.beginPath();
  step.nodes.forEach((n,i) => {
    const nx = n.x*w, ny = n.y*h;
    if (i===0) ctx.moveTo(nx,ny); else ctx.lineTo(nx,ny);
  });
  ctx.closePath(); ctx.stroke();
  ctx.setLineDash([]);
  ctx.textAlign = 'left';
}

/* ── CAP reference tab ────────────────────────────────────────────────────── */
function renderCAPRef(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-family:system-ui;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="margin:0 0 16px;color:#E2E8F0;font-size:15px">CAP Theorem</h3>
  <p style="margin:0 0 12px">In a distributed system experiencing a network partition, you can guarantee at most one of: <strong>Consistency</strong> or <strong>Availability</strong> (Partition Tolerance is not optional in real networks).</p>

  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px">
    ${[
      { letter:'C', name:'Consistency', color:'#4F46E5', def:'Every read receives the most recent write or an error. All nodes see the same data at the same time. "Linearizability."' },
      { letter:'A', name:'Availability', color:'#10B981', def:'Every request receives a (non-error) response — not necessarily the most recent data. The system is always "up" from the client\'s perspective.' },
      { letter:'P', name:'Partition Tolerance', color:'#F59E0B', def:'The system continues operating when messages between nodes are dropped or delayed. Real networks have partitions — P is not optional.' },
    ].map(c => `
      <div style="background:#0F172A;border:1px solid ${c.color};border-radius:6px;padding:14px">
        <div style="color:${c.color};font-size:22px;font-weight:700;margin-bottom:6px">${c.letter}</div>
        <div style="color:${c.color};font-weight:600;font-size:12px;margin-bottom:8px">${c.name}</div>
        <div style="font-size:11.5px;color:#94A3B8">${c.def}</div>
      </div>`).join('')}
  </div>

  <h3 style="margin:0 0 12px;color:#E2E8F0;font-size:15px">Real Database Choices</h3>
  <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px">
    <thead><tr style="background:#0F172A"><th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">System</th><th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">CAP</th><th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Consistency model</th></tr></thead>
    <tbody>
      ${[
        ['PostgreSQL (single node)','CA*','Strict serializable (single node, P not applicable)'],
        ['PostgreSQL (streaming replication)','CP (sync) / AP (async)','Sync: consistent reads on standby. Async: eventual consistency.'],
        ['Apache Cassandra','AP','Tunable: eventual → strong (quorum reads/writes)'],
        ['Amazon DynamoDB','AP (default)','Eventual; optional strongly consistent reads'],
        ['Google Spanner','CP','External consistency via TrueTime API'],
        ['etcd / ZooKeeper','CP','Raft/ZAB consensus — rejects writes during partition'],
      ].map(([s,c,m]) => `<tr style="border-bottom:1px solid #0F172A"><td style="padding:7px 10px;font-weight:600">${s}</td><td style="padding:7px 10px;color:#F59E0B">${c}</td><td style="padding:7px 10px;color:#94A3B8">${m}</td></tr>`).join('')}
    </tbody>
  </table>
  <p style="font-size:11px;color:#475569">* CA systems can only exist on a single machine — once you have a network between nodes, P is unavoidable.</p>
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'Explain the CAP theorem and give a concrete example of a CP vs AP database choice.',
      a: `The CAP theorem states that a distributed system can guarantee at most two of: Consistency (all nodes see the same data simultaneously), Availability (every request gets a non-error response), and Partition Tolerance (the system works despite network failures). Since network partitions are inevitable in real systems, the choice reduces to: CP or AP during a partition.<br><br>
<strong>CP example — etcd:</strong> etcd uses Raft consensus. During a network partition, the minority partition (fewer than quorum nodes) refuses writes and returns an error. This preserves consistency — the system never serves stale data — but some clients get "unavailable" responses.<br><br>
<strong>AP example — Cassandra:</strong> During a partition, all nodes accept reads and writes. A read may return stale data (last known state before the partition). After the partition heals, nodes use hinted handoff and read repair to reconcile. The system is always available but may temporarily serve inconsistent data.`,
    },
    {
      q: 'How does PostgreSQL with synchronous replication relate to CAP, and what happens during a network partition?',
      a: `PostgreSQL with <code>synchronous_commit=on</code> and a synchronous standby is a <strong>CP system</strong>. The primary waits for the standby to confirm WAL receipt before returning COMMIT to the client. During a network partition between primary and standby: the primary continues to function for writes (it still has quorum = 1 primary), but the standby falls behind and may be promoted by Patroni if it can't reach the primary — risking a split-brain scenario.<br><br>
With <code>synchronous_commit=off</code> (async replication), it becomes <strong>AP</strong>: the primary never waits for the standby, so it's always available, but there's a risk of data loss if the primary crashes before WAL is replicated. For Prime Day: use synchronous replication for the primary database to prevent data loss, and async replicas for read scaling — accepting that read replicas may serve slightly stale data.`,
    },
    {
      q: 'What is "eventual consistency" and how do distributed systems handle conflicts after a partition heals?',
      a: `Eventual consistency means that if no new updates are made to a data item, all replicas will eventually converge to the same value. It doesn't bound HOW long "eventually" takes — it could be milliseconds or seconds depending on network conditions.<br><br>
Conflict resolution strategies when a partition heals:<br><br>
1. <strong>Last-Write-Wins (LWW)</strong>: the write with the newest timestamp wins. Simple but requires synchronized clocks. DynamoDB uses this by default.<br><br>
2. <strong>Vector clocks</strong>: track causality between writes. If two writes are concurrent (neither happened-before the other), the conflict is surfaced to the application for resolution. CouchDB and Riak use this.<br><br>
3. <strong>CRDTs</strong> (Conflict-free Replicated Data Types): data structures designed so concurrent updates always merge deterministically. Counters, sets, and registers can be implemented as CRDTs — no conflicts possible by construction.<br><br>
For Prime Day inventory: LWW with timestamp is often good enough if the conflict window (partition duration) is short. For financial balances, CRDTs (like G-Counters) or application-level conflict resolution is safer.`,
    },
  ]);
}

export function mount(container) {
  const shell = createModuleShell(container, {
    tag: 'Distributed',
    title: 'CAP Theorem',
    subtitle: 'Why distributed systems must choose between Consistency and Availability during network partitions',
    tabs: [
      { id:'anim', label:'CAP Scenarios' },
      { id:'ref',  label:'CAP Reference' },
      { id:'iq',   label:'Interview Q&A' },
    ],
  });
  const { tabs, body } = shell;
  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:320px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);
      const steps = CAP_STEPS.map((s,i) => ({ label:`Step ${i+1}`, duration:2800, mutate: st=>{ st.stepIdx=i; } }));
      const engine = new SimulationEngine({
        initialState:{stepIdx:0}, steps,
        onRender:(state,cnv) => {
          const ctx=cnv.getContext('2d'),pr=window.devicePixelRatio||1;
          cnv.width=cnv.clientWidth*pr; cnv.height=cnv.clientHeight*pr; ctx.scale(pr,pr);
          drawCAP(ctx, state.stepIdx, cnv.clientWidth, cnv.clientHeight);
        },
      });
      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));
      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);
      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = CAP_STEPS[i].desc; });
      desc.textContent = CAP_STEPS[0].desc;
      return () => engine.destroy();
    },
    ref: renderCAPRef,
    iq:  renderIQ,
  });
  return null;
}
