// M22 · Testing & Data Quality Lab
// m11 introduced the test gate. This lab goes deep on the full testing surface:
// generic, singular, custom-generic, unit tests, and contracts — plus what a
// test run actually does operationally (pass / warn / fail → downstream gating).
import { createModuleShell, createIQSection, injectCodeEnhancements } from '../components/module-shell.js';

const TYPES = [
  {
    id: 'generic', name: 'Generic tests', color: '#3B82F6',
    what: 'The four built-in column assertions, declared in YAML next to the model. Each compiles to a query that returns bad rows.',
    catches: 'Structural quality: nulls, duplicates, invalid enums, broken foreign keys.',
    config: `models:
  - name: fct_orders
    columns:
      - name: order_id
        tests: [not_null, unique]
      - name: customer_id
        tests:
          - relationships:
              to: ref('dim_customers')
              field: customer_id
      - name: status
        tests:
          - accepted_values:
              values: ['pending','shipped','delivered','cancelled']`,
    note: 'Apply not_null + unique to EVERY primary key automatically, relationships to every FK. That single habit catches the majority of data-quality issues.',
  },
  {
    id: 'singular', name: 'Singular tests', color: '#FF694B',
    what: 'A hand-written SQL file in tests/ that returns rows when something is wrong. 0 rows = pass; any rows = fail.',
    catches: 'Business logic that is not a simple column rule — cross-table invariants, reconciliations.',
    config: `-- tests/no_refund_exceeds_order.sql
select r.order_id, r.refund_amount, o.order_total
from {{ ref('fct_refunds') }} r
join {{ ref('fct_orders') }} o using (order_id)
where r.refund_amount > o.order_total`,
    note: 'A revenue-reconciliation singular test (dbt total vs Finance GL within 0.5%) is the most impressive example — it validates logic across two independent systems.',
  },
  {
    id: 'custom', name: 'Custom generic tests', color: '#F59E0B',
    what: 'A reusable test macro in tests/generic/ that you can then apply to any column in YAML, parameterized.',
    catches: 'Repeated bespoke rules you want to declare declaratively across many models (e.g. "value is non-negative").',
    config: `-- tests/generic/non_negative.sql
{% test non_negative(model, column_name) %}
  select * from {{ model }}
  where {{ column_name }} < 0
{% endtest %}

# then in schema.yml:
      - name: order_total
        tests: [non_negative]`,
    note: 'Custom generics turn a singular test you keep rewriting into a one-word YAML assertion — DRY testing.',
  },
  {
    id: 'unit', name: 'Unit tests', color: '#8B5CF6',
    what: 'Test a model\'s SQL LOGIC against mocked inputs and an expected output — at compile/CI time, without scanning real data. (dbt 1.8+)',
    catches: 'Logic bugs in transformations (a CASE, a window, a join) before they ever touch production data.',
    config: `unit_tests:
  - name: test_revenue_excludes_refunds
    model: fct_revenue
    given:
      - input: ref('fct_orders')
        rows:
          - {order_id: 1, amount: 100, is_refund: false}
          - {order_id: 2, amount: 50,  is_refund: true}
    expect:
      rows:
        - {revenue: 100}`,
    note: 'Data tests check the DATA; unit tests check the LOGIC. A unit test catches "refunds should be excluded" even when no refund exists in prod yet.',
  },
  {
    id: 'contract', name: 'Model contracts', color: '#10B981',
    what: 'Enforce a model\'s output schema (column names, types, constraints) at BUILD time. A mismatch fails before publishing.',
    catches: 'Breaking changes to a model other teams/BI tools consume — a dropped column or changed type.',
    config: `models:
  - name: dim_customers
    config:
      contract: {enforced: true}
    columns:
      - name: customer_id
        data_type: number
        constraints: [{type: not_null}, {type: primary_key}]
      - name: signup_date
        data_type: date`,
    note: 'Contracts move a downstream-breaking change left — it fails the producer\'s build instead of silently breaking a consumer. Pair with model versions for intentional breaks.',
  },
];

const IQ = [
  {
    q: 'What is the difference between a data test and a unit test in dbt?',
    a: `<strong>Data tests</strong> (generic + singular) run against <em>real, materialized data</em> and assert properties of it — "no nulls in order_id", "no refund exceeds its order". They catch bad <em>data</em>.
    <br><br><strong>Unit tests</strong> (dbt 1.8+) run a model\'s <em>SQL logic</em> against <em>mocked inputs</em> with an expected output, at build/CI time, scanning no real data. They catch bad <em>logic</em> — e.g. that <code>fct_revenue</code> excludes refunds — even before any refund exists in production.
    <br><br>You want both: unit tests prove the transformation is correct; data tests prove the live data obeys your assumptions.`,
    tip: 'The crisp line: "data tests check the data, unit tests check the logic." Add that unit tests need no warehouse data, so they run in CI cheaply.',
  },
  {
    q: 'A run produces: 100 tests, 96 passed, 3 warned, 1 failed. What happens operationally, and what do you do?',
    a: `With <code>dbt build</code>:
    <ul>
      <li>The <strong>1 failed</strong> test (severity: error) marks its model errored and <strong>skips that model\'s downstream children</strong> — containment, so bad data never reaches dashboards.</li>
      <li>The <strong>3 warnings</strong> (severity: warn) are logged but do <em>not</em> block the run — known borderline cases you\'re monitoring.</li>
      <li>The <strong>96 passes</strong> and unaffected models build normally.</li>
    </ul>
    You triage the failure first (fix data, fix model, or justify a temporary <code>severity: warn</code>/<code>where</code> filter), then review whether any warning is trending toward a real problem.`,
    tip: 'Mentioning that failures SKIP downstream (not abort everything) and that warnings are a deliberate monitoring tool shows operational maturity.',
  },
  {
    q: 'How would you design data quality for a production dbt project — beyond just adding tests?',
    a: `Layered, not sprinkled:
    <ul>
      <li><strong>Structural</strong>: not_null + unique on every PK, relationships on every FK, accepted_values on every enum — automatically.</li>
      <li><strong>Source</strong>: freshness checks gating the run before transformation.</li>
      <li><strong>Logic</strong>: unit tests on the tricky transformations.</li>
      <li><strong>Contracts</strong>: on every model consumed by other teams/BI.</li>
      <li><strong>Business invariants</strong>: singular tests for reconciliations (revenue vs GL).</li>
      <li><strong>Severity policy</strong>: error gates deploys; warn for watch-list items; store results (run_results) for trends.</li>
      <li><strong>CI</strong>: <code>dbt build</code> on every PR so tests gate merges.</li>
    </ul>`,
    tip: 'Framing it as layers (structural → source → logic → contract → business) rather than "add more tests" is exactly the senior-level answer.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M22 · Data Quality',
    title: 'Testing & Data Quality Lab',
    subtitle: 'The full testing surface — generic, singular, custom, unit, contracts — and what a test run actually does.',
    tabs: [
      { id: 'lab',    label: '🧪 Test Types' },
      { id: 'detail', label: '📋 Test run & data-quality architecture' },
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
    <p class="lab-intro">dbt has five kinds of test, each catching a different class of problem. Pick one to see
    what it catches, how it's declared, and the habit that makes it count.</p>
    <div class="lab-picker" id="m22-pick">
      ${TYPES.map((t, i) => `<button class="lab-chip ${i === 0 ? 'active' : ''}" data-i="${i}">
        <span class="lab-sev" style="background:${t.color}"></span>${t.name}</button>`).join('')}
    </div>
    <div class="stage-panel" id="m22-panel"></div>
  `;
  const panel = tab.querySelector('#m22-panel');

  function render(i) {
    const t = TYPES[i];
    panel.style.setProperty('--panelColor', t.color);
    panel.innerHTML = `
      <div class="stage-panel-head">
        <span class="stage-panel-k" style="color:${t.color}">test type</span>
        <span class="stage-panel-t">${t.name}</span>
      </div>
      <div class="stage-panel-body">
        <p>${t.what}</p>
        <div class="mx-grid" style="margin:14px 0">
          <div class="mx-cell"><div class="mx-k">What it catches</div><div class="mx-v">${t.catches}</div></div>
        </div>
        <div class="mx-k" style="margin-bottom:6px">How it's declared</div>
        <div class="code-block" data-lang="yaml">${escapeHtml(t.config)}</div>
        <div class="ex-interview" style="border-left-color:${t.color};background:${t.color}18;margin-top:14px">
          <span class="ex-iq-badge" style="color:${t.color}">Pro tip</span> ${t.note}</div>
      </div>`;
    injectCodeEnhancements(panel);
  }

  tab.querySelector('#m22-pick').addEventListener('click', e => {
    const chip = e.target.closest('.lab-chip');
    if (!chip) return;
    tab.querySelectorAll('#m22-pick .lab-chip').forEach(c => c.classList.toggle('active', c === chip));
    render(Number(chip.dataset.i));
  });
  render(0);
}

function buildDetail(container) {
  container.querySelector('#tab-detail').innerHTML = `
    <div class="detail-section">
      <h3>What a test run means operationally</h3>
      <p>A nightly <code>dbt build</code> ran 100 tests. Here is what each outcome does:</p>
      <div class="cmp-bars">
        <div class="cmp-bar">
          <div class="cmp-bar-label">✓ 96 passed — build normally</div>
          <div class="cmp-bar-track"><div class="cmp-bar-fill" style="width:96%;background:var(--success)">96</div></div>
          <div class="cmp-bar-sub">Models materialize; children proceed.</div>
        </div>
        <div class="cmp-bar">
          <div class="cmp-bar-label">⚠ 3 warned — logged, non-blocking</div>
          <div class="cmp-bar-track"><div class="cmp-bar-fill" style="width:3%;background:var(--warn)">3</div></div>
          <div class="cmp-bar-sub">severity: warn — known borderline cases you monitor without blocking the run.</div>
        </div>
        <div class="cmp-bar">
          <div class="cmp-bar-label">✗ 1 failed — model errored, downstream skipped</div>
          <div class="cmp-bar-track"><div class="cmp-bar-fill" style="width:1%;background:var(--error);min-width:40px">1</div></div>
          <div class="cmp-bar-sub">severity: error (default) — the model is marked failed and its children are skipped. Blast radius contained.</div>
        </div>
      </div>
    </div>
    <div class="detail-section">
      <h3>Severity, filtering, and store-failures</h3>
      <div class="info-grid">
        <div class="info-card" style="border-left-color:#EF4444"><div class="info-card-title">severity: error</div><div class="info-card-tag" style="color:#EF4444;background:#EF444422">Default</div><div class="info-card-body">Failure fails the run and skips downstream. Use for anything that must never reach prod.</div></div>
        <div class="info-card" style="border-left-color:#F59E0B"><div class="info-card-title">severity: warn</div><div class="info-card-tag" style="color:#F59E0B;background:#F59E0B22">Monitor</div><div class="info-card-body">Logs but doesn't block. Use while investigating, or for borderline cases you want visible.</div></div>
        <div class="info-card" style="border-left-color:#3B82F6"><div class="info-card-title">where / limit</div><div class="info-card-tag" style="color:#3B82F6;background:#3B82F622">Scope</div><div class="info-card-body">Run a test only on the subset you care about (e.g. ignore legacy dirty history).</div></div>
        <div class="info-card" style="border-left-color:#8B5CF6"><div class="info-card-title">store_failures</div><div class="info-card-tag" style="color:#8B5CF6;background:#8B5CF622">Debug</div><div class="info-card-body">Persist failing rows to a table so you can inspect exactly what broke, not just the count.</div></div>
      </div>
    </div>
    <div class="detail-section">
      <h3>Data-quality architecture</h3>
      <p style="font-size:15px;font-weight:600;color:var(--accent)">Structural tests on keys · source freshness gates · unit tests on logic · contracts on consumed models · singular tests for business invariants — all gated by <code>dbt build</code> in CI.</p>
      <p>Quality is layered, not sprinkled. Each layer catches a different failure class; together they are the difference between "we have some tests" and "bad data cannot reach the dashboard." Source freshness has its own lab — see <strong>M23</strong>.</p>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
