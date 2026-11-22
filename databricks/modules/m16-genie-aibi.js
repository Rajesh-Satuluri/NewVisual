import { createModuleShell, createIQSection } from '../components/module-shell.js';

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M16 · AI & BI',
    title: 'Genie & AI/BI',
    subtitle: 'Natural-language analytics over governed Lakehouse data — how Genie generates SQL, and how you make it trustworthy',
    tabs: [
      { id: 'what',   label: '💬 What Genie Is' },
      { id: 'trust',  label: '🎓 Making It Accurate' },
      { id: 'govern', label: '🔐 Governance & Limits' },
      { id: 'iq',     label: '🎯 Interview Q&A' },
    ]
  });

  container.querySelector('#tab-what').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Ask your data a question in English</div>
        <div class="section-desc"><strong>AI/BI Genie</strong> lets business users ask questions in plain language — "what was GMV by category last quarter?" — and Genie generates the SQL, runs it on a SQL Warehouse, and returns a table or chart. It's part of Databricks <strong>AI/BI</strong>, which also includes AI/BI Dashboards. The data never leaves the governed Lakehouse.</div>
      </div>
      <div class="stats-row">
        <div class="stat-box"><div class="stat-val">NL→SQL</div><div class="stat-label">Question becomes governed SQL</div></div>
        <div class="stat-box"><div class="stat-val">Space</div><div class="stat-label">A curated set of tables + context</div></div>
        <div class="stat-box"><div class="stat-val">shown</div><div class="stat-label">Generated SQL is always visible</div></div>
        <div class="stat-box"><div class="stat-val">UC</div><div class="stat-label">Respects every permission</div></div>
      </div>

      <div style="margin-top:24px;background:var(--bg2);border-radius:10px;padding:18px 20px;max-width:760px">
        <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:10px">The flow</div>
        <div style="font-size:12px;color:var(--text2);line-height:1.8">
          <p style="margin-bottom:6px"><strong style="color:var(--text)">1 ·</strong> A data team builds a <strong>Genie space</strong>: a curated set of Unity Catalog tables for one domain (e.g. sales), plus instructions and example queries.</p>
          <p style="margin-bottom:6px"><strong style="color:var(--text)">2 ·</strong> A business user asks a question in natural language.</p>
          <p style="margin-bottom:6px"><strong style="color:var(--text)">3 ·</strong> Genie uses the table metadata + the space's context to <strong>generate SQL</strong>, which it shows the user (not a black box).</p>
          <p style="margin-bottom:0"><strong style="color:var(--text)">4 ·</strong> The SQL runs on a SQL Warehouse <em>as the asking user</em>, so results obey their Unity Catalog permissions. The user can refine, correct, or trust the answer.</p>
        </div>
      </div>

      <div class="info-grid" style="margin-top:20px">
        <div class="info-card">
          <div class="info-card-icon">🧑‍💼</div>
          <div class="info-card-title">Self-serve for non-analysts</div>
          <div class="info-card-body">The point is to take the analyst out of the loop for routine questions. Business users get answers directly, while the data team curates the space rather than writing every ad-hoc query.</div>
          <div class="info-card-tag">deflect ad-hoc</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">👀</div>
          <div class="info-card-title">Transparent, human-in-loop</div>
          <div class="info-card-body">Genie always shows the SQL it wrote. Users (and reviewers) can read it, correct it, and save good answers — so you catch a wrong join or metric before anyone trusts the number.</div>
          <div class="info-card-tag">SQL is visible</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">📊</div>
          <div class="info-card-title">Part of AI/BI</div>
          <div class="info-card-body">Genie (conversational) pairs with AI/BI Dashboards (curated, interactive dashboards). Together they're Databricks' native BI layer on the Lakehouse, as opposed to exporting to an external BI tool.</div>
          <div class="info-card-tag">native BI</div>
        </div>
      </div>
    </div>`;

  container.querySelector('#tab-trust').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Garbage metadata → garbage answers</div>
        <div class="section-desc">Genie is only as good as the context it's given. Accuracy is an engineering job, not magic — you curate the space.</div>
      </div>
      <div class="compare-table-wrap" style="padding:0">
        <table class="compare-table">
          <thead><tr><th>Lever</th><th>What it does for accuracy</th></tr></thead>
          <tbody>
            <tr><td><strong style="color:var(--text)">Curated table set</strong></td><td>Only include the clean, conformed tables for the domain (ideally Gold/Silver). Fewer, well-modeled tables mean fewer wrong joins than exposing the whole catalog.</td></tr>
            <tr><td><strong style="color:var(--text)">Column comments & names</strong></td><td>Genie reads Unity Catalog metadata. Clear names and <code style="background:var(--bg3);padding:1px 5px;border-radius:4px">COMMENT</code>s on tables/columns are the single biggest accuracy lever — "net_rev_usd (net revenue in USD, excludes tax)" beats "nr".</td></tr>
            <tr><td><strong style="color:var(--text)">General instructions</strong></td><td>Natural-language rules for the space: how to define a metric, which filters to always apply, business definitions ("active customer = ordered in last 90 days").</td></tr>
            <tr><td><strong style="color:var(--text)">Example SQL queries</strong></td><td>Known-good question→SQL pairs teach Genie the right joins and patterns for your schema. The highest-signal way to fix a recurring mistake.</td></tr>
            <tr><td><strong style="color:var(--text)">Trusted assets / certified metrics</strong></td><td>Pin vetted queries or metric definitions so Genie reuses the <em>approved</em> calculation instead of improvising one.</td></tr>
          </tbody>
        </table>
      </div>

      <div class="tip" style="max-width:760px;margin-top:20px">
        <strong style="color:var(--text)">The iteration loop:</strong> ship the space, watch real questions, find where the generated SQL is wrong, and fix it by <em>adding an instruction or an example query</em> — not by hoping the model improves. Treat the Genie space like a product you curate, with the data team as owners.
      </div>
    </div>`;

  container.querySelector('#tab-govern').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Governed by Unity Catalog, not bypassing it</div>
        <div class="section-desc">Genie runs generated SQL under the asking user's identity, so it can never leak data they aren't allowed to see</div>
      </div>
      <div class="info-grid">
        <div class="info-card">
          <div class="info-card-icon">🔐</div>
          <div class="info-card-title">Permissions always apply</div>
          <div class="info-card-body">Queries execute with the user's Unity Catalog grants. Row filters and column masks still apply — if a user can't see EU rows or a masked SSN column in SQL, Genie can't surface them either. There's no privileged back door.</div>
          <div class="info-card-tag">runs as the user</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🧾</div>
          <div class="info-card-title">Auditable</div>
          <div class="info-card-body">Because it's real SQL on a SQL Warehouse, the queries are logged and attributable like any other. The generated SQL is shown, so an answer can always be traced to the exact query that produced it.</div>
          <div class="info-card-tag">real queries</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">⚠️</div>
          <div class="info-card-title">Know the limits</div>
          <div class="info-card-body">Genie can still write <em>plausible but wrong</em> SQL on ambiguous questions or poorly-modeled data, and it's not a full semantic layer. Keep humans reviewing the SQL for high-stakes numbers, and curate the space to shrink the error surface.</div>
          <div class="info-card-tag">verify high-stakes</div>
        </div>
      </div>

      <div style="margin-top:20px;background:var(--bg2);border-radius:10px;padding:18px 20px;max-width:760px">
        <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:10px">Genie vs a dashboard vs an analyst</div>
        <div style="font-size:12px;color:var(--text2);line-height:1.8">
          <p style="margin-bottom:6px"><strong style="color:var(--text)">AI/BI Dashboard:</strong> best for <em>known, repeated</em> questions — curated, fast, exactly right every time.</p>
          <p style="margin-bottom:6px"><strong style="color:var(--text)">Genie:</strong> best for <em>novel, ad-hoc follow-ups</em> on a governed domain — "and how does that split by region?" without filing a ticket.</p>
          <p style="margin-bottom:0"><strong style="color:var(--text)">Analyst:</strong> still owns ambiguous, high-stakes, or cross-domain analysis and the curation that makes Genie trustworthy.</p>
        </div>
      </div>
    </div>`;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'What is AI/BI Genie and how does it keep answers governed?',
      a: 'Genie is Databricks\' natural-language analytics interface: a business user asks a question in English, and Genie uses the curated tables and context in a "Genie space" to generate SQL, which it shows the user and runs on a SQL Warehouse. Crucially, the SQL executes under the ASKING USER\'s Unity Catalog identity — so their grants, row filters, and column masks all apply. Genie can never surface data the user couldn\'t query themselves; there\'s no privileged back door. Because it\'s real SQL, every answer is auditable and traceable to the exact query. It pairs with AI/BI Dashboards as Databricks\' native BI layer on the Lakehouse.'
    },
    {
      q: 'A Genie space keeps generating wrong numbers for a common question. How do you fix it?',
      a: 'You fix it by improving the space\'s context, not by waiting for the model to get smarter. In order of leverage: (1) Add/clean Unity Catalog COMMENTs and use clear column names — Genie reads metadata, so "net_rev_usd" with a comment beats "nr". (2) Add an example SQL query: the known-good question→SQL pair teaches Genie the correct joins and metric for your schema — the highest-signal fix for a recurring mistake. (3) Add a general instruction encoding the business rule ("active customer = ordered in last 90 days"; "always exclude test orders"). (4) Trim the table set to the clean Gold/Silver tables so there are fewer wrong joins to make. (5) Pin trusted/certified metrics so it reuses the approved calculation. Then iterate: watch real questions and patch the space like a product.'
    },
    {
      q: 'When should a team use a Genie space versus an AI/BI dashboard, and what are Genie\'s limits?',
      a: 'Use an AI/BI Dashboard for KNOWN, REPEATED questions — curated, fast, and exactly right every time (a weekly revenue dashboard). Use Genie for NOVEL, ad-hoc follow-ups on a governed domain — "and how does that split by region and channel?" — so users don\'t file a ticket for every one-off. Limits to be honest about: Genie can produce plausible-but-wrong SQL on ambiguous questions or poorly-modeled data, and it is not a full semantic layer or a replacement for an analyst on high-stakes or cross-domain work. The mitigations are curating the space (comments, instructions, example queries, trimmed tables) to shrink the error surface, and keeping humans reviewing the generated SQL for numbers that matter — which Genie makes possible by always showing the SQL.'
    },
  ]);
}
