// M27 — Change Events & Data Contracts. The shape of a Debezium change event
// (the envelope: op, before/after, source metadata), deletes + tombstones,
// serialization (JSON/Avro/Protobuf + Schema Registry), SMTs, and schema
// evolution. Includes a live event-envelope inspector and an evolution drill.
import { createModuleShell, createIQSection } from '../components/module-shell.js';
import CDCSim from '../sim/cdc-engine.js';

export const IQ = [
  {
    q: 'Walk through the structure of a Debezium change event.',
    a: 'Every event has two parts: a <strong>schema</strong> (a Kafka Connect schema describing the field types) and a <strong>payload</strong> (the data). The value payload carries: <strong>op</strong> — the operation code: <code>c</code> create/insert, <code>u</code> update, <code>d</code> delete, <code>r</code> read (emitted during a snapshot), <code>t</code> truncate, <code>m</code> logical message; <strong>before</strong> — the row\'s prior state (null for inserts; populated per REPLICA IDENTITY for updates/deletes); <strong>after</strong> — the new state (null for deletes); <strong>source</strong> — metadata: connector, logical server name, database, schema, table, the <strong>lsn</strong>, <strong>txId</strong>, <strong>ts_ms</strong> (the <em>commit</em> time in the database), and a <strong>snapshot</strong> flag; and an envelope-level <strong>ts_ms</strong> — the time the <em>connector processed</em> it. The <strong>message key</strong> is built from the primary-key columns, which is what routes same-row changes to the same partition and preserves per-row order.',
    tip: 'The highest-signal detail: there are TWO timestamps. source.ts_ms is the DB commit time; the envelope ts_ms is the connector processing time; their difference is your end-to-end replication lag. Mention it and you sound like you\'ve monitored a pipeline.',
  },
  {
    q: 'How is a delete represented, and what is a tombstone?',
    a: 'A delete emits one event with <code>op:"d"</code>, the <strong>before</strong> image populated (per REPLICA IDENTITY) and <strong>after</strong> null. Then, by default, Debezium emits a second record: a <strong>tombstone</strong> — the same message key with a <strong>null value</strong>. The tombstone exists for <a href="#m10">log compaction</a>: a compacted topic keeps only the latest value per key, and a null value is the signal to <em>remove the key entirely</em>, so the deleted row doesn\'t linger forever in the compacted log. It\'s controlled by <code>tombstones.on.delete</code> (default true). The practical consequence: <strong>consumers must handle null-valued records</strong> — a sink that assumes every record has a value will crash on a tombstone. A key change (the primary key itself changing) appears as a delete+tombstone of the old key and a create of the new key, because the key is the identity.',
    tip: 'Two separate records for one delete: the op:"d" event (with the before image) AND the tombstone (key + null). Knowing consumers must tolerate null values — and why compaction needs them — is the senior answer.',
  },
  {
    q: 'JSON, Avro, or Protobuf — and what do Schema Registry, converters, and SMTs add?',
    a: '<strong>Converters</strong> decide the on-the-wire format. JSON (optionally with its schema inline) is human-readable but large and has weak typing. <strong>Avro or Protobuf with <a href="#m14">Schema Registry</a></strong> is the production choice: compact binary, strong types, and — crucially — the registry enforces <strong>schema compatibility</strong> so a producer can\'t ship a change that breaks existing consumers. The message then carries just a schema ID, not the whole schema. <strong>SMTs (Single Message Transforms)</strong> reshape events inline in the Connect worker: the most common is <code>ExtractNewRecordState</code> (the "unwrap"/flatten transform) which collapses the full before/after/source envelope down to just the <code>after</code> row, because many sinks (and analysts) want a flat row, not the CDC envelope. Others route topics, mask fields, or add headers. SMTs are stateless and per-message — anything stateful belongs in Kafka Streams or a stream processor.',
    tip: 'Name ExtractNewRecordState by its job ("flatten/unwrap the envelope to the after row") — it\'s the single most common CDC SMT, and interviewers love that you know raw CDC events usually get flattened before a sink.',
  },
  {
    q: 'A producer wants to add a field to a table Debezium is capturing. How do you keep downstream consumers from breaking?',
    a: 'This is a <strong>schema evolution / compatibility</strong> problem, enforced by <a href="#m14">Schema Registry</a>. The safe move is an <strong>additive, optional</strong> change: add the new column with a default / as nullable. That is both <em>backward</em> compatible (new consumers can read old messages — the missing field takes the default) and <em>forward</em> compatible (old consumers can read new messages — they ignore the unknown field), i.e. <strong>FULL</strong> compatible, so you can upgrade producers and consumers in any order. The dangerous changes are: adding a <strong>required field with no default</strong> (breaks backward compatibility — old data has no value for it), <strong>removing a required field</strong> (breaks forward compatibility — old consumers still expect it), and <strong>narrowing or changing a type</strong>. The rule of thumb: <em>add optional, never remove required, never change types in place</em> — and let the registry reject anything that violates the topic\'s compatibility setting before it ever reaches a consumer.',
    tip: 'Tie "additive + optional = FULL compatible = deploy in any order" together. That single sentence answers most schema-evolution questions, and the registry is what enforces it.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M27 · Change Data Capture',
    title: 'Change Events & Data Contracts',
    subtitle: 'The exact shape of a change event — op codes, before/after, source metadata, deletes and tombstones — plus serialization, SMTs, and schema evolution.',
    tabs: [
      { id: 'envelope', label: '✉️ The Envelope' },
      { id: 'inspector', label: '🔬 Event Inspector' },
      { id: 'evolve', label: '🧬 Schema Evolution' },
      { id: 'iq', label: '🎯 Interview Q&A' },
    ],
  });
  buildEnvelope(container);
  buildInspector(container);
  buildEvolve(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return null;
}

function buildEnvelope(container) {
  const tab = container.querySelector('#tab-envelope');
  tab.innerHTML = `
    <div class="prose-block">
      <h3>Every change is an envelope</h3>
      <p>A Debezium event isn\'t just "the new row." It\'s an <strong>envelope</strong> that tells the full story of one change: what happened, what the row looked like before and after, and exactly where in the database it came from. That richness is the whole point — a downstream system can react to the operation, diff old against new, and order events precisely.</p>
      <div class="cdc-kv-grid">
        <div class="cdc-kv"><div class="cdc-kv-k"><code>op</code> — operation</div><div class="cdc-kv-v"><code>c</code> insert · <code>u</code> update · <code>d</code> delete · <code>r</code> read (snapshot) · <code>t</code> truncate · <code>m</code> logical message.</div></div>
        <div class="cdc-kv"><div class="cdc-kv-k"><code>before</code> / <code>after</code></div><div class="cdc-kv-v"><code>after</code> is the new row (null on delete). <code>before</code> is the prior row — null on insert, and on update/delete it follows <strong>REPLICA IDENTITY</strong> (PK-only by default, all columns under FULL).</div></div>
        <div class="cdc-kv"><div class="cdc-kv-k"><code>source</code></div><div class="cdc-kv-v">Where it came from: connector, server name, db, schema, table, <code>lsn</code>, <code>txId</code>, <code>ts_ms</code> (<em>commit</em> time), and the <code>snapshot</code> flag.</div></div>
        <div class="cdc-kv"><div class="cdc-kv-k">Two <code>ts_ms</code> timestamps</div><div class="cdc-kv-v"><code>source.ts_ms</code> = when it committed in the DB; envelope <code>ts_ms</code> = when the connector processed it. The gap is your <strong>replication lag</strong>.</div></div>
        <div class="cdc-kv"><div class="cdc-kv-k">The message key</div><div class="cdc-kv-v">Built from the primary key. It routes same-row changes to the same partition, preserving per-row order — and it\'s what a tombstone targets.</div></div>
        <div class="cdc-kv"><div class="cdc-kv-k">Deletes + tombstones</div><div class="cdc-kv-v">A delete is <code>op:"d"</code> (before set, after null), followed by a <strong>tombstone</strong> (key + null value) so <a href="#m10">compaction</a> can drop the key. Consumers must tolerate null values.</div></div>
      </div>
      <div class="callout callout-note"><div class="callout-head">🔗 Serialization &amp; transforms</div><p>Converters pick the format — JSON, or <strong>Avro/Protobuf + <a href="#m14">Schema Registry</a></strong> for compact, typed, compatibility-checked messages. <strong>SMTs</strong> reshape inline: <code>ExtractNewRecordState</code> flattens the envelope to just the <code>after</code> row for sinks that want a plain record. Open the <strong>Event Inspector</strong> to see real-shaped envelopes for each operation.</p></div>
    </div>`;
}

function buildInspector(container) {
  const tab = container.querySelector('#tab-inspector');
  tab.innerHTML = `
    <div class="cdc-scope-note">⚠️ Deterministic simulation. Envelopes are real-shaped Debezium (Postgres) events; version strings are illustrative. Toggle REPLICA IDENTITY and tombstones and watch the envelope change.</div>
    <div class="cdc-insp">
      <div class="cdc-lab-controls">
        <div class="cdc-ctrl-group">
          <span class="cdc-ctrl-label">Generate an event</span>
          <button class="ctrl-btn" data-act="insert">➕ INSERT</button>
          <button class="ctrl-btn" data-act="update">✏️ UPDATE</button>
          <button class="ctrl-btn" data-act="delete">🗑️ DELETE</button>
        </div>
        <div class="cdc-ctrl-group">
          <span class="cdc-ctrl-label">REPLICA IDENTITY</span>
          <select class="study-select" id="insp-ri"><option value="default">DEFAULT (PK only)</option><option value="full">FULL (all columns)</option></select>
        </div>
        <label class="cdc-check"><input type="checkbox" id="insp-tomb" checked> tombstones.on.delete</label>
        <button class="ctrl-btn cdc-reset" data-act="reset">↺ Reset</button>
      </div>
      <div class="cdc-insp-grid">
        <div class="cdc-box">
          <div class="cdc-box-head">📥 Events <span class="cdc-box-sub">click to inspect</span></div>
          <div class="cdc-box-body cdc-wal-scroll" id="insp-list"></div>
        </div>
        <div class="cdc-box">
          <div class="cdc-box-head">🔬 Envelope <span id="insp-sel"></span></div>
          <div class="cdc-box-body" id="insp-detail"></div>
        </div>
      </div>
    </div>`;

  let sim, nextId, events, selected;
  const $ = s => container.querySelector(s);

  function fresh() {
    sim = new CDCSim({ seed: 21 });
    sim.createTable('orders', { pk: 'id', columns: ['id', 'customer', 'status', 'amount'], replicaIdentity: 'full' });
    nextId = 1001; events = []; selected = -1;
  }

  const CUST = ['alice', 'bob', 'carol', 'dan'];

  function capture() { const got = sim.poll(); got.forEach(e => events.push(e)); selected = events.length - 1; }

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // Build a Debezium-shaped value envelope from an engine event, applying the
  // current REPLICA IDENTITY and tombstone toggles as a display transform.
  function envelope(ev) {
    const ri = $('#insp-ri').value;
    let before = ev.before;
    if (before && ri === 'default') before = { id: before.id };
    const payload = {
      before: (ev.op === 'c' || ev.op === 'r') ? null : before,
      after: ev.op === 'd' ? null : ev.after,
      source: {
        version: '3.6.x', connector: 'postgresql', name: 'shop',
        ts_ms: ev.source.tsMs, snapshot: ev.source.snapshot,
        db: 'shop', schema: 'public', table: 'orders',
        txId: ev.source.txId, lsn: ev.source.lsn,
      },
      op: ev.op,
      ts_ms: ev.tsMs,
    };
    return { schema: '{ …Kafka Connect schema for shop.public.orders.Envelope… }', payload };
  }

  function jsonLines(obj) {
    // pretty JSON, but keep the schema placeholder unquoted-looking
    let s = JSON.stringify(obj, null, 2);
    s = s.replace('"{ …Kafka Connect schema for shop.public.orders.Envelope… }"', '{ … Kafka Connect schema … }');
    return esc(s);
  }

  function render() {
    const opL = { c: 'INSERT', u: 'UPDATE', d: 'DELETE', r: 'READ' };
    $('#insp-list').innerHTML = events.length
      ? events.map((e, i) => `<div class="cdc-wal-rec cdc-insp-row ${i === selected ? 'active' : ''}" data-i="${i}"><span class="cdc-ev-op cdc-ev-${e.op}">${opL[e.op]}</span><span class="cdc-ev-key">id=${e.key}</span><span class="cdc-ev-lsn">LSN ${e.source.lsn}</span></div>`).join('')
      : `<div class="cdc-empty">— generate an event —</div>`;

    if (selected < 0 || !events[selected]) { $('#insp-detail').innerHTML = `<div class="cdc-empty">— select an event —</div>`; $('#insp-sel').innerHTML = ''; return; }
    const ev = events[selected];
    $('#insp-sel').innerHTML = `<span class="cdc-ev-op cdc-ev-${ev.op}">${opL[ev.op]}</span>`;
    const env = envelope(ev);
    const tomb = $('#insp-tomb').checked;
    const keyBlock = `<div class="cdc-insp-sub">Message key</div><pre class="cdc-json">${jsonLines({ schema: '{ …key schema… }', payload: { id: ev.key } })}</pre>`;
    const valBlock = `<div class="cdc-insp-sub">Message value (envelope)</div><pre class="cdc-json">${jsonLines(env)}</pre>`;
    const tombBlock = (ev.op === 'd' && tomb)
      ? `<div class="cdc-insp-sub cdc-insp-tomb">＋ Tombstone record (for compaction)</div><pre class="cdc-json">key: { "id": ${ev.key} }   value: null</pre>`
      : '';
    const ann = {
      c: 'Insert: <code>before</code> is null, <code>after</code> has the full new row, <code>op:"c"</code>.',
      u: 'Update: <code>after</code> is the new row; <code>before</code> depends on REPLICA IDENTITY — try the toggle and watch it shrink to the PK or expand to all columns.',
      d: 'Delete: <code>after</code> is null, <code>before</code> holds the old row (per REPLICA IDENTITY). With tombstones on, a second record (key + null value) follows so compaction can drop the key.',
      r: 'Read: emitted during a snapshot — <code>op:"r"</code>, <code>after</code> is the current row, <code>snapshot</code> is set.',
    };
    $('#insp-detail').innerHTML = `${keyBlock}${valBlock}${tombBlock}
      <div class="cdc-box-foot">${ann[ev.op]} Note <code>source.ts_ms</code> (commit time) and envelope <code>ts_ms</code> (processing time) — their gap is replication lag; <code>source.lsn</code> is the WAL position.</div>`;
  }

  tab.querySelector('.cdc-lab-controls').addEventListener('click', e => {
    const act = e.target.closest('button')?.dataset.act;
    if (!act) return;
    try {
      const ids = sim.currentState('orders').map(r => r.id);
      if (act === 'insert') { const id = nextId++; sim.applyInsert('orders', { id, customer: CUST[id % 4], status: 'NEW', amount: 40 + (id % 5) * 11 }); capture(); }
      else if (act === 'update' && ids.length) { sim.applyUpdate('orders', ids[ids.length - 1], { status: 'PAID' }); capture(); }
      else if (act === 'delete' && ids.length) { sim.applyDelete('orders', ids[ids.length - 1]); capture(); }
      else if (act === 'reset') { fresh(); }
    } catch (err) {}
    render();
  });
  tab.querySelector('#insp-list').addEventListener('click', e => {
    const row = e.target.closest('.cdc-insp-row'); if (!row) return;
    selected = +row.dataset.i; render();
  });
  tab.querySelector('#insp-ri').addEventListener('change', render);
  tab.querySelector('#insp-tomb').addEventListener('change', render);

  fresh();
  render();
}

function buildEvolve(container) {
  const tab = container.querySelector('#tab-evolve');
  const changes = [
    { name: 'Add an OPTIONAL column (discount, nullable / with default)', back: true, fwd: true,
      why: 'New readers read old messages fine — the missing field uses its default. Old readers read new messages fine — they ignore the unknown field. This is <strong>FULL</strong> compatible, so you can deploy producers and consumers in any order. The safe, boring, correct way to evolve a schema.' },
    { name: 'Add a REQUIRED column with no default (currency NOT NULL)', back: false, fwd: true,
      why: 'Breaks <strong>backward</strong> compatibility: a new reader handed an old message has no value for the required field and no default to fall back on. Fix it by giving the column a default (then it becomes additive/optional) or by treating it as a new schema version with a migration.' },
    { name: 'Remove a column still in use (drop amount)', back: true, fwd: false,
      why: 'Breaks <strong>forward</strong> compatibility: old readers still expect <code>amount</code> and will fail on new messages that dropped it. Deprecate first (stop writing it, keep it nullable), let consumers stop reading it, and only then remove.' },
    { name: 'Change a column\'s type in place (amount int → string)', back: false, fwd: false,
      why: 'Breaks <strong>both</strong> directions — neither old nor new readers can safely interpret the other\'s bytes. Never change a type in place. Add a new, differently-named field, backfill, and migrate readers over.' },
  ];
  const badge = (ok, label) => `<span class="cdc-compat ${ok ? 'cdc-compat-ok' : 'cdc-compat-no'}">${ok ? '✓' : '✗'} ${label}</span>`;
  tab.innerHTML = `
    <div class="prose-block">
      <h3>Evolving the schema without breaking consumers</h3>
      <p>A CDC topic is a <strong>contract</strong> with everyone reading it. When the source table changes shape, <a href="#m14">Schema Registry</a> enforces that contract with a compatibility rule. <strong>Backward</strong> = new readers can read old data; <strong>Forward</strong> = old readers can read new data; <strong>FULL</strong> = both. Here\'s how four common changes land:</p>
    </div>
    <div class="cdc-evolve-grid">
      ${changes.map(c => `
        <div class="cdc-evolve ${c.back && c.fwd ? 'cdc-evolve-safe' : (!c.back && !c.fwd ? 'cdc-evolve-danger' : 'cdc-evolve-warn')}">
          <div class="cdc-evolve-name">${c.name}</div>
          <div class="cdc-evolve-badges">${badge(c.back, 'Backward')}${badge(c.fwd, 'Forward')}${badge(c.back && c.fwd, 'FULL')}</div>
          <div class="cdc-evolve-why">${c.why}</div>
        </div>`).join('')}
    </div>
    <div class="callout callout-key"><div class="callout-head">🔑 The one rule</div><p><strong>Add optional, never remove required, never change types in place.</strong> Stick to additive, nullable changes and you stay FULL-compatible and deploy in any order. Everything else needs a deprecation window or a new field + migration — and the registry will stop you before a breaking change reaches a consumer.</p></div>`;
}
