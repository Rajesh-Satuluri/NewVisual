# Kafka Platform — Preservation Inventory & Build Log

Living record of what exists, where it maps in the enhanced platform, and what
each build iteration adds. Nothing listed here is removed without a documented
reason; iterations extend.

## Existing surface (baseline, preserved)

| Area | File(s) | Status |
|---|---|---|
| 22 learning modules | `modules/m01`–`m22` | Preserved; enriched (Passes 1–5) |
| Interview Q&A per module | module `IQ` arrays + `components/module-shell.js` | Preserved |
| Interview question bank | `data/iq-bank.js`, `data/tiered.js` | Preserved (to deepen, Iteration 5) |
| Quizzes | `data/quiz-bank.js`, `components/quiz.js` | Preserved |
| Self-explain | `data/self-explain.js`, `components/self-explain.js` | Preserved |
| Incident bank + investigation | `data/incidents.js`, `modules/incident-bank.js`, `components/investigation-flow.js` | Preserved (branching + scoring, Iteration 8) |
| Decision drills | `data/decisions.js`, `modules/decisions.js`, `components/choose-approach.js` | Preserved |
| Troubleshooting lab | `modules/troubleshoot.js` | Preserved |
| Glossary / cheatsheet / master-map | `modules/glossary.js`, `cheatsheet.js`, `master-map.js` | Preserved |
| Study hub | `modules/study.js` | Preserved |
| Progress persistence | `data/progress-store.js` (localStorage) | Preserved (hardened, Iteration 4) |
| Command palette / keyboard / tour / toast | `components/*` | Preserved |
| Canvas primitives | `components/canvas-primitives.js` | Preserved; reused |
| Nav / routing / theme | `components/nav.js`, `script.js`, `styles.css` | Preserved; extended |

## Architecture decision

Stay with the vanilla-JS, no-build, ES-module static app (deploys reliably to
GitHub Pages). Add a **content-data layer** and a **pure-JS deterministic
simulation engine** with real Node unit tests — no bundler. Accounts, real code
execution, real Kafka clusters and server-side AI are **Track 2 (needs a
backend)** and are explicitly out of scope for the static build; anything
simulated is labelled "simulation", never presented as live.

## Build iterations

- **Iteration 1 — Simulation engine + Partition Simulator** ✅
  - `sim/engine.js` — deterministic `KafkaSim`; state models (cluster, broker,
    topic, partition, replica, record); seeded PRNG; **Kafka's real murmur2
    partitioner** (verified against Apache Kafka published test vectors) + sticky
    partitioner for null keys.
  - `sim/engine.test.mjs` — `node --test`, 12 tests (murmur2 vectors, keyed
    routing, per-partition offsets, determinism/reset, hot-partition detection,
    even spread, config validation, replica placement, PRNG).
  - `modules/playground.js` — `#playground` route, Partition Simulator surface
    (key presets, partition-count slider that re-hashes, publish 1/100, reset,
    live hot-partition flag) + "How it works" tab. Labelled deterministic sim.
  - Wiring: `script.js` (PAGES + LOADERS), `nav.js` (Playground section),
    `enhancements.css` (`.sim-*`).
  - Verified: Playground both themes 0 console errors; full 22-module smoke
    test clean.

### Post-audit build (third-party audit → Tracks A–F, all shipped)

- **Track A — content completeness + honest progress** ✅
  - Quizzes for all 22 modules (was 4); self-explain for all 22 (was 5);
    tiered Weak/Good/Senior answers 5→12; decision drills 6→13; incidents 4→9.
  - "Complete" now means the module's quiz is passed (≥2/3), not opened;
    quiz grading records to the progress store and marks mastery.
- **Track B — missing theory** ✅
  - Config Reference (`#config-reference`, `data/configs.js`): ~35 settings
    with default / production value / what-breaks.
  - Capacity & Sizing Lab (`#sizing`): deterministic partition/consumer/storage
    math, labelled planning estimates.
  - Advanced Topics (`#advanced`, `data/advanced-topics.js`): tiered storage,
    static membership, quotas, high-water mark & leader epoch, record batch
    format, rack awareness.
- **Track C — global search** ✅ (`#search`, `data/search-index.js`): one box
  across modules, glossary, configs, advanced, decisions, incidents, and all
  interview Q&A; command palette route + standalone nav link.
- **Track D — dashboard + spaced repetition** ✅
  - Dashboard (`#dashboard`): mastery ring, per-group bars, activity stats,
    weak spots, recommended next; live-refreshes on progress.
  - Review Center (`#review`, `data/review.js`): SM-2 spaced-repetition
    flashcards (114) from quizzes + glossary; schedule persisted.
- **Track E — accessibility & polish** ✅: ARIA + keyboard on tabs and
  interview accordions; canvas text alternatives; difficulty/time badges;
  focus rings; print stylesheet.
- **Track F — more Playground surfaces** ✅: engine extended with
  `assignPartitions` + broker-failure/leader-election (17 unit tests);
  Consumer Group Lab (`#consumer-lab`) and Replication & Failure Lab
  (`#replication-lab`).

## Real vs simulated (honesty ledger)

| Capability | This build | Notes |
|---|---|---|
| Key → partition routing | **Real algorithm** | murmur2 + toPositive % n, matches Kafka |
| Cluster / produce / offsets | Simulated (deterministic) | No network, no real broker |
| Code execution | Not yet | Iteration 7: static validation, labelled |
| Real Kafka cluster | Out of scope | Track 2 (needs backend) |
| Accounts / cloud sync | Out of scope | Track 2; local-first + export/import instead |

## CDC / Debezium / Lakehouse track (new groups, m23+)

A layered journey on top of the Kafka curriculum: Postgres → WAL/logical
decoding → Debezium → Kafka → microservice/outbox events → lakehouse
Bronze/Silver/Gold. Nine first-class modules (m23–m31) in two new nav groups,
plus a separate runnable Docker lab. Built and deployed per batch.

### Honesty ledger additions

| Capability | This build | Notes |
|---|---|---|
| CDC / WAL / slot / decoding dynamics | **Deterministic simulation** | `sim/cdc-engine.js`; labelled, Node-tested |
| Source LSN vs Kafka offset vs sink version | **Modelled as 3 distinct markers** | engine never conflates them |
| Real Postgres→Debezium→Kafka→lakehouse | Out of scope for the SPA | **the Docker lab** (Track 2 / needs backend) |

### Batch 1 — CDC engine + fundamentals + WAL ✅

- `sim/cdc-engine.js` — deterministic `CDCSim`, **composes `KafkaSim`** (reuses
  the real murmur2 partitioner + real offsets). Models: source tables, txn
  commit/rollback, WAL + monotonic LSN, logical decoding → Debezium-shaped change
  events (op c/u/d/r, before/after honouring REPLICA IDENTITY), replication slot
  + confirmed-flush + retained-WAL backlog, heartbeat, snapshot (r events),
  Bronze append-log, Silver materialization (upsert/delete by key), reconcile.
- `sim/cdc-engine.test.mjs` — `node --test`, **14 tests** (commit/rollback
  visibility, LSN monotonicity, multi-statement txn, slot backlog grow/drain,
  heartbeat advance, Silver↔source reconcile, poll-vs-log history, idempotent
  materialization, snapshot reads, LSN≠offset, determinism).
- `modules/m23-cdc-fundamentals.js` — `#m23`. Why CDC, the four capture methods,
  the state-vs-stream idea, + a live **poll-vs-log demo** on the engine.
- `modules/m24-postgres-wal.js` — `#m24`. WAL / physical-vs-logical / LSN / slot
  / publication / REPLICA IDENTITY, + an interactive **WAL & slot simulator**
  (drive writes, poll, pause to grow a backlog, heartbeat, reconcile Silver).
- Wiring (additive): `script.js` (LOADERS m23/m24; dynamic mastery toast),
  `components/nav.js` (new group "Change Data Capture" + GROUP_ORDER),
  `data/quiz-bank.js` (m23/m24, 3 each), `data/self-explain.js` (m23/m24),
  `modules/home.js` (GROUP_ORDER + dynamic count), `modules/dashboard.js`
  (GROUP_ORDER). Search auto-includes modules (no edit needed).
- `enhancements.css` — `.cdc-*` / `.prose-block` / `.callout` blocks, theme-aware.
- Verified: engine 31/31 (17 Kafka + 14 CDC); Playwright both themes 0 console
  errors (m23 demo, m24 simulator, nav group, home count=24, dashboard group,
  search). Baseline 22 modules untouched.

### Batch 2 — the Debezium pillar ✅

- Engine additions (backward-compatible): `simulateWalLoss()` + `needsSnapshot`/
  `slot.invalid` (streaming stalls until a fresh snapshot recovers), and
  `incrementalSnapshot()` (READ events without rewinding the stream). 2 new tests
  → **16 CDC tests, 33 total** green.
- `modules/m25-debezium-architecture.js` — `#m25`. Debezium as a Kafka Connect
  source connector (worker/task/offset model, single-task capture) + an
  interactive **connector-lifecycle machine** (create→snapshot→streaming→pause→
  restart→WAL-loss→recover).
- `modules/m26-snapshots-streaming.js` — `#m26`. Initial snapshot + the LSN
  watermark handoff, snapshot modes, incremental snapshots, + a **snapshot-vs-
  streaming lab** (pick a mode, see which backfill pre-existing rows).
- `modules/m27-change-events.js` — `#m27`. The event envelope (op/before/after/
  source), deletes+tombstones, serialization/SMTs, + a live **event-envelope
  inspector** (REPLICA IDENTITY + tombstone toggles) and a **schema-evolution
  drill** (backward/forward/FULL verdicts).
- `modules/m28-debezium-ops.js` — `#m28`. Annotated connector config + an
  interactive **ops console** that injects failures (outage, slot WAL growth,
  WAL loss) and diagnoses them live, plus a monitor/alert reference.
- Wiring (additive): LOADERS m25–m28; nav group now 6 modules; quizzes +
  self-explain for m25–m28. Home/dashboard/search auto-scale (count now 28).
- Verified: engine 33/33; Playwright both themes 0 console errors across all four
  modules' interactives; nav CDC group = 6; home count = 28. Baseline untouched.
