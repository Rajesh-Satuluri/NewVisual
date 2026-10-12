# Unified Architecture — Streaming Engineering Master Lab

> Phase 0 audit deliverable. Describes the single-application architecture as it
> actually exists today (verified against the tree on 2026-10-11), and the rules
> that keep it one coherent product rather than linked sites.

## 1. One application, one shell

The lab is a **single-page application** served from `streaming/`:

- **No framework, no build step.** Vanilla ES-module SPAs. This is a deliberate,
  preserved constraint — a framework is *not* introduced for aesthetics.
- **Entry:** `streaming/index.html` → `script.js` (bootstrap + hash router).
- **Shell:** global sidebar (`components/nav.js`), top bar with breadcrumb +
  scenario switcher + theme toggle + Backup/Home (`index.html`), lazy content
  canvas (`#module-canvas`).
- **Routing:** `hashchange` → `route()` in `script.js`, dispatching through a
  `LOADERS` map of lazy `import()` calls with `?v=BUILD` cache-busting.

## 2. Sections (registry-driven)

`data/registry.js` is the single source of truth for sidebar sections. Current
live sections, grouped:

- **Learn:** Foundations (15), Kafka (22, ported), Flink (20, ported),
  AWS (20), Azure (21), Databricks (27), Comparisons/Engines (7 tools).
- **Practise:** Incident Lab (12), System Design (2 — *gap, target 10*),
  Interview Master (22 Q — *gap, target 430*).
- **Track:** Dashboard, Learning Paths (6), Glossary (41), Search.

## 3. Kafka & Flink integration model

Kafka and Flink are integrated as **byte-identical self-contained sub-apps**
under `streaming/kafka/` and `streaming/flink/`, guaranteeing 100% preservation
(`scripts/verify-preservation.mjs` → 93/93). They are reached as first-class
sidebar sections; the router navigates to their own `index.html` (full SPAs).

**Known integration gaps (tracked, see route-migration-map + progress-model):**
- Global search does **not yet index** Kafka/Flink lessons (Phase 1).
- Dashboard does **not yet aggregate** `kafka-*` / `flink-*` progress (Phase 2).
- The global scenario switcher does **not re-frame** inside ported modules (Phase 7, I20/I26).

## 4. Shared systems

| System | Module | Namespace |
|---|---|---|
| Progress | `data/progress-store.js` | `sml-*` (lab); `kafka-*`/`flink-*` (ported) |
| Scenario | `data/scenarios.js` + `components/scenario-switcher.js` | `sml-scenario` |
| Theme | `script.js` + no-flash inline | `sml-theme` |
| Catalog/search | `data/catalog.js` + `modules/search.js` | in-memory, lazy |
| Lesson shell | `components/lesson-shell.js` | — |
| Sim canvas | `components/sim-ui.js` | — |

## 5. Deployment

GitHub Pages, repo root published by `.github/workflows/deploy.yml` on push to
`main`. Each top-level tool folder also gets a fresh `<tool>.zip` backup built in
CI (never committed). No build step runs; static files are served as-authored,
so verified bytes == deployed bytes.

## 6. Preservation invariant

The 7 pre-existing sibling tools (kafka, flink as standalone, appliedai,
databricks, dbt, iceberg, snowflake) and the ported `streaming/kafka` +
`streaming/flink` trees are **never edited**. Any content change happens in the
lab's own `data/` and `modules/` files, never in preserved files.
