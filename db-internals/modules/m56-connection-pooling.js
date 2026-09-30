import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

/* ── Step data ─────────────────────────────────────────────────────────────── */
// Clients: { id, color, status: 'idle'|'queued'|'query'|'waiting', pgConn }
// PgBouncer pool: { mode, poolSize, inUse }
const POOL_STEPS = [
  {
    mode: 'none', poolSize: 0, inUse: 0,
    clients: [
      { id:'C1', color:'#4F46E5', status:'idle',  pgConn:1 },
      { id:'C2', color:'#10B981', status:'idle',  pgConn:2 },
      { id:'C3', color:'#F59E0B', status:'idle',  pgConn:3 },
      { id:'C4', color:'#06B6D4', status:'idle',  pgConn:4 },
      { id:'C5', color:'#EF4444', status:'idle',  pgConn:5 },
    ],
    pgConns: 5, limit: 100,
    desc: 'Without a connection pool: each application thread holds a persistent PostgreSQL connection. During Prime Day, 10,000 concurrent app threads = 10,000 PostgreSQL backends — each consuming ~10 MB RAM = 100 GB RAM just for connections. PostgreSQL would OOM or hit max_connections.',
  },
  {
    mode: 'session', poolSize: 3, inUse: 3,
    clients: [
      { id:'C1', color:'#4F46E5', status:'query',   pgConn:1 },
      { id:'C2', color:'#10B981', status:'query',   pgConn:2 },
      { id:'C3', color:'#F59E0B', status:'query',   pgConn:3 },
      { id:'C4', color:'#06B6D4', status:'queued',  pgConn:null },
      { id:'C5', color:'#EF4444', status:'queued',  pgConn:null },
    ],
    pgConns: 3, limit: 3,
    desc: 'PgBouncer — Session mode: one server connection is assigned to a client for the lifetime of the client connection. Pool of 3 server connections serves 5 clients — C4 and C5 wait in PgBouncer\'s queue. Good for clients that use connection-level state (PREPARE, SET LOCAL).',
  },
  {
    mode: 'transaction', poolSize: 3, inUse: 2,
    clients: [
      { id:'C1', color:'#4F46E5', status:'query',  pgConn:1 },
      { id:'C2', color:'#10B981', status:'idle',   pgConn:null },
      { id:'C3', color:'#F59E0B', status:'query',  pgConn:2 },
      { id:'C4', color:'#06B6D4', status:'idle',   pgConn:null },
      { id:'C5', color:'#EF4444', status:'idle',   pgConn:null },
    ],
    pgConns: 2, limit: 3,
    desc: 'PgBouncer — Transaction mode: a server connection is held ONLY for the duration of a transaction. After COMMIT, the connection returns to the pool. 5 clients need only 2 server connections (C2/C4/C5 are idle). Most efficient mode — handles Prime Day bursts without scaling server connections.',
  },
  {
    mode: 'transaction', poolSize: 3, inUse: 3,
    clients: [
      { id:'C1', color:'#4F46E5', status:'query',  pgConn:1 },
      { id:'C2', color:'#10B981', status:'query',  pgConn:2 },
      { id:'C3', color:'#F59E0B', status:'query',  pgConn:3 },
      { id:'C4', color:'#06B6D4', status:'waiting',pgConn:null },
      { id:'C5', color:'#EF4444', status:'waiting',pgConn:null },
    ],
    pgConns: 3, limit: 3,
    desc: 'Burst: all 3 pool connections in use simultaneously. C4 and C5 wait in PgBouncer\'s in-memory queue. PgBouncer handles this with minimal overhead — far less than creating new PostgreSQL backends.',
  },
  {
    mode: 'transaction', poolSize: 3, inUse: 1,
    clients: [
      { id:'C1', color:'#4F46E5', status:'idle',  pgConn:null },
      { id:'C2', color:'#10B981', status:'idle',  pgConn:null },
      { id:'C3', color:'#F59E0B', status:'query', pgConn:1 },
      { id:'C4', color:'#06B6D4', status:'idle',  pgConn:null },
      { id:'C5', color:'#EF4444', status:'idle',  pgConn:null },
    ],
    pgConns: 1, limit: 3,
    desc: 'After the burst: only 1 server connection needed for 5 clients. The other 2 connections sit in the pool, kept alive. Server resources freed immediately after each transaction — no "idle in transaction" sessions blocking VACUUM.',
  },
];

/* ── Canvas ──────────────────────────────────────────────────────────────────*/
function drawPooling(ctx, stepIdx, w, h) {
  const step = POOL_STEPS[stepIdx];
  ctx.clearRect(0, 0, w, h);

  const clientW = 56, clientH = 40, clientGap = 12;
  const totalCW = step.mode === 'none' ? step.clients.length : step.clients.length;
  const startX  = 20;
  const clientY  = h * 0.15;

  // ── Draw clients ──
  ctx.fillStyle = '#475569'; ctx.font = '700 9px system-ui'; ctx.textAlign = 'left';
  ctx.fillText('APP CLIENTS', startX, clientY - 14);

  step.clients.forEach((c, i) => {
    const cx = startX + i * (clientW + clientGap);
    const color = c.status === 'waiting' || c.status === 'queued' ? '#64748B' : c.color;
    ctx.fillStyle = color + '33'; ctx.strokeStyle = color; ctx.lineWidth = c.status === 'query' ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(cx, clientY, clientW, clientH, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = color; ctx.font = '700 9px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(c.id, cx + clientW/2, clientY + 15);
    ctx.fillStyle = '#94A3B8'; ctx.font = '8px system-ui';
    ctx.fillText(c.status, cx + clientW/2, clientY + 28);
  });

  if (step.mode === 'none') {
    // direct connections, no pooler
    const pgY = h * 0.7;
    ctx.fillStyle = '#475569'; ctx.font = '700 9px system-ui'; ctx.textAlign = 'left';
    ctx.fillText('POSTGRESQL BACKENDS (one per client)', startX, pgY - 14);

    step.clients.forEach((c, i) => {
      const cx = startX + i * (clientW + clientGap);
      // wire
      ctx.strokeStyle = c.color + '66'; ctx.lineWidth = 1; ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(cx + clientW/2, clientY + clientH);
      ctx.lineTo(cx + clientW/2, pgY);
      ctx.stroke();
      // backend box
      ctx.fillStyle = '#0F172A'; ctx.strokeStyle = c.color; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(cx, pgY, clientW, clientH, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#94A3B8'; ctx.font = '700 8px system-ui'; ctx.textAlign = 'center';
      ctx.fillText('backend', cx + clientW/2, pgY+14);
      ctx.fillStyle = '#64748B'; ctx.font = '7px system-ui';
      ctx.fillText('~10 MB', cx + clientW/2, pgY+26);
    });
    ctx.fillStyle = '#EF4444'; ctx.font = '700 10px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(`Total: ${step.pgConns} connections × 10 MB = ${step.pgConns * 10} MB RAM`, w/2, pgY + clientH + 24);
  } else {
    // PgBouncer box
    const pbY = h * 0.46, pbW = Math.min(w - 40, 360), pbH = 44;
    const pbX = (w - pbW) / 2;

    // client → PgBouncer wires
    step.clients.forEach((c, i) => {
      const cx = startX + i * (clientW + clientGap) + clientW/2;
      ctx.strokeStyle = c.color + '55'; ctx.lineWidth = 1; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(cx, clientY+clientH); ctx.lineTo(cx, clientY+clientH+18); ctx.stroke();
    });
    // funnel line
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(startX, clientY+clientH+18); ctx.lineTo(w - startX, clientY+clientH+18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pbX+pbW/2, clientY+clientH+18); ctx.lineTo(pbX+pbW/2, pbY); ctx.stroke();

    // PgBouncer box
    const modeColor = step.mode === 'session' ? '#F59E0B' : '#06B6D4';
    ctx.fillStyle = modeColor + '22'; ctx.strokeStyle = modeColor; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(pbX, pbY, pbW, pbH, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = modeColor; ctx.font = '700 11px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('PgBouncer — ' + step.mode.toUpperCase() + ' MODE', pbX+pbW/2, pbY+16);
    ctx.fillStyle = '#94A3B8'; ctx.font = '9px system-ui';
    ctx.fillText(`Pool: ${step.inUse}/${step.poolSize} connections in use`, pbX+pbW/2, pbY+32);

    // PgBouncer → PostgreSQL
    const pgY = h * 0.76, pgConnW = 70, pgConnGap = 14;
    const pgStartX = (w - (step.poolSize * pgConnW + (step.poolSize-1) * pgConnGap)) / 2;

    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pbX+pbW/2, pbY+pbH); ctx.lineTo(pbX+pbW/2, pgY-20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pgStartX, pgY-20); ctx.lineTo(pgStartX+(step.poolSize-1)*(pgConnW+pgConnGap)+pgConnW, pgY-20); ctx.stroke();

    for (let i = 0; i < step.poolSize; i++) {
      const pcx = pgStartX + i*(pgConnW+pgConnGap);
      const active = i < step.inUse;
      ctx.strokeStyle = '#334155'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pcx+pgConnW/2, pgY-20); ctx.lineTo(pcx+pgConnW/2, pgY); ctx.stroke();

      ctx.fillStyle = active ? '#10B98133' : '#0F172A';
      ctx.strokeStyle = active ? '#10B981' : '#1E293B'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(pcx, pgY, pgConnW, 44, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = active ? '#10B981' : '#334155'; ctx.font = '700 9px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(active?'active':'idle', pcx+pgConnW/2, pgY+15);
      ctx.fillStyle = '#64748B'; ctx.font = '8px system-ui';
      ctx.fillText('~10 MB', pcx+pgConnW/2, pgY+28);
    }

    ctx.fillStyle = '#475569'; ctx.font = '700 9px system-ui'; ctx.textAlign = 'left';
    ctx.fillText('POSTGRESQL SERVER CONNECTIONS', pgStartX, pgY-26);

    ctx.fillStyle = '#10B981'; ctx.font = '700 10px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(`${step.pgConns} server connections × 10 MB = ${step.pgConns * 10} MB  (vs ${step.clients.length * 10} MB without pool)`, w/2, pgY + 60);
  }
  ctx.textAlign = 'left';
}

/* ── Modes reference tab ────────────────────────────────────────────────────*/
function renderModesTab(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-family:system-ui;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="margin:0 0 16px;color:#E2E8F0;font-size:15px">PgBouncer Pooling Modes</h3>
  <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:20px">
    <thead><tr style="background:#0F172A">
      <th style="padding:8px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Mode</th>
      <th style="padding:8px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Connection held during</th>
      <th style="padding:8px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Limitations</th>
      <th style="padding:8px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Best for</th>
    </tr></thead>
    <tbody>
      ${[
        ['Session','Entire client connection lifetime','Fewest — supports all PG features','Legacy apps, long-lived connections'],
        ['Transaction (recommended)','Single transaction only','No SET, no PREPARE across txn boundaries, no LISTEN/NOTIFY','Modern OLTP apps — highest multiplexing'],
        ['Statement','Single SQL statement','No multi-statement transactions','Read-only queries only (very restrictive)'],
      ].map(([m,h,l,b]) => `
        <tr style="border-bottom:1px solid #0F172A">
          <td style="padding:7px 10px;color:#F59E0B;font-weight:600">${m}</td>
          <td style="padding:7px 10px">${h}</td>
          <td style="padding:7px 10px;color:#94A3B8;font-size:11.5px">${l}</td>
          <td style="padding:7px 10px;color:#10B981;font-size:11.5px">${b}</td>
        </tr>`).join('')}
    </tbody>
  </table>

  <h3 style="margin:0 0 12px;color:#E2E8F0;font-size:15px">Key PgBouncer Parameters</h3>
  <pre style="background:#0F172A;border:1px solid #1E293B;border-radius:6px;padding:12px;font-size:11px;color:#94A3B8;overflow-x:auto">
[databases]
mydb = host=127.0.0.1 port=5432 dbname=mydb

[pgbouncer]
pool_mode = transaction
max_client_conn = 10000      # total client connections PgBouncer accepts
default_pool_size = 25       # server connections per (db, user) pair
reserve_pool_size = 5        # extra connections for bursts
reserve_pool_timeout = 5     # seconds before using reserve pool
server_idle_timeout = 600    # close idle server connections after 10 min
client_idle_timeout = 0      # never close idle client connections (app responsibility)
</pre>

  <div style="background:#071C10;border:1px solid #065F46;border-radius:6px;padding:14px;font-size:12px;margin-top:16px">
    <strong style="color:#10B981">Prime Day sizing rule of thumb:</strong> Set default_pool_size = max_connections / num_databases / num_users. For a single database with 200 max_connections: default_pool_size ≈ 50. PgBouncer then multiplexes 10,000 app threads through those 50 server connections with negligible overhead.
  </div>
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'Why does PostgreSQL need a connection pooler and what is the cost of too many connections?',
      a: `PostgreSQL uses a process-per-connection model — every client connection forks a backend process. Each backend: (1) allocates ~10 MB of RAM; (2) acquires a slot in shared lock tables; (3) requires OS scheduling overhead. With max_connections=200 (the default), PostgreSQL can sustain 200 concurrent backends efficiently. Beyond that, performance degrades sharply — not from query processing but from connection management overhead (lock table contention, context switching).<br><br>
On Prime Day with 10,000 concurrent app threads, you'd need 10,000 PostgreSQL connections. At 10 MB each = 100 GB RAM consumed purely for connection overhead. A connection pooler like PgBouncer multiplexes thousands of app connections through a small fixed number of server connections (e.g., 50–100), dramatically reducing RAM usage and scheduler pressure.`,
    },
    {
      q: 'What PostgreSQL features are unavailable in PgBouncer transaction mode?',
      a: `Transaction mode is the most efficient but has constraints: the server connection is returned to the pool after COMMIT/ROLLBACK, so any <strong>connection-level state is lost</strong> between transactions. Features that break:<br><br>
1. <strong>Prepared statements</strong> (<code>PREPARE foo AS SELECT...</code>) — prepared statements are scoped to a server connection; the next transaction may get a different connection. Use protocol-level prepared statements (libpq binary protocol) instead, which PgBouncer handles transparently since PgBouncer 1.21.<br><br>
2. <strong>SET and SET LOCAL</strong> outside a transaction — <code>SET search_path</code> applies to the server connection and would affect other clients' transactions after pooling.<br><br>
3. <strong>LISTEN/NOTIFY</strong> — LISTEN is a connection-level operation; the notification arrives on whichever server connection happens to be held.<br><br>
4. <strong>Advisory locks</strong> — pg_advisory_lock() is connection-scoped.<br><br>
Workaround: use session mode for sessions that need these features, route them through a separate PgBouncer pool.`,
    },
    {
      q: 'How do you monitor for connection pool exhaustion during a traffic spike?',
      a: `Pool exhaustion means all server connections are in use and new client requests are queuing in PgBouncer. Signs and monitoring:<br><br>
<strong>PgBouncer SHOW POOLS:</strong> <code>cl_waiting > 0</code> means clients are queued. <code>sv_active / (sv_active + sv_idle)</code> is the utilization ratio — when it hits 1.0, the pool is saturated.<br><br>
<strong>PgBouncer SHOW CLIENTS:</strong> shows individual client wait times. Long waits indicate pool exhaustion.<br><br>
<strong>PostgreSQL pg_stat_activity:</strong> <code>SELECT count(*), state FROM pg_stat_activity GROUP BY state</code>. If most are 'active' with few 'idle', the server is at capacity.<br><br>
<strong>Remediation:</strong> Increase <code>default_pool_size</code> (if max_connections allows) and <code>max_client_conn</code>. For sustained load: scale the database (read replicas + routing writes-only to primary) or reduce transaction duration (shorter critical path, less time holding a connection).`,
    },
  ]);
}

export function mount(container) {
  const shell = createModuleShell(container, {
    tag: 'Performance',
    title: 'Connection Pooling',
    subtitle: 'How PgBouncer multiplexes thousands of app connections through a small fixed pool of PostgreSQL backends',
    tabs: [
      { id:'anim',  label:'Pool Animation' },
      { id:'modes', label:'Pooling Modes' },
      { id:'iq',    label:'Interview Q&A' },
    ],
  });
  const { tabs, body } = shell;
  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:320px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);
      const steps = POOL_STEPS.map((s,i) => ({ label:`Step ${i+1}`, duration:2600, mutate: st=>{ st.stepIdx=i; } }));
      const engine = new SimulationEngine({
        initialState:{stepIdx:0}, steps,
        onRender:(state,cnv) => {
          const ctx=cnv.getContext('2d'),pr=window.devicePixelRatio||1;
          cnv.width=cnv.clientWidth*pr; cnv.height=cnv.clientHeight*pr; ctx.scale(pr,pr);
          drawPooling(ctx, state.stepIdx, cnv.clientWidth, cnv.clientHeight);
        },
      });
      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));
      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);
      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = POOL_STEPS[i].desc; });
      desc.textContent = POOL_STEPS[0].desc;
      return () => engine.destroy();
    },
    modes: renderModesTab,
    iq:    renderIQ,
  });
  return null;
}
