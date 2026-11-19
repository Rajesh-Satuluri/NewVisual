// M38 · Python Models
// A dbt model can be a Python function that returns a DataFrame instead of a
// SELECT. It is still a node in the same DAG — ref()/source()/config() all work
// — but it runs on the WAREHOUSE's Python runtime (Snowpark / PySpark / BigQuery),
// not on your laptop. The hard part is knowing the ~5% of work where Python earns
// its cost over SQL. This module makes that decision concrete, then shows the
// anatomy. Nothing is executed; the code is real, illustrative dbt Python.
import { createModuleShell, createIQSection, injectCodeEnhancements } from '../components/module-shell.js';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ── "SQL or Python?" — the decision, made concrete ──────────────────────────
const TASKS = [
  { id: 'rollup', label: 'Revenue rollup by month', verdict: 'sql',
    why: 'A <code>group by</code> with a date truncation. SQL is simpler, faster, cheaper, portable across warehouses, and trivially testable. Reaching for Python here only adds a runtime dependency.' },
  { id: 'sessionize', label: 'Sessionize clickstream', verdict: 'sql',
    why: 'Window functions (<code>lag</code>, running sums, gaps-and-islands) express sessionization directly in SQL. No Python needed — and the SQL version runs natively in the warehouse engine.' },
  { id: 'pivot', label: 'Pivot categories to columns', verdict: 'sql',
    why: 'A classic <code>CASE</code>/conditional-aggregate, or <code>dbt_utils.pivot</code>. SQL handles it cleanly; a DataFrame pivot would be slower and less portable.' },
  { id: 'dedupe', label: 'Drop exact duplicate rows', verdict: 'sql',
    why: '<code>row_number() over (partition by …)</code> and keep <code>rn = 1</code>. Pure SQL — this is the grain-fixing pattern from the Project Builder IDE.' },
  { id: 'churn', label: 'Score churn probability (ML)', verdict: 'python',
    why: 'Running a trained <strong>scikit-learn</strong> model over each customer is inference SQL simply cannot express. This is the canonical Python-model case: load the features with <code>dbt.ref()</code>, apply the model, return the scored DataFrame.',
    code: `def model(dbt, session):
    dbt.config(materialized="table", packages=["scikit-learn", "pandas"])
    import joblib, pandas as pd
    features = dbt.ref("fct_customer_features").to_pandas()
    clf = joblib.load("/models/churn.pkl")
    features["churn_score"] = clf.predict_proba(features[FEATURES])[:, 1]
    return features[["customer_id", "churn_score"]]` },
  { id: 'forecast', label: 'Forecast demand (Prophet)', verdict: 'python',
    why: 'Time-series forecasting with a library like <strong>Prophet</strong> or <strong>statsmodels</strong> is math SQL has no primitives for. Python models give you the whole PyData stack, run on the warehouse.',
    code: `def model(dbt, session):
    dbt.config(materialized="table", packages=["prophet", "pandas"])
    hist = dbt.ref("fct_daily_sales").to_pandas()
    from prophet import Prophet
    m = Prophet().fit(hist.rename(columns={"day": "ds", "units": "y"}))
    fc = m.predict(m.make_future_dataframe(periods=90))
    return fc[["ds", "yhat", "yhat_lower", "yhat_upper"]]` },
  { id: 'nlp', label: 'Sentiment on product reviews (NLP)', verdict: 'python',
    why: 'Tokenizing text and scoring sentiment needs an NLP library (<strong>transformers</strong>, <strong>nltk</strong>, <strong>spaCy</strong>). SQL can pattern-match but cannot do real NLP — this is squarely Python territory.' },
  { id: 'fuzzy', label: 'Fuzzy-match customer names', verdict: 'python',
    why: 'Approximate string matching (<strong>rapidfuzz</strong>, <strong>recordlinkage</strong>) is awkward and slow in SQL. A Python model does the record-linkage cleanly — though for exact dedupe you would stay in SQL.' },
];

const ANATOMY = `# models/marts/customer_churn.py
def model(dbt, session):
    # config() takes the same options as the SQL config() block
    dbt.config(
        materialized="table",
        packages=["scikit-learn", "pandas"],   # installed into the warehouse runtime
    )

    # ref()/source() return a DataFrame (Snowpark / PySpark / BigQuery DataFrame)
    customers = dbt.ref("fct_customer_features")

    # convert to pandas for library work (fine for modest data)
    pdf = customers.to_pandas()

    import joblib
    clf = joblib.load("/models/churn.pkl")
    pdf["churn_score"] = clf.predict_proba(pdf[FEATURES])[:, 1]

    # return a DataFrame — dbt materializes it as the model's table
    return pdf[["customer_id", "churn_score"]]`;

const RUNTIMES = [
  ['Snowflake', 'Snowpark Python — <code>dbt.ref()</code> returns a Snowpark DataFrame; packages come from the Snowflake Anaconda channel.'],
  ['Databricks', 'PySpark — <code>dbt.ref()</code> returns a Spark DataFrame; the whole cluster + libraries are available.'],
  ['BigQuery', 'Python via Dataproc Serverless (PySpark) — configured with a Dataproc cluster/region.'],
  ['Where it does NOT run', 'Not on your laptop and not inside dbt itself. If your warehouse has no Python runtime (e.g. plain Postgres/Redshift), Python models are not available.'],
];

const IQ = [
  {
    q: 'What is a dbt Python model, and where does the Python actually run?',
    a: `Instead of a <code>.sql</code> file with a <code>SELECT</code>, a Python model is a <code>.py</code> file with a
      <code>def model(dbt, session)</code> that returns a <strong>DataFrame</strong>. dbt treats it as an ordinary node
      in the DAG — <code>dbt.ref()</code>, <code>dbt.source()</code> and <code>dbt.config()</code> all work, and SQL
      models can <code>ref()</code> it and vice-versa. The crucial point: the Python runs on the
      <strong>warehouse's Python runtime</strong> — Snowpark on Snowflake, PySpark on Databricks, Dataproc on BigQuery —
      <em>not</em> on your laptop and <em>not</em> inside dbt. dbt orchestrates and materializes the returned DataFrame
      as a table.`,
    tip: 'The line interviewers want: "it runs in the warehouse (Snowpark/PySpark), not locally — dbt just orchestrates it." Many candidates assume it runs in dbt.',
  },
  {
    q: 'When would you reach for a Python model over SQL?',
    a: `Only for the slice of work SQL genuinely cannot do well: <strong>ML inference/training</strong> (scikit-learn),
      <strong>forecasting</strong> (Prophet/statsmodels), <strong>NLP</strong> (transformers/spaCy),
      <strong>fuzzy matching/record linkage</strong>, or complex statistics that need the PyData stack. For ordinary
      transforms — aggregations, joins, window functions, pivots, dedupe — <strong>stay in SQL</strong>: it is simpler,
      faster, cheaper, more portable, and far easier to test and review. The rule is "SQL by default; Python for the ~5%
      it can't express."`,
    tip: 'Frame it as a cost: Python models add a runtime, are slower/costlier, and are harder to test. Justify them by capability, not preference.',
  },
  {
    q: 'What are the trade-offs and limitations of Python models?',
    a: `<strong>Warehouse support is limited</strong> — only Snowflake, Databricks and BigQuery have first-class
      support; plain Postgres/Redshift do not. They are generally <strong>slower and more expensive</strong> than SQL,
      <strong>harder to test</strong> (schema tests still work on the output, but unit-testing the Python is on you), and
      they add a <strong>dependency surface</strong> (package versions in the warehouse runtime). Reviews also skew to a
      SQL-first team. The upside — access to the entire PyData ecosystem inside your dbt DAG — is worth it precisely when
      the task needs it, and a tax when it doesn't.`,
    tip: 'Name four: limited warehouse support, cost/speed, testability, dependency management. That breadth signals real experience.',
  },
  {
    q: 'Can a SQL model depend on a Python model (and vice-versa)?',
    a: `Yes — that is the whole point of keeping them in one DAG. A Python model that outputs
      <code>customer_id, churn_score</code> is just a table; a downstream <strong>SQL</strong> model can
      <code>{{ ref('customer_churn') }}</code> it and join it to orders, and an upstream SQL model can be the
      <code>dbt.ref()</code> a Python model consumes. Lineage, <code>state:modified+</code> selection, tests and docs all
      work across the language boundary. So the common pattern is: SQL for the heavy set-based transforms, a Python node
      for the one ML/stats step, then SQL again to serve it.`,
    tip: 'Emphasize the seamless interop: lineage and selection cross the SQL↔Python boundary, so you mix them per-step, not per-project.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M38 · Ecosystem',
    title: 'Python Models',
    subtitle: 'A dbt model can be a Python function returning a DataFrame — same DAG, run on the warehouse. The skill is knowing the ~5% of work where Python beats SQL.',
    tabs: [
      { id: 'decide', label: '🤔 SQL or Python?' },
      { id: 'anatomy', label: '🧬 Anatomy & runtime' },
      { id: 'iq',      label: '🎯 Interview Q&A' },
    ],
  });

  buildDecide(container);
  buildAnatomy(container);
  container.querySelector('#tab-iq').innerHTML = createIQSection(IQ);
}

function buildDecide(container) {
  const tab = container.querySelector('#tab-decide');
  tab.innerHTML = `
    <p class="lab-intro">Pick a task and see the honest verdict — <strong>SQL by default</strong>, Python only where it
      earns its cost. Notice how the Python wins all share one trait: they need a <em>library</em> SQL doesn't have.</p>
    <div class="lab-picker" id="pym-pick">
      ${TASKS.map((t, i) => `<button class="lab-chip ${i === 0 ? 'active' : ''}" data-i="${i}">${t.label}</button>`).join('')}
    </div>
    <div class="stage-panel" id="pym-panel"></div>
  `;

  const panel = tab.querySelector('#pym-panel');
  let i = 0;

  function render() {
    const t = TASKS[i];
    const isPy = t.verdict === 'python';
    const color = isPy ? '#A855F7' : '#10B981';
    panel.style.setProperty('--panelColor', color);
    panel.innerHTML = `
      <div class="stage-panel-head">
        <span class="stage-panel-k" style="color:${color}">verdict</span>
        <span class="stage-panel-t">${t.label}</span>
        <span class="pym-badge" style="background:${color}1f;color:${color};border-color:${color}">${isPy ? '🐍 Python model' : '🗄️ Stay in SQL'}</span>
      </div>
      <div class="stage-panel-body">
        <p class="pym-why">${t.why}</p>
        ${t.code ? `<div class="pkg-step">What the Python model looks like</div><div class="code-block" data-lang="python">${esc(t.code)}</div>` : ''}
      </div>`;
    injectCodeEnhancements(panel);
  }

  tab.querySelector('#pym-pick').addEventListener('click', e => {
    const chip = e.target.closest('.lab-chip'); if (!chip) return;
    i = Number(chip.dataset.i);
    tab.querySelectorAll('#pym-pick .lab-chip').forEach(x => x.classList.toggle('active', x === chip));
    render();
  });
  render();
}

function buildAnatomy(container) {
  container.querySelector('#tab-anatomy').innerHTML = `
    <div class="detail-section">
      <h3>Anatomy of a Python model</h3>
      <p>One function, <code>model(dbt, session)</code>, returning a DataFrame. The <code>dbt</code> object is how you
        reach the rest of the project: <code>dbt.ref()</code> / <code>dbt.source()</code> return DataFrames, and
        <code>dbt.config()</code> takes the same options as a SQL <code>config()</code> block (plus
        <code>packages</code>).</p>
      <div class="code-block" data-lang="python">${esc(ANATOMY)}</div>
    </div>

    <div class="detail-section">
      <h3>Where it runs — the warehouse, not your laptop</h3>
      <div class="mx-grid">
        ${RUNTIMES.map(r => `<div class="mx-cell"><div class="mx-k">${r[0]}</div><div class="mx-v">${r[1]}</div></div>`).join('')}
      </div>
    </div>

    <div class="detail-section">
      <h3>SQL ⇄ Python interop — one DAG</h3>
      <div class="pipe" style="margin-bottom:14px">
        <div class="pipe-stage"><div class="pipe-ic">🗄️</div><div class="pipe-name">SQL: fct_customer_features</div><div class="pipe-sub">heavy set-based transforms</div></div>
        <div class="pipe-stage"><div class="pipe-ic">🐍</div><div class="pipe-name">Python: customer_churn</div><div class="pipe-sub">the one ML step</div></div>
        <div class="pipe-stage"><div class="pipe-ic">🗄️</div><div class="pipe-name">SQL: mart_churn_actions</div><div class="pipe-sub">join score back, serve BI</div></div>
      </div>
      <p>A Python model's output is just a table, so a downstream <strong>SQL</strong> model can <code>ref()</code> it and
        an upstream SQL model can feed it. Lineage, <code>state:modified+</code> selection, tests and docs all cross the
        language boundary — so you mix SQL and Python <strong>per step</strong>, not per project.</p>
    </div>

    <div class="detail-section">
      <h3>The trade-offs — reach for Python deliberately</h3>
      <div class="cheat-grid">
        <div class="cheat-card"><div class="cheat-head">✅ Python earns it</div><div class="cheat-body">
          <div class="cheat-row"><div class="cheat-k">ML inference / training</div><div class="cheat-v">scikit-learn, xgboost</div></div>
          <div class="cheat-row"><div class="cheat-k">Forecasting</div><div class="cheat-v">Prophet, statsmodels</div></div>
          <div class="cheat-row"><div class="cheat-k">NLP / text</div><div class="cheat-v">transformers, spaCy</div></div>
          <div class="cheat-row"><div class="cheat-k">Fuzzy matching</div><div class="cheat-v">rapidfuzz, recordlinkage</div></div>
        </div></div>
        <div class="cheat-card"><div class="cheat-head">⚠️ The cost</div><div class="cheat-body">
          <div class="cheat-row"><div class="cheat-k">Warehouse support</div><div class="cheat-v">Snowflake / Databricks / BigQuery only</div></div>
          <div class="cheat-row"><div class="cheat-k">Speed &amp; cost</div><div class="cheat-v">generally slower &amp; pricier than SQL</div></div>
          <div class="cheat-row"><div class="cheat-k">Testing</div><div class="cheat-v">schema tests work; unit-testing is on you</div></div>
          <div class="cheat-row"><div class="cheat-k">Dependencies</div><div class="cheat-v">package versions in the runtime</div></div>
        </div></div>
      </div>
    </div>

    <div class="detail-section">
      <p style="padding:12px 14px;background:var(--surface-2);border-left:3px solid var(--accent);border-radius:8px;font-size:14px;margin:0">
        <strong>🧠 First principles —</strong> a dbt node is defined by its <em>inputs (refs) and its output (a
        relation)</em>, not by the language in between. That is why Python slots into the same DAG as SQL with no special
        plumbing — and why the right question is never "SQL or Python project?" but "what is the cheapest language for
        <em>this</em> node?". <a href="#m10" style="color:var(--accent);font-weight:600">dbt Models (M10)</a> ·
        <a href="#m37" style="color:var(--accent);font-weight:600">Packages (M37)</a>.
      </p>
    </div>
  `;
}
