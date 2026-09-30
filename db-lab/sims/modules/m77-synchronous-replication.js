import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

// Steps show the PostgreSQL synchronous replication state machine
// quorum_commit: false (classic) or true (any-of-N)
const SR_STEPS = [
  {
    label: 'Normal Operation',
    desc: 'Primary streams WAL continuously to the standby. The standby applies records and sends back a reply including its write_lsn, flush_lsn, and apply_lsn. Primary waits for flush_lsn ≥ commit_lsn before returning to client.',
    phase: 'normal',
    lagMs: 2,
  },
  {
    label: 'Client Commits',
    desc: 'Client issues COMMIT. Primary writes the WAL COMMIT record and waits for the synchronous standby to confirm it has flushed that LSN to disk before sending the success reply.',
    phase: 'commit_wait',
    lagMs: 2,
  },
  {
    label: 'Standby Confirms Flush',
    desc: 'Standby fsyncs the WAL record and sends its updated flush_lsn. Primary sees flush_lsn ≥ commit LSN → unblocks and returns SUCCESS to client. Round-trip typically 1–5 ms on a LAN.',
    phase: 'confirmed',
    lagMs: 0,
  },
  {
    label: 'Standby Falls Behind',
    desc: 'Network jitter or standby I/O saturation causes flush_lsn to lag. The primary holds all new COMMIT calls in a wait queue. Write throughput drops to the replica\'s flush rate. This is the main cost of synchronous replication.',
    phase: 'lagging',
    lagMs: 240,
  },
  {
    label: 'Standby Disconnects',
    desc: 'If synchronous_standby_names is set and ALL listed standbys disconnect, the primary BLOCKS new writes indefinitely (availability vs durability trade-off). Set synchronous_commit=remote_write for a softer guarantee that degrades gracefully.',
    phase: 'disconnected',
    lagMs: null,
  },
  {
    label: 'Patroni Failover',
    desc: 'Patroni detects primary failure via etcd/Consul. The standby with the highest LSN is promoted. Patroni updates the DCS leader key and rewrites postgresql.conf on the new primary. Other standbys re-attach to the new primary.',
    phase: 'failover',
    lagMs: 0,
  },
];

function drawSR(ctx, idx, w, h) {
  const step = SR_STEPS[idx];
  ctx.clearRect(0, 0, w, h);

  const priX = 0.28 * w, repX = 0.72 * w, topY = 30, botY = h - 30;
  const actors = [
    { label:'Client', x:0.06 * w, col:'#818CF8' },
    { label:'Primary', x:priX,   col:'#10B981' },
    { label:'Standby', x:repX,   col:'#4F46E5' },
  ];

  // Lifelines
  actors.forEach(a => {
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(a.x, topY + 28); ctx.lineTo(a.x, botY);
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.stroke();
    ctx.setLineDash([]);
  });

  // Actor headers
  actors.forEach(a => {
    ctx.fillStyle = step.phase === 'disconnected' && a.label === 'Standby' ? '#EF4444' :
                    step.phase === 'failover'     && a.label === 'Primary' ? '#EF4444' : a.col;
    ctx.beginPath(); ctx.roundRect(a.x - 44, topY, 88, 26, 5); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(a.label, a.x, topY + 13);
    if (step.phase === 'disconnected' && a.label === 'Standby') {
      ctx.fillStyle = '#EF4444'; ctx.font = '10px system-ui';
      ctx.fillText('OFFLINE', a.x, topY + 28 + 12);
    }
  });

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

  const y0 = 90, cl = actors[0].x, pr = actors[1].x, st = actors[2].x;

  if (step.phase === 'normal') {
    arrow(cl, pr, y0,       'INSERT', '#818CF8', false);
    arrow(pr, st, y0 + 40,  'WAL stream', '#F59E0B', false);
    arrow(st, pr, y0 + 80,  'flush_lsn reply', '#10B981', true);
    arrow(pr, cl, y0 + 120, 'OK', '#10B981', false);
    drawLag(ctx, w, botY - 10, step.lagMs, h);
  }
  if (step.phase === 'commit_wait') {
    arrow(cl, pr, y0,       'COMMIT', '#818CF8', false);
    arrow(pr, st, y0 + 40,  'WAL COMMIT record', '#F59E0B', false);
    // waiting block
    ctx.fillStyle = '#F59E0B33';
    ctx.beginPath(); ctx.roundRect(pr - 55, y0 + 55, 110, 30, 5); ctx.fill();
    ctx.fillStyle = '#F59E0B'; ctx.font = '700 10px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('⏳ waiting flush_lsn…', pr, y0 + 70);
    drawLag(ctx, w, botY - 10, step.lagMs, h);
  }
  if (step.phase === 'confirmed') {
    arrow(cl, pr, y0,       'COMMIT', '#818CF8', false);
    arrow(pr, st, y0 + 40,  'WAL COMMIT record', '#F59E0B', false);
    arrow(st, pr, y0 + 80,  'flush_lsn ≥ commit LSN', '#10B981', true);
    arrow(pr, cl, y0 + 120, 'SUCCESS', '#10B981', false);
    drawLag(ctx, w, botY - 10, 0, h);
  }
  if (step.phase === 'lagging') {
    arrow(pr, st, y0, 'WAL records', '#F59E0B', false);
    // lag bar
    ctx.fillStyle = '#EF444433';
    ctx.beginPath(); ctx.roundRect(st - 60, y0 + 30, 120, 30, 5); ctx.fill();
    ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(st - 60, y0 + 30, 120, 30, 5); ctx.stroke();
    ctx.fillStyle = '#EF4444'; ctx.font = '700 10px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('I/O saturated — LAG 240ms', st, y0 + 45);
    // blocked commits
    ctx.fillStyle = '#F59E0B33';
    ctx.beginPath(); ctx.roundRect(pr - 70, y0 + 80, 140, 28, 5); ctx.fill();
    ctx.fillStyle = '#F59E0B'; ctx.font = '700 10px system-ui';
    ctx.fillText('COMMIT queue blocked', pr, y0 + 94);
    drawLag(ctx, w, botY - 10, step.lagMs, h);
  }
  if (step.phase === 'disconnected') {
    ctx.fillStyle = '#EF4444'; ctx.font = '700 13px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('⚠ Standby disconnected', (pr + st) / 2, y0 + 20);
    ctx.fillStyle = '#EF444433';
    ctx.beginPath(); ctx.roundRect(pr - 70, y0 + 50, 140, 28, 5); ctx.fill();
    ctx.fillStyle = '#EF4444'; ctx.font = '700 10px system-ui';
    ctx.fillText('WRITES BLOCKED ∞', pr, y0 + 64);
    ctx.fillStyle = '#94A3B8'; ctx.font = '10px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('synchronous_commit=on with no standby', (pr + st) / 2, y0 + 105);
    ctx.fillText('→ primary waits forever', (pr + st) / 2, y0 + 120);
  }
  if (step.phase === 'failover') {
    ctx.fillStyle = '#EF4444'; ctx.font = '700 12px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('PRIMARY FAILED', pr, y0 + 15);
    ctx.fillStyle = '#10B981'; ctx.font = '700 12px system-ui';
    ctx.fillText('🏆 PROMOTED → new primary', st, y0 + 15);
    ctx.fillStyle = '#94A3B8'; ctx.font = '10px system-ui';
    ctx.fillText('Patroni updates DCS leader key', (pr + st) / 2, y0 + 60);
    ctx.fillText('Other standbys reattach', (pr + st) / 2, y0 + 80);
    arrow(cl, st, y0 + 110, 'new writes', '#818CF8', false);
  }

  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

function drawLag(ctx, w, y, lagMs, h) {
  const label = lagMs === 0 ? 'Lag: 0 ms ✓' : `Lag: ${lagMs} ms`;
  const col = lagMs === 0 ? '#10B981' : lagMs < 20 ? '#F59E0B' : '#EF4444';
  ctx.fillStyle = col + '22';
  ctx.beginPath(); ctx.roundRect(w - 130, y - 16, 118, 22, 4); ctx.fill();
  ctx.fillStyle = col; ctx.font = '700 10px system-ui';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, w - 71, y - 5);
}

function renderConfig(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="color:#E2E8F0;margin:0 0 14px">PostgreSQL Sync Replication Config</h3>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-bottom:20px">
    ${[
      ['synchronous_standby_names','Names the required standbys. Examples:<br>'
        + '<code>standby1</code> — wait for 1.<br>'
        + '<code>ANY 1 (s1,s2,s3)</code> — quorum commit, fastest of 3.<br>'
        + '<code>FIRST 2 (s1,s2,s3)</code> — wait for s1+s2 specifically.'],
      ['synchronous_commit','<code>on</code>: wait for standby fsync.<br>'
        + '<code>remote_write</code>: wait for standby OS buffer.<br>'
        + '<code>remote_apply</code>: wait for standby to replay.<br>'
        + '<code>local</code>: only local fsync (async to replica).<br>'
        + '<code>off</code>: async — highest throughput.'],
      ['wal_level','Must be <code>replica</code> or <code>logical</code> to enable streaming replication. <code>minimal</code> disables WAL shipping.'],
      ['max_wal_senders','Max concurrent WAL sender processes (one per standby). Default: 10. Set ≥ number of standbys.'],
    ].map(([t,d]) => `
      <div style="background:#0F172A;border-radius:8px;padding:14px 16px">
        <code style="color:#F59E0B;font-size:11px">${t}</code>
        <div style="font-size:12px;color:#94A3B8;margin-top:6px">${d}</div>
      </div>`).join('')}
  </div>
  <div style="background:#172554;border-left:3px solid #10B981;padding:12px 16px;border-radius:0 6px 6px 0;font-size:12px">
    <strong style="color:#10B981">Patroni HA:</strong> Patroni wraps PostgreSQL with a DCS (etcd/Consul/ZooKeeper) distributed lock.
    Only the node holding the leader lock can be primary. On timeout, a candidate acquires the lock, promotes itself, and rewrites recovery.conf for other nodes to follow.
    Typical failover: 10–30 s including quorum election + data catchup.
  </div>
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'What happens if a synchronous standby disconnects in PostgreSQL?',
      a: "With synchronous_commit=on and the only synchronous standby gone, the primary BLOCKS all new COMMIT calls indefinitely — it cannot confirm durability. This is a deliberate availability sacrifice to prevent data loss. Solution: set synchronous_standby_names='ANY 1 (s1,s2)' so either standby suffices, or use synchronous_commit=remote_write which degrades gracefully to async if the standby is gone.",
    },
    {
      q: 'What is quorum commit in PostgreSQL and when would you use it?',
      a: "Quorum commit (synchronous_standby_names='ANY k (s1,s2,...,sN)') requires only k of N standbys to confirm before the primary commits. This tolerates up to N-k slow or offline standbys while still guaranteeing k durable copies. Useful in multi-AZ deployments: ANY 1 (az1-standby, az2-standby) means one AZ can be completely offline without blocking writes.",
    },
    {
      q: 'How does Patroni prevent split-brain during a failover?',
      a: 'Patroni uses a distributed lock in the DCS (etcd/Consul). Only the node holding the leader key may act as primary. When the DCS TTL expires (primary stopped renewing), candidates race to acquire the lock. The winner promotes itself; the old primary (if it recovers) sees the lock is gone and immediately demotes itself to standby. This is a fencing mechanism at the coordination layer — no node can be primary without holding the DCS lock.',
    },
  ]);
}

export function mount(container) {
  const shell = createModuleShell(container, {
    tag: 'Distributed',
    title: 'Synchronous Replication',
    subtitle: 'PostgreSQL streaming replication, Patroni HA, and the durability vs availability trade-off.',
    tabs: [
      { id:'anim',   label:'Sequence Diagram' },
      { id:'config', label:'PG Config' },
      { id:'iq',     label:'Interview Q&A' },
    ],
  });
  const { tabs, body } = shell;
  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:360px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);
      const steps = SR_STEPS.map((s, i) => ({ label: s.label, duration: 2200, mutate: st => { st.idx = i; } }));
      const engine = new SimulationEngine({
        initialState: { idx: 0 }, steps,
        onRender: (state, cnv) => {
          const c = cnv.getContext('2d'), pr = window.devicePixelRatio || 1;
          cnv.width = cnv.clientWidth * pr; cnv.height = cnv.clientHeight * pr; c.scale(pr, pr);
          drawSR(c, state.idx, cnv.clientWidth, cnv.clientHeight);
        },
      });
      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));
      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);
      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = SR_STEPS[i].desc; });
      desc.textContent = SR_STEPS[0].desc;
      return () => engine.destroy();
    },
    config: renderConfig,
    iq:     renderIQ,
  });
  return null;
}
