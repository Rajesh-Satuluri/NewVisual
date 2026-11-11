// M36 · dbt Core vs dbt Cloud
// Same engine, two ways to run it. dbt Cloud runs dbt Core under the hood and
// wraps a managed platform around it — scheduler, browser IDE, APIs, hosted
// Semantic Layer, Explorer, and governance. This module separates the ENGINE
// (identical) from the PLATFORM (what Cloud adds) so you can decide what you
// actually need — and know that everything you build in Core runs in Cloud.
//
// Nothing is executed; the Capability Explorer shows, per capability, how Core
// does it vs how Cloud does it. Code snippets are real, illustrative config.
import { createModuleShell, createIQSection, injectCodeEnhancements } from '../components/module-shell.js';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ── Capability matrix (Core vs Cloud) ────────────────────────────────────────
const ROWS = [
  ['Transformation engine', 'dbt Core — open source (Apache 2.0)', '<span class="good">The same dbt Core, hosted</span>'],
  ['Interface', 'CLI in your terminal + your own editor', 'Browser IDE, Cloud CLI, <em>and</em> the same local CLI'],
  ['Job scheduling', '<span class="bad">None — bring Airflow / cron / Dagster</span>', '<span class="good">Built-in scheduler (cron + triggers)</span>'],
  ['CI / CD', 'DIY (GitHub Actions) + Slim CI via <code>--state</code>', '<span class="good">Native CI jobs & PR checks, Slim CI built in</span>'],
  ['Hosting / runtime', 'You host & run it (laptop, VM, container)', '<span class="good">Fully managed, hosted runtime</span>'],
  ['APIs', '<span class="bad">None built in</span>', '<span class="good">Admin, Discovery & Semantic Layer APIs</span>'],
  ['Semantic Layer serving', 'Define metrics; query with the dbt CLI', '<span class="good">Hosted SL — JDBC / GraphQL + BI tools</span>'],
  ['Lineage & docs', '<code>dbt docs</code> — a static docs site', '<span class="good">dbt Explorer — hosted, column-level, cross-project</span>'],
  ['Governance', '<span class="bad">OS-level only</span>', '<span class="good">SSO, RBAC, audit logs (Enterprise)</span>'],
  ['Secrets & connections', '<code>profiles.yml</code> you manage yourself', '<span class="good">Managed connections + env-scoped secrets</span>'],
  ['Cost', '<span class="good">Free</span> — you pay infra + warehouse', 'Free Developer seat; paid Team / Enterprise + warehouse'],
  ['Version management', 'You pin & upgrade <code>dbt-core</code> yourself', '<span class="good">“Keep on latest” — always on the newest release</span>'],
];

// ── Capability Explorer — how each side actually does it ──────────────────────
const CAPS = [
  {
    id: 'engine', label: 'The engine',
    core: { how: 'You install <code>dbt-core</code> plus an adapter (<code>dbt-snowflake</code>, <code>dbt-bigquery</code>, …) and run it. 100% open source.', code: { lang: 'bash', src: 'pip install dbt-snowflake\ndbt build --select state:modified+' } },
    cloud: { how: 'Runs the <strong>exact same dbt Core</strong> on managed infrastructure — kept continuously on the latest release (“versionless”). No install, no upgrade toil.', code: null },
    take: 'Cloud is not a different dbt. It <strong>is</strong> dbt Core, hosted. Every model, test, macro and ref you write is identical on both.',
  },
  {
    id: 'interface', label: 'Authoring & IDE',
    core: { how: 'Your terminal and your editor of choice (VS Code + the dbt Power User extension is the common setup). Full control, zero hand-holding.', code: null },
    cloud: { how: 'A <strong>browser IDE</strong> with autocomplete, inline lineage, and one-click run — plus the <strong>Cloud CLI</strong> for local dev against Cloud. New analysts are productive without any local setup.', code: null },
    take: 'Core = your machine, your rules. Cloud = a hosted IDE that lowers onboarding friction for SQL-first teams.',
  },
  {
    id: 'schedule', label: 'Scheduling & jobs',
    core: { how: 'dbt has <strong>no scheduler</strong>. You bring one: cron, Airflow, Dagster, Prefect, or a CI runner that invokes <code>dbt build</code> on a schedule.', code: { lang: 'bash', src: '# cron: run the warehouse build nightly at 02:00\n0 2 * * *  cd /repo && dbt build --target prod' } },
    cloud: { how: 'A <strong>built-in job scheduler</strong>: define jobs in the UI, run on cron or on triggers (on PR merge, on a schedule, via API), with retries and run history.', code: null },
    take: 'This is the single biggest practical difference. No scheduler in Core means you own orchestration; Cloud hands it to you.',
  },
  {
    id: 'cicd', label: 'CI / CD',
    core: { how: 'Do-it-yourself with your CI provider. Slim CI still works — <code>state:modified+ --defer</code> against a stored prod manifest — you just wire the workflow yourself.', code: { lang: 'yaml', src: '# .github/workflows/ci.yml\n- run: dbt build --select state:modified+ --defer --state ./prod' } },
    cloud: { how: '<strong>Native CI jobs</strong>: open a PR and Cloud spins up a temporary schema, runs only the modified models (Slim CI), and posts a check back to the PR — no workflow YAML to maintain.', code: null },
    take: 'Both do Slim CI; the mechanism (<code>state:modified+ --defer</code>) is a Core feature. Cloud just removes the plumbing.',
  },
  {
    id: 'api', label: 'APIs & integration',
    core: { how: 'No service to call — Core is a CLI, not a server. Integrations shell out to <code>dbt</code> or read the <code>target/</code> artifacts (<code>manifest.json</code>, <code>run_results.json</code>).', code: null },
    cloud: { how: 'A hosted platform with real APIs: the <strong>Administrative API</strong> (trigger/monitor jobs), the <strong>Discovery API</strong> (query metadata & lineage), and the <strong>Semantic Layer API</strong>.', code: null },
    take: 'If another system must trigger runs or read lineage over HTTP, that is a Cloud capability (or you build the service yourself around Core).',
  },
  {
    id: 'semantic', label: 'Semantic Layer serving',
    core: { how: 'You <strong>define</strong> metrics (semantic models + metrics YAML, MetricFlow) and query them with the dbt CLI — <code>dbt sl query</code>. Great for development.', code: { lang: 'bash', src: 'dbt sl query --metrics total_revenue --group-by metric_time__month' } },
    cloud: { how: 'The <strong>hosted Semantic Layer</strong>: the same metrics served over <strong>JDBC / GraphQL</strong> so BI tools (Tableau, Hex, Google Sheets, …) query governed metrics directly — one number everywhere.', code: null },
    take: 'Defining metrics is Core (see Module 34). <em>Serving</em> them to BI tools over an API is the Cloud add-on.',
  },
  {
    id: 'explorer', label: 'Lineage & docs',
    core: { how: '<code>dbt docs generate</code> builds a <strong>static</strong> documentation site from your manifest + catalog — searchable, with a DAG, but it is a file you host yourself.', code: { lang: 'bash', src: 'dbt docs generate\ndbt docs serve   # static site on localhost' } },
    cloud: { how: '<strong>dbt Explorer</strong>: a hosted, always-current catalog with <strong>column-level lineage</strong>, cross-project (Mesh) lineage, model performance, and trust signals — far beyond the static docs site.', code: null },
    take: 'Core gives you a static docs site for free; Explorer is the richer, hosted, cross-project experience in Cloud.',
  },
  {
    id: 'governance', label: 'Governance & access',
    core: { how: 'No application-level access control. Who can run dbt is whoever has the repo, the warehouse creds, and shell access — governed by your OS, Git, and warehouse, not by dbt.', code: null },
    cloud: { how: '<strong>SSO, role-based access control, and audit logs</strong> (Enterprise). Control who can edit, run, and deploy, and get an audit trail — the controls a larger org needs.', code: null },
    take: 'For a solo user this is noise; for an enterprise it is often the deciding factor.',
  },
];

const IQ = [
  {
    q: 'Is dbt Cloud a different tool from dbt Core?',
    a: `No — dbt Cloud <strong>runs dbt Core under the hood</strong>. It is the same open-source transformation engine (same models, tests, macros, <code>ref()</code>, materializations), hosted on managed infrastructure and kept continuously on the latest version. What Cloud adds is a <strong>platform around</strong> the engine: a job scheduler, a browser IDE, CI jobs, hosted APIs, the hosted Semantic Layer, dbt Explorer, and governance (SSO/RBAC). So anything you build in Core runs unchanged in Cloud — you are choosing a <em>runtime and platform</em>, not a dialect.`,
    tip: 'Lead with "Cloud is Core plus a managed platform." That one sentence shows you understand they are not competing dialects.',
  },
  {
    q: 'A team runs dbt Core on Airflow today. What would moving to dbt Cloud actually change?',
    a: `The <strong>models would not change at all</strong> — same repo, same SQL. What changes is the <strong>operational wrapper</strong>: the built-in scheduler could replace (or complement) the Airflow DAG that invokes dbt; CI becomes native PR checks instead of hand-written GitHub Actions; the team gets the browser IDE, dbt Explorer for lineage, hosted Semantic Layer serving, and SSO/RBAC. The trade is <strong>managed convenience and governance vs. cost and control</strong> — and you can keep Airflow as the orchestrator and still use Cloud if you prefer.`,
    tip: 'Name what stays the same (the project) vs what moves (orchestration, CI, governance). That framing is what interviewers want.',
  },
  {
    q: 'When is plain dbt Core the right choice over dbt Cloud?',
    a: `When you already have an <strong>orchestrator</strong> (Airflow/Dagster) and a CI pipeline, when you want <strong>full control</strong> over the runtime and version, when <strong>cost</strong> matters and the managed features do not earn their price, or for a <strong>solo/small</strong> setup where governance and a hosted IDE add nothing. Core is free and complete as a transformation engine — the Cloud features are about <em>operating dbt at team/enterprise scale</em>, not about making transformations work.`,
    tip: 'Say "Core if you already have orchestration + CI and value control/cost; Cloud when you want the managed platform and governance." Avoid implying Core is "lesser".',
  },
  {
    q: 'Does the Semantic Layer require dbt Cloud?',
    a: `<strong>Defining</strong> metrics does not — MetricFlow and the <code>semantic_models</code> / <code>metrics</code> spec are in dbt Core, and you can query them locally with <code>dbt sl query</code>. What requires dbt Cloud is the <strong>hosted serving layer</strong>: the JDBC/GraphQL Semantic Layer APIs that let BI tools (Tableau, Hex, Google Sheets) pull governed metrics directly. So Core is enough to build and test metrics; Cloud is what exposes them to the wider tool ecosystem.`,
    tip: 'Split it cleanly: "define & query in Core; serve to BI tools via Cloud." That distinction trips up a lot of candidates.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M36 · Modern dbt',
    title: 'dbt Core vs dbt Cloud',
    subtitle: 'Same engine, two ways to run it. Separate the open-source engine (identical) from the managed platform Cloud wraps around it.',
    tabs: [
      { id: 'matrix', label: '📊 Capability Matrix' },
      { id: 'explore', label: '🔍 Capability Explorer' },
      { id: 'iq',     label: '🎯 Interview Q&A' },
    ],
  });

  buildMatrix(container);
  buildExplorer(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
}

function buildMatrix(container) {
  container.querySelector('#tab-matrix').innerHTML = `
    <p class="lab-intro">The top row is the whole point: <strong>dbt Cloud runs dbt Core</strong>. Everything below is
      the <em>platform</em> Cloud adds around that shared engine — so the question is never “which dbt language”,
      it is “do I need the managed platform?”.</p>
    <div class="compare-table-wrap">
      <table class="compare-table">
        <thead>
          <tr><th>Dimension</th><th>dbt Core</th><th class="accent">dbt Cloud</th></tr>
        </thead>
        <tbody>
          ${ROWS.map(r => `<tr><td><strong>${r[0]}</strong></td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
    <p style="font-size:14px;color:var(--text-2);margin-top:14px">
      <strong style="color:var(--accent)">Rule of thumb —</strong> the engine is identical; you are choosing a
      <strong>runtime and a set of platform conveniences</strong> (scheduling, IDE, APIs, hosted Semantic Layer,
      Explorer, governance), not a different dbt.</p>
  `;
}

function buildExplorer(container) {
  const tab = container.querySelector('#tab-explore');
  tab.innerHTML = `
    <p class="lab-intro">Pick a capability to see <strong>how dbt Core does it</strong> versus
      <strong>what dbt Cloud adds</strong>. Notice how often Core <em>can</em> do it — you just wire it yourself.</p>
    <div class="lab-picker" id="cvc-pick">
      ${CAPS.map((c, i) => `<button class="lab-chip ${i === 0 ? 'active' : ''}" data-i="${i}">${c.label}</button>`).join('')}
    </div>
    <div id="cvc-panel"></div>
  `;

  const panel = tab.querySelector('#cvc-panel');
  let i = 0;

  function sideHtml(kind, data) {
    const isCloud = kind === 'cloud';
    return `
      <div class="cvc-col ${isCloud ? 'cvc-cloud' : 'cvc-core'}">
        <div class="cvc-head">${isCloud ? '☁️ dbt Cloud' : '⌨️ dbt Core'}</div>
        <div class="cvc-body">${data.how}</div>
        ${data.code ? `<div class="code-block" data-lang="${data.code.lang}">${esc(data.code.src)}</div>` : ''}
      </div>`;
  }

  function render() {
    const c = CAPS[i];
    panel.innerHTML = `
      <div class="cvc-cols">
        ${sideHtml('core', c.core)}
        ${sideHtml('cloud', c.cloud)}
      </div>
      <div class="cvc-take"><span class="cvc-take-k">Takeaway</span> ${c.take}</div>
    `;
    injectCodeEnhancements(panel);
  }

  tab.querySelector('#cvc-pick').addEventListener('click', e => {
    const chip = e.target.closest('.lab-chip'); if (!chip) return;
    i = Number(chip.dataset.i);
    tab.querySelectorAll('#cvc-pick .lab-chip').forEach(x => x.classList.toggle('active', x === chip));
    render();
  });
  render();
}
