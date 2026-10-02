import { createModuleShell, createIQSection } from '../components/module-shell.js';

export const IQ = [
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

  const c1 = buildRetention(container);
  const c2 = buildCompaction(container);
  buildAmazon(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
  return () => { c1 && c1(); c2 && c2(); };
}

function buildRetention(container) {
  const tab = container.querySelector('#tab-retention');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">A partition's log on disk is just a row of <b>segment files</b>. New records always append to the orange <b>active</b> segment; full segments are <b>sealed</b> (immutable). Press <b>Advance 1 Day</b> and watch the retention policy evict the oldest sealed segments — by <b>age</b> (time policy) or by <b>total size</b> (size policy). Toggle the policy to compare.</div>
      <canvas id="ret-canvas" width="820" height="320" style="width:100%;max-width:820px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="ret-day">⏩ Advance 1 Day</button>
        <button class="ctrl-btn" id="ret-mode">📏 Switch to Size-Based</button>
        <button class="ctrl-btn" id="ret-reset">🔄 Reset</button>
        <span class="ctrl-label" id="ret-status">Day 0 · time policy</span>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p><strong>Retention</strong> is Kafka's rule for how long data lives before it's deleted — and it's set <strong>per topic</strong>, applied <strong>per partition</strong>. There are two policies. <strong>Time-based</strong> (<code>log.retention.ms</code>, default 7 days) deletes a segment once the timestamp of its <em>last</em> record is older than the window. <strong>Size-based</strong> (<code>log.retention.bytes</code>) caps the total bytes per partition and deletes the oldest segments until the log fits. Both can be active at once — whichever triggers first wins.</p>
      <p>The crucial detail the animation makes visible: <strong>deletion happens at segment granularity, never per record</strong>. A record that "expired" an hour ago is <em>not</em> removed the moment it ages out — it stays on disk until the <em>entire segment</em> containing it is past the boundary. That's why the oldest segment is always evicted whole, and why a single huge active segment can hold data far older than your retention setting: the active segment is never eligible for cleanup until it rolls and seals.</p>
      <p>This is also why retention is <strong>decoupled from consumption</strong>. Kafka deletes by age or size, <em>not</em> by whether anyone has read the data. A slow consumer can fall behind the retention window and silently skip records that were deleted before it got to them — a classic production incident. Conversely, data you've already consumed stays on disk for the full window, which is exactly what makes replay possible.</p>
      <p><strong>Interview angle:</strong> the #1 gotcha is "retention is per partition, not per topic." A topic with 50 partitions and <code>retention.bytes=1GB</code> can use up to 50 GB. The #2 gotcha is the segment-granularity rule above. Mention <code>cleanup.policy=compact,delete</code> (next tab) as the production-safe setting for changelog topics that must both keep current state and eventually evict old data for compliance.</p>
    </div>`;

  const canvas = tab.querySelector('#ret-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  const RET_DAYS = 7, SIZE_CAP = 3.0;
  let mode = 'time', day = 0, nextId = 4;
  const fresh = () => ([
    { id: 0, size: 1.0, age: 6, sealed: true,  alpha: 1, dying: false },
    { id: 1, size: 1.0, age: 4, sealed: true,  alpha: 1, dying: false },
    { id: 2, size: 1.0, age: 2, sealed: true,  alpha: 1, dying: false },
    { id: 3, size: 0.4, age: 0, sealed: false, alpha: 1, dying: false },
  ]);
  let segs = fresh();
  let raf = null, lastT = 0;

  const liveTotal = () => segs.filter(s => !s.dying).reduce((a, s) => a + s.size, 0);

  function markDeletions() {
    if (mode === 'time') {
      segs.forEach(s => { if (s.sealed && s.age > RET_DAYS) s.dying = true; });
    } else {
      let guard = 0;
      while (liveTotal() > SIZE_CAP && guard++ < 30) {
        const oldest = segs.filter(s => !s.dying && s.sealed).sort((a, b) => b.age - a.age)[0];
        if (!oldest) break;
        oldest.dying = true;
      }
    }
  }

  function advanceDay() {
    day++;
    segs.forEach(s => s.age++);
    const active = segs.find(s => !s.sealed);
    if (active) {
      active.size = Math.min(1, active.size + 0.35);
      if (active.size >= 1) {
        active.sealed = true;
        segs.push({ id: nextId++, size: 0.2, age: 0, sealed: false, alpha: 1, dying: false });
      }
    }
    markDeletions();
  }

  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05); lastT = ts;
    segs.forEach(s => { if (s.dying) { s.alpha -= dt * 1.8; if (s.alpha < 0) s.alpha = 0; } });
    segs = segs.filter(s => !(s.dying && s.alpha <= 0));

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'left';
    ctx.font = 'bold 12px system-ui';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText('Partition 0 — /var/kafka/orders-0/', 30, 34);

    const total = liveTotal();
    ctx.font = '11px system-ui';
    const policyTxt = mode === 'time'
      ? `policy: retention.ms = ${RET_DAYS} days  ·  delete when a sealed segment's age > ${RET_DAYS}d`
      : `policy: retention.bytes = ${SIZE_CAP.toFixed(1)} GB/partition  ·  delete oldest when total > ${SIZE_CAP.toFixed(1)} GB`;
    ctx.fillStyle = '#64748B';
    ctx.fillText(policyTxt, 30, 52);
    ctx.fillStyle = (mode === 'size' && total > SIZE_CAP) ? '#EF4444' : '#10B981';
    ctx.fillText(`Total on disk: ${total.toFixed(1)} GB`, 640, 52);

    const BW = 150, GAP = 14, X0 = 30, Y = 76, H = 86;
    segs.forEach((s, i) => {
      const x = X0 + i * (BW + GAP);
      const over = mode === 'time' ? (s.age > RET_DAYS) : false;
      const col = s.dying ? '#EF4444' : (!s.sealed ? '#FF6900' : (over ? '#EF4444' : '#334155'));
      ctx.globalAlpha = s.alpha;

      // fill proportional to segment size
      ctx.fillStyle = '#131c2e';
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(x, Y, BW, H, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = col + '2e';
      ctx.fillRect(x + 2, Y + 2, (BW - 4) * s.size, H - 4);

      ctx.textAlign = 'center';
      ctx.font = 'bold 13px system-ui';
      ctx.fillStyle = s.dying ? '#EF4444' : (!s.sealed ? '#FF6900' : '#CBD5E1');
      ctx.fillText(`seg-${s.id}`, x + BW / 2, Y + 26);
      ctx.font = '11px system-ui';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText(`${s.size.toFixed(1)} GB · age ${s.age}d`, x + BW / 2, Y + 46);

      ctx.font = 'bold 10px system-ui';
      if (s.dying) { ctx.fillStyle = '#EF4444'; ctx.fillText('✖ EVICTED', x + BW / 2, Y + 68); }
      else if (!s.sealed) { ctx.fillStyle = '#FF6900'; ctx.fillText('▲ ACTIVE (writing)', x + BW / 2, Y + 68); }
      else { ctx.fillStyle = '#64748B'; ctx.fillText('sealed · immutable', x + BW / 2, Y + 68); }
      ctx.globalAlpha = 1;
    });

    // legend
    ctx.textAlign = 'left';
    ctx.font = '11px system-ui';
    const lg = [['#FF6900', 'active — new writes'], ['#334155', 'sealed — immutable'], ['#EF4444', 'evicted by retention']];
    let lx = 30;
    lg.forEach(([c, t]) => {
      ctx.fillStyle = c; ctx.fillRect(lx, 196, 12, 12);
      ctx.fillStyle = '#94A3B8'; ctx.fillText(t, lx + 18, 206);
      lx += ctx.measureText(t).width + 54;
    });
    ctx.fillStyle = '#475569';
    ctx.font = '10px system-ui';
    ctx.fillText('Deletion is per-segment, never per-record: a segment is evicted only once its whole span is past the boundary.', 30, 236);
    ctx.fillText('Each .log file ships with a sparse .index and .timeindex sibling (shown as the segment box).', 30, 252);

    const st = tab.querySelector('#ret-status');
    if (st) st.textContent = `Day ${day} · ${mode === 'time' ? 'time' : 'size'} policy · ${segs.filter(s => !s.dying).length} segments live`;

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });

  tab.querySelector('#ret-day').addEventListener('click', advanceDay);
  tab.querySelector('#ret-reset').addEventListener('click', () => { segs = fresh(); day = 0; nextId = 4; });
  tab.querySelector('#ret-mode').addEventListener('click', e => {
    mode = mode === 'time' ? 'size' : 'time';
    e.target.textContent = mode === 'time' ? '📏 Switch to Size-Based' : '⏱️ Switch to Time-Based';
    segs.forEach(s => { s.dying = false; s.alpha = 1; });
    markDeletions();
  });

  return () => { if (raf) cancelAnimationFrame(raf); };
}

function buildCompaction(container) {
  const tab = container.querySelector('#tab-compaction');
  tab.innerHTML = `
    <div class="canvas-wrap">
      <div class="canvas-caption">Compaction turns the log from a <b>history</b> into a <b>table</b>: for each key it keeps only the <b>latest</b> value, discarding superseded versions. A record with a <b>null value</b> is a <b>tombstone</b> — it marks a key for deletion. Press <b>Run Compaction</b> to watch stale versions disappear and the survivors slide together.</div>
      <canvas id="comp-canvas" width="820" height="300" style="width:100%;max-width:820px"></canvas>
      <div class="canvas-controls">
        <button class="ctrl-btn" id="comp-run">🗜️ Run Compaction</button>
        <button class="ctrl-btn" id="comp-reset">🔄 Reset Log</button>
        <span class="ctrl-label" id="comp-status">8 records · 4 distinct keys</span>
      </div>
    </div>
    <div class="canvas-explainer">
      <h3>What you're watching</h3>
      <p><strong>Log compaction</strong> (<code>cleanup.policy=compact</code>) retains the most recent value for every key and garbage-collects the older ones. The result is a <strong>changelog</strong>: replay it from offset 0 and you reconstruct the current state of every key, not its entire history. This is the "table" view of a stream — exactly what a Kafka Streams <code>KTable</code>, a CDC topic, or a config topic needs. Contrast with <code>delete</code> (previous tab), which keeps full history until it ages out.</p>
      <p>A <strong>tombstone</strong> is a record with a <code>null</code> value. It's how you delete a key from a compacted topic: produce <code>key → null</code>, and compaction removes every prior record for that key. The tombstone itself is retained for <code>delete.retention.ms</code> (default 24 h) so that consumers currently offline still see the deletion when they come back — then it too is purged. Here <code>user:2</code>'s tombstone supersedes Bob and Bobby; after compaction only the tombstone marker remains, briefly.</p>
      <p>Two things compaction does <strong>not</strong> do. It never touches the <strong>active segment</strong> (only sealed segments are compacted), so the newest records always survive regardless of key. And it doesn't run continuously — the log cleaner wakes when the ratio of "dirty" (uncompacted) bytes crosses <code>min.cleanable.dirty.ratio</code> (default 0.5), so you'll always see <em>some</em> duplicate keys in a live compacted topic. Offsets are preserved: notice the survivors keep their original offset numbers — compaction removes records but never renumbers them.</p>
      <p><strong>Interview angle:</strong> use compaction for current-state topics (product catalog, user profiles, KTable changelogs, <code>__consumer_offsets</code> itself). Do <em>not</em> use it for audit logs or event-sourcing streams where every event matters. For GDPR-style "keep current state but eventually purge everything," combine both: <code>cleanup.policy=compact,delete</code> — compaction keeps the latest profile, and the delete policy still evicts tombstoned keys and old data past <code>retention.ms</code>.</p>
    </div>`;

  const canvas = tab.querySelector('#comp-canvas');
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');

  const COLORS = { 'user:1': '#3B82F6', 'user:2': '#10B981', 'user:3': '#F59E0B', 'user:4': '#8B5CF6' };
  const fresh = () => ([
    { key: 'user:1', val: 'Alice',  off: 0, alpha: 1, dying: false },
    { key: 'user:2', val: 'Bob',    off: 1, alpha: 1, dying: false },
    { key: 'user:1', val: 'Alicia', off: 2, alpha: 1, dying: false },
    { key: 'user:3', val: 'Carol',  off: 3, alpha: 1, dying: false },
    { key: 'user:2', val: 'Bobby',  off: 4, alpha: 1, dying: false },
    { key: 'user:1', val: 'Ali',    off: 5, alpha: 1, dying: false },
    { key: 'user:2', val: 'null',   off: 6, alpha: 1, dying: false, tomb: true },
    { key: 'user:4', val: 'Dave',   off: 7, alpha: 1, dying: false },
  ]);
  let recs = fresh();
  let compacted = false;
  let raf = null, lastT = 0;

  function runCompaction() {
    if (compacted) return;
    compacted = true;
    const lastIdx = {};
    recs.forEach((r, i) => { lastIdx[r.key] = i; });
    recs.forEach((r, i) => { if (lastIdx[r.key] !== i) r.dying = true; });
  }

  function draw(ts) {
    const dt = Math.min((ts - lastT) / 1000, 0.05); lastT = ts;
    recs.forEach(r => { if (r.dying) { r.alpha -= dt * 2; if (r.alpha < 0) r.alpha = 0; } });
    recs = recs.filter(r => !(r.dying && r.alpha <= 0));

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0A0E1A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'left';
    ctx.font = 'bold 12px system-ui';
    ctx.fillStyle = '#94A3B8';
    ctx.fillText(compacted ? 'Compacted log — latest value per key (offsets preserved)' : 'Before compaction — full history, duplicate keys', 30, 34);

    const BW = 86, GAP = 8, X0 = 30, Y = 70, H = 96;
    recs.forEach((r, i) => {
      const x = X0 + i * (BW + GAP);
      const col = r.tomb ? '#EF4444' : COLORS[r.key];
      ctx.globalAlpha = r.alpha;
      ctx.fillStyle = col + '22';
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      if (r.tomb) ctx.setLineDash([5, 3]);
      ctx.beginPath(); ctx.roundRect(x, Y, BW, H, 8); ctx.fill(); ctx.stroke();
      ctx.setLineDash([]);

      ctx.textAlign = 'center';
      ctx.font = 'bold 12px system-ui';
      ctx.fillStyle = col;
      ctx.fillText(r.key, x + BW / 2, Y + 26);
      ctx.font = '12px system-ui';
      ctx.fillStyle = r.tomb ? '#EF4444' : '#E2E8F0';
      ctx.fillText(r.tomb ? 'null 🪦' : r.val, x + BW / 2, Y + 50);
      ctx.font = '10px system-ui';
      ctx.fillStyle = '#64748B';
      ctx.fillText(`offset ${r.off}`, x + BW / 2, Y + 72);
      if (r.dying) { ctx.fillStyle = '#EF4444'; ctx.font = 'bold 10px system-ui'; ctx.fillText('stale ✖', x + BW / 2, Y + 90); }
      else if (r.tomb) { ctx.fillStyle = '#EF4444'; ctx.font = 'bold 10px system-ui'; ctx.fillText('tombstone', x + BW / 2, Y + 90); }
      else { ctx.fillStyle = '#10B981'; ctx.font = 'bold 10px system-ui'; ctx.fillText('latest ✓', x + BW / 2, Y + 90); }
      ctx.globalAlpha = 1;
    });

    ctx.textAlign = 'left';
    ctx.font = '11px system-ui';
    ctx.fillStyle = '#64748B';
    if (compacted) {
      ctx.fillStyle = '#10B981';
      ctx.fillText('✅ 3 superseded versions removed. user:1 keeps only "Ali" (offset 5); user:2 reduced to its tombstone.', 30, 206);
      ctx.fillStyle = '#64748B';
      ctx.fillText('Any new consumer reading from offset 0 now gets current state directly — no database bootstrap needed.', 30, 224);
    } else {
      ctx.fillText('user:1 appears 3× (Alice → Alicia → Ali). user:2 appears 3× ending in a tombstone. Only the latest per key survives.', 30, 206);
      ctx.fillStyle = '#475569';
      ctx.fillText('Compaction runs on sealed segments only, when dirty-ratio crosses min.cleanable.dirty.ratio (default 0.5).', 30, 224);
    }

    const st = tab.querySelector('#comp-status');
    if (st) st.textContent = compacted
      ? `${recs.filter(r => !r.dying).length} records after compaction · 4 distinct keys`
      : `${recs.length} records · 4 distinct keys · ${recs.length - 4} to remove`;

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(ts => { lastT = ts; draw(ts); });

  tab.querySelector('#comp-run').addEventListener('click', runCompaction);
  tab.querySelector('#comp-reset').addEventListener('click', () => { recs = fresh(); compacted = false; });

  return () => { if (raf) cancelAnimationFrame(raf); };
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
