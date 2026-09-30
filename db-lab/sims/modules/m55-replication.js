import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

/* ── Step data ─────────────────────────────────────────────────────────────── */
const REPL_STEPS = [
  {
    walSent: 0, walReceived: 0, walReplayed: 0,
    primaryLsn:'0/100', standbyLsn:'0/100',
    lag: 0, phase:'idle',
    desc: 'Streaming replication setup: Primary writes to WAL; the WAL Sender process on the primary streams records to the WAL Receiver on the standby. The standby\'s startup process replays the WAL.',
  },
  {
    walSent: 1, walReceived: 0, walReplayed: 0,
    primaryLsn:'0/200', standbyLsn:'0/100',
    lag: 2, phase:'write',
    desc: 'Application writes to primary. Primary flushes WAL record (LSN 0/200) to disk. WAL Sender detects the new record and begins streaming it to the standby.',
  },
  {
    walSent: 1, walReceived: 1, walReplayed: 0,
    primaryLsn:'0/200', standbyLsn:'0/100',
    lag: 1, phase:'receive',
    desc: 'WAL Receiver on standby receives the WAL chunk. Writes it to standby\'s WAL file. Replication lag: standby has received 0/200 but not yet replayed it. Read queries on the standby still see the old state.',
  },
  {
    walSent: 1, walReceived: 1, walReplayed: 1,
    primaryLsn:'0/200', standbyLsn:'0/200',
    lag: 0, phase:'replay',
    desc: 'Startup process replays the WAL record — applies the change to the standby\'s data files. Standby is now fully caught up (lag = 0). Queries routed to the standby now see the committed data.',
  },
  {
    walSent: 3, walReceived: 2, walReplayed: 1,
    primaryLsn:'0/500', standbyLsn:'0/300',
    lag: 3, phase:'lag',
    desc: 'Heavy write burst on primary during Prime Day. WAL Sender has sent up to 0/500. WAL Receiver has received up to 0/300. Standby has replayed up to 0/300. Replication lag has grown — monitor with pg_stat_replication.',
  },
  {
    walSent: 3, walReceived: 3, walReplayed: 3,
    primaryLsn:'0/500', standbyLsn:'0/500',
    lag: 0, phase:'sync',
    desc: 'Lag recovered — standby caught up. With synchronous_commit=on, the primary would have waited for the standby to confirm receipt before returning COMMIT to the client. With asynchronous replication, there is a small window of data loss risk.',
  },
  {
    walSent: 3, walReceived: 3, walReplayed: 3,
    primaryLsn:'0/500', standbyLsn:'0/500',
    lag: 0, phase:'promote',
    desc: 'Failover: primary goes down. Operations team promotes the standby with pg_ctl promote. Standby becomes the new primary, opens for writes. Any unreplicated WAL on the old primary is lost (async replication). Clients reconnect to the new primary.',
  },
];

/* ── Canvas renderer ───────────────────────────────────────────────────────── */
function drawReplication(ctx, stepIdx, w, h) {
  const step = REPL_STEPS[stepIdx];
  ctx.clearRect(0, 0, w, h);

  const midY = h / 2 - 10;
  const primX = 60, primW = 160, primH = 100;
  const stbyX = w - 60 - 160, stbyW = 160, stbyH = 100;
  const primColor = step.phase === 'promote' ? '#EF4444' : '#4F46E5';
  const stbyColor = step.phase === 'promote' ? '#10B981' : '#10B981';

  // ── Primary box ──
  ctx.fillStyle = primColor + '22'; ctx.strokeStyle = primColor; ctx.lineWidth = step.phase==='promote'?2:1.5;
  ctx.beginPath(); ctx.roundRect(primX, midY - primH/2, primW, primH, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = primColor; ctx.font = '700 11px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(step.phase==='promote'?'PRIMARY (FAILED)':'PRIMARY', primX + primW/2, midY - primH/2 + 20);
  ctx.fillStyle = '#94A3B8'; ctx.font = '9px system-ui';
  ctx.fillText('LSN: ' + step.primaryLsn, primX + primW/2, midY - primH/2 + 38);
  ctx.fillText('WAL flushed: ' + step.walSent + ' chunks', primX + primW/2, midY - primH/2 + 52);

  // WAL Sender process inside primary
  ctx.fillStyle = '#4F46E522'; ctx.strokeStyle = '#4F46E5'; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.roundRect(primX+10, midY+4, primW-20, 22, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#818CF8'; ctx.font = '8px system-ui';
  ctx.fillText('WAL Sender (walsender)', primX+primW/2, midY+18);

  // ── Standby box ──
  const promoted = step.phase === 'promote';
  ctx.fillStyle = stbyColor + (promoted ? '55' : '22');
  ctx.strokeStyle = stbyColor; ctx.lineWidth = promoted ? 2 : 1.5;
  ctx.beginPath(); ctx.roundRect(stbyX, midY - stbyH/2, stbyW, stbyH, 8); ctx.fill(); ctx.stroke();
  ctx.fillStyle = stbyColor; ctx.font = '700 11px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(promoted?'NEW PRIMARY':'STANDBY', stbyX + stbyW/2, midY - stbyH/2 + 20);
  ctx.fillStyle = '#94A3B8'; ctx.font = '9px system-ui';
  ctx.fillText('LSN: ' + step.standbyLsn, stbyX + stbyW/2, midY - stbyH/2 + 38);
  ctx.fillText('Received: ' + step.walReceived + ' | Replayed: ' + step.walReplayed, stbyX + stbyW/2, midY - stbyH/2 + 52);

  // WAL Receiver inside standby
  ctx.fillStyle = '#10B98122'; ctx.strokeStyle = '#10B981'; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.roundRect(stbyX+10, midY+4, stbyW-20, 22, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#34D399'; ctx.font = '8px system-ui';
  ctx.fillText(promoted?'Now: WAL Sender':'WAL Receiver (walreceiver)', stbyX+stbyW/2, midY+18);

  // ── WAL stream arrows ──
  if (!promoted) {
    const arrowY = midY - 10;
    const ax1 = primX + primW + 10, ax2 = stbyX - 10;

    // WAL stream
    const streamFrac = step.walReceived / Math.max(step.walSent, 1);
    const streamEnd  = ax1 + (ax2 - ax1) * streamFrac;

    ctx.strokeStyle = '#4F46E5'; ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(ax1, arrowY); ctx.lineTo(streamEnd, arrowY); ctx.stroke();

    if (streamFrac < 1) {
      ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 1.5; ctx.setLineDash([4,3]);
      ctx.beginPath(); ctx.moveTo(streamEnd, arrowY); ctx.lineTo(ax2, arrowY); ctx.stroke();
      ctx.setLineDash([]);
    }

    // arrow tip
    ctx.fillStyle = '#4F46E5';
    ctx.beginPath(); ctx.moveTo(ax2, arrowY); ctx.lineTo(ax2-8, arrowY-5); ctx.lineTo(ax2-8, arrowY+5); ctx.closePath(); ctx.fill();

    ctx.fillStyle = '#818CF8'; ctx.font = '700 9px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('WAL stream', (ax1+ax2)/2, arrowY - 8);

    // Replay arrow
    const replayY = midY + 30;
    ctx.strokeStyle = '#10B981'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(stbyX + stbyW/2, midY + stbyH/2);
    ctx.lineTo(stbyX + stbyW/2, replayY + 20);
    ctx.stroke();
    ctx.fillStyle = '#10B981'; ctx.font = '9px system-ui';
    ctx.fillText('startup process: apply', stbyX + stbyW/2, replayY + 36);
  }

  // ── Lag indicator ──
  const lagY = midY - primH/2 - 36;
  const lagColor = step.lag === 0 ? '#10B981' : step.lag <= 1 ? '#F59E0B' : '#EF4444';
  ctx.fillStyle = lagColor + '22'; ctx.strokeStyle = lagColor; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect((primX+primW + stbyX)/2 - 70, lagY, 140, 28, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = lagColor; ctx.font = '700 10px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(step.phase==='promote'?'FAILOVER':'Replication Lag: ' + (step.lag===0?'0 ms':step.lag+'s'), (primX+primW + stbyX)/2, lagY+18);

  // ── promote banner ──
  if (promoted) {
    ctx.fillStyle = '#10B98122'; ctx.strokeStyle = '#10B981'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(stbyX-10, midY-stbyH/2-32, stbyW+20, 26, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#10B981'; ctx.font = '700 10px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('PROMOTED — now primary', stbyX + stbyW/2, midY - stbyH/2 - 14);
  }
  ctx.textAlign = 'left';
}

/* ── Replication modes tab ───────────────────────────────────────────────────*/
function renderModesTab(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-family:system-ui;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="margin:0 0 16px;color:#E2E8F0;font-size:15px">Replication Types in PostgreSQL</h3>
  ${[
    { name:'Streaming Replication (Physical)', color:'#4F46E5', rows:[
      ['Mechanism','WAL bytes streamed in real time over TCP'],
      ['Granularity','Block-level (entire page changes)'],
      ['Use case','Hot standby for failover, read replicas'],
      ['Lag','Typically < 1 second; increases under write bursts'],
      ['Setup','primary_conninfo in recovery.conf or postgresql.conf'],
    ]},
    { name:'Logical Replication', color:'#10B981', rows:[
      ['Mechanism','Decoded row-level changes (INSERT/UPDATE/DELETE) streamed'],
      ['Granularity','Table rows — select specific tables/rows'],
      ['Use case','Cross-version upgrades, selective table replication, OLAP offload'],
      ['Lag','Higher — decoding adds overhead'],
      ['Setup','CREATE PUBLICATION / CREATE SUBSCRIPTION'],
    ]},
  ].map(t => `
    <div style="border:1px solid #1E293B;border-radius:6px;padding:14px;margin-bottom:14px">
      <div style="color:${t.color};font-weight:700;font-size:13px;margin-bottom:10px">${t.name}</div>
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        ${t.rows.map(([k,v]) => `<tr style="border-bottom:1px solid #0F172A"><td style="padding:5px 10px;color:#64748B;width:120px">${k}</td><td style="padding:5px 10px">${v}</td></tr>`).join('')}
      </table>
    </div>`).join('')}

  <h3 style="margin:16px 0 12px;color:#E2E8F0;font-size:15px">synchronous_commit Settings</h3>
  <table style="width:100%;border-collapse:collapse;font-size:12px">
    <thead><tr style="background:#0F172A"><th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Setting</th><th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">COMMIT waits for</th><th style="padding:7px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Data loss risk</th></tr></thead>
    <tbody>
      ${[
        ['off','Nothing (async even on primary WAL)','Up to wal_writer_delay ms'],
        ['local','Local WAL flush only','Loss of any unreplicated WAL'],
        ['remote_write','Standby WAL received (OS write, not fsync)','Very small (OS crash on standby)'],
        ['on (default)','Standby WAL flushed to disk','Zero (after commit returns)'],
        ['remote_apply','Standby has replayed the change','Zero; reads on standby are consistent'],
      ].map(([s,w,r]) => `<tr style="border-bottom:1px solid #0F172A"><td style="padding:7px 10px;color:#F59E0B;font-family:monospace;font-size:10.5px">${s}</td><td style="padding:7px 10px">${w}</td><td style="padding:7px 10px;color:${s==='off'?'#EF4444':s.startsWith('remote_apply')?'#10B981':'#94A3B8'}">${r}</td></tr>`).join('')}
    </tbody>
  </table>
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'What is replication lag and what causes it to grow during a write burst?',
      a: `Replication lag is the delay between a change being committed on the primary and that change being visible on the standby. It has two components: <strong>receive lag</strong> (time for WAL bytes to travel across the network and be written to the standby's WAL) and <strong>replay lag</strong> (time for the startup process to apply the WAL to the standby's data files).<br><br>
During a Prime Day write burst, the primary generates WAL faster than the network can transfer it (or faster than the standby can replay it). The standby's WAL receiver has a fixed-size buffer (wal_receiver_buffer_size, default 64 MB); if the buffer fills, the WAL Sender throttles. Replay lag grows independently — the startup process is single-threaded for physical replication. Monitor with: <code>SELECT sent_lsn, write_lsn, flush_lsn, replay_lsn, now()-reply_time AS lag FROM pg_stat_replication</code>.`,
    },
    {
      q: 'What is the difference between streaming replication and logical replication?',
      a: `<strong>Physical (streaming) replication</strong> operates at the block level — it transfers raw WAL bytes that describe page changes. The standby applies identical changes to identical files. Consequence: the standby must be the exact same PostgreSQL major version, same architecture, and same on-disk format. You cannot replicate specific tables; you replicate the entire cluster.<br><br>
<strong>Logical replication</strong> decodes WAL into row-level operations (INSERT/UPDATE/DELETE on named tables) and streams those operations. The subscriber can be a different PostgreSQL major version (useful for zero-downtime upgrades), a different schema, or even a non-PostgreSQL subscriber. You can filter which tables or rows to replicate. The cost: decoding overhead on the primary, and DDL changes are not automatically replicated (you must manually apply schema changes to the subscriber).`,
    },
    {
      q: 'How would you design a high-availability setup for Amazon Prime Day with PostgreSQL?',
      a: `A production-grade HA setup for Prime Day includes:<br><br>
1. <strong>Primary + 2 synchronous standbys</strong> in different availability zones. Use <code>synchronous_standby_names = 'ANY 1 (standby1, standby2)'</code> — COMMIT waits for ANY 1 of the 2 standbys to confirm, balancing durability and latency.<br><br>
2. <strong>Patroni + etcd/Consul</strong> for automatic failover: Patroni monitors primary health via a DCS (Distributed Control System) and promotes the most up-to-date standby within ~30 seconds of primary failure. It handles the "brain split" problem by fencing the failed primary.<br><br>
3. <strong>HAProxy or PgBouncer</strong> in front for connection routing: primary port for writes, standby port for reads. Patroni updates HAProxy health-check endpoints automatically on failover.<br><br>
4. <strong>Pre-promote a warm standby</strong>: route ~20% of read traffic to the standby to keep it warm (pg_ctl -D ... promote is faster on a hot cache).`,
    },
  ]);
}

export function mount(container) {
  const shell = createModuleShell(container, {
    tag: 'Replication',
    title: 'Streaming Replication',
    subtitle: 'How PostgreSQL streams WAL from primary to standby for durability and failover',
    tabs: [
      { id:'anim',  label:'Replication Animation' },
      { id:'modes', label:'Replication Modes' },
      { id:'iq',    label:'Interview Q&A' },
    ],
  });
  const { tabs, body } = shell;
  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:320px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);
      const steps = REPL_STEPS.map((s,i) => ({ label:`Step ${i+1}`, duration:2600, mutate: st=>{ st.stepIdx=i; } }));
      const engine = new SimulationEngine({
        initialState:{stepIdx:0}, steps,
        onRender:(state,cnv) => {
          const ctx=cnv.getContext('2d'),pr=window.devicePixelRatio||1;
          cnv.width=cnv.clientWidth*pr; cnv.height=cnv.clientHeight*pr; ctx.scale(pr,pr);
          drawReplication(ctx, state.stepIdx, cnv.clientWidth, cnv.clientHeight);
        },
      });
      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));
      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);
      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = REPL_STEPS[i].desc; });
      desc.textContent = REPL_STEPS[0].desc;
      return () => engine.destroy();
    },
    modes: renderModesTab,
    iq:    renderIQ,
  });
  return null;
}
