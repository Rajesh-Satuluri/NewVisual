// M27 · CI/CD Lab
// How dbt ships to production safely: the PR → Slim-CI build → review → merge →
// deploy pipeline, and what happens on each outcome (pass, failing test,
// modified upstream, contract break, rollback).
import { createModuleShell, createIQSection, injectCodeEnhancements } from '../components/module-shell.js';

const STAGES = ['Branch', 'Open PR', 'CI: parse', 'CI: build state:modified+', 'CI: test', 'Review', 'Merge', 'Deploy prod'];

const SCEN = [
  {
    id: 'pass', name: 'Passing PR', color: '#10B981',
    story: 'A one-model change. CI parses, builds only the modified subgraph with Slim CI, tests pass, a human approves, it merges and the prod job deploys.',
    at: 'Deploy prod',
    detail: 'The happy path. Because CI used <code>state:modified+ --defer</code>, it built 3 nodes in a CI schema instead of all 2,000 — fast feedback. Prod deploy runs <code>dbt build</code> on the merged main.',
    cmd: `# CI job
dbt deps
dbt build --select state:modified+ --defer --state prod-artifacts/`,
  },
  {
    id: 'testfail', name: 'Failing test blocks merge', color: '#EF4444',
    story: 'The change introduces a duplicate key. CI builds fine but the unique test fails — CI is red, merge is blocked.',
    at: 'CI: test',
    detail: 'The test gate did its job: a data-quality regression cannot merge. The author fixes the fan-out (or the data), pushes, CI re-runs. Nothing bad reaches prod.',
    cmd: `# CI fails here:
FAIL unique_fct_orders_order_id (1,241 rows)
# merge blocked until green`,
  },
  {
    id: 'upstream', name: 'Modified upstream model', color: '#F59E0B',
    story: 'The PR changes stg_orders. state:modified+ expands the build to every downstream model (fct_orders, fct_revenue, dashboards) so the blast radius is tested.',
    at: 'CI: build state:modified+',
    detail: 'Slim CI does not just build the changed file — the <code>+</code> pulls in all downstream children so you test what your change could break, while <code>--defer</code> resolves unchanged upstreams to prod.',
    cmd: `dbt build --select stg_orders+ --defer --state prod-artifacts/
# builds stg_orders and everything downstream of it`,
  },
  {
    id: 'contract', name: 'Contract break caught', color: '#8B5CF6',
    story: 'The PR changes a column type on a contracted model consumed by BI. The contract fails the build at CI — before it can break the dashboard.',
    at: 'CI: build state:modified+',
    detail: 'A model contract turns a downstream-breaking change into a build-time failure in the producer\'s PR. The author must cast back to the contracted type, or version the model for an intentional break.',
    cmd: `Compilation Error: enforced contract failed
  signup_date: expected DATE, got TIMESTAMP`,
  },
  {
    id: 'rollback', name: 'Bad deploy → rollback', color: '#06B6D4',
    story: 'A change passed CI but caused a prod issue (e.g. a logic bug no test covered). You roll back by reverting the merge and redeploying the previous good state.',
    at: 'Deploy prod',
    detail: 'Git is the source of truth: revert the merge commit, which redeploys the prior model definitions. For data already written, restore from warehouse time-travel/backup, then add the missing test so it can\'t recur.',
    cmd: `git revert <merge-sha> && <deploy>
# + add the test that would have caught it`,
  },
];

const IQ = [
  {
    q: 'Design a dbt CI pipeline for a team of 20 analysts. What runs on each PR?',
    a: `A Slim CI pipeline keyed on state:
    <ol>
      <li><code>dbt deps</code> — install packages.</li>
      <li><code>dbt parse</code> — fail fast on structural errors (cheap, no warehouse).</li>
      <li><code>dbt build --select state:modified+ --defer --state prod-artifacts/</code> — build ONLY changed models + downstream in an isolated CI schema; unchanged upstreams defer to prod.</li>
      <li>Tests run inline via <code>build</code> and gate the merge.</li>
      <li>On green + human approval → merge → the prod job runs <code>dbt build</code> on main.</li>
    </ol>
    The <code>--state</code> manifest comes from the last prod run (stored as a CI artifact). This keeps CI minutes and warehouse cost flat as the project grows.`,
    tip: 'Naming the artifact-persistence detail ("--state comes from the stored prod manifest") shows you have actually wired Slim CI, not just read about it.',
  },
  {
    q: 'Why is state:modified+ the heart of dbt CI, and what breaks if the --state manifest is wrong?',
    a: `It makes CI cost scale with the size of the <em>change</em>, not the size of the <em>project</em> — you build the modified models and their downstream, defer the rest. On a large project that is the difference between a 2-minute and a 40-minute CI run.
    <br><br>If the <code>--state</code> comparison manifest is stale or from the wrong environment, the diff is wrong: CI may <strong>skip</strong> models that actually changed (false green) or <strong>rebuild</strong> everything (slow). The manifest must come from the current production state and be refreshed on every prod deploy.`,
    tip: 'The failure mode — "a stale --state manifest gives a false green" — is the follow-up, and knowing it signals real operational depth.',
  },
  {
    q: 'A change passed all tests but still broke production. What do you do, and how do you prevent recurrence?',
    a: `<strong>Contain & recover first:</strong> revert the merge commit (git redeploys the prior definitions); if bad data was written, restore affected tables from warehouse time-travel/backup.
    <br><br><strong>Then prevent:</strong> the fact that tests passed means you had a <em>coverage gap</em>. Add the test that would have caught it — a unit test for the logic bug, a singular test for the business invariant, or a contract if it was a schema break. Post-incident, the deliverable is the new guardrail, not just the fix.`,
    tip: '"Tests passed but prod broke = a coverage gap; the fix includes the missing test" is exactly the mature, blameless-postmortem answer interviewers want.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M27 · Platform & Architecture',
    title: 'CI/CD Lab',
    subtitle: 'How dbt ships safely: PR → Slim-CI build → review → merge → deploy, and what each outcome does.',
    tabs: [
      { id: 'lab',    label: '🔁 Pipeline Scenarios' },
      { id: 'detail', label: '📋 Slim CI anatomy' },
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
    <p class="lab-intro">The deploy pipeline is the same every time; the <strong>outcome</strong> differs. Pick a scenario
    to see where it lands in the pipeline and what happens.</p>
    <div class="lab-picker" id="m27-pick">
      ${SCEN.map((s, i) => `<button class="lab-chip ${i === 0 ? 'active' : ''}" data-i="${i}">
        <span class="lab-sev" style="background:${s.color}"></span>${s.name}</button>`).join('')}
    </div>
    <div class="pipe" id="m27-pipe"></div>
    <div class="stage-panel" id="m27-panel"></div>
  `;
  const pipeEl = tab.querySelector('#m27-pipe');
  const panel = tab.querySelector('#m27-panel');

  function render(i) {
    const s = SCEN[i];
    pipeEl.innerHTML = STAGES.map(st => {
      const active = st === s.at;
      return `<div class="pipe-stage${active ? ' active' : ''}" style="${active ? `border-color:${s.color};box-shadow:0 0 0 3px ${s.color}33` : ''}">
        <div class="pipe-name">${st}</div></div>`;
    }).join('');
    panel.style.setProperty('--panelColor', s.color);
    panel.innerHTML = `
      <div class="stage-panel-head">
        <span class="stage-panel-k" style="color:${s.color}">lands at · ${s.at}</span>
        <span class="stage-panel-t">${s.name}</span>
      </div>
      <div class="stage-panel-body">
        <p>${s.story}</p>
        <p style="margin-top:10px">${s.detail}</p>
        <div class="code-block" data-lang="bash" style="margin-top:12px">${escapeHtml(s.cmd)}</div>
      </div>`;
    injectCodeEnhancements(panel);
  }

  tab.querySelector('#m27-pick').addEventListener('click', e => {
    const chip = e.target.closest('.lab-chip');
    if (!chip) return;
    tab.querySelectorAll('#m27-pick .lab-chip').forEach(c => c.classList.toggle('active', c === chip));
    render(Number(chip.dataset.i));
  });
  render(0);
}

function buildDetail(container) {
  container.querySelector('#tab-detail').innerHTML = `
    <div class="detail-section">
      <h3>A real Slim CI job</h3>
      <div class="code-block" data-lang="yaml"># .github/workflows/dbt_ci.yml (essence)
- run: dbt deps
- run: dbt parse                         # fail fast, no warehouse
- run: |
    dbt build --select state:modified+ \\
      --defer --state ./prod-artifacts \\  # diff against last prod manifest
      --target ci                         # isolated CI schema
# merge blocked unless this is green + a human approves</div>
      <p>The previous production <code>manifest.json</code> is stored as a CI artifact and passed via <code>--state</code>. That is the whole trick: diff the branch against prod, build only the delta, defer the rest.</p>
    </div>
    <div class="detail-section">
      <h3>Why separate CI from the prod deploy</h3>
      <div class="info-grid">
        <div class="info-card" style="border-left-color:#3B82F6"><div class="info-card-title">CI (per PR)</div><div class="info-card-body">Isolated schema/target, Slim build of the change, tests gate the merge. Optimized for fast, cheap feedback.</div></div>
        <div class="info-card" style="border-left-color:#10B981"><div class="info-card-title">Prod deploy (on merge)</div><div class="info-card-body"><code>dbt build</code> on main against the prod target, scheduled by your orchestrator. Writes the real tables.</div></div>
        <div class="info-card" style="border-left-color:#8B5CF6"><div class="info-card-title">Artifacts</div><div class="info-card-body">Each prod run publishes its manifest; CI consumes it for state comparison. Store run_results for observability.</div></div>
        <div class="info-card" style="border-left-color:#06B6D4"><div class="info-card-title">Rollback</div><div class="info-card-body">Revert the merge commit to redeploy prior definitions; restore data via warehouse time-travel. Git is the source of truth.</div></div>
      </div>
      <p style="font-size:15px;font-weight:600;color:var(--accent)">CI proves the change is safe cheaply; the prod job applies it. state:modified+ --defer is what keeps CI fast as the project grows. See M20 for the selection mechanics.</p>
    </div>
  `;
}

function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
