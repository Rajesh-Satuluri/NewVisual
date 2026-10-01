// M23 · Source & Freshness Lab
// Sources are where every pipeline begins — and where the most confusing
// failures start. This lab covers source freshness, the five ways a source
// goes wrong, and how to tell a source failure apart from the other kinds.
import { createModuleShell, createIQSection, injectCodeEnhancements } from '../components/module-shell.js';

const CONDITIONS = [
  {
    id: 'missing', name: 'Source missing', color: '#EF4444', sev: 'crit',
    symptom: 'The source table/object does not exist at all — the overnight load never created it.',
    freshness: 'dbt source freshness errors: the relation cannot be found.',
    classify: 'Source failure (upstream). Not your transformation.',
    action: 'Check the loader (Fivetran/Airbyte/custom EL). Re-trigger the load, confirm the object exists, then <code>dbt build --select source:name+</code>. Do not patch models.',
  },
  {
    id: 'delayed', name: 'Source delayed (warn)', color: '#F59E0B', sev: 'high',
    symptom: 'The source exists but its newest row is older than expected — the load is running late but within tolerance.',
    freshness: 'warn_after threshold crossed → freshness returns a WARNING (run continues).',
    classify: 'Source freshness (monitoring). Borderline — watch, don\'t block yet.',
    action: 'Alert on the warning. If the load routinely runs late, work with the source team or widen the threshold deliberately. Downstream still builds on slightly-old data.',
  },
  {
    id: 'stale', name: 'Source stale (error)', color: '#EF4444', sev: 'crit',
    symptom: 'The newest row is far older than allowed — the load has clearly failed or stopped.',
    freshness: 'error_after threshold crossed → freshness ERRORS, which can gate the build.',
    classify: 'Source failure. Building on this would produce wrong (stale) numbers.',
    action: 'Run freshness BEFORE transformation so a stale source fails fast with a clear "source is stale" signal. Fix the load, then build. This is why freshness is a gate, not an afterthought.',
  },
  {
    id: 'zero', name: 'Source arrived with zero rows', color: '#8B5CF6', sev: 'high',
    symptom: 'The table exists and is "fresh", but the load delivered 0 records — an empty partition.',
    freshness: 'Freshness may PASS (loaded_at is recent) even though the data is empty — a dangerous blind spot.',
    classify: 'Data-quality failure. Freshness alone will not catch it.',
    action: 'Add a row-count / not-empty test on the source or staging model (e.g. a singular test asserting count > 0). Freshness checks recency, not volume.',
  },
  {
    id: 'schema', name: 'Source schema changed', color: '#3B82F6', sev: 'high',
    symptom: 'A column was renamed/dropped/retyped by the source system; the staging model that reads it breaks.',
    freshness: 'Freshness passes (data is recent); the failure appears at the staging layer as an invalid-identifier error.',
    classify: 'Source failure surfacing as a transformation error — fix in the staging layer only.',
    action: 'Update the rename/cast in the thin staging model (the one place raw columns are referenced); enable source schema-change alerts and consider contracts on staging.',
  },
];

const IQ = [
  {
    q: 'What is source freshness, and why run it before your transformation build?',
    a: `<code>dbt source freshness</code> checks how recently each source table was loaded, using a <code>loaded_at_field</code> (or warehouse metadata) against <code>warn_after</code> / <code>error_after</code> thresholds.
    <br><br>Run it <strong>before</strong> <code>dbt build</code> so a stale or missing source fails the pipeline <em>early</em>, with a clear "source is late" signal — instead of letting the transformation run and surface a confusing mid-pipeline SQL error (or, worse, silently produce stale numbers). Fail fast, fail cheap, and point the blame upstream where it belongs.`,
    tip: 'The sequencing point — freshness gate first, then build — is what interviewers listen for. It shows you design pipelines, not just models.',
  },
  {
    q: 'A source table is "fresh" but has zero rows. Will freshness catch it? How do you protect against it?',
    a: `No — freshness checks <strong>recency</strong> (how old the newest row is), not <strong>volume</strong>. If the loader wrote an empty-but-recent partition, <code>loaded_at</code> is current, so freshness passes while the data is empty.
    <br><br>Protect against it with a <strong>not-empty / row-count test</strong> on the source or staging model (a singular test asserting <code>count(*) > 0</code>, or a volume-anomaly test comparing to a trailing baseline). Recency and volume are two different checks — you need both.`,
    tip: 'This "freshness ≠ volume" distinction is a great differentiator; most candidates assume freshness covers empty loads.',
  },
  {
    q: 'Walk me through distinguishing a source failure from a transformation failure from a warehouse failure.',
    a: `<ul>
      <li><strong>Source failure</strong> — missing/stale/empty source; shows up as "object does not exist", a freshness error, or an invalid-identifier error at the <em>staging</em> layer. Owner: the loader/source team.</li>
      <li><strong>Transformation failure</strong> — a logic/SQL error in <em>your</em> model (bad column, divide-by-zero). Shows up mid-graph; inspect the compiled SQL. Owner: you.</li>
      <li><strong>Warehouse failure</strong> — timeout, OOM, permission. An infra/sizing problem, not a logic bug.</li>
    </ul>
    The fastest tell: where in the DAG did the first error occur, and is the object missing (source) vs the SQL wrong (transform) vs the engine complaining (warehouse)?`,
    tip: 'Tie it to the staging layer: "a schema change is a source problem that surfaces in staging — which is exactly why staging exists as the one place that touches raw columns."',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M23 · Data Quality',
    title: 'Source & Freshness Lab',
    subtitle: 'Where pipelines begin and the confusing failures start. Freshness gates, the five source failures, and how to classify them.',
    tabs: [
      { id: 'lab',    label: '📥 Source Failures' },
      { id: 'detail', label: '📋 Freshness config & pipeline' },
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
    <p class="lab-intro">A source can go wrong five ways — and only some are caught by freshness. Pick one to see
    what dbt sees, whether freshness catches it, how to classify it, and what to do.</p>
    <div class="lab-picker" id="m23-pick">
      ${CONDITIONS.map((c, i) => `<button class="lab-chip ${i === 0 ? 'active' : ''}" data-i="${i}">
        <span class="lab-sev sev-${c.sev}"></span>${c.name}</button>`).join('')}
    </div>
    <div class="stage-panel" id="m23-panel"></div>
  `;
  const panel = tab.querySelector('#m23-panel');

  function render(i) {
    const c = CONDITIONS[i];
    panel.style.setProperty('--panelColor', c.color);
    panel.innerHTML = `
      <div class="stage-panel-head">
        <span class="stage-panel-k" style="color:${c.color}">source condition</span>
        <span class="stage-panel-t">${c.name}</span>
      </div>
      <div class="stage-panel-body">
        <div class="mx-grid">
          <div class="mx-cell"><div class="mx-k">What happens</div><div class="mx-v">${c.symptom}</div></div>
          <div class="mx-cell"><div class="mx-k">Does freshness catch it?</div><div class="mx-v">${c.freshness}</div></div>
          <div class="mx-cell"><div class="mx-k">Classification</div><div class="mx-v">${c.classify}</div></div>
          <div class="mx-cell"><div class="mx-k">What to do</div><div class="mx-v">${c.action}</div></div>
        </div>
      </div>`;
    injectCodeEnhancements(panel);
  }

  tab.querySelector('#m23-pick').addEventListener('click', e => {
    const chip = e.target.closest('.lab-chip');
    if (!chip) return;
    tab.querySelectorAll('#m23-pick .lab-chip').forEach(c => c.classList.toggle('active', c === chip));
    render(Number(chip.dataset.i));
  });
  render(0);
}

function buildDetail(container) {
  container.querySelector('#tab-detail').innerHTML = `
    <div class="detail-section">
      <h3>The source-to-mart pipeline</h3>
      <div class="pipe" style="margin-bottom:18px">
        <div class="pipe-stage"><div class="pipe-ic">📦</div><div class="pipe-name">Source</div><div class="pipe-sub">raw loaded</div></div>
        <div class="pipe-stage"><div class="pipe-ic">⏱️</div><div class="pipe-name">Freshness</div><div class="pipe-sub">gate</div></div>
        <div class="pipe-stage"><div class="pipe-ic">🧹</div><div class="pipe-name">Staging</div><div class="pipe-sub">rename/cast</div></div>
        <div class="pipe-stage"><div class="pipe-ic">🔗</div><div class="pipe-name">Intermediate</div><div class="pipe-sub">join/enrich</div></div>
        <div class="pipe-stage"><div class="pipe-ic">⭐</div><div class="pipe-name">Marts</div><div class="pipe-sub">business</div></div>
      </div>
      <p>Freshness sits between the raw load and your transformations as a <strong>gate</strong>: if the source is late or missing, stop here with a clear signal rather than building on bad data.</p>
    </div>
    <div class="detail-section">
      <h3>Declaring source freshness</h3>
      <div class="code-block" data-lang="yaml">sources:
  - name: stripe
    loaded_at_field: _loaded_at
    freshness:
      warn_after:  {count: 6,  period: hour}   # late → warning
      error_after: {count: 12, period: hour}   # stale → error (gates build)
    tables:
      - name: payments
        freshness:
          error_after: {count: 3, period: hour}   # override per table</div>
      <div class="code-block" data-lang="bash" style="margin-top:12px">dbt source freshness        # run the gate first
dbt build --select source:stripe+   # then build the affected lineage</div>
    </div>
    <div class="detail-section">
      <h3>Four failure classes — where each surfaces</h3>
      <div class="compare-table-wrap">
      <table class="compare-table">
        <thead><tr><th>Class</th><th>Surfaces as</th><th>Caught by</th><th>Owner</th></tr></thead>
        <tbody>
          <tr><td class="good">Source</td><td>object missing / freshness error / invalid identifier in staging</td><td>freshness + staging build</td><td>loader / source team</td></tr>
          <tr><td class="good">Data quality</td><td>a test fails (null/dup/enum/empty)</td><td>dbt tests</td><td>you + source</td></tr>
          <tr><td class="good">Transformation</td><td>SQL/logic error mid-graph</td><td>compiled SQL / unit tests</td><td>you</td></tr>
          <tr><td class="good">Warehouse</td><td>timeout / OOM / permission</td><td>warehouse logs</td><td>platform</td></tr>
        </tbody>
      </table>
      </div>
      <p style="font-size:15px;font-weight:600;color:var(--accent)">Freshness checks recency, not volume. Run it before the build to fail fast on late sources — but add a row-count test, because a fresh-but-empty load will sail right through.</p>
    </div>
  `;
}
