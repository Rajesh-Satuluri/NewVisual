import { createModuleShell, createIQSection } from '../components/module-shell.js';

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M12 · Operations',
    title: 'Cost & Performance',
    subtitle: 'DBU pricing, cluster rightsizing, spot vs on-demand, cost attribution',
    tabs: [
      { id: 'dbu',     label: '💵 DBU Pricing' },
      { id: 'compute', label: '🖥️ Compute & Spot' },
      { id: 'levers',  label: '🎚️ Cost Levers' },
      { id: 'iq',      label: '🎯 Interview Q&A' },
    ]
  });

  container.querySelector('#tab-dbu').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">The DBU Pricing Model</div>
        <div class="section-desc">A DBU (Databricks Unit) is a normalized unit of processing capacity consumed per hour — you pay Databricks per DBU, and your cloud provider for the underlying VMs separately</div>
      </div>
      <div class="stats-row">
        <div class="stat-box"><div class="stat-val">2</div><div class="stat-label">Bills: DBU + cloud VM</div></div>
        <div class="stat-box"><div class="stat-val">/hour</div><div class="stat-label">DBUs metered per second, billed hourly</div></div>
        <div class="stat-box"><div class="stat-val">4×</div><div class="stat-label">All-purpose vs Jobs DBU rate gap</div></div>
        <div class="stat-box"><div class="stat-val">system</div><div class="stat-label">.billing.usage table</div></div>
      </div>

      <div style="margin-top:24px;background:var(--bg2);border-radius:10px;padding:18px 20px;max-width:760px">
        <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:10px">The cost formula</div>
        <div class="code-block">total_cost = (DBUs_consumed × DBU_rate)        <span class="cmt">← paid to Databricks</span>
           + (VM_hours × cloud_VM_price)      <span class="cmt">← paid to AWS/Azure/GCP</span>

<span class="cmt"># DBUs a cluster emits ≈ sum of each node's DBU rating × hours run</span>
<span class="cmt"># DBU_rate depends on: compute type × pricing tier × cloud × region</span></div>
        <div style="font-size:11px;color:var(--text3);margin-top:10px;line-height:1.6">A given VM instance has a fixed DBU rating (e.g. an AWS <code style="background:var(--bg3);padding:1px 5px;border-radius:4px">i3.xlarge</code> ≈ 1 DBU/hr). Bigger nodes emit more DBUs/hr AND cost more in raw VM price — so both halves of the bill scale with node size. Serverless folds the VM cost into a single higher DBU rate, so you see one number instead of two.</div>
      </div>

      <div class="section-header" style="margin-top:32px">
        <div class="section-title">DBU rate varies by compute type</div>
        <div class="section-desc">The SAME work costs very differently depending on which product runs it — this is the single biggest lever most teams miss</div>
      </div>
      <div class="compare-table-wrap" style="padding:0">
        <table class="compare-table">
          <thead><tr>
            <th>Compute type</th><th>Relative DBU rate</th><th>What it's for</th><th>Cost note</th>
          </tr></thead>
          <tbody>
            <tr>
              <td><strong style="color:var(--text)">All-Purpose Compute</strong></td>
              <td class="tag-bad">Highest (~$0.40–0.55/DBU)</td>
              <td>Interactive notebooks, ad-hoc analysis, shared dev clusters</td>
              <td>Priced for interactivity + collaboration. Never run scheduled production jobs here.</td>
            </tr>
            <tr>
              <td><strong style="color:var(--text)">Jobs Compute</strong></td>
              <td class="tag-good">Low (~$0.10–0.15/DBU)</td>
              <td>Scheduled/triggered job runs on ephemeral job clusters</td>
              <td>~3–4× cheaper than all-purpose. Move any recurring workload here.</td>
            </tr>
            <tr>
              <td><strong style="color:var(--text)">SQL Warehouse (Classic/Pro)</strong></td>
              <td class="tag-warn">Medium (~$0.22–0.55/DBU)</td>
              <td>BI dashboards, SQL analytics via T-shirt-sized warehouses</td>
              <td>Photon always on. Pro adds features (predictive I/O, geospatial) at a higher rate than Classic.</td>
            </tr>
            <tr>
              <td><strong style="color:var(--text)">Serverless (SQL / Jobs / Notebooks)</strong></td>
              <td class="tag-warn">Highest per-DBU, but no VM bill + no idle</td>
              <td>Instant start, no cluster to manage, autoscales fast</td>
              <td>Single blended rate (VM baked in). Wins when startup latency + idle time dominate; can lose on long steady batch.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="info-grid" style="margin-top:20px">
        <div class="info-card">
          <div class="info-card-icon">🏷️</div>
          <div class="info-card-title">Pricing tier</div>
          <div class="info-card-body">Standard → Premium → Enterprise raises the DBU rate but unlocks features (RBAC, Unity Catalog, audit logs, IP access lists). The tier multiplies every DBU you consume, so it's a fixed markup on the whole bill.</div>
          <div class="info-card-tag">tier multiplier</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">☁️</div>
          <div class="info-card-title">Cloud & region</div>
          <div class="info-card-body">DBU rates and VM prices differ across AWS / Azure / GCP and by region. The Databricks DBU rate is roughly comparable across clouds; the VM half of the bill varies most, so instance-family choice matters more than cloud choice.</div>
          <div class="info-card-tag">VM price varies</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">📊</div>
          <div class="info-card-title">system.billing.usage</div>
          <div class="info-card-body">The system table that records every DBU consumed: <code style="background:var(--bg3);padding:1px 5px;border-radius:4px">sku_name</code>, <code style="background:var(--bg3);padding:1px 5px;border-radius:4px">usage_quantity</code> (DBUs), <code style="background:var(--bg3);padding:1px 5px;border-radius:4px">usage_date</code>, and tags. Join to <code style="background:var(--bg3);padding:1px 5px;border-radius:4px">system.billing.list_prices</code> to turn DBUs into dollars for chargeback.</div>
          <div class="info-card-tag">source of truth</div>
        </div>
      </div>

      <div style="margin-top:20px;background:var(--bg2);border-radius:10px;padding:18px 20px;max-width:760px">
        <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:10px">Dollars per SKU from system tables</div>
        <div class="code-block"><span class="kw">SELECT</span> u.sku_name,
       date_trunc(<span class="str">'month'</span>, u.usage_date) <span class="kw">AS</span> month,
       <span class="kw">SUM</span>(u.usage_quantity)               <span class="kw">AS</span> dbus,
       <span class="kw">SUM</span>(u.usage_quantity * p.pricing.default) <span class="kw">AS</span> est_usd
<span class="kw">FROM</span> system.billing.usage u
<span class="kw">JOIN</span> system.billing.list_prices p
  <span class="kw">ON</span> u.sku_name = p.sku_name
 <span class="kw">AND</span> u.usage_end_time <span class="kw">BETWEEN</span> p.price_start_time
     <span class="kw">AND</span> coalesce(p.price_end_time, current_timestamp())
<span class="kw">GROUP BY</span> <span class="num">1</span>, <span class="num">2</span>
<span class="kw">ORDER BY</span> est_usd <span class="kw">DESC</span>;</div>
      </div>
    </div>`;

  container.querySelector('#tab-compute').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Compute Sizing & Spot Strategy</div>
        <div class="section-desc">Rightsizing the node family and worker count, then buying that capacity as cheaply as it can safely be bought</div>
      </div>

      <div class="section-header">
        <div class="section-title" style="font-size:14px">Node families — match the family to the bottleneck</div>
      </div>
      <div class="compare-table-wrap" style="padding:0">
        <table class="compare-table">
          <thead><tr>
            <th>Family</th><th>AWS example</th><th>Best for</th><th>Signal to pick it</th>
          </tr></thead>
          <tbody>
            <tr><td class="tag-good">Memory optimized</td><td>r5d / r6gd</td><td>Wide shuffles, large joins, caching, skew</td><td>Spill to disk in Spark UI; OOM on executors</td></tr>
            <tr><td class="tag-warn">Compute optimized</td><td>c5 / c6g</td><td>CPU-bound UDFs, ML feature transforms</td><td>High CPU, low memory pressure, little shuffle</td></tr>
            <tr><td class="tag-warn">Storage optimized</td><td>i3 / i4i</td><td>Shuffle-heavy jobs, Delta cache on local NVMe</td><td>Large shuffle spill benefiting from fast local SSD</td></tr>
            <tr><td class="tag-good">General purpose</td><td>m5d / m6gd</td><td>Balanced ETL, safe default</td><td>No clear bottleneck — start here, then specialize</td></tr>
            <tr><td class="tag-bad">GPU</td><td>g5 / p3</td><td>Deep learning training / inference</td><td>Only for DL frameworks; wasteful for plain Spark</td></tr>
          </tbody>
        </table>
      </div>

      <div class="info-grid" style="margin-top:20px">
        <div class="info-card">
          <div class="info-card-icon">⚡</div>
          <div class="info-card-title">Photon</div>
          <div class="info-card-body">Vectorized C++ execution engine. Costs ~2× the DBU rate but often runs SQL/DataFrame workloads 2–4× faster, so cost-per-query usually drops. Big win on scans, joins, aggregations; no benefit for pure Python/UDF or ML training. Rule: enable and measure — keep it if wall-clock × DBU-rate falls.</div>
          <div class="info-card-tag">measure it</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">📈</div>
          <div class="info-card-title">Autoscaling</div>
          <div class="info-card-body">Set min/max workers instead of a fixed count. Cluster scales up under load, releases nodes when idle. Keep <code style="background:var(--bg3);padding:1px 5px;border-radius:4px">min</code> low to save on quiet periods; cap <code style="background:var(--bg3);padding:1px 5px;border-radius:4px">max</code> to bound cost. Avoid for short jobs where scale-up latency exceeds the job, and for streaming where churn hurts.</div>
          <div class="info-card-tag">min ≪ max</div>
        </div>
        <div class="info-card">
          <div class="info-card-icon">🎯</div>
          <div class="info-card-title">Fewer big vs many small</div>
          <div class="info-card-body">Total cost tracks total cores × hours regardless of node count — so pick node size for the workload, not the bill. Prefer fewer larger nodes for shuffle-heavy jobs (less network); more smaller nodes for embarrassingly parallel scans.</div>
          <div class="info-card-tag">cores × hours</div>
        </div>
      </div>

      <div class="section-header" style="margin-top:32px">
        <div class="section-title">Spot / preemptible instances — 60–80% off VM cost</div>
        <div class="section-desc">Spot capacity is spare cloud inventory sold cheap but reclaimable with ~2 min notice. The DBU rate is unchanged — only the VM half of the bill drops.</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:14px;max-width:760px">
        <div style="background:var(--bg2);border-radius:10px;padding:18px 20px;border-left:4px solid var(--green)">
          <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:6px">The standard safe pattern: spot workers + on-demand driver</div>
          <div style="font-size:12px;color:var(--text2);line-height:1.7">Losing a <strong style="color:var(--text)">worker</strong> to preemption only reschedules its tasks — Spark recomputes the lost partitions. Losing the <strong style="color:var(--text)">driver</strong> kills the whole job. So keep the driver (and often the first few workers) on-demand and put the bulk of workers on spot. Databricks exposes this directly: "on-demand + spot" mode with a configurable number of guaranteed on-demand nodes.</div>
        </div>
        <div style="background:var(--bg2);border-radius:10px;padding:18px 20px;border-left:4px solid var(--blue)">
          <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:6px">Automatic on-demand fallback</div>
          <div style="font-size:12px;color:var(--text2);line-height:1.7">Set a max spot bid price (or "fall back to on-demand"). If spot capacity is unavailable or gets reclaimed, Databricks automatically provisions on-demand replacements so the cluster still reaches its target size — you trade some savings for guaranteed availability. Preempted nodes are decommissioned gracefully where the cloud gives notice.</div>
        </div>
      </div>

      <div style="margin-top:20px;background:var(--bg2);border-radius:10px;padding:18px 20px;max-width:760px">
        <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:10px">When to use spot — and when NOT to</div>
        <div style="font-size:12px;color:var(--text2);line-height:1.8">
          <p style="margin-bottom:8px"><strong style="color:var(--green)">✓ Good fit:</strong> batch ETL (interruptible + idempotent), checkpointed ML training, OPTIMIZE/VACUUM maintenance, large backfills.</p>
          <p style="margin-bottom:0"><strong style="color:var(--red)">✗ Avoid:</strong> Structured Streaming with tight SLAs (preemption forces checkpoint recovery latency), interactive clusters (a reclaim kills live notebooks), and the driver of any critical job.</p>
        </div>
      </div>
    </div>`;

  container.querySelector('#tab-levers').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Cost Levers & Governance</div>
        <div class="section-desc">The dials that cut idle spend, plus how to attribute every dollar back to a team</div>
      </div>

      <div class="config-grid">
        <div class="config-card">
          <div class="config-name">autotermination_minutes</div>
          <div class="config-val">all-purpose / job clusters — e.g. 15–30</div>
          <div class="config-desc">Idle clusters keep billing DBUs for nothing. Auto-terminate shuts a cluster down after N minutes of no activity. The #1 source of wasted spend on interactive clusters left running overnight.</div>
          <div class="config-impact impact-high">Impact: High</div>
        </div>
        <div class="config-card">
          <div class="config-name">SQL Warehouse auto-stop</div>
          <div class="config-val">e.g. 10 min (serverless can go to ~1 min)</div>
          <div class="config-desc">The warehouse equivalent of auto-terminate: suspends the warehouse after idle time so dashboards don't keep a cluster warm all day. Serverless resumes near-instantly, so aggressive auto-stop is nearly free.</div>
          <div class="config-impact impact-high">Impact: High</div>
        </div>
        <div class="config-card">
          <div class="config-name">jobs compute (not all-purpose)</div>
          <div class="config-val">route scheduled work to job clusters</div>
          <div class="config-desc">Running production jobs on all-purpose compute pays a ~3–4× DBU premium. Ephemeral job clusters spin up per-run and terminate on completion. Biggest single line-item win for most orgs.</div>
          <div class="config-impact impact-high">Impact: High</div>
        </div>
        <div class="config-card">
          <div class="config-name">instance pools</div>
          <div class="config-val">warm idle instances, shared across clusters</div>
          <div class="config-desc">A pool holds pre-acquired (optionally pre-warmed) VMs so cluster startup drops from minutes to seconds. You pay only the cloud VM price for idle pool instances (no DBUs while idle), trading a little idle VM cost for faster starts and higher spot hit rates.</div>
          <div class="config-impact impact-medium">Impact: Medium</div>
        </div>
        <div class="config-card">
          <div class="config-name">spot workers + fallback</div>
          <div class="config-val">on-demand driver, spot workers, auto-fallback</div>
          <div class="config-desc">60–80% off the VM half of the bill for interruptible workloads. Set a bid cap with automatic on-demand fallback so availability is never sacrificed. See the Compute tab for the full pattern.</div>
          <div class="config-impact impact-high">Impact: High</div>
        </div>
        <div class="config-card">
          <div class="config-name">autoscaling min/max</div>
          <div class="config-val">min low, max bounded</div>
          <div class="config-desc">Scale with load instead of paying for peak capacity 24/7. Low min saves on quiet periods; a bounded max caps blast radius. Skip it for very short jobs and steady streaming.</div>
          <div class="config-impact impact-medium">Impact: Medium</div>
        </div>
        <div class="config-card">
          <div class="config-name">Photon + right node family</div>
          <div class="config-val">enable Photon, memory-opt for shuffle</div>
          <div class="config-desc">Faster wall-clock at higher DBU rate often nets lower cost-per-job. Matching node family to the bottleneck (memory vs compute vs storage) removes spill and shortens runtime — measure both.</div>
          <div class="config-impact impact-medium">Impact: Medium</div>
        </div>
        <div class="config-card">
          <div class="config-name">cluster tags</div>
          <div class="config-val">team, project, cost_center, env</div>
          <div class="config-desc">Custom tags propagate to both the DBU usage records and the underlying cloud VM billing, enabling per-team chargeback. Enforce a tag taxonomy or untagged spend becomes unattributable.</div>
          <div class="config-impact impact-low">Impact: Low (but essential for FinOps)</div>
        </div>
        <div class="config-card">
          <div class="config-name">budget policies</div>
          <div class="config-val">tag-enforced budgets + alerts</div>
          <div class="config-desc">Budget policies bind a set of tags to serverless usage and alert (or block) when a team crosses a threshold, so attribution is enforced at spend time rather than reconstructed after the fact.</div>
          <div class="config-impact impact-low">Impact: Low (guardrail)</div>
        </div>
      </div>

      <div class="section-header" style="margin-top:32px">
        <div class="section-title">Cost attribution & monitoring flow</div>
        <div class="section-desc">Tags at cluster creation → system tables at query time → chargeback report</div>
      </div>
      <div style="background:var(--bg2);border-radius:10px;padding:18px 20px;max-width:760px">
        <div class="code-block"><span class="cmt">-- Monthly spend by team, straight from tagged usage records</span>
<span class="kw">SELECT</span> u.custom_tags[<span class="str">'team'</span>]        <span class="kw">AS</span> team,
       u.custom_tags[<span class="str">'cost_center'</span>] <span class="kw">AS</span> cost_center,
       <span class="kw">SUM</span>(u.usage_quantity * p.pricing.default) <span class="kw">AS</span> est_usd
<span class="kw">FROM</span> system.billing.usage u
<span class="kw">JOIN</span> system.billing.list_prices p
  <span class="kw">ON</span> u.sku_name = p.sku_name
<span class="kw">WHERE</span> u.usage_date &gt;= date_trunc(<span class="str">'month'</span>, current_date())
<span class="kw">GROUP BY</span> <span class="num">1</span>, <span class="num">2</span>
<span class="kw">ORDER BY</span> est_usd <span class="kw">DESC</span>;</div>
        <div style="font-size:11px;color:var(--text3);margin-top:10px;line-height:1.6">Untagged rows collapse into a NULL team — the gap between total spend and attributed spend is your tagging-coverage KPI. Feed this into a dashboard with SQL Alerts to catch runaway clusters before month-end.</div>
      </div>

      <div class="tip" style="max-width:760px">
        <strong style="color:var(--text)">FinOps sequencing:</strong> the highest-leverage fixes are almost always (1) move jobs off all-purpose compute, (2) set auto-terminate / auto-stop everywhere, (3) put workers on spot with fallback. Rightsizing, Photon, and pools are the second wave once the obvious waste is gone.
      </div>
    </div>`;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'A Databricks job that used to run in 30 minutes now takes 3 hours. What do you check first?',
      a: '1. Spark UI → Stages: find the longest stage. 2. Check for a data skew: one task takes 10× longer than others — add salting or repartition by a better key. 3. Check for spill: if tasks are spilling to disk (Spark UI → Summary Metrics → Spill), the executor memory is too small — increase driver/executor memory or switch to a memory-optimized instance type. 4. Check for new small-file explosion: if input has grown from 100 files to 100,000, OPTIMIZE the source table. 5. Check shuffle size: a large SortMergeJoin with a skewed key can cause OOM; switch to a broadcast join if one side is <10GB (spark.sql.autoBroadcastJoinThreshold). 6. Check for added Python UDFs — replace with Spark SQL built-ins or Pandas UDFs.'
    },
    {
      q: 'When should you use spot instances and what\'s the right fallback strategy?',
      a: 'Use spot for: batch ETL jobs (interruptible), ML training (checkpoint-based recovery), OPTIMIZE/VACUUM runs. Don\'t use spot for: Structured Streaming jobs (preemption causes checkpoint recovery latency), interactive clusters (kills in-progress notebooks). Fallback strategy: set on-demand as fallback in the cluster\'s spot bid configuration. Databricks supports mixed pools — e.g., 80% spot workers + 1 on-demand driver. If spot is preempted, Databricks automatically requests on-demand replacements. For critical jobs, use on-demand for the driver and spot for workers — losing a worker triggers task rescheduling; losing the driver kills the job.'
    },
    {
      q: 'A team\'s Databricks bill doubled month-over-month with no new workloads. Walk me through how you\'d find and fix it.',
      a: 'Start from system.billing.usage — it is the source of truth. (1) Group by sku_name to see WHICH product grew: a jump in "all-purpose" SKU usually means someone ran scheduled jobs on an interactive cluster instead of jobs compute (~3–4× the DBU rate) — move those to job clusters. (2) Group by custom_tags[\'team\'] / cluster to localize the offender; a large chunk under NULL tags means tagging gaps that hide the cause. (3) Look for clusters with high idle DBUs — a missing or long autotermination_minutes (or SQL Warehouse auto-stop) means clusters bill overnight for nothing; set aggressive idle timeouts. (4) Check whether someone disabled spot / autoscaling, or bumped min workers, inflating the VM half of the bill. (5) Confirm the DBU rate itself didn\'t change — a pricing-tier upgrade (Standard→Premium/Enterprise) multiplies every DBU. Fix priority: jobs-compute routing and auto-terminate first (biggest, safest wins), then spot + rightsizing. Add a SQL Alert on daily spend so the next spike is caught in a day, not a month.'
    },
  ]);
}
