// Module 5 — Parallelism & Slot Sharing
// Canvas-based visualizer: drag parallelism slider, watch subtask tiles
// redistribute across TaskManagers and slots in real time.

import { rideSpine, initRideSpine, rideCallout, scenarioList } from '../components/story-ui.js';
import { casesByModule } from '../data/interview-cases.js';

const OPERATORS = [
  { id: 'source',   label: 'KafkaSource',    color: '#6366f1', icon: '📥' },
  { id: 'keyby',    label: 'keyBy(driverId)',  color: '#f59e0b', icon: '🔑' },
  { id: 'fraud',    label: 'FraudDetector',   color: '#FF6B35', icon: '🔍' },
  { id: 'sink',     label: 'KafkaSink',       color: '#10b981', icon: '📤' },
];

const TM_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

const IQS = [
  { q: 'What determines the maximum parallelism a job can run at?', a: 'The number of available task slots across all connected TaskManagers. Each subtask needs exactly one slot. If a pipeline has operators at parallelism P₁, P₂, P₃, Flink needs max(P₁, P₂, P₃) slots when slot sharing is enabled (default), or sum(P₁+P₂+P₃) without it. At Uber, they size the cluster so max operator parallelism × safety-buffer slots are always available.' },
  { q: 'What is slot sharing and why is it on by default?', a: 'Slot sharing allows all operators of the same job to co-locate in a single slot, even across the operator chain. This means a pipeline of 4 operators at parallelism 4 needs only 4 slots instead of 16. Benefits: (1) better resource utilization, (2) all operators of a pipeline run in the same JVM → local data hand-off without serialization, (3) naturally creates balanced "pipeline slices" across TMs.' },
  { q: 'When would you increase parallelism for only one operator?', a: 'When that operator is the bottleneck — e.g., a heavy stateful window operation. Flink allows heterogeneous parallelism: keyBy().window().aggregate() can run at p=8 while source/sink stay at p=4. Flink adds a shuffle (data exchange) step wherever parallelism changes. Uber does this for their fare-calculation window aggregation, which runs at 2× source parallelism to keep up with peak-hour traffic.' },
  { q: 'What is operator chaining and how does it interact with parallelism?', a: 'Flink chains consecutive operators in the same subtask when they have the same parallelism and the connecting edge is FORWARD (1-to-1 mapping). Chained operators run in a single thread: source → map → filter as one chain avoids serializing records between them. Parallelism is then the number of parallel chains. You can disable chaining per-operator (disableChaining()) or globally (env.disableOperatorChaining()) to aid debugging.' },
  { q: 'How does Flink handle backpressure when one operator is slow?', a: 'Flink uses credit-based flow control over Netty. A fast upstream operator that fills its output buffers will block — no unbounded queuing. This backpressure signal propagates upstream all the way to the source, which then slows its Kafka poll rate. The Flink UI shows "backpressure ratio" per subtask. Uber monitors this metric; if FraudDetector backpressure > 50%, they auto-scale that operator\'s parallelism via Flink\'s Adaptive Scheduler.' },
];

export function mount(container) {
  let parallelism = 2;
  let slotSharing = true;
  let selectedOp = null;

  container.innerHTML = `
    ${rideSpine({ active: ['DRIVER_SEARCHING', 'LOCATION_UPDATED'], incidents: ['DEFECT-6'] })}
    <div class="module-hero">
      <div class="module-hero-content">
        <span class="module-badge">Module 5</span>
        <h1 class="module-title">Parallelism &amp; Slot Sharing</h1>
        <p class="module-subtitle">See how Flink distributes operator subtasks across TaskManagers — and why slot sharing cuts your cluster size in half.</p>
      </div>
    </div>
    <div class="module-tabs">
      <button class="tab-btn active" data-tab="sim">Visualizer</button>
      <button class="tab-btn" data-tab="concept">Concepts</button>
      <button class="tab-btn" data-tab="iq">Interview Q&amp;A</button>
    </div>

    <div class="tab-content active" data-tab="sim">
      <div class="p5-controls card" style="display:flex;flex-wrap:wrap;gap:20px;align-items:center;margin-bottom:20px;padding:20px">
        <div class="p5-ctrl-group">
          <label class="ctrl-label">Parallelism: <strong id="p-val">2</strong></label>
          <input type="range" id="p-slider" min="1" max="6" value="2" style="width:160px">
        </div>
        <div class="p5-ctrl-group">
          <label class="ctrl-label">TaskManagers: <strong id="tm-val">2</strong></label>
          <input type="range" id="tm-slider" min="1" max="4" value="2" style="width:140px">
        </div>
        <div style="display:flex;align-items:center;gap:10px">
          <label class="ctrl-label">Slot Sharing</label>
          <button id="sharing-toggle" class="btn btn-primary" style="min-width:80px">ON</button>
        </div>
        <div class="p5-stat-row" id="slot-stats"></div>
      </div>
      <div id="p5-canvas-wrap" style="overflow-x:auto;min-height:320px"></div>
      <div id="subtask-table-wrap" style="margin-top:20px"></div>
    </div>

    <div class="tab-content" data-tab="concept">
      ${rideCallout('DRIVER_SEARCHING', { openEvent: false })}
      <div class="grid-2 gap-20">
        <div class="card p-24">
          <h3 class="mb-12">What is Parallelism?</h3>
          <p class="prose">Each Flink operator is a logical unit. When you set <code>parallelism=4</code>, Flink creates <strong>4 parallel subtasks</strong>, each processing a slice of the data. Together they process 4× as much data per second as a single instance.</p>
          <div class="lc-uber-box mt-16">
            <div class="lc-uber-label">🚗 Uber Example</div>
            <p>1M GPS events/sec ÷ 4 subtasks = 250K events/sec per FraudDetector instance. Each instance handles drivers whose <code>driverId % 4</code> matches its slot index.</p>
          </div>
        </div>
        <div class="card p-24">
          <h3 class="mb-12">What is Slot Sharing?</h3>
          <p class="prose">By default, all operators in a job share the same slot group. One slot holds <strong>one subtask from each operator</strong> — the entire pipeline slice runs in a single JVM thread group.</p>
          <div class="lc-uber-box mt-16">
            <div class="lc-uber-label">🚗 Uber Impact</div>
            <p>4 operators × parallelism 4 = 16 subtasks. With slot sharing: only <strong>4 slots needed</strong>. Without: 16 slots. Uber saves 75% of their TaskManager count.</p>
          </div>
        </div>
        <div class="card p-24">
          <h3 class="mb-12">Operator Chaining</h3>
          <p class="prose">Flink automatically chains consecutive operators with the same parallelism and a FORWARD edge into a single <strong>task thread</strong>. Data flows between chained operators as Java objects — no serialization, no network.</p>
          <div class="code-block mt-12"><pre>// These three chain into one thread:
source → map(parseGPS) → filter(speed > 0)
// Chained task: SourceOperator+MapOperator+FilterOperator
// No Netty hops between them</pre></div>
        </div>
        <div class="card p-24">
          <h3 class="mb-12">Heterogeneous Parallelism</h3>
          <p class="prose">Different operators can run at different parallelisms. Flink inserts a <strong>data redistribution</strong> (shuffle or keyBy) at the boundary.</p>
          <div class="code-block mt-12"><span class="lang-tag">PyFlink</span><pre>(source.set_parallelism(4)              # 4 Kafka partitions
   .key_by(lambda e: e["driver_id"])    # shuffle -> hash
   .process(FraudDetector()).set_parallelism(8)   # 8x detection
   .sink_to(kafka_sink).set_parallelism(4))</pre></div>
        </div>
      </div>
    </div>

    <div class="tab-content" data-tab="iq">
      <div class="section-header" style="margin-bottom:8px">
        <div class="section-title">Interview corner cases — on ride R-4471</div>
        <div class="section-desc">Hot-key skew and key-group/rescaling questions, anchored to the airport surge.</div>
      </div>
      <div id="par-scenarios"></div>
      <div class="section-header" style="margin:22px 0 8px"><div class="section-title">More parallelism Q&amp;A</div></div>
      <div class="iq-section" id="iq-section"></div>
    </div>
  `;

  initRideSpine(container);
  const parScen = container.querySelector('#par-scenarios');
  if (parScen) parScen.innerHTML = scenarioList(casesByModule('m05'));

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
  const iqSection = container.querySelector('#iq-section');
  iqSection.innerHTML = IQS.map((item, i) => `
    <div class="iq-item" id="iq5-${i}">
      <div class="iq-question" data-idx="${i}">
        <span>${item.q}</span><span class="iq-chevron">›</span>
      </div>
      <div class="iq-answer">${item.a}</div>
    </div>
  `).join('');
  iqSection.querySelectorAll('.iq-question').forEach(q => {
    q.addEventListener('click', () => {
      const item = iqSection.querySelector(`#iq5-${q.dataset.idx}`);
      const open = item.classList.contains('open');
      iqSection.querySelectorAll('.iq-item').forEach(i => i.classList.remove('open'));
      if (!open) item.classList.add('open');
    });
  });

  // Slider controls
  const pSlider = container.querySelector('#p-slider');
  const tmSlider = container.querySelector('#tm-slider');
  const pVal = container.querySelector('#p-val');
  const tmVal = container.querySelector('#tm-val');
  const sharingBtn = container.querySelector('#sharing-toggle');

  let numTMs = 2;

  pSlider.addEventListener('input', () => { parallelism = +pSlider.value; pVal.textContent = parallelism; render(); });
  tmSlider.addEventListener('input', () => { numTMs = +tmSlider.value; tmVal.textContent = numTMs; render(); });
  sharingBtn.addEventListener('click', () => {
    slotSharing = !slotSharing;
    sharingBtn.textContent = slotSharing ? 'ON' : 'OFF';
    sharingBtn.className = slotSharing ? 'btn btn-primary' : 'btn btn-secondary';
    render();
  });

  function render() {
    renderDiagram(container, parallelism, numTMs, slotSharing);
  }

  render();
}

function renderDiagram(container, parallelism, numTMs, slotSharing) {
  const wrap = container.querySelector('#p5-canvas-wrap');
  const stats = container.querySelector('#slot-stats');
  const tableWrap = container.querySelector('#subtask-table-wrap');

  const slotsPerTM = Math.ceil(parallelism / numTMs) + (slotSharing ? 0 : OPERATORS.length - 1);
  const totalSlotsNeeded = slotSharing ? parallelism : parallelism * OPERATORS.length;
  const totalSlotsAvailable = numTMs * (slotSharing ? parallelism : Math.ceil(parallelism * OPERATORS.length / numTMs));

  stats.innerHTML = `
    <div class="p5-stat">Subtasks: <strong>${parallelism * OPERATORS.length}</strong></div>
    <div class="p5-stat">Slots needed: <strong>${totalSlotsNeeded}</strong></div>
    <div class="p5-stat">Slot sharing saves: <strong>${slotSharing ? (parallelism * (OPERATORS.length - 1)) + ' slots' : '—'}</strong></div>
  `;

  // Build visual
  const TM_W = 200;
  const TM_PAD = 16;
  const SLOT_H = slotSharing ? 120 : 44;
  const SLOT_PAD = 6;
  const HEADER_H = 44;

  const slotsThisTM = (tmIdx) => {
    if (slotSharing) return parallelism;
    return Math.ceil(parallelism * OPERATORS.length / numTMs);
  };

  // Total height
  const maxSlots = slotSharing ? parallelism : Math.ceil(parallelism * OPERATORS.length / numTMs);
  const tmHeight = HEADER_H + maxSlots * (SLOT_H + SLOT_PAD) + TM_PAD;
  const svgW = numTMs * (TM_W + 20) + 20;
  const svgH = tmHeight + 40;

  let svg = `<svg width="${svgW}" height="${svgH}" style="font-family:var(--font-sans,sans-serif);min-width:${svgW}px">`;

  // Assign subtasks to slots
  // slotSharing: slot i → all operators at subtask index i (stacked vertically in one slot cell)
  // no sharing: each (op, subtask) is a separate slot

  for (let t = 0; t < numTMs; t++) {
    const tx = 20 + t * (TM_W + 20);
    const ty = 20;
    svg += `<rect x="${tx}" y="${ty}" width="${TM_W}" height="${tmHeight}" rx="10" fill="${TM_COLORS[t]}18" stroke="${TM_COLORS[t]}" stroke-width="1.5"/>`;
    svg += `<text x="${tx + TM_W / 2}" y="${ty + 27}" text-anchor="middle" font-size="12" font-weight="700" fill="${TM_COLORS[t]}">TaskManager ${t}</text>`;

    if (slotSharing) {
      // one slot per parallelism index; each slot contains all 4 operators for that subtask index
      for (let s = 0; s < parallelism; s++) {
        const subtaskIdx = t * Math.ceil(parallelism / numTMs) + s;
        if (subtaskIdx >= parallelism) continue;
        const sy = ty + HEADER_H + s * (SLOT_H + SLOT_PAD);
        svg += `<rect x="${tx + TM_PAD}" y="${sy}" width="${TM_W - TM_PAD * 2}" height="${SLOT_H}" rx="6" fill="${TM_COLORS[t]}22" stroke="${TM_COLORS[t]}55" stroke-width="1"/>`;
        svg += `<text x="${tx + TM_PAD + 4}" y="${sy + 13}" font-size="9" fill="${TM_COLORS[t]}cc">SLOT ${subtaskIdx}</text>`;
        // Stack operators
        const opH = (SLOT_H - 20) / OPERATORS.length;
        OPERATORS.forEach((op, oi) => {
          const oy = sy + 18 + oi * opH;
          svg += `<rect x="${tx + TM_PAD + 4}" y="${oy}" width="${TM_W - TM_PAD * 2 - 8}" height="${opH - 2}" rx="3" fill="${op.color}33" stroke="${op.color}66" stroke-width="1"/>`;
          svg += `<text x="${tx + TM_PAD + 10}" y="${oy + opH / 2 + 4}" font-size="9" fill="${op.color}">${op.icon} ${op.label}[${subtaskIdx}]</text>`;
        });
      }
    } else {
      // separate slot per (op, subtask)
      let slotRow = 0;
      for (let oi = 0; oi < OPERATORS.length; oi++) {
        for (let s = 0; s < parallelism; s++) {
          const globalSlot = oi * parallelism + s;
          const thisTMSlot = Math.floor(globalSlot / numTMs);
          if (globalSlot % numTMs !== t) continue;
          const sy = ty + HEADER_H + slotRow * (SLOT_H + SLOT_PAD);
          const op = OPERATORS[oi];
          svg += `<rect x="${tx + TM_PAD}" y="${sy}" width="${TM_W - TM_PAD * 2}" height="${SLOT_H}" rx="6" fill="${op.color}22" stroke="${op.color}66" stroke-width="1"/>`;
          svg += `<text x="${tx + TM_PAD + 4}" y="${sy + 13}" font-size="9" fill="${TM_COLORS[t]}cc">SLOT</text>`;
          svg += `<text x="${tx + TM_PAD + 10}" y="${sy + 30}" font-size="9.5" fill="${op.color}">${op.icon} ${op.label}[${s}]</text>`;
          slotRow++;
        }
      }
    }
  }

  svg += '</svg>';
  wrap.innerHTML = svg;

  // Subtask table
  tableWrap.innerHTML = `
    <div class="card p-20">
      <h4 class="mb-12">Subtask Assignment</h4>
      <div class="scroll-x">
        <table style="width:100%;border-collapse:collapse;font-size:12.5px">
          <thead>
            <tr>${['Operator','Subtask Index','Assigned TM','Slot Key'].map(h => `<th style="text-align:left;padding:8px 12px;border-bottom:1px solid var(--border);color:var(--text-secondary)">${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${OPERATORS.flatMap(op => Array.from({length: parallelism}, (_, s) => {
              const tm = s % numTMs;
              const slot = slotSharing ? s : (OPERATORS.indexOf(op) * parallelism + s);
              return `<tr style="border-bottom:1px solid var(--border)">
                <td style="padding:7px 12px"><span style="color:${op.color}">${op.icon} ${op.label}</span></td>
                <td style="padding:7px 12px;font-family:var(--font-mono)">[${s}]</td>
                <td style="padding:7px 12px"><span style="color:${TM_COLORS[tm]}">TM-${tm}</span></td>
                <td style="padding:7px 12px;font-family:var(--font-mono);color:var(--text-secondary)">${slotSharing ? `shared-slot-${s}` : `slot-${slot}`}</td>
              </tr>`;
            })).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
