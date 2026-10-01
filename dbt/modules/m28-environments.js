// M28 · Environments Lab
// One project, many environments. How profiles/targets/env vars route the same
// models into dev, CI, staging, and prod — and how developer isolation and
// production protection work.
import { createModuleShell, createIQSection, injectCodeEnhancements } from '../components/module-shell.js';

const ENVS = [
  {
    id: 'dev', name: 'Development', color: '#3B82F6',
    who: 'Each analyst, locally.', target: 'dev',
    db: 'ANALYTICS_DEV', schema: 'dbt_<username> (e.g. dbt_alice)',
    note: 'Every developer builds into their OWN schema so they never collide. A small warehouse; often <code>--defer</code> to prod so you don\'t rebuild everything.',
    cmd: `dbt build --select my_model+ --target dev
# builds into ANALYTICS_DEV.dbt_alice`,
  },
  {
    id: 'ci', name: 'CI (per PR)', color: '#F59E0B',
    who: 'The CI runner, per pull request.', target: 'ci',
    db: 'ANALYTICS_CI', schema: 'dbt_ci_pr_<number> (ephemeral)',
    note: 'An isolated, throwaway schema per PR. Builds only <code>state:modified+</code> and defers unchanged refs to prod. Dropped after the PR closes.',
    cmd: `dbt build --select state:modified+ --defer \\
  --state prod-artifacts/ --target ci`,
  },
  {
    id: 'staging', name: 'Staging / QA', color: '#8B5CF6',
    who: 'The scheduler, pre-prod (optional).', target: 'staging',
    db: 'ANALYTICS_STAGING', schema: 'analytics',
    note: 'A full prod-like build on prod-like data for final validation before release. Not every team has one; larger orgs use it to catch integration issues.',
    cmd: `dbt build --target staging`,
  },
  {
    id: 'prod', name: 'Production', color: '#10B981',
    who: 'The orchestrator, on merge to main.', target: 'prod',
    db: 'ANALYTICS', schema: 'analytics (+ marts, staging…)',
    note: 'The real tables BI and downstream consume. A dedicated service role, a right-sized warehouse, and NO developer write access. Publishes the manifest CI compares against.',
    cmd: `dbt build --target prod   # scheduled, service account`,
  },
];

const IQ = [
  {
    q: 'One dbt project needs to run in dev and prod without changing code. How?',
    a: `Through <strong>targets</strong> in <code>profiles.yml</code> plus environment variables — the code never changes, only the resolved connection and output location.
    <br><br>Each target names a database/schema, a role/service account, and a warehouse. <code>dbt build --target prod</code> resolves <code>{{ ref() }}</code> to <code>ANALYTICS.marts.*</code> with the service role; <code>--target dev</code> resolves the same refs to <code>ANALYTICS_DEV.dbt_alice.*</code>. Secrets come from env vars (<code>env_var('DBT_PASSWORD')</code>), never hard-coded.`,
    tip: 'The key phrase: "the model code is identical; the target resolves WHERE and AS WHOM it runs." That is the whole environment model in one sentence.',
  },
  {
    q: 'How do you give every developer isolation without 10 people overwriting each other?',
    a: `Generate the dev schema from the developer\'s identity so each person builds into their own namespace — classically <code>dbt_&lt;username&gt;</code> via a <code>generate_schema_name</code> macro or a per-user env var.
    <br><br>So Alice builds into <code>ANALYTICS_DEV.dbt_alice</code> and Bob into <code>dbt_bob</code>; their <code>ref()</code>s resolve within their own schema. Combined with <code>--defer</code>, a developer can build just one model and let every unchanged upstream resolve to prod — fast, isolated, and cheap.`,
    tip: 'Mentioning the generate_schema_name macro by name, plus --defer for building a single model, is the senior-level detail.',
  },
  {
    q: 'How do you protect production from accidental or unauthorized changes?',
    a: `Defense in layers:
    <ul>
      <li><strong>Separate role/service account</strong> for prod that developers do not have; dev roles can\'t write to the prod schema.</li>
      <li><strong>Prod runs only from merged main</strong> via the orchestrator — never from a laptop.</li>
      <li><strong>CI gate</strong>: tests + review required before merge.</li>
      <li><strong>No stray flags</strong>: keep <code>--full-refresh</code> out of scheduled prod jobs; review job definitions.</li>
      <li><strong>Secrets via env vars</strong>, scoped per environment.</li>
    </ul>`,
    tip: 'The "developers literally cannot authenticate to the prod schema" point is the strongest single control — lead with it.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M28 · Platform & Architecture',
    title: 'Environments Lab',
    subtitle: 'One project, four environments. How targets, profiles and env vars route the same models to dev / CI / staging / prod.',
    tabs: [
      { id: 'lab',    label: '🌐 Environments' },
      { id: 'detail', label: '📋 profiles.yml & isolation' },
      { id: 'iq',     label: '🎯 Interview Q&A' },
    ],
  });
  buildLab(container);
  buildDetail(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
}

function buildLab(container) {
  const tab = container.querySelector('#tab-lab');
  tab.innerHTML = `
    <p class="lab-intro">The same model runs in every environment — only the <strong>target</strong> changes where it
    lands and who runs it. Pick an environment to see how it resolves.</p>
    <div class="pipe" style="margin-bottom:18px">
      ${ENVS.map(e => `<div class="pipe-stage" style="border-left:3px solid ${e.color}"><div class="pipe-name">${e.name}</div><div class="pipe-sub">--target ${e.target}</div></div>`).join('')}
    </div>
    <div class="lab-picker" id="m28-pick">
      ${ENVS.map((e, i) => `<button class="lab-chip ${i === 0 ? 'active' : ''}" data-i="${i}">
        <span class="lab-sev" style="background:${e.color}"></span>${e.name}</button>`).join('')}
    </div>
    <div class="stage-panel" id="m28-panel"></div>
  `;
  const panel = tab.querySelector('#m28-panel');

  function render(i) {
    const e = ENVS[i];
    panel.style.setProperty('--panelColor', e.color);
    panel.innerHTML = `
      <div class="stage-panel-head">
        <span class="stage-panel-k" style="color:${e.color}">--target ${e.target}</span>
        <span class="stage-panel-t">${e.name}</span>
      </div>
      <div class="stage-panel-body">
        <div class="mx-grid">
          <div class="mx-cell"><div class="mx-k">Who runs it</div><div class="mx-v">${e.who}</div></div>
          <div class="mx-cell"><div class="mx-k">Database</div><div class="mx-v">${e.db}</div></div>
          <div class="mx-cell"><div class="mx-k">Schema</div><div class="mx-v">${e.schema}</div></div>
        </div>
        <p style="margin:12px 0">${e.note}</p>
        <div class="code-block" data-lang="bash">${escapeHtml(e.cmd)}</div>
      </div>`;
    injectCodeEnhancements(panel);
  }

  tab.querySelector('#m28-pick').addEventListener('click', ev => {
    const chip = ev.target.closest('.lab-chip');
    if (!chip) return;
    tab.querySelectorAll('#m28-pick .lab-chip').forEach(c => c.classList.toggle('active', c === chip));
    render(Number(chip.dataset.i));
  });
  render(0);
}

function buildDetail(container) {
  container.querySelector('#tab-detail').innerHTML = `
    <div class="detail-section">
      <h3>profiles.yml — one project, many targets</h3>
      <div class="code-block" data-lang="yaml">acme:
  target: dev                      # default; overridden by --target
  outputs:
    dev:
      type: snowflake
      account: "{{ env_var('SF_ACCOUNT') }}"
      role: TRANSFORMER_DEV
      database: ANALYTICS_DEV
      schema: "dbt_{{ env_var('USER') }}"   # per-developer isolation
      warehouse: WH_XS
    prod:
      type: snowflake
      role: TRANSFORMER_SVC            # service account devs lack
      database: ANALYTICS
      schema: analytics
      warehouse: WH_L
      password: "{{ env_var('DBT_SF_PASSWORD') }}"   # never hard-coded</div>
    </div>
    <div class="detail-section">
      <h3>Developer isolation via generate_schema_name</h3>
      <div class="code-block" data-lang="sql">-- macros/generate_schema_name.sql (simplified)
{% macro generate_schema_name(custom_schema_name, node) %}
  {% if target.name == 'prod' and custom_schema_name is not none %}
    {{ custom_schema_name }}            {# prod: real marts/staging schemas #}
  {% else %}
    {{ target.schema }}                 {# dev/ci: everything in your own schema #}
  {% endif %}
{% endmacro %}</div>
      <p style="font-size:15px;font-weight:600;color:var(--accent)">The model code is identical everywhere. The target decides the database, schema, role and warehouse — so dev is isolated, CI is ephemeral, and prod is protected, all from one codebase.</p>
    </div>
  `;
}

function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
