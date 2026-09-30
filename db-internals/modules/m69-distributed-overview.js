import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

/* ── Data ────────────────────────────────────────────────────────────────────*/
// Show architecture evolution: single → primary/replica → sharded → multi-region
const ARCH_STEPS = [
  {
    tier: 'single',
    desc: 'SINGLE NODE: one PostgreSQL instance handles all reads and writes. Simple to operate. Ceiling: ~50K TPS on modern hardware. Prime Day requires 500K TPS peak — 10× beyond one machine.',
  },
  {
    tier: 'replica',
    desc: 'PRIMARY + READ REPLICAS: WAL streaming replication adds read capacity. Analytics and dashboard queries route to replicas. Writes still bottleneck on the primary. Scales reads horizontally; writes remain single-node.',
  },
  {
    tier: 'sharded',
    desc: 'SHARDED CLUSTER: data partitioned across N primary shards by user_id. Each shard has its own replicas. Writes scale linearly with shard count. Cross-shard queries require scatter-gather. PgBouncer pools connections at each shard.',
  },
  {
    tier: 'multi_region',
    desc: 'MULTI-REGION: each region has its own sharded cluster. Writes replicate async to other regions (eventual consistency). Reads served locally — sub-5ms latency within a region. Global transactions (cross-region) require 2PC or saga.',
  },
  {
    tier: 'cdn',
    desc: 'EDGE CACHING: read-only catalog data (product listings, prices) cached at CDN edge nodes. User-specific data (cart, order status) still hits regional DB. 95% of Prime Day product page reads served from CDN — 0ms DB latency.',
  },
];

/* ── Canvas ──────────────────────────────────────────────────────────────────*/
function box(ctx, x, y, w, h, col, label, sublabel) {
  ctx.fillStyle = col + '22'; ctx.strokeStyle = col; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = col; ctx.font = '700 8.5px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + h / 2 - (sublabel ? 4 : 0));
  if (sublabel) { ctx.fillStyle = '#64748B'; ctx.font = '7.5px system-ui'; ctx.fillText(sublabel, x + w / 2, y + h / 2 + 9); }
}

function wire(ctx, x1, y1, x2, y2, col) {
  ctx.strokeStyle = col || '#1E3A5F'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}

function drawDist(ctx, stepIdx, w, h) {
  const step = ARCH_STEPS[stepIdx];
  ctx.clearRect(0, 0, w, h);

  const tier = step.tier;
  const cx = w / 2;

  // Client row
  const clients = 4;
  const cW = 44, cH = 24;
  const cSpacing = (w - 32) / clients;
  for (let i = 0; i < clients; i++) {
    const cx2 = 16 + i * cSpacing + cSpacing / 2;
    ctx.fillStyle = '#334155'; ctx.strokeStyle = '#475569'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(cx2 - cW / 2, 10, cW, cH, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#94A3B8'; ctx.font = '7px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(`Client ${i + 1}`, cx2, 24);
  }

  if (tier === 'single') {
    const dbY = h / 2 - 24;
    for (let i = 0; i < clients; i++) {
      const cx2 = 16 + i * cSpacing + cSpacing / 2;
      wire(ctx, cx2, 34, cx, dbY);
    }
    box(ctx, cx - 80, dbY, 160, 48, '#4F46E5', 'PostgreSQL', 'single node · reads + writes');
    ctx.fillStyle = '#EF4444'; ctx.font = '700 8px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('⚠ single point of failure', cx, dbY + 60);
  }

  if (tier === 'replica') {
    const primY = h / 2 - 20;
    const repY = primY + 90;
    wire(ctx, cx, 34, cx, primY);
    box(ctx, cx - 80, primY, 160, 40, '#4F46E5', 'Primary', 'read + write');

    const repCols = ['#10B981', '#10B981'];
    repCols.forEach((c, i) => {
      const rx = cx - 120 + i * 140;
      wire(ctx, cx, primY + 40, rx + 50, repY);
      box(ctx, rx, repY, 100, 36, c, `Replica ${i + 1}`, 'read-only');
    });
    ctx.fillStyle = '#10B981'; ctx.font = '7px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('WAL streaming →', cx + 30, primY + 55);
  }

  if (tier === 'sharded') {
    const shardY = h / 2 - 20;
    const repY = shardY + 90;
    const shards = 3;
    const sW = 80;
    const sSpacing = (w - 32) / shards;
    const colors = ['#4F46E5', '#10B981', '#F59E0B'];

    // Router
    box(ctx, cx - 60, 44, 120, 28, '#818CF8', 'Shard Router', '');
    wire(ctx, cx, 34, cx, 44);
    for (let i = 0; i < clients; i++) { wire(ctx, 16 + i * cSpacing + cSpacing / 2, 34, cx, 44); }

    for (let i = 0; i < shards; i++) {
      const sx = 16 + i * sSpacing + sSpacing / 2;
      wire(ctx, cx, 72, sx, shardY);
      box(ctx, sx - sW / 2, shardY, sW, 36, colors[i], `Shard ${i}`, `P + 2 replicas`);
    }
  }

  if (tier === 'multi_region') {
    const regions = ['us-east-1', 'eu-west-1', 'ap-east-1'];
    const colors = ['#4F46E5', '#10B981', '#F59E0B'];
    const rW = (w - 48) / 3, rH = h - 80;
    regions.forEach((name, i) => {
      const rx = 16 + i * (rW + 8);
      box(ctx, rx, 50, rW, rH, colors[i], name, '3 shards + replicas');
      // Async replication arrow between regions
      if (i < 2) {
        ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(rx + rW, 50 + rH / 2); ctx.lineTo(rx + rW + 8, 50 + rH / 2); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#475569'; ctx.font = '7px system-ui'; ctx.textAlign = 'center';
        ctx.fillText('async repl', rx + rW + 4, 50 + rH / 2 + 12);
      }
    });
  }

  if (tier === 'cdn') {
    const edgeY = 44, dbY = h - 80;
    const edges = 3;
    const eSpacing = (w - 32) / edges;
    for (let i = 0; i < edges; i++) {
      const ex = 16 + i * eSpacing + eSpacing / 2;
      box(ctx, ex - 44, edgeY, 88, 32, '#06B6D4', `CDN Edge`, 'catalog cache');
      wire(ctx, ex, edgeY + 32, cx, dbY);
    }
    box(ctx, cx - 90, dbY, 180, 40, '#4F46E5', 'Regional DB Cluster', 'user-specific data');
    ctx.fillStyle = '#10B981'; ctx.font = '700 8px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('95% product page reads from CDN (0ms DB)', cx, dbY - 10);
  }

  ctx.textAlign = 'left';
}

/* ── Comparison tab ──────────────────────────────────────────────────────────*/
function renderCompareTab(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-family:system-ui;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="margin:0 0 14px;color:#E2E8F0;font-size:15px">Architecture Comparison</h3>
  <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:20px">
    <thead><tr style="background:#0F172A">
      <th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Architecture</th>
      <th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Write TPS</th>
      <th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Read scale</th>
      <th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Latency</th>
      <th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Complexity</th>
    </tr></thead>
    <tbody>
      ${[
        ['Single node','~50K','1×','<1ms local','Low'],
        ['Primary + replicas','~50K','N×','<1ms local','Medium'],
        ['Sharded cluster','~500K (10 shards)','N×M','<5ms local','High'],
        ['Multi-region','~5M (10 regions)','N×M×R','<5ms intra-region, 50–150ms cross-region','Very High'],
      ].map(([a,w,r,l,c]) => `<tr style="border-bottom:1px solid #0F172A">
        <td style="padding:7px 10px;color:#94A3B8">${a}</td>
        <td style="padding:7px 10px;color:#F59E0B">${w}</td>
        <td style="padding:7px 10px;color:#10B981">${r}</td>
        <td style="padding:7px 10px">${l}</td>
        <td style="padding:7px 10px;color:${c==='Low'?'#10B981':c==='Medium'?'#F59E0B':'#EF4444'}">${c}</td>
      </tr>`).join('')}
    </tbody>
  </table>

  <h3 style="margin:0 0 12px;color:#E2E8F0;font-size:15px">Amazon Prime Day Architecture (Estimated)</h3>
  <div style="background:#071C10;border:1px solid #065F46;border-radius:6px;padding:14px;font-size:12px">
    <p style="margin:0 0 8px">Amazon's Prime Day infrastructure spans multiple regions with DynamoDB (eventual consistency) for the shopping cart and order pipeline (millions of writes/sec), Aurora for relational order records, ElastiCache for session and catalog caching, and CloudFront CDN for product page static content. The "Buy Now" path is optimized to touch the fewest durable-write systems possible — the cart is an eventually consistent DynamoDB write; the order is async; payment authorization is synchronous but isolated to the payment service.</p>
    <p style="margin:0">Core principle: <strong>separate the write-latency path from the read-capacity path</strong>. The write path (cart → order → payment) must be durable but can be eventual in some steps. The read path (product page, recommendations) must be fast but can be slightly stale.</p>
  </div>
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'At what point does adding read replicas stop helping, and what do you do next?',
      a: `Read replicas scale reads but not writes. The bottleneck shifts to the primary when: (1) write TPS saturates the primary's CPU/disk/network; (2) the replication lag on all replicas grows, meaning reads start seeing stale data; (3) replica count itself saturates WAL sender capacity on the primary (typically 10–20 replicas per primary before WAL sender becomes a bottleneck).<br><br>
What to do next: (1) <strong>Connection pooling</strong> — if the primary is bottlenecked on connection overhead (process per connection), adding PgBouncer in transaction mode can double effective TPS without changing the data model. (2) <strong>Vertical scaling</strong> — before horizontal sharding, a larger machine (more RAM, faster NVMe, more CPU) often provides 5–10× capacity headroom with zero application changes. (3) <strong>Sharding</strong> — once vertical scaling is exhausted, partition writes across multiple primaries. This is the complexity cliff — cross-shard transactions, scatter-gather queries, and resharding all require significant application changes.`,
    },
    {
      q: 'What is the trade-off between synchronous and asynchronous multi-region replication?',
      a: `<strong>Synchronous replication</strong>: primary waits for at least one replica in every region to confirm the write before returning success. Guarantees zero data loss (RPO=0) and linearizability across regions. Cost: every write incurs at least one cross-region round trip (50–150ms for US↔Europe), making write latency unacceptable for interactive workloads.<br><br>
<strong>Asynchronous replication</strong>: primary returns success immediately after local durability; propagates to other regions in the background. Write latency stays <1ms. Cost: if the primary region fails before a write propagates, those writes are lost (RPO > 0). Cross-region reads may see stale data (eventual consistency).<br><br>
Practical hybrid: use <strong>synchronous replication within a region</strong> (same AZ or within-DC round trip ≈ 1ms) for RPO=0 within the region, and asynchronous replication across regions for low write latency with tolerable cross-region eventual consistency. This is what Aurora Global Database does: synchronous within the primary region, asynchronous lag ≈ 100ms to secondary regions.`,
    },
    {
      q: 'How do you decide whether to use a NewSQL database (CockroachDB, Spanner) vs sharding a traditional RDBMS?',
      a: `NewSQL databases (CockroachDB, Google Spanner, YugabyteDB) offer distributed SQL with automatic sharding, global transactions, and horizontal write scaling — without the application changes required by manual sharding. They use Raft/Paxos per shard for consistency.<br><br>
Choose NewSQL when: (1) you need cross-shard ACID transactions as a first-class feature; (2) you cannot tolerate the operational complexity of managing shard routing, resharding, and cross-shard queries in application code; (3) you're starting a new system and consistency is non-negotiable.<br><br>
Choose manual sharding (Vitess, application-level) when: (1) you have an existing PostgreSQL/MySQL schema and changing databases is higher risk than adding a sharding layer; (2) you need fine-grained control over shard placement and routing (e.g., data residency requirements); (3) you can accept that certain queries (cross-shard joins) are expensive or moved to the application layer; (4) cost — NewSQL clouds are more expensive per TPS than self-hosted PostgreSQL at scale. The trade-off is operational complexity vs feature richness.`,
    },
  ]);
}

export function mount(container) {
  const shell = createModuleShell(container, {
    tag: 'Distributed',
    title: 'Distributed DB Overview',
    subtitle: 'Architecture evolution from single node to multi-region — read replicas, sharding, and CDN caching',
    tabs: [
      { id:'anim',    label:'Architecture Tiers' },
      { id:'compare', label:'Comparison' },
      { id:'iq',      label:'Interview Q&A' },
    ],
  });
  const { tabs, body } = shell;
  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:340px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);
      const steps = ARCH_STEPS.map((s, i) => ({ label: `Step ${i + 1}`, duration: 2800, mutate: st => { st.stepIdx = i; } }));
      const engine = new SimulationEngine({
        initialState: { stepIdx: 0 }, steps,
        onRender: (state, cnv) => {
          const ctx = cnv.getContext('2d'), pr = window.devicePixelRatio || 1;
          cnv.width = cnv.clientWidth * pr; cnv.height = cnv.clientHeight * pr; ctx.scale(pr, pr);
          drawDist(ctx, state.stepIdx, cnv.clientWidth, cnv.clientHeight);
        },
      });
      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));
      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);
      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = ARCH_STEPS[i].desc; });
      desc.textContent = ARCH_STEPS[0].desc;
      return () => engine.destroy();
    },
    compare: renderCompareTab,
    iq:      renderIQ,
  });
  return null;
}
