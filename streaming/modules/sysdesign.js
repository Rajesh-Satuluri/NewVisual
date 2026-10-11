// Gate 7 (I69) — System Design Lab. Pick a brief, make design decisions, then get
// evaluated feedback against the brief's real trade-offs. Not a single "right"
// answer — the rubric rewards choices that satisfy the stated requirements.
import { getScenario } from '../data/scenarios.js';
import { callout, flowDiagram } from '../components/lesson-shell.js';

const BRIEFS = [
  {
    id: 'fraud', icon: '🛡️', title: 'Real-time fraud detection',
    reqs: ['Sub-second scoring latency', 'Per-entity ordering', 'Survive failures without losing events', 'Replay history to retrain models'],
    fields: [
      { id: 'log', label: 'Ingestion log', opts: { kafka: 'Kafka / MSK', kinesis: 'Kinesis', none: 'No durable log (direct call)' } },
      { id: 'proc', label: 'Processor', opts: { flink: 'Apache Flink (per-event)', dbx: 'Databricks (micro-batch)', lambda: 'Lambda (per-event fn)' } },
      { id: 'key', label: 'Partition key', opts: { entity: 'By entity (preserves order)', random: 'Random (max spread)' } },
      { id: 'sink', label: 'Raw landing', opts: { lake: 'Lakehouse / object store', nowrite: 'Do not keep raw' } },
    ],
    score(a) {
      const f = [];
      if (a.log === 'none') f.push(['bad', 'No durable log means no replay and no failure recovery — both are hard requirements here.']);
      else f.push(['good', 'A durable, replayable log satisfies both failure-recovery and replay-for-retraining.']);
      if (a.proc === 'flink') f.push(['good', 'Flink is per-event — meets the sub-second latency requirement and handles rich stateful scoring.']);
      else if (a.proc === 'lambda') f.push(['warn', 'Lambda is low-latency but weak for complex windowed/keyed scoring; fine for simple rules only.']);
      else f.push(['bad', 'Databricks is micro-batch by default (seconds) — misses the sub-second requirement unless you use real-time mode.']);
      if (a.key === 'entity') f.push(['good', 'Keying by entity preserves the per-entity ordering the scoring logic depends on.']);
      else f.push(['bad', 'Random keying maximizes spread but breaks per-entity ordering — scoring would see events out of sequence.']);
      if (a.sink === 'lake') f.push(['good', 'Landing raw to a lakehouse enables model retraining and audit/replay.']);
      else f.push(['bad', 'Not keeping raw data makes retraining and incident forensics impossible.']);
      return f;
    },
    ideal: ['Kafka / MSK', 'Apache Flink (per-event)', 'By entity', 'Lakehouse / object store'],
  },
  {
    id: 'orders', icon: '🛒', title: 'Order processing without double-charges',
    reqs: ['No double-charge ever', 'Per-order event ordering', 'Exactly-once to the ledger', 'Analytics on all orders'],
    fields: [
      { id: 'log', label: 'Ingestion log', opts: { kafka: 'Kafka / MSK', eventhubs: 'Event Hubs', none: 'No durable log' } },
      { id: 'key', label: 'Partition key', opts: { order: 'By order id (ordering)', customer: 'By customer id' } },
      { id: 'sink', label: 'Ledger sink', opts: { txn: 'Transactional sink (Delta/DB txn)', rest: 'Plain REST call', idem: 'REST + idempotency key' } },
      { id: 'analytics', label: 'Analytics path', opts: { lake: 'Stream to lakehouse', none: 'Query the log directly forever' } },
    ],
    score(a) {
      const f = [];
      if (a.log === 'none') f.push(['bad', 'Without a durable log you cannot recover or reprocess — exactly-once is impossible.']);
      else f.push(['good', 'A durable log is the foundation for ordered, recoverable processing.']);
      if (a.key === 'order') f.push(['good', 'Keying by order id keeps each order\'s events (place→pay→ship) in sequence.']);
      else f.push(['warn', 'Keying by customer groups a customer\'s orders but can interleave events of different orders — order id is safer for per-order sequencing.']);
      if (a.sink === 'txn') f.push(['good', 'A transactional sink gives exactly-once to the ledger — no double-charge on replay.']);
      else if (a.sink === 'idem') f.push(['good', 'REST + idempotency key makes the external charge safe under at-least-once replay.']);
      else f.push(['bad', 'A plain REST call is non-idempotent: a replay after failure double-charges. This violates the hard requirement.']);
      if (a.analytics === 'lake') f.push(['good', 'Streaming to a lakehouse gives durable, queryable analytics on all orders.']);
      else f.push(['warn', 'Querying the log forever is impractical (retention, no rich analytics) — land it to a store.']);
      return f;
    },
    ideal: ['Kafka / MSK', 'By order id', 'Transactional sink (Delta/DB txn)', 'Stream to lakehouse'],
  },
];

export async function mount(container, id) {
  const sc = getScenario();
  if (!id || id === 'sysdesign') return landing(container, sc);
  const brief = BRIEFS.find(b => b.id === id.replace('sd-', ''));
  if (!brief) return landing(container, sc);
  return lab(container, sc, brief);
}

function landing(container, sc) {
  container.innerHTML = `
    <div class="page-head"><div class="page-eyebrow">Practice</div>
      <h1 class="page-title">📐 System Design Lab</h1>
      <p class="page-sub">Take a design brief, make the architecture decisions, and get evaluated feedback on
        whether your choices satisfy the requirements and their trade-offs.</p></div>
    <div class="scenario-banner"><span class="sb-ico">${sc.icon}</span>
      <div class="sb-body">Design practice grounded in both permanent scenarios — mobility and e-commerce.</div></div>
    <div class="fnd-grid">
      ${BRIEFS.map(b => `<div class="card fnd-card" data-go="sd-${b.id}">
        <span class="fnd-num">${b.icon}</span>
        <div><h3>${b.title}</h3><p>Requirements: ${b.reqs.join(' · ')}</p></div></div>`).join('')}
    </div>`;
  container.querySelectorAll('[data-go]').forEach(c => c.addEventListener('click', () => { location.hash = '#' + c.dataset.go; }));
}

function lab(container, sc, brief) {
  const sel = (fld) => `<label class="sim-slider"><span>${fld.label}</span>
    <select id="sd-${fld.id}" style="background:var(--bg3);color:var(--text);border:1px solid var(--border);border-radius:8px;padding:6px">
      ${Object.entries(fld.opts).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>`;
  container.innerHTML = `
    <div class="page-head"><div class="page-eyebrow"><a href="#sysdesign" style="color:var(--text3)">System Design Lab</a></div>
      <h1 class="page-title">${brief.icon} ${brief.title}</h1></div>
    ${callout('info', '📋 Requirements', '<ul class="clean">' + brief.reqs.map(r => `<li>${r}</li>`).join('') + '</ul>')}
    <div class="card"><div style="font-weight:600;margin-bottom:10px">Make your design decisions:</div>
      <div class="sim-controls">${brief.fields.map(sel).join('')}</div>
      <div style="margin-top:12px"><button class="btn primary" id="sd-eval">Evaluate my design</button></div>
    </div>
    <div id="sd-diag"></div><div id="sd-fb"></div>
    <div class="lx-nav"><div><button class="btn" data-go="sysdesign">← All briefs</button></div></div>`;
  container.querySelectorAll('.lx-nav [data-go]').forEach(b => b.addEventListener('click', () => { location.hash = '#' + b.dataset.go; }));
  container.querySelector('#sd-eval').addEventListener('click', () => {
    const a = {}; brief.fields.forEach(f => a[f.id] = container.querySelector('#sd-' + f.id).value);
    const chosen = brief.fields.map(f => f.opts[a[f.id]]);
    const fb = brief.score(a);
    const good = fb.filter(x => x[0] === 'good').length, bad = fb.filter(x => x[0] === 'bad').length;
    const verdict = bad === 0 ? ['ok', `✅ Strong design — ${good}/${fb.length} choices meet the requirements.`]
      : bad <= 1 ? ['warn', `⚠ Nearly there — ${bad} choice violates a requirement.`]
      : ['danger', `✗ Several requirements unmet — ${bad} choices need rework.`];
    container.querySelector('#sd-diag').innerHTML = flowDiagram(chosen);
    container.querySelector('#sd-fb').innerHTML =
      callout(verdict[0], 'Verdict', verdict[1]) +
      fb.map(([k, t]) => callout(k === 'good' ? 'ok' : k === 'warn' ? 'warn' : 'danger', k === 'good' ? '✓' : k === 'warn' ? '⚠' : '✗', t)).join('') +
      callout('info', '💡 A reference design', brief.ideal.join('  →  '));
  });
}
