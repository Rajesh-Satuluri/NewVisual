const STEPS = [
  {
    id: 'submit',
    label: '1. Submit Job',
    icon: '📤',
    actor: 'client',
    desc: 'Uber engineer submits the GPS fraud-detection job via the Flink CLI / REST API. The Client compiles your DataStream code into a <strong>JobGraph</strong> — a DAG of operators and edges.',
    uber: 'The fraud pipeline is packaged as a JAR containing SourceOperator (Kafka GPS topic), FraudDetector (KeyedProcess), and SinkOperator (Kafka alerts).',
    code: `// Uber submits the job\nenv.fromSource(kafkaSource, WatermarkStrategy.noWatermarks(), "GPS Events")\n   .keyBy(event -> event.driverId)\n   .process(new FraudDetector())\n   .sinkTo(kafkaSink);\nenv.execute("Uber Fraud Detection");`,
  },
  {
    id: 'dispatcher',
    label: '2. Dispatcher Receives',
    icon: '📬',
    actor: 'dispatcher',
    desc: 'The <strong>Dispatcher</strong> receives the JobGraph and creates a <strong>JobMaster</strong> (the per-job JobManager). It also exposes the REST interface that the Flink UI talks to.',
    uber: 'The Dispatcher logs "New job received: uber-fraud-v3" and spins up a dedicated JobMaster process to own the job lifecycle.',
    code: `// Dispatcher creates JobMaster\njobMaster = dispatcherFactory.createJobMaster(jobGraph);\njobMaster.start(); // runs on Dispatcher Actor thread`,
  },
  {
    id: 'execution',
    label: '3. Build ExecutionGraph',
    icon: '🗺️',
    actor: 'jobmanager',
    desc: 'The JobMaster\'s Scheduler expands the JobGraph into an <strong>ExecutionGraph</strong> — each operator is split into parallel subtasks according to the parallelism setting. Edges become typed data channels.',
    uber: 'Parallelism=4 means FraudDetector spawns 4 subtasks, each responsible for 25% of driver IDs (hash-partitioned). Total: 12 execution vertices across 3 operators.',
    code: `// JobGraph operator → ExecutionGraph vertices\n// parallelism=4 expands each operator\nFraudDetector (p=4):\n  FraudDetector[0]  driverIds 0..24%\n  FraudDetector[1]  driverIds 25..49%\n  FraudDetector[2]  driverIds 50..74%\n  FraudDetector[3]  driverIds 75..100%`,
  },
  {
    id: 'slots',
    label: '4. Request Slots',
    icon: '🎰',
    actor: 'resourcemanager',
    desc: 'The Scheduler calls the <strong>ResourceManager</strong> to allocate <strong>Task Slots</strong>. If slots are available on existing TaskManagers, they are leased. If not, Kubernetes/YARN is asked to launch new TaskManager pods.',
    uber: 'RM finds 3 TaskManagers online with 4 slots each (12 total). It allocates one slot per subtask — exactly fitting the parallelism=4 × 3-operator graph.',
    code: `// Slot request flow\nscheduler.requestSlots(numRequired=12);\n// ResourceManager responds:\nslotPool.offerSlot(tm0, slot0);\nslotPool.offerSlot(tm0, slot1);\n// ... 12 slots total`,
  },
  {
    id: 'deploy',
    label: '5. Deploy Tasks',
    icon: '🚀',
    actor: 'taskmanager',
    desc: 'The JobMaster deploys each <strong>ExecutionVertex</strong> as a <strong>Task</strong> onto its assigned slot. The TaskManager receives the task descriptor + JAR, loads the operator class, and starts the task thread.',
    uber: 'TM-0 receives FraudDetector[0] and FraudDetector[1]. TM-1 receives FraudDetector[2] and SourceOperator[0]. Each task thread starts and registers back to the JobMaster.',
    code: `// TaskManager receives deployment\ntaskExecutor.submitTask(taskDeploymentDescriptor);\n// Task thread starts\nnew Task(fraudDetectorClass, slot).run();\n// Heartbeat back to JobMaster\njobMasterGateway.registerTaskExecutor(tmId, address);`,
  },
  {
    id: 'running',
    label: '6. Job RUNNING',
    icon: '▶️',
    actor: 'taskmanager',
    desc: 'All tasks report <code>RUNNING</code> to the JobMaster. Data flows operator-to-operator via <strong>Flink\'s network stack</strong> (Netty). Kafka events pour in; watermarks and state checkpoints begin.',
    uber: '1M GPS events/sec stream into the pipeline. FraudDetector[0..3] process driver-partitioned events, updating per-driver ValueState (last trip time, speed). Alerts fire within 10ms.',
    code: `// Data flowing — operator loop\nwhile (running) {\n  Record r = inputGate.pollNext();\n  fraudDetector.processElement(r, ctx);\n  // emits alert if rule matched\n  outputCollector.collect(alert);\n}`,
  },
  {
    id: 'checkpoint',
    label: '7. Checkpoint (Snapshot)',
    icon: '📸',
    actor: 'jobmanager',
    desc: 'The <strong>CheckpointCoordinator</strong> periodically injects <strong>barrier messages</strong> into every source. Barriers flow downstream; when an operator receives barriers from all inputs it snapshots its state to the <strong>State Backend</strong> (S3/RocksDB).',
    uber: 'Every 30 seconds, barriers flush through all 12 subtasks. FraudDetector[0] snapshots 750K driver state entries to S3. On failure, Flink rewinds Kafka offsets to the checkpoint and replays — zero data loss.',
    code: `// CheckpointCoordinator triggers\ncoordinator.triggerCheckpoint(checkpointId);\n// Source injects barrier\nkafkaSource.emitBarrier(checkpointId);\n// Operator snapshots state\nfraudDetector.snapshotState(checkpointId);\nstateBackend.persist(s3Path, snapshot);`,
  },
  {
    id: 'finish',
    label: '8. Complete / Fail / Cancel',
    icon: '🏁',
    actor: 'dispatcher',
    desc: 'Streaming jobs run indefinitely. If a task <strong>fails</strong>, the JobMaster triggers a restart strategy (fixed-delay, exponential-backoff) and restores from the latest checkpoint. When <strong>cancelled</strong> by the operator, tasks clean up and the job moves to CANCELED state.',
    uber: 'If Kafka broker TM-1 dies, Flink detects heartbeat loss, restarts SourceOperator[0] from checkpoint offset 9,200,000, replays ≈5s of events, and resumes — users never notice.',
    code: `// Failure → restart from checkpoint\nonTaskFailure(taskId, cause);\nrestartStrategy.restart(job);\n// Restore operator state\noperator.restoreState(latestCheckpoint);\n// Kafka seeks to checkpointed offset\nkafkaConsumer.seek(partition, offset=9_200_000);`,
  },
];

const ACTOR_COLORS = {
  client: '#6366f1',
  dispatcher: '#f59e0b',
  jobmanager: '#FF6B35',
  resourcemanager: '#10b981',
  taskmanager: '#3b82f6',
};

const ACTOR_LABELS = {
  client: 'Client',
  dispatcher: 'Dispatcher',
  jobmanager: 'JobManager',
  resourcemanager: 'ResourceManager',
  taskmanager: 'TaskManager',
};

const IQS = [
  { q: 'What is the difference between JobGraph and ExecutionGraph?', a: 'JobGraph is the logical DAG produced by the client — operators and edges, no parallelism expansion. ExecutionGraph is the physical plan: each operator is replicated into N parallel subtasks (ExecutionVertices) and each edge becomes typed ResultPartitions + InputGates. The Scheduler builds the ExecutionGraph from the JobGraph before requesting slots.' },
  { q: 'How does Flink\'s slot sharing work and why does it matter?', a: 'By default, subtasks from the same job share a slot (one slot can hold one subtask per operator). A pipeline of 3 operators at parallelism 4 needs only 4 slots (not 12) because each slot hosts one full pipeline chain. This reduces slot fragmentation and lets all operators of a pipeline run in the same JVM, eliminating serialization for local data hand-off.' },
  { q: 'What happens when a TaskManager dies mid-job?', a: 'The JobManager detects heartbeat timeout, marks all tasks on that TM as FAILED, and triggers the restart strategy. Flink rewinds all sources (e.g., Kafka) to the latest successfully completed checkpoint offsets and redeploys the job. State is restored from the checkpoint in the state backend (S3/RocksDB). Processing resumes from the checkpoint — exactly-once for supported sources/sinks.' },
  { q: 'Why does Flink use barriers instead of a central coordinator for checkpoints?', a: 'Barriers are injected into the data stream itself (Chandy-Lamport algorithm). Each operator snapshots exactly when it has processed all data up to the barrier — no global pause needed. This allows asynchronous, non-blocking snapshots: the operator copies state (copy-on-write with RocksDB) while continuing to process data after the barrier. Central coordination would require stopping the entire pipeline, destroying throughput.' },
  { q: 'How does Uber achieve <10ms fraud detection latency with Flink?', a: 'Several factors: (1) True streaming — no micro-batching delay, each event triggers the operator immediately. (2) State is in TaskManager JVM heap (HashMap backend) for sub-millisecond lookup. (3) keyBy(driverId) co-locates all events for a driver on one subtask, eliminating cross-network state lookups. (4) Slot-sharing pipelines source→detector→sink in one JVM, removing network serialization for hand-offs.' },
];

export function mount(container) {
  container.innerHTML = `
    <div class="module-hero">
      <div class="module-hero-content">
        <span class="module-badge">Module 4</span>
        <h1 class="module-title">Job Lifecycle</h1>
        <p class="module-subtitle">From <code>env.execute()</code> to data flowing at 1M events/sec — every step Flink takes to run a job.</p>
      </div>
    </div>
    <div class="module-tabs">
      <button class="tab-btn active" data-tab="lifecycle">Job Lifecycle</button>
      <button class="tab-btn" data-tab="diagram">Flow Diagram</button>
      <button class="tab-btn" data-tab="iq">Interview Q&amp;A</button>
    </div>
    <div class="tab-content active" data-tab="lifecycle">
      <div class="lifecycle-layout">
        <div class="lifecycle-stepper" id="lifecycle-stepper"></div>
        <div class="lifecycle-detail" id="lifecycle-detail"></div>
      </div>
    </div>
    <div class="tab-content" data-tab="diagram">
      <div class="card p-24">
        <h3 style="margin:0 0 16px">Job Submission Flow</h3>
        <div class="scroll-x" id="flow-diagram-wrap"></div>
      </div>
    </div>
    <div class="tab-content" data-tab="iq">
      <div class="iq-section" id="iq-section"></div>
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

  // IQ accordion
  const iqSection = container.querySelector('#iq-section');
  iqSection.innerHTML = IQS.map((item, i) => `
    <div class="iq-item" id="iq-${i}">
      <div class="iq-question" data-idx="${i}">
        <span>${item.q}</span>
        <span class="iq-chevron">›</span>
      </div>
      <div class="iq-answer">${item.a}</div>
    </div>
  `).join('');
  iqSection.querySelectorAll('.iq-question').forEach(q => {
    q.addEventListener('click', () => {
      const item = iqSection.querySelector(`#iq-${q.dataset.idx}`);
      const isOpen = item.classList.contains('open');
      iqSection.querySelectorAll('.iq-item').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });

  // Stepper
  const stepper = container.querySelector('#lifecycle-stepper');
  const detail = container.querySelector('#lifecycle-detail');

  stepper.innerHTML = STEPS.map((s, i) => `
    <button class="lc-step${i === 0 ? ' active' : ''}" data-idx="${i}">
      <span class="lc-step-icon">${s.icon}</span>
      <span class="lc-step-label">${s.label}</span>
      <span class="lc-step-dot" style="background:${ACTOR_COLORS[s.actor]}"></span>
    </button>
  `).join('');

  function showStep(idx) {
    stepper.querySelectorAll('.lc-step').forEach((b, i) => {
      b.classList.toggle('active', i === idx);
      if (i < idx) b.classList.add('done');
      else b.classList.remove('done');
    });
    const s = STEPS[idx];
    const color = ACTOR_COLORS[s.actor];
    detail.innerHTML = `
      <div class="lc-detail-card" style="border-left:4px solid ${color}">
        <div class="lc-detail-header">
          <span class="lc-detail-icon">${s.icon}</span>
          <div>
            <div class="lc-detail-title">${s.label}</div>
            <span class="badge" style="background:${color}20;color:${color};border:1px solid ${color}40">${ACTOR_LABELS[s.actor]}</span>
          </div>
        </div>
        <p class="lc-detail-desc">${s.desc}</p>
        <div class="lc-uber-box">
          <div class="lc-uber-label">🚗 Uber Example</div>
          <p>${s.uber}</p>
        </div>
        <div class="code-block"><pre>${s.code}</pre></div>
        <div class="lc-nav-row">
          ${idx > 0 ? `<button class="btn btn-secondary lc-prev" data-idx="${idx - 1}">← Prev</button>` : '<span></span>'}
          ${idx < STEPS.length - 1 ? `<button class="btn btn-primary lc-next" data-idx="${idx + 1}">Next →</button>` : '<span class="badge" style="background:#10b981;color:#fff;padding:8px 16px">✓ Job is RUNNING!</span>'}
        </div>
      </div>
    `;
    detail.querySelector('.lc-prev')?.addEventListener('click', e => showStep(+e.currentTarget.dataset.idx));
    detail.querySelector('.lc-next')?.addEventListener('click', e => showStep(+e.currentTarget.dataset.idx));
  }

  stepper.addEventListener('click', e => {
    const btn = e.target.closest('.lc-step');
    if (btn) showStep(+btn.dataset.idx);
  });

  showStep(0);

  // Flow diagram (SVG)
  buildFlowDiagram(container.querySelector('#flow-diagram-wrap'));
}

function buildFlowDiagram(wrap) {
  const actors = [
    { id: 'client', label: 'Client', color: '#6366f1' },
    { id: 'dispatcher', label: 'Dispatcher', color: '#f59e0b' },
    { id: 'jobmanager', label: 'JobManager', color: '#FF6B35' },
    { id: 'resourcemanager', label: 'ResourceManager', color: '#10b981' },
    { id: 'taskmanager', label: 'TaskManager', color: '#3b82f6' },
  ];
  const flows = [
    { from: 0, to: 1, label: 'Submit JobGraph' },
    { from: 1, to: 2, label: 'Create JobMaster' },
    { from: 2, to: 2, label: 'Build ExecutionGraph', self: true },
    { from: 2, to: 3, label: 'Request Slots' },
    { from: 3, to: 4, label: 'Start TaskManagers' },
    { from: 3, to: 2, label: 'Offer Slots' },
    { from: 2, to: 4, label: 'Deploy Tasks' },
    { from: 4, to: 2, label: 'Report RUNNING' },
    { from: 2, to: 2, label: 'Trigger Checkpoints', self: true, offset: 1 },
  ];

  const W = 760, H = 480;
  const colW = W / actors.length;
  const rowH = 46;
  const headerH = 60;

  let svg = `<svg width="${W}" height="${H}" style="font-family:var(--font-mono,monospace);min-width:${W}px">`;

  // Lifelines
  actors.forEach((a, i) => {
    const x = colW * i + colW / 2;
    svg += `<rect x="${x - 50}" y="8" width="100" height="38" rx="6" fill="${a.color}22" stroke="${a.color}" stroke-width="1.5"/>`;
    svg += `<text x="${x}" y="31" text-anchor="middle" fill="${a.color}" font-size="11" font-weight="600">${a.label}</text>`;
    svg += `<line x1="${x}" y1="46" x2="${x}" y2="${H - 10}" stroke="${a.color}" stroke-width="1" stroke-dasharray="4,4" opacity="0.4"/>`;
  });

  // Flow arrows
  const isDark = () => document.documentElement.getAttribute('data-theme') !== 'light';
  const textFill = '#a0aec0';

  flows.forEach((f, i) => {
    const y = headerH + rowH * i + rowH / 2;
    const x1 = colW * f.from + colW / 2;
    const x2 = colW * f.to + colW / 2;
    if (f.self) {
      const cx = x1 + 36 + (f.offset || 0) * 10;
      svg += `<path d="M ${x1} ${y} C ${cx} ${y - 14} ${cx} ${y + 14} ${x1} ${y}" fill="none" stroke="#FF6B35" stroke-width="1.5" marker-end="url(#arr-self)"/>`;
      svg += `<text x="${cx + 8}" y="${y + 4}" font-size="9" fill="${textFill}">${f.label}</text>`;
    } else {
      const dir = x2 > x1 ? 1 : -1;
      svg += `<line x1="${x1 + dir * 4}" y1="${y}" x2="${x2 - dir * 10}" y2="${y}" stroke="${actors[f.to].color}" stroke-width="1.5" marker-end="url(#arr-${f.to})"/>`;
      const mx = (x1 + x2) / 2;
      svg += `<text x="${mx}" y="${y - 5}" text-anchor="middle" font-size="9" fill="${textFill}">${f.label}</text>`;
    }
  });

  // Arrow defs
  svg += `<defs>`;
  actors.forEach((a, i) => {
    svg += `<marker id="arr-${i}" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="${a.color}"/></marker>`;
  });
  svg += `<marker id="arr-self" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#FF6B35"/></marker>`;
  svg += `</defs></svg>`;

  wrap.innerHTML = svg;
}
