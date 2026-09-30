/* ============================================================
   Append Module
   Animated 8-step walkthrough of Iceberg's atomic fast-append:
   Kafka consumer writes 125k order rows into isolated S3 Parquet
   files, builds a manifest, and commits a new snapshot — zero
   existing data touched.
   ShopKart: real-time order streaming pipeline, 2026-08-01.
   ============================================================ */

(function () {
  'use strict';

  const IV = window.IcebergViz;

  /* ── Styles ─────────────────────────────────────────────── */
  function _injectStyles() {
    if (document.getElementById('ap-styles')) return;
    const s = document.createElement('style');
    s.id = 'ap-styles';
    s.textContent = `
.ap-page { display:flex; flex-direction:column; height:100%; overflow:hidden; }
.ap-outer { display:flex; flex:1; overflow:hidden; min-height:0; }
.ap-canvas {
  flex:1; display:flex; align-items:center; justify-content:center;
  padding:16px; background:var(--bg-1); overflow:hidden; position:relative;
}
.ap-sidebar {
  width:360px; border-left:1px solid var(--border-default);
  background:var(--bg-2); display:flex; flex-direction:column;
  overflow:hidden; flex-shrink:0;
}
.ap-sidebar-header {
  padding:14px 18px; border-bottom:1px solid var(--border-default); flex-shrink:0;
}
.ap-sidebar-title {
  font-size:var(--text-sm); font-weight:600; color:var(--text-primary); margin-bottom:4px;
}
.ap-sidebar-desc {
  font-size:var(--text-xs); color:var(--text-secondary); line-height:1.55; min-height:54px;
}
.ap-steps-list {
  flex:0 0 auto; overflow-y:auto; padding:6px 0;
  border-bottom:1px solid var(--border-default); max-height:260px;
}
.ap-step-item {
  display:flex; align-items:center; gap:10px;
  padding:7px 14px; cursor:pointer; transition:background .12s;
}
.ap-step-item:hover { background:var(--bg-3); }
.ap-step-item.active { background:rgba(74,174,255,.1); }
.ap-step-num {
  width:22px; height:22px; border-radius:50%;
  border:1.5px solid var(--border-default);
  display:flex; align-items:center; justify-content:center;
  font-size:10px; font-weight:700; color:var(--text-muted); flex-shrink:0;
}
.ap-step-item.active .ap-step-num { border-color:var(--blue); color:var(--blue); }
.ap-step-item.done .ap-step-num { background:var(--green); border-color:var(--green); color:#fff; font-size:0; }
.ap-step-item.done .ap-step-num::after { content:'✓'; font-size:10px; }
.ap-step-label { font-size:12px; color:var(--text-secondary); line-height:1.35; }
.ap-step-item.active .ap-step-label { color:var(--text-primary); font-weight:500; }
.ap-code-panel { flex:1; overflow:hidden; display:flex; flex-direction:column; }
.ap-code-block {
  flex:1; overflow-y:auto; padding:14px 16px;
  font-family:var(--font-mono); font-size:11.5px;
  color:var(--text-secondary); line-height:1.7; white-space:pre;
}
.ap-code-block .hi-kw  { color:var(--blue); }
.ap-code-block .hi-str { color:var(--green); }
.ap-code-block .hi-num { color:var(--orange); }
.ap-code-block .hi-cm  { color:var(--text-muted); font-style:italic; }
.ap-code-block .hi-fn  { color:#e8c07a; }
.ap-svg { width:100%; max-width:680px; height:420px; overflow:visible; }
`;
    document.head.appendChild(s);
  }

  /* ── Step definitions ────────────────────────────────────── */
  const STEPS = [
    {
      label: 'Kafka ingestion begins',
      desc: 'ShopKart\'s Kafka consumer reads 125,000 order events (offset 9821000→9946000). Iceberg opens an optimistic transaction — no table-level lock acquired. Existing data remains fully readable by concurrent queries.',
      code: `<span class="hi-cm">-- Spark streaming micro-batch, 2026-08-01 00:00</span>
<span class="hi-kw">INSERT INTO</span> shopkart.orders.events
<span class="hi-kw">SELECT</span> * <span class="hi-kw">FROM</span> kafka_stream
<span class="hi-kw">WHERE</span> topic = <span class="hi-str">'orders-v3'</span>
  <span class="hi-kw">AND</span> offset <span class="hi-kw">BETWEEN</span> <span class="hi-num">9821000</span> <span class="hi-kw">AND</span> <span class="hi-num">9946000</span>;

<span class="hi-cm">-- Iceberg: optimistic transaction opened
-- No lock held — readers unblocked
-- Previous snapshot still "current"</span>`,
    },
    {
      label: 'Write data files in parallel',
      desc: '3 Spark tasks write Parquet files independently to S3. Each writer is fully isolated — they don\'t know about each other. All files land in the same partition (event_date=2026-08-01).',
      code: `<span class="hi-cm">-- 3 parallel Spark task outputs</span>
<span class="hi-fn">task_0</span> → <span class="hi-str">s3://shopkart-lake/orders/events/
         event_date=2026-08-01/
         00000-0-orders-20260801-t0.parquet</span>
         <span class="hi-cm">(41,234 rows · 4.8 MB)</span>

<span class="hi-fn">task_1</span> → <span class="hi-str">s3://shopkart-lake/orders/events/
         event_date=2026-08-01/
         00001-1-orders-20260801-t1.parquet</span>
         <span class="hi-cm">(42,098 rows · 4.9 MB)</span>

<span class="hi-fn">task_2</span> → <span class="hi-str">s3://shopkart-lake/orders/events/
         event_date=2026-08-01/
         00002-2-orders-20260801-t2.parquet</span>
         <span class="hi-cm">(41,668 rows · 4.7 MB)</span>`,
    },
    {
      label: 'Compute per-file statistics',
      desc: 'The Iceberg writer computes column-level statistics for every data file: record_count, file_size, value_counts, null_value_counts, lower_bounds, upper_bounds. These power future predicate push-down.',
      code: `<span class="hi-cm">-- DataFile statistics computed for t0.parquet</span>
{
  <span class="hi-str">"record_count"</span>: <span class="hi-num">41234</span>,
  <span class="hi-str">"file_size_in_bytes"</span>: <span class="hi-num">4823100</span>,
  <span class="hi-str">"value_counts"</span>: {<span class="hi-num">1</span>: <span class="hi-num">41234</span>, <span class="hi-num">2</span>: <span class="hi-num">41234</span>},
  <span class="hi-str">"null_value_counts"</span>: {<span class="hi-num">1</span>: <span class="hi-num">0</span>, <span class="hi-num">2</span>: <span class="hi-num">14</span>},
  <span class="hi-str">"lower_bounds"</span>: {
    <span class="hi-num">1</span>: <span class="hi-str">"2026-08-01"</span>,
    <span class="hi-num">2</span>: <span class="hi-str">"ORD-00000001"</span>
  },
  <span class="hi-str">"upper_bounds"</span>: {
    <span class="hi-num">1</span>: <span class="hi-str">"2026-08-01"</span>,
    <span class="hi-num">2</span>: <span class="hi-str">"ORD-00041234"</span>
  }
}`,
    },
    {
      label: 'Build manifest entries',
      desc: 'One Avro manifest entry is created per data file. Each entry records: file path, format, partition, record count, and the per-column statistics. The entry status is ADDED (1).',
      code: `<span class="hi-cm">-- Avro manifest entry (one per Parquet file)</span>
{
  <span class="hi-str">"status"</span>: <span class="hi-num">1</span>,          <span class="hi-cm">// 1 = ADDED</span>
  <span class="hi-str">"snapshot_id"</span>: <span class="hi-num">9821443009</span>,
  <span class="hi-str">"sequence_number"</span>: <span class="hi-num">1048</span>,
  <span class="hi-str">"data_file"</span>: {
    <span class="hi-str">"file_path"</span>: <span class="hi-str">"s3://…/00000-0-orders-t0.parquet"</span>,
    <span class="hi-str">"file_format"</span>: <span class="hi-str">"PARQUET"</span>,
    <span class="hi-str">"partition"</span>: {<span class="hi-str">"event_date"</span>: <span class="hi-num">20666</span>},
    <span class="hi-str">"record_count"</span>: <span class="hi-num">41234</span>,
    <span class="hi-str">"file_size_in_bytes"</span>: <span class="hi-num">4823100</span>,
    <span class="hi-cm">/* … column_sizes, lower/upper bounds … */</span>
  }
}`,
    },
    {
      label: 'Write manifest file to S3',
      desc: 'All 3 manifest entries are collected into a single .avro manifest file. The manifest also stores partition-level summary statistics (contains_null, lower_bound, upper_bound) for fast manifest-level pruning.',
      code: `<span class="hi-cm">-- New manifest written to S3</span>
<span class="hi-str">s3://shopkart-lake/orders/.iceberg/metadata/
  manifests/
  snap-9821443009-0-m0.avro</span>

<span class="hi-cm">-- Manifest partition_summary (fast-skip field)</span>
{
  <span class="hi-str">"field_id"</span>: <span class="hi-num">1000</span>,
  <span class="hi-str">"contains_null"</span>: <span class="hi-kw">false</span>,
  <span class="hi-str">"lower_bound"</span>: <span class="hi-str">"2026-08-01"</span>,
  <span class="hi-str">"upper_bound"</span>: <span class="hi-str">"2026-08-01"</span>
}

<span class="hi-cm">-- 3 entries, all status=ADDED
-- Replaces nothing; pure addition</span>`,
    },
    {
      label: 'Create snapshot + manifest list',
      desc: 'A new snapshot object is created (id: 9821443009). The manifest list (.avro) references: the new manifest just written, PLUS all existing manifests from the parent snapshot. No manifest is removed.',
      code: `<span class="hi-cm">-- Snapshot object (serialised in metadata.json)</span>
{
  <span class="hi-str">"snapshot-id"</span>: <span class="hi-num">9821443009</span>,
  <span class="hi-str">"parent-snapshot-id"</span>: <span class="hi-num">9821443008</span>,
  <span class="hi-str">"sequence-number"</span>: <span class="hi-num">1048</span>,
  <span class="hi-str">"timestamp-ms"</span>: <span class="hi-num">1754054400000</span>,
  <span class="hi-str">"operation"</span>: <span class="hi-str">"append"</span>,
  <span class="hi-str">"manifest-list"</span>: <span class="hi-str">"s3://…/snap-9821443009-m.avro"</span>,
  <span class="hi-str">"summary"</span>: {
    <span class="hi-str">"added-data-files"</span>: <span class="hi-str">"3"</span>,
    <span class="hi-str">"added-records"</span>: <span class="hi-str">"125000"</span>,
    <span class="hi-str">"total-records"</span>: <span class="hi-str">"21483725000"</span>
  }
}`,
    },
    {
      label: 'Atomic CAS commit to catalog',
      desc: 'metadata.json is updated using compare-and-swap: only succeeds if current-snapshot-id still matches what the writer read. On success, the new snapshot is instantly visible to all readers.',
      code: `<span class="hi-cm">-- Atomic CAS write: metadata.json</span>
<span class="hi-cm">-- if current == 9821443008 → swap to 9821443009</span>
{
  <span class="hi-str">"format-version"</span>: <span class="hi-num">2</span>,
  <span class="hi-str">"current-snapshot-id"</span>: <span class="hi-num">9821443009</span>,
  <span class="hi-str">"last-sequence-number"</span>: <span class="hi-num">1048</span>,
  <span class="hi-str">"last-updated-ms"</span>: <span class="hi-num">1754054400012</span>,
  <span class="hi-str">"snapshots"</span>: [
    {<span class="hi-str">"snapshot-id"</span>: <span class="hi-num">9821443008</span>},
    {<span class="hi-str">"snapshot-id"</span>: <span class="hi-num">9821443009</span>} <span class="hi-cm">← new</span>
  ]
}
<span class="hi-cm">-- On CAS failure → retry with new snapshot-id
-- Lock held for only ~12 ms total</span>`,
    },
    {
      label: 'Append complete — zero data rewrite',
      desc: 'The append is durable and atomically visible. 125,000 new rows are queryable. Zero existing files were modified or deleted. Snapshot 9821443008 remains available for time travel. ShopKart now has 21.48 billion order rows.',
      code: `<span class="hi-cm">-- Append summary: ShopKart 2026-08-01 00:00</span>

Rows appended        : <span class="hi-num">125,000</span>
Parquet files written: <span class="hi-num">3</span>  (<span class="hi-num">14.4 MB</span>)
Manifests written    : <span class="hi-num">1</span>

Files rewritten      : <span class="hi-num">0</span>  <span class="hi-cm">← zero data churn</span>
Files deleted        : <span class="hi-num">0</span>  <span class="hi-cm">← old snapshots intact</span>
Lock held (ms)       : <span class="hi-num">12</span> <span class="hi-cm">← near-zero contention</span>

<span class="hi-cm">-- Snapshot chain</span>
snap <span class="hi-num">9821443008</span> (parent, readable via AS OF)
  └─ snap <span class="hi-num">9821443009</span> (current, 125k new rows)

<span class="hi-cm">-- Table total after append</span>
total-records: <span class="hi-num">21,483,725,000</span>  (<span class="hi-num">21.48B</span> rows)`,
    },
  ];

  /* ── SVG scenes ─────────────────────────────────────────── */
  function _scene(i) {
    const scenes = [
      /* 0 – Kafka ingestion */
      `<rect x="30" y="170" width="110" height="80" rx="8" fill="rgba(232,192,122,.08)" stroke="#e8c07a" stroke-width="1.5"/>
       <text x="85" y="203" text-anchor="middle" font-size="12" font-weight="700" fill="#e8c07a">Kafka</text>
       <text x="85" y="219" text-anchor="middle" font-size="10" fill="var(--text-secondary)">topic: orders-v3</text>
       <text x="85" y="233" text-anchor="middle" font-size="10" fill="var(--text-muted)">125k events</text>
       <path d="M140 210 L200 210" fill="none" stroke="#e8c07a" stroke-width="1.5" marker-end="url(#ap-ah)"/>
       <rect x="200" y="162" width="130" height="96" rx="8" fill="rgba(74,174,255,.07)" stroke="var(--blue)" stroke-width="1.5"/>
       <text x="265" y="198" text-anchor="middle" font-size="12" font-weight="700" fill="var(--blue)">Iceberg</text>
       <text x="265" y="214" text-anchor="middle" font-size="12" font-weight="700" fill="var(--blue)">Writer</text>
       <text x="265" y="235" text-anchor="middle" font-size="10" fill="var(--text-muted)">No lock acquired</text>
       <rect x="160" y="290" width="200" height="28" rx="6" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
       <text x="260" y="308" text-anchor="middle" font-size="10" fill="var(--text-muted)">Optimistic transaction open</text>
       <rect x="380" y="150" width="160" height="120" rx="8" fill="var(--bg-2)" stroke="var(--border-default)" stroke-width="1.5"/>
       <text x="460" y="178" text-anchor="middle" font-size="11" font-weight="600" fill="var(--text-secondary)">Current State</text>
       <text x="460" y="198" text-anchor="middle" font-size="10" fill="var(--text-muted)">snapshot 9821443008</text>
       <text x="460" y="214" text-anchor="middle" font-size="10" fill="var(--text-muted)">21.48 B rows</text>
       <text x="460" y="234" text-anchor="middle" font-size="10" fill="var(--green)">fully readable ✓</text>
       <text x="460" y="252" text-anchor="middle" font-size="10" fill="var(--text-muted)">(no contention)</text>`,

      /* 1 – 3 parallel writes */
      `<rect x="30" y="178" width="90" height="64" rx="6" fill="rgba(74,174,255,.07)" stroke="var(--blue)" stroke-width="1.5"/>
       <text x="75" y="207" text-anchor="middle" font-size="11" font-weight="700" fill="var(--blue)">Writer</text>
       <text x="75" y="223" text-anchor="middle" font-size="10" fill="var(--text-muted)">3 tasks</text>
       <path d="M120 200 L200 140" fill="none" stroke="var(--green)" stroke-width="1.5" marker-end="url(#ap-ah-g)"/>
       <path d="M120 210 L200 210" fill="none" stroke="var(--green)" stroke-width="1.5" marker-end="url(#ap-ah-g)"/>
       <path d="M120 220 L200 280" fill="none" stroke="var(--green)" stroke-width="1.5" marker-end="url(#ap-ah-g)"/>
       <rect x="200" y="106" width="220" height="58" rx="6" fill="rgba(63,185,80,.07)" stroke="var(--green)" stroke-width="1.5"/>
       <text x="310" y="130" text-anchor="middle" font-size="11" font-weight="600" fill="var(--green)">00000-0-orders-t0.parquet</text>
       <text x="310" y="148" text-anchor="middle" font-size="10" fill="var(--text-muted)">41,234 rows · 4.8 MB</text>
       <text x="310" y="160" text-anchor="middle" font-size="9.5" fill="var(--text-secondary)">event_date=2026-08-01</text>
       <rect x="200" y="178" width="220" height="58" rx="6" fill="rgba(63,185,80,.07)" stroke="var(--green)" stroke-width="1.5"/>
       <text x="310" y="202" text-anchor="middle" font-size="11" font-weight="600" fill="var(--green)">00001-1-orders-t1.parquet</text>
       <text x="310" y="220" text-anchor="middle" font-size="10" fill="var(--text-muted)">42,098 rows · 4.9 MB</text>
       <text x="310" y="232" text-anchor="middle" font-size="9.5" fill="var(--text-secondary)">event_date=2026-08-01</text>
       <rect x="200" y="248" width="220" height="58" rx="6" fill="rgba(63,185,80,.07)" stroke="var(--green)" stroke-width="1.5"/>
       <text x="310" y="272" text-anchor="middle" font-size="11" font-weight="600" fill="var(--green)">00002-2-orders-t2.parquet</text>
       <text x="310" y="290" text-anchor="middle" font-size="10" fill="var(--text-muted)">41,668 rows · 4.7 MB</text>
       <text x="310" y="302" text-anchor="middle" font-size="9.5" fill="var(--text-secondary)">event_date=2026-08-01</text>
       <text x="450" y="350" text-anchor="middle" font-size="11" fill="var(--text-muted)">→ S3 isolated prefix</text>`,

      /* 2 – Statistics */
      `<rect x="20" y="80" width="200" height="66" rx="6" fill="rgba(63,185,80,.06)" stroke="var(--green)" stroke-width="1.5"/>
       <text x="120" y="105" text-anchor="middle" font-size="11" font-weight="600" fill="var(--green)">orders-t0.parquet</text>
       <text x="120" y="121" text-anchor="middle" font-size="9.5" fill="var(--text-muted)">lower: 2026-08-01  upper: 2026-08-01</text>
       <text x="120" y="135" text-anchor="middle" font-size="9.5" fill="var(--text-muted)">null_counts: {amt: 14}</text>
       <rect x="20" y="170" width="200" height="66" rx="6" fill="rgba(63,185,80,.06)" stroke="var(--green)" stroke-width="1.5"/>
       <text x="120" y="195" text-anchor="middle" font-size="11" font-weight="600" fill="var(--green)">orders-t1.parquet</text>
       <text x="120" y="211" text-anchor="middle" font-size="9.5" fill="var(--text-muted)">lower: 2026-08-01  upper: 2026-08-01</text>
       <text x="120" y="225" text-anchor="middle" font-size="9.5" fill="var(--text-muted)">null_counts: {amt: 8}</text>
       <rect x="20" y="260" width="200" height="66" rx="6" fill="rgba(63,185,80,.06)" stroke="var(--green)" stroke-width="1.5"/>
       <text x="120" y="285" text-anchor="middle" font-size="11" font-weight="600" fill="var(--green)">orders-t2.parquet</text>
       <text x="120" y="301" text-anchor="middle" font-size="9.5" fill="var(--text-muted)">lower: 2026-08-01  upper: 2026-08-01</text>
       <text x="120" y="315" text-anchor="middle" font-size="9.5" fill="var(--text-muted)">null_counts: {amt: 11}</text>
       <rect x="290" y="160" width="200" height="100" rx="8" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1.5"/>
       <text x="390" y="185" text-anchor="middle" font-size="12" font-weight="700" fill="var(--blue)">Column Statistics</text>
       <text x="390" y="204" text-anchor="middle" font-size="10" fill="var(--text-secondary)">Enables predicate push-down</text>
       <text x="390" y="220" text-anchor="middle" font-size="10" fill="var(--text-secondary)">Future queries skip files</text>
       <text x="390" y="238" text-anchor="middle" font-size="10" fill="var(--text-muted)">without reading Parquet</text>`,

      /* 3 – Manifest entries */
      `<rect x="20" y="90" width="140" height="44" rx="5" fill="rgba(63,185,80,.06)" stroke="var(--green)" stroke-width="1.5"/>
       <text x="90" y="116" text-anchor="middle" font-size="10.5" fill="var(--green)">orders-t0.parquet</text>
       <rect x="20" y="188" width="140" height="44" rx="5" fill="rgba(63,185,80,.06)" stroke="var(--green)" stroke-width="1.5"/>
       <text x="90" y="214" text-anchor="middle" font-size="10.5" fill="var(--green)">orders-t1.parquet</text>
       <rect x="20" y="286" width="140" height="44" rx="5" fill="rgba(63,185,80,.06)" stroke="var(--green)" stroke-width="1.5"/>
       <text x="90" y="312" text-anchor="middle" font-size="10.5" fill="var(--green)">orders-t2.parquet</text>
       <path d="M160 112 L280 112" fill="none" stroke="var(--blue)" stroke-width="1.5" marker-end="url(#ap-ah-b)"/>
       <path d="M160 210 L280 210" fill="none" stroke="var(--blue)" stroke-width="1.5" marker-end="url(#ap-ah-b)"/>
       <path d="M160 308 L280 308" fill="none" stroke="var(--blue)" stroke-width="1.5" marker-end="url(#ap-ah-b)"/>
       <rect x="280" y="86" width="210" height="52" rx="5" fill="rgba(74,174,255,.07)" stroke="var(--blue)" stroke-width="1.5"/>
       <text x="385" y="110" text-anchor="middle" font-size="11" font-weight="600" fill="var(--blue)">ManifestEntry</text>
       <text x="385" y="126" text-anchor="middle" font-size="9.5" fill="var(--text-muted)">status=ADDED · snap_id=9821443009</text>
       <rect x="280" y="184" width="210" height="52" rx="5" fill="rgba(74,174,255,.07)" stroke="var(--blue)" stroke-width="1.5"/>
       <text x="385" y="208" text-anchor="middle" font-size="11" font-weight="600" fill="var(--blue)">ManifestEntry</text>
       <text x="385" y="224" text-anchor="middle" font-size="9.5" fill="var(--text-muted)">status=ADDED · snap_id=9821443009</text>
       <rect x="280" y="282" width="210" height="52" rx="5" fill="rgba(74,174,255,.07)" stroke="var(--blue)" stroke-width="1.5"/>
       <text x="385" y="306" text-anchor="middle" font-size="11" font-weight="600" fill="var(--blue)">ManifestEntry</text>
       <text x="385" y="322" text-anchor="middle" font-size="9.5" fill="var(--text-muted)">status=ADDED · snap_id=9821443009</text>`,

      /* 4 – Manifest file */
      `<rect x="20" y="100" width="150" height="32" rx="4" fill="rgba(74,174,255,.07)" stroke="var(--blue)" stroke-width="1"/>
       <text x="95" y="121" text-anchor="middle" font-size="10" fill="var(--blue)">3 × ManifestEntry (Avro)</text>
       <path d="M170 116 L290 210" fill="none" stroke="var(--blue)" stroke-width="1.5" marker-end="url(#ap-ah-b)"/>
       <rect x="290" y="160" width="260" height="120" rx="8" fill="rgba(74,174,255,.07)" stroke="var(--blue)" stroke-width="2"/>
       <text x="420" y="188" text-anchor="middle" font-size="12" font-weight="700" fill="var(--blue)">snap-9821443009-0-m0.avro</text>
       <text x="420" y="208" text-anchor="middle" font-size="10" fill="var(--text-secondary)">partition_summary:</text>
       <text x="420" y="224" text-anchor="middle" font-size="10" fill="var(--text-secondary)">  lower: 2026-08-01 · upper: 2026-08-01</text>
       <text x="420" y="240" text-anchor="middle" font-size="10" fill="var(--text-secondary)">  contains_null: false</text>
       <text x="420" y="256" text-anchor="middle" font-size="10" fill="var(--text-muted)">  3 entries</text>
       <rect x="60" y="310" width="520" height="30" rx="5" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
       <text x="320" y="329" text-anchor="middle" font-family="var(--font-mono)" font-size="9.5" fill="var(--text-muted)">s3://shopkart-lake/orders/.iceberg/metadata/manifests/</text>`,

      /* 5 – Snapshot + manifest list */
      `<rect x="20" y="160" width="170" height="100" rx="8" fill="rgba(163,113,247,.05)" stroke="var(--purple)" stroke-width="1.5" stroke-dasharray="4,2"/>
       <text x="105" y="190" text-anchor="middle" font-size="12" font-weight="600" fill="var(--text-muted)">Snapshot (parent)</text>
       <text x="105" y="208" text-anchor="middle" font-size="10" fill="var(--text-muted)">id: 9821443008</text>
       <text x="105" y="224" text-anchor="middle" font-size="10" fill="var(--text-muted)">still readable</text>
       <text x="105" y="240" text-anchor="middle" font-size="10" fill="var(--green)">time travel ✓</text>
       <path d="M190 210 L280 210" fill="none" stroke="var(--purple)" stroke-width="1.5" marker-end="url(#ap-ah-p)"/>
       <rect x="280" y="130" width="220" height="160" rx="8" fill="rgba(163,113,247,.07)" stroke="var(--purple)" stroke-width="2"/>
       <text x="390" y="158" text-anchor="middle" font-size="12" font-weight="700" fill="var(--purple)">New Snapshot</text>
       <text x="390" y="178" text-anchor="middle" font-size="10" fill="var(--text-secondary)">id: 9821443009</text>
       <text x="390" y="196" text-anchor="middle" font-size="10" fill="var(--text-secondary)">operation: append</text>
       <text x="390" y="212" text-anchor="middle" font-size="10" fill="var(--text-secondary)">added-data-files: 3</text>
       <text x="390" y="228" text-anchor="middle" font-size="10" fill="var(--text-secondary)">added-records: 125,000</text>
       <text x="390" y="244" text-anchor="middle" font-size="10" fill="var(--text-secondary)">parent: 9821443008</text>
       <text x="390" y="270" text-anchor="middle" font-size="10" fill="var(--text-muted)">manifest-list → 2 manifests</text>`,

      /* 6 – Atomic CAS commit */
      `<rect x="150" y="80" width="320" height="240" rx="10" fill="rgba(74,174,255,.06)" stroke="var(--blue)" stroke-width="2"/>
       <text x="310" y="112" text-anchor="middle" font-size="13" font-weight="700" fill="var(--blue)">metadata.json</text>
       <text x="310" y="134" text-anchor="middle" font-size="11" fill="var(--text-secondary)">Atomic CAS write</text>
       <rect x="172" y="148" width="276" height="28" rx="4" fill="rgba(74,174,255,.15)"/>
       <text x="310" y="167" text-anchor="middle" font-size="10" font-family="var(--font-mono)" fill="var(--blue)">"current-snapshot-id": 9821443009</text>
       <text x="310" y="200" text-anchor="middle" font-size="10" fill="var(--text-secondary)">previous: 9821443008</text>
       <text x="310" y="218" text-anchor="middle" font-size="10" fill="var(--text-secondary)">last-sequence-number: 1048</text>
       <text x="310" y="236" text-anchor="middle" font-size="10" fill="var(--text-secondary)">last-updated-ms: 1754054400012</text>
       <text x="310" y="270" text-anchor="middle" font-size="10" fill="var(--text-muted)">All readers see new data instantly</text>
       <rect x="30" y="165" width="100" height="60" rx="6" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
       <text x="80" y="188" text-anchor="middle" font-size="10" font-weight="600" fill="var(--green)">Concurrent</text>
       <text x="80" y="204" text-anchor="middle" font-size="10" font-weight="600" fill="var(--green)">readers</text>
       <text x="80" y="218" text-anchor="middle" font-size="9.5" fill="var(--text-muted)">unblocked ✓</text>
       <path d="M130 195 L150 195" fill="none" stroke="var(--green)" stroke-width="1.5" marker-end="url(#ap-ah-g)"/>`,

      /* 7 – Complete */
      `<rect x="40" y="30" width="580" height="52" rx="8" fill="rgba(63,185,80,.1)" stroke="var(--green)" stroke-width="1.5"/>
       <text x="330" y="53" text-anchor="middle" font-size="14" font-weight="700" fill="var(--green)">Fast Append Complete</text>
       <text x="330" y="72" text-anchor="middle" font-size="11" fill="var(--text-secondary)">125,000 rows atomically visible · 0 files rewritten · 12 ms lock</text>
       <rect x="40" y="112" width="128" height="90" rx="8" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
       <text x="104" y="148" text-anchor="middle" font-size="26" font-weight="700" fill="var(--green)">3</text>
       <text x="104" y="168" text-anchor="middle" font-size="10" fill="var(--text-muted)">files written</text>
       <text x="104" y="184" text-anchor="middle" font-size="9.5" fill="var(--text-muted)">14.4 MB total</text>
       <rect x="186" y="112" width="128" height="90" rx="8" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
       <text x="250" y="148" text-anchor="middle" font-size="26" font-weight="700" fill="var(--blue)">0</text>
       <text x="250" y="168" text-anchor="middle" font-size="10" fill="var(--text-muted)">files rewritten</text>
       <text x="250" y="184" text-anchor="middle" font-size="9.5" fill="var(--text-muted)">zero data churn</text>
       <rect x="332" y="112" width="128" height="90" rx="8" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
       <text x="396" y="148" text-anchor="middle" font-size="22" font-weight="700" fill="var(--purple)">12ms</text>
       <text x="396" y="168" text-anchor="middle" font-size="10" fill="var(--text-muted)">lock held</text>
       <text x="396" y="184" text-anchor="middle" font-size="9.5" fill="var(--text-muted)">near-zero contention</text>
       <rect x="478" y="112" width="128" height="90" rx="8" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
       <text x="542" y="148" text-anchor="middle" font-size="22" font-weight="700" fill="var(--orange)">21.48B</text>
       <text x="542" y="168" text-anchor="middle" font-size="10" fill="var(--text-muted)">total rows</text>
       <text x="542" y="184" text-anchor="middle" font-size="9.5" fill="var(--text-muted)">after append</text>
       <rect x="40" y="230" width="580" height="56" rx="8" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
       <text x="140" y="252" text-anchor="middle" font-size="10" fill="var(--text-muted)">snapshot</text>
       <text x="140" y="270" text-anchor="middle" font-family="var(--font-mono)" font-size="10" fill="var(--text-secondary)">9821443008</text>
       <path d="M190 260 L280 260" fill="none" stroke="var(--green)" stroke-width="2" marker-end="url(#ap-ah-g)"/>
       <text x="380" y="252" text-anchor="middle" font-size="10" fill="var(--green)" font-weight="600">snapshot (current)</text>
       <text x="380" y="270" text-anchor="middle" font-family="var(--font-mono)" font-size="10" fill="var(--green)">9821443009</text>`,
    ];
    return scenes[Math.min(i, scenes.length - 1)];
  }

  /* ── Render ──────────────────────────────────────────────── */
  let _engine = null;

  function _render(container) {
    _injectStyles();

    _engine = new IV.AnimationEngine({
      steps: STEPS.map((s, i) => ({
        label: s.label,
        description: s.desc,
        duration: 1800,
        enter(ctx) {
          const si = i;
          const el = ctx.el;
          const t = el.querySelector('#ap-step-title');
          const d = el.querySelector('#ap-step-desc');
          const c = el.querySelector('#ap-code-content');
          const sv = el.querySelector('#ap-svg-scene');
          if (t) t.textContent = STEPS[si].label;
          if (d) d.textContent = STEPS[si].desc;
          if (c) c.innerHTML = STEPS[si].code;
          if (sv) sv.innerHTML = _scene(si);
          el.querySelectorAll('.ap-step-item').forEach((el2, j) => {
            el2.classList.toggle('active', j === si);
            el2.classList.toggle('done', j < si);
          });
        },
      })),
    });

    container.innerHTML = `
<div class="ap-page">
  <div class="ap-outer">
    <div class="ap-canvas">
      <svg class="ap-svg" viewBox="0 0 680 420" aria-hidden="true">
        <defs>
          <marker id="ap-ah" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <polygon points="0 0,7 3.5,0 7" fill="#e8c07a" opacity=".8"/>
          </marker>
          <marker id="ap-ah-g" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <polygon points="0 0,7 3.5,0 7" fill="var(--green)" opacity=".8"/>
          </marker>
          <marker id="ap-ah-b" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <polygon points="0 0,7 3.5,0 7" fill="var(--blue)" opacity=".8"/>
          </marker>
          <marker id="ap-ah-p" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <polygon points="0 0,7 3.5,0 7" fill="var(--purple)" opacity=".8"/>
          </marker>
        </defs>
        <g id="ap-svg-scene">${_scene(0)}</g>
      </svg>
    </div>
    <div class="ap-sidebar">
      <div class="ap-sidebar-header">
        <div class="ap-sidebar-title" id="ap-step-title">${STEPS[0].label}</div>
        <div class="ap-sidebar-desc" id="ap-step-desc">${STEPS[0].desc}</div>
      </div>
      <div class="ap-steps-list">
        ${STEPS.map((s, i) => `
          <div class="ap-step-item${i === 0 ? ' active' : ''}" data-step="${i}">
            <div class="ap-step-num">${i + 1}</div>
            <div class="ap-step-label">${s.label}</div>
          </div>`).join('')}
      </div>
      <div class="ap-code-panel">
        <div class="ap-code-block" id="ap-code-content">${STEPS[0].code}</div>
      </div>
    </div>
  </div>
</div>`;

    _engine.setContext({ el: container });

    container.querySelectorAll('.ap-step-item').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });

    IV.AnimationControls.register(_engine);
  }

  IV.modules['append'] = {
    id: 'append',
    title: 'Append',
    group: 'write-ops',
    render: _render,
    destroy() { if (_engine) { _engine.destroy(); _engine = null; } IV.AnimationControls.hide(); },
  };
})();
