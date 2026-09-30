import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

// Shows async replication lag, hinted handoff, and catch-up
const AR_STEPS = [
  {
    label: 'Steady State',
    desc: 'Under normal load primary and replica are within 2–5 ms of each other. Replica applies WAL records as fast as the network and disk allow.',
    lagMs: 3, phase: 'steady',
  },
  {
    label: 'Load Spike',
    desc: 'Prime Day traffic spikes 10×. Primary writes accumulate faster than the replica can apply them. Replication lag climbs to hundreds of milliseconds.',
    lagMs: 380, phase: 'spike',
  },
  {
    label: 'Stale Read',
    desc: 'A user reads their order status from the replica before the write propagates. They see the old status — a read-your-writes violation. Applications must route "read your own writes" to the primary.',
    lagMs: 380, phase: 'stale',
  },
  {
    label: 'Replica Offline',
    desc: 'Replica restarts for maintenance. Primary continues writing. When the replica rejoins it uses pg_replication_slot (or WAL files retained by wal_keep_size) to replay from where it left off without reseeding.',
    lagMs: null, phase: 'offline',
  },
  {
    label: 'Catch-Up',
    desc: 'Replica replays the backlog at full disk speed (no client transactions in the way). Lag shrinks back to near-zero. pg_stat_replication shows write_lag / flush_lag / replay_lag in real time.',
    lagMs: 15, phase: 'catchup',
  },
  {
    label: 'Hinted Handoff',
    desc: 'In Dynamo-style systems a node that is temporarily down gets its writes "hinted" to another node. When the target rejoins, the hints are replayed. Prevents write failures at the cost of temporary inconsistency.',
    lagMs: 0, phase: 'hinted',
  },
];

const COL = { primary:'#10B981', replica:'#4F46E5', client:'#818CF8', stale:'#EF4444', lag:'#F59E0B' };

function bar(ctx, x, y, w, h, pct, col) {
  ctx.fillStyle = '#1E293B';
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 3); ctx.fill();
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.roundRect(x, y, w * pct, h, 3); ctx.fill();
}

function drawAR(ctx, idx, W, H) {
  const step = AR_STEPS[idx];
  ctx.clearRect(0, 0, W, H);

  const priX = W * 0.25, repX = W * 0.70, topY = 20, nodeH = 80;

  // Helpers
  function nodeBox(x, label, col, subLabel) {
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.roundRect(x - 60, topY, 120, nodeH, 8); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x, topY + 26);
    if (subLabel) {
      ctx.fillStyle = '#fff9'; ctx.font = '10px system-ui';
      ctx.fillText(subLabel, x, topY + 46);
    }
  }

  function arrow(fx, tx, y, label, col, dashed) {
    if (dashed) ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(fx, y); ctx.lineTo(tx - 6, y);
    ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.setLineDash([]);
    const dir = tx > fx ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(tx, y); ctx.lineTo(tx - dir * 9, y - 4); ctx.lineTo(tx - dir * 9, y + 4);
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
    ctx.fillStyle = col; ctx.font = '10px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(label, (fx + tx) / 2, y - 3);
  }

  const { phase, lagMs } = step;

  if (phase === 'steady') {
    nodeBox(priX, 'Primary', COL.primary, 'write_lsn: 10500');
    nodeBox(repX, 'Replica', COL.replica, 'replay_lsn: 10498');
    arrow(priX, repX, topY + nodeH + 30, 'WAL stream  (~2 ms lag)', COL.lag, false);
    lagMeter(ctx, W, H, lagMs);
    ctx.fillStyle = '#10B98188'; ctx.font = '700 11px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('✓ Reads from replica are safe', (priX + repX) / 2, H - 28);
  }

  if (phase === 'spike') {
    nodeBox(priX, 'Primary', COL.primary, 'write_lsn: 99300');
    nodeBox(repX, 'Replica', COL.replica, 'replay_lsn: 85100');
    arrow(priX, repX, topY + nodeH + 30, 'WAL backlog', COL.lag, false);
    lagMeter(ctx, W, H, lagMs);
    ctx.fillStyle = '#EF444488'; ctx.font = '700 11px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('⚠ Reads from replica may be stale!', (priX + repX) / 2, H - 28);
  }

  if (phase === 'stale') {
    nodeBox(priX, 'Primary', COL.primary, 'order.status = SHIPPED');
    nodeBox(repX, 'Replica', COL.replica, 'order.status = PLACED (stale)');
    // client
    const clX = W * 0.04;
    ctx.fillStyle = COL.client;
    ctx.beginPath(); ctx.roundRect(clX - 24, topY + 16, 48, 48, 6); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '700 10px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('User', clX, topY + 40);
    arrow(clX, repX, topY + nodeH + 30, 'SELECT status', COL.client, false);
    arrow(repX, clX, topY + nodeH + 70, '"PLACED" ← stale!', COL.stale, true);
    lagMeter(ctx, W, H, lagMs);
  }

  if (phase === 'offline') {
    nodeBox(priX, 'Primary', COL.primary, 'continues writing');
    ctx.fillStyle = '#334155';
    ctx.beginPath(); ctx.roundRect(repX - 60, topY, 120, nodeH, 8); ctx.fill();
    ctx.fillStyle = '#94A3B8'; ctx.font = '700 12px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Replica', repX, topY + 26);
    ctx.font = '10px system-ui'; ctx.fillText('OFFLINE', repX, topY + 46);
    // WAL retained
    ctx.fillStyle = '#F59E0B33';
    ctx.beginPath(); ctx.roundRect(priX - 55, topY + nodeH + 20, 110, 28, 5); ctx.fill();
    ctx.fillStyle = '#F59E0B'; ctx.font = '10px system-ui';
    ctx.fillText('WAL retained by slot', priX, topY + nodeH + 34);
    ctx.fillStyle = '#94A3B8'; ctx.font = '10px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Replica will replay from slot LSN on rejoin', (priX + repX) / 2, topY + nodeH + 75);
    lagMeter(ctx, W, H, null);
  }

  if (phase === 'catchup') {
    nodeBox(priX, 'Primary', COL.primary, 'write_lsn: 105000');
    nodeBox(repX, 'Replica', COL.replica, 'replay_lsn: 104800 ↑');
    // catch-up bar
    const bx = (priX + repX) / 2 - 80, by = topY + nodeH + 25;
    bar(ctx, bx, by, 160, 18, 0.91, '#10B981');
    ctx.fillStyle = '#10B981'; ctx.font = '700 10px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('91% caught up', bx + 80, by + 9);
    lagMeter(ctx, W, H, lagMs);
  }

  if (phase === 'hinted') {
    // 3 nodes, N3 down, hints stored on N2
    const nx = [W * 0.20, W * 0.50, W * 0.80];
    const ny = topY + 20;
    const labels = ['N1', 'N2', 'N3 (down)'];
    const cols = [COL.primary, '#4F46E5', '#334155'];
    nx.forEach((x, i) => {
      ctx.fillStyle = cols[i];
      ctx.beginPath(); ctx.arc(x, ny, 26, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(labels[i].split(' ')[0], x, ny);
      ctx.fillStyle = '#94A3B8'; ctx.font = '9px system-ui';
      ctx.fillText(labels[i].includes('down') ? 'OFFLINE' : '', x, ny + 36);
    });
    // Write to N2 (N3's hint holder)
    arrow(nx[0], nx[1], ny + 60, 'Write + hint for N3', COL.primary, false);
    ctx.fillStyle = '#F59E0B33';
    ctx.beginPath(); ctx.roundRect(nx[1] - 58, ny + 75, 116, 22, 4); ctx.fill();
    ctx.fillStyle = '#F59E0B'; ctx.font = '700 10px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('📦 Hint stored for N3', nx[1], ny + 86);
    // Replay on rejoin
    arrow(nx[1], nx[2], ny + 125, 'Replay hints on rejoin', '#10B981', true);
    lagMeter(ctx, W, H, 0);
  }

  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

function lagMeter(ctx, W, H, lagMs) {
  const label = lagMs === null ? 'Lag: ∞ (offline)' :
                lagMs === 0   ? 'Lag: ~0 ms ✓' : `Lag: ${lagMs} ms`;
  const col = lagMs === null ? '#334155' : lagMs === 0 ? '#10B981' : lagMs < 20 ? '#F59E0B' : '#EF4444';
  ctx.fillStyle = col + '22';
  ctx.beginPath(); ctx.roundRect(W - 140, H - 32, 128, 22, 4); ctx.fill();
  ctx.fillStyle = col; ctx.font = '700 10px system-ui';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, W - 76, H - 21);
}

function renderConcepts(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="color:#E2E8F0;margin:0 0 14px">Async Replication Concepts</h3>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin-bottom:20px">
    ${[
      ['Hinted Handoff','A Dynamo/Cassandra pattern. When a node is down, its writes are stored as "hints" on another ring neighbour. On rejoin, hints are replayed. Prevents write failures at the cost of temporary inconsistency.'],
      ['Read-Your-Writes','Guarantee that a client always sees its own writes. Solutions: read from primary; track client\'s write LSN and wait for replica to reach it; use sticky sessions routed to the replica that received the write.'],
      ['Monotonic Reads','Guarantee reads never go backwards. Use session tokens: a client\'s reads always go to the same replica, or to replicas whose LSN ≥ the client\'s last seen LSN.'],
      ['pg_replication_slot','PostgreSQL mechanism to retain WAL until a specific standby confirms receipt. Prevents the primary from cleaning WAL the standby hasn\'t read. Risk: unbounded WAL growth if standby is down.'],
      ['Logical Replication','Row-level change events (INSERT/UPDATE/DELETE) rather than raw WAL bytes. Allows selective table replication, cross-version migration, and fan-out to multiple subscribers.'],
      ['Cascading Replication','A standby can itself stream to another standby (A → B → C). Reduces primary\'s WAL sender load for large replica sets at the cost of increased lag for leaf nodes.'],
    ].map(([t,d]) => `
      <div style="background:#0F172A;border-radius:8px;padding:14px 16px">
        <div style="color:#4F46E5;font-weight:700;font-size:12px;margin-bottom:6px">${t}</div>
        <div style="font-size:12px;color:#94A3B8">${d}</div>
      </div>`).join('')}
  </div>
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'What is a read-your-writes consistency violation and how do you prevent it?',
      a: 'It occurs when a client writes to the primary and then reads from a replica that has not yet received that write, seeing old data. Prevention options: (1) Always read from primary after a write — simple but loses replica read scalability. (2) Track the write\'s LSN and issue replica reads only when the replica\'s replay_lsn ≥ that LSN. (3) Use sticky sessions routing the client to the same replica that is guaranteed to have their write. In Cassandra this is achieved by reading at LOCAL_QUORUM — the majority must agree on the value.',
    },
    {
      q: 'What is a replication slot in PostgreSQL and what is the risk?',
      a: 'A replication slot is a named, durable reference that instructs PostgreSQL to retain WAL until the slot consumer (a standby or logical subscriber) confirms receipt. This prevents the primary from recycling WAL that the standby hasn\'t applied yet — eliminating the need for wal_keep_size guessing. The risk: if a standby is offline for a long time, the slot holds all unconfirmed WAL indefinitely, potentially filling the disk. Monitor pg_replication_slots.wal_status and set max_slot_wal_keep_size to cap retention.',
    },
    {
      q: 'How does Cassandra\'s hinted handoff differ from PostgreSQL\'s replication?',
      a: 'PostgreSQL streaming replication is leader-based: the primary is the single source of truth, and standbys are read-only. Hinted handoff is a Dynamo-style leaderless pattern used in Cassandra: any coordinator node can accept writes for any key, and if the target replica is down, the coordinator stores the write as a "hint" and replays it when the target recovers. This provides high write availability without a primary bottleneck but requires anti-entropy (Merkle tree reconciliation) to correct hints that expire before replay.',
    },
  ]);
}

export function mount(container) {
  const shell = createModuleShell(container, {
    tag: 'Distributed',
    title: 'Asynchronous Replication',
    subtitle: 'Replication lag, stale reads, hinted handoff, and read-your-writes consistency.',
    tabs: [
      { id:'anim',     label:'Lag Visualiser' },
      { id:'concepts', label:'Concepts' },
      { id:'iq',       label:'Interview Q&A' },
    ],
  });
  const { tabs, body } = shell;
  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:340px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);
      const steps = AR_STEPS.map((s, i) => ({ label: s.label, duration: 2200, mutate: st => { st.idx = i; } }));
      const engine = new SimulationEngine({
        initialState: { idx: 0 }, steps,
        onRender: (state, cnv) => {
          const c = cnv.getContext('2d'), pr = window.devicePixelRatio || 1;
          cnv.width = cnv.clientWidth * pr; cnv.height = cnv.clientHeight * pr; c.scale(pr, pr);
          drawAR(c, state.idx, cnv.clientWidth, cnv.clientHeight);
        },
      });
      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));
      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);
      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = AR_STEPS[i].desc; });
      desc.textContent = AR_STEPS[0].desc;
      return () => engine.destroy();
    },
    concepts: renderConcepts,
    iq:       renderIQ,
  });
  return null;
}
