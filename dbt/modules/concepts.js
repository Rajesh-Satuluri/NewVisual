// Core Concepts — the first-principles layer under the whole tool.
//
// The rest of the course teaches dbt mechanics well; this page grounds the
// handful of foundational ideas that are *used everywhere but defined nowhere*:
// the compile→execute lifecycle, the warehouse cost model, grain/idempotency,
// Jinja as metaprogramming, state/selection, and the ELT paradigm. Modules link
// here with "first principles" callouts so a learner can always drop down to the
// why. Pure theory — nothing is executed; code blocks are illustrative and the
// exact SQL/DDL varies by adapter (run real SQL in the Coding Studio).
import { createModuleShell, createIQSection } from '../components/module-shell.js';

const IQ = [
  {
    q: 'Walk me through what actually happens between typing `dbt run` and SQL hitting the warehouse.',
    a: `Four stages, and only the last one touches the warehouse:
    <ol>
      <li><strong>Parse</strong> — dbt reads every <code>.sql</code> and <code>.yml</code> file, renders just enough Jinja to discover <code>ref()</code>/<code>source()</code>/<code>config()</code> calls, and builds the <strong>manifest</strong> plus the dependency <strong>DAG</strong>. No SQL runs.</li>
      <li><strong>Compile</strong> — for each selected model, Jinja is fully rendered into plain SQL and every <code>ref()</code> is resolved to a real <code>database.schema.table</code>. The result lands in <code>target/compiled/</code>. Still no warehouse.</li>
      <li><strong>Execute</strong> — dbt wraps each compiled <code>select</code> in the materialization's DDL (<code>create table as …</code>, <code>create view as …</code>, a <code>merge</code>, etc.), lands it in <code>target/run/</code>, and sends it to the adapter, which runs it against the warehouse in DAG order.</li>
      <li><strong>Persist artifacts</strong> — <code>run_results.json</code> (timings, status) is written; <code>dbt docs generate</code> additionally queries the warehouse for the <code>catalog.json</code>.</li>
    </ol>
    The one-sentence version: <strong>dbt is a compiler that turns a templated SQL project into warehouse DDL</strong>; the warehouse is the runtime.`,
    tip: 'Leading with "dbt is a compiler, the warehouse is the runtime" frames every other answer — compile vs execute, why you debug target/compiled/, why compile is cheap and run is not.',
  },
  {
    q: 'A model passes `dbt compile` but you still don\'t trust the change. Why isn\'t compile enough?',
    a: `Compile only proves the SQL is <strong>well-formed and that dependencies resolve</strong> — Jinja rendered, <code>ref()</code> pointed at a real relation, no dependency cycle. It never runs the query, so it cannot catch anything the <em>warehouse</em> decides: a column that doesn't exist, a type mismatch, a divide-by-zero, a duplicate on a merge key, or insufficient permissions.
    <br><br>
    That is why CI runs <code>dbt build</code> (run + test), not <code>dbt compile</code>. Correctness against real data is only proven by executing the model and then asserting on its rows with tests.`,
    tip: 'The crisp line: "compile proves the SQL is valid; execute proves it is correct against the warehouse." Name one runtime-only error (type mismatch, missing column) to show you have actually hit it.',
  },
  {
    q: 'What does `state:modified` actually compare, and how does Slim CI use it?',
    a: `Every parse writes a <strong>manifest</strong> in which each node carries a <code>checksum</code> (a fingerprint of its raw SQL) plus its resolved config. <code>state:modified</code> compares the <em>current</em> manifest against a baseline manifest you point at with <code>--state</code> (usually last production run); a node is "modified" when its fingerprint or config differs from the baseline.
    <br><br>
    <strong>Slim CI</strong> chains that with deferral:
    <div class="code-block" data-lang="bash">dbt build --select state:modified+ --defer --state ./prod-artifacts</div>
    <code>state:modified+</code> selects changed models <em>and their descendants</em>; <code>--defer</code> tells any <code>ref()</code> to an <em>unselected</em> model to resolve to the production relation instead of rebuilding it. So a one-line change rebuilds three models, not three hundred — while still reading correct upstream data.`,
    tip: 'The two moving parts are "fingerprint diff of two manifests" (what changed) and "defer" (borrow everything unchanged from prod). Candidates who only say "it builds what changed" miss the defer half that makes it cheap.',
  },
  {
    q: 'What is the "grain" of a table and why do senior engineers ask about it first?',
    a: `The <strong>grain</strong> is what exactly one row represents — the natural unique key. "One row per order", "one row per order-line", "one row per customer per day". Declaring it first is the single most effective way to avoid the most common data bug: <strong>double-counting</strong>.
    <br><br>
    Almost every silent correctness failure is a grain violation: a join to a one-to-many table <em>fans out</em> rows so a downstream <code>sum()</code> doubles; a source double-load puts two rows where the grain says one. If you can state the grain, you can test it (<code>unique</code> + <code>not_null</code> on the key) and you know immediately whether a join is safe.`,
    tip: 'Say "before I write the SQL I write down the grain, then add a unique test on that key." It signals you think about correctness structurally, not by eyeballing row counts.',
  },
  {
    q: 'Why did the industry move from ETL to ELT, and where does dbt sit?',
    a: `It was an <strong>economic inversion</strong>. ETL (transform <em>before</em> load) existed because storage was expensive and compute was scarce and coupled to storage — so you cleaned and shrank data on a separate server before paying to store it. Cloud warehouses (Snowflake, BigQuery, Databricks, Redshift) <strong>decoupled storage from compute</strong>: storage became cheap and compute became elastic and pay-per-use. Suddenly it was cheaper to load raw data first and transform it in place with the warehouse's own engine — <strong>ELT</strong>.
    <br><br>
    <strong>dbt is only the "T".</strong> Extract-and-load tools (Fivetran, Airbyte, custom loaders) land raw data; dbt transforms it into tested, documented models <em>inside</em> the warehouse. It assumes the data is already there and that the warehouse is the compute engine — which is why dbt is batch, SQL-first, and read-only against sources.`,
    tip: '"Storage and compute decoupled, so loading-then-transforming beat maintaining a separate ETL tier — and dbt is the T in ELT" is the whole history in one breath.',
  },
  {
    q: 'A stakeholder says "just give me the one true revenue number." What\'s wrong with that framing?',
    a: `"One true number" is usually the wrong goal, because several revenue definitions can all be legitimately correct: gross vs net, booked vs recognized, including vs excluding refunds and tax. The problem that destroyed trust was never "we have more than one definition" — it was that the definitions were <strong>undocumented and divergent</strong>, each buried in a different analyst's ad-hoc SQL.
    <br><br>
    The fix is a <strong>single source of truth per metric</strong>: each definition lives once, named and version-controlled, as a dbt model (or a semantic-layer metric), and everyone <code>ref()</code>s that. Multiple valid definitions coexist as explicitly named models. Trust comes from <strong>every number tracing back to a definition in Git</strong> — not from pretending only one definition exists.`,
    tip: 'Reframe from "find the one number" to "name each definition once, in code, and make everything reference it." That is the difference between a metrics layer and a spreadsheet argument.',
  },
];

// ── Content tabs ──────────────────────────────────────────────────────────────

function lifecycleHTML() {
  return `
    <div class="detail-section">
      <h3>dbt is a compiler, not a runtime</h3>
      <p>The single most useful mental model in the whole tool: <strong>dbt does not run your SQL — it writes it.</strong> It compiles a project of templated SQL into plain warehouse SQL, hands that to the warehouse, and the warehouse is the thing that actually executes. Almost every behaviour you'll meet (why compile is cheap and run is not, why you debug <code>target/compiled/</code>, why one model can compile yet fail) falls out of this one idea.</p>
    </div>
    <div class="detail-section">
      <h3>The four stages of a run</h3>
      <div class="info-grid">
        <div class="info-card" style="border-left-color:#3B82F6">
          <div class="info-card-title">1 · Parse</div>
          <div class="info-card-tag" style="color:#3B82F6;background:#3B82F622">No warehouse</div>
          <div class="info-card-body">Read every <code>.sql</code>/<code>.yml</code>, render just enough Jinja to find <code>ref()</code>/<code>source()</code>/<code>config()</code>, and build the <strong>manifest</strong> + the dependency <strong>DAG</strong>. Catches cycles and unknown refs.</div>
        </div>
        <div class="info-card" style="border-left-color:#8B5CF6">
          <div class="info-card-title">2 · Compile</div>
          <div class="info-card-tag" style="color:#8B5CF6;background:#8B5CF622">No warehouse</div>
          <div class="info-card-body">Fully render Jinja to SQL and resolve each <code>ref()</code> to a real <code>database.schema.relation</code>. Output is pure SQL in <code>target/compiled/</code> — a string, nothing more.</div>
        </div>
        <div class="info-card" style="border-left-color:#F59E0B">
          <div class="info-card-title">3 · Execute</div>
          <div class="info-card-tag" style="color:#F59E0B;background:#F59E0B22">Warehouse</div>
          <div class="info-card-body">Wrap the compiled <code>select</code> in the materialization's DDL (<code>create table as…</code>, <code>create view…</code>, <code>merge…</code>), write it to <code>target/run/</code>, and send it to the adapter in DAG order. This is the paid step.</div>
        </div>
        <div class="info-card" style="border-left-color:#10B981">
          <div class="info-card-title">4 · Artifacts</div>
          <div class="info-card-tag" style="color:#10B981;background:#10B98122">Metadata</div>
          <div class="info-card-body"><code>run_results.json</code> records status + timing. <code>dbt docs generate</code> additionally queries the warehouse to build <code>catalog.json</code> (real column types + stats).</div>
        </div>
      </div>
    </div>
    <div class="detail-section">
      <h3>Worked example — one model, three forms</h3>
      <p>What you write, what it compiles to, and what actually runs:</p>
      <div class="code-block" data-lang="sql">-- 1. SOURCE  models/marts/fct_orders.sql  (what you write)
{{ config(materialized='table') }}

select order_id, customer_id, amount
from {{ ref('stg_orders') }}
where amount > 0</div>
      <div class="code-block" data-lang="sql">-- 2. COMPILED  target/compiled/.../fct_orders.sql  (Jinja gone, ref resolved)
select order_id, customer_id, amount
from analytics.stg_orders          -- prod; in dev → analytics_dev_alice.stg_orders
where amount > 0</div>
      <div class="code-block" data-lang="sql">-- 3. RUN  target/run/.../fct_orders.sql  (materialization DDL wrapped around it)
create or replace table analytics.fct_orders as (
  select order_id, customer_id, amount
  from analytics.stg_orders
  where amount > 0
);</div>
      <p style="color:var(--text-2)">The <strong>compile boundary</strong> is the line between forms 2 and 3. When a model misbehaves you read <code>target/compiled/</code> — that is the real SQL, with Jinja already gone, that you can paste straight into the warehouse to debug. Never debug the Jinja source; debug its output.</p>
    </div>
    <div class="detail-section">
      <h3>Going deeper — the mechanism</h3>
      <details class="cf-det"><summary>Why a model can compile cleanly yet fail at runtime</summary>
        <p>Compile and execute catch <em>different</em> errors. Compile renders Jinja and resolves refs — it catches Jinja syntax errors, unknown <code>ref()</code>s, and dependency cycles. It does <strong>not</strong> touch the warehouse, so it cannot see a column that doesn't exist, a type mismatch, a divide-by-zero, a duplicate on a merge key, or a permissions error. Those only appear at execute. "<code>dbt compile</code> passed" means "the SQL is well-formed and dependencies resolve", never "the SQL is correct."</p>
      </details>
      <details class="cf-det"><summary>Is <code>dbt compile</code> actually free?</summary>
        <p>Mostly. Parse + render need no warehouse, so compiling is cheap and fast. The exception is <strong>introspective macros</strong> — anything that runs a query <em>at compile time</em> to shape the SQL, such as <code>dbt_utils.get_column_values()</code> or a <code>run_query()</code> in a macro. Those issue a real (usually tiny) query during compilation. Plain models compile for free; <code>dbt run</code> is where you spend serious compute.</p>
      </details>
      <details class="cf-det"><summary>The DAG is built by declaration, not by hand</summary>
        <p>You never tell dbt the build order. Each <code>ref()</code> <em>declares</em> a dependency; dbt collects them into a directed acyclic graph and runs a <strong>topological sort</strong> so every model builds after its parents. Independent branches of the graph run in parallel up to <code>--threads</code>. This is why hardcoding a table name instead of <code>ref()</code> is a real bug: it removes the edge, and dbt may build your model before the table it reads from exists.</p>
      </details>
    </div>
  `;
}

function warehouseHTML() {
  return `
    <div class="detail-section">
      <h3>You pay for compute, not for SQL</h3>
      <p>Every performance decision in dbt follows from one fact about cloud warehouses: <strong>storage and compute are separate, and compute is the expensive, elastic part.</strong> Storage is cheap and roughly fixed; compute is billed by how much work a query does. So the first lever is always <em>do less work</em> (scan fewer bytes) — buying a bigger warehouse is the last resort, not the first.</p>
    </div>
    <div class="detail-section">
      <h3>What "work" actually costs</h3>
      <div class="info-grid">
        <div class="info-card" style="border-left-color:#F59E0B">
          <div class="info-card-title">Bytes / partitions scanned</div>
          <div class="info-card-body">BigQuery on-demand bills per <strong>byte scanned</strong>. A missing partition filter or <code>select *</code> on a wide table is a direct, measurable cost. Columnar storage means unreferenced columns are never read — so narrow <code>select</code>s are cheaper.</div>
        </div>
        <div class="info-card" style="border-left-color:#3B82F6">
          <div class="info-card-title">Compute-seconds</div>
          <div class="info-card-body">Snowflake / Databricks bill by <strong>warehouse size × time running</strong>. A query that scans less data finishes sooner and releases the warehouse — so reducing scanned data lowers cost here too, just indirectly.</div>
        </div>
        <div class="info-card" style="border-left-color:#10B981">
          <div class="info-card-title">Storage</div>
          <div class="info-card-body">Cheap and usually a rounding error next to compute. This is <em>why</em> ELT works: landing all the raw data first and transforming later is affordable because storing it costs almost nothing.</div>
        </div>
        <div class="info-card" style="border-left-color:#8B5CF6">
          <div class="info-card-title">Build-time vs read-time</div>
          <div class="info-card-body">The real trade behind every materialization choice: pay now (build) or pay on every query (read). See the table below.</div>
        </div>
      </div>
    </div>
    <div class="detail-section">
      <h3>Pruning — how a filter skips data physically</h3>
      <p>Partitioning and clustering aren't magic; they let the engine <strong>skip reading blocks it can prove can't match</strong>. The warehouse stores min/max metadata per partition or micro-partition. When your query filters <code>where order_date = '2024-06-01'</code>, the engine checks each block's date range and reads only the blocks whose range overlaps — the rest are pruned before any bytes are scanned.</p>
      <div class="code-block" data-lang="sql">-- Without a partition filter: every micro-partition is scanned.
select * from events;                          -- 2 TB scanned

-- With a filter on the partition/cluster key: only matching blocks read.
select * from events where event_date = current_date;   -- ~5 GB scanned</div>
      <p style="color:var(--text-2)">This is also why a filter on a <em>derived</em> column (<code>where date(event_ts) = …</code>) often can't prune — the engine can't use the metadata once a function wraps the column. Filter on the raw partition key.</p>
    </div>
    <div class="detail-section">
      <h3>Materialization = a build/read cost trade</h3>
      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead><tr><th>Materialization</th><th>Build cost</th><th>Read cost</th><th>Storage</th><th>Use when</th></tr></thead>
          <tbody>
            <tr><td><strong>view</strong></td><td class="good">~none</td><td class="bad">full query every read</td><td class="good">none</td><td>Cheap/rarely-read logic; always-fresh</td></tr>
            <tr><td><strong>table</strong></td><td class="bad">full rebuild each run</td><td class="good">cheap scan</td><td>full copy</td><td>Read often; full refresh is affordable</td></tr>
            <tr><td><strong>incremental</strong></td><td class="good">only new/changed rows</td><td class="good">cheap scan</td><td>full copy</td><td>Huge append-mostly tables; rebuild is a problem</td></tr>
            <tr><td><strong>ephemeral</strong></td><td class="good">none (inlined CTE)</td><td>folded into parent</td><td class="good">none</td><td>One-consumer glue; no need to query it directly</td></tr>
          </tbody>
        </table>
      </div>
      <div class="detail-section" style="margin-top:18px">
        <h3>Going deeper — the mechanism</h3>
        <details class="cf-det"><summary>Why "incremental" is a cost optimization, not a different answer</summary>
          <p>A correct incremental model produces the <em>same rows</em> as the equivalent <code>table</code> model — it just avoids recomputing history. You reach for it only when the full-refresh build time or cost is an actual production problem. Starting incremental "to be fast" buys you <code>is_incremental()</code> complexity, late-arriving-data risk, and full-refresh-on-schema-change for no benefit. Start with <code>table</code>; migrate on evidence.</p>
        </details>
        <details class="cf-det"><summary>The cheapest query is the one you don't run</summary>
          <p>Before tuning warehouse size, in order: filter early (push <code>where</code> down, especially on partition keys), select only needed columns, materialize repeated expensive logic once instead of re-deriving it in many views, and avoid <code>select *</code> into wide tables. Only after work is minimised does a bigger warehouse make sense — and that trades money for wall-clock, it doesn't reduce total work.</p>
        </details>
      </div>
    </div>
  `;
}

function grainHTML() {
  return `
    <div class="detail-section">
      <h3>Grain — what one row means</h3>
      <p>The <strong>grain</strong> of a table is the business meaning of a single row, expressed as its unique key: "one row per order", "one row per order-line", "one row per customer per day". It sounds trivial and it is the most important thing to get right — because almost every silent data bug is a <strong>grain violation</strong>, and you can only spot one if you know what the grain was supposed to be.</p>
      <p style="font-size:15px;font-weight:600;color:var(--accent)">Write the grain down before you write the SQL. Then test it: <code>unique</code> + <code>not_null</code> on the key is a live assertion that the grain still holds.</p>
    </div>
    <div class="detail-section">
      <h3>Fan-out — the double-counting trap</h3>
      <p>Joining a table to a one-to-many child multiplies its rows. If you then <code>sum()</code> a parent value, you count it once per child — silently inflating the number. This is the most common wrong-number bug in analytics.</p>
      <div class="code-block" data-lang="sql">-- orders: 1 row per order (grain = order_id). amount = 100.
-- order_items: 3 rows for that order (grain = order_item_id).

-- WRONG: the join fans out orders to 3 rows, so amount is summed 3×.
select o.order_id, sum(o.amount) as revenue      -- → 300, not 100
from orders o
join order_items i using (order_id)
group by 1;

-- RIGHT: aggregate the child to the parent grain FIRST, then join.
select o.order_id, o.amount as revenue,          -- → 100
       i.item_count
from orders o
join (select order_id, count(*) item_count
      from order_items group by 1) i using (order_id);</div>
      <p style="color:var(--text-2)">Rule: a value is safe to aggregate only at <em>its own</em> grain. If a join changes the grain, aggregate the many-side down before combining.</p>
    </div>
    <div class="detail-section">
      <h3>Dedup — when the source lies about the grain</h3>
      <p>Pipelines double-load. A Fivetran retry, a replayed Kafka batch, or an at-least-once loader can put two rows where the grain says one. Deduplicate in staging, keeping the latest version per key:</p>
      <div class="code-block" data-lang="sql">-- Keep one row per order_id — the most recently loaded.
select *
from {{ source('raw', 'orders') }}
qualify row_number() over (
          partition by order_id       -- the declared grain
          order by _loaded_at desc     -- newest wins
        ) = 1</div>
    </div>
    <div class="detail-section">
      <h3>Idempotency — running twice changes nothing</h3>
      <p>A transform is <strong>idempotent</strong> when running it again on the same inputs yields the same output. It is what makes a pipeline safe to retry — and retries are a fact of life in production (a job dies halfway, an orchestrator re-runs it).</p>
      <div class="info-grid">
        <div class="info-card" style="border-left-color:#10B981">
          <div class="info-card-title">table / view</div>
          <div class="info-card-body">Idempotent by construction — each run <code>create or replace</code>s the whole relation, so the result depends only on current inputs, never on how many times you ran it.</div>
        </div>
        <div class="info-card" style="border-left-color:#F59E0B">
          <div class="info-card-title">incremental (needs care)</div>
          <div class="info-card-body">An <code>append</code> with no <code>unique_key</code> is <strong>not</strong> idempotent — re-running inserts the same rows twice. A <code>unique_key</code> turns the insert into a <code>merge</code>/upsert, so a re-run overwrites instead of duplicating. That is what makes it retry-safe.</div>
        </div>
      </div>
      <div class="detail-section" style="margin-top:18px">
        <h3>Going deeper — the mechanism</h3>
        <details class="cf-det"><summary>Why "grain first" also gives you your tests for free</summary>
          <p>Once the grain is named, the first two tests write themselves: <code>unique</code> and <code>not_null</code> on the grain key. They catch fan-out (uniqueness breaks the moment a join multiplies rows) and source double-loads (duplicates appear) <em>at build time</em>, before a dashboard ever shows a wrong number. A model whose grain you can't state is a model you can't test.</p>
        </details>
        <details class="cf-det"><summary>Deterministic vs load-time-derived columns</summary>
          <p>A column is <strong>deterministic</strong> if it depends only on the input data (a cast, a join, a case expression) — recomputing it always gives the same value. A column derived from <em>when the row was processed</em> (<code>current_timestamp</code> at load, a surrogate key seeded by run time) is <strong>not</strong> reproducible: a full-refresh reassigns different values. This is the subtle reason an "accidental full-refresh" can corrupt an incremental table — it rewrites history with new load-time values. Prefer deterministic surrogate keys (hash of the business key) so a rebuild is safe.</p>
        </details>
      </div>
    </div>
  `;
}

function jinjaHTML() {
  return `
    <div class="detail-section">
      <h3>Jinja is SQL metaprogramming</h3>
      <p>Jinja is a templating language: <strong>code that writes SQL</strong>. You don't ship the Jinja to the warehouse — dbt <em>renders</em> it to plain SQL at compile time, and the warehouse only ever sees the rendered output. This is why dbt can write SQL that would be painful to write by hand (fifty near-identical union branches, a pivot over values discovered at compile time) while the warehouse just runs ordinary SQL.</p>
    </div>
    <div class="detail-section">
      <h3>Two passes: render first, run second</h3>
      <div class="info-grid">
        <div class="info-card" style="border-left-color:#8B5CF6">
          <div class="info-card-title">Pass 1 · Jinja renders (compile)</div>
          <div class="info-card-tag" style="color:#8B5CF6;background:#8B5CF622">dbt, no data</div>
          <div class="info-card-body">Loops, conditionals, variables, macros, <code>ref()</code> — all evaluated here, producing a SQL string. Jinja has <strong>no access to your table's rows</strong>; it only knows project metadata (vars, target, whether a relation exists).</div>
        </div>
        <div class="info-card" style="border-left-color:#F59E0B">
          <div class="info-card-title">Pass 2 · SQL runs (execute)</div>
          <div class="info-card-tag" style="color:#F59E0B;background:#F59E0B22">warehouse, data</div>
          <div class="info-card-body">The rendered SQL is sent to the warehouse, which runs it against actual rows. By now every <code>{{ }}</code> is already gone — it was resolved in pass 1.</div>
        </div>
      </div>
      <p style="color:var(--text-2);margin-top:14px">The consequence that trips everyone once: <strong>you cannot branch Jinja on a value from your data</strong>. <code>{% if some_column > 0 %}</code> can't work — at render time there are no rows yet. Jinja decides the <em>shape</em> of the query; SQL decides what the <em>data</em> says.</p>
    </div>
    <div class="detail-section">
      <h3>Worked example — a loop that writes SQL</h3>
      <div class="code-block" data-lang="sql">-- SOURCE: one line of Jinja generates one column per status.
select
  order_id,
  {% for s in ['pending','shipped','delivered'] %}
  sum(case when status = '{{ s }}' then 1 else 0 end) as {{ s }}_count
  {{ "," if not loop.last }}
  {% endfor %}
from {{ ref('stg_orders') }}
group by 1</div>
      <div class="code-block" data-lang="sql">-- COMPILED: the loop is gone; plain SQL the warehouse can run.
select
  order_id,
  sum(case when status = 'pending'   then 1 else 0 end) as pending_count,
  sum(case when status = 'shipped'   then 1 else 0 end) as shipped_count,
  sum(case when status = 'delivered' then 1 else 0 end) as delivered_count
from analytics.stg_orders
group by 1</div>
    </div>
    <div class="detail-section">
      <h3>Going deeper — the mechanism</h3>
      <details class="cf-det"><summary><code>{{ ... }}</code> vs <code>{% ... %}</code></summary>
        <p><code>{{ expression }}</code> is an <strong>output</strong> tag — it renders a value into the SQL text (<code>{{ ref('x') }}</code>, <code>{{ var('start_date') }}</code>, <code>{{ this }}</code>). <code>{% statement %}</code> is <strong>control flow</strong> — <code>if</code>, <code>for</code>, <code>set</code>, <code>macro</code> — it directs rendering but emits nothing itself. If text is appearing where you didn't expect it, you probably used <code>{{ }}</code> where you meant <code>{% %}</code>.</p>
      </details>
      <details class="cf-det"><summary>How <code>is_incremental()</code> is decided</summary>
        <p>It's a Jinja function evaluated <em>at compile time</em>, and it returns true only when all of: the model is configured <code>incremental</code>, its target relation already exists, and you did <strong>not</strong> pass <code>--full-refresh</code>. So the <code>{% if is_incremental() %}</code> branch (the "only new rows" filter) is literally rendered <em>out</em> of the SQL on the first run and on a full refresh, and rendered <em>in</em> on normal subsequent runs. The warehouse never evaluates <code>is_incremental()</code> — it only sees whichever branch Jinja kept.</p>
      </details>
      <details class="cf-det"><summary>Parse-time vs compile-time, precisely</summary>
        <p>dbt renders Jinja twice for different reasons. At <strong>parse</strong> time it does a limited render to discover <code>ref()</code>/<code>source()</code>/<code>config()</code> so it can build the DAG — it doesn't need the final SQL yet. At <strong>compile</strong> time (once the DAG and run context exist) it does the full render into the SQL that will execute. This two-phase design is why <code>ref()</code> can appear anywhere in a model and still be found before the model is built.</p>
      </details>
    </div>
  `;
}

function stateHTML() {
  return `
    <div class="detail-section">
      <h3>dbt compiles your project into data</h3>
      <p>Every parse produces the <strong>manifest</strong> (<code>target/manifest.json</code>) — a complete, machine-readable description of your project: every model, test, and source, their configs, their SQL, and the full dependency graph. Think of it as the compiler's <em>intermediate representation</em>. Almost every advanced dbt feature — docs, lineage, state selection, <code>--defer</code> — is just a program that reads the manifest.</p>
    </div>
    <div class="detail-section">
      <h3>State comparison = diffing two manifests</h3>
      <p>Each node in the manifest carries a <strong>checksum</strong> (a fingerprint of its raw SQL) and its resolved config. <code>state:modified</code> loads a <em>baseline</em> manifest (via <code>--state</code>, usually the last production build) and marks a node modified when its fingerprint or config differs from the baseline. No warehouse query — it's a comparison of two JSON files.</p>
      <div class="code-block" data-lang="bash"># Build only what changed since the production build, plus everything downstream.
dbt build --select state:modified+ --defer --state ./prod-artifacts</div>
    </div>
    <div class="detail-section">
      <h3>Selection is set algebra over the DAG</h3>
      <p>Node selection isn't a list of names — it's <strong>set operations over the dependency graph</strong>. Once you see it that way the operators compose predictably:</p>
      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead><tr><th>Selector</th><th>Graph meaning</th><th>Reads as</th></tr></thead>
          <tbody>
            <tr><td><code>my_model+</code></td><td>node ∪ all descendants</td><td>"this and everything downstream"</td></tr>
            <tr><td><code>+my_model</code></td><td>node ∪ all ancestors</td><td>"this and everything it needs"</td></tr>
            <tr><td><code>+my_model+</code></td><td>full connected lineage</td><td>"everything on its line"</td></tr>
            <tr><td><code>@my_model</code></td><td>descendants + their ancestors</td><td>"enough to build everything downstream"</td></tr>
            <tr><td><code>a b</code> (space)</td><td>union</td><td>"a and b"</td></tr>
            <tr><td><code>a,b</code> (comma)</td><td>intersection</td><td>"only where a and b overlap"</td></tr>
            <tr><td><code>--exclude x</code></td><td>set difference</td><td>"…but not x"</td></tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="detail-section">
      <h3>Going deeper — the mechanism</h3>
      <details class="cf-det"><summary>Why <code>--defer</code> is correct, not a hack</summary>
        <p><code>ref()</code> is an <strong>indirection</strong> — it names a model, and dbt decides which physical relation that resolves to based on context. <code>--defer</code> just changes that resolution: a <code>ref()</code> to a model you <em>didn't</em> select resolves to the <code>--state</code> environment's relation (prod) instead of your dev schema. Because the reference was never a hardcoded table name, borrowing the upstream relation is completely safe — you read correct, already-built data without rebuilding it. This is the whole basis of Slim CI.</p>
      </details>
      <details class="cf-det"><summary>What goes into the fingerprint (and what doesn't)</summary>
        <p><code>state:modified</code> is actually a family of sub-checks: changes to a model's raw SQL (<code>state:modified.body</code>), its config, its declared contract, its macros, and more. The practical upshot: editing a model's SQL marks it modified; so does changing its materialization or a macro it calls. What it deliberately ignores is the <em>data</em> — state is about whether the <em>definition</em> changed, not whether rows changed. (For "did the upstream data refresh", that's source freshness, a different mechanism.)</p>
      </details>
      <details class="cf-det"><summary>The stale-manifest failure mode</summary>
        <p>State selection is only as honest as the baseline manifest. If your <code>--state</code> artifacts are stale (older than the real production state), <code>state:modified</code> can miss changes that were already deployed, or flag ones that weren't — a classic cause of a "false green" CI. The fix is operational: always generate the baseline from the true last production run, not from a developer's machine.</p>
      </details>
    </div>
  `;
}

function eltHTML() {
  return `
    <div class="detail-section">
      <h3>dbt is the "T" in ELT — and that explains everything about it</h3>
      <p>One idea underpins every design choice in dbt: it is the <strong>transform</strong> step of <strong>E</strong>xtract–<strong>L</strong>oad–<strong>T</strong>ransform. Extract-and-load tools (Fivetran, Airbyte, custom loaders) land raw data in the warehouse; dbt turns that raw data into tested, documented, analytics-ready models <em>inside</em> the warehouse. It never extracts or loads, and it assumes the warehouse is the compute engine. That's why dbt is batch, SQL-first, and read-only against sources — those aren't limitations, they're the shape of the job.</p>
    </div>
    <div class="detail-section">
      <h3>The economic inversion that made ELT win</h3>
      <div class="info-grid">
        <div class="info-card" style="border-left-color:#8895AA">
          <div class="info-card-title">ETL era — transform before load</div>
          <div class="info-card-body">Storage was expensive and compute was scarce and <strong>coupled</strong> to storage. So you cleaned, aggregated, and shrank data on a separate ETL server <em>before</em> paying to store it. <strong>Schema-on-write</strong>: you had to decide the shape up front, and raw data was discarded.</div>
        </div>
        <div class="info-card" style="border-left-color:#10B981">
          <div class="info-card-title">ELT era — load then transform</div>
          <div class="info-card-body">Cloud warehouses <strong>decoupled storage from compute</strong>: storage became cheap, compute became elastic and pay-per-use. Now it's cheaper to land all the raw data first and transform it in place. Raw data is kept, so you can re-model history any time.</div>
        </div>
      </div>
      <p style="font-size:15px;font-weight:600;color:var(--accent);margin-top:14px">The whole shift in one line: once storage and compute were decoupled, loading-then-transforming beat maintaining a separate ETL tier — and dbt is the tool that does the transform.</p>
    </div>
    <div class="detail-section">
      <h3>Single source of truth is about naming, not uniqueness</h3>
      <p>The trust crisis that dbt addresses was never "there is more than one revenue number." Several definitions can all be legitimately correct — gross vs net, booked vs recognized, with vs without refunds. The failure was that those definitions lived <strong>undocumented and divergent</strong> in different analysts' ad-hoc SQL, so no one could say which was which.</p>
      <p>A <strong>single source of truth</strong> fixes this by making each definition live <em>once</em>, named and version-controlled, as a dbt model (or a semantic-layer metric) that everyone <code>ref()</code>s. Multiple valid definitions coexist as explicitly named models. <strong>Trust = every number traces back to a definition in Git.</strong></p>
    </div>
    <div class="detail-section">
      <h3>Going deeper — the mechanism</h3>
      <details class="cf-det"><summary>When ETL still wins</summary>
        <p>ELT is the default, not a law. Transform-before-load is still right when: data must be <strong>masked or filtered for compliance before it can legally land</strong> (PII, regulated fields); you need <strong>sub-minute streaming</strong> rather than batch; or the transform isn't expressible in warehouse SQL (heavy ML feature engineering, non-tabular formats). dbt is a batch, in-warehouse, SQL tool — outside that envelope, a different tool is the honest answer.</p>
      </details>
      <details class="cf-det"><summary>The staging layer as an anti-corruption boundary</summary>
        <p>The reason <code>source()</code> belongs only in staging models — never in marts — is the same single-source-of-truth principle one layer down. Staging is the <em>one place</em> raw data enters the project: it renames, casts, and deduplicates so everything downstream refs clean <em>models</em>, not raw tables. If a source schema changes, you fix one staging model instead of fifty marts. The raw→staging boundary is where you absorb the churn of systems you don't own.</p>
      </details>
      <details class="cf-det"><summary>Why "analytics engineer" became a role</summary>
        <p>ELT put transformation in SQL, in Git, with tests and docs — i.e. it made analytics work look like software engineering. The <strong>analytics engineer</strong> is the person who owns that middle layer: they don't build ingestion pipelines (data engineering) and don't only consume dashboards (analysis) — they turn raw loaded data into trusted, documented models. dbt is their primary tool, which is why the role and the tool rose together.</p>
      </details>
    </div>
  `;
}

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'Reference · Foundations',
    title: 'Core Concepts',
    subtitle: 'The first-principles layer under the whole course — the ideas every module leans on. Deep dives, not definitions.',
    tabs: [
      { id: 'lifecycle', label: '🔁 Execution Lifecycle' },
      { id: 'warehouse', label: '💸 Warehouse Cost Model' },
      { id: 'grain',     label: '📐 Grain & Correctness' },
      { id: 'jinja',     label: '🧩 Jinja & Templating' },
      { id: 'state',     label: '🔀 State & Selection' },
      { id: 'elt',       label: '⚖️ The ELT Paradigm' },
      { id: 'iq',        label: '🎯 Interview Q&A' },
    ],
  });

  container.querySelector('#tab-lifecycle').innerHTML = lifecycleHTML();
  container.querySelector('#tab-warehouse').innerHTML = warehouseHTML();
  container.querySelector('#tab-grain').innerHTML     = grainHTML();
  container.querySelector('#tab-jinja').innerHTML     = jinjaHTML();
  container.querySelector('#tab-state').innerHTML     = stateHTML();
  container.querySelector('#tab-elt').innerHTML       = eltHTML();
  container.querySelector('#tab-iq').innerHTML        = createIQSection(IQ);
}
