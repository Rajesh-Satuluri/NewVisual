import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

// Topic: Strong Consistency implementations — ZooKeeper, etcd, Google Spanner
const SC_STEPS = [
  {
    label: 'What Strong Consistency Means',
    desc: 'Strong consistency (linearizability) guarantees that every read reflects the most recent write, regardless of which node handles the request. Clients see a single coherent copy of the data.',
    phase: 'definition',
  },
  {
    label: 'ZooKeeper Write Path',
    desc: 'All writes go through the ZooKeeper leader via a two-phase atomic broadcast (ZAB). The leader proposes the change, a quorum of followers acknowledges it, and the leader commits — then broadcasts the commit to all nodes.',
    phase: 'zk_write',
  },
  {
    label: 'ZooKeeper Read Path',
    desc: 'Reads in ZooKeeper are served locally by any node — no quorum needed — trading a bit of freshness. Use sync() before a read to force the follower to catch up to the leader\'s latest committed transaction (sync-read is linearizable).',
    phase: 'zk_read',
  },
  {
    label: 'etcd (Raft) Write',
    desc: 'etcd uses Raft. The leader writes the entry to its log, replicates to a majority, and only then applies + returns. Every etcd node serves linearizable reads by contacting the leader for a lease confirmation before responding.',
    phase: 'etcd_write',
  },
  {
    label: 'Spanner TrueTime',
    desc: 'Google Spanner achieves external consistency (stronger than linearizability) using TrueTime GPS+atomic-clock intervals. Before a commit, Spanner waits until the commit timestamp is in the past according to TrueTime — ensuring no subsequent transaction can have an earlier timestamp.',
    phase: 'spanner',
  },
];

function drawSC(ctx, idx, w, h) {
  const step = SC_STEPS[idx];
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
  function arrow(fx, fy, tx, ty, col, lbl) {
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty);
    ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
    const ang = Math.atan2(ty - fy, tx - fx);
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx - 9 * Math.cos(ang - 0.4), ty - 9 * Math.sin(ang - 0.4));
    ctx.lineTo(tx - 9 * Math.cos(ang + 0.4), ty - 9 * Math.sin(ang + 0.4));
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
    if (lbl) {
      ctx.fillStyle = col; ctx.font = '9px system-ui';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(lbl, (fx + tx) / 2, Math.min(fy, ty) - 3);
    }
  }

  if (phase === 'definition') {
    // Two worlds side by side
    const lx = w * 0.25, rx = w * 0.75, ty = h * 0.22;
    roundRect(lx - 80, ty - 16, 160, 36, 6, '#EF444422', '#EF4444');
    textC('Eventual Consistency', lx, ty, '#EF4444', 11, true);
    textC('Reads may return stale data', lx, ty + 20, '#EF4444', 9, false);
    roundRect(rx - 80, ty - 16, 160, 36, 6, '#10B98122', '#10B981');
    textC('Strong Consistency', rx, ty, '#10B981', 11, true);
    textC('All reads reflect latest write', rx, ty + 20, '#10B981', 9, false);
    // Timeline with operations
    const tl = h * 0.55;
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(w * 0.05, tl); ctx.lineTo(w * 0.45, tl); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w * 0.55, tl); ctx.lineTo(w * 0.95, tl); ctx.stroke();
    [['w(x=1)',0.10,'#10B981'],['r(x)→?',0.22,'#EF4444'],['r(x)→1',0.34,'#F59E0B']].forEach(([op,pos,col]) => {
      roundRect(lx * (pos / 0.25) - 30, tl - 14, 60, 28, 4, col + '33', col);
      textC(op, lx * (pos / 0.25), tl, col, 9, false);
    });
    [['w(x=1)',0.60,'#10B981'],['r(x)→1',0.72,'#10B981'],['r(x)→1',0.85,'#10B981']].forEach(([op,pos,col]) => {
      roundRect(w * pos - 30, tl - 14, 60, 28, 4, col + '33', col);
      textC(op, w * pos, tl, col, 9, false);
    });
  }

  if (phase === 'zk_write') {
    const ldr = w * 0.50, f1 = w * 0.20, f2 = w * 0.80;
    const topY = h * 0.15;
    roundRect(ldr - 50, topY, 100, 34, 6, '#4F46E533', '#4F46E5');
    textC('Leader (ZK)', ldr, topY + 17, '#4F46E5', 11, true);
    [[f1,'Follower 1'],[f2,'Follower 2']].forEach(([x, l]) => {
      roundRect(x - 46, topY, 92, 34, 6, '#1E293B', '#334155');
      textC(l, x, topY + 17, '#94A3B8', 10, false);
    });
    // Phase 1: propose
    const y1 = topY + 60;
    arrow(ldr, topY + 34, f1, y1, '#F59E0B', 'PROPOSE');
    arrow(ldr, topY + 34, f2, y1, '#F59E0B', 'PROPOSE');
    // Phase 2: ACK
    const y2 = y1 + 40;
    arrow(f1, y1, ldr, y2, '#10B981', 'ACK');
    arrow(f2, y1, ldr, y2, '#10B981', 'ACK');
    // Commit broadcast
    const y3 = y2 + 44;
    roundRect(ldr - 46, y2 + 8, 92, 22, 4, '#10B98133', '#10B981');
    textC('Quorum → COMMIT', ldr, y2 + 19, '#10B981', 9, true);
    arrow(ldr, y2 + 30, f1, y3, '#10B981', 'COMMIT');
    arrow(ldr, y2 + 30, f2, y3, '#10B981', 'COMMIT');
  }

  if (phase === 'zk_read') {
    const ldr = w * 0.55, fol = w * 0.20, cl = w * 0.80;
    const topY = h * 0.18;
    roundRect(ldr - 50, topY, 100, 32, 6, '#4F46E533', '#4F46E5');
    textC('Leader', ldr, topY + 16, '#4F46E5', 11, true);
    roundRect(fol - 50, topY, 100, 32, 6, '#1E293B', '#334155');
    textC('Follower', fol, topY + 16, '#94A3B8', 10, false);
    roundRect(cl - 40, topY, 80, 32, 6, '#818CF833', '#818CF8');
    textC('Client', cl, topY + 16, '#818CF8', 10, true);
    // Local read path
    const y1 = topY + 70;
    arrow(cl, topY + 32, fol, y1, '#818CF8', 'read()');
    arrow(fol, y1, cl, y1 + 36, '#F59E0B', 'v=42 (possibly stale)');
    // sync-read path
    const y2 = y1 + 90;
    arrow(cl, y1 + 46, fol, y2, '#818CF8', 'sync() + read()');
    arrow(fol, y2, ldr, y2, '#4F46E5', 'sync?');
    arrow(ldr, y2, fol, y2 + 30, '#10B981', 'latest txn id');
    arrow(fol, y2 + 40, cl, y2 + 60, '#10B981', 'v=42 ✓ (linearizable)');
  }

  if (phase === 'etcd_write') {
    const ldr = w * 0.50, f1 = w * 0.20, f2 = w * 0.80;
    const topY = h * 0.14;
    const nodeBoxes = [[ldr,'Leader (etcd)','#10B981'],[f1,'Follower 1','#4F46E5'],[f2,'Follower 2','#4F46E5']];
    nodeBoxes.forEach(([x, l, c]) => {
      roundRect(x - 52, topY, 104, 32, 6, c + '33', c);
      textC(l, x, topY + 16, c, 10, true);
    });
    // Raft log append
    const y1 = topY + 50;
    roundRect(ldr - 62, y1, 124, 22, 4, '#F59E0B33', '#F59E0B');
    textC('Append to log (index 42)', ldr, y1 + 11, '#F59E0B', 9, false);
    // Replicate
    const y2 = y1 + 40;
    arrow(ldr, y1 + 22, f1, y2 + 10, '#F59E0B', 'AppendEntries');
    arrow(ldr, y1 + 22, f2, y2 + 10, '#F59E0B', 'AppendEntries');
    // ACK
    const y3 = y2 + 50;
    arrow(f1, y2 + 10, ldr, y3, '#10B981', 'Success');
    arrow(f2, y2 + 10, ldr, y3, '#10B981', 'Success');
    // Commit
    roundRect(ldr - 60, y3 + 6, 120, 22, 4, '#10B98133', '#10B981');
    textC('Majority → COMMIT → apply', ldr, y3 + 17, '#10B981', 9, true);
  }

  if (phase === 'spanner') {
    // TrueTime interval diagram
    const cx = w * 0.5, ty = h * 0.20;
    roundRect(cx - 110, ty - 18, 220, 36, 6, '#1E293B', '#A78BFA');
    textC('Spanner TrueTime: now ∈ [T_earliest, T_latest]', cx, ty, '#A78BFA', 10, true);
    // Timeline
    const tlY = h * 0.50, tlX1 = w * 0.10, tlX2 = w * 0.88;
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(tlX1, tlY); ctx.lineTo(tlX2, tlY); ctx.stroke();
    textC('real time →', cx, tlY - 14, '#334155', 9, false);
    // Commit timestamp
    const cX = w * 0.50;
    ctx.strokeStyle = '#A78BFA'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cX, tlY - 18); ctx.lineTo(cX, tlY + 18); ctx.stroke();
    textC('T_commit', cX, tlY + 28, '#A78BFA', 9, true);
    // Uncertainty interval
    const errW = w * 0.08;
    ctx.fillStyle = '#A78BFA22';
    ctx.beginPath(); ctx.roundRect(cX - errW, tlY - 8, errW * 2, 16, 2); ctx.fill();
    ctx.strokeStyle = '#A78BFA66'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(cX - errW, tlY - 8, errW * 2, 16, 2); ctx.stroke();
    textC('±ε', cX, tlY, '#A78BFA', 8, false);
    // Wait arrow
    const wX = cX + errW;
    arrow(wX, tlY - 22, wX + 60, tlY - 22, '#10B981', 'wait until T_latest passes');
    textC('→ Commit after wait: no future txn can precede T_commit', cx, h * 0.76, '#10B981', 10, true);
    textC('GPS clocks keep ε < 7 ms globally', cx, h * 0.88, '#94A3B8', 9, false);
  }

  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

function renderSystems(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="color:#E2E8F0;margin:0 0 14px">Strong Consistency Systems</h3>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px">
    ${[
      ['ZooKeeper','ZAB (ZooKeeper Atomic Broadcast) — 2-phase broadcast, leader-based. Reads are local (stale) unless preceded by sync(). Used for config management, distributed locks (Apache Hadoop, Kafka).','#F59E0B'],
      ['etcd','Raft consensus — leader-based, all writes through leader. Linearizable reads by default (leader confirms lease). Used by Kubernetes, Patroni. Supports watch on keys.','#10B981'],
      ['Google Spanner','External consistency via TrueTime GPS+atomic clocks. Globally distributed with synchronous cross-region replication. SQL interface. Used for Google Ads, Gmail.','#A78BFA'],
      ['CockroachDB','Raft per range (16 MB partitions). Hybrid logical clocks for ordering. SQL with SERIALIZABLE isolation by default. Follower reads via closed timestamps.','#4F46E5'],
      ['FoundationDB','Ordered key-value with ACID transactions across multiple shards. Uses OCC (optimistic concurrency). Foundation for Apple iCloud and Snowflake.','#06B6D4'],
      ['TiKV','Raft per region, Percolator 2-phase commit for cross-region transactions. Backs TiDB (MySQL-compatible distributed SQL).','#EF4444'],
    ].map(([name, desc, col]) => `
      <div style="background:#0F172A;border-radius:8px;padding:14px 16px;border-left:3px solid ${col}">
        <div style="color:${col};font-weight:700;font-size:12px;margin-bottom:6px">${name}</div>
        <div style="font-size:11px;color:#94A3B8">${desc}</div>
      </div>`).join('')}
  </div>
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'Why do ZooKeeper reads not require quorum but writes do?',
      a: 'ZooKeeper prioritises read throughput: reads are served from the local follower\'s state, which is always consistent with some past committed state (but may lag the latest). This provides "read your writes" only if the client always reads from the same server that just processed its write. For a truly linearizable read, the client calls sync() first, which forces the follower to synchronise with the leader before responding — but this defeats the throughput benefit. The design accepts stale reads in exchange for O(N) read scalability instead of O(1) leader-only reads.',
    },
    {
      q: 'What is TrueTime and why does Spanner need it?',
      a: 'TrueTime is Google\'s API for global time with bounded uncertainty: it returns an interval [T_earliest, T_latest] rather than a single timestamp. Spanner uses it to assign globally unique commit timestamps. Before committing, Spanner waits until T_latest < current_real_time, ensuring the commit timestamp is unambiguously in the past. This "commit-wait" (typically < 7 ms) guarantees that no future transaction anywhere in the world can have an earlier timestamp than this commit. Without precise clocks, achieving this guarantee would require synchronous cross-datacenter rounds for every transaction.',
    },
    {
      q: 'How does CockroachDB provide linearizable reads from follower replicas?',
      a: 'CockroachDB tracks a "closed timestamp" per range: a timestamp below which no new writes can be accepted. Followers periodically advance this timestamp based on observed replication lag and hybrid logical clock synchronisation. A follower read at a timestamp ≤ closed timestamp is guaranteed safe and linearizable: all writes at or before that timestamp have been applied. Reads at current time still go to the lease holder. This enables geo-local reads from nearby replicas for read-heavy global workloads without sacrificing strong consistency.',
    },
  ]);
}

export function mount(container) {
  const shell = createModuleShell(container, {
    tag: 'Distributed',
    title: 'Strong Consistency',
    subtitle: 'ZooKeeper ZAB, etcd Raft, Google Spanner TrueTime — linearizable systems in production.',
    tabs: [
      { id:'anim',    label:'Walkthrough' },
      { id:'systems', label:'Systems' },
      { id:'iq',      label:'Interview Q&A' },
    ],
  });
  const { tabs, body } = shell;
  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:360px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);
      const steps = SC_STEPS.map((s, i) => ({ label: s.label, duration: 2200, mutate: st => { st.idx = i; } }));
      const engine = new SimulationEngine({
        initialState: { idx: 0 }, steps,
        onRender: (state, cnv) => {
          const c = cnv.getContext('2d'), pr = window.devicePixelRatio || 1;
          cnv.width = cnv.clientWidth * pr; cnv.height = cnv.clientHeight * pr; c.scale(pr, pr);
          drawSC(c, state.idx, cnv.clientWidth, cnv.clientHeight);
        },
      });
      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));
      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);
      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = SC_STEPS[i].desc; });
      desc.textContent = SC_STEPS[0].desc;
      return () => engine.destroy();
    },
    systems: renderSystems,
    iq:      renderIQ,
  });
  return null;
}
