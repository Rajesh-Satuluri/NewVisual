// Production incident library for Databricks — a troubleshooting playbook.
// Each incident is an investigation flow: a symptom, then step-by-step "what do
// you check next?" decisions with correct/wrong branches, then root cause,
// resolution, prevention, and the interview-ready answer.
//
// Shape:
//   { id, difficulty, icon, title, symptom,
//     steps: [ { prompt, checks: [
//        { label, correct:true,  evidence, reasoning } |
//        { label, correct:false, why } ] } ],
//     rootCause, resolution, prevention, interviewAnswer }
//
// Explanations teach the reasoning, not just right/wrong. Trusted in-repo HTML.

export const INCIDENTS = [
  {
    id: 'job-slow-3x',
    difficulty: 'medium',
    icon: '🐢',
    title: 'A nightly job that ran in 30 min now takes 3 hours',
    symptom: `The <code>orders_silver</code> MERGE job has quietly crept from ~30 minutes to over 3 hours this week. No code changed. The cluster config is the same. Downstream Gold tables are now late.`,
    steps: [
      {
        prompt: `The job is 6× slower with no code change. Where do you look first?`,
        checks: [
          { label: `Open the Spark UI and find the longest-running stage`, correct: true,
            evidence: `One stage dominates the timeline, and within it a handful of tasks run 10–20× longer than the rest while most finish quickly.`,
            reasoning: `Always localize the slowdown before theorizing. The Spark UI's stage/task view instantly shows whether it's one skewed stage, broad spill, or just more data — here a few long-tail tasks point straight at <b>skew or a small-file explosion</b>.` },
          { label: `Double the cluster size and rerun`, correct: false,
            why: `Throwing hardware at an undiagnosed problem is expensive and often useless — if the bottleneck is one skewed task or metadata overhead, more nodes sit idle while that one task runs. Diagnose first.` },
          { label: `Rewrite the MERGE as an overwrite`, correct: false,
            why: `That changes semantics (you'd need the full current state) and masks the real cause. You don't yet know why it's slow; don't reach for a rewrite blindly.` },
        ],
      },
      {
        prompt: `A few tasks run far longer than the rest. What do you check to tell skew from small files apart?`,
        checks: [
          { label: `Inspect the source table's file count / sizes and the task input sizes`, correct: true,
            evidence: `The source Bronze table has grown from ~500 files to ~400,000 tiny files (streaming writes), and the slow tasks are each opening thousands of them.`,
            reasoning: `Skew shows as <b>one task with huge input rows</b>; a small-file problem shows as <b>many tiny files</b> inflating task setup and the metadata/listing cost. Checking file counts vs per-task input bytes distinguishes them — here it's small files from continuous streaming writes.` },
          { label: `Assume it's skew and add salting to the join key`, correct: false,
            why: `Salting fixes <b>data skew</b>, not a small-file problem. If you salt without confirming skew, you add complexity and still open 400k files every run.` },
        ],
      },
    ],
    rootCause: `Continuous streaming writes into the Bronze source produced a <b>small-file explosion</b> (~400k tiny Parquet files). Every MERGE now spends most of its time listing and opening files, not processing data.`,
    resolution: `Run <code>OPTIMIZE bronze_orders</code> (compact to ~1 GB files), and enable <b>auto-compaction / optimized writes</b> on the streaming table so new small files are coalesced as they're written. The MERGE drops back to ~30 minutes.`,
    prevention: `Turn on <code>delta.autoOptimize.optimizeWrite</code> and <code>autoCompact</code> for streaming sinks, schedule periodic OPTIMIZE, and alert on file count / avg file size per table so the trend is visible before it hurts.`,
    interviewAnswer: `"Sudden slowdown, no code change → Spark UI first. I'd localize the long stage, then check per-task input to separate <b>skew</b> (one giant task) from a <b>small-file explosion</b> (many tiny files). Here streaming produced hundreds of thousands of files; the fix is OPTIMIZE plus auto-compaction/optimized writes on the sink, and monitoring file counts to catch it early."`,
  },
  {
    id: 'merge-conflict',
    difficulty: 'hard',
    icon: '⚠️',
    title: 'MERGE keeps failing with ConcurrentModificationException',
    symptom: `A Silver MERGE job intermittently fails with <code>ConcurrentModificationException</code> / a Delta commit conflict. Retrying sometimes works, sometimes fails again. It started after a second pipeline began writing to the same table.`,
    steps: [
      {
        prompt: `What's the first thing to establish about this table?`,
        checks: [
          { label: `Identify every writer currently committing to the table`, correct: true,
            evidence: `Two jobs now write to <code>orders_silver</code>: the hourly MERGE and a new backfill job that also updates overlapping order_ids.`,
            reasoning: `Delta uses <b>optimistic concurrency</b>: writers commit and the loser detects a conflict if their file ranges overlap. The exception means two writers touched <b>overlapping files</b>. Before tuning retries, you must know who else writes and whether their changes overlap.` },
          { label: `Increase the cluster memory`, correct: false,
            why: `This is a <b>concurrency</b> conflict, not an OOM. More memory changes nothing about two writers racing for the same Delta version.` },
          { label: `Delete the _delta_log to "reset" the table`, correct: false,
            why: `Catastrophic — the transaction log <i>is</i> the table's integrity (which files are valid, history, ACID). Deleting it corrupts the table and loses time travel. Never do this.` },
        ],
      },
      {
        prompt: `Two writers update overlapping order_ids. How do you make it stop conflicting?`,
        checks: [
          { label: `Partition the work so each writer owns disjoint data (or serialize them)`, correct: true,
            evidence: `Splitting by date range (backfill handles old partitions, hourly handles current) means the two MERGEs no longer touch the same files — conflicts disappear.`,
            reasoning: `Optimistic concurrency only conflicts on <b>overlapping files</b>. Two INSERT/MERGE writers on <b>disjoint partitions</b> commit happily. Giving each writer a non-overlapping slice (or serializing them through a job dependency) removes the race at the source.` },
          { label: `Just add more retries and hope`, correct: false,
            why: `Retries help with <i>transient</i> conflicts, but two jobs continuously updating the same rows will keep colliding — you've built a livelock, not a fix. Remove the overlap or serialize.` },
        ],
      },
    ],
    rootCause: `Two concurrent writers performed UPDATE/MERGE operations on <b>overlapping files</b> of the same Delta table. Optimistic concurrency control detected the conflict and failed the loser — by design, not a bug.`,
    resolution: `Eliminate the overlap: partition the writers onto disjoint data (e.g. backfill owns historical partitions, the hourly job owns the current one), or serialize them with a Workflow task dependency so they never commit at the same time. Keep a bounded retry for genuinely transient conflicts.`,
    prevention: `Design for a <b>single logical writer per partition</b>. Where multiple writers are unavoidable, make them append-only to distinct partitions, and use job orchestration (dependencies) rather than hope to prevent simultaneous commits.`,
    interviewAnswer: `"That's optimistic concurrency doing its job — two writers hit overlapping files and the loser is rejected. The fix isn't more retries; it's removing the overlap: partition writers onto disjoint data or serialize them through a job dependency. Conflicts only arise on overlapping file ranges, so disjoint INSERT/MERGE writers never collide."`,
  },
  {
    id: 'time-travel-gone',
    difficulty: 'medium',
    icon: '🕳️',
    title: 'Time travel fails: FileNotFoundException on an old version',
    symptom: `An analyst tries <code>SELECT * FROM sales VERSION AS OF 42</code> to audit last month's numbers and gets a <code>FileNotFoundException</code>. The current version of the table queries fine.`,
    steps: [
      {
        prompt: `Current reads work but an old version is broken. What do you check?`,
        checks: [
          { label: `Check the table history and whether VACUUM ran recently`, correct: true,
            evidence: `<code>DESCRIBE HISTORY sales</code> shows a VACUUM operation two days ago, and version 42 is older than the retention window.`,
            reasoning: `Time travel resolves an old version from the <b>log</b>, but the actual Parquet files for that version must still exist on disk. If current reads work but an old one 404s, something <b>physically deleted</b> the old files — and VACUUM is the operation that does exactly that past the retention threshold.` },
          { label: `Conclude the table is corrupted and restore from backup`, correct: false,
            why: `The <i>current</i> table is perfectly healthy. Jumping to "corrupted" misreads the symptom — only historical files are gone, which is expected post-VACUUM, not corruption.` },
        ],
      },
      {
        prompt: `VACUUM removed the old files. Could the time-travel query have been saved?`,
        checks: [
          { label: `Only if retention had covered version 42 (or a longer retention was set earlier)`, correct: true,
            evidence: `VACUUM's default retention is 7 days; version 42 was ~30 days old, so its tombstoned files were eligible for deletion and removed.`,
            reasoning: `VACUUM deletes files no longer in the current version and older than the retention period. Once deleted, time travel to before that window is <b>permanently</b> impossible — the log entry remains but points at files that no longer exist. Retention is the only lever, and it must be set <i>before</i> you need the history.` },
          { label: `Yes — re-run VACUUM to bring the files back`, correct: false,
            why: `VACUUM only deletes; it can't restore. The Parquet files are gone from object storage. There is no undo.` },
        ],
      },
    ],
    rootCause: `A VACUUM with the default (or shortened) retention physically deleted the Parquet files backing version 42, which was older than the retention window. Time travel still finds the commit in the log but the underlying files no longer exist.`,
    resolution: `For this request, the data is unrecoverable unless there's an external backup or a downstream copy. Going forward, if long audit windows are needed, <b>raise the VACUUM retention</b> (e.g. to cover your audit period) so historical versions stay queryable.`,
    prevention: `Set VACUUM retention to the longest window you must be able to time-travel/roll back to; never run <code>RETAIN 0 HOURS</code> on a table with audit or recovery needs. For long-term audit, snapshot or CLONE critical month-end versions to a separate retained table.`,
    interviewAnswer: `"Current reads fine, old version 404s → something deleted the old files, and that's VACUUM. It removes tombstoned files past the retention window (default 7 days), after which time travel to before that point fails with FileNotFoundException — permanently. The prevention is matching VACUUM retention to your audit/rollback needs before you need them."`,
  },
  {
    id: 'bill-spike',
    difficulty: 'medium',
    icon: '💸',
    title: 'The Databricks bill doubled this month',
    symptom: `Finance flags that Databricks spend doubled month over month. Nobody launched an obvious new project. You need to find the cause and stop the bleed.`,
    steps: [
      {
        prompt: `Where do you look to attribute the extra cost — not guess at it?`,
        checks: [
          { label: `Query system.billing.usage grouped by SKU, workspace, and tags`, correct: true,
            evidence: `Grouping by SKU shows the spike is almost entirely <b>all-purpose compute</b> DBUs in one workspace, concentrated on a single cluster tag.`,
            reasoning: `<code>system.billing.usage</code> is the source of truth — per-DBU records you can slice by SKU, cluster, job, and custom tags. Grouping by SKU/tag turns "the bill doubled" into "this cluster, this SKU" in one query, instead of eyeballing the UI.` },
          { label: `Scroll the clusters page and look for anything that seems big`, correct: false,
            why: `The UI shows current state, not accumulated cost over the month, and misses terminated/ephemeral compute. You'll miss the real driver and can't quantify it.` },
        ],
      },
      {
        prompt: `It's one all-purpose cluster's DBUs. What's the likely mechanism?`,
        checks: [
          { label: `Check auto-termination and whether the cluster ran 24/7`, correct: true,
            evidence: `The cluster has <b>auto-termination disabled</b> and has been up continuously for three weeks after someone used it for an afternoon of exploration.`,
            reasoning: `An all-purpose cluster bills DBUs the entire time it's up. With auto-termination off, an interactive cluster left running overnight and weekends silently accumulates idle DBUs — the single most common Databricks cost leak.` },
          { label: `Blame Photon's higher DBU rate`, correct: false,
            why: `Photon raises DBU/hour but usually shortens runs; it doesn't make an idle cluster run for weeks. The evidence points at <b>idle always-on</b> compute, not per-query efficiency.` },
        ],
      },
    ],
    rootCause: `An all-purpose cluster with <b>auto-termination disabled</b> was left running continuously, billing idle DBUs around the clock. Untagged/loosely-governed compute let it go unnoticed until the invoice.`,
    resolution: `Terminate the cluster, enable auto-termination (e.g. 30–60 min idle), and switch recurring work to <b>job clusters</b> that die on completion. Add a cluster policy that <i>forces</i> an auto-termination timeout so it can't be disabled again.`,
    prevention: `Enforce cluster policies (mandatory auto-termination, max node caps), tag all compute (team/project/env), and build a recurring cost report off <code>system.billing.usage</code> with alerts on week-over-week DBU jumps per tag.`,
    interviewAnswer: `"I don't guess — I query <code>system.billing.usage</code> grouped by SKU and tag to attribute the spike, which here points at one all-purpose cluster. The usual mechanism is <b>auto-termination disabled</b> → idle DBUs 24/7. Fix: terminate, enforce auto-termination via cluster policy, move recurring work to job clusters, and alert on DBU trends per tag."`,
  },
  {
    id: 'stream-duplicates',
    difficulty: 'hard',
    icon: '👯',
    title: 'A streaming job is producing duplicate records downstream',
    symptom: `After a cluster restart, the Gold table shows duplicated events for the last few hours. The streaming job "recovered" on its own but now counts are inflated.`,
    steps: [
      {
        prompt: `Duplicates after a restart. What do you examine first?`,
        checks: [
          { label: `Verify the checkpoint location is intact and unique to this stream`, correct: true,
            evidence: `The job was redeployed with a <b>new checkpoint path</b> by mistake, so on restart it had no record of committed offsets and reprocessed from the source's earliest available data.`,
            reasoning: `The checkpoint is the stream's exactly-once memory. Duplicates/reprocessing after a restart almost always mean the checkpoint was <b>lost, moved, or shared</b>. Confirm it's the same, intact, and not reused by another query before looking anywhere else.` },
          { label: `Assume the source (Kafka/files) sent duplicates`, correct: false,
            why: `Possible but far less likely than a checkpoint mistake, and the timing (right after a restart/redeploy) screams checkpoint. Rule out the common cause first.` },
        ],
      },
      {
        prompt: `The checkpoint path changed. Beyond fixing the path, how do you make the sink robust to replays?`,
        checks: [
          { label: `Write to Delta with foreachBatch + a MERGE keyed on a unique event id`, correct: true,
            evidence: `Switching the Gold write to an idempotent MERGE on <code>event_id</code> means even a replayed batch updates-in-place instead of appending duplicates.`,
            reasoning: `Checkpoints protect you when they're intact, but an <b>idempotent sink</b> protects you when something still goes wrong. A MERGE/upsert keyed on a unique id makes re-delivery a no-op, turning at-least-once delivery into effective exactly-once at the sink.` },
          { label: `Add a nightly DISTINCT job to clean up`, correct: false,
            why: `A downstream dedupe is a band-aid that runs after bad data is already visible, costs a full scan, and doesn't stop the next replay. Fix it at the write with an idempotent MERGE.` },
        ],
      },
    ],
    rootCause: `A redeploy pointed the stream at a <b>new checkpoint location</b>, so on restart it lost its committed-offset history and reprocessed. The non-idempotent append sink then wrote the reprocessed events as duplicates.`,
    resolution: `Restore the correct, stable checkpoint path (one per stream, never shared), and make the sink idempotent: write via <code>foreachBatch</code> with a Delta <b>MERGE on a unique event id</b> so replays update rather than duplicate. Clean up the already-duplicated window with a one-time dedupe.`,
    prevention: `Treat the checkpoint path as part of the job's identity — pin it in config, never regenerate it on redeploy, and never share it between streams. Default to idempotent Delta sinks (MERGE on a business key) so the pipeline tolerates any replay.`,
    interviewAnswer: `"Duplicates after a restart → checkpoint first. Here a redeploy changed the checkpoint path, so the stream lost its offsets and reprocessed. Two fixes: restore a stable, unique checkpoint, and make the sink idempotent with a <code>foreachBatch</code> MERGE on a unique event id — that converts at-least-once delivery into effective exactly-once so replays can't duplicate."`,
  },
  {
    id: 'uc-permission-denied',
    difficulty: 'medium',
    icon: '🔒',
    title: 'Jobs fail with PERMISSION_DENIED after a Unity Catalog migration',
    symptom: `After moving tables from the Hive metastore into Unity Catalog, several production jobs fail with <code>PERMISSION_DENIED</code> reading <code>main.sales.orders</code> — even though they "worked yesterday" against the old <code>hive_metastore.sales.orders</code>.`,
    steps: [
      {
        prompt: `A job that read fine before now gets PERMISSION_DENIED under UC. What's the first check?`,
        checks: [
          { label: `Check which identity the job runs as, and whether that identity has UC grants`, correct: true,
            evidence: `The job runs as a <b>service principal</b> that was never granted <code>SELECT</code> on the new UC catalog/schema; previously it relied on the cluster's instance profile reaching S3 directly.`,
            reasoning: `UC enforces access by <b>identity</b>, not by the cluster's cloud credentials. Legacy Hive-metastore jobs often worked because the cluster's instance profile could read the bucket. Under UC that path is gone — the running identity needs explicit grants. So the first question is "who is this job, and what is it granted?"` },
          { label: `Assume the table didn't migrate and re-run the migration`, correct: false,
            why: `The error is <b>PERMISSION_DENIED</b>, not <i>table not found</i>. The object exists; the identity just isn't authorized. Re-migrating does nothing for a grants problem.` },
        ],
      },
      {
        prompt: `The service principal lacks grants. What else must be true for UC enforcement to work?`,
        checks: [
          { label: `The compute must use a UC-compliant access mode (shared or single-user)`, correct: true,
            evidence: `One failing job also ran on a legacy "no isolation" cluster that can't be trusted with vended credentials, so it couldn't access UC data at all.`,
            reasoning: `UC vends short-lived, scoped credentials and only does so to <b>compliant access modes</b>. A legacy no-isolation cluster isn't eligible, so even a well-granted identity fails there. You need both the grant <i>and</i> a UC-enabled cluster/warehouse.` },
          { label: `Give the service principal workspace-admin to be safe`, correct: false,
            why: `Over-granting admin violates least privilege and doesn't even target the issue cleanly — the fix is a scoped <code>GRANT SELECT</code> on the specific catalog/schema, plus a compliant cluster, not blanket admin.` },
        ],
      },
    ],
    rootCause: `The job's identity (a service principal) had no Unity Catalog grants on the migrated objects — it had previously relied on the cluster's cloud instance profile reading storage directly, a path UC deliberately removes. One job also ran on a non-UC-compliant cluster.`,
    resolution: `Grant least-privilege access in UC (<code>GRANT USE CATALOG</code>/<code>USE SCHEMA</code>/<code>SELECT</code> to the service principal or its group), and move the jobs onto UC-compliant compute (shared or single-user access mode). The jobs then read via UC's credential vending.`,
    prevention: `Make UC grants part of the migration runbook: for every migrated schema, grant the owning jobs' identities up front, map groups to catalogs/schemas, and verify all production jobs run on UC-enabled access modes before cutover.`,
    interviewAnswer: `"PERMISSION_DENIED (not 'not found') means the object exists but the identity isn't authorized. UC enforces by <b>identity</b>, not the cluster's instance profile — so the old 'the cluster could read S3' path is gone. Fix: least-privilege UC grants to the job's service principal/group, and ensure it runs on UC-compliant compute so credential vending works."`,
  },
  {
    id: 'serverless-cost-surprise',
    difficulty: 'medium',
    icon: '☁️',
    title: 'We moved everything to serverless and the bill went UP',
    symptom: `A team switched all compute to serverless "to save money and simplify ops." The next month's bill is <b>higher</b> than before, not lower. Leadership wants to know why and whether to roll back.`,
    steps: [
      {
        prompt: `Serverless was supposed to be cheaper. Where do you look to explain the increase?`,
        checks: [
          { label: `Break down serverless spend by workload in system.billing.usage`, correct: true,
            evidence: `Most of the increase comes from <b>one long-running nightly batch</b> that now runs ~6 hours on serverless; the bursty BI warehouses actually got cheaper.`,
            reasoning: `Serverless isn't uniformly cheaper — it wins where <b>startup latency and idle</b> dominate and loses where compute runs <b>hot and steady</b>. Attributing the delta by workload (not assuming) shows the win and the loss are on different jobs, which is the whole story.` },
          { label: `Assume serverless is just a scam and roll everything back`, correct: false,
            why: `Over-correcting throws away the real savings on the bursty BI/interactive workloads. The bill moved for a specific reason on a specific workload — find it before reversing a decision that partly worked.` },
          { label: `File a billing dispute with Databricks`, correct: false,
            why: `There's nothing to dispute — the higher blended serverless rate is expected. This is a <b>workload-fit</b> problem, not a billing error.` },
        ],
      },
      {
        prompt: `The long hot batch is the culprit. Why does serverless lose there specifically?`,
        checks: [
          { label: `No idle to offset the higher rate, and no spot discount available`, correct: true,
            evidence: `The batch has ~0% idle time (it runs flat-out for 6 hours), and on classic it had been using <b>spot workers</b> at ~70% off VM cost — which serverless can't use.`,
            reasoning: `Serverless folds the VM cost into a higher per-DBU rate and trades away spot. On a job that's fully utilized for hours, there's no idle period for scale-to-zero to save, so you pay the higher rate the whole time <i>and</i> forfeit the spot discount. That's precisely where classic + spot is cheaper.` },
          { label: `Serverless must be using bigger nodes`, correct: false,
            why: `You don't choose node size on serverless, and the issue isn't sizing — it's the rate model (blended, no spot) applied to a steady, fully-utilized workload. Chasing node size misses the real cause.` },
        ],
      },
    ],
    rootCause: `Serverless was applied uniformly, including to a long-running, fully-utilized nightly batch. Serverless's higher blended rate has no idle period to offset on a hot steady job, and it can't use the spot discounts that job previously relied on — so that workload got more expensive, outweighing the genuine savings on bursty BI/interactive compute.`,
    resolution: `Move the long hot batch <b>back to classic job compute with spot workers + on-demand driver</b>; keep the bursty SQL warehouses, interactive notebooks, and spiky jobs on serverless. Right-tool-per-workload, not all-or-nothing.`,
    prevention: `Decide serverless vs classic per workload using the rule "startup + idle vs steady utilization": bursty/latency-sensitive → serverless; long, hot, spot-eligible → classic. Monitor <code>system.billing.usage</code> by workload so a migration's effect is visible immediately, not at month-end.`,
    interviewAnswer: `"Serverless is simpler, not unconditionally cheaper. It wins where startup latency and idle dominate — bursty BI, spiky jobs, interactive — and loses on long, fully-utilized batch, where the higher blended rate has no idle to offset and you give up spot. I'd attribute the increase by workload in system tables, move just the hot steady batch back to classic + spot, and keep the rest on serverless."`,
  },
];
