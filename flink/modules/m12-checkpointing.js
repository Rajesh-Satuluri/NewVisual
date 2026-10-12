// Module 12 — Checkpointing & Barriers
// Canvas animation of Chandy-Lamport barrier flowing through a
// source → keyBy → process → sink pipeline. Each operator lights up
// when it aligns barriers and snapshots state to S3.

import { rideSpine, initRideSpine, rideCallout, scenarioList, pyCode } from '../components/story-ui.js';
import { casesByModule } from '../data/interview-cases.js';

const PIPELINE = [
  { id:'source',  label:'KafkaSource',  icon:'📥', x:80,  y:180, color:'#6366f1' },
  { id:'keyby',   label:'keyBy',        icon:'🔑', x:240, y:180, color:'#f59e0b' },
  { id:'fraud',   label:'FraudDetect',  icon:'🔍', x:400, y:180, color:'#FF6B35' },
  { id:'sink',    label:'KafkaSink',    icon:'📤', x:560, y:180, color:'#10b981' },
];

const PHASES = [
  { id:'idle',      label:'Idle',             color:'#6b7280' },
  { id:'barrier',   label:'Barrier injected', color:'#6366f1' },
  { id:'snapshot',  label:'Snapshotting',     color:'#f59e0b' },
  { id:'complete',  label:'Complete ✓',       color:'#10b981' },
];

const STEPS_TEXT = [
  '① CheckpointCoordinator sends triggerCheckpoint(id=42) to all sources.',
  '② KafkaSource records its Kafka offset, injects a barrier into each output partition.',
  '③ Barrier flows downstream. When keyBy receives barriers from ALL input channels, it snapshots its state.',
  '④ FraudDetector aligns barriers, snapshots per-driver ValueState (~750K entries) to S3.',
  '⑤ KafkaSink aligns barriers — for exactly-once, it pre-commits its open Kafka transaction.',
  '⑥ JobManager receives ACKs from all operators. Checkpoint 42 is COMPLETE. Kafka offsets committed.',
];

const IQS = [
  { q:'What is the Chandy-Lamport algorithm and how does Flink use it?', a:'Chandy-Lamport is a distributed snapshot algorithm that captures consistent global state without stopping the system. Flink adapts it: a barrier is injected into every source partition at the checkpoint trigger. When an operator receives barriers from ALL input channels, it takes a local snapshot (records its state). Because barriers flow with the data, each operator\'s snapshot captures exactly the state it had after processing all records that preceded the barrier — a consistent cut across the distributed pipeline.' },
  { q:'What is barrier alignment and what problem does it solve?', a:'Barrier alignment is the process of an operator waiting until it has received a checkpoint barrier from ALL its input channels before snapshotting. Without alignment, an operator might snapshot after processing some fast-channel records but before processing slow-channel records for the same checkpoint — capturing an inconsistent mix of pre- and post-barrier state. The downside of alignment is that during alignment, records from fast channels must be buffered, adding latency. Flink\'s "unaligned checkpoints" (Flink 1.11+) avoid this by including in-flight records in the checkpoint, allowing barriers to pass through immediately.' },
  { q:'What is the difference between aligned and unaligned checkpoints?', a:'Aligned checkpoints (classic) buffer records from faster channels while waiting for barriers from slower ones — zero state growth but adds latency under backpressure. Unaligned checkpoints (Flink 1.11+) let each barrier immediately pass through to downstream operators, regardless of other channels; the buffered in-flight records are included in the checkpoint snapshot. Unaligned checkpoints complete faster under backpressure but produce larger checkpoint sizes (in-flight records + state). Recommended for high-backpressure pipelines where checkpoint completion is lagging.' },
  { q:'How does Flink handle slow checkpoint completion?', a:'If a checkpoint takes longer than the checkpoint interval (e.g., interval=30s but snapshot takes 45s), Flink skips the next triggered checkpoint and tries again after the current one completes — checkpoints don\'t queue up. If a checkpoint misses the checkpoint timeout (default: no timeout unless configured), it is cancelled. Operators continue processing data during the checkpoint (asynchronous snapshot with copy-on-write). The job only fails if the checkpoint fails AND the restart strategy allows it — not just because it\'s slow.' },
  { q:'What state goes into a checkpoint for Uber\'s fraud pipeline?', a:'Each operator snapshots: (1) KafkaSource — partition offset map (tiny, <1KB per partition). (2) FraudDetector — all per-driver ValueState entries. At Uber scale (3M active drivers × ~200 bytes each = ~600MB). With HashMap backend, the full 600MB is serialized and uploaded to S3 every 30s. With RocksDB + incremental checkpoints, only the changed SSTables are uploaded — typically 5–20MB per checkpoint after the first full one. (3) KafkaSink — open transaction ID (tiny).' },
];

// ── "What & Why" foundations (additive) ──────────────────────────
const WHY_REASONS = [
  { icon: '💾', title: 'State lives in memory', body: 'FraudDetector holds ~600 MB of per-driver counts in RAM. A crash wipes it — a checkpoint periodically copies it to durable storage (S3).' },
  { icon: '📸', title: 'Consistent global snapshot', body: 'A barrier flows with the data so every operator snapshots the <em>same</em> logical point — a clean cut across the whole distributed pipeline (Chandy-Lamport).' },
  { icon: '🎯', title: 'Exactly-once recovery', body: 'Source offsets are saved <em>with</em> state, so on restart Flink rewinds Kafka and restores state together — no event lost or double-counted.' },
  { icon: '🏃', title: 'No stop-the-world', body: 'Snapshots are asynchronous (copy-on-write) — the pipeline keeps processing events while state uploads in the background.' },
  { icon: '📦', title: 'Incremental uploads', body: 'With RocksDB, only changed SSTables ship each cycle (~5–20 MB) instead of the full 600 MB — cheap enough to run every 30s.' },
  { icon: '⏮️', title: 'Bounded replay', body: 'Recovery restores the last checkpoint and replays only events since — seconds of rework, not reprocessing from the beginning of time.' },
];

const PROBLEMS = [
  { naive: 'Keep per-driver fraud state only in memory.', fail: 'A TaskManager crash <b>loses all state</b> — every driver\'s trip history is gone and fraud detection resets to zero.', fix: 'Checkpoints persist operator state to durable storage on a fixed interval.' },
  { naive: 'Snapshot each operator at its own wall-clock moment.', fail: 'Operators capture <b>inconsistent</b> points — some ahead, some behind — so the restored state doesn\'t correspond to any real instant.', fix: 'A checkpoint barrier flows with the records, giving one consistent global cut.' },
  { naive: 'Save state but not the Kafka read position.', fail: 'On restart the state and the source disagree — events get <b>reprocessed or skipped</b>, breaking exactly-once.', fix: 'Source offsets are part of the same checkpoint, restored atomically with state.' },
  { naive: 'Pause the pipeline to take a clean snapshot.', fail: 'Stopping a 1M-events/sec job every 30s to snapshot would <b>destroy throughput</b> and spike latency.', fix: 'Asynchronous, copy-on-write snapshots let processing continue during upload.' },
];

const WHY_HTML = `
  <div class="sm-wrap">
    <div class="sm-def card">
      <div class="sm-def-ic">📍</div>
      <div>
        <div class="sm-def-eyebrow">What is checkpointing?</div>
        <p class="sm-def-lead">A <b>checkpoint</b> is a periodic, consistent snapshot of <em>all</em> operator state plus each source's read position, written to durable storage so a failed job can resume exactly where it left off. <b>Barriers</b> are the in-stream markers that make that snapshot consistent <em>without stopping</em> the pipeline. On ride <b>R-4471</b>, it's what survives a mid-trip TaskManager crash (DEFECT-4) without losing the fraud counters.</p>
      </div>
    </div>

    <div class="section-header" style="margin:26px 0 12px">
      <div class="section-title">Why a long-running job needs it</div>
      <div class="section-desc">Streaming jobs run forever, and machines fail.</div>
    </div>
    <div class="sm-vs">
      <div class="sm-vs-card stateless">
        <div class="sm-vs-head">❌ Without checkpoints</div>
        <p class="sm-vs-sub">A crash is catastrophic.</p>
        <ul>
          <li>All in-memory state is lost</li>
          <li>Must replay from the very start</li>
          <li>Duplicates or gaps on restart</li>
        </ul>
        <div class="sm-vs-note">600 MB of per-driver history vanishes on one node failure.</div>
      </div>
      <div class="sm-vs-card stateful">
        <div class="sm-vs-head">✅ With checkpoints</div>
        <p class="sm-vs-sub">A crash is a few seconds of rework.</p>
        <ul>
          <li>State restored from last snapshot</li>
          <li>Kafka rewound to matching offsets</li>
          <li>Exactly-once preserved</li>
        </ul>
        <div class="sm-vs-note">Restore + replay-since = back online in seconds, no data lost.</div>
      </div>
    </div>

    <div class="section-header" style="margin:26px 0 12px">
      <div class="section-title">Why checkpointing is hard to get right</div>
      <div class="section-desc">Six properties a naïve "save to disk" loop can't deliver.</div>
    </div>
    <div class="sm-why-grid">
      ${WHY_REASONS.map(r => `
        <div class="sm-why">
          <div class="sm-why-ic">${r.icon}</div>
          <div class="sm-why-title">${r.title}</div>
          <p>${r.body}</p>
        </div>
      `).join('')}
    </div>

    <div class="section-header" style="margin:26px 0 12px">
      <div class="section-title">The problem checkpointing solves</div>
      <div class="section-desc">Four ways naïve persistence breaks a running pipeline — and the fix.</div>
    </div>
    <div class="sm-prob-list">
      ${PROBLEMS.map((p, i) => `
        <div class="sm-prob">
          <div class="sm-prob-no">${i + 1}</div>
          <div class="sm-prob-body">
            <div class="sm-prob-naive"><span class="sm-tag naive">Naïve</span>${p.naive}</div>
            <div class="sm-prob-fail"><span class="sm-tag fail">Breaks</span>${p.fail}</div>
            <div class="sm-prob-fix"><span class="sm-tag fix">Checkpoint</span>${p.fix}</div>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="section-header" style="margin:26px 0 12px">
      <div class="section-title">How a barrier makes it consistent</div>
    </div>
    <div class="sm-keyed card">
      <p>The trick is the <b>barrier</b> — a special marker injected into every source partition. It flows <em>with</em> the data, and each operator snapshots the instant it has seen the barrier on <b>all</b> its inputs (barrier alignment).</p>
      <ul>
        <li><b>Flows with records</b> — so every snapshot captures exactly the state after the same set of events.</li>
        <li><b>Alignment</b> — an operator waits for the barrier on all input channels before snapshotting, guaranteeing a clean cut.</li>
        <li><b>ACK to JobManager</b> — the checkpoint is "complete" only when every operator has acknowledged; then Kafka offsets commit.</li>
      </ul>
      <div class="sm-keyed-flow">
        <code>triggerCheckpoint</code> <span class="sm-arrow">→</span> source injects <b>barrier</b> <span class="sm-arrow">→</span> align + snapshot per operator <span class="sm-arrow">→</span> upload to S3 <span class="sm-arrow">→</span> <b>all ACK</b> <span class="sm-arrow">→</span> commit offsets
      </div>
    </div>

    <div class="sm-bridge" style="margin-top:26px">
      <div class="sm-bridge-txt">
        <div class="sm-bridge-k">Now watch the barrier flow</div>
        <p>You know <b>what</b> a checkpoint is and <b>why</b> — trigger checkpoint #42 and watch each operator align, snapshot, and ACK through Uber's fraud pipeline.</p>
      </div>
      <button class="sm-bridge-btn" data-jump="anim">Open the Barrier Animation →</button>
    </div>
  </div>
`;

export function mount(container) {
  let animStep = -1; // -1 = idle
  let animTimer = null;
  let opStates = { source:'idle', keyby:'idle', fraud:'idle', sink:'idle' };
  let barrierX = -1;
  let raf = null;
  let phase = 'idle';

  container.innerHTML = `
    ${rideSpine({ active: ['RIDE_STARTED'], incidents: ['DEFECT-4'] })}
    <div class="module-hero">
      <div class="module-hero-content">
        <span class="module-badge">Module 12</span>
        <h1 class="module-title">Checkpointing &amp; Barriers</h1>
        <p class="module-subtitle">Watch the Chandy-Lamport barrier flow through Uber's fraud pipeline — each operator lights up when it aligns barriers and snapshots state to S3.</p>
      </div>
    </div>
    <div class="module-tabs">
      <button class="tab-btn active" data-tab="why">What &amp; Why</button>
      <button class="tab-btn" data-tab="anim">Barrier Animation</button>
      <button class="tab-btn" data-tab="concept">How It Works</button>
      <button class="tab-btn" data-tab="iq">Interview Q&amp;A</button>
    </div>

    <div class="tab-content active" data-tab="why">
      ${WHY_HTML}
    </div>

    <div class="tab-content" data-tab="anim">
      <div class="card" style="padding:24px;margin-bottom:20px">
        <canvas id="ckpt-canvas" width="680" height="360" style="width:100%;max-width:680px;display:block;border-radius:8px;background:var(--surface2)"></canvas>
        <div style="display:flex;gap:12px;margin-top:16px;flex-wrap:wrap;align-items:center">
          <button class="btn btn-primary" id="ckpt-play">▶ Trigger Checkpoint #42</button>
          <button class="btn btn-secondary" id="ckpt-reset">↺ Reset</button>
          <div id="ckpt-step-text" style="font-size:13px;color:var(--text-secondary);flex:1;min-width:200px"></div>
        </div>
      </div>
      <div class="grid-2 gap-20">
        <div class="card p-20">
          <h4 class="mb-12">Checkpoint Phases</h4>
          ${PHASES.map(p => `
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
              <span style="width:12px;height:12px;border-radius:50%;background:${p.color};flex-shrink:0;display:inline-block"></span>
              <span style="font-size:13px;color:var(--text-secondary)">${p.label}</span>
            </div>
          `).join('')}
        </div>
        <div class="card p-20">
          <h4 class="mb-12">Uber Scale Numbers</h4>
          ${[
            ['Checkpoint interval','30 seconds'],
            ['FraudDetector state','~600 MB (3M drivers)'],
            ['Full ckpt upload','~8–12 seconds'],
            ['Incremental (RocksDB)','~2–4 seconds'],
            ['Kafka offset snapshot','<1 KB per partition'],
          ].map(([k,v]) => `
            <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12.5px">
              <span class="t-sec">${k}</span>
              <span style="color:var(--text);font-weight:600">${v}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <div class="tab-content" data-tab="concept">
      ${rideCallout('RIDE_STARTED', { openEvent: false })}
      <div class="grid-2 gap-20">
        <div class="card p-24">
          <h3 class="mb-12">Aligned vs Unaligned Checkpoints</h3>
          <div style="margin-bottom:12px">
            <div style="font-size:12px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;margin-bottom:6px">Aligned (Classic)</div>
            <p style="color:var(--text-secondary);font-size:13px;line-height:1.6">Wait for barriers from ALL inputs before snapshotting. Buffer records from fast channels during wait. Zero checkpoint size overhead. Best for low-latency pipelines.</p>
          </div>
          <div>
            <div style="font-size:12px;font-weight:700;color:var(--accent);text-transform:uppercase;margin-bottom:6px">Unaligned (Flink 1.11+)</div>
            <p style="color:var(--text-secondary);font-size:13px;line-height:1.6">Barrier passes immediately; in-flight records captured in checkpoint. No buffering delay. Larger checkpoint. Best under backpressure where aligned barriers stall.</p>
          </div>
          <div class="code-block fs-11"><span class="lang-tag">PyFlink</span><pre># Enable unaligned checkpoints (barriers overtake buffered data):
env.get_checkpoint_config().enable_unaligned_checkpoints()
# Or in flink-conf.yaml:
#   execution.checkpointing.unaligned: true</pre></div>
        </div>
        <div class="card p-24">
          <h3 class="mb-12">Checkpoint Configuration</h3>
          ${pyCode('checkpoint_config')}
        </div>
        <div class="card p-24">
          <h3 class="mb-12">Savepoints vs Checkpoints</h3>
          ${[
            ['Trigger','Automatic (periodic)','Manual (operator request)'],
            ['Purpose','Failure recovery','Job upgrades, migrations, A/B'],
            ['Format','Optimized (incremental OK)','Stable, portable'],
            ['Retention','Auto-deleted on new ckpt','Kept until manually deleted'],
            ['Uber use','Every 30s auto','Before every code deploy'],
          ].map(([f,c,s]) => `
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:11.5px">
              <span class="t-sec">${f}</span>
              <span style="color:#6366f1">${c}</span>
              <span style="color:#FF6B35">${s}</span>
            </div>
          `).join('')}
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;padding:4px 0;font-size:11px;font-weight:700;color:var(--text-secondary);margin-top:4px">
            <span></span><span>CHECKPOINT</span><span>SAVEPOINT</span>
          </div>
        </div>
        <div class="card p-24">
          <h3 class="mb-12">Restoring from a Savepoint</h3>
          ${pyCode('savepoint_uid')}
        </div>
      </div>
    </div>

    <div class="tab-content" data-tab="iq">
      <div class="section-header" style="margin-bottom:8px">
        <div class="section-title">Interview corner cases — on ride R-4471</div>
        <div class="section-desc">Checkpoint questions interviewers dig into, anchored to the mid-trip crash (DEFECT-4).</div>
      </div>
      <div id="ckpt-scenarios"></div>
      <div class="section-header" style="margin:22px 0 8px"><div class="section-title">More checkpoint Q&amp;A</div></div>
      <div class="iq-section" id="iq12-section"></div>
    </div>
  `;

  initRideSpine(container);
  const ckptScen = container.querySelector('#ckpt-scenarios');
  if (ckptScen) ckptScen.innerHTML = scenarioList(casesByModule('m12'));

  // Tabs
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      container.querySelector(`.tab-content[data-tab="${btn.dataset.tab}"]`).classList.add('active');
      if (btn.dataset.tab === 'anim') startIdleDraw();
    });
  });

  // Bridge button: jump from "What & Why" into the Barrier Animation tab.
  const jumpBtn = container.querySelector('[data-jump]');
  if (jumpBtn) {
    jumpBtn.addEventListener('click', () => {
      const target = jumpBtn.dataset.jump;
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === target));
      container.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.dataset.tab === target));
      container.querySelector('.module-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (target === 'anim') startIdleDraw();
    });
  }

  // IQ
  const iqSection = container.querySelector('#iq12-section');
  iqSection.innerHTML = IQS.map((item, i) => `
    <div class="iq-item" id="iq12-${i}">
      <div class="iq-question" data-idx="${i}"><span>${item.q}</span><span class="iq-chevron">›</span></div>
      <div class="iq-answer">${item.a}</div>
    </div>
  `).join('');
  iqSection.querySelectorAll('.iq-question').forEach(q => {
    q.addEventListener('click', () => {
      const item = iqSection.querySelector(`#iq12-${q.dataset.idx}`);
      const open = item.classList.contains('open');
      iqSection.querySelectorAll('.iq-item').forEach(i => i.classList.remove('open'));
      if (!open) item.classList.add('open');
    });
  });

  const canvas = container.querySelector('#ckpt-canvas');
  const ctx = canvas.getContext('2d');
  const stepText = container.querySelector('#ckpt-step-text');

  // Idle data dots
  let idleDots = Array.from({length: 6}, (_, i) => ({ x: 80 + i * 20, y: 180, speed: 2 + Math.random(), alive: true }));
  let rafIdle = null;
  let barrierPos = -1;
  let opPhase = { source:'idle', keyby:'idle', fraud:'idle', sink:'idle' };
  let animRunning = false;
  let currentStep = -1;

  function phaseColor(p) {
    return { idle:'#6b728055', barrier:'#6366f1', snapshot:'#f59e0b', complete:'#10b981' }[p] || '#6b728055';
  }

  function draw(barrierX) {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Background grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Connections
    for (let i = 0; i < PIPELINE.length - 1; i++) {
      const a = PIPELINE[i], b = PIPELINE[i+1];
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(a.x + 44, a.y); ctx.lineTo(b.x - 44, b.y); ctx.stroke();

      // Arrow
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      const mx = (a.x + b.x) / 2;
      ctx.beginPath(); ctx.moveTo(mx + 6, a.y); ctx.lineTo(mx, a.y - 5); ctx.lineTo(mx, a.y + 5); ctx.closePath(); ctx.fill();
    }

    // Idle data dots
    if (!animRunning) {
      idleDots.forEach(d => {
        ctx.beginPath();
        ctx.arc(d.x, d.y, 4, 0, Math.PI*2);
        ctx.fillStyle = '#ffffff30';
        ctx.fill();
      });
    }

    // Operator nodes
    PIPELINE.forEach(op => {
      const phase = opPhase[op.id];
      const c = phase === 'idle' ? op.color : phaseColor(phase);
      const glow = phase !== 'idle';

      if (glow) {
        const grad = ctx.createRadialGradient(op.x, op.y, 20, op.x, op.y, 60);
        grad.addColorStop(0, c + '55');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(op.x, op.y, 60, 0, Math.PI*2); ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(op.x, op.y, 44, 0, Math.PI*2);
      ctx.fillStyle = phase === 'idle' ? op.color + '22' : c + '33';
      ctx.fill();
      ctx.strokeStyle = phase === 'idle' ? op.color + '88' : c;
      ctx.lineWidth = phase !== 'idle' ? 3 : 1.5;
      ctx.setLineDash(phase === 'snapshot' ? [6,3] : []);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(op.icon, op.x, op.y + 7);

      ctx.font = '10px sans-serif';
      ctx.fillStyle = phase === 'idle' ? op.color + 'aa' : c;
      ctx.fillText(op.label, op.x, op.y + 62);

      if (phase === 'complete') {
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = '#10b981';
        ctx.fillText('✓ ACK', op.x, op.y - 54);
      }
      if (phase === 'snapshot') {
        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#f59e0b';
        ctx.fillText('📸 snap...', op.x, op.y - 54);
      }
    });

    // Barrier line
    if (barrierX > 0) {
      ctx.strokeStyle = '#FF6B35';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 4]);
      ctx.beginPath(); ctx.moveTo(barrierX, 60); ctx.lineTo(barrierX, 300); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#FF6B35';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('BARRIER #42', barrierX, 50);
    }

    // S3 icon when checkpointing
    if (opPhase.fraud === 'snapshot' || opPhase.fraud === 'complete') {
      ctx.font = '20px sans-serif';
      ctx.fillText('🪣', 400, 310);
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#f59e0b';
      ctx.fillText('S3 upload...', 400, 330);
    }

    // JM complete badge
    if (opPhase.sink === 'complete') {
      ctx.fillStyle = '#10b98122';
      roundRect(ctx, 220, 20, 240, 28, 8);
      ctx.fill();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#10b981';
      ctx.textAlign = 'center';
      ctx.fillText('✓ Checkpoint #42 COMPLETE', 340, 38);
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r, y); ctx.lineTo(x+w-r, y);
    ctx.arcTo(x+w, y, x+w, y+r, r);
    ctx.lineTo(x+w, y+h-r); ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
    ctx.lineTo(x+r, y+h); ctx.arcTo(x, y+h, x, y+h-r, r);
    ctx.lineTo(x, y+r); ctx.arcTo(x, y, x+r, y, r);
    ctx.closePath();
  }

  function startIdleDraw() {
    if (rafIdle) return;
    function loop() {
      if (animRunning) { rafIdle = null; return; }
      idleDots.forEach(d => {
        d.x += d.speed;
        if (d.x > 640) { d.x = 60; d.y = 180 + (Math.random()-0.5)*20; }
      });
      draw(-1);
      rafIdle = requestAnimationFrame(loop);
    }
    loop();
  }

  function runAnimation() {
    animRunning = true;
    cancelAnimationFrame(rafIdle); rafIdle = null;
    barrierPos = 80;
    opPhase = { source:'idle', keyby:'idle', fraud:'idle', sink:'idle' };
    currentStep = 0;

    const TIMELINE = [
      { t:0,   action: () => { stepText.textContent = STEPS_TEXT[0]; } },
      { t:400, action: () => { opPhase.source='barrier'; stepText.textContent = STEPS_TEXT[1]; } },
      { t:900, action: () => { opPhase.source='snapshot'; } },
      { t:1400,action: () => { opPhase.source='complete'; stepText.textContent = STEPS_TEXT[2]; } },
      { t:1800,action: () => { opPhase.keyby='barrier'; } },
      { t:2200,action: () => { opPhase.keyby='snapshot'; } },
      { t:2700,action: () => { opPhase.keyby='complete'; stepText.textContent = STEPS_TEXT[3]; } },
      { t:3100,action: () => { opPhase.fraud='barrier'; } },
      { t:3600,action: () => { opPhase.fraud='snapshot'; } },
      { t:4400,action: () => { opPhase.fraud='complete'; stepText.textContent = STEPS_TEXT[4]; } },
      { t:4800,action: () => { opPhase.sink='barrier'; } },
      { t:5200,action: () => { opPhase.sink='snapshot'; } },
      { t:5800,action: () => { opPhase.sink='complete'; stepText.textContent = STEPS_TEXT[5]; animRunning = false; } },
    ];

    const start = performance.now();
    let tIdx = 0;

    function animate(now) {
      const elapsed = now - start;
      while (tIdx < TIMELINE.length && elapsed >= TIMELINE[tIdx].t) {
        TIMELINE[tIdx].action();
        tIdx++;
      }

      // Advance barrier
      const targets = [80, 240, 400, 560];
      let targetX = 80;
      if (opPhase.source !== 'idle') targetX = 160;
      if (opPhase.keyby !== 'idle' || elapsed > 1600) targetX = 240;
      if (opPhase.keyby === 'complete' || elapsed > 2600) targetX = 340;
      if (opPhase.fraud !== 'idle' || elapsed > 3000) targetX = 400;
      if (opPhase.fraud === 'complete' || elapsed > 4200) targetX = 480;
      if (opPhase.sink !== 'idle' || elapsed > 4600) targetX = 560;
      if (opPhase.sink === 'complete') targetX = 700;

      barrierPos += (targetX - barrierPos) * 0.08;
      if (barrierPos > 680) barrierPos = -1;
      draw(barrierPos < 680 ? barrierPos : -1);

      if (elapsed < 6200 || animRunning) requestAnimationFrame(animate);
      else { draw(-1); startIdleDraw(); }
    }

    requestAnimationFrame(animate);
  }

  container.querySelector('#ckpt-play').addEventListener('click', () => {
    opPhase = { source:'idle', keyby:'idle', fraud:'idle', sink:'idle' };
    stepText.textContent = '';
    runAnimation();
  });

  container.querySelector('#ckpt-reset').addEventListener('click', () => {
    animRunning = false;
    opPhase = { source:'idle', keyby:'idle', fraud:'idle', sink:'idle' };
    barrierPos = -1;
    stepText.textContent = '';
    draw(-1);
    startIdleDraw();
  });

  draw(-1);
  startIdleDraw();
}
