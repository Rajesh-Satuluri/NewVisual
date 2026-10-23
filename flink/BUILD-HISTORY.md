# Flink Learning Platform — Build History

A complete record of the build of the **Apache Flink interactive learning SPA**
("Uber Edition"), from the first migration into NewVisual through the current
deployed state.

- **Live site:** <https://rajesh-satuluri.github.io/NewVisual/flink/>
- **Repo:** `Rajesh-Satuluri/NewVisual` · deploy = push to `main` (GitHub Pages via `.github/workflows/deploy.yml`)
- **Dev branch:** `claude/epic-heisenberg-6l5z34`
- **Current build tag:** `BUILD = '20261009e'` (cache-buster in `flink/script.js`)
- **Current module count:** 20 (m01–m19 + m13b Savepoints)
- **Last documented commit:** `f17f2d8`

---

## What it is

A vanilla-JS ES-module single-page app — **no framework, no build step**. Every
Flink concept is taught through one running example: **Uber's real-time data
platform** (1M GPS pings/sec, sub-100ms fraud detection, surge pricing).

**Architecture at a glance:**
- Hash routing (`hashchange`) with modules lazy-loaded via dynamic `import()` from a `LOADERS` map in `script.js`.
- Cache-busting: `const imp = (p) => import(\`${p}?v=${BUILD}\`)` — the `BUILD` tag is bumped on every deploy so browsers fetch fresh module code.
- Shared UI helpers: `components/module-shell.js` (`createModuleShell`, `initTabs`, `createIQSection`, `initIQ`) and `components/story-ui.js` (`rideSpine`, `rideCallout`, `pyCode`, `scenarioCard`).
- The **ride-lifecycle spine** (canonical ride `R-4471`) is the narrative backbone threaded through every module.
- Progress counter reads `MODULES.length` dynamically, so adding a module auto-updates the "/N complete" totals.

---

## Phase 1 — Foundation & content build (Iterations 0–9)

The original curriculum was migrated into NewVisual and rebuilt module-by-module
onto the ride-lifecycle narrative with verified PyFlink code snippets.

| Commit | Date | What shipped |
|---|---|---|
| `59f1cee` | 2026-10-08 | **Iteration 0** — canonical ride `R-4471`, interview-case catalogue, verified PyFlink snippets (migrated to NewVisual) |
| `709c799` | 2026-10-08 | **Iteration 1** — ride-lifecycle spine + story-UI primitives (piloted on m09 Watermarks) |
| `00b7ec6` | 2026-10-08 | **Iteration 2** — Watermarks (m09) reworked onto the ride spine + PyFlink |
| `b167681` | 2026-10-08 | **Iteration 3** — Time (m08) + Windows (m10) |
| `f8e6d20` | 2026-10-08 | **Iteration 4** — state trio: State Mgmt / Checkpointing / Fault Tolerance (m11/m12/m13) |
| `123e57f` | 2026-10-08 | **Iteration 5** — Backpressure (m14) + Flink SQL/Table API (m15) |
| `952b8b2` | 2026-10-08 | **Iteration 6** — Parallelism (m05) + Operators (m06) + Sources/Sinks (m07) |
| `7dd368b` | 2026-10-08 | **Iteration 7** — Connectors (m16) + Flink SQL Advanced (m17) |
| `84e69f0` | 2026-10-08 | **Iteration 8** — foundation (m01–m04), Performance (m18) + capstone Uber Pipeline (m19) |
| `7828b17` | 2026-10-08 | **Iteration 9** — interview scenario drill + global Java→PyFlink residue sweep |

**Outcome:** a full 19-module curriculum (m01–m19) plus reference pages (Master
Map, Engine Comparison, Glossary, Cheat Sheet, Study Hub), all grounded in the
Uber story and PyFlink.

---

## Phase 2 — Guided Learning Path

| Commit | Date | What shipped |
|---|---|---|
| `61b8486` | 2026-10-09 | Added the guided **Learning Path** ("Start Here") page |
| `36529fe` | 2026-10-09 | Added a reset-progress control to the Learning Path |
| `d9c2e25` | 2026-10-09 | Rewrote Learning Path "Acts" as narrative scenes (removed bare DEFECT codes) |

---

## Phase 3 — "What & Why" foundations tabs

A consistent **📖 What & Why** foundations tab was added to every content module,
so each one opens with plain-language context before the interactive deep-dive.

Modules updated (one commit each, `2026-10-09`): State Mgmt (m11), Operators
(m06), Sources & Sinks (m07), Watermarks (m09), Windows (m10), Checkpointing
(m12), Fault Tolerance (m13), Backpressure (m14), Flink SQL & Table API (m15),
Connectors (m16), Architecture (m03), Job Lifecycle (m04), Parallelism (m05),
Flink SQL Advanced (m17), Performance (m18).
Commits: `98e3e0f`, `9e48723`, `395ebf7`, `23688c4`, `de51629`, `5ae401e`,
`03483eb`, `4a3e0f0`, `bfc0fc5`, `a5146f5`, `fad3c14`, `126a03d`, `c7b154e`,
`619274c`, `f644a70`.

Plus `a0cd477` — improved space utilization in the m03 Architecture Diagram tab.

---

## Phase 4 — Deploy hardening

| Commit | Date | What shipped |
|---|---|---|
| `db6e544` | 2026-10-09 | Added **cache-busting build tag** to lazy module imports (`?v=BUILD`) so deploys invalidate stale browser caches |

---

## Phase 5 — Curriculum reconciliation & Savepoints restore (current session)

A screenshot review surfaced a systematic **nav/content label drift** — the
sidebar labels no longer matched the actual module content — plus topic overlaps
and an orphaned Savepoints module. This phase fixed all of it.

| Commit | Date | What shipped |
|---|---|---|
| `0caed7f` | 2026-10-09 | **Fixed module labels to match content** across m06/m07/m13/m14/m15; moved m15 (Flink SQL & Table API) into the APIs & Connectors group |
| `bc10a76` | 2026-10-09 | **Reconciled connector/SQL topic overlaps** — scope split (m07 Sources & Sinks vs m16 Connectors; m15 vs m17 SQL) + bidirectional cross-link cards + tab rename, no renumbering; full validation pass |
| `f17f2d8` | 2026-10-09 | **Restored the dedicated Savepoints module** as new `m13b` (16.8 KB), inserted between Fault Tolerance and Backpressure without renumbering m01–m19 |

### Label realignment (`0caed7f`)
- m06 → **Operators** (🔧), m07 → **Sources & Sinks** (🔗), m13 → **Fault Tolerance** (🛡️), m14 → **Backpressure** (🌡️), m15 → **Flink SQL & Table API** (📊, moved to APIs & Connectors group).
- Touched: `nav.js`, `master-map.js`, `home.js`, `learning-path.js`, `data/ride-story.js` (CONCEPT_INDEX remap).

### Overlap reconciliation (`bc10a76`)
- Differentiated scope rather than merging: m07 focuses on the source/sink mechanics, m16 on the ecosystem/2PC; m15 on SQL & Table API basics, m17 on advanced SQL patterns.
- Added bidirectional cross-reference cards (m07↔m16, m15→m17) and renamed m07's "Connector Explorer" tab to "Source/Sink Explorer".

### Savepoints restore (`f17f2d8`)
- New file `modules/m13b-savepoints.js` — 4 tabs (What & Why, Upgrade Flow, CLI & Code, Interview Q&A), 6 interview questions, anchored to the `JOB_UPGRADE` ride stage ("Planned Upgrade" 🛠️).
- Wired into `nav.js` (`{ id: 'm13b', title: 'Savepoints', num: '13b', group: 'State & Fault' }`), `script.js` LOADERS, `master-map.js`, `home.js`, `learning-path.js` deep-dive path.
- Chose **m13b** over renumbering to avoid breaking every module badge and the just-added cross-links.
- Completion toast changed from hardcoded "19 modules" to dynamic `${MODULES.length}`.

---

## Current module map

**Foundations:** m01 Intro · m02 Streaming Fundamentals · m03 Architecture · m04 Job Lifecycle · m05 Parallelism
**Operators & Dataflow:** m06 Operators · m07 Sources & Sinks
**Time & Windows:** m08 Time Concepts · m09 Watermarks · m10 Windows
**State & Fault:** m11 State Management · m12 Checkpointing · m13 Fault Tolerance · **m13b Savepoints** · m14 Backpressure
**APIs & Connectors:** m15 Flink SQL & Table API · m16 Connectors · m17 Flink SQL (Advanced)
**Deliver & Optimise:** m18 Performance · m19 Uber Pipeline
**Reference:** Master Map · Engine Comparison · Glossary · Cheat Sheet · Study Hub · Learning Path

> **Note on legacy filenames:** some module *files* carry historical names from
> before the label realignment — e.g. `m13-savepoints.js` actually holds *Fault
> Tolerance* content, and `m15-backpressure.js` holds *Flink SQL & Table API*.
> The user-facing labels (nav, titles) are correct; only the on-disk filenames
> lag. Renaming them is an available cleanup but was not requested.

---

## Deployment & verification notes

- **Deploy mechanism:** push to `main` → `deploy.yml` → `upload-pages-artifact` + `deploy-pages@v4` → GitHub Pages.
- **Verification constraint:** `github.io` is unreachable from the build container (proxy 403), so live-deploy verification is done via GitHub's **deployments API** + **contents API** at the deployed commit SHA, plus local Playwright rendering — not by fetching live HTML.
- **Last verified live:** deployment `f17f2d8` (status `success`); published tree confirmed to contain `m13b-savepoints.js` + nav/loader wiring + `BUILD='20261009e'`.
- **Test harness:** `flink/scripts/verify.mjs` (run from the `flink` dir: `node scripts/verify.mjs route1,route2,...`).
