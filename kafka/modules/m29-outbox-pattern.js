// M29 — Microservices & the Outbox Pattern. Services as Kafka producers, the
// dual-write problem (no atomicity across a DB and Kafka), and the transactional
// outbox that fixes it (one local transaction + Debezium's Outbox Event Router).
// Includes a failure-injection playground comparing dual-write vs outbox.
import { createModuleShell, createIQSection } from '../components/module-shell.js';
import CDCSim from '../sim/cdc-engine.js';

export const IQ = [
  {
    q: 'What is the dual-write problem?',
    a: 'A service often needs to do two things when something happens: <strong>persist the change to its database</strong> and <strong>publish an event to Kafka</strong> so other services hear about it. The dual-write problem is that these are <em>two separate systems with no shared transaction</em>, so there is a window where one succeeds and the other fails. If the DB write commits and then the process crashes before the Kafka publish, the order exists but <strong>no event is ever emitted</strong> — downstream never learns. If instead you publish to Kafka first and the DB transaction then rolls back, you\'ve emitted a <strong>phantom event</strong> for an order that doesn\'t exist. You cannot fix this with a distributed/XA transaction across a database and Kafka in any practical, performant way — so you need a pattern that makes the two writes atomic by routing them through a <em>single</em> transactional system.',
    tip: 'Name both failure directions: DB-then-crash = lost event; publish-then-rollback = phantom event. Saying "there\'s no practical XA transaction across Postgres and Kafka" shows you know why the naive fix doesn\'t work.',
  },
  {
    q: 'How does the transactional outbox pattern fix dual-write, and what delivery guarantee does it give?',
    a: 'Instead of writing to the DB and then to Kafka, the service writes the business change <strong>and</strong> a row into an <strong>outbox table</strong> — both in <em>one local database transaction</em>. That transaction is atomic: either the order and its outbox event both commit, or neither does. There is no in-between, so the event can never disagree with the database state. A separate process — <strong>Debezium capturing the outbox table</strong> via CDC — then reads those committed outbox rows and publishes them to Kafka. Because capture is decoupled and a row can be re-published after a crash/retry, the guarantee is <strong>at-least-once</strong>: an event may be delivered more than once, so consumers must be <strong>idempotent</strong> (dedupe by the event id). What you\'ve done is convert an impossible "two-system atomic write" into a solved "one-system atomic write + reliable log tailing."',
    tip: 'The crisp framing: "both writes go into ONE database transaction (atomic), and Debezium tails the outbox table." Then add the honest caveat — at-least-once, so consumers dedupe by event id.',
  },
  {
    q: 'How does Debezium\'s Outbox Event Router work, and why are outbox events better than raw table CDC?',
    a: 'The <strong>Outbox Event Router</strong> is a Debezium SMT that turns raw CDC of the outbox table into clean domain events. The outbox table has a conventional shape: <code>id</code> (unique event id, for dedup), <code>aggregatetype</code> (e.g. <code>order</code> — drives the <em>topic</em>), <code>aggregateid</code> (e.g. the order id — becomes the Kafka <em>message key</em>, preserving per-aggregate order), <code>type</code> (event type → a header), and <code>payload</code> (the event body → the message value). The router maps <code>aggregatetype</code> → a topic like <code>outbox.event.order</code> and emits just the payload. Why this beats capturing your business tables directly: raw table CDC exposes your <strong>internal physical schema</strong> — consumers couple to your column names, a single domain event may be smeared across several tables, and internal columns leak. The outbox lets you emit <strong>intentionally-shaped, versioned domain events</strong> on well-named topics, fully decoupled from how you happen to store data — and because outbox rows are insert-only, they arrive as clean <code>op:"c"</code> events.',
    tip: 'Map the columns to their jobs: aggregatetype→topic, aggregateid→key, payload→value, id→dedup. The deeper point: outbox = curated domain events (a published contract); raw CDC = your internal schema leaking to consumers.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M29 · CDC Integrations',
    title: 'Microservices & the Outbox Pattern',
    subtitle: 'Services as Kafka producers, the dual-write trap that corrupts data, and the transactional outbox (plus Debezium\'s Outbox Event Router) that makes the two writes atomic.',
    tabs: [
      { id: 'problem', label: '⚠️ The Dual-Write Problem' },
      { id: 'play', label: '🧪 Failure Playground' },
      { id: 'iq', label: '🎯 Interview Q&A' },
    ],
  });
  buildProblem(container);
  const cleanup = buildPlayground(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

function buildProblem(container) {
  const tab = container.querySelector('#tab-problem');
  tab.innerHTML = `
    <div class="prose-block">
      <h3>Services need to save data AND tell everyone</h3>
      <p>When the Order Service accepts an order, two things must happen: the order is <strong>saved to its database</strong>, and an <strong>OrderPlaced event</strong> is published so Inventory, Fraud, Notifications and the warehouse can react. The obvious code writes the database, then publishes to Kafka. That obvious code is quietly broken.</p>

      <h3>The dual-write trap</h3>
      <p>The database and Kafka are <strong>two separate systems with no shared transaction</strong>. So there is always a gap between the two writes where a crash leaves them disagreeing:</p>
      <div class="cdc-kv-grid">
        <div class="cdc-kv"><div class="cdc-kv-k">💾 DB commits, then crash</div><div class="cdc-kv-v">The order is saved but the OrderPlaced event is <strong>never published</strong>. Inventory never reserves stock; the order silently falls through the cracks. A <em>lost event</em>.</div></div>
        <div class="cdc-kv"><div class="cdc-kv-k">📤 Publish, then rollback</div><div class="cdc-kv-v">The event goes to Kafka but the DB transaction <strong>rolls back</strong>. Now there\'s a <em>phantom event</em> for an order that doesn\'t exist — downstream acts on nothing.</div></div>
      </div>
      <p>You can\'t wrap a database and Kafka in one distributed transaction in any practical, performant way. So instead of making two systems atomic, you route both writes through <strong>one</strong> system.</p>

      <div class="callout callout-key">
        <div class="callout-head">🔑 The transactional outbox</div>
        <p>Write the business change <strong>and</strong> an event row into an <strong>outbox table</strong> in the <em>same local database transaction</em>. It\'s atomic — both commit or neither does, so the event can never disagree with the data. Then <strong>Debezium captures the outbox table</strong> and publishes those rows to Kafka. You\'ve turned an impossible two-system atomic write into a solved one-system write plus reliable log-tailing. The cost: delivery is <strong>at-least-once</strong>, so consumers dedupe by the event <code>id</code>.</p>
      </div>

      <h3>Debezium\'s Outbox Event Router</h3>
      <p>An SMT turns raw CDC of the outbox table into clean domain events. The conventional columns each have a job:</p>
      <div class="cdc-outbox-cols">
        <div class="cdc-outbox-col"><code>id</code><span>unique event id → dedup / idempotency</span></div>
        <div class="cdc-outbox-col"><code>aggregatetype</code><span>e.g. <b>order</b> → routes to topic <code>outbox.event.order</code></span></div>
        <div class="cdc-outbox-col"><code>aggregateid</code><span>e.g. order id → Kafka message <b>key</b> (per-aggregate order)</span></div>
        <div class="cdc-outbox-col"><code>type</code><span>event type → a message header</span></div>
        <div class="cdc-outbox-col"><code>payload</code><span>the domain event body → message <b>value</b></span></div>
      </div>
      <p class="cdc-note-line">Raw table CDC leaks your internal schema to consumers; the outbox publishes <strong>intentional, versioned domain events</strong> on well-named topics, decoupled from how you store data. See it fail and get fixed in the next tab.</p>
    </div>`;
}

function buildPlayground(container) {
  const tab = container.querySelector('#tab-play');
  tab.innerHTML = `
    <div class="cdc-scope-note">⚠️ Deterministic simulation. "Dual write" models two separate writes with a crash injected between them; "Outbox" uses the CDC engine — one transaction, then Debezium tails the outbox.</div>
    <div class="cdc-ob">
      <div class="cdc-lab-controls">
        <div class="cdc-ctrl-group">
          <span class="cdc-ctrl-label">Approach</span>
          <select class="study-select" id="ob-mode">
            <option value="dual">Dual write (DB, then Kafka)</option>
            <option value="outbox">Transactional outbox</option>
          </select>
        </div>
        <div class="cdc-ctrl-group" id="ob-dual-ctrls">
          <span class="cdc-ctrl-label">Place an order — pick what happens</span>
          <button class="ctrl-btn" data-act="ok">✅ Both writes succeed</button>
          <button class="ctrl-btn" data-act="crashDB">💥 Crash after DB write</button>
          <button class="ctrl-btn" data-act="crashPub">💥 Publish, then DB rollback</button>
        </div>
        <div class="cdc-ctrl-group" id="ob-outbox-ctrls" hidden>
          <span class="cdc-ctrl-label">Place an order</span>
          <button class="ctrl-btn" data-act="obPlace">🧾 Order + outbox (one txn)</button>
          <button class="ctrl-btn" data-act="obCrash">💥 Crash mid-transaction</button>
          <button class="ctrl-btn" data-act="obPublish">🔌 Debezium tails outbox</button>
        </div>
        <button class="ctrl-btn cdc-reset" data-act="reset">↺ Reset</button>
      </div>

      <div class="cdc-verdict-bar" id="ob-verdict"></div>

      <div class="cdc-ob-grid" id="ob-grid"></div>
    </div>`;

  let mode = 'dual';
  // dual-write local model
  let db = [];          // orders committed to the DB
  let kafka = [];       // OrderPlaced events in Kafka
  let nextId = 5001;
  let lastVerdict = null;
  // outbox model (CDC engine)
  let sim;
  function freshOutbox() {
    sim = new CDCSim({ seed: 17 });
    sim.createTable('orders', { pk: 'id', columns: ['id', 'status', 'amount'] });
    sim.createTable('outbox', { pk: 'id', columns: ['id', 'aggregatetype', 'aggregateid', 'type', 'payload'] });
  }
  freshOutbox();
  const $ = s => container.querySelector(s);

  function verdict(kind, msg) { lastVerdict = { kind, msg }; }

  function render() {
    $('#ob-dual-ctrls').hidden = mode !== 'dual';
    $('#ob-outbox-ctrls').hidden = mode !== 'outbox';

    let grid = '';
    if (mode === 'dual') {
      grid = `
        <div class="cdc-box"><div class="cdc-box-head">💾 Order Service DB</div><div class="cdc-box-body">${tblOrders(db)}</div></div>
        <div class="cdc-box"><div class="cdc-box-head">📨 Kafka · orders topic</div><div class="cdc-box-body">${evList(kafka)}</div></div>`;
    } else {
      const orders = sim.currentState('orders');
      const outbox = sim.currentState('outbox');
      const evs = sim.bronze.filter(e => e.table === 'outbox');
      grid = `
        <div class="cdc-box"><div class="cdc-box-head">💾 orders <span class="cdc-box-sub">business table</span></div><div class="cdc-box-body">${tblOrders(orders)}</div></div>
        <div class="cdc-box"><div class="cdc-box-head">📥 outbox <span class="cdc-box-sub">written in the SAME txn</span></div><div class="cdc-box-body">${tblOutbox(outbox)}</div></div>
        <div class="cdc-box"><div class="cdc-box-head">📨 Kafka · outbox.event.order <span class="cdc-box-sub">Debezium → Event Router</span></div><div class="cdc-box-body">${evList(evs.map(e => ({ id: e.after.aggregateid, status: 'OrderPlaced' })))}</div></div>`;
    }
    $('#ob-grid').innerHTML = grid;

    const v = lastVerdict;
    $('#ob-verdict').innerHTML = v
      ? `<div class="cdc-verdict-box cdc-verdict-${v.kind}">${v.msg}</div>`
      : `<div class="cdc-verdict-box cdc-verdict-idle">Place an order and see whether the database and Kafka end up agreeing.</div>`;
  }

  function tblOrders(rows) {
    return rows.length
      ? `<table class="cdc-tbl"><thead><tr><th>id</th><th>status</th><th>amount</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r.id}</td><td>${r.status || 'NEW'}</td><td>$${r.amount ?? ''}</td></tr>`).join('')}</tbody></table>`
      : `<div class="cdc-empty">— no orders —</div>`;
  }
  function tblOutbox(rows) {
    return rows.length
      ? `<table class="cdc-tbl"><thead><tr><th>aggregatetype</th><th>aggregateid</th><th>type</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r.aggregatetype}</td><td>${r.aggregateid}</td><td>${r.type}</td></tr>`).join('')}</tbody></table>`
      : `<div class="cdc-empty">— empty —</div>`;
  }
  function evList(evs) {
    return evs.length
      ? evs.map(e => `<div class="cdc-wal-rec"><span class="cdc-ev-op cdc-ev-c">OrderPlaced</span><span class="cdc-ev-key">id=${e.id}</span></div>`).join('')
      : `<div class="cdc-empty">— no events —</div>`;
  }

  function checkDual() {
    // consistency: every DB order has an event, and every event has a DB order
    const dbIds = new Set(db.map(o => o.id));
    const evIds = new Set(kafka.map(e => e.id));
    const lostEvent = [...dbIds].some(id => !evIds.has(id));
    const phantom = [...evIds].some(id => !dbIds.has(id));
    if (lostEvent) verdict('bad', `❌ <strong>Lost event:</strong> an order is in the database but no event reached Kafka. Downstream services will never hear about it. This is the dual-write trap.`);
    else if (phantom) verdict('bad', `❌ <strong>Phantom event:</strong> an event is in Kafka for an order that was never committed. Downstream will act on an order that doesn\'t exist.`);
    else verdict('good', `✅ Consistent — but only because nothing crashed in the gap between the two writes. That gap is always there.`);
  }

  tab.querySelector('.cdc-lab-controls').addEventListener('click', e => {
    const act = e.target.closest('button')?.dataset.act;
    if (!act) return;
    try {
      if (act === 'ok') { const id = nextId++; db.push({ id, status: 'NEW', amount: 60 }); kafka.push({ id }); checkDual(); }
      else if (act === 'crashDB') { const id = nextId++; db.push({ id, status: 'NEW', amount: 60 }); /* publish never happens */ checkDual(); }
      else if (act === 'crashPub') { const id = nextId++; kafka.push({ id }); /* db rolled back */ checkDual(); }
      else if (act === 'obPlace') {
        const id = nextId++;
        const tx = sim.begin();
        sim.insert(tx, 'orders', { id, status: 'NEW', amount: 60 });
        sim.insert(tx, 'outbox', { id: `ob-${id}`, aggregatetype: 'order', aggregateid: id, type: 'OrderPlaced', payload: `{"orderId":${id}}` });
        sim.commit(tx); // atomic: both rows or neither
        verdict('good', `✅ Order and outbox row committed in <strong>one transaction</strong>. They can\'t disagree. Press "Debezium tails outbox" to publish.`);
      }
      else if (act === 'obCrash') {
        const id = nextId++;
        const tx = sim.begin();
        sim.insert(tx, 'orders', { id, status: 'NEW', amount: 60 });
        sim.insert(tx, 'outbox', { id: `ob-${id}`, aggregatetype: 'order', aggregateid: id, type: 'OrderPlaced', payload: `{"orderId":${id}}` });
        sim.rollback(tx); // crash before commit → neither row exists
        verdict('good', `✅ Crash before commit → the transaction rolled back. <strong>Neither</strong> the order nor the outbox row exists — no half-state, no phantom. A partial failure is impossible.`);
      }
      else if (act === 'obPublish') {
        const got = sim.poll();
        const n = got.filter(e => e.table === 'outbox').length;
        verdict(n ? 'good' : 'idle', n ? `✅ Debezium captured ${n} outbox row(s) and published to <code>outbox.event.order</code>. Every event matches a committed order — guaranteed.` : `Nothing new in the outbox to publish.`);
      }
      else if (act === 'reset') { db = []; kafka = []; nextId = 5001; lastVerdict = null; freshOutbox(); }
    } catch (err) {}
    render();
  });

  $('#ob-mode').addEventListener('change', e => { mode = e.target.value; lastVerdict = null; render(); });

  render();
  return null;
}
