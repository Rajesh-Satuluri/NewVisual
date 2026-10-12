# Feature Traceability Matrix

Maps each requirement area of the "comprehensive dbt platform" prompt to an existing component or a planned iteration. Status: ✅ exists · 🟡 partial (enhance) · 🔵 planned (Iter N) · ⚪ out of scope (with reason).

## Curriculum (Phase 2, A–Q)

| Req | Where | Status |
|---|---|---|
| A Fundamentals / ELT | m07–m10, m16, comparison | ✅ |
| B Project structure & config | m10, cheatsheet; **repair-YAML exercises** | 🟡 → 🔵 Iter 2 |
| C Jinja & macros | m14; **Jinja exercises** | 🟡 → 🔵 Iter 2 |
| D Materializations | m10, m13, m21 | ✅ |
| E Incremental & correctness | m13, m21, m33 incidents | ✅ |
| F Snapshots | m12 | ✅ |
| G Tests & contracts | m11, m22, m23 | ✅ |
| H SQL & analytics engineering | m15, m33; **SQL Coding Studio** | 🟡 → 🔵 Iter 1 |
| I Packages | cheatsheet, m14 | 🟡 |
| J CLI / parse / compile / artifacts | m17, m18, m19, m32 | ✅ |
| K Selectors & state | m20 | ✅ |
| L Docs / governance / contracts | m19, m22 | 🟡 |
| M CI/CD | m27 | ✅ |
| N Orchestration | m30 | ✅ |
| O Performance & cost | m26 | ✅ |
| P Platform/adapter distinctions | m29 | ✅ (matrix enhance later) |
| Q Python models / semantic | m16, m29 | 🟡 |

## Systems

| Req | Where | Status |
|---|---|---|
| Phase 3 Coding Studio (real exec) | **new `/studio`** + DuckDB-WASM | 🔵 Iter 1 |
| Phase 4 Interview Academy (≈300 Qs, matrix, 4 modes) | interview-bank, interview-sim, study | 🟡 → 🔵 Iter 3 |
| Phase 5 Incident Simulator (20 scenarios, full loop) | m24, m25, m33 | 🟡 → 🔵 Iter 4 |
| Phase 6 Sample dbt project | `data/ecommerce-project.js` (in-app); **downloadable real project** | ✅ / 🔵 Iter 6 |
| Phase 7 Project Explorer (tree, lineage, impact) | m15, m19, m20 patterns | 🔵 Iter 5 |
| Phase 8 Command & Artifact Lab | m32, m19 | ✅ (enhance Iter 6) |
| Phase 9 Multi-adapter matrix | m29 | 🟡 (enhance Iter 6) |
| Phase 10 Interview simulator modes | interview-sim | 🟡 → 🔵 Iter 3 |
| Phase 11 UX / nav areas | sidebar nav, home, readiness | ✅ (unify, not rebuild) |
| Phase 12 Progress / spaced repetition | localStorage, readiness, quiz | 🟡 → 🔵 Iter 7 |
| Phase 13 Content schema / registry | **`data/registry.js`** | ✅ Iter 0 |
| Phase 14 Security (real exec) | DuckDB-WASM sandbox; no eval, no shell | 🔵 Iter 1 |
| Phase 15 Automated tests / content checks | **`tools/content-lint.mjs`** + headless route sweep | ✅ Iter 0 |

## Out of scope (with reason)

| Item | Reason |
|---|---|
| Real in-app `dbt compile`/`dbt run` | Requires a Python backend; conflicts with static GitHub Pages deploy. Replaced by a **real downloadable dbt project** (Iter 6) + clearly-labeled in-app simulation. |
| Backend auth / cross-device sync | No backend by design; single-user localStorage. Not claimed as cloud persistence (per Rule 5). |
| Audio recording (oral interview) | Deferred; optional per prompt. Written/coding/system-design modes cover assessment. |
