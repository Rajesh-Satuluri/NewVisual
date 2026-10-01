// M30 · dbt + Airflow
// The anchor of the platform wave: orchestration vs transformation. Where
// Airflow ends and dbt begins, how they integrate, and the interview scenarios
// that separate people who have run both in production from people who haven't.
import { createModuleShell, createIQSection, injectCodeEnhancements } from '../components/module-shell.js';

const LAYERS = [
  { ic: '⏰', name: 'Airflow', sub: 'orchestrate', color: '#017CEE' },
  { ic: '📥', name: 'Extract / Load', sub: 'Fivetran/Airbyte', color: '#3B82F6' },
  { ic: '🦆', name: 'dbt', sub: 'transform/test', color: '#FF694B' },
  { ic: '🧹', name: 'Staging', sub: 'models', color: '#8B5CF6' },
  { ic: '⭐', name: 'Marts', sub: 'models', color: '#10B981' },
  { ic: '📊', name: 'BI / ML', sub: 'consume', color: '#F59E0B' },
];

const QA = [
  {
    id: 'why', q: 'Why use Airflow WITH dbt instead of dbt alone?', color: '#017CEE',
    a: `dbt transforms data that is <em>already in the warehouse</em>. It does not extract from APIs, load files, trigger non-SQL steps, wait on external events, or manage cross-system retries. Airflow is the <strong>orchestrator</strong> that runs the whole pipeline — ingestion, dbt, reverse-ETL, ML — in dependency order, on a schedule, with retries, SLAs, backfills, and alerting across systems. dbt owns the T; Airflow owns the "when, in what order, and what else".`,
  },
  {
    id: 'whynot', q: 'Why NOT use dbt as your entire orchestration platform?', color: '#FF694B',
    a: `Because dbt is scoped to in-warehouse SQL transformation. It has no general task scheduler, no sensors/event triggers, no way to run arbitrary Python/EL steps or coordinate non-dbt systems, and limited cross-system retry/alerting. dbt Cloud jobs can schedule dbt itself, but the moment your pipeline includes ingestion, file drops, API calls, ML training, or reverse-ETL, you need a real orchestrator. Using dbt to orchestrate everything is forcing a transformation tool to be a scheduler.`,
  },
  {
    id: 'retries', q: 'Where should retries live — Airflow or dbt?', color: '#F59E0B',
    a: `Mostly in <strong>Airflow</strong>, at the task level, because transient failures (warehouse blips, network) are operational concerns the orchestrator owns. But make dbt steps <strong>idempotent</strong> so a retry is safe: incremental models with <code>unique_key</code> upsert, not duplicate. For data-quality failures, you do NOT blindly retry — a failing test means bad data, so Airflow should surface it, not loop. Retry infra errors; alert on data errors.`,
  },
  {
    id: 'granularity', q: 'One Airflow task for `dbt build`, or one task per model?', color: '#8B5CF6',
    a: `Two schools. <strong>Monolithic</strong> (<code>BashOperator: dbt build</code>) is simple but gives coarse retries and no per-model visibility in Airflow. <strong>Per-model</strong> (via <code>astronomer-cosmos</code>, which renders the dbt DAG into Airflow tasks from the manifest) gives granular retries, parallelism, and per-model observability in the Airflow UI — at the cost of complexity. Mid-size teams often run <code>dbt build --select</code> per domain/tag; large teams use Cosmos for full per-node control.`,
  },
  {
    id: 'design', q: 'Design a production pipeline that uses both.', color: '#10B981',
    a: `A single Airflow DAG: (1) ingestion tasks (Fivetran/Airbyte triggers or sensors wait for loads) → (2) <code>dbt source freshness</code> as a gate → (3) <code>dbt build</code> (models + tests, in dependency order, idempotent/incremental) → (4) on success, reverse-ETL / BI cache refresh / ML feature job. Airflow owns scheduling, retries, SLAs, backfills and alerting across all of it; dbt owns the transformation + tests and publishes artifacts the next run and your observability consume.`,
  },
];

const IQ = [
  {
    q: 'Explain the division of responsibility between Airflow and dbt in one pipeline.',
    a: `<strong>Airflow = orchestration</strong>: when things run, in what order across systems, retries, SLAs, backfills, sensors/events, and alerting. It coordinates ingestion, dbt, reverse-ETL and ML as one DAG.
    <br><br><strong>dbt = transformation</strong>: the in-warehouse SQL modeling, testing, documentation and lineage — the "T" of ELT. It turns raw loaded tables into tested marts.
    <br><br>The clean seam: Airflow triggers <code>dbt build</code> (often after a freshness gate) and reacts to its success/failure; dbt doesn\'t know or care what scheduled it. Keep dbt steps idempotent so Airflow can safely retry them.`,
    tip: '"Airflow owns when and what-else; dbt owns the transformation" — then add that dbt steps must be idempotent for retries to be safe. That pairing is the senior answer.',
  },
  {
    q: 'Monolithic `dbt build` task vs per-model Airflow tasks — trade-offs?',
    a: `<strong>Monolithic</strong> (one BashOperator running <code>dbt build</code>): simple, one place to look, but a single failure retries the whole run and Airflow has no per-model visibility.
    <br><br><strong>Per-model</strong> (e.g. astronomer-cosmos renders the dbt manifest into Airflow tasks): granular retries (re-run just the failed model), parallelism honoring the dbt DAG, and per-node status in the Airflow UI — at the cost of more moving parts and manifest parsing.
    <br><br>Pragmatic middle: group by domain/tag (<code>dbt build --select tag:finance</code>) so retries and visibility are per-domain without full per-node complexity.`,
    tip: 'Naming astronomer-cosmos and the tag-based middle ground shows you know the current ecosystem, not just the concept.',
  },
  {
    q: 'A dbt test fails inside an Airflow-orchestrated run. What should Airflow do?',
    a: `It should <strong>surface and stop</strong>, not blindly retry. A failing test means bad <em>data</em> — retrying runs the same bad data again. So the dbt task fails, Airflow marks it failed, alerts on-call, and (via the dbt DAG / <code>build</code> gating) downstream models are skipped so bad data doesn\'t propagate.
    <br><br>Contrast with a transient <em>infrastructure</em> error (warehouse timeout, connection reset): that is a legitimate Airflow task retry, and safe because dbt steps are idempotent. The rule: retry infra failures, alert on data failures.`,
    tip: '"Retry infra failures, alert on data failures" is a crisp, memorable principle — and it shows you distinguish the two failure types.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M30 · Platform & Architecture',
    title: 'dbt + Airflow',
    subtitle: 'Orchestration vs transformation. Where Airflow ends and dbt begins — and the interview scenarios that test it.',
    tabs: [
      { id: 'lab',    label: '🔗 Orchestration Q&A' },
      { id: 'detail', label: '📋 Architecture & integration' },
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
    <p class="lab-intro">Airflow orchestrates; dbt transforms. These are the questions interviewers use to see whether
    you actually understand the seam. Pick one.</p>
    <div class="pipe" style="margin-bottom:18px">
      ${LAYERS.map(l => `<div class="pipe-stage" style="border-left:3px solid ${l.color}"><div class="pipe-ic">${l.ic}</div><div class="pipe-name">${l.name}</div><div class="pipe-sub">${l.sub}</div></div>`).join('')}
    </div>
    <div class="lab-picker" id="m30-pick">
      ${QA.map((q, i) => `<button class="lab-chip ${i === 0 ? 'active' : ''}" data-i="${i}">${q.q}</button>`).join('')}
    </div>
    <div class="stage-panel" id="m30-panel"></div>
  `;
  const panel = tab.querySelector('#m30-panel');

  function render(i) {
    const q = QA[i];
    panel.style.setProperty('--panelColor', q.color);
    panel.innerHTML = `
      <div class="stage-panel-head"><span class="stage-panel-t">${q.q}</span></div>
      <div class="stage-panel-body">${q.a}</div>`;
    injectCodeEnhancements(panel);
  }

  tab.querySelector('#m30-pick').addEventListener('click', e => {
    const chip = e.target.closest('.lab-chip');
    if (!chip) return;
    tab.querySelectorAll('#m30-pick .lab-chip').forEach(c => c.classList.toggle('active', c === chip));
    render(Number(chip.dataset.i));
  });
  render(0);
}

function buildDetail(container) {
  container.querySelector('#tab-detail').innerHTML = `
    <div class="detail-section">
      <h3>The reference pipeline</h3>
      <div class="code-block" data-lang="python"># one Airflow DAG orchestrating a daily ELT + dbt pipeline
with DAG("daily_analytics", schedule="0 2 * * *", catchup=False) as dag:
    load = trigger_fivetran_sync("stripe", "shopify")      # EXTRACT/LOAD
    freshness = BashOperator(task_id="freshness",
        bash_command="dbt source freshness")              # GATE first
    transform = BashOperator(task_id="dbt_build",
        bash_command="dbt build --target prod")           # TRANSFORM + TEST
    activate = trigger_reverse_etl("hightouch")            # reverse-ETL / BI

    load >> freshness >> transform >> activate</div>
      <p>Airflow decides <em>when</em> and <em>in what order</em> across systems; dbt owns the transform + tests in the middle. A freshness gate between load and build stops the run early on a bad source.</p>
    </div>
    <div class="detail-section">
      <h3>Integration patterns</h3>
      <div class="info-grid">
        <div class="info-card" style="border-left-color:#017CEE"><div class="info-card-title">BashOperator: dbt build</div><div class="info-card-tag" style="color:#017CEE;background:#017CEE22">Simple</div><div class="info-card-body">One task runs the whole dbt project. Easiest to set up; coarse retries, no per-model visibility in Airflow.</div></div>
        <div class="info-card" style="border-left-color:#FF694B"><div class="info-card-title">astronomer-cosmos</div><div class="info-card-tag" style="color:#FF694B;background:#FF694B22">Granular</div><div class="info-card-body">Renders the dbt manifest into Airflow tasks — per-model retries, parallelism, and status in the Airflow UI.</div></div>
        <div class="info-card" style="border-left-color:#8B5CF6"><div class="info-card-title">Per-domain --select</div><div class="info-card-tag" style="color:#8B5CF6;background:#8B5CF622">Middle ground</div><div class="info-card-body"><code>dbt build --select tag:finance</code> per task — retries & visibility per domain without full per-node complexity.</div></div>
        <div class="info-card" style="border-left-color:#10B981"><div class="info-card-title">Idempotency</div><div class="info-card-tag" style="color:#10B981;background:#10B98122">Safe retries</div><div class="info-card-body">Incremental models with unique_key upsert, so an Airflow retry re-runs safely without duplicating data.</div></div>
      </div>
      <p style="font-size:15px;font-weight:600;color:var(--accent)">Airflow owns when & what-else; dbt owns the transform & tests. Gate on freshness, keep dbt idempotent, retry infra errors, and alert on data errors.</p>
      <p>This tool's sibling <strong>Airflow Visualizer</strong> covers the orchestration side in depth.</p>
    </div>
  `;
}

function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
