import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

/* ── Data ────────────────────────────────────────────────────────────────────*/
// Simulate pg_stat_statements data — top 5 slow queries evolving over 6 snapshots
const QUERIES = [
  { id:'q1', label:'SELECT orders WHERE user_id=?', color:'#4F46E5' },
  { id:'q2', label:'SELECT order_items JOIN orders', color:'#10B981' },
  { id:'q3', label:'UPDATE inventory SET qty=?',    color:'#F59E0B' },
  { id:'q4', label:'SELECT orders GROUP BY region', color:'#06B6D4' },
  { id:'q5', label:'INSERT INTO events VALUES',     color:'#A78BFA' },
];

// Each snapshot: calls, total_time (ms), mean_time
const SNAPSHOTS = [
  {
    label: 'Baseline',
    desc: 'pg_stat_statements baseline — 5 top queries by total_time. Query 4 (analytics GROUP BY) is already the slowest despite fewer calls. Query 1 has high call count but low mean time — well-indexed.',
    data: [
      { calls:50000, total:25000,  mean:0.5  },
      { calls:30000, total:18000,  mean:0.6  },
      { calls:20000, total:12000,  mean:0.6  },
      { calls:2000,  total:48000,  mean:24   },
      { calls:80000, total:16000,  mean:0.2  },
    ],
  },
  {
    label: 'Noon rush',
    desc: 'Noon traffic spike. Query 3 (inventory UPDATE) call count 3×. Query 4 mean time doubled — table bloat from no recent VACUUM. Query 1 stable — index is working.',
    data: [
      { calls:60000, total:30000,  mean:0.5  },
      { calls:35000, total:21000,  mean:0.6  },
      { calls:60000, total:42000,  mean:0.7  },
      { calls:2200,  total:97000,  mean:44   },
      { calls:95000, total:19000,  mean:0.2  },
    ],
  },
  {
    label: 'Post-deploy',
    desc: 'New index added on order_items(order_id). Query 2 mean time drops from 0.6 to 0.08ms — 7.5× faster. Query 4 still slow; work_mem increase helps partially.',
    data: [
      { calls:62000, total:31000,  mean:0.5  },
      { calls:36000, total:2880,   mean:0.08 },
      { calls:62000, total:43400,  mean:0.7  },
      { calls:2300,  total:69000,  mean:30   },
      { calls:96000, total:19200,  mean:0.2  },
    ],
  },
  {
    label: 'Prime Day',
    desc: 'Prime Day 2PM peak. All queries spike. Query 3 UPDATE is now the top time consumer — lock contention on inventory rows. Query 4 analytics falls as replicas absorb analytics traffic.',
    data: [
      { calls:200000, total:120000, mean:0.6  },
      { calls:100000, total:8000,   mean:0.08 },
      { calls:180000, total:198000, mean:1.1  },
      { calls:500,    total:15000,  mean:30   },
      { calls:280000, total:56000,  mean:0.2  },
    ],
  },
  {
    label: 'Post-fix',
    desc: 'Hot row contention fixed with row-level lock batching. Query 3 mean back to 0.7ms. Overall system stabilized. VACUUM ran — Query 4 analytics faster.',
    data: [
      { calls:195000, total:117000, mean:0.6  },
      { calls:98000,  total:7840,   mean:0.08 },
      { calls:178000, total:124600, mean:0.7  },
      { calls:520,    total:11440,  mean:22   },
      { calls:275000, total:55000,  mean:0.2  },
    ],
  },
];

/* ── Canvas ──────────────────────────────────────────────────────────────────*/
function drawQS(ctx, stepIdx, w, h) {
  const snap = SNAPSHOTS[stepIdx];
  ctx.clearRect(0, 0, w, h);

  const maxTotal = Math.max(...SNAPSHOTS.flatMap(s => s.data.map(d => d.total)));
  const barAreaW = w - 220;
  const rowH = 44, startY = 40;

  // Header
  ctx.fillStyle = '#475569'; ctx.font = '700 9px system-ui'; ctx.textAlign = 'left';
  ctx.fillText('Query', 14, 22);
  ctx.fillText('Calls', barAreaW + 14, 22);
  ctx.fillText('Total ms', barAreaW + 62, 22);
  ctx.fillText('Mean ms', barAreaW + 118, 22);

  snap.data.forEach((d, i) => {
    const q = QUERIES[i];
    const y = startY + i * rowH;
    const barW = (d.total / maxTotal) * (barAreaW - 20);

    // Row bg
    ctx.fillStyle = i % 2 === 0 ? '#0A0F1A' : '#0D1420';
    ctx.beginPath(); ctx.roundRect(0, y, w, rowH - 2, 2); ctx.fill();

    // Bar
    ctx.fillStyle = q.color + '44';
    ctx.beginPath(); ctx.roundRect(10, y + 8, barW, 20, 2); ctx.fill();
    ctx.strokeStyle = q.color; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(10, y + 8, barW, 20, 2); ctx.stroke();

    // Query label on bar
    ctx.fillStyle = q.color; ctx.font = '700 7.5px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(q.label, 14, y + 22);

    // Stats columns
    ctx.fillStyle = '#94A3B8'; ctx.font = '8px monospace'; ctx.textAlign = 'right';
    ctx.fillText(d.calls.toLocaleString(), barAreaW + 52, y + 22);
    ctx.fillStyle = d.total === Math.max(...snap.data.map(x => x.total)) ? '#EF4444' : '#94A3B8';
    ctx.fillText(d.total.toLocaleString(), barAreaW + 108, y + 22);
    ctx.fillStyle = d.mean > 10 ? '#EF4444' : d.mean > 1 ? '#F59E0B' : '#10B981';
    ctx.fillText(d.mean.toFixed(2), barAreaW + 170, y + 22);
  });

  // Snapshot label
  ctx.fillStyle = '#1E293B'; ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(w - 110, h - 32, 100, 22, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#818CF8'; ctx.font = '700 8px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(snap.label, w - 60, h - 18);
  ctx.textAlign = 'left';
}

/* ── Views tab ───────────────────────────────────────────────────────────────*/
function renderViewsTab(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-family:system-ui;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="margin:0 0 14px;color:#E2E8F0;font-size:15px">PostgreSQL Diagnostic Views</h3>
  ${[
    { name:'pg_stat_statements', color:'#4F46E5',
      sql:`SELECT query, calls, total_exec_time, mean_exec_time, rows,
       blk_read_time + blk_wr_time AS io_time
FROM pg_stat_statements
ORDER BY total_exec_time DESC LIMIT 10;`,
      body:'Requires pg_stat_statements extension. Tracks cumulative stats per unique query. Reset with pg_stat_statements_reset(). Best source for: which query is consuming the most total time, which has the highest mean latency, and which is called most frequently.' },
    { name:'pg_stat_activity', color:'#10B981',
      sql:`SELECT pid, now() - pg_stat_activity.query_start AS duration,
       query, state, wait_event_type, wait_event
FROM pg_stat_activity
WHERE state != 'idle' AND query_start < now() - interval '5s'
ORDER BY duration DESC;`,
      body:'Real-time view of active sessions. Look for long-running queries (duration >> expected), wait_event=Lock (lock contention), wait_event=IO (disk-bound), and state=idle in transaction (leaked transaction holding locks).' },
    { name:'pg_stat_user_tables', color:'#F59E0B',
      sql:`SELECT relname, seq_scan, idx_scan,
       n_dead_tup, n_live_tup,
       last_autovacuum, last_autoanalyze
FROM pg_stat_user_tables
ORDER BY seq_scan DESC;`,
      body:'Per-table scan stats. High seq_scan with low idx_scan → missing index. n_dead_tup > 20% of n_live_tup → VACUUM needed. last_autovacuum NULL → autovacuum may be disabled or threshold too high.' },
    { name:'pg_locks + pg_stat_activity', color:'#06B6D4',
      sql:`SELECT a.pid, a.query, l.relation::regclass, l.mode, l.granted
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE NOT l.granted;`,
      body:'Find blocked queries. NOT granted locks show what\'s waiting. Join with pg_blocking_pids(pid) to trace the blocking chain. On Prime Day, a single long-running analytics query holding an AccessShareLock can cascade into hundreds of blocked OLTP queries.' },
  ].map(v => `
    <div style="border-left:3px solid ${v.color};padding-left:12px;margin-bottom:18px">
      <h4 style="margin:0 0 6px;color:${v.color};font-size:12px">${v.name}</h4>
      <pre style="background:#0F172A;border:1px solid #1E293B;border-radius:4px;padding:8px;font-size:10px;color:#94A3B8;overflow-x:auto;margin:0 0 6px">${v.sql}</pre>
      <p style="margin:0;font-size:11.5px">${v.body}</p>
    </div>`).join('')}
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'How would you use pg_stat_statements to identify and fix the top query bottleneck on Prime Day?',
      a: `Step 1: Install and enable the extension (<code>shared_preload_libraries = 'pg_stat_statements'</code>). Reset stats at the start of the peak window (<code>SELECT pg_stat_statements_reset();</code>). After 30 minutes, query by total_exec_time DESC to find the top consumers.<br><br>
Step 2: For the top query, run <code>EXPLAIN (ANALYZE, BUFFERS)</code> to get the actual execution plan. Look for: Seq Scan on large tables (add index), Sort spilling to disk (increase work_mem), high actual rows vs estimated rows (stale statistics — run ANALYZE), or Nested Loop with many outer rows.<br><br>
Step 3: After applying a fix (index, VACUUM, work_mem), reset pg_stat_statements again and wait 15 minutes. Compare the new mean_exec_time and total_exec_time for that query. A 5× drop in mean_exec_time confirms the fix worked. Monitor that fixing one query didn't move the bottleneck to another.`,
    },
    {
      q: 'What does "idle in transaction" in pg_stat_activity mean, and why is it dangerous?',
      a: `"Idle in transaction" means the client started a transaction (BEGIN), executed some SQL, but has not committed or rolled back. The connection is idle (no query is running) but the transaction is still open. This is almost always a bug in the application — a connection was acquired, queries run, then the application crashed, got stuck waiting for user input, or had a code path that forgot to commit.<br><br>
The danger: (1) <strong>Locks are held</strong> — any rows or tables touched by the transaction remain locked. If the transaction ran UPDATE orders SET status='processing' WHERE id=500, that row is locked until commit/rollback — other UPDATE queries for that row will block indefinitely. (2) <strong>VACUUM is blocked</strong> — the transaction's snapshot prevents VACUUM from reclaiming dead tuples that existed before the transaction started. (3) <strong>XID age grows</strong> — if the transaction is very old, it can trigger XID wraparound monitoring warnings.<br><br>
Fix: set <code>idle_in_transaction_session_timeout = '30s'</code> to automatically terminate sessions in this state. In pgBouncer, transaction-mode pooling prevents idle-in-transaction from holding a server connection.`,
    },
    {
      q: 'What is the difference between pg_stat_statements total_exec_time and total_plan_time, and when does high plan time matter?',
      a: `<code>total_exec_time</code> measures time executing the query (CPU + I/O during execution). <code>total_plan_time</code> (added in PG 13) measures time the planner spent producing the execution plan before execution starts. Normally, plan time is 0.1–5ms and negligible compared to execution time (10ms–10s for typical queries).<br><br>
When high plan time matters: (1) <strong>Very fast OLTP queries</strong> — a query that executes in 0.3ms but takes 2ms to plan is 86% overhead in planning. Prepared statements cache the plan after the first parse/plan cycle (<code>PREPARE stmt AS SELECT ...</code>), eliminating repeated planning. (2) <strong>Tables with many partitions</strong> — the planner evaluates each partition's bounds, so with 1000 daily partitions and no partition pruning, planning can take 50ms+. (3) <strong>Very complex queries</strong> — JOIN reordering is factorial in the number of joined tables; PostgreSQL caps exhaustive search at <code>join_collapse_limit</code> (default 8 tables) and uses genetic algorithms beyond that. High plan time here signals that the query needs to be simplified or split.`,
    },
  ]);
}

export function mount(container) {
  const shell = createModuleShell(container, {
    tag: 'Performance',
    title: 'Query Statistics',
    subtitle: 'pg_stat_statements, pg_stat_activity, and pg_locks — identifying bottlenecks before and during production incidents',
    tabs: [
      { id:'anim',  label:'Stats Dashboard' },
      { id:'views', label:'Diagnostic Views' },
      { id:'iq',    label:'Interview Q&A' },
    ],
  });
  const { tabs, body } = shell;
  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:280px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);
      const steps = SNAPSHOTS.map((s, i) => ({ label: s.label, duration: 2800, mutate: st => { st.stepIdx = i; } }));
      const engine = new SimulationEngine({
        initialState: { stepIdx: 0 }, steps,
        onRender: (state, cnv) => {
          const ctx = cnv.getContext('2d'), pr = window.devicePixelRatio || 1;
          cnv.width = cnv.clientWidth * pr; cnv.height = cnv.clientHeight * pr; ctx.scale(pr, pr);
          drawQS(ctx, state.stepIdx, cnv.clientWidth, cnv.clientHeight);
        },
      });
      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));
      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);
      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = SNAPSHOTS[i].desc; });
      desc.textContent = SNAPSHOTS[0].desc;
      return () => engine.destroy();
    },
    views: renderViewsTab,
    iq:    renderIQ,
  });
  return null;
}
