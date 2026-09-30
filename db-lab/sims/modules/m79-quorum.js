import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

// Distributed locks: fencing tokens, Redlock, etcd lease
const DL_STEPS = [
  {
    label: 'Why Locks Fail',
    desc: 'A distributed lock seems simple: only one process holds it at a time. But network pauses, GC stops, and clock skew can cause a process to believe it holds a valid lock while the lock has already expired and been granted to another process.',
    phase: 'problem',
  },
  {
    label: 'Fencing Token',
    desc: 'Every time a lock is granted, the lock server issues a monotonically increasing token. The resource server rejects any request with a token ≤ the highest token it has already seen. A stale lock holder\'s requests are safely rejected.',
    phase: 'fencing',
  },
  {
    label: 'etcd Lease',
    desc: 'etcd grants a lease with a TTL. The lock holder must renew the lease before expiry. If it fails to renew (crash/pause), the lease expires and another process can acquire the lock. etcd uses Raft — the grant is durably committed.',
    phase: 'etcd',
  },
  {
    label: 'Redlock (Redis)',
    desc: 'Martin Kleppmann\'s analysis: Redlock acquires locks on N independent Redis nodes. A lock is "acquired" if a majority respond. Works under partial failures but is unsafe under clock skew and GC pauses — fencing tokens are still required.',
    phase: 'redlock',
  },
  {
    label: 'Lock Contention',
    desc: 'Multiple clients race for the lock. With exponential backoff + jitter, contention resolves quickly. Without jitter, clients retry in lockstep causing thundering-herd storms on the lock server.',
    phase: 'contention',
  },
];

const N_REDIS = 5; // Redlock nodes

function drawDL(ctx, idx, w, h) {
  const step = DL_STEPS[idx];
  ctx.clearRect(0, 0, w, h);
  const { phase } = step;

  function roundRect(x, y, bw, bh, r, fill, stroke) {
    ctx.beginPath(); ctx.roundRect(x, y, bw, bh, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
  }

  function label(text, x, y, col, size) {
    ctx.fillStyle = col; ctx.font = `${size || 11}px system-ui`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y);
  }

  function arrow(fx, fy, tx, ty, col, text) {
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty);
    ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
    const angle = Math.atan2(ty - fy, tx - fx);
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx - 9 * Math.cos(angle - 0.4), ty - 9 * Math.sin(angle - 0.4));
    ctx.lineTo(tx - 9 * Math.cos(angle + 0.4), ty - 9 * Math.sin(angle + 0.4));
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
    if (text) {
      ctx.fillStyle = col; ctx.font = '10px system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(text, (fx + tx) / 2, Math.min(fy, ty) - 3);
    }
  }

  if (phase === 'problem') {
    // Process A holds lock, GC pause, lock expires, process B gets lock, A resumes
    const ay = h * 0.28, by = h * 0.55, ly = h * 0.42;
    const x1 = w * 0.1, x2 = w * 0.5, x3 = w * 0.85;
    // Lock server
    roundRect(x2 - 55, ly - 18, 110, 36, 6, '#1E293B', '#4F46E5');
    label('Lock Server', x2, ly, '#818CF8', 12);
    // Process A - gets lock
    roundRect(x1 - 45, ay - 16, 90, 32, 5, '#10B98133', '#10B981');
    label('Process A', x1, ay, '#10B981', 11);
    arrow(x1, ay + 16, x2 - 55, ly, '#10B981', 'acquire');
    // GC pause box
    roundRect(x1 - 45, ay + 50, 90, 28, 5, '#EF444433', '#EF4444');
    label('GC PAUSE', x1, ay + 64, '#EF4444', 10);
    label('lock expires!', x2, ly + 30, '#EF4444', 10);
    // Process B gets lock
    roundRect(x3 - 45, by - 16, 90, 32, 5, '#4F46E533', '#4F46E5');
    label('Process B', x3, by, '#4F46E5', 11);
    arrow(x3, by + 16, x2 + 55, ly, '#4F46E5', 'acquire → OK');
    // A resumes, writes anyway!
    ctx.setLineDash([5, 4]);
    arrow(x1, ay + 80, x3 - 45, by, '#EF4444', '⚠ A writes (stale lock)!');
    ctx.setLineDash([]);
  }

  if (phase === 'fencing') {
    const lx = w * 0.5, ly = h * 0.5;
    const aX = w * 0.15, bX = w * 0.82, storX = w * 0.5;
    roundRect(lx - 60, 20, 120, 36, 6, '#1E293B', '#4F46E5');
    label('Lock Server', lx, 38, '#818CF8', 12);
    // Token
    roundRect(lx - 40, 66, 80, 22, 4, '#F59E0B33', '#F59E0B');
    label('token = 34', lx, 77, '#F59E0B', 10);
    // Process A
    roundRect(aX - 40, ly - 18, 80, 32, 5, '#10B98133', '#10B981');
    label('Proc A (token 33)', aX, ly, '#10B981', 9);
    // Process B
    roundRect(bX - 40, ly - 18, 80, 32, 5, '#4F46E533', '#4F46E5');
    label('Proc B (token 34)', bX, ly, '#4F46E5', 9);
    // Storage
    roundRect(storX - 60, ly + 60, 120, 36, 6, '#0F172A', '#334155');
    label('Storage (max seen: 34)', storX, ly + 78, '#94A3B8', 9);
    arrow(aX, ly + 14, storX - 60, ly + 78, '#EF4444', 'write, token=33 → ✗ REJECTED');
    arrow(bX, ly + 14, storX + 60, ly + 78, '#10B981', 'write, token=34 → ✓ OK');
  }

  if (phase === 'etcd') {
    const ex = w * 0.5, ey = h * 0.3;
    roundRect(ex - 70, ey - 24, 140, 48, 8, '#1E293B', '#10B981');
    label('etcd cluster', ex, ey, '#10B981', 13);
    label('(Raft committed)', ex, ey + 16, '#94A3B8', 9);
    // lease
    const lx = w * 0.2, ly = h * 0.68;
    roundRect(lx - 55, ly - 18, 110, 36, 5, '#4F46E533', '#4F46E5');
    label('Lock Holder', lx, ly, '#4F46E5', 11);
    label('lease TTL: 5s', lx, ly + 14, '#94A3B8', 9);
    arrow(lx, ly - 18, ex - 70, ey + 24, '#4F46E5', 'KeepAlive / renew');
    // TTL bar
    const bx = w * 0.55, by = h * 0.68;
    ctx.fillStyle = '#0F172A'; ctx.beginPath(); ctx.roundRect(bx, by - 10, 120, 18, 3); ctx.fill();
    ctx.fillStyle = '#10B981'; ctx.beginPath(); ctx.roundRect(bx, by - 10, 84, 18, 3); ctx.fill();
    label('TTL 70%', bx + 60, by, '#fff', 9);
    label('Lease expires → lock released → new grant', ex, h - 20, '#94A3B8', 10);
  }

  if (phase === 'redlock') {
    const ry = h * 0.3, spacing = w / (N_REDIS + 1);
    const cy = h * 0.7;
    // client
    roundRect(w / 2 - 50, 14, 100, 28, 5, '#818CF833', '#818CF8');
    label('Client', w / 2, 28, '#818CF8', 11);
    // Redis nodes
    const xs = [];
    for (let i = 0; i < N_REDIS; i++) {
      const x = spacing * (i + 1);
      xs.push(x);
      const granted = i < 3; // majority
      roundRect(x - 34, ry - 20, 68, 40, 6, granted ? '#10B98133' : '#EF444433', granted ? '#10B981' : '#EF4444');
      label(`R${i + 1}`, x, ry, granted ? '#10B981' : '#EF4444', 11);
      label(granted ? 'OK' : 'ERR', x, ry + 16, granted ? '#10B981' : '#EF4444', 9);
      arrow(w / 2, 42, x, ry - 20, '#818CF855', '');
    }
    // Quorum badge
    roundRect(w / 2 - 70, cy - 18, 140, 36, 6, '#F59E0B33', '#F59E0B');
    label('3/5 OK → Quorum', w / 2, cy, '#F59E0B', 11);
    label('✓ Lock acquired', w / 2, cy + 16, '#10B981', 10);
    // Warning
    label('⚠ Still requires fencing tokens for safety', w / 2, h - 18, '#EF4444', 10);
  }

  if (phase === 'contention') {
    // Multiple clients, one lock
    const clients = ['Client A', 'Client B', 'Client C'];
    const cy = [h * 0.25, h * 0.50, h * 0.72];
    const lx = w * 0.72, ly = h * 0.5;
    roundRect(lx - 60, ly - 22, 120, 44, 8, '#1E293B', '#4F46E5');
    label('Lock Server', lx, ly, '#818CF8', 12);
    clients.forEach((c, i) => {
      const x = w * 0.18, y = cy[i];
      const col = ['#10B981','#F59E0B','#EF4444'][i];
      roundRect(x - 44, y - 16, 88, 32, 5, col + '33', col);
      label(c, x, y, col, 11);
      ctx.setLineDash(i === 0 ? [] : [5, 4]);
      arrow(x + 44, y, lx - 60, ly + (i - 1) * 12, col, i === 0 ? 'holds lock' : `retry (backoff ${[0,120,360][i]}ms)`);
      ctx.setLineDash([]);
    });
    label('Exponential backoff + jitter prevents thundering herd', w / 2, h - 18, '#94A3B8', 10);
  }

  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

function renderTable(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="color:#E2E8F0;margin:0 0 14px">Distributed Lock Implementations</h3>
  <div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead>
        <tr style="background:#1E293B">
          <th style="padding:8px 12px;text-align:left;color:#94A3B8;border-bottom:1px solid #334155">System</th>
          <th style="padding:8px 12px;text-align:left;color:#94A3B8;border-bottom:1px solid #334155">Mechanism</th>
          <th style="padding:8px 12px;text-align:left;color:#94A3B8;border-bottom:1px solid #334155">Safety</th>
          <th style="padding:8px 12px;text-align:left;color:#94A3B8;border-bottom:1px solid #334155">Notes</th>
        </tr>
      </thead>
      <tbody>
        ${[
          ['etcd','Raft consensus + lease TTL','Strong — Raft guarantees','Used by Kubernetes, Patroni'],
          ['ZooKeeper','Ephemeral znodes + sessions','Strong — ZAB protocol','Curator recipes'],
          ['Redis Redlock','Majority quorum over N nodes','Weak — unsafe w/o fencing','Controversial (Kleppmann)'],
          ['PostgreSQL advisory','pg_try_advisory_lock()','Strong within one cluster','Single-node only'],
          ['DynamoDB','Conditional writes (version)','Strong within DynamoDB','No TTL-based expiry'],
        ].map(([sys,...vals]) => `
          <tr style="border-bottom:1px solid #1E293B">
            <td style="padding:8px 12px;font-weight:600;color:#E2E8F0">${sys}</td>
            ${vals.map(v => `<td style="padding:8px 12px;color:#94A3B8">${v}</td>`).join('')}
          </tr>`).join('')}
      </tbody>
    </table>
  </div>
  <div style="margin-top:16px;background:#172554;border-left:3px solid #F59E0B;padding:12px 16px;border-radius:0 6px 6px 0;font-size:12px">
    <strong style="color:#F59E0B">Key insight:</strong> A distributed lock can never fully prevent two processes from simultaneously believing they hold the lock (GC pauses, network delays).
    Fencing tokens shift the safety guarantee to the <em>resource server</em>, which is the right place to enforce it.
  </div>
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'Why is a distributed lock insufficient for mutual exclusion without fencing tokens?',
      a: 'A process can hold a valid lock, pause (GC stop-the-world, OS scheduling, network timeout), and resume after the lock has already expired and been re-granted to another process. Without fencing tokens, both processes believe they hold the lock and both write — corruption. Fencing tokens give the resource server a way to reject stale requests from the old lock holder even after it resumes, using a monotonically increasing token that the storage layer enforces.',
    },
    {
      q: 'What is the controversy around Redis Redlock?',
      a: 'Martin Kleppmann argued (2016) that Redlock is unsafe under realistic failure modes: (1) if a Redis node crashes after granting a lock and restarts without persistence, it can grant the same lock again before the original TTL expires; (2) GC pauses or slow networks can cause a process to resume after its lock TTL expired while still believing it holds the lock; (3) Redlock requires synchronized clocks, but clock skew on commodity hardware invalidates the TTL calculations. The counter-argument (Antirez) is that these scenarios are extreme and practical systems can tolerate them. The consensus: use etcd or ZooKeeper when strong safety is required; use Redlock only with fencing tokens added.',
    },
    {
      q: 'How do you prevent thundering herd on a distributed lock?',
      a: 'Thundering herd occurs when many clients lose a lock simultaneously and all retry at the same instant. Solution: exponential backoff with jitter. Base delay doubles on each attempt (1s → 2s → 4s → …), and a random jitter (e.g. ±50% of the base delay) spreads retries over the full window. This distributes retry load across time, reducing lock-server spike. etcd\'s Watch mechanism (notify on lock release rather than polling) further eliminates the herd entirely — clients are woken individually.',
    },
  ]);
}

export function mount(container) {
  const shell = createModuleShell(container, {
    tag: 'Distributed',
    title: 'Distributed Locks',
    subtitle: 'Fencing tokens, etcd leases, Redlock, and safe mutual exclusion in distributed systems.',
    tabs: [
      { id:'anim',  label:'Visualisation' },
      { id:'table', label:'Implementations' },
      { id:'iq',    label:'Interview Q&A' },
    ],
  });
  const { tabs, body } = shell;
  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:340px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);
      const steps = DL_STEPS.map((s, i) => ({ label: s.label, duration: 2200, mutate: st => { st.idx = i; } }));
      const engine = new SimulationEngine({
        initialState: { idx: 0 }, steps,
        onRender: (state, cnv) => {
          const c = cnv.getContext('2d'), pr = window.devicePixelRatio || 1;
          cnv.width = cnv.clientWidth * pr; cnv.height = cnv.clientHeight * pr; c.scale(pr, pr);
          drawDL(c, state.idx, cnv.clientWidth, cnv.clientHeight);
        },
      });
      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));
      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);
      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = DL_STEPS[i].desc; });
      desc.textContent = DL_STEPS[0].desc;
      return () => engine.destroy();
    },
    table: renderTable,
    iq:    renderIQ,
  });
  return null;
}
