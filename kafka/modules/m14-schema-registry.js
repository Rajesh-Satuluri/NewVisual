import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { EventPacket, drawRoundRect } from '../components/canvas-primitives.js';

export const IQ = [
  { q: 'What is the Confluent wire format and why does it matter?', a: 'Every Avro/Protobuf/JSON Schema record serialized with the Confluent serializer begins with: 0x00 (magic byte, 1 byte) + schema ID (4 bytes, big-endian int32) + serialized payload. Consumers use the schema ID to fetch the schema from the Registry and deserialize the payload. This is efficient (no schema transmitted per record) and enables schema evolution (producer can upgrade schema, consumer fetches new version on demand). The magic byte differentiates Schema Registry payloads from raw bytes.', tip: 'The 5-byte prefix is a common interview question. Know it, explain why it enables schema-on-read without per-record overhead.' },
  { q: 'What is the difference between BACKWARD, FORWARD, and FULL schema compatibility?', a: 'BACKWARD: new schema can read data written with old schema. Old fields removed, new optional fields added. Consumer can upgrade first. FORWARD: old schema can read data written with new schema. New fields added with defaults, nothing removed. Producer can upgrade first. FULL: both BACKWARD and FORWARD. Most restrictive. Neither producer nor consumer needs to upgrade first. NONE: no compatibility checking. Default is BACKWARD. Amazon production: FULL_TRANSITIVE for payment schemas (any version readable by any other version).', tip: 'Mnemonic: BACKWARD = new reads old (consumer leads). FORWARD = old reads new (producer leads). FULL = both can interoperate freely.' },
  { q: 'How does Schema Registry enable safe schema evolution in a live system?', a: 'Without Registry: producer and consumer must coordinate schema changes as a deployment — both must deploy simultaneously or in a specific order, causing coordination overhead and risk. With Registry: producer registers the new schema version before deploy. Registry enforces compatibility check (e.g., BACKWARD). Producer writes records with new schema ID. Consumers running old code still read new records because Avro field defaults fill missing fields. New consumer code reads both old and new records. Zero-downtime schema migration is possible.', tip: 'This is the core operational value: Schema Registry decouples producer and consumer deployments. Teams can evolve schemas independently.' },
  { q: 'Where and how does Schema Registry actually store schemas? What is the _schemas topic?', a: 'The Registry is a stateless REST service; its source of truth is a special Kafka topic called _schemas — a single-partition, log-compacted topic in the same (or a dedicated) Kafka cluster. Every schema registration, config change, and delete is an event appended to _schemas. On startup each Registry node replays _schemas into an in-memory cache (a Kafka consumer reading the topic from the beginning), so all nodes converge on the same state. One node is elected leader (via the topic / coordinator); only the leader does writes (assigns the next global schema ID and appends), followers forward writes to it and serve reads from their local cache. Because it is log-compacted, the latest value per key is retained forever and the topic never grows unbounded.', tip: 'Say "stateless service, Kafka-backed state." The _schemas topic being single-partition + compacted + leader-only-writes is what gives globally unique, monotonic schema IDs and a replayable, durable store with no extra database.' },
  { q: 'What are subject-name strategies and when would you use RecordNameStrategy?', a: 'A "subject" is the namespace under which schema versions evolve, and the strategy decides the subject name from a record. TopicNameStrategy (default): subject = <topic>-key / <topic>-value — one schema lineage per topic; simplest, enforces "one record type per topic." RecordNameStrategy: subject = the record\'s fully-qualified name (e.g. com.amazon.OrderPlaced) — lets a single topic carry MULTIPLE event types, each evolving independently, and the same type shares a schema across topics. TopicRecordNameStrategy: subject = <topic>-<record.fullname> — multiple types per topic but scoped per topic. Use RecordName/TopicRecordName for event-sourcing or "all events for an aggregate on one topic" patterns where you need heterogeneous records but still want per-type compatibility enforcement.', tip: 'The default TopicNameStrategy quietly assumes one schema per topic. The moment you want several event types on one topic (common in event sourcing), you must switch strategy or compatibility checks compare unrelated schemas and reject everything.' },
  { q: 'Can a producer serialize if the Schema Registry is down?', a: 'It depends on the cache. The serializer caches schema→ID mappings after first use (auto.register or lookup). If the producer has ALREADY registered/looked up the schema for this subject in its lifetime, that mapping is cached and it keeps serializing with the cached ID without calling the Registry — so a steady-state producer survives a brief Registry outage. But a cold producer, or one encountering a NEW schema that is not cached, cannot obtain an ID and serialization throws — the send fails. Consumers are similar: a cached schema ID keeps deserializing; a never-seen ID forces a GET /schemas/ids/{id} that fails if the Registry is unreachable. Mitigations: run the Registry HA (multiple nodes), pre-register schemas at deploy time (disable auto-register in prod), and keep caches warm.', tip: 'This is why production disables client-side auto.register.schemas and registers via CI/CD: you never want a schema first-seen on the hot path, and you want the Registry off the critical path except on cache misses.' },
  { q: 'What is the difference between a soft delete and a hard delete, and why is deleting schemas dangerous?', a: 'DELETE /subjects/{subject}/versions/{v} is a SOFT delete: the version is marked deleted and hidden from normal listing, but the schema and its ID remain resolvable so consumers reading old records (which reference that ID in their 5-byte header) can still fetch the writer schema. Adding ?permanent=true is a HARD delete: it is removed entirely and the ID can no longer be resolved — any consumer that later reads an old record written with that schema will fail to deserialize. That is why hard delete is reserved for schemas that were never used in production data, and compatibility history / TRANSITIVE checks also walk only live versions. In practice you almost never hard-delete a schema that real records point at.', tip: 'Records are immutable and self-describe by ID forever; the Registry must be able to resolve that ID for as long as the data is retained. Hard-deleting a referenced schema is effectively corrupting your topic.' },
  { q: 'When you first stand up a system, how does a schema get into the Registry before any records flow — and what is auto.register.schemas?', a: 'A schema begins as a file in the service repo (e.g. order-placed.avsc / .proto / .json), reviewed and versioned like code. It only becomes a subject/version/ID when it is DEPLOYED. Three ways: (1) auto.register.schemas=true — the producer serializer registers it on first send; the client default, fine for dev but discouraged in prod because a schema is first-seen on the hot path and any producer can mint a version. (2) CI/CD deploy — a pipeline step (Gradle/Maven Schema Registry plugin or an explicit POST) registers the schema BEFORE the app ships, and the app runs with auto.register.schemas=false so it only looks up IDs that already exist. (3) Manual REST POST for bootstrap/hotfix. Registration is also where the compatibility gate runs: the first version has nothing to compare against (becomes v1) and later versions are checked and can be rejected with 409.', tip: 'Production answer: disable auto-register in the app and register from CI. You never want a schema first-registered on the critical path, and you want new versions gated by the pipeline, not minted by whoever produces first.' },
  { q: 'When a producer sends a record, how exactly is that record aligned to its schema?', a: 'By schema ID, not by field names. On producer.send(), the serializer: (1) extracts the schema from the typed object, (2) resolves schema→ID from its local cache, calling the Registry only on a miss, (3) serializes the fields to compact Avro/Protobuf binary (field names are NOT repeated per record), and (4) prepends the 5-byte header 0x00 + the 4-byte big-endian ID. That ID is the alignment: the record carries a pointer to its schema, not the schema itself. The broker stores the bytes verbatim and has no idea a schema exists. A consumer reads the ID, does one cached GET /schemas/ids/{id} to fetch the exact WRITER schema, and decodes correctly even if its own code is on a different version — which is why a record can outlive the code that wrote it.', tip: 'Say "records align to schema by a 4-byte ID stamped at serialize time." The first record costs one lookup to warm the cache; the millionth is stamped straight from memory with no Registry call.' },
  { q: 'What does FULL_TRANSITIVE add over FULL, and why do payment schemas use it?', a: 'Non-transitive modes (BACKWARD/FORWARD/FULL) only check the new schema against the IMMEDIATELY previous version. TRANSITIVE variants check the new schema against ALL previous versions still live. FULL means v3 is compatible with v2 in both directions; FULL_TRANSITIVE means v3 is compatible with v2 AND v1 AND v0 in both directions. This matters when old data lingers: a consumer might encounter a record written years ago at v1 while producers are on v4. Non-transitive can let a chain of individually-adjacent-compatible changes accumulate into v4 being unreadable against v1. Payment / financial schemas use FULL_TRANSITIVE because records are retained long-term and every historical version must remain mutually readable — any version by any version, in any order.', tip: 'Transitive = "compatible with the whole history," non-transitive = "compatible with the last one." Long-retention, audited data (payments, ledgers) needs transitive; short-lived operational streams usually don\'t.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M14 · Ecosystem',
    title: 'Schema Registry',
    subtitle: 'The service, the wire format, the full lifecycle, evolution, subjects & formats, the REST API & ops — end to end, with Amazon examples',
    tabs: [
      { id: 'whatwhy',   label: '🏛️ What & Why' },
      { id: 'dayzero',   label: '🚀 Day 0: Define → Deploy → Align' },
      { id: 'wire',      label: '📡 Wire Format' },
      { id: 'lifecycle', label: '🎬 End-to-End Lifecycle' },
      { id: 'compat',    label: '🔄 Compatibility Modes' },
      { id: 'evolution', label: '🧬 Schema Evolution' },
      { id: 'subjects',  label: '🗂️ Subjects & Formats' },
      { id: 'ops',       label: '🔌 REST API & Ops' },
      { id: 'amazon',    label: '🛒 Amazon End-to-End' },
      { id: 'iq',        label: '🎯 Interview Q&A' },
    ]
  });

  buildWhatWhy(container);
  buildDayZero(container);
  buildWire(container);
  const cleanup = buildLifecycle(container);
  buildCompat(container);
  buildEvolution(container);
  buildSubjects(container);
  buildOps(container);
  buildAmazon(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return cleanup;
}

/* ─────────────────────────────────────────────────────────────────────────
   TAB 1 — What & Why / Architecture
   ───────────────────────────────────────────────────────────────────────── */
function buildWhatWhy(container) {
  const tab = container.querySelector('#tab-whatwhy');
  const chip = 'font-size:11px;color:#CBD5E1;background:#0A0E1A;padding:2px 6px;border-radius:5px;font-family:monospace';
  tab.innerHTML = `
    <div class="scroll-content" style="max-width:920px;margin:0 auto">

      <div style="background:#111827;border:1px solid #8B5CF6;border-radius:14px;padding:20px 24px;margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94A3B8;margin-bottom:8px">The problem it solves</div>
        <div style="font-size:18px;font-weight:800;color:#F1F5F9;margin-bottom:6px">Kafka moves <i>bytes</i>. Nothing stops a producer from writing garbage a consumer can't read.</div>
        <div style="font-size:13px;color:#94A3B8;line-height:1.6">A broker never looks inside a message — to it every record is an opaque blob. So the <b>contract</b> between producer and consumer lives nowhere by default. The Schema Registry is that missing contract store: a central service that holds every schema, assigns each a global ID, and <b>refuses</b> a schema change that would break the services already running.</div>
      </div>

      <!-- architecture SVG -->
      <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94A3B8;margin-bottom:14px">The architecture — a stateless REST service backed by a Kafka topic</div>
      <div style="background:#0A0E1A;border:1px solid #1E293B;border-radius:12px;padding:18px;margin-bottom:10px">
        <svg viewBox="0 0 860 330" style="width:100%;height:auto" role="img" aria-label="Schema Registry nodes backed by the compacted _schemas topic; producers and consumers call the REST API.">
          <!-- producer / consumer -->
          <rect x="20" y="40" width="130" height="52" rx="10" fill="#111827" stroke="#FF6900"/>
          <text x="85" y="62" fill="#FF6900" font-size="12" font-weight="700" text-anchor="middle" font-family="system-ui">Producer</text>
          <text x="85" y="79" fill="#8A98AE" font-size="8.5" text-anchor="middle" font-family="system-ui">serializer + ID cache</text>
          <rect x="20" y="238" width="130" height="52" rx="10" fill="#111827" stroke="#3B82F6"/>
          <text x="85" y="260" fill="#3B82F6" font-size="12" font-weight="700" text-anchor="middle" font-family="system-ui">Consumer</text>
          <text x="85" y="277" fill="#8A98AE" font-size="8.5" text-anchor="middle" font-family="system-ui">deserializer + schema cache</text>

          <!-- registry nodes -->
          <rect x="330" y="30" width="200" height="56" rx="10" fill="#111827" stroke="#8B5CF6" stroke-width="2"/>
          <text x="430" y="52" fill="#8B5CF6" font-size="12" font-weight="800" text-anchor="middle" font-family="system-ui">Registry — LEADER</text>
          <text x="430" y="70" fill="#8A98AE" font-size="8.5" text-anchor="middle" font-family="system-ui">assigns IDs · only node that writes</text>
          <rect x="330" y="100" width="200" height="50" rx="10" fill="#111827" stroke="#8B5CF688"/>
          <text x="430" y="121" fill="#8B5CF6" font-size="11" font-weight="700" text-anchor="middle" font-family="system-ui">Registry — follower</text>
          <text x="430" y="138" fill="#8A98AE" font-size="8.5" text-anchor="middle" font-family="system-ui">forwards writes · serves reads from cache</text>

          <!-- _schemas topic -->
          <rect x="650" y="40" width="190" height="250" rx="10" fill="#0D1117" stroke="#10B981"/>
          <text x="745" y="62" fill="#10B981" font-size="12" font-weight="800" text-anchor="middle" font-family="monospace">_schemas</text>
          <text x="745" y="79" fill="#8A98AE" font-size="8.5" text-anchor="middle" font-family="system-ui">single partition · log-compacted</text>
          ${[
            'id=1 OrderPlaced v1',
            'config BACKWARD',
            'id=2 OrderPlaced v2',
            'id=3 Shipment v1',
            'id=4 OrderPlaced v3',
          ].map((t,i) => `
            <rect x="666" y="${98 + i*34}" width="158" height="26" rx="5" fill="#111827" stroke="#1E293B"/>
            <text x="676" y="${115 + i*34}" fill="#CBD5E1" font-size="9" font-family="monospace">${t}</text>
          `).join('')}
          <text x="745" y="283" fill="#8A98AE" font-size="8" text-anchor="middle" font-family="system-ui">append-only log = source of truth</text>

          <!-- arrows -->
          <line x1="150" y1="60" x2="330" y2="58" stroke="#FF6900" stroke-width="1.5"/>
          <text x="240" y="48" fill="#FF6900" font-size="9" text-anchor="middle" font-family="monospace">POST schema → ID</text>
          <line x1="150" y1="262" x2="330" y2="128" stroke="#3B82F6" stroke-width="1.5"/>
          <text x="238" y="205" fill="#3B82F6" font-size="9" text-anchor="middle" font-family="monospace">GET id → schema</text>
          <line x1="530" y1="58" x2="650" y2="90" stroke="#10B981" stroke-width="1.5"/>
          <text x="590" y="64" fill="#10B981" font-size="8.5" text-anchor="middle" font-family="system-ui">append</text>
          <line x1="650" y1="150" x2="530" y2="125" stroke="#10B98188" stroke-width="1.5" stroke-dasharray="4 3"/>
          <text x="590" y="150" fill="#10B981aa" font-size="8.5" text-anchor="middle" font-family="system-ui">replay on boot</text>
        </svg>
      </div>
      <div style="font-size:11px;color:#64748B;text-align:center;margin-bottom:28px">The Registry holds <b>no database of its own</b>. Its entire state is the <span style="${chip}">_schemas</span> Kafka topic; every node rebuilds its cache by replaying that log, and the leader is the only writer.</div>

      <!-- three nouns -->
      <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94A3B8;margin-bottom:14px">The three nouns you must not confuse</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:28px">
        ${[
          { t:'Subject', c:'#FF6900', d:'The <b>evolution namespace</b>. Versions evolve <i>within</i> a subject and compatibility is enforced per subject. Usually <code>&lt;topic&gt;-value</code>. "The lineage."' },
          { t:'Version', c:'#F59E0B', d:'A <b>numbered schema inside a subject</b> (v1, v2, v3…). Monotonic per subject. "Which revision of this contract."' },
          { t:'Schema ID', c:'#10B981', d:'A <b>globally unique int</b> across the whole Registry, assigned once per distinct schema. This is the 4 bytes embedded in every record. "The global pointer."' },
        ].map(x => `
          <div style="background:#111827;border:1px solid #1E293B;border-top:3px solid ${x.c};border-radius:10px;padding:14px 16px">
            <div style="font-size:13px;font-weight:800;color:${x.c};margin-bottom:6px">${x.t}</div>
            <div style="font-size:11.5px;color:#94A3B8;line-height:1.6">${x.d}</div>
          </div>`).join('')}
      </div>
      <div style="font-size:11px;color:#64748B;text-align:center;margin-bottom:28px">One schema ID can appear as different version numbers in different subjects. The record header carries the <b>global ID</b>, not the version — so a consumer resolves the exact bytes regardless of subject.</div>

      <!-- three caches -->
      <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94A3B8;margin-bottom:14px">Why the Registry is almost never on the hot path: three caches</div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:24px">
        ${[
          { k:'Producer-side ID cache', c:'#FF6900', d:`After the first register/lookup for a subject+schema, the serializer remembers schema → ID and stops calling the Registry. Millions of records reuse one cached ID.` },
          { k:'Consumer-side schema cache', c:'#3B82F6', d:`After the first <span style="${chip}">GET /schemas/ids/{id}</span>, the deserializer caches ID → schema. Every later record with that ID decodes with zero network.` },
          { k:'Registry node cache', c:'#8B5CF6', d:`Each node keeps the whole compacted <span style="${chip}">_schemas</span> log in memory, so even a cache-miss lookup is an in-memory hit, not a disk or DB query.` },
        ].map(x => `
          <div style="background:#111827;border:1px solid #1E293B;border-left:3px solid ${x.c};border-radius:10px;padding:12px 18px;display:flex;gap:14px">
            <div style="flex-shrink:0;min-width:210px;font-size:12px;font-weight:700;color:${x.c}">${x.k}</div>
            <div style="font-size:12px;color:#94A3B8;line-height:1.6">${x.d}</div>
          </div>`).join('')}
      </div>

      <div style="background:#8B5CF612;border:1.5px solid #8B5CF644;border-radius:12px;padding:18px 22px">
        <div style="font-size:13px;font-weight:700;color:#8B5CF6;margin-bottom:10px">The one-sentence mental model</div>
        <div style="font-size:12.5px;color:#CBD5E1;line-height:1.75">The Schema Registry is a <b>stateless REST service over a compacted Kafka topic</b> that hands out globally-unique schema IDs and <b>enforces a compatibility rule at registration time</b> — so producers and consumers can deploy independently, records stay tiny (ID, not schema), and nobody can ship a change that breaks a running reader. Everything in the next tabs is a consequence of these two jobs: <i>assign IDs</i> and <i>enforce compatibility</i>.</div>
      </div>

    </div>`;
}

/* ─────────────────────────────────────────────────────────────────────────
   TAB 2 — Day 0: Define → Deploy → Align  (cold start + serializer mechanics)
   ───────────────────────────────────────────────────────────────────────── */
function buildDayZero(container) {
  const tab = container.querySelector('#tab-dayzero');
  const chip = 'font-size:11px;color:#CBD5E1;background:#0A0E1A;padding:2px 6px;border-radius:5px;font-family:monospace';
  const codeBox = (title, lines) => `
    <div style="background:#0D1117;border:1px solid #1E293B;border-radius:8px;padding:12px 14px">
      <div style="font-size:10px;color:#8B949E;margin-bottom:8px;font-family:monospace">${title}</div>
      ${lines.map(l => `<div style="font-size:11px;font-family:monospace;color:${l.c || '#79c0ff'};line-height:1.7">${l.t}</div>`).join('')}
    </div>`;
  const stageHead = (n, color, title, sub) => `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
      <div style="flex-shrink:0;width:34px;height:34px;border-radius:50%;background:${color}22;border:2px solid ${color};color:${color};font-size:15px;font-weight:800;display:flex;align-items:center;justify-content:center">${n}</div>
      <div>
        <div style="font-size:16px;font-weight:800;color:#F1F5F9">${title}</div>
        <div style="font-size:12px;color:#94A3B8">${sub}</div>
      </div>
    </div>`;

  tab.innerHTML = `
    <div class="scroll-content" style="max-width:940px;margin:0 auto">

      <div style="background:#111827;border:1px solid #06B6D4;border-radius:14px;padding:20px 24px;margin-bottom:12px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94A3B8;margin-bottom:8px">The cold-start question</div>
        <div style="font-size:18px;font-weight:800;color:#F1F5F9;margin-bottom:6px">You just stood up Kafka. There are zero schemas. How does the <i>first</i> schema come to exist, get deployed, and then bind to every record?</div>
        <div style="font-size:13px;color:#94A3B8;line-height:1.6">The Lifecycle tab animates the running loop; the Evolution tab changes a schema that already exists. This tab is the part before both: <b>define</b> the schema as a file, <b>deploy</b> it into the Registry, and <b>align</b> each record to it at send time. Follow the three stages top to bottom.</div>
      </div>
      <div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:30px;font-size:12px;font-weight:700;flex-wrap:wrap">
        <span style="color:#8B5CF6">① Define (a file in your repo)</span>
        <span style="color:#475569">→</span>
        <span style="color:#F59E0B">② Deploy (into the Registry)</span>
        <span style="color:#475569">→</span>
        <span style="color:#10B981">③ Align (every record, by ID)</span>
      </div>

      <!-- ─── STAGE 1 — DEFINE ─── -->
      <div style="background:#0A0E1A;border:1px solid #1E293B;border-left:3px solid #8B5CF6;border-radius:10px;padding:18px 20px;margin-bottom:22px">
        ${stageHead('1', '#8B5CF6', 'Define — the schema is just a file you own', 'Kafka and the Registry do not exist in this step yet. A developer writes the contract and commits it.')}
        <div style="font-size:12.5px;color:#94A3B8;line-height:1.7;margin-bottom:14px">
          Before any broker is involved, the schema lives as a plain file in your service's repository — e.g. <span style="${chip}">src/main/avro/order-placed.avsc</span>. It is authored by hand, code-reviewed in a pull request, and versioned in git <b>exactly like source code</b>, because it <i>is</i> the contract your service promises. Nothing has touched Kafka.
        </div>
        ${codeBox('order-placed.avsc  — committed to git, reviewed in a PR', [
          {t:'{', c:'#ff7b72'},
          {t:'&nbsp;&nbsp;"type": "record",'},
          {t:'&nbsp;&nbsp;"namespace": "com.amazon.orders",', c:'#a5d6ff'},
          {t:'&nbsp;&nbsp;"name": "OrderPlaced",', c:'#a5d6ff'},
          {t:'&nbsp;&nbsp;"fields": ['},
          {t:'&nbsp;&nbsp;&nbsp;&nbsp;{"name": "orderId", "type": "string"},'},
          {t:'&nbsp;&nbsp;&nbsp;&nbsp;{"name": "total",   "type": "double"},'},
          {t:'&nbsp;&nbsp;&nbsp;&nbsp;{"name": "placedAt","type": "long",'},
          {t:'&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"logicalType":"timestamp-millis"}'},
          {t:'&nbsp;&nbsp;]'},
          {t:'}', c:'#ff7b72'},
        ])}
        <div style="font-size:11px;color:#64748B;line-height:1.6;margin-top:10px">Avro here; the same idea holds for a <span style="${chip}">.proto</span> (Protobuf) or a <span style="${chip}">.json</span> (JSON Schema) file. See the <b>Subjects &amp; Formats</b> tab for how the three compare. At this point there is still no subject, no version, no ID — those are assigned only when the file is <i>deployed</i>.</div>
      </div>

      <!-- ─── STAGE 2 — DEPLOY ─── -->
      <div style="background:#0A0E1A;border:1px solid #1E293B;border-left:3px solid #F59E0B;border-radius:10px;padding:18px 20px;margin-bottom:22px">
        ${stageHead('2', '#F59E0B', 'Deploy — register the file so the Registry assigns subject · version · ID', 'Three real ways this happens. Who registers, and when, is the decision that separates dev from prod.')}

        <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:16px">
          ${[
            { c:'#EF4444', tag:'① Auto-register', when:'dev / local', d:`With <span style="${chip}">auto.register.schemas=true</span> (the client default), the producer's serializer registers the schema itself on the <b>first send</b>. Zero setup — great for a laptop, <b>discouraged in prod</b> because a schema is first seen on the hot path and anyone who can produce can mint a new version.` },
            { c:'#10B981', tag:'② CI/CD deploy', when:'production standard', d:`A pipeline step registers the schema <b>before the app ships</b> — e.g. the Gradle/Maven Schema Registry plugin or an explicit API call in the deploy job. The app itself runs with <span style="${chip}">auto.register.schemas=false</span>, so production code never registers; it only looks up IDs it expects to already exist.` },
            { c:'#3B82F6', tag:'③ Manual REST', when:'one-off / bootstrap', d:`A human (or a bootstrap script) <span style="${chip}">POST</span>s the schema once. Useful for the very first deploy, a hotfix, or seeding a new environment.` },
          ].map(x => `
            <div style="background:#111827;border:1px solid #1E293B;border-left:3px solid ${x.c};border-radius:9px;padding:12px 16px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                <span style="font-size:12.5px;font-weight:800;color:${x.c}">${x.tag}</span>
                <span style="font-size:10px;color:#CBD5E1;background:#0A0E1A;padding:2px 8px;border-radius:10px">${x.when}</span>
              </div>
              <div style="font-size:12px;color:#94A3B8;line-height:1.65">${x.d}</div>
            </div>`).join('')}
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
          ${codeBox('② / ③  Register the .avsc (CI step or manual curl)', [
            {t:'# auto.register.schemas=false in the app', c:'#8b949e'},
            {t:'# so CI registers it ahead of the deploy', c:'#8b949e'},
            {t:'curl -X POST \\\\', c:'#7ee787'},
            {t:'&nbsp;&nbsp;http://registry:8081/subjects/ \\\\'},
            {t:'&nbsp;&nbsp;orders-value/versions \\\\'},
            {t:'&nbsp;&nbsp;-H "Content-Type: application/\\\\'},
            {t:'&nbsp;&nbsp;vnd.schemaregistry.v1+json" \\\\'},
            {t:`&nbsp;&nbsp;-d '{"schema":"<order-placed.avsc>"}'`},
          ])}
          ${codeBox('Registry response — identity assigned', [
            {t:'HTTP/1.1 200 OK', c:'#7ee787'},
            {t:'{ "id": 152 }', c:'#ff7b72'},
            {t:'', c:'#8b949e'},
            {t:'// what the Registry now holds:', c:'#8b949e'},
            {t:'subject : orders-value', c:'#ffa657'},
            {t:'version : 1', c:'#ffa657'},
            {t:'id&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: 152&nbsp;&nbsp;(global)', c:'#7ee787'},
            {t:'stored in _schemas (compacted)', c:'#8b949e'},
          ])}
        </div>
        <div style="font-size:11.5px;color:#94A3B8;line-height:1.6;background:#F59E0B0f;border-left:3px solid #F59E0B;border-radius:0 8px 8px 0;padding:10px 14px">
          <b style="color:#F59E0B">The deploy also runs the gate.</b> Registration is where the <b>compatibility check</b> fires (<span style="${chip}">BACKWARD</span> by default). On the very first version there is nothing to compare against, so it always succeeds and becomes <b>v1 · id 152</b>. On every later deploy the Registry compares the new file to the existing version(s) and returns <span style="${chip}">409 Conflict</span> if it would break a running reader — see the <b>Schema Evolution</b> tab.
        </div>
      </div>

      <!-- ─── STAGE 3 — ALIGN ─── -->
      <div style="background:#0A0E1A;border:1px solid #1E293B;border-left:3px solid #10B981;border-radius:10px;padding:18px 20px;margin-bottom:22px">
        ${stageHead('3', '#10B981', 'Align — every record binds to the schema by ID, at send time', 'Records are not aligned by field names. They are aligned by the 4-byte schema ID the serializer stamps on each one.')}

        <div style="font-size:12.5px;color:#94A3B8;line-height:1.7;margin-bottom:16px">
          Now the app calls <span style="${chip}">producer.send()</span>. The <b>serializer</b> sits between your object and the bytes on the wire and does four things, every record:
        </div>

        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px">
          ${[
            { n:'1', t:'Extract schema', d:'Read the schema embedded in the generated <span style="'+chip+'">OrderPlaced</span> object you handed to <span style="'+chip+'">send()</span>.' },
            { n:'2', t:'Resolve ID', d:'Look up schema → ID in the local cache. Miss → one call to the Registry → get <span style="'+chip+'">152</span> → cache it. Hit → use cached ID, no network.' },
            { n:'3', t:'Serialize', d:'Encode the fields to compact Avro binary. Field names are <b>not</b> repeated per record.' },
            { n:'4', t:'Stamp header', d:'Prepend <span style="'+chip+'">0x00</span> + <span style="'+chip+'">152</span> (4 bytes BE). <b>This is the alignment.</b>' },
          ].map(x => `
            <div style="background:#111827;border:1px solid #1E293B;border-radius:9px;padding:12px;position:relative">
              <div style="width:22px;height:22px;border-radius:50%;background:#10B98122;border:1.5px solid #10B981;color:#10B981;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;margin-bottom:8px">${x.n}</div>
              <div style="font-size:12px;font-weight:700;color:#10B981;margin-bottom:5px">${x.t}</div>
              <div style="font-size:10.5px;color:#94A3B8;line-height:1.55">${x.d}</div>
            </div>`).join('')}
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
          ${codeBox('Producer — you never touch bytes or IDs', [
            {t:'// serializer wired once, at startup', c:'#8b949e'},
            {t:'props.put("value.serializer",', c:'#79c0ff'},
            {t:'&nbsp;&nbsp;KafkaAvroSerializer.class);', c:'#79c0ff'},
            {t:'props.put("schema.registry.url",', c:'#79c0ff'},
            {t:'&nbsp;&nbsp;"http://registry:8081");', c:'#a5d6ff'},
            {t:'props.put("auto.register.schemas",', c:'#79c0ff'},
            {t:'&nbsp;&nbsp;"false");  // prod: CI registered it', c:'#ffa657'},
            {t:'', c:'#8b949e'},
            {t:'// just send a typed object:', c:'#8b949e'},
            {t:'producer.send(new ProducerRecord<>(', c:'#7ee787'},
            {t:'&nbsp;&nbsp;"orders", order.getId(), order));', c:'#7ee787'},
          ])}
          ${codeBox('What actually lands on the topic', [
            {t:'byte[] on the wire:', c:'#8b949e'},
            {t:'┌──────┬────────────┬──────────┐', c:'#475569'},
            {t:'│ 0x00 │ 00 00 00 98 │ payload  │', c:'#ffa657'},
            {t:'└──────┴────────────┴──────────┘', c:'#475569'},
            {t:'&nbsp;magic&nbsp;&nbsp;id=152 (BE)&nbsp;&nbsp;Avro bytes', c:'#8b949e'},
            {t:'', c:'#8b949e'},
            {t:'// the broker stores this verbatim', c:'#8b949e'},
            {t:'// it has NO idea a schema exists', c:'#8b949e'},
            {t:'// the record points at 152; it', c:'#8b949e'},
            {t:'// does not carry the schema itself', c:'#8b949e'},
          ])}
        </div>
        <div style="font-size:11.5px;color:#94A3B8;line-height:1.6;background:#10B9810f;border-left:3px solid #10B981;border-radius:0 8px 8px 0;padding:10px 14px">
          <b style="color:#10B981">Alignment = the ID, not the field layout.</b> The consumer reads <span style="${chip}">152</span> from the header, does one <span style="${chip}">GET /schemas/ids/152</span> (then caches it), and now holds the exact <b>writer</b> schema used to encode those bytes — so it decodes them correctly even if its own code is on a different version. That is why a record can outlive the code that wrote it: the ID always resolves back to the right schema.
        </div>
      </div>

      <!-- first vs millionth -->
      <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94A3B8;margin:26px 0 12px">First record vs. the millionth — where the Registry actually sits</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:26px">
        <div style="background:#111827;border:1px solid #EF444455;border-radius:10px;padding:14px 18px">
          <div style="font-size:12px;font-weight:800;color:#EF4444;margin-bottom:8px">The 1st record (cold cache)</div>
          <div style="font-size:11.5px;color:#94A3B8;line-height:1.7">Serializer cache is empty → <b>one</b> round trip to resolve the schema ID (or, with auto-register, to register it). Costs a single network hop, once per producer lifetime per schema. After that the ID is cached.</div>
        </div>
        <div style="background:#111827;border:1px solid #10B98155;border-radius:10px;padding:14px 18px">
          <div style="font-size:12px;font-weight:800;color:#10B981;margin-bottom:8px">The millionth record (warm cache)</div>
          <div style="font-size:11.5px;color:#94A3B8;line-height:1.7">Cache hit → the serializer stamps <span style="${chip}">0x00|152</span> straight from memory and <b>never calls the Registry</b>. The Registry is off the hot path entirely; it is consulted for <i>new</i> schemas, not for throughput.</div>
        </div>
      </div>

      <div style="background:#06B6D412;border:1.5px solid #06B6D444;border-radius:12px;padding:18px 22px">
        <div style="font-size:13px;font-weight:700;color:#06B6D4;margin-bottom:10px">Day 0 in one breath</div>
        <div style="font-size:12.5px;color:#CBD5E1;line-height:1.75">A schema starts life as a <b>reviewed file in your repo</b>. Deploying it (ideally from <b>CI, with auto-register off</b>) hands it to the Registry, which runs the compatibility gate and assigns <b>subject · version · global ID</b>. From then on the producer's serializer <b>stamps that ID onto every record</b> — so records align to their schema by a 4-byte pointer, the broker stays oblivious, and any consumer can resolve the exact writer schema by ID. Define once, deploy with a gate, align forever.</div>
      </div>

    </div>`;
}

/* ─────────────────────────────────────────────────────────────────────────
   TAB 3 — Wire Format (existing content, preserved)
   ───────────────────────────────────────────────────────────────────────── */
function buildWire(container) {
  const tab = container.querySelector('#tab-wire');
  tab.innerHTML = `
    <div class="canvas-caption">Every record written through the Confluent serializer carries a <b>5-byte header</b> before the payload: a <b>magic byte</b> (<code>0x00</code>) + a 4-byte <b>schema ID</b>. The diagram traces how a consumer uses that ID to fetch the right schema and decode the bytes — so the schema travels <i>once</i> to the Registry, not with every message.</div>
    <div class="svg-wrap">
      <svg viewBox="0 0 800 400" width="800" height="400" style="font-family:system-ui">

        <text x="30" y="30" fill="#94A3B8" font-size="12" font-weight="700">Confluent Serialization Wire Format</text>

        <!-- Wire format bytes -->
        <rect x="30" y="50" width="60" height="60" rx="6" fill="#EF444433" stroke="#EF4444" stroke-width="2"/>
        <text x="60" y="75" text-anchor="middle" fill="#EF4444" font-size="11" font-weight="700">0x00</text>
        <text x="60" y="92" text-anchor="middle" fill="#EF4444" font-size="9">Magic</text>
        <text x="60" y="104" text-anchor="middle" fill="#8A98AE" font-size="8">1 byte</text>

        <rect x="100" y="50" width="120" height="60" rx="6" fill="#FF690033" stroke="#FF6900" stroke-width="2"/>
        <text x="160" y="75" text-anchor="middle" fill="#FF6900" font-size="11" font-weight="700">Schema ID</text>
        <text x="160" y="92" text-anchor="middle" fill="#FF6900" font-size="9">(int32 BE)</text>
        <text x="160" y="104" text-anchor="middle" fill="#8A98AE" font-size="8">4 bytes</text>

        <rect x="230" y="50" width="540" height="60" rx="6" fill="#3B82F633" stroke="#3B82F6" stroke-width="2"/>
        <text x="500" y="75" text-anchor="middle" fill="#3B82F6" font-size="11" font-weight="700">Serialized Payload</text>
        <text x="500" y="92" text-anchor="middle" fill="#3B82F6" font-size="9">Avro / Protobuf / JSON Schema encoded bytes</text>
        <text x="500" y="104" text-anchor="middle" fill="#8A98AE" font-size="8">N bytes</text>

        <!-- Lookup flow -->
        <text x="30" y="150" fill="#94A3B8" font-size="11" font-weight="700">Consumer Deserialization Flow</text>

        ${[
          { x: 30,  label: '1. Receive bytes',           color: '#94A3B8' },
          { x: 170, label: '2. Read magic byte (0x00)',  color: '#EF4444' },
          { x: 330, label: '3. Read schema ID (int32)',  color: '#FF6900' },
          { x: 500, label: '4. Fetch schema from Registry', color: '#8B5CF6' },
          { x: 640, label: '5. Deserialize payload',    color: '#3B82F6' },
        ].map((s, i) => `
          <rect x="${s.x}" y="170" width="130" height="50" rx="8" fill="#1E293B" stroke="${s.color}" stroke-width="1.5"/>
          <text x="${s.x + 65}" y="192" text-anchor="middle" fill="${s.color}" font-size="9" font-weight="700">${s.label.split('(')[0]}</text>
          ${s.label.includes('(') ? `<text x="${s.x + 65}" y="207" text-anchor="middle" fill="#94A3B8" font-size="8">(${s.label.split('(')[1].replace(')','')}</text>` : ''}
          ${i < 4 ? `<line x1="${s.x + 130}" y1="195" x2="${s.x + 138}" y2="195" stroke="${s.color}" stroke-width="1.5"/>` : ''}
        `).join('')}

        <!-- Schema Registry box -->
        <rect x="420" y="260" width="200" height="80" rx="10" fill="#1E293B" stroke="#8B5CF6" stroke-width="2"/>
        <text x="520" y="284" text-anchor="middle" fill="#8B5CF6" font-size="12" font-weight="800">Schema Registry</text>
        <text x="520" y="302" text-anchor="middle" fill="#94A3B8" font-size="9">GET /schemas/ids/{id}</text>
        <text x="520" y="318" text-anchor="middle" fill="#94A3B8" font-size="9">Returns: Avro schema JSON</text>
        <text x="520" y="334" text-anchor="middle" fill="#8A98AE" font-size="8">Cached after first fetch</text>

        <line x1="555" y1="220" x2="520" y2="258" stroke="#8B5CF6" stroke-width="1.5" stroke-dasharray="4,3"/>

        <!-- Example Avro schema -->
        <rect x="30" y="260" width="360" height="120" rx="8" fill="#0D1117" stroke="#334155"/>
        <text x="50" y="282" fill="#8B949E" font-size="9">// Schema ID: 42 — orders_v2.avsc</text>
        <text x="50" y="298" fill="#ff7b72" font-size="9">{"type": "record",</text>
        <text x="50" y="313" fill="#a5d6ff" font-size="9"> "name": "OrderPlaced",</text>
        <text x="50" y="328" fill="#a5d6ff" font-size="9"> "fields": [</text>
        <text x="50" y="343" fill="#79c0ff" font-size="9">   {"name":"orderId","type":"string"},</text>
        <text x="50" y="358" fill="#79c0ff" font-size="9">   {"name":"total","type":"double"},</text>
        <text x="50" y="373" fill="#79c0ff" font-size="9">   {"name":"primeFlag","type":["null","boolean"],"default":null}</text>
      </svg>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>Serializing a record with the Confluent Avro/Protobuf/JSON serializer never embeds the schema in the message. Instead it writes <code>0x00</code> (the <strong>magic byte</strong>, so Kafka can tell a Registry-encoded payload from raw bytes), then a <strong>4-byte big-endian schema ID</strong>, then the compact binary payload. The schema itself was registered once and lives in the Registry under a <em>subject</em> (usually <code>&lt;topic&gt;-value</code>); the record just points at it by ID.</p>
      <p>On the read side, the consumer's deserializer reads the magic byte, reads the schema ID, and does a <code>GET /schemas/ids/{id}</code> against the Registry to fetch the writer's schema — then <strong>caches it</strong>, so every subsequent record with that ID skips the network entirely. This is <strong>schema-on-read</strong> without per-record overhead: millions of records share one cached schema lookup, and the payload stays small because field names and types aren't repeated in every message.</p>
      <p><strong>Interview angle:</strong> the "5-byte prefix = 1 magic byte + 4-byte schema ID" is a classic question — knowing it signals you understand the actual wire encoding, not just the concept. The follow-up is <em>why it enables zero-downtime schema evolution</em>: because records are self-describing by ID and the Registry enforces a compatibility mode (see the next tab), a producer can start writing a new schema version while old consumers keep decoding — the ID tells each consumer exactly which schema to pull, and Avro field defaults fill anything an older reader doesn't know about.</p>
    </div>`;
}

/* ─────────────────────────────────────────────────────────────────────────
   TAB 3 — End-to-End Lifecycle (canvas animation)
   ───────────────────────────────────────────────────────────────────────── */
function buildLifecycle(container) {
  const tab = container.querySelector('#tab-lifecycle');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">The full round trip. <b>Register</b> sends a schema to the Registry — the leader checks compatibility, appends to <span style="font-family:monospace">_schemas</span>, and returns a global <b>ID</b> (orange). <b>Produce</b> serializes a record with that ID and writes it to the topic (green). <b>New consumer</b> reads a record, sees an ID it hasn't cached, and does one <span style="font-family:monospace">GET /schemas/ids/{id}</span> (blue) — then caches it. Watch the caches flip from <span style="color:#EF4444">MISS</span> to <span style="color:#10B981">HIT</span>.</div>
      <canvas id="sr-canvas" width="820" height="380" style="width:100%;max-width:820px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="sr-register">📝 Register schema</button>
        <button class="ctrl-btn" id="sr-produce">📤 Produce record</button>
        <button class="ctrl-btn" id="sr-consume">📥 New consumer reads</button>
        <button class="ctrl-btn" id="sr-reset">↺ Reset caches</button>
        <span class="ctrl-label">Register → Produce → Consume, in order, to see cache cold → warm</span>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p>The Schema Registry's whole value shows up only when you trace one schema through its lifecycle. <strong>Step 1 — Register.</strong> At deploy time (ideally from CI, not the hot path), the producer's schema is <code>POST</code>ed to the Registry. The <em>leader</em> runs the compatibility check against the current version of that subject; if it passes, it assigns the next <strong>global schema ID</strong>, appends the registration to the compacted <code>_schemas</code> topic, and returns the ID. That ID is now cached producer-side.</p>
      <p><strong>Step 2 — Produce.</strong> For every record, the serializer prepends <code>0x00</code> + the 4-byte ID and writes the compact payload to the topic. No schema travels with the message, and after the first record the Registry is never called again by this producer — it serializes straight from its ID cache. The broker stores the bytes verbatim; it has no idea a schema exists.</p>
      <p><strong>Step 3 — Consume.</strong> A <em>fresh</em> consumer reads a record, extracts the ID from the header, and finds its schema cache empty for that ID (a <span style="color:#EF4444">MISS</span>) — so it makes exactly one <code>GET /schemas/ids/{id}</code> call, gets the writer schema, and caches it. Every subsequent record with that ID is a <span style="color:#10B981">HIT</span> and decodes with zero network. Press <strong>Reset caches</strong> to simulate a new consumer group or a restarted pod and watch the single cold lookup happen again.</p>
      <p><strong>Interview angle:</strong> the sequence "register (with compatibility check) → serialize by ID → Kafka stores opaque bytes → deserialize via one cached lookup" is the answer to <em>"walk me through how Schema Registry works end to end."</em> The two details that signal depth: the compatibility check happens at <em>registration</em> time (fail fast, before any bad data is written), and the Registry sits off the hot path thanks to client caches — it is consulted on <em>new</em> schemas/IDs, not per record.</p>
    </div>`;

  const canvas = tab.querySelector('#sr-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  const nodes = {
    producer: { x: 40,  y: 60,  w: 150, h: 60, label: 'Producer',   sub: 'serializer', color: '#FF6900' },
    registry: { x: 335, y: 55,  w: 160, h: 70, label: 'Schema Registry', sub: 'leader · checks + IDs', color: '#8B5CF6' },
    schemas:  { x: 640, y: 55,  w: 150, h: 70, label: '_schemas', sub: 'compacted log', color: '#10B981' },
    topic:    { x: 335, y: 200, w: 160, h: 60, label: 'orders topic', sub: 'opaque bytes', color: '#F59E0B' },
    consumer: { x: 40,  y: 290, w: 150, h: 60, label: 'New consumer', sub: 'deserializer', color: '#3B82F6' },
  };

  const packets = [];
  let raf = null, lastT = 0;
  let schemaId = 0;                 // 0 = not yet registered
  let prodCache = false;           // producer knows the ID
  let consCache = false;           // consumer has cached the schema
  let regFlash = 0, schemasFlash = 0, topicCount = 0;
  let lastLookup = '';             // 'MISS' | 'HIT' | ''
  let lastLookupT = 0;

  function node(n) {
    const flash = (n === nodes.registry && regFlash > 0) || (n === nodes.schemas && schemasFlash > 0);
    drawRoundRect(ctx, n.x, n.y, n.w, n.h, 10,
      flash ? n.color + '33' : '#111827', flash ? n.color : n.color + '88');
    ctx.font = 'bold 13px system-ui'; ctx.fillStyle = n.color; ctx.textAlign = 'center';
    ctx.fillText(n.label, n.x + n.w/2, n.y + 26);
    ctx.font = '9px system-ui'; ctx.fillStyle = '#8A98AE';
    ctx.fillText(n.sub, n.x + n.w/2, n.y + 44);
  }

  function spawnRegister() {
    regFlash = 36;
    packets.push(new EventPacket({
      label: 'schema', color: '#8B5CF6', speed: 2.0,
      path: [ {x:190,y:90}, {x:335,y:90} ],
      onArrive: () => {
        // leader appends to _schemas, assigns ID
        packets.push(new EventPacket({
          label: 'append', color: '#10B981', speed: 2.2,
          path: [ {x:495,y:90}, {x:640,y:90} ],
          onArrive: () => {
            schemasFlash = 36;
            if (schemaId === 0) schemaId = 152;
            // return the ID to the producer
            packets.push(new EventPacket({
              label: `id=${schemaId}`, color: '#FF6900', speed: 2.0,
              path: [ {x:335,y:108}, {x:190,y:108} ],
              onArrive: () => { prodCache = true; }
            }));
          }
        }));
      }
    }));
  }

  function spawnProduce() {
    if (!prodCache) { spawnRegister(); return; }
    packets.push(new EventPacket({
      label: `0x00|id=${schemaId}|…`, color: '#F59E0B', speed: 1.8,
      path: [ {x:115,y:120}, {x:115,y:230}, {x:335,y:230} ],
      onArrive: () => { topicCount = Math.min(topicCount + 1, 9); }
    }));
  }

  function spawnConsume() {
    if (topicCount <= 0) { spawnProduce(); return; }
    // record travels topic → consumer
    packets.push(new EventPacket({
      label: `0x00|id=${schemaId}|…`, color: '#F59E0B', speed: 1.8,
      path: [ {x:335,y:245}, {x:200,y:245}, {x:115,y:290} ],
      onArrive: () => {
        if (!consCache) {
          lastLookup = 'MISS'; lastLookupT = 120;
          // one GET to the registry, then cache
          packets.push(new EventPacket({
            label: `GET id=${schemaId}`, color: '#3B82F6', speed: 2.0,
            path: [ {x:190,y:315}, {x:260,y:315}, {x:415,y:125} ],
            onArrive: () => {
              regFlash = 30;
              packets.push(new EventPacket({
                label: 'schema', color: '#8B5CF6', speed: 2.2,
                path: [ {x:415,y:125}, {x:260,y:320}, {x:190,y:320} ],
                onArrive: () => { consCache = true; }
              }));
            }
          }));
        } else {
          lastLookup = 'HIT'; lastLookupT = 120;
        }
      }
    }));
  }

  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05);
    lastT = ts;
    if (regFlash > 0) regFlash--;
    if (schemasFlash > 0) schemasFlash--;
    if (lastLookupT > 0) lastLookupT--;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // static connectors
    ctx.setLineDash([4,3]); ctx.strokeStyle = '#1E293B'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(190,90); ctx.lineTo(335,90);       // prod → reg
    ctx.moveTo(495,90); ctx.lineTo(640,90);       // reg → schemas
    ctx.moveTo(115,120); ctx.lineTo(115,200);     // prod → topic (down)
    ctx.moveTo(115,230); ctx.lineTo(335,230);     // → topic
    ctx.moveTo(335,245); ctx.lineTo(115,290);     // topic → consumer
    ctx.moveTo(190,315); ctx.lineTo(335,125);     // consumer → registry (lookup)
    ctx.stroke();
    ctx.setLineDash([]);

    Object.values(nodes).forEach(node);

    // registry: current ID + compatibility
    ctx.font = '9px system-ui'; ctx.fillStyle = '#8B5CF6'; ctx.textAlign = 'center';
    ctx.fillText(schemaId ? `next ID assigned: ${schemaId}` : 'no schema yet', 415, 145);

    // topic record count
    ctx.font = '9px system-ui'; ctx.fillStyle = '#F59E0B'; ctx.textAlign = 'center';
    ctx.fillText('records written: ' + topicCount, 415, 278);

    // cache badges
    function badge(x, y, label, warm) {
      const col = warm ? '#10B981' : '#EF4444';
      drawRoundRect(ctx, x, y, 150, 22, 6, col + '22', col);
      ctx.font = 'bold 9px system-ui'; ctx.fillStyle = col; ctx.textAlign = 'center';
      ctx.fillText(label + (warm ? ' HIT (cached)' : ' MISS (cold)'), x + 75, y + 15);
    }
    badge(40, 128, 'producer ID cache:', prodCache);
    badge(40, 356, 'consumer schema cache:', consCache);

    // last lookup flash near consumer
    if (lastLookupT > 0) {
      const col = lastLookup === 'HIT' ? '#10B981' : '#EF4444';
      ctx.font = 'bold 11px system-ui'; ctx.fillStyle = col; ctx.textAlign = 'left';
      ctx.fillText(lastLookup === 'HIT' ? '✓ cache HIT — no Registry call' : '→ cache MISS — one GET to Registry', 210, 300);
    }

    packets.forEach(p => p.update(dt));
    packets.forEach(p => p.draw(ctx));
    while (packets.length > 20) packets.shift();

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });

  tab.querySelector('#sr-register').addEventListener('click', () => spawnRegister());
  tab.querySelector('#sr-produce').addEventListener('click', () => spawnProduce());
  tab.querySelector('#sr-consume').addEventListener('click', () => spawnConsume());
  tab.querySelector('#sr-reset').addEventListener('click', () => {
    consCache = false; lastLookup = ''; lastLookupT = 0;
  });

  return () => { if (raf) cancelAnimationFrame(raf); };
}

/* ─────────────────────────────────────────────────────────────────────────
   TAB 4 — Compatibility Modes (existing content, preserved)
   ───────────────────────────────────────────────────────────────────────── */
function buildCompat(container) {
  const tab = container.querySelector('#tab-compat');
  const modes = [
    { name: 'BACKWARD', color: '#3B82F6', icon: '⬅️', desc: 'New schema reads old data. Old fields can be removed if they have defaults. Add new optional fields. Consumer upgrades first.', allowed: ['Remove field (with default)', 'Add optional field'], forbidden: ['Add required field', 'Change field type'] },
    { name: 'FORWARD', color: '#10B981', icon: '➡️', desc: 'Old schema reads new data. New fields must have defaults (old reader ignores them). Producer upgrades first.', allowed: ['Add field with default', 'Remove optional field'], forbidden: ['Remove required field', 'Change field type'] },
    { name: 'FULL', color: '#FF6900', icon: '↔️', desc: 'Both BACKWARD and FORWARD. Most restrictive. Either producer or consumer can upgrade first. Amazon payment schema standard.', allowed: ['Add optional field with default'], forbidden: ['Remove any field', 'Add required field', 'Change type'] },
    { name: 'NONE', color: '#EF4444', icon: '🚫', desc: 'No compatibility checking. Any schema change accepted. Risky — consumer may break on incompatible change. Only for development topics.', allowed: ['Anything'], forbidden: [] },
  ];
  const dirs = [
    { name: 'BACKWARD', color: '#3B82F6', who: 'Consumer upgrades first', reader: 'New consumer (v2)', data: 'reads v1 + v2 data', rule: 'new code can read old data' },
    { name: 'FORWARD',  color: '#10B981', who: 'Producer upgrades first', reader: 'Old consumer (v1)', data: 'reads v2 data', rule: 'old code can read new data' },
    { name: 'FULL',     color: '#FF6900', who: 'Either side, any order', reader: 'v1 ⇄ v2', data: 'read each other', rule: 'both directions hold' },
  ];
  tab.innerHTML = `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Schema Compatibility Modes</div><div class="section-desc">Configure per subject: PUT /config/{subject} {"compatibility": "FULL"}</div></div>

      <div class="canvas-explainer" style="border-top:none;border-radius:10px;margin-bottom:16px">
        <p>Compatibility mode answers one operational question: <strong>can I change a schema without breaking the services already running?</strong> The Registry enforces the rule at registration time — if your new schema would violate it, the producer fails fast instead of writing records that consumers can't read. The direction of the rule decides <strong>who you can safely deploy first</strong>, which is the whole point.</p>
        <p>Read the arrows below as "this reader can read that data." <strong>BACKWARD</strong> (the default) means <em>new code reads old data</em>, so you upgrade <strong>consumers first</strong>, then producers. <strong>FORWARD</strong> means <em>old code reads new data</em>, so you can upgrade <strong>producers first</strong> and let consumers catch up. <strong>FULL</strong> is both at once — either side can deploy in any order, which is why Amazon uses <code>FULL_TRANSITIVE</code> for payment schemas (any version interoperates with any other, not just the adjacent one).</p>
      </div>

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px">
        ${dirs.map(d => `
          <div style="background:var(--bg2);border:1px solid ${d.color};border-radius:10px;padding:14px">
            <div style="font-size:12px;font-weight:800;color:${d.color};font-family:monospace;margin-bottom:4px">${d.name}</div>
            <div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:12px">${d.who}</div>
            <div style="display:flex;align-items:center;gap:8px">
              <span style="flex:1;text-align:center;background:${d.color}22;border:1.5px solid ${d.color};color:${d.color};border-radius:7px;padding:8px 4px;font-size:10px;font-weight:700">${d.reader}</span>
              <span style="color:${d.color};font-size:16px;font-weight:700">→</span>
              <span style="flex:1;text-align:center;background:var(--bg);border:1px solid var(--border);color:var(--text2);border-radius:7px;padding:8px 4px;font-size:10px">${d.data}</span>
            </div>
            <div style="margin-top:10px;font-size:10.5px;color:var(--text3);line-height:1.5">${d.rule}</div>
          </div>`).join('')}
      </div>

      <div class="info-grid">
        ${modes.map(m => `
          <div class="info-card" style="border-left:3px solid ${m.color}">
            <div style="font-size:22px;margin-bottom:6px">${m.icon}</div>
            <div class="info-card-title" style="color:${m.color}">${m.name}</div>
            <div class="info-card-body" style="margin:8px 0">${m.desc}</div>
            <div style="font-size:11px;font-weight:700;color:var(--green);margin-bottom:4px">✅ Allowed</div>
            ${m.allowed.map(a => `<div style="font-size:11px;color:var(--text2);margin-bottom:2px">• ${a}</div>`).join('')}
            ${m.forbidden.length ? `
              <div style="font-size:11px;font-weight:700;color:var(--red);margin:6px 0 4px">❌ Forbidden</div>
              ${m.forbidden.map(f => `<div style="font-size:11px;color:var(--text3);margin-bottom:2px">• ${f}</div>`).join('')}
            ` : ''}
          </div>`).join('')}
      </div>

      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:16px 20px;margin-top:18px">
        <div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:8px">Transitive vs. non-transitive</div>
        <div style="font-size:12px;color:var(--text2);line-height:1.7">Each of BACKWARD / FORWARD / FULL has a <code>_TRANSITIVE</code> twin. The plain mode checks a new schema only against the <b>immediately previous</b> version; the transitive mode checks it against <b>all</b> still-live versions. If your data is retained long-term (payments, audit logs), use transitive so a record written at v1 years ago is still readable by today's v6 — a chain of adjacent-compatible steps can otherwise drift into v1 being unreadable. See the <b>Schema Evolution</b> tab for a worked example of exactly that drift.</div>
      </div>
    </div>`;
}

/* ─────────────────────────────────────────────────────────────────────────
   TAB 5 — Schema Evolution Walkthrough
   ───────────────────────────────────────────────────────────────────────── */
function buildEvolution(container) {
  const tab = container.querySelector('#tab-evolution');
  const chip = 'font-size:11px;color:#CBD5E1;background:#0A0E1A;padding:2px 6px;border-radius:5px;font-family:monospace';
  const codeBox = (title, lines) => `
    <div style="background:#0D1117;border:1px solid #1E293B;border-radius:8px;padding:12px 14px">
      <div style="font-size:10px;color:#8B949E;margin-bottom:8px;font-family:monospace">${title}</div>
      ${lines.map(l => `<div style="font-size:11px;font-family:monospace;color:${l.c || '#79c0ff'};line-height:1.7">${l.t}</div>`).join('')}
    </div>`;
  tab.innerHTML = `
    <div class="scroll-content" style="max-width:940px;margin:0 auto">

      <div style="background:#111827;border:1px solid #10B981;border-radius:14px;padding:20px 24px;margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94A3B8;margin-bottom:8px">Evolution, concretely</div>
        <div style="font-size:18px;font-weight:800;color:#F1F5F9;margin-bottom:6px">One schema, <code>OrderPlaced</code>, evolving v1 → v2 → v3 under BACKWARD</div>
        <div style="font-size:13px;color:#94A3B8;line-height:1.6">The Compatibility Modes tab gave you the rules. This is the rules <i>hitting real changes</i> — which pass, which get rejected with a <span style="${chip}">409 Conflict</span>, and how Avro defaults let old readers survive new data.</div>
      </div>

      <!-- v1 -> v2 PASS -->
      <div style="margin-bottom:22px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <span style="background:#10B98122;border:1.5px solid #10B981;color:#10B981;font-size:11px;font-weight:800;padding:3px 10px;border-radius:6px">✅ v1 → v2 · ACCEPTED</span>
          <span style="font-size:12px;color:#94A3B8">Add an <b>optional</b> field with a default — the textbook safe change</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${codeBox('OrderPlaced v1 (schema id 101)', [
            {t:'{ "type":"record", "name":"OrderPlaced",', c:'#ff7b72'},
            {t:'&nbsp;&nbsp;"fields":['},
            {t:'&nbsp;&nbsp;&nbsp;&nbsp;{"name":"orderId","type":"string"},'},
            {t:'&nbsp;&nbsp;&nbsp;&nbsp;{"name":"total","type":"double"}'},
            {t:'&nbsp;&nbsp;] }', c:'#ff7b72'},
          ])}
          ${codeBox('OrderPlaced v2 (schema id 152)', [
            {t:'{ "type":"record", "name":"OrderPlaced",', c:'#ff7b72'},
            {t:'&nbsp;&nbsp;"fields":['},
            {t:'&nbsp;&nbsp;&nbsp;&nbsp;{"name":"orderId","type":"string"},'},
            {t:'&nbsp;&nbsp;&nbsp;&nbsp;{"name":"total","type":"double"},'},
            {t:'&nbsp;&nbsp;&nbsp;&nbsp;{"name":"primeFlag",', c:'#7ee787'},
            {t:'&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"type":["null","boolean"],"default":null}', c:'#7ee787'},
            {t:'&nbsp;&nbsp;] }', c:'#ff7b72'},
          ])}
        </div>
        <div style="font-size:11.5px;color:#94A3B8;line-height:1.6;margin-top:10px;background:#10B9810f;border-left:3px solid #10B981;border-radius:0 8px 8px 0;padding:10px 14px">
          <b style="color:#10B981">Why it passes BACKWARD:</b> a <i>new</i> consumer (v2) reading an <i>old</i> v1 record finds no <span style="${chip}">primeFlag</span> in the bytes, so Avro fills it from the <span style="${chip}">default:null</span>. New code reads old data → BACKWARD holds. The optional union <span style="${chip}">["null","boolean"]</span> plus a default is what makes it safe.
        </div>
      </div>

      <!-- v2 -> v3 REJECT -->
      <div style="margin-bottom:22px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <span style="background:#EF444422;border:1.5px solid #EF4444;color:#EF4444;font-size:11px;font-weight:800;padding:3px 10px;border-radius:6px">❌ v2 → v3 · REJECTED (409)</span>
          <span style="font-size:12px;color:#94A3B8">Add a <b>required</b> field with no default — the classic mistake</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${codeBox('OrderPlaced v3 (attempted)', [
            {t:'{ "type":"record", "name":"OrderPlaced",', c:'#ff7b72'},
            {t:'&nbsp;&nbsp;"fields":['},
            {t:'&nbsp;&nbsp;&nbsp;&nbsp;{"name":"orderId","type":"string"},'},
            {t:'&nbsp;&nbsp;&nbsp;&nbsp;{"name":"total","type":"double"},'},
            {t:'&nbsp;&nbsp;&nbsp;&nbsp;{"name":"currency","type":"string"}', c:'#ffa657'},
            {t:'&nbsp;&nbsp;&nbsp;&nbsp;// ↑ required, NO default', c:'#f85149'},
            {t:'&nbsp;&nbsp;] }', c:'#ff7b72'},
          ])}
          ${codeBox('Registry response', [
            {t:'POST /subjects/orders-value/versions', c:'#8b949e'},
            {t:'HTTP/1.1 409 Conflict', c:'#f85149'},
            {t:'{', c:'#ff7b72'},
            {t:'&nbsp;&nbsp;"error_code": 409,', c:'#f85149'},
            {t:'&nbsp;&nbsp;"message": "Schema being'},
            {t:'&nbsp;&nbsp;registered is incompatible'},
            {t:'&nbsp;&nbsp;with an earlier schema..."'},
            {t:'}', c:'#ff7b72'},
          ])}
        </div>
        <div style="font-size:11.5px;color:#94A3B8;line-height:1.6;margin-top:10px;background:#EF44440f;border-left:3px solid #EF4444;border-radius:0 8px 8px 0;padding:10px 14px">
          <b style="color:#EF4444">Why it fails:</b> a v2 consumer reading a v3 record would hit a <span style="${chip}">currency</span> field it doesn't know — but worse for BACKWARD, a <i>new</i> v3 reader reading an <i>old</i> record has no <span style="${chip}">currency</span> and <b>no default to fall back on</b>, so it cannot construct the object. The producer <b>fails fast at registration</b> — no bad record is ever written. <b>The fix:</b> give it a default (<span style="${chip}">"default":"USD"</span>), turning a required add into a compatible one.
        </div>
      </div>

      <!-- the rule table -->
      <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94A3B8;margin:26px 0 12px">The change cheat-sheet (Avro, BACKWARD default)</div>
      <div style="overflow-x:auto;margin-bottom:26px">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:#111827">
            <th style="text-align:left;padding:10px 12px;color:#94A3B8;border:1px solid #1E293B">Change</th>
            <th style="text-align:center;padding:10px 12px;color:#94A3B8;border:1px solid #1E293B">BACKWARD</th>
            <th style="text-align:center;padding:10px 12px;color:#94A3B8;border:1px solid #1E293B">FORWARD</th>
            <th style="text-align:left;padding:10px 12px;color:#94A3B8;border:1px solid #1E293B">Note</th>
          </tr></thead>
          <tbody>
          ${[
            ['Add optional field (w/ default)', '✅', '✅', 'Fully safe — the everyday change'],
            ['Add required field (no default)', '❌', '✅', 'New reader can\'t fill it from old data'],
            ['Remove optional field (w/ default)', '✅', '❌', 'Old reader loses a field it expected'],
            ['Remove required field', '❌', '❌', 'Breaks a reader in at least one direction'],
            ['Change field type (int→string)', '❌', '❌', 'Never compatible — add a new field instead'],
            ['Rename a field', '❌', '❌', 'Treated as drop + add; use "aliases" to survive'],
            ['Add enum symbol', '⚠️', '✅', 'Old reader may not know the new symbol'],
          ].map((r,i) => `
            <tr style="background:${i%2?'#0D1117':'#0A0E1A'}">
              <td style="padding:9px 12px;color:#CBD5E1;border:1px solid #1E293B">${r[0]}</td>
              <td style="padding:9px 12px;text-align:center;border:1px solid #1E293B">${r[1]}</td>
              <td style="padding:9px 12px;text-align:center;border:1px solid #1E293B">${r[2]}</td>
              <td style="padding:9px 12px;color:#94A3B8;border:1px solid #1E293B">${r[3]}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>

      <!-- transitive drift -->
      <div style="background:#F59E0B12;border:1.5px solid #F59E0B44;border-radius:12px;padding:18px 22px">
        <div style="font-size:13px;font-weight:700;color:#F59E0B;margin-bottom:10px">The drift that <code>_TRANSITIVE</code> prevents</div>
        <div style="font-size:12.5px;color:#94A3B8;line-height:1.75">Under plain BACKWARD, v2 is only checked against v1 and v3 only against v2. Imagine v1 has field <span style="${chip}">status:string</span>, v2 adds optional <span style="${chip}">statusCode</span>, and v3 removes the now-"redundant" <span style="${chip}">status</span> (it has a default, so v3-vs-v2 passes). But a consumer on v3 reading a <b>very old v1</b> record is fine, while a <b>v1 consumer</b> reading <b>v3 data</b> has lost <span style="${chip}">status</span> entirely — a break that only shows up across the <i>whole</i> history, not between adjacent versions. <span style="${chip}">BACKWARD_TRANSITIVE</span> checks every live version and rejects the v3 change up front. For long-retention data, always go transitive.</div>
      </div>

    </div>`;
}

/* ─────────────────────────────────────────────────────────────────────────
   TAB 6 — Subjects & Naming + Formats
   ───────────────────────────────────────────────────────────────────────── */
function buildSubjects(container) {
  const tab = container.querySelector('#tab-subjects');
  const chip = 'font-size:11px;color:#CBD5E1;background:#0A0E1A;padding:2px 6px;border-radius:5px;font-family:monospace';
  tab.innerHTML = `
    <div class="scroll-content" style="max-width:940px;margin:0 auto">

      <div style="background:#111827;border:1px solid #FF6900;border-radius:14px;padding:20px 24px;margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94A3B8;margin-bottom:8px">Naming decides what can share a topic</div>
        <div style="font-size:18px;font-weight:800;color:#F1F5F9;margin-bottom:6px">A "subject" is the unit of evolution — the strategy picks its name from each record</div>
        <div style="font-size:13px;color:#94A3B8;line-height:1.6">Compatibility is enforced <i>per subject</i>. So the subject-name strategy silently decides whether a topic holds one record type or many, and whether a type's schema is shared across topics. Getting this wrong is why "every schema registration suddenly fails."</div>
      </div>

      <!-- strategies -->
      <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94A3B8;margin-bottom:14px">The three subject-name strategies</div>
      <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:16px">
        ${[
          { t:'TopicNameStrategy', badge:'default', c:'#3B82F6',
            subj:'&lt;topic&gt;-key&nbsp;&nbsp;/&nbsp;&nbsp;&lt;topic&gt;-value',
            d:'One schema lineage per topic. Simplest and safest default. Enforces "one record type per topic" — a topic\'s value is always the same evolving schema.',
            use:'Almost everything. Classic one-type-per-topic design.' },
          { t:'RecordNameStrategy', badge:'', c:'#8B5CF6',
            subj:'&lt;record.fullName&gt;&nbsp;&nbsp;(e.g. com.amazon.OrderPlaced)',
            d:'Subject = the record\'s fully-qualified name. A single topic can carry MANY event types, each evolving on its own lineage — and the same type shares one schema across every topic it appears on.',
            use:'Event sourcing; "all events for an aggregate on one topic"; shared canonical types.' },
          { t:'TopicRecordNameStrategy', badge:'', c:'#10B981',
            subj:'&lt;topic&gt;-&lt;record.fullName&gt;',
            d:'Multiple record types per topic, but each type\'s lineage is scoped to that topic. Combines "many types on a topic" with "per-topic independence."',
            use:'Many event types on a topic, but you want each topic\'s evolution isolated.' },
        ].map(x => `
          <div style="background:#111827;border:1px solid #1E293B;border-left:3px solid ${x.c};border-radius:10px;padding:14px 18px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span style="font-size:13px;font-weight:800;color:${x.c}">${x.t}</span>
              ${x.badge?`<span style="font-size:9px;font-weight:700;color:#0A0E1A;background:${x.c};padding:1px 7px;border-radius:4px;text-transform:uppercase">${x.badge}</span>`:''}
            </div>
            <div style="font-size:11px;color:#CBD5E1;font-family:monospace;background:#0A0E1A;padding:5px 9px;border-radius:6px;display:inline-block;margin-bottom:8px">subject = ${x.subj}</div>
            <div style="font-size:12px;color:#94A3B8;line-height:1.6;margin-bottom:6px">${x.d}</div>
            <div style="font-size:11px;color:#64748B"><b style="color:#94A3B8">When:</b> ${x.use}</div>
          </div>`).join('')}
      </div>
      <div style="font-size:11px;color:#64748B;text-align:center;margin-bottom:30px">The trap: on the default strategy, putting two different record types on one topic makes the Registry compare unrelated schemas under the same <span style="${chip}">&lt;topic&gt;-value</span> subject — and reject them. Switch strategy, or split the topic.</div>

      <!-- formats -->
      <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94A3B8;margin-bottom:14px">Avro vs. Protobuf vs. JSON Schema</div>
      <div style="overflow-x:auto;margin-bottom:16px">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:#111827">
            ${['','Avro','Protobuf','JSON Schema'].map((h,i)=>`<th style="text-align:${i?'center':'left'};padding:10px 12px;color:${i===1?'#8B5CF6':i===2?'#10B981':i===3?'#3B82F6':'#94A3B8'};border:1px solid #1E293B;font-weight:${i?'800':'700'}">${h}</th>`).join('')}
          </tr></thead>
          <tbody>
          ${[
            ['Encoding size','Smallest (no field names/tags)','Small (numbered tags)','Largest (field names in payload)'],
            ['Human-readable wire','No','No','Yes (it\'s JSON)'],
            ['Schema travels with data','No — schema needed to read','Partially (tags self-describe)','Yes — self-describing'],
            ['Cross-language codegen','Good','Excellent (first-class)','Good'],
            ['Evolution model','Defaults + aliases','Field numbers never reused','Optional/required + refs'],
            ['Schema references','Yes','Yes (imports)','Yes ($ref)'],
            ['Best fit','Kafka default, data pipelines','gRPC shops, polyglot services','Web/JSON-native, debuggability'],
          ].map((r,i)=>`
            <tr style="background:${i%2?'#0D1117':'#0A0E1A'}">
              <td style="padding:9px 12px;color:#94A3B8;border:1px solid #1E293B;font-weight:600">${r[0]}</td>
              <td style="padding:9px 12px;color:#CBD5E1;border:1px solid #1E293B;text-align:center">${r[1]}</td>
              <td style="padding:9px 12px;color:#CBD5E1;border:1px solid #1E293B;text-align:center">${r[2]}</td>
              <td style="padding:9px 12px;color:#CBD5E1;border:1px solid #1E293B;text-align:center">${r[3]}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>

      <!-- schema references -->
      <div style="background:#8B5CF612;border:1.5px solid #8B5CF644;border-radius:12px;padding:18px 22px;margin-bottom:16px">
        <div style="font-size:13px;font-weight:700;color:#8B5CF6;margin-bottom:10px">Schema references — don't copy-paste shared types</div>
        <div style="font-size:12.5px;color:#94A3B8;line-height:1.75">All three formats let one schema <b>reference</b> another registered schema by subject + version instead of inlining it. Register <span style="${chip}">Address</span> once, then <span style="${chip}">Customer</span> and <span style="${chip}">Order</span> both reference it. Change <span style="${chip}">Address</span> in one place and every referencing schema sees the update; compatibility is still enforced on each. This is how large orgs keep hundreds of schemas DRY — the Registry resolves the full schema at registration by stitching references together.</div>
      </div>

      <div style="background:#FF690012;border:1.5px solid #FF690044;border-radius:12px;padding:18px 22px">
        <div style="font-size:13px;font-weight:700;color:#FF6900;margin-bottom:8px">Rule of thumb</div>
        <div style="font-size:12.5px;color:#CBD5E1;line-height:1.75">Default to <b>Avro + TopicNameStrategy</b> — it's the path of least resistance and most Kafka tooling assumes it. Reach for <b>Protobuf</b> when you already live in a gRPC/protobuf ecosystem, and <b>JSON Schema</b> when human-readability or JSON-native consumers matter more than wire size. Switch away from TopicNameStrategy only when you deliberately need multiple event types on one topic.</div>
      </div>

    </div>`;
}

/* ─────────────────────────────────────────────────────────────────────────
   TAB 7 — REST API & Operations
   ───────────────────────────────────────────────────────────────────────── */
function buildOps(container) {
  const tab = container.querySelector('#tab-ops');
  const chip = 'font-size:11px;color:#CBD5E1;background:#0A0E1A;padding:2px 6px;border-radius:5px;font-family:monospace';
  const ep = (method, path, desc, mc) => `
    <div style="display:flex;gap:12px;align-items:flex-start;background:#111827;border:1px solid #1E293B;border-radius:9px;padding:11px 14px">
      <span style="flex-shrink:0;font-size:10px;font-weight:800;color:#0A0E1A;background:${mc};padding:3px 8px;border-radius:5px;font-family:monospace;min-width:52px;text-align:center">${method}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:11.5px;font-family:monospace;color:#CBD5E1;word-break:break-all;margin-bottom:3px">${path}</div>
        <div style="font-size:11px;color:#94A3B8;line-height:1.5">${desc}</div>
      </div>
    </div>`;
  tab.innerHTML = `
    <div class="scroll-content" style="max-width:940px;margin:0 auto">

      <div style="background:#111827;border:1px solid #06B6D4;border-radius:14px;padding:20px 24px;margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94A3B8;margin-bottom:8px">Running it in production</div>
        <div style="font-size:18px;font-weight:800;color:#F1F5F9;margin-bottom:6px">A plain REST API — plus the ops details that bite at scale</div>
        <div style="font-size:13px;color:#94A3B8;line-height:1.6">The Registry is "just" HTTP over the <span style="${chip}">_schemas</span> topic. The interesting part is the operational rules around it: config precedence, soft vs. hard delete, HA, migration, security, and what breaks when it's down.</div>
      </div>

      <!-- API cheat sheet -->
      <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94A3B8;margin-bottom:14px">The REST API cheat-sheet</div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:28px">
        ${ep('POST','/subjects/{subject}/versions','Register a new schema under a subject. Runs the compatibility check; returns the global <b>id</b> or <b>409</b> if incompatible.','#10B981')}
        ${ep('GET','/schemas/ids/{id}','Fetch a schema by global ID. The exact call a consumer makes on a cache miss (the hot-path lookup).','#3B82F6')}
        ${ep('GET','/subjects/{subject}/versions/{v}','Get a specific version (or <span style="'+chip+'">/latest</span>) under a subject, with its id and schema.','#3B82F6')}
        ${ep('POST','/compatibility/subjects/{subject}/versions/latest','<b>Dry-run</b> a schema against the subject\'s compatibility rule without registering. CI uses this as a pre-merge gate.','#8B5CF6')}
        ${ep('PUT','/config/{subject}','Set the compatibility mode for one subject (overrides the global default).','#F59E0B')}
        ${ep('GET','/config','Read the global default compatibility (BACKWARD out of the box).','#3B82F6')}
        ${ep('DELETE','/subjects/{subject}/versions/{v}','<b>Soft</b> delete — hides the version but keeps the ID resolvable so old records still deserialize.','#EF4444')}
        ${ep('DELETE','…/{v}?permanent=true','<b>Hard</b> delete — removes it entirely; the ID no longer resolves. Dangerous if any retained record points at it.','#EF4444')}
      </div>

      <!-- config precedence + delete -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:28px">
        <div style="background:#111827;border:1px solid #1E293B;border-radius:12px;padding:16px 18px">
          <div style="font-size:12.5px;font-weight:700;color:#F59E0B;margin-bottom:10px">Compatibility config precedence</div>
          <div style="font-size:12px;color:#94A3B8;line-height:1.7">
            <b style="color:#CBD5E1">Subject-level</b> (<span style="${chip}">PUT /config/{subject}</span>) <b>wins over</b> <b style="color:#CBD5E1">global</b> (<span style="${chip}">PUT /config</span>). Set a strict global default (e.g. <span style="${chip}">FULL_TRANSITIVE</span>) and relax specific subjects only where justified — never the other way around. A subject with no override inherits the global mode.
          </div>
        </div>
        <div style="background:#111827;border:1px solid #1E293B;border-radius:12px;padding:16px 18px">
          <div style="font-size:12.5px;font-weight:700;color:#EF4444;margin-bottom:10px">Soft vs. hard delete</div>
          <div style="font-size:12px;color:#94A3B8;line-height:1.7">
            Records self-describe by ID <b>forever</b>. A <b>soft</b> delete hides a version but keeps the ID resolvable, so consumers of old data still work. A <b>hard</b> delete (<span style="${chip}">?permanent=true</span>) makes the ID unresolvable — only safe for schemas no retained record references. In practice: almost never hard-delete.
          </div>
        </div>
      </div>

      <!-- HA + migration + security -->
      <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94A3B8;margin-bottom:14px">Operating it: HA, migration, security</div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:28px">
        ${[
          { t:'High availability', c:'#10B981', d:`Run <b>multiple Registry nodes</b>. One is leader (only writer, assigns IDs via the single-partition <span style="${chip}">_schemas</span> topic); followers forward writes and serve reads from their in-memory cache. A leader loss triggers re-election; reads keep working throughout. Replicate <span style="${chip}">_schemas</span> like any critical topic.` },
          { t:'Migration & multi-region (Schema Linking)', c:'#8B5CF6', d:`<b>Schema Linking</b> copies subjects + their IDs from one Registry to another (e.g. DR region, or Confluent migration), <b>preserving global IDs</b> so records produced in region A still deserialize in region B. <b>IMPORT mode</b> lets you load schemas with explicit IDs/versions during a migration instead of auto-assigning new ones.` },
          { t:'Security (RBAC)', c:'#F59E0B', d:`Lock down writes: production disables client-side <span style="${chip}">auto.register.schemas</span> so only CI/CD can register, and uses role-based access so teams can register only their own subjects. The Registry itself sits behind TLS + auth; the <span style="${chip}">_schemas</span> topic should be writable only by the Registry principal.` },
        ].map(x => `
          <div style="background:#111827;border:1px solid #1E293B;border-left:3px solid ${x.c};border-radius:10px;padding:13px 18px">
            <div style="font-size:12.5px;font-weight:700;color:${x.c};margin-bottom:5px">${x.t}</div>
            <div style="font-size:12px;color:#94A3B8;line-height:1.65">${x.d}</div>
          </div>`).join('')}
      </div>

      <!-- failure modes -->
      <div style="background:#EF444412;border:1.5px solid #EF444444;border-radius:12px;padding:18px 22px">
        <div style="font-size:13px;font-weight:700;color:#EF4444;margin-bottom:12px">What breaks when the Registry is down?</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:12px">
          <div>
            <div style="color:#10B981;font-weight:600;margin-bottom:6px">Keeps working (cache warm)</div>
            <div style="font-size:11.5px;color:#94A3B8;line-height:1.7">Producers already holding the schema→ID mapping keep serializing. Consumers already holding the ID→schema mapping keep deserializing. A steady-state pipeline survives a brief outage untouched.</div>
          </div>
          <div>
            <div style="color:#EF4444;font-weight:600;margin-bottom:6px">Fails (cache cold / new schema)</div>
            <div style="font-size:11.5px;color:#94A3B8;line-height:1.7">A fresh producer, a brand-new schema, a restarted consumer, or a never-seen ID all force a Registry call — which fails. The send/poll throws. This is why you run HA and pre-register schemas off the hot path.</div>
          </div>
        </div>
        <div style="font-size:11.5px;color:#CBD5E1;line-height:1.7;margin-top:14px;border-top:1px solid #EF444433;padding-top:12px">
          <b>The production playbook:</b> multiple Registry nodes, <span style="${chip}">auto.register.schemas=false</span> in prod (register from CI with the <span style="${chip}">/compatibility</span> dry-run as a merge gate), keep client caches warm, and treat <span style="${chip}">_schemas</span> as a tier-0 topic. The Registry should influence deploys, never the request path.
        </div>
      </div>

    </div>`;
}

/* ─────────────────────────────────────────────────────────────────────────
   TAB 8 — Amazon End-to-End
   ───────────────────────────────────────────────────────────────────────── */
function buildAmazon(container) {
  const tab = container.querySelector('#tab-amazon');
  const chip = 'font-size:11px;color:#CBD5E1;background:#0A0E1A;padding:2px 6px;border-radius:5px;font-family:monospace';
  tab.innerHTML = `
    <div class="scroll-content" style="max-width:940px;margin:0 auto">

      <div style="background:#111827;border:1px solid #FF6900;border-radius:14px;padding:20px 24px;margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94A3B8;margin-bottom:8px">The whole thing, in one story</div>
        <div style="font-size:18px;font-weight:800;color:#F1F5F9;margin-bottom:6px">Amazon's Payments team adds a field to <code>PaymentAuthorized</code> — with zero downtime and six teams unaffected</div>
        <div style="font-size:13px;color:#94A3B8;line-height:1.6">One concrete change threaded through every concept in this module: subject, compatibility mode, registration gate, wire format, independent consumers, and the one timeline where it all pays off.</div>
      </div>

      <!-- timeline -->
      <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94A3B8;margin-bottom:14px">The deploy timeline</div>
      <div style="margin-bottom:28px">
        ${[
          { n:'1', c:'#8B5CF6', t:'CI opens a PR adding optional "installmentPlan"', d:'The Payments schema <span style="'+chip+'">PaymentAuthorized</span> lives under subject <span style="'+chip+'">payments.authorized-value</span> with <span style="'+chip+'">FULL_TRANSITIVE</span> (long-retention, audited financial data). The new field is a union with a default, so it\'s a compatible add.' },
          { n:'2', c:'#06B6D4', t:'CI runs the compatibility dry-run', d:'The pipeline calls <span style="'+chip+'">POST /compatibility/subjects/payments.authorized-value/versions/latest</span>. It checks the new schema against <b>every</b> live version (transitive), not just the last. Green → the PR can merge. A breaking change would fail here, before any code ships.' },
          { n:'3', c:'#10B981', t:'Deploy-time registration (not the hot path)', d:'On release, CI registers the schema (<span style="'+chip+'">auto.register.schemas=false</span> in prod). The leader appends to <span style="'+chip+'">_schemas</span> and returns a new global id, say 8821. No producer ever sees a never-registered schema at runtime.' },
          { n:'4', c:'#FF6900', t:'Producers roll out and start writing id=8821', d:'New Payment-service pods serialize records as <span style="'+chip+'">0x00 | 8821 | payload</span>. Old pods still writing id=8820 coexist on the same topic during the rollout — both IDs are valid and resolvable.' },
          { n:'5', c:'#3B82F6', t:'The six downstream consumers are untouched', d:'Fraud, Ledger, Notifications, Analytics, Reconciliation, and the Data Lake sink each read on their own offset. Those still on old code hit id=8821, do one cached lookup, and the field they don\'t know is simply ignored — because FULL guarantees old readers read new data. Zero coordinated deploy.' },
          { n:'6', c:'#F59E0B', t:'Old records stay readable forever', d:'A reconciliation job replaying a payment from 18 months ago (id=8102) still resolves that schema by ID. Transitive compatibility means the oldest version and the newest interoperate in both directions — exactly why finance data uses it.' },
        ].map((t,i,arr)=>`
          <div style="display:flex;gap:14px;margin-bottom:10px">
            <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:center">
              <div style="width:26px;height:26px;border-radius:50%;background:${t.c}22;border:1.5px solid ${t.c};color:${t.c};font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;margin-top:12px">${t.n}</div>
              ${i<arr.length-1?`<div style="width:2px;flex:1;background:${t.c}33;min-height:18px"></div>`:''}
            </div>
            <div style="flex:1;background:#111827;border:1px solid #1E293B;border-radius:10px;padding:12px 16px">
              <div style="font-size:12.5px;font-weight:700;color:${t.c};margin-bottom:4px">${t.t}</div>
              <div style="font-size:12px;color:#94A3B8;line-height:1.65">${t.d}</div>
            </div>
          </div>`).join('')}
      </div>

      <!-- what each concept did -->
      <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94A3B8;margin-bottom:14px">What each concept did in this story</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:28px">
        ${[
          ['Subject','#FF6900','<code>payments.authorized-value</code> is the lineage the field evolved within.'],
          ['Compatibility mode','#3B82F6','<code>FULL_TRANSITIVE</code> let producers <i>and</i> consumers deploy in any order, and kept 18-month-old records readable.'],
          ['Registration gate','#06B6D4','The CI dry-run + deploy-time register caught breakage before data was written and kept the Registry off the hot path.'],
          ['Wire format','#F59E0B','The 5-byte <code>0x00|8821</code> header let old and new producers share a topic and every consumer resolve the exact schema.'],
          ['Independent consumers','#10B981','Six groups, six offsets, six deploy schedules — none blocked by the schema change.'],
          ['Schema ID forever','#8B5CF6','Immutable records point at IDs that must always resolve — which is why hard-delete was never on the table.'],
        ].map(x=>`
          <div style="background:#111827;border:1px solid #1E293B;border-left:3px solid ${x[1]};border-radius:10px;padding:12px 16px">
            <div style="font-size:12px;font-weight:700;color:${x[1]};margin-bottom:5px">${x[0]}</div>
            <div style="font-size:11.5px;color:#94A3B8;line-height:1.6">${x[2]}</div>
          </div>`).join('')}
      </div>

      <div style="background:linear-gradient(135deg,#FF690018,#8B5CF618);border:1.5px solid #FF690055;border-radius:12px;padding:20px 24px">
        <div style="font-size:14px;font-weight:800;color:#F1F5F9;margin-bottom:10px">🔑 The payoff, in one line</div>
        <div style="font-size:12.5px;color:#CBD5E1;line-height:1.8">A schema change that, without a Registry, would need a <b>synchronized seven-team deployment</b> (and a change freeze) instead became a <b>normal PR</b> — gated by a compatibility check, shipped at each team's own pace, with historical data still readable. That is the entire point of the Schema Registry: it turns "breaking the contract" from a runtime incident into a <b>merge-time error</b>, and decouples everyone who shares the stream.</div>
      </div>

    </div>`;
}
