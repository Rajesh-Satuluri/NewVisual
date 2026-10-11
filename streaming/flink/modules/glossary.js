// Glossary — searchable, category-filterable Flink terminology.
const TERMS = [
  ['JobManager', 'Architecture', 'The master process. Coordinates checkpoints, schedules tasks, and manages recovery. Contains the Dispatcher, ResourceManager, and per-job JobMaster.'],
  ['TaskManager', 'Architecture', 'A worker process that executes subtasks in <code>task slots</code>. Each TM has a fixed number of slots; a slot runs one parallel pipeline of chained operators.'],
  ['Task Slot', 'Architecture', 'A unit of resource on a TaskManager. Slot sharing lets subtasks from different operators of the same job share one slot.'],
  ['JobGraph', 'Architecture', 'The client-side dataflow representation submitted to the cluster; the JobManager expands it into the parallel <code>ExecutionGraph</code>.'],
  ['ExecutionGraph', 'Architecture', 'The parallelized, schedulable version of the JobGraph — one node per parallel subtask.'],
  ['Parallelism', 'Execution', 'The number of parallel instances (subtasks) of an operator. Max parallelism bounds rescaling and is fixed at first run.'],
  ['Operator Chaining', 'Execution', 'Fusing consecutive operators into one task to avoid serialization and thread-handoff overhead.'],
  ['Keyed Stream', 'Execution', 'A stream partitioned by key via <code>keyBy</code>; all records with the same key go to the same subtask, enabling keyed state.'],
  ['Event Time', 'Time', 'The timestamp embedded in the event itself (when it actually happened). The basis for correct, deterministic results.'],
  ['Processing Time', 'Time', "The wall-clock time of the machine processing the event. Fast but non-deterministic."],
  ['Ingestion Time', 'Time', 'The time an event enters Flink at the source — a middle ground between event and processing time.'],
  ['Watermark', 'Time', 'A special record asserting "no event with timestamp ≤ W will arrive later." Drives event-time window firing. Computed as <code>max(eventTime) − Δ</code>.'],
  ['Bounded Out-of-Orderness', 'Time', 'The assumption that events are at most Δ late; the standard watermark strategy.'],
  ['Allowed Lateness', 'Time', 'Extra time a window stays open after the watermark passes, so late events can still update its result.'],
  ['Side Output', 'Time', 'A secondary output stream (via an <code>OutputTag</code>) — commonly used to capture late or malformed events.'],
  ['Tumbling Window', 'Windows', 'Fixed-size, non-overlapping windows (e.g. every 10s).'],
  ['Sliding Window', 'Windows', 'Fixed-size windows that overlap by a slide interval (e.g. size 10s, slide 5s).'],
  ['Session Window', 'Windows', 'Activity-based windows separated by a gap of inactivity; size varies per key.'],
  ['Keyed State', 'State', 'State scoped to a key: <code>ValueState</code>, <code>ListState</code>, <code>MapState</code>, etc. Accessible only on a keyed stream.'],
  ['Operator State', 'State', 'State scoped to a parallel operator instance (e.g. Kafka source offsets), redistributed on rescale.'],
  ['State Backend', 'State', 'Where working state and checkpoints live: <code>HashMapStateBackend</code> (heap) or <code>EmbeddedRocksDBStateBackend</code> (disk, large state).'],
  ['Checkpoint', 'Fault Tolerance', 'A periodic, automatic, consistent snapshot of all state using aligned barriers — the mechanism behind exactly-once recovery.'],
  ['Checkpoint Barrier', 'Fault Tolerance', 'A marker injected into the stream that flows with records; when an operator has received barriers from all inputs it snapshots its state.'],
  ['Savepoint', 'Fault Tolerance', 'A manually-triggered, portable snapshot used for upgrades, rescaling, and A/B testing. Like a checkpoint but user-owned.'],
  ['Exactly-Once', 'Fault Tolerance', 'Each event affects state exactly once despite failures. End-to-end also needs transactional/idempotent sinks (two-phase commit).'],
  ['Two-Phase Commit (2PC)', 'Fault Tolerance', 'Sink protocol (pre-commit on checkpoint, commit on completion) that extends exactly-once to external systems like Kafka.'],
  ['Restart Strategy', 'Fault Tolerance', 'Policy for recovery: fixed-delay, failure-rate, or exponential-delay.'],
  ['Backpressure', 'Performance', 'When a slow operator forces upstream operators to slow down. Flink handles it with credit-based flow control.'],
  ['Credit-Based Flow Control', 'Performance', 'Network-layer mechanism where receivers advertise buffer credits so senders never overwhelm them.'],
  ['Watermark Alignment', 'Performance', 'Keeping sources roughly in sync so a fast source cannot advance event time too far ahead of a slow one.'],
  ['Kafka Source', 'Connectors', 'The unified source connector using a <code>SplitEnumerator</code> to assign partitions to subtasks.'],
  ['File Sink', 'Connectors', 'Rolling part-file sink (in-progress → pending → finished) committed on checkpoints; supports Parquet/Avro/ORC.'],
  ['Flink SQL', 'APIs', 'ANSI-SQL layer over streaming; a query runs continuously and emits a changelog or append stream.'],
  ['Table API', 'APIs', 'A language-integrated relational API, interoperable with Flink SQL and the DataStream API.'],
  ['DataStream API', 'APIs', 'The core imperative API for building streaming pipelines with operators like map/keyBy/window/process.'],
  ['CEP', 'APIs', 'Complex Event Processing library for detecting patterns (sequences, within-time) over streams.'],
];

const CATS = ['All', ...[...new Set(TERMS.map(t => t[1]))]];

export function mount(container) {
  let cat = 'All';
  let query = '';

  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">📖 Reference · Glossary</div>
        <h1 class="module-title">Flink Glossary</h1>
        <p class="module-subtitle">Every term that trips people up in interviews — searchable and grouped. ${TERMS.length} entries.</p>
      </div>
      <div class="tab-content active">
        <div class="ref-toolbar">
          <input class="ref-search" type="text" placeholder="Search terms and definitions…" aria-label="Search glossary" />
        </div>
        <div class="ref-toolbar" id="gloss-cats">
          ${CATS.map(c => `<button class="ref-chip ${c === 'All' ? 'active' : ''}" data-cat="${c}">${c}</button>`).join('')}
        </div>
        <div class="glossary-grid" id="gloss-grid"></div>
        <div class="ref-empty" id="gloss-empty" hidden>No terms match your search.</div>
      </div>
    </div>
  `;

  const grid = container.querySelector('#gloss-grid');
  const empty = container.querySelector('#gloss-empty');

  function render() {
    const q = query.toLowerCase();
    const rows = TERMS.filter(([name, c, def]) =>
      (cat === 'All' || c === cat) &&
      (!q || name.toLowerCase().includes(q) || def.toLowerCase().includes(q)));
    empty.hidden = rows.length > 0;
    grid.innerHTML = rows.map(([name, c, def]) => `
      <div class="gloss-term">
        <div class="gloss-name">${name} <span class="gloss-cat">${c}</span></div>
        <div class="gloss-def">${def}</div>
      </div>`).join('');
  }

  container.querySelector('.ref-search').addEventListener('input', e => { query = e.target.value; render(); });
  container.querySelector('#gloss-cats').addEventListener('click', e => {
    const chip = e.target.closest('.ref-chip');
    if (!chip) return;
    cat = chip.dataset.cat;
    container.querySelectorAll('#gloss-cats .ref-chip').forEach(c => c.classList.toggle('active', c === chip));
    render();
  });

  render();
  return () => {};
}
