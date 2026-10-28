// Capacity & Sizing Lab — deterministic back-of-the-envelope Flink sizing.
// Every number is a reproducible planning estimate from the inputs; nothing is
// simulated or random. The formulas are the ones you'd defend on a whiteboard.

const codeBlock = (code) => `<div class="code-block"><pre>${code
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></div>`;

const FIELDS = [
  { id: 'throughput', label: 'Peak input throughput', unit: 'events/sec', min: 1000, max: 5000000, step: 1000, val: 1000000 },
  { id: 'perSubtask', label: 'Throughput one subtask sustains', unit: 'events/sec', min: 1000, max: 200000, step: 1000, val: 50000 },
  { id: 'headroom', label: 'Headroom factor', unit: '×', min: 1, max: 3, step: 0.1, val: 1.5 },
  { id: 'slotsPerTM', label: 'Task slots per TaskManager', unit: 'slots', min: 1, max: 16, step: 1, val: 4 },
  { id: 'keys', label: 'Distinct keys (e.g. active drivers)', unit: 'keys', min: 1000, max: 50000000, step: 1000, val: 2000000 },
  { id: 'statePerKey', label: 'State per key', unit: 'bytes', min: 16, max: 100000, step: 16, val: 512 },
  { id: 'replication', label: 'Checkpoint copies kept', unit: '×', min: 1, max: 5, step: 1, val: 2 },
  { id: 'retentionMin', label: 'Source retention to replay', unit: 'min', min: 1, max: 1440, step: 1, val: 60 },
];

const fmtInt = n => Math.round(n).toLocaleString('en-US');
function fmtBytes(b) {
  const u = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let i = 0; let v = b;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}

function compute(v) {
  const parallelism = Math.ceil((v.throughput / v.perSubtask) * v.headroom);
  const slots = parallelism; // one slot per parallel pipeline (slot sharing)
  const taskManagers = Math.ceil(slots / v.slotsPerTM);
  const workingState = v.keys * v.statePerKey;            // live state
  const checkpointStorage = workingState * v.replication; // durable copies
  const sourceBuffer = v.throughput * v.retentionMin * 60 * 200; // ~200B/event replay buffer
  const perSubtaskState = workingState / Math.max(parallelism, 1);
  return { parallelism, slots, taskManagers, workingState, checkpointStorage, sourceBuffer, perSubtaskState };
}

export function mount(container) {
  const v = Object.fromEntries(FIELDS.map(f => [f.id, f.val]));

  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">📐 Lab · Capacity & Sizing</div>
        <h1 class="module-title">Capacity & Sizing Lab</h1>
        <p class="module-subtitle">Size an Uber-scale Flink job from first principles. Every output is a <strong>deterministic planning estimate</strong> computed from your inputs — reproducible on a whiteboard, nothing simulated.</p>
      </div>
      <div class="tab-content active">
        <div class="sizing-wrap">
          <div class="sizing-inputs">
            <div class="section-header"><div class="section-title">Inputs</div><div class="section-desc">Drag or type. Defaults model ride R-4471's platform.</div></div>
            ${FIELDS.map(f => `
              <label class="sizing-field" for="sz-${f.id}">
                <span class="sizing-flabel">${f.label} <span class="sizing-unit">(${f.unit})</span></span>
                <span class="sizing-controls">
                  <input type="range" id="sz-${f.id}" data-k="${f.id}" min="${f.min}" max="${f.max}" step="${f.step}" value="${f.val}" aria-label="${f.label}" />
                  <input type="number" class="sizing-num" data-k="${f.id}" min="${f.min}" max="${f.max}" step="${f.step}" value="${f.val}" aria-label="${f.label} value" />
                </span>
              </label>`).join('')}
          </div>
          <div class="sizing-outputs">
            <div class="section-header"><div class="section-title">Planning estimate</div><div class="section-desc">Derived live from the inputs.</div></div>
            <div class="sizing-grid" id="sz-out"></div>
            <div class="sizing-formulas">
              <div class="section-header"><div class="section-title">The math</div><div class="section-desc">Exactly how each number is derived.</div></div>
              ${codeBlock(`parallelism       = ceil(throughput / per_subtask_throughput * headroom)
task_slots        = parallelism            # slot sharing: 1 pipeline per slot
task_managers     = ceil(task_slots / slots_per_tm)
working_state     = distinct_keys * state_per_key
checkpoint_store  = working_state * copies_kept
replay_buffer     = throughput * retention_seconds * ~200 bytes/event
per_subtask_state = working_state / parallelism`)}
              <div class="sizing-note">⚠️ These are starting points for a capacity plan, not guarantees. Validate against a load test: real per-subtask throughput depends on serialization, state access pattern, and operator chaining. Consumer parallelism is also capped by source partition count (see Connectors).</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  const outEl = container.querySelector('#sz-out');

  function renderOut() {
    const r = compute(v);
    const cards = [
      ['Operator parallelism', fmtInt(r.parallelism), 'parallel subtasks'],
      ['Task slots', fmtInt(r.slots), 'one pipeline each'],
      ['TaskManagers', fmtInt(r.taskManagers), `at ${v.slotsPerTM} slots/TM`],
      ['Working state', fmtBytes(r.workingState), 'live, across the cluster'],
      ['State per subtask', fmtBytes(r.perSubtaskState), 'drives backend choice'],
      ['Checkpoint storage', fmtBytes(r.checkpointStorage), `${v.replication}× copies in S3/HDFS`],
      ['Replay buffer', fmtBytes(r.sourceBuffer), `${v.retentionMin} min of source`],
    ];
    outEl.innerHTML = cards.map(([k, val, sub]) => `
      <div class="sizing-card">
        <div class="sizing-cval">${val}</div>
        <div class="sizing-ck">${k}</div>
        <div class="sizing-csub">${sub}</div>
      </div>`).join('');

    // backend hint
    const hint = r.perSubtaskState > 512 * 1024 * 1024
      ? '💡 Per-subtask state &gt; 512 MB → use the <code>EmbeddedRocksDBStateBackend</code> with incremental checkpoints.'
      : '💡 Per-subtask state is small → the heap <code>HashMapStateBackend</code> will be faster.';
    outEl.insertAdjacentHTML('beforeend', `<div class="sizing-hint">${hint}</div>`);
  }

  function sync(k, raw) {
    const f = FIELDS.find(x => x.id === k);
    let n = Number(raw);
    if (Number.isNaN(n)) return;
    n = Math.min(f.max, Math.max(f.min, n));
    v[k] = n;
    container.querySelectorAll(`[data-k="${k}"]`).forEach(el => { if (Number(el.value) !== n) el.value = n; });
    renderOut();
  }

  container.querySelectorAll('.sizing-inputs input').forEach(el => {
    el.addEventListener('input', () => sync(el.dataset.k, el.value));
  });

  renderOut();
  return () => {};
}
