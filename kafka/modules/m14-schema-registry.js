import { createModuleShell, createIQSection } from '../components/module-shell.js';

const IQ = [
  { q: 'What is the Confluent wire format and why does it matter?', a: 'Every Avro/Protobuf/JSON Schema record serialized with the Confluent serializer begins with: 0x00 (magic byte, 1 byte) + schema ID (4 bytes, big-endian int32) + serialized payload. Consumers use the schema ID to fetch the schema from the Registry and deserialize the payload. This is efficient (no schema transmitted per record) and enables schema evolution (producer can upgrade schema, consumer fetches new version on demand). The magic byte differentiates Schema Registry payloads from raw bytes.', tip: 'The 5-byte prefix is a common interview question. Know it, explain why it enables schema-on-read without per-record overhead.' },
  { q: 'What is the difference between BACKWARD, FORWARD, and FULL schema compatibility?', a: 'BACKWARD: new schema can read data written with old schema. Old fields removed, new optional fields added. Consumer can upgrade first. FORWARD: old schema can read data written with new schema. New fields added with defaults, nothing removed. Producer can upgrade first. FULL: both BACKWARD and FORWARD. Most restrictive. Neither producer nor consumer needs to upgrade first. NONE: no compatibility checking. Default is BACKWARD. Amazon production: FULL_TRANSITIVE for payment schemas (any version readable by any other version).', tip: 'Mnemonic: BACKWARD = new reads old (consumer leads). FORWARD = old reads new (producer leads). FULL = both can interoperate freely.' },
  { q: 'How does Schema Registry enable safe schema evolution in a live system?', a: 'Without Registry: producer and consumer must coordinate schema changes as a deployment — both must deploy simultaneously or in a specific order, causing coordination overhead and risk. With Registry: producer registers the new schema version before deploy. Registry enforces compatibility check (e.g., BACKWARD). Producer writes records with new schema ID. Consumers running old code still read new records because Avro field defaults fill missing fields. New consumer code reads both old and new records. Zero-downtime schema migration is possible.', tip: 'This is the core operational value: Schema Registry decouples producer and consumer deployments. Teams can evolve schemas independently.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M14 · Ecosystem',
    title: 'Schema Registry',
    subtitle: 'Avro/Protobuf/JSON Schema, compatibility modes, and the wire format',
    tabs: [
      { id: 'wire',   label: '📡 Wire Format' },
      { id: 'compat', label: '🔄 Compatibility Modes' },
      { id: 'iq',     label: '🎯 Interview Q&A' },
    ]
  });

  buildWire(container);
  buildCompat(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return null;
}

function buildWire(container) {
  const tab = container.querySelector('#tab-wire');
  tab.innerHTML = `
    <div class="svg-wrap">
      <svg viewBox="0 0 800 400" width="800" height="400" style="font-family:system-ui">

        <text x="30" y="30" fill="#94A3B8" font-size="12" font-weight="700">Confluent Serialization Wire Format</text>

        <!-- Wire format bytes -->
        <rect x="30" y="50" width="60" height="60" rx="6" fill="#EF444433" stroke="#EF4444" stroke-width="2"/>
        <text x="60" y="75" text-anchor="middle" fill="#EF4444" font-size="11" font-weight="700">0x00</text>
        <text x="60" y="92" text-anchor="middle" fill="#EF4444" font-size="9">Magic</text>
        <text x="60" y="104" text-anchor="middle" fill="#475569" font-size="8">1 byte</text>

        <rect x="100" y="50" width="120" height="60" rx="6" fill="#FF690033" stroke="#FF6900" stroke-width="2"/>
        <text x="160" y="75" text-anchor="middle" fill="#FF6900" font-size="11" font-weight="700">Schema ID</text>
        <text x="160" y="92" text-anchor="middle" fill="#FF6900" font-size="9">(int32 BE)</text>
        <text x="160" y="104" text-anchor="middle" fill="#475569" font-size="8">4 bytes</text>

        <rect x="230" y="50" width="540" height="60" rx="6" fill="#3B82F633" stroke="#3B82F6" stroke-width="2"/>
        <text x="500" y="75" text-anchor="middle" fill="#3B82F6" font-size="11" font-weight="700">Serialized Payload</text>
        <text x="500" y="92" text-anchor="middle" fill="#3B82F6" font-size="9">Avro / Protobuf / JSON Schema encoded bytes</text>
        <text x="500" y="104" text-anchor="middle" fill="#475569" font-size="8">N bytes</text>

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
          ${s.label.includes('(') ? `<text x="${s.x + 65}" y="207" text-anchor="middle" fill="#64748B" font-size="8">(${s.label.split('(')[1].replace(')','')}</text>` : ''}
          ${i < 4 ? `<line x1="${s.x + 130}" y1="195" x2="${s.x + 138}" y2="195" stroke="${s.color}" stroke-width="1.5"/>` : ''}
        `).join('')}

        <!-- Schema Registry box -->
        <rect x="420" y="260" width="200" height="80" rx="10" fill="#1E293B" stroke="#8B5CF6" stroke-width="2"/>
        <text x="520" y="284" text-anchor="middle" fill="#8B5CF6" font-size="12" font-weight="800">Schema Registry</text>
        <text x="520" y="302" text-anchor="middle" fill="#94A3B8" font-size="9">GET /schemas/ids/{id}</text>
        <text x="520" y="318" text-anchor="middle" fill="#64748B" font-size="9">Returns: Avro schema JSON</text>
        <text x="520" y="334" text-anchor="middle" fill="#475569" font-size="8">Cached after first fetch</text>

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
    </div>`;
}

function buildCompat(container) {
  const tab = container.querySelector('#tab-compat');
  const modes = [
    { name: 'BACKWARD', color: '#3B82F6', icon: '⬅️', desc: 'New schema reads old data. Old fields can be removed if they have defaults. Add new optional fields. Consumer upgrades first.', allowed: ['Remove field (with default)', 'Add optional field'], forbidden: ['Add required field', 'Change field type'] },
    { name: 'FORWARD', color: '#10B981', icon: '➡️', desc: 'Old schema reads new data. New fields must have defaults (old reader ignores them). Producer upgrades first.', allowed: ['Add field with default', 'Remove optional field'], forbidden: ['Remove required field', 'Change field type'] },
    { name: 'FULL', color: '#FF6900', icon: '↔️', desc: 'Both BACKWARD and FORWARD. Most restrictive. Either producer or consumer can upgrade first. Amazon payment schema standard.', allowed: ['Add optional field with default'], forbidden: ['Remove any field', 'Add required field', 'Change type'] },
    { name: 'NONE', color: '#EF4444', icon: '🚫', desc: 'No compatibility checking. Any schema change accepted. Risky — consumer may break on incompatible change. Only for development topics.', allowed: ['Anything'], forbidden: [] },
  ];
  tab.innerHTML = `
    <div class="scroll-content">
      <div class="section-header"><div class="section-title">Schema Compatibility Modes</div><div class="section-desc">Configure per subject: PUT /config/{subject} {"compatibility": "FULL"}</div></div>
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
    </div>`;
}
