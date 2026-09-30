import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

// Rows show: client write → primary → replica propagation → ack
// strategy: 'sync' | 'async' | 'semi'
const REP_STEPS = [
  {
    label: 'Write Arrives',
    strategy: 'none',
    desc: 'A "Buy Now" write arrives at the primary node. The primary must decide: wait for replicas before acknowledging (sync), or acknowledge immediately (async)?',
    phase: 'client_write',
  },
  {
    label: 'Sync Replication',
    strategy: 'sync',
    desc: 'SYNCHRONOUS: Primary waits for ALL replicas to confirm the write before returning success. Zero data loss on crash, but every write pays the round-trip latency to the slowest replica.',
    phase: 'replicate',
  },
  {
    label: 'Async Replication',
    strategy: 'async',
    desc: 'ASYNCHRONOUS: Primary acknowledges the client immediately after writing locally. Replicas catch up in the background. Lowest latency but replica lag means data loss is possible if the primary crashes before replicas catch up.',
    phase: 'replicate',
  },
  {
    label: 'Semi-Sync (1-of-N)',
    strategy: 'semi',
    desc: 'SEMI-SYNCHRONOUS: Primary waits for at least one replica to confirm before ACKing. Reduces data-loss risk vs async while not paying the latency of the slowest replica. MySQL\'s default since 5.7.',
    phase: 'replicate',
  },
  {
    label: 'Replication Lag',
    strategy: 'async',
    phase: 'lag',
    desc: 'With async replication, a read on a replica may return stale data. Lag can be milliseconds under normal load but seconds during a spike. Applications needing strong reads must route to the primary.',
  },
];

const ACTORS = {
  client:   { label:'Client',    x:0.08, col:'#818CF8' },
  primary:  { label:'Primary',   x:0.38, col:'#10B981' },
  replica1: { label:'Replica 1', x:0.65, col:'#4F46E5' },
  replica2: { label:'Replica 2', x:0.88, col:'#4F46E5' },
};

function drawREP(ctx, idx, w, h) {
  const step = REP_STEPS[idx];
  ctx.clearRect(0, 0, w, h);

  const topY = 30, botY = h - 20;
  const actorKeys = ['client','primary','replica1','replica2'];

  // Lifelines
  actorKeys.forEach(k => {
    const ax = ACTORS[k].x * w;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(ax, topY + 28); ctx.lineTo(ax, botY);
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1; ctx.stroke();
    ctx.setLineDash([]);
  });

  // Actor headers
  actorKeys.forEach(k => {
    const { label, x, col } = ACTORS[k];
    const ax = x * w;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.roundRect(ax - 44, topY, 88, 26, 5); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, ax, topY + 13);
  });

  // Helper to draw a horizontal arrow
  function arrow(fromK, toK, y, label, col, dashed) {
    const fx = ACTORS[fromK].x * w, tx = ACTORS[toK].x * w;
    if (dashed) ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(fx, y); ctx.lineTo(tx - 6, y);
    ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.setLineDash([]);
    const dir = tx > fx ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(tx, y);
    ctx.lineTo(tx - dir * 9, y - 4);
    ctx.lineTo(tx - dir * 9, y + 4);
    ctx.closePath(); ctx.fillStyle = col; ctx.fill();
    ctx.fillStyle = col; ctx.font = '10px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(label, (fx + tx) / 2, y - 3);
  }

  const y0 = 90;

  if (step.phase === 'client_write') {
    arrow('client', 'primary', y0, 'INSERT order (Buy Now)', '#818CF8', false);
  }

  if (step.strategy === 'sync' && step.phase === 'replicate') {
    arrow('client',  'primary',  y0,      'INSERT order',        '#818CF8', false);
    arrow('primary', 'replica1', y0 + 40, 'WAL record',          '#F59E0B', false);
    arrow('primary', 'replica2', y0 + 70, 'WAL record',          '#F59E0B', false);
    arrow('replica1','primary',  y0 +110, 'ACK',                 '#10B981', true);
    arrow('replica2','primary',  y0 +140, 'ACK',                 '#10B981', true);
    arrow('primary', 'client',   y0 +180, 'SUCCESS (after both ACKs)', '#10B981', false);
    // Label block
    ctx.fillStyle = '#0F172A'; ctx.beginPath();
    ctx.roundRect(10, botY - 36, 160, 30, 4); ctx.fill();
    ctx.fillStyle = '#10B981'; ctx.font = '700 11px system-ui';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('✓ Zero data loss', 18, botY - 21);
    ctx.fillStyle = '#EF4444';
    ctx.fillText('✗ Higher write latency', 18, botY - 8);
  }

  if (step.strategy === 'async' && step.phase === 'replicate') {
    arrow('client',  'primary',  y0,       'INSERT order',           '#818CF8', false);
    arrow('primary', 'client',   y0 + 40,  'SUCCESS (local write)',  '#10B981', false);
    ctx.setLineDash([6, 3]);
    arrow('primary', 'replica1', y0 + 100, 'WAL (background)',       '#F59E0B', false);
    arrow('primary', 'replica2', y0 + 130, 'WAL (background)',       '#F59E0B', false);
    ctx.setLineDash([]);
    ctx.fillStyle = '#0F172A'; ctx.beginPath();
    ctx.roundRect(10, botY - 36, 180, 30, 4); ctx.fill();
    ctx.fillStyle = '#10B981'; ctx.font = '700 11px system-ui';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('✓ Lowest write latency', 18, botY - 21);
    ctx.fillStyle = '#EF4444';
    ctx.fillText('✗ Data loss risk on crash', 18, botY - 8);
  }

  if (step.strategy === 'semi' && step.phase === 'replicate') {
    arrow('client',  'primary',  y0,       'INSERT order',          '#818CF8', false);
    arrow('primary', 'replica1', y0 + 40,  'WAL record',            '#F59E0B', false);
    arrow('replica1','primary',  y0 + 80,  'ACK',                   '#10B981', true);
    arrow('primary', 'client',   y0 + 120, 'SUCCESS (1 replica OK)','#10B981', false);
    ctx.setLineDash([6, 3]);
    arrow('primary', 'replica2', y0 + 160, 'WAL (background)',      '#F59E0B', false);
    ctx.setLineDash([]);
    ctx.fillStyle = '#0F172A'; ctx.beginPath();
    ctx.roundRect(10, botY - 36, 200, 30, 4); ctx.fill();
    ctx.fillStyle = '#10B981'; ctx.font = '700 11px system-ui';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('✓ 1 durable copy guaranteed', 18, botY - 21);
    ctx.fillStyle = '#F59E0B';
    ctx.fillText('~ Moderate latency', 18, botY - 8);
  }

  if (step.phase === 'lag') {
    // Show stale read on replica
    arrow('client',  'primary',  y0,       'Write v=42',          '#818CF8', false);
    arrow('primary', 'client',   y0 + 40,  'OK',                  '#10B981', false);
    // lag indicator on replica1
    const r1x = ACTORS.replica1.x * w;
    ctx.fillStyle = '#EF444433';
    ctx.beginPath(); ctx.roundRect(r1x - 50, y0 + 60, 100, 30, 5); ctx.fill();
    ctx.strokeStyle = '#EF4444'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(r1x - 50, y0 + 60, 100, 30, 5); ctx.stroke();
    ctx.fillStyle = '#EF4444'; ctx.font = '700 10px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('LAG: still v=41', r1x, y0 + 75);

    arrow('client', 'replica1', y0 + 110, 'Read v?', '#818CF8', false);
    arrow('replica1','client',  y0 + 150, 'v=41 (STALE!)', '#EF4444', false);

    ctx.fillStyle = '#0F172A'; ctx.beginPath();
    ctx.roundRect(10, botY - 36, 220, 30, 4); ctx.fill();
    ctx.fillStyle = '#EF4444'; ctx.font = '700 11px system-ui';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('Stale read from lagging replica', 18, botY - 21);
    ctx.fillStyle = '#94A3B8'; ctx.font = '10px system-ui';
    ctx.fillText('Route strong reads to primary', 18, botY - 8);
  }

  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

function renderTable(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="color:#E2E8F0;margin:0 0 14px">Replication Strategies Compared</h3>
  <div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead>
        <tr style="background:#1E293B">
          <th style="padding:8px 12px;text-align:left;color:#94A3B8;border-bottom:1px solid #334155">Property</th>
          <th style="padding:8px 12px;text-align:left;color:#10B981;border-bottom:1px solid #334155">Synchronous</th>
          <th style="padding:8px 12px;text-align:left;color:#F59E0B;border-bottom:1px solid #334155">Semi-Sync</th>
          <th style="padding:8px 12px;text-align:left;color:#4F46E5;border-bottom:1px solid #334155">Asynchronous</th>
        </tr>
      </thead>
      <tbody>
        ${[
          ['Write latency','High (waits for all)','Medium (waits for 1)','Low (local only)'],
          ['Data loss on crash','Zero','Minimal (1 copy safe)','Possible (lag duration)'],
          ['Replica lag','None','Near-zero for 1','Can be seconds'],
          ['Throughput','Limited by slowest replica','Higher','Highest'],
          ['Used by','PostgreSQL sync_standby','MySQL 5.7+ default','PostgreSQL, MongoDB'],
          ['Availability under partition','Lower (waits for replica)','Medium','Higher'],
        ].map(([p,...vals]) => `
          <tr style="border-bottom:1px solid #1E293B">
            <td style="padding:8px 12px;font-weight:600;color:#E2E8F0">${p}</td>
            ${vals.map(v => `<td style="padding:8px 12px;color:#94A3B8">${v}</td>`).join('')}
          </tr>`).join('')}
      </tbody>
    </table>
  </div>
  <div style="margin-top:16px;background:#172554;border-left:3px solid #4F46E5;padding:12px 16px;border-radius:0 6px 6px 0;font-size:12px">
    <strong style="color:#818CF8">PostgreSQL config:</strong>
    <code style="color:#F59E0B">synchronous_commit = on</code> → synchronous.
    <code style="color:#F59E0B">= remote_write</code> → semi-sync (OS buffer on replica).
    <code style="color:#F59E0B">= off</code> → async (fastest, tiny data-loss window).
  </div>
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'What is replication lag and what problems does it cause?',
      a: 'Replication lag is the delay between a write being committed on the primary and becoming visible on a replica. It causes stale reads (a client reads from a replica before it receives the update), read-your-writes violations (a user who just wrote data reads from a replica and does not see their own change), and monotonic-read violations (reading from two different replicas can see the data appear then disappear). Solutions: route strong reads to the primary, use synchronous replication for critical data, or track replication positions and wait until a replica is caught up before serving a read.',
    },
    {
      q: 'What is the difference between physical and logical replication?',
      a: 'Physical replication ships raw WAL byte sequences (block-level changes) — it replicates the exact same data pages, requires the same PostgreSQL major version, and can only replicate the entire cluster. Logical replication decodes WAL into row-level change events (INSERT/UPDATE/DELETE of logical rows) — it allows cross-version replication, selective table replication, and fan-out to multiple subscribers with different schemas. PostgreSQL uses streaming replication (physical) for standbys and logical replication for selective sync.',
    },
    {
      q: 'How does PostgreSQL\'s synchronous_commit = remote_write differ from = on?',
      a: "remote_write waits until the replica has written the WAL to its OS buffer (but not necessarily fsynced to disk). This is faster than on (which waits for replica fsync) but still prevents data loss in most crash scenarios — if the primary crashes, the replica's OS buffer is still intact. The only loss scenario is a simultaneous primary + replica OS crash. on provides the strongest guarantee: both nodes have fsynced before the commit returns.",
    },
  ]);
}

export function mount(container) {
  const shell = createModuleShell(container, {
    tag: 'Distributed',
    title: 'Replication Strategies',
    subtitle: 'Synchronous vs asynchronous vs semi-synchronous replication tradeoffs.',
    tabs: [
      { id:'anim',  label:'Sequence Diagram' },
      { id:'table', label:'Strategy Comparison' },
      { id:'iq',    label:'Interview Q&A' },
    ],
  });
  const { tabs, body } = shell;
  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:360px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);
      const steps = REP_STEPS.map((s, i) => ({ label: s.label, duration: 2200, mutate: st => { st.idx = i; } }));
      const engine = new SimulationEngine({
        initialState: { idx: 0 }, steps,
        onRender: (state, cnv) => {
          const c = cnv.getContext('2d'), pr = window.devicePixelRatio || 1;
          cnv.width = cnv.clientWidth * pr; cnv.height = cnv.clientHeight * pr; c.scale(pr, pr);
          drawREP(c, state.idx, cnv.clientWidth, cnv.clientHeight);
        },
      });
      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));
      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);
      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = REP_STEPS[i].desc; });
      desc.textContent = REP_STEPS[0].desc;
      return () => engine.destroy();
    },
    table: renderTable,
    iq:    renderIQ,
  });
  return null;
}
