import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

/* ── SWIM protocol data ──────────────────────────────────────────────────────*/
// 6-node cluster. Show SWIM failure detection: probe → ping-req → suspect → fail
const NODES_BASE = [
  { id:'N1', x:0.5,  y:0.15, state:'ok' },
  { id:'N2', x:0.82, y:0.35, state:'ok' },
  { id:'N3', x:0.72, y:0.72, state:'ok' },
  { id:'N4', x:0.28, y:0.72, state:'ok' },
  { id:'N5', x:0.18, y:0.35, state:'ok' },
  { id:'N6', x:0.5,  y:0.5,  state:'ok' },
];

const SWIM_STEPS = [
  {
    nodes: NODES_BASE.map(n => ({ ...n })),
    probe: null, pingReq: null, msg: null,
    desc: 'SWIM (Scalable Weakly-consistent Infection-style Membership) protocol. Each node periodically probes a random peer. If no ACK within T_ping (20ms), it asks k other nodes to ping the suspect — indirect probing reduces false positives from direct network issues.',
  },
  {
    nodes: NODES_BASE.map(n => ({ ...n })),
    probe: { from:'N1', to:'N6', type:'PING' },
    pingReq: null, msg: 'N1 → N6: PING',
    desc: 'N1 picks N6 at random and sends a direct PING. Expected: N6 responds with ACK within T_ping (20ms). N6 is healthy — ACK arrives. Probe succeeds. No suspicion raised. Each node probes one peer per protocol period (200ms by default).',
  },
  {
    nodes: NODES_BASE.map((n, i) => ({ ...n, state: i === 5 ? 'slow' : 'ok' })),
    probe: { from:'N1', to:'N6', type:'PING', noAck:true },
    pingReq: null, msg: 'N1 → N6: PING (no ACK — timeout)',
    desc: 'N6 becomes slow (GC pause, disk I/O saturation). N1\'s PING times out — no ACK within T_ping. N1 does NOT immediately declare N6 dead. Instead, it triggers the indirect probe phase to distinguish "N6 crashed" from "N1–N6 link degraded".',
  },
  {
    nodes: NODES_BASE.map((n, i) => ({ ...n, state: i === 5 ? 'slow' : 'ok' })),
    probe: { from:'N1', to:'N6', type:'PING', noAck:true },
    pingReq: { from:'N1', relays:['N2','N3'], to:'N6' },
    msg: 'N1 asks N2, N3 to PING-REQ N6',
    desc: 'PING-REQ (indirect probe): N1 asks k=2 other members (N2, N3) to each send a PING to N6 on N1\'s behalf. If any of them gets an ACK, they forward it to N1. This tests whether N6 is reachable through a different network path.',
  },
  {
    nodes: NODES_BASE.map((n, i) => ({ ...n, state: i === 5 ? 'suspect' : 'ok' })),
    probe: null, pingReq: null,
    msg: 'Neither N2 nor N3 got ACK — N6 SUSPECTED',
    desc: 'No indirect ACK received within T_ping_req. N1 marks N6 as SUSPECT and gossips "N6 is suspected, incarnation=7" to other members. N6 remains in the membership list as suspect. If N6 is alive, it will hear the suspicion and refute it by broadcasting its own higher incarnation number.',
  },
  {
    nodes: NODES_BASE.map((n, i) => ({ ...n, state: i === 5 ? 'failed' : 'ok' })),
    probe: null, pingReq: null,
    msg: 'Suspicion timeout expired — N6 declared FAILED',
    desc: 'After T_suspect (3 seconds) with no refutation from N6, all members declare N6 FAILED and remove it from the membership list. Its key ranges are redistributed. The suspicion window is the false-positive safety net — a briefly-paused JVM node can refute before being evicted.',
  },
];

const STATE_COLOR = { ok:'#4F46E5', slow:'#F59E0B', suspect:'#A78BFA', failed:'#EF4444' };

/* ── Canvas ──────────────────────────────────────────────────────────────────*/
function drawFD(ctx, stepIdx, w, h) {
  const step = SWIM_STEPS[stepIdx];
  ctx.clearRect(0, 0, w, h);
  const R = 20;

  step.nodes.forEach(n => {
    const col = STATE_COLOR[n.state];
    const nx = n.x * w, ny = n.y * h;
    ctx.fillStyle = col + '33'; ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(nx, ny, R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = col; ctx.font = '700 9px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(n.id, nx, ny - 4);
    ctx.fillStyle = '#64748B'; ctx.font = '7.5px system-ui';
    ctx.fillText(n.state.toUpperCase(), nx, ny + 8);
    if (n.state === 'failed') {
      ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(nx - 10, ny - 10); ctx.lineTo(nx + 10, ny + 10);
      ctx.moveTo(nx + 10, ny - 10); ctx.lineTo(nx - 10, ny + 10); ctx.stroke();
    }
  });

  // Probe arrow
  if (step.probe) {
    const fn = step.nodes.find(n => n.id === step.probe.from);
    const tn = step.nodes.find(n => n.id === step.probe.to);
    const col = step.probe.noAck ? '#EF4444' : '#10B981';
    ctx.strokeStyle = col; ctx.lineWidth = 1.5;
    if (step.probe.noAck) ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(fn.x * w, fn.y * h); ctx.lineTo(tn.x * w, tn.y * h); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = col; ctx.font = '700 8px system-ui'; ctx.textAlign = 'center';
    const mx = (fn.x + tn.x) / 2 * w, my = (fn.y + tn.y) / 2 * h;
    ctx.fillText(step.probe.type + (step.probe.noAck ? ' ✕' : ' ✓'), mx, my - 6);
  }

  // Ping-req arrows
  if (step.pingReq) {
    const src = step.nodes.find(n => n.id === step.pingReq.from);
    const tgt = step.nodes.find(n => n.id === step.pingReq.to);
    step.pingReq.relays.forEach(rid => {
      const relay = step.nodes.find(n => n.id === rid);
      ctx.strokeStyle = '#A78BFA'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(src.x * w, src.y * h); ctx.lineTo(relay.x * w, relay.y * h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(relay.x * w, relay.y * h); ctx.lineTo(tgt.x * w, tgt.y * h); ctx.stroke();
      ctx.setLineDash([]);
    });
    ctx.fillStyle = '#A78BFA'; ctx.font = '700 8px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('PING-REQ', step.pingReq.relays.reduce((a, rid) => {
      const r = step.nodes.find(n => n.id === rid); return a + r.x * w / step.pingReq.relays.length;
    }, 0), h * 0.25);
  }

  // Message box
  if (step.msg) {
    ctx.fillStyle = '#0F172A'; ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(10, h - 34, w - 20, 24, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#94A3B8'; ctx.font = '8.5px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(step.msg, w / 2, h - 18);
  }
  ctx.textAlign = 'left';
}

/* ── Comparison tab ──────────────────────────────────────────────────────────*/
function renderCompareTab(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-family:system-ui;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="margin:0 0 14px;color:#E2E8F0;font-size:15px">Failure Detector Comparison</h3>
  <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:20px">
    <thead><tr style="background:#0F172A"><th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Protocol</th><th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Messages/node/sec</th><th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Detection time</th><th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">False positives</th><th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Used in</th></tr></thead>
    <tbody>
      ${[
        ['Fixed heartbeat','O(N) per node','T_timeout','High under load','Zookeeper (simple)'],
        ['Phi accrual','O(N) per node','Adaptive','Low (φ-based)','Cassandra, Akka'],
        ['SWIM direct','O(1) per period','T_ping','Medium','Consul, Serf'],
        ['SWIM + indirect','O(k) per suspect','T_ping + T_ping_req','Low','Cassandra (hybrid)'],
        ['Gossip + SWIM','O(log N) per event','Fastest convergence','Lowest','HashiCorp Memberlist'],
      ].map(([p,m,d,f,u]) => `<tr style="border-bottom:1px solid #0F172A">
        <td style="padding:7px 10px;color:#F59E0B">${p}</td>
        <td style="padding:7px 10px;font-family:monospace;font-size:11px">${m}</td>
        <td style="padding:7px 10px;font-size:11px">${d}</td>
        <td style="padding:7px 10px;color:${f==='Low'||f.startsWith('Low')?'#10B981':f.startsWith('High')?'#EF4444':'#F59E0B'}">${f}</td>
        <td style="padding:7px 10px;color:#818CF8;font-size:11px">${u}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <h3 style="margin:0 0 12px;color:#E2E8F0;font-size:15px">SWIM Key Properties</h3>
  ${[
    { name:'O(1) message complexity per period', color:'#10B981', body:'Each node sends exactly one PING per protocol period, regardless of cluster size. Compare to all-pairs heartbeating (O(N²) messages total). SWIM scales to thousands of nodes.' },
    { name:'Incarnation numbers prevent false revival', color:'#4F46E5', body:'When N6 is suspected, it refutes by incrementing its incarnation number and gossiping "N6 alive, incarnation=8." Higher incarnation overrides the suspicion. A crashed node cannot refute — it never sends the higher incarnation.' },
    { name:'Piggybacking on data messages', color:'#F59E0B', body:'SWIM gossips membership changes (join/leave/suspect/fail) by piggybacking on existing PING and ACK messages. No separate gossip channel needed. Each ACK carries the latest membership deltas.' },
  ].map(p => `<div style="border-left:3px solid ${p.color};padding-left:12px;margin-bottom:12px">
    <h4 style="margin:0 0 4px;color:${p.color};font-size:12px">${p.name}</h4>
    <p style="margin:0;font-size:12px">${p.body}</p>
  </div>`).join('')}
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'Why does SWIM use indirect probing instead of just increasing the direct ping timeout?',
      a: `A longer direct ping timeout reduces false positives from transient delays, but it also increases the time-to-detection for real failures — every genuine crash takes longer to detect. This is the fundamental latency-accuracy trade-off in failure detection.<br><br>
Indirect probing (PING-REQ) decouples the two: the direct ping timeout stays short (fast detection path), but before declaring a node failed, k other nodes are asked to probe it via a different network path. If any indirect probe succeeds, the original node is alive — the first probe failure was a network blip, not a crash. The indirect probing adds only one additional round-trip, keeping detection fast while dramatically reducing false positives caused by momentary direct-path congestion. k=2–3 is typically enough to distinguish "network partition from one node" from "node crash."`,
    },
    {
      q: 'How do incarnation numbers prevent a recovered node from being treated as a new member?',
      a: `When a node (N6) is suspected, it hears the suspicion gossip through the cluster membership protocol. It immediately increments its incarnation counter from 7 to 8 and broadcasts "N6 is alive, incarnation=8." Every node that receives this message compares the incarnation number: 8 > 7 → override the suspicion with alive status. The refutation wins.<br><br>
This prevents two problems: (1) a slow but alive node being permanently evicted because it couldn't respond fast enough; (2) a node that recovered from a crash reusing its old incarnation number and being ignored because members have a newer tombstone. A recovered node starts with incarnation 0, which is lower than the tombstone's incarnation — it must re-join as a new member. The cluster does not accept stale revivals. Incarnation numbers are the SWIM equivalent of Raft terms: monotonically increasing, and the higher number always wins.`,
    },
    {
      q: 'What is the Phi Accrual failure detector used by Cassandra, and how does it differ from SWIM?',
      a: `The Phi Accrual failure detector (Hayashibara et al., 2004) maintains a statistical model of a node's heartbeat arrival times. It computes φ (phi) as a continuous probability score: φ represents how likely it is that a node has failed, given the distribution of its past inter-heartbeat intervals.<br><br>
φ = -log10(P_later(t − t_last)) where P_later is the probability that the next heartbeat would arrive later than it already has, computed from an exponential distribution fit to recent inter-arrival times. When φ exceeds a configurable threshold (e.g., 8.0 ≈ p(failure) > 99.999%), the node is declared failed.<br><br>
Key difference from SWIM: Phi accrual adapts to jitter — on a congested network where heartbeats are consistently delayed, the model's distribution shifts right and the threshold is harder to exceed, reducing false positives. SWIM's indirect probing is complementary: Cassandra uses phi accrual for the suspicion decision and gossip (SWIM-inspired) for membership propagation. Together they get adaptive detection (phi) and scalable propagation (gossip).`,
    },
  ]);
}

export function mount(container) {
  const shell = createModuleShell(container, {
    tag: 'Distributed',
    title: 'Failure Detection',
    subtitle: 'SWIM protocol — direct ping, indirect ping-req, suspicion, incarnation numbers, and phi accrual',
    tabs: [
      { id:'anim',    label:'SWIM Protocol' },
      { id:'compare', label:'Detector Comparison' },
      { id:'iq',      label:'Interview Q&A' },
    ],
  });
  const { tabs, body } = shell;
  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:340px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);
      const steps = SWIM_STEPS.map((s, i) => ({ label: `Step ${i + 1}`, duration: 2800, mutate: st => { st.stepIdx = i; } }));
      const engine = new SimulationEngine({
        initialState: { stepIdx: 0 }, steps,
        onRender: (state, cnv) => {
          const ctx = cnv.getContext('2d'), pr = window.devicePixelRatio || 1;
          cnv.width = cnv.clientWidth * pr; cnv.height = cnv.clientHeight * pr; ctx.scale(pr, pr);
          drawFD(ctx, state.stepIdx, cnv.clientWidth, cnv.clientHeight);
        },
      });
      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));
      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);
      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = SWIM_STEPS[i].desc; });
      desc.textContent = SWIM_STEPS[0].desc;
      return () => engine.destroy();
    },
    compare: renderCompareTab,
    iq: renderIQ,
  });
  return null;
}
