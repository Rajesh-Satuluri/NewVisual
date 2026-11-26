# Spark Structured Streaming — Content Build Plan

How we fill the scaffold to the **same depth as the Kafka tool**. This is the
*content* companion to `BUILD.md` (which covers architecture + the deploy/iteration
mechanics). Read `BUILD.md` §4 for the keystone-engine rationale; this document is
the module-by-module, bank-by-bank content specification and the parity targets.

- **Live:** https://rajesh-satuluri.github.io/NewVisual/spark-streaming/
- **Benchmark:** `kafka/` — 33 numbered modules, 3 tested keystone engines,
  ~100+ per-module interview Qs, 107 quiz Qs, 24 coding problems, 9 incidents,
  13 decisions, 12 tiered answers, large glossary/cheatsheet/master-map.
- **Narrative:** **ShopStream** — a high-traffic e-commerce store; orders +
  clickstream arrive out of order and late, turned into real-time revenue,
  sessionized browsing, fraud flags, and an exactly-once Delta lakehouse.

---

## 1. What "same depth as Kafka" actually means

Depth in the Kafka tool is **not** word count. It comes from four things, in order
of importance. Every Spark module/page must clear the same bar:

1. **An honest keystone.** The selling point of Kafka is that key→partition uses
   the *real* `murmur2` algorithm, verified against Apache's own test vectors —
   not a hand-wavy animation. Spark's equivalent is the **micro-batch incremental
   execution engine** (watermark, late-drop, state eviction, exact output-mode
   emission): a pure, deterministic, unit-tested engine whose outputs match
   Spark's documented semantics. No module ships a "simulation" of something the
   engine could compute for real.
2. **Interactive, deterministic visualizations.** Each teaching module has ≥1
   animated `<canvas>` with live controls (sliders/buttons) that *drives the
   keystone engine*, not a scripted cartoon. Same determinism rule: same inputs ⇒
   identical frames.
3. **One running story, everywhere.** Kafka threads "Amazon Prime Day" through
   every module. We thread **ShopStream** through every module, lab, question, and
   incident, with consistent numbers (250k events/s, 10s trigger, 5-min
   watermark, exactly-once to Delta).
4. **A full interview surface.** Per-module Q&A (with interview tips), plus the
   shared banks: quiz, coding problems, decision drills, incident labs, tiered
   answers, self-explain, mock interview, study hub, review center, dashboard.

### The anatomy of one teaching module (the contract)

Every numbered module (`m01`–`m22`) is a file `modules/mNN-<slug>.js` exporting
`mount(container)`, built with `createModuleShell({ tag, title, subtitle,
definition, tabs })` and ending its interactive tabs with `initTabs(container)`
and `initIQ(container)`. Required pieces:

| Piece | Standard (matches Kafka) |
|---|---|
| `tag` | `MNN · <group>` e.g. `M08 · Time & Windows` |
| `title` / `subtitle` | concept name + one-line "what & why" |
| `definition` | `{ formal, easy }` — rigorous definition **and** plain-terms restatement (the blue 📘 card) |
| **Concept tab** | prose + diagrams: the mechanism, not just the API |
| **≥1 Interactive tab** | animated canvas driven by a keystone engine, with controls + a caption + a "How it works / honesty" note |
| **ShopStream tab** | the concept applied to the running story, with real-looking numbers |
| **Code tab** | verified **PySpark** (primary) + **Scala** snippets, labelled, copy-able |
| **Interview Q&A tab** | `createIQSection(IQ)` — **10–15** questions, each `{ q, a, tip }`, senior level (4–8 yrs) |

Target size per teaching module: **25–45 KB** (Kafka's teaching modules sit at
27–48 KB; the flagship ones go higher).

---

## 2. Keystone engines (the honest core) — build these FIRST

These are the `murmur2` of this tool. Pure JS, no DOM, importable in the browser
and Node, deterministic, each with a `*.test.mjs` suite run by `node --test`.
Live in `spark-streaming/sim/`.

### Engine A — `sim/microbatch-engine.js` (the primary keystone)

Computes a streaming query **exactly**, the way Spark documents it. Inputs:
records `[{ eventTime, key, value }]`, a trigger spec, a watermark delay, a window
spec, an aggregation, and an output mode. Produces, per micro-batch:

- **Trigger planning** — which records fall in which batch (ProcessingTime /
  AvailableNow / Once).
- **Watermark** — `max(eventTime seen so far) − delay`, **monotonic
  non-decreasing**, applied at the **start** of the next batch.
- **Late-data drop** — records with `eventTime < currentWatermark` are dropped and
  counted (feeds the "numRowsDroppedByWatermark" style metric).
- **Windowing** — tumbling / sliding / session assignment per record.
- **State** — window→aggregate map, with **eviction** when `watermark > windowEnd`.
- **Emission** — the exact rows per batch under:
  - **append** — a window emitted once, only after watermark passes its end,
  - **update** — only rows whose value changed this batch,
  - **complete** — the entire result table every batch.

**Tests** (`sim/microbatch-engine.test.mjs`, target ≥15, mirrors engine.test.mjs):
monotonic watermark; late record dropped exactly at the boundary; append emits a
window once and never again; update emits only changed keys; complete re-emits
all; session windows merge on gap; determinism (same input ⇒ identical batch
trace); eviction frees state; empty batch is a no-op; sliding windows
double-count correctly; trigger types partition records correctly.

### Engine B — `sim/checkpoint-engine.js` (recovery keystone)

The **offset log + commit log (WAL)** and replay. Models: offsets written
*before* a batch, commits written *after*; on restart, replay from the last
committed offset. Demonstrates **exactly-once** (idempotent sink + checkpoint) vs
**at-least-once** (reprocess on crash) deterministically. Tests: clean restart
resumes at commit; crash between offset-write and commit reprocesses that batch;
idempotent sink dedups the reprocessed batch; offset log is append-only.

### Engine C — `sim/stream-join-engine.js` (join keystone, Iteration 4)

Stream–stream inner/outer join with **state buffering + join watermark +
eviction**. Tests: matched pairs emit once; outer-join null emitted only after
watermark expiry; state evicted past the join watermark; determinism.

> **Preservation:** `sim/PRESERVATION.md` — inventory + honesty ledger + per-
> iteration build log, same as `kafka/sim/PRESERVATION.md`.

---

## 3. Module-by-module content spec (m01–m22)

The scaffold's `components/nav.js` already defines these 22 modules and groups.
Each row: the **interactive** piece (canvas + which engine) and the **ShopStream**
angle. Every module also gets the Concept/Code/Interview tabs from §1.

### Foundation
- **m01 · Why Structured Streaming** — *Interactive:* side-by-side "batch vs
  stream" timeline — same ShopStream orders processed as a nightly batch vs a
  continuous stream; watch end-to-end latency collapse. *Story:* why ShopStream
  can't wait until midnight for fraud signals. *IQ:* DStreams vs Structured
  Streaming, when streaming is the wrong tool.
- **m02 · The Unbounded Table** — *Interactive:* an append-only table that grows
  as events arrive; the "result table" recomputed as a view. *Story:* ShopStream
  orders as an ever-growing table. *IQ:* the incremental-execution mental model.

### Architecture
- **m03 · Architecture & Components** — *Interactive:* driver/executor + query
  plan animation; a record's path source→plan→state→sink. *Story:* ShopStream's
  cluster. *IQ:* logical vs physical plan, Catalyst in streaming.
- **m04 · Sources & Schema** — *Interactive:* Kafka/file/rate/socket source picker
  with schema inference vs explicit schema; `maxOffsetsPerTrigger` backpressure.
  *Story:* reading ShopStream's `orders` + `clicks` Kafka topics. *IQ:* why
  schema must be fixed; `startingOffsets`.
- **m05 · Micro-Batch & Triggers** — **(Engine A)** *Interactive:* trigger
  planner — drag the trigger interval, see records partitioned into batches,
  batch duration vs interval. *Story:* ShopStream's 10s trigger. *IQ:*
  ProcessingTime vs AvailableNow vs Once; what happens when a batch overruns.
- **m06 · Continuous Processing** — *Interactive:* micro-batch vs continuous
  latency comparison; at-least-once caveat. *Story:* when ShopStream would/ wouldn't
  use it. *IQ:* continuous-processing limitations.

### Time & Windows
- **m07 · Event vs Processing Time** — *Interactive:* two clocks; drag a record's
  arrival to create skew; see which time each operation uses. *Story:* a
  ShopStream order created at checkout but ingested 3 min later. *IQ:* why
  event-time is the only correct basis for windows.
- **m08 · Watermarks** — **(Engine A)** *Interactive:* watermark line advancing as
  `max(eventTime)−delay`; slide the delay, drop late events, watch the
  monotonic line. *Story:* ShopStream's 5-min watermark and the trade-off
  (completeness vs latency vs state). *IQ:* why watermarks are monotonic; tuning
  the delay; multi-stream watermark = min.
- **m09 · Windows** — **(Engine A)** *Interactive:* tumbling/sliding/session
  window builder; assign events, watch windows fill and close at watermark.
  *Story:* 1-min revenue tumbling windows; 30-min session windows for browsing.
  *IQ:* window overlap math; session gap semantics.

### State & Output
- **m10 · Stateful Aggregations** — **(Engine A)** *Interactive:* grouped running
  aggregation; state map grows/evicts with watermark; state size meter. *Story:*
  running revenue per category. *IQ:* keyed state, state store, memory pressure.
- **m11 · Arbitrary State (flatMapGroupsWithState)** — *Interactive:* a custom
  state machine (ShopStream cart → checkout → paid) with timeouts. *Story:*
  cart-abandonment detection. *IQ:* `GroupState`, timeouts, output modes for
  arbitrary state.
- **m12 · Output Modes** — **(Engine A)** *Interactive:* the **flagship** — one
  input stream, three result tables (append/update/complete) side by side,
  stepping batch by batch. *Story:* which mode for ShopStream's dashboard vs
  alerting sink. *IQ:* why append needs a watermark; mode × sink compatibility
  matrix.
- **m13 · Deduplication** — **(Engine A/B)** *Interactive:* `dropDuplicates` with
  and without a watermark; state growth comparison. *Story:* dedup ShopStream's
  at-least-once order events by `order_id`. *IQ:* unbounded state without a
  watermark.

### Sinks & Reliability
- **m14 · Sinks & foreachBatch** — *Interactive:* sink picker (Kafka/console/
  memory/file/foreachBatch); show foreachBatch unlocking batch APIs + idempotent
  upserts. *Story:* ShopStream writing to Delta via foreachBatch. *IQ:* why
  foreachBatch for MERGE; exactly-once per sink.
- **m15 · Checkpoint & Offset Log** — **(Engine B)** *Interactive:* the WAL —
  offset log written before a batch, commit log after; step the pointer. *Story:*
  ShopStream's checkpoint dir layout. *IQ:* what's in a checkpoint; why you can't
  change parallelism arbitrarily.
- **m16 · Fault Tolerance & Exactly-Once** — **(Engine B)** *Interactive:*
  inject a crash at different points; replay; compare at-least-once vs
  exactly-once output. *Story:* ShopStream survives an executor loss with no
  double-counted revenue. *IQ:* the replayable-source + idempotent-sink +
  checkpoint triad.

### Joins
- **m17 · Stream–Static Joins** — *Interactive:* stream of orders ⋈ static
  product dimension; show the static side re-read per batch. *Story:* enrich
  orders with product catalog. *IQ:* broadcast, staleness of the static side.
- **m18 · Stream–Stream Joins** — **(Engine C)** *Interactive:* orders ⋈ clicks
  within a time window; state buffers on both sides; eviction at the join
  watermark; inner vs outer. *Story:* attribute orders to click sessions. *IQ:*
  why both sides need watermarks + time constraints; outer-join null timing.

### Lakehouse & Ops
- **m19 · Delta Sink & MERGE** — *Interactive:* streaming upsert via
  `foreachBatch` + Delta `MERGE`; show insert/update/delete resolution. *Story:*
  ShopStream's exactly-once orders table. *IQ:* idempotent MERGE keys, small-file
  problem, `optimize`.
- **m20 · Performance & Tuning** — *Interactive:* knobs — shuffle partitions,
  trigger interval, state store, `maxOffsetsPerTrigger` — vs throughput/latency/
  state-size readouts. *Story:* tuning ShopStream for Black Friday. *IQ:* batch
  duration > trigger interval; state TTL; skew.
- **m21 · Monitoring & Listeners** — *Interactive:* a live
  `StreamingQueryListener` dashboard — inputRowsPerSecond, processedRowsPerSecond,
  batchDuration, stateOperators — fed by Engine A's batch trace. *Story:*
  ShopStream's on-call dashboard + alert thresholds. *IQ:* `QueryProgress`
  metrics, detecting lag/backpressure.

### End-to-End
- **m22 · ShopStream Capstone** — *Interactive:* the whole pipeline assembled —
  Kafka sources → watermark → windowed aggregation + stream-stream join → Delta
  MERGE sink, with the monitoring dashboard — steppable end to end, reusing all
  three engines. *Story:* the complete ShopStream architecture. *IQ:* a full
  system-design walkthrough.

---

## 4. Interactive labs (free-form playgrounds)

Standalone PAGE routes (self-wire `initTabs`), already in nav as `microbatch-lab`,
`watermark-lab`, `output-mode-lab`. These are the "Playground" equivalents.

- **Micro-Batch Lab** (`modules/microbatch-lab.js`, Engine A) — author an event
  stream (presets + manual), set trigger/watermark/window/mode, **step** or
  **play** batches; canvas shows input timeline, watermark line, state contents,
  emitted rows; a batch-trace table. The flagship interactive.
- **Watermark Lab** (Engine A) — focus on the watermark/late-data trade-off:
  slide the delay, scatter late events, watch drops and the completeness vs
  latency vs state-size readout.
- **Output-Mode Lab** (Engine A) — the same stream rendered as append/update/
  complete simultaneously, batch-stepped, with a "why these rows?" explainer.

---

## 5. Reference pages (nav: reference + review groups)

Mirror Kafka's `glossary`/`cheatsheet`/`config-reference`/`master-map` + the
dashboard/learning-path/search/review/study set.

- **Master Map** — the 22 modules as a dependency graph, ShopStream pipeline
  overlaid; click a node → module. (Kafka's `master-map.js` is 32 KB — match it.)
- **Engine Comparison** — Structured Streaming vs Flink vs Kafka Streams vs
  classic Spark DStreams: model, latency, state, exactly-once, windowing.
- **Glossary** — **~100+ terms** (watermark, trigger, micro-batch, state store,
  checkpoint, offset log, idempotent sink, tumbling/sliding/session window,
  `foreachBatch`, late data, allowed lateness, output mode, …) each with
  formal + plain definition and a link to its module.
- **Cheat Sheet** — the APIs and the decision rules (which output mode, which
  trigger, when to set a watermark) on one page.
- **Config Reference** — the knobs with defaults and effects:
  `spark.sql.shuffle.partitions`, `maxOffsetsPerTrigger`, `spark.sql.streaming.*`
  (statestore, checkpointLocation, minBatchesToRetain), trigger settings.

Review group: **Dashboard** (progress + mastery), **Learning Path** (ordered
route), **Search** (global, over a `data/search-index.js`), **Review Center**
(spaced repetition over missed items), **Study Hub** (all IQ aggregated).

---

## 6. Interview surface — shared data banks (`spark-streaming/data/`)

This is where Kafka's depth really lives. Parity targets (meet or beat):

| Bank | File | Kafka count | Spark target |
|---|---|---|---|
| Per-module interview Q&A | inline in each `mNN` | ~100+ total | **220–280** (10–15 × 22) |
| Quiz bank | `data/quiz-bank.js` | 107 | **100–120**, tagged by module |
| Coding problems (PySpark + Scala) | `data/coding-bank.js` | 24 | **30–40** |
| Decision drills ("choose the approach") | `data/decisions.js` | 13 | **15–20** |
| Incident labs ("prod is broken, diagnose") | `data/incidents.js` | 9 | **12–16** |
| Tiered answers (junior/mid/senior) | `data/tiered.js` | 12 | **15–20** |
| Self-explain prompts | `data/self-explain.js` | large | **1 per module** |
| Mock interview | `data/mock-exam.js` + `modules/mock-interview.js` | yes | full 45-min set |
| Search index | `data/search-index.js` | yes | all modules + terms |

**Content themes unique to Spark SS** (so questions aren't generic):
watermark tuning trade-offs; append-mode-needs-watermark; stream-stream join
state blow-up; exactly-once triad; `foreachBatch` + MERGE idempotency;
state-store memory pressure; trigger-interval vs batch-duration; late-data
accounting; checkpoint incompatibility across code changes.

**Coding problems** are real PySpark a candidate would write: a windowed revenue
agg with watermark; dedup by key; sessionization; a stream-static enrichment; a
foreachBatch Delta upsert; a custom `flatMapGroupsWithState` cart-timeout. Each
with a prompt, a worked solution, and "what the interviewer is probing."

**Incidents** (diagnose-from-symptoms, like Kafka's incident bank): "state store
OOM" (missing watermark on dedup/join); "output stuck, no rows" (append mode,
watermark never advances because one source is idle); "duplicated revenue after
restart" (non-idempotent sink); "batch duration climbing" (skew / too few shuffle
partitions); "late data silently missing" (delay too tight).

---

## 7. Production standards (every piece must pass)

- **Honesty ledger** — `sim/PRESERVATION.md` tracks real-vs-simulated. The three
  engines are "real algorithm"; everything else is "deterministic simulation,
  labelled"; no fake clusters, no fake code execution.
- **Code verification** — PySpark/Scala snippets are static and labelled; API
  signatures checked against the Spark 3.5/4.0 docs. Where a snippet claims an
  output, the output comes from Engine A, not invented.
- **Canvas rules** — backgrounds hardcoded dark (`#0A0E1A`), theme-independent
  contrast, `requestAnimationFrame` with a cleanup fn returned from `mount`.
- **Determinism** — any randomness is seeded (mulberry32), so a replay is exact.
- **Namespacing** — all storage keys `spark_`/`spark:` (done in scaffold).
- **A11y** — tabs are a real tablist (shell handles it); IQ is keyboard-operable;
  canvases have text captions + explainers so content isn't image-only.
- **Verification** — `node --test spark-streaming/sim/*.test.mjs` green;
  headless Playwright smoke (dark + light, 0 console errors, tabs + interactions
  exercised, tour disabled via `spark_tour_done`) before every deploy.

---

## 8. Build sequence (content iterations, each gated by an explicit "go")

Ordered so the honest keystone exists before any module leans on it, and the
highest-teaching-value surfaces land first.

- **Iteration 1 — Keystone + flagship lab.** `sim/microbatch-engine.js` +
  tests; the **Output-Mode Lab** and **Micro-Batch Lab** driving it; wire
  `m05`, `m08`, `m12` to real engine output. *Proves the depth bar.*
- **Iteration 2 — Foundation + Time & Windows (m01–m09).** Full teaching modules
  on ShopStream, with the m07–m09 interactive canvases on Engine A. Begin the
  per-module IQ (10–15 each).
- **Iteration 3 — State & Output + Sinks & Reliability (m10–m16).** Build
  `sim/checkpoint-engine.js` + tests; m15/m16 recovery visualizations;
  Watermark Lab finalized.
- **Iteration 4 — Joins + Lakehouse & Ops + Capstone (m17–m22).** Build
  `sim/stream-join-engine.js` + tests; m18 join canvas; m21 monitoring
  dashboard; m22 assembles everything.
- **Iteration 5 — Reference pages.** Master Map, Comparison, Glossary (100+),
  Cheat Sheet, Config Reference; `data/search-index.js`.
- **Iteration 6 — Interview surface.** `data/quiz-bank.js` (100+),
  `coding-bank.js` (30+), `decisions.js`, `incidents.js`, `tiered.js`,
  `self-explain.js`, `mock-exam.js`; the mock-interview, study, review flows.
- **Iteration 7 — Review & analytics.** Dashboard, learning path, review center
  (spaced repetition), search center wired to the index.
- **Iteration 8 — Real assets + polish.** Spark-branded icons/splash/OG,
  optional cloud sync (own Supabase), full a11y + QA pass, update the honesty
  ledger.

### Parity scorecard (definition of done = "same depth as Kafka")

- [ ] 22 teaching modules, each with definition card, ≥1 engine-driven canvas,
      ShopStream tab, PySpark+Scala code, 10–15 interview Qs
- [ ] 3 keystone engines, each with a passing `node --test` suite
- [ ] 3 interactive labs
- [ ] 5 reference pages (glossary ≥100 terms)
- [ ] Quiz ≥100 · Coding ≥30 · Decisions ≥15 · Incidents ≥12 · Tiered ≥15
- [ ] Dashboard / learning-path / search / review / study wired
- [ ] 0 console errors, dark + light, all routes (Playwright)
