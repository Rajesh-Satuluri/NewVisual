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

## 5. Open items / to-validate log

*(Populated as iterations run. Empty at I05 — no cloud content written yet.)*
