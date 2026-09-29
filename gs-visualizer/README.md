# GS Airflow — SSC General Studies PYQ Map

A frequency-first study tool for SSC General Studies. Every previous-year
question (PYQ) is parsed from the Pinnacle *"SSC GS 6500+ TCS MCQs"* bank and
ranked by **how often** and **how recently** each topic is asked — so you open
the tool and immediately see where the marks are, then drill into any topic to
see exactly which parts the questions come from.

Pure static site — HTML + CSS + vanilla JS, no framework, no backend. Works
offline once loaded; deploys as-is on GitHub Pages.

## Views

- **Priority Board** — every topic ranked P1/P2/P3 (frequency × recency).
  Study P1 first. Sort by priority / most-asked / most-recent; filter by
  section or exam.
- **Topic Map** — the syllabus as an Airflow-style flow graph
  (Subject → Section → Topic). Bubble size = question count, glow = recency,
  ring colour = priority tier.
- **Heatmap** — exam × section, exam × year, and section × year grids showing
  where questions actually come from.
- **Quiz** — drill real PYQs with full solutions; high-frequency-first, random,
  or most-recent order.
- **Drill-down drawer** (click any topic anywhere) — year heatmap, exam
  breakdown, and every PYQ for that topic with its solution and exam source.

## Coverage

| Subject   | Status                         |
|-----------|--------------------------------|
| History   | ✅ live (924 questions parsed) |
| Polity, Geography, Economics, Physics, Chemistry, Biology | ⏳ same pipeline, pending parse + validation |

## Data pipeline

`tools/parse_pinnacle.py` rebuilds the data files from the source PDF. The PDF's
3-level topic hierarchy is encoded in font sizes (16pt subject / 14pt section /
12pt sub-topic; 9pt body) and every question carries an exam + date line, which
is where the frequency and recency signals come from.

```bash
pip install pdfminer.six
python tools/parse_pinnacle.py "/path/to/Pinnacle.pdf" history
# -> writes data/history.js  (window.GS_HISTORY)
```

To add another subject: uncomment its page range in `SUBJECTS` inside
`tools/parse_pinnacle.py`, run it, eyeball the reported counts, then load the
new `data/<subject>.js` from `index.html`.

## Files

```
index.html          app shell + view scaffolding
css/app.css         theme + all view styles (dark/light)
js/app.js           aggregation, priority scoring, all four views + drawer
data/history.js     parsed questions + taxonomy (window.GS_HISTORY)
tools/parse_pinnacle.py   PDF -> data/*.js
```
