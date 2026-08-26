# PySpark Interview Lab

An interactive study tool for PySpark interview coding questions, part of the
[NewVisual](../) monorepo. Pure HTML + CSS + vanilla JS, no framework, no build.

Live: `https://rajesh-satuluri.github.io/NewVisual/pyspark-visualizer/`

## What's here

Each problem is presented as: a paraphrased prompt, sample DataFrames as worked
examples, plain-English **Complete Logic** (Key Idea → Step-by-Step), a
**Solution Code** panel that toggles between RCS (commented) and clean PySpark,
the **Spark SQL equivalent**, a **Spark Internals & Performance** note
(shuffle vs. narrow, partitioning, pushdown, UDF-avoidance), and a merged
**Recognize & Recall** cue box — plus progress tracking, recall (blur) mode,
search, filters, a revision grid, and JSON export/import.

The sidebar **set filter** scopes by difficulty: `[ All | Easy | Medium | Hard ]`.

## Status

- **DataFrame Basics (Easy, Q1–Q20):** complete — the format-reference category.
- Remaining categories (Aggregations & GroupBy, Joins, Window Functions,
  Ranking & Dedup, Date & Time, Arrays/JSON/Nested, Cohort & Time-Series,
  Performance & Optimization, End-to-End Challenges) roll out in later iterations.

## Architecture

Follows the DSA Study Lab blueprint: `js/core.js` (registry + category order),
`js/app.js` (all rendering), `js/modules/{markdown,store}.js`, `js/vendor/`
(Prism + Fuse from npm), and one `data/<category>.js` file per category. Content
is authored in markdown strings; all problem statements are paraphrased.

## Local dev

```
cd pyspark-visualizer && python3 -m http.server 8080
```
