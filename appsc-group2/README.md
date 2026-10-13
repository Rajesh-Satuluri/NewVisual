# APPSC Group 2 — Syllabus Map

A syllabus-first study map for the **APPSC Group 2** exam (Andhra Pradesh Public Service Commission), built as a pure static site (HTML + CSS + vanilla JS, no build step). Sibling to the [GS Airflow](../gs-visualizer/) SSC lab.

## Views

- **Priority Board** — every syllabus section ranked by **mark weight**, filterable by stage (Prelims / Mains) and sortable by weight, syllabus order, or Andhra-specific focus. Click a section to see the exact parts it covers.
- **Syllabus Map** — the whole syllabus as a flow tree: **Paper → Section → Part**. The "veteran's map" of everything the exam can ask, colour-coded by stage.
- **Blueprint** — the exam pattern (Prelims screening, Mains two papers, CPT), negative marking, what counts toward merit, and the **notification history** timeline.

## Build phases

| Phase | Scope | Status |
|---|---|---|
| **0** | Syllabus skeleton: full Prelims + Mains tree, mark weights, blueprint, notification history | ✅ live |
| **1** | Attach real previous-year questions (parse PYQ PDFs → structured JSON), coverage/gap view, heatmap, quiz | pending PYQ PDFs |

The data model (`data/syllabus.js`) is **PYQ-aware from day one**: every leaf topic carries a `pyq` slot (null in Phase 0). When Phase 1 attaches parsed questions, frequency/recency and the quiz light up with no UI rewrite.

## Data

`data/syllabus.js` — the official syllabus tree, exam pattern, and notification history. Compiled from APPSC public syllabus sources (psc.ap.gov.in scheme, Prepp / StudyIQ / Adda247 / KPIAS). The Mains is encoded to the current **objective 2-paper pattern (2023 onward)**; to be reconciled with the official 2026 notification when released.

## Notification frequency

APPSC Group 2 runs in bursts (roughly every few years, not annual). Firmly dated cycles: **2016** (No. 18/2016), **2018-19** (446 posts), **2023-24** (No. 11/2023, ~897 posts), **2026** (upcoming, ~673-750 posts). Freshest PYQ signal for Phase 1: screening 25 Feb 2024 + mains Feb 2025.
