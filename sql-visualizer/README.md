# SQL Server — Interactive T-SQL Study Lab

An interactive study tool for **SQL Server (T-SQL)** interview questions, written to run
as-is in **SSMS 19 / 21** (SQL Server 2019 / 2022). For every problem (once content lands):

- **Brief Description** — a short, faithful paraphrase (not copyrighted platform text)
- **Schema & Sample Data** — rendered as real HTML tables (original sample data)
- **Expected Output** — the result table the recommended query produces
- **Setup Script** — runnable `CREATE TABLE` + `INSERT` to paste into SSMS
- **Complete Logic in Plain English** — the derivation and intuition, not a line-by-line translation
- **1–3 T-SQL approaches** with commented (RCS) ↔ clean toggles, only where genuinely instructive
- **Walkthrough**, **Pattern Recognition**, **Interview Recall** and **Common Mistakes** cues

**Live:** https://rajesh-satuluri.github.io/NewVisual/sql-visualizer/

> **Status:** app + SQL-adapted problem view are live, with **all 12 topics
> populated** (22 problems): Aggregation & Grouping, Filtering & Subqueries,
> Ranking, Joins, Window Functions, CTE & Complex Joins, String & Date
> Functions, Recursive / Hierarchy, Pivot / Conditional Agg, Gaps & Islands,
> Set Operations, and DML / DDL. More problems per topic will be added over
> time. A dev-only validation harness lives in `tools/` (see `tools/README.md`).

## Study features

- Topic sidebar with per-problem status (○ Not Started / ◐ Learning / ✓ Solved) and a progress bar
- Approach switcher + **RCS ↔ Clean SQL** toggle, collapsible sections, copy button
- **Recall mode** — blur logic + code until you click to reveal (attempt first, then check)
- Fuzzy **search** and **filters** (difficulty, status, pattern, review queue)
- **Review queue**, per-problem **notes**, pattern-tag cross-linking
- **Revision grid**, **export/import** progress as JSON, keyboard navigation
- Progress persists in `localStorage` (namespaced `sql:`) — no backend

## Stack

Pure HTML + CSS + vanilla JS, no framework, no bundler — served directly from GitHub Pages.
Content is split into one data module per topic under `data/`, loaded by a small app in `js/`.

Vendored libraries (in `js/vendor/`, `css/`):
- [Prism.js](https://prismjs.com/) 1.29.0 — SQL syntax highlighting (MIT License)
- [Fuse.js](https://fusejs.io/) 7.0.0 — fuzzy search (Apache-2.0 License)

## Local development

```bash
cd sql-visualizer
python3 -m http.server 8080
# open http://localhost:8080
```

## Keyboard shortcuts

`/` focus search · `j`/`k` or ↑/↓ prev/next problem · `r` RCS code · `p` clean code · `b` toggle recall mode · `1`/`2`/`3` set status · `Esc` close dialog
