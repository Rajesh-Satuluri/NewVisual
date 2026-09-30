import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { SimulationEngine } from '../components/simulation-engine.js';

/* ── Step data ─────────────────────────────────────────────────────────────── */
// Buffer pool pages: { id, pageNo, dirty, flushed, recycled }
// WAL segments: { seg, lsn, state: 'old'|'active'|'recycle' }
const CKPT_STEPS = [
  {
    pages: [
      { id:1, pageNo:'5:2',  dirty:true,  flushed:false },
      { id:2, pageNo:'7:1',  dirty:true,  flushed:false },
      { id:3, pageNo:'3:4',  dirty:false, flushed:false },
      { id:4, pageNo:'9:6',  dirty:true,  flushed:false },
      { id:5, pageNo:'12:3', dirty:false, flushed:false },
      { id:6, pageNo:'1:8',  dirty:true,  flushed:false },
    ],
    wals: [
      { seg:'000001', lsn:'0/00..', state:'old'   },
      { seg:'000002', lsn:'0/10..', state:'old'   },
      { seg:'000003', lsn:'0/20..', state:'active' },
    ],
    ckptLsn: null, spreading: false,
    desc: 'Steady state: buffer pool holds dirty pages from past writes. WAL segments 000001 and 000002 are required for recovery in case of crash. No checkpoint has run recently.',
  },
  {
    pages: [
      { id:1, pageNo:'5:2',  dirty:true,  flushed:false },
      { id:2, pageNo:'7:1',  dirty:true,  flushed:false },
      { id:3, pageNo:'3:4',  dirty:false, flushed:false },
      { id:4, pageNo:'9:6',  dirty:true,  flushed:false },
      { id:5, pageNo:'12:3', dirty:false, flushed:false },
      { id:6, pageNo:'1:8',  dirty:true,  flushed:false },
    ],
    wals: [
      { seg:'000001', lsn:'0/00..', state:'old'   },
      { seg:'000002', lsn:'0/10..', state:'old'   },
      { seg:'000003', lsn:'0/20..', state:'active' },
      { seg:'000004', lsn:'0/30..', state:'new'   },
    ],
    ckptLsn: '0/30000000', spreading: true,
    desc: 'CHECKPOINT initiated (by autovacuum, pg_checkpoint(), or checkpoint_timeout). A CHECKPOINT WAL record is written at LSN 0/30. The checkpointer begins writing dirty pages — spread over checkpoint_completion_target to reduce I/O spike.',
  },
  {
    pages: [
      { id:1, pageNo:'5:2',  dirty:false, flushed:true  },
      { id:2, pageNo:'7:1',  dirty:true,  flushed:false },
      { id:3, pageNo:'3:4',  dirty:false, flushed:false },
      { id:4, pageNo:'9:6',  dirty:false, flushed:true  },
      { id:5, pageNo:'12:3', dirty:false, flushed:false },
      { id:6, pageNo:'1:8',  dirty:true,  flushed:false },
    ],
    wals: [
      { seg:'000001', lsn:'0/00..', state:'old'   },
      { seg:'000002', lsn:'0/10..', state:'old'   },
      { seg:'000003', lsn:'0/20..', state:'active' },
      { seg:'000004', lsn:'0/30..', state:'active' },
    ],
    ckptLsn: '0/30000000', spreading: true,
    desc: 'Checkpointer flushes pages 5:2 and 9:6 to disk. Dirty bit cleared. This is the "fuzzy checkpoint" phase — normal queries continue while the checkpointer works in the background.',
  },
  {
    pages: [
      { id:1, pageNo:'5:2',  dirty:false, flushed:true  },
      { id:2, pageNo:'7:1',  dirty:false, flushed:true  },
      { id:3, pageNo:'3:4',  dirty:false, flushed:false },
      { id:4, pageNo:'9:6',  dirty:false, flushed:true  },
      { id:5, pageNo:'12:3', dirty:false, flushed:false },
      { id:6, pageNo:'1:8',  dirty:false, flushed:true  },
    ],
    wals: [
      { seg:'000001', lsn:'0/00..', state:'old'   },
      { seg:'000002', lsn:'0/10..', state:'old'   },
      { seg:'000003', lsn:'0/20..', state:'active' },
      { seg:'000004', lsn:'0/30..', state:'active' },
    ],
    ckptLsn: '0/30000000', spreading: false,
    desc: 'All dirty pages flushed. pg_control is updated with the new checkpointLSN = 0/30. An end-of-checkpoint WAL record is written. Now recovery can start from LSN 0/30 — not from the beginning of the WAL.',
  },
  {
    pages: [
      { id:1, pageNo:'5:2',  dirty:false, flushed:true  },
      { id:2, pageNo:'7:1',  dirty:false, flushed:true  },
      { id:3, pageNo:'3:4',  dirty:false, flushed:false },
      { id:4, pageNo:'9:6',  dirty:false, flushed:true  },
      { id:5, pageNo:'12:3', dirty:false, flushed:false },
      { id:6, pageNo:'1:8',  dirty:false, flushed:true  },
    ],
    wals: [
      { seg:'000001', lsn:'0/00..', state:'recycle' },
      { seg:'000002', lsn:'0/10..', state:'recycle' },
      { seg:'000003', lsn:'0/20..', state:'active' },
      { seg:'000004', lsn:'0/30..', state:'active' },
    ],
    ckptLsn: '0/30000000', spreading: false,
    desc: 'WAL segments 000001 and 000002 can now be recycled — they are no longer needed for crash recovery because all their changes are safely on disk. Recycled segments are renamed for reuse (no allocation overhead).',
  },
];

/* ── Canvas ──────────────────────────────────────────────────────────────────*/
function drawCheckpoints(ctx, stepIdx, w, h) {
  const step = CKPT_STEPS[stepIdx];
  ctx.clearRect(0, 0, w, h);

  // ── Checkpoint LSN indicator ──
  if (step.ckptLsn) {
    ctx.fillStyle = '#06B6D422'; ctx.strokeStyle = '#06B6D4'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(16, 8, 260, 22, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#06B6D4'; ctx.font = '700 10px system-ui'; ctx.textAlign = 'left';
    ctx.fillText('Checkpoint LSN: ' + step.ckptLsn, 26, 22);
    if (step.spreading) {
      ctx.fillStyle = '#F59E0B'; ctx.fillText('  ← checkpoint in progress', 200, 22);
    }
  }

  // ── Buffer Pool ──
  const bpX = 16, bpY = 38, bpW = w * 0.55 - 8;
  const cols = 3, pageW = (bpW - 20) / cols, pageH = 52;
  const rows = Math.ceil(step.pages.length / cols);
  const bpH = rows * pageH + 34;

  ctx.fillStyle = '#0F172A'; ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(bpX, bpY, bpW, bpH, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#475569'; ctx.font = '700 10px system-ui'; ctx.textAlign = 'left';
  ctx.fillText('BUFFER POOL (shared_buffers)', bpX + 10, bpY + 18);

  step.pages.forEach((pg, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const px = bpX + 10 + col * pageW, py = bpY + 24 + row * pageH;
    const color = pg.flushed ? '#10B981' : pg.dirty ? '#EF4444' : '#334155';

    ctx.fillStyle = color + '22'; ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(px, py, pageW - 8, pageH - 8, 4); ctx.fill(); ctx.stroke();

    ctx.fillStyle = color; ctx.font = '700 9px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('page ' + pg.pageNo, px + (pageW - 8) / 2, py + 16);
    ctx.fillStyle = '#94A3B8'; ctx.font = '8px system-ui';
    ctx.fillText(pg.flushed ? 'FLUSHED ✓' : pg.dirty ? 'DIRTY' : 'CLEAN', px + (pageW - 8) / 2, py + 30);
  });

  // ── WAL Segments ──
  const walX = w * 0.55 + 4, walY = bpY, walW = w - walX - 16;
  const segH = 36, walH = step.wals.length * segH + 34;

  ctx.fillStyle = '#0F172A'; ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(walX, walY, walW, walH, 6); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#475569'; ctx.font = '700 10px system-ui'; ctx.textAlign = 'left';
  ctx.fillText('WAL SEGMENTS', walX + 10, walY + 18);

  const stateColor = { old:'#EF4444', active:'#10B981', new:'#F59E0B', recycle:'#64748B' };
  const stateLabel = { old:'required', active:'active', new:'checkpoint', recycle:'RECYCLED' };

  step.wals.forEach((seg, i) => {
    const sy = walY + 24 + i * segH;
    const sc = stateColor[seg.state];
    ctx.fillStyle = sc + '22'; ctx.strokeStyle = sc; ctx.lineWidth = seg.state === 'new' ? 2 : 1;
    ctx.setLineDash(seg.state === 'new' ? [4,3] : []);
    ctx.beginPath(); ctx.roundRect(walX + 8, sy, walW - 16, segH - 4, 4); ctx.fill(); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = sc; ctx.font = '700 9px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(seg.seg + '  [' + seg.lsn + ']', walX + 16, sy + 15);
    ctx.fillStyle = '#64748B'; ctx.font = '8px system-ui';
    ctx.fillText(stateLabel[seg.state], walX + 16, sy + 27);

    if (seg.state === 'recycle') {
      ctx.strokeStyle = '#64748B'; ctx.lineWidth = 0.5; ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.moveTo(walX + 8, sy + 15); ctx.lineTo(walX + walW - 16, sy + 15); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  });

  // ── Legend ──
  const ley = bpY + bpH + 12;
  const legend = [['#10B981','Flushed to disk'],['#EF4444','Dirty (not flushed)'],['#334155','Clean']];
  legend.forEach(([c, l], i) => {
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(bpX + 12 + i * 140, ley + 8, 5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#64748B'; ctx.font = '9px system-ui'; ctx.textAlign = 'left';
    ctx.fillText(l, bpX + 22 + i * 140, ley + 12);
  });
  ctx.textAlign = 'left';
}

/* ── Config tab ─────────────────────────────────────────────────────────────*/
function renderConfigTab(panel) {
  panel.innerHTML = `
<div style="padding:20px;max-width:780px;font-family:system-ui;font-size:13px;color:#CBD5E1;line-height:1.6">
  <h3 style="margin:0 0 16px;color:#E2E8F0;font-size:15px">Checkpoint Configuration</h3>
  <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:20px">
    <thead><tr style="background:#0F172A">
      <th style="padding:8px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Parameter</th>
      <th style="padding:8px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Default</th>
      <th style="padding:8px 10px;text-align:left;color:#64748B;border-bottom:1px solid #1E293B">Impact</th>
    </tr></thead>
    <tbody>
      ${[
        ['checkpoint_timeout','5min','Maximum time between automatic checkpoints. Lower = shorter recovery time, more I/O.'],
        ['max_wal_size','1 GB','Forces checkpoint if WAL grows beyond this. Increase for write-heavy workloads.'],
        ['checkpoint_completion_target','0.9','Fraction of checkpoint_timeout to spread dirty-page writes over. 0.9 = writes over 90% of timeout.'],
        ['min_wal_size','80 MB','Minimum WAL disk space. Keeps segments pre-allocated to avoid allocation overhead.'],
        ['wal_buffers','64 MB (auto)','Shared memory for WAL data before it is written to disk. Increase for very write-heavy workloads.'],
      ].map(([p,d,e]) => `
        <tr style="border-bottom:1px solid #0F172A">
          <td style="padding:7px 10px;color:#F59E0B;font-family:monospace;font-size:10.5px">${p}</td>
          <td style="padding:7px 10px;color:#64748B">${d}</td>
          <td style="padding:7px 10px">${e}</td>
        </tr>`).join('')}
    </tbody>
  </table>

  <h3 style="margin:0 0 12px;color:#E2E8F0;font-size:15px">Recovery Time vs Checkpoint Frequency</h3>
  <div style="background:#0F172A;border:1px solid #1E293B;border-radius:6px;padding:14px;font-size:12px;color:#94A3B8">
    <p style="margin:0 0 8px">Recovery time ∝ WAL replayed = (crash_LSN − checkpoint_LSN).</p>
    <p style="margin:0 0 8px">Shorter <code style="color:#A78BFA">checkpoint_timeout</code> → more frequent checkpoints → less WAL to replay on crash → faster recovery.</p>
    <p style="margin:0">But: more frequent checkpoints = more disk I/O for flushing dirty pages. For Prime Day: set <code style="color:#A78BFA">checkpoint_timeout=2min</code> and <code style="color:#A78BFA">max_wal_size=4GB</code> — accept more I/O for faster crash recovery during the peak event.</p>
  </div>
</div>`;
}

function renderIQ(panel) {
  const iq = createIQSection();
  panel.appendChild(iq.el);
  initIQ(iq, [
    {
      q: 'What is a "fuzzy checkpoint" and why does PostgreSQL use it?',
      a: `A <strong>fuzzy checkpoint</strong> allows normal reads and writes to continue while the checkpoint is in progress. The checkpointer identifies all dirty pages at the start, then flushes them to disk over a configurable time window (<code>checkpoint_completion_target × checkpoint_timeout</code>). New writes that occur during the checkpoint are tracked and can be considered part of the NEXT checkpoint cycle.<br><br>
The alternative — a "sharp checkpoint" — would pause all writes until all dirty pages are flushed, causing a severe write stall. PostgreSQL's fuzzy checkpoint trades a slightly longer recovery window (WAL records written during the checkpoint must also be replayed) for uninterrupted operation. The key insight: recovery can handle replaying some extra WAL records, but a write stall during Prime Day is unacceptable.`,
    },
    {
      q: 'How does PostgreSQL know which WAL segments are safe to recycle after a checkpoint?',
      a: `After a checkpoint completes, PostgreSQL updates pg_control with the new <strong>checkpointLSN</strong>. Any WAL segment whose LSN range falls entirely BEFORE checkpointLSN can be recycled — all pages modified in those segments have been confirmed on disk (because the checkpoint flushed them and then updated pg_control atomically).<br><br>
PostgreSQL recycles rather than deletes: the segment file is renamed to the next expected segment name. This avoids filesystem allocation overhead and keeps WAL writes sequential. The total WAL disk usage is bounded by <code>max_wal_size</code> — once that limit is reached, a checkpoint is forced to make room. Monitoring: <code>SELECT * FROM pg_ls_waldir() ORDER BY modification DESC LIMIT 20</code> shows current WAL file usage.`,
    },
    {
      q: 'What causes a "checkpoint occurring too frequently" warning, and how do you fix it?',
      a: `The warning appears in PostgreSQL logs when checkpoints are triggered by WAL growth (hitting <code>max_wal_size</code>) rather than by <code>checkpoint_timeout</code>. It means your workload generates WAL faster than the checkpointer can flush dirty pages, so the checkpoint cycle is forced prematurely.<br><br>
Fixes: (1) <strong>Increase <code>max_wal_size</code></strong> (e.g., 4–8 GB for Prime Day) to allow more WAL before forcing a checkpoint; (2) <strong>Increase <code>checkpoint_completion_target</code> to 0.9</strong> so dirty pages are flushed more aggressively over the checkpoint window; (3) <strong>Faster storage</strong> — NVMe SSDs can sustain higher checkpoint write throughput; (4) <strong>Separate WAL disk</strong> — putting WAL on a dedicated volume avoids I/O contention with checkpoint writes. Monitor with: <code>SELECT checkpoints_req, checkpoints_timed FROM pg_stat_bgwriter</code> — high checkpoints_req indicates WAL-driven checkpoints.`,
    },
  ]);
}

export function mount(container) {
  const shell = createModuleShell(container, {
    tag: 'Recovery',
    title: 'Checkpoints',
    subtitle: 'How PostgreSQL periodically flushes dirty pages to enable fast crash recovery and WAL recycling',
    tabs: [
      { id:'anim',   label:'Checkpoint Animation' },
      { id:'config', label:'Configuration' },
      { id:'iq',     label:'Interview Q&A' },
    ],
  });
  const { tabs, body } = shell;
  initTabs(tabs, body, {
    anim: panel => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'width:100%;height:320px;display:block;background:#0A0F1A;border-radius:8px';
      panel.appendChild(canvas);
      const steps = CKPT_STEPS.map((s,i) => ({ label:`Step ${i+1}`, duration:2800, mutate: st => { st.stepIdx=i; } }));
      const engine = new SimulationEngine({
        initialState:{stepIdx:0}, steps,
        onRender:(state,cnv) => {
          const ctx=cnv.getContext('2d'),pr=window.devicePixelRatio||1;
          cnv.width=cnv.clientWidth*pr; cnv.height=cnv.clientHeight*pr; ctx.scale(pr,pr);
          drawCheckpoints(ctx, state.stepIdx, cnv.clientWidth, cnv.clientHeight);
        },
      });
      panel.appendChild(SimulationEngine.renderControls(engine));
      panel.appendChild(SimulationEngine.renderTimeline(engine, steps));
      const desc = document.createElement('div');
      desc.style.cssText = 'margin-top:10px;padding:10px 14px;background:#0F172A;border-radius:6px;font-size:12px;color:#94A3B8;line-height:1.55';
      panel.appendChild(desc);
      engine.attach(canvas);
      engine.on('step', i => { desc.textContent = CKPT_STEPS[i].desc; });
      desc.textContent = CKPT_STEPS[0].desc;
      return () => engine.destroy();
    },
    config: renderConfigTab,
    iq:     renderIQ,
  });
  return null;
}
