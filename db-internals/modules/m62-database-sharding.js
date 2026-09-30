import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

/* ── Data ────────────────────────────────────────────────────────────────────*/
const SHARDS = [
  { id:'S0', label:'Shard 0', color:'#4F46E5', range:'user_id 0–24M',   rows:'24M', hotness:0.3 },
  { id:'S1', label:'Shard 1', color:'#10B981', range:'user_id 25–49M',  rows:'24M', hotness:0.3 },
  { id:'S2', label:'Shard 2', color:'#F59E0B', range:'user_id 50–74M',  rows:'24M', hotness:0.3 },
  { id:'S3', label:'Shard 3', color:'#06B6D4', range:'user_id 75–100M', rows:'28M', hotness:0.3 },
];

const SH_STEPS = [
  {
    strategy: 'none',
    desc: 'Single database: 100M users, all orders in one server. Works up to a point, but a single machine has a ceiling — disk space, CPU, and concurrent connections all become bottlenecks under Prime Day traffic.',
    query: null, shards: [],
  },
  {
    strategy: 'range',
    desc: 'Range sharding by user_id. Four shards each own a range: 0–24M, 25–49M, etc. A write for user_id=42 goes directly to Shard 0. Good: easy range scans within one shard. Bad: hot spots if low user_ids are more active.',
    query: 'INSERT INTO orders WHERE user_id = 42 → Shard 0',
    shards: SHARDS,
    highlight: 'S0',
  },
  {
    strategy: 'hash',
    desc: 'Hash sharding: shard = hash(user_id) % 4. Even write distribution regardless of user_id sequence. A query for user_id=77,000,001 → hash → Shard 3. Cross-shard range queries ("all users 1–1000") must fan out to all shards and merge.',
    query: 'hash(77000001) % 4 = 3 → Shard 3',
    shards: SHARDS.map((s, i) => ({ ...s, hotness: 0.3 })),
    highlight: 'S3',
  },
  {
    strategy: 'hotspot',
    desc: 'HOT SHARD: On Prime Day, celebrity sellers concentrate writes on Shard 1 (their user_ids cluster in 25–49M). Shard 1 CPU is at 98%; others at 30%. This is the hot partition problem — range or hash sharding can\'t fix skew caused by access patterns, not data distribution.',
    query: null,
    shards: SHARDS.map((s, i) => ({ ...s, hotness: i === 1 ? 0.98 : 0.30 })),
    highlight: 'S1',
  },
  {
    strategy: 'split',
    desc: 'SHARD SPLIT: Split the hot shard (S1) into two new shards — S1a (25–36M) and S1b (37–49M). This requires: (1) copying data to new shards while serving live traffic, (2) updating the routing table, (3) backfilling indexes. Cassandra and MongoDB support online shard splits.',
    query: 'SPLIT S1 → S1a (25–36M) + S1b (37–49M)',
    shards: [
      { id:'S0',  label:'Shard 0',  color:'#4F46E5', range:'0–24M',   rows:'24M', hotness:0.30 },
      { id:'S1a', label:'Shard 1a', color:'#10B981', range:'25–36M',  rows:'12M', hotness:0.50 },
      { id:'S1b', label:'Shard 1b', color:'#34D399', range:'37–49M',  rows:'12M', hotness:0.48 },
      { id:'S2',  label:'Shard 2',  color:'#F59E0B', range:'50–74M',  rows:'24M', hotness:0.30 },
      { id:'S3',  label:'Shard 3',  color:'#06B6D4', range:'75–100M', rows:'28M', hotness:0.30 },
    ],
    highlight: null,
  },
];

/* ── Canvas ──────────────────────────────────────────────────────────────────*/
function drawSharding(ctx, stepIdx, w, h) {
  const step = SH_STEPS[stepIdx];
  ctx.clearRect(0, 0, w, h);

  if (step.strategy === 'none') {
    // Single DB
    const bx = w / 2 - 90, by = h / 2 - 44;
    ctx.fillStyle = '#0F172A'; ctx.strokeStyle = '#4F46E5'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(bx, by, 180, 88, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#A78BFA'; ctx.font = '700 14px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('PostgreSQL', w / 2, by + 32);
    ctx.fillStyle = '#64748B'; ctx.font = '10px system-ui';
    ctx.fillText('100M users · 500M orders', w / 2, by + 52);
    ctx.fillStyle = '#EF4444'; ctx.font = '700 10px system-ui';
    ctx.fillText('⚠ Single point of failure & scale ceiling', w / 2, by + 72);

    // Client arrows
    for (let i = 0; i < 6; i++) {
      const cx = 32 + i * ((w - 64) / 5);
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(cx, 30); ctx.lineTo(w / 2, by); ctx.stroke();
      ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.arc(cx, 22, 6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.textAlign = 'left';
    return;
  }

  // Query box
  if (step.query) {
    ctx.fillStyle = '#0F172A'; ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(16, 8, w - 32, 24, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#F59E0B'; ctx.font = '700 9px monospace'; ctx.textAlign = 'left';
    ctx.fillText(step.query, 26, 23);
  }

  // Router box
  const routerY = step.query ? 42 : 16;
  ctx.fillStyle = '#0F172A'; ctx.strokeStyle = '#818CF8'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(w / 2 - 70, routerY, 140, 28, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#818CF8'; ctx.font = '700 9px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('SHARD ROUTER', w / 2, routerY + 17);

  // Shards
  const shards = step.shards;
  const shardY = routerY + 52;
  const shardW = (w - 32 - (shards.length - 1) * 8) / shards.length;

  shards.forEach((s, i) => {
    const sx = 16 + i * (shardW + 8);
    const isHot = step.highlight === s.id;
    const hotColor = s.hotness > 0.8 ? '#EF4444' : s.hotness > 0.5 ? '#F59E0B' : s.color;

    // Wire from router
    ctx.strokeStyle = isHot ? s.color : '#1E293B';
    ctx.lineWidth = isHot ? 1.5 : 0.8;
    ctx.setLineDash(isHot ? [] : [3, 3]);
    ctx.beginPath();
    ctx.moveTo(w / 2, routerY + 28);
    ctx.lineTo(sx + shardW / 2, shardY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Box
    ctx.fillStyle = (isHot ? s.color + '22' : '#0F172A');
    ctx.strokeStyle = isHot ? s.color : hotColor;
    ctx.lineWidth = isHot ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(sx, shardY, shardW, 100, 6); ctx.fill(); ctx.stroke();

    ctx.fillStyle = isHot ? s.color : hotColor;
    ctx.font = '700 9px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(s.label, sx + shardW / 2, shardY + 18);
    ctx.fillStyle = '#64748B'; ctx.font = '7.5px system-ui';
    ctx.fillText(s.range, sx + shardW / 2, shardY + 32);
    ctx.fillText(s.rows + ' rows', sx + shardW / 2, shardY + 44);

    // Hotness bar
    const barW = shardW - 20, barH = 8;
    const barX = sx + 10, barY = shardY + 54;
    ctx.fillStyle = '#1E293B';
    ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, 2); ctx.fill();
    ctx.fillStyle = hotColor;
    ctx.beginPath(); ctx.roundRect(barX, barY, barW * s.hotness, barH, 2); ctx.fill();
    ctx.fillStyle = hotColor; ctx.font = '7px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(`CPU ${Math.round(s.hotness * 100)}%`, sx + shardW / 2, barY + barH + 12);
  });

  ctx.textAlign = 'left';
}

/* ── Cross-shard tab ─────────────────────────────────────────────────────────*/
function renderCrossTab(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-family:system-ui;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="margin:0 0 14px;color:#E2E8F0;font-size:15px">Cross-Shard Challenges</h3>
  ${[
    { title:'Cross-shard JOIN', color:'#EF4444',
      body:'A JOIN between orders and users when sharded by user_id can span multiple shards. Application must: (1) query each shard, (2) merge and sort results in application memory. Avoid by co-locating related data — shard orders by user_id too, so all of a user\'s orders land on the same shard.' },
    { title:'Cross-shard transactions', color:'#EF4444',
      body:'ACID transactions across two shards require 2PC or saga patterns. Most sharded systems sacrifice cross-shard transactions entirely, enforcing that business transactions stay within one shard key (one user\'s data). Transfer-money between users on different shards typically uses an event-sourced approach.' },
    { title:'Global secondary indexes', color:'#F59E0B',
      body:'An index on order_status spans all shards. A query for all PENDING orders must fan out to every shard, query its local index, merge results — O(shards) round trips. DynamoDB and Cassandra support global secondary indexes by maintaining a separate index partition, at the cost of eventual consistency.' },
    { title:'Rebalancing data', color:'#F59E0B',
      body:'When a shard fills up, data must move to a new shard. During the move: dual-write to both old and new location, read from old until confirmed written to new, then cut over. Live rebalancing without downtime requires careful coordination — typically a tool like Vitess (for MySQL) or mongos (for MongoDB).' },
  ].map(s => `<div style="border-left:3px solid ${s.color};padding-left:12px;margin-bottom:16px">
    <h4 style="margin:0 0 6px;color:${s.color};font-size:12px">${s.title}</h4>
    <p style="margin:0;font-size:12px">${s.body}</p>
  </div>`).join('')}

  <div style="background:#071C10;border:1px solid #065F46;border-radius:6px;padding:14px;font-size:12px;margin-top:8px">
    <strong style="color:#10B981">Design principle:</strong> Choose a shard key that (1) distributes writes evenly, (2) keeps related data co-located on the same shard, and (3) appears in the WHERE clause of the most frequent queries. For Prime Day, <code>user_id</code> is a strong shard key — all of a user's orders land on one shard, avoiding cross-shard joins for the common "show my orders" query.
  </div>
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'How do you choose a shard key, and what makes a bad shard key?',
      a: `A good shard key must satisfy three properties simultaneously: (1) <strong>High cardinality</strong> — enough distinct values to spread data across all shards. A shard key with only 3 values can't support more than 3 shards. (2) <strong>Even write distribution</strong> — avoid keys that concentrate writes on a few values (e.g., sharding by country when 60% of users are in the US sends 60% of writes to one shard). (3) <strong>Query co-location</strong> — the most frequent queries should include the shard key in the WHERE clause so they hit only one shard.<br><br>
Bad shard keys: <code>created_at</code> (monotonically increasing → all writes hit the latest shard), <code>status</code> (low cardinality, skewed), <code>user_country</code> (uneven if one country dominates). Good shard keys: <code>user_id</code> (high cardinality, fairly uniform), <code>order_id</code> (if randomized like UUID), <code>hash(user_id)</code> (explicitly uniform at the cost of range scan ability).`,
    },
    {
      q: 'What is resharding and what makes it operationally difficult?',
      a: `Resharding is the process of redistributing data when the current partition scheme no longer serves the workload — a shard is too hot, a shard is full, or you're adding nodes for capacity. The difficulty is <strong>live migration without downtime</strong>:<br><br>
(1) You must identify which rows move to the new shard (determined by the new routing rules). (2) You copy those rows to the new shard while the system is still serving writes — if a row you've already copied gets updated on the old shard, you need a mechanism to replay that update. (3) Once the copy is complete, you atomic-swap the routing rule so new reads/writes go to the new shard. (4) You clean up old data from the original shard.<br><br>
The critical window is between "copy complete" and "routing swap" — any writes that arrive during this window must be applied to both locations (dual-write) or re-applied via a change log. Tools like Vitess (sharded MySQL), mongos (MongoDB), and Citus (PostgreSQL) manage this with background migration workers and dual-write bridges.`,
    },
    {
      q: 'How does Vitess handle sharding for MySQL at scale?',
      a: `Vitess is a sharding middleware layer for MySQL, originally built at YouTube to scale MySQL beyond a single instance. It sits between the application and MySQL, presenting a single MySQL-protocol endpoint while managing N underlying MySQL shards.<br><br>
Key mechanisms: (1) <strong>VSchema</strong>: a schema definition that declares which columns are "vindex" (sharding) columns and the sharding function. Vitess uses this to route queries to the correct shard(s) at parse time — no application changes needed. (2) <strong>Resharding workflow</strong>: Vitess supports live horizontal resharding — splitting one shard into two while serving traffic — via vreplication, which replicates row changes using MySQL binlog. (3) <strong>Connection pooling</strong>: Vitess multiplexes thousands of application connections over a small pool of MySQL connections per shard (similar to PgBouncer but across shards). (4) <strong>Scatter-gather</strong>: for queries that can't be routed to a single shard, Vitess fans out to all shards and merges results in memory.`,
    },
  ]);
}

export function mount(container) {
  const shell = createModuleShell(container, {
    tag: 'Distributed',
    title: 'Database Sharding',
    subtitle: 'Horizontal partitioning strategies — range vs hash sharding, hot partitions, shard splits, and cross-shard query challenges',
    tabs: [
      { id:'anim',  label:'Shard Routing' },
      { id:'cross', label:'Cross-Shard Challenges' },
      { id:'iq',    label:'Interview Q&A' },
    ],
  });
  const { tabs, body } = shell;
  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:340px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);
      const steps = SH_STEPS.map((s, i) => ({ label: `Step ${i + 1}`, duration: 2800, mutate: st => { st.stepIdx = i; } }));
      const engine = new SimulationEngine({
        initialState: { stepIdx: 0 }, steps,
        onRender: (state, cnv) => {
          const ctx = cnv.getContext('2d'), pr = window.devicePixelRatio || 1;
          cnv.width = cnv.clientWidth * pr; cnv.height = cnv.clientHeight * pr; ctx.scale(pr, pr);
          drawSharding(ctx, state.stepIdx, cnv.clientWidth, cnv.clientHeight);
        },
      });
      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));
      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);
      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = SH_STEPS[i].desc; });
      desc.textContent = SH_STEPS[0].desc;
      return () => engine.destroy();
    },
    cross: renderCrossTab,
    iq:    renderIQ,
  });
  return null;
}
