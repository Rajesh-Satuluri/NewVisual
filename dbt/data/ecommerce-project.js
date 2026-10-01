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
