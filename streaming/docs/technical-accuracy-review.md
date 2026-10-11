# Technical Accuracy Review — Streaming Engineering Master Lab

> **Purpose (I05).** Technical accuracy is a release requirement. This doc sets the
> accuracy policy, the claims that need validation against official docs, and the
> per-curriculum verification checkpoints. It is updated at each cloud accuracy pass
> (I38 AWS, I44 Azure, I51 Databricks) and whenever a claim is validated.

## 1. Accuracy policy

1. **Never overstate delivery guarantees.** "Exactly-once" is always qualified:
   where it holds (within-system, with specific sink/transaction support), where it
   degrades to at-least-once, and the end-to-end conditions required. No blanket
   "Kafka/Flink gives you exactly-once."
2. **Never invent limits, quotas, benchmarks, or prices.** Any numeric claim is
   either (a) a cited official figure with a date, or (b) clearly labelled as an
   illustrative simulation assumption. Capacity calculator (I65) states every
   assumption.
3. **Real vs simulated honesty ledger.** Every simulator declares what is real
   algorithm vs deterministic simulation (Kafka's murmur2 is real; cluster/network
   is simulated). Carried from `kafka/sim/PRESERVATION.md`.
4. **Cite sources for cloud behavior.** AWS/Azure/Databricks specifics validated
   against current official documentation at port time; citations recorded here.

## 2. Inherited accuracy anchors (already verified in source apps)

| Anchor | Source | Status |
|--------|--------|--------|
| Kafka murmur2 partitioner | `kafka/sim/engine.js` — matches Apache Kafka published test vectors; 12/12 Node tests | **Verified** (preserved as-is) |
| Null-key sticky partitioner | `kafka/sim/engine.js` | **Verified** |
| PyFlink code snippets | `flink/data/pyflink-snippets.js` (+`.py`) | **Verified in source**; re-checked on port (I21) |
| Ride R-4471 narrative facts | `flink/data/ride-story.js` | Narrative device; no false perf claims to re-check |

## 3. Claims requiring validation before their gate ships

### 3.1 Foundations (I28–I37)
- Event-time vs processing-time semantics; watermark/lateness behavior — validate the
  simulator matches documented streaming semantics (vendor-neutral).
- Delivery-guarantee taxonomy (at-most / at-least / effectively-once) stated precisely.

### 3.2 AWS (validate at I38)
- Kinesis Data Streams: shard model, record ordering per shard, sequence numbers,
  retention window options, on-demand vs provisioned scaling behavior.
- MSK vs MSK Serverless vs Kinesis distinctions.
- Managed Service for Apache Flink (formerly Kinesis Data Analytics) capabilities.
- Firehose delivery semantics; Lambda event-source mapping behavior.
- **No invented quotas/limits** — cite current AWS docs with date.

### 3.3 Azure (validate at I44)
- Event Hubs: partitions, consumer groups, capture, throughput units / processing
  units, Kafka-protocol surface.
- Stream Analytics windowing & semantics; relationship to Event Hubs.

### 3.4 Databricks (validate at I51)
- Structured Streaming: micro-batch vs continuous, trigger modes, checkpointing,
  exactly-once sink conditions (Delta).
- Delta Live Tables; medallion (Bronze/Silver/Gold) as an architecture pattern, not
  a product guarantee.
- Autoloader semantics.

## 4. Review checkpoints

- Each cloud sub-gate opens with its accuracy pass updating this doc **before**
  module content is written, so modules cite validated facts from the start.
- Final acceptance (I80) re-scans for any unqualified "exactly-once" and any numeric
  claim lacking a citation or a "simulated assumption" label.

## 5. Validated facts log

### AWS (validated I38, 2026-10-11, against docs.aws.amazon.com / aws.amazon.com)
- **Kinesis shard capacity:** write **1 MB/s and 1,000 records/s** per shard (byte limit
  includes partition key); read **2 MB/s and 5 GetRecords tps** per shard, **shared**
  across consumers in the standard model. [Kinesis FAQs / key-concepts]
- **Enhanced fan-out:** each registered consumer gets a **dedicated 2 MB/s per shard**.
- **Retention:** default **24 hours**, extendable to **365 days** (8,760 h); >24 h costs extra.
- **Ordering:** guaranteed **within a shard**, by sequence number; not across shards.
- **On-demand vs provisioned:** on-demand auto-scales capacity (pay per throughput);
  provisioned = you manage shard count.
- **MSK:** managed Apache Kafka; **Provisioned** (you size brokers, full Kafka tooling /
  Connect / Schema Registry) vs **Serverless** (no capacity management, pay per throughput).
  Treat specific MSK Serverless throughput quotas as docs-current (state generally, not as
  hard guarantees).
- **Managed Service for Apache Flink** = the service formerly called Kinesis Data Analytics;
  runs Apache Flink apps managed.
- **Firehose (Amazon Data Firehose):** **near-real-time** delivery to S3/Redshift/OpenSearch/
  Splunk via **buffering** (size + interval, whichever hits first; S3 default 5 MB / 300 s).
  Stated as "near-real-time, buffered" — exact minimum interval has changed over time and is
  described qualitatively, not pinned to a number.
- **Lambda event-source mapping (Kinesis):** batch size default **100**, max **10,000**;
  **parallelization factor 1–10** (default 1); **maximum retry attempts default -1 = infinite**
  (finite 0–10,000); **bisect-on-error** splits a failing batch in two.

Sources: Kinesis Data Streams FAQs; streams/latest/dev key-concepts & kinesis-extended-retention;
MSK FAQs & kinesis-vs-msk compare page; Firehose FAQs & create-configure docs; Lambda
services-kinesis-parameters & API_CreateEventSourceMapping.

### Azure (validated I44, 2026-10-11, against learn.microsoft.com / azure.microsoft.com)
- **Event Hubs partitions:** max **32** (Basic/Standard), **100** (Premium), **1,024** (Dedicated);
  set at creation, **cannot be decreased** after. [event-hubs-quotas / scalability]
- **Throughput Unit (Standard):** ingress up to **1 MB/s or 1,000 events/s**; egress up to
  **2 MB/s or 4,096 events/s**; up to **40 TU per namespace**, shared; **Auto-inflate** scales TUs.
- **Premium = Processing Units (PU)**; **Dedicated = Capacity Units (CU)**.
- **Consumer groups:** Standard **20** per event hub (Basic 1, Premium 100, Dedicated 1,000).
- **Retention:** default/min **1 hour**; Standard max **7 days**; Premium/Dedicated max **90 days**.
- **Protocols:** native **Apache Kafka**, AMQP 1.0, HTTPS. **Event Hubs Capture** writes to Blob
  Storage or ADLS (Standard+).
- **Checkpointing:** Event Processor stores checkpoints in a Blob container (analog of KCL/DynamoDB).
- **Azure Stream Analytics windows:** **tumbling, hopping, sliding, session, snapshot** (5 types);
  output timestamp via `System.Timestamp()`; scale via **Streaming Units (SU)**; SAQL (SQL-like).
Sources: event-hubs-quotas, event-hubs-scalability, event-hubs-features, stream-analytics-window-functions.

### Databricks — pending (validate at I51)
