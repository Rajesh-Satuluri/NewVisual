# Implementation Plan — Premium Platform Redesign

_Phased, additive, per-iteration deploy. Every iteration preserves all existing content (gated by `tools/content-baseline.js`) and keeps the app runnable and green._

## Guardrails (run every iteration)

1. `node tools/content-baseline.js` — no content ID removed.
2. `node tools/validate-content.js` — 0 errors.
3. `node tools/test-service-detail.js` + existing `tools/test-*.js` — all pass.
4. `node tools/coverage-ledger.js` — coverage not regressed.
5. Playwright smoke of the changed screens — no new console errors.
6. Commit → push `main` → confirm GitHub Pages deploy `success`.

## Iterations

| Iter | Phase | Scope | Status |
|---|---|---|---|
| **A** | — | Finish 5 Fabric deep dives + coverage ledger | ✅ done (`3b0b505`) |
| **B** | 0 | Audit docs + content-preservation baseline gate | ◀ this iteration |
| **C** | 1 | Design system: tokenize colors, type/space scale, primitives (tabs/modal/drawer/skeleton/toast/progress-ring/command-palette shell) | next |
| **D** | 2 | App shell: capability-first sidebar (route aliases over existing routes), collapsible nav, breadcrumbs, **global Cmd-K search** | |
| **E** | 3 | Premium dashboard: continue-learning, 4 actions, skill overview, recommended-next, cert progress; optional onboarding. Real data only. | |
| **F** | 4 | Service-doc UX: section tab-navigator, progressive disclosure, copy-code, related-content links, checkpoints. Theory preserved. | |
| **G** | 5a | Visualizer framework + Spark execution stepper (labelled conceptual sim) | |
| **H** | 5b | Delta transaction explorer + pipeline + storage visualizers | |
| **I** | 6 | Architecture Studio canvas (additive; feeds existing design-challenge validation) | |
| **J** | 7 | Incident investigation workspace (evidence-driven flow over existing engine) | |
| **K** | 8+9 | Exam/interview polish + skill-analytics grid ("Not assessed" where no evidence) | |
| **L** | 10–12 | Polish, responsive/regression, journey walkthrough, final report | |

## Non-negotiables

- No fabricated metrics — skill/mastery shows "Not assessed" without evidence from `TV.Progress`.
- Simulations labelled as conceptual, not live cloud execution.
- Code examples labelled illustrative unless actually tested.
- No dead controls; existing routes keep working (aliases, not breakage).
- Backend-free throughout (local search, local state).

## Sequencing logic

B+C are the foundation every later iteration reuses. D delivers the biggest felt UX win early (nav + search). E–F re-skin existing value without touching data. G–I are the net-new differentiators. J–L harden and verify.
