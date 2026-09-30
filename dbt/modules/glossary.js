// Glossary — searchable + category-filterable dbt terms.
import { createModuleShell } from '../components/module-shell.js';

const TERMS = [
  { name: 'Model', cat: 'Core', def: 'A <code>.sql</code> file in <code>models/</code> containing a single <code>SELECT</code>. dbt wraps it in <code>CREATE TABLE/VIEW AS</code> and materializes it in the warehouse. One model = one table or view.' },
  { name: 'ref()', cat: 'Core', def: 'Jinja function to reference another model: <code>{{ ref(\'stg_orders\') }}</code>. It builds the dependency DAG and resolves to the correct schema-qualified name per environment.' },
  { name: 'source()', cat: 'Core', def: 'Jinja function pointing at raw loaded tables declared in <code>sources.yml</code>: <code>{{ source(\'shop\', \'orders\') }}</code>. Enables freshness tests and lineage from raw inputs.' },
  { name: 'Materialization', cat: 'Core', def: 'How dbt persists a model: <code>view</code>, <code>table</code>, <code>incremental</code>, or <code>ephemeral</code>. Set with <code>{{ config(materialized=\'table\') }}</code>.' },
  { name: 'Staging model', cat: 'Layers', def: 'The <code>stg_</code> layer: one model per source table, doing light cleanup (renaming, casting, deduping). The clean interface the rest of the project builds on.' },
  { name: 'Intermediate model', cat: 'Layers', def: 'The <code>int_</code> layer: reusable joins and business logic that sit between staging and marts. Not exposed to BI directly.' },
  { name: 'Mart', cat: 'Layers', def: 'The <code>fct_</code> / <code>dim_</code> layer: analytics-ready tables organized by business domain (finance, marketing) that dashboards and analysts query.' },
  { name: 'Test', cat: 'Quality', def: 'An assertion about data. Generic tests (<code>unique</code>, <code>not_null</code>, <code>accepted_values</code>, <code>relationships</code>) are declared in YAML; singular tests are custom <code>SELECT</code>s that should return zero rows.' },
  { name: 'Snapshot', cat: 'Features', def: 'A Type-2 slowly-changing-dimension tracker. dbt records history of a mutable source row over time using <code>dbt_valid_from</code> / <code>dbt_valid_to</code> columns.' },
  { name: 'Incremental model', cat: 'Features', def: 'A materialization that processes only new/changed rows on each run instead of rebuilding the whole table — guarded by <code>{% if is_incremental() %}</code> and a unique key.' },
  { name: 'Macro', cat: 'Features', def: 'A reusable Jinja function in <code>macros/</code>. Write SQL-generating logic once (e.g. <code>cents_to_dollars</code>) and call it across models.' },
  { name: 'Jinja', cat: 'Features', def: 'The templating language dbt compiles before running SQL. Powers <code>ref()</code>, <code>config()</code>, loops, conditionals, and macros — <code>{{ }}</code> for expressions, <code>{% %}</code> for statements.' },
  { name: 'DAG', cat: 'Lineage', def: 'Directed Acyclic Graph — the dependency graph dbt builds from every <code>ref()</code>. It decides run order and powers lineage visualization.' },
  { name: 'Lineage', cat: 'Lineage', def: 'The upstream/downstream chain of a model. dbt derives it from the DAG so you can see what a change will break before you ship it.' },
  { name: 'schema.yml', cat: 'Lineage', def: 'YAML file describing models, columns, tests and descriptions. Feeds <code>dbt docs</code> and the searchable data catalog.' },
  { name: 'seed', cat: 'Core', def: 'A CSV in <code>seeds/</code> loaded into the warehouse with <code>dbt seed</code>. Good for small static lookup tables (country codes, mappings).' },
  { name: 'exposure', cat: 'Lineage', def: 'A YAML declaration of a downstream consumer (a dashboard, an app) so it appears in lineage and can be validated with the models it depends on.' },
  { name: 'dbt Core vs Cloud', cat: 'Ops', def: '<strong>Core</strong> is the open-source CLI you run yourself. <strong>Cloud</strong> adds a hosted scheduler, IDE, docs hosting, and CI on top of Core.' },
  { name: 'Model contract', cat: 'Ops', def: 'An enforced schema (column names + types) on a model. Breaks the build if the output shape changes — used to make public models a stable API.' },
  { name: 'dbt mesh', cat: 'Ops', def: 'Cross-project references (<code>ref(\'project\', \'model\')</code>) that let many dbt projects depend on each other\'s public models with lineage spanning all of them.' },
];

const CATS = ['All', ...[...new Set(TERMS.map(t => t.cat))]];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Reference · Glossary',
    title: 'dbt Glossary',
    subtitle: 'Every term in this course, searchable and defined. Filter by category or type to find one fast.',
    tabs: [{ id: 'g', label: '📖 Terms' }],
  });

  const tab = container.querySelector('#tab-g');
  tab.innerHTML = `
    <div class="ref-toolbar">
      <input class="ref-search" type="text" placeholder="Search terms…" aria-label="Search glossary" />
      <div class="ref-chips">${CATS.map((c, i) => `<button class="ref-chip ${i === 0 ? 'active' : ''}" data-cat="${c}">${c}</button>`).join(' ')}</div>
    </div>
    <div class="glossary-grid"></div>
    <div class="ref-empty" hidden>No terms match your search.</div>
  `;

  const grid = tab.querySelector('.glossary-grid');
  const empty = tab.querySelector('.ref-empty');
  const search = tab.querySelector('.ref-search');
  let cat = 'All';

  function render() {
    const q = search.value.trim().toLowerCase();
    const items = TERMS.filter(t =>
      (cat === 'All' || t.cat === cat) &&
      (!q || t.name.toLowerCase().includes(q) || t.def.toLowerCase().includes(q))
    ).sort((a, b) => a.name.localeCompare(b.name));
    grid.innerHTML = items.map(t => `
      <div class="gloss-term">
        <div class="gloss-name">${t.name} <span class="gloss-cat">${t.cat}</span></div>
        <div class="gloss-def">${t.def}</div>
      </div>`).join('');
    empty.hidden = items.length > 0;
  }

  search.addEventListener('input', render);
  tab.querySelector('.ref-chips').addEventListener('click', e => {
    const chip = e.target.closest('.ref-chip');
    if (!chip) return;
    tab.querySelectorAll('.ref-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    cat = chip.dataset.cat;
    render();
  });

  render();
}
