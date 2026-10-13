# APPSC Group 2 — Syllabus Map

A syllabus-first study tool for the **APPSC Group 2** exam (Andhra Pradesh Public Service Commission), built as a pure static site (HTML + CSS + vanilla JS, no build step). Sibling to the [GS Airflow](../gs-visualizer/) SSC lab.

## Views

- **Priority Board** — every syllabus section ranked by **mark weight**, filterable by stage (Prelims / Mains) and sortable by weight, syllabus order, or Andhra-specific focus. Click a section to see the exact parts it covers.
- **Syllabus Map** — the whole syllabus as a flow tree: **Paper → Section → Part**. The "veteran's map" of everything the exam can ask, colour-coded by stage.
- **Prep Tracker** — tap each part to mark it **Learning** then **Revised**. Marks-weighted **readiness rings** (Mains = merit, Prelims = gate), a **Revise next** strip that resurfaces whatever you studied longest ago (spaced revision), and per-paper progress. Saved in your browser (localStorage).
- **Blueprint** — the exam pattern (Prelims screening, Mains two papers, CPT), negative marking, what counts toward merit, and the **notification history** timeline.
- **PYQ Analysis** — **where the questions actually come from.** Built by OCR-reading 4 official papers (2019 & 2024 Prelims, 2025 Mains Paper-I & II) and mapping every recovered question onto the syllabus: biggest concentrations per paper-half, and a full per-section / per-sub-theme breakdown. Answers "which part of the syllabus gets the most questions."
- **Practice** *(auto-unlocks once per-question answer keys are added)* — **Coverage** (mark weight vs. PYQs seen → gap analysis), **Heatmap** (exam × topic / year), and a **Quiz** that drills real previous-year questions with solutions.

## Build phases

| Phase | Scope | Status |
|---|---|---|
| **0** | Syllabus skeleton: full Prelims + Mains tree, mark weights, blueprint, notification history | ✅ live |
| **Study** | Prep Tracker — study status, spaced revision, readiness (no PYQs needed) | ✅ live |
| **PYQ Analysis** | OCR 4 official papers → classify every question → **frequency by syllabus part** | ✅ live |
| **Quiz** | Attach per-question answer keys → Coverage + Heatmap + Quiz drill | needs answer keys |

### PYQ frequency — key findings (from the 4 parsed papers)

- **2025 Mains Paper-II, Science & Technology half: ~76% of questions are Environment / Ecology / Pollution / Climate / Sustainable Development** — space, defence, ICT and biotech barely feature. The single highest-yield area in the whole dataset.
- **2025 Mains Paper-II, Economy half:** Macro (National Income / Structure / Planning) + Money, Banking & Public Finance dominate (~2/3); AP-specific economy is a smaller but distinct block.
- **2025 Mains Paper-I:** AP History is led by **early + medieval dynastic/cultural history** (Satavahana→Kakatiya→Reddy→Vijayanagara); the Constitution half is led by **Union & State Government** and **Constitutional & Local Bodies**.
- **Prelims** is deliberately even by design — 2024 ran 5 sections × 30 Qs (History, Geography, Indian Society, Current Affairs, Mental Ability); 2019 ran 3 × 50 (GS+Mental Ability, AP History+Constitution, Planning & Economy).

### How the analysis is built (`tools/`)

The official papers are **scanned, bilingual image PDFs**, so the pipeline is OCR-based:

```
ocr_papers.py   # PyMuPDF renders each page @250dpi → tesseract (eng) → pyq_txt/*.txt
segment.py      # LIS over numbered markers → split into 150 questions, English stem + options
classify.py     # section fixed by each paper's printed header (number range); leaf by keyword rules
build_pyq.py    # aggregate → data/pyq.js  (declared = exact, captured = OCR-recovered)
```

Trust model: **declared** section counts are exact (printed on each paper's own header); **captured** counts are what OCR recovered (~89% of all questions across the 4 papers), lost roughly evenly — so proportions are reliable, but a bar is a floor, not an exact tally. The local scans, OCR dumps and venv are git-ignored; only the scripts and the aggregated `data/pyq.js` are committed.

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
