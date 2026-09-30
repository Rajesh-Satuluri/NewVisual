import { createModuleShell, createIQSection } from '../components/module-shell.js';

export function mount(container) {
  container.innerHTML = createModuleShell({
    tag: 'M04 · Compute',
    title: 'Clusters & Runtimes',
    subtitle: 'All-purpose vs job clusters, instance types, autoscaling, DBU pricing',
    tabs: [
      { id: 'types',      label: '🖥️ Cluster Types' },
      { id: 'config',     label: '⚙️ Configuration' },
      { id: 'autoscale',  label: '📈 Autoscaling' },
      { id: 'iq',         label: '🎯 Interview Q&A' },
    ]
  });

  container.querySelector('#tab-types').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Cluster Types</div>
        <div class="section-desc">Pick the right cluster type — wrong choice = high cost or poor experience</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;max-width:900px">
        ${[
          {icon:'💻',name:'All-Purpose Cluster',tag:'Interactive',color:'#FF6900',props:[
            ['Lifecycle','Persistent (auto-terminate after idle)'],
            ['Best for','Notebooks, exploration, ad-hoc queries'],
            ['Sharing','Multiple users share one cluster'],
            ['Cost','Charged per DBU/hr while running'],
            ['Cold start','Fast (already running)'],
          ],note:'Never use for production batch jobs — DBUs billed even when idle.'},
          {icon:'⚙️',name:'Job Cluster',tag:'Batch',color:'#e05800',props:[
            ['Lifecycle','Ephemeral (created per job run, terminated on completion)'],
            ['Best for','Scheduled ETL, ML training, OPTIMIZE runs'],
            ['Sharing','1 cluster per job run'],
            ['Cost','Zero cost when job is not running'],
            ['Cold start','2–5 min (cluster provisioning)'],
          ],note:'Always prefer Job Clusters for automated workloads — zero idle cost.'},
          {icon:'📊',name:'SQL Warehouse',tag:'BI/SQL',color:'#c04800',props:[
            ['Lifecycle','Auto-suspends on idle (configurable)'],
            ['Best for','BI dashboards, Tableau, Power BI, SQL analytics'],
            ['Sharing','Multi-cluster auto-scales for concurrent users'],
            ['Cost','Serverless or Classic pricing; Photon-enabled'],
            ['Cold start','<10s (serverless) or ~2 min (classic)'],
          ],note:'Use SQL Warehouse for all BI traffic. Never send dashboards to all-purpose clusters.'},
        ].map(c => `
          <div style="background:var(--bg2);border-radius:12px;padding:20px;border-top:3px solid ${c.color}">
            <div style="font-size:24px;margin-bottom:8px">${c.icon}</div>
            <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:2px">${c.name}</div>
            <div style="font-size:10px;font-weight:700;color:${c.color};text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px">${c.tag}</div>
            <table style="width:100%;border-collapse:collapse">
              ${c.props.map(([k,v])=>`<tr><td style="font-size:11px;color:var(--text3);padding:3px 0;vertical-align:top;white-space:nowrap;padding-right:8px">${k}</td><td style="font-size:11px;color:var(--text2);padding:3px 0">${v}</td></tr>`).join('')}
            </table>
            <div style="margin-top:12px;font-size:11px;color:var(--amber);background:rgba(255,193,7,.08);border-radius:6px;padding:8px 10px;line-height:1.5">💡 ${c.note}</div>
          </div>`).join('')}
      </div>
    </div>`;

  container.querySelector('#tab-config').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Cluster Configuration</div>
        <div class="section-desc">Key settings that affect performance and cost — know these for interviews</div>
      </div>
      <div class="config-grid">
        ${[
          {name:'Databricks Runtime (DBR)',val:'e.g., 14.3 LTS (Spark 3.5)',desc:'Includes Spark + Delta + Python/R + ML libs. LTS = 2-year support. ML variant adds MLflow, PyTorch, TensorFlow pre-installed.',impact:'high'},
          {name:'Node Type',val:'e.g., m5.4xlarge (16 vCPU, 64GB RAM)',desc:'Memory-optimized for ML/large joins. Compute-optimized for Photon SQL. GPU instances (p3, g4) for deep learning. Graviton for cost savings.',impact:'high'},
          {name:'Driver vs Workers',val:'1 driver + N workers',desc:'Driver coordinates task scheduling; holds RDD lineage graph. Workers execute tasks. Driver OOM kills the job — size driver for data collected to driver (df.collect(), pandas).',impact:'high'},
          {name:'Spot Instances',val:'On-demand / Spot / Mixed',desc:'Spot = 60–80% cheaper but preemptable. Use spot for workers, on-demand for driver. Databricks auto-replaces preempted spot workers with on-demand fallback.',impact:'medium'},
          {name:'spark.executor.memory',val:'e.g., 8g',desc:'Heap memory per executor. Remaining RAM used for off-heap (shuffle, storage). If tasks spill to disk, increase this or use memory-optimized instances.',impact:'medium'},
          {name:'spark.sql.shuffle.partitions',val:'default: 200',desc:'Number of partitions after a shuffle (join/group-by). Default 200 is too high for small data, too low for 100GB+ shuffles. Set to 2–4× the number of cores for best performance.',impact:'high'},
          {name:'Auto-termination',val:'Minutes of inactivity',desc:'All-purpose clusters terminate after N minutes idle. Set to 20–60 min for interactive use. Never disable — idle clusters burn DBUs continuously.',impact:'medium'},
          {name:'Cluster Policies',val:'Admin-defined templates',desc:'Enforce guardrails: max DBU/hr, allowed instance types, required tags. Prevents users from spinning up unnecessarily large clusters.',impact:'low'},
        ].map(c => `
          <div class="config-card">
            <div class="config-name">${c.name}</div>
            <div class="config-val">Default: ${c.val}</div>
            <div class="config-desc">${c.desc}</div>
            <div class="config-impact impact-${c.impact}">Impact: ${c.impact.toUpperCase()}</div>
          </div>`).join('')}
      </div>
    </div>`;

  container.querySelector('#tab-autoscale').innerHTML = `
    <div class="section-pad">
      <div class="section-header">
        <div class="section-title">Autoscaling</div>
        <div class="section-desc">How Databricks scales clusters up and down dynamically</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:14px;max-width:720px">
        <div style="background:var(--bg2);border-radius:10px;padding:18px 20px">
          <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:10px">How Autoscaling Works</div>
          <div style="font-size:12px;color:var(--text2);line-height:1.8">
            <p><strong style="color:var(--text)">Scale-up trigger:</strong> When the scheduler sees tasks queued longer than <code>spark.databricks.autoscaling.minAllocRatio</code> seconds, it requests more workers from the cloud provider.</p>
            <p><strong style="color:var(--text)">Scale-down trigger:</strong> Workers idle for <code>spark.databricks.aggressiveWindowSize</code> seconds are returned. Databricks uses a smarter algorithm than vanilla Spark — it predicts task completion to avoid premature scale-down during shuffle reads.</p>
            <p><strong style="color:var(--text)">Min/Max workers:</strong> Set a minimum (always-on workers for immediate task pickup) and a maximum (cost cap). Driver is always on-demand.</p>
          </div>
        </div>
        <div style="background:var(--bg2);border-radius:10px;padding:18px 20px">
          <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:10px">When Autoscaling Helps vs Hurts</div>
          <table style="width:100%;border-collapse:collapse">
            <tr style="border-bottom:1px solid var(--border)">
              <th style="font-size:11px;color:var(--text3);text-align:left;padding:8px 0;padding-right:24px">Scenario</th>
              <th style="font-size:11px;color:var(--text3);text-align:left;padding:8px 0;padding-right:24px">Autoscaling?</th>
              <th style="font-size:11px;color:var(--text3);text-align:left;padding:8px 0">Reason</th>
            </tr>
            ${[
              ['Interactive notebooks with variable load','✅ Yes','Users run sporadically; cluster sleeps between queries'],
              ['Fixed-size nightly batch ETL','⚠️ No','Fixed workers = predictable runtime; autoscaling adds overhead'],
              ['Streaming job with variable input rate','✅ Yes','Scale with message backlog; idle during quiet periods'],
              ['ML training (Spark ML grid search)','✅ Yes','Training parallelism benefits from more workers'],
              ['Single-node Python (pandas)','❌ No','All work on driver; extra workers do nothing'],
              ['OPTIMIZE + ZORDER','⚠️ Fixed preferred','File compaction is I/O-bound; unpredictable scaling overhead'],
            ].map(([s,a,r])=>`<tr style="border-bottom:1px solid var(--border)"><td style="font-size:11px;color:var(--text2);padding:8px 0;padding-right:24px">${s}</td><td style="font-size:12px;padding:8px 0;padding-right:24px;white-space:nowrap">${a}</td><td style="font-size:11px;color:var(--text3);padding:8px 0">${r}</td></tr>`).join('')}
          </table>
        </div>
        <div style="background:var(--bg2);border-radius:10px;padding:18px 20px">
          <div style="font-size:13px;font-weight:700;color:var(--accent);margin-bottom:8px">Enhanced Autoscaling (Structured Streaming)</div>
          <div style="font-size:12px;color:var(--text2);line-height:1.7">Standard autoscaling is not lag-aware. Enhanced Autoscaling for streaming scales based on <strong style="color:var(--text)">consumer lag</strong> — if Kafka lag grows, new workers are added to catch up; when lag clears, workers are reclaimed. Enable with: <code style="background:var(--bg3);padding:1px 6px;border-radius:4px;font-size:11px">spark.databricks.streaming.autoscaling.enabled true</code></div>
        </div>
      </div>
    </div>`;

  container.querySelector('#tab-iq').innerHTML = createIQSection([
    {
      q: 'When should you use a Job Cluster vs an All-Purpose Cluster for a nightly ETL job?',
      a: 'Always use a Job Cluster for nightly ETL. An all-purpose cluster is billed continuously even when idle — if your ETL takes 30 minutes and runs at midnight, an all-purpose cluster would bill 23.5 hours of idle DBUs. A job cluster is created when the job starts, runs the workload, and is terminated on completion — you pay only for the 30 minutes of actual compute. Job clusters also use isolated environments (no shared state from interactive notebook sessions), which reduces subtle bugs. The only trade-off is a 2–5 minute cold start time, which is acceptable for nightly jobs.'
    },
    {
      q: 'A Databricks job that used to run in 30 minutes now takes 3 hours. What do you check first?',
      a: '1. Spark UI → Stages: find the longest stage. 2. Check for a data skew: one task takes 10× longer than others — add salting or repartition by a better key. 3. Check for spill: if tasks are spilling to disk (Spark UI → Summary Metrics → Spill), the executor memory is too small — increase driver/executor memory or switch to a memory-optimized instance type. 4. Check for new small-file explosion: if input has grown from 100 files to 100,000, OPTIMIZE the source table. 5. Check shuffle size: a large SortMergeJoin with a skewed key can cause OOM; switch to a broadcast join if one side is <10GB (spark.sql.autoBroadcastJoinThreshold). 6. Check for added Python UDFs — replace with Spark SQL built-ins or Pandas UDFs.'
    },
    {
      q: 'What is the difference between Databricks Runtime (DBR) and DBR ML?',
      a: 'Standard DBR includes Apache Spark, Delta Lake, Python 3, PySpark, pandas, and Databricks-specific optimizations (Photon is included separately via SQL Warehouse or Photon-enabled clusters). DBR ML adds: pre-installed ML libraries (scikit-learn, TensorFlow, PyTorch, Keras, XGBoost, LightGBM, Hugging Face Transformers), MLflow pre-configured with the workspace tracking server, GPU driver support pre-configured. Use standard DBR for data engineering. Use DBR ML for any ML/AI training workload — installing these libraries manually on standard DBR is error-prone and slower than the optimized pre-built versions.'
    },
  ]);
}
