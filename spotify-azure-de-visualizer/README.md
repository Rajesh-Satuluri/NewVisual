# Spotify Azure Data Engineering — Architecture, Implementation & Interview Visualizer

An interactive Data Engineering learning lab, architecture visualizer, production-debugging
simulator and senior-interview coach for the **Spotify Azure DE** project. Pure HTML + CSS +
vanilla JS, no framework, no backend — runs directly from GitHub Pages.

**Source of truth:** the *Spotify Azure Data Engineering — Ultimate Interview Handbook* (17 modules).
Every explanation carries a source badge and a classification tag:

| Tag | Meaning |
| --- | --- |
| **Handbook-sourced** | Taken from the project handbook |
| **General DE Context** | General data-engineering knowledge, not project-specific |
| **Architecture Evolution / Hypothetical** | A proposed/alternative design, not the chosen one |
| **Not specified in the project handbook** | Explicitly unspecified |

## Build status — iterations

- [x] **Iteration 0 — Foundation & content spine.** Design system, routing shell, the 10-mode rail,
  and the reusable **9-layer explanation contract** (`ExplanationBlock`): Simple → Technical →
  Internals → Implementation → Why → Trade-offs → Failure/Recovery → Interview → Follow-up, with
  source traceability + classification tags. Handbook-grounded content records for every
  architecture node plus watermark / checkpoint / Auto Loader concept records.
- [x] **Iteration 1 — Complete Architecture mode.** Interactive, dominant SVG architecture diagram
  (Azure SQL → ADF → Bronze → Databricks/Auto Loader → Silver → DLT/Lakeflow → Gold → Unity Catalog →
  Consumers) with zoom, pan, clickable nodes, upstream/downstream highlighting, animated data flow,
  per-node **WHY?** and **WHAT IF?**, and a progressive **Explain Architecture** walkthrough.
- [x] **Iteration 2 — Batch / Incremental mode.** ADF pipeline visualizer (clickable
  `PL_SPOTIFY_INCREMENTAL_LOAD` activities), First-run vs Subsequent-run toggle, a live
  **Watermark Simulator** (editable boundaries + `updated_at`, shows exactly which rows select),
  a **Watermark Failure** stepper, and a **Backfill Simulator**.
- [x] **Iteration 3 — Streaming / Micro-Batch mode.** Auto Loader flow, **Checkpoint Internals**
  (offsets/commits/sources/schema), a trigger-selectable **Micro-Batch Timeline**, **Delta
  Internals** (INSERT/UPDATE/DELETE/MERGE → add/remove file actions in `_delta_log`), and a
  **Batch vs Real-Time** spectrum — `availableNow=True` framed as incremental batch, continuous
  streaming labelled *Architecture Evolution / Hypothetical*.
- [x] **Iteration 4 — Data Lineage (Mode 4) + Trace a Record (Mode 5).** Upstream lineage for any
  Gold asset; a single Spotify stream event animated end-to-end through the stack with per-stage
  transformation. New records: SCD Type 1/2, data quality, security, monitoring.
- [x] **Iteration 5 — Failure/Debugging (Mode 6) + Architecture Decision Engine (Mode 7).**
  "Break the pipeline" playbooks (Symptom→Root Cause→Investigation→Recovery→Impact→Prevention→Interview),
  a Production Incident Simulator, and why-this/why-not decision matrices for every major technology.
- [x] **Iteration 6 — Interview (Mode 8) + Whiteboard (Mode 9) + Quiz (Mode 10).** Level-filtered
  interview bank (L1 definition → L6 system design) with strong/senior answers and follow-ups;
  place-and-compare whiteboard; scored quiz with per-answer explanations. **All 10 modes now live.**
- [x] **Iteration 7 — Polish.** Global search across every content record (title + all layer text),
  cross-linking (related-concept chips in every panel), a **Learning Path** over the 17 handbook
  modules, browser-local **Progress Tracking** across the six knowledge dimensions with weak-area
  callouts, and a **Code Explorer** (4 representative snippets, each with the 8-question treatment,
  labelled *Illustrative*). **The visualizer is now feature-complete.**

## Structure

```
spotify-azure-de-visualizer/
  index.html            # shell: appbar, mode rail, canvas, side panel, overlay
  css/main.css          # engineering-lab theme
  data/content.js       # CONTENT SPINE — 9-layer records + source + tags
  js/explain.js         # ExplanationBlock (9-layer contract renderer)
  js/architecture.js    # interactive SVG architecture graph (Mode 1)
  js/app.js             # controller: panel, mode rail, walkthrough, what-if, search
```

## Local development

```bash
cd spotify-azure-de-visualizer
python3 -m http.server 8080
# open http://localhost:8080
```
