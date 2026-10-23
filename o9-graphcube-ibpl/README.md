# o9 GraphCube & IBPL Visualizer

An interactive learning tool for the **o9 Solutions** platform: how the Digital Brain
**stores** planning data (the GraphCube) and how you **query** it with **IBPL**
(Integrated Business Planning Language). Every example is grounded in a real
**CAT aftermarket-parts** tenant config.

A core theme throughout: **IBPL is not SQL.** Dimensions join with `*`, measures live in
`{ }`, Version is mandatory, writes use `scope: … end scope;` (7 variants), and joins are
graph **edges** (`From`/`To`/`Edge`/`RelationshipType`).

## Run it

Static site, no build step. Serve the folder and open `index.html`:

```
python3 -m http.server 8000
# → http://localhost:8000/o9-graphcube-ibpl/
```

## Interactive learning layer

Beyond the reference content, the tool now has a hands-on practice layer:

- **IBPL simulator** (`lib/ibpl-sim.js`) — a deterministic engine for a *documented subset*
  of IBPL (Select + where/orderby/limit, transients, `coalesce`/`SafeDivide`, `@ LeadOffset`,
  regular `scope:` writes, `DistributeToLeaves`/`aggregatePolicy` helpers) over an in-memory
  CAT dataset. Every result is labelled **"Simulated — documented subset"**; it never claims
  the real o9 engine ran. 29 unit tests (`node lib/ibpl-sim.test.js`).
- **Exercise runner** (`components/exercise.js`) — mcq / predict / diagnose / fill / write /
  fix / explain; write & fix run against the simulator and validate the output.
- **Competency tracking** (`components/competency.js`) — a Home panel tracking *solved*
  exercises across six areas (separate from the page-visited "done" set).
- **Interactive pieces:** IBPL Sandbox & Playground (m06) · Data-Model explorer + Grain Lab
  + troubleshooting (m02) · Aggregation & Spreading labs (m13) · Scope visualizer (m07) ·
  dependency/Lineage explorer (m12) · guided model-build project (m10) · a **103-question
  interview bank** with filters, self-grading and weak-area detection (m21).

## Architecture

- `index.html` — sidebar + canvas shell, theme toggle.
- `script.js` — hash router, lazy module loader, progress tracking (`localStorage`).
- `components/nav.js` — the 21-module registry and sidebar rendering.
- `components/module-shell.js` — `createModuleShell` / `initTabs` / `createIQSection` / `initIQ`.
- `components/exercise.js`, `components/competency.js` — the practice layer.
- `lib/ibpl-sim.js` (+ tests), `lib/interview-bank.js`, `lib/exercise-registry.js` — data/engine.
- `modules/mNN-*.js` — one ES module per topic, each exporting `mount(container)`.
- `assets/` — the two GraphCube explainers (architecture/flow and insert/store/retrieve),
  embedded in module 05. They load GSAP from a CDN and fall back to a static diagram offline.
- `styles.css`, `responsive.css` — shared design system (adapted from the repo's visualizer pattern).

## Module map (21)

| Track | Modules |
|-------|---------|
| Platform | m01 Overview · m02 Data Model · m03 Planning Engine · m04 Workflow Engine |
| GraphCube | m05 Storage · m15 Graph Relationships |
| IBPL Language | m06 Select · m07 Scope & Write · m08 Rules · m09 Commands |
| Data Model Deep Dive | m10 Dimensions · m11 Hierarchies · m12 Measure Groups · m13 Aggregation & Spread · m14 Versions |
| Operations | m16 Access Control · m17 DistributeToLeaves · m18 Integrations · m20 Performance |
| Practice | m19 Use Cases · m21 Interview Master |

All 21 modules plus the Glossary and Master Map reference pages are live.

## Sources

Built from the shared IBPL quick-reference (v1.2), the chapter study guides with CAT tenant
config, and o9's public articles on the Enterprise Knowledge Graph. GraphCube internals are
kept **conceptual** — this is a learning aid, not o9's proprietary storage format.
