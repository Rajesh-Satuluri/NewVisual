// ─────────────────────────────────────────────────────────────────────────────
// E-COMMERCE ANALYTICS PLATFORM — the single coherent project behind the
// Real-World Production Lab (m33). One business case, one dataset, one DAG,
// threaded through every production stage. Everything here is realistic and
// correct dbt; any run/record counts are illustrative and labeled as simulated.
//
// This is DATA ONLY. The module (m33-production-lab.js) renders it with the
// existing shared components (renderExplain, SVG DAG, stepper, code blocks).
// ─────────────────────────────────────────────────────────────────────────────

// ── The business, in one line ───────────────────────────────────────────────
export const BUSINESS = {
  company: 'An online e-commerce company (web + mobile).',
  ask: 'Show daily revenue by country, product category and sales channel — plus orders, AOV, customers, refunds and cancellation rate — refreshed every morning before the business wakes up.',
  dashboards: ['Daily revenue', 'Orders', 'Customers', 'Average order value',
    'Product performance', 'Customer retention', 'Regional sales',
    'Cancelled orders', 'Refunds', 'Revenue trends'],
};

// ── Architecture diagram ─────────────────────────────────────────────────────
// Nodes coloured by CONCERN so the ingestion / storage / transform / consume
// boundaries are visually obvious (the distinction the spec stresses). x/y are
// box-top-left on a 620×590 canvas; width 150, height 44 (dbt node taller).
export const CONCERNS = {
  source:    { label: 'Operational source', color: '#64748B' },
  ingestion: { label: 'Ingestion — Fivetran / CDC / Airbyte', color: '#3B82F6' },
  storage:   { label: 'Storage + compute — Snowflake', color: '#06B6D4' },
  transform: { label: 'Transformation — dbt', color: '#FF694B' },
  consume:   { label: 'Consumption — BI / ML / Analytics', color: '#8B5CF6' },
};

export const ARCH_NODES = {
  customer:  { label: 'Customer',        x: 235, y: 8,   concern: 'source' },
  app:       { label: 'E-Commerce App',  x: 235, y: 66,  concern: 'source' },
  orders:    { label: 'Orders DB',       x: 70,  y: 128, concern: 'source', stage: 'sources' },
  payments:  { label: 'Payments DB',     x: 400, y: 128, concern: 'source', stage: 'sources' },
  ingestion: { label: 'Data Ingestion',  x: 235, y: 190, concern: 'ingestion', stage: 'ingestion' },
  warehouse: { label: 'Data Warehouse',  x: 235, y: 252, concern: 'storage', stage: 'raw' },
  raw:       { label: 'RAW schema',      x: 235, y: 314, concern: 'storage', stage: 'raw' },
  dbt:       { label: 'dbt — staging → intermediate → marts', x: 150, y: 376, w: 320, h: 54, concern: 'transform', stage: 'staging' },
  marts:     { label: 'Marts (analytics)', x: 235, y: 460, concern: 'transform', stage: 'marts' },
  bi:        { label: 'BI (Power BI)',   x: 70,  y: 522, concern: 'consume', stage: 'dashboard' },
  ml:        { label: 'ML',              x: 235, y: 522, concern: 'consume' },
  analytics: { label: 'Analytics',       x: 400, y: 522, concern: 'consume' },
};
export const ARCH_EDGES = [
  ['customer', 'app'], ['app', 'orders'], ['app', 'payments'],
  ['orders', 'ingestion'], ['payments', 'ingestion'],
  ['ingestion', 'warehouse'], ['warehouse', 'raw'], ['raw', 'dbt'],
  ['dbt', 'marts'], ['marts', 'bi'], ['marts', 'ml'], ['marts', 'analytics'],
];

// ── What dbt does / does not do (permanent side panel) ───────────────────────
export const DBT_SCOPE = {
  does: ['SQL transformation (T of ELT)', 'Dependency management via ref()',
    'Data tests & contracts', 'Documentation & a searchable catalog',
    'Column- and model-level lineage', 'Materializations (view/table/incremental/ephemeral)',
    'Incremental processing', 'Compilation of Jinja-SQL to warehouse SQL'],
  doesnt: ['Extract operational data (that is ingestion)',
    'Replace the database or warehouse', 'Replace object storage',
    'Replace a general-purpose orchestrator (Airflow/ADF)',
    'Replace streaming platforms (Kafka/Flink)',
    'Automatically solve data quality — you still author the tests',
    'Own or provision the warehouse compute'],
};

// Tech boundary table — the four roles people blur in interviews.
export const BOUNDARIES = [
  { role: 'Ingestion',      tech: 'Fivetran · Airbyte · CDC · custom', job: 'Move raw operational data into the warehouse. E (and L) of ELT.' },
  { role: 'Transformation', tech: 'dbt',                               job: 'Model, test, document and build dependencies on data already landed. The T.' },
  { role: 'Orchestration',  tech: 'Airflow · ADF · Dagster',           job: 'Schedule and sequence the whole workflow: wait for ingestion → run dbt → refresh BI.' },
  { role: 'Storage+compute',tech: 'Snowflake · BigQuery · Databricks', job: 'Hold the data and run the SQL dbt generates.' },
  { role: 'Consumption',    tech: 'Power BI · Tableau · Looker',       job: 'Serve the marts to the business as dashboards.' },
];

// ── Source systems (operational schemas) ─────────────────────────────────────
export const SOURCES = [
  { name: 'orders', origin: 'Orders service (Postgres)', cols: ['order_id','customer_id','product_id','order_date','quantity','unit_price','discount','tax','shipping_cost','status','country','created_at','updated_at'] },
  { name: 'customers', origin: 'Customer service (Postgres)', cols: ['customer_id','customer_name','email','country','signup_date','customer_type','updated_at'] },
  { name: 'products', origin: 'Catalog service (MySQL)', cols: ['product_id','product_name','category','brand','unit_cost','selling_price','updated_at'] },
  { name: 'payments', origin: 'Payment gateway (events)', cols: ['payment_id','order_id','payment_method','payment_status','payment_amount','payment_timestamp'] },
  { name: 'refunds', origin: 'Support tool (events)', cols: ['refund_id','order_id','refund_amount','refund_date'] },
];

// Intentionally messy raw sample — the mess staging cleans up.
export const RAW_ORDERS_SAMPLE = {
  cols: ['order_id', 'customer_id', 'country', 'status', 'created_at'],
  rows: [
    ['10001', 'C101', 'India', 'completed', '2026-09-30 11:02'],
    ['10002', 'C102', 'INDIA', 'Complete', '2026-09-30 11:05'],
    ['10003', 'C103', 'null', 'cancelled', '2026-09-30 11:09'],
    ['10004', 'C104', ' usa ', 'COMPLETED', '2026-09-30 11:11'],
  ],
  problems: ['Country casing/whitespace: India / INDIA / " usa "', 'Status not standardized: completed / Complete / COMPLETED',
    'Nulls arriving as the string "null"', 'Timestamps as text, not DATE/TIMESTAMP'],
};

// ── dbt project structure ────────────────────────────────────────────────────
export const PROJECT_TREE = [
  { path: 'models/staging/', kind: 'dir', note: 'One stg_ model per source table — clean + standardize only.' },
  { path: 'models/staging/stg_orders.sql', kind: 'sql', stage: 'staging' },
  { path: 'models/staging/stg_customers.sql', kind: 'sql', stage: 'staging' },
  { path: 'models/staging/stg_products.sql', kind: 'sql', stage: 'staging' },
  { path: 'models/staging/stg_payments.sql', kind: 'sql', stage: 'staging' },
  { path: 'models/staging/stg_refunds.sql', kind: 'sql', stage: 'staging' },
  { path: 'models/staging/_sources.yml', kind: 'yml', stage: 'ingestion', note: 'source() definitions + freshness.' },
  { path: 'models/intermediate/', kind: 'dir', note: 'Joins & business logic too heavy for staging, not yet a mart.' },
  { path: 'models/intermediate/int_orders_enriched.sql', kind: 'sql', stage: 'intermediate' },
  { path: 'models/intermediate/int_customer_orders.sql', kind: 'sql', stage: 'intermediate' },
  { path: 'models/marts/', kind: 'dir', note: 'Business-facing facts & dimensions the BI tool reads.' },
  { path: 'models/marts/dim_customer.sql', kind: 'sql', stage: 'marts' },
  { path: 'models/marts/dim_product.sql', kind: 'sql', stage: 'marts' },
  { path: 'models/marts/fct_orders.sql', kind: 'sql', stage: 'marts' },
  { path: 'models/marts/fct_daily_revenue.sql', kind: 'sql', stage: 'marts' },
  { path: 'models/marts/_marts.yml', kind: 'yml', stage: 'quality', note: 'Tests, descriptions, contracts.' },
  { path: 'tests/', kind: 'dir', note: 'Singular (custom SQL) tests.' },
  { path: 'macros/', kind: 'dir', note: 'Reusable Jinja (e.g. cents_to_dollars).' },
  { path: 'snapshots/', kind: 'dir', note: 'SCD-2 history (e.g. product price changes).' },
  { path: 'seeds/', kind: 'dir', note: 'Small static CSVs (e.g. country → region map).' },
  { path: 'dbt_project.yml', kind: 'yml', note: 'Project config: model paths, materializations by folder.' },
  { path: 'packages.yml', kind: 'yml', note: 'dbt_utils, dbt_expectations, etc.' },
];

// ── The project DAG (clickable in Pipeline + Data Flow) ──────────────────────
// x = box-left on an 860×360 canvas, width 150, height 40.
export const DAG_NODES = {
  src_orders:       { label: 'ecommerce.orders',   x: 20,  y: 20,  layer: 0, kind: 'src' },
  src_customers:    { label: 'ecommerce.customers', x: 20,  y: 80,  layer: 0, kind: 'src' },
  src_products:     { label: 'ecommerce.products', x: 20,  y: 140, layer: 0, kind: 'src' },
  src_payments:     { label: 'ecommerce.payments', x: 20,  y: 200, layer: 0, kind: 'src' },
  stg_orders:       { label: 'stg_orders',    x: 220, y: 20,  layer: 1, kind: 'stg' },
  stg_customers:    { label: 'stg_customers', x: 220, y: 80,  layer: 1, kind: 'stg' },
  stg_products:     { label: 'stg_products',  x: 220, y: 140, layer: 1, kind: 'stg' },
  stg_payments:     { label: 'stg_payments',  x: 220, y: 200, layer: 1, kind: 'stg' },
  int_orders:       { label: 'int_orders_enriched', x: 420, y: 110, layer: 2, kind: 'int' },
  dim_customer:     { label: 'dim_customer',  x: 620, y: 20,  layer: 3, kind: 'dim' },
  dim_product:      { label: 'dim_product',   x: 620, y: 80,  layer: 3, kind: 'dim' },
  fct_orders:       { label: 'fct_orders',    x: 620, y: 150, layer: 3, kind: 'fct' },
  fct_daily_revenue:{ label: 'fct_daily_revenue', x: 620, y: 230, layer: 4, kind: 'fct' },
  dashboard:        { label: 'BI dashboard',  x: 620, y: 300, layer: 5, kind: 'bi' },
};
export const DAG_EDGES = [
  ['src_orders','stg_orders'], ['src_customers','stg_customers'],
  ['src_products','stg_products'], ['src_payments','stg_payments'],
  ['stg_orders','int_orders'], ['stg_customers','int_orders'],
  ['stg_products','int_orders'], ['stg_payments','int_orders'],
  ['stg_customers','dim_customer'], ['stg_products','dim_product'],
  ['int_orders','fct_orders'], ['fct_orders','fct_daily_revenue'],
  ['dim_customer','fct_daily_revenue'], ['fct_daily_revenue','dashboard'],
];
export const DAG_KIND_COLOR = { src: '#64748B', stg: '#3B82F6', int: '#06B6D4', dim: '#10B981', fct: '#FF694B', bi: '#8B5CF6' };

// ── The 14 pipeline stages (the rail / walkthrough) ──────────────────────────
// Each stage is rendered with renderExplain (what/why/input/output/failure/
// interview) + optional code blocks + optional extra HTML + a "go deeper" link
// into the relevant existing module.
export const STAGES = [
  {
    id: 'business-req', icon: '🎯', name: 'Business Requirement', sub: 'the ask',
    owner: 'Product / Analytics lead', tech: 'None yet — a conversation',
    explain: {
      title: 'Start from the question, not the SQL', tag: 'Requirement', icon: '🎯',
      what: 'The business asks: <strong>"Show daily revenue by country, product category and sales channel."</strong> Before any dbt code, the DE team translates that into the layers of data needed.',
      why: 'Every model below exists to answer this question reliably and the same way for everyone. Designing layers first is what separates a maintained platform from 600 copy-pasted SQL files.',
      output: 'A target shape: <code>raw orders → clean orders → customer & product dimensions → an order fact → a daily revenue mart → the dashboard</code>. Each layer has a clear job.',
      failure: 'Jumping straight to one giant query. It works once, then nobody can change it, test it, or explain it — the chaos this whole tool opens with.',
      interview: 'Lead with the requirement and the grain of the final mart. Interviewers want to see you design backwards from the business question.',
    },
    extra: 'target-shape',
  },
  {
    id: 'sources', icon: '🗄️', name: 'Source Systems', sub: 'where data is born',
    owner: 'Application / backend teams', tech: 'Postgres · MySQL · event streams',
    explain: {
      title: 'Operational systems generate the data', tag: 'Source', icon: '🗄️',
      what: 'Orders, customers, products, payments and refunds live in the apps that run the business — not in the warehouse. dbt never touches these directly.',
      why: 'These are optimized for the application (OLTP), not analytics. They change shape when engineers ship features, which is exactly why a stable staging layer matters later.',
      input: 'Customer actions on the website / mobile app.',
      output: 'Five operational tables (schemas below) that an ingestion tool will copy into the warehouse.',
      failure: 'Pointing a dashboard straight at the production app DB — you hammer the live system and couple BI to every schema change.',
    },
    extra: 'source-schemas',
  },
  {
    id: 'ingestion', icon: '📥', name: 'Data Ingestion', sub: 'E + L of ELT',
    owner: 'Data Platform / Ingestion', tech: 'Fivetran · Airbyte · CDC · ADF',
    explain: {
      title: 'Ingestion lands raw data — dbt does not', tag: 'Ingestion', icon: '📥',
      what: 'A managed connector (Fivetran/Airbyte) or CDC pipeline copies each source table into a <code>RAW</code> schema in the warehouse, usually on a schedule or near-real-time.',
      why: 'This is the hard boundary interviewers probe: <strong>dbt is transformation, not extraction</strong>. Separating E/L from T means dbt can be rebuilt any time from data already landed.',
      input: 'Operational tables in the app databases.',
      output: '<code>raw.orders</code>, <code>raw.customers</code>, <code>raw.products</code>, <code>raw.payments</code>, <code>raw.refunds</code>.',
      failure: 'Expecting dbt to pull from an API or app DB. dbt only reads what is already in the warehouse.',
      interview: '"dbt is the T in ELT." Ingestion = Fivetran/CDC; transformation = dbt; orchestration = Airflow; compute = Snowflake. Keep the four roles crisp.',
    },
    extra: 'boundaries',
    deeper: { id: 'm16', label: 'When NOT to use dbt →' },
  },
  {
    id: 'raw', icon: '🪨', name: 'Raw Layer', sub: 'land, don\'t transform',
    owner: 'Ingestion (writes) · dbt (reads)', tech: 'Snowflake RAW schema',
    explain: {
      title: 'Preserve the source faithfully', tag: 'Raw', icon: '🪨',
      what: 'The warehouse receives data as-is: mixed casing, inconsistent statuses, string "null"s, text timestamps. The raw layer is a faithful copy, not a clean one.',
      why: 'If raw mirrors the source, you can always replay history and debug "is it us or the source?". Cleaning here would hide source problems and make them un-reproducible.',
      input: 'Connector loads from ingestion.',
      output: 'Raw tables, intentionally messy (sample below).',
      failure: 'Transforming during load. Then raw no longer matches the source and you lose your audit trail.',
    },
    extra: 'raw-sample',
  },
  {
    id: 'staging', icon: '🧹', name: 'dbt Staging', sub: 'dbt begins here',
    owner: 'Analytics Engineering', tech: 'dbt · view/table',
    explain: {
      title: 'One cleaned, renamed model per source', tag: 'Staging', icon: '🧹',
      what: 'This is where dbt first gets involved. <code>stg_orders</code> reads <code>source(\'ecommerce\',\'orders\')</code> and does light work only: cast types, trim/standardize, rename, no joins.',
      why: 'Staging is the stable interface between messy sources and your business logic. Every downstream model refs the stg_ model, so a source change is absorbed in one place.',
      input: '<code>source(\'ecommerce\', \'orders\')</code> (the raw table, via a source definition).',
      output: '<code>stg_orders</code> — clean columns, correct types, standardized country & status.',
      failure: 'Doing joins or aggregations in staging. Keep it 1:1 with the source; business logic belongs in intermediate/marts.',
      interview: 'Staging = rename + recast + light clean, one model per source, no joins. It exists so downstream code never references raw directly.',
    },
    code: [
      { lang: 'sql', title: 'models/staging/stg_orders.sql', text:
`with source as (
    select * from {{ source('ecommerce', 'orders') }}
)
select
    order_id,
    customer_id,
    product_id,
    cast(order_date as date)          as order_date,
    quantity,
    unit_price,
    discount,
    tax,
    shipping_cost,
    lower(trim(status))               as order_status,
    upper(trim(country))              as country,
    cast(created_at as timestamp)     as created_at,
    cast(updated_at as timestamp)     as updated_at
from source` },
    ],
    extra: 'project-tree',
    deeper: { id: 'm10', label: 'dbt Models →' },
  },
  {
    id: 'sourcedef', icon: '🔗', name: 'Source & ref()', sub: 'lineage foundation',
    owner: 'Analytics Engineering', tech: 'dbt sources.yml',
    explain: {
      title: 'source() and ref() build the graph', tag: 'Lineage', icon: '🔗',
      what: 'Sources are declared once in YAML; models reference raw via <code>source()</code> and reference each other via <code>ref()</code>. dbt reads these to build the dependency DAG automatically.',
      why: '<code>ref()</code> instead of hardcoded <code>schema.table</code> gives you: automatic build order, environment-aware schema names (dev vs prod), and full lineage. Hardcoding throws all of that away.',
      input: 'Raw table names + a sources.yml declaration.',
      output: 'A resolved DAG: <code>source(ecommerce,orders) → stg_orders → … → dashboard</code>.',
      failure: 'Writing <code>from analytics.stg_orders</code> directly. dbt can no longer order the build or track lineage, and it breaks across environments.',
      interview: 'ref()/source() are not cosmetic — they ARE how dbt knows build order and lineage. Hardcoded names = no DAG.',
    },
    code: [
      { lang: 'yaml', title: 'models/staging/_sources.yml', text:
`version: 2
sources:
  - name: ecommerce
    schema: raw
    freshness:
      warn_after:  {count: 1,  period: hour}
      error_after: {count: 6, period: hour}
    loaded_at_field: _loaded_at
    tables:
      - name: orders
      - name: customers
      - name: products
      - name: payments
      - name: refunds` },
    ],
    deeper: { id: 'm15', label: 'Lineage & DAG →' },
  },
  {
    id: 'intermediate', icon: '🔧', name: 'dbt Intermediate', sub: 'the heavy joins',
    owner: 'Analytics Engineering', tech: 'dbt · table',
    explain: {
      title: 'Where models combine', tag: 'Intermediate', icon: '🔧',
      what: '<code>int_orders_enriched</code> joins staged orders to customers, products and payments — one row per order with everything attached, ready to become facts.',
      why: 'Keeps mart models readable and reuses the same join logic across several marts. Not every project needs it, but it pays off the moment two marts share logic.',
      input: '<code>ref(\'stg_orders\')</code> + <code>stg_customers</code> + <code>stg_products</code> + <code>stg_payments</code>.',
      output: '<code>int_orders_enriched</code> — enriched order grain (1 row = 1 order).',
      failure: 'Letting intermediate become a dumping ground. Each int_ model should have a clear, nameable purpose.',
      interview: 'Intermediate exists to (a) hold joins/business logic too heavy for staging and (b) share logic across marts. It is an implementation layer, not business-facing.',
    },
    code: [
      { lang: 'sql', title: 'models/intermediate/int_orders_enriched.sql', text:
`with orders as (
    select * from {{ ref('stg_orders') }}
),
customers as (
    select * from {{ ref('stg_customers') }}
),
products as (
    select * from {{ ref('stg_products') }}
),
payments as (
    select order_id, max(payment_status) as payment_status
    from {{ ref('stg_payments') }}
    group by 1
)
select
    o.order_id,
    o.order_date,
    o.customer_id,
    c.customer_type,
    o.product_id,
    p.category          as product_category,
    o.country,
    o.quantity,
    o.unit_price,
    o.discount,
    o.tax,
    o.shipping_cost,
    (o.quantity * o.unit_price - o.discount + o.tax) as gross_revenue,
    o.order_status,
    pay.payment_status
from orders o
left join customers c on o.customer_id = c.customer_id
left join products  p on o.product_id  = p.product_id
left join payments  pay on o.order_id  = pay.order_id` },
    ],
    deeper: { id: 'm10', label: 'dbt Models →' },
  },
  {
    id: 'marts', icon: '⭐', name: 'dbt Marts', sub: 'facts & dimensions',
    owner: 'Analytics Engineering', tech: 'dbt · table/incremental',
    explain: {
      title: 'Business-facing dimensional models', tag: 'Marts', icon: '⭐',
      what: 'Dimensions (<code>dim_customer</code>, <code>dim_product</code>) describe the "who/what"; facts (<code>fct_orders</code>, <code>fct_daily_revenue</code>) hold the measurable events. The BI tool reads these.',
      why: 'Dimensional modeling gives the business consistent, reusable metrics with a defined grain — one agreed definition of "revenue", joined the same way everywhere.',
      input: '<code>ref(\'int_orders_enriched\')</code> + staged dimensions.',
      output: '<code>fct_daily_revenue</code> at the exact grain the dashboard needs.',
      failure: 'Mixing grains in one fact (order lines + daily aggregates). The numbers double-count and nobody trusts them.',
      interview: 'Be ready to state the grain of every fact. "fct_orders = one row per order; fct_daily_revenue = one row per day × country × category."',
    },
    code: [
      { lang: 'sql', title: 'models/marts/fct_daily_revenue.sql', text:
`with orders as (
    select * from {{ ref('fct_orders') }}
)
select
    order_date,
    country,
    product_category,
    sales_channel,
    count(distinct order_id)                        as orders,
    count(distinct customer_id)                     as customers,
    sum(gross_revenue)                              as revenue,
    sum(gross_revenue) / nullif(count(distinct order_id), 0) as avg_order_value
from orders
where order_status = 'completed'
group by 1, 2, 3, 4` },
    ],
    extra: 'marts-dag',
    deeper: { id: 'm31', label: 'Case Studies →' },
  },
  {
    id: 'grain', icon: '📐', name: 'Grain', sub: 'one row = ?',
    owner: 'Analytics Engineering', tech: 'Design discipline',
    explain: {
      title: 'Grain is the contract of a fact', tag: 'Modeling', icon: '📐',
      what: 'Grain = what one row represents. <code>fct_orders</code>: one row per order. <code>fct_daily_revenue</code>: one row per day × country × category × channel.',
      why: 'Every aggregation, every join, every test depends on the grain. Change it by accident (e.g. a fan-out join) and totals silently inflate.',
      failure: 'A left join to <code>payments</code> with two payment rows per order turns "one row per order" into "one row per payment" — revenue doubles. The grain exercise below shows exactly this.',
      interview: 'State grain before writing SQL. "What is one row?" is the single most common modeling question — and the fastest way to catch a fan-out bug.',
    },
    extra: 'grain-exercise',
  },
  {
    id: 'quality', icon: '🧪', name: 'Data Quality', sub: 'tests + freshness',
    owner: 'Analytics Engineering', tech: 'dbt tests · source freshness',
    explain: {
      title: 'Catch bad data before the dashboard', tag: 'Quality', icon: '🧪',
      what: 'Schema tests (<code>unique</code>, <code>not_null</code>, <code>relationships</code>, <code>accepted_values</code>) plus source freshness gates run as part of the build. A failing test can block downstream models.',
      why: 'Tests turn "the dashboard looks wrong" into "the build failed at 02:55 with a named cause" — detected before the business sees it, not after.',
      input: 'Built models + YAML test definitions.',
      output: 'Pass/fail per test; failures surface in run_results and can halt the run.',
      failure: 'Shipping without a <code>relationships</code> test, so orphaned <code>customer_id</code>s silently drop rows in a later join.',
      interview: 'Name the four generic tests and when you reach for a singular/custom test or a contract. Tie it to "fail the build, not the dashboard."',
    },
    code: [
      { lang: 'yaml', title: 'models/marts/_marts.yml (excerpt)', text:
`models:
  - name: fct_orders
    columns:
      - name: order_id
        tests: [unique, not_null]
      - name: customer_id
        tests:
          - not_null
          - relationships:
              to: ref('dim_customer')
              field: customer_id
      - name: order_status
        tests:
          - accepted_values:
              values: ['completed', 'cancelled', 'refunded']` },
    ],
    extra: 'test-run',
    deeper: { id: 'm22', label: 'Testing & Data Quality →' },
  },
  {
    id: 'incremental', icon: '⏩', name: 'Incremental Processing', sub: 'don\'t rebuild 100M rows',
    owner: 'Analytics Engineering', tech: 'dbt · incremental',
    explain: {
      title: 'Process new/changed rows only', tag: 'Incremental', icon: '⏩',
      what: '<code>fct_orders</code> is incremental: day 1 builds ~100M rows; day 2 only merges ~500K new/updated rows instead of rebuilding everything.',
      why: 'Full rebuilds get slow and expensive as data grows. Incremental keeps the nightly run fast — but introduces the late-arriving-data trap.',
      input: 'Previously built <code>fct_orders</code> + new rows from <code>int_orders_enriched</code>.',
      output: 'An updated fact, cheaply.',
      failure: 'A naive <code>where order_date > max(order_date)</code> filter misses an order dated Sept 29 that arrived Oct 1. A lookback window or merge key fixes it (Incident 3).',
      interview: 'Explain the <code>is_incremental()</code> filter, the unique_key for merge, and why a lookback window is needed for late-arriving data.',
    },
    code: [
      { lang: 'sql', title: 'models/marts/fct_orders.sql (incremental)', text:
`{{ config(materialized='incremental', unique_key='order_id',
          incremental_strategy='merge') }}

select *
from {{ ref('int_orders_enriched') }}

{% if is_incremental() %}
  -- lookback window: reprocess the last 3 days so late-arriving
  -- orders are not missed, then MERGE on order_id dedupes.
  where order_date >= (select dateadd(day, -3, max(order_date)) from {{ this }})
{% endif %}` },
    ],
    deeper: { id: 'm21', label: 'Incremental Strategies →' },
  },
  {
    id: 'materialization', icon: '🧱', name: 'Materializations', sub: 'view/table/incremental/ephemeral',
    owner: 'Analytics Engineering', tech: 'dbt config',
    explain: {
      title: 'Each model\'s materialization is a production decision', tag: 'Materialization', icon: '🧱',
      what: 'Staging → view (cheap, always fresh). Intermediate → table (reused, worth persisting). fct_orders → incremental (too big to rebuild). dim_customer → table. A tiny reused calc → ephemeral (inlined, no object).',
      why: 'The choice trades storage, compute and freshness. There is no universal answer — it depends on size, reuse and how often the data changes.',
      failure: 'Making a 100M-row fact a view (every query re-runs the whole thing) or a huge staging model a table (storage + staleness for no benefit).',
      interview: 'Do not recite definitions — justify the choice per model. "Incremental because full rebuild is 40 min; view for staging because it is light and must stay fresh."',
    },
    extra: 'materialization-table',
    deeper: { id: 'm29', label: 'Adapters & Warehouses →' },
  },
  {
    id: 'orchestration', icon: '🎛️', name: 'Orchestration', sub: 'Airflow runs the day',
    owner: 'Data Platform', tech: 'Airflow · Dagster · ADF',
    explain: {
      title: 'Airflow sequences the workflow; dbt sequences the models', tag: 'Orchestration', icon: '🎛️',
      what: 'Airflow waits for ingestion to finish, then triggers <code>dbt build</code>, then source-freshness and tests, then refreshes BI. dbt owns dependencies <em>inside</em> the project; Airflow owns the end-to-end schedule.',
      why: 'Two different jobs. dbt should not poll for ingestion completion or refresh Power BI; Airflow should not know which model depends on which — that is the dbt DAG.',
      input: 'A schedule + upstream ingestion signal.',
      output: 'An ordered production run (timeline below).',
      failure: 'Rebuilding the dbt DAG as Airflow tasks (one task per model). You now maintain dependencies twice and lose dbt\'s selectors.',
      interview: 'The classic: "How do Airflow and dbt interact?" — Airflow = when & in what order the stages run; dbt = how models depend on each other. One BashOperator/Cosmos task calls dbt build.',
    },
    extra: 'schedule',
    deeper: { id: 'm30', label: 'dbt + Airflow →' },
  },
  {
    id: 'cicd', icon: '🔁', name: 'CI/CD', sub: 'PR → Slim CI → merge',
    owner: 'Analytics Engineering · Platform', tech: 'GitHub Actions · dbt Cloud',
    explain: {
      title: 'Every change is tested before production', tag: 'CI/CD', icon: '🔁',
      what: 'A developer edits <code>stg_orders.sql</code> and opens a PR. CI runs <code>dbt parse</code> then <code>dbt build --select state:modified+</code> against a temporary schema — building only what changed and its children — then tests. Green + review → merge → deploy.',
      why: 'Slim CI makes checks fast and cheap (build 3 models, not 2,000) while still catching breakage downstream of the change.',
      input: 'A pull request + a deferred production manifest (<code>--state</code>).',
      output: 'A pass/fail check on the PR; merge triggers the production deploy job.',
      failure: 'No CI, or a full rebuild on every PR — either ships bad models or makes CI so slow people skip it.',
      interview: 'state:modified+ (what to build) + --defer (resolve unbuilt refs to prod) = Slim CI. Be able to draw the PR → CI → merge → deploy flow.',
    },
    code: [
      { lang: 'yaml', title: '.github/workflows/dbt_ci.yml (excerpt)', text:
`jobs:
  dbt-ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install dbt-snowflake
      - run: dbt deps
      - run: dbt parse
      # build only changed models + children, defer the rest to prod
      - run: dbt build --select state:modified+ --defer --state ./prod-artifacts` },
    ],
    deeper: { id: 'm27', label: 'CI/CD Lab →' },
  },
  {
    id: 'deploy', icon: '🚀', name: 'Production Deployment', sub: 'dev → CI → staging → prod',
    owner: 'Data Platform', tech: 'dbt targets · profiles · env vars',
    explain: {
      title: 'Environment isolation via targets', tag: 'Deployment', icon: '🚀',
      what: 'The same code runs against different targets. A profile maps <code>dev</code>/<code>ci</code>/<code>prod</code> to different schemas, credentials and warehouses — selected by <code>--target</code> or env vars. ref() resolves to the right schema automatically.',
      why: 'One codebase, many environments, zero hardcoded schema names. Dev work never touches prod data; prod credentials never live on a laptop.',
      input: 'Merged code + the prod target + service-account credentials.',
      output: 'Models built in the <code>analytics</code> (prod) schema on a schedule.',
      failure: 'Hardcoding the prod schema, or running dev against prod by accident. Targets + env vars prevent both.',
      interview: 'Explain profiles/targets, why credentials come from env vars, and how ref() makes the same SQL environment-agnostic.',
    },
    code: [
      { lang: 'yaml', title: '~/.dbt/profiles.yml', text:
`ecommerce:
  target: dev
  outputs:
    dev:
      type: snowflake
      schema: dbt_dev_{{ env_var('USER') }}
      threads: 4
    prod:
      type: snowflake
      schema: analytics
      user: "{{ env_var('DBT_PROD_USER') }}"
      password: "{{ env_var('DBT_PROD_PASSWORD') }}"
      threads: 16` },
    ],
    deeper: { id: 'm28', label: 'Environments →' },
  },
  {
    id: 'monitoring', icon: '📟', name: 'Monitoring', sub: 'did the run go green?',
    owner: 'Data Platform · on-call', tech: 'run_results · alerts · freshness',
    explain: {
      title: 'Know the state of every run', tag: 'Monitoring', icon: '📟',
      what: 'Each run writes <code>run_results.json</code>: models passed/failed/skipped, test results, timings. Teams surface this as a dashboard + alerts (Slack/pager), plus source-freshness status.',
      why: 'The dashboard being wrong is the <em>last</em> place to find out. Monitoring turns silent failures into a paged alert with a model name and error.',
      input: 'Artifacts from the nightly run.',
      output: 'A run summary (below) + alerts on failure or freshness breach.',
      failure: 'A failed model is marked skipped downstream and nobody is paged — the dashboard shows yesterday\'s data silently.',
      interview: 'Point to run_results.json / the manifest as the source of truth, freshness as an early warning, and "alert on failure, not on success."',
    },
    extra: 'monitoring',
    deeper: { id: 'm19', label: 'Manifest & Artifacts →' },
  },
  {
    id: 'dashboard', icon: '📊', name: 'Business Dashboard', sub: 'the business sees it',
    owner: 'BI / Analytics', tech: 'Power BI · Tableau',
    explain: {
      title: 'Every KPI traces back to a model', tag: 'Consumption', icon: '📊',
      what: 'The BI tool reads <code>fct_daily_revenue</code> and the dims — never raw. Each tile (Revenue, Orders, AOV, Refunds, Cancellation rate) maps to a column in a mart you can name.',
      why: 'Because metrics come from governed marts, everyone gets the same number. "Where does this KPI come from?" has a one-line lineage answer.',
      input: '<code>fct_daily_revenue</code> + <code>dim_customer</code> + <code>dim_product</code>.',
      output: 'The dashboards the business actually asked for in stage 1.',
      failure: 'BI authors writing their own SQL against raw — the duplication/disagreement problem returns one layer up.',
      interview: 'Close the loop: dashboard KPI → fct_daily_revenue → fct_orders → stg_orders → raw.orders → the app. That traceability is the whole point of dbt.',
    },
    extra: 'dashboard',
  },
];

// Grain exercise (interactive) — what breaks when the grain changes.
export const GRAIN_EXERCISE = {
  question: 'fct_orders is "one row per order". A new left join to stg_payments is added. Some orders have 2 payment rows (an initial auth + a capture). What happens to total revenue?',
  options: [
    { id: 'a', label: 'Nothing — the join is harmless', correct: false,
      why: 'A left join to a table with multiple matching rows fans out: orders with 2 payments now produce 2 fact rows.' },
    { id: 'b', label: 'Revenue roughly doubles for multi-payment orders', correct: true,
      why: 'Exactly. The grain silently changed from "one row per order" to "one row per order-payment". Every sum over revenue now double-counts those orders.' },
    { id: 'c', label: 'The build fails with an error', correct: false,
      why: 'It will not fail — the SQL is valid. That is what makes grain bugs dangerous: the numbers are wrong but nothing errors. A unique test on order_id would catch it.' },
  ],
  fix: 'Aggregate payments to one row per order <em>before</em> joining (as int_orders_enriched does), or add a <code>unique</code> test on <code>order_id</code> in fct_orders so the grain is enforced, not assumed.',
};

// Monitoring snapshot (simulated, labeled).
export const RUN_SUMMARY = {
  models: { total: 24, pass: 22, fail: 1, skip: 1 },
  tests: { total: 105, pass: 101, fail: 2, warn: 2 },
  freshness: [
    { source: 'orders', status: 'pass' },
    { source: 'customers', status: 'pass' },
    { source: 'payments', status: 'warn' },
  ],
  failures: [
    { node: 'fct_orders', type: 'model', msg: 'relationships test on customer_id failed upstream — build halted.' },
    { node: 'not_null(payments.payment_amount)', type: 'test', msg: '3 rows with null payment_amount.' },
  ],
};

// Materialization decisions.
export const MATERIALIZATIONS = [
  { model: 'stg_orders', mat: 'view', why: 'Light transform, must stay fresh, cheap to re-run.' },
  { model: 'int_orders_enriched', mat: 'table', why: 'Reused by several marts; persist the join once.' },
  { model: 'fct_orders', mat: 'incremental', why: '~100M rows — full rebuild is slow and expensive.' },
  { model: 'dim_customer', mat: 'table', why: 'Small, queried constantly, worth persisting.' },
  { model: 'cents_to_dollars()', mat: 'ephemeral', why: 'Tiny reused calc — inline it, no warehouse object needed.' },
];

// Production day schedule (orchestration timeline — also drives Wave B playback).
export const SCHEDULE = [
  { time: '01:00', label: 'Ingestion starts', who: 'Fivetran' },
  { time: '02:00', label: 'Raw data available', who: 'Snowflake RAW' },
  { time: '02:15', label: 'dbt staging', who: 'dbt' },
  { time: '02:30', label: 'dbt intermediate', who: 'dbt' },
  { time: '02:45', label: 'dbt marts', who: 'dbt' },
  { time: '03:00', label: 'Tests + freshness', who: 'dbt' },
  { time: '03:15', label: 'BI refresh', who: 'Power BI' },
];

// Dashboard tiles → lineage (clickable in Pipeline + Data Flow).
export const DASHBOARD = {
  kpis: [
    { label: 'Revenue', value: '$1.42M', sub: 'completed orders', model: 'fct_daily_revenue' },
    { label: 'Orders', value: '18,204', sub: 'distinct', model: 'fct_daily_revenue' },
    { label: 'AOV', value: '$78.10', sub: 'revenue / orders', model: 'fct_daily_revenue' },
    { label: 'Customers', value: '9,880', sub: 'distinct buyers', model: 'fct_daily_revenue' },
    { label: 'Refunds', value: '$41.2K', sub: 'from refunds src', model: 'fct_orders' },
    { label: 'Cancellation rate', value: '4.3%', sub: 'cancelled / all', model: 'fct_orders' },
  ],
  charts: ['Revenue by day', 'Revenue by country', 'Revenue by category', 'Top products', 'New vs returning customers'],
  lineage: ['Dashboard KPI', 'fct_daily_revenue', 'fct_orders', 'int_orders_enriched', 'stg_orders', 'raw.orders', 'Orders app'],
  note: 'Numbers are simulated for the walkthrough.',
};

// ── Run Production Day — the animated pipeline (Wave B) ──────────────────────
// Each step has a time, a stage label, the actor, a one-line status, and the
// DAG nodes that become "built" at that step (drives the live DAG highlight).
export const RUN_STEPS = [
  { time: '01:00', label: 'Ingestion starts', who: 'Fivetran', detail: 'Connectors begin syncing orders, customers, products, payments, refunds from the app DBs.', nodes: [] },
  { time: '02:00', label: 'Raw data available', who: 'Snowflake RAW', detail: 'All five source tables landed in the RAW schema. Row counts look normal.', nodes: ['src_orders','src_customers','src_products','src_payments'] },
  { time: '02:05', label: 'Source freshness check', who: 'dbt', detail: 'dbt source freshness: orders PASS, customers PASS, payments PASS. Safe to build.', nodes: ['src_orders','src_customers','src_products','src_payments'] },
  { time: '02:10', label: 'dbt parse', who: 'dbt', detail: 'Project parses: manifest built, 24 nodes, DAG resolved from ref()/source(). No compile errors.', nodes: ['src_orders','src_customers','src_products','src_payments'] },
  { time: '02:15', label: 'dbt staging', who: 'dbt', detail: 'stg_* models build as views — clean, recast, standardize. One model per source.', nodes: ['stg_orders','stg_customers','stg_products','stg_payments'] },
  { time: '02:30', label: 'dbt intermediate', who: 'dbt', detail: 'int_orders_enriched joins staged orders to customers, products and aggregated payments.', nodes: ['int_orders'] },
  { time: '02:40', label: 'dbt marts', who: 'dbt', detail: 'dim_customer, dim_product build as tables; fct_orders MERGEs new rows (incremental); fct_daily_revenue aggregates.', nodes: ['dim_customer','dim_product','fct_orders','fct_daily_revenue'] },
  { time: '02:55', label: 'dbt tests', who: 'dbt', detail: '105 tests run in DAG order — unique, not_null, relationships, accepted_values. 2 warnings, 0 blocking failures.', nodes: ['dim_customer','dim_product','fct_orders','fct_daily_revenue'] },
  { time: '03:00', label: 'Write artifacts', who: 'dbt', detail: 'manifest.json, run_results.json, catalog.json written — the record of what ran and how it went.', nodes: ['dim_customer','dim_product','fct_orders','fct_daily_revenue'] },
  { time: '03:15', label: 'BI refresh', who: 'Power BI', detail: 'Dashboards refresh from fct_daily_revenue + dims. The business opens green dashboards at 9am.', nodes: ['dashboard'] },
];

// ── Three interactive production incidents (Wave B) ──────────────────────────
// Each incident: a symptom, an investigation path down the lineage, a set of
// hypotheses the user picks from, the true root cause, and the 5-part writeup.
export const INCIDENTS = [
  {
    id: 'revenue-drop', icon: '📉', title: 'Daily revenue is 18% lower than yesterday',
    severity: 'High', paged: '08:05 — BI lead pings on-call',
    symptom: 'The daily-revenue dashboard opened 18% below yesterday. No code was deployed overnight. Tests were green. Where do you look?',
    // Investigation: walk down the lineage; at each layer show what you\'d check.
    trace: [
      { node: 'BI dashboard', check: 'Confirm it is real, not a BI cache. Revenue tile = $1.16M vs $1.42M. Refresh time 03:15 — normal. The drop is in the data, not the dashboard.' },
      { node: 'fct_daily_revenue', check: 'Sum by country/category. Every slice is down proportionally — not one category. Suggests fewer rows upstream, not a logic bug.' },
      { node: 'fct_orders', check: 'Row count: 15,120 vs ~18,200 expected. ~3,000 orders missing. The fact is thin, not wrong.' },
      { node: 'int_orders_enriched', check: 'Same shortfall. Joins look fine (no fan-out, no dropped rows). The gap is already present before any transformation.' },
      { node: 'stg_orders', check: 'Same shortfall — staging is faithful. So the rows never arrived in raw.' },
      { node: 'raw.orders', check: 'MAX(created_at) = 23:10 yesterday. Orders after 23:10 are missing. Ingestion stopped early.' },
    ],
    hypotheses: [
      { id: 'a', label: 'A bug in fct_daily_revenue aggregation', correct: false, why: 'Every slice dropped proportionally and row counts are low all the way up — a logic bug would skew specific slices, not uniformly thin every layer.' },
      { id: 'b', label: 'Incremental filter dropped rows', correct: false, why: 'Plausible, and worth ruling out — but fct_orders is low because its INPUT is low. stg_orders and raw.orders are already short, upstream of any incremental logic.' },
      { id: 'c', label: 'Source arrived late / incomplete — ingestion stopped at 23:10', correct: true, why: 'Correct. raw.orders has no rows after 23:10. The connector failed late last night and only partial data loaded. dbt faithfully transformed exactly what it was given.' },
      { id: 'd', label: 'A relationships test dropped orphaned orders', correct: false, why: 'Tests do not delete rows — they pass/fail. And tests were green. This cannot thin the fact.' },
    ],
    root: 'The Fivetran orders connector errored at 23:10 and loaded only partial data. dbt ran on schedule and transformed exactly what was in raw — correctly — so ~3,000 late-evening orders were simply absent.',
    writeup: {
      cause: 'Upstream ingestion failure: the orders connector stopped at 23:10, so raw.orders was incomplete when dbt ran at 02:15.',
      impact: 'Daily revenue understated ~18% for one day; every downstream slice thin but internally consistent.',
      detection: 'A source freshness check that errors when raw.orders is older than expected, plus a row-count/volume anomaly test on fct_orders, would have caught it before the build.',
      resolution: 'Re-run the connector to backfill, then `dbt build --select +fct_daily_revenue` to reprocess the day. With a lookback window the incremental fact picks up the backfilled rows automatically.',
      prevention: 'Gate the dbt run on source freshness (fail, not warn), add a volume/anomaly test, and alert on connector failure so the pipeline halts instead of publishing a thin dashboard.',
    },
    deeper: { id: 'm23', label: 'Source & Freshness →' },
  },
  {
    id: 'schema-change', icon: '🔀', title: 'customer_id changed from INTEGER to STRING',
    severity: 'Critical', paged: '02:18 — dbt build failed, pipeline halted',
    symptom: 'Overnight the Customer service shipped a change: customer_id is now a STRING (e.g. "C1001") instead of an INTEGER. The 02:15 dbt build failed. What broke, and is a hard failure good or bad here?',
    trace: [
      { node: 'raw.customers', check: 'customer_id now arrives as text. Ingestion happily loaded it — connectors rarely enforce types.' },
      { node: 'stg_customers', check: 'If staging casts customer_id to integer, the cast fails on "C1001" → model errors. If it does not cast, the type now mismatches orders downstream.' },
      { node: 'relationships / join', check: 'fct_orders joins orders.customer_id (still INTEGER) to dim_customer.customer_id (now STRING). The join type-mismatches or silently matches nothing.' },
      { node: 'contract', check: 'If fct_orders has a model contract declaring customer_id as INTEGER, dbt fails the build immediately at compile — the earliest, cheapest place to catch it.' },
    ],
    hypotheses: [
      { id: 'a', label: 'The hard failure is bad — we should coerce and keep going', correct: false, why: 'Silently coercing a key type is how you get wrong joins and a dashboard that looks fine but matches the wrong customers. A loud failure is the safe outcome here.' },
      { id: 'b', label: 'The hard failure is correct — it stopped bad data before the dashboard', correct: true, why: 'Exactly. A contract/test failure halted the build the moment the key type changed, so no mis-joined data reached BI. Now you fix it deliberately.' },
      { id: 'c', label: 'dbt should auto-migrate the type', correct: false, why: 'dbt does not guess type migrations for you — that is a schema decision with real consequences (key semantics, joins). It surfaces the break and lets you decide.' },
    ],
    root: 'An upstream schema change altered the type of a join key. A model contract (or a type-sensitive cast/test) on customer_id turned a silent, dangerous mismatch into an immediate, named build failure.',
    writeup: {
      cause: 'The source team changed customer_id from INTEGER to STRING without a coordinated contract change downstream.',
      impact: 'Build halted at staging/marts. Nothing wrong reached BI — the cost was a failed run, not bad data.',
      detection: 'A model contract on fct_orders / dim_customer (enforced column types) and/or a cast in staging that fails loudly on non-numeric input.',
      resolution: 'Decide the canonical type (STRING is the new reality), update staging casts and the contract to STRING, align the join on both sides, and re-build the affected subtree.',
      prevention: 'Contracts on public models, a source schema test, and a data-contract / change-notification process with the upstream team so schema changes are coordinated, not discovered at 02:18.',
    },
    deeper: { id: 'm22', label: 'Testing & Data Quality →' },
  },
  {
    id: 'incremental-bug', icon: '⏰', title: 'A late-arriving order never shows up',
    severity: 'Medium', paged: '11:40 — finance: "an order is missing from the fact"',
    symptom: 'Order 20456 was placed Sept 29 but only landed in raw on Oct 1 (a mobile sync delay). It exists in raw.orders and stg_orders — but it is missing from fct_orders. Tests are green. Why?',
    trace: [
      { node: 'raw.orders', check: 'Order 20456 is present. order_date = Sept 29, created_at/_loaded_at = Oct 1. The data is there.' },
      { node: 'stg_orders', check: 'Present too — staging is a faithful view over raw. So the row survives to the staging layer.' },
      { node: 'fct_orders (incremental)', check: 'MISSING. Look at the incremental filter: `where order_date > (select max(order_date) from {{ this }})`. max(order_date) is Oct 1, so an order dated Sept 29 is filtered OUT — it is "older" than the high-water mark.' },
      { node: 'the filter', check: 'The naive high-water-mark on order_date assumes data arrives in order of order_date. Late-arriving rows (dated in the past, loaded today) fall below the watermark and are skipped forever.' },
    ],
    hypotheses: [
      { id: 'a', label: 'The order is genuinely missing from the source', correct: false, why: 'It is in raw.orders and stg_orders. The data arrived — the incremental model chose not to process it.' },
      { id: 'b', label: 'A test deleted it', correct: false, why: 'Tests never delete rows, and they are green. This is a selection problem, not a quality gate.' },
      { id: 'c', label: 'The incremental high-water-mark on order_date skips late-arriving rows', correct: true, why: 'Correct. `order_date > max(order_date)` filters by the business date. An order dated Sept 29 loaded on Oct 1 is below the Oct 1 watermark, so it is never picked up. This is the classic late-arriving-data trap.' },
    ],
    root: 'A naive incremental filter keyed on the business date (order_date) with a strict high-water-mark permanently skips rows that arrive late (dated in the past). The fix is a lookback window on a load timestamp plus a MERGE on the unique key.',
    fixCode:
`{{ config(materialized='incremental', unique_key='order_id',
          incremental_strategy='merge') }}

select * from {{ ref('int_orders_enriched') }}

{% if is_incremental() %}
  -- Reprocess a 3-day window by LOAD time, not business date,
  -- then MERGE on order_id. Late-arriving Sept 29 rows loaded
  -- on Oct 1 fall inside the window and get merged in.
  where _loaded_at >= (select dateadd(day, -3, max(_loaded_at)) from {{ this }})
{% endif %}`,
    writeup: {
      cause: 'Incremental high-water-mark used the business date (order_date) with a strict `>`; late-arriving rows dated in the past never cross the watermark.',
      impact: 'Silent, ongoing under-count — any order that syncs late is permanently absent from the fact. No error, green tests.',
      detection: 'A reconciliation test comparing stg_orders count to fct_orders count for recent dates would flag the gap.',
      resolution: 'Switch the filter to a lookback window on _loaded_at (or updated_at) and MERGE on order_id so reprocessed rows upsert instead of duplicate; backfill the window once.',
      prevention: 'Default to lookback + merge for any source with late-arriving data; never assume rows arrive in business-date order.',
    },
    deeper: { id: 'm21', label: 'Incremental Strategies →' },
  },
];

// ── Architecture decision points (Wave C) ────────────────────────────────────
// Each: a real design question on this project, options, the recommended pick,
// and the five-part justification the spec asks for.
export const DECISIONS = [
  {
    id: 'fct-orders-mat', q: 'fct_orders holds ~100M rows and grows ~500K/day. How should it be materialized?',
    options: [
      { id: 'view', label: 'View' },
      { id: 'table', label: 'Table (full rebuild nightly)' },
      { id: 'incremental', label: 'Incremental (merge)', correct: true },
      { id: 'ephemeral', label: 'Ephemeral' },
    ],
    why: 'At 100M rows a full rebuild is slow and expensive every night, and a view would re-scan everything on every query. Incremental with a merge on order_id processes only new/changed rows.',
    prod: 'Add a lookback window on load time so late-arriving orders are not missed, and a unique_key so the merge upserts instead of duplicating.',
    alt: 'A full-refresh table is fine while the fact is small; switch to incremental once the rebuild time or warehouse cost actually hurts — do not prematurely optimize.',
    interview: '"Incremental, merge strategy, unique_key order_id, lookback window — because a nightly full rebuild of 100M rows is the expensive part, and late data must still land."',
  },
  {
    id: 'where-join', q: 'The orders→customers→products join is reused by three marts. Where should it live?',
    options: [
      { id: 'staging', label: 'In each staging model' },
      { id: 'intermediate', label: 'In an intermediate model', correct: true },
      { id: 'mart', label: 'Copy it into each mart' },
      { id: 'macro', label: 'In a macro' },
    ],
    why: 'Staging is 1:1 with sources (no joins). Copying the join into three marts is the duplication problem dbt exists to kill. An intermediate model builds the enriched join once and every mart refs it.',
    prod: 'Name it for its purpose (int_orders_enriched), materialize as a table since it is reused, and test its grain so downstream marts can trust it.',
    alt: 'A macro suits reusable SQL logic (a calculation), not a reusable joined dataset — you want one built table, not the same join re-executed in every mart.',
    interview: '"Intermediate — the join is shared by multiple marts, so build it once there and ref it, rather than duplicating logic in staging or marts."',
  },
  {
    id: 'who-owns-dep', q: '"Wait for Fivetran ingestion to finish, THEN build dbt." Who should own that dependency?',
    options: [
      { id: 'dbt', label: 'dbt (via a source)' },
      { id: 'airflow', label: 'Airflow (orchestrator)', correct: true },
      { id: 'both', label: 'Both, duplicated' },
      { id: 'cron', label: 'Two independent cron jobs' },
    ],
    why: 'Cross-system sequencing (ingestion → transformation → BI) is orchestration. dbt owns dependencies INSIDE its project (model→model); it should not poll Fivetran. Airflow waits for the ingestion signal, then triggers dbt build.',
    prod: 'Airflow sensor/dependency on the Fivetran sync, then one task runs dbt build; dbt resolves model order itself. Independent crons race and silently build on stale data.',
    alt: 'dbt source freshness can GATE the run (fail if raw is stale), but it does not schedule or wait — that is still Airflow\'s job.',
    interview: '"Airflow owns cross-system ordering; dbt owns model-level dependencies. One Airflow task calls dbt build after ingestion completes."',
  },
  {
    id: 'where-test', q: 'You must guarantee order_id is unique in fct_orders. Where does that test belong?',
    options: [
      { id: 'yaml-fct', label: 'A unique test on fct_orders.order_id', correct: true },
      { id: 'bi', label: 'A check in the BI tool' },
      { id: 'manual', label: 'A manual SQL query you run sometimes' },
      { id: 'staging', label: 'Only on stg_orders' },
    ],
    why: 'The guarantee is about the fact\'s grain (one row per order), so the test lives on the fact in dbt and runs on every build — failing the build before bad data ships. A BI check or manual query catches it late, if at all.',
    prod: 'unique + not_null on the key; build (not run) so a failure gates downstream. Testing only staging misses fan-out introduced by a join in intermediate/marts.',
    alt: 'Test staging too for source quality — but the grain guarantee specifically belongs on the model whose grain it is.',
    interview: '"On fct_orders, as a unique+not_null test, run via dbt build so the grain is enforced every run, not assumed."',
  },
  {
    id: 'stg-mat', q: 'stg_orders is a light rename/recast over a source that changes often. Materialization?',
    options: [
      { id: 'view', label: 'View', correct: true },
      { id: 'table', label: 'Table' },
      { id: 'incremental', label: 'Incremental' },
      { id: 'ephemeral', label: 'Ephemeral' },
    ],
    why: 'Staging is cheap, light work that must always reflect the latest source. A view re-reads live each time (always fresh, no storage). A table would add storage and go stale between builds for no benefit.',
    prod: 'Views for staging is the common default; switch a specific staging model to table/ephemeral only if it is heavy and reused and profiling shows it matters.',
    alt: 'Ephemeral works if the staging model is only ever referenced by one downstream model and you want it inlined — but views keep it inspectable in the warehouse.',
    interview: '"View — staging is light and must stay fresh; persisting it as a table just adds storage and staleness."',
  },
];

// ── Fifteen project-specific interview questions (Wave C) ────────────────────
// {q, expected (one-liner), detailed, followup, senior}
export const INTERVIEW = [
  { q: 'Walk me through how you would use dbt in this e-commerce architecture.',
    expected: 'dbt is the T: it transforms data already landed in the warehouse by ingestion, into tested, documented marts the BI tool reads.',
    detailed: 'Fivetran/CDC lands raw orders/customers/products/payments into a RAW schema. dbt reads those via source(), builds staging (clean/recast, one per source), intermediate (the shared enriched join), then marts (dim_customer, dim_product, fct_orders, fct_daily_revenue). Tests and freshness gate the build; Airflow sequences ingestion→dbt→BI; Power BI reads fct_daily_revenue.',
    followup: 'Where does dbt NOT fit? → extraction, the warehouse itself, orchestration, streaming.',
    senior: 'Call out the layer boundaries and why each exists, and that ref()/source() give you build order + lineage for free. Mention Slim CI and environments as the operational reality.' },
  { q: 'Why did you create a staging layer instead of reading raw directly?',
    expected: 'Staging is a stable, cleaned interface so a source change is absorbed in one place and downstream never touches raw.',
    detailed: 'stg_ models rename, recast and standardize (country casing, status values, types) one-to-one with each source — no joins. Every downstream model refs the stg_ model, so when the source schema shifts you fix one file, not twenty.',
    followup: 'What do you deliberately NOT do in staging? → joins, aggregations, business logic.',
    senior: 'Staging is the anti-corruption layer between messy OLTP sources and your business logic; it also makes lineage and testing clean.' },
  { q: 'Why do you need an intermediate layer?',
    expected: 'To hold joins/business logic too heavy for staging and to share logic across multiple marts, built once.',
    detailed: 'int_orders_enriched joins staged orders, customers, products and aggregated payments into one enriched order grain. Three marts reuse it, so the join is defined and built once instead of duplicated.',
    followup: 'When would you skip it? → a small project where no logic is shared and marts can ref staging directly.',
    senior: 'Intermediate is an implementation detail (not business-facing); its value is DRY joins and readable marts, at the cost of one more materialized layer.' },
  { q: 'What is the grain of fct_orders, and why does it matter?',
    expected: 'One row per order. Grain defines what every aggregation and join assumes.',
    detailed: 'If a join fans out (e.g. two payment rows per order), the grain silently becomes one row per order-payment and every revenue sum double-counts. Stating and testing grain (unique on order_id) prevents that.',
    followup: 'And fct_daily_revenue? → one row per day × country × category × channel.',
    senior: '"What is one row?" is the first question to ask of any fact; a unique test turns the grain from an assumption into an enforced contract.' },
  { q: 'Why is fct_orders incremental?',
    expected: '~100M rows — a nightly full rebuild is too slow/expensive, so process only new/changed rows.',
    detailed: 'config(materialized=incremental, unique_key=order_id, strategy=merge). is_incremental() adds a filter so only recent rows are read; merge upserts on order_id so re-processed rows do not duplicate.',
    followup: 'What breaks with a naive filter? → late-arriving data below the high-water-mark is skipped.',
    senior: 'Use a lookback window on load time (not business date) plus merge; incremental trades correctness-complexity for cost, so only reach for it when rebuild cost actually hurts.' },
  { q: 'What happens if a late-arriving record appears (order dated Sept 29, loaded Oct 1)?',
    expected: 'A naive order_date high-water-mark skips it permanently; a lookback window on load time + merge catches it.',
    detailed: 'where order_date > max(order_date) filters by business date, so a Sept 29 row loaded after Oct 1 is below the watermark and never processed. Switching to _loaded_at within a lookback window and merging on order_id fixes it.',
    followup: 'How would you detect this in production? → reconcile stg_orders vs fct_orders counts for recent dates.',
    senior: 'This is the single most common incremental bug; default to lookback+merge for any source that can arrive late.' },
  { q: 'How does Airflow interact with dbt here?',
    expected: 'Airflow sequences the cross-system workflow; dbt sequences the models inside its project.',
    detailed: 'Airflow waits for Fivetran ingestion, triggers one dbt build task, then runs freshness/tests and refreshes BI. dbt resolves model order from ref()/source() — Airflow does not know model dependencies.',
    followup: 'Why not model each dbt model as an Airflow task? → you maintain dependencies twice and lose dbt selectors.',
    senior: 'Orchestration vs transformation is a clean separation of concerns; tools like Cosmos can expose dbt models in Airflow without duplicating the DAG by hand.' },
  { q: 'How would you debug a failed dbt model in this pipeline?',
    expected: 'Read run_results for the error, reproduce with the compiled SQL, then walk the lineage up to isolate the layer.',
    detailed: 'Check the failed node and message, inspect target/compiled SQL, run it directly in the warehouse, then move up the DAG (fct→int→stg→raw) checking row counts and types until the first bad layer is found.',
    followup: 'Model passed but numbers are wrong? → it is a grain/join/logic bug, not an error; reconcile counts layer by layer.',
    senior: 'Separate "it errored" (compile/run) from "it is wrong" (logic/grain); artifacts + lineage make the search a binary walk, not guesswork.' },
  { q: 'How would you prevent bad data from reaching the dashboard?',
    expected: 'Tests + source freshness run as part of dbt build, so failures block downstream models.',
    detailed: 'unique/not_null/relationships/accepted_values on keys and statuses, source freshness gates, and dbt build (not run) so a failed test skips downstream. Add volume/anomaly tests for the revenue-drop class of incident.',
    followup: 'Test vs contract? → contracts enforce schema/types at compile; tests check data at run.',
    senior: 'Defense in depth: freshness (did data arrive), contracts (right shape), tests (right values), anomaly checks (right magnitude) — fail the build, not the dashboard.' },
  { q: 'How would you implement CI/CD for this project?',
    expected: 'PR triggers dbt parse + build state:modified+ --defer against a temp schema, tests run, green+review → merge → deploy.',
    detailed: 'CI builds only changed models and their children (Slim CI), deferring unchanged refs to production artifacts, so checks are fast. Merge to main triggers the production deploy job against the prod target.',
    followup: 'What do state:modified+ and --defer each do? → select changed+downstream; resolve unbuilt refs to prod.',
    senior: 'Slim CI keeps checks cheap at scale; pair with a prod manifest as the --state baseline and environment-scoped credentials.' },
  { q: 'How would you handle the customer_id INTEGER→STRING schema change?',
    expected: 'A contract/test fails the build loudly; then decide the canonical type, update casts/contract, realign the join, rebuild.',
    detailed: 'A model contract on the key catches the type change at compile — the safe, early failure. You pick STRING as the new reality, update staging casts and the contract, fix both sides of the join, and rebuild the affected subtree.',
    followup: 'Is the hard failure good? → yes; silent coercion causes wrong joins that look fine.',
    senior: 'Contracts on public models plus a change-notification process with the upstream team turn schema drift from a 2am surprise into a coordinated change.' },
  { q: 'Why use ref() instead of hardcoded schema.table names?',
    expected: 'ref() gives automatic build order, lineage, and environment-aware schema resolution.',
    detailed: 'dbt reads ref()/source() to build the DAG and know what to build when; it also resolves the right schema per target (dev vs prod). Hardcoding throws away ordering, lineage, and cross-environment portability.',
    followup: 'What breaks downstream if someone hardcodes? → lineage gaps and dev/prod schema mismatches.',
    senior: 'ref() is not a style preference — it is the mechanism that makes dbt a dependency graph rather than a pile of SQL scripts.' },
  { q: 'How would you optimize this pipeline if the nightly run got too slow?',
    expected: 'Profile first, then: incremental on the big fact, right materializations, prune/cluster, and parallelize via threads.',
    detailed: 'Find the slow nodes from run_results timings. Make the large fact incremental, keep staging as views, cluster/partition large tables on the join/filter keys, raise threads, and avoid re-scanning with lookback windows sized correctly.',
    followup: 'When NOT to make something incremental? → while it is small; the complexity is not worth it yet.',
    senior: 'Optimize from evidence (timings), not vibes; the biggest wins are usually one or two models, not the whole project.' },
  { q: 'What happens internally when `dbt build` runs?',
    expected: 'Parse → compile Jinja to SQL → build the DAG → run models and tests in dependency order, gating downstream on failures.',
    detailed: 'dbt parses the project into a manifest, compiles each model\'s Jinja-SQL to warehouse SQL, orders nodes by ref()/source(), then runs models + tests + seeds + snapshots in that order; a failed test skips its downstream. Artifacts (manifest/run_results/catalog) are written.',
    followup: 'build vs run? → build adds tests/seeds/snapshots with test gating.',
    senior: 'The manifest is the compiled truth of the project; everything (selection, lineage, docs, state) is derived from it.' },
  { q: 'How would you monitor dbt in production?',
    expected: 'Parse run_results for pass/fail/timings, alert on failure, and watch source freshness.',
    detailed: 'Surface run_results.json as a run dashboard (models/tests pass-fail, durations), alert on any failure to Slack/pager, and monitor source freshness so a stale source is caught before the build publishes a thin dashboard.',
    followup: 'Why alert on failure, not success? → success is the norm; noise trains people to ignore alerts.',
    senior: 'Treat artifacts as the source of truth for observability; add volume/anomaly checks so "green but wrong" (the revenue-drop incident) is also caught.' },
];

// End-to-end "zero to production" summary (Wave C uses the full version).
export const ZERO_TO_PROD = [
  { stage: 'Business requirement', who: 'Product', tech: '—', fails: 'Wrong grain designed', monitor: 'Review' },
  { stage: 'Source systems', who: 'App teams', tech: 'Postgres/MySQL', fails: 'Schema change', monitor: 'Contracts' },
  { stage: 'Ingestion', who: 'Platform', tech: 'Fivetran/CDC', fails: 'Late/partial load', monitor: 'Freshness' },
  { stage: 'Raw', who: 'Ingestion', tech: 'Snowflake', fails: 'Transform-on-load', monitor: 'Row counts' },
  { stage: 'dbt sources', who: 'AE', tech: 'sources.yml', fails: 'Hardcoded names', monitor: 'Freshness' },
  { stage: 'Staging', who: 'AE', tech: 'dbt view', fails: 'Joins in staging', monitor: 'Tests' },
  { stage: 'Intermediate', who: 'AE', tech: 'dbt table', fails: 'Dumping ground', monitor: 'Tests' },
  { stage: 'Marts', who: 'AE', tech: 'dbt table/incr', fails: 'Mixed grain', monitor: 'Tests' },
  { stage: 'Tests', who: 'AE', tech: 'dbt test', fails: 'Missing relationships', monitor: 'run_results' },
  { stage: 'Orchestration', who: 'Platform', tech: 'Airflow', fails: 'Deps duplicated', monitor: 'DAG status' },
  { stage: 'CI/CD', who: 'AE', tech: 'Actions', fails: 'No Slim CI', monitor: 'PR checks' },
  { stage: 'Production', who: 'Platform', tech: 'targets', fails: 'Dev hits prod', monitor: 'Audit' },
  { stage: 'Monitoring', who: 'On-call', tech: 'alerts', fails: 'Silent skip', monitor: 'Paging' },
  { stage: 'BI', who: 'BI', tech: 'Power BI', fails: 'SQL on raw', monitor: 'Usage' },
];
