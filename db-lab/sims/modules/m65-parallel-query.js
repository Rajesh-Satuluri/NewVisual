import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

/* ── Data ────────────────────────────────────────────────────────────────────*/
const PQ_STEPS = [
  {
    workers: 0, phase: 'serial',
    segments: [{ w:-1, from:0, to:1, pct:0, done:false }],
    desc: 'Serial scan: single process reads all 100M rows sequentially from disk. One CPU core, one I/O stream. On Prime Day, this query takes 48 seconds — unacceptable for the analytics dashboard.',
  },
  {
    workers: 4, phase: 'plan',
    segments: [
      { w:0, from:0.00, to:0.25, pct:0, done:false },
      { w:1, from:0.25, to:0.50, pct:0, done:false },
      { w:2, from:0.50, to:0.75, pct:0, done:false },
      { w:3, from:0.75, to:1.00, pct:0, done:false },
    ],
    desc: 'PARALLEL QUERY with 4 workers (max_parallel_workers_per_gather=4). The Gather node at the top is the leader; 4 worker processes are spawned. The table is divided into 4 heap segments. Each worker scans its segment independently — 4× more I/O bandwidth.',
  },
  {
    workers: 4, phase: 'scan',
    segments: [
      { w:0, from:0.00, to:0.25, pct:0.7, done:false },
      { w:1, from:0.25, to:0.50, pct:0.4, done:false },
      { w:2, from:0.50, to:0.75, pct:0.9, done:false },
      { w:3, from:0.75, to:1.00, pct:0.2, done:false },
    ],
    desc: 'Workers scan in parallel — progress varies because disk I/O is non-uniform (some pages are in buffer cache, some on disk). Worker 2 is fastest (its pages were cached from a recent query). Worker 3 is slowest — hitting cold pages.',
  },
  {
    workers: 4, phase: 'gather',
    segments: [
      { w:0, from:0.00, to:0.25, pct:1.0, done:true },
      { w:1, from:0.25, to:0.50, pct:1.0, done:true },
      { w:2, from:0.50, to:0.75, pct:1.0, done:true },
      { w:3, from:0.75, to:1.00, pct:1.0, done:true },
    ],
    desc: 'All workers finish. The Gather node collects rows from all 4 workers via inter-process shared memory. Wall time: ~12 seconds (vs 48 serial) — 4× speedup. Bottleneck is now the Gather node\'s bandwidth and the sort/aggregate above it.',
  },
  {
    workers: 4, phase: 'partial_agg',
    segments: [
      { w:0, from:0.00, to:0.25, pct:1.0, done:true },
      { w:1, from:0.25, to:0.50, pct:1.0, done:true },
      { w:2, from:0.50, to:0.75, pct:1.0, done:true },
      { w:3, from:0.75, to:1.00, pct:1.0, done:true },
    ],
    desc: 'PARTIAL AGGREGATION: workers compute partial GROUP BY results locally before sending to Gather. Instead of shipping 100M rows, each worker ships only 50K aggregate groups. Network traffic reduced 2000×. Gather finalizes aggregation from 4 partial results.',
  },
];

/* ── Canvas ──────────────────────────────────────────────────────────────────*/
function drawPQ(ctx, stepIdx, w, h) {
  const step = PQ_STEPS[stepIdx];
  ctx.clearRect(0, 0, w, h);

  const tableY = h - 60;
  const tableH = 30;
  const barY = tableY - 44;

  // Table block
  ctx.fillStyle = '#0F172A'; ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(16, tableY, w - 32, tableH, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#64748B'; ctx.font = '9px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('orders table  (100M rows, 40GB)', w / 2, tableY + 18);

  // Gather / leader node
  const gatherY = 16;
  const leaderColor = step.phase === 'gather' || step.phase === 'partial_agg' ? '#10B981' : '#4F46E5';
  ctx.fillStyle = leaderColor + '22'; ctx.strokeStyle = leaderColor; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(w / 2 - 90, gatherY, 180, 36, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = leaderColor; ctx.font = '700 9px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(step.phase === 'partial_agg' ? 'Gather + Finalize Aggregate' : 'Gather (leader)', w / 2, gatherY + 13);
  ctx.fillStyle = '#64748B'; ctx.font = '8px system-ui';
  ctx.fillText(step.workers === 0 ? 'serial mode' : `${step.workers} workers`, w / 2, gatherY + 27);

  if (step.workers === 0) {
    // Serial: one thick arrow
    ctx.strokeStyle = '#4F46E5'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(w / 2, gatherY + 36); ctx.lineTo(w / 2, tableY); ctx.stroke();
    ctx.fillStyle = '#4F46E5'; ctx.font = '8px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('sequential scan', w / 2, barY + 16);
    ctx.textAlign = 'left'; return;
  }

  // Workers
  const workerW = (w - 32 - (step.workers - 1) * 8) / step.workers;
  step.segments.forEach((seg, i) => {
    const wx = 16 + i * (workerW + 8);
    const wCenterX = wx + workerW / 2;
    const workerY = gatherY + 60;

    const col = ['#4F46E5','#10B981','#F59E0B','#06B6D4'][i % 4];
    const isDone = seg.done;

    // Wire from gather to worker
    ctx.strokeStyle = isDone ? col : '#1E3A5F'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(w / 2, gatherY + 36); ctx.lineTo(wCenterX, workerY); ctx.stroke();

    // Worker box
    ctx.fillStyle = '#0F172A'; ctx.strokeStyle = isDone ? col : '#334155';
    ctx.lineWidth = isDone ? 1.5 : 1;
    ctx.beginPath(); ctx.roundRect(wx, workerY, workerW, 34, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = isDone ? col : '#64748B'; ctx.font = `700 8px system-ui`; ctx.textAlign = 'center';
    ctx.fillText(`Worker ${i}`, wCenterX, workerY + 13);
    ctx.fillStyle = '#475569'; ctx.font = '7.5px system-ui';
    ctx.fillText(`${Math.round(seg.from * 100)}–${Math.round(seg.to * 100)}%`, wCenterX, workerY + 25);

    // Wire from worker down to table segment
    const segX1 = 16 + seg.from * (w - 32);
    const segX2 = 16 + seg.to * (w - 32);
    const segCX = (segX1 + segX2) / 2;
    ctx.strokeStyle = isDone ? col : '#1E3A5F'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(wCenterX, workerY + 34); ctx.lineTo(segCX, tableY); ctx.stroke();

    // Progress bar on table segment
    const progressW = (segX2 - segX1) * seg.pct;
    if (seg.pct > 0) {
      ctx.fillStyle = col + '44';
      ctx.beginPath(); ctx.roundRect(segX1, tableY, progressW, tableH, 0); ctx.fill();
    }
    ctx.strokeStyle = col + '66'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(segX1, tableY); ctx.lineTo(segX1, tableY + tableH); ctx.stroke();

    // Progress pct label
    if (step.phase === 'scan' && seg.pct > 0 && seg.pct < 1) {
      ctx.fillStyle = col; ctx.font = '7px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(seg.pct * 100)}%`, segCX, barY + 10);
    }
  });

  // Speedup badge
  if (step.phase === 'gather' || step.phase === 'partial_agg') {
    ctx.fillStyle = '#071C10'; ctx.strokeStyle = '#10B981'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(w - 120, h / 2 - 20, 104, 36, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#10B981'; ctx.font = '700 10px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(`${step.workers}× speedup`, w - 68, h / 2 - 4);
    ctx.fillStyle = '#64748B'; ctx.font = '8px system-ui';
    ctx.fillText(`~${Math.round(48 / step.workers)}s vs 48s`, w - 68, h / 2 + 10);
  }
  ctx.textAlign = 'left';
}

/* ── Config tab ──────────────────────────────────────────────────────────────*/
function renderConfigTab(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-family:system-ui;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="margin:0 0 14px;color:#E2E8F0;font-size:15px">Parallel Query Configuration</h3>
  <pre style="background:#0F172A;border:1px solid #1E293B;border-radius:6px;padding:12px;font-size:10.5px;color:#94A3B8;overflow-x:auto;margin-bottom:20px">
-- PostgreSQL parallel query knobs
max_parallel_workers_per_gather = 4    -- workers per Gather node
max_parallel_workers             = 8    -- total parallel workers (across all queries)
max_worker_processes             = 16   -- OS processes available for workers
parallel_tuple_cost              = 0.1  -- cost estimate per tuple sent from worker to leader
parallel_setup_cost              = 1000 -- one-time overhead to spawn workers (skip for small tables)
min_parallel_table_scan_size     = 8MB  -- tables smaller than this stay serial
min_parallel_index_scan_size     = 512kB

-- Force parallel for testing:
SET max_parallel_workers_per_gather = 8;
EXPLAIN (ANALYZE, BUFFERS) SELECT region, SUM(total) FROM orders GROUP BY region;</pre>

  <h3 style="margin:0 0 12px;color:#E2E8F0;font-size:15px">What Can Be Parallelized?</h3>
  <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:20px">
    <thead><tr style="background:#0F172A"><th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Operation</th><th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Parallel Support</th><th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Notes</th></tr></thead>
    <tbody>
      ${[
        ['Sequential Scan','✓ Yes','Workers divide the heap into chunks'],
        ['Index Scan','Partial','Only parallel Bitmap Heap Scan; B-Tree Index Scan is serial'],
        ['Hash Join','✓ Yes (PG 11+)','Workers build partial hash tables; leader merges'],
        ['Merge Join','✓ Yes','Parallel sort + merge'],
        ['GROUP BY + aggregate','✓ Partial agg','Workers compute partial aggregates; leader finalizes'],
        ['ORDER BY','Partial','Parallel sort then merge sort in Gather Merge'],
        ['Subqueries (uncorrelated)','✓ Yes','Each subquery can be its own Gather node'],
        ['Writes (INSERT/UPDATE)','✓ PG 14+','Parallel INSERT SELECT'],
      ].map(([op,s,n]) => `<tr style="border-bottom:1px solid #0F172A">
        <td style="padding:7px 10px;color:#94A3B8">${op}</td>
        <td style="padding:7px 10px;color:${s.startsWith('✓') ? '#10B981' : '#F59E0B'}">${s}</td>
        <td style="padding:7px 10px;font-size:11px">${n}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'How does PostgreSQL decide whether to use parallel query, and what prevents it?',
      a: `PostgreSQL uses parallel query when the planner estimates the cost savings exceed <code>parallel_setup_cost</code> (default 1000 cost units) plus the communication overhead (<code>parallel_tuple_cost</code> × rows). The key conditions: (1) the table is larger than <code>min_parallel_table_scan_size</code>; (2) <code>max_parallel_workers_per_gather > 0</code>; (3) the operation is parallelizable (seq scan, hash join, aggregate — not all node types are).<br><br>
Things that prevent parallel query: (1) <strong>Functions marked PARALLEL UNSAFE</strong> — UDFs, functions that modify data, or functions that read per-session state (e.g., <code>nextval()</code> for sequences). (2) <strong>Cursors and prepared statements</strong> in some modes. (3) <strong>Outer query blocks</strong> — a subquery inside a function call may not parallelize. (4) The table has fewer pages than <code>min_parallel_table_scan_size</code>/page_size pages. (5) <code>force_parallel_mode=off</code> (default on PG 16+, renamed to <code>debug_parallel_query</code>).`,
    },
    {
      q: 'What is partial aggregation in parallel query, and why does it dramatically reduce data movement?',
      a: `Without partial aggregation: each worker sends every matching row to the Gather node, which then performs the full GROUP BY aggregation on the combined stream. For a query grouping 100M orders into 50K regions, the Gather node receives 100M rows from all workers.<br><br>
With partial aggregation (Partial HashAggregate → Gather → Finalize HashAggregate): each worker computes a local aggregate per group key. A worker that scans 25M rows and finds 50K distinct regions sends only 50K (group key, partial_sum) pairs to the Gather node instead of 25M raw rows. The Gather node merges 4 × 50K = 200K rows from all workers and performs a final aggregation to get 50K result rows. Data movement is reduced by 100M/200K = 500×. The savings scale with the ratio of input rows to distinct group keys — the more selective the grouping, the bigger the win.`,
    },
    {
      q: 'How would you tune parallel query for an analytics dashboard that runs 20 concurrent users during Prime Day?',
      a: `The challenge with 20 concurrent parallel queries: each uses up to <code>max_parallel_workers_per_gather</code> workers, so 20 queries × 4 workers = 80 worker processes, competing for CPU on a 32-core machine. This causes thrashing — worse than serial queries.<br><br>
Tuning strategy: (1) Set <code>max_parallel_workers = max_parallel_workers_per_gather × (num_cores / 2)</code> — allocate half the cores to parallel work, leaving half for leader processes and OLTP. (2) Reduce <code>max_parallel_workers_per_gather</code> from 4 to 2 for dashboard queries (use a dedicated connection pool with <code>SET max_parallel_workers_per_gather=2</code> in the pool's connect string). (3) Route analytics to a read replica to isolate from OLTP. (4) For very long queries, use <code>work_mem = 256MB</code> in the session — each parallel worker uses its own work_mem allocation, so 4 workers × 256MB = 1GB per query; budget accordingly. (5) Consider Citus (PostgreSQL sharding extension) for queries that benefit from node-level parallelism across multiple machines.`,
    },
  ]);
}

export function mount(container) {
  const shell = createModuleShell(container, {
    tag: 'Performance',
    title: 'Parallel Query',
    subtitle: 'How PostgreSQL divides table scans and aggregations across worker processes to multiply throughput',
    tabs: [
      { id:'anim',   label:'Parallel Scan' },
      { id:'config', label:'Configuration' },
      { id:'iq',     label:'Interview Q&A' },
    ],
  });
  const { tabs, body } = shell;
  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:340px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);
      const steps = PQ_STEPS.map((s, i) => ({ label: `Step ${i + 1}`, duration: 2800, mutate: st => { st.stepIdx = i; } }));
      const engine = new SimulationEngine({
        initialState: { stepIdx: 0 }, steps,
        onRender: (state, cnv) => {
          const ctx = cnv.getContext('2d'), pr = window.devicePixelRatio || 1;
          cnv.width = cnv.clientWidth * pr; cnv.height = cnv.clientHeight * pr; ctx.scale(pr, pr);
          drawPQ(ctx, state.stepIdx, cnv.clientWidth, cnv.clientHeight);
        },
      });
      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));
      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);
      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = PQ_STEPS[i].desc; });
      desc.textContent = PQ_STEPS[0].desc;
      return () => engine.destroy();
    },
    config: renderConfigTab,
    iq:     renderIQ,
  });
  return null;
}
