// Cheat sheet — quick-reference cards for dbt CLI, Jinja/config, tests & more.
import { createModuleShell } from '../components/module-shell.js';

const CARDS = [
  {
    icon: '⌨️', title: 'CLI commands',
    rows: [
      ['Run all models', 'dbt run'],
      ['Run one + its children', 'dbt run --select my_model+'],
      ['Run a folder', 'dbt run --select staging.*'],
      ['Run changed + downstream', 'dbt build --select state:modified+'],
      ['Run tests', 'dbt test'],
      ['Run models + tests together', 'dbt build'],
      ['Load CSV seeds', 'dbt seed'],
      ['Build snapshots', 'dbt snapshot'],
      ['Generate + serve docs', 'dbt docs generate && dbt docs serve'],
      ['Compile without running', 'dbt compile'],
    ],
  },
  {
    icon: '🧬', title: 'Jinja & config',
    rows: [
      ['Reference a model', "{{ ref('stg_orders') }}"],
      ['Reference a source', "{{ source('shop', 'orders') }}"],
      ['Set materialization', "{{ config(materialized='table') }}"],
      ['Incremental config', "{{ config(materialized='incremental', unique_key='id') }}"],
      ['Only-new-rows guard', '{% if is_incremental() %} … {% endif %}'],
      ['Call a macro', '{{ cents_to_dollars("amount") }}'],
      ['Loop', "{% for c in ['a','b'] %} … {% endfor %}"],
      ['Var / env var', "{{ var('start_date') }} · {{ env_var('DBT_KEY') }}"],
    ],
  },
  {
    icon: '🧪', title: 'Tests (schema.yml)',
    rows: [
      ['Uniqueness', 'tests: [unique]'],
      ['Non-null', 'tests: [not_null]'],
      ['Allowed values', "accepted_values: {values: ['a','b']}"],
      ['Foreign key', "relationships: {to: ref('dim_x'), field: id}"],
      ['Source freshness', 'freshness: {warn_after: {count: 12, period: hour}}'],
      ['Singular test', 'A .sql in tests/ returning rows that should NOT exist'],
    ],
  },
  {
    icon: '🏗️', title: 'Materializations',
    rows: [
      ['view', 'Default. No storage; recomputed on query. Cheap, always fresh.'],
      ['table', 'Rebuilt fully each run. Fast to query, costs compute to build.'],
      ['incremental', 'Appends/merges only new rows. For big, append-heavy tables.'],
      ['ephemeral', 'Not built; inlined as a CTE into models that ref it.'],
      ['snapshot', 'Type-2 SCD history of a mutable source (separate dir).'],
    ],
  },
  {
    icon: '📁', title: 'Project structure',
    rows: [
      ['models/staging/', 'stg_<source>__<entity>.sql — one per source'],
      ['models/intermediate/', 'int_<thing>.sql — reusable joins/logic'],
      ['models/marts/<domain>/', 'fct_ / dim_ — analytics-ready tables'],
      ['macros/', 'Reusable Jinja functions'],
      ['tests/', 'Singular (custom) tests'],
      ['snapshots/', 'SCD-2 snapshot definitions'],
      ['seeds/', 'Static CSV lookup tables'],
      ['dbt_project.yml', 'Project config: paths, materializations, vars'],
    ],
  },
  {
    icon: '📐', title: 'Naming conventions',
    rows: [
      ['Staging', 'stg_<source>__<entity>  (e.g. stg_shopify__orders)'],
      ['Facts', 'fct_<business_process>  (e.g. fct_orders)'],
      ['Dimensions', 'dim_<entity>  (e.g. dim_customers)'],
      ['Intermediate', 'int_<entity>_<verb>  (e.g. int_orders_joined)'],
      ['Primary key', '<entity>_id, tested unique + not_null'],
      ['Booleans', 'is_ / has_ prefix (is_active, has_paid)'],
    ],
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Reference · Cheat Sheet',
    title: 'dbt Cheat Sheet',
    subtitle: 'The commands, config, tests and conventions you\'ll actually reach for. Hover a code snippet to copy it.',
    tabs: [{ id: 'c', label: '📋 Quick Reference' }],
  });

  container.querySelector('#tab-c').innerHTML = `
    <div class="cheat-grid">
      ${CARDS.map(card => `
        <div class="cheat-card">
          <div class="cheat-head">${card.icon} ${card.title}</div>
          <div class="cheat-body">
            ${card.rows.map(r => `
              <div class="cheat-row">
                <div class="cheat-k">${r[0]}</div>
                <div class="cheat-v">${r[1].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
              </div>`).join('')}
          </div>
        </div>`).join('')}
    </div>
  `;
}
