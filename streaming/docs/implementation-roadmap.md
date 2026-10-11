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

## Gate 2 — Shell & scenario framework (first deployable template) ✅
| Iter | Deliverable | Status |
|------|-------------|--------|
| I06 | Skeleton: `index.html`, hash router, `LOADERS`, `?v=BUILD`, base `styles.css` | ✅ |
| I07 | Theme tokens + dark/light toggle (`sml-theme`) | ✅ |
| I08 | Shared shell primitives (template subset; full merge in Gate 3) | ✅ |
| I09 | Nav — 12 sections, grouped, registry-driven | ✅ |
| I10 | Content registry (`data/registry.js`, stable section IDs) | ✅ |
| I11 | Scenario data models (Uber R-4471 + E-commerce O-9001) | ✅ |
| I12 | Global scenario switcher (`sml-scenario`) | ✅ |
| I13 | Progress store (`sml-*` namespace) | ✅ |
| I14 | Home / hero page + generic section pages | ✅ |
| +   | `favicon.svg`; root landing-page card (early I81) | ✅ |

**Gate 2 exit:** navigable template renders in both themes, scenario switch changes
real data, **0 console errors, 0 404s** (verified via Playwright). ✅ **Met — deployed.**

## Gate 3 — Preserve Kafka + Flink ✅
Ported both apps into the lab as **self-contained, byte-identical** sub-apps
(`streaming/kafka/`, `streaming/flink/`), guaranteeing 100% preservation, then wired
them as live sections.
| Iter | Deliverable | Status |
|------|-------------|--------|
| I15 | Kafka sim engine + tests (ported) | ✅ 12/12 green |
| I16–I19 | Kafka modules (22) + playground + aux + data banks | ✅ byte-identical |
| I21–I25 | Flink modules (20, incl. m13b) + story-ui + PyFlink + aux | ✅ byte-identical |
| I27 | Preservation regression suite (`scripts/verify-preservation.mjs`) | ✅ 93/93 |
| +   | `shared/` helper copied; nav/home/router deep-link to ported apps | ✅ |

**Gate 3 exit:** `verify-preservation.mjs` → **93/93 files byte-identical**; ported
Kafka engine **12/12**; both apps smoke-tested under `streaming/` with **0 console
errors, 0 404s**. ✅ **Met — deployed.**

> **Deferred within Gate 3 (logged, not dropped):** I20/I26 — making each ported
> module's *internal* examples switch live between Scenario A (Uber) and Scenario B
> (e-commerce) via the global switcher. Today both scenarios are represented across
> the lab (Kafka ships the Amazon/e-commerce worked example; Flink ships Uber R-4471),
> but the top-bar switcher does not yet re-frame inside the ported modules. Doing so
> requires an ADAPTED overlay on preserved files and is best sequenced after the
> shared-component merge — tracked as a follow-up so preservation stays provable.

## Gate 4 — Foundations ✅
| Iter | Deliverable | Status |
|------|-------------|--------|
| I28 | `sim/stream-engine.js` — deterministic event-time/watermark/window/state/checkpoint/backpressure engine + 11 tests | ✅ 11/11 |
| I29 | `components/lesson-shell.js` (tabs) + `components/sim-ui.js` (canvas helpers) | ✅ |
| I30–I36 | 15 Foundations modules (`data/foundations.js`), scenario-aware | ✅ |
| +   | 5 live simulators: event-time skew, watermarks, windows, checkpoint recovery, backpressure | ✅ |
| I37 | Foundations landing + routing (`#foundations`, `#f01`–`#f15`) + nav/progress | ✅ |

**Gate 4 exit:** all 15 modules render, 5 deterministic simulators interactive, scenario
switch re-frames content, both themes, **0 console errors, 0 404s** (Playwright); engine
**11/11**. ✅ **Met — deployed.**

## Gate 5 — Cloud (three sub-gates, each opens with an accuracy pass)
- **5a AWS ✅** — I38 accuracy pass (validated Kinesis/MSK/Firehose/Lambda facts vs official
  docs, logged in technical-accuracy-review §5) · I39–I42 **20 modules** · I43 e2e architecture.
  Reusable cloud-module system (`data/cloud-providers.js`, `modules/cloud.js`,
  `modules/cloud-module.js`) built here, reused for 5b/5c. Exit: 20 modules render, scenario
  re-frames, both themes, 0 errors/404s. **Deployed.**
- **5b Azure ✅** — I44 accuracy pass (Event Hubs partitions/TU/retention/consumer-groups, Kafka
  protocol, Capture, Stream Analytics 5 window types — validated vs Microsoft Learn, logged §5) ·
  I45–I49 **21 modules** · I50 e2e architecture. Exit: 21 modules render, scenario re-frames, both
  themes, 0 errors/404s. **Deployed.**
- **5c Databricks ✅** — I51 accuracy pass (Structured Streaming triggers/checkpoints/exactly-once,
  watermarks & stateful ops, Auto Loader, DLT→Lakeflow Declarative Pipelines, Delta/medallion, RocksDB —
  validated vs docs.databricks.com, logged §5) · I52–I57 **27 modules** (authored at full 4-tab depth) ·
  I58 e2e architecture (`#databricks27-pipeline`). Exit: 27 modules render with 4 tabs + Interview Q&A,
  scenario re-frames, both themes, 0 errors/404s. **Deployed.**

> **Gate 5 complete.** All three cloud providers (AWS 20 · Azure 21 · Databricks 27 = 68 modules) live at
> the Kafka/Flink 4-tab depth, every fact validated against official docs.

> **Depth upgrade (post-5b):** AWS (20) and Azure (21) modules deepened from single-tab
> prose to the full **4-tab** structure — Concept · Mechanics (diagrams/tables/code) ·
> In-your-scenario deep-dive · Interview Q&A (collapsible) — matching the Kafka/Flink bar.
> Added reusable `iqSection`/`compareTable`/`flowDiagram` helpers. Databricks (5c) will be
> authored to this depth from the start.

## Gate 6 — Cross-cutting engines ✅
Hub (`#engines`) + 7 interactive tools, scenario-aware, routed via `#eng-*`.
| Iter | Deliverable | Status |
|------|-------------|--------|
| I59 | Concept graph — clickable canvas graph of 12 concepts + edges, jump-to-module | ✅ |
| I60 | Comparison matrix — Kafka/Flink/Kinesis/Event Hubs/Databricks on 9 dimensions + Q&A (exactly-once stated carefully) | ✅ |
| I61 | Trace One Event — step a scenario event through the pipeline stage-by-stage | ✅ |
| I62 | Break the Pipeline — 6 faults, predict-then-reveal symptom + fix | ✅ |
| I63 | Architecture Builder — source/processor/sink + requirements, conflict-checked | ✅ |
| I64 | Decision Engine — 4-question guided technology recommendation with rationale | ✅ |
| I65 | Capacity calculator — throughput/storage/partitions with every assumption shown | ✅ |

**Gate 6 exit:** hub + all 7 tools render & interact, both themes, scenario re-frames,
**0 console errors, 0 404s** (Playwright). ✅ **Met — deployed.**

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
