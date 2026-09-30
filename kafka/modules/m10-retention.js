import { createModuleShell, createIQSection } from '../components/module-shell.js';
import { SegmentFill } from '../components/canvas-primitives.js';

const IQ = [
  { q: 'What is log compaction and when should you use it?', a: 'Log compaction retains the latest value for each key, discarding older records with the same key. This is the "table" model: the log becomes a changelog of the current state rather than a history. Use compaction for: change data capture (CDC) topics, materialized views, KTable in Kafka Streams, configuration topics. Do NOT use compaction for: audit logs, analytics topics where history matters. Compaction runs in background threads (log.cleaner.*), guaranteed to complete within log.cleaner.max.compaction.lag.ms.', tip: 'A tombstone record (key with null value) is kept temporarily, then deleted during next compaction — this is how you delete a key from a compacted topic.' },
  { q: 'How does Kafka determine when to delete a log segment?', a: 'Two retention policies: (1) Time-based: log.retention.hours (default 168 = 7 days). Kafka checks segment end time (timestamp of last record in segment). Entire segment is deleted when the segment end time is older than retention. (2) Size-based: log.retention.bytes per partition. Oldest segments deleted until total partition size ≤ limit. Both policies can be active simultaneously (OR logic — whichever triggers first wins). Applies per topic via retention.ms / retention.bytes config override.', tip: 'Retention is per partition, not per topic. A topic with 100 partitions and retention.bytes=1GB can use up to 100GB total.' },
  { q: 'What is the difference between delete and compact cleanup policies?', a: 'delete: segments past retention are permanently deleted. All records for a key are gone. compact: only the most recent record for each key is retained. History is lost but current state is preserved. compact,delete: both policies apply — compaction runs on the active portion, deletion runs on segments past retention. This is useful for topics that need compaction (current-state semantics) but also eventual eviction (e.g., expired customer data for GDPR).', tip: '"compact,delete" is the production-safe setting for changelog topics: you keep current state, but still evict old data within retention bounds.' },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M10 · Consumer Side',
    title: 'Retention & Compaction',
    subtitle: 'Time/size retention, log compaction, and tombstone records — visualized',
    tabs: [
      { id: 'retention',  label: '🗑️ Retention Policies' },
      { id: 'compaction', label: '🗜️ Log Compaction' },
      { id: 'amazon',     label: '📦 Amazon Retention' },
      { id: 'iq',         label: '🎯 Interview Q&A' },
    ]
  });

  buildRetention(container);
  buildCompaction(container);
  buildAmazon(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return null;
}

function buildRetention(container) {
  const tab = container.querySelector('#tab-retention');
  tab.innerHTML = `
    <div class="svg-wrap">
      <svg viewBox="0 0 800 380" width="800" height="380" style="font-family:system-ui">

        <!-- Time-based retention -->
        <text x="30" y="35" fill="#94A3B8" font-size="12" font-weight="700">Time-Based Retention (log.retention.hours=168 → 7 days)</text>

        <!-- Segments timeline -->
        ${[0,1,2,3,4,5,6,7].map((d,i) => {
          const x = 30 + i * 92;
          const old = i < 3;
          return `
            <rect x="${x}" y="50" width="80" height="50" rx="6"
              fill="${old ? '#EF444422' : '#1E293B'}"
              stroke="${old ? '#EF4444' : '#334155'}" stroke-width="1.5"/>
            <text x="${x+40}" y="71" text-anchor="middle" fill="${old?'#EF4444':'#94A3B8'}" font-size="10">Day ${d+1}</text>
            <text x="${x+40}" y="87" text-anchor="middle" fill="${old?'#EF4444':'#64748B'}" font-size="9">${old?'DELETED':i===7?'ACTIVE':'sealed'}</text>`;
        }).join('')}

        <text x="30" y="125" fill="#EF4444" font-size="10">Days 1–3: past 7-day window → deleted</text>
        <text x="30" y="141" fill="#94A3B8" font-size="10">Days 4–8: within retention → kept</text>

        <!-- Size-based retention -->
        <text x="30" y="190" fill="#94A3B8" font-size="12" font-weight="700">Size-Based Retention (log.retention.bytes=5GB per partition)</text>

        ${[0,1,2,3,4].map((i) => {
          const x = 30 + i * 152;
          const old = i === 0;
          const sizes = [1.2, 1.5, 0.9, 1.1, 0.6];
          return `
            <rect x="${x}" y="205" width="130" height="60" rx="6"
              fill="${old ? '#EF444422' : '#1E293B'}"
              stroke="${old ? '#EF4444' : '#334155'}" stroke-width="1.5"/>
            <text x="${x+65}" y="226" text-anchor="middle" fill="${old?'#EF4444':'#94A3B8'}" font-size="10">seg-${i} (${sizes[i]}GB)</text>
            <text x="${x+65}" y="244" text-anchor="middle" fill="${old?'#EF4444':'#64748B'}" font-size="9">${old?'→ DELETE (total=6.3GB>5GB)':'keep'}</text>
            <text x="${x+65}" y="260" text-anchor="middle" fill="${old?'#EF4444':'#475569'}" font-size="8">${old?'oldest segment first':''}</text>`;
        }).join('')}

        <!-- compact,delete -->
        <text x="30" y="310" fill="#94A3B8" font-size="12" font-weight="700">cleanup.policy=compact,delete — Both active simultaneously</text>
        <rect x="30" y="325" width="220" height="45" rx="8" fill="#1E293B" stroke="#F59E0B" stroke-width="1.5"/>
        <text x="140" y="345" text-anchor="middle" fill="#F59E0B" font-size="10" font-weight="700">Compacted segment</text>
        <text x="140" y="362" text-anchor="middle" fill="#94A3B8" font-size="9">latest key values only</text>

        <rect x="270" y="325" width="220" height="45" rx="8" fill="#EF444422" stroke="#EF4444" stroke-width="1.5"/>
        <text x="380" y="345" text-anchor="middle" fill="#EF4444" font-size="10" font-weight="700">Beyond retention.ms</text>
        <text x="380" y="362" text-anchor="middle" fill="#94A3B8" font-size="9">deleted regardless of compaction</text>

        <text x="510" y="350" fill="#64748B" font-size="10">= GDPR-safe changelog</text>
      </svg>
    </div>`;
}

function buildCompaction(container) {
  const tab = container.querySelector('#tab-compaction');
  tab.innerHTML = `
    <div class="svg-wrap">
      <svg viewBox="0 0 800 400" width="800" height="400" style="font-family:system-ui">

        <text x="30" y="30" fill="#94A3B8" font-size="12" font-weight="700">Log Compaction — Before</text>

        <!-- Before: all records -->
        ${
          [
            { k:'user:1', v:'Alice',    off:0,  color:'#3B82F6' },
            { k:'user:2', v:'Bob',      off:1,  color:'#10B981' },
            { k:'user:1', v:'Alicia',   off:2,  color:'#3B82F6', old:true },
            { k:'user:3', v:'Carol',    off:3,  color:'#F59E0B' },
            { k:'user:2', v:'Bobby',    off:4,  color:'#10B981', old:true },
            { k:'user:1', v:'Ali',      off:5,  color:'#3B82F6', old:true },
            { k:'user:2', v:'null(🪦)', off:6,  color:'#EF4444', tomb:true },
            { k:'user:4', v:'Dave',     off:7,  color:'#8B5CF6' },
          ].map((r, i) => `
          <rect x="${30 + i*92}" y="50" width="80" height="60" rx="6"
            fill="${r.old||r.tomb ? '#1E293B' : r.color+'22'}"
            stroke="${r.old ? '#334155' : r.tomb ? '#EF4444' : r.color}"
            stroke-width="${r.old ? 1 : 1.5}"
            stroke-dasharray="${r.old ? '4,3' : '0'}"/>
          <text x="${30 + i*92 + 40}" y="71" text-anchor="middle" fill="${r.old?'#475569':r.color}" font-size="9">${r.k}</text>
          <text x="${30 + i*92 + 40}" y="85" text-anchor="middle" fill="${r.old?'#475569':r.tomb?'#EF4444':'#94A3B8'}" font-size="9">${r.v}</text>
          <text x="${30 + i*92 + 40}" y="100" text-anchor="middle" fill="#475569" font-size="8">off:${r.off}</text>
          ${r.old ? `<text x="${30 + i*92 + 40}" y="118" text-anchor="middle" fill="#EF4444" font-size="8">stale</text>` : ''}
        `).join('')
        }

        <text x="30" y="155" fill="#94A3B8" font-size="10">Stale keys (dashed) will be removed. Tombstone (null value) marks key:user:2 for deletion.</text>

        <!-- Arrow -->
        <text x="370" y="200" text-anchor="middle" fill="#FF6900" font-size="20">↓</text>
        <text x="450" y="204" fill="#FF6900" font-size="12" font-weight="700">Compaction runs</text>

        <text x="30" y="240" fill="#94A3B8" font-size="12" font-weight="700">After Compaction</text>

        ${
          [
            { k:'user:1', v:'Ali',  off:5,  color:'#3B82F6' },
            { k:'user:3', v:'Carol',off:3,  color:'#F59E0B' },
            { k:'user:4', v:'Dave', off:7,  color:'#8B5CF6' },
          ].map((r, i) => `
          <rect x="${30 + i*110}" y="260" width="90" height="60" rx="6"
            fill="${r.color+'22'}" stroke="${r.color}" stroke-width="1.5"/>
          <text x="${30 + i*110 + 45}" y="281" text-anchor="middle" fill="${r.color}" font-size="10">${r.k}</text>
          <text x="${30 + i*110 + 45}" y="296" text-anchor="middle" fill="#94A3B8" font-size="10">${r.v}</text>
          <text x="${30 + i*110 + 45}" y="311" text-anchor="middle" fill="#475569" font-size="8">off:${r.off}</text>
        `).join('')
        }

        <rect x="360" y="260" width="120" height="60" rx="6" fill="#EF444411" stroke="#EF4444" stroke-width="1" stroke-dasharray="4,3"/>
        <text x="420" y="284" text-anchor="middle" fill="#EF4444" font-size="9">user:2 tombstone</text>
        <text x="420" y="300" text-anchor="middle" fill="#EF4444" font-size="9">retained briefly</text>
        <text x="420" y="316" text-anchor="middle" fill="#475569" font-size="8">then deleted</text>

        <text x="30" y="370" fill="#10B981" font-size="11">✅ Compacted log = current state of all keys. user:1 history gone, latest "Ali" remains.</text>
        <text x="30" y="387" fill="#10B981" font-size="11">✅ user:2 deleted (tombstone processed). Partition size reduced ~60%.</text>
      </svg>
    </div>`;
}

function buildAmazon(container) {
  const tab = container.querySelector('#tab-amazon');
  tab.innerHTML = `
    <div class="scroll-content" style="max-width:920px;margin:0 auto">

      <!-- Hero -->
      <div style="background:#111827;border:1px solid #FF6900;border-radius:14px;padding:20px 24px;margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#64748B;margin-bottom:8px">Retention decisions</div>
        <div style="font-size:18px;font-weight:800;color:#F1F5F9;margin-bottom:4px">One size does not fit all — Amazon's 5 topics, 5 different retention policies</div>
        <div style="font-size:13px;color:#94A3B8">Retention and compaction are per-topic settings. Getting them wrong means paying for storage you don't need — or permanently losing data you can never recover.</div>
      </div>

      <!-- Retention table -->
      <div style="margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748B;margin-bottom:14px">Retention policy per topic — and why</div>
        <div style="overflow-x:auto;border-radius:10px;border:1px solid #1E293B">
          <table style="width:100%;border-collapse:collapse;font-size:12px;min-width:700px">
            <thead><tr style="background:#0F172A;border-bottom:1px solid #1E293B">
              <th style="padding:10px 14px;text-align:left;color:#64748B;font-size:10px;text-transform:uppercase;letter-spacing:.06em">Topic</th>
              <th style="padding:10px 14px;text-align:left;color:#64748B;font-size:10px;text-transform:uppercase;letter-spacing:.06em">Policy</th>
              <th style="padding:10px 14px;text-align:left;color:#64748B;font-size:10px;text-transform:uppercase;letter-spacing:.06em">Retention</th>
              <th style="padding:10px 14px;text-align:left;color:#64748B;font-size:10px;text-transform:uppercase;letter-spacing:.06em">Why</th>
            </tr></thead>
            <tbody>
              ${
                [
                  ['orders',           'delete',          '7 days',   '#FF6900', 'Orders archived to DynamoDB within seconds. 7-day window = replay buffer for crash recovery and reconciliation. Historical orders live in DynamoDB, not Kafka.'],
                  ['product-catalog',  'compact',         'forever',  '#3B82F6', 'Kafka becomes the system of record for current product data. Any service that restarts reads from offset 0 and gets the latest state of every SKU — no database bootstrap needed.'],
                  ['click-events',     'delete',          '24 hours', '#8B5CF6', 'ML model trains on last 24h only. Older clicks are statistically irrelevant. Volume is ~50GB/partition/day — expensive to retain. Cheap to drop.'],
                  ['customer-profiles','compact + delete', '30 days', '#10B981', 'Compaction keeps latest profile state. 30-day deletion = GDPR right-to-erasure. Tombstone (null value) + 30-day purge removes a customer permanently from Kafka.'],
                  ['shipping-events',  'delete',          '14 days',  '#F59E0B', 'Customers track packages up to 14 days after delivery. Shipping queries read Kafka directly. Beyond 14 days, data moves to S3 cold storage.'],
                ].map(([t,p,r,color,why]) => `
                <tr style="border-bottom:1px solid #0F172A">
                  <td style="padding:10px 14px;color:${color};font-family:monospace;font-size:11px">${t}</td>
                  <td style="padding:10px 14px"><span style="background:${color}22;color:${color};padding:3px 8px;border-radius:5px;font-size:10px;font-weight:700">${p}</span></td>
                  <td style="padding:10px 14px;color:#F1F5F9;font-weight:600">${r}</td>
                  <td style="padding:10px 14px;color:#94A3B8;font-size:11px;line-height:1.55">${why}</td>
                </tr>`).join('')
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Compaction example -->
      <div style="margin-bottom:28px">
        <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#64748B;margin-bottom:14px">Compaction in action — iPhone 15 Pro on product-catalog</div>
        <div style="background:#111827;border:1px solid #1E293B;border-radius:12px;padding:18px 22px">
          <div style="font-size:13px;color:#94A3B8;line-height:1.7;margin-bottom:14px">Key: <code style="background:#0A0E1A;color:#3B82F6;padding:2px 6px;border-radius:3px">B08N5WRWNW</code> (iPhone 15 Pro ASIN). Over 6 months, 47 price and stock updates were written to product-catalog. Before compaction, the partition holds all 47:</div>
          <div style="font-family:monospace;font-size:11px;color:#64748B;line-height:2;background:#0A0E1A;border-radius:8px;padding:14px;margin-bottom:14px">
            <div>off:0 &nbsp;&nbsp; key:B08N5WRWNW → {price:$1,199, stock:0, status:pre-order}</div>
            <div>off:1 &nbsp;&nbsp; key:B08N5WRWNW → {price:$1,199, stock:5000, status:available}</div>
            <div>off:18 &nbsp; key:B08N5WRWNW → {price:$1,099, stock:2300, status:available} &nbsp;<span style="color:#475569">← Prime Day discount</span></div>
            <div style="color:#475569">…43 more updates…</div>
            <div style="color:#3B82F6">off:46 &nbsp; key:B08N5WRWNW → {price:$999, stock:847, status:available} &nbsp;<span style="color:#3B82F6">← LATEST — kept after compaction</span></div>
          </div>
          <div style="padding:10px 14px;background:#3B82F611;border:1px solid #3B82F633;border-radius:8px;font-size:12px;color:#94A3B8;line-height:1.7">
            After compaction: <strong style="color:#3B82F6">1 record</strong> for B08N5WRWNW remains — offset 46, price $999. The 46 stale versions are gone. Partition size reduced ~98%. Any new microservice that starts and reads product-catalog from offset 0 gets the current price immediately — no separate database bootstrap.
          </div>
        </div>
      </div>

      <!-- GDPR tombstone -->
      <div style="background:#10B98112;border:1.5px solid #10B98133;border-radius:12px;padding:18px 22px">
        <div style="font-size:13px;font-weight:700;color:#10B981;margin-bottom:10px">GDPR right-to-erasure on customer-profiles (compact + delete)</div>
        <div style="font-size:12px;color:#94A3B8;line-height:1.7">
          Customer U-00123 submits a "delete my data" request. Amazon's GDPR service:<br><br>
          <strong style="color:#F1F5F9">Step 1:</strong> Produces a tombstone to customer-profiles — key: <code style="background:#0A0E1A;color:#10B981;padding:1px 5px;border-radius:3px">U-00123</code>, value: <code style="background:#0A0E1A;color:#EF4444;padding:1px 5px;border-radius:3px">null</code><br>
          <strong style="color:#F1F5F9">Step 2:</strong> The next compaction cycle removes all prior records for U-00123 and retains only the tombstone<br>
          <strong style="color:#F1F5F9">Step 3:</strong> After 30 days (retention.ms=2592000000), the tombstone itself is deleted by the retention cleanup<br>
          <strong style="color:#F1F5F9">Result:</strong> Zero records for U-00123 remain in Kafka after 30 days + one compaction cycle<br><br>
          This is why <code style="background:#0A0E1A;color:#F59E0B;padding:1px 5px;border-radius:3px">compact,delete</code> is the only policy that satisfies both "always have current state" (compact) and "data expires eventually for compliance" (delete).
        </div>
      </div>

    </div>`;
}
