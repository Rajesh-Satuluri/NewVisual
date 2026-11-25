# Spark Structured Streaming — Simulation Engines: Inventory & Honesty Ledger

A living record of the deterministic simulation engines (the honest keystones) and
exactly what is *real algorithm* vs *labelled simulation*. Updated each engine atom.
Mirrors `kafka/sim/PRESERVATION.md`.

- **Principle:** never fake anything. Engines are pure JS, deterministic, and unit-
  tested with `node --test`. No fake clusters, no fake code execution.

---

## Inventory

| Engine | File | Status | Tests |
|---|---|---|---|
| **A — Micro-batch incremental execution** | `microbatch-engine.js` | **shipped (E1)** | `microbatch-engine.test.mjs` — 18/18 ✅ |
| B — Checkpoint / offset-log recovery | `checkpoint-engine.js` | planned (E2) | — |
| C — Stream–stream join | `stream-join-engine.js` | planned (E3) | — |

Run all: `node --test spark-streaming/sim/*.test.mjs`

---

## Engine A — micro-batch execution (E1)

**What it computes, faithfully to Spark's documented semantics:**

- **Trigger planning** (`planBatches`): `once`, `availableNow` (optional
  `maxEventsPerBatch`), `processingTime` (bucket by arrival interval, empty
  intervals included as no-op batches).
- **Watermark**: `max(eventTime seen) − delay`, **monotonic non-decreasing**,
  computed at batch end, used as the drop/close threshold at the next batch start.
- **Late-data drop**: `eventTime < watermark` ⇒ dropped and counted
  (append/update only).
- **Windows**: tumbling + sliding (`[start, end)`, end exclusive, `⌈size/slide⌉`
  overlaps) and session (merge within `gap`, split at the boundary).
- **State + eviction**: per `(groupBy, window)` aggregate; evicted once the
  watermark passes the window end (append/update). Aggregators: count/sum/min/max.
- **Output modes**: `append` (emit a window once on close, then evict), `update`
  (emit only rows changed this batch), `complete` (emit the full table every batch;
  **no drop, no eviction — state is unbounded**, a deliberate teaching contrast).

**Output:** a per-batch trace (`watermarkBefore/After`, `dropped`, `emitted`,
`state`) suitable for driving the Micro-Batch / Watermark / Output-Mode labs and
modules M05/M08/M09/M10/M12/M13/M21/M22.

**Honesty:** this is a *model* of Spark's semantics, not a running Spark job — but
the semantics (watermark math, late-drop boundary, window assignment, mode
emission) match the programming guide and are unit-tested against hand-computed
vectors. No executors, no network, no real cluster.

---

## Real vs simulated

| Capability | This build | Notes |
|---|---|---|
| Watermark / late-drop / window / output-mode semantics | **Real algorithm** | Matches Spark docs; 18 unit tests |
| Checkpoint / offset-log recovery | planned (E2) | deterministic model |
| Stream–stream join | planned (E3) | deterministic model |
| Code execution | not planned | snippets are static + labelled |
| Real Spark cluster | out of scope | needs a backend |

---

## Build log

- **E1** — `microbatch-engine.js` + 18 Node tests. No UI route yet; payoff lands
  in L1 (Output-Mode Lab) and the window/watermark modules.
