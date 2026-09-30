// Module 14 — Backpressure
// Canvas animation: producer fills output buffers, credits drop to zero,
// upstream stalls. Drag a "processing speed" slider to control the consumer
// and watch backpressure propagate from sink all the way to the source.

const STAGES = [
  { id:'source',  label:'KafkaSource',  icon:'📥', color:'#6366f1' },
  { id:'keyby',   label:'keyBy',        icon:'🔑', color:'#f59e0b' },
  { id:'fraud',   label:'FraudDetect',  icon:'🔍', color:'#FF6B35' },
  { id:'sink',    label:'KafkaSink',    icon:'📤', color:'#10b981' },
];

const IQS = [
  { q:'What is backpressure in Flink and how does it propagate?', a:'Backpressure is the mechanism by which a slow downstream operator signals upstream operators to slow down. In Flink, it works via credit-based flow control over Netty: each receiver grants credits (buffer space) to senders. When the receiver\'s buffers fill up (e.g., FraudDetector is slow), it stops granting credits. The upstream operator\'s output queue fills, eventually blocking its processing thread. The block propagates all the way to the source, which slows its Kafka poll rate — naturally throttling ingestion to match processing capacity.' },
  { q:'What is credit-based flow control and why does Flink use it?', a:'Credit-based flow control is Flink\'s network-layer backpressure mechanism (introduced in Flink 1.5). Each downstream InputGate announces how many buffers (credits) it has available. The upstream ResultPartition only sends data when credits > 0, then decrements the credit count. When credits reach 0, the sender blocks. This prevents unbounded buffer growth and TCP window exhaustion. It also allows precise per-channel backpressure — a slow key\'s subtask only slows its upstream without affecting other subtasks.' },
  { q:'How can you identify backpressure in the Flink UI?', a:'The Flink UI\'s "Backpressure" tab shows a ratio (0.0–1.0) per subtask, sampled by the JobManager via thread dumps. A ratio of 0.0 means the subtask is never blocked (no backpressure); 1.0 means it\'s always waiting for downstream credits (fully backpressured). The metric backPressuredTimeMsPerSecond and idleTimeMsPerSecond complement this. If FraudDetector shows 0.9, the upstream keyBy will also show high backpressure because its output buffers fill up waiting for FraudDetector to drain them.' },
  { q:'What is the difference between backpressure and a slow source?', a:'A slow source means the pipeline is starved — there\'s not enough input data. The source subtask is mostly idle (idleTimeMsPerSecond is high). No backpressure occurs upstream because the consumer always has capacity. Backpressure is the opposite: too much data arriving faster than the consumer can process. The symptom is: source thread blocks in OutputFlusher.flush() rather than in poll(). Flink metrics distinguish these: busyTimeMsPerSecond vs idleTimeMsPerSecond vs backPressuredTimeMsPerSecond.' },
  { q:'What are your options when you detect sustained backpressure in production?', a:'In priority order: (1) Profile the bottleneck operator — is it CPU-bound, GC, blocking I/O, or hot-key skew? Fix the root cause first. (2) Increase parallelism of the bottleneck operator — scale horizontally. (3) Switch to async I/O (AsyncDataStream) if the bottleneck is external calls (DB, REST). (4) Enable RocksDB for large state if GC from heap state is the cause. (5) Enable operator chaining to eliminate network hops between co-located operators. (6) At Uber, they use Flink\'s Adaptive Scheduler which auto-rescales based on backpressure metrics.' },
];

export function mount(container) {
  let consumerSpeed = 80; // % of source speed
  let raf = null;
  let running = false;

  // Per-stage: outputCredits (0-100), bufferLevel (0-100), bpRatio (0-1)
  let state = STAGES.map(() => ({ credits: 100, buffer: 0, bp: 0, throughput: 0 }));
  let tick = 0;

  container.innerHTML = `
    <div class="module-hero">
      <div class="module-hero-content">
        <span class="module-badge">Module 14</span>
        <h1 class="module-title">Backpressure</h1>
        <p class="module-subtitle">Drag the consumer speed slider to throttle FraudDetector — watch credits drain and backpressure ripple all the way back to the Kafka source.</p>
      </div>
    </div>
    <div class="module-tabs">
      <button class="tab-btn active" data-tab="sim">Flow Visualizer</button>
      <button class="tab-btn" data-tab="concept">Concepts</button>
      <button class="tab-btn" data-tab="iq">Interview Q&amp;A</button>
    </div>

    <div class="tab-content active" data-tab="sim">
      <div class="bp-controls card">
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
          <div>
            <label class="ctrl-label">FraudDetector speed: <strong id="spd-val" style="color:var(--accent)">${consumerSpeed}%</strong></label>
            <div style="font-size:11px;color:var(--text-secondary);margin-top:2px">100% = full throughput · drag left to slow it down</div>
          </div>
          <input type="range" id="spd-slider" min="5" max="100" value="${consumerSpeed}" style="width:220px">
          <button class="btn btn-primary" id="bp-toggle">▶ Start</button>
          <button class="btn btn-secondary" id="bp-reset">↺ Reset</button>
        </div>
      </div>
      <div style="margin:20px 0;overflow-x:auto">
        <canvas id="bp-canvas" width="720" height="380" style="max-width:720px;width:100%;display:block;border-radius:10px;background:var(--surface2)"></canvas>
      </div>
      <div id="bp-metric-row" style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px"></div>
    </div>

    <div class="tab-content" data-tab="concept">
      <div class="grid-2 gap-20">
        <div class="card p-24">
          <h3 class="mb-12">Credit-Based Flow Control</h3>
          <p style="color:var(--text-secondary);line-height:1.7;margin:0 0 12px">Flink's network layer uses a <strong>credit system</strong>. Each InputGate tells its upstream ResultPartition how many buffer slots (credits) are available. The sender only transmits when credits > 0.</p>
          <div class="code-block fs-11"><pre>// Simplified credit flow:
// 1. Receiver announces N credits to sender
// 2. Sender transmits 1 buffer per credit
// 3. Credits drop to 0 → sender BLOCKS
// 4. Receiver drains buffer → grants more credits
// 5. Sender unblocks and resumes

// Config:
// taskmanager.network.memory.buffers-per-channel: 2
// taskmanager.network.memory.floating-buffers-per-gate: 8</pre></div>
        </div>
        <div class="card p-24">
          <h3 class="mb-12">Backpressure Propagation</h3>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${[
              ['FraudDetector slows','Processing time > event rate'],
              ['Output buffers fill','FraudDetector → Sink channel full'],
              ['Credits → 0','Sink stops granting credits to Fraud'],
              ['FraudDetector blocks','Thread stalls in network write'],
              ['keyBy buffers fill','keyBy→Fraud channel fills up'],
              ['keyBy blocks','keyBy thread stalls'],
              ['Source poll slows','Kafka poll rate drops naturally'],
              ['Cluster stays stable','No data loss, just slower throughput'],
            ].map(([t,d]) => `
              <div style="display:flex;gap:12px;font-size:12.5px">
                <span style="color:var(--accent);font-weight:700;white-space:nowrap">→ ${t}</span>
                <span class="t-sec">${d}</span>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="card p-24">
          <h3 class="mb-12">Detecting Backpressure</h3>
          <div class="code-block fs-11"><pre>// Flink metrics to watch:
// outPoolUsage      — output buffer utilization (0–1)
// inPoolUsage       — input buffer utilization (0–1)
// backPressuredTimeMsPerSecond
// busyTimeMsPerSecond
// idleTimeMsPerSecond

// Prometheus query for BP ratio:
flink_taskmanager_job_task_backPressuredTimeMsPerSecond
  / 1000
// > 0.5 = sustained backpressure → alert</pre></div>
          <div class="lc-uber-box mt-12">
            <div class="lc-uber-label">🚗 Uber Alert Rule</div>
            <p class="fs-12">Alert fires if any subtask has backPressuredTimeMsPerSecond > 700ms/s for 3 consecutive minutes. Auto-triggers parallelism scale-out via Adaptive Scheduler.</p>
          </div>
        </div>
        <div class="card p-24">
          <h3 class="mb-12">Fixing Backpressure</h3>
          ${[
            ['Profile first','jstack / async-profiler on the bottleneck TM — CPU? GC? I/O?'],
            ['Scale out','Increase operator parallelism for the bottleneck'],
            ['Async I/O','Replace blocking DB calls with AsyncDataStream'],
            ['State backend','Switch to RocksDB if GC from large heap state is culprit'],
            ['Hot keys','Re-key with composite key or pre-aggregate before keyBy'],
            ['Adaptive Scheduler','Flink 1.18+: auto-rescales based on throughput metrics'],
          ].map(([t,d]) => `
            <div style="display:flex;gap:10px;margin-bottom:10px;font-size:12.5px">
              <span style="color:var(--accent);font-weight:700;min-width:120px">${t}</span>
              <span class="t-sec">${d}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <div class="tab-content" data-tab="iq">
      <div class="iq-section" id="iq14-section"></div>
    </div>
  `;

  // Tabs
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      container.querySelector(`.tab-content[data-tab="${btn.dataset.tab}"]`).classList.add('active');
    });
  });

  // IQ
  const iqSec = container.querySelector('#iq14-section');
  iqSec.innerHTML = IQS.map((item, i) => `
    <div class="iq-item" id="iq14-${i}">
      <div class="iq-question" data-idx="${i}"><span>${item.q}</span><span class="iq-chevron">›</span></div>
      <div class="iq-answer">${item.a}</div>
    </div>
  `).join('');
  iqSec.querySelectorAll('.iq-question').forEach(q => {
    q.addEventListener('click', () => {
      const item = iqSec.querySelector(`#iq14-${q.dataset.idx}`);
      const open = item.classList.contains('open');
      iqSec.querySelectorAll('.iq-item').forEach(i => i.classList.remove('open'));
      if (!open) item.classList.add('open');
    });
  });

  const canvas = container.querySelector('#bp-canvas');
  const ctx = canvas.getContext('2d');
  const spdSlider = container.querySelector('#spd-slider');
  const spdVal = container.querySelector('#spd-val');
  const toggleBtn = container.querySelector('#bp-toggle');
  const resetBtn = container.querySelector('#bp-reset');

  spdSlider.addEventListener('input', () => {
    consumerSpeed = +spdSlider.value;
    spdVal.textContent = consumerSpeed + '%';
    spdVal.style.color = consumerSpeed < 40 ? '#ef4444' : consumerSpeed < 70 ? '#f59e0b' : '#10b981';
  });

  toggleBtn.addEventListener('click', () => {
    if (running) { running = false; cancelAnimationFrame(raf); toggleBtn.textContent = '▶ Start'; }
    else { running = true; toggleBtn.textContent = '⏸ Pause'; loop(); }
  });

  resetBtn.addEventListener('click', () => {
    running = false; cancelAnimationFrame(raf); toggleBtn.textContent = '▶ Start';
    tick = 0;
    state = STAGES.map(() => ({ credits:100, buffer:0, bp:0, throughput:0 }));
    render();
  });

  // Flowing particles
  let particles = [];
  function spawnParticle(fromIdx) {
    particles.push({ x: stageX(fromIdx) + 44, y: 190, toX: stageX(fromIdx+1) - 44, fromIdx, age:0, maxAge:30 });
  }

  const W = canvas.width, H = canvas.height;
  const stageX = i => 60 + i * 165;

  function loop() {
    if (!running) return;
    tick++;

    // Simulate credit-based flow:
    // FraudDetector consumes at consumerSpeed% of 100%
    // Source produces at 100%
    // Credits for each channel = (downstream buffer free space)

    const srcRate = 100;
    const fraudRate = consumerSpeed;

    // Buffer model: buffer accumulates if rate in > rate out
    // Source → keyBy buffer: capped by keyBy consumption speed
    // keyBy → fraud buffer: capped by fraud consumption speed

    // Compute BP for each stage from right to left
    state[3].buffer = Math.max(0, Math.min(100, state[3].buffer + (fraudRate - 90) * 0.3));
    state[3].credits = Math.max(0, 100 - state[3].buffer);
    state[3].bp = state[3].buffer / 100;
    state[3].throughput = Math.min(fraudRate, 90);

    state[2].buffer = Math.max(0, Math.min(100, state[2].buffer + (srcRate - fraudRate) * 0.4));
    state[2].credits = Math.max(0, 100 - state[2].buffer);
    state[2].bp = state[2].buffer / 100;
    state[2].throughput = fraudRate;

    // keyBy: limited by fraud detector
    const keybyOut = Math.min(srcRate, fraudRate + state[2].credits * 0.5);
    state[1].buffer = Math.max(0, Math.min(100, state[1].buffer + (srcRate - keybyOut) * 0.3));
    state[1].credits = Math.max(0, 100 - state[1].buffer);
    state[1].bp = state[1].buffer / 100;
    state[1].throughput = keybyOut;

    // Source: limited by keyBy accepting
    const srcOut = Math.min(srcRate, keybyOut + state[1].credits * 0.5);
    state[0].buffer = Math.max(0, Math.min(100, state[0].buffer + (srcRate - srcOut) * 0.2));
    state[0].credits = state[1].credits;
    state[0].bp = state[0].buffer / 100;
    state[0].throughput = srcOut;

    // Spawn particles
    if (tick % Math.max(1, Math.round(5 / (consumerSpeed / 100 + 0.1))) === 0) {
      spawnParticle(0);
    }

    particles.forEach(p => { p.x += (p.toX - stageX(p.fromIdx) - 44) / p.maxAge; p.age++; });
    particles = particles.filter(p => p.age < p.maxAge);

    render();
    raf = requestAnimationFrame(loop);
  }

  function bpColor(ratio) {
    if (ratio < 0.3) return '#10b981';
    if (ratio < 0.6) return '#f59e0b';
    return '#ef4444';
  }

  function render() {
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = 'var(--surface2)';

    // Connections + credit bars
    for (let i = 0; i < STAGES.length - 1; i++) {
      const ax = stageX(i) + 44, bx = stageX(i+1) - 44;
      const credits = state[i+1].credits;
      const creditColor = bpColor(1 - credits/100);

      // Channel pipe
      ctx.strokeStyle = '#ffffff15';
      ctx.lineWidth = 18;
      ctx.beginPath(); ctx.moveTo(ax, 190); ctx.lineTo(bx, 190); ctx.stroke();

      // Credit fill
      const fillW = (bx - ax) * (credits / 100);
      ctx.fillStyle = creditColor + '40';
      ctx.fillRect(ax, 181, fillW, 18);

      // Credit label
      ctx.font = '10px monospace';
      ctx.fillStyle = creditColor;
      ctx.textAlign = 'center';
      ctx.fillText(`credits: ${Math.round(credits)}`, (ax+bx)/2, 175);

      if (credits < 5) {
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = '#ef4444';
        ctx.fillText('⛔ BLOCKED', (ax+bx)/2, 215);
      }
    }

    // Particles
    particles.forEach(p => {
      const alpha = 1 - p.age / p.maxAge;
      ctx.beginPath();
      ctx.arc(p.x, 190, 5, 0, Math.PI*2);
      ctx.fillStyle = STAGES[p.fromIdx].color + Math.round(alpha * 255).toString(16).padStart(2,'0');
      ctx.fill();
    });

    // Operator nodes
    STAGES.forEach((op, i) => {
      const x = stageX(i);
      const bpRatio = state[i].bp;
      const c = bpColor(bpRatio);
      const bufLevel = state[i].buffer;

      // Glow
      if (bpRatio > 0.5) {
        const grd = ctx.createRadialGradient(x, 190, 20, x, 190, 60);
        grd.addColorStop(0, '#ef444440'); grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(x, 190, 60, 0, Math.PI*2); ctx.fill();
      }

      // Node circle
      ctx.beginPath(); ctx.arc(x, 190, 44, 0, Math.PI*2);
      ctx.fillStyle = op.color + '22';
      ctx.fill();
      ctx.strokeStyle = bpRatio > 0.5 ? '#ef4444' : op.color + '88';
      ctx.lineWidth = bpRatio > 0.5 ? 3 : 1.5;
      ctx.stroke();

      // Buffer ring
      ctx.beginPath();
      ctx.arc(x, 190, 44, -Math.PI/2, -Math.PI/2 + (bufLevel/100) * Math.PI * 2);
      ctx.strokeStyle = bpColor(bufLevel/100);
      ctx.lineWidth = 5;
      ctx.stroke();

      ctx.font = 'bold 18px sans-serif';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(op.icon, x, 197);

      ctx.font = '10px sans-serif';
      ctx.fillStyle = op.color + 'cc';
      ctx.fillText(op.label, x, 246);

      // BP badge
      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = c;
      ctx.fillText(`BP: ${Math.round(bpRatio*100)}%`, x, 264);

      // Throughput bar
      const barW = 80, barH = 8;
      const bx = x - barW/2, by = 278;
      ctx.fillStyle = '#ffffff15';
      ctx.fillRect(bx, by, barW, barH);
      ctx.fillStyle = bpColor(1 - state[i].throughput/100);
      ctx.fillRect(bx, by, barW * state[i].throughput/100, barH);
      ctx.font = '9px sans-serif';
      ctx.fillStyle = '#ffffff80';
      ctx.fillText(`${Math.round(state[i].throughput)}% throughput`, x, by+20);
    });

    // Title
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#ffffff40';
    ctx.textAlign = 'left';
    ctx.fillText('Buffer fill ring ○ — green: healthy · amber: moderate · red: backpressured', 20, 340);
    ctx.fillText('Credits bar ▬ — remaining downstream buffer capacity', 20, 356);

    // Metric cards
    const metricRow = container.querySelector('#bp-metric-row');
    if (metricRow) {
      metricRow.innerHTML = STAGES.map((op, i) => {
        const s = state[i];
        const c = bpColor(s.bp);
        return `
          <div class="card" style="padding:14px;border-top:3px solid ${c}">
            <div style="font-size:12px;font-weight:700;color:${op.color};margin-bottom:8px">${op.icon} ${op.label}</div>
            ${[['Backpressure', Math.round(s.bp*100)+'%', c],['Buffer',Math.round(s.buffer)+'%',bpColor(s.buffer/100)],['Credits',Math.round(s.credits)+'%','#10b981'],['Throughput',Math.round(s.throughput)+'%','var(--text)']].map(([k,v,vc]) => `
              <div style="display:flex;justify-content:space-between;font-size:11.5px;padding:3px 0;border-bottom:1px solid var(--border)">
                <span class="t-sec">${k}</span>
                <span style="color:${vc};font-weight:600">${v}</span>
              </div>
            `).join('')}
          </div>
        `;
      }).join('');
    }
  }

  render();
}
