# Flink Sim Engine — Honesty Ledger

`sim/engine.js` is a small, deterministic, dependency-free model of a few Flink
algorithms, used by the interactive labs. This file records exactly what is a
**real algorithm** versus a **labelled simulation**, so nothing is ever
presented as live that isn't.

| Capability | Status | Note |
|---|---|---|
| Key → key-group mapping (`keyGroupFor`) | **Real algorithm** | `murmurHash(key.hashCode()) % maxParallelism` — matches Flink's `KeyGroupRangeAssignment`. |
| Key-group → subtask (`subtaskForKeyGroup`) | **Real algorithm** | `keyGroup · parallelism / maxParallelism`, Flink's `computeOperatorIndexForKeyGroup`. |
| Default max parallelism (`defaultMaxParallelism`) | **Real formula** | `round(1.5·p)` clamped to `[128, 32768]`, rounded up to a power of two. |
| Rescaling / key movement (`rescale`) | **Real algorithm, modelled state** | Recomputes assignment at the new parallelism; key groups are the unit of redistribution. No actual state is transferred. |
| Watermark propagation (`operatorWatermark`) | **Real rule** | Operator watermark = `min()` over non-idle input partitions; `withIdleness()` modelled by exclusion. |
| Skew factor (`skewFactor`) | **Real metric** | `max/avg` keys per subtask. |
| A running cluster, network, checkpointing, real throughput | **Out of scope** | The labs never claim to run a job. They model the algorithms deterministically for teaching. |

Every lab surface carries an inline "Honesty ledger" note stating the same.

Tests: `node sim/engine.test.mjs` (24 assertions, all passing).
