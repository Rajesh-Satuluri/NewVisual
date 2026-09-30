import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

/* ── Data ────────────────────────────────────────────────────────────────────*/
// 5-node cluster. Demonstrate W+R > N guarantees overlap.
const ALL_NODES = ['N1','N2','N3','N4','N5'];
const N = 5;

const QRM_STEPS = [
  {
    N:5, W:3, R:2,
    writeNodes: [], readNodes: [],
    overlap: false, consistent: null,
    desc: 'N=5 replicas. W=3 (write quorum), R=2 (read quorum). Check: W+R=5 > N=5. Quorum condition satisfied — every read set intersects every write set by at least 1 node. Any R nodes must include at least one W node that has the latest value.',
  },
  {
    N:5, W:3, R:2,
    writeNodes: ['N1','N2','N3'], readNodes: [],
    overlap: false, consistent: null,
    desc: 'WRITE: client sends value v=42 to all 5 nodes. W=3 nodes must ACK before success. Nodes N1, N2, N3 reply first — quorum reached. N4 and N5 may receive v=42 later (asynchronously) or may be temporarily partitioned.',
  },
  {
    N:5, W:3, R:2,
    writeNodes: ['N1','N2','N3'], readNodes: ['N2','N4'],
    overlap: true, consistent: true,
    desc: 'READ with R=2: client reads from N2 and N4. N2 has v=42 (part of write quorum), N4 has old value. Since W+R > N, at least 1 of the R nodes is guaranteed to have v=42. Client uses the highest version/timestamp — returns v=42. Consistent read.',
  },
  {
    N:5, W:1, R:1,
    writeNodes: ['N1'], readNodes: ['N3'],
    overlap: false, consistent: false,
    desc: 'WEAK QUORUM (W=1, R=1): W+R=2 ≤ N=5. Write only persists on N1; read goes to N3. No guaranteed overlap — read returns stale value. This is Cassandra\'s CONSISTENCY ONE: fast but not consistent after failures.',
  },
  {
    N:5, W:5, R:1,
    writeNodes: ['N1','N2','N3','N4','N5'], readNodes: ['N4'],
    overlap: true, consistent: true,
    desc: 'STRONG WRITE (W=5=N, R=1): all 5 replicas must ACK before write succeeds. Any single node can serve reads. Highest consistency — but write latency = slowest of all 5 nodes, and a write fails if any node is unavailable. Rarely used in practice.',
  },
  {
    N:5, W:3, R:3,
    writeNodes: ['N1','N2','N3'], readNodes: ['N3','N4','N5'],
    overlap: true, consistent: true,
    desc: 'BALANCED (W=3, R=3): W+R=6 > N=5. Write and read quorums each span more than half the cluster — guaranteed 1-node overlap (N3). This is Cassandra QUORUM/QUORUM — balanced latency and consistency. Commonly used in production.',
  },
];

/* ── Canvas ──────────────────────────────────────────────────────────────────*/
function drawQuorum(ctx, stepIdx, w, h) {
  const step = QRM_STEPS[stepIdx];
  ctx.clearRect(0, 0, w, h);

  const nodeR = 26;
  const cx = w / 2, cy = h / 2 - 10;
  const ringR = Math.min(w, h) * 0.3;

  // Nodes arranged in a circle
  ALL_NODES.forEach((id, i) => {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    const nx = cx + Math.cos(a) * ringR;
    const ny = cy + Math.sin(a) * ringR;

    const isWrite = step.writeNodes.includes(id);
    const isRead  = step.readNodes.includes(id);
    const isOverlapNode = isWrite && isRead;

    let col = '#334155';
    if (isOverlapNode) col = '#A78BFA';
    else if (isWrite)  col = '#10B981';
    else if (isRead)   col = '#06B6D4';

    ctx.fillStyle = col + '33'; ctx.strokeStyle = col;
    ctx.lineWidth = (isWrite || isRead) ? 2 : 1;
    ctx.beginPath(); ctx.arc(nx, ny, nodeR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    ctx.fillStyle = col; ctx.font = '700 9px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(id, nx, ny - 4);

    if (isWrite && isRead) {
      ctx.fillStyle = '#A78BFA'; ctx.font = '700 8px system-ui';
      ctx.fillText('OVERLAP', nx, ny + 8);
    } else if (isWrite) {
      ctx.fillStyle = '#10B981'; ctx.font = '8px system-ui';
      ctx.fillText('WRITE ✓', nx, ny + 8);
    } else if (isRead) {
      ctx.fillStyle = '#06B6D4'; ctx.font = '8px system-ui';
      ctx.fillText('READ', nx, ny + 8);
    } else {
      ctx.fillStyle = '#475569'; ctx.font = '8px system-ui';
      ctx.fillText('—', nx, ny + 8);
    }
  });

  // Stats box
  const bx = 10, by = 10, bw = 190, bh = 78;
  ctx.fillStyle = '#0F172A'; ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 6); ctx.fill(); ctx.stroke();

  const quorumOk = step.W + step.R > step.N;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748B'; ctx.font = '700 9px system-ui';
  ctx.fillText(`N = ${step.N}  (replicas)`, bx + 10, by + 18);
  ctx.fillStyle = '#10B981'; ctx.fillText(`W = ${step.W}  (write quorum)`, bx + 10, by + 32);
  ctx.fillStyle = '#06B6D4'; ctx.fillText(`R = ${step.R}  (read quorum)`, bx + 10, by + 46);

  const condColor = quorumOk ? '#10B981' : '#EF4444';
  ctx.fillStyle = condColor; ctx.font = '700 9px system-ui';
  ctx.fillText(`W + R = ${step.W + step.R} ${quorumOk ? '>' : '≤'} N = ${step.N}  ${quorumOk ? '✓' : '✕'}`, bx + 10, by + 62);

  // Result badge
  if (step.consistent !== null) {
    const rCol = step.consistent ? '#10B981' : '#EF4444';
    ctx.fillStyle = '#0F172A'; ctx.strokeStyle = rCol; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(w - 140, 10, 128, 26, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = rCol; ctx.font = '700 9px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(step.consistent ? 'READ CONSISTENT ✓' : 'STALE READ ✕', w - 76, 26);
  }
  ctx.textAlign = 'left';
}

/* ── Reference tab ───────────────────────────────────────────────────────────*/
function renderReferenceTab(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-family:system-ui;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="margin:0 0 14px;color:#E2E8F0;font-size:15px">Quorum Configurations</h3>
  <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:20px">
    <thead><tr style="background:#0F172A">
      <th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Config (N=5)</th>
      <th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Write Cost</th>
      <th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Read Cost</th>
      <th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Consistent?</th>
      <th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Use case</th>
    </tr></thead>
    <tbody>
      ${[
        ['W=1, R=1','Very fast','Very fast','No (W+R=2≤5)','Fastest writes, accept staleness (analytics events)'],
        ['W=3, R=1','Moderate','Fast','No (W+R=4≤5)','Cassandra LOCAL_QUORUM writes, ONE reads'],
        ['W=3, R=3','Moderate','Moderate','Yes (W+R=6>5)','Balanced: Cassandra QUORUM/QUORUM'],
        ['W=5, R=1','Slow (all)','Fast','Yes (W+R=6>5)','Strongest: write to all, read from 1 (rarely used)'],
        ['W=3, R=2','Moderate','Fast','Yes (W+R=5>5)','Good balance for read-heavy workloads'],
      ].map(([c,w,r,ok,u]) => `<tr style="border-bottom:1px solid #0F172A">
        <td style="padding:7px 10px;color:#F59E0B;font-family:monospace;font-size:11px">${c}</td>
        <td style="padding:7px 10px">${w}</td>
        <td style="padding:7px 10px">${r}</td>
        <td style="padding:7px 10px;color:${ok.startsWith('Yes') ? '#10B981' : '#EF4444'}">${ok}</td>
        <td style="padding:7px 10px;font-size:11px">${u}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <h3 style="margin:0 0 12px;color:#E2E8F0;font-size:15px">Read Repair</h3>
  <p style="font-size:12px;margin:0 0 12px">When a read returns different values from multiple replicas (due to a missed write), the coordinator can repair divergence in two ways: <strong>Read repair</strong> (send the latest value to stale replicas immediately, in the read path) or <strong>Anti-entropy</strong> (background process that periodically compares Merkle trees and syncs missing data). Cassandra does both.</p>

  <div style="background:#071C10;border:1px solid #065F46;border-radius:6px;padding:14px;font-size:12px">
    <strong style="color:#10B981">Cassandra Prime Day config:</strong> Use <code>LOCAL_QUORUM</code> for both reads and writes within a region — this satisfies W+R>N within the local DC without paying cross-region round-trip latency. For cross-region replicas, use <code>EACH_QUORUM</code> only for the most critical writes (order creation), not for reads.
  </div>
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'Prove that W + R > N guarantees a consistent read from any W-node write quorum.',
      a: `Let the last write succeed on set W_nodes (|W_nodes| = W). A subsequent read contacts set R_nodes (|R_nodes| = R). We want to show W_nodes ∩ R_nodes ≠ ∅.<br><br>
Proof by contradiction: suppose the sets are disjoint. Then |W_nodes ∪ R_nodes| = W + R. But since both sets are subsets of the N-node cluster, |W_nodes ∪ R_nodes| ≤ N. So W + R ≤ N. This contradicts our assumption W + R > N. Therefore the sets cannot be disjoint — there exists at least one node in both W_nodes and R_nodes. That node has the latest write value. The client reads from all R nodes, takes the maximum version/timestamp, and returns the latest value.`,
    },
    {
      q: 'What is sloppy quorum and what problem does it solve?',
      a: `In a standard quorum, if W nodes must ACK a write and one of those nodes is unavailable, the write fails — availability is sacrificed for consistency. Sloppy quorum (used by DynamoDB and Cassandra) trades strict consistency for higher availability during network partitions or node failures.<br><br>
With a sloppy quorum: if the designated W nodes for a key are unavailable, another reachable node temporarily handles the write on behalf of the absent node. This "hinted handoff" is stored with metadata indicating which node it belongs to. When the original node recovers, the hinted data is forwarded and the temporary handoff is cleaned up. The benefit: writes always succeed as long as ANY W nodes are reachable, not necessarily the "correct" W nodes. The tradeoff: a read may miss the hinted write if it doesn't contact the temporary node — read consistency is weakened during the recovery window. DynamoDB uses sloppy quorum by default; disabling it requires explicit "consistent read" API parameters.`,
    },
    {
      q: 'How does Cassandra handle concurrent writes to the same key from different clients?',
      a: `Cassandra uses <strong>Last Write Wins (LWW)</strong> based on client-provided timestamps (or coordinator-assigned timestamps). Each write carries a microsecond-precision timestamp. When two writes conflict, the one with the higher timestamp wins — the lower-timestamp value is discarded during read repair and compaction. This is simple but has a known weakness: if client clocks are skewed, a "later" write with a lower clock value loses to an "earlier" write with a higher clock value — violating causality.<br><br>
Mitigations: (1) use NTP/PTP to minimize clock skew (Cassandra recommends < 1ms skew); (2) use Lightweight Transactions (LWT, implemented via Paxos) for true linearizable writes on critical operations like "insert if not exists" (e.g., unique username registration); (3) use CRDTs (counters, sets) for commutative operations where merge is unambiguous regardless of order.`,
    },
  ]);
}

export function mount(container) {
  const shell = createModuleShell(container, {
    tag: 'Distributed',
    title: 'Read/Write Quorums',
    subtitle: 'W+R>N guarantees read-your-writes — how replication factor, write quorum, and read quorum interact',
    tabs: [
      { id:'anim', label:'Quorum Simulator' },
      { id:'ref',  label:'Configurations' },
      { id:'iq',   label:'Interview Q&A' },
    ],
  });
  const { tabs, body } = shell;
  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:340px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);
      const steps = QRM_STEPS.map((s, i) => ({ label: `Step ${i + 1}`, duration: 2800, mutate: st => { st.stepIdx = i; } }));
      const engine = new SimulationEngine({
        initialState: { stepIdx: 0 }, steps,
        onRender: (state, cnv) => {
          const ctx = cnv.getContext('2d'), pr = window.devicePixelRatio || 1;
          cnv.width = cnv.clientWidth * pr; cnv.height = cnv.clientHeight * pr; ctx.scale(pr, pr);
          drawQuorum(ctx, state.stepIdx, cnv.clientWidth, cnv.clientHeight);
        },
      });
      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));
      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);
      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = QRM_STEPS[i].desc; });
      desc.textContent = QRM_STEPS[0].desc;
      return () => engine.destroy();
    },
    ref: renderReferenceTab,
    iq:  renderIQ,
  });
  return null;
}
