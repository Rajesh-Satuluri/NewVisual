import { createModuleShell, createIQSection } from '../components/module-shell.js';

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M07 · Governance',
    title: 'Unity Catalog',
    subtitle: '3-level namespace, fine-grained access, data lineage, Delta Sharing',
    tabs: [
      { id: 'namespace', label: '🗂️ Namespace & Metastore' },
      { id: 'access',    label: '🔐 Access Control' },
      { id: 'lineage',   label: '🧬 Lineage & Audit' },
      { id: 'sharing',   label: '🌐 Delta Sharing' },
      { id: 'iq',        label: '🎯 Interview Q&A' },
    ]
  });

  container.querySelector('#tab-namespace').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">The 3-Level Namespace</div>
        <div class="section-desc">catalog.schema.table — one metastore governs every workspace in the account</div>
      </div>
      <div class="stats-row">
        <div class="stat-box"><div class="stat-val">3</div><div class="stat-label">catalog.schema.table</div></div>
        <div class="stat-box"><div class="stat-val">1</div><div class="stat-label">Metastore per region</div></div>
        <div class="stat-box"><div class="stat-val">N</div><div class="stat-label">Workspaces share a metastore</div></div>
        <div class="stat-box"><div class="stat-val">ANSI</div><div class="stat-label">SQL GRANT/REVOKE model</div></div>
      </div>
      <div style="margin-top:24px;display:flex;flex-direction:column;gap:14px;max-width:760px">
        <div style="background:var(--bg2);border-radius:10px;padding:18px 20px">
          <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:10px">Hive metastore (legacy, 2-level) vs Unity Catalog (3-level)</div>
          <pre style="font-size:12px;color:var(--text2);line-height:1.9;margin:0">Legacy Hive:   database.table            ← scoped to ONE workspace
               default.orders            per-workspace metastore, no cross-ws governance

Unity Catalog: catalog.schema.table      ← account-wide, shared across workspaces
               prod.sales.orders
               │    │     └─ table  (deepest level: managed or external)
               │    └─────── schema (a.k.a. database — groups related tables)
               └──────────── catalog (top level — a business domain / environment)</pre>
        </div>
        <div style="background:var(--bg2);border-radius:10px;padding:18px 20px">
          <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:10px">Account → Metastore → Workspace hierarchy</div>
          <pre style="font-size:12px;color:var(--text2);line-height:1.9;margin:0">Databricks Account (one per cloud tenant)
├── Metastore  us-east-1   ← ONE per region; top container of all UC objects
│   ├── attached to: workspace-A, workspace-B, workspace-C
│   ├── catalog: prod
│   │   ├── schema: sales   → tables, views, volumes, functions, models
│   │   └── schema: finance
│   ├── catalog: staging
│   └── catalog: main (default)
└── Metastore  eu-west-1   ← a SEPARATE metastore; data is not cross-region by default</pre>
        </div>
      </div>
      <div class="info-grid" style="margin-top:20px">
        <div class="info-card">
          <div class="info-card-icon">🌍</div>
          <div class="info-card-title">Metastore-per-region</div>
          <div class="info-card-body">You create one metastore per region and attach every workspace in that region to it. A workspace binds to exactly one metastore. Cross-region access goes through Delta Sharing, not a single global metastore — this keeps data residency and latency in check.</div>
          <div class="info-card-tag">1 metastore / region</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🔁</div>
          <div class="info-card-title">Legacy hive_metastore</div>
          <div class="info-card-body">Existing workspace tables remain reachable under the reserved <code>hive_metastore</code> catalog — the old <code>db.table</code> becomes <code>hive_metastore.db.table</code>. UC simply adds a catalog level on top so legacy and governed data coexist during migration.</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">📦</div>
          <div class="info-card-title">Managed vs External tables</div>
          <div class="info-card-body">Managed tables live in the metastore's (or catalog's/schema's) managed storage location and UC owns their lifecycle. External tables point at a path in an external location; DROP removes the metadata but leaves the files. Both are governed identically.</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🏷️</div>
          <div class="info-card-title">Securable objects</div>
          <div class="info-card-body">Everything is a securable: catalog, schema, table, view, volume (files), function, model, external location, storage credential, and share. Privileges are granted on any of these and inherit downward through the hierarchy.</div>
        </div>
      </div>
      <div class="tip">Three-part naming lets one analytics workspace query <code>prod.sales.orders</code> directly — no copy, no separate ETL — provided the principal holds USE CATALOG + USE SCHEMA + SELECT. The legacy 2-level model had no way to express that across workspaces.</div>
    </div>`;

  container.querySelector('#tab-access').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Access Control — GRANT / REVOKE & Fine-Grained Rules</div>
        <div class="section-desc">ANSI SQL privileges, inheritance, plus row filters and column masks</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:14px;max-width:760px">
        <div style="background:var(--bg2);border-radius:10px;padding:18px 20px">
          <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:12px">Privilege model — grant to a group, not a user</div>
          <div class="code-block"><span class="cmt">-- Traversal privileges are required at every level of the path</span>
<span class="kw">GRANT</span> USE CATALOG <span class="kw">ON</span> CATALOG prod <span class="kw">TO</span> <span class="str">\`analysts\`</span>;
<span class="kw">GRANT</span> USE SCHEMA  <span class="kw">ON</span> SCHEMA  prod.sales <span class="kw">TO</span> <span class="str">\`analysts\`</span>;
<span class="kw">GRANT</span> <span class="kw">SELECT</span>     <span class="kw">ON</span> TABLE   prod.sales.orders <span class="kw">TO</span> <span class="str">\`analysts\`</span>;

<span class="cmt">-- Broad grants inherit downward: SELECT on the catalog covers every table</span>
<span class="kw">GRANT</span> <span class="kw">SELECT</span> <span class="kw">ON</span> CATALOG prod <span class="kw">TO</span> <span class="str">\`bi_readers\`</span>;

<span class="kw">REVOKE</span> <span class="kw">SELECT</span> <span class="kw">ON</span> TABLE prod.sales.orders <span class="kw">FROM</span> <span class="str">\`analysts\`</span>;
<span class="kw">SHOW GRANTS</span> <span class="str">\`analysts\`</span> <span class="kw">ON</span> TABLE prod.sales.orders;</div>
          <div style="font-size:11px;color:var(--text3);margin-top:10px;line-height:1.6">Privileges: USE CATALOG, USE SCHEMA, SELECT, MODIFY, CREATE TABLE, EXECUTE (functions), READ VOLUME / WRITE VOLUME, plus ALL PRIVILEGES. The catalog/schema/table owner and metastore admins can always grant.</div>
        </div>
        <div style="background:var(--bg2);border-radius:10px;padding:18px 20px">
          <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:12px">Row filter — restrict which rows a principal sees</div>
          <div class="code-block"><span class="cmt">-- 1. A UDF returns TRUE for rows the caller may see</span>
<span class="kw">CREATE FUNCTION</span> sales.region_filter(region <span class="kw">STRING</span>)
  <span class="kw">RETURN</span> is_account_group_member(<span class="str">'admins'</span>)
      <span class="kw">OR</span> region = current_user_region();

<span class="cmt">-- 2. Attach it to the table; UC injects the predicate on every read</span>
<span class="kw">ALTER TABLE</span> prod.sales.orders
  <span class="kw">SET</span> ROW FILTER sales.region_filter <span class="kw">ON</span> (region);</div>
        </div>
        <div style="background:var(--bg2);border-radius:10px;padding:18px 20px">
          <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:12px">Column mask — redact a column's value per-principal</div>
          <div class="code-block"><span class="cmt">-- Return the raw value only to authorized members, else mask it</span>
<span class="kw">CREATE FUNCTION</span> sales.mask_ssn(ssn <span class="kw">STRING</span>)
  <span class="kw">RETURN CASE WHEN</span> is_account_group_member(<span class="str">'pii_readers'</span>)
              <span class="kw">THEN</span> ssn
              <span class="kw">ELSE</span> <span class="str">'***-**-'</span> <span class="kw">||</span> <span class="kw">right</span>(ssn, <span class="num">4</span>)
         <span class="kw">END</span>;

<span class="kw">ALTER TABLE</span> prod.sales.customers
  <span class="kw">ALTER COLUMN</span> ssn <span class="kw">SET</span> MASK sales.mask_ssn;</div>
          <div style="font-size:11px;color:var(--text3);margin-top:10px;line-height:1.6">Row filters and column masks are evaluated at query time inside the engine, so they apply uniformly to SQL, notebooks, BI tools, and Delta Sharing — there is no way to bypass them by choosing a different client.</div>
        </div>
      </div>
      <div class="compare-table-wrap" style="padding-left:0;padding-right:0;max-width:760px">
        <table class="compare-table">
          <thead><tr><th>Mechanism</th><th>Granularity</th><th>Where enforced</th><th>Typical use</th></tr></thead>
          <tbody>
            <tr><td>GRANT/REVOKE</td><td>Object (catalog→table)</td><td class="tag-good">Metastore</td><td>Who may see the object at all</td></tr>
            <tr><td>Row filter</td><td>Row</td><td class="tag-good">Query engine</td><td>Region / tenant isolation</td></tr>
            <tr><td>Column mask</td><td>Cell / column</td><td class="tag-good">Query engine</td><td>PII redaction (SSN, email)</td></tr>
            <tr><td>Dynamic view</td><td>Row + column</td><td class="tag-warn">View definition</td><td>Legacy pattern, still supported</td></tr>
          </tbody>
        </table>
      </div>
      <div class="tip">Grant to <strong>groups</strong> synced from your IdP (SCIM), never to individual users — membership changes then flow automatically and audits stay legible. <code>is_account_group_member()</code> and <code>current_user()</code> are the building blocks of every dynamic rule.</div>
    </div>`;

  container.querySelector('#tab-lineage').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Data Lineage, Audit Logs & Governed Storage</div>
        <div class="section-desc">Automatic lineage capture, the system.access.audit log, and external locations</div>
      </div>
      <div class="info-grid" style="padding-left:0;padding-right:0">
        <div class="info-card">
          <div class="info-card-icon">🧬</div>
          <div class="info-card-title">Automatic lineage</div>
          <div class="info-card-body">UC captures lineage automatically for any workload run on a UC-enabled cluster or SQL warehouse — no annotations. It records <strong>table-to-table</strong> (which upstream tables produced this table) and <strong>column-to-column</strong> flows, down to individual columns.</div>
          <div class="info-card-tag">No instrumentation</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">📓</div>
          <div class="info-card-title">Notebook / job to table</div>
          <div class="info-card-body">Beyond tables, lineage links the <strong>notebook, job, or dashboard</strong> that read or wrote each table. Answers "what breaks if I drop this column?" and "which report consumes this table?" from one graph.</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🕸️</div>
          <div class="info-card-title">Graph & retention</div>
          <div class="info-card-body">Lineage is browsable in Catalog Explorer as an interactive graph and queryable via the REST API / <code>system.access</code> tables. It is retained ~1 year and is captured per-language (SQL, Python, R, Scala).</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">📜</div>
          <div class="info-card-title">Audit logs</div>
          <div class="info-card-body">Every governed action — GRANT, SELECT, createTable, Delta Sharing access — is logged. Enable system tables and query <code>system.access.audit</code> directly in SQL; it is the audit trail for compliance (SOC 2, HIPAA, GDPR).</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:14px;max-width:760px;margin-top:8px">
        <div style="background:var(--bg2);border-radius:10px;padding:18px 20px">
          <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:12px">Querying the audit trail — system.access.audit</div>
          <div class="code-block"><span class="cmt">-- Who read prod.sales.customers in the last 7 days?</span>
<span class="kw">SELECT</span> event_time, user_identity.email, action_name,
       request_params.full_name_arg <span class="kw">AS</span> object
<span class="kw">FROM</span> system.access.audit
<span class="kw">WHERE</span> service_name = <span class="str">'unityCatalog'</span>
  <span class="kw">AND</span> action_name  = <span class="str">'getTable'</span>
  <span class="kw">AND</span> request_params.full_name_arg = <span class="str">'prod.sales.customers'</span>
  <span class="kw">AND</span> event_date &gt;= current_date() - <span class="kw">INTERVAL</span> <span class="num">7</span> <span class="kw">DAYS</span>
<span class="kw">ORDER BY</span> event_time <span class="kw">DESC</span>;</div>
        </div>
      </div>
      <div class="config-section" style="padding-left:0;padding-right:0">
        <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:12px">External Locations + Storage Credentials — governed access to cloud storage</div>
        <div class="config-grid">
          <div class="config-card">
            <div class="config-name">STORAGE CREDENTIAL</div>
            <div class="config-val">IAM role / managed identity / SP</div>
            <div class="config-desc">A named object wrapping the cloud auth (AWS IAM role, Azure managed identity, GCP service account). It is the ONLY thing that actually holds credentials — clusters never see raw keys.</div>
            <div class="config-impact impact-high">Secret boundary</div>
          </div>
          <div class="config-card">
            <div class="config-name">EXTERNAL LOCATION</div>
            <div class="config-val">s3://bucket/path + credential</div>
            <div class="config-desc">Binds a cloud storage path to a storage credential. You then GRANT READ FILES / WRITE FILES / CREATE EXTERNAL TABLE on it — path access becomes a governed, auditable privilege.</div>
            <div class="config-impact impact-high">Path governance</div>
          </div>
          <div class="config-card">
            <div class="config-name">VOLUME</div>
            <div class="config-val">catalog.schema.volume</div>
            <div class="config-desc">A governed abstraction over a directory in an external location for non-tabular files (images, PDFs, models). Accessed by path <code>/Volumes/cat/sch/vol/…</code> under UC permissions.</div>
            <div class="config-impact impact-medium">Files under UC</div>
          </div>
        </div>
      </div>
      <div class="tip">The chain is: cluster → external location → storage credential → cloud IAM. Because the credential is a securable, revoking one GRANT cuts off an entire team's path access without rotating any cloud key.</div>
    </div>`;

  container.querySelector('#tab-sharing').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Delta Sharing</div>
        <div class="section-desc">An open protocol to share live data across orgs and platforms — no copying</div>
      </div>
      <div class="stats-row">
        <div class="stat-box"><div class="stat-val">Open</div><div class="stat-label">REST protocol, any client</div></div>
        <div class="stat-box"><div class="stat-val">0</div><div class="stat-label">Copies of the data</div></div>
        <div class="stat-box"><div class="stat-val">Live</div><div class="stat-label">Recipient reads latest version</div></div>
        <div class="stat-box"><div class="stat-val">D2D</div><div class="stat-label">or D2Open sharing modes</div></div>
      </div>
      <div style="margin-top:24px;display:flex;flex-direction:column;gap:14px;max-width:760px">
        <div style="background:var(--bg2);border-radius:10px;padding:18px 20px">
          <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:10px">Provider ↔ Recipient flow</div>
          <pre style="font-size:12px;color:var(--text2);line-height:1.9;margin:0">PROVIDER (owns the data)                RECIPIENT (another org / platform)
─────────────────────────               ──────────────────────────────────
1. CREATE SHARE sales_share
2. ALTER SHARE … ADD TABLE prod.sales.orders
3. CREATE RECIPIENT acme                → gets an activation link / token
                                           (or their UC metastore id for D2D)
4. GRANT SELECT ON SHARE … TO RECIPIENT acme
                                        5. Query via Spark / Pandas / Power BI:
                                           reads Delta files by short-lived
                                           pre-signed URLs — always the latest
                                           committed version, no ETL, no copy.</pre>
        </div>
        <div style="background:var(--bg2);border-radius:10px;padding:18px 20px">
          <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:12px">Provider-side SQL</div>
          <div class="code-block"><span class="kw">CREATE SHARE</span> sales_share;
<span class="kw">ALTER SHARE</span> sales_share <span class="kw">ADD TABLE</span> prod.sales.orders;

<span class="cmt">-- Open sharing: recipient outside Databricks, token-based</span>
<span class="kw">CREATE RECIPIENT</span> acme_analytics;
<span class="kw">GRANT</span> <span class="kw">SELECT</span> <span class="kw">ON</span> <span class="kw">SHARE</span> sales_share <span class="kw">TO RECIPIENT</span> acme_analytics;

<span class="cmt">-- Optional: share only recent partitions with a CDF/partition filter</span>
<span class="kw">ALTER SHARE</span> sales_share
  <span class="kw">ADD TABLE</span> prod.sales.orders <span class="kw">PARTITION</span> (region = <span class="str">'US'</span>);</div>
        </div>
      </div>
      <div class="info-grid" style="padding-left:0;padding-right:0;margin-top:8px">
        <div class="info-card">
          <div class="info-card-icon">🤝</div>
          <div class="info-card-title">Share</div>
          <div class="info-card-body">A named, read-only collection of tables, views, volumes, and notebooks the provider chooses to expose. Adding/removing objects is instant and audited.</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">📮</div>
          <div class="info-card-title">Recipient</div>
          <div class="info-card-body">The consuming principal. <strong>D2D</strong> (Databricks-to-Databricks) uses the recipient's UC metastore id for seamless, credential-free access; <strong>open sharing</strong> issues a bearer token for non-Databricks clients.</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">↩️</div>
          <div class="info-card-title">Instant revoke</div>
          <div class="info-card-body">REVOKE on the share cuts access immediately — no copy to delete. Contrast with an ETL export, which goes stale the moment it lands and lingers after revocation.</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🔒</div>
          <div class="info-card-title">Still governed</div>
          <div class="info-card-body">Shares are UC securables: every recipient, share, and read is written to <code>system.access.audit</code>, and row filters / column masks on the source table still apply to shared reads.</div>
        </div>
      </div>
      <div class="tip">Because the protocol is open (a documented REST spec), a Pandas or Power BI user with a credential file reads the provider's Delta files directly from object storage via pre-signed URLs — the provider's cluster is never in the data path, so sharing scales without provider-side compute cost.</div>
    </div>`;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'How does Unity Catalog\'s 3-level namespace differ from the legacy 2-level Hive metastore?',
      a: 'Legacy Hive metastore: database.table — one metastore per workspace, no cross-workspace governance. Unity Catalog: catalog.schema.table — one metastore shared across all workspaces in an account. A catalog maps to a business domain (e.g., prod, staging, analytics). A schema groups related tables. Tables live at the deepest level. Cross-workspace sharing: grant SELECT on prod.orders.transactions TO analytics_team — the team\'s workspace can read production data without copying it. Legacy required manual replication or separate ETL jobs.'
    },
    {
      q: 'What is Delta Sharing and how does it differ from copying data?',
      a: 'Delta Sharing is an open protocol for sharing live Delta Lake data without copying it. The data provider grants read access to specific tables; the recipient queries the provider\'s S3 files directly (pre-signed URLs) via any client (Spark, Pandas, Power BI). Data is never duplicated — the recipient always reads the latest version. Permissions are revocable instantly. Contrast with copying: ETL jobs are needed, data becomes stale immediately, and revoking access requires deleting the copy. Delta Sharing is governed by Unity Catalog — each share, recipient, and access grant is audited.'
    },
    {
      q: 'How do you enforce row-level and column-level security in Unity Catalog, and where is it evaluated?',
      a: 'Row filters and column masks are the fine-grained mechanisms. A row filter is a SQL UDF returning a boolean that UC injects as a predicate on every read: CREATE FUNCTION region_filter(region STRING) RETURN is_account_group_member(\'admins\') OR region = current_user_region(), then ALTER TABLE orders SET ROW FILTER region_filter ON (region). A column mask is a UDF applied to one column that returns the raw value to authorized principals and a redacted value otherwise (e.g., masking SSN to ***-**-1234), attached via ALTER TABLE ... ALTER COLUMN ssn SET MASK mask_ssn. Both are evaluated at query time inside the engine, so they apply identically to SQL, notebooks, BI tools, and Delta Sharing reads — a client cannot bypass them. They typically use is_account_group_member() and current_user() so rules key off IdP-synced group membership. This supersedes the older dynamic-view pattern.'
    },
  ]);
}
