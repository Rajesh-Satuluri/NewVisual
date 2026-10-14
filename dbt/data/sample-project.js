// ─────────────────────────────────────────────────────────────────────────────
// Sample dbt project — "jaffle_commerce"
//
// A complete, realistic dbt project rendered as a browsable file tree and
// offered as a downloadable, actually-runnable project (DuckDB adapter, so it
// needs no warehouse). Everything here is real dbt project source — the same
// files you would `dbt run`. Nothing is executed in the browser; the Explorer
// only *displays* and *packages* these files. Run instructions ship in README.
//
// Schema: FILES is a flat map of POSIX path → { lang, body }. The tree UI is
// derived from the paths, so adding a file here automatically lists it.
// ─────────────────────────────────────────────────────────────────────────────

export const PROJECT_NAME = 'jaffle_commerce';

export const FILES = {
  'README.md': {
    lang: 'md',
    body: `# jaffle_commerce — a runnable dbt sample project

A small but complete e-commerce analytics project: raw sources → staging →
marts, with tests, a macro, a snapshot and seeds. It targets **DuckDB**, so it
runs on your laptop with no warehouse and no cloud account.

## Run it (3 commands)

\`\`\`bash
pip install dbt-duckdb        # the adapter (pulls in dbt-core)
dbt seed                      # load the CSV seeds into DuckDB
dbt build                     # run models + tests + snapshots, in DAG order
\`\`\`

Then explore:

\`\`\`bash
dbt docs generate && dbt docs serve   # lineage graph + column docs
duckdb jaffle.duckdb "select * from analytics_marts.fct_orders limit 5"
\`\`\`

## Layout

| Path | What it is |
|------|------------|
| \`dbt_project.yml\` | Project config: name, paths, model materializations |
| \`profiles.yml\` | Connection (DuckDB file) — normally lives in ~/.dbt |
| \`packages.yml\` | A package dependency (dbt_utils) |
| \`models/staging/\` | 1:1 cleanups of each source (views) |
| \`models/marts/\` | Business entities: fct_orders, dim_customers (tables) |
| \`models/**/*.yml\` | Source defs, tests, and column documentation |
| \`macros/\` | A reusable \`cents_to_dollars\` macro |
| \`snapshots/\` | SCD-2 history of customer records |
| \`seeds/\` | Small CSVs loaded as tables (\`dbt seed\`) |

Everything here is standard dbt. Swap \`profiles.yml\` for Snowflake/BigQuery/
Postgres and the same models run on your warehouse.`,
  },

  'dbt_project.yml': {
    lang: 'yaml',
    body: `name: 'jaffle_commerce'
version: '1.0.0'
config-version: 2

profile: 'jaffle_commerce'

model-paths: ["models"]
seed-paths: ["seeds"]
snapshot-paths: ["snapshots"]
macro-paths: ["macros"]
test-paths: ["tests"]

target-path: "target"
clean-targets:
  - "target"
  - "dbt_packages"

models:
  jaffle_commerce:
    staging:
      +materialized: view
    marts:
      +materialized: table`,
  },

  'profiles.yml': {
    lang: 'yaml',
    body: `# Normally lives in ~/.dbt/profiles.yml, not in the repo.
# Kept here so the sample runs with zero setup.
jaffle_commerce:
  target: dev
  outputs:
    dev:
      type: duckdb
      path: jaffle.duckdb
      threads: 4`,
  },

  'packages.yml': {
    lang: 'yaml',
    body: `packages:
  - package: dbt-labs/dbt_utils
    version: [">=1.1.0", "<2.0.0"]`,
  },

  'models/staging/_sources.yml': {
    lang: 'yaml',
    body: `version: 2

sources:
  - name: raw
    description: Raw application tables loaded by the ingestion pipeline.
    schema: main
    freshness:
      warn_after: {count: 24, period: hour}
      error_after: {count: 48, period: hour}
    loaded_at_field: _loaded_at
    tables:
      - name: raw_customers
      - name: raw_orders
      - name: raw_payments
        freshness: null   # payments load on a different cadence`,
  },

  'models/staging/stg_customers.sql': {
    lang: 'sql',
    body: `with source as (
    select * from {{ source('raw', 'raw_customers') }}
)

select
    id            as customer_id,
    first_name,
    last_name,
    _loaded_at    as loaded_at
from source`,
  },

  'models/staging/stg_orders.sql': {
    lang: 'sql',
    body: `with source as (
    select * from {{ source('raw', 'raw_orders') }}
)

select
    id            as order_id,
    user_id       as customer_id,
    order_date,
    status
from source`,
  },

  'models/staging/stg_payments.sql': {
    lang: 'sql',
    body: `with source as (
    select * from {{ source('raw', 'raw_payments') }}
)

select
    id                               as payment_id,
    order_id,
    payment_method,
    {{ cents_to_dollars('amount') }} as amount
from source`,
  },

  'models/staging/_staging.yml': {
    lang: 'yaml',
    body: `version: 2

models:
  - name: stg_customers
    columns:
      - name: customer_id
        description: Primary key for a customer.
        data_tests: [unique, not_null]

  - name: stg_orders
    columns:
      - name: order_id
        data_tests: [unique, not_null]
      - name: customer_id
        data_tests:
          - not_null
          - relationships:
              to: ref('stg_customers')
              field: customer_id
      - name: status
        data_tests:
          - accepted_values:
              values: ['placed', 'shipped', 'completed', 'returned']

  - name: stg_payments
    columns:
      - name: payment_id
        data_tests: [unique, not_null]`,
  },

  'models/marts/fct_orders.sql': {
    lang: 'sql',
    body: `with orders as (
    select * from {{ ref('stg_orders') }}
),

payments as (
    select
        order_id,
        sum(amount) as amount
    from {{ ref('stg_payments') }}
    group by 1
)

select
    orders.order_id,
    orders.customer_id,
    orders.order_date,
    orders.status,
    coalesce(payments.amount, 0) as amount
from orders
left join payments using (order_id)`,
  },

  'models/marts/dim_customers.sql': {
    lang: 'sql',
    body: `with customers as (
    select * from {{ ref('stg_customers') }}
),

orders as (
    select * from {{ ref('fct_orders') }}
),

customer_orders as (
    select
        customer_id,
        min(order_date) as first_order_date,
        count(*)        as number_of_orders,
        sum(amount)     as lifetime_value
    from orders
    group by 1
)

select
    customers.customer_id,
    customers.first_name,
    customers.last_name,
    customer_orders.first_order_date,
    coalesce(customer_orders.number_of_orders, 0) as number_of_orders,
    coalesce(customer_orders.lifetime_value, 0)   as lifetime_value
from customers
left join customer_orders using (customer_id)`,
  },

  'models/marts/_marts.yml': {
    lang: 'yaml',
    body: `version: 2

models:
  - name: fct_orders
    description: One row per order, with total payment amount.
    columns:
      - name: order_id
        description: Primary key.
        data_tests: [unique, not_null]
      - name: amount
        description: Total paid for the order, in dollars.
        data_tests:
          - dbt_utils.accepted_range:
              min_value: 0

  - name: dim_customers
    description: One row per customer, with order history rollups.
    columns:
      - name: customer_id
        data_tests: [unique, not_null]
      - name: lifetime_value
        description: Sum of all order amounts for the customer.`,
  },

  'macros/cents_to_dollars.sql': {
    lang: 'sql',
    body: `{% macro cents_to_dollars(column_name, scale=2) %}
    round({{ column_name }} / 100.0, {{ scale }})
{% endmacro %}`,
  },

  'snapshots/customers_snapshot.sql': {
    lang: 'sql',
    body: `{% snapshot customers_snapshot %}
{{
    config(
      target_schema='snapshots',
      unique_key='customer_id',
      strategy='check',
      check_cols=['first_name', 'last_name']
    )
}}
select * from {{ ref('stg_customers') }}
{% endsnapshot %}`,
  },

  'tests/assert_positive_order_amount.sql': {
    lang: 'sql',
    body: `-- Singular test: fails (returns rows) if any order amount is negative.
select order_id, amount
from {{ ref('fct_orders') }}
where amount < 0`,
  },

  'seeds/raw_customers.csv': {
    lang: 'csv',
    body: `id,first_name,last_name,_loaded_at
1,Michael,P.,2024-01-01
2,Shawn,M.,2024-01-01
3,Kathleen,P.,2024-01-02
4,Jimmy,C.,2024-01-02`,
  },

  'seeds/raw_orders.csv': {
    lang: 'csv',
    body: `id,user_id,order_date,status
1,1,2024-01-03,completed
2,1,2024-01-05,completed
3,2,2024-01-06,shipped
4,3,2024-01-07,placed
5,4,2024-01-08,returned`,
  },

  'seeds/raw_payments.csv': {
    lang: 'csv',
    body: `id,order_id,payment_method,amount
1,1,credit_card,1000
2,2,credit_card,2000
3,3,coupon,500
4,4,bank_transfer,1500
5,5,credit_card,3000`,
  },

  '.gitignore': {
    lang: 'text',
    body: `target/
dbt_packages/
logs/
*.duckdb`,
  },
};

// Ordered list of top-level groups for the tree (anything not listed falls to
// "root"). Kept explicit so the file browser reads in dbt's own mental order.
export const TREE_ORDER = [
  'dbt_project.yml', 'profiles.yml', 'packages.yml', 'README.md', '.gitignore',
  'models/', 'macros/', 'snapshots/', 'tests/', 'seeds/',
];

export const fileCount = Object.keys(FILES).length;
