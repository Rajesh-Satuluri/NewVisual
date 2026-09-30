import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

/* ── Data ────────────────────────────────────────────────────────────────────*/
// Show eventual consistency with asynchronous replication
// 3 replicas. Client writes to R1; R2 and R3 lag.

const EC_STEPS = [
  {
    phase: 'initial',
    r1: { val: 'qty=100', fresh: true,  age: 0 },
    r2: { val: 'qty=100', fresh: true,  age: 0 },
    r3: { val: 'qty=100', fresh: true,  age: 0 },
    writeAt: null, readReplica: null, stale: false,
    desc: 'Initial state: all 3 replicas agree — qty=100 for product P42. Replication lag is 0. This is a consistent state — any replica can serve a correct read.',
  },
  {
    phase: 'write',
    r1: { val: 'qty=99', fresh: true,  age: 0 },
    r2: { val: 'qty=100', fresh: false, age: 50 },
    r3: { val: 'qty=100', fresh: false, age: 50 },
    writeAt: 'R1', readReplica: null, stale: false,
    desc: 'Client A buys one unit — qty decremented to 99. Write lands on R1 (primary). R2 and R3 haven\'t received the WAL record yet — they still show qty=100. At this instant, reads from R2 or R3 will return stale data (50ms replication lag).',
  },
  {
    phase: 'stale_read',
    r1: { val: 'qty=99', fresh: true,  age: 0 },
    r2: { val: 'qty=100', fresh: false, age: 50 },
    r3: { val: 'qty=100', fresh: false, age: 50 },
    writeAt: 'R1', readReplica: 'R2', stale: true,
    desc: 'STALE READ: Client B reads product P42 from R2 (load balancer directed them here). Gets qty=100 — the old value. Client B sees inventory that doesn\'t reflect Client A\'s purchase. This is an eventual consistency anomaly: stale read within the replication lag window.',
  },
  {
    phase: 'propagate',
    r1: { val: 'qty=99', fresh: true,  age: 0 },
    r2: { val: 'qty=99', fresh: true,  age: 0 },
    r3: { val: 'qty=99', fresh: true,  age: 10 },
    writeAt: 'R1', readReplica: null, stale: false,
    desc: 'WAL record propagates. R2 receives and applies the change — now shows qty=99. R3 is close behind (10ms lag). The system is converging. Given no further writes, all replicas will reach the same state — eventual consistency.',
  },
  {
    phase: 'converged',
    r1: { val: 'qty=99', fresh: true, age: 0 },
    r2: { val: 'qty=99', fresh: true, age: 0 },
    r3: { val: 'qty=99', fresh: true, age: 0 },
    writeAt: null, readReplica: null, stale: false,
    desc: 'CONVERGED: all replicas agree on qty=99. Eventual consistency fulfilled — given no further writes and enough time, all replicas reach the same state. The convergence time is bounded by replication lag (typically 50–500ms for same-region async replication).',
  },
  {
    phase: 'conflict',
    r1: { val: 'qty=98', fresh: true,  age: 0 },
    r2: { val: 'qty=97', fresh: false, age: 80 },
    r3: { val: 'qty=100', fresh: false, age: 110 },
    writeAt: 'R1',
    conflict: true,
    desc: 'CONCURRENT WRITES: While R2/R3 haven\'t caught up, another write (qty=97) lands. Now three different values exist simultaneously. Resolution strategy: Last Write Wins (by timestamp) picks qty=97 as the latest. Or: store all versions and let the application resolve — DynamoDB\'s "siblings" approach.',
  },
];

/* ── Canvas ──────────────────────────────────────────────────────────────────*/
function drawEC(ctx, stepIdx, w, h) {
  const step = EC_STEPS[stepIdx];
  ctx.clearRect(0, 0, w, h);

  const replicas = [
    { id:'R1', x: 0.2, label:'Primary', data: step.r1 },
    { id:'R2', x: 0.5, label:'Replica 1', data: step.r2 },
    { id:'R3', x: 0.8, label:'Replica 2', data: step.r3 },
  ];

  const nodeY = h * 0.45;
  const nodeW = 120, nodeH = 72;

  replicas.forEach(r => {
    const rx = r.x * w - nodeW / 2;
    const d = r.data;
    const isWrite = step.writeAt === r.id;
    const isRead  = step.readReplica === r.id;
    const isFresh = d.fresh;

    const col = isRead && step.stale ? '#EF4444' : (isFresh ? '#10B981' : '#F59E0B');

    ctx.fillStyle = col + '22'; ctx.strokeStyle = col;
    ctx.lineWidth = (isWrite || isRead) ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(rx, nodeY - nodeH / 2, nodeW, nodeH, 6); ctx.fill(); ctx.stroke();

    ctx.fillStyle = col; ctx.font = '700 9px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(r.id + ' — ' + r.label, r.x * w, nodeY - nodeH / 2 + 16);
    ctx.fillStyle = '#E2E8F0'; ctx.font = '700 11px monospace';
    ctx.fillText(d.val, r.x * w, nodeY + 4);
    ctx.fillStyle = '#64748B'; ctx.font = '8px system-ui';
    ctx.fillText(d.age === 0 ? 'lag: 0ms ✓' : `lag: ${d.age}ms`, r.x * w, nodeY + 18);

    if (isWrite) {
      ctx.fillStyle = '#10B981'; ctx.font = '700 8px system-ui';
      ctx.fillText('← WRITE', r.x * w, nodeY - nodeH / 2 - 8);
    }
    if (isRead) {
      const readCol = step.stale ? '#EF4444' : '#10B981';
      ctx.fillStyle = readCol; ctx.font = '700 8px system-ui';
      ctx.fillText(step.stale ? '← READ (STALE)' : '← READ', r.x * w, nodeY + nodeH / 2 + 14);
    }
  });

  // Replication arrows (R1 → R2 → R3)
  for (let i = 0; i < 2; i++) {
    const fromX = replicas[i].x * w + nodeW / 2 - nodeW / 2 + nodeW;
    const toX   = replicas[i + 1].x * w - nodeW / 2;
    const arrowY = nodeY;
    const isLagged = !replicas[i + 1].data.fresh;
    ctx.strokeStyle = isLagged ? '#475569' : '#10B981';
    ctx.lineWidth = 1;
    ctx.setLineDash(isLagged ? [4, 4] : []);
    ctx.beginPath(); ctx.moveTo(fromX, arrowY); ctx.lineTo(toX, arrowY); ctx.stroke();
    ctx.setLineDash([]);
    if (!isLagged) {
      ctx.fillStyle = '#10B981';
      ctx.beginPath(); ctx.moveTo(toX, arrowY); ctx.lineTo(toX - 6, arrowY - 4); ctx.lineTo(toX - 6, arrowY + 4); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#475569'; ctx.font = '7px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(isLagged ? 'WAL lagging…' : 'WAL ✓', (fromX + toX) / 2, arrowY - 8);
  }

  // Convergence status
  const allFresh = replicas.every(r => r.data.fresh);
  const statusY = h - 24;
  ctx.fillStyle = allFresh ? '#071C10' : '#1C0A0A';
  ctx.strokeStyle = allFresh ? '#10B981' : '#F59E0B'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(w / 2 - 100, statusY - 12, 200, 22, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = allFresh ? '#10B981' : '#F59E0B'; ctx.font = '700 8.5px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(allFresh ? 'CONVERGED — all replicas consistent' : step.conflict ? 'CONFLICT — concurrent writes unresolved' : 'DIVERGED — replication lag', w / 2, statusY + 2);
  ctx.textAlign = 'left';
}

/* ── Strategies tab ──────────────────────────────────────────────────────────*/
function renderStrategiesTab(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-family:system-ui;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="margin:0 0 14px;color:#E2E8F0;font-size:15px">Consistency Models (Weakest → Strongest)</h3>
  <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:20px">
    <thead><tr style="background:#0F172A"><th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Model</th><th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Guarantee</th><th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Example</th></tr></thead>
    <tbody>
      ${[
        ['Eventual','Given no new writes, all replicas converge to same value (no time bound)','Cassandra ONE, DynamoDB default'],
        ['Monotonic Read','Once you read value V, you never read a value older than V from the same session','Session-pinned replica reads'],
        ['Read Your Writes','After a client writes, its subsequent reads see the write','Sticky session to primary after write'],
        ['Consistent Prefix','Reads see a prefix of the write history — no gaps, but may be stale','Some KV stores'],
        ['Bounded Staleness','Reads see data at most T seconds old or K versions stale','Azure Cosmos DB option'],
        ['Strong/Linearizable','Every read sees the most recent write — as if there is one copy','PostgreSQL primary reads, etcd'],
      ].map(([m,g,e]) => `<tr style="border-bottom:1px solid #0F172A">
        <td style="padding:7px 10px;color:#F59E0B">${m}</td>
        <td style="padding:7px 10px;font-size:11.5px">${g}</td>
        <td style="padding:7px 10px;color:#94A3B8;font-size:11px">${e}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <h3 style="margin:0 0 12px;color:#E2E8F0;font-size:15px">Conflict Resolution Strategies</h3>
  ${[
    { name:'Last Write Wins (LWW)', col:'#4F46E5', body:'Each write has a timestamp. On conflict, the higher timestamp wins. Simple, but requires clock synchronization. Clock skew can cause a "later" write (lower physical clock) to lose. Used in Cassandra, DynamoDB.' },
    { name:'Multi-Value / Siblings', col:'#10B981', body:'Store all conflicting versions. Surface the conflict to the application, which must merge them (e.g., merge two shopping carts by taking the union of items). Used in Riak, original DynamoDB design.' },
    { name:'CRDTs', col:'#F59E0B', body:'Conflict-free Replicated Data Types — data structures (counters, sets, maps) with merge functions that are commutative, associative, and idempotent. Concurrent increments to a counter are always safely merged by summing. No conflict possible. Used in Redis, Riak, collaborative editing.' },
  ].map(s => `<div style="border-left:3px solid ${s.col};padding-left:12px;margin-bottom:12px">
    <h4 style="margin:0 0 4px;color:${s.col};font-size:12px">${s.name}</h4>
    <p style="margin:0;font-size:11.5px">${s.body}</p>
  </div>`).join('')}
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'What does "eventually consistent" actually mean, and what it does NOT guarantee?',
      a: `Eventual consistency guarantees: if no new writes are made to a key, all replicas will <em>eventually</em> converge to the same value. That is all — there is no bound on how long convergence takes, and no guarantee about what is seen during the convergence window.<br><br>
What eventual consistency does NOT guarantee: (1) a read immediately after a write sees that write; (2) reads are monotonically increasing (you could read v=5, then v=3 from a different replica); (3) concurrent writes produce a deterministic result without additional conflict resolution; (4) the converged value is the "correct" value if multiple clients wrote concurrently (one will win, based on LWW or similar).<br><br>
The term is also frequently misused — a system claiming "eventual consistency" might provide much stronger guarantees (like monotonic reads or read-your-writes) or much weaker ones (genuine chance of permanent divergence if the conflict resolution is broken). Always ask: what is the convergence mechanism, and what happens during concurrent writes?`,
    },
    {
      q: 'How do you implement "read your own writes" with an eventually consistent database?',
      a: `"Read your own writes" (also called "read your writes") means: after a client successfully writes a value, its subsequent reads always see that value, even if the read goes to a different replica.<br><br>
Implementation options: (1) <strong>Session affinity (sticky routing)</strong>: route all reads and writes from the same client session to the same replica. Simple but reduces read scalability. (2) <strong>Read from primary after write</strong>: for a short window (e.g., 1 second) after a write, route the client's reads to the primary. After the window, stale replica reads are acceptable. (3) <strong>Write token</strong>: the write returns a "write token" (LSN, timestamp, or version). The client includes this token in subsequent reads. The replica checks if it has applied writes up to the token before responding — if not, it waits or routes to the primary. (4) <strong>Quorum reads</strong>: always read from W nodes (majority) where W+R>N — guaranteed to hit a node that has the write. Cassandra implements this with QUORUM consistency level.`,
    },
    {
      q: 'What is a CRDT and why can it achieve eventual consistency without conflict resolution?',
      a: `A CRDT (Conflict-free Replicated Data Type) is a data type with a merge operation that satisfies three mathematical properties: (1) <strong>Commutativity</strong>: merge(A, B) = merge(B, A) — order of merging doesn't matter. (2) <strong>Associativity</strong>: merge(merge(A,B), C) = merge(A, merge(B,C)). (3) <strong>Idempotency</strong>: merge(A, A) = A — merging a duplicate is a no-op.<br><br>
These three properties mean that no matter what order replicas receive updates or merge with each other, they always reach the same final state — no conflict resolution needed. Examples: (1) <strong>G-Counter (Grow-only counter)</strong>: each node has its own slot; increment only increments your slot; global value = sum of all slots. Concurrent increments on different replicas: merge by taking element-wise max, then sum. (2) <strong>LWW-Register</strong>: stores (value, timestamp); merge takes the higher-timestamp value — technically a CRDT but reintroduces the LWW conflict. (3) <strong>OR-Set</strong>: supports add and remove; uses unique tags so concurrent add + remove of the same element is resolved in favor of add. CRDTs are used in Redis (HLL, sorted sets), Google Docs (text editing), and Riak.`,
    },
  ]);
}

export function mount(container) {
  const shell = createModuleShell(container, {
    tag: 'Distributed',
    title: 'Eventual Consistency',
    subtitle: 'Replication lag, stale reads, convergence, conflict resolution — from eventual to linearizable consistency models',
    tabs: [
      { id:'anim',       label:'Replication Lag' },
      { id:'strategies', label:'Consistency Models' },
      { id:'iq',         label:'Interview Q&A' },
    ],
  });
  const { tabs, body } = shell;
  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:340px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);
      const steps = EC_STEPS.map((s, i) => ({ label: `Step ${i + 1}`, duration: 2800, mutate: st => { st.stepIdx = i; } }));
      const engine = new SimulationEngine({
        initialState: { stepIdx: 0 }, steps,
        onRender: (state, cnv) => {
          const ctx = cnv.getContext('2d'), pr = window.devicePixelRatio || 1;
          cnv.width = cnv.clientWidth * pr; cnv.height = cnv.clientHeight * pr; ctx.scale(pr, pr);
          drawEC(ctx, state.stepIdx, cnv.clientWidth, cnv.clientHeight);
        },
      });
      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));
      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);
      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = EC_STEPS[i].desc; });
      desc.textContent = EC_STEPS[0].desc;
      return () => engine.destroy();
    },
    strategies: renderStrategiesTab,
    iq:         renderIQ,
  });
  return null;
}
