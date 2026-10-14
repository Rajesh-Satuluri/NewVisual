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

## Iter 1 — Coding Studio (real SQL) ✅

- [x] `/studio` route + nav entry (Practice group) + home hero CTA
- [x] DuckDB-WASM engine wrapper (lazy CDN, version-fallback, sandboxed worker; no eval/shell)
- [x] Editor (Ctrl/⌘-Enter to run, Tab-indent) + run + check + reset + output table + error surface + progressive hints + solution reveal + solved-progress persistence
- [x] Seed dataset (6 tables, intentional dedup/fan-out/refund quirks) loaded into DuckDB
- [x] 25 SQL/modeling exercises (full schema), all solutions validated against real DuckDB (`tools/validate-sql.mjs`, 0 failing)
- [x] "Actual execution — DuckDB-WASM" labeling; graceful degradation if CDN unreachable
- [x] Verified headless: renders + interactions + graceful engine-offline, 0 pageerrors

## Iter 2 — Jinja / YAML / config ✅

- [x] Real YAML parse (js-yaml in production; tested yaml-mini fallback offline/CI — validated vs PyYAML)
- [x] Labeled pure-JS Jinja teaching-evaluator (if/for/set/filters/ref/var) — cross-checked vs real Jinja2
- [x] `/config-lab` route + Practice nav entry
- [x] 12 exercises (6 Jinja, 6 YAML repair) with full schema; all validated offline (`tools/validate-config.mjs`, 0 failing)
- [x] valid→parsed→compiled→executed→correct ladder UI (per-exercise stage highlight)
- [x] Verified headless: Jinja Check pass, YAML Check pass (yaml-mini), broken starter rejected, 0 pageerrors

## Iter 3 — Interview Academy ✅

- [x] Bank → **293** distinct full-schema questions (44 core + 249 authored; 8 tiers)
- [x] Competency coverage matrix (15 areas × difficulty) with live counts + weak-topic chips
- [x] Simulator tracks: ramp / scenario+design / debugging / senior / full-mock; written-answer box + self-assessment
- [x] Weak-topic persistence (`dbt-weak-topics`) → surfaced on the Coverage Matrix
- [x] content-lint 0/0; headless verify (bank + coverage + sim), 0 pageerrors — deployed

## Iter 4 — Production Incident Simulator ✅

- [x] Reusable multi-step engine: briefing → evidence → hypothesis → root cause → recovery → fix → validate → postmortem
- [x] **20** named scenarios (data/incidents.js); schema-checked (one correct hypothesis + one correct recovery each)
- [x] Scored hypothesis + recovery choice with consequences; generated 5-part postmortem + 0/2 triage score
- [x] On-call playbook tab (4-bucket taxonomy + loop); Practice nav entry + lazy loader; registry `incidentCount`
- [x] Illustrative-fix labelling (nothing executed); adapter-specific behavior called out
- [x] content-lint 0/0; headless full-flow verify, 0 pageerrors — deployed

## Iter 5 — Sample Project Explorer ✅

- [x] `data/sample-project.js` — complete runnable `jaffle_commerce` dbt project (**19** real source files: dbt_project.yml, profiles, packages, sources, staging + marts models, schema.yml tests, macro, snapshot, singular test, seeds, README)
- [x] `/project-explorer` route + Practice nav entry + lazy loader; registry `projectFiles`
- [x] Browsable file tree (derived from paths) + per-file viewer with highlighting + per-file download
- [x] "Run it locally" tab: one-click **self-extracting setup script** (quoted heredocs, verbatim) → actually `dbt build`s on DuckDB, no warehouse
- [x] Honest labelling: nothing executed in-browser; Explorer only displays + packages real dbt source
- [x] content-lint 0/0; headless render + file-switch verify, 0 pageerrors — deployed

## Iter 6 — Spaced Review ✅

- [x] `/spaced-review` route + Practice nav entry + lazy loader
- [x] Compact **SM-2** scheduler (SuperMemo-2 family) over all 293 bank questions; due-today queue + new-card cap
- [x] Reveal → 4-grade recall (Again/Hard/Good/Easy) with projected next-interval; lapse resets to 1 day
- [x] Progress tab (due/studied/mature/new + bar) and reset; state local-only (`dbt-srs`), stable hashed card ids
- [x] content-lint 0/0; headless reveal→grade→advance + persistence verify, 0 pageerrors — deployed

## Iter 7 — Build Health + route hardening ✅

- [x] `data/loader-map.js` — single source of truth for route→file; `script.js` builds LOADERS from it; content-lint imports it (no more text-scraping) and guards the refactor
- [x] `/build-health` route + Reference nav entry: **live** in-browser checks (registry parity, bank schema, dedup, incident invariants, all routes import+mount, quiz indices) — 10/10 passing
- [x] **Build-time** checks surfaced honestly (DuckDB/Jinja2/PyYAML/headless) with last recorded results, clearly labelled not re-executed in the sandbox
- [x] Content-counts tab derived live from the registry
- [x] content-lint 0/0; headless verify (live board all-green), 0 pageerrors — deployed
- [x] (Deliberately skipped the spec's app-wide UX redesign — it would violate the no-redesign rule; hardening + test harness kept instead)

## Verification gates (every wave)

1. `node tools/content-lint.mjs` → 0 errors
2. `node --check` on every changed JS file
3. Headless Chromium route render (dark + light), 0 pageerrors
4. New-interaction smoke test
5. Merge to `main` (auto-deploy)

## Honest limitations (running)

- No backend; no real in-app `dbt run` (real SQL only, via DuckDB-WASM). Real dbt runtime = downloadable project (Iter 6).
- Progress is local-only (localStorage), not cloud-synced.
