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
- [ ] Iteration 2 — Batch/incremental simulators (watermark, watermark-failure, backfill, ADF pipeline).
- [ ] Iteration 3 — Streaming, Auto Loader, checkpoint internals, Delta internals.
- [ ] Iteration 4 — Silver, Gold, DLT/Lakeflow, SCD, Unity Catalog, security, monitoring.
- [ ] Iteration 5 — Failure/debugging, incident simulator, data quality, CI/CD, DR, trace-a-record.
- [ ] Iteration 6 — Interview system, follow-up engine, whiteboard, system design, quiz, cheat sheet.
- [ ] Iteration 7 — Global search, cross-linking, learning path, progress tracking, code explorer, polish.

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
