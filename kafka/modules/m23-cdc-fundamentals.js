// M23 — CDC Fundamentals & Database Internals. The "why" before any Debezium
// config: what change data capture is, the four ways to do it, and the single
// idea the rest of the track rests on — the current state of a table is not the
// same thing as its stream of changes. Includes a live, deterministic
// "poll vs log" demo built on the CDC engine (a labelled simulation).
import { createModuleShell, createIQSection } from '../components/module-shell.js';
import CDCSim from '../sim/cdc-engine.js';

export const IQ = [
  {
    q: 'What is Change Data Capture, and why not just query the source table on a schedule?',
    a: 'CDC turns every committed row change in a database (INSERT / UPDATE / DELETE) into a stream of events, in commit order, by reading the database\'s own transaction log. Scheduled querying ("polling") has three structural problems it can never fix: (1) it only ever sees the <em>current</em> value of a row, so any intermediate state that changed and changed again between two polls is lost; (2) it cannot see deletes at all — a row that is gone simply isn\'t in the result set, so the downstream copy keeps a ghost; (3) every poll is a scan that competes with production traffic, and you trade latency for load (poll often = more load, poll rarely = more staleness). Log-based CDC sidesteps all three: the log already contains every change in order, including deletes, and reading it costs the source almost nothing.',
    tip: 'The cleanest one-liner: "Polling asks the table what it looks like now; CDC reads the log of everything that happened." Interviewers want to hear that deletes and intermediate states are the things polling structurally cannot capture.',
  },
  {
    q: 'Explain the difference between a table\'s current state and its change stream. When do you actually need the stream?',
    a: 'The current state is a snapshot: one row per key, as it looks right now. The change stream is the ordered history: every version a row passed through, plus its deletion. They answer different questions. If an order goes NEW → PAID → SHIPPED → (deleted), a <code>SELECT</code> returns nothing, while the change stream has four facts. You need the stream whenever "what changed and in what order" matters: replicating a database into a warehouse or search index, driving event-driven microservices off data changes, building an audit trail, invalidating caches precisely, or feeding streaming analytics. You can always rebuild the current state <em>from</em> the stream (fold the events by key — that is exactly how a CDC "Silver" table is materialised), but you can never rebuild the stream from a snapshot.',
    tip: 'Name the asymmetry explicitly: "you can derive the snapshot from the stream, but not the stream from the snapshot." That is why the log is the richer source of truth.',
  },
  {
    q: 'Why is log-based CDC generally preferred over trigger-based or query-based CDC?',
    a: 'Trade-offs across three dimensions — correctness, overhead, and coupling. <strong>Query-based</strong> (poll a <code>updated_at</code> column): simple, works on any database, but misses deletes and intermediate states, and adds query load. <strong>Trigger-based</strong> (DB triggers write to an audit table): captures deletes and runs inside the transaction so it is consistent, but every business write now also pays for a trigger write (latency + contention), the triggers are schema-coupled and a maintenance burden, and they live in the database. <strong>Log-based</strong> (read the WAL / binlog / redo log): captures every change including deletes, in exact commit order, with before/after images, at very low source overhead and <em>zero application or schema changes</em> — the capture is completely decoupled from the app. Its costs are operational: you need log access/permissions, a replication slot that can retain log if the consumer stalls, and a tool like Debezium. For most production sync/streaming use cases those costs are well worth it, which is why log-based is the default.',
    tip: 'Don\'t just say "log-based is best." Give the one real cost — a replication slot can pin the log and fill the source disk if the consumer falls behind — to show you\'ve run it, not just read about it.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M23 · Change Data Capture',
    title: 'CDC Fundamentals',
    subtitle: 'What change data capture is, the four ways to do it, and the one idea the whole track rests on — a table\'s current state is not its stream of changes.',
    tabs: [
      { id: 'why', label: '💡 Why CDC' },
      { id: 'methods', label: '🧭 The Four Methods' },
      { id: 'iq', label: '🎯 Interview Q&A' },
    ],
  });

  buildWhy(container);
  buildMethods(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return null;
}

function buildWhy(container) {
  const tab = container.querySelector('#tab-why');
  tab.innerHTML = `
    <div class="prose-block">
      <h3>The problem CDC exists to solve</h3>
      <p>A database is the source of truth for something important — orders, accounts, inventory. But it is never alone. A search index needs to reflect new orders. A cache needs to drop stale rows. A data warehouse needs every change for analytics. A fraud service needs to react the instant an amount changes. The question is deceptively simple: <strong>how do all those systems find out when the database changes?</strong></p>
      <p>The tempting answer is to <em>ask</em>: run a query every few minutes — "give me everything with an <code>updated_at</code> newer than last time." It works for about a week. Then you notice the data warehouse still shows orders that were cancelled (a <strong>delete</strong> leaves no row to find), a status that flipped <code>PAID → REFUNDED → PAID</code> between two polls shows up as if it never changed, and the "every few minutes" scan is now one of the heaviest queries on your production database.</p>
      <h3>The better answer: read the log the database already keeps</h3>
      <p>Every serious database already writes an ordered, durable record of every committed change — PostgreSQL's <strong>WAL</strong> (write-ahead log), MySQL's binlog, Oracle's redo log. It has to: that log is how the database survives a crash and how it feeds replicas. <strong>Change Data Capture taps that same log.</strong> Every committed <code>INSERT</code>, <code>UPDATE</code> and <code>DELETE</code> is already there, in commit order, with the row's before and after state — and reading it barely touches the database, because the log was written anyway.</p>
      <div class="callout callout-key">
        <div class="callout-head">🔑 The one idea to carry through this whole track</div>
        <p>The <strong>current state</strong> of a table (what a <code>SELECT</code> returns now) is not the same thing as its <strong>stream of changes</strong> (everything that ever happened to it). You can always rebuild the snapshot from the stream — but never the stream from the snapshot. CDC gives you the stream. That is why it can do things a query never can: capture deletes, preserve order, and replay history.</p>
      </div>
    </div>

    <div class="cdc-demo" id="cdc-poll-demo">
      <div class="cdc-demo-head">
        <h3>See it: poll the table vs read the log</h3>
        <p class="cdc-demo-sub">Drive one order through its life. The left panel is what a scheduled <em>query</em> of the table would see right now. The right panel is what <em>CDC</em> captured from the log. Watch what happens to each when the order is deleted. <span class="cdc-sim-tag">deterministic simulation — no real database</span></p>
      </div>
      <div class="cdc-demo-controls">
        <button class="ctrl-btn" data-act="insert">➕ Place order</button>
        <button class="ctrl-btn" data-act="advance">🔄 Advance status</button>
        <button class="ctrl-btn" data-act="delete">🗑️ Cancel (delete)</button>
        <button class="ctrl-btn" data-act="reset">↺ Reset</button>
      </div>
      <div class="cdc-demo-panes">
        <div class="cdc-pane cdc-pane-poll">
          <div class="cdc-pane-head">📸 What polling the table sees <span class="cdc-pane-n" id="cdc-poll-n"></span></div>
          <div class="cdc-pane-body" id="cdc-poll-body"></div>
          <div class="cdc-pane-foot">A query returns one row per key — the latest value. Deleted rows are simply absent.</div>
        </div>
        <div class="cdc-pane cdc-pane-log">
          <div class="cdc-pane-head">🪵 What CDC captures (the change log) <span class="cdc-pane-n" id="cdc-log-n"></span></div>
          <div class="cdc-pane-body" id="cdc-log-body"></div>
          <div class="cdc-pane-foot">The log keeps every transition in order — including the delete, as an explicit event.</div>
        </div>
      </div>
    </div>`;

  const sim = new CDCSim({ seed: 11 });
  sim.createTable('orders', { pk: 'id', columns: ['id', 'status', 'amount'] });
  const FLOW = ['NEW', 'PAID', 'PACKED', 'SHIPPED', 'DELIVERED'];
  let nextId = 1001;
  let liveId = null; // the order we're currently driving

  const opLabel = { c: 'INSERT', u: 'UPDATE', d: 'DELETE', r: 'READ' };

  function render() {
    // Poll panel = current committed state.
    const rows = sim.currentState('orders');
    const pollBody = container.querySelector('#cdc-poll-body');
    pollBody.innerHTML = rows.length
      ? `<table class="cdc-tbl"><thead><tr><th>id</th><th>status</th><th>amount</th></tr></thead><tbody>${
          rows.map(r => `<tr><td>${r.id}</td><td>${r.status}</td><td>$${r.amount}</td></tr>`).join('')
        }</tbody></table>`
      : `<div class="cdc-empty">— no rows — a query returns nothing</div>`;
    container.querySelector('#cdc-poll-n').textContent = `${rows.length} row${rows.length === 1 ? '' : 's'} now`;

    // Log panel = the captured change events.
    sim.poll(); // deliver any pending changes to the log
    const evs = sim.bronze.filter(e => e.table === 'orders');
    const logBody = container.querySelector('#cdc-log-body');
    logBody.innerHTML = evs.length
      ? evs.map(e => {
          const change = e.op === 'c' ? `→ ${e.after.status}`
            : e.op === 'u' ? `${e.before.status} → ${e.after.status}`
            : e.op === 'd' ? `${e.before.status} → ∅ (gone)` : `${e.after.status}`;
          return `<div class="cdc-ev cdc-ev-${e.op}"><span class="cdc-ev-op">${opLabel[e.op]}</span><span class="cdc-ev-key">id=${e.key}</span><span class="cdc-ev-change">${change}</span><span class="cdc-ev-lsn">LSN ${e.source.lsn}</span></div>`;
        }).join('')
      : `<div class="cdc-empty">— no events yet — place an order</div>`;
    container.querySelector('#cdc-log-n').textContent = `${evs.length} event${evs.length === 1 ? '' : 's'} captured`;
  }

  tab.querySelector('.cdc-demo-controls').addEventListener('click', e => {
    const act = e.target.closest('button')?.dataset.act;
    if (!act) return;
    try {
      if (act === 'insert') {
        liveId = nextId++;
        sim.applyInsert('orders', { id: liveId, status: FLOW[0], amount: 40 + (liveId % 7) * 5 });
      } else if (act === 'advance' && liveId != null) {
        const cur = sim.currentState('orders').find(r => r.id === liveId);
        if (cur) {
          const i = FLOW.indexOf(cur.status);
          if (i >= 0 && i < FLOW.length - 1) sim.applyUpdate('orders', liveId, { status: FLOW[i + 1] });
        }
      } else if (act === 'delete' && liveId != null) {
        const cur = sim.currentState('orders').find(r => r.id === liveId);
        if (cur) { sim.applyDelete('orders', liveId); liveId = null; }
      } else if (act === 'reset') {
        sim.reset(); sim.createTable('orders', { pk: 'id', columns: ['id', 'status', 'amount'] });
        nextId = 1001; liveId = null;
      }
    } catch (err) { /* guard against out-of-order clicks */ }
    render();
  });

  render();
}

function buildMethods(container) {
  const tab = container.querySelector('#tab-methods');
  const methods = [
    {
      name: 'Full extract / snapshot', icon: '📦', verdict: 'baseline',
      how: 'Copy the whole table every run.',
      pros: 'Dead simple; always correct as a point-in-time copy; needs nothing from the database.',
      cons: 'Heavy and slow; no idea what changed; can\'t run often, so data is stale between runs.',
      when: 'Small reference tables, or the very first load before switching to incremental CDC.',
    },
    {
      name: 'Query-based (polling)', icon: '🔁', verdict: 'limited',
      how: 'Periodically SELECT rows where updated_at &gt; last_seen.',
      pros: 'Works on any database with no special access; easy to reason about.',
      cons: 'Cannot see deletes (the row is just gone); misses states that changed twice between polls; every poll is a scan competing with production; latency ↔ load trade-off you can never win.',
      when: 'Append-mostly tables where deletes don\'t matter and minutes of latency is fine.',
    },
    {
      name: 'Trigger-based', icon: '🪝', verdict: 'viable',
      how: 'Database triggers write every change into an audit/outbox table.',
      pros: 'Captures deletes; runs inside the same transaction, so it\'s consistent; database-portable.',
      cons: 'Every business write now also pays for a trigger write (latency + contention); triggers are schema-coupled and a maintenance burden; logic lives in the DB.',
      when: 'When you can\'t get log access, or you deliberately want curated events (the outbox pattern, M29).',
    },
    {
      name: 'Log-based', icon: '🪵', verdict: 'best',
      how: 'Read the database\'s transaction log (WAL / binlog / redo) and decode each committed change.',
      pros: 'Captures every change including deletes, in exact commit order, with before/after images; near-zero source overhead; zero application or schema changes — fully decoupled.',
      cons: 'Needs log access and privileges; a replication slot can retain log and fill the source disk if the consumer stalls; needs a tool (Debezium).',
      when: 'The default for real-time replication, event-driven microservices, and streaming to a lakehouse.',
    },
  ];
  tab.innerHTML = `
    <div class="prose-block">
      <h3>Four ways to capture change — and why one wins</h3>
      <p>Every approach is really a trade-off across three axes: <strong>correctness</strong> (does it catch deletes and intermediate states?), <strong>overhead</strong> (what does it cost the source database?), and <strong>coupling</strong> (how much does the application have to change?). Read the four with those three questions in mind.</p>
    </div>
    <div class="cdc-method-grid">
      ${methods.map(m => `
        <div class="cdc-method cdc-method-${m.verdict}">
          <div class="cdc-method-head"><span class="cdc-method-icon">${m.icon}</span><span class="cdc-method-name">${m.name}</span><span class="cdc-verdict cdc-verdict-${m.verdict}">${m.verdict}</span></div>
          <div class="cdc-method-how">${m.how}</div>
          <div class="cdc-method-row"><span class="cdc-tag-pro">Strengths</span>${m.pros}</div>
          <div class="cdc-method-row"><span class="cdc-tag-con">Costs</span>${m.cons}</div>
          <div class="cdc-method-row"><span class="cdc-tag-when">Use it when</span>${m.when}</div>
        </div>`).join('')}
    </div>
    <div class="callout callout-note">
      <div class="callout-head">🔗 Where this track goes next</div>
      <p>Log-based CDC is the path we follow. <strong>M24</strong> opens up PostgreSQL's WAL and logical decoding — the log we're going to read. <strong>M25–M28</strong> are Debezium, the tool that reads it. <strong>M29–M30</strong> turn those changes into clean domain events and land them in a lakehouse. This also connects back to <a href="#m10">M10 (retention &amp; compaction)</a> and <a href="#m12">M12 (Kafka Connect)</a>, which you've already seen.</p>
    </div>`;
}
