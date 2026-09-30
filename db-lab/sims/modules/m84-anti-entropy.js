import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

// Topic: Distributed Snapshots — Chandy-Lamport algorithm
const DS_STEPS = [
  {
    label: 'Why Snapshots?',
    desc: 'In a distributed system, there is no global "pause". A consistent snapshot must capture the state of all nodes and in-flight messages at a single logical point — without stopping the system. Chandy-Lamport (1985) solves this.',
    phase: 'why',
  },
  {
    label: 'Initiator Records State',
    desc: 'Process P1 initiates the snapshot. It records its own local state (variables, queues). It then sends a special MARKER message on every outgoing channel, announcing the snapshot has started.',
    phase: 'init',
  },
  {
    label: 'MARKER Propagation',
    desc: 'When a process receives a MARKER for the first time, it records its own state immediately, then sends a MARKER on all its outgoing channels — before processing any further application messages.',
    phase: 'marker',
  },
  {
    label: 'Channel State Recording',
    desc: 'After recording local state, a process records all messages it receives on a channel until it receives a MARKER on that channel. These are the "in-flight" messages that were already sent but not yet delivered when the snapshot was initiated.',
    phase: 'channel',
  },
  {
    label: 'Snapshot Complete',
    desc: 'The global snapshot = union of all local states + all channel states. No process stopped; no coordinator was needed. The algorithm works because FIFO channels ensure markers arrive in the right order.',
    phase: 'complete',
  },
];

const PROCS = [
  { id:'P1', x:0.20, y:0.30 },
  { id:'P2', x:0.80, y:0.30 },
  { id:'P3', x:0.50, y:0.72 },
];

function drawDS(ctx, idx, w, h) {
  const step = DS_STEPS[idx];
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
  function procCircle(p, col, badge) {
    const px = p.x * w, py = p.y * h;
    ctx.beginPath(); ctx.arc(px, py, 28, 0, Math.PI * 2);
    ctx.fillStyle = col; ctx.fill();
    ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 2; ctx.stroke();
    textC(p.id, px, py, '#fff', 13, true);
    if (badge) {
      roundRect(px - 34, py + 30, 68, 18, 3, '#0F172A', col);
      textC(badge, px, py + 39, col, 8, false);
    }
  }
  function arrow(fx, fy, tx, ty, col, lbl, dashed) {
    if (dashed) ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty);
    ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.setLineDash([]);
    const ang = Math.atan2(ty - fy, tx - fx);
    ctx.beginPath();
    ctx.moveTo(tx, ty); ctx.lineTo(tx - 9 * Math.cos(ang - 0.4), ty - 9 * Math.sin(ang - 0.4));
    ctx.lineTo(tx - 9 * Math.cos(ang + 0.4), ty - 9 * Math.sin(ang + 0.4));
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
    if (lbl) {
      ctx.fillStyle = col; ctx.font = '9px system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(lbl, (fx + tx) / 2, Math.min(fy, ty) - 3);
    }
  }

  if (phase === 'why') {
    // Three clocks showing different times
    const times = ['T=101', 'T=98', 'T=103'];
    const cols = ['#10B981', '#4F46E5', '#A78BFA'];
    PROCS.forEach((p, i) => {
      procCircle(p, cols[i], times[i]);
      roundRect(p.x * w - 36, p.y * h + 54, 72, 24, 4, '#F59E0B22', '#F59E0B');
      textC('local time', p.x * w, p.y * h + 66, '#F59E0B', 8, false);
    });
    // In-flight message
    const mx = (PROCS[0].x + PROCS[1].x) / 2 * w;
    const my = PROCS[0].y * h - 30;
    ctx.fillStyle = '#818CF8'; ctx.beginPath(); ctx.arc(mx, my, 6, 0, Math.PI * 2); ctx.fill();
    textC('msg in-flight', mx, my - 14, '#818CF8', 8, false);
    textC('No global clock → snapshot must capture in-flight messages too', w / 2, h * 0.93, '#EF4444', 10, true);
  }

  if (phase === 'init') {
    procCircle(PROCS[0], '#10B981', '📸 STATE SAVED');
    procCircle(PROCS[1], '#334155', 'running');
    procCircle(PROCS[2], '#334155', 'running');
    // Marker arrows from P1
    arrow(PROCS[0].x * w + 28, PROCS[0].y * h, PROCS[1].x * w - 28, PROCS[1].y * h, '#F59E0B', '📌 MARKER');
    arrow(PROCS[0].x * w + 14, PROCS[0].y * h + 24, PROCS[2].x * w - 22, PROCS[2].y * h - 20, '#F59E0B', '📌 MARKER');
    roundRect(w * 0.05, h * 0.82, w * 0.40, 30, 5, '#10B98122', '#10B981');
    textC('P1: state recorded, MARKERs sent', w * 0.25, h * 0.87, '#10B981', 9, false);
  }

  if (phase === 'marker') {
    procCircle(PROCS[0], '#10B981', '📸 STATE SAVED');
    procCircle(PROCS[1], '#F59E0B', '📸 RECORDING');
    procCircle(PROCS[2], '#334155', 'not yet');
    // P1's marker reached P2, P2 saves state, sends marker to P3
    arrow(PROCS[1].x * w - 14, PROCS[1].y * h + 24, PROCS[2].x * w + 22, PROCS[2].y * h - 20, '#F59E0B', '📌 MARKER');
    // Note channel
    roundRect(w * 0.45, h * 0.42, 150, 24, 4, '#F59E0B22', '#F59E0B');
    textC('P2: state saved, MARKER → P3', w * 0.52, h * 0.48, '#F59E0B', 9, false);
  }

  if (phase === 'channel') {
    procCircle(PROCS[0], '#10B981', '✓ DONE');
    procCircle(PROCS[1], '#10B981', '✓ DONE');
    procCircle(PROCS[2], '#A78BFA', '📝 RECORDING CHANNEL');
    // Messages received after P3 snapshot, before P3 gets marker from P2
    const msg1 = { x: (PROCS[1].x + PROCS[2].x) / 2 * w, y: (PROCS[1].y + PROCS[2].y) / 2 * h };
    ctx.fillStyle = '#818CF8'; ctx.beginPath(); ctx.arc(msg1.x - 20, msg1.y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#818CF8'; ctx.beginPath(); ctx.arc(msg1.x + 10, msg1.y + 10, 5, 0, Math.PI * 2); ctx.fill();
    textC('in-flight msgs', msg1.x, msg1.y - 14, '#818CF8', 8, false);
    textC('(part of channel state)', msg1.x, msg1.y - 4, '#94A3B8', 7, false);
    roundRect(w * 0.05, h * 0.82, w * 0.90, 30, 5, '#A78BFA22', '#A78BFA');
    textC('P3 records msgs received on P1→P3 and P2→P3 channels until their MARKERs arrive', w * 0.50, h * 0.87, '#A78BFA', 9, false);
  }

  if (phase === 'complete') {
    PROCS.forEach(p => procCircle(p, '#10B981', '✓ COMPLETE'));
    // Summary box
    roundRect(w * 0.10, h * 0.55, w * 0.80, 100, 8, '#0F172A', '#10B981');
    textC('Global Consistent Snapshot', w / 2, h * 0.61, '#10B981', 12, true);
    const parts = [
      'Local state P1: { balance=500 }',
      'Local state P2: { inventory=42 }',
      'Local state P3: { pending_orders=[..] }',
      'Channel P1→P2: { [msg#19] }',
      'Channel P2→P3: { }  (empty)',
    ];
    parts.forEach((t, i) => textC(t, w / 2, h * 0.66 + i * 14, '#94A3B8', 9, false));
    textC('No global pause required — system ran continuously throughout', w / 2, h * 0.94, '#10B981', 10, true);
  }

  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

function renderConcepts(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="color:#E2E8F0;margin:0 0 14px">Distributed Snapshot Concepts</h3>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin-bottom:20px">
    ${[
      ['Chandy-Lamport','Classic algorithm (1985). Assumes FIFO channels. Initiator sends MARKERs; each process records state on first receipt then forwards MARKERs. Channel state = messages received after local snapshot but before MARKER on that channel.','#4F46E5'],
      ['Consistent Cut','A set of local states S={s₁,s₂,...,sₙ} where if event e₂ happened-before e₁ and s₁ includes e₁, then s₂ includes e₂. In other words: no message is received in the cut that wasn\'t sent in the cut.','#10B981'],
      ['Happened-Before','Lamport\'s → relation: a→b if (1) a and b are in the same process and a came first, (2) a is a send event and b is the matching receive, or (3) a→c and c→b. Defines partial causal order without global clocks.','#F59E0B'],
      ['FIFO Channel Requirement','Chandy-Lamport requires FIFO delivery on each channel. If channels can reorder messages, a message sent before the MARKER might arrive after it, breaking channel-state recording. TCP provides FIFO; UDP does not.','#A78BFA'],
      ['Snapshot Uses','Global state detection: deadlock detection (look for cycles in the wait-for graph snapshot), distributed garbage collection, checkpointing for fault tolerance and rollback recovery.','#06B6D4'],
      ['Rollback Recovery','Store periodic snapshots. On failure, all processes roll back to the latest consistent snapshot. Re-execute messages logged since the checkpoint. Used in HPC (Checkpoint-Restart) and stream processing (Flink checkpoints).','#EF4444'],
    ].map(([t,d,col]) => `
      <div style="background:#0F172A;border-radius:8px;padding:14px 16px;border-left:3px solid ${col}">
        <div style="color:${col};font-weight:700;font-size:12px;margin-bottom:6px">${t}</div>
        <div style="font-size:11px;color:#94A3B8">${d}</div>
      </div>`).join('')}
  </div>
  <div style="background:#172554;border-left:3px solid #4F46E5;padding:12px 16px;border-radius:0 6px 6px 0;font-size:12px">
    <strong style="color:#818CF8">Apache Flink Checkpointing</strong> uses a variant of Chandy-Lamport: stream barriers (markers) flow through the dataflow graph.
    When an operator receives barriers on all inputs, it saves its state to durable storage and forwards the barrier.
    On failure, all operators roll back to the last complete checkpoint and replay input from the message broker.
  </div>
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'Explain the Chandy-Lamport snapshot algorithm step by step.',
      a: 'Step 1: An initiator process P records its own local state. Step 2: P sends a special MARKER message on every outgoing channel (before any more application messages). Step 3: When any process Q receives a MARKER on channel C for the first time: (a) Q records its local state, (b) Q records the channel state of C as empty (the MARKER is the first thing Q received on C after its snapshot), (c) Q sends a MARKER on all its outgoing channels, (d) Q begins recording all messages received on its other incoming channels (those on which it hasn\'t yet received a MARKER). Step 4: When Q receives a MARKER on a channel C that was already open for recording, Q stops recording C — the channel state is all messages recorded since Q took its snapshot. Step 5: Collection: once all processes have their local snapshots and all channel states, the global snapshot = union of all local states + all channel states.',
    },
    {
      q: 'What is a consistent cut and why is it important?',
      a: 'A consistent cut is a selection of events from each process such that if event b is included in the cut and a happened-before b, then a is also in the cut. Intuitively: the cut never includes a message receipt without its send. This matters because an inconsistent cut (one that includes a receive but not its corresponding send) describes a state the system never actually was in — messages appear to materialise out of nowhere. Only consistent cuts are valid global snapshots because only they represent states the system could have been in at some point.',
    },
    {
      q: 'How does Apache Flink use the snapshot algorithm for fault tolerance?',
      a: 'Flink uses a variant of Chandy-Lamport called ABS (Asynchronous Barrier Snapshotting). The JobManager periodically injects barrier records into each input stream. When an operator receives a barrier on all inputs (aligning barriers from all sources), it saves its local state (key-value state, aggregation state) to a durable checkpoint store (typically HDFS or S3). It then forwards the barrier downstream. When the sink receives barriers, the checkpoint is complete. On failure, the entire job is restarted from the last complete checkpoint and input is replayed from the message broker (e.g., Kafka) from the last checkpointed offset. This provides exactly-once processing semantics.',
    },
  ]);
}

export function mount(container) {
  const shell = createModuleShell(container, {
    tag: 'Distributed',
    title: 'Distributed Snapshots',
    subtitle: 'Chandy-Lamport algorithm, consistent cuts, and rollback recovery for fault tolerance.',
    tabs: [
      { id:'anim',     label:'Chandy-Lamport' },
      { id:'concepts', label:'Concepts' },
      { id:'iq',       label:'Interview Q&A' },
    ],
  });
  const { tabs, body } = shell;
  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:360px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);
      const steps = DS_STEPS.map((s, i) => ({ label: s.label, duration: 2200, mutate: st => { st.idx = i; } }));
      const engine = new SimulationEngine({
        initialState: { idx: 0 }, steps,
        onRender: (state, cnv) => {
          const c = cnv.getContext('2d'), pr = window.devicePixelRatio || 1;
          cnv.width = cnv.clientWidth * pr; cnv.height = cnv.clientHeight * pr; c.scale(pr, pr);
          drawDS(c, state.idx, cnv.clientWidth, cnv.clientHeight);
        },
      });
      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));
      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);
      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = DS_STEPS[i].desc; });
      desc.textContent = DS_STEPS[0].desc;
      return () => engine.destroy();
    },
    concepts: renderConcepts,
    iq:       renderIQ,
  });
  return null;
}
