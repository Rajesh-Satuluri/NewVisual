/* ============================================================
   Catalog Explorer Module
   Interactive 7-step animated tour of the 4 Iceberg catalog types:
   REST, AWS Glue, Apache Hive Metastore, and Hadoop FileSystem.
   Shows configuration, namespace hierarchy, and ShopKart's
   multi-catalog production setup.
   ============================================================ */

(function () {
  'use strict';

  const IV = window.IcebergViz;

  /* ── Styles ─────────────────────────────────────────────── */
  function _injectStyles() {
    if (document.getElementById('ce-styles')) return;
    const s = document.createElement('style');
    s.id = 'ce-styles';
    s.textContent = `
.ce-page { display:flex; flex-direction:column; height:100%; overflow:hidden; }
.ce-outer { display:flex; flex:1; overflow:hidden; min-height:0; }
.ce-canvas {
  flex:1; display:flex; align-items:center; justify-content:center;
  padding:16px; background:var(--bg-1); overflow:hidden; position:relative;
}
.ce-sidebar {
  width:360px; border-left:1px solid var(--border-default);
  background:var(--bg-2); display:flex; flex-direction:column;
  overflow:hidden; flex-shrink:0;
}
.ce-sidebar-header { padding:14px 18px; border-bottom:1px solid var(--border-default); flex-shrink:0; }
.ce-sidebar-title { font-size:var(--text-sm); font-weight:600; color:var(--text-primary); margin-bottom:4px; }
.ce-sidebar-desc { font-size:var(--text-xs); color:var(--text-secondary); line-height:1.55; min-height:54px; }
.ce-steps-list {
  flex:0 0 auto; overflow-y:auto; padding:6px 0;
  border-bottom:1px solid var(--border-default); max-height:240px;
}
.ce-step-item {
  display:flex; align-items:center; gap:10px;
  padding:7px 14px; cursor:pointer; transition:background .12s;
}
.ce-step-item:hover { background:var(--bg-3); }
.ce-step-item.active { background:rgba(74,174,255,.1); }
.ce-step-num {
  width:22px; height:22px; border-radius:50%; border:1.5px solid var(--border-default);
  display:flex; align-items:center; justify-content:center;
  font-size:10px; font-weight:700; color:var(--text-muted); flex-shrink:0;
}
.ce-step-item.active .ce-step-num { border-color:var(--blue); color:var(--blue); }
.ce-step-item.done .ce-step-num { background:var(--green); border-color:var(--green); color:#fff; font-size:0; }
.ce-step-item.done .ce-step-num::after { content:'✓'; font-size:10px; }
.ce-step-label { font-size:12px; color:var(--text-secondary); line-height:1.35; }
.ce-step-item.active .ce-step-label { color:var(--text-primary); font-weight:500; }
.ce-code-panel { flex:1; overflow:hidden; display:flex; flex-direction:column; }
.ce-code-block {
  flex:1; overflow-y:auto; padding:14px 16px;
  font-family:var(--font-mono); font-size:11.5px;
  color:var(--text-secondary); line-height:1.7; white-space:pre;
}
.ce-code-block .hi-kw  { color:var(--blue); }
.ce-code-block .hi-str { color:var(--green); }
.ce-code-block .hi-num { color:var(--orange); }
.ce-code-block .hi-cm  { color:var(--text-muted); font-style:italic; }
.ce-code-block .hi-fn  { color:#e8c07a; }
.ce-svg { width:100%; max-width:680px; height:420px; overflow:visible; }
`;
    document.head.appendChild(s);
  }

  /* ── Steps ───────────────────────────────────────────────── */
  const STEPS = [
    {
      label: 'What is a Catalog?',
      desc: 'The Iceberg catalog is the single source of truth for table locations. It maps table names to metadata file paths. Query engines ask the catalog where a table\'s current metadata.json lives; the catalog never stores data itself.',
      code: `<span class="hi-cm">-- The catalog resolves: name → metadata path</span>
<span class="hi-cm">-- Query engine workflow:</span>

<span class="hi-num">1</span>. Engine asks catalog:
   <span class="hi-str">"WHERE is shopkart.orders.events?"</span>

<span class="hi-num">2</span>. Catalog returns:
   <span class="hi-str">"s3://shopkart-lake/orders/events/
    metadata/v00042.metadata.json"</span>

<span class="hi-num">3</span>. Engine reads metadata.json
   → reads manifest list → manifests
   → selects data files → executes query

<span class="hi-cm">-- The catalog is NOT in the data path
-- It only stores the pointer to metadata</span>`,
    },
    {
      label: 'REST Catalog',
      desc: 'The REST catalog (Iceberg REST spec v1) exposes a standardised HTTP API. Any client implementing the spec can talk to it. ShopKart uses a REST catalog backed by a managed service (Polaris/Nessie) for the main lakehouse.',
      code: `<span class="hi-cm">-- SparkSession config for REST Catalog</span>
spark.sql.catalog.shopkart = \
  org.apache.iceberg.spark.SparkCatalog
spark.sql.catalog.shopkart.type = <span class="hi-str">rest</span>
spark.sql.catalog.shopkart.uri = \
  <span class="hi-str">https://catalog.shopkart.internal/iceberg/v1</span>
spark.sql.catalog.shopkart.credential = \
  <span class="hi-str">client_id:client_secret</span>
spark.sql.catalog.shopkart.warehouse = \
  <span class="hi-str">s3://shopkart-lake</span>

<span class="hi-cm">-- REST endpoints (Iceberg REST Catalog spec)</span>
GET  /v1/namespaces
GET  /v1/namespaces/{ns}/tables/{table}
POST /v1/namespaces/{ns}/tables
POST /v1/namespaces/{ns}/tables/{table}/metrics`,
    },
    {
      label: 'AWS Glue Catalog',
      desc: 'AWS Glue stores Iceberg table metadata in its Data Catalog. Each Glue database becomes an Iceberg namespace; each Glue table entry stores the metadata location property. Ideal for AWS-native stacks with IAM auth.',
      code: `<span class="hi-cm">-- SparkSession config for AWS Glue</span>
spark.sql.catalog.glue = \
  org.apache.iceberg.spark.SparkCatalog
spark.sql.catalog.glue.catalog-impl = \
  org.apache.iceberg.aws.glue.GlueCatalog
spark.sql.catalog.glue.warehouse = \
  <span class="hi-str">s3://shopkart-lake</span>
spark.sql.catalog.glue.io-impl = \
  org.apache.iceberg.aws.s3.S3FileIO

<span class="hi-cm">-- Glue stores metadata_location property:</span>
{
  <span class="hi-str">"metadata_location"</span>:
    <span class="hi-str">"s3://shopkart-lake/orders/events/
     metadata/v00042.metadata.json"</span>,
  <span class="hi-str">"table_type"</span>: <span class="hi-str">"ICEBERG"</span>
}`,
    },
    {
      label: 'Apache Hive Metastore',
      desc: 'The Hive Metastore (HMS) is the legacy-compatible catalog. Iceberg stores the current metadata location as a table property in HMS. Works with existing Hive tooling; Thrift protocol; widely supported across all engines.',
      code: `<span class="hi-cm">-- SparkSession config for Hive Metastore</span>
spark.sql.catalog.hive = \
  org.apache.iceberg.spark.SparkCatalog
spark.sql.catalog.hive.type = <span class="hi-str">hive</span>
spark.sql.catalog.hive.uri = \
  <span class="hi-str">thrift://hms.shopkart.internal:9083</span>
spark.sql.catalog.hive.warehouse = \
  <span class="hi-str">s3://shopkart-lake</span>

<span class="hi-cm">-- HMS stores metadata_location as table param:
   TBLPROPERTIES (
     'metadata_location' = 's3://…/v42.json',
     'table_type'        = 'ICEBERG',
     'engine.hive.enabled' = 'true'
   )</span>

<span class="hi-cm">-- HadoopTableOperations provides Thrift client</span>`,
    },
    {
      label: 'Hadoop FileSystem Catalog',
      desc: 'The simplest catalog — metadata lives at a well-known path in the filesystem (S3, HDFS, GCS). No external service required. The catalog is the path itself. Used in development, unit tests, and simple single-cluster setups.',
      code: `<span class="hi-cm">-- SparkSession config for Hadoop Catalog</span>
spark.sql.catalog.hadoop = \
  org.apache.iceberg.spark.SparkCatalog
spark.sql.catalog.hadoop.type = <span class="hi-str">hadoop</span>
spark.sql.catalog.hadoop.warehouse = \
  <span class="hi-str">s3://shopkart-dev-lake</span>

<span class="hi-cm">-- Table path is deterministic:
   {warehouse}/{namespace}/{table}/
   metadata/current → metadata.json

   Example:
   s3://shopkart-dev-lake/
     default/orders/metadata/
     current → v00001.metadata.json</span>

<span class="hi-cm">-- No external service — filesystem IS catalog
-- ⚠ Not recommended for production (no auth)</span>`,
    },
    {
      label: 'ShopKart multi-catalog setup',
      desc: 'ShopKart runs 3 catalogs simultaneously: REST (production lakehouse), Glue (AWS-native analytics), Hive (legacy ETL jobs). Each engine points to the right catalog via its session config. Tables are not duplicated — data is shared.',
      code: `<span class="hi-cm">-- ShopKart production: 3 catalogs</span>
<span class="hi-cm">-- REST catalog (main lakehouse)</span>
spark.sql.catalog.shopkart.type = <span class="hi-str">rest</span>
spark.sql.catalog.shopkart.uri  = \
  <span class="hi-str">https://catalog.shopkart.internal/v1</span>

<span class="hi-cm">-- Glue catalog (Athena / Redshift Spectrum)</span>
spark.sql.catalog.awscat.catalog-impl = \
  org.apache.iceberg.aws.glue.GlueCatalog

<span class="hi-cm">-- Hive catalog (legacy Spark 2 ETL jobs)</span>
spark.sql.catalog.legacy.type = <span class="hi-str">hive</span>
spark.sql.catalog.legacy.uri  = \
  <span class="hi-str">thrift://hms.shopkart.internal:9083</span>

<span class="hi-cm">-- All 3 catalogs point to same S3 data
-- Catalog is just a name resolver</span>`,
    },
    {
      label: 'Namespace → Database → Table',
      desc: 'Iceberg organises tables in a two-level hierarchy: namespace (= database) → table. The catalog is the root. ShopKart has namespaces: orders, customers, products, analytics, streaming. Tables live within each namespace.',
      code: `<span class="hi-cm">-- ShopKart catalog namespace hierarchy</span>
shopkart (catalog)
├── orders (namespace)
│   ├── events          <span class="hi-cm">← 21 B rows, 8 TB/day</span>
│   ├── order_items
│   └── returns
├── customers (namespace)
│   ├── profiles        <span class="hi-cm">← 50 M rows</span>
│   ├── segments
│   └── churn_labels
├── products (namespace)
│   ├── catalog         <span class="hi-cm">← 2 M SKUs</span>
│   └── pricing_history
├── analytics (namespace)
│   └── daily_summary
└── streaming (namespace)
    └── order_events    <span class="hi-cm">← Flink CDC target</span>

<span class="hi-cm">-- SHOW NAMESPACES IN shopkart;
-- SHOW TABLES IN shopkart.orders;</span>`,
    },
  ];

  /* ── SVG scenes ─────────────────────────────────────────── */
  function _scene(i) {
    const scenes = [
      /* 0 – Catalog as resolver */
      `<rect x="260" y="30" width="160" height="60" rx="8" fill="rgba(74,174,255,.07)" stroke="var(--blue)" stroke-width="2"/>
       <text x="340" y="56" text-anchor="middle" font-size="12" font-weight="700" fill="var(--blue)">Catalog</text>
       <text x="340" y="76" text-anchor="middle" font-size="10" fill="var(--text-muted)">name → metadata path</text>
       <rect x="60" y="160" width="140" height="52" rx="8" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1.5"/>
       <text x="130" y="183" text-anchor="middle" font-size="11" font-weight="600" fill="var(--text-secondary)">Spark</text>
       <text x="130" y="199" text-anchor="middle" font-size="10" fill="var(--text-muted)">query engine</text>
       <rect x="240" y="160" width="200" height="52" rx="8" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1.5"/>
       <text x="340" y="183" text-anchor="middle" font-size="11" font-weight="600" fill="var(--text-secondary)">Trino / Flink</text>
       <text x="340" y="199" text-anchor="middle" font-size="10" fill="var(--text-muted)">any catalog-aware engine</text>
       <rect x="460" y="160" width="140" height="52" rx="8" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1.5"/>
       <text x="530" y="183" text-anchor="middle" font-size="11" font-weight="600" fill="var(--text-secondary)">PyIceberg</text>
       <text x="530" y="199" text-anchor="middle" font-size="10" fill="var(--text-muted)">Python client</text>
       <path d="M130 160 L310 90" fill="none" stroke="var(--blue)" stroke-width="1.5" stroke-dasharray="4,2" marker-end="url(#ce-ah-b)"/>
       <path d="M340 160 L340 90" fill="none" stroke="var(--blue)" stroke-width="1.5" stroke-dasharray="4,2" marker-end="url(#ce-ah-b)"/>
       <path d="M530 160 L370 90" fill="none" stroke="var(--blue)" stroke-width="1.5" stroke-dasharray="4,2" marker-end="url(#ce-ah-b)"/>
       <rect x="160" y="300" width="360" height="52" rx="8" fill="rgba(63,185,80,.07)" stroke="var(--green)" stroke-width="1.5"/>
       <text x="340" y="323" text-anchor="middle" font-size="11" font-weight="600" fill="var(--green)">s3://shopkart-lake/…/metadata.json</text>
       <text x="340" y="340" text-anchor="middle" font-size="10" fill="var(--text-muted)">catalog returns this pointer to the engine</text>
       <path d="M340 90 L340 300" fill="none" stroke="var(--green)" stroke-width="1.5" marker-end="url(#ce-ah-g)"/>`,

      /* 1 – REST Catalog */
      `<rect x="220" y="20" width="220" height="68" rx="8" fill="rgba(74,174,255,.08)" stroke="var(--blue)" stroke-width="2"/>
       <text x="330" y="46" text-anchor="middle" font-size="12" font-weight="700" fill="var(--blue)">REST Catalog</text>
       <text x="330" y="64" text-anchor="middle" font-size="10" fill="var(--text-muted)">Iceberg Open API spec v1</text>
       <text x="330" y="78" text-anchor="middle" font-size="9.5" fill="var(--text-muted)">https://catalog.shopkart.internal/v1</text>
       <rect x="60" y="160" width="140" height="52" rx="6" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
       <text x="130" y="186" text-anchor="middle" font-size="10.5" font-weight="600" fill="var(--text-secondary)">Spark / Trino</text>
       <text x="130" y="202" text-anchor="middle" font-size="9.5" fill="var(--text-muted)">REST catalog client</text>
       <path d="M200 186 L300 180" fill="none" stroke="var(--blue)" stroke-width="1.5" marker-end="url(#ce-ah-b)"/>
       <rect x="300" y="140" width="280" height="130" rx="8" fill="rgba(74,174,255,.06)" stroke="var(--blue)" stroke-width="1.5"/>
       <text x="440" y="168" text-anchor="middle" font-size="10.5" font-weight="700" fill="var(--blue)">HTTP Endpoints</text>
       <text x="440" y="188" text-anchor="middle" font-family="var(--font-mono)" font-size="9.5" fill="var(--text-secondary)">GET  /v1/namespaces</text>
       <text x="440" y="204" text-anchor="middle" font-family="var(--font-mono)" font-size="9.5" fill="var(--text-secondary)">GET  /v1/namespaces/{ns}/tables/{t}</text>
       <text x="440" y="220" text-anchor="middle" font-family="var(--font-mono)" font-size="9.5" fill="var(--text-secondary)">POST /v1/namespaces/{ns}/tables</text>
       <text x="440" y="236" text-anchor="middle" font-family="var(--font-mono)" font-size="9.5" fill="var(--text-secondary)">POST …/{t}/metrics</text>
       <text x="440" y="254" text-anchor="middle" font-size="9.5" fill="var(--text-muted)">Auth: OAuth2 / Bearer token</text>
       <rect x="200" y="340" width="260" height="38" rx="6" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
       <text x="330" y="358" text-anchor="middle" font-size="10" fill="var(--text-secondary)">✓ Multi-engine · ✓ Fine-grained auth</text>
       <text x="330" y="372" text-anchor="middle" font-size="10" fill="var(--text-secondary)">✓ Nessie / Polaris / custom backend</text>`,

      /* 2 – Glue Catalog */
      `<rect x="220" y="20" width="220" height="68" rx="8" fill="rgba(232,192,122,.08)" stroke="#e8c07a" stroke-width="2"/>
       <text x="330" y="46" text-anchor="middle" font-size="12" font-weight="700" fill="#e8c07a">AWS Glue Catalog</text>
       <text x="330" y="64" text-anchor="middle" font-size="10" fill="var(--text-muted)">Data Catalog · IAM auth</text>
       <text x="330" y="78" text-anchor="middle" font-size="9.5" fill="var(--text-muted)">region: us-east-1</text>
       <rect x="60" y="160" width="140" height="52" rx="6" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
       <text x="130" y="186" text-anchor="middle" font-size="10.5" font-weight="600" fill="var(--text-secondary)">Spark / Athena</text>
       <text x="130" y="202" text-anchor="middle" font-size="9.5" fill="var(--text-muted)">GlueCatalog impl</text>
       <path d="M200 186 L300 140" fill="none" stroke="#e8c07a" stroke-width="1.5" marker-end="url(#ce-ah-o)"/>
       <rect x="300" y="130" width="290" height="150" rx="8" fill="rgba(232,192,122,.06)" stroke="#e8c07a" stroke-width="1.5"/>
       <text x="445" y="158" text-anchor="middle" font-size="11" font-weight="700" fill="#e8c07a">Glue Data Catalog</text>
       <text x="445" y="178" text-anchor="middle" font-size="10" fill="var(--text-secondary)">Database = Iceberg namespace</text>
       <text x="445" y="196" text-anchor="middle" font-size="10" fill="var(--text-secondary)">Table entry stores:</text>
       <text x="445" y="214" text-anchor="middle" font-family="var(--font-mono)" font-size="9.5" fill="var(--text-muted)">"metadata_location": "s3://…"</text>
       <text x="445" y="230" text-anchor="middle" font-family="var(--font-mono)" font-size="9.5" fill="var(--text-muted)">"table_type": "ICEBERG"</text>
       <text x="445" y="254" text-anchor="middle" font-size="9.5" fill="var(--text-muted)">Auth via IAM role / assume-role</text>
       <rect x="200" y="340" width="260" height="38" rx="6" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
       <text x="330" y="358" text-anchor="middle" font-size="10" fill="var(--text-secondary)">✓ Athena/Redshift Spectrum native</text>
       <text x="330" y="372" text-anchor="middle" font-size="10" fill="var(--text-secondary)">✓ IAM access control  ⚠ AWS-only</text>`,

      /* 3 – Hive Metastore */
      `<rect x="220" y="20" width="220" height="68" rx="8" fill="rgba(163,113,247,.08)" stroke="var(--purple)" stroke-width="2"/>
       <text x="330" y="46" text-anchor="middle" font-size="12" font-weight="700" fill="var(--purple)">Hive Metastore</text>
       <text x="330" y="64" text-anchor="middle" font-size="10" fill="var(--text-muted)">HMS · Thrift protocol</text>
       <text x="330" y="78" text-anchor="middle" font-size="9.5" fill="var(--text-muted)">thrift://hms.shopkart:9083</text>
       <rect x="60" y="160" width="140" height="52" rx="6" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
       <text x="130" y="186" text-anchor="middle" font-size="10.5" font-weight="600" fill="var(--text-secondary)">Spark legacy ETL</text>
       <text x="130" y="202" text-anchor="middle" font-size="9.5" fill="var(--text-muted)">HiveCatalog impl</text>
       <path d="M200 186 L300 148" fill="none" stroke="var(--purple)" stroke-width="1.5" marker-end="url(#ce-ah-p)"/>
       <rect x="300" y="130" width="290" height="150" rx="8" fill="rgba(163,113,247,.06)" stroke="var(--purple)" stroke-width="1.5"/>
       <text x="445" y="158" text-anchor="middle" font-size="11" font-weight="700" fill="var(--purple)">HMS ThriftServer</text>
       <text x="445" y="178" text-anchor="middle" font-size="10" fill="var(--text-secondary)">Backed by MySQL / Postgres</text>
       <text x="445" y="196" text-anchor="middle" font-size="10" fill="var(--text-secondary)">Table TBLPROPERTIES:</text>
       <text x="445" y="214" text-anchor="middle" font-family="var(--font-mono)" font-size="9.5" fill="var(--text-muted)">'metadata_location' = 's3://…'</text>
       <text x="445" y="230" text-anchor="middle" font-family="var(--font-mono)" font-size="9.5" fill="var(--text-muted)">'table_type'        = 'ICEBERG'</text>
       <text x="445" y="254" text-anchor="middle" font-size="9.5" fill="var(--text-muted)">Compatible with Hive 2/3 clients</text>
       <rect x="200" y="340" width="260" height="38" rx="6" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
       <text x="330" y="358" text-anchor="middle" font-size="10" fill="var(--text-secondary)">✓ Legacy Hive tool compat</text>
       <text x="330" y="372" text-anchor="middle" font-size="10" fill="var(--text-secondary)">✓ Kerberos auth  ⚠ Thrift is older API</text>`,

      /* 4 – Hadoop Catalog */
      `<rect x="220" y="20" width="220" height="68" rx="8" fill="rgba(63,185,80,.08)" stroke="var(--green)" stroke-width="2"/>
       <text x="330" y="46" text-anchor="middle" font-size="12" font-weight="700" fill="var(--green)">Hadoop FileSystem</text>
       <text x="330" y="64" text-anchor="middle" font-size="10" fill="var(--text-muted)">No external service</text>
       <text x="330" y="78" text-anchor="middle" font-size="9.5" fill="var(--text-muted)">warehouse = s3://shopkart-dev-lake</text>
       <rect x="300" y="140" width="290" height="150" rx="8" fill="rgba(63,185,80,.05)" stroke="var(--green)" stroke-width="1.5"/>
       <text x="445" y="168" text-anchor="middle" font-size="11" font-weight="700" fill="var(--green)">Path = Catalog</text>
       <text x="445" y="188" text-anchor="middle" font-size="10" fill="var(--text-secondary)">{warehouse}/{ns}/{table}/</text>
       <text x="445" y="206" text-anchor="middle" font-size="10" fill="var(--text-secondary)">metadata/current</text>
       <text x="445" y="228" text-anchor="middle" font-family="var(--font-mono)" font-size="9.5" fill="var(--text-muted)">s3://shopkart-dev-lake/</text>
       <text x="445" y="244" text-anchor="middle" font-family="var(--font-mono)" font-size="9.5" fill="var(--text-muted)">  default/orders/</text>
       <text x="445" y="260" text-anchor="middle" font-family="var(--font-mono)" font-size="9.5" fill="var(--text-muted)">  metadata/current</text>
       <text x="445" y="278" text-anchor="middle" font-size="9.5" fill="var(--text-muted)">→ v00001.metadata.json</text>
       <rect x="120" y="340" width="420" height="38" rx="6" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
       <text x="330" y="358" text-anchor="middle" font-size="10" fill="var(--text-secondary)">✓ Zero setup · ✓ Great for dev/test</text>
       <text x="330" y="372" text-anchor="middle" font-size="10" fill="var(--text-secondary)">⚠ No auth · ⚠ No concurrent commit protection</text>`,

      /* 5 – Multi-catalog */
      `<rect x="220" y="20" width="240" height="52" rx="8" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1.5"/>
       <text x="340" y="42" text-anchor="middle" font-size="11" font-weight="700" fill="var(--text-primary)">ShopKart Multi-Catalog</text>
       <text x="340" y="60" text-anchor="middle" font-size="10" fill="var(--text-muted)">3 catalogs, 1 data lake</text>
       <rect x="30" y="130" width="170" height="90" rx="8" fill="rgba(74,174,255,.07)" stroke="var(--blue)" stroke-width="1.5"/>
       <text x="115" y="155" text-anchor="middle" font-size="11" font-weight="700" fill="var(--blue)">REST (main)</text>
       <text x="115" y="173" text-anchor="middle" font-size="9.5" fill="var(--text-secondary)">Spark + Trino</text>
       <text x="115" y="189" text-anchor="middle" font-size="9.5" fill="var(--text-secondary)">production lakehouse</text>
       <text x="115" y="207" text-anchor="middle" font-size="9.5" fill="var(--text-muted)">catalog: shopkart</text>
       <rect x="255" y="130" width="170" height="90" rx="8" fill="rgba(232,192,122,.07)" stroke="#e8c07a" stroke-width="1.5"/>
       <text x="340" y="155" text-anchor="middle" font-size="11" font-weight="700" fill="#e8c07a">AWS Glue</text>
       <text x="340" y="173" text-anchor="middle" font-size="9.5" fill="var(--text-secondary)">Athena · Redshift</text>
       <text x="340" y="189" text-anchor="middle" font-size="9.5" fill="var(--text-secondary)">analytics SQL</text>
       <text x="340" y="207" text-anchor="middle" font-size="9.5" fill="var(--text-muted)">catalog: awscat</text>
       <rect x="480" y="130" width="170" height="90" rx="8" fill="rgba(163,113,247,.07)" stroke="var(--purple)" stroke-width="1.5"/>
       <text x="565" y="155" text-anchor="middle" font-size="11" font-weight="700" fill="var(--purple)">Hive HMS</text>
       <text x="565" y="173" text-anchor="middle" font-size="9.5" fill="var(--text-secondary)">Legacy ETL</text>
       <text x="565" y="189" text-anchor="middle" font-size="9.5" fill="var(--text-secondary)">Spark 2 jobs</text>
       <text x="565" y="207" text-anchor="middle" font-size="9.5" fill="var(--text-muted)">catalog: legacy</text>
       <path d="M115 220 L300 320" fill="none" stroke="var(--blue)" stroke-width="1.5" stroke-dasharray="4,2" marker-end="url(#ce-ah-b)"/>
       <path d="M340 220 L340 320" fill="none" stroke="#e8c07a" stroke-width="1.5" stroke-dasharray="4,2" marker-end="url(#ce-ah-o)"/>
       <path d="M565 220 L380 320" fill="none" stroke="var(--purple)" stroke-width="1.5" stroke-dasharray="4,2" marker-end="url(#ce-ah-p)"/>
       <rect x="230" y="320" width="220" height="52" rx="8" fill="rgba(63,185,80,.07)" stroke="var(--green)" stroke-width="1.5"/>
       <text x="340" y="345" text-anchor="middle" font-size="11" font-weight="700" fill="var(--green)">s3://shopkart-lake</text>
       <text x="340" y="361" text-anchor="middle" font-size="10" fill="var(--text-muted)">shared data, same Parquet files</text>`,

      /* 6 – Namespace hierarchy */
      `<rect x="260" y="16" width="140" height="38" rx="6" fill="rgba(74,174,255,.1)" stroke="var(--blue)" stroke-width="2"/>
       <text x="330" y="40" text-anchor="middle" font-size="12" font-weight="700" fill="var(--blue)">shopkart (catalog)</text>
       <path d="M270 54 L130 100" fill="none" stroke="var(--border-default)" stroke-width="1.5" marker-end="url(#ce-ah)"/>
       <path d="M305 54 L240 100" fill="none" stroke="var(--border-default)" stroke-width="1.5" marker-end="url(#ce-ah)"/>
       <path d="M330 54 L330 100" fill="none" stroke="var(--border-default)" stroke-width="1.5" marker-end="url(#ce-ah)"/>
       <path d="M355 54 L420 100" fill="none" stroke="var(--border-default)" stroke-width="1.5" marker-end="url(#ce-ah)"/>
       <path d="M390 54 L530 100" fill="none" stroke="var(--border-default)" stroke-width="1.5" marker-end="url(#ce-ah)"/>
       <rect x="50" y="100" width="140" height="32" rx="5" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
       <text x="120" y="121" text-anchor="middle" font-size="10.5" fill="var(--text-secondary)">orders</text>
       <rect x="200" y="100" width="140" height="32" rx="5" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
       <text x="270" y="121" text-anchor="middle" font-size="10.5" fill="var(--text-secondary)">customers</text>
       <rect x="260" y="100" width="140" height="32" rx="5" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
       <text x="330" y="121" text-anchor="middle" font-size="10.5" fill="var(--text-secondary)">products</text>
       <rect x="360" y="100" width="120" height="32" rx="5" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
       <text x="420" y="121" text-anchor="middle" font-size="10.5" fill="var(--text-secondary)">analytics</text>
       <rect x="460" y="100" width="130" height="32" rx="5" fill="var(--bg-3)" stroke="var(--border-default)" stroke-width="1"/>
       <text x="525" y="121" text-anchor="middle" font-size="10.5" fill="var(--text-secondary)">streaming</text>
       <path d="M120 132 L90 188" fill="none" stroke="var(--border-subtle)" stroke-width="1.2"/>
       <path d="M120 132 L150 188" fill="none" stroke="var(--border-subtle)" stroke-width="1.2"/>
       <rect x="42" y="188" width="100" height="26" rx="4" fill="rgba(63,185,80,.07)" stroke="var(--green)" stroke-width="1"/>
       <text x="92" y="205" text-anchor="middle" font-size="10" fill="var(--green)">events (21B)</text>
       <rect x="148" y="188" width="100" height="26" rx="4" fill="rgba(63,185,80,.07)" stroke="var(--green)" stroke-width="1"/>
       <text x="198" y="205" text-anchor="middle" font-size="10" fill="var(--green)">order_items</text>
       <path d="M270 132 L240 188" fill="none" stroke="var(--border-subtle)" stroke-width="1.2"/>
       <path d="M270 132 L300 188" fill="none" stroke="var(--border-subtle)" stroke-width="1.2"/>
       <rect x="195" y="188" width="100" height="26" rx="4" fill="rgba(74,174,255,.07)" stroke="var(--blue)" stroke-width="1"/>
       <text x="245" y="205" text-anchor="middle" font-size="10" fill="var(--blue)">profiles (50M)</text>
       <rect x="300" y="188" width="100" height="26" rx="4" fill="rgba(74,174,255,.07)" stroke="var(--blue)" stroke-width="1"/>
       <text x="350" y="205" text-anchor="middle" font-size="10" fill="var(--blue)">segments</text>
       <rect x="100" y="280" width="480" height="36" rx="6" fill="var(--bg-3)" stroke="var(--border-subtle)" stroke-width="1"/>
       <text x="340" y="298" text-anchor="middle" font-size="10" fill="var(--text-secondary)">SHOW NAMESPACES IN shopkart;  ·  USE shopkart.orders;</text>
       <text x="340" y="310" text-anchor="middle" font-size="10" fill="var(--text-muted)">SHOW TABLES IN shopkart.orders;</text>`,
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
          const t = el.querySelector('#ce-step-title');
          const d = el.querySelector('#ce-step-desc');
          const c = el.querySelector('#ce-code-content');
          const sv = el.querySelector('#ce-svg-scene');
          if (t) t.textContent = STEPS[si].label;
          if (d) d.textContent = STEPS[si].desc;
          if (c) c.innerHTML = STEPS[si].code;
          if (sv) sv.innerHTML = _scene(si);
          el.querySelectorAll('.ce-step-item').forEach((el2, j) => {
            el2.classList.toggle('active', j === si);
            el2.classList.toggle('done', j < si);
          });
        },
      })),
    });

    container.innerHTML = `
<div class="ce-page">
  <div class="ce-outer">
    <div class="ce-canvas">
      <svg class="ce-svg" viewBox="0 0 680 420" aria-hidden="true">
        <defs>
          <marker id="ce-ah" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <polygon points="0 0,7 3.5,0 7" fill="var(--text-muted)" opacity=".7"/>
          </marker>
          <marker id="ce-ah-b" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <polygon points="0 0,7 3.5,0 7" fill="var(--blue)" opacity=".8"/>
          </marker>
          <marker id="ce-ah-g" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <polygon points="0 0,7 3.5,0 7" fill="var(--green)" opacity=".8"/>
          </marker>
          <marker id="ce-ah-o" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <polygon points="0 0,7 3.5,0 7" fill="#e8c07a" opacity=".8"/>
          </marker>
          <marker id="ce-ah-p" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <polygon points="0 0,7 3.5,0 7" fill="var(--purple)" opacity=".8"/>
          </marker>
        </defs>
        <g id="ce-svg-scene">${_scene(0)}</g>
      </svg>
    </div>
    <div class="ce-sidebar">
      <div class="ce-sidebar-header">
        <div class="ce-sidebar-title" id="ce-step-title">${STEPS[0].label}</div>
        <div class="ce-sidebar-desc" id="ce-step-desc">${STEPS[0].desc}</div>
      </div>
      <div class="ce-steps-list">
        ${STEPS.map((s, i) => `
          <div class="ce-step-item${i === 0 ? ' active' : ''}" data-step="${i}">
            <div class="ce-step-num">${i + 1}</div>
            <div class="ce-step-label">${s.label}</div>
          </div>`).join('')}
      </div>
      <div class="ce-code-panel">
        <div class="ce-code-block" id="ce-code-content">${STEPS[0].code}</div>
      </div>
    </div>
  </div>
</div>`;

    _engine.setContext({ el: container });

    container.querySelectorAll('.ce-step-item').forEach(el => {
      el.addEventListener('click', () => _engine.goto(parseInt(el.dataset.step, 10)));
    });

    IV.AnimationControls.register(_engine);
  }

  IV.modules['catalog-explorer'] = {
    id: 'catalog-explorer',
    title: 'Catalog Explorer',
    group: 'metadata',
    render: _render,
    destroy() { if (_engine) { _engine.destroy(); _engine = null; } IV.AnimationControls.hide(); },
  };
})();
