# APPSC Group 2 — Syllabus Map

A syllabus-first study tool for the **APPSC Group 2** exam (Andhra Pradesh Public Service Commission), built as a pure static site (HTML + CSS + vanilla JS, no build step). Sibling to the [GS Airflow](../gs-visualizer/) SSC lab.

## Views

- **Priority Board** — every syllabus section ranked by **mark weight**, filterable by stage (Prelims / Mains) and sortable by weight, syllabus order, or Andhra-specific focus. Click a section to see the exact parts it covers.
- **Syllabus Map** — the whole syllabus as a flow tree: **Paper → Section → Part**. The "veteran's map" of everything the exam can ask, colour-coded by stage.
- **Prep Tracker** — tap each part to mark it **Learning** then **Revised**. Marks-weighted **readiness rings** (Mains = merit, Prelims = gate), a **Revise next** strip that resurfaces whatever you studied longest ago (spaced revision), and per-paper progress. Saved in your browser (localStorage).
- **Blueprint** — the exam pattern (Prelims screening, Mains two papers, CPT), negative marking, what counts toward merit, and the **notification history** timeline.
- **Practice** *(auto-unlocks once PYQs are added)* — **Coverage** (mark weight vs. PYQs seen → gap analysis), **Heatmap** (exam × topic / year), and a **Quiz** that drills real previous-year questions with solutions.

## Build phases

| Phase | Scope | Status |
|---|---|---|
| **0** | Syllabus skeleton: full Prelims + Mains tree, mark weights, blueprint, notification history | ✅ live |
| **Study** | Prep Tracker — study status, spaced revision, readiness (no PYQs needed) | ✅ live |
| **PYQ** | Parse PYQ paper PDFs → `data/syllabus.js`; unlocks Coverage + Heatmap + Quiz | machinery live, needs PDFs |

The data model (`data/syllabus.js`) is **PYQ-aware from day one**: every leaf topic carries a `pyq` slot (null until parsed). When PYQ papers are ingested, frequency/recency, coverage, heatmap and quiz all light up automatically — the Practice tab reveals itself — with no UI changes.

## Adding previous-year questions

PYQ paper PDFs can't be fetched from the build sandbox (network egress is restricted), so drop them into the repo and run the parser:

```bash
cd tools
python3 -m venv pdfvenv && ./pdfvenv/bin/pip install pdfminer.six
./pdfvenv/bin/python parse_appsc.py PAPER.pdf --exam "Group 2 Mains" --year 2025 \
    --key KEY.pdf --write
```

It segments questions, attaches the answer key, keyword-maps each question onto a syllabus leaf (low-confidence matches are listed for manual placement, never misfiled), and merges into `data/syllabus.js`. Freshest signal: **25 Feb 2024 screening** + **Feb 2025 Mains** papers. Tune the regexes in `parse_appsc.py` with `--debug` against your actual PDF layout.

## Data

`data/syllabus.js` — the official syllabus tree, exam pattern, and notification history. Compiled from APPSC public syllabus sources (psc.ap.gov.in scheme, Prepp / StudyIQ / Adda247 / KPIAS). The Mains is encoded to the current **objective 2-paper pattern (2023 onward)**; to be reconciled with the official 2026 notification when released.

## Notification frequency

APPSC Group 2 runs in bursts (roughly every few years, not annual). Firmly dated cycles: **2016** (No. 18/2016), **2018-19** (446 posts), **2023-24** (No. 11/2023, ~897 posts), **2026** (upcoming, ~673-750 posts).
