import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

/* ── Step data ─────────────────────────────────────────────────────────────── */
// Show range partitioning on orders table by order_date
// Partitions: Q1 (Jan-Mar), Q2 (Apr-Jun), Q3 (Jul-Sep), Q4 (Oct-Dec) per year
const PARTITIONS = [
  { name:'orders_2024_q1', range:'Jan–Mar 2024', color:'#4F46E5', rows:'12M', active:false, pruned:false },
  { name:'orders_2024_q2', range:'Apr–Jun 2024', color:'#818CF8', rows:'15M', active:false, pruned:false },
  { name:'orders_2024_q3', range:'Jul–Sep 2024', color:'#4F46E5', rows:'18M', active:false, pruned:false },
  { name:'orders_2024_q4', range:'Oct–Dec 2024', color:'#06B6D4', rows:'45M', active:false, pruned:false },
  { name:'orders_2025_q1', range:'Jan–Mar 2025', color:'#4F46E5', rows:'14M', active:false, pruned:false },
  { name:'orders_2025_q2', range:'Apr–Jun 2025', color:'#818CF8', rows:'17M', active:false, pruned:false },
  { name:'orders_2025_q3', range:'Jul–Sep 2025', color:'#10B981', rows:'20M', active:true,  pruned:false },
  { name:'orders_2025_q4', range:'Oct–Dec 2025', color:'#F59E0B', rows:'0',   active:false, pruned:false },
];

const PART_STEPS = [
  {
    parts: PARTITIONS.map(p => ({ ...p, pruned:false, active:false })),
    query: null, pruning: false,
    desc: 'orders table is partitioned by RANGE on order_date — one partition per quarter. Total table: 141M rows across 8 partitions. Without partitioning, a query for one quarter would scan all 141M rows.',
  },
  {
    parts: PARTITIONS.map((p,i) => ({ ...p, pruned:false, active:false })),
    query: "SELECT * FROM orders WHERE order_date BETWEEN '2025-07-01' AND '2025-09-30'",
    pruning: false,
    desc: 'Query: SELECT orders for Q3 2025. PostgreSQL planner evaluates the WHERE clause against the partition bounds during planning — before execution begins.',
  },
  {
    parts: PARTITIONS.map((p,i) => ({ ...p,
      pruned: p.name !== 'orders_2025_q3',
      active: p.name === 'orders_2025_q3',
    })),
    query: "SELECT * FROM orders WHERE order_date BETWEEN '2025-07-01' AND '2025-09-30'",
    pruning: true,
    desc: 'Partition pruning: planner eliminates 7 partitions — none of their date ranges overlap [2025-07-01, 2025-09-30]. Only orders_2025_q3 is scanned. Query touches 20M rows instead of 141M — 7× less I/O.',
  },
  {
    parts: PARTITIONS.map((p,i) => ({ ...p,
      pruned: p.name !== 'orders_2025_q4',
      active: p.name === 'orders_2025_q4',
    })),
    query: "INSERT INTO orders VALUES ('2025-11-01', ...)",
    pruning: false,
    desc: 'INSERT is routed automatically to the correct partition. The value \'2025-11-01\' falls in Q4 2025 — PostgreSQL routes the row to orders_2025_q4 without application code changes.',
  },
  {
    parts: PARTITIONS.map((p,i) => ({ ...p,
      pruned: !['orders_2025_q3','orders_2025_q4'].includes(p.name),
      active: ['orders_2025_q3','orders_2025_q4'].includes(p.name),
    })),
    query: "SELECT * FROM orders WHERE order_date > '2025-07-01'",
    pruning: true,
    desc: 'Multi-partition query: date > 2025-07-01 overlaps Q3 and Q4 2025. Both are scanned. Partitions can be scanned in parallel (enable_partitionwise_aggregate=on). 6 of 8 partitions are still pruned.',
  },
  {
    parts: PARTITIONS.map(p => ({ ...p, pruned:false, active:false })),
    query: 'DROP TABLE orders_2024_q1',
    pruning: false,
    desc: 'Partition management: dropping Q1 2024 (12M rows) is instant — it just removes one file from the filesystem. No slow DELETE, no VACUUM needed. This is partitioning\'s killer feature for time-series data retention policies.',
  },
];

/* ── Canvas renderer ────────────────────────────────────────────────────────*/
function drawPartitioning(ctx, stepIdx, w, h) {
  const step = PART_STEPS[stepIdx];
  ctx.clearRect(0, 0, w, h);

  // ── Query box ──
  if (step.query) {
    ctx.fillStyle = '#0F172A'; ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(16, 8, w - 32, 26, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#F59E0B'; ctx.font = '700 9px monospace'; ctx.textAlign = 'left';
    ctx.fillText(step.query, 26, 24);
  }

  // ── Parent table box ──
  const pY = step.query ? 42 : 16;
  ctx.fillStyle = '#0F172A'; ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(w/2 - 80, pY, 160, 32, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#94A3B8'; ctx.font = '700 10px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('orders (partitioned)', w/2, pY + 20);

  if (step.pruning) {
    ctx.fillStyle = '#06B6D4'; ctx.font = '700 8px system-ui';
    ctx.fillText('← partition pruning active', w/2, pY + 34);
  }

  // ── Partitions ──
  const partY = pY + 56;
  const cols = 4;
  const partW = (w - 32) / cols - 8;
  const partH = 64;

  step.parts.forEach((p, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const px = 16 + col * (partW + 8);
    const py = partY + row * (partH + 10);

    // connector from parent to each partition
    if (row === 0) {
      ctx.strokeStyle = p.pruned ? '#1E293B' : (p.active ? p.color : '#334155');
      ctx.lineWidth = p.active ? 1.5 : 0.5;
      ctx.setLineDash(p.pruned ? [3,3] : []);
      ctx.beginPath(); ctx.moveTo(w/2, pY+32); ctx.lineTo(px + partW/2, py); ctx.stroke();
      ctx.setLineDash([]);
    }

    const alpha = p.pruned ? 0.25 : 1;
    ctx.globalAlpha = alpha;

    // partition box
    const boxColor = p.pruned ? '#1E293B' : (p.active ? p.color : '#334155');
    ctx.fillStyle = (p.active ? p.color + '33' : p.pruned ? '#0A0F1A' : '#0F172A');
    ctx.strokeStyle = boxColor;
    ctx.lineWidth = p.active ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(px, py, partW, partH, 4); ctx.fill(); ctx.stroke();

    ctx.fillStyle = p.active ? p.color : (p.pruned ? '#334155' : '#94A3B8');
    ctx.font = '700 8px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(p.name, px + partW/2, py + 16);
    ctx.fillStyle = '#64748B'; ctx.font = '8px system-ui';
    ctx.fillText(p.range, px + partW/2, py + 30);
    ctx.fillText(p.rows ? p.rows + ' rows' : 'empty', px + partW/2, py + 44);

    if (p.pruned) {
      ctx.strokeStyle = '#64748B'; ctx.lineWidth = 0.5; ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.moveTo(px+4, py+10); ctx.lineTo(px+partW-4, py+partH-10);
      ctx.moveTo(px+partW-4, py+10); ctx.lineTo(px+4, py+partH-10);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });

  // ── Stats ──
  const activeCount = step.parts.filter(p => p.active).length;
  const prunedCount = step.parts.filter(p => p.pruned).length;
  const statsY = h - 28;
  ctx.fillStyle = '#334155'; ctx.font = '9px system-ui'; ctx.textAlign = 'left';
  ctx.fillText(`Partitions scanned: ${activeCount || (step.query ? step.parts.length : 8)} / 8`, 16, statsY);
  if (prunedCount > 0) {
    ctx.fillStyle = '#10B981';
    ctx.fillText(`  |  ${prunedCount} pruned by planner`, 16 + 140, statsY);
  }
  ctx.textAlign = 'left';
}

/* ── Partitioning types tab ─────────────────────────────────────────────────*/
function renderTypesTab(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-family:system-ui;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="margin:0 0 16px;color:#E2E8F0;font-size:15px">PostgreSQL Partition Types</h3>
  ${[
    { name:'RANGE', color:'#4F46E5', when:'Ordered data like dates, IDs, or timestamps. Best for time-series with retention policies.', sql:`CREATE TABLE orders (order_id BIGINT, order_date DATE, ...) PARTITION BY RANGE (order_date);
CREATE TABLE orders_2025_q3 PARTITION OF orders FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');` },
    { name:'LIST', color:'#10B981', when:'Discrete known values like region, country, status. Exact value matching.', sql:`CREATE TABLE orders (order_id BIGINT, region TEXT, ...) PARTITION BY LIST (region);
CREATE TABLE orders_us PARTITION OF orders FOR VALUES IN ('us-east', 'us-west');
CREATE TABLE orders_eu PARTITION OF orders FOR VALUES IN ('eu-west', 'eu-central');` },
    { name:'HASH', color:'#F59E0B', when:'Uniform distribution across N partitions when no natural range/list exists. Even spread.', sql:`CREATE TABLE orders (order_id BIGINT, ...) PARTITION BY HASH (order_id);
CREATE TABLE orders_0 PARTITION OF orders FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE orders_1 PARTITION OF orders FOR VALUES WITH (MODULUS 4, REMAINDER 1);` },
  ].map(t => `
    <div style="border-left:3px solid ${t.color};padding-left:14px;margin-bottom:18px">
      <h4 style="margin:0 0 6px;color:${t.color}">${t.name} Partitioning</h4>
      <p style="margin:0 0 8px;font-size:12px">${t.when}</p>
      <pre style="background:#0F172A;border:1px solid #1E293B;border-radius:4px;padding:10px;font-size:10.5px;color:#94A3B8;overflow-x:auto;margin:0">${t.sql}</pre>
    </div>`).join('')}

  <h3 style="margin:16px 0 12px;color:#E2E8F0;font-size:15px">Prime Day Partitioning Strategy</h3>
  <div style="background:#071C10;border:1px solid #065F46;border-radius:6px;padding:14px;font-size:12px">
    Partition the orders table by RANGE on order_date (monthly partitions). Benefits: (1) <strong>Partition pruning</strong> makes dashboard queries for "today's orders" scan 1 partition instead of years of data; (2) <strong>Instant archival</strong> — DROP TABLE orders_2022_jan is instant vs deleting millions of rows; (3) <strong>Parallel scans</strong> — each partition can be scanned by a separate worker; (4) <strong>Autovacuum</strong> runs per-partition, preventing bloat on one partition from holding up cleanup on others.
  </div>
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'How does partition pruning work, and what conditions must be met for it to trigger?',
      a: `Partition pruning eliminates partitions from query execution based on the WHERE clause. The planner compares the query predicate against each partition's bounds. For RANGE partitioning on order_date: if the WHERE clause specifies <code>order_date BETWEEN '2025-07-01' AND '2025-09-30'</code>, any partition whose range doesn't overlap that interval is excluded from the execution plan entirely — no I/O, no scanning.<br><br>
Conditions for pruning to trigger: (1) the partition key column appears in the WHERE clause with a <strong>constant or runtime-constant expression</strong>; (2) the operator is compatible with the partition type (= or range ops for RANGE partitions, = for LIST); (3) <code>enable_partition_pruning=on</code> (default). Dynamic pruning also occurs at runtime for parameters like <code>WHERE order_date = $1</code> — the partition is eliminated when the parameter value is known at execution start.`,
    },
    {
      q: 'When would you choose hash partitioning over range or list?',
      a: `Hash partitioning distributes rows evenly across N partitions using <code>hash(partition_key) mod N</code>. Choose it when: (1) there is no natural ordering or grouping that queries exploit (ORDER BY partition_key, range scans); (2) data skew in range/list partitions is problematic — hash guarantees ~equal partition sizes regardless of data distribution; (3) you want to parallelize writes evenly across tablespaces.<br><br>
Hash partitioning does NOT help with partition pruning for range queries — the planner can only prune when the exact hash value is known (equality on the partition key). Hash is best for use cases like: even distribution of user IDs across shards, distributing load in a multi-database setup, or reducing contention on a heavily-written table by spreading rows across multiple tablespaces on separate disks.`,
    },
    {
      q: 'What is the downside of having too many partitions?',
      a: `Each partition is a separate table with its own data files, indexes, statistics, and autovacuum tracking. PostgreSQL's planner must evaluate every partition at plan time — with 1000 partitions, the planner examines all 1000 bounds even before pruning. This adds significant planning overhead for ad-hoc queries and OLTP workloads where planning time is a significant fraction of total query time.<br><br>
PostgreSQL 12+ introduced improved partition pruning that makes this more scalable, but the general rule is: <strong>hundreds of partitions are fine, thousands are problematic</strong>. Symptoms: <code>EXPLAIN ANALYZE</code> shows high planning time relative to execution time; pg_stat_activity shows many sessions in planning state. Solutions: use larger partition granularity (monthly instead of daily), or use sub-partitioning only where truly needed.`,
    },
  ]);
}

export function mount(container) {
  const shell = createModuleShell(container, {
    tag: 'Storage',
    title: 'Table Partitioning',
    subtitle: 'Range, list, and hash partitioning — how PostgreSQL prunes partitions and routes writes automatically',
    tabs: [
      { id:'anim',  label:'Partition Pruning' },
      { id:'types', label:'Partition Types' },
      { id:'iq',    label:'Interview Q&A' },
    ],
  });
  const { tabs, body } = shell;
  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:340px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);
      const steps = PART_STEPS.map((s,i) => ({ label:`Step ${i+1}`, duration:2800, mutate: st=>{ st.stepIdx=i; } }));
      const engine = new SimulationEngine({
        initialState:{stepIdx:0}, steps,
        onRender:(state,cnv) => {
          const ctx=cnv.getContext('2d'),pr=window.devicePixelRatio||1;
          cnv.width=cnv.clientWidth*pr; cnv.height=cnv.clientHeight*pr; ctx.scale(pr,pr);
          drawPartitioning(ctx, state.stepIdx, cnv.clientWidth, cnv.clientHeight);
        },
      });
      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));
      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);
      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = PART_STEPS[i].desc; });
      desc.textContent = PART_STEPS[0].desc;
      return () => engine.destroy();
    },
    types: renderTypesTab,
    iq:    renderIQ,
  });
  return null;
}
