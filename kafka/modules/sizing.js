// Capacity & Sizing Lab — the back-of-envelope math for provisioning a topic:
// partition count, consumer parallelism, and storage/retention. Pure,
// deterministic arithmetic from your inputs — no simulation, no network. Every
// assumption is shown. Registered as the #sizing PAGE.

const FIELDS = [
  { id: 'throughput', label: 'Target peak throughput', unit: 'MB/s', value: 50, min: 0.1, step: 0.1,
    help: 'Sustained write rate at peak, across the whole topic.' },
  { id: 'msgSize', label: 'Average message size', unit: 'KB', value: 1, min: 0.01, step: 0.1,
    help: 'Used to translate MB/s into messages/s.' },
  { id: 'partThroughput', label: 'Throughput one partition can sustain', unit: 'MB/s', value: 10, min: 0.1, step: 0.5,
    help: 'A planning assumption — real per-partition limits depend on hardware, message size and consumer work. 10 MB/s is a common conservative starting point.' },
  { id: 'consumerThroughput', label: 'Throughput one consumer can process', unit: 'MB/s', value: 8, min: 0.1, step: 0.5,
    help: 'How fast a single consumer instance keeps up, including its downstream work.' },
  { id: 'rf', label: 'Replication factor', unit: '', value: 3, min: 1, step: 1,
    help: 'Copies of every partition. 3 is the production norm.' },
  { id: 'retentionDays', label: 'Retention', unit: 'days', value: 7, min: 0.1, step: 0.5,
    help: 'How long data is kept (time-based).' },
  { id: 'brokers', label: 'Brokers in the cluster', unit: '', value: 3, min: 1, step: 1,
    help: 'Used to estimate storage per broker.' },
  { id: 'headroom', label: 'Growth headroom', unit: '×', value: 1.5, min: 1, step: 0.1,
    help: 'Multiplier for future growth, since partitions can only be increased (and increasing re-maps keys).' },
];

function compute(v) {
  const bytesPerSec = v.throughput * 1e6;
  const msgsPerSec = v.msgSize > 0 ? bytesPerSec / (v.msgSize * 1e3) : 0;

  const partsRaw = v.throughput / v.partThroughput;
  const partitions = Math.max(1, Math.ceil(partsRaw * v.headroom));
  const partitionsNoHeadroom = Math.max(1, Math.ceil(partsRaw));

  const consumers = Math.max(1, Math.ceil(v.throughput / v.consumerThroughput));
  const maxConsumers = partitions; // parallelism ceiling

  const daySec = 86400;
  const rawBytesPerDay = bytesPerSec * daySec;              // pre-replication
  const storedBytesPerDay = rawBytesPerDay * v.rf;          // with replicas
  const totalStored = storedBytesPerDay * v.retentionDays;
  const perBroker = totalStored / Math.max(1, v.brokers);

  return {
    msgsPerSec, partitions, partitionsNoHeadroom, consumers, maxConsumers,
    rawBytesPerDay, storedBytesPerDay, totalStored, perBroker,
    consumerCapped: consumers > partitions,
  };
}

function fmtBytes(n) {
  const u = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  let i = 0; let x = n;
  while (x >= 1000 && i < u.length - 1) { x /= 1000; i++; }
  return `${x.toFixed(x >= 100 || i === 0 ? 0 : 1)} ${u[i]}`;
}
function fmtNum(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
  return n.toFixed(n < 10 ? 1 : 0);
}

export function mount(container) {
  const field = f => `
    <label class="sz-field" for="sz-${f.id}">
      <span class="sz-flabel">${f.label}${f.unit ? ` <span class="sz-unit">(${f.unit})</span>` : ''}</span>
      <input class="sz-input" id="sz-${f.id}" type="number" value="${f.value}" min="${f.min}" step="${f.step}" data-id="${f.id}" />
      <span class="sz-help">${f.help}</span>
    </label>`;

  container.innerHTML = `
    <div class="module-page">
      <div class="module-hero">
        <div class="module-tag">📐 · Reference · Capacity Lab</div>
        <h1 class="module-title">Capacity &amp; Sizing Lab</h1>
        <p class="module-subtitle">The back-of-envelope math for provisioning a Kafka topic — partition count, consumer parallelism, and storage. It's plain arithmetic from your inputs (no simulation), so you can reproduce it on a whiteboard in an interview. Every assumption is on screen.</p>
      </div>
      <div class="sz-grid">
        <form class="sz-inputs" autocomplete="off">
          ${FIELDS.map(field).join('')}
        </form>
        <div class="sz-results" id="sz-results"></div>
      </div>
      <div class="canvas-explainer" style="border-radius:10px;margin-top:16px">
        <p><strong>How these are derived.</strong> Partitions = ⌈ throughput ÷ per-partition throughput ⌉ × headroom, because a partition caps how much one consumer can pull and partitions can only be <em>increased</em> later (which re-maps keys). Recommended consumers = ⌈ throughput ÷ per-consumer throughput ⌉, but a consumer group can never have more active consumers than partitions — so if that number exceeds the partition count, you must add partitions first. Storage = throughput × replication factor × retention, divided across brokers for a per-broker estimate. These are <strong>planning estimates</strong>, not guarantees — real limits depend on hardware, message size, and consumer work.</p>
      </div>
    </div>`;

  const results = container.querySelector('#sz-results');
  const inputs = [...container.querySelectorAll('.sz-input')];

  const render = () => {
    const v = {};
    FIELDS.forEach(f => {
      const el = container.querySelector(`#sz-${f.id}`);
      let n = parseFloat(el.value);
      if (!Number.isFinite(n) || n < f.min) n = f.min;
      v[f.id] = n;
    });
    const r = compute(v);

    const stat = (big, label, sub, flag) => `
      <div class="sz-stat${flag ? ' sz-stat-flag' : ''}">
        <div class="sz-stat-val">${big}</div>
        <div class="sz-stat-label">${label}</div>
        ${sub ? `<div class="sz-stat-sub">${sub}</div>` : ''}
      </div>`;

    results.innerHTML = `
      <div class="sz-stats">
        ${stat(r.partitions, 'Recommended partitions', `${r.partitionsNoHeadroom} without headroom`)}
        ${stat(r.maxConsumers, 'Max consumers per group', 'equals partition count')}
        ${stat(r.consumers, 'Consumers to keep up', r.consumerCapped ? '⚠ exceeds partitions — add partitions first' : 'fits within partitions', r.consumerCapped)}
        ${stat(fmtNum(r.msgsPerSec) + '/s', 'Messages per second', `at ${(v.msgSize)} KB each`)}
      </div>
      <div class="sz-storage">
        <div class="sz-srow"><span>Ingest (pre-replication)</span><code>${fmtBytes(r.rawBytesPerDay)}/day</code></div>
        <div class="sz-srow"><span>Stored per day (×RF ${v.rf})</span><code>${fmtBytes(r.storedBytesPerDay)}/day</code></div>
        <div class="sz-srow sz-srow-total"><span>Total at ${v.retentionDays}-day retention</span><code>${fmtBytes(r.totalStored)}</code></div>
        <div class="sz-srow"><span>≈ per broker (${v.brokers} brokers)</span><code>${fmtBytes(r.perBroker)}</code></div>
      </div>
      ${r.consumerCapped ? `<div class="sz-warn">To process ${v.throughput} MB/s you need ~${r.consumers} consumers, but a group can only run ${r.maxConsumers} in parallel (one per partition). Increase partitions to at least ${r.consumers} to unlock that parallelism.</div>` : ''}`;
  };

  inputs.forEach(el => el.addEventListener('input', render));
  render();
  return () => {};
}
