import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

const STEPS = [
  {
    label: 'Normal Traffic',
    desc: 'Pre-Prime Day: traffic distributes uniformly across 4 partitions. Each handles ~25K req/s. All within capacity (max: 40K req/s per partition).',
    phase: 'normal',
  },
  {
    label: 'Prime Day Surge',
    desc: 'Prime Day at peak: orders for popular categories (electronics=P1, home=P3) surge. P1 at 80K req/s and P3 at 90K req/s — 2× capacity. Latency spikes to seconds.',
    phase: 'surge',
  },
  {
    label: 'Detection (Metrics)',
    desc: 'Detection: per-partition CloudWatch metrics trigger alarms. DynamoDB\'s adaptive capacity detects hot keys within seconds and automatically throttles non-hot-partition requests to redistribute capacity.',
    phase: 'detect',
  },
  {
    label: 'Mitigation: Write Spreading',
    desc: 'Mitigation: add a random suffix to hot keys. "item#12345" becomes "item#12345_3", "item#12345_7", etc. Writes spread across 10 partitions. Reads must scatter-gather — an acceptable tradeoff for write-heavy hot keys.',
    phase: 'spread',
  },
  {
    label: 'Resolved',
    desc: 'Hot partition resolved. Write spreading distributed P3\'s load. Adaptive capacity shifted provisioned throughput from cold to hot partitions. System stable for the remainder of Prime Day.',
    phase: 'resolved',
  },
];

const PARTITIONS = [
  { label: 'P0', category: 'Books'        },
  { label: 'P1', category: 'Electronics'  },
  { label: 'P2', category: 'Clothing'     },
  { label: 'P3', category: 'Home'         },
];

const PHASE_RATES = {
  normal:   [25, 25, 25, 25],
  surge:    [30, 80, 28, 90],
  detect:   [30, 80, 28, 90],
  spread:   [30, 40, 28, 32],
  resolved: [28, 30, 26, 30],
};

function heat(rate) {
  if (rate >= 70) return '#EF4444';
  if (rate >= 50) return '#F97316';
  if (rate >= 40) return '#F59E0B';
  if (rate >= 30) return '#06B6D4';
  return '#10B981';
}

function drawHotPartitions(ctx, state, W, H) {
  const phase = state.phase || 'normal';
  const rates = PHASE_RATES[phase];
  const CAP   = 40; // capacity line in K req/s
  const maxR  = 100;

  ctx.clearRect(0, 0, W, H);

  function rr(x, y, bw, bh, r, fill, stroke, lw) {
    ctx.beginPath(); ctx.roundRect(x, y, bw, bh, r);
    if (fill)   { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1.5; ctx.stroke(); }
  }
  function txt(t, x, y, col, sz, align, bold) {
    ctx.fillStyle = col;
    ctx.font = `${bold ? '700 ' : ''}${sz || 11}px system-ui`;
    ctx.textAlign  = align || 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t, x, y);
  }
  function arrowDown(cx, fy, ty, col) {
    ctx.beginPath(); ctx.moveTo(cx, fy); ctx.lineTo(cx, ty);
    ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, ty);
    ctx.lineTo(cx - 5, ty - 7);
    ctx.lineTo(cx + 5, ty - 7);
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
  }

  // Title
  txt('Hot Partition Detection — Prime Day req/s per Partition', W / 2, 18, '#E2E8F0', 12, 'center', true);

  // Chart bounds
  const cL  = 56;
  const cR  = W - 16;
  const cT  = 44;
  const cBbase = (phase === 'detect') ? H - 120 : H - 52;
  const cB  = cBbase;
  const cH  = cB - cT;
  const cW  = cR - cL;

  // Grid + Y axis
  ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cL, cT); ctx.lineTo(cL, cB); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cL, cB); ctx.lineTo(cR, cB); ctx.stroke();

  [0, 25, 50, 75, 100].forEach(v => {
    const yy = cB - (v / maxR) * cH;
    ctx.setLineDash([3, 3]); ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cL, yy); ctx.lineTo(cR, yy); ctx.stroke();
    ctx.setLineDash([]);
    txt(`${v}K`, cL - 5, yy, '#64748B', 8, 'right', false);
  });

  // Capacity line
  const capY = cB - (CAP / maxR) * cH;
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(cL, capY); ctx.lineTo(cR, capY); ctx.stroke();
  ctx.setLineDash([]);
  txt('Capacity limit: 40K req/s', cL + 6, capY - 8, '#EF4444', 8, 'left', false);

  // Traffic arrows from above (surge phase)
  const surgePhase = phase === 'surge' || phase === 'detect';

  // Bars
  const barW = Math.min(55, cW / 4 * 0.6);
  const gap  = cW / 4;
  PARTITIONS.forEach((p, i) => {
    const cx   = cL + gap * i + gap / 2;
    const r    = rates[i];
    const col  = heat(r);
    const barH = (r / maxR) * cH;
    const by   = cB - barH;
    const bx   = cx - barW / 2;

    // Glow for hot
    if (r >= 70) { ctx.shadowColor = col; ctx.shadowBlur = 14; }
    rr(bx, by, barW, barH, 4, col + 'AA', col, 1.5);
    ctx.shadowBlur = 0;

    // Rate label
    txt(`${r}K`, cx, by - 10, col, 10, 'center', true);

    // Category label
    txt(p.label, cx, cB + 13, '#CBD5E1', 10, 'center', true);
    txt(p.category, cx, cB + 25, '#64748B', 8, 'center', false);

    // Traffic arrows in surge
    if (surgePhase && r > CAP) {
      const arrowCount = Math.round(r / 25);
      for (let a = 0; a < arrowCount; a++) {
        const ax = cx - 8 + a * 4;
        arrowDown(ax, cT - 20, by - 14, col);
      }
    } else if (phase === 'normal' || phase === 'resolved') {
      arrowDown(cx, cT - 18, by - 14, col);
    }

    // BREACH badge
    if (r > CAP && surgePhase) {
      rr(bx - 3, by - 34, barW + 6, 18, 3, '#EF444433', '#EF4444', 1.5);
      txt('BREACH', cx, by - 25, '#EF4444', 8, 'center', true);
    }
  });

  // Detection metrics panel
  if (phase === 'detect') {
    const mpY = cB + 14;
    const mpH = H - mpY - 8;
    rr(8, mpY, W - 16, mpH, 6, '#0F172A', '#334155', 1);
    const alarms = [
      { lbl:'P1 hot_partition=true', col:'#EF4444' },
      { lbl:'P3 throttling_enabled=true', col:'#F59E0B' },
      { lbl:'Adaptive capacity: redistributing throughput', col:'#A78BFA' },
    ];
    alarms.forEach((a, i) => {
      txt(a.lbl, W / 2 + (i - 1) * 190, mpY + mpH / 2, a.col, 9, 'center', true);
    });
  }

  // Write spreading panel
  if (phase === 'spread') {
    // Show key transformation for P3
    const bx2 = W * 0.52;
    const by2  = cT + 20;
    rr(bx2, by2, W * 0.46, 80, 6, '#0F172A', '#A78BFA', 1.5);
    txt('Write Spreading — P3 (Home)', bx2 + W * 0.23, by2 + 12, '#A78BFA', 9, 'center', true);
    txt('"item#12345"  →', bx2 + 16, by2 + 30, '#CBD5E1', 8, 'left', false);
    const suffixes = ['_0','_3','_7'];
    suffixes.forEach((s, i) => {
      txt(`"item#12345${s}"`, bx2 + 16 + i * 90, by2 + 48, '#10B981', 8, 'left', true);
    });
    txt('Reads: scatter-gather across 10 sub-keys', bx2 + W * 0.23, by2 + 66, '#64748B', 8, 'center', false);
  }

  // Resolved summary
  if (phase === 'resolved') {
    const sy = H - 40;
    rr(W * 0.05, sy, W * 0.90, 24, 4, '#10B98111', '#10B981', 1.5);
    txt('All partitions ≤ 30K req/s  |  Latency 35ms  |  System stable  ✓', W / 2, sy + 12, '#10B981', 10, 'center', true);
  }

  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

function renderDetail(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="color:#E2E8F0;margin:0 0 14px">Hot Partition — Concepts & Mitigations</h3>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin-bottom:20px">
    ${[
      ['What Causes Hot Partitions','Skewed access: a single product category (electronics on Prime Day) hashes to one partition. Sequential keys (timestamps) funnel all writes to the latest partition. Viral items (celebrity post, trending product) concentrate reads on one key.','#EF4444'],
      ['DynamoDB Adaptive Capacity','Automatically detects per-item hot spots and re-provisions throughput away from cold partitions toward hot ones within seconds. If a single partition is the bottleneck, DynamoDB isolates the hot item onto its own partition via an internal split.','#4F46E5'],
      ['Write Spreading (Key Sharding)','Append a random suffix 0–N to write keys. All suffixed variants land on different partitions. On read, issue N parallel queries (scatter) and merge results (gather). Works best for counters and high-write objects. Adds read complexity.','#10B981'],
      ['DAX (DynamoDB Accelerator)','In-memory cache sitting in front of DynamoDB. Microsecond read latency. Absorbs thundering-herd reads without any partition hits. Cluster-level, not per-item. Best for read-heavy hot items; not helpful for write-heavy hot partitions.','#F59E0B'],
      ['CloudWatch Metrics','Key signals: ConsumedReadCapacityUnits / ProvisionedReadCapacityUnits > 0.8, ThrottledRequests > 0, SuccessfulRequestLatency > SLA threshold. Set alarms at 80% capacity to react before throttling starts.','#A78BFA'],
      ['Exponential Backoff','Clients must implement retry with jitter (RandomExponentialBackoff). Without jitter, all throttled clients retry simultaneously — amplifying the hot-partition problem rather than solving it.','#06B6D4'],
    ].map(([t,d,col]) => `
      <div style="background:#0F172A;border-radius:8px;padding:14px 16px;border-left:3px solid ${col}">
        <div style="color:${col};font-weight:700;font-size:12px;margin-bottom:6px">${t}</div>
        <div style="font-size:11px;color:#94A3B8">${d}</div>
      </div>`).join('')}
  </div>
  <div style="background:#172554;border-left:3px solid #4F46E5;padding:12px 16px;border-radius:0 6px 6px 0;font-size:12px">
    <strong style="color:#818CF8">Prime Day 2023 pattern:</strong> Amazon pre-provisions 2–3× expected capacity
    and uses DAX clusters sized for peak. Hot-item detection runs continuously; adaptive capacity redistribution
    happens within 5–30 seconds. The application never sees a hard limit — throttled writes are automatically
    retried by the SDK with jitter. The result is sub-10ms P99 even at 100K+ req/s on individual items.
  </div>
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'Your DynamoDB table is throttling on a single partition during Prime Day. Walk through your diagnosis and mitigation steps.',
      a: 'Step 1: identify — CloudWatch ConsumedReadCapacityUnits and ThrottledRequests per partition. Step 2: distinguish hot key vs hot partition — use DynamoDB\'s contributor insights to find the top-N accessed keys. Step 3: if hot key, apply write spreading (random suffix) and cache reads in DAX. Step 4: if hot partition (range of keys), pre-split the partition or enable on-demand mode so DynamoDB manages capacity automatically. Step 5: ensure the SDK is configured with exponential backoff and jitter to prevent retry storms from amplifying the problem.',
      tip: 'Mention the distinction between hot key vs hot partition — they have different mitigations. Interviewers will push on this.',
    },
    {
      q: 'Explain write spreading. What are its trade-offs?',
      a: 'Write spreading appends a random suffix (0–N-1) to high-traffic keys, distributing writes across N physical keys / partitions. Writes are O(1) — just pick a random suffix. Reads are O(N) — you must scatter-gather: issue N parallel reads for all suffixes and merge. Trade-offs: reduces write hot spots dramatically; increases read latency and cost (N reads vs 1); adds application complexity for scatter-gather; requires N to be chosen carefully — too small and the partition is still hot, too large and read cost is prohibitive.',
    },
    {
      q: 'What is DynamoDB\'s adaptive capacity and how does it differ from on-demand mode?',
      a: 'Adaptive capacity (available in both provisioned and on-demand mode) dynamically reallocates throughput within the table — if partition A uses 10% of its allocation and partition B is at 100%, adaptive capacity shifts the unused portion from A to B. It operates at the table level, redistributing within already-provisioned capacity. On-demand mode is different: the table scales its total provisioned capacity automatically based on traffic, with no fixed upper limit (subject to account quotas). Adaptive capacity is a redistribution tool; on-demand is a scaling tool.',
    },
    {
      q: 'A viral product on Prime Day gets 500K reads per second. DAX is deployed. Walk through the full request flow.',
      a: 'Client calls GetItem on the DAX cluster endpoint. DAX checks its item cache — on a hit, returns in microseconds without touching DynamoDB. On a miss, DAX forwards to DynamoDB, caches the result (TTL configurable), and returns it. With a viral item, the cache hit rate approaches 99.99% within seconds. DAX is a cluster (multiple nodes), so reads are load-balanced across nodes. Each DAX node has its own cache — the item gets cached on whichever node first fetches it from DynamoDB, then subsequent requests to that node are served from cache. Inter-node cache propagation is not guaranteed, so the first request to each node still hits DynamoDB.',
    },
  ]);
}

export function mount(container) {
  const { tabs, body } = createModuleShell(container, {
    tag: 'Distributed',
    title: 'Hot Partition Detection & Mitigation',
    subtitle: 'One shard takes all the traffic — why Prime Day spikes happen and how to fix them.',
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
        initialState: { phase: 'normal', stepIdx: 0 },
        steps,
        onRender: (state, cnv) => {
          const pr = window.devicePixelRatio || 1;
          cnv.width  = cnv.clientWidth  * pr;
          cnv.height = cnv.clientHeight * pr;
          const ctx  = cnv.getContext('2d');
          ctx.scale(pr, pr);
          drawHotPartitions(ctx, state, cnv.clientWidth, cnv.clientHeight);
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
