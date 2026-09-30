import { createModuleShell, createIQSection } from '../components/module-shell.js';

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M08 · Governance',
    title: 'Medallion Architecture',
    subtitle: 'Bronze → Silver → Gold: incremental refinement at Amazon\'s data lake',
    tabs: [
      { id: 'layers',   label: '🥇 The Three Zones' },
      { id: 'why',      label: '🧭 Why Layering' },
      { id: 'pipeline', label: '📦 Amazon Pipeline' },
      { id: 'iq',       label: '🎯 Interview Q&A' },
    ]
  });

  /* ── Tab 1: The Three Zones ─────────────────────────────────────────────── */
  container.querySelector('#tab-layers').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Bronze → Silver → Gold</div>
        <div class="section-desc">Data quality increases as it flows downstream — each zone has a distinct contract, schema strategy, and consumer</div>
      </div>
      <div class="stats-row">
        <div class="stat-box"><div class="stat-val">Raw</div><div class="stat-label">Bronze fidelity</div></div>
        <div class="stat-box"><div class="stat-val">Clean</div><div class="stat-label">Silver conformance</div></div>
        <div class="stat-box"><div class="stat-val">Curated</div><div class="stat-label">Gold aggregates</div></div>
        <div class="stat-box"><div class="stat-val">1 source</div><div class="stat-label">Reprocess from Bronze</div></div>
      </div>

      <div style="margin-top:26px;display:flex;flex-direction:column;gap:14px;max-width:820px">
        ${[
          {
            name:'🥉 BRONZE', color:'var(--amber)',
            tagline:'Raw ingestion — the landing zone',
            points:[
              'Append-only. Data lands exactly as it arrives from Kafka, Auto Loader, CDC feeds, or file drops — no cleansing, no dedup.',
              'Schema-on-read: store the raw payload (JSON/Avro/CSV) plus ingestion metadata. Tolerates upstream schema drift.',
              'Keep source fidelity: original columns, malformed rows, late data — all preserved so nothing is lost.',
              'Add lineage columns: _ingest_timestamp, _source_file, _batch_id. Retention is effectively infinite (~$23/TB/mo on S3).'
            ]
          },
          {
            name:'🥈 SILVER', color:'var(--blue)',
            tagline:'Cleansed, conformed, enriched',
            points:[
              'Schema-on-write: enforce types, null constraints, and column contracts. Bad rows are quarantined, not silently dropped.',
              'Deduplication + type casting: strings → timestamps/decimals, dropDuplicates on business keys keeping the latest version.',
              'Joins & enrichment: attach dimension data (customer, product), standardize enums, normalize units and currencies.',
              'Delta MERGE for upserts / CDC: idempotent apply of inserts, updates, and deletes keyed on the business key.'
            ]
          },
          {
            name:'🥇 GOLD', color:'var(--green)',
            tagline:'Business-level, BI-ready',
            points:[
              'Pre-aggregated metrics and star schemas (fact + dimension tables) modeled for specific business questions.',
              'Optimized for Photon / SQL Warehouse: partitioned, Z-ordered / liquid-clustered, OPTIMIZE-compacted for fast scans.',
              'Consumed by dashboards, ML feature tables, and executive reporting — no further transformation at query time.',
              'Small, denormalized, and heavily read — the layer where SLAs and query latency actually matter.'
            ]
          }
        ].map(z => `
          <div style="background:var(--bg2);border-radius:12px;padding:18px 20px;border-left:5px solid ${z.color}">
            <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:10px">
              <div style="font-size:15px;font-weight:900;color:${z.color};letter-spacing:.5px">${z.name}</div>
              <div style="font-size:12px;color:var(--text2)">${z.tagline}</div>
            </div>
            <ul style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px">
              ${z.points.map(p => `<li style="font-size:12.5px;color:var(--text2);line-height:1.6">${p}</li>`).join('')}
            </ul>
          </div>`).join('')}
      </div>

      <div class="section-header" style="margin-top:32px;margin-bottom:16px">
        <div class="section-title">Zone contract at a glance</div>
        <div class="section-desc">The same record, three different contracts</div>
      </div>
      <div class="compare-table-wrap" style="padding:0">
        <table class="compare-table">
          <thead>
            <tr><th>Dimension</th><th>Bronze</th><th>Silver</th><th>Gold</th></tr>
          </thead>
          <tbody>
            <tr><td>Purpose</td><td>Raw capture / replay</td><td>Clean, conform, enrich</td><td>Aggregate for consumption</td></tr>
            <tr><td>Schema strategy</td><td class="tag-warn">Schema-on-read</td><td class="tag-good">Schema-on-write</td><td class="tag-good">Modeled (star)</td></tr>
            <tr><td>Write pattern</td><td>Append-only</td><td>MERGE / upsert</td><td>Overwrite / incremental</td></tr>
            <tr><td>Dedup / cleansing</td><td class="tag-bad">None</td><td class="tag-good">Full</td><td class="tag-good">Inherited</td></tr>
            <tr><td>Primary consumer</td><td>Data engineers</td><td>Analysts / ML</td><td>BI / executives</td></tr>
            <tr><td>Retention</td><td>~Infinite</td><td>Medium-long</td><td>Rolling / snapshot</td></tr>
            <tr><td>Typical grain</td><td>Event / raw row</td><td>Deduped entity</td><td>Aggregated / daily</td></tr>
          </tbody>
        </table>
      </div>
    </div>`;

  /* ── Tab 2: Why Layering ────────────────────────────────────────────────── */
  container.querySelector('#tab-why').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Why the layering exists</div>
        <div class="section-desc">The medallion pattern is not bureaucracy — each boundary buys a concrete engineering property</div>
      </div>
      <div class="info-grid" style="padding:0">
        <div class="info-card">
          <div class="info-card-icon">🔁</div>
          <div class="info-card-title">Reprocessability</div>
          <div class="info-card-body">Bronze is a durable replay buffer. If a Silver transformation had a bug, you fix the code and re-run it against Bronze — no re-pull from Kafka or upstream databases (which may have already aged out old data).</div>
          <div class="info-card-tag">Replay from source of truth</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🧱</div>
          <div class="info-card-title">Isolation of quality</div>
          <div class="info-card-body">A quality problem stays contained in its zone. Malformed rows sit in Bronze; a failed dedup shows up in Silver. Downstream Gold consumers are never exposed to raw mess, so dashboards don't break on a bad upstream record.</div>
          <div class="info-card-tag">Blast-radius control</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">📈</div>
          <div class="info-card-title">Incremental refinement</div>
          <div class="info-card-body">Each hop does one job well: capture, then clean, then aggregate. Small composable stages are easier to test, restart, and reason about than one monolithic ingest-to-dashboard job.</div>
          <div class="info-card-tag">Composable stages</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🏛️</div>
          <div class="info-card-title">Audit & compliance</div>
          <div class="info-card-body">Regulators often require the original, unmodified record. Bronze retains it verbatim while Silver/Gold carry the business-usable version — you can always prove what actually arrived.</div>
          <div class="info-card-tag">Original record preserved</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">👥</div>
          <div class="info-card-title">Clear ownership</div>
          <div class="info-card-body">Ingestion teams own Bronze contracts; data engineers own Silver conformance; analytics engineers own Gold models. The zone boundary is also a team boundary and a schema contract.</div>
          <div class="info-card-tag">Contract per boundary</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">⚡</div>
          <div class="info-card-title">Cost & performance tiering</div>
          <div class="info-card-body">Bronze is cheap cold storage optimized for write throughput; Gold is small, compacted, and Z-ordered for sub-second Photon reads. You pay for performance only where queries actually run.</div>
          <div class="info-card-tag">Right-size each tier</div>
        </div>
      </div>

      <div style="margin-top:26px;background:var(--bg2);border-radius:10px;padding:18px 20px;max-width:760px">
        <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:8px">The counterfactual: no layering</div>
        <div class="prose" style="max-width:none">
          <p>A single job that reads Kafka and writes BI tables directly seems simpler — until the first bug. Now you cannot reprocess (the raw events are gone from Kafka's retention window), you cannot audit (the original payload was transformed in-flight), and every schema change upstream breaks the dashboard because there is no buffer between capture and consumption. The medallion layers exist to break exactly these couplings.</p>
        </div>
      </div>
      <div class="tip">Rule of thumb: <strong>Bronze is immutable history, Silver is the truth, Gold is the answer.</strong> If a table serves two of these roles, split it.</div>
    </div>`;

  /* ── Tab 3: Amazon Pipeline (worked example) ────────────────────────────── */
  container.querySelector('#tab-pipeline').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Worked example — an Amazon order pipeline</div>
        <div class="section-desc">Follow one order event as it is refined through Bronze → Silver → Gold</div>
      </div>

      <div style="display:flex;flex-direction:column;gap:14px;max-width:820px">
        <div style="background:var(--bg2);border-radius:10px;padding:16px 18px;border-left:4px solid var(--amber)">
          <div style="font-size:13px;font-weight:800;color:var(--amber);margin-bottom:6px">🥉 bronze.orders_raw</div>
          <div style="font-size:12px;color:var(--text2);line-height:1.7">Auto Loader streams order events off Kinesis into an append-only Delta table. The raw JSON is stored verbatim alongside ingestion metadata. Duplicates from at-least-once delivery are <em>expected</em> and kept here.</div>
          <div class="code-block"><span class="cmt">-- append-only landing, raw payload + lineage</span>
<span class="kw">CREATE TABLE</span> bronze.orders_raw (
  raw_json      <span class="kw">STRING</span>,      <span class="cmt">-- original event, untouched</span>
  _ingest_ts    <span class="kw">TIMESTAMP</span>,
  _source_file  <span class="kw">STRING</span>,
  _batch_id     <span class="kw">STRING</span>
) <span class="kw">USING</span> DELTA;</div>
        </div>

        <div style="text-align:center;color:var(--text3);font-size:18px">↓ parse · cast · dedup · MERGE</div>

        <div style="background:var(--bg2);border-radius:10px;padding:16px 18px;border-left:4px solid var(--blue)">
          <div style="font-size:13px;font-weight:800;color:var(--blue);margin-bottom:6px">🥈 silver.orders</div>
          <div style="font-size:12px;color:var(--text2);line-height:1.7">Parse the JSON into typed columns, cast <code style="background:var(--bg3);padding:1px 5px;border-radius:4px">order_ts</code> to TIMESTAMP and <code style="background:var(--bg3);padding:1px 5px;border-radius:4px">amount</code> to DECIMAL, deduplicate within the batch on <code style="background:var(--bg3);padding:1px 5px;border-radius:4px">order_id</code> keeping the latest <code style="background:var(--bg3);padding:1px 5px;border-radius:4px">updated_at</code>, then MERGE so re-runs are idempotent. One clean row per order.</div>
          <div class="code-block"><span class="cmt">-- 1) dedup source batch BEFORE the merge (Delta MERGE</span>
<span class="cmt">--    requires at most one source row per key)</span>
<span class="kw">WITH</span> batch <span class="kw">AS</span> (
  <span class="kw">SELECT</span> * <span class="kw">FROM</span> (
    <span class="kw">SELECT</span> *, row_number() <span class="kw">OVER</span> (
      <span class="kw">PARTITION BY</span> order_id <span class="kw">ORDER BY</span> updated_at <span class="kw">DESC</span>) <span class="kw">AS</span> rn
    <span class="kw">FROM</span> parsed_bronze)
  <span class="kw">WHERE</span> rn = <span class="num">1</span>)

<span class="cmt">-- 2) idempotent upsert into Silver</span>
<span class="kw">MERGE INTO</span> silver.orders <span class="kw">AS</span> t
<span class="kw">USING</span> batch <span class="kw">AS</span> s
  <span class="kw">ON</span> t.order_id = s.order_id
<span class="kw">WHEN MATCHED AND</span> s.updated_at &gt; t.updated_at <span class="kw">THEN</span>
  <span class="kw">UPDATE SET</span> *
<span class="kw">WHEN NOT MATCHED THEN</span>
  <span class="kw">INSERT</span> *;</div>
        </div>

        <div style="text-align:center;color:var(--text3);font-size:18px">↓ join dims · aggregate · model</div>

        <div style="background:var(--bg2);border-radius:10px;padding:16px 18px;border-left:4px solid var(--green)">
          <div style="font-size:13px;font-weight:800;color:var(--green);margin-bottom:6px">🥇 gold.daily_revenue</div>
          <div style="font-size:12px;color:var(--text2);line-height:1.7">Join Silver orders to the product and customer dimensions, aggregate to a business grain (revenue by day × category), and write a compact star-schema fact that Photon and the SQL Warehouse serve to the exec dashboard directly.</div>
          <div class="code-block"><span class="cmt">-- business-level aggregate, BI-ready</span>
<span class="kw">CREATE OR REPLACE TABLE</span> gold.daily_revenue <span class="kw">AS</span>
<span class="kw">SELECT</span>
  o.order_date,
  p.category,
  <span class="kw">COUNT</span>(<span class="kw">DISTINCT</span> o.order_id) <span class="kw">AS</span> orders,
  <span class="kw">SUM</span>(o.amount)               <span class="kw">AS</span> revenue,
  <span class="kw">SUM</span>(o.amount) / <span class="kw">COUNT</span>(<span class="kw">DISTINCT</span> o.order_id) <span class="kw">AS</span> aov
<span class="kw">FROM</span> silver.orders o
<span class="kw">JOIN</span> silver.products p <span class="kw">ON</span> o.product_id = p.product_id
<span class="kw">WHERE</span> o.status = <span class="str">'COMPLETED'</span>
<span class="kw">GROUP BY</span> o.order_date, p.category;</div>
        </div>
      </div>

      <div class="section-header" style="margin-top:30px;margin-bottom:16px">
        <div class="section-title">What each hop changes</div>
        <div class="section-desc">The same order_id, refined step by step</div>
      </div>
      <div class="config-grid">
        <div class="config-card">
          <div class="config-name">bronze.orders_raw</div>
          <div class="config-val">order_id "A-100" appears 3×</div>
          <div class="config-desc">At-least-once delivery duplicates the event. Amount is still a string "49.99", status arrives out of order.</div>
          <div class="config-impact impact-low">Fidelity preserved</div>
        </div>
        <div class="config-card">
          <div class="config-name">silver.orders</div>
          <div class="config-val">order_id "A-100" → 1 row</div>
          <div class="config-desc">Deduped to the latest version, amount cast to DECIMAL(10,2), joined to customer. Clean, typed, one row per order.</div>
          <div class="config-impact impact-medium">Conformed truth</div>
        </div>
        <div class="config-card">
          <div class="config-name">gold.daily_revenue</div>
          <div class="config-val">1 row per (date, category)</div>
          <div class="config-desc">order_id no longer exists as a column — it has been aggregated into revenue and AOV metrics for the dashboard.</div>
          <div class="config-impact impact-high">BI answer</div>
        </div>
      </div>
      <div class="tip">Notice the MERGE lives at the <strong>Bronze → Silver</strong> boundary, never at Gold. Gold is derived deterministically from Silver, so it can always be rebuilt — which is exactly why the medallion pattern makes recovery cheap.</div>
    </div>`;

  /* ── Tab 4: Interview Q&A (preserved verbatim + one added) ──────────────── */
  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'Why keep Bronze data if it\'s raw and messy?',
      a: 'Bronze is your source of truth and your replay buffer. Three reasons: (1) Reprocessing — if a Silver transformation had a bug, you can re-run it against Bronze without re-ingesting from the source system; (2) Audit — regulators may require the original, unmodified record; (3) Schema evolution — Bronze tolerates changing upstream schemas by storing raw JSON/Avro; Silver handles the transformation logic centrally. Deleting Bronze forces you to re-pull from upstream (Kafka, databases) which may not be possible for old data. Cost argument: Delta Lake on S3 stores Bronze at ~$23/TB/month — cheap enough to retain forever.'
    },
    {
      q: 'How do you prevent duplicate records when writing to Silver with Delta MERGE?',
      a: 'Use MERGE INTO silver_orders USING bronze_batch ON silver_orders.order_id = bronze_batch.order_id WHEN MATCHED AND bronze_batch.updated_at > silver_orders.updated_at THEN UPDATE SET ... WHEN NOT MATCHED THEN INSERT ... The MERGE is idempotent: re-running with the same Bronze batch produces the same Silver state. Key considerations: (1) deduplicate within the batch first (dropDuplicates on order_id, keeping latest updated_at) before the MERGE — Delta MERGE doesn\'t handle duplicates within the source; (2) set spark.databricks.delta.merge.enableLowShuffle.merge=true for large tables to reduce shuffle cost.'
    },
    {
      q: 'Where does schema-on-read stop and schema-on-write begin in the medallion pattern?',
      a: 'Bronze is schema-on-read: you store the raw payload (often a single JSON/Avro STRING column plus ingestion metadata) and defer interpretation, so an upstream schema change never fails ingestion — the new fields just land inside the raw blob. The transition happens at the Bronze → Silver boundary: Silver is schema-on-write, where you parse, enforce types and null constraints, and reject or quarantine rows that violate the contract. This split is deliberate — it keeps ingestion resilient to drift (Bronze never breaks) while giving every downstream consumer a stable, typed contract (Silver never lies). Gold then builds modeled star schemas on top of that clean Silver contract. Practically: if a producer adds a column, Bronze keeps flowing and you evolve the Silver parse logic on your own schedule, reprocessing from Bronze if you want the new field backfilled.'
    },
  ]);
}
