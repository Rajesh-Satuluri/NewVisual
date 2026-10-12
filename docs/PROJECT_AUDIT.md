# Project Audit — dbt Learning App

_Baseline established at the start of the "comprehensive dbt mastery platform" build (Iterations 0–4). All counts are verified from source, not assumed, and are now computed dynamically by `dbt/data/registry.js` (run `node dbt/tools/content-lint.mjs` to reproduce)._

## 1. Architecture baseline

| Aspect | Reality |
|---|---|
| Stack | Vanilla JS, ES modules, **no build step** |
| Routing | Hash routing (`#m17`), lazy `import()` per route in `script.js` `LOADERS` |
| Rendering | Each module exports `mount(container)` → optional cleanup fn |
| Styling | `styles.css` (base) + `enhancements.css` (component layer); design tokens on `:root`, dark default + light override |
| Persistence | `localStorage` — `dbt-done` (viewed modules), `dbt-quiz-<id>` (best score), `dbt-theme`, `dbt-nav-collapsed` |
| Deploy | GitHub Pages from `main` via `.github/workflows/deploy.yml` (push to `main` = deploy) |
| Backend | **None.** No server, no DB, no real code execution (as of baseline) |

## 2. Content inventory (verified)

- **33 numbered modules** (`m01`–`m33`), grouped: Foundation, ELT Revolution, Introduction, Core Features, Advanced, dbt Internals, Selection & Incrementals, Data Quality, Production & Debugging, Platform & Architecture, Mastery, Real-World Production Lab.
- **9 reference/review pages** (EXTRAS): Learning Modes, Readiness Dashboard, Master Map, ETL-vs-ELT, Glossary, Cheat Sheet, Interview Master Bank, Interview Simulator, Study Hub.
- **43 route loaders** (33 modules + 9 extras + home).
- **33 module quizzes / 58 MCQs** (`data/quiz-bank.js`).
- **44 full-schema interview questions** (`data/interview-bank.js`), 8 tiers.

> The prompt's stated baseline ("~34 modules, 44 questions") is corrected here: **33 modules, 44 bank questions + 58 MCQs**.

## 3. Module-by-module summary

| ID | Title | Group | Quiz | Notes |
|---|---|---|---|---|
| m01–m06 | Data Chaos → Trust Crisis | Foundation | ✓ | Narrative "pain era"; sets the one e-commerce business case |
| m07–m08 | ETL Era / Why ELT Won | ELT Revolution | ✓ | Curriculum A (ELT vs ETL) |
| m09 | Introducing dbt | Introduction | ✓ | Curriculum A |
| m10–m15 | Models, Tests, Snapshots, Incremental, Macros, Lineage | Core Features | ✓ | Curriculum A/D/F/G/C/H |
| m16 | When NOT to use dbt | Advanced | ✓ | Curriculum A (fit/anti-fit) |
| m17–m19 | Internals, Compile vs Execute, Manifest & Artifacts | dbt Internals | ✓ | Curriculum J; internals visualizers |
| m20–m21 | State & Selection, Incremental Strategies | Selection & Incrementals | ✓ | Curriculum K/E |
| m22–m23 | Testing & Data Quality, Source & Freshness | Data Quality | ✓ | Curriculum G |
| m24–m26 | Failure Simulator, Debugging Tree, Performance Lab | Production & Debugging | ✓ | Curriculum O + incidents |
| m27–m31 | CI/CD, Environments, Adapters, Airflow, Case Studies | Platform & Architecture | ✓ | Curriculum M/N/P |
| m32 | Command Playground | Mastery | ✓ | Curriculum J (CLI) |
| m33 | Real-World Production Lab (capstone) | Real-World Production Lab | ✓ | End-to-end e-commerce; 6 tabs, 17-stage pipeline, run playback, 3 incidents, decisions, data-flow, interview |

## 4. Reusable components (to build ON, not around)

- `components/module-shell.js` — `createModuleShell`, `createIQSection`, `initTabs`, `initIQ`, `injectCodeEnhancements` (code highlighter + copy).
- `components/explain.js` — `renderExplain({what,why,input,output,failure,example,interview})`.
- `components/json-tree.js`, `components/canvas-primitives.js` — SVG/JSON primitives (DAG patterns in m15/m20).
- `components/quiz.js` — `createQuiz`/`initQuiz` (auto-injected per module).
- `components/command-palette.js`, `pager.js`, `toast.js`, `tour.js`.
- `data/ecommerce-project.js` — single e-commerce SSOT (sources, DAG, stages, incidents, decisions, interview).

## 5. Risks / technical debt found

1. **No single source for counts** → fixed in Iter 0 (`data/registry.js`).
2. **Hard-coded "All 16 modules" toast** in `script.js` (stale; real count 33) → fixed in Iter 0.
3. **No real execution** — all SQL/dbt is static/illustrative. Addressed Iter 1 via DuckDB-WASM (real SQL) + labeling.
4. **Code highlighter** (shared) had a latent nested-placeholder bug — fixed in a prior wave; covered by visual checks.
5. **No automated content integrity check** → fixed in Iter 0 (`tools/content-lint.mjs`).

## 6. What this build adds (Iter 0–4)

Registry + lint (0) · Coding Studio with real in-browser SQL (1) · Jinja/YAML/config exercises (2) · Interview Academy expansion + competency matrix + 4 modes (3) · Production Incident Simulator engine + 20 scenarios (4). See `IMPLEMENTATION_STATUS.md`.
