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

- Iteration 2 — more Playground surfaces (consumer group, offset timeline,
  replication/broker-failure, lag) reusing the engine. *(planned)*
- Iteration 3 — app shell + global search. *(planned)*
- Iteration 4 — learning dashboard + mastery analytics + persistence. *(planned)*
- Iteration 5 — interview mastery deepening. *(planned)*
- Iteration 6 — revision center (spaced repetition). *(planned)*
- Iteration 7 — coding labs + CLI simulator (labelled simulated execution). *(planned)*
- Iteration 8 — incident simulator + system-design lab. *(planned)*
- Iteration 9 — QA, a11y, docs. *(planned)*

## Real vs simulated (honesty ledger)

| Capability | This build | Notes |
|---|---|---|
| Key → partition routing | **Real algorithm** | murmur2 + toPositive % n, matches Kafka |
| Cluster / produce / offsets | Simulated (deterministic) | No network, no real broker |
| Code execution | Not yet | Iteration 7: static validation, labelled |
| Real Kafka cluster | Out of scope | Track 2 (needs backend) |
| Accounts / cloud sync | Out of scope | Track 2; local-first + export/import instead |
