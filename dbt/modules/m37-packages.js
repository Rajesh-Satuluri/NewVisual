// M37 · dbt Packages & the Ecosystem
// A dbt package is reusable dbt code — macros, models, generic tests — you
// install into your project with packages.yml + `dbt deps`. This module is a
// package explorer (what each key package gives you, with real usage) plus the
// install mechanics. Nothing is executed; the snippets are real, illustrative
// usage of each package.
import { createModuleShell, createIQSection, injectCodeEnhancements } from '../components/module-shell.js';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const PACKAGES = [
  {
    id: 'dbt_utils', name: 'dbt_utils', owner: 'dbt-labs/dbt_utils',
    tagline: 'The standard library — macros and tests nearly every project uses.',
    what: `The toolbox you reach for first. SQL-generating macros — <code>generate_surrogate_key</code>, <code>star</code>,
      <code>union_relations</code>, <code>date_spine</code>, <code>pivot</code>/<code>unpivot</code>,
      <code>get_column_values</code>, <code>safe_divide</code> — plus generic tests the built-ins don't cover, like
      <code>unique_combination_of_columns</code>, <code>accepted_range</code> and <code>equality</code>.`,
    code: { lang: 'sql', src:
`-- a stable surrogate key + a safe "select all but a few columns"
select
    {{ dbt_utils.generate_surrogate_key(['order_id', 'product_id']) }} as line_item_id,
    {{ dbt_utils.star(from=ref('stg_order_items'), except=['_loaded_at']) }}
from {{ ref('stg_order_items') }}` },
    code2: { lang: 'yaml', src:
`# schema.yml — a multi-column uniqueness test the built-ins can't express
models:
  - name: fct_order_items
    tests:
      - dbt_utils.unique_combination_of_columns:
          combination_of_columns: [order_id, product_id]` },
    when: 'Almost always. If you are hand-writing surrogate keys, date spines, or dynamic column lists, dbt_utils already has it.',
  },
  {
    id: 'dbt_expectations', name: 'dbt_expectations', owner: 'metaplane/dbt-expectations',
    tagline: 'Great Expectations-style data tests, declared in YAML.',
    what: `Far richer assertions than the four built-in tests. Ranges, regex, distributions, row recency, distinct
      counts, type checks — e.g. <code>expect_column_values_to_be_between</code>,
      <code>expect_column_values_to_match_regex</code>, <code>expect_row_values_to_have_recent_data</code>. Each is a
      generic test you attach to a column in <code>schema.yml</code>.`,
    code: { lang: 'yaml', src:
`columns:
  - name: amount_paid
    tests:
      - dbt_expectations.expect_column_values_to_be_between:
          min_value: 0
          max_value: 100000
      - dbt_expectations.expect_column_values_to_not_be_null
  - name: email
    tests:
      - dbt_expectations.expect_column_values_to_match_regex:
          regex: "^[^@]+@[^@]+\\\\.[^@]+$"` },
    when: 'When unique/not_null/accepted_values/relationships are not expressive enough — ranges, regex, distributions, row freshness.',
  },
  {
    id: 'codegen', name: 'codegen', owner: 'dbt-labs/codegen',
    tagline: 'Generate boilerplate source YAML and base models from your warehouse.',
    what: `Stop hand-writing staging scaffolding. <code>generate_source</code> emits a <code>sources:</code> block for
      every table in a schema; <code>generate_base_model</code> writes a <code>stg_</code> model's SQL from a source;
      <code>generate_model_yaml</code> produces the column list for a model's YAML. You run them with
      <code>dbt run-operation</code> and paste the output into your files.`,
    code: { lang: 'bash', src:
`# a sources: block for every table in the raw schema
dbt run-operation generate_source \\
  --args '{schema_name: raw, database_name: analytics}'

# scaffold a staging model from one source table
dbt run-operation generate_base_model \\
  --args '{source_name: raw, table_name: orders}'` },
    when: 'Onboarding a new source or warehouse — generate the stg_ models and source YAML instead of typing them.',
  },
  {
    id: 'audit_helper', name: 'audit_helper', owner: 'dbt-labs/dbt-audit-helper',
    tagline: 'Prove a refactor did not change the data.',
    what: `Row-level diffs between two relations or queries — <code>compare_relations</code> and
      <code>compare_queries</code> — returning the counts that match, and the rows that are in one side but not the
      other. The safety net for refactoring a model or migrating warehouses: you want a <em>zero-row</em> diff before
      you ship.`,
    code: { lang: 'sql', src:
`-- analysis/audit_fct_orders.sql — diff the refactor vs the current prod table
{{ audit_helper.compare_relations(
    a_relation=ref('fct_orders'),
    b_relation=api.Relation.create(schema='prod', identifier='fct_orders'),
    primary_key='order_id'
) }}
-- a perfect refactor returns only "in_a_and_b" rows, 0 differences` },
    when: 'Refactoring a model or migrating warehouses when you must prove the output is byte-for-byte identical.',
  },
  {
    id: 'dbt_project_evaluator', name: 'dbt_project_evaluator', owner: 'dbt-labs/dbt-project-evaluator',
    tagline: 'Lint your whole project against dbt best practices.',
    what: `Ships models and tests that <strong>audit your project</strong>: models with no tests or no description,
      staging not 1:1 with a source, marts that reference sources directly, rejoining of upstream models, naming-
      convention violations, and DAG problems like fan-out or too-long chains. Build it in CI to gate on standards.`,
    code: { lang: 'bash', src:
`# run the evaluator's checks across your project
dbt build --select package:dbt_project_evaluator

# surfaces, as failing tests:
#   • models missing tests / documentation
#   • staging models not 1:1 with their source
#   • marts referencing raw sources directly
#   • DAG issues: fan-out, rejoining, long chains` },
    when: 'Enforcing standards on a growing project or team — wire it into CI as a best-practice gate.',
  },
];

const PACKAGES_YML = `# packages.yml — declare what your project depends on
packages:
  # 1) dbt Hub (the registry) — the usual way
  - package: dbt-labs/dbt_utils
    version: [">=1.1.0", "<2.0.0"]   # pin a range, not a floating latest

  # 2) a git repo — for private or un-published packages
  - git: "https://github.com/dbt-labs/dbt-audit-helper.git"
    revision: 0.12.0                  # a tag/branch/commit

  # 3) a local path — a sibling package in a monorepo
  - local: ../shared_macros`;

const IQ = [
  {
    q: 'What is a dbt package, and how is it different from a Python/pip package?',
    a: `A dbt package is <strong>reusable dbt code</strong> — macros, models, seeds and generic tests — that you pull
      into your project. You declare it in <code>packages.yml</code> and run <code>dbt deps</code>, which clones it
      into <code>dbt_packages/</code>; from then on its macros and models are available as if they were yours
      (<code>{{ dbt_utils.star(...) }}</code>). Unlike pip packages, there is <strong>no compiled binary</strong> — a
      dbt package is just more dbt/SQL/Jinja that compiles into your project's graph. (The two are orthogonal:
      <code>dbt deps</code> installs dbt packages; <code>pip install dbt-snowflake</code> installs the Python adapter.)`,
    tip: 'Say "it is more dbt code merged into your project, installed via dbt deps, not pip." That one line separates the two cleanly.',
  },
  {
    q: 'Walk me through adding and using dbt_utils.',
    a: `Three steps. <strong>(1)</strong> Add it to <code>packages.yml</code> with a pinned version range
      (<code>- package: dbt-labs/dbt_utils</code>, <code>version: [">=1.1.0", "&lt;2.0.0"]</code>). <strong>(2)</strong>
      Run <code>dbt deps</code> — it resolves and clones the package into <code>dbt_packages/</code>. <strong>(3)</strong>
      Call its macros namespaced by package: <code>{{ dbt_utils.generate_surrogate_key([...]) }}</code> in a model, or
      attach its tests in <code>schema.yml</code>. Commit <code>packages.yml</code> (and run <code>dbt deps</code> in
      CI); you typically <code>.gitignore</code> the installed <code>dbt_packages/</code> folder.`,
    tip: 'packages.yml → dbt deps → namespaced call. And "pin the version" — unpinned packages are how a build breaks overnight.',
  },
  {
    q: 'Which packages would you reach for, and when?',
    a: `<strong>dbt_utils</strong> on day one (surrogate keys, star, date spines, extra tests). <strong>dbt_expectations</strong>
      when you need richer assertions than the four built-in tests (ranges, regex, row freshness). <strong>codegen</strong>
      when onboarding a new source — generate the staging scaffolding. <strong>audit_helper</strong> when refactoring or
      migrating and you must prove the data didn't change. <strong>dbt_project_evaluator</strong> to lint the project
      against best practices in CI. The skill is matching the package to the problem instead of re-inventing it.`,
    tip: 'Name the problem each solves, not just the package. "audit_helper = prove a refactor is safe" lands better than listing names.',
  },
  {
    q: 'Why is pinning package versions important?',
    a: `A package is a dependency, so an unpinned (or floating-latest) version means a <strong>new release can change
      your compiled SQL or test behavior without you touching anything</strong> — a surprise breakage, often first seen
      in production. Pinning a range (<code>[">=1.1.0", "&lt;2.0.0"]</code>) lets you take safe patches while blocking
      breaking majors, and committing <code>packages.yml</code> plus running <code>dbt deps</code> in CI makes every
      environment resolve the <em>same</em> code. It is the same discipline as a lockfile in application code.`,
    tip: 'Frame it as dependency hygiene: pin ranges, commit packages.yml, resolve in CI — so builds are reproducible.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M37 · Ecosystem',
    title: 'dbt Packages & the Ecosystem',
    subtitle: 'Reusable dbt code — macros, models and tests — you install with packages.yml and dbt deps. Explore the packages every production project leans on, and exactly how to wire them in.',
    tabs: [
      { id: 'explore', label: '📦 Package Explorer' },
      { id: 'install', label: '🔧 Install & use' },
      { id: 'iq',      label: '🎯 Interview Q&A' },
    ],
  });

  buildExplorer(container);
  buildInstall(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
}

function buildExplorer(container) {
  const tab = container.querySelector('#tab-explore');
  tab.innerHTML = `
    <p class="lab-intro">Pick a package to see <strong>what it gives you</strong>, real usage, and <strong>when to
      reach for it</strong>. These five cover the vast majority of what production dbt projects install.</p>
    <div class="lab-picker" id="pkg-pick">
      ${PACKAGES.map((p, i) => `<button class="lab-chip ${i === 0 ? 'active' : ''}" data-i="${i}">${p.name}</button>`).join('')}
    </div>
    <div class="stage-panel" id="pkg-panel"></div>
  `;

  const panel = tab.querySelector('#pkg-panel');
  let i = 0;

  function render() {
    const p = PACKAGES[i];
    panel.style.setProperty('--panelColor', 'var(--accent)');
    panel.innerHTML = `
      <div class="stage-panel-head">
        <span class="stage-panel-k" style="color:var(--accent)">${p.owner}</span>
        <span class="stage-panel-t">${p.name}</span>
      </div>
      <div class="stage-panel-body">
        <p class="pkg-tagline">${p.tagline}</p>
        <div class="detail-section" style="margin:0"><p>${p.what}</p></div>
        <div class="pkg-step">Usage</div>
        <div class="code-block" data-lang="${p.code.lang}">${esc(p.code.src)}</div>
        ${p.code2 ? `<div class="code-block" data-lang="${p.code2.lang}">${esc(p.code2.src)}</div>` : ''}
        <div class="pkg-when"><span class="pkg-when-k">When to reach for it</span> ${p.when}</div>
      </div>`;
    injectCodeEnhancements(panel);
  }

  tab.querySelector('#pkg-pick').addEventListener('click', e => {
    const chip = e.target.closest('.lab-chip'); if (!chip) return;
    i = Number(chip.dataset.i);
    tab.querySelectorAll('#pkg-pick .lab-chip').forEach(x => x.classList.toggle('active', x === chip));
    render();
  });
  render();
}

function buildInstall(container) {
  container.querySelector('#tab-install').innerHTML = `
    <div class="detail-section">
      <h3>The install flow</h3>
      <div class="pipe" style="margin-bottom:16px">
        <div class="pipe-stage"><div class="pipe-ic">📝</div><div class="pipe-name">packages.yml</div><div class="pipe-sub">declare + pin versions</div></div>
        <div class="pipe-stage"><div class="pipe-ic">⬇️</div><div class="pipe-name">dbt deps</div><div class="pipe-sub">resolve &amp; clone</div></div>
        <div class="pipe-stage"><div class="pipe-ic">📁</div><div class="pipe-name">dbt_packages/</div><div class="pipe-sub">installed (git-ignored)</div></div>
        <div class="pipe-stage"><div class="pipe-ic">🔗</div><div class="pipe-name">use it</div><div class="pipe-sub">{{ pkg.macro() }} · tests</div></div>
      </div>
      <p>Declare dependencies in <code>packages.yml</code>, run <code>dbt deps</code> to clone them into
        <code>dbt_packages/</code>, then call their macros (namespaced by package) and attach their tests. Commit
        <code>packages.yml</code>, <code>.gitignore</code> the installed folder, and run <code>dbt deps</code> in CI so
        every environment resolves identical code.</p>
      <div class="code-block" data-lang="yaml">${esc(PACKAGES_YML)}</div>
    </div>

    <div class="detail-section">
      <h3>Three ways to source a package</h3>
      <div class="cheat-grid">
        <div class="cheat-card"><div class="cheat-head">🌐 dbt Hub</div><div class="cheat-body">
          <div class="cheat-row"><div class="cheat-k">The registry (default)</div><div class="cheat-v">- package: dbt-labs/dbt_utils</div></div>
          <div class="cheat-row"><div class="cheat-k">Pin a range</div><div class="cheat-v">version: [">=1.1.0", "&lt;2.0.0"]</div></div>
        </div></div>
        <div class="cheat-card"><div class="cheat-head">🌿 A git repo</div><div class="cheat-body">
          <div class="cheat-row"><div class="cheat-k">Private / unpublished</div><div class="cheat-v">- git: "https://…/pkg.git"</div></div>
          <div class="cheat-row"><div class="cheat-k">Pin a revision</div><div class="cheat-v">revision: 0.12.0</div></div>
        </div></div>
        <div class="cheat-card"><div class="cheat-head">📂 A local path</div><div class="cheat-body">
          <div class="cheat-row"><div class="cheat-k">Monorepo sibling</div><div class="cheat-v">- local: ../shared_macros</div></div>
          <div class="cheat-row"><div class="cheat-k">Install / refresh</div><div class="cheat-v">dbt deps</div></div>
        </div></div>
      </div>
    </div>

    <div class="detail-section">
      <p style="padding:12px 14px;background:var(--surface-2);border-left:3px solid var(--accent);border-radius:8px;font-size:14px;margin:0">
        <strong>🧠 First principles —</strong> a package is just <em>more dbt code merged into your graph</em> — its
        macros compile into your SQL and its models become nodes in your DAG, no binary involved. That is why pinning
        versions matters as much as it does for any dependency, and why <code>dbt deps</code> belongs in CI.
        <a href="#m14" style="color:var(--accent);font-weight:600">Macros &amp; Reuse (M14)</a> ·
        <a href="#m22" style="color:var(--accent);font-weight:600">Testing (M22)</a>.
      </p>
    </div>
  `;
}
