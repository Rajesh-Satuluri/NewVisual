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

## Phase 2 — CLOSED ✅

The dashboard now aggregates **every course**. A read-only bridge
(`data/ported-progress.js`) reads the ported apps' own completion arrays —
`kafka-done` (22 modules) and `flink_done` (20 modules) — and renders Kafka and
Flink mastery rows alongside the `sml-*` sections. The bridge only READS those
keys (never writes), so preservation and the ported apps are untouched. Verified:
seeding `kafka-done=[m01,m02,m03]` / `flink_done=[m01,m02]` shows **Kafka 3/22**
and **Flink 2/20** in the unified mastery view, 0 console errors.

### Export / import

The dashboard offers **Export progress** (downloads a JSON of `sml-done`,
`sml-visited`, `sml-scenario`, `sml-theme`, `kafka-done`, `flink_done`) and
**Import progress** (restores from such a file, then reloads). This lets a
learner back up or move progress across devices — the file is validated
(`app: "streaming-master-lab"`) before import. Browser-local only; no account.

**DoD item "learning dashboard aggregates progress across every course" — met.**

## Migration safety

`sml-*` keys are versioned by namespace and never deleted by the lab. Ported
keys are never written by the lab. No silent deletion.
