// AWS streaming curriculum (Gate 5a, deepened). Facts validated I38 against
// official AWS docs (docs/technical-accuracy-review.md §5). Each module has four
// tabs — Concept · Mechanics · In-scenario · Interview Q&A — matching the depth
// of the Kafka/Flink modules. Scenario tokens {ENTITY}/{KEY}/{ID} are filled live.
import { iqSection, flowDiagram, compareTable, codeBlock } from '../components/lesson-shell.js';

const T = (concept, mechanics, scenario, iq) => ([
  { id: 'why', label: '📖 Concept', body: concept },
  { id: 'mech', label: '🔧 Mechanics', body: mechanics },
  { id: 'scn', label: '🎬 In your scenario', body: scenario },
  { id: 'iq', label: '🎯 Interview Q&A', body: iqSection(iq) },
]);

export const AWS = {
  id: 'aws', name: 'AWS', icon: '☁️', accent: '#FF9900',
  blurb: 'Streaming on AWS — Kinesis Data Streams, MSK, Managed Service for Apache Flink, Firehose and Lambda. Every fact validated against official AWS docs.',
  modules: [
    { id: 'aws01', num: '01', icon: '🗺️', title: 'AWS streaming landscape', idea: 'Four services cover ingest → process → deliver; pick by ordering, latency, and tooling.',
      tabs: T(
        `<h3>The AWS streaming toolbox</h3>
         <ul class="clean">
           <li><b>Kinesis Data Streams (KDS)</b> — AWS-native, shard-based durable log. Low ops, AWS-centric.</li>
           <li><b>Amazon MSK</b> — fully managed Apache Kafka (Provisioned or Serverless). Full Kafka API & ecosystem.</li>
           <li><b>Managed Service for Apache Flink</b> — managed Flink for stateful processing (formerly Kinesis Data Analytics).</li>
           <li><b>Amazon Data Firehose</b> — near-real-time delivery to S3/Redshift/OpenSearch, no code.</li>
           <li><b>AWS Lambda</b> — serverless consumers via event-source mappings.</li>
         </ul>
         <div class="lx-callout lx-info"><b>Mental model.</b><div>KDS/MSK are the <i>log</i>; Flink/Lambda are the <i>processing</i>;
         Firehose + S3 are a <i>sink</i>. The same backbone from Foundations, with AWS names.</div></div>`,
        `<h3>How a request flows</h3>
         ${flowDiagram(['Producers (SDK/KPL)', 'Kinesis / MSK', 'Flink / Lambda', 'Firehose', 'S3 / serving store'])}
         <h3>Pick by requirement</h3>
         ${compareTable(['Need', 'Use'], [
           ['Least ops, AWS-only, moderate scale', 'Kinesis Data Streams'],
           ['Kafka API, Connect, Schema Registry, portability', 'Amazon MSK'],
           ['No-code land-to-storage', 'Firehose'],
           ['Rich stateful processing (windows/joins/CEP)', 'Managed Service for Apache Flink'],
           ['Lightweight per-event logic, serverless', 'Lambda'],
         ])}`,
        `<h3>{ID} on AWS</h3>
         <p>For the <b>{ENTITY}</b> stream, {ENTITY} events land in <b>Kinesis</b> keyed on <code>{KEY}</code>,
         a <b>Managed Flink</b> app computes windowed aggregates, <b>Firehose</b> lands raw + enriched events
         in <b>S3</b>, and a serving store answers live queries. CloudWatch watches it end to end.</p>`,
        [
          { q: 'When would you choose Kinesis over MSK?', a: 'When you want an <b>AWS-native, low-operations</b> service and don\'t need the Kafka API or ecosystem (Connect, Streams, Schema Registry, transactions). Kinesis integrates tightly with Lambda/Firehose/KCL and scales by shards.' },
          { q: 'Is Firehose a replacement for Kinesis Data Streams?', a: 'No. Firehose is a <b>delivery</b> pipe to storage/analytics with buffering and no replay; Streams is a <b>replayable log</b> you process. They\'re often combined: Streams → Flink/Lambda → Firehose → S3.' },
          { q: 'Where does Managed Service for Apache Flink fit?', a: 'It\'s the <b>stateful processing</b> layer — windows, joins, keyed state, CEP — running real Apache Flink managed by AWS, reading from Kinesis/MSK and writing to sinks.' },
        ]),
    },

    { id: 'aws02', num: '02', icon: '🌊', title: 'Kinesis Data Streams fundamentals', idea: 'A durable, ordered log split into shards — AWS\'s answer to a Kafka topic.',
      tabs: T(
        `<h3>The model</h3>
         <p>A <b>stream</b> is made of <b>shards</b>. Producers <code>PutRecord(s)</code> with a
         <b>partition key</b>; Kinesis hashes it to a shard. Consumers read in order per shard. Shard ≈ Kafka partition.</p>
         <div class="lx-keypoints"><div class="lx-kp-h">Validated capacity (per shard)</div><ul class="clean">
           <li><b>Write:</b> 1 MB/s and 1,000 records/s (byte limit includes the partition key).</li>
           <li><b>Read:</b> 2 MB/s and 5 GetRecords tps, <b>shared</b> across consumers (unless enhanced fan-out).</li>
           <li>Exceed → <code>ProvisionedThroughputExceeded</code> throttling; retry with backoff.</li>
         </ul></div>`,
        `<h3>Anatomy of a record</h3>
         ${codeBlock('json', `{
  "PartitionKey": "<your key>",
  "Data": "<base64 payload>",
  "SequenceNumber": "4966...01",   // assigned by Kinesis, per shard
  "ApproximateArrivalTimestamp": 1699999999.1
}`)}
         <h3>Capacity math</h3>
         ${compareTable(['Dimension', 'Per-shard limit', 'To scale'], [
           ['Write throughput', '1 MB/s', 'add shards / on-demand'],
           ['Write record count', '1,000 rec/s', 'aggregate (KPL) or add shards'],
           ['Read throughput', '2 MB/s shared', 'enhanced fan-out (2 MB/s each)'],
         ])}
         <div class="lx-callout lx-warn"><b>Record count bites first.</b><div>Many small events hit the 1,000 rec/s cap long before 1 MB/s —
         KPL aggregation (Module 04) fixes this.</div></div>`,
        `<h3>Sizing for {ID}</h3>
         <p>Suppose the <b>{ENTITY}</b> stream peaks at 8,000 events/s averaging 500 bytes.
         Count limit: 8,000 ÷ 1,000 = <b>8 shards</b>; byte limit: 4 MB/s ÷ 1 MB/s = 4 shards.
         Count dominates → provision <b>≥ 8 shards</b> (plus headroom for a surge of {ENTITY} activity),
         or use on-demand and let AWS scale.</p>`,
        [
          { q: 'What is a shard and what are its limits?', a: 'A shard is the unit of capacity & ordering: <b>1 MB/s and 1,000 records/s write</b>, <b>2 MB/s read shared</b> across consumers. Throughput and ordering both scale by adding shards.' },
          { q: 'How does Kinesis guarantee ordering?', a: 'Ordering is guaranteed <b>within a shard</b>, by increasing sequence number. Across shards there is no global order — so you key related events (same <code>{KEY}</code>) to the same shard.' },
          { q: 'What happens when you exceed a shard\'s limit?', a: 'You get <code>ProvisionedThroughputExceeded</code> throttling on writes/reads. Handle with retries + backoff, aggregate records, add shards, or switch to on-demand.' },
          { q: 'Shard vs Kafka partition — same thing?', a: 'Conceptually yes: both are the key→bucket unit with per-bucket ordering and parallelism. Differences are the control surface (resharding vs add-partitions) and fixed capacity numbers.' },
        ]),
    },

    { id: 'aws03', num: '03', icon: '🧩', title: 'Shards & partition keys', idea: 'The partition key decides the shard — and your ordering and hot-shard risk.',
      tabs: T(
        `<h3>Partition key → shard</h3>
         <p>Kinesis MD5-hashes the partition key onto the shard's hash-key range. Same key → same shard →
         <b>ordering preserved per key</b>. Keying on <code>{KEY}</code> keeps each {ENTITY}'s events ordered;
         unrelated {ENTITY}s spread for parallelism.</p>
         <div class="lx-callout lx-warn"><b>Hot shards.</b><div>A skewed key (one very busy {ENTITY}) overloads its shard while others idle —
         the same hot-partition problem as Kafka.</div></div>`,
        `<h3>Resharding</h3>
         ${compareTable(['Operation', 'Effect', 'When'], [
           ['Split shard', 'one shard → two, more capacity', 'a shard is hot / near limits'],
           ['Merge shards', 'two adjacent → one, less capacity', 'over-provisioned, cut cost'],
         ])}
         <p>Resharding rewrites hash-key ranges; sequence numbers continue. On-demand mode reshards for you.</p>
         <div class="lx-callout lx-info"><b>Explicit hash key.</b><div>You can override routing with an <code>ExplicitHashKey</code> to place records
         deliberately — rarely needed, but useful for custom partitioning schemes.</div></div>`,
        `<h3>Choosing {KEY} for {ID}</h3>
         <p>Key on <code>{KEY}</code> so one {ENTITY}'s events stay ordered (essential for correct state).
         If a single {ENTITY} can go viral (a surge-priced ride / a flash-sale order), that key becomes a hot
         shard — mitigate with a composite key or by splitting the hot shard.</p>
         <p>Try the <b>real</b> hashing in the <b>Kafka → Partition Simulator</b> — the same key-skew dynamics apply.</p>`,
        [
          { q: 'How do you avoid hot shards?', a: 'Choose a high-cardinality, evenly-distributed key; add a composite suffix for naturally skewed keys; monitor per-shard metrics; and split the hot shard. Never key on something like a constant or a low-cardinality field.' },
          { q: 'Does resharding lose data or ordering?', a: 'No data loss — records keep their sequence numbers. During a split/merge, consumers must drain parent shards before children, which the KCL handles automatically.' },
          { q: 'Can you change the number of shards without downtime?', a: 'Yes — split/merge (or on-demand auto-scaling) happen online; producers keep writing. Plan around traffic because scaling isn\'t instantaneous.' },
        ]),
    },

    { id: 'aws04', num: '04', icon: '📤', title: 'Producers (KPL, SDK, agent)', idea: 'Batch and aggregate to use shard capacity efficiently.',
      tabs: T(
        `<h3>Ways to produce</h3>
         <ul class="clean">
           <li><b>AWS SDK</b> — <code>PutRecord</code> / <code>PutRecords</code> (batch up to 500 records / 5 MB).</li>
           <li><b>Kinesis Producer Library (KPL)</b> — batching + <b>record aggregation</b> (many user records into one Kinesis record).</li>
           <li><b>Kinesis Agent</b> — tails log files to a stream, no code.</li>
         </ul>
         <div class="lx-callout lx-info"><b>Aggregation beats the count limit.</b><div>The 1,000 rec/s cap bites before 1 MB/s for small events;
         KPL packs many {ENTITY} events into one record so you hit the byte limit instead.</div></div>`,
        `<h3>PutRecords partial failures</h3>
         <p><code>PutRecords</code> can <b>partially</b> succeed: the response has a <code>FailedRecordCount</code>
         and per-record error codes. You must <b>resend only the failed records</b> — otherwise you lose data.</p>
         ${codeBlock('python', `resp = client.put_records(StreamName=s, Records=batch)
if resp["FailedRecordCount"]:
    retry = [batch[i] for i,r in enumerate(resp["Records"]) if "ErrorCode" in r]
    # backoff + resend 'retry'`)}
         <div class="lx-callout lx-warn"><b>KPL ↔ KCL de-aggregation.</b><div>Aggregated records must be de-aggregated on read — the KCL does this
         automatically; raw consumers need the KPL de-aggregation library.</div></div>`,
        `<h3>Producing the {ENTITY} stream</h3>
         <p>High-volume {ENTITY} events (e.g. GPS pings / order events) use the <b>KPL</b> with aggregation +
         retries so a burst doesn't blow the 1,000 rec/s shard cap. Each record carries <code>{KEY}</code> as its
         partition key to preserve per-{ENTITY} order.</p>`,
        [
          { q: 'Why use the KPL instead of the plain SDK?', a: 'For high throughput: it <b>batches</b> and <b>aggregates</b> many user records into fewer Kinesis records (beating the 1,000 rec/s limit), handles retries, and collects metrics. The trade-off is added latency from buffering and a de-aggregation step on read.' },
          { q: 'How do you handle PutRecords partial failures?', a: 'Inspect <code>FailedRecordCount</code> and resend <b>only</b> the records with an <code>ErrorCode</code>, with exponential backoff. Resending the whole batch would duplicate the successful ones.' },
          { q: 'What delivery guarantee do producers get?', a: 'At-least-once: a retried PutRecord can create a duplicate. Downstream must be idempotent (dedupe by an event id) for effectively-once results.' },
        ]),
    },

    { id: 'aws05', num: '05', icon: '📥', title: 'Consumers & the KCL', idea: 'The KCL manages shard leases, checkpoints, and rebalancing for you.',
      tabs: T(
        `<h3>Reading a stream</h3>
         <p>The <b>Kinesis Client Library (KCL)</b> assigns shards to workers via <b>leases</b> (in a DynamoDB
         table), <b>checkpoints</b> progress per shard, and rebalances on worker/shard changes — the AWS analog
         of a Kafka consumer group.</p>
         <div class="lx-keypoints"><div class="lx-kp-h">Key points</div><ul class="clean">
           <li>One shard → one active KCL worker at a time (ordering).</li>
           <li>Checkpoints live per shard in DynamoDB — your committed position.</li>
           <li>Standard consumers share 2 MB/s read; use enhanced fan-out for dedicated throughput.</li>
         </ul></div>`,
        `<h3>Lease table & checkpoints</h3>
         ${compareTable(['KCL concept', 'Kafka analog', 'Stored in'], [
           ['Lease (shard ownership)', 'partition assignment', 'DynamoDB lease table'],
           ['Checkpoint', 'committed offset', 'DynamoDB lease table'],
           ['Worker', 'consumer in a group', '—'],
         ])}
         <div class="lx-callout lx-warn"><b>Checkpoint timing = delivery guarantee.</b><div>Checkpoint <i>after</i> successful processing for
         at-least-once; checkpointing before processing risks data loss (at-most-once).</div></div>`,
        `<h3>Consuming {ID}</h3>
         <p>A KCL app reads the <b>{ENTITY}</b> stream, scales workers to match shard count, and checkpoints after
         each {ENTITY} batch is safely processed. If a worker dies mid-batch, another takes the lease and resumes
         from the last checkpoint — no {ENTITY} events lost.</p>`,
        [
          { q: 'What does the KCL do for you?', a: 'Lease management (which worker owns which shard), load-balancing across workers, checkpointing to DynamoDB, handling shard splits/merges, and de-aggregating KPL records. It turns raw GetRecords into a consumer-group-like experience.' },
          { q: 'Why does the KCL need a DynamoDB table?', a: 'It stores <b>leases and checkpoints</b> there so multiple workers coordinate ownership and remember progress across restarts. Under-provisioning that table causes rebalancing/throttling problems.' },
          { q: 'How many workers should you run?', a: 'At most one active worker per shard processes a given shard, so workers ≤ shards for full parallelism; extra workers stand by for failover.' },
        ]),
    },

    { id: 'aws06', num: '06', icon: '📡', title: 'Sequence numbers, checkpoints & fan-out', idea: 'Every record has a sequence number; enhanced fan-out gives each consumer its own pipe.',
      tabs: T(
        `<h3>Sequence numbers</h3>
         <p>Each record gets a unique, increasing <b>sequence number</b> per shard — the Kinesis offset. Consumers
         checkpoint "processed up to N" and can replay from <code>AT_SEQUENCE_NUMBER</code>, <code>TRIM_HORIZON</code>
         (oldest), or <code>LATEST</code>.</p>`,
        `<h3>Shared vs enhanced fan-out</h3>
         ${compareTable(['', 'Shared (standard)', 'Enhanced fan-out (EFO)'], [
           ['Throughput', '2 MB/s shared by all consumers', '2 MB/s dedicated per consumer'],
           ['Delivery', 'poll (GetRecords)', 'push (SubscribeToShard)'],
           ['Latency', 'higher under contention', 'lower (~70 ms)'],
           ['Cost', 'included', 'extra per consumer-shard-hour'],
         ])}
         <div class="lx-callout lx-info"><b>When to use EFO.</b><div>Several independent consumers of the same high-throughput stream that each
         need low latency — otherwise they starve each other on the shared 2 MB/s.</div></div>`,
        `<h3>Fan-out for {ID}</h3>
         <p>If the <b>{ENTITY}</b> stream feeds three independent consumers (real-time dashboard, fraud scoring,
         warehouse loader), shared mode makes them compete for 2 MB/s per shard. Register each as an <b>EFO</b>
         consumer so each gets its own 2 MB/s and low latency.</p>`,
        [
          { q: 'What is a sequence number?', a: 'A unique, monotonically increasing id per record <b>within a shard</b> — Kinesis\'s equivalent of a Kafka offset. Consumers checkpoint it and can replay from it.' },
          { q: 'Shared throughput vs enhanced fan-out?', a: 'Shared: all consumers split 2 MB/s per shard via polling. EFO: each registered consumer gets a <b>dedicated 2 MB/s per shard</b> with push delivery and lower latency, at extra cost.' },
          { q: 'How do you replay data?', a: 'Reset the consumer\'s starting position to a sequence number or <code>TRIM_HORIZON</code> (within retention), and reprocess. This is why extended retention matters for backfills and bug recovery.' },
        ]),
    },

    { id: 'aws07', num: '07', icon: '⚙️', title: 'Retention, capacity modes & scaling', idea: 'On-demand auto-scales; provisioned gives shard control; retention up to 365 days.',
      tabs: T(
        `<h3>Retention</h3>
         <p>Default <b>24 hours</b>, extendable to <b>365 days</b> (8,760 h). Longer retention enables replay &
         reprocessing but costs more beyond 24 h.</p>
         <h3>Capacity modes</h3>
         <ul class="clean">
           <li><b>Provisioned:</b> you set shard count; pay per shard-hour + PUT payload units. Cheapest at steady scale.</li>
           <li><b>On-demand:</b> Kinesis auto-scales with traffic; pay per throughput. Best for spiky/unknown load.</li>
         </ul>`,
        `<h3>Choosing a mode</h3>
         ${compareTable(['Situation', 'Mode'], [
           ['Predictable, steady, cost-sensitive', 'Provisioned (right-size shards)'],
           ['Spiky, unknown, or new workload', 'On-demand'],
           ['Need replay / backfill', 'extend retention (up to 365 d)'],
         ])}
         <div class="lx-callout lx-warn"><b>Scaling isn\'t instant.</b><div>Resharding and on-demand scale-ups take time; keep headroom for bursts
         rather than assuming instant elasticity.</div></div>`,
        `<h3>Retention for {ID}</h3>
         <p>Keep the <b>{ENTITY}</b> stream at 24 h for normal ops, but extend to 7 days before a risky deploy so you
         can replay {ENTITY} events if the new consumer logic is wrong. Use on-demand for an unpredictable launch,
         then switch to provisioned once the traffic shape is known to cut cost.</p>`,
        [
          { q: 'What is the max retention and why extend it?', a: 'Up to <b>365 days</b> (default 24 h). Extend it to enable <b>replay</b> — reprocessing after a bug fix, backfilling a new consumer, or recovering from a bad deploy. It costs more beyond 24 h.' },
          { q: 'Provisioned vs on-demand — how to choose?', a: 'Provisioned when load is predictable and you want the lowest cost (you manage shard count). On-demand when traffic is spiky/unknown — AWS scales capacity automatically, at a higher per-throughput price.' },
          { q: 'Is on-demand scaling instantaneous?', a: 'No — it adapts quickly but not instantly, and very sharp spikes can still throttle briefly. Design producer retries and some headroom.' },
        ]),
    },

    { id: 'aws08', num: '08', icon: '📨', title: 'Amazon MSK — managed Kafka', idea: 'Real Apache Kafka, managed: full API, Connect, and Schema Registry.',
      tabs: T(
        `<h3>What MSK is</h3>
         <p>MSK runs <b>actual Apache Kafka</b> brokers for you (patching, storage, monitoring). Real Kafka protocol,
         so Kafka clients, <b>Connect</b>, <b>MirrorMaker 2</b>, and the <b>Glue Schema Registry</b> work. Everything
         in the lab's Kafka section applies directly.</p>`,
        `<h3>Provisioned vs Serverless</h3>
         ${compareTable(['', 'Provisioned', 'Serverless'], [
           ['Sizing', 'you pick broker type/count', 'no capacity management'],
           ['Scaling', 'manual / storage autoscaling', 'automatic'],
           ['Pricing', 'broker-hours + storage', 'throughput + partition-hours'],
           ['Best for', 'steady, tuned workloads', 'variable/unknown load'],
         ])}
         <div class="lx-callout lx-info"><b>Partitions still matter on Serverless.</b><div>Throughput is enforced per partition, so topics need enough
         partitions to reach the capacity you want.</div></div>`,
        `<h3>{ID} on MSK</h3>
         <p>If the team already runs Kafka apps for the <b>{ENTITY}</b> pipeline, MSK lets them lift-and-shift: same
         topics keyed on <code>{KEY}</code>, same Connect sinks, same Schema Registry — AWS just operates the brokers.</p>`,
        [
          { q: 'Why pick MSK over Kinesis?', a: 'You need the <b>Kafka API/ecosystem</b> (Connect, Streams, Schema Registry, transactions/exactly-once), portability/multi-cloud parity, or you\'re migrating existing Kafka apps. MSK gives real Kafka without managing brokers.' },
          { q: 'Provisioned vs Serverless MSK?', a: 'Provisioned = you size and tune brokers (max control, steady cost). Serverless = no capacity management, pay per throughput + partition-hours (great for variable load). Both still require enough partitions.' },
          { q: 'Does MSK support exactly-once?', a: 'It\'s real Kafka, so Kafka transactions / idempotent producers are available for effectively-once <i>within Kafka</i>. End-to-end still needs a cooperating sink.' },
        ]),
    },

    { id: 'aws09', num: '09', icon: '⚖️', title: 'MSK vs Kinesis — choosing', idea: 'Kafka API & ecosystem → MSK; least-ops AWS-native → Kinesis.',
      tabs: T(
        `<h3>Two good options</h3>
         <p>Both are durable, partitioned logs with per-key ordering and replay. The choice is about <b>ecosystem,
         control, and operations</b>, not raw capability.</p>`,
        `<h3>Head to head</h3>
         ${compareTable(['Dimension', 'Kinesis Data Streams', 'Amazon MSK'], [
           ['Unit of parallelism', 'shard', 'partition'],
           ['API', 'AWS Kinesis API', 'Apache Kafka'],
           ['Ecosystem', 'KCL, Firehose, Lambda', 'Connect, Streams, Schema Registry, MM2'],
           ['Ops', 'lowest (fully managed)', 'low (brokers managed, you tune)'],
           ['Exactly-once', 'via idempotent sinks', 'Kafka transactions available'],
           ['Portability', 'AWS-only', 'portable Kafka'],
         ])}`,
        `<h3>Deciding for {ID}</h3>
         <p>Greenfield, AWS-only, want minimal ops for the <b>{ENTITY}</b> pipeline → <b>Kinesis</b>.
         Existing Kafka skills/tooling, need Connect/Schema Registry/transactions, or want to avoid lock-in → <b>MSK</b>.</p>`,
        [
          { q: 'Give a one-line decision rule.', a: 'Need the <b>Kafka API/ecosystem or portability</b> → MSK. Want <b>least-ops, AWS-native</b> streaming → Kinesis.' },
          { q: 'Is shard the same as partition?', a: 'Same concept (key→bucket, per-bucket order & parallelism); different control surface and fixed limits. Shard = Kinesis, partition = Kafka/MSK.' },
          { q: 'Which is cheaper?', a: 'It depends on shape. Kinesis provisioned is cheap at steady moderate scale; MSK can be more cost-effective at very high sustained throughput; Serverless options trade cost for zero capacity management. Always model against current pricing.' },
        ]),
    },

    { id: 'aws10', num: '10', icon: '🌀', title: 'Managed Service for Apache Flink', idea: 'Run real Flink jobs managed — windows, state, checkpoints, exactly-once.',
      tabs: T(
        `<h3>Managed Flink on AWS</h3>
         <p>Formerly <b>Kinesis Data Analytics for Apache Flink</b>, it runs standard Apache Flink apps with managed
         scaling, checkpointing to durable storage, and automatic recovery. The lab's <b>Flink</b> section —
         watermarks, windows, keyed state, savepoints — applies directly; AWS operates the cluster.</p>`,
        `<h3>What AWS manages vs you</h3>
         ${compareTable(['AWS manages', 'You control'], [
           ['Cluster provisioning & scaling (KPUs)', 'app code & operator parallelism'],
           ['Checkpoint/snapshot storage', 'checkpoint interval'],
           ['Failure recovery', 'sources, sinks, state design'],
         ])}
         <div class="lx-callout lx-info"><b>Snapshots = savepoints.</b><div>Take a snapshot to upgrade app code without losing state — exactly the
         savepoint workflow from the Flink section.</div></div>`,
        `<h3>Processing {ID}</h3>
         <p>A Managed Flink app reads the <b>{ENTITY}</b> stream, keys by <code>{KEY}</code>, maintains windowed
         state (e.g. 5-minute counts / fraud features per {ENTITY}), checkpoints every 60 s, and writes results to a
         sink — recovering exactly where it left off after any failure.</p>`,
        [
          { q: 'What is Managed Service for Apache Flink?', a: 'A managed runtime for <b>real Apache Flink</b> applications on AWS (formerly Kinesis Data Analytics). You bring the Flink job; AWS runs, scales, checkpoints, and recovers it.' },
          { q: 'How does it recover state after a failure?', a: 'Via Flink <b>checkpoints</b> — a consistent snapshot of keyed state + source offsets. On failure it restores the latest checkpoint and resumes, so no state is lost and no data is reprocessed incorrectly.' },
          { q: 'How do you upgrade an app without losing state?', a: 'Take a <b>snapshot</b> (savepoint), deploy the new code, and restore from the snapshot — the same portable-state workflow Flink uses for upgrades.' },
        ]),
    },

    { id: 'aws11', num: '11', icon: '🔧', title: 'Building a Flink app on AWS', idea: 'Package a Flink job, point it at a source/sink, tune parallelism per operator.',
      tabs: T(
        `<h3>Shape of an app</h3>
         <p>Read from a source → key by <code>{KEY}</code> → window/aggregate with state → write to a sink.
         You control parallelism; AWS manages the runtime.</p>
         <div class="lx-callout lx-warn"><b>Parallelism per operator.</b><div>As the Flink Performance module teaches, set parallelism where the
         work is (the hot operator), not globally.</div></div>`,
        `<h3>PyFlink sketch</h3>
         ${codeBlock('python', `env = StreamExecutionEnvironment.get_execution_environment()
env.enable_checkpointing(60000)          # checkpoint every 60s
# source: Kinesis/MSK
# .key_by(lambda e: e["{KEY}"])
# .window(TumblingEventTimeWindows.of(Time.minutes(5)))
# .aggregate(...)
# sink: Firehose / S3 / OpenSearch`)}
         <p>Watermarks come from the source's event-time assigner; windows fire as watermarks pass their end
         (Foundations Modules 07–08).</p>`,
        `<h3>{ID} job</h3>
         <p>For the <b>{ENTITY}</b> pipeline: key by <code>{KEY}</code>, 5-minute tumbling windows of {ENTITY} counts,
         a stateful fraud feature per {ENTITY}, output to Firehose → S3 and a serving store. KPUs scale with load.</p>`,
        [
          { q: 'How do you size a Managed Flink app?', a: 'By <b>KPUs</b> (compute units) and by setting <b>operator parallelism</b> at the bottleneck. Watch the busy/backpressure metrics and scale the hot operator rather than inflating everything globally.' },
          { q: 'How often should you checkpoint?', a: 'Often enough that recovery is fast and reprocessing is small, but not so often that checkpoint overhead hurts throughput — commonly tens of seconds. It\'s a recovery-time vs overhead trade-off.' },
          { q: 'Where do watermarks come from?', a: 'From the source\'s event-time/watermark strategy (e.g. bounded-out-of-orderness on the {ENTITY} event timestamp). They drive when windows fire and what counts as late.' },
        ]),
    },

    { id: 'aws12', num: '12', icon: '🚿', title: 'Amazon Data Firehose', idea: 'No-code, near-real-time delivery to S3/Redshift/OpenSearch with buffering & transforms.',
      tabs: T(
        `<h3>Delivery, not processing</h3>
         <p>Firehose reliably <b>delivers</b> streaming data to S3, Redshift, OpenSearch, Splunk, and HTTP endpoints
         with <b>no code</b>. It's <b>near-real-time</b>: it <b>buffers</b> by size and time (whichever trips first),
         so expect seconds-to-minutes latency, not sub-second.</p>`,
        `<h3>What Firehose can do inline</h3>
         ${compareTable(['Feature', 'What it does'], [
           ['Buffering', 'size (MB) + interval (s); first to trip flushes'],
           ['Lambda transform', 'mutate/enrich/filter records in flight'],
           ['Format conversion', 'JSON → Parquet/ORC for cheap query'],
           ['Dynamic partitioning', 'route to S3 prefixes by field (e.g. by {KEY})'],
           ['Backup + retry', 'raw/failed records to a backup S3 bucket'],
         ])}
         ${flowDiagram(['Kinesis / direct PUT', 'Firehose (buffer + transform)', 'S3 / Redshift / OpenSearch'])}`,
        `<h3>Landing {ID}</h3>
         <p>Firehose reads processed <b>{ENTITY}</b> results, converts to <b>Parquet</b>, dynamically partitions by
         date (and maybe {KEY} prefix), and writes to S3 for Athena/Redshift — the analytics side of the {ENTITY}
         platform, with zero consumer code to maintain.</p>`,
        [
          { q: 'Firehose vs Kinesis Data Streams?', a: 'Streams is a <b>replayable log</b> you process with consumers; Firehose is a one-way <b>delivery</b> pipe to storage/analytics with buffering and no replay. Commonly chained: Streams → process → Firehose → S3.' },
          { q: 'Why is Firehose "near-real-time"?', a: 'It <b>buffers</b> records by size and time before writing, so delivery lands in seconds-to-minutes, not sub-second. Tune the buffer to trade latency vs object size/cost.' },
          { q: 'How do you avoid the small-files problem?', a: 'Increase the buffer size/interval so S3 objects are a sensible size, enable format conversion/compaction, or compact later — many tiny objects are slow and costly to query.' },
        ]),
    },

    { id: 'aws13', num: '13', icon: 'λ', title: 'Lambda consumers & event-source mappings', idea: 'Serverless processing per batch, with tunable batching, parallelism, and failure handling.',
      tabs: T(
        `<h3>Event-source mapping (ESM)</h3>
         <p>An ESM polls a Kinesis/MSK stream and invokes your Lambda with batches of records. It manages polling,
         batching, and checkpointing — you just write the handler.</p>`,
        `<h3>Validated parameters (Kinesis)</h3>
         ${compareTable(['Parameter', 'Default', 'Range / effect'], [
           ['Batch size', '100', 'up to 10,000 records'],
           ['Parallelization factor', '1', '1–10 concurrent batches per shard'],
           ['Maximum retry attempts', '-1 (infinite)', '0–10,000 (finite)'],
           ['Bisect batch on error', 'off', 'split failing batch in two & retry'],
           ['On-failure destination', '—', 'SQS/SNS for failed-batch metadata'],
         ])}
         <div class="lx-callout lx-warn"><b>Stalled shards.</b><div>With infinite retries, one poison record blocks its shard forever. Limit retries,
         bisect, or route failures to a DLQ so the {ENTITY} stream keeps flowing.</div></div>`,
        `<h3>{ID} with Lambda</h3>
         <p>For lightweight per-{ENTITY} logic (enrich + write to DynamoDB), a Lambda ESM on the {ENTITY} stream with
         batch size 100 and parallelization factor 4 processes shards concurrently, bisecting on error and sending
         poison {ENTITY} records to an SQS DLQ.</p>`,
        [
          { q: 'What does parallelization factor do?', a: 'Lets Lambda process up to <b>10 concurrent batches per shard</b> (default 1) while preserving per-partition-key order within each sub-batch — more throughput without adding shards.' },
          { q: 'How do you stop one bad record blocking a shard?', a: 'Limit <b>maximum retry attempts</b> (default is infinite), enable <b>bisect batch on error</b> to isolate the poison record, and configure an <b>on-failure destination</b> (SQS/SNS DLQ).' },
          { q: 'What delivery semantics does a Lambda ESM give?', a: 'At-least-once — a batch can be retried, so records may be reprocessed. Make the handler idempotent for effectively-once effects.' },
        ]),
    },

    { id: 'aws14', num: '14', icon: '🪣', title: 'S3 & the streaming data lake', idea: 'Land events in S3, partitioned for cheap query — the bridge from streaming to analytics.',
      tabs: T(
        `<h3>Streaming into a lake</h3>
         <p>Firehose (or a Flink sink) writes events to <b>S3</b>, partitioned by time
         (<code>year/month/day/hour</code>) and often as <b>Parquet</b> for columnar query by Athena, Redshift
         Spectrum, or EMR — the "warehouse" sink of the reference architecture.</p>`,
        `<h3>Lake layout & formats</h3>
         ${compareTable(['Choice', 'Why'], [
           ['Partition by time (y/m/d/h)', 'prune scans → faster, cheaper Athena queries'],
           ['Parquet/ORC (columnar)', 'compression + column pruning'],
           ['Right-sized objects', 'avoid the small-files penalty'],
           ['Iceberg / Delta table format', 'ACID, schema evolution, time-travel'],
         ])}
         <div class="lx-callout lx-warn"><b>Small-files problem.</b><div>Too-frequent flushes create many tiny objects, slow and costly to query.
         Tune Firehose buffering or compact.</div></div>`,
        `<h3>{ID} lake</h3>
         <p>{ENTITY} events land as Parquet in <code>s3://.../{ENTITY}/yyyy/mm/dd/hh/</code>. Analysts query recent
         {ENTITY} activity with Athena; data scientists train on the full history — all from the same durable lake the
         streaming path feeds.</p>`,
        [
          { q: 'Why partition and use Parquet in the lake?', a: 'Time-partitioning lets query engines <b>prune</b> irrelevant data; Parquet\'s columnar layout adds compression and column pruning. Together they cut Athena/Redshift scan cost and latency dramatically.' },
          { q: 'What is the small-files problem?', a: 'Many tiny S3 objects (from over-frequent flushes) make listing and querying slow and expensive. Fix with larger Firehose buffers, compaction, or an open table format that compacts.' },
          { q: 'Why add Iceberg/Delta on top of S3?', a: 'They bring <b>ACID transactions, schema evolution, and time-travel</b> to the lake — turning a pile of files into a reliable table (the lakehouse direction, covered in Databricks).' },
        ]),
    },

    { id: 'aws15', num: '15', icon: '📋', title: 'Schema management', idea: 'A schema registry keeps producers and consumers compatible as events evolve.',
      tabs: T(
        `<h3>Why schemas</h3>
         <p>Events outlive the code that wrote them. A <b>schema registry</b> (AWS <b>Glue Schema Registry</b>, or
         Confluent with MSK) validates events against a registered schema and enforces <b>compatibility</b> so a
         producer change can't silently break consumers.</p>`,
        `<h3>Compatibility modes</h3>
         ${compareTable(['Mode', 'Meaning', 'Safe change'], [
           ['Backward', 'new consumers read old data', 'add optional field / remove field'],
           ['Forward', 'old consumers read new data', 'add field / remove optional'],
           ['Full', 'both directions', 'add/remove optional fields only'],
         ])}
         <div class="lx-callout lx-info"><b>Wire format.</b><div>The payload carries a small <b>schema id</b>, not the whole schema — consumers
         fetch & cache the schema from the registry.</div></div>`,
        `<h3>Evolving the {ENTITY} event</h3>
         <p>Adding a new optional field to the <b>{ENTITY}</b> event (e.g. a device version) under <b>backward</b>
         compatibility lets you deploy producers first; existing consumers keep working, then upgrade on their own
         schedule — no coordinated big-bang release.</p>`,
        [
          { q: 'What problem does a schema registry solve?', a: 'It prevents a producer change from silently breaking downstream consumers by <b>enforcing compatibility</b> and giving one source of truth for event shapes as they evolve.' },
          { q: 'Backward vs forward compatibility?', a: 'Backward = new consumer reads old data (upgrade consumers freely). Forward = old consumer reads new data (upgrade producers freely). Full = both. The mode dictates what schema changes are allowed.' },
          { q: 'Does the whole schema travel with each event?', a: 'No — only a compact <b>schema id</b>. Consumers resolve and cache the actual schema from the registry, keeping payloads small.' },
        ]),
    },

    { id: 'aws16', num: '16', icon: '🔐', title: 'Security', idea: 'Encrypt in transit and at rest; authorize with IAM; isolate with VPC.',
      tabs: T(
        `<h3>The layers</h3>
         <ul class="clean">
           <li><b>In transit:</b> TLS to Kinesis/MSK endpoints.</li>
           <li><b>At rest:</b> KMS-managed keys (Kinesis SSE; MSK storage encryption).</li>
           <li><b>AuthN/Z:</b> IAM for Kinesis/Firehose/Lambda; MSK supports IAM access control, SASL/SCRAM, mTLS + Kafka ACLs.</li>
           <li><b>Network:</b> run in a VPC; VPC endpoints keep traffic off the public internet.</li>
         </ul>`,
        `<h3>Least-privilege examples</h3>
         ${compareTable(['Role', 'Allowed actions'], [
           ['Producer', 'kinesis:PutRecord(s) on one stream'],
           ['KCL consumer', 'kinesis:GetRecords/… + dynamodb on its lease table'],
           ['Firehose', 'write to the target bucket + KMS decrypt'],
         ])}
         <div class="lx-callout lx-info"><b>Don\'t share one broad role.</b><div>Scope each component to exactly what it needs on exactly the resources
         it touches.</div></div>`,
        `<h3>Securing {ID}</h3>
         <p>{ENTITY} events can carry PII — encrypt the stream with a customer-managed KMS key, give producers a
         Put-only role, give the fraud consumer read+checkpoint, and run everything in a VPC with endpoints so {ENTITY}
         data never traverses the public internet.</p>`,
        [
          { q: 'How do you secure data in transit and at rest on Kinesis?', a: 'TLS to the endpoint for transit; server-side encryption with a <b>KMS key</b> for rest. Use a customer-managed key when you need key rotation/audit control.' },
          { q: 'How is MSK access controlled?', a: 'Via <b>IAM access control</b>, SASL/SCRAM, or mTLS, combined with <b>Kafka ACLs</b> on topics/groups — so you authenticate the client and authorize specific topic operations.' },
          { q: 'Why run streaming in a VPC with endpoints?', a: 'To keep traffic <b>off the public internet</b>, reduce attack surface, and meet compliance — VPC endpoints give private connectivity to Kinesis/MSK.' },
        ]),
    },

    { id: 'aws17', num: '17', icon: '📊', title: 'Observability with CloudWatch', idea: 'Watch iterator age, throttles, and throughput — rising lag is your first alarm.',
      tabs: T(
        `<h3>The signals</h3>
         <ul class="clean">
           <li><b>GetRecords.IteratorAgeMilliseconds</b> — Kinesis's lag metric: how old the records a consumer reads are. Rising = falling behind. <b>Alarm first.</b></li>
           <li><b>Write/ReadProvisionedThroughputExceeded</b> — shard throttling.</li>
           <li><b>IncomingRecords / IncomingBytes</b> — throughput in.</li>
           <li><b>MSK:</b> consumer lag, under-replicated partitions, broker CPU/disk.</li>
           <li><b>Lambda:</b> iterator age, errors, throttles, concurrency.</li>
         </ul>`,
        `<h3>What to alarm on</h3>
         ${compareTable(['Metric', 'Meaning', 'Action'], [
           ['IteratorAge rising', 'consumer falling behind', 'scale consumers / EFO / fix slow code'],
           ['ThroughputExceeded > 0', 'shard throttling', 'add shards / aggregate / on-demand'],
           ['Flink checkpoint failures', 'bad recoveries ahead', 'investigate state/backpressure'],
         ])}
         <div class="lx-callout lx-warn"><b>Per-shard, not just aggregate.</b><div>One hot shard can be far behind while the stream average looks fine.</div></div>`,
        `<h3>Watching {ID}</h3>
         <p>Alarm on {ENTITY}-stream <b>iterator age</b> (> a few minutes) and any throttling. During a surge of
         {ENTITY} activity these catch trouble before users feel it — long before a dashboard goes stale.</p>`,
        [
          { q: 'What is the single most important Kinesis health metric?', a: '<b>GetRecords.IteratorAgeMilliseconds</b> — consumer lag. If it climbs, consumers aren\'t keeping up; it\'s the earliest, clearest warning of trouble.' },
          { q: 'How do you detect and fix throttling?', a: 'Watch <code>*ProvisionedThroughputExceeded</code>. Fix by adding shards, aggregating records (KPL), switching to on-demand, or using EFO to relieve read contention.' },
          { q: 'Why monitor per-shard, not just the stream aggregate?', a: 'Skew: a single hot shard can be badly behind while the average looks healthy. Per-shard alarms catch hot-key problems the aggregate hides.' },
        ]),
    },

    { id: 'aws18', num: '18', icon: '🛟', title: 'Failure handling & recovery', idea: 'Retries, DLQs, idempotency, and replay keep the pipeline correct under failure.',
      tabs: T(
        `<h3>Patterns on AWS</h3>
         <ul class="clean">
           <li><b>Throttling:</b> retry with backoff; scale shards / on-demand.</li>
           <li><b>Poison records:</b> bisect-on-error + on-failure DLQ (SQS/SNS) for Lambda.</li>
           <li><b>Idempotent sinks:</b> upsert by {KEY} so duplicates don't corrupt.</li>
           <li><b>Replay:</b> rewind KCL checkpoints / use retention to reprocess after a fix.</li>
           <li><b>Flink recovery:</b> checkpoints restore state + positions automatically.</li>
         </ul>`,
        `<h3>Failure → response</h3>
         ${compareTable(['Failure', 'Response'], [
           ['Transient throttle', 'retry + backoff; scale'],
           ['Poison record', 'bisect + DLQ; keep shard flowing'],
           ['Bad deploy', 'replay from retention after fix'],
           ['Worker/app crash', 'KCL lease failover / Flink checkpoint restore'],
         ])}`,
        `<h3>Recovering {ID}</h3>
         <p>If a bad consumer release double-counts {ENTITY} events, stop it, deploy the fix, and <b>replay</b> the
         {ENTITY} stream from retention — safe because the sink upserts by <code>{KEY}</code> (idempotent), so
         reprocessing converges to the correct state.</p>`,
        [
          { q: 'How do you make at-least-once safe?', a: 'Make sinks <b>idempotent</b> — e.g. upsert keyed by an event id / {KEY} — so duplicate deliveries don\'t change the result. This turns cheap at-least-once into effectively-once for most workloads.' },
          { q: 'How do you recover from a bad deploy?', a: 'Fix the code, then <b>replay</b> from retention (reset KCL checkpoints / Kinesis start position) to reprocess affected events. Extended retention exists precisely for this.' },
          { q: 'How does Flink recover without data loss?', a: 'From the last <b>checkpoint</b> (state + source offsets), it restores state and resumes reading from those offsets — no loss, no incorrect reprocessing.' },
        ]),
    },

    { id: 'aws19', num: '19', icon: '💵', title: 'Cost model', idea: 'Know what you pay for — shards/throughput, PUT units, retention, EFO, egress.',
      tabs: T(
        `<h3>Where the money goes</h3>
         <ul class="clean">
           <li><b>Kinesis provisioned:</b> per shard-hour + per million PUT payload units (25 KB each) + extended retention + EFO.</li>
           <li><b>Kinesis on-demand:</b> per GB in/out + per-stream hour — simpler, pricier at steady high load.</li>
           <li><b>MSK:</b> broker-hours + storage (Provisioned) or throughput + partition-hours (Serverless).</li>
           <li><b>Firehose:</b> per GB ingested (+ conversion / dynamic partitioning).</li>
           <li><b>Managed Flink:</b> per KPU-hour + running storage.</li>
         </ul>`,
        `<h3>Cost levers</h3>
         ${compareTable(['Lever', 'Effect'], [
           ['Right-size shards / mode', 'avoid paying for idle capacity'],
           ['Aggregate small records (KPL)', 'fewer PUT payload units'],
           ['Avoid EFO unless needed', 'no per-consumer-shard charge'],
           ['Trim retention', 'pay only for replay you need'],
         ])}
         <div class="lx-callout lx-info"><b>Numbers drift.</b><div>Always price against the current AWS calculator; the <i>shape</i> of the model is
         what to reason about.</div></div>`,
        `<h3>Costing {ID}</h3>
         <p>For a steady {ENTITY} stream, provisioned shards + KPL aggregation is usually cheapest; reserve EFO for the
         one latency-critical consumer; keep retention at 24 h except around risky {ENTITY}-pipeline deploys.</p>`,
        [
          { q: 'What drives Kinesis cost in provisioned mode?', a: 'Primarily <b>shard-hours</b> and <b>PUT payload units</b> (25 KB each), plus extended retention and enhanced fan-out. Aggregation reduces PUT units; right-sizing shards reduces shard-hours.' },
          { q: 'When is on-demand worth the premium?', a: 'For spiky or unknown traffic where right-sizing shards is hard — you trade a higher per-throughput price for zero capacity management and no throttling from under-provisioning.' },
          { q: 'Name two quick cost wins.', a: 'KPL <b>aggregation</b> (fewer PUT units) and dropping <b>enhanced fan-out</b> where a consumer doesn\'t need dedicated low-latency throughput. Trimming retention also helps.' },
        ]),
    },

    { id: 'aws20', num: '20', icon: '🏗️', title: 'End-to-end reference architecture', idea: 'Sources → Kinesis/MSK → Flink/Lambda → Firehose → S3, observed throughout.',
      tabs: T(
        `<h3>The canonical AWS shape</h3>
         <div id="aws20-pipeline"></div>
         <ol class="clean">
           <li><b>Ingest:</b> {ENTITY} apps/devices → Kinesis (or MSK), keyed on <code>{KEY}</code>.</li>
           <li><b>Process:</b> Managed Flink for windowing/joins/state; Lambda for lightweight per-record logic.</li>
           <li><b>Deliver:</b> Firehose → S3 (Parquet, time-partitioned) for Athena/Redshift; DynamoDB/OpenSearch for live lookups.</li>
           <li><b>Observe:</b> CloudWatch on iterator age, throttles, checkpoint health.</li>
         </ol>`,
        `<h3>Dual-path (speed + batch)</h3>
         ${compareTable(['Path', 'Services', 'Latency'], [
           ['Speed layer', 'Kinesis → Flink/Lambda → serving store', 'seconds'],
           ['Batch/lake layer', 'Kinesis → Firehose → S3 → Athena', 'minutes+'],
         ])}
         <div class="lx-callout lx-ok"><b>Same backbone.</b><div>This is the Foundations reference architecture in AWS services. Azure and
         Databricks implement the same shape differently.</div></div>`,
        `<h3>The {ID} platform</h3>
         <p>End to end: {ENTITY} events → Kinesis (keyed on {KEY}) → Managed Flink (windowed features) →
         serving store for live {ENTITY} decisions, with Firehose → S3 feeding analytics and model training.
         CloudWatch alarms on iterator age keep it healthy.</p>`,
        [
          { q: 'Walk through an end-to-end AWS streaming architecture.', a: 'Producers → <b>Kinesis/MSK</b> (keyed log) → <b>Managed Flink/Lambda</b> (stateful processing) → <b>serving store</b> (DynamoDB/OpenSearch) for live answers and <b>Firehose → S3</b> for the analytics lake, with <b>CloudWatch</b> observability throughout.' },
          { q: 'Why have both a speed layer and a lake layer?', a: 'The speed layer gives low-latency answers for live decisions; the lake layer gives cheap, replayable history for analytics and ML. Firehose → S3 feeds the lake while Flink/Lambda serve the speed path.' },
          { q: 'How is this the same as the vendor-neutral architecture?', a: 'Identical backbone — sources → log → stateful processing → sinks, observed — just realized in AWS services (Kinesis/MSK, Flink/Lambda, Firehose/S3, CloudWatch).' },
        ]),
    },
  ],
};
