# Progress Model

> Phase 0 audit deliverable. Verified against `data/progress-store.js`,
> `data/catalog.js`, and `modules/dashboard.js`.

## Storage

- **Lab progress:** `localStorage` under the `sml-*` namespace
  (`sml-done`, `sml-visited`, `sml-theme`, `sml-scenario`). Browser-local, no
  account/backend — this is communicated to the learner.
- **Ported apps:** Kafka and Flink persist to their own original `kafka-*` /
  `flink-*` keys (byte-identical, untouched).

## API (`progress-store.js`)

`markDone`, `unmarkDone`, `isDone`, `markVisited`, `isVisited`, `progress(ids)`.

## States

Today the model distinguishes **not-started / visited / done** (manual
completion). Richer states (needs-revision, assessed proficiency) are planned
with the interview/quiz work (Phase 4).

## Dashboard aggregation (`modules/dashboard.js`)

Reads `completables()` from `catalog.js` per section (`SECTION_META`:
foundations, aws, azure, databricks, incident) + `isDone`. Renders a progress
ring, per-track mastery meters, weak spots, recommended next.

## VERIFIED GAP → Phase 2

The dashboard currently aggregates **only lab-native `sml-*` sections**. Kafka
and Flink completion lives in `kafka-*` / `flink-*` and is **not** surfaced in
the unified dashboard. Phase 2 adds a read-only bridge so ported-app progress
feeds the same mastery view, plus export/import of `sml-*` progress.

## Migration safety

`sml-*` keys are versioned by namespace and never deleted by the lab. Ported
keys are never written by the lab. No silent deletion.
