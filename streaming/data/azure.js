// Azure streaming curriculum (Gate 5b, deepened). Facts validated I44 against
// official Microsoft Learn docs (docs/technical-accuracy-review.md §5). Each module
// has four tabs — Concept · Mechanics · In-scenario · Interview Q&A — matching the
// depth of the Kafka/Flink modules.
import { iqSection, flowDiagram, compareTable, codeBlock } from '../components/lesson-shell.js';

const T = (concept, mechanics, scenario, iq) => ([
  { id: 'why', label: '📖 Concept', body: concept },
  { id: 'mech', label: '🔧 Mechanics', body: mechanics },
  { id: 'scn', label: '🎬 In your scenario', body: scenario },
  { id: 'iq', label: '🎯 Interview Q&A', body: iqSection(iq) },
]);

export const AZURE = {
  id: 'azure', name: 'Azure', icon: '🔷', accent: '#0078D4',
  blurb: 'Streaming on Azure — Event Hubs (native Kafka protocol), Stream Analytics, Capture and Functions. Every fact validated against Microsoft Learn.',
  modules: [
    { id: 'azure01', num: '01', icon: '🗺️', title: 'Azure streaming landscape', idea: 'Event Hubs is the log; Stream Analytics/Functions/Databricks process; Capture delivers.',
      tabs: T(
        `<h3>The Azure streaming toolbox</h3>
         <ul class="clean">
           <li><b>Azure Event Hubs</b> — durable, partitioned event log (AMQP, HTTPS, and the <b>Apache Kafka</b> protocol).</li>
           <li><b>Azure Stream Analytics (ASA)</b> — managed, SQL-based stream processing with built-in windowing.</li>
           <li><b>Azure Functions</b> — serverless per-batch processing (Event Hubs trigger).</li>
           <li><b>Azure Databricks / Synapse</b> — heavy stateful processing (Databricks has its own section).</li>
           <li><b>Event Hubs Capture</b> — no-code delivery of the stream to Blob/ADLS.</li>
         </ul>`,
        `<h3>How it maps to the backbone</h3>
         ${flowDiagram(['Producers', 'Event Hubs', 'Stream Analytics / Functions', 'Capture', 'ADLS / serving store'])}
         ${compareTable(['Layer', 'Azure service', 'AWS analog'], [
           ['Log', 'Event Hubs', 'Kinesis / MSK'],
           ['Processing (SQL)', 'Stream Analytics', '—'],
           ['Processing (serverless)', 'Functions', 'Lambda'],
           ['Processing (heavy)', 'Databricks/Synapse', 'Managed Flink'],
           ['Delivery to lake', 'Capture', 'Firehose'],
         ])}`,
        `<h3>{ID} on Azure</h3>
         <p>{ENTITY} events land in <b>Event Hubs</b> keyed on <code>{KEY}</code>, <b>Stream Analytics</b> computes
         windowed aggregates in SQL, <b>Capture</b> lands raw events in ADLS, and Power BI shows live {ENTITY} metrics.</p>`,
        [
          { q: 'What is the Azure equivalent of Kafka/Kinesis?', a: '<b>Azure Event Hubs</b> — a durable, partitioned log. It even speaks the native Kafka protocol, so Kafka clients work against it.' },
          { q: 'ASA vs Functions vs Databricks — when each?', a: 'ASA for SQL windowing/joins with minimal code; Functions for custom serverless per-event logic; Databricks/Synapse for heavy, complex stateful pipelines.' },
          { q: 'What plays the role of Firehose on Azure?', a: '<b>Event Hubs Capture</b> — no-code delivery of the stream to Blob/ADLS for the lake and batch analytics.' },
        ]),
    },

    { id: 'azure02', num: '02', icon: '🔷', title: 'Event Hubs fundamentals', idea: 'A durable, partitioned log — the Azure counterpart to a Kafka topic / Kinesis stream.',
      tabs: T(
        `<h3>The model</h3>
         <p>An <b>event hub</b> lives in a <b>namespace</b> and is split into <b>partitions</b>. Producers send events
         (optionally with a partition key); consumers read per partition in order. Partition ≈ Kafka partition / Kinesis shard.</p>
         <div class="lx-keypoints"><div class="lx-kp-h">Validated facts</div><ul class="clean">
           <li>Partitions per hub: up to <b>32</b> (Standard), <b>100</b> (Premium), <b>1,024</b> (Dedicated).</li>
           <li>Partition count is <b>fixed at creation</b> and <b>cannot be decreased</b>.</li>
           <li>Throughput via <b>Throughput Units</b> (Standard) / <b>Processing Units</b> (Premium) / <b>Capacity Units</b> (Dedicated).</li>
         </ul></div>`,
        `<h3>Tiers at a glance</h3>
         ${compareTable(['Tier', 'Max partitions/hub', 'Capacity unit', 'Max retention'], [
           ['Standard', '32', 'Throughput Unit (TU)', '7 days'],
           ['Premium', '100', 'Processing Unit (PU)', '90 days'],
           ['Dedicated', '1,024', 'Capacity Unit (CU)', '90 days'],
         ])}
         <div class="lx-callout lx-info"><b>Namespace vs hub.</b><div>TUs are purchased per <b>namespace</b> and shared by all event hubs in it;
         partitions belong to a specific hub.</div></div>`,
        `<h3>Sizing the {ENTITY} hub</h3>
         <p>Create the <b>{ENTITY}</b> event hub with enough partitions for peak consumer parallelism (say 16–32 on
         Standard) because you <b>can't add them later</b>. Buy TUs for throughput and enable Auto-inflate for bursts
         of {ENTITY} activity.</p>`,
        [
          { q: 'How is Event Hubs like and unlike Kafka?', a: 'Like: a partitioned, durable log with per-key ordering, consumer groups, and replay; it even speaks the Kafka protocol. Unlike: partitions are <b>fixed at creation</b>, throughput is bought as units (TU/PU/CU), and some Kafka features differ.' },
          { q: 'What are Throughput Units?', a: 'The Standard-tier capacity unit — each TU gives up to <b>1 MB/s or 1,000 events/s ingress</b> and <b>2 MB/s or 4,096 events/s egress</b>, purchased per namespace (up to 40) and shared across its hubs.' },
          { q: 'Can you change partition count after creation?', a: 'No — it\'s fixed at creation and cannot be decreased (and historically not increased on Standard). Size for peak up front.' },
        ]),
    },

    { id: 'azure03', num: '03', icon: '🧩', title: 'Partitions & partition keys', idea: 'The partition key fixes per-key order; partition count is permanent, so plan it.',
      tabs: T(
        `<h3>Keying</h3>
         <p>Send with a <b>partition key</b> and Event Hubs hashes it to a partition — same key → same partition →
         <b>order preserved per key</b>. Keying on <code>{KEY}</code> keeps each {ENTITY}'s events ordered. Omit the key
         and events round-robin for max spread (no per-key order).</p>`,
        `<h3>Partition key vs partition id</h3>
         ${compareTable(['Approach', 'Order', 'Use'], [
           ['Partition key (hash)', 'per key', 'normal — keep {KEY} events ordered'],
           ['No key (round-robin)', 'none', 'max throughput, order irrelevant'],
           ['Explicit partition id', 'per partition', 'rare — manual placement'],
         ])}
         <div class="lx-callout lx-warn"><b>Partitions are permanent.</b><div>Unlike Kafka you can't add/decrease them later — pick enough for
         peak {ENTITY} throughput and consumer parallelism from day one.</div></div>`,
        `<h3>Choosing {KEY} for {ID}</h3>
         <p>Key on <code>{KEY}</code> so one {ENTITY}'s events stay ordered (needed for correct stateful logic). A
         viral {ENTITY} can create a hot partition — mitigate with a composite key. The real key-skew dynamics are
         explorable in the <b>Kafka → Partition Simulator</b>.</p>`,
        [
          { q: 'How does Event Hubs preserve ordering?', a: 'Within a <b>partition</b>, by sequence number. Send related events with the same partition key so they land on the same partition and stay ordered; there\'s no global order across partitions.' },
          { q: 'Why is partition count such a big decision?', a: 'It\'s <b>permanent</b> (can\'t decrease, and not freely increased) and it caps consumer parallelism. Too few throttles parallelism; too many wastes resources. Size for peak.' },
          { q: 'What happens if you don\'t set a partition key?', a: 'Events are distributed round-robin for maximum spread, but you lose per-key ordering — fine only when order doesn\'t matter.' },
        ]),
    },

    { id: 'azure04', num: '04', icon: '📤', title: 'Producers (SDK, AMQP, Kafka)', idea: 'Batch events; use AMQP SDKs or point existing Kafka producers at Event Hubs.',
      tabs: T(
        `<h3>Ways to send</h3>
         <ul class="clean">
           <li><b>Azure SDKs (AMQP):</b> <code>EventHubProducerClient</code> with event <b>batches</b> for throughput.</li>
           <li><b>Kafka protocol:</b> existing Kafka producers work by changing only the bootstrap endpoint + SASL config.</li>
           <li><b>HTTPS</b> for simple senders.</li>
         </ul>
         <div class="lx-keypoints"><div class="lx-kp-h">Capacity per TU (Standard)</div><ul class="clean">
           <li>Ingress: up to <b>1 MB/s or 1,000 events/s</b>.</li>
           <li>Egress: up to <b>2 MB/s or 4,096 events/s</b>.</li>
           <li>Up to <b>40 TU</b> per namespace; <b>Auto-inflate</b> raises TUs under load.</li>
         </ul></div>`,
        `<h3>Batching with the SDK</h3>
         ${codeBlock('python', `producer = EventHubProducerClient.from_connection_string(cs, eventhub_name="{ENTITY}")
batch = producer.create_batch(partition_key="{KEY}")
for e in events:
    batch.add(EventData(json.dumps(e)))     # fills until the batch is full
producer.send_batch(batch)                  # one network round-trip`)}
         <div class="lx-callout lx-info"><b>Batch for throughput.</b><div>Sending one event per call wastes capacity; batching amortizes overhead and
         is how you approach the TU limits.</div></div>`,
        `<h3>Producing the {ENTITY} stream</h3>
         <p>High-volume {ENTITY} producers batch events with <code>partition_key="{KEY}"</code> to preserve per-{ENTITY}
         order, and Auto-inflate absorbs surges. Teams with existing Kafka producers just repoint them at the Event
         Hubs Kafka endpoint — no rewrite.</p>`,
        [
          { q: 'How do you get high throughput from producers?', a: 'Use <b>event batches</b> (one send per batch), set an appropriate partition key, and ensure enough TUs/partitions. Batching amortizes per-request overhead toward the 1 MB/s-per-TU ingress limit.' },
          { q: 'Can existing Kafka producers write to Event Hubs?', a: 'Yes — Event Hubs exposes a <b>Kafka endpoint</b>, so Kafka producers work by changing only the bootstrap server + SASL settings. No code rewrite.' },
          { q: 'What does Auto-inflate do?', a: 'It automatically increases <b>Throughput Units</b> (up to a cap) when ingress/egress approaches limits — absorbing bursts. It does not change partition count.' },
        ]),
    },

    { id: 'azure05', num: '05', icon: '📥', title: 'Consumers, groups & checkpointing', idea: 'Consumer groups give independent views; the Event Processor checkpoints to Blob.',
      tabs: T(
        `<h3>Reading</h3>
         <p>A <b>consumer group</b> is an independent view of the whole hub, each tracking its own positions
         (Standard allows <b>20</b> per hub). Within a group, each partition is read by one active consumer (ordering)
         — mirroring a Kafka consumer group.</p>`,
        `<h3>Checkpointing</h3>
         ${compareTable(['Concept', 'Kafka/KCL analog', 'Stored in'], [
           ['Consumer group', 'consumer group', '—'],
           ['Event Processor', 'KCL worker set', '—'],
           ['Checkpoint', 'committed offset', 'Azure Blob container'],
         ])}
         <p>The <b>Event Processor</b> balances partitions across instances and checkpoints progress to a <b>Blob
         Storage container</b> — the Azure analog of the KCL's DynamoDB lease table.</p>`,
        `<h3>Consuming {ID}</h3>
         <p>A fraud service and a dashboard each use their own consumer group on the <b>{ENTITY}</b> hub, so they read
         all {ENTITY} events independently at their own positions. The Event Processor checkpoints after each {ENTITY}
         batch, so a restart resumes without reprocessing from the start.</p>`,
        [
          { q: 'What is a consumer group in Event Hubs?', a: 'An independent view of the entire hub with its own positions — multiple groups read the same events independently (Standard allows 20 per hub). Same concept as a Kafka consumer group.' },
          { q: 'Where are checkpoints stored and why?', a: 'In a <b>Blob Storage container</b> by the Event Processor, so partition ownership and progress survive restarts and balance across instances — analogous to KCL\'s DynamoDB lease table.' },
          { q: 'How is per-partition ordering maintained with multiple consumers?', a: 'Within a consumer group, each partition is owned by one active consumer at a time, so events in a partition are processed in order.' },
        ]),
    },

    { id: 'azure06', num: '06', icon: '📡', title: 'Offsets, sequence numbers & replay', idea: 'Each event has an offset + sequence number; rewind to reprocess.',
      tabs: T(
        `<h3>Positions</h3>
         <p>Each event carries an <b>offset</b>, a <b>sequence number</b>, and an enqueued time within its partition.
         Consumers can start from the beginning, from <code>@latest</code>, or from a specific offset/sequence/timestamp
         — that's how you <b>replay</b>, within retention.</p>`,
        `<h3>Starting positions</h3>
         ${compareTable(['Start from', 'Meaning', 'Use'], [
           ['Earliest', 'oldest retained event', 'full reprocess / backfill'],
           ['@latest', 'only new events', 'live tail'],
           ['Timestamp', 'enqueued-time cutoff', 'replay since an incident'],
           ['Offset/sequence', 'exact position', 'resume precisely'],
         ])}
         <div class="lx-callout lx-info"><b>Same idea, three clouds.</b><div>Kafka offset = Kinesis sequence number = Event Hubs offset/sequence.</div></div>`,
        `<h3>Replaying {ID}</h3>
         <p>After fixing a consumer bug, restart the {ENTITY} consumer from a <b>timestamp</b> just before the incident
         to reprocess affected {ENTITY} events — only possible while they're still within the hub's retention.</p>`,
        [
          { q: 'What identifies an event\'s position?', a: 'An <b>offset</b> and a <b>sequence number</b> within its partition (plus enqueued time). These are the equivalents of a Kafka offset / Kinesis sequence number.' },
          { q: 'How do you replay events?', a: 'Start a consumer from an earlier position — earliest, a timestamp, or a specific offset/sequence — and reprocess, provided the data is still within retention.' },
          { q: 'What limits how far back you can replay?', a: 'Retention: 1 h–7 d on Standard, up to 90 d on Premium/Dedicated. Beyond that, events are gone from the hub (use Capture/ADLS for longer history).' },
        ]),
    },

    { id: 'azure07', num: '07', icon: '⚙️', title: 'Scaling — TUs, PUs, CUs & Auto-inflate', idea: 'Capacity is bought in units; Auto-inflate grows them, partitions bound parallelism.',
      tabs: T(
        `<h3>Two independent dials</h3>
         <ul class="clean">
           <li><b>Capacity units</b> (TU/PU/CU) govern <b>throughput</b> (MB/s, events/s).</li>
           <li><b>Partition count</b> governs <b>parallelism</b> (concurrent consumers).</li>
         </ul>
         <p>Both matter: more TUs won't help with too few partitions, and many partitions won't help if TU-starved.</p>`,
        `<h3>Units by tier</h3>
         ${compareTable(['Tier', 'Unit', 'Autoscale'], [
           ['Standard', 'Throughput Unit (≤40/ns)', 'Auto-inflate (raise TUs to a cap)'],
           ['Premium', 'Processing Unit', 'scale PUs'],
           ['Dedicated', 'Capacity Unit', 'scale CUs'],
         ])}
         <div class="lx-callout lx-warn"><b>Auto-inflate ≠ partition change.</b><div>It raises TUs only; partition count stays fixed. Plan partitions for peak.</div></div>`,
        `<h3>Scaling {ID}</h3>
         <p>Size the {ENTITY} hub's partitions for peak {ENTITY} parallelism at creation, then let <b>Auto-inflate</b>
         handle TU growth during surges (e.g. rush-hour rides / a flash sale) up to a sensible cap to bound cost.</p>`,
        [
          { q: 'What are the two scaling dimensions and why both matter?', a: '<b>Capacity units</b> (throughput) and <b>partition count</b> (parallelism). Buying throughput can\'t help if too few partitions limit parallelism, and extra partitions can\'t help if you\'re throughput-starved.' },
          { q: 'What does Auto-inflate scale — and not scale?', a: 'It scales <b>Throughput Units</b> up to a cap automatically; it does <b>not</b> change partition count (which is fixed at creation).' },
          { q: 'TU vs PU vs CU?', a: 'Throughput Units = Standard, Processing Units = Premium, Capacity Units = Dedicated — increasing isolation, scale, and retention (up to 90 days on Premium/Dedicated).' },
        ]),
    },

    { id: 'azure08', num: '08', icon: '🗄️', title: 'Retention & Event Hubs Capture', idea: 'Keep events 1h–90d; Capture auto-lands them in Blob/ADLS, no code.',
      tabs: T(
        `<h3>Retention</h3>
         <p>Default/min <b>1 hour</b>; <b>Standard</b> up to <b>7 days</b>, <b>Premium/Dedicated</b> up to <b>90 days</b>.
         Retention bounds replay.</p>
         <h3>Capture</h3>
         <p><b>Event Hubs Capture</b> automatically writes the incoming stream to <b>Blob</b> or <b>ADLS</b> as Avro
         files on a size/time window — a no-code bridge to the lake (the counterpart of AWS Firehose → S3).</p>`,
        `<h3>Capture settings</h3>
         ${compareTable(['Setting', 'Effect'], [
           ['Time window', 'flush at least every N minutes'],
           ['Size window', 'flush when N MB buffered'],
           ['Destination', 'Blob container or ADLS Gen2'],
           ['Format', 'Avro (schema embedded)'],
         ])}
         <div class="lx-callout lx-info"><b>Hot + cold together.</b><div>Capture gives cheap long-term storage + batch analytics alongside your
         real-time consumers — without writing a consumer.</div></div>`,
        `<h3>{ID} history</h3>
         <p>The {ENTITY} hub keeps 24 h for live replay, while <b>Capture</b> continuously lands every {ENTITY} event in
         ADLS for long-term analytics and model training — the same dual speed/lake pattern as AWS.</p>`,
        [
          { q: 'What is Event Hubs Capture?', a: 'A built-in, no-code feature that automatically writes the incoming stream to Blob/ADLS as Avro on a time/size window — the Azure analog of Firehose → S3, used to feed the lake.' },
          { q: 'What are the retention limits?', a: 'Minimum/default 1 hour; Standard up to 7 days; Premium/Dedicated up to 90 days. For longer history, rely on Capture → ADLS.' },
          { q: 'Why use Capture if you already have consumers?', a: 'It gives durable long-term storage and a batch/analytics path with zero consumer code, decoupled from your real-time processing — hot and cold paths from one stream.' },
        ]),
    },

    { id: 'azure09', num: '09', icon: '📨', title: 'Kafka protocol on Event Hubs', idea: 'Run Kafka apps unchanged by repointing the bootstrap endpoint.',
      tabs: T(
        `<h3>Kafka without Kafka</h3>
         <p>Event Hubs exposes a <b>Kafka-protocol endpoint</b>, so Kafka producers/consumers, Kafka Connect, and many
         tools work by changing only connection settings (bootstrap server + SASL). You get a managed, broker-less
         experience while keeping Kafka code.</p>`,
        `<h3>What maps, what differs</h3>
         ${compareTable(['Kafka feature', 'On Event Hubs'], [
           ['Produce / consume', '✅ works unchanged'],
           ['Consumer groups', '✅ supported'],
           ['Kafka Connect', '✅ generally works'],
           ['Transactions / idempotent producer', '⚠️ verify current support'],
           ['Log compaction', '⚠️ differs / limited'],
           ['Admin / some APIs', '⚠️ partial'],
         ])}
         <div class="lx-callout lx-warn"><b>Check the matrix.</b><div>Core produce/consume maps cleanly; verify advanced features against the current
         compatibility docs before relying on them.</div></div>`,
        `<h3>Migrating {ID}</h3>
         <p>If the {ENTITY} pipeline already runs on Kafka, repoint producers/consumers at the Event Hubs Kafka endpoint
         to run on Azure with minimal change — then adopt native features (Capture, ASA) incrementally.</p>`,
        [
          { q: 'How can Kafka apps run on Event Hubs unchanged?', a: 'Event Hubs implements the <b>Kafka wire protocol</b>, so clients connect by changing only the bootstrap endpoint and SASL credentials — no code rewrite for core produce/consume.' },
          { q: 'What Kafka features might not work?', a: 'Some advanced features — certain transactions/idempotence, log compaction, and some admin APIs — differ or are limited. Always check the current compatibility matrix.' },
          { q: 'Why use the Kafka endpoint instead of native SDKs?', a: 'To reuse existing Kafka code/tooling and ease migration. New Azure-native apps may prefer the AMQP SDKs and native features (Capture, Schema Registry).' },
        ]),
    },

    { id: 'azure10', num: '10', icon: '⚖️', title: 'Event Hubs vs Kafka/MSK vs Kinesis', idea: 'Native Azure + Kafka protocol; fixed partitions; unit-based throughput.',
      tabs: T(
        `<h3>Cross-cloud comparison</h3>
         <p>All three are durable, partitioned logs with per-key ordering and replay. Differences are ecosystem,
         scaling model, and operations.</p>`,
        `<h3>Side by side</h3>
         ${compareTable(['Dimension', 'Event Hubs', 'Kafka/MSK', 'Kinesis'], [
           ['Unit', 'partition', 'partition', 'shard'],
           ['Scaling', 'TU/PU/CU + Auto-inflate', 'brokers/partitions', 'shards / on-demand'],
           ['Partition change', 'fixed at creation', 'can add', 'split/merge'],
           ['Kafka API', 'yes (protocol)', 'native', 'no'],
           ['Lake delivery', 'Capture', 'Connect sinks', 'Firehose'],
         ])}`,
        `<h3>Deciding for {ID}</h3>
         <p>On Azure already and want least ops for the <b>{ENTITY}</b> pipeline → <b>Event Hubs</b>. Need full Kafka
         features/portability → MSK or self-managed Kafka. The partitioning mental model is identical across all three.</p>`,
        [
          { q: 'One-line positioning of Event Hubs.', a: 'A managed, Azure-native partitioned log that <b>also speaks Kafka</b> — great on Azure with low ops, scaled by units, with partitions fixed at creation.' },
          { q: 'Biggest practical difference vs Kafka?', a: 'Partition count is <b>fixed at creation</b> (Kafka can add partitions), and throughput is bought as units rather than sized by brokers.' },
          { q: 'Does the Foundations mental model transfer?', a: 'Yes — partition = shard = partition; key→bucket ordering, consumer groups, offsets/replay, and watermarks all carry across unchanged.' },
        ]),
    },

    { id: 'azure11', num: '11', icon: '🧮', title: 'Azure Stream Analytics fundamentals', idea: 'Managed stream processing you write in SQL (SAQL), scaled by Streaming Units.',
      tabs: T(
        `<h3>SQL on streams</h3>
         <p><b>Azure Stream Analytics (ASA)</b> runs a SQL-like query continuously over streaming inputs
         (Event Hubs/IoT Hub) and writes to outputs (SQL, Blob/ADLS, Power BI, Event Hubs, Cosmos DB). Scale with
         <b>Streaming Units (SU)</b>.</p>`,
        `<h3>A query</h3>
         ${codeBlock('sql', `SELECT {KEY}, COUNT(*) AS cnt, System.Timestamp() AS windowEnd
INTO   dashboardOutput
FROM   {ENTITY}Input TIMESTAMP BY eventTime
GROUP BY {KEY}, TumblingWindow(minute, 5)`)}
         <p><code>TIMESTAMP BY</code> tells ASA to use <b>event time</b> (Foundations Module 06) rather than arrival time;
         <code>System.Timestamp()</code> gives the window's output time.</p>`,
        `<h3>ASA for {ID}</h3>
         <p>A single SAQL query computes 5-minute {ENTITY} counts per <code>{KEY}</code> and pushes them straight to a
         Power BI live dashboard — no consumer code, no cluster to manage, scaled by SUs.</p>`,
        [
          { q: 'What is Azure Stream Analytics?', a: 'A fully-managed service that runs a <b>SQL-like query (SAQL)</b> continuously over streaming inputs and writes to outputs, with built-in windowing and event-time handling, scaled by <b>Streaming Units</b>.' },
          { q: 'What does TIMESTAMP BY do?', a: 'It tells ASA to order and window by <b>event time</b> (a field in the event) instead of arrival time — the key to correct, reproducible results with out-of-order data.' },
          { q: 'How do you scale an ASA job?', a: 'By allocating more <b>Streaming Units</b> and ensuring the query is partition-parallel (e.g. <code>PARTITION BY</code>) so SUs can be used; watch SU% utilization and watermark delay.' },
        ]),
    },

    { id: 'azure12', num: '12', icon: '🪟', title: 'Stream Analytics windowing', idea: 'Five window types: tumbling, hopping, sliding, session, snapshot.',
      tabs: T(
        `<h3>The five windows (validated)</h3>
         <ul class="clean">
           <li><b>Tumbling</b> — fixed, non-overlapping; each event in one window.</li>
           <li><b>Hopping</b> — fixed size, advances by a hop; overlaps (hop = size ⇒ tumbling).</li>
           <li><b>Sliding</b> — emits only when an event enters/leaves the window.</li>
           <li><b>Session</b> — groups events separated by gaps under a timeout (+ optional max duration).</li>
           <li><b>Snapshot</b> — groups events with the same exact timestamp.</li>
         </ul>`,
        `<h3>Picking a window</h3>
         ${compareTable(['Question', 'Window'], [
           ['Non-overlapping periodic totals', 'Tumbling'],
           ['Overlapping moving aggregates', 'Hopping / Sliding'],
           ['Activity bursts separated by idle gaps', 'Session'],
           ['Events sharing one timestamp', 'Snapshot'],
         ])}
         <div class="lx-callout lx-info"><b>Play with it.</b><div>The Foundations <b>Window animator</b> (Module 08) shows tumbling vs sliding
         interactively — the same semantics ASA implements.</div></div>`,
        `<h3>Windowing {ID}</h3>
         <p>Use a <b>tumbling</b> 5-minute window for {ENTITY} dashboards, a <b>hopping</b> window for a moving average,
         and a <b>session</b> window to group each {ENTITY}'s activity burst (a trip / a shopping session) separated by
         inactivity.</p>`,
        [
          { q: 'Name the Stream Analytics window types.', a: '<b>Tumbling, hopping, sliding, session, and snapshot</b> — the only aggregation becomes finite by bounding the unbounded stream into these windows.' },
          { q: 'Tumbling vs hopping vs sliding?', a: 'Tumbling: fixed, non-overlapping. Hopping: fixed size advancing by a hop (overlaps; hop=size ⇒ tumbling). Sliding: outputs only when the window contents change (an event enters/leaves).' },
          { q: 'When is a session window right?', a: 'When you want to group bursts of activity separated by inactivity — e.g. a user\'s browsing session or one {ENTITY}\'s trip — using a gap timeout (and optional max duration).' },
        ]),
    },

    { id: 'azure13', num: '13', icon: '⏱️', title: 'Event time, watermarks & late data', idea: 'TIMESTAMP BY sets event time; tune late-arrival and out-of-order tolerances.',
      tabs: T(
        `<h3>Correctness over arrival order</h3>
         <p>With <code>TIMESTAMP BY</code>, ASA orders by <b>event time</b> and advances an internal watermark. You
         configure two policies to handle imperfect streams.</p>`,
        `<h3>The two policies</h3>
         ${compareTable(['Policy', 'What it controls', 'Trade-off'], [
           ['Late arrival tolerance', 'how long to wait for stragglers', 'higher = more correct, more latency'],
           ['Out-of-order tolerance', 'how much reordering to buffer & sort', 'higher = more correct, more latency/memory'],
         ])}
         <div class="lx-callout lx-info"><b>Same dial as watermarks.</b><div>These tolerances are ASA's version of the allowed-lateness dial from
         Foundations Module 07 — try the watermark simulator there.</div></div>`,
        `<h3>Late {ENTITY} events</h3>
         <p>Mobile {ENTITY} events arrive late when a device loses signal. Set a late-arrival tolerance that catches
         most stragglers (e.g. a few minutes) so {ENTITY} window counts are correct, accepting a little extra latency
         before results finalize.</p>`,
        [
          { q: 'How does ASA handle out-of-order events?', a: 'Via <code>TIMESTAMP BY</code> plus <b>late arrival</b> and <b>out-of-order</b> tolerance policies — it buffers and reorders within the tolerance and either adjusts or drops events beyond it. This is ASA\'s watermark/allowed-lateness mechanism.' },
          { q: 'Why use event time instead of arrival time?', a: 'For <b>correct, reproducible</b> results regardless of pipeline delays — bucketing by arrival time makes results depend on how fast the system ran (and breaks on reprocessing).' },
          { q: 'What\'s the cost of higher tolerance?', a: 'More <b>latency</b> (you wait longer before finalizing) and more <b>memory</b> (buffering). It\'s the same correctness-vs-latency trade-off as the watermark lateness dial.' },
        ]),
    },

    { id: 'azure14', num: '14', icon: '🔌', title: 'Inputs, outputs & reference data', idea: 'Join a fast stream against slow reference data; fan results to many sinks.',
      tabs: T(
        `<h3>Wiring ASA</h3>
         <ul class="clean">
           <li><b>Streaming inputs:</b> Event Hubs, IoT Hub, Blob.</li>
           <li><b>Reference data:</b> slow-changing lookup (Blob/SQL) joined to the stream.</li>
           <li><b>Outputs:</b> SQL, Blob/ADLS, Power BI, Event Hubs, Cosmos DB, Functions.</li>
         </ul>`,
        `<h3>Stream–table join</h3>
         ${codeBlock('sql', `SELECT e.{KEY}, e.amount, r.tier
INTO   enrichedOutput
FROM   {ENTITY}Input e TIMESTAMP BY eventTime
JOIN   referenceData r ON e.{KEY} = r.{KEY}`)}
         <div class="lx-callout lx-info"><b>Enrichment pattern.</b><div>Joining a fast stream to a bounded reference table (customer tier, device
         metadata) is one of the most common real patterns.</div></div>`,
        `<h3>Enriching {ID}</h3>
         <p>Join each {ENTITY} event to reference data keyed on <code>{KEY}</code> (e.g. a {ENTITY}'s tier or profile),
         then fan results to Power BI (live), Cosmos DB (serving), and ADLS (history) from one query.</p>`,
        [
          { q: 'What is reference data in ASA?', a: 'A slow-changing, bounded dataset (in Blob/SQL) that you <b>join</b> to the streaming input to enrich events — e.g. attaching customer/device metadata keyed on {KEY}.' },
          { q: 'Can one ASA job write to several outputs?', a: 'Yes — a single query can <code>INTO</code> multiple outputs (Power BI, SQL, ADLS, Event Hubs, Cosmos), serving live, serving, and lake paths together.' },
          { q: 'What is a stream–table join?', a: 'Joining an unbounded stream to a bounded table (reference data). It\'s the enrichment workhorse — fast events gain context from slowly-changing lookups.' },
        ]),
    },

    { id: 'azure15', num: '15', icon: 'λ', title: 'Azure Functions & other processing', idea: 'Serverless per-batch processing with the Event Hubs trigger; Synapse/Databricks for heavy jobs.',
      tabs: T(
        `<h3>When ASA isn't the fit</h3>
         <ul class="clean">
           <li><b>Azure Functions</b> — Event Hubs trigger invokes your function with <b>batches</b>, managing checkpoints. For custom per-event logic (the Azure analog of Lambda ESM).</li>
           <li><b>Azure Databricks</b> — Spark Structured Streaming for complex stateful pipelines (own section).</li>
           <li><b>Synapse / Fabric</b> — analytics + real-time intelligence.</li>
         </ul>`,
        `<h3>Functions Event Hubs trigger</h3>
         ${compareTable(['Setting', 'Effect'], [
           ['Batch (maxBatchSize)', 'events per invocation'],
           ['Checkpoint', 'after a successful batch, per partition'],
           ['Scale', 'instances scale with partitions'],
         ])}
         <div class="lx-callout lx-warn"><b>Poison events.</b><div>The trigger checkpoints after success; a repeatedly-failing event can block a
         partition — add retry limits and a dead-letter path.</div></div>`,
        `<h3>Custom {ID} logic</h3>
         <p>For bespoke per-{ENTITY} logic (enrich + write to Cosmos), an Azure Function on the {ENTITY} hub processes
         batches per partition and checkpoints to Blob — scaling instances with partition count.</p>`,
        [
          { q: 'When choose Functions over Stream Analytics?', a: 'When you need <b>arbitrary custom code</b> per event/batch rather than SQL windowing — e.g. calling external services, complex branching. ASA is best for declarative windowed aggregations/joins.' },
          { q: 'How does the Functions Event Hubs trigger scale?', a: 'It scales instances with <b>partition count</b> (one active processor per partition), processing events in batches and checkpointing to Blob after success.' },
          { q: 'What processes heavy stateful pipelines on Azure?', a: '<b>Azure Databricks</b> (Spark Structured Streaming) or Synapse — for large stateful joins, ML, and lakehouse workloads beyond ASA/Functions.' },
        ]),
    },

    { id: 'azure16', num: '16', icon: '📋', title: 'Schema management', idea: 'The Event Hubs Schema Registry keeps producers and consumers compatible.',
      tabs: T(
        `<h3>Schemas on Azure</h3>
         <p>The <b>Azure Schema Registry</b> (hosted in an Event Hubs namespace) stores Avro/JSON schemas and enforces
         <b>compatibility</b> as events evolve — the same role as AWS Glue / Confluent registries. Clients embed a
         schema id in the payload and validate against the registry.</p>`,
        `<h3>Compatibility</h3>
         ${compareTable(['Mode', 'Meaning', 'Safe change'], [
           ['Backward', 'new consumers read old data', 'add optional / remove field'],
           ['Forward', 'old consumers read new data', 'add field / remove optional'],
           ['Full', 'both directions', 'add/remove optional only'],
         ])}
         <div class="lx-callout lx-info"><b>Compact payloads.</b><div>Only a schema id travels with each event; consumers fetch & cache the schema.</div></div>`,
        `<h3>Evolving the {ENTITY} event</h3>
         <p>Add a new optional field to the <b>{ENTITY}</b> event under <b>backward</b> compatibility: deploy producers
         first, existing consumers keep working, then upgrade consumers on their own schedule — no big-bang release.</p>`,
        [
          { q: 'What does the Azure Schema Registry do?', a: 'Stores event schemas (Avro/JSON) in an Event Hubs namespace and enforces <b>compatibility</b> so producer changes can\'t silently break consumers — one source of truth for event shapes.' },
          { q: 'Backward vs forward compatibility?', a: 'Backward = new consumers read old data (upgrade consumers freely). Forward = old consumers read new data (upgrade producers freely). Full = both.' },
          { q: 'Does the whole schema travel with each event?', a: 'No — only a compact schema id; consumers resolve and cache the actual schema from the registry.' },
        ]),
    },

    { id: 'azure17', num: '17', icon: '🔐', title: 'Security', idea: 'Entra ID + managed identities, TLS, RBAC/SAS, and private endpoints.',
      tabs: T(
        `<h3>The layers</h3>
         <ul class="clean">
           <li><b>AuthN/Z:</b> prefer <b>Microsoft Entra ID</b> + <b>managed identities</b> with RBAC roles (Event Hubs Data Sender/Receiver) over SAS keys.</li>
           <li><b>Encryption:</b> TLS in transit; at-rest with customer-managed keys (Premium/Dedicated).</li>
           <li><b>Network:</b> <b>Private Endpoints</b> + firewall rules to keep traffic private.</li>
         </ul>`,
        `<h3>RBAC roles</h3>
         ${compareTable(['Role', 'Grants'], [
           ['Event Hubs Data Sender', 'send events'],
           ['Event Hubs Data Receiver', 'read events'],
           ['Event Hubs Data Owner', 'full data plane'],
         ])}
         <div class="lx-callout lx-info"><b>Prefer identities over SAS.</b><div>Managed identities avoid long-lived shared keys and integrate with
         Entra ID auditing and rotation.</div></div>`,
        `<h3>Securing {ID}</h3>
         <p>{ENTITY} events may carry PII: give producers the <b>Data Sender</b> role via managed identity, consumers
         <b>Data Receiver</b>, encrypt with a customer-managed key, and expose the hub only through a Private Endpoint so
         {ENTITY} data stays off the public internet.</p>`,
        [
          { q: 'Why prefer Entra ID / managed identities over SAS keys?', a: 'They avoid long-lived shared secrets, support fine-grained RBAC (Sender/Receiver), and integrate with central auditing and rotation — least privilege without key sprawl.' },
          { q: 'How do you isolate Event Hubs on the network?', a: 'Use <b>Private Endpoints</b> and firewall/IP rules so traffic stays on the private network and the hub isn\'t reachable from the public internet.' },
          { q: 'What RBAC roles would a producer and consumer get?', a: 'Producer → <b>Event Hubs Data Sender</b>; consumer → <b>Event Hubs Data Receiver</b>. Never a single all-powerful key shared across the pipeline.' },
        ]),
    },

    { id: 'azure18', num: '18', icon: '📊', title: 'Observability with Azure Monitor', idea: 'Watch incoming/outgoing, throttled requests, and watermark delay.',
      tabs: T(
        `<h3>The signals</h3>
         <ul class="clean">
           <li><b>Throttled Requests</b> — exceeding purchased TUs; scale up / Auto-inflate.</li>
           <li><b>Incoming/Outgoing Messages & Bytes</b> — throughput in/out.</li>
           <li><b>Consumer lag</b> — how far behind a group is (watch per partition).</li>
           <li><b>ASA:</b> SU% utilization, <b>watermark delay</b>, input/output events, runtime errors.</li>
         </ul>`,
        `<h3>What to alarm on</h3>
         ${compareTable(['Signal', 'Means', 'Action'], [
           ['Throttled Requests > 0', 'TU-starved', 'add TUs / Auto-inflate'],
           ['Watermark delay rising (ASA)', 'job falling behind', 'add SUs / optimize query'],
           ['SU% near 100', 'ASA saturated', 'scale out / partition query'],
           ['Consumer lag rising', 'consumer behind', 'scale consumers / fix code'],
         ])}`,
        `<h3>Watching {ID}</h3>
         <p>Alarm on {ENTITY}-hub throttling and ASA <b>watermark delay</b>. During a surge of {ENTITY} activity these
         catch trouble early — before the Power BI dashboard goes stale.</p>`,
        [
          { q: 'What\'s the lag signal for an ASA job?', a: '<b>Watermark delay</b> — how far event-time progress trails wall-clock. Rising watermark delay (or SU% near 100) means ASA is falling behind; add SUs or optimize the query.' },
          { q: 'How do you know you\'re TU-starved?', a: 'The <b>Throttled Requests</b> metric climbs. Fix by adding Throughput Units, enabling Auto-inflate, or moving to a higher tier.' },
          { q: 'Why watch per-partition consumer lag?', a: 'Skew: one partition can be far behind while the average looks fine — per-partition lag reveals hot-key problems.' },
        ]),
    },

    { id: 'azure19', num: '19', icon: '🛟', title: 'Reliability, geo-DR & failure handling', idea: 'Idempotent sinks, retries, and Event Hubs Geo-DR for regional resilience.',
      tabs: T(
        `<h3>Patterns on Azure</h3>
         <ul class="clean">
           <li><b>Throttling:</b> retry with backoff; Auto-inflate / more TUs.</li>
           <li><b>Idempotent sinks:</b> upsert by {KEY} so replays/duplicates don't corrupt.</li>
           <li><b>Geo-DR:</b> pairs namespaces with an alias for <b>metadata</b> failover.</li>
           <li><b>ASA:</b> built-in checkpointing restarts without losing state.</li>
         </ul>`,
        `<h3>Geo-DR — read the fine print</h3>
         ${compareTable(['Capability', 'Reality'], [
           ['Alias + namespace pairing', 'fail over connection via a stable alias'],
           ['What fails over', 'metadata/config (entities, consumer groups)'],
           ['What may NOT', 'buffered event data isn\'t guaranteed to replicate'],
         ])}
         <div class="lx-callout lx-warn"><b>DR ≠ zero data loss.</b><div>Event Hubs Geo-DR fails over configuration, not necessarily in-flight event
         data — design for possible loss of un-replicated events.</div></div>`,
        `<h3>Resilient {ID}</h3>
         <p>Make the {ENTITY} sink idempotent (upsert by {KEY}), retry on throttling, and configure Geo-DR so the
         {ENTITY} pipeline can fail over to a paired region — accepting that in-flight {ENTITY} events may need replay
         from Capture/ADLS.</p>`,
        [
          { q: 'What does Event Hubs Geo-DR actually fail over?', a: 'Primarily <b>metadata/configuration</b> via a stable alias (entities, consumer groups). It does <b>not</b> guarantee replication of buffered event data — so design for possible loss of in-flight events.' },
          { q: 'How do you make reprocessing safe?', a: 'Idempotent sinks — upsert keyed by {KEY}/event id — so retries and replays converge to the correct state instead of double-counting.' },
          { q: 'How does ASA recover from failure?', a: 'Via built-in <b>checkpointing</b> — it restarts and resumes its windowed state without losing it or reprocessing incorrectly.' },
        ]),
    },

    { id: 'azure20', num: '20', icon: '💵', title: 'Cost model', idea: 'Pay for units (TU/PU/CU), ASA Streaming Units, and Capture/storage.',
      tabs: T(
        `<h3>Where the money goes</h3>
         <ul class="clean">
           <li><b>Event Hubs:</b> per <b>TU-hour</b> (Standard, + ingress events) / <b>PU-hour</b> (Premium) / <b>CU-hour</b> (Dedicated).</li>
           <li><b>Capture:</b> extra per-hour charge when enabled.</li>
           <li><b>Stream Analytics:</b> per <b>Streaming-Unit-hour</b>.</li>
           <li><b>Storage/egress:</b> Blob/ADLS for captured data; cross-region egress.</li>
         </ul>`,
        `<h3>Cost levers</h3>
         ${compareTable(['Lever', 'Effect'], [
           ['Right-size TU/SU + Auto-inflate cap', 'avoid idle capacity & runaway scale'],
           ['Batch producers', 'fewer requests, better TU use'],
           ['Trim retention', 'pay for only the replay you need'],
           ['Right-size ASA SUs', 'match compute to query load'],
         ])}
         <div class="lx-callout lx-info"><b>Numbers drift.</b><div>Price against the current Azure calculator; reason about the model\'s shape.</div></div>`,
        `<h3>Costing {ID}</h3>
         <p>For a steady {ENTITY} stream: right-size TUs with an Auto-inflate cap, batch {ENTITY} producers, keep 24 h
         retention plus Capture for history, and size ASA SUs to the query — the cheapest correct configuration.</p>`,
        [
          { q: 'What drives Event Hubs cost?', a: 'Primarily capacity-unit-hours (TU/PU/CU) plus ingress events and optional Capture; Premium/Dedicated cost more but add isolation and longer retention.' },
          { q: 'How is ASA billed?', a: 'Per <b>Streaming-Unit-hour</b> — so right-size SUs to the query\'s load and make the query partition-parallel so SUs are actually used.' },
          { q: 'Name two quick cost wins.', a: 'Cap Auto-inflate to bound TU growth, and batch producers to use each TU efficiently. Trimming retention and relying on Capture for history also helps.' },
        ]),
    },

    { id: 'azure21', num: '21', icon: '🏗️', title: 'End-to-end reference architecture', idea: 'Sources → Event Hubs → Stream Analytics/Functions → sinks + Capture, observed.',
      tabs: T(
        `<h3>The canonical Azure shape</h3>
         <div id="azure21-pipeline"></div>
         <ol class="clean">
           <li><b>Ingest:</b> {ENTITY} apps → Event Hubs, keyed on <code>{KEY}</code> (or via the Kafka endpoint).</li>
           <li><b>Process:</b> Stream Analytics for SQL windowing/joins; Functions for custom per-event logic.</li>
           <li><b>Deliver:</b> Power BI (live), SQL/Cosmos (serving), and <b>Capture → ADLS</b> for the lake.</li>
           <li><b>Observe:</b> Azure Monitor on throttling, watermark delay, SU%, consumer lag.</li>
         </ol>`,
        `<h3>Dual-path (speed + lake)</h3>
         ${compareTable(['Path', 'Services', 'Latency'], [
           ['Speed layer', 'Event Hubs → ASA/Functions → serving', 'seconds'],
           ['Lake layer', 'Event Hubs → Capture → ADLS → Synapse', 'minutes+'],
         ])}
         <div class="lx-callout lx-ok"><b>Same backbone, Azure flavor.</b><div>Identical shape to AWS — different service names. Databricks next shows
         the lakehouse take.</div></div>`,
        `<h3>The {ID} platform</h3>
         <p>End to end: {ENTITY} events → Event Hubs (keyed on {KEY}) → Stream Analytics (windowed metrics) → Power BI +
         Cosmos for live {ENTITY} decisions, with Capture → ADLS feeding analytics. Azure Monitor alarms on watermark
         delay keep it healthy.</p>`,
        [
          { q: 'Walk through an end-to-end Azure streaming architecture.', a: 'Producers → <b>Event Hubs</b> (keyed log) → <b>Stream Analytics/Functions</b> (processing) → <b>Power BI/Cosmos/SQL</b> (serving) for live answers and <b>Capture → ADLS</b> for the lake, with <b>Azure Monitor</b> throughout.' },
          { q: 'Why have both a speed layer and a lake layer?', a: 'Speed for low-latency live decisions; lake for cheap, replayable history and analytics/ML. Capture → ADLS feeds the lake while ASA/Functions serve the speed path.' },
          { q: 'How is this the same as the vendor-neutral architecture?', a: 'Identical backbone — sources → log → stateful processing → sinks, observed — realized in Azure services (Event Hubs, ASA/Functions, Capture/ADLS, Azure Monitor).' },
        ]),
    },
  ],
};
