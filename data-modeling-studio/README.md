# Data Modeling Studio

A fully-static, local-first tool for **learning and practicing data modeling** — build
schemas on an interactive canvas, get them validated in real time, and defend them in
scripted mock interviews. No backend, no login, works offline.

It is a standalone product (inspired by, but not built on, the older visualizer apps in
this repo). The whole thing is designed around one idea:

> **The modeling engine is the product; every UI surface is a client of it.**

The canvas, the lesson checks, the challenge grader, the DDL export, and the (future)
in-browser SQL runner all ask the same questions — *is this schema valid? what normal
form is it in? is the grain right? is the SCD choice defensible?* — so that logic lives
in **one pure, typed package** (`@dms/modeling-core`) and never diverges.

## Architecture (target)

| Layer | Responsibility | Tech |
|-------|----------------|------|
| **modeling-core** | Schema IR, serializers, validators, grader — pure, no DOM | TypeScript ✅ *(this phase)* |
| **persistence/runtime** | Saved schemas + progress; run real SQL on the model in-browser | IndexedDB (Dexie), PGlite (Postgres WASM) |
| **state + canvas** | The ER/schema builder (the hero feature) | React Flow, Zustand + zundo |
| **surfaces** | Learn (MDX lessons), Build (canvas + live panels), Practice (quiz / challenges / scripted mock interview) | React + Vite (static output) |
| **content** | Scenarios, lessons, concept graph — all data, grows without code changes | JSON + MDX |

Fully static: the mock interviewer is rule/rubric-driven (no AI server), and PGlite runs
Postgres entirely in the browser.

## Monorepo layout

```
data-modeling-studio/
  packages/
    modeling-core/     ← the engine (implemented in Phase 1)
  apps/                ← the web app (Phase 2+)
```

## The core data contracts

Two JSON-serializable shapes carry the whole design:

- **`SchemaIR`** — entities → typed columns → keys → relationships, plus optional
  dimensional annotations (`role`, `grain`, `scd`) and declared functional dependencies.
  This is what the canvas edits and everything else reads.
- **`Scenario`** — an interview-style prompt plus a **declarative rubric** (a small
  no-functions DSL) that the grader evaluates against a learner's `SchemaIR`. Because the
  grader and the scripted interviewer read the same rubric, their feedback can never
  contradict.

## What `@dms/modeling-core` does today

- **IR + helpers** — build and query a schema model.
- **Serializers** — `toDDL` (Postgres/MySQL/Snowflake), `toDBML`, `toMermaid`, `toJSON`/`fromJSON`.
- **Validators** — structural (PKs, FK resolution, M:N junctions, dupes), normalization
  (0NF→BCNF from declared FDs, pinpointing the offending dependency), dimensional
  (fact grain, measures, SCD strategy).
- **Grader** — scores a model against a scenario rubric, weighted, with per-rule hints.

## Develop

```bash
pnpm install
pnpm --filter @dms/modeling-core test       # 30 tests
pnpm --filter @dms/modeling-core typecheck
pnpm --filter @dms/modeling-core build
```

## Roadmap

1. **`modeling-core`** — engine + tests. ✅ *(done)*
2. **Build canvas** — React Flow ↔ IR, live DDL/ER/findings panels.
3. **PGlite SQL runner** — materialize the schema, run real queries.
4. **Content** — port the data-modeling curriculum into MDX lessons + scenarios; mastery/roadmap.
5. **Practice** — quiz + challenge cards graded by the engine.
6. **Mock interview** — scripted, rubric-driven, four phases (Think → Design → Discuss → Score).
