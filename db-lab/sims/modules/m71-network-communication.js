import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

/* ── Data ────────────────────────────────────────────────────────────────────*/
const NET_STEPS = [
  {
    phase: 'latency',
    messages: [],
    desc: 'Network communication in distributed databases: messages can be delayed, reordered, or lost. Physical limits: speed of light across a datacenter ≈ 0.1ms; across a continent ≈ 40–70ms. This shapes everything — consensus round trips, replication lag, and read-your-writes guarantees.',
  },
  {
    phase: 'rpc',
    messages: [
      { from:'Client', to:'Coord', type:'REQUEST', t:0.1, payload:'BEGIN TXN' },
      { from:'Coord', to:'Shard0', type:'WRITE', t:0.3, payload:'INSERT order' },
      { from:'Shard0', to:'Coord', type:'ACK', t:0.6, payload:'ok lsn=42' },
      { from:'Coord', to:'Client', type:'RESPONSE', t:0.8, payload:'COMMIT' },
    ],
    desc: 'RPC round-trip: Client → Coordinator → Shard → Coordinator → Client. Each hop adds ~0.5ms intra-DC latency. Total for a committed write: ≈ 2ms (2 round trips). With synchronous replication to a standby: add 1 more hop → 3ms.',
  },
  {
    phase: 'batch',
    messages: [
      { from:'Client', to:'Coord', type:'REQUEST', t:0.1, payload:'BATCH 10 writes' },
      { from:'Coord', to:'Shard0', type:'BATCH_WRITE', t:0.3, payload:'writes 1–5' },
      { from:'Coord', to:'Shard1', type:'BATCH_WRITE', t:0.3, payload:'writes 6–10' },
      { from:'Shard0', to:'Coord', type:'ACK', t:0.55, payload:'ok' },
      { from:'Shard1', to:'Coord', type:'ACK', t:0.6, payload:'ok' },
      { from:'Coord', to:'Client', type:'RESPONSE', t:0.7, payload:'10 commits' },
    ],
    desc: 'BATCHING: instead of 10 individual RPCs (10 × 2ms = 20ms), send 10 writes in one batch. Coordinator fans out to shards in parallel. Total time: still ≈ 2ms for the batch. Throughput: 5× higher. Batching is the primary reason OLAP workloads are dramatically more efficient than equivalent row-by-row OLTP.',
  },
  {
    phase: 'timeout',
    messages: [
      { from:'Client', to:'Coord', type:'REQUEST', t:0.1, payload:'WRITE order' },
      { from:'Coord', to:'Shard0', type:'WRITE', t:0.3, payload:'INSERT order' },
      { from:'Shard0', to:'Coord', type:'TIMEOUT', t:0.9, payload:'⏱ no response', lost:true },
      { from:'Coord', to:'Shard0', type:'RETRY', t:1.0, payload:'retry INSERT' },
      { from:'Shard0', to:'Coord', type:'ACK', t:1.3, payload:'ok (idempotent)' },
    ],
    desc: 'MESSAGE LOSS + RETRY: Shard0\'s response is lost (network issue). Coordinator times out and retries. Critical: the WRITE may have already executed on Shard0 before the timeout. Retry without idempotency = duplicate order created. Solution: idempotency key in every write (if-not-exists semantics, or deduplicate by operation ID).',
  },
  {
    phase: 'ordering',
    messages: [
      { from:'Client', to:'Coord', type:'WRITE1', t:0.1, payload:'price = $10' },
      { from:'Coord', to:'Shard0', type:'WRITE1', t:0.2, payload:'price = $10' },
      { from:'Client', to:'Coord', type:'WRITE2', t:0.15, payload:'price = $20' },
      { from:'Coord', to:'Shard0', type:'WRITE2', t:0.25, payload:'price = $20' },
    ],
    reordered: true,
    desc: 'MESSAGE REORDERING: Two writes from the same client, WRITE1 (price=$10) then WRITE2 (price=$20), arrive at Shard0 in reverse order. Final state: price=$10 (wrong!). Solution: sequence numbers on writes; the shard rejects out-of-order messages. Lamport timestamps or vector clocks provide causal ordering.',
  },
];

/* ── Canvas ──────────────────────────────────────────────────────────────────*/
const ACTORS = ['Client', 'Coord', 'Shard0', 'Shard1'];
const ACTOR_COLORS = { Client:'#818CF8', Coord:'#4F46E5', Shard0:'#10B981', Shard1:'#F59E0B' };

function drawNet(ctx, stepIdx, w, h) {
  const step = NET_STEPS[stepIdx];
  ctx.clearRect(0, 0, w, h);

  if (step.phase === 'latency') {
    // Latency reference table
    ctx.fillStyle = '#0F172A'; ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(16, 16, w - 32, h - 32, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#64748B'; ctx.font = '700 10px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('Network Latency Reference', w / 2, 36);

    const rows = [
      ['L1 cache access', '0.0000004ms', '#10B981'],
      ['RAM access', '0.0001ms', '#10B981'],
      ['SSD sequential read (4KB)', '0.05ms', '#4F46E5'],
      ['Same-datacenter round trip', '0.1–0.5ms', '#4F46E5'],
      ['Cross-AZ (same region)', '1–5ms', '#F59E0B'],
      ['Cross-region (US-East → EU-West)', '70–120ms', '#EF4444'],
      ['Cross-region (US → Asia)', '120–200ms', '#EF4444'],
    ];
    rows.forEach(([name, lat, col], i) => {
      const ry = 54 + i * 26;
      ctx.fillStyle = i % 2 === 0 ? '#0A0F1A' : '#0D1420';
      ctx.beginPath(); ctx.roundRect(26, ry, w - 52, 22, 2); ctx.fill();
      ctx.fillStyle = '#94A3B8'; ctx.font = '9px system-ui'; ctx.textAlign = 'left';
      ctx.fillText(name, 36, ry + 14);
      ctx.fillStyle = col; ctx.font = '700 9px monospace'; ctx.textAlign = 'right';
      ctx.fillText(lat, w - 36, ry + 14);
    });
    ctx.textAlign = 'left'; return;
  }

  // Sequence diagram
  const actors = step.messages.reduce((acc, m) => {
    if (!acc.includes(m.from)) acc.push(m.from);
    if (!acc.includes(m.to))   acc.push(m.to);
    return acc;
  }, []);

  const laneW = (w - 40) / actors.length;
  const laneY = 36;

  // Actor headers
  actors.forEach((a, i) => {
    const ax = 20 + i * laneW + laneW / 2;
    const col = ACTOR_COLORS[a] || '#4F46E5';
    ctx.fillStyle = col + '33'; ctx.strokeStyle = col; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(ax - 42, laneY - 12, 84, 24, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = col; ctx.font = '700 8.5px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(a, ax, laneY + 3);

    // Lifeline
    ctx.strokeStyle = col + '33'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(ax, laneY + 12); ctx.lineTo(ax, h - 20); ctx.stroke();
    ctx.setLineDash([]);
  });

  // Messages
  const msgArea = h - laneY - 40;
  const maxT = Math.max(...step.messages.map(m => m.t)) + 0.1;
  step.messages.forEach((m, idx) => {
    const fromIdx = actors.indexOf(m.from);
    const toIdx   = actors.indexOf(m.to);
    const fx = 20 + fromIdx * laneW + laneW / 2;
    const tx = 20 + toIdx * laneW + laneW / 2;
    const my = laneY + 20 + (m.t / maxT) * msgArea;
    const col = m.lost ? '#EF4444' : (ACTOR_COLORS[m.to] || '#4F46E5');
    const isReordered = step.reordered && idx > 1;

    ctx.strokeStyle = col; ctx.lineWidth = isReordered ? 2 : 1;
    if (m.lost) ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(fx, my);
    if (isReordered) {
      // Draw reordered arrow as a curve
      ctx.bezierCurveTo(fx, my + 20, tx, my - 20, tx, my + 10);
    } else {
      ctx.lineTo(tx, my);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Arrow head
    if (!m.lost) {
      const dir = tx > fx ? 1 : -1;
      const arrowY = isReordered ? my + 10 : my;
      ctx.beginPath();
      ctx.moveTo(tx, arrowY);
      ctx.lineTo(tx - dir * 6, arrowY - 4);
      ctx.lineTo(tx - dir * 6, arrowY + 4);
      ctx.closePath(); ctx.fillStyle = col; ctx.fill();
    }

    // Label
    const midX = (fx + tx) / 2;
    const midY = isReordered ? my - 5 : my - 5;
    ctx.fillStyle = m.lost ? '#EF4444' : '#64748B'; ctx.font = `${m.lost ? '700' : '400'} 7.5px system-ui`; ctx.textAlign = 'center';
    ctx.fillText(`${m.type}: ${m.payload}`, midX, midY);
  });
  ctx.textAlign = 'left';
}

/* ── Protocols tab ───────────────────────────────────────────────────────────*/
function renderProtocolsTab(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-family:system-ui;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="margin:0 0 14px;color:#E2E8F0;font-size:15px">Communication Primitives</h3>
  ${[
    { name:'Idempotency Keys', color:'#4F46E5',
      body:'Every mutating operation includes a unique client-generated ID. If the server already processed this ID, it returns the cached result without re-executing. Solves "did my retry duplicate?" — safe to retry on any timeout. DynamoDB uses client-generated request IDs; Stripe uses idempotency-key header.' },
    { name:'Linearizability', color:'#10B981',
      body:'All operations appear to execute atomically at a single point in time, in real-time order. If read R starts after write W completes, R must see W\'s value. Achieved by requiring operations to go through a single leader (Raft leader, primary). Cost: every read must contact the leader (or go through a leader lease).' },
    { name:'Causal Consistency', color:'#F59E0B',
      body:'If operation A happened before operation B (A causally precedes B), all nodes see A before B. Weaker than linearizability but achievable without a single leader. Implemented via vector clocks or version vectors — each write carries a vector of {node: version} pairs. A node delays delivery until all causal predecessors are received.' },
    { name:'Back-pressure', color:'#A78BFA',
      body:'When a downstream service (DB, shard) is overloaded, it signals the upstream to slow down rather than accepting unlimited requests. Prevents cascading failure where request queue grows unboundedly, consuming memory. TCP does this at the transport layer; application-level: return HTTP 503 with Retry-After header, or drop items from the write queue with explicit error.' },
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
      q: 'Why can\'t you simply retry a failed write, and how do idempotency keys solve the problem?',
      a: `When a write RPC times out, there are three possible states: (1) the request never reached the server; (2) the server received it, executed it, but the response was lost; (3) the server received it but hasn't executed it yet. In cases 2 and 3, a naive retry sends the write again — in case 2, this creates a duplicate (two orders created, payment charged twice). The client has no way to know which case it's in without additional information.<br><br>
Idempotency keys fix this: the client attaches a unique UUID to every write. The server stores completed operation IDs in a table (with a TTL). On receiving a write, the server checks: "Have I already processed this ID?" If yes, return the cached response without re-executing. If no, execute and store the result. Now retries are always safe — the second execution is a no-op that returns the original result. The idempotency key table needs to be stored durably (same DB as the operation), and the check + execution must be atomic.`,
    },
    {
      q: 'What is the difference between at-most-once, at-least-once, and exactly-once message delivery?',
      a: `<strong>At-most-once</strong>: fire and forget. Send the message once; if it's lost, it's lost. No retries. Achieves this trivially — just don't retry. Use for: non-critical events (analytics, metrics) where loss is acceptable.<br><br>
<strong>At-least-once</strong>: retry until the receiver acknowledges. The receiver may process the message multiple times if ACKs are lost or if the sender retries before the ACK arrives. Use for: writes where the receiver is idempotent (deduplication by ID), or events where duplicates are tolerable.<br><br>
<strong>Exactly-once</strong>: every message processed precisely once, despite retries and failures. Requires idempotency at the receiver AND deduplication. Kafka's idempotent producer + transactional API achieves exactly-once within a single producer → Kafka → consumer pipeline. Across different systems (Kafka → PostgreSQL), exactly-once requires coordinated atomic writes (outbox pattern + CDC) — the message is stored in the same DB transaction as the state change, then read and forwarded.`,
    },
    {
      q: 'How do vector clocks track causality, and what happens when two writes are concurrent?',
      a: `A vector clock is a map of {node_id: logical_counter}, e.g., {A:3, B:1, C:2}. Each node increments its own counter before sending a message, and takes the element-wise max of its own clock and the sender's clock on receiving a message.<br><br>
Causal ordering: event X causally precedes event Y if every element of X's vector clock ≤ Y's vector clock (with at least one strictly less). If neither X ≤ Y nor Y ≤ X holds, the events are <strong>concurrent</strong> — neither caused the other.<br><br>
Concurrent writes to the same key: both writes have incomparable vector clocks. This is a genuine conflict with no definitive ordering. Resolution strategies: (1) <strong>Last Write Wins (LWW)</strong> — use a physical timestamp to pick one, discarding the other (risk: clock skew causes a "later" write to lose). (2) <strong>Multi-value register</strong> — store both values and surface the conflict to the client (Dynamo's "shopping cart" approach — merge both carts). (3) <strong>CRDT</strong> — data types (counter, set, register) designed so concurrent updates always merge deterministically without conflict.`,
    },
  ]);
}

export function mount(container) {
  const shell = createModuleShell(container, {
    tag: 'Distributed',
    title: 'Network Communication',
    subtitle: 'Latency numbers, RPC patterns, message loss and retry, reordering, and idempotency in distributed systems',
    tabs: [
      { id:'anim',      label:'Message Flows' },
      { id:'protocols', label:'Communication Primitives' },
      { id:'iq',        label:'Interview Q&A' },
    ],
  });
  const { tabs, body } = shell;
  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:340px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);
      const steps = NET_STEPS.map((s, i) => ({ label: `Step ${i + 1}`, duration: 2800, mutate: st => { st.stepIdx = i; } }));
      const engine = new SimulationEngine({
        initialState: { stepIdx: 0 }, steps,
        onRender: (state, cnv) => {
          const ctx = cnv.getContext('2d'), pr = window.devicePixelRatio || 1;
          cnv.width = cnv.clientWidth * pr; cnv.height = cnv.clientHeight * pr; ctx.scale(pr, pr);
          drawNet(ctx, state.stepIdx, cnv.clientWidth, cnv.clientHeight);
        },
      });
      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));
      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);
      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = NET_STEPS[i].desc; });
      desc.textContent = NET_STEPS[0].desc;
      return () => engine.destroy();
    },
    protocols: renderProtocolsTab,
    iq:        renderIQ,
  });
  return null;
}
