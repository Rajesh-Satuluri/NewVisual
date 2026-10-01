// M31 · Real-World Case Studies
// Five production architectures across industries, each with its source → dbt →
// consumer stack and a realistic incident that tests whether you can reason
// about a whole platform, not just a model.
import { createModuleShell, createIQSection, injectCodeEnhancements } from '../components/module-shell.js';

const CASES = [
  {
    id: 'ecom', name: '🛒 E-commerce', color: '#FF694B',
    sources: 'Shopify orders, Stripe payments, web clickstream, ad spend (Meta/Google)',
    stack: ['Fivetran → Snowflake', 'stg_* (clean)', 'int_orders_enriched', 'fct_orders / fct_revenue', 'Looker + marketing reverse-ETL'],
    grain: 'fct_orders at one row per order; fct_revenue daily.',
    incident: 'Stripe double-emitted webhook events for 3 hours → revenue doubled on the exec dashboard.',
    root: 'Incremental fct_orders processed duplicate payment events; no dedup in staging and unique_key alone did not catch payment-level dups.',
    fix: 'Dedup in stg_payments with qualify row_number() on event_id; add a volume-anomaly test and a revenue-vs-Stripe reconciliation singular test.',
  },
  {
    id: 'bank', name: '🏦 Banking', color: '#10B981',
    sources: 'Core banking ledger (CDC), card transactions, KYC/customer master, rates',
    stack: ['CDC → BigQuery', 'stg_* + PII masking', 'int_balances / int_txns', 'fct_transactions, dim_account (SCD2 snapshot)', 'Risk & regulatory reporting'],
    grain: 'fct_transactions one row per posted txn; dim_account SCD2 for history.',
    incident: 'A regulatory report showed balances that did not reconcile with the core ledger for one day.',
    root: 'A late-arriving batch of backdated transactions fell below the incremental high-watermark and was never processed.',
    fix: 'Add a lookback window sized to the settlement window + unique_key; a daily reconciliation test comparing fct balances to the ledger GL; snapshot for auditable history.',
  },
  {
    id: 'retail', name: '📦 Retail supply chain', color: '#3B82F6',
    sources: 'POS sales, warehouse inventory, supplier EDI feeds, logistics tracking',
    stack: ['Airbyte → Databricks (Delta)', 'stg_* per system', 'int_inventory_position', 'fct_sales, fct_inventory_daily', 'Replenishment + demand forecasting (ML)'],
    grain: 'fct_inventory_daily one row per SKU per location per day.',
    incident: 'The replenishment model over-ordered for dozens of SKUs; warehouses overstocked.',
    root: 'A supplier EDI feed arrived with zero rows (empty-but-fresh), so on-order quantities dropped to 0 and the model treated it as "nothing inbound".',
    fix: 'Freshness alone missed it (recent but empty) → add a not-empty/row-count test on the source and a per-SKU volume check before the forecast consumes it.',
  },
  {
    id: 'cust', name: '👥 Customer analytics', color: '#8B5CF6',
    sources: 'Product events (Segment), CRM (Salesforce), support (Zendesk), billing',
    stack: ['Segment + Fivetran → Snowflake', 'stg_* events/crm', 'int_sessions / int_user_daily', 'fct_activity, dim_customer, customer_360', 'Churn model + CS dashboards'],
    grain: 'customer_360 one row per customer; fct_activity per event.',
    incident: 'The churn model\'s features silently degraded; predictions drifted.',
    root: 'A Segment tracking change renamed an event; stg_events still referenced the old name, so a key feature went null — no error, just nulls.',
    fix: 'Contract on customer_360 to catch the type/nullability change; a not_null test on the feature column; staging alias isolates the rename to one file.',
  },
  {
    id: 'mktg', name: '📣 Marketing analytics', color: '#F59E0B',
    sources: 'Ad platforms (Meta/Google/TikTok), GA4, CRM conversions, spend',
    stack: ['Fivetran → BigQuery', 'stg_* per channel', 'int_spend_unified / int_attribution', 'fct_campaign_performance, fct_attribution', 'Dashboards + bid reverse-ETL'],
    grain: 'fct_campaign_performance one row per campaign per day per channel.',
    incident: 'ROAS numbers disagreed between the dashboard and the ad platform UIs.',
    root: 'Each channel defines "conversion" and currency differently; the unified model mixed definitions and did not normalize currency — the classic "three revenue numbers" at marketing scale.',
    fix: 'A single tested int_attribution model with one conversion definition + currency normalization macro; accepted_values tests on channel; reconciliation vs platform exports.',
  },
];

const IQ = [
  {
    q: 'Walk me through a modern data stack end to end, using an example you know.',
    a: `Take e-commerce: <strong>Sources</strong> (Shopify, Stripe, clickstream, ad spend) → <strong>EL</strong> (Fivetran loads raw into Snowflake) → <strong>dbt</strong> transforms: <code>staging</code> (one model per source, cleaned/renamed) → <code>intermediate</code> (joins/enrichment, e.g. orders + customers) → <code>marts</code> (<code>fct_orders</code>, <code>fct_revenue</code>, <code>dim_customers</code>) → <strong>consumers</strong> (Looker, reverse-ETL to marketing, an ML churn model). Airflow orchestrates the whole thing daily; dbt owns the transform + tests; artifacts feed observability.
    <br><br>The layering (staging → intermediate → marts) is what keeps it maintainable: raw column churn is absorbed in staging, business logic lives once in marts.`,
    tip: 'Always name the three dbt layers and what each absorbs. "Staging isolates source churn; marts hold business logic once" is the reusable sentence across every case study.',
  },
  {
    q: 'In any of these architectures, where do data-quality problems most often originate, and how do you defend?',
    a: `Overwhelmingly at the <strong>source boundary</strong>: a load fails, arrives late, arrives empty, or changes schema. The defenses, in order:
    <ul>
      <li><strong>Freshness gates</strong> before transformation (late/missing).</li>
      <li><strong>Row-count / volume tests</strong> (empty-but-fresh, double-loads) — freshness alone misses these.</li>
      <li><strong>Thin staging layer</strong> that aliases raw columns (schema changes become one-line fixes).</li>
      <li><strong>Contracts</strong> on consumed models; <strong>tests</strong> on keys and enums; <strong>reconciliation</strong> singular tests vs the source of truth.</li>
    </ul>
    Every incident in these case studies is one of those source failure modes.`,
    tip: 'Tying all five case-study incidents back to source-boundary failure modes shows pattern recognition — that is what distinguishes an architect-level answer.',
  },
  {
    q: 'How would you design for auditability and historical correctness (e.g. banking)?',
    a: `Use <strong>snapshots</strong> (SCD2) for dimensions that must retain history (account status, customer attributes) so you can answer "what did this look like on date X". Keep facts <strong>append/upsert</strong> with a <code>unique_key</code> and a lookback window for late/backdated records. Add <strong>reconciliation tests</strong> against the system of record (ledger GL) and run <code>dbt build</code> so a reconciliation failure blocks publishing. Avoid load-time-derived columns (snapshot the inputs, e.g. FX rates) so a rebuild is reproducible — an accidental full-refresh must not rewrite history differently.`,
    tip: 'Snapshots for history + reconciliation tests + reproducible rebuilds (snapshot the inputs) is the trifecta for regulated/auditable domains.',
  },
];

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M31 · Platform & Architecture',
    title: 'Real-World Case Studies',
    subtitle: 'Five production stacks across industries, each with a realistic incident — reason about whole platforms, not single models.',
    tabs: [
      { id: 'lab',    label: '🏢 Case Studies' },
      { id: 'detail', label: '📋 The pattern behind all five' },
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
    <p class="lab-intro">Each case shows the source→dbt→consumer stack and a realistic incident. Different industries,
    the same underlying failure patterns. Pick one.</p>
    <div class="lab-picker" id="m31-pick">
      ${CASES.map((c, i) => `<button class="lab-chip ${i === 0 ? 'active' : ''}" data-i="${i}">
        <span class="lab-sev" style="background:${c.color}"></span>${c.name}</button>`).join('')}
    </div>
    <div class="stage-panel" id="m31-panel"></div>
  `;
  const panel = tab.querySelector('#m31-panel');

  function render(i) {
    const c = CASES[i];
    panel.style.setProperty('--panelColor', c.color);
    panel.innerHTML = `
      <div class="stage-panel-head">
        <span class="stage-panel-k" style="color:${c.color}">case study</span>
        <span class="stage-panel-t">${c.name}</span>
      </div>
      <div class="stage-panel-body">
        <div class="mx-k" style="margin-bottom:6px">Pipeline</div>
        <div class="pipe" style="margin-bottom:14px">
          ${c.stack.map((s, j) => `<div class="pipe-stage" style="${j === 0 ? '' : ''}"><div class="pipe-name" style="font-size:11px">${s}</div></div>`).join('')}
        </div>
        <div class="mx-grid" style="margin-bottom:12px">
          <div class="mx-cell"><div class="mx-k">Sources</div><div class="mx-v">${c.sources}</div></div>
          <div class="mx-cell"><div class="mx-k">Grain</div><div class="mx-v">${c.grain}</div></div>
        </div>
        <div class="ex-interview" style="border-left-color:var(--error);background:rgba(239,68,68,0.10)">
          <span class="ex-iq-badge" style="color:var(--error)">Incident</span> ${c.incident}</div>
        <div class="mx-grid" style="margin-top:12px">
          <div class="mx-cell"><div class="mx-k">Root cause</div><div class="mx-v">${c.root}</div></div>
          <div class="mx-cell"><div class="mx-k">Fix & prevention</div><div class="mx-v">${c.fix}</div></div>
        </div>
      </div>`;
    injectCodeEnhancements(panel);
  }

  tab.querySelector('#m31-pick').addEventListener('click', e => {
    const chip = e.target.closest('.lab-chip');
    if (!chip) return;
    tab.querySelectorAll('#m31-pick .lab-chip').forEach(c => c.classList.toggle('active', c === chip));
    render(Number(chip.dataset.i));
  });
  render(0);
}

function buildDetail(container) {
  container.querySelector('#tab-detail').innerHTML = `
    <div class="detail-section">
      <h3>The same skeleton, every industry</h3>
      <div class="pipe" style="margin-bottom:16px">
        <div class="pipe-stage"><div class="pipe-ic">📦</div><div class="pipe-name">Sources</div><div class="pipe-sub">apps/APIs</div></div>
        <div class="pipe-stage"><div class="pipe-ic">📥</div><div class="pipe-name">EL</div><div class="pipe-sub">Fivetran/Airbyte</div></div>
        <div class="pipe-stage"><div class="pipe-ic">🧹</div><div class="pipe-name">Staging</div><div class="pipe-sub">clean/rename</div></div>
        <div class="pipe-stage"><div class="pipe-ic">🔗</div><div class="pipe-name">Intermediate</div><div class="pipe-sub">join/enrich</div></div>
        <div class="pipe-stage"><div class="pipe-ic">⭐</div><div class="pipe-name">Marts</div><div class="pipe-sub">facts/dims</div></div>
        <div class="pipe-stage"><div class="pipe-ic">📊</div><div class="pipe-name">BI / ML</div><div class="pipe-sub">consume</div></div>
      </div>
      <p>E-commerce, banking, retail, customer, marketing — the <em>domain</em> changes but the <em>shape</em> doesn't: sources → EL → staging → intermediate → marts → consumers, orchestrated by Airflow, transformed and tested by dbt.</p>
    </div>
    <div class="detail-section">
      <h3>Every incident was a source-boundary failure</h3>
      <div class="info-grid">
        <div class="info-card" style="border-left-color:#FF694B"><div class="info-card-title">E-commerce: double-load</div><div class="info-card-body">Dedup in staging + volume anomaly + reconciliation test.</div></div>
        <div class="info-card" style="border-left-color:#10B981"><div class="info-card-title">Banking: late/backdated</div><div class="info-card-body">Lookback + unique_key + daily reconciliation to the ledger.</div></div>
        <div class="info-card" style="border-left-color:#3B82F6"><div class="info-card-title">Retail: empty-but-fresh</div><div class="info-card-body">Row-count test — freshness alone misses zero-row loads.</div></div>
        <div class="info-card" style="border-left-color:#8B5CF6"><div class="info-card-title">Customer: schema rename</div><div class="info-card-body">Contract + not_null + staging alias isolates the change.</div></div>
        <div class="info-card" style="border-left-color:#F59E0B"><div class="info-card-title">Marketing: mixed definitions</div><div class="info-card-body">One tested definition + currency normalization macro.</div></div>
      </div>
      <p style="font-size:15px;font-weight:600;color:var(--accent)">Architecture is pattern recognition: same layered skeleton, same source-boundary failure modes, same defenses (freshness + volume tests, thin staging, contracts, reconciliation). Learn the pattern once and every domain is a variation.</p>
    </div>
  `;
}

function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
