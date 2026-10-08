import { createModuleShell, initTabs, createIQSection, initIQ } from '../components/module-shell.js';
import { rideSpine, initRideSpine } from '../components/story-ui.js';

// ── Component definitions ─────────────────────────────────────────────────
const COMPONENTS = {
  client: {
    id: 'client', label: 'Flink Client', icon: '💻', color: '#38BDF8',
    def: 'The program entry point that compiles your DataStream/Table API code into a JobGraph and submits it to the Flink cluster.',
    responsibilities: [
      'Execute user program locally to build the logical JobGraph',
      'Upload job JAR and JobGraph to Dispatcher via REST',
      'Monitor job status and retrieve results',
      'Detach or remain attached to the running job',
    ],
    howItWorks: 'The client never executes data processing. It only builds the logical plan (JobGraph) by running your main() method. The JobGraph is a serialized DAG of operators. Once submitted, the client can detach — the job runs on the cluster independently.',
    uber: 'Uber engineers run <code>flink run -c com.uber.pipeline.GPSFraud uber-gps.jar</code>. The client builds a 6-operator JobGraph (Kafka Source → GPS Parser → KeyBy Driver → Fraud Detector → Alert → Iceberg Sink) and submits it to the Uber Flink cluster.',
    interview: [
      { q: 'What does the Flink client actually execute?', a: 'The client executes the user\'s main() method locally to build the JobGraph — a logical DAG. It never runs data processing. After submission, the cluster executes the actual stream processing.' },
      { q: 'What is a JobGraph?', a: 'A JobGraph is the logical execution plan — a serialized DAG where nodes are operators (map, filter, keyBy) and edges are data flows. It\'s created by the client and is topology-only — no parallelism expansion yet.' },
    ],
  },
  dispatcher: {
    id: 'dispatcher', label: 'Dispatcher', icon: '📮', color: '#A78BFA',
    def: 'The REST entry point for the Flink cluster. Accepts job submissions, hosts the Flink Web UI (port 8081), and creates a dedicated JobManager per submitted job.',
    responsibilities: [
      'Expose REST API for job submission and management',
      'Host the Flink Web UI (monitoring, metrics)',
      'Create one JobManager per submitted job',
      'Store job metadata and history',
    ],
    howItWorks: 'Dispatcher is a long-running cluster service (unlike JobManager which is per-job). When a job is submitted, Dispatcher persists the JobGraph to HA storage (ZooKeeper/etcd), then spawns a JobManager. On cluster restart, Dispatcher recovers jobs from HA storage.',
    uber: 'Uber\'s Flink cluster runs 100+ simultaneous jobs (GPS, payments, surge pricing, ETA). Each job submission hits the Dispatcher\'s REST endpoint. The Dispatcher spawns a separate JobManager for each, allowing independent job failure and restart.',
    interview: [
      { q: 'Can the Dispatcher be a single point of failure?', a: 'In standalone mode, yes. In HA mode (ZooKeeper + multiple Dispatcher replicas), the Dispatcher\'s state is stored in ZooKeeper so a new Dispatcher can take over on failure. Uber runs HA Flink clusters.' },
      { q: 'Where is the Flink Web UI served from?', a: 'The Dispatcher hosts the Web UI on port 8081. It shows all running jobs, their DAGs, operator metrics, backpressure indicators, and checkpoint history.' },
    ],
  },
  jobmanager: {
    id: 'jobmanager', label: 'JobManager', icon: '🏛️', color: '#FF6B35',
    def: 'The brain of a single Flink job. Coordinates scheduling, checkpointing, and failure recovery for one running job. Every job has exactly one JobManager.',
    responsibilities: [
      'Convert JobGraph → ExecutionGraph (apply parallelism)',
      'Schedule tasks onto available TaskManager slots',
      'Coordinate distributed checkpoints (barrier protocol)',
      'Handle TaskManager failures and trigger recovery',
      'Track job state (CREATED → RUNNING → FINISHED/FAILED)',
    ],
    howItWorks: 'The JobManager holds the ExecutionGraph — the physical execution plan with all parallel task instances. It uses the Scheduler to assign tasks to slots and the CheckpointCoordinator to periodically snapshot state. On TaskManager failure, it reassigns tasks to healthy slots and restores from the last checkpoint.',
    uber: 'Uber\'s GPS fraud detection JobManager manages 200 parallel tasks across 50 TaskManagers. Every 30 seconds, it triggers a distributed checkpoint — injecting barriers into the Kafka consumer, flowing through all operators, and saving state snapshots to S3. Total checkpoint: ~2GB of RocksDB state.',
    interview: [
      { q: 'What is the difference between a JobGraph and an ExecutionGraph?', a: 'JobGraph is the logical plan (operators, topology) without parallelism. ExecutionGraph is the physical plan — each operator expanded into N parallel ExecutionVertex instances. A map operator with parallelism=8 becomes 8 ExecutionVertex instances in the ExecutionGraph.' },
      { q: 'What happens if the JobManager crashes?', a: 'In non-HA mode: job fails permanently. In HA mode (ZooKeeper): a standby JobManager takes over. It reads the last checkpointed ExecutionGraph from ZooKeeper, finds the last checkpoint in HDFS/S3, and restores all tasks from that checkpoint. Recovery time ≈ checkpoint interval + restart time.' },
    ],
  },
  scheduler: {
    id: 'scheduler', label: 'Scheduler', icon: '📅', color: '#FCD34D',
    def: 'Sub-component of the JobManager responsible for assigning execution vertices (parallel task instances) to available task slots on TaskManagers.',
    responsibilities: [
      'Request task slots from the ResourceManager',
      'Assign ExecutionVertex instances to slots',
      'Enforce slot sharing groups (multiple operators in one slot)',
      'Re-schedule failed tasks to healthy slots',
    ],
    howItWorks: 'Flink has two scheduling strategies: Eager (all tasks started simultaneously, default for streaming) and Lazy (tasks started as input becomes available, for batch). For streaming, all tasks start at once. Slot sharing allows multiple operators from the same job to share one slot — reducing required slots from operators×parallelism to max(parallelism).',
    uber: 'Uber\'s GPS pipeline has 6 operators × parallelism 32 = 192 task instances. With slot sharing, only 32 slots are needed (one per pipeline chain). The Scheduler fills 32 slots across TaskManagers, with all 6 operator tasks sharing each slot.',
    interview: [
      { q: 'What is slot sharing in Flink?', a: 'Slot sharing allows tasks from different operators (in the same job) to run in the same task slot. This means a slot runs one "pipeline chain" — e.g., Source→Map→Filter all in one slot. Without slot sharing, each operator instance needs its own slot, multiplying the slot requirement.' },
      { q: 'What scheduling strategies does Flink support?', a: 'Eager scheduling (all tasks start together, default for streaming) and Lazy/batch scheduling (tasks start when their upstream is ready). Pipelined region scheduling (default since Flink 1.15) schedules by connected pipeline regions.' },
    ],
  },
  checkpoint: {
    id: 'checkpoint', label: 'Checkpoint Coordinator', icon: '✅', color: '#34D399',
    def: 'Sub-component of the JobManager that orchestrates distributed Chandy-Lamport checkpoints — periodically saving a consistent global snapshot of all operator state.',
    responsibilities: [
      'Trigger checkpoints at configured intervals',
      'Inject checkpoint barriers into source operators',
      'Collect acknowledgements from all operators',
      'Declare checkpoint complete when all ops ACK',
      'On failure: identify last complete checkpoint for recovery',
    ],
    howItWorks: 'The CheckpointCoordinator sends a "trigger checkpoint" message to all source operators. Each source injects a special barrier record into its output stream. Barriers flow downstream through the DAG. When an operator receives barriers on ALL inputs, it snapshots its state to the configured state backend (HDFS/S3). It then forwards the barrier and ACKs the coordinator. Once all operators ACK, the checkpoint is complete. On failure, all operators restore from their snapshot and Kafka consumers seek to their checkpointed offset.',
    uber: 'Every 30 seconds, Uber\'s Checkpoint Coordinator triggers checkpoint #N. 200 operators each save their RocksDB state to S3. The fraud detector saves its "driver risk scores" state (3M keys). Total checkpoint size: ~2GB. If a TaskManager crashes, recovery reads from S3 and Kafka seeks back by ≤30s.',
    interview: [
      { q: 'Explain the Flink checkpoint barrier protocol.', a: 'The CheckpointCoordinator sends a trigger to sources. Sources inject a barrier (a special record with checkpoint ID) into their output streams between normal records. When a downstream operator receives barriers on ALL input channels, it (1) snapshots its state to the backend, (2) forwards the barrier downstream, (3) ACKs the coordinator. The checkpoint is complete when all operators ACK. This is the Chandy-Lamport distributed snapshot algorithm.' },
      { q: 'What is exactly-once processing and how do checkpoints enable it?', a: 'Exactly-once means every event is reflected in the output exactly once — no duplicates, no losses. Checkpoints enable this by: (1) saving both operator state AND source offsets atomically. On recovery, Flink restores state and replays from the checkpointed source offset. Combined with transactional sinks (two-phase commit), the output is exactly-once end-to-end.' },
    ],
  },
  resourcemanager: {
    id: 'resourcemanager', label: 'Resource Manager', icon: '🎛️', color: '#22D3EE',
    def: 'The cluster-level component that manages TaskManager slots — the bridge between the JobManager\'s slot requests and the actual TaskManager resources.',
    responsibilities: [
      'Maintain registry of all TaskManagers and their slots',
      'Fulfill slot requests from JobManager Schedulers',
      'Request new TaskManagers from underlying infra (YARN/K8s)',
      'Handle TaskManager failures and slot cleanup',
      'Enforce resource quotas between jobs',
    ],
    howItWorks: 'In Kubernetes mode, the ResourceManager requests new TaskManager pods from the K8s API when slots are insufficient. In standalone mode, it only manages pre-started TaskManagers. It tracks which slots are free/occupied and matches slot offers (from TMs) to slot requests (from JobManagers). In Reactive Mode (Flink 1.13+), it automatically adjusts parallelism based on available TaskManagers.',
    uber: 'Uber runs Flink on Kubernetes. When GPS event volume spikes on New Year\'s Eve, the ResourceManager requests additional TaskManager pods. K8s schedules them on available nodes. The Scheduler fills new slots with GPS pipeline tasks within seconds — auto-scaling without manual intervention.',
    interview: [
      { q: 'How does Flink integrate with Kubernetes for resource management?', a: 'In native K8s mode, the Flink ResourceManager acts as a K8s operator. When the Scheduler requests more slots than available, ResourceManager calls the K8s API to create new TaskManager Pods. Each Pod registers with the ResourceManager, offering its slots. This enables auto-scaling: more load → more slots requested → more TM pods spawned.' },
      { q: 'What is Flink\'s Reactive Mode?', a: 'In Reactive Mode (Flink 1.13+), the ResourceManager sets the job\'s parallelism to match all available TaskManagers automatically. Add a TaskManager → parallelism increases. Remove one → parallelism decreases. Useful for Kubernetes HPA-driven auto-scaling without manual parallelism configuration.' },
    ],
  },
  taskmanager: {
    id: 'taskmanager', label: 'TaskManager', icon: '⚙️', color: '#FB923C',
    def: 'Worker process that executes operator tasks. Each TaskManager has a fixed number of task slots — isolated memory compartments for running parallel task instances.',
    responsibilities: [
      'Offer task slots to the ResourceManager',
      'Execute operator tasks (map, filter, keyBy, etc.) in slots',
      'Manage local state storage (RocksDB/HashMap)',
      'Exchange data between tasks via network buffers',
      'Send heartbeats to JobManager',
    ],
    howItWorks: 'A TaskManager is a JVM process. It divides its memory into N slots (configured by taskmanager.numberOfTaskSlots). Each slot runs one "pipeline chain" of operator tasks. Data exchange between slots on the same TM uses local memory transfer. Data exchange between TMs uses TCP network connections with credit-based flow control (backpressure mechanism).',
    uber: 'Uber runs 200 TaskManagers (8 slots each = 1600 total slots). Each TM JVM has 32GB RAM: 40% for RocksDB state, 40% for network buffers, 20% for JVM heap. GPS events flow through tasks within each TM via shared memory, then network to the next TM stage.',
    interview: [
      { q: 'What is the relationship between parallelism and task slots?', a: 'Task slots determine the maximum parallelism a job can use. A TaskManager with 4 slots can run 4 parallel task instances. With 10 TaskManagers × 4 slots = 40 total slots → max job parallelism = 40. Slot sharing allows a full pipeline chain (all operators) to share one slot, so you need max(parallelism) slots, not operators×parallelism.' },
      { q: 'How does Flink handle data exchange between TaskManagers?', a: 'Flink uses a credit-based network protocol between TaskManagers. The sender tracks how many network buffers the receiver has available (credits). It only sends data when credits > 0. When a downstream task is slow, its credits run out, the sender stops sending — this is the backpressure signal that propagates upstream.' },
    ],
  },
  statebackend: {
    id: 'statebackend', label: 'State Backend', icon: '🗄️', color: '#F87171',
    def: 'The pluggable storage layer for operator state. Determines where state lives (JVM heap vs RocksDB) and where checkpoints are persisted (local disk vs HDFS/S3).',
    responsibilities: [
      'Store operator state during normal processing',
      'Write state snapshots to durable storage on checkpoint',
      'Restore state from snapshots on recovery',
      'Support incremental checkpointing (RocksDB only)',
    ],
    howItWorks: 'Two main state backends: <strong>HashMapStateBackend</strong> stores state in JVM heap objects — fast but limited by JVM heap size, full snapshot on every checkpoint. <strong>EmbeddedRocksDBStateBackend</strong> stores state in RocksDB (off-heap, disk-backed) — handles TB-scale state, supports incremental checkpointing (only changed SST files). Checkpoint storage (where snapshots go) is separate: FileSystemCheckpointStorage writes to HDFS/S3.',
    uber: 'Uber\'s GPS pipeline uses RocksDB state backend with S3 checkpoint storage. The fraud detection state (driver_id → risk_score + trip_history) has 3M keys, ~10KB each = ~30GB total state. RocksDB handles this with incremental checkpoints — only changed keys are written to S3 each interval (typically 200MB vs 30GB for full checkpoint).',
    interview: [
      { q: 'When would you use RocksDB state backend vs HashMap?', a: 'Use HashMap when state fits in JVM heap (< a few GB) and you need the fastest access (in-memory, no serialization). Use RocksDB when state is large (GBs to TBs), when you need incremental checkpointing (reduced checkpoint I/O), or when GC pressure from large heap is a concern. Trade-off: RocksDB requires serialization on every state access (10–100μs penalty per access).' },
      { q: 'What is incremental checkpointing?', a: 'Only available with RocksDB. Instead of saving all state on every checkpoint, Flink saves only the SST files that changed since the last checkpoint (using RocksDB\'s native change tracking). For Uber\'s 30GB state, full checkpoint = 30GB/30s. Incremental = 200MB/30s. Huge I/O savings, critical for large-state pipelines.' },
    ],
  },
};

const CONN_DEFS = [
  { from: 'client',        to: 'dispatcher',     label: 'submit job', style: 'solid' },
  { from: 'dispatcher',    to: 'jobmanager',      label: 'spawn',      style: 'solid' },
  { from: 'jobmanager',    to: 'resourcemanager', label: 'request slots', style: 'solid' },
  { from: 'jobmanager',    to: 'statebackend',    label: 'checkpoint', style: 'dashed' },
  { from: 'resourcemanager', to: 'taskmanager',   label: 'allocate',   style: 'solid' },
  { from: 'taskmanager',   to: 'statebackend',    label: 'state r/w',  style: 'dashed' },
];

// ── IQ for the overview ───────────────────────────────────────────────────
const IQS = [
  {
    q: 'Walk me through what happens when you submit a Flink job — from client to data flowing.',
    a: `1. <strong>Client</strong> runs main() → builds JobGraph (logical DAG of operators)<br>
    2. <strong>Client</strong> submits JobGraph + JAR to Dispatcher via REST (port 8081)<br>
    3. <strong>Dispatcher</strong> creates a JobManager for this job<br>
    4. <strong>JobManager</strong> expands JobGraph → ExecutionGraph (parallelism applied, N tasks per operator)<br>
    5. <strong>Scheduler</strong> requests slots from ResourceManager<br>
    6. <strong>ResourceManager</strong> allocates slots from TaskManagers (or spins up new TM pods on K8s)<br>
    7. <strong>Scheduler</strong> deploys tasks to assigned slots<br>
    8. <strong>Tasks</strong> initialize their operators, source tasks connect to Kafka, <strong>data flows</strong>`,
    tip: 'Memorize this 8-step sequence. It\'s asked in virtually every senior Flink interview.',
  },
  {
    q: 'How many JobManagers does a Flink cluster have? How many per job?',
    a: `A Flink cluster has <strong>one Dispatcher</strong> (cluster-level, long-running). The Dispatcher creates <strong>one JobManager per running job</strong>. With 10 jobs running simultaneously, there are 10 JobManagers.<br><br>
    In HA mode, there\'s one <em>active</em> JobManager and potentially standbys. The Dispatcher is also HA-replicated.<br><br>
    This per-job isolation means one job\'s JobManager crash doesn\'t affect other jobs — each JobManager is independent.`,
    tip: 'Distinction: "cluster has one Dispatcher, each job has one JobManager." Confusing these is a common mistake.',
  },
  {
    q: 'What is the difference between a task slot and parallelism?',
    a: `<strong>Task slot</strong>: A fixed resource unit in a TaskManager (isolated memory/CPU fraction). A TM with 4 slots offers 4 concurrent execution units. Physical resource.<br><br>
    <strong>Parallelism</strong>: How many parallel instances of an operator run. Logical setting. Can be set per-operator or globally.<br><br>
    Relationship: You need at least max(parallelism) slots. With slot sharing, each slot runs a full pipeline chain. Without slot sharing, you'd need operators × parallelism slots.<br><br>
    Example: 6-operator pipeline with parallelism=8. With slot sharing: 8 slots (one chain per slot). Without: 48 slots.`,
    tip: 'Slot sharing is always on by default in Flink. Make sure to explain it — it\'s what makes the math work.',
  },
  {
    q: 'How does Flink achieve fault tolerance at the architectural level?',
    a: `Multi-layer fault tolerance:<br><br>
    1. <strong>Task failure</strong>: JobManager detects via missed heartbeats. Scheduler reassigns task to another healthy slot. Task restores from last checkpoint. Local recovery (Flink 1.9+) restores from local state copy, not remote S3.<br><br>
    2. <strong>TaskManager failure</strong>: JobManager detects, marks all tasks on that TM as failed. ResourceManager requests replacement slots. All tasks restart from last checkpoint.<br><br>
    3. <strong>JobManager failure</strong>: In HA mode, standby JobManager takes over, reads last checkpoint metadata from ZooKeeper, restores all tasks from last checkpoint.<br><br>
    4. <strong>Complete cluster failure</strong>: All jobs restart from last checkpoints stored in durable storage (HDFS/S3).`,
    tip: 'Cover all four levels: task, TM, JM, cluster. Shows you\'ve thought about this systematically.',
  },
];

// ── Mount ─────────────────────────────────────────────────────────────────
export function mount(container) {
  container.innerHTML = rideSpine({ active: ['DRIVER_SEARCHING', 'RIDE_STARTED'] }) + createModuleShell({
    tag: '03 · Architecture · Uber Edition',
    title: 'Flink Architecture',
    subtitle: 'Click any component to explore its role, internal mechanics, and how it handles Uber\'s 1M GPS events per second. Every interview starts here.',
    tabs: [
      { id: 'diagram',   label: '🏛️ Architecture Diagram' },
      { id: 'concept',   label: '📖 Deep Dive' },
      { id: 'interview', label: '🎤 Interview Q&A' },
    ],
  });

  initTabs(container);
  initRideSpine(container);
  container.querySelector('#tab-diagram').innerHTML   = buildDiagramTab();
  container.querySelector('#tab-concept').innerHTML   = buildConceptTab();
  container.querySelector('#tab-interview').innerHTML = createIQSection(IQS);
  initIQ(container);
  initDiagram(container);

  return () => {};
}

// ── Diagram Tab ───────────────────────────────────────────────────────────
function buildDiagramTab() {
  return `
    <div style="display:flex;gap:24px;align-items:flex-start">
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">
          💡 Click any component to see its definition, responsibilities, and interview questions
        </div>
        <div id="arch-diagram" style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;overflow:hidden;padding:20px">
          ${buildArchSVG()}
        </div>
        <div style="display:flex;gap:16px;margin-top:12px;flex-wrap:wrap">
          ${[
            { color:'#38BDF8', label:'Cluster Services' },
            { color:'#FF6B35', label:'Job Management' },
            { color:'#FB923C', label:'Task Execution' },
            { color:'#34D399', label:'State & Checkpoints' },
          ].map(l=>`
            <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-muted)">
              <div style="width:10px;height:10px;border-radius:2px;background:${l.color}44;border:1px solid ${l.color}88"></div>
              ${l.label}
            </div>
          `).join('')}
        </div>
      </div>
      <div id="comp-detail" style="width:340px;flex-shrink:0;display:none">
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;overflow:hidden;position:sticky;top:16px">
          <div id="comp-detail-inner" style="padding:20px;max-height:calc(100vh - 180px);overflow-y:auto"></div>
        </div>
      </div>
    </div>
  `;
}

function buildArchSVG() {
  const W = 680, H = 520;
  const rows = [
    // [id, x, y, w, h, label, icon, color]
    ['client',          260, 14,  160, 46, 'Flink Client',       '💻', '#38BDF8'],
    ['dispatcher',      260, 84,  160, 46, 'Dispatcher',         '📮', '#A78BFA'],
    // JobManager container
    ['jm-bg',           170, 155, 340, 110, '',                   '',   '#FF6B35'],
    ['jobmanager-label',174, 164, 330, 20,  'JobManager',         '🏛️', '#FF6B35'],
    ['scheduler',       180, 186, 145, 70,  'Scheduler',          '📅', '#FCD34D'],
    ['checkpoint',      335, 186, 165, 70,  'Checkpoint Coord.',  '✅', '#34D399'],
    // Middle row
    ['resourcemanager', 30,  292, 160, 60,  'Resource Manager',   '🎛️', '#22D3EE'],
    ['statebackend',    490, 292, 160, 60,  'State Backend',      '🗄️', '#F87171'],
    // TaskManagers
    ['taskmanager',     30,  382, 190, 84,  'TaskManager ×N',     '⚙️', '#FB923C'],
    ['taskmanager2',    245, 382, 190, 84,  'TaskManager',        '⚙️', '#FB923C'],
    ['taskmanager3',    460, 382, 190, 84,  'TaskManager',        '⚙️', '#FB923C'],
    // External
    ['kafka-ext',       30,  488, 86,  24,  'Kafka',              '🔗', '#64748b'],
    ['iceberg-ext',     124, 488, 86,  24,  'Iceberg',            '🧊', '#64748b'],
    ['s3-ext',          218, 488, 70,  24,  'S3',                 '☁️', '#64748b'],
    ['snowflake-ext',   296, 488, 92,  24,  'Snowflake',          '❄️', '#64748b'],
  ];

  const slots = ['#1e3a5f', '#1e3a5f', '#1e3a5f', '#1e3a5f'];

  const lines = `
    <defs>
      <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
        <path d="M0,0 L0,6 L8,3 z" fill="rgba(255,255,255,0.25)"/>
      </marker>
      <marker id="arr-blue" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
        <path d="M0,0 L0,6 L8,3 z" fill="#38BDF8"/>
      </marker>
      <marker id="arr-green" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
        <path d="M0,0 L0,6 L8,3 z" fill="#34D399"/>
      </marker>
      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>

    <!-- Client → Dispatcher -->
    <line x1="340" y1="60" x2="340" y2="82" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" marker-end="url(#arr)"/>
    <text x="346" y="73" font-size="9" fill="rgba(255,255,255,0.3)">submit job</text>

    <!-- Dispatcher → JobManager -->
    <line x1="340" y1="130" x2="340" y2="153" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" marker-end="url(#arr)"/>
    <text x="346" y="144" font-size="9" fill="rgba(255,255,255,0.3)">spawn</text>

    <!-- JobManager → ResourceManager -->
    <line x1="170" y1="220" x2="190" y2="292" stroke="rgba(34,211,238,0.3)" stroke-width="1.5" marker-end="url(#arr)"/>
    <text x="145" y="258" font-size="9" fill="rgba(34,211,238,0.5)">request slots</text>

    <!-- CheckpointCoord → StateBackend -->
    <line x1="500" y1="256" x2="530" y2="292" stroke="rgba(52,211,153,0.3)" stroke-width="1.5" stroke-dasharray="4,3" marker-end="url(#arr-green)"/>
    <text x="497" y="275" font-size="9" fill="rgba(52,211,153,0.5)">checkpoint</text>

    <!-- ResourceManager → TaskManagers -->
    <line x1="110" y1="352" x2="125" y2="380" stroke="rgba(251,146,60,0.3)" stroke-width="1.5" marker-end="url(#arr)"/>
    <line x1="130" y1="352" x2="340" y2="380" stroke="rgba(251,146,60,0.3)" stroke-width="1.5" marker-end="url(#arr)"/>
    <line x1="150" y1="352" x2="555" y2="380" stroke="rgba(251,146,60,0.3)" stroke-width="1.5" marker-end="url(#arr)"/>

    <!-- TaskManagers → StateBackend (state r/w) -->
    <line x1="490" y1="392" x2="490" y2="354" stroke="rgba(248,113,113,0.25)" stroke-width="1" stroke-dasharray="3,3"/>

    <!-- Animated pulse dots -->
    <circle class="pulse-dot" r="4" fill="#38BDF8" opacity="0.8">
      <animateMotion dur="1.8s" repeatCount="indefinite" path="M340,62 L340,82"/>
    </circle>
    <circle class="pulse-dot" r="3.5" fill="#A78BFA" opacity="0.8">
      <animateMotion dur="2s" repeatCount="indefinite" path="M340,132 L340,153"/>
    </circle>
    <circle class="pulse-dot" r="3" fill="#34D399" opacity="0.6">
      <animateMotion dur="2.5s" repeatCount="indefinite" path="M500,258 L530,292"/>
    </circle>
  `;

  // Draw components
  const compSVG = [];

  // JobManager container background
  compSVG.push(`
    <g class="arch-node" data-comp="jobmanager" style="cursor:pointer">
      <rect x="170" y="155" width="340" height="110" rx="10"
        fill="rgba(255,107,53,0.06)" stroke="rgba(255,107,53,0.25)" stroke-width="1.5"/>
      <text x="185" y="173" font-size="11" fill="rgba(255,107,53,0.8)" font-weight="700">🏛️ JobManager</text>
    </g>
  `);

  // Individual clickable components
  const NODES = [
    { id: 'client',          x:260, y:14,  w:160, h:46,  label:'Flink Client',      icon:'💻', color:'#38BDF8', clickId:'client' },
    { id: 'dispatcher',      x:260, y:84,  w:160, h:46,  label:'Dispatcher',        icon:'📮', color:'#A78BFA', clickId:'dispatcher' },
    { id: 'scheduler',       x:180, y:186, w:145, h:68,  label:'Scheduler',         icon:'📅', color:'#FCD34D', clickId:'scheduler' },
    { id: 'checkpoint',      x:335, y:186, w:165, h:68,  label:'Checkpoint Coord.', icon:'✅', color:'#34D399', clickId:'checkpoint' },
    { id: 'resourcemanager', x:30,  y:292, w:160, h:60,  label:'Resource Manager',  icon:'🎛️', color:'#22D3EE', clickId:'resourcemanager' },
    { id: 'statebackend',    x:490, y:292, w:160, h:60,  label:'State Backend',     icon:'🗄️', color:'#F87171', clickId:'statebackend' },
    { id: 'tm1',             x:30,  y:382, w:190, h:84,  label:'TaskManager 1',     icon:'⚙️', color:'#FB923C', clickId:'taskmanager' },
    { id: 'tm2',             x:245, y:382, w:190, h:84,  label:'TaskManager 2',     icon:'⚙️', color:'#FB923C', clickId:'taskmanager' },
    { id: 'tm3',             x:460, y:382, w:190, h:84,  label:'TaskManager 3',     icon:'⚙️', color:'#FB923C', clickId:'taskmanager' },
  ];

  NODES.forEach(n => {
    const slotColor = 'rgba(255,255,255,0.04)';
    const slots = n.id.startsWith('tm') ? `
      ${[0,1,2,3].map(i => `
        <rect x="${n.x + 6 + i*46}" y="${n.y+38}" width="40" height="38" rx="5"
          fill="${slotColor}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
        <text x="${n.x + 26 + i*46}" y="${n.y+62}" text-anchor="middle" font-size="8" fill="rgba(255,255,255,0.25)">slot ${i+1}</text>
      `).join('')}
    ` : '';

    compSVG.push(`
      <g class="arch-node" data-comp="${n.clickId}" id="node-${n.id}" style="cursor:pointer">
        <rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="9"
          fill="${n.color}18" stroke="${n.color}44" stroke-width="1.5"
          class="node-rect" data-color="${n.color}"/>
        <text x="${n.x+10}" y="${n.y+16}" font-size="13">${n.icon}</text>
        <text x="${n.x+28}" y="${n.y+17}" font-size="11" fill="${n.color}" font-weight="700">${n.label}</text>
        ${slots}
      </g>
    `);
  });

  // External storage row
  const EXT = [
    { x:30,  label:'Kafka',     icon:'🔗' },
    { x:124, label:'Iceberg',   icon:'🧊' },
    { x:218, label:'S3',        icon:'☁️' },
    { x:296, label:'Snowflake', icon:'❄️' },
    { x:397, label:'Delta',     icon:'Δ' },
    { x:480, label:'JDBC',      icon:'🗃️' },
  ];
  compSVG.push(`<text x="${W/2}" y="485" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.2)" font-weight="700">EXTERNAL STORAGE &amp; CONNECTORS</text>`);
  EXT.forEach(e => {
    compSVG.push(`
      <g style="cursor:default">
        <rect x="${e.x}" y="492" width="80" height="22" rx="5"
          fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
        <text x="${e.x+8}" y="507" font-size="10">${e.icon}</text>
        <text x="${e.x+22}" y="507" font-size="9" fill="rgba(255,255,255,0.4)">${e.label}</text>
      </g>
    `);
  });

  // Lines from TMs to external
  [30+95, 245+95, 460+95].forEach(tx => {
    compSVG.push(`<line x1="${tx}" y1="466" x2="${W/2}" y2="490" stroke="rgba(255,255,255,0.06)" stroke-width="1" stroke-dasharray="3,3"/>`);
  });

  return `<svg viewBox="0 0 ${W} ${H+24}" style="width:100%;height:auto;display:block;overflow:visible">
    ${lines}
    ${compSVG.join('\n')}
  </svg>`;
}

function initDiagram(container) {
  const detail = container.querySelector('#comp-detail');
  const inner  = container.querySelector('#comp-detail-inner');

  container.querySelectorAll('.arch-node').forEach(node => {
    node.addEventListener('mouseenter', () => {
      const rect = node.querySelector('rect.node-rect');
      if (rect) {
        rect.style.filter = 'url(#glow)';
        rect.style.stroke = rect.dataset.color;
        rect.style.strokeWidth = '2';
      }
    });
    node.addEventListener('mouseleave', () => {
      const rect = node.querySelector('rect.node-rect');
      if (rect) {
        rect.style.filter = '';
        rect.style.strokeWidth = '1.5';
        rect.style.stroke = rect.dataset.color + '44';
      }
    });
    node.addEventListener('click', () => {
      const compId = node.dataset.comp;
      const comp = COMPONENTS[compId];
      if (!comp) return;

      // Reset all
      container.querySelectorAll('.arch-node rect.node-rect').forEach(r => {
        r.style.strokeWidth = '1.5';
      });
      // Highlight selected
      node.querySelectorAll('rect.node-rect').forEach(r => {
        r.style.strokeWidth = '2.5';
        r.style.filter = 'url(#glow)';
      });

      detail.style.display = 'block';
      inner.innerHTML = buildDetailPanel(comp);
      inner.querySelectorAll('.iq-question').forEach(q => {
        q.addEventListener('click', () => {
          const item = q.closest('.iq-item');
          item.classList.toggle('open');
        });
      });
    });
  });

  // Auto-open JobManager on load. Dispatch a real click event rather than
  // calling .click(): the target is an SVG <g>, which has no .click() method.
  setTimeout(() => {
    container.querySelector('[data-comp="jobmanager"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }, 600);
}

function buildDetailPanel(comp) {
  return `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--border)">
      <span style="font-size:32px">${comp.icon}</span>
      <div>
        <div style="font-size:16px;font-weight:800;color:${comp.color}">${comp.label}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px">Apache Flink Component</div>
      </div>
    </div>

    <div style="font-size:13.5px;color:var(--text-secondary);line-height:1.65;margin-bottom:16px">${comp.def}</div>

    <div style="margin-bottom:16px">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:8px">RESPONSIBILITIES</div>
      ${comp.responsibilities.map(r => `
        <div style="display:flex;gap:8px;margin-bottom:7px;font-size:12.5px;color:var(--text-secondary)">
          <span style="color:${comp.color};flex-shrink:0;margin-top:1px">▸</span>
          <span>${r}</span>
        </div>
      `).join('')}
    </div>

    <div style="margin-bottom:16px;padding:12px;background:var(--bg-elevated);border-radius:8px;font-size:12.5px;color:var(--text-secondary);line-height:1.65">
      <div style="font-size:10px;font-weight:700;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:6px">HOW IT WORKS</div>
      ${comp.howItWorks}
    </div>

    <div style="margin-bottom:16px;padding:12px;background:var(--accent-dim);border-left:3px solid var(--accent);border-radius:0 8px 8px 0;font-size:12.5px;color:var(--text-secondary);line-height:1.65">
      <div style="font-size:10px;font-weight:700;letter-spacing:0.5px;color:var(--accent-text);margin-bottom:6px">🚗 UBER EXAMPLE</div>
      ${comp.uber}
    </div>

    <div style="font-size:11px;font-weight:700;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:8px">INTERVIEW QUESTIONS</div>
    <div class="iq-list">
      ${comp.interview.map((q, i) => `
        <div class="iq-item">
          <div class="iq-question">
            <span class="q-num">Q${i+1}</span>
            <span style="flex:1;font-size:12.5px">${q.q}</span>
            <span class="q-chevron">▼</span>
          </div>
          <div class="iq-answer fs-12">${q.a}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function buildConceptTab() {
  return `
    <div class="section-header">
      <div class="section-title">Component Deep Dive</div>
      <div class="section-desc">How the major architectural layers work together at Uber's scale</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:16px">
      ${[
        {
          title: 'Control Plane vs Data Plane',
          icon: '⚡',
          content: `Flink separates <strong>control plane</strong> (Client + Dispatcher + JobManager + ResourceManager) from <strong>data plane</strong> (TaskManagers).<br><br>
          The control plane handles job lifecycle, scheduling, and coordination — it processes zero user data. TaskManagers handle all data processing. This separation means a JobManager crash doesn't lose data that's been checkpointed, and a TaskManager crash doesn't affect other jobs.`,
        },
        {
          title: 'One Cluster, Many Jobs',
          icon: '🏛️',
          content: `A single Flink cluster can run hundreds of jobs simultaneously. Each job gets its own JobManager (isolated failure domain). The Dispatcher is the only shared entry point. TaskManager slots are shared across jobs — a TaskManager might run GPS fraud tasks in slot 1 and payment processing tasks in slot 2.<br><br>
          Uber runs 100+ Flink jobs on the same cluster. Session clusters share TaskManagers (efficient). Per-job clusters give isolation (Uber's preference for critical pipelines).`,
        },
        {
          title: 'Slot Sharing: The Key Efficiency Mechanism',
          icon: '🎰',
          content: `Without slot sharing: a 6-operator pipeline with parallelism=32 needs 6×32=192 slots.<br>
          With slot sharing (default): only 32 slots needed — one per parallelism chain. Each slot runs all 6 operators for one pipeline "lane."<br><br>
          This is critical for efficiency. Uber's GPS pipeline (6 operators, parallelism 32) uses 32 slots instead of 192. TaskManagers can have 4 slots each → only 8 TaskManagers needed instead of 48.`,
        },
        {
          title: 'State Backend: Where State Lives',
          icon: '🗄️',
          content: `State is at the TaskManager level, not the cluster level. Each parallel task instance maintains its own state partition.<br><br>
          With RocksDB: state lives on the TaskManager's local disk. Checkpoints async-copy state to S3/HDFS. Local recovery (Flink 1.9+) restores from local disk first — recovery in seconds instead of minutes for large state.<br><br>
          Uber's fraud state: 3M driver_id keys × 10KB each = 30GB. With 32 parallel tasks: each task manages ~1GB of state (32M / 32 = ~1M keys each). RocksDB handles this per-task.`,
        },
      ].map(s => `
        <div class="card">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
            <span style="font-size:24px">${s.icon}</span>
            <span style="font-size:16px;font-weight:700">${s.title}</span>
          </div>
          <div class="prose-sm">${s.content}</div>
        </div>
      `).join('')}
    </div>
  `;
}
