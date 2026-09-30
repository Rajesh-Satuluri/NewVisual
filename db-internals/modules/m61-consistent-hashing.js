import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

/* ── Data ────────────────────────────────────────────────────────────────────*/
// Hash ring with 3 nodes, then add a 4th, then remove one.
// Virtual nodes shown as smaller tick marks.

const RING_NODES = [
  { id:'N1', angle: 30,  color:'#4F46E5', label:'Node 1' },
  { id:'N2', angle:150,  color:'#10B981', label:'Node 2' },
  { id:'N3', angle:270,  color:'#F59E0B', label:'Node 3' },
];

const KEYS = [
  { id:'K1', angle: 60,  label:'order:7788' },
  { id:'K2', angle:120,  label:'user:42' },
  { id:'K3', angle:200,  label:'cart:99' },
  { id:'K4', angle:310,  label:'session:5' },
];

const CH_STEPS = [
  {
    nodes: RING_NODES,
    keys: KEYS,
    addNode: null, removeNode: null,
    desc: 'Consistent hashing maps both nodes and keys onto a circular ring (0–360°). Each key is owned by the first node encountered going clockwise from the key\'s position. Node 1 owns K1; Node 2 owns K2; Node 3 owns K3 and K4.',
  },
  {
    nodes: RING_NODES,
    keys: KEYS,
    addNode: null, removeNode: null, highlight: 'K1',
    desc: 'Key lookup: hash("order:7788") → position 60°. Scan clockwise — first node encountered is Node 1 (at 90°). Node 1 handles this key. With 3 nodes and 1000 keys, each node owns ~333 keys on average.',
  },
  {
    nodes: [...RING_NODES, { id:'N4', angle:90, color:'#EF4444', label:'Node 4', isNew:true }],
    keys: KEYS,
    addNode: 'N4',
    desc: 'ADD NODE 4 at position 90°. Now K1 (at 60°) moves: scanning clockwise from 60°, the first node is now N4 at 90° instead of N1 at 120° (N1 shifted). Only ~1/4 of keys need to move — specifically those that N4\'s position "intercepts" from N1. Other nodes are unaffected.',
  },
  {
    nodes: [...RING_NODES, { id:'N4', angle:90, color:'#EF4444', label:'Node 4' }],
    keys: KEYS,
    removeNode: 'N3',
    desc: 'REMOVE NODE 3 (failure or decommission). Keys that were owned by N3 (K3 at 200°, K4 at 310°) now scan clockwise to the next node — Node 1 at 30° wraps around for K4, and Node 2 takes K3. Only the failed node\'s keys need remapping — 1/(N-1) of total keys, not a full reshuffle.',
  },
  {
    nodes: RING_NODES,
    keys: KEYS,
    vnodes: true,
    desc: 'VIRTUAL NODES: each physical node has V positions on the ring (e.g., V=150 per node). This spreads load more evenly and reduces the standard deviation of key distribution. When a node is added/removed, its virtual positions are redistributed individually across the ring.',
  },
];

/* ── Canvas ──────────────────────────────────────────────────────────────────*/
function drawCH(ctx, stepIdx, w, h) {
  const step = CH_STEPS[stepIdx];
  const cx = w / 2, cy = h / 2 - 10;
  const R = Math.min(w, h) * 0.34;
  ctx.clearRect(0, 0, w, h);

  // Ring circle
  ctx.strokeStyle = '#1E3A5F'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();

  // Virtual node ticks
  if (step.vnodes) {
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2 - Math.PI / 2;
      const col = ['#4F46E5', '#10B981', '#F59E0B'][i % 3];
      const ix = cx + Math.cos(a) * (R - 4), iy = cy + Math.sin(a) * (R - 4);
      const ox = cx + Math.cos(a) * (R + 4), oy = cy + Math.sin(a) * (R + 4);
      ctx.strokeStyle = col + '66'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(ox, oy); ctx.stroke();
    }
  }

  const activeNodes = step.removeNode
    ? step.nodes.filter(n => n.id !== step.removeNode)
    : step.nodes;

  // Key dots
  step.keys.forEach(k => {
    const a = (k.angle / 360) * Math.PI * 2 - Math.PI / 2;
    const kx = cx + Math.cos(a) * R, ky = cy + Math.sin(a) * R;
    const isHighlight = step.highlight === k.id;

    // Arrow to owning node
    let ownerAngle = Infinity, owner = null;
    activeNodes.forEach(n => {
      let diff = n.angle - k.angle;
      if (diff < 0) diff += 360;
      if (diff < ownerAngle) { ownerAngle = diff; owner = n; }
    });
    if (owner) {
      const na = (owner.angle / 360) * Math.PI * 2 - Math.PI / 2;
      const nx = cx + Math.cos(na) * R, ny = cy + Math.sin(na) * R;
      ctx.strokeStyle = isHighlight ? '#FFFFFF' : owner.color + '44';
      ctx.lineWidth = isHighlight ? 1.5 : 0.8;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(nx, ny); ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = isHighlight ? '#FFFFFF' : '#94A3B8';
    ctx.beginPath(); ctx.arc(kx, ky, isHighlight ? 5 : 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = isHighlight ? '#FFFFFF' : '#64748B';
    ctx.font = `${isHighlight ? '700' : '400'} 7.5px system-ui`; ctx.textAlign = 'center';
    const lx = cx + Math.cos(a) * (R + 18), ly = cy + Math.sin(a) * (R + 18);
    ctx.fillText(k.label, lx, ly);
  });

  // Node circles
  step.nodes.forEach(n => {
    const removed = step.removeNode === n.id;
    const a = (n.angle / 360) * Math.PI * 2 - Math.PI / 2;
    const nx = cx + Math.cos(a) * R, ny = cy + Math.sin(a) * R;
    ctx.globalAlpha = removed ? 0.25 : 1;
    ctx.fillStyle = n.color + '33'; ctx.strokeStyle = n.color; ctx.lineWidth = removed ? 1 : 2;
    ctx.beginPath(); ctx.arc(nx, ny, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (removed) {
      ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(nx - 8, ny - 8); ctx.lineTo(nx + 8, ny + 8);
      ctx.moveTo(nx + 8, ny - 8); ctx.lineTo(nx - 8, ny + 8); ctx.stroke();
    }
    ctx.fillStyle = n.isNew ? n.color : (removed ? '#EF4444' : n.color);
    ctx.font = `700 8px system-ui`; ctx.textAlign = 'center';
    ctx.fillText(n.id, nx, ny + 3);
    ctx.globalAlpha = 1;

    // Node label outside ring
    const lx = cx + Math.cos(a) * (R + 32), ly = cy + Math.sin(a) * (R + 32);
    ctx.fillStyle = removed ? '#EF4444' : (n.isNew ? n.color : '#94A3B8');
    ctx.font = `${n.isNew || removed ? '700' : '400'} 8px system-ui`;
    ctx.fillText(removed ? '✕ REMOVED' : (n.isNew ? '+ NEW' : n.label), lx, ly + 3);
  });

  // Stats box
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0F172A'; ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(10, h - 40, 160, 30, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#64748B'; ctx.font = '8px system-ui';
  ctx.fillText(`Nodes: ${activeNodes.length}  Keys: ${step.keys.length}`, 18, h - 26);
  ctx.fillText(`Avg keys/node: ${(step.keys.length / activeNodes.length).toFixed(1)}`, 18, h - 14);
}

/* ── Reference tab ───────────────────────────────────────────────────────────*/
function renderReferenceTab(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-family:system-ui;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="margin:0 0 14px;color:#E2E8F0;font-size:15px">Why Consistent Hashing?</h3>
  <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:20px">
    <thead><tr style="background:#0F172A"><th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Property</th><th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Naive Modulo Hash</th><th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Consistent Hash</th></tr></thead>
    <tbody>
      ${[
        ['Keys moved on node add','All (100%)', '~K/N (1/N of total)'],
        ['Keys moved on node remove','All (100%)', '~K/N (1/N of total)'],
        ['Load balancing','Uniform if hash is good','Uneven without virtual nodes'],
        ['Virtual nodes fix','N/A','Each node gets V positions → near-uniform'],
        ['Used in','Simple caches','Cassandra, DynamoDB, Redis Cluster'],
      ].map(([p,n,c]) => `<tr style="border-bottom:1px solid #0F172A">
        <td style="padding:7px 10px;color:#94A3B8">${p}</td>
        <td style="padding:7px 10px;color:#EF4444">${n}</td>
        <td style="padding:7px 10px;color:#10B981">${c}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <h3 style="margin:0 0 12px;color:#E2E8F0;font-size:15px">Virtual Nodes (vnodes)</h3>
  <p style="font-size:12px;margin:0 0 12px">Without vnodes, adding a node only relieves one arc of the ring, creating hotspots. With V=150 vnodes per node, each physical node has 150 random positions. New nodes absorb proportional load from every existing node — load rebalances gradually and evenly.</p>
  <pre style="background:#0F172A;border:1px solid #1E293B;border-radius:6px;padding:12px;font-size:10.5px;color:#94A3B8;overflow-x:auto">
# Cassandra vnode setup (cassandra.yaml)
num_tokens: 256        # vnodes per node (default 256 in C* 3+)
partitioner: Murmur3Partitioner  # 64-bit hash → token ring 0..2^63

# DynamoDB uses 400 virtual partitions per physical partition internally
# Redis Cluster: fixed 16384 hash slots, nodes own ranges of slots</pre>

  <div style="background:#071C10;border:1px solid #065F46;border-radius:6px;padding:14px;font-size:12px;margin-top:16px">
    <strong style="color:#10B981">Prime Day note:</strong> Consistent hashing ensures that when Prime Day's traffic spike forces adding 10 new cache nodes, only 1/(N+10) of cached keys need to be re-fetched from the database — not all of them, which would cause a thundering herd against the DB.
  </div>
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'Why does adding a node to a consistent hash ring move only 1/N of keys, whereas modulo hashing moves all keys?',
      a: `With modulo hashing (key % N), adding a node changes N to N+1, so every key's hash(key) % (N+1) can be different — almost every key maps to a different node. In the worst case, (N)/(N+1) of all keys move.<br><br>
Consistent hashing avoids this by assigning each node a position on the ring. A key is owned by the first node clockwise from its position. When a new node is inserted at position P, it only "intercepts" keys in the arc between the new node and its predecessor — the keys that were previously assigned to the next clockwise node but whose hash falls between the predecessor and P. That's exactly 1/N of keys on average, with the rest completely unaffected. This is why consistent hashing is the foundation of distributed caches and databases that need to scale horizontally without cache-busting all existing data.`,
    },
    {
      q: 'What problem do virtual nodes solve, and how many vnodes per physical node is typical?',
      a: `Without virtual nodes, the ring positions of physical nodes are fixed (often assigned sequentially or by hash of the node ID). Three problems: (1) <strong>Uneven arc sizes</strong> — with 3 nodes placed randomly, one arc might hold 50% of the ring and another only 10%, causing 5× load imbalance. (2) <strong>Hot-spot on add</strong> — adding one node only relieves one arc, while other nodes remain at their current load. (3) <strong>Node capacity heterogeneity</strong> — a node with 2× RAM can't own 2× the keys without vnodes.<br><br>
Virtual nodes give each physical node V positions distributed across the ring. With V=150, each node's positions interleave with all others, so each node owns many small arcs that average out to ~1/N of total keys. Cassandra uses 256 vnodes per node by default; Redis Cluster uses 16,384 fixed "hash slots" (similar concept). With heterogeneous nodes, stronger nodes get proportionally more vnodes to own more keys.`,
    },
    {
      q: 'How does Cassandra use consistent hashing, and what is a coordinator in that context?',
      a: `Cassandra maps its partition key (e.g., <code>order_id</code>) through Murmur3 to a 64-bit token. The ring is the token space 0 to 2^63 - 1. Each node owns ranges of tokens. With a replication factor of R, a key is replicated to the R nodes whose token ranges cover the key's token (first R clockwise nodes).<br><br>
The <strong>coordinator</strong> is the Cassandra node that a client connects to for a given request — any node can serve as coordinator. The coordinator routes the read or write to the replica nodes responsible for that token. For writes with <code>LOCAL_QUORUM</code>, the coordinator sends the write to all replicas and waits for quorum ACKs before responding to the client. The coordinator does not need to own the token — it acts as a proxy, using the token ring map (gossiped to all nodes) to know which nodes own the key. This is why Cassandra clients can connect to any node and still get consistent routing.`,
    },
  ]);
}

export function mount(container) {
  const shell = createModuleShell(container, {
    tag: 'Distributed',
    title: 'Consistent Hashing',
    subtitle: 'Ring-based key routing — why adding nodes moves only K/N keys instead of all keys, and how virtual nodes fix load imbalance',
    tabs: [
      { id:'anim', label:'Hash Ring' },
      { id:'ref',  label:'Reference' },
      { id:'iq',   label:'Interview Q&A' },
    ],
  });
  const { tabs, body } = shell;
  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:340px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);
      const steps = CH_STEPS.map((s, i) => ({ label: `Step ${i + 1}`, duration: 2800, mutate: st => { st.stepIdx = i; } }));
      const engine = new SimulationEngine({
        initialState: { stepIdx: 0 }, steps,
        onRender: (state, cnv) => {
          const ctx = cnv.getContext('2d'), pr = window.devicePixelRatio || 1;
          cnv.width = cnv.clientWidth * pr; cnv.height = cnv.clientHeight * pr; ctx.scale(pr, pr);
          drawCH(ctx, state.stepIdx, cnv.clientWidth, cnv.clientHeight);
        },
      });
      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));
      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);
      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = CH_STEPS[i].desc; });
      desc.textContent = CH_STEPS[0].desc;
      return () => engine.destroy();
    },
    ref: renderReferenceTab,
    iq:  renderIQ,
  });
  return null;
}
