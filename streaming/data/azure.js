// Azure streaming curriculum (Gate 5b). Facts validated I44 against official
// Microsoft Learn docs (see docs/technical-accuracy-review.md §5).

export const AZURE = {
  id: 'azure', name: 'Azure', icon: '🔷', accent: '#0078D4',
  blurb: 'Streaming on Azure — Event Hubs (with native Kafka protocol), Stream Analytics, Capture and Functions — validated against Microsoft Learn docs.',
  modules: [
    { id: 'azure01', num: '01', icon: '🗺️', title: 'Azure streaming landscape', idea: 'Event Hubs is the log; Stream Analytics/Functions/Databricks process; Capture + storage deliver.',
      tabs: [{ id: 'why', label: '📖 Overview', body: `
        <h3>The Azure streaming toolbox</h3>
        <ul class="clean">
          <li><b>Azure Event Hubs</b> — the durable, partitioned event log (speaks AMQP, HTTPS, and the <b>Apache Kafka</b> protocol).</li>
          <li><b>Azure Stream Analytics (ASA)</b> — managed, SQL-based stream processing with built-in windowing.</li>
          <li><b>Azure Functions</b> — serverless per-event/per-batch processing (Event Hubs trigger).</li>
          <li><b>Azure Databricks / Synapse</b> — heavy stateful processing (Databricks has its own section).</li>
          <li><b>Event Hubs Capture</b> — no-code delivery of the stream to Blob/ADLS for the lake.</li>
        </ul>
        <div class="lx-callout lx-info"><b>Same backbone.</b><div>Event Hubs = log, ASA/Functions = processing, Capture + ADLS = sink.
        The Foundations reference architecture, in Azure services.</div></div>` }] },

    { id: 'azure02', num: '02', icon: '🔷', title: 'Event Hubs fundamentals', idea: 'A durable, partitioned log — the Azure counterpart to a Kafka topic / Kinesis stream.',
      tabs: [{ id: 'why', label: '📖 What & Why', body: `
        <h3>The model</h3>
        <p>An <b>event hub</b> lives in a <b>namespace</b> and is split into <b>partitions</b>. Producers
        send events (optionally with a partition key); consumers read per partition in order. A partition
        is the Azure analog of a Kafka partition / Kinesis shard.</p>
        <div class="lx-keypoints"><div class="lx-kp-h">Validated facts</div><ul class="clean">
          <li>Partitions per hub: up to <b>32</b> (Standard), <b>100</b> (Premium), <b>1,024</b> (Dedicated).</li>
          <li>Partition count is <b>fixed at creation</b> and <b>cannot be decreased</b> — size it up front.</li>
          <li>Throughput is bought as <b>Throughput Units</b> (Standard), <b>Processing Units</b> (Premium), or <b>Capacity Units</b> (Dedicated).</li>
        </ul></div>` }] },

    { id: 'azure03', num: '03', icon: '🧩', title: 'Partitions & partition keys', idea: 'The partition key fixes ordering per key; partition count is permanent, so plan it.',
      tabs: [{ id: 'why', label: '📖 What & Why', body: `
        <h3>Keying</h3>
        <p>Send with a <b>partition key</b> and Event Hubs hashes it to a partition — same key → same
        partition → <b>order preserved per key</b>. Keying on <code>{KEY}</code> keeps each {ENTITY}'s
        events ordered. Omit the key and events round-robin for maximum spread (no per-key order).</p>
        <div class="lx-callout lx-warn"><b>Partitions are permanent.</b><div>Unlike Kafka (where you can add partitions) Event Hubs
        fixes the count at creation and you can't decrease it. Pick enough for peak {ENTITY} throughput and consumer parallelism from day one.</div></div>` }] },

    { id: 'azure04', num: '04', icon: '📤', title: 'Producers (SDK, AMQP, Kafka)', idea: 'Batch events; choose AMQP SDKs or point existing Kafka producers straight at Event Hubs.',
      tabs: [{ id: 'why', label: '📖 What & Why', body: `
        <h3>Ways to send</h3>
        <ul class="clean">
          <li><b>Azure SDKs (AMQP):</b> <code>EventHubProducerClient</code> with event <b>batches</b> for throughput.</li>
          <li><b>Kafka protocol:</b> existing Kafka producers work by changing only the bootstrap endpoint + SASL config — no code rewrite.</li>
          <li><b>HTTPS</b> for simple senders.</li>
        </ul>
        <div class="lx-keypoints"><div class="lx-kp-h">Capacity per Throughput Unit (Standard)</div><ul class="clean">
          <li>Ingress: up to <b>1 MB/s or 1,000 events/s</b>.</li>
          <li>Egress: up to <b>2 MB/s or 4,096 events/s</b>.</li>
          <li>Up to <b>40 TU</b> per namespace (shared); <b>Auto-inflate</b> raises TU automatically under load.</li>
        </ul></div>` }] },

    { id: 'azure05', num: '05', icon: '📥', title: 'Consumers, consumer groups & checkpointing', idea: 'Consumer groups give independent views; the Event Processor checkpoints to Blob storage.',
      tabs: [{ id: 'why', label: '📖 What & Why', body: `
        <h3>Reading</h3>
        <p>A <b>consumer group</b> is an independent view of the whole hub — each group tracks its own
        positions (Standard allows <b>20</b> consumer groups per hub). Within a group, each partition is
        read by one active consumer (ordering), mirroring a Kafka consumer group.</p>
        <h3>Checkpointing</h3>
        <p>The <b>Event Processor</b> client balances partitions across instances and <b>checkpoints
        progress to a Blob Storage container</b> — the Azure analog of the KCL's DynamoDB lease table.
        Restart and it resumes from the last checkpoint.</p>` }] },

    { id: 'azure06', num: '06', icon: '📡', title: 'Offsets, sequence numbers & replay', idea: 'Every event has an offset + sequence number; rewind to reprocess.',
      tabs: [{ id: 'why', label: '📖 What & Why', body: `
        <h3>Positions</h3>
        <p>Each event carries an <b>offset</b>, a <b>sequence number</b>, and an enqueued time within its
        partition. Consumers can start from the beginning, from <code>@latest</code>, or from a specific
        offset/sequence/timestamp — that's how you <b>replay</b> after a bug fix or to backfill a new
        consumer, as long as the data is still within retention.</p>
        <div class="lx-callout lx-info"><b>Same idea, three clouds.</b><div>Kafka offset = Kinesis sequence number = Event Hubs
        offset/sequence number. Checkpoint = your committed position.</div></div>` }] },

    { id: 'azure07', num: '07', icon: '⚙️', title: 'Scaling — TUs, PUs, CUs & Auto-inflate', idea: 'Capacity is bought in units; Auto-inflate grows them, partitions bound parallelism.',
      tabs: [{ id: 'why', label: '📖 What & Why', body: `
        <h3>Two independent dials</h3>
        <ul class="clean">
          <li><b>Capacity units</b> (TU/PU/CU) govern <b>throughput</b> (MB/s, events/s).</li>
          <li><b>Partition count</b> governs <b>parallelism</b> (how many consumers can read in parallel).</li>
        </ul>
        <p>Both matter: buying more TUs won't help if you only have a few partitions, and many partitions
        won't help if you're TU-starved. <b>Auto-inflate</b> raises TUs automatically up to a cap; it
        does <b>not</b> change partition count (which is fixed).</p>
        <div class="lx-callout lx-warn"><b>Plan partitions for peak.</b><div>Because you can't add/remove them, base the count on your
        highest expected {ENTITY} parallelism, not today's load.</div></div>` }] },

    { id: 'azure08', num: '08', icon: '🗄️', title: 'Retention & Event Hubs Capture', idea: 'Keep events 1h–90d; Capture auto-lands them in Blob/ADLS with no code.',
      tabs: [{ id: 'why', label: '📖 What & Why', body: `
        <h3>Retention</h3>
        <p>Default/minimum <b>1 hour</b>; <b>Standard</b> keeps up to <b>7 days</b>, <b>Premium/Dedicated</b>
        up to <b>90 days</b>. Retention bounds how far back you can replay.</p>
        <h3>Capture</h3>
        <p><b>Event Hubs Capture</b> automatically writes the incoming stream to <b>Azure Blob Storage</b>
        or <b>ADLS</b> as Avro files on a size/time window — a no-code bridge to the data lake (the
        counterpart of AWS Firehose → S3). Great for cheap long-term storage + batch analytics alongside
        your real-time path.</p>` }] },

    { id: 'azure09', num: '09', icon: '📨', title: 'Kafka protocol on Event Hubs', idea: 'Run Kafka apps unchanged by repointing the bootstrap endpoint.',
      tabs: [{ id: 'why', label: '📖 What & Why', body: `
        <h3>Kafka without Kafka</h3>
        <p>Event Hubs exposes a <b>Kafka-protocol endpoint</b>, so Kafka producers/consumers, Kafka
        Connect, and many Kafka tools work against it by changing only connection settings (bootstrap
        server + SASL). You get a managed broker-less experience while keeping Kafka code.</p>
        <div class="lx-callout lx-info"><b>What maps, what doesn't.</b><div>Core produce/consume maps cleanly. Some Kafka-specific
        features (certain admin ops, transactions, log compaction) differ or aren't supported — verify the current compatibility matrix for your feature.</div></div>
        <p>Everything in the lab's <b>Kafka</b> section conceptually applies when you use this endpoint.</p>` }] },

    { id: 'azure10', num: '10', icon: '⚖️', title: 'Event Hubs vs Kafka/MSK vs Kinesis', idea: 'Native Azure + Kafka protocol; fixed partitions; unit-based throughput.',
      tabs: [{ id: 'why', label: '📖 Decision', body: `
        <h3>Cross-cloud comparison</h3>
        <div class="grid cols-2">
          <div class="card"><b>Event Hubs strengths</b><ul class="clean">
            <li>Deep Azure integration + native Kafka protocol</li>
            <li>No broker management; Capture to lake built in</li>
            <li>Simple unit-based scaling + Auto-inflate</li></ul></div>
          <div class="card"><b>Watch-outs vs Kafka</b><ul class="clean">
            <li>Partitions fixed at creation (Kafka can add)</li>
            <li>Some Kafka features unsupported over the protocol</li>
            <li>Throughput capped by purchased units</li></ul></div>
        </div>
        <div class="lx-callout lx-info"><b>Unit of parallelism.</b><div>Event Hubs partition = Kafka partition = Kinesis shard. The
        mental model you built in Foundations transfers directly.</div></div>` }] },

    { id: 'azure11', num: '11', icon: '🧮', title: 'Azure Stream Analytics fundamentals', idea: 'Managed stream processing you write in SQL (SAQL), scaled by Streaming Units.',
      tabs: [{ id: 'why', label: '📖 What & Why', body: `
        <h3>SQL on streams</h3>
        <p><b>Azure Stream Analytics (ASA)</b> runs a SQL-like query (SAQL) continuously over streaming
        inputs (Event Hubs/IoT Hub) and writes to outputs (SQL, Blob/ADLS, Power BI, Event Hubs, Cosmos
        DB). You scale it with <b>Streaming Units (SU)</b> — the compute/memory allocation.</p>
        <div class="lx-code"><div class="lx-code-lang">SAQL</div><pre><code>SELECT {KEY}, COUNT(*) AS cnt
INTO   output
FROM   input TIMESTAMP BY eventTime
GROUP BY {KEY}, TumblingWindow(minute, 5)</code></pre></div>
        <p><code>TIMESTAMP BY</code> tells ASA to use <b>event time</b> (Foundations Module 06) rather than arrival time.</p>` }] },

    { id: 'azure12', num: '12', icon: '🪟', title: 'Stream Analytics windowing', idea: 'Five window types: tumbling, hopping, sliding, session, snapshot.',
      tabs: [{ id: 'why', label: '📖 What & Why', body: `
        <h3>The five windows (validated)</h3>
        <ul class="clean">
          <li><b>Tumbling</b> — fixed, non-overlapping; each event in exactly one window.</li>
          <li><b>Hopping</b> — fixed size, advances by a hop; overlaps (hop = size ⇒ tumbling).</li>
          <li><b>Sliding</b> — emits only when an event enters/leaves the window.</li>
          <li><b>Session</b> — groups events separated by gaps smaller than a timeout (+ optional max duration).</li>
          <li><b>Snapshot</b> — groups events with the exact same timestamp (<code>System.Timestamp()</code>).</li>
        </ul>
        <div class="lx-callout lx-info"><b>Try the mechanics.</b><div>The Foundations <b>Window animator</b> (Module 08) lets you play with
        tumbling vs sliding interactively — the same semantics ASA implements.</div></div>` }] },

    { id: 'azure13', num: '13', icon: '⏱️', title: 'Event time, watermarks & late data', idea: 'TIMESTAMP BY sets event time; tune late-arrival and out-of-order tolerances.',
      tabs: [{ id: 'why', label: '📖 What & Why', body: `
        <h3>Correctness over arrival order</h3>
        <p>With <code>TIMESTAMP BY</code>, ASA orders by <b>event time</b> and advances an internal
        watermark. You configure two policies:</p>
        <ul class="clean">
          <li><b>Late arrival tolerance:</b> how long to wait for stragglers before finalizing a window.</li>
          <li><b>Out-of-order tolerance:</b> how much reordering to absorb (events within it are buffered & sorted; beyond it are adjusted or dropped).</li>
        </ul>
        <div class="lx-callout lx-info"><b>Same dial as watermarks.</b><div>These tolerances are ASA's version of the
        allowed-lateness dial from Foundations Module 07 — more tolerance = more correct, higher latency.</div></div>` }] },

    { id: 'azure14', num: '14', icon: '🔌', title: 'Inputs, outputs & reference data', idea: 'Join a fast stream against slow reference data; fan results to many sinks.',
      tabs: [{ id: 'why', label: '📖 What & Why', body: `
        <h3>Wiring ASA</h3>
        <ul class="clean">
          <li><b>Streaming inputs:</b> Event Hubs, IoT Hub, Blob.</li>
          <li><b>Reference data:</b> slow-changing lookup (Blob/SQL) joined to the stream — e.g. enrich a
          {ENTITY} event with {KEY} metadata.</li>
          <li><b>Outputs:</b> SQL DB, Blob/ADLS, Power BI (live dashboards), Event Hubs, Cosmos DB, Functions.</li>
        </ul>
        <div class="lx-callout lx-info"><b>Stream-table join.</b><div>Enriching a stream with reference data is one of the most common
        real patterns — it's a join between an unbounded stream and a bounded table.</div></div>` }] },

    { id: 'azure15', num: '15', icon: 'λ', title: 'Azure Functions & other processing', idea: 'Serverless per-batch processing with the Event Hubs trigger, plus Synapse/Databricks for heavy jobs.',
      tabs: [{ id: 'why', label: '📖 What & Why', body: `
        <h3>When ASA isn't the fit</h3>
        <ul class="clean">
          <li><b>Azure Functions</b> — Event Hubs trigger invokes your function with <b>batches</b>;
          it manages checkpoints. Great for custom/arbitrary per-event logic (the Azure analog of Lambda ESM).</li>
          <li><b>Azure Databricks</b> — Spark Structured Streaming for complex stateful pipelines (own section).</li>
          <li><b>Synapse / Fabric</b> — analytics + real-time intelligence surfaces.</li>
        </ul>
        <div class="lx-callout lx-warn"><b>Batch size & checkpointing.</b><div>The Functions Event Hubs trigger processes events in
        batches per partition and checkpoints after success — tune batch size and avoid blocking a partition on a poison event.</div></div>` }] },

    { id: 'azure16', num: '16', icon: '📋', title: 'Schema management', idea: 'The Event Hubs Schema Registry keeps producers and consumers compatible.',
      tabs: [{ id: 'why', label: '📖 What & Why', body: `
        <h3>Schemas on Azure</h3>
        <p>The <b>Azure Schema Registry</b> (hosted in an Event Hubs namespace) stores Avro/JSON schemas
        and enforces <b>compatibility</b> as events evolve — the same role as AWS Glue / Confluent
        registries. Clients embed a schema id in the payload and validate against the registry.</p>
        <div class="lx-callout lx-info"><b>Why it matters.</b><div>It stops a producer change from silently breaking downstream
        consumers — covered in depth in the lab's Kafka <b>Schema Registry</b> module.</div></div>` }] },

    { id: 'azure17', num: '17', icon: '🔐', title: 'Security', idea: 'Entra ID + managed identities, TLS, RBAC/SAS, and private endpoints.',
      tabs: [{ id: 'why', label: '📖 What & Why', body: `
        <h3>The layers</h3>
        <ul class="clean">
          <li><b>AuthN/AuthZ:</b> prefer <b>Microsoft Entra ID</b> + <b>managed identities</b> with RBAC roles
          (e.g. Event Hubs Data Sender/Receiver) over shared access signatures (SAS keys).</li>
          <li><b>Encryption:</b> TLS in transit; encryption at rest (customer-managed keys on Premium/Dedicated).</li>
          <li><b>Network:</b> <b>Private Endpoints</b> + firewall rules to keep traffic off the public internet.</li>
        </ul>
        <div class="lx-callout lx-info"><b>Least privilege.</b><div>Give producers Sender, consumers Receiver — never one all-powerful SAS
        key shared across the pipeline.</div></div>` }] },

    { id: 'azure18', num: '18', icon: '📊', title: 'Observability with Azure Monitor', idea: 'Watch incoming/outgoing, throttled requests, and consumer lag.',
      tabs: [{ id: 'why', label: '📖 What & Why', body: `
        <h3>The signals</h3>
        <ul class="clean">
          <li><b>Throttled Requests</b> — you're exceeding purchased TUs; scale up or enable Auto-inflate.</li>
          <li><b>Incoming/Outgoing Messages & Bytes</b> — throughput in/out.</li>
          <li><b>Consumer lag</b> — how far behind a consumer group is (watch per partition).</li>
          <li><b>ASA metrics:</b> SU % utilization, watermark delay, input/output events, runtime errors.</li>
        </ul>
        <div class="lx-callout lx-warn"><b>Watermark delay is the ASA lag signal.</b><div>Rising watermark delay or SU% near 100 means
        ASA is falling behind — scale SUs or optimize the query.</div></div>` }] },

    { id: 'azure19', num: '19', icon: '🛟', title: 'Reliability, geo-DR & failure handling', idea: 'Idempotent sinks, retries, and Event Hubs Geo-DR for regional resilience.',
      tabs: [{ id: 'why', label: '📖 What & Why', body: `
        <h3>Patterns on Azure</h3>
        <ul class="clean">
          <li><b>Throttling:</b> retry with backoff; Auto-inflate or more TUs/PUs.</li>
          <li><b>Idempotent sinks:</b> upsert by {KEY} so replays/at-least-once duplicates don't corrupt.</li>
          <li><b>Geo-DR:</b> Event Hubs <b>Geo-disaster recovery</b> pairs namespaces with an alias for
          metadata failover (note: it fails over configuration, not necessarily buffered event data — design accordingly).</li>
          <li><b>ASA:</b> built-in checkpointing restarts without losing state.</li>
        </ul>` }] },

    { id: 'azure20', num: '20', icon: '💵', title: 'Cost model', idea: 'Pay for units (TU/PU/CU), ASA Streaming Units, and Capture/storage.',
      tabs: [{ id: 'why', label: '📖 What & Why', body: `
        <h3>Where the money goes</h3>
        <ul class="clean">
          <li><b>Event Hubs:</b> per <b>TU-hour</b> (Standard, + capture/ingress events) / <b>PU-hour</b> (Premium) / <b>CU-hour</b> (Dedicated).</li>
          <li><b>Capture:</b> extra per-hour charge when enabled.</li>
          <li><b>Stream Analytics:</b> per <b>Streaming-Unit-hour</b>.</li>
          <li><b>Storage/egress:</b> Blob/ADLS for captured data; cross-region egress.</li>
        </ul>
        <div class="lx-callout lx-info"><b>Levers.</b><div>Right-size TU/SU, use Auto-inflate caps, batch producers, and keep retention
        only as long as replay needs. Price against the current Azure pricing calculator.</div></div>` }] },

    { id: 'azure21', num: '21', icon: '🏗️', title: 'End-to-end reference architecture', idea: 'Sources → Event Hubs → Stream Analytics/Functions → sinks + Capture, observed.',
      tabs: [{ id: 'why', label: '📖 Architecture', body: `
        <h3>Putting it together (active scenario)</h3>
        <div id="azure21-pipeline"></div>
        <ol class="clean">
          <li><b>Ingest:</b> {ENTITY} apps → Event Hubs, keyed on <code>{KEY}</code> (or via the Kafka endpoint).</li>
          <li><b>Process:</b> Stream Analytics for SQL windowing/joins; Functions for custom per-event logic.</li>
          <li><b>Deliver:</b> results to Power BI (live dashboards), SQL/Cosmos (serving), and
          <b>Event Hubs Capture → ADLS</b> for the lake/batch.</li>
          <li><b>Observe:</b> Azure Monitor on throttling, watermark delay, SU%, consumer lag.</li>
        </ol>
        <div class="lx-callout lx-ok"><b>Same backbone, Azure flavor.</b><div>Identical shape to the AWS architecture — different
        service names. Databricks next shows the lakehouse take.</div></div>` }] },
  ],
};
