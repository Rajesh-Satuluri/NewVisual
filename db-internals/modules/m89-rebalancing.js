import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

const STEPS = [
  {
    label: 'Balanced State',
    desc: 'Initially all 4 partitions hold ~75M rows each. Write traffic is uniform — consistent hashing distributes load evenly. The cluster is healthy.',
    phase: 'balanced',
  },
  {
    label: 'Skew Develops',
    desc: 'After 6 months of Prime Day spikes: P2 accumulated order updates (status changes) and became 2.4× larger than P0. Read latency on P2 degrades — too many rows per query.',
    phase: 'skew',
  },
  {
    label: 'Detect Hot Shard',
    desc: 'Monitoring detects P2: CPU pinned at 95%, query latency 450ms vs 40ms on other shards. Auto-rebalancer triggers. Goal: split P2 while keeping the database fully online.',
    phase: 'detect',
  },
  {
    label: 'Split Operation',
    desc: 'Online split: P2\'s key range is halved. P2a stays on node 2, P2b migrates to a new node. Data is streamed in the background. All reads/writes continue — the split is transparent.',
    phase: 'split',
  },
  {
    label: 'Rebalanced',
    desc: 'Rebalancing complete. 5 shards, each ~75M rows. Load is uniform again. The cluster can absorb the next Prime Day spike without manual intervention.',
    phase: 'done',
  },
];

// Bar chart data per phase
const PHASE_DATA = {
  balanced: [
    { label: 'P0', rows: 75, color: '#10B981' },
    { label: 'P1', rows: 75, color: '#10B981' },
    { label: 'P2', rows: 75, color: '#10B981' },
    { label: 'P3', rows: 75, color: '#10B981' },
  ],
  skew: [
    { label: 'P0', rows: 75,  color: '#10B981' },
    { label: 'P1', rows: 75,  color: '#10B981' },
    { label: 'P2', rows: 180, color: '#EF4444' },
    { label: 'P3', rows: 140, color: '#F59E0B' },
  ],
  detect: [
    { label: 'P0', rows: 75,  color: '#10B981' },
    { label: 'P1', rows: 75,  color: '#10B981' },
    { label: 'P2', rows: 180, color: '#EF4444', hot: true },
    { label: 'P3', rows: 140, color: '#F59E0B' },
  ],
  split: [
    { label: 'P0',  rows: 75, color: '#10B981' },
    { label: 'P1',  rows: 75, color: '#10B981' },
    { label: 'P2a', rows: 90, color: '#F59E0B', splitting: true },
    { label: 'P2b', rows: 90, color: '#F59E0B', splitting: true },
    { label: 'P3',  rows: 140, color: '#F59E0B' },
  ],
  done: [
    { label: 'P0',  rows: 75, color: '#10B981' },
    { label: 'P1',  rows: 75, color: '#10B981' },
    { label: 'P2a', rows: 75, color: '#10B981' },
    { label: 'P2b', rows: 75, color: '#10B981' },
    { label: 'P3',  rows: 75, color: '#10B981' },
  ],
};

function drawRebalancing(ctx, state, W, H) {
  const phase = state.phase || 'balanced';
  const bars  = PHASE_DATA[phase];

  ctx.clearRect(0, 0, W, H);

  // Helpers
  function rr(x, y, bw, bh, r, fill, stroke, lw) {
    ctx.beginPath(); ctx.roundRect(x, y, bw, bh, r);
    if (fill)   { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1.5; ctx.stroke(); }
  }
  function txt(t, x, y, col, sz, align, bold) {
    ctx.fillStyle = col;
    ctx.font = `${bold ? '700 ' : ''}${sz || 11}px system-ui`;
    ctx.textAlign = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t, x, y);
  }
  function arrow(fx, fy, tx, ty, col) {
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty);
    ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
    const ang = Math.atan2(ty - fy, tx - fx);
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx - 8 * Math.cos(ang - 0.4), ty - 8 * Math.sin(ang - 0.4));
    ctx.lineTo(tx - 8 * Math.cos(ang + 0.4), ty - 8 * Math.sin(ang + 0.4));
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  }

  // Title
  txt('Partition Load — Amazon Prime Day Orders', W / 2, 20, '#E2E8F0', 13, 'center', true);
  txt('300M+ Total Rows', W / 2, 36, '#64748B', 10, 'center', false);

  // Chart area
  const chartLeft   = 64;
  const chartRight  = W - 20;
  const chartTop    = 55;
  const chartBottom = (phase === 'detect') ? H - 130 : H - 60;
  const chartH      = chartBottom - chartTop;
  const maxRows     = 200; // axis max in millions

  // Y-axis
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(chartLeft, chartTop); ctx.lineTo(chartLeft, chartBottom); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(chartLeft, chartBottom); ctx.lineTo(chartRight, chartBottom); ctx.stroke();

  // Y-axis grid + labels
  [0, 50, 100, 150, 200].forEach(m => {
    const yy = chartBottom - (m / maxRows) * chartH;
    ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(chartLeft, yy); ctx.lineTo(chartRight, yy); ctx.stroke();
    ctx.setLineDash([]);
    txt(`${m}M`, chartLeft - 6, yy, '#64748B', 9, 'right', false);
  });
  txt('Rows', chartLeft - 14, chartTop - 8, '#64748B', 9, 'center', false);

  // Bars
  const barCount  = bars.length;
  const totalW    = chartRight - chartLeft - 20;
  const barW      = Math.min(60, totalW / barCount * 0.6);
  const gap       = totalW / barCount;

  bars.forEach((b, i) => {
    const cx    = chartLeft + 10 + gap * i + gap / 2;
    const barH2 = (b.rows / maxRows) * chartH;
    const bx    = cx - barW / 2;
    const by    = chartBottom - barH2;

    // Glow for hot bar
    if (b.hot || b.splitting) {
      ctx.shadowColor = b.color;
      ctx.shadowBlur  = 12;
    }
    rr(bx, by, barW, barH2, 4, b.color + 'CC', b.color, 1.5);
    ctx.shadowBlur = 0;

    // Split dashed line
    if (b.splitting && phase === 'split') {
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.moveTo(bx, by + barH2 / 2);
      ctx.lineTo(bx + barW, by + barH2 / 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Row count label
    txt(`${b.rows}M`, cx, by - 10, b.color, 10, 'center', true);

    // Partition label
    txt(b.label, cx, chartBottom + 14, '#CBD5E1', 10, 'center', true);

    // Traffic arrows for balanced step
    if (phase === 'balanced' || phase === 'done') {
      arrow(cx, chartTop - 28, cx, by - 18, '#10B981');
      txt('↓ write', cx, chartTop - 32, '#10B981', 8, 'center', false);
    }

    // Alert badge for hot shard
    if (b.hot) {
      rr(bx - 4, by - 40, barW + 8, 22, 4, '#EF444422', '#EF4444', 1.5);
      txt('🔥 HOT', cx, by - 29, '#EF4444', 9, 'center', true);
    }
  });

  // Monitoring panel for detect phase
  if (phase === 'detect') {
    const mpY = chartBottom + 20;
    const mpH = H - mpY - 8;
    rr(10, mpY, W - 20, mpH, 6, '#0F172A', '#334155', 1);
    txt('Monitoring', 60, mpY + 12, '#64748B', 9, 'center', false);

    const metrics = [
      { lbl:'P0', cpu:'22%', lat:'38ms', ok:true  },
      { lbl:'P1', cpu:'25%', lat:'40ms', ok:true  },
      { lbl:'P2', cpu:'95%', lat:'450ms', ok:false },
      { lbl:'P3', cpu:'60%', lat:'120ms', ok:false },
    ];
    const mw = (W - 40) / 4;
    metrics.forEach((m, i) => {
      const mx2 = 20 + i * mw + mw / 2;
      const col = m.ok ? '#10B981' : '#EF4444';
      txt(m.lbl, mx2, mpY + 14, col, 10, 'center', true);
      txt(`CPU ${m.cpu}`, mx2, mpY + 26, col, 8, 'center', false);
      txt(`Lat ${m.lat}`, mx2, mpY + 36, col, 8, 'center', false);
    });
  }

  // Progress bar for split phase
  if (phase === 'split') {
    const py = H - 46;
    rr(W * 0.2, py, W * 0.6, 20, 4, '#1E293B', '#334155', 1);
    rr(W * 0.2, py, W * 0.6 * 0.62, 20, 4, '#F59E0B88', null);
    txt('COPYING DATA  62%', W / 2, py + 10, '#F59E0B', 9, 'center', true);
  }

  // Done metrics
  if (phase === 'done') {
    const dy = H - 42;
    rr(W * 0.05, dy, W * 0.90, 26, 5, '#10B98111', '#10B981', 1.5);
    txt('All shards: CPU ≈ 30%  |  Latency ≈ 38ms  |  Uniform load  ✓', W / 2, dy + 13, '#10B981', 10, 'center', true);
  }

  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

function renderDetail(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="color:#E2E8F0;margin:0 0 14px">Partition Rebalancing Concepts</h3>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin-bottom:20px">
    ${[
      ['Why Skew Happens','Sequential keys (timestamps, auto-increment IDs) land on the same shard. Category-specific spikes (electronics during Prime Day) hit one hash bucket. Uneven object sizes (large blobs vs tiny rows) create size skew independent of request count.','#EF4444'],
      ['Online Split','Modern databases split shards while serving traffic. The shard is duplicated, traffic is double-written to both halves during the transition, then reads are gradually migrated. The split is transparent — clients see no downtime.','#4F46E5'],
      ['Consistent Hashing','Nodes sit on a ring. Each key maps to the nearest clockwise node. Adding a node only moves O(K/N) keys — far less than the O(K) movement of naive modulo hashing. Virtual nodes (vnodes) smooth out variance.','#10B981'],
      ['Rebalance Triggers','Automatic triggers: (1) shard size exceeds threshold (DynamoDB: 10 GB), (2) hot-key rate exceeds capacity limit, (3) new nodes added to cluster. Manual triggers: user-initiated pre-split before known traffic spikes.','#F59E0B'],
      ['Cost of Rebalancing','Network bandwidth for data transfer; temporary double-write overhead; coordination lock per key range during cutover. DynamoDB hides this behind adaptive capacity — rebalancing is internal and continuous.','#A78BFA'],
      ['Pre-splitting','For known skew (date ranges, product categories), pre-split at table creation time. DynamoDB allows specifying initial partition count. Avoids reactive splits under load — the most disruptive time to rebalance.','#06B6D4'],
    ].map(([t,d,col]) => `
      <div style="background:#0F172A;border-radius:8px;padding:14px 16px;border-left:3px solid ${col}">
        <div style="color:${col};font-weight:700;font-size:12px;margin-bottom:6px">${t}</div>
        <div style="font-size:11px;color:#94A3B8">${d}</div>
      </div>`).join('')}
  </div>
  <div style="background:#172554;border-left:3px solid #4F46E5;padding:12px 16px;border-radius:0 6px 6px 0;font-size:12px">
    <strong style="color:#818CF8">DynamoDB Adaptive Capacity</strong> — since 2019, DynamoDB automatically isolates
    hot items onto their own partition. A partition that consistently handles more than its provisioned share of
    throughput is split. Partitions are never merged. This means a table that was once split due to a spike will
    maintain more partitions indefinitely — worth factoring in when estimating partition-level throughput ceilings.
  </div>
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'A DynamoDB table has 4 partitions and one is getting 80% of the write traffic after a Prime Day spike. Walk through exactly what happens.',
      a: 'DynamoDB\'s adaptive capacity first attempts to absorb the skew by redistributing provisioned throughput — the hot partition temporarily borrows capacity from under-utilised neighbours. If the hot partition\'s item-level access rate still exceeds limits, DynamoDB triggers an online split: it creates two new partitions covering the hot partition\'s key range, double-writes to both during migration, then cuts over reads. The old partition is retired. The process is fully transparent to the application.',
      tip: 'Interviewers want you to mention adaptive capacity first, then split. Don\'t jump straight to "add more capacity".',
    },
    {
      q: 'What is consistent hashing and why does it minimise data movement during rebalancing?',
      a: 'Consistent hashing places both nodes and keys on a virtual ring using the same hash function. Each key is assigned to the nearest clockwise node. When a node is added, only the keys between the new node and its predecessor need to move — O(K/N) keys, where K is total keys and N is node count. Naive modulo hashing (key % N) requires remapping O(K) keys whenever N changes, which causes a thundering-herd of data movement across the whole cluster.',
      tip: 'Follow up by explaining virtual nodes (vnodes): each physical node owns multiple small arc segments, smoothing out variance in key distribution and making rebalancing more granular.',
    },
    {
      q: 'When would you pre-split partitions instead of relying on auto-splitting?',
      a: 'Pre-split when: (1) you know the access pattern in advance — e.g., a time-series table where all writes land on today\'s date partition; (2) before a planned traffic spike like Prime Day — reactive splitting under peak load is the worst time; (3) when data volume is predictable and you want to avoid the temporary throughput reduction during a mid-traffic split. Pre-splitting trades some storage overhead (empty partitions) for operational predictability.',
    },
    {
      q: 'What is a "hot partition" vs a "hot key" and how do you mitigate each?',
      a: 'A hot key is a single item (e.g., a celebrity\'s profile) that receives disproportionate reads/writes. A hot partition is a range of keys that collectively exceeds the partition\'s throughput limit. Mitigations differ: hot keys → add a random suffix (write spreading) and scatter-gather on reads, or cache the item at the application layer. Hot partitions → pre-split, increase provisioned capacity, or use DAX (DynamoDB Accelerator) to absorb read traffic without hitting the partition.',
    },
  ]);
}

export function mount(container) {
  const { tabs, body } = createModuleShell(container, {
    tag: 'Distributed',
    title: 'Partition Rebalancing',
    subtitle: 'Moving data when load skews — the operational cost of elastic scaling on Amazon Prime Day.',
    tabs: [
      { id: 'anim',   label: 'Animation' },
      { id: 'detail', label: 'Details' },
      { id: 'iq',     label: 'Interview Q&A' },
    ],
  });

  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:420px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);

      const steps = STEPS.map((s, i) => ({
        label:    s.label,
        duration: 2400,
        mutate:   st => { st.phase = s.phase; st.stepIdx = i; },
      }));

      const engine = new SimulationEngine({
        initialState: { phase: 'balanced', stepIdx: 0 },
        steps,
        onRender: (state, cnv) => {
          const pr = window.devicePixelRatio || 1;
          cnv.width  = cnv.clientWidth  * pr;
          cnv.height = cnv.clientHeight * pr;
          const ctx  = cnv.getContext('2d');
          ctx.scale(pr, pr);
          drawRebalancing(ctx, state, cnv.clientWidth, cnv.clientHeight);
        },
      });

      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));

      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);

      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = STEPS[i].desc; });
      desc.textContent = STEPS[0].desc;
      return () => engine.destroy();
    },
    detail: renderDetail,
    iq:     renderIQ,
  });
  return null;
}
