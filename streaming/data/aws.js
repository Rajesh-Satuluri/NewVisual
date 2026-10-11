// AWS streaming curriculum (I39–I43). Facts validated I38 against official AWS
// docs (see docs/technical-accuracy-review.md §5). Numbers that can drift are
// stated qualitatively; stable shard/retention/Lambda figures are given exactly.
// Scenario tokens {ENTITY}/{KEY}/{ID} filled from the active scenario.

export const AWS = {
  id: 'aws', name: 'AWS', icon: '☁️', accent: '#FF9900',
  blurb: 'Streaming on AWS — Kinesis Data Streams, MSK, Managed Service for Apache Flink, Firehose and Lambda, validated against official AWS docs.',
  modules: [
    { id: 'aws01', num: '01', icon: '🗺️', title: 'AWS streaming landscape', idea: 'Four services cover ingestion → processing → delivery; pick by ordering, latency, and tooling needs.',
      tabs: [{ id: 'why', label: '📖 Overview', body: `
        <h3>The AWS streaming toolbox</h3>
        <ul class="clean">
          <li><b>Kinesis Data Streams (KDS)</b> — AWS-native, shard-based durable log. Low ops, AWS-centric.</li>
          <li><b>Amazon MSK</b> — fully managed Apache Kafka (Provisioned or Serverless). Full Kafka API & ecosystem.</li>
          <li><b>Managed Service for Apache Flink</b> — managed Flink for stateful stream processing (formerly Kinesis Data Analytics).</li>
          <li><b>Amazon Data Firehose</b> — near-real-time <i>delivery</i> to S3/Redshift/OpenSearch/Splunk, no code.</li>
          <li><b>AWS Lambda</b> — serverless consumers via event-source mappings.</li>
        </ul>
        <div class="lx-callout lx-info"><b>Mental model.</b><div>KDS/MSK are the <i>log</i> (Foundations Module 03); Flink/Lambda are the
        <i>processing</i>; Firehose + S3 are a <i>sink</i>. It's the same backbone you learned, with AWS names.</div></div>` },
      { id: 'pick', label: '🧭 Which to use', body: `
        <h3>Choosing</h3>
        <ul class="clean">
          <li><b>Want least ops, AWS-only, moderate scale?</b> → Kinesis Data Streams.</li>
          <li><b>Need the Kafka API, Connect, Schema Registry, or portability?</b> → Amazon MSK.</li>
          <li><b>Just land raw/transformed data in S3 with no code?</b> → Firehose.</li>
          <li><b>Rich stateful processing (windows, joins, CEP)?</b> → Managed Service for Apache Flink.</li>
        </ul>` }] },

    { id: 'aws02', num: '02', icon: '🌊', title: 'Kinesis Data Streams fundamentals', idea: 'A Kinesis stream is a durable, ordered log split into shards.',
      tabs: [{ id: 'why', label: '📖 What & Why', body: `
        <h3>The model</h3>
        <p>A <b>stream</b> is made of <b>shards</b>. Producers <code>PutRecord(s)</code> with a
        <b>partition key</b>; Kinesis hashes it to a shard. Consumers read records in order per
        shard. It is the AWS equivalent of a Kafka topic (shard ≈ partition).</p>
        <div class="lx-keypoints"><div class="lx-kp-h">Validated capacity (per shard)</div><ul class="clean">
          <li><b>Write:</b> 1 MB/s <i>and</i> 1,000 records/s (byte limit includes the partition key).</li>
          <li><b>Read:</b> 2 MB/s and 5 GetRecords transactions/s, <b>shared</b> across consumers.</li>
          <li>Exceed these → <code>ProvisionedThroughputExceeded</code> throttling; handle with retries.</li>
        </ul></div>
        <p>In the active scenario, each {ENTITY} event (keyed on <code>{KEY}</code>) routes to a shard
        by partition-key hash, exactly like Kafka's partitioner.</p>` }] },

    { id: 'aws03', num: '03', icon: '🧩', title: 'Shards & partition keys', idea: 'The partition key decides the shard — and determines ordering and hot-shard risk.',
      tabs: [{ id: 'why', label: '📖 What & Why', body: `
        <h3>Partition key → shard</h3>
        <p>Kinesis applies an MD5 hash to the partition key to map it onto the shard's hash-key range.
        Same key → same shard → <b>ordering preserved per key</b>. Keying on <code>{KEY}</code> keeps
        each {ENTITY}'s events ordered; unrelated {ENTITY}s spread for parallelism.</p>
        <div class="lx-callout lx-warn"><b>Hot shards.</b><div>A skewed key (one very busy {ENTITY}) overloads its shard while others
        idle — the same hot-partition problem as Kafka. Try the real routing in the <b>Kafka → Partition Simulator</b>.</div></div>
        <h3>Resharding</h3>
        <p>Scale by <b>splitting</b> a shard (more capacity) or <b>merging</b> two (less). Resharding
        changes hash-key ranges, so plan it around traffic patterns.</p>` }] },

    { id: 'aws04', num: '04', icon: '📤', title: 'Producers (KPL, SDK, agent)', idea: 'Batch and aggregate to use shard capacity efficiently.',
      tabs: [{ id: 'why', label: '📖 What & Why', body: `
        <h3>Ways to produce</h3>
        <ul class="clean">
          <li><b>AWS SDK</b> — <code>PutRecord</code> / <code>PutRecords</code> (batch up to 500 records / 5 MB).</li>
          <li><b>Kinesis Producer Library (KPL)</b> — high-throughput: batching + <b>record aggregation</b>
          (many user records into one Kinesis record to beat the 1,000 rec/s limit).</li>
          <li><b>Kinesis Agent</b> — tails log files to a stream with no code.</li>
        </ul>
        <div class="lx-callout lx-info"><b>Aggregation matters.</b><div>The 1,000 records/s shard cap bites before the 1 MB/s cap for
        small events. KPL aggregation packs many small {ENTITY} events into one Kinesis record so you hit the byte limit, not the count limit.</div></div>` }] },

    { id: 'aws05', num: '05', icon: '📥', title: 'Consumers & the KCL', idea: 'The KCL manages shard leases, checkpoints, and rebalancing for you.',
      tabs: [{ id: 'why', label: '📖 What & Why', body: `
        <h3>Reading a stream</h3>
        <p>The <b>Kinesis Client Library (KCL)</b> is the standard consumer: it assigns shards to workers
        via <b>leases</b> (stored in a DynamoDB table), <b>checkpoints</b> progress per shard, and
        rebalances when workers join/leave or shards split/merge — the AWS analog of a Kafka consumer group.</p>
        <div class="lx-keypoints"><div class="lx-kp-h">Key points</div><ul class="clean">
          <li>One shard is processed by one KCL worker at a time (ordering).</li>
          <li>Checkpoints are stored per shard in DynamoDB — that's your committed position.</li>
          <li>Standard consumers share the 2 MB/s read; use enhanced fan-out for dedicated throughput (Module 06).</li>
        </ul></div>` }] },

    { id: 'aws06', num: '06', icon: '📡', title: 'Sequence numbers, checkpoints & fan-out', idea: 'Every record has a sequence number; enhanced fan-out gives each consumer its own pipe.',
      tabs: [{ id: 'why', label: '📖 What & Why', body: `
        <h3>Sequence numbers</h3>
        <p>Each record gets a unique, increasing <b>sequence number</b> within its shard — the Kinesis
        equivalent of a Kafka offset. Consumers checkpoint "processed up to sequence N" and can
        re-read (replay) from <code>AT_SEQUENCE_NUMBER</code>, <code>TRIM_HORIZON</code> (oldest), or
        <code>LATEST</code>.</p>
        <h3>Shared vs enhanced fan-out</h3>
        <ul class="clean">
          <li><b>Shared throughput:</b> all consumers split 2 MB/s per shard (polling via GetRecords).</li>
          <li><b>Enhanced fan-out (EFO):</b> each registered consumer gets a <b>dedicated 2 MB/s per shard</b>
          and push delivery (SubscribeToShard), lower latency — at extra cost.</li>
        </ul>
        <div class="lx-callout lx-info"><b>When to use EFO.</b><div>Several independent consumers of the same high-throughput stream
        that each need low latency — otherwise they'd starve each other on the shared 2 MB/s.</div></div>` }] },

    { id: 'aws07', num: '07', icon: '⚙️', title: 'Retention, capacity modes & scaling', idea: 'On-demand auto-scales; provisioned gives you shard control; retention up to 365 days.',
      tabs: [{ id: 'why', label: '📖 What & Why', body: `
        <h3>Retention</h3>
        <p>Default <b>24 hours</b>, extendable to <b>365 days</b> (8,760 h). Longer retention enables
        replay and reprocessing but adds cost beyond 24 h.</p>
        <h3>Capacity modes</h3>
        <ul class="clean">
          <li><b>Provisioned:</b> you set shard count; pay per shard-hour + PUT payload units. Predictable, cheapest at steady scale.</li>
          <li><b>On-demand:</b> Kinesis scales capacity automatically with traffic; pay per throughput. Best for spiky/unknown load.</li>
        </ul>
        <div class="lx-callout lx-warn"><b>Scaling isn't instant.</b><div>Resharding and on-demand scale-ups take time; design headroom for
        bursts (e.g. a surge event in the {ENTITY} stream) rather than assuming instant elasticity.</div></div>` }] },

    { id: 'aws08', num: '08', icon: '📨', title: 'Amazon MSK — managed Kafka', idea: 'Real Apache Kafka, managed: full API, Connect, and Schema Registry.',
      tabs: [{ id: 'why', label: '📖 What & Why', body: `
        <h3>What MSK is</h3>
        <p>MSK runs <b>actual Apache Kafka</b> brokers for you (patching, storage, monitoring). You get
        the real Kafka protocol, so existing Kafka clients, <b>Kafka Connect</b>, <b>MirrorMaker 2</b>,
        and the <b>Glue Schema Registry</b> all work. Everything in the lab's Kafka section applies directly.</p>
        <h3>Provisioned vs Serverless</h3>
        <ul class="clean">
          <li><b>Provisioned:</b> you choose broker type/count and storage — maximum control & tuning.</li>
          <li><b>Serverless:</b> no capacity management; pay per throughput + partition-hours. Great for
          variable workloads where you don't want to size brokers.</li>
        </ul>
        <div class="lx-callout lx-info"><b>Partitions still matter on Serverless.</b><div>Throughput is enforced per partition, so topics
        need enough partitions to reach the capacity you want.</div></div>` }] },

    { id: 'aws09', num: '09', icon: '⚖️', title: 'MSK vs Kinesis — choosing', idea: 'Kafka API & ecosystem → MSK; least-ops AWS-native → Kinesis.',
      tabs: [{ id: 'why', label: '📖 Decision', body: `
        <h3>Head to head</h3>
        <div class="grid cols-2">
          <div class="card"><b>Choose Kinesis when…</b><ul class="clean">
            <li>You want minimal operations and an AWS-native service</li>
            <li>Tight integration with Lambda/Firehose/KCL is enough</li>
            <li>Throughput scales by shards and that model fits</li></ul></div>
          <div class="card"><b>Choose MSK when…</b><ul class="clean">
            <li>You need the Kafka API / existing Kafka apps</li>
            <li>You rely on Connect, Streams, Schema Registry, exactly-once transactions</li>
            <li>You want portability (avoid lock-in) or multi-cloud parity</li></ul></div>
        </div>
        <div class="lx-callout lx-info"><b>Unit of parallelism.</b><div>Kinesis = shard; Kafka/MSK = partition. Same idea — key→bucket,
        order per bucket — different names and control surfaces.</div></div>` }] },

    { id: 'aws10', num: '10', icon: '🌀', title: 'Managed Service for Apache Flink', idea: 'Run real Flink jobs managed — windows, state, checkpoints, exactly-once.',
      tabs: [{ id: 'why', label: '📖 What & Why', body: `
        <h3>Managed Flink on AWS</h3>
        <p>Formerly <b>Kinesis Data Analytics for Apache Flink</b>, this runs standard Apache Flink
        applications with managed scaling, checkpointing to durable storage, and automatic recovery.
        Everything in the lab's <b>Flink</b> section — watermarks, windows, keyed state, savepoints —
        applies; AWS operates the cluster.</p>
        <div class="lx-keypoints"><div class="lx-kp-h">Key points</div><ul class="clean">
          <li>Sources/sinks: Kinesis, MSK, Firehose, S3, OpenSearch, and more via connectors.</li>
          <li><b>Snapshots</b> (savepoints) let you upgrade app code without losing state.</li>
          <li>Checkpointing provides effectively-once <i>processing</i>; end-to-end exactly-once still
          needs a cooperating sink (Foundations Module 11).</li>
        </ul></div>` }] },

    { id: 'aws11', num: '11', icon: '🔧', title: 'Building a Flink app on AWS', idea: 'Package a Flink job, point it at a source/sink, let AWS manage parallelism and state.',
      tabs: [{ id: 'why', label: '📖 What & Why', body: `
        <h3>Shape of an app</h3>
        <p>Read from a source → key by <code>{KEY}</code> → window/aggregate with state → write to a sink.
        You control parallelism; AWS manages the runtime. A PyFlink sketch:</p>
        <div class="lx-code"><div class="lx-code-lang">pyflink (sketch)</div><pre><code>env = StreamExecutionEnvironment.get_execution_environment()
env.enable_checkpointing(60000)  # checkpoint every 60s
# source: Kinesis/MSK -> keyBy({KEY}) -> tumbling window(5 min) -> sink
</code></pre></div>
        <div class="lx-callout lx-warn"><b>Tune parallelism per operator.</b><div>As the lab's Flink Performance module teaches, set
        parallelism where the work is (the hot operator), not globally.</div></div>` }] },

    { id: 'aws12', num: '12', icon: '🚿', title: 'Amazon Data Firehose', idea: 'No-code, near-real-time delivery to S3/Redshift/OpenSearch with buffering & transforms.',
      tabs: [{ id: 'why', label: '📖 What & Why', body: `
        <h3>Delivery, not processing</h3>
        <p>Firehose reliably <b>delivers</b> streaming data to destinations (S3, Redshift, OpenSearch,
        Splunk, HTTP endpoints) with <b>no code</b>. It is <b>near-real-time</b>: it <b>buffers</b> by
        size and time (whichever threshold hits first) before writing — so expect seconds-to-minutes
        latency, not sub-second.</p>
        <div class="lx-keypoints"><div class="lx-kp-h">Key points</div><ul class="clean">
          <li>Buffering: a size threshold (MB) and an interval (seconds); the first to trip flushes.</li>
          <li>Optional inline <b>transform via Lambda</b>, format conversion (JSON→Parquet/ORC), and
          dynamic partitioning for S3.</li>
          <li>Built-in retry + optional S3 backup of failed/raw records.</li>
        </ul></div>
        <div class="lx-callout lx-info"><b>Firehose vs Streams.</b><div>Streams = a replayable log you process; Firehose = a one-way
        delivery pipe to storage. They're often used together: Streams → Flink/Lambda → Firehose → S3.</div></div>` }] },

    { id: 'aws13', num: '13', icon: 'λ', title: 'Lambda consumers & event-source mappings', idea: 'Serverless processing per batch, with tunable batching, parallelism, and failure handling.',
      tabs: [{ id: 'why', label: '📖 What & Why', body: `
        <h3>Event-source mapping (ESM)</h3>
        <p>An ESM polls a Kinesis/MSK stream and invokes your Lambda with batches of records. Key knobs
        (validated against AWS docs):</p>
        <div class="lx-keypoints"><div class="lx-kp-h">Validated parameters (Kinesis)</div><ul class="clean">
          <li><b>Batch size:</b> default 100, max 10,000 records.</li>
          <li><b>Parallelization factor:</b> 1–10 concurrent batches per shard (default 1).</li>
          <li><b>Maximum retry attempts:</b> default −1 (infinite, until records expire); finite 0–10,000.</li>
          <li><b>Bisect batch on error:</b> split a failing batch in two and retry — isolates a poison record.</li>
          <li><b>On-failure destination:</b> send failed batch metadata to SQS/SNS instead of blocking.</li>
        </ul></div>
        <div class="lx-callout lx-warn"><b>Stalled shards.</b><div>With infinite retries, one poison record blocks its shard forever.
        Limit retries, bisect, or route failures to a DLQ so the {ENTITY} stream keeps flowing.</div></div>` }] },

    { id: 'aws14', num: '14', icon: '🪣', title: 'S3 & the streaming data lake', idea: 'Land events in S3, partitioned for cheap query — the bridge from streaming to analytics.',
      tabs: [{ id: 'why', label: '📖 What & Why', body: `
        <h3>Streaming into a lake</h3>
        <p>Firehose (or a Flink sink) writes events to <b>S3</b>, usually partitioned by time
        (<code>year/month/day/hour</code>) and often as <b>Parquet</b> for columnar query by Athena,
        Redshift Spectrum, or EMR. This is the "serving/warehouse" sink of the reference architecture.</p>
        <div class="lx-callout lx-warn"><b>Small-files problem.</b><div>Too-frequent flushes create many tiny S3 objects, which
        are slow and costly to query. Tune Firehose buffering (or compact later) so objects are a sensible size.</div></div>
        <div class="lx-callout lx-info"><b>Open table formats.</b><div>Apache Iceberg/Delta on S3 add ACID, schema evolution, and
        time-travel on top of the lake — the direction modern platforms (and the Databricks section) take.</div></div>` }] },

    { id: 'aws15', num: '15', icon: '📋', title: 'Schema management', idea: 'A schema registry keeps producers and consumers compatible as events evolve.',
      tabs: [{ id: 'why', label: '📖 What & Why', body: `
        <h3>Why schemas</h3>
        <p>Events outlive the code that wrote them. A <b>schema registry</b> (AWS <b>Glue Schema
        Registry</b>, or Confluent with MSK) validates events against a registered schema and enforces
        <b>compatibility</b> (backward/forward/full) so a producer change can't silently break consumers.</p>
        <div class="lx-keypoints"><div class="lx-kp-h">Key points</div><ul class="clean">
          <li>Avro/Protobuf/JSON-Schema; the wire payload carries a small schema id, not the whole schema.</li>
          <li><b>Backward</b> compatible = new consumers read old data; <b>forward</b> = old consumers read new data.</li>
          <li>Covered in depth in the lab's Kafka <b>Schema Registry</b> module.</li>
        </ul></div>` }] },

    { id: 'aws16', num: '16', icon: '🔐', title: 'Security', idea: 'Encrypt in transit and at rest; authorize with IAM; isolate with VPC.',
      tabs: [{ id: 'why', label: '📖 What & Why', body: `
        <h3>The layers</h3>
        <ul class="clean">
          <li><b>Encryption in transit:</b> TLS to Kinesis/MSK endpoints.</li>
          <li><b>Encryption at rest:</b> KMS-managed keys (Kinesis SSE; MSK EBS/storage encryption).</li>
          <li><b>AuthN/AuthZ:</b> IAM policies for Kinesis/Firehose/Lambda; MSK supports IAM access control,
          SASL/SCRAM, and mTLS with Kafka ACLs.</li>
          <li><b>Network isolation:</b> run in a VPC; use VPC endpoints to keep traffic off the public internet.</li>
        </ul>
        <div class="lx-callout lx-info"><b>Least privilege.</b><div>Scope producer roles to <code>PutRecord</code> on one stream, consumer roles
        to read + checkpoint. Don't share one broad role across the pipeline.</div></div>` }] },

    { id: 'aws17', num: '17', icon: '📊', title: 'Observability with CloudWatch', idea: 'Watch iterator age, throttles, and throughput — rising lag is your first alarm.',
      tabs: [{ id: 'why', label: '📖 What & Why', body: `
        <h3>The signals</h3>
        <ul class="clean">
          <li><b>GetRecords.IteratorAgeMilliseconds</b> — Kinesis's lag metric; how old the records a consumer
          is reading are. Rising iterator age = falling behind. <b>Alarm on this first.</b></li>
          <li><b>WriteProvisionedThroughputExceeded / ReadProvisioned…Exceeded</b> — shard throttling.</li>
          <li><b>IncomingRecords / IncomingBytes</b> — throughput in.</li>
          <li><b>MSK:</b> consumer lag, under-replicated partitions, broker CPU/disk.</li>
          <li><b>Lambda:</b> Iterator age, errors, throttles, concurrent executions.</li>
        </ul>
        <div class="lx-callout lx-warn"><b>Per-shard, not just aggregate.</b><div>A single hot shard can be badly behind while the
        stream average looks fine — alarm at the shard level.</div></div>` }] },

    { id: 'aws18', num: '18', icon: '🛟', title: 'Failure handling & recovery', idea: 'Retries, DLQs, idempotency, and replay keep the pipeline correct under failure.',
      tabs: [{ id: 'why', label: '📖 What & Why', body: `
        <h3>Patterns on AWS</h3>
        <ul class="clean">
          <li><b>Throttling:</b> retry with backoff (KPL/SDK do this); scale shards or switch to on-demand.</li>
          <li><b>Poison records:</b> bisect-on-error + on-failure destination (SQS/SNS DLQ) for Lambda.</li>
          <li><b>Idempotent sinks:</b> make reprocessing safe (e.g. upsert by {KEY}) so at-least-once duplicates don't corrupt.</li>
          <li><b>Replay:</b> rewind KCL checkpoints / use retention to reprocess after a bug fix.</li>
          <li><b>Flink recovery:</b> checkpoints restore state + positions automatically.</li>
        </ul>` }] },

    { id: 'aws19', num: '19', icon: '💵', title: 'Cost model', idea: 'Know what you pay for — shards/throughput, PUT units, retention, EFO, and egress.',
      tabs: [{ id: 'why', label: '📖 What & Why', body: `
        <h3>Where the money goes</h3>
        <ul class="clean">
          <li><b>Kinesis provisioned:</b> per shard-hour + per million PUT payload units (25 KB each) + extended retention + EFO.</li>
          <li><b>Kinesis on-demand:</b> per GB in/out + per-stream hour — simpler, usually pricier at steady high load.</li>
          <li><b>MSK:</b> broker-hours + storage (Provisioned) or throughput + partition-hours (Serverless).</li>
          <li><b>Firehose:</b> per GB ingested (+ format conversion / dynamic partitioning).</li>
          <li><b>Managed Flink:</b> per KPU (compute) hour + running storage.</li>
        </ul>
        <div class="lx-callout lx-info"><b>Cost levers.</b><div>Right-size shards, aggregate small records (KPL), avoid EFO unless you
        need it, and keep retention only as long as replay requires. Figures change — price against the current AWS calculator.</div></div>` }] },

    { id: 'aws20', num: '20', icon: '🏗️', title: 'End-to-end reference architecture', idea: 'Sources → Kinesis/MSK → Flink/Lambda → Firehose → S3, observed throughout.',
      tabs: [{ id: 'why', label: '📖 Architecture', body: `
        <h3>Putting it together (active scenario)</h3>
        <div id="aws20-pipeline"></div>
        <ol class="clean">
          <li><b>Ingest:</b> {ENTITY} apps/devices → Kinesis Data Streams (or MSK), keyed on <code>{KEY}</code>.</li>
          <li><b>Process:</b> Managed Service for Apache Flink does windowing/joins/state;
          Lambda handles lightweight per-record logic.</li>
          <li><b>Deliver:</b> Firehose lands results in S3 (Parquet, time-partitioned) for Athena/Redshift;
          a serving store (DynamoDB/OpenSearch) powers live lookups.</li>
          <li><b>Observe:</b> CloudWatch on iterator age, throttles, checkpoint health.</li>
        </ol>
        <div class="lx-callout lx-ok"><b>Same backbone.</b><div>This is the Foundations reference architecture (Module 15) rendered in AWS
        services. Azure and Databricks next implement the same shape differently.</div></div>` }] },
  ],
};
