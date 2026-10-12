# Content Gap Matrix

What exists vs. what the target platform needs, with the iteration that closes each gap. Prioritised by learning value.

## Practice / execution gaps

| Gap | Current | Target | Iter |
|---|---|---|---|
| No editable, runnable SQL | static code blocks | real in-browser SQL (DuckDB-WASM) on the e-commerce dataset | 1 |
| No SQL/modeling exercise bank | quizzes only | ~25 exercises (staging→marts, grain, dedup, windows, incremental SQL) with starter/solution/tests | 1 |
| No Jinja practice | m14 read-only | write/debug Jinja exercises, labeled evaluator | 2 |
| No YAML/config repair drills | cheatsheet | malformed `dbt_project.yml` / schema.yml repair with real YAML validation | 2 |
| Valid vs parsed vs compiled vs executed vs correct | implied | explicit ladder taught + shown in Studio | 1–2 |

## Interview gaps

| Gap | Current | Target | Iter |
|---|---|---|---|
| Bank breadth | 44 full-schema Qs | ~250–320 distinct full-schema Qs, all categories | 3 |
| Competency coverage visibility | none | coverage matrix (category × difficulty) from registry | 3 |
| Structured assessment | self-rated sim | rubric scoring + weak-topic tracking across 4 modes | 3 |
| Coding interview mode | none | timed problem on DuckDB-WASM with hidden tests | 3 |

## Incident / production gaps

| Gap | Current | Target | Iter |
|---|---|---|---|
| Full investigate→recover loop | m33 (3 scenarios) | reusable engine: briefing→evidence→investigate→root cause→recovery→consequence→fix→validate→prevent→report | 4 |
| Scenario count | ~13 across m24/m25/m33 | the 20 named scenarios | 4 |
| Multiple valid recovery paths | mostly single-path | branch-aware consequences | 4 |

## Deferred to Iter 5–7 (post-reassessment)

| Gap | Iter |
|---|---|
| Project Explorer (file tree, lineage, impact analysis) | 5 |
| Downloadable real dbt project + local run guide | 6 |
| Adapter comparison matrix (sourced, per-warehouse) | 6 |
| Artifact-inspection exercises (manifest/run_results) | 6 |
| Notes, spaced repetition, a11y pass, responsive QA | 7 |

## Non-gaps (already solid — preserve, don't rebuild)

Narrative foundation (m01–m09) · internals visualizers (m17–m19) · selectors/state (m20) · testing labs (m22–m23) · CI/CD & environments (m27–m28) · command playground (m32) · the e-commerce capstone (m33) · nav/search/progress/quiz/theme infrastructure.
