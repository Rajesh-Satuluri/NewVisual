// Comparison — ETL vs ELT vs dbt: feature matrix, when-to-use, interview Q&A.
import { createModuleShell, createIQSection } from '../components/module-shell.js';

const ROWS = [
  ['Where transform runs', 'Separate ETL server (Informatica, SSIS)', 'Inside the warehouse (SQL)', 'Inside the warehouse (SQL + Jinja)'],
  ['Language', 'GUI / proprietary / Python', 'Raw SQL', 'SQL + Jinja + YAML'],
  ['Version control', '<span class="bad">Rarely</span>', 'Manual', '<span class="good">Git-native</span>'],
  ['Tests', '<span class="bad">Bolt-on</span>', 'Hand-written', '<span class="good">Built-in (unique/not_null/…)</span>'],
  ['Docs & lineage', '<span class="bad">Separate tool</span>', '<span class="bad">None</span>', '<span class="good">Auto-generated DAG + catalog</span>'],
  ['Reuse', 'Shared jobs', 'Copy-paste SQL', '<span class="good">ref() + macros + packages</span>'],
  ['Incremental loads', 'Custom coding', 'Custom coding', '<span class="good">Materialization config</span>'],
  ['Compute cost model', 'Pay for ETL server', 'Warehouse only', 'Warehouse only'],
  ['Best for', 'Legacy on-prem, heavy pre-load cleaning', 'Small teams, ad-hoc SQL', '<span class="good">Analytics engineering at scale</span>'],
];

const WHEN = [
  ['Reach for ETL', 'Data must be masked/cleaned <em>before</em> it can legally land in the warehouse, or you\'re on legacy on-prem infra with no cloud warehouse.'],
  ['Reach for plain ELT (raw SQL)', 'A one-person team, a handful of queries, no need for tests, docs or shared logic yet. dbt would be overhead.'],
  ['Reach for dbt', 'Multiple people write SQL, numbers must agree across teams, you need tests + lineage + docs, and you want transformations reviewed in Git like real code.'],
];

const IQ = [
  {
    q: 'Explain the difference between ETL and ELT, and why the industry shifted.',
    a: `<strong>ETL</strong> = Extract → <strong>Transform</strong> (on a separate server) → Load. Transformation happened <em>before</em> data hit the warehouse because storage and compute were expensive and coupled.
    <br><br>
    <strong>ELT</strong> = Extract → Load (raw) → <strong>Transform</strong> in the warehouse. Cloud warehouses (Snowflake, BigQuery, Redshift) decoupled storage from compute and made in-warehouse SQL transformation cheap and elastic. You load raw data first, then transform it with SQL you can iterate on.`,
    tip: 'The one-line answer: "cheap, scalable cloud compute made it cheaper to load first and transform in-place than to maintain a separate ETL tier." dbt is the transform layer of ELT.',
  },
  {
    q: 'Is dbt an ETL tool? Where does it sit?',
    a: `dbt is <strong>only the "T"</strong> of ELT. It does not extract or load — tools like Fivetran, Airbyte or custom loaders get raw data into the warehouse. dbt then transforms that raw data into tested, documented, analytics-ready models using SQL + Jinja, and manages the dependency DAG between them.`,
    tip: 'Saying "dbt is the T in ELT" instantly signals you understand the modern stack boundaries.',
  },
  {
    q: 'A teammate says "we already write SQL, why add dbt?" What do you say?',
    a: `Raw SQL gets you the transformation, but dbt adds the engineering discipline around it: <code>ref()</code> builds a dependency DAG so nothing runs out of order; tests catch bad data before dashboards do; <code>schema.yml</code> gives you searchable docs and lineage; macros kill copy-paste; and everything lives in Git so changes are reviewed and reversible. It turns SQL from scattered scripts into a maintainable software project.`,
    tip: 'Frame it as "SQL + software-engineering best practices," not "a new language."',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Reference · Comparison',
    title: 'ETL vs ELT vs dbt',
    subtitle: 'How the transform layer evolved — and exactly where dbt fits in the modern data stack.',
    tabs: [
      { id: 'matrix', label: '📊 Feature Matrix' },
      { id: 'when',   label: '🧭 When to Use' },
      { id: 'iq',     label: '🎯 Interview Q&A' },
    ],
  });

  container.querySelector('#tab-matrix').innerHTML = `
    <div class="compare-table-wrap">
      <table class="compare-table">
        <thead>
          <tr><th>Dimension</th><th>ETL</th><th>ELT (raw SQL)</th><th class="accent">dbt</th></tr>
        </thead>
        <tbody>
          ${ROWS.map(r => `<tr><td><strong>${r[0]}</strong></td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  container.querySelector('#tab-when').innerHTML = `
    <div class="info-grid">
      ${WHEN.map(w => `
        <div class="info-card" style="border-left-color:var(--accent)">
          <div class="info-card-title">${w[0]}</div>
          <div class="info-card-body">${w[1]}</div>
        </div>`).join('')}
    </div>`;

  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
}
