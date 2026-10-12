# Implementation Status

Living checklist for the Iter 0–4 build. Updated each wave. Counts are authoritative from `node dbt/tools/content-lint.mjs`.

## Iter 0 — Audit & safety net ✅ (in progress → complete)

- [x] `docs/PROJECT_AUDIT.md`
- [x] `docs/FEATURE_TRACEABILITY.md`
- [x] `docs/CONTENT_GAP_MATRIX.md`
- [x] `docs/TECHNICAL_ACCURACY_REVIEW.md`
- [x] `docs/IMPLEMENTATION_STATUS.md`
- [x] `dbt/data/registry.js` — single source of counts/coverage
- [x] `dbt/tools/content-lint.mjs` — automated integrity checks (0 errors / 0 warnings at baseline)
- [x] Dynamic counts: `script.js` toast + `home.js` stat strip wired to registry (removed hard-coded "16"/"33")
- [ ] Headless route sweep green (dark+light) → deploy

## Iter 1 — Coding Studio (real SQL) 🔵

- [ ] `/studio` route + nav entry
- [ ] DuckDB-WASM engine wrapper (lazy-loaded, sandboxed; no eval/shell)
- [ ] Editor + run + reset + output table + error surface + hints + solution + attempt history
- [ ] Seed dataset load (e-commerce) into DuckDB
- [ ] ~25 SQL/modeling exercises (full schema)
- [ ] "Actual execution" labeling + dialect-difference notes

## Iter 2 — Jinja / YAML / config 🔵

- [ ] Real YAML validation (js-yaml)
- [ ] Labeled Jinja teaching-evaluator
- [ ] Repair-broken-project exercises
- [ ] valid→parsed→compiled→executed→correct ladder UI

## Iter 3 — Interview Academy 🔵

- [ ] Bank → ~250–320 distinct full-schema questions
- [ ] Competency coverage matrix (category × difficulty) from registry
- [ ] 4 modes (oral/written/coding/system-design) with rubric scoring
- [ ] Weak-topic tracking + revision surface

## Iter 4 — Production Incident Simulator 🔵

- [ ] Reusable multi-step incident engine
- [ ] 20 named scenarios
- [ ] Branch-aware recovery consequences + incident report output

## Verification gates (every wave)

1. `node tools/content-lint.mjs` → 0 errors
2. `node --check` on every changed JS file
3. Headless Chromium route render (dark + light), 0 pageerrors
4. New-interaction smoke test
5. Merge to `main` (auto-deploy)

## Honest limitations (running)

- No backend; no real in-app `dbt run` (real SQL only, via DuckDB-WASM). Real dbt runtime = downloadable project (Iter 6).
- Progress is local-only (localStorage), not cloud-synced.
