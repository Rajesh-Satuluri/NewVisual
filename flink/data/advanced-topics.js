// Advanced topics — senior-level deep dives for the Flink "Uber Edition" SPA.
// Each entry augments a core module with the nuance an interview actually probes.
export const ADVANCED_TOPICS = [
  {
    id: 'async-io',
    icon: '⚡',
    title: 'Async I/O for external enrichment',
    summary: 'Enrich a stream from an external store without starving your pipeline one blocking call at a time.',
    body: `<p>Every GPS ping for ride <strong>R-4471</strong> needs enrichment: driver reputation, rider tier, the H3 cell's current surge multiplier. Those live in Redis / Cassandra / a REST service, not in Flink. The naive move is to call them inside a <code>MapFunction</code> — and that is exactly the trap.</p>
<p>A Flink operator subtask processes records <em>synchronously, one at a time</em>. If your <code>map()</code> blocks for a 5ms round-trip, that single subtask is capped at ~200 records/sec no matter how beefy the box is. At 1M pings/sec you would need thousands of subtasks just to hide network latency — you'd be paying for CPU to do nothing but wait on sockets.</p>
<p><strong>Async I/O</strong> (<code>AsyncDataStream</code> / PyFlink's async table functions) decouples request issuance from response handling. One subtask fires many in-flight requests concurrently against the external client's own async API, and Flink manages the outstanding requests, checkpointing, and ordering for you. Throughput becomes bounded by the external system, not by latency.</p>
<h4>Ordered vs unordered</h4>
<ul>
<li><strong>Unordered</strong> (<code>AsyncDataStream.unordered_wait</code>): results are emitted as soon as they return, regardless of input order. Highest throughput, lowest latency. Safe when downstream doesn't care about order — which, under event-time processing with watermarks, is usually fine because watermarks (not record order) drive correctness. The operator still respects watermark boundaries: it won't emit a result past a watermark out of order.</li>
<li><strong>Ordered</strong> (<code>ordered_wait</code>): output order matches input order. Flink buffers completed-but-early results until their predecessors finish. Costs latency and state (the buffer), but required when a strict per-key sequence matters downstream.</li>
</ul>
<h4>Capacity and timeout</h4>
<p><strong>Capacity</strong> is the max number of in-flight requests per subtask. It is the back-pressure knob: when the buffer of pending requests is full, Flink applies back-pressure upstream rather than issuing unbounded concurrent calls that would melt the enrichment service. Size it to the external system's concurrency budget divided by parallelism.</p>
<p><strong>Timeout</strong> bounds how long a request may stay outstanding before Flink considers it failed. Without it, one hung dependency stalls a checkpoint forever (in-flight async requests are part of the operator's checkpointed state). On timeout you decide the policy: fail the job, or complete with a default/empty enrichment so a slow fraud-rules lookup doesn't block the whole surge pipeline.</p>
<div class="code-block"><pre># PyFlink: async lookup against surge service, unordered for throughput
from pyflink.datastream import StreamExecutionEnvironment
from pyflink.datastream.functions import AsyncFunction
from pyflink.common import Duration

class SurgeEnrich(AsyncFunction):
    def open(self, ctx):
        # one async, connection-pooled client PER subtask (not per record)
        self.client = make_async_surge_client(pool_size=200)

    async def async_invoke(self, ping, result_future):
        try:
            surge = await self.client.get_multiplier(ping['h3_cell'])
            result_future.complete([{**ping, 'surge': surge}])
        except Exception:
            result_future.complete([{**ping, 'surge': 1.0}])  # safe default

AsyncDataStream.unordered_wait(
    gps_pings, SurgeEnrich(),
    timeout=Duration.of_millis(100),   # fraud budget is &lt;100ms end to end
    capacity=500)                       # max in-flight per subtask
</pre></div>
<p><strong>Gotchas:</strong> (1) the external client must itself be async/non-blocking — wrapping a synchronous driver in a thread pool reintroduces the bottleneck. (2) <code>result_future.complete()</code> must be called exactly once per record, including on the error path, or the operator leaks capacity and eventually stalls. (3) In-flight requests ARE checkpointed and replayed on restore, so your enrichment calls must be idempotent or at least safe to re-issue.</p>`,
    interviewAngle: "They want to hear you articulate WHY a blocking map caps a subtask at 1/latency records/sec, and that you reach for async I/O instead of just cranking parallelism. Bonus points for naming capacity as the back-pressure/concurrency knob, timeout as checkpoint-liveness insurance, and unordered-by-default because watermarks (not record order) carry event-time correctness. A weak answer caches everything in local state and ignores staleness; a strong one discusses ordered-vs-unordered trade-offs and the idempotency requirement from checkpoint replay.",
    related: ['m07', 'm14', 'm16']
  },
  {
    id: 'broadcast-state',
    icon: '📡',
    title: 'Broadcast state pattern',
    summary: 'Push a small, dynamic ruleset to every parallel subtask so each can evaluate it against its own keyed slice.',
    body: `<p>Fraud rules change constantly: a new rule says "flag any ride where pickup and the first GPS ping are >2km apart within 3 seconds." You cannot redeploy the job every time risk-ops writes a rule. You also cannot <code>keyBy</code> the rules — they must reach <em>every</em> subtask, because every subtask processes some partition of ride R-4471's event stream and all of them must apply the full ruleset.</p>
<p>The <strong>broadcast state pattern</strong> solves exactly this: a low-throughput control stream (rules/config) is broadcast to all subtasks of a downstream operator, while the high-throughput main stream stays keyed/partitioned as usual. The two are joined with a <code>KeyedBroadcastProcessFunction</code> (or <code>BroadcastProcessFunction</code> when the main stream isn't keyed).</p>
<h4>How it works</h4>
<ul>
<li>The rules stream is marked broadcast via a <code>MapStateDescriptor</code>. Flink replicates every rule record to <em>all</em> parallel instances of the operator. Each subtask holds an identical copy in <strong>broadcast state</strong>.</li>
<li>The main event stream is connected to it. Each subtask evaluates its local events against its local (complete) copy of the rules.</li>
<li>Rule updates (add/modify/delete) are themselves just records on the control stream, so rules go live within one checkpoint interval — no restart.</li>
</ul>
<h4>The two sides have different write rules</h4>
<p>This is the subtlety interviewers probe. In the process function:</p>
<ul>
<li><code>process_broadcast_element()</code> handles a rule. It gets a <strong>read-write</strong> <code>Context</code> — only here may you mutate broadcast state. Because every subtask runs this with the same input, the copies stay consistent.</li>
<li><code>process_element()</code> handles an event. It gets a <strong>read-only</strong> context on broadcast state. You may read the rules but not write them — if subtasks could mutate broadcast state independently from their own (different) event partitions, the replicas would diverge and consistency would be lost.</li>
</ul>
<div class="code-block"><pre>-- Flink SQL analog: a lookup/temporal join against a slowly-changing
-- rules table achieves similar "config fan-out" for declarative pipelines.
-- Pure broadcast state is a DataStream construct; in SQL you model the
-- dynamic ruleset as a versioned table and temporal-join it.
CREATE TABLE fraud_rules (
  rule_id    STRING,
  rule_type  STRING,
  threshold  DOUBLE,
  updated_at TIMESTAMP(3),
  PRIMARY KEY (rule_id) NOT ENFORCED,
  WATERMARK FOR updated_at AS updated_at
) WITH ('connector' = 'upsert-kafka', ...);

SELECT e.ride_id, e.score, r.rule_type
FROM ride_events AS e
JOIN fraud_rules FOR SYSTEM_TIME AS OF e.event_time AS r
  ON e.rule_key = r.rule_id;</pre></div>
<div class="code-block"><pre># PyFlink DataStream: broadcast fraud rules to every subtask
rules_desc = MapStateDescriptor('rules', Types.STRING(), Types.PICKLED_BYTE_ARRAY())
broadcast_rules = rules_stream.broadcast(rules_desc)

class FraudEval(KeyedBroadcastProcessFunction):
    def process_broadcast_element(self, rule, ctx):
        # READ-WRITE: only place broadcast state may be mutated
        ctx.get_broadcast_state(rules_desc).put(rule['id'], rule)

    def process_element(self, event, ctx):
        # READ-ONLY view of the full, identical ruleset on this subtask
        for _id, rule in ctx.get_broadcast_state(rules_desc).items():
            if violates(event, rule):
                yield {'ride_id': event['ride_id'], 'rule': rule['id']}

rides_keyed.connect(broadcast_rules).process(FraudEval())</pre></div>
<p><strong>Constraints to remember:</strong> broadcast state is kept <em>on-heap</em> and replicated to every subtask, so it must be small — rulesets and feature flags, not a 10GB dimension table. On rescaling, broadcast state is redistributed by replicating the existing copy to new subtasks. There is no TTL mechanism built in; you expire rules by sending explicit delete records on the control stream.</p>`,
    interviewAngle: "The core test is whether you understand WHY you can't keyBy a ruleset and HOW the read-write (broadcast-element) vs read-only (main-element) asymmetry preserves replica consistency across subtasks. Strong candidates note broadcast state is on-heap and small-only, lives identically on every subtask, and updates propagate within a checkpoint interval without a restart. Mentioning the SQL temporal-join alternative for declarative pipelines shows range.",
    related: ['m09', 'm13', 'm16']
  },
  {
    id: 'changelog-streams',
    icon: '🔁',
    title: 'Append vs retract vs upsert (changelog) streams',
    summary: "Every Flink SQL query emits a changelog; knowing which mode it produces tells you the cost and the sink's PK requirement.",
    body: `<p>Flink SQL is stream-table duality in action: a continuous query over an unbounded input emits a <strong>changelog stream</strong> — a sequence of change events the downstream must apply to stay consistent. Flink distinguishes four row kinds: <code>+I</code> (insert), <code>-U</code> (update-before), <code>+U</code> (update-after), <code>-D</code> (delete). The <em>combination</em> a query can produce defines its mode.</p>
<h4>Append-only</h4>
<p>Emits only <code>+I</code>. Produced by queries where a result row, once emitted, is never revised: projections, filters, event-time windowed aggregations (the window closes and emits a final row), interval joins, append-only unions. Cheapest mode — minimal state, no need for the sink to locate and overwrite prior rows. The surge pricing feed per closed 1-minute tumbling window over R-4471's region is append-only.</p>
<h4>Retract</h4>
<p>Emits <code>+I</code>, and when a prior result changes, a <code>-U</code> (retract the old value) followed by a <code>+U</code> (emit the new). Produced by <em>unbounded</em> aggregations and regular (non-windowed, non-temporal) joins — anything where a late arriving record revises an already-emitted result. Example: a running <code>COUNT(*) ... GROUP BY driver_id</code> over all of a driver's rides. Each new ride retracts the previous count and emits the incremented one. Correct everywhere but the most expensive: every revision is <em>two</em> records on the wire, and the operator must keep the full aggregation state to compute the retraction. Retract works against any sink because retractions are explicit — the sink doesn't need a primary key to know what to undo.</p>
<h4>Upsert (a.k.a. upsert changelog)</h4>
<p>Emits <code>+U</code>/<code>+I</code> (compacted into an "upsert" by key) and <code>-D</code>, but <strong>no</strong> <code>-U</code>. It is a space/wire optimization over retract: instead of retract-then-insert, it sends only the new value keyed by a primary key, and the downstream overwrites in place. This <strong>requires a primary key</strong> on both the query output and the sink — the sink must be able to locate the existing row by that key to overwrite it. <code>upsert-kafka</code> and most JDBC/KV sinks expect this mode. Half the records of retract, but you must have a PK and the sink must be idempotent on it.</p>
<h4>Decision table</h4>
<div class="code-block"><pre>-- APPEND-ONLY: windowed agg -> final rows, +I only
SELECT window_start, h3_cell, AVG(surge) AS surge
FROM TABLE(TUMBLE(TABLE pings, DESCRIPTOR(event_time), INTERVAL '1' MINUTE))
GROUP BY window_start, h3_cell;

-- RETRACT: unbounded agg, emits -U/+U on every revision, no PK needed
SELECT driver_id, COUNT(*) AS trips, AVG(fare) AS avg_fare
FROM completed_rides
GROUP BY driver_id;

-- UPSERT: same logic, PK declared -> sink overwrites by key, no -U
CREATE TABLE driver_stats (
  driver_id STRING,
  trips     BIGINT,
  avg_fare  DOUBLE,
  PRIMARY KEY (driver_id) NOT ENFORCED
) WITH ('connector' = 'upsert-kafka', 'key.format' = 'json', ...);
INSERT INTO driver_stats
SELECT driver_id, COUNT(*), AVG(fare) FROM completed_rides GROUP BY driver_id;</pre></div>
<p><strong>Why it matters operationally:</strong> if your query produces a retract/upsert changelog but you point it at an append-only sink (e.g., plain <code>kafka</code> instead of <code>upsert-kafka</code>), the planner errors with "doesn't support consuming update/delete changes." The fix is either to make the query append-only (add a window/time bound) or switch to an upsert sink with a PK. Senior engineers reduce retract cost by converting unbounded aggregations into windowed ones wherever business logic allows, because append-only state is bounded while unbounded aggregation state grows with distinct keys forever.</p>`,
    interviewAngle: "They're checking that you can look at a SQL query and predict its changelog mode — and therefore its state cost and its sink requirements. The killer sub-question is 'why does upsert need a primary key but retract doesn't?' (retractions are explicit -U records; upsert overwrites by key so it must locate the row). Strong answers tie unbounded aggregation = retract = growing state, and propose windowing to get back to append-only. The classic failure is pointing an updating query at a plain append-only sink and not knowing why the planner rejects it.",
    related: ['m11', 'm12', 'm13b']
  },
  {
    id: 'temporal-joins',
    icon: '🕰️',
    title: 'Temporal & lookup joins',
    summary: 'Join a fact stream to the dimension value as it was at event time — without unbounded state growth.',
    body: `<p>A payment for ride R-4471 arrives; to settle it you must apply the exchange rate <em>as it was at the moment of the trip</em>, not today's rate. A regular join against a rates table would (a) grow state without bound, keeping every version of every rate forever, and (b) be non-deterministic on reprocessing because it joins against "latest." This is what <strong>temporal joins</strong> fix.</p>
<h4>Temporal (event-time) join — versioned tables</h4>
<p>A <strong>versioned table</strong> is a changelog table with a primary key and an event-time attribute; Flink tracks every version of each key over time. The syntax <code>FOR SYSTEM_TIME AS OF e.event_time</code> instructs Flink to join each fact row against the version of the dimension row that was valid <em>at the fact's event time</em>.</p>
<div class="code-block"><pre>-- versioned dimension: currency rates, keyed by currency, time-versioned
CREATE TABLE fx_rates (
  currency   STRING,
  rate       DECIMAL(10,5),
  update_time TIMESTAMP(3),
  WATERMARK FOR update_time AS update_time,
  PRIMARY KEY (currency) NOT ENFORCED
) WITH ('connector' = 'upsert-kafka', ...);

-- fact stream of payments
SELECT p.ride_id, p.amount * r.rate AS amount_usd
FROM payments AS p
JOIN fx_rates FOR SYSTEM_TIME AS OF p.event_time AS r
  ON p.currency = r.currency;</pre></div>
<p><strong>Event-time correctness:</strong> the join result for a payment is emitted only once the watermark on the rates side has passed that payment's event time — i.e., once Flink knows no earlier rate version can still arrive. This makes the result <em>deterministic and reproducible</em>: rerun the job on the same inputs and you get the same answer, because "the rate at event time T" is well-defined.</p>
<p><strong>Bounding state</strong> is the real payoff. Flink only needs to retain rate versions that could still be joined against an un-arrived fact — i.e., versions newer than the fact-side watermark. Older versions are pruned once the watermark guarantees no fact can reference them. State stays bounded by the number of distinct keys times the in-flight time window, not by total history.</p>
<h4>Lookup join — processing-time against an external store</h4>
<p>A <strong>lookup join</strong> (<code>FOR SYSTEM_TIME AS OF p.proc_time</code>) queries an external system — JDBC, HBase, Hive — at <em>processing time</em>, on demand, per incoming row. There is no versioning and no event-time guarantee: you get whatever the external table holds <em>right now</em>. Flink keeps little to no join state; the "state" lives in the external DB. It's the SQL equivalent of the Async I/O enrichment pattern and in fact is backed by async lookup + caching under the hood.</p>
<div class="code-block"><pre>-- lookup join: enrich pings with driver dim from JDBC at processing time
SELECT p.ride_id, p.h3_cell, d.driver_tier
FROM gps_pings AS p
JOIN driver_dim FOR SYSTEM_TIME AS OF p.proc_time AS d
  ON p.driver_id = d.driver_id;
-- table opts: 'lookup.cache' = 'PARTIAL', 'lookup.cache.max-rows' = '100000',
--             'lookup.cache.ttl' = '5 min', 'lookup.async' = 'true'</pre></div>
<h4>Choosing between them</h4>
<ul>
<li>Need the dimension value <em>as of the event</em>, deterministic reprocessing, bounded Flink state → <strong>temporal join</strong> against a versioned table (both sides streamed, both need watermarks + PK).</li>
<li>Dimension lives in an external DB, "current value is good enough," want minimal Flink state → <strong>lookup join</strong> at processing time (tune the cache TTL to trade freshness for load).</li>
</ul>
<p><strong>Common pitfalls:</strong> forgetting the watermark on the versioned (build) side — without it Flink can't prune versions and can't decide when a match is final, so results stall or never emit. And mixing them up: a lookup join at processing time will join yesterday's backfill against <em>today's</em> dimension values, silently corrupting a replay.</p>`,
    interviewAngle: "The crux is the distinction between 'the dimension value as of event time' (temporal join, versioned table, deterministic replay, bounded state via watermark-driven pruning) and 'the current value' (lookup join at processing time, external store, no event-time guarantee). Interviewers love asking why a plain regular join is wrong here — unbounded state plus non-deterministic reprocessing. Strong candidates name the watermark on the build side as what both bounds state and gates emission, and flag that a lookup join silently breaks historical replays.",
    related: ['m11', 'm12', 'm13']
  },
  {
    id: 'state-processor-api',
    icon: '🔧',
    title: 'State Processor API',
    summary: 'Read, mutate, and bootstrap savepoint state offline — Flink state as a queryable, writable dataset.',
    body: `<p>Checkpoints and savepoints are normally opaque: a binary blob Flink restores into a running job. The <strong>State Processor API</strong> cracks them open, exposing the keyed and operator state inside a savepoint as a bounded dataset you can read, transform, and write back — all offline, without the streaming job running.</p>
<h4>The three jobs it does</h4>
<ul>
<li><strong>Reading / inspecting.</strong> Dump what's actually in state for debugging. Why is R-4471's fraud score stuck? Load the savepoint, read the fraud operator's keyed state for that ride_id, and inspect the stored accumulator. Invaluable when state looks wrong but you can't attach a debugger to a production job.</li>
<li><strong>Rewriting / migrating.</strong> Fix corrupted or stale values; migrate a state schema change your pipeline can't do in-flight; purge a poisoned key that crashes the job on every restore. You read the old savepoint, transform the entries, and write a new savepoint the fixed job starts from.</li>
<li><strong>Bootstrapping.</strong> Seed brand-new operator state before the first record ever flows. Launching the fraud job with 6 months of historical driver-reputation already loaded into keyed state means it makes good decisions from record #1, instead of a cold start where every driver looks new.</li>
</ul>
<h4>How it maps</h4>
<p>A savepoint is modeled as a set of operators identified by <strong>UID</strong> (this is why setting stable UIDs on stateful operators matters — the State Processor API addresses state by UID, and so does restore). For each operator you declare its state descriptors — the same <code>ValueState</code>/<code>ListState</code>/<code>MapState</code> descriptors the job uses — and Flink hands you the entries keyed exactly as the running job keyed them. You transform with a batch-style function and write the result into a new savepoint.</p>
<div class="code-block"><pre># PyFlink-style sketch: bootstrap driver-reputation keyed state into a
# new savepoint so the fraud job starts warm. (The State Processor API is
# a batch/DataSet-era API; recent Flink exposes it via the unified batch
# execution. Shown in Pythonic pseudocode — real impl uses the Java/Py API.)

# 1. historical reputation as a bounded source
history = env.from_source(driver_reputation_parquet)   # (driver_id, score, trips)

# 2. transform each row into keyed state for the fraud operator's UID
class SeedReputation(KeyedStateBootstrapFunction):
    def open(self, ctx):
        self.score = ctx.get_state(ValueStateDescriptor('rep', Types.DOUBLE()))
    def process_element(self, row, ctx):
        self.score.update(row.score)   # key = driver_id, set via keyBy below

bootstrap = OperatorTransformation \\
    .bootstrap_with(history.key_by(lambda r: r.driver_id)) \\
    .transform(SeedReputation())

# 3. write a NEW savepoint binding that state to the fraud operator's UID
Savepoint.create(state_backend, max_parallelism=256) \\
    .with_operator('fraud-scorer-uid', bootstrap) \\
    .write('s3://uber-flink/savepoints/fraud-warmstart')
# then:  flink run --fromSavepoint s3://.../fraud-warmstart  fraud_job.jar</pre></div>
<h4>Caveats that bite</h4>
<ul>
<li><strong>UIDs must match</strong> between the savepoint you write and the job that restores it, or restore fails (or silently drops state if <code>--allowNonRestoredState</code> is set — which is itself a footgun).</li>
<li><strong>State backend, serializers, and max-parallelism must be compatible.</strong> Max parallelism is fixed at a savepoint's creation and determines key-group assignment; you can't change it later, so bootstrap with the value the production job will use.</li>
<li>Reading a <em>checkpoint</em> (vs a savepoint) is possible but checkpoints are more format-sensitive across versions — savepoints are the portable, supported artifact for this.</li>
</ul>`,
    interviewAngle: "This separates engineers who treat state as a magic blob from those who treat it as data. The three canonical use cases — inspect, migrate/fix, bootstrap/warm-start — should come out fluently, ideally with a concrete scenario (seeding historical reputation so the fraud job isn't cold at launch). The deep cut is knowing state is addressed by operator UID (hence always set stable UIDs) and that max-parallelism is frozen at savepoint creation. Mentioning schema migration and purging a poison key shows real operational scars.",
    related: ['m10', 'm13', 'm15']
  },
  {
    id: 'deployment-modes',
    icon: '🚀',
    title: 'Deployment modes: application vs session vs per-job',
    summary: 'The modes differ in cluster lifecycle, resource isolation, and — crucially — where main() actually executes.',
    body: `<p>"Just deploy it" hides a real architectural choice. Flink offers three deployment modes that differ in cluster lifecycle, isolation, and — the detail interviewers zero in on — <strong>where the job's <code>main()</code> method runs and where the dataflow graph (JobGraph) gets built.</strong></p>
<h4>Session mode</h4>
<p>A long-running cluster (one JobManager + a pool of TaskManagers) accepts many jobs over time. You submit jobs to it like jobs to a shared service.</p>
<ul>
<li><strong>main() runs on the client.</strong> The client executes your program, builds the JobGraph, and ships it to the running JobManager.</li>
<li><strong>Pros:</strong> fast submission (cluster already up), good for many short/ad-hoc jobs, shared resource pool.</li>
<li><strong>Cons:</strong> no isolation — all jobs share TaskManagers, so one job's TaskManager crash can take down others on that TM, and a memory-hungry job starves its neighbors. One classloader pool means dependency conflicts across jobs. A heavy client is required.</li>
</ul>
<h4>Per-job mode (deprecated)</h4>
<p>A dedicated cluster is spun up <em>per job</em> and torn down when the job finishes. Good isolation — one job per cluster.</p>
<ul>
<li><strong>main() still runs on the client</strong>, which builds the JobGraph and then asks the resource manager (YARN, etc.) to launch a dedicated cluster for it.</li>
<li>This client-side graph-building is the weakness, and the reason per-job mode is <strong>deprecated in favor of application mode</strong>: the client does heavy lifting (downloading dependencies, running main()), which doesn't scale and makes the client a bottleneck/single point.</li>
</ul>
<h4>Application mode</h4>
<p>A dedicated cluster per <em>application</em>, but with the key difference that <strong>main() runs on the JobManager</strong>, not the client.</p>
<ul>
<li>You ship the application jar/artifacts to the cluster; the JobManager executes <code>main()</code> and builds the JobGraph <em>there</em>. The client just triggers deployment and can disconnect — it does almost no work and needs almost no dependencies locally.</li>
<li><strong>Isolation:</strong> each application gets its own JobManager + TaskManagers; resource and failure isolation are per-application. A crash is contained.</li>
<li><strong>The standard for production</strong> streaming jobs today, especially on Kubernetes (the Flink Kubernetes Operator deploys in application mode). The Uber fraud/surge pipelines would each run as their own application-mode deployment so a surge-job restart never perturbs the fraud job.</li>
<li><strong>Caveat:</strong> because main() runs on the JobManager, a program that calls <code>execute()</code> multiple times launches multiple jobs within that one application — understand your program's execution semantics.</li>
</ul>
<div class="code-block"><pre># Application mode on Kubernetes (the production default).
# main() executes on the JobManager; the client only kicks off deployment.
flink run-application \\
  --target kubernetes-application \\
  -Dkubernetes.cluster-id=uber-fraud-scorer \\
  -Dkubernetes.container.image=registry/uber-flink:fraud-1.9 \\
  local:///opt/flink/usrlib/fraud_job.py

# Session mode: submit onto an already-running shared cluster (main() = client)
flink run --target kubernetes-session \\
  -Dkubernetes.cluster-id=analytics-shared \\
  ./adhoc_query.py</pre></div>
<h4>Decision rule</h4>
<ul>
<li>Production, long-lived, needs isolation → <strong>application mode</strong>.</li>
<li>Many short-lived / interactive / ad-hoc jobs sharing resources → <strong>session mode</strong>.</li>
<li><strong>Per-job mode</strong> → don't choose it for new work; application mode supersedes it.</li>
</ul>`,
    interviewAngle: "The single discriminating question is 'where does main() run?' — client for session and (deprecated) per-job, JobManager for application mode — and why that makes application mode the production default (thin client, per-app isolation, Kubernetes-native). Strong candidates connect isolation to the failure/resource blast radius (session = shared TMs, one bad job hurts neighbors) and know per-job is deprecated in favor of application mode precisely to move graph-building off the client. Bonus: the multiple-execute() caveat in application mode.",
    related: ['m05', 'm17', 'm18']
  },
  {
    id: 'unaligned-checkpoints',
    icon: '🌊',
    title: 'Unaligned checkpoints & buffer debloating',
    summary: 'Let checkpoint barriers overtake in-flight data so a backpressured pipeline still checkpoints in time.',
    body: `<p>Checkpointing works by injecting <strong>barriers</strong> into the stream that flow with the data. In <em>aligned</em> checkpointing, when an operator has multiple input channels, it must wait until the barrier has arrived on <em>all</em> of them before snapshotting — a step called <strong>barrier alignment</strong>. Faster channels are blocked while the operator waits for the barrier on the slow channel to catch up.</p>
<h4>The backpressure problem</h4>
<p>Under backpressure — say the fraud scorer can't keep up with 1M pings/sec and its input buffers fill — barriers travel slowly, because a barrier can only advance as fast as the data ahead of it drains through the network buffers. Alignment then takes a very long time: the barrier is stuck behind a wall of buffered records. Checkpoint duration balloons, and eventually checkpoints <strong>time out and fail</strong>. Failed checkpoints mean no recovery point and, on a real failure, massive reprocessing. Backpressure is precisely when you most need a recent checkpoint and precisely when aligned checkpointing can't produce one.</p>
<h4>Unaligned checkpoints</h4>
<p>Unaligned checkpoints break the coupling between barrier progress and data drain. When a barrier arrives on <em>any</em> input channel, the operator immediately "overtakes" the buffered in-flight records: it forwards the barrier straight to its outputs and snapshots <strong>the in-flight buffer data itself</strong> (the records sitting in the network channels between operators) as part of the checkpoint, rather than waiting for them to be processed.</p>
<ul>
<li><strong>Benefit:</strong> checkpoint time becomes nearly independent of backpressure. The barrier no longer has to wait out the alignment, so checkpoints complete even when the pipeline is badly backpressured — exactly the scenario where aligned checkpoints time out.</li>
<li><strong>Trade-offs:</strong> (1) the in-flight data is now <em>in the checkpoint</em>, so checkpoint <strong>size grows</strong> (more state to write to S3 / the DFS, and larger restores). (2) It helps timeout under backpressure but doesn't reduce the <em>cause</em> — you've bought recoverability, not throughput. (3) Historically some restrictions (e.g., with certain rescaling or watermark-sensitive scenarios), so it's often configured to kick in only after aligned checkpointing has stalled past a threshold.</li>
</ul>
<h4>Buffer debloating</h4>
<p><strong>Buffer debloating</strong> attacks the problem from the other side: the amount of in-flight data. It dynamically sizes the network buffers so each channel holds only ~1 configured interval's worth of data (e.g., ~1 second), by measuring throughput and shrinking buffers when they'd otherwise hold a huge backlog. Less buffered data means:</p>
<ul>
<li>Barriers travel faster even under aligned checkpointing (less data ahead of them to drain), shortening alignment time.</li>
<li>Smaller unaligned checkpoints when combined with them (less in-flight data to snapshot).</li>
<li>Lower latency generally, since records aren't sitting in oversized buffers.</li>
</ul>
<p>The two are complementary: debloating reduces the in-flight volume; unaligned checkpoints handle whatever in-flight data remains without blocking on alignment.</p>
<div class="code-block"><pre># flink-conf.yaml — recover reliably under backpressure
execution.checkpointing.unaligned: true
# only go unaligned if an aligned checkpoint can't align within 5s:
execution.checkpointing.aligned-checkpoint-timeout: 5 s
execution.checkpointing.interval: 30 s
execution.checkpointing.timeout: 10 min

# buffer debloating: keep ~1s of in-flight data per channel
taskmanager.network.memory.buffer-debloat.enabled: true
taskmanager.network.memory.buffer-debloat.target: 1 s</pre></div>
<p><strong>When NOT to use unaligned:</strong> if your job isn't backpressured, aligned checkpoints are smaller and simpler — don't pay for in-flight snapshotting you don't need. And unaligned checkpoints don't fix the <em>root</em> cause of backpressure (an under-provisioned or skewed operator); they keep you recoverable while you fix scaling/skew/serialization.</p>`,
    interviewAngle: "They want the mechanism: aligned checkpointing blocks on barrier alignment across input channels, and under backpressure barriers crawl behind full buffers so checkpoints time out. Unaligned checkpoints let the barrier overtake and snapshot the in-flight channel data itself — trading larger checkpoints for completion under backpressure. Strong answers add buffer debloating as the complementary lever (bounding in-flight data) and the sober caveat that unaligned fixes recoverability, not the underlying skew/under-provisioning causing the backpressure.",
    related: ['m10', 'm15', 'm17']
  },
  {
    id: 'dynamic-tables',
    icon: '🔄',
    title: 'Dynamic tables & the stream-table duality',
    summary: 'A stream IS a table changing over time, and a query over it is a standing computation emitting a changelog.',
    body: `<p>This is the mental model that makes all of Flink SQL make sense. A <strong>dynamic table</strong> is a table whose contents change over time. The <strong>stream-table duality</strong> says a stream and a dynamic table are two views of the same thing: you can <em>interpret</em> a stream as the changelog that builds a table, and you can <em>observe</em> a table's changes as a stream.</p>
<h4>The duality, concretely</h4>
<ul>
<li><strong>Stream → dynamic table.</strong> Take the stream of R-4471's events. At any instant, the "table" is the accumulated result of all records seen so far. A new record is a change to that table. The stream IS the changelog that constructs the table over time.</li>
<li><strong>Dynamic table → stream.</strong> Conversely, observe how a dynamic table changes and you get a stream of change events — exactly the append / retract / upsert changelog. Materializing that changelog reconstructs the table on the other side.</li>
</ul>
<h4>Continuous queries</h4>
<p>A SQL query over a dynamic table is a <strong>continuous query</strong>: unlike a batch query that runs once over a static snapshot, it runs <em>forever</em>, and its result is <em>itself a dynamic table</em> that updates as the input changes. Flink doesn't re-run the query from scratch on each record — it incrementally maintains the result, keeping just enough state (the aggregation accumulators, join buffers, etc.) to update the output when input changes.</p>
<div class="code-block"><pre>-- a continuous query: this never "finishes". Its result is a dynamic
-- table that updates forever as new completed rides arrive. The engine
-- maintains per-driver accumulators in state and emits changes.
SELECT driver_id,
       COUNT(*)     AS trips,
       AVG(fare)    AS avg_fare
FROM completed_rides          -- input dynamic table (backed by a stream)
GROUP BY driver_id;           -- output dynamic table (emits a changelog)</pre></div>
<h4>From result table back to a stream: materialization</h4>
<p>The output dynamic table has to leave Flink somehow. Flink converts it to a stream using the changelog modes — and this is where append / retract / upsert come back in:</p>
<ul>
<li>If the query is append-only, the output stream is append-only.</li>
<li>If results get revised (unbounded aggregation above), the output is a retract or (with a PK) upsert changelog.</li>
</ul>
<p>The sink then <strong>materializes</strong> that changelog: an upsert-kafka topic, a JDBC table, or an OLAP store applies the inserts/updates/deletes to maintain a materialized view of the dynamic table that external systems can query. R-4471's live surge multiplier in a key-value store is a materialized view of a continuous query's dynamic table.</p>
<h4>Why this model matters</h4>
<ul>
<li>It is the reason the <em>same</em> SQL runs over batch and streaming: a bounded table is just a dynamic table that stops changing. Unified batch/stream semantics fall out of the duality.</li>
<li>It explains where state comes from: continuous queries keep state to incrementally maintain their result table; the shape of the query (windowed vs unbounded, join type) determines how much.</li>
<li>It explains the changelog: emitting a dynamic table as a stream necessarily produces +I/-U/+U/-D, and the query's revisability determines which.</li>
</ul>
<p><strong>The one-liner to remember:</strong> <em>a stream is a table that's still being written, and a streaming query is a materialized view that's always up to date.</em></p>`,
    interviewAngle: "This is the conceptual foundation; interviewers use it to check whether you understand Flink SQL rather than just memorized syntax. Nail the duality both directions (stream as a table's changelog; table changes observed as a stream), define a continuous query as a never-ending query whose result is itself a dynamic table maintained incrementally in state, and connect materialization back to append/retract/upsert changelogs. The payoff statement they're listening for: this duality is why identical SQL has unified batch and streaming semantics, and why continuous queries need state.",
    related: ['m11', 'm12', 'm13b']
  }
];
