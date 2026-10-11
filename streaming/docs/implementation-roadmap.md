# Implementation Roadmap — Streaming Engineering Master Lab

> **Purpose (I05).** The authoritative gate/iteration map, current status, and
> exit criteria. This is the single source of truth for "what's done / what's next."

## Status legend
✅ done · 🔜 next · ⬜ planned

## Gate 1 — Audit & Architecture (docs only; touches nothing in kafka/ or flink/)
| Iter | Deliverable | Status |
|------|-------------|--------|
| I01 | `module-inventory.md` (Kafka half) | ✅ |
| I02 | `module-inventory.md` (Flink half) | ✅ |
| I03 | `content-preservation-manifest.json` (93 files, full sha256) | ✅ |
| I04 | `component-inventory.md` (drift analysis + reuse ledger) | ✅ |
| I05 | `architecture-audit.md`, `migration-plan.md`, `technical-accuracy-review.md`, `implementation-roadmap.md` | ✅ |

**Gate 1 exit:** 7 audit docs present and internally consistent. ✅ **Met.**

## Gate 2 — Shell & scenario framework (first deployable template)
| Iter | Deliverable |
|------|-------------|
| I06 | Skeleton: `index.html`, hash router, `LOADERS`, `?v=BUILD`, base `styles.css` |
| I07 | Theme tokens + dark/light toggle (`sml-theme`) |
| I08 | Shared component layer (merge/adopt per component-inventory) |
| I09 | Top nav — 12 sections + Cloud sub-tabs |
| I10 | Content registry (`data/registry.js`, stable concept IDs) |
| I11 | Scenario data models (Uber R-4471 + E-commerce O9001) |
| I12 | Global scenario switcher (`sml-scenario`) |
| I13 | Progress store (`sml-*` namespace) |
| I14 | Home / hero page |

**Gate 2 exit:** navigable template site renders in both themes, scenario switch
changes real data, 0 console errors. **This is the first state worth a live link.**

## Gate 3 — Preserve Kafka + Flink
I15 engine+tests · I16–I18 Kafka modules (3 batches) · I19 Kafka aux · I20 e-comm scenario
· I21 Flink story/pyflink · I22–I24 Flink modules (3 batches, de-drift) · I25 Flink aux
· I26 e-comm scenario · I27 full preservation regression suite.
**Exit:** `verify-preservation.mjs` green; engine 12/12; manifest reconciled.

## Gate 4 — Foundations
I28 shared sim framework · I29 sim UI · I30–I36 the 15 modules · I37 cross-links+tests.

## Gate 5 — Cloud (three sub-gates, each opens with an accuracy pass)
- **5a AWS:** I38 accuracy · I39–I42 modules · I43 case studies.
- **5b Azure:** I44 accuracy · I45–I49 modules · I50 case studies.
- **5c Databricks:** I51 accuracy · I52–I57 modules · I58 case studies.

## Gate 6 — Cross-cutting engines
I59 concept graph · I60 comparison · I61 Trace One Event · I62 Break the Pipeline
· I63 Architecture Builder · I64 Decision Engine · I65 capacity calculator.

## Gate 7 — Practice surfaces
I66 Incident Lab engine · I67–I68 incidents · I69 System Design Lab · I70 Interview
Master shell+port · I71–I72 question banks.

## Gate 8 — Dashboard, search, paths, polish, release
I73 dashboard · I74 search · I75 glossary · I76 paths · I77 multi-level explanations
· I78 a11y/responsive · I79 performance · I80 full regression · I81 landing-page card
+ verified production deploy.

## Totals
**81 iterations across 8 gates.** Gate-by-gate approval; each iteration leaves a
working tree and never touches the 7 protected tools.

## Deploy milestones (push to `main` — each gated on explicit approval)
- **First live template:** after Gate 2 (I06–I14).
- **Kafka+Flink live in new lab:** after Gate 3.
- **Full product:** after Gate 8 (I81 adds the root landing-page card + verified deploy).

## Current position
Gate 1 complete (I01–I05). **Next: Gate 2, starting at I06** — on explicit "go".
